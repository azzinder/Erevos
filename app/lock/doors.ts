import { decryptText, encryptText, fromHex, randomBytes, toHex } from '../lib/crypto';
import type { News, TorWay } from '../lib/relay';
import { secureGet, secureSet } from '../lib/secure';

import { heardText, isWatched, type Watched } from './hidden-watch';
import { SLOTS } from './slots';
import { torWayOf } from './space-data';

// A space that says a message came while another is open (lib/closed-notices.ts): it is closed
// then, and its key is not in memory, so what is waited on for it is kept outside it, in
// `erevos.door.<n>`: its queues at its relay, as lock/hidden-watch.ts keeps a pocket's, and whether
// it goes through Tor. Never its keys, its contacts or its messages. A space whose door is open
// seals it with the phone's door key (`erevos.doors-key`), which every space reads; every other
// space's entry is sealed with a random key, and all are padded to whole blocks, so the entries
// say nothing of which spaces there are or which let themselves be heard. Only the open space's
// code, trying the door key on each, tells them apart.

/** What is waited on for a closed space: its queues, and whether it goes through Tor (lib/relay.ts TorWay). */
export type Door = { tor: TorWay; queues: Watched[] };

/** A space's own queue, its contact link's, its groups' and its public groups'. */
export const DOOR_QUEUES = 4;

const BLOCK = 2048;
const KEY = 'erevos.doors-key';
const entry = (space: number) => `erevos.door.${space}`;
// Spaces past SLOTS have an entry once a second password made them (prepareDoors); no more than this.
const MOST_SPACES = 32;

function seal(key: Uint8Array, door: Door | null): string {
  const json = JSON.stringify(door ?? []);
  return encryptText(key, json.padEnd(Math.max(1, Math.ceil(json.length / BLOCK)) * BLOCK, ' '));
}

function checkedDoor(value: unknown): Door | null {
  const v = (value ?? {}) as Partial<Record<keyof Door, unknown>>;
  if (!Array.isArray(v.queues)) return null;
  const queues = v.queues.filter(isWatched).slice(0, DOOR_QUEUES);
  return queues.length > 0 ? { tor: torWayOf(v.tor), queues } : null;
}

async function doorKey(): Promise<Uint8Array | null> {
  const hex = await secureGet(KEY).catch(() => null);
  return hex && /^[0-9a-f]{64}$/.test(hex) ? fromHex(hex) : null;
}

// The phone's door key, made the first time it is asked for.
async function madeDoorKey(): Promise<Uint8Array> {
  const kept = await doorKey();
  if (kept) return kept;
  const key = randomBytes(32);
  await secureSet(KEY, toHex(key));
  return key;
}

/** Every space up to `count` (and SLOTS) has the entry, with its door shut, and the phone has its door key. */
export async function prepareDoors(count = SLOTS): Promise<void> {
  await madeDoorKey();
  for (let space = 0; space < Math.min(MOST_SPACES, Math.max(SLOTS, count)); space++) {
    if (!(await secureGet(entry(space)))) await secureSet(entry(space), seal(randomBytes(32), null));
  }
}

/** The space's door, or null while it is shut. */
export async function loadDoor(space: number): Promise<Door | null> {
  const [key, raw] = await Promise.all([doorKey(), secureGet(entry(space))]);
  if (!key || !raw) return null;
  try {
    return checkedDoor(JSON.parse(decryptText(key, raw)));
  } catch {
    // Shut: sealed with a random key.
    return null;
  }
}

/** The spaces whose door is open, but `open`'s, the one open now. */
export async function openDoors(open: number): Promise<{ space: number; door: Door }[]> {
  const found: { space: number; door: Door }[] = [];
  for (let space = 0; space < MOST_SPACES; space++) {
    if (!(await secureGet(entry(space)))) {
      if (space >= SLOTS) break;
      continue;
    }
    const door = space === open ? null : await loadDoor(space);
    if (door) found.push({ space, door });
  }
  return found;
}

// Changes run one after another, each on what the one before left.
let writes: Promise<unknown> = Promise.resolve();

function change(space: number, update: (door: Door | null) => Door | null): Promise<void> {
  const run = writes
    .catch(() => undefined)
    .then(async () => {
      const key = await madeDoorKey();
      const next = update(await loadDoor(space));
      await secureSet(entry(space), next ? seal(key, next) : seal(randomBytes(32), null));
    });
  writes = run;
  return run;
}

/**
 * Opens the space's door with these queues, or shuts it (null). What was heard of a queue kept
 * again stays, unless `fresh`: then all is heard anew, as when the space has just read what came.
 */
export function saveDoor(space: number, door: Door | null, fresh = false): Promise<void> {
  return change(space, (was) => {
    if (!door) return null;
    const queues = door.queues.slice(0, DOOR_QUEUES).map((queue) => {
      const { heard: _given, ...rest } = queue;
      const kept = fresh ? undefined : was?.queues.find((old) => old.recipientHex === queue.recipientHex && old.url === queue.url)?.heard;
      return kept ? { ...rest, heard: kept } : rest;
    });
    return queues.length > 0 ? { tor: door.tor, queues } : null;
  });
}

/** Shuts the doors of the spaces past `space`, which no password opens any more (lock/config.ts). */
export async function shutDoorsPast(space: number): Promise<void> {
  for (let next = space + 1; next < MOST_SPACES; next++) {
    if (!(await secureGet(entry(next)))) {
      if (next >= SLOTS) break;
      continue;
    }
    if (await loadDoor(next)) await saveDoor(next, null);
  }
}

/** Keeps what the relay said came into one of a closed space's queues, while its door still has it. */
export function hearDoor(space: number, recipientHex: string, news: News): Promise<void> {
  return change(space, (door) => {
    if (!door || !door.queues.some((queue) => queue.recipientHex === recipientHex)) return door;
    return { ...door, queues: door.queues.map((queue) => (queue.recipientHex === recipientHex ? { ...queue, heard: heardText(news) } : queue)) };
  });
}
