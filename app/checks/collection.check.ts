// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// The Collection (lock/collection-data.ts): each space's and hidden place's own files and folders,
// kept as a chat's files are so nothing tells them apart, seen only with their place's key, and
// left out only of a backup made while their place is open and its owner keeps them out, and each
// place's own choices for it.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { bytesSource } from '../lib/attachments';
import { randomBytes } from '../lib/crypto';
import { CHUNK_SIZES, PREFIX } from '../lock/attachment-files';
import {
  addFolder,
  addToCollection,
  backupSkips,
  CollectionFileTooLargeError,
  deleteFolder,
  deleteItems,
  hiddenPlaceOpen,
  itemThere,
  loadCollection,
  MAX_COLLECTION_FILE,
  moveItems,
  NoSuchFolderError,
  openCollectionSkips,
  openItem,
  openThumb,
  renameFolder,
  renameItem,
  setCollectionBackup,
  setCollectionOption,
  type CollectionPlace,
} from '../lock/collection-data';
import { setCurrentSpace } from '../lock/keys';
import { hiddenHolder } from '../lock/sealed-file';
import { blobs, files } from './files-memory';

const t = (name: string, fn: () => Promise<void>) =>
  test(name, async () => {
    files.clear();
    blobs.clear();
    setCurrentSpace(null);
    await fn();
  });

const place = (holder: CollectionPlace['holder'] = 'space', space = 0, key = randomBytes(32)): CollectionPlace => ({ holder, space, key });
const photo = { name: 'IMG_2041.jpg', mime: 'image/jpeg', kind: 'photo' as const, w: 40, h: 30 };
const chunkNames = () => [...blobs.keys()].filter((name) => name.startsWith(PREFIX)).sort();

t('a file goes in encrypted, in chunks like a chat file, and comes out whole', async () => {
  const p = place();
  const bytes = randomBytes(300 * 1024);
  const item = await addToCollection(p, bytesSource(bytes), photo, { thumb: randomBytes(2000), now: 5 });
  assert.equal(item.file.name, 'IMG_2041.jpg');
  assert.equal(item.folder, '');
  assert.equal(item.added, 5);
  assert.deepEqual(await openItem(item), bytes);
  assert.equal((await openThumb(item))?.length, 2000);
  assert.ok(await itemThere(item));
  // Every chunk is named and sized as a chat file's, and none holds the file's bytes as they are.
  for (const name of chunkNames()) {
    assert.match(name, /^erevos-file-[0-9a-f]{32}-\d+$/);
    assert.ok(CHUNK_SIZES.includes(blobs.get(name)!.length));
  }
  const head = Buffer.from(bytes.slice(0, 64)).toString('hex');
  for (const name of chunkNames()) assert.ok(!Buffer.from(blobs.get(name)!).toString('hex').includes(head));
  // The catalogue says nothing readable either.
  for (const text of files.values()) assert.ok(!text.includes('IMG_2041'));
  assert.deepEqual((await loadCollection(p)).items, [item]);
});

t('a hidden place, a space and another space each see only their own Collection', async () => {
  const space = place('space', 0);
  const hidden = place(hiddenHolder(0), 0);
  const other = place('space', 1);
  await addToCollection(space, bytesSource(randomBytes(10)), { ...photo, name: 'space.jpg' });
  await addToCollection(hidden, bytesSource(randomBytes(10)), { ...photo, name: 'hidden.jpg' });
  assert.deepEqual((await loadCollection(space)).items.map((i) => i.file.name), ['space.jpg']);
  assert.deepEqual((await loadCollection(hidden)).items.map((i) => i.file.name), ['hidden.jpg']);
  assert.deepEqual((await loadCollection(other)).items, []);
  // A wrong key opens nothing, and saves nothing over what is there.
  assert.deepEqual((await loadCollection({ ...space, key: randomBytes(32) })).items, []);
  assert.equal((await loadCollection(space)).items.length, 1);
});

t('names in one folder stay apart, and folders keep their files when deleted', async () => {
  const p = place();
  const docs = await addFolder(p, '  Έγγραφα / 2026 ', 1);
  assert.equal(docs.name, 'Έγγραφα 2026');
  assert.equal((await addFolder(p, 'Έγγραφα 2026', 2)).name, 'Έγγραφα 2026 (1)');
  const a = await addToCollection(p, bytesSource(randomBytes(10)), { ...photo, name: 'a.pdf', kind: 'file', mime: 'application/pdf' }, { folder: docs.id });
  const b = await addToCollection(p, bytesSource(randomBytes(10)), { ...photo, name: 'a.pdf', kind: 'file', mime: 'application/pdf' }, { folder: docs.id });
  assert.equal(b.file.name, 'a (1).pdf');
  const top = await addToCollection(p, bytesSource(randomBytes(10)), { ...photo, name: 'a.pdf', kind: 'file', mime: 'application/pdf' });
  assert.equal(top.file.name, 'a.pdf');
  await renameItem(p, b.id, 'a.pdf', 9);
  assert.equal((await loadCollection(p)).items.find((i) => i.id === b.id)!.file.name, 'a (1).pdf');
  await renameItem(p, b.id, 'Συμβόλαιο.pdf', 9);
  await renameFolder(p, docs.id, 'Χαρτιά', 10);
  let c = await loadCollection(p);
  assert.equal(c.items.find((i) => i.id === b.id)!.file.name, 'Συμβόλαιο.pdf');
  assert.equal(c.folders.find((f) => f.id === docs.id)!.name, 'Χαρτιά');
  await deleteFolder(p, docs.id, 11);
  c = await loadCollection(p);
  assert.ok(!c.folders.some((f) => f.id === docs.id));
  assert.deepEqual(c.items.map((i) => [i.file.name, i.folder]), [['a (1).pdf', ''], ['Συμβόλαιο.pdf', ''], ['a.pdf', '']]);
  assert.ok(c.gone.some((g) => g.id === docs.id && g.at === 11));
  assert.ok(c.items.every((i) => i.id !== a.id || i.at === 11));
  await assert.rejects(addToCollection(p, bytesSource(randomBytes(10)), photo, { folder: docs.id }), NoSuchFolderError);
  await assert.rejects(moveItems(p, [top.id], docs.id), NoSuchFolderError);
});

t('moving and deleting files', async () => {
  const p = place();
  const trip = await addFolder(p, 'Ταξίδι');
  const one = await addToCollection(p, bytesSource(randomBytes(10)), photo, { thumb: randomBytes(100) });
  const two = await addToCollection(p, bytesSource(randomBytes(200 * 1024)), photo);
  assert.equal(two.file.name, 'IMG_2041 (1).jpg');
  await moveItems(p, [one.id, two.id], trip.id, 7);
  const c = await loadCollection(p);
  assert.deepEqual(c.items.map((i) => [i.file.name, i.folder]), [['IMG_2041.jpg', trip.id], ['IMG_2041 (1).jpg', trip.id]]);
  const before = chunkNames().length;
  await deleteItems(p, [one.id], 8);
  assert.equal(chunkNames().length, before - 2);
  const after = await loadCollection(p);
  assert.deepEqual(after.items.map((i) => i.id), [two.id]);
  assert.deepEqual(after.gone, [{ id: one.id, at: 8 }]);
  await deleteItems(p, [two.id]);
  assert.deepEqual(chunkNames(), []);
});

t('a file too large is refused, and nothing of it stays', async () => {
  const p = place();
  const huge = { size: MAX_COLLECTION_FILE + 1, read: async () => new Uint8Array(0) };
  await assert.rejects(addToCollection(p, huge, photo), CollectionFileTooLargeError);
  const broken = { size: 3 * 1024 * 1024, read: async (at: number, length: number) => (at > 0 ? Promise.reject(new Error('gone')) : randomBytes(length)) };
  await assert.rejects(addToCollection(p, broken, photo));
  assert.deepEqual(chunkNames(), []);
  assert.deepEqual((await loadCollection(p)).items, []);
});

t('only an open place that keeps its Collection out of backups names its chunks to a backup', async () => {
  const space = place('space', 0);
  const hidden = place(hiddenHolder(1), 0);
  const item = await addToCollection(space, bytesSource(randomBytes(300 * 1024)), photo, { thumb: randomBytes(100) });
  const secret = await addToCollection(hidden, bytesSource(randomBytes(10)), photo);
  assert.equal((await loadCollection(space)).backup, true);
  assert.deepEqual(await backupSkips([space, hidden]), new Set());
  await setCollectionBackup(space, false);
  assert.equal((await loadCollection(space)).backup, false);
  const names = [...Array(item.file.count).keys()].map((n) => `${PREFIX}${item.file.id}-${n}`).concat(`${PREFIX}${item.thumb!.id}-0`);
  assert.deepEqual(await backupSkips([space, hidden]), new Set(names));
  // As a backup made now sees it: only the open space, then also the hidden place once open.
  assert.deepEqual(await openCollectionSkips(), new Set());
  setCurrentSpace(space.space, space.key);
  assert.deepEqual(await openCollectionSkips(), new Set(names));
  await setCollectionBackup(hidden, false);
  assert.deepEqual(await openCollectionSkips(), new Set(names));
  hiddenPlaceOpen(hidden, true);
  assert.deepEqual(await openCollectionSkips(), new Set([...names, `${PREFIX}${secret.file.id}-0`]));
  hiddenPlaceOpen(hidden, false);
  assert.deepEqual(await openCollectionSkips(), new Set(names));
});

t('each place keeps its own choices for its Collection, all off until turned on', async () => {
  const space = place('space', 0);
  const hidden = place(hiddenHolder(1), 0);
  const off = await loadCollection(space);
  assert.equal(off.deleteOriginals, undefined);
  assert.equal(off.stopOnLock, undefined);
  assert.equal(off.showTitle, undefined);
  await setCollectionOption(space, 'showTitle', true);
  await setCollectionOption(space, 'deleteOriginals', true);
  const on = await loadCollection(space);
  assert.equal(on.showTitle, true);
  assert.equal(on.deleteOriginals, true);
  assert.equal(on.stopOnLock, undefined);
  assert.equal(on.backup, true);
  // The hidden place's own are its own.
  assert.equal((await loadCollection(hidden)).showTitle, undefined);
  await setCollectionOption(space, 'showTitle', false);
  assert.equal((await loadCollection(space)).showTitle, undefined);
  assert.equal((await loadCollection(space)).deleteOriginals, true);
});

t('a catalogue naming chunks that are gone says so', async () => {
  const p = place();
  const item = await addToCollection(p, bytesSource(randomBytes(10)), photo);
  for (const name of chunkNames()) blobs.delete(name);
  assert.equal(await itemThere(item), false);
  assert.equal(await openItem(item), null);
});
