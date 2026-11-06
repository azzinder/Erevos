// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// How the Collection's screen lays out its files (lib/collection-view.ts): folders, photos by
// month, search and the kind of each file.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { Collection, CollectionItem } from '../lock/collection-data';
import { fileLook, folderTiles, gridEntries, inFolder, isText, monthGroups, search } from '../lib/collection-view';

const at = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12).getTime();
const item = (id: string, name: string, kind: 'photo' | 'file', added: number, folder = '', mime = 'application/octet-stream'): CollectionItem => ({
  id,
  file: { name, mime, kind, size: 10, id: id.padEnd(32, '0'), key: '', chunk: 1, count: 1 },
  folder,
  added,
  at: added,
});

const collection: Collection = {
  items: [
    item('a', 'IMG_1.jpg', 'photo', at(2026, 11, 3), '', 'image/jpeg'),
    item('b', 'IMG_2.jpg', 'photo', at(2026, 11, 5), '', 'image/jpeg'),
    item('c', 'IMG_3.jpg', 'photo', at(2026, 10, 30), '', 'image/jpeg'),
    item('d', 'Συμβόλαιο.pdf', 'file', at(2026, 11, 1), '', 'application/pdf'),
    item('e', 'notes.txt', 'file', at(2026, 11, 2), 'f1', 'text/plain'),
    item('g', 'IMG_4.jpg', 'photo', at(2026, 11, 6), '', 'image/jpeg'),
    item('h', 'IMG_5.jpg', 'photo', at(2026, 11, 7), '', 'image/jpeg'),
  ],
  folders: [
    { id: 'f2', name: 'Ταξίδι', at: 1 },
    { id: 'f1', name: 'Έγγραφα', at: 2 },
  ],
  gone: [],
  backup: true,
};

test('a folder holds its own files, the newest first; the top holds the rest', () => {
  assert.deepEqual(inFolder(collection, 'f1').map((i) => i.id), ['e']);
  assert.deepEqual(inFolder(collection, '').map((i) => i.id), ['h', 'g', 'b', 'a', 'd', 'c']);
  assert.deepEqual(inFolder(collection, 'f2'), []);
});

test('folders by name with how many files each holds', () => {
  assert.deepEqual(folderTiles(collection).map((f) => [f.name, f.count]), [['Έγγραφα', 1], ['Ταξίδι', 0]]);
});

test('photos are grouped by month, the newest first, and drawn in rows of three', () => {
  const photos = inFolder(collection, '').filter((i) => i.file.kind === 'photo');
  const groups = monthGroups(photos);
  assert.deepEqual(groups.map((g) => [g.month, g.items.map((i) => i.id)]), [['2026-11', ['h', 'g', 'b', 'a']], ['2026-10', ['c']]]);
  const entries = gridEntries(photos);
  assert.deepEqual(entries.map((e) => (e.kind === 'month' ? e.month : e.items.length)), ['2026-11', 3, 1, '2026-10', 1]);
  assert.deepEqual(gridEntries([]), []);
});

test('a search finds a name by its words, ignoring accents and case, in every folder', () => {
  assert.deepEqual(search(collection.items, 'συμβολαιο').map((i) => i.id), ['d']);
  assert.deepEqual(search(collection.items, 'NOTES txt').map((i) => i.id), ['e']);
  assert.deepEqual(search(collection.items, 'img 3').map((i) => i.id), ['c']);
  assert.deepEqual(search(collection.items, 'img pdf'), []);
  assert.equal(search(collection.items, '   ').length, collection.items.length);
});

test('each file has its kind: a photo, a PDF, text, an archive or another', () => {
  const look = (name: string, mime: string) => fileLook(item('x', name, 'file', 0, '', mime));
  assert.equal(look('a.pdf', 'application/octet-stream'), 'pdf');
  assert.equal(look('a.zip', 'application/zip'), 'archive');
  assert.equal(look('a.txt', 'text/plain'), 'text');
  assert.equal(look('a.csv', 'application/octet-stream'), 'text');
  assert.equal(look('a.docx', 'application/octet-stream'), 'other');
  assert.equal(fileLook(item('x', 'p.jpg', 'photo', 0)), 'photo');
  assert.equal(isText(item('x', 'data.json', 'file', 0, '', 'application/json')), true);
});
