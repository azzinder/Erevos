// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// The clock of the account's log (lib/sync/log.ts, docs/sync.md): a hybrid logical clock. Each
// change a device makes is stamped with the wall clock in ms (`t`), a counter (`c`) and the device
// that made it (`d`). A stamp is always after every stamp its device made or saw before, whatever
// its wall clock says: a device whose clock is behind still stamps after a change it took from one
// whose clock is ahead, so "the later change wins" means later in what the devices saw, not by
// whichever clock happens to be right. Two stamps are never equal: the device settles a tie.
//
// A stamp from another device more than MAX_AHEAD ahead of this one's clock is not taken yet
// (log.ts holds it until the clock gets there), so a device with its clock years ahead cannot make
// its changes win for good. Self-contained, so it runs under plain Node for checks.

export type Stamp = { t: number; c: number; d: string };

/** How far ahead of this device's clock a stamp from another may be, in ms: a day. */
export const MAX_AHEAD = 24 * 60 * 60 * 1000;

/** The highest counter: beyond it the wall clock part moves on by a ms instead. */
const MAX_COUNTER = 0xffff;

/** Orders stamps: by time, then counter, then device. Negative when `a` is before `b`. */
export function compare(a: Stamp, b: Stamp): number {
  if (a.t !== b.t) return a.t < b.t ? -1 : 1;
  if (a.c !== b.c) return a.c < b.c ? -1 : 1;
  return a.d < b.d ? -1 : a.d > b.d ? 1 : 0;
}

/** Whether `a` is after `b`; anything is after nothing. */
export function after(a: Stamp, b: Stamp | undefined): boolean {
  return b === undefined || compare(a, b) > 0;
}

/** The later of two stamps. */
export function later(a: Stamp | undefined, b: Stamp | undefined): Stamp | undefined {
  if (a === undefined) return b;
  if (b === undefined) return a;
  return compare(a, b) >= 0 ? a : b;
}

/** The next stamp of `device` for a change made now: after `last`, the latest it made or saw. */
export function tick(last: Stamp | undefined, now: number, device: string): Stamp {
  const wall = Math.floor(now);
  if (last === undefined || wall > last.t) return { t: wall, c: 0, d: device };
  if (last.c >= MAX_COUNTER) return { t: last.t + 1, c: 0, d: device };
  return { t: last.t, c: last.c + 1, d: device };
}

/**
 * What this device's clock becomes once it saw `seen` from another: still its own `last` if that
 * is later. A stamp is seen only once it was taken, so never one more than MAX_AHEAD ahead.
 */
export function saw(last: Stamp | undefined, seen: Stamp, device: string): Stamp {
  const top = later(last, seen)!;
  return { t: top.t, c: top.c, d: device };
}

/** Whether a stamp from another device may be taken now, by this device's clock. */
export function takenNow(stamp: Stamp, now: number): boolean {
  return stamp.t <= now + MAX_AHEAD;
}

/** Whether `x` is a stamp as the log keeps one. */
export function isStamp(x: unknown): x is Stamp {
  if (typeof x !== 'object' || x === null) return false;
  const s = x as Record<string, unknown>;
  return (
    Number.isSafeInteger(s.t) && (s.t as number) >= 0 &&
    Number.isInteger(s.c) && (s.c as number) >= 0 && (s.c as number) <= MAX_COUNTER &&
    isDevice(s.d) && Object.keys(s).length === 3
  );
}

/** A device as the log names one: its endpoint's identity, 64 hex characters. */
export function isDevice(x: unknown): x is string {
  return typeof x === 'string' && /^[0-9a-f]{64}$/.test(x);
}
