// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

package expo.modules.erevossms

import java.io.ByteArrayOutputStream
import java.nio.charset.Charset

/**
 * The few MMS messages a phone exchanges with its carrier, in their binary form (OMA MMS
 * encapsulation over WSP): a picture or text to send (m-send-req), the notice that one waits
 * (m-notification-ind), the message once fetched (m-retrieve-conf), and the answer that says it
 * was fetched (m-notifyresp-ind). Plain Kotlin, no Android, so it runs in a JVM check too.
 */
internal object MmsPdu {
  const val SEND_REQ = 0x80
  const val NOTIFICATION_IND = 0x82
  const val NOTIFYRESP_IND = 0x83
  const val RETRIEVE_CONF = 0x84

  private const val BCC = 0x81
  private const val CC = 0x82
  private const val CONTENT_LOCATION = 0x83
  private const val CONTENT_TYPE = 0x84
  private const val DATE = 0x85
  private const val FROM = 0x89
  private const val MESSAGE_ID = 0x8B
  private const val MESSAGE_TYPE = 0x8C
  private const val MMS_VERSION = 0x8D
  private const val MESSAGE_SIZE = 0x8E
  private const val STATUS = 0x95
  private const val SUBJECT = 0x96
  private const val TO = 0x97
  private const val TRANSACTION_ID = 0x98

  private const val VERSION_1_2 = 0x92
  private const val STATUS_RETRIEVED = 0x81
  private const val UTF8 = 106

  // Part headers.
  private const val PART_CONTENT_LOCATION = 0x8E
  private const val PART_CONTENT_ID = 0xC0
  private const val PARAM_CHARSET = 0x81
  private const val PARAM_NAME_OLD = 0x85
  private const val PARAM_NAME = 0x97

  /** WSP's numbered content types, the ones a phone meets. */
  private val TYPES = mapOf(
    0x00 to "*/*", 0x01 to "text/*", 0x02 to "text/html", 0x03 to "text/plain", 0x06 to "text/x-vcalendar",
    0x07 to "text/x-vcard", 0x1C to "image/*", 0x1D to "image/gif", 0x1E to "image/jpeg", 0x1F to "image/tiff",
    0x20 to "image/png", 0x21 to "image/vnd.wap.wbmp", 0x22 to "application/vnd.wap.multipart.*",
    0x23 to "application/vnd.wap.multipart.mixed", 0x26 to "application/vnd.wap.multipart.alternative",
    0x33 to "application/vnd.wap.multipart.related", 0x3E to "application/vnd.wap.mms-message",
  )
  private val NUMBERED = TYPES.entries.associate { (k, v) -> v to k }

  /** IANA charset numbers MMS uses for text. */
  private val CHARSETS = mapOf(3 to "US-ASCII", 4 to "ISO-8859-1", 106 to "UTF-8", 1000 to "UTF-16BE", 1015 to "UTF-16")

  class Part(val type: String, val data: ByteArray, val name: String = "", val charset: Int = 0) {
    val isText get() = type.startsWith("text/plain")
    fun text(): String = String(data, charsetOf(charset))
  }

  class Notification(val transactionId: String, val location: String, val from: String, val size: Long)

  class Message(val transactionId: String, val messageId: String, val from: String, val to: List<String>, val date: Long, val subject: String, val parts: List<Part>)

  fun charsetOf(number: Int): Charset =
    try {
      Charset.forName(CHARSETS[number] ?: "UTF-8")
    } catch (_: Exception) {
      Charsets.UTF_8
    }

  // --- Writing ---------------------------------------------------------------------------------

  private class Out {
    val bytes = ByteArrayOutputStream()
    fun byte(b: Int) = bytes.write(b)
    fun all(b: ByteArray) = bytes.write(b, 0, b.size)
    fun text(s: String) {
      val b = s.toByteArray(Charsets.UTF_8)
      if (b.isNotEmpty() && (b[0].toInt() and 0xFF) >= 0x80) byte(0x7F)
      all(b)
      byte(0)
    }
    fun uintvar(value: Long) {
      var v = value
      val groups = ArrayList<Int>()
      do {
        groups.add((v and 0x7F).toInt())
        v = v ushr 7
      } while (v > 0)
      for (i in groups.indices.reversed()) byte(if (i > 0) groups[i] or 0x80 else groups[i])
    }
    fun valueLength(n: Int) {
      if (n < 31) byte(n) else {
        byte(31)
        uintvar(n.toLong())
      }
    }
    fun toArray(): ByteArray = bytes.toByteArray()
  }

  private fun contentType(type: String, charset: Int = 0, name: String = ""): ByteArray {
    val inner = Out()
    val numbered = NUMBERED[type]
    if (numbered != null) inner.byte(numbered or 0x80) else inner.text(type)
    if (charset > 0) {
      inner.byte(PARAM_CHARSET)
      if (charset < 0x80) inner.byte(charset or 0x80) else {
        inner.byte(2)
        inner.byte(charset shr 8)
        inner.byte(charset and 0xFF)
      }
    }
    if (name.isNotEmpty()) {
      inner.byte(PARAM_NAME)
      inner.text(name)
    }
    val body = inner.toArray()
    if (charset == 0 && name.isEmpty()) return body
    val out = Out()
    out.valueLength(body.size)
    out.all(body)
    return out.toArray()
  }

  /** A message to send to `to` (numbers or e-mail addresses), its parts in order. */
  fun sendReq(transactionId: String, to: List<String>, parts: List<Part>): ByteArray {
    val out = Out()
    out.byte(MESSAGE_TYPE); out.byte(SEND_REQ)
    out.byte(TRANSACTION_ID); out.text(transactionId)
    out.byte(MMS_VERSION); out.byte(VERSION_1_2)
    // From: the carrier puts in this phone's number.
    out.byte(FROM); out.byte(1); out.byte(0x81)
    for (address in to) {
      out.byte(TO)
      out.text(if (address.contains('@')) address else "$address/TYPE=PLMN")
    }
    out.byte(CONTENT_TYPE); out.all(contentType("application/vnd.wap.multipart.mixed"))
    out.uintvar(parts.size.toLong())
    parts.forEachIndexed { i, part ->
      val name = part.name.ifEmpty { if (part.isText) "text_$i.txt" else "part_$i" }
      val headers = Out()
      headers.all(contentType(part.type, if (part.isText) UTF8 else 0, name))
      headers.byte(PART_CONTENT_LOCATION); headers.text(name)
      headers.byte(PART_CONTENT_ID); headers.byte(0x22); headers.text("<$i>")
      val h = headers.toArray()
      out.uintvar(h.size.toLong())
      out.uintvar(part.data.size.toLong())
      out.all(h)
      out.all(part.data)
    }
    return out.toArray()
  }

  /** Tells the carrier a message was fetched, so it does not announce it again. */
  fun notifyResp(transactionId: String): ByteArray {
    val out = Out()
    out.byte(MESSAGE_TYPE); out.byte(NOTIFYRESP_IND)
    out.byte(TRANSACTION_ID); out.text(transactionId)
    out.byte(MMS_VERSION); out.byte(VERSION_1_2)
    out.byte(STATUS); out.byte(STATUS_RETRIEVED)
    return out.toArray()
  }

  // --- Reading ---------------------------------------------------------------------------------

  class Malformed(message: String) : Exception(message)

  private class In(val b: ByteArray, var at: Int = 0, val end: Int = b.size) {
    fun more() = at < end
    fun peek(): Int = if (at < end) b[at].toInt() and 0xFF else throw Malformed("Cut short")
    fun byte(): Int = peek().also { at++ }
    fun take(n: Int): ByteArray {
      if (n < 0 || at + n > end) throw Malformed("Cut short")
      return b.copyOfRange(at, at + n).also { at += n }
    }
    fun uintvar(): Long {
      var v = 0L
      repeat(5) {
        val c = byte()
        v = (v shl 7) or (c and 0x7F).toLong()
        if (c and 0x80 == 0) return v
      }
      throw Malformed("Bad length")
    }
    /** A length or a count, which is never more than the bytes left, so it fits an Int. */
    fun size(): Int {
      val v = uintvar()
      if (v > end - at) throw Malformed("Cut short")
      return v.toInt()
    }
    fun textBytes(): ByteArray {
      if (peek() == 0x7F || peek() == 0x22) at++
      val start = at
      while (at < end && b[at].toInt() != 0) at++
      val out = b.copyOfRange(start, at)
      if (at < end) at++
      return out
    }
    fun text(): String = String(textBytes(), Charsets.UTF_8)
    /** A value's length if it starts with one (0..31), else -1 and nothing read. */
    fun valueLength(): Int {
      val c = peek()
      if (c < 31) { at++; return c }
      if (c == 31) { at++; return size() }
      return -1
    }
    fun longInteger(): Long {
      val c = peek()
      if (c >= 0x80) return (byte() and 0x7F).toLong()
      val n = byte()
      if (n > 8) throw Malformed("Bad number")
      var v = 0L
      repeat(n) { v = (v shl 8) or byte().toLong() }
      return v
    }
    /** Steps over any header value. */
    fun skipValue() {
      val c = peek()
      when {
        c < 31 -> { at++; at += c }
        c == 31 -> { at++; at += size() }
        c < 0x80 -> textBytes()
        else -> at++
      }
      if (at > end) throw Malformed("Cut short")
    }
    /** Text, plain or with its charset first. */
    fun encodedString(): String {
      val n = valueLength()
      if (n < 0) return text()
      val stop = at + n
      val charset = if (peek() >= 0x80) byte() and 0x7F else longInteger().toInt()
      val raw = textBytes()
      at = stop
      return String(raw, charsetOf(charset))
    }
  }

  private fun address(raw: String): String = raw.substringBefore("/TYPE=").trim()

  private class ContentType(val type: String, val charset: Int, val name: String)

  private fun readContentType(input: In): ContentType {
    val n = input.valueLength()
    if (n < 0) {
      val type = if (input.peek() >= 0x80) TYPES[input.byte() and 0x7F] ?: "application/octet-stream" else input.text()
      return ContentType(type, 0, "")
    }
    val stop = input.at + n
    val type = when {
      input.peek() >= 0x80 -> TYPES[input.byte() and 0x7F] ?: "application/octet-stream"
      input.peek() < 31 -> {
        // A numbered type above 127, as a long integer.
        val number = input.longInteger().toInt()
        TYPES[number] ?: "application/octet-stream"
      }
      else -> input.text()
    }
    var charset = 0
    var name = ""
    while (input.at < stop) {
      val c = input.peek()
      if (c >= 0x80) {
        input.at++
        when (c) {
          PARAM_CHARSET -> charset = input.longInteger().toInt()
          PARAM_NAME, PARAM_NAME_OLD -> name = input.text()
          else -> input.skipValue()
        }
      } else {
        // A parameter named in text: its value is text too.
        input.text()
        input.skipValue()
      }
    }
    input.at = stop
    return ContentType(type, charset, name)
  }

  private fun readParts(input: In): List<Part> {
    val count = input.size()
    val parts = ArrayList<Part>()
    repeat(count) {
      val headersLength = input.size()
      val dataLength = input.size()
      val headersEnd = input.at + headersLength
      if (headersEnd > input.end) throw Malformed("Cut short")
      val headers = In(input.b, input.at, headersEnd)
      val type = readContentType(headers)
      var name = type.name
      while (headers.more()) {
        val c = headers.peek()
        if (c >= 0x80) {
          headers.at++
          if (c == PART_CONTENT_LOCATION && name.isEmpty()) name = headers.text() else headers.skipValue()
        } else {
          headers.text()
          headers.skipValue()
        }
      }
      input.at = headersEnd
      parts.add(Part(type.type, input.take(dataLength), name, type.charset))
    }
    return parts
  }

  private fun readFrom(input: In): String {
    val n = input.valueLength()
    if (n < 0) return address(input.encodedString())
    val stop = input.at + n
    val token = input.byte()
    val from = if (token == 0x80 && input.at < stop) address(input.encodedString()) else ""
    input.at = stop
    return from
  }

  /** The message type of a PDU, or -1. */
  fun typeOf(pdu: ByteArray): Int =
    if (pdu.size >= 2 && (pdu[0].toInt() and 0xFF) == MESSAGE_TYPE) pdu[1].toInt() and 0xFF else -1

  private class Headers(var type: Int = -1, var transactionId: String = "", var messageId: String = "", var location: String = "", var from: String = "", val to: MutableList<String> = ArrayList(), var date: Long = 0, var subject: String = "", var size: Long = 0, var parts: List<Part> = emptyList())

  private fun read(pdu: ByteArray): Headers {
    val input = In(pdu)
    val h = Headers()
    while (input.more()) {
      val field = input.byte()
      if (field < 0x80) {
        // An application header: name and value as text.
        input.at--
        input.text()
        input.skipValue()
        continue
      }
      when (field) {
        MESSAGE_TYPE -> h.type = input.byte()
        TRANSACTION_ID -> h.transactionId = input.text()
        MESSAGE_ID -> h.messageId = input.text()
        CONTENT_LOCATION -> h.location = input.text()
        FROM -> h.from = readFrom(input)
        TO -> h.to.add(address(input.encodedString()))
        CC, BCC -> input.skipValue()
        DATE -> h.date = input.longInteger()
        SUBJECT -> h.subject = input.encodedString()
        MESSAGE_SIZE -> h.size = input.longInteger()
        CONTENT_TYPE -> {
          val type = readContentType(input)
          // Content-Type is the last header: the body follows.
          h.parts = if (type.type.startsWith("application/vnd.wap.multipart")) readParts(input)
            else listOf(Part(type.type, input.take(input.end - input.at), type.name, type.charset))
          return h
        }
        else -> input.skipValue()
      }
    }
    return h
  }

  fun notification(pdu: ByteArray): Notification {
    val h = read(pdu)
    if (h.type != NOTIFICATION_IND) throw Malformed("Not an MMS notice")
    if (h.location.isEmpty()) throw Malformed("The notice has no address")
    return Notification(h.transactionId, h.location, h.from, h.size)
  }

  fun message(pdu: ByteArray): Message {
    val h = read(pdu)
    if (h.type != RETRIEVE_CONF && h.type != SEND_REQ) throw Malformed("Not an MMS message")
    return Message(h.transactionId, h.messageId, h.from, h.to, h.date, h.subject, h.parts)
  }
}
