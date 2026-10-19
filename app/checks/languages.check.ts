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

import { LANG_LABELS, LANGS, langOf, plural, setLang, t, words } from '../lib/i18n';

import { englishInCode, names, partsOf, ROOT } from './words';

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

test('the first start follows the phone, where Erevos has its language', () => {
  assert.equal(langOf('el-GR'), 'el');
  assert.equal(langOf('de-AT'), 'de');
  assert.equal(langOf('de'), 'de');
  assert.equal(langOf('fr-CA'), 'fr');
  assert.equal(langOf('es-MX'), 'es');
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
  await setLang('en');
});
