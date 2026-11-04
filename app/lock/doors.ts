// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { decryptText, encryptText, fromHex, randomBytes, toHex, utf8Encode } from '../lib/crypto';
import type { News, TorWay } from '../lib/relay';
import { secureGet, secureSet } from '../lib/secure';

import { heardText, isHeardText, isWatched, type Watched } from './hidden-watch';
import { SLOTS } from './slots';
import { torWayOf } from './space-data';

// A space that says a message came while another is open (lib/closed-notices.ts): it is closed
// then, and its key is not in memory, so what is waited on for it is kept outside it, in
// `erevos.door.<n>`: its queues at its relay, as lock/hidden-watch.ts keeps a pocket's, the queues
// its contacts write to there (lib/contact-queues.ts), and whether it goes through Tor. Never its
// keys, who its contacts are, or its messages: only how many contacts write to a queue of their own.
// A space whose door is open seals it with the phone's door key (`erevos.doors-key`), which every
// space reads; every other space's entry is sealed with a random key, and all are padded to SIZE, so
// the entries say nothing of which spaces there are, which let themselves be heard, or how many
// contacts they have. Only the open space's code, trying the door key on each, tells them apart.

/** A queue one of a closed space's contacts writes to: its recipient id (hex), the group it is read with through Tor (Mine g), and what the relay said came. */
export type DoorContact = { r: string; g: number; heard?: string };

/**
 * What is waited on for a closed space: its queues, its contacts' queues at its relay (read on the
 * relay's `/read` path, with no token, as the open space reads them), and whether it goes through
 * Tor (lib/relay.ts TorWay).
 */
export type Door = {
  tor: TorWay;
  queues: Watched[];
  contacts?: { url: string; queues: DoorContact[] };
  // The space asked for a dot on the lock of the other spaces (SpaceData.sign, lib/unread-signs.ts),
  // and whether a message came since it was last open (doorCame): the door says no more of it than
  // the notice already does, that something came to a space that is closed.
  sign?: true;
  came?: true;
};

/** A space's own queue, its contact link's, its groups' and its public groups'. */
export const DOOR_QUEUES = 4;
/** The most contacts' queues a door keeps: one relay request (lib/relay.ts MAX_ANY) without Tor. */
export const DOOR_CONTACTS = 64;

const BLOCK = 2048;
// Every entry is this long, open or shut and however many contacts it has: DOOR_CONTACTS queues fit,
// with the four queues, at relays of any usual address; past it the last contacts are left out.
const SIZE = 5 * BLOCK;
const KEY = 'erevos.doors-key';
const entry = (space: number) => `erevos.door.${space}`;
// Spaces past SLOTS have an entry once a second password made them (prepareDoors); no more than this.
const MOST_SPACES = 32;

// How long the door's text is once sealed, in bytes: a relay's address may hold letters of more than one.
const bytesOf = (door: Door | null) => utf8Encode(JSON.stringify(door ?? [])).length;

// The door as it fits SIZE: the last contacts' queues left out until it does.
function fitted(door: Door): Door {
  let next = door;
  while (next.contacts && bytesOf(next) > SIZE) {
    const queues = next.contacts.queues.slice(0, -1);
    const { contacts: _all, ...rest } = next;
    next = queues.length > 0 ? { ...next, contacts: { url: next.contacts.url, queues } } : rest;
  }
  return next;
}

function seal(key: Uint8Array, door: Door | null): string {
  let kept = door ? fitted(door) : null;
  // Its queues alone longer than SIZE (tokens far longer than any): it stays shut rather than show by its length.
  if (kept && bytesOf(kept) > SIZE) kept = null;
  // Padded by bytes, not letters, so a relay's address of other letters seals to the same length too.
  return encryptText(key, JSON.stringify(kept ?? []) + ' '.repeat(Math.max(0, SIZE - bytesOf(kept))));
}

const isDoorContact = (value: unknown): value is DoorContact => {
  const v = (value ?? {}) as Partial<Record<keyof DoorContact, unknown>>;
  return typeof v.r === 'string' && /^[0-9a-f]{48}$/.test(v.r) && Number.isInteger(v.g) && (v.g as number) >= 0 && isHeardText(v.heard);
};

function checkedContacts(value: unknown): Door['contacts'] | null {
  const v = (value ?? {}) as { url?: unknown; queues?: unknown };
  if (typeof v.url !== 'string' || v.url === '' || v.url.length > 512 || !Array.isArray(v.queues)) return null;
  const queues = v.queues.filter(isDoorContact).slice(0, DOOR_CONTACTS);
  return queues.length > 0 ? { url: v.url, queues } : null;
}

function checkedDoor(value: unknown): Door | null {
  const v = (value ?? {}) as Partial<Record<keyof Door, unknown>>;
  if (!Array.isArray(v.queues)) return null;
  const queues = v.queues.filter(isWatched).slice(0, DOOR_QUEUES);
  const contacts = checkedContacts(v.contacts);
  // A space's contacts write to queues of their own only once it has a queue of its own.
  if (queues.length === 0) return null;
  return { tor: torWayOf(v.tor), queues, ...(contacts ? { contacts } : {}), ...(v.sign === true ? { sign: true } : {}), ...(v.came === true ? { came: true } : {}) };
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

/**
 * Every space up to `count` (and SLOTS) has the entry, with its door shut, and the phone has its
 * door key. An entry of another length, from before doors kept contacts' queues, is sealed again at
 * the length all have now, open or shut as it was.
 */
export async function prepareDoors(count = SLOTS): Promise<void> {
  await madeDoorKey();
  const length = seal(randomBytes(32), null).length;
  const made = Math.min(MOST_SPACES, Math.max(SLOTS, count));
  // Every entry there is, those past the ones asked for too, as openDoors reads them.
  for (let space = 0; space < MOST_SPACES; space++) {
    const raw = await secureGet(entry(space));
    if (!raw) {
      if (space >= made) break;
      await secureSet(entry(space), seal(randomBytes(32), null));
    } else if (raw.length !== length) await change(space, (door) => door);
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
 * `whileOpen`: only if it is open as this writes, so a door its owner just shut stays shut.
 */
export function saveDoor(space: number, door: Door | null, fresh = false, whileOpen = false): Promise<void> {
  return change(space, (was) => {
    if (!door || (whileOpen && !was)) return null;
    const queues = door.queues.slice(0, DOOR_QUEUES).map((queue) => {
      const { heard: _given, ...rest } = queue;
      const kept = fresh ? undefined : was?.queues.find((old) => old.recipientHex === queue.recipientHex && old.url === queue.url)?.heard;
      return kept ? { ...rest, heard: kept } : rest;
    });
    if (queues.length === 0) return null;
    const keptContacts = !fresh && was?.contacts && door.contacts && was.contacts.url === door.contacts.url ? was.contacts.queues : [];
    const contacts = (door.contacts?.queues ?? []).slice(0, DOOR_CONTACTS).map((queue) => {
      const { heard: _given, ...rest } = queue;
      const kept = keptContacts.find((old) => old.r === queue.r)?.heard;
      return kept ? { ...rest, heard: kept } : rest;
    });
    // That a message came stays, unless all is heard anew: the space has just read it, open.
    const came = !fresh && door.sign && was?.came;
    return {
      tor: door.tor,
      queues,
      ...(door.contacts && contacts.length > 0 ? { contacts: { url: door.contacts.url, queues: contacts } } : {}),
      ...(door.sign ? { sign: true as const } : {}),
      ...(came ? { came: true as const } : {}),
    };
  });
}

const cameListeners = new Set<() => void>();

/** Keeps that a message came to the closed space, when its door asks for the dot (Door.sign), and tells those listening (onDoorsCame). */
export async function doorCame(space: number): Promise<void> {
  const door = await loadDoor(space);
  if (!door?.sign || door.came) return;
  await change(space, (now) => (now?.sign ? { ...now, came: true } : now));
  cameListeners.forEach((listener) => listener());
}

/** Forgets that a message came to the space now open: it is read there. */
export async function doorSeen(space: number): Promise<void> {
  if (!(await loadDoor(space))?.came) return;
  await change(space, (now) => {
    if (!now) return now;
    const { came: _came, ...rest } = now;
    return rest;
  });
  cameListeners.forEach((listener) => listener());
}

/** Calls `listener` each time a closed space's door says, or no longer, that a message came. Returns how to stop. */
export function onDoorsCame(listener: () => void): () => void {
  cameListeners.add(listener);
  return () => {
    cameListeners.delete(listener);
  };
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
  return hearDoorAll(space, [{ recipientHex, news }]);
}

/** Keeps what the relay said came into a closed space's queues, its contacts' too, those its door still has, in one write. */
export function hearDoorAll(space: number, heard: { recipientHex: string; news: News }[]): Promise<void> {
  if (heard.length === 0) return Promise.resolve();
  const said = new Map(heard.map(({ recipientHex, news }) => [recipientHex, heardText(news)]));
  return change(space, (door) => {
    if (!door) return door;
    const queues = door.queues.map((queue) => (said.has(queue.recipientHex) ? { ...queue, heard: said.get(queue.recipientHex)! } : queue));
    const contacts = door.contacts && { url: door.contacts.url, queues: door.contacts.queues.map((queue) => (said.has(queue.r) ? { ...queue, heard: said.get(queue.r)! } : queue)) };
    return { ...door, queues, ...(contacts ? { contacts } : {}) };
  });
}
