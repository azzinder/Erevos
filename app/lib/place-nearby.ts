// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { currentSpace } from '../lock/keys';
import { nearby, NearHeard, SMS_LINK } from './nearby';

// Hidden chats and the phones nearby (lib/nearby.ts). The links belong to the phone, and what comes
// on them opens first in the open space's chats (lib/receiver.ts openNearby, the chat screen). What
// opens in none of them is tried here, in the hidden places that are open now (their chat screen)
// or receive while closed (lib/place-receiver.ts), each with its own chats; what opens in none of
// those either is kept in memory a while, unopened, as for another space (Nearby.hold), and tried
// again as a place opens. So a hidden place's packet is opened only while that place is open, or
// receives while closed; the space only ever holds it unopened, among strangers' packets, as bytes
// it cannot read, and no place of it is written anywhere.
//
// Nothing is said on the air for a hidden place: the links say only that an Erevos is there, with a
// nonce that changes (modules/erevos-radio), and a place's packets are the space's kind, spread and
// sent the same way. Where a place's contacts were heard is that place's own (NearHeard), in memory
// only while it is open or receives, and forgotten as it stops: never in the space's.

/** Opens a packet in a place: false when it is none of the place's. `link`: where it came, or null for one kept. */
export type PlaceOpener = (link: string | null, packet: Uint8Array) => Promise<boolean>;

type Entry = { space: number; pocket: number; open: PlaceOpener };

const openers = new Set<Entry>();
const heards = new Map<string, { heard: NearHeard; users: number }>();
const keyOf = (space: number, pocket: number) => `${space} ${pocket}`;

/**
 * Where the contacts of the hidden chats in `pocket` of `space` were heard nearby, while the
 * function it gives is not called yet by each that asked for it: the place's chat screen while it
 * is open, its receiver while it receives. Let go of by all, it is forgotten.
 */
export function placeNear(space: number, pocket: number): { heard: NearHeard; release: () => void } {
  const key = keyOf(space, pocket);
  const kept = heards.get(key) ?? { heard: new NearHeard(nearby), users: 0 };
  kept.users++;
  heards.set(key, kept);
  let released = false;
  return {
    heard: kept.heard,
    release: () => {
      if (released) return;
      released = true;
      kept.users--;
      if (kept.users > 0 || heards.get(key) !== kept) return;
      heards.delete(key);
      kept.heard.clear();
    },
  };
}

/** Has `open` try what came nearby for the hidden chats in `pocket` of `space` and opened in the space's chats, until the function it gives is called. */
export function openPlaceNearby(space: number, pocket: number, open: PlaceOpener): () => void {
  const entry: Entry = { space, pocket, open };
  openers.add(entry);
  return () => {
    openers.delete(entry);
  };
}

/**
 * Tries a packet that came on `link`, or was kept (null), and opened in none of the space's chats,
 * in the open space's hidden places that are open or receive. True when one took it. One by SMS is
 * none of theirs: they have no SMS.
 */
export async function openInPlaces(space: number, link: string | null, packet: Uint8Array): Promise<boolean> {
  if (link === SMS_LINK) return false;
  for (const entry of [...openers]) {
    if (entry.space !== space || !openers.has(entry)) continue;
    try {
      if (await entry.open(link, packet)) return true;
    } catch {
      // As one it could not open.
    }
  }
  return false;
}

/**
 * What came nearby on `link` and opened in none of the space's chats: tried in its open hidden
 * places, and when none takes it, kept unopened a while for another space or place (Nearby.hold).
 */
export async function unopenedNearby(link: string, packet: Uint8Array): Promise<void> {
  let space: number | null = null;
  try {
    space = currentSpace().space;
  } catch {
    // No space open: no place of one either.
  }
  if (space === null || !(await openInPlaces(space, link, packet))) nearby.hold(packet);
}

/** Tries what was kept nearby in one place, as it opens or starts to receive: what it opens is kept no longer. */
export async function openHeldIn(open: PlaceOpener): Promise<void> {
  for (const packet of nearby.heldPackets()) {
    let took = false;
    try {
      took = await open(null, packet);
    } catch {
      took = false;
    }
    if (took) nearby.dropHeld(packet);
  }
}
