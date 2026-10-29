package expo.modules.erevoscall

import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.PowerManager

// Keeps Erevos running while it is in the background with a space open, so it goes on waiting at
// the relay and on the links to phones nearby, and a call can ring. Erevos uses no push service, so without this Android would stop
// it soon after it leaves the screen. It holds the processor awake only as much as that needs and
// shows the one quiet notice Android requires (Notices.receiving).
class ReceiveService : Service() {
  private var awake: PowerManager.WakeLock? = null
  // Started by the app in this process, not only by Android again.
  private var receiving = false

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    if (intent == null) {
      // Android closed Erevos while it received in the background (for memory, say) and starts
      // this again on its own. The keys were in the app's memory only, so it can open nothing:
      // it says so with a quiet notice, rather than the notice going without a word, and stops.
      if (receiving) return START_STICKY
      // A call that rang in the closed one can no longer be answered.
      Notices.stopRinging(this)
      Notices.stopped(this)
      stopSelf(startId)
      return START_NOT_STICKY
    }
    receiving = true
    Notices.clearStopped(this)
    val notice = Notices.receiving(this)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
      // Also linked to phones nearby (Bluetooth, Wi-Fi Aware, the same Wi-Fi), as Android asks a
      // service that keeps such links to say; without what that needs, only the relay's.
      try {
        startForeground(
          Notices.RECEIVING_ID,
          notice,
          ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE or ServiceInfo.FOREGROUND_SERVICE_TYPE_CONNECTED_DEVICE,
        )
      } catch (e: SecurityException) {
        startForeground(Notices.RECEIVING_ID, notice, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE)
      }
    } else {
      startForeground(Notices.RECEIVING_ID, notice)
    }
    instance = this
    holdPower()
    // Started again by Android if it closes Erevos, only to say so (above): the keys are in the
    // app's memory only, so a service started again alone could open nothing.
    return START_STICKY
  }

  // Awake all the while, or, in the battery mode Sleep, only for a look at the relay each minute
  // (SleepWake): the processor sleeps between, and the alarm wakes it.
  private fun holdPower() {
    if (sleepy) {
      awake?.let { if (it.isHeld) it.release() }
      awake = null
      SleepWake.arm(this)
      return
    }
    SleepWake.cancel(this)
    if (awake == null) {
      val power = getSystemService(Context.POWER_SERVICE) as PowerManager
      awake = power.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "erevos:receiving").also {
        it.setReferenceCounted(false)
        it.acquire()
      }
    }
  }

  override fun onDestroy() {
    awake?.let { if (it.isHeld) it.release() }
    awake = null
    SleepWake.cancel(this)
    if (instance === this) instance = null
    super.onDestroy()
  }

  companion object {
    // Whether the phone may sleep between looks (battery mode Sleep), as the app last said.
    @Volatile private var sleepy = false
    @Volatile private var instance: ReceiveService? = null

    // The app calls this from its own thread; the wake lock is the service's, changed on the
    // main thread only, as onStartCommand and onDestroy change it.
    fun setSleepy(context: Context, on: Boolean) {
      sleepy = on
      val app = context.applicationContext
      Handler(Looper.getMainLooper()).post {
        instance?.holdPower()
        if (instance == null) SleepWake.cancel(app)
      }
    }

    // Whether the alarm is still wanted: the service runs, in this process, and may sleep. An
    // alarm left from a process Android closed finds no service, and sets no next one.
    fun looks(): Boolean = sleepy && instance != null

    fun start(context: Context) {
      val intent = Intent(context, ReceiveService::class.java)
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) context.startForegroundService(intent) else context.startService(intent)
    }

    fun stop(context: Context) {
      context.stopService(Intent(context, ReceiveService::class.java))
    }
  }
}
