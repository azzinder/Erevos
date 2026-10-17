import { loadE2EData, saveE2EData, type Contact, type E2EData, type Holder } from '../lock/e2e-data';

import * as core from './core';
import { fromBase64, fromHex, toBase64, toHex, utf8Decode, utf8Encode } from './crypto';

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
// What travels inside a packet is a Message: the text, and the relay sender id that reaches
// the sender, so the other side can answer, and learns a new one when it changes. A
// conversation's first message has no text.
//
// Every call runs after the one before it ends, so two calls never move the same conversation
// from the same state. A message key is never used twice: a packet is only handed back once the
// conversation that sealed it has been saved past it.

const MAX_CONVERSATIONS = 3;
// First packets remembered, so the relay cannot replay one to show its message again. A replay
// of an older one shows its message once more, in a conversation that goes nowhere.
const MAX_SEEN = 100;

type Message = { from: string; text: string };

function encodeMessage(message: Message): Uint8Array {
  return utf8Encode(JSON.stringify(message));
}

function decodeMessage(bytes: Uint8Array): Message {
  try {
    const value = JSON.parse(utf8Decode(bytes)) as Partial<Message>;
    return {
      from: typeof value.from === 'string' && /^[0-9a-f]{48}$/.test(value.from) ? value.from : '',
      text: typeof value.text === 'string' ? value.text : '',
    };
  } catch {
    return { from: '', text: '' };
  }
}

/** Base64url without padding, as the contact link carries the bundle. */
export function toBase64Url(bytes: Uint8Array): string {
  return toBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function fromBase64Url(text: string): Uint8Array {
  return fromBase64(text.replace(/-/g, '+').replace(/_/g, '/'));
}

/** A contact as the chat shows it. */
export type ContactInfo = { identity: string; sender: string };

export type Received =
  | { kind: 'message'; identity: string; text: string; added: boolean }
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
    return this.data.contacts.map(({ identity, sender }) => ({ identity, sender }));
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
  addContact(code: { senderHex: string; key: string }, from: string): Promise<{ identity: string; added: boolean }> {
    return this.run(async () => {
      if (!code.key) throw new NoKeyError();
      const bundle = fromBase64Url(code.key);
      const identity = toHex(await core.bundleIdentity(bundle));
      if (identity === toHex(this.identity)) throw new OwnCodeError();
      const known = this.find(identity);
      if (known) {
        // Already talking: only where to reach them changes.
        await this.save(this.withContact({ ...known, sender: code.senderHex }));
        return { identity, added: false };
      }
      const started = await core.startConversation(this.account, bundle, encodeMessage({ from, text: '' }));
      await this.save(
        this.withContact({
          identity,
          sender: code.senderHex,
          conversations: [toBase64(started.conversation)],
          first: toBase64(started.packet),
        }),
      );
      return { identity, added: true };
    });
  }

  /**
   * Seals a message for a contact. `from` is this chat's relay sender id. Returns where to send it
   * and the packet, after the first packet of the conversation if the relay has not taken that
   * yet. Send that one first, then call `firstSent`.
   */
  seal(identity: string, text: string, from: string): Promise<{ sender: string; first: Uint8Array | null; packet: Uint8Array }> {
    return this.run(async () => {
      const contact = this.find(identity);
      if (!contact || contact.conversations.length === 0) throw new Error('No conversation with this contact.');
      if (!contact.sender) throw new Error('This contact has not said how to reach them yet.');
      const sealed = await core.seal(fromBase64(contact.conversations[0]), encodeMessage({ from, text }));
      await this.save(this.withContact({ ...contact, conversations: [toBase64(sealed.conversation), ...contact.conversations.slice(1)] }));
      return { sender: contact.sender, first: contact.first ? fromBase64(contact.first) : null, packet: sealed.packet };
    });
  }

  /** The first packet still waiting for the relay, if any, and where it goes. */
  pending(): { identity: string; sender: string; first: Uint8Array }[] {
    return this.data.contacts
      .filter((contact) => contact.first && contact.sender)
      .map((contact) => ({ identity: contact.identity, sender: contact.sender, first: fromBase64(contact.first) }));
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
    const contact: Contact = {
      identity,
      sender: message.from || known?.sender || '',
      conversations: [toBase64(opened.conversation), ...(known?.conversations ?? [])].slice(0, MAX_CONVERSATIONS),
      first: known?.first ?? '',
    };
    await this.save({ ...this.withContact(contact), seen: [...this.data.seen, id].slice(-MAX_SEEN) });
    return { kind: 'message', identity, text: message.text, added: !known };
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
        await this.save(
          this.withContact({
            identity: contact.identity,
            sender: message.from || contact.sender,
            // Send in the one they last sent in. Their answer also means they have the first packet.
            conversations: [toBase64(opened.conversation), ...others],
            first: '',
          }),
        );
        return { kind: 'message', identity: contact.identity, text: message.text, added: false };
      }
    }
    return { kind: 'refused', reason: 'unknown' };
  }
}
