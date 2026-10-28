import { nostrChatCore } from './core';
import { utf8Decode, utf8Encode } from './crypto';
import { t } from './i18n';
import { isEvent, type NostrEvent } from './nostr-dm-net';
import { isNostrRelay } from '../lock/e2e-data';

// Chats with people on other Nostr apps (docs/nostr-chats.md): 0xchat, Amethyst, Coracle, Primal
// and any other that writes private messages as NIP-17 says. A space can have a Nostr key of its
// own for them (shown as an npub), made here or brought from another app (its nsec); its messages
// come to the relays it names for them (its "inbox", kind 10050), and go to those the other person
// names. The core makes and opens them (crates/erevos-nostr chat): each one sealed for its reader,
// wrapped by a key made for it alone, its time set up to two days back, so a relay sees only
// which key it is for.
//
// This is the account and its chats, as one value kept sealed in the space (lock/nostr-dm-data.ts);
// lib/nostr-dm-store.ts connects it to relays.
//
// Not anonymous: the key is the same to everyone it writes to, and its inbox relays know when it
// reads, and from where unless through Tor.

/** The most messages kept in each chat, and the most wraps remembered as taken. */
export const KEEP_MESSAGES = 500;
const SEEN_MOST = 5000;
/** How many chats a space keeps at most (roomForChat). */
export const CHATS_MOST = 300;

/** Relays a new key reads its messages on: well known ones that keep wraps for anyone. */
export const DEFAULT_INBOX = ['wss://relay.damus.io', 'wss://nos.lol', 'wss://relay.primal.net'];
/** Where people's lists of relays and names are looked up besides their own relays. */
export const LOOKUP_RELAYS = ['wss://purplepag.es', 'wss://relay.damus.io', 'wss://nos.lol', 'wss://relay.primal.net'];
/** NIP-17 asks to keep an inbox small. */
export const INBOX_MOST = 3;

/** How far back a wrap's time may be set (NIP-17): two days, in seconds. */
export const BACKDATE = 2 * 24 * 3600;

export type NostrDmMessage = {
  /** The message's own id (its rumor's), the same in every app. */
  id: string;
  mine: boolean;
  text: string;
  /** When it was written, as it says, in milliseconds. */
  at: number;
  state?: 'sending' | 'sent' | 'failed';
  /** A file sent as NIP-17 sends them (kind 15): shown as such, not fetched yet. */
  file?: true;
};

export type NostrDmChat = {
  /** The other person's key, in hex. */
  key: string;
  messages: NostrDmMessage[];
  unread: number;
  lastAt: number;
  /** A name given here. */
  name?: string;
  /** Where they read their messages (their kind 10050), as last looked up, and when (seconds). */
  relays?: string[];
  relaysAt?: number;
  /** Relays someone or something named for them (an nprofile, a NIP-05 name), to look them up on. */
  hints?: string[];
};

export type NostrDmState = {
  /** The space's Nostr key, hex. */
  secret: string;
  public: string;
  /** Where it reads its messages: the relays its kind 10050 names. */
  inbox: string[];
  /** When its kind 10050 went out last with the inbox as it is (seconds), or 0 when it must go again. */
  told: number;
  /** A name it shows to others (its kind 0), and when that went out. */
  name?: string;
  chats: Record<string, NostrDmChat>;
  /** Names other people gave themselves (their kind 0), and when looked up (seconds). */
  people: Record<string, { name?: string; at: number }>;
  /** Up to when it read all its relays had (seconds): it asks again from two days before. */
  caught: number;
  /** Wraps taken already, by id. */
  seen: string[];
  /** Made here (not brought from another app): its nsec is only here unless written down. */
  madeHere?: boolean;
};

const object = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const isHex64 = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{64}$/.test(value);

/** Whether a kept account has its shape: a damaged one is left out. */
export function isNostrDmState(value: unknown): value is NostrDmState {
  if (!object(value)) return false;
  const v = value as Partial<Record<keyof NostrDmState, unknown>>;
  return (
    isHex64(v.secret) &&
    isHex64(v.public) &&
    Array.isArray(v.inbox) &&
    v.inbox.every(isNostrRelay) &&
    typeof v.told === 'number' &&
    object(v.chats) &&
    object(v.people) &&
    typeof v.caught === 'number' &&
    Array.isArray(v.seen)
  );
}

type Json = Record<string, any>;

/** One call to the core's Nostr chat part. */
export async function chatCore<T extends Json>(op: string, request: Json = {}): Promise<T> {
  const answer = await nostrChatCore()(utf8Encode(JSON.stringify({ op, ...request })));
  return JSON.parse(utf8Decode(answer)) as T;
}

const seconds = (now = Date.now()) => Math.floor(now / 1000);

/** A new account with a key made here, or with the secret of one brought from another app. */
export async function newNostrDm(secret?: string, now = Date.now()): Promise<NostrDmState> {
  const keys = await chatCore<{ secret: string; public: string }>(secret ? 'keys_of' : 'keys_new', secret ? { secret } : {});
  return {
    secret: keys.secret,
    public: keys.public,
    inbox: [...DEFAULT_INBOX],
    told: 0,
    chats: {},
    people: {},
    // A key made here has nothing waiting; one brought along gets what its relays still keep.
    caught: secret ? 0 : seconds(now),
    seen: [],
    ...(secret ? {} : { madeHere: true }),
  };
}

/** What someone wrote to name a person or a key: their key, and relays named with it. */
export type Written = { type: 'npub' | 'nprofile' | 'nsec'; public: string; secret?: string; relays: string[] };

/** Reads an npub, nprofile, nsec or a key's hex (a `nostr:` before it is let be); throws when it is none. */
export async function readKey(text: string): Promise<Written> {
  try {
    return await chatCore<Written>('decode', { text });
  } catch (error) {
    const why = error instanceof Error ? error.message : String(error);
    throw new Error(why.includes('mistyped') ? t('This Nostr key has a typo in it.') : t('Write an npub, such as npub1…, or a name such as name@example.org.'));
  }
}

// NIP-19's bech32 (BIP 173), to show a key as npub1… at once, where waiting on the core would not
// do (a list of chats). The core reads keys people write, checksum and all (readKey).
const BECH32 = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
function bech32Polymod(values: number[]): number {
  const GEN = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
  let chk = 1;
  for (const v of values) {
    const top = chk >>> 25;
    chk = ((chk & 0x1ffffff) << 5) ^ v;
    for (let i = 0; i < 5; i += 1) if ((top >>> i) & 1) chk ^= GEN[i];
  }
  return chk >>> 0;
}

/** A key, in hex, as an npub. */
export function npubOf(key: string): string {
  const words: number[] = [];
  let acc = 0;
  let bits = 0;
  for (let i = 0; i < key.length; i += 2) {
    acc = (acc << 8) | parseInt(key.slice(i, i + 2), 16);
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      words.push((acc >>> bits) & 31);
    }
    acc &= (1 << bits) - 1;
  }
  if (bits > 0) words.push((acc << (5 - bits)) & 31);
  const hrp = 'npub';
  const expanded = [...[...hrp].map((c) => c.charCodeAt(0) >> 5), 0, ...[...hrp].map((c) => c.charCodeAt(0) & 31)];
  const mod = bech32Polymod([...expanded, ...words, 0, 0, 0, 0, 0, 0]) ^ 1;
  const checksum = Array.from({ length: 6 }, (_, i) => (mod >>> (5 * (5 - i))) & 31);
  return `${hrp}1${[...words, ...checksum].map((w) => BECH32[w]).join('')}`;
}

/** The nsec of the space's key, to write down or take to another app. */
export async function nsecOf(state: NostrDmState): Promise<string> {
  return (await chatCore<{ nsec: string }>('nsec', { secret: state.secret })).nsec;
}

/** An nprofile of the space's key with its inbox relays: another app that reads it knows where to write. */
export async function profileOf(state: NostrDmState): Promise<string> {
  return (await chatCore<{ nprofile: string }>('nprofile', { public: state.public, relays: state.inbox })).nprofile;
}

/** A short form of a key for where no name is known: npub1abcd…wxyz. */
export function shortNpub(npub: string): string {
  return npub.length > 20 ? `${npub.slice(0, 9)}…${npub.slice(-4)}` : npub;
}

/** The chat with `key`, made if there is none. */
export function chatOf(state: NostrDmState, key: string): NostrDmChat {
  return (state.chats[key] ??= { key, messages: [], unread: 0, lastAt: 0 });
}

/** The name a chat shows: given here, or the one they gave themselves, or none. */
export function nameOf(state: NostrDmState, key: string): string {
  return state.chats[key]?.name || state.people[key]?.name || '';
}

/** Signs an event with the space's key (its inbox list, its name, an answer to a relay that asks who reads). */
export async function signed(state: NostrDmState, kind: number, tags: string[][], content: string, now = Date.now()): Promise<NostrEvent> {
  return (await chatCore<{ event: NostrEvent }>('sign', { secret: state.secret, created_at: seconds(now), kind, tags, content })).event;
}

/** The space's inbox, as NIP-17 asks it be told (kind 10050). */
export function inboxEvent(state: NostrDmState, now = Date.now()): Promise<NostrEvent> {
  return signed(
    state,
    10050,
    state.inbox.map((relay) => ['relay', relay]),
    '',
    now,
  );
}

/** The space's name for others (kind 0): only a name, nothing else of it. */
export function profileEvent(state: NostrDmState, now = Date.now()): Promise<NostrEvent> {
  return signed(state, 0, [], JSON.stringify(state.name ? { name: state.name, display_name: state.name } : {}), now);
}

/** What a relay that keeps wraps for their reader only is told to show who reads (NIP-42). */
export function authEvent(state: NostrDmState, relay: string, challenge: string): Promise<NostrEvent> {
  return signed(
    state,
    22242,
    [
      ['relay', relay],
      ['challenge', challenge],
    ],
    '',
  );
}

/** Whether an event is what it says and signed by its key. */
export async function verified(event: NostrEvent): Promise<boolean> {
  try {
    return (await chatCore<{ ok: boolean }>('verify', { event })).ok;
  } catch {
    return false;
  }
}

/** The relays the newest of these lists names: a kind 10050 of `key`, checked. */
export async function inboxOf(key: string, events: NostrEvent[]): Promise<string[] | null> {
  const lists = events.filter((e) => e.kind === 10050 && e.pubkey === key).sort((a, b) => b.created_at - a.created_at);
  for (const list of lists) {
    if (!(await verified(list))) continue;
    const relays = [...new Set(list.tags.filter((tag) => tag[0] === 'relay' && isNostrRelay(tag[1])).map((tag) => tag[1].replace(/\/+$/, '')))];
    return relays;
  }
  return null;
}

/** The name `key` gave itself, from the newest of these profiles (kind 0), checked. */
export async function nameIn(key: string, events: NostrEvent[]): Promise<string | undefined> {
  const profiles = events.filter((e) => e.kind === 0 && e.pubkey === key).sort((a, b) => b.created_at - a.created_at);
  for (const profile of profiles) {
    if (!(await verified(profile))) continue;
    try {
      const said = JSON.parse(profile.content) as Record<string, unknown>;
      const name = [said.display_name, said.displayName, said.name].find((n): n is string => typeof n === 'string' && n.trim() !== '');
      return name?.trim().slice(0, 64);
    } catch {
      return undefined;
    }
  }
  return undefined;
}

/** A message to `key`: the wraps for them and for the space's own copy, and the message as it shows. */
export async function wrapText(state: NostrDmState, key: string, text: string, now = Date.now()): Promise<{ message: NostrDmMessage; theirs: NostrEvent; ours: NostrEvent }> {
  const made = await chatCore<{ rumor: { id: string; created_at: number }; wraps: { to: string; event: string }[] }>('wrap', {
    secret: state.secret,
    rumor: { kind: 14, created_at: seconds(now), tags: [['p', key]], content: text },
    to: key === state.public ? [key] : [key, state.public],
    now: seconds(now),
  });
  const wrap = (to: string) => JSON.parse(made.wraps.find((w) => w.to === to)!.event) as NostrEvent;
  return {
    message: { id: made.rumor.id, mine: true, text, at: made.rumor.created_at * 1000, state: 'sending' },
    theirs: wrap(key),
    ours: wrap(state.public),
  };
}

/** Adds a message to its chat, once; answers whether it was new. */
export function addMessage(state: NostrDmState, key: string, message: NostrDmMessage): boolean {
  const chat = chatOf(state, key);
  if (chat.messages.some((m) => m.id === message.id)) return false;
  chat.messages.push(message);
  chat.messages.sort((a, b) => a.at - b.at);
  if (chat.messages.length > KEEP_MESSAGES) chat.messages = chat.messages.slice(-KEEP_MESSAGES);
  chat.lastAt = Math.max(chat.lastAt, message.at);
  if (!message.mine) chat.unread += 1;
  return true;
}

/**
 * Whether one more chat fits. Anyone may write to a Nostr key, so a stranger could make chats
 * without end: past CHATS_MOST, the chat that moved least long ago and has nothing of ours makes
 * room; when every chat has, the new one waits until one is forgotten.
 */
function roomForChat(state: NostrDmState): boolean {
  const chats = Object.values(state.chats);
  if (chats.length < CHATS_MOST) return true;
  const theirsOnly = chats.filter((chat) => !chat.name && !chat.messages.some((m) => m.mine));
  if (!theirsOnly.length) return false;
  const stalest = theirsOnly.reduce((a, b) => (b.lastAt < a.lastAt ? b : a));
  delete state.chats[stalest.key];
  return true;
}

function remember(state: NostrDmState, id: string): void {
  state.seen.push(id);
  if (state.seen.length > SEEN_MOST) state.seen = state.seen.slice(-SEEN_MOST);
}

/**
 * Takes a wrap that came for the space's key: the message it carried goes to its chat. Messages
 * among more than two people, and other kinds, are let be. Answers the chat's key when a message
 * was new there.
 */
export async function takeWrap(state: NostrDmState, event: unknown, now = Date.now()): Promise<string | null> {
  if (!isEvent(event) || event.kind !== 1059 || state.seen.includes(event.id)) return null;
  let opened: { rumor: { id: string; pubkey: string; created_at: number; kind: number; tags: string[][]; content: string } };
  try {
    opened = await chatCore('unwrap', { secret: state.secret, event: JSON.stringify(event) });
  } catch {
    // Not one this key opens, or forged: never again.
    remember(state, event.id);
    return null;
  }
  const { rumor } = opened;
  if (rumor.kind !== 14 && rumor.kind !== 15) {
    remember(state, event.id);
    return null;
  }
  const mine = rumor.pubkey === state.public;
  // The chat is the sender and everyone it names: one other person (theirs, or ours to them from
  // another app with this key), or nobody else (notes to oneself). More is a group: not yet.
  const people = new Set([rumor.pubkey, ...rumor.tags.filter((tag) => tag[0] === 'p' && isHex64(tag[1])).map((tag) => tag[1])]);
  people.delete(state.public);
  if (people.size > 1) {
    remember(state, event.id);
    return null;
  }
  const key = people.size ? [...people][0] : state.public;
  // With no room, it is not remembered: it comes again from the relay once there is.
  if (!state.chats[key] && !roomForChat(state)) return null;
  remember(state, event.id);
  // Its time as it says, but never later than now: a time to come would keep it first for good.
  const at = Math.min(rumor.created_at * 1000, now);
  const message: NostrDmMessage =
    rumor.kind === 15 ? { id: rumor.id, mine, text: '', at, file: true } : { id: rumor.id, mine, text: rumor.content.slice(0, 64_000), at };
  return addMessage(state, key, message) ? key : null;
}

/** Marks a chat's messages read here (NIP-17 tells no one). */
export function markRead(state: NostrDmState, key: string): void {
  const chat = state.chats[key];
  if (chat) chat.unread = 0;
}

/** Forgets a chat here; what relays keep comes again only from what they send anew. */
export function forgetChat(state: NostrDmState, key: string): void {
  delete state.chats[key];
}

/** Sets the inbox: 1 to 3 relays, wss:// (or ws:// to an onion). Throws for one that is not. */
export function setInbox(state: NostrDmState, relays: string[]): void {
  const list = [...new Set(relays.map((r) => r.trim().replace(/\/+$/, '')).filter(Boolean))];
  if (!list.length) throw new Error(t('Name at least one relay.'));
  if (list.length > INBOX_MOST) throw new Error(t('Three relays at most: NIP-17 asks to keep it small.'));
  const bad = list.find((r) => !isNostrRelay(r));
  if (bad) throw new Error(t('{relay} is not a Nostr relay address (wss://…).', { relay: bad }));
  state.inbox = list;
  state.told = 0;
}

/** What `filters` ask a relay for the space's messages, from two days before it last read all. */
export function inboxFilter(state: NostrDmState): Record<string, unknown> {
  const since = state.caught ? Math.max(0, state.caught - BACKDATE - 600) : 0;
  return { kinds: [1059], '#p': [state.public], ...(since ? { since } : { limit: 1000 }) };
}
