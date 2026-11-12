// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// The warnings that this phone's internet address may be seen (lib/ip-warning.ts): each kept by
// its network, what is about to happen and what of, said once in a space, kept as said only once
// gone on from, each space its own; their words name the network and say who sees the address.
// Run with: npm run check
/// <reference types="node" />

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { randomBytes } from '../lib/crypto';
import { IP_GUIDE, ipGoneOn, ipKey, ipSaid, ipWarningText, type IpAct } from '../lib/ip-warning';
import { setCurrentSpace } from '../lock/keys';
import { IP_SEEN_MOST, loadCurrentSpaceData, updateCurrentSpaceData } from '../lock/space-data';
import './secure-memory';

test('a warning is kept by its network, what happens and what of; its words name the network, and each act has its own', () => {
  assert.equal(ipKey({ network: ' Erevos ', act: 'send', of: 'abc' }), 'erevos|send|abc');
  assert.notEqual(ipKey({ network: 'Erevos', act: 'send', of: 'abc' }), ipKey({ network: 'Erevos', act: 'call', of: 'abc' }));
  assert.notEqual(ipKey({ network: 'Erevos', act: 'send', of: 'abc' }), ipKey({ network: 'Matrix', act: 'send', of: 'abc' }));
  assert.ok(ipKey({ network: 'Erevos', act: 'send', of: 'x'.repeat(500) }).length <= 200);
  assert.equal(IP_GUIDE, '#ip');
  const acts: IpAct[] = ['send', 'call', 'file', 'link', 'preview', 'join'];
  const messages = acts.map((act) => ipWarningText({ network: 'Matrix', act, of: '' }));
  assert.equal(new Set(messages.map((m) => m.message)).size, acts.length, 'each act says its own');
  for (const { title, message } of messages) {
    assert.ok(title.length > 0);
    assert.match(message, /IP address/);
  }
  assert.match(ipWarningText({ network: 'Matrix', act: 'send', of: '' }).message, /^On Matrix,/);
  assert.match(ipWarningText({ network: 'XMPP', act: 'join', of: '' }).message, /^On XMPP,/);
});

test('a warning is said once in a space: kept as said once gone on from, the latest ones kept, each space its own', async () => {
  const one = { network: 'Erevos', act: 'send' as const, of: 'chat-one' };
  const two = { network: 'Erevos', act: 'call' as const, of: 'chat-one' };
  setCurrentSpace(21, randomBytes(32));
  assert.equal(await ipSaid(one), false, 'none said at first');
  assert.equal((await loadCurrentSpaceData()).ipSeen, undefined, 'and none kept');
  await ipGoneOn(one);
  await ipGoneOn(one);
  assert.equal(await ipSaid(one), true);
  assert.equal(await ipSaid(two), false, 'a call is said apart from what is sent');
  assert.deepEqual((await loadCurrentSpaceData()).ipSeen, [ipKey(one)], 'kept once');

  // Another space has its own.
  setCurrentSpace(22, randomBytes(32));
  assert.equal(await ipSaid(one), false);

  // The latest IP_SEEN_MOST are kept, and what is stored of the wrong shape is left out.
  setCurrentSpace(21, randomBytes(32));
  await updateCurrentSpaceData({ ipSeen: Array.from({ length: IP_SEEN_MOST }, (_, i) => `erevos|send|${i}`) });
  await ipGoneOn(two);
  const seen = (await loadCurrentSpaceData()).ipSeen!;
  assert.equal(seen.length, IP_SEEN_MOST);
  assert.equal(seen.at(-1), ipKey(two));
  assert.equal(seen.includes('erevos|send|0'), false, 'the oldest went');
  await updateCurrentSpaceData({ ipSeen: ['', 7, 'erevos|link|', 'erevos|link|'] as unknown as string[] });
  assert.deepEqual((await loadCurrentSpaceData()).ipSeen, ['erevos|link|']);
  setCurrentSpace(null);
});
