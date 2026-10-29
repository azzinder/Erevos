import { spaceGated } from './space-running';

// A safety message (app/chat.tsx, Send later → Safety message): words to a contact that go only if
// the owner does not open Erevos for a while. It is sealed and held by the relay like a message sent
// for later (lib/waiting.ts, holdLater), to go a chosen number of hours on; each time the owner has
// Erevos on the screen, past its password, it is held anew to go that many hours from then, and the
// one held before is taken back. If the phone is lost, taken, broken or kept from the internet, the
// relay sends it by itself at its time. Erevos running in the background never puts it off: only
// the owner looking at it does. Deleting it takes it back, as any message sent for later.
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

// Whether Erevos shows on the screen (lib/receiver.ts says it, as it knows).
let shown: () => boolean = () => false;

/** How to tell whether Erevos shows on the screen: lib/receiver.ts gives it. */
export function setShownCheck(check: () => boolean): void {
  shown = check;
}

/** Whether the owner looks at Erevos now: it shows on the screen, past its password. */
export function ownerLooks(): boolean {
  return shown() && !spaceGated();
}
