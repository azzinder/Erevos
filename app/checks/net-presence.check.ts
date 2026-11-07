// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// Whether Matrix and XMPP contacts are online, as their servers say (lib/net-presence.ts,
// lib/xmpp.ts, lib/matrix.ts): only of those we may see, kept in memory only.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { directOther, matrixPresence, syncApply, type MatrixState } from '../lib/matrix';
import { cleanStatus, isOn, presenceText } from '../lib/net-presence';
import { forgetPresence, takeStanza, xmppOnline, xmppPresence, type XmppConnection, type XmppState } from '../lib/xmpp';
import { el } from '../lib/xmpp-xml';

const xmppState = (): XmppState =>
  ({
    jid: 'me@example.org',
    password: '',
    resource: 'erevos',
    omemo: {},
    people: {},
    chats: {},
    roster: {
      'friend@example.org': { jid: 'friend@example.org', subscription: 'both' },
      'stranger@example.org': { jid: 'stranger@example.org', subscription: 'from' },
    },
    requests: [],
    seen: [],
  }) as unknown as XmppState;

const connection = { send: async () => undefined } as unknown as XmppConnection;
const take = (state: XmppState, stanza: ReturnType<typeof el>) => takeStanza(state, connection, stanza, { chats: [], republish: false });

test('an XMPP contact we may see shows online, away or busy, with their words, from their most present device', async () => {
  const state = xmppState();
  assert.equal(xmppPresence(state, 'friend@example.org'), null);
  await take(state, el('presence', { from: 'friend@example.org/phone' }, el('show', {}, 'away'), el('status', {}, 'Out\u202e for\nlunch')));
  assert.deepEqual(xmppPresence(state, 'friend@example.org'), { show: 'away', status: 'Out for lunch' });
  await take(state, el('presence', { from: 'friend@example.org/laptop' }));
  assert.equal(xmppPresence(state, 'Friend@Example.org')?.show, 'online');
  assert.deepEqual(xmppOnline(state), ['friend@example.org']);
  await take(state, el('presence', { from: 'friend@example.org/laptop', type: 'unavailable' }));
  assert.equal(xmppPresence(state, 'friend@example.org')?.show, 'away');
  await take(state, el('presence', { from: 'friend@example.org/phone' }, el('show', {}, 'dnd')));
  assert.equal(presenceText(xmppPresence(state, 'friend@example.org')), 'Do not disturb');
  // Gone from the last device: last seen now.
  const before = Date.now();
  await take(state, el('presence', { from: 'friend@example.org/phone', type: 'unavailable' }));
  const gone = xmppPresence(state, 'friend@example.org');
  assert.equal(gone?.show, 'offline');
  assert.ok((gone?.lastActive ?? 0) >= before);
  assert.match(presenceText(gone), /^last seen today at \d\d:\d\d$/);
  assert.deepEqual(xmppOnline(state), []);
  // A new session forgets it all.
  await take(state, el('presence', { from: 'friend@example.org/phone' }));
  forgetPresence(state);
  assert.equal(xmppPresence(state, 'friend@example.org'), null);
});

test('no presence is taken from someone we may not see, someone blocked, or ourselves', async () => {
  const state = xmppState();
  await take(state, el('presence', { from: 'stranger@example.org/phone' }));
  await take(state, el('presence', { from: 'nobody@example.org/phone' }));
  await take(state, el('presence', { from: 'me@example.org/other' }));
  state.blocked = ['friend@example.org'];
  await take(state, el('presence', { from: 'friend@example.org/phone' }));
  assert.deepEqual(xmppOnline(state), []);
  assert.equal(xmppPresence(state, 'stranger@example.org'), null);
});

test('presence is never in the account as it is kept', async () => {
  const state = xmppState();
  await take(state, el('presence', { from: 'friend@example.org/phone' }, el('status', {}, 'Here')));
  assert.ok(!JSON.stringify(state).includes('Here'));
});

const matrixState = (): MatrixState =>
  ({
    homeserver: 'https://example.org',
    userId: '@me:example.org',
    deviceId: 'D',
    accessToken: '',
    account: {},
    rooms: { '!dm:example.org': { id: '!dm:example.org', name: 'Friend', members: { '@me:example.org': { membership: 'join' }, '@friend:example.org': { membership: 'join' } }, encrypted: true, direct: true, unread: 0, messages: [] } },
    devices: {},
    outdated: [],
    olm: {},
    inbound: {},
    outbound: {},
    seen: {},
  }) as unknown as MatrixState;

const news = (events: unknown[]) => ({ next_batch: 's1', presence: { events }, device_one_time_keys_count: { signed_curve25519: 50 }, device_unused_fallback_key_types: ['signed_curve25519'] });

test('a Matrix user shows online, away or offline with when they were last active, as their homeserver says', async () => {
  const state = matrixState();
  const room = state.rooms['!dm:example.org']!;
  assert.equal(directOther(state, room), '@friend:example.org');
  assert.equal(matrixPresence(state, '@friend:example.org'), null);
  await syncApply(state, news([{ type: 'm.presence', sender: '@friend:example.org', content: { presence: 'online', currently_active: true, status_msg: 'At work' } }]));
  assert.equal(presenceText(matrixPresence(state, '@friend:example.org')), 'Online · At work');
  await syncApply(state, news([{ type: 'm.presence', sender: '@friend:example.org', content: { presence: 'unavailable' } }]));
  assert.equal(presenceText(matrixPresence(state, '@friend:example.org')), 'Away');
  await syncApply(state, news([{ type: 'm.presence', sender: '@friend:example.org', content: { presence: 'offline', last_active_ago: 60_000 } }]));
  const off = matrixPresence(state, '@friend:example.org');
  assert.ok(!isOn(off));
  assert.ok(Math.abs((off?.lastActive ?? 0) - (Date.now() - 60_000)) < 5_000);
  // Our own, and what is not presence, are not taken; nothing of it is kept in the account.
  await syncApply(state, news([{ type: 'm.presence', sender: '@me:example.org', content: { presence: 'online' } }, { type: 'm.other', sender: '@x:example.org', content: { presence: 'online' } }]));
  assert.equal(matrixPresence(state, '@me:example.org'), null);
  assert.equal(matrixPresence(state, '@x:example.org'), null);
  assert.ok(!JSON.stringify(state).includes('At work'));
});

test('a status is cleaned and cut short', () => {
  assert.equal(cleanStatus('  a\u0000b  '), 'a b');
  assert.equal(cleanStatus(''), undefined);
  assert.equal(cleanStatus(5), undefined);
  assert.equal(cleanStatus('x'.repeat(500))?.length, 140);
});
