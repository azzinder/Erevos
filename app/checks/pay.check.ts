// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// Payment requests (lib/pay.ts): as they come in a message and in a link, how their amount reads,
// the link back to Fasouli, and how a message carries them (lib/chat-parts.ts).
// Run with: npm run check
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { carriedOf, contentOf, editableWords, toCarry, acts } from '../lib/chat-parts';
import { linkHref, linkParts } from '../lib/open-link';
import { checkedPaid, checkedPay, fasouliPaidLink, handPay, payAmount, payLink, payOfLink, takePay } from '../lib/pay';

const rent = { a: 4500, d: 2, c: 'EUR', w: 'Rent', r: 'tx-17' };

test('a request is checked as it comes: a whole amount, a currency code, one line of what for', () => {
  assert.deepEqual(checkedPay(rent), rent);
  assert.deepEqual(checkedPay({ a: 1, d: 8, c: 'BTC', w: ' a‮\nb ', r: 'bad mark!' }), { a: 1, d: 8, c: 'BTC', w: 'a b' });
  assert.equal(checkedPay({ ...rent, w: 'x'.repeat(500) })!.w.length, 100);
  for (const bad of [{ ...rent, a: 0 }, { ...rent, a: 1.5 }, { ...rent, a: 1e16 }, { ...rent, a: '4500' }, { ...rent, d: 9 }, { ...rent, d: -1 }, { ...rent, c: 'eur' }, { ...rent, c: 'E' }, { ...rent, c: '€' }, null, 'pay']) {
    assert.equal(checkedPay(bad), null, JSON.stringify(bad));
  }
  assert.deepEqual(checkedPaid({ tag: '0123456789ab' }), { tag: '0123456789ab' });
  assert.equal(checkedPaid({ tag: 'nope' }), null);
});

test('a link asks for one, as Fasouli makes it, and reads back the same', () => {
  const href = linkHref(payLink(rent));
  const { path, params } = linkParts(href);
  assert.equal(path, '/pay');
  assert.deepEqual(payOfLink(params), rent);
  assert.deepEqual(payOfLink({ a: '250', c: 'usd', w: 'Coffee & cake' }), { a: 250, d: 2, c: 'USD', w: 'Coffee & cake' });
  assert.equal(payOfLink({ a: '-5', c: 'EUR' }), null);
  assert.equal(payOfLink({ a: '5' }), null);
  assert.equal(payOfLink({ a: ['5', '6'], c: 'EUR' }), null);
});

test('its amount reads in the language, with a code the language does not name too', () => {
  assert.equal(payAmount(rent, 'en-US'), '€45.00');
  assert.match(payAmount(rent, 'el-GR'), /^45,00\s€$/);
  assert.match(payAmount({ a: 125000, d: 8, c: 'BTC', w: '' }, 'en-US'), /^BTC\s0\.00125000$/);
  assert.equal(payAmount({ a: 5, d: 0, c: 'USDT', w: '' }, 'en-US'), '5 USDT');
});

test('only a request with Fasouli\'s mark links back to it', () => {
  assert.equal(fasouliPaidLink(rent), 'lphlchrima://paid?r=tx-17&a=4500&c=EUR');
  assert.equal(fasouliPaidLink({ ...rent, r: undefined }), null);
});

test('a message carries the request with its words, and that it was paid with none', () => {
  assert.deepEqual(carriedOf({ pay: rent }).pay, rent);
  assert.deepEqual(toCarry({ pay: rent }, true), { pay: rent });
  assert.deepEqual(toCarry({ pay: rent }, false), {});
  assert.deepEqual(toCarry({ settled: { tag: '0123456789ab' } }, false), { settled: { tag: '0123456789ab' } });
  assert.deepEqual(toCarry({ settled: { tag: '0123456789ab' } }, true), {});
  assert.equal(acts({ settled: { tag: '0123456789ab' } }), true);
  assert.deepEqual(contentOf({ pay: rent }), { pay: rent });
  assert.equal(carriedOf({ pay: { ...rent, a: -1 } }).pay, undefined);
  assert.equal(editableWords({ text: 'Payment request', pay: rent }), false);
});

test('a request handed to a chat goes to that chat only, once, while fresh', () => {
  handPay('contact:aa', rent, 0);
  assert.equal(takePay('contact:bb', 1), null);
  assert.deepEqual(takePay('contact:aa', 1), rent);
  assert.equal(takePay('contact:aa', 2), null);
  handPay('contact:aa', rent, 0);
  assert.equal(takePay('contact:aa', 61_000), null);
});
