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

test('the panic button shows everywhere: the phone, the web app, a computer and Sailfish OS', () => {
  assert.ok(shows(PHONE));
  assert.ok(shows(WEB_APP));
  assert.ok(shows(DESKTOP));
  assert.ok(shows({ ...DESKTOP, background: false }));
});

test('on a computer and on Sailfish OS the shell wipes: only by the page with its token, its own folder whole, backups only by their names', () => {
  const desktop = read(ROOT, '..', 'desktop', 'main.js');
  const handle = desktop.slice(desktop.indexOf('function handle('));
  // Behind the token, as every shell path.
  assert.ok(handle.indexOf("request.headers.get('x-erevos-token') !== TOKEN") < handle.indexOf("'/__wipe'"));
  const wipe = desktop.slice(desktop.indexOf('async function wipe('), desktop.indexOf('function handle('));
  assert.match(wipe, /request\.method !== 'POST'/);
  assert.match(wipe, /chosenFolders\(\)\.includes\(where\)/, 'backups only in a folder chosen for them');
  assert.match(wipe, /if \(BACKUP\.test\(name\)\)/, 'only the files Erevos named');
  assert.match(wipe, /'secrets\.json', 'files'/);
  assert.match(wipe, /clearStorageData\(\)/);
  assert.match(wipe, /app\.relaunch\(\)/);

  const sailfish = read(ROOT, '..', 'sailfish', 'src', 'shellserver.cpp');
  assert.match(sailfish, /path == "\/__wipe"\) wipe\(socket, request, query\)/);
  const swipe = sailfish.slice(sailfish.indexOf('void ShellServer::wipe('), sailfish.indexOf('void ShellServer::lan('));
  assert.match(swipe, /request\.method != "POST"/);
  assert.match(swipe, /m_watch->takeBack\(\)/, 'the helper stops waiting at the relay');
  assert.match(swipe, /BackupName\.match\(entry\)\.hasMatch\(\)/);
  assert.match(swipe, /m_data\.removeRecursively\(\)/);

  const lib = read(ROOT, 'lib', 'panic.ts');
  assert.match(lib, /shellFetch\(`\/__wipe\?/);
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
  for (const needed of ['getBoolean(ON, false)', 'TRIGGER', 'CERT', 'if (caller != trigger) return false', 'signedAsTrusted(context, caller, cert)']) assert.ok(trusted.includes(needed), needed);
  // Signed as trusted: the same certificates, or a key the app rotated to, which Android proves
  // with the old key (hasSigningCertificate searches the signing history); nothing else.
  const signed = panic.slice(panic.indexOf('private fun signedAsTrusted('), panic.indexOf('\n  }\n', panic.indexOf('private fun signedAsTrusted(')));
  assert.match(signed, /if \(now == cert\) return true/);
  assert.match(signed, /hasSigningCertificate\(pkg, unhex\(it\), PackageManager\.CERT_INPUT_SHA256\)/);
  assert.match(signed, /\.all \{/, 'every certificate trusted must still be there');
  // A refusal is kept for the panic screen, and shown nowhere else.
  assert.match(trusted, /if \(!ok\) prefs\.edit\(\)\.putLong\(REFUSED/);
  const renew = panic.slice(panic.indexOf('fun renew('), panic.indexOf('\n  }\n', panic.indexOf('fun renew(')));
  assert.match(renew, /getString\(TRIGGER, null\) \?: return false/, 'renews only the app already trusted');
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
    for (const key of keys) assert.notEqual(t(key, { app: 'x', folder: 'y', when: 'z' }), key.replace('{app}', 'x').replace('{folder}', 'y').replace('{when}', 'z'), `${lang}: ${key}`);
  }
  setLang('en');
});
