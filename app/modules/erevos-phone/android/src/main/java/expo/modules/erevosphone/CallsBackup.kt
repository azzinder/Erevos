// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

package expo.modules.erevosphone

import android.Manifest
import android.content.ContentValues
import android.content.Context
import android.content.pm.PackageManager
import android.provider.BlockedNumberContract
import android.provider.BlockedNumberContract.BlockedNumbers
import android.provider.CallLog
import android.util.Log
import org.json.JSONArray
import org.json.JSONObject

/**
 * The phone's call history and Android's own list of blocked numbers for Erevos's backups
 * (lib/backup-calls.ts keeps them in the backup, sealed with its password): read from Android as
 * JSON, given to the app and never written to a file on the way, and put back as the phone app
 * may. Which of a backup's calls and numbers the phone lacks the app works out; what it gives
 * here is added, and nothing on the phone is deleted or changed. A call's SIM is kept as its slot
 * (SIM 1, SIM 2), the one thing of it another phone knows: put back, the call is on the SIM in
 * that slot there, or on none. Not run on a phone yet.
 */
internal object CallsBackup {
  private const val TAG = "ErevosPhone"
  /** The most calls read, the newest, and the most blocked numbers: far more than Android keeps. */
  private const val MOST_CALLS = 10_000
  private const val MOST_BLOCKED = 5_000
  private const val CHUNK = 200

  /**
   * The calls, newest first, and the blocked numbers, as JSON: `allowed` is false while Erevos may
   * not read the call history, and `blocked` is left out while it may not read the list, as only
   * the phone app and the SMS app may. A voicemail's row is left out: the voicemail is the phone
   * company's, and the call history takes no such row from an app.
   */
  fun read(context: Context): String {
    if (!History.allowed(context)) return JSONObject().put("allowed", false).toString()
    val slots = Sims.accounts(context).filter { it.slot >= 0 }.associate { it.id to it.slot }
    val calls = JSONArray()
    val uri = CallLog.Calls.CONTENT_URI.buildUpon().appendQueryParameter(CallLog.Calls.LIMIT_PARAM_KEY, MOST_CALLS.toString()).build()
    val columns = arrayOf(
      CallLog.Calls.NUMBER, CallLog.Calls.NUMBER_PRESENTATION, CallLog.Calls.DATE, CallLog.Calls.DURATION, CallLog.Calls.TYPE,
      CallLog.Calls.FEATURES, CallLog.Calls.NEW, CallLog.Calls.IS_READ, CallLog.Calls.PHONE_ACCOUNT_ID,
    )
    try {
      context.contentResolver.query(uri, columns, "${CallLog.Calls.TYPE} != ${CallLog.Calls.VOICEMAIL_TYPE}", null, "${CallLog.Calls.DATE} DESC")?.use { c ->
        while (c.moveToNext() && calls.length() < MOST_CALLS) {
          val call = JSONObject()
            .put("number", c.getString(0) ?: "")
            .put("presentation", c.getInt(1))
            .put("date", c.getLong(2))
            .put("duration", c.getLong(3))
            .put("type", c.getInt(4))
            .put("features", c.getInt(5))
            .put("new", c.getInt(6) == 1)
            .put("sim", slots[c.getString(8) ?: ""] ?: -1)
          if (!c.isNull(7)) call.put("read", c.getInt(7) == 1)
          calls.put(call)
        }
      }
    } catch (_: SecurityException) {
      return JSONObject().put("allowed", false).toString()
    }
    val out = JSONObject().put("allowed", true).put("calls", calls)
    blocked(context)?.let { out.put("blocked", it) }
    return out.toString()
  }

  /** The numbers in Android's list, as they were written there; null while Erevos may not read it. */
  private fun blocked(context: Context): JSONArray? {
    val numbers = JSONArray()
    return try {
      context.contentResolver.query(BlockedNumbers.CONTENT_URI, arrayOf(BlockedNumbers.COLUMN_ORIGINAL_NUMBER), null, null, null)?.use { c ->
        while (c.moveToNext() && numbers.length() < MOST_BLOCKED) c.getString(0)?.takeIf { it.isNotBlank() }?.let { numbers.put(it) }
      }
      numbers
    } catch (_: Exception) {
      // Neither the phone app nor the SMS app, or not the phone's own user: Android says no.
      null
    }
  }

  /**
   * Adds calls and blocked numbers of a backup to Android's, as the phone app: `json` holds those
   * the phone lacks (lib/backup-calls.ts), each call with the fields read() gives. Returns how
   * many of each went in.
   */
  fun add(context: Context, json: String): Map<String, Any?> {
    check(ErevosPhoneModule.isDefault(context)) { "Only the phone app may put calls back" }
    check(context.checkSelfPermission(Manifest.permission.WRITE_CALL_LOG) == PackageManager.PERMISSION_GRANTED) { "Android does not let Erevos change the call history" }
    val given = JSONObject(json)
    val calls = given.optJSONArray("calls") ?: JSONArray()
    val sims = Sims.accounts(context).filter { it.slot >= 0 }.associateBy { it.slot }
    val waiting = ArrayList<ContentValues>()
    var added = 0
    val flush = {
      if (waiting.isNotEmpty()) added += context.contentResolver.bulkInsert(CallLog.Calls.CONTENT_URI, waiting.toTypedArray())
      waiting.clear()
    }
    for (i in 0 until minOf(calls.length(), MOST_CALLS)) {
      val call = calls.optJSONObject(i) ?: continue
      val type = call.optInt("type", CallLog.Calls.INCOMING_TYPE)
      if (type == CallLog.Calls.VOICEMAIL_TYPE) continue
      waiting.add(
        ContentValues().apply {
          put(CallLog.Calls.NUMBER, call.optString("number"))
          put(CallLog.Calls.NUMBER_PRESENTATION, call.optInt("presentation", CallLog.Calls.PRESENTATION_ALLOWED))
          put(CallLog.Calls.DATE, call.optLong("date"))
          put(CallLog.Calls.DURATION, call.optLong("duration"))
          put(CallLog.Calls.TYPE, type)
          put(CallLog.Calls.FEATURES, call.optInt("features"))
          put(CallLog.Calls.NEW, if (call.optBoolean("new")) 1 else 0)
          if (call.has("read")) put(CallLog.Calls.IS_READ, if (call.optBoolean("read")) 1 else 0)
          sims[call.optInt("sim", -1)]?.let {
            put(CallLog.Calls.PHONE_ACCOUNT_COMPONENT_NAME, it.handle.componentName.flattenToString())
            put(CallLog.Calls.PHONE_ACCOUNT_ID, it.handle.id)
          }
        },
      )
      if (waiting.size >= CHUNK) flush()
    }
    flush()
    var blocked = 0
    val numbers = given.optJSONArray("blocked") ?: JSONArray()
    for (i in 0 until minOf(numbers.length(), MOST_BLOCKED)) {
      val number = numbers.optString(i).takeIf { it.isNotBlank() } ?: continue
      try {
        // Android matches the number as it blocks it, written either way (+30… or 69…).
        if (BlockedNumberContract.isBlocked(context, number)) continue
        val values = ContentValues().apply { put(BlockedNumbers.COLUMN_ORIGINAL_NUMBER, number) }
        if (context.contentResolver.insert(BlockedNumbers.CONTENT_URI, values) != null) blocked++
      } catch (e: Exception) {
        Log.w(TAG, "A blocked number of a backup could not be put back", e)
      }
    }
    return mapOf("calls" to added.toDouble(), "blocked" to blocked.toDouble())
  }
}
