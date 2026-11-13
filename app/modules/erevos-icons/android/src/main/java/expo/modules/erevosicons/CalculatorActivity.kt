// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

package expo.modules.erevosicons

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.content.res.Configuration
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.text.TextPaint
import android.text.TextUtils
import android.util.TypedValue
import android.view.Gravity
import android.view.HapticFeedbackConstants
import android.view.View
import android.view.ViewGroup
import android.view.WindowInsets
import android.view.WindowInsetsController
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import java.math.BigDecimal
import java.math.MathContext
import java.math.RoundingMode
import java.security.MessageDigest
import java.security.SecureRandom

// A calculator that works, shown in the phone's apps in place of Erevos's own icon when the owner
// chooses it (Appearance → Launcher icons, Calculator.kt). It adds, takes away, multiplies and
// divides, as a pocket calculator does, one step after another. The code the owner chose, typed on
// its own and followed by =, opens Erevos, which then asks for its password as always; any other
// sum is only a sum. It is a task of its own (its own taskAffinity in the manifest), so its icon
// never brings Erevos to the front, and it keeps nothing it is given.
class CalculatorActivity : Activity() {
  private lateinit var display: TextView
  private lateinit var above: TextView

  // What the display shows; the number kept while an operation waits for the next one.
  private var entry = "0"
  private var kept: BigDecimal? = null
  private var operation: Char? = null
  // The next digit starts a new number: after an operation, =, or a clear.
  private var fresh = true
  private var failed = false

  override fun onCreate(savedInstanceState: Bundle?) {
    val night = (resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES
    setTheme(if (night) android.R.style.Theme_Material_NoActionBar else android.R.style.Theme_Material_Light_NoActionBar)
    super.onCreate(savedInstanceState)
    // No code kept: Erevos's data was wiped (the panic password, or Android's Clear storage), while
    // Android keeps which icons are on. No code could open Erevos any more: its own icon comes back
    // in place of the calculator, and Erevos opens, as new.
    if (!Calculator.hasCode(this)) {
      calculatorOff(this)
      launchErevos()
      return
    }
    val look = Look(night)
    setContentView(layout(look).also(::keepClearOfBars))
    bars(night, look)
    show()
  }

  // The phone's bars over the calculator's own ground, their icons dark on the light one. Only
  // once the window has its content: before it, the window has no decor view yet, and asking it
  // for its insets controller stops the calculator as it opens (Android 17 on the Pixel).
  @Suppress("DEPRECATION")
  private fun bars(night: Boolean, look: Look) {
    window.statusBarColor = look.ground
    window.navigationBarColor = look.ground
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
      val light = WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS or WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS
      window.insetsController?.setSystemBarsAppearance(if (night) 0 else light, light)
    } else if (!night && Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      window.decorView.systemUiVisibility = View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR or View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR
    }
  }

  // Where Android draws the calculator under its bars (from Android 15), the keys stay above them.
  @Suppress("DEPRECATION")
  private fun keepClearOfBars(view: View) {
    val left = view.paddingLeft
    val top = view.paddingTop
    val right = view.paddingRight
    val bottom = view.paddingBottom
    view.setOnApplyWindowInsetsListener { v, insets ->
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
        val bars = insets.getInsets(WindowInsets.Type.systemBars() or WindowInsets.Type.displayCutout())
        v.setPadding(left + bars.left, top + bars.top, right + bars.right, bottom + bars.bottom)
      } else {
        v.setPadding(left + insets.systemWindowInsetLeft, top + insets.systemWindowInsetTop, right + insets.systemWindowInsetRight, bottom + insets.systemWindowInsetBottom)
      }
      insets
    }
  }

  // The display above, the keys below, five rows of four.
  private fun layout(look: Look): View {
    val column = LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL
      setBackgroundColor(look.ground)
      setPadding(dp(12), dp(24), dp(12), dp(16))
    }
    // A long number gets smaller to fit, so that its first digits always show; only past the
    // smallest size are its last ones cut (in portrait, 0.333… once hid its start).
    above = TextView(this).apply {
      setTextColor(look.faint)
      setTextSize(TypedValue.COMPLEX_UNIT_SP, ABOVE_SP)
      gravity = Gravity.END or Gravity.BOTTOM
      maxLines = 1
      ellipsize = TextUtils.TruncateAt.END
      setPadding(dp(12), 0, dp(12), 0)
      addOnLayoutChangeListener(refit)
    }
    display = TextView(this).apply {
      setTextColor(look.text)
      setTextSize(TypedValue.COMPLEX_UNIT_SP, DISPLAY_SP)
      typeface = Typeface.create("sans-serif-light", Typeface.NORMAL)
      gravity = Gravity.END or Gravity.BOTTOM
      maxLines = 1
      ellipsize = TextUtils.TruncateAt.END
      setPadding(dp(12), 0, dp(12), dp(12))
      addOnLayoutChangeListener(refit)
    }
    column.addView(View(this), LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f))
    column.addView(above, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT))
    column.addView(display, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT))
    val rows = listOf(
      listOf("C", "⌫", "%", "÷"),
      listOf("7", "8", "9", "×"),
      listOf("4", "5", "6", "−"),
      listOf("1", "2", "3", "+"),
      listOf("±", "0", ".", "="),
    )
    val keys = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
    for (row in rows) {
      val line = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL }
      for (key in row) line.addView(keyOf(key, look), LinearLayout.LayoutParams(0, dp(72), 1f).apply { setMargins(dp(4), dp(4), dp(4), dp(4)) })
      keys.addView(line, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT))
    }
    column.addView(keys, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT))
    return column
  }

  private fun keyOf(key: String, look: Look): Button {
    val operator = key in OPERATORS || key == "="
    val top = key == "C" || key == "⌫" || key == "%"
    return Button(this).apply {
      text = key
      isAllCaps = false
      stateListAnimator = null
      setTextSize(TypedValue.COMPLEX_UNIT_SP, 26f)
      setTextColor(if (operator) Color.WHITE else look.text)
      background = GradientDrawable().apply {
        cornerRadius = dp(36).toFloat()
        setColor(if (operator) look.accent else if (top) look.top else look.key)
      }
      contentDescription = SPOKEN[key] ?: key
      setOnClickListener {
        it.performHapticFeedback(HapticFeedbackConstants.KEYBOARD_TAP)
        press(key)
      }
    }
  }

  private fun press(key: String) {
    if (failed && key != "C") clear()
    when (key) {
      "C" -> clear()
      "⌫" -> if (!fresh) entry = entry.dropLast(1).let { if (it.isEmpty() || it == "-") "0" else it }
      "%" -> number()?.let { set(it.divide(HUNDRED, MATH)) }
      "±" -> entry = if (entry.startsWith("-")) entry.drop(1) else if (entry == "0") entry else "-$entry"
      "." -> {
        if (fresh) { entry = "0."; fresh = false } else if (!entry.contains('.')) entry += "."
      }
      "=" -> equals()
      in OPERATORS -> operate(key[0])
      else -> digit(key)
    }
    show()
  }

  private fun digit(d: String) {
    if (fresh) {
      entry = d
      fresh = false
      return
    }
    if (entry.count { it.isDigit() } >= MOST_DIGITS) return
    entry = if (entry == "0") d else if (entry == "-0") "-$d" else entry + d
  }

  private fun operate(next: Char) {
    val now = number() ?: return
    val before = kept
    val waiting = operation
    if (before != null && waiting != null && !fresh) {
      val result = apply(before, waiting, now) ?: return fail()
      kept = result
      set(result)
    } else if (before == null || waiting == null || !fresh) {
      kept = now
    }
    operation = next
    fresh = true
  }

  private fun equals() {
    val before = kept
    val waiting = operation
    if (waiting == null || before == null) {
      // A number typed on its own, then =: Erevos's code opens Erevos.
      if (!fresh && Calculator.isCode(this, entry)) return openErevos()
      fresh = true
      return
    }
    val now = number() ?: return
    val result = apply(before, waiting, now) ?: return fail()
    kept = null
    operation = null
    set(result)
    fresh = true
  }

  private fun apply(a: BigDecimal, op: Char, b: BigDecimal): BigDecimal? = when (op) {
    '+' -> a.add(b, MATH)
    '−' -> a.subtract(b, MATH)
    '×' -> a.multiply(b, MATH)
    '÷' -> if (b.signum() == 0) null else a.divide(b, MATH)
    else -> null
  }

  private fun number(): BigDecimal? = runCatching { BigDecimal(entry.trimEnd('.').ifEmpty { "0" }) }.getOrNull()

  private fun set(value: BigDecimal) {
    val rounded = value.round(MATH)
    val plain = rounded.stripTrailingZeros()
    entry = if (plain.signum() == 0) "0" else if (plain.precision() - plain.scale() > MOST_DIGITS) rounded.toString() else plain.toPlainString()
  }

  private fun fail() {
    failed = true
    kept = null
    operation = null
    fresh = true
  }

  private fun clear() {
    entry = "0"
    kept = null
    operation = null
    fresh = true
    failed = false
  }

  private fun show() {
    display.text = if (failed) getString(R.string.erevos_calculator_error) else entry
    val before = kept
    val waiting = operation
    above.text = if (before != null && waiting != null) "${shown(before)} $waiting" else ""
    fit()
  }

  // The text of the display and of the line above it, as large as fits their width, at most their
  // own size and at least SMALLEST_SP.
  private fun fit() {
    fit(display, DISPLAY_SP)
    fit(above, ABOVE_SP)
  }

  private fun fit(view: TextView, largest: Float) {
    val room = view.width - view.paddingLeft - view.paddingRight
    if (room <= 0) return
    val text = view.text.toString()
    val paint = TextPaint(view.paint)
    var size = largest
    while (size > SMALLEST_SP) {
      paint.textSize = TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_SP, size, resources.displayMetrics)
      if (paint.measureText(text) <= room) break
      size = maxOf(SMALLEST_SP, size - 2f)
    }
    view.setTextSize(TypedValue.COMPLEX_UNIT_SP, size)
  }

  // When the display's width changes (it is laid out, or the phone turns), its text fits again.
  private val refit = View.OnLayoutChangeListener { view, left, _, right, _, oldLeft, _, oldRight, _ ->
    if (right - left != oldRight - oldLeft) view.post { fit() }
  }

  private fun shown(value: BigDecimal): String = value.stripTrailingZeros().let { if (it.signum() == 0) "0" else it.toPlainString() }

  // Erevos, at its chats, in a task of its own; this one goes, with nothing kept of what was typed.
  private fun openErevos() {
    clear()
    show()
    launchErevos()
  }

  private fun launchErevos() {
    val open = packageManager.getLaunchIntentForPackage(packageName)?.apply {
      action = Intent.ACTION_VIEW
      data = Uri.parse("erevos://?show=erevos&from=launcher")
      categories?.toList()?.forEach { removeCategory(it) }
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    } ?: return
    startActivity(open)
    finishAndRemoveTask()
  }

  private fun dp(value: Int): Int = (value * resources.displayMetrics.density).toInt()

  private class Look(night: Boolean) {
    val ground = if (night) Color.rgb(16, 16, 18) else Color.rgb(246, 246, 248)
    val text = if (night) Color.WHITE else Color.rgb(20, 20, 22)
    val faint = if (night) Color.rgb(150, 150, 156) else Color.rgb(110, 110, 116)
    val key = if (night) Color.rgb(44, 44, 48) else Color.WHITE
    val top = if (night) Color.rgb(80, 80, 86) else Color.rgb(222, 222, 228)
    val accent = Color.rgb(242, 140, 40)
  }

  companion object {
    private val OPERATORS = setOf("+", "−", "×", "÷")
    private val SPOKEN = mapOf("−" to "-", "×" to "*", "÷" to "/", "⌫" to "⌫", "±" to "±")
    private val MATH = MathContext(15, RoundingMode.HALF_EVEN)
    private val HUNDRED = BigDecimal(100)
    private const val MOST_DIGITS = 15
    private const val DISPLAY_SP = 56f
    private const val ABOVE_SP = 22f
    private const val SMALLEST_SP = 18f
  }
}

// The calculator's place among the phone's apps, and the code that opens Erevos from it. The code
// is kept only as SHA-256 of it with a random salt, in Erevos's own storage on the phone: it is a
// door, not the lock, as Erevos still asks for its password behind it.
object Calculator {
  private const val PREFS = "erevos-calculator"
  private const val SALT = "salt"
  private const val HASH = "hash"
  // The colour of Erevos's own icon while the calculator stands in its place, for when it comes back.
  const val EREVOS_COLOR = "erevos-color"

  fun prefs(context: Context) = context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  fun component(context: Context) = android.content.ComponentName(context.packageName, "expo.modules.erevosicons.CalculatorIcon")

  fun isOn(context: Context): Boolean =
    context.packageManager.getComponentEnabledSetting(component(context)) == android.content.pm.PackageManager.COMPONENT_ENABLED_STATE_ENABLED

  fun setCode(context: Context, code: String) {
    val salt = ByteArray(16).also { SecureRandom().nextBytes(it) }
    prefs(context).edit().putString(SALT, hex(salt)).putString(HASH, hex(hashOf(salt, code))).apply()
  }

  fun hasCode(context: Context): Boolean = prefs(context).getString(HASH, null) != null

  fun forgetCode(context: Context) {
    prefs(context).edit().remove(SALT).remove(HASH).apply()
  }

  fun isCode(context: Context, typed: String): Boolean {
    if (!isOn(context)) return false
    val prefs = prefs(context)
    val salt = prefs.getString(SALT, null) ?: return false
    val hash = prefs.getString(HASH, null) ?: return false
    return MessageDigest.isEqual(hashOf(unhex(salt), typed), unhex(hash))
  }

  private fun hashOf(salt: ByteArray, code: String): ByteArray =
    MessageDigest.getInstance("SHA-256").run {
      update(salt)
      digest(code.toByteArray(Charsets.UTF_8))
    }

  private fun hex(bytes: ByteArray): String = bytes.joinToString("") { "%02x".format(it) }

  private fun unhex(text: String): ByteArray = ByteArray(text.length / 2) { text.substring(it * 2, it * 2 + 2).toInt(16).toByte() }
}
