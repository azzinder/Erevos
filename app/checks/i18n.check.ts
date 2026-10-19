// The app's words in Greek (lib/i18n.ts, i18n/el/): every English word the code shows has its
// Greek, with the same {names} in it.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { app } from '../i18n/el/app';
import { chat } from '../i18n/el/chat';
import { EL } from '../i18n/el/index';
import { parts } from '../i18n/el/parts';
import { screens } from '../i18n/el/screens';
import { settings } from '../i18n/el/settings';
import { phone } from '../i18n/el/phone';
import { messages } from '../i18n/el/messages';
import { smsTools } from '../i18n/el/sms-tools';
import { more } from '../i18n/el/more';
import { groups } from '../i18n/el/groups';
import { devices } from '../i18n/el/devices';
import { publicGroups } from '../i18n/el/public-groups';
import { t, plural, setLang } from '../lib/i18n';

import { englishInCode, names } from './words';

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
  const lists = [app, chat, screens, settings, parts, phone, messages, smsTools, more, groups, devices, publicGroups];
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
