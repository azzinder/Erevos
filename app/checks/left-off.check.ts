// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// Where a chat was left as it opens (lib/left-off.ts): the first of the messages that were new.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { leftOff } from '../lib/left-off';

type M = { id: string; mine: boolean };
const m = (id: string, mine = false): M => ({ id, mine });
const left = (list: M[], unread: number) =>
  leftOff(
    list,
    unread,
    (x) => x.id,
    (x) => x.mine,
  );

test('the oldest of the new messages is where it was left', () => {
  const list = [m('1'), m('2'), m('3'), m('4'), m('5')];
  assert.equal(left(list, 1), '5');
  assert.equal(left(list, 3), '3');
});

test('our own messages do not count among the new ones', () => {
  const list = [m('1'), m('2'), m('3', true), m('4'), m('5', true), m('6')];
  assert.equal(left(list, 2), '4');
  assert.equal(left(list, 3), '2');
});

test('nothing new, or everything new, leaves no place to go to', () => {
  const list = [m('1'), m('2'), m('3')];
  assert.equal(left(list, 0), null);
  assert.equal(left(list, 3), null);
  assert.equal(left(list, 99), null);
  assert.equal(left([], 2), null);
});
