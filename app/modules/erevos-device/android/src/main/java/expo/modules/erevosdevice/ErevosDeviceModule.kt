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
import android.os.CancellationSignal
import android.os.Handler
import android.os.Looper
import android.os.PersistableBundle
import android.os.SystemClock
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.util.concurrent.atomic.AtomicBoolean

// What a chat asks of the phone itself and React Native does not give: the clipboard, for Copy in
// a message's menu, and where the phone is, once, to send as a place. What is copied is marked
// sensitive, so Android's notice of a copy (Android 13 and later) does not show the words. Where
// the phone is comes from its own location, by satellite when Erevos may and it is on, otherwise
// as the phone's location settings find it; only when asked, and never followed after. Plain
// Android, no other library.
class ErevosDeviceModule : Module() {
  private val main = Handler(Looper.getMainLooper())

  private val context: Context?
    get() = appContext.reactContext

  override fun definition() = ModuleDefinition {
    Name("ErevosDevice")

    // Where the phone was found, once findPlace started looking: lat, lon and how near, metres
    // (-1 when the phone does not say), or `error` "timeout" when nothing came in time.
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

    // Starts looking for where the phone is, once: what it finds comes as onPlace. Says "" when it
    // started, "permission" when Erevos may not use the location, "off" when the phone's location
    // is off.
    Function("findPlace") {
      val app = context?.applicationContext ?: return@Function "off"
      val manager = app.getSystemService(LocationManager::class.java) ?: return@Function "off"
      val fine = app.checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
      val coarse = app.checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED
      if (!fine && !coarse) return@Function "permission"
      val provider = when {
        fine && manager.isProviderEnabled(LocationManager.GPS_PROVIDER) -> LocationManager.GPS_PROVIDER
        manager.isProviderEnabled(LocationManager.NETWORK_PROVIDER) -> LocationManager.NETWORK_PROVIDER
        else -> return@Function "off"
      }
      try {
        look(manager, provider)
        ""
      } catch (e: SecurityException) {
        "permission"
      }
    }
  }

  // One look on `provider`: a place it found a moment ago, or the next it finds, or none in time.
  private fun look(manager: LocationManager, provider: String) {
    val done = AtomicBoolean(false)
    val finish = { location: Location? ->
      if (done.compareAndSet(false, true)) {
        main.post {
          sendEvent(
            "onPlace",
            if (location == null) mapOf("error" to "timeout")
            else mapOf("lat" to location.latitude, "lon" to location.longitude, "acc" to if (location.hasAccuracy()) location.accuracy.toDouble() else -1.0),
          )
        }
      }
    }
    val recent = manager.getLastKnownLocation(provider)
    if (recent != null && SystemClock.elapsedRealtimeNanos() - recent.elapsedRealtimeNanos < FRESH_NANOS) {
      finish(recent)
      return
    }
    if (Build.VERSION.SDK_INT >= 30) {
      val cancel = CancellationSignal()
      manager.getCurrentLocation(provider, cancel, { main.post(it) }) { location -> finish(location) }
      main.postDelayed({
        if (!done.get()) cancel.cancel()
        finish(null)
      }, WAIT_MS)
    } else {
      val listener = object : LocationListener {
        override fun onLocationChanged(location: Location) = finish(location)
        @Deprecated("Called on Android before 10 only.")
        override fun onStatusChanged(provider: String?, status: Int, extras: Bundle?) {}
        override fun onProviderEnabled(provider: String) {}
        override fun onProviderDisabled(provider: String) = finish(null)
      }
      @Suppress("DEPRECATION")
      manager.requestSingleUpdate(provider, listener, Looper.getMainLooper())
      main.postDelayed({
        manager.removeUpdates(listener)
        finish(null)
      }, WAIT_MS)
    }
  }

  companion object {
    // How long one look waits for a place, and how old a place the phone found may be to be taken.
    private const val WAIT_MS = 30_000L
    private const val FRESH_NANOS = 60_000_000_000L
  }
}
