import { randomBytes } from '../lib/crypto';
import { createQueue, deleteQueue, fromHex, toHex, type Relay } from '../lib/relay';
import { decryptText, encryptText } from '../lib/crypto';
import { secureGet, secureSet } from '../lib/secure';

import { POCKETS } from './sealed-file';
import { SLOTS } from './slots';

// Hidden chats whose contacts' calls ring while the chats are closed (lib/hidden-ring-notices.ts).
// Like the message notice (hidden-watch.ts), a pocket keeps a relay queue of its own, used only for
// call rings, kept with the space in `erevos.ring.<n>`, sealed with the space's key and padded to
// whole blocks. A pocket that rings has its own ring queue there; every other pocket has a queue
// made for nothing on the same relay, which no one writes to. So a space with a ring queue keeps
// POCKETS queues there whatever hidden chats it has, and whoever opens the space learns nothing of
// them from it. In the background the relay is only asked whether something waits on a ring queue,
// never what: a caller that calls a hidden contact sends a ring there, random bytes of a call
// offer's size (lib/space-chats.ts ringOffer), and the phone rings. What waits there is never
// opened, only drained and dropped once the chats open, so a ring queue needs no key.

/** A pocket's ring queue: its relay, the recipient id waited on and drained, and the sender id a
 *  contact writes a ring with. */
export type Ringed = { url: string; token: string; recipientHex: string; senderHex: string };

/** A pocket's ring queue, or null while none is kept for it yet. */
export type RingList = (Ringed | null)[];

const BLOCK = 1024;
const entry = (space: number) => `erevos.ring.${space}`;

const isHex = (v: unknown): v is string => typeof v === 'string' && v.length === 48 && /^[0-9a-f]+$/.test(v);

function isRinged(value: unknown): value is Ringed {
  const v = (value ?? {}) as Partial<Record<keyof Ringed, unknown>>;
  return typeof v.url === 'string' && v.url !== '' && typeof v.token === 'string' && isHex(v.recipientHex) && isHex(v.senderHex);
}

function seal(key: Uint8Array, list: RingList): string {
  const json = JSON.stringify(list);
  return encryptText(key, json.padEnd(Math.max(1, Math.ceil(json.length / BLOCK)) * BLOCK, ' '));
}

/** The space's ring queue for each pocket; none when the entry is missing or sealed with another key. */
export async function loadRinged(space: number, key: Uint8Array): Promise<RingList> {
  let kept: unknown = null;
  const raw = await secureGet(entry(space));
  if (raw) {
    try {
      kept = JSON.parse(decryptText(key, raw));
    } catch {
      // Sealed with a random key: a space not in use, or not yet set.
    }
  }
  return Array.from({ length: POCKETS }, (_, pocket) => {
    const value = Array.isArray(kept) ? kept[pocket] : null;
    return isRinged(value) ? value : null;
  });
}

/** Every space up to `count` (and SLOTS) has the entry, used or not: sealed with a random key until used. */
export async function prepareRingEntries(count = SLOTS): Promise<void> {
  for (let space = 0; space < Math.max(SLOTS, count); space++) {
    if (!(await secureGet(entry(space)))) await secureSet(entry(space), seal(randomBytes(32), []));
  }
}

// Changes run one after another, each on what the one before left.
const writes = new Map<number, Promise<unknown>>();

function change(space: number, key: Uint8Array, update: (list: RingList) => Promise<RingList>): Promise<RingList> {
  const run = (writes.get(space) ?? Promise.resolve())
    .catch(() => undefined)
    .then(async () => {
      const list = await update(await loadRinged(space, key));
      await secureSet(entry(space), seal(key, list));
      return list;
    });
  writes.set(space, run);
  return run;
}

/** A ring queue made for nothing on `relay`, which no one is given. */
async function madeForNothing(relay: Relay): Promise<Ringed> {
  const ids = await createQueue(relay);
  return { url: relay.url, token: relay.token ?? '', recipientHex: toHex(ids.recipientId), senderHex: toHex(ids.senderId) };
}

/** Gives every pocket with no ring queue one made for nothing on `relay`. Throws when the relay cannot be reached. */
export function fillRinged(space: number, key: Uint8Array, relay: Relay): Promise<RingList> {
  return change(space, key, async (list) => {
    const out = [...list];
    for (let pocket = 0; pocket < POCKETS; pocket++) if (!out[pocket]) out[pocket] = await madeForNothing(relay);
    return out;
  });
}

/**
 * Keeps a pocket's own ring queue (`own`), and gives the other pockets with none a queue made for
 * nothing beside it. Saves nothing and throws when the relay cannot be reached.
 */
export function ringPocket(space: number, key: Uint8Array, pocket: number, own: Ringed): Promise<RingList> {
  const relay: Relay = { url: own.url, token: own.token || undefined };
  return change(space, key, async (list) => {
    const out = [...list];
    out[pocket] = own;
    for (let other = 0; other < POCKETS; other++) if (!out[other]) out[other] = await madeForNothing(relay);
    return out;
  });
}

/**
 * A pocket that rings moved its queues for a contact deleted or blocked there, or junk
 * (lib/queue-move.ts): a new ring queue on `relay` takes the place of the one before
 * (`recipientHex`), which is deleted at once rather than kept a while, so the one deleted can no
 * longer ring the phone. The other pockets' stay as they are. Says the new one; throws, with
 * nothing changed, when the relay cannot be reached.
 */
export async function moveRingPocket(space: number, key: Uint8Array, pocket: number, relay: Relay, recipientHex: string): Promise<Ringed> {
  const made = await madeForNothing(relay);
  await ringPocket(space, key, pocket, made);
  await deleteQueue(relay, fromHex(recipientHex)).catch(() => undefined);
  return made;
}

/**
 * Stops ringing for a pocket: a queue made for nothing on `relay` takes its place, or, when there
 * is no relay or it cannot be reached, none, until fillRinged gives it one.
 */
export function unringPocket(space: number, key: Uint8Array, pocket: number, relay: Relay | null): Promise<RingList> {
  return change(space, key, async (list) => {
    const out = [...list];
    out[pocket] = relay ? await madeForNothing(relay).catch(() => null) : null;
    return out;
  });
}

/** Whether a pocket's chats ring: whether their own ring queue is the one kept for it. */
export function isRingedQueue(list: RingList, pocket: number, recipientHex: string | undefined): boolean {
  return !!recipientHex && list[pocket]?.recipientHex === recipientHex;
}
