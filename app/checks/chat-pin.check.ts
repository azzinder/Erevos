// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// Chats locked with a PIN of their own (lock/chat-pin.ts): the PIN kept only as Argon2id of it,
// wrong ones counted, and the list, its kept copy, the search and linked devices showing nothing of
// such a chat but its name. Its PIN going into hidden chats and back is in e2e.check.ts.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { setHardCost } from '../lib/crypto';
import { buildInbox, filterInbox, groupRows } from '../lib/inbox';
import { mirrorGroups, mirrorOf } from '../lib/link-wire';
import { checkedChatPin, makeChatPin, opensChat } from '../lock/chat-pin';
import { kept } from '../lock/inbox-cache';
import type { Contact } from '../lock/e2e-data';
import type { Group } from '../lock/group-data';
import { CHAT_TRIES, FREE_TRIES, LockedOutError, prepareTries } from '../lock/tries';
import { store } from './secure-memory';

const A = 'aa'.repeat(32);
const B = 'bb'.repeat(32);

test('a PIN is kept only as Argon2id of it, opens only with itself, and wrong ones make the next wait', async () => {
  setHardCost({ m: 64, t: 1 });
  store.clear();
  try {
    await prepareTries();
    assert.ok(store.has(CHAT_TRIES), 'the count is there from the first start');
    const pin = await makeChatPin('2468');
    assert.equal(JSON.stringify(pin).includes('2468'), false);
    assert.deepEqual(checkedChatPin(JSON.parse(JSON.stringify(pin))), pin);
    const again = await makeChatPin('2468');
    assert.notEqual(again.hash, pin.hash, 'a salt of its own each time');
    const now = Date.UTC(2026, 9, 25);
    assert.equal(await opensChat('2468', pin, now), true);
    assert.equal(await opensChat('2469', pin, now), false);
    // Typed in another normal form, the same PIN.
    const word = await makeChatPin('é1234');
    assert.equal(await opensChat('é1234', word, now), true);
    // A right one ended the count: the free tries start again.
    for (let i = 0; i < FREE_TRIES; i++) assert.equal(await opensChat('0000', pin, now), false);
    // The next waits, even for the right one; once the wait is over, the right one opens and ends the count.
    await assert.rejects(opensChat('2468', pin, now + 1), LockedOutError);
    assert.equal(await opensChat('2468', pin, now + 3_600_000), true);
    assert.equal(await opensChat('0000', pin, now + 3_600_001), false);
    assert.equal(await opensChat('2468', pin, now + 3_600_002), true);
    // What is not one is not taken.
    for (const bad of [null, {}, { ...pin, salt: 'x' }, { ...pin, hash: pin.salt }, { ...pin, m: 1 << 30 }, { ...pin, t: 0 }]) assert.equal(checkedChatPin(bad), null);
  } finally {
    setHardCost(null);
  }
});

test('in the list a locked chat shows its name with a lock, nothing of its messages, and its copy keeps none', () => {
  const rows = buildInbox(
    [
      { identity: A, name: 'Άννα', timer: 0, locked: true, phone: '+306900000000' },
      { identity: B, name: 'Bob', timer: 0 },
    ],
    [
      { peer: `contact:${A}`, text: 'μυστικό', mine: false, at: 10 },
      { peer: `contact:${B}`, text: 'hello', mine: true, at: 5, mark: 2 },
    ],
    [],
    100,
    // An SMS with Anna's number, later than her chat, shows nothing either.
    [{ address: '+306900000000', text: 'SMS μυστικό', at: 20, mine: false, unread: 1 }],
  );
  const anna = rows.find((r) => r.identity === A)!;
  assert.equal(anna.locked, true);
  assert.equal(anna.last, '');
  assert.equal(anna.lastSms, false);
  assert.equal(anna.unread, 2, 'it still says how many came');
  assert.equal(anna.at, 20, 'and when it moved');
  assert.equal(rows.find((r) => r.identity === B)!.last, 'hello');
  assert.deepEqual(filterInbox(rows, 'μυστικό'), []);
  assert.deepEqual(filterInbox(rows, 'άννα').map((r) => r.identity), [A]);
  assert.equal(JSON.stringify(kept(rows)).includes('μυστικό'), false);
  assert.equal(kept(rows).rows.find((r) => r.identity === A)?.locked, true);

  const [group] = groupRows([{ id: 'ab'.repeat(16), name: 'Οικογένεια', status: 'in', last: { at: 30, from: B, text: 'μυστικό' }, unread: 1, locked: true }], () => 'Bob', (text) => text);
  assert.equal(group.last, '');
  assert.equal(group.locked, true);
});

test('a PIN given on a linked device stays there, whatever the phone says of the chat or the group', async () => {
  setHardCost({ m: 64, t: 1 });
  try {
    const pin = await makeChatPin('2468');
    const contact = { identity: A, name: 'old', pin } as unknown as Contact;
    const mirrored = mirrorOf({ identity: A, name: 'Anna', timer: 0, timerAt: 0, request: false, look: null, hide: false }, contact, { sender: '00'.repeat(24), relay: '', relayKey: '', spare: null }, B);
    assert.deepEqual(mirrored.pin, pin);
    assert.equal(mirrored.name, 'Anna');
    const id = 'ab'.repeat(16);
    const group = { id, name: 'old', admin: false, status: 'in', asked: [], later: [], outbox: [], messages: [], readAt: 0, pin } as Group;
    const { groups } = mirrorGroups([group], { list: [{ id, name: 'Οικογένεια', admin: false, status: 'in', asked: [], readAt: 5, members: [] }], gone: [], entries: [] });
    assert.deepEqual(groups[0].pin, pin);
    assert.equal(groups[0].name, 'Οικογένεια');
    const plain = mirrorGroups([{ ...group, pin: undefined }], { list: [{ id, name: 'x', admin: false, status: 'in', asked: [], readAt: 5, members: [] }], gone: [], entries: [] });
    assert.equal('pin' in plain.groups[0], false);
  } finally {
    setHardCost(null);
  }
});
