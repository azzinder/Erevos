// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { checkedChoices, checkedPlace, checkedPoll, checkedPreview, isStickerName, type Place, type Poll, type Preview } from '../lib/chat-parts';
import type { Mark } from '../lib/relay';
import { isFileRef, type FileRef } from './attachment-files';
import { checkedChatNotify, type ChatNotify } from './chat-notify';
import { checkedChatPin, type ChatPin } from './chat-pin';
import { isRelay, isRelayKey } from './e2e-data';
import { isReactionEmoji, isTag } from './history';
import { sealedFile, type Holder } from './sealed-file';

// What each space keeps for its group chats (lib/groups.ts): its MLS state (the Rust core's, with
// its signing key and every group it is in), the secret that opens group messages sealed to this
// phone, and each group with its messages. Kept sealed in FILE, one value for each space
// (sealed-file.ts), in blocks of BLOCK bytes. Hidden chats have no groups yet. A photo, file or
// voice message keeps where its chunks are (lock/attachment-files.ts), as a chat's do.

/** Where a member's group messages go, and the key they are sealed to: what it says about itself. */
export type About = {
  /** Its identity key in its chats, hex: who it is. */
  id: string;
  /** The relay sender id that reaches its queue, hex. */
  sender: string;
  /** The relay its queue is on, and that relay's key for sealed sends. */
  relay: string;
  relayKey: string;
  /** The public key group messages to it are sealed to, base64url. */
  seal: string;
};

/** A message in a group: `from` is the sender's identity, empty for this phone's own. A `note`
 *  says what happened in the group, such as who joined. */
export type GroupMessage = { at: number; from: string; text: string; tag: string; note?: boolean } & GroupMedia & GroupParts & GroupMarks;

/** What a message is or carries beyond its words or its file, as its sender sent it (lib/group-parts.ts):
 *  the tag of the message it answers, a sticker, a place, a poll, a link's preview, or that it was
 *  forwarded, and the members its words name with @ (`named`, lib/mentions.ts). A sticker's, a place's or a
 *  poll's words are its text, for an Erevos from before. */
export type GroupParts = { re?: string; sticker?: string; place?: Place; poll?: Poll; preview?: Preview; forwarded?: true; named?: string[] };

/** What was done to a message since: each member's reaction and vote, by identity ('' for this
 *  phone's), when it was pinned for everyone, when its sender last edited its words, and, on this
 *  phone only, its star. Of our own photo, file or voice message, `put` is its chunks' ids on our
 *  relay, to take them off when it is deleted for everyone. On a linked device (lib/devices.ts),
 *  `unsent` marks one of ours that the phone could not send. Of our own, each member's phone says
 *  when it came (`got`) and when it was read (`read`), by identity, as this phone heard it (lib/group-parts.ts
 *  withSeen): a member is in one of them at most. */
export type GroupMarks = {
  reactions?: Record<string, string>;
  votes?: Record<string, number[]>;
  pinned?: number;
  edited?: number;
  starred?: true;
  put?: string;
  unsent?: true;
  got?: Record<string, number>;
  read?: Record<string, number>;
};

/** A photo or file in a group's message: where it is, or where to take it from. With `ms`, it is
 *  a voice message's sound, and lasts that long, milliseconds. */
export type GroupMedia = { file?: FileRef; ms?: number };

export type Group = {
  /** The group's id, hex. */
  id: string;
  name: string;
  /** This phone made the group, and so adds and takes out members. */
  admin: boolean;
  /** In the group, asked to leave and waiting for the admin, or out of it (read only). */
  status: 'in' | 'leaving' | 'out';
  /** Contacts the admin asked for a key package, by identity, not answered yet. */
  asked: string[];
  /** Group messages from an epoch not reached yet, base64: tried again after the next commit. */
  later: string[];
  /** Group messages the relay did not take yet, sealed for their member, base64, with what each
   *  says it carries (lib/relay.ts, Mark): none for what rings, and for what was kept before marks. */
  outbox: { to: About; packet: string; mark?: Mark }[];
  /** Oldest first. */
  messages: GroupMessage[];
  /** Until when this phone read the group, milliseconds. */
  readAt: number;
  /** When this phone's keys in the group were last new (lib/groups.ts RENEW_EVERY), ms. Missing in
   *  what was kept before it, and so due. */
  keysAt?: number;
  /** When this phone last asked the keeper for new keys, ms, while it waits for the welcome. */
  renewing?: number;
  /** Until when this phone told the members whose messages it read that it read them, ms. Missing
   *  in what was kept before it: then as `readAt`. */
  seenAt?: number;
  /** How many group messages this phone sent to some members only since it last sent one to all
   *  (lib/groups.ts): the others skip as many of its keys. Missing when none. */
  apart?: number;
  /** Members this phone asked for their contact link (lib/groups.ts `askContact`), by identity, and
   *  when: their answer is taken while the ask is fresh. Missing when none. */
  wants?: { id: string; at: number }[];
  /** Members who asked this phone for its contact link, by identity, when, and the keys they gave,
   *  base64url: the card to Send or not. An empty key is one turned down, kept so that member asks
   *  no more for a while. Missing when none. */
  asks?: { id: string; at: number; key: string }[];
  /** The PIN the group opens with here, when locked with one of its own (lock/chat-pin.ts), as kept.
   *  Missing when it has none. Only this phone knows it. */
  pin?: ChatPin;
  /** The group's own notifications here (lock/chat-notify.ts): muted, its own sounds. Missing while
   *  it has none. Kept on this phone only, as its PIN. */
  notify?: ChatNotify;
};

export type GroupData = {
  /** The MLS state, base64. Empty until the first group. */
  state: string;
  /** The secret group messages to this phone are sealed to, base64. Empty until the first group. */
  seal: string;
  groups: Group[];
  /** Group messages for a group not here yet (its welcome is on its way), base64. */
  orphans: string[];
  /** Key packages given, as `group:identity`, so a contact cannot make this phone make many. */
  given: string[];
  /** Handed to another device of the account (docs/sync.md, S6): the MLS state as it went, JSON
   *  (lib/groups.ts HeldGroups), kept till that device says it took it, and given back here should
   *  it say it cannot; `to` is that device's id, '' for the phone. Wiped from `state` in the same save. */
  handed?: { to: string; held: string };
  /** The queues this phone said its group messages come to, as they were when the groups were handed
   *  on: their members write to them till their keys are made new, so they are kept a while (S6). */
  left?: { sender: string; at: number }[];
};

/** The largest MLS state handed between devices, as JSON (S6). */
export const MAX_HELD_GROUPS = 64 * 1024 * 1024;
const MAX_LEFT_SENDERS = 50;

export const EMPTY_GROUPS: GroupData = { state: '', seal: '', groups: [], orphans: [], given: [] };

export const FILE = 'erevos-groups';
const BLOCK = 16 * 1024;

export const MAX_GROUP_MESSAGES = 500;
export const MAX_LATER = 100;
export const MAX_OUTBOX = 200;
export const MAX_ORPHANS = 50;
export const MAX_GIVEN = 50;
/** The most members a group keeps asked for their contact link, and who asked for this phone's. */
export const MAX_CONTACT_ASKS = 100;
/** The longest key a member gives with its contact link, base64url: its bundle is about 1.8 KB. */
export const MAX_CONTACT_KEY = 4096;
// The most members a message keeps a reaction or a vote of.
const MAX_MARKS = 100;

const isText = (v: unknown): v is string => typeof v === 'string';
const isBase64 = (v: unknown): v is string => isText(v) && /^[A-Za-z0-9+/]*={0,2}$/.test(v);
const isHex = (v: unknown, length: number): v is string => isText(v) && v.length === length && /^[0-9a-f]*$/.test(v);
const isTime = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0;
const isContactKey = (v: unknown): v is string => isText(v) && v.length <= MAX_CONTACT_KEY && /^[A-Za-z0-9_-]*$/.test(v);

/** What a member says about itself, checked: null when it is not what an Erevos says. */
export function checkedAbout(value: unknown): About | null {
  const v = (value ?? {}) as Partial<Record<keyof About, unknown>>;
  if (!isHex(v.id, 64) || !isHex(v.sender, 48) || !isRelay(v.relay) || !isRelayKey(v.seal)) return null;
  return { id: v.id, sender: v.sender, relay: v.relay, relayKey: isRelayKey(v.relayKey) ? v.relayKey : '', seal: v.seal };
}

function checkedMessage(value: unknown): GroupMessage | null {
  const v = (value ?? {}) as Partial<Record<keyof GroupMessage, unknown>>;
  if (!isTime(v.at) || !isText(v.text) || !(v.from === '' || isHex(v.from, 64))) return null;
  return {
    at: v.at,
    from: v.from as string,
    text: v.text,
    tag: isTag(v.tag) ? v.tag : '',
    ...(v.note === true ? { note: true } : {}),
    ...checkedMedia(v),
    ...checkedParts(v as Record<string, unknown>, v.from === ''),
  };
}

// What each member did, by identity ('' for this phone), of what passes `check`; none when empty.
function byMember<T>(value: unknown, check: (v: unknown) => T | null): Record<string, T> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const kept: Record<string, T> = {};
  for (const [who, v] of Object.entries(value).slice(0, MAX_MARKS)) {
    const checked = who === '' || isHex(who, 64) ? check(v) : null;
    if (checked !== null) kept[who] = checked;
  }
  return Object.keys(kept).length > 0 ? kept : undefined;
}

function checkedParts(v: Record<string, unknown>, mine: boolean): GroupParts & GroupMarks {
  const place = checkedPlace(v.place);
  const poll = checkedPoll(v.poll);
  const preview = checkedPreview(v.preview);
  const reactions = byMember(v.reactions, (emoji) => (isReactionEmoji(emoji) ? emoji : null));
  const votes = poll ? byMember(v.votes, (chose) => checkedChoices(chose, poll.o.length, !!poll.m)) : undefined;
  return {
    ...(isTag(v.re) ? { re: v.re } : {}),
    ...(isStickerName(v.sticker) ? { sticker: v.sticker } : {}),
    ...(place ? { place } : {}),
    ...(poll ? { poll } : {}),
    ...(preview ? { preview } : {}),
    ...(v.forwarded === true ? { forwarded: true as const } : {}),
    ...(reactions ? { reactions } : {}),
    ...(votes ? { votes } : {}),
    ...(isTime(v.pinned) && v.pinned > 0 ? { pinned: v.pinned } : {}),
    ...(isTime(v.edited) && v.edited > 0 ? { edited: v.edited } : {}),
    ...(v.starred === true ? { starred: true as const } : {}),
    ...(mine && isText(v.put) && /^(?:[0-9a-f]{48})+$/.test(v.put) ? { put: v.put } : {}),
    ...(mine && v.unsent === true ? { unsent: true as const } : {}),
    ...(mine ? seenBy(v.got, v.read) : {}),
  };
}

// When each member's phone said one of ours came and was read, by identity (not this phone's), each member in one at most.
function seenBy(got: unknown, read: unknown): Pick<GroupMarks, 'got' | 'read'> {
  const when = (at: unknown) => (isTime(at) ? at : null);
  const readBy = byMember(read, when);
  if (readBy) delete readBy[''];
  const gotBy = byMember(got, when);
  if (gotBy) for (const who of ['', ...Object.keys(readBy ?? {})]) delete gotBy[who];
  return {
    ...(gotBy && Object.keys(gotBy).length > 0 ? { got: gotBy } : {}),
    ...(readBy && Object.keys(readBy).length > 0 ? { read: readBy } : {}),
  };
}

function checkedMedia(v: { file?: unknown; ms?: unknown }): GroupMedia {
  if (!isFileRef(v.file)) return {};
  return { file: v.file, ...(isTime(v.ms) ? { ms: v.ms } : {}) };
}

/** A group as kept, checked: null when it is not one. */
export function checkedGroup(value: unknown): Group | null {
  const v = (value ?? {}) as Partial<Record<keyof Group, unknown>>;
  if (!isHex(v.id, 32)) return null;
  const list = <T>(items: unknown, check: (item: unknown) => T | null, max: number) =>
    (Array.isArray(items) ? items.map(check).filter((item): item is T => item !== null) : []).slice(-max);
  const wants = list(
    v.wants,
    (i) => {
      const w = (i ?? {}) as { id?: unknown; at?: unknown };
      return isHex(w.id, 64) && isTime(w.at) ? { id: w.id, at: w.at } : null;
    },
    MAX_CONTACT_ASKS,
  );
  const asks = list(
    v.asks,
    (i) => {
      const a = (i ?? {}) as { id?: unknown; at?: unknown; key?: unknown };
      return isHex(a.id, 64) && isTime(a.at) && isContactKey(a.key) ? { id: a.id, at: a.at, key: a.key } : null;
    },
    MAX_CONTACT_ASKS,
  );
  return {
    id: v.id,
    name: isText(v.name) ? v.name : '',
    admin: v.admin === true,
    status: v.status === 'leaving' || v.status === 'out' ? v.status : 'in',
    asked: list(v.asked, (i) => (isHex(i, 64) ? i : null), 100),
    later: list(v.later, (i) => (isBase64(i) ? i : null), MAX_LATER),
    outbox: list(
      v.outbox,
      (i) => {
        const o = (i ?? {}) as { to?: unknown; packet?: unknown; mark?: unknown };
        const to = checkedAbout(o.to);
        const mark: { mark?: Mark } = o.mark === 'message' || o.mark === 'quiet' || o.mark === 'ring' ? { mark: o.mark } : {};
        return to && isBase64(o.packet) ? { to, packet: o.packet, ...mark } : null;
      },
      MAX_OUTBOX,
    ),
    messages: list(v.messages, checkedMessage, MAX_GROUP_MESSAGES),
    readAt: isTime(v.readAt) ? v.readAt : 0,
    ...(isTime(v.keysAt) ? { keysAt: v.keysAt } : {}),
    ...(isTime(v.renewing) ? { renewing: v.renewing } : {}),
    ...(isTime(v.seenAt) ? { seenAt: v.seenAt } : {}),
    ...(isTime(v.apart) && v.apart > 0 ? { apart: Math.floor(v.apart) } : {}),
    ...(wants.length > 0 ? { wants } : {}),
    ...(asks.length > 0 ? { asks } : {}),
    ...(checkedChatPin(v.pin) ? { pin: checkedChatPin(v.pin)! } : {}),
    ...(checkedChatNotify(v.notify) ? { notify: checkedChatNotify(v.notify)! } : {}),
  };
}

/** What a group store holds, checked, as kept or as handed from another device (lib/groups.ts HeldGroups). */
export function checkedGroupData(value: unknown): GroupData {
  const v = (value ?? {}) as Partial<Record<keyof GroupData, unknown>>;
  return {
    state: isBase64(v.state) ? v.state : '',
    seal: isBase64(v.seal) ? v.seal : '',
    groups: Array.isArray(v.groups) ? v.groups.map(checkedGroup).filter((g): g is Group => g !== null) : [],
    orphans: Array.isArray(v.orphans) ? v.orphans.filter(isBase64).slice(-MAX_ORPHANS) : [],
    given: Array.isArray(v.given) ? v.given.filter(isText).slice(-MAX_GIVEN) : [],
    ...(checkedHanded(v.handed) ? { handed: checkedHanded(v.handed)! } : {}),
    ...(checkedLeft(v.left).length > 0 ? { left: checkedLeft(v.left) } : {}),
  };
}

function checkedHanded(value: unknown): GroupData['handed'] | null {
  const v = (value ?? {}) as { to?: unknown; held?: unknown };
  return isText(v.to) && /^[0-9a-f]{0,64}$/.test(v.to) && isText(v.held) && v.held.length > 0 && v.held.length <= MAX_HELD_GROUPS ? { to: v.to, held: v.held } : null;
}

function checkedLeft(value: unknown): { sender: string; at: number }[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((x) => (x ?? {}) as { sender?: unknown; at?: unknown })
    .filter((x): x is { sender: string; at: number } => isText(x.sender) && x.sender.length > 0 && x.sender.length <= 128 && isTime(x.at))
    .map(({ sender, at }) => ({ sender, at }))
    .slice(-MAX_LEFT_SENDERS);
}

const store = sealedFile({ name: FILE, empty: EMPTY_GROUPS, checked: checkedGroupData, block: BLOCK });

/** The groups of a space, or of a hidden place (`holder`, lock/sealed-file.ts hiddenHolder). */
export const loadGroupData = (space: number, key: Uint8Array, holder: Holder = 'space') => store.load(holder, space, key);
export const saveGroupData = (space: number, key: Uint8Array, data: GroupData, holder: Holder = 'space') => store.save(holder, space, key, data);
