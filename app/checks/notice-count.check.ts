// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// What the Android messages notice counts (lib/notice-count.ts): a message deleted for everyone
// before it was read, or read on a linked device, no longer counts; the count never goes up for it.

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { NoticeCount, onReadElsewhere, readElsewhere } from '../lib/notice-count';

test('a message deleted for everyone no longer counts, where it came; one of another chat in the same hidden place still does', () => {
  const count = new NoticeCount();
  count.came('chat:ann', 'chat:ann', 1, 'a1');
  count.came('chat:ann', 'chat:ann', 1, 'a2');
  count.came('hidden:1', 'chat:bob', 1, 'b1');
  count.came('hidden:1', 'chat:cat', 1, 'c1');
  assert.equal(count.total(), 4);
  assert.equal(count.gone('chat:ann', 'a1'), true);
  assert.equal(count.total(), 3);
  // Again, or one never counted: nothing changes.
  assert.equal(count.gone('chat:ann', 'a1'), false);
  assert.equal(count.gone('chat:ann', 'old'), false);
  // All of a chat's, in a hidden place: only that chat's share.
  assert.equal(count.gone('chat:bob', null), true);
  assert.equal(count.total(), 2);
  assert.equal(count.counts(['hidden:1']), true);
  assert.equal(count.gone('chat:cat', 'c1'), true);
  assert.equal(count.counts(['hidden:1']), false);
  assert.equal(count.total(), 1);
});

test('what shows on the screen, or the space shown again, counts no more, and is not taken off twice', () => {
  const count = new NoticeCount();
  count.came('chat:ann', 'chat:ann', 1, 'a1');
  count.came('group:g', 'group:g', 2);
  assert.equal(count.seen('chat:ann'), true);
  assert.equal(count.seen('chat:ann'), false);
  assert.equal(count.gone('chat:ann', 'a1'), false);
  assert.equal(count.total(), 2);
  assert.equal(count.clear(), true);
  assert.equal(count.clear(), false);
  assert.equal(count.total(), 0);
});

test('as Erevos leaves, what was not read counts from then on, and is held to what the chat has not read once a message goes or is read elsewhere', () => {
  const count = new NoticeCount();
  count.came('chat:ann', 'chat:ann', 1, 'a1');
  count.came('chat:ann', 'chat:ann', 1, 'a2');
  // A voice message whose parts are still coming has no row yet: it counts besides.
  count.came('chat:bob', 'chat:bob', 1, 'v1');
  const counted = count.spaceCounted();
  count.leave(counted, new Map([
    ['chat:ann', 3],
    ['group:g', 2],
  ]));
  assert.equal(count.total(), 6);
  // Its tag no longer tells which it is: the chat's history does.
  assert.equal(count.gone('chat:ann', 'a1'), false);
  assert.equal(count.readNow(['chat:ann'], new Map([['chat:ann', 2]])), true);
  assert.equal(count.total(), 5);
  // Read on a linked device: none left there; a group not named stays as it was.
  assert.equal(count.readNow(['chat:ann'], new Map()), true);
  assert.equal(count.total(), 3);
  assert.equal(count.counts(['group:g']), true);
  // More not read than is counted never raises the count.
  assert.equal(count.readNow(['group:g'], new Map([['group:g', 9]])), false);
  assert.equal(count.total(), 3);
  // What came after leaving, and is read elsewhere.
  count.came('group:g', 'group:g', 1);
  assert.equal(count.readNow(['group:g'], new Map([['group:g', 2]])), true);
  assert.equal(count.total(), 3);
  assert.equal(count.readNow(['group:g', 'chat:bob'], new Map([['chat:bob', 1]])), true);
  assert.equal(count.total(), 1);
});

test('with no number on the icon, a deleted message that came since is taken off by its tag, though older ones are not read', () => {
  const count = new NoticeCount();
  count.came('chat:ann', 'chat:ann', 1, 'a5');
  // The chat had 4 not read from before; one that came since is deleted.
  assert.equal(count.gone('chat:ann', 'a5'), true);
  assert.equal(count.readNow(['chat:ann'], new Map([['chat:ann', 4]])), false);
  assert.equal(count.total(), 0);
});

test('a read on a linked device is told to whoever listens, until it stops', () => {
  const heard: string[][] = [];
  const stop = onReadElsewhere((where) => heard.push(where));
  readElsewhere(['chat:ann']);
  stop();
  readElsewhere(['group:g']);
  assert.deepEqual(heard, [['chat:ann']]);
});
