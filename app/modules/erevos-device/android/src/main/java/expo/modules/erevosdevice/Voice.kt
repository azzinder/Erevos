// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

package expo.modules.erevosdevice

import android.content.Context
import android.media.MediaRecorder
import android.net.Uri
import android.os.Build
import java.io.File
import kotlin.math.log10

// A voice message recorded as Ogg with Opus in it, as Telegram, Element and Conversations send
// them (lib/audio.ts). Android records Opus from 10 on; expo-audio's recorder has no Opus at all, so
// it is recorded here, by Android's own MediaRecorder. Mono, at 48 kHz and 32 kbit/s, or for the
// walkie-talkie at 16 kHz and 24 kbit/s (lib/voice.ts). The file goes in the cache folder expo-audio
// records to, named as its recordings are, so a recording left there when Erevos closed in the
// middle is deleted the next time a chat opens (lib/audio.ts clearLeftovers). The app reads it
// and deletes it at once. The microphone must be allowed first.
object Voice {
  private var recorder: MediaRecorder? = null
  private var file: File? = null

  /**
   * Starts recording: the file's uri, or null when it cannot be done here (before Android 10, or
   * the recorder failed to start), and nothing of it stays. One that was recording is let go first.
   */
  @Synchronized
  fun start(context: Context, talk: Boolean): String? {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) return null
    drop()
    val dir = File(context.cacheDir, "Audio").apply { mkdirs() }
    val out = File(dir, "recording-${System.nanoTime()}.ogg")
    val r = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) MediaRecorder(context) else @Suppress("DEPRECATION") MediaRecorder()
    return try {
      r.setAudioSource(MediaRecorder.AudioSource.MIC)
      r.setOutputFormat(MediaRecorder.OutputFormat.OGG)
      r.setAudioEncoder(MediaRecorder.AudioEncoder.OPUS)
      r.setAudioChannels(1)
      r.setAudioSamplingRate(if (talk) TALK_RATE else RATE)
      r.setAudioEncodingBitRate(if (talk) TALK_BITS else BITS)
      r.setOutputFile(out.path)
      r.prepare()
      r.start()
      recorder = r
      file = out
      Uri.fromFile(out).toString()
    } catch (e: Exception) {
      runCatching { r.release() }
      out.delete()
      null
    }
  }

  /** How loud it was since it was last asked, dBFS, as expo-audio's metering says it: -160 for silence; null when not recording. */
  @Synchronized
  fun level(): Double? {
    val r = recorder ?: return null
    val amplitude = runCatching { r.maxAmplitude }.getOrDefault(0)
    return if (amplitude <= 0) -160.0 else 20 * log10(amplitude / 32767.0)
  }

  /** Stops: the finished file's uri, or null when nothing was recording or it failed (too short to hold a sound), and then no file stays. */
  @Synchronized
  fun stop(): String? {
    val r = recorder ?: return null
    val f = file
    recorder = null
    file = null
    val ok = runCatching { r.stop() }.isSuccess
    runCatching { r.release() }
    if (!ok || f == null || f.length() == 0L) {
      f?.delete()
      return null
    }
    return Uri.fromFile(f).toString()
  }

  // Lets a recording go, its file too.
  private fun drop() {
    val r = recorder ?: return
    recorder = null
    runCatching { r.stop() }
    runCatching { r.release() }
    file?.delete()
    file = null
  }

  private const val RATE = 48_000
  private const val BITS = 32_000
  private const val TALK_RATE = 16_000
  private const val TALK_BITS = 24_000
}
