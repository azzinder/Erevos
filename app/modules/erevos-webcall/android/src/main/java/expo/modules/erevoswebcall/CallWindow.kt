// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

package expo.modules.erevoswebcall

/**
 * Between Element Call's window (ElementCallActivity) and Erevos (ErevosWebCallModule): the window
 * that shows, if one does, and whom it tells what happens in it.
 */
internal object CallWindow {
  @Volatile
  var shown: ElementCallActivity? = null
    private set

  /** Told what the window says: "message" (one of the Widget API), "audio" (where the sound
   *  should go), "closed" (it went away without Erevos closing it). */
  @Volatile
  var told: ((kind: String, value: String) -> Unit)? = null

  fun opened(activity: ElementCallActivity) {
    val before = shown
    shown = activity
    // One call at a time: one opened over another ends that one.
    if (before != null && before !== activity) before.leave()
  }

  fun closed(activity: ElementCallActivity, byItself: Boolean) {
    if (shown !== activity) return
    shown = null
    if (byItself) tell("closed", "")
  }

  fun tell(kind: String, value: String) {
    runCatching { told?.invoke(kind, value) }
  }
}
