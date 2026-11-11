// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// Opus sound moved from one box to another, without decoding it: read from WebM (what Chrome,
// Electron and Safari record) and from Ogg (what Android 10 and later, Firefox, Element and Telegram
// record), and written as Ogg (RFC 7845), the box voice messages travel in, or as CAF, the only one
// Safari before iOS 18.4 and macOS 15.4 plays Opus from. The Opus packets go as they are, so
// nothing of the sound is lost and it takes a moment. lib/audio.web.ts uses it.

/** An Opus track: its head (OpusHead, RFC 7845 section 5.1) and its packets, in order. */
export type OpusTrack = { head: Uint8Array; packets: Uint8Array[] };

const text = (bytes: Uint8Array, at: number, length: number) => String.fromCharCode(...bytes.subarray(at, at + length));

// The samples of one frame (at 48 kHz) for each of the 32 configurations a packet's first byte
// names (RFC 6716 section 3.1): SILK 10 to 60 ms, hybrid 10 or 20 ms, CELT 2.5 to 20 ms.
function frameSamples(config: number): number {
  if (config < 12) return [480, 960, 1920, 2880][config & 3];
  if (config < 16) return [480, 960][config & 1];
  return [120, 240, 480, 960][config & 3];
}

/** How many samples (at 48 kHz) an Opus packet holds: 0 when it is not one. */
export function opusSamples(packet: Uint8Array): number {
  if (!packet.length) return 0;
  const code = packet[0] & 3;
  const frames = code === 0 ? 1 : code < 3 ? 2 : packet.length > 1 ? packet[1] & 0x3f : 0;
  const samples = frames * frameSamples(packet[0] >> 3);
  // 120 ms is the most one packet may hold.
  return samples <= 5760 ? samples : 0;
}

/** Whether these bytes are an Opus head that a player takes: one or two channels, or more with a map. */
export function isOpusHead(head: Uint8Array): boolean {
  return head.length >= 19 && text(head, 0, 8) === 'OpusHead' && head[8] >> 4 === 0 && head[9] >= 1 && (head[18] === 0 ? head[9] <= 2 : head.length >= 21 + head[9]);
}

// A head for a track that came with none: its channels, and the samples to drop at its start.
function makeHead(channels: number, preSkip: number): Uint8Array {
  const head = new Uint8Array(19);
  const view = new DataView(head.buffer);
  head.set([...'OpusHead'].map((c) => c.charCodeAt(0)));
  head[8] = 1;
  head[9] = channels;
  view.setUint16(10, Math.min(0xffff, Math.max(0, preSkip)), true);
  view.setUint32(12, 48_000, true);
  return head;
}

// --- Ogg (RFC 3533, RFC 7845) ---

// The CRC Ogg pages carry: polynomial 0x04c11db7, starting at 0, not reflected.
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let r = i << 24;
    for (let bit = 0; bit < 8; bit++) r = r & 0x80000000 ? (r << 1) ^ 0x04c11db7 : r << 1;
    table[i] = r >>> 0;
  }
  return table;
})();

/** The CRC of an Ogg page, its own four bytes of CRC counted as zero. */
export function oggCrc(page: Uint8Array): number {
  let crc = 0;
  for (let i = 0; i < page.length; i++) crc = ((crc << 8) ^ CRC_TABLE[((crc >>> 24) ^ (i >= 22 && i < 26 ? 0 : page[i])) & 0xff]) >>> 0;
  return crc;
}

const BEGINS = 2;
const ENDS = 4;
// Each page holds about a second of sound, as opusenc writes them.
const PAGE_SAMPLES = 48_000;

function oggPage(packets: Uint8Array[], granule: number, serial: number, sequence: number, flags: number): Uint8Array {
  const lacing: number[] = [];
  for (const packet of packets) {
    let left = packet.length;
    for (; left >= 255; left -= 255) lacing.push(255);
    lacing.push(left);
  }
  const page = new Uint8Array(27 + lacing.length + packets.reduce((sum, p) => sum + p.length, 0));
  const view = new DataView(page.buffer);
  page.set([0x4f, 0x67, 0x67, 0x53]);
  page[5] = flags;
  view.setUint32(6, granule % 2 ** 32, true);
  view.setUint32(10, Math.floor(granule / 2 ** 32), true);
  view.setUint32(14, serial >>> 0, true);
  view.setUint32(18, sequence, true);
  page[26] = lacing.length;
  page.set(lacing, 27);
  let at = 27 + lacing.length;
  for (const packet of packets) {
    page.set(packet, at);
    at += packet.length;
  }
  view.setUint32(22, oggCrc(page), true);
  return page;
}

/**
 * The track as an Ogg Opus file: its head and an empty comment header on pages of their own, then
 * the packets, about a second a page, each page saying how many samples have been by its end.
 * `serial` names the stream, as each file should have its own. Null when there is nothing to write.
 */
export function writeOgg(track: OpusTrack, serial: number): Uint8Array | null {
  const packets = track.packets.filter((p) => p.length > 0);
  if (!isOpusHead(track.head) || !packets.length) return null;
  // No vendor and no comments: nothing in the file tells what made it.
  const tags = new Uint8Array(16);
  tags.set([...'OpusTags'].map((c) => c.charCodeAt(0)));
  const pages = [oggPage([track.head], 0, serial, 0, BEGINS), oggPage([tags], 0, serial, 1, 0)];
  let group: Uint8Array[] = [];
  let segments = 0;
  let granule = 0;
  let pageStart = 0;
  for (const packet of packets) {
    const lacing = Math.floor(packet.length / 255) + 1;
    if (lacing > 255) return null;
    if (group.length && (segments + lacing > 255 || granule - pageStart >= PAGE_SAMPLES)) {
      pages.push(oggPage(group, granule, serial, pages.length, 0));
      group = [];
      segments = 0;
      pageStart = granule;
    }
    group.push(packet);
    segments += lacing;
    granule += opusSamples(packet);
  }
  pages.push(oggPage(group, granule, serial, pages.length, ENDS));
  return concat(pages);
}

/** The Opus track of an Ogg file (its first stream): null when it is not Ogg Opus. */
export function readOgg(bytes: Uint8Array): OpusTrack | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const packets: Uint8Array[] = [];
  let part: Uint8Array[] = [];
  let serial: number | null = null;
  let at = 0;
  while (at + 27 <= bytes.length) {
    if (text(bytes, at, 4) !== 'OggS' || bytes[at + 4] !== 0) return null;
    const count = bytes[at + 26];
    const pageSerial = view.getUint32(at + 14, true);
    serial ??= pageSerial;
    let body = at + 27 + count;
    if (body > bytes.length) return null;
    for (let i = 0; i < count; i++) {
      const length = bytes[at + 27 + i];
      if (body + length > bytes.length) return null;
      if (pageSerial === serial) {
        part.push(bytes.subarray(body, body + length));
        if (length < 255) {
          packets.push(concat(part));
          part = [];
        }
      }
      body += length;
    }
    at = body;
  }
  if (packets.length < 2 || !isOpusHead(packets[0]) || text(packets[1], 0, 8) !== 'OpusTags') return null;
  return { head: packets[0], packets: packets.slice(2) };
}

// --- WebM (Matroska) ---

// The elements whose insides are read: they may be of unknown size, as a recording made as it goes
// writes its Segment and Clusters. Every other element is stepped over whole.
const SEGMENT = 0x18538067;
const TRACKS = 0x1654ae6b;
const TRACK_ENTRY = 0xae;
const AUDIO = 0xe1;
const CLUSTER = 0x1f43b675;
const BLOCK_GROUP = 0xa0;
const INSIDE = new Set([SEGMENT, TRACKS, TRACK_ENTRY, AUDIO, CLUSTER, BLOCK_GROUP]);

const EBML = 0x1a45dfa3;
const TRACK_NUMBER = 0xd7;
const CODEC_ID = 0x86;
const CODEC_PRIVATE = 0x63a2;
const CODEC_DELAY = 0x56aa;
const CHANNELS = 0x9f;
const SIMPLE_BLOCK = 0xa3;
const BLOCK = 0xa1;

/** A number of EBML's own kind: an element's id (`id`, its first bit kept) or a size (`unknown` when all ones). */
function vint(bytes: Uint8Array, at: number, id = false): { value: number; length: number; unknown: boolean } | null {
  const first = bytes[at];
  if (first === undefined || first === 0) return null;
  const length = Math.clz32(first) - 23;
  if (at + length > bytes.length || (id && length > 4)) return null;
  const mask = 0xff >> length;
  let value = id ? first : first & mask;
  let ones = (first & mask) === mask;
  for (let i = 1; i < length; i++) {
    value = value * 256 + bytes[at + i];
    if (bytes[at + i] !== 0xff) ones = false;
  }
  return { value, length, unknown: !id && ones };
}

const uint = (data: Uint8Array) => data.reduce((n, b) => n * 256 + b, 0);

// A Block's or SimpleBlock's frames, for its track: laced (Xiph, fixed or EBML) or one alone.
function readBlock(data: Uint8Array): { track: number; frames: Uint8Array[] } | null {
  const track = vint(data, 0);
  if (!track || data.length < track.length + 3) return null;
  let at = track.length + 3;
  const lacing = (data[track.length + 2] >> 1) & 3;
  if (lacing === 0) return { track: track.value, frames: [data.subarray(at)] };
  if (at >= data.length) return null;
  const count = data[at++] + 1;
  const sizes: number[] = [];
  if (lacing === 1) {
    for (let i = 0; i < count - 1; i++) {
      let size = 0;
      let byte: number;
      do {
        byte = data[at++];
        if (byte === undefined) return null;
        size += byte;
      } while (byte === 255);
      sizes.push(size);
    }
  } else if (lacing === 3) {
    for (let i = 0; i < count - 1; i++) {
      const size = vint(data, at);
      if (!size) return null;
      at += size.length;
      // After the first, each is how much it differs from the one before, signed.
      sizes.push(i === 0 ? size.value : sizes[i - 1] + size.value - (2 ** (7 * size.length - 1) - 1));
    }
  }
  const rest = data.length - at - sizes.reduce((sum, s) => sum + s, 0);
  if (lacing === 2) {
    if (rest % count) return null;
    for (let i = 0; i < count; i++) sizes.push(rest / count);
  } else sizes.push(rest);
  if (sizes.some((s) => s < 0 || !Number.isInteger(s))) return null;
  const frames = sizes.map((size) => {
    const frame = data.subarray(at, at + size);
    at += size;
    return frame;
  });
  return { track: track.value, frames };
}

/** The Opus track of a WebM file, as a browser records it: null when it has none. */
export function readWebm(bytes: Uint8Array): OpusTrack | null {
  type Track = { number?: number; codec?: string; head?: Uint8Array; delay?: number; channels?: number };
  const tracks: Track[] = [];
  const blocks: { track: number; frames: Uint8Array[] }[] = [];
  let at = 0;
  while (at < bytes.length) {
    const id = vint(bytes, at, true);
    const size = id && vint(bytes, at + id.length);
    if (!id || !size) return null;
    if (at === 0 && id.value !== EBML) return null;
    const start = at + id.length + size.length;
    if (INSIDE.has(id.value)) {
      if (id.value === TRACK_ENTRY) tracks.push({});
      at = start;
      continue;
    }
    if (size.unknown) return null;
    // Cut short at its end: what came whole is kept.
    if (start + size.value > bytes.length) break;
    const data = bytes.subarray(start, start + size.value);
    const track = tracks[tracks.length - 1];
    if (id.value === SIMPLE_BLOCK || id.value === BLOCK) {
      const block = readBlock(data);
      if (!block) return null;
      blocks.push(block);
    } else if (track && id.value === TRACK_NUMBER) track.number = uint(data);
    else if (track && id.value === CODEC_ID) track.codec = text(data, 0, data.length).replace(/\0+$/, '');
    else if (track && id.value === CODEC_PRIVATE) track.head = data;
    else if (track && id.value === CODEC_DELAY) track.delay = uint(data);
    else if (track && id.value === CHANNELS) track.channels = uint(data);
    at = start + size.value;
  }
  const opus = tracks.find((track) => track.codec === 'A_OPUS' && track.number !== undefined);
  if (!opus) return null;
  // CodecDelay is in nanoseconds; an Opus head counts samples at 48 kHz.
  const head = opus.head && isOpusHead(opus.head) ? opus.head : makeHead(opus.channels ?? 1, Math.round(((opus.delay ?? 0) * 48_000) / 1e9));
  const packets = blocks.filter((block) => block.track === opus.number).flatMap((block) => block.frames.filter((frame) => frame.length > 0));
  return packets.length && isOpusHead(head) ? { head, packets } : null;
}

/** A WebM recording as Ogg Opus, its packets as they are: null when it holds no Opus. */
export function webmToOgg(bytes: Uint8Array, serial: number): Uint8Array | null {
  const track = readWebm(bytes);
  return track && writeOgg(track, serial);
}

// --- CAF (Apple's Core Audio Format) ---

// A frame's length in a packet of several (RFC 6716 section 3.2.1): one byte, or two from 252.
function frameLength(packet: Uint8Array, at: number): { length: number; bytes: number } | null {
  const first = packet[at];
  if (first === undefined) return null;
  if (first < 252) return { length: first, bytes: 1 };
  const second = packet[at + 1];
  return second === undefined ? null : { length: second * 4 + first, bytes: 2 };
}

/**
 * An Opus packet of several frames as a packet for each (RFC 6716 section 3.2), as Chrome
 * records 60 ms in one: each says the same configuration, and holds its frame alone. Null when it
 * cannot be read.
 */
export function splitOpus(packet: Uint8Array): Uint8Array[] | null {
  if (!packet.length) return null;
  const toc = packet[0] & 0xfc;
  const code = packet[0] & 3;
  const one = (frame: Uint8Array) => {
    const out = new Uint8Array(frame.length + 1);
    out[0] = toc;
    out.set(frame, 1);
    return out;
  };
  if (code === 0) return [packet];
  if (code === 1) {
    if ((packet.length - 1) % 2) return null;
    const half = (packet.length - 1) / 2;
    return [one(packet.subarray(1, 1 + half)), one(packet.subarray(1 + half))];
  }
  if (code === 2) {
    const first = frameLength(packet, 1);
    if (!first || 1 + first.bytes + first.length > packet.length) return null;
    const from = 1 + first.bytes;
    return [one(packet.subarray(from, from + first.length)), one(packet.subarray(from + first.length))];
  }
  if (packet.length < 2) return null;
  const count = packet[1] & 0x3f;
  const varying = (packet[1] & 0x80) !== 0;
  let at = 2;
  let end = packet.length;
  if (packet[1] & 0x40) {
    // Padding at the end: its length in bytes of 255 that go on, and one that ends it.
    let byte: number;
    do {
      byte = packet[at++];
      if (byte === undefined) return null;
      end -= byte === 255 ? 254 : byte;
    } while (byte === 255);
  }
  if (!count) return null;
  const lengths: number[] = [];
  if (varying) {
    for (let i = 0; i < count - 1; i++) {
      const length = frameLength(packet, at);
      if (!length) return null;
      at += length.bytes;
      lengths.push(length.length);
    }
    lengths.push(end - at - lengths.reduce((sum, n) => sum + n, 0));
  } else {
    if ((end - at) % count) return null;
    for (let i = 0; i < count; i++) lengths.push((end - at) / count);
  }
  if (lengths.some((n) => n < 0) || at + lengths.reduce((sum, n) => sum + n, 0) !== end) return null;
  return lengths.map((length) => {
    const frame = one(packet.subarray(at, at + length));
    at += length;
    return frame;
  });
}

/**
 * The track as a CAF file, laid out as Safari plays Opus from it before it played Ogg (iOS 18.4,
 * macOS 15.4): its description (48 kHz, every packet as long), the packets, and their sizes. A
 * packet of several frames of up to 20 ms goes as one for each, so a recording from Chrome goes in
 * 20 ms packets too. Null when the packets are not all as long.
 */
export function writeCaf(track: OpusTrack): Uint8Array | null {
  const packets: Uint8Array[] = [];
  for (const packet of track.packets) {
    if (!packet.length) continue;
    const parts = opusSamples(packet) > 960 && frameSamples(packet[0] >> 3) <= 960 ? splitOpus(packet) : [packet];
    if (!parts) return null;
    packets.push(...parts);
  }
  const frames = packets.length ? opusSamples(packets[0]) : 0;
  if (!frames || !isOpusHead(track.head) || packets.some((p) => opusSamples(p) !== frames)) return null;
  // Each packet's size, seven bits a byte, the high bit set on all but the last.
  const sizes: number[] = [];
  for (const packet of packets) {
    const bytes = [packet.length & 0x7f];
    for (let n = Math.floor(packet.length / 128); n; n = Math.floor(n / 128)) bytes.unshift(0x80 | (n & 0x7f));
    sizes.push(...bytes);
  }
  const data = packets.reduce((sum, p) => sum + p.length, 0);
  const out = new Uint8Array(8 + 12 + 32 + 12 + 4 + data + 12 + 24 + sizes.length);
  const view = new DataView(out.buffer);
  let at = 0;
  const name = (four: string) => {
    for (let i = 0; i < 4; i++) out[at++] = four.charCodeAt(i);
  };
  const u32 = (n: number) => {
    view.setUint32(at, n);
    at += 4;
  };
  const u64 = (n: number) => {
    u32(Math.floor(n / 2 ** 32));
    u32(n % 2 ** 32);
  };
  name('caff');
  view.setUint16(at, 1);
  at += 4;
  name('desc');
  u64(32);
  view.setFloat64(at, 48_000);
  at += 8;
  name('opus');
  u32(0);
  u32(0);
  u32(frames);
  u32(track.head[9]);
  u32(0);
  name('data');
  u64(4 + data);
  u32(0);
  for (const packet of packets) {
    out.set(packet, at);
    at += packet.length;
  }
  name('pakt');
  u64(24 + sizes.length);
  u64(packets.length);
  u64(packets.length * frames);
  u32(0);
  u32(0);
  out.set(sizes, at);
  return out;
}

function concat(parts: Uint8Array[]): Uint8Array {
  if (parts.length === 1) return parts[0];
  const out = new Uint8Array(parts.reduce((sum, p) => sum + p.length, 0));
  let at = 0;
  for (const part of parts) {
    out.set(part, at);
    at += part.length;
  }
  return out;
}
