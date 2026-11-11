// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// The order of a list of chats (lib/chat-list.ts, lock/chat-list-data.ts): every chat that is not an
// SMS conversation pinned at the top or archived, kept sealed in the space or in each hidden place
// apart; a Matrix room our favourite pinned, one of low priority last, and ✓✓✓ on its row once all
// read ours (lib/inbox.ts). Names of one's own: a Matrix room's (shownRoomName), an XMPP contact's in
// the account's contacts (lib/xmpp.ts renameXmppContact) and a group MMS's (lib/sms-link.ts setTitle).
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { arrangeChats, archiveChat, cameBack, chatListOf, dropChat, forgetArchived, isArchived, isPinnedHere, mutedNotify, onChatListChanged, pinChat, type ChatListPlace } from '../lib/chat-list';
import { randomBytes } from '../lib/crypto';
import { matrixInboxRows, type InboxRow } from '../lib/inbox';
import { shownRoomName, type MatrixState } from '../lib/matrix';
import { smsTitle } from '../lib/sms-folders';
import { SmsLink } from '../lib/sms-link';
import { NS, renameXmppContact, type XmppConnection, type XmppState } from '../lib/xmpp';
import { parseXml, render, type XmlElement } from '../lib/xmpp-xml';
import { ALWAYS } from '../lock/chat-notify';
import { checkedChatList, EMPTY_CHAT_LIST, MAX_CHAT_PINS } from '../lock/chat-list-data';
import { hiddenHolder } from '../lock/sealed-file';
import { files } from './files-memory';

const row = (identity: string, at: number, more: Partial<InboxRow> = {}): InboxRow => ({
  identity,
  name: identity,
  last: 'hi',
  mine: false,
  mark: 0,
  at,
  unread: 0,
  timer: 0,
  imported: false,
  avatar: null,
  sms: '',
  lastSms: false,
  ...more,
});

const A = 'aa'.repeat(32);
const B = 'bb'.repeat(32);

test('pinned chats come first and Matrix rooms of low priority last, archived ones apart', () => {
  const rows = [
    row('matrix:!low:x', 90, { network: 'matrix', low: true }),
    row(A, 80),
    row('sms:+306911111111', 70, { sms: '+306911111111', lastSms: true, pinned: true }),
    row('group:g1', 60),
    row('xmpp:ann@x.org', 50, { network: 'xmpp' }),
    row('nostr:' + 'cc'.repeat(32), 40, { network: 'nostr' }),
    row('matrix:!fav:x', 30, { network: 'matrix', pinned: true }),
    row(B, 20),
  ];
  const data = { pinned: [{ id: 'xmpp:ann@x.org', at: 1 }, { id: B, at: 2 }], archived: [{ id: 'group:g1', at: 65 }, { id: 'nostr:' + 'cc'.repeat(32), at: 45 }] };
  const arranged = arrangeChats(rows, data);
  assert.deepEqual(
    arranged.list.map((r) => r.identity),
    ['sms:+306911111111', 'xmpp:ann@x.org', 'matrix:!fav:x', B, A, 'matrix:!low:x'],
  );
  assert.deepEqual(arranged.list.map((r) => !!r.pinned), [true, true, true, true, false, false]);
  assert.deepEqual(arranged.archived.map((r) => r.identity), ['group:g1', 'nostr:' + 'cc'.repeat(32)]);
  assert.deepEqual(arranged.back, []);
  // Rows not changed keep their own object; the list given is left as it was.
  assert.equal(arranged.list[4], rows[1]);
  assert.equal(rows[4].pinned, undefined);
  // An SMS conversation's order is the SMS's own: a chat mark with its identity counts for nothing.
  const sms = arrangeChats([row('sms:+30690', 10, { sms: '+30690' })], { pinned: [{ id: 'sms:+30690', at: 1 }], archived: [{ id: 'sms:+30690', at: 20 }] });
  assert.deepEqual([sms.list.length, !!sms.list[0].pinned], [1, false]);
});

test('an archived chat comes back with a message from them after, not with one of ours', () => {
  const mark = { id: A, at: 100 };
  assert.equal(cameBack(row(A, 100), mark), false);
  assert.equal(cameBack(row(A, 150, { mine: true }), mark), false);
  assert.equal(cameBack(row(A, 150), mark), true);
  // A group's row does not say whose its last message is: one not read yet says it came.
  assert.equal(cameBack(row('group:g', 150), { id: 'group:g', at: 100 }), false);
  assert.equal(cameBack(row('group:g', 150, { unread: 1 }), { id: 'group:g', at: 100 }), true);
  const arranged = arrangeChats([row(A, 150), row(B, 90)], { pinned: [], archived: [mark, { id: B, at: 100 }] });
  assert.deepEqual(arranged.list.map((r) => r.identity), [A]);
  assert.deepEqual(arranged.archived.map((r) => r.identity), [B]);
  assert.deepEqual(arranged.back, [A]);
});

test('the order is kept sealed, the space and each hidden place apart', async () => {
  files.clear();
  const key = randomBytes(32);
  const space: ChatListPlace = { holder: 'space', space: 0, key };
  const hidden: ChatListPlace = { holder: hiddenHolder(1), space: 0, key: randomBytes(32), pocket: 1 };
  let told = 0;
  const stop = onChatListChanged(() => told++);
  assert.equal(await pinChat(space, A, true, 10), true);
  await archiveChat(space, B, true, 20);
  await archiveChat(hidden, 'matrix:!r:x', true, 30);
  assert.equal(told, 3);
  const kept = await chatListOf(space);
  assert.deepEqual(kept, { pinned: [{ id: A, at: 10 }], archived: [{ id: B, at: 20 }] });
  assert.deepEqual(await chatListOf(hidden), { pinned: [], archived: [{ id: 'matrix:!r:x', at: 30 }] });
  // Nothing of it shows in the phone's files, and another key opens none of it.
  assert.ok(![...files.values()].some((text) => text.includes(A) || text.includes('!r:x')));
  assert.deepEqual(await chatListOf({ holder: 'space', space: 0, key: randomBytes(32) }), EMPTY_CHAT_LIST);
  // Archiving takes the pin away; pinning takes it out of the Archive.
  await archiveChat(space, A, true, 40);
  assert.deepEqual([isPinnedHere(await chatListOf(space), A), isArchived(await chatListOf(space), A)], [false, true]);
  await pinChat(space, A, true, 50);
  assert.deepEqual([isPinnedHere(await chatListOf(space), A), isArchived(await chatListOf(space), A)], [true, false]);
  // At most MAX_CHAT_PINS: one more is refused, and nothing changes.
  for (let i = 0; i < MAX_CHAT_PINS - 1; i++) assert.equal(await pinChat(space, `group:${i}`, true), true);
  assert.equal(await pinChat(space, 'group:more', true), false);
  assert.equal((await chatListOf(space)).pinned.length, MAX_CHAT_PINS);
  // Those a message brought back are forgotten; a chat moved away leaves nothing of itself.
  await forgetArchived(space, [B]);
  assert.equal(isArchived(await chatListOf(space), B), false);
  await dropChat(space, A);
  assert.equal(isPinnedHere(await chatListOf(space), A), false);
  stop();
});

test('a kept order of the wrong shape is left out', () => {
  assert.deepEqual(checkedChatList(null), EMPTY_CHAT_LIST);
  const checked = checkedChatList({ pinned: [{ id: A, at: 1 }, { id: A, at: 2 }, { id: '', at: 3 }, { id: 5, at: 1 }, { id: B, at: -1 }], archived: 'no' });
  assert.deepEqual(checked, { pinned: [{ id: A, at: 1 }], archived: [] });
  const many = checkedChatList({ pinned: Array.from({ length: 20 }, (_, i) => ({ id: `group:${i}`, at: i })) });
  assert.equal(many.pinned.length, MAX_CHAT_PINS);
  assert.equal(many.pinned[MAX_CHAT_PINS - 1].id, 'group:19');
});

test('muting from the list keeps the chat\'s own sounds', () => {
  assert.deepEqual(mutedNotify(null, true), { until: ALWAYS });
  assert.deepEqual(mutedNotify({ until: 5, sound: '' }, false), { sound: '' });
  assert.equal(mutedNotify({ until: 5 }, false), null);
  assert.deepEqual(mutedNotify({ ring: 'content://media/1' }, true), { ring: 'content://media/1', until: ALWAYS });
});

test('a Matrix room: our favourite pinned, of low priority last, a name of our own, and ✓✓✓ once all read ours', () => {
  const me = '@me:example.org';
  const state = {
    userId: me,
    rooms: {
      '!a:x': {
        id: '!a:x',
        name: 'Anna',
        own: '  Mum ',
        members: { [me]: { membership: 'join' }, '@anna:x': { membership: 'join' } },
        encrypted: true,
        direct: true,
        unread: 0,
        messages: [{ id: '$1', sender: me, ts: 5000, text: 'hi' }],
        tags: { favourite: true },
        readBy: { '@anna:x': { event: '$1', ts: 5100 } },
      },
      '!b:x': {
        id: '!b:x',
        name: 'Club',
        members: { [me]: { membership: 'join' }, '@bo:x': { membership: 'join' }, '@cy:x': { membership: 'join' } },
        encrypted: true,
        direct: false,
        unread: 0,
        messages: [{ id: '$2', sender: me, ts: 6000, text: 'all here?' }],
        tags: { low: true },
        readBy: { '@bo:x': { event: '$2', ts: 6100 } },
      },
      '!c:x': { id: '!c:x', name: 'Cy', members: {}, encrypted: true, direct: true, unread: 0, messages: [{ id: '$3', sender: me, ts: 7000, text: 'sending', state: 'sending' }] },
    },
  } as unknown as MatrixState;
  const rows = Object.fromEntries(matrixInboxRows(state, 9000).map((r) => [r.identity.slice('matrix:'.length), r]));
  assert.deepEqual([rows['!a:x'].name, rows['!a:x'].pinned, rows['!a:x'].low, rows['!a:x'].mark], ['Mum', true, undefined, 2]);
  // Read by one of the two others: ✓ only.
  assert.deepEqual([rows['!b:x'].name, rows['!b:x'].pinned, rows['!b:x'].low, rows['!b:x'].mark], ['Club', undefined, true, 0]);
  assert.equal(rows['!c:x'].mark, -1);
  assert.equal(shownRoomName({ name: 'Club', own: ' ' }), 'Club');
  // Then the other reads it too.
  (state.rooms['!b:x'].readBy as Record<string, { event: string; ts: number }>)['@cy:x'] = { event: '$2', ts: 6200 };
  assert.equal(matrixInboxRows(state, 9000).find((r) => r.identity === 'matrix:!b:x')?.mark, 2);
});

test('an XMPP contact is named in the account\'s contacts, its groups kept', async () => {
  const state = { jid: 'me@x.org', roster: { 'ann@x.org': { jid: 'ann@x.org', name: 'Ann', subscription: 'both' } }, requests: [] } as unknown as XmppState;
  const sent: XmlElement[] = [];
  let item = `<item jid='Ann@x.org' name='Ann' subscription='both'><group>Friends</group><group>Work</group></item>`;
  const connection = {
    iq: async (type: 'get' | 'set', _to: string | undefined, payload: XmlElement) => {
      sent.push(payload);
      if (type === 'get') return parseXml(`<iq type='result'><query xmlns='jabber:iq:roster'>${item}<item jid='bo@x.org' subscription='to'/></query></iq>`);
      return parseXml(`<iq type='result'/>`);
    },
  } as unknown as XmppConnection;
  await renameXmppContact(state, connection, 'ann@x.org', '  Annie  ');
  assert.equal(render(sent[1]), `<query xmlns='${NS.roster}'><item jid='ann@x.org' name='Annie'><group>Friends</group><group>Work</group></item></query>`);
  assert.equal(state.roster['ann@x.org'].name, 'Annie');
  // Empty, the name goes: their address shows.
  item = `<item jid='ann@x.org' name='Annie' subscription='both'/>`;
  await renameXmppContact(state, connection, 'ann@x.org', '');
  assert.equal(render(sent[3]), `<query xmlns='${NS.roster}'><item jid='ann@x.org'/></query>`);
  assert.equal(state.roster['ann@x.org'].name, undefined);
  // Someone not in the contacts is not added by naming them.
  await assert.rejects(renameXmppContact(state, connection, 'cleo@x.org', 'Cleo'));
  assert.equal(sent.length, 5);
});

test('a group MMS takes a name of its own, kept with the space\'s order of its SMS', async () => {
  files.clear();
  const key = randomBytes(32);
  const link = await SmsLink.open(0, key);
  await link.setTitle('+306911111111,+306922222222', '  Family ');
  assert.equal(smsTitle(link.state, '+306922222222, +306911111111'), 'Family');
  assert.equal(smsTitle(link.state, '+306911111111'), '');
  const again = await SmsLink.open(0, key);
  assert.equal(smsTitle(again.state, '+306911111111,+306922222222'), 'Family');
  assert.ok(files.has('erevos-sms-order'));
  await again.setTitle('+306911111111,+306922222222', ' ');
  assert.equal(smsTitle((await SmsLink.open(0, key)).state, '+306911111111,+306922222222'), '');
});
