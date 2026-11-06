// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

package expo.modules.erevoscollection

import android.app.PendingIntent
import android.content.Intent
import android.os.Bundle
import androidx.annotation.OptIn
import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi
import androidx.media3.session.CommandButton
import androidx.media3.session.MediaSession
import androidx.media3.session.MediaSessionService
import androidx.media3.session.SessionCommand
import androidx.media3.session.SessionCommands
import androidx.media3.session.SessionResult
import com.google.common.collect.ImmutableList
import com.google.common.util.concurrent.Futures
import com.google.common.util.concurrent.ListenableFuture

/**
 * Keeps the Collection's list playing (Playing.kt) with the screen off and Erevos in the
 * background, as a media playback service in the foreground, and gives Android its media session:
 * the notice with play, pause, next, previous and Stop, the same on the lock screen, and a
 * headset's buttons. Media3 shows the notice and moves the service to the foreground while it
 * plays.
 *
 * Not exported. Every controller, Android's own included, may only play, pause, go to the next
 * or previous file of the list (ShownPlayer) and stop; and sees only the title Playing set: the
 * file's name when the owner chose it, otherwise a plain word. Stop does what Stop in Erevos does
 * (Playing.stop): the list ends, its keys are forgotten and the notice goes. Tapping the notice
 * opens Erevos, behind its password when the space is locked.
 */
@OptIn(UnstableApi::class)
class PlayerService : MediaSessionService() {
  private var session: MediaSession? = null

  private val callback = object : MediaSession.Callback {
    override fun onConnect(session: MediaSession, controller: MediaSession.ControllerInfo): MediaSession.ConnectionResult =
      MediaSession.ConnectionResult.accept(SessionCommands.Builder().add(STOP).build(), ShownPlayer.allowed())

    // The notice's Stop: on the main thread, where Media3 calls the session. Any other command
    // that is not Erevos' own is refused.
    override fun onCustomCommand(session: MediaSession, controller: MediaSession.ControllerInfo, customCommand: SessionCommand, args: Bundle): ListenableFuture<SessionResult> {
      if (customCommand.customAction != STOP_ACTION) return Futures.immediateFuture(SessionResult(SessionResult.RESULT_ERROR_NOT_SUPPORTED))
      Playing.stop(this@PlayerService)
      return Futures.immediateFuture(SessionResult(SessionResult.RESULT_SUCCESS))
    }
  }

  override fun onCreate() {
    super.onCreate()
    val player = Playing.player
    if (player == null) {
      stopSelf()
      return
    }
    // Stop sits after next in the notice, named in Erevos' language (Playing.stopLabel).
    val stop = CommandButton.Builder(CommandButton.ICON_STOP)
      .setDisplayName(Playing.stopLabel.ifEmpty { "Stop" })
      .setSessionCommand(STOP)
      .build()
    val builder = MediaSession.Builder(this, ShownPlayer(player))
      .setId("erevos-collection")
      .setCallback(callback)
      .setMediaButtonPreferences(ImmutableList.of(stop))
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

  companion object {
    /** The notice's Stop, a command of Erevos' own that only this session knows. */
    private const val STOP_ACTION = "expo.modules.erevoscollection.STOP"
    private val STOP = SessionCommand(STOP_ACTION, Bundle.EMPTY)
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
