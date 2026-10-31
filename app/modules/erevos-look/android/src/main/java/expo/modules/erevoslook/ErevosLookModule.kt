// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

package expo.modules.erevoslook

import android.content.Context
import android.os.Build
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

// The phone's own colours, for the Material You style (theme/colors.ts materialColors). Android 12
// and later make five palettes of 13 tones from the wallpaper, which any app may read as colour
// resources; older Android has none, and the style is not offered there. Nothing leaves the phone.
class ErevosLookModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ErevosLook")

    // Each palette's tones as #RRGGBB, lightest first, or null before Android 12. Read again each
    // time: a new wallpaper changes them while Erevos runs.
    Function("systemColors") {
      val context: Context? = appContext.currentActivity ?: appContext.reactContext
      if (context == null || Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
        null
      } else {
        PALETTES.mapValues { (_, tones) -> tones.map { id -> String.format("#%06X", context.getColor(id) and 0xFFFFFF) } }
      }
    }
  }
}

// Android's system_<palette>_<tone> colours, tones 0 (white), 10, 50, 100 … 900 and 1000 (black).
private val PALETTES = mapOf(
  "accent1" to listOf(
    android.R.color.system_accent1_0, android.R.color.system_accent1_10, android.R.color.system_accent1_50,
    android.R.color.system_accent1_100, android.R.color.system_accent1_200, android.R.color.system_accent1_300,
    android.R.color.system_accent1_400, android.R.color.system_accent1_500, android.R.color.system_accent1_600,
    android.R.color.system_accent1_700, android.R.color.system_accent1_800, android.R.color.system_accent1_900,
    android.R.color.system_accent1_1000,
  ),
  "accent2" to listOf(
    android.R.color.system_accent2_0, android.R.color.system_accent2_10, android.R.color.system_accent2_50,
    android.R.color.system_accent2_100, android.R.color.system_accent2_200, android.R.color.system_accent2_300,
    android.R.color.system_accent2_400, android.R.color.system_accent2_500, android.R.color.system_accent2_600,
    android.R.color.system_accent2_700, android.R.color.system_accent2_800, android.R.color.system_accent2_900,
    android.R.color.system_accent2_1000,
  ),
  "accent3" to listOf(
    android.R.color.system_accent3_0, android.R.color.system_accent3_10, android.R.color.system_accent3_50,
    android.R.color.system_accent3_100, android.R.color.system_accent3_200, android.R.color.system_accent3_300,
    android.R.color.system_accent3_400, android.R.color.system_accent3_500, android.R.color.system_accent3_600,
    android.R.color.system_accent3_700, android.R.color.system_accent3_800, android.R.color.system_accent3_900,
    android.R.color.system_accent3_1000,
  ),
  "neutral1" to listOf(
    android.R.color.system_neutral1_0, android.R.color.system_neutral1_10, android.R.color.system_neutral1_50,
    android.R.color.system_neutral1_100, android.R.color.system_neutral1_200, android.R.color.system_neutral1_300,
    android.R.color.system_neutral1_400, android.R.color.system_neutral1_500, android.R.color.system_neutral1_600,
    android.R.color.system_neutral1_700, android.R.color.system_neutral1_800, android.R.color.system_neutral1_900,
    android.R.color.system_neutral1_1000,
  ),
  "neutral2" to listOf(
    android.R.color.system_neutral2_0, android.R.color.system_neutral2_10, android.R.color.system_neutral2_50,
    android.R.color.system_neutral2_100, android.R.color.system_neutral2_200, android.R.color.system_neutral2_300,
    android.R.color.system_neutral2_400, android.R.color.system_neutral2_500, android.R.color.system_neutral2_600,
    android.R.color.system_neutral2_700, android.R.color.system_neutral2_800, android.R.color.system_neutral2_900,
    android.R.color.system_neutral2_1000,
  ),
)
