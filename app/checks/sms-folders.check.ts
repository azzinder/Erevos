// The space's own order of its SMS (lib/sms-folders.ts, lib/sms-link.ts): pins, the Archive and the
// Trash, sealed in the space.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { randomBytes } from '../lib/crypto';
import type { InboxRow, InboxSms } from '../lib/inbox';
import { arrangeRows, dueTrash, emptyTrash, shownMessages, smsFolder, sortSms, trashGoesAt } from '../lib/sms-folders';
import { SmsLink } from '../lib/sms-link';
import { kept } from '../lock/inbox-cache';
import { EMPTY_SMS, MAX_PINS, MAX_TRASH, TRASH_DAYS, type SmsData } from '../lock/sms-data';
import { files } from './files-memory';

const DAY = 24 * 3600 * 1000;

const sms = (address: string, text: string, at: number, more: Partial<InboxSms> = {}): InboxSms => ({ address, text, at, mine: false, unread: 1, ...more });
const data = (more: Partial<SmsData> = {}): SmsData => ({ ...EMPTY_SMS, ...more });
const row = (identity: string, address: string, at: number): InboxRow => ({
  identity,
  name: identity,
  last: '',
  mine: false,
  mark: 0,
  at,
  unread: 0,
  timer: 0,
  imported: false,
  avatar: null,
  sms: address,
  lastSms: !!address,
});

test('each conversation shows in one folder: the Trash first, then the Archive, else the list', () => {
  const order = data({
    trash: [{ address: '+306911111111', upTo: 100, at: 100 }],
    archived: [
      { address: '+306922222222', at: 100 },
      { address: '+306933333333', at: 100 },
    ],
  });
  const threads = [
    sms('+306911111111', 'in the Trash', 90),
    sms('+306922222222', 'archived', 90),
    // A message from them after it was archived brings it back to the list; one of ours does not.
    sms('+306933333333', 'came after', 120),
    sms('+306955555555', 'plain', 90),
  ];
  const sorted = sortSms(threads, order);
  assert.deepEqual(sorted.trash.map((s) => s.text), ['in the Trash']);
  assert.deepEqual(sorted.archived.map((s) => s.text), ['archived']);
  assert.deepEqual(sorted.list.map((s) => s.text), ['came after', 'plain']);
  assert.deepEqual(sorted.back, ['+306933333333']);
  assert.equal(smsFolder(sms('+306922222222', 'mine', 120, { mine: true }), order), 'archived');
  // A message after it went to the Trash shows the conversation again, without what came before.
  assert.equal(smsFolder(sms('+306911111111', 'new', 120), order), 'list');
  const messages = [{ at: 50 }, { at: 100 }, { at: 120 }];
  assert.deepEqual(shownMessages(messages, order.trash[0]), [{ at: 120 }]);
  assert.deepEqual(shownMessages(messages, null), messages);
});

test('pinned SMS conversations come first, in the list\'s order', () => {
  const rows = [row('contact:aa', '', 50), row('sms:1', '+306911111111', 40), row('sms:2', '+306922222222', 30), row('sms:3', '+306933333333', 20)];
  const arranged = arrangeRows(rows, [{ address: '6933333333', at: 1 }, { address: '+306922222222', at: 2 }]);
  assert.deepEqual(arranged.map((r) => r.identity), ['sms:2', 'sms:3', 'contact:aa', 'sms:1']);
  assert.deepEqual(arranged.map((r) => r.pinned ?? false), [true, true, false, false]);
  assert.equal(arranged[2], rows[0]);
  // The list kept for when Erevos opens keeps the pins.
  assert.equal(kept([arranged[0]]).rows[0].pinned, true);
});

test('the Trash goes from the phone after its days, and what could not go stays to be tried again', async () => {
  files.clear();
  const link = await SmsLink.open(0, randomBytes(32));
  const now = 100 * DAY;
  await link.trash('+306911111111', now - 40 * DAY, now - 40 * DAY);
  await link.trash('+306922222222', now - 31 * DAY, now - 31 * DAY);
  await link.trash('+306933333333', now - DAY, now - DAY);
  const due = dueTrash(link.state.trash, now);
  assert.deepEqual(due.map((t) => t.address), ['+306911111111', '+306922222222']);
  assert.equal(trashGoesAt(link.state.trash[2]), now - DAY + TRASH_DAYS * DAY);
  const removed: string[] = [];
  const gone = await emptyTrash(link, due, async (address) => {
    if (address === '+306922222222') throw new Error('not the SMS app');
    removed.push(address);
  });
  assert.equal(gone, 1);
  assert.deepEqual(removed, ['+306911111111']);
  assert.deepEqual(link.state.trash.map((t) => t.address), ['+306922222222', '+306933333333']);
});

test('pins, the Archive and the Trash are kept sealed in the space, and only there', async () => {
  files.clear();
  const key = randomBytes(32);
  const link = await SmsLink.open(0, key);
  assert.equal(await link.pin('+306911111111', true), true);
  await link.archive('+306922222222', true, 100);

  const again = await SmsLink.open(0, key);
  assert.deepEqual(again.state.pinned.map((p) => p.address), ['+306911111111']);
  assert.deepEqual(again.state.archived, [{ address: '+306922222222', at: 100 }]);
  // Nothing of it shows in the phone's files, and another space's key opens none of it.
  const written = [...files.values()].join('\n');
  assert.doesNotMatch(written, /6911111111|6922222222/);
  const other = await SmsLink.open(0, randomBytes(32)).catch(() => null);
  assert.deepEqual(other?.state.pinned ?? [], []);

  // Archiving unpins; the Trash unpins and takes out of the Archive.
  await again.archive('+306911111111', true, 200);
  assert.deepEqual(again.state.pinned, []);
  await again.pin('+306955555555', true);
  await again.trash('+306955555555', 300, 300);
  await again.trash('+306922222222', 300, 300);
  assert.deepEqual(again.state.pinned, []);
  assert.deepEqual(again.state.archived.map((a) => a.address), ['+306911111111']);
  await again.untrash('+306922222222');
  assert.deepEqual(again.state.trash.map((t) => t.address), ['+306955555555']);
});

test('pins and the Trash have their limits, and none is dropped for a new one', async () => {
  files.clear();
  const link = await SmsLink.open(0, randomBytes(32));
  for (let i = 0; i < MAX_PINS; i++) assert.equal(await link.pin(`+3069000000${String(i).padStart(2, '0')}`, true), true);
  assert.equal(await link.pin('+306999999999', true), false);
  // Pinning one pinned already is no new pin.
  assert.equal(await link.pin('+306900000000', true), true);
  assert.equal(link.state.pinned.length, MAX_PINS);
  for (let i = 0; i < MAX_TRASH; i++) await link.trash(`+30691${String(i).padStart(7, '0')}`, 1, 1);
  assert.equal(await link.trash('+306999999999', 1, 1), false);
  assert.equal(link.state.trash.length, MAX_TRASH);
});
