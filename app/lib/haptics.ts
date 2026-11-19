// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { Platform, Vibration } from 'react-native';

import { secureGet, secureSet } from './secure';

// A short buzz when a touch does something: a key of the keypad, Send, Enter, a switch, a menu
// that opens (Settings → General → Vibrate on touch). On unless turned off, on the device, outside
// every space. Never on scrolling. Where the screen cannot vibrate (the web app, a computer) it
// does nothing.

const KEY = 'erevos.haptics';

/** A key, a switch, a chip: the lightest buzz. */
export const TAP_MS = 10;
/** Send, Enter, Call, End, a menu that opens: a little longer, to be felt as an answer. */
export const PRESS_MS = 15;

// Read once, then kept: a touch cannot wait for the keystore.
let on = true;
let read = false;
const changes = new Set<() => void>();

/** Whether touches buzz. */
export async function hapticsOn(): Promise<boolean> {
  try {
    return (await secureGet(KEY)) !== 'no';
  } catch {
    return true;
  }
}

function load(): void {
  if (read) return;
  read = true;
  void hapticsOn().then((value) => {
    on = value;
  });
}

/** Turns the buzz on or off, with a buzz to feel it by when it turns on. */
export async function setHapticsOn(value: boolean): Promise<void> {
  on = value;
  read = true;
  await secureSet(KEY, value ? 'yes' : 'no');
  changes.forEach((listener) => listener());
  if (value) press();
}

/** Reads the choice again, as a restored backup put it (lib/backup-settings.ts). */
export async function reloadHaptics(): Promise<void> {
  on = await hapticsOn();
  read = true;
  changes.forEach((listener) => listener());
}

/** Calls `listener` each time the buzz is turned on or off, until the function it gives is called. */
export function onHapticsChange(listener: () => void): () => void {
  changes.add(listener);
  return () => {
    changes.delete(listener);
  };
}

function buzz(ms: number): void {
  if (Platform.OS === 'web') return;
  load();
  if (!on) return;
  try {
    Vibration.vibrate(ms);
  } catch {
    // A phone without a vibrator: nothing to feel.
  }
}

/** The light buzz of a key, a switch, a chip. */
export function tap(): void {
  buzz(TAP_MS);
}

/** The buzz of Send, Enter, Call, End, or a menu that opens. */
export function press(): void {
  buzz(PRESS_MS);
}

/** Something asked for with a tap did not happen, as a file that did not come: two short buzzes. */
export const FAILED_PATTERN = [0, PRESS_MS * 2, 80, PRESS_MS * 2];
export function failed(): void {
  if (Platform.OS === 'web') return;
  load();
  if (!on) return;
  try {
    Vibration.vibrate(FAILED_PATTERN);
  } catch {
    // A phone without a vibrator: the line still says so.
  }
}
