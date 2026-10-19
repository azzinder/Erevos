// The app's words in Greek (lib/i18n.ts, i18n/el/): every English word the code shows has its
// Greek, with the same {names} in it.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

import { app } from '../i18n/el/app';
import { chat } from '../i18n/el/chat';
import { EL } from '../i18n/el/index';
import { parts } from '../i18n/el/parts';
import { screens } from '../i18n/el/screens';
import { settings } from '../i18n/el/settings';
import { t, plural, setLang } from '../lib/i18n';

const ROOT = join(import.meta.dirname, '..');
const DIRS = ['app', 'components', 'lib', 'lock', 'theme', 'guide'];

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return files(path);
    return /\.tsx?$/.test(name) ? [path] : [];
  });
}

// A JS string literal: '…', "…" or `…` without ${}.
const LITERAL = String.raw`('(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|\`(?:[^\`\\$]|\\.)*\`)`;
const CALLS = [
  new RegExp(String.raw`\b(?:t|mark)\(\s*` + LITERAL, 'g'),
  new RegExp(String.raw`\bplural\(\s*[^,]+,\s*` + LITERAL + String.raw`\s*,\s*` + LITERAL, 'g'),
];

function unquote(literal: string): string {
  if (literal.startsWith('`')) return literal.slice(1, -1).replace(/\\`/g, '`');
  return JSON.parse(literal.startsWith("'") ? `"${literal.slice(1, -1).replace(/\\'/g, "'").replace(/"/g, '\\"')}"` : literal);
}

function englishInCode(): Map<string, string> {
  const found = new Map<string, string>();
  for (const dir of DIRS) {
    // lib/i18n.ts itself only shows how t is called.
    for (const path of files(join(ROOT, dir)).filter((p) => !p.endsWith(join('lib', 'i18n.ts')))) {
      const source = readFileSync(path, 'utf8');
      for (const pattern of CALLS) {
        for (const match of source.matchAll(pattern)) {
          for (const literal of match.slice(1)) if (literal) found.set(unquote(literal), path.slice(ROOT.length + 1));
        }
      }
    }
  }
  return found;
}

const names = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

test('every English word the app shows has its Greek', () => {
  const missing = [...englishInCode()].filter(([english]) => !(english in EL)).map(([english, path]) => `${path}: ${english}`);
  assert.deepEqual(missing, []);
});

test('the Greek keeps the {names} of the English', () => {
  const wrong = Object.entries(EL).filter(([en, el]) => names(en).join() !== names(el).join()).map(([en]) => en);
  assert.deepEqual(wrong, []);
});

test('no Greek word is left that the app no longer shows', () => {
  const used = englishInCode();
  assert.deepEqual(Object.keys(EL).filter((english) => !used.has(english)), []);
});

test('each English word has its Greek in one file only', () => {
  // Otherwise the later file wins, unseen, in EL.
  const lists = [app, chat, screens, settings, parts];
  const twice = Object.keys(EL).filter((english) => lists.filter((list) => english in list).length > 1);
  assert.deepEqual(twice, []);
});

test('t shows the chosen language and fills in the names', async () => {
  await setLang('en');
  assert.equal(t('Language'), 'Language');
  assert.equal(plural(2, '{n} chat', '{n} chats'), '2 chats');
  await setLang('el');
  assert.equal(t('Language'), 'Γλώσσα');
  assert.equal(t('Not translated {x}', { x: 1 }), 'Not translated 1');
  await setLang('en');
});
