package expo.modules.erevosphone

import android.content.Context
import org.json.JSONArray

/**
 * The quick replies a call that rings can be declined with: Telecom sends the one chosen to the
 * caller as an SMS (Call.reject). The owner's own, else the usual ones in the app's language. Kept
 * in the module's own preferences, not sealed, as the call screen shows them with Erevos locked.
 * Not compiled or run yet.
 */
internal object Replies {
  private const val KEY = "replies"

  fun prefs(context: Context) = context.getSharedPreferences("erevos-phone", Context.MODE_PRIVATE)

  /** The replies the call screen offers. */
  fun list(context: Context): List<String> = own(context) ?: usual(context)

  /** The owner's own replies, or null while the usual ones are used. */
  fun own(context: Context): List<String>? {
    val kept = prefs(context).getString(KEY, null) ?: return null
    return try {
      val array = JSONArray(kept)
      (0 until array.length()).map { array.getString(it) }.filter { it.isNotBlank() }.takeIf { it.isNotEmpty() }
    } catch (_: Exception) {
      null
    }
  }

  /** Keeps the owner's replies; null goes back to the usual ones. */
  fun set(context: Context, replies: List<String>?) {
    val edit = prefs(context).edit()
    if (replies.isNullOrEmpty()) edit.remove(KEY) else edit.putString(KEY, JSONArray(replies).toString())
    edit.apply()
  }

  private fun usual(context: Context): List<String> =
    if (Words.greek(context)) {
      listOf("Δεν μπορώ να μιλήσω τώρα. Τι έγινε;", "Σε παίρνω αμέσως πίσω.", "Σε παίρνω αργότερα.", "Δεν μπορώ να μιλήσω τώρα. Με παίρνεις αργότερα;")
    } else {
      listOf("Can't talk now. What's up?", "I'll call you right back.", "I'll call you later.", "Can't talk now. Call me later?")
    }
}
