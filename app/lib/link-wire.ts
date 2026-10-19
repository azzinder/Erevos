import { checkedAvatar, checkedSpare, cleanName, isRelay, isRelayKey, isTimer, type Avatar, type Contact, type Spare } from '../lock/e2e-data';
import { isTag, type Mark } from '../lock/history';
import { checkedLook, type Look } from '../theme/look';
import { readOffer, type FileOffer } from './attachments';
import { checkContact, checkSpare, type ContactCode } from './contact-code';
import { fromBase64, randomBytes, toBase64, toHex, utf8Decode, utf8Encode } from './crypto';

// What goes between the devices of one account (lib/devices.ts), inside the conversation of their
// link: JSON, one envelope in each packet, each saying what kind it is (`k`) and where its sender
// reads (`at`), so the other learns a new queue with the next one. From the primary (the phone that
// holds the account): its first message (`hello`), the contacts (`contacts`), a contact's message it
// opened (`in`), one it sealed for a contact (`out`), a pack of the history on the relay's file store
// (`history`), where it is now (`here`) and that it unlinked the device (`bye`). From a linked
// device: that the codes match (`ready`), a message for a contact (`send`), a contact to add (`add`),
// a change to a contact (`set`), where it is (`here`) and that it unlinked itself (`bye`). An
// envelope too large for one packet goes in parts (`part`).
//
// A contact's message travels as the JSON lib/e2e.ts makes of it (`m`), without where the contact's
// queue is, which only the primary needs. Which messages go on, and which are worth telling the
// other devices, is decided from that JSON alone, so what a later version adds to a message goes on
// unread.
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
};

/** A contact's message, as JSON. */
export type Json = Record<string, unknown>;

export type Envelope =
  | { k: 'hello'; secret: string; name: string; account: string }
  | { k: 'ready'; name: string }
  | { k: 'contacts'; all: boolean; list: Synced[]; gone: string[]; link?: string }
  | { k: 'in'; c: string; m: Json }
  | { k: 'out'; c: string; m: Json; mark?: Mark }
  | { k: 'send'; c: string; m: Json }
  | { k: 'add'; code: ContactCode }
  | { k: 'set'; c: string; change: Partial<Omit<Synced, 'identity'>>; remove?: boolean }
  | { k: 'history'; offer: FileOffer; last: boolean }
  | { k: 'here' }
  | { k: 'bye' };

type Said = Envelope & { at?: Place };
type Part = { k: 'part'; id: string; n: number; of: number; d: string };

/** The largest envelope one packet takes: the core's largest padding bucket holds 16383 bytes. */
export const MAX_ENVELOPE = 16 * 1024 - 1;
// An envelope larger than this goes in parts of PART_BYTES each.
const SPLIT_OVER = 15 * 1024;
const PART_BYTES = 10 * 1024;
// The most parts one envelope is cut into, and how long parts wait for the rest.
const MAX_PARTS = 128;
const PARTS_STALE = 30 * 60_000;

const isText = (v: unknown): v is string => typeof v === 'string';
const isHex = (v: unknown, length: number): v is string => isText(v) && v.length === length && /^[0-9a-f]+$/.test(v);
const isTime = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0;
const isObject = (v: unknown): v is Json => !!v && typeof v === 'object' && !Array.isArray(v);

/** A place as said, checked: null when it is not one. */
export function checkedPlace(value: unknown): Place | null {
  const v = (value ?? {}) as Partial<Record<keyof Place, unknown>>;
  if (!isHex(v.sender, 48) || !isRelay(v.relay)) return null;
  return { sender: v.sender, relay: v.relay, relayKey: isRelayKey(v.relayKey) ? v.relayKey : '', spare: checkedSpare(v.spare) };
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
  return {
    identity: v.identity,
    name: isText(v.name) ? cleanName(v.name) : '',
    timer: isTimer(v.timer) ? v.timer : 0,
    timerAt: isTime(v.timerAt) ? v.timerAt : 0,
    request: v.request === true,
    look: isObject(v.look) ? checkedLook(v.look) : null,
    ...('avatar' in v ? { avatar: v.avatar === null ? null : checkedAvatar(v.avatar) } : {}),
    hide: v.hide === true,
  };
}

/** The fields of `now` that differ from `before`, a contact as last said. */
export function changedFields(before: Synced, now: Synced): Partial<Omit<Synced, 'identity'>> {
  const change: Partial<Omit<Synced, 'identity'>> = {};
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
    ...(kept ?? { heldGot: [], heldRead: [], phone: '', avatar: null }),
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

function checkedEnvelope(v: Json): Envelope | null {
  switch (v.k) {
    case 'hello':
      return isHex(v.secret, 32) && isText(v.name) && isHex(v.account, 64) ? { k: 'hello', secret: v.secret, name: v.name, account: v.account } : null;
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
      return code?.key ? { k: 'add', code: spare ? { ...code, spare } : code } : null;
    }
    case 'set': {
      if (!isHex(v.c, 64)) return null;
      if (v.remove === true) return { k: 'set', c: v.c, change: {}, remove: true };
      const said = isObject(v.change) ? v.change : {};
      const full = checkedSynced({ ...said, identity: v.c });
      if (!full) return null;
      const change: Partial<Omit<Synced, 'identity'>> = {};
      for (const field of ['name', 'timer', 'timerAt', 'request', 'look', 'avatar', 'hide'] as const) {
        if (field in said) (change as Record<string, unknown>)[field] = full[field] ?? null;
      }
      return { k: 'set', c: v.c, change };
    }
    case 'history': {
      const offer = readOffer(v.offer);
      return offer ? { k: 'history', offer, last: v.last === true } : null;
    }
    case 'here':
    case 'bye':
      return { k: v.k };
    default:
      return null;
  }
}

/** One envelope, with where its sender reads, as it goes in a packet or in parts. */
export function encodeEnvelope(envelope: Envelope, at: Place | null): Uint8Array[] {
  const bytes = utf8Encode(JSON.stringify({ v: 1, ...envelope, ...(at ? { at } : {}) }));
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
export function encodeOne(envelope: Envelope, at: Place | null): Uint8Array | null {
  for (const where of at ? [at, null] : [null]) {
    const bytes = utf8Encode(JSON.stringify({ v: 1, ...envelope, ...(where ? { at: where } : {}) }));
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
  return at ? { ...envelope, at } : envelope;
}

// What says where a contact's queue is, in a message: only the primary keeps it.
const PLACE_KEYS = ['from', 'relay', 'relayKey', 'spare'];
// What a message carries that is not worth telling the account's other devices on its own: it says
// that messages came, that a phone is open or someone types, or asks, with the chat's timer, which
// the contacts carry.
const QUIET_KEYS = new Set([...PLACE_KEYS, 'text', 'tag', 'timer', 'timerAt', 'lasts', 'got', 'on', 'onAt', 'ask', 'quiet', 'due', 'typing']);

/** Whether a message is a call's or a group's signal: those stay on the primary. */
export function isSignal(m: Json): boolean {
  return m.call !== undefined || m.group !== undefined;
}

/** A contact's message without where their queue is. */
export function withoutPlace(m: Json): Json {
  const out: Json = {};
  for (const [key, value] of Object.entries(m)) if (!PLACE_KEYS.includes(key)) out[key] = value;
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

/** One message of the history as it goes in a pack: its sound with it, a photo or file as a copy on the relay. */
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
      },
    ];
  });
}

/** A pack of messages, as it goes to the relay's file store. */
export function writePack(entries: PackEntry[]): Uint8Array {
  return utf8Encode(JSON.stringify({ v: 1, m: entries }));
}
