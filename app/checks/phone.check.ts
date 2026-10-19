// The Phone screen's numbers (lib/phone.ts) and the SIM kept for each (lib/phone-sims.ts). The
// calls themselves are Android's, in modules/erevos-phone, and can only be tried on a phone.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { randomBytes } from '../lib/crypto';
import { callLength, dialNumber, KEYS, knownNames, typeKey } from '../lib/phone';
import { accountLabel, callAccount, PhoneSims } from '../lib/phone-sims';
import type { PhoneAccount } from '../modules/erevos-phone';
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
  assert.ok(![...files.values()].some((v) => v.includes('8930') || v.includes('691')));
  assert.equal((await PhoneSims.open(0, randomBytes(32))).accountFor('6911111111'), '');
  assert.equal((await PhoneSims.open(1, key)).accountFor('6911111111'), '');
});
