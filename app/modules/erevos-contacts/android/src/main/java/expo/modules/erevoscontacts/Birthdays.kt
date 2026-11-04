// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

package expo.modules.erevoscontacts

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
import android.provider.ContactsContract.CommonDataKinds.Event
import android.provider.ContactsContract.Data
import android.util.Log
import java.util.Calendar

/**
 * Birthday reminders, once the owner turns them on: on the morning of a contact's birthday, from
 * 9:00, a notice names whose it is, and how old they turn when the year is known. Only the phone's
 * contacts (Android's), never those sealed in Erevos, which are not there with the app closed. An
 * alarm is set for each morning, and set again when the phone starts, the app is updated or the
 * time changes; a morning the phone was off is told once it is on, the same day. On the lock
 * screen the notice says only that there is a birthday.
 */
internal object Birthdays {
  private const val TAG = "ErevosContacts"
  private const val PREFS = "erevos-birthdays"
  private const val ON = "on"
  private const val TOLD = "told"
  private const val CHANNEL = "erevos-birthdays"
  // Notice ids by module: 71xx erevos-call, 72xx erevos-phone, 73xx erevos-device, 74xx erevos-contacts.
  private const val NOTICE = 7401
  private const val HOUR = 9
  const val ACTION = "expo.modules.erevoscontacts.BIRTHDAYS"
  private val FULL = Regex("^(\\d{4})-?(\\d{2})-?(\\d{2})")
  private val NO_YEAR = Regex("^--(\\d{2})-?(\\d{2})")

  private fun prefs(context: Context) = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  fun isOn(context: Context) = prefs(context).getBoolean(ON, false)

  fun setOn(context: Context, on: Boolean) {
    prefs(context).edit().putBoolean(ON, on).apply()
    if (on) {
      tell(context)
    } else {
      arm(context)
      context.getSystemService(NotificationManager::class.java)?.cancel(NOTICE)
      recount(context)
    }
  }

  // The number on the Contacts icon, on the launchers that show one on each icon apart (erevos-widget
  // IconNumbers.kt), counts again, told by its class name as the widget is: the notice came or went.
  private fun recounting(context: Context) =
    Intent("expo.modules.erevoswidget.REFRESH").setClassName(context.packageName, "expo.modules.erevoswidget.ErevosWidget")

  private fun recount(context: Context) {
    runCatching { context.sendBroadcast(recounting(context)) }
  }

  private fun alarm(context: Context): PendingIntent {
    val intent = Intent(context, BirthdayReceiver::class.java).setAction(ACTION)
    return PendingIntent.getBroadcast(context, 1, intent, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
  }

  /** Sets the alarm for the next 9:00, exact when Android allows it (else within about an hour), or takes it away when reminders are off. */
  fun arm(context: Context) {
    val alarms = context.getSystemService(AlarmManager::class.java) ?: return
    if (!isOn(context)) {
      alarms.cancel(alarm(context))
      return
    }
    val next = Calendar.getInstance().apply {
      set(Calendar.HOUR_OF_DAY, HOUR)
      set(Calendar.MINUTE, 0)
      set(Calendar.SECOND, 0)
      set(Calendar.MILLISECOND, 0)
      if (timeInMillis <= System.currentTimeMillis()) add(Calendar.DAY_OF_YEAR, 1)
    }
    try {
      if (Build.VERSION.SDK_INT < 31 || alarms.canScheduleExactAlarms()) {
        alarms.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, next.timeInMillis, alarm(context))
        return
      }
    } catch (_: SecurityException) {
      // Exact alarms are not allowed: a close one, then.
    }
    alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, next.timeInMillis, alarm(context))
  }

  private fun dayOf(now: Calendar) = now.get(Calendar.YEAR) * 10000 + (now.get(Calendar.MONTH) + 1) * 100 + now.get(Calendar.DAY_OF_MONTH)

  /** Tells today's birthdays, once a day from 9:00, and sets the alarm for the next morning. */
  fun tell(context: Context) {
    if (!isOn(context)) {
      arm(context)
      return
    }
    val now = Calendar.getInstance()
    val today = dayOf(now)
    if (now.get(Calendar.HOUR_OF_DAY) >= HOUR && prefs(context).getInt(TOLD, 0) != today) {
      val found = todays(context, now)
      prefs(context).edit().putInt(TOLD, today).apply()
      if (found.isNotEmpty()) notify(context, found)
    }
    arm(context)
  }

  /** Whose birthday is today, by name, with the age they turn when the year is known. 29 February falls on the 28th in a year without it. */
  fun todays(context: Context, now: Calendar): List<Pair<String, Int?>> {
    if (!ContactsStore.canRead(context)) return emptyList()
    val year = now.get(Calendar.YEAR)
    val month = now.get(Calendar.MONTH) + 1
    val day = now.get(Calendar.DAY_OF_MONTH)
    val leap = now.getActualMaximum(Calendar.DAY_OF_YEAR) > 365
    val found = LinkedHashMap<Long, Pair<String, Int?>>()
    val columns = arrayOf(Data.CONTACT_ID, Event.START_DATE, Data.DISPLAY_NAME_PRIMARY)
    context.contentResolver.query(Data.CONTENT_URI, columns, "${Data.MIMETYPE}=? AND ${Event.TYPE}=?", arrayOf(Event.CONTENT_ITEM_TYPE, Event.TYPE_BIRTHDAY.toString()), null)?.use { c ->
      while (c.moveToNext()) {
        val date = c.getString(1)?.trim() ?: continue
        val full = FULL.find(date)
        val short = if (full == null) NO_YEAR.find(date) else null
        val born = full?.groupValues?.get(1)?.toIntOrNull()
        val m = (full?.groupValues?.get(2) ?: short?.groupValues?.get(1))?.toIntOrNull() ?: continue
        val d = (full?.groupValues?.get(3) ?: short?.groupValues?.get(2))?.toIntOrNull() ?: continue
        val shown = if (m == 2 && d == 29 && !leap) 28 else d
        if (m != month || shown != day) continue
        val name = c.getString(2)?.takeIf { it.isNotBlank() } ?: continue
        found.getOrPut(c.getLong(0)) { name to born?.takeIf { it in 1800..year }?.let { year - it } }
      }
    }
    return found.values.toList()
  }

  private fun notify(context: Context, today: List<Pair<String, Int?>>) {
    val notifications = context.getSystemService(NotificationManager::class.java) ?: return
    // In the app's language, as the call module keeps it (erevos-call Notices.kt).
    val greek = context.getSharedPreferences("erevos-lang", Context.MODE_PRIVATE).getString("lang", null) == "el"
    if (Build.VERSION.SDK_INT >= 26) {
      notifications.createNotificationChannel(NotificationChannel(CHANNEL, if (greek) "Γενέθλια" else "Birthdays", NotificationManager.IMPORTANCE_DEFAULT))
    }
    val names = today.joinToString(", ") { (name, age) -> if (age != null) "$name ($age)" else name }
    val title = when {
      today.size > 1 && greek -> "${today.size} γενέθλια σήμερα"
      today.size > 1 -> "${today.size} birthdays today"
      greek -> "Γενέθλια σήμερα: ${today[0].first}"
      else -> "${today[0].first}'s birthday today"
    }
    val text = when {
      today.size > 1 -> names
      today[0].second != null && greek -> "Κλείνει τα ${today[0].second}"
      today[0].second != null -> "Turns ${today[0].second}"
      else -> null
    }
    val open = Intent(Intent.ACTION_VIEW, Uri.parse("erevos://contacts")).setPackage(context.packageName)
    val launch = if (open.resolveActivity(context.packageManager) != null) open else context.packageManager.getLaunchIntentForPackage(context.packageName) ?: return
    val tap = PendingIntent.getActivity(context, NOTICE, launch, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
    fun builder() = if (Build.VERSION.SDK_INT >= 26) Notification.Builder(context, CHANNEL) else @Suppress("DEPRECATION") Notification.Builder(context)
    val public = builder()
      .setSmallIcon(android.R.drawable.ic_menu_my_calendar)
      .setContentTitle(if (greek) "Γενέθλια σήμερα" else "A birthday today")
      .build()
    val notice = builder()
      .setSmallIcon(android.R.drawable.ic_menu_my_calendar)
      .setContentTitle(title)
      .apply { if (text != null) setContentText(text) }
      .setVisibility(Notification.VISIBILITY_PRIVATE)
      .setPublicVersion(public)
      .setContentIntent(tap)
      .setDeleteIntent(PendingIntent.getBroadcast(context, NOTICE, recounting(context), PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT))
      .setAutoCancel(true)
      .build()
    try {
      notifications.notify(NOTICE, notice)
      recount(context)
    } catch (_: SecurityException) {
      // Notifications are not allowed: the birthday shows in Contacts.
      Log.i(TAG, "A birthday notice was not allowed")
    }
  }
}

/** The morning's alarm, and the phone starting, the app updated, the time changed: tells today's birthdays and sets the next alarm. */
class BirthdayReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val done = goAsync()
    val app = context.applicationContext
    Thread {
      try {
        Birthdays.tell(app)
      } catch (e: Exception) {
        Log.w("ErevosContacts", "Birthdays could not be looked at", e)
      } finally {
        done.finish()
      }
    }.start()
  }
}
