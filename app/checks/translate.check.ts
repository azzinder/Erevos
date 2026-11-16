// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// Translating a message (lib/translate-ways.ts): the language guessed, the language it goes into,
// the models each way takes (through English when neither is), and the app's models the same as
// the core's (crates/erevos-speech TRANSLATIONS).

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { intoFor, LANGUAGES, languageOf, MODELS, steps } from '../lib/translate-ways';

test('the language of a message is guessed by its letters and its commonest words', () => {
  assert.equal(languageOf('Καλημέρα, τι κάνεις;'), 'el');
  assert.equal(languageOf('OK, θα έρθω στις 8'), 'el');
  assert.equal(languageOf('Good morning, how are you?'), 'en');
  assert.equal(languageOf('Vergiss nicht, Brot und Milch zu holen.'), 'de');
  assert.equal(languageOf('Grüß dich'), 'de');
  assert.equal(languageOf('No olvides comprar pan y leche.'), 'es');
  assert.equal(languageOf('¿Qué tal?'), 'es');
  assert.equal(languageOf("N'oubliez pas de prendre du pain et du lait."), 'fr');
  assert.equal(languageOf('Non dimenticate di prendere pane e latte.'), 'it');
  // Too little to tell by: English, the commonest.
  assert.equal(languageOf('ok'), 'en');
  assert.equal(languageOf('👍 12:30'), null);
  assert.equal(languageOf('a'), null);
});

test('a message goes into the app language, or English when the app speaks one not translated', () => {
  assert.equal(intoFor('el'), 'el');
  assert.equal(intoFor('it'), 'it');
  assert.equal(intoFor('pt'), 'en');
  assert.equal(intoFor('sh'), 'en');
});

test('each way between two languages takes one model with English, otherwise two through English', () => {
  for (const a of LANGUAGES) {
    for (const b of LANGUAGES) {
      const way = steps(a, b);
      if (a === b) assert.deepEqual(way, []);
      else if (a === 'en' || b === 'en') assert.deepEqual(way.map((m) => [m.from, m.to]), [[a, b]]);
      else assert.deepEqual(way.map((m) => [m.from, m.to]), [[a, 'en'], ['en', b]]);
    }
  }
});

test('the app downloads the models the core checks, each its own file', () => {
  const core = readFileSync(new URL('../../crates/erevos-speech/src/lib.rs', import.meta.url), 'utf8');
  const listed = [...core.matchAll(/\(\s*"([a-z]+)",\s*"([a-z]+)",\s*"[0-9a-f]{64}",?\s*\)/g)].map((m) => `${m[1]}-${m[2]}`);
  assert.deepEqual(MODELS.map((m) => `${m.from}-${m.to}`).sort(), listed.sort());
  assert.equal(new Set(MODELS.map((m) => m.file)).size, MODELS.length);
  for (const m of MODELS) assert.ok(m.file === `erevos-opus-${m.from}-${m.to}-q8.gguf` && m.bytes > 1_000_000);
});
