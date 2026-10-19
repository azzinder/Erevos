package expo.modules.erevossms

import android.Manifest
import android.app.ActivityManager
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.role.RoleManager
import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.provider.BlockedNumberContract
import android.provider.ContactsContract
import android.provider.Telephony
import android.telephony.SmsManager
import android.telephony.SmsMessage
import android.telephony.SubscriptionManager
import android.telephony.TelephonyManager
import android.util.Base64
import android.util.Log
import org.json.JSONArray
import org.json.JSONObject

/**
 * The phone's SMS, as the default SMS app keeps them: in Android's SMS provider, which the
 * default app must write itself. Reading needs READ_SMS, writing needs the default SMS role.
 * Not compiled or run yet.
 */
internal object SmsStore {
  private const val TAG = "ErevosSms"

  const val INVITE_PORT: Short = 16180
  const val SENT_ACTION = "expo.modules.erevossms.SENT"
  const val DELIVERED_ACTION = "expo.modules.erevossms.DELIVERED"
  private const val CHANNEL = "sms"
  private const val PREFS = "erevos-sms"
  private const val INVITES = "invites"
  private const val MAX_INVITES = 50

  /** Set while the JS side runs: tells it what changed, as an event name and its body. */
  @Volatile var listener: ((String, Map<String, Any?>) -> Unit)? = null

  /** Whether Erevos holds the SMS role. Android's own answer (getDefaultSmsPackage) is null
   *  whenever one of the SMS app's app ops is missing, so the role is asked first. */
  fun isDefault(context: Context): Boolean {
    if (Build.VERSION.SDK_INT >= 29) {
      val roles = context.getSystemService(RoleManager::class.java)
      if (roles != null && roles.isRoleAvailable(RoleManager.ROLE_SMS)) return roles.isRoleHeld(RoleManager.ROLE_SMS)
    }
    return Telephony.Sms.getDefaultSmsPackage(context) == context.packageName
  }

  /** The SMS manager of one SIM (its subscription id), or of the phone's default one for -1. */
  fun manager(context: Context, sim: Int = -1): SmsManager =
    if (Build.VERSION.SDK_INT >= 31) {
      val base = context.getSystemService(SmsManager::class.java) ?: throw IllegalStateException("This phone cannot send SMS")
      if (sim >= 0) base.createForSubscriptionId(sim) else base
    } else if (sim >= 0) {
      @Suppress("DEPRECATION") SmsManager.getSmsManagerForSubscriptionId(sim)
    } else {
      @Suppress("DEPRECATION") SmsManager.getDefault()
    }

  /** How many SIMs the phone can hold, without asking for any permission. */
  fun slots(context: Context): Int {
    val phone = context.getSystemService(TelephonyManager::class.java) ?: return 0
    return if (Build.VERSION.SDK_INT >= 30) phone.activeModemCount else @Suppress("DEPRECATION") phone.phoneCount
  }

  /** The SIMs in the phone now: their subscription id, slot and name. Empty without READ_PHONE_STATE. */
  fun sims(context: Context): List<Map<String, Any?>> {
    if (context.checkSelfPermission(Manifest.permission.READ_PHONE_STATE) != PackageManager.PERMISSION_GRANTED) return emptyList()
    val subscriptions = context.getSystemService(SubscriptionManager::class.java) ?: return emptyList()
    return try {
      (subscriptions.activeSubscriptionInfoList ?: emptyList()).sortedBy { it.simSlotIndex }.map {
        mapOf("id" to it.subscriptionId.toDouble(), "slot" to it.simSlotIndex.toDouble(), "name" to (it.displayName?.toString() ?: ""))
      }
    } catch (_: SecurityException) {
      emptyList()
    }
  }

  /** Names the phone's contacts give these numbers. Empty without READ_CONTACTS. Nothing is kept. */
  fun contactNames(context: Context, numbers: List<String>): Map<String, String> = contacts(context, numbers).mapValues { it.value.first }

  /** The name and picture (an address the app may show, or "") the phone's contacts give these
   *  numbers. Empty without READ_CONTACTS. Nothing is kept. */
  fun contactCards(context: Context, numbers: List<String>): Map<String, Map<String, Any?>> =
    contacts(context, numbers).mapValues { (_, card) -> mapOf("name" to card.first, "photo" to (card.second ?: "")) }

  /** The contacts' numbers are read once, not looked up one by one: a hundred numbers took long. */
  private fun contacts(context: Context, numbers: List<String>): Map<String, Pair<String, String?>> {
    if (context.checkSelfPermission(Manifest.permission.READ_CONTACTS) != PackageManager.PERMISSION_GRANTED) return emptyMap()
    // By the last ten digits, and, for numbers written with another prefix, by the last seven.
    val byTen = HashMap<String, Pair<String, String?>>()
    val bySeven = HashMap<String, MutableList<Pair<String, Pair<String, String?>>>>()
    try {
      val projection = arrayOf(
        ContactsContract.CommonDataKinds.Phone.NUMBER,
        ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME,
        ContactsContract.CommonDataKinds.Phone.PHOTO_THUMBNAIL_URI,
      )
      context.contentResolver.query(ContactsContract.CommonDataKinds.Phone.CONTENT_URI, projection, null, null, null)?.use { c ->
        while (c.moveToNext()) {
          val digits = c.getString(0)?.filter { it.isDigit() }?.ifEmpty { null } ?: continue
          val name = c.getString(1)?.takeIf { it.isNotBlank() } ?: continue
          val card = name to c.getString(2)?.takeIf { it.isNotBlank() }
          byTen.putIfAbsent(digits.takeLast(10), card)
          if (digits.length >= 7) bySeven.getOrPut(digits.takeLast(7)) { ArrayList() }.add(digits to card)
        }
      }
    } catch (_: Exception) {
      return emptyMap()
    }
    val cards = HashMap<String, Pair<String, String?>>()
    for (number in numbers.distinct().take(500)) {
      val digits = number.filter { it.isDigit() }
      if (digits.isEmpty()) continue
      // The same last ten digits; else one number ends the other, as Android's own lookup matches.
      val card = byTen[digits.takeLast(10)]
        ?: if (digits.length >= 7) bySeven[digits.takeLast(7)]?.firstOrNull { (other, _) -> digits.endsWith(other) || other.endsWith(digits) }?.second else null
      if (card != null) cards[number] = card
    }
    return cards
  }

  /** The latest message of each conversation, newest first, with how many are not read, and
   *  whether any in it is ours (`replied`). */
  fun threads(context: Context, limit: Int): List<Map<String, Any?>> {
    val seen = LinkedHashMap<Long, MutableMap<String, Any?>>()
    val projection = arrayOf(Telephony.Sms.THREAD_ID, Telephony.Sms.ADDRESS, Telephony.Sms.BODY, Telephony.Sms.DATE, Telephony.Sms.TYPE, Telephony.Sms.READ)
    context.contentResolver.query(Telephony.Sms.CONTENT_URI, projection, null, null, "${Telephony.Sms.DATE} DESC")?.use { c ->
      var rows = 0
      while (c.moveToNext() && rows++ < 5000) {
        val thread = c.getLong(0)
        val mine = c.getInt(4) != Telephony.Sms.MESSAGE_TYPE_INBOX
        val unread = !mine && c.getInt(5) == 0
        val row = seen[thread]
        if (row == null) {
          if (seen.size >= limit) continue
          seen[thread] = mutableMapOf(
            "thread" to thread.toDouble(),
            "address" to (c.getString(1) ?: ""),
            "text" to (c.getString(2) ?: ""),
            "at" to c.getLong(3).toDouble(),
            "mine" to mine,
            "unread" to (if (unread) 1 else 0),
            "replied" to mine,
          )
        } else {
          if (unread) row["unread"] = (row["unread"] as Int) + 1
          if (mine) row["replied"] = true
        }
      }
    }
    // MMS: a conversation whose newest message is one shows it, and its unread ones count. One that
    // cannot be read is left out, never the SMS with it.
    for (latest in MmsStore.latest(context, 2000)) {
      try {
        mmsInto(context, seen, latest, limit)
      } catch (e: Exception) {
        Log.w(TAG, "An MMS left out of the list", e)
      }
    }
    return seen.values.sortedByDescending { it["at"] as Double }
  }

  /** Puts a conversation's newest MMS in the list, when it is newer than its SMS. */
  private fun mmsInto(context: Context, seen: LinkedHashMap<Long, MutableMap<String, Any?>>, latest: LongArray, limit: Int) {
    val (thread, id, at, mine, unread) = latest.toList()
    val row = seen[thread]
    // Whether any message in it is ours: one of its SMS, or of its MMS.
    val replied = (row?.get("replied") as Boolean? ?: false) || latest.getOrElse(5) { mine } == 1L
    if (row == null || (row["at"] as Double) < at.toDouble()) {
      if (row == null && seen.size >= limit) return
      val (text, pictures) = MmsStore.parts(context, id)
      // A group's conversation is named by all its numbers, comma-separated.
      val address = MmsStore.recipients(context, thread).joinToString(",").ifEmpty {
        (row?.get("address") as String?) ?: MmsStore.addressOf(context, id, mine == 1L)
      }
      if (address.isEmpty()) return
      seen[thread] = mutableMapOf(
        "thread" to thread.toDouble(),
        "address" to address,
        "text" to text.ifEmpty { if (pictures.isNotEmpty()) "Picture" else "MMS" },
        "at" to at.toDouble(),
        "mine" to (mine == 1L),
        "unread" to ((row?.get("unread") as Int?) ?: 0) + unread.toInt(),
        "replied" to replied,
      )
    } else {
      row["unread"] = (row["unread"] as Int) + unread.toInt()
      row["replied"] = replied
    }
  }

  /** A conversation's messages with one number, oldest first, the latest `limit` of them. */
  fun messages(context: Context, address: String, limit: Int): List<Map<String, Any?>> {
    val thread = threadId(context, address)
    val (selection, args) = if (thread != null) "${Telephony.Sms.THREAD_ID}=?" to arrayOf(thread.toString())
      else "${Telephony.Sms.ADDRESS}=?" to arrayOf(address)
    val out = ArrayList<Map<String, Any?>>()
    val projection = arrayOf(Telephony.Sms._ID, Telephony.Sms.BODY, Telephony.Sms.DATE, Telephony.Sms.TYPE, Telephony.Sms.READ, Telephony.Sms.SUBSCRIPTION_ID, Telephony.Sms.STATUS)
    context.contentResolver.query(Telephony.Sms.CONTENT_URI, projection, selection, args, "${Telephony.Sms.DATE} DESC")?.use { c ->
      while (c.moveToNext() && out.size < limit) {
        val type = c.getInt(3)
        out.add(
          mapOf(
            "id" to c.getLong(0).toDouble(),
            "kind" to "sms",
            "text" to (c.getString(1) ?: ""),
            "at" to c.getLong(2).toDouble(),
            "mine" to (type != Telephony.Sms.MESSAGE_TYPE_INBOX),
            "state" to when (type) {
              Telephony.Sms.MESSAGE_TYPE_FAILED -> "failed"
              Telephony.Sms.MESSAGE_TYPE_OUTBOX, Telephony.Sms.MESSAGE_TYPE_QUEUED -> "sending"
              // Whether it reached their phone, as far as the network's delivery report says.
              Telephony.Sms.MESSAGE_TYPE_SENT -> when (if (c.isNull(6)) Telephony.Sms.STATUS_NONE else c.getInt(6)) {
                Telephony.Sms.STATUS_COMPLETE -> "delivered"
                Telephony.Sms.STATUS_FAILED -> "undelivered"
                else -> "sent"
              }
              else -> "done"
            },
            "read" to (c.getInt(4) != 0),
            "sim" to c.getInt(5).toDouble(),
            "pictures" to emptyList<Any>(),
          ),
        )
      }
    }
    if (thread != null) out.addAll(MmsStore.messages(context, thread, limit))
    return out.sortedByDescending { it["at"] as Double }.take(limit).reversed()
  }

  /** The conversation with one number, or with a group's numbers given comma-separated. */
  fun threadId(context: Context, address: String): Long? =
    try {
      val numbers = numbers(address)
      if (numbers.size > 1) Telephony.Threads.getOrCreateThreadId(context, numbers.toSet())
      else Telephony.Threads.getOrCreateThreadId(context, address)
    } catch (_: Exception) {
      null
    }

  /** The numbers of an address: one, or a group's, comma-separated. */
  fun numbers(address: String): List<String> = address.split(',', ';').map { it.trim() }.filter { it.isNotEmpty() }

  /** Whether two numbers are the same phone: the same last ten digits, or the same digits when shorter. */
  fun sameNumber(a: String, b: String): Boolean {
    val da = a.filter { it.isDigit() }
    val db = b.filter { it.isDigit() }
    if (da.isEmpty() || db.isEmpty()) return false
    return if (da.length >= 10 && db.length >= 10) da.takeLast(10) == db.takeLast(10) else da == db
  }

  fun markRead(context: Context, address: String) {
    if (!isDefault(context)) return
    val thread = threadId(context, address) ?: return
    val values = ContentValues().apply {
      put(Telephony.Sms.READ, 1)
      put(Telephony.Sms.SEEN, 1)
    }
    context.contentResolver.update(Telephony.Sms.CONTENT_URI, values, "${Telephony.Sms.THREAD_ID}=? AND ${Telephony.Sms.READ}=0", arrayOf(thread.toString()))
    MmsStore.markRead(context, thread)
  }

  /**
   * Sends a text. As the default app, the message is written to the provider first and its row
   * says later whether it went, and whether it reached their phone when the network sends a
   * delivery report; otherwise Android writes it. Returns the row's id, or -1.
   */
  fun send(context: Context, address: String, text: String, sim: Int = -1): Long {
    var id = -1L
    if (isDefault(context)) {
      val values = ContentValues().apply {
        put(Telephony.Sms.ADDRESS, address)
        put(Telephony.Sms.BODY, text)
        put(Telephony.Sms.DATE, System.currentTimeMillis())
        put(Telephony.Sms.READ, 1)
        put(Telephony.Sms.SEEN, 1)
        put(Telephony.Sms.TYPE, Telephony.Sms.MESSAGE_TYPE_OUTBOX)
        put(Telephony.Sms.STATUS, Telephony.Sms.STATUS_PENDING)
        if (sim >= 0) put(Telephony.Sms.SUBSCRIPTION_ID, sim)
      }
      id = context.contentResolver.insert(Telephony.Sms.CONTENT_URI, values)?.lastPathSegment?.toLongOrNull() ?: -1L
    }
    val sms = manager(context, sim)
    val parts = sms.divideMessage(text)
    val sent = Intent(context, SentReceiver::class.java).setAction(SENT_ACTION).putExtra("id", id)
    val last = PendingIntent.getBroadcast(context, (id and 0x7fffffff).toInt(), sent, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
    val intents = ArrayList<PendingIntent?>(parts.size).apply {
      repeat(parts.size - 1) { add(null) }
      add(last)
    }
    // The delivery report of the last part. Android puts the report in the intent, so it must be mutable.
    val reports = if (id < 0) null else {
      val delivered = Intent(context, DeliveredReceiver::class.java).setAction(DELIVERED_ACTION).putExtra("id", id)
      val mutable = if (Build.VERSION.SDK_INT >= 31) PendingIntent.FLAG_MUTABLE else 0
      val report = PendingIntent.getBroadcast(context, (id and 0x7fffffff).toInt(), delivered, mutable or PendingIntent.FLAG_UPDATE_CURRENT)
      ArrayList<PendingIntent?>(parts.size).apply {
        repeat(parts.size - 1) { add(null) }
        add(report)
      }
    }
    sms.sendMultipartTextMessage(address, null, parts, intents, reports)
    return id
  }

  fun sent(context: Context, id: Long, ok: Boolean) {
    if (id >= 0 && isDefault(context)) {
      val values = ContentValues().apply {
        put(Telephony.Sms.TYPE, if (ok) Telephony.Sms.MESSAGE_TYPE_SENT else Telephony.Sms.MESSAGE_TYPE_FAILED)
      }
      context.contentResolver.update(Uri.withAppendedPath(Telephony.Sms.CONTENT_URI, id.toString()), values, null, null)
    }
    listener?.invoke("onSmsSent", mapOf("id" to id.toDouble(), "ok" to ok))
  }

  /** The network's delivery report of a text that went: it reached their phone, is still on its
   *  way, or will not. Kept in the text's row. */
  fun delivered(context: Context, id: Long, pdu: ByteArray?, format: String?) {
    if (id < 0 || pdu == null) return
    val report = try {
      if (Build.VERSION.SDK_INT >= 23) SmsMessage.createFromPdu(pdu, format) else @Suppress("DEPRECATION") SmsMessage.createFromPdu(pdu)
    } catch (_: Exception) {
      null
    } ?: return
    val status = deliveryStatus(report.status, format)
    if (isDefault(context)) {
      val values = ContentValues().apply { put(Telephony.Sms.STATUS, status) }
      context.contentResolver.update(Uri.withAppendedPath(Telephony.Sms.CONTENT_URI, id.toString()), values, null, null)
    }
    listener?.invoke("onSmsDelivered", mapOf("id" to id.toDouble(), "ok" to (status == Telephony.Sms.STATUS_COMPLETE)))
  }

  /** A report's status as the SMS provider keeps it. GSM gives TP-Status (below 0x20 delivered,
   *  below 0x40 still trying, else failed); CDMA an error class and a message status. */
  private fun deliveryStatus(status: Int, format: String?): Int {
    if (format == "3gpp2") {
      val errorClass = (status shr 24) and 0x03
      val code = (status shr 16) and 0x3f
      return when (errorClass) {
        0 -> if (code == 2) Telephony.Sms.STATUS_COMPLETE else Telephony.Sms.STATUS_PENDING
        3 -> Telephony.Sms.STATUS_FAILED
        else -> Telephony.Sms.STATUS_PENDING
      }
    }
    return when {
      status < 0x20 -> Telephony.Sms.STATUS_COMPLETE
      status < 0x40 -> Telephony.Sms.STATUS_PENDING
      else -> Telephony.Sms.STATUS_FAILED
    }
  }

  /** Keeps a text that came, as the default app must, and says so. */
  fun received(context: Context, address: String, text: String, sentAt: Long, sim: Int) {
    if (!isDefault(context)) return
    val values = ContentValues().apply {
      put(Telephony.Sms.ADDRESS, address)
      put(Telephony.Sms.BODY, text)
      put(Telephony.Sms.DATE, System.currentTimeMillis())
      put(Telephony.Sms.DATE_SENT, sentAt)
      put(Telephony.Sms.READ, 0)
      put(Telephony.Sms.SEEN, 0)
      put(Telephony.Sms.TYPE, Telephony.Sms.MESSAGE_TYPE_INBOX)
      if (sim >= 0) put(Telephony.Sms.SUBSCRIPTION_ID, sim)
    }
    context.contentResolver.insert(Telephony.Sms.Inbox.CONTENT_URI, values)
    came(context, mapOf("address" to address))
  }

  /** Tells the open app that something came, and shows a notice unless Erevos is on the screen:
   *  in the background its JS side still runs, but nobody looks at it. */
  fun came(context: Context, body: Map<String, Any?>) {
    listener?.invoke("onSms", body)
    if (!onScreen()) notifyNew(context)
  }

  private fun onScreen(): Boolean {
    val state = ActivityManager.RunningAppProcessInfo()
    ActivityManager.getMyMemoryState(state)
    return state.importance <= ActivityManager.RunningAppProcessInfo.IMPORTANCE_FOREGROUND
  }

  /** A notice that something came, without who sent it or what it says. */
  fun notifyNew(context: Context) {
    val notifications = context.getSystemService(NotificationManager::class.java) ?: return
    // In the app's language, as the call module keeps it (erevos-call Notices.kt).
    val greek = context.getSharedPreferences("erevos-lang", Context.MODE_PRIVATE).getString("lang", null) == "el"
    if (Build.VERSION.SDK_INT >= 26) {
      notifications.createNotificationChannel(NotificationChannel(CHANNEL, if (greek) "Μηνύματα" else "Messages", NotificationManager.IMPORTANCE_HIGH))
    }
    val launch = context.packageManager.getLaunchIntentForPackage(context.packageName) ?: return
    val open = PendingIntent.getActivity(context, 0, launch, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
    val builder = if (Build.VERSION.SDK_INT >= 26) Notification.Builder(context, CHANNEL) else @Suppress("DEPRECATION") Notification.Builder(context)
    val notice = builder
      .setSmallIcon(android.R.drawable.stat_notify_chat)
      .setContentTitle(if (greek) "Νέο μήνυμα" else "New message")
      .setContentIntent(open)
      .setAutoCancel(true)
      .build()
    try {
      notifications.notify(1, notice)
    } catch (_: SecurityException) {
      // Notifications are not allowed: the message waits in the list.
    }
  }

  // --- Deleting, sending again ---------------------------------------------------------------

  /** Deletes from the phone a conversation's SMS and MMS up to `upTo` (milliseconds), as only the
   *  default SMS app may. Android drops the conversation once nothing is left in it. Returns how
   *  many went. */
  fun deleteThread(context: Context, address: String, upTo: Long): Int {
    check(isDefault(context)) { "Only the SMS app may delete SMS" }
    val thread = threadId(context, address) ?: return 0
    val gone = context.contentResolver.delete(Telephony.Sms.CONTENT_URI, "${Telephony.Sms.THREAD_ID}=? AND ${Telephony.Sms.DATE}<=?", arrayOf(thread.toString(), upTo.toString()))
    return gone + MmsStore.deleteThread(context, thread, upTo)
  }

  /** Deletes messages from the phone, each named by its kind and row: "sms:12", "mms:3". */
  fun deleteMessages(context: Context, ids: List<String>): Int {
    check(isDefault(context)) { "Only the SMS app may delete SMS" }
    var gone = 0
    for (name in ids) {
      val id = name.substringAfter(':').toLongOrNull() ?: continue
      val uri = when (name.substringBefore(':')) {
        "sms" -> Telephony.Sms.CONTENT_URI
        "mms" -> Uri.parse("content://mms")
        else -> continue
      }
      gone += context.contentResolver.delete(Uri.withAppendedPath(uri, id.toString()), null, null)
    }
    return gone
  }

  /** Sends again one of ours that did not go: the same text to the same number, on `sim` (or the
   *  SIM it was to go on, for -1), as a new message in place of the old one. Returns the new row. */
  fun resend(context: Context, id: Long, sim: Int): Long {
    var address = ""
    var body = ""
    var was = -1
    val row = Uri.withAppendedPath(Telephony.Sms.CONTENT_URI, id.toString())
    context.contentResolver.query(row, arrayOf(Telephony.Sms.ADDRESS, Telephony.Sms.BODY, Telephony.Sms.SUBSCRIPTION_ID), null, null, null)?.use { c ->
      if (c.moveToFirst()) {
        address = c.getString(0) ?: ""
        body = c.getString(1) ?: ""
        was = if (c.isNull(2)) -1 else c.getInt(2)
      }
    }
    require(address.isNotEmpty() && body.isNotEmpty()) { "That SMS is no longer on the phone" }
    val sent = send(context, address, body, if (sim >= 0) sim else was)
    if (isDefault(context)) context.contentResolver.delete(row, null, null)
    return sent
  }

  // --- Blocked numbers -------------------------------------------------------------------------

  /** Whether Erevos may read and change Android's own list of blocked numbers: as the default SMS
   *  app, for the phone's owner. Android then rejects their SMS, MMS and calls itself. */
  fun canBlock(context: Context): Boolean =
    Build.VERSION.SDK_INT >= 24 && isDefault(context) && try {
      BlockedNumberContract.canCurrentUserBlockNumbers(context)
    } catch (_: Exception) {
      false
    }

  /** The numbers in Android's list, as they were written there. */
  fun blocked(context: Context): List<String> {
    if (!canBlock(context)) return emptyList()
    val numbers = ArrayList<String>()
    try {
      val projection = arrayOf(BlockedNumberContract.BlockedNumbers.COLUMN_ORIGINAL_NUMBER)
      context.contentResolver.query(BlockedNumberContract.BlockedNumbers.CONTENT_URI, projection, null, null, null)?.use { c ->
        while (c.moveToNext()) c.getString(0)?.takeIf { it.isNotBlank() }?.let { numbers.add(it) }
      }
    } catch (_: Exception) {
      return emptyList()
    }
    return numbers
  }

  fun block(context: Context, number: String): Boolean {
    check(canBlock(context)) { "Only the SMS app may block numbers" }
    if (BlockedNumberContract.isBlocked(context, number)) return true
    val values = ContentValues().apply { put(BlockedNumberContract.BlockedNumbers.COLUMN_ORIGINAL_NUMBER, number) }
    return context.contentResolver.insert(BlockedNumberContract.BlockedNumbers.CONTENT_URI, values) != null
  }

  fun unblock(context: Context, number: String): Boolean {
    check(canBlock(context)) { "Only the SMS app may block numbers" }
    return BlockedNumberContract.unblock(context, number) > 0
  }

  fun sendData(context: Context, address: String, data: ByteArray) {
    manager(context).sendDataMessage(address, null, INVITE_PORT, data, null, null)
  }

  /** Keeps a piece of an SMS invite until the JS side takes it. */
  fun invite(context: Context, address: String, data: ByteArray) {
    val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    synchronized(this) {
      val list = JSONArray(prefs.getString(INVITES, "[]"))
      val kept = JSONArray()
      for (i in maxOf(0, list.length() - MAX_INVITES + 1) until list.length()) kept.put(list.get(i))
      kept.put(
        JSONObject()
          .put("from", address)
          .put("data", Base64.encodeToString(data, Base64.NO_WRAP))
          .put("at", System.currentTimeMillis().toDouble()),
      )
      prefs.edit().putString(INVITES, kept.toString()).apply()
    }
    listener?.invoke("onInvite", mapOf("from" to address))
  }

  fun takeInvites(context: Context): List<Map<String, Any?>> {
    val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    synchronized(this) {
      val list = JSONArray(prefs.getString(INVITES, "[]"))
      prefs.edit().remove(INVITES).apply()
      return (0 until list.length()).map { i ->
        val item = list.getJSONObject(i)
        mapOf("from" to item.getString("from"), "data" to item.getString("data"), "at" to item.getDouble("at"))
      }
    }
  }
}
