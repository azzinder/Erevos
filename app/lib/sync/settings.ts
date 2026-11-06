// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { checkedLook, type Look } from '../../theme/look';
import { lang, LANGS, onLangChange, setLang, type Lang } from '../i18n';
import { secureGet, secureSet } from '../secure';

import type { Json } from './log';

// The settings the account's devices share through the space's log (lib/sync/log.ts, docs/sync.md,
// phase S2): each a record of kind `setting` by its id, its value in field `v`. Only those that
// mean the same on every device go: the language, the space's look (but a photo behind the
// screens, which stays on the device it was chosen on), and whether the space's contacts see when
// it was last open (lib/last-seen.ts), as one device telling them while another says it tells none
// would have them forget it and learn it again. What is about this device alone stays: its
// passwords, PINs and panic code, the lock's time, vibration, battery, LoRa and BLE, its modules
// and permissions, its name, its relay and Tor.
//
// Whether this device shares them is its own choice (`settingsShared`, on unless turned off, in
// Settings → Data and devices): off, it writes none of its changes into the log, and takes none.
// A change is written as it is made on this device (`settingChanged`), never as one comes from the
// log, so a device just linked takes the phone's settings, and does not give it its own.

/** The settings that go. */
export const SHARED_SETTINGS = ['language', 'look', 'lastSeen'] as const;
export type SharedSetting = (typeof SHARED_SETTINGS)[number];

const KEY = 'erevos.share-settings';

let shared = true;
const changed = new Set<(id: SharedSetting, value: Json) => void>();
const came = new Map<SharedSetting, (value: Json) => void | Promise<void>>();
const now = new Map<SharedSetting, () => Json | undefined>();
let cameNow: SharedSetting | null = null;

/** Whether this device shares the settings with the account's other devices. */
export function settingsShared(): boolean {
  return shared;
}

/** Reads whether this device shares them, once at start. */
export async function loadSettingsShared(): Promise<boolean> {
  shared = (await secureGet(KEY).catch(() => null)) !== 'off';
  return shared;
}

export async function setSettingsShared(on: boolean): Promise<void> {
  shared = on;
  await secureSet(KEY, on ? 'on' : 'off').catch(() => undefined);
}

/** A look as it goes to the other devices: without a photo behind the screens, which stays here. */
export function lookToShare(look: Look): Json {
  const { wallpaperPhoto: _photo, ...rest } = look;
  return rest as unknown as Json;
}

/**
 * A look that came, as this device shows it: a photo behind the screens is this device's own photo,
 * should it have one, else the style's own ground.
 */
export function lookFrom(value: Json, here: Look): Look | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  // Read without a photo, one that says 'photo' reads as the style's own ground.
  const look = { ...checkedLook({ ...value, wallpaperPhoto: null }), wallpaperPhoto: null };
  return value.wallpaper === 'photo' && here.wallpaperPhoto ? { ...look, wallpaper: 'photo', wallpaperPhoto: here.wallpaperPhoto } : look;
}

/** A setting changed on this device, by whoever uses it: told to the links, to write into the log. */
export function settingChanged(id: SharedSetting, value: Json): void {
  // One that came from the log and is being put in place is not written back.
  if (!shared || cameNow === id) return;
  for (const listener of changed) listener(id, value);
}

/** Listens to the settings changed here (lib/devices.ts, for the space's links). */
export function onSettingChanged(listener: (id: SharedSetting, value: Json) => void): () => void {
  changed.add(listener);
  return () => changed.delete(listener);
}

/** Puts a setting that came from the log in place, by what keeps it here. */
export function onSettingCame(id: SharedSetting, put: (value: Json) => void | Promise<void>): () => void {
  came.set(id, put);
  return () => {
    if (came.get(id) === put) came.delete(id);
  };
}

/** Says what a setting is here now, for the phone to write into a log that has none of it yet. */
export function onSettingNow(id: SharedSetting, get: () => Json | undefined): () => void {
  now.set(id, get);
  return () => {
    if (now.get(id) === get) now.delete(id);
  };
}

/** The settings as they are here now, those known: what the phone writes into a new log. */
export function settingsNow(): { id: SharedSetting; value: Json }[] {
  if (!shared) return [];
  return SHARED_SETTINGS.flatMap((id) => {
    const value = now.get(id)?.();
    return value === undefined ? [] : [{ id, value }];
  });
}

/** A setting the log says, put in place here unless this device keeps its own. */
export async function settingCame(id: string, value: Json): Promise<void> {
  if (!shared || !(SHARED_SETTINGS as readonly string[]).includes(id)) return;
  const put = came.get(id as SharedSetting);
  if (!put) return;
  cameNow = id as SharedSetting;
  try {
    await put(value);
  } finally {
    cameNow = null;
  }
}

/** The language goes as it is chosen, and comes as another device chose it. Once, at start. */
export function shareLanguage(): () => void {
  const stopChanged = onLangChange(() => settingChanged('language', lang()));
  const stopNow = onSettingNow('language', () => lang());
  const stopCame = onSettingCame('language', async (value) => {
    if (typeof value === 'string' && (LANGS as string[]).includes(value)) await setLang(value as Lang);
  });
  return () => {
    stopChanged();
    stopNow();
    stopCame();
  };
}
