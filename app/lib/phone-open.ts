// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { secureDelete, secureGet, secureSet } from './secure';

// Whether the Phone (app/phone.tsx) opens without Erevos's password: its keypad, calls and
// favourites, which Android keeps for every phone app, with the names of the phone's contacts
// only. Kept on the device, outside every space, as it is read with Erevos locked
// (app/_layout.tsx), and changed only with a space open (app/phone-settings.tsx). Off unless
// turned on.

const KEY = 'erevos.phone-open';

/** Whether the Phone opens without the password. */
export async function phoneOpensLocked(): Promise<boolean> {
  try {
    return (await secureGet(KEY)) === 'yes';
  } catch {
    return false;
  }
}

/** Lets the Phone open without the password, or keeps it behind it again. */
export async function setPhoneOpensLocked(on: boolean): Promise<void> {
  await secureSet(KEY, on ? 'yes' : 'no');
}

// Speed dial with Erevos locked: a copy of one space's speed dial numbers, kept on the device
// outside every space, as it is read with Erevos locked (app/phone.tsx), so that holding 2 to 9 on
// the Phone opened without the password calls them. Off unless turned on in that space
// (app/phone-settings.tsx). `feed` names, without saying which, the space that keeps it up to date:
// that space holds the same `feed` sealed in its own data (lock/phone-data.ts), and only a space
// whose `feed` matches writes the copy (lib/phone-sims.ts). The numbers only, no names; never in a
// backup.

const SPEED_KEY = 'erevos.phone-speed';

/** The copy: each key from 2 to 9 with its number. */
export type LockedSpeed = { feed: string; keys: { key: string; number: string }[] };

const SPEED_KEYS = ['2', '3', '4', '5', '6', '7', '8', '9'];

function lockedSpeedFrom(raw: string | null): LockedSpeed | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as { feed?: unknown; keys?: unknown };
    if (typeof v.feed !== 'string' || !v.feed || v.feed.length > 64 || !Array.isArray(v.keys)) return null;
    const keys = (v.keys as unknown[])
      .map((item) => (item ?? {}) as Record<string, unknown>)
      .filter((k, i, all) => typeof k.key === 'string' && SPEED_KEYS.includes(k.key) && all.findIndex((m) => m.key === k.key) === i)
      .filter((k) => typeof k.number === 'string' && k.number.length > 0 && k.number.length <= 32)
      .map((k) => ({ key: k.key as string, number: k.number as string }));
    return { feed: v.feed, keys };
  } catch {
    return null;
  }
}

/** The speed dial numbers that work with Erevos locked, or null while it is off. */
export async function lockedSpeedDials(): Promise<LockedSpeed | null> {
  try {
    return lockedSpeedFrom(await secureGet(SPEED_KEY));
  } catch {
    return null;
  }
}

/** Keeps the copy, or with null takes it away: speed dial then works with Erevos unlocked only. */
export async function setLockedSpeedDials(value: LockedSpeed | null): Promise<void> {
  if (value === null) await secureDelete(SPEED_KEY);
  else await secureSet(SPEED_KEY, JSON.stringify({ feed: value.feed, keys: value.keys.map(({ key, number }) => ({ key, number })) }));
}
