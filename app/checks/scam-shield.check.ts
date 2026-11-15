// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { looksLike, scamSigns } from '../lib/scam-shield';

test('a request that asks for a code, money or promises easy gain is told, in every language', () => {
  assert.deepEqual(scamSigns(['Hi! Send me the code you got by SMS, it was sent to you by mistake'], 'Ann', []), ['code']);
  assert.deepEqual(scamSigns(['Γεια, στείλε μου τον κωδικό που σου ήρθε'], 'Άννα', []), ['code']);
  assert.deepEqual(scamSigns(['Mamá, se me rompió el móvil. Transfiere me dinero hoy, es urgente'], 'x', []), ['money']);
  assert.deepEqual(scamSigns(['Buy me a gift card please'], 'x', []), ['money']);
  assert.deepEqual(scamSigns(['Guaranteed profit with crypto trading, double your money'], 'x', []), ['gain']);
  assert.deepEqual(scamSigns(['Κέρδισες! Εγγυημένο κέρδος'], 'x', []), ['gain']);
  assert.deepEqual(scamSigns(['Du hast gewonnen! Schick mir Geld für die Gebühr'], 'x', []), ['money', 'gain']);
});

test('an ordinary first message says nothing', () => {
  for (const text of ['Hi, it is Maria from the choir, we met on Sunday', 'Καλησπέρα, είμαι ο Νίκος από το γραφείο', 'Can you review my code tomorrow?', 'Where shall we meet?'])
    assert.deepEqual(scamSigns([text], 'Maria', ['Nikos', 'Eleni']), [], text);
});

test('a name like a contact’s is told: the same, one letter off, or other letters that look alike', () => {
  assert.equal(looksLike('Eleni', ['Eleni']), true);
  assert.equal(looksLike('eleni ', ['Eleni']), true);
  assert.equal(looksLike('Elenl', ['Eleni']), true, 'one letter off');
  assert.equal(looksLike('Εlenі', ['Eleni']), true, 'a Greek Ε and a Cyrillic і');
  assert.equal(looksLike('Elena', ['Eleni', 'Bob']), true);
  assert.equal(looksLike('Bo', ['Bob']), false, 'too short to tell');
  assert.equal(looksLike('Nikos', ['Eleni']), false);
  assert.deepEqual(scamSigns(['hello'], 'Mom', ['Mom']), ['name']);
});
