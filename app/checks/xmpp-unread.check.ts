// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// What an XMPP chat counts as not read (lib/xmpp.ts readAt, readUpTo): what was read here or on
// another device of the account is not counted, nor told of, again, when the archive gives it
// once more after a restart, when it was deleted here and comes back, or when the read mark of
// another device names a message this phone does not have.

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { markXmppRead, takeStanza, type Taken, type XmppConnection, type XmppState } from '../lib/xmpp';
import { parseXml } from '../lib/xmpp-xml';

const ME = 'ann@example.org';
const BEN = 'ben@example.org';
const connection = { isOpen: false, send: async () => undefined } as unknown as XmppConnection;

function account(): XmppState {
  return { jid: ME, password: '', resource: 'Erevos.a', omemo: { device: 1 }, people: {}, chats: {}, roster: {}, requests: [], seen: [] } as unknown as XmppState;
}

const stamp = (at: number) => new Date(at).toISOString();
const live = (id: string, at: number) => `<message xmlns='jabber:client' from='${BEN}/phone' to='${ME}' type='chat' id='${id}'><body>${id}</body><delay xmlns='urn:xmpp:delay' stamp='${stamp(at)}'/></message>`;
const archived = (id: string, at: number) =>
  `<message xmlns='jabber:client' to='${ME}/Erevos.a'><result xmlns='urn:xmpp:mam:2' id='mam-${id}'><forwarded xmlns='urn:xmpp:forward:0'><delay xmlns='urn:xmpp:delay' stamp='${stamp(at)}'/>${live(id, at).replace(/<delay[^>]*\/>/, '')}</forwarded></result></message>`;
// Another device of ours read the chat up to `id`: its read mark, as the archive gives it.
const ourMark = (id: string, at: number) =>
  `<message xmlns='jabber:client' to='${ME}/Erevos.a'><result xmlns='urn:xmpp:mam:2' id='mam-mark-${id}'><forwarded xmlns='urn:xmpp:forward:0'><delay xmlns='urn:xmpp:delay' stamp='${stamp(at)}'/><message xmlns='jabber:client' from='${ME}/other' to='${BEN}' type='chat' id='m-${id}'><displayed xmlns='urn:xmpp:chat-markers:0' id='${id}'/></message></forwarded></result></message>`;

async function take(state: XmppState, xml: string): Promise<void> {
  const taken: Taken = { chats: [], republish: false };
  await takeStanza(state, connection, parseXml(xml), taken);
}

const T = Date.parse('2026-11-14T10:00:00Z');

test('read here: the archive giving it again after a restart, or a message deleted here coming back, is not new', async () => {
  const state = account();
  await take(state, live('one', T));
  await take(state, live('two', T + 1000));
  assert.equal(state.chats[BEN].unread, 2);
  await markXmppRead(state, null, BEN);
  assert.equal(state.chats[BEN].unread, 0);
  // Deleted here, and forgotten as seen (as the list of seen ones moves on): the archive brings it back.
  state.chats[BEN].messages = [];
  state.seen = [];
  await take(state, archived('two', T + 1000));
  await take(state, archived('one', T));
  assert.equal(state.chats[BEN].unread, 0);
  // What came after it was read still counts.
  await take(state, archived('three', T + 2000));
  assert.equal(state.chats[BEN].unread, 1);
});

test('read on another device of the account while this one was away: its read mark clears what it names and all before', async () => {
  const state = account();
  await take(state, archived('one', T));
  await take(state, archived('two', T + 1000));
  await take(state, archived('three', T + 2000));
  assert.equal(state.chats[BEN].unread, 3);
  await take(state, ourMark('two', T + 1500));
  assert.equal(state.chats[BEN].unread, 1);
  // A mark naming a message this phone does not have reads up to its own time.
  await take(state, ourMark('gone-from-here', T + 2500));
  assert.equal(state.chats[BEN].unread, 0);
  // And what then comes again from before is not new.
  state.seen = [];
  state.chats[BEN].messages = [];
  await take(state, archived('two', T + 1000));
  assert.equal(state.chats[BEN].unread, 0);
});

test('a message of ours, from here or another device, reads what came before it', async () => {
  const state = account();
  await take(state, live('one', T));
  const ours = `<message xmlns='jabber:client' to='${ME}/Erevos.a'><result xmlns='urn:xmpp:mam:2' id='mam-ours'><forwarded xmlns='urn:xmpp:forward:0'><delay xmlns='urn:xmpp:delay' stamp='${stamp(T + 500)}'/><message xmlns='jabber:client' from='${ME}/other' to='${BEN}' type='chat' id='ours'><body>hi</body></message></forwarded></result></message>`;
  await take(state, ours);
  assert.equal(state.chats[BEN].unread, 0);
  state.seen = [];
  state.chats[BEN].messages = state.chats[BEN].messages.filter((m) => m.mine);
  await take(state, archived('one', T));
  assert.equal(state.chats[BEN].unread, 0);
});
