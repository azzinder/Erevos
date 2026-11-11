// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// How long a voice message lasts, read from its sound once it is fetched (components/network-file.tsx):
// XMPP apps send one as a plain audio file (lib/xmpp-files.ts) that says nothing of its length
// beside it, so the file itself is read. What phones and computers record is understood: MP4 (.m4a,
// AAC, as Conversations, Monal and Erevos's own phones record), Ogg with Opus or Vorbis (.oga,
// .ogg, .opus, as Conversations on newer phones and Gajim record) and WAV. For anything else, or a
// file cut short, the length is not known, and the message shows without it. Nothing is played or
// decoded for it: only the headers are read. The Nostr chats' files are shown the same way.

/** The longest length believed: a file that says more is taken to say nothing. */
const LONGEST_MS = 24 * 3600_000;

const ascii = (bytes: Uint8Array, at: number, n: number) => String.fromCharCode(...bytes.subarray(at, at + n));
const u32 = (b: Uint8Array, at: number) => b[at] * 0x1000000 + ((b[at + 1] << 16) | (b[at + 2] << 8) | b[at + 3]);
const u32le = (b: Uint8Array, at: number) => b[at + 3] * 0x1000000 + ((b[at + 2] << 16) | (b[at + 1] << 8) | b[at]);
const u64 = (b: Uint8Array, at: number) => u32(b, at) * 0x100000000 + u32(b, at + 4);

const sane = (ms: number): number | null => (Number.isFinite(ms) && ms > 0 && ms <= LONGEST_MS ? Math.round(ms) : null);

/** How long a sound lasts, in milliseconds, as its file says: null when it does not say, or the file is none of those read here. */
export function soundLength(bytes: Uint8Array): number | null {
  if (bytes.length < 16) return null;
  try {
    if (ascii(bytes, 4, 4) === 'ftyp') return mp4Length(bytes);
    if (ascii(bytes, 0, 4) === 'OggS') return oggLength(bytes);
    if (ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 4) === 'WAVE') return wavLength(bytes);
  } catch {
    // Damaged: as one that says nothing.
  }
  return null;
}

/** The boxes of an MP4 between `from` and `to`, each by its type, where its content starts and ends. */
function boxes(b: Uint8Array, from: number, to: number): { type: string; start: number; end: number }[] {
  const found: { type: string; start: number; end: number }[] = [];
  let at = from;
  while (at + 8 <= to) {
    let size = u32(b, at);
    let head = 8;
    if (size === 1) {
      if (at + 16 > to) break;
      size = u64(b, at + 8);
      head = 16;
    } else if (size === 0) size = to - at;
    if (size < head || at + size > to) break;
    found.push({ type: ascii(b, at + 4, 4), start: at + head, end: at + size });
    at += size;
  }
  return found;
}

// MP4: the movie header (mvhd) in the movie box (moov), which a recorder writes at the end, says
// its duration in units of its timescale.
function mp4Length(b: Uint8Array): number | null {
  const moov = boxes(b, 0, b.length).find((box) => box.type === 'moov');
  const mvhd = moov ? boxes(b, moov.start, moov.end).find((box) => box.type === 'mvhd') : undefined;
  if (!mvhd) return null;
  const at = mvhd.start;
  const version = b[at];
  const scale = version === 1 ? u32(b, at + 20) : u32(b, at + 12);
  const duration = version === 1 ? u64(b, at + 24) : u32(b, at + 16);
  if (at + (version === 1 ? 32 : 20) > mvhd.end || !scale) return null;
  return sane((duration * 1000) / scale);
}

// Ogg: the granule position of the last page says how many samples came before its end; Opus
// counts at 48 kHz after its pre-skip, Vorbis at the rate its first header says.
function oggLength(b: Uint8Array): number | null {
  const segments = b[26];
  const start = 27 + segments;
  const serial = u32le(b, 14);
  let rate = 0;
  let skip = 0;
  if (ascii(b, start, 8) === 'OpusHead') {
    rate = 48_000;
    skip = b[start + 10] | (b[start + 11] << 8);
  } else if (ascii(b, start, 7) === '\x01vorbis') {
    rate = u32le(b, start + 12);
  }
  if (!rate) return null;
  // The last page of the same stream whose granule says something (-1 says no packet ends there).
  for (let at = b.length - 27; at >= 0; at--) {
    if (b[at] !== 0x4f || ascii(b, at, 4) !== 'OggS' || u32le(b, at + 14) !== serial) continue;
    const low = u32le(b, at + 6);
    const high = u32le(b, at + 10);
    if (low === 0xffffffff && high === 0xffffffff) continue;
    return sane(((high * 0x100000000 + low - skip) * 1000) / rate);
  }
  return null;
}

// WAV: the bytes of its sound (data) over how many go to a second (fmt).
function wavLength(b: Uint8Array): number | null {
  let perSecond = 0;
  for (let at = 12; at + 8 <= b.length; ) {
    const id = ascii(b, at, 4);
    const size = u32le(b, at + 4);
    if (id === 'fmt ' && at + 20 <= b.length) perSecond = u32le(b, at + 16);
    if (id === 'data') return perSecond ? sane((Math.min(size, b.length - at - 8) * 1000) / perSecond) : null;
    at += 8 + size + (size % 2);
  }
  return null;
}
