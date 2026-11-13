// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

package expo.modules.erevosphone

import android.app.KeyguardManager
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Person
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.graphics.drawable.Icon
import android.media.AudioAttributes
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.telecom.Call

/**
 * The notices of the phone's calls: one that rings, with Answer and Decline, shown over the lock
 * screen and turned into the call screen while the screen is off (a full-screen intent); and one
 * while a call is on, with End, that opens the call screen. They name the caller as the call
 * screen does, as every phone app shows who calls. Telecom rings and vibrates itself, so the
 * channels make no sound. Missed calls are Telecom's own notice.
 */
internal object CallNotices {
  private const val INCOMING_ID = 7201
  private const val ONGOING_ID = 7202
  private const val INCOMING_CHANNEL = "erevos-phone-incoming"
  private const val ONGOING_CHANNEL = "erevos-phone-ongoing"
  // Call.EXTRA_IS_SUPPRESSED_BY_DO_NOT_DISTURB (Android 14) and Call.EXTRA_SILENT_RINGING_REQUESTED.
  private const val SUPPRESSED_BY_DND = "android.telecom.extra.IS_SUPPRESSED_BY_DO_NOT_DISTURB"
  private const val SILENT_RINGING = "android.telecom.extra.SILENT_RINGING_REQUESTED"
  const val DECLINE = "expo.modules.erevosphone.DECLINE"
  const val END = "expo.modules.erevosphone.END"

  // What each notice shows now, so one is posted again only when that changes.
  private val shown = HashMap<Int, String>()
  // The language the channels were named in at this start.
  private var named: String? = null

  fun update(context: Context) {
    val manager = context.getSystemService(NotificationManager::class.java) ?: return
    val bound = Calls.service != null
    val ringing = if (bound) Calls.ringing() else null
    val front = if (bound) Calls.front() else null
    if (ringing != null) post(context, manager, INCOMING_ID, ringing, true) else cancel(manager, INCOMING_ID)
    if (front != null) post(context, manager, ONGOING_ID, front, false) else cancel(manager, ONGOING_ID)
  }

  /**
   * Whether a call that rings needs its screen started at once, besides its notice. Android turns
   * the notice into the call screen (its full-screen intent) only when it may: Android 14 and later
   * let that be turned off for an app (Settings → Apps → Special app access → Full-screen
   * notifications), and with Erevos's notices off, or its channel of incoming calls off or quiet,
   * no notice shows at all. Then the phone rang with its screen black, and the call could not be
   * answered. So with the phone locked or its screen off, or with the notice unable to show, the
   * call screen is started from CallService, which Telecom binds and so may start it from the
   * background. A call that a screening app silenced, or that Do Not Disturb holds back, rings with
   * no screen, as Android asks. Not on the main thread: Do Not Disturb may look in the contacts.
   */
  fun needsScreen(context: Context, call: Call, number: String): Boolean {
    val extras = listOfNotNull(call.details.extras, call.details.intentExtras)
    if (extras.any { it.getBoolean(SUPPRESSED_BY_DND, false) || it.getBoolean(SILENT_RINGING, false) }) return false
    val manager = context.getSystemService(NotificationManager::class.java)
    val filter = manager?.currentInterruptionFilter ?: NotificationManager.INTERRUPTION_FILTER_UNKNOWN
    val quiet = filter != NotificationManager.INTERRUPTION_FILTER_ALL && filter != NotificationManager.INTERRUPTION_FILTER_UNKNOWN
    if (quiet && !letThrough(manager, number)) return false
    val locked = context.getSystemService(KeyguardManager::class.java)?.isKeyguardLocked == true
    val dark = context.getSystemService(PowerManager::class.java)?.isInteractive == false
    return locked || dark || !canShow(manager)
  }

  // Whether Do Not Disturb, on now, lets a call from `number` through. Android 13 and later answer
  // it for an app that reads the contacts, as Erevos does as the phone app. Before, or for a hidden
  // number, the call is taken as held back: its notice decides, as with Android's own phone app.
  private fun letThrough(manager: NotificationManager?, number: String): Boolean {
    if (manager == null || Build.VERSION.SDK_INT < 33 || number.isEmpty()) return false
    return runCatching { manager.matchesCallFilter(Uri.fromParts("tel", number, null)) }.getOrDefault(false)
  }

  // Whether the notice of a call that rings can show at the top of the screen.
  private fun canShow(manager: NotificationManager?): Boolean {
    if (manager == null || !manager.areNotificationsEnabled()) return false
    if (Build.VERSION.SDK_INT < 26) return true
    val channel = manager.getNotificationChannel(INCOMING_CHANNEL) ?: return true
    return channel.importance >= NotificationManager.IMPORTANCE_HIGH
  }

  private fun cancel(manager: NotificationManager, id: Int) {
    if (shown.remove(id) != null) manager.cancel(id)
  }

  private fun post(context: Context, manager: NotificationManager, id: Int, call: Call, ringing: Boolean) {
    channels(context, manager)
    val caller = Callers.of(context, call)
    val name = caller.name ?: caller.number.takeIf { it.isNotEmpty() }?.let { Callers.shown(context, it) }
      ?: Callers.hidden(context, call) ?: Words.say(context, "Unknown number", "Άγνωστος αριθμός")
    val state = Calls.state(call)
    val key = listOf(Calls.id(call), name, caller.photo != null, state, call.details.connectTimeMillis, Words.lang(context)).joinToString("|")
    if (shown[id] == key) return
    val notice = try {
      notice(context, call, name, caller, ringing, true)
    } catch (_: Exception) {
      notice(context, call, name, caller, ringing, false)
    }
    try {
      manager.notify(id, notice)
    } catch (_: IllegalArgumentException) {
      // Android refused the call style for this notice: the plain one, then.
      runCatching { manager.notify(id, notice(context, call, name, caller, ringing, false)) }
    } catch (_: SecurityException) {
      // Notices are not allowed: the call screen still shows for a call made, and Telecom rings.
    }
    shown[id] = key
  }

  @Suppress("DEPRECATION")
  private fun notice(context: Context, call: Call, name: String, caller: Caller, ringing: Boolean, styled: Boolean): Notification {
    val callId = Calls.id(call)
    val open = PendingIntent.getActivity(context, 1, CallActivity.intent(context), PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
    val builder = if (Build.VERSION.SDK_INT >= 26) Notification.Builder(context, if (ringing) INCOMING_CHANNEL else ONGOING_CHANNEL) else Notification.Builder(context)
    builder
      .setSmallIcon(android.R.drawable.stat_sys_phone_call)
      .setContentTitle(name)
      .setCategory(Notification.CATEGORY_CALL)
      .setVisibility(Notification.VISIBILITY_PUBLIC)
      .setOngoing(true)
      .setOnlyAlertOnce(true)
      .setContentIntent(open)
    if (caller.photo != null) builder.setLargeIcon(caller.photo)
    // Who calls, by number too, so that Do Not Disturb lets the notice of a call it lets ring show,
    // as with Android's own phone app.
    if (Build.VERSION.SDK_INT >= 28) builder.addPerson(person(name, caller))
    if (ringing) {
      val answer = PendingIntent.getActivity(
        context,
        2,
        CallActivity.intent(context).setAction(CallActivity.ANSWER).putExtra(CallActivity.CALL, callId),
        PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
      )
      val decline = PendingIntent.getBroadcast(
        context,
        3,
        Intent(context, CallActionReceiver::class.java).setAction(DECLINE).putExtra(CallActivity.CALL, callId),
        PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
      )
      builder
        .setContentText(Words.say(context, "Incoming call", "Εισερχόμενη κλήση"))
        .setPriority(Notification.PRIORITY_MAX)
        .setFullScreenIntent(open, true)
      if (styled && Build.VERSION.SDK_INT >= 31) {
        builder.setStyle(Notification.CallStyle.forIncomingCall(person(name, caller), decline, answer))
      } else {
        builder.addAction(Notification.Action.Builder(null as Icon?, Words.say(context, "Decline", "Απόρριψη"), decline).build())
        builder.addAction(Notification.Action.Builder(null as Icon?, Words.say(context, "Answer", "Απάντηση"), answer).build())
      }
    } else {
      val end = PendingIntent.getBroadcast(
        context,
        4,
        Intent(context, CallActionReceiver::class.java).setAction(END).putExtra(CallActivity.CALL, callId),
        PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
      )
      val connected = call.details.connectTimeMillis
      val state = Calls.state(call)
      builder.setPriority(Notification.PRIORITY_DEFAULT)
      when {
        state == Call.STATE_HOLDING -> builder.setContentText(Words.say(context, "On hold", "Σε αναμονή"))
        state == Call.STATE_ACTIVE && connected > 0 -> builder.setWhen(connected).setShowWhen(true).setUsesChronometer(true)
        else -> builder.setContentText(Words.say(context, "Calling…", "Κλήση…"))
      }
      if (styled && Build.VERSION.SDK_INT >= 31) {
        builder.setStyle(Notification.CallStyle.forOngoingCall(person(name, caller), end))
      } else {
        builder.addAction(Notification.Action.Builder(null as Icon?, Words.say(context, "End", "Τέλος"), end).build())
      }
    }
    return builder.build()
  }

  private fun person(name: String, caller: Caller): Person =
    Person.Builder().setName(name).setImportant(true).apply {
      caller.photo?.let { setIcon(Icon.createWithBitmap(it)) }
      if (caller.number.isNotEmpty()) setUri(Uri.fromParts("tel", caller.number, null).toString())
    }.build()

  private fun channels(context: Context, manager: NotificationManager) {
    if (Build.VERSION.SDK_INT < 26) return
    val lang = Words.lang(context)
    val incoming = Words.say(context, "Incoming calls", "Εισερχόμενες κλήσεις")
    val ongoing = Words.say(context, "Ongoing calls", "Κλήσεις σε εξέλιξη")
    if (named != lang) {
      named = lang
      // A channel made again under its id keeps its settings and takes the new name.
      manager.getNotificationChannel(INCOMING_CHANNEL)?.let { it.name = incoming; manager.createNotificationChannel(it) }
      manager.getNotificationChannel(ONGOING_CHANNEL)?.let { it.name = ongoing; manager.createNotificationChannel(it) }
    }
    if (manager.getNotificationChannel(INCOMING_CHANNEL) == null) {
      manager.createNotificationChannel(
        NotificationChannel(INCOMING_CHANNEL, incoming, NotificationManager.IMPORTANCE_HIGH).apply {
          setSound(null, null as AudioAttributes?)
          enableVibration(false)
          lockscreenVisibility = Notification.VISIBILITY_PUBLIC
        },
      )
    }
    if (manager.getNotificationChannel(ONGOING_CHANNEL) == null) {
      manager.createNotificationChannel(
        NotificationChannel(ONGOING_CHANNEL, ongoing, NotificationManager.IMPORTANCE_DEFAULT).apply {
          setSound(null, null as AudioAttributes?)
          enableVibration(false)
          setShowBadge(false)
          lockscreenVisibility = Notification.VISIBILITY_PUBLIC
        },
      )
    }
  }
}

/** Decline and End, from the notices. */
class CallActionReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val call = Calls.find(intent.getIntExtra(CallActivity.CALL, -1)) ?: return
    when (intent.action) {
      CallNotices.DECLINE -> call.reject(false, null)
      CallNotices.END -> call.disconnect()
    }
  }
}
