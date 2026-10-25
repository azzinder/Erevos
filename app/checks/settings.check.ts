// The Settings screens' list (lib/settings.ts): every setting opens a screen that exists, each part
// one its screen knows, and what shows on a phone and elsewhere, and the search through it.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { test } from 'node:test';

import { setLang, t } from '../lib/i18n';
import { groupsHere, hasParts, itemsHere, searchSettings, SETTINGS, type SettingsLeaf, type SettingsPlace } from '../lib/settings';

const APP = join(import.meta.dirname, '..', 'app');

const PHONE: SettingsPlace = { web: false, webApp: false, push: false, background: true, checks: true, launcher: true, widget: true, sims: true };
const WEB_APP: SettingsPlace = { web: true, webApp: true, push: true, background: false, checks: true, launcher: false, widget: false, sims: false };
const DESKTOP: SettingsPlace = { web: true, webApp: false, push: false, background: false, checks: false, launcher: false, widget: false, sims: false };

const leaves = (): SettingsLeaf[] => SETTINGS.flatMap((group) => group.items.flatMap((item) => (hasParts(item) ? item.parts : [item])));

/** The parts a screen opens alone, from its PARTS. */
function partsOf(file: string): string[] {
  const source = readFileSync(file, 'utf8');
  const parts = source.slice(source.indexOf('const PARTS = {'), source.indexOf('};', source.indexOf('const PARTS = {')));
  return [...parts.matchAll(/^\s*(\w+): mark\(/gm), ...parts.matchAll(/[{,] (\w+): mark\(/g)].map((m) => m[1]);
}

test('every setting opens a screen that exists, each part one its screen knows', () => {
  for (const leaf of leaves()) {
    if (leaf.language) continue;
    const href = leaf.href ?? '';
    assert.ok(href.startsWith('/'), leaf.id);
    const [path, query] = href.slice(1).split('?');
    const file = [join(APP, `${path}.tsx`), join(APP, path, 'index.tsx'), join(APP, dirname(path), '[id].tsx')].find(existsSync);
    assert.ok(file, `${leaf.id}: ${href}`);
    // A section of the guide: one both guides have.
    if (path.startsWith('guide/')) for (const lang of ['en', 'el']) assert.ok(readFileSync(join(APP, '..', 'guide', `${lang}.ts`), 'utf8').includes(`{#${basename(path)}}`), `${leaf.id}: ${lang}`);
    const part = new URLSearchParams(query ?? '').get('part');
    if (part) assert.ok(partsOf(file).includes(part), `${leaf.id}: ${part} in ${path}`);
  }
});

test('the ids are unique where they are looked up', () => {
  const groups = SETTINGS.map((group) => group.id);
  assert.equal(new Set(groups).size, groups.length);
  for (const group of SETTINGS) {
    const items = group.items.map((item) => item.id);
    assert.equal(new Set(items).size, items.length, group.id);
  }
});

test('a phone shows every group; elsewhere, what needs a phone does not show', () => {
  assert.deepEqual(
    groupsHere(PHONE).map((group) => group.id),
    SETTINGS.map((group) => group.id),
  );
  const ids = (place: SettingsPlace) => groupsHere(place).flatMap((group) => itemsHere(group, place).map((item) => item.id));
  const desktop = ids(DESKTOP);
  for (const gone of ['tor', 'nostr', 'lora', 'radio-test', 'permissions', 'browser-permissions', 'icons', 'widget', 'phone', 'sms', 'web-app', 'screenshots']) assert.ok(!desktop.includes(gone), gone);
  // The desktop app has no notices of its own to set: the group goes.
  assert.ok(!groupsHere(DESKTOP).some((group) => group.id === 'notices' || group.id === 'phone'));
  const web = ids(WEB_APP);
  for (const shown of ['push', 'web-app', 'browser-permissions', 'relay', 'backups']) assert.ok(web.includes(shown), shown);
  assert.ok(!web.includes('permissions'));
});

test('a setting with parts goes when none of them shows', () => {
  const sms = SETTINGS.find((group) => group.id === 'phone')?.items.find((item) => item.id === 'sms');
  assert.ok(sms && hasParts(sms));
  const parts = (place: SettingsPlace) => itemsHere(SETTINGS.find((group) => group.id === 'phone')!, place).flatMap((item) => (hasParts(item) ? item.parts.filter((p) => !p.when || p.when(place)).map((p) => p.id) : []));
  assert.ok(parts(PHONE).includes('sims'));
  assert.ok(!parts({ ...PHONE, sims: false }).includes('sims'));
});

test('the search finds a setting by its words, in the language shown, without accents', async () => {
  await setLang('en');
  const spam = searchSettings('spam filter', PHONE, t);
  assert.deepEqual(
    spam.map((hit) => [hit.leaf.id, hit.path.join(' › ')]),
    [['spam', 'Phone and SMS › SMS']],
  );
  // A group's name finds what is in it.
  assert.ok(searchSettings('privacy', PHONE, t).some((hit) => hit.leaf.id === 'hidden'));
  assert.deepEqual(searchSettings('   ', PHONE, t), []);
  assert.deepEqual(searchSettings('tor', DESKTOP, t), []);
  await setLang('el');
  assert.ok(searchSettings('φιλτρο ανεπιθυμητων', PHONE, t).some((hit) => hit.leaf.id === 'spam'));
  assert.ok(searchSettings('ΤΑΠΕΤΣΑΡΙΑ', PHONE, t).some((hit) => hit.leaf.id === 'wallpaper'));
  await setLang('en');
});
