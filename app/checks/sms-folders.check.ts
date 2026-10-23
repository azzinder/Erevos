// The space's own order of its SMS (lib/sms-folders.ts, lib/sms-link.ts): pins, the Archive, the
// Trash, Spam and its rules, drafts and the seconds to take an SMS back, all sealed in the space;
// and what waits a few seconds to be taken back (lib/held.ts), a message passed on to another
// conversation (lib/forward.ts), the phone's SMS a backup holds (lib/backup-sms.ts), and the
// one-time code an SMS holds, for Copy code (lib/one-time-code.ts).
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { smsCounts } from '../lib/backup-sms';
import { randomBytes } from '../lib/crypto';
import { forwardedTo, forwardTo } from '../lib/forward';
import { Held } from '../lib/held';
import { oneTimeCode } from '../lib/one-time-code';
import type { InboxRow, InboxSms } from '../lib/inbox';
import { arrangeRows, dueTrash, emptyTrash, isSpam, looksLikeSpam, plainText, shownMessages, smsFolder, sortSms, trashGoesAt } from '../lib/sms-folders';
import { SmsLink } from '../lib/sms-link';
import { kept } from '../lock/inbox-cache';
import { sealedFile } from '../lock/sealed-file';
import { EMPTY_SMS, MAX_PINS, MAX_TRASH, MAX_WORDS, TRASH_DAYS, type SmsData } from '../lock/sms-data';
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

test('the filter catches a link with words that try to fool, from an unknown phone number only', () => {
  const parcel = 'Το δέμα σας κρατείται στο τελωνείο. Πληρώστε εδώ: https://parcel-gr.example/pay';
  assert.equal(looksLikeSpam(parcel, [], false, true), true);
  // The same words without a link, or with a link but no such words, are not.
  assert.equal(looksLikeSpam('Το δέμα σας έφτασε στο κατάστημα.', [], false, true), false);
  assert.equal(looksLikeSpam('Δες τις φωτό https://photos.example/a', [], false, true), false);
  // A sender with a name or a short code, as banks and shops write, is left alone by those rules.
  assert.equal(looksLikeSpam(parcel, [], false, false), false);
  // Every link from an unknown number, when the owner wants it.
  assert.equal(looksLikeSpam('Δες τις φωτό https://photos.example/a', [], true, true), true);
  // The owner's words count from any sender, without accents or case.
  assert.equal(looksLikeSpam('ΠΡΟΣΦΟΡΆ μόνο σήμερα', ['προσφορα'], false, false), true);
  assert.equal(plainText('  Κέρδισες   ΈΝΑ δώρο '), 'κερδισες ενα δωρο');
});

test('spam is a blocked number, a marked one, or one the filter caught; never a contact, one answered or a group', () => {
  const parcel = 'Your parcel is held, pay the customs fee: https://parcel.example/x';
  const from = sms('+306900000001', parcel, 10);
  assert.equal(isSpam(from, data(), [], false), true);
  assert.equal(isSpam(from, data({ spam: false }), [], false), false);
  assert.equal(isSpam(from, data(), [], true), false);
  assert.equal(isSpam({ ...from, replied: true }, data(), [], false), false);
  assert.equal(isSpam(sms('+306900000001,+306900000002', parcel, 10), data(), ['+306900000001'], false), false);
  // The owner's word wins over the filter, both ways, for the number written either way.
  assert.equal(isSpam(from, data({ marks: [{ number: '6900000001', spam: false, at: 1 }] }), [], false), false);
  assert.equal(isSpam(sms('+306900000001', 'hello', 10), data({ marks: [{ number: '6900000001', spam: true, at: 1 }] }), [], true), true);
  // A blocked number is spam even from a contact, and with the filter off.
  assert.equal(isSpam(sms('+306900000001', 'hello', 10), data({ spam: false }), ['00306900000001'], true), true);
});

test('each conversation shows in one folder: the Trash first, then Spam, then the Archive, else the list', () => {
  const order = data({
    trash: [{ address: '+306911111111', upTo: 100, at: 100 }],
    archived: [
      { address: '+306922222222', at: 100 },
      { address: '+306933333333', at: 100 },
    ],
    marks: [{ number: '+306944444444', spam: true, at: 1 }],
  });
  const threads = [
    sms('+306911111111', 'in the Trash', 90),
    sms('+306922222222', 'archived', 90),
    // A message from them after it was archived brings it back to the list; one of ours does not.
    sms('+306933333333', 'came after', 120),
    sms('+306944444444', 'marked', 90),
    sms('+306955555555', 'plain', 90),
  ];
  const sorted = sortSms(threads, order, [], () => false);
  assert.deepEqual(sorted.trash.map((s) => s.text), ['in the Trash']);
  assert.deepEqual(sorted.archived.map((s) => s.text), ['archived']);
  assert.deepEqual(sorted.spam.map((s) => s.text), ['marked']);
  assert.deepEqual(sorted.list.map((s) => s.text), ['came after', 'plain']);
  assert.deepEqual(sorted.back, ['+306933333333']);
  assert.equal(smsFolder(sms('+306922222222', 'mine', 120, { mine: true }), order, [], false), 'archived');
  // A message after it went to the Trash shows the conversation again, without what came before.
  assert.equal(smsFolder(sms('+306911111111', 'new', 120), order, [], false), 'list');
  const messages = [{ at: 50 }, { at: 100 }, { at: 120 }];
  assert.deepEqual(shownMessages(messages, order.trash[0]), [{ at: 120 }]);
  assert.deepEqual(shownMessages(messages, null), messages);
});

test('pinned SMS conversations come first, in the list\'s order, and a draft shows in its row', () => {
  const rows = [row('contact:aa', '', 50), row('sms:1', '+306911111111', 40), row('sms:2', '+306922222222', 30), row('sms:3', '+306933333333', 20)];
  const arranged = arrangeRows(rows, [{ address: '6933333333', at: 1 }, { address: '+306922222222', at: 2 }], [{ address: '+306911111111', text: 'half written', at: 1 }]);
  assert.deepEqual(arranged.map((r) => r.identity), ['sms:2', 'sms:3', 'contact:aa', 'sms:1']);
  assert.deepEqual(arranged.map((r) => r.pinned ?? false), [true, true, false, false]);
  assert.equal(arranged[3].draft, 'half written');
  assert.equal(arranged[2], rows[0]);
  // The list kept for when Erevos opens keeps the pins, not the drafts nor the contacts' pictures.
  const cached = kept([{ ...arranged[3], photo: 'content://com.android.contacts/1/photo' }, arranged[0]]);
  assert.equal(cached.rows[0].draft, undefined);
  assert.equal(cached.rows[0].photo, undefined);
  assert.equal(cached.rows[1].pinned, true);
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

test('pins, the Archive, the Trash, drafts and spam rules are kept sealed in the space, and only there', async () => {
  files.clear();
  const key = randomBytes(32);
  const link = await SmsLink.open(0, key);
  assert.equal(link.undo, 5);
  assert.equal(await link.pin('+306911111111', true), true);
  await link.archive('+306922222222', true, 100);
  await link.setDraft('+306933333333', 'see you at eight');
  await link.markSpam('+306944444444', true);
  assert.equal(await link.addSpamWord('  free   gift '), true);
  await link.setSpamLinks(true);
  await link.setUndo(10);

  const again = await SmsLink.open(0, key);
  assert.deepEqual(again.state.pinned.map((p) => p.address), ['+306911111111']);
  assert.deepEqual(again.state.archived, [{ address: '+306922222222', at: 100 }]);
  assert.equal(again.draftFor('6933333333'), 'see you at eight');
  assert.deepEqual(again.state.marks.map((m) => [m.number, m.spam]), [['+306944444444', true]]);
  assert.deepEqual(again.state.spamWords, ['free gift']);
  assert.equal(again.state.spamLinks, true);
  assert.equal(again.undo, 10);
  // Nothing of it shows in the phone's files, and another space's key opens none of it.
  const written = [...files.values()].join('\n');
  assert.doesNotMatch(written, /6911111111|6922222222|see you|free gift/);
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
  // Nothing typed forgets the draft; the owner's word on a number can be left to the filter again.
  await again.setDraft('+306933333333', '   ');
  await again.markSpam('6944444444', null);
  await again.setUndo(7);
  const last = await SmsLink.open(0, key);
  assert.equal(last.draftFor('+306933333333'), '');
  assert.deepEqual(last.state.marks, []);
  assert.equal(last.undo, 10);
});

test('the order an Erevos before kept beside the SMS for later moves to a file of its own, and they stay', async () => {
  files.clear();
  const key = randomBytes(32);
  const before = sealedFile<SmsData>({ name: 'erevos-sms', empty: EMPTY_SMS, checked: (value) => value as SmsData, block: 4096 });
  const later = { id: 'a1', to: '+306922222222', text: 'at eight', at: 5, sim: -1 };
  await before.save('space', 0, key, { ...EMPTY_SMS, pinned: [{ address: '+306911111111', at: 1 }], undo: 10, later: [later] });

  const link = await SmsLink.open(0, key);
  assert.deepEqual(link.state.pinned.map((p) => p.address), ['+306911111111']);
  assert.equal(link.undo, 10);
  await link.pin('+306933333333', true);
  const again = await SmsLink.open(0, key);
  assert.deepEqual(again.state.pinned.map((p) => p.address), ['+306911111111', '+306933333333']);
  assert.equal(again.undo, 10);
  assert.deepEqual(again.later, [later]);
  // The SMS file keeps the rest, and no order now.
  const left = await before.load('space', 0, key);
  assert.deepEqual([left.pinned, left.undo, left.later], [[], 5, [later]]);
});

test('pins, the Trash and the owner\'s words have their limits, and none is dropped for a new one', async () => {
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
  assert.equal(await link.addSpamWord('x'.repeat(41)), false);
  assert.equal(await link.addSpamWord('   '), false);
  for (let i = 0; i < MAX_WORDS; i++) assert.equal(await link.addSpamWord(`word ${i}`), true);
  assert.equal(await link.addSpamWord('WORD 1'), true);
  assert.equal(await link.addSpamWord('one more'), false);
  assert.equal(link.state.spamWords.length, MAX_WORDS);
});

test('what is held goes at its time, or at once when flushed, unless it was taken back', async () => {
  const held = new Held<{ id: string; text: string }>();
  const done: string[] = [];
  let changes = 0;
  const stop = held.onChange(() => changes++);
  held.hold({ id: 'a', text: 'first' }, 5, (item) => done.push(item.text));
  held.hold({ id: 'b', text: 'second' }, 60_000, (item) => done.push(item.text));
  held.hold({ id: 'c', text: 'third' }, 60_000, (item) => done.push(item.text));
  assert.deepEqual(held.list().map((w) => w.item.id), ['a', 'b', 'c']);
  assert.equal(held.take('b')?.text, 'second');
  assert.equal(held.take('b'), null);
  await new Promise((resolve) => setTimeout(resolve, 30));
  assert.deepEqual(done, ['first']);
  held.flush();
  assert.deepEqual(done, ['first', 'third']);
  assert.deepEqual(held.list(), []);
  stop();
  assert.equal(changes, 6);
});

test('a message passed on waits for its own conversation, a minute at most, and is read once', async () => {
  forwardTo('+306911111111', { text: 'pass it on', photo: null }, 1000);
  assert.equal(forwardedTo('+306922222222', undefined, 1000), null);
  assert.equal(forwardedTo('+306911111111', undefined, 61_000), null);
  // Read twice in the same moment, as a screen drawn twice reads it, then gone.
  assert.equal(forwardedTo('+306911111111', undefined, 2000)?.text, 'pass it on');
  assert.equal(forwardedTo('+306911111111', undefined, 2000)?.text, 'pass it on');
  await Promise.resolve();
  assert.equal(forwardedTo('+306911111111', undefined, 2000), null);
  forwardTo('contact:aa', { text: 'into a chat', photo: null });
  assert.equal(forwardedTo('contact:aa')?.text, 'into a chat');
});

test('the phone\'s SMS in a backup say how many they are, and other bytes say nothing', () => {
  const head = new TextEncoder().encode('EREVOS SMS 1\n');
  const bytes = new Uint8Array(head.length + 12 + 4);
  bytes.set(head);
  const counts = new DataView(bytes.buffer, head.length, 12);
  counts.setUint32(0, 1234);
  counts.setUint32(4, 56);
  counts.setUint32(8, 7);
  assert.deepEqual(smsCounts(bytes), { sms: 1234, mms: 56, left: 7 });
  assert.equal(smsCounts(bytes.subarray(0, 10)), null);
  assert.equal(smsCounts(new TextEncoder().encode('EREVOS BACKUP 1\n0123456789ab')), null);
});

test('an SMS that says it holds a code gives its digits, and no number of another kind', () => {
  const cases: [string, string | null][] = [
    ['Ο κωδικός σας είναι 482910. Μην τον δώσετε σε κανέναν.', '482910'],
    ['G-123456 is your Google verification code.', '123456'],
    ['Your code: 123 456', '123456'],
    ['Your OTP is 7788-1122 for the amount of €1500.00', '77881122'],
    ['Κωδικός μιας χρήσης 123456 για αγορά 45,20 EUR στις 12:30 23/10/2026', '123456'],
    ['Your PIN 1234', '1234'],
    ['Dein Bestätigungscode lautet 552211', '552211'],
    ['Tu código es 9087', '9087'],
    ['Kod za prijavu: 445566', '445566'],
    // The nearest to the words that say it, not a reference joined to letters.
    ['Ref A12345, code 998877', '998877'],
    // A phone number, an amount, a time or a date is no code; nor digits without the words.
    ['Call me at +30 691 234 5678 about the code', null],
    ['The code costs 1.500,00 and starts 12:30 on 23/10/2026', null],
    ['Meeting at 1500 tomorrow', null],
    ['shopping list 1234', null],
    ['Your code is 123', null],
    ['Your code is 123456789', null],
  ];
  for (const [text, code] of cases) assert.equal(oneTimeCode(text), code, text);
});
