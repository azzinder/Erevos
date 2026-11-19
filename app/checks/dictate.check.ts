// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// Where dictated words go in the message field (lib/dictate.ts).
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { withDictated } from '../lib/dictate';

test('dictated words go after what was typed, one space between', () => {
  assert.equal(withDictated('', 'Καλημέρα', 100), 'Καλημέρα');
  assert.equal(withDictated('Γεια', 'τι κάνεις', 100), 'Γεια τι κάνεις');
  assert.equal(withDictated('Γεια  \n', ' τι κάνεις ', 100), 'Γεια τι κάνεις');
});

test('nothing heard leaves the field as it was, and the field length holds', () => {
  assert.equal(withDictated('Γεια ', '  ', 100), 'Γεια ');
  assert.equal(withDictated('abc', 'defgh', 6), 'abc de');
});
