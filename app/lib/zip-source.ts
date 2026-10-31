// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { Inflate } from 'fflate';

import type { Source } from './attachments';
import { utf8Decode } from './crypto';
import { t } from './i18n';

// The files in a zip (a chat export with its photos and videos, lib/imports.ts), read a piece at a
// time from where the zip is, never whole: an export with its videos can be larger than the phone's
// memory. The zip's central directory, zip64 for zips over 4 GB, and files stored as they are or
// deflated. Encrypted zips, and files packed in other ways, are refused.

/** A file in the zip: its name (with its folders), how it is packed, its sizes and where it starts. */
export type ZipEntry = { name: string; method: number; compressed: number; size: number; offset: number };

const LOCAL = 0x04034b50;
const CENTRAL = 0x02014b50;
const END = 0x06054b50;
const END64 = 0x06064b50;
const LOCATOR64 = 0x07064b50;
const MOST_32 = 0xffffffff;
// How much is read of the zip at a time to inflate a file.
const PIECE = 256 * 1024;

const u16 = (b: Uint8Array, at: number) => b[at] | (b[at + 1] << 8);
const u32 = (b: Uint8Array, at: number) => (b[at] | (b[at + 1] << 8) | (b[at + 2] << 16)) + b[at + 3] * 0x1000000;
const u64 = (b: Uint8Array, at: number) => u32(b, at) + u32(b, at + 4) * 0x100000000;

export class ZipError extends Error {}

const damaged = () => new ZipError(t('The zip is damaged.'));
const unreadable = () => new ZipError(t('The zip is encrypted, or packed in a way Erevos cannot read.'));

/** Whether `source` starts as a zip does. */
export async function isZip(source: Source): Promise<boolean> {
  return source.size >= 4 && u32(await source.read(0, 4), 0) === LOCAL;
}

/** The files in the zip, in its order, without its folders. Throws ZipError for one that is damaged or encrypted. */
export async function zipEntries(zip: Source): Promise<ZipEntry[]> {
  // The end record is the last thing in the zip, before a comment of at most 64 KB.
  const tailLength = Math.min(zip.size, 22 + 0xffff);
  const tail = await zip.read(zip.size - tailLength, tailLength);
  let end = -1;
  for (let at = tail.length - 22; at >= 0; at--) {
    if (u32(tail, at) === END) {
      end = at;
      break;
    }
  }
  if (end < 0) throw damaged();
  let count = u16(tail, end + 10);
  let length = u32(tail, end + 12);
  let start = u32(tail, end + 16);
  // A zip64 has a locator just before the end record, which says where its own end record is.
  if (end >= 20 && u32(tail, end - 20) === LOCATOR64) {
    const record = await zip.read(u64(tail, end - 12), 56);
    if (record.length < 56 || u32(record, 0) !== END64) throw damaged();
    count = u64(record, 32);
    length = u64(record, 40);
    start = u64(record, 48);
  }
  if (start + length > zip.size) throw damaged();
  const dir = await zip.read(start, length);
  const entries: ZipEntry[] = [];
  let at = 0;
  for (let n = 0; n < count; n++) {
    if (at + 46 > dir.length || u32(dir, at) !== CENTRAL) throw damaged();
    const flags = u16(dir, at + 8);
    const method = u16(dir, at + 10);
    let compressed = u32(dir, at + 20);
    let size = u32(dir, at + 24);
    const nameLength = u16(dir, at + 28);
    const extraLength = u16(dir, at + 30);
    const commentLength = u16(dir, at + 32);
    let offset = u32(dir, at + 42);
    const name = utf8Decode(dir.subarray(at + 46, at + 46 + nameLength));
    // The zip64 field holds, in this order, the sizes and the start that did not fit in 32 bits.
    let extra = at + 46 + nameLength;
    const extraEnd = Math.min(dir.length, extra + extraLength);
    while (extra + 4 <= extraEnd) {
      const id = u16(dir, extra);
      const fieldLength = u16(dir, extra + 2);
      if (id === 1) {
        let field = extra + 4;
        if (size === MOST_32) {
          size = u64(dir, field);
          field += 8;
        }
        if (compressed === MOST_32) {
          compressed = u64(dir, field);
          field += 8;
        }
        if (offset === MOST_32) offset = u64(dir, field);
      }
      extra += 4 + fieldLength;
    }
    if (flags & 1) throw unreadable();
    if (!name.endsWith('/')) entries.push({ name, method, compressed, size, offset });
    at += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

/**
 * One file of the zip, to read as it was before it was packed. A deflated one is opened in order,
 * as it is kept (lib/attachments.ts keepFile); a read from further back starts it again.
 */
export async function entrySource(zip: Source, entry: ZipEntry): Promise<Source> {
  if (entry.method !== 0 && entry.method !== 8) throw unreadable();
  const head = await zip.read(entry.offset, 30);
  if (head.length < 30 || u32(head, 0) !== LOCAL) throw damaged();
  const start = entry.offset + 30 + u16(head, 26) + u16(head, 28);
  if (start + entry.compressed > zip.size) throw damaged();
  const size = entry.size;
  const fits = (at: number, length: number) => Math.max(0, Math.min(length, size - at));
  if (entry.method === 0) {
    if (entry.compressed !== size) throw damaged();
    return { size, read: (at, length) => zip.read(start + at, fits(at, length)) };
  }

  // What has been opened and not read yet, from `first` on.
  let parts: Uint8Array[] = [];
  let first = 0;
  let held = 0;
  let taken = 0;
  let inflate: Inflate;
  const restart = () => {
    parts = [];
    first = 0;
    held = 0;
    taken = 0;
    inflate = new Inflate((data) => {
      if (data.length === 0) return;
      parts.push(data);
      held += data.length;
    });
  };
  restart();
  const more = async () => {
    const length = Math.min(PIECE, entry.compressed - taken);
    const piece = await zip.read(start + taken, length);
    if (piece.length !== length) throw damaged();
    taken += length;
    try {
      inflate.push(piece, taken >= entry.compressed);
    } catch {
      throw damaged();
    }
  };
  // Takes `count` bytes off the front of what is held: into `out` at `into`, or dropped.
  const takeFront = (count: number, out?: Uint8Array, into = 0) => {
    while (count > 0) {
      const part = parts[0];
      const used = Math.min(count, part.length);
      out?.set(part.subarray(0, used), into);
      into += used;
      if (used === part.length) parts.shift();
      else parts[0] = part.subarray(used);
      held -= used;
      first += used;
      count -= used;
    }
  };
  return {
    size,
    read: async (at, length) => {
      const wanted = fits(at, length);
      if (at < first) restart();
      while (first + held < at + wanted) {
        if (taken >= entry.compressed) throw damaged();
        await more();
      }
      takeFront(at - first);
      const out = new Uint8Array(wanted);
      takeFront(wanted, out);
      return out;
    },
  };
}

/** One file of the zip, whole. Throws ZipError above `most` bytes. */
export async function readEntry(zip: Source, entry: ZipEntry, most: number): Promise<Uint8Array> {
  if (entry.size > most) throw new ZipError(t('A file in the zip is too large.'));
  const source = await entrySource(zip, entry);
  return source.read(0, entry.size);
}
