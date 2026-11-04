// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// The recipient of a new SMS, picked from the contacts (lib/sms-recipient.ts).
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { recipientRows, typedPart, withRecipient } from '../lib/sms-recipient';

const card = (key: string, name: string, phones: string[]) =>
  ({ key, name, phones: phones.map((value) => ({ kind: 'mobile', label: '', value })), emails: [], addresses: [], given: '', family: '', company: '', title: '', note: '', birthday: '' }) as unknown as Parameters<typeof recipientRows>[0][number];

test('the part being typed is the one after the last comma', () => {
  assert.equal(typedPart('+30 691, Ma'), 'Ma');
  assert.equal(typedPart(''), '');
  assert.equal(typedPart('+30 691, '), '');
});

test('a picked number replaces the typed part or joins the list, once', () => {
  assert.equal(withRecipient('+30691, Ma', '+30692', true), '+30691, +30692');
  assert.equal(withRecipient('+30691', '+30692', false), '+30691, +30692');
  assert.equal(withRecipient('+30691', '+30 691', false), '+30691');
  assert.equal(withRecipient('', '+30692', false), '+30692');
});

test('contacts are found by name without accents, or by number; all of them with no query', () => {
  const cards = [card('a', 'Μαρία Παπά', ['+30 691 000 0001', '+30 210 000 0002']), card('b', 'José', ['+34 600 111 222']), card('c', 'No number', [])];
  assert.deepEqual(recipientRows(cards, 'μαρια').map((r) => r.number), ['+30 691 000 0001', '+30 210 000 0002']);
  assert.deepEqual(recipientRows(cards, 'jose').map((r) => r.name), ['José']);
  assert.deepEqual(recipientRows(cards, '600111').map((r) => r.name), ['José']);
  assert.equal(recipientRows(cards, '').length, 3);
});
