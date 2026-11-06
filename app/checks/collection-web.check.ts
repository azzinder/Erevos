// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// The Collection in the web build outside the desktop app: a browser (an iPhone's home-screen app
// too) and Sailfish OS. It is a module there (lib/modules.ts); a file read a slice at a time is
// never read whole; a storage that fills up midway leaves nothing of the file and the catalogue as
// it was (lock/collection-data.ts CollectionStorageFullError), and the browser's storage tells a
// full disk when the transaction aborts, not only when the write fails (lib/web-store.ts); what is
// opened or saved out is held in memory up to 256 MB there, 1 GB in the desktop app, and is a Blob
// made of the decrypted pieces, not of one array put together (lib/collection-memory.ts).
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { room, type Source } from '../lib/attachments';
import { blobOfPieces, mostInMemory, mostSavedOut } from '../lib/collection-memory';
import { randomBytes } from '../lib/crypto';
import { modulesHere } from '../lib/modules';
import { CHUNK_SIZES, PREFIX } from '../lock/attachment-files';
import { addToCollection, CollectionStorageFullError, isStorageFull, loadCollection, openItem, openItemPieces, type CollectionPlace } from '../lock/collection-data';
import { setCurrentSpace } from '../lock/keys';
import { blobs, files } from './files-memory';

const t = (name: string, fn: () => Promise<void>) =>
  test(name, async () => {
    files.clear();
    blobs.clear();
    setCurrentSpace(null);
    await fn();
  });

const place = (): CollectionPlace => ({ holder: 'space', space: 0, key: randomBytes(32) });
const video = { name: 'clip.mp4', mime: 'video/mp4', kind: 'file' as const };
const chunkNames = () => [...blobs.keys()].filter((name) => name.startsWith(PREFIX));

// A picked File as the browser gives it: read by File.slice, one piece at a time, noting the largest read.
function sliced(bytes: Uint8Array): Source & { most: number } {
  const source = {
    size: bytes.length,
    most: 0,
    read: async (at: number, length: number) => {
      source.most = Math.max(source.most, length);
      return bytes.slice(at, at + length);
    },
  };
  return source;
}

class QuotaExceeded extends Error {
  override name = 'QuotaExceededError';
}

// The memory store's writes fail with a full storage once `after` chunks were written.
function fillsAfter(after: number): () => void {
  const set = blobs.set.bind(blobs);
  let written = 0;
  blobs.set = (name: string, bytes: Uint8Array) => {
    if (name.startsWith(PREFIX) && written++ >= after) throw new QuotaExceeded('The quota has been exceeded.');
    return set(name, bytes);
  };
  return () => {
    blobs.set = set;
  };
}

test('the Collection is a module in a browser, on Sailfish OS and in the desktop app, and on Android', () => {
  for (const shell of [null, 'sailfish', 'electron'] as const) assert.ok(modulesHere('web', shell).includes('collection'), String(shell));
  assert.ok(modulesHere('android').includes('collection'));
  assert.ok(!modulesHere('ios').includes('collection'));
});

t('a file picked in a browser is read a slice at a time, never whole', async () => {
  const p = place();
  const bytes = randomBytes(3 * room(CHUNK_SIZES[CHUNK_SIZES.length - 1]) + 1234);
  const source = sliced(bytes);
  const item = await addToCollection(p, source, video);
  assert.ok(source.most <= room(item.file.chunk));
  assert.ok(source.most < bytes.length);
  assert.deepEqual(await openItem(item), bytes);
});

t('a storage full midway leaves no chunk of the file, and the catalogue as it was', async () => {
  const p = place();
  const before = await addToCollection(p, sliced(randomBytes(1000)), { ...video, name: 'small.mp4' });
  const kept = chunkNames().sort();
  const restore = fillsAfter(3);
  try {
    await assert.rejects(addToCollection(p, sliced(randomBytes(6 * room(CHUNK_SIZES[CHUNK_SIZES.length - 1]))), video), CollectionStorageFullError);
  } finally {
    restore();
  }
  assert.deepEqual(chunkNames().sort(), kept);
  const after = await loadCollection(p);
  assert.deepEqual(after.items.map((i) => i.id), [before.id]);
  assert.match(new CollectionStorageFullError().message, /no room left/);
});

t('a storage full for the small picture leaves nothing either', async () => {
  const p = place();
  const bytes = randomBytes(5000);
  // The file's one chunk goes in, the small picture's does not.
  const restore = fillsAfter(1);
  try {
    await assert.rejects(addToCollection(p, sliced(bytes), { ...video, name: 'IMG.jpg', mime: 'image/jpeg', kind: 'photo' }, { thumb: randomBytes(500) }), CollectionStorageFullError);
  } finally {
    restore();
  }
  assert.deepEqual(chunkNames(), []);
  assert.deepEqual((await loadCollection(p)).items, []);
});

t('another failure is told as it is, and leaves nothing too', async () => {
  const p = place();
  const source: Source = { size: 3 * room(CHUNK_SIZES[CHUNK_SIZES.length - 1]), read: async (at, length) => {
    if (at > 0) throw new Error('The file picked is not there any more.');
    return randomBytes(length);
  } };
  await assert.rejects(addToCollection(p, source, video), /not there any more/);
  assert.deepEqual(chunkNames(), []);
});

test('what tells a full storage', () => {
  assert.ok(isStorageFull(new QuotaExceeded()));
  assert.ok(isStorageFull({ name: 'NS_ERROR_DOM_QUOTA_REACHED' }));
  assert.ok(isStorageFull({ name: 'Error', code: 22 }));
  assert.ok(!isStorageFull(new Error('quota')));
  assert.ok(!isStorageFull(null));
});

test('opened in memory: 1 GB in the desktop app, 256 MB in a browser and on Sailfish OS; saved out whole, so capped, only in a browser', () => {
  assert.equal(mostInMemory('electron'), 1024 * 1024 * 1024);
  assert.equal(mostInMemory(null), 256 * 1000 * 1000);
  assert.equal(mostInMemory('sailfish'), 256 * 1000 * 1000);
  // A plain browser saves a file whole; the shells take it a piece at a time (/__saving).
  assert.equal(mostSavedOut(null, true), mostInMemory(null));
  assert.equal(mostSavedOut('sailfish', true), Infinity);
  assert.equal(mostSavedOut('electron', true), Infinity);
  // The phone writes it out a piece at a time.
  assert.equal(mostSavedOut(null, false), Infinity);
});

t('a Blob is made of the decrypted pieces, in order, with the file’s type', async () => {
  const p = place();
  const bytes = randomBytes(2 * room(CHUNK_SIZES[CHUNK_SIZES.length - 1]) + 99);
  const item = await addToCollection(p, sliced(bytes), video);
  const pieces = await openItemPieces(item);
  assert.ok(pieces);
  assert.equal(pieces.length, item.file.count);
  const blob = blobOfPieces(pieces, item.file.mime);
  assert.equal(blob.type, 'video/mp4');
  assert.equal(blob.size, bytes.length);
  assert.deepEqual(new Uint8Array(await blob.arrayBuffer()), bytes);
  assert.equal(blobOfPieces([], '').type, 'application/octet-stream');
  // Its chunks gone, as after a backup restored without them: nothing to open.
  for (const name of chunkNames()) blobs.delete(name);
  assert.equal(await openItemPieces(item), null);
});

// The browser's storage, with a fake IndexedDB whose transaction takes the write and then aborts
// for want of room, as Chromium and Safari do.
type Fake = { abort: boolean; stored: Map<string, unknown> };

function fakeIndexedDb(fake: Fake): void {
  const later = (run: () => void) => setTimeout(run, 0);
  const objectStore = (transaction: Record<string, unknown>) => ({
    transaction,
    put(value: unknown, key: string) {
      const request: Record<string, unknown> = { result: key, error: null };
      later(() => {
        (request.onsuccess as (() => void) | undefined)?.();
        later(() => {
          if (fake.abort) {
            transaction.error = new QuotaExceeded('The quota has been exceeded.');
            (transaction.onabort as (() => void) | undefined)?.();
          } else {
            fake.stored.set(key, value);
            (transaction.oncomplete as (() => void) | undefined)?.();
          }
        });
      });
      return request;
    },
  });
  const db = {
    transaction: () => {
      const transaction: Record<string, unknown> = { error: null };
      transaction.objectStore = () => objectStore(transaction);
      return transaction;
    },
    close: () => undefined,
  };
  (globalThis as { indexedDB?: unknown }).indexedDB = {
    open: () => {
      const request: Record<string, unknown> = { result: db };
      later(() => (request.onsuccess as () => void)());
      return request;
    },
  };
}

test('the browser’s storage tells a write its transaction aborted for want of room, and keeps a copy of the bytes', async () => {
  const fake: Fake = { abort: false, stored: new Map() };
  fakeIndexedDb(fake);
  const { webWriteFile } = await import('../lib/web-store');
  const whole = randomBytes(64);
  const view = whole.subarray(8, 24);
  await webWriteFile('erevos-file-a', view);
  const kept = fake.stored.get('erevos-file-a') as Uint8Array;
  assert.deepEqual(kept, view);
  assert.equal(kept.buffer.byteLength, 16);
  fake.abort = true;
  await assert.rejects(webWriteFile('erevos-file-b', randomBytes(16)), (error: unknown) => isStorageFull(error));
  assert.ok(!fake.stored.has('erevos-file-b'));
});
