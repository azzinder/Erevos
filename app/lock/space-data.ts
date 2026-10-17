import { decryptText, encryptText, randomBytes } from '../lib/crypto';
import { secureDelete, secureGet, secureSet } from '../lib/secure';

import { currentSpace, loadOpenKey, newSpaceKey, saveOpenKey } from './keys';
import { SLOTS } from './slots';

// What each space keeps on the phone: the relay it uses, its own relay queue and its contacts,
// which the chat screen saves. One keystore entry per password slot, `erevos.space.<n>`, sealed
// with that space's key (keys.ts). Once the lock is on, every slot up to SLOTS has an entry, the
// unused ones sealed with random keys, and every entry is padded to whole blocks of BLOCK
// characters, so a used space's entry looks like an unused one. One entry per slot rather than
// one for all (slots.ts), because expo-secure-store warns that values above 2048 bytes may fail.
//
// A second space starts empty and takes nothing from the space it was set in: not its relay,
// its queue or its contacts. The chat history, once the chat keeps one, needs a database per
// space sealed the same way.
//
// Every space also has hidden chats (hidden.ts), kept the same way in `erevos.hidden.<n>`, sealed
// with their own key.

export type Queue = { recipientHex: string; senderHex: string };
export type SpaceData = { url: string; token: string; ownQueue: Queue | null; routes: Record<string, string> };

export const EMPTY_SPACE: SpaceData = { url: '', token: '', ownQueue: null, routes: {} };

const BLOCK = 1024;
const entry = (space: number) => `erevos.space.${space}`;
const hiddenEntry = (space: number) => `erevos.hidden.${space}`;
// Where the chat kept its settings before there were spaces, unsealed. They move into the first space.
const OLDER_ENTRY = 'erevos.relay';

function seal(key: Uint8Array, data: SpaceData): string {
  const json = JSON.stringify(data);
  return encryptText(key, json.padEnd(Math.max(1, Math.ceil(json.length / BLOCK)) * BLOCK, ' '));
}

const isHex = (v: unknown, length: number): v is string => typeof v === 'string' && v.length === length && /^[0-9a-f]+$/.test(v);

/** What was stored, with anything of the wrong shape left out. */
function checked(value: unknown): SpaceData {
  const v = (value ?? {}) as Partial<Record<keyof SpaceData, unknown>>;
  const q = v.ownQueue as Partial<Queue> | null | undefined;
  const routes: Record<string, string> = {};
  if (v.routes && typeof v.routes === 'object') {
    for (const [peer, sender] of Object.entries(v.routes)) if (isHex(sender, 48)) routes[peer] = sender;
  }
  return {
    url: typeof v.url === 'string' ? v.url : '',
    token: typeof v.token === 'string' ? v.token : '',
    ownQueue: q && isHex(q.recipientHex, 48) && isHex(q.senderHex, 48) ? { recipientHex: q.recipientHex, senderHex: q.senderHex } : null,
    routes,
  };
}

/** An entry's data, or an empty one when the entry is missing or sealed with another key. */
async function load(name: string, key: Uint8Array): Promise<SpaceData> {
  const raw = await secureGet(name);
  if (!raw) return { ...EMPTY_SPACE };
  try {
    return checked(JSON.parse(decryptText(key, raw)));
  } catch {
    return { ...EMPTY_SPACE };
  }
}

/** Gives an entry a value sealed with a random key, unless it has one. */
async function ensure(name: string): Promise<void> {
  if (!(await secureGet(name))) await secureSet(name, seal(randomBytes(32), EMPTY_SPACE));
}

export const loadSpaceData = (space: number, key: Uint8Array) => load(entry(space), key);

export async function saveSpaceData(space: number, key: Uint8Array, data: SpaceData): Promise<void> {
  await secureSet(entry(space), seal(key, data));
}

export const loadHiddenData = (space: number, key: Uint8Array) => load(hiddenEntry(space), key);

export async function saveHiddenData(space: number, key: Uint8Array, data: SpaceData): Promise<void> {
  await secureSet(hiddenEntry(space), seal(key, data));
}

/** Every space up to `count` (and SLOTS) has a hidden chats entry, used or not. */
export async function prepareHiddenEntries(count: number): Promise<void> {
  for (let space = 0; space < Math.max(SLOTS, count); space++) await ensure(hiddenEntry(space));
}

/** The open space's data (keys.ts says which space is open). */
export async function loadCurrentSpaceData(): Promise<SpaceData> {
  const { space, key } = currentSpace();
  return loadSpaceData(space, key);
}

export async function saveCurrentSpaceData(data: SpaceData): Promise<void> {
  const { space, key } = currentSpace();
  await saveSpaceData(space, key, data);
}

// The spaces from `from` on, up to SLOTS, have entries from now on, used or not: sealed with
// random keys no one has, until a password opens one.
export async function prepareSpaces(from: number): Promise<void> {
  for (let space = from; space < Math.max(SLOTS, from + 1); space++) await ensure(entry(space));
}

// The key the first space opens with when no lock is on: the one in its keystore slot once the
// space has its entry, else a new one, saved there, with what the chat kept before there were spaces.
export async function firstSpaceKey(): Promise<Uint8Array> {
  if (await secureGet(entry(0))) return loadOpenKey(0);
  const key = newSpaceKey();
  await saveOpenKey(0, key);
  let older = EMPTY_SPACE;
  const raw = await secureGet(OLDER_ENTRY);
  if (raw) {
    try {
      older = checked(JSON.parse(raw));
    } catch {
      // Nothing usable was kept.
    }
  }
  await saveSpaceData(0, key, older);
  if (raw) await secureDelete(OLDER_ENTRY);
  return key;
}
