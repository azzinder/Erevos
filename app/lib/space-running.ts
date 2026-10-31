// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// What goes on while a space is open, whatever screen shows (app/_layout.tsx): its messages taken,
// its calls rung, Erevos receiving in the background. It starts with the space's screens and stops
// when the space closes (another space opened, a backup restored), not with the screens: on Android,
// Erevos swiped away from the recent apps loses its screens and goes on without them, ready for
// messages and calls as when it is left with Home, until the space closes or Android stops it.
// With the password lock, the password screen comes in front of the space when it locks, and the
// space goes on behind it (`gated`) until the password opens it again: meanwhile Erevos counts as
// not shown (lib/receiver.ts, setAppShown), so messages and calls say they came with a notice, and
// the call screen has none of its names (lib/known-names.ts).

let running: { space: number; stop: () => void; start: () => (() => void)[] } | null = null;
let gated = false;
const gateListeners = new Set<() => void>();

/** Starts what `start` starts for `space`, once: nothing while it goes on for that space already; what goes on for another stops first. */
export function keepSpaceRunning(space: number, start: () => (() => void)[]): void {
  if (running?.space === space) return;
  stopSpaceRunning();
  const stops = start();
  running = { space, stop: () => stops.forEach((stop) => stop()), start };
}

/** Stops what goes on for the open space and starts it again, as its servers stop or start again (lib/forget-me.ts). */
export function restartSpaceRunning(): void {
  const was = running;
  if (!was) return;
  running = null;
  was.stop();
  keepSpaceRunning(was.space, was.start);
}

/** Stops what goes on for the open space, as it closes. */
export function stopSpaceRunning(): void {
  const was = running;
  running = null;
  was?.stop();
  setSpaceGated(false);
}

/** The password screen shows in front of the open space (`on`), or the space shows again. */
export function setSpaceGated(on: boolean): void {
  if (gated === on) return;
  gated = on;
  gateListeners.forEach((listener) => listener());
}

/** Whether the password screen shows in front of the open space. */
export function spaceGated(): boolean {
  return gated;
}

/** Calls `listener` each time the password screen comes in front of the space or goes. Returns how to stop. */
export function onSpaceGatedChange(listener: () => void): () => void {
  gateListeners.add(listener);
  return () => {
    gateListeners.delete(listener);
  };
}
