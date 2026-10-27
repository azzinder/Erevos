package expo.modules.erevosdevice

import android.Manifest
import android.content.ClipData
import android.content.ClipDescription
import android.content.ClipboardManager
import android.content.Context
import android.content.pm.PackageManager
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.os.PersistableBundle
import android.os.SystemClock
import android.view.WindowManager
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

// What a chat asks of the phone itself and React Native does not give: the clipboard, for Copy in
// a message's menu, where the phone is, once, to send as a place, keeping Erevos's screen out of
// screenshots and the recent apps preview (lib/screen-privacy.ts), and the reminders of Chat with
// myself (Reminders.kt). What is copied is marked sensitive, so Android's notice of a copy
// (Android 13 and later) does not show the words. Where
// the phone is comes from its own location, on every way it has at once (satellites, network,
// and Android's own mix of them); only when asked, and never followed after. Plain Android, no
// other library.
class ErevosDeviceModule : Module() {
  private val main = Handler(Looper.getMainLooper())

  private val context: Context?
    get() = appContext.reactContext

  override fun definition() = ModuleDefinition {
    Name("ErevosDevice")

    // Where the phone was found, once findPlace started looking: lat, lon, how near, metres (-1
    // when the phone does not say) and how long ago, seconds; or `error` "timeout" when nothing
    // came in time.
    Events("onPlace")

    // Puts the text on the clipboard, on the main thread, as Android's clipboard wants. False when
    // there is no app context to reach it from.
    Function("copyText") { text: String ->
      val app = context?.applicationContext ?: return@Function false
      main.post {
        runCatching {
          val clip = ClipData.newPlainText("Erevos", text)
          clip.description.extras = PersistableBundle().apply {
            if (Build.VERSION.SDK_INT >= 33) putBoolean(ClipDescription.EXTRA_IS_SENSITIVE, true)
            else putBoolean("android.content.extra.IS_SENSITIVE", true)
          }
          app.getSystemService(ClipboardManager::class.java)?.setPrimaryClip(clip)
        }
      }
      true
    }

    // Keeps the app's window out of screenshots, screen recordings and the recent apps preview
    // while `on` (FLAG_SECURE), on the main thread. False when no activity is showing; a new one,
    // as when Erevos comes back after being swiped away, gets it when the app says again.
    Function("setSecure") { on: Boolean ->
      val activity = appContext.currentActivity ?: return@Function false
      activity.runOnUiThread {
        if (on) activity.window.addFlags(WindowManager.LayoutParams.FLAG_SECURE)
        else activity.window.clearFlags(WindowManager.LayoutParams.FLAG_SECURE)
      }
      true
    }

    // A reminder of Chat with myself for `at` (milliseconds), told by Android with Erevos closed
    // (Reminders.kt), in place of one with this id. False when too many wait or there is no app.
    Function("remind") { id: String, at: Double ->
      val app = context?.applicationContext ?: return@Function false
      Reminders.remind(app, id, at.toLong())
    }

    // Forgets a reminder that has not come.
    Function("forgetReminder") { id: String ->
      val app = context?.applicationContext ?: return@Function Unit
      Reminders.forget(app, id)
    }

    // A new Erevos, named `name`, is out (Updates.kt): a notice says so.
    Function("tellUpdate") { name: String ->
      val app = context?.applicationContext ?: return@Function Unit
      Updates.tell(app, name)
    }

    // Starts looking for where the phone is, once: what it finds comes as onPlace. Says "" when it
    // started, "permission" when Erevos may not use the location, "off" when the phone's location
    // is off, "approximate" when Erevos may use only the approximate location and the phone has no
    // way on to find that (on many phones without Google, only the satellites find it).
    Function("findPlace") {
      val app = context?.applicationContext ?: return@Function "off"
      val manager = app.getSystemService(LocationManager::class.java) ?: return@Function "off"
      val fine = app.checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
      val coarse = app.checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED
      if (!fine && !coarse) return@Function "permission"
      val on = { provider: String -> runCatching { manager.isProviderEnabled(provider) }.getOrDefault(false) }
      // Every way the phone has, at once: the satellites alone find nothing indoors, and the
      // network alone is off on many phones without Google.
      val providers = buildList {
        if (fine && on(LocationManager.GPS_PROVIDER)) add(LocationManager.GPS_PROVIDER)
        if (on(LocationManager.NETWORK_PROVIDER)) add(LocationManager.NETWORK_PROVIDER)
        if (Build.VERSION.SDK_INT >= 31 && manager.hasProvider(LocationManager.FUSED_PROVIDER) && on(LocationManager.FUSED_PROVIDER)) {
          add(LocationManager.FUSED_PROVIDER)
        }
      }
      if (providers.isEmpty()) {
        val locationOn = if (Build.VERSION.SDK_INT >= 28) manager.isLocationEnabled else on(LocationManager.GPS_PROVIDER)
        return@Function if (!fine && locationOn) "approximate" else "off"
      }
      val look = Look(manager)
      main.post {
        looking?.end(null, quiet = true)
        looking = look
        look.start(providers)
      }
      ""
    }

    // Stops looking for where the phone is, with nothing said: the owner closed the sheet.
    Function("stopPlace") {
      main.post { looking?.end(null, quiet = true) }
    }
  }

  // The look going on, if any; touched on the main thread only.
  private var looking: Look? = null

  // One look, on every way at once, on the main thread: a place found a moment ago, or the first
  // found near enough, or the nearest found in the few seconds after the first, or, with none in
  // time, the last the phone found in the minutes before, said with its age.
  private inner class Look(private val manager: LocationManager) {
    private var done = false
    private var best: Location? = null
    private val listeners = mutableListOf<LocationListener>()
    private val giveUp = Runnable { end(best ?: lastFound(STALE_NANOS)) }
    private val enough = Runnable { end(best) }

    fun start(providers: List<String>) {
      val recent = lastFound(FRESH_NANOS)
      if (recent != null && near(recent)) {
        end(recent)
        return
      }
      for (provider in providers) {
        val listener = object : LocationListener {
          override fun onLocationChanged(location: Location) = found(location)
          @Deprecated("Called on Android before 10 only.")
          override fun onStatusChanged(provider: String?, status: Int, extras: Bundle?) {}
          override fun onProviderEnabled(provider: String) {}
          override fun onProviderDisabled(provider: String) {}
        }
        try {
          manager.requestLocationUpdates(provider, 0L, 0f, listener, Looper.getMainLooper())
          listeners += listener
        } catch (e: SecurityException) {
          // Taken away since findPlace looked: the other ways may still find it.
        } catch (e: IllegalArgumentException) {
          // Gone since findPlace looked.
        }
      }
      if (listeners.isEmpty()) {
        end(recent ?: lastFound(STALE_NANOS))
        return
      }
      main.postDelayed(giveUp, WAIT_MS)
      if (recent != null) found(recent)
    }

    // A place found: one near enough ends the look; the first rough one waits a little for a nearer.
    private fun found(location: Location) {
      if (done) return
      val first = best == null
      if (first || metres(location) < metres(best!!)) best = location
      if (near(location)) end(location)
      else if (first) main.postDelayed(enough, BETTER_MS)
    }

    // Ends the look: lets go of every way, and says what it found, unless stopped.
    fun end(location: Location?, quiet: Boolean = false) {
      if (done) return
      done = true
      main.removeCallbacks(giveUp)
      main.removeCallbacks(enough)
      listeners.forEach { runCatching { manager.removeUpdates(it) } }
      listeners.clear()
      if (looking === this) looking = null
      if (quiet) return
      val age = if (location == null) 0L else (SystemClock.elapsedRealtimeNanos() - location.elapsedRealtimeNanos) / 1_000_000_000L
      sendEvent(
        "onPlace",
        if (location == null) mapOf("error" to "timeout")
        else mapOf(
          "lat" to location.latitude,
          "lon" to location.longitude,
          "acc" to if (location.hasAccuracy()) location.accuracy.toDouble() else -1.0,
          "age" to age.coerceAtLeast(0L).toDouble(),
        ),
      )
    }

    // The nearest place any way found in the last `within` nanoseconds, or none.
    private fun lastFound(within: Long): Location? {
      val now = SystemClock.elapsedRealtimeNanos()
      return manager.allProviders
        .mapNotNull { runCatching { manager.getLastKnownLocation(it) }.getOrNull() }
        .filter { now - it.elapsedRealtimeNanos in 0 until within }
        .minByOrNull { metres(it) }
    }
  }

  private fun metres(location: Location): Float = if (location.hasAccuracy()) location.accuracy else Float.MAX_VALUE

  private fun near(location: Location): Boolean = location.hasAccuracy() && location.accuracy <= NEAR_METRES

  companion object {
    // How long one look waits for a place; how long, after a rough one, for a nearer; how old a
    // place the phone found may be to be taken at once, and, when nothing came, at all.
    private const val WAIT_MS = 60_000L
    private const val BETTER_MS = 10_000L
    private const val FRESH_NANOS = 120_000_000_000L
    private const val STALE_NANOS = 600_000_000_000L
    // A place this near (metres) ends the look.
    private const val NEAR_METRES = 50f
  }
}
