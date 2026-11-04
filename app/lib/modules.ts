// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { useEffect, useState } from 'react';

import type { CheckId } from './permission-checks';
import { secureGet, secureSet } from './secure';

// The parts of Erevos the owner uses (Settings → General → Modules, and the first start's setup,
// components/setup.tsx): Erevos's own end-to-end encrypted chats and calls, the phone, the SMS,
// and the chats with Nostr, Matrix and XMPP apps. Any of them, Erevos's own too, at least one.
// One that is off does not start (app/_layout.tsx Receiver) and shows nowhere: not on the home
// screen, in its menu, in Settings, nor its icon among the phone's apps; so Erevos is lighter,
// starts faster and uses less battery. Nothing of it is deleted: its chats, contacts and settings
// are there again when it is on again. On the device, outside every space, as the icons and the
// phone app are, and read before the password, as the Phone may open without it.

export type Module = 'erevos' | 'phone' | 'sms' | 'nostr' | 'matrix' | 'xmpp';

/** Every module, in the order the setup and Settings show them. */
export const MODULES: readonly Module[] = ['erevos', 'phone', 'sms', 'nostr', 'matrix', 'xmpp'];

const KEY = 'erevos.modules';

// The platform Erevos runs on: React Native is asked only when it is there, so the checks, in
// plain Node, can load this file.
function platform(): string {
  try {
    return (require('react-native') as typeof import('react-native')).Platform.OS;
  } catch {
    return 'node';
  }
}

/** The modules this device can run: the phone and the SMS only on Android. */
export function modulesHere(os: string = platform()): Module[] {
  return MODULES.filter((m) => (m === 'phone' || m === 'sms' ? os === 'android' : true));
}

/**
 * The modules kept as `raw` (a JSON list), those this device can run; null when nothing usable is
 * kept, as before the owner chose (every module is then on), or when none of them would be on.
 */
export function parseModules(raw: string | null, here: readonly Module[] = modulesHere()): Set<Module> | null {
  if (!raw) return null;
  try {
    const list: unknown = JSON.parse(raw);
    if (!Array.isArray(list)) return null;
    const chosen = new Set(here.filter((m) => list.includes(m)));
    return chosen.size > 0 ? chosen : null;
  } catch {
    return null;
  }
}

/** What is kept for `chosen`: the modules this device can run, at least one; null when none is. */
export function keptModules(chosen: Iterable<Module>, here: readonly Module[] = modulesHere()): string | null {
  const wanted = new Set(chosen);
  const list = here.filter((m) => wanted.has(m));
  return list.length > 0 ? JSON.stringify(list) : null;
}

// Every module is on until the owner chooses, as for everyone before modules came.
let on: Set<Module> = new Set(modulesHere());
let chosen = false;
let loaded: Promise<void> | null = null;
const changes = new Set<() => void>();

/** Reads the modules chosen, once; again with `again`. */
export function loadModules(again = false): Promise<void> {
  if (loaded && !again) return loaded;
  loaded = secureGet(KEY)
    .then((raw) => {
      const kept = parseModules(raw);
      chosen = kept !== null;
      on = kept ?? new Set(modulesHere());
    })
    .catch(() => undefined);
  return loaded;
}

/** Reads the modules chosen again, as a restored backup put them (lib/backup-settings.ts), and
 *  tells those who follow them when they changed. */
export async function reloadModules(): Promise<void> {
  const before = on;
  await loadModules(true);
  if (before.size !== on.size || [...on].some((m) => !before.has(m))) changes.forEach((listener) => listener());
}

/** Whether the owner chose the modules (the setup, or Settings), or every one is on as before. */
export function modulesChosen(): boolean {
  return chosen;
}

/** Whether `module` is on: on this device, and chosen. */
export function moduleOn(module: Module): boolean {
  return on.has(module);
}

/** The modules on, in their order. */
export function modulesOn(): Module[] {
  return MODULES.filter((m) => on.has(m));
}

/** Keeps `next` as the modules on; refused (false) when none of them could be on. */
export async function setModules(next: Iterable<Module>): Promise<boolean> {
  const raw = keptModules(next);
  if (!raw) return false;
  await secureSet(KEY, raw);
  const kept = parseModules(raw) ?? new Set(modulesHere());
  const same = kept.size === on.size && [...kept].every((m) => on.has(m));
  on = kept;
  chosen = true;
  loaded = Promise.resolve();
  if (!same) changes.forEach((listener) => listener());
  return true;
}

/** Calls `listener` each time a module is turned on or off, until the function it gives is called. */
export function onModulesChange(listener: () => void): () => void {
  changes.add(listener);
  return () => {
    changes.delete(listener);
  };
}

/** The modules on, again each time one is turned on or off: for a screen that shows or hides their parts. */
export function useModules(): ReadonlySet<Module> {
  const [now, setNow] = useState<ReadonlySet<Module>>(() => new Set(on));
  useEffect(() => {
    const read = () => setNow(new Set(on));
    read();
    void loadModules().then(read);
    return onModulesChange(read);
  }, []);
  return now;
}

/** The modules named in `text` (a link's "a,b"), those this device can run, in their order. */
export function moduleList(text: string | undefined, here: readonly Module[] = modulesHere()): Module[] {
  const named = new Set((text ?? '').split(','));
  return here.filter((m) => named.has(m));
}

// The screens of each module but Erevos's (app/), by their route's name: one of a module that is
// off shows that it is off instead (app/_layout.tsx), as a link, the widget or a notice may still
// lead there. Contacts, Settings, the password, the backups and the guide belong to none.
const SCREENS: Record<Module, readonly string[]> = {
  erevos: ['chat', 'group', 'myself', 'new-group', 'public-group', 'public-groups', 'join', 'c', 'i', 'link', 'welcome', 'text-invite', 'relay', 'relay-invite', 'home-relay', 'devices', 'imported', 'lora', 'radio', 'starred', 'nostr'],
  phone: ['phone', 'phone-settings'],
  sms: ['sms', 'sms-folder', 'sms-settings'],
  nostr: ['nostr-chats', 'nostr-chat', 'nostr-posts'],
  matrix: ['matrix', 'matrix-chat', 'matrix-sso'],
  xmpp: ['xmpp', 'xmpp-chat'],
};

/** The module the screen `route` (its route's name) is part of; null for a screen of every module. */
export function screenModule(route: string): Module | null {
  return MODULES.find((m) => SCREENS[m].includes(route)) ?? null;
}

/** The modules that turned on from `before` to `after`: their permissions are asked for again. */
export function turnedOn(before: Iterable<Module>, after: Iterable<Module>): Module[] {
  const was = new Set(before);
  return MODULES.filter((m) => !was.has(m) && [...after].includes(m));
}

// Which modules need each of the permissions check's items (lib/permission-checks.ts), so the
// setup and the check after a new version ask only for what the modules on use. The messages'
// ones are for every module that brings messages in the background; Erevos's calls for its own.
const MESSAGES: readonly Module[] = ['erevos', 'nostr', 'matrix', 'xmpp'];
const NEEDS: Record<CheckId, readonly Module[] | 'any'> = {
  notices: 'any',
  calls: ['erevos', 'matrix', 'xmpp'],
  messages: MESSAGES,
  fullScreen: ['erevos', 'phone', 'matrix', 'xmpp'],
  battery: MESSAGES,
  restricted: MESSAGES,
  unused: MESSAGES,
  data: MESSAGES,
  maker: MESSAGES,
  microphone: MESSAGES,
  messageSound: MESSAGES,
  lockScreen: 'any',
  dnd: ['erevos', 'matrix', 'xmpp'],
  ringer: ['erevos', 'matrix', 'xmpp'],
  saver: MESSAGES,
  camera: MESSAGES,
  nearby: ['erevos'],
  contacts: ['erevos', 'phone', 'sms'],
  alarms: ['erevos'],
  reminders: ['erevos'],
  home: 'any',
  push: MESSAGES,
  storage: 'any',
};

/** Whether one of the modules `of` needs what the check `id` asks for. */
export function checkWanted(id: CheckId, of: Iterable<Module>): boolean {
  const needs = NEEDS[id];
  if (needs === 'any') return true;
  const list = [...of];
  return needs.some((m) => list.includes(m));
}
