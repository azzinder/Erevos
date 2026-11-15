// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { isRelay, isRelayKey } from './e2e-data';
import { checkedAbout, type About } from './group-data';
import { isTag } from './history';
import { sealedFile, type Holder } from './sealed-file';

// What each space keeps for its public groups (lib/public-groups.ts, docs/public-groups.md),
// beside what it keeps for every group (group-data.ts): for each, the door its owner's phone reads
// requests from, the requests waiting for an admin, the mutes and bans as its admins last said,
// what was deleted for everyone, and the admins of the last epochs; and the requests to join this
// phone sent and waits on. Kept sealed in FILE, one value for each space (sealed-file.ts), in
// blocks of BLOCK bytes.

/** The door's queue on the owner's relay, and the secret its requests are sealed to: only on the owner's phone. */
export type DoorKept = {
  relay: string;
  /** The queue's ids, hex: the recipient id reads it, the sender id is in the link. */
  recipient: string;
  sender: string;
  /** The relay's key for sealed sends, in the link. */
  relayKey: string;
  /** The secret requests are sealed to, base64, and its public key, base64url, in the link. */
  secret: string;
  key: string;
};

/** A request waiting for an admin's yes, on the owner's phone: who, the name they gave, and their key package (base64). */
export type Waiting = { key: string; name: string; about: About; keyPackage: string; at: number };

/** Someone who asks to join, as the owner's phone told the admins. */
export type Asked = { key: string; name: string; at: number };

/** A mute or a ban, as the last admin's step said (lib/public-rules.ts). */
export type MarkKept = { key: string; on: boolean; at: number; by: string };
export type BanKept = MarkKept & { sender: string; seal: string; name: string };

/** Who was owner and admin in an epoch, by their keys: what an admin's step written then is weighed by. */
export type Epoch = { epoch: number; keeper: string; admins: string[] };

export type PublicGroup = {
  /** The group's id, hex, as in group-data.ts. */
  id: string;
  /** This phone's key in the group, hex. */
  me: string;
  door: DoorKept | null;
  /** The door's link as the rules last said, for every member to show. Empty when there is none. */
  link: string;
  approve: boolean;
  waiting: Waiting[];
  asked: Asked[];
  mutes: MarkKept[];
  bans: BanKept[];
  /** Members an admin took out, until the owner's commit takes them out of the group. */
  outs: string[];
  /** Messages deleted for everyone, as `sender key|tag`. */
  deleted: string[];
  /** Oldest first. */
  epochs: Epoch[];
  /** The names members chose, by key: kept for those who left too, for their messages. */
  names: Record<string, string>;
  /** On the owner's phone: keys let in anew, each in place of a seat that says the same of itself
   *  (its phone forgot the group), whose old seat goes once the new one is heard from. */
  again: string[];
  /** When the group ends (ms), as its rules say: then this phone deletes it (lib/public-groups.ts endDue). Missing: it lasts. */
  ends?: number;
};

/** A request to join this phone sent: the group, the door it went to, the key made for it, the
 *  name chosen for it, the group's name as its link said, and when. */
export type Asking = { group: string; door: string; key: string; name: string; title: string; at: number };

export type PublicData = { groups: PublicGroup[]; asking: Asking[] };

export const EMPTY_PUBLIC: PublicData = { groups: [], asking: [] };

export const FILE = 'erevos-public-groups';
const BLOCK = 16 * 1024;

export const MAX_EPOCHS = 8;
export const MAX_ASKING = 20;
export const MAX_NAMES = 300;
const MAX_MARKS = 200;
const MAX_LIST = 200;

const isText = (v: unknown): v is string => typeof v === 'string';
const isBase64 = (v: unknown): v is string => isText(v) && /^[A-Za-z0-9+/]*={0,2}$/.test(v);
const isHex = (v: unknown, length: number): v is string => isText(v) && v.length === length && /^[0-9a-f]*$/.test(v);
const isTime = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0;
const isKey = (v: unknown): v is string => isHex(v, 64);

const list = <T>(items: unknown, check: (item: unknown) => T | null, max: number): T[] =>
  (Array.isArray(items) ? items.map(check).filter((item): item is T => item !== null) : []).slice(-max);

function checkedDoor(value: unknown): DoorKept | null {
  const v = (value ?? {}) as Partial<Record<keyof DoorKept, unknown>>;
  if (!isRelay(v.relay) || !isHex(v.recipient, 48) || !isHex(v.sender, 48) || !isBase64(v.secret) || !isRelayKey(v.key)) return null;
  return { relay: v.relay, recipient: v.recipient, sender: v.sender, relayKey: isRelayKey(v.relayKey) ? v.relayKey : '', secret: v.secret, key: v.key };
}

function checkedMark(value: unknown): MarkKept | null {
  const v = (value ?? {}) as Partial<Record<keyof MarkKept, unknown>>;
  if (!isKey(v.key) || typeof v.on !== 'boolean' || !isTime(v.at) || !isKey(v.by)) return null;
  return { key: v.key, on: v.on, at: v.at, by: v.by };
}

function checkedBan(value: unknown): BanKept | null {
  const mark = checkedMark(value);
  const v = (value ?? {}) as { sender?: unknown; seal?: unknown; name?: unknown };
  return mark && isHex(v.sender, 48) && isRelayKey(v.seal) ? { ...mark, sender: v.sender, seal: v.seal, name: isText(v.name) ? v.name : '' } : null;
}

function checkedWaiting(value: unknown): Waiting | null {
  const v = (value ?? {}) as Partial<Record<keyof Waiting, unknown>>;
  const about = checkedAbout(v.about);
  if (!isKey(v.key) || !isText(v.name) || !about || !isBase64(v.keyPackage) || !isTime(v.at)) return null;
  return { key: v.key, name: v.name, about, keyPackage: v.keyPackage, at: v.at };
}

function checkedAsked(value: unknown): Asked | null {
  const v = (value ?? {}) as Partial<Record<keyof Asked, unknown>>;
  return isKey(v.key) && isText(v.name) && isTime(v.at) ? { key: v.key, name: v.name, at: v.at } : null;
}

function checkedEpoch(value: unknown): Epoch | null {
  const v = (value ?? {}) as Partial<Record<keyof Epoch, unknown>>;
  if (!isTime(v.epoch) || !isKey(v.keeper) || !Array.isArray(v.admins)) return null;
  return { epoch: v.epoch, keeper: v.keeper, admins: v.admins.filter(isKey) };
}

function checkedGroup(value: unknown): PublicGroup | null {
  const v = (value ?? {}) as Partial<Record<keyof PublicGroup, unknown>>;
  if (!isHex(v.id, 32) || !isKey(v.me)) return null;
  return {
    id: v.id,
    me: v.me,
    door: checkedDoor(v.door),
    link: isText(v.link) ? v.link : '',
    approve: v.approve === true,
    waiting: list(v.waiting, checkedWaiting, MAX_LIST),
    asked: list(v.asked, checkedAsked, MAX_LIST),
    mutes: list(v.mutes, checkedMark, MAX_MARKS),
    bans: list(v.bans, checkedBan, MAX_MARKS),
    outs: list(v.outs, (i) => (isKey(i) ? i : null), MAX_LIST),
    deleted: list(v.deleted, (i) => (isText(i) && isKey(i.slice(0, 64)) && isTag(i.slice(65)) ? i : null), MAX_LIST),
    epochs: list(v.epochs, checkedEpoch, MAX_EPOCHS),
    names: checkedNames(v.names),
    again: list(v.again, (i) => (isKey(i) ? i : null), MAX_LIST),
    ...(isTime(v.ends) && v.ends > 0 ? { ends: v.ends } : {}),
  };
}

function checkedNames(value: unknown): Record<string, string> {
  const entries = Object.entries(value && typeof value === 'object' ? value : {}).filter(([key, name]) => isKey(key) && isText(name));
  return Object.fromEntries(entries.slice(-MAX_NAMES));
}

function checkedAsking(value: unknown): Asking | null {
  const v = (value ?? {}) as Partial<Record<keyof Asking, unknown>>;
  if (!isHex(v.group, 32) || !isHex(v.door, 48) || !isKey(v.key) || !isText(v.name) || !isTime(v.at)) return null;
  return { group: v.group, door: v.door, key: v.key, name: v.name, title: isText(v.title) ? v.title : '', at: v.at };
}

function checked(value: unknown): PublicData {
  const v = (value ?? {}) as Partial<Record<keyof PublicData, unknown>>;
  return {
    groups: Array.isArray(v.groups) ? v.groups.map(checkedGroup).filter((g): g is PublicGroup => g !== null) : [],
    asking: list(v.asking, checkedAsking, MAX_ASKING),
  };
}

const store = sealedFile({ name: FILE, empty: EMPTY_PUBLIC, checked, block: BLOCK });

/** The public groups of a space, or of a hidden place (`holder`, lock/sealed-file.ts hiddenHolder). */
export const loadPublicGroupData = (space: number, key: Uint8Array, holder: Holder = 'space') => store.load(holder, space, key);
export const savePublicGroupData = (space: number, key: Uint8Array, data: PublicData, holder: Holder = 'space') => store.save(holder, space, key, data);
