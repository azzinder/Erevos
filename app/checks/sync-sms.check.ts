// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// The phone's SMS in the space's log (lib/sync/sms.ts, docs/sync.md S8): written by the phone
// alone, as they are, only what changed; the latest 50 conversations with their latest 50
// messages; all of them gone once turned off. What a device asks to send, what came of it, and a
// conversation read there.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { change, emptyLog, setPeers, take, type Change, type Log } from '../lib/sync/log';
import {
  ASK_KEPT,
  askChanges,
  askDone,
  askGone,
  asksOf,
  oldAsks,
  readChanges,
  readsOf,
  SHARED_CONVERSATIONS,
  SHARED_MESSAGES,
  smsChanges,
  smsShared,
  smsView,
  type SharedConversation,
  type SharedSms,
  type SharedSmsAll,
} from '../lib/sync/sms';

const PHONE = 'a1'.repeat(32);
const DELL = 'b2'.repeat(32);

function pair(): { phone: Log; dell: Log } {
  const phone = emptyLog(PHONE, PHONE);
  const dell = emptyLog(DELL, PHONE);
  for (const log of [phone, dell]) setPeers(log, [PHONE, DELL], Date.now());
  return { phone, dell };
}

const write = (from: Log, to: Log, changes: readonly Change[]) => {
  for (const c of changes) change(from, Date.now(), c);
  take(to, from.ops, Date.now(), from.me);
};

const sms = (row: number, text: string, at: number, more: Partial<SharedSms> = {}): SharedSms => ({ kind: 'sms', row, text, at, mine: false, state: 'done', read: false, ...more });

const NOW = Date.now();
const anna: SharedConversation = {
  thread: 7,
  address: '+306900000001',
  at: NOW - 1000,
  unread: 1,
  name: 'Anna',
  messages: [sms(1, 'hello', NOW - 3000, { read: true }), sms(2, 'are you there?', NOW - 1000), sms(3, 'yes', NOW - 2000, { mine: true, state: 'delivered', read: true })],
};
const group: SharedConversation = {
  thread: 8,
  address: '+306900000002,+306900000003',
  at: NOW - 5000,
  unread: 0,
  names: { '+306900000002': 'Bob' },
  messages: [sms(4, '', NOW - 5000, { kind: 'mms', read: true, from: '+306900000002', pictures: 2 })],
};

test('the phone writes its SMS as they are, the device shows them, and only what changed is written again', () => {
  const { phone, dell } = pair();
  const shared: SharedSmsAll = { names: true, conversations: [group, anna] };
  write(phone, dell, smsChanges(phone, shared));
  const view = smsView(dell)!;
  assert.equal(view.names, true);
  // The latest first, each conversation's messages the oldest first.
  assert.deepEqual(
    view.conversations.map((c) => [c.thread, c.address, c.unread, c.name ?? '', c.messages.map((m) => m.row)]),
    [
      [7, '+306900000001', 1, 'Anna', [1, 3, 2]],
      [8, '+306900000002,+306900000003', 0, '', [4]],
    ],
  );
  assert.deepEqual(view.conversations[0].messages[1], anna.messages[2]);
  assert.deepEqual(view.conversations[1].names, { '+306900000002': 'Bob' });
  assert.deepEqual(view.conversations[1].messages[0], group.messages[0]);
  // As it was: nothing.
  assert.deepEqual(smsChanges(phone, shared), []);
  // One read on the phone: that message and its conversation alone.
  const read = { ...anna, unread: 0, messages: anna.messages.map((m) => (m.row === 2 ? { ...m, read: true } : m)) };
  assert.deepEqual(
    smsChanges(phone, { names: true, conversations: [group, read] }).map((c) => c.id),
    ['c7', 'ms2'],
  );
  // A conversation the phone no longer has goes, with its messages.
  write(phone, dell, smsChanges(phone, { names: false, conversations: [anna] }));
  assert.deepEqual(smsView(dell)!.conversations.map((c) => c.thread), [7]);
  assert.equal(smsView(dell)!.names, false);
});

test('the latest 50 conversations go, each with its latest 50 messages', () => {
  const { phone, dell } = pair();
  const conversations = Array.from({ length: SHARED_CONVERSATIONS + 10 }, (_, i): SharedConversation => ({
    thread: i,
    address: `+3069${String(i).padStart(8, '0')}`,
    at: NOW - i * 1000,
    unread: 0,
    messages: i === 0 ? Array.from({ length: SHARED_MESSAGES + 20 }, (_, j) => sms(1000 + j, `n${j}`, NOW - 100_000 + j)) : [sms(i, 'hi', NOW - i * 1000)],
  }));
  write(phone, dell, smsChanges(phone, { names: false, conversations }));
  const view = smsView(dell)!;
  assert.equal(view.conversations.length, SHARED_CONVERSATIONS);
  assert.equal(view.conversations[0].messages.length, SHARED_MESSAGES);
  assert.equal(view.conversations[0].messages[0].text, 'n20');
  assert.ok(view.conversations.every((c) => c.thread < SHARED_CONVERSATIONS));
});

test('turned off on the phone: every SMS goes from the devices, with what they asked and read', () => {
  const { phone, dell } = pair();
  write(phone, dell, smsChanges(phone, { names: true, conversations: [anna] }));
  write(dell, phone, [...askChanges('0123456789abcdef', anna.address, 'later', NOW), ...readChanges(dell, 7, NOW)]);
  assert.equal(asksOf(phone).length, 1);
  write(phone, dell, smsChanges(phone, null));
  assert.equal(smsShared(dell), false);
  assert.equal(smsView(dell), null);
  assert.deepEqual([asksOf(dell), [...readsOf(dell)]], [[], []]);
});

test('only the phone writes its SMS: a device that writes them anyway is not heard', () => {
  const { phone, dell } = pair();
  assert.equal(change(dell, NOW, { k: 'sms', id: 'on', x: 'add' }), null);
  // One made to look the phone's: refused, from that device.
  const forged = emptyLog(DELL, DELL);
  for (const c of smsChanges(forged, { names: true, conversations: [anna] })) change(forged, NOW, c);
  take(phone, forged.ops, Date.now(), DELL);
  assert.equal(smsShared(phone), false);
  assert.equal(smsView(phone), null);
});

test('what a device asks to send: the phone sees it with who asked, says what came of it, and lets go of those not sent after a week', () => {
  const { phone, dell } = pair();
  write(phone, dell, smsChanges(phone, { names: false, conversations: [anna] }));
  assert.deepEqual(askChanges('not an id', anna.address, 'x', NOW), []);
  assert.deepEqual(askChanges('0123456789abcdef', anna.address, '', NOW), []);
  write(dell, phone, [...askChanges('0123456789abcdef', anna.address, 'one', NOW), ...askChanges('fedcba9876543210', anna.address, 'two', NOW + 1)]);
  assert.deepEqual(
    asksOf(phone).map((a) => [a.id, a.text, a.by, a.d ?? '']),
    [
      ['0123456789abcdef', 'one', DELL, ''],
      ['fedcba9876543210', 'two', DELL, ''],
    ],
  );
  // Sent: it goes (the SMS is then among the phone's); not sent: it says so, once.
  write(phone, dell, [...askDone(phone, '0123456789abcdef', 'sent'), ...askDone(phone, 'fedcba9876543210', 'failed')]);
  assert.deepEqual(askDone(phone, 'fedcba9876543210', 'failed'), []);
  assert.deepEqual(asksOf(dell).map((a) => [a.id, a.d]), [['fedcba9876543210', 'failed']]);
  assert.deepEqual(smsView(dell)!.asks.map((a) => a.id), ['fedcba9876543210']);
  // Shown a week: removed; let go of on the device before: removed there.
  assert.deepEqual(oldAsks(phone, NOW + ASK_KEPT - 1000), []);
  assert.deepEqual(oldAsks(phone, NOW + ASK_KEPT + 1000).map((c) => [c.id, 'x' in c ? c.x : '']), [['fedcba9876543210', 'del']]);
  write(dell, phone, askGone(dell, 'fedcba9876543210'));
  assert.deepEqual(asksOf(phone), []);
});

test('a conversation read on a device: written only when later, and gone with the conversation', () => {
  const { phone, dell } = pair();
  write(phone, dell, smsChanges(phone, { names: false, conversations: [anna, group] }));
  write(dell, phone, readChanges(dell, 7, NOW - 1000));
  assert.deepEqual(readChanges(dell, 7, NOW - 2000), []);
  assert.equal(readChanges(dell, 7, NOW).length, 1);
  assert.deepEqual([...readsOf(phone)], [[7, NOW - 1000]]);
  assert.deepEqual([...smsView(phone)!.reads], [[7, NOW - 1000]]);
  write(phone, dell, smsChanges(phone, { names: false, conversations: [group] }));
  assert.deepEqual([...readsOf(dell)], []);
});
