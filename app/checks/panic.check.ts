// The panic button (lib/panic.ts, app/panic.tsx, Panic.kt, PanicActivity.kt): where it shows, how
// Android lets panic apps reach it, that only the app trusted, signed as it was, may wipe, and that
// the web app's wipe leaves nothing in the browser's database.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

import { groupsHere, itemsHere, type SettingsPlace } from '../lib/settings';

const ROOT = join(import.meta.dirname, '..');
const ANDROID = join(ROOT, 'modules', 'erevos-device', 'android', 'src', 'main');
const KOTLIN = join(ANDROID, 'java', 'expo', 'modules', 'erevosdevice');
const read = (...parts: string[]) => readFileSync(join(...parts), 'utf8');

const PHONE: SettingsPlace = { web: false, webApp: false, push: false, background: true, checks: true, launcher: true, widget: true, sims: true };
const WEB_APP: SettingsPlace = { web: true, webApp: true, push: true, background: false, checks: true, launcher: false, widget: false, sims: false };
const DESKTOP: SettingsPlace = { web: true, webApp: false, push: false, background: true, checks: false, launcher: false, widget: false, sims: false };

const shows = (place: SettingsPlace) => groupsHere(place).some((group) => itemsHere(group, place).some((item) => item.id === 'panic'));

test('the panic button shows where Erevos can wipe itself: the phone and the web app, not the desktop app', () => {
  assert.ok(shows(PHONE));
  assert.ok(shows(WEB_APP));
  assert.ok(!shows(DESKTOP));
  assert.ok(!shows({ ...DESKTOP, background: false }));
});

test('panic apps reach one activity, exported for PanicKit and showing nothing', () => {
  const manifest = read(ANDROID, 'AndroidManifest.xml');
  const start = manifest.indexOf('android:name="expo.modules.erevosdevice.PanicActivity"');
  assert.ok(start > 0);
  const activity = manifest.slice(manifest.lastIndexOf('<activity', start), manifest.indexOf('</activity>', start));
  assert.match(activity, /android:exported="true"/);
  assert.match(activity, /android:noHistory="true"/);
  assert.match(activity, /android:excludeFromRecents="true"/);
  assert.match(activity, /Theme\.Translucent/);
  for (const action of ['TRIGGER', 'CONNECT', 'DISCONNECT']) assert.ok(activity.includes(`<action android:name="info.guardianproject.panic.action.${action}" />`), action);
  // No other component answers PanicKit, so nothing else can be made to wipe.
  assert.equal(manifest.split('info.guardianproject.panic.action.TRIGGER').length, 2);
});

test('only the app trusted, named by Android and signed as when trusted, may wipe', () => {
  const activity = read(KOTLIN, 'PanicActivity.kt');
  const code = activity.slice(activity.indexOf('class PanicActivity'));
  // Who asks comes from Android (startActivityForResult), never from the request's extras.
  assert.match(code, /callingActivity\?\.packageName/);
  assert.doesNotMatch(code, /getStringExtra|getParcelableExtra|\.extras/);
  assert.match(code, /Panic\.ACTION_TRIGGER -> if \(caller != null && Panic\.trusted\(this, caller\)\) \{/);
  assert.equal(code.split('Panic.wipe(').length, 2, 'one wipe, under the trusted check');
  // Asking to be the one trusts nothing: the owner says yes in Erevos, after its password.
  const connect = code.slice(code.indexOf('Panic.ACTION_CONNECT'), code.indexOf('Panic.ACTION_DISCONNECT'));
  assert.doesNotMatch(connect, /allow|set\(/);
  assert.match(code, /Panic\.ACTION_DISCONNECT -> if \(caller != null && caller == Panic\.trigger\(this\)\)/);

  const panic = read(KOTLIN, 'Panic.kt');
  const trusted = panic.slice(panic.indexOf('fun trusted('), panic.indexOf('\n  }\n', panic.indexOf('fun trusted(')));
  for (const needed of ['getBoolean(ON, false)', 'TRIGGER', 'CERT', 'caller == trigger && certOf(context, caller) == cert']) assert.ok(trusted.includes(needed), needed);
  assert.match(panic, /clearApplicationUserData\(\)/);
  const allow = panic.slice(panic.indexOf('fun allow('), panic.indexOf('\n  }\n', panic.indexOf('fun allow(')));
  assert.match(allow, /getString\(PENDING, null\) != pkg \|\| cert == null \|\| certOf\(context, pkg\) != cert\) return false/, 'yes only to the app that asked, signed as when it asked');
});

test('the web wipe deletes the whole database and forgets the key that sealed it', () => {
  const store = read(ROOT, 'lib', 'web-store.ts');
  const wipe = store.slice(store.indexOf('export async function webWipe'));
  assert.match(wipe, /indexedDB\.deleteDatabase\(DB\)/);
  assert.match(wipe, /sealKey = null/);
  assert.match(wipe, /opened = null/);
  const lib = read(ROOT, 'lib', 'panic.ts');
  assert.match(lib, /unsubscribe\(\)/);
  assert.match(lib, /location\?\.replace\?\.\('\/'\)/);
});

test('every word on the panic screen is translated', async () => {
  const { setLang, t } = await import('../lib/i18n');
  const screen = read(ROOT, 'app', 'panic.tsx') + read(ROOT, 'lib', 'panic.ts');
  const keys = [...screen.matchAll(/\bt\('((?:[^'\\]|\\.)+)'/g)].map((m) => m[1]);
  assert.ok(keys.length > 15);
  for (const lang of ['el', 'de', 'es', 'fr', 'it', 'pt', 'sh'] as const) {
    setLang(lang);
    for (const key of keys) assert.notEqual(t(key, { app: 'x', folder: 'y' }), key.replace('{app}', 'x').replace('{folder}', 'y'), `${lang}: ${key}`);
  }
  setLang('en');
});
