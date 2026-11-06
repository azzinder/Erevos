// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { t } from './i18n';

// When each space, and each hidden place, was last open on the screen, for "last seen"
// (SpaceData.lastSeen, the space's and each hidden place's own): its contacts are told the time
// inside what goes to them anyway (lib/e2e.ts, `ls`), end-to-end encrypted, never on its own to the
// relay, so the relay learns nothing new. Each has its own time, as contacts must not tell one
// space's owner from another's, nor a hidden place's from its space's, by when both were open:
// while a hidden place's chats are open, only the place counts as open, not its space. Only in
// memory: after a start in the background, nothing is said until it shows again.
//
// It goes both ways: one turned off tells its contacts so (`ls` 0), and they forget its time; and it
// is shown none of theirs.

const lastShown = new Map<string, number>();
let showing: string | null = null;
let space: number | null = null;
let pocket: number | null = null;

/** Where the time of the space in `space` is kept. */
export const spaceSeenKey = (space: number) => `${space}`;
/** Where the time of the hidden place in `pocket` of `space` is kept. */
export const placeSeenKey = (space: number, pocket: number) => `${space}.${pocket}`;

function follow(now: number): void {
  const next = space === null ? null : pocket === null ? spaceSeenKey(space) : placeSeenKey(space, pocket);
  if (showing !== null && showing !== next) lastShown.set(showing, now);
  showing = next;
  if (next !== null) lastShown.set(next, now);
}

/** Says which space shows on the screen now, or none (`null`): the app is away, or the password screen is in front. */
export function spaceShown(shown: number | null, now = Date.now()): void {
  space = shown;
  follow(now);
}

/** Says which hidden place of the space has its chats open now, or none (`null`). */
export function placeShown(open: { space: number; pocket: number } | null, now = Date.now()): void {
  pocket = open && (space === null || open.space === space) ? open.pocket : null;
  follow(now);
}

/** When the space or hidden place (spaceSeenKey, placeSeenKey) was last open on the screen (ms): now while it shows, 0 when not known this run. */
export function shownAt(key: string, now = Date.now()): number {
  return showing === key ? now : (lastShown.get(key) ?? 0);
}

const pad = (n: number) => String(n).padStart(2, '0');

/** What the chat says of a contact last seen at `at` (ms): the exact time, with today, yesterday or the date. */
export function lastSeenText(at: number, now = Date.now()): string {
  const d = new Date(Math.min(at, now));
  const today = new Date(now);
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  if (d.toDateString() === today.toDateString()) return t('last seen today at {time}', { time });
  if (d.toDateString() === new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1).toDateString()) return t('last seen yesterday at {time}', { time });
  const date = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${String(d.getFullYear()).slice(2)}`;
  return t('last seen {date} at {time}', { date, time });
}
