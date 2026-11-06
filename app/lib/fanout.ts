// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { fromBase64 } from './crypto';
import type { E2E, Outgoing } from './e2e';
import type { HeldCopy } from '../lock/e2e-data';
import { CannotHoldError, fromHex, isQueueFull, isQueueNotFound, RelaySends, RelayUnreachableError, sendMessageLater, type Relay } from './relay';
import { contactTarget } from './space-chats';

// The copies of what the space's chat sealed for the endpoints of contacts' accounts (lib/e2e.ts,
// docs/multi-device.md) go to the relay here, oldest first, each endpoint's in its order, to where
// it reads as the way to it says now. One the relay cannot take now holds back only the rest of
// that endpoint's, until the next look; a relay that cannot be reached, only what goes through it.
// One whose queue the relay says is full stays too, but the chat is told: nothing new is copied to
// that endpoint while one waits for it, and those that wait give way first should the outbox fill
// (lib/e2e.ts roomFor), until the relay takes one. One whose queue the relay does not have, or that
// no relay this phone reaches can take (one on another relay whose key is not known), goes, with
// the rest of that endpoint's, and nothing more is sealed for it until where it reads is said
// again. A copy older than the relay keeps a message goes unsent. A device and a place that only
// fills the list are written to alike: the relay takes both, each told what it carries as the copy
// says (lib/relay.ts, Mark): the last packet of a message someone reads as one, all else quiet.
// Those for one relay go on one connection (lib/relay.ts RelaySends). A copy of a message sent for
// later (`due`) is handed to the relay to hold till its time, as the one for the account was
// (lib/waiting.ts, holdLater), and the chat keeps where, to take it back with that one.

// A copy sent for later whose time is closer than this goes now: it would be held for nothing.
const SOON = 1000;

const runs = new WeakMap<E2E, { run: Promise<number>; again: boolean }>();

/** Sends the copies that wait, through `sends`, the relay this phone sends through. Says how many the relay took. A call while one is under way has it look again once it is done. */
export function sendCopies(e2e: E2E, sends: Relay): Promise<number> {
  const under = runs.get(e2e);
  if (under) {
    under.again = true;
    return under.run;
  }
  const state = { run: Promise.resolve(0), again: false };
  state.run = (async () => {
    let went = 0;
    do {
      state.again = false;
      went += await sendOnce(e2e, sends);
    } while (state.again);
    return went;
  })().finally(() => runs.delete(e2e));
  runs.set(e2e, state);
  return state.run;
}

async function sendOnce(e2e: E2E, sends: Relay): Promise<number> {
  const copies = e2e.copies();
  if (copies.length === 0) return 0;
  const sent: Outgoing[] = [];
  const gone: Outgoing[] = [];
  const full: Outgoing[] = [];
  const held = new Set<string>();
  const down = new Set<string>();
  const relay = new RelaySends();
  const later: HeldCopy[] = [];
  try {
    for (const copy of copies) {
      const way = `${copy.c}|${copy.w}`;
      if (held.has(way) || down.has(copy.relay)) continue;
      let to: Relay;
      try {
        to = contactTarget(sends, { relay: copy.relay, relayKey: copy.rk });
      } catch {
        held.add(way);
        gone.push(copy);
        continue;
      }
      try {
        // A relay from before LATER takes it now: their device shows it at its time all the same (lib/later.ts, showsAt).
        const held =
          copy.due && copy.t && copy.due > Date.now() + SOON
            ? await sendMessageLater(to, fromHex(copy.s), [fromBase64(copy.p)], copy.due, copy.mark ?? 'quiet').catch((error) => {
                if (error instanceof CannotHoldError) return null;
                throw error;
              })
            : null;
        if (held) later.push({ ...held, at: copy.due!, c: copy.c, t: copy.t! });
        else await relay.send(to, fromHex(copy.s), fromBase64(copy.p), copy.mark ?? 'quiet');
        sent.push(copy);
      } catch (error) {
        held.add(way);
        if (isQueueNotFound(error)) gone.push(copy);
        else if (isQueueFull(error)) full.push(copy);
        else if (error instanceof RelayUnreachableError) down.add(copy.relay);
      }
    }
  } finally {
    relay.close();
  }
  if (later.length > 0) await e2e.copiesHeld(later);
  if (sent.length + gone.length + full.length > 0) await e2e.copiesSent(sent, gone, full);
  return sent.length;
}
