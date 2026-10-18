import { checkedAvatar, cleanName, isRelay, isRelayKey, isTimer, loadE2EData, saveE2EData, type Avatar, type Contact, type E2EData, type Holder } from '../lock/e2e-data';

import { isTag, newTag } from '../lock/history';

import * as core from './core';
import { readOffer, type FileOffer } from './attachments';
import { isVoicePart, splitVoice, type VoicePart } from './voice';
import { fromBase64, fromHex, toBase64, toHex, utf8Decode, utf8Encode } from './crypto';
import type { Look } from '../theme/look';

// End-to-end encryption for one chat: a space's, or its hidden chats'. Each has its own account,
// so neither its contacts nor the relay can tie the two together. The account's public keys
// (its bundle) go in the contact link. Whoever adds a link starts a conversation with that
// account (PQXDH), and from then on each message moves the double ratchet. All of it is the
// Rust core's (lib/core.ts). What this file adds is which conversation a packet belongs to, and
// keeping the conversations, sealed, between launches (lock/e2e-data.ts).
//
// A packet says nothing about who sent it, so a packet that continues a conversation is tried
// in each one in turn. One that starts a conversation names its sender only inside, once
// opened. Each contact keeps its last MAX_CONVERSATIONS conversations, since both people may
// start one at the same time: each side then sends in the one it last received in, and opens
// packets in any of them.
//
// What travels inside a packet is a Message: the text and its tag, and the relay sender id that
// reaches the sender, so the other side can answer, and learns a new one when it changes. A
// conversation's first message has no text. Nor has one that asks the other phone to delete
// the messages of the chat, or one of them by its tag (`erase`): their Erevos does, but nothing
// makes a changed app do it.
//
// A phone says which messages came (`got`) and which were read (`read`), by their tags, so the
// sender's chat can mark them. A voice message travels in parts (lib/voice.ts), one in each
// message, all with the voice message's tag. A photo or file travels on its own through the
// relay's file store (lib/attachments.ts): its message carries where it is and its key.
//
// Every message also carries the chat's timer for disappearing messages and when it was set, so
// each phone takes the later setting. A disappearing message lasts that long, or as long as its
// own `lasts` says when only that one disappears, from when it is read: on the sender's phone,
// from when the other says it read it. A message with no text and no `erase` only says the timer,
// and what came or was read. Their Erevos deletes the messages in time; nothing
// makes a changed app do it, or stops a screenshot.
//
// Every call runs after the one before it ends, so two calls never move the same conversation
// from the same state. A message key is never used twice: a packet is only handed back once the
// conversation that sealed it has been saved past it.

const MAX_CONVERSATIONS = 3;
// First packets remembered, so the relay cannot replay one to show its message again. A replay
// of an older one shows its message once more, in a conversation that goes nowhere.
const MAX_SEEN = 100;

/** What a message asks the other phone to delete: every message of the chat, or the one with this tag. */
export type Erase = { all: true } | { tag: string };

// The most tags one message says came, or were read.
const MAX_TAGS = 200;

// `timer` is null in a message from an Erevos before disappearing messages. `lasts`: seconds this
// one message lasts, whatever the chat's timer, or 0. `got` and `read`: the tags of the other
// phone's messages that came here, and that were read here.
// `relay` and `relayKey`: the relay the sender's queue is on, and its key, so the other phone can
// write to it when it is not its own relay. Empty when not said.
type Message = {
  from: string;
  relay: string;
  relayKey: string;
  text: string;
  tag: string;
  erase: Erase | null;
  timer: number | null;
  timerAt: number;
  lasts: number;
  got: string[];
  read: string[];
  voice: VoicePart | null;
  file: FileOffer | null;
};

/** What else a message can carry. */
export type Extra = { erase?: Erase | null; lasts?: number; got?: string[]; read?: string[]; at?: Where };

/** Where a chat's own queue is: its relay and that relay's key for sealed sends (base64url). */
export type Where = { relay: string; relayKey: string };

const tags = (value: unknown): string[] => (Array.isArray(value) ? value.filter(isTag).slice(0, MAX_TAGS) : []);

function encodeVoice({ id, part, parts, ms, data }: VoicePart) {
  return { id, part, parts, ms, data: toBase64(data) };
}

function decodeVoice(value: unknown): VoicePart | null {
  const v = value as Record<string, unknown> | null;
  if (typeof v?.data !== 'string') return null;
  let data: Uint8Array;
  try {
    data = fromBase64(v.data);
  } catch {
    return null;
  }
  const part = { id: v.id, part: v.part, parts: v.parts, ms: v.ms, data } as Partial<VoicePart>;
  return isVoicePart(part) ? part : null;
}

function encodeMessage({ from, relay, relayKey, text, tag, erase, timer, timerAt, lasts, got, read, voice, file }: Message): Uint8Array {
  return utf8Encode(
    JSON.stringify({
      from,
      ...(relay ? { relay } : {}),
      ...(relayKey ? { relayKey } : {}),
      text,
      ...(tag ? { tag } : {}),
      ...(erase ? { erase } : {}),
      ...(timer !== null ? { timer, timerAt } : {}),
      ...(lasts ? { lasts } : {}),
      ...(got.length > 0 ? { got } : {}),
      ...(read.length > 0 ? { read } : {}),
      ...(voice ? { voice: encodeVoice(voice) } : {}),
      ...(file ? { file } : {}),
    }),
  );
}

/** Where a link or a message says a queue is. A queue said without a relay is on the same relay. */
function whereOf(said: { relay?: string; relayUrl?: string; relayKey?: string }): Where {
  const relay = said.relay ?? said.relayUrl ?? '';
  return isRelay(relay) ? { relay, relayKey: isRelayKey(said.relayKey) ? said.relayKey : '' } : { relay: '', relayKey: '' };
}

function decodeErase(value: unknown): Erase | null {
  const erase = value as { all?: unknown; tag?: unknown } | null;
  if (erase?.all === true) return { all: true };
  return isTag(erase?.tag) ? { tag: erase.tag } : null;
}

function decodeMessage(bytes: Uint8Array): Message {
  try {
    const value = JSON.parse(utf8Decode(bytes)) as Partial<Record<keyof Message, unknown>>;
    return {
      from: typeof value.from === 'string' && /^[0-9a-f]{48}$/.test(value.from) ? value.from : '',
      relay: isRelay(value.relay) ? value.relay : '',
      relayKey: isRelayKey(value.relayKey) ? value.relayKey : '',
      text: typeof value.text === 'string' ? value.text : '',
      tag: isTag(value.tag) ? value.tag : '',
      erase: decodeErase(value.erase),
      timer: isTimer(value.timer) ? value.timer : null,
      timerAt: typeof value.timerAt === 'number' && Number.isFinite(value.timerAt) && value.timerAt >= 0 ? value.timerAt : 0,
      lasts: isTimer(value.lasts) ? value.lasts : 0,
      got: tags(value.got),
      read: tags(value.read),
      voice: decodeVoice(value.voice),
      file: readOffer(value.file),
    };
  } catch {
    return { from: '', relay: '', relayKey: '', text: '', tag: '', erase: null, timer: null, timerAt: 0, lasts: 0, got: [], read: [], voice: null, file: null };
  }
}

/**
 * The chat's timer once a message came: the message's if it was set later than the one kept,
 * and how long the message itself lasts, as its sender meant: its own time, or the chat's.
 */
function timerOf(message: Message, contact: Contact | undefined) {
  const kept = { timer: contact?.timer ?? 0, timerAt: contact?.timerAt ?? 0 };
  const later = message.timer !== null && message.timerAt > kept.timerAt;
  const now = later ? { timer: message.timer!, timerAt: message.timerAt } : kept;
  const lasts = message.lasts || (message.timer ?? now.timer);
  return { ...now, received: { timer: lasts, timerChanged: later && now.timer !== kept.timer } };
}

/** Base64url without padding, as the contact link carries the bundle. */
export function toBase64Url(bytes: Uint8Array): string {
  return toBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function fromBase64Url(text: string): Uint8Array {
  return fromBase64(text.replace(/-/g, '+').replace(/_/g, '/'));
}

/** A contact as the chat shows it. `name` is empty until this chat gives one. */
export type ContactInfo = { identity: string; sender: string; name: string; timer: number; request: boolean; look: Look | null; avatar: Avatar | null };

export type Received =
  // `timer`: seconds this message lasts once read, 0 for ever. `timerChanged`: the other phone set
  // the chat's timer anew. `got` and `read`: tags of messages from here that came there, or were read.
  | {
      kind: 'message';
      identity: string;
      text: string;
      tag: string;
      added: boolean;
      // From a contact not accepted yet (see Contact.request).
      request: boolean;
      erase: Erase | null;
      timer: number;
      timerChanged: boolean;
      got: string[];
      read: string[];
      // One part of a voice message, whose tag is `tag`.
      voice: VoicePart | null;
      // A photo or file, still on the relay.
      file: FileOffer | null;
    }
  // Not encrypted (as messages before this version were), not for this account, or a replay.
  | { kind: 'refused'; reason: 'plain' | 'unknown' | 'replay' };

export class OwnCodeError extends Error {
  constructor() {
    super("That is this chat's own contact link.");
  }
}

export class NoKeyError extends Error {
  constructor() {
    super('That code has no key. Ask for their contact link or QR code from this version of Erevos.');
  }
}

export class E2E {
  /** This account's identity key. */
  readonly identity: Uint8Array;
  /** This account's public keys, for its contact link. */
  readonly bundle: Uint8Array;
  private data: E2EData;
  private readonly account: Uint8Array;
  private readonly store: (data: E2EData) => Promise<void>;
  private queue: Promise<unknown> = Promise.resolve();

  private constructor(data: E2EData, account: Uint8Array, identity: Uint8Array, bundle: Uint8Array, store: (data: E2EData) => Promise<void>) {
    this.data = data;
    this.account = account;
    this.identity = identity;
    this.bundle = bundle;
    this.store = store;
  }

  /** The space's own chat, or its hidden chats (`holder`), sealed with `key`. Makes the account the first time. */
  static async open(holder: Holder, space: number, key: Uint8Array): Promise<E2E> {
    const store = (data: E2EData) => saveE2EData(holder, space, key, data);
    let data = await loadE2EData(holder, space, key);
    if (!data.account) {
      data = { ...data, account: toBase64(await core.newAccount()) };
      await store(data);
    }
    const account = fromBase64(data.account);
    return new E2E(data, account, await core.accountIdentity(account), await core.accountBundle(account), store);
  }

  private run<T>(call: () => Promise<T>): Promise<T> {
    const next = this.queue.catch(() => undefined).then(call);
    this.queue = next;
    return next;
  }

  /** Keeps `data` in memory first, so even if saving fails no later call seals from the state before it. */
  private async save(data: E2EData): Promise<void> {
    this.data = data;
    await this.store(data);
  }

  private find(identity: string): Contact | undefined {
    return this.data.contacts.find((contact) => contact.identity === identity);
  }

  private withContact(contact: Contact): E2EData {
    const others = this.data.contacts.filter((c) => c.identity !== contact.identity);
    const at = this.data.contacts.findIndex((c) => c.identity === contact.identity);
    // A contact keeps its place in the list.
    others.splice(at < 0 ? others.length : at, 0, contact);
    return { ...this.data, contacts: others };
  }

  contacts(): ContactInfo[] {
    return this.data.contacts.map(({ identity, sender, name, timer, request, look, avatar }) => ({ identity, sender, name, timer, request, look, avatar }));
  }

  /** Accepts a message request: the chat with them is like any other from now on. */
  acceptRequest(identity: string): Promise<void> {
    return this.run(async () => {
      const contact = this.find(identity);
      if (contact?.request) await this.save(this.withContact({ ...contact, request: false }));
    });
  }

  /** Forgets a contact and every conversation with them. A message they send later is refused. */
  removeContact(identity: string): Promise<void> {
    return this.run(async () => {
      await this.save({ ...this.data, contacts: this.data.contacts.filter((c) => c.identity !== identity) });
    });
  }

  /**
   * Sets how long new messages with a contact last, seconds (0 keeps them). Set after any setting
   * this phone has seen, whatever its clock says, so the other phone takes it.
   */
  setTimer(identity: string, timer: number): Promise<void> {
    return this.run(async () => {
      const contact = this.find(identity);
      if (!contact) throw new Error('No such contact.');
      if (!isTimer(timer)) throw new Error('Not a time Erevos keeps messages for.');
      await this.save(this.withContact({ ...contact, timer, timerAt: Math.max(Date.now(), contact.timerAt + 1) }));
    });
  }

  /** Gives a contact a name, kept with it and sealed. An empty one takes the name away. */
  rename(identity: string, name: string): Promise<void> {
    return this.run(async () => {
      const contact = this.find(identity);
      if (!contact) throw new Error('No such contact.');
      await this.save(this.withContact({ ...contact, name: cleanName(name) }));
    });
  }

  /** Gives a chat its own look, kept with the contact and sealed; null gives it the space's again. */
  setLook(identity: string, look: Look | null): Promise<void> {
    return this.run(async () => {
      const contact = this.find(identity);
      if (!contact) throw new Error('No such contact.');
      await this.save(this.withContact({ ...contact, look }));
    });
  }

  /** Gives a contact a picture of this chat's choosing, kept with it and sealed; null gives back the one drawn from their key. */
  setAvatar(identity: string, avatar: Avatar | null): Promise<void> {
    return this.run(async () => {
      const contact = this.find(identity);
      if (!contact) throw new Error('No such contact.');
      await this.save(this.withContact({ ...contact, avatar: avatar && checkedAvatar(avatar) }));
    });
  }

  /** The 60-digit number both phones show for a contact: when they match, no one is in between. */
  safetyNumber(identity: string): Promise<string> {
    return core.safetyNumber(this.identity, fromHex(identity));
  }

  /**
   * Adds the contact of a link and starts a conversation with them. `from` is this chat's relay
   * sender id. Afterwards the first packet waits for the relay (see `pending`). Throws if the
   * link has no key, or a key whose signatures do not hold, or is this chat's own.
   */
  addContact(
    code: { senderHex: string; key: string; relayUrl?: string; relayKey?: string },
    from: string,
    at: Where = { relay: '', relayKey: '' },
  ): Promise<{ identity: string; added: boolean }> {
    return this.run(async () => {
      if (!code.key) throw new NoKeyError();
      const bundle = fromBase64Url(code.key);
      const identity = toHex(await core.bundleIdentity(bundle));
      if (identity === toHex(this.identity)) throw new OwnCodeError();
      const known = this.find(identity);
      if (known) {
        // Already talking: only where to reach them changes. Adding their link accepts a request.
        await this.save(this.withContact({ ...known, ...whereOf(code), sender: code.senderHex, request: false }));
        return { identity, added: false };
      }
      const started = await core.startConversation(
        this.account,
        bundle,
        encodeMessage({ from, ...at, text: '', tag: '', erase: null, timer: 0, timerAt: 0, lasts: 0, got: [], read: [], voice: null, file: null }),
      );
      await this.save(
        this.withContact({
          identity,
          sender: code.senderHex,
          ...whereOf(code),
          conversations: [toBase64(started.conversation)],
          first: toBase64(started.packet),
          name: '',
          timer: 0,
          timerAt: 0,
          request: false,
          look: this.find(identity)?.look ?? null,
          avatar: this.find(identity)?.avatar ?? null,
        }),
      );
      return { identity, added: true };
    });
  }

  /**
   * Seals a message for a contact, or, with `erase` and no text, asks them to delete messages.
   * A text with `lasts` (seconds) disappears that long after it is read, whatever the chat's
   * timer. `got` and `read` tell them which of their messages came, and were read, here. With no
   * text, it tells them only those, and the chat's timer. `from` is this chat's relay sender id.
   * Returns where to send it, the packet, the message's tag and how long it lasts once read
   * (seconds), after the first packet of the conversation if the relay has not taken that yet.
   * Send that one first, then call `firstSent`.
   */
  seal(
    identity: string,
    text: string,
    from: string,
    { erase = null, lasts = 0, got = [], read = [], at = { relay: '', relayKey: '' } }: Extra = {},
  ): Promise<{ sender: string; relay: string; relayKey: string; first: Uint8Array | null; packet: Uint8Array; tag: string; timer: number }> {
    return this.run(async () => {
      const contact = this.find(identity);
      if (!contact || contact.conversations.length === 0) throw new Error('No conversation with this contact.');
      if (!contact.sender) throw new Error('This contact has not said how to reach them yet.');
      const tag = text ? newTag() : '';
      if (!isTimer(lasts)) throw new Error('Not a time Erevos keeps messages for.');
      const { timer, timerAt } = contact;
      const once = text ? lasts : 0;
      const message = { from, ...at, text, tag, erase: text ? null : erase, timer, timerAt, lasts: once, got: tags(got), read: tags(read), voice: null, file: null };
      // Writing to them accepts a request; telling them only what came or was read never does.
      const [packet] = await this.sealFor(contact, [message], !!text);
      const first = contact.first ? fromBase64(contact.first) : null;
      const { sender, relay, relayKey } = contact;
      return { sender, relay, relayKey, first, packet, tag, timer: once || timer };
    });
  }

  /**
   * Seals a voice message for a contact: its sound (`audio`, `ms` long) in parts, one packet
   * each, to send in order. Otherwise as `seal`.
   */
  sealVoice(
    identity: string,
    audio: Uint8Array,
    ms: number,
    from: string,
    { lasts = 0, at = { relay: '', relayKey: '' } }: { lasts?: number; at?: Where } = {},
  ): Promise<{ sender: string; relay: string; relayKey: string; first: Uint8Array | null; packets: Uint8Array[]; tag: string; timer: number }> {
    return this.run(async () => {
      const contact = this.find(identity);
      if (!contact || contact.conversations.length === 0) throw new Error('No conversation with this contact.');
      if (!contact.sender) throw new Error('This contact has not said how to reach them yet.');
      if (!isTimer(lasts)) throw new Error('Not a time Erevos keeps messages for.');
      const tag = newTag();
      const { timer, timerAt } = contact;
      const messages = splitVoice(audio, ms).map((voice) => ({
        from,
        ...at,
        text: '',
        tag,
        erase: null,
        timer,
        timerAt,
        lasts,
        got: [],
        read: [],
        voice,
        file: null,
      }));
      const packets = await this.sealFor(contact, messages, true);
      const first = contact.first ? fromBase64(contact.first) : null;
      const { sender, relay, relayKey } = contact;
      return { sender, relay, relayKey, first, packets, tag, timer: lasts || timer };
    });
  }

  /**
   * Seals a photo or file for a contact: where it is on the relay and its key (`offer`, from
   * lib/attachments.ts). Otherwise as `seal`.
   */
  sealFile(
    identity: string,
    offer: FileOffer,
    from: string,
    { lasts = 0, at = { relay: '', relayKey: '' } }: { lasts?: number; at?: Where } = {},
  ): Promise<{ sender: string; relay: string; relayKey: string; first: Uint8Array | null; packet: Uint8Array; tag: string; timer: number }> {
    return this.run(async () => {
      const contact = this.find(identity);
      if (!contact || contact.conversations.length === 0) throw new Error('No conversation with this contact.');
      if (!contact.sender) throw new Error('This contact has not said how to reach them yet.');
      if (!isTimer(lasts)) throw new Error('Not a time Erevos keeps messages for.');
      const tag = newTag();
      const { timer, timerAt } = contact;
      const message = { from, ...at, text: '', tag, erase: null, timer, timerAt, lasts, got: [], read: [], voice: null, file: offer };
      const [packet] = await this.sealFor(contact, [message], true);
      const first = contact.first ? fromBase64(contact.first) : null;
      const { sender, relay, relayKey } = contact;
      return { sender, relay, relayKey, first, packet, tag, timer: lasts || timer };
    });
  }

  // Seals messages in turn in the conversation to send in, and keeps it moved past them. Writing
  // to them (`writes`) accepts their request, if they made one.
  private async sealFor(contact: Contact, messages: Message[], writes: boolean): Promise<Uint8Array[]> {
    let conversation = fromBase64(contact.conversations[0]);
    const packets: Uint8Array[] = [];
    for (const message of messages) {
      const sealed = await core.seal(conversation, encodeMessage(message));
      conversation = sealed.conversation;
      packets.push(sealed.packet);
    }
    const request = contact.request && !writes;
    await this.save(this.withContact({ ...contact, request, conversations: [toBase64(conversation), ...contact.conversations.slice(1)] }));
    return packets;
  }

  /** The first packet still waiting for the relay, if any, and where it goes. */
  pending(): { identity: string; sender: string; relay: string; relayKey: string; first: Uint8Array }[] {
    return this.data.contacts
      .filter((contact) => contact.first && contact.sender)
      .map(({ identity, sender, relay, relayKey, first }) => ({ identity, sender, relay, relayKey, first: fromBase64(first) }));
  }

  /** The relay took the first packet of the conversation with this contact. */
  firstSent(identity: string): Promise<void> {
    return this.run(async () => {
      const contact = this.find(identity);
      if (contact?.first) await this.save(this.withContact({ ...contact, first: '' }));
    });
  }

  /** Opens a packet from the relay. */
  receive(packet: Uint8Array): Promise<Received> {
    return this.run(async () => {
      const kind = await core.packetKind(packet);
      if (kind === 'first') return this.accept(packet);
      if (kind === 'following') return this.open(packet);
      return { kind: 'refused', reason: 'plain' };
    });
  }

  private async accept(packet: Uint8Array): Promise<Received> {
    const id = toHex(await core.firstMessageId(packet)).slice(0, 32);
    if (this.data.seen.includes(id)) return { kind: 'refused', reason: 'replay' };
    let opened: core.Opened;
    try {
      opened = await core.acceptConversation(this.account, packet);
    } catch {
      return { kind: 'refused', reason: 'unknown' };
    }
    const identity = toHex(await core.conversationPeer(opened.conversation));
    const message = decodeMessage(opened.plaintext);
    const known = this.find(identity);
    const timing = timerOf(message, known);
    const contact: Contact = {
      identity,
      sender: message.from || known?.sender || '',
      ...(message.from ? whereOf(message) : { relay: known?.relay ?? '', relayKey: known?.relayKey ?? '' }),
      conversations: [toBase64(opened.conversation), ...(known?.conversations ?? [])].slice(0, MAX_CONVERSATIONS),
      first: known?.first ?? '',
      name: known?.name ?? '',
      timer: timing.timer,
      timerAt: timing.timerAt,
      // Someone new who has this chat's link writes first: a request until accepted.
      request: known ? known.request : true,
      look: known?.look ?? null,
      avatar: known?.avatar ?? null,
    };
    await this.save({ ...this.withContact(contact), seen: [...this.data.seen, id].slice(-MAX_SEEN) });
    const { text, tag, erase, got, read, voice, file } = message;
    const { request } = contact;
    return { kind: 'message', identity, text, tag, added: !known, request, erase, got, read, voice, file, ...timing.received };
  }

  private async open(packet: Uint8Array): Promise<Received> {
    for (const contact of this.data.contacts) {
      for (let i = 0; i < contact.conversations.length; i++) {
        let opened: core.Opened;
        try {
          opened = await core.open(fromBase64(contact.conversations[i]), packet);
        } catch {
          continue;
        }
        const message = decodeMessage(opened.plaintext);
        const others = contact.conversations.filter((_, j) => j !== i);
        const timing = timerOf(message, contact);
        await this.save(
          this.withContact({
            ...contact,
            sender: message.from || contact.sender,
            ...(message.from ? whereOf(message) : {}),
            // Send in the one they last sent in. Their answer also means they have the first packet.
            conversations: [toBase64(opened.conversation), ...others],
            first: '',
            timer: timing.timer,
            timerAt: timing.timerAt,
          }),
        );
        const { identity, request } = contact;
        const { text, tag, erase, got, read, voice, file } = message;
        return { kind: 'message', identity, text, tag, added: false, request, erase, got, read, voice, file, ...timing.received };
      }
    }
    return { kind: 'refused', reason: 'unknown' };
  }
}
