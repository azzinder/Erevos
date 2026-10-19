import { deleteChunks, type FileRef } from '../lock/attachment-files';
import { loadDevicesData, MAX_LEFT, MAX_OUTBOX, saveDevicesData, type DevicesData, type Left, type Peer } from '../lock/devices-data';
import type { Contact } from '../lock/e2e-data';
import { isTag, WAITING, type Mark, type Message } from '../lock/history';
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
import { contactLink, type ContactCode } from './contact-code';
import * as core from './core';
import { fromBase64, randomBytes, toBase64, toHex, utf8Decode, utf8Encode } from './crypto';
import { fromBase64Url, OwnCodeError, toBase64Url, type Link, type Where } from './e2e';
import { t } from './i18n';
import { cleanDeviceName, linkCodeLink, linkSafetyCode, parseLinkCode, type LinkCode } from './link-code';
import {
  changedFields,
  encodeEnvelope,
  encodeOne,
  isKept,
  isSignal,
  isWorthTelling,
  mirrorOf,
  onlyCame,
  Parts,
  readPack,
  syncedOf,
  withoutPlace,
  writePack,
  type Envelope,
  type Json,
  type PackEntry,
  type Place,
  type Synced,
} from './link-wire';
import { nearby } from './nearby';
import { announceReceived } from './receiver';
import { fromHex, relayKey, sendMessage, type Relay } from './relay';
import { contactTarget, joinSpaceChats, relayFor, spaceChats, type SpaceChats } from './space-chats';
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
// Three turns keep it straight: the chat's own (E2E), which may wait for this file's; this file's
// (`run`), for the links and their keys, which never waits for the chat; and the work a message
// brings (`act`: the history, sealing for contacts, the relay's file store), which waits for both.

/** The most devices one account links. */
export const MAX_DEVICES = 4;
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
const CONTACT_PREFIX = 'contact:';
// What a message a device wrote may say that need not be tried again: where it reads, that it is
// open, the timer (which went with the contact here), and what came or was read (held for the next).
const QUIET = new Set(['from', 'relay', 'relayKey', 'spare', 'text', 'tag', 'timer', 'timerAt', 'lasts', 'got', 'read', 'on', 'onAt', 'ask', 'quiet', 'due']);

/** Which this space is: the phone that holds the account and has devices linked, a linked device, or neither. */
export type Role = 'primary' | 'linked' | null;

/** A device as Linked devices shows it: on the primary each one; on a linked device, the phone. */
export type DeviceInfo = { id: string; name: string; since: number; heard: number; linked: boolean; history: { done: number } | null };

/** What the links changed in the history: messages deleted, of a chat (`peer`) or one of its messages (`tag`). */
export type LinkedChange = { gone: { peer: string; tag?: string }[] };

/** What of the history a device is brought over: from `since` (milliseconds, 0 for all), or none (null), with photos and files or not. */
export type HistoryChoice = { since: number | null; files: boolean };

type Here = { own: Relay; sends: Relay; place: Place; where: Where };
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
  private later: { c: string; m: Json; tries: number }[] = [];
  // Where this side reads, as last found, said with what goes; and the relay's key, asked once for each relay.
  private at: Place | null = null;
  private keyOf: { url: string; key: string } | null = null;
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
    chats.e2e.useLink(links);
    links.tickTimer = setInterval(() => links.tick(), tick);
    links.tick();
    return links;
  }

  /** Stops, once the space closes. */
  close(): void {
    this.closed = true;
    if (this.tickTimer) clearInterval(this.tickTimer);
    if (this.retryTimer) clearTimeout(this.retryTimer);
    if (this.echoTimer) clearTimeout(this.echoTimer);
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

  /** Waits for the work under way, as the checks do. */
  async settled(): Promise<void> {
    for (let i = 0; i < 20; i++) {
      const [turn, acts, flushing] = [this.turn, this.acts, this.flushing];
      await Promise.all([turn.catch(() => undefined), acts, flushing?.catch(() => undefined)]);
      if (turn === this.turn && acts === this.acts && flushing === this.flushing) return;
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
    const rk = this.keyOf?.url === url ? this.keyOf.key : '';
    const place: Place = { sender: data.ownQueue.senderHex, relay: url, relayKey: rk, spare: this.chats.e2e.spare() };
    this.at = place;
    return { own, sends, place, where: { relay: url, relayKey: rk } };
  }

  private sendPlace(here: Here | null): SendPlace {
    if (!here) return { sends: null, own: null, senderHex: '', here: { relay: '', relayKey: '' }, ownKey: '', relayUp: false };
    return { sends: here.sends, own: here.own, senderHex: here.place.sender, here: here.where, ownKey: here.where.relayKey, relayUp: true };
  }

  // The account's contact link, as the primary's chat shows it.
  private ownLink(): string {
    if (!this.at) return '';
    const { sender, relay, relayKey: rk } = this.at;
    return contactLink({ senderHex: sender, relayUrl: relay, key: toBase64Url(this.chats.e2e.bundle), relayKey: rk || undefined, spare: spareCode(this.chats.e2e.spare()) });
  }

  // Seals an envelope for a peer and puts it in its outbox, in the turn. One the outbox has no room
  // for is not sealed: the peer is behind from then on.
  private async seal(peer: Peer, envelope: Envelope): Promise<Peer> {
    if (peer.outbox.length >= MAX_OUTBOX) return { ...peer, behind: peer.behind || Date.now() };
    let conversation = fromBase64(peer.conversation);
    const outbox = [...peer.outbox];
    for (const bytes of encodeEnvelope(envelope, this.at)) {
      const sealed = await core.seal(conversation, bytes);
      conversation = sealed.conversation;
      outbox.push(toBase64(sealed.packet));
    }
    return { ...peer, conversation: toBase64(conversation), outbox, told: this.at ? JSON.stringify(this.at) : peer.told };
  }

  // Says something to each linked device (on the primary) or to the phone (on a linked device).
  // Returns the devices it was sealed for; the photos and files it tells of (`files`) are left on
  // the relay for them, in the same turn, so this phone taking one meanwhile does not delete it.
  private say(envelope: Envelope | ((peer: Peer) => Envelope), only?: string, files: Leaving[] = []): Promise<string[]> {
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
        const sealed = await this.seal(d, make(d));
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
      const kind = await core.packetKind(packet);
      if (kind === 'first') return this.answered(packet);
      if (kind !== 'following') return null;
      const peers = this.data.primary ? [this.data.primary] : this.data.devices;
      for (const peer of peers) {
        let opened: core.Opened;
        try {
          opened = await core.open(fromBase64(peer.conversation), packet);
        } catch {
          continue;
        }
        const now = Date.now();
        // Kept moved past it before anything else, as the chat keeps its conversations.
        const moved = { ...peer, conversation: toBase64(opened.conversation), heard: now };
        await this.keepPeer(moved);
        const said = this.parts.take(peer.id, opened.plaintext, now);
        if (!said) return { kind: 'taken' as const };
        return this.take(moved, said);
      }
      return null;
    });
  }

  private async keepPeer(peer: Peer): Promise<void> {
    if (this.data.primary?.id === peer.id) await this.save({ ...this.data, primary: peer });
    else await this.save({ ...this.data, devices: this.data.devices.map((d) => (d.id === peer.id ? peer : d)) });
  }

  // A device being linked hears from the phone that took its code: if the secret is the code's,
  // the codes to compare. One that came after the first is not taken: a new code starts again.
  private async answered(packet: Uint8Array): Promise<Awaited<ReturnType<Link['open']>>> {
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
    };
    await this.save({ ...this.data, answer: { peer, account: said.account, code } });
    announce();
    return { kind: 'taken' };
  }

  // What one envelope from a peer says, in the turn. What the chat keeps of the contacts changes
  // in the chat's turn (`contacts`); what the history keeps, in the work after.
  private async take(peer: Peer, said: Envelope & { at?: Place }): Promise<Awaited<ReturnType<Link['open']>>> {
    let moved = peer;
    let place: ((contacts: Contact[]) => Contact[]) | null = null;
    if (said.at && JSON.stringify(said.at) !== JSON.stringify(peer.at)) {
      moved = { ...peer, at: said.at };
      // On a linked device the contacts are written to through the phone's queue.
      if (this.data.primary) {
        const at = said.at;
        place = (contacts) => contacts.map((c) => ({ ...c, sender: at.sender, relay: at.relay, relayKey: at.relayKey, spare: at.spare }));
      }
      await this.keepPeer(moved);
    }
    if (this.data.primary) return this.takeOnDevice(said, place);
    await this.takeOnPrimary(moved, said);
    return { kind: 'taken', ...(place ? { contacts: place } : {}) };
  }

  private async takeOnPrimary(peer: Peer, said: Envelope): Promise<void> {
    // Whatever a device says once linked tells that the codes matched there.
    if (!peer.linked) await this.ready(peer, said.k === 'ready' ? said.name : '');
    else if (said.k === 'ready' && said.name) await this.keepPeer({ ...peer, name: cleanDeviceName(said.name) || peer.name });
    switch (said.k) {
      case 'send':
        this.act(() => this.sendFor(said.c, said.m));
        break;
      case 'add':
        this.act(() => this.addFor(said.code));
        break;
      case 'set':
        this.act(() => this.setFor(said.c, said.change, said.remove === true));
        break;
      case 'took':
        this.act(() => this.letGo(peer.id, said.ids));
        break;
      case 'bye':
        await this.save({ ...this.data, devices: this.data.devices.filter((d) => d.id !== peer.id) });
        this.act(() => this.letGo(peer.id, null));
        announce();
        break;
      default:
        break;
    }
  }

  private async takeOnDevice(said: Envelope, place: ((contacts: Contact[]) => Contact[]) | null): Promise<Awaited<ReturnType<Link['open']>>> {
    const primary = this.data.primary!;
    switch (said.k) {
      case 'in':
        return { kind: 'message', identity: said.c, plaintext: utf8Encode(JSON.stringify(said.m)) };
      case 'contacts': {
        const synced: Record<string, Synced> = said.all ? {} : { ...this.data.synced };
        for (const gone of said.gone) delete synced[gone];
        for (const s of said.list) synced[s.identity] = s;
        const gone = Object.keys(this.data.synced).filter((id) => !synced[id]);
        await this.save({ ...this.data, synced, ...(said.link !== undefined ? { link: said.link } : {}) });
        if (gone.length > 0) this.act(() => this.clearChats(gone));
        const { list, all } = said;
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
      case 'bye':
        this.act(() => this.forget());
        break;
      default:
        break;
    }
    return { kind: 'taken', ...(place ? { contacts: place } : {}) };
  }

  wrap(identity: string, plaintext: Uint8Array): Promise<Uint8Array> {
    return this.run(async () => {
      const primary = this.data.primary;
      if (!primary) throw new Error(t('This device is no longer linked to a phone.'));
      const m = parse(plaintext);
      const bytes = m && encodeOne({ k: 'send', c: identity, m: withoutPlace(m) }, this.at);
      if (!bytes) throw new Error(t('Too long to go through the phone.'));
      const sealed = await core.seal(fromBase64(primary.conversation), bytes);
      await this.save({ ...this.data, primary: { ...primary, conversation: toBase64(sealed.conversation) } });
      return sealed.packet;
    });
  }

  async add(code: ContactCode, identity: string, known: Contact | undefined): Promise<Contact> {
    const primary = this.data.primary;
    if (!primary) throw new Error(t('This device is no longer linked to a phone.'));
    if (identity === this.data.account) throw new OwnCodeError();
    await this.say({ k: 'add', code });
    // Ahead of what the chat writes to them next, if the relay takes it now.
    await this.flush().catch(() => undefined);
    if (known) return { ...known, request: false };
    const synced: Synced = { identity, name: '', timer: 0, timerAt: 0, request: false, look: null, hide: false };
    return mirrorOf(synced, undefined, primary.at, this.data.account);
  }

  opened(identity: string, plaintext: Uint8Array): void {
    if (this.data.primary || !this.data.devices.some((d) => d.linked)) return;
    const m = parse(plaintext);
    if (!m || isSignal(m)) return;
    // Their photo or file stays on the relay until each device took it, and this phone too.
    const offer = isObject(m.file) ? readOffer(m.file) : null;
    void this.say({ k: 'in', c: identity, m: withoutPlace(m) }, undefined, offer ? [{ from: fromOf(offer), phone: true }] : []).catch(() => undefined);
  }

  sealed(identity: string, plaintext: Uint8Array): void {
    if (this.data.primary || !this.data.devices.some((d) => d.linked)) return;
    const m = parse(plaintext);
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

  changed(contacts: readonly Contact[]): void {
    const role = this.role();
    if (!role) return;
    const now = contacts.map(syncedOf);
    void this.run(async () => {
      if (this.data.primary) await this.tellChanges(now);
      else await this.sendChanges(now);
    })
      .then(() => this.flush())
      .catch(() => undefined);
  }

  // On a linked device: each change to a contact goes to the phone, field by field.
  private async tellChanges(now: Synced[]): Promise<void> {
    let primary = this.data.primary!;
    const synced = { ...this.data.synced };
    let changes = false;
    for (const s of now) {
      const before = synced[s.identity];
      const change = before ? changedFields(before, s) : changedFields({ ...s, name: '', timer: 0, timerAt: 0, request: true, look: null, hide: false }, s);
      if (Object.keys(change).length === 0) continue;
      primary = await this.seal(primary, { k: 'set', c: s.identity, change });
      synced[s.identity] = { ...(before ?? {}), ...s };
      changes = true;
    }
    for (const id of Object.keys(synced)) {
      if (now.some((s) => s.identity === id)) continue;
      primary = await this.seal(primary, { k: 'set', c: id, change: {}, remove: true });
      delete synced[id];
      changes = true;
    }
    if (changes) await this.save({ ...this.data, primary, synced });
  }

  // On the primary: what changed of the contacts goes to each linked device.
  private async sendChanges(now: Synced[], except = ''): Promise<void> {
    const list = now.filter((s) => JSON.stringify(this.data.synced[s.identity] ?? null) !== JSON.stringify(s));
    const gone = Object.keys(this.data.synced).filter((id) => !now.some((s) => s.identity === id));
    const synced = Object.fromEntries(now.map((s) => [s.identity, s]));
    if (list.length === 0 && gone.length === 0) return;
    const devices: Peer[] = [];
    for (const d of this.data.devices) devices.push(d.linked && d.id !== except ? await this.seal(d, { k: 'contacts', all: false, list, gone }) : d);
    await this.save({ ...this.data, devices, synced });
  }

  // On the primary, in the turn: a device said the codes match. It gets the contacts, and the work
  // after brings it the history chosen, up to now.
  private async ready(peer: Peer, name: string): Promise<void> {
    const now = Date.now();
    const contacts = this.chats.e2e.contacts().map((c) => syncedOf(this.chats.e2e.record(c.identity)!));
    await this.sendChanges(contacts, peer.id);
    const link = this.ownLink();
    const linked = await this.seal(
      { ...peer, linked: true, heard: now, name: cleanDeviceName(name) || peer.name, history: peer.history && { ...peer.history, upTo: now } },
      { k: 'contacts', all: true, list: contacts, gone: [], link },
    );
    await this.save({ ...this.data, devices: this.data.devices.map((d) => (d.id === peer.id ? linked : d)), link });
    this.act(() => this.bringHistory(peer.id));
    announce();
  }

  // ---- Linking ----

  /**
   * On the device to link: makes its link key, a secret and the code to show (lib/link-code.ts),
   * named `name`. Only a space with no contacts links: its chats become the phone's.
   */
  makeOffer(name: string): Promise<string> {
    return this.run(async () => {
      if (this.role() !== null) throw new Error(t('This space is linked already.'));
      if (this.chats.e2e.contacts().length > 0) throw new Error(t('This space has chats of its own. Link from a space with none, such as one that opens with a new password.'));
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

  /** On the device to link: the codes match. From now on its chats are the phone's. */
  confirm(code: string): Promise<void> {
    return this.run(async () => {
      const answer = this.data.answer;
      if (!answer || answer.code !== code) throw new Error(t('The code changed. Compare it again.'));
      await this.here().catch(() => null);
      const primary = await this.seal({ ...answer.peer, since: Date.now() }, { k: 'ready', name: this.data.offer?.name ?? '' });
      await this.save({ ...this.data, primary, account: answer.account, offer: null, answer: null, synced: {}, packs: [] });
    }).then(() => {
      announce();
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
    const hello = encodeOne({ k: 'hello', secret: pending.code.secret, name: cleanDeviceName(phone), account: this.chats.e2e.identityHex() }, here.place)!;
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
        for (const packet of bye) await sendMessage(to, fromHex(peer.at.sender), fromBase64(packet));
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
      // What was left on the relay only for it.
      this.act(() => this.letGo(peer.id, null));
    }
    return told;
  }

  // On a linked device, unlinked: the account's chats go, contacts and messages. The link goes
  // first, so the contacts going is not said to the phone.
  private async forget(): Promise<void> {
    const { e2e, history } = this.chats;
    await this.run(async () => {
      await this.save({ ...this.data, primary: null, account: '', link: '', synced: {}, packs: [], offer: null, answer: null });
    });
    const gone = e2e.contacts().map((c) => c.identity);
    for (const identity of gone) await e2e.removeContact(identity).catch(() => undefined);
    await this.clearChats(gone);
  }

  private async clearChats(identities: string[]): Promise<void> {
    for (const identity of identities) await this.chats.history.clear(peerOf(identity)).catch(() => undefined);
    announce({ gone: identities.map((identity) => ({ peer: peerOf(identity) })) });
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
    const peer = this.data.primary?.id === id ? this.data.primary : this.data.devices.find((d) => d.id === id);
    if (!peer || peer.outbox.length === 0) return;
    const to = contactTarget(here.sends, peer.at);
    const sent = new Set<string>();
    try {
      for (const packet of peer.outbox) {
        await sendMessage(to, fromHex(peer.at.sender), fromBase64(packet));
        sent.add(packet);
      }
    } finally {
      if (sent.size > 0) {
        await this.run(async () => {
          const now = this.data.primary?.id === id ? this.data.primary : this.data.devices.find((d) => d.id === id);
          if (now) await this.keepPeer({ ...now, outbox: now.outbox.filter((p) => !sent.has(p)) });
        });
      }
    }
  }

  // A device the outbox had no room for, once it drained: the contacts again, and the history from when it fell behind.
  private async catchUp(): Promise<void> {
    for (const d of this.data.devices) {
      if (!d.linked || !d.behind || d.outbox.length > 0) continue;
      const contacts = this.chats.e2e.contacts().map((c) => syncedOf(this.chats.e2e.record(c.identity)!));
      await this.run(async () => {
        const now = this.data.devices.find((p) => p.id === d.id);
        if (!now) return;
        const said = await this.seal({ ...now, behind: 0 }, { k: 'contacts', all: true, list: contacts, gone: [], link: this.ownLink() });
        const history = { since: now.behind, files: now.files, upTo: Date.now(), done: 0 };
        await this.keepPeer({ ...said, history });
      });
      this.act(() => this.bringHistory(d.id));
    }
  }

  // Looked at now and then while the space is open: what waits, the history still to bring, and
  // what a device wrote that could not go yet.
  private tick(): void {
    if (this.closed) return;
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
  }

  // Seals word for a contact as the chat does, and hands it to their phone nearby when it is, and to the relay.
  private async deliver(identity: string, sealed: { sender: string; relay: string; relayKey: string; spare: Contact['spare']; first: Uint8Array | null; packet: Uint8Array }, here: Here) {
    const relay = sealed.sender
      ? async () => {
          const to = contactTarget(here.sends, sealed);
          if (sealed.first) {
            await sendMessage(to, fromHex(sealed.sender), sealed.first);
            await this.chats.e2e.firstSent(identity);
          }
          await sendMessage(to, fromHex(sealed.sender), sealed.packet);
        }
      : null;
    await nearby.deliver(identity, sealed.first ? [sealed.first, sealed.packet] : [sealed.packet], relay);
  }

  // ---- On the primary: what a device wrote ----

  // A message a device wrote to a contact: sealed for them as it came, and, one the chat keeps,
  // kept here as this phone's own (Waiting, if it could not go now). What it says was read here is
  // marked read here too, and what it deletes on both phones goes here as well. One for a contact
  // not added here yet, or that could not be handled now, is tried again a few times.
  private async sendFor(c: string, m: Json, tries = 0): Promise<void> {
    try {
      if (await this.sendOne(c, m)) return;
    } catch {
      // Tried again, below.
    }
    if (tries < LATER_TRIES) this.later = [...this.later, { c, m, tries: tries + 1 }].slice(-MAX_LATER);
  }

  // Says whether it is done with the message, or it should be tried again.
  private async sendOne(c: string, m: Json): Promise<boolean> {
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
      // Taken from the device's relay first, then put on this phone's, as the contact deletes theirs once taken.
      const offer = readOffer(m.file);
      if (!offer) return true;
      if (!here) return false;
      file = await takeFile(here.own, offerRef(offer), undefined, false);
      const upload = await uploadFile(here.own, file).catch(() => null);
      said = upload ? { ...m, file: upload } : m;
      if (!upload) {
        await this.keepAsSent(peer, m, file, null, WAITING);
        void sendWaiting(this.chats, this.sendPlace(here)).catch(() => undefined);
        announce();
        return true;
      }
    }
    let went = false;
    if (here) {
      try {
        await this.deliver(c, await e2e.sealAs(c, utf8Encode(JSON.stringify(said)), here.place.sender, here.where), here);
        went = true;
      } catch {
        // It waits, below.
      }
    }
    if (!kept) {
      // What was read goes with the next message to them; what else it says is tried again.
      if (!went && read.length > 0) await e2e.hold(c, 'read', read);
      announce({ gone });
      return went || !Object.keys(m).some((key) => !QUIET.has(key));
    }
    let mark: Mark = went ? 0 : WAITING;
    let voice: VoiceRef | null = null;
    const part = voiceOf(m.voice);
    if (part) {
      // A voice message is kept once all its parts came; it waits if any could not go.
      const key = `${peer}|${m.tag as string}`;
      if (!went) this.voiceLate.add(key);
      const whole = this.voiceParts.add(`send ${peer}`, part, now);
      if (!whole) return true;
      mark = this.voiceLate.delete(key) ? WAITING : 0;
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
    for (const item of waiting) await this.sendFor(item.c, item.m, item.tries);
  }

  // A contact a device added from their link: this phone adds them and starts the conversation.
  // One that cannot be added leaves the devices again.
  private async addFor(code: ContactCode): Promise<void> {
    const { e2e } = this.chats;
    const here = await this.here().catch(() => null);
    let identity: string;
    try {
      identity = (await e2e.addContact(code, here?.place.sender ?? '', here?.where ?? { relay: '', relayKey: '' })).identity;
    } catch {
      const gone = await core.bundleIdentity(fromBase64Url(code.key)).then(toHex, () => '');
      if (gone && !e2e.record(gone)) await this.say({ k: 'contacts', all: false, list: [], gone: [gone] });
      return;
    }
    // The conversation's first packet; one the relay does not take now goes with the next look (lib/receiver.ts).
    const first = e2e.pending().find((p) => p.identity === identity);
    if (first && here) {
      try {
        await sendMessage(contactTarget(here.sends, first), fromHex(first.sender), first.first);
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
  // phone's, a request only accepted. A timer set later is told to the contact, as the chat does.
  private async setFor(c: string, change: Partial<Omit<Synced, 'identity'>>, remove: boolean): Promise<void> {
    const { e2e, history } = this.chats;
    const contact = e2e.record(c);
    if (!contact) return;
    if (remove) {
      await e2e.removeContact(c);
      await history.clear(peerOf(c));
      announce({ gone: [{ peer: peerOf(c) }] });
      return;
    }
    if (change.name !== undefined && change.name !== contact.name) await e2e.rename(c, change.name);
    if (change.look !== undefined && JSON.stringify(change.look) !== JSON.stringify(contact.look)) await e2e.setLook(c, change.look);
    if (change.avatar !== undefined && change.avatar?.kind !== 'photo' && JSON.stringify(change.avatar) !== JSON.stringify(contact.avatar)) await e2e.setAvatar(c, change.avatar);
    if (change.hide !== undefined && change.hide !== contact.hide) await e2e.setHidden(c, change.hide);
    if (change.request === false && contact.request) await e2e.acceptRequest(c);
    if (change.timer !== undefined && change.timerAt !== undefined && change.timerAt > contact.timerAt) {
      await e2e.setTimer(c, change.timer);
      const here = await this.here().catch(() => null);
      if (here) await this.deliver(c, await e2e.seal(c, '', here.place.sender, { at: here.where }), here).catch(() => undefined);
    }
    announce();
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
      const all = history.messages().filter((m) => known.has(m.peer) && m.tag && m.at >= job.since && m.at <= job.upTo && m.mark !== WAITING && !(m.until && m.until <= now));
      const entries: PackEntry[] = [];
      const files: Leaving[] = [];
      let size = 0;
      let used = 0;
      // A pack ends between messages of different times, so the next starts where this one ended.
      while (used < all.length && (size < PACK_BYTES || all[used].at === all[used - 1].at)) {
        const entry = await this.entryOf(all[used], job.files, here, files);
        used++;
        if (!entry) continue;
        entries.push(entry);
        size += JSON.stringify(entry).length;
      }
      const last = used >= all.length;
      if (entries.length > 0) {
        const { ref, offer } = await sendFile(here.own, bytesSource(writePack(entries)), { name: 'history.json', mime: 'application/json', kind: 'file' });
        await deleteChunks(ref.id, ref.count).catch(() => undefined);
        await this.say({ k: 'history', offer, last }, id, files);
      }
      await this.run(async () => {
        const devices = this.data.devices.map((d) =>
          d.id === id && d.history ? { ...d, history: last ? null : { ...d.history, since: all[used].at, done: d.history.done + entries.length } } : d,
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

  // A message the phone sent to a contact, or what it said read or deleted: kept here as this
  // device's own, once, by its tag.
  private async ownFrom(c: string, m: Json, mark: Mark | undefined): Promise<void> {
    const { e2e, history } = this.chats;
    if (!e2e.record(c)) return;
    const peer = peerOf(c);
    const now = Date.now();
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
    if (isKept(m)) {
      const tag = m.tag as string;
      const have = history.messages().find((x) => x.peer === peer && x.tag === tag);
      if (have) {
        if (mark && have.mine && (have.mark ?? 0) < mark) await history.mark(peer, true, mark, now, [tag]);
      } else {
        const lasts = typeof m.lasts === 'number' && m.lasts > 0 ? m.lasts : typeof m.timer === 'number' ? m.timer : 0;
        const base: Message = { peer, text: '', mine: true, at: now, tag, lasts, mark: mark ?? 0 };
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

  // Packs of the history the phone put on the relay: each taken, opened and kept, then deleted.
  private async takePacks(): Promise<void> {
    while (this.data.primary && this.data.packs.length > 0) {
      const offer = this.data.packs[0];
      const here = await this.here();
      if (!here) return;
      let entries: PackEntry[] = [];
      try {
        const ref = await takeFile(here.own, offerRef(offer), undefined, false);
        const bytes = await readFile(ref);
        await deleteChunks(ref.id, ref.count).catch(() => undefined);
        entries = bytes ? readPack(bytes) : [];
      } catch (error) {
        if (!(error instanceof FileGoneError)) throw error;
      }
      await this.putIn(entries);
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
      if (!known.has(e.peer) || have.has(key)) continue;
      have.add(key);
      const message: Message = { peer: e.peer, text: e.text, mine: e.mine, at: e.at, tag: e.tag, until: e.until ?? 0, lasts: e.lasts ?? 0, mark: e.mark ?? 0 };
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

joinSpaceChats(async (chats, space, key) => {
  current?.close();
  current = null;
  watchTakenFiles(null);
  current = await Links.open(space, key, chats);
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
