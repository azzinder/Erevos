// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

package expo.modules.erevoscall

import android.content.Context
import android.content.Intent
import android.os.Handler
import android.os.Looper

/** Erevos's widget on the home screen (modules/erevos-widget), told by its class name to count again. */
internal object Widget {
  /** Has the widget count again, `afterMs` from now: Android writes some changes a moment later. */
  fun refresh(context: Context, afterMs: Long = 0) {
    val app = context.applicationContext
    val intent = Intent("expo.modules.erevoswidget.REFRESH").setClassName(app.packageName, "expo.modules.erevoswidget.ErevosWidget")
    val send = Runnable { runCatching { app.sendBroadcast(intent) } }
    if (afterMs <= 0) send.run() else Handler(Looper.getMainLooper()).postDelayed(send, afterMs)
  }

  /** How many messages the messages notice counts now (Notices.kt), for the widget to show. */
  fun messages(context: Context, count: Int) {
    context.applicationContext.getSharedPreferences("erevos-widget", Context.MODE_PRIVATE).edit().putInt("messages", count).apply()
    refresh(context)
  }
}
