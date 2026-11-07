// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

package expo.modules.erevosdevice

import android.content.Context
import android.content.pm.PackageManager
import android.nfc.NdefMessage
import android.nfc.NdefRecord
import android.nfc.NfcAdapter
import android.nfc.cardemulation.HostApduService
import android.os.Bundle
import android.os.SystemClock

// An invite or a contact link, given by touching two phones (lib/nfc-share.ts): while Erevos shows
// one (Invite someone, My QR code), this phone answers as an NFC tag would, with one NDEF record,
// the link's https address (an NFC Forum Type 4 tag: its application, its capability file, its
// NDEF file). The other phone needs no app open: Android reads the tag by itself and opens the
// link, in Erevos where it is installed (app.json's App Links), else on Erevos's page, which offers
// it. Nothing else is ever answered: no link is set, or it is over (LASTS_MS, or Erevos let go of
// it), and the reader is told the application is not here. The link is no secret beyond what the
// QR code on the screen shows, and the phone must be unlocked (res/xml/erevos_nfc_share.xml).
class NfcShare : HostApduService() {
  override fun processCommandApdu(apdu: ByteArray?, extras: Bundle?): ByteArray {
    val command = apdu ?: return NOT_FOUND
    val file = current()
    if (file == null) {
      chosen = 0
      return NOT_FOUND
    }
    return when {
      startsWith(command, SELECT_APP) -> {
        chosen = 0
        OK
      }
      startsWith(command, SELECT_CC) -> {
        chosen = 1
        OK
      }
      startsWith(command, SELECT_NDEF) -> {
        chosen = 2
        OK
      }
      command.size >= 5 && command[0] == 0x00.toByte() && command[1] == 0xB0.toByte() -> {
        val bytes = when (chosen) {
          1 -> capability(file.size)
          2 -> file
          else -> return NOT_FOUND
        }
        val offset = ((command[2].toInt() and 0xFF) shl 8) or (command[3].toInt() and 0xFF)
        var length = command[4].toInt() and 0xFF
        if (length == 0) length = 256
        if (offset > bytes.size) return WRONG_OFFSET
        val end = minOf(bytes.size, offset + length)
        bytes.copyOfRange(offset, end) + OK
      }
      else -> UNKNOWN
    }
  }

  override fun onDeactivated(reason: Int) {
    chosen = 0
  }

  companion object {
    // How long a link set stays answered, if Erevos never lets go of it (closed while it showed).
    private const val LASTS_MS = 10 * 60_000L

    @Volatile private var ndef: ByteArray? = null
    @Volatile private var until = 0L
    @Volatile private var chosen = 0

    private val OK = byteArrayOf(0x90.toByte(), 0x00)
    private val NOT_FOUND = byteArrayOf(0x6A, 0x82.toByte())
    private val WRONG_OFFSET = byteArrayOf(0x6B, 0x00)
    private val UNKNOWN = byteArrayOf(0x6D, 0x00)
    // SELECT by name of the NDEF tag application, D2760000850101; then SELECT of the capability
    // container file, E103, and of the NDEF file, E104.
    private val SELECT_APP = byteArrayOf(0x00, 0xA4.toByte(), 0x04, 0x00, 0x07, 0xD2.toByte(), 0x76, 0x00, 0x00, 0x85.toByte(), 0x01, 0x01)
    private val SELECT_CC = byteArrayOf(0x00, 0xA4.toByte(), 0x00, 0x0C, 0x02, 0xE1.toByte(), 0x03)
    private val SELECT_NDEF = byteArrayOf(0x00, 0xA4.toByte(), 0x00, 0x0C, 0x02, 0xE1.toByte(), 0x04)

    private fun startsWith(bytes: ByteArray, start: ByteArray): Boolean =
      bytes.size >= start.size && start.indices.all { bytes[it] == start[it] }

    // The capability container: version 2.0, at most 255 bytes read or written at once, and the NDEF
    // file E104 of `size` bytes, read by anyone, written by no one.
    private fun capability(size: Int): ByteArray = byteArrayOf(
      0x00, 0x0F, 0x20, 0x00, 0xFF.toByte(), 0x00, 0xFF.toByte(),
      0x04, 0x06, 0xE1.toByte(), 0x04, (size shr 8).toByte(), size.toByte(), 0x00, 0xFF.toByte(),
    )

    private fun current(): ByteArray? {
      val file = ndef ?: return null
      if (SystemClock.elapsedRealtime() > until) {
        ndef = null
        return null
      }
      return file
    }

    /** Answers with `uri` from now (an https address), until stop, or LASTS_MS. False when too long for one tag file. */
    fun share(uri: String): Boolean {
      val message = NdefMessage(NdefRecord.createUri(uri)).toByteArray()
      if (message.size > 0x7FFF - 2) return false
      ndef = byteArrayOf((message.size shr 8).toByte(), message.size.toByte()) + message
      until = SystemClock.elapsedRealtime() + LASTS_MS
      chosen = 0
      return true
    }

    fun stop() {
      ndef = null
      chosen = 0
    }

    /** Whether this phone can answer as a tag, and NFC is on: "on", "off" (NFC off in Settings), or "none". */
    fun state(context: Context): String {
      if (!context.packageManager.hasSystemFeature(PackageManager.FEATURE_NFC_HOST_CARD_EMULATION)) return "none"
      val adapter = NfcAdapter.getDefaultAdapter(context) ?: return "none"
      return if (adapter.isEnabled) "on" else "off"
    }
  }
}
