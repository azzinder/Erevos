import { decryptText, encryptText, randomBytes } from '../lib/crypto';
import { createQueue, toHex, type Relay } from '../lib/relay';
import { secureGet, secureSet } from '../lib/secure';

import { POCKETS } from './sealed-file';
import { SLOTS } from './slots';

// Hidden chats that say a message came while Erevos is in the background (lib/hidden-notices.ts).
// They are closed then, and their key is not in memory, so what is waited on is kept with their
// space instead: a relay queue for each of its POCKETS pockets, in `erevos.watch.<n>`, sealed with
// the space's key and padded to whole blocks as its entry is (space-data.ts). A pocket whose chats
// asked for it has their own queue there; every other pocket has a queue made for nothing on the
// same relay, which no one writes to. So a space with a relay keeps POCKETS queues there whatever
// hidden chats it has, and whoever opens the space learns nothing of them from it. Only how many
// messages came is asked of the relay, as it counts them by what each send said, never for them:
// they stay there for the hidden chats to take.

/** A queue waited on: its relay, and its recipient id. */
export type Watched = { url: string; token: string; recipientHex: string };

/** A pocket's queue, or null while none is kept for it yet. */
export type WatchList = (Watched | null)[];

const BLOCK = 1024;
const entry = (space: number) => `erevos.watch.${space}`;

const isHex = (v: unknown): v is string => typeof v === 'string' && v.length === 48 && /^[0-9a-f]+$/.test(v);

function isWatched(value: unknown): value is Watched {
  const v = (value ?? {}) as Partial<Record<keyof Watched, unknown>>;
  return typeof v.url === 'string' && v.url !== '' && typeof v.token === 'string' && isHex(v.recipientHex);
}

function seal(key: Uint8Array, list: WatchList): string {
  const json = JSON.stringify(list);
  return encryptText(key, json.padEnd(Math.max(1, Math.ceil(json.length / BLOCK)) * BLOCK, ' '));
}

/** The space's queue for each pocket; none when the entry is missing or sealed with another key. */
export async function loadWatched(space: number, key: Uint8Array): Promise<WatchList> {
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
    return isWatched(value) ? value : null;
  });
}

/** Every space up to `count` (and SLOTS) has the entry, used or not: sealed with a random key until used. */
export async function prepareWatchEntries(count = SLOTS): Promise<void> {
  for (let space = 0; space < Math.max(SLOTS, count); space++) {
    if (!(await secureGet(entry(space)))) await secureSet(entry(space), seal(randomBytes(32), []));
  }
}

// Changes run one after another, each on what the one before left.
const writes = new Map<number, Promise<unknown>>();

function change(space: number, key: Uint8Array, update: (list: WatchList) => Promise<WatchList>): Promise<WatchList> {
  const run = (writes.get(space) ?? Promise.resolve())
    .catch(() => undefined)
    .then(async () => {
      const list = await update(await loadWatched(space, key));
      await secureSet(entry(space), seal(key, list));
      return list;
    });
  writes.set(space, run);
  return run;
}

/** A queue made for nothing on `relay`, which no one is given. */
async function madeForNothing(relay: Relay): Promise<Watched> {
  const ids = await createQueue(relay);
  return { url: relay.url, token: relay.token ?? '', recipientHex: toHex(ids.recipientId) };
}

/** Gives every pocket with no queue one made for nothing on `relay`. Throws when the relay cannot be reached. */
export function fillWatched(space: number, key: Uint8Array, relay: Relay): Promise<WatchList> {
  return change(space, key, async (list) => {
    const out = [...list];
    for (let pocket = 0; pocket < POCKETS; pocket++) if (!out[pocket]) out[pocket] = await madeForNothing(relay);
    return out;
  });
}

/**
 * Has the relay waited on for a pocket's own queue (`own`), and gives the other pockets with none
 * a queue made for nothing beside it. Saves nothing and throws when the relay cannot be reached.
 */
export function watchPocket(space: number, key: Uint8Array, pocket: number, own: Watched): Promise<WatchList> {
  const relay: Relay = { url: own.url, token: own.token || undefined };
  return change(space, key, async (list) => {
    const out = [...list];
    out[pocket] = own;
    for (let other = 0; other < POCKETS; other++) if (!out[other]) out[other] = await madeForNothing(relay);
    return out;
  });
}

/**
 * Stops waiting on a pocket's own queue: a queue made for nothing on `relay` takes its place, or,
 * when there is no relay or it cannot be reached, none, until fillWatched gives it one.
 */
export function unwatchPocket(space: number, key: Uint8Array, pocket: number, relay: Relay | null): Promise<WatchList> {
  return change(space, key, async (list) => {
    const out = [...list];
    out[pocket] = relay ? await madeForNothing(relay).catch(() => null) : null;
    return out;
  });
}

/** Whether a pocket's chats say a message came: whether their own queue is the one kept for it. */
export function isWatchedQueue(list: WatchList, pocket: number, recipientHex: string | undefined): boolean {
  return !!recipientHex && list[pocket]?.recipientHex === recipientHex;
}
