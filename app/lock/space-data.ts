import { decryptText, encryptText, randomBytes } from '../lib/crypto';
import { secureDelete, secureGet, secureSet } from '../lib/secure';

import { checkedLook, type Look } from '../theme/look';

import { currentSpace, loadOpenKey, newSpaceKey, saveOpenKey } from './keys';
import { POCKETS } from './sealed-file';
import { SLOTS } from './slots';

// What each space keeps on the phone: the relay it uses, its own relay queue and its contacts,
// which the chat screen saves, and how the app looks in it (theme/look.ts), which the Appearance
// screen saves. One keystore entry per password slot, `erevos.space.<n>`, sealed
// with that space's key (keys.ts). Once the lock is on, every slot up to SLOTS has an entry, the
// unused ones sealed with random keys, and every entry is padded to whole blocks of BLOCK
// characters, so a used space's entry looks like an unused one. One entry per slot rather than
// one for all (slots.ts), because expo-secure-store warns that values above 2048 bytes may fail.
//
// A second space starts empty and takes nothing from the space it was set in: not its relay,
// its queue or its contacts. The chat history, once the chat keeps one, needs a database per
// space sealed the same way.
//
// Every space also has hidden chats (hidden.ts), in POCKETS pockets each with its own PIN, kept the
// same way in `erevos.hidden.<n>` (the first) and `erevos.hidden<p>.<n>`, sealed with their own key.

export type Queue = { recipientHex: string; senderHex: string };
export type SpaceData = {
  url: string;
  token: string;
  // A second relay that sends go through first, so the relay never sees this phone's address.
  // Empty when not used.
  via: string;
  viaToken: string;
  ownQueue: Queue | null;
  routes: Record<string, string>;
  // Null until the look is changed in this space: it then takes the look last used. Hidden chats
  // keep none, as they show in the look of their space.
  look: Look | null;
  // Whether the space's relay requests go through Tor (lib/relay.ts setThroughTor). Off unless set.
  tor: boolean;
  // A backup relay (one at home, say) with a queue of its own, which contacts write to while the
  // relay cannot be reached (lib/spare.ts). Its address is empty when there is none.
  spare: SpareRelay;
  // Whether the web app asks the relay for a push when a message comes (lib/web-push.web.ts).
  push: boolean;
};

export type SpareRelay = { url: string; token: string; queue: Queue | null };
const NO_SPARE: SpareRelay = { url: '', token: '', queue: null };

export const EMPTY_SPACE: SpaceData = { url: '', token: '', via: '', viaToken: '', ownQueue: null, routes: {}, look: null, tor: false, spare: NO_SPARE, push: false };

const BLOCK = 1024;
const entry = (space: number) => `erevos.space.${space}`;
const hiddenEntry = (space: number, pocket: number) => `erevos.hidden${pocket || ''}.${space}`;
// Where the chat kept its settings before there were spaces, unsealed. They move into the first space.
const OLDER_ENTRY = 'erevos.relay';

function seal(key: Uint8Array, data: SpaceData): string {
  const json = JSON.stringify(data);
  return encryptText(key, json.padEnd(Math.max(1, Math.ceil(json.length / BLOCK)) * BLOCK, ' '));
}

const isHex = (v: unknown, length: number): v is string => typeof v === 'string' && v.length === length && /^[0-9a-f]+$/.test(v);

function checkedSpareRelay(value: unknown): SpareRelay {
  const v = (value ?? {}) as Partial<Record<keyof SpareRelay, unknown>>;
  const q = v.queue as Partial<Queue> | null | undefined;
  if (typeof v.url !== 'string') return NO_SPARE;
  return {
    url: v.url,
    token: typeof v.token === 'string' ? v.token : '',
    queue: q && isHex(q.recipientHex, 48) && isHex(q.senderHex, 48) ? { recipientHex: q.recipientHex, senderHex: q.senderHex } : null,
  };
}

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
    via: typeof v.via === 'string' ? v.via : '',
    viaToken: typeof v.viaToken === 'string' ? v.viaToken : '',
    ownQueue: q && isHex(q.recipientHex, 48) && isHex(q.senderHex, 48) ? { recipientHex: q.recipientHex, senderHex: q.senderHex } : null,
    routes,
    look: v.look ? checkedLook(v.look) : null,
    tor: v.tor === true,
    spare: checkedSpareRelay(v.spare),
    push: v.push === true,
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

// Writes to an entry run one after another, and a change is merged into what the write before it
// left, so the chat's saves and the Appearance screen's never undo each other.
const writes = new Map<string, Promise<void>>();

function write(name: string, key: Uint8Array, change: (data: SpaceData) => SpaceData): Promise<void> {
  const run = (writes.get(name) ?? Promise.resolve())
    .catch(() => undefined)
    .then(async () => {
      await secureSet(name, seal(key, change(await load(name, key))));
    });
  writes.set(name, run);
  return run;
}

export const loadSpaceData = (space: number, key: Uint8Array) => load(entry(space), key);

/** Whether `key` is the one a space's entry is sealed with (sealing is authenticated, so another key fails). */
export async function opensSpace(space: number, key: Uint8Array): Promise<boolean> {
  const raw = await secureGet(entry(space));
  if (!raw) return false;
  try {
    decryptText(key, raw);
    return true;
  } catch {
    return false;
  }
}

export function saveSpaceData(space: number, key: Uint8Array, data: SpaceData): Promise<void> {
  return write(entry(space), key, () => data);
}

/** Changes some of a space's data and keeps the rest. */
export function updateSpaceData(space: number, key: Uint8Array, patch: Partial<SpaceData>): Promise<void> {
  return write(entry(space), key, (data) => ({ ...data, ...patch }));
}

export const loadHiddenData = (space: number, pocket: number, key: Uint8Array) => load(hiddenEntry(space, pocket), key);

export function saveHiddenData(space: number, pocket: number, key: Uint8Array, data: SpaceData): Promise<void> {
  return write(hiddenEntry(space, pocket), key, () => data);
}

export function updateHiddenData(space: number, pocket: number, key: Uint8Array, patch: Partial<SpaceData>): Promise<void> {
  return write(hiddenEntry(space, pocket), key, (data) => ({ ...data, ...patch }));
}

/** Every space up to `count` (and SLOTS) has an entry for each pocket of hidden chats, used or not. */
export async function prepareHiddenEntries(count: number): Promise<void> {
  for (let space = 0; space < Math.max(SLOTS, count); space++) {
    for (let pocket = 0; pocket < POCKETS; pocket++) await ensure(hiddenEntry(space, pocket));
  }
}

/** The open space's data (keys.ts says which space is open). */
export async function loadCurrentSpaceData(): Promise<SpaceData> {
  const { space, key } = currentSpace();
  return loadSpaceData(space, key);
}

export async function updateCurrentSpaceData(patch: Partial<SpaceData>): Promise<void> {
  const { space, key } = currentSpace();
  await updateSpaceData(space, key, patch);
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
