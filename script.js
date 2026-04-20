// ==========================================
// STATE MANAGEMENT
// ==========================================
let timerState = {
    duration: 25 * 60, // Default 25 minutes in seconds
    timeRemaining: 25 * 60,
    isRunning: false,
    isPaused: false,
    intervalId: null,
    selectedPreset: 25,
    startTime: null,
    endTime: null,
    pausedTime: 0
};

let stats = {
    pomodorosCompleted: 0,
    totalTime: 0, // in minutes
    streak: 0
};

let todos = [];
let todoIdCounter = 0;

// ==========================================
// DOM ELEMENTS
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
    hoursInput: document.getElementById('hoursInput'),
    minutesInput: document.getElementById('minutesInput'),
    secondsInput: document.getElementById('secondsInput'),
    setTimeBtn: document.getElementById('setTimeBtn'),
    increaseHours: document.getElementById('increaseHours'),
    decreaseHours: document.getElementById('decreaseHours'),
    increaseMinutes: document.getElementById('increaseMinutes'),
    decreaseMinutes: document.getElementById('decreaseMinutes'),
    increaseSeconds: document.getElementById('increaseSeconds'),
    decreaseSeconds: document.getElementById('decreaseSeconds'),
    pomodorosCompleted: document.getElementById('pomodorosCompleted'),
    totalTime: document.getElementById('totalTime'),
    streak: document.getElementById('streak'),
    rainToggle: document.getElementById('rainToggle'),
    rainStatus: document.getElementById('rainStatus'),
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
    moonIcon: document.querySelector('.moon-icon')
};

// ==========================================
// AUDIO NOTIFICATION
// ==========================================
// Create audio context and generate a pleasant notification sound
let audioContext = null;
let notificationBuffer = null;

function initAudio() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        createNotificationSound();
    }
}

function createNotificationSound() {
    // Create a pleasant "ding" sound using Web Audio API
    const sampleRate = audioContext.sampleRate;
    const duration = 0.5; // 0.5 seconds
    const length = sampleRate * duration;

    notificationBuffer = audioContext.createBuffer(1, length, sampleRate);
    const channel = notificationBuffer.getChannelData(0);

    // Generate a pleasant bell-like tone (combination of frequencies)
    for (let i = 0; i < length; i++) {
        const t = i / sampleRate;
        // Fundamental frequency and harmonics for a bell sound
        const freq1 = 800; // Main tone
        const freq2 = 1200; // Harmonic
        const freq3 = 1600; // Higher harmonic

        // Exponential decay envelope for natural sound
        const envelope = Math.exp(-3 * t);

        // Combine frequencies with different amplitudes
        channel[i] = envelope * (
            0.5 * Math.sin(2 * Math.PI * freq1 * t) +
            0.3 * Math.sin(2 * Math.PI * freq2 * t) +
            0.2 * Math.sin(2 * Math.PI * freq3 * t)
        );
    }
}

function playNotificationSound() {
    if (!audioContext || !notificationBuffer) {
        initAudio();
    }

    const source = audioContext.createBufferSource();
    source.buffer = notificationBuffer;

    // Add a gentle gain control
    const gainNode = audioContext.createGain();
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

    source.connect(gainNode);
    gainNode.connect(audioContext.destination);
    source.start(0);
}

// ==========================================
// AMBIENT RAIN SOUND
// ==========================================
let rainSource = null;
let rainGainNode = null;
let isRainPlaying = false;

function createRainSound() {
    if (!audioContext) {
        initAudio();
    }

    // Create white noise for rain effect
    const bufferSize = audioContext.sampleRate * 2;
    const noiseBuffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    // Generate white noise
    for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
    }

    // Create source
    rainSource = audioContext.createBufferSource();
    rainSource.buffer = noiseBuffer;
    rainSource.loop = true;

    // Create filter to shape the noise into rain-like sound
    const filter = audioContext.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1000;
    filter.Q.value = 0.5;

    // Create gain node for volume control
    rainGainNode = audioContext.createGain();
    rainGainNode.gain.value = 0;

    // Connect: source -> filter -> gain -> destination
    rainSource.connect(filter);
    filter.connect(rainGainNode);
    rainGainNode.connect(audioContext.destination);

    return rainSource;
}

function toggleRainSound() {
    if (!audioContext) {
        initAudio();
    }

    if (isRainPlaying) {
        // Fade out and stop
        if (rainGainNode) {
            rainGainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.5);
            setTimeout(() => {
                if (rainSource) {
                    rainSource.stop();
                    rainSource = null;
                }
            }, 500);
        }
        isRainPlaying = false;
        elements.rainToggle.classList.remove('active');
        elements.rainStatus.textContent = 'Off';
    } else {
        // Create and start rain sound
        createRainSound();
        rainSource.start(0);

        // Fade in
        rainGainNode.gain.linearRampToValueAtTime(0.15, audioContext.currentTime + 0.5);

        isRainPlaying = true;
        elements.rainToggle.classList.add('active');
        elements.rainStatus.textContent = 'Playing';
    }
}

// ==========================================
// TIMER FUNCTIONS
// ==========================================
function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    // Show HH:MM:SS if hours > 0, otherwise MM:SS
    if (hours > 0) {
        return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
}

function updateDisplay() {
    elements.timeDisplay.textContent = formatTime(timerState.timeRemaining);
    updateProgressRing();

    // Update fullscreen display if visible
    if (elements.fullscreenOverlay && !elements.fullscreenOverlay.classList.contains('hidden')) {
        // Ensure function exists before calling (it's defined later in the file)
        if (typeof updateFullscreenDisplay === 'function') {
            updateFullscreenDisplay();
        }
    }
}

function updateProgressRing() {
    const circumference = 2 * Math.PI * 130; // radius is 130
    const progress = timerState.timeRemaining / timerState.duration;
    const offset = circumference * (1 - progress);
    elements.progressCircle.style.strokeDashoffset = offset;
}

function updateTimerStatus(status) {
    elements.timerStatus.textContent = status;
}

function tick() {
    const now = Date.now();
    const remaining = Math.ceil((timerState.endTime - now) / 1000);

    // Sync timeRemaining
    timerState.timeRemaining = Math.max(0, remaining);

    if (timerState.timeRemaining > 0) {
        updateDisplay();

        // Update status based on time remaining
        if (timerState.timeRemaining > 60) {
            updateTimerStatus('Stay focused...');
        } else if (timerState.timeRemaining > 10) {
            updateTimerStatus('Almost there!');
        } else if (timerState.timeRemaining > 0) {
            updateTimerStatus('Final seconds!');
        }
    } else {
        // Timer completed (ensure valid 0 display)
        updateDisplay();
        completeTimer();
    }
}

function startTimer() {
    if (!timerState.isRunning) {
        // Initialize audio on first user interaction
        initAudio();

        timerState.isRunning = true;
        timerState.isPaused = false;

        // Calculate end time based on current time remaining
        timerState.endTime = Date.now() + (timerState.timeRemaining * 1000);

        // Use setInterval for updates, but calculation is based on Date.now() in tick()
        // Run immediately to update view
        tick();
        timerState.intervalId = setInterval(tick, 1000);

        // Update UI
        elements.playIcon.classList.add('hidden');
        elements.pauseIcon.classList.remove('hidden');
        elements.btnText.textContent = 'Pause';
        document.querySelector('.timer-card').classList.add('timer-running');
        updateTimerStatus('Focus mode active');

        // Disable preset buttons while running
        disablePresets();
    }
}

function pauseTimer() {
    if (timerState.isRunning) {
        timerState.isRunning = false;
        timerState.isPaused = true;
        clearInterval(timerState.intervalId);

        // Update UI
        elements.playIcon.classList.remove('hidden');
        elements.pauseIcon.classList.add('hidden');
        elements.btnText.textContent = 'Resume';
        document.querySelector('.timer-card').classList.remove('timer-running');
        updateTimerStatus('Paused');
    }
}

function resetTimer() {
    // Clear any running interval
    if (timerState.intervalId) {
        clearInterval(timerState.intervalId);
    }
    timerState.endTime = null;

    // Reset state
    timerState.isRunning = false;
    timerState.isPaused = false;
    timerState.timeRemaining = timerState.duration;
    timerState.intervalId = null;

    // Update UI
    elements.playIcon.classList.remove('hidden');
    elements.pauseIcon.classList.add('hidden');
    elements.btnText.textContent = 'Start';
    document.querySelector('.timer-card').classList.remove('timer-running');
    updateTimerStatus('Ready to focus');
    updateDisplay();

    // Enable preset buttons
    enablePresets();
}

function completeTimer() {
    // Stop the timer
    clearInterval(timerState.intervalId);
    timerState.isRunning = false;
    timerState.timeRemaining = 0;
    updateDisplay();

    // Play notification sound
    playNotificationSound();

    // Update UI
    elements.playIcon.classList.remove('hidden');
    elements.pauseIcon.classList.add('hidden');
    elements.btnText.textContent = 'Start';
    document.querySelector('.timer-card').classList.remove('timer-running');
    updateTimerStatus('Session complete! 🎉');

    // Update stats
    updateStats();

    // Save session to database (background)
    saveStudySession({
        duration: timerState.selectedPreset,
        completedAt: new Date().toISOString(),
        type: 'pomodoro'
    });

    // Show browser notification if permitted
    showBrowserNotification();

    // Enable preset buttons
    enablePresets();

    // Auto-reset after 3 seconds
    setTimeout(() => {
        if (!timerState.isRunning) {
            resetTimer();
        }
    }, 3000);
}

function setDuration(minutes) {
    if (!timerState.isRunning) {
        timerState.duration = minutes * 60;
        timerState.timeRemaining = minutes * 60;
        timerState.selectedPreset = minutes;
        updateDisplay();
        updateTimerStatus('Ready to focus');
    }
}

// ==========================================
// PRESET BUTTON FUNCTIONS
// ==========================================
function disablePresets() {
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.style.opacity = '0.5';
        btn.style.pointerEvents = 'none';
    });
}

function enablePresets() {
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.style.opacity = '1';
        btn.style.pointerEvents = 'auto';
    });
}

function setActivePreset(duration) {
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    const activeBtn = document.querySelector(`[data-duration="${duration}"]`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }
}

// ==========================================
// STATS FUNCTIONS
// ==========================================
function updateStats() {
    stats.pomodorosCompleted++;
    stats.totalTime += timerState.selectedPreset;

    // Simple streak logic (increment for demo purposes)
    stats.streak++;

    // Save to localStorage
    saveStats();

    // Update display
    displayStats();
}

function saveStats() {
    const today = new Date().toDateString();
    const savedData = {
        date: today,
        stats: stats
    };
    localStorage.setItem('pomodoroStats', JSON.stringify(savedData));
}

function loadStats() {
    const saved = localStorage.getItem('pomodoroStats');
    if (saved) {
        const data = JSON.parse(saved);
        const today = new Date().toDateString();

        // Reset stats if it's a new day
        if (data.date === today) {
            stats = data.stats;
        } else {
            // New day - reset daily stats but keep streak
            stats.pomodorosCompleted = 0;
            stats.totalTime = 0;
            // Optionally reset streak or keep it
        }
    }
    displayStats();
}

function displayStats() {
    elements.pomodorosCompleted.textContent = stats.pomodorosCompleted;
    elements.totalTime.textContent = `${Math.floor(stats.totalTime / 60)}h ${stats.totalTime % 60}m`;
    elements.streak.textContent = stats.streak;
}

async function saveStudySession(sessionData) {
    // Save study session data to database in the background using Fetch API
    try {
        // Using a placeholder API endpoint - replace with your actual backend URL
        // We use keepalive: true to ensure the request completes even if the page closes
        const response = await fetch('/api/sessions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(sessionData),
            keepalive: true
        });

        if (!response.ok) {
            // If mocking, we expect 404, so just log as if it worked for demo purposes
            console.log('Simulation: Session saved to database (API not reachable)');
            return;
        }

        const result = await response.json();
        console.log('Session saved successfully:', result);
    } catch (error) {
        // Fallback for demo/offline: log that we would save here
        console.log('Background sync: Session data ready for upload', sessionData);
    }
}

// ==========================================
// BROWSER NOTIFICATION
// ==========================================
function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
}

function showBrowserNotification() {
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Pomodoro Complete! 🎉', {
            body: 'Great work! Time for a break.',
            icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="%2310b981"/></svg>',
            badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="%2310b981"/></svg>'
        });
    }
}

// ==========================================
// TO-DO LIST FUNCTIONS
// ==========================================
function addTodo(text) {
    if (!text || text.trim() === '') return;

    const todo = {
        id: todoIdCounter++,
        text: text.trim(),
        completed: false,
        createdAt: new Date().toISOString()
    };

    todos.push(todo);
    saveTodos();
    renderTodos();
    elements.todoInput.value = '';
}

function toggleTodo(id) {
    const todo = todos.find(t => t.id === id);
    if (todo) {
        todo.completed = !todo.completed;
        saveTodos();
        renderTodos();
    }
}

function deleteTodo(id) {
    todos = todos.filter(t => t.id !== id);
    saveTodos();
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
            <button class="todo-delete" data-id="${todo.id}">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
            </button>
        `;

        elements.todoList.appendChild(li);
    });

    // Add event listeners to checkboxes and delete buttons
    document.querySelectorAll('.todo-checkbox').forEach(checkbox => {
        checkbox.addEventListener('click', (e) => {
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

function saveTodos() {
    localStorage.setItem('pomodoroTodos', JSON.stringify(todos));
}

function loadTodos() {
    const saved = localStorage.getItem('pomodoroTodos');
    if (saved) {
        const loadedTodos = JSON.parse(saved);
        todos = loadedTodos;
        // Update counter to avoid ID conflicts
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
// EVENT LISTENERS
// ==========================================
elements.startPauseBtn.addEventListener('click', () => {
    if (timerState.isRunning) {
        pauseTimer();
    } else {
        startTimer();
    }
});

elements.resetBtn.addEventListener('click', () => {
    resetTimer();
});

// Time input controls
elements.increaseHours.addEventListener('click', () => {
    let value = parseInt(elements.hoursInput.value) || 0;
    if (value < 24) elements.hoursInput.value = value + 1;
});

elements.decreaseHours.addEventListener('click', () => {
    let value = parseInt(elements.hoursInput.value) || 0;
    if (value > 0) elements.hoursInput.value = value - 1;
});

elements.increaseMinutes.addEventListener('click', () => {
    let value = parseInt(elements.minutesInput.value) || 0;
    if (value < 59) {
        elements.minutesInput.value = value + 1;
    } else {
        elements.minutesInput.value = 0;
    }
});

elements.decreaseMinutes.addEventListener('click', () => {
    let value = parseInt(elements.minutesInput.value) || 0;
    if (value > 0) {
        elements.minutesInput.value = value - 1;
    } else {
        elements.minutesInput.value = 59;
    }
});

// Input validation
elements.hoursInput.addEventListener('input', (e) => {
    let value = parseInt(e.target.value);
    if (value < 0) e.target.value = 0;
    else if (value > 24) e.target.value = 24;
});

elements.minutesInput.addEventListener('input', (e) => {
    let value = parseInt(e.target.value);
    if (value < 0) e.target.value = 0;
    else if (value > 59) e.target.value = 59;
});

// Set Timer button
elements.setTimeBtn.addEventListener('click', () => {
    setCustomDuration();
});

function setCustomDuration() {
    const hours = parseInt(elements.hoursInput.value) || 0;
    const minutes = parseInt(elements.minutesInput.value) || 0;

    // Calculate total seconds (no seconds input, just hours and minutes)
    const totalSeconds = (hours * 3600) + (minutes * 60);

    // Must have at least 1 second
    if (totalSeconds >= 1) {
        // Set duration in seconds
        timerState.duration = totalSeconds;
        timerState.timeRemaining = totalSeconds;
        timerState.selectedPreset = Math.ceil(totalSeconds / 60); // For stats

        // Update display
        updateDisplay();
        updateTimerStatus('Ready to focus');
    }
}

// Rain toggle
elements.rainToggle.addEventListener('click', () => {
    toggleRainSound();
});

// Todo list
elements.addTodoBtn.addEventListener('click', () => {
    addTodo(elements.todoInput.value);
});

elements.todoInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        addTodo(elements.todoInput.value);
    }
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Space bar to start/pause
    if (e.code === 'Space' && e.target === document.body) {
        e.preventDefault();
        if (timerState.isRunning) {
            pauseTimer();
        } else {
            startTimer();
        }
    }

    // R key to reset
    if (e.code === 'KeyR' && !timerState.isRunning) {
        resetTimer();
    }

    // Number keys for presets
    if (e.code === 'Digit1') {
        setDuration(25);
        setActivePreset(25);
    }
    if (e.code === 'Digit2') {
        setDuration(30);
        setActivePreset(30);
    }
    if (e.code === 'Digit3') {
        setDuration(60);
        setActivePreset(60);
    }
});

// ==========================================
// THEME MANAGEMENT (LIGHT/DARK MODE)
// ==========================================
function initTheme() {
    const savedTheme = localStorage.getItem('pomodoroTheme');
    if (savedTheme === 'light') {
        document.body.classList.add('light-mode');
        elements.sunIcon.classList.remove('hidden');
        elements.moonIcon.classList.add('hidden');
    } else {
        // Default is dark
        elements.sunIcon.classList.add('hidden');
        elements.moonIcon.classList.remove('hidden');
    }

    elements.themeToggleBtn.addEventListener('click', toggleTheme);
}

function toggleTheme() {
    const isLight = document.body.classList.toggle('light-mode');
    
    if (isLight) {
        localStorage.setItem('pomodoroTheme', 'light');
        elements.sunIcon.classList.remove('hidden');
        elements.moonIcon.classList.add('hidden');
    } else {
        localStorage.setItem('pomodoroTheme', 'dark');
        elements.sunIcon.classList.add('hidden');
        elements.moonIcon.classList.remove('hidden');
    }
}

// ==========================================
// INITIALIZATION
// ==========================================
function init() {
    // Initialize Theme FIRST
    initTheme();

    // Load saved stats
    loadStats();

    // Load saved todos
    loadTodos();

    // Set initial display
    updateDisplay();

    // Request notification permission
    requestNotificationPermission();

    // Set initial active preset
    setActivePreset(timerState.selectedPreset);

    // Setup fullscreen timer
    setupFullscreenTimer();

    console.log('🍅 Pomodoro Timer initialized!');
    console.log('Keyboard shortcuts:');
    console.log('  Space - Start/Pause');
    console.log('  R - Reset');
    console.log('  1/2/3 - Select preset (25/30/60 min)');
    console.log('  F - Fullscreen timer');
}

// Start the app when page is fully loaded
window.addEventListener('load', init);

// Handle visibility change to keep timer accurate in background
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // Page is hidden - timer continues in background
        if (timerState.isRunning) {
            timerState.pausedTime = Date.now();
        }
    } else {
        // Page is visible again
        if (timerState.isRunning && timerState.pausedTime) {
            // Calculate time elapsed while hidden
            const elapsed = Math.floor((Date.now() - timerState.pausedTime) / 1000);
            timerState.timeRemaining = Math.max(0, timerState.timeRemaining - elapsed);
            updateDisplay();

            // Check if timer completed while hidden
            if (timerState.timeRemaining === 0) {
                completeTimer();
            }
        }
    }
});

// ==========================================
// FULLSCREEN TIMER FUNCTIONS
// ==========================================
function updateFullscreenDisplay() {
    const hours = Math.floor(timerState.timeRemaining / 3600);
    const mins = Math.floor((timerState.timeRemaining % 3600) / 60);
    const secs = timerState.timeRemaining % 60;

    elements.fsHours.textContent = hours.toString().padStart(2, '0');
    elements.fsMinutes.textContent = mins.toString().padStart(2, '0');
    elements.fsSeconds.textContent = secs.toString().padStart(2, '0');

    // Update status
    if (timerState.isRunning) {
        elements.fullscreenStatus.textContent = 'FOCUSING...';
    } else if (timerState.isPaused) {
        elements.fullscreenStatus.textContent = 'PAUSED';
    } else {
        elements.fullscreenStatus.textContent = 'READY TO FOCUS';
    }
}

function openFullscreen() {
    elements.fullscreenOverlay.classList.remove('hidden');
    updateFullscreenDisplay();

    // Request browser fullscreen
    if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(err => {
            console.log('Fullscreen request failed:', err);
        });
    }
}

function closeFullscreen() {
    elements.fullscreenOverlay.classList.add('hidden');

    // Exit browser fullscreen
    if (document.fullscreenElement) {
        document.exitFullscreen();
    }
}

function setupFullscreenTimer() {
    // Fullscreen button click
    elements.fullscreenBtn.addEventListener('click', openFullscreen);

    // Close button click
    elements.fullscreenClose.addEventListener('click', closeFullscreen);

    // Fullscreen start/pause
    elements.fsStartPause.addEventListener('click', () => {
        if (timerState.isRunning) {
            pauseTimer();
            document.querySelector('.fs-play-icon').classList.remove('hidden');
            document.querySelector('.fs-pause-icon').classList.add('hidden');
        } else {
            startTimer();
            document.querySelector('.fs-play-icon').classList.add('hidden');
            document.querySelector('.fs-pause-icon').classList.remove('hidden');
        }
        updateFullscreenDisplay();
    });

    // Fullscreen reset
    elements.fsReset.addEventListener('click', () => {
        resetTimer();
        updateFullscreenDisplay();
        document.querySelector('.fs-play-icon').classList.remove('hidden');
        document.querySelector('.fs-pause-icon').classList.add('hidden');
    });

    // Update fullscreen display when timer updates
    const originalUpdateDisplay = updateDisplay;
    window.updateDisplay = function () {
        originalUpdateDisplay.call(this);
        if (elements.fullscreenOverlay && !elements.fullscreenOverlay.classList.contains('hidden')) {
            updateFullscreenDisplay();
        }
    };

    // ESC key to exit fullscreen
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && elements.fullscreenOverlay && !elements.fullscreenOverlay.classList.contains('hidden')) {
            closeFullscreen();
        }
        // F key to open fullscreen
        if (e.key === 'f' || e.key === 'F') {
            if (elements.fullscreenOverlay.classList.contains('hidden')) {
                openFullscreen();
            }
        }
    });

    console.log('✅ Fullscreen timer ready!');
}
