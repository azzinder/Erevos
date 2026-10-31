// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { readOffer, type FileOffer } from '../lib/attachments';
import { isGroupId } from '../lib/group-signal';
import { checkedGiven, checkedPlace, checkedSeat, checkedSynced, type GivenAccounts, type GroupSeat, type Place, type Synced } from '../lib/link-wire';
import { checkedErased, checkedRemoved, checkedSiblings, type Siblings } from '../lib/siblings';

import { isRelayKey, type Endpoint } from './e2e-data';
import { sealedFile } from './sealed-file';

// What each space keeps of its links to the account's other devices (lib/devices.ts): on the phone
// that holds the account (the primary), each linked device; on a linked device, the primary. For
// each, the conversation of the link, where it reads, and what waits to go to it; on a linked device,
// the account's other linked devices it reaches directly too (lib/siblings.ts). Kept sealed with the
// space's key in FILE, one value for each space (sealed-file.ts), in blocks of BLOCK bytes. Hidden
// chats have none: they are never linked. A backup leaves this file out, and restoring one leaves it
// as it is: on another phone there is none, and the devices are linked again.

/** What of the history still goes to a device: from `since` (milliseconds, 0 for all of it) up to `upTo`, photos and files too or not, and how many of those messages went. */
export type Job = { since: number; files: boolean; upTo: number; done: number };

/**
 * On the primary: what a device was last told of a group: a mark of what it said of it
 * (lib/link-wire.ts, mirrorMark), its last message told and when that came, and a mark of what was
 * done to its messages as told (marksDigest; empty when not known).
 */
export type Told = { meta: string; last: string; at: number; marks: string };

/**
 * How a packet in a device's outbox goes to the relay when it is not quiet word between the
 * devices (lib/relay.ts, Mark): as a message someone reads, counted in a web app's notice, as a
 * call that rings, or, kept by an Erevos from before calls rang so, with no mark.
 */
export type OutMark = 'message' | 'ring' | 'none';

export type Peer = {
  /** The identity of its link key, hex. */
  id: string;
  /** What it is called. */
  name: string;
  /** The link's conversation, base64. */
  conversation: string;
  /** Where it reads. */
  at: Place;
  /** When it was linked, and when last heard from, milliseconds. */
  since: number;
  heard: number;
  /** On the primary: whether the device said the codes match. Nothing but the first message goes to it before. */
  linked: boolean;
  /** Packets for it, base64, oldest first, that the relay has not taken yet. */
  outbox: string[];
  /** On the primary: those of its outbox that are not quiet, by packet, and how each goes. Missing: all quiet. */
  marks?: Record<string, OutMark>;
  /** Where this side's queue was last said to it, as JSON, so a new one is said at once. */
  told: string;
  /** On the primary: what of the history still goes to it, whether photos and files were chosen to go, and since when the outbox had no room for it (0 if it had). */
  history: Job | null;
  files: boolean;
  behind: number;
  /** On the primary, while it is being linked: whether the space's Matrix, XMPP and Nostr accounts go to it once the codes match (lib/linked-accounts.ts). */
  accounts?: true;
  /** On the primary: what it was last told of each group, by id. */
  groups: Record<string, Told>;
  /** The linked device's own endpoint (docs/multi-device.md), as said in this link: its identity,
   *  hex, and bundle, base64url, and what the key each contact seals for it with is drawn from
   *  (lib/sealed-packet.ts entryKey), which a device that takes
   *  nothing from contacts does not say. On the primary, the device's; on a linked device, its own
   *  as it said it to the phone. Missing for a device from before it, which the list does not name. */
  endpoint?: Endpoint;
  /** On the primary: the digest of what it was last told of the devices of each contact's account (lib/link-wire.ts `way`; lib/devices.ts wayDigest), by identity. */
  ways?: Record<string, string>;
  /** On the primary: the `n` of the device list it was last told, and where the other devices it names read, as told with it (JSON). */
  listed?: number;
  routed?: string;
  /** The key this side gave it for the packets it sends here, and the one it gave this side (lib/sealed-packet.ts), base64url. Missing while not said: a version from before says none, and is sealed nothing. */
  key?: string;
  sealTo?: string;
  /** Chat with myself (lock/myself-data.ts): whether it said it takes the notes (a version from before says nothing of them), whether this side said so to it, and the stamp they were told to it up to. */
  notesHeard?: true;
  notesSaid?: true;
  notesTold?: number;
};

/**
 * On the primary: a photo or file that came, passed on to devices, or a copy of one put on the relay
 * for them, left there until each device it went to took it (`devices`, by id) and, if it is still
 * to, this phone (`phone`): where it is (as FileRef's `from`), and when it was left.
 */
export type Left = { relay: string; ids: string; at: number; phone: boolean; devices: string[] };

/**
 * On a linked device: the accounts it brought of those the phone gave (lib/linked-accounts.ts),
 * which it lets go of once unlinked: a Matrix device, an XMPP account and a Nostr key, as
 * `@user:server` and its device, a bare JID, and the key's public half, hex.
 */
export type Brought = { matrix?: { userId: string; deviceId: string }; xmpp?: string; nostr?: string };

/** A device being linked: the key its code shows (its secret, base64), the code's secret, its name, and when it was made. */
export type Offer = { account: string; secret: string; name: string; made: number };

/** A device being linked, once a phone answered: the phone, the account's identity, and the code to compare. */
export type Answer = { peer: Peer; account: string; code: string };

export type DevicesData = {
  /** On the primary: its linked devices, and those still being linked. */
  devices: Peer[];
  /** On a linked device: the phone that holds the account. */
  primary: Peer | null;
  /** On a linked device: the account's identity, hex. */
  account: string;
  /** The account's contact link: on the primary as last said, on a linked device as last heard. */
  link: string;
  offer: Offer | null;
  answer: Answer | null;
  /** What of each contact was last said between the devices, by identity, so only what changed goes. */
  synced: Record<string, Synced>;
  /** On a linked device: packs of the history the primary put on the relay, still to take. */
  packs: FileOffer[];
  /** On the primary: photos and files left on the relay for devices still to take them. */
  left: Left[];
  /** On a linked device: the members of each of the account's groups, by the group's id, as the phone said them. */
  members: Record<string, GroupSeat[]>;
  /** In a space whose chats are a linked device's copy, from its backup (lib/devices.ts, copied): whether that was said. */
  copySaid: boolean;
  /** On a linked device: the account's other linked devices, reached directly (lib/siblings.ts). */
  siblings?: Siblings;
  /** On a linked device: when each contact was removed, by identity, and the tags erased in each chat, by its peer, so a late word of them does not bring them back. */
  removed?: Record<string, number>;
  erased?: Record<string, string[]>;
  /** On the primary, after its own queue moved for a contact deleted or blocked (lib/devices.ts
   *  movedFor): since when a new device list is due, signed at most once an hour (`resignedAt`, when
   *  the last was), and until when a device's new place is one it was asked to move to (`moving`). */
  resign?: number;
  resignedAt?: number;
  moving?: number;
  /** On a linked device: what of the accounts the phone gave it is still to bring, and what it brought (lib/linked-accounts.ts). */
  given?: GivenAccounts;
  brought?: Brought;
  /** Set in every file saved since packets said what they carry: in one from before (0.1.16), what
   *  waited for a device was kept with no marks, and goes with none (lib/relay.ts, Mark). */
  marked?: true;
};

export const EMPTY_DEVICES: DevicesData = { devices: [], primary: null, account: '', link: '', offer: null, answer: null, synced: {}, packs: [], left: [], members: {}, copySaid: false, marked: true };

export const FILE = 'erevos-devices';
const BLOCK = 16 * 1024;
/** The most packets that wait for one device: once there are as many, nothing more is sealed for it until they went. */
export const MAX_OUTBOX = 300;
/** The most photos and files kept track of as left on the relay for devices: the oldest are let go, to expire there. */
export const MAX_LEFT = 1000;

const isText = (v: unknown): v is string => typeof v === 'string';
const isBase64 = (v: unknown): v is string => isText(v) && /^[A-Za-z0-9+/]*={0,2}$/.test(v);
const isHex = (v: unknown, length: number): v is string => isText(v) && v.length === length && /^[0-9a-f]+$/.test(v);
const isTime = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0;

function checkedJob(value: unknown): Job | null {
  const v = value as Partial<Record<keyof Job, unknown>> | null;
  if (!v || typeof v !== 'object' || !isTime(v.since) || !isTime(v.upTo) || !isTime(v.done)) return null;
  return { since: v.since, files: v.files === true, upTo: v.upTo, done: v.done };
}

function checkedLeft(value: unknown): Left | null {
  const v = (value ?? {}) as Partial<Record<keyof Left, unknown>>;
  if (!isText(v.relay) || !isText(v.ids) || !/^(?:[0-9a-f]{48})+$/.test(v.ids) || !isTime(v.at)) return null;
  const devices = Array.isArray(v.devices) ? v.devices.filter((id): id is string => isHex(id, 64)) : [];
  return { relay: v.relay, ids: v.ids, at: v.at, phone: v.phone === true, devices };
}

function checkedTold(value: unknown): Record<string, Told> {
  const told: Record<string, Told> = {};
  if (!value || typeof value !== 'object') return told;
  for (const [id, t] of Object.entries(value)) {
    const v = (t ?? {}) as Partial<Record<keyof Told, unknown>>;
    if (isGroupId(id) && isText(v.meta) && isText(v.last)) told[id] = { meta: v.meta, last: v.last, at: isTime(v.at) ? v.at : 0, marks: isText(v.marks) ? v.marks : '' };
  }
  return told;
}

function checkedEndpoint(value: unknown): Endpoint | null {
  const v = (value ?? {}) as Partial<Record<keyof Endpoint, unknown>>;
  if (!isHex(v.id, 64) || !isText(v.bundle) || v.bundle.length > 4096 || !/^[A-Za-z0-9_-]+$/.test(v.bundle)) return null;
  return { id: v.id, bundle: v.bundle, ...(isRelayKey(v.ek) ? { ek: v.ek } : {}) };
}

// The marks of the packets still in `outbox`; null when none is not quiet.
function checkedMarks(value: unknown, outbox: string[]): Record<string, OutMark> | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Record<string, unknown>;
  const marks: Record<string, OutMark> = {};
  for (const packet of outbox) {
    const mark = Object.prototype.hasOwnProperty.call(v, packet) ? v[packet] : undefined;
    if (mark === 'message' || mark === 'ring' || mark === 'none') marks[packet] = mark;
  }
  return Object.keys(marks).length > 0 ? marks : null;
}

// `unmarked`: for a device in a file from before marks, whose outbox then goes with none, as a
// message from an older Erevos does: the relay pushes it, but counts nothing.
function checkedPeer(value: unknown, unmarked = false): Peer | null {
  const v = (value ?? {}) as Partial<Record<keyof Peer, unknown>>;
  const at = checkedPlace(v.at);
  if (!isHex(v.id, 64) || !isBase64(v.conversation) || !v.conversation || !at) return null;
  const endpoint = checkedEndpoint(v.endpoint);
  const outbox = Array.isArray(v.outbox) ? v.outbox.filter(isBase64) : [];
  const marks = unmarked && outbox.length > 0 ? Object.fromEntries(outbox.map((p): [string, OutMark] => [p, 'none'])) : checkedMarks(v.marks, outbox);
  return {
    id: v.id,
    name: isText(v.name) ? v.name : '',
    conversation: v.conversation,
    at,
    since: isTime(v.since) ? v.since : 0,
    heard: isTime(v.heard) ? v.heard : 0,
    linked: v.linked === true,
    outbox,
    ...(marks ? { marks } : {}),
    told: isText(v.told) ? v.told : '',
    history: checkedJob(v.history),
    files: v.files === true,
    behind: isTime(v.behind) ? v.behind : 0,
    groups: checkedTold(v.groups),
    ...(endpoint ? { endpoint } : {}),
    ...(isTime(v.listed) && v.listed > 0 ? { listed: v.listed } : {}),
    ...(isText(v.routed) ? { routed: v.routed } : {}),
    ...(isRelayKey(v.key) ? { key: v.key } : {}),
    ...(isRelayKey(v.sealTo) ? { sealTo: v.sealTo } : {}),
    ...(checkedWays(v.ways) ? { ways: checkedWays(v.ways)! } : {}),
    ...(v.accounts === true ? { accounts: true as const } : {}),
    ...(v.notesHeard === true ? { notesHeard: true as const } : {}),
    ...(v.notesSaid === true ? { notesSaid: true as const } : {}),
    ...(isTime(v.notesTold) && v.notesTold > 0 ? { notesTold: v.notesTold } : {}),
  };
}

function checkedBrought(value: unknown): Brought | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Partial<Record<keyof Brought, unknown>>;
  const m = (v.matrix ?? null) as { userId?: unknown; deviceId?: unknown } | null;
  const matrix = m && typeof m === 'object' && isText(m.userId) && m.userId.length <= 255 && isText(m.deviceId) && m.deviceId.length <= 255 ? { userId: m.userId, deviceId: m.deviceId } : null;
  const brought: Brought = {
    ...(matrix ? { matrix } : {}),
    ...(isText(v.xmpp) && v.xmpp.length <= 1024 ? { xmpp: v.xmpp } : {}),
    ...(isHex(v.nostr, 64) ? { nostr: v.nostr } : {}),
  };
  return Object.keys(brought).length > 0 ? brought : null;
}

function checkedWays(value: unknown): Record<string, string> | null {
  if (!value || typeof value !== 'object') return null;
  const ways: Record<string, string> = {};
  // One kept whole, by the version before, is no digest: that way is told once more.
  for (const [id, said] of Object.entries(value)) if (isHex(id, 64) && isHex(said, 16)) ways[id] = said;
  return Object.keys(ways).length > 0 ? ways : null;
}

function checked(value: unknown): DevicesData {
  const v = (value ?? {}) as Partial<Record<keyof DevicesData, unknown>>;
  const o = v.offer as Partial<Record<keyof Offer, unknown>> | null;
  const a = v.answer as Partial<Record<keyof Answer, unknown>> | null;
  const answerPeer = a ? checkedPeer(a.peer) : null;
  const synced: Record<string, Synced> = {};
  if (v.synced && typeof v.synced === 'object') {
    for (const [id, s] of Object.entries(v.synced)) {
      const one = checkedSynced(s);
      if (one && one.identity === id) synced[id] = one;
    }
  }
  const siblings = checkedSiblings(v.siblings);
  const given = checkedGiven(v.given, true);
  const brought = checkedBrought(v.brought);
  const removed = checkedRemoved(v.removed);
  const erased = checkedErased(v.erased);
  const members: Record<string, GroupSeat[]> = {};
  if (v.members && typeof v.members === 'object') {
    for (const [id, seats] of Object.entries(v.members)) {
      if (isGroupId(id) && Array.isArray(seats)) members[id] = seats.map(checkedSeat).filter((s): s is GroupSeat => s !== null);
    }
  }
  return {
    devices: Array.isArray(v.devices) ? v.devices.map((d) => checkedPeer(d, v.marked !== true)).filter((p): p is Peer => p !== null) : [],
    primary: checkedPeer(v.primary),
    account: isHex(v.account, 64) ? v.account : '',
    link: isText(v.link) ? v.link : '',
    offer: o && isBase64(o.account) && o.account && isHex(o.secret, 32) ? { account: o.account, secret: o.secret, name: isText(o.name) ? o.name : '', made: isTime(o.made) ? o.made : 0 } : null,
    answer: a && answerPeer && isHex(a.account, 64) && isText(a.code) ? { peer: answerPeer, account: a.account, code: a.code } : null,
    synced,
    packs: Array.isArray(v.packs) ? v.packs.map(readOffer).filter((o): o is FileOffer => o !== null) : [],
    left: Array.isArray(v.left) ? v.left.map(checkedLeft).filter((l): l is Left => l !== null).slice(-MAX_LEFT) : [],
    members,
    copySaid: v.copySaid === true,
    ...(siblings ? { siblings } : {}),
    ...(Object.keys(removed).length > 0 ? { removed } : {}),
    ...(Object.keys(erased).length > 0 ? { erased } : {}),
    ...(isTime(v.resign) && v.resign > 0 ? { resign: v.resign } : {}),
    ...(isTime(v.resignedAt) && v.resignedAt > 0 ? { resignedAt: v.resignedAt } : {}),
    ...(isTime(v.moving) && v.moving > 0 ? { moving: v.moving } : {}),
    ...(Object.keys(given).length > 0 ? { given } : {}),
    ...(brought ? { brought } : {}),
    marked: true,
  };
}

const store = sealedFile({ name: FILE, empty: EMPTY_DEVICES, checked, block: BLOCK });

export const loadDevicesData = (space: number, key: Uint8Array) => store.load('space', space, key);
export const saveDevicesData = (space: number, key: Uint8Array, data: DevicesData) => store.save('space', space, key, data);
