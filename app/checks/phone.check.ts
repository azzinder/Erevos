// The Phone screen's numbers (lib/phone.ts), the SIM kept for each (lib/phone-sims.ts) and the
// call history (lib/phone-log.ts). The calls themselves are Android's, in modules/erevos-phone,
// and can only be tried on a phone.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { randomBytes } from '../lib/crypto';
import { callLength, cleanReplies, dialNumber, KEYS, knownNames, MAX_REPLIES, MAX_REPLY, typeKey } from '../lib/phone';
import { callKind, callMarks, callWho, filterCalls, groupCalls, withDays } from '../lib/phone-log';
import { accountLabel, callAccount, PhoneSims } from '../lib/phone-sims';
import type { LoggedCall, PhoneAccount } from '../modules/erevos-phone';
import { files } from './files-memory';

test('what is typed or pasted keeps only what can be called', () => {
  assert.equal(dialNumber('+30 (210) 123-4567'), '+302101234567');
  assert.equal(dialNumber('  0030 69 1234 5678 '), '00306912345678');
  // A + only at the start; the tones of an extension after a pause stay.
  assert.equal(dialNumber('12+34'), '1234');
  assert.equal(dialNumber('+3021+00'), '+302100');
  assert.equal(dialNumber('210 1234567,,42#'), '2101234567,,42#');
  assert.equal(dialNumber('*21#'), '*21#');
  assert.equal(dialNumber('tel:abc'), '');
});

test('the keypad types its keys, and a + only first', () => {
  assert.deepEqual(KEYS.flat(), ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#']);
  assert.equal(typeKey('', '+'), '+');
  assert.equal(typeKey('+', '3'), '+3');
  assert.equal(typeKey('69', '+'), '69');
  assert.equal(typeKey('69', '#'), '69#');
});

test('quick replies are kept on one line each, none empty or twice, six at most', () => {
  assert.deepEqual(cleanReplies(['  On my way. ', '', 'Call\nme  later', 'On my way.']), ['On my way.', 'Call me later']);
  assert.equal(cleanReplies(['x'.repeat(400)])[0].length, MAX_REPLY);
  assert.equal(cleanReplies(['1', '2', '3', '4', '5', '6', '7']).length, MAX_REPLIES);
  assert.deepEqual(cleanReplies([' ', '\n']), []);
});

test('how long a call lasted reads as a clock', () => {
  assert.equal(callLength(0), '0:00');
  assert.equal(callLength(42), '0:42');
  assert.equal(callLength(725), '12:05');
  assert.equal(callLength(3723), '1:02:03');
  assert.equal(callLength(-5), '0:00');
});

test('the call screen knows the names of the contacts linked to a number, not of a request', () => {
  assert.deepEqual(
    knownNames([
      { name: ' Maria ', phone: '+306911111111', request: false },
      { name: 'Nikos', phone: '', request: false },
      { name: '', phone: '+306922222222', request: false },
      { name: 'Who', phone: '+306933333333', request: true },
    ]),
    { '+306911111111': 'Maria' },
  );
});

const sim = (id: string, slot: number, label = ''): PhoneAccount => ({ id, slot, label, name: `SIM ${slot + 1}` });

test('a call goes on the SIM kept for its number, else the owner chooses; with one SIM, the default', () => {
  const two = [sim('8930', 0, 'Cosmote'), sim('8931', 1, 'Vodafone')];
  assert.equal(callAccount([], ''), '');
  assert.equal(callAccount([sim('8930', 0)], ''), '');
  assert.equal(callAccount(two, '8931'), '8931');
  assert.equal(callAccount(two, ''), null);
  // A SIM taken out of the phone: chosen again.
  assert.equal(callAccount(two, '7777'), null);
  assert.equal(accountLabel(two[0]), 'SIM 1 · Cosmote');
  assert.equal(accountLabel(sim('8932', 1)), 'SIM 2');
});

test('the SIM chosen for a number is kept, sealed in the space, whichever way the number is written', async () => {
  files.clear();
  const key = randomBytes(32);
  const sims = await PhoneSims.open(0, key);
  assert.equal(sims.accountFor('+306911111111'), '');
  await sims.remember('+30 691 111 1111', '8931');
  await sims.remember('2101234567', '8930');
  const again = await PhoneSims.open(0, key);
  assert.equal(again.accountFor('6911111111'), '8931');
  assert.equal(again.accountFor('+302101234567'), '8930');
  await again.remember('6911111111', '8930');
  await again.remember('2101234567', '');
  const last = await PhoneSims.open(0, key);
  assert.equal(last.accountFor('+306911111111'), '8930');
  assert.equal(last.accountFor('2101234567'), '');
  // Nothing of it shows in the file, and another space's key, or another space, opens none of it.
  assert.ok(![...files.values()].some((v) => v.includes('6911111111') || v.includes('2101234567')));
  assert.equal((await PhoneSims.open(0, randomBytes(32))).accountFor('6911111111'), '');
  assert.equal((await PhoneSims.open(1, key)).accountFor('6911111111'), '');
});

let nextId = 1;
const logged = (call: Partial<LoggedCall>): LoggedCall => ({
  id: nextId++,
  number: '+306911111111',
  shown: '691 111 1111',
  name: '',
  photo: '',
  at: new Date(2026, 9, 19, 12).getTime(),
  duration: 0,
  type: 1,
  features: 0,
  account: '8930',
  presentation: 1,
  isNew: false,
  blocked: 0,
  ...call,
});

test('what each call in the history was, and its marks', () => {
  assert.deepEqual([1, 2, 3, 4, 5, 6, 7, 99].map(callKind), ['incoming', 'outgoing', 'missed', 'incoming', 'declined', 'blocked', 'incoming', 'incoming']);
  assert.deepEqual(callMarks(0), { wifi: false, hd: false });
  assert.deepEqual(callMarks(8 | 4 | 1), { wifi: true, hd: true });
  assert.deepEqual(callMarks(4), { wifi: false, hd: true });
  assert.equal(callWho(logged({ name: 'Maria' })), 'Maria');
  assert.equal(callWho(logged({})), '691 111 1111');
  assert.equal(callWho(logged({ number: '', presentation: 2 })), 'Private number');
  assert.equal(callWho(logged({ number: '', presentation: 3 })), 'Unknown number');
  assert.equal(callWho(logged({ number: '', presentation: 4 })), 'Payphone');
});

test('the filters keep missed, incoming (with the declined), outgoing or blocked calls, on one SIM or both', () => {
  const calls = [1, 2, 3, 5, 6, 7].map((type, i) => logged({ type, account: i % 2 ? '8931' : '8930' }));
  const types = (kept: LoggedCall[]) => kept.map((c) => c.type);
  assert.deepEqual(types(filterCalls(calls, 'all')), [1, 2, 3, 5, 6, 7]);
  assert.deepEqual(types(filterCalls(calls, 'missed')), [3]);
  assert.deepEqual(types(filterCalls(calls, 'incoming')), [1, 5, 7]);
  assert.deepEqual(types(filterCalls(calls, 'outgoing')), [2]);
  assert.deepEqual(types(filterCalls(calls, 'blocked')), [6]);
  assert.deepEqual(types(filterCalls(calls, 'all', '8931')), [2, 5, 7]);
  assert.deepEqual(types(filterCalls(calls, 'incoming', '8930')), [1]);
});

test('calls one after another with the same number, kind and day are one row, under their day', () => {
  const day = (d: number, h: number) => new Date(2026, 9, d, h).getTime();
  const calls = [
    logged({ type: 3, at: day(19, 12) }),
    logged({ type: 3, at: day(19, 11), number: '6911111111' }),
    logged({ type: 1, at: day(19, 10) }),
    logged({ type: 1, at: day(18, 22) }),
    logged({ type: 1, at: day(18, 21), number: '+302101234567' }),
    logged({ type: 3, at: day(18, 20), number: '', presentation: 2 }),
    logged({ type: 3, at: day(18, 19), number: '', presentation: 2 }),
    logged({ type: 2, at: day(12, 9) }),
  ];
  const rows = groupCalls(calls);
  assert.deepEqual(
    rows.map((r) => [r.kind, r.calls.length]),
    [['missed', 2], ['incoming', 1], ['incoming', 1], ['incoming', 1], ['missed', 2], ['outgoing', 1]],
  );
  const items = withDays(rows, day(19, 13));
  assert.deepEqual(
    items.map((i) => (i.kind === 'day' ? i.label : i.row.calls.length)),
    ['Today', 2, 1, 'Yesterday', 1, 1, 2, '12/10/26', 1],
  );
});
