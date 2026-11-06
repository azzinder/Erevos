// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// A large file brought from another device chunk by chunk (lib/sync/chunks.ts) with the network
// cut off in the middle: it goes on from the chunk that was missing, asking nothing twice; a chunk
// cut short or damaged is never kept; the file is whole only once every chunk is; another way takes
// over from one cut off; and a file deleted while it comes keeps no chunk.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { room, sealChunk } from '../lib/attachments';
import { randomBytes } from '../lib/crypto';
import { ChunkFetch, chunksHere, whole, type ChunkStore, type ChunkWay, type Wanted } from '../lib/sync/chunks';

const CHUNK = 64 * 1024;

// A file of `count` chunks as the other device keeps it.
function fileThere(count: number): { want: Wanted; there: Map<number, Uint8Array> } {
  const key = randomBytes(32);
  const there = new Map<number, Uint8Array>();
  for (let n = 0; n < count; n++) there.set(n, sealChunk(key, n, randomBytes(n === count - 1 ? 100 : room(CHUNK)), CHUNK));
  return { want: { id: 'ab'.repeat(16), key, chunk: CHUNK, count }, there };
}

function memoryStore(): ChunkStore & { kept: Map<string, Uint8Array> } {
  const kept = new Map<string, Uint8Array>();
  return {
    kept,
    read: async (id, n) => kept.get(`${id}-${n}`) ?? null,
    save: async (id, n, sealed) => void kept.set(`${id}-${n}`, sealed),
    drop: async (id, count) => {
      for (let n = 0; n < count; n++) kept.delete(`${id}-${n}`);
    },
  };
}

// A way that answers from `there`, counting what it is asked, cut off once `cutAt` says so.
function wayTo(there: Map<number, Uint8Array>, name = 'lan'): ChunkWay & { asked: number[]; cutAt: (n: number) => boolean } {
  const way = {
    name,
    asked: [] as number[],
    cutAt: (_n: number) => false,
    get: async (_id: string, n: number) => {
      way.asked.push(n);
      if (way.cutAt(n)) throw new Error('network cut off');
      return there.get(n) ?? null;
    },
  };
  return way;
}

test('cut off in the middle: what came is kept, the file is not whole, and it goes on from the chunk that was missing', async () => {
  const { want, there } = fileThere(10);
  const store = memoryStore();
  const fetch = new ChunkFetch(store);
  const lan = wayTo(there);
  lan.cutAt = (n) => n >= 6;
  const first = await fetch.bring(want, [lan]);
  assert.deepEqual([first.end, first.have], ['cut', 6]);
  assert.equal(await chunksHere(store, want), 6);
  assert.equal(await whole(store, want), false);

  // The network back: only chunks 6 to 9 are asked for.
  lan.asked.length = 0;
  lan.cutAt = () => false;
  const seen: number[] = [];
  const again = await fetch.bring(want, [lan], (have) => seen.push(have));
  assert.deepEqual([again.end, again.have], ['done', 10]);
  assert.deepEqual(lan.asked, [6, 7, 8, 9]);
  assert.deepEqual(seen, [7, 8, 9, 10]);
  assert.equal(await whole(store, want), true);
  for (let n = 0; n < 10; n++) assert.deepEqual(store.kept.get(`${want.id}-${n}`), there.get(n));
});

test('a chunk cut short, damaged, of another file or in another place is never kept, and is asked of the next way', async () => {
  const { want, there } = fileThere(4);
  const other = fileThere(4);
  const store = memoryStore();
  const fetch = new ChunkFetch(store);
  const bad = wayTo(
    new Map([
      [0, there.get(0)!.slice(0, CHUNK / 2)],
      [1, (() => {
        const damaged = there.get(1)!.slice();
        damaged[100] ^= 1;
        return damaged;
      })()],
      [2, other.there.get(2)!],
      [3, there.get(2)!],
    ]),
    'bad',
  );
  // Only the bad way: nothing is kept, and the file is missing chunks.
  const alone = await fetch.bring(want, [bad]);
  assert.deepEqual([alone.end, alone.have], ['missing', 0]);
  assert.equal(store.kept.size, 0);
  // With a good way after it, each chunk comes from that one.
  const good = wayTo(there, 'server');
  const both = await fetch.bring(want, [bad, good]);
  assert.equal(both.end, 'done');
  assert.deepEqual(good.asked, [0, 1, 2, 3]);
  assert.equal(await whole(store, want), true);
  // A chunk kept damaged meanwhile (a write cut short) is not counted, and is brought again.
  store.kept.set(`${want.id}-2`, there.get(2)!.slice(0, 10));
  assert.equal(await whole(store, want), false);
  good.asked.length = 0;
  assert.equal((await fetch.bring(want, [good])).end, 'done');
  assert.deepEqual(good.asked, [2]);
});

test('one way cut off, the next takes over at the same chunk; none reachable leaves it to go on later', async () => {
  const { want, there } = fileThere(6);
  const store = memoryStore();
  const fetch = new ChunkFetch(store);
  const lan = wayTo(there, 'lan');
  const server = wayTo(there, 'server');
  lan.cutAt = (n) => n >= 3;
  const done = await fetch.bring(want, [lan, server]);
  assert.equal(done.end, 'done');
  assert.deepEqual(server.asked, [3, 4, 5]);

  const next = fileThere(3);
  const off = wayTo(next.there);
  off.cutAt = () => true;
  const none = await fetch.bring(next.want, [off]);
  assert.deepEqual([none.end, none.have], ['cut', 0]);
});

test('deleted while it comes: it stops, and keeps no chunk, also one being kept just then', async () => {
  const { want, there } = fileThere(8);
  const store = memoryStore();
  const fetch = new ChunkFetch(store);
  let release: () => void = () => undefined;
  const lan = wayTo(there);
  const slow: ChunkWay = {
    name: 'lan',
    get: async (id, n) => {
      if (n === 4) await new Promise<void>((done) => (release = done));
      return lan.get(id, n);
    },
  };
  const coming = fetch.bring(want, [slow]);
  await new Promise((done) => setTimeout(done, 20));
  // Asked again while it comes: the same transfer.
  assert.equal(fetch.bring(want, [slow]), coming);
  const stopping = fetch.stop(want);
  release();
  const ended = await coming;
  await stopping;
  assert.equal(ended.end, 'stopped');
  assert.equal(store.kept.size, 0);
  assert.equal(await chunksHere(store, want), 0);
  // Brought again later, it starts from nothing.
  const again = await fetch.bring(want, [lan]);
  assert.deepEqual([again.end, again.have], ['done', 8]);
});
