// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { secureGet, secureSet } from './secure';

// How much battery Erevos spares while it is in the background (Settings → Notifications → In the
// background), for the whole phone. 'normal': it spares only what is wasted: the relay is waited
// at once for all the queues, nothing is asked again after an empty wait, the links to phones
// nearby are quieter. 'nearby': also, the radios for phones nearby (lib/nearby-links.ts) are off
// while Erevos is in the background. 'light': also, the phone may sleep, with the waits at the
// relay left open: what comes there wakes the phone through the network, and an alarm wakes it
// every few minutes besides (lib/sleep-look.ts). 'sleep': the phone sleeps and only an alarm wakes
// it, about once a minute, to look: Erevos holds no wake lock (modules/erevos-call, ReceiveService.kt).
export type BatteryMode = 'normal' | 'nearby' | 'light' | 'sleep';

const KEY = 'erevos.battery';

let current: BatteryMode = 'normal';
const listeners = new Set<(mode: BatteryMode) => void>();

const isMode = (v: unknown): v is BatteryMode => v === 'normal' || v === 'nearby' || v === 'light' || v === 'sleep';

/** The mode as last set, and the one `batteryMode` answers from now on. */
export async function loadBatteryMode(): Promise<BatteryMode> {
  const kept = await secureGet(KEY).catch(() => null);
  current = isMode(kept) ? kept : 'normal';
  return current;
}

/** The mode as last loaded or set: 'normal' before the first load. */
export const batteryMode = (): BatteryMode => current;

/** Keeps the mode and tells those who follow it. Throws when the phone could not keep it. */
export async function saveBatteryMode(mode: BatteryMode): Promise<void> {
  await secureSet(KEY, mode);
  current = mode;
  listeners.forEach((listener) => listener(mode));
}

/** Reads the mode again, as a restored backup put it (lib/backup-settings.ts), and tells those who follow it. */
export async function reloadBatteryMode(): Promise<void> {
  const mode = await loadBatteryMode();
  listeners.forEach((listener) => listener(mode));
}

/** Has `listener` called whenever the mode is set. Returns how to stop. */
export function onBatteryMode(listener: (mode: BatteryMode) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
