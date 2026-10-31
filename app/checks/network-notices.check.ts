// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// What the chats on Matrix, XMPP and Nostr tell of their messages (lib/network-notices.ts): what
// came and what was read, after each change of an account; nothing of what an account takes in as
// it is signed in to; a muted chat left out of the icon's number; and counted by the Android notice
// as the space's own chats are (lib/notice-count.ts).

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ALWAYS, type ChatNotify } from '../lock/chat-notify';
import { chatNotify } from '../lib/chat-notices';
import { addNetwork, hearing, isNetworkChat, networkNotify, networkUnreadAt, onNetworkMessage, onNetworkRead, unreadChange } from '../lib/network-notices';
import { NoticeCount } from '../lib/notice-count';

test('what went up came, what went down or went was read', () => {
  const before = new Map([
    ['matrix:!a', 2],
    ['matrix:!b', 1],
    ['matrix:!c', 4],
  ]);
  const after = new Map([
    ['matrix:!a', 5],
    ['matrix:!c', 1],
    ['matrix:!d', 1],
  ]);
  assert.deepEqual(unreadChange(before, after), {
    came: [
      ['matrix:!a', 3],
      ['matrix:!d', 1],
    ],
    read: ['matrix:!c', 'matrix:!b'],
  });
  assert.deepEqual(unreadChange(after, after), { came: [], read: [] });
});

test('a store tells of changes only after its first count, and none of a quiet one', () => {
  const came: [string, number][] = [];
  const read: string[][] = [];
  const stopCame = onNetworkMessage((where, times) => came.push([where, times]));
  const stopRead = onNetworkRead((where) => read.push(where));
  const heard = hearing();
  // Loaded with messages not read from before: nothing is told of them again.
  heard.hear(new Map([['xmpp:ann@example.org', 2]]));
  assert.deepEqual(came, []);
  heard.hear(new Map([['xmpp:ann@example.org', 3]]));
  assert.deepEqual(came, [['xmpp:ann@example.org', 1]]);
  // Signed in again, taking in the archive: quiet.
  heard.hear(
    new Map([
      ['xmpp:ann@example.org', 3],
      ['xmpp:bob@example.org', 40],
    ]),
    true,
  );
  assert.deepEqual(came, [['xmpp:ann@example.org', 1]]);
  // Read on another device: told as read; then signed out: all read.
  heard.hear(new Map([['xmpp:bob@example.org', 40]]));
  heard.hear(new Map());
  assert.deepEqual(read, [['xmpp:ann@example.org'], ['xmpp:bob@example.org']]);
  stopCame();
  stopRead();
});

test("a muted network chat is left out of the number, and its own notifications are found by its row", () => {
  const notify: Record<string, ChatNotify> = {
    'nostr:aa': { until: ALWAYS },
    'nostr:bb': { until: 1 },
    'nostr:cc': { sound: '' },
  };
  addNetwork('nostr:', {
    unread: () =>
      new Map([
        ['nostr:aa', 3],
        ['nostr:bb', 2],
        ['nostr:cc', 1],
      ]),
    notifyOf: (where) => notify[where] ?? null,
  });
  // Muted for good is left out; muted until long ago is not muted.
  assert.deepEqual(
    [...networkUnreadAt()].sort(),
    [
      ['nostr:bb', 2],
      ['nostr:cc', 1],
    ],
  );
  assert.deepEqual(networkNotify('nostr:cc'), { sound: '' });
  assert.deepEqual(chatNotify('nostr:cc'), { sound: '' });
  // Never in a hidden place, nor for what is not a network chat.
  assert.equal(chatNotify('nostr:cc', 1), null);
  assert.equal(networkNotify('chat:cc'), null);
  assert.equal(isNetworkChat('matrix:!r:example.org'), true);
  assert.equal(isNetworkChat('chat:abc'), false);
  // A store whose account is not open says nothing, and the others still count.
  addNetwork('matrix:', {
    unread: () => {
      throw new Error('closed');
    },
    notifyOf: () => null,
  });
  assert.equal(networkUnreadAt().size, 2);
  addNetwork('nostr:', { unread: () => new Map(), notifyOf: () => null });
  addNetwork('matrix:', { unread: () => new Map(), notifyOf: () => null });
});

test("the Android notice counts network chats as the space's own, also as Erevos leaves the screen", () => {
  const count = new NoticeCount();
  count.came('matrix:!a', 'matrix:!a', 2);
  count.came('hidden:1', 'chat:x', 1);
  assert.deepEqual([...count.spaceCounted()], [['matrix:!a', 2]]);
  // Erevos leaves with three not read in the room: the two that came are among them.
  count.leave(count.spaceCounted(), new Map([['matrix:!a', 3]]));
  assert.equal(count.total(), 4);
  // Read on another device of the account: it counts no more.
  assert.equal(count.readNow(['matrix:!a'], new Map()), true);
  assert.equal(count.total(), 1);
});
