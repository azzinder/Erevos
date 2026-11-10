// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// Asking for a look at the relay at once (lib/receiver.ts), from what the receiver itself reads
// from, as a queue's move (lib/queue-move.ts): the looks wait at the relay while nothing comes, and
// what is to be said, as where a chat reads now, should not wait for that to run out.

let asked = 0;
const listeners = new Set<() => void>();

/**
 * Something is to be said with the next look, as that a message was read or that the queue moved:
 * the waits at the relay under way end, and a look past its wait does not wait at its next one.
 */
export function lookNow(): void {
  asked++;
  listeners.forEach((listener) => listener());
}

/** How many times a look was asked for at once, so far. */
export function looksAsked(): number {
  return asked;
}

/** Has `listener` called each time a look is asked for at once. Returns how to stop. */
export function onLookNow(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
