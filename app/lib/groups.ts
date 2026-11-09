// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { deleteChunks, type FileRef } from '../lock/attachment-files';
import { checkedChatNotify, type ChatNotify } from '../lock/chat-notify';
import type { ChatPin } from '../lock/chat-pin';
import {
  checkedAbout,
  checkedGroupData,
  EMPTY_GROUPS,
  MAX_CONTACT_ASKS,
  MAX_CONTACT_KEY,
  MAX_GIVEN,
  MAX_GROUP_MESSAGES,
  MAX_HELD_GROUPS,
  MAX_LATER,
  MAX_MEMBER_NAMES,
  MAX_ORPHANS,
  MAX_OUTBOX,
  type About,
  type Group,
  type GroupData,
  type GroupMessage,
  type GroupParts,
} from '../lock/group-data';
import { newTag } from '../lock/history';
import { checkedLook, type Look } from '../theme/look';
import { offerRef, readOffer, type FileFrom, type FileOffer } from './attachments';
import * as core from './core';
import { fromBase64, fromHex, randomBytes, toBase64, toHex, utf8Decode, utf8Encode } from './crypto';
import { fromBase64Url, toBase64Url } from './e2e';
import { decodeGroupCall, type GroupCallSignal } from './group-call-signal';
import type { GroupContacts } from './group-contacts';
import { groupPartsOf, markedOf, MAX_SEEN_TAGS, seenOf, withMarked, withSeen, type Marked, type Seen } from './group-parts';
import { cleanGroupName, isGroupId, type GroupSignal } from './group-signal';
import { t, mark } from './i18n';
import type { GroupAsk } from './link-wire';
import { moderated } from './public-rules';
import type { Mark } from './relay';
import { MAX_VOICE_MS } from './voice';

// Group chats, MLS (RFC 9420) in the Rust core (crates/erevos-group). Whoever makes a group is its
// admin: it adds contacts and takes members out, and is the only one whose changes count, so no
// server has to put them in order. To add a contact, the admin asks for a key package in their
// own chat; the contact's phone answers with one; the admin sends the welcome that joins the
// group, in that chat too. From then on everything goes as group messages: each one sealed by MLS
// for the whole group, and sealed again for each member (with the key it says about itself), so
// what reaches each member's queue looks like nothing the others get, and no relay can tell who is
// in a group. Each goes straight to each member's queue on its relay (through this phone's own),
// like a message to a contact, whether or not the two are contacts.
//
// A member leaves by asking the admin, who takes it out. A member taken out reads nothing sent
// after. A message from a member that comes before the admin's change it was written after waits
// here (`later`) until the change comes.
//
// Keys change every RENEW_EVERY, so a phone's group keys taken once read nothing for long after
// (post-compromise security): the admin gives its own leaf new keys with a commit of its own, and
// each member asks the admin, in a group message only it gets, to put it in anew with a key package
// made for that (`renew`). The admin commits it out and in again, and sends it the welcome sealed
// for it as group messages are; the member takes the group back from it, and what came meanwhile
// waits. The others see the same member, as before. An admin from before leaves such a message
// alone, and the member asks again after RENEW_EVERY.
//
// Photos, files and voice messages go as with a contact (lib/attachments.ts): encrypted with a key
// of their own and put on the sender's relay, and only where they are and the key go in the
// group's message. Each member takes them from there (lib/group-media.ts) and leaves them for the
// others, so they expire on the relay after 14 days. A member who joins later reads none of what
// came before, its files neither. A phone from before these reads nothing in such a message (a kind
// it does not know) and goes on with the next. When a message leaves the group here, however it
// goes, its chunks on this phone go too.
//
// Replies, stickers, places, polls, link previews and forwarding ride in a message's own fields,
// and reactions, votes, pins and deleting for everyone are kinds of their own (lib/group-parts.ts):
// a phone from before shows the words and leaves the rest.
//
// Every call runs after the one before it ends, as in lib/e2e.ts, and the MLS state is kept before
// anything it made is handed back.
//
// On a device linked to the phone that holds the account (lib/devices.ts), the groups here are the
// phone's, kept as it says them (`mirror`), and what is done in one, the phone does (`GroupLink`):
// this device has no MLS state of its own, and makes and joins no group. Unless the groups are held
// there (docs/sync.md, S6): the account's one MLS state moves to it (`moveOut`, `moveIn`), never
// copied, and the phone is then the one that keeps them as told, asks, and passes on what comes for
// them. The members see the same member, whose group messages come to another queue.
//
// Each group message tells the relay what it carries (lib/relay.ts, Mark), for a web app's notice
// while it is closed: a member's words, photo, file or voice message, or an ask for one's contact
// link, is a message; a call that starts rings, counted as a call; all else (commits,
// welcomes, new keys, reactions, pins, names, admins' steps, an answer with a contact link) is quiet. What waits in the outbox keeps its mark for when it goes.
//
// In a group that is not public, a member's phone tells the sender of a message that it came, a
// while after and with the others that came meanwhile, and that it was read, once its group is on
// the screen, in a quiet group message only those senders get (`seen`, lib/group-parts.ts): our own
// shows ✓✓ once it reached every member's phone and ✓✓✓ once every one read it, and who did, when.
// Each such message skips one of this phone's keys for the other members (MLS), who take a jump of
// no more than 1000 (crates/erevos-group): after APART_MOST of them the next goes to all.
//
// Members who are not each other's contacts can ask for each other's contact links (`askContact`),
// in a group message only that member gets, with this account's public keys in it: where the member
// is reached is what it says about itself in the group, which MLS vouches for. The member's phone
// shows the ask once, to Send or not; Send answers with its own keys (`back`), and each phone adds
// the other to the space's contacts (lib/group-contacts.ts). A Don't, or no answer, tells the asker
// nothing, and an ask from a member who is a contact here already shows nothing either, so what the
// asker sees never says where this phone keeps them. Once a member is a contact, from any group or
// some other way, no ask to or from it is kept in any group: none is left to add it again after its
// chat goes, or moves into hidden chats. Only a member still in the group, by the one leaf it has
// there, is asked or heard: two leaves that say one id are one who is not it. Not in public groups,
// where a member's id is a key made for that group alone, nor on a linked device, which has no keys
// of the account's.

/** The start of a group message, after which comes the message sealed for its member. A chat's
 *  packets start with 1 then 1 or 2 (crates/erevos-core), or 1 then 4 once sealed for the relay
 *  (lib/sealed-packet.ts). */
const GROUP_PACKET = [1, 3];
// The sender id inside the per-member seal: not used, the MLS message says who sent it.
const NO_SENDER = new Uint8Array(24);
/** The longest text sent in a group. */
export const MAX_GROUP_TEXT = 4000;
/** How often this phone's keys in each group are made new: its own as the admin, or by asking it. */
export const RENEW_EVERY = 7 * 24 * 3600_000;
// The longest key package a member asks to be put in anew with, base64: about 1 KB.
const MAX_RENEWAL = 8192;
/** How long after asking a member for its contact link it can be asked again. */
export const ASK_AGAIN = 7 * 24 * 3600_000;
/** How long this phone takes a member's contact link after asking for it. */
export const WANT_KEPT = 60 * 24 * 3600_000;
/** How long a member's ask for this phone's contact link waits to be answered, and how long one
 *  turned down keeps that member's asks from showing. */
export const ASK_KEPT = 30 * 24 * 3600_000;
/** The most asks for this phone's contact link waiting in a group: the rest are not kept. */
export const MAX_ASKS = 20;
/** How long after a member's message comes this phone tells its sender, with the others that came meanwhile. */
export const GOT_AFTER = 2000;
/** The most group messages this phone sends to some members only before one goes to all of them. */
export const APART_MOST = 300;
export { MAX_CONTACT_KEY };

/** How group messages leave this phone: to a member's queue, saying what it carries (`mark`, none
 *  for what rings), and to a contact inside their chat. With `contacts`, members can be asked for
 *  their contact links, and added. */
export type GroupTransport = {
  post(to: About, packet: Uint8Array, mark?: Mark): Promise<void>;
  signal(identity: string, signal: GroupSignal): Promise<void>;
  contacts?: GroupContacts;
};

/** Where this phone's group messages come to, and who it is: what it says about itself, but the seal key. */
export type Me = Omit<About, 'seal'>;

export type GroupMember = { leaf: number; about: About | null; me: boolean };

/** On a linked device (lib/devices.ts): how the groups here are the phone's. */
export type GroupLink = {
  /** Whether the groups here are the phone's now. */
  through(): boolean;
  /** Has the phone do something in a group. */
  ask(id: string, ask: GroupAsk): Promise<void>;
  /** A group's members, as the phone said them. */
  members(id: string): GroupMember[];
  /** Says a photo, file or voice message of a group was taken here from where it waited. */
  took(from: FileFrom): void;
  /** A group message that came here, for the device that holds the groups now (docs/sync.md, S6). */
  pass?(packet: Uint8Array): Promise<void>;
  /** A group signal from a contact's chat that came here, for the device that holds the groups now. */
  passSignal?(identity: string, signal: GroupSignal, request: boolean): Promise<void>;
  /** Whether this is a linked device, the groups held here or not: public groups are the phone's. */
  device?(): boolean;
};

// How long the queues the groups' messages came to stay this device's once they were handed on
// (S6): long past when their members heard the keys made new on the other device.
const LEFT_SENDERS_LAST = 30 * 24 * 60 * 60 * 1000;

/**
 * The groups' MLS state and what goes with it, as one device hands it to another (docs/sync.md,
 * S6): moved, never copied. Each group as kept, without its messages, which the other has as it was
 * told them, nor its PIN and notifications, which stay on each.
 */
export type HeldGroups = Pick<GroupData, 'state' | 'seal' | 'orphans' | 'given'> & { groups: Group[] };

/** A group as the screens show it. */
export type GroupInfo = Pick<Group, 'id' | 'name' | 'admin' | 'status'> & {
  last: GroupMessage | null;
  unread: number;
  /** Contacts asked to join who have not answered yet. */
  asked: string[];
  /** Members this phone asked for their contact link, and when, while their answer is taken. */
  wants: { id: string; at: number }[];
  /** Members who ask for this phone's contact link and wait for an answer, oldest first. */
  asks: { id: string; at: number }[];
  /** Locked with a PIN of its own here (lock/chat-pin.ts). */
  locked: boolean;
  /** Its own notifications here (lock/chat-notify.ts); missing while it has none. */
  notify?: ChatNotify;
  /** Its own look here (theme/look.ts); missing while it takes the space's. */
  look?: Look;
};

// What members say inside the group's messages. A `file` with `ms` is a voice message's sound. A
// `contact` gives the member `to` the sender's public keys: asking for theirs, or with `back`
// answering such an ask.
type Said =
  | ({ t: 'text'; text: string; tag: string } & GroupParts)
  | { t: 'name'; name: string }
  | { t: 'call'; call: GroupCallSignal }
  | ({ t: 'file'; file: FileOffer; tag: string; ms?: number } & GroupParts)
  | { t: 'renew'; kp: string }
  | ContactSaid
  | Marked
  | Seen;

type ContactSaid = { t: 'contact'; to: string; key: string; back?: true };

function encodeSaid(said: Said): Uint8Array {
  return utf8Encode(JSON.stringify(said));
}

function decodeSaid(bytes: Uint8Array): Said | null {
  try {
    const v = JSON.parse(utf8Decode(bytes)) as Record<string, unknown>;
    if (v.t === 'text' && typeof v.text === 'string' && v.text.length > 0) {
      return { t: 'text', text: v.text.slice(0, MAX_GROUP_TEXT), tag: typeof v.tag === 'string' ? v.tag : '', ...groupPartsOf(v, true) };
    }
    if (v.t === 'name' && typeof v.name === 'string') return { t: 'name', name: cleanGroupName(v.name) };
    if (v.t === 'renew' && typeof v.kp === 'string' && v.kp.length <= MAX_RENEWAL && /^[A-Za-z0-9+/]+={0,2}$/.test(v.kp)) return { t: 'renew', kp: v.kp };
    if (v.t === 'contact' && typeof v.to === 'string' && /^[0-9a-f]{64}$/.test(v.to) && typeof v.key === 'string' && v.key.length <= MAX_CONTACT_KEY && /^[A-Za-z0-9_-]+$/.test(v.key)) {
      if (v.back === undefined) return { t: 'contact', to: v.to, key: v.key };
      if (v.back === true) return { t: 'contact', to: v.to, key: v.key, back: true };
    }
    if (v.t === 'call') {
      const call = decodeGroupCall(v.call);
      if (call) return { t: 'call', call };
    }
    if (v.t === 'file') {
      const file = readOffer(v.file);
      const voice = file?.kind === 'file' && typeof v.ms === 'number' && v.ms > 0 && v.ms <= MAX_VOICE_MS + 5000;
      if (file) return { t: 'file', file, tag: typeof v.tag === 'string' ? v.tag : '', ...(voice ? { ms: Math.round(v.ms as number) } : {}), ...groupPartsOf(v, false) };
    }
    const marked = markedOf(v);
    if (marked) return marked;
    const seen = seenOf(v);
    if (seen) return seen;
  } catch {
    // Not what an Erevos says.
  }
  return null;
}

function aboutOf(bytes: Uint8Array | string): About | null {
  try {
    return checkedAbout(JSON.parse(typeof bytes === 'string' ? bytes : utf8Decode(bytes)));
  } catch {
    return null;
  }
}

// A group without the count of messages sent to some members only.
function withoutApart(group: Group): Group {
  const { apart: _, ...rest } = group;
  return rest;
}

// A group's asks for this phone's contact link that wait for an answer: not turned down, nor too old.
const openAsks = (group: Group, now: number) => (group.asks ?? []).filter((a) => a.key && now - a.at < ASK_KEPT);

// The members this phone asked for their contact link whose answer it still takes.
const freshWants = (group: Group, now: number) => (group.wants ?? []).filter((w) => now - w.at < WANT_KEPT);

// A member whose id more than one leaf of a group says: one of them is not who it says.
const notOne = () => new Error(t('More than one member of this group shows this key, so one of them is not who they say. Ask for their contact link some other way.'));

// A group with these asks, both ways, those too old left out, and neither kept when empty.
function withContactAsks(group: Group, wants: Group['wants'], asks: Group['asks'], now: number): Group {
  const { wants: _wants, asks: _asks, ...rest } = group;
  const keptWants = (wants ?? []).filter((w) => now - w.at < WANT_KEPT).slice(-MAX_CONTACT_ASKS);
  const keptAsks = (asks ?? []).filter((a) => now - a.at < ASK_KEPT).slice(-MAX_CONTACT_ASKS);
  return { ...rest, ...(keptWants.length > 0 ? { wants: keptWants } : {}), ...(keptAsks.length > 0 ? { asks: keptAsks } : {}) };
}

/** Whether a packet from the relay is a group message. */
export function isGroupPacket(packet: Uint8Array): boolean {
  return packet.length > 2 && packet[0] === GROUP_PACKET[0] && packet[1] === GROUP_PACKET[1];
}

// The admin's welcome after a member's renewal, sealed for it as a group message is: a line of
// JSON as a public group's answers start (lib/public-rules.ts), a 0, then the welcome.
function encodeRenewed(group: string, welcome: Uint8Array): Uint8Array {
  const head = utf8Encode(JSON.stringify({ v: 1, group, kind: 'renewed' }));
  const out = new Uint8Array(head.length + 1 + welcome.length);
  out.set(head, 0);
  out.set(welcome, head.length + 1);
  return out;
}

function decodeRenewed(bytes: Uint8Array): { group: string; welcome: Uint8Array } | null {
  const end = bytes[0] === 0x7b ? bytes.indexOf(0) : -1;
  if (end < 0) return null;
  try {
    const v = JSON.parse(utf8Decode(bytes.subarray(0, end))) as Record<string, unknown>;
    const welcome = bytes.slice(end + 1);
    return v.v === 1 && v.kind === 'renewed' && isGroupId(v.group) && welcome.length > 0 ? { group: v.group, welcome } : null;
  } catch {
    return null;
  }
}

// Public groups (lib/public-groups.ts) are these groups with more to them: what they need here is
// `protected` rather than private, and the three hooks below `messages` do nothing for the rest.
export class Groups {
  protected data: GroupData;
  private readonly store: (data: GroupData) => Promise<void>;
  protected readonly me: () => Promise<Me>;
  private queue: Promise<unknown> = Promise.resolve();
  private readonly listeners = new Set<() => void>();
  private readonly callListeners = new Set<(group: string, from: string, signal: GroupCallSignal) => void>();
  private readonly messageListeners = new Set<(group: string, named?: boolean) => void>();
  private readonly goneListeners = new Set<(group: string) => void>();
  private link: GroupLink | null = null;
  // Members' messages that came, by group, not yet told to their senders: each tag with its sender.
  private readonly gotWaiting = new Map<string, { tags: Map<string, string>; transport: GroupTransport }>();
  private gotTimer: ReturnType<typeof setTimeout> | null = null;
  // How group messages last left this phone, for telling what was read where none is given.
  private lastTransport: GroupTransport | null = null;
  // Let go of (close): what waits to be told is told no more.
  private closed = false;

  constructor(data: GroupData, store: (data: GroupData) => Promise<void>, me: () => Promise<Me>) {
    this.data = data;
    this.store = store;
    this.me = me;
  }

  /** Calls `listener` each time a group, or its messages, change. Returns how to stop. */
  onChange(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** Calls `listener` with each group call signal for this phone, and who in which group said it. */
  onCall(listener: (group: string, from: string, signal: GroupCallSignal) => void): () => void {
    this.callListeners.add(listener);
    return () => {
      this.callListeners.delete(listener);
    };
  }

  /** Calls `listener` with the group each time a member's message comes in one, and whether it names this phone with @ (lib/mentions.ts). Returns how to stop. */
  onMessage(listener: (group: string, named?: boolean) => void): () => void {
    this.messageListeners.add(listener);
    return () => {
      this.messageListeners.delete(listener);
    };
  }

  /** Calls `listener` with the group each time a member deletes for everyone a message of theirs not read here yet. Returns how to stop. */
  onGone(listener: (group: string) => void): () => void {
    this.goneListeners.add(listener);
    return () => {
      this.goneListeners.delete(listener);
    };
  }

  protected changed() {
    this.listeners.forEach((listener) => listener());
  }

  /** How the groups here are the phone's, on a linked device (lib/devices.ts), or none. */
  useLink(link: GroupLink | null): void {
    this.link = link;
  }

  // The link, while the groups here are the phone's.
  private through(): GroupLink | null {
    return this.link?.through() ? this.link : null;
  }

  /** Every group as kept, with its messages. */
  all(): readonly Group[] {
    return this.data.groups;
  }

  /** Whether this phone is in groups of its own: it has their MLS state, which a linked device never has. */
  hasState(): boolean {
    return !!this.data.state;
  }

  /** On a linked device: the groups as the phone said them, made by `update` from those here, with the groups where a member's message came. */
  mirror(update: (groups: Group[]) => { groups: Group[]; came: string[] }): Promise<void> {
    return this.run(async () => {
      const { groups, came } = update(this.data.groups);
      await this.save({ ...this.data, groups });
      this.changed();
      for (const id of came) this.messageListeners.forEach((listener) => listener(id));
    });
  }

  /**
   * Hands the MLS state on (docs/sync.md, S6) to the device `to` ('' for the phone): in one save it
   * is wiped from here and kept as it went (`handed`), so it is never in two places as kept, nor
   * lost, should this device stop on the way. The groups stay as they are, as told. Throws while in
   * a public group or asking to join one, which stay on the phone, and with no groups.
   */
  moveOut(to: string, now = Date.now()): Promise<void> {
    return this.run(async () => {
      if (!this.data.state) throw new Error(t('No groups here yet.'));
      if (this.data.handed) throw new Error(t('The groups are on their way to the other device. Try again in a moment.'));
      if (this.hasPublic()) throw new Error(t('Public groups stay on the phone: leave them first to move the groups.'));
      const held: HeldGroups = {
        state: this.data.state,
        seal: this.data.seal,
        orphans: this.data.orphans,
        given: this.data.given,
        groups: this.data.groups.map(({ messages: _messages, pin: _pin, notify: _notify, look: _look, ...g }) => ({ ...g, messages: [] })),
      };
      // Where its members write to it till the other device makes its keys new: kept on a while.
      const keep = now - LEFT_SENDERS_LAST;
      const left = [...(this.data.left ?? []).filter((l) => l.at >= keep), ...[...(await this.sendersNow())].map((sender) => ({ sender, at: now }))];
      const json = JSON.stringify(held);
      if (json.length > MAX_HELD_GROUPS) throw new Error(t('The groups are too large to move.'));
      await this.save({
        ...this.data,
        state: '',
        seal: '',
        orphans: [],
        given: [],
        groups: this.data.groups.map((g) => ({ ...g, later: [], outbox: [] })),
        handed: { to, held: json },
        left: [...new Map(left.map((l) => [l.sender, l])).values()],
      });
      this.changed();
    });
  }

  /** The MLS state handed on (moveOut), as it went and to whom, till the other device says it took it. */
  handed(): { to: string; held: string } | null {
    return this.data.handed ?? null;
  }

  /** The other device took what was handed: here it goes. */
  handedDone(): Promise<void> {
    return this.run(async () => {
      if (!this.data.handed) return;
      const { handed: _handed, ...rest } = this.data;
      await this.save(rest);
    });
  }

  /** The other device could not take what was handed: it is kept here again, as it went. */
  takeBack(): Promise<void> {
    return this.run(async () => {
      const handed = this.data.handed;
      if (!handed || this.data.state) return;
      const held = checkedGroupData(JSON.parse(handed.held) as unknown);
      const { handed: _handed, ...rest } = this.data;
      this.data = rest;
      await this.takeIn({ state: held.state, seal: held.seal, orphans: held.orphans, given: held.given, groups: held.groups });
    });
  }

  /**
   * Takes the MLS state another device handed on (moveOut): the groups as it kept them, with their
   * messages as told here, and the PIN and notifications here. Each group then makes its keys new
   * with the next renewKeys, saying where this device's group messages come to.
   */
  moveIn(held: HeldGroups): Promise<void> {
    return this.run(() => this.takeIn(held));
  }

  private async takeIn(held: HeldGroups): Promise<void> {
    if (this.data.state) throw new Error(t('The groups are here already.'));
    if (!held.state || !held.seal) throw new Error(t('No groups here yet.'));
    const here = new Map(this.data.groups.map((g) => [g.id, g]));
    const groups = held.groups.map((g) => {
      const kept = here.get(g.id);
      const { renewing: _renewing, ...rest } = g;
      return { ...rest, keysAt: 0, messages: kept?.messages ?? [], ...(kept?.pin ? { pin: kept.pin } : {}), ...(kept?.notify ? { notify: kept.notify } : {}), ...(kept?.look ? { look: kept.look } : {}) };
    });
    await this.save({ ...this.data, state: held.state, seal: held.seal, orphans: held.orphans, given: held.given, groups });
    this.changed();
  }

  /** Everything of the groups here goes, their MLS state too: a linked device unlinked (lib/devices.ts forget). */
  wipe(): Promise<void> {
    return this.run(async () => {
      await this.save({ ...EMPTY_GROUPS });
      this.changed();
    });
  }

  // Whether a public group keeps the groups on the phone (moveOut): one this phone is in.
  protected hasPublic(): boolean {
    return this.data.groups.some((g) => g.status !== 'out' && this.isPublic(g.id));
  }

  // Whether this is a linked device (GroupLink.device): public groups are made and joined on the phone.
  protected onDevice(): boolean {
    return this.link?.device?.() === true;
  }

  protected run<T>(call: () => Promise<T>): Promise<T> {
    const next = this.queue.catch(() => undefined).then(call);
    this.queue = next;
    return next;
  }

  // The chunks of a file whose message left go once the groups without it are kept.
  protected async save(data: GroupData): Promise<void> {
    const kept = new Set(filesIn(data).map((file) => file.id));
    const gone = filesIn(this.data).filter((file) => !kept.has(file.id));
    this.data = data;
    await this.store(data);
    for (const file of gone) await deleteChunks(file.id, file.count).catch(() => undefined);
  }

  protected find(id: string): Group | undefined {
    return this.data.groups.find((g) => g.id === id);
  }

  protected withGroup(group: Group): GroupData {
    const at = this.data.groups.findIndex((g) => g.id === group.id);
    const groups = [...this.data.groups];
    if (at < 0) groups.push(group);
    else groups[at] = group;
    return { ...this.data, groups };
  }

  // The MLS state, made the first time, saying where this phone's group messages come to now.
  protected async state(): Promise<Uint8Array> {
    if (this.through()) throw new Error(t('Make or join groups on the phone that holds this account.'));
    const me = await this.me();
    let seal = this.data.seal ? fromBase64(this.data.seal) : null;
    if (!seal) seal = randomBytes(32);
    const about = utf8Encode(JSON.stringify({ ...me, seal: toBase64Url(await core.sealPublic(seal)) } satisfies About));
    const state = this.data.state ? await core.group.setAbout(fromBase64(this.data.state), about) : await core.group.create(about);
    await this.save({ ...this.data, state: toBase64(state), seal: toBase64(seal) });
    return state;
  }

  protected kept(): Uint8Array {
    if (!this.data.state) throw new Error(t('No groups here yet.'));
    return fromBase64(this.data.state);
  }

  /** The groups, latest moved first. A member's ask for this phone's contact link is unread too. */
  list(): GroupInfo[] {
    const now = Date.now();
    return this.data.groups
      .map((g) => {
        const last = g.messages[g.messages.length - 1] ?? null;
        const asks = openAsks(g, now)
          .map(({ id, at }) => ({ id, at }))
          .sort((a, b) => a.at - b.at);
        const unread = g.messages.filter((m) => m.from && !m.note && m.at > g.readAt).length + asks.filter((a) => a.at > g.readAt).length;
        const wants = freshWants(g, now).map(({ id, at }) => ({ id, at }));
        return { id: g.id, name: g.name, admin: g.admin, status: g.status, last, unread, asked: g.asked, wants, asks, locked: !!g.pin, ...(g.notify ? { notify: g.notify } : {}), ...(g.look ? { look: g.look } : {}) };
      })
      .sort((a, b) => (b.last?.at ?? 0) - (a.last?.at ?? 0));
  }

  /** A group's messages, oldest first. */
  messages(id: string): GroupMessage[] {
    return this.find(id)?.messages ?? [];
  }

  /** A group message just opened, before anything of it shows: true when it was taken here, or is not to show. */
  protected async heard(_id: string, _opened: { sender: number; about: Uint8Array; text: Uint8Array }, _message: Uint8Array, _transport: GroupTransport): Promise<boolean> {
    return false;
  }

  /** What was sealed for this phone and is not a group message: true when it was taken here. */
  protected async unsealed(_message: Uint8Array, _transport: GroupTransport): Promise<boolean> {
    return false;
  }

  /** The members of a group, by identity, whose phones are sent nothing more. */
  protected unreached(_id: string): Set<string> {
    return new Set();
  }

  /** The leaf of the member whose commits count in a group: its admin's. */
  protected async keeperLeaf(_id: string): Promise<number> {
    return 0;
  }

  /** Whether a group's members are who they are in their chats, and so can ask for each other's contact links. */
  protected personal(_id: string): boolean {
    return true;
  }

  /** Whether a group is a public one (lib/public-groups.ts), which says a queue of its own. */
  isPublic(_id: string): boolean {
    return false;
  }

  /** What this phone says about itself in a group it asks new keys for: what it says in every group now. */
  protected async renewedAbout(_id: string): Promise<Uint8Array> {
    const me = await this.me();
    return utf8Encode(JSON.stringify({ ...me, seal: toBase64Url(await core.sealPublic(fromBase64(this.data.seal))) } satisfies About));
  }

  /** After a commit this phone made or a group it took back, in a new epoch. */
  protected async committed(_id: string, _transport: GroupTransport): Promise<void> {}

  /** A group's members as its MLS state has them; none once out of it. */
  async members(id: string): Promise<GroupMember[]> {
    const link = this.through();
    if (link) return link.members(id);
    const group = this.find(id);
    if (!group || group.status === 'out' || !this.data.state) return [];
    return this.membersIn(id);
  }

  // The members of a group as `state` has them: the one kept here, or another not kept yet.
  protected async membersIn(id: string, state = this.kept()): Promise<GroupMember[]> {
    const json = JSON.parse(utf8Decode(await core.group.members(state, fromHex(id)))) as {
      own: number;
      members: { leaf: number; about: string }[];
    };
    const members = json.members.map((m) => ({ leaf: m.leaf, about: aboutOf(m.about), me: m.leaf === json.own }));
    if (!this.isPublic(id)) this.learnNames(members);
    return members;
  }

  // Keeps the names the members of a private group go by (GroupData.names), as their keys say now.
  private learnNames(members: GroupMember[]): void {
    const names = { ...(this.data.names ?? {}) };
    let changed = false;
    for (const m of members) {
      if (m.me || !m.about) continue;
      const name = m.about.name ?? '';
      if ((names[m.about.id] ?? '') === name) continue;
      // Learned again, it goes last, so the earliest learned are the first forgotten.
      delete names[m.about.id];
      if (name) names[m.about.id] = name;
      changed = true;
    }
    if (!changed) return;
    const kept = Object.entries(names).slice(-MAX_MEMBER_NAMES);
    const { names: _names, ...rest } = this.data;
    this.data = kept.length > 0 ? { ...rest, names: Object.fromEntries(kept) } : rest;
    void this.run(() => this.save({ ...this.data })).catch(() => undefined);
    this.changed();
  }

  /** The name a member of a private group goes by, as its keys last said, or ''. */
  saidName(identity: string): string {
    return this.data.names?.[identity] ?? '';
  }

  /** The names members of the private groups go by, by identity (GroupData.names). */
  saidNames(): Readonly<Record<string, string>> {
    return this.data.names ?? {};
  }

  /** Locks a group with a PIN of its own here, as kept (lock/chat-pin.ts); null takes it off. */
  setPin(id: string, pin: ChatPin | null): Promise<void> {
    return this.run(async () => {
      const group = this.find(id);
      if (!group) throw new Error(t('This group is not here.'));
      const { pin: _was, ...rest } = group;
      await this.save(this.withGroup(pin ? { ...rest, pin } : rest));
      this.changed();
    });
  }

  /** The PIN a group opens with here, as kept, or null when it has none. */
  pinOf(id: string): ChatPin | null {
    return this.find(id)?.pin ?? null;
  }

  /** Gives a group notifications of its own here (lock/chat-notify.ts); null gives it the app's again. */
  setNotify(id: string, notify: ChatNotify | null): Promise<void> {
    return this.run(async () => {
      const group = this.find(id);
      if (!group) throw new Error(t('This group is not here.'));
      const { notify: _was, ...rest } = group;
      const kept = checkedChatNotify(notify);
      await this.save(this.withGroup(kept ? { ...rest, notify: kept } : rest));
      this.changed();
    });
  }

  /** A group's own notifications here, or null when it has none. */
  notifyOf(id: string): ChatNotify | null {
    return this.find(id)?.notify ?? null;
  }

  /** Gives a group a look of its own here (theme/look.ts); null gives it the space's again. */
  setLook(id: string, look: Look | null): Promise<void> {
    return this.run(async () => {
      const group = this.find(id);
      if (!group) throw new Error(t('This group is not here.'));
      const { look: _was, ...rest } = group;
      await this.save(this.withGroup(look ? { ...rest, look: checkedLook(look) } : rest));
      this.changed();
    });
  }

  /** Marks a group read up to now, and tells the members whose messages came since that they were read here. */
  markRead(id: string, transport?: GroupTransport): Promise<void> {
    return this.run(async () => {
      const group = this.find(id);
      if (!group) return;
      const unread = group.messages.some((m) => m.from && !m.note && m.at > group.readAt);
      // What came since this phone last told their senders it read them, each tag with its sender.
      const since = group.seenAt ?? group.readAt;
      const read = new Map(group.messages.filter((m) => m.from && !m.note && m.tag && m.at > since).map((m) => [m.tag, m.from]));
      const now = Date.now();
      await this.save(this.withGroup({ ...group, readAt: now, seenAt: now }));
      this.changed();
      const link = this.through();
      // On a linked device, read on the phone too, which tells them.
      if (link) {
        if (unread) await link.ask(id, { t: 'read' });
        return;
      }
      if (read.size === 0) return;
      const waiting = this.gotWaiting.get(id);
      for (const tag of read.keys()) waiting?.tags.delete(tag);
      const by = transport ?? waiting?.transport ?? this.lastTransport;
      if (by) await this.tellSeen(id, new Map(), read, by).catch(() => undefined);
    });
  }

  /**
   * Lets go of the groups as their space or hidden place closes: what came and waits to be told to
   * its senders is not told, as another copy may be opened from what is kept, and two must never
   * seal for one group.
   */
  close(): void {
    this.closed = true;
    if (this.gotTimer) clearTimeout(this.gotTimer);
    this.gotTimer = null;
    this.gotWaiting.clear();
  }

  /** Tells the senders of the members' messages that came here that they came, now rather than a while after. */
  tellGot(): Promise<void> {
    if (this.gotTimer) clearTimeout(this.gotTimer);
    this.gotTimer = null;
    return this.run(async () => {
      const waiting = [...this.gotWaiting];
      this.gotWaiting.clear();
      for (const [id, { tags, transport }] of waiting) await this.tellSeen(id, tags, new Map(), transport).catch(() => undefined);
    });
  }

  // Tells the sender of a member's message, a while after, that it came here, with the others that came meanwhile.
  private gotLater(id: string, from: string, tag: string, transport: GroupTransport) {
    if (!tag || this.closed || !this.personal(id)) return;
    const waiting = this.gotWaiting.get(id) ?? { tags: new Map<string, string>(), transport };
    waiting.tags.set(tag, from);
    waiting.transport = transport;
    this.gotWaiting.set(id, waiting);
    if (this.gotTimer) return;
    this.gotTimer = setTimeout(() => void this.tellGot().catch(() => undefined), GOT_AFTER);
  }

  // Tells the members whose messages these are, each tag with its sender, which came here (`got`) and
  // which were read here (`read`), in group messages only they get, by the one leaf each has there.
  private async tellSeen(id: string, got: Map<string, string>, read: Map<string, string>, transport: GroupTransport) {
    const group = this.find(id);
    if (!group || group.status !== 'in' || this.closed || !this.personal(id) || !this.data.state) return;
    const members = await this.membersIn(id);
    const leaves = new Map<string, number>();
    for (const m of members) if (!m.me && m.about) leaves.set(m.about.id, (leaves.get(m.about.id) ?? 0) + 1);
    const reached = ([tag, sender]: [string, string]) => leaves.get(sender) === 1 && !!tag;
    const gotTags = [...got].filter((entry) => !read.has(entry[0]) && reached(entry));
    const readTags = [...read].filter(reached);
    for (let i = 0; i < Math.max(gotTags.length, readTags.length) && !this.closed; i += MAX_SEEN_TAGS) {
      const gotNow = gotTags.slice(i, i + MAX_SEEN_TAGS);
      const readNow = readTags.slice(i, i + MAX_SEEN_TAGS);
      const to = new Set([...gotNow, ...readNow].map(([, sender]) => sender));
      const seen: Seen = { t: 'seen', got: gotNow.map(([tag]) => tag), read: readNow.map(([tag]) => tag) };
      const sealed = await core.group.seal(this.kept(), fromHex(id), encodeSaid(seen));
      const now = this.find(id)!;
      const apart = (now.apart ?? 0) + 1;
      // So many went to some only that this one goes to all: no member falls further behind.
      const all = apart > APART_MOST;
      await this.save({ ...this.withGroup(all ? withoutApart(now) : { ...now, apart }), state: toBase64(sealed.state) });
      await this.deliver(id, all ? members : members.filter((m) => !!m.about && to.has(m.about.id)), sealed.message, transport);
    }
  }

  /** Makes a group named `name` and asks each contact (by identity) to join. Returns its id. */
  create(name: string, identities: string[], transport: GroupTransport): Promise<string> {
    return this.run(async () => {
      const clean = cleanGroupName(name);
      if (!clean) throw new Error(t('Give the group a name.'));
      const made = await core.group.newGroup(await this.state());
      const id = toHex(made.id);
      const group: Group = {
        id,
        name: clean,
        admin: true,
        status: 'in',
        asked: [],
        later: [],
        outbox: [],
        messages: [{ at: Date.now(), from: '', text: mark('You made the group.'), tag: '', note: true }],
        readAt: Date.now(),
        keysAt: Date.now(),
      };
      await this.save({ ...this.withGroup(group), state: toBase64(made.state) });
      this.changed();
      await this.askLocked(id, identities, transport);
      return id;
    });
  }

  /** Asks more contacts to join a group this phone is the admin of. */
  add(id: string, identities: string[], transport: GroupTransport): Promise<void> {
    return this.run(() => this.askLocked(id, identities, transport));
  }

  private async askLocked(id: string, identities: string[], transport: GroupTransport) {
    const group = this.find(id);
    if (!group?.admin || group.status !== 'in') throw new Error(t('Only the group’s admin adds members.'));
    const fresh = identities.filter((identity) => !group.asked.includes(identity));
    const link = this.through();
    if (link) {
      if (fresh.length > 0) await link.ask(id, { t: 'add', identities: fresh });
      return;
    }
    await this.save(this.withGroup({ ...group, asked: [...group.asked, ...fresh] }));
    this.changed();
    for (const identity of fresh) await transport.signal(identity, { group: id, kind: 'ask' });
  }

  /** Sends a message to the group, with what it is or carries beyond its words (`parts`); with `tag`, the one a linked device kept it by. */
  send(id: string, text: string, transport: GroupTransport, parts: GroupParts = {}, tag = newTag()): Promise<void> {
    return this.run(async () => {
      const group = this.find(id);
      if (!group || group.status !== 'in') throw new Error(t('You are not in this group any more.'));
      const said = text.trim().slice(0, MAX_GROUP_TEXT);
      if (!said) return;
      const carried = groupPartsOf(parts, true);
      const link = this.through();
      if (link) await link.ask(id, { t: 'text', text: said, tag, ...(Object.keys(carried).length > 0 ? { parts: carried } : {}) });
      else await this.broadcast(id, encodeSaid({ t: 'text', text: said, tag, ...carried }), transport, 'message');
      const now = this.find(id)!;
      await this.save(this.withGroup({ ...now, messages: this.trimmed([...now.messages, { at: Date.now(), from: '', text: said, tag, ...carried }]), readAt: Date.now() }));
      this.changed();
    });
  }

  /**
   * Says something of a message, for every member: our reaction, a pin, our vote, or editing or
   * deleting our own. Returns the message as it was, or null when it changes nothing.
   */
  mark(id: string, marked: Marked, transport: GroupTransport): Promise<GroupMessage | null> {
    return this.run(async () => {
      const group = this.find(id);
      if (!group || group.status !== 'in') throw new Error(t('You are not in this group any more.'));
      const before = group.messages.find((m) => !m.note && m.tag === marked.tag) ?? null;
      if (!withMarked(group.messages, '', marked, Date.now())) return null;
      const link = this.through();
      if (link) await link.ask(id, { t: 'mark', marked });
      else await this.broadcast(id, encodeSaid(marked), transport);
      const now = this.find(id)!;
      const messages = withMarked(now.messages, '', marked, Date.now());
      if (messages) await this.save(this.withGroup({ ...now, messages }));
      this.changed();
      return before;
    });
  }

  /** Stars a message, or takes the star off, on this phone only. */
  star(id: string, tag: string, on: boolean): Promise<void> {
    return this.run(async () => {
      const group = this.find(id);
      if (!group || !tag) return;
      const messages = group.messages.map((m) => {
        if (m.note || m.tag !== tag) return m;
        const next: GroupMessage = { ...m, starred: true };
        if (!on) delete next.starred;
        return next;
      });
      await this.save(this.withGroup({ ...group, messages }));
      this.changed();
    });
  }

  /** Deletes a message on this phone only; the members keep theirs. */
  deleteHere(id: string, tag: string): Promise<void> {
    return this.run(async () => {
      const group = this.find(id);
      if (!group || !tag) return;
      await this.save(this.withGroup({ ...group, messages: group.messages.filter((m) => m.note || m.tag !== tag) }));
      this.changed();
    });
  }

  /**
   * Sends a photo or file, or with `ms` a voice message, to the group: `offer` says where it is on
   * our relay and its key, and `ref` where it is kept here. With `parts`, what it answers, or that
   * it is forwarded; with `tag`, the one a linked device kept it by. Where it is on our relay is
   * kept, to take it off when it is deleted for everyone.
   */
  sendFile(id: string, ref: FileRef, offer: FileOffer, ms: number | undefined, transport: GroupTransport, parts: GroupParts = {}, tag = newTag()): Promise<void> {
    return this.run(async () => {
      const group = this.find(id);
      if (!group || group.status !== 'in') throw new Error(t('You are not in this group any more.'));
      const voice = ms === undefined ? {} : { ms: Math.round(ms) };
      const carried = groupPartsOf(parts, false);
      const link = this.through();
      if (link) await link.ask(id, { t: 'file', file: offer, tag, ...voice, ...(Object.keys(carried).length > 0 ? { parts: carried } : {}) });
      else await this.broadcast(id, encodeSaid({ t: 'file', file: offer, tag, ...voice, ...carried }), transport, 'message');
      const now = this.find(id)!;
      const kept = { at: Date.now(), from: '', text: '', tag, file: ref, ...voice, ...carried, put: offer.ids };
      await this.save(this.withGroup({ ...now, messages: this.trimmed([...now.messages, kept]), readAt: Date.now() }));
      this.changed();
    });
  }

  /** Keeps where a file that came is, once it is taken from the relay. False if its message is gone. */
  setFile(id: string, file: FileRef): Promise<boolean> {
    return this.run(async () => {
      const group = this.find(id);
      const was = group?.messages.find((m) => m.file?.id === file.id)?.file;
      if (!group || !was) return false;
      await this.save(this.withGroup({ ...group, messages: group.messages.map((m) => (m.file?.id === file.id ? { ...m, file } : m)) }));
      this.changed();
      // On a linked device the phone hears of it: a copy it put on the relay for this device goes then.
      if (was.from) this.through()?.took(was.from);
      return true;
    });
  }

  /** Says something about a group call: to the member `signal.to` names, or else to every member. */
  call(id: string, signal: GroupCallSignal, transport: GroupTransport): Promise<void> {
    return this.run(async () => {
      if (this.through()) throw new Error(t('Group calls ring on the phone that holds this account, for now. Call from there.'));
      if (this.find(id)?.status !== 'in') throw new Error(t('You are not in this group any more.'));
      const sealed = await core.group.seal(this.kept(), fromHex(id), encodeSaid({ t: 'call', call: signal }));
      await this.save({ ...this.data, state: toBase64(sealed.state) });
      const members = await this.membersIn(id);
      const to = 'to' in signal ? members.filter((m) => m.about?.id === signal.to) : members;
      // Only `start` and `leave` are worth sending again later: the rest is stale by then. A call
      // that starts rings.
      if (signal.kind === 'start' || signal.kind === 'leave') await this.deliver(id, to, sealed.message, transport, false, signal.kind === 'start' ? 'ring' : 'quiet');
      else {
        for (const member of to) {
          if (member.me || !member.about) continue;
          await transport.post(member.about, await this.sealFor(member.about, sealed.message), 'quiet').catch(() => undefined);
        }
      }
    });
  }

  /**
   * Asks a member of a group for its contact link, in a group message only it gets, and gives it
   * this account's: if it sends its own, each phone adds the other. One who asked this phone first
   * is answered instead. Asks no one who is a contact already, nor anyone again before ASK_AGAIN,
   * nor a member whose id another leaf says too. `now` for checks.
   */
  askContact(id: string, member: string, transport: GroupTransport, now = Date.now()): Promise<void> {
    return this.run(async () => {
      const group = this.contactGroup(id);
      const contacts = transport.contacts;
      if (!contacts) return;
      // Who this phone is now: the contacts of a space opened meanwhile are not this account's.
      const me = (await this.me()).id;
      if (await contacts.has(me, member)) return;
      if (openAsks(group, now).some((a) => a.id === member)) return this.answerLocked(id, member, transport, me, now);
      if (freshWants(group, now).some((w) => w.id === member && now - w.at < ASK_AGAIN)) return;
      const leaves = await this.leavesOf(id, member);
      if (leaves.length === 0) throw new Error(t('They are not in this group any more.'));
      if (leaves.length > 1) throw notOne();
      // Kept before it goes, so an answer that comes at once finds it.
      await this.save(this.withGroup(withContactAsks(group, [...(group.wants ?? []).filter((w) => w.id !== member), { id: member, at: now }], group.asks, now)));
      await this.sendContact(id, leaves, member, false, transport, me);
      await this.note(id, 'asked link', member);
    });
  }

  /** Sends this phone's contact link to a member who asked for it (Send): each phone adds the other. */
  answerContact(id: string, member: string, transport: GroupTransport, now = Date.now()): Promise<void> {
    return this.run(async () => {
      this.contactGroup(id);
      if (transport.contacts) await this.answerLocked(id, member, transport, (await this.me()).id, now);
    });
  }

  /** Turns down a member's ask for this phone's contact link (Don't): nothing goes, and its keys are forgotten here. */
  declineContact(id: string, member: string, now = Date.now()): Promise<void> {
    return this.run(async () => {
      const group = this.contactGroup(id);
      if (!openAsks(group, now).some((a) => a.id === member)) return;
      // Only that they asked stays, so their asks show no more until ASK_KEPT from now.
      await this.save(this.withGroup(withContactAsks(group, group.wants, [...(group.asks ?? []).filter((a) => a.id !== member), { id: member, at: now, key: '' }], now)));
      this.changed();
    });
  }

  // A group whose members can be asked for their contact links here: else why not.
  private contactGroup(id: string): Group {
    if (this.through()) throw new Error(t('Ask for contact links on the phone that holds this account.'));
    const group = this.find(id);
    if (!group || group.status !== 'in') throw new Error(t('You are not in this group any more.'));
    if (!this.personal(id)) throw new Error(t('Not in public groups.'));
    return group;
  }

  // The leaves of the member `identity` in a group, but this phone's.
  private async leavesOf(id: string, identity: string): Promise<GroupMember[]> {
    return (await this.membersIn(id)).filter((m) => !m.me && m.about?.id === identity);
  }

  // Sends `member` this phone's contact link, as it asked, and adds it from the keys it gave. To a
  // contact here already, made some other way since it asked, nothing goes, and its ask with it.
  // `me`: who this phone was when Send was tapped.
  private async answerLocked(id: string, member: string, transport: GroupTransport, me: string, now: number) {
    const contacts = transport.contacts!;
    const leaves = await this.leavesOf(id, member);
    const known = await contacts.has(me, member);
    if (known || leaves.length !== 1) {
      const group = this.find(id)!;
      await this.save(this.withGroup(withContactAsks(group, group.wants, group.asks?.filter((a) => a.id !== member), now)));
      this.changed();
      if (known) return;
      throw leaves.length === 0 ? new Error(t('They are not in this group any more.')) : notOne();
    }
    const ask = openAsks(this.find(id)!, now).find((a) => a.id === member);
    if (!ask) return;
    await this.sendContact(id, leaves, member, true, transport, me);
    await this.dropContactAsks(member, now);
    const added = await contacts.add(me, leaves[0].about!, ask.key).then(
      () => true,
      () => false,
    );
    await this.note(id, added ? 'sent link' : 'link failed', member);
  }

  // Lets go of the asks for contact links to and from `identity` in every group, or with `wants`
  // false only those from it: once it is a contact, none is left to add it again later.
  private async dropContactAsks(identity: string, now: number, wants = true): Promise<boolean> {
    const has = (g: Group) => (wants && g.wants?.some((w) => w.id === identity)) || g.asks?.some((a) => a.id === identity);
    if (!this.data.groups.some(has)) return false;
    const groups = this.data.groups.map((g) => (has(g) ? withContactAsks(g, wants ? g.wants?.filter((w) => w.id !== identity) : g.wants, g.asks?.filter((a) => a.id !== identity), now) : g));
    await this.save({ ...this.data, groups });
    return true;
  }

  /**
   * A contact was removed or deleted here: the asks for its contact link, to it and from it, in
   * every group are let go of at once, so none is left to add it again, as one is not added again
   * while the next look at the relay has still to find it is a contact (pruneContactAsks).
   */
  contactRemoved(identity: string): Promise<void> {
    return this.run(async () => {
      if (await this.dropContactAsks(identity, Date.now())) this.changed();
    });
  }

  // Asks for contact links with members the space has as contacts now, made some other way. One
  // from here stays while they are a message request: their first packet can come before their
  // answer, and the answer then accepts them.
  private async pruneContactAsks(transport: GroupTransport) {
    const contacts = transport.contacts;
    const ids = new Set(this.data.groups.flatMap((g) => [...(g.wants ?? []), ...(g.asks ?? [])].map((a) => a.id)));
    if (!contacts || ids.size === 0 || this.through()) return;
    const me = (await this.me()).id;
    const now = Date.now();
    let dropped = false;
    for (const identity of ids) {
      if (await contacts.accepted(me, identity)) dropped = (await this.dropContactAsks(identity, now)) || dropped;
      else if (await contacts.has(me, identity)) dropped = (await this.dropContactAsks(identity, now, false)) || dropped;
    }
    if (dropped) this.changed();
  }

  // Gives the member `to` this account's public keys, in a group message only its leaves get: an
  // ask for its own, or with `back` the answer to its ask. `me`: who this phone is in the group.
  private async sendContact(id: string, leaves: GroupMember[], to: string, back: boolean, transport: GroupTransport, me: string) {
    const key = await transport.contacts!.bundle(me);
    const sealed = await core.group.seal(this.kept(), fromHex(id), encodeSaid({ t: 'contact', to, key, ...(back ? { back: true as const } : {}) }));
    await this.save({ ...this.data, state: toBase64(sealed.state) });
    // An ask shows as unread there, so it is a message; the answer only adds them, quiet.
    await this.deliver(id, leaves, sealed.message, transport, true, back ? 'quiet' : 'message');
  }

  // A member's contact link for this phone, from its leaf `sender`, which says `about` of itself.
  // The answer to an ask from here adds it; an ask waits to be answered (`asks`), once, unless it
  // is from a contact here already. Anything else goes, with nothing to show for it.
  private async contactCame(id: string, sender: number, about: About, said: ContactSaid, transport: GroupTransport) {
    const contacts = transport.contacts;
    if (this.find(id)?.status !== 'in' || !this.personal(id) || !contacts) return;
    const me = (await this.me()).id;
    if (said.to !== me || about.id === me) return;
    // The keys have to be the sender's own.
    const theirs = await core.bundleIdentity(fromBase64Url(said.key)).then(toHex, () => '');
    if (theirs !== about.id) return;
    const from = about.id;
    // From a member still in the group, by the one leaf it has there: one taken out after it wrote
    // is answered nothing, and two leaves that say one id are one who is not it.
    const leaves = await this.leavesOf(id, from);
    if (leaves.length !== 1 || leaves[0].leaf !== sender) return;
    // Someone blocked here: dropped, shown nowhere, and never added, though it was asked from here.
    if (await contacts.blocked(me, from)) return;
    const now = Date.now();
    // A contact made some other way meanwhile: what was asked goes, and nothing adds it again.
    if ((await contacts.accepted(me, from)) && (await this.dropContactAsks(from, now))) this.changed();
    const group = this.find(id)!;
    if (freshWants(group, now).some((w) => w.id === from)) {
      // Asked from here: crossed with ours, or after a Don't taken back, or again after the card
      // went. Such an ask is answered first, so they add this phone too.
      if (!said.back) await this.sendContact(id, leaves, from, true, transport, me);
      await this.dropContactAsks(from, now);
      const added = await contacts.add(me, about, said.key).then(
        () => true,
        () => false,
      );
      // A note, not a member's message: the group's screen follows it (note calls changed), and no
      // notice says a message came, as the sender marked the answer quiet.
      await this.note(id, added ? 'got link' : 'link failed', from);
      return;
    }
    // An answer to nothing asked from here; or an ask from a contact here already, whom showing
    // it would tell that this phone keeps them somewhere else than the space.
    if (said.back || (await contacts.has(me, from))) return;
    const asks = group.asks ?? [];
    const was = asks.find((a) => a.id === from && now - a.at < ASK_KEPT);
    // Turned down: nothing more from them until ASK_KEPT has gone by.
    if (was && !was.key) return;
    if (was) {
      // Asked again while the first waits: the newer keys, and nothing more to show.
      await this.save(this.withGroup(withContactAsks(group, group.wants, asks.map((a) => (a === was ? { ...a, key: said.key } : a)), now)));
      return;
    }
    // A flood of asks pushes out none that waits.
    if (openAsks(group, now).length >= MAX_ASKS) return;
    await this.save(this.withGroup(withContactAsks(group, group.wants, [...asks.filter((a) => a.id !== from), { id: from, at: now, key: said.key }], now)));
    await this.note(id, 'asks link', from);
    this.messageListeners.forEach((listener) => listener(id));
  }

  /** Keeps a line in a group, such as how a call went. */
  line(id: string, text: string): Promise<void> {
    return this.run(() => this.note(id, text));
  }

  /** Renames a group this phone is the admin of, for every member. */
  rename(id: string, name: string, transport: GroupTransport): Promise<void> {
    return this.run(async () => {
      const group = this.find(id);
      if (!group?.admin || group.status !== 'in') throw new Error(t('Only the group’s admin renames it.'));
      const clean = cleanGroupName(name);
      if (!clean) throw new Error(t('Give the group a name.'));
      const link = this.through();
      if (link) return link.ask(id, { t: 'name', name: clean });
      await this.broadcast(id, encodeSaid({ t: 'name', name: clean }), transport);
      await this.save(this.withGroup({ ...this.find(id)!, name: clean }));
      this.changed();
    });
  }

  /** Takes a member out of a group this phone is the admin of. */
  remove(id: string, leaf: number, transport: GroupTransport): Promise<void> {
    return this.run(async () => {
      const group = this.find(id);
      if (!group?.admin || group.status !== 'in') throw new Error(t('Only the group’s admin takes members out.'));
      const link = this.through();
      if (link) return link.ask(id, { t: 'remove', leaf });
      const before = await this.membersIn(id);
      const removed = await core.group.remove(this.kept(), fromHex(id), leaf);
      await this.save({ ...this.data, state: toBase64(removed.state) });
      // Everyone who was in, the member taken out too, so its phone knows.
      await this.deliver(id, before, removed.commit, transport);
      const gone = before.find((m) => m.leaf === leaf)?.about?.id ?? '';
      await this.note(id, 'left', gone);
    });
  }

  /** Asks the admin to take this phone out of a group; the admin forgets it here once out. */
  leave(id: string, transport: GroupTransport): Promise<void> {
    return this.run(async () => {
      const group = this.find(id);
      if (!group || group.status !== 'in') return;
      const link = this.through();
      if (link) return link.ask(id, { t: 'leave' });
      if (group.admin) {
        // The admin cannot be taken out by anyone: the group ends for every member.
        const before = await this.membersIn(id);
        for (const member of before.filter((m) => !m.me)) {
          const removed = await core.group.remove(this.kept(), fromHex(id), member.leaf);
          await this.save({ ...this.data, state: toBase64(removed.state) });
          await this.deliver(id, await this.membersIn(id).then((now) => [...now, member]), removed.commit, transport);
        }
        await this.out(id, mark('You closed the group.'));
        return;
      }
      const left = await core.group.leave(this.kept(), fromHex(id));
      await this.save({ ...this.withGroup({ ...group, status: 'leaving' }), state: toBase64(left.state) });
      await this.deliver(id, await this.membersIn(id), left.message, transport);
      await this.note(id, mark('You asked to leave. The group closes here once the admin takes you out.'));
    });
  }

  /** Forgets a group on this phone, with its messages. */
  forget(id: string): Promise<void> {
    return this.run(async () => {
      // On a linked device the phone forgets it too: else it would say it again.
      await this.through()?.ask(id, { t: 'forget' });
      if (this.data.state) {
        const state = await core.group.forget(this.kept(), fromHex(id));
        this.data = { ...this.data, state: toBase64(state) };
      }
      await this.save({ ...this.data, groups: this.data.groups.filter((g) => g.id !== id) });
      this.changed();
    });
  }

  /** Tries again what the relay did not take, and lets go of asks for contact links with members
   *  who are contacts now. */
  flush(transport: GroupTransport): Promise<void> {
    return this.run(async () => {
      for (const group of this.data.groups) {
        if (group.outbox.length === 0) continue;
        const left: Group['outbox'] = [];
        for (const item of group.outbox) {
          try {
            await transport.post(item.to, fromBase64(item.packet), item.mark);
          } catch {
            left.push(item);
          }
        }
        if (left.length !== group.outbox.length) await this.save(this.withGroup({ ...this.find(group.id)!, outbox: left }));
      }
      await this.pruneContactAsks(transport).catch(() => undefined);
    });
  }

  /**
   * Makes this phone's keys new in each group it is in where they are due (RENEW_EVERY): as the
   * admin, with a commit of its own; as a member, by asking the admin. `now` for checks.
   */
  renewKeys(transport: GroupTransport, now = Date.now()): Promise<void> {
    return this.run(async () => {
      if (!core.canRenewGroups() || !this.data.state || this.through()) return;
      for (const { id } of this.data.groups) {
        const group = this.find(id);
        if (!group || group.status !== 'in' || now - Math.max(group.keysAt ?? 0, group.renewing ?? 0) < RENEW_EVERY) continue;
        try {
          if (group.admin) await this.selfUpdate(id, transport);
          else await this.askRenewal(id, transport);
        } catch {
          // Tried again once RENEW_EVERY has gone by.
          const failed = this.find(id);
          if (failed) await this.save(this.withGroup({ ...failed, renewing: Date.now() }));
        }
      }
    });
  }

  /**
   * Has this phone make its keys new, with the next renewKeys, in each private group it is in
   * (`group`), or each public one: each then says where this phone's group messages come to now
   * (lib/queue-move.ts), as a member asks the admin with what it says now, and an admin's own
   * commit says it too, with a core that can (core.canSetGroupAbout). `members`: only in those it
   * is a member of, not their admin, as after a backup was put back: a member whose group moved on
   * since asks from the epoch it has, which the admin still opens a few epochs on (PAST_EPOCHS in
   * crates/erevos-group), and is put in anew; an admin's own commit from an epoch gone by would
   * only take it further from its members.
   */
  renewAgain(kind: 'group' | 'public', members = false): Promise<void> {
    return this.run(async () => {
      if (!this.data.state || this.through()) return;
      const due = (g: Group) => g.status === 'in' && this.isPublic(g.id) === (kind === 'public') && !(members && g.admin);
      if (!this.data.groups.some(due)) return;
      const groups = this.data.groups.map((g) => {
        if (!due(g)) return g;
        const { renewing: _renewing, ...rest } = g;
        return { ...rest, keysAt: 0 };
      });
      await this.save({ ...this.data, groups });
    });
  }

  /** The queues this phone says its group messages come to, in its own leaf of each group it is in, by sender id; and those it said before the groups were handed on, a while (S6). */
  ownSenders(now = Date.now()): Promise<Set<string>> {
    return this.run(async () => {
      const senders = this.through() ? new Set<string>() : await this.sendersNow();
      for (const l of this.data.left ?? []) if (l.at >= now - LEFT_SENDERS_LAST) senders.add(l.sender);
      return senders;
    });
  }

  private async sendersNow(): Promise<Set<string>> {
    const senders = new Set<string>();
    if (!this.data.state) return senders;
    for (const g of this.data.groups) {
      if (g.status === 'out') continue;
      try {
        const json = JSON.parse(utf8Decode(await core.group.members(this.kept(), fromHex(g.id)))) as { own: number; members: { leaf: number; about: string }[] };
        const mine = json.members.find((m) => m.leaf === json.own);
        const sender = mine ? (JSON.parse(mine.about) as { sender?: unknown }).sender : undefined;
        if (typeof sender === 'string') senders.add(sender);
      } catch {
        // A group the core no longer has, or a leaf that is not what an Erevos says.
      }
    }
    return senders;
  }


  // On the admin's phone: new keys for its own leaf, in a commit that also takes out whoever asked
  // to leave, saying where this phone's group messages come to now when the core can.
  private async selfUpdate(id: string, transport: GroupTransport) {
    const before = await this.membersIn(id);
    const about = core.canSetGroupAbout() ? await this.renewedAbout(id) : undefined;
    const made = await core.groupKeys.selfUpdate(this.kept(), fromHex(id), about);
    const { renewing: _, ...group } = this.find(id)!;
    await this.save({ ...this.withGroup({ ...group, keysAt: Date.now() }), state: toBase64(made.state) });
    // Everyone who was in, those taken out too.
    await this.deliver(id, before, made.commit, transport);
    const after = new Set((await this.membersIn(id)).map((m) => m.about?.id ?? ''));
    for (const m of before) if (m.about && !after.has(m.about.id)) await this.note(id, 'left', m.about.id);
    await this.committed(id, transport);
  }

  // Whether the admin's leaf says the same id in `state` as in the state kept, and in a public group
  // signs with the same key: what it says of where it reads may change, who it is never does.
  private async keeperStays(id: string, state: Uint8Array): Promise<boolean> {
    const keeper = await this.keeperLeaf(id);
    const seat = async (of: Uint8Array) => {
      const json = JSON.parse(utf8Decode(await core.group.members(of, fromHex(id)))) as { members: { leaf: number; about: string; key?: string }[] };
      const found = json.members.find((m) => m.leaf === keeper);
      if (!found) return null;
      const said = (() => {
        try {
          return (JSON.parse(found.about) as { id?: unknown }).id;
        } catch {
          return undefined;
        }
      })();
      return { id: typeof said === 'string' ? said : '', key: found.key ?? '' };
    };
    const was = await seat(this.kept());
    if (!was) return true;
    const now = await seat(state);
    return !!now && now.id === was.id && (!this.isPublic(id) || now.key === was.key);
  }

  // On a member's phone: asks the admin, in a group message only it gets, to put it in anew with
  // a key package made for that.
  private async askRenewal(id: string, transport: GroupTransport) {
    const keeper = await this.keeperLeaf(id);
    const admin = (await this.membersIn(id)).find((m) => m.leaf === keeper && !m.me && m.about);
    if (!admin) throw new Error('No admin to ask.');
    const made = await core.groupKeys.renewal(this.kept(), fromHex(id), await this.renewedAbout(id));
    const sealed = await core.group.seal(made.state, fromHex(id), encodeSaid({ t: 'renew', kp: toBase64(made.keyPackage) }));
    await this.save({ ...this.withGroup({ ...this.find(id)!, renewing: Date.now() }), state: toBase64(sealed.state) });
    await this.deliver(id, [admin], sealed.message, transport, true);
  }

  // On the admin's phone: a member asks to be put in anew with `keyPackage`, from the leaf
  // `sender` in the epoch it wrote in. Its leaf is the one that says the same id now; the core
  // takes the key package only if that leaf signs with its key.
  private async renewMember(id: string, sender: number, from: string, keyPackage: Uint8Array, members: GroupMember[], transport: GroupTransport) {
    if (!core.canRenewGroups() || this.unreached(id).has(from)) return;
    let about: About | null;
    try {
      about = aboutOf((await core.publicGroup.packageAbout(keyPackage)).about);
    } catch {
      return;
    }
    if (!about || about.id !== from) return;
    const leaves = [...new Set([...members.filter((m) => !m.me && m.about?.id === from).map((m) => m.leaf), sender])];
    for (const leaf of leaves) {
      let made: Awaited<ReturnType<typeof core.groupKeys.renew>>;
      try {
        made = await core.groupKeys.renew(this.kept(), fromHex(id), leaf, keyPackage);
      } catch {
        continue;
      }
      await this.save({ ...this.data, state: toBase64(made.state) });
      // The welcome first, to where it says it is now; then the commit, to everyone who was in.
      await this.deliver(id, [{ leaf: -1, about, me: false }], encodeRenewed(id, made.welcome), transport, true);
      await this.deliver(id, members, made.commit, transport);
      await this.committed(id, transport);
      return;
    }
  }

  // On a member's phone: the admin's welcome after it asked for new keys. The group as it is now
  // takes the place of the one here, then what waited for it opens.
  private async rejoined(id: string, welcome: Uint8Array, transport: GroupTransport) {
    const group = this.find(id);
    if (!group || group.status !== 'in' || !group.renewing || !core.canRenewGroups()) return;
    let state: Uint8Array;
    try {
      state = await core.groupKeys.rejoin(this.kept(), fromHex(id), welcome);
    } catch {
      return;
    }
    const { renewing: _, ...rest } = group;
    await this.save({ ...this.withGroup({ ...rest, keysAt: Date.now(), later: [] }), state: toBase64(state) });
    await this.committed(id, transport);
    for (const waiting of group.later) await this.openLocked(fromBase64(waiting), transport);
    this.changed();
  }

  // Seals `text` for the group and sends it to every other member, saying what it carries (`mark`).
  private async broadcast(id: string, text: Uint8Array, transport: GroupTransport, mark: Mark = 'quiet') {
    const sealed = await core.group.seal(this.kept(), fromHex(id), text);
    const group = this.find(id);
    await this.save({ ...(group?.apart ? this.withGroup(withoutApart(group)) : this.data), state: toBase64(sealed.state) });
    await this.deliver(id, await this.membersIn(id), sealed.message, transport, false, mark);
  }

  // Sends one MLS message to each of `members` but this phone, sealed for each, and with `all`
  // those sent nothing more too, saying what it carries (`mark`). What the relay does not take
  // waits in the group's outbox, with its mark.
  protected async deliver(id: string, members: GroupMember[], message: Uint8Array, transport: GroupTransport, all = false, mark: Mark = 'quiet') {
    const failed: Group['outbox'] = [];
    const skip = all ? new Set<string>() : this.unreached(id);
    for (const member of members) {
      if (member.me || !member.about || skip.has(member.about.id)) continue;
      const packet = await this.sealFor(member.about, message);
      try {
        await transport.post(member.about, packet, mark);
      } catch {
        failed.push({ to: member.about, packet: toBase64(packet), mark });
      }
    }
    const group = this.find(id);
    if (failed.length > 0 && group) await this.save(this.withGroup({ ...group, outbox: [...group.outbox, ...failed].slice(-MAX_OUTBOX) }));
  }

  private async sealFor(about: About, message: Uint8Array): Promise<Uint8Array> {
    const sealed = await core.relaySeal(fromBase64Url(about.seal), NO_SENDER, message);
    const packet = new Uint8Array(2 + sealed.length);
    packet.set(GROUP_PACKET, 0);
    packet.set(sealed, 2);
    return packet;
  }

  protected trimmed(messages: GroupMessage[]): GroupMessage[] {
    return messages.slice(-MAX_GROUP_MESSAGES);
  }

  // Adds a note to a group: who joined or left (by identity), or a text of its own. A member who
  // left takes its asks for contact links with it, both ways.
  protected async note(id: string, what: string, who?: string) {
    const found = this.find(id);
    if (!found || who === '') return;
    const text = who === undefined ? what : `${who}|${what}`;
    const group = what === 'left' && who ? withContactAsks(found, found.wants?.filter((w) => w.id !== who), found.asks?.filter((a) => a.id !== who), Date.now()) : found;
    await this.save(this.withGroup({ ...group, messages: this.trimmed([...group.messages, { at: Date.now(), from: '', text, tag: '', note: true }]) }));
    this.changed();
  }

  protected async out(id: string, text: string) {
    const group = this.find(id);
    if (!group) return;
    if (this.data.state) {
      const state = await core.group.forget(this.kept(), fromHex(id));
      this.data = { ...this.data, state: toBase64(state) };
    }
    await this.save(this.withGroup({ ...withContactAsks(group, [], [], 0), status: 'out', asked: [], later: [], outbox: [] }));
    await this.note(id, text);
  }

  /**
   * A group signal from a contact's chat. `request`: they are a message request, and get nothing.
   */
  signal(identity: string, signal: GroupSignal, request: boolean, transport: GroupTransport): Promise<void> {
    return this.run(async () => {
      const link = this.through();
      if (link?.passSignal && !this.data.state) return link.passSignal(identity, signal, request);
      if (request) return;
      if (signal.kind === 'ask') {
        const given = `${signal.group}:${identity}`;
        if (this.find(signal.group) || this.data.given.includes(given) || this.data.given.length >= MAX_GIVEN) return;
        const made = await core.group.keyPackage(await this.state());
        await this.save({ ...this.data, state: toBase64(made.state), given: [...this.data.given, given].slice(-MAX_GIVEN) });
        await transport.signal(identity, { group: signal.group, kind: 'keys', data: made.keyPackage });
        return;
      }
      if (signal.kind === 'keys') {
        const group = this.find(signal.group);
        if (!group?.admin || group.status !== 'in' || !group.asked.includes(identity)) return;
        // The key package has to say the contact it came from: else a contact could join as
        // someone else, and be asked for contact links as them.
        if (core.canPublicGroup()) {
          const about = await core.publicGroup.packageAbout(signal.data).then(
            (made) => aboutOf(made.about),
            () => null,
          );
          if (about?.id !== identity) return;
        }
        const before = await this.membersIn(group.id);
        const added = await core.group.add(this.kept(), fromHex(group.id), signal.data);
        await this.save({ ...this.withGroup({ ...group, asked: group.asked.filter((i) => i !== identity) }), state: toBase64(added.state) });
        // The welcome first: whatever the others then write comes after it.
        await transport.signal(identity, { group: group.id, kind: 'welcome', data: added.welcome, name: group.name });
        await this.deliver(group.id, before, added.commit, transport);
        await this.note(group.id, 'joined', identity);
        return;
      }
      // A welcome: only from the contact this phone gave a key package for the group.
      if (this.find(signal.group)?.status === 'in' || !this.data.given.includes(`${signal.group}:${identity}`)) return;
      const joined = await core.group.join(await this.state(), signal.data);
      if (toHex(joined.id) !== signal.group || !isGroupId(signal.group)) return;
      // Its admin, at leaf 0, has to be the contact who asked this phone in: else a contact could
      // make a group as someone else, and be asked for contact links as them.
      const admin = (await this.membersIn(signal.group, joined.state)).find((m) => m.leaf === 0);
      if (admin?.about?.id !== identity) return;
      const group: Group = {
        id: signal.group,
        name: signal.name || 'Group',
        admin: false,
        status: 'in',
        asked: [],
        later: [],
        outbox: [],
        messages: [{ at: Date.now(), from: '', text: `${identity}|added you`, tag: '', note: true }],
        readAt: 0,
        keysAt: Date.now(),
      };
      await this.save({ ...this.withGroup(group), state: toBase64(joined.state), given: this.data.given.filter((g) => !g.startsWith(`${signal.group}:`)) });
      this.changed();
      // What came for it before the welcome.
      const orphans = this.data.orphans;
      await this.save({ ...this.data, orphans: [] });
      for (const orphan of orphans) await this.openLocked(fromBase64(orphan), transport);
    });
  }

  /** A group message from the relay. Says whether it was one for this phone. */
  receive(packet: Uint8Array, transport: GroupTransport): Promise<boolean> {
    return this.run(async () => {
      if (!isGroupPacket(packet)) return false;
      // Held on another device: it goes there.
      const link = this.through();
      if (link?.pass && !this.data.seal) {
        await link.pass(packet);
        return true;
      }
      if (!this.data.seal) return false;
      this.lastTransport = transport;
      let message: Uint8Array;
      try {
        message = (await core.sealOpen(fromBase64(this.data.seal), packet.slice(2))).message;
      } catch {
        return false;
      }
      const renewed = decodeRenewed(message);
      if (renewed) {
        await this.rejoined(renewed.group, renewed.welcome, transport);
        return true;
      }
      if (await this.unsealed(message, transport)) return true;
      await this.openLocked(message, transport);
      return true;
    });
  }

  protected async openLocked(message: Uint8Array, transport: GroupTransport): Promise<void> {
    if (!this.data.state) return;
    let id: string;
    try {
      id = toHex(await core.group.of(message));
    } catch {
      return;
    }
    const group = this.find(id);
    if (!group || group.status === 'out') {
      if (!group) await this.save({ ...this.data, orphans: [...this.data.orphans, toBase64(message)].slice(-MAX_ORPHANS) });
      return;
    }
    const before = await this.membersIn(id).catch(() => [] as GroupMember[]);
    let result: Awaited<ReturnType<typeof core.group.open>>;
    try {
      result = await core.group.open(this.kept(), message);
    } catch {
      // Not from the admin, damaged, or not for this phone: nothing to show.
      return;
    }
    const { opened } = result;
    // A commit after which the admin's leaf says another id, or in a public group signs with
    // another key, as an admin that renews its leaf (selfUpdate) never makes: refused, kept nowhere,
    // so its members are never told to write to someone else (lib/queue-move.ts moves only where it reads).
    if (opened.kind === 'changed' && !(await this.keeperStays(id, result.state).catch(() => false))) return;
    await this.save({ ...this.data, state: toBase64(result.state) });
    if (opened.kind === 'message') {
      if (await this.heard(id, opened, message, transport)) return;
      const said = decodeSaid(opened.text);
      const from = aboutOf(opened.about)?.id;
      if (!said || !from) return;
      const now = this.find(id)!;
      if (said.t === 'renew') {
        if (now.admin) await this.renewMember(id, opened.sender, from, fromBase64(said.kp), before, transport);
        return;
      }
      if (said.t === 'call') {
        const signal = said.call;
        // One for a member it names: this phone by what it says of itself in the group (its key
        // there in a public group, lib/public-groups.ts aboutAs), as `call` sends it (above).
        if ('to' in signal && signal.to !== ((await this.membersIn(id)).find((m) => m.me)?.about?.id ?? (await this.me()).id)) return;
        this.callListeners.forEach((listener) => listener(id, from, signal));
        return;
      }
      if (said.t === 'contact') {
        await this.contactCame(id, opened.sender, aboutOf(opened.about)!, said, transport);
        return;
      }
      if (said.t === 'file') {
        // Not taken yet: where to take it from.
        const media = { file: offerRef(said.file), ...(said.ms === undefined ? {} : { ms: said.ms }) };
        const parts = groupPartsOf(said, false);
        await this.save(this.withGroup({ ...now, messages: this.trimmed([...now.messages, { at: Date.now(), from, text: '', tag: said.tag, ...media, ...parts }]) }));
        this.gotLater(id, from, said.tag, transport);
        this.messageListeners.forEach((listener) => listener(id));
        this.changed();
        return;
      }
      if (said.t === 'seen') {
        // From a member still in the group, by the one leaf it has there, of our own messages.
        if (!this.personal(id)) return;
        const leaves = await this.leavesOf(id, from);
        if (leaves.length !== 1 || leaves[0].leaf !== opened.sender) return;
        const group = this.find(id)!;
        const messages = withSeen(group.messages, from, said, Date.now());
        if (!messages) return;
        await this.save(this.withGroup({ ...group, messages }));
        this.changed();
        return;
      }
      if (said.t === 'react' || said.t === 'pin' || said.t === 'vote' || said.t === 'edit' || said.t === 'erase') {
        const messages = withMarked(now.messages, from, said, Date.now());
        if (!messages) return;
        await this.save(this.withGroup({ ...now, messages }));
        const unread = (list: GroupMessage[]) => list.filter((m) => m.from && !m.note && m.at > now.readAt).length;
        if (said.t === 'erase' && unread(messages) < unread(now.messages)) this.goneListeners.forEach((listener) => listener(id));
        this.changed();
        return;
      }
      if (said.t === 'name') {
        // Only the admin names the group.
        if (opened.sender !== 0) return;
        await this.save(this.withGroup({ ...now, name: said.name || now.name }));
      } else {
        const parts = groupPartsOf(said, true);
        await this.save(this.withGroup({ ...now, messages: this.trimmed([...now.messages, { at: Date.now(), from, text: said.text, tag: said.tag, ...parts }]) }));
        this.gotLater(id, from, said.tag, transport);
        // Named only where the words name someone with @: a list alone tells through no mute.
        const named = said.text.includes('@') && !!parts.named?.includes((await this.me()).id);
        this.messageListeners.forEach((listener) => listener(id, named));
      }
      this.changed();
    } else if (opened.kind === 'later') {
      const now = this.find(id)!;
      await this.save(this.withGroup({ ...now, later: [...now.later, toBase64(message)].slice(-MAX_LATER) }));
    } else if (opened.kind === 'changed') {
      const after = await this.membersIn(id);
      const ids = (list: GroupMember[]) => new Set(list.map((m) => m.about?.id ?? ''));
      const had = ids(before);
      const has = ids(after);
      for (const m of after) if (m.about && !had.has(m.about.id) && !m.me) await this.note(id, 'joined', m.about.id);
      for (const m of before) if (m.about && !has.has(m.about.id)) await this.note(id, 'left', m.about.id);
      // What waited for this change.
      const now = this.find(id)!;
      await this.save(this.withGroup({ ...now, later: [] }));
      for (const waiting of now.later) await this.openLocked(fromBase64(waiting), transport);
    } else if (opened.kind === 'renewing') {
      // Put in anew, with new keys: the admin's welcome brings the group back (`rejoined`), and what
      // comes meanwhile waits for it.
    } else if (opened.kind === 'removed') {
      const leaving = this.find(id)?.status === 'leaving';
      // The core forgot the group already.
      await this.save(this.withGroup({ ...withContactAsks(this.find(id)!, [], [], 0), status: 'out', asked: [], later: [], outbox: [] }));
      await this.note(id, leaving ? mark('You left the group.') : mark('You are no longer in the group.'));
    } else if (opened.kind === 'leaving') {
      const now = this.find(id)!;
      if (!now.admin) return;
      const pending = await core.group.commitPending(this.kept(), fromHex(id));
      await this.save({ ...this.data, state: toBase64(pending.state) });
      if (pending.commit.length === 0) return;
      // Everyone who was in, the member leaving too.
      await this.deliver(id, before, pending.commit, transport);
      const gone = before.find((m) => m.leaf === opened.sender)?.about?.id ?? '';
      await this.note(id, 'left', gone);
    }
  }
}

// Every photo, file and voice message the groups keep.
const filesIn = (data: GroupData): FileRef[] => data.groups.flatMap((g) => g.messages.flatMap((m) => (m.file ? [m.file] : [])));

/**
 * A member's name: the one its chat has here (the name given to the contact, or the one they go
 * by), or else the name it goes by in the group (`said`, Groups.saidName) with the start of its key,
 * so two who chose the same are told apart and none passes for another; or the start of its key.
 */
export function memberName(identity: string, contacts: { identity: string; name: string }[], said: (identity: string) => string = () => ''): string {
  const contact = contacts.find((c) => c.identity === identity);
  if (contact?.name) return contact.name;
  const name = said(identity);
  if (name) return `${name} · ${identity.slice(0, 4)}`;
  return contact ? t('contact {id}', { id: identity.slice(0, 8) }) : t('member {id}', { id: identity.slice(0, 8) });
}

/** A note's text as the group shows it, with `name` giving each identity's name. */
export function noteText(text: string, name: (identity: string) => string): string {
  const bar = text.indexOf('|');
  if (bar !== 64) return t(text);
  const who = name(text.slice(0, 64));
  const what = text.slice(65);
  switch (what) {
    case 'added you':
      return t('{who} added you to the group.', { who });
    case 'joined':
      return t('{who} joined.', { who });
    case 'left':
      return t('{who} left.', { who });
    case 'asked link':
      return t('You asked {who} for their contact link.', { who });
    case 'asks link':
      return t('{who} asked for your contact link.', { who });
    case 'sent link':
      return t('You sent {who} your contact link. You are each other’s contacts now.', { who });
    case 'got link':
      return t('{who} sent their contact link. You are each other’s contacts now.', { who });
    case 'link failed':
      return t('{who} could not be added as a contact.', { who });
    default:
      return moderated(who, what) ?? `${who} ${what}`;
  }
}

export { EMPTY_GROUPS };
