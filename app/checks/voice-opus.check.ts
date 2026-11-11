// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// Voice messages in Ogg/Opus (lib/voice.ts, lib/ogg-opus.ts, lib/group-media.ts): which kind each
// phone and browser records, a browser's WebM put in Ogg with its sound as it was, Ogg read back,
// Opus put in CAF for Safari before 18.4, and the name and type each is sent under.
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { voiceMime, voiceNamed } from '../lib/group-media';
import { isOpusHead, opusSamples, readOgg, readWebm, splitOpus, webmToOgg, writeCaf, writeOgg, type OpusTrack } from '../lib/ogg-opus';
import { phoneRecordsOpus, soundOf, webVoiceType } from '../lib/voice';

// --- building blocks of test files ---

const bytes = (...parts: (number[] | Uint8Array)[]) => Uint8Array.from(parts.flatMap((p) => [...p]));
const ascii = (s: string) => [...s].map((c) => c.charCodeAt(0));

/** An Opus head: channels, pre-skip. */
const opusHead = (channels = 1, preSkip = 312) => bytes(ascii('OpusHead'), [1, channels, preSkip & 0xff, preSkip >> 8, 0x80, 0xbb, 0, 0, 0, 0, 0]);

/** An Opus packet of `size` bytes with this first byte (config << 3 | code), its bytes after it counting up from `seed`. */
const packet = (toc: number, size: number, seed = 0) => Uint8Array.from({ length: size }, (_, i) => (i === 0 ? toc : (seed + i) & 0xff));

// CELT, full band, 20 ms, one frame.
const CELT20 = (31 << 3) | 0;

// EBML: ids as written, sizes in the fewest bytes, or unknown.
const idOf = (id: number) => (id > 0xffffff ? [id >>> 24, (id >> 16) & 0xff, (id >> 8) & 0xff, id & 0xff] : id > 0xffff ? [id >> 16, (id >> 8) & 0xff, id & 0xff] : id > 0xff ? [id >> 8, id & 0xff] : [id]);
const sizeOf = (n: number) => (n < 0x7f ? [0x80 | n] : n < 0x3fff ? [0x40 | (n >> 8), n & 0xff] : [0x10 | (n >>> 24), (n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff]);
const el = (id: number, ...body: (number[] | Uint8Array)[]) => {
  const data = body.flatMap((b) => [...b]);
  return [...idOf(id), ...sizeOf(data.length), ...data];
};
const open = (id: number, ...body: (number[] | Uint8Array)[]) => [...idOf(id), 0x01, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, ...body.flatMap((b) => [...b])];
const block = (track: number, flags: number, ...rest: (number[] | Uint8Array)[]) => [0x80 | track, 0, 0, flags, ...rest.flatMap((r) => [...r])];

/** Ogg's CRC, worked out bit by bit as RFC 3533 says, not as lib/ogg-opus.ts does. */
function crcBits(page: Uint8Array): number {
  let crc = 0;
  page.forEach((byte, i) => {
    crc ^= (i >= 22 && i < 26 ? 0 : byte) << 24;
    for (let bit = 0; bit < 8; bit++) crc = crc & 0x80000000 ? ((crc << 1) ^ 0x04c11db7) >>> 0 : (crc << 1) >>> 0;
  });
  return crc >>> 0;
}

type Page = { flags: number; granule: number; serial: number; sequence: number; crc: number; lacing: number[]; body: Uint8Array; whole: Uint8Array };

/** An Ogg file's pages, read here without lib/ogg-opus.ts. */
function pagesOf(ogg: Uint8Array): Page[] {
  const view = new DataView(ogg.buffer, ogg.byteOffset, ogg.byteLength);
  const pages: Page[] = [];
  for (let at = 0; at < ogg.length; ) {
    assert.equal(String.fromCharCode(...ogg.subarray(at, at + 4)), 'OggS');
    const count = ogg[at + 26];
    const lacing = [...ogg.subarray(at + 27, at + 27 + count)];
    const end = at + 27 + count + lacing.reduce((s, n) => s + n, 0);
    pages.push({
      flags: ogg[at + 5],
      granule: view.getUint32(at + 6, true) + view.getUint32(at + 10, true) * 2 ** 32,
      serial: view.getUint32(at + 14, true),
      sequence: view.getUint32(at + 18, true),
      crc: view.getUint32(at + 22, true),
      lacing,
      body: ogg.subarray(at + 27 + count, end),
      whole: ogg.subarray(at, end),
    });
    at = end;
  }
  return pages;
}

const same = (a: Uint8Array[], b: Uint8Array[]) => a.length === b.length && a.every((p, i) => p.length === b[i].length && p.every((v, j) => v === b[i][j]));

// --- which kind is recorded where ---

test('Android 10 and later record Ogg/Opus where the build has the recorder; others keep AAC', () => {
  assert.equal(phoneRecordsOpus('android', 29, true), true);
  assert.equal(phoneRecordsOpus('android', 35, true), true);
  assert.equal(phoneRecordsOpus('android', 28, true), false);
  assert.equal(phoneRecordsOpus('android', 24, true), false);
  assert.equal(phoneRecordsOpus('android', 34, false), false);
  assert.equal(phoneRecordsOpus('ios', 18, true), false);
  assert.equal(phoneRecordsOpus('web', '', true), false);
});

test('a browser records Ogg where it can, else WebM/Opus, else its own kind', () => {
  const firefox = new Set(['audio/ogg;codecs=opus', 'audio/webm;codecs=opus']);
  const chrome = new Set(['audio/webm;codecs=opus', 'audio/webm']);
  assert.equal(webVoiceType((type) => firefox.has(type)), 'audio/ogg;codecs=opus');
  assert.equal(webVoiceType((type) => chrome.has(type)), 'audio/webm;codecs=opus');
  // Safari before 18.4: neither, so AAC in MP4, as before.
  assert.equal(webVoiceType(() => false), undefined);
  assert.equal(
    webVoiceType(() => {
      throw new Error('no MediaRecorder');
    }),
    undefined,
  );
});

test('a sound is known from how it starts, and is named and typed for the networks by it', () => {
  const ogg = bytes(ascii('OggS'), [0, 2]);
  const mp4 = bytes([0, 0, 0, 0x20], ascii('ftypM4A '));
  const webm = bytes([0x1a, 0x45, 0xdf, 0xa3, 0x9f]);
  assert.deepEqual([soundOf(ogg), soundOf(mp4), soundOf(webm), soundOf(new Uint8Array(8))], ['ogg', 'mp4', 'webm', '']);
  assert.deepEqual(voiceNamed(ogg), { name: 'voice.ogg', mime: 'audio/ogg' });
  assert.deepEqual(voiceNamed(mp4), { name: 'voice.m4a', mime: 'audio/mp4' });
  assert.deepEqual(voiceNamed(webm), { name: 'voice.webm', mime: 'audio/webm' });
  assert.equal(voiceMime(ogg), 'audio/ogg');
  assert.equal(voiceMime(new Uint8Array(8)), 'application/octet-stream');
});

// --- Opus packets ---

test('an Opus packet says how many samples it holds', () => {
  // SILK narrow band 10, 20, 40, 60 ms; hybrid 10, 20 ms; CELT 2.5, 5, 10, 20 ms.
  assert.deepEqual([0, 1, 2, 3].map((c) => opusSamples(Uint8Array.of(c << 3))), [480, 960, 1920, 2880]);
  assert.deepEqual([12, 13].map((c) => opusSamples(Uint8Array.of(c << 3))), [480, 960]);
  assert.deepEqual([28, 29, 30, 31].map((c) => opusSamples(Uint8Array.of(c << 3))), [120, 240, 480, 960]);
  // Two frames (code 1 and 2), and a count of them (code 3).
  assert.equal(opusSamples(Uint8Array.of(CELT20 | 1, 0, 0)), 1920);
  assert.equal(opusSamples(Uint8Array.of(CELT20 | 2, 1, 0, 0)), 1920);
  assert.equal(opusSamples(Uint8Array.of(CELT20 | 3, 3, 0, 0, 0)), 2880);
  // More than 120 ms, or nothing, is not a packet.
  assert.equal(opusSamples(Uint8Array.of((3 << 3) | 3, 3)), 0);
  assert.equal(opusSamples(new Uint8Array(0)), 0);
  assert.equal(isOpusHead(opusHead()), true);
  assert.equal(isOpusHead(opusHead(3)), false);
  assert.equal(isOpusHead(bytes(ascii('OpusTags'), new Array(11).fill(0))), false);
});

test('a packet of several frames splits into one packet for each', () => {
  const toc = (29 << 3) & 0xfc;
  // Code 1: two of the same size.
  assert.deepEqual(splitOpus(Uint8Array.of(toc | 1, 1, 2, 3, 4, 5, 6))?.map((p) => [...p]), [
    [toc, 1, 2, 3],
    [toc, 4, 5, 6],
  ]);
  assert.equal(splitOpus(Uint8Array.of(toc | 1, 1, 2, 3)), null);
  // Code 2: the first's size given, here in two bytes (300 = 4 * 12 + 252).
  const long = packet(0, 300, 9).subarray(0, 300);
  const two = splitOpus(bytes([toc | 2, 252, 12], long, [7, 8]))!;
  assert.equal(two.length, 2);
  assert.deepEqual([...two[0].subarray(1)], [...long]);
  assert.deepEqual([...two[1]], [toc, 7, 8]);
  // Code 3, all of a size.
  assert.deepEqual(splitOpus(Uint8Array.of(toc | 3, 3, 1, 1, 2, 2, 3, 3))?.map((p) => [...p]), [
    [toc, 1, 1],
    [toc, 2, 2],
    [toc, 3, 3],
  ]);
  // Code 3, of their own sizes, with three bytes of padding at the end.
  assert.deepEqual(splitOpus(Uint8Array.of(toc | 3, 0x80 | 0x40 | 2, 3, 2, 5, 5, 6, 6, 6, 0, 0, 0))?.map((p) => [...p]), [
    [toc, 5, 5],
    [toc, 6, 6, 6],
  ]);
  assert.equal(splitOpus(Uint8Array.of(toc | 3, 3, 1, 1)), null);
  assert.deepEqual(splitOpus(Uint8Array.of(toc, 9))?.map((p) => [...p]), [[toc, 9]]);
});

// --- WebM to Ogg ---

// A recording as a browser makes it as it goes: a Segment and a Cluster of unknown size, an
// Opus track after a video one, its frames alone, in a group, and laced each of the three ways.
const frames = [40, 77, 300, 151, 188, 225, 262, 299, 336, 373].map((size, i) => packet(CELT20, size, i));
const recorded = bytes(
  el(0x1a45dfa3, el(0x4282, ascii('webm'))),
  open(
    0x18538067,
    el(0x1549a966, el(0x2ad7b1, [0x0f, 0x42, 0x40])),
    el(0x1654ae6b, el(0xae, el(0xd7, [1]), el(0x86, ascii('V_VP8'))), el(0xae, el(0xd7, [2]), el(0x86, ascii('A_OPUS')), el(0x63a2, opusHead(1, 312)), el(0xe1, el(0x9f, [1])))),
    open(
      0x1f43b675,
      el(0xe7, [0]),
      el(0xa3, block(2, 0x80, frames[0])),
      el(0xa3, block(1, 0x80, [1, 2, 3])),
      el(0xec, [0, 0, 0]),
      el(0xa0, el(0xa1, block(2, 0, frames[1])), el(0x75a2, [0x10])),
      // Xiph: the first's size (300) in bytes of 255 and the rest.
      el(0xa3, block(2, 0x82, [1, 255, 45], frames[2], frames[3])),
      // EBML: the first's size, then each as it differs, signed.
      el(0xa3, block(2, 0x86, [2], sizeOf(frames[4].length), [0x80 | (frames[5].length - frames[4].length + 63)], frames[4], frames[5], frames[6])),
      // Fixed: all of a size.
      el(0xa3, block(2, 0x84, [1], frames[7], packet(CELT20, frames[7].length, 99))),
    ),
    el(0x1f43b675, el(0xe7, [0x40]), el(0xa3, block(2, 0x80, frames[8])), el(0xa3, block(2, 0x80, frames[9]))),
  ),
);
const recordedPackets = [...frames.slice(0, 8), packet(CELT20, frames[7].length, 99), frames[8], frames[9]];

test('a browser recording in WebM gives its Opus head and packets, in order, and nothing of another track', () => {
  const track = readWebm(recorded)!;
  assert.deepEqual([...track.head], [...opusHead(1, 312)]);
  assert.ok(same(track.packets, recordedPackets));
  assert.equal(readWebm(bytes([1, 2, 3, 4])), null);
  assert.equal(readWebm(new Uint8Array(0)), null);
});

test('a WebM without its Opus head has one made from its delay and channels', () => {
  const plain = bytes(
    el(0x1a45dfa3, el(0x4282, ascii('webm'))),
    open(0x18538067, el(0x1654ae6b, el(0xae, el(0xd7, [1]), el(0x86, ascii('A_OPUS')), el(0x56aa, [0x00, 0x62, 0x5a, 0x00]), el(0xe1, el(0x9f, [2])))), open(0x1f43b675, el(0xe7, [0]), el(0xa3, block(1, 0x80, frames[0])))),
  );
  const track = readWebm(plain)!;
  // 6.5 ms (6 445 568 ns) is 309 samples at 48 kHz.
  assert.deepEqual([...track.head], [...opusHead(2, 309)]);
  // Not Opus: nothing to put in Ogg.
  const vorbis = bytes(el(0x1a45dfa3), open(0x18538067, el(0x1654ae6b, el(0xae, el(0xd7, [1]), el(0x86, ascii('A_VORBIS')))), open(0x1f43b675, el(0xa3, block(1, 0x80, [1, 2])))));
  assert.equal(readWebm(vorbis), null);
  assert.equal(webmToOgg(vorbis, 1), null);
});

test('WebM put in Ogg: its head and an empty comment on pages of their own, the packets as they were, checked and counted', () => {
  const ogg = webmToOgg(recorded, 0xdeadbeef)!;
  assert.equal(soundOf(ogg), 'ogg');
  const pages = pagesOf(ogg);
  for (const page of pages) assert.equal(page.crc, crcBits(page.whole));
  assert.deepEqual(
    pages.map((p) => p.sequence),
    pages.map((_, i) => i),
  );
  assert.ok(pages.every((p) => p.serial === 0xdeadbeef));
  // The head alone on the first page, which begins the stream; the comment alone on the second,
  // with no vendor and no comments, so nothing says what made it.
  assert.deepEqual([pages[0].flags, pages[0].granule, pages[0].lacing], [2, 0, [19]]);
  assert.deepEqual([...pages[0].body], [...opusHead(1, 312)]);
  assert.deepEqual([pages[1].flags, pages[1].granule], [0, 0]);
  assert.deepEqual([...pages[1].body], [...ascii('OpusTags'), 0, 0, 0, 0, 0, 0, 0, 0]);
  // The last page ends it, counting every sample of the 11 packets of 20 ms.
  const last = pages[pages.length - 1];
  assert.equal(last.flags, 4);
  assert.equal(last.granule, 11 * 960);
  const back = readOgg(ogg)!;
  assert.deepEqual([...back.head], [...opusHead(1, 312)]);
  assert.ok(same(back.packets, recordedPackets));
});

test('a long recording goes in pages of about a second, none over 255 segments', () => {
  const many: OpusTrack = { head: opusHead(), packets: Array.from({ length: 160 }, (_, i) => packet(CELT20, 600 + (i % 7), i)) };
  const pages = pagesOf(writeOgg(many, 7)!).slice(2);
  assert.ok(pages.every((p) => p.lacing.length <= 255));
  // 600 bytes go in three segments: 255, 255 and 90; 50 packets of 20 ms make a second.
  assert.deepEqual(pages[0].lacing.slice(0, 3), [255, 255, 90]);
  assert.deepEqual(
    pages.map((p) => p.granule),
    [48_000, 96_000, 144_000, 153_600],
  );
  assert.ok(same(readOgg(writeOgg(many, 7)!)!.packets, many.packets));
  // Packets of 2000 bytes take 8 segments each: 31 fill a page before a second is up.
  const big: OpusTrack = { head: opusHead(), packets: Array.from({ length: 40 }, (_, i) => packet(CELT20, 2000, i)) };
  const bigPages = pagesOf(writeOgg(big, 2)!).slice(2);
  assert.deepEqual(
    bigPages.map((p) => [p.lacing.length, p.granule]),
    [
      [248, 31 * 960],
      [72, 40 * 960],
    ],
  );
  assert.ok(same(readOgg(writeOgg(big, 2)!)!.packets, big.packets));
  // A sound of 60 ms packets (Chrome's): each page ends on the first packet past the second.
  const chrome: OpusTrack = { head: opusHead(), packets: Array.from({ length: 40 }, (_, i) => packet(CELT20 | 3, 90, i).fill(3, 1, 2)) };
  assert.deepEqual(
    pagesOf(writeOgg(chrome, 1)!)
      .slice(2)
      .map((p) => p.granule),
    [48_960, 97_920, 115_200],
  );
  assert.equal(writeOgg({ head: opusHead(), packets: [] }, 1), null);
  assert.equal(writeOgg({ head: new Uint8Array(19), packets: [packet(CELT20, 9)] }, 1), null);
});

test('Ogg is read back with a packet that goes on to the next page, and of its first stream only', () => {
  const page = (flags: number, sequence: number, serial: number, lacing: number[], body: Uint8Array) => {
    const out = bytes(ascii('OggS'), [0, flags, 0, 0, 0, 0, 0, 0, 0, 0, serial, 0, 0, 0, sequence, 0, 0, 0, 0, 0, 0, 0, lacing.length], lacing, body);
    new DataView(out.buffer).setUint32(22, crcBits(out), true);
    return out;
  };
  const long = packet(CELT20, 265, 5);
  const ogg = bytes(
    page(2, 0, 9, [19], opusHead()),
    page(0, 1, 9, [16], bytes(ascii('OpusTags'), new Array(8).fill(0))),
    page(2, 0, 4, [3], Uint8Array.of(1, 2, 3)),
    page(0, 2, 9, [255], long.subarray(0, 255)),
    page(5, 3, 9, [10, 5], bytes(long.subarray(255), packet(CELT20, 5))),
  );
  const track = readOgg(ogg)!;
  assert.ok(same(track.packets, [long, packet(CELT20, 5)]));
  assert.equal(readOgg(recorded), null);
  assert.equal(readOgg(bytes(ascii('OggS'), new Array(30).fill(0))), null);
});

test('a real WebM recording (ffmpeg, as it goes, 60 ms packets) goes to Ogg and back as it was', () => {
  const real = Uint8Array.from(Buffer.from(FIXTURE, 'base64'));
  const track = readWebm(real)!;
  assert.deepEqual(
    track.packets.map((p) => p.length),
    [56, 47, 49, 49, 51, 37],
  );
  assert.ok(track.packets.every((p) => opusSamples(p) === 2880));
  assert.equal(track.head[10] | (track.head[11] << 8), 312);
  const ogg = webmToOgg(real, 3)!;
  assert.ok(same(readOgg(ogg)!.packets, track.packets));
  assert.equal(pagesOf(ogg).pop()!.granule, 6 * 2880);
  assert.deepEqual(voiceNamed(ogg), { name: 'voice.ogg', mime: 'audio/ogg' });
});

// --- CAF, for Safari before 18.4 ---

/** A CAF file's description, its packets as its table says, and its counts. */
function cafOf(caf: Uint8Array) {
  const view = new DataView(caf.buffer, caf.byteOffset, caf.byteLength);
  const name = (at: number) => String.fromCharCode(...caf.subarray(at, at + 4));
  assert.deepEqual([name(0), view.getUint16(4), view.getUint16(6)], ['caff', 1, 0]);
  const chunks: Record<string, Uint8Array> = {};
  const order: string[] = [];
  for (let at = 8; at < caf.length; ) {
    const size = view.getUint32(at + 4) * 2 ** 32 + view.getUint32(at + 8);
    chunks[name(at)] = caf.subarray(at + 12, at + 12 + size);
    order.push(name(at));
    at += 12 + size;
  }
  const desc = new DataView(chunks.desc.buffer, chunks.desc.byteOffset, 32);
  const pakt = new DataView(chunks.pakt.buffer, chunks.pakt.byteOffset, chunks.pakt.byteLength);
  const sizes: number[] = [];
  for (let at = 24, n = 0; at < chunks.pakt.length; at++) {
    n = n * 128 + (chunks.pakt[at] & 0x7f);
    if (!(chunks.pakt[at] & 0x80)) {
      sizes.push(n);
      n = 0;
    }
  }
  let at = 4;
  const packets = sizes.map((size) => chunks.data.subarray(at, (at += size)));
  return {
    order,
    rate: desc.getFloat64(0),
    format: String.fromCharCode(...chunks.desc.subarray(8, 12)),
    flags: desc.getUint32(12),
    bytesPerPacket: desc.getUint32(16),
    framesPerPacket: desc.getUint32(20),
    channels: desc.getUint32(24),
    bits: desc.getUint32(28),
    edits: new DataView(chunks.data.buffer, chunks.data.byteOffset, 4).getUint32(0),
    count: pakt.getUint32(4),
    valid: pakt.getUint32(12),
    priming: pakt.getUint32(16),
    remainder: pakt.getUint32(20),
    packets,
    dataEnd: at === chunks.data.length,
  };
}

test('Opus goes in CAF as Safari plays it before 18.4: 20 ms packets, each one\'s size in the table', () => {
  const track = readWebm(recorded)!;
  const caf = cafOf(writeCaf(track)!);
  assert.deepEqual(caf.order, ['desc', 'data', 'pakt']);
  assert.deepEqual([caf.rate, caf.format, caf.flags, caf.bytesPerPacket, caf.framesPerPacket, caf.channels, caf.bits], [48_000, 'opus', 0, 0, 960, 1, 0]);
  assert.deepEqual([caf.edits, caf.count, caf.valid, caf.priming, caf.remainder, caf.dataEnd], [0, 11, 11 * 960, 0, 0, true]);
  assert.ok(same(caf.packets, recordedPackets));
  // Chrome's 60 ms packets of three 20 ms frames go as three packets each.
  const toc = (31 << 3) | 3;
  const chrome: OpusTrack = { head: opusHead(2), packets: [Uint8Array.of(toc, 3, 1, 1, 2, 2, 3, 3), Uint8Array.of(toc, 3, 4, 5, 6)] };
  const split = cafOf(writeCaf(chrome)!);
  assert.deepEqual([split.framesPerPacket, split.channels, split.count], [960, 2, 6]);
  assert.deepEqual(
    split.packets.map((p) => [...p]),
    [[31 << 3, 1, 1], [31 << 3, 2, 2], [31 << 3, 3, 3], [31 << 3, 4], [31 << 3, 5], [31 << 3, 6]],
  );
  // SILK's 60 ms is one frame: the packets stay as they are.
  const silk: OpusTrack = { head: opusHead(), packets: [packet(11 << 3, 30), packet(11 << 3, 31)] };
  assert.equal(cafOf(writeCaf(silk)!).framesPerPacket, 2880);
  // Packets not all as long: CAF cannot say so for Safari.
  assert.equal(writeCaf({ head: opusHead(), packets: [packet(CELT20, 9), packet(30 << 3, 9)] }), null);
  assert.equal(writeCaf({ head: opusHead(), packets: [] }), null);
});

test('a CAF packet table writes sizes seven bits a byte', () => {
  const sizes = [1, 127, 128, 300, 1275];
  const caf = cafOf(writeCaf({ head: opusHead(), packets: sizes.map((n) => packet(CELT20, n)) })!);
  assert.deepEqual(
    caf.packets.map((p) => p.length),
    sizes,
  );
  const raw = writeCaf({ head: opusHead(), packets: [packet(CELT20, 300)] })!;
  assert.deepEqual([...raw.subarray(raw.length - 2)], [0x82, 0x2c]);
});

// ffmpeg -f lavfi -i sine=frequency=440:duration=0.3 -ac 1 -c:a libopus -b:a 8k -frame_duration 60 -live 1 -f webm
const FIXTURE =
  'GkXfo59ChoEBQveBAULygQRC84EIQoKEd2VibUKHgQRChYECGFOAZwH/////////EU2bdKtNu4tTq4QVSalmU6yBoU27i1OrhBZUrmtTrIG7TbuMU6uEElTDZ1OsggEl7AEAAAAAAABoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAVSalmlSrXsYMPQkBNgIRMYXZmV0GETGF2ZhZUrmvlrgEAAAAAAABc14EBc8WIAAAAAAAAAAGcgQAitZyDdW5kiIEAhoZBX09QVVNWqoNjLqBWu4QExLQAg4EC4ZGfgQG1iEDncAAAAAAAYmSBEGOik09wdXNIZWFkAQE4AYC7AAAAAAASVMNnrXNzqmPAi2PFiAAAAAAAAAABZ8iZRaOHRU5DT0RFUkSHjExhdmMgbGlib3B1cx9DtnVBUeeBAKO8gQAAgBjguI0RUVYm1nr7AHqm7k6yVm2sivrGkncZX+0ET7FolbX0GBRlj8fKLtAWjeYgDnlujvh6m3S6o7OBAD2AGOdX7B6DnEDl5AGQAld6ZYi0QeGjbqL1mvo+29/J0cp13Fz9BWsDEFB/qC1ozsCjtYEAeYAY51fsHoR09gf7KAq32MG6jSgqNx5rS6cyeTwu5Z2w3E5gkMYXtINjrzFWBJ4aKbHoo7WBALWAGOckCvm8EnVbYwnZlFTnjPUYe+ZEq9OizwWB6LBDEfno3W9jEf7TgfuO94hUpOMDsKO3gQDxgBjnIyaCIF9eSzJCVNMWPdy+gbhaegO6sKBQ93jsiLcStqlbj+Dglll8NISviUPnVhA53qCyoamBAS0AGAGJurCN68EqmIRd+PcYvqg+kzVD5D7RlWzQoeanSr9u3IOSgHWihAMwWGA=';
