// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { deflateSync, Inflate } from 'fflate';

// Messages packed smaller before they are sealed (lib/e2e.ts), losing nothing: DEFLATE, as zip
// does. The core pads every message to one of a few sizes before it encrypts it (crates/erevos-core
// padding.rs BUCKETS), so the relays see only those; a message is packed only when that takes it
// to a smaller one, a long text say, so it goes in fewer LoRa pieces and fewer SMS, or over LoRa at
// all, and anything shorter goes as it did. Only to a contact whose Erevos said it reads them
// (Message.zp): one before reads a message only as it was. A packed message is PACKED and then the
// DEFLATE bytes; one not packed is JSON, which never starts with that byte. Self-contained on
// purpose, so it runs under plain Node for checks.

/** The first byte of a packed message. */
export const PACKED = 0x01;
// The sizes the core pads a message to, with one byte of its own after it (padding.rs).
const BUCKETS = [256, 1024, 4096, 16384];
// The most a packed message opens to: a few times the largest bucket, so one cannot be made that
// fills the phone's memory as it opens.
export const MOST_UNPACKED = 4 * 16384;
// What is given to DEFLATE to open at a time, so it stops soon after the most.
const STEP = 256;

// The size the core pads `length` bytes to, or Infinity when it takes none.
function bucketOf(length: number): number {
  return BUCKETS.find((b) => length < b) ?? Infinity;
}

/** `plain` packed, when that takes it to a smaller padded size; else null, and it goes as it is. */
export function packed(plain: Uint8Array): Uint8Array | null {
  if (plain.length < BUCKETS[0] || plain.length > MOST_UNPACKED) return null;
  const deflated = deflateSync(plain, { level: 9 });
  if (bucketOf(deflated.length + 1) >= bucketOf(plain.length)) return null;
  const out = new Uint8Array(deflated.length + 1);
  out[0] = PACKED;
  out.set(deflated, 1);
  return out;
}

/** A message as it was before it was packed, or as it is when it was not. Throws when it does not open, or opens to more than MOST_UNPACKED. */
export function unpacked(bytes: Uint8Array): Uint8Array {
  if (bytes[0] !== PACKED) return bytes;
  const parts: Uint8Array[] = [];
  let total = 0;
  let ended = false;
  const inflate = new Inflate((chunk, final) => {
    total += chunk.length;
    if (total > MOST_UNPACKED) throw new RangeError('A packed message opens to too much.');
    parts.push(chunk.slice());
    if (final) ended = true;
  });
  for (let at = 1; at < bytes.length; at += STEP) inflate.push(bytes.subarray(at, Math.min(at + STEP, bytes.length)), at + STEP >= bytes.length);
  if (!ended) throw new RangeError('A packed message ends too soon.');
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}
