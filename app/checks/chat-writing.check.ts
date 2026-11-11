// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// What the Matrix, XMPP and Nostr chats keep written (lib/chat-writing.ts): each chat's draft, kept
// in the account's own value and shown on its row of the home list; and the messages held to go
// later, the soonest first, each sent once its time came and held no more once it shows in its chat
// (sent, or not sent with Send again), one that could not be tried kept with why and tried again a
// while later, one a restored backup brought back whose time came before the restore left for the
// owner. A Matrix or XMPP message that did not go is sent again in its place (lib/matrix-writing.ts,
// lib/xmpp-writing.ts). With the core built, a Matrix account of the space keeps its draft as it is
// stopped and run again, sends what it holds at its time (lib/chat-later.ts), and sends again one
// that did not go.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';

import { setCurrentSpace } from '../lock/keys';
import {
  checkedWriting,
  draftIn,
  draftPart,
  dropHeld,
  heldIn,
  heldNow,
  heldProblem,
  holdText,
  keepDraft,
  MOST_HELD,
  RETRY,
  sendHeld,
  sentOrShown,
  waitsForOwner,
  WRITING_TEXT,
  type ChatWriting,
  type WritingAccount,
} from '../lib/chat-writing';
import { heldChanged, startChatLater } from '../lib/chat-later';
import { setCore, type Core } from '../lib/core';
import { randomBytes } from '../lib/crypto';
import { matrixInboxRows, nostrInboxRows, xmppInboxRows } from '../lib/inbox';
import { defaultMatrixHttp, joinRoom, setMatrixHttp, signIn, sync, type Json, type MatrixState } from '../lib/matrix';
import { matrixNow, matrixSend, matrixSendAgain, matrixSignIn, matrixStartChat, matrixWriting, runMatrix, stopMatrix } from '../lib/matrix-store';
import { dropUnsent as dropMatrixUnsent, sendAgain as sendMatrixAgain, sendHeld as sendMatrixHeld, unsentIn as matrixUnsentIn } from '../lib/matrix-writing';
import type { NostrDmState } from '../lib/nostr-dm';
import type { XmppConnection, XmppState } from '../lib/xmpp';
import { NS_REPLY } from '../lib/xmpp-actions';
import { dropUnsent as dropXmppUnsent, sendAgain as sendXmppAgain, sendHeld as sendXmppHeld, unsentIn as xmppUnsentIn } from '../lib/xmpp-writing';
import { child, type XmlElement } from '../lib/xmpp-xml';
import { Homeserver, HS, PASSWORD } from './matrix-server';

// ---- Drafts ----

test('a draft is kept for each chat, forgotten once nothing is typed, the oldest going past the most', () => {
  let writing: ChatWriting = keepDraft({}, '!room:example.org', 'half written', 10);
  writing = keepDraft(writing, 'ann@example.org', 'μισογραμμένο', 20);
  assert.equal(draftIn(writing, '!room:example.org'), 'half written');
  assert.deepEqual(draftPart(writing, 'ann@example.org'), { draft: 'μισογραμμένο' });
  assert.deepEqual(draftPart(writing, 'nobody@example.org'), {});
  // Changed, it is the new words; only spaces, it is forgotten.
  writing = keepDraft(writing, '!room:example.org', 'more written', 30);
  assert.deepEqual(writing.drafts?.['!room:example.org'], { text: 'more written', at: 30 });
  writing = keepDraft(writing, 'ann@example.org', '   ', 40);
  assert.equal(draftIn(writing, 'ann@example.org'), '');
  writing = keepDraft(writing, '!room:example.org', '', 50);
  assert.deepEqual(writing, {});
  // Too long, it is cut.
  assert.equal(draftIn(keepDraft({}, 'c', 'x'.repeat(WRITING_TEXT + 5)), 'c').length, WRITING_TEXT);
  // The most chats keep theirs: past that, the oldest go.
  let many: ChatWriting = {};
  for (let i = 0; i < 205; i++) many = keepDraft(many, `chat${i}`, `draft ${i}`, 1000 + i);
  assert.equal(Object.keys(many.drafts ?? {}).length, 200);
  assert.equal(draftIn(many, 'chat4'), '');
  assert.equal(draftIn(many, 'chat5'), 'draft 5');
  assert.equal(draftIn(many, 'chat204'), 'draft 204');
});

test('what is kept written is read back checked: anything of the wrong shape is left out', () => {
  assert.deepEqual(checkedWriting(null), {});
  assert.deepEqual(checkedWriting([]), {});
  assert.deepEqual(checkedWriting({ drafts: 'no', later: {} }), {});
  const read = checkedWriting({
    drafts: { a: { text: 'kept', at: 5 }, b: { text: '', at: 5 }, c: { text: 'no time' }, d: 'plain' },
    later: [
      { id: 'two', chat: 'a', text: 'second', at: 20, made: 1 },
      { id: 'one', chat: 'a', text: 'first', at: 10, made: 2, replyTo: 'm1', thread: 7, mentions: ['@x:example.org', 5], problem: 'offline' },
      { id: 'three', chat: 'a', text: 'third', at: 20, made: 3, mentions: ['@x:example.org'] },
      { id: 'bad', chat: 'a', text: 'no time', made: 1 },
      { id: 'long', chat: 'a', text: 'x'.repeat(WRITING_TEXT + 1), at: 1, made: 1 },
      'nothing',
    ],
    other: true,
  });
  assert.deepEqual(read.drafts, { a: { text: 'kept', at: 5 } });
  assert.deepEqual(
    read.later?.map((held) => held.id),
    ['one', 'two', 'three'],
  );
  assert.deepEqual(read.later?.[0], { id: 'one', chat: 'a', text: 'first', at: 10, made: 2, replyTo: 'm1', problem: 'offline' });
  assert.deepEqual(read.later?.[2].mentions, ['@x:example.org']);
  assert.equal('other' in read, false);
  assert.equal(draftIn({ drafts: { a: { text: 5 } } }, 'a'), '');
});

test('a chat with a draft shows it on its row, Matrix, XMPP and Nostr alike', () => {
  const room = '!room:example.org';
  const matrix = {
    userId: '@me:example.org',
    rooms: {
      [room]: { id: room, name: 'Ann', members: {}, encrypted: true, direct: true, unread: 0, messages: [{ id: '$1', sender: '@ann:example.org', ts: 5, text: 'γεια' }] },
      '!other:example.org': { id: '!other:example.org', name: 'Other', members: {}, encrypted: true, direct: false, unread: 0, messages: [] },
    },
    writing: keepDraft({}, room, 'answer to Ann', 9),
  } as unknown as MatrixState;
  const matrixRows = matrixInboxRows(matrix);
  assert.equal(matrixRows.find((row) => row.identity === `matrix:${room}`)?.draft, 'answer to Ann');
  assert.equal(matrixRows.find((row) => row.identity === 'matrix:!other:example.org')?.draft, undefined);
  // What is written does not move the row: its time is its last message's.
  assert.equal(matrixRows.find((row) => row.identity === `matrix:${room}`)?.at, 5);

  const jid = 'ann@example.org';
  const xmpp = {
    jid: 'me@example.org',
    chats: { [jid]: { jid, messages: [], unread: 0, lastAt: 3 } },
    roster: {},
    requests: [],
    seen: [],
    writing: keepDraft({}, jid, 'to Ann over XMPP', 9),
  } as unknown as XmppState;
  assert.equal(xmppInboxRows(xmpp).find((row) => row.identity === `xmpp:${jid}`)?.draft, 'to Ann over XMPP');

  const key = 'a'.repeat(64);
  const nostr = {
    public: 'c'.repeat(64),
    people: {},
    chats: { [key]: { key, name: 'Ann', unread: 0, lastAt: 3, messages: [] } },
    writing: keepDraft({}, key, 'to Ann over Nostr', 9),
  } as unknown as NostrDmState;
  assert.equal(nostrInboxRows(nostr).find((row) => row.identity === `nostr:${key}`)?.draft, 'to Ann over Nostr');
  assert.equal(nostrInboxRows({ ...nostr, writing: undefined }).find((row) => row.identity === `nostr:${key}`)?.draft, undefined);
});

// ---- Messages held to go later ----

test('messages are held the soonest first, as many as an account holds, each for its chat', () => {
  let writing: ChatWriting = keepDraft({}, 'a', 'the draft stays', 1);
  const first = holdText(writing, { chat: 'a', text: 'at 300', at: 300 }, 100);
  assert.ok(first);
  writing = first.writing;
  const second = holdText(writing, { chat: 'b', text: 'at 200', at: 200, replyTo: 'm1' }, 101);
  assert.ok(second);
  writing = second.writing;
  const third = holdText(writing, { chat: 'a', text: 'at 300 too, held later', at: 300 }, 102);
  assert.ok(third);
  writing = third.writing;
  assert.deepEqual(
    writing.later?.map((held) => held.text),
    ['at 200', 'at 300', 'at 300 too, held later'],
  );
  assert.deepEqual(second.held, { chat: 'b', text: 'at 200', at: 200, replyTo: 'm1', id: second.held.id, made: 101 });
  assert.match(first.held.id, /^[0-9a-f]{16}$/);
  assert.notEqual(first.held.id, third.held.id);
  assert.equal(draftIn(writing, 'a'), 'the draft stays');
  assert.deepEqual(
    heldIn(writing, 'a').map((held) => held.id),
    [first.held.id, third.held.id],
  );
  // Nothing to hold, or too much.
  assert.equal(holdText(writing, { chat: 'a', text: '', at: 1 }), null);
  assert.equal(holdText(writing, { chat: 'a', text: 'x'.repeat(WRITING_TEXT + 1), at: 1 }), null);
  let full: ChatWriting = {};
  for (let i = 0; i < MOST_HELD; i++) full = holdText(full, { chat: 'a', text: `n${i}`, at: 1000 + i })?.writing ?? full;
  assert.equal(full.later?.length, MOST_HELD);
  assert.equal(holdText(full, { chat: 'a', text: 'one more', at: 1 }), null);

  // Why one did not go; sent now, its time is now and that is forgotten.
  writing = heldProblem(writing, first.held.id, 'offline');
  assert.equal(heldIn(writing, 'a')[0].problem, 'offline');
  writing = heldNow(writing, first.held.id, 150);
  assert.deepEqual(writing.later?.[0], { chat: 'a', text: 'at 300', at: 150, id: first.held.id, made: 100 });
  // Cancelled, each is gone; the draft is not.
  for (const held of [first, second, third]) writing = dropHeld(writing, held.held.id);
  assert.deepEqual(writing, { drafts: { a: { text: 'the draft stays', at: 1 } } });
});

/** An account as a network store lends it, its chats `chats`, which sends by noting what goes. */
function fakeAccount(start: ChatWriting, chats: string[]) {
  let writing = start;
  const sent: string[] = [];
  const kept: number[] = [];
  const how = { ready: true, fails: new Set<string>() };
  const account: WritingAccount = {
    now: () => writing,
    change: async (use) => {
      writing = use(writing);
    },
    keep: async () => {
      kept.push(sent.length);
    },
    ready: () => how.ready,
    has: (chat) => chats.includes(chat),
    send: async (held) => {
      if (how.fails.has(held.text)) throw new Error('Nothing reaches the server.');
      sent.push(held.text);
    },
  };
  return { account, sent, kept, how, writing: () => writing };
}

function holding(...what: [text: string, at: number, chat?: string][]): ChatWriting {
  let writing: ChatWriting = {};
  for (const [text, at, chat] of what) writing = holdText(writing, { chat: chat ?? 'a', text, at }, 1)?.writing ?? writing;
  return writing;
}

test('what is held goes once its time came, the soonest first, kept at once as gone, and is held no more', async () => {
  const it = fakeAccount(
    holding(['third', 30], ['first', 10], ['ahead', 500], ['second', 20, 'b'], ['to a chat that went', 15, 'c']),
    ['a', 'b'],
  );
  const tried = new Map<string, number>();
  // Says when to look again: when the next is due.
  assert.equal(await sendHeld(it.account, tried, 100), 500);
  assert.deepEqual(it.sent, ['first', 'second', 'third']);
  // Each kept as soon as it went, so it does not go again should Erevos stop then.
  assert.deepEqual(it.kept, [1, 2, 3]);
  // The one for a chat no longer there is forgotten; the one ahead waits.
  assert.deepEqual(
    it.writing().later?.map((held) => held.text),
    ['ahead'],
  );
  assert.equal(await sendHeld(it.account, tried, 499), 500);
  assert.equal(it.sent.length, 3);
  assert.equal(await sendHeld(it.account, tried, 500), 0);
  assert.deepEqual(it.sent, ['first', 'second', 'third', 'ahead']);
  assert.deepEqual(it.writing(), {});
});

test('one that could not be tried stays, says why, and is tried again a while later; while nothing reaches the server it waits', async () => {
  const it = fakeAccount(holding(['stuck', 10], ['fine', 20]), ['a']);
  const tried = new Map<string, number>();
  it.how.ready = false;
  assert.equal(await sendHeld(it.account, tried, 100), 100 + RETRY);
  assert.deepEqual(it.sent, []);
  assert.equal(it.writing().later?.[0].problem, undefined);

  it.how.ready = true;
  it.how.fails.add('stuck');
  assert.equal(await sendHeld(it.account, tried, 200), 200 + RETRY);
  // The one after it went all the same.
  assert.deepEqual(it.sent, ['fine']);
  assert.deepEqual(
    it.writing().later?.map((held) => [held.text, held.problem]),
    [['stuck', 'Nothing reaches the server.']],
  );
  // Looked at again sooner, as the account changed, it waits its while.
  it.how.fails.clear();
  assert.equal(await sendHeld(it.account, tried, 300), 200 + RETRY);
  assert.deepEqual(it.sent, ['fine']);
  assert.equal(await sendHeld(it.account, tried, 200 + RETRY), 0);
  assert.deepEqual(it.sent, ['fine', 'stuck']);
  assert.equal(tried.size, 0);

  // Send now: its time is now, what went wrong is forgotten, and it goes at the next look.
  const again = fakeAccount(holding(['now', 10]), ['a']);
  const before = new Map<string, number>();
  again.how.fails.add('now');
  await sendHeld(again.account, before, 100);
  again.how.fails.clear();
  const id = again.writing().later?.[0].id ?? '';
  await again.account.change((writing) => heldNow(writing, id, 120));
  before.delete(id);
  assert.equal(again.writing().later?.[0].problem, undefined);
  assert.equal(await sendHeld(again.account, before, 120), 0);
  assert.deepEqual(again.sent, ['now']);
});

test('one a restored backup brought back, whose time came before the restore, waits for the owner', async () => {
  const it = fakeAccount(holding(['before the restore', 50], ['after the restore', 150]), ['a']);
  assert.equal(await sendHeld(it.account, new Map(), 200, 100), 0);
  assert.deepEqual(it.sent, ['after the restore']);
  const left = it.writing().later ?? [];
  assert.deepEqual(
    left.map((held) => held.text),
    ['before the restore'],
  );
  assert.ok(waitsForOwner(left[0], 100));
  assert.ok(!waitsForOwner(left[0], 0));
  // The owner sends it: its time is after the restore now.
  await it.account.change((writing) => heldNow(writing, left[0].id, 300));
  assert.ok(!waitsForOwner(it.writing().later?.[0] ?? left[0], 100));
  assert.equal(await sendHeld(it.account, new Map(), 300, 100), 0);
  assert.deepEqual(it.sent, ['after the restore', 'before the restore']);
});

test('a message held that fails as it goes is held no more once it shows as not sent', async () => {
  const messages = [{ id: 'old', failed: true }];
  await sentOrShown(
    () => messages,
    (m) => m.failed,
    async () => {
      messages.push({ id: 'new', failed: true });
      throw new Error('Refused.');
    },
  );
  // One that failed before does not count: nothing of this one shows.
  await assert.rejects(
    sentOrShown(
      () => messages,
      (m) => m.failed,
      async () => {
        throw new Error('Offline.');
      },
    ),
    /Offline/,
  );
  await assert.rejects(
    sentOrShown(
      () => undefined,
      () => true,
      async () => {
        throw new Error('No such chat.');
      },
    ),
    /No such chat/,
  );
  await sentOrShown(
    () => messages,
    () => true,
    async () => undefined,
  );
});

// ---- Matrix: held, and sent again ----

const ME = '@me:example.org';
const ANN = '@ann:example.org';
const ROOM = '!room:example.org';

function matrixState(): MatrixState {
  return {
    homeserver: 'https://matrix.example.org',
    userId: ME,
    deviceId: 'PHONE',
    accessToken: 'token',
    account: {},
    rooms: {
      [ROOM]: {
        id: ROOM,
        name: 'Ann',
        members: { [ME]: { membership: 'join' }, [ANN]: { membership: 'join' } },
        encrypted: false,
        direct: true,
        unread: 0,
        messages: [{ id: '$theirs', sender: ANN, ts: 1, text: 'γεια' }],
      },
    },
    devices: {},
    outdated: [],
    olm: {},
    inbound: {},
    outbound: {},
    seen: {},
  } as unknown as MatrixState;
}

/** A homeserver that takes what is sent, or refuses it while `refusing`. */
function matrixHttp() {
  const sent: Json[] = [];
  const how = { refusing: false };
  setMatrixHttp(async (request) => {
    if (how.refusing) return { status: 502, json: { errcode: 'M_UNKNOWN', error: 'Bad gateway' } };
    sent.push(request.body as Json);
    return { status: 200, json: { event_id: `$sent${sent.length}` } };
  });
  return { sent, how };
}

test('a Matrix message held goes as typed then: as an answer, in its thread, naming whom it named', async (t) => {
  t.after(() => setMatrixHttp(defaultMatrixHttp));
  const server = matrixHttp();
  const state = matrixState();
  const held = (text: string, more: object = {}) => ({ id: text, chat: ROOM, text, at: 1, made: 1, ...more });

  await sendMatrixHeld(state, held('an answer', { replyTo: '$theirs', mentions: [ANN] }));
  assert.deepEqual(server.sent[0]['m.relates_to'], { 'm.in_reply_to': { event_id: '$theirs' } });
  assert.deepEqual(server.sent[0]['m.mentions'], { user_ids: [ANN] });
  // What it answered is gone: it goes as words alone.
  await sendMatrixHeld(state, held('no longer an answer', { replyTo: '$gone' }));
  assert.equal(server.sent[1]['m.relates_to'], undefined);
  await sendMatrixHeld(state, held('in the thread', { thread: '$theirs' }));
  assert.equal((server.sent[2]['m.relates_to'] as Json).rel_type, 'm.thread');
  assert.deepEqual(
    state.rooms[ROOM].messages.map((m) => [m.text, m.state, m.replyTo, m.thread]),
    [
      ['γεια', undefined, undefined, undefined],
      ['an answer', undefined, '$theirs', undefined],
      ['no longer an answer', undefined, undefined, undefined],
      ['in the thread', undefined, undefined, '$theirs'],
    ],
  );

  // Refused, it shows as not sent, and is held no more.
  server.how.refusing = true;
  await sendMatrixHeld(state, held('refused', { replyTo: '$theirs' }));
  const failed = state.rooms[ROOM].messages.at(-1);
  assert.deepEqual([failed?.text, failed?.state], ['refused', 'failed']);
  // To a room not here, or one we are only invited to, nothing goes, nor is a room made for it.
  server.how.refusing = false;
  const sent = server.sent.length;
  await assert.rejects(sendMatrixHeld(state, { ...held('nowhere'), chat: '!gone:example.org' }), /not here any more/);
  assert.equal(state.rooms['!gone:example.org'], undefined);
  state.rooms['!asked:example.org'] = { ...state.rooms[ROOM], id: '!asked:example.org', messages: [], invitedBy: ANN };
  await assert.rejects(sendMatrixHeld(state, { ...held('invited'), chat: '!asked:example.org' }), /not here any more/);
  assert.equal(server.sent.length, sent);
});

test('a Matrix message that did not go is sent again in its place, or forgotten', async (t) => {
  t.after(() => setMatrixHttp(defaultMatrixHttp));
  const server = matrixHttp();
  const state = matrixState();
  server.how.refusing = true;
  await sendMatrixHeld(state, { id: 'x', chat: ROOM, text: 'first try', at: 1, made: 1 });
  const failed = matrixUnsentIn(state, ROOM, state.rooms[ROOM].messages.at(-1)?.id ?? '');
  assert.ok(failed);
  // Only ours that did not go is.
  assert.equal(matrixUnsentIn(state, ROOM, '$theirs'), undefined);

  // Not going again, it shows as not sent once more, once.
  await assert.rejects(sendMatrixAgain(state, ROOM, failed, [ANN], null));
  assert.deepEqual(
    state.rooms[ROOM].messages.map((m) => [m.text, m.state]),
    [
      ['γεια', undefined],
      ['first try', 'failed'],
    ],
  );
  server.how.refusing = false;
  const again = state.rooms[ROOM].messages[1];
  await sendMatrixAgain(state, ROOM, again, [ANN], null);
  assert.deepEqual(
    state.rooms[ROOM].messages.map((m) => [m.text, m.state]),
    [
      ['γεια', undefined],
      ['first try', undefined],
    ],
  );
  assert.deepEqual(server.sent.at(-1)?.['m.mentions'], { user_ids: [ANN] });
  // Already gone: nothing more.
  await sendMatrixAgain(state, ROOM, again, [], null);
  assert.equal(server.sent.length, 1);

  server.how.refusing = true;
  await sendMatrixHeld(state, { id: 'y', chat: ROOM, text: 'let go', at: 1, made: 1 });
  const dropped = state.rooms[ROOM].messages.at(-1)?.id ?? '';
  dropMatrixUnsent(state, ROOM, dropped);
  dropMatrixUnsent(state, ROOM, '$theirs');
  assert.deepEqual(
    state.rooms[ROOM].messages.map((m) => m.text),
    ['γεια', 'first try'],
  );
});

// ---- XMPP: held, and sent again ----

const PEER = 'ann@example.org';

function xmppState(): XmppState {
  return {
    jid: 'me@example.org',
    chats: {
      [PEER]: { jid: PEER, messages: [{ id: 'theirs', mine: false, text: 'γεια', at: 1, encrypted: false }], unread: 0, lastAt: 1, plain: true },
      'room@groups.example.org': { jid: 'room@groups.example.org', messages: [], unread: 0, lastAt: 0, room: { joined: false, problem: 'Not in this group yet.' } },
    },
    roster: {},
    requests: [],
    seen: [],
  } as unknown as XmppState;
}

/** A connection that sends what it is given, or fails while `failing`. */
function xmppConnection() {
  const sent: XmlElement[] = [];
  const how = { failing: false };
  const connection = {
    send: async (stanza: XmlElement) => {
      if (how.failing) throw new Error('The connection closed.');
      sent.push(stanza);
    },
  } as unknown as XmppConnection;
  return { connection, sent, how };
}

test('an XMPP message held goes as typed then, as an answer to one still there', async () => {
  const state = xmppState();
  const { connection, sent, how } = xmppConnection();
  await sendXmppHeld(state, connection, { id: '1', chat: PEER, text: 'an answer', at: 1, made: 1, replyTo: 'theirs' });
  assert.equal(child(sent[0], 'reply', NS_REPLY)?.attrs.id, 'theirs');
  await sendXmppHeld(state, connection, { id: '2', chat: PEER, text: 'no longer an answer', at: 1, made: 1, replyTo: 'gone' });
  assert.equal(child(sent[1], 'reply', NS_REPLY), undefined);
  assert.deepEqual(
    state.chats[PEER].messages.map((m) => [m.text, m.state, m.replyTo]),
    [
      ['γεια', undefined, undefined],
      ['an answer', 'sent', 'theirs'],
      ['no longer an answer', 'sent', undefined],
    ],
  );
  // The connection fails as it goes: it shows as not sent, held no more. A group not joined yet
  // shows nothing, so it stays held.
  how.failing = true;
  await sendXmppHeld(state, connection, { id: '3', chat: PEER, text: 'lost', at: 1, made: 1 });
  assert.equal(state.chats[PEER].messages.at(-1)?.state, 'failed');
  await assert.rejects(sendXmppHeld(state, connection, { id: '4', chat: 'room@groups.example.org', text: 'to the group', at: 1, made: 1 }), /Not in this group yet/);
});

test('an XMPP message that did not go is sent again in its place, or forgotten', async () => {
  const state = xmppState();
  const { connection, sent, how } = xmppConnection();
  how.failing = true;
  await sendXmppHeld(state, connection, { id: '1', chat: PEER, text: 'first try', at: 1, made: 1, replyTo: 'theirs' });
  const failed = state.chats[PEER].messages.at(-1);
  assert.equal(failed?.state, 'failed');
  assert.equal(xmppUnsentIn(state, PEER, failed?.id ?? '')?.text, 'first try');
  assert.equal(xmppUnsentIn(state, PEER, 'theirs'), undefined);
  // Not going again, it shows as not sent once more, once.
  await assert.rejects(sendXmppAgain(state, connection, PEER, failed?.id ?? ''));
  assert.deepEqual(
    state.chats[PEER].messages.map((m) => [m.text, m.state]),
    [
      ['γεια', undefined],
      ['first try', 'failed'],
    ],
  );
  how.failing = false;
  await sendXmppAgain(state, connection, PEER, state.chats[PEER].messages[1].id);
  assert.deepEqual(
    state.chats[PEER].messages.map((m) => [m.text, m.state, m.replyTo]),
    [
      ['γεια', undefined, undefined],
      ['first try', 'sent', 'theirs'],
    ],
  );
  assert.equal(child(sent[0], 'reply', NS_REPLY)?.attrs.id, 'theirs');
  // One that went is not sent again.
  await sendXmppAgain(state, connection, PEER, state.chats[PEER].messages[1].id);
  assert.equal(sent.length, 1);

  how.failing = true;
  await sendXmppHeld(state, connection, { id: '2', chat: PEER, text: 'let go', at: 1, made: 1 });
  dropXmppUnsent(state, PEER, state.chats[PEER].messages.at(-1)?.id ?? '');
  dropXmppUnsent(state, PEER, 'theirs');
  assert.deepEqual(
    state.chats[PEER].messages.map((m) => m.text),
    ['γεια', 'first try'],
  );
});

// ---- A Matrix account of the space, with the core ----

const built = new URL('./.core/erevos_ffi.js', import.meta.url);
const coreReady = existsSync(built) && typeof (createRequire(import.meta.url)(built.pathname) as Record<string, unknown>).matrix === 'function';
if (!coreReady) console.log('Skipping the Matrix account check: build the core first with node checks/build-core.mjs');

async function until(done: () => boolean, what: string, ms = 5000): Promise<void> {
  const end = Date.now() + ms;
  while (!done()) {
    if (Date.now() > end) throw new Error(`Waited in vain for ${what}`);
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
}

test('a Matrix account keeps its draft, sends what it holds at its time, and sends again what did not go', { skip: !coreReady }, async () => {
  const wasm = createRequire(import.meta.url)(built.pathname) as Record<string, (...args: never[]) => unknown>;
  setCore(Object.fromEntries(Object.entries(wasm).map(([name, fn]) => [name, async (...args: never[]) => fn(...args)])) as unknown as Core);
  const server = new Homeserver();
  let refusing = false;
  setMatrixHttp(async (request) => {
    if (refusing && request.method === 'PUT' && request.url.includes('/send/m.room')) return { status: 502, json: { errcode: 'M_UNKNOWN', error: 'Bad gateway' } };
    // The homeserver here answers at once: a sync that would wait a while waits a little.
    if (request.url.includes('/sync?timeout=30000')) await new Promise((resolve) => setTimeout(resolve, 20));
    return server.answer(request);
  });
  setCurrentSpace(11, randomBytes(32));
  let stopLater = () => {};
  try {
    runMatrix();
    await until(() => matrixNow().loaded, 'the account to load');
    await matrixSignIn('gus', PASSWORD, HS);
    const hal = await signIn(HS, 'hal', PASSWORD);
    const room = (await matrixStartChat(hal.userId)).id;
    await sync(hal, 0);
    await joinRoom(hal, room);
    await sync(hal, 0);

    // A draft: on its row, and still there once the account was stopped and run again.
    await matrixWriting()?.change((writing) => keepDraft(writing, room, 'μισογραμμένο'));
    assert.equal(matrixInboxRows(matrixNow().state as MatrixState).find((row) => row.identity === `matrix:${room}`)?.draft, 'μισογραμμένο');
    await matrixWriting()?.keep();
    stopMatrix();
    runMatrix();
    await until(() => matrixNow().loaded && !!matrixNow().state, 'the account again');
    assert.equal(draftIn(matrixNow().state?.writing, room), 'μισογραμμένο');

    // Held for a moment from now: it goes then, not before, and is held no more.
    stopLater = startChatLater();
    const at = Date.now() + 300;
    await matrixWriting()?.change((writing) => holdText(writing, { chat: room, text: 'a little later', at })?.writing ?? writing);
    heldChanged();
    const went = () => matrixNow().state?.rooms[room]?.messages.find((m) => m.text === 'a little later' && !m.state);
    await until(() => !!went(), 'the message held to go');
    assert.ok((went()?.ts ?? 0) >= at);
    assert.deepEqual(heldIn(matrixNow().state?.writing, room), []);
    await sync(hal, 0);
    assert.ok(hal.rooms[room].messages.some((m) => m.text === 'a little later'));

    // Refused, it shows as not sent; sent again, it goes in its place.
    refusing = true;
    await assert.rejects(matrixSend(room, 'refused at first'));
    const failed = matrixNow().state?.rooms[room]?.messages.find((m) => m.text === 'refused at first');
    assert.equal(failed?.state, 'failed');
    refusing = false;
    await matrixSendAgain(room, failed?.id ?? '');
    const now = matrixNow().state?.rooms[room]?.messages.filter((m) => m.text === 'refused at first') ?? [];
    assert.deepEqual(
      now.map((m) => m.state),
      [undefined],
    );
    await sync(hal, 0);
    assert.ok(hal.rooms[room].messages.some((m) => m.text === 'refused at first'));
  } finally {
    stopLater();
    stopMatrix();
    setCurrentSpace(null);
    setMatrixHttp(defaultMatrixHttp);
    setCore(null);
  }
});
