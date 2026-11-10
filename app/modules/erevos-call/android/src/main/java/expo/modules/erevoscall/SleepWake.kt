// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

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
// Erevos is not left out of battery saving. The app is told (ErevosCallModule "onSleepLook"), and
// says when its look found nothing (lookDone): the processor sleeps again at once then, not after
// LOOK_MS. An app from before that, or one that found something, is held for LOOK_MS as before.
//
// The battery mode Light sleep uses the same hold and a slower alarm: the app's waits at the relay
// stay open while the phone sleeps, an answer there wakes it through the network, and the app
// takes the hold as it hears the answer (holdAwake), letting go once it waits again.
class SleepWake : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent?) {
    if (!ReceiveService.looks()) return
    hold(context)
    arm(context)
    runCatching { tell?.invoke() }
  }

  companion object {
    // How often the alarm goes: once a minute in Sleep, less often in Light sleep, where what comes
    // wakes the phone through the network (ErevosCallModule setLookEvery).
    @Volatile var everyMs = 60_000L
    private const val LOOK_MS = 25_000L

    // The one hold for the look, taken again for LOOK_MS by each alarm and let go by lookDone.
    private var look: PowerManager.WakeLock? = null

    // How the app is told a look began, while its call module lives (ErevosCallModule).
    @Volatile var tell: (() -> Unit)? = null

    @Synchronized
    fun hold(context: Context) {
      val lock = look ?: (context.applicationContext.getSystemService(Context.POWER_SERVICE) as PowerManager)
        .newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "erevos:look")
        .also {
          it.setReferenceCounted(false)
          look = it
        }
      lock.acquire(LOOK_MS)
    }

    /** The app's look found nothing: the processor may sleep until the next alarm. */
    @Synchronized
    fun lookDone() {
      look?.let { if (it.isHeld) runCatching { it.release() } }
    }

    private fun pending(context: Context): PendingIntent =
      PendingIntent.getBroadcast(
        context,
        0,
        Intent(context, SleepWake::class.java),
        PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
      )

    fun arm(context: Context) {
      val alarms = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
      alarms.setAndAllowWhileIdle(AlarmManager.ELAPSED_REALTIME_WAKEUP, SystemClock.elapsedRealtime() + everyMs, pending(context))
    }

    fun cancel(context: Context) {
      (context.getSystemService(Context.ALARM_SERVICE) as AlarmManager).cancel(pending(context))
    }
  }
}
