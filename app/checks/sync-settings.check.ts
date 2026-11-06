// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// The settings the account's devices share (lib/sync/settings.ts): a look goes without its photo
// and comes keeping this device's own; a setting that came is not written back; only the settings
// shared go, and none while this device keeps its own; and what the phone has goes into a new log.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import './secure-memory';
import { lang, setLang } from '../lib/i18n';
import type { Json } from '../lib/sync/log';
import {
  loadSettingsShared, lookFrom, lookToShare, onSettingCame, onSettingChanged, onSettingNow, setSettingsShared, settingCame, settingChanged,
  settingsNow, settingsShared, shareLanguage,
} from '../lib/sync/settings';
import { DEFAULT_LOOK, type Look } from '../theme/look';

const PHOTO = { id: 'p1', w: 10, h: 10 } as unknown as NonNullable<Look['wallpaperPhoto']>;

test('a look goes without its photo, and comes keeping the photo of this device', () => {
  const here: Look = { ...DEFAULT_LOOK, wallpaper: 'photo', wallpaperPhoto: PHOTO };
  const going = lookToShare(here) as Record<string, Json>;
  assert.equal('wallpaperPhoto' in going, false);
  assert.equal(going.wallpaper, 'photo');

  // Another device's photo look: this device's own photo, should it have one; else the style's ground.
  assert.deepEqual(lookFrom(going, here), here);
  assert.deepEqual(lookFrom(going, DEFAULT_LOOK), { ...DEFAULT_LOOK, wallpaper: 'auto' });
  // Any other look is taken as it is, with no photo, and what is not a look is none.
  const dots = lookFrom({ ...going, style: 'nocturne', wallpaper: 'dots' }, here);
  assert.equal(dots?.style, 'nocturne');
  assert.equal(dots?.wallpaper, 'dots');
  assert.equal(dots?.wallpaperPhoto, null);
  assert.equal(lookFrom('dark', here), null);
  assert.equal(lookFrom([1], here), null);
  assert.equal(lookFrom(null, here), null);
});

test('a setting changed here goes; one that came is put in place and not written back; none while this device keeps its own', async () => {
  const told: [string, Json][] = [];
  const stopTold = onSettingChanged((id, value) => void told.push([id, value]));
  const stopLanguage = shareLanguage();
  await setLang('en');
  told.length = 0;

  await setLang('de');
  assert.deepEqual(told, [['language', 'de']]);

  // From another device: in place, and not told back.
  await settingCame('language', 'fr');
  assert.equal(lang(), 'fr');
  assert.deepEqual(told, [['language', 'de']]);
  // What is not a language, or not a setting shared, changes nothing.
  await settingCame('language', 'xx');
  await settingCame('language', 7);
  await settingCame('lock-time', 60);
  assert.equal(lang(), 'fr');

  // Keeping its own: nothing goes, nothing comes, and so after a start too.
  await setSettingsShared(false);
  await setLang('it');
  await settingCame('language', 'es');
  assert.equal(lang(), 'it');
  assert.deepEqual(told, [['language', 'de']]);
  assert.deepEqual(settingsNow(), []);
  assert.equal(await loadSettingsShared(), false);
  await setSettingsShared(true);
  assert.equal(await loadSettingsShared(), true);
  assert.equal(settingsShared(), true);

  settingChanged('look', lookToShare(DEFAULT_LOOK));
  assert.equal(told.at(-1)?.[0], 'look');

  stopTold();
  stopLanguage();
  await setLang('en');
});

test('what the phone has goes into a new log: the settings known here, the language and the open space\'s look', async () => {
  const stopLanguage = shareLanguage();
  await setLang('el');
  assert.deepEqual(settingsNow(), [{ id: 'language', value: 'el' }]);
  let open = false;
  const stopNow = onSettingNow('look', () => (open ? lookToShare(DEFAULT_LOOK) : undefined));
  assert.deepEqual(settingsNow().map((s) => s.id), ['language']);
  open = true;
  assert.deepEqual(settingsNow().map((s) => s.id), ['language', 'look']);
  stopNow();

  // The look's own way of putting one in place; once let go, a look that comes changes nothing.
  const put: Json[] = [];
  const stopCame = onSettingCame('look', (value) => void put.push(value));
  await settingCame('look', { wallpaper: 'dots' });
  stopCame();
  await settingCame('look', { wallpaper: 'grid' });
  assert.deepEqual(put, [{ wallpaper: 'dots' }]);

  stopLanguage();
  await setLang('en');
});
