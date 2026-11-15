// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

package expo.modules.erevosdevice

import android.content.Context
import android.media.MediaCodec
import android.media.MediaExtractor
import android.media.MediaFormat
import android.media.MediaMuxer
import android.media.MediaRecorder
import android.net.Uri
import android.os.Build
import java.io.ByteArrayOutputStream
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

  /**
   * The sound of the recording at `uri` (a file Voice made), for its voice to be changed
   * (lib/voice-change.ts): 4 bytes of samples a second, big-endian, then mono 16-bit
   * little-endian samples. Null when it cannot be read. The file stays.
   */
  fun samples(uri: String): ByteArray? {
    val path = Uri.parse(uri).path ?: return null
    val extractor = MediaExtractor()
    var codec: MediaCodec? = null
    return try {
      extractor.setDataSource(path)
      val track = (0 until extractor.trackCount).firstOrNull { extractor.getTrackFormat(it).getString(MediaFormat.KEY_MIME)?.startsWith("audio/") == true } ?: return null
      extractor.selectTrack(track)
      val format = extractor.getTrackFormat(track)
      val c = MediaCodec.createDecoderByType(format.getString(MediaFormat.KEY_MIME)!!)
      codec = c
      c.configure(format, null, null, 0)
      c.start()
      var rate = format.getInteger(MediaFormat.KEY_SAMPLE_RATE)
      var channels = format.getInteger(MediaFormat.KEY_CHANNEL_COUNT)
      val out = ByteArrayOutputStream()
      val info = MediaCodec.BufferInfo()
      var fed = false
      var done = false
      while (!done) {
        if (!fed) {
          val i = c.dequeueInputBuffer(WAIT_US)
          if (i >= 0) {
            val n = extractor.readSampleData(c.getInputBuffer(i)!!, 0)
            if (n < 0) {
              c.queueInputBuffer(i, 0, 0, 0, MediaCodec.BUFFER_FLAG_END_OF_STREAM)
              fed = true
            } else {
              c.queueInputBuffer(i, 0, n, extractor.sampleTime, 0)
              extractor.advance()
            }
          }
        }
        val o = c.dequeueOutputBuffer(info, WAIT_US)
        if (o == MediaCodec.INFO_OUTPUT_FORMAT_CHANGED) {
          rate = c.outputFormat.getInteger(MediaFormat.KEY_SAMPLE_RATE)
          channels = c.outputFormat.getInteger(MediaFormat.KEY_CHANNEL_COUNT)
        } else if (o >= 0) {
          val buffer = c.getOutputBuffer(o)!!
          buffer.position(info.offset)
          buffer.limit(info.offset + info.size)
          val chunk = ByteArray(info.size)
          buffer.get(chunk)
          // Mono: the first channel of each frame.
          if (channels <= 1) {
            out.write(chunk)
          } else {
            var at = 0
            while (at + 1 < chunk.size) {
              out.write(chunk[at].toInt())
              out.write(chunk[at + 1].toInt())
              at += 2 * channels
            }
          }
          c.releaseOutputBuffer(o, false)
          if (info.flags and MediaCodec.BUFFER_FLAG_END_OF_STREAM != 0) done = true
        }
        if (out.size() > MOST_BYTES) return null
      }
      byteArrayOf((rate ushr 24).toByte(), (rate ushr 16).toByte(), (rate ushr 8).toByte(), rate.toByte()) + out.toByteArray()
    } catch (e: Exception) {
      null
    } finally {
      runCatching { codec?.stop() }
      runCatching { codec?.release() }
      extractor.release()
    }
  }

  /**
   * `pcm` (mono 16-bit little-endian samples at `rate`) as a voice message in Ogg/Opus, at 32
   * kbit/s: the file's uri, in the cache folder recordings go to, to read and delete. Null when it
   * cannot be done here (before Android 10) or failed, and then no file stays.
   */
  fun opus(context: Context, pcm: ByteArray, rate: Int): String? {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) return null
    val dir = File(context.cacheDir, "Audio").apply { mkdirs() }
    val out = File(dir, "recording-${System.nanoTime()}.ogg")
    var codec: MediaCodec? = null
    var muxer: MediaMuxer? = null
    return try {
      val format = MediaFormat.createAudioFormat(MediaFormat.MIMETYPE_AUDIO_OPUS, rate, 1)
      format.setInteger(MediaFormat.KEY_BIT_RATE, BITS)
      val c = MediaCodec.createEncoderByType(MediaFormat.MIMETYPE_AUDIO_OPUS)
      codec = c
      c.configure(format, null, null, MediaCodec.CONFIGURE_FLAG_ENCODE)
      c.start()
      val m = MediaMuxer(out.path, MediaMuxer.OutputFormat.MUXER_OUTPUT_OGG)
      muxer = m
      var track = -1
      val info = MediaCodec.BufferInfo()
      var at = 0
      var fed = false
      var done = false
      while (!done) {
        if (!fed) {
          val i = c.dequeueInputBuffer(WAIT_US)
          if (i >= 0) {
            val buffer = c.getInputBuffer(i)!!
            val n = minOf(buffer.remaining() and 1.inv(), pcm.size - at)
            val time = (at / 2).toLong() * 1_000_000L / rate
            if (n <= 0) {
              c.queueInputBuffer(i, 0, 0, time, MediaCodec.BUFFER_FLAG_END_OF_STREAM)
              fed = true
            } else {
              buffer.put(pcm, at, n)
              c.queueInputBuffer(i, 0, n, time, 0)
              at += n
            }
          }
        }
        val o = c.dequeueOutputBuffer(info, WAIT_US)
        if (o == MediaCodec.INFO_OUTPUT_FORMAT_CHANGED) {
          track = m.addTrack(c.outputFormat)
          m.start()
        } else if (o >= 0) {
          val buffer = c.getOutputBuffer(o)!!
          if (info.flags and MediaCodec.BUFFER_FLAG_CODEC_CONFIG == 0 && info.size > 0 && track >= 0) {
            buffer.position(info.offset)
            buffer.limit(info.offset + info.size)
            m.writeSampleData(track, buffer, info)
          }
          c.releaseOutputBuffer(o, false)
          if (info.flags and MediaCodec.BUFFER_FLAG_END_OF_STREAM != 0) done = true
        }
      }
      m.stop()
      if (track < 0 || out.length() == 0L) {
        out.delete()
        null
      } else {
        Uri.fromFile(out).toString()
      }
    } catch (e: Exception) {
      out.delete()
      null
    } finally {
      runCatching { codec?.stop() }
      runCatching { codec?.release() }
      runCatching { muxer?.release() }
    }
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
  private const val WAIT_US = 10_000L
  // A minute and a quarter of 48 kHz 16-bit mono: more is not a voice message of Erevos's.
  private const val MOST_BYTES = 48_000 * 2 * 75
}
