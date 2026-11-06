// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// What the Collection's Android part (modules/erevos-collection, SealedFile.kt) reads: a file's
// chunks exactly as lib/attachments.ts seals them, at any place, opening only the chunks it needs.
// This holds the layout and the arithmetic it relies on, mirrored here in plain TypeScript and
// checked against sealChunk and openChunk, so a change on either side shows. With EREVOS_VECTORS
// set to a folder, the check also writes a file's chunks and what ranges of it must read as, for
// the Kotlin reader to be run on them (it was, when the reader was written).
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

import { FileDamagedError, openChunk, room, sealChunk } from '../lib/attachments';
import { aesGcmSeal, toHex } from '../lib/crypto';
import { CHUNK_SIZES, PREFIX } from '../lock/attachment-files';

// The layout of a chunk of `chunk` bytes (lib/crypto.ts encryptBytes, lib/attachments.ts):
const NONCE = 12; // bytes 0..12: the nonce
const TAG = 16; // the last 16 bytes: AES-256-GCM's tag; between them, what was sealed
const HEAD = 8; // sealed: uint32 BE place in the file, uint32 BE how many bytes are the file
// then those bytes, then zeros to chunk - 28.

/** The chunk that holds the file's byte at `position`, and where in its piece (SealedFile.kt place). */
function place(position: number, chunk: number): { n: number; within: number } {
  const r = room(chunk);
  return { n: Math.floor(position / r), within: position % r };
}

/** The chunks a read of `length` bytes from `at` opens, each with the part of its piece taken. */
function spans(at: number, length: number, chunk: number, size: number): { n: number; from: number; to: number }[] {
  const end = Math.min(size, at + length);
  const out: { n: number; from: number; to: number }[] = [];
  for (let p = at; p < end; ) {
    const { n, within } = place(p, chunk);
    const take = Math.min(room(chunk) - within, end - p);
    out.push({ n, from: within, to: within + take });
    p += take;
  }
  return out;
}

/** How many chunks a file of `size` bytes takes (SealedFile.kt countFor). */
const countFor = (size: number, chunk: number) => Math.max(1, Math.ceil(size / room(chunk)));

/** How many of the file's bytes chunk `n` holds: all but the last are full (SealedFile.kt pieceLength). */
const pieceLength = (n: number, count: number, size: number, chunk: number) => (n < count - 1 ? room(chunk) : size - (count - 1) * room(chunk));

// A file of `size` bytes whose every byte says where it is, sealed in chunks of the smallest size.
const CHUNK = CHUNK_SIZES[0];
const KEY = Uint8Array.from({ length: 32 }, (_, i) => (i * 37 + 11) & 255);
const SIZE = 3 * room(CHUNK) + 1234;
const plain = Uint8Array.from({ length: SIZE }, (_, i) => (i * 7 + (i >> 8)) & 255);
const COUNT = countFor(SIZE, CHUNK);
const chunks = Array.from({ length: COUNT }, (_, n) => sealChunk(KEY, n, plain.subarray(n * room(CHUNK), Math.min(SIZE, (n + 1) * room(CHUNK))), CHUNK));

test('a chunk is its size exactly: nonce, then what was sealed, then the tag', () => {
  for (const size of CHUNK_SIZES) assert.equal(room(size), size - NONCE - TAG - HEAD);
  assert.equal(COUNT, 4);
  for (const sealed of chunks) assert.equal(sealed.length, CHUNK);
  // Sealing again what chunk 1 holds, with its own nonce, gives the same chunk: the layout is all there is.
  const inner = new Uint8Array(CHUNK - NONCE - TAG);
  const view = new DataView(inner.buffer);
  view.setUint32(0, 1);
  view.setUint32(4, room(CHUNK));
  inner.set(plain.subarray(room(CHUNK), 2 * room(CHUNK)), HEAD);
  const again = aesGcmSeal(KEY, chunks[1].subarray(0, NONCE), inner);
  assert.deepEqual(again, chunks[1].subarray(NONCE));
});

test('every chunk but the last holds a full piece; the last the rest', () => {
  for (let n = 0; n < COUNT; n++) assert.equal(openChunk(KEY, n, chunks[n], CHUNK).length, pieceLength(n, COUNT, SIZE, CHUNK));
  assert.equal(pieceLength(COUNT - 1, COUNT, SIZE, CHUNK), 1234);
  assert.equal(countFor(0, CHUNK), 1);
  assert.equal(countFor(room(CHUNK), CHUNK), 1);
  assert.equal(countFor(room(CHUNK) + 1, CHUNK), 2);
});

test('any range reads from only the chunks that hold it, the same bytes as the file', () => {
  const ranges: [number, number][] = [
    [0, 1],
    [0, SIZE],
    [room(CHUNK) - 1, 2],
    [room(CHUNK), room(CHUNK)],
    [2 * room(CHUNK) + 5, room(CHUNK) + 100],
    [SIZE - 1, 10],
    [SIZE, 10],
  ];
  for (const [at, length] of ranges) {
    const parts = spans(at, length, CHUNK, SIZE).map(({ n, from, to }) => openChunk(KEY, n, chunks[n], CHUNK).subarray(from, to));
    const got = new Uint8Array(parts.reduce((sum, p) => sum + p.length, 0));
    let o = 0;
    for (const p of parts) {
      got.set(p, o);
      o += p.length;
    }
    assert.deepEqual(got, plain.subarray(at, Math.min(SIZE, at + length)), `${at}+${length}`);
  }
  assert.deepEqual(
    spans(room(CHUNK) - 1, 2, CHUNK, SIZE).map((s) => s.n),
    [0, 1],
  );
  assert.deepEqual(spans(SIZE, 1, CHUNK, SIZE), []);
});

test('a chunk changed, or in another place, does not open', () => {
  const changed = chunks[2].slice();
  changed[NONCE + 3] ^= 1;
  assert.throws(() => openChunk(KEY, 2, changed, CHUNK), FileDamagedError);
  assert.throws(() => openChunk(KEY, 2, chunks[1], CHUNK), FileDamagedError);
  assert.throws(() => openChunk(KEY, 0, chunks[0].subarray(1), CHUNK), FileDamagedError);
});

test('the Kotlin reader opens the chunks as openChunk does, and nothing else', () => {
  const kotlin = readFileSync(join(import.meta.dirname, '../modules/erevos-collection/android/src/main/java/expo/modules/erevoscollection/SealedFile.kt'), 'utf8');
  assert.match(kotlin, /Cipher\.getInstance\("AES\/GCM\/NoPadding"\)/);
  assert.match(kotlin, /GCMParameterSpec\(TAG \* 8, sealed, 0, NONCE\)/);
  assert.match(kotlin, /const val NONCE = 12/);
  assert.match(kotlin, /const val TAG = 16/);
  assert.match(kotlin, /const val HEAD = 8/);
  assert.match(kotlin, new RegExp(`const val PREFIX = "${PREFIX}"`));
  assert.match(kotlin, /setOf\(64 \* 1024, 256 \* 1024, 1024 \* 1024\)/);
  assert.deepEqual(CHUNK_SIZES, [64 * 1024, 256 * 1024, 1024 * 1024]);
  // Its id is checked before it names a file, so no id can reach outside the app's folder.
  assert.match(kotlin, /Regex\("\^\[0-9a-f\]\{32\}\$"\)/);
});

// The vectors for the Kotlin reader: the chunks as files named as the app names them, and lines of
// `name value`: the file, then ranges as `range at length hex`.
const out = process.env.EREVOS_VECTORS;
test('the vectors for the Kotlin reader are written when asked', { skip: !out && 'EREVOS_VECTORS is not set' }, () => {
  const dir = out as string;
  mkdirSync(dir, { recursive: true });
  const id = '0123456789abcdef0123456789abcdef';
  for (let n = 0; n < COUNT; n++) writeFileSync(join(dir, `${PREFIX}${id}-${n}`), chunks[n]);
  const lines = [`id ${id}`, `key ${toHex(KEY)}`, `chunk ${CHUNK}`, `count ${COUNT}`, `size ${SIZE}`];
  for (const [at, length] of [
    [0, 64],
    [room(CHUNK) - 3, 9],
    [2 * room(CHUNK) + 100, room(CHUNK)],
    [SIZE - 5, 5],
  ]) {
    lines.push(`range ${at} ${length} ${toHex(plain.subarray(at, at + length))}`);
  }
  writeFileSync(join(dir, 'vector.txt'), lines.join('\n') + '\n');
});
