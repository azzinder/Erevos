// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { decryptText, encryptText, randomBytes } from '../lib/crypto';
import { createQueue, toHex, type News, type Relay } from '../lib/relay';
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
// they stay there for the hidden chats to take. What the relay last said came is kept with the
// queue (`heard`), so what was told of is not told of again once Erevos starts anew. A queue the
// relay no longer has is given one made for nothing in its place, which keeps the first 16 hex
// digits of the lost one (`was`), the same for every pocket, so the chats whose queue it was still
// find their switch on, and wait on their queue again once they open or move it.

/**
 * A queue waited on: its relay, its recipient id, and what the relay last said came into it (round,
 * messages, sends that did not say, rings, each as 8 hex digits, so every entry is of one length).
 */
export type Watched = { url: string; token: string; recipientHex: string; heard?: string; was?: string };

/** A pocket's queue, or null while none is kept for it yet. */
export type WatchList = (Watched | null)[];

const BLOCK = 1024;
const entry = (space: number) => `erevos.watch.${space}`;

const isHex = (v: unknown): v is string => typeof v === 'string' && v.length === 48 && /^[0-9a-f]+$/.test(v);

const NOTHING_HEARD = '0'.repeat(32);

/** Whether `v` is what is kept of what the relay said came (heardText), or nothing. */
export const isHeardText = (v: unknown): boolean => v === undefined || (typeof v === 'string' && /^[0-9a-f]{32}$/.test(v));
const isHeard = isHeardText;

const isWas = (v: unknown) => v === undefined || (typeof v === 'string' && /^[0-9a-f]{16}$/.test(v));

const wasOf = (recipientHex: string) => recipientHex.slice(0, 16);

// Kept for every queue, lost or not, so every entry is of one length whatever was lost.
const NOTHING_LOST = '0'.repeat(16);

/** Whether `value` is a queue waited on, as kept. */
export function isWatched(value: unknown): value is Watched {
  const v = (value ?? {}) as Partial<Record<keyof Watched, unknown>>;
  return typeof v.url === 'string' && v.url !== '' && typeof v.token === 'string' && isHex(v.recipientHex) && isHeard(v.heard) && isWas(v.was);
}

/** What the relay last said came into a queue waited on, or null when it has said nothing yet. */
export function heardOf(kept: Pick<Watched, 'heard'>): News | null {
  if (!kept.heard || kept.heard === NOTHING_HEARD) return null;
  const [round, messages, unmarked, rings] = [0, 8, 16, 24].map((at) => parseInt(kept.heard!.slice(at, at + 8), 16));
  return { round, messages, unmarked, rings };
}

/** What the relay said came, as kept with a queue (Watched heard). */
export const heardText = (news: News) => [news.round, news.messages, news.unmarked, news.rings].map((n) => (n >>> 0).toString(16).padStart(8, '0')).join('');

function seal(key: Uint8Array, list: WatchList): string {
  const json = JSON.stringify(list.map((kept) => kept && { ...kept, heard: kept.heard ?? NOTHING_HEARD, was: kept.was ?? NOTHING_LOST }));
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
    if (!isWatched(value)) return null;
    const { heard, was, ...rest } = value;
    return { ...rest, ...(heard && heard !== NOTHING_HEARD ? { heard } : {}), ...(was && was !== NOTHING_LOST ? { was } : {}) };
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
    // The same queue again keeps what was heard of it.
    out[pocket] = list[pocket]?.recipientHex === own.recipientHex ? { ...own, heard: list[pocket]!.heard } : own;
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

/**
 * The relay no longer has a pocket's queue (`recipientHex`): one made for nothing on `relay` takes
 * its place, which keeps whose it was (the first lost one, if it was lost before). Nothing changes
 * when another queue took its place meanwhile. Throws, saving nothing, when the relay cannot be reached.
 */
export function lostPocket(space: number, key: Uint8Array, pocket: number, recipientHex: string, relay: Relay): Promise<WatchList> {
  return change(space, key, async (list) => {
    const kept = list[pocket];
    if (kept?.recipientHex !== recipientHex) return list;
    const out = [...list];
    out[pocket] = { ...(await madeForNothing(relay)), was: kept.was ?? wasOf(recipientHex) };
    return out;
  });
}

/** Waits on a pocket's own queue again (`own`), while its slot still says it was lost there; else changes nothing. */
export function rewatchLost(space: number, key: Uint8Array, pocket: number, own: Watched): Promise<WatchList> {
  return change(space, key, async (list) => {
    if (list[pocket]?.was !== wasOf(own.recipientHex)) return list;
    const out = [...list];
    out[pocket] = own;
    return out;
  });
}

/** Keeps what the relay said came into a pocket's queue (`recipientHex`), while that is still the one waited on. */
export function hearPocket(space: number, key: Uint8Array, pocket: number, recipientHex: string, news: News): Promise<WatchList> {
  return change(space, key, async (list) => {
    const kept = list[pocket];
    if (kept?.recipientHex !== recipientHex) return list;
    const out = [...list];
    out[pocket] = { ...kept, heard: heardText(news) };
    return out;
  });
}

/** Whether a pocket's chats say a message came: whether their own queue is the one kept for it. */
export function isWatchedQueue(list: WatchList, pocket: number, recipientHex: string | undefined): boolean {
  return !!recipientHex && list[pocket]?.recipientHex === recipientHex;
}

/** Whether a pocket's chats asked to say a message came: their own queue is kept for it, or was, until the relay lost it. */
export function wasWatchedQueue(list: WatchList, pocket: number, recipientHex: string | undefined): boolean {
  return isWatchedQueue(list, pocket, recipientHex) || (!!recipientHex && list[pocket]?.was === wasOf(recipientHex));
}
