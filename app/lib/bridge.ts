// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// The bridge, on the side of the phone with no internet (lib/nearby.ts says how it goes): when its
// relay cannot be reached, a phone beside it that has internet, and said it reads for others, takes
// what waits in its queue on the relay and hands it over nearby. A contact's phone does it with no
// question. A stranger's, only once the owner said yes to that phone, asked once for each, and
// only while Erevos is in front; the answer lasts while the phones stay linked. Never for a relay
// reached only through Tor (mayReadThrough). Hidden chats too (the owner's word, 2026-11-16), but
// only through the phone of one of their own contacts, or one the owner said yes to for them: a
// contact of the space is a stranger to them, so it never learns their queue unasked.

import { nearby, type NearHeard } from './nearby';
import { ackThrough, mayReadThrough, receiveThrough, type ReadThrough, type Relay } from './relay';

// The owner's answer for each phone nearby asked about, by where it reads for (the space, or hidden
// chats) and link, while it is linked.
const answered = new Map<string, boolean>();
let asking = false;
// Whether Erevos is in front, and how the owner is asked: set with the links (lib/nearby-links.ts).
let inFront: () => boolean = () => false;
let askOwner: () => Promise<boolean> = async () => false;

/** How to tell whether Erevos is in front, and to ask the owner about a stranger's phone. */
export function setBridgeAsk(front: () => boolean, ask: () => Promise<boolean>): void {
  inFront = front;
  askOwner = ask;
}

/** Whether the phone on `link` may read this phone's queue: a contact's, or one the owner said yes to. Asks for a stranger's once, while Erevos is in front. */
export async function mayBridge(link: string, front = inFront(), ask = askOwner, near?: NearHeard): Promise<boolean> {
  if (near ? near.hasLink(link) : nearby.isContactLink(link)) return true;
  const key = `${near ? 'hidden' : 'space'} ${link}`;
  const said = answered.get(key);
  if (said !== undefined) return said;
  if (!front || asking) return false;
  asking = true;
  try {
    const yes = await ask();
    answered.set(key, yes);
    return yes;
  } finally {
    asking = false;
  }
}

/** Forgets the owner's answers: the links went, as when the space closed. */
export function forgetBridges(): void {
  answered.clear();
}

/**
 * Takes what waits in the queue `recipient` on `relay` through a phone nearby that may (mayBridge),
 * `most` at most, each with `take`. Says how many came. Nothing when there is no such phone, or the
 * relay may not be read so (mayReadThrough). For hidden chats, `near`: where their contacts were heard.
 */
export async function readNearby(relay: Relay, recipient: Uint8Array, take: (bytes: Uint8Array) => Promise<unknown>, most: number, stop: () => boolean = () => false, near?: NearHeard): Promise<number> {
  if (!mayReadThrough(relay)) return 0;
  for (const link of nearby.bridgeLinks()) {
    if (stop() || !(await mayBridge(link, undefined, undefined, near))) continue;
    const through: ReadThrough = (url, key, bytes) => nearby.readThrough(link, url, key, bytes);
    let taken = 0;
    try {
      for (; taken < most && !stop(); taken++) {
        const bytes = await receiveThrough(relay, recipient, through);
        if (!bytes) break;
        await take(bytes);
      }
      await ackThrough(relay, recipient, through);
      return taken;
    } catch {
      // That phone could not: the next one, with what came kept as it is.
      if (taken > 0) return taken;
    }
  }
  return 0;
}
