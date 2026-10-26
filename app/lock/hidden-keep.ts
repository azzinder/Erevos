import { decryptText, encryptText, fromHex, randomBytes, toHex } from '../lib/crypto';
import { secureGet, secureSet } from '../lib/secure';

import { POCKETS } from './sealed-file';
import { SLOTS } from './slots';
import { opensHidden } from './space-data';

// Hidden chats that receive while they are closed (lib/place-receiver.ts): their switch, "Receive
// while closed", keeps their key with their space, in `erevos.keep.<space>`, sealed with the space's
// key: one key for each of its POCKETS pockets, the key of the hidden chats there when they receive,
// a random one of the same length otherwise. So whoever opens the space finds four keys whatever
// hidden chats it has, and cannot tell from them which pockets are set or which receive. Only the
// hidden chats' own entry tells a kept key from a random one, as it opens with it (opensHidden),
// which the open space's code tries for each pocket. A space whose entry is still sealed with a
// random key (prepareKeepEntries) gets one sealed with its own as it opens (keptPlaces), so neither
// does the entry say whether any switch was ever on.

const entry = (space: number) => `erevos.keep.${space}`;

const randomList = () => Array.from({ length: POCKETS }, () => randomBytes(32));

function seal(key: Uint8Array, list: Uint8Array[]): string {
  return encryptText(key, JSON.stringify(list.map(toHex)));
}

// The space's keys, or null when its entry is missing, or sealed with another key.
async function load(space: number, key: Uint8Array): Promise<Uint8Array[] | null> {
  const raw = await secureGet(entry(space));
  if (!raw) return null;
  let kept: unknown;
  try {
    kept = JSON.parse(decryptText(key, raw));
  } catch {
    return null;
  }
  if (!Array.isArray(kept)) return null;
  return Array.from({ length: POCKETS }, (_, pocket) => {
    const hex = kept[pocket];
    return typeof hex === 'string' && /^[0-9a-f]{64}$/.test(hex) ? fromHex(hex) : randomBytes(32);
  });
}

/** Every space up to `count` (and SLOTS) has the entry, used or not: sealed with a random key until its space opens. */
export async function prepareKeepEntries(count = SLOTS): Promise<void> {
  for (let space = 0; space < Math.max(SLOTS, count); space++) {
    if (!(await secureGet(entry(space)))) await secureSet(entry(space), seal(randomBytes(32), randomList()));
  }
}

// Changes run one after another, each on what the one before left.
const writes = new Map<number, Promise<unknown>>();
const listeners = new Set<() => void>();

// `quiet`: no switch changed, so no one is told.
function change(space: number, key: Uint8Array, update: (list: Uint8Array[]) => Uint8Array[], quiet = false): Promise<Uint8Array[]> {
  const run = (writes.get(space) ?? Promise.resolve())
    .catch(() => undefined)
    .then(async () => {
      const list = update((await load(space, key)) ?? randomList());
      await secureSet(entry(space), seal(key, list));
      return list;
    });
  writes.set(space, run);
  return quiet ? run : run.finally(() => listeners.forEach((listener) => listener()));
}

/** Has the hidden chats in `pocket` receive while closed, with their key (`placeKey`), or no longer (null). */
export async function keepPlace(space: number, key: Uint8Array, pocket: number, placeKey: Uint8Array | null): Promise<void> {
  await change(space, key, (list) => list.map((kept, at) => (at === pocket ? (placeKey ? placeKey.slice() : randomBytes(32)) : kept)));
}

/** Whether the hidden chats in `pocket`, open with `placeKey`, receive while closed. */
export async function keepsPlace(space: number, key: Uint8Array, pocket: number, placeKey: Uint8Array): Promise<boolean> {
  const kept = (await load(space, key))?.[pocket];
  return !!kept && kept.length === placeKey.length && kept.every((byte, i) => byte === placeKey[i]);
}

/**
 * The hidden chats of the open space that receive while closed: each pocket's kept key, tried on its
 * hidden chats' entry, every pocket every time. An entry still sealed with a random key is sealed
 * with the space's own first.
 */
export async function keptPlaces(space: number, key: Uint8Array): Promise<{ pocket: number; key: Uint8Array }[]> {
  let list = await load(space, key);
  if (!list) list = await change(space, key, (fresh) => fresh, true);
  const found: { pocket: number; key: Uint8Array }[] = [];
  for (let pocket = 0; pocket < POCKETS; pocket++) if (await opensHidden(space, pocket, list[pocket])) found.push({ pocket, key: list[pocket] });
  return found;
}

/** Calls `listener` each time a pocket's switch changes. Returns how to stop. */
export function onKeptChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
