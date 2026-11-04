// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { checkedBridges, NO_BRIDGES, type Bridges } from '../lib/bridges';
import { isNostrRelay, MAX_NOSTR_RELAYS } from './e2e-data';
import { decryptText, encryptText, fromHex, randomBytes, toHex } from '../lib/crypto';
import { onRelayKey, pinRelay, relayHome, type TorWay } from '../lib/relay';
import { NO_OWN_TOKEN, type OwnToken } from '../lib/relay-signin';
import { secureDelete, secureGet, secureSet } from '../lib/secure';

import { checkedLook, type Look } from '../theme/look';

import { openHiddenPlace } from '../lib/hidden-contacts';

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
  // Which token this space got as its own from which relay, by an invite or a sign-in
  // (lib/relay-signin.ts): only that one is named when signing in there again. None unless so.
  ownToken: OwnToken;
  // A second relay that sends go through first, so the relay never sees this phone's address.
  // Empty when not used.
  via: string;
  viaToken: string;
  ownQueue: Queue | null;
  // A hidden place's second relay queue, used only for call rings while it is closed
  // (lock/hidden-ring.ts), on the same relay as ownQueue. Null when the place does not ring, and in
  // the space's own data, which never rings. Only this pocket knows which of its space's ring
  // queues is its own.
  ringQueue: Queue | null;
  routes: Record<string, string>;
  // Null until the look is changed in this space: it then takes the look last used. Hidden chats
  // keep none, as they show in the look of their space.
  look: Look | null;
  // Which of the space's relay requests go through Tor (lib/tor.ts): 'messages' unless changed. A
  // space from before the ways, when only all or none could, keeps all as 'all', and goes from none
  // to 'messages'.
  tor: TorWay;
  // The bridges Tor goes through, for where it is blocked (lib/bridges.ts). None unless chosen.
  bridges: Bridges;
  // Whether the space's texts go through Nostr, and the Nostr relays it reads on (lib/nostr.ts):
  // on, on NOSTR_RELAYS, unless changed. Only through Tor: with Tor off, none go there.
  nostr: NostrSetting;
  // A backup relay (one at home, say) with a queue of its own, which contacts write to while the
  // relay cannot be reached (lib/spare.ts). Its address is empty when there is none. `more`: up to
  // MORE_SPARES others, each with its own queue, said beside it (a list of home relays).
  spare: SpareRelay;
  // Whether the web app asks the relay for a push when a message comes (lib/web-push.web.ts).
  push: boolean;
  // Turned off while the relay could not be told: it is told when the space next opens.
  pushLeft: boolean;
  // Whether this phone makes the preview of a link it sends (lib/make-preview.ts). Off unless set.
  previews: boolean;
  // The ticket our contact link gives for a place on our relay (lib/relay.ts, lendTicket), and
  // that relay, kept while it has days left so the link stays the same. Empty when there is none.
  lend: Lending;
  // An invite to a contact's relay that came in their message while this space had no relay of its
  // own (lib/relay-offer.ts), kept until the chat takes it by itself, and until when it is good.
  // Empty when there is none.
  offered: Offered;
  // The keys the space's relays proved in a channel (lib/relay.ts, pinRelay), hex, by their home
  // address (relayHome): such a relay is never reached again without proving it. Only for the
  // relays the space uses (url, via, spare), so a hidden place's relay is never named here.
  relayKeys: Record<string, string>;
  // When the space was stopped (ms) by "Delete me from everywhere" (lib/forget-me.ts): what the
  // servers kept for it was deleted, and it reaches no relay until it starts again. 0 when not. A
  // hidden place keeps its own, set once what the servers kept for it was deleted too.
  stopped: number;
};

export type SpareRelay = { url: string; token: string; queue: Queue | null; more?: SpareRelay[] };
/** The most home relays a space has besides the first (SpareRelay.more): a contact link says each. */
export const MORE_SPARES = 2;
export type NostrSetting = { on: boolean; relays: string[] };
/** The Nostr relays a space reads on unless it names others. */
export const NOSTR_RELAYS = ['wss://relay.damus.io', 'wss://nos.lol', 'wss://relay.primal.net'];
export const NOSTR_DEFAULT: NostrSetting = { on: true, relays: NOSTR_RELAYS };
const NO_SPARE: SpareRelay = { url: '', token: '', queue: null };
export type Lending = { relay: string; ticket: string };
export const NO_LENDING: Lending = { relay: '', ticket: '' };
/** An invite to a contact's relay, until when it is kept (ms), and from whom: their identity, hex. */
export type Offered = { relay: string; code: string; until: number; from: string };
export const NO_OFFER: Offered = { relay: '', code: '', until: 0, from: '' };

export const EMPTY_SPACE: SpaceData = {
  url: '',
  token: '',
  ownToken: NO_OWN_TOKEN,
  via: '',
  viaToken: '',
  ownQueue: null,
  ringQueue: null,
  routes: {},
  look: null,
  tor: 'messages',
  bridges: NO_BRIDGES,
  nostr: NOSTR_DEFAULT,
  spare: NO_SPARE,
  push: false,
  pushLeft: false,
  previews: false,
  lend: NO_LENDING,
  offered: NO_OFFER,
  relayKeys: {},
  stopped: 0,
};

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

function checkedSpareRelay(value: unknown, inner = false): SpareRelay {
  const v = (value ?? {}) as Partial<Record<keyof SpareRelay, unknown>>;
  const q = v.queue as Partial<Queue> | null | undefined;
  if (typeof v.url !== 'string') return NO_SPARE;
  const more = !inner && Array.isArray(v.more) ? v.more.map((m) => checkedSpareRelay(m, true)).filter((m) => m.url.trim()).slice(0, MORE_SPARES) : [];
  return {
    url: v.url,
    token: typeof v.token === 'string' ? v.token : '',
    queue: q && isHex(q.recipientHex, 48) && isHex(q.senderHex, 48) ? { recipientHex: q.recipientHex, senderHex: q.senderHex } : null,
    ...(more.length > 0 ? { more } : {}),
  };
}

/** The Nostr setting stored: the relays this version takes, each once, the most it says; as at first when none. */
export function checkedNostr(value: unknown): NostrSetting {
  const v = (value ?? {}) as Partial<Record<keyof NostrSetting, unknown>>;
  if (typeof v.on !== 'boolean' || !Array.isArray(v.relays)) return NOSTR_DEFAULT;
  return { on: v.on, relays: [...new Set(v.relays.filter(isNostrRelay))].slice(0, MAX_NOSTR_RELAYS) };
}

/** The Tor way stored: from before the ways, true (all) stays all, and false (none) becomes 'messages'. */
export function torWayOf(value: unknown): TorWay {
  return value === true || value === 'all' ? 'all' : value === 'off' ? 'off' : 'messages';
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
    ownToken: checkedOwnToken(v.ownToken),
    via: typeof v.via === 'string' ? v.via : '',
    viaToken: typeof v.viaToken === 'string' ? v.viaToken : '',
    ownQueue: q && isHex(q.recipientHex, 48) && isHex(q.senderHex, 48) ? { recipientHex: q.recipientHex, senderHex: q.senderHex } : null,
    ringQueue: (() => {
      const r = v.ringQueue as Partial<Queue> | null | undefined;
      return r && isHex(r.recipientHex, 48) && isHex(r.senderHex, 48) ? { recipientHex: r.recipientHex, senderHex: r.senderHex } : null;
    })(),
    routes,
    look: v.look ? checkedLook(v.look) : null,
    tor: torWayOf(v.tor),
    bridges: checkedBridges(v.bridges),
    nostr: checkedNostr(v.nostr),
    spare: checkedSpareRelay(v.spare),
    push: v.push === true,
    pushLeft: v.pushLeft === true,
    previews: v.previews === true,
    lend: checkedLending(v.lend),
    offered: checkedOffered(v.offered),
    relayKeys: checkedRelayKeys(v.relayKeys),
    stopped: typeof v.stopped === 'number' && Number.isFinite(v.stopped) && v.stopped > 0 ? v.stopped : 0,
  };
}

function checkedOffered(value: unknown): Offered {
  const v = (value ?? {}) as Partial<Record<keyof Offered, unknown>>;
  return typeof v.relay === 'string' && typeof v.code === 'string' && /^[0-9a-f]{64}$/.test(v.code) && typeof v.until === 'number' && Number.isFinite(v.until) && v.until > 0
    ? { relay: v.relay, code: v.code, until: v.until, from: typeof v.from === 'string' && /^[0-9a-f]{64}$/.test(v.from) ? v.from : '' }
    : NO_OFFER;
}

function checkedOwnToken(value: unknown): OwnToken {
  const v = (value ?? {}) as Partial<Record<keyof OwnToken, unknown>>;
  return typeof v.relay === 'string' && isHex(v.hash, 64) ? { relay: v.relay, hash: v.hash } : NO_OWN_TOKEN;
}

function checkedLending(value: unknown): Lending {
  const v = (value ?? {}) as Partial<Record<keyof Lending, unknown>>;
  return typeof v.relay === 'string' && typeof v.ticket === 'string' && /^ticket\.[0-9a-f]{80}$/.test(v.ticket)
    ? { relay: v.relay, ticket: v.ticket }
    : NO_LENDING;
}

const MAX_RELAY_KEYS = 8;

function checkedRelayKeys(value: unknown): Record<string, string> {
  const keys: Record<string, string> = {};
  if (!value || typeof value !== 'object') return keys;
  for (const [home, key] of Object.entries(value).slice(0, MAX_RELAY_KEYS)) {
    if (home.length > 0 && home.length <= 512 && isHex(key, 64)) keys[home] = key;
  }
  return keys;
}

// The relays a space uses, by home address.
function homesOf(data: SpaceData): Set<string> {
  return new Set([data.url, data.via, data.spare.url, ...(data.spare.more ?? []).map((m) => m.url)].filter(Boolean).map(relayHome));
}

// The keys an entry keeps, pinned for every connection from now on.
function pinned(data: SpaceData): SpaceData {
  for (const [home, hex] of Object.entries(data.relayKeys)) pinRelay(home, fromHex(hex), true);
  return data;
}

// The entries open now, with their keys: the open space's, and its hidden chats' while they are
// open. A key proven is kept only there, so no other space's entry changes while it is closed.
function openEntries(): { name: string; key: Uint8Array }[] {
  const open: { name: string; key: Uint8Array }[] = [];
  try {
    const { space, key } = currentSpace();
    open.push({ name: entry(space), key });
  } catch {
    // No space is open.
  }
  const place = openHiddenPlace();
  if (place) open.push({ name: hiddenEntry(place.space, place.pocket), key: place.key });
  return open;
}

onRelayKey((home, key) => {
  for (const { name, key: entryKey } of openEntries()) {
    void write(name, entryKey, (data) => {
      const hex = key ? toHex(key) : undefined;
      if (data.relayKeys[home] === hex || (key && !homesOf(data).has(home))) return null;
      const relayKeys = { ...data.relayKeys };
      if (hex) relayKeys[home] = hex;
      else delete relayKeys[home];
      return { ...data, relayKeys };
    }).catch(() => undefined);
  }
});

/** An entry's data, or an empty one when the entry is missing or sealed with another key. */
async function load(name: string, key: Uint8Array): Promise<SpaceData> {
  const raw = await secureGet(name);
  if (!raw) return { ...EMPTY_SPACE };
  let data: SpaceData;
  try {
    data = checked(JSON.parse(decryptText(key, raw)));
  } catch {
    return { ...EMPTY_SPACE };
  }
  return pinned(data);
}

/** Gives an entry a value sealed with a random key, unless it has one. */
async function ensure(name: string): Promise<void> {
  if (!(await secureGet(name))) await secureSet(name, seal(randomBytes(32), EMPTY_SPACE));
}

// Writes to an entry run one after another, and a change is merged into what the write before it
// left, so the chat's saves and the Appearance screen's never undo each other.
const writes = new Map<string, Promise<void>>();

// A change that returns null leaves the entry as it is.
function write(name: string, key: Uint8Array, change: (data: SpaceData) => SpaceData | null): Promise<void> {
  const run = (writes.get(name) ?? Promise.resolve())
    .catch(() => undefined)
    .then(async () => {
      const data = change(await load(name, key));
      if (!data) return;
      // A relay the space no longer uses keeps no key in it.
      const homes = homesOf(data);
      const relayKeys = Object.fromEntries(Object.entries(data.relayKeys).filter(([home]) => homes.has(home)));
      await secureSet(name, seal(key, pinned({ ...data, relayKeys })));
    });
  writes.set(name, run);
  return run;
}

export const loadSpaceData = (space: number, key: Uint8Array) => load(entry(space), key);

async function opens(name: string, key: Uint8Array): Promise<boolean> {
  const raw = await secureGet(name);
  if (!raw) return false;
  try {
    decryptText(key, raw);
    return true;
  } catch {
    return false;
  }
}

/** Whether `key` is the one a space's entry is sealed with (sealing is authenticated, so another key fails). */
export const opensSpace = (space: number, key: Uint8Array) => opens(entry(space), key);

/** Whether `key` is the one the hidden chats in a space's `pocket` are sealed with, as opensSpace. */
export const opensHidden = (space: number, pocket: number, key: Uint8Array) => opens(hiddenEntry(space, pocket), key);

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
/** Whether this is Erevos's very first start on this device: not even its first space was ever kept. */
export async function firstStart(): Promise<boolean> {
  return !(await secureGet(entry(0))) && !(await secureGet(OLDER_ENTRY));
}

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
