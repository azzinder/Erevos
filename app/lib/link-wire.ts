// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { checkedAvatar, checkedBlocked, checkedSpare, cleanName, isNostrRelay, isRelay, isRelayKey, isTimer, MAX_BLOCKED, MAX_NOSTR_RELAYS, type Avatar, type Blocked, type Contact, type Spare } from '../lock/e2e-data';
import { MAX_GROUP_MESSAGES, type Group, type GroupMarks, type GroupMessage, type GroupParts } from '../lock/group-data';
import { isReactionEmoji, isTag, type Mark, type Parts as ChatParts } from '../lock/history';
import { checkedLook, type Look } from '../theme/look';
import { isEvery, type Every } from './note-repeat';
import { offerRef, readOffer, type FileFrom, type FileOffer } from './attachments';
import { carriedOf, checkedChoices, editableWords, MAX_EDIT, previewAfterEdit } from './chat-parts';
import { checkContact, checkSpare, type ContactCode } from './contact-code';
import { fromBase64, randomBytes, toBase64, toHex, utf8Decode, utf8Encode } from './crypto';
import { bodyOf, checkedList, checkedPass, MAX_LISTED, type DeviceList, type Pass } from './device-list';
import { waysFor, withRoutes } from './endpoints';
import { groupPartsOf, markedOf, type Marked } from './group-parts';
import { cleanGroupName, decodeGroup, encodeGroup, isGroupId, type GroupSignal } from './group-signal';
import { checkedOffer, type ChunkOffer } from './sync/lan-chunks';

// What goes between the devices of one account (lib/devices.ts), inside the conversation of their
// link: JSON, one envelope in each packet, each saying what kind it is (`k`) and where its sender
// reads (`at`), so the other learns a new queue with the next one. From the primary (the phone that
// holds the account): its first message (`hello`), the contacts (`contacts`), a contact's message it
// opened (`in`), one it sealed for a contact (`out`), a pack of the history on the relay's file store
// (`history`), that a call was answered or turned down on another device (`call`), what changed in
// the groups (`groups`), what changed in messages told already (`changed`), the account's device
// list (`list`, lib/device-list.ts, with where each of the devices it names reads), the space's
// Matrix, XMPP and Nostr accounts (`accounts`, lib/linked-accounts.ts), where it is now (`here`)
// and that it unlinked the device (`bye`). From a linked device: that the codes match
// (`ready`), its own endpoint (`endpoint`), a message for a contact (`send`), a contact to add
// (`add`), a change to a contact (`set`), what to do in a group (`group`), the photos and files it
// took (`took`), where it is (`here`) and that it unlinked itself (`bye`). Between two linked
// devices, in their endpoints' own conversation (lib/siblings.ts): what one sealed for a contact
// (`out`), a change it made to a contact (`set`) and where it is (`here`). A change to a contact
// says when it was made (`when`), and the contacts when each field was set (`at`), so changes made
// at once settle the later first. An envelope too large for one packet goes in parts (`part`). Each
// also says the key its sender gives the other for the packets it sends back (`pk`,
// lib/sealed-packet.ts). A version from before leaves the kinds and the fields it does not know alone.
//
// A contact's message travels as the JSON lib/e2e.ts makes of it (`m`), without where the contact's
// queue is, which only the primary needs. Which messages go on, and which are worth telling the
// other devices, is decided from that JSON alone, so what a later version adds to a message goes on
// unread. A call's signals go too, as lib/linked-calls.ts decides on the primary. A group's
// messages go as the primary keeps them (lib/groups.ts), each told apart by its sender and tag,
// with what was done to them since (reactions, votes, a pin, the primary's star); what is done to
// one later goes as a change to it, by its tag, as does a star or deleting on the primary only in a
// chat, which the contact is not told of. A version from before leaves `changed` alone.
// Self-contained on purpose, so it can run under plain Node for checks.

/** Where a device reads: the sender id of its queue, the relay (ws:// or wss://), that relay's key (base64url, or empty), and its backup queue. */
export type Place = { sender: string; relay: string; relayKey: string; spare: Spare | null };

/** What of a contact every device of the account keeps alike. A photo picture stays where it was chosen: `avatar` is left out for one. */
export type Synced = {
  identity: string;
  name: string;
  timer: number;
  timerAt: number;
  request: boolean;
  look: Look | null;
  avatar?: Avatar | null;
  hide: boolean;
  /** When each field was last set, and when the contact was added, as a primary of this version says them (lib/siblings.ts). */
  at?: FieldTimes;
};

/** The fields of a contact that settle by when each was set, the later first; the timer has its own time (`timerAt`). */
export const TIMED = ['name', 'look', 'avatar', 'hide'] as const;

/** When each of a contact's TIMED fields was last set, and when it was added (`added`), milliseconds, by the clock of the device that did it. */
export type FieldTimes = Partial<Record<(typeof TIMED)[number] | 'added', number>>;

/** A contact's message, as JSON. */
export type Json = Record<string, unknown>;

export type Envelope =
  | { k: 'hello'; secret: string; name: string; account: string; h?: 0 | 1 }
  | { k: 'ready'; name: string }
  | { k: 'contacts'; all: boolean; list: Synced[]; gone: string[]; link?: string }
  | { k: 'in'; c: string; m: Json }
  | { k: 'out'; c: string; m: Json; mark?: Mark }
  | { k: 'send'; c: string; m: Json }
  | { k: 'add'; code: ContactCode; when?: number }
  | { k: 'blocked'; list: Blocked[] }
  | { k: 'unblock'; c: string }
  | { k: 'set'; c: string; change: Partial<Omit<Synced, 'identity' | 'at'>>; remove?: boolean; when?: number; added?: true; del?: Deleted }
  | { k: 'history'; offer: FileOffer; last: boolean }
  | { k: 'took'; ids: string[] }
  | { k: 'call'; id: string; done: 'answered' | 'declined' }
  | { k: 'groups'; list: GroupMirror[]; gone: string[]; entries: GroupEntry[]; all?: true }
  | { k: 'group'; id: string; ask: GroupAsk }
  | { k: 'changed'; chats: ChatChange[]; groups: GroupChange[]; whole: WholeGroup[] }
  | { k: 'endpoint'; bundle: string; ek?: string }
  | { k: 'list'; list: DeviceList; ak: string; real?: string[]; routes?: Record<string, Place>; ab?: string; ap?: Pass }
  | { k: 'way'; c: string; dv?: number; list?: DeviceList }
  | { k: 'came'; c: string; got: string[] }
  | ({ k: 'accounts' } & GivenAccounts)
  | { k: 'notes'; list: NoteSaid[]; gone: { id: string; v: number }[]; keep?: true }
  | { k: 'here' }
  | { k: 'sync'; s: Json }
  | ({ k: 'chunks' } & ChunkOffer)
  | { k: 'cfetch'; ids: string[] }
  | { k: 'cfile'; list: { id: string; offer: FileOffer }[] }
  | { k: 'move' }
  // The groups held on another device (docs/sync.md, S6): their MLS state handed on, as a file on
  // the relay (`hold`); asked back (`give`); a group message (`gpkt`, base64, `h` the times it was
  // passed on) or a contact's group signal (`gsig`) that came where they are not held.
  | { k: 'hold'; offer: FileOffer }
  | { k: 'give' }
  | { k: 'gpkt'; p: string; h: number }
  | { k: 'gsig'; c: string; s: GroupSignal; r?: true }
  // Taken (`held`) or not to be taken (`nohold`, it is kept where it came from again): the state
  // handed on, by its file's first piece (`f`). And, from a device, that it can hold them (`can`).
  | { k: 'held'; f: string }
  | { k: 'nohold'; f: string }
  | { k: 'can'; g: 1 }
  | { k: 'bye' };

/**
 * A note of Chat with myself as it goes to the account's other devices (lock/myself-data.ts): its
 * words, when it was written and last changed (`v`), its reminder, and its photo or file as where it
 * waits on the relay, or its voice message's sound, base64. With `keep` on the envelope, the photos
 * and files stay on the relay for the other devices that take them too, until they expire there.
 */
export type NoteSaid = { id: string; at: number; v: number; text: string; due?: number; every?: Every; told?: true; file?: FileOffer; voice?: { ms: number; data: string } };

/** The most notes, and deletions, one envelope says. */
export const MAX_NOTES_SAID = 5000;
const NOTE_ID = /^[0-9a-f]{16}$/;
// The longest a note's words are (lock/myself-data.ts MAX_NOTE_TEXT), and a voice message's sound
// (lib/voice.ts MAX_VOICE_MS: a minute, at most 64 kbit/s), base64.
const NOTE_TEXT = 8000;
export const MAX_NOTE_VOICE = 1_000_000;

function checkedNoteSaid(value: unknown): NoteSaid | null {
  if (!isObject(value)) return null;
  const v = value;
  if (!isText(v.id) || !NOTE_ID.test(v.id) || !isTime(v.at) || !isTime(v.v) || !isText(v.text) || v.text.length > NOTE_TEXT) return null;
  const file = v.file !== undefined ? readOffer(v.file) : null;
  const voice = isObject(v.voice) && isTime(v.voice.ms) && isText(v.voice.data) && v.voice.data.length <= MAX_NOTE_VOICE && /^[A-Za-z0-9+/]*={0,2}$/.test(v.voice.data) ? { ms: v.voice.ms, data: v.voice.data } : null;
  return {
    id: v.id,
    at: v.at,
    v: v.v,
    text: v.text,
    ...(isTime(v.due) ? { due: v.due } : {}),
    ...(isTime(v.due) && isEvery(v.every) ? { every: { u: v.every.u, n: v.every.n } } : {}),
    ...(v.told === true ? { told: true as const } : {}),
    ...(file ? { file } : voice ? { voice } : {}),
  };
}

/**
 * The space's own accounts on other networks, as the phone gives them to a device of its own
 * (lib/linked-accounts.ts): never a hidden place's, which no device is linked to.
 */
export type GivenAccounts = { matrix?: GivenMatrix; xmpp?: GivenXmpp; nostr?: GivenNostr };

/**
 * A Matrix account: its homeserver and user; a one-use login token for a new device, when the
 * homeserver gave the phone one (`token`); and the account's cross-signing keys and its key
 * backup's key, when the phone has them, which the device takes once it is signed in as that user,
 * so other people's apps trust it as the account's own and it opens the messages from before. A
 * Matrix device is never copied: the device signs in as a new one. Kept on the device while it
 * waits to be signed in to by hand, which it was not before the account came (`waited`).
 */
export type GivenMatrix = {
  homeserver: string;
  userId: string;
  token?: string;
  keys?: { master: string; selfSigning: string; userSigning: string };
  backup?: string;
  waited?: true;
};

/** An XMPP account: its bare JID, its password, and its server when given by hand (lib/xmpp-net.ts XmppServer). The device signs in as a new resource, with an OMEMO device of its own. */
export type GivenXmpp = { jid: string; password: string; server?: { host: string; port: number; tls: 'direct' | 'starttls' } | { websocket: string } };

/** The space's Nostr key for chats with other Nostr apps (lib/nostr-dm.ts): its secret, hex, the relays it reads on, the name it shows, and its file servers. */
export type GivenNostr = { secret: string; inbox: string[]; name?: string; files?: string[] };

/** A contact a device removed by Delete contact (1) or Block contact (2), not from the address book
 *  only: the phone deletes or blocks them too, and moves its queues (lib/queue-move.ts). */
export type Deleted = 1 | 2;

/** A member of a group as the primary tells its devices: its place in the group, its identity (empty if not known), and whether it is the account. */
export type GroupSeat = { leaf: number; id: string; me: boolean };

/** A group as the primary tells its devices of it: what the screens show of it, and its members. */
export type GroupMirror = Pick<Group, 'id' | 'name' | 'admin' | 'status' | 'asked' | 'readAt'> & { members: GroupSeat[] };

/**
 * A group's message as it goes to the devices: a photo, file or voice message as where it waits on
 * the relay, what it answers or is beyond its words (lib/group-parts.ts), and what was done to it
 * since (`marks`, always said by a version that says them).
 */
export type GroupEntry = { group: string; at: number; from: string; text: string; tag: string; note?: boolean; ms?: number; file?: FileOffer; parts?: GroupParts; marks?: GroupMarked };

/** What was done to a group's message since it went, as the devices are told of it: each member's reaction and vote, its pin, the primary's star, and, edited, its words now and when; of the account's own, when it came to each member and when each read it. */
export type GroupMarked = Pick<GroupMarks, 'reactions' | 'votes' | 'pinned' | 'starred' | 'edited' | 'got' | 'read'> & { text?: string };

/**
 * What changed of a group's message the devices were told of, by its tag: each member's reactions
 * and votes, and its pin, as they are now (null: none any more); the primary's star; its words as
 * its sender edited them, and when (`text`, `edited`); of the account's own, when it came to each
 * member and when each read it, as they are now (`got`, `read`); that it is gone there; or, to the
 * device that wrote it, that the primary could not send it (`unsent`).
 */
export type GroupChange = {
  group: string;
  tag: string;
  gone?: true;
  reactions?: Record<string, string> | null;
  votes?: Record<string, number[]> | null;
  pinned?: number | null;
  starred?: boolean;
  text?: string;
  edited?: number;
  got?: Record<string, number> | null;
  read?: Record<string, number> | null;
  unsent?: true;
};

/** A group whose marks are said whole, with the tags of all its messages: a device lets go of the marks not said, and of the messages not among them. */
export type WholeGroup = { group: string; tags: string[] };

/**
 * What was done on the primary only to one of a chat's messages, which the contact is not told of:
 * starred there or not (`starred`), or deleted there (`gone`); with no tag, the chat's messages
 * deleted there.
 */
export type ChatChange = { c: string; tag?: string; starred?: boolean; gone?: true };

/**
 * What a linked device has the primary do in a group: write in it, with the tag the device kept it
 * by and what it answers or is beyond its words; say something of a message (a reaction, a vote, a
 * pin, deleting its own for everyone); or change the group.
 */
export type GroupAsk =
  | { t: 'text'; text: string; tag: string; parts?: GroupParts }
  | { t: 'file'; file: FileOffer; tag: string; ms?: number; parts?: GroupParts }
  | { t: 'mark'; marked: Marked }
  | { t: 'add'; identities: string[] }
  | { t: 'name'; name: string }
  | { t: 'remove'; leaf: number }
  | { t: 'leave' }
  | { t: 'forget' }
  | { t: 'read' };

type Said = Envelope & { at?: Place; pk?: string };
/** The most files of the Collection asked of, or told by, a device at once. */
const MAX_COLLECTION_ASKED = 20;
const onRelayOffer = (offer: FileOffer) => offer.via === undefined;

type Part = { k: 'part'; id: string; n: number; of: number; d: string };

/** The largest envelope one packet takes: the core's largest padding bucket holds 16383 bytes. */
export const MAX_ENVELOPE = 16 * 1024 - 1;
// The longest group message passed on between devices, base64: a welcome of the largest group, sealed.
const MAX_GROUP_PACKET = 256 * 1024;
/** How the groups' state handed on is named back (`held`, `nohold`): its file's first piece id, hex. */
export const HELD_MARK = 48;
export const heldMark = (offer: FileOffer): string => offer.ids.slice(0, HELD_MARK);
// An envelope larger than this goes in parts of PART_BYTES each.
const SPLIT_OVER = 15 * 1024;
const PART_BYTES = 10 * 1024;
// The most parts one envelope is cut into, and how long parts wait for the rest.
const MAX_PARTS = 128;
const PARTS_STALE = 30 * 60_000;
/** The most files one `took` says. */
export const MAX_TOOK = 50;
// The most tags one `came` says, as a message says at most.
const MAX_CAME = 200;
// About how large the messages of one `groups`, or the changes of one `changed`, grow, so that one goes in a few parts.
const GROUP_BYTES = 200 * 1024;
// The most members a group's message is said to have a reaction or a vote of, as lock/group-data.ts keeps.
const MAX_MARKS = 100;
// How long a device keeps a message of its own that the primary, saying a group's marks whole, does
// not have: what the device wrote may not have reached it yet.
const OWN_KEPT = 10 * 60_000;

const isText = (v: unknown): v is string => typeof v === 'string';
const isHex = (v: unknown, length: number): v is string => isText(v) && v.length === length && /^[0-9a-f]+$/.test(v);
const isTime = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0;
const isObject = (v: unknown): v is Json => !!v && typeof v === 'object' && !Array.isArray(v);
// A bundle as a contact link carries it: about 1800 characters of base64url.
const isBundle = (v: unknown): v is string => isText(v) && v.length > 0 && v.length <= 4096 && /^[A-Za-z0-9_-]+$/.test(v);
// A group message's tag as a member's phone may make it.
const isGroupTag = (v: unknown): v is string => isText(v) && v.length > 0 && v.length <= 64;

/** A place as said, checked: null when it is not one. */
export function checkedPlace(value: unknown): Place | null {
  const v = (value ?? {}) as Partial<Record<keyof Place, unknown>>;
  if (!isHex(v.sender, 48) || !isRelay(v.relay)) return null;
  return { sender: v.sender, relay: v.relay, relayKey: isRelayKey(v.relayKey) ? v.relayKey : '', spare: checkedSpare(v.spare) };
}

function checkedTimes(value: unknown): FieldTimes | null {
  if (!isObject(value)) return null;
  const times: FieldTimes = {};
  for (const field of [...TIMED, 'added'] as const) if (isTime(value[field])) times[field] = value[field];
  return times;
}

/** What every device keeps alike of a contact. */
export function syncedOf(contact: Pick<Contact, 'identity' | 'name' | 'timer' | 'timerAt' | 'request' | 'look' | 'avatar' | 'hide'>): Synced {
  const { identity, name, timer, timerAt, request, look, avatar, hide } = contact;
  return { identity, name, timer, timerAt, request, look, ...(avatar?.kind === 'photo' ? {} : { avatar }), hide };
}

/** A contact as said, checked: null when it is not one. */
export function checkedSynced(value: unknown): Synced | null {
  const v = (value ?? {}) as Partial<Record<keyof Synced, unknown>>;
  if (!isHex(v.identity, 64)) return null;
  const at = checkedTimes(v.at);
  return {
    identity: v.identity,
    name: isText(v.name) ? cleanName(v.name) : '',
    timer: isTimer(v.timer) ? v.timer : 0,
    timerAt: isTime(v.timerAt) ? v.timerAt : 0,
    request: v.request === true,
    look: isObject(v.look) ? checkedLook(v.look) : null,
    ...('avatar' in v ? { avatar: v.avatar === null ? null : checkedAvatar(v.avatar) } : {}),
    hide: v.hide === true,
    ...(at ? { at } : {}),
  };
}

/** The fields of `now` that differ from `before`, a contact as last said. */
export function changedFields(before: Synced, now: Synced): Partial<Omit<Synced, 'identity' | 'at'>> {
  const change: Partial<Omit<Synced, 'identity' | 'at'>> = {};
  for (const field of ['name', 'timer', 'timerAt', 'request', 'look', 'avatar', 'hide'] as const) {
    if (field === 'avatar' && !('avatar' in now)) continue;
    if (JSON.stringify(before[field] ?? null) !== JSON.stringify(now[field] ?? null)) (change as Record<string, unknown>)[field] = now[field] ?? null;
  }
  return change;
}

/**
 * A contact as a linked device keeps it: what the primary says of them, and, to write to them, the
 * primary's queue. It holds no conversation of its own, only an empty one in its place
 * (lib/devices.ts seals for the primary instead), and the account's identity as the one they know
 * it by, so the safety number is the phone's. What the device keeps of its own (what it holds back
 * while appearing offline, a photo picture) stays.
 */
export function mirrorOf(synced: Synced, kept: Contact | undefined, primary: Place, account: string): Contact {
  return {
    ...(kept ?? { heldGot: [], heldRead: [], phone: '', avatar: null, seen: [], packetKey: '', sealTo: '', sealsIn: false }),
    identity: synced.identity,
    sender: primary.sender,
    relay: primary.relay,
    relayKey: primary.relayKey,
    spare: primary.spare,
    conversations: [''],
    first: '',
    name: synced.name,
    timer: synced.timer,
    timerAt: synced.timerAt,
    request: synced.request,
    look: synced.look,
    avatar: 'avatar' in synced ? (synced.avatar ?? null) : (kept?.avatar ?? null),
    ownIdentity: account,
    hide: synced.hide,
  };
}

// A secret as Matrix apps write one: base64, padded or not.
const isMatrixSecret = (v: unknown): v is string => isText(v) && /^[A-Za-z0-9+/_-]{20,128}={0,2}$/.test(v);
const isPrintable = (v: unknown, most: number): v is string => isText(v) && v.length > 0 && v.length <= most && !/[\s\x00-\x1f]/.test(v);

function checkedMatrix(value: unknown, kept: boolean): GivenMatrix | null {
  if (!isObject(value)) return null;
  const v = value;
  if (!isText(v.homeserver) || v.homeserver.length > 512 || !/^https:\/\/[^\s/?#]+(\/[^\s?#]*)?$/i.test(v.homeserver)) return null;
  if (!isText(v.userId) || v.userId.length > 255 || !/^@[^:\s]+:[^\s]+$/.test(v.userId)) return null;
  const k = isObject(v.keys) ? v.keys : null;
  const keys = k && isMatrixSecret(k.master) && isMatrixSecret(k.selfSigning) && isMatrixSecret(k.userSigning) ? { master: k.master, selfSigning: k.selfSigning, userSigning: k.userSigning } : null;
  return {
    homeserver: v.homeserver.replace(/\/+$/, ''),
    userId: v.userId,
    ...(isPrintable(v.token, 1024) ? { token: v.token } : {}),
    ...(keys ? { keys } : {}),
    ...(isMatrixSecret(v.backup) ? { backup: v.backup } : {}),
    ...(kept && v.waited === true ? { waited: true as const } : {}),
  };
}

function checkedXmpp(value: unknown): GivenXmpp | null {
  if (!isObject(value)) return null;
  const v = value;
  if (!isText(v.jid) || v.jid.length > 1024 || !/^[^\s@/]+@[^\s@/]+$/.test(v.jid) || !isText(v.password) || !v.password || v.password.length > 1024) return null;
  const s = isObject(v.server) ? v.server : null;
  const server: GivenXmpp['server'] | null =
    s && isText(s.websocket) && s.websocket.length <= 512 && /^wss:\/\/\S+$/i.test(s.websocket)
      ? { websocket: s.websocket }
      : s && isText(s.host) && s.host.length <= 253 && /^[a-z0-9.-]+$/i.test(s.host) && Number.isInteger(s.port) && (s.port as number) > 0 && (s.port as number) < 65536 && (s.tls === 'direct' || s.tls === 'starttls')
        ? { host: s.host, port: s.port as number, tls: s.tls as 'direct' | 'starttls' }
        : null;
  return { jid: v.jid, password: v.password, ...(server ? { server } : {}) };
}

function checkedNostr(value: unknown): GivenNostr | null {
  if (!isObject(value) || !isHex(value.secret, 64)) return null;
  const v = value;
  const inbox = Array.isArray(v.inbox) ? [...new Set(v.inbox.filter(isNostrRelay))].slice(0, MAX_NOSTR_RELAYS) : [];
  const files = Array.isArray(v.files) ? v.files.filter((f): f is string => isText(f) && f.length <= 256 && /^https:\/\/[^\s/?#]+(\/\S*)?$/i.test(f)).slice(0, 5) : null;
  return { secret: value.secret as string, inbox, ...(isText(v.name) ? { name: v.name.slice(0, 100) } : {}), ...(files && files.length > 0 ? { files } : {}) };
}

/** The accounts given, as said or as a device keeps them (`kept`), checked: what is not one of them is left out. */
export function checkedGiven(value: unknown, kept = false): GivenAccounts {
  const v = isObject(value) ? value : {};
  const matrix = checkedMatrix(v.matrix, kept);
  const xmpp = checkedXmpp(v.xmpp);
  const nostr = checkedNostr(v.nostr);
  return { ...(matrix ? { matrix } : {}), ...(xmpp ? { xmpp } : {}), ...(nostr ? { nostr } : {}) };
}

function checkedEnvelope(v: Json): Envelope | null {
  switch (v.k) {
    case 'hello':
      // `h`: whether the phone links from hidden chats (1) or a space (0); none from before 6.0.0, a space's.
      return isHex(v.secret, 32) && isText(v.name) && isHex(v.account, 64)
        ? { k: 'hello', secret: v.secret, name: v.name, account: v.account, ...(v.h === 1 || v.h === 0 ? { h: v.h } : {}) }
        : null;
    case 'ready':
      return { k: 'ready', name: isText(v.name) ? v.name : '' };
    case 'contacts': {
      const list = Array.isArray(v.list) ? v.list.map(checkedSynced).filter((s): s is Synced => s !== null) : [];
      const gone = Array.isArray(v.gone) ? v.gone.filter((id): id is string => isHex(id, 64)) : [];
      return { k: 'contacts', all: v.all === true, list, gone, ...(isText(v.link) ? { link: v.link } : {}) };
    }
    case 'in':
    case 'send':
      return isHex(v.c, 64) && isObject(v.m) ? { k: v.k, c: v.c, m: v.m } : null;
    case 'out':
      return isHex(v.c, 64) && isObject(v.m) ? { k: 'out', c: v.c, m: v.m, ...(v.mark === 1 || v.mark === 2 ? { mark: v.mark } : {}) } : null;
    case 'add': {
      const code = isObject(v.code) ? checkContact(v.code.senderHex, v.code.relayUrl ?? '', v.code.key ?? '', v.code.relayKey ?? '') : null;
      const spare = code && isObject(v.code) && isObject(v.code.spare) ? checkSpare(v.code.spare.senderHex, v.code.spare.relayUrl, v.code.spare.relayKey ?? '') : null;
      return code?.key ? { k: 'add', code: spare ? { ...code, spare } : code, ...(isTime(v.when) ? { when: v.when } : {}) } : null;
    }
    case 'blocked':
      return Array.isArray(v.list) ? { k: 'blocked', list: v.list.map(checkedBlocked).filter((b): b is Blocked => b !== null).slice(-MAX_BLOCKED) } : null;
    case 'unblock':
      return isHex(v.c, 64) ? { k: 'unblock', c: v.c } : null;
    case 'set': {
      if (!isHex(v.c, 64)) return null;
      const when = isTime(v.when) ? { when: v.when } : {};
      if (v.remove === true) return { k: 'set', c: v.c, change: {}, remove: true, ...when, ...(v.del === 1 || v.del === 2 ? { del: v.del } : {}) };
      const said = isObject(v.change) ? v.change : {};
      const full = checkedSynced({ ...said, identity: v.c });
      if (!full) return null;
      const change: Partial<Omit<Synced, 'identity' | 'at'>> = {};
      for (const field of ['name', 'timer', 'timerAt', 'request', 'look', 'avatar', 'hide'] as const) {
        if (field in said) (change as Record<string, unknown>)[field] = full[field] ?? null;
      }
      return { k: 'set', c: v.c, change, ...when, ...(v.added === true ? { added: true as const } : {}) };
    }
    case 'history': {
      const offer = readOffer(v.offer);
      return offer ? { k: 'history', offer, last: v.last === true } : null;
    }
    case 'took': {
      const ids = Array.isArray(v.ids) ? v.ids.filter((i): i is string => isText(i) && /^(?:[0-9a-f]{48})+$/.test(i)).slice(0, MAX_TOOK) : [];
      return ids.length > 0 ? { k: 'took', ids } : null;
    }
    case 'call':
      return isHex(v.id, 16) && (v.done === 'answered' || v.done === 'declined') ? { k: 'call', id: v.id, done: v.done } : null;
    case 'groups': {
      const list = Array.isArray(v.list) ? v.list.map(checkedMirror).filter((g): g is GroupMirror => g !== null) : [];
      const gone = Array.isArray(v.gone) ? v.gone.filter(isGroupId) : [];
      const entries = Array.isArray(v.entries) ? v.entries.map(checkedGroupEntry).filter((e): e is GroupEntry => e !== null) : [];
      return { k: 'groups', list, gone, entries, ...(v.all === true ? { all: true as const } : {}) };
    }
    case 'group': {
      const ask = checkedAsk(v.ask);
      return isGroupId(v.id) && ask ? { k: 'group', id: v.id, ask } : null;
    }
    case 'changed': {
      const chats = Array.isArray(v.chats) ? v.chats.map(checkedChatChange).filter((c): c is ChatChange => c !== null) : [];
      const groups = Array.isArray(v.groups) ? v.groups.map(checkedGroupChange).filter((c): c is GroupChange => c !== null) : [];
      const whole = Array.isArray(v.whole) ? v.whole.map(checkedWhole).filter((w): w is WholeGroup => w !== null) : [];
      return chats.length + groups.length + whole.length > 0 ? { k: 'changed', chats, groups, whole } : null;
    }
    case 'endpoint':
      return isBundle(v.bundle) ? { k: 'endpoint', bundle: v.bundle, ...(isRelayKey(v.ek) ? { ek: v.ek } : {}) } : null;
    case 'list': {
      const list = checkedList(v.list);
      if (!list || !isBundle(v.ak)) return null;
      const real = Array.isArray(v.real) ? v.real.filter((id): id is string => isHex(id, 64)).slice(0, MAX_LISTED) : null;
      const routes: Record<string, Place> = {};
      if (isObject(v.routes)) {
        for (const [id, place] of Object.entries(v.routes).slice(0, MAX_LISTED)) {
          const checked = isHex(id, 64) ? checkedPlace(place) : null;
          if (checked) routes[id] = checked;
        }
      }
      // And the account's word that `ak`'s signing key is its own, for the device to give a new contact (S5).
      // And the device's pass, which says for a while that it speaks for the account to someone new.
      const ab = typeof v.ab === 'string' && /^[A-Za-z0-9_-]{86}$/.test(v.ab) ? v.ab : undefined;
      const ap = ab ? checkedPass(v.ap) : null;
      return { k: 'list', list, ak: v.ak, ...(real ? { real } : {}), ...(Object.keys(routes).length > 0 ? { routes } : {}), ...(ab ? { ab } : {}), ...(ap ? { ap } : {}) };
    }
    case 'way': {
      if (!isHex(v.c, 64)) return null;
      const list = v.list !== undefined ? checkedList(v.list) : null;
      return { k: 'way', c: v.c, ...(Number.isSafeInteger(v.dv) && (v.dv as number) >= 0 ? { dv: v.dv as number } : {}), ...(list ? { list } : {}) };
    }
    case 'came': {
      const got = Array.isArray(v.got) ? v.got.filter(isTag).slice(0, MAX_CAME) : [];
      return isHex(v.c, 64) && got.length > 0 ? { k: 'came', c: v.c, got } : null;
    }
    case 'accounts':
      return { k: 'accounts', ...checkedGiven(v) };
    case 'notes': {
      const list = Array.isArray(v.list) ? v.list.map(checkedNoteSaid).filter((n): n is NoteSaid => n !== null).slice(0, MAX_NOTES_SAID) : [];
      const gone = Array.isArray(v.gone)
        ? v.gone.filter((g): g is { id: string; v: number } => isObject(g) && isText(g.id) && NOTE_ID.test(g.id) && isTime(g.v)).map((g) => ({ id: g.id, v: g.v })).slice(0, MAX_NOTES_SAID)
        : [];
      return { k: 'notes', list, gone, ...(v.keep === true ? { keep: true as const } : {}) };
    }
    case 'sync':
      // The account's log (lib/sync/wire.ts), checked in full where it is taken.
      return isObject(v.s) ? { k: 'sync', s: v.s } : null;
    case 'chunks': {
      // Where the device gives the chunks of large files on the same Wi-Fi, and the key for this one (lib/sync/lan-chunks.ts).
      const offer = checkedOffer(v);
      return offer ? { k: 'chunks', ...offer } : null;
    }
    case 'cfetch': {
      // Files of the Collection a device asks to be put on the relay for it (lib/collection-links.ts), by their chunks' names.
      const ids = Array.isArray(v.ids) ? v.ids.filter((id): id is string => isHex(id, 32)).slice(0, MAX_COLLECTION_ASKED) : [];
      return ids.length > 0 ? { k: 'cfetch', ids } : null;
    }
    case 'cfile': {
      const list = Array.isArray(v.list)
        ? v.list
            .map((x) => (isObject(x) && isHex(x.id, 32) ? { id: x.id, offer: readOffer(x.offer) } : null))
            .filter((x): x is { id: string; offer: FileOffer } => x !== null && x.offer !== null && onRelayOffer(x.offer))
            .slice(0, MAX_COLLECTION_ASKED)
        : [];
      return list.length > 0 ? { k: 'cfile', list } : null;
    }
    case 'hold': {
      const offer = readOffer(v.offer);
      return offer ? { k: 'hold', offer } : null;
    }
    case 'gpkt':
      // A group message is at most a welcome, sealed: well under what one envelope holds.
      return isText(v.p) && v.p.length > 0 && v.p.length <= MAX_GROUP_PACKET && /^[A-Za-z0-9+/]*={0,2}$/.test(v.p) && (v.h === 1 || v.h === 2) ? { k: 'gpkt', p: v.p, h: v.h } : null;
    case 'gsig': {
      const signal = decodeGroup(v.s);
      return isHex(v.c, 64) && signal ? { k: 'gsig', c: v.c, s: signal, ...(v.r === true ? { r: true as const } : {}) } : null;
    }
    case 'held':
    case 'nohold':
      return isHex(v.f, HELD_MARK) ? { k: v.k, f: v.f } : null;
    case 'can':
      return v.g === 1 ? { k: 'can', g: 1 } : null;
    case 'here':
    case 'move':
    case 'give':
    case 'bye':
      return { k: v.k };
    default:
      return null;
  }
}

/**
 * A contact as a linked device keeps it once the primary said what it knows of the devices of their
 * account (`way`): which of this account's lists they hold, and their account's list as the primary
 * checked it, with where its endpoints read. A later list takes the place of the one kept, the ways
 * to the endpoints it still names staying as they were; the same one says where they read now. Said
 * with no `dv`, they know nothing of devices now: what was kept of theirs goes, with this device's
 * own way to their account.
 */
export function withWay(contact: Contact, said: { dv?: number; list?: DeviceList }): Contact {
  const { dv: _dv, list: _list, endpoints: _endpoints, direct: _direct, ...plain } = contact;
  if (said.dv === undefined) return plain;
  const body = said.list ? bodyOf(said.list) : null;
  if (!said.list || !body || body.a !== contact.identity || body.n < (contact.list?.n ?? 0)) return { ...contact, dv: said.dv };
  if (body.n === contact.list?.n) return { ...contact, dv: said.dv, endpoints: withRoutes(contact.endpoints, said.list.r) };
  return { ...contact, dv: said.dv, list: { b: said.list.b, s: said.list.s, n: body.n }, endpoints: waysFor(contact.endpoints, body.d, said.list.r) };
}

/**
 * What the primary says of the devices of a contact's account (`way`), or null while they know
 * nothing of devices: where an endpoint reads on the primary's own relay, as their messages may say
 * it, said with that relay (`relay`), and the key the primary seals for it with, which seals for it
 * from any of this account's devices.
 */
export function wayOf(contact: Contact, relay: string): { dv: number; list?: DeviceList } | null {
  if (contact.dv === undefined) return null;
  const r = Object.fromEntries(
    (contact.endpoints ?? []).filter((w) => w.sender && (w.relay || relay)).map((w) => [w.id, { s: w.sender, relay: w.relay || relay, rk: w.relayKey, ...(w.sealTo ? { pk: w.sealTo } : {}) }]),
  );
  return { dv: contact.dv, ...(contact.list ? { list: { b: contact.list.b, s: contact.list.s, ...(Object.keys(r).length > 0 ? { r } : {}) } } : {}) };
}

/** A group's member as said, checked: null when it is not one. */
export function checkedSeat(value: unknown): GroupSeat | null {
  if (!isObject(value) || !Number.isInteger(value.leaf) || (value.leaf as number) < 0) return null;
  return { leaf: value.leaf as number, id: isHex(value.id, 64) ? value.id : '', me: value.me === true };
}

function checkedMirror(value: unknown): GroupMirror | null {
  if (!isObject(value) || !isGroupId(value.id)) return null;
  const v = value;
  return {
    id: v.id as string,
    name: (isText(v.name) ? cleanGroupName(v.name) : '') || 'Group',
    admin: v.admin === true,
    status: v.status === 'leaving' || v.status === 'out' ? v.status : 'in',
    asked: Array.isArray(v.asked) ? v.asked.filter((a): a is string => isHex(a, 64)) : [],
    readAt: isTime(v.readAt) ? v.readAt : 0,
    members: Array.isArray(v.members) ? v.members.map(checkedSeat).filter((s): s is GroupSeat => s !== null) : [],
  };
}

/** A group's message as said, checked: null when it is not one. Only a note goes without anything to show. */
export function checkedGroupEntry(value: unknown): GroupEntry | null {
  if (!isObject(value)) return null;
  const v = value;
  if (!isGroupId(v.group) || !isTime(v.at) || !isText(v.text) || (v.from !== '' && !isHex(v.from, 64))) return null;
  const file = v.file !== undefined ? readOffer(v.file) : null;
  if (v.file !== undefined && !file) return null;
  const note = v.note === true;
  if (!note && !v.text && !file) return null;
  const ms = file && isTime(v.ms) && v.ms > 0 ? Math.round(v.ms) : 0;
  const parts = partsOf(v.parts, !file);
  return {
    group: v.group,
    at: v.at,
    from: v.from as string,
    text: v.text,
    tag: isText(v.tag) && v.tag.length <= 64 ? v.tag : '',
    ...(note ? { note: true } : {}),
    ...(ms ? { ms } : {}),
    ...(file ? { file } : {}),
    ...(parts ? { parts } : {}),
    ...(isObject(v.marks) ? { marks: checkedMarks(v.marks) } : {}),
  };
}

// What each member did, by identity ('' for the account), of what passes `check`; none when empty.
function byMember<T>(value: unknown, check: (v: unknown) => T | null): Record<string, T> | undefined {
  if (!isObject(value)) return undefined;
  const kept: Record<string, T> = {};
  for (const [who, v] of Object.entries(value).slice(0, MAX_MARKS)) {
    const checked = who === '' || isHex(who, 64) ? check(v) : null;
    if (checked !== null) kept[who] = checked;
  }
  return Object.keys(kept).length > 0 ? kept : undefined;
}

const reactionOf = (v: unknown) => (isReactionEmoji(v) ? v : null);
const whenOf = (v: unknown) => (isTime(v) ? v : null);
// When each member said one of the account's own came, or was read: by member, the account not among them.
const seenOf = (v: unknown) => {
  const by = byMember(v, whenOf);
  if (by) delete by[''];
  return by && Object.keys(by).length > 0 ? by : undefined;
};
const voteOf = (v: unknown) => {
  const chose = checkedChoices(v);
  return chose && chose.length > 0 ? chose : null;
};

// Words as edited, with when, as they come: both or neither.
function editedOf(v: Json): { text: string; edited: number } | null {
  if (!isTime(v.edited) || v.edited <= 0 || !isText(v.text) || !v.text.trim()) return null;
  return { text: [...v.text].slice(0, MAX_EDIT).join(''), edited: v.edited };
}

function checkedMarks(v: Json): GroupMarked {
  const reactions = byMember(v.reactions, reactionOf);
  const votes = byMember(v.votes, voteOf);
  const edited = editedOf(v);
  const got = seenOf(v.got);
  const read = seenOf(v.read);
  return {
    ...(reactions ? { reactions } : {}),
    ...(votes ? { votes } : {}),
    ...(isTime(v.pinned) && v.pinned > 0 ? { pinned: v.pinned } : {}),
    ...(v.starred === true ? { starred: true as const } : {}),
    ...(edited ?? {}),
    ...(got ? { got } : {}),
    ...(read ? { read } : {}),
  };
}

function checkedGroupChange(value: unknown): GroupChange | null {
  if (!isObject(value) || !isGroupId(value.group) || !isGroupTag(value.tag)) return null;
  const v = value;
  const change: GroupChange = { group: v.group as string, tag: v.tag as string };
  if (v.gone === true) return { ...change, gone: true };
  if (v.unsent === true) return { ...change, unsent: true };
  if (v.reactions === null || isObject(v.reactions)) change.reactions = byMember(v.reactions, reactionOf) ?? null;
  if (v.votes === null || isObject(v.votes)) change.votes = byMember(v.votes, voteOf) ?? null;
  if (v.pinned === null || (isTime(v.pinned) && v.pinned > 0)) change.pinned = v.pinned as number | null;
  if (typeof v.starred === 'boolean') change.starred = v.starred;
  const edited = editedOf(v);
  if (edited) Object.assign(change, edited);
  if (v.got === null || isObject(v.got)) change.got = seenOf(v.got) ?? null;
  if (v.read === null || isObject(v.read)) change.read = seenOf(v.read) ?? null;
  return Object.keys(change).length > 2 ? change : null;
}

function checkedWhole(value: unknown): WholeGroup | null {
  if (!isObject(value) || !isGroupId(value.group) || !Array.isArray(value.tags)) return null;
  return { group: value.group as string, tags: value.tags.filter(isGroupTag).slice(-MAX_GROUP_MESSAGES) };
}

function checkedChatChange(value: unknown): ChatChange | null {
  if (!isObject(value) || !isHex(value.c, 64)) return null;
  const c = value.c;
  if (value.tag === undefined) return value.gone === true ? { c, gone: true } : null;
  if (!isTag(value.tag)) return null;
  if (value.gone === true) return { c, tag: value.tag, gone: true };
  return typeof value.starred === 'boolean' ? { c, tag: value.tag, starred: value.starred } : null;
}

// What a group's message is or carries beyond itself, checked (lib/group-parts.ts): none when it is nothing.
function partsOf(value: unknown, words: boolean): GroupParts | null {
  const parts = isObject(value) ? groupPartsOf(value, words) : {};
  return Object.keys(parts).length > 0 ? parts : null;
}

function checkedAsk(value: unknown): GroupAsk | null {
  if (!isObject(value)) return null;
  const v = value;
  switch (v.t) {
    case 'text': {
      if (!isText(v.text) || v.text.trim() === '' || !isTag(v.tag)) return null;
      const parts = partsOf(v.parts, true);
      return { t: 'text', text: v.text, tag: v.tag, ...(parts ? { parts } : {}) };
    }
    case 'file': {
      const file = readOffer(v.file);
      if (!file || !isTag(v.tag)) return null;
      const parts = partsOf(v.parts, false);
      return { t: 'file', file, tag: v.tag, ...(isTime(v.ms) && v.ms > 0 ? { ms: v.ms } : {}), ...(parts ? { parts } : {}) };
    }
    case 'mark': {
      const marked = isObject(v.marked) ? markedOf(v.marked) : null;
      return marked ? { t: 'mark', marked } : null;
    }
    case 'add': {
      const identities = Array.isArray(v.identities) ? v.identities.filter((i): i is string => isHex(i, 64)) : [];
      return identities.length > 0 ? { t: 'add', identities } : null;
    }
    case 'name':
      return isText(v.name) && cleanGroupName(v.name) ? { t: 'name', name: v.name } : null;
    case 'remove':
      return Number.isInteger(v.leaf) && (v.leaf as number) > 0 ? { t: 'remove', leaf: v.leaf as number } : null;
    case 'leave':
    case 'forget':
    case 'read':
      return { t: v.t };
    default:
      return null;
  }
}

/**
 * One envelope, with where its sender reads and the key it gives the other for the packets it sends
 * back (`pk`, lib/sealed-packet.ts), as it goes in a packet or in parts.
 */
export function encodeEnvelope(envelope: Envelope, at: Place | null, pk = ''): Uint8Array[] {
  const said = envelope.k === 'gsig' ? { ...envelope, s: encodeGroup(envelope.s) } : envelope;
  const bytes = utf8Encode(JSON.stringify({ v: 1, ...said, ...(at ? { at } : {}), ...(pk ? { pk } : {}) }));
  if (bytes.length <= SPLIT_OVER) return [bytes];
  const id = toHex(randomBytes(8));
  const of = Math.ceil(bytes.length / PART_BYTES);
  if (of > MAX_PARTS) throw new Error('too large to go between devices');
  return Array.from({ length: of }, (_, n) => {
    const part: Part = { k: 'part', id, n, of, d: toBase64(bytes.subarray(n * PART_BYTES, (n + 1) * PART_BYTES)) };
    return utf8Encode(JSON.stringify({ v: 1, ...part }));
  });
}

/**
 * One envelope in one packet, for a message a linked device writes to a contact: with where its
 * sender reads when that still fits, else without. Null when it does not fit at all.
 */
export function encodeOne(envelope: Envelope, at: Place | null, pk = ''): Uint8Array | null {
  for (const where of at ? [at, null] : [null]) {
    const said = envelope.k === 'gsig' ? { ...envelope, s: encodeGroup(envelope.s) } : envelope;
    const bytes = utf8Encode(JSON.stringify({ v: 1, ...said, ...(where ? { at: where } : {}), ...(pk ? { pk } : {}) }));
    if (bytes.length <= MAX_ENVELOPE) return bytes;
  }
  return null;
}

/** Puts envelopes that came in parts together again, each sender's apart. */
export class Parts {
  private gathering = new Map<string, { parts: (Uint8Array | null)[]; at: number }>();

  /**
   * Takes what a packet carried: the envelope it holds, or, from a part, the whole envelope once
   * its last part came, else null. Null too for what is not an envelope.
   */
  take(from: string, bytes: Uint8Array, now = Date.now()): Said | null {
    let value: Json;
    try {
      const parsed: unknown = JSON.parse(utf8Decode(bytes));
      if (!isObject(parsed)) return null;
      value = parsed;
    } catch {
      return null;
    }
    if (value.k !== 'part') return readSaid(value);
    for (const [key, g] of this.gathering) if (now - g.at > PARTS_STALE) this.gathering.delete(key);
    const { id, n, of, d } = value;
    if (!isHex(id, 16) || !Number.isInteger(n) || !Number.isInteger(of) || !isText(d)) return null;
    const count = of as number;
    const index = n as number;
    if (count < 2 || count > MAX_PARTS || index < 0 || index >= count) return null;
    const key = `${from} ${id}`;
    const g = this.gathering.get(key) ?? { parts: new Array<Uint8Array | null>(count).fill(null), at: now };
    if (g.parts.length !== count) return null;
    try {
      g.parts[index] = fromBase64(d);
    } catch {
      return null;
    }
    g.at = now;
    this.gathering.set(key, g);
    if (g.parts.some((p) => p === null)) return null;
    this.gathering.delete(key);
    const whole = new Uint8Array(g.parts.reduce((sum, p) => sum + p!.length, 0));
    let at = 0;
    for (const p of g.parts) {
      whole.set(p!, at);
      at += p!.length;
    }
    try {
      const parsed: unknown = JSON.parse(utf8Decode(whole));
      return isObject(parsed) && parsed.k !== 'part' ? readSaid(parsed) : null;
    } catch {
      return null;
    }
  }
}

function readSaid(value: Json): Said | null {
  if (value.v !== 1) return null;
  const envelope = checkedEnvelope(value);
  if (!envelope) return null;
  const at = checkedPlace(value.at);
  return { ...envelope, ...(at ? { at } : {}), ...(isRelayKey(value.pk) ? { pk: value.pk } : {}) };
}

// What says where a contact's queue is, in a message: only the primary keeps it. And what says what
// each side of a conversation knows of the other's keys and devices (lib/e2e.ts), which each
// endpoint says for itself.
const PLACE_KEYS = ['from', 'relay', 'relayKey', 'spare'];
const OWN_KEYS = ['pk', 'ak', 'dv', 'dl', 'acct', 'to'];
// What a message carries that is not worth telling the account's other devices on its own: it says
// that messages came, that a phone is open or someone types, or asks, with the chat's timer, which
// the contacts carry.
const QUIET_KEYS = new Set([...PLACE_KEYS, ...OWN_KEYS, 'text', 'tag', 'timer', 'timerAt', 'lasts', 'got', 'on', 'onAt', 'ask', 'ls', 'quiet', 'due', 'typing']);

/** Whether a message is a call's or a group's signal: not kept in the history, and not told of as other messages are. */
export function isSignal(m: Json): boolean {
  return m.call !== undefined || m.group !== undefined;
}

/** Whether a message is a call's signal: those go as lib/linked-calls.ts says. */
export function isCall(m: Json): boolean {
  return m.call !== undefined && m.group === undefined;
}

/** A contact's message without where their queue is, nor what it says of keys and devices. */
export function withoutPlace(m: Json): Json {
  const out: Json = {};
  for (const [key, value] of Object.entries(m)) if (!PLACE_KEYS.includes(key) && !OWN_KEYS.includes(key)) out[key] = value;
  return out;
}

/** Whether a message is one the chat keeps: a text, a part of a voice message, or a photo or file, with its tag. */
export function isKept(m: Json): boolean {
  return isTag(m.tag) && ((isText(m.text) && m.text !== '') || isObject(m.voice) || isObject(m.file));
}

/**
 * Whether a message a linked device wrote says nothing but that messages came (which the primary
 * told the contact itself), given the chat's timer as the primary has it: one that sets it later
 * says more.
 */
export function onlyCame(m: Json, timerAt: number): boolean {
  if (typeof m.timerAt === 'number' && m.timerAt > timerAt) return false;
  return Object.keys(m).every((key) => PLACE_KEYS.includes(key) || ['text', 'timer', 'timerAt', 'got', 'quiet', 'due'].includes(key)) && !m.text;
}

/** Whether the account's other devices are told of a message the primary sealed: one the chat keeps, or that says messages were read or deletes them, or says what this version does not know. */
export function isWorthTelling(m: Json): boolean {
  if (isSignal(m)) return false;
  if (isKept(m)) return true;
  return Object.keys(m).some((key) => !QUIET_KEYS.has(key));
}

/**
 * One message of the history as it goes in a pack: its sound with it, a photo or file as a copy on
 * the relay, and what it is or carries beyond its words, with what was done to it (lock/history.ts).
 */
export type PackEntry = {
  peer: string;
  text: string;
  mine: boolean;
  at: number;
  tag: string;
  until?: number;
  lasts?: number;
  mark?: Mark;
  voice?: { ms: number; data: string };
  file?: FileOffer;
  parts?: ChatParts;
};

const PEER = /^contact:[0-9a-f]{64}$/;

/** The messages of a pack, each checked; those of the wrong shape are left out. */
export function readPack(bytes: Uint8Array): PackEntry[] {
  let value: unknown;
  try {
    value = JSON.parse(utf8Decode(bytes));
  } catch {
    return [];
  }
  const list = isObject(value) && value.v === 1 && Array.isArray(value.m) ? value.m : [];
  return list.flatMap((e: unknown): PackEntry[] => {
    if (!isObject(e) || !isText(e.peer) || !PEER.test(e.peer) || !isText(e.text) || !isTime(e.at) || !isTag(e.tag)) return [];
    const voice = isObject(e.voice) && isTime(e.voice.ms) && isText(e.voice.data) ? { ms: e.voice.ms, data: e.voice.data } : undefined;
    const file = e.file !== undefined ? readOffer(e.file) : null;
    if (e.file !== undefined && !file) return [];
    const mark = e.mark === 1 || e.mark === 2 ? e.mark : 0;
    const parts = isObject(e.parts) ? chatPartsOf(e.parts) : {};
    return [
      {
        peer: e.peer,
        text: e.text,
        mine: e.mine === true,
        at: e.at,
        tag: e.tag,
        ...(isTime(e.until) && e.until > 0 ? { until: e.until } : {}),
        ...(isTimer(e.lasts) && e.lasts > 0 ? { lasts: e.lasts } : {}),
        mark,
        ...(voice ? { voice } : {}),
        ...(file ? { file } : {}),
        ...(Object.keys(parts).length > 0 ? { parts } : {}),
      },
    ];
  });
}

/** What a chat's message is or carries beyond its words, and what was done to it, as kept (lock/history.ts), each checked or left out. */
export function chatPartsOf(v: Json): ChatParts {
  const { sticker, place, poll, preview, forwarded, pay } = carriedOf(v);
  const vote = (chose: unknown) => {
    const checked = poll ? checkedChoices(chose, poll.o.length, !!poll.m) : null;
    return checked && checked.length > 0 ? checked : null;
  };
  const [myVote, theirVote] = [vote(v.myVote), vote(v.theirVote)];
  return {
    ...(isTag(v.re) ? { re: v.re } : {}),
    ...(isReactionEmoji(v.myReaction) ? { myReaction: v.myReaction } : {}),
    ...(isReactionEmoji(v.theirReaction) ? { theirReaction: v.theirReaction } : {}),
    ...(isTime(v.pinned) && v.pinned > 0 ? { pinned: v.pinned } : {}),
    ...(v.starred === true ? { starred: true } : {}),
    ...(sticker ? { sticker } : {}),
    ...(place ? { place } : {}),
    ...(poll ? { poll } : {}),
    ...(myVote ? { myVote } : {}),
    ...(theirVote ? { theirVote } : {}),
    ...(preview ? { preview } : {}),
    ...(forwarded ? { forwarded: true } : {}),
    ...(isTime(v.edited) && v.edited > 0 ? { edited: v.edited } : {}),
    ...(pay ? { pay } : {}),
    ...(pay && isTime(v.paid) && v.paid > 0 ? { paid: v.paid } : {}),
  };
}

/** A pack of messages, with those of groups, as it goes to the relay's file store. */
export function writePack(entries: PackEntry[], groups: GroupEntry[] = []): Uint8Array {
  return utf8Encode(JSON.stringify({ v: 1, m: entries, ...(groups.length > 0 ? { g: groups } : {}) }));
}

/** The groups' messages of a pack, each checked. */
export function readGroupEntries(bytes: Uint8Array): GroupEntry[] {
  try {
    const value: unknown = JSON.parse(utf8Decode(bytes));
    const list = isObject(value) && value.v === 1 && Array.isArray(value.g) ? value.g : [];
    return list.map(checkedGroupEntry).filter((e): e is GroupEntry => e !== null);
  } catch {
    return [];
  }
}

/** What tells one group message from another: its sender and tag, or, with no tag, when it came and what it says. */
export function groupMessageKey(m: Pick<GroupMessage, 'at' | 'from' | 'text' | 'tag'>): string {
  return m.tag ? `${m.from}|${m.tag}` : `${m.at}|${m.from}|${m.text}`;
}

/** The key of a group's last message, empty when it has none. */
export function lastKey(group: Pick<Group, 'messages'>): string {
  const last = group.messages[group.messages.length - 1];
  return last ? groupMessageKey(last) : '';
}

/**
 * A group's messages after the one `last` names (groupMessageKey). Once that one is gone, those from
 * when it came (`at`) on, or, not knowing when, all of them.
 */
export function messagesAfter(messages: GroupMessage[], last: string, at = 0): GroupMessage[] {
  if (!last) return messages;
  for (let i = messages.length - 1; i >= 0; i--) if (groupMessageKey(messages[i]) === last) return messages.slice(i + 1);
  return at > 0 ? messages.filter((m) => m.at >= at) : messages;
}

/** A group as the primary tells its devices of it, with its members as its MLS state has them. */
export function groupMirror(group: Group, members: { leaf: number; about: { id: string } | null; me: boolean }[]): GroupMirror {
  const { id, name, admin, status, asked, readAt } = group;
  return { id, name, admin, status, asked, readAt, members: members.map((m) => ({ leaf: m.leaf, id: m.about?.id ?? '', me: m.me })) };
}

/** A short mark of what a group's mirror says, so it is told again only once that changed. */
export function mirrorMark(mirror: GroupMirror): string {
  return digest(JSON.stringify(mirror));
}

// Two 32-bit hashes of a text, as 16 hex digits: the same text, the same mark.
function digest(text: string): string {
  let a = 0x811c9dc5;
  let b = 0x9747b28c ^ text.length;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    a = Math.imul(a ^ c, 0x01000193) >>> 0;
    b = Math.imul(b ^ c, 0x5bd1e995) >>> 0;
  }
  return a.toString(16).padStart(8, '0') + b.toString(16).padStart(8, '0');
}

// Items in batches of about GROUP_BYTES each, at least one batch; no two that `apart` picks in one.
function batched<T>(items: T[], apart: (item: T) => boolean = () => false): T[][] {
  const out: T[][] = [];
  let batch: T[] = [];
  let size = 0;
  let picked = false;
  for (const item of items) {
    const bytes = JSON.stringify(item).length;
    const pick = apart(item);
    if (batch.length > 0 && (size + bytes > GROUP_BYTES || (pick && picked))) {
      out.push(batch);
      batch = [];
      size = 0;
      picked = false;
    }
    batch.push(item);
    size += bytes;
    picked ||= pick;
  }
  if (batch.length > 0 || out.length === 0) out.push(batch);
  return out;
}

// A member's message, as a device's notice counts it: not a note, nor the phone's own.
const isTheirs = (e: GroupEntry) => !e.note && e.from !== '';

/**
 * What changed in the groups, as envelopes: the groups as they are now and those gone with the
 * first, the messages after, a few at a time. Each member's message goes in an envelope of its own,
 * with the notes and the phone's own messages next to it, so the relay counts each for a device's
 * notice (tellsTheirs). With `all`, the groups said are all there are.
 */
export function groupEnvelopes(list: GroupMirror[], gone: string[], entries: GroupEntry[], all = false): Envelope[] {
  return batched(entries, isTheirs).map((batch, i) => (i === 0 ? { k: 'groups', list, gone, entries: batch, ...(all ? { all: true as const } : {}) } : { k: 'groups', list: [], gone: [], entries: batch }));
}

/** Whether an envelope tells of a member's message (groupEnvelopes puts one in each at most): one a device's notice counts. */
export function tellsTheirs(envelope: Envelope): boolean {
  return envelope.k === 'groups' && envelope.entries.some(isTheirs);
}

/** What was done to a group's message since it went, as its devices are told of it: its words with them once edited. */
export function marksOf({ reactions, votes, pinned, starred, edited, text, got, read }: GroupMarked): GroupMarked {
  return {
    ...(reactions ? { reactions } : {}),
    ...(votes ? { votes } : {}),
    ...(pinned ? { pinned } : {}),
    ...(starred ? { starred: true as const } : {}),
    ...(edited && text ? { edited, text } : {}),
    ...(got ? { got } : {}),
    ...(read ? { read } : {}),
  };
}

// A message's marks as text, the same for the same marks: each member's in the order of their
// identities; its words only once edited, and who it came to and who read it only once any did, so
// the marks of the others read as before them.
function marksText({ reactions, votes, pinned, starred, edited, text, got, read }: GroupMarked): string {
  const sorted = (by: Record<string, unknown> | undefined) => (by ? Object.entries(by).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)) : null);
  const seen = got || read ? [sorted(got), sorted(read)] : [];
  return JSON.stringify([sorted(reactions), sorted(votes), pinned ?? 0, starred === true, ...(edited ? [edited, text ?? ''] : []), ...seen]);
}

/** What was done to each of a group's messages, by tag, but its notes and those with no tag. */
export function groupMarks(messages: GroupMessage[]): Map<string, GroupMarked> {
  const marks = new Map<string, GroupMarked>();
  for (const m of messages) if (!m.note && isGroupTag(m.tag)) marks.set(m.tag, marksOf(m));
  return marks;
}

/** A short mark of what was done to a group's messages (groupMarks), so a device is told only what changed since. */
export function marksDigest(marks: Map<string, GroupMarked>): string {
  return digest([...marks].map(([tag, m]) => `${tag}=${marksText(m)}`).join(';'));
}

/**
 * What changed in a group's messages from `before` to `now` (groupMarks), for a device told them as
 * they were: for each, what changed of it, or that it is gone. A message that came since goes with
 * what was done to it (GroupEntry), not here.
 */
export function marksChanged(group: string, before: Map<string, GroupMarked>, now: Map<string, GroupMarked>): GroupChange[] {
  const out: GroupChange[] = [];
  for (const [tag, was] of before) {
    const is = now.get(tag);
    if (!is) {
      out.push({ group, tag, gone: true });
      continue;
    }
    const change: GroupChange = { group, tag };
    if (marksText({ reactions: was.reactions }) !== marksText({ reactions: is.reactions })) change.reactions = is.reactions ?? null;
    if (marksText({ votes: was.votes }) !== marksText({ votes: is.votes })) change.votes = is.votes ?? null;
    if ((was.pinned ?? 0) !== (is.pinned ?? 0)) change.pinned = is.pinned ?? null;
    if (!!was.starred !== !!is.starred) change.starred = !!is.starred;
    if (is.edited && is.text && (is.edited !== was.edited || is.text !== was.text)) Object.assign(change, { text: is.text, edited: is.edited });
    if (marksText({ got: was.got }) !== marksText({ got: is.got })) change.got = is.got ?? null;
    if (marksText({ read: was.read }) !== marksText({ read: is.read })) change.read = is.read ?? null;
    if (Object.keys(change).length > 2) out.push(change);
  }
  return out;
}

/**
 * A group's marks said whole, for a device not known to have them as they were: what was done to
 * each message that has any, the primary's star only when on, and the tags of all its messages.
 */
export function wholeMarks(group: string, now: Map<string, GroupMarked>): { changes: GroupChange[]; whole: WholeGroup } {
  const changes: GroupChange[] = [];
  for (const [tag, m] of now) {
    if (Object.keys(m).length === 0) continue;
    changes.push({
      group,
      tag,
      reactions: m.reactions ?? null,
      votes: m.votes ?? null,
      pinned: m.pinned ?? null,
      ...(m.starred ? { starred: true } : {}),
      ...(m.edited && m.text ? { text: m.text, edited: m.edited } : {}),
      ...(m.got ? { got: m.got } : {}),
      ...(m.read ? { read: m.read } : {}),
    });
  }
  return { changes, whole: { group, tags: [...now.keys()] } };
}

/** What changed in messages told already, as envelopes, a few changes at a time: the chats' and the groups said whole with the first. */
export function changeEnvelopes(chats: ChatChange[], groups: GroupChange[], whole: WholeGroup[]): Envelope[] {
  return batched(groups).map((batch, i) => ({ k: 'changed', chats: i === 0 ? chats : [], groups: batch, whole: i === 0 ? whole : [] }));
}

// A message without what members did to it for everyone (reactions, votes, its pin, who it came to and who read it): this device's own star stays.
function withoutMarks(m: GroupMessage): GroupMessage {
  const { reactions: _r, votes: _v, pinned: _p, got: _g, read: _s, ...rest } = m;
  return rest;
}

// A message once `change` is made to it: a vote counts only on a poll, and only as the poll allows;
// only one of this device's own is not sent.
function withChange(m: GroupMessage, change: GroupChange): GroupMessage {
  const next: GroupMessage = { ...m };
  if (change.unsent) {
    if (!m.from) next.unsent = true;
    return next;
  }
  if (change.reactions !== undefined) {
    if (change.reactions) next.reactions = change.reactions;
    else delete next.reactions;
  }
  if (change.votes !== undefined) {
    const poll = m.poll;
    const votes = poll && change.votes ? byMember(change.votes, (chose) => checkedChoices(chose, poll.o.length, !!poll.m)) : undefined;
    if (votes) next.votes = votes;
    else delete next.votes;
  }
  if (change.pinned !== undefined) {
    if (change.pinned) next.pinned = change.pinned;
    else delete next.pinned;
  }
  if (change.starred !== undefined) {
    if (change.starred) next.starred = true;
    else delete next.starred;
  }
  // Who it came to and who read it, of the account's own only.
  for (const key of ['got', 'read'] as const) {
    if (change[key] === undefined) continue;
    const by = change[key];
    if (by && !m.from) next[key] = by;
    else delete next[key];
  }
  // Words as its sender edited them, the primary said: words, not a sticker's, a place's or a poll's.
  if (change.edited && change.text && editableWords(m)) {
    next.edited = change.edited;
    if (change.text !== m.text) {
      next.text = change.text;
      const preview = previewAfterEdit(m.preview, change.text);
      if (preview) next.preview = preview;
      else delete next.preview;
    }
  }
  return next;
}

// A message with what was done to it as a GroupEntry says: what members did, as said; the star, if on; its words, if edited.
function withEntryMarks(m: GroupMessage, marks: GroupMarked): GroupMessage {
  return withChange(withoutMarks(m), {
    group: '',
    tag: m.tag,
    reactions: marks.reactions ?? null,
    votes: marks.votes ?? null,
    pinned: marks.pinned ?? null,
    ...(marks.starred ? { starred: true } : {}),
    ...(marks.edited && marks.text ? { text: marks.text, edited: marks.edited } : {}),
    ...(marks.got ? { got: marks.got } : {}),
    ...(marks.read ? { read: marks.read } : {}),
  });
}

/**
 * A linked device's groups once the primary said what changed in messages told already (`now`, this
 * device's clock): each change made to its message, by tag. A group said whole first lets go of what
 * was done to the messages not said, and of the messages the primary no longer has, but this
 * device's own it could not send, or wrote in the last minutes, which may not have reached it yet.
 */
export function changedGroups(kept: Group[], said: { groups: GroupChange[]; whole: WholeGroup[] }, now: number): Group[] {
  const changes = new Map<string, GroupChange[]>();
  for (const c of said.groups) changes.set(c.group, [...(changes.get(c.group) ?? []), c]);
  const whole = new Map(said.whole.map((w) => [w.group, new Set(w.tags)]));
  return kept.map((group) => {
    const told = changes.get(group.id) ?? [];
    const tags = whole.get(group.id);
    if (told.length === 0 && !tags) return group;
    let messages = group.messages;
    if (tags) {
      const marked = new Set(told.map((c) => c.tag));
      messages = messages
        .filter((m) => m.note || !m.tag || tags.has(m.tag) || (!m.from && (m.unsent || m.at > now - OWN_KEPT)))
        .map((m) => (m.note || marked.has(m.tag) ? m : withoutMarks(m)));
    }
    for (const c of told) {
      const at = messages.findIndex((m) => !m.note && m.tag === c.tag);
      if (at < 0) continue;
      messages = c.gone ? messages.filter((_, i) => i !== at) : messages.map((m, i) => (i === at ? withChange(m, c) : m));
    }
    return { ...group, messages };
  });
}

/**
 * A linked device's groups once the primary said what changed: each group said as it is now, but
 * read as late as either read it; the groups gone left out, and with `all`, those not said; and the
 * messages that came put in by time, each once, with what was done to them. One kept here already
 * takes what was done to it as said again. Returns them, the groups where a member's message came
 * that was not read yet, and the photos and files said again for a message kept here already, which
 * this device takes no more.
 */
export function mirrorGroups(kept: Group[], said: { list: GroupMirror[]; gone: string[]; entries: GroupEntry[]; all?: boolean }): { groups: Group[]; came: string[]; again: FileFrom[] } {
  const gone = new Set(said.gone);
  const listed = new Set(said.list.map((m) => m.id));
  const groups = new Map<string, Group>();
  for (const g of kept) if (!gone.has(g.id) && (!said.all || listed.has(g.id))) groups.set(g.id, g);
  for (const m of said.list) {
    if (gone.has(m.id)) continue;
    const before = groups.get(m.id);
    const { id, name, admin, status, asked, readAt } = m;
    // A PIN, or notifications, given the group on this device stay: the phone knows nothing of them.
    groups.set(id, {
      id,
      name,
      admin,
      status,
      asked,
      later: [],
      outbox: [],
      messages: before?.messages ?? [],
      readAt: Math.max(before?.readAt ?? 0, readAt),
      ...(before?.pin ? { pin: before.pin } : {}),
      ...(before?.notify ? { notify: before.notify } : {}),
    });
  }
  const came = new Set<string>();
  const again: FileFrom[] = [];
  const added = new Map<string, GroupMessage[]>();
  const keys = new Map<string, Set<string>>();
  // What was done to messages kept already, as said again, by group and key.
  const marked = new Map<string, Map<string, GroupMarked>>();
  for (const e of said.entries) {
    const group = groups.get(e.group);
    if (!group) continue;
    const have = keys.get(e.group) ?? new Set(group.messages.map(groupMessageKey));
    keys.set(e.group, have);
    const key = groupMessageKey(e);
    if (have.has(key)) {
      if (e.file) again.push({ relay: e.file.relay, ids: e.file.ids });
      if (e.marks && !e.note) marked.set(e.group, (marked.get(e.group) ?? new Map<string, GroupMarked>()).set(key, e.marks));
      continue;
    }
    have.add(key);
    const message: GroupMessage = {
      at: e.at,
      from: e.from,
      text: e.text,
      tag: e.tag,
      ...(e.note ? { note: true } : {}),
      ...(e.file ? { file: offerRef(e.file) } : {}),
      ...(e.ms ? { ms: e.ms } : {}),
      ...e.parts,
    };
    added.set(e.group, [...(added.get(e.group) ?? []), e.marks && !e.note ? withEntryMarks(message, e.marks) : message]);
    if (e.from && !e.note && e.at > group.readAt) came.add(e.group);
  }
  for (const id of new Set([...added.keys(), ...marked.keys()])) {
    const group = groups.get(id)!;
    const remarked = marked.get(id);
    const before = remarked
      ? group.messages.map((m) => {
          const marks = m.note ? undefined : remarked.get(groupMessageKey(m));
          return marks ? withEntryMarks(m, marks) : m;
        })
      : group.messages;
    const all = [...before, ...(added.get(id) ?? [])].sort((x, y) => x.at - y.at);
    groups.set(id, { ...group, messages: all.slice(-MAX_GROUP_MESSAGES) });
  }
  return { groups: [...groups.values()], came: [...came], again };
}
