// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { t } from './i18n';
// What a photo says besides its picture, taken out before it is sent: where it was taken, the
// phone, the time, thumbnails, notes. A JPEG keeps its picture exactly as it was, byte for byte,
// with only the segments that draw it (and its colour profile), and its turn (Orientation) in a
// new, minimal EXIF. Anything after the picture's end is left out too: phones append motion-photo
// videos and extra images there. A PNG keeps every chunk but the text, EXIF and time ones; a GIF its
// frames and loop count; a WebP every chunk but EXIF and XMP. Other
// kinds are not read here: the app makes a new JPEG of them instead (lib/pick-photo.ts).
// Self-contained on purpose, so it can run under plain Node for checks.

export class NotCleanError extends Error {
  constructor() {
    super(t('The photo could not be read.'));
  }
}

/** A photo's width and height as it is shown, its turn taken into account. Null if unknown. */
export type PhotoSize = { w: number; h: number } | null;

const ascii = (bytes: Uint8Array, at: number, text: string) =>
  at + text.length <= bytes.length && [...text].every((c, i) => bytes[at + i] === c.charCodeAt(0));

export function isJpeg(bytes: Uint8Array): boolean {
  return bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

export function isPng(bytes: Uint8Array): boolean {
  return bytes.length > 8 && PNG_SIGNATURE.every((b, i) => bytes[i] === b);
}

// The turn an EXIF segment's first image directory gives (1 to 8), or 1.
function exifOrientation(segment: Uint8Array): number {
  // "Exif\0\0", then a TIFF header: byte order, 42, where the first directory is.
  if (!ascii(segment, 0, 'Exif\0\0') || segment.length < 14) return 1;
  const tiff = new DataView(segment.buffer, segment.byteOffset + 6, segment.length - 6);
  const little = tiff.getUint16(0) === 0x4949;
  if (!little && tiff.getUint16(0) !== 0x4d4d) return 1;
  const ifd = tiff.getUint32(4, little);
  if (ifd + 2 > tiff.byteLength) return 1;
  const count = tiff.getUint16(ifd, little);
  for (let i = 0; i < count; i++) {
    const entry = ifd + 2 + i * 12;
    if (entry + 12 > tiff.byteLength) return 1;
    if (tiff.getUint16(entry, little) === 0x0112 && tiff.getUint16(entry + 2, little) === 3) {
      const value = tiff.getUint16(entry + 8, little);
      return value >= 1 && value <= 8 ? value : 1;
    }
  }
  return 1;
}

// An APP1 segment holding only the turn.
function orientationSegment(orientation: number): Uint8Array {
  const tiff = [0x4d, 0x4d, 0, 42, 0, 0, 0, 8, 0, 1, 0x01, 0x12, 0, 3, 0, 0, 0, 1, 0, orientation, 0, 0, 0, 0, 0, 0];
  const body = [...'Exif\0\0'].map((c) => c.charCodeAt(0)).concat(tiff);
  const length = body.length + 2;
  return Uint8Array.from([0xff, 0xe1, length >> 8, length & 0xff, ...body]);
}

// Segments kept besides those that draw the picture: APP0 JFIF (without its thumbnail), APP2 ICC
// colour profiles and APP14 Adobe (how the colours are stored).
function keptApp(marker: number, data: Uint8Array): Uint8Array | null {
  if (marker === 0xe0 && ascii(data, 0, 'JFIF\0') && data.length >= 14) {
    const jfif = data.slice(0, 14);
    jfif[12] = 0;
    jfif[13] = 0;
    return jfif;
  }
  if (marker === 0xe2 && ascii(data, 0, 'ICC_PROFILE\0')) return data;
  if (marker === 0xee && ascii(data, 0, 'Adobe')) return data;
  return null;
}

type Segment = { marker: number; data: Uint8Array };

/** A JPEG with only its picture, colour profile and turn. Throws NotCleanError if it cannot be read. */
export function cleanJpeg(bytes: Uint8Array): Uint8Array {
  if (!isJpeg(bytes)) throw new NotCleanError();
  const head: Uint8Array[] = [Uint8Array.of(0xff, 0xd8)];
  const rest: Uint8Array[] = [];
  let orientation = 1;
  let started = false;
  let at = 2;
  for (;;) {
    if (at >= bytes.length || bytes[at] !== 0xff) throw new NotCleanError();
    while (bytes[at] === 0xff && at < bytes.length) at++;
    const marker = bytes[at++];
    if (marker === undefined) throw new NotCleanError();
    if (marker === 0xd9) {
      rest.push(Uint8Array.of(0xff, 0xd9));
      break;
    }
    if ((marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) {
      rest.push(Uint8Array.of(0xff, marker));
      continue;
    }
    if (at + 2 > bytes.length) throw new NotCleanError();
    const length = (bytes[at] << 8) | bytes[at + 1];
    if (length < 2 || at + length > bytes.length) throw new NotCleanError();
    const segment: Segment = { marker, data: bytes.subarray(at + 2, at + length) };
    at += length;
    if (marker >= 0xe0 && marker <= 0xef) {
      if (marker === 0xe1) orientation = Math.max(orientation, exifOrientation(segment.data));
      const kept = keptApp(marker, segment.data);
      if (kept) (started || marker !== 0xe0 ? rest : head).push(withHeader(marker, kept));
      continue;
    }
    if (marker === 0xfe) continue;
    started = true;
    rest.push(bytes.subarray(at - length - 2, at));
    if (marker === 0xda) {
      // The picture's data runs to the next marker other than stuffing and restarts.
      const from = at;
      while (at + 1 < bytes.length && !(bytes[at] === 0xff && bytes[at + 1] !== 0x00 && !(bytes[at + 1] >= 0xd0 && bytes[at + 1] <= 0xd7))) at++;
      if (at + 1 >= bytes.length) throw new NotCleanError();
      rest.push(bytes.subarray(from, at));
    }
  }
  const parts = [...head, ...(orientation > 1 ? [orientationSegment(orientation)] : []), ...rest];
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let to = 0;
  for (const part of parts) {
    out.set(part, to);
    to += part.length;
  }
  return out;
}

function withHeader(marker: number, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(4 + data.length);
  out.set([0xff, marker, (data.length + 2) >> 8, (data.length + 2) & 0xff]);
  out.set(data, 4);
  return out;
}

const PNG_DROPPED = new Set(['tEXt', 'zTXt', 'iTXt', 'eXIf', 'tIME']);

/** A PNG without its text, EXIF and time chunks. Throws NotCleanError if it cannot be read. */
export function cleanPng(bytes: Uint8Array): Uint8Array {
  if (!isPng(bytes)) throw new NotCleanError();
  const kept: Uint8Array[] = [bytes.subarray(0, 8)];
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let at = 8;
  for (;;) {
    if (at + 12 > bytes.length) throw new NotCleanError();
    const length = view.getUint32(at);
    const end = at + 12 + length;
    if (end > bytes.length) throw new NotCleanError();
    const type = String.fromCharCode(...bytes.subarray(at + 4, at + 8));
    if (!PNG_DROPPED.has(type)) kept.push(bytes.subarray(at, end));
    at = end;
    if (type === 'IEND') break;
  }
  const out = new Uint8Array(kept.reduce((n, p) => n + p.length, 0));
  let to = 0;
  for (const part of kept) {
    out.set(part, to);
    to += part.length;
  }
  return out;
}

/** How wide and high a JPEG or PNG shows, from its header. */
export function photoSize(bytes: Uint8Array): PhotoSize {
  if (isPng(bytes) && bytes.length >= 24 && ascii(bytes, 12, 'IHDR')) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    return { w: view.getUint32(16), h: view.getUint32(20) };
  }
  if (!isJpeg(bytes)) return null;
  let orientation = 1;
  let at = 2;
  while (at + 4 <= bytes.length && bytes[at] === 0xff) {
    const marker = bytes[at + 1];
    const length = (bytes[at + 2] << 8) | bytes[at + 3];
    if (marker === 0xe1) orientation = exifOrientation(bytes.subarray(at + 4, at + 2 + length));
    // Start of frame: every SOFn but DHT (C4), JPG (C8) and DAC (CC).
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      if (at + 9 > bytes.length) return null;
      const h = (bytes[at + 5] << 8) | bytes[at + 6];
      const w = (bytes[at + 7] << 8) | bytes[at + 8];
      return orientation >= 5 ? { w: h, h: w } : { w, h };
    }
    if (marker === 0xda || length < 2) return null;
    at += 2 + length;
  }
  return null;
}

/** The largest photo sent as a file that is cleaned (cleanImage): read whole into memory for it. */
export const CLEAN_MOST = 64 * 1000 * 1000;

export function isGif(bytes: Uint8Array): boolean {
  return ascii(bytes, 0, 'GIF87a') || ascii(bytes, 0, 'GIF89a');
}

export function isWebp(bytes: Uint8Array): boolean {
  return ascii(bytes, 0, 'RIFF') && ascii(bytes, 8, 'WEBP');
}

// The application blocks a GIF keeps: how many times it plays (Netscape's, and its older twin).
const GIF_KEPT_APPS = new Set(['NETSCAPE2.0', 'ANIMEXTS1.0']);

/**
 * A GIF with only its frames and how they play: without comments and the blocks other apps write
 * (XMP, with its place and time, and the like), and nothing after its end. Throws NotCleanError if
 * it cannot be read.
 */
export function cleanGif(bytes: Uint8Array): Uint8Array {
  if (!isGif(bytes) || bytes.length < 13) throw new NotCleanError();
  const kept: Uint8Array[] = [];
  // Header and logical screen, with the global colour table if it has one.
  let at = 13;
  if (bytes[10] & 0x80) at += 3 * (1 << ((bytes[10] & 0x07) + 1));
  if (at > bytes.length) throw new NotCleanError();
  kept.push(bytes.subarray(0, at));
  // Data sub-blocks, from `from` to the empty one that ends them: where they end.
  const subBlocks = (from: number): number => {
    let i = from;
    for (;;) {
      if (i >= bytes.length) throw new NotCleanError();
      const size = bytes[i];
      i += 1 + size;
      if (size === 0) return i;
    }
  };
  for (;;) {
    if (at >= bytes.length) throw new NotCleanError();
    const kind = bytes[at];
    if (kind === 0x3b) {
      kept.push(Uint8Array.of(0x3b));
      break;
    }
    if (kind === 0x2c) {
      // An image: its descriptor, local colour table, LZW code size and data.
      if (at + 10 > bytes.length) throw new NotCleanError();
      let end = at + 10;
      if (bytes[at + 9] & 0x80) end += 3 * (1 << ((bytes[at + 9] & 0x07) + 1));
      end = subBlocks(end + 1);
      kept.push(bytes.subarray(at, end));
      at = end;
      continue;
    }
    if (kind !== 0x21 || at + 2 > bytes.length) throw new NotCleanError();
    const label = bytes[at + 1];
    const end = subBlocks(at + 2);
    // Graphic control (timing, transparency) and plain text stay; comments go, and application
    // blocks but the loop count.
    const app = label === 0xff && bytes[at + 2] === 11 ? String.fromCharCode(...bytes.subarray(at + 3, at + 14)) : '';
    if (label !== 0xfe && (label !== 0xff || GIF_KEPT_APPS.has(app))) kept.push(bytes.subarray(at, end));
    at = end;
  }
  return joined(kept);
}

// WebP chunks that say something besides the picture.
const WEBP_DROPPED = new Set(['EXIF', 'XMP ']);

/**
 * A WebP without its EXIF and XMP chunks (where and when it was taken, the phone), its colour
 * profile and frames kept. Throws NotCleanError if it cannot be read.
 */
export function cleanWebp(bytes: Uint8Array): Uint8Array {
  if (!isWebp(bytes)) throw new NotCleanError();
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const end = Math.min(bytes.length, 8 + view.getUint32(4, true));
  const kept: Uint8Array[] = [];
  let at = 12;
  while (at < end) {
    if (at + 8 > end) throw new NotCleanError();
    const type = String.fromCharCode(...bytes.subarray(at, at + 4));
    const size = view.getUint32(at + 4, true);
    const next = at + 8 + size + (size & 1);
    if (at + 8 + size > end) throw new NotCleanError();
    if (type === 'VP8X' && size >= 10) {
      // Its flags no longer say there is EXIF (bit 3) or XMP (bit 2).
      const chunk = bytes.slice(at, Math.min(next, end));
      chunk[8] &= ~0x0c;
      kept.push(chunk);
    } else if (!WEBP_DROPPED.has(type)) kept.push(bytes.subarray(at, Math.min(next, end)));
    at = next;
  }
  const body = joined(kept);
  const out = new Uint8Array(12 + body.length);
  out.set(bytes.subarray(0, 12));
  new DataView(out.buffer).setUint32(4, 4 + body.length, true);
  out.set(body, 12);
  return out;
}

/**
 * A photo of a kind cleaned here (JPEG, PNG, GIF, WebP) without what it says besides its picture,
 * or null for another kind, or one that cannot be read: HEIC and AVIF are not read here.
 */
export function cleanImage(bytes: Uint8Array): Uint8Array | null {
  try {
    if (isJpeg(bytes)) return cleanJpeg(bytes);
    if (isPng(bytes)) return cleanPng(bytes);
    if (isGif(bytes)) return cleanGif(bytes);
    if (isWebp(bytes)) return cleanWebp(bytes);
  } catch {
    // Not read: left as it is.
  }
  return null;
}

function joined(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let to = 0;
  for (const part of parts) {
    out.set(part, to);
    to += part.length;
  }
  return out;
}
