// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

package expo.modules.erevoscollection

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Handler
import android.os.Looper
import android.util.Base64
import androidx.annotation.OptIn
import androidx.media3.common.AudioAttributes
import androidx.media3.common.C
import androidx.media3.common.ForwardingPlayer
import androidx.media3.common.MediaItem
import androidx.media3.common.MediaMetadata
import androidx.media3.common.MimeTypes
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi
import androidx.media3.datasource.BaseDataSource
import androidx.media3.datasource.DataSource
import androidx.media3.datasource.DataSourceException
import androidx.media3.datasource.DataSpec
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory
import androidx.media3.extractor.DefaultExtractorsFactory
import androidx.media3.session.MediaController
import androidx.media3.session.SessionToken
import com.google.common.util.concurrent.ListenableFuture
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
 * Inside Erevos the player's screen (components/collection-now-playing.tsx) also shuffles, repeats
 * (the list, or the one file), changes the speed, and jumps to any file of the list. A file may
 * start where it was left (`resume`, from the place's catalogue): only the first time it plays in
 * the list. Where each file got to is kept here by its place in the list only (positions), for
 * JavaScript to take and keep sealed in the catalogue (takePositions); never a name.
 *
 * The notice and the lock screen show a file's title only when the owner turned that on
 * (showTitle): then what the file says of itself (its title, else its name, its artist, album and
 * cover); otherwise a plain word JavaScript gives (`neutral`) and nothing else (ShownPlayer, shown).
 * JavaScript is told what the file says of itself (title, artist, album), for the screen inside
 * Erevos, and its cover when it asks (artwork).
 *
 * Everything here runs on the main thread, as ExoPlayer wants; only SealedDataSource runs on the
 * player's own loading thread.
 */
@OptIn(UnstableApi::class)
internal object Playing {
  class Item(val file: SealedFile, val name: String, val mime: String, val video: Boolean, val resume: Long = 0L, val subtitles: SealedFile? = null, val subtitlesMime: String = "")

  private fun Item.close() {
    file.close()
    subtitles?.close()
  }

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

  /** Whether the notice shows what a file is (the owner's setting), and the word it shows otherwise. */
  @Volatile private var showTitle = false
  @Volatile private var neutral = ""

  // Where each file of the list got to, by its place in it, and how long it is: kept past stop(),
  // for JavaScript to take (takePositions); forgotten by the next list and the panic button.
  private val positions = HashMap<Int, LongArray>()
  private val durations = HashMap<Int, Long>()
  // The files of the list that started where they were left already: they do not twice.
  private val resumed = HashSet<Int>()
  // The file of the list whose failed read was tried again already (onPlayerError), until another plays.
  private var retried = -1

  /** Told the state whenever it changes, on the main thread: the module's event. */
  var onState: ((Map<String, Any?>) -> Unit)? = null

  /** Told when the player is made or goes, for the video view. */
  val onPlayer = mutableSetOf<(ExoPlayer?) -> Unit>()

  private val listener = object : Player.Listener {
    override fun onEvents(player: Player, events: Player.Events) {
      val duration = player.duration
      if (duration != C.TIME_UNSET && duration > 0) durations[player.currentMediaItemIndex] = duration
      tell()
    }

    override fun onPositionDiscontinuity(oldPosition: Player.PositionInfo, newPosition: Player.PositionInfo, reason: Int) {
      val was = oldPosition.mediaItemIndex
      if (was == newPosition.mediaItemIndex && reason != Player.DISCONTINUITY_REASON_AUTO_TRANSITION) return
      // Played to its end: nothing to go back to. Left for another: where it was.
      val at = if (reason == Player.DISCONTINUITY_REASON_AUTO_TRANSITION) 0L else oldPosition.positionMs
      positions[was] = longArrayOf(at, durations[was] ?: -1L)
    }

    override fun onMediaItemTransition(mediaItem: MediaItem?, reason: Int) {
      val p = player ?: return
      val index = p.currentMediaItemIndex
      if (index != retried) retried = -1
      val item = items.getOrNull(index) ?: return
      if (reason == Player.MEDIA_ITEM_TRANSITION_REASON_REPEAT || item.resume <= 0L || !resumed.add(index)) return
      p.seekTo(index, item.resume)
    }

    override fun onPlayerError(error: PlaybackException) {
      val p = player ?: return
      // A read that failed once (the phone's storage slow to answer with the screen off) is tried
      // again where it stopped, once for each file; the player then waits no more for it.
      val index = p.currentMediaItemIndex
      if (retried != index) {
        retried = index
        p.prepare()
        p.play()
        tell(error.errorCodeName)
        return
      }
      // A damaged chunk or a key forgotten: this file cannot play; the next one is tried.
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
   * what the notice shows for a file when what it is is not to be shown.
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
    this.showTitle = showTitle
    this.neutral = neutral
    positions.clear()
    durations.clear()
    resumed.clear()
    retried = -1
    val folder = appContext.filesDir
    // No title in the items themselves: what is shown is made by ShownPlayer, and what the player
    // reports of the file (getMediaMetadata) is then only what the file says.
    val mediaItems = list.mapIndexed { index, item ->
      val token = newToken()
      files[token] = item.file
      val builder = MediaItem.Builder()
        .setMediaId(index.toString())
        .setUri(Uri.Builder().scheme(SCHEME).authority(token).build())
      // A video's subtitles, an .srt or .vtt file of the Collection, read from its chunks as the
      // video is, by a token of their own; shown by the video view, which a tap can turn off.
      val subtitles = item.subtitles
      if (subtitles != null) {
        val subtitlesToken = newToken()
        files[subtitlesToken] = subtitles
        val mime = if (item.subtitlesMime == MimeTypes.TEXT_VTT) MimeTypes.TEXT_VTT else MimeTypes.APPLICATION_SUBRIP
        builder.setSubtitleConfigurations(
          listOf(
            MediaItem.SubtitleConfiguration.Builder(Uri.Builder().scheme(SCHEME).authority(subtitlesToken).build())
              .setMimeType(mime)
              .setSelectionFlags(C.SELECTION_FLAG_DEFAULT)
              .build(),
          ),
        )
      }
      builder.build()
    }
    val video = list.any { it.video }
    val made = ExoPlayer.Builder(appContext)
      .setMediaSourceFactory(DefaultMediaSourceFactory(DataSource.Factory { SealedDataSource(folder) }, extractors()))
      .setAudioAttributes(
        AudioAttributes.Builder().setUsage(C.USAGE_MEDIA).setContentType(if (video) C.AUDIO_CONTENT_TYPE_MOVIE else C.AUDIO_CONTENT_TYPE_MUSIC).build(),
        true,
      )
      .setHandleAudioBecomingNoisy(true)
      .setWakeMode(C.WAKE_MODE_LOCAL)
      .build()
    made.addListener(listener)
    val first = start.coerceIn(0, mediaItems.size - 1)
    val from = list[first].resume.coerceAtLeast(0L)
    if (from > 0L) resumed.add(first)
    made.setMediaItems(mediaItems, first, from)
    player = made
    // The service shows the notice and answers the lock screen: the one running takes the new
    // player; otherwise it starts, while Erevos shows.
    val running = service
    if (running != null) running.usePlayer(made) else runCatching { appContext.startService(Intent(appContext, PlayerService::class.java)) }
    bind(appContext)
    onPlayer.toList().forEach { it(made) }
    // The list before goes only now, so the session never holds a player already let go of.
    if (before != null) release(before)
    for (token in beforeTokens) files.remove(token)?.close()
    for (item in beforeItems) item.close()
    made.prepare()
    made.play()
    tell()
  }

  /**
   * Every container Media3 reads (MP3, AAC, FLAC, Ogg with Vorbis or Opus, WAV, AMR, MP4, 3GP,
   * Matroska and WebM), each told by its first bytes, not by a name or type, which the player never
   * has. An MP3 or AAC file with no table of where its seconds lie is sought in as if at a constant
   * bitrate, so seeking works in it too, if only roughly in one whose bitrate varies.
   */
  fun extractors(): DefaultExtractorsFactory =
    DefaultExtractorsFactory().setConstantBitrateSeekingEnabled(true)

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
    // A file jumped to from the list starts where it was left, as it would have.
    val item = items.getOrNull(at)
    val to = if (index >= 0 && positionMs == 0L && item != null && item.resume > 0L && resumed.add(at)) item.resume else positionMs
    if (at != p.currentMediaItemIndex) resumed.add(at)
    p.seekTo(at, maxOf(0L, to))
    if (p.playbackState == Player.STATE_IDLE) p.prepare()
  }

  /** The list in an order of its own, or in its order again. */
  fun setShuffle(on: Boolean) {
    player?.shuffleModeEnabled = on
  }

  /** "off", "all" (the list again from its start) or "one" (the same file again). */
  fun setRepeat(mode: String) {
    player?.repeatMode = when (mode) {
      "all" -> Player.REPEAT_MODE_ALL
      "one" -> Player.REPEAT_MODE_ONE
      else -> Player.REPEAT_MODE_OFF
    }
  }

  private fun newToken(): String = ByteArray(16).also(random::nextBytes).joinToString("") { "%02x".format(it) }

  /** A video's subtitles shown, or not. */
  fun setSubtitles(on: Boolean) {
    val p = player ?: return
    p.trackSelectionParameters = p.trackSelectionParameters.buildUpon().setTrackTypeDisabled(C.TRACK_TYPE_TEXT, !on).build()
  }

  /** How fast it plays, from half to twice as fast; the pitch goes with it. */
  fun setSpeed(speed: Float) {
    player?.setPlaybackSpeed(speed.coerceIn(0.5f, 2f))
  }

  /**
   * Where the files of the list got to since last asked, by their place in it, with how long each
   * is (-1 if not known): the one playing as it is now. Taken, they are forgotten here.
   */
  fun takePositions(): List<Map<String, Double>> {
    val p = player
    if (p != null && p.mediaItemCount > 0) {
      val index = p.currentMediaItemIndex
      positions[index] = longArrayOf(if (p.playbackState == Player.STATE_ENDED) 0L else p.currentPosition, durations[index] ?: -1L)
    }
    val out = positions.map { (index, at) -> mapOf("index" to index.toDouble(), "position" to at[0].toDouble(), "duration" to at[1].toDouble()) }
    positions.clear()
    return out
  }

  /** The cover the file playing has inside, base64, or null. */
  fun artwork(): String? {
    val data = player?.mediaMetadata?.artworkData ?: return null
    return Base64.encodeToString(data, Base64.NO_WRAP)
  }

  /** What the notice, the lock screen and other controllers are shown of the file at `index`, from what it says of itself (`file`). */
  fun shown(file: MediaMetadata, index: Int): MediaMetadata {
    val item = items.getOrNull(index)
    if (!showTitle || item == null) return MediaMetadata.Builder().setTitle(neutral).setDisplayTitle(neutral).build()
    val title = file.title ?: item.name.ifEmpty { neutral }
    val builder = MediaMetadata.Builder().setTitle(title).setDisplayTitle(title).setArtist(file.artist).setAlbumTitle(file.albumTitle)
    file.artworkData?.let { builder.setArtworkData(it, file.artworkDataType) }
    return builder.build()
  }

  /**
   * Stops the list: the player goes, the keys of its files are zeroed and forgotten, and the
   * service and its notice go. `fromService` when the service itself is going. Where the file
   * playing got to stays, for JavaScript to take.
   */
  fun stop(context: Context?, fromService: Boolean = false) {
    val p = player
    if (p != null && p.mediaItemCount > 0) {
      val index = p.currentMediaItemIndex
      positions[index] = longArrayOf(if (p.playbackState == Player.STATE_ENDED) 0L else p.currentPosition, durations[index] ?: -1L)
    }
    player = null
    if (p != null) {
      onPlayer.toList().forEach { it(null) }
      release(p)
    }
    for (token in files.keys.toList()) files.remove(token)?.close()
    for (item in items) item.close()
    items = emptyList()
    val ctx = context?.applicationContext ?: app
    unbind()
    // The service is let go of now: a list played before it is gone starts a new one.
    service = null
    if (!fromService && ctx != null) runCatching { ctx.stopService(Intent(ctx, PlayerService::class.java)) }
    app = null
    if (p != null) tell()
  }

  /** The panic button: the list stops, and nothing of where it was stays. */
  fun panic(context: Context?) {
    stop(context)
    positions.clear()
    durations.clear()
    resumed.clear()
  }

  private fun release(p: ExoPlayer) {
    p.removeListener(listener)
    runCatching { p.stop() }
    runCatching { p.release() }
  }

  // A controller of Erevos' own, connected to the service's session while a list plays: Media3's
  // own way to keep a MediaSessionService. Started with startService alone, the service was not
  // always made a foreground service once the screen went off (the owner's music stopped a while
  // after, on Android 16), and Android then freezes Erevos with the rest of the cached apps, the
  // wake lock notwithstanding. Bound by a controller, the service lives as long as the list, and
  // Media3 starts it in the foreground (startForegroundService, then startForeground) as soon as
  // the player plays, and keeps it there while it plays or waits for audio focus to come back.
  private var controller: ListenableFuture<MediaController>? = null

  private fun bind(context: Context) {
    if (controller != null) return
    controller = runCatching {
      MediaController.Builder(context, SessionToken(context, ComponentName(context, PlayerService::class.java))).buildAsync()
    }.getOrNull()
  }

  private fun unbind() {
    val future = controller ?: return
    controller = null
    runCatching { MediaController.releaseFuture(future) }
  }

  /** The service running now, told by the service itself, and let go of by stop(). */
  var service: PlayerService? = null

  /** The space locked or closed: the list stops only when the owner chose so. */
  fun locked(context: Context?) {
    if (stopOnLock) stop(context)
  }

  /** What JavaScript is told: never the names, which it has itself; what the file says of itself, for the screen inside Erevos. */
  fun state(error: String? = null): Map<String, Any?> {
    val p = player ?: return mapOf("active" to false, "playing" to false, "index" to -1, "count" to 0, "position" to 0.0, "duration" to -1.0, "video" to false, "buffering" to false, "ended" to false, "error" to error)
    val index = p.currentMediaItemIndex
    val duration = p.duration
    val tags = p.mediaMetadata
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
      "shuffle" to p.shuffleModeEnabled,
      "repeat" to when (p.repeatMode) {
        Player.REPEAT_MODE_ALL -> "all"
        Player.REPEAT_MODE_ONE -> "one"
        else -> "off"
      },
      "speed" to p.playbackParameters.speed.toDouble(),
      "hasNext" to p.hasNextMediaItem(),
      "hasPrevious" to p.hasPreviousMediaItem(),
      "title" to tags.title?.toString(),
      "artist" to tags.artist?.toString(),
      "album" to tags.albumTitle?.toString(),
      "artwork" to (tags.artworkData != null),
      "subtitles" to (items.getOrNull(index)?.subtitles != null),
      "subtitlesOn" to !p.trackSelectionParameters.disabledTrackTypes.contains(C.TRACK_TYPE_TEXT),
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
 * only play, pause, next and previous within the list, and only what Playing.shown makes of the
 * file: a plain word, unless the owner chose to show what it is.
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

  override fun getMediaMetadata(): MediaMetadata = Playing.shown(super.getMediaMetadata(), currentMediaItemIndex)

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

    // The timed tags of a file (an ID3 frame on the way, a stream's title) go nowhere but here.
    override fun onMetadata(metadata: androidx.media3.common.Metadata) {}
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
