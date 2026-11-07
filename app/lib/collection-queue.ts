// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import type { Repeat } from '../modules/erevos-collection';

// The list playing, as the player's screen (components/collection-now-playing.tsx) changes it:
// shuffled or in its order, repeated or not, how fast, and which files start where they were left.
// Plain logic, kept apart so it can be checked: the page's player (lib/collection-desk-player.ts)
// goes by it; on Android, Media3 does the same itself (Playing.kt).

/**
 * A list of `count` files: the order they play in (their places in the list), where in that order
 * the one playing is, and how it repeats.
 */
export type Queue = { count: number; order: number[]; at: number; shuffle: boolean; repeat: Repeat };

/** The speeds the player offers, slowest first. */
export const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

/** The next speed of SPEEDS, round again after the fastest. */
export function nextSpeed(speed: number): number {
  const next = SPEEDS.find((s) => s > speed + 1e-6);
  return next ?? SPEEDS[0];
}

/** What plays again after `repeat`: off, then the list, then the one file, then off. */
export const nextRepeat = (repeat: Repeat): Repeat => (repeat === 'off' ? 'all' : repeat === 'all' ? 'one' : 'off');

// The places of the list but `first`, shuffled (Fisher–Yates), after `first`.
function shuffled(count: number, first: number, random: () => number): number[] {
  const rest = Array.from({ length: count }, (_, i) => i).filter((i) => i !== first);
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [rest[i], rest[j]] = [rest[j], rest[i]];
  }
  return [first, ...rest];
}

const inOrder = (count: number) => Array.from({ length: count }, (_, i) => i);

/** A list of `count` files starting at `start`. */
export function newQueue(count: number, start: number, shuffle = false, repeat: Repeat = 'off', random: () => number = Math.random): Queue {
  const first = Math.min(Math.max(0, start), Math.max(0, count - 1));
  if (count <= 0) return { count: 0, order: [], at: 0, shuffle, repeat };
  return shuffle ? { count, order: shuffled(count, first, random), at: 0, shuffle, repeat } : { count, order: inOrder(count), at: first, shuffle, repeat };
}

/** The place in the list of the file playing. */
export const current = (q: Queue): number => q.order[q.at] ?? -1;

/** Shuffled from the file playing on, or in the list's order again, at the same file. */
export function setShuffle(q: Queue, on: boolean, random: () => number = Math.random): Queue {
  if (q.count === 0) return { ...q, shuffle: on };
  const now = current(q);
  return on ? { ...q, shuffle: true, order: shuffled(q.count, now, random), at: 0 } : { ...q, shuffle: false, order: inOrder(q.count), at: now };
}

export const setRepeat = (q: Queue, repeat: Repeat): Queue => ({ ...q, repeat });

/**
 * The place of the file that plays after the one playing, or null when the list is done. `ended`:
 * the one playing came to its end by itself, when repeating it plays it again; Next goes on.
 */
export function nextIndex(q: Queue, ended = false): number | null {
  if (q.count === 0) return null;
  if (ended && q.repeat === 'one') return current(q);
  if (q.at + 1 < q.order.length) return q.order[q.at + 1];
  return q.repeat === 'off' ? null : q.order[0];
}

/** The place of the file before the one playing, or null at the list's start. */
export function previousIndex(q: Queue): number | null {
  if (q.count === 0) return null;
  if (q.at > 0) return q.order[q.at - 1];
  return q.repeat === 'off' ? null : q.order[q.order.length - 1];
}

/** The list at the file at `index`, its order kept. */
export function jumpTo(q: Queue, index: number): Queue {
  const at = q.order.indexOf(index);
  return at < 0 ? q : { ...q, at };
}

/** A file this long starts where it was left: a video, or music of 10 minutes or more. */
export const RESUME_FROM = 10 * 60 * 1000;

/** Whether where a file got to is kept, to start there the next time. */
export const resumable = (video: boolean, duration: number): boolean => video || duration >= RESUME_FROM;

/**
 * Where to keep that a file got to, `position` of `duration` (ms; -1 when not known): null to keep
 * nothing (it is not one that resumes), 0 to forget where it was (barely begun, or near its end),
 * else the position.
 */
export function positionToKeep(video: boolean, position: number, duration: number): number | null {
  if (!resumable(video, duration)) return null;
  if (position < 15_000) return 0;
  if (duration > 0 && position > duration - 20_000) return 0;
  return Math.round(position);
}
