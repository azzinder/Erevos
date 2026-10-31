// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// What Erevos on Sailfish OS gives its helper to wait on while it is not in front (lib/shell-watch.ts,
// sailfish/watch/src/watcher.h): each relay's queues, at most 64 to a request, the relay's key only
// once it proved it, and the notice's words.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { Door } from '../lock/doors';
import { watchListOf } from '../lib/shell-watch';

const id = (n: number) => n.toString(16).padStart(48, '0');
const key = new Uint8Array(32).fill(0xab);

const door = (tor: Door['tor'], contacts: number): Door => ({
  tor,
  queues: [
    { url: 'wss://relay.example.org', token: 'secret', recipientHex: id(1) },
    { url: 'wss://other.example.org/', token: '', recipientHex: id(2) },
  ],
  contacts: { url: 'wss://Relay.example.org/', queues: Array.from({ length: contacts }, (_, i) => ({ r: id(100 + i), g: i % 8 })) },
});

type List = { words: { title: string; messages: string[]; call: string }; waits: { url: string; key: string; queues: string[] }[] };

test('each relay its queues, 64 to a request, its key only once proven, and never a token', () => {
  const said = watchListOf(door('messages', 100), (url) => (url.includes('relay.example') ? key : null));
  assert.ok(said);
  assert.ok(!said.includes('secret'));
  const list = JSON.parse(said) as List;
  assert.deepEqual(
    list.waits.map((w) => [w.url, w.key.length, w.queues.length]),
    [
      ['wss://relay.example.org', 64, 64],
      ['wss://relay.example.org', 64, 37],
      ['wss://other.example.org/', 0, 1],
    ],
  );
  assert.equal(list.waits[0].queues[0], id(1));
  assert.ok(list.waits.every((w) => w.queues.every((q) => /^[0-9a-f]{48}$/.test(q))));
  assert.equal(list.words.messages.length, 999);
  assert.equal(list.words.messages[0], '1 new message');
  assert.equal(list.words.messages[2], '3 new messages');
  assert.equal(list.words.call, 'Incoming call');
});

test('a space with no queue gives nothing to wait on', () => {
  assert.equal(watchListOf({ tor: 'off', queues: [] }, () => null), null);
});
