// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// A note's reminder that comes again (lock/myself-data.ts, Note.every): every n days, weeks, months
// or years, as Fasouli asks for a scheduled payment (erevos://myself?…&every=1m, lib/note-link.ts).
// Once a reminder that came is seen, its next time is the first after now, on the same clock time;
// a month's day past the month's end is its last day, and the next keeps the day it began on.
// Self-contained on purpose, so it can run under plain Node for checks.

export type Every = { u: 'd' | 'w' | 'm' | 'y'; n: number };

/** The most of a unit between two times: up to about three years of days. */
export const MOST_EVERY = 999;

export function isEvery(value: unknown): value is Every {
  const v = value as Partial<Every> | null;
  return !!v && (v.u === 'd' || v.u === 'w' || v.u === 'm' || v.u === 'y') && Number.isInteger(v.n) && v.n! >= 1 && v.n! <= MOST_EVERY;
}

/** As a link says it: `1m`, `2w`, …; null for anything else. */
export function everyOfText(text: unknown): Every | null {
  if (typeof text !== 'string') return null;
  const m = /^([1-9]\d{0,2})([dwmy])$/.exec(text.trim());
  return m ? { u: m[2] as Every['u'], n: Number(m[1]) } : null;
}

export const everyText = (every: Every): string => `${every.n}${every.u}`;

/** `from` moved on `count` times `every`, on its clock time, the day of the month kept where the month has it. */
function moved(from: number, every: Every, count: number): number {
  const d = new Date(from);
  if (every.u === 'd' || every.u === 'w') {
    d.setDate(d.getDate() + count * every.n * (every.u === 'w' ? 7 : 1));
    return d.getTime();
  }
  const months = count * every.n * (every.u === 'y' ? 12 : 1);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, last));
  return d.getTime();
}

/** The first time after `now` the reminder that began at `due` comes again. */
export function nextDue(due: number, every: Every, now = Date.now()): number {
  // Counted from the first time, so a day lost at a month's end comes back.
  for (let count = 1; count <= 100_000; count++) {
    const next = moved(due, every, count);
    if (next > now) return next;
  }
  return moved(due, every, 100_001);
}
