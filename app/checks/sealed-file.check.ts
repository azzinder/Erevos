// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// Values sealed per space and per hidden chats in one file (lock/sealed-file.ts): each the same size
// in it whether used or not, a large one in pages of the history's size, and pages written only as
// they change. Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { encryptText, randomBytes } from '../lib/crypto';
import { DamagedValueError, holdPages, PAGE, PAGE_PREFIX, sealedFile } from '../lock/sealed-file';
import { blobs, files } from './files-memory';

const t = (name: string, fn: () => Promise<void>) =>
  test(name, async () => {
    files.clear();
    blobs.clear();
    await fn();
  });

type Data = { items: string[] };
const EMPTY: Data = { items: [] };
const checked = (v: unknown): Data => {
  const items = (v as Partial<Data> | null)?.items;
  return { items: Array.isArray(items) ? items.filter((s): s is string => typeof s === 'string') : [] };
};
const NAME = 'erevos-check-sealed.json';
const BLOCK = 1024;
const make = () => sealedFile({ name: NAME, empty: EMPTY, checked, block: BLOCK });

// Lots of text, so that it takes several pages.
const many = (n: number, tag = 'x') => ({ items: Array.from({ length: n }, (_, i) => `${tag}${i}`.padEnd(100, 'é')) });
const stored = () => JSON.parse(files.get(NAME)!) as Record<string, string[]>;
const pages = () => [...blobs.keys()].filter((name) => name.startsWith(PAGE_PREFIX)).sort();

t('a used value, small or in pages, is the same size in the file as an unused one', async () => {
  const store = make();
  const key = randomBytes(32);
  const hidden = randomBytes(32);
  const large = many(500);
  await store.save('space', 1, key, large);
  await store.save('hidden', 2, hidden, { items: ['a'] });
  const sizes = new Set(Object.values(stored()).flat().map((value) => value.length));
  assert.equal(sizes.size, 1);
  // Every page is the history's size, sealed alike.
  assert.ok(pages().length >= Math.ceil(JSON.stringify(large).length / PAGE));
  assert.equal(new Set(pages().map((name) => blobs.get(name)!.length)).size, 1);
  assert.deepEqual(await make().load('space', 1, key), large);
  assert.deepEqual(await make().load('hidden', 2, hidden), { items: ['a'] });
  // Another key opens nothing, and finds no pages.
  assert.deepEqual(await make().load('space', 1, randomBytes(32)), EMPTY);
  assert.deepEqual(await make().load('space', 0, key), EMPTY);
});

t('saving again writes only the pages that changed, and lets the old ones go', async () => {
  const store = make();
  const key = randomBytes(32);
  const first = many(500);
  await store.save('space', 0, key, first);
  const before = pages();
  // The same again: no page changes.
  await store.save('space', 0, key, first);
  assert.deepEqual(pages(), before);
  // A change at the end: the last page only.
  const longer = { items: [...first.items, 'one more'] };
  await store.save('space', 0, key, longer);
  const after = pages();
  assert.equal(after.length, before.length);
  assert.equal(after.filter((name) => !before.includes(name)).length, 1);
  // Opened by a fresh store, as after a restart: the same, and a change at the start rewrites them all.
  const again = make();
  assert.deepEqual(await again.load('space', 0, key), longer);
  await again.save('space', 0, key, { items: ['new', ...longer.items] });
  assert.equal(pages().filter((name) => after.includes(name)).length, 0);
  // Small again: back in the file, and every page goes.
  await again.save('space', 0, key, { items: ['small'] });
  assert.deepEqual(pages(), []);
  assert.deepEqual(await make().load('space', 0, key), { items: ['small'] });
});

t('a value kept in whole blocks, before pages, is read and goes to pages when saved', async () => {
  const key = randomBytes(32);
  const old = many(40, 'old');
  const json = JSON.stringify(old);
  const size = Math.ceil(new TextEncoder().encode(json).length / BLOCK) * BLOCK;
  const fake = () => encryptText(randomBytes(32), JSON.stringify(EMPTY) + ' '.repeat(BLOCK - JSON.stringify(EMPTY).length));
  const values = Object.fromEntries(['space', 'hidden', 'hidden1', 'hidden2', 'hidden3'].map((h) => [h, [fake(), fake(), fake(), fake()]]));
  values.space[0] = encryptText(key, json + ' '.repeat(size - new TextEncoder().encode(json).length));
  files.set(NAME, JSON.stringify(values));
  const store = make();
  assert.deepEqual(await store.load('space', 0, key), old);
  await store.save('space', 0, key, old);
  assert.equal(new Set(Object.values(stored()).flat().map((value) => value.length)).size, 1);
  assert.ok(pages().length > 0);
  assert.deepEqual(await make().load('space', 0, key), old);
});

t('a value whose page is missing is not read as empty, so nothing saves over it', async () => {
  const key = randomBytes(32);
  await make().save('space', 0, key, many(300));
  blobs.delete(pages()[0]);
  await assert.rejects(make().load('space', 0, key), DamagedValueError);
});

t('while pages are held, as a backup reads, the ones let go of stay until it lets go', async () => {
  const key = randomBytes(32);
  await make().save('space', 0, key, many(300));
  const first = pages();
  const release = holdPages();
  await make().save('space', 0, key, many(300, 'y'));
  // The old pages are all still there, beside the new ones: a file read before still finds them.
  assert.ok(first.every((name) => blobs.has(name)));
  const second = pages().filter((name) => !first.includes(name));
  assert.ok(second.length > 0);
  // Two holding at once: the pages go only when both let go.
  const other = holdPages();
  await release();
  await release();
  assert.ok(first.every((name) => blobs.has(name)));
  await other();
  assert.deepEqual(pages(), second);
  assert.deepEqual(await make().load('space', 0, key), many(300, 'y'));
  // And with nothing held, they go at once again.
  await make().save('space', 0, key, many(300, 'z'));
  assert.ok(second.every((name) => !blobs.has(name)));
});
