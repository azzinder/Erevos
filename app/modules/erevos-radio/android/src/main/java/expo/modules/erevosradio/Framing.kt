// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

package expo.modules.erevosradio

import java.io.DataInputStream
import java.io.DataOutputStream
import java.io.IOException

/**
 * Same layout as crates/erevos-core/src/frame.rs: a 4-byte big-endian length,
 * then the payload.
 */
object Framing {
  const val MAX_FRAME = 16 * 1024 + 64

  fun write(out: DataOutputStream, payload: ByteArray) {
    require(payload.size <= MAX_FRAME) { "frame too large: ${payload.size}" }
    out.writeInt(payload.size)
    out.write(payload)
    out.flush()
  }

  fun read(input: DataInputStream): ByteArray {
    val length = input.readInt()
    if (length < 0 || length > MAX_FRAME) throw IOException("bad frame length $length")
    return ByteArray(length).also { input.readFully(it) }
  }
}
