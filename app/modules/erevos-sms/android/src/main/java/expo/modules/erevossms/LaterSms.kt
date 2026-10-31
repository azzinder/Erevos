// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

package expo.modules.erevossms

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Log
import java.io.File
import java.io.FileOutputStream
import java.nio.ByteBuffer
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec
import org.json.JSONObject

/**
 * SMS sent for later (lib/sms-later.ts), held by Android itself until their time, so they go then
 * even with Erevos closed and every space locked: the space's password is not there then, so each
 * waits encrypted with a key that never leaves the phone's keystore, in a file of one size, and
 * an alarm goes off at the soonest one's time. With the phone off then, they go once it is on and
 * unlocked again. The space keeps its own record of what it sent for later (lock/sms-data.ts);
 * what went is noted here by id, so it can tell.
 */
internal object LaterSms {
  private const val TAG = "ErevosSms"
  private const val ALIAS = "erevos-sms-later"
  private const val DIR = "erevos-sms-later"
  private const val PREFS = "erevos-sms-later"
  private const val WENT = "went"
  private const val RETRY_AT = "retryAt"
  const val ACTION = "expo.modules.erevossms.LATER"

  /** The longest text, as lib/sms-later.ts allows, and the most that wait at once, for all spaces. */
  const val MAX_TEXT = 4000
  private const val MAX_WAITING = 300
  /** Bytes each one takes before it is encrypted, whatever its length: its text at three bytes a
   *  character at most, and its fields. */
  private const val SIZE = 12 * 1024
  private const val RETRY = 5 * 60_000L
  /** How long what went is remembered, so a space opened only much later still learns it went. */
  private const val WENT_DAYS = 400L
  private const val MAX_WENT = 1000
  private val ID = Regex("^[A-Za-z0-9_-]{1,32}$")

  class Sms(val id: String, val to: String, val text: String, val sim: Int, val at: Long)

  /** Keeps an SMS to go at `at` (milliseconds) and sets the alarm. One already kept with this id
   *  is kept anew. */
  fun schedule(context: Context, id: String, to: String, text: String, sim: Int, at: Long) {
    require(ID.matches(id)) { "Not an id" }
    require(to.isNotBlank() && to.length <= 32 && text.isNotEmpty() && text.length <= MAX_TEXT) { "Cannot keep this SMS" }
    synchronized(this) {
      check(file(context, id).exists() || files(context).size < MAX_WAITING) { "Too many SMS wait to go later" }
      write(context, Sms(id, to, text, sim, at))
      prefs(context).edit().remove(RETRY_AT).apply()
      arm(context)
    }
  }

  /** Forgets one that has not gone. True if it was still waiting. */
  fun cancel(context: Context, id: String): Boolean {
    if (!ID.matches(id)) return false
    synchronized(this) {
      val waited = file(context, id).delete()
      arm(context)
      return waited
    }
  }

  /** For each id: "waiting" while it is held here, "went" once it went, "unknown" if never held. */
  fun state(context: Context, ids: List<String>): Map<String, String> {
    synchronized(this) {
      val went = went(context)
      return ids.associateWith { id ->
        when {
          ID.matches(id) && file(context, id).exists() -> "waiting"
          went.has(id) -> "went"
          else -> "unknown"
        }
      }
    }
  }

  /** Sends each one whose time came and sets the alarm for the next. Each is forgotten and noted as
   *  gone before it is sent, so none goes twice; one that could not be handed to the phone's SMS is
   *  put back and tried again a while later. Returns the ids that went. */
  fun sendDue(context: Context): List<String> {
    val went = ArrayList<String>()
    synchronized(this) {
      val now = System.currentTimeMillis()
      var failed = false
      for (sms in all(context)) {
        if (sms.at > now) continue
        file(context, sms.id).delete()
        noteWent(context, sms.id, now)
        try {
          SmsStore.send(context, sms.to, sms.text, sms.sim)
          went.add(sms.id)
        } catch (e: Exception) {
          Log.w(TAG, "An SMS sent for later could not go yet", e)
          write(context, sms)
          unnoteWent(context, sms.id)
          failed = true
        }
      }
      val prefs = prefs(context).edit()
      if (failed) prefs.putLong(RETRY_AT, now + RETRY) else prefs.remove(RETRY_AT)
      prefs.apply()
      arm(context)
    }
    for (id in went) SmsStore.listener?.invoke("onSmsLaterSent", mapOf("id" to id))
    return went
  }

  /** Sets the alarm for the soonest one, one that could not go only once its retry is due, or
   *  takes it away when none waits. */
  fun arm(context: Context) {
    val alarms = context.getSystemService(AlarmManager::class.java) ?: return
    val intent = Intent(context, LaterSmsReceiver::class.java).setAction(ACTION)
    val alarm = PendingIntent.getBroadcast(context, 0, intent, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
    val now = System.currentTimeMillis()
    val retryAt = prefs(context).getLong(RETRY_AT, 0L)
    val next = all(context).minOfOrNull { if (it.at > now) it.at else maxOf(now, retryAt) }
    if (next == null) {
      alarms.cancel(alarm)
      return
    }
    try {
      if (Build.VERSION.SDK_INT < 31 || alarms.canScheduleExactAlarms()) {
        alarms.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, next, alarm)
        return
      }
    } catch (_: SecurityException) {
      // Exact alarms are not allowed: a close one, then.
    }
    alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, next, alarm)
  }

  private fun prefs(context: Context) = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  private fun dir(context: Context): File = File(context.noBackupFilesDir, DIR).apply { mkdirs() }

  private fun file(context: Context, id: String): File = File(dir(context), "$id.sms")

  private fun files(context: Context): List<File> = dir(context).listFiles { f -> f.name.endsWith(".sms") }?.toList() ?: emptyList()

  /** Every one held, each opened; one that cannot be opened (its key gone) is dropped, and the
   *  space sends it itself, as one never held here. */
  private fun all(context: Context): List<Sms> =
    files(context).mapNotNull { f ->
      val id = f.name.removeSuffix(".sms")
      try {
        read(id, f.readBytes())
      } catch (e: Exception) {
        Log.w(TAG, "An SMS sent for later could not be opened", e)
        f.delete()
        null
      }
    }

  // Written whole to a file beside it first, then put in its place, so a file is never half one.
  private fun write(context: Context, sms: Sms) {
    val target = file(context, sms.id)
    val part = File(target.parentFile, "${target.name}.part")
    FileOutputStream(part).use { out ->
      out.write(seal(sms))
      out.fd.sync()
    }
    if (!part.renameTo(target)) {
      part.delete()
      throw IllegalStateException("The SMS could not be kept")
    }
  }

  private fun key(): SecretKey {
    val store = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
    (store.getKey(ALIAS, null) as? SecretKey)?.let { return it }
    val generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore")
    generator.init(
      KeyGenParameterSpec.Builder(ALIAS, KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
        .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
        .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
        .setKeySize(256)
        .build(),
    )
    return generator.generateKey()
  }

  /** The nonce, then the SMS padded to SIZE, encrypted with the keystore's key, bound to its id. */
  private fun seal(sms: Sms): ByteArray {
    val cipher = Cipher.getInstance("AES/GCM/NoPadding")
    cipher.init(Cipher.ENCRYPT_MODE, key())
    cipher.updateAAD(sms.id.toByteArray(Charsets.UTF_8))
    return cipher.iv + cipher.doFinal(pack(sms))
  }

  private fun read(id: String, sealed: ByteArray): Sms {
    val cipher = Cipher.getInstance("AES/GCM/NoPadding")
    cipher.init(Cipher.DECRYPT_MODE, key(), GCMParameterSpec(128, sealed, 0, 12))
    cipher.updateAAD(id.toByteArray(Charsets.UTF_8))
    return unpack(id, cipher.doFinal(sealed, 12, sealed.size - 12))
  }

  /** Its time, SIM, number and text, each text with its length, then zeros up to SIZE. */
  fun pack(sms: Sms): ByteArray {
    val to = sms.to.toByteArray(Charsets.UTF_8)
    val text = sms.text.toByteArray(Charsets.UTF_8)
    require(8 + 4 + 2 + to.size + 4 + text.size <= SIZE) { "Cannot keep this SMS" }
    return ByteBuffer.allocate(SIZE)
      .putLong(sms.at)
      .putInt(sms.sim)
      .putShort(to.size.toShort())
      .put(to)
      .putInt(text.size)
      .put(text)
      .array()
  }

  fun unpack(id: String, bytes: ByteArray): Sms {
    val buffer = ByteBuffer.wrap(bytes)
    val at = buffer.getLong()
    val sim = buffer.getInt()
    val to = ByteArray(buffer.getShort().toInt()).also { buffer.get(it) }
    val text = ByteArray(buffer.getInt()).also { buffer.get(it) }
    return Sms(id, String(to, Charsets.UTF_8), String(text, Charsets.UTF_8), sim, at)
  }

  // What went, by id, with when; older than WENT_DAYS forgotten, and the oldest past MAX_WENT.
  private fun went(context: Context): JSONObject {
    val kept = try {
      JSONObject(prefs(context).getString(WENT, "{}") ?: "{}")
    } catch (_: Exception) {
      JSONObject()
    }
    val since = System.currentTimeMillis() - WENT_DAYS * 24 * 3600 * 1000
    val fresh = kept.keys().asSequence().map { it to kept.optLong(it) }.filter { it.second >= since }.sortedBy { it.second }.toList().takeLast(MAX_WENT)
    return JSONObject().apply { for ((id, at) in fresh) put(id, at) }
  }

  private fun noteWent(context: Context, id: String, at: Long) {
    prefs(context).edit().putString(WENT, went(context).put(id, at).toString()).commit()
  }

  private fun unnoteWent(context: Context, id: String) {
    prefs(context).edit().putString(WENT, went(context).apply { remove(id) }.toString()).commit()
  }
}

/** The time of an SMS sent for later came, the phone started, Erevos was updated or the clock
 *  changed: what is due goes, and the alarm is set for the next. Android's own broadcasts reach it
 *  though it is not exported. */
class LaterSmsReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val done = goAsync()
    val app = context.applicationContext
    Thread {
      try {
        LaterSms.sendDue(app)
      } catch (e: Exception) {
        Log.w("ErevosSms", "SMS sent for later could not be looked at", e)
      } finally {
        done.finish()
      }
    }.start()
  }
}
