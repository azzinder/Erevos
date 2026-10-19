// The Phone screen's numbers (lib/phone.ts). The calls themselves are Android's, in
// modules/erevos-phone, and can only be tried on a phone.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { callLength, dialNumber, KEYS, typeKey } from '../lib/phone';

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
