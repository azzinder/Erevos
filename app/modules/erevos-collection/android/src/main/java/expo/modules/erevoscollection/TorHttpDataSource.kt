// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

package expo.modules.erevoscollection

import android.net.Uri
import androidx.annotation.OptIn
import androidx.media3.common.C
import androidx.media3.common.PlaybackException
import androidx.media3.common.util.UnstableApi
import androidx.media3.datasource.BaseDataSource
import androidx.media3.datasource.DataSourceException
import androidx.media3.datasource.DataSpec
import java.io.IOException
import java.io.InterruptedIOException
import java.lang.reflect.InvocationTargetException
import java.util.TreeMap
import org.json.JSONObject

/**
 * A station's or a TV channel's https link read only through Tor, for the Collection's Play through
 * Tor (lib/collection-play.ts): HTTP/1.1 spoken here, over a connection the core opens through Tor,
 * in TLS checked against the web's own roots (crates/erevos-tor stream_open, Tls::Https), reached
 * through erevos-core's JNI functions (ErevosCoreNative netOpen, netWrite, netRead, netClose), found
 * by name, as this module is not built against that one. Never straight: should Tor not be there or
 * fail, the station does not play. Every link the player opens comes here, an HLS stream's
 * playlists and pieces too.
 *
 * A station is asked as Media3's own HTTP source asks one (Playing.kt): no cookies, a User-Agent
 * that says only "Erevos", nothing compressed, and a redirect followed only to another https link,
 * five at most. What the server answers is given to the player as it is: its headers (a station's
 * ICY ones, for its title), and its body, in chunks or not, which a station's that never ends is.
 */
@OptIn(UnstableApi::class)
internal class TorHttpDataSource(private val agent: String) : BaseDataSource(true) {
  private var id: ByteArray? = null
  private var uri: Uri? = null
  private var opened = false
  private var headers: Map<String, List<String>> = emptyMap()

  // What came from the server and is not taken yet.
  private var pending = ByteArray(0)
  private var at = 0

  // The body: in chunks (and what is left of the one being read), and how much is left to give.
  private var chunked = false
  private var chunkLeft = 0L
  private var chunksDone = false
  private var left = C.LENGTH_UNSET.toLong()

  override fun open(dataSpec: DataSpec): Long {
    transferInitializing(dataSpec)
    var link = dataSpec.uri
    var status: Int
    var redirects = 0
    while (true) {
      connect(link, dataSpec)
      status = readHead()
      if (status in REDIRECTS) {
        val location = header("location") ?: throw failed("A redirect to nowhere", PlaybackException.ERROR_CODE_IO_BAD_HTTP_STATUS)
        closeConnection()
        if (++redirects > MOST_REDIRECTS) throw failed("Too many redirects", PlaybackException.ERROR_CODE_IO_BAD_HTTP_STATUS)
        link = runCatching { Uri.parse(java.net.URI(link.toString()).resolve(location.trim()).toString()) }.getOrNull() ?: throw failed("A redirect to nowhere", PlaybackException.ERROR_CODE_IO_BAD_HTTP_STATUS)
        continue
      }
      break
    }
    if (status !in 200..299) {
      closeConnection()
      throw failed("The server answered $status", PlaybackException.ERROR_CODE_IO_BAD_HTTP_STATUS)
    }
    uri = link
    opened = true
    transferStarted(dataSpec)
    val encoding = header("transfer-encoding")?.lowercase().orEmpty()
    chunked = encoding.contains("chunked")
    val length = if (chunked) C.LENGTH_UNSET.toLong() else header("content-length")?.trim()?.toLongOrNull() ?: C.LENGTH_UNSET.toLong()
    left = length
    // Asked from a place on and answered whole: what comes before it is skipped.
    if (status == 200 && dataSpec.position > 0) {
      skip(dataSpec.position)
      if (left != C.LENGTH_UNSET.toLong()) left = (left - dataSpec.position).coerceAtLeast(0L)
    }
    if (dataSpec.length != C.LENGTH_UNSET.toLong()) left = if (left == C.LENGTH_UNSET.toLong()) dataSpec.length else minOf(left, dataSpec.length)
    return left
  }

  override fun read(buffer: ByteArray, offset: Int, length: Int): Int {
    if (length == 0) return 0
    if (left == 0L) return C.RESULT_END_OF_INPUT
    val wanted = if (left == C.LENGTH_UNSET.toLong()) length else minOf(length.toLong(), left).toInt()
    val n = if (chunked) readChunked(buffer, offset, wanted) else readBody(buffer, offset, wanted)
    if (n == C.RESULT_END_OF_INPUT) {
      if (left != C.LENGTH_UNSET.toLong()) throw failed("The answer was cut short", PlaybackException.ERROR_CODE_IO_NETWORK_CONNECTION_FAILED)
      return n
    }
    if (left != C.LENGTH_UNSET.toLong()) left -= n
    bytesTransferred(n)
    return n
  }

  override fun getUri(): Uri? = uri

  override fun getResponseHeaders(): Map<String, List<String>> = headers

  override fun close() {
    closeConnection()
    uri = null
    headers = emptyMap()
    if (opened) {
      opened = false
      transferEnded()
    }
  }

  // The connection to `link`, through Tor, and the request for it, as the player asks it.
  private fun connect(link: Uri, dataSpec: DataSpec) {
    if (link.scheme != "https") throw failed("Only https links", PlaybackException.ERROR_CODE_IO_CLEARTEXT_NOT_PERMITTED)
    val host = link.host?.removePrefix("[")?.removeSuffix("]")
    if (host.isNullOrEmpty() || link.userInfo != null) throw failed("Not a link this player opens", PlaybackException.ERROR_CODE_IO_FILE_NOT_FOUND)
    val port = if (link.port in 1..65535) link.port else 443
    val path = (link.encodedPath?.ifEmpty { null } ?: "/") + (link.encodedQuery?.let { "?$it" } ?: "")
    if (path.any { it <= ' ' || it.code >= 127 }) throw failed("Not a link this player opens", PlaybackException.ERROR_CODE_IO_FILE_NOT_FOUND)
    val authority = (if (host.contains(':')) "[$host]" else host) + (if (port == 443) "" else ":$port")
    val request = StringBuilder()
      .append("GET ").append(path).append(" HTTP/1.1\r\n")
      .append("Host: ").append(authority).append("\r\n")
      .append("User-Agent: ").append(agent).append("\r\n")
      .append("Accept: */*\r\n")
      .append("Accept-Encoding: identity\r\n")
      .append("Connection: close\r\n")
    val from = dataSpec.position
    val length = dataSpec.length
    if (from > 0 || length != C.LENGTH_UNSET.toLong()) {
      request.append("Range: bytes=").append(from).append('-')
      if (length != C.LENGTH_UNSET.toLong()) request.append(from + length - 1)
      request.append("\r\n")
    }
    // What the player asks besides (Icy-MetaData, for a station's titles), but nothing that says who.
    for ((name, value) in dataSpec.httpRequestHeaders) {
      if (name.lowercase() in NOT_SENT || name.isEmpty() || name.any { it <= ' ' || it == ':' || it.code >= 127 } || value.any { it == '\r' || it == '\n' }) continue
      request.append(name).append(": ").append(value).append("\r\n")
    }
    request.append("\r\n")
    val head = JSONObject().put("host", host).put("port", port).put("domain", host).put("tls", "https").put("tor", true)
    val opened = core("netOpen", head.toString().toByteArray())
    id = opened
    pending = ByteArray(0)
    at = 0
    chunkLeft = 0L
    chunksDone = false
    core("netWrite", opened, request.toString().toByteArray(Charsets.ISO_8859_1))
  }

  // The answer's status line and headers: its status.
  private fun readHead(): Int {
    val first = readLine() ?: throw failed("No answer from the server", PlaybackException.ERROR_CODE_IO_NETWORK_CONNECTION_FAILED)
    // "HTTP/1.1 200 OK", or a Shoutcast station's "ICY 200 OK".
    val parts = first.split(' ')
    val status = parts.getOrNull(1)?.toIntOrNull()
    if (status == null || !(parts[0].startsWith("HTTP/") || parts[0] == "ICY")) throw failed("A broken answer from the server", PlaybackException.ERROR_CODE_IO_NETWORK_CONNECTION_FAILED)
    val all = TreeMap<String, MutableList<String>>(String.CASE_INSENSITIVE_ORDER)
    var size = first.length
    while (true) {
      val line = readLine() ?: throw failed("A broken answer from the server", PlaybackException.ERROR_CODE_IO_NETWORK_CONNECTION_FAILED)
      if (line.isEmpty()) break
      size += line.length
      if (size > MOST_HEAD) throw failed("A broken answer from the server", PlaybackException.ERROR_CODE_IO_NETWORK_CONNECTION_FAILED)
      val colon = line.indexOf(':')
      if (colon <= 0) continue
      all.getOrPut(line.substring(0, colon).trim()) { mutableListOf() }.add(line.substring(colon + 1).trim())
    }
    headers = all
    return status
  }

  private fun header(name: String): String? = headers[name]?.firstOrNull()

  // A line of the answer's head or of a chunk's size, without its CRLF; null if the server closed first.
  private fun readLine(): String? {
    val line = StringBuilder()
    while (true) {
      val byte = readByte() ?: return if (line.isEmpty()) null else line.toString()
      if (byte == '\n'.code) return line.toString().removeSuffix("\r")
      line.append(byte.toChar())
      if (line.length > MOST_LINE) throw failed("A broken answer from the server", PlaybackException.ERROR_CODE_IO_NETWORK_CONNECTION_FAILED)
    }
  }

  private fun readByte(): Int? {
    if (at >= pending.size && !fill()) return null
    return pending[at++].toInt() and 0xff
  }

  // A body not in chunks: as it comes, until the server closes.
  private fun readBody(buffer: ByteArray, offset: Int, length: Int): Int {
    if (at >= pending.size && !fill()) return C.RESULT_END_OF_INPUT
    val n = minOf(length, pending.size - at)
    System.arraycopy(pending, at, buffer, offset, n)
    at += n
    return n
  }

  // A body in chunks: each one's size line, then the chunk, until the last (size 0).
  private fun readChunked(buffer: ByteArray, offset: Int, length: Int): Int {
    if (chunksDone) return C.RESULT_END_OF_INPUT
    if (chunkLeft == 0L) {
      val line = readLine() ?: throw failed("The answer was cut short", PlaybackException.ERROR_CODE_IO_NETWORK_CONNECTION_FAILED)
      val size = line.substringBefore(';').trim().toLongOrNull(16)
      if (size == null || size < 0) throw failed("A broken answer from the server", PlaybackException.ERROR_CODE_IO_NETWORK_CONNECTION_FAILED)
      if (size == 0L) {
        // The trailers, if any, to the empty line.
        while (readLine()?.isNotEmpty() == true) Unit
        chunksDone = true
        return C.RESULT_END_OF_INPUT
      }
      chunkLeft = size
    }
    val n = readBody(buffer, offset, minOf(length.toLong(), chunkLeft).toInt())
    if (n == C.RESULT_END_OF_INPUT) throw failed("The answer was cut short", PlaybackException.ERROR_CODE_IO_NETWORK_CONNECTION_FAILED)
    chunkLeft -= n
    // The CRLF after the chunk.
    if (chunkLeft == 0L) readLine()
    return n
  }

  // Skips `count` bytes of the body.
  private fun skip(count: Long) {
    val scratch = ByteArray(16 * 1024)
    var rest = count
    while (rest > 0) {
      val n = if (chunked) readChunked(scratch, 0, minOf(rest, scratch.size.toLong()).toInt()) else readBody(scratch, 0, minOf(rest, scratch.size.toLong()).toInt())
      if (n == C.RESULT_END_OF_INPUT) throw failed("The answer was cut short", PlaybackException.ERROR_CODE_IO_READ_POSITION_OUT_OF_RANGE)
      rest -= n
    }
  }

  // More of what the server sent, waiting for it as long as a station may be silent: false once it
  // has closed the connection and everything is taken. Stopping the player stops the wait.
  private fun fill(): Boolean {
    val connection = id ?: return false
    val until = System.nanoTime() + READ_WAIT_MS * 1_000_000
    while (true) {
      if (Thread.currentThread().isInterrupted) throw InterruptedIOException()
      val got = try {
        core("netRead", connection, WAIT_STEP)
      } catch (_: IOException) {
        // The server closed the connection: what it said is all taken.
        return false
      }
      if (got.isNotEmpty()) {
        pending = got
        at = 0
        return true
      }
      if (System.nanoTime() - until >= 0) throw failed("The station stopped sending through Tor", PlaybackException.ERROR_CODE_IO_NETWORK_CONNECTION_TIMEOUT)
    }
  }

  private fun closeConnection() {
    val connection = id ?: return
    id = null
    pending = ByteArray(0)
    at = 0
    runCatching { core("netClose", connection) }
  }

  private fun failed(message: String, reason: Int): IOException = DataSourceException(message, null, reason)

  companion object {
    private val REDIRECTS = setOf(301, 302, 303, 307, 308)
    private const val MOST_REDIRECTS = 5
    private const val MOST_HEAD = 64 * 1024
    private const val MOST_LINE = 8 * 1024
    /** How long a server may send nothing before the read gives up, as Media3's own source waits, with room for Tor. */
    private const val READ_WAIT_MS = 30_000L
    /** Each wait for more, in ms (8 bytes, big-endian, as the core takes it): short, so that stopping is at once. */
    private val WAIT_STEP = java.nio.ByteBuffer.allocate(8).putLong(500L).array()
    /** Headers the player's own are not sent with: set here, or that would say who. */
    private val NOT_SENT = setOf("host", "connection", "content-length", "transfer-encoding", "cookie", "user-agent", "range", "accept-encoding", "authorization")

    // erevos-core's JNI functions, by name: its class loads the core with it.
    private val native: Class<*>? by lazy { runCatching { Class.forName("expo.modules.erevoscore.ErevosCoreNative") }.getOrNull() }

    /** Whether this build's core can play through Tor. */
    fun available(): Boolean = native?.methods?.any { it.name == "netOpen" } == true

    private fun core(name: String, vararg args: ByteArray): ByteArray {
      val found = native ?: throw DataSourceException("This build of Erevos has no Tor", null, PlaybackException.ERROR_CODE_IO_NETWORK_CONNECTION_FAILED)
      val method = found.getMethod(name, *Array(args.size) { ByteArray::class.java })
      return try {
        method.invoke(null, *args) as ByteArray
      } catch (e: InvocationTargetException) {
        val cause = e.targetException
        if (cause is UnsatisfiedLinkError) throw DataSourceException("This build of Erevos has no Tor", null, PlaybackException.ERROR_CODE_IO_NETWORK_CONNECTION_FAILED)
        throw DataSourceException(cause?.message ?: "Tor failed", cause, PlaybackException.ERROR_CODE_IO_NETWORK_CONNECTION_FAILED)
      }
    }
  }
}
