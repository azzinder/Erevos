// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

package expo.modules.erevoscollection

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Handler
import android.os.Looper
import androidx.annotation.OptIn
import androidx.media3.common.AudioAttributes
import androidx.media3.common.C
import androidx.media3.common.ForwardingPlayer
import androidx.media3.common.MediaItem
import androidx.media3.common.MediaMetadata
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi
import androidx.media3.datasource.BaseDataSource
import androidx.media3.datasource.DataSource
import androidx.media3.datasource.DataSourceException
import androidx.media3.datasource.DataSpec
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.source.ProgressiveMediaSource
import java.io.File
import java.io.FileNotFoundException
import java.security.SecureRandom
import java.util.concurrent.ConcurrentHashMap

/**
 * Music and videos of the Collection played inside Erevos (AndroidX Media3's ExoPlayer), read
 * straight from their encrypted chunks (SealedDataSource below, through SealedFile.kt), with no
 * plain copy anywhere. Seeking reads only the chunks it lands in.
 *
 * One list plays at a time: the files JavaScript gave (playList), each by a random token in a link
 * of its own scheme (erevos-play://<token>), which only this player reads. Their keys are the only
 * ones kept, in memory, for as long as the list plays: stop() forgets them, and so does the panic
 * button. As the owner chose, the list goes on after the space locks, unless he turned on Stop
 * playing when the space locks (stopOnLock); with the screen off or the space locked only play,
 * pause, next and previous within the list work, from the notice and the lock screen
 * (PlayerService.kt, ShownPlayer), and Stop, which ends the list as stop() does.
 *
 * The notice and the lock screen show the file's name only when the owner turned that on
 * (showTitle); otherwise a plain word JavaScript gives (`neutral`). What a file says of itself
 * inside (a song's tags, its cover) is never shown there: ShownPlayer passes on only what is set
 * here.
 *
 * Everything here runs on the main thread, as ExoPlayer wants; only SealedDataSource runs on the
 * player's own loading thread.
 */
@OptIn(UnstableApi::class)
internal object Playing {
  class Item(val file: SealedFile, val name: String, val mime: String, val video: Boolean)

  private const val SCHEME = "erevos-play"
  private val main = Handler(Looper.getMainLooper())
  private val random = SecureRandom()

  // The files of the list playing, by token: read by SealedDataSource on the loading thread.
  private val files = ConcurrentHashMap<String, SealedFile>()
  private var items: List<Item> = emptyList()

  var player: ExoPlayer? = null
    private set
  private var app: Context? = null

  /** Whether the list stops when the space locks (the owner's setting, told with playList). */
  @Volatile var stopOnLock = false

  /** The word on the notice's Stop, in Erevos' language (told with playList). */
  @Volatile var stopLabel = ""

  /** Told the state whenever it changes, on the main thread: the module's event. */
  var onState: ((Map<String, Any?>) -> Unit)? = null

  /** Told when the player is made or goes, for the video view. */
  val onPlayer = mutableSetOf<(ExoPlayer?) -> Unit>()

  private val listener = object : Player.Listener {
    override fun onEvents(player: Player, events: Player.Events) {
      tell()
    }

    override fun onPlayerError(error: PlaybackException) {
      // A damaged chunk or a key forgotten: this file cannot play; the next one is tried.
      val p = player ?: return
      if (p.hasNextMediaItem()) {
        p.seekToNextMediaItem()
        p.prepare()
        p.play()
      }
      tell(error.errorCodeName)
    }
  }

  /**
   * Plays `list` from `start`. A list playing before stops first, and its keys go. `neutral` is
   * what the notice shows for a file when its name is not to be shown.
   */
  fun play(context: Context, list: List<Item>, start: Int, showTitle: Boolean, neutral: String) {
    if (list.isEmpty()) {
      stop(context)
      return
    }
    val appContext = context.applicationContext
    val before = player
    val beforeItems = items
    val beforeTokens = files.keys.toList()
    app = appContext
    items = list
    val folder = appContext.filesDir
    val mediaItems = list.mapIndexed { index, item ->
      val token = ByteArray(16).also(random::nextBytes).joinToString("") { "%02x".format(it) }
      files[token] = item.file
      val title = if (showTitle) item.name else neutral
      MediaItem.Builder()
        .setMediaId(index.toString())
        .setUri(Uri.Builder().scheme(SCHEME).authority(token).build())
        .setMediaMetadata(MediaMetadata.Builder().setTitle(title).setDisplayTitle(title).build())
        .build()
    }
    val video = list.any { it.video }
    val made = ExoPlayer.Builder(appContext)
      .setMediaSourceFactory(ProgressiveMediaSource.Factory(DataSource.Factory { SealedDataSource(folder) }))
      .setAudioAttributes(
        AudioAttributes.Builder().setUsage(C.USAGE_MEDIA).setContentType(if (video) C.AUDIO_CONTENT_TYPE_MOVIE else C.AUDIO_CONTENT_TYPE_MUSIC).build(),
        true,
      )
      .setHandleAudioBecomingNoisy(true)
      .setWakeMode(C.WAKE_MODE_LOCAL)
      .build()
    made.addListener(listener)
    made.setMediaItems(mediaItems, start.coerceIn(0, mediaItems.size - 1), 0L)
    player = made
    // The service shows the notice and answers the lock screen: the one running takes the new
    // player; otherwise it starts, while Erevos shows.
    val running = service
    if (running != null) running.usePlayer(made) else runCatching { appContext.startService(Intent(appContext, PlayerService::class.java)) }
    onPlayer.toList().forEach { it(made) }
    // The list before goes only now, so the session never holds a player already let go of.
    if (before != null) release(before)
    for (token in beforeTokens) files.remove(token)?.close()
    for (item in beforeItems) item.file.close()
    made.prepare()
    made.play()
    tell()
  }

  fun pause() {
    player?.pause()
  }

  fun resume() {
    val p = player ?: return
    if (p.playbackState == Player.STATE_ENDED) p.seekTo(p.currentMediaItemIndex, 0L)
    if (p.playbackState == Player.STATE_IDLE) p.prepare()
    p.play()
  }

  fun next() {
    val p = player ?: return
    if (p.hasNextMediaItem()) p.seekToNextMediaItem()
  }

  fun previous() {
    player?.seekToPrevious()
  }

  /** To `index` in the list (or -1 for the one playing), at `positionMs`. */
  fun seek(index: Int, positionMs: Long) {
    val p = player ?: return
    val at = if (index < 0) p.currentMediaItemIndex else index.coerceIn(0, p.mediaItemCount - 1)
    p.seekTo(at, maxOf(0L, positionMs))
  }

  /**
   * Stops the list: the player goes, the keys of its files are zeroed and forgotten, and the
   * service and its notice go. `fromService` when the service itself is going.
   */
  fun stop(context: Context?, fromService: Boolean = false) {
    val p = player
    player = null
    if (p != null) {
      onPlayer.toList().forEach { it(null) }
      release(p)
    }
    for (token in files.keys.toList()) files.remove(token)?.close()
    for (item in items) item.file.close()
    items = emptyList()
    val ctx = context?.applicationContext ?: app
    // The service is let go of now: a list played before it is gone starts a new one.
    val running = service
    service = null
    if (!fromService && ctx != null && running != null) runCatching { ctx.stopService(Intent(ctx, PlayerService::class.java)) }
    app = null
    if (p != null) tell()
  }

  private fun release(p: ExoPlayer) {
    p.removeListener(listener)
    runCatching { p.stop() }
    runCatching { p.release() }
  }

  /** The service running now, told by the service itself, and let go of by stop(). */
  var service: PlayerService? = null

  /** The space locked or closed: the list stops only when the owner chose so. */
  fun locked(context: Context?) {
    if (stopOnLock) stop(context)
  }

  /** What JavaScript is told: never the names, which it has itself. */
  fun state(error: String? = null): Map<String, Any?> {
    val p = player ?: return mapOf("active" to false, "playing" to false, "index" to -1, "count" to 0, "position" to 0.0, "duration" to -1.0, "video" to false, "buffering" to false, "ended" to false, "error" to error)
    val index = p.currentMediaItemIndex
    val duration = p.duration
    return mapOf(
      "active" to true,
      "playing" to p.isPlaying,
      "index" to index,
      "count" to p.mediaItemCount,
      "position" to p.currentPosition.toDouble(),
      "duration" to if (duration == C.TIME_UNSET) -1.0 else duration.toDouble(),
      "video" to (items.getOrNull(index)?.video == true),
      "buffering" to (p.playbackState == Player.STATE_BUFFERING),
      "ended" to (p.playbackState == Player.STATE_ENDED),
      "error" to error,
    )
  }

  private fun tell(error: String? = null) {
    val state = state(error)
    onState?.invoke(state)
  }

  /** The file a link of the player names, while its list plays. */
  fun fileOf(uri: Uri?): SealedFile? {
    if (uri?.scheme != SCHEME) return null
    val token = uri.authority ?: return null
    return files[token]?.takeUnless { it.isClosed }
  }

  /** Runs `body` on the main thread, now if already there. */
  fun onMain(body: () -> Unit) {
    if (Looper.myLooper() == Looper.getMainLooper()) body() else main.post(body)
  }
}

/**
 * Where ExoPlayer reads a file of the list from: its chunks, decrypted only as far as asked, at
 * any place (SealedFile.Reader). A damaged chunk, or a key forgotten meanwhile, is an error the
 * player shows, never bytes that may be wrong.
 */
@OptIn(UnstableApi::class)
internal class SealedDataSource(private val folder: File) : BaseDataSource(false) {
  private var uri: Uri? = null
  private var reader: SealedFile.Reader? = null
  private var position = 0L
  private var left = 0L
  private var opened = false

  override fun open(dataSpec: DataSpec): Long {
    uri = dataSpec.uri
    transferInitializing(dataSpec)
    val file = Playing.fileOf(dataSpec.uri) ?: throw FileNotFoundException("Not in the list playing")
    if (dataSpec.position > file.size) throw DataSourceException(PlaybackException.ERROR_CODE_IO_READ_POSITION_OUT_OF_RANGE)
    reader = file.reader(folder)
    position = dataSpec.position
    val rest = file.size - position
    left = if (dataSpec.length == C.LENGTH_UNSET.toLong()) rest else minOf(dataSpec.length, rest)
    opened = true
    transferStarted(dataSpec)
    return left
  }

  override fun read(buffer: ByteArray, offset: Int, length: Int): Int {
    if (length == 0) return 0
    if (left == 0L) return C.RESULT_END_OF_INPUT
    val r = reader ?: throw FileNotFoundException("Closed")
    val got = r.read(position, buffer, offset, minOf(length.toLong(), left).toInt())
    if (got < 0) return C.RESULT_END_OF_INPUT
    position += got
    left -= got
    bytesTransferred(got)
    return got
  }

  override fun getUri(): Uri? = uri

  override fun close() {
    uri = null
    reader?.close()
    reader = null
    if (opened) {
      opened = false
      transferEnded()
    }
  }
}

/**
 * The player as the notice, the lock screen and any other controller see it (PlayerService.kt):
 * only play, pause, next and previous within the list, and only the title set in Playing, never
 * what the file says of itself (its tags and cover).
 */
@OptIn(UnstableApi::class)
internal class ShownPlayer(player: Player) : ForwardingPlayer(player) {
  private val wrapped = mutableMapOf<Player.Listener, Player.Listener>()

  override fun getAvailableCommands(): Player.Commands {
    val all = super.getAvailableCommands()
    val builder = Player.Commands.Builder()
    for (command in ALLOWED) if (all.contains(command)) builder.add(command)
    return builder.build()
  }

  override fun isCommandAvailable(command: Int): Boolean = command in ALLOWED && super.isCommandAvailable(command)

  override fun getMediaMetadata(): MediaMetadata = currentMediaItem?.mediaMetadata ?: MediaMetadata.EMPTY

  override fun getPlaylistMetadata(): MediaMetadata = MediaMetadata.EMPTY

  override fun addListener(listener: Player.Listener) {
    val shown = Shown(listener)
    synchronized(wrapped) { wrapped[listener] = shown }
    super.addListener(shown)
  }

  override fun removeListener(listener: Player.Listener) {
    val shown = synchronized(wrapped) { wrapped.remove(listener) } ?: return
    super.removeListener(shown)
  }

  // Passes every event on, but with what is shown in place of what the file said.
  private inner class Shown(private val inner: Player.Listener) : Player.Listener by inner {
    override fun onMediaMetadataChanged(mediaMetadata: MediaMetadata) {
      inner.onMediaMetadataChanged(this@ShownPlayer.mediaMetadata)
    }

    override fun onPlaylistMetadataChanged(mediaMetadata: MediaMetadata) {
      inner.onPlaylistMetadataChanged(MediaMetadata.EMPTY)
    }

    override fun onAvailableCommandsChanged(availableCommands: Player.Commands) {
      inner.onAvailableCommandsChanged(this@ShownPlayer.availableCommands)
    }
  }

  companion object {
    /** What the notice, the lock screen and other controllers may do. */
    val ALLOWED = setOf(
      Player.COMMAND_PLAY_PAUSE,
      Player.COMMAND_SEEK_TO_PREVIOUS,
      Player.COMMAND_SEEK_TO_PREVIOUS_MEDIA_ITEM,
      Player.COMMAND_SEEK_TO_NEXT,
      Player.COMMAND_SEEK_TO_NEXT_MEDIA_ITEM,
      Player.COMMAND_GET_CURRENT_MEDIA_ITEM,
      Player.COMMAND_GET_TIMELINE,
      Player.COMMAND_GET_METADATA,
    )

    fun allowed(): Player.Commands {
      val builder = Player.Commands.Builder()
      for (command in ALLOWED) builder.add(command)
      return builder.build()
    }
  }
}
