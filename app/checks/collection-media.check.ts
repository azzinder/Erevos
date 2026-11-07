// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// The Collection's music and videos beyond playing a file: the list as the player's screen changes
// it (lib/collection-queue.ts: shuffle, repeat, speed, which files start where they were left),
// where files were left, kept sealed in the place's catalogue (lock/collection-data.ts), and what a
// file says of itself, read from its first bytes for the page's player (lib/media-tags.ts).
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { bytesSource } from '../lib/attachments';
import { current, jumpTo, newQueue, nextIndex, nextRepeat, nextSpeed, positionToKeep, previousIndex, setShuffle } from '../lib/collection-queue';
import { randomBytes, utf8Encode } from '../lib/crypto';
import { readTags } from '../lib/media-tags';
import { addToCollection, deleteItems, keepPositions, loadCollection, positionOf, type CollectionPlace } from '../lock/collection-data';
import { setCurrentSpace } from '../lock/keys';
import { blobs, files } from './files-memory';

const t = (name: string, fn: () => Promise<void> | void) =>
  test(name, async () => {
    files.clear();
    blobs.clear();
    setCurrentSpace(null);
    await fn();
  });

const place = (key = randomBytes(32)): CollectionPlace => ({ holder: 'space', space: 0, key });
const song = { name: 'song.mp3', mime: 'audio/mpeg', kind: 'file' as const };

// A random that goes round a fixed list, so a shuffle is the same each run.
const seeded = (values: number[]) => {
  let i = 0;
  return () => values[i++ % values.length];
};

t('a list plays in its order, and stops at its end unless it repeats', () => {
  let q = newQueue(3, 1);
  assert.equal(current(q), 1);
  assert.equal(nextIndex(q), 2);
  assert.equal(previousIndex(q), 0);
  q = jumpTo(q, 2);
  assert.equal(nextIndex(q), null);
  assert.equal(nextIndex({ ...q, repeat: 'all' }), 0);
  // Repeating one file plays it again when it ends by itself; Next still goes on.
  assert.equal(nextIndex({ ...q, repeat: 'one' }, true), 2);
  assert.equal(nextIndex({ ...jumpTo(q, 0), repeat: 'one' }), 1);
  assert.equal(previousIndex({ ...jumpTo(q, 0), repeat: 'all' }), 2);
  assert.equal(previousIndex(jumpTo(q, 0)), null);
  assert.deepEqual(newQueue(0, 0).order, []);
  assert.equal(nextIndex(newQueue(0, 0)), null);
});

t('shuffled, every file plays once, the one playing first, and back in order at the same file', () => {
  const q = newQueue(6, 3, true, 'off', seeded([0.9, 0.1, 0.5, 0.3, 0.7]));
  assert.equal(current(q), 3);
  assert.deepEqual([...q.order].sort(), [0, 1, 2, 3, 4, 5]);
  assert.notDeepEqual(q.order, [3, 0, 1, 2, 4, 5]);
  // Walking it plays each once, then stops.
  let walk = q;
  const played = [current(walk)];
  for (let next = nextIndex(walk); next !== null; next = nextIndex(walk)) {
    walk = jumpTo(walk, next);
    played.push(next);
  }
  assert.deepEqual([...played].sort(), [0, 1, 2, 3, 4, 5]);
  const back = setShuffle(jumpTo(q, q.order[4]), false);
  assert.deepEqual(back.order, [0, 1, 2, 3, 4, 5]);
  assert.equal(current(back), q.order[4]);
  const again = setShuffle(back, true, seeded([0.2]));
  assert.equal(current(again), q.order[4]);
  assert.equal(again.at, 0);
});

t('repeat and speed go round', () => {
  assert.equal(nextRepeat('off'), 'all');
  assert.equal(nextRepeat('all'), 'one');
  assert.equal(nextRepeat('one'), 'off');
  assert.equal(nextSpeed(1), 1.25);
  assert.equal(nextSpeed(2), 0.5);
  assert.equal(nextSpeed(0.5), 0.75);
});

t('only videos and long music start where they were left, and not from a moment in or near the end', () => {
  const minute = 60_000;
  // A song of 4 minutes: nothing kept.
  assert.equal(positionToKeep(false, 2 * minute, 4 * minute), null);
  assert.equal(positionToKeep(false, 2 * minute, -1), null);
  // A long one, and any video.
  assert.equal(positionToKeep(false, 12 * minute, 40 * minute), 12 * minute);
  assert.equal(positionToKeep(true, 2 * minute, 5 * minute), 2 * minute);
  assert.equal(positionToKeep(true, 2 * minute, -1), 2 * minute);
  // Barely begun, near its end, or played to its end: forgotten.
  assert.equal(positionToKeep(true, 5_000, 5 * minute), 0);
  assert.equal(positionToKeep(true, 5 * minute - 10_000, 5 * minute), 0);
  assert.equal(positionToKeep(true, 0, 5 * minute), 0);
});

t('where files were left is kept sealed with the place, seen only with its key, and goes with the file', async () => {
  const p = place();
  const a = await addToCollection(p, bytesSource(randomBytes(10)), song);
  const b = await addToCollection(p, bytesSource(randomBytes(10)), { ...song, name: 'film.mp4', mime: 'video/mp4' });
  await keepPositions(p, [
    { id: a.id, ms: 754_000 },
    { id: b.id, ms: 61_000.4 },
    { id: 'f'.repeat(32), ms: 5 },
  ]);
  let c = await loadCollection(p);
  assert.equal(positionOf(c, a.id), 754_000);
  assert.equal(positionOf(c, b.id), 61_000);
  assert.equal(c.positions?.length, 2);
  // Not readable in what is kept, and not seen with another key.
  for (const text of files.values()) assert.ok(!text.includes('754000'));
  assert.equal((await loadCollection(place())).positions, undefined);
  // 0 forgets it; a deleted file's goes with it.
  await keepPositions(p, [{ id: a.id, ms: 0 }]);
  await deleteItems(p, [b.id]);
  c = await loadCollection(p);
  assert.equal(positionOf(c, a.id), 0);
  assert.equal(c.positions, undefined);
});

// ID3v2.3 with a title, an artist (UTF-16) and a cover.
function id3(): Uint8Array {
  const frame = (id: string, body: number[]) => [...utf8Encode(id), 0, 0, 0, body.length, 0, 0, ...body];
  const title = frame('TIT2', [3, ...utf8Encode('Τραγούδι')]);
  const artist = frame('TPE1', [1, 0xff, 0xfe, ...[...'Ana'].flatMap((ch) => [ch.charCodeAt(0), 0])]);
  const cover = frame('APIC', [0, ...utf8Encode('image/jpeg'), 0, 3, ...utf8Encode('front'), 0, 0xff, 0xd8, 0xff, 0xe0]);
  const body = [...title, ...artist, ...cover];
  const size = body.length;
  return Uint8Array.from([...utf8Encode('ID3'), 3, 0, 0, (size >> 21) & 0x7f, (size >> 14) & 0x7f, (size >> 7) & 0x7f, size & 0x7f, ...body, 0xff, 0xfb]);
}

// An M4A's ftyp and moov/udta/meta/ilst with ©nam and ©alb.
function m4a(): Uint8Array {
  const box = (type: number[], body: number[]) => {
    const size = 8 + body.length;
    return [(size >> 24) & 0xff, (size >> 16) & 0xff, (size >> 8) & 0xff, size & 0xff, ...type, ...body];
  };
  const name = (s: string) => [...s].map((ch) => ch.charCodeAt(0));
  const data = (text: string) => box(name('data'), [0, 0, 0, 1, 0, 0, 0, 0, ...utf8Encode(text)]);
  const ilst = box(name('ilst'), [...box([0xa9, ...name('nam')], data('Night')), ...box([0xa9, ...name('alb')], data('Album'))]);
  const meta = box(name('meta'), [0, 0, 0, 0, ...ilst]);
  return Uint8Array.from([...box(name('ftyp'), name('M4A 0000')), ...box(name('moov'), box(name('udta'), meta))]);
}

t("a song's tags are read from its first bytes: ID3, MP4 and FLAC", () => {
  const tags = readTags(id3());
  assert.equal(tags.title, 'Τραγούδι');
  assert.equal(tags.artist, 'Ana');
  assert.equal(tags.picture?.mime, 'image/jpeg');
  assert.deepEqual([...tags.picture!.bytes], [0xff, 0xd8, 0xff, 0xe0]);
  assert.deepEqual(readTags(m4a()), { title: 'Night', album: 'Album' });
  // FLAC's Vorbis comments.
  const comment = (s: string) => [s.length, 0, 0, 0, ...utf8Encode(s)];
  const vorbis = [...comment('x'), 2, 0, 0, 0, ...comment('TITLE=Song'), ...comment('ARTIST=Band')];
  const flac = Uint8Array.from([...utf8Encode('fLaC'), 0x84, 0, 0, vorbis.length, ...vorbis]);
  assert.deepEqual(readTags(flac), { title: 'Song', artist: 'Band' });
  // Cut short, or nothing of the kind: nothing.
  assert.deepEqual(readTags(id3().slice(0, 12)), {});
  assert.deepEqual(readTags(randomBytes(100)), {});
  assert.deepEqual(readTags(new Uint8Array(0)), {});
});
