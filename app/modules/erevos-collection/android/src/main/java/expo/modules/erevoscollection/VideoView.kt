// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

package expo.modules.erevoscollection

import android.content.Context
import android.view.SurfaceView
import android.view.ViewGroup
import androidx.annotation.OptIn
import androidx.media3.common.util.UnstableApi
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.ui.PlayerView
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.views.ExpoView

/**
 * The video of the list playing (Playing.kt), shown inside Erevos over the whole screen by
 * components/collection-video.tsx, with Media3's own controls: play, pause, the time bar, next
 * and previous. It shows whatever the player plays, and nothing once the list stops.
 *
 * The Collection's screen keeps Erevos's window out of screenshots (FLAG_SECURE); the video is
 * drawn on a surface of its own, which is marked secure as well, so it cannot be captured either.
 */
@OptIn(UnstableApi::class)
class VideoView(context: Context, appContext: AppContext) : ExpoView(context, appContext) {
  override val shouldUseAndroidLayout = true

  private val view = PlayerView(context).apply {
    useController = true
    setShowNextButton(true)
    setShowPreviousButton(true)
    (videoSurfaceView as? SurfaceView)?.setSecure(true)
  }

  private val follow: (ExoPlayer?) -> Unit = { player -> view.player = player }

  init {
    addView(view, LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT))
  }

  override fun onAttachedToWindow() {
    super.onAttachedToWindow()
    Playing.onPlayer.add(follow)
    view.player = Playing.player
  }

  override fun onDetachedFromWindow() {
    Playing.onPlayer.remove(follow)
    view.player = null
    super.onDetachedFromWindow()
  }
}
