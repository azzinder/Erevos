// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

package expo.modules.erevosphone

import android.content.Context

/** The call screen's and notices' words in the app's language, as the app last set it for the
 *  call module (erevos-call Notices.kt): Greek for "el", English otherwise. They show while
 *  Erevos is closed or locked, so they cannot come from the app's own words. */
internal object Words {
  fun greek(context: Context) =
    context.getSharedPreferences("erevos-lang", Context.MODE_PRIVATE).getString("lang", null) == "el"

  fun say(context: Context, en: String, el: String) = if (greek(context)) el else en
}
