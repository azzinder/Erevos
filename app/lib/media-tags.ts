// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { utf8Decode } from './crypto';

// What a song or video says of itself, read from the first bytes of the file (the page's player,
// lib/collection-desk-player.ts, reads the first chunks, decrypted in memory only): its title,
// artist, album and cover, from ID3v2 tags (MP3), an MP4's or M4A's own (moov/udta/meta/ilst, when
// they are near its start) and FLAC's Vorbis comments and picture. Shown on the player's screen
// inside Erevos only. On Android Media3 reads them itself (Playing.kt). Anything not as it should
// be is left out, never guessed.

export type MediaTags = { title?: string; artist?: string; album?: string; picture?: { mime: string; bytes: Uint8Array } };

/** The tags at the start of a file (`head`, its first bytes), or {} when there are none it can read. */
export function readTags(head: Uint8Array): MediaTags {
  try {
    if (head.length >= 10 && ascii(head, 0, 3) === 'ID3') return id3(head);
    if (head.length >= 4 && ascii(head, 0, 4) === 'fLaC') return flac(head);
    if (head.length >= 8 && ascii(head, 4, 4) === 'ftyp') return mp4(head);
  } catch {
    // A tag cut short or not as it should be: nothing of it.
  }
  return {};
}

const ascii = (b: Uint8Array, at: number, n: number) => String.fromCharCode(...b.subarray(at, at + n));
const be32 = (b: Uint8Array, at: number) => ((b[at] << 24) | (b[at + 1] << 16) | (b[at + 2] << 8) | b[at + 3]) >>> 0;
const le32 = (b: Uint8Array, at: number) => (b[at] | (b[at + 1] << 8) | (b[at + 2] << 16) | (b[at + 3] << 24)) >>> 0;
const synchsafe = (b: Uint8Array, at: number) => ((b[at] & 0x7f) << 21) | ((b[at + 1] & 0x7f) << 14) | ((b[at + 2] & 0x7f) << 7) | (b[at + 3] & 0x7f);

const clean = (text: string) => {
  const first = text.split('\u0000').find((part) => part.trim() !== '') ?? '';
  return first.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, 300) || undefined;
};

function latin1(b: Uint8Array): string {
  let out = '';
  for (const byte of b) out += String.fromCharCode(byte);
  return out;
}

function utf16(b: Uint8Array, bigEndian: boolean): string {
  let out = '';
  let at = 0;
  let be = bigEndian;
  if (b.length >= 2 && b[0] === 0xff && b[1] === 0xfe) {
    be = false;
    at = 2;
  } else if (b.length >= 2 && b[0] === 0xfe && b[1] === 0xff) {
    be = true;
    at = 2;
  }
  for (; at + 1 < b.length; at += 2) out += String.fromCharCode(be ? (b[at] << 8) | b[at + 1] : b[at] | (b[at + 1] << 8));
  return out;
}

// Text of ID3's encoding `encoding`: 0 Latin-1, 1 UTF-16 with its mark, 2 UTF-16BE, 3 UTF-8.
function id3Text(encoding: number, b: Uint8Array): string {
  if (encoding === 1) return utf16(b, false);
  if (encoding === 2) return utf16(b, true);
  if (encoding === 3) return utf8Decode(b);
  return latin1(b);
}

// Where the text that starts at `at` ends (its zero, one byte or two by the encoding), and past it.
function textEnd(b: Uint8Array, at: number, encoding: number): [number, number] {
  const wide = encoding === 1 || encoding === 2;
  for (let i = at; i < b.length; i += wide ? 2 : 1) {
    if (b[i] === 0 && (!wide || b[i + 1] === 0)) return [i, i + (wide ? 2 : 1)];
  }
  return [b.length, b.length];
}

const PICTURE_TYPES: Record<string, string> = { JPG: 'image/jpeg', PNG: 'image/png' };
const pictureMime = (mime: string) => (/^image\/(jpeg|jpg|png|webp|gif)$/i.test(mime) ? mime.toLowerCase().replace('jpg', 'jpeg') : null);

function id3(b: Uint8Array): MediaTags {
  const major = b[3];
  const flags = b[5];
  const end = Math.min(b.length, 10 + synchsafe(b, 6));
  let at = 10;
  if (flags & 0x40) at += major === 4 ? synchsafe(b, 10) : 4 + be32(b, 10);
  const tags: MediaTags = {};
  const small = major === 2;
  const names: Record<string, keyof Omit<MediaTags, 'picture'>> = small ? { TT2: 'title', TP1: 'artist', TAL: 'album' } : { TIT2: 'title', TPE1: 'artist', TALB: 'album' };
  while (at + (small ? 6 : 10) <= end) {
    const id = ascii(b, at, small ? 3 : 4);
    if (!/^[A-Z0-9]{3,4}$/.test(id)) break;
    const size = small ? (b[at + 3] << 16) | (b[at + 4] << 8) | b[at + 5] : major === 4 ? synchsafe(b, at + 4) : be32(b, at + 4);
    const start = at + (small ? 6 : 10);
    if (size <= 0 || start + size > end) break;
    const frame = b.subarray(start, start + size);
    const name = names[id];
    if (name && !tags[name]) tags[name] = clean(id3Text(frame[0], frame.subarray(1)));
    else if ((id === 'APIC' || id === 'PIC') && !tags.picture) {
      const encoding = frame[0];
      let mime: string | null;
      let p: number;
      if (small) {
        mime = PICTURE_TYPES[ascii(frame, 1, 3).toUpperCase()] ?? null;
        p = 4;
      } else {
        const [mimeEnd, after] = textEnd(frame, 1, 0);
        mime = pictureMime(latin1(frame.subarray(1, mimeEnd)));
        p = after;
      }
      const [, data] = textEnd(frame, p + 1, encoding);
      if (mime && data < frame.length) tags.picture = { mime, bytes: frame.slice(data) };
    }
    at = start + size;
  }
  return tags;
}

function flac(b: Uint8Array): MediaTags {
  const tags: MediaTags = {};
  let at = 4;
  for (;;) {
    if (at + 4 > b.length) break;
    const last = (b[at] & 0x80) !== 0;
    const type = b[at] & 0x7f;
    const length = (b[at + 1] << 16) | (b[at + 2] << 8) | b[at + 3];
    const start = at + 4;
    if (start + length > b.length) break;
    const block = b.subarray(start, start + length);
    if (type === 4) Object.assign(tags, vorbisComments(block), tags);
    else if (type === 6 && !tags.picture) {
      let p = 4;
      const mimeLength = be32(block, p);
      const mime = pictureMime(latin1(block.subarray(p + 4, p + 4 + mimeLength)));
      p += 4 + mimeLength;
      p += 4 + be32(block, p) + 16;
      const dataLength = be32(block, p);
      if (mime && p + 4 + dataLength <= block.length) tags.picture = { mime, bytes: block.slice(p + 4, p + 4 + dataLength) };
    }
    if (last) break;
    at = start + length;
  }
  return tags;
}

/** Vorbis comments (FLAC's, Ogg's): TITLE=, ARTIST=, ALBUM=. */
export function vorbisComments(b: Uint8Array): MediaTags {
  const tags: MediaTags = {};
  let at = 4 + le32(b, 0);
  const count = le32(b, at);
  at += 4;
  for (let i = 0; i < count && at + 4 <= b.length; i++) {
    const length = le32(b, at);
    const text = utf8Decode(b.subarray(at + 4, at + 4 + length));
    at += 4 + length;
    const eq = text.indexOf('=');
    const key = text.slice(0, eq).toUpperCase();
    const value = clean(text.slice(eq + 1));
    if (key === 'TITLE' && !tags.title) tags.title = value;
    else if (key === 'ARTIST' && !tags.artist) tags.artist = value;
    else if (key === 'ALBUM' && !tags.album) tags.album = value;
  }
  return tags;
}

// The boxes inside b[from, to): each with its type and where its contents lie.
function* boxes(b: Uint8Array, from: number, to: number): Generator<{ type: string; start: number; end: number }> {
  let at = from;
  while (at + 8 <= to) {
    let size = be32(b, at);
    const type = ascii(b, at + 4, 4);
    let start = at + 8;
    if (size === 1) {
      if (at + 16 > to || be32(b, at + 8) !== 0) return;
      size = be32(b, at + 12);
      start = at + 16;
    } else if (size === 0) size = to - at;
    if (size < start - at) return;
    const end = at + size;
    // A box that goes past what was read is not looked into.
    if (end > to) return;
    yield { type, start, end };
    at = end;
  }
}

function mp4(b: Uint8Array): MediaTags {
  const find = (from: number, to: number, type: string) => {
    for (const box of boxes(b, from, to)) if (box.type === type) return box;
    return null;
  };
  const moov = find(0, b.length, 'moov');
  const udta = moov && find(moov.start, moov.end, 'udta');
  const meta = udta && find(udta.start, udta.end, 'meta');
  // meta is a full box: four bytes of version and flags first.
  const ilst = meta && find(meta.start + 4, meta.end, 'ilst');
  if (!ilst) return {};
  const tags: MediaTags = {};
  for (const entry of boxes(b, ilst.start, ilst.end)) {
    const data = find(entry.start, entry.end, 'data');
    if (!data || data.end - data.start < 8) continue;
    const kind = be32(b, data.start) & 0xffffff;
    const value = b.subarray(data.start + 8, data.end);
    if (entry.type === '©nam' && kind === 1) tags.title = clean(utf8Decode(value));
    else if (entry.type === '©ART' && kind === 1) tags.artist = clean(utf8Decode(value));
    else if (entry.type === '©alb' && kind === 1) tags.album = clean(utf8Decode(value));
    else if (entry.type === 'covr' && !tags.picture && (kind === 13 || kind === 14)) tags.picture = { mime: kind === 13 ? 'image/jpeg' : 'image/png', bytes: value.slice() };
  }
  return tags;
}
