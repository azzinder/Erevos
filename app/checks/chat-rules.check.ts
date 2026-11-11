// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// The rules of a chat with another service (lib/chat-rules.ts): a chat's timer counts for the
// messages sent after it was set, a message's own time wins, and what is gone goes from the chat
// and stays away; on Matrix ours are taken back for everyone first, and whom the account blocks
// (m.ignored_user_list) sends nothing that is kept; on XMPP the unread count follows, a code as
// Conversations writes it checks a contact's devices, and appearing offline to one contact tells
// their server so; on Nostr what goes carries its NIP-40 expiration, in the message and on each
// wrap a little later, what comes with one goes then and what comes past it is not kept, a blocked
// key's messages are dropped for good, and a photo of their npub checks a chat; an SMS
// conversation's timer deletes the phone's copies as they are due (lib/sms-rules.ts).
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { after, before, test } from 'node:test';

import { checkedRules, goesAt, goneOf, nextGoes, vanishTimer, withBlocked, withHidden, withOne, withTimer, type ChatRules } from '../lib/chat-rules';
import { setCore, type Core } from '../lib/core';
import { randomBytes, toBase64 } from '../lib/crypto';
import { MatrixError, syncApply, type MatrixState } from '../lib/matrix';
import { hideIn as hideInMatrix, idsIn, markSent, shownIn as shownInMatrix, sweepMatrixRules } from '../lib/matrix-rules';
import { chatCore, EXPIRATION_LATER, newNostrDm, npubOf, takeWrap, wrapMessage, type NostrDmState } from '../lib/nostr-dm';
import { checkByCode as checkNostr, goesAtIn, isBlocked, nostrRulesDue, ownCode as nostrCode, setBlocked, setTimerIn as setNostrTimer, shownIn as shownInNostr, sweepNostrRules } from '../lib/nostr-rules';
import { SmsLink } from '../lib/sms-link';
import { goneSms, smsRulesOf, sweepSms } from '../lib/sms-rules';
import type { XmppConnection, XmppState } from '../lib/xmpp';
import { checkByCode as checkXmpp, hideIn as hideInXmpp, ownCode as xmppCode, readCode, setTimerIn as setXmppTimer, setUnseen, shownIn as shownInXmpp, sweepXmppRules, unseenBy } from '../lib/xmpp-rules';
import type { SmsMessage } from '../modules/erevos-sms';

const MIN = 60_000;
const HOUR = 3600_000;

const built = new URL('./.core/erevos_ffi.js', import.meta.url);
const coreReady = existsSync(built) && typeof (createRequire(import.meta.url)(built.pathname) as Record<string, unknown>).nostrChat === 'function';
if (!coreReady) console.log('Skipping the Nostr checks of chat rules: build the core first with node checks/build-core.mjs');

before(() => {
  if (!coreReady) return;
  const wasm = createRequire(import.meta.url)(built.pathname) as Record<string, (...args: never[]) => unknown>;
  setCore(Object.fromEntries(Object.entries(wasm).map(([name, fn]) => [name, async (...args: never[]) => fn(...args)])) as unknown as Core);
});

after(() => setCore(null));

test("a chat's timer counts for messages sent after it was set, and a message's own time wins", () => {
  // Nothing set: nothing goes.
  assert.equal(goesAt(undefined, 'a', 1000), 0);
  assert.equal(withTimer(undefined, 0, 1000), undefined);
  let rules = withTimer(undefined, 60, 10 * MIN);
  assert.equal(vanishTimer(rules), 60);
  // One sent before the timer stays; one after goes a minute after it was sent.
  assert.equal(goesAt(rules, 'old', 5 * MIN), 0);
  assert.equal(goesAt(rules, 'new', 11 * MIN), 12 * MIN);
  // Set again to the same: nothing changes.
  assert.equal(withTimer(rules, 60, 20 * MIN), rules);
  // Changed to an hour, then turned off: each message goes as the timer was when it was sent.
  rules = withTimer(rules, 3600, 20 * MIN);
  rules = withTimer(rules, 0, 30 * MIN);
  assert.equal(vanishTimer(rules), 0);
  assert.equal(goesAt(rules, 'b', 15 * MIN), 16 * MIN);
  assert.equal(goesAt(rules, 'c', 25 * MIN), 25 * MIN + HOUR);
  assert.equal(goesAt(rules, 'd', 35 * MIN), 0);
  // A message's own time, set or as it came, wins over the timer.
  rules = withOne(rules, 'd', 40 * MIN);
  rules = withOne(rules, 'b', 50 * MIN);
  assert.equal(goesAt(rules, 'd', 35 * MIN), 40 * MIN);
  assert.equal(goesAt(rules, 'b', 15 * MIN), 50 * MIN);

  const messages = [
    { id: 'old', at: 5 * MIN },
    { id: 'b', at: 15 * MIN },
    { id: 'c', at: 25 * MIN },
    { id: 'd', at: 35 * MIN },
  ];
  const ids = (list: { id: string }[]) => list.map((m) => m.id);
  const gone = (now: number) => ids(goneOf(rules, messages, (m) => m.id, (m) => m.at, now));
  assert.deepEqual(gone(39 * MIN), []);
  assert.deepEqual(gone(40 * MIN), ['d']);
  assert.deepEqual(gone(50 * MIN), ['b', 'd']);
  assert.deepEqual(gone(25 * MIN + HOUR), ['b', 'c', 'd']);
  assert.equal(nextGoes(rules, messages, (m) => m.id, (m) => m.at, 39 * MIN), 40 * MIN);
  assert.equal(nextGoes(rules, messages, (m) => m.id, (m) => m.at, 2 * HOUR), 0);

  // Deleted here: gone at once, for good, without a time of its own.
  const hidden = withHidden(rules, ['old']);
  assert.deepEqual(ids(goneOf(hidden, messages, (m) => m.id, (m) => m.at, 0)), ['old']);
  assert.equal(withHidden(withOne(undefined, 'x', 5), ['x']).ones, undefined);

  // A timer that kept messages from the start counts for none.
  assert.deepEqual(withTimer(withTimer(undefined, 0, 1), 60, 2)?.vanish, [{ since: 2, after: 60 }]);
  // What is kept is checked: what is damaged is left out.
  assert.deepEqual(checkedRules({ vanish: [{ since: 1, after: 5 }, { since: 'x', after: 1 }], ones: { a: 9, b: -1 }, hidden: ['h', 3] }), { vanish: [{ since: 1, after: 5 }], ones: { a: 9 }, hidden: ['h'] });
  assert.equal(checkedRules('nothing'), undefined);
  assert.equal(checkedRules({ vanish: [{ since: 1, after: 0 }] }), undefined);
  // Who is blocked: the latest last, none left is none.
  assert.deepEqual(withBlocked(['a', 'b'], 'a', true), ['b', 'a']);
  assert.equal(withBlocked(['a'], 'a', false), undefined);
  assert.deepEqual(withBlocked(['a', 'b', 'c'], 'd', true, 3), ['b', 'c', 'd']);
});

const matrixState = (): MatrixState =>
  ({
    userId: '@me:example.org',
    rooms: {},
    outdated: [],
    devices: {},
    seen: {},
    outbound: {},
  }) as unknown as MatrixState;

const said = (id: string, sender: string, ts: number, body = id) => ({ type: 'm.room.message', event_id: id, sender, origin_server_ts: ts, content: { msgtype: 'm.text', body } });
const news = (roomId: string, events: unknown[], more: Record<string, unknown> = {}) => ({
  rooms: { join: { [roomId]: { timeline: { events, limited: false } } } },
  device_one_time_keys_count: { signed_curve25519: 50 },
  device_unused_fallback_key_types: ['signed_curve25519'],
  ...more,
});

test('on Matrix, whom the account blocks sends nothing that is kept, and a message deleted here stays away', async () => {
  const state = matrixState();
  const room = '!r:example.org';
  // The account data says whom it ignores, as its other apps set it.
  await syncApply(state, news(room, [said('$1', '@anna:example.org', 1000), said('$2', '@spam:example.org', 2000)], { account_data: { events: [{ type: 'm.ignored_user_list', content: { ignored_users: { '@spam:example.org': {}, 'not an id': {} } } }] } }));
  assert.deepEqual(state.ignored, ['@spam:example.org']);
  assert.deepEqual(state.rooms[room].messages.map((m) => m.id), ['$1']);
  // Deleted here, it does not come back with older messages fetched again.
  hideInMatrix(state, room, ['$1']);
  assert.equal(state.rooms[room].messages.length, 0);
  await syncApply(state, news(room, [said('$1', '@anna:example.org', 1000), said('$3', '@anna:example.org', 3000)]));
  assert.deepEqual(state.rooms[room].messages.map((m) => m.id), ['$3']);
  // The list emptied elsewhere: they are let through again.
  await syncApply(state, news(room, [], { account_data: { events: [{ type: 'm.ignored_user_list', content: { ignored_users: {} } }] } }));
  assert.equal(state.ignored, undefined);
  await syncApply(state, news(room, [said('$4', '@spam:example.org', 4000)]));
  assert.deepEqual(state.rooms[room].messages.map((m) => m.id), ['$3', '$4']);
});

test("on Matrix, what is gone by the room's timer goes, ours taken back for everyone first", async () => {
  const state = matrixState();
  const room = '!t:example.org';
  const now = 10 * HOUR;
  await syncApply(state, news(room, [said('$before', '@me:example.org', now - 3 * HOUR)]));
  state.rooms[room].rules = withTimer(undefined, 3600, now - 2 * HOUR - MIN);
  await syncApply(state, news(room, [said('$theirs', '@anna:example.org', now - 2 * HOUR), said('$ours', '@me:example.org', now - 2 * HOUR + 1), said('$fresh', '@me:example.org', now - MIN)]));
  // One of ours sent to disappear in a minute: marked once it went.
  const before = idsIn(state, room);
  await syncApply(state, news(room, [said('$once', '@me:example.org', now - 30_000)]));
  markSent(state, room, before, 60);
  assert.equal(state.rooms[room].rules?.ones?.$once, now + 30_000);
  // The screen shows only what is not gone.
  assert.deepEqual(shownInMatrix(state.rooms[room], now).map((m) => m.id), ['$before', '$fresh', '$once']);

  // The homeserver is busy at first: ours waits, theirs goes.
  const asked: string[] = [];
  let busy = true;
  const takeBack = async (_room: string, id: string) => {
    asked.push(id);
    if (busy) throw new MatrixError(429, 'M_LIMIT_EXCEEDED', 'Too many requests');
  };
  assert.equal(await sweepMatrixRules(state, takeBack, now), true);
  assert.deepEqual(asked, ['$ours']);
  assert.deepEqual(state.rooms[room].messages.map((m) => m.id), ['$before', '$ours', '$fresh', '$once']);
  busy = false;
  assert.equal(await sweepMatrixRules(state, takeBack, now + MIN), true);
  assert.deepEqual(asked, ['$ours', '$ours', '$once']);
  assert.deepEqual(state.rooms[room].messages.map((m) => m.id), ['$before', '$fresh']);
  // One that went at a time of its own is remembered, and stays away when it comes again.
  assert.ok(state.rooms[room].rules?.hidden?.includes('$once'));
  await syncApply(state, news(room, [said('$once', '@me:example.org', now - 30_000)]));
  assert.ok(!state.rooms[room].messages.some((m) => m.id === '$once'));
  // One the homeserver refuses for good goes from here all the same.
  await syncApply(state, news(room, [said('$late', '@me:example.org', now)]));
  assert.equal(await sweepMatrixRules(state, async () => Promise.reject(new MatrixError(403, 'M_FORBIDDEN', 'No')), now + 2 * HOUR), true);
  assert.deepEqual(state.rooms[room].messages.map((m) => m.id), ['$before']);
  assert.equal(await sweepMatrixRules(state, takeBack, now + 3 * HOUR), false);
});

const omemoKey = () => toBase64(Uint8Array.from([5, ...randomBytes(32)]));
const hexKey = (identity: string) => Buffer.from(identity, 'base64').subarray(1).toString('hex');

function xmppState(): XmppState {
  return {
    jid: 'me@example.org',
    chats: {},
    omemo: { device: 1234, identity: { public: omemoKey() } },
    people: {},
  } as unknown as XmppState;
}

test('on XMPP, what is gone goes from this phone with its place among those not read', () => {
  const state = xmppState();
  const jid = 'anna@example.org';
  const at = 10 * HOUR;
  const m = (id: string, mine: boolean, when: number) => ({ id, mine, text: id, at: when, encrypted: true });
  state.chats[jid] = { jid, messages: [m('a', false, at - 3 * HOUR)], unread: 1, lastAt: at };
  setXmppTimer(state, jid, 3600, at - 2 * HOUR - MIN);
  state.chats[jid].messages.push(m('b', true, at - 2 * HOUR), m('c', false, at - 90 * MIN), m('d', false, at - MIN));
  state.chats[jid].unread = 3;
  assert.deepEqual(shownInXmpp(state.chats[jid], at).map((x) => x.id), ['a', 'd']);
  assert.equal(sweepXmppRules(state, at), true);
  assert.deepEqual(state.chats[jid].messages.map((x) => x.id), ['a', 'd']);
  // 'c' was one of the three not read.
  assert.equal(state.chats[jid].unread, 2);
  // Deleted here: from this phone, with its place among those not read.
  hideInXmpp(state, jid, ['d']);
  assert.deepEqual(state.chats[jid].messages.map((x) => x.id), ['a']);
  assert.equal(state.chats[jid].unread, 1);
  assert.equal(sweepXmppRules(state, at + HOUR), false);
});

test("on XMPP, a code as Conversations writes it checks a contact's devices, and only those whose key is the code's", () => {
  const state = xmppState();
  const jid = 'anna@example.org';
  const one = omemoKey();
  const two = omemoKey();
  const waiting = omemoKey();
  state.people[jid] = {
    fetchedAt: 0,
    devices: { '11': { identity: one, listed: true }, '22': { identity: two, listed: true }, '33': { identity: omemoKey(), pending: { identity: waiting, session: null }, listed: true } },
  } as XmppState['people'][string];
  // Ours, as their app reads it.
  const own = readCode(xmppCode(state));
  assert.deepEqual(own, { jid: 'me@example.org', keys: [{ id: '1234', key: hexKey(state.omemo.identity.public), two: false }] });
  assert.deepEqual(checkXmpp(state, jid, xmppCode(state)), { kind: 'own' });
  assert.deepEqual(checkXmpp(state, jid, 'https://example.org'), { kind: 'none' });
  assert.deepEqual(checkXmpp(state, jid, `xmpp:bob@example.org?omemo-sid-11=${hexKey(one)}`), { kind: 'other', jid: 'bob@example.org' });
  // A key that differs marks nothing of its device, and says so.
  assert.deepEqual(checkXmpp(state, jid, `xmpp:Anna@Example.org?omemo-sid-11=${hexKey(one)};omemo-sid-22=${hexKey(omemoKey())}`), { kind: 'differs' });
  assert.equal(state.people[jid].devices['11'].checked, one);
  assert.equal(state.people[jid].devices['22'].checked, undefined);
  // The code's keys with the type byte (05…), the one waiting accepted by it.
  const code = `xmpp:anna@example.org?omemo-sid-22=05${hexKey(two)};omemo-sid-33=${hexKey(waiting)};omemo-sid-44=${hexKey(omemoKey())}`;
  assert.deepEqual(checkXmpp(state, jid, code), { kind: 'checked', count: 2 });
  assert.equal(state.people[jid].devices['33'].identity, waiting);
  assert.equal(state.people[jid].devices['33'].pending, undefined);
  assert.equal(state.people[jid].devices['33'].checked, waiting);
  assert.deepEqual(checkXmpp(state, jid, `xmpp:anna@example.org?omemo-sid-55=${hexKey(omemoKey())}`), { kind: 'unknown' });
  assert.equal(readCode(`xmpp:anna@example.org?omemo-sid-1=${'ab'.repeat(31)}`), null);
});

test('on XMPP, appearing offline to one contact tells their server so, at once and as it changes', async () => {
  const state = xmppState();
  const sent: { name: string; attrs: Record<string, string> }[] = [];
  const connection = { isOpen: true, send: async (stanza: { name: string; attrs: Record<string, string> }) => void sent.push(stanza) } as unknown as XmppConnection;
  await setUnseen(state, connection, 'Anna@Example.org/phone', true);
  assert.equal(unseenBy(state, 'anna@example.org'), true);
  assert.deepEqual(state.unseenBy, ['anna@example.org']);
  await setUnseen(state, null, 'bob@example.org', true);
  await setUnseen(state, connection, 'anna@example.org', false);
  assert.deepEqual(state.unseenBy, ['bob@example.org']);
  assert.deepEqual(
    sent.map((s) => [s.name, s.attrs]),
    [
      ['presence', { to: 'anna@example.org', type: 'unavailable' }],
      ['presence', { to: 'anna@example.org' }],
    ],
  );
});

test('on Nostr, what goes carries its expiration, and what comes with one goes at its time', { skip: !coreReady }, async () => {
  const me = await newNostrDm();
  const anna = await newNostrDm();
  const now = 1_800_000_000_000;
  const expires = now / 1000 + 3600;
  const made = await wrapMessage(me, anna.public, 14, [], 'gone in an hour', now, expires);
  // The relays' copies a little later than the message, never before.
  for (const wrap of Object.values(made.wraps)) {
    const at = Number(wrap.tags.find((tag) => tag[0] === 'expiration')?.[1]);
    assert.ok(at >= expires && at <= expires + EXPIRATION_LATER, `wrap expiration ${at}`);
  }
  // Their app reads the message's own.
  assert.equal(await takeWrap(anna, made.wraps[anna.public], now + 1000), me.public);
  const chat = anna.chats[me.public];
  assert.equal(chat.rules?.ones?.[made.id], expires * 1000);
  assert.deepEqual(shownInNostr(chat, now + 2000).map((m) => m.text), ['gone in an hour']);
  assert.equal(nostrRulesDue(anna, expires * 1000 - 1), false);
  assert.equal(nostrRulesDue(anna, expires * 1000), true);
  assert.equal(sweepNostrRules(anna, expires * 1000), true);
  assert.deepEqual(chat.messages, []);
  assert.equal(chat.rules, undefined);

  // One that comes past its time is not kept.
  const late = await chatCore<{ wraps: { to: string; event: string }[] }>('wrap', {
    secret: me.secret,
    rumor: { kind: 14, created_at: now / 1000 - 7200, tags: [['p', anna.public], ['expiration', String(now / 1000 - 60)]], content: 'too late' },
    to: [anna.public],
    now: now / 1000,
  });
  assert.equal(await takeWrap(anna, JSON.parse(late.wraps[0].event), now), null);
  assert.deepEqual(anna.chats[me.public].messages, []);

  // With the chat's timer, theirs without one go from here too.
  setNostrTimer(anna, me.public, 60, now);
  const plain = await wrapMessage(me, anna.public, 14, [], 'plain', now + 1000);
  assert.equal(await takeWrap(anna, plain.wraps[anna.public], now + 2000), me.public);
  assert.equal(sweepNostrRules(anna, now + 30_000), false);
  assert.equal(sweepNostrRules(anna, now + 61_000), true);
  assert.deepEqual(anna.chats[me.public].messages, []);
  // A message of ours given a time of its own goes then, whatever the timer.
  goesAtIn(anna.chats[me.public], 'x', now);
  assert.equal(anna.chats[me.public].rules?.ones?.x, now);
});

test("on Nostr, a blocked key's messages are dropped, and do not come back once it is let through", { skip: !coreReady }, async () => {
  const me = await newNostrDm();
  const spam = await newNostrDm();
  const now = Date.now();
  setBlocked(me, spam.public, true);
  setBlocked(me, me.public, true);
  setBlocked(me, 'not a key', true);
  assert.deepEqual(me.blocked, [spam.public]);
  const made = await wrapMessage(spam, me.public, 14, [], 'buy now', now);
  assert.equal(await takeWrap(me, made.wraps[me.public], now), null);
  assert.equal(me.chats[spam.public], undefined);
  setBlocked(me, spam.public, false);
  assert.equal(isBlocked(me, spam.public), false);
  assert.equal(me.blocked, undefined);
  assert.equal(await takeWrap(me, made.wraps[me.public], now), null);
  const again = await wrapMessage(spam, me.public, 14, [], 'hello again', now + 1000);
  assert.equal(await takeWrap(me, again.wraps[me.public], now + 2000), spam.public);
  assert.deepEqual(me.chats[spam.public].messages.map((m) => m.text), ['hello again']);
});

test('on Nostr, a photo of their npub checks the chat when it is its key', { skip: !coreReady }, async () => {
  const me = await newNostrDm();
  const anna = await newNostrDm();
  const other = await newNostrDm();
  me.chats[anna.public] = { key: anna.public, messages: [], unread: 0, lastAt: 0 };
  assert.equal(nostrCode(npubOf(me.public)), `nostr:${npubOf(me.public)}`);
  assert.equal(await checkNostr(me, anna.public, nostrCode(npubOf(me.public))), 'own');
  assert.equal(await checkNostr(me, anna.public, nostrCode(npubOf(other.public))), 'other');
  assert.equal(await checkNostr(me, anna.public, 'not a key'), 'none');
  assert.equal(me.chats[anna.public].checked, undefined);
  assert.equal(await checkNostr(me, anna.public, ` ${nostrCode(npubOf(anna.public))}\n`, 1234), 'match');
  assert.equal(me.chats[anna.public].checked, 1234);
});

test("an SMS conversation's timer deletes the phone's copies as they are due, and keeps the rest", async () => {
  const link = await SmsLink.open(0, randomBytes(32));
  const address = '+306911111111';
  const now = 100 * HOUR;
  assert.equal(await link.setVanish(address, 3600, now - 3 * HOUR), true);
  const again = await SmsLink.open(0, randomBytes(32)).catch(() => null);
  assert.ok(!again || !again.state.vanish.length);
  const rules: ChatRules | undefined = smsRulesOf(link.state, '6911111111');
  assert.equal(vanishTimer(rules), 3600);
  const sms = (id: number, at: number, state: SmsMessage['state'] = 'done'): SmsMessage => ({ id, kind: 'sms', text: String(id), at, mine: false, state, read: true });
  const messages = [sms(1, now - 4 * HOUR), sms(2, now - 2 * HOUR), sms(3, now - 90 * MIN, 'sending'), sms(4, now - MIN)];
  assert.deepEqual(goneSms(rules, messages, now).map((m) => m.id), [2]);
  await link.pinMessage(address, { id: 'sms:2', at: now - 2 * HOUR }, true);
  const removed: string[][] = [];
  assert.equal(await sweepSms(link, async () => messages, async (ids) => void removed.push(ids), now), 1);
  assert.deepEqual(removed, [['sms:2']]);
  assert.deepEqual(link.messagePins(address), []);
  // What the phone would not delete stays, to be tried again.
  assert.equal(await sweepSms(link, async () => messages, async () => Promise.reject(new Error('not the SMS app')), now), 0);
  // Turned off, those sent under it still go; none after.
  await link.setVanish(address, 0, now);
  assert.equal(vanishTimer(smsRulesOf(link.state, address)), 0);
  assert.deepEqual(goneSms(smsRulesOf(link.state, address), [...messages, sms(5, now + MIN)], now + 2 * HOUR).map((m) => m.id), [2, 4]);
});
