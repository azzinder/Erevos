package expo.modules.erevoscall

import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import android.os.PowerManager

// Keeps Erevos running while it is in the background with a space open, so it goes on waiting at
// the relay and on the links to phones nearby, and a call can ring. Erevos uses no push service, so without this Android would stop
// it soon after it leaves the screen. It holds the processor awake only as much as that needs and
// shows the one quiet notice Android requires (Notices.receiving).
class ReceiveService : Service() {
  private var awake: PowerManager.WakeLock? = null

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
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
    if (awake == null) {
      val power = getSystemService(Context.POWER_SERVICE) as PowerManager
      awake = power.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "erevos:receiving").also {
        it.setReferenceCounted(false)
        it.acquire()
      }
    }
    // Not restarted by Android if it is stopped: the keys are in the app's memory only, so a
    // restarted service alone could open nothing.
    return START_NOT_STICKY
  }

  override fun onDestroy() {
    awake?.let { if (it.isHeld) it.release() }
    awake = null
    super.onDestroy()
  }

  companion object {
    fun start(context: Context) {
      val intent = Intent(context, ReceiveService::class.java)
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) context.startForegroundService(intent) else context.startService(intent)
    }

    fun stop(context: Context) {
      context.stopService(Intent(context, ReceiveService::class.java))
    }
  }
}
