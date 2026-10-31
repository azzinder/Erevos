// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { isRelayKey } from '../lock/e2e-data';
import { isTag } from '../lock/history';
import { checkedPlace, TIMED, type Envelope, type FieldTimes, type Place, type Synced } from './link-wire';

// The account's linked devices, each to each (docs/multi-device.md, Own devices). Besides its link
// to the phone, a linked device has a conversation of the core's own kind with each other device the
// account's signed list names as one of its own (`real`), between their endpoints: the one with the
// lower id starts it, from the other's bundle in the list, and the other takes a first packet only
// from an endpoint the list it last checked names, and only from one that should start. Where each
// reads comes with the list, from the phone (`routes`), and then from what each says. What goes in
// them is lib/link-wire.ts's: what a device sealed for a contact (`out`), a change it made to one
// (`set`), where it is (`here`). So with the phone off the devices still see what the others wrote,
// read, reacted to and changed. Contacts' messages still reach them only through the phone, the
// groups are the phone's alone, and device names stay on each device.
//
// What settles how, as two devices may change the same thing at once: a message is kept once, by
// its chat and tag, and its marks only go up (lib/devices.ts); each field of a contact takes the
// setting made last (FieldTimes, by the clock of the device that made it, and always after a setting
// it knew of); a request accepted on one stays accepted; a contact removed stays removed for what
// comes of it later, until it is added again on purpose; a message erased stays erased.
//
// Kept with the space's links (lock/devices-data.ts), which no backup holds: a backup put back on
// the same device finds them as they were, so no conversation goes back to keys it used, and one
// put back elsewhere has none, and lets go of its endpoint. They were made with one endpoint (`of`),
// and go if the device's endpoint is another.
// Self-contained on purpose, so it can run under plain Node for checks.

/** Another of the account's linked devices, reached by its endpoint. */
export type Sibling = {
  /** Its endpoint's identity, hex, and bundle, base64url, as the list names them. */
  id: string;
  bundle: string;
  /** The two endpoints' conversation, base64; empty until it started. */
  conversation: string;
  /** Where it reads: as the phone said, or it said since; null while not known. */
  at: Place | null;
  /** Packets for it, base64, oldest first, that the relay has not taken yet. */
  outbox: string[];
  /** Where this side's queue was last said to it, as JSON, so a new one is said at once. */
  told: string;
  /** When it was last heard from, milliseconds; 0 for never. */
  heard: number;
  /** Since when its outbox had no room (0 if it had). */
  behind: number;
  /** What waits to be said to it, as JSON, until it starts the conversation, oldest first. */
  held: string[];
  /** The key this device gave it for the packets it sends here, and the one it gave this device (lib/sealed-packet.ts), base64url; empty while not said. */
  key: string;
  sealTo: string;
  /** From when, while it has not answered in the conversation this device started with it, the next envelope for it starts another (lock/e2e-data.ts WAY_AGAIN, againAfter): its first packet may have been lost after the relay took it. */
  again?: number;
  /** Those this device started with it before, base64, newest first, while it has not answered in the one it started last: what it sealed in them while away still opens here. */
  before?: string[];
  /** Chat with myself: whether it said it takes the notes, and the stamp they were told to it up to (as Peer's, lock/devices-data.ts). */
  notesHeard?: true;
  notesSaid?: true;
  notesTold?: number;
};

/** A first packet from an endpoint the list names, but not as one met yet (the phone said nothing of where it reads), with when it came: tried again with the next list. */
export type Early = { packet: string; at: number };

/** This device's siblings, met as the endpoint `of` (its id), from the list `n`; the first packets taken (`seen`) and those still to try (`early`). */
export type Siblings = { of: string; n: number; list: Sibling[]; seen: string[]; early: Early[] };

/** What a contact field change is, as a device says it. */
export type Change = Extract<Envelope, { k: 'set' }>['change'];

/** The most envelopes held for a sibling until it starts the conversation: the latest are kept. */
export const MAX_HELD = 100;
/** The most first packets kept to try again, and for how long. */
export const MAX_EARLY = 8;
export const EARLY_LASTS = 14 * 24 * 60 * 60_000;
/** The most conversations kept from before one started again (Sibling.before). */
export const MAX_BEFORE = 2;
/** First packets remembered, so the relay cannot replay one. */
export const MAX_SEEN = 100;
/** The most contacts remembered as removed, and tags as erased in each chat, and chats with tags erased. */
export const MAX_REMOVED = 500;
export const MAX_ERASED = 500;
export const MAX_ERASED_CHATS = 200;

const isText = (v: unknown): v is string => typeof v === 'string';
const isHex = (v: unknown, length: number): v is string => isText(v) && v.length === length && /^[0-9a-f]+$/.test(v);
const isBase64 = (v: unknown): v is string => isText(v) && /^[A-Za-z0-9+/]*={0,2}$/.test(v);
const isBundle = (v: unknown): v is string => isText(v) && v.length > 0 && v.length <= 4096 && /^[A-Za-z0-9_-]+$/.test(v);
const isTime = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0;
const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

/** Whether the endpoint `own` starts the conversation with `other`: the one with the lower id does. */
export const starts = (own: string, other: string): boolean => own < other;

/** A sibling as the list first names it: no conversation yet, and the key this device gives it. */
function newSibling(id: string, bundle: string, at: Place | null, key: string): Sibling {
  return { id, bundle, conversation: '', at, outbox: [], told: '', heard: 0, behind: 0, held: [], key, sealTo: '' };
}

/**
 * The siblings a list names, for this device's endpoint `own`: the list's entries (`entries`) that
 * are the account's devices (`real`), but its own. Each stays as it was if the list still names it
 * with the same bundle, else is made anew, with a key from `key`; those no longer named go. None if
 * the list does not name this device's endpoint. Where each reads comes from `routes`, and one the
 * phone says nothing of where it reads is not met: a phone from before says it of none.
 */
export function siblingsFrom(
  held: Siblings | null,
  own: string,
  n: number,
  entries: { i: string; b: string }[],
  real: string[],
  routes: Record<string, Place>,
  key: () => string,
): Siblings {
  const kept = held?.of === own ? held : null;
  const named = real.includes(own) ? entries.filter((e) => e.i !== own && real.includes(e.i)) : [];
  const list = named.flatMap((e) => {
    const was = kept?.list.find((s) => s.id === e.i && s.bundle === e.b);
    if (was) return [routed(was, routes)];
    return routes[e.i] ? [newSibling(e.i, e.b, routes[e.i], key())] : [];
  });
  return { of: own, n, list, seen: kept?.seen ?? [], early: kept?.early ?? [] };
}

// Where a sibling reads, as the phone says, while it was not heard from directly: what it says itself is newer.
function routed(sibling: Sibling, routes: Record<string, Place>): Sibling {
  const route = routes[sibling.id];
  return route && sibling.heard === 0 && JSON.stringify(route) !== JSON.stringify(sibling.at) ? { ...sibling, at: route } : sibling;
}

/** The siblings with where each reads as the phone said it again. */
export function withRoutes(siblings: Siblings, routes: Record<string, Place>): Siblings {
  return { ...siblings, list: siblings.list.map((s) => routed(s, routes)) };
}

/** The first packets to try again, with `packet` (base64) among them, those too old gone. */
export function withEarly(early: Early[], packet: string, now: number): Early[] {
  return [...early.filter((e) => e.packet !== packet && now - e.at < EARLY_LASTS), { packet, at: now }].slice(-MAX_EARLY);
}

function checkedSibling(value: unknown): Sibling | null {
  const v = (value ?? {}) as Partial<Record<keyof Sibling, unknown>>;
  if (!isHex(v.id, 64) || !isBundle(v.bundle) || !isBase64(v.conversation) || !isRelayKey(v.key)) return null;
  return {
    id: v.id,
    bundle: v.bundle,
    conversation: v.conversation,
    at: checkedPlace(v.at),
    outbox: Array.isArray(v.outbox) ? v.outbox.filter(isBase64) : [],
    told: isText(v.told) ? v.told : '',
    heard: isTime(v.heard) ? v.heard : 0,
    behind: isTime(v.behind) ? v.behind : 0,
    held: Array.isArray(v.held) ? v.held.filter(isText).slice(-MAX_HELD) : [],
    key: v.key,
    sealTo: isRelayKey(v.sealTo) ? v.sealTo : '',
    ...(isTime(v.again) && v.again > 0 ? { again: v.again } : {}),
    ...(Array.isArray(v.before) && v.before.some((c) => isBase64(c) && c !== '') ? { before: v.before.filter((c): c is string => isBase64(c) && c !== '').slice(0, MAX_BEFORE) } : {}),
    ...(v.notesHeard === true ? { notesHeard: true as const } : {}),
    ...(v.notesSaid === true ? { notesSaid: true as const } : {}),
    ...(isTime(v.notesTold) && v.notesTold > 0 ? { notesTold: v.notesTold } : {}),
  };
}

/** Siblings as kept, checked: null when they are not. */
export function checkedSiblings(value: unknown): Siblings | null {
  const v = (value ?? {}) as Partial<Record<keyof Siblings, unknown>>;
  if (!isHex(v.of, 64) || !isTime(v.n)) return null;
  const list = Array.isArray(v.list) ? v.list.map(checkedSibling).filter((s): s is Sibling => s !== null && s.id !== v.of) : [];
  const early = Array.isArray(v.early)
    ? v.early.filter((e): e is Early => isObject(e) && isBase64(e.packet) && isTime(e.at)).map((e) => ({ packet: e.packet, at: e.at })).slice(-MAX_EARLY)
    : [];
  return {
    of: v.of,
    n: v.n,
    list: list.filter((s, i) => list.findIndex((o) => o.id === s.id) === i),
    seen: Array.isArray(v.seen) ? v.seen.filter((id): id is string => isHex(id, 32)).slice(-MAX_SEEN) : [],
    early,
  };
}

// ---- What settles how ----

/** A contact before anything of it was said, as a change to it is told from. */
export function blankSynced(identity: string): Synced {
  return { identity, name: '', timer: 0, timerAt: 0, request: true, look: null, hide: false };
}

/** When a change made now to a contact as kept (`before`) is set: now, or after every setting of its fields kept, whatever the clock says. */
export function stampOf(before: Synced | undefined, change: Change, now: number): number {
  let at = now;
  for (const field of TIMED) if (field in change) at = Math.max(at, (before?.at?.[field] ?? 0) + 1);
  return Math.max(at, (before?.at?.added ?? 0) + 1);
}

/** A contact with the fields of `change` set at `at`, and added then (`added`). */
export function stamped(synced: Synced, change: Change, at: number, added = false): Synced {
  const times: FieldTimes = { ...synced.at };
  for (const field of TIMED) if (added || field in change) times[field] = at;
  if (added) times.added = at;
  return { ...synced, at: times };
}

// Takes one field, and when it was set, from another's word of a contact.
function takeField(into: Synced, from: Synced | Change, field: (typeof TIMED)[number], at: number | undefined): void {
  if (field === 'avatar' && !('avatar' in from)) delete into.avatar;
  else (into as Record<string, unknown>)[field] = field === 'avatar' ? (from.avatar ?? null) : from[field];
  into.at = { ...into.at, [field]: at };
}

/**
 * A contact as a primary of this version says it (`said`, with when each field was set), settled
 * with what this device keeps of it (`kept`): each field the later setting, the timer the later one,
 * and a request accepted on either stays accepted. One a primary from before says, with no times,
 * is taken as it says.
 */
export function settled(kept: Synced | undefined, said: Synced): Synced {
  if (!kept || !said.at) return said;
  const out: Synced = { ...said, at: { ...said.at } };
  for (const field of TIMED) if ((kept.at?.[field] ?? 0) > (said.at[field] ?? 0)) takeField(out, kept, field, kept.at?.[field]);
  if (kept.timerAt > said.timerAt) Object.assign(out, { timer: kept.timer, timerAt: kept.timerAt });
  if (!kept.request) out.request = false;
  const added = Math.max(kept.at?.added ?? 0, said.at.added ?? 0);
  if (added > 0) out.at = { ...out.at, added };
  return out;
}

/**
 * What a change another device made to a contact (`change`, set at `at`) leaves of it here, kept as
 * `kept`: each field set later than the one kept, the timer if set later, a request only accepted.
 * A contact not kept here is taken only as one that device added (`added`), and after it was last
 * removed here (`removedAt`). Null when nothing is to change.
 */
export function changedBy(kept: Synced | undefined, identity: string, change: Change, at: number, added: boolean, removedAt: number): Synced | null {
  if (!kept) return added && at > removedAt ? stamped({ ...blankSynced(identity), ...change, identity }, change, at, true) : null;
  const out: Synced = { ...kept, at: { ...kept.at } };
  for (const field of TIMED) if (field in change && at > (kept.at?.[field] ?? 0)) takeField(out, change, field, at);
  if (change.timerAt !== undefined && change.timerAt > kept.timerAt) Object.assign(out, { timer: change.timer ?? kept.timer, timerAt: change.timerAt });
  if (change.request === false) out.request = false;
  if (added && at > (kept.at?.added ?? 0)) out.at = { ...out.at, added: at };
  return JSON.stringify(out) === JSON.stringify(kept) ? null : out;
}

/** Whether a contact removed at `removedAt` stays removed for a word of it (`said`): unless that says it was added again since. Without times (a primary from before), it does not. */
export function buried(removedAt: number | undefined, said: Synced): boolean {
  return removedAt !== undefined && said.at !== undefined && (said.at.added ?? 0) <= removedAt;
}

/** Whether a contact kept as `kept` goes for a removal at `at`: unless it was added again since. */
export function goesFor(kept: Synced | undefined, at: number): boolean {
  return (kept?.at?.added ?? 0) <= at;
}

/** When a removal made now of a contact kept as `kept` is set: now, or after it was last added. */
export function removedAtOf(kept: Synced | undefined, now: number): number {
  return Math.max(now, (kept?.at?.added ?? 0) + 1);
}

/** The contacts remembered as removed, with `identity` removed at `at`: the latest MAX_REMOVED. */
export function withRemoved(removed: Record<string, number>, identity: string, at: number): Record<string, number> {
  const all = { ...removed, [identity]: Math.max(at, removed[identity] ?? 0) };
  return Object.fromEntries(Object.entries(all).sort((a, b) => b[1] - a[1]).slice(0, MAX_REMOVED));
}

/** The tags erased in each chat, with `tags` erased in `peer`: the latest MAX_ERASED in each, in the chats erased in last. */
export function withErased(erased: Record<string, string[]>, peer: string, tags: string[]): Record<string, string[]> {
  if (tags.length === 0) return erased;
  const { [peer]: was = [], ...others } = erased;
  const now = [...was.filter((tag) => !tags.includes(tag)), ...tags].slice(-MAX_ERASED);
  return Object.fromEntries([...Object.entries(others), [peer, now] as const].slice(-MAX_ERASED_CHATS));
}

/** The contacts remembered as removed, as kept, checked. */
export function checkedRemoved(value: unknown): Record<string, number> {
  if (!isObject(value)) return {};
  return Object.fromEntries(Object.entries(value).filter((e): e is [string, number] => isHex(e[0], 64) && isTime(e[1])).slice(0, MAX_REMOVED));
}

/** The tags erased in each chat, as kept, checked. */
export function checkedErased(value: unknown): Record<string, string[]> {
  if (!isObject(value)) return {};
  const erased: Record<string, string[]> = {};
  for (const [peer, tags] of Object.entries(value).slice(-MAX_ERASED_CHATS)) {
    if (/^contact:[0-9a-f]{64}$/.test(peer) && Array.isArray(tags)) erased[peer] = tags.filter(isTag).slice(-MAX_ERASED);
  }
  return erased;
}
