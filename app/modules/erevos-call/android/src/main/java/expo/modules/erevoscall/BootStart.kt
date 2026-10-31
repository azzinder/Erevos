// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

package expo.modules.erevoscall

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import com.facebook.react.ReactApplication
import com.facebook.react.ReactInstanceEventListener
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactContext
import com.facebook.react.bridge.UiThreadUtil
import com.facebook.react.jstasks.HeadlessJsTaskConfig
import com.facebook.react.jstasks.HeadlessJsTaskContext

// Erevos starts by itself as the phone turns on, or after it is updated, when the owner chose it
// (Settings → Notifications → In the background, lib/background.ts). No space is open then, and
// none can be: their keys come only from their passwords. So it starts the receiving service
// (ReceiveService, with its own quiet notice) and, in it, the app's code with no screen, a task
// that waits only for the closed spaces that asked to say a message came while closed, as it does
// while another space is open (lib/closed-notices.ts), until a space opens. The choice is the
// phone's, kept here, as it is read before anything of Erevos runs.
object BootStart {
  private const val TAG = "ErevosBoot"
  private const val PREFS = "erevos-boot"
  private const val ON = "on"
  /** The app's task (lib/background.ts startBootNotices, registered in index.js). */
  private const val TASK = "ErevosBoot"

  private fun prefs(context: Context) = context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  fun on(context: Context): Boolean = prefs(context).getBoolean(ON, false)

  fun set(context: Context, on: Boolean) {
    prefs(context).edit().putBoolean(ON, on).apply()
  }

  // From ReceiveService, once it shows its notice: the app's code, started if it is not running yet
  // (no screen of Erevos was opened since the phone started), then its task.
  fun startTask(service: android.app.Service) {
    val host = (service.application as? ReactApplication)?.reactHost ?: return
    val run = { react: ReactContext ->
      UiThreadUtil.runOnUiThread {
        runCatching { HeadlessJsTaskContext.getInstance(react).startTask(HeadlessJsTaskConfig(TASK, Arguments.createMap(), 0, true)) }
          .onFailure { Log.i(TAG, "The task did not start") }
      }
    }
    UiThreadUtil.runOnUiThread {
      val running = host.currentReactContext
      if (running != null) {
        run(running)
        return@runOnUiThread
      }
      host.addReactInstanceEventListener(
        object : ReactInstanceEventListener {
          override fun onReactContextInitialized(context: ReactContext) {
            host.removeReactInstanceEventListener(this)
            run(context)
          }
        },
      )
      host.start()
    }
  }
}

/** The phone turned on, or Erevos was updated: Erevos starts by itself, when the owner chose it. */
class BootReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action != Intent.ACTION_BOOT_COMPLETED && intent.action != Intent.ACTION_MY_PACKAGE_REPLACED) return
    if (!BootStart.on(context)) return
    runCatching { ReceiveService.startAtBoot(context) }.onFailure { Log.i("ErevosBoot", "Android did not let it start") }
  }
}
