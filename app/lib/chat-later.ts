// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { restoredAt } from '../lock/restored';
import { RETRY, sendHeld } from './chat-writing';
import { matrixWritings, onMatrixChange } from './matrix-store';
import { nostrDmWritings, onNostrDmChange } from './nostr-dm-store';
import { onXmppChange, xmppWritings } from './xmpp-store';

// Sends the messages the Matrix, XMPP and Nostr chats hold to go later (lib/chat-writing.ts), each
// at its time, from every account that runs: the open space's, and its hidden places' own while
// they run (lib/place-networks.ts). It runs while the space is open, beside the receiver
// (app/_layout.tsx), on Android with Erevos in the background too; one whose time came while
// nothing ran goes once it runs again. It looks again at the next one's time, and as an account
// changes: it connects, or a message is held, cancelled or sent now (heldChanged).

let poke: (() => void) | null = null;
// Those that could not be tried, by id, and when: tried again RETRY later (sendHeld).
const tried = new Map<string, number>();

/** Says a message was held or cancelled, or is to go now (`now`, its id: tried at once, whatever
 *  went wrong before). */
export function heldChanged(now?: string): void {
  if (now) tried.delete(now);
  poke?.();
}

/** Sends what the accounts hold as its time comes, until the function it gives is called. */
export function startChatLater(): () => void {
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let waiting = false;
  let turn: Promise<unknown> = Promise.resolve();
  // A backup restored before the space opened: what it brought whose time came then waits for the owner.
  const restored = restoredAt().catch(() => 0);
  const check = () => {
    // One look waiting to start is enough: it reads everything as it is then.
    if (waiting || stopped) return;
    waiting = true;
    turn = turn
      .then(async () => {
        waiting = false;
        if (timer) clearTimeout(timer);
        timer = null;
        if (stopped) return;
        const at = await restored;
        let next = 0;
        for (const account of [...matrixWritings(), ...xmppWritings(), ...nostrDmWritings()]) {
          const due = await sendHeld(account, tried, Date.now(), at).catch(() => Date.now() + RETRY);
          if (due) next = next ? Math.min(next, due) : due;
        }
        // Timers longer than about 24 days go off at once: one that far looks again then.
        if (!stopped && next) timer = setTimeout(check, Math.min(Math.max(0, next - Date.now()) + 50, 2 ** 31 - 1));
      })
      .catch(() => undefined);
  };
  poke = check;
  const stops = [onMatrixChange(check), onXmppChange(check), onNostrDmChange(check)];
  check();
  return () => {
    stopped = true;
    if (timer) clearTimeout(timer);
    if (poke === check) poke = null;
    stops.forEach((stop) => stop());
  };
}
