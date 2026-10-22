import { deleteChunks, type FileRef } from '../lock/attachment-files';
import { loadDevicesData, MAX_LEFT, MAX_OUTBOX, saveDevicesData, type DevicesData, type Left, type OutMark, type Peer } from '../lock/devices-data';
import { againAfter, type Contact, type OldFiller, type OwnList, type Route } from '../lock/e2e-data';
import type { Group, GroupMessage } from '../lock/group-data';
import { isReactionEmoji, isTag, WAITING, type Mark, type Message } from '../lock/history';
import { currentSpace } from '../lock/keys';
import { spaceQueues } from '../lock/queues-data';
import { loadSpaceData } from '../lock/space-data';
import { loadClip, saveClip, type VoiceRef } from '../lock/voice-clips';
import {
  bytesSource,
  dropFile,
  FileGoneError,
  offerRef,
  readFile,
  readOffer,
  sendFile,
  takeFile,
  uploadFile,
  watchTakenFiles,
  type FileFrom,
  type FileOffer,
  type TakenFiles,
} from './attachments';
import { currentCall } from './call';
import { decodeCall } from './call-signal';
import { callsElsewhere, onCallChange } from './calls';
import { carriedOf } from './chat-parts';
import { contactLink, type ContactCode } from './contact-code';
import * as core from './core';
import { fromBase64, randomBytes, sha256Bytes, toBase64, toHex, utf8Decode, utf8Encode } from './crypto';
import { bodyOf, flagsHold, MAX_LISTED, nextList, signList, verifyList, type DeviceList } from './device-list';
import { fromBase64Url, OwnCodeError, toBase64Url, type Link, type Where } from './e2e';
import { isCopied, waysFor } from './endpoints';
import { currentGroupCall } from './group-call';
import { groupPartsOf } from './group-parts';
import type { GroupMember, Groups, GroupTransport } from './groups';
import { t } from './i18n';
import { cleanDeviceName, linkCodeLink, linkSafetyCode, parseLinkCode, type LinkCode } from './link-code';
import {
  changedFields,
  changedGroups,
  changeEnvelopes,
  chatPartsOf,
  encodeEnvelope,
  encodeOne,
  groupEnvelopes,
  groupMarks,
  groupMessageKey,
  groupMirror,
  isCall,
  isKept,
  isSignal,
  isWorthTelling,
  lastKey,
  marksChanged,
  marksDigest,
  marksOf,
  MAX_TOOK,
  messagesAfter,
  mirrorGroups,
  mirrorMark,
  mirrorOf,
  onlyCame,
  Parts,
  readGroupEntries,
  readPack,
  syncedOf,
  tellsTheirs,
  TIMED,
  withoutPlace,
  wholeMarks,
  writePack,
  type ChatChange,
  type Deleted,
  type Envelope,
  type GroupAsk,
  type GroupChange,
  type GroupEntry,
  type GroupMarked,
  type GroupMirror,
  type Json,
  type PackEntry,
  type Place,
  type Synced,
  type WholeGroup,
  wayOf,
  withWay,
} from './link-wire';
import { LinkedCalls, type CallStep } from './linked-calls';
import { nearby } from './nearby';
import { announceReceived } from './receiver';
import { GRACE } from './moves';
import { onSpaceMoved, type MoveWhy } from './queue-move';
import { createQueue, deleteQueue, fromHex, isQueueNotFound, receiveMessage, relayKey, sameRelay, sendMessage, type Mark as RelayMark, type Relay } from './relay';
import { isSealedPacket, openPacket, packetKeys, sealedWith, sealPacket, type PacketKeys } from './sealed-packet';
import {
  blankSynced,
  buried,
  changedBy,
  EARLY_LASTS,
  goesFor,
  MAX_BEFORE,
  MAX_HELD,
  MAX_SEEN,
  removedAtOf,
  settled,
  siblingsFrom,
  stamped,
  stampOf,
  starts,
  withEarly,
  withErased,
  withRemoved,
  withRoutes,
  type Change,
  type Sibling,
  type Siblings,
} from './siblings';
import { contactTarget, joinSpaceChats, markOf, relayFor, sendSealed, spaceChats, type SpaceChats } from './space-chats';
import { spaceGroups, spaceGroupTransport } from './space-groups';
import { spareCode } from './spare';
import { isVoicePart, VoiceAssembler, type VoicePart } from './voice';
import { sendWaiting, type SendPlace } from './waiting';

// The account's other devices (docs/linked-devices.md): the phone that holds the account (the
// primary) relays for a computer or a browser linked to it, and contacts see nothing new. Each link
// is a conversation of the core's own kind through the relay, between a key the device made for it
// and one the phone made, kept with the rest of the space's links (lock/devices-data.ts); what goes
// in it is lib/link-wire.ts's.
//
// On the primary, the chat (lib/e2e.ts, `Link`) says what it opened from contacts and what it sealed
// for them: each linked device is told, as the chat opened it, without where the contact reads. A
// message a device wrote comes as the chat sealed it there; the primary seals it for the contact as
// it came, saying where its own queue is, and keeps it in its history as its own. What the
// devices keep of the contacts (names, timers, looks, pictures, requests) goes both ways, a field at
// a time. On a linked device, the chat seals each message for the primary instead of the contact,
// and opens what the primary passes on as the contact's.
//
// What waits for a device, sealed, waits in its outbox until the relay takes it, so nothing is
// sealed twice for it. A device the outbox cannot hold any more for is not sealed for until it
// drained, so the link never skips more than its ratchet can: then it is sent the contacts and what
// of the history it missed.
//
// A photo or file passed on to devices, or a copy of one put on the relay for them, is left there
// when taken until each device told of it said it took it, and this phone took it too if it was
// still to: whichever comes last, the primary has it deleted there. A device unlinked takes nothing
// more, so what waited only for it goes then. What no one takes expires on the relay after 14 days.
//
// A contact's call rings on the phone and on each linked device, and a device calls through the
// account: lib/linked-calls.ts decides on the primary where each call signal goes. A call answered
// or turned down on one device stops ringing on the others, quietly.
//
// The account's groups, but public ones, are the devices' too (lib/groups.ts, GroupLink): the
// primary tells each device what changed in them, a group as it is now and the messages it was not
// told of yet, and does what a device asks in one, as its own. A device keeps them as the phone said
// them; it makes and joins no group, and group calls ring on the phone only.
//
// What is done later to a message told already reaches the devices too. In a chat, the phone's
// reactions, pins and votes go with what it sealed for the contact (`out`), the contact's with what
// came (`in`); a star or deleting on the phone only, which the contact is not told of, goes as a
// change (`changed`). In a group, the primary keeps what was done to each group's messages as last
// told (`marked`, in memory) and a mark of it for each device: what changed since goes to each
// device that has it, and a device that may not (after the space opened again with changes not told,
// or caught up) is told the group's marks whole.
//
// A linked device's own backup has the account's chats as they were but not the link, which no
// backup holds (lock/devices-data.ts): restored, they are read, not written in, and it says so once.
// Such a space links again: the chats the phone still has stay, with what came since, and the
// others go.
//
// Each linked device also has an endpoint of its own (docs/multi-device.md): a core account it
// makes once linked, never the key of its link, and says to the phone (`endpoint`). The phone
// signs, with the account's own key, the list of its devices' endpoints (lib/device-list.ts), again
// each time a device says one or is unlinked, or as the space opens if the list and the links
// differ (as on another phone a backup was put back on), and tells each device the list and the
// account's bundle (`list`), with where each of the others reads (`routes`). A device keeps the
// list once that bundle is the account's it was linked to and the bundle's key signed it. A device
// from before says no endpoint and is in no list, and a phone from before leaves the endpoint
// alone: either keeps passing on as before. A device's backup put back elsewhere lets go of its
// endpoint as it opens. Only the account's own devices are given the list in this version; a build
// whose core cannot sign does none of it.
//
// The devices the list names reach each other directly too, endpoint to endpoint (lib/siblings.ts),
// so they see each other's messages and changes with the phone off: what a device seals for a
// contact goes to the phone (`send`) and to each of them (`out`), and a change it makes to a
// contact to the phone and to each of them (`set`), with when it was made, so changes made at once
// settle the later first; the phone settles them so too, and says when with the contacts. Contacts'
// messages still come only through the phone, and what only the phone can do (adding a contact, the
// groups, linking) still goes to it alone.
//
// Each side of a link, and of two devices', gives the other a key for the packets it sends back
// (`pk`), and once it has the other's, seals each packet with it (lib/sealed-packet.ts), as the
// chat does for contacts: to the relay they look like any contact's, and each opens in its own
// conversation only. A version from before says none, and is sealed nothing.
//
// Each packet tells the relay what it carries (lib/relay.ts, Mark), for a web app's notice while it
// is closed, a linked one's too. On the primary, a contact's message passed on to the devices (`in`)
// is a message, a voice message on its last part only, but quiet to a device the contact wrote it
// to as well, which counts the one that came from them (copiedTo); a call's offer rings, counted
// as a call; a member's message in a group goes in an envelope of its own, a message, as the relay
// counts one for each packet. The rest between the devices is quiet, and a packet waiting in a
// device's outbox keeps how it goes (`marks`). What a device wrote goes on to the contact marked
// as the chat marks its own, a voice message once: on its last part, but for one that waits whole
// after a part could not go, which is counted as it goes. To the phone, all a device sends is
// quiet, as it goes to the account's own queue (lib/space-chats.ts, sentMark); what it writes to a
// contact itself goes to them marked as the phone's own would.
//
// Three turns keep it straight: the chat's own (E2E), which may wait for this file's; this file's
// (`run`), for the links and their keys, which never waits for the chat; and the work a message
// brings (`act`: the history, sealing for contacts, the relay's file store), which waits for both.
// A call's signals are work of their own (`ring`), which cannot wait behind the history.

/** The most devices one account links: as many as its device list names. */
export const MAX_DEVICES = MAX_LISTED;
// How long a code shown on a device answers, how long a message sealed here waits to be kept as
// sent before its devices are told, and how big a pack of the history grows.
const OFFER_LASTS = 30 * 60_000;
const ECHO_LASTS = 10 * 60_000;
const ECHO_EVERY = 1500;
const PACK_BYTES = 1024 * 1024;
// How often the links are looked at while the space is open, and the first and longest wait after
// the relay could not take what waits.
const TICK = 60_000;
const RETRY = 5000;
const RETRY_MOST = 5 * 60_000;
// Messages a device wrote that could not go to the contact yet (not the ones the chat keeps), and how often each is tried.
const MAX_LATER = 50;
const LATER_TRIES = 5;
// How long a photo or file left on the relay for devices is kept track of: the relay drops it after 14 days.
const LEFT_LASTS = 15 * 24 * 60 * 60_000;
// How long a call answered or turned down on another device is remembered, should it ring here only after.
const ENDED_LASTS = 2 * 60_000;
// How often the primary empties the queues of the places that fill its device list, and the most it takes from one at a time.
const DRAIN_EVERY = 60 * 60_000;
const DRAIN_MOST = 1000;
// After the phone's queue moved for a contact deleted or blocked, a new device list at most this often.
const RESIGN_EVERY = 60 * 60_000;
const CONTACT_PREFIX = 'contact:';
// What a message a device wrote may say that need not be tried again: where it reads, that it is
// open, the timer (which went with the contact here), and what came or was read (held for the next).
const QUIET = new Set(['from', 'relay', 'relayKey', 'spare', 'text', 'tag', 'timer', 'timerAt', 'lasts', 'got', 'read', 'on', 'onAt', 'ask', 'quiet', 'due']);

/** What a device was told of a contact's devices (`way`), in short (Peer.ways): enough to tell whether it changed since. */
export function wayDigest(way: { dv: number; list?: DeviceList }): string {
  return toHex(sha256Bytes(utf8Encode(JSON.stringify([way.dv, way.list?.s ?? '', way.list?.r ?? {}])))).slice(0, 16);
}

/** Which this space is: the phone that holds the account and has devices linked, a linked device, or neither. */
export type Role = 'primary' | 'linked' | null;

/** A device as Linked devices shows it: on the primary each one; on a linked device, the phone. */
export type DeviceInfo = { id: string; name: string; since: number; heard: number; linked: boolean; history: { done: number } | null };

/** What the links changed in the history: messages deleted, of a chat (`peer`) or one of its messages (`tag`). */
export type LinkedChange = { gone: { peer: string; tag?: string }[] };

/** What of the history a device is brought over: from `since` (milliseconds, 0 for all), or none (null), with photos and files or not. */
export type HistoryChoice = { since: number | null; files: boolean };

// Where this side reads, and whether the relay's key is known (`keyed`): asked of it and answered,
// none or one. Not known, the place's key says none, which may not be so.
type Here = { own: Relay; sends: Relay; place: Place; where: Where; keyed: boolean };
// What is sealed for: a link, or another device directly.
type Sealable = { conversation: string; outbox: string[]; marks?: Record<string, OutMark>; told: string; behind: number; key?: string; sealTo?: string };
type Taken = Awaited<ReturnType<Link['open']>>;
// A photo or file told of with an envelope, left on the relay for the devices it goes to; `phone`: this phone is still to take it too.
type Leaving = { from: FileFrom; phone: boolean };
type Pending = { code: LinkCode; bundle: Uint8Array; account: Uint8Array; device: string; safety: string };

const listeners = new Set<(change: LinkedChange) => void>();

/** Calls `listener` each time the links changed the history or the devices. Returns how to stop. */
export function onLinked(listener: (change: LinkedChange) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function announce(change: LinkedChange = { gone: [] }) {
  listeners.forEach((listener) => listener(change));
  announceReceived();
}

const isText = (v: unknown): v is string => typeof v === 'string';
const isObject = (v: unknown): v is Json => !!v && typeof v === 'object' && !Array.isArray(v);
const tagsOf = (v: unknown): string[] => (Array.isArray(v) ? v.filter(isTag) : []);
const peerOf = (identity: string) => `${CONTACT_PREFIX}${identity}`;

// What a chat's message (`m`, as lib/e2e.ts says it) carries, as the relay is told: one the chat
// keeps is a message, a voice message on its last part only; a call's offer rings; all else is
// quiet.
function relayMarkOf(m: Json): RelayMark {
  if (isCall(m)) return markOf('', decodeCall(m.call));
  if (!isKept(m)) return 'quiet';
  const voice = m.voice;
  return !isObject(voice) || (typeof voice.parts === 'number' && voice.part === voice.parts - 1) ? 'message' : 'quiet';
}

// How a packet for a device goes, kept with it in the outbox: nothing for one that is quiet.
function outMarkOf(mark: RelayMark): OutMark | undefined {
  return mark === 'quiet' ? undefined : mark;
}

// A peer without what of its outbox went, nor the marks of those.
function withoutSent<T extends Sealable>(peer: T, sent: Set<string>): T {
  const outbox = peer.outbox.filter((p) => !sent.has(p));
  const { marks, ...rest } = peer;
  const left = marks ? Object.entries(marks).filter(([p]) => !sent.has(p)) : [];
  return { ...rest, outbox, ...(left.length > 0 ? { marks: Object.fromEntries(left) } : {}) } as T;
}

function parse(plaintext: Uint8Array): Json | null {
  try {
    const value: unknown = JSON.parse(utf8Decode(plaintext));
    return isObject(value) ? value : null;
  } catch {
    return null;
  }
}

function voiceOf(v: unknown): VoicePart | null {
  if (!isObject(v) || !isText(v.data)) return null;
  try {
    const part = { id: v.id, part: v.part, parts: v.parts, ms: v.ms, data: fromBase64(v.data), ...(v.talk === true ? { talk: true } : {}) } as Partial<VoicePart>;
    return isVoicePart(part) ? part : null;
  } catch {
    return null;
  }
}

// The offer of a file not taken yet, from where it waits on the relay.
function offerOf(ref: FileRef): FileOffer | null {
  if (!ref.from) return null;
  const { id: _id, count: _count, from, ...shared } = ref;
  return readOffer({ ...shared, relay: from.relay, ids: from.ids });
}

const fromOf = (offer: FileOffer): FileFrom => ({ relay: offer.relay, ids: offer.ids });
const isTimed = (field: string): field is (typeof TIMED)[number] => (TIMED as readonly string[]).includes(field);
const contactsOf = (contacts: ((c: Contact[]) => Contact[]) | null) => (contacts ? { contacts } : {});
const removedOf = (removed: Record<string, number>) => ({ removed: Object.keys(removed).length > 0 ? removed : undefined });
// The links without the account's other devices reached directly: unlinked, or met as another
// endpoint.
function withoutSiblings(data: DevicesData): DevicesData {
  const { siblings: _siblings, ...rest } = data;
  return rest;
}

// A key this side gives another for the packets it sends here.
const newPacketKey = () => toBase64Url(randomBytes(32));
// What the contacts become with two changes, one after the other.
const both = (a: ((c: Contact[]) => Contact[]) | null, b: ((c: Contact[]) => Contact[]) | null) => (a && b ? (c: Contact[]) => b(a(c)) : (a ?? b));

/** The links of one space's chat to the account's other devices. */
export class Links implements Link, TakenFiles {
  private data: DevicesData;
  private turn: Promise<unknown> = Promise.resolve();
  private acts: Promise<unknown> = Promise.resolve();
  private readonly parts = new Parts();
  // The parts of voice messages: on the primary, of those a device wrote; on a device, of those the primary sent.
  private readonly voiceParts = new VoiceAssembler();
  private readonly voiceLate = new Set<string>();
  // On the primary: a device being linked, between its code and Link.
  private pending: Pending | null = null;
  // On the primary: messages sealed for contacts that the chat keeps, until it keeps them as sent.
  private readonly echoes = new Map<string, { c: string; tag: string; m: Json; at: number }>();
  private echoTimer: ReturnType<typeof setTimeout> | null = null;
  private later: { c: string; m: Json; tries: number; shared: boolean }[] = [];
  // On the primary: where each call goes. On either: calls answered or turned down on another device, should they ring here after.
  private readonly calls = new LinkedCalls();
  private readonly endedThere = new Map<string, { declined: boolean; at: number }>();
  private rings: Promise<unknown> = Promise.resolve();
  private stopCalls: (() => void) | null = null;
  private stopMoves: (() => void) | null = null;
  // On a linked device: the contacts deleted (1) or blocked (2) here, until the phone is told.
  private readonly deletions = new Map<string, Deleted>();
  // The space's groups, and which of them go to the devices; on the primary, whether telling them is
  // under way, and whether a message could not go to them yet.
  private groups: { groups: Groups; transport: GroupTransport; shared: (id: string) => boolean } | null = null;
  private stopGroups: (() => void) | null = null;
  private telling = false;
  private groupsLate = false;
  // On the primary: what was done to each group's messages as last told, and its mark (marksDigest).
  private readonly marked = new Map<string, { marks: Map<string, GroupMarked>; digest: string }>();
  // Where this side reads, as last found, said with what goes; and the relay's key, asked once for each relay.
  private at: Place | null = null;
  // The queue the account's contact link names (lib/queue-move.ts): the own queue's while it is the link's.
  private linkSender = '';
  // The keys of packet keys (lib/sealed-packet.ts), by the packet key.
  private readonly packetKeys = new Map<string, PacketKeys>();
  // On the primary: when a device set what it changed of a contact, until the devices are told.
  private readonly stamps = new Map<string, { at: number; change: Change; added?: true }>();
  private keyOf: { url: string; key: string } | null = null;
  // On the primary: when the queues of the places that fill the device list were last emptied, and
  // whether a device is still to be told what is known of some contacts' devices (tellWays).
  private drainedAt = 0;
  private waysLeft = false;
  private flushing: Promise<void> | null = null;
  private again = false;
  private retries = 0;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private tickTimer: ReturnType<typeof setInterval> | null = null;
  private closed = false;
  private readonly space: number;
  private readonly key: Uint8Array;
  private readonly chats: SpaceChats;

  private constructor(space: number, key: Uint8Array, chats: SpaceChats, data: DevicesData) {
    this.space = space;
    this.key = key;
    this.chats = chats;
    this.data = data;
  }

  /** The links of a space's chats (`chats`), sealed with `key`; from now on the chat reaches the devices through them. */
  static async open(space: number, key: Uint8Array, chats: SpaceChats, tick = TICK): Promise<Links> {
    const links = new Links(space, key, chats, await loadDevicesData(space, key));
    // A space that is no linked device has no endpoint: one there is a linked device's backup put
    // back elsewhere, without its link, and goes before anything is sealed, so two never seal as one.
    if (!links.data.primary) await chats.e2e.dropEndpoint().catch(() => undefined);
    // So do the other devices it met as an endpoint it no longer has, as when a backup with another
    // was put back here.
    const { siblings } = links.data;
    if (siblings && (!links.data.primary || siblings.of !== chats.e2e.endpoint()?.id)) await links.save(withoutSiblings(links.data));
    chats.e2e.useLink(links);
    links.stopCalls = onCallChange(() => links.callChanged());
    links.stopMoves = onSpaceMoved(async (_queue, _old, why) => links.spaceMoved(why));
    links.tickTimer = setInterval(() => links.tick(), tick);
    links.tick();
    links.act(() => links.listsAtOpen());
    return links;
  }

  /** Stops, once the space closes. */
  close(): void {
    this.closed = true;
    if (this.tickTimer) clearInterval(this.tickTimer);
    if (this.retryTimer) clearTimeout(this.retryTimer);
    if (this.echoTimer) clearTimeout(this.echoTimer);
    this.stopCalls?.();
    this.stopMoves?.();
    this.stopGroups?.();
    this.groups?.groups.useLink(null);
    this.chats.e2e.useLink(null);
  }

  private run<T>(call: () => Promise<T>): Promise<T> {
    const next = this.turn.catch(() => undefined).then(call);
    this.turn = next;
    return next;
  }

  // Work a message brought, one after another, after the turn that brought it.
  private act(call: () => Promise<unknown>): void {
    this.acts = this.acts
      .catch(() => undefined)
      .then(call)
      .catch(() => undefined);
  }

  // A call's signal, one after another, apart from other work: a call cannot wait for the history to go.
  private ring(call: () => Promise<unknown>): void {
    this.rings = this.rings
      .catch(() => undefined)
      .then(call)
      .catch(() => undefined);
  }

  /** Waits for the work under way, as the checks do. */
  async settled(): Promise<void> {
    for (let i = 0; i < 20; i++) {
      const [turn, acts, rings, flushing] = [this.turn, this.acts, this.rings, this.flushing];
      await Promise.all([turn.catch(() => undefined), acts, rings, flushing?.catch(() => undefined)]);
      if (turn === this.turn && acts === this.acts && rings === this.rings && flushing === this.flushing) return;
    }
  }

  private async save(data: DevicesData): Promise<void> {
    this.data = data;
    await saveDevicesData(this.space, this.key, data);
  }

  get through(): boolean {
    return this.data.primary !== null;
  }

  role(): Role {
    if (this.data.primary) return 'linked';
    return this.data.devices.some((d) => d.linked) ? 'primary' : null;
  }

  /** On the primary its devices, linked or still being linked; on a linked device the phone. */
  devices(): DeviceInfo[] {
    const info = ({ id, name, since, heard, linked, history }: Peer): DeviceInfo => ({ id, name, since, heard, linked, history: history && { done: history.done } });
    return this.data.primary ? [info(this.data.primary)] : this.data.devices.map(info);
  }

  /**
   * Whether this space's chats are a linked device's copy, restored from its backup: not linked, and
   * its contacts all as a linked device keeps them (with no conversation of their own), its groups
   * with no state. They can be read, not written in, until it is linked again.
   */
  copied(): boolean {
    if (this.role() !== null) return false;
    const { e2e } = this.chats;
    const contacts = e2e.contacts();
    const groups = this.groups?.groups;
    if (contacts.length === 0 && (groups?.all().length ?? 0) === 0) return false;
    return contacts.every((c) => !e2e.record(c.identity)?.conversations[0]) && !groups?.hasState();
  }

  /** In a linked device's copy (copied): whether to say so, once. */
  sayCopy(): Promise<boolean> {
    return this.run(async () => {
      if (this.data.copySaid || !this.copied()) return false;
      await this.save({ ...this.data, copySaid: true });
      return true;
    });
  }

  /** On a linked device: the account's contact link, to show as this chat's own. */
  accountLink(): string | null {
    return this.data.primary && this.data.link ? this.data.link : null;
  }

  /** On a linked device being linked: the code the phone shows, once it answered. */
  answerCode(): string | null {
    return this.data.answer?.code ?? null;
  }

  // Where this side reads: the space's relay and queue, and the relay's key. Null without them.
  private async here(): Promise<Here | null> {
    const data = await loadSpaceData(this.space, this.key);
    const url = data.url.trim();
    if (!url || !data.ownQueue) return null;
    const own: Relay = { url, token: data.token.trim() || undefined };
    const sends = relayFor(url, data.token, data.via, data.viaToken) ?? own;
    if (this.keyOf?.url !== url) {
      const key = await relayKey(own).catch(() => undefined);
      if (key !== undefined) this.keyOf = { url, key: key ? toBase64Url(key) : '' };
    }
    const keyed = this.keyOf?.url === url;
    const rk = keyed ? this.keyOf!.key : '';
    const place: Place = { sender: data.ownQueue.senderHex, relay: url, relayKey: rk, spare: this.chats.e2e.spare() };
    this.at = place;
    const link = (await spaceQueues(this.space, this.key).load().catch(() => null))?.link;
    this.linkSender = link && sameRelay(link.url, url) ? link.queue.senderHex : place.sender;
    return { own, sends, place, where: { relay: url, relayKey: rk }, keyed };
  }

  private sendPlace(here: Here | null): SendPlace {
    if (!here) return { sends: null, own: null, senderHex: '', here: { relay: '', relayKey: '' }, ownKey: '', relayUp: false };
    return { sends: here.sends, own: here.own, senderHex: here.place.sender, here: here.where, ownKey: here.where.relayKey, relayUp: true };
  }

  // The account's contact link, as the primary's chat shows it: the queue the link names, not the one contacts write to.
  private ownLink(): string {
    if (!this.at) return '';
    const { sender, relay, relayKey: rk } = this.at;
    return contactLink({ senderHex: this.linkSender || sender, relayUrl: relay, key: toBase64Url(this.chats.e2e.bundle), relayKey: rk || undefined, spare: spareCode(this.chats.e2e.spare()) });
  }

  // Seals an envelope for a peer and puts it in its outbox, in the turn. One the outbox has no room
  // for is not sealed: the peer is behind from then on. Each says the key this side gives the peer,
  // and once the peer said its own, each packet is sealed with it. One that is not quiet (`mark`)
  // goes so with its last packet.
  private async seal<T extends Sealable>(peer: T, envelope: Envelope, mark?: OutMark): Promise<T> {
    if (peer.outbox.length >= MAX_OUTBOX) return { ...peer, behind: peer.behind || Date.now() };
    const key = peer.key || newPacketKey();
    let conversation = fromBase64(peer.conversation);
    const outbox = [...peer.outbox];
    for (const bytes of encodeEnvelope(envelope, this.at, key)) {
      const sealed = await core.seal(conversation, bytes);
      conversation = sealed.conversation;
      outbox.push(toBase64(this.sealedFor(peer, sealed.packet)));
    }
    const marks = mark ? { ...peer.marks, [outbox[outbox.length - 1]]: mark } : peer.marks;
    return { ...peer, key, conversation: toBase64(conversation), outbox, ...(marks ? { marks } : {}), told: this.at ? JSON.stringify(this.at) : peer.told };
  }

  // A packet as it goes to a peer: sealed with the key it gave, once it gave one.
  private sealedFor(peer: Sealable, packet: Uint8Array): Uint8Array {
    return peer.sealTo ? sealPacket(this.keysOf(peer.sealTo), packet) : packet;
  }

  private keysOf(key: string): PacketKeys {
    let keys = this.packetKeys.get(key);
    if (!keys) {
      keys = packetKeys(fromBase64Url(key));
      this.packetKeys.set(key, keys);
    }
    return keys;
  }

  // Says something to each linked device (on the primary) or to the phone (on a linked device).
  // Returns the devices it was sealed for; the photos and files it tells of (`files`) are left on
  // the relay for them, in the same turn, so this phone taking one meanwhile does not delete it.
  // What is not quiet (`mark`, or as it says for each) is so only for the devices: to the phone it is.
  private say(envelope: Envelope | ((peer: Peer) => Envelope), only?: string, files: Leaving[] = [], mark?: OutMark | ((peer: Peer) => OutMark | undefined)): Promise<string[]> {
    return this.run(async () => {
      const make = typeof envelope === 'function' ? envelope : () => envelope;
      if (this.data.primary) {
        if (only && only !== this.data.primary.id) return [];
        await this.save({ ...this.data, primary: await this.seal(this.data.primary, make(this.data.primary)) });
        return [this.data.primary.id];
      }
      const devices: Peer[] = [];
      const told: string[] = [];
      for (const d of this.data.devices) {
        if (!d.linked || (only && d.id !== only)) {
          devices.push(d);
          continue;
        }
        const sealed = await this.seal(d, make(d), typeof mark === 'function' ? mark(d) : mark);
        if (sealed.outbox.length > d.outbox.length) told.push(d.id);
        devices.push(sealed);
      }
      await this.save({ ...this.data, devices, left: this.leftFor(told, files) });
      return told;
    }).then((told) => {
      void this.flush().catch(() => undefined);
      return told;
    });
  }

  // The photos and files left on the relay, with `files` left for the devices `told` too.
  private leftFor(told: string[], files: Leaving[]): Left[] {
    if (told.length === 0 || files.length === 0) return this.data.left;
    const now = Date.now();
    let left = this.data.left;
    for (const { from, phone } of files) {
      const kept = left.find((l) => l.ids === from.ids);
      left = kept
        ? left.map((l) => (l === kept ? { ...l, devices: [...new Set([...l.devices, ...told])] } : l))
        : [...left, { relay: from.relay, ids: from.ids, at: now, phone, devices: told }];
    }
    return left.slice(-MAX_LEFT);
  }

  private linked(): Peer[] {
    return this.data.primary ? [this.data.primary] : this.data.devices.filter((d) => d.linked);
  }

  // ---- What the chat calls (lib/e2e.ts, Link) ----

  open(packet: Uint8Array): ReturnType<Link['open']> {
    if (!this.data.primary && this.data.devices.length === 0 && !this.data.offer) return Promise.resolve(null);
    return this.run(async () => {
      const peers = this.data.primary ? [this.data.primary] : this.data.devices;
      const siblings = this.siblingList();
      if (isSealedPacket(packet)) {
        // Whose it is, by its mark: then it is tried in that one's conversation only. One no link's
        // mark knows may be a contact's (lib/e2e.ts).
        const marked = (p: Sealable) => !!p.key && sealedWith(this.keysOf(p.key), packet);
        const peer = peers.find(marked);
        const sibling = peer ? undefined : siblings.find(marked);
        const inner = peer ?? sibling ? openPacket(this.keysOf((peer ?? sibling)!.key!), packet) : null;
        if (!inner || (await core.packetKind(inner)) !== 'following') return null;
        return peer ? this.openFrom(peer, inner) : this.openFromSibling(sibling!, inner);
      }
      const kind = await core.packetKind(packet);
      if (kind === 'first') return (await this.answered(packet)) ?? this.siblingFirst(packet);
      if (kind !== 'following') return null;
      for (const peer of peers) {
        const taken = await this.openFrom(peer, packet);
        if (taken) return taken;
      }
      for (const sibling of siblings) {
        const taken = await this.openFromSibling(sibling, packet);
        if (taken) return taken;
      }
      return null;
    });
  }

  // A packet that continues a link's conversation, in the turn, or null if it does not.
  private async openFrom(peer: Peer, packet: Uint8Array): Promise<Taken> {
    let opened: core.Opened;
    try {
      opened = await core.open(fromBase64(peer.conversation), packet);
    } catch {
      return null;
    }
    const now = Date.now();
    // Kept moved past it before anything else, as the chat keeps its conversations.
    const moved = { ...peer, conversation: toBase64(opened.conversation), heard: now };
    await this.keepPeer(moved);
    const said = this.parts.take(peer.id, opened.plaintext, now);
    if (!said) return { kind: 'taken' };
    return this.take(moved, said);
  }

  private async keepPeer(peer: Peer): Promise<void> {
    if (this.data.primary?.id === peer.id) await this.save({ ...this.data, primary: peer });
    else await this.save({ ...this.data, devices: this.data.devices.map((d) => (d.id === peer.id ? peer : d)) });
  }

  // A device being linked hears from the phone that took its code: if the secret is the code's,
  // the codes to compare. One that came after the first is not taken: a new code starts again.
  private async answered(packet: Uint8Array): Promise<Taken> {
    const offer = this.data.offer;
    if (!offer || this.data.primary || this.data.answer || Date.now() - offer.made > OFFER_LASTS) return null;
    let opened: core.Opened;
    try {
      opened = await core.acceptConversation(fromBase64(offer.account), packet);
    } catch {
      return null;
    }
    const said = this.parts.take('answer', opened.plaintext);
    if (said?.k !== 'hello' || said.secret !== offer.secret || !said.at) return { kind: 'taken' };
    const phone = await core.conversationPeer(opened.conversation);
    const own = await core.accountIdentity(fromBase64(offer.account));
    const code = linkSafetyCode(await core.safetyNumber(own, phone));
    const now = Date.now();
    const peer: Peer = {
      id: toHex(phone),
      name: cleanDeviceName(said.name),
      conversation: toBase64(opened.conversation),
      at: said.at,
      since: now,
      heard: now,
      linked: true,
      outbox: [],
      told: '',
      history: null,
      files: false,
      behind: 0,
      groups: {},
      ...(said.pk ? { sealTo: said.pk } : {}),
    };
    await this.save({ ...this.data, answer: { peer, account: said.account, code } });
    announce();
    return { kind: 'taken' };
  }

  // What one envelope from a peer says, in the turn. What the chat keeps of the contacts changes
  // in the chat's turn (`contacts`); what the history keeps, in the work after.
  private async take(peer: Peer, said: Envelope & { at?: Place; pk?: string }): Promise<Taken> {
    let moved = peer;
    let place: ((contacts: Contact[]) => Contact[]) | null = null;
    if (said.at && JSON.stringify(said.at) !== JSON.stringify(peer.at)) {
      moved = { ...moved, at: said.at };
      // On a linked device the contacts are written to through the phone's queue.
      if (this.data.primary) {
        const at = said.at;
        place = (contacts) => contacts.map((c) => ({ ...c, sender: at.sender, relay: at.relay, relayKey: at.relayKey, spare: at.spare }));
      }
      // On the primary, the device's others are told where it reads now, and the contacts in time:
      // with a new list, when it moved as this phone asked it to (movedFor).
      else if (peer.endpoint)
        this.act(async () => {
          await this.routeList();
          await this.tellList();
          if ((this.data.moving ?? 0) > Date.now()) await this.resignSoon();
        });
    }
    if (said.pk && said.pk !== peer.sealTo) moved = { ...moved, sealTo: said.pk };
    if (moved !== peer) await this.keepPeer(moved);
    if (this.data.primary) return this.takeOnDevice(said, place);
    await this.takeOnPrimary(moved, said);
    return { kind: 'taken', ...(place ? { contacts: place } : {}) };
  }

  private async takeOnPrimary(peer: Peer, said: Envelope): Promise<void> {
    // Whatever a device says once linked tells that the codes matched there.
    if (!peer.linked) await this.ready(peer, said.k === 'ready' ? said.name : '');
    else if (said.k === 'ready' && said.name) await this.keepPeer({ ...peer, name: cleanDeviceName(said.name) || peer.name });
    switch (said.k) {
      case 'send': {
        if (isCall(said.m)) {
          this.callFor(peer.id, said.c, said.m);
          break;
        }
        // A photo or file the device's others may take too stays on the relay for them.
        const shared = this.othersOf(peer).length > 0;
        this.act(() => this.sendFor(said.c, said.m, 0, shared));
        break;
      }
      case 'add':
        this.act(() => this.addFor(said.code, said.when));
        break;
      case 'set':
        this.act(() => this.setFor(said.c, said.change, said.remove === true, said.when, said.del));
        break;
      case 'took':
        this.act(() => this.letGo(peer.id, said.ids));
        break;
      case 'group':
        this.act(() => this.groupFor(peer.id, said.id, said.ask));
        break;
      case 'endpoint':
        if (core.canSign()) await this.endpointFrom(peer.id, said.bundle, said.ek);
        break;
      case 'out':
        // What the device wrote to a contact itself: this phone's own too, and the devices that do
        // not reach it directly are told it as from here.
        this.act(() => this.ownFrom(said.c, said.m, said.mark));
        this.passOn(peer, { k: 'out', c: said.c, m: said.m, ...(said.mark ? { mark: said.mark } : {}) });
        break;
      case 'came':
        this.act(() => this.cameHere(said.c, said.got));
        this.passOn(peer, { k: 'in', c: said.c, m: { text: '', got: said.got } });
        break;
      case 'bye':
        await this.save({ ...this.data, devices: this.data.devices.filter((d) => d.id !== peer.id) });
        this.act(() => this.letGo(peer.id, null));
        this.callSteps(this.calls.unlinked(peer.id));
        this.act(() => this.signAgain());
        announce();
        break;
      default:
        break;
    }
  }

  private async takeOnDevice(said: Envelope, place: ((contacts: Contact[]) => Contact[]) | null): Promise<Taken> {
    const primary = this.data.primary!;
    switch (said.k) {
      case 'in':
        // One erased here, from another device, before it came through the phone.
        if (isKept(said.m) && this.erasedHere(peerOf(said.c), said.m.tag as string)) break;
        return { kind: 'message', identity: said.c, plaintext: utf8Encode(JSON.stringify(said.m)) };
      case 'contacts': {
        // As settled with what this device keeps (lib/siblings.ts), and without those removed here
        // since that the phone has not heard of yet.
        const kept = this.data.synced;
        const removed = { ...this.data.removed };
        const synced: Record<string, Synced> = said.all ? {} : { ...kept };
        for (const gone of said.gone) delete synced[gone];
        const list: Synced[] = [];
        for (const s of said.list) {
          if (buried(removed[s.identity], s)) continue;
          delete removed[s.identity];
          synced[s.identity] = settled(kept[s.identity], s);
          list.push(synced[s.identity]);
        }
        const gone = Object.keys(kept).filter((id) => !synced[id]);
        await this.save({ ...this.data, synced, ...removedOf(removed), ...(said.link !== undefined ? { link: said.link } : {}) });
        if (gone.length > 0) this.act(() => this.clearChats(gone));
        const { all } = said;
        const account = this.data.account;
        return {
          kind: 'taken',
          contacts: (contacts) => {
            const placed = place ? place(contacts) : contacts;
            const byId = new Map(placed.map((c) => [c.identity, c]));
            if (all) return list.map((s) => mirrorOf(s, byId.get(s.identity), primary.at, account));
            const next = placed.filter((c) => synced[c.identity]);
            for (const s of list) {
              const mirror = mirrorOf(s, byId.get(s.identity), primary.at, account);
              const at = next.findIndex((c) => c.identity === s.identity);
              if (at < 0) next.push(mirror);
              else next[at] = mirror;
            }
            return next;
          },
        };
      }
      case 'out':
        this.act(() => this.ownFrom(said.c, said.m, said.mark));
        break;
      case 'history':
        await this.save({ ...this.data, packs: [...this.data.packs, said.offer] });
        this.act(() => this.takePacks());
        break;
      case 'call':
        this.endElsewhere(said.id, said.done === 'declined');
        break;
      case 'groups': {
        // Who is in each, in the turn; the groups and their messages, in the work after.
        const members: DevicesData['members'] = said.all ? {} : { ...this.data.members };
        for (const id of said.gone) delete members[id];
        for (const g of said.list) members[g.id] = g.members;
        await this.save({ ...this.data, members });
        this.act(() => this.mirrorFrom(said));
        break;
      }
      case 'changed':
        this.act(() => this.changedFrom(said.chats, said.groups, said.whole));
        break;
      case 'list':
        if (core.canSign()) return { kind: 'taken', ...contactsOf(both(place, await this.listFrom(said))) };
        break;
      case 'way': {
        const { c } = said;
        return { kind: 'taken', contacts: both(place, (contacts) => contacts.map((x) => (x.identity === c ? withWay(x, said) : x)))! };
      }
      case 'came':
        this.act(() => this.cameHere(said.c, said.got));
        break;
      case 'move':
        // The phone's queue moved for a contact deleted or blocked: this device's moves with its next look (lib/queue-move.ts).
        this.act(() => this.chats.e2e.moveSoon());
        break;
      case 'bye':
        this.act(() => this.forget());
        break;
      default:
        break;
    }
    return { kind: 'taken', ...(place ? { contacts: place } : {}) };
  }

  wrap(identity: string, plaintext: Uint8Array): Promise<Uint8Array> {
    let told = false;
    return this.run(async () => {
      const primary = this.data.primary;
      if (!primary) throw new Error(t('This device is no longer linked to a phone.'));
      const m = parse(plaintext);
      const key = primary.key || newPacketKey();
      const bytes = m && encodeOne({ k: 'send', c: identity, m: withoutPlace(m) }, this.at, key);
      if (!bytes) throw new Error(t('Too long to go through the phone.'));
      const sealed = await core.seal(fromBase64(primary.conversation), bytes);
      // The account's other devices see it as this one's own, with the phone off too: not a call's
      // signal, nor one sent for later, which they see once the phone sends it.
      const erased = m ? this.erasedBy(identity, m) : this.data.erased;
      const tell = m && !isSignal(m) && !m.due && (isKept(m) || isWorthTelling(m)) && this.siblingList().length > 0;
      const siblings = tell ? await this.sealSiblings({ k: 'out', c: identity, m: withoutPlace(m) }) : this.data.siblings;
      told = !!tell;
      await this.save({ ...this.data, primary: { ...primary, key, conversation: toBase64(sealed.conversation) }, siblings, erased });
      return this.sealedFor(primary, sealed.packet);
    }).then((packet) => {
      if (told) void this.flush().catch(() => undefined);
      return packet;
    });
  }

  // The tags erased in each chat, with those a message this device sealed for a contact erases: so
  // a late copy of one, from the phone or another device, does not bring it back.
  private erasedBy(identity: string, m: Json): Record<string, string[]> | undefined {
    const erase = isObject(m.erase) ? m.erase : null;
    const peer = peerOf(identity);
    const tags = erase?.all === true ? this.chats.history.messages().filter((x) => x.peer === peer && x.tag).map((x) => x.tag) : erase && isTag(erase.tag) ? [erase.tag] : [];
    return tags.length > 0 ? withErased(this.data.erased ?? {}, peer, tags) : this.data.erased;
  }

  async add(code: ContactCode, identity: string, known: Contact | undefined): Promise<Contact> {
    const primary = this.data.primary;
    if (!primary) throw new Error(t('This device is no longer linked to a phone.'));
    if (identity === this.data.account) throw new OwnCodeError();
    await this.say({ k: 'add', code, when: Date.now() });
    // Ahead of what the chat writes to them next, if the relay takes it now.
    await this.flush().catch(() => undefined);
    if (known) return { ...known, request: false };
    const synced: Synced = { identity, name: '', timer: 0, timerAt: 0, request: false, look: null, hide: false };
    return mirrorOf(synced, undefined, primary.at, this.data.account);
  }

  opened(identity: string, plaintext: Uint8Array): void {
    // On a linked device, what a contact's endpoint said came of what this device wrote to it
    // itself: the phone and the other devices mark it too.
    if (this.data.primary) {
      const got = tagsOf(parse(plaintext)?.got);
      if (got.length > 0) void this.tellOthers({ k: 'came', c: identity, got });
      return;
    }
    if (!this.data.devices.some((d) => d.linked)) return;
    const m = parse(plaintext);
    const call = m && isCall(m) ? decodeCall(m.call) : null;
    if (call) this.callSteps(this.calls.contact(identity, call, this.linked().map((d) => d.id), !!(currentCall() || currentGroupCall())));
    if (!m) return;
    // What a call's or a group's signal says was read goes on as a receipt says it: the signal
    // itself goes as lib/linked-calls.ts says, or not at all.
    if (isSignal(m)) {
      const read = tagsOf(m.read);
      if (read.length > 0) void this.say({ k: 'in', c: identity, m: { text: '', read } }).catch(() => undefined);
      return;
    }
    // Their photo or file stays on the relay until each device took it, and this phone too.
    const offer = isObject(m.file) ? readOffer(m.file) : null;
    // A device they wrote it to as well counts it as it comes from them: passed on, it is quiet there.
    const mark = outMarkOf(relayMarkOf(m));
    const copied = mark ? this.copiedTo(m) : new Set<string>();
    void this.say({ k: 'in', c: identity, m: withoutPlace(m) }, undefined, offer ? [{ from: fromOf(offer), phone: true }] : [], (d) => (copied.has(d.id) ? undefined : mark)).catch(() => undefined);
  }

  // On the primary: the linked devices a contact's message (`m`) went to directly too, as their chat
  // writes to the endpoints of the list it holds: one it copies (lib/endpoints.ts isCopied), from a
  // chat that holds the list signed last (`dv`), to each device that list names as taking messages
  // (waysFor) and that reads where it says, as one that said what the keys contacts seal for it
  // with are drawn from does; one that did not reads none of it. Whether it went, only their chat knows: its outbox may
  // have had no room for that device, or the device's queue was gone.
  private copiedTo(m: Json): Set<string> {
    const list = this.chats.e2e.signedList();
    const body = list && m.dv === list.n && isCopied(m) ? bodyOf(list) : null;
    if (!list || !body) return new Set();
    const taking = new Set(waysFor(undefined, body.d, undefined).map((w) => w.id).filter((id) => list.real.includes(id)));
    return new Set(this.data.devices.filter((d) => d.linked && d.endpoint?.ek && taking.has(d.endpoint.id)).map((d) => d.id));
  }

  sealed(identity: string, plaintext: Uint8Array): void {
    // On a linked device, what it wrote to a contact itself: the phone and the other devices keep it
    // as their own, as what it writes through the phone.
    if (this.data.primary) {
      const m = parse(plaintext);
      if (m && !isSignal(m) && !m.due && (isKept(m) || isWorthTelling(m))) void this.tellOthers({ k: 'out', c: identity, m: withoutPlace(m) }, identity, m);
      return;
    }
    if (!this.data.devices.some((d) => d.linked)) return;
    const m = parse(plaintext);
    const call = m && isCall(m) ? decodeCall(m.call) : null;
    if (call) this.callSteps(this.calls.phone(identity, call));
    if (!m || isSignal(m)) return;
    if (isKept(m)) {
      // Told once the chat keeps it as sent: one that waits is sealed again when it goes.
      const part = isObject(m.voice) && typeof m.voice.part === 'number' ? m.voice.part : '';
      this.echoes.set(`${identity}|${m.tag as string}|${part}`, { c: identity, tag: m.tag as string, m: withoutPlace(m), at: Date.now() });
      this.watchEchoes();
    } else if (isWorthTelling(m)) {
      void this.say({ k: 'out', c: identity, m: withoutPlace(m) }).catch(() => undefined);
    }
  }

  deleted(identity: string, block: boolean): void {
    if (this.data.primary) this.deletions.set(identity, block ? 2 : 1);
  }

  changed(contacts: readonly Contact[]): void {
    const role = this.role();
    if (!role) return;
    const now = contacts.map(syncedOf);
    void this.run(async () => {
      if (this.data.primary) await this.tellChanges(now);
      else {
        await this.sendChanges(now);
        await this.tellWays(contacts);
      }
    })
      .then(() => this.flush())
      .catch(() => undefined);
  }

  // On a linked device, in the turn: says something to the phone and to each other device, with
  // the tags a message this device sealed for a contact erases (`m`), kept erased here.
  private tellOthers(envelope: Envelope, identity = '', m?: Json): Promise<void> {
    return this.run(async () => {
      const primary = this.data.primary;
      if (!primary) return;
      const sealed = await this.seal(primary, envelope);
      const siblings = await this.sealSiblings(envelope);
      const erased = m ? this.erasedBy(identity, m) : this.data.erased;
      await this.save({ ...this.data, primary: sealed, siblings, erased });
    })
      .then(() => this.flush())
      .catch(() => undefined);
  }

  // On the primary: what a device said of a contact that its others hear from it directly, to the
  // linked devices that do not: one from before, or one the list does not name. What came of what
  // it wrote to them itself goes also to those from before contacts wrote to endpoints, which do
  // not know it as said directly, as what came from them.
  private passOn(from: Peer, envelope: Envelope): void {
    const knows = (d: Peer) => envelope.k !== 'in' || !!d.endpoint?.ek;
    const direct = new Set([from.id, ...this.othersOf(from).filter(knows).map((d) => d.id)]);
    for (const d of this.linked()) if (!direct.has(d.id)) void this.say(envelope, d.id).catch(() => undefined);
  }

  // What a contact's endpoint said came of what one of this account's devices wrote to it itself:
  // marked here as there.
  private async cameHere(c: string, got: string[]): Promise<void> {
    if (!this.chats.e2e.record(c)) return;
    if ((await this.chats.history.mark(peerOf(c), true, 1, Date.now(), got)).length > 0) announce();
  }

  // On the primary, in the turn: what it knows of the devices of each contact's account (`way`,
  // lib/link-wire.ts), to each linked device that takes contacts' conversations, as it changes and
  // what that device was not told yet (Peer.ways), so a device writes to their endpoints, and to
  // them itself, with the phone off. Never so much at once that it fills more than half of a
  // device's outbox: the rest goes once it drained (tick), and nothing else waits for it.
  private async tellWays(contacts: readonly Contact[] = this.contactsKept()): Promise<void> {
    const relay = this.at?.relay ?? '';
    const said = new Map<string, { way: ReturnType<typeof wayOf>; short: string }>();
    for (const c of contacts) {
      const way = wayOf(c, relay);
      said.set(c.identity, { way, short: way ? wayDigest(way) : '' });
    }
    this.waysLeft = false;
    let changed = false;
    const devices: Peer[] = [];
    for (const d of this.data.devices) {
      if (!d.linked || !d.endpoint?.ek) {
        devices.push(d);
        continue;
      }
      let told = d;
      const ways: Record<string, string> = {};
      for (const [c, short] of Object.entries(d.ways ?? {})) if (said.has(c)) ways[c] = short;
      for (const [c, { way, short }] of said) {
        if ((ways[c] ?? '') === short) continue;
        if (told.outbox.length >= MAX_OUTBOX / 2) {
          this.waysLeft = true;
          break;
        }
        told = await this.seal(told, { k: 'way', c, ...(way ?? {}) });
        if (short) ways[c] = short;
        else delete ways[c];
      }
      const same = JSON.stringify(ways) === JSON.stringify(d.ways ?? {});
      if (told === d && same) devices.push(d);
      else {
        changed = true;
        const { ways: _ways, ...rest } = told;
        devices.push(Object.keys(ways).length > 0 ? { ...rest, ways } : rest);
      }
    }
    if (changed) await this.save({ ...this.data, devices });
  }

  // On the primary: the chat's contacts as it keeps them.
  private contactsKept(): Contact[] {
    const { e2e } = this.chats;
    return e2e.contacts().flatMap((c) => e2e.record(c.identity) ?? []);
  }

  // On a linked device: each change to a contact goes to the phone, field by field, and to the
  // account's other devices, with when it was made (lib/siblings.ts).
  private async tellChanges(now: Synced[]): Promise<void> {
    const { siblings } = this.data;
    let primary = this.data.primary!;
    let list = siblings?.list ?? [];
    const synced = { ...this.data.synced };
    let removed = this.data.removed ?? {};
    let changes = false;
    const time = Date.now();
    const tell = async (envelope: Envelope) => {
      primary = await this.seal(primary, envelope);
      const told: Sibling[] = [];
      for (const s of list) told.push(await this.sealSibling(s, envelope));
      list = told;
    };
    for (const s of now) {
      const before = synced[s.identity];
      const change = changedFields(before ?? { ...s, ...blankSynced(s.identity) }, s);
      if (Object.keys(change).length === 0) continue;
      // One not kept before was added here, on purpose: it comes back if removed before.
      const at = stampOf(before, change, time);
      await tell({ k: 'set', c: s.identity, change, when: at, ...(before ? {} : { added: true as const }) });
      synced[s.identity] = stamped({ ...(before ?? {}), ...s }, change, at, !before);
      if (!before) {
        const { [s.identity]: _removed, ...rest } = removed;
        removed = rest;
      }
      changes = true;
    }
    for (const id of Object.keys(synced)) {
      if (now.some((s) => s.identity === id)) continue;
      const at = removedAtOf(synced[id], time);
      // Deleted or blocked, not only taken out of the address book: the phone does it too.
      const del = this.deletions.get(id);
      this.deletions.delete(id);
      await tell({ k: 'set', c: id, change: {}, remove: true, when: at, ...(del ? { del } : {}) });
      removed = withRemoved(removed, id, at);
      delete synced[id];
      changes = true;
    }
    if (changes) await this.save({ ...this.data, primary, synced, ...removedOf(removed), ...(siblings ? { siblings: { ...siblings, list } } : {}) });
  }

  // On the primary: what changed of the contacts goes to each linked device, with when each field
  // was set: by a device, as it said (setFor), or here, now.
  private async sendChanges(now: Synced[], except = ''): Promise<void> {
    const time = Date.now();
    const list: Synced[] = [];
    const synced: Record<string, Synced> = {};
    for (const s of now) {
      const before = this.data.synced[s.identity];
      const { at: times = {}, ...was } = before ?? s;
      if (before && JSON.stringify(was) === JSON.stringify(s)) {
        synced[s.identity] = before;
        continue;
      }
      const change = changedFields(before ?? blankSynced(s.identity), s);
      const given = this.stamps.get(s.identity);
      const at = { ...(before ? times : {}) };
      // One a device added is told as added, and set, then.
      const addedAt = !before && given?.added ? given.at : undefined;
      for (const field of TIMED) {
        if (before && !(field in change)) continue;
        const said = given && field in given.change && JSON.stringify(given.change[field] ?? null) === JSON.stringify(s[field] ?? null);
        at[field] = addedAt ?? (said ? given.at : Math.max(time, (at[field] ?? 0) + 1));
      }
      if (!before) at.added = addedAt ?? time;
      synced[s.identity] = { ...s, at };
      list.push(synced[s.identity]);
    }
    const gone = Object.keys(this.data.synced).filter((id) => !now.some((s) => s.identity === id));
    if (list.length === 0 && gone.length === 0) return;
    const devices: Peer[] = [];
    for (const d of this.data.devices) devices.push(d.linked && d.id !== except ? await this.seal(d, { k: 'contacts', all: false, list, gone }) : d);
    await this.save({ ...this.data, devices, synced });
  }

  // On the primary: the contacts as each device is told them whole, with when each field was set.
  private contactsNow(): Synced[] {
    return this.chats.e2e.contacts().map((c) => {
      const s = syncedOf(this.chats.e2e.record(c.identity)!);
      return { ...s, at: this.data.synced[s.identity]?.at ?? {} };
    });
  }

  // On the primary, in the turn: a device said the codes match. It gets the contacts and the groups,
  // and the work after brings it the history chosen, up to now.
  private async ready(peer: Peer, name: string): Promise<void> {
    const now = Date.now();
    await this.sendChanges(
      this.chats.e2e.contacts().map((c) => syncedOf(this.chats.e2e.record(c.identity)!)),
      peer.id,
    );
    const link = this.ownLink();
    const linked = await this.groupsTo(
      await this.seal(
        { ...peer, linked: true, heard: now, name: cleanDeviceName(name) || peer.name, history: peer.history && { ...peer.history, upTo: now } },
        { k: 'contacts', all: true, list: this.contactsNow(), gone: [], link },
      ),
    );
    await this.save({ ...this.data, devices: this.data.devices.map((d) => (d.id === peer.id ? linked : d)), link });
    // The contacts go now, with no history to wait for.
    void this.flush().catch(() => undefined);
    this.act(() => this.bringHistory(peer.id));
    announce();
  }

  // ---- Linking ----

  /**
   * On the device to link: makes its link key, a secret and the code to show (lib/link-code.ts),
   * named `name`. Only a space with no chats of its own links, or a linked device's copy: its chats
   * become the phone's.
   */
  makeOffer(name: string): Promise<string> {
    return this.run(async () => {
      if (this.role() !== null) throw new Error(t('This space is linked already.'));
      const chats = this.chats.e2e.contacts().length > 0 || (this.groups?.groups.all().length ?? 0) > 0;
      if (chats && !this.copied()) throw new Error(t('This space has chats of its own. Link from a space with none, such as one that opens with a new password.'));
      const here = await this.here();
      if (!here) throw new Error(t('Type the relay address first.'));
      const account = await core.newAccount();
      const secret = toHex(randomBytes(16));
      await this.save({ ...this.data, offer: { account: toBase64(account), secret, name: cleanDeviceName(name), made: Date.now() }, answer: null });
      return this.offerLink(here);
    });
  }

  /** On the device to link: the code it shows, while it is good. */
  async shownOffer(): Promise<string | null> {
    const offer = this.data.offer;
    if (!offer || Date.now() - offer.made > OFFER_LASTS) return null;
    const here = await this.here();
    return here ? this.offerLink(here) : null;
  }

  private async offerLink(here: Here): Promise<string> {
    const offer = this.data.offer!;
    const bundle = await core.accountBundle(fromBase64(offer.account));
    const { sender, relay, relayKey: rk } = here.place;
    return linkCodeLink({ key: toBase64Url(bundle), senderHex: sender, relayUrl: relay, relayKey: rk || undefined, secret: offer.secret, name: offer.name });
  }

  /**
   * On the device to link: the codes match. From now on its chats are the phone's. A linked device's
   * copy keeps those of its chats the phone has once it says them, and lets go of the others.
   */
  confirm(code: string): Promise<void> {
    return this.run(async () => {
      const answer = this.data.answer;
      if (!answer || answer.code !== code) throw new Error(t('The code changed. Compare it again.'));
      await this.here().catch(() => null);
      const { e2e } = this.chats;
      const synced = this.copied() ? Object.fromEntries(e2e.contacts().map((c) => [c.identity, syncedOf(e2e.record(c.identity)!)])) : {};
      const primary = await this.seal({ ...answer.peer, since: Date.now() }, { k: 'ready', name: this.data.offer?.name ?? '' });
      await this.save({ ...withoutSiblings(this.data), primary, account: answer.account, offer: null, answer: null, synced, packs: [], copySaid: false, removed: undefined, erased: undefined });
    }).then(async () => {
      announce();
      // Its own endpoint, a new one, said after the codes matched: a phone from before leaves it alone.
      await this.newEndpoint(true).catch(() => undefined);
      return this.flush().catch(() => undefined);
    });
  }

  /** On the device to link: the codes do not match. The code shown goes, and a new one has to be made. */
  refuse(): Promise<void> {
    return this.run(async () => {
      await this.save({ ...this.data, offer: null, answer: null });
    });
  }

  /** On the primary: reads a device's code and gives its name and the code to compare, before anything goes. */
  async prepare(text: string): Promise<{ name: string; code: string }> {
    const code = parseLinkCode(text);
    if (!code) throw new Error(t('That is not a code from Linked devices.'));
    if (this.data.primary) throw new Error(t('This is a linked device. Link from the phone that holds the account.'));
    if (this.data.devices.filter((d) => d.linked).length >= MAX_DEVICES) throw new Error(t('{n} devices are linked already, the most there can be.', { n: MAX_DEVICES }));
    if (!(await this.here())) throw new Error(t('Type the relay address in Relay first: linked devices reach this phone through it.'));
    let device: Uint8Array;
    const bundle = fromBase64Url(code.key);
    try {
      device = await core.bundleIdentity(bundle);
    } catch {
      throw new Error(t('That is not a code from Linked devices.'));
    }
    if (this.data.devices.some((d) => d.id === toHex(device) && d.linked)) throw new Error(t('That device is linked already.'));
    const account = await core.newAccount();
    const safety = linkSafetyCode(await core.safetyNumber(await core.accountIdentity(account), device));
    this.pending = { code, bundle, account, device: toHex(device), safety };
    return { name: code.name, code: safety };
  }

  /** On the primary: links the device prepared, named `phone` there, and brings it the history chosen once it says the codes match. */
  async link(history: HistoryChoice, phone: string): Promise<void> {
    const pending = this.pending;
    if (!pending) throw new Error(t('That is not a code from Linked devices.'));
    this.pending = null;
    const here = await this.here();
    if (!here) throw new Error(t('Type the relay address in Relay first: linked devices reach this phone through it.'));
    const now = Date.now();
    const key = newPacketKey();
    const hello = encodeOne({ k: 'hello', secret: pending.code.secret, name: cleanDeviceName(phone), account: this.chats.e2e.identityHex() }, here.place, key)!;
    const started = await core.startConversation(pending.account, pending.bundle, hello);
    const { senderHex, relayUrl, relayKey: rk, name } = pending.code;
    const peer: Peer = {
      id: pending.device,
      name: name || t('Computer'),
      conversation: toBase64(started.conversation),
      at: { sender: senderHex, relay: relayUrl, relayKey: rk ?? '', spare: null },
      since: now,
      heard: 0,
      linked: false,
      outbox: [toBase64(started.packet)],
      told: JSON.stringify(here.place),
      // With none chosen, what comes while the codes are compared.
      history: { since: history.since ?? now, files: history.files, upTo: now, done: 0 },
      files: history.files,
      behind: 0,
      groups: {},
      key,
    };
    await this.run(async () => {
      await this.save({ ...this.data, devices: [...this.data.devices.filter((d) => d.id !== peer.id), peer] });
    });
    announce();
    await this.flush().catch(() => undefined);
  }

  /** On the primary: brings a linked device a period of the history again; what it has already is not kept twice. */
  async bringAgain(id: string, history: HistoryChoice): Promise<void> {
    await this.run(async () => {
      const now = Date.now();
      const devices = this.data.devices.map((d) => (d.id === id && d.linked ? { ...d, history: { since: history.since ?? now, files: history.files, upTo: now, done: 0 } } : d));
      await this.save({ ...this.data, devices });
    });
    this.act(() => this.bringHistory(id));
  }

  /**
   * Unlinks a device (on the primary, by its id) or this one (on a linked device): nothing more goes
   * to it, nor is anything opened from it. It is told, if the relay takes it now. On a linked device
   * the account's chats go from here.
   */
  async unlink(id = ''): Promise<boolean> {
    const peer = this.data.primary ?? this.data.devices.find((d) => d.id === id);
    if (!peer) return true;
    let told = false;
    try {
      const here = await this.here();
      const bye = await this.run(async () => {
        const said = await this.seal({ ...peer, outbox: [] }, { k: 'bye' });
        await this.keepPeer({ ...said, outbox: peer.outbox });
        return said.outbox;
      });
      if (here) {
        const to = contactTarget(here.sends, peer.at);
        for (const packet of bye) await sendMessage(to, fromHex(peer.at.sender), fromBase64(packet), 'quiet');
        told = true;
      }
    } catch {
      // Not told: it gets nothing more all the same.
    }
    if (this.data.primary) await this.forget();
    else {
      await this.run(async () => {
        await this.save({ ...this.data, devices: this.data.devices.filter((d) => d.id !== peer.id) });
      });
      announce();
      // What was left on the relay only for it, and a call it has; the list no longer names it.
      this.act(() => this.letGo(peer.id, null));
      this.callSteps(this.calls.unlinked(peer.id));
      this.act(() => this.signAgain());
    }
    return told;
  }

  // On a linked device, unlinked: the account's chats go, contacts, messages and groups, and its
  // endpoint, with its conversations with the account's other devices. The link goes first, so the
  // contacts going is not said to the phone.
  private async forget(): Promise<void> {
    const { e2e } = this.chats;
    await this.run(async () => {
      await this.save({ ...withoutSiblings(this.data), primary: null, account: '', link: '', synced: {}, packs: [], offer: null, answer: null, members: {}, removed: undefined, erased: undefined });
    });
    await e2e.dropEndpoint().catch(() => undefined);
    const gone = e2e.contacts().map((c) => c.identity);
    for (const identity of gone) await e2e.removeContact(identity).catch(() => undefined);
    await this.groups?.groups.mirror(() => ({ groups: [], came: [] })).catch(() => undefined);
    await this.clearChats(gone);
  }

  private async clearChats(identities: string[]): Promise<void> {
    for (const identity of identities) await this.chats.history.clear(peerOf(identity)).catch(() => undefined);
    announce({ gone: identities.map((identity) => ({ peer: peerOf(identity) })) });
  }

  // ---- Endpoints and the device list (lib/device-list.ts) ----

  // As the space opens, in the work after. On a linked device: one linked before endpoints, or that
  // did not say its endpoint yet, makes one or says it. On the primary: the device list is signed
  // again if it does not name the linked devices as they are, and each is told it.
  private async listsAtOpen(): Promise<void> {
    if (!core.canSign()) return;
    if (this.data.primary) await this.newEndpoint(false);
    else await this.signAgain();
  }

  // On a linked device: makes its endpoint, a new one (`fresh`, as it is linked) or only if it has
  // none, or if it said the one it has without what contacts' keys for it are drawn from, as the version
  // before did: the phone listed that one as a place no device takes, contacts' ways to it were
  // started for that place, and a new one, which takes an old one's place in the list as linking
  // a device does, has them start anew with this device. Then it says it to the phone.
  private async newEndpoint(fresh: boolean): Promise<void> {
    if (!core.canSign() || !this.data.primary) return;
    const made = this.chats.e2e.endpoint();
    const said = this.data.primary.endpoint;
    if (fresh || !made || (said?.id === made.id && !said.ek)) {
      await this.chats.e2e.makeEndpoint();
      // The other devices met as the endpoint before are met again, once the phone lists this one.
      await this.run(async () => {
        if (this.data.siblings) await this.save(withoutSiblings(this.data));
      });
    }
    await this.tellEndpoint();
  }

  // On a linked device: says its endpoint to the phone, with what the key each contact seals for it
  // with is drawn from (lib/sealed-packet.ts entryKey), so it takes their conversations: once for each it made, or `again` when a list the phone signed
  // does not name it.
  private async tellEndpoint(again = false): Promise<void> {
    await this.run(async () => {
      const primary = this.data.primary;
      const made = this.chats.e2e.endpoint();
      const ek = this.chats.e2e.endpointKey();
      if (!primary || !made || !ek || (!again && primary.endpoint?.id === made.id && primary.endpoint.ek === ek)) return;
      const endpoint = { ...made, ek };
      const sealed = await this.seal(primary, { k: 'endpoint', bundle: endpoint.bundle, ek });
      await this.save({ ...this.data, primary: sealed.outbox.length > primary.outbox.length ? { ...sealed, endpoint } : sealed });
    });
    void this.flush().catch(() => undefined);
  }

  // On the primary, in the turn: a linked device said its endpoint, and, one that takes contacts'
  // conversations, what the key each seals for it with is drawn from (`ek`). One whose bundle holds and that is neither
  // the account nor another device's is kept with the device, which is told the list again and
  // what is known of each contact's devices; the work after signs one that names it.
  private async endpointFrom(id: string, bundle: string, ek: string | undefined): Promise<void> {
    const peer = this.data.devices.find((d) => d.id === id && d.linked);
    if (!peer) return;
    const endpoint = await core.bundleIdentity(fromBase64Url(bundle)).then(toHex, () => '');
    if (!endpoint || endpoint === this.chats.e2e.identityHex() || this.data.devices.some((d) => d.id !== id && d.endpoint?.id === endpoint)) return;
    const { ways: _ways, ...told } = peer;
    await this.keepPeer({ ...told, endpoint: { id: endpoint, bundle, ...(ek ? { ek } : {}) }, listed: 0 });
    this.act(() => this.signAgain());
    if (ek) this.act(() => this.run(() => this.tellWays()));
  }

  // On the primary, in the work after: signs the device list again when it does not name the linked
  // devices as they are, each by the endpoint it said: one said a new one, one was unlinked, or none
  // is linked on the phone a backup was put back on; when it does not say of each that it takes
  // messages, as one an Erevos before signed may not; when a backup was put back since it was
  // signed, as a device linked after the backup was made is named no more then; and, on a phone a
  // backup was put back on (lib/e2e.ts newestHeld), with none kept once a contact says they hold
  // one, and with one kept once a contact still holds a later one, as with this phone's clock
  // behind: that once more, above any a contact can say, so no contact makes it sign again. Then
  // each is told the list it was not told yet.
  private async signAgain(force = false): Promise<void> {
    if (this.data.primary || !core.canSign()) return;
    const { e2e } = this.chats;
    const held = e2e.signedList();
    if (force && !held) return;
    const devices = this.data.devices.flatMap((d) => (d.linked && d.endpoint ? [d.endpoint] : [])).slice(0, MAX_LISTED);
    const real = devices.map((d) => d.id).sort();
    const old = devices.filter((d) => !d.ek).map((d) => d.id);
    const after = e2e.newestHeld();
    const put = e2e.restoredSince() || after > (held?.n ?? 0);
    const behind = !!held && !e2e.restoredSince() && after > held.n;
    const differs = force || (held ? JSON.stringify([...held.real].sort()) !== JSON.stringify(real) || !flagsHold(held) || put : real.length > 0 || after > 0);
    if (differs) {
      const body = await nextList(e2e.identityHex(), devices.map(({ id, bundle }) => ({ id, bundle })), held, { after: behind ? e2e.heldAtMost() : after });
      const list = await signList((context, message) => e2e.sign(context, message), body);
      // The queues of the places the next list fills as the last did stay theirs, and so does a
      // device's that says no key for contacts, which reads as those do.
      const filling = (id: string) => (!real.includes(id) || old.includes(id)) && body.d.some((e) => e.i === id);
      const r = Object.fromEntries(Object.entries(held?.r ?? {}).filter(([id]) => filling(id)));
      const q = Object.fromEntries(Object.entries(held?.q ?? {}).filter(([id]) => filling(id)));
      // Contacts who hold a list that may name a device this one does not are given it before the
      // places in it each have a queue: all of them, put back from a backup, as one signed since it
      // was made may name any; otherwise those who hold the one before an unlinked device left.
      const cut = put ? body.n - 1 : held && held.real.some((id) => !real.includes(id)) ? held.n : held?.cut;
      await e2e.keepList({ b: list.b, s: list.s, n: body.n, real, ...(Object.keys(r).length > 0 ? { r } : {}), ...(Object.keys(q).length > 0 ? { q } : {}), ...(cut ? { cut } : {}) });
    }
    await this.routeList();
    await this.tellList();
  }

  // On the primary: where each endpoint of the device list as last signed reads, as contacts are
  // given it with the list, and the key kept for it, from which each contact is given a key of its
  // own to seal what they send it with for the relay (lib/e2e.ts routesFor): each device where it
  // said it reads, with the key it said, and each place that only fills the list, and a device that
  // said no key for contacts, which takes nothing from them, a queue made for it on this phone's
  // relay, which this phone empties now and then (drainFillers), with a random key of its own that
  // no one reads with. So contacts write to every place alike, sealed alike, each with keys no other
  // contact has, and the relay takes each, and nothing in the list says which is a device. A place's queue goes with this phone to
  // another relay, or to one whose key is known only now (one whose key it could not ask is taken
  // as the same); one that cannot be made now stays as it was, its key with it, and is made with a
  // later tick (routesLeft), as is one that never had one; until then contacts are given no list,
  // but those who may hold one naming a device it no longer names (lib/e2e.ts listFor).
  private async routeList(): Promise<void> {
    const { e2e } = this.chats;
    const list = e2e.signedList();
    const body = list && !this.data.primary && core.canSign() ? bodyOf(list) : null;
    if (!list || !body) return;
    const here = await this.here().catch(() => null);
    const r: Record<string, Route> = {};
    const q: Record<string, string> = {};
    for (const { i } of body.d) {
      const was = list.r?.[i];
      const device = list.real.includes(i) ? this.data.devices.find((d) => d.linked && d.endpoint?.id === i) : undefined;
      if (device?.endpoint?.ek) {
        r[i] = { s: device.at.sender, relay: device.at.relay, rk: device.at.relayKey, pk: device.endpoint.ek };
        continue;
      }
      if (list.real.includes(i) && !device) continue;
      // Where a device read as it said, with its key, is no place this phone made: it gets one of its own.
      const made = was?.pk && was.s !== device?.at.sender ? was : undefined;
      if (list.q?.[i] && made && (!here || (made.relay === here.place.relay && (!here.keyed || made.rk === here.place.relayKey)))) {
        r[i] = made;
        q[i] = list.q[i];
        continue;
      }
      const ids = here ? await createQueue(here.own).catch(() => null) : null;
      if (ids && here) {
        r[i] = { s: toHex(ids.senderId), relay: here.place.relay, rk: here.place.relayKey, pk: made?.pk ?? toBase64Url(randomBytes(32)) };
        q[i] = toHex(ids.recipientId);
      } else if (made) {
        r[i] = made;
        if (list.q?.[i]) q[i] = list.q[i];
      }
    }
    await e2e.keepRoutes(list.n, r, q);
  }

  // On the primary: whether an endpoint of the device list as last signed has no route yet, or a
  // place this phone made a queue for has none now, so routeList tries again.
  private routesLeft(list: OwnList): boolean {
    const keyed = (id: string) => this.data.devices.some((d) => d.linked && d.endpoint?.id === id && !!d.endpoint.ek);
    return (bodyOf(list)?.d ?? []).some(({ i }) => !list.r?.[i] || (!keyed(i) && !list.q?.[i]));
  }

  /**
   * On the primary: takes what came to the queues of the places that fill the device list, on this
   * phone's relay as it reaches it, and drops it, so they never fill and the relay keeps them, as it
   * keeps those their devices read. One the relay no longer has is made anew, as is one this phone
   * left behind on a relay it no longer uses, which it does not connect to, each with the key
   * contacts' keys for it are drawn from: they are told where it is with the list.
   */
  async drainFillers(): Promise<void> {
    const list = this.chats.e2e.signedList();
    if (!list || this.data.primary) return;
    const here = await this.here().catch(() => null);
    if (!here) return;
    const lost: string[] = [];
    let moved = (bodyOf(list)?.d ?? []).some((e) => !list.r?.[e.i]);
    for (const [id, recipient] of Object.entries(list.q ?? {})) {
      const route = list.r?.[id];
      if (!route || route.relay !== here.place.relay || (here.keyed && route.rk !== here.place.relayKey) || !route.pk) {
        moved = true;
        continue;
      }
      try {
        for (let n = 0; n < DRAIN_MOST && (await receiveMessage(here.own, fromHex(recipient))); n++);
      } catch (error) {
        if (isQueueNotFound(error)) lost.push(id);
      }
    }
    if (lost.length > 0) await this.chats.e2e.keepRoutes(list.n, list.r ?? {}, Object.fromEntries(Object.entries(list.q ?? {}).filter(([id]) => !lost.includes(id))));
    if (moved || lost.length > 0) await this.routeList();
    await this.drainOldFillers(here);
  }

  // The queues the places that fill the list read on before this phone's queue moved for a contact
  // deleted or blocked: emptied until each one's grace ends, then deleted. One on a relay this
  // phone no longer uses is let go, as one the relay no longer has.
  private async drainOldFillers(here: Here): Promise<void> {
    const was = this.chats.e2e.signedList()?.qWas ?? [];
    if (was.length === 0) return;
    const kept: OldFiller[] = [];
    for (const w of was) {
      if (!sameRelay(w.relay, here.place.relay)) continue;
      try {
        for (let n = 0; n < DRAIN_MOST && (await receiveMessage(here.own, fromHex(w.q))); n++);
        if (Date.now() < w.until) kept.push(w);
        else await deleteQueue(here.own, fromHex(w.q));
      } catch (error) {
        if (!isQueueNotFound(error)) kept.push(w);
      }
    }
    await this.chats.e2e.keepOldFillers(kept);
  }

  // Once the space's own queue moved (lib/queue-move.ts): the devices are told where this side
  // reads now at once, and on the primary, for a contact deleted or blocked, the rest moves too.
  private spaceMoved(why: MoveWhy): void {
    if (this.closed || !this.isOpenSpace()) return;
    if (why === 'due' && !this.data.primary) this.act(() => this.movedFor());
    void this.flush().catch(() => undefined);
  }

  // Whether this is the open space's: only its queues move.
  private isOpenSpace(): boolean {
    try {
      return currentSpace().space === this.space;
    } catch {
      return false;
    }
  }

  // On the primary, its own queue moved for a contact deleted or blocked: they may know every place
  // the device list says too. So the places that fill it get new queues (the old ones are emptied
  // until their grace ends, drainOldFillers), each linked device is asked to move its own (`move`),
  // and the list is signed anew, `n` + 1, so a contact who holds the one before is given it again
  // (lib/e2e.ts listFor), with each device's new place once it moved.
  private async movedFor(): Promise<void> {
    const { e2e } = this.chats;
    const list = e2e.signedList();
    const now = Date.now();
    if (list && core.canSign()) {
      const fillers = Object.entries(list.q ?? {});
      const old = fillers.flatMap(([id, q]) => {
        const relay = list.r?.[id]?.relay;
        return relay ? [{ q, relay, until: now + GRACE }] : [];
      });
      if (old.length > 0) await e2e.keepOldFillers([...(list.qWas ?? []), ...old]);
      const r = Object.fromEntries(Object.entries(list.r ?? {}).filter(([id]) => !list.q?.[id]));
      await e2e.keepRoutes(list.n, r, {});
      await this.routeList();
    }
    if (this.linked().length > 0) await this.say({ k: 'move' });
    await this.run(() => this.save({ ...this.data, moving: now + GRACE }));
    await this.resignSoon();
  }

  // On the primary: a new list is due after a move, signed now unless one was within the hour; then with a later tick.
  private async resignSoon(): Promise<void> {
    if (this.data.primary || !this.chats.e2e.signedList()) return;
    if (!this.data.resign) await this.run(() => this.save({ ...this.data, resign: Date.now() }));
    await this.resignDue();
  }

  private async resignDue(): Promise<void> {
    if (!this.data.resign || Date.now() - (this.data.resignedAt ?? 0) < RESIGN_EVERY) return;
    await this.signAgain(true);
    await this.run(async () => {
      const { resign: _resign, ...rest } = this.data;
      await this.save({ ...rest, resignedAt: Date.now() });
    });
  }

  // On the primary: each linked device not told the device list as last signed is told it, with the
  // account's bundle, whose key signed it, which of its endpoints are the devices', and where each
  // of the others reads, to reach them directly; told again when one of those reads elsewhere. A
  // device from before leaves it alone.
  private async tellList(): Promise<void> {
    const list = this.chats.e2e.signedList();
    if (!list || this.data.primary) return;
    const ak = toBase64Url(this.chats.e2e.bundle);
    const told = await this.run(async () => {
      const devices: Peer[] = [];
      for (const d of this.data.devices) {
        const routes = this.routesFor(d);
        const routed = JSON.stringify(routes);
        if (!d.linked || (d.listed === list.n && (!d.endpoint || d.routed === routed))) {
          devices.push(d);
          continue;
        }
        const sealed = await this.seal(d, { k: 'list', list: { b: list.b, s: list.s }, ak, real: list.real, ...(Object.keys(routes).length > 0 ? { routes } : {}) });
        devices.push(sealed.outbox.length > d.outbox.length ? { ...sealed, listed: list.n, ...(d.endpoint ? { routed } : {}) } : sealed);
      }
      if (devices.every((d, i) => d === this.data.devices[i])) return false;
      await this.save({ ...this.data, devices });
      return true;
    });
    if (told) void this.flush().catch(() => undefined);
  }

  // On the primary: where each of a device's others reads (othersOf), by its endpoint.
  private routesFor(peer: Peer): Record<string, Place> {
    return Object.fromEntries(this.othersOf(peer).map((d) => [d.endpoint!.id, d.at]));
  }

  // On a linked device, in the turn: the account's device list, from the phone. Kept once it holds:
  // the bundle it came with is the account's this device was linked to (whose identity came in
  // `hello`, in the link whose codes were compared), that bundle's key signed it, and it is later
  // than the one kept. The devices it names as the account's are this device's others from then
  // on, met at once (meetSiblings); one that does not name this device's endpoint, the phone may not
  // have had: it is said again. The same list again says where the others read now, and names them
  // to a device that kept it before devices met. Gives what the first packets tried again change of
  // the contacts.
  private async listFrom(said: Extract<Envelope, { k: 'list' }>): Promise<((contacts: Contact[]) => Contact[]) | null> {
    const { e2e } = this.chats;
    const account = this.data.account;
    if (!this.data.primary || !account) return null;
    const bundle = fromBase64Url(said.ak);
    if ((await core.bundleIdentity(bundle).then(toHex, () => '')) !== account) return null;
    const own = e2e.own();
    const kept = own?.identity === account ? own.list : null;
    const endpoint = e2e.endpoint();
    const held = endpoint && this.data.siblings?.of === endpoint.id ? this.data.siblings : null;
    const body = await verifyList(bundle, account, said.list, Math.max(kept?.n ?? 0, held?.n ?? 0));
    if (!body) return null;
    const routes = said.routes ?? {};
    let real = kept?.real ?? [];
    if (body !== 'same') {
      real = said.real ? said.real.filter((id) => body.d.some((e) => e.i === id)) : body.d.map((e) => e.i);
      const list = { b: said.list.b, s: said.list.s, n: body.n, real };
      this.act(async () => {
        await e2e.keepOwn({ identity: account, bundle: said.ak, list });
        if (endpoint && !real.includes(endpoint.id)) await this.tellEndpoint(true);
      });
    }
    if (!endpoint) return null;
    // The same list again: as kept, unless the one kept is not that one yet (keepOwn, in the work
    // after).
    const named = body !== 'same' ? body : kept && kept.n >= (held?.n ?? 0) ? bodyOf(kept) : null;
    if (named) return this.meetSiblings(siblingsFrom(held, endpoint.id, named.n, named.d, real, routes, newPacketKey));
    return held ? this.meetSiblings(withRoutes(held, routes)) : null;
  }

  // ---- The account's other devices, directly (lib/siblings.ts) ----

  private siblingList(): Sibling[] {
    return this.data.primary ? (this.data.siblings?.list ?? []) : [];
  }

  // On the primary: the other linked devices a device reaches directly: both are in the list as
  // last signed.
  private othersOf(peer: Peer): Peer[] {
    const real = this.chats.e2e.signedList()?.real ?? [];
    const listed = (d: Peer) => d.linked && !!d.endpoint && real.includes(d.endpoint.id);
    return listed(peer) ? this.data.devices.filter((d) => d.id !== peer.id && listed(d)) : [];
  }

  private async keepSibling(sibling: Sibling): Promise<void> {
    const siblings = this.data.siblings;
    if (siblings) await this.save({ ...this.data, siblings: { ...siblings, list: siblings.list.map((s) => (s.id === sibling.id ? sibling : s)) } });
  }

  // In the turn: the others as a list names them, each this device starts a conversation with
  // started, and the first packets that came before a list named their senders tried again.
  private async meetSiblings(siblings: Siblings): Promise<((contacts: Contact[]) => Contact[]) | null> {
    const own = this.chats.e2e.endpoint();
    const list: Sibling[] = [];
    for (const s of siblings.list) list.push(own && !s.conversation && starts(own.id, s.id) ? await this.startSibling(s) : s);
    const now = Date.now();
    const waiting = siblings.early.filter((e) => now - e.at < EARLY_LASTS);
    await this.save({ ...this.data, siblings: { ...siblings, list, early: waiting } });
    let contacts: ((c: Contact[]) => Contact[]) | null = null;
    for (const early of waiting) {
      const taken = await this.siblingFirst(fromBase64(early.packet), true);
      contacts = both(contacts, taken?.kind === 'taken' ? (taken.contacts ?? null) : null);
    }
    void this.flush().catch(() => undefined);
    return contacts;
  }

  // Starts the conversation with another device, as the one with the lower id does: its first
  // packet says where this one reads and the key it gives, then what waited for it goes. Started
  // again (`again`), the one before is kept to open what the other sealed there while away (`before`).
  private async startSibling(sibling: Sibling): Promise<Sibling> {
    const first = encodeOne({ k: 'here' }, this.at, sibling.key);
    const started = first && (await this.chats.e2e.startAsEndpoint(fromBase64Url(sibling.bundle), first).catch(() => null));
    if (!started) return sibling;
    const before = sibling.conversation ? [sibling.conversation, ...(sibling.before ?? [])].slice(0, MAX_BEFORE) : [];
    // As for a contact's endpoint (lib/e2e.ts): by how many it had before this one.
    const again = Date.now() + againAfter(sibling.conversation ? 1 + (sibling.before?.length ?? 0) : 0);
    let met: Sibling = { ...sibling, ...(before.length > 0 ? { before } : {}), conversation: toBase64(started.conversation), outbox: [toBase64(started.packet)], held: [], told: this.at ? JSON.stringify(this.at) : '', again };
    for (const json of sibling.held) met = await this.seal(met, JSON.parse(json) as Envelope);
    return met;
  }

  // Seals an envelope for another device, in the turn; held while it is to start the conversation.
  // One that has said nothing in the conversation this one started, a day after it went, may never
  // have had its first packet: it starts again, and so on until it answers, ever less often.
  private async sealSibling(sibling: Sibling, envelope: Envelope): Promise<Sibling> {
    const own = this.chats.e2e.endpoint();
    const again = !!own && starts(own.id, sibling.id) && !!sibling.conversation && sibling.outbox.length === 0 && sibling.again !== undefined && Date.now() >= sibling.again;
    if (again) {
      const started = await this.startSibling(sibling);
      if (started.conversation !== sibling.conversation) return this.seal(started, envelope);
    }
    if (sibling.conversation) return this.seal(sibling, envelope);
    if (own && starts(own.id, sibling.id)) {
      const started = await this.startSibling(sibling);
      if (started.conversation) return this.seal(started, envelope);
    }
    return { ...sibling, held: [...sibling.held, JSON.stringify(envelope)].slice(-MAX_HELD) };
  }

  // Seals an envelope for each other device, or those `only` names, in the turn.
  private async sealSiblings(envelope: Envelope, only?: string[]): Promise<Siblings | undefined> {
    const siblings = this.data.siblings;
    if (!siblings || !this.data.primary) return siblings;
    const list: Sibling[] = [];
    for (const s of siblings.list) list.push(only && !only.includes(s.id) ? s : await this.sealSibling(s, envelope));
    return { ...siblings, list };
  }

  // On a linked device, in the turn: a first packet that may be another device's, starting a
  // conversation with this one's endpoint. Taken only from a device the list last checked names,
  // one that should start it, and once; one from a device that list names but that was not met yet
  // (the phone said nothing of where it reads) is tried again with the next, a few for a while
  // (`retry`). One from anyone else is dropped, so none can push those out: a device a later list
  // names starts again a day or more later, as it heard nothing back. Null for one that is not for
  // this endpoint.
  private async siblingFirst(packet: Uint8Array, retry = false): Promise<Taken> {
    const { e2e } = this.chats;
    const own = e2e.endpoint();
    if (!this.data.primary || !own) return null;
    let opened: core.Opened;
    try {
      opened = await e2e.acceptAsEndpoint(packet);
    } catch {
      return null;
    }
    // A contact's, or one of their endpoints', is the chat's (lib/e2e.ts).
    const value = parse(opened.plaintext);
    if (value?.v !== 1 || !isText(value.k)) return null;
    const from = toHex(await core.conversationPeer(opened.conversation));
    const id = toHex(await core.firstMessageId(packet)).slice(0, 32);
    const early = toBase64(packet);
    const held = this.data.siblings?.of === own.id ? this.data.siblings : null;
    const siblings: Siblings = held ?? { of: own.id, n: 0, list: [], seen: [], early: [] };
    const rest = siblings.early.filter((e) => e.packet !== early);
    const sibling = siblings.list.find((s) => s.id === from);
    if (!sibling && !siblings.seen.includes(id)) {
      const named = e2e.own()?.list?.real.includes(from) === true;
      if (!retry && named) await this.save({ ...this.data, siblings: { ...siblings, early: withEarly(siblings.early, early, Date.now()) } });
      return { kind: 'taken' };
    }
    if (!sibling || siblings.seen.includes(id) || !starts(from, own.id)) {
      if (rest.length < siblings.early.length) await this.save({ ...this.data, siblings: { ...siblings, early: rest } });
      return { kind: 'taken' };
    }
    // What was sealed in the one before still goes: one that started again keeps that to open in
    // (`before`), and to one that lost it, it is nothing. What waited goes now.
    const { again: _again, before: _before, ...was } = sibling;
    let met: Sibling = { ...was, conversation: toBase64(opened.conversation), heard: Date.now(), held: [], told: '' };
    for (const json of sibling.held) met = await this.seal(met, JSON.parse(json) as Envelope);
    const list = siblings.list.map((s) => (s.id === from ? met : s));
    await this.save({ ...this.data, siblings: { ...siblings, list, seen: [...siblings.seen, id].slice(-MAX_SEEN), early: rest } });
    void this.flush().catch(() => undefined);
    const said = this.parts.take(from, opened.plaintext);
    return said ? this.fromSibling(met, said) : { kind: 'taken' };
  }

  // A packet that continues another device's conversation, in the turn, or null if it does not:
  // in the one this device writes in, or one it started before that one.
  private async openFromSibling(sibling: Sibling, packet: Uint8Array): Promise<Taken> {
    if (!sibling.conversation) return null;
    const kept = [sibling.conversation, ...(sibling.before ?? [])];
    let opened: core.Opened | null = null;
    let at = -1;
    while (!opened && ++at < kept.length) opened = await core.open(fromBase64(kept[at]), packet).catch(() => null);
    if (!opened) return null;
    const now = Date.now();
    const conversation = toBase64(opened.conversation);
    // It answered in the one this device writes in: it has the first packet, and none is started
    // again. In one before: it was away, and has the first packet of the last one still to read.
    const { again: _again, before: _before, ...answered } = sibling;
    const moved: Sibling = at === 0 ? { ...answered, conversation, heard: now } : { ...sibling, before: kept.slice(1).map((c, j) => (j === at - 1 ? conversation : c)), heard: now };
    await this.keepSibling(moved);
    const said = this.parts.take(sibling.id, opened.plaintext, now);
    return said ? this.fromSibling(moved, said) : { kind: 'taken' };
  }

  // What another device said directly, in the turn: where it reads and the key it gives; what it
  // sealed for a contact, kept here as this device's own, as from the phone; a change it made to a
  // contact. Nothing else is taken from it: what only the phone says comes from the phone.
  private async fromSibling(sibling: Sibling, said: Envelope & { at?: Place; pk?: string }): Promise<Taken> {
    let moved = sibling;
    if (said.at && JSON.stringify(said.at) !== JSON.stringify(sibling.at)) moved = { ...moved, at: said.at };
    if (said.pk && said.pk !== sibling.sealTo) moved = { ...moved, sealTo: said.pk };
    if (moved !== sibling) await this.keepSibling(moved);
    if (said.k === 'out') this.act(() => this.ownFrom(said.c, said.m, said.mark));
    else if (said.k === 'came') this.act(() => this.cameHere(said.c, said.got));
    else if (said.k === 'set') return this.setFrom(said);
    return { kind: 'taken' };
  }

  // In the turn: a change another device made to a contact, and when. Each field it set later than
  // the one kept here is taken, a request only accepted; a contact it removed goes, unless added
  // here again since, and stays removed for what comes of it later; one it added comes, unless
  // removed here since.
  private async setFrom(said: Extract<Envelope, { k: 'set' }>): Promise<Taken> {
    const { c, when: at } = said;
    const primary = this.data.primary;
    if (at === undefined || !primary) return { kind: 'taken' };
    const kept = this.data.synced[c];
    if (said.remove) {
      if (!goesFor(kept, at)) return { kind: 'taken' };
      const { [c]: _gone, ...synced } = this.data.synced;
      await this.save({ ...this.data, synced, removed: withRemoved(this.data.removed ?? {}, c, at) });
      if (kept) this.act(() => this.clearChats([c]));
      return { kind: 'taken', contacts: (contacts) => contacts.filter((x) => x.identity !== c) };
    }
    const next = changedBy(kept, c, said.change, at, said.added === true, this.data.removed?.[c] ?? 0);
    if (!next) return { kind: 'taken' };
    const { [c]: _removed, ...removed } = this.data.removed ?? {};
    await this.save({ ...this.data, synced: { ...this.data.synced, [c]: next }, ...removedOf(removed) });
    const account = this.data.account;
    return {
      kind: 'taken',
      contacts: (contacts) => {
        const i = contacts.findIndex((x) => x.identity === c);
        const mirror = mirrorOf(next, contacts[i], primary.at, account);
        return i < 0 ? [...contacts, mirror] : contacts.map((x, j) => (j === i ? mirror : x));
      },
    };
  }

  // Whether a chat's message (by its peer and tag) was erased on this device, or on another and said
  // here.
  private erasedHere(peer: string, tag: string): boolean {
    return this.data.erased?.[peer]?.includes(tag) ?? false;
  }

  // ---- Photos and files left on the relay (lib/attachments.ts, TakenFiles) ----

  leave(): boolean {
    // On the primary, whether a device is still to take it is known once the turn that told it ended (`taken`).
    return this.role() !== null;
  }

  taken(from: FileFrom, left: boolean): void {
    if (this.data.primary) {
      // The phone deletes it there, once each device took it.
      if (left) void this.say({ k: 'took', ids: [from.ids] }).catch(() => undefined);
      return;
    }
    void this.run(async () => {
      const kept = this.data.left.find((l) => l.ids === from.ids);
      const waits = left && !!kept && kept.devices.length > 0;
      if (kept) await this.save({ ...this.data, left: waits ? this.data.left.map((l) => (l === kept ? { ...l, phone: false } : l)) : this.data.left.filter((l) => l !== kept) });
      return left && !waits;
    })
      .then((drop) => {
        if (drop) this.act(() => this.drop(from));
      })
      .catch(() => undefined);
  }

  // On the primary: a device took the photos and files `ids`, or, with null, takes none any more,
  // unlinked. Those no one else is still to take are deleted from the relay.
  private async letGo(device: string, ids: string[] | null): Promise<void> {
    const done = await this.run(async () => {
      const gone: Left[] = [];
      const left: Left[] = [];
      for (const l of this.data.left) {
        if (!l.devices.includes(device) || (ids && !ids.includes(l.ids))) left.push(l);
        else if (l.devices.length === 1 && !l.phone) gone.push(l);
        else left.push({ ...l, devices: l.devices.filter((d) => d !== device) });
      }
      if (left.length !== this.data.left.length || left.some((l, i) => l !== this.data.left[i])) await this.save({ ...this.data, left });
      return gone;
    });
    for (const l of done) await this.drop(l);
  }

  private async drop(from: FileFrom): Promise<void> {
    const here = await this.here().catch(() => null);
    if (here) await dropFile(here.own, from).catch(() => undefined);
  }

  // ---- The relay ----

  // What waits for each peer goes to its queue, oldest first; what went leaves the outbox. Where
  // this side reads goes to those told otherwise, and a device that fell behind is caught up.
  flush(): Promise<void> {
    if (this.closed) return Promise.resolve();
    if (this.flushing) {
      this.again = true;
      return this.flushing;
    }
    const run = (async () => {
      do {
        this.again = false;
        const here = await this.here();
        if (!here) throw new Error(t('Type the relay address first.'));
        const told = JSON.stringify(here.place);
        if (this.linked().some((p) => p.told !== told)) {
          for (const p of this.linked()) if (p.told !== told) await this.say({ k: 'here' }, p.id);
        }
        const unsaid = this.siblingList().filter((s) => s.conversation && s.told !== told);
        if (unsaid.length > 0) {
          await this.run(async () => {
            const siblings = await this.sealSiblings({ k: 'here' }, unsaid.map((s) => s.id));
            await this.save({ ...this.data, siblings });
          });
        }
        if (!this.data.primary && this.data.link !== this.ownLink() && this.linked().length > 0) {
          const link = this.ownLink();
          await this.run(async () => {
            const devices: Peer[] = [];
            for (const d of this.data.devices) devices.push(d.linked ? await this.seal(d, { k: 'contacts', all: false, list: [], gone: [], link }) : d);
            await this.save({ ...this.data, devices, link });
          });
        }
        // One device the relay cannot reach holds none of the others back.
        let failed: unknown = null;
        for (const peer of [...(this.data.primary ? [this.data.primary] : []), ...this.data.devices]) {
          await this.flushPeer(here, peer.id).catch((error: unknown) => {
            failed ??= error;
          });
        }
        for (const sibling of this.siblingList()) {
          await this.flushSibling(here, sibling.id).catch((error: unknown) => {
            failed ??= error;
          });
        }
        await this.catchUp();
        if (failed) throw failed;
      } while (this.again);
    })();
    this.flushing = run;
    return run.then(
      () => {
        this.flushing = null;
        this.retries = 0;
      },
      (error: unknown) => {
        this.flushing = null;
        this.retryLater();
        throw error;
      },
    );
  }

  private retryLater() {
    if (this.closed || this.retryTimer) return;
    const wait = Math.min(RETRY_MOST, RETRY * 2 ** this.retries++);
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      this.flush().catch(() => undefined);
    }, wait);
  }

  private async flushPeer(here: Here, id: string): Promise<void> {
    const find = () => (this.data.primary?.id === id ? this.data.primary : this.data.devices.find((d) => d.id === id));
    const peer = find();
    if (!peer || peer.outbox.length === 0) return;
    await this.sendOut(here, peer.at, peer.outbox, async (sent) => {
      const now = find();
      if (now) await this.keepPeer(withoutSent(now, sent));
    }, peer.marks);
  }

  // What waits for another device, to where it reads once that is known.
  private async flushSibling(here: Here, id: string): Promise<void> {
    const find = () => this.siblingList().find((s) => s.id === id);
    const sibling = find();
    if (!sibling?.at || sibling.outbox.length === 0) return;
    await this.sendOut(here, sibling.at, sibling.outbox, async (sent) => {
      const now = find();
      const outbox = now?.outbox.filter((p) => !sent.has(p));
      if (now && outbox) await this.keepSibling({ ...now, outbox, behind: outbox.length > 0 ? now.behind : 0 });
    });
  }

  // Sends what waits in an outbox to the queue at `at`, oldest first, each quiet but as `marks`
  // says; `went` takes what went out of it, in the turn.
  private async sendOut(here: Here, at: Place, outbox: string[], went: (sent: Set<string>) => Promise<void>, marks?: Record<string, OutMark>): Promise<void> {
    const to = contactTarget(here.sends, at);
    const sent = new Set<string>();
    try {
      for (const packet of outbox) {
        const mark = marks?.[packet];
        await sendMessage(to, fromHex(at.sender), fromBase64(packet), mark === 'none' ? undefined : (mark ?? 'quiet'));
        sent.add(packet);
      }
    } finally {
      if (sent.size > 0) await this.run(() => went(sent));
    }
  }

  // A device the outbox had no room for, once it drained: the contacts again, and the history from when it fell behind.
  private async catchUp(): Promise<void> {
    for (const d of this.data.devices) {
      if (!d.linked || !d.behind || d.outbox.length > 0) continue;
      await this.run(async () => {
        const now = this.data.devices.find((p) => p.id === d.id);
        if (!now) return;
        const said = await this.groupsTo(await this.seal({ ...now, behind: 0 }, { k: 'contacts', all: true, list: this.contactsNow(), gone: [], link: this.ownLink() }), true);
        const history = { since: now.behind, files: now.files, upTo: Date.now(), done: 0 };
        await this.keepPeer({ ...said, history });
      });
      // The contacts go with this flush; what was done in the groups meanwhile, after the history.
      this.again = true;
      this.act(() => this.bringHistory(d.id));
      this.groupsChanged();
    }
  }

  // Looked at now and then while the space is open: what waits, the history still to bring, what a
  // device wrote that could not go yet, and a group's message that could not go to the devices yet.
  private tick(): void {
    if (this.closed) return;
    // The places that fill the device list, emptied now and then, whether or not a device is
    // linked, and made again where this phone reads now; one that has no queue yet, with each tick.
    // A list this phone put back from a backup holds no longer, once a contact says they hold a
    // later one.
    const signed = this.chats.e2e.signedList();
    if (!this.data.primary && signed && Date.now() - this.drainedAt >= DRAIN_EVERY) {
      this.drainedAt = Date.now();
      this.act(() => this.drainFillers());
    } else if (!this.data.primary && signed && this.routesLeft(signed)) this.act(() => this.routeList());
    if (!this.data.primary && core.canSign() && this.chats.e2e.newestHeld() > (signed?.n ?? 0)) this.act(() => this.signAgain());
    if (!this.data.primary && this.data.resign && Date.now() - (this.data.resignedAt ?? 0) >= RESIGN_EVERY) this.act(() => this.resignDue());
    if (this.waysLeft) this.act(() => this.run(() => this.tellWays()).then(() => this.flush()));
    // What the relay dropped by now.
    const old = Date.now() - LEFT_LASTS;
    if (this.data.left.some((l) => l.at < old)) {
      void this.run(async () => {
        await this.save({ ...this.data, left: this.data.left.filter((l) => l.at >= old) });
      }).catch(() => undefined);
    }
    if (!this.role()) return;
    this.flush().catch(() => undefined);
    if (this.data.primary && this.data.packs.length > 0) this.act(() => this.takePacks());
    for (const d of this.data.devices) if (d.linked && d.history) this.act(() => this.bringHistory(d.id));
    if (this.later.length > 0) this.act(() => this.sendLater());
    if (this.groupsLate) this.groupsChanged();
    // A device not told the device list as last signed, or where its others read, as one its outbox
    // had no room for.
    const list = !this.data.primary && core.canSign() ? this.chats.e2e.signedList() : null;
    const untold = (d: Peer) => d.listed !== list?.n || (!!d.endpoint && d.routed !== JSON.stringify(this.routesFor(d)));
    if (list && this.data.devices.some((d) => d.linked && untold(d))) this.act(() => this.tellList());
  }

  // Seals word for a contact as the chat does, and hands it to their phone nearby when it is, and
  // to the relay, saying what it carries (`mark`); then its copies for the endpoints of their
  // account go too, and, with `waits`, also once the relay could take it only later, as it is tried
  // again as it is (lib/e2e.ts copiesAfter).
  private async deliver(identity: string, sealed: { sender: string; relay: string; relayKey: string; spare: Contact['spare']; first: Uint8Array | null; packet: Uint8Array; copies: number }, here: Here, mark: RelayMark, waits = false) {
    const relay = sealed.sender ? () => sendSealed(here.sends, sealed, [sealed.packet], mark, () => this.chats.e2e.firstSent(identity)) : null;
    await this.chats.e2e.copiesAfter(sealed.copies, nearby.deliver(identity, sealed.first ? [sealed.first, sealed.packet] : [sealed.packet], relay), waits);
  }

  // ---- On the primary: what a device wrote ----

  // A message a device wrote to a contact: sealed for them as it came, and, one the chat keeps,
  // kept here as this phone's own (Waiting, if it could not go now). What it says was read here is
  // marked read here too, and what it deletes on both phones goes here as well. One for a contact
  // not added here yet, or that could not be handled now, is tried again a few times. A photo or
  // file the device's others were told of too (`shared`) is left where it put it, for them to take.
  private async sendFor(c: string, m: Json, tries = 0, shared = false): Promise<void> {
    try {
      if (await this.sendOne(c, m, shared)) return;
    } catch {
      // Tried again, below.
    }
    if (tries < LATER_TRIES) this.later = [...this.later, { c, m, tries: tries + 1, shared }].slice(-MAX_LATER);
  }

  // Says whether it is done with the message, or it should be tried again.
  private async sendOne(c: string, m: Json, shared: boolean): Promise<boolean> {
    const { e2e, history } = this.chats;
    const contact = e2e.record(c);
    if (isSignal(m)) return true;
    if (!contact) return false;
    const peer = peerOf(c);
    const now = Date.now();
    const kept = isKept(m);
    const gone: LinkedChange['gone'] = [];
    const read = tagsOf(m.read);
    if (read.length > 0) await history.mark(peer, false, 2, now, read);
    const erase = isObject(m.erase) ? m.erase : null;
    if (erase?.all === true) {
      await history.clear(peer);
      gone.push({ peer });
    } else if (erase && isTag(erase.tag)) {
      await history.remove(peer, erase.tag);
      gone.push({ peer, tag: erase.tag });
    }
    if (!kept && onlyCame(m, contact.timerAt)) {
      if (gone.length > 0 || read.length > 0) announce({ gone });
      return true;
    }
    const here = await this.here().catch(() => null);
    let said = m;
    let file: FileRef | null = null;
    if (kept && isObject(m.file)) {
      // Taken from the device's relay first, then put on this phone's, as the contact deletes theirs
      // once taken. Left where the device put it when its others may take it too: it expires there.
      const offer = readOffer(m.file);
      if (!offer) return true;
      if (!here) return false;
      file = await takeFile(here.own, offerRef(offer), undefined, shared);
      const upload = await uploadFile(here.own, file).catch(() => null);
      said = upload ? { ...m, file: upload } : m;
      if (!upload) {
        await this.keepAsSent(peer, m, file, null, WAITING);
        void sendWaiting(this.chats, this.sendPlace(here)).catch(() => undefined);
        announce();
        return true;
      }
    }
    const part = voiceOf(m.voice);
    // A voice message one of whose parts could not go is sent again whole once all came (below),
    // and counted then: its last part goes quiet now. Its parts come in turn, the last after those.
    const voiceKey = `${peer}|${m.tag as string}`;
    const says = part && this.voiceLate.has(voiceKey) ? 'quiet' : relayMarkOf(said);
    // Its copies go though the relay could take it for them only later when it goes again as it is,
    // with its tag: one kept, which waits, or one that says only what came or was read, held for the
    // next message (lib/e2e.ts copiesAfter). Not a reaction, pin, vote or delete, tried again a few
    // times below, as their copies would go with each try.
    const waits = kept || !Object.keys(m).some((key) => !QUIET.has(key));
    let went = false;
    if (here) {
      try {
        await this.deliver(c, await e2e.sealAs(c, utf8Encode(JSON.stringify(said)), here.place.sender, here.where), here, says, waits);
        went = true;
      } catch {
        // It waits, below.
      }
    }
    if (!kept) {
      // What was read goes with the next message to them; what else it says is tried again. Its
      // reaction, pin or vote is this phone's own once it went.
      if (!went && read.length > 0) await e2e.hold(c, 'read', read);
      if (went) await this.marksAsOwn(peer, m, now);
      announce({ gone });
      return went || !Object.keys(m).some((key) => !QUIET.has(key));
    }
    let mark: Mark = went ? 0 : WAITING;
    let voice: VoiceRef | null = null;
    if (part) {
      // A voice message is kept once all its parts came; it waits if any could not go.
      if (!went) this.voiceLate.add(voiceKey);
      const whole = this.voiceParts.add(`send ${peer}`, part, now);
      if (!whole) return true;
      mark = this.voiceLate.delete(voiceKey) ? WAITING : 0;
      voice = await saveClip(whole.audio, whole.ms);
    }
    await this.keepAsSent(peer, m, file, voice, mark);
    if (mark === WAITING) void sendWaiting(this.chats, this.sendPlace(here)).catch(() => undefined);
    announce();
    return true;
  }

  // Keeps in the history a message a device wrote, as this phone's own, once.
  private async keepAsSent(peer: string, m: Json, file: FileRef | null, voice: VoiceRef | null, mark: Mark): Promise<void> {
    const { e2e, history } = this.chats;
    const tag = m.tag as string;
    if (history.messages().some((x) => x.peer === peer && x.tag === tag)) return;
    const lasts = typeof m.lasts === 'number' && m.lasts > 0 ? m.lasts : 0;
    // One that went lasts the chat's time if it has none of its own; one that waits is given it as it goes.
    const timer = e2e.record(peer.slice(CONTACT_PREFIX.length))?.timer ?? 0;
    await history.add({
      peer,
      text: isText(m.text) ? m.text : '',
      mine: true,
      at: Date.now(),
      tag,
      lasts: mark === WAITING ? lasts : lasts || timer,
      mark,
      ...(voice ? { voice } : {}),
      ...(file ? { file } : {}),
      ...(mark === WAITING && m.quiet === true ? { quiet: true } : {}),
    });
  }

  // What a device wrote that could not go to the contact, tried again.
  private async sendLater(): Promise<void> {
    const waiting = this.later;
    this.later = [];
    for (const item of waiting) await this.sendFor(item.c, item.m, item.tries, item.shared);
  }

  // A contact a device added from their link: this phone adds them and starts the conversation.
  // One that cannot be added leaves the devices again.
  // The devices are told it was added when the device added it (`when`), so a removal on another
  // device after that, and before it came here, still removes it.
  private async addFor(code: ContactCode, when?: number): Promise<void> {
    const { e2e } = this.chats;
    const here = await this.here().catch(() => null);
    const added = await core.bundleIdentity(fromBase64Url(code.key)).then(toHex, () => '');
    if (added && when !== undefined && !e2e.record(added)) this.stamps.set(added, { at: when, change: {}, added: true });
    let identity: string;
    try {
      identity = (await e2e.addContact(code, here?.place.sender ?? '', here?.where ?? { relay: '', relayKey: '' })).identity;
    } catch {
      if (added && !e2e.record(added)) await this.say({ k: 'contacts', all: false, list: [], gone: [added] });
      return;
    } finally {
      if (added && when !== undefined) await this.run(async () => this.stamps.delete(added));
    }
    // The conversation's first packet; one the relay does not take now goes with the next look (lib/receiver.ts).
    const first = e2e.pending().find((p) => p.identity === identity);
    if (first && here) {
      try {
        await sendMessage(contactTarget(here.sends, first), fromHex(first.sender), first.first, 'quiet');
        await e2e.firstSent(identity);
      } catch {
        // Sent later.
      }
    }
    announce();
    // What the device wrote to them meanwhile.
    if (this.later.length > 0) await this.sendLater();
  }

  // A change a device made to a contact, made here too: the timer only when set later than this
  // phone's, a request only accepted. A timer set later is told to the contact, as the chat does. A
  // device that says when it made the change (`when`) has each field changed only if set later than
  // the one kept, and a contact removed only if not added again since; the devices are told the
  // change with that time.
  private async setFor(c: string, said: Change, remove: boolean, at?: number, del?: Deleted): Promise<void> {
    const { e2e, history } = this.chats;
    const contact = e2e.record(c);
    if (!contact) return;
    const kept = this.data.synced[c];
    if (remove) {
      if (at !== undefined && !goesFor(kept, at)) return;
      // One a device deleted or blocked: this phone's queues move for it, as for one deleted here.
      if (del) await e2e.deleteContact(c, { block: del === 2 });
      else await e2e.removeContact(c);
      await history.clear(peerOf(c));
      announce({ gone: [{ peer: peerOf(c) }] });
      return;
    }
    if (at === undefined) return this.makeChange(c, contact, said);
    const change = Object.fromEntries(Object.entries(said).filter(([field]) => !isTimed(field) || at > (kept?.at?.[field] ?? 0))) as Change;
    this.stamps.set(c, { at, change });
    try {
      await this.makeChange(c, contact, change);
    } finally {
      // The devices were told it by then: in the turn after the chat kept it (sendChanges).
      await this.run(async () => this.stamps.delete(c));
    }
  }

  // Makes a change a device made to a contact here, field by field.
  private async makeChange(c: string, contact: Contact, change: Change): Promise<void> {
    const { e2e } = this.chats;
    if (change.name !== undefined && change.name !== contact.name) await e2e.rename(c, change.name);
    if (change.look !== undefined && JSON.stringify(change.look) !== JSON.stringify(contact.look)) await e2e.setLook(c, change.look);
    if (change.avatar !== undefined && change.avatar?.kind !== 'photo' && JSON.stringify(change.avatar) !== JSON.stringify(contact.avatar)) await e2e.setAvatar(c, change.avatar);
    if (change.hide !== undefined && change.hide !== contact.hide) await e2e.setHidden(c, change.hide);
    if (change.request === false && contact.request) await e2e.acceptRequest(c);
    if (change.timer !== undefined && change.timerAt !== undefined && change.timerAt > contact.timerAt) {
      await e2e.setTimer(c, change.timer);
      const here = await this.here().catch(() => null);
      if (here) await this.deliver(c, await e2e.seal(c, '', here.place.sender, { at: here.where }), here, 'quiet').catch(() => undefined);
    }
    announce();
  }

  /**
   * On the primary: one of a chat's messages starred or deleted on this phone only, or all of them
   * deleted here, which the contact is not told of: its linked devices do the same.
   */
  changedHere(change: ChatChange): void {
    if (this.data.primary || !this.data.devices.some((d) => d.linked) || !this.chats.e2e.record(change.c)) return;
    void this.say({ k: 'changed', chats: [change], groups: [], whole: [] }).catch(() => undefined);
  }

  // ---- Calls (lib/linked-calls.ts) ----

  /** On the primary: whether a linked device, or the phone, has a call it took or made through here, but the one `id` names. */
  inCall(id?: string): boolean {
    return this.calls.busy(Date.now(), id);
  }

  // On the primary: a call signal a device wrote to a contact (`m`, as it came).
  private callFor(device: string, c: string, m: Json): void {
    const signal = decodeCall(m.call);
    if (!signal || !this.chats.e2e.record(c)) return;
    this.callSteps(this.calls.device(device, c, signal, !!(currentCall() || currentGroupCall())), m);
  }

  // Does what lib/linked-calls.ts said: `m` is the device's message a step to the contact sends on.
  private callSteps(steps: CallStep[], m?: Json): void {
    for (const step of steps) {
      if (step.to === 'phone') this.endElsewhere(step.id, step.declined);
      else if (step.to === 'done') {
        for (const id of step.ids) void this.say({ k: 'call', id: step.id, done: step.declined ? 'declined' : 'answered' }, id).catch(() => undefined);
      } else if (step.to === 'devices') {
        // An offer rings there.
        for (const id of step.ids) void this.say({ k: 'in', c: step.c, m: { text: '', call: step.signal } }, id, [], outMarkOf(markOf('', step.signal))).catch(() => undefined);
      } else {
        const said = m ?? { text: '', call: step.signal };
        this.ring(() => this.callTo(step.c, said));
      }
    }
  }

  // Seals a device's call signal for the contact, as it came, from the account.
  private async callTo(c: string, m: Json): Promise<void> {
    const here = await this.here().catch(() => null);
    if (!here) return;
    await this.deliver(c, await this.chats.e2e.sealAs(c, utf8Encode(JSON.stringify(m)), here.place.sender, here.where), here, relayMarkOf(m));
  }

  // A call answered or turned down on another device: it stops ringing here, now or as soon as it rings.
  private endElsewhere(id: string, declined: boolean): void {
    const now = Date.now();
    for (const [old, { at }] of this.endedThere) if (now - at > ENDED_LASTS) this.endedThere.delete(old);
    const call = currentCall();
    if (call?.id === id) call.endedElsewhere(declined);
    else this.endedThere.set(id, { declined, at: now });
  }

  private callChanged(): void {
    const call = currentCall();
    const there = call && this.endedThere.get(call.id);
    if (!call || !there) return;
    this.endedThere.delete(call.id);
    // After the screens heard it ring, so they hear it stop too.
    setTimeout(() => call.endedElsewhere(there.declined), 0);
  }

  // ---- Groups (lib/groups.ts) ----

  /**
   * The space's groups: on the primary, those `shared` says (not public groups) are told to the
   * devices as they change; on a linked device, they are the phone's.
   */
  useGroups(groups: Groups, transport: GroupTransport, shared: (id: string) => boolean = () => true): void {
    this.stopGroups?.();
    this.groups = { groups, transport, shared };
    groups.useLink({
      through: () => this.data.primary !== null,
      ask: async (id, ask) => {
        await this.say({ k: 'group', id, ask });
      },
      members: (id) => this.seatsOf(id),
      took: (from) => this.tookAll([from.ids]),
    });
    // What was done to their messages as the space opens: what the devices were told, unless the
    // space closed before they were told of a change (their marks then differ, and they are told whole).
    this.marked.clear();
    for (const group of groups.all()) if (shared(group.id)) this.marked.set(group.id, this.marksNow(group));
    this.stopGroups = groups.onChange(() => this.groupsChanged());
  }

  private marksNow(group: Group): { marks: Map<string, GroupMarked>; digest: string } {
    const marks = groupMarks(group.messages);
    return { marks, digest: marksDigest(marks) };
  }

  // The groups the devices are told of, as they are now, with their members.
  private async groupMirrors(): Promise<{ group: Group; mirror: GroupMirror; mark: string }[]> {
    const shared = this.groups;
    if (!shared) return [];
    const out: { group: Group; mirror: GroupMirror; mark: string }[] = [];
    for (const group of shared.groups.all()) {
      if (!shared.shared(group.id)) continue;
      const mirror = groupMirror(group, await shared.groups.members(group.id).catch(() => [] as GroupMember[]));
      out.push({ group, mirror, mark: mirrorMark(mirror) });
    }
    return out;
  }

  // In the turn, on the primary, for a device linked or caught up: every group as it is now, all
  // there are, and those it had that went. Their messages up to now go with the history, with what
  // was done to them, and those after as they come. A device just linked has none of them yet, so
  // what changes in them from now on is all it is to be told; one caught up (`caught`) may have
  // missed changes, and is told the groups' marks whole next.
  private async groupsTo(peer: Peer, caught = false): Promise<Peer> {
    const now = await this.groupMirrors();
    const gone = Object.keys(peer.groups).filter((id) => !now.some((g) => g.group.id === id));
    let sealed = peer;
    for (const envelope of groupEnvelopes(
      now.map((g) => g.mirror),
      gone,
      [],
      true,
    ))
      sealed = await this.seal(sealed, envelope);
    const told = ({ group, mark }: { group: Group; mark: string }): Peer['groups'][string] => {
      const marked = this.marked.get(group.id) ?? this.marksNow(group);
      this.marked.set(group.id, marked);
      return { meta: mark, last: lastKey(group), at: group.messages[group.messages.length - 1]?.at ?? 0, marks: caught ? '' : marked.digest };
    };
    return { ...sealed, groups: Object.fromEntries(now.map((g) => [g.group.id, told(g)])) };
  }

  // On the primary: a group changed. The devices are told, once for changes close together.
  private groupsChanged(): void {
    if (this.telling || this.closed || this.data.primary || !this.data.devices.some((d) => d.linked)) return;
    this.telling = true;
    this.act(async () => {
      this.telling = false;
      await this.tellGroups();
    });
  }

  // On the primary: each linked device is told what changed in the groups since it was last told: a
  // group as it is now once that changed, the messages after the last it was told of, what was done
  // since to those it was told of, and the groups gone. A photo or file this phone keeps goes as a
  // copy put on the relay for the devices, deleted there once they took it.
  private async tellGroups(): Promise<void> {
    if (!this.groups || this.data.primary) return;
    this.groupsLate = false;
    const now = await this.groupMirrors();
    const here = await this.here().catch(() => null);
    const copies = new Map<string, FileOffer | null>();
    const kept = new Set<string>();
    const marked = new Map(now.map(({ group }) => [group.id, this.marksNow(group)]));
    for (const d of this.data.devices) {
      if (!d.linked || d.behind) continue;
      const told = d.groups;
      const list: GroupMirror[] = [];
      const entries: GroupEntry[] = [];
      const changes: GroupChange[] = [];
      const whole: WholeGroup[] = [];
      const files: Leaving[] = [];
      const next: Peer['groups'] = {};
      for (const { group, mirror, mark } of now) {
        const was = told[group.id];
        if (was?.meta !== mark) list.push(mirror);
        let last = was?.last ?? '';
        let at = was?.at ?? 0;
        for (const m of messagesAfter(group.messages, last, at)) {
          const entry = await this.groupEntryOf(group.id, m, true, here, files, copies);
          // One whose photo or file cannot go now waits, with those after it, for the next look.
          if (!entry && m.file) {
            this.groupsLate = true;
            break;
          }
          if (entry) entries.push(entry);
          last = groupMessageKey(m);
          at = m.at;
        }
        // What was done since to the messages it was told of: what changed, from what it was told
        // last; or, not knowing what it has, all of it.
        const is = marked.get(group.id)!;
        if (was && was.marks !== is.digest) {
          const before = this.marked.get(group.id);
          if (before && was.marks === before.digest) changes.push(...marksChanged(group.id, before.marks, is.marks));
          else {
            const all = wholeMarks(group.id, is.marks);
            changes.push(...all.changes);
            whole.push(all.whole);
          }
        }
        next[group.id] = { meta: mark, last, at, marks: is.digest };
      }
      const gone = Object.keys(told).filter((id) => !now.some((g) => g.group.id === id));
      const groups = list.length > 0 || entries.length > 0 || gone.length > 0;
      const changed = changes.length > 0 || whole.length > 0;
      if (!groups && !changed && JSON.stringify(next) === JSON.stringify(told)) continue;
      await this.run(async () => {
        const peer = this.data.devices.find((p) => p.id === d.id);
        // Told otherwise meanwhile, as when caught up: the next change tells it.
        if (!peer?.linked || peer.behind || JSON.stringify(peer.groups) !== JSON.stringify(told)) return;
        let sealed = peer;
        const envelopes = [...(groups ? groupEnvelopes(list, gone, entries) : []), ...(changed ? changeEnvelopes([], changes, whole) : [])];
        // Each member's message is a message, in an envelope of its own; the rest is quiet.
        for (const envelope of envelopes) sealed = await this.seal(sealed, envelope, tellsTheirs(envelope) ? 'message' : undefined);
        if (sealed.behind) {
          await this.keepPeer(sealed);
          return;
        }
        await this.keepPeer({ ...sealed, groups: next });
        await this.save({ ...this.data, left: this.leftFor([peer.id], files) });
        for (const file of files) kept.add(file.from.ids);
      });
    }
    // From now on, what changes is told as what changed since this.
    this.marked.clear();
    for (const [id, marks] of marked) this.marked.set(id, marks);
    // A copy no device was told of goes at once.
    for (const offer of copies.values()) if (offer && !kept.has(offer.ids)) await this.drop(fromOf(offer));
    void this.flush().catch(() => undefined);
  }

  // A group's message as it goes to the devices, with what was done to it. A photo, file or voice
  // message goes as where it waits on the relay for the group's members, or, kept here, as a copy put
  // there for the devices (`left`), one for all of them (`copies`, by file id). Null for one that
  // cannot go, and, without `files`, for a photo or file (not a voice message).
  private async groupEntryOf(group: string, m: GroupMessage, files: boolean, here: Here | null, left: Leaving[], copies: Map<string, FileOffer | null>): Promise<GroupEntry | null> {
    // What it answers, and what it is beyond its words, as it came.
    const parts = groupPartsOf(m, !m.file);
    const entry: GroupEntry = {
      group,
      at: m.at,
      from: m.from,
      text: m.text,
      tag: m.tag,
      ...(m.note ? { note: true } : { marks: marksOf(m) }),
      ...(Object.keys(parts).length > 0 ? { parts } : {}),
    };
    if (!m.file) return m.text || m.note ? entry : null;
    if (!files && m.ms === undefined) return null;
    let offer = offerOf(m.file);
    if (!offer) {
      if (!copies.has(m.file.id)) copies.set(m.file.id, here ? await uploadFile(here.own, m.file).catch(() => null) : null);
      offer = copies.get(m.file.id) ?? null;
      if (offer) left.push({ from: fromOf(offer), phone: false });
    }
    return offer ? { ...entry, file: offer, ...(m.ms !== undefined ? { ms: m.ms } : {}) } : null;
  }

  // On the primary: what a device asked to do in one of the groups that go to it, done here as this
  // phone's own. A message that cannot go to the group, the device that wrote it shows as not sent.
  private async groupFor(device: string, id: string, ask: GroupAsk): Promise<void> {
    const shared = this.groups;
    const there = !!shared?.shared(id) && shared.groups.all().some((g) => g.id === id);
    if (ask.t === 'text' || ask.t === 'file') {
      let went = false;
      if (shared && there) {
        const { groups, transport } = shared;
        try {
          if (ask.t === 'text') await groups.send(id, ask.text, transport, ask.parts, ask.tag);
          // Left where the device put it, as a member's is: each member takes it from there, this phone too.
          else await groups.sendFile(id, offerRef(ask.file), ask.file, ask.ms, transport, ask.parts, ask.tag);
          went = true;
        } catch {
          // The device is told, below.
        }
      }
      if (!went) await this.say({ k: 'changed', chats: [], groups: [{ group: id, tag: ask.tag, unsent: true }], whole: [] }, device);
      return;
    }
    if (!shared || !there) return;
    const { groups, transport } = shared;
    switch (ask.t) {
      case 'mark':
        await groups.mark(id, ask.marked, transport);
        return;
      case 'add':
        return groups.add(id, ask.identities, transport);
      case 'name':
        return groups.rename(id, ask.name, transport);
      case 'remove':
        return groups.remove(id, ask.leaf, transport);
      case 'leave':
        return groups.leave(id, transport);
      case 'forget':
        return groups.forget(id);
      case 'read':
        return groups.markRead(id);
    }
  }

  // On a linked device: what the phone said changed in the groups, kept as the phone's. Those of
  // the history (`quiet`) do not say a message came.
  private async mirrorFrom(said: { list: GroupMirror[]; gone: string[]; entries: GroupEntry[] }, quiet = false): Promise<void> {
    const shared = this.groups;
    if (!shared) return;
    let again: FileFrom[] = [];
    await shared.groups.mirror((groups) => {
      const made = mirrorGroups(groups, said);
      again = made.again;
      return { groups: made.groups, came: quiet ? [] : made.came };
    });
    this.tookAll(again.map((from) => from.ids));
  }

  // On a linked device: what the phone said changed in messages told already: in a chat, a star or
  // deleting there; in a group, what was done to its messages since, or all of it.
  private async changedFrom(chats: ChatChange[], groups: GroupChange[], whole: WholeGroup[]): Promise<void> {
    const { e2e, history } = this.chats;
    const gone: LinkedChange['gone'] = [];
    for (const change of chats) {
      if (!e2e.record(change.c)) continue;
      const peer = peerOf(change.c);
      if (!change.tag) {
        await history.clear(peer);
        gone.push({ peer });
      } else if (change.gone) {
        await history.remove(peer, change.tag);
        gone.push({ peer, tag: change.tag });
      } else if (change.starred !== undefined) await history.star(peer, change.tag, change.starred);
    }
    if (chats.length > 0) announce({ gone });
    const shared = this.groups;
    if (shared && (groups.length > 0 || whole.length > 0)) await shared.groups.mirror((kept) => ({ groups: changedGroups(kept, { groups, whole }, Date.now()), came: [] }));
  }

  // On a linked device: a group's members as the phone said them, only who each is, as nothing is sealed for them here.
  private seatsOf(id: string): GroupMember[] {
    return (this.data.members[id] ?? []).map((s) => ({ leaf: s.leaf, me: s.me, about: s.id ? { id: s.id, sender: '', relay: '', relayKey: '', seal: '' } : null }));
  }

  // On a linked device: tells the phone of photos and files taken here, a few at a time.
  private tookAll(ids: string[]): void {
    for (let at = 0; at < ids.length; at += MAX_TOOK) void this.say({ k: 'took', ids: ids.slice(at, at + MAX_TOOK) }).catch(() => undefined);
  }

  // ---- On the primary: what it sealed itself ----

  private watchEchoes(): void {
    if (this.echoTimer || this.closed) return;
    this.echoTimer = setTimeout(() => {
      this.echoTimer = null;
      this.act(() => this.tellEchoes());
    }, ECHO_EVERY);
  }

  // Messages sealed here that the chat now keeps as sent: each linked device is told, a photo or
  // file with a copy of its own on the relay.
  private async tellEchoes(): Promise<void> {
    if (this.echoes.size === 0) return;
    const now = Date.now();
    const kept = new Map<string, Message>();
    for (const m of this.chats.history.messages()) if (m.mine) kept.set(`${m.peer}|${m.tag}`, m);
    for (const [key, echo] of [...this.echoes]) {
      const message = kept.get(`${peerOf(echo.c)}|${echo.tag}`);
      if (!message || message.mark === WAITING) {
        if (now - echo.at > ECHO_LASTS) this.echoes.delete(key);
        continue;
      }
      this.echoes.delete(key);
      let m = echo.m;
      const files: Leaving[] = [];
      if (isObject(m.file)) {
        const here = await this.here().catch(() => null);
        const offer = here && message.file ? (offerOf(message.file) ?? (await uploadFile(here.own, message.file).catch(() => null))) : null;
        if (!offer) continue;
        m = { ...m, file: offer };
        files.push({ from: fromOf(offer), phone: !!message.file?.from });
      }
      const mark = (message.mark ?? 0) > 0 ? (message.mark as 1 | 2) : undefined;
      await this.say({ k: 'out', c: echo.c, m, ...(mark ? { mark } : {}) }, undefined, files);
    }
    if (this.echoes.size > 0) this.watchEchoes();
  }

  // ---- On the primary: the history ----

  // Brings a device what of the history is still to go, a pack at a time, until it all went.
  private async bringHistory(id: string): Promise<void> {
    for (;;) {
      const peer = this.data.devices.find((d) => d.id === id);
      const job = peer?.linked ? peer.history : null;
      if (!job || this.closed) return;
      const here = await this.here();
      if (!here) return;
      const { e2e, history } = this.chats;
      const known = new Set(e2e.contacts().map((c) => peerOf(c.identity)));
      const now = Date.now();
      const chats = history.messages().filter((m) => known.has(m.peer) && m.tag && m.at >= job.since && m.at <= job.upTo && m.mark !== WAITING && !(m.until && m.until <= now));
      // The groups' messages of the same time go with them.
      const shared = this.groups;
      const inGroups = shared
        ? shared.groups
            .all()
            .filter((g) => shared.shared(g.id))
            .flatMap((g) => g.messages.filter((m) => m.at >= job.since && m.at <= job.upTo).map((m) => ({ at: m.at, group: { id: g.id, m } })))
        : [];
      const all: { at: number; chat?: Message; group?: { id: string; m: GroupMessage } }[] = [...chats.map((m) => ({ at: m.at, chat: m })), ...inGroups].sort((a, b) => a.at - b.at);
      const entries: PackEntry[] = [];
      const groupEntries: GroupEntry[] = [];
      const files: Leaving[] = [];
      const copies = new Map<string, FileOffer | null>();
      let size = 0;
      let used = 0;
      // A pack ends between messages of different times, so the next starts where this one ended.
      while (used < all.length && (size < PACK_BYTES || all[used].at === all[used - 1].at)) {
        const { chat, group } = all[used];
        used++;
        if (chat) {
          const entry = await this.entryOf(chat, job.files, here, files);
          if (!entry) continue;
          entries.push(entry);
          size += JSON.stringify(entry).length;
        } else if (group) {
          const entry = await this.groupEntryOf(group.id, group.m, job.files, here, files, copies);
          if (!entry) continue;
          groupEntries.push(entry);
          size += JSON.stringify(entry).length;
        }
      }
      const last = used >= all.length;
      const done = entries.length + groupEntries.length;
      if (done > 0) {
        const { ref, offer } = await sendFile(here.own, bytesSource(writePack(entries, groupEntries)), { name: 'history.json', mime: 'application/json', kind: 'file' });
        await deleteChunks(ref.id, ref.count).catch(() => undefined);
        await this.say({ k: 'history', offer, last }, id, files);
      }
      await this.run(async () => {
        const devices = this.data.devices.map((d) =>
          d.id === id && d.history ? { ...d, history: last ? null : { ...d.history, since: all[used].at, done: d.history.done + done } } : d,
        );
        await this.save({ ...this.data, devices });
      });
      announce();
      if (last) return;
    }
  }

  // One message as it goes in a pack; a photo or file in it goes as where it waits on the relay, or a copy put there (`left`).
  private async entryOf(m: Message, files: boolean, here: Here, left: Leaving[]): Promise<PackEntry | null> {
    const entry: PackEntry = {
      peer: m.peer,
      text: m.text,
      mine: m.mine,
      at: m.at,
      tag: m.tag,
      ...(m.until ? { until: m.until } : {}),
      ...(m.lasts ? { lasts: m.lasts } : {}),
      ...(m.mark && m.mark > 0 ? { mark: m.mark } : {}),
    };
    // What it answers or is beyond its words, and what was done to it: reactions, a pin, votes, a star.
    const parts = chatPartsOf(m as unknown as Json);
    if (Object.keys(parts).length > 0) entry.parts = parts;
    if (m.voice) {
      const audio = await loadClip(m.voice).catch(() => null);
      return audio ? { ...entry, voice: { ms: m.voice.ms, data: toBase64(audio) } } : null;
    }
    if (m.file) {
      if (!files) return null;
      const offer = offerOf(m.file) ?? (await uploadFile(here.own, m.file).catch(() => null));
      if (!offer) return null;
      left.push({ from: fromOf(offer), phone: !!m.file.from });
      return { ...entry, file: offer };
    }
    return m.text ? entry : null;
  }

  // ---- On a linked device ----

  // A message the phone or another device sent to a contact, or what it said read or deleted: kept
  // here as this device's own, once, by its tag; one deleted stays so, should a copy come late.
  private async ownFrom(c: string, m: Json, mark: Mark | undefined): Promise<void> {
    const { e2e, history } = this.chats;
    if (!e2e.record(c)) return;
    const peer = peerOf(c);
    const now = Date.now();
    const gone: LinkedChange['gone'] = [];
    const read = tagsOf(m.read);
    if (read.length > 0) await history.mark(peer, false, 2, now, read);
    const erase = isObject(m.erase) ? m.erase : null;
    if (erase?.all === true || (erase && isTag(erase.tag))) {
      await this.run(async () => {
        const erased = this.erasedBy(c, m);
        if (erased !== this.data.erased) await this.save({ ...this.data, erased });
      });
    }
    if (erase?.all === true) {
      await history.clear(peer);
      gone.push({ peer });
    } else if (erase && isTag(erase.tag)) {
      await history.remove(peer, erase.tag);
      gone.push({ peer, tag: erase.tag });
    }
    await this.marksAsOwn(peer, m, now);
    if (isKept(m) && !this.erasedHere(peer, m.tag as string)) {
      const tag = m.tag as string;
      const have = history.messages().find((x) => x.peer === peer && x.tag === tag);
      if (have) {
        if (mark && have.mine && (have.mark ?? 0) < mark) await history.mark(peer, true, mark, now, [tag]);
      } else {
        const lasts = typeof m.lasts === 'number' && m.lasts > 0 ? m.lasts : typeof m.timer === 'number' ? m.timer : 0;
        // With what it answers, and what it is beyond words (lib/chat-parts.ts): a sticker, a place, a poll, a preview.
        const { sticker, place, poll, preview, forwarded } = carriedOf(m);
        const parts = { ...(isTag(m.re) ? { re: m.re } : {}), ...(sticker ? { sticker } : {}), ...(place ? { place } : {}), ...(poll ? { poll } : {}), ...(preview ? { preview } : {}), ...(forwarded ? { forwarded } : {}) };
        const base: Message = { peer, text: '', mine: true, at: now, tag, lasts, mark: mark ?? 0, ...parts };
        const voice = voiceOf(m.voice);
        const offer = isObject(m.file) ? readOffer(m.file) : null;
        if (isText(m.text) && m.text) await history.add({ ...base, text: m.text });
        else if (voice) {
          const whole = this.voiceParts.add(`out ${peer}`, voice, now);
          if (whole) await history.add({ ...base, voice: await saveClip(whole.audio, whole.ms) });
        } else if (offer) await history.add({ ...base, file: offerRef(offer) });
      }
    }
    announce({ gone });
  }

  // What a message sealed for a contact says of one of the chat's messages, kept as this side's own,
  // as the chat keeps what it sends: a reaction, a pin, a vote.
  private async marksAsOwn(peer: string, m: Json, now: number): Promise<void> {
    const { history } = this.chats;
    const react = isObject(m.react) && isTag(m.react.tag) && (m.react.emoji === '' || isReactionEmoji(m.react.emoji)) ? { tag: m.react.tag, emoji: m.react.emoji as string } : null;
    if (react) await history.react(peer, react.tag, true, react.emoji);
    const { pin, vote } = carriedOf(m);
    if (pin) await history.pin(peer, pin.tag, pin.on ? now : 0);
    if (vote) await history.vote(peer, vote.tag, true, vote.chose);
  }

  // Packs of the history the phone put on the relay: each taken, opened and kept, then deleted.
  private async takePacks(): Promise<void> {
    while (this.data.primary && this.data.packs.length > 0) {
      const offer = this.data.packs[0];
      const here = await this.here();
      if (!here) return;
      let entries: PackEntry[] = [];
      let groupEntries: GroupEntry[] = [];
      try {
        const ref = await takeFile(here.own, offerRef(offer), undefined, false);
        const bytes = await readFile(ref);
        await deleteChunks(ref.id, ref.count).catch(() => undefined);
        entries = bytes ? readPack(bytes) : [];
        groupEntries = bytes ? readGroupEntries(bytes) : [];
      } catch (error) {
        if (!(error instanceof FileGoneError)) throw error;
      }
      await this.putIn(entries);
      if (groupEntries.length > 0) await this.mirrorFrom({ list: [], gone: [], entries: groupEntries }, true);
      await this.run(async () => {
        await this.save({ ...this.data, packs: this.data.packs.filter((p) => p !== offer && p.ids !== offer.ids) });
      });
    }
  }

  private async putIn(entries: PackEntry[]): Promise<void> {
    const { e2e, history } = this.chats;
    const known = new Set(e2e.contacts().map((c) => peerOf(c.identity)));
    const have = new Set(history.messages().map((m) => `${m.peer}|${m.tag}`));
    const added: Message[] = [];
    for (const e of entries) {
      const key = `${e.peer}|${e.tag}`;
      if (!known.has(e.peer) || have.has(key) || this.erasedHere(e.peer, e.tag)) continue;
      have.add(key);
      const message: Message = { peer: e.peer, text: e.text, mine: e.mine, at: e.at, tag: e.tag, until: e.until ?? 0, lasts: e.lasts ?? 0, mark: e.mark ?? 0, ...e.parts };
      if (e.voice) {
        let audio: Uint8Array;
        try {
          audio = fromBase64(e.voice.data);
        } catch {
          continue;
        }
        added.push({ ...message, voice: await saveClip(audio, e.voice.ms) });
      } else if (e.file) added.push({ ...message, file: offerRef(e.file) });
      else if (e.text) added.push(message);
    }
    if (added.length === 0) return;
    await history.putIn(added);
    announce();
  }
}

// ---- The open space's links ----

let current: Links | null = null;

// To a contact who calls while a linked device has a call, the account is in one.
callsElsewhere((id) => current?.inCall(id) ?? false);

joinSpaceChats(async (chats, space, key) => {
  current?.close();
  current = null;
  watchTakenFiles(null);
  // The space's groups, before anything comes: public groups stay on the phone.
  const groups = core.canGroup() ? await spaceGroups().catch(() => null) : null;
  current = await Links.open(space, key, chats);
  if (groups) current.useGroups(groups, spaceGroupTransport, (id) => !groups.isPublic(id));
  watchTakenFiles(current);
});

/** The open space's links, once its chats are open. */
export async function spaceLinks(): Promise<Links> {
  await spaceChats();
  if (!current) throw new Error(t('Linked devices could not open.'));
  return current;
}

/** Lets go of the space's links when it closes. */
export function forgetLinks(): void {
  current?.close();
  current = null;
  watchTakenFiles(null);
}

/** Which the open space is (Role), as far as its chats are open yet. */
export function linkedRole(): Role {
  return current?.role() ?? null;
}

/** On a linked device: the account's contact link, to show as the chat's own. */
export function accountLink(): string | null {
  return current?.accountLink() ?? null;
}

/** Once, in a space whose chats are a linked device's copy restored from its backup: what to say of it. Null otherwise. */
export async function copyNote(): Promise<string | null> {
  if (!core.hasCore()) return null;
  const links = await spaceLinks().catch(() => null);
  return links && (await links.sayCopy().catch(() => false)) ? t('These chats came from a linked device’s backup: you can read them here, but not write in them. To write, link this device to the phone again, in Linked devices.') : null;
}

/**
 * On the primary: what was done on this phone only to the open space's chat (lib/link-wire.ts,
 * ChatChange), for its linked devices to do too. Hidden chats are not the space's, and are never told.
 */
export function changedHere(change: ChatChange): void {
  current?.changedHere(change);
}
