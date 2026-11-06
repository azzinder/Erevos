// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

package expo.modules.erevoscollection

import android.app.PendingIntent
import android.content.Intent
import androidx.annotation.OptIn
import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi
import androidx.media3.session.MediaSession
import androidx.media3.session.MediaSessionService
import androidx.media3.session.SessionCommands

/**
 * Keeps the Collection's list playing (Playing.kt) with the screen off and Erevos in the
 * background, as a media playback service in the foreground, and gives Android its media session:
 * the notice with play, pause, next and previous, the same on the lock screen, and a headset's
 * buttons. Media3 shows the notice and moves the service to the foreground while it plays.
 *
 * Not exported. Every controller, Android's own included, may only play, pause and go to the next
 * or previous file of the list (ShownPlayer), and sees only the title Playing set: the file's name
 * when the owner chose it, otherwise a plain word. Tapping the notice opens Erevos, behind its
 * password when the space is locked.
 */
@OptIn(UnstableApi::class)
class PlayerService : MediaSessionService() {
  private var session: MediaSession? = null

  private val callback = object : MediaSession.Callback {
    override fun onConnect(session: MediaSession, controller: MediaSession.ControllerInfo): MediaSession.ConnectionResult =
      MediaSession.ConnectionResult.accept(SessionCommands.Builder().build(), ShownPlayer.allowed())
  }

  override fun onCreate() {
    super.onCreate()
    val player = Playing.player
    if (player == null) {
      stopSelf()
      return
    }
    val builder = MediaSession.Builder(this, ShownPlayer(player)).setId("erevos-collection").setCallback(callback)
    packageManager.getLaunchIntentForPackage(packageName)?.let { open ->
      builder.setSessionActivity(PendingIntent.getActivity(this, 0, open, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT))
    }
    session = builder.build().also { addSession(it) }
    Playing.service = this
  }

  /** A new list plays: the session goes on with its player. */
  fun usePlayer(player: Player) {
    session?.player = ShownPlayer(player)
  }

  override fun onGetSession(controllerInfo: MediaSession.ControllerInfo): MediaSession? = session

  // Erevos swiped away from the recent apps: a list that plays goes on; one paused or done stops.
  override fun onTaskRemoved(rootIntent: Intent?) {
    val player = Playing.player
    if (player == null || !player.playWhenReady || player.mediaItemCount == 0) Playing.stop(this)
  }

  override fun onDestroy() {
    session?.let {
      removeSession(it)
      it.release()
    }
    session = null
    // Android ended the service, not stop(): the list stops with it, and its keys go.
    if (Playing.service === this) Playing.stop(this, fromService = true)
    super.onDestroy()
  }
}
