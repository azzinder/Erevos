// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// The app's words in the languages besides English and Greek (lib/i18n.ts, i18n/<lang>/): each
// keeps the {names} of the English, holds no word the app no longer shows, and has each word in
// one part file only. A word one of them does not have yet shows in English and fails nothing
// here: the check counts them, and `npm run i18n-missing` lists them by the file they go in.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

import { FORM_SPLIT, formsOf, LANG_LABELS, LANGS, langOf, phoneWrites, plural, setLang, t, words } from '../lib/i18n';

import { englishInCode, names, partsOf, pluralsInCode, ROOT, saidInCode } from './words';

// Greek has every word (checks/i18n.check.ts); these may still miss some.
const OTHERS = LANGS.filter((l) => l !== 'en' && l !== 'el');

test('each language is listed by its own name, and has a folder of its words', () => {
  assert.deepEqual(Object.keys(LANG_LABELS).sort(), [...LANGS].sort());
  assert.equal(new Set(LANGS).size, LANGS.length);
  for (const l of OTHERS) assert.ok(existsSync(join(ROOT, 'i18n', l, 'index.ts')), l);
});

// Each {name} once: a language may say one twice, where its sentence needs it.
const named = (text: string) => [...new Set(names(text))].join();

for (const l of OTHERS) {
  const name = `${LANG_LABELS[l]} (i18n/${l}/)`;

  test(`${name} keeps the {names} of the English`, () => {
    const wrong = Object.entries(words(l)).filter(([en, shown]) => named(en) !== named(shown)).map(([en]) => en);
    assert.deepEqual(wrong, []);
  });

  test(`${name} has no word left that the app no longer shows`, () => {
    const used = englishInCode();
    assert.deepEqual(Object.keys(words(l)).filter((english) => !used.has(english)), []);
  });

  test(`${name} has each word in one file only, and every file in its index`, async () => {
    const parts = await partsOf(l);
    const greek = await partsOf('el');
    // The same files as the Greek, so a word goes in the same part in every language.
    assert.deepEqual([...parts.keys()].filter((part) => !greek.has(part)), []);
    const lists = [...parts.values()];
    const all = new Set(lists.flatMap((list) => Object.keys(list)));
    assert.deepEqual([...all].filter((english) => lists.filter((list) => english in list).length > 1), []);
    // A part file left out of the index would show in English, unseen.
    const merged = words(l);
    assert.deepEqual([...all].filter((english) => !(english in merged)), []);
    assert.equal(Object.keys(merged).length, all.size);
  });

  test(`${name} has the forms it counts with in the words of each count, and nowhere else`, () => {
    const all = words(l);
    const counts = pluralsInCode();
    // plural()'s second form: as many forms as the language counts with, each with the {names}.
    const wrong = [...counts.keys()].filter((many) => {
      if (!(many in all)) return false;
      const forms = all[many].split(FORM_SPLIT);
      return forms.length !== formsOf(l) || forms.some((form) => form.trim() === '' || named(form) !== named(many));
    });
    assert.deepEqual(wrong, []);
    const split = Object.keys(all).filter((english) => !counts.has(english) && all[english].includes(FORM_SPLIT));
    assert.deepEqual(split, []);
  });

  test(`${name} shows in English a word it does not have yet`, async (context) => {
    const merged = words(l);
    const missing = [...englishInCode().keys()].filter((english) => !(english in merged));
    context.diagnostic(`${LANG_LABELS[l]}: ${missing.length} English words not there yet; npm run i18n-missing ${l} lists them.`);
    await setLang(l);
    for (const english of missing) assert.equal(t(english), english);
    assert.equal(t('Not translated {x}', { x: 1 }), 'Not translated 1');
    await setLang('en');
  });
}

test("a count's words are shown by plural() alone", () => {
  // A language of three forms holds them all in these words (lib/i18n.ts): t() would show all three.
  const counts = pluralsInCode();
  const ones = new Set(counts.values());
  const said = saidInCode();
  assert.deepEqual([...counts.keys()].filter((many) => said.has(many) || ones.has(many)), []);
});

test('the first start follows the phone, where Erevos has its language', () => {
  assert.equal(langOf('el-GR'), 'el');
  assert.equal(langOf('de-AT'), 'de');
  assert.equal(langOf('de'), 'de');
  assert.equal(langOf('fr-CA'), 'fr');
  assert.equal(langOf('es-MX'), 'es');
  assert.equal(langOf('it_CH'), 'it');
  assert.equal(langOf('pt-PT'), 'pt');
  // Serbian, Croatian, Bosnian and Montenegrin, in either script: Serbo-Croatian.
  for (const phone of ['sr-RS', 'sr-Latn-RS', 'sr-Cyrl-BA', 'sr_ME', 'hr-HR', 'hr', 'bs-BA', 'bs-Cyrl-BA', 'cnr-ME', 'sh']) {
    assert.equal(langOf(phone), 'sh', phone);
  }
  assert.equal(langOf('sl-SI'), 'en');
  assert.equal(langOf('en-US'), 'en');
  assert.equal(langOf('nl-NL'), 'en');
  assert.equal(langOf(''), 'en');
});

test('plural takes the form each language counts with, then its words', async () => {
  const chats = (n: number) => plural(n, '{n} chat', '{n} chats');
  await setLang('en');
  assert.deepEqual([chats(0), chats(1), chats(2)], ['0 chats', '1 chat', '2 chats']);
  await setLang('de');
  assert.deepEqual([chats(0), chats(1), chats(2)], ['0 Chats', '1 Chat', '2 Chats']);
  await setLang('es');
  assert.deepEqual([chats(0), chats(1), chats(2)], ['0 chats', '1 chat', '2 chats']);
  await setLang('fr');
  assert.deepEqual([chats(0), chats(1), chats(2)], ['0 discussion', '1 discussion', '2 discussions']);
  await setLang('it');
  assert.deepEqual([chats(0), chats(1), chats(2)], ['0 chat', '1 chat', '2 chat']);
  await setLang('pt');
  assert.deepEqual([chats(0), chats(1), chats(2)], ['0 conversa', '1 conversa', '2 conversas']);
  await setLang('sh');
  assert.deepEqual([chats(0), chats(1), chats(2)], ['0 razgovora', '1 razgovor', '2 razgovora']);
  await setLang('en');
});

test('Serbo-Croatian counts with three forms, by how the count ends', async () => {
  const COUNTS = [1, 2, 4, 5, 11, 12, 14, 21, 22, 25, 101, 111, 0];
  await setLang('sh');
  const contacts = (n: number) => plural(n, '{n} contact', '{n} contacts');
  assert.deepEqual(
    COUNTS.map(contacts),
    ['1 kontakt', '2 kontakta', '4 kontakta', '5 kontakata', '11 kontakata', '12 kontakata', '14 kontakata', '21 kontakt', '22 kontakta', '25 kontakata', '101 kontakt', '111 kontakata', '0 kontakata'],
  );
  // 1 alone takes the first form's words, here without its count; 21 and 101 the first of the three.
  const calls = (n: number) => plural(n, 'Delete this call', 'Delete these {n} calls');
  assert.deepEqual(
    COUNTS.map(calls),
    [
      'Obriši ovaj poziv',
      'Obriši ova 2 poziva',
      'Obriši ova 4 poziva',
      'Obriši ovih 5 poziva',
      'Obriši ovih 11 poziva',
      'Obriši ovih 12 poziva',
      'Obriši ovih 14 poziva',
      'Obriši ovaj 21 poziv',
      'Obriši ova 22 poziva',
      'Obriši ovih 25 poziva',
      'Obriši ovaj 101 poziv',
      'Obriši ovih 111 poziva',
      'Obriši ovih 0 poziva',
    ],
  );
  // The other names are filled in every form, and a count's words not there yet show in English.
  assert.equal(plural(22, '{n} contact', '{n} contacts', { n: 22 }), '22 kontakta');
  assert.equal(plural(3, '{n} thing not there', '{n} things not there'), '3 things not there');
  assert.equal(plural(1, '{n} thing not there', '{n} things not there'), '1 thing not there');
  assert.equal(t('Language'), 'Jezik');
  await setLang('en');
  assert.deepEqual(COUNTS.map(contacts).slice(0, 3), ['1 contact', '2 contacts', '4 contacts']);
});

test('Serbo-Croatian writes dates as the phone does only where the phone writes in Latin letters', () => {
  for (const phone of ['hr-HR', 'hr', 'bs-BA', 'bs-Latn-BA', 'sr-Latn-RS', 'sr_Latn_ME']) assert.ok(phoneWrites(phone, 'sh'), phone);
  // Else as LOCALES has it, bs-BA.
  for (const phone of ['sr-RS', 'sr-Cyrl-RS', 'sr', 'bs-Cyrl-BA', 'cnr-ME', 'sh', 'de-DE', 'en-US']) assert.ok(!phoneWrites(phone, 'sh'), phone);
  assert.ok(phoneWrites('de-AT', 'de'));
  assert.ok(!phoneWrites('hr-HR', 'de'));
});
