// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// Sending files of a hidden place's Collection (lib/hidden-send.ts): the picker lists only that
// place's own chats, and the two pickers (hidden and the space's) never lend each other's files.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { collectionIds, hiddenTargets } from '../lib/hidden-send';

test('the picker lists the given contacts and groups, by name, and tells where each goes', () => {
  const targets = hiddenTargets([{ identity: 'b2', name: 'Zoe' }, { identity: 'a1', name: 'Ana' }], [{ id: 'g1', name: 'Family' }]);
  assert.deepEqual(targets.map((t) => [t.name, t.kind, t.to]), [
    ['Ana', 'chat', 'contact:a1'],
    ['Family', 'group', 'group:g1'],
    ['Zoe', 'chat', 'contact:b2'],
  ]);
  assert.deepEqual(hiddenTargets([], []), []);
});

test('searching ignores case and Greek accents', () => {
  const targets = hiddenTargets([{ identity: 'a', name: 'Μαρία' }, { identity: 'b', name: 'Nick' }], [{ id: 'g', name: 'Οικογένεια' }], ' μαρια ');
  assert.deepEqual(targets.map((t) => t.name), ['Μαρία']);
  assert.deepEqual(hiddenTargets([{ identity: 'a', name: 'Μαρία' }], [{ id: 'g', name: 'Οικογένεια' }], 'ΟΙΚΟΓΕΝΕΙΑ').map((t) => t.key), ['group:g']);
});

test('only well-formed file ids are taken, each once', () => {
  const id = 'a'.repeat(32);
  assert.deepEqual(collectionIds(`${id},zz,${id},${'B'.repeat(32)},`), [id]);
  assert.deepEqual(collectionIds(''), []);
});

const source = (file: string) => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');

test('the hidden place’s files never reach the space’s chats, nor the space’s the hidden place’s', () => {
  const hidden = source('app/collection-send.tsx');
  for (const space of ['spaceChats', 'spaceGroups', 'spaceCollection', 'loadInboxCache', 'currentSpace']) assert.ok(!hidden.includes(space), `collection-send.tsx uses ${space}`);
  assert.ok(hidden.includes('hiddenCollection'));
  const shared = source('app/share.tsx');
  for (const own of ['hiddenCollection', 'openHiddenPlace', 'useOpenHiddenPlace', 'collectionPlaceNow']) assert.ok(!shared.includes(own), `share.tsx uses ${own}`);
});
