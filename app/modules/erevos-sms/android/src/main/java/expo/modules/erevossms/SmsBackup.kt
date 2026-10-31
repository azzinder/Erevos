// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

package expo.modules.erevossms

import android.content.ContentValues
import android.content.Context
import android.net.Uri
import android.provider.Telephony
import android.util.Log
import java.io.ByteArrayOutputStream
import java.io.DataOutputStream
import java.nio.ByteBuffer
import org.json.JSONArray
import org.json.JSONObject

/**
 * The phone's SMS and MMS for Erevos's backups (lock/backup.ts keeps them in the backup, sealed
 * with its password): read whole from Android's store into one block of bytes, given to the app
 * and never written to a file on the way, and put back into the store, as only the default SMS app
 * may, each message the store does not have yet. Nothing on the phone is deleted or changed by it.
 * Not run on a phone yet.
 *
 * The bytes: MAGIC; how many SMS, MMS, and parts of MMS left out (4 bytes each); then each
 * message: its kind (1 byte: 1 an SMS, 2 an MMS), its fields as JSON (4-byte length, then the
 * JSON), and, for an MMS, the data of each of its parts marked "data", in order (4-byte length,
 * then the data). The pictures of all MMS together are kept up to MAX_DATA; past it, and for a
 * part larger than MAX_PART, an MMS keeps its text only.
 */
internal object SmsBackup {
  private const val TAG = "ErevosSms"
  private val MAGIC = "EREVOS SMS 1\n".toByteArray(Charsets.UTF_8)
  private const val HEAD = 12
  private const val MAX_DATA = 32L * 1024 * 1024
  private const val MAX_PART = 2 * 1024 * 1024
  private const val MAX_MESSAGES = 200_000
  private const val SMS = 1
  private const val MMS = 2
  private val MMS_URI: Uri = Uri.parse("content://mms")
  private const val NOTIFICATION_IND = 130
  private const val CHUNK = 200

  // --- Reading the store -----------------------------------------------------------------------

  /** Every SMS and MMS on the phone, oldest first. Needs READ_SMS. */
  fun export(context: Context): ByteArray {
    val bytes = ByteArrayOutputStream(1024 * 1024)
    val out = DataOutputStream(bytes)
    out.write(MAGIC)
    out.write(ByteArray(HEAD))
    var sms = 0
    var mms = 0
    var left = 0
    var data = 0L
    val projection = arrayOf(
      Telephony.Sms.ADDRESS, Telephony.Sms.BODY, Telephony.Sms.DATE, Telephony.Sms.DATE_SENT, Telephony.Sms.TYPE,
      Telephony.Sms.READ, Telephony.Sms.SEEN, Telephony.Sms.STATUS, Telephony.Sms.SUBSCRIPTION_ID,
    )
    // Those that came, went and failed; not those on their way now.
    val kept = "${Telephony.Sms.TYPE} IN (${Telephony.Sms.MESSAGE_TYPE_INBOX},${Telephony.Sms.MESSAGE_TYPE_SENT},${Telephony.Sms.MESSAGE_TYPE_FAILED})"
    context.contentResolver.query(Telephony.Sms.CONTENT_URI, projection, kept, null, "${Telephony.Sms.DATE} ASC")?.use { c ->
      while (c.moveToNext() && sms < MAX_MESSAGES) {
        val address = c.getString(0) ?: continue
        val fields = JSONObject()
          .put("address", address)
          .put("body", c.getString(1) ?: "")
          .put("date", c.getLong(2))
          .put("dateSent", c.getLong(3))
          .put("type", c.getInt(4))
          .put("read", c.getInt(5))
          .put("seen", c.getInt(6))
          .put("status", if (c.isNull(7)) Telephony.Sms.STATUS_NONE else c.getInt(7))
          .put("sim", if (c.isNull(8)) -1 else c.getInt(8))
        record(out, SMS, fields)
        sms++
      }
    }
    val mmsProjection = arrayOf(
      Telephony.Mms._ID, Telephony.Mms.THREAD_ID, Telephony.Mms.DATE, Telephony.Mms.DATE_SENT, Telephony.Mms.MESSAGE_BOX,
      Telephony.Mms.READ, Telephony.Mms.SEEN, Telephony.Mms.MESSAGE_TYPE, Telephony.Mms.SUBSCRIPTION_ID, Telephony.Mms.SUBJECT,
      Telephony.Mms.CONTENT_TYPE, Telephony.Mms.MESSAGE_ID, Telephony.Mms.TRANSACTION_ID,
    )
    try {
      context.contentResolver.query(MMS_URI, mmsProjection, null, null, "${Telephony.Mms.DATE} ASC")?.use { c ->
        while (c.moveToNext() && mms < MAX_MESSAGES) {
          // A notice of one never fetched holds nothing.
          if (c.getInt(7) == NOTIFICATION_IND) continue
          val id = c.getLong(0)
          val fields = JSONObject()
            .put("thread", JSONArray(MmsStore.recipients(context, c.getLong(1))))
            .put("date", c.getLong(2))
            .put("dateSent", c.getLong(3))
            .put("box", c.getInt(4))
            .put("read", c.getInt(5))
            .put("seen", c.getInt(6))
            .put("type", c.getInt(7))
            .put("sim", if (c.isNull(8)) -1 else c.getInt(8))
            .put("subject", c.getString(9) ?: "")
            .put("contentType", c.getString(10) ?: "")
            .put("messageId", c.getString(11) ?: "")
            .put("transactionId", c.getString(12) ?: "")
            .put("addresses", addresses(context, id))
          val parts = JSONArray()
          val datas = ArrayList<ByteArray>()
          for ((part, bytesOf) in parts(context, id)) {
            if (bytesOf != null) {
              val bytes = try {
                bytesOf()
              } catch (e: Exception) {
                Log.w(TAG, "A part of an MMS could not be read", e)
                null
              }
              if (bytes != null && bytes.size <= MAX_PART && data + bytes.size <= MAX_DATA) {
                data += bytes.size
                datas.add(bytes)
                part.put("data", true)
              } else {
                left++
              }
            }
            parts.put(part)
          }
          fields.put("parts", parts)
          record(out, MMS, fields)
          for (bytes in datas) {
            out.writeInt(bytes.size)
            out.write(bytes)
          }
          mms++
        }
      }
    } catch (e: Exception) {
      // No MMS store on this device; the SMS are kept all the same.
      Log.w(TAG, "The MMS could not be read for a backup", e)
    }
    out.flush()
    val all = bytes.toByteArray()
    ByteBuffer.wrap(all, MAGIC.size, HEAD).putInt(sms).putInt(mms).putInt(left)
    return all
  }

  private fun record(out: DataOutputStream, kind: Int, fields: JSONObject) {
    val json = fields.toString().toByteArray(Charsets.UTF_8)
    out.writeByte(kind)
    out.writeInt(json.size)
    out.write(json)
  }

  private fun addresses(context: Context, id: Long): JSONArray {
    val list = JSONArray()
    val projection = arrayOf(Telephony.Mms.Addr.ADDRESS, Telephony.Mms.Addr.TYPE, Telephony.Mms.Addr.CHARSET)
    context.contentResolver.query(Uri.parse("content://mms/$id/addr"), projection, null, null, null)?.use { c ->
      while (c.moveToNext()) {
        val address = c.getString(0) ?: continue
        list.put(JSONObject().put("address", address).put("type", c.getInt(1)).put("charset", if (c.isNull(2)) 106 else c.getInt(2)))
      }
    }
    return list
  }

  /** An MMS's parts, each with its fields, and how to read its data when it is not text. */
  private fun parts(context: Context, id: Long): List<Pair<JSONObject, (() -> ByteArray)?>> {
    val out = ArrayList<Pair<JSONObject, (() -> ByteArray)?>>()
    val projection = arrayOf(
      Telephony.Mms.Part._ID, Telephony.Mms.Part.CONTENT_TYPE, Telephony.Mms.Part.NAME, Telephony.Mms.Part.CONTENT_LOCATION,
      Telephony.Mms.Part.CONTENT_ID, Telephony.Mms.Part.CHARSET, Telephony.Mms.Part.TEXT, Telephony.Mms.Part.SEQ,
    )
    context.contentResolver.query(Uri.parse("content://mms/part"), projection, "${Telephony.Mms.Part.MSG_ID}=?", arrayOf(id.toString()), "${Telephony.Mms.Part.SEQ} ASC")?.use { c ->
      while (c.moveToNext()) {
        val part = c.getLong(0)
        val type = c.getString(1) ?: continue
        val fields = JSONObject()
          .put("type", type)
          .put("name", c.getString(2) ?: "")
          .put("location", c.getString(3) ?: "")
          .put("cid", c.getString(4) ?: "")
          .put("charset", if (c.isNull(5)) 0 else c.getInt(5))
          .put("seq", if (c.isNull(7)) 0 else c.getInt(7))
        val text = c.getString(6)
        // Text and the layout (SMIL) are kept in the row; pictures and the rest in a file of their own.
        if (text != null) {
          out.add(fields.put("text", text) to null)
        } else {
          out.add(fields to { MmsStore.partBytes(context, "content://mms/part/$part") })
        }
      }
    }
    return out
  }

  // --- Putting back ----------------------------------------------------------------------------

  /** How many SMS, MMS and parts left out a backup's bytes say they hold, or null if they are not
   *  such bytes. */
  fun counts(bytes: ByteArray): Triple<Int, Int, Int>? {
    if (bytes.size < MAGIC.size + HEAD || !bytes.copyOfRange(0, MAGIC.size).contentEquals(MAGIC)) return null
    val head = ByteBuffer.wrap(bytes, MAGIC.size, HEAD)
    return Triple(head.getInt(), head.getInt(), head.getInt())
  }

  /** Puts a backup's messages into Android's store, as the default SMS app, each one it does not
   *  have yet. Returns how many SMS and MMS were added. */
  fun import(context: Context, bytes: ByteArray): Map<String, Any?> {
    check(SmsStore.isDefault(context)) { "Only the SMS app may put SMS back" }
    require(counts(bytes) != null) { "These are not SMS from an Erevos backup" }
    val buffer = ByteBuffer.wrap(bytes, MAGIC.size + HEAD, bytes.size - MAGIC.size - HEAD)
    val haveSms = smsKeys(context)
    val haveMms = mmsKeys(context)
    val waiting = ArrayList<ContentValues>()
    var sms = 0
    var mms = 0
    val flush = {
      if (waiting.isNotEmpty()) sms += context.contentResolver.bulkInsert(Telephony.Sms.CONTENT_URI, waiting.toTypedArray())
      waiting.clear()
    }
    while (buffer.hasRemaining()) {
      val kind = buffer.get().toInt()
      val fields = JSONObject(String(take(buffer), Charsets.UTF_8))
      when (kind) {
        SMS -> {
          if (!haveSms.add(smsKey(fields.optString("address"), fields.optLong("date"), fields.optInt("type"), fields.optString("body")))) continue
          waiting.add(smsValues(fields))
          if (waiting.size >= CHUNK) flush()
        }
        MMS -> {
          val parts = fields.optJSONArray("parts") ?: JSONArray()
          val datas = (0 until parts.length()).filter { parts.getJSONObject(it).optBoolean("data") }.associateWith { take(buffer) }
          if (!haveMms.add(mmsKey(fields.optLong("date"), fields.optInt("box"), fields.optString("messageId"), fields.optString("transactionId")))) continue
          try {
            putMms(context, fields, parts, datas)
            mms++
          } catch (e: Exception) {
            Log.w(TAG, "An MMS of a backup could not be put back", e)
          }
        }
        else -> throw IllegalArgumentException("These are not SMS from an Erevos backup")
      }
    }
    flush()
    return mapOf("sms" to sms.toDouble(), "mms" to mms.toDouble())
  }

  private fun take(buffer: ByteBuffer): ByteArray {
    val size = buffer.getInt()
    require(size in 0..buffer.remaining()) { "These are not SMS from an Erevos backup" }
    return ByteArray(size).also { buffer.get(it) }
  }

  // The same message twice: the same time, kind, number and words.
  private fun smsKey(address: String, date: Long, type: Int, body: String) =
    "$date|$type|${address.filter { it.isDigit() }.takeLast(7).ifEmpty { address }}|${body.hashCode()}"

  private fun mmsKey(date: Long, box: Int, messageId: String, transactionId: String) = "$date|$box|$messageId|$transactionId"

  private fun smsKeys(context: Context): HashSet<String> {
    val keys = HashSet<String>()
    val projection = arrayOf(Telephony.Sms.ADDRESS, Telephony.Sms.DATE, Telephony.Sms.TYPE, Telephony.Sms.BODY)
    context.contentResolver.query(Telephony.Sms.CONTENT_URI, projection, null, null, null)?.use { c ->
      while (c.moveToNext()) keys.add(smsKey(c.getString(0) ?: "", c.getLong(1), c.getInt(2), c.getString(3) ?: ""))
    }
    return keys
  }

  private fun mmsKeys(context: Context): HashSet<String> {
    val keys = HashSet<String>()
    val projection = arrayOf(Telephony.Mms.DATE, Telephony.Mms.MESSAGE_BOX, Telephony.Mms.MESSAGE_ID, Telephony.Mms.TRANSACTION_ID)
    try {
      context.contentResolver.query(MMS_URI, projection, null, null, null)?.use { c ->
        while (c.moveToNext()) keys.add(mmsKey(c.getLong(0), c.getInt(1), c.getString(2) ?: "", c.getString(3) ?: ""))
      }
    } catch (_: Exception) {
      // No MMS store on this device.
    }
    return keys
  }

  private fun smsValues(fields: JSONObject) = ContentValues().apply {
    put(Telephony.Sms.ADDRESS, fields.optString("address"))
    put(Telephony.Sms.BODY, fields.optString("body"))
    put(Telephony.Sms.DATE, fields.optLong("date"))
    put(Telephony.Sms.DATE_SENT, fields.optLong("dateSent"))
    put(Telephony.Sms.TYPE, fields.optInt("type", Telephony.Sms.MESSAGE_TYPE_INBOX))
    put(Telephony.Sms.READ, fields.optInt("read", 1))
    put(Telephony.Sms.SEEN, fields.optInt("seen", 1))
    put(Telephony.Sms.STATUS, fields.optInt("status", Telephony.Sms.STATUS_NONE))
    fields.optInt("sim", -1).let { if (it >= 0) put(Telephony.Sms.SUBSCRIPTION_ID, it) }
  }

  private fun putMms(context: Context, fields: JSONObject, parts: JSONArray, datas: Map<Int, ByteArray>) {
    val addresses = fields.optJSONArray("addresses") ?: JSONArray()
    val thread = threadOf(context, fields, addresses)
    val values = ContentValues().apply {
      put(Telephony.Mms.THREAD_ID, thread)
      put(Telephony.Mms.DATE, fields.optLong("date"))
      put(Telephony.Mms.DATE_SENT, fields.optLong("dateSent"))
      put(Telephony.Mms.MESSAGE_BOX, fields.optInt("box", Telephony.Mms.MESSAGE_BOX_INBOX))
      put(Telephony.Mms.READ, fields.optInt("read", 1))
      put(Telephony.Mms.SEEN, fields.optInt("seen", 1))
      put(Telephony.Mms.MESSAGE_TYPE, fields.optInt("type", 132))
      put(Telephony.Mms.MMS_VERSION, 0x12)
      fields.optString("contentType").let { if (it.isNotEmpty()) put(Telephony.Mms.CONTENT_TYPE, it) }
      fields.optString("messageId").let { if (it.isNotEmpty()) put(Telephony.Mms.MESSAGE_ID, it) }
      fields.optString("transactionId").let { if (it.isNotEmpty()) put(Telephony.Mms.TRANSACTION_ID, it) }
      fields.optString("subject").let { if (it.isNotEmpty()) put(Telephony.Mms.SUBJECT, it) }
      fields.optInt("sim", -1).let { if (it >= 0) put(Telephony.Mms.SUBSCRIPTION_ID, it) }
    }
    val row = context.contentResolver.insert(MMS_URI, values) ?: throw IllegalStateException("The MMS was not kept")
    val id = row.lastPathSegment?.toLongOrNull() ?: throw IllegalStateException("The MMS was not kept")
    for (i in 0 until addresses.length()) {
      val address = addresses.getJSONObject(i)
      val value = ContentValues().apply {
        put(Telephony.Mms.Addr.ADDRESS, address.optString("address"))
        put(Telephony.Mms.Addr.TYPE, address.optInt("type"))
        put(Telephony.Mms.Addr.CHARSET, address.optInt("charset", 106))
      }
      context.contentResolver.insert(Uri.parse("content://mms/$id/addr"), value)
    }
    for (i in 0 until parts.length()) {
      val part = parts.getJSONObject(i)
      val value = ContentValues().apply {
        put(Telephony.Mms.Part.CONTENT_TYPE, part.optString("type"))
        put(Telephony.Mms.Part.SEQ, part.optInt("seq"))
        part.optString("name").let { if (it.isNotEmpty()) put(Telephony.Mms.Part.NAME, it) }
        part.optString("location").let { if (it.isNotEmpty()) put(Telephony.Mms.Part.CONTENT_LOCATION, it) }
        part.optString("cid").let { if (it.isNotEmpty()) put(Telephony.Mms.Part.CONTENT_ID, it) }
        part.optInt("charset").let { if (it > 0) put(Telephony.Mms.Part.CHARSET, it) }
        if (part.has("text")) put(Telephony.Mms.Part.TEXT, part.optString("text"))
      }
      // A picture left out of the backup leaves its MMS with its text only.
      if (!part.has("text") && datas[i] == null) continue
      val partRow = context.contentResolver.insert(Uri.parse("content://mms/$id/part"), value) ?: continue
      datas[i]?.let { data -> context.contentResolver.openOutputStream(partRow)?.use { it.write(data) } }
    }
  }

  /** The conversation an MMS goes in: the one of the numbers it was kept with, else of the number
   *  that sent it, or those it went to. */
  private fun threadOf(context: Context, fields: JSONObject, addresses: JSONArray): Long {
    val thread = fields.optJSONArray("thread")
    val numbers = (0 until (thread?.length() ?: 0)).map { thread!!.getString(it) }.filter { it.isNotBlank() }
    if (numbers.isNotEmpty()) return Telephony.Threads.getOrCreateThreadId(context, numbers.toSet())
    val inbox = fields.optInt("box") == Telephony.Mms.MESSAGE_BOX_INBOX
    val wanted = if (inbox) 137 else 151
    val others = (0 until addresses.length()).map { addresses.getJSONObject(it) }
      .filter { it.optInt("type") == wanted }.map { it.optString("address") }
      .filter { it.isNotBlank() && it != "insert-address-token" }
    return Telephony.Threads.getOrCreateThreadId(context, others.ifEmpty { listOf("Unknown") }.toSet())
  }
}
