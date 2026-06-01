package com.example.emmefocus

import android.annotation.SuppressLint
import android.os.Bundle
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.viewinterop.AndroidView

class MainActivity : ComponentActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    enableEdgeToEdge()
    setContent {
      WebViewScreen()
    }
  }
}

@SuppressLint("SetJavaScriptEnabled")
@Composable
fun WebViewScreen() {
  AndroidView(
    modifier = Modifier.fillMaxSize(),
    factory = { context ->
      WebView(context).apply {
        // Optimized settings for web-based SPA UI/UX
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.allowFileAccess = true
        settings.allowContentAccess = true
        
        // Native touch and sizing behaviors
        settings.setSupportZoom(false)
        settings.builtInZoomControls = false
        settings.displayZoomControls = false
        
        // Full screen responsiveness configurations
        settings.loadWithOverviewMode = true
        settings.useWideViewPort = true
        settings.databaseEnabled = true
        
        // Force hardware acceleration for canvas particle rendering
        setLayerType(WebView.LAYER_TYPE_HARDWARE, null)

        webViewClient = object : WebViewClient() {
          @Deprecated("Deprecated in Java")
          override fun shouldOverrideUrlLoading(view: WebView?, url: String?): Boolean {
            // Force all page transitions and links to stay inside the app
            return false
          }
        }
        
        loadUrl("file:///android_asset/index.html")
      }
    }
  )
}
