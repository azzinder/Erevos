package expo.modules.erevossms

import android.content.BroadcastReceiver
import android.content.ClipData
import android.content.ClipDescription
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.PersistableBundle
import android.widget.Toast
import java.text.Normalizer

// The one-time code an SMS holds, for Copy code on the notice of an SMS that came
// (SmsStore.notifyNew), found as app/lib/one-time-code.ts finds it under the message: only in an
// SMS that says it holds a code, in one of the app's languages, its digits, 4 to 8 of them, written
// whole or in two parts ("123 456", "123-456"), nearest to those words; never a number in a phone
// number, an amount, a date or a time. Keep both the same.
internal object OneTimeCode {
  // The words that say an SMS holds a code, as plain() writes them (no accents, small letters).
  private val WORDS = listOf(
    "code", "otp", "pin", "passcode", "password", "verification", "verify", "one-time", "one time", "2fa", "tan",
    "κωδικ", "επαληθευσ", "επιβεβαιωσ", "μιας χρησης", "κλειδαριθμ", "συνθηματικ",
    "kennwort", "passwort", "bestatigung",
    "codigo", "clave", "contrasena", "verificacion",
    "mot de passe", "codice", "verifica",
    "senha", "verificacao",
    "kod", "sifra", "lozinka", "potvrd",
  )
  private val DIGITS = Regex("(\\d{3,4})[ -](\\d{3,4})(?!\\d)|\\d+")
  private val MARKS = Regex("[\\u0300-\\u036f]")
  private val SPACES = Regex("\\s+")
  // What stands beside the digits of a date, a phone number, an amount or a share; and between
  // those of an amount or a time, with digits on its other side.
  private const val BESIDE = "/+€$£%"
  private const val BETWEEN = ".,:"

  private fun plain(text: String): String =
    MARKS.replace(Normalizer.normalize(text, Normalizer.Form.NFD), "").lowercase().replace(SPACES, " ").trim()

  private fun letter(c: Char?) = c != null && Character.isLetter(c)
  private fun digit(c: Char?) = c != null && c in '0'..'9'

  /** The one-time code `text` holds, or null. */
  fun find(text: String): String? {
    val plain = plain(text)
    val words = mutableListOf<Int>()
    for (word in WORDS) {
      var at = plain.indexOf(word)
      while (at >= 0) {
        // A short word only at the start of one ("pin", not the "pin" in "shopping").
        if (word.length >= 4 || !letter(plain.getOrNull(at - 1))) words.add(at)
        at = plain.indexOf(word, at + 1)
      }
    }
    if (words.isEmpty()) return null
    var best: String? = null
    var bestFar = Int.MAX_VALUE
    for (found in DIGITS.findAll(plain)) {
      val at = found.range.first
      val end = found.range.last + 1
      val two = found.groups[1]
      val code = if (two != null) two.value + found.groups[2]!!.value else found.value
      if (code.length < 4 || code.length > 8) continue
      val before = plain.getOrNull(at - 1)
      val after = plain.getOrNull(end)
      if ((before != null && before in BESIDE) || (after != null && after in BESIDE)) continue
      if ((before != null && before in BETWEEN && digit(plain.getOrNull(at - 2))) || (after != null && after in BETWEEN && digit(plain.getOrNull(end + 1)))) continue
      // Joined to letters it is a name or a reference; after a space or a dash and more digits it is
      // part of a longer number.
      if (letter(before) || letter(after)) continue
      if ((before == ' ' || before == '-') && digit(plain.getOrNull(at - 2))) continue
      if ((after == ' ' || after == '-') && digit(plain.getOrNull(end + 1))) continue
      val far = words.minOf { kotlin.math.abs(it - at) }
      if (far < bestFar) {
        best = code
        bestFar = far
      }
    }
    return best
  }
}

/** Copy code on the notice of an SMS that came: copies the code it carries, marked sensitive, so
 *  Android shows no preview of it, and takes the notice away. */
class CopyCodeReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val code = intent.getStringExtra(EXTRA_CODE)?.takeIf { it.isNotEmpty() && it.all { c -> c in '0'..'9' } } ?: return
    val clipboard = context.getSystemService(ClipboardManager::class.java) ?: return
    val clip = ClipData.newPlainText("Erevos", code)
    if (Build.VERSION.SDK_INT >= 24) {
      clip.description.extras = PersistableBundle().apply {
        putBoolean(if (Build.VERSION.SDK_INT >= 33) ClipDescription.EXTRA_IS_SENSITIVE else "android.content.extra.IS_SENSITIVE", true)
      }
    }
    try {
      clipboard.setPrimaryClip(clip)
    } catch (_: Exception) {
      return
    }
    // Android 13 and later say themselves that something was copied.
    if (Build.VERSION.SDK_INT < 33) {
      val greek = context.getSharedPreferences("erevos-lang", Context.MODE_PRIVATE).getString("lang", null) == "el"
      Toast.makeText(context, if (greek) "Ο κωδικός αντιγράφηκε" else "The code is copied", Toast.LENGTH_SHORT).show()
    }
    SmsStore.clearNew(context)
  }

  companion object {
    const val EXTRA_CODE = "code"
  }
}
