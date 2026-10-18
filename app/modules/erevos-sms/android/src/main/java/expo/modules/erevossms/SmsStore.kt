package expo.modules.erevossms

import android.Manifest
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.provider.ContactsContract
import android.provider.Telephony
import android.telephony.SmsManager
import android.telephony.SubscriptionManager
import android.telephony.TelephonyManager
import android.util.Base64
import org.json.JSONArray
import org.json.JSONObject

/**
 * The phone's SMS, as the default SMS app keeps them: in Android's SMS provider, which the
 * default app must write itself. Reading needs READ_SMS, writing needs the default SMS role.
 * Not compiled or run yet.
 */
internal object SmsStore {
  const val INVITE_PORT: Short = 16180
  const val SENT_ACTION = "expo.modules.erevossms.SENT"
  private const val CHANNEL = "sms"
  private const val PREFS = "erevos-sms"
  private const val INVITES = "invites"
  private const val MAX_INVITES = 50

  /** Set while the JS side runs: tells it what changed, as an event name and its body. */
  @Volatile var listener: ((String, Map<String, Any?>) -> Unit)? = null

  fun isDefault(context: Context): Boolean =
    Telephony.Sms.getDefaultSmsPackage(context) == context.packageName

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
  fun contactNames(context: Context, numbers: List<String>): Map<String, String> {
    if (context.checkSelfPermission(Manifest.permission.READ_CONTACTS) != PackageManager.PERMISSION_GRANTED) return emptyMap()
    val names = HashMap<String, String>()
    for (number in numbers.distinct().take(500)) {
      if (number.isBlank()) continue
      val uri = Uri.withAppendedPath(ContactsContract.PhoneLookup.CONTENT_FILTER_URI, Uri.encode(number))
      try {
        context.contentResolver.query(uri, arrayOf(ContactsContract.PhoneLookup.DISPLAY_NAME), null, null, null)?.use { c ->
          if (c.moveToFirst()) c.getString(0)?.let { if (it.isNotBlank()) names[number] = it }
        }
      } catch (_: Exception) {
        // Not a number the phone can look up.
      }
    }
    return names
  }

  /** The latest message of each conversation, newest first, with how many are not read. */
  fun threads(context: Context, limit: Int): List<Map<String, Any?>> {
    val seen = LinkedHashMap<Long, MutableMap<String, Any?>>()
    val projection = arrayOf(Telephony.Sms.THREAD_ID, Telephony.Sms.ADDRESS, Telephony.Sms.BODY, Telephony.Sms.DATE, Telephony.Sms.TYPE, Telephony.Sms.READ)
    context.contentResolver.query(Telephony.Sms.CONTENT_URI, projection, null, null, "${Telephony.Sms.DATE} DESC")?.use { c ->
      var rows = 0
      while (c.moveToNext() && rows++ < 5000) {
        val thread = c.getLong(0)
        val unread = c.getInt(4) == Telephony.Sms.MESSAGE_TYPE_INBOX && c.getInt(5) == 0
        val row = seen[thread]
        if (row == null) {
          if (seen.size >= limit) continue
          seen[thread] = mutableMapOf(
            "thread" to thread.toDouble(),
            "address" to (c.getString(1) ?: ""),
            "text" to (c.getString(2) ?: ""),
            "at" to c.getLong(3).toDouble(),
            "mine" to (c.getInt(4) != Telephony.Sms.MESSAGE_TYPE_INBOX),
            "unread" to (if (unread) 1 else 0),
          )
        } else if (unread) {
          row["unread"] = (row["unread"] as Int) + 1
        }
      }
    }
    // MMS: a conversation whose newest message is one shows it, and its unread ones count.
    for (latest in MmsStore.latest(context, 2000)) {
      val (thread, id, at, mine, unread) = latest.toList()
      val row = seen[thread]
      if (row == null || (row["at"] as Double) < at.toDouble()) {
        if (row == null && seen.size >= limit) continue
        val (text, pictures) = MmsStore.parts(context, id)
        // A group's conversation is named by all its numbers, comma-separated.
        val address = MmsStore.recipients(context, thread).joinToString(",").ifEmpty {
          (row?.get("address") as String?) ?: MmsStore.addressOf(context, id, mine == 1L)
        }
        if (address.isEmpty()) continue
        seen[thread] = mutableMapOf(
          "thread" to thread.toDouble(),
          "address" to address,
          "text" to text.ifEmpty { if (pictures.isNotEmpty()) "Picture" else "MMS" },
          "at" to at.toDouble(),
          "mine" to (mine == 1L),
          "unread" to ((row?.get("unread") as Int?) ?: 0) + unread.toInt(),
        )
      } else {
        row["unread"] = (row["unread"] as Int) + unread.toInt()
      }
    }
    return seen.values.sortedByDescending { it["at"] as Double }
  }

  /** A conversation's messages with one number, oldest first, the latest `limit` of them. */
  fun messages(context: Context, address: String, limit: Int): List<Map<String, Any?>> {
    val thread = threadId(context, address)
    val (selection, args) = if (thread != null) "${Telephony.Sms.THREAD_ID}=?" to arrayOf(thread.toString())
      else "${Telephony.Sms.ADDRESS}=?" to arrayOf(address)
    val out = ArrayList<Map<String, Any?>>()
    val projection = arrayOf(Telephony.Sms._ID, Telephony.Sms.BODY, Telephony.Sms.DATE, Telephony.Sms.TYPE, Telephony.Sms.READ, Telephony.Sms.SUBSCRIPTION_ID)
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
   * says later whether it went; otherwise Android writes it. Returns the row's id, or -1.
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
    sms.sendMultipartTextMessage(address, null, parts, intents, null)
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
    val heard = listener
    if (heard != null) heard("onSms", mapOf("address" to address)) else notifyNew(context)
  }

  /** A notice that something came, without who sent it or what it says. */
  fun notifyNew(context: Context) {
    val notifications = context.getSystemService(NotificationManager::class.java) ?: return
    if (Build.VERSION.SDK_INT >= 26) {
      notifications.createNotificationChannel(NotificationChannel(CHANNEL, "Messages", NotificationManager.IMPORTANCE_HIGH))
    }
    val launch = context.packageManager.getLaunchIntentForPackage(context.packageName) ?: return
    val open = PendingIntent.getActivity(context, 0, launch, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
    val builder = if (Build.VERSION.SDK_INT >= 26) Notification.Builder(context, CHANNEL) else @Suppress("DEPRECATION") Notification.Builder(context)
    val notice = builder
      .setSmallIcon(android.R.drawable.stat_notify_chat)
      .setContentTitle("New message")
      .setContentIntent(open)
      .setAutoCancel(true)
      .build()
    try {
      notifications.notify(1, notice)
    } catch (_: SecurityException) {
      // Notifications are not allowed: the message waits in the list.
    }
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
