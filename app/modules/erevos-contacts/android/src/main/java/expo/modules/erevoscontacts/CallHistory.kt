package expo.modules.erevoscontacts

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.provider.CallLog
import android.util.Log

/**
 * The calls with a contact's numbers, from the phone's call log, for its card: the latest first.
 * The call log keeps numbers as they were dialled or came, so a row matches a number by its last
 * ten digits (or all of them when shorter), with or without the country code. Reading needs
 * READ_CALL_LOG, asked for when the owner first opens a contact's calls; without it there are none.
 */
internal object CallHistory {
  private const val TAG = "ErevosContacts"
  // The most rows of the call log looked through for one contact.
  private const val MOST_ROWS = 5000

  fun canRead(context: Context): Boolean =
    context.checkSelfPermission(Manifest.permission.READ_CALL_LOG) == PackageManager.PERMISSION_GRANTED

  private fun digits(number: String): String = number.filter { it in '0'..'9' }

  private fun same(a: String, b: String): Boolean {
    if (a.isEmpty() || b.isEmpty()) return false
    if (a.length >= 10 && b.length >= 10) return a.takeLast(10) == b.takeLast(10)
    return a == b
  }

  private fun kind(type: Int): String = when (type) {
    CallLog.Calls.INCOMING_TYPE, CallLog.Calls.ANSWERED_EXTERNALLY_TYPE -> "in"
    CallLog.Calls.OUTGOING_TYPE -> "out"
    CallLog.Calls.MISSED_TYPE -> "missed"
    CallLog.Calls.REJECTED_TYPE -> "rejected"
    CallLog.Calls.BLOCKED_TYPE -> "blocked"
    else -> "other"
  }

  fun calls(context: Context, numbers: List<String>, limit: Int): List<Map<String, Any?>> {
    if (!canRead(context)) return emptyList()
    val wanted = numbers.map(::digits).filter { it.isNotEmpty() }
    if (wanted.isEmpty() || limit <= 0) return emptyList()
    val found = mutableListOf<Map<String, Any?>>()
    val projection = arrayOf(CallLog.Calls.NUMBER, CallLog.Calls.DATE, CallLog.Calls.DURATION, CallLog.Calls.TYPE)
    try {
      context.contentResolver.query(CallLog.Calls.CONTENT_URI, projection, null, null, "${CallLog.Calls.DATE} DESC")?.use { c ->
        var rows = 0
        while (c.moveToNext() && rows < MOST_ROWS && found.size < limit) {
          rows++
          val number = c.getString(0).orEmpty()
          val d = digits(number)
          if (wanted.none { same(it, d) }) continue
          found.add(
            mapOf(
              "number" to number,
              "at" to c.getLong(1).toDouble(),
              "seconds" to c.getLong(2).toDouble(),
              "kind" to kind(c.getInt(3)),
            ),
          )
        }
      }
    } catch (e: Exception) {
      // Not allowed after all, or the phone keeps no call log.
      Log.w(TAG, "The call log could not be read", e)
    }
    return found
  }
}
