package expo.modules.erevosphone

import android.content.Context
import android.telephony.PhoneNumberUtils
import org.json.JSONArray
import org.json.JSONObject

/**
 * Which calls are blocked (lib/phone-rules.ts says what the rules are): a number starting with
 * one of the digits kept, after its + (`international`) or as the phone's country writes it
 * (`national`), unless it is in the phone's contacts or Erevos knows it while a space is open; and
 * the contacts of the contact groups blocked for now (`groups`). Kept in the module's own
 * preferences, as the app wrote them: only prefixes, group ids and times, no names. Read by the
 * screening service (ScreeningService) and, for a call it did not see, by CallService. Not
 * compiled or run yet.
 */
internal object Rules {
  private const val KEY = "rules"

  /** The rules as the app wrote them, JSON, or "" when there are none. */
  fun raw(context: Context): String = Replies.prefs(context).getString(KEY, null) ?: ""

  fun save(context: Context, json: String) {
    val edit = Replies.prefs(context).edit()
    if (json.isEmpty()) edit.remove(KEY) else edit.putString(KEY, json)
    edit.apply()
  }

  private fun rules(context: Context): JSONObject? = raw(context).takeIf { it.isNotEmpty() }?.let { runCatching { JSONObject(it) }.getOrNull() }

  private fun strings(array: JSONArray?): List<String> =
    if (array == null) emptyList() else (0 until array.length()).mapNotNull { array.optString(it).takeIf { s -> s.isNotEmpty() } }

  /** Whether there is anything to block at all, without looking at the number. */
  fun any(context: Context): Boolean {
    val rules = rules(context) ?: return false
    return strings(rules.optJSONArray("international")).isNotEmpty() || strings(rules.optJSONArray("national")).isNotEmpty() ||
      groups(rules).isNotEmpty()
  }

  // The contact groups whose calls are blocked now: those until lifted (0), or until later.
  private fun groups(rules: JSONObject): List<String> {
    val array = rules.optJSONArray("groups") ?: return emptyList()
    val now = System.currentTimeMillis()
    return (0 until array.length()).mapNotNull { i ->
      val group = array.optJSONObject(i) ?: return@mapNotNull null
      val until = group.optLong("until", -1)
      group.optString("id").takeIf { it.isNotEmpty() && (until == 0L || until > now) }
    }
  }

  /** Whether a call from `number` is blocked. Looks in the phone's contacts: off the main thread. */
  fun blocks(context: Context, number: String): Boolean {
    val rules = rules(context) ?: return false
    if (number.none { it.isDigit() }) return false
    val international = strings(rules.optJSONArray("international"))
    val national = strings(rules.optJSONArray("national"))
    val groups = groups(rules)
    if (international.isEmpty() && national.isEmpty() && groups.isEmpty()) return false
    val contact = Callers.lookup(context, number)
    // A number of the contacts is never blocked by a prefix; one of a blocked group's contacts is.
    if (contact == null && Calls.knownName(number) == null && prefixed(context, number, international, national)) return true
    return contact != null && groups.isNotEmpty() && History.inGroups(context, contact.id, groups)
  }

  // Whether the number starts with one of the prefixes. The national ones are matched through the
  // number in E.164: a national number written with the prefix and the number's last digits is the
  // same number, for the phone's country, exactly when the number starts with it there.
  private fun prefixed(context: Context, number: String, international: List<String>, national: List<String>): Boolean {
    val iso = Callers.country(context)
    val plain = number.filter { it.isDigit() || it == '+' }
    val e164 = when {
      plain.startsWith("+") -> plain
      plain.startsWith("00") -> "+" + plain.drop(2)
      iso != null -> PhoneNumberUtils.formatNumberToE164(plain, iso)
      else -> null
    }
    val digits = e164?.drop(1)?.filter { it.isDigit() } ?: ""
    if (digits.isNotEmpty() && international.any { digits.startsWith(it) }) return true
    if (national.isEmpty()) return false
    // As it came, when it came written the national way.
    if (!plain.startsWith("+") && !plain.startsWith("00") && national.any { plain.startsWith(it) }) return true
    if (iso == null || e164 == null) return false
    return national.any { prefix -> (0..digits.length).any { n -> PhoneNumberUtils.formatNumberToE164(prefix + digits.takeLast(n), iso) == e164 } }
  }
}
