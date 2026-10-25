package expo.modules.erevosdevice

import android.app.AlarmManager
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.util.Log

/**
 * The reminders of Chat with myself (lib/myself.ts), told by Android itself at their time, so they
 * come with Erevos closed and every space locked. Only each one's id and time are kept here, in the
 * app's own preferences: what it reminds of stays encrypted in its space, so the notice says only
 * that a reminder came, and tapped opens Chat with myself, after the password. An alarm goes off at
 * the soonest one's time, set again when the phone starts, the app is updated or the time changes;
 * one whose time passed with the phone off is told once it is on. The alarm is exact where Erevos
 * may set exact ones (erevos-sms asks for that, for SMS sent for later), else Android's close one.
 */
internal object Reminders {
  private const val TAG = "ErevosDevice"
  private const val PREFS = "erevos-reminders"
  private const val CHANNEL = "erevos-reminders"
  private const val NOTICE = 7301
  const val ACTION = "expo.modules.erevosdevice.REMINDERS"

  /** The most that wait at once, for all spaces. */
  private const val MAX_WAITING = 1000
  private val ID = Regex("^[0-9a-f]{16}$")

  private fun prefs(context: Context) = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  private fun all(context: Context): Map<String, Long> =
    prefs(context).all.mapNotNull { (id, at) -> if (ID.matches(id) && at is Long) id to at else null }.toMap()

  /** Keeps a reminder for `at` (milliseconds), in place of one with this id. False when too many wait. */
  fun remind(context: Context, id: String, at: Long): Boolean {
    require(ID.matches(id)) { "Not an id" }
    synchronized(this) {
      val waiting = all(context)
      if (id !in waiting && waiting.size >= MAX_WAITING) return false
      prefs(context).edit().putLong(id, at).apply()
      arm(context)
      return true
    }
  }

  /** Forgets a reminder that has not come. */
  fun forget(context: Context, id: String) {
    if (!ID.matches(id)) return
    synchronized(this) {
      prefs(context).edit().remove(id).apply()
      arm(context)
    }
  }

  /** Sets the alarm for the soonest one, or takes it away when none waits. */
  fun arm(context: Context) {
    val alarms = context.getSystemService(AlarmManager::class.java) ?: return
    val intent = Intent(context, ReminderReceiver::class.java).setAction(ACTION)
    val alarm = PendingIntent.getBroadcast(context, 0, intent, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
    val next = all(context).values.minOrNull()
    if (next == null) {
      alarms.cancel(alarm)
      return
    }
    val at = maxOf(next, System.currentTimeMillis())
    try {
      if (Build.VERSION.SDK_INT < 31 || alarms.canScheduleExactAlarms()) {
        alarms.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, alarm)
        return
      }
    } catch (_: SecurityException) {
      // Exact alarms are not allowed: a close one, then.
    }
    alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, alarm)
  }

  /** Tells the reminders whose time has come, forgets them, and sets the alarm for the next. */
  fun tell(context: Context) {
    val due: Int
    synchronized(this) {
      val now = System.currentTimeMillis()
      val ids = all(context).filterValues { it <= now }.keys
      if (ids.isNotEmpty()) prefs(context).edit().apply { ids.forEach { remove(it) } }.apply()
      due = ids.size
      arm(context)
    }
    if (due > 0) notify(context, due)
  }

  private fun notify(context: Context, count: Int) {
    val notifications = context.getSystemService(NotificationManager::class.java) ?: return
    // In the app's language, as the call module keeps it (erevos-call Notices.kt).
    val greek = context.getSharedPreferences("erevos-lang", Context.MODE_PRIVATE).getString("lang", null) == "el"
    if (Build.VERSION.SDK_INT >= 26) {
      notifications.createNotificationChannel(NotificationChannel(CHANNEL, if (greek) "Υπενθυμίσεις" else "Reminders", NotificationManager.IMPORTANCE_HIGH))
    }
    val title = when {
      count > 1 && greek -> "$count υπενθυμίσεις"
      count > 1 -> "$count reminders"
      greek -> "Υπενθύμιση"
      else -> "Reminder"
    }
    val text = if (greek) "Άνοιξε τη Συνομιλία με τον εαυτό μου" else "Open Chat with myself to read it"
    val open = Intent(Intent.ACTION_VIEW, Uri.parse("erevos://myself")).setPackage(context.packageName)
    val launch = if (open.resolveActivity(context.packageManager) != null) open else context.packageManager.getLaunchIntentForPackage(context.packageName) ?: return
    val tap = PendingIntent.getActivity(context, NOTICE, launch, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
    val builder = if (Build.VERSION.SDK_INT >= 26) Notification.Builder(context, CHANNEL) else @Suppress("DEPRECATION") Notification.Builder(context)
    val notice = builder
      .setSmallIcon(android.R.drawable.ic_popup_reminder)
      .setContentTitle(title)
      .setContentText(text)
      .setCategory(Notification.CATEGORY_REMINDER)
      .setVisibility(Notification.VISIBILITY_PUBLIC)
      .setContentIntent(tap)
      .setAutoCancel(true)
      .build()
    try {
      notifications.notify(NOTICE, notice)
    } catch (_: SecurityException) {
      // Notifications are not allowed: the reminder shows in Chat with myself.
      Log.i(TAG, "A reminder notice was not allowed")
    }
  }
}

/** A reminder's alarm, and the phone starting, the app updated, the time changed: tells what is due and sets the next alarm. */
class ReminderReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val done = goAsync()
    val app = context.applicationContext
    Thread {
      try {
        if (intent.action == Reminders.ACTION) Reminders.tell(app) else Reminders.arm(app)
      } catch (e: Exception) {
        Log.w("ErevosDevice", "Reminders could not be looked at", e)
      } finally {
        done.finish()
      }
    }.start()
  }
}
