// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

package expo.modules.erevoswidget

import android.app.NotificationManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle

/**
 * The number on each of Erevos's launcher icons, on the launchers that take one for each icon:
 * Huawei's and Honor's, told it with the name of the icon's activity (their change_badge), which
 * they show on that icon only and never count from notices themselves. Erevos's own icon has the
 * messages its notice counts (erevos-call Notices.kt), SMS's the SMS and MMS not read, Phone's the
 * missed calls Android's call history marks new, Contacts's a birthday its notice tells of today
 * (erevos-contacts Birthdays.kt); an icon that is off (another colour, or Erevos's own while the
 * calculator stands in its place) has none, and so has the calculator. Counted again whenever the
 * widget is (ErevosWidget.refreshAll), with or without a widget on the home screen.
 *
 * Every other launcher known gives a notice's dot or number to the app, not to one of its icons:
 * Android's own (Launcher3: Pixel, GrapheneOS, LineageOS) looks a notice up by its package, as
 * Kvaesitso does, and Samsung's and Xiaomi's count an app's notices. There every notice of Erevos
 * shows on all four icons alike, and nothing Erevos can tell them changes it.
 *
 * Told only to the phone's own launcher (a system app), while it is the one in use, so no other app
 * learns the counts, which that launcher sees in the notices anyway. With Number on the icon turned
 * off (lib/icon-number.ts), every icon has none.
 */
internal object IconNumbers {
  /** Where Number on the icon is kept, as the app last told it (setOn): on unless turned off. */
  private const val ON = "icon-numbers"
  /** What each icon was told last, by launcher and activity: in preferences of their own. */
  private const val SENT = "erevos-icon-numbers"
  // The birthday notice's id (erevos-contacts Birthdays.kt).
  private const val BIRTHDAY_NOTICE = 7401

  private class Launcher(val name: String, val authority: String)

  private val LAUNCHERS = listOf(
    Launcher("com.huawei.android.launcher", "com.huawei.android.launcher.settings"),
    Launcher("com.hihonor.android.launcher", "com.hihonor.android.launcher.settings"),
  )

  // The activities each part of Erevos opens, which its icons' aliases start.
  private val PARTS = mapOf(
    "expo.modules.erevosphone.PhoneOpenActivity" to "phone",
    "expo.modules.erevossms.SmsOpenActivity" to "sms",
    "expo.modules.erevoscontacts.ContactsOpenActivity" to "contacts",
  )

  // Each icon is told once more after Erevos starts, in case the launcher forgot it meanwhile.
  @Volatile private var told = false

  /** Number on the icon turned on or off: kept, and the icons told at once. */
  fun setOn(context: Context, on: Boolean) {
    context.getSharedPreferences(ErevosWidget.PREFS, Context.MODE_PRIVATE).edit().putBoolean(ON, on).apply()
    update(context)
  }

  /** Tells the launcher each icon's number, if it takes one for each icon; else does nothing. One at a
   *  time: the app's thread (setOn) and the main one (a REFRESH) may both ask. */
  @Synchronized
  fun update(context: Context) {
    val app = context.applicationContext
    val launcher = launcher(app) ?: return
    val on = app.getSharedPreferences(ErevosWidget.PREFS, Context.MODE_PRIVATE).getBoolean(ON, true)
    val numbers = if (on) ErevosWidget.counts(app) + ("contacts" to birthday(app)) else emptyMap()
    val sent = app.getSharedPreferences(SENT, Context.MODE_PRIVATE)
    val kept = sent.edit()
    val again = !told
    for ((activity, part) in icons(app)) {
      val number = part?.let { numbers[it] } ?: 0
      val key = "${launcher.name}/$activity"
      if (number == sent.getInt(key, 0) && !(again && part != null)) continue
      if (tell(app, launcher, activity, number)) kept.putInt(key, number)
    }
    kept.apply()
    told = true
  }

  /** The launcher in use, if it takes a number for each icon and is the phone's own. */
  private fun launcher(context: Context): Launcher? {
    val packages = context.packageManager
    val home = runCatching {
      packages.resolveActivity(Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME), PackageManager.MATCH_DEFAULT_ONLY)?.activityInfo?.packageName
    }.getOrNull() ?: return null
    val launcher = LAUNCHERS.firstOrNull { it.name == home } ?: return null
    val provider = runCatching { packages.resolveContentProvider(launcher.authority, 0) }.getOrNull() ?: return null
    val system = (provider.applicationInfo?.flags ?: 0) and ApplicationInfo.FLAG_SYSTEM != 0
    return if (provider.packageName == launcher.name && system) launcher else null
  }

  /** Every launcher icon of Erevos, on or off, by its activity's name, with the part it opens while it is on. */
  private fun icons(context: Context): List<Pair<String, String?>> {
    val packages = context.packageManager
    val query = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER).setPackage(context.packageName)
    @Suppress("DEPRECATION")
    val all = runCatching {
      packages.queryIntentActivities(query, if (Build.VERSION.SDK_INT >= 24) PackageManager.MATCH_DISABLED_COMPONENTS else PackageManager.GET_DISABLED_COMPONENTS)
    }.getOrDefault(emptyList())
    return all.mapNotNull { it.activityInfo }.distinctBy { it.name }.map { info ->
      val on = when (packages.getComponentEnabledSetting(ComponentName(context.packageName, info.name))) {
        PackageManager.COMPONENT_ENABLED_STATE_ENABLED -> true
        PackageManager.COMPONENT_ENABLED_STATE_DEFAULT -> info.enabled
        else -> false
      }
      val target = info.targetActivity ?: info.name
      val part = if (target.endsWith(".MainActivity")) "messages" else PARTS[target]
      info.name to part?.takeIf { on }
    }
  }

  /** 1 while the notice of a birthday today shows. */
  private fun birthday(context: Context): Int {
    if (Build.VERSION.SDK_INT < 23) return 0
    val manager = context.getSystemService(NotificationManager::class.java) ?: return 0
    return runCatching { if (manager.activeNotifications.any { it.id == BIRTHDAY_NOTICE }) 1 else 0 }.getOrDefault(0)
  }

  private fun tell(context: Context, launcher: Launcher, activity: String, number: Int): Boolean =
    runCatching {
      val extras = Bundle().apply {
        putString("package", context.packageName)
        putString("class", activity)
        putInt("badgenumber", number)
      }
      context.contentResolver.call(Uri.parse("content://${launcher.authority}/badge/"), "change_badge", null, extras)
      true
    }.getOrDefault(false)
}
