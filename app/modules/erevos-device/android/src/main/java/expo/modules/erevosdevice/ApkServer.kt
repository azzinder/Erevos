// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

package expo.modules.erevosdevice

import java.io.BufferedInputStream
import java.io.File
import java.io.FileOutputStream
import java.io.InputStream
import java.io.OutputStream
import java.net.Inet4Address
import java.net.InetAddress
import java.net.InetSocketAddress
import java.net.ServerSocket
import java.net.Socket
import java.net.SocketTimeoutException
import java.security.MessageDigest
import java.util.Collections
import java.util.concurrent.atomic.AtomicInteger

/**
 * Erevos's own APK to a phone nearby, over the Wi-Fi or hotspot they share (NearbyApk.kt,
 * app/give-app.tsx): a small HTTP server that lives while the owner's screen shows, ten minutes at
 * most, and answers only under a random path no one can guess. Plain Java, so it runs as it is in
 * a check on a computer too.
 *
 * - `/<token>/` is a page with no script that shows the package's SHA-256 and the certificate it
 *   is signed with, and a link to it; `/<token>/erevos.apk` is the package.
 * - Only GET and HEAD, only from a phone on the same network (`accepts`), four at a time; anything
 *   else is refused and counted, and after 30 refusals the server stops.
 * - Plain HTTP, as a phone with no internet has no way to check a certificate: the receiver checks
 *   the package itself, against the SHA-256 in the QR code (ApkFetch below) or by eye.
 */
internal class ApkServer(
  private val file: File,
  private val token: String,
  private val page: ByteArray,
  private val fileName: String,
  private val until: Long,
  private val accepts: (InetAddress) -> Boolean,
  bind: InetAddress = InetAddress.getByName("0.0.0.0"),
) {
  private val server = ServerSocket().apply {
    reuseAddress = true
    soTimeout = 1000
    bind(InetSocketAddress(bind, 0), 8)
  }
  private val open = Collections.synchronizedSet(HashSet<Socket>())
  private val busy = AtomicInteger(0)
  private val refused = AtomicInteger(0)
  private val size = file.length()

  /** The port Android chose. */
  val port: Int = server.localPort

  /** Packages sent whole. */
  @Volatile var given = 0
    private set

  @Volatile var running = true
    private set

  fun start() {
    Thread({ acceptAll() }, "erevos-apk-server").apply { isDaemon = true }.start()
  }

  fun stop() {
    running = false
    runCatching { server.close() }
    synchronized(open) { open.toList() }.forEach { runCatching { it.close() } }
  }

  private fun acceptAll() {
    try {
      while (running) {
        if (System.currentTimeMillis() > until) break
        val socket = try {
          server.accept()
        } catch (_: SocketTimeoutException) {
          continue
        }
        if (!accepts(socket.inetAddress) || busy.get() >= MAX_BUSY) {
          runCatching { socket.close() }
          refuse()
          continue
        }
        busy.incrementAndGet()
        open.add(socket)
        Thread({
          try {
            serve(socket)
          } catch (_: Exception) {
            // The other phone went, or sent nonsense: nothing to say to it.
          } finally {
            open.remove(socket)
            busy.decrementAndGet()
            runCatching { socket.close() }
          }
        }, "erevos-apk-send").apply { isDaemon = true }.start()
      }
    } catch (_: Exception) {
      // Stopped.
    } finally {
      stop()
    }
  }

  private fun refuse() {
    if (refused.incrementAndGet() >= MAX_REFUSED) stop()
  }

  private fun serve(socket: Socket) {
    socket.soTimeout = 20_000
    val input = BufferedInputStream(socket.getInputStream())
    val request = readLine(input) ?: return refuse()
    // The headers, which say nothing this needs, up to the blank line.
    var lines = 0
    while (true) {
      val header = readLine(input) ?: return refuse()
      if (header.isEmpty()) break
      if (++lines > 64) return refuse()
    }
    val out = socket.getOutputStream()
    val parts = request.split(' ')
    if (parts.size != 3 || !parts[2].startsWith("HTTP/")) return refuse()
    val head = parts[0] == "HEAD"
    if (!head && parts[0] != "GET") {
      answer(out, "405 Method Not Allowed", "text/plain", null, head)
      return refuse()
    }
    val path = parts[1].substringBefore('?').split('/')
    // "", token, [""] or [name]
    if (path.size !in 2..3 || path[0].isNotEmpty() || !sameToken(path[1])) {
      answer(out, "404 Not Found", "text/plain", null, head)
      return refuse()
    }
    when (path.getOrNull(2)) {
      null -> answer(out, "301 Moved Permanently", "text/plain", null, head, "Location: /$token/\r\n")
      "" -> answer(out, "200 OK", "text/html; charset=utf-8", page, head, PAGE_HEADERS)
      APK -> sendFile(out, head)
      else -> {
        answer(out, "404 Not Found", "text/plain", null, head)
        refuse()
      }
    }
  }

  private fun sameToken(given: String): Boolean = MessageDigest.isEqual(given.toByteArray(), token.toByteArray())

  private fun sendFile(out: OutputStream, head: Boolean) {
    val headers = "HTTP/1.1 200 OK\r\n" +
      "Content-Type: application/vnd.android.package-archive\r\n" +
      "Content-Length: $size\r\n" +
      "Content-Disposition: attachment; filename=\"$fileName\"\r\n" +
      "Cache-Control: no-store\r\nX-Content-Type-Options: nosniff\r\nConnection: close\r\n\r\n"
    out.write(headers.toByteArray(Charsets.US_ASCII))
    if (head) return out.flush()
    var sent = 0L
    file.inputStream().use { from ->
      val buffer = ByteArray(64 * 1024)
      while (running) {
        val n = from.read(buffer)
        if (n < 0) break
        out.write(buffer, 0, n)
        sent += n
      }
    }
    out.flush()
    if (sent == size) given++
  }

  private fun answer(out: OutputStream, status: String, type: String, body: ByteArray?, head: Boolean, extra: String = "") {
    val bytes = body ?: status.substringAfter(' ').toByteArray()
    out.write(("HTTP/1.1 $status\r\nContent-Type: $type\r\nContent-Length: ${bytes.size}\r\nCache-Control: no-store\r\n" +
      "X-Content-Type-Options: nosniff\r\n${extra}Connection: close\r\n\r\n").toByteArray(Charsets.US_ASCII))
    if (!head) out.write(bytes)
    out.flush()
  }

  companion object {
    const val APK = "erevos.apk"
    private const val MAX_BUSY = 4
    private const val MAX_REFUSED = 30
    private const val PAGE_HEADERS = "Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'; form-action 'none'; frame-ancestors 'none'\r\n" +
      "Referrer-Policy: no-referrer\r\n"

    /** A line of HTTP's head, without its CR LF; null past 4096 bytes or at the end. */
    fun readLine(input: InputStream, most: Int = 4096): String? {
      val line = StringBuilder()
      while (true) {
        val b = input.read()
        if (b < 0) return null
        if (b == '\n'.code) return line.toString().removeSuffix("\r")
        if (line.length >= most) return null
        line.append(b.toChar())
      }
    }

    fun hex(bytes: ByteArray): String = bytes.joinToString("") { "%02x".format(it) }

    fun sha256(file: File): String {
      val digest = MessageDigest.getInstance("SHA-256")
      file.inputStream().use { from ->
        val buffer = ByteArray(256 * 1024)
        while (true) {
          val n = from.read(buffer)
          if (n < 0) break
          digest.update(buffer, 0, n)
        }
      }
      return hex(digest.digest())
    }

    /** Whether `address` is in `network`/`prefix`, both IPv4. */
    fun within(address: InetAddress, network: InetAddress, prefix: Int): Boolean {
      val a = (address as? Inet4Address)?.address ?: return false
      val n = (network as? Inet4Address)?.address ?: return false
      for (i in 0 until 32) {
        if (i >= prefix) return true
        val bit = 7 - i % 8
        if ((a[i / 8].toInt() shr bit and 1) != (n[i / 8].toInt() shr bit and 1)) return false
      }
      return true
    }

    /** Whether `host` is an IPv4 address of a home network, a hotspot or this phone (as in a link nearby). */
    fun isNearbyHost(host: String): Boolean {
      val parts = host.split('.')
      if (parts.size != 4) return false
      val n = parts.map { p -> if (p.isEmpty() || p.length > 3 || !p.all { it in '0'..'9' }) return false else p.toInt() }
      if (n.any { it > 255 }) return false
      return n[0] == 10 || (n[0] == 172 && n[1] in 16..31) || (n[0] == 192 && n[1] == 168) || (n[0] == 169 && n[1] == 254) || n[0] == 127
    }
  }
}

/**
 * Takes the APK a phone nearby gives (ApkServer above) into `dest`: over a plain socket, as
 * Android's HTTP clients refuse plain HTTP to apps that do not allow it, and only from an address
 * of a network nearby. Its SHA-256 must be the one the QR code said, or nothing is kept. Says why
 * not, or null when it is in `dest`.
 */
internal class ApkFetch(private val host: String, private val port: Int, private val token: String, private val sha256: String) {
  @Volatile var received = 0L
    private set
  @Volatile var total = 0L
    private set
  @Volatile private var socket: Socket? = null
  @Volatile private var cancelled = false

  fun cancel() {
    cancelled = true
    runCatching { socket?.close() }
  }

  fun fetch(dest: File): String? {
    if (!ApkServer.isNearbyHost(host) || port !in 1..65535 || !TOKEN.matches(token) || !SHA.matches(sha256)) return "link"
    dest.parentFile?.mkdirs()
    dest.delete()
    val error = try {
      download(dest)
    } catch (_: Exception) {
      if (cancelled) "cancelled" else "network"
    } finally {
      socket = null
    }
    if (error != null) dest.delete()
    return error
  }

  private fun download(dest: File): String? =
      Socket().use { s ->
        socket = s
        if (cancelled) return "cancelled"
        s.connect(InetSocketAddress(InetAddress.getByName(host), port), 10_000)
        s.soTimeout = 20_000
        s.getOutputStream().apply {
          write("GET /$token/${ApkServer.APK} HTTP/1.0\r\nHost: $host:$port\r\nConnection: close\r\n\r\n".toByteArray(Charsets.US_ASCII))
          flush()
        }
        val input = BufferedInputStream(s.getInputStream())
        val status = ApkServer.readLine(input) ?: return "network"
        if (status.split(' ').getOrNull(1) != "200") return "gone"
        var length = -1L
        while (true) {
          val header = ApkServer.readLine(input) ?: return "network"
          if (header.isEmpty()) break
          val name = header.substringBefore(':').trim().lowercase()
          if (name == "content-length") length = header.substringAfter(':').trim().toLongOrNull() ?: -1
        }
        if (length <= 0 || length > MOST) return "size"
        total = length
        val digest = MessageDigest.getInstance("SHA-256")
        FileOutputStream(dest).use { to ->
          val buffer = ByteArray(64 * 1024)
          while (received < length) {
            val n = input.read(buffer, 0, minOf(buffer.size.toLong(), length - received).toInt())
            if (n < 0) break
            digest.update(buffer, 0, n)
            to.write(buffer, 0, n)
            received += n
          }
        }
        when {
          received != length -> "short"
          !MessageDigest.isEqual(ApkServer.hex(digest.digest()).toByteArray(), sha256.toByteArray()) -> "hash"
          else -> null
        }
      }

  companion object {
    private val TOKEN = Regex("^[0-9a-f]{32}$")
    private val SHA = Regex("^[0-9a-f]{64}$")
    /** No Erevos is this big; a bigger answer is not one. */
    private const val MOST = 400L * 1024 * 1024
  }
}
