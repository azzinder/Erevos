package expo.modules.erevoscall

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.PowerManager
import android.os.SystemClock

// The battery mode Sleep (lib/battery-mode.ts): the receiving service holds no wake lock, and this
// alarm wakes the phone about once a minute. Each time it holds the processor awake for a short
// look at the relay, then sets the next alarm; Android may hold it back to every few minutes where
// Erevos is not left out of battery saving.
class SleepWake : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent?) {
    val power = context.getSystemService(Context.POWER_SERVICE) as PowerManager
    power.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "erevos:look").also {
      it.setReferenceCounted(false)
      it.acquire(LOOK_MS)
    }
    arm(context)
  }

  companion object {
    private const val EVERY_MS = 60_000L
    private const val LOOK_MS = 25_000L

    private fun pending(context: Context): PendingIntent =
      PendingIntent.getBroadcast(
        context,
        0,
        Intent(context, SleepWake::class.java),
        PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
      )

    fun arm(context: Context) {
      val alarms = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
      alarms.setAndAllowWhileIdle(AlarmManager.ELAPSED_REALTIME_WAKEUP, SystemClock.elapsedRealtime() + EVERY_MS, pending(context))
    }

    fun cancel(context: Context) {
      (context.getSystemService(Context.ALARM_SERVICE) as AlarmManager).cancel(pending(context))
    }
  }
}
