// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { spaceGated } from './space-running';

// A safety message (app/chat.tsx, Send later → Safety message): words to a contact that go only if
// the owner does not open Erevos for a while. It is sealed and held by the relay like a message sent
// for later (lib/waiting.ts, holdLater), to go a chosen number of hours on; each time the owner has
// Erevos on the screen, past its password, it is held anew to go that many hours from then, and the
// one held before is taken back. If the phone is lost, taken, broken or kept from the internet, the
// relay sends it by itself at its time. Erevos running in the background never puts it off: only
// the owner looking at it does (ownerLooks). Deleting it takes it back, as any message sent for
// later. It is sealed once: held anew, the same packets go to the relay again with a later time,
// so no key of the conversation is spent on it each time (lock/history.ts, Resend).
//
// To the contact it is an ordinary message, from its time on. An Erevos from before keeps it as a
// message sent for later, held once.

const HOUR = 3_600_000;

/** The hours one can choose: from 6 hours to a week. */
export const SAFETY_HOURS = [6, 12, 24, 48, 72, 168] as const;

/** Whether `value`, as kept, is one of the hours a safety message can be put off by. */
export const isSafetyHours = (value: unknown): value is number => typeof value === 'number' && (SAFETY_HOURS as readonly number[]).includes(value);

/** How long after the last time it was held anew a safety message is held anew again: not at every look. */
export const REARM_AFTER = 30 * 60_000;

/** When a safety message of `hours` goes, held anew at `now`. */
export const safetyDue = (hours: number, now = Date.now()) => now + hours * HOUR;

/** Whether a safety message due at `at`, of `hours`, is to be held anew at `now`, the owner looking: once it was held more than REARM_AFTER ago. */
export function needsRearm(at: number, hours: number, now = Date.now()): boolean {
  return at > now && safetyDue(hours, now) - at > REARM_AFTER;
}

/** How recently the owner must have touched the screen or typed, for Erevos on the screen to count as them looking. */
export const ACTIVE_MS = 10 * 60_000;

// Whether Erevos shows on the screen (lib/receiver.ts says it, as it knows), and when the owner
// last touched it, clicked or typed in it (app/_layout.tsx, and below for a browser).
let shown: () => boolean = () => false;
let touched = 0;

/** The owner touched the screen, clicked or typed, now. */
export function ownerTouched(now = Date.now()): void {
  touched = now;
}

// In a browser (the web app, a computer, Sailfish OS) a click or a key counts, not only a touch.
if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
  for (const kind of ['pointerdown', 'keydown']) document.addEventListener(kind, () => ownerTouched(), { capture: true, passive: true });
}

/** How to tell whether Erevos shows on the screen: lib/receiver.ts gives it. */
export function setShownCheck(check: () => boolean): void {
  shown = check;
}

/**
 * Whether the owner looks at Erevos now: it shows on the screen, past its password, and was
 * touched, clicked or typed in lately. A window left open on a computer nobody sits at, or a
 * phone left on with Erevos showing, stops counting after ACTIVE_MS.
 */
export function ownerLooks(now = Date.now()): boolean {
  return shown() && !spaceGated() && now - touched < ACTIVE_MS;
}

// What is done with each safety message, in turn: held anew, or taken back to delete it.
const turns = new Map<string, Promise<unknown>>();
// Those taken back to be deleted: never held anew again.
const stopped = new Set<string>();

/** Runs `run` for the message `tag` once what else is done with it ended: two never at once. */
export function inTurn<T>(tag: string, run: () => Promise<T>): Promise<T> {
  const next = (turns.get(tag) ?? Promise.resolve()).catch(() => undefined).then(run);
  const kept = next.finally(() => {
    if (turns.get(tag) === kept) turns.delete(tag);
  });
  turns.set(tag, kept);
  return next;
}

/** The message `tag` was taken back to be deleted: it is never held anew. */
export function stopSafety(tag: string): void {
  stopped.add(tag);
}

/** Whether the message `tag` was taken back to be deleted. */
export function safetyStopped(tag: string): boolean {
  return stopped.has(tag);
}
