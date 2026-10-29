package expo.modules.erevossms

import java.text.Normalizer

// The built-in rule of Spam's filter (app/lib/sms-folders.ts, spamWords), so an SMS that comes and
// that it would put in Spam comes with no notice (SmsStore.received): from a phone number, with a
// link, and with words that try to fool, read as lookAlike reads them. Only this rule: the owner's
// own words, rules and marks are kept encrypted in the space, and never read here. Whether it is a
// contact or was answered SmsStore asks the phone. The app's Spam folder still decides where it
// shows. Keep it the same as the app's: checks/sms-folders.check.ts reads PHRASES, LOOKS_LIKE and
// INVISIBLE from this file and fails when they differ from lib/sms-folders.ts.
internal object BuiltInSpam {
  // The words that try to fool, as SPAM_PHRASES in lib/sms-folders.ts: this is the one list here.
  val PHRASES = listOf(
    "κερδισατε",
    "κερδισες",
    "συγχαρητηρια",
    "το δεμα σας",
    "δεμα σας",
    "τελωνει",
    "ανασταλει",
    "αναστολη του λογαριασμου",
    "επιβεβαιωστε τα στοιχεια",
    "ενημερωστε τα στοιχεια",
    "επιστροφη φορου",
    "you won",
    "you have won",
    "winner",
    "congratulations",
    "claim your",
    "your parcel",
    "your package",
    "customs fee",
    "redelivery",
    "account suspended",
    "account has been suspended",
    "verify your account",
    "confirm your details",
    "update your details",
    "tax refund",
    "gift card",
    "bitcoin",
    "crypto",
  )

  // Marks that show nothing, and letters of other scripts that look like Latin ones (lookAlike).
  private val INVISIBLE = Regex("[\\u00ad\\u034f\\u061c\\u115f\\u1160\\u17b4\\u17b5\\u180b-\\u180e\\u200b-\\u200f\\u202a-\\u202e\\u2060-\\u206f\\u3164\\ufe00-\\ufe0f\\ufeff\\uffa0]")
  private val LOOKS_LIKE = mapOf(
    'а' to 'a', 'с' to 'c', 'е' to 'e', 'о' to 'o', 'р' to 'p', 'х' to 'x', 'у' to 'y', 'к' to 'k', 'м' to 'm', 'н' to 'h', 'т' to 't', 'і' to 'i', 'ї' to 'i', 'ј' to 'j', 'ѕ' to 's', 'ԁ' to 'd', 'ӏ' to 'l', 'һ' to 'h', 'ԛ' to 'q', 'ԝ' to 'w',
    'ο' to 'o', 'α' to 'a', 'ν' to 'v', 'ρ' to 'p', 'υ' to 'u', 'ι' to 'i', 'κ' to 'k', 'χ' to 'x', 'τ' to 't', 'γ' to 'y', 'ω' to 'w', 'η' to 'n',
  )
  private val MARKS = Regex("[\\u0300-\\u036f]")
  // What JavaScript's \s takes; Java's takes only the ASCII ones.
  private const val SPACE = "\\t\\n\\u000b\\f\\r \\u00a0\\u1680\\u2000-\\u200a\\u2028\\u2029\\u202f\\u205f\\u3000\\ufeff"
  private val SPACES = Regex("[$SPACE]+")
  private val SPACE_CHAR = Regex("[$SPACE]")
  // Web addresses as lib/links.ts finds them (its \b before them, written out).
  private val LINK = Regex("(?<![A-Za-z0-9_])(?:https?://|www\\.)[^$SPACE<>\"]+", RegexOption.IGNORE_CASE)
  private val TRAILING = Regex("[.,;:!?'’”»]+$")

  private val PLAIN_PHRASES by lazy { PHRASES.map { fold(it) } }

  /** plainText of lib/sms-folders.ts: small letters, no accents, single spaces. */
  private fun plain(text: String): String =
    SPACES.replace(MARKS.replace(Normalizer.normalize(text, Normalizer.Form.NFD), "").lowercase(), " ").trim { SPACE_CHAR.matches(it.toString()) }

  /** lookAlike of lib/sms-folders.ts: words as the filter compares them. */
  fun fold(text: String): String {
    val folded = INVISIBLE.replace(Normalizer.normalize(text, Normalizer.Form.NFKD), "")
    val plain = plain(folded)
    val out = StringBuilder(plain.length)
    for (c in plain) out.append(if (c.code > 0x7f) LOOKS_LIKE[c] ?: c else c)
    return out.toString()
  }

  /** Whether `text` has a web address, as splitLinks of lib/links.ts finds one. */
  fun hasLink(text: String): Boolean {
    for (match in LINK.findAll(text)) {
      var link = match.value
      while (true) {
        val trimmed = TRAILING.replace(link, "")
        val closing = trimmed.lastOrNull()
        val unopened = (closing == ')' || closing == ']') &&
          trimmed.count { it == (if (closing == ')') '(' else '[') } < trimmed.count { it == closing }
        val next = if (unopened) trimmed.dropLast(1) else trimmed
        if (next == link) break
        link = next
      }
      if (link.length > 4) return true
    }
    return false
  }

  /** Whether `address` is one phone number, not a sender's name nor a short code (spamReason's `number`). */
  fun isNumber(address: String): Boolean =
    !address.contains(',') && !address.contains(';') && !address.contains('\n') && address.count { it in '0'..'9' } >= 7

  /** The words that try to fool in `text`, as the app's list writes them, or null. */
  fun phrase(text: String): String? {
    val plain = fold(text)
    val at = PLAIN_PHRASES.indexOfFirst { plain.contains(it) }
    return if (at >= 0) PHRASES[at] else null
  }

  /** Whether an SMS from `address` saying `text` is spam by the built-in rule alone, before asking
   *  whether it is a contact or was answered: a number, a link, and words that try to fool. */
  fun byWords(address: String, text: String): Boolean = isNumber(address) && hasLink(text) && phrase(text) != null
}
