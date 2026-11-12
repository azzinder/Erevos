// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { bunches, type ContactQueue } from '../lib/contact-queues';
import { readsThroughTor } from '../lib/relay';
import { circuitOf, tellTorChats, torChatsOf } from '../lib/tor-chats';
import type { Contact } from '../lock/e2e-data';

const contact = (identity: string, more: Partial<Contact> = {}): Contact => ({ identity, sender: `${identity}-s`, mine: { r: `${identity}-r`, s: '', u: 'wss://r', qa: 1, g: 0 }, ...more }) as Contact;

test('a chat set to go through Tor names its senders and the queue it writes to, each on circuits of its own', () => {
  const chats = torChatsOf([contact('aa'.repeat(16), { tor: true, ringSender: 'ring', spare: { relay: 'wss://s', relayKey: '', sender: 'spare' } as Contact['spare'] }), contact('bb'.repeat(16))]);
  const circuit = circuitOf('aa'.repeat(16));
  assert.deepEqual([...chats.senders.entries()].sort(), [[`${'aa'.repeat(16)}-s`, circuit], ['ring', circuit], ['spare', circuit]].sort());
  assert.deepEqual([...chats.readers], [`${'aa'.repeat(16)}-r`]);
});

test('its queues are read apart, through Tor, whatever the space says; turned off, with the others again', () => {
  const queues: ContactQueue[] = [
    { identity: 'a', r: 'aa', g: 1 },
    { identity: 'b', r: 'bb', g: 1 },
  ];
  tellTorChats('me', [{ ...contact('a'), tor: true, mine: { r: 'aa', s: '', u: 'wss://r', qa: 1, g: 1 } } as Contact]);
  assert.equal(readsThroughTor('aa'), true);
  assert.deepEqual(bunches(queues, 'w', false), [
    { way: 'w', queues: [queues[1]] },
    { way: 'w-tor-1', queues: [queues[0]] },
  ]);
  tellTorChats('me', [contact('a')]);
  assert.equal(readsThroughTor('aa'), false);
  assert.deepEqual(bunches(queues, 'w', false), [{ way: 'w', queues }]);
});

test("its copies to the contact's other devices and a way written to them by itself go on its circuits too; on a linked device not the phone's queue, which every chat shares", () => {
  const id = 'cc'.repeat(16);
  const way = (sender: string) => ({ id: sender, bundle: '', sender, relay: 'wss://e', relayKey: '' });
  const c = contact(id, { tor: true, ringSender: 'ring', endpoints: [way('their-laptop'), way('')], direct: way('direct') } as Partial<Contact>);
  const circuit = circuitOf(id);
  assert.deepEqual([...torChatsOf([c]).senders.keys()].sort(), [`${id}-s`, 'direct', 'ring', 'their-laptop'].sort());
  const linked = torChatsOf([c], true);
  assert.deepEqual([...linked.senders.entries()].sort(), [['direct', circuit], ['their-laptop', circuit]]);
});
