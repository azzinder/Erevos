package expo.modules.erevoscall

// Erevos keeps no cookies. React Native's WebSocket (every relay connection) and fetch look for
// them in Android's own store, and the first look loads the phone's WebView into Erevos: from then
// on Android closes Erevos with each update of the WebView, while it receives in the background
// too, and it holds more memory. So their cookie lookups are given a store that keeps nothing
// (NoCookieManager) before the first connection. React Native keeps the lookups out of reach, so
// they are found by name; where a version names them otherwise, nothing changes and cookies are
// looked for as before.
object NoCookies {
  private val modules = listOf(
    "com.facebook.react.modules.websocket.WebSocketModule",
    "com.facebook.react.modules.network.NetworkingModule",
  )

  /** How many of React Native's cookie lookups now keep no cookies: 2 when both took it. */
  fun apply(react: Any?): Int {
    if (react == null) return 0
    val module = runCatching { react.javaClass.getMethod("getNativeModule", Class::class.java) }.getOrNull() ?: return 0
    var done = 0
    for (name in modules) {
      runCatching {
        val found = module.invoke(react, Class.forName(name)) ?: return@runCatching
        val handler = found.javaClass.getDeclaredField("cookieHandler").apply { isAccessible = true }.get(found) ?: return@runCatching
        handler.javaClass.getDeclaredField("cookieManager").apply { isAccessible = true }.set(handler, NoCookieManager())
        done++
      }
    }
    return done
  }
}
