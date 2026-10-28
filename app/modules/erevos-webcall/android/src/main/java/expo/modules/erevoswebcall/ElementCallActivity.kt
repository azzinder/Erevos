package expo.modules.erevoswebcall

import android.Manifest
import android.annotation.SuppressLint
import android.app.Activity
import android.app.PictureInPictureParams
import android.content.pm.PackageManager
import android.content.res.Configuration
import android.graphics.Color
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.util.Rational
import android.view.ViewGroup
import android.view.WindowInsets
import android.view.WindowManager
import android.webkit.CookieManager
import android.webkit.JavascriptInterface
import android.webkit.PermissionRequest
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.window.OnBackInvokedDispatcher
import android.widget.FrameLayout
import java.io.ByteArrayInputStream
import java.io.IOException
import java.io.InputStream
import org.json.JSONObject

/**
 * The screen of a Matrix call: Element Call, carried in the app's assets (element-call/, copied from
 * its npm package at build time), in a WebView of its own. Its page is served from the assets under
 * an address that never goes on the network (https://appassets.androidplatform.net, which Android
 * keeps for this), so the page is a secure one, as the camera and the microphone want, and nothing
 * of it is fetched from anywhere. Erevos talks with it through the Matrix Widget API (lib/matrix-widget.ts):
 * the page posts to itself, as it has no parent, and a script put first in its page hands what it
 * posts to Erevos; Erevos's answers are posted into the page.
 *
 * What the page may reach besides: the call's media server and its token service, which the
 * homeserver names, and the homeserver's public list of what it supports. Known trackers are
 * refused, though Element Call sends nothing to them unless told to, and Erevos does not tell it.
 * The camera and the microphone are given only to this page, and only when Erevos has them.
 *
 * Back, or leaving for another app, puts the call in a small window (picture in picture); closing
 * that window hangs up. The window shows over the lock screen and keeps the screen on, as a call does.
 */
class ElementCallActivity : Activity() {
  private var web: WebView? = null
  private var started = false
  private var small = false
  private var leaving = false
  private var devices = "[]"
  private var chosen = ""

  @SuppressLint("SetJavaScriptEnabled")
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    val url = intent.getStringExtra(EXTRA_URL)
    if (url == null || !url.startsWith(PAGE)) {
      finish()
      return
    }
    devices = intent.getStringExtra(EXTRA_DEVICES) ?: "[]"
    chosen = intent.getStringExtra(EXTRA_CHOSEN) ?: ""
    CallWindow.opened(this)
    overLock()
    window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
    window.decorView.setBackgroundColor(Color.BLACK)

    val view = WebView(this)
    web = view
    view.setBackgroundColor(Color.BLACK)
    view.settings.apply {
      javaScriptEnabled = true
      domStorageEnabled = true
      mediaPlaybackRequiresUserGesture = false
      allowFileAccess = false
      allowContentAccess = false
      setGeolocationEnabled(false)
      setSupportMultipleWindows(false)
      javaScriptCanOpenWindowsAutomatically = false
      if (Build.VERSION.SDK_INT >= 26) safeBrowsingEnabled = false
      cacheMode = WebSettings.LOAD_NO_CACHE
    }
    CookieManager.getInstance().setAcceptThirdPartyCookies(view, false)
    view.addJavascriptInterface(Bridge(), BRIDGE)
    view.webViewClient = object : WebViewClient() {
      override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse? = served(request.url)

      // Element Call stays on its page: nothing it links to opens here.
      override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean = request.url.host != HOST

      override fun onPageFinished(view: WebView, url: String) {
        controls()
      }
    }
    view.webChromeClient = object : WebChromeClient() {
      override fun onPermissionRequest(request: PermissionRequest) {
        runOnUiThread { grant(request) }
      }
    }

    val frame = FrameLayout(this)
    frame.setBackgroundColor(Color.BLACK)
    frame.addView(view, FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT))
    // Clear of the status bar, the navigation bar and the camera's cut-out.
    frame.setOnApplyWindowInsetsListener { v, insets ->
      if (Build.VERSION.SDK_INT >= 30) {
        val bars = insets.getInsets(WindowInsets.Type.systemBars() or WindowInsets.Type.displayCutout())
        v.setPadding(bars.left, bars.top, bars.right, bars.bottom)
      } else {
        @Suppress("DEPRECATION")
        v.setPadding(insets.systemWindowInsetLeft, insets.systemWindowInsetTop, insets.systemWindowInsetRight, insets.systemWindowInsetBottom)
      }
      insets
    }
    setContentView(frame)

    if (Build.VERSION.SDK_INT >= 33) {
      onBackInvokedDispatcher.registerOnBackInvokedCallback(OnBackInvokedDispatcher.PRIORITY_DEFAULT) { back() }
    }
    view.loadUrl(url)
  }

  @Deprecated("Android 13 and later use the back callback")
  override fun onBackPressed() {
    back()
  }

  private fun back() {
    if (!goSmall()) moveTaskToBack(true)
  }

  override fun onUserLeaveHint() {
    super.onUserLeaveHint()
    goSmall()
  }

  // Picture in picture, where the phone has it.
  private fun goSmall(): Boolean {
    if (Build.VERSION.SDK_INT < 26 || !packageManager.hasSystemFeature(PackageManager.FEATURE_PICTURE_IN_PICTURE)) return false
    return try {
      enterPictureInPictureMode(PictureInPictureParams.Builder().setAspectRatio(Rational(9, 16)).build())
    } catch (e: Exception) {
      false
    }
  }

  override fun onPictureInPictureModeChanged(isInPictureInPictureMode: Boolean, newConfig: Configuration) {
    super.onPictureInPictureModeChanged(isInPictureInPictureMode, newConfig)
    small = isInPictureInPictureMode
    run(if (isInPictureInPictureMode) "window.controls.enablePip()" else "window.controls.disablePip()")
    // The small window was closed, not opened again: that hangs up.
    if (!isInPictureInPictureMode && !started) finishAndRemoveTask()
  }

  override fun onStart() {
    super.onStart()
    started = true
  }

  override fun onStop() {
    super.onStop()
    started = false
  }

  override fun onDestroy() {
    web?.let {
      it.removeJavascriptInterface(BRIDGE)
      it.destroy()
    }
    web = null
    CallWindow.closed(this, !leaving)
    super.onDestroy()
  }

  /** Erevos closes the window: the call is over. */
  fun leave() {
    runOnUiThread {
      leaving = true
      finishAndRemoveTask()
    }
  }

  /** Posts a message of the Widget API into the page (JSON, as Erevos wrote it). */
  fun post(message: String) {
    runOnUiThread { web?.evaluateJavascript("window.postMessage($message, '*')", null) }
  }

  /** Tells the page the ways the sound can go, and which one it goes now. */
  fun setDevices(list: String, now: String) {
    runOnUiThread {
      devices = list
      chosen = now
      tellDevices()
    }
  }

  private fun tellDevices() {
    run("window.controls.setAvailableAudioDevices($devices);window.controls.setAudioDevice(${JSONObject.quote(chosen)})")
  }

  // Element Call's controls for its host: where the sound goes, and Back on its own bar.
  private fun controls() {
    run(
      """
      var c = window.controls;
      c.onAudioDeviceSelect = function (id) { $BRIDGE.audioDevice(String(id)); };
      c.onOutputDeviceSelect = c.onAudioDeviceSelect;
      c.onBackButtonPressed = function () { $BRIDGE.back(); };
      c.onAudioPlaybackStarted = function () { $BRIDGE.playing(); };
      """.trimIndent(),
    )
    tellDevices()
  }

  private fun run(script: String) {
    web?.evaluateJavascript("try { $script } catch (e) {}", null)
  }

  private fun grant(request: PermissionRequest) {
    if (request.origin.host != HOST) {
      request.deny()
      return
    }
    val given = request.resources.filter {
      when (it) {
        PermissionRequest.RESOURCE_AUDIO_CAPTURE -> has(Manifest.permission.RECORD_AUDIO)
        PermissionRequest.RESOURCE_VIDEO_CAPTURE -> has(Manifest.permission.CAMERA)
        else -> false
      }
    }
    if (given.isEmpty()) request.deny() else request.grant(given.toTypedArray())
  }

  private fun has(permission: String): Boolean = checkSelfPermission(permission) == PackageManager.PERMISSION_GRANTED

  private fun overLock() {
    if (Build.VERSION.SDK_INT >= 27) {
      setShowWhenLocked(true)
    } else {
      @Suppress("DEPRECATION")
      window.addFlags(WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED)
    }
  }

  // The page's files from the assets; known trackers refused; the rest goes to the network. A
  // homeserver is never asked from here: Element Call asks it only through Erevos, and Erevos
  // asks it through Tor when the space says so. On its own it tries a few requests without the
  // account's token (/versions, MSC4195's delegated leave), which fail anyway.
  private fun served(url: Uri): WebResourceResponse? {
    val host = url.host ?: return null
    if (host != HOST) {
      val refused = BLOCKED.any { host == it || host.endsWith(".$it") } || (url.path ?: "").startsWith("/_matrix/")
      return if (refused) answer(403, "text/plain", ByteArrayInputStream(ByteArray(0))) else null
    }
    val path = (url.path ?: "/").removePrefix("/")
    if (!path.startsWith("element-call/") || path.contains("..")) return answer(404, "text/plain", ByteArrayInputStream(ByteArray(0)))
    val name = if (path == "element-call/") "element-call/index.html" else path
    // Its settings: none, so it keeps to what Erevos gives it.
    if (name == "element-call/config.json") return answer(200, "application/json", ByteArrayInputStream("{}".toByteArray()))
    return try {
      if (name == "element-call/index.html") {
        val page = assets.open(name).bufferedReader().use { it.readText() }
        answer(200, "text/html", ByteArrayInputStream(page.replaceFirst("<head>", "<head><script>$LISTENER</script>").toByteArray()))
      } else {
        answer(200, typeOf(name), assets.open(name))
      }
    } catch (e: IOException) {
      answer(404, "text/plain", ByteArrayInputStream(ByteArray(0)))
    }
  }

  private fun answer(status: Int, type: String, body: InputStream): WebResourceResponse =
    WebResourceResponse(type, if (type.startsWith("text/") || type.endsWith("json") || type.endsWith("javascript")) "utf-8" else null, status, if (status == 200) "OK" else "No", mapOf("Cache-Control" to "no-store"), body)

  private fun typeOf(name: String): String = TYPES[name.substringAfterLast('.', "").lowercase()] ?: "application/octet-stream"

  // What the page hands Erevos. Called on WebView's own thread.
  private inner class Bridge {
    @JavascriptInterface
    fun postMessage(message: String) {
      CallWindow.tell("message", message)
    }

    @JavascriptInterface
    fun audioDevice(id: String) {
      chosen = id
      CallWindow.tell("audio", id)
      runOnUiThread { tellDevices() }
    }

    @JavascriptInterface
    fun back() {
      runOnUiThread { this@ElementCallActivity.back() }
    }

    @JavascriptInterface
    fun playing() {
      runOnUiThread { tellDevices() }
    }
  }

  companion object {
    const val HOST = "appassets.androidplatform.net"
    const val PAGE = "https://$HOST/element-call/index.html"
    const val EXTRA_URL = "url"
    const val EXTRA_DEVICES = "devices"
    const val EXTRA_CHOSEN = "chosen"
    private const val BRIDGE = "erevosCall"

    // Put first in the page: what it posts to itself for its host (the Widget API's requests from
    // it, and its answers to Erevos's) goes to Erevos.
    private const val LISTENER =
      "window.addEventListener('message',function(e){var d=e.data;if(!d||typeof d!=='object')return;" +
        "if((d.api==='fromWidget'&&!d.response)||(d.api==='toWidget'&&d.response))$BRIDGE.postMessage(JSON.stringify(d));});"

    private val BLOCKED = listOf("posthog.com", "sentry.io", "google.com", "googleapis.com", "gstatic.com", "recaptcha.net", "jsdelivr.net")

    private val TYPES = mapOf(
      "html" to "text/html",
      "js" to "text/javascript",
      "mjs" to "text/javascript",
      "css" to "text/css",
      "json" to "application/json",
      "wasm" to "application/wasm",
      "woff2" to "font/woff2",
      "woff" to "font/woff",
      "svg" to "image/svg+xml",
      "png" to "image/png",
      "ogg" to "audio/ogg",
      "mp3" to "audio/mpeg",
      "tflite" to "application/octet-stream",
    )
  }
}
