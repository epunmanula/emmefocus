// ==========================================
// STATE MANAGEMENT & DATA SYSTEM
// ==========================================
let timerState = {
    duration: 25 * 60, // Default 25 minutes in seconds
    timeRemaining: 25 * 60,
    isRunning: false,
    isPaused: false,
    intervalId: null,
    selectedPreset: 25, // in minutes
    startTime: null,
    endTime: null,
    pausedTime: 0
};

let stats = {
    pomodorosCompleted: 0,
    totalTime: 0, // in minutes
    streak: 0,
    dailyGoal: 4
};

let todos = [];
let todoIdCounter = 0;
let currentTheme = 'aurora';

// ==========================================
// DOM ELEMENTS INDEXING
// ==========================================
const elements = {
    timeDisplay: document.getElementById('timeDisplay'),
    timerStatus: document.getElementById('timerStatus'),
    startPauseBtn: document.getElementById('startPauseBtn'),
    resetBtn: document.getElementById('resetBtn'),
    btnText: document.getElementById('btnText'),
    playIcon: document.querySelector('.play-icon'),
    pauseIcon: document.querySelector('.pause-icon'),
    progressCircle: document.querySelector('.progress-ring-circle'),
    progressOrbit: document.getElementById('progressOrbit'),
    hoursInput: document.getElementById('hoursInput'),
    minutesInput: document.getElementById('minutesInput'),
    setTimeBtn: document.getElementById('setTimeBtn'),
    increaseHours: document.getElementById('increaseHours'),
    decreaseHours: document.getElementById('decreaseHours'),
    increaseMinutes: document.getElementById('increaseMinutes'),
    decreaseMinutes: document.getElementById('decreaseMinutes'),
    pomodorosCompleted: document.getElementById('pomodorosCompleted'),
    totalTime: document.getElementById('totalTime'),
    streak: document.getElementById('streak'),
    goalFraction: document.getElementById('goalFraction'),
    goalBarFill: document.getElementById('goalBarFill'),
    goalPraise: document.getElementById('goalPraise'),
    todoInput: document.getElementById('todoInput'),
    addTodoBtn: document.getElementById('addTodoBtn'),
    todoList: document.getElementById('todoList'),
    todoCount: document.getElementById('todoCount'),
    todoEmpty: document.getElementById('todoEmpty'),
    fullscreenBtn: document.getElementById('fullscreenBtn'),
    fullscreenOverlay: document.getElementById('fullscreenOverlay'),
    fullscreenClose: document.getElementById('fullscreenClose'),
    fsStartPause: document.getElementById('fsStartPause'),
    fsReset: document.getElementById('fsReset'),
    fsHours: document.getElementById('fs-hours'),
    fsMinutes: document.getElementById('fs-minutes'),
    fsSeconds: document.getElementById('fs-seconds'),
    fullscreenStatus: document.getElementById('fullscreenStatus'),
    themeToggleBtn: document.getElementById('themeToggleBtn'),
    sunIcon: document.querySelector('.sun-icon'),
    moonIcon: document.querySelector('.moon-icon'),
    confettiCanvas: document.getElementById('confettiCanvas'),
    
    // Preset buttons
    focusPresetBtn: document.getElementById('focusPresetBtn'),
    shortBreakPresetBtn: document.getElementById('shortBreakPresetBtn'),
    longBreakPresetBtn: document.getElementById('longBreakPresetBtn'),

    // Binaural Ambient Mixer controls
    rainToggle: document.getElementById('rainToggle'),
    rainVolume: document.getElementById('rainVolume'),
    wavesToggle: document.getElementById('wavesToggle'),
    wavesVolume: document.getElementById('wavesVolume'),
    windToggle: document.getElementById('windToggle'),
    windVolume: document.getElementById('windVolume'),
    noiseToggle: document.getElementById('noiseToggle'),
    noiseVolume: document.getElementById('noiseVolume')
};

// ==========================================
// AUDIO SYSTEM - SPA & BINAURAL SYNTHS
// ==========================================
let audioContext = null;
let notificationBuffer = null;

// Ambient Synthesizer nodes
const synths = {
    rain: { active: false, source: null, gain: null, lfo: null },
    waves: { active: false, source: null, gain: null, lfo: null },
    wind: { active: false, source: null, gain: null, lfo: null, filter: null },
    noise: { active: false, source: null, gain: null }
};

function initAudio() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        createNotificationSound();
    }
}

// Synthesize a pleasant bell ding
function createNotificationSound() {
    const sampleRate = audioContext.sampleRate;
    const duration = 1.2;
    const length = sampleRate * duration;

    notificationBuffer = audioContext.createBuffer(1, length, sampleRate);
    const channel = notificationBuffer.getChannelData(0);

    for (let i = 0; i < length; i++) {
        const t = i / sampleRate;
        const envelope = Math.exp(-2.5 * t); // Exp decay
        
        // Bell rich harmonies
        const f1 = 880;  // Fundamental (A5)
        const f2 = 1318.51; // Harmonic (E6)
        const f3 = 1760; // Octave (A6)
        const f4 = 2200; // Minor third harmonic

        channel[i] = envelope * (
            0.45 * Math.sin(2 * Math.PI * f1 * t) +
            0.25 * Math.sin(2 * Math.PI * f2 * t) +
            0.15 * Math.sin(2 * Math.PI * f3 * t) +
            0.15 * Math.sin(2 * Math.PI * f4 * t)
        );
    }
}

function playNotificationSound() {
    if (!audioContext) initAudio();
    if (audioContext.state === 'suspended') audioContext.resume();

    const source = audioContext.createBufferSource();
    source.buffer = notificationBuffer;

    const gainNode = audioContext.createGain();
    gainNode.gain.setValueAtTime(0.4, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 1.2);

    source.connect(gainNode);
    gainNode.connect(audioContext.destination);
    source.start(0);
}

// --- AMBIENT SOUND GENERATION ENGINE ---

// Voss-McCartney Pink Noise Approximation
function createPinkNoiseBuffer() {
    const bufferSize = 4 * audioContext.sampleRate;
    const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    
    for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        
        data[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
        data[i] *= 0.11; // scale
        b6 = white * 0.115926;
    }
    return buffer;
}

function createWhiteNoiseBuffer() {
    const bufferSize = 2 * audioContext.sampleRate;
    const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }
    return buffer;
}

// Synth 1: Rain
function startRainSynth() {
    if (synths.rain.active) return;
    initAudio();
    if (audioContext.state === 'suspended') audioContext.resume();

    // Noise Source
    const noiseNode = audioContext.createBufferSource();
    noiseNode.buffer = createWhiteNoiseBuffer();
    noiseNode.loop = true;

    // Filters for Rain character (watery/organic)
    const bandpass = audioContext.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.value = 850;
    bandpass.Q.value = 0.7;

    const lowpass = audioContext.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 2200;

    // Gain node
    const gainNode = audioContext.createGain();
    const volume = parseFloat(elements.rainVolume.value);
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);

    // Dynamic amplitude modulator (LFO) to simulate gusts
    const lfo = audioContext.createOscillator();
    lfo.frequency.value = 0.15; // slow changes
    const lfoGain = audioContext.createGain();
    lfoGain.gain.value = 0.08;

    lfo.connect(lfoGain);
    lfoGain.connect(gainNode.gain);

    // Connections
    noiseNode.connect(bandpass);
    bandpass.connect(lowpass);
    lowpass.connect(gainNode);
    gainNode.connect(audioContext.destination);

    noiseNode.start(0);
    lfo.start(0);

    // Fade in
    gainNode.gain.linearRampToValueAtTime(volume * 0.25, audioContext.currentTime + 1);

    synths.rain.active = true;
    synths.rain.source = noiseNode;
    synths.rain.gain = gainNode;
    synths.rain.lfo = lfo;

    elements.rainToggle.classList.add('active');
    updateSliderBackground(elements.rainVolume, true);
}

function stopRainSynth() {
    if (!synths.rain.active) return;
    const gainNode = synths.rain.gain;
    gainNode.gain.setValueAtTime(gainNode.gain.value, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.8);
    
    setTimeout(() => {
        if (synths.rain.source) {
            synths.rain.source.stop();
            synths.rain.source.disconnect();
        }
        if (synths.rain.lfo) {
            synths.rain.lfo.stop();
            synths.rain.lfo.disconnect();
        }
        synths.rain.active = false;
        synths.rain.source = null;
        synths.rain.gain = null;
        synths.rain.lfo = null;
    }, 850);

    elements.rainToggle.classList.remove('active');
    updateSliderBackground(elements.rainVolume, false);
}

// Synth 2: Ocean Waves (Soothing ebb and flow)
function startWavesSynth() {
    if (synths.waves.active) return;
    initAudio();
    if (audioContext.state === 'suspended') audioContext.resume();

    const noiseNode = audioContext.createBufferSource();
    noiseNode.buffer = createPinkNoiseBuffer();
    noiseNode.loop = true;

    // Ocean filter
    const lp = audioContext.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 400;

    const hp = audioContext.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 60;

    const gainNode = audioContext.createGain();
    const volume = parseFloat(elements.wavesVolume.value);
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);

    // Ebb and flow LFO (8 seconds cycle)
    const lfo = audioContext.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.08; 
    const lfoGain = audioContext.createGain();
    lfoGain.gain.value = 0.15; // Modulates wave volume

    // Connect LFO
    lfo.connect(lfoGain);
    lfoGain.connect(gainNode.gain);

    noiseNode.connect(hp);
    hp.connect(lp);
    lp.connect(gainNode);
    gainNode.connect(audioContext.destination);

    noiseNode.start(0);
    lfo.start(0);

    // Fade in baseline volume
    gainNode.gain.linearRampToValueAtTime(volume * 0.2, audioContext.currentTime + 1.5);

    synths.waves.active = true;
    synths.waves.source = noiseNode;
    synths.waves.gain = gainNode;
    synths.waves.lfo = lfo;

    elements.wavesToggle.classList.add('active');
    updateSliderBackground(elements.wavesVolume, true);
}

function stopWavesSynth() {
    if (!synths.waves.active) return;
    const gainNode = synths.waves.gain;
    gainNode.gain.setValueAtTime(gainNode.gain.value, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 1);

    setTimeout(() => {
        if (synths.waves.source) {
            synths.waves.source.stop();
            synths.waves.source.disconnect();
        }
        if (synths.waves.lfo) {
            synths.waves.lfo.stop();
            synths.waves.lfo.disconnect();
        }
        synths.waves.active = false;
        synths.waves.source = null;
        synths.waves.gain = null;
        synths.waves.lfo = null;
    }, 1050);

    elements.wavesToggle.classList.remove('active');
    updateSliderBackground(elements.wavesVolume, false);
}

// Synth 3: Forest Wind
function startWindSynth() {
    if (synths.wind.active) return;
    initAudio();
    if (audioContext.state === 'suspended') audioContext.resume();

    const noiseNode = audioContext.createBufferSource();
    noiseNode.buffer = createPinkNoiseBuffer();
    noiseNode.loop = true;

    // Resonant bandpass to create the whistling sound
    const filter = audioContext.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 600;
    filter.Q.value = 2.0;

    const gainNode = audioContext.createGain();
    const volume = parseFloat(elements.windVolume.value);
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);

    // LFO to sweep wind pitch/resonance
    const lfo = audioContext.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.05; // 20s cycle
    const lfoGain = audioContext.createGain();
    lfoGain.gain.value = 250; // sweep frequency by 250Hz

    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency); // Sweeps cutoff!

    noiseNode.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(audioContext.destination);

    noiseNode.start(0);
    lfo.start(0);

    gainNode.gain.linearRampToValueAtTime(volume * 0.15, audioContext.currentTime + 1.5);

    synths.wind.active = true;
    synths.wind.source = noiseNode;
    synths.wind.gain = gainNode;
    synths.wind.lfo = lfo;
    synths.wind.filter = filter;

    elements.windToggle.classList.add('active');
    updateSliderBackground(elements.windVolume, true);
}

function stopWindSynth() {
    if (!synths.wind.active) return;
    const gainNode = synths.wind.gain;
    gainNode.gain.setValueAtTime(gainNode.gain.value, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 1);

    setTimeout(() => {
        if (synths.wind.source) {
            synths.wind.source.stop();
            synths.wind.source.disconnect();
        }
        if (synths.wind.lfo) {
            synths.wind.lfo.stop();
            synths.wind.lfo.disconnect();
        }
        synths.wind.active = false;
        synths.wind.source = null;
        synths.wind.gain = null;
        synths.wind.lfo = null;
        synths.wind.filter = null;
    }, 1050);

    elements.windToggle.classList.remove('active');
    updateSliderBackground(elements.windVolume, false);
}

// Synth 4: Steady Focus Pink Noise
function startNoiseSynth() {
    if (synths.noise.active) return;
    initAudio();
    if (audioContext.state === 'suspended') audioContext.resume();

    const noiseNode = audioContext.createBufferSource();
    noiseNode.buffer = createPinkNoiseBuffer();
    noiseNode.loop = true;

    const gainNode = audioContext.createGain();
    const volume = parseFloat(elements.noiseVolume.value);
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);

    noiseNode.connect(gainNode);
    gainNode.connect(audioContext.destination);

    noiseNode.start(0);
    gainNode.gain.linearRampToValueAtTime(volume * 0.28, audioContext.currentTime + 0.8);

    synths.noise.active = true;
    synths.noise.source = noiseNode;
    synths.noise.gain = gainNode;

    elements.noiseToggle.classList.add('active');
    updateSliderBackground(elements.noiseVolume, true);
}

function stopNoiseSynth() {
    if (!synths.noise.active) return;
    const gainNode = synths.noise.gain;
    gainNode.gain.setValueAtTime(gainNode.gain.value, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.5);

    setTimeout(() => {
        if (synths.noise.source) {
            synths.noise.source.stop();
            synths.noise.source.disconnect();
        }
        synths.noise.active = false;
        synths.noise.source = null;
        synths.noise.gain = null;
    }, 550);

    elements.noiseToggle.classList.remove('active');
    updateSliderBackground(elements.noiseVolume, false);
}

function updateSliderBackground(slider, isActive) {
    const val = (slider.value - slider.min) / (slider.max - slider.min) * 100;
    if (isActive) {
        slider.style.background = `linear-gradient(to right, var(--color-accent-secondary) 0%, var(--color-accent-primary) ${val}%, rgba(255,255,255,0.1) ${val}%, rgba(255,255,255,0.1) 100%)`;
    } else {
        slider.style.background = '';
    }
}

// ==========================================
// PHYSIC CONFETTI ENGINE
// ==========================================
let confettiActive = false;
let confettiParticles = [];
const confettiColors = ['#00f0ff', '#8a2be2', '#ff007a', '#38ef7d', '#ffeb3b', '#ff5722'];

class ConfettiParticle {
    constructor(canvasWidth, canvasHeight) {
        this.w = canvasWidth;
        this.h = canvasHeight;
        this.x = Math.random() * this.w;
        this.y = Math.random() * -100 - 20;
        this.size = Math.random() * 8 + 6;
        this.color = confettiColors[Math.floor(Math.random() * confettiColors.length)];
        this.speedX = Math.random() * 4 - 2;
        this.speedY = Math.random() * 5 + 4;
        this.rotation = Math.random() * 360;
        this.rotationSpeed = Math.random() * 4 - 2;
        this.opacity = 1.0;
        this.fadeSpeed = Math.random() * 0.005 + 0.003;
    }
    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.rotation += this.rotationSpeed;
        this.opacity -= this.fadeSpeed;
        return this.opacity > 0 && this.y < this.h + 20;
    }
    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation * Math.PI / 180);
        ctx.globalAlpha = this.opacity;
        ctx.fillStyle = this.color;
        // Draw small rectangles/squares
        ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
        ctx.restore();
    }
}

function resizeConfettiCanvas() {
    elements.confettiCanvas.width = window.innerWidth;
    elements.confettiCanvas.height = window.innerHeight;
}

function runConfettiLoop() {
    const ctx = elements.confettiCanvas.getContext('2d');
    ctx.clearRect(0, 0, elements.confettiCanvas.width, elements.confettiCanvas.height);
    
    // Add new particles if active
    if (confettiActive && confettiParticles.length < 150) {
        confettiParticles.push(new ConfettiParticle(elements.confettiCanvas.width, elements.confettiCanvas.height));
    }
    
    // Update and draw
    confettiParticles = confettiParticles.filter(p => {
        const alive = p.update();
        if (alive) p.draw(ctx);
        return alive;
    });

    if (confettiParticles.length > 0 || confettiActive) {
        requestAnimationFrame(runConfettiLoop);
    } else {
        ctx.clearRect(0, 0, elements.confettiCanvas.width, elements.confettiCanvas.height);
    }
}

function startConfettiCelebration() {
    confettiActive = true;
    confettiParticles = [];
    resizeConfettiCanvas();
    window.addEventListener('resize', resizeConfettiCanvas);
    
    runConfettiLoop();
    
    // Emmit heavily for 4 seconds
    setTimeout(() => {
        confettiActive = false;
        window.removeEventListener('resize', resizeConfettiCanvas);
    }, 4500);
}

// ==========================================
// TIMER SYSTEM & CALCULATIONS
// ==========================================
function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
        return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
}

function updateDisplay() {
    elements.timeDisplay.textContent = formatTime(timerState.timeRemaining);
    updateProgressRing();

    if (elements.fullscreenOverlay && !elements.fullscreenOverlay.classList.contains('hidden')) {
        updateFullscreenDisplay();
    }
}

function updateProgressRing() {
    const circumference = 2 * Math.PI * 130; // Radius is 130
    const progress = timerState.timeRemaining / timerState.duration;
    
    // Ensure stroke offset stays in positive limits
    const offset = circumference * (1 - progress);
    elements.progressCircle.style.strokeDashoffset = offset;

    // Rotate and reposition orbit particle tip
    // Angle in radians (-Math.PI/2 starts at top, going clockwise)
    const angle = -Math.PI / 2 + (progress * 2 * Math.PI);
    
    // Circle Center = 50%, Radius = 43.333% (130 / 300)
    const x = 50 + 43.333 * Math.cos(angle);
    const y = 50 + 43.333 * Math.sin(angle);
    
    elements.progressOrbit.style.left = `${x}%`;
    elements.progressOrbit.style.top = `${y}%`;
}

function updateTimerStatus(status) {
    elements.timerStatus.textContent = status;
}

function tick() {
    const now = Date.now();
    const remaining = Math.ceil((timerState.endTime - now) / 1000);

    timerState.timeRemaining = Math.max(0, remaining);

    if (timerState.timeRemaining > 0) {
        updateDisplay();
        
        // Dynamic encourage labels
        if (timerState.timeRemaining > 60) {
            updateTimerStatus('STAY FOCUSING...');
        } else if (timerState.timeRemaining > 15) {
            updateTimerStatus('ALMOST FINISHED!');
        } else {
            updateTimerStatus('FINAL SECONDS!');
        }
    } else {
        updateDisplay();
        completeTimer();
    }
}

function startTimer() {
    if (!timerState.isRunning) {
        initAudio();
        
        timerState.isRunning = true;
        timerState.isPaused = false;
        timerState.endTime = Date.now() + (timerState.timeRemaining * 1000);

        tick(); // instant draw
        timerState.intervalId = setInterval(tick, 1000);

        // Update Buttons
        elements.playIcon.classList.add('hidden');
        elements.pauseIcon.classList.remove('hidden');
        elements.btnText.textContent = 'Pause';
        
        document.querySelector('.timer-card').classList.add('timer-running');
        updateTimerStatus('FOCUS MODE ACTIVE');

        // Fullscreen matching
        document.querySelector('.fs-play-icon').classList.add('hidden');
        document.querySelector('.fs-pause-icon').classList.remove('hidden');

        disablePresets();
    }
}

function pauseTimer() {
    if (timerState.isRunning) {
        timerState.isRunning = false;
        timerState.isPaused = true;
        clearInterval(timerState.intervalId);

        elements.playIcon.classList.remove('hidden');
        elements.pauseIcon.classList.add('hidden');
        elements.btnText.textContent = 'Resume';
        
        document.querySelector('.timer-card').classList.remove('timer-running');
        updateTimerStatus('PAUSED');

        // Fullscreen matching
        document.querySelector('.fs-play-icon').classList.remove('hidden');
        document.querySelector('.fs-pause-icon').classList.add('hidden');
    }
}

function resetTimer() {
    if (timerState.intervalId) {
        clearInterval(timerState.intervalId);
    }
    timerState.endTime = null;
    timerState.isRunning = false;
    timerState.isPaused = false;
    timerState.timeRemaining = timerState.duration;
    timerState.intervalId = null;

    elements.playIcon.classList.remove('hidden');
    elements.pauseIcon.classList.add('hidden');
    elements.btnText.textContent = 'Start';
    
    document.querySelector('.timer-card').classList.remove('timer-running');
    updateTimerStatus('READY TO FOCUS');
    updateDisplay();

    // Fullscreen matching
    document.querySelector('.fs-play-icon').classList.remove('hidden');
    document.querySelector('.fs-pause-icon').classList.add('hidden');

    enablePresets();
}

function completeTimer() {
    clearInterval(timerState.intervalId);
    timerState.isRunning = false;
    timerState.timeRemaining = 0;
    updateDisplay();

    // Alarm Sound & Celebration confetti
    playNotificationSound();
    startConfettiCelebration();

    // Button toggle
    elements.playIcon.classList.remove('hidden');
    elements.pauseIcon.classList.add('hidden');
    elements.btnText.textContent = 'Start';
    document.querySelector('.timer-card').classList.remove('timer-running');
    
    updateTimerStatus('EXCELLENT STUDY! 🎉');

    // Advanced Stats & History updates
    updateStats();

    showBrowserNotification();
    enablePresets();

    // Reset loop delay
    setTimeout(() => {
        if (!timerState.isRunning) {
            resetTimer();
        }
    }, 4500);
}

function setDuration(minutes) {
    if (!timerState.isRunning) {
        timerState.duration = minutes * 60;
        timerState.timeRemaining = minutes * 60;
        timerState.selectedPreset = minutes;
        updateDisplay();
        updateTimerStatus('READY TO FOCUS');
    }
}

// Preset toggle states
function disablePresets() {
    document.querySelectorAll('.preset-chip').forEach(btn => {
        btn.style.opacity = '0.5';
        btn.style.pointerEvents = 'none';
    });
}
function enablePresets() {
    document.querySelectorAll('.preset-chip').forEach(btn => {
        btn.style.opacity = '1';
        btn.style.pointerEvents = 'auto';
    });
}
function setActivePresetChip(minutes) {
    document.querySelectorAll('.preset-chip').forEach(btn => {
        btn.classList.remove('active');
        if (parseInt(btn.dataset.duration) === minutes) {
            btn.classList.add('active');
        }
    });
}

// ==========================================
// ADVANCED STATS SYSTEM
// ==========================================
function updateStats() {
    stats.pomodorosCompleted++;
    stats.totalTime += timerState.selectedPreset;
    
    // Add to streak
    stats.streak++;

    saveStatsToStorage();
    renderStatsDisplay();
}

function saveStatsToStorage() {
    const today = new Date().toDateString();
    const data = {
        date: today,
        stats: stats
    };
    localStorage.setItem('emMeFocusStats_v2', JSON.stringify(data));
}

function loadStatsFromStorage() {
    const saved = localStorage.getItem('emMeFocusStats_v2');
    if (saved) {
        const parsed = JSON.parse(saved);
        const today = new Date().toDateString();
        
        if (parsed.date === today) {
            stats = parsed.stats;
        } else {
            // Keep cumulative/streaks but clear daily
            stats.pomodorosCompleted = 0;
            stats.streak = parsed.stats.streak; // Keep daily streak going
            stats.totalTime = parsed.stats.totalTime;
            stats.dailyGoal = 4;
        }
    }
    renderStatsDisplay();
}

function renderStatsDisplay() {
    elements.pomodorosCompleted.textContent = stats.pomodorosCompleted;
    
    const hrs = Math.floor(stats.totalTime / 60);
    const mins = stats.totalTime % 60;
    elements.totalTime.textContent = `${hrs}h ${mins}m`;
    elements.streak.textContent = stats.streak;

    // Goal visual fills
    const count = stats.pomodorosCompleted;
    const goal = stats.dailyGoal;
    
    elements.goalFraction.textContent = `${count} / ${goal} sessions`;
    
    const fillPercent = Math.min(100, (count / goal) * 100);
    elements.goalBarFill.style.width = `${fillPercent}%`;

    // Dynamic Praise labels
    let praise = "You got this! Set aside some time to focus.";
    if (count === 1) praise = "Great start! Keep pushing on.";
    else if (count === 2) praise = "Halfway there! You're in the ultimate zone.";
    else if (count === 3) praise = "One more session to hit your daily goal!";
    else if (count >= 4) praise = "Daily focus target achieved! Stellar work! 🎉";
    
    elements.goalPraise.textContent = praise;
}

// OS Browser Notifications
function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
}

function showBrowserNotification() {
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Session Completed! 🎉', {
            body: 'Amazing job focusing! Time for a refreshing break.',
            icon: 'favicon_new.png'
        });
    }
}

// ==========================================
// FOCUS TO-DO SYSTEM
// ==========================================
function addTodo(text) {
    if (!text || text.trim() === '') return;

    const todo = {
        id: todoIdCounter++,
        text: text.trim(),
        completed: false
    };

    todos.push(todo);
    saveTodosToStorage();
    renderTodos();
    elements.todoInput.value = '';
}

function toggleTodo(id) {
    const todo = todos.find(t => t.id === id);
    if (todo) {
        todo.completed = !todo.completed;
        saveTodosToStorage();
        renderTodos();
    }
}

function deleteTodo(id) {
    todos = todos.filter(t => t.id !== id);
    saveTodosToStorage();
    renderTodos();
}

function renderTodos() {
    elements.todoList.innerHTML = '';

    if (todos.length === 0) {
        elements.todoEmpty.classList.remove('hidden');
        elements.todoCount.textContent = '0 tasks';
        return;
    }

    elements.todoEmpty.classList.add('hidden');
    elements.todoCount.textContent = `${todos.length} task${todos.length !== 1 ? 's' : ''}`;

    todos.forEach(todo => {
        const li = document.createElement('li');
        li.className = `todo-item${todo.completed ? ' completed' : ''}`;
        
        li.innerHTML = `
            <div class="todo-checkbox" data-id="${todo.id}">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </div>
            <span class="todo-text">${escapeHtml(todo.text)}</span>
            <button class="todo-delete" data-id="${todo.id}" aria-label="Delete focus task">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
            </button>
        `;
        elements.todoList.appendChild(li);
    });

    // Wire clicks
    document.querySelectorAll('.todo-checkbox').forEach(box => {
        box.addEventListener('click', (e) => {
            const id = parseInt(e.currentTarget.dataset.id);
            toggleTodo(id);
        });
    });

    document.querySelectorAll('.todo-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = parseInt(e.currentTarget.dataset.id);
            deleteTodo(id);
        });
    });
}

function saveTodosToStorage() {
    localStorage.setItem('emMeFocusTodos_v2', JSON.stringify(todos));
}

function loadTodosFromStorage() {
    const saved = localStorage.getItem('emMeFocusTodos_v2');
    if (saved) {
        todos = JSON.parse(saved);
        if (todos.length > 0) {
            todoIdCounter = Math.max(...todos.map(t => t.id)) + 1;
        }
    }
    renderTodos();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ==========================================
// ADVANCED FLOATING PALETTE SELECTION
// ==========================================
function initThemeSystem() {
    // Theme Choice Loader
    const savedTheme = localStorage.getItem('emMeFocusTheme_Choice') || 'aurora';
    applyThemeChoice(savedTheme);

    // Light/Dark mode loader
    const lightMode = localStorage.getItem('emMeFocusLight_Mode') === 'enabled';
    if (lightMode) {
        document.body.classList.add('light-mode');
        elements.sunIcon.classList.remove('hidden');
        elements.moonIcon.classList.add('hidden');
    }

    // Attach Theme pill clicks
    document.querySelectorAll('.theme-opt-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const chosen = e.currentTarget.dataset.theme;
            applyThemeChoice(chosen);
        });
    });

    // Dark/Light click toggle
    elements.themeToggleBtn.addEventListener('click', () => {
        const activeLight = document.body.classList.toggle('light-mode');
        if (activeLight) {
            localStorage.setItem('emMeFocusLight_Mode', 'enabled');
            elements.sunIcon.classList.remove('hidden');
            elements.moonIcon.classList.add('hidden');
        } else {
            localStorage.setItem('emMeFocusLight_Mode', 'disabled');
            elements.sunIcon.classList.add('hidden');
            elements.moonIcon.classList.remove('hidden');
        }
    });
}

function applyThemeChoice(themeName) {
    currentTheme = themeName;
    document.documentElement.setAttribute('data-theme-choice', themeName);
    localStorage.setItem('emMeFocusTheme_Choice', themeName);

    // Highlight pill
    document.querySelectorAll('.theme-opt-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.theme === themeName) {
            btn.classList.add('active');
        }
    });

    // Update active slider backgrounds to sync with theme change
    updateSliderBackground(elements.rainVolume, synths.rain.active);
    updateSliderBackground(elements.wavesVolume, synths.waves.active);
    updateSliderBackground(elements.windVolume, synths.wind.active);
    updateSliderBackground(elements.noiseVolume, synths.noise.active);
}

// ==========================================
// ACCORDION CUSTOM TIME INPUT ACTIONS
// ==========================================
function setCustomDuration() {
    const hrs = parseInt(elements.hoursInput.value) || 0;
    const mins = parseInt(elements.minutesInput.value) || 0;
    const totalSeconds = (hrs * 3600) + (mins * 60);

    if (totalSeconds >= 60) {
        timerState.duration = totalSeconds;
        timerState.timeRemaining = totalSeconds;
        timerState.selectedPreset = Math.ceil(totalSeconds / 60);

        // De-active chips
        document.querySelectorAll('.preset-chip').forEach(btn => btn.classList.remove('active'));

        updateDisplay();
        updateTimerStatus('READY TO FOCUS');
        
        // Close details accordion
        document.querySelector('.time-input-details').removeAttribute('open');
    }
}

// ==========================================
// FULLSCREEN VIEW OVERLAY MANAGER
// ==========================================
function updateFullscreenDisplay() {
    const hours = Math.floor(timerState.timeRemaining / 3600);
    const mins = Math.floor((timerState.timeRemaining % 3600) / 60);
    const secs = timerState.timeRemaining % 60;

    elements.fsHours.textContent = hours.toString().padStart(2, '0');
    elements.fsMinutes.textContent = mins.toString().padStart(2, '0');
    elements.fsSeconds.textContent = secs.toString().padStart(2, '0');

    if (timerState.isRunning) {
        elements.fullscreenStatus.textContent = 'FOCUSING ON TASKS';
    } else if (timerState.isPaused) {
        elements.fullscreenStatus.textContent = 'FOCUS PAUSED';
    } else {
        elements.fullscreenStatus.textContent = 'READY TO FOCUS';
    }
}

function openFullscreen() {
    elements.fullscreenOverlay.classList.remove('hidden');
    updateFullscreenDisplay();

    try {
        const docEl = document.documentElement;
        let promise;
        if (docEl.requestFullscreen) {
            promise = docEl.requestFullscreen();
        } else if (docEl.webkitRequestFullscreen) { /* Safari / iOS / WebKit WebViews */
            promise = docEl.webkitRequestFullscreen();
        } else if (docEl.msRequestFullscreen) { /* IE11 / Legacy Edge */
            promise = docEl.msRequestFullscreen();
        }
        
        // Safely check if it returned a Promise before chaining .catch
        if (promise && typeof promise.catch === 'function') {
            promise.catch(err => {
                console.log('Fullscreen request catch:', err);
            });
        }
    } catch (e) {
        console.log('Fullscreen request ignored:', e);
    }
}

function closeFullscreen() {
    elements.fullscreenOverlay.classList.add('hidden');
    
    try {
        let promise;
        if (document.exitFullscreen) {
            promise = document.exitFullscreen();
        } else if (document.webkitExitFullscreen) { /* Safari / iOS */
            promise = document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) { /* IE11 */
            promise = document.msExitFullscreen();
        }
        
        if (promise && typeof promise.catch === 'function') {
            promise.catch(err => {
                console.log('Fullscreen exit catch:', err);
            });
        }
    } catch (e) {
        console.log('Fullscreen exit ignored:', e);
    }
}

function setupFullscreenListeners() {
    elements.fullscreenBtn.addEventListener('click', openFullscreen);
    elements.fullscreenClose.addEventListener('click', closeFullscreen);

    elements.fsStartPause.addEventListener('click', () => {
        if (timerState.isRunning) {
            pauseTimer();
        } else {
            startTimer();
        }
        updateFullscreenDisplay();
    });

    elements.fsReset.addEventListener('click', () => {
        resetTimer();
        updateFullscreenDisplay();
    });
}

// ==========================================
// KEYBOARD SHORTCUTS & INTERACTION
// ==========================================
function setupInteraction() {
    // Start / Pause main click
    elements.startPauseBtn.addEventListener('click', () => {
        if (timerState.isRunning) {
            pauseTimer();
        } else {
            startTimer();
        }
    });

    elements.resetBtn.addEventListener('click', resetTimer);

    // Custom Increments
    elements.increaseHours.addEventListener('click', () => {
        let v = parseInt(elements.hoursInput.value) || 0;
        if (v < 24) elements.hoursInput.value = v + 1;
    });
    elements.decreaseHours.addEventListener('click', () => {
        let v = parseInt(elements.hoursInput.value) || 0;
        if (v > 0) elements.hoursInput.value = v - 1;
    });
    elements.increaseMinutes.addEventListener('click', () => {
        let v = parseInt(elements.minutesInput.value) || 0;
        if (v < 59) elements.minutesInput.value = v + 1;
        else elements.minutesInput.value = 0;
    });
    elements.decreaseMinutes.addEventListener('click', () => {
        let v = parseInt(elements.minutesInput.value) || 0;
        if (v > 0) elements.minutesInput.value = v - 1;
        else elements.minutesInput.value = 59;
    });

    // Direct custom timer
    elements.setTimeBtn.addEventListener('click', setCustomDuration);

    // Preset Chip select
    document.querySelectorAll('.preset-chip').forEach(chip => {
        chip.addEventListener('click', (e) => {
            const minutes = parseInt(e.currentTarget.dataset.duration);
            setDuration(minutes);
            setActivePresetChip(minutes);
        });
    });

    // To-Do add items
    elements.addTodoBtn.addEventListener('click', () => addTodo(elements.todoInput.value));
    elements.todoInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addTodo(elements.todoInput.value);
    });

    // Ambient Mixer clicks
    elements.rainToggle.addEventListener('click', () => {
        if (synths.rain.active) stopRainSynth(); else startRainSynth();
    });
    elements.wavesToggle.addEventListener('click', () => {
        if (synths.waves.active) stopWavesSynth(); else startWavesSynth();
    });
    elements.windToggle.addEventListener('click', () => {
        if (synths.wind.active) stopWindSynth(); else startWindSynth();
    });
    elements.noiseToggle.addEventListener('click', () => {
        if (synths.noise.active) stopNoiseSynth(); else startNoiseSynth();
    });

    // Mixer sliders
    elements.rainVolume.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        e.target.nextElementSibling.textContent = `${Math.round(val * 100)}%`;
        if (synths.rain.active && synths.rain.gain) {
            synths.rain.gain.gain.setValueAtTime(val * 0.25, audioContext.currentTime);
        }
        updateSliderBackground(e.target, synths.rain.active);
    });

    elements.wavesVolume.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        e.target.nextElementSibling.textContent = `${Math.round(val * 100)}%`;
        if (synths.waves.active && synths.waves.gain) {
            synths.waves.gain.gain.setValueAtTime(val * 0.2, audioContext.currentTime);
        }
        updateSliderBackground(e.target, synths.waves.active);
    });

    elements.windVolume.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        e.target.nextElementSibling.textContent = `${Math.round(val * 100)}%`;
        if (synths.wind.active && synths.wind.gain) {
            synths.wind.gain.gain.setValueAtTime(val * 0.15, audioContext.currentTime);
        }
        updateSliderBackground(e.target, synths.wind.active);
    });

    elements.noiseVolume.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        e.target.nextElementSibling.textContent = `${Math.round(val * 100)}%`;
        if (synths.noise.active && synths.noise.gain) {
            synths.noise.gain.gain.setValueAtTime(val * 0.28, audioContext.currentTime);
        }
        updateSliderBackground(e.target, synths.noise.active);
    });

    // Global Key shortcuts
    document.addEventListener('keydown', (e) => {
        if (document.activeElement === elements.todoInput || 
            document.activeElement === elements.hoursInput || 
            document.activeElement === elements.minutesInput) {
            return; // skip typing states
        }

        if (e.code === 'Space') {
            e.preventDefault();
            if (timerState.isRunning) pauseTimer(); else startTimer();
        }

        if (e.code === 'KeyR' && !timerState.isRunning) {
            resetTimer();
        }

        if (e.code === 'KeyF') {
            if (elements.fullscreenOverlay.classList.contains('hidden')) {
                openFullscreen();
            } else {
                closeFullscreen();
            }
        }
    });

    // Handle visibility background drift
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            if (timerState.isRunning) {
                timerState.pausedTime = Date.now();
            }
        } else {
            if (timerState.isRunning && timerState.pausedTime) {
                const elapsed = Math.floor((Date.now() - timerState.pausedTime) / 1000);
                timerState.timeRemaining = Math.max(0, timerState.timeRemaining - elapsed);
                updateDisplay();

                if (timerState.timeRemaining === 0) {
                    completeTimer();
                }
            }
        }
    });
}

// ==========================================
// SYSTEM INITIATION
// ==========================================
function init() {
    initThemeSystem();
    loadStatsFromStorage();
    loadTodosFromStorage();
    
    // Set baseline state
    setDuration(25);
    setActivePresetChip(25);
    updateDisplay();
    
    setupInteraction();
    setupFullscreenListeners();
    requestNotificationPermission();

    console.log('🍅 Focus engine v2.0 initialized. SPA Audio synthesis active.');
}

window.addEventListener('load', init);
