// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// The fast way for chunks between the account's devices on the same Wi-Fi (desktop/chunks.js; the
// phone's ChunkChannel.kt speaks the same): only a device holding its key gets in, and only for the
// files that key may take; each chunk is kept only once it opens with the file's key; cut off in
// the middle of a file, it goes on from the chunk that was missing, through lib/sync/chunks.ts.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';

import { room, sealChunk } from '../lib/attachments';
import { randomBytes, toHex } from '../lib/crypto';
import { ChunkFetch, type ChunkStore, type ChunkWay, type Wanted } from '../lib/sync/chunks';

const require = createRequire(import.meta.url);
type Taker = { take(folder: string, id: string, n: number, fileKey: string, size: number): Promise<'kept' | 'none'>; close(): void };
type Server = { start(): Promise<number>; stop(): void; allow(key: string, ids: string[]): void; forget(key: string): void; takers: Set<unknown> };
const { ChunkServer, ChunkTaker } = require('../../desktop/chunks.js') as {
  ChunkServer: new (o: { folder: string }) => Server;
  ChunkTaker: { open(hosts: string[], port: number, key: string): Promise<Taker> };
};

const CHUNK = 64 * 1024;
const folders: string[] = [];
const folder = () => {
  const f = mkdtempSync(join(tmpdir(), 'erevos-chunks-'));
  folders.push(f);
  return f;
};
after(() => {
  for (const f of folders) rmSync(f, { recursive: true, force: true });
});

// A file of `count` chunks kept on the device that gives it.
function fileIn(dir: string, count: number): Wanted {
  const key = randomBytes(32);
  const id = toHex(randomBytes(16));
  for (let n = 0; n < count; n++) writeFileSync(join(dir, `erevos-file-${id}-${n}`), sealChunk(key, n, randomBytes(n === count - 1 ? 10 : room(CHUNK)), CHUNK));
  return { id, key, chunk: CHUNK, count };
}

// The chunks kept in a folder, as the app keeps them (lock/attachment-files.ts).
const storeIn = (dir: string): ChunkStore => ({
  read: async (id, n) => {
    try {
      return new Uint8Array(readFileSync(join(dir, `erevos-file-${id}-${n}`)));
    } catch {
      return null;
    }
  },
  save: async (id, n, sealed) => writeFileSync(join(dir, `erevos-file-${id}-${n}`), sealed),
  drop: async (id, count) => {
    for (let n = 0; n < count; n++) rmSync(join(dir, `erevos-file-${id}-${n}`), { force: true });
  },
});

test('only a device holding the key gets in, and only for the files that key may take; a chunk comes as kept, and is kept only whole', async () => {
  const there = folder();
  const here = folder();
  const want = fileIn(there, 3);
  const other = fileIn(there, 1);
  const server = new ChunkServer({ folder: there });
  const port = await server.start();
  const key = toHex(randomBytes(32));
  server.allow(key, [want.id]);
  try {
    await assert.rejects(ChunkTaker.open(['127.0.0.1'], port, toHex(randomBytes(32))));
    const taker = await ChunkTaker.open(['127.0.0.1'], port, key);
    assert.equal(await taker.take(here, want.id, 0, toHex(want.key), CHUNK), 'kept');
    assert.deepEqual(readFileSync(join(here, `erevos-file-${want.id}-0`)), readFileSync(join(there, `erevos-file-${want.id}-0`)));
    // Not that key's to take, not there, or with another file key: nothing is kept.
    assert.equal(await taker.take(here, other.id, 0, toHex(other.key), CHUNK), 'none');
    assert.equal(await taker.take(here, want.id, 9, toHex(want.key), CHUNK), 'none');
    assert.equal(await taker.take(here, want.id, 1, toHex(randomBytes(32)), CHUNK), 'none');
    // Changed where it is kept there (as on the way): not kept here.
    const changed = readFileSync(join(there, `erevos-file-${want.id}-2`));
    changed[50] ^= 1;
    writeFileSync(join(there, `erevos-file-${want.id}-2`), changed);
    assert.equal(await taker.take(here, want.id, 2, toHex(want.key), CHUNK), 'none');
    assert.deepEqual(readdirSync(here).sort(), [`erevos-file-${want.id}-0`]);
    // The key forgotten: cut off, and let in no more.
    server.forget(key);
    await assert.rejects(taker.take(here, want.id, 1, toHex(want.key), CHUNK));
    await assert.rejects(ChunkTaker.open(['127.0.0.1'], port, key));
  } finally {
    server.stop();
  }
});

test('cut off in the middle of a large file: what came is kept, nothing half, and it goes on from the missing chunk', async () => {
  const there = folder();
  const here = folder();
  const want = fileIn(there, 40);
  const server = new ChunkServer({ folder: there });
  const port = await server.start();
  const key = toHex(randomBytes(32));
  server.allow(key, [want.id]);
  const store = storeIn(here);
  const fetch = new ChunkFetch(store);
  let taker: Taker | null = null;
  const asked: number[] = [];
  let cutAt = 17;
  const lan: ChunkWay = {
    name: 'lan',
    get: async () => {
      throw new Error('not used: chunks are kept as they come');
    },
    keep: async (_want, n) => {
      asked.push(n);
      taker ??= await ChunkTaker.open(['127.0.0.1'], port, key);
      // The Wi-Fi goes: every connection is cut while this chunk comes.
      if (n === cutAt) for (const socket of server.takers as Set<{ destroy(): void }>) socket.destroy();
      try {
        return (await taker.take(here, want.id, n, toHex(want.key), CHUNK)) === 'kept';
      } catch (error) {
        taker = null;
        throw error;
      }
    },
  };
  try {
    const first = await fetch.bring(want, [lan]);
    assert.deepEqual([first.end, first.have], ['cut', 17]);
    assert.equal(readdirSync(here).length, 17);
    assert.equal(readdirSync(here).some((name) => name.endsWith('.part')), false);
    // The Wi-Fi back: only chunks 17 to 39 are asked for.
    cutAt = -1;
    asked.length = 0;
    const again = await fetch.bring(want, [lan]);
    assert.deepEqual([again.end, again.have], ['done', 40]);
    assert.deepEqual(asked, Array.from({ length: 23 }, (_, n) => 17 + n));
    for (let n = 0; n < 40; n++) assert.deepEqual(readFileSync(join(here, `erevos-file-${want.id}-${n}`)), readFileSync(join(there, `erevos-file-${want.id}-${n}`)));
    // Deleted afterwards: none of its chunks stays.
    await fetch.stop(want);
    assert.deepEqual(readdirSync(here), []);
  } finally {
    (taker as Taker | null)?.close();
    server.stop();
  }
});
