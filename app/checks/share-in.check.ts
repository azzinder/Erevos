// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// A photo or file another app shared, taken into the Collection with no plain copy: Android
// encrypts it as it comes (modules/erevos-collection, ShareActivity.kt, with Sealer.kt, whose
// chunks are lib/attachments.ts keepFile's), and Send to's Collection takes those very chunks, with
// the small picture and size made there in memory (lib/collection-import.ts importShared). Here
// the chunks are made as keepFile makes them, as the sealer is held to (collection-native.check):
// what goes in is the chunks as they were, nothing on the disk holds the file's bytes plain, and
// when the catalogue cannot take it, its chunks are deleted.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { bytesSource, keepFile } from '../lib/attachments';
import { randomBytes } from '../lib/crypto';
import { linkParts } from '../lib/open-link';
import { PREFIX } from '../lock/attachment-files';
import { addSealedToCollection, loadCollection, NoSuchFolderError, openItem, openThumb, type CollectionPlace } from '../lock/collection-data';
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
const chunks = () => new Map([...blobs].filter(([name]) => name.startsWith(PREFIX)));
const hex = (bytes: Uint8Array) => Buffer.from(bytes).toString('hex');

t('a file shared, encrypted as it came, goes into the Collection as it is: no plain copy, nor new chunks for it', async () => {
  const p = place();
  const bytes = randomBytes(1500 * 1024);
  const { id, key, chunk, count, size } = await keepFile(bytesSource(bytes), { name: 'x', mime: 'application/octet-stream', kind: 'file' });
  const sealed = chunks();
  // As the link gives it, by its id only.
  assert.deepEqual(linkParts(`/share?sealed=${id}&name=IMG_1.jpg&mime=image%2Fjpeg`).params, { sealed: id, name: 'IMG_1.jpg', mime: 'image/jpeg' });
  const thumb = randomBytes(900);
  const item = await addSealedToCollection(p, { id, key, chunk, count, size }, { name: 'IMG_1.jpg', mime: 'image/jpeg', kind: 'photo', w: 4000, h: 3000 }, { thumb });
  assert.equal(item.file.id, id);
  assert.deepEqual([item.file.w, item.file.h], [4000, 3000]);
  // The file's chunks are the very ones Android wrote; only the small picture's are new.
  for (const [name, data] of sealed) assert.equal(hex(chunks().get(name)!), hex(data));
  assert.equal(chunks().size, sealed.size + item.thumb!.count);
  assert.deepEqual(await openItem(item), bytes);
  assert.deepEqual(await openThumb(item), thumb);
  // Nothing stored holds the file's bytes as they are.
  const head = hex(bytes.slice(0, 64));
  for (const data of blobs.values()) assert.ok(!hex(data).includes(head));
  for (const text of files.values()) assert.ok(!text.includes('IMG_1'));
  assert.deepEqual((await loadCollection(p)).items, [item]);
});

t('a file shared that the Collection cannot take leaves nothing', async () => {
  const p = place();
  const { id, key, chunk, count, size } = await keepFile(bytesSource(randomBytes(5000)), { name: 'x', mime: 'application/octet-stream', kind: 'file' });
  await assert.rejects(addSealedToCollection(p, { id, key, chunk, count, size }, { name: 'a.pdf', mime: 'application/pdf', kind: 'file' }, { folder: 'ab'.repeat(16), thumb: randomBytes(100) }), NoSuchFolderError);
  assert.equal(chunks().size, 0);
});
