import { checkedLook, type Look } from '../theme/look';
import { isPhotoRef, type PhotoRef } from './avatar-photos';
import { isTag } from './history';
import { sealedFile, type Holder } from './sealed-file';

// What each space, and each space's hidden chats, keeps for end-to-end encryption (lib/e2e.ts):
// its own account, whose public keys its contact link gives out, and a conversation with each
// contact; on a linked device also its own endpoint and what it checked of its account, and on the
// phone that holds the account its device list (lib/device-list.ts). Kept sealed in FILE, one value
// for each space and each hidden chats (sealed-file.ts), in blocks of BLOCK bytes. A space whose
// key changed starts with a new account and no contacts.

export type { Holder };

export type Contact = {
  /** The contact's identity key, hex: who they are. */
  identity: string;
  /** The relay sender id that reaches them, hex. Empty until they say. */
  sender: string;
  /** The relay their queue is on, when it is not this chat's own: ws:// or wss://. Empty for the
   *  same relay as this chat, or when they have not said. */
  relay: string;
  /** That relay's key for sealed sends, base64url, so messages reach it through this chat's relay. */
  relayKey: string;
  /** Their backup queue, on another relay (one at home, say): where to write when their relay
   *  cannot be reached. Null, or missing in what was kept before backup relays, when they have none. */
  spare?: Spare | null;
  /** Conversations with them, base64, newest first: the first is the one to send in. */
  conversations: string[];
  /** The first packet of a conversation started here, base64, until the relay has taken it. */
  first: string;
  /** The name this chat gives them. Empty until one is given. Only this phone knows it. */
  name: string;
  /** Seconds after which new messages with them disappear, on both phones. 0 keeps them. */
  timer: number;
  /** When either phone last set the timer, milliseconds on that phone's clock: the later setting wins. */
  timerAt: number;
  /** They wrote first, from this chat's link, and this chat has not accepted them yet: a message
   *  request. Their phone hears nothing back (not even that a message came) until it does. */
  request: boolean;
  /** This chat's own look (Appearance, from its details), or null for the space's. Only this phone knows it. */
  look: Look | null;
  /** The picture this chat gives them instead of the one drawn from their key, or null. Only this phone knows it. */
  avatar: Avatar | null;
  /** This chat appears offline to them: nothing tells them this phone is open, and what came
   *  and was read is held (`heldGot`, `heldRead`) until this chat next writes to them. */
  hide: boolean;
  /** Tags of their messages that came here, and that were read here, not told yet because the chat
   *  appears offline. */
  heldGot: string[];
  heldRead: string[];
  /** Their phone number, when this chat linked it to them (by hand, or through an SMS invite), so
   *  writing to the number goes through Erevos. Empty when not linked. Only this phone knows it. */
  phone: string;
  /** The identity key, hex, they know this chat by, when it is not this account's: a chat moved
   *  here from the space (into its hidden chats) keeps the space's, so the safety number stays the
   *  same. Empty for this account's own. */
  ownIdentity: string;
  /** Ids of the first messages taken from them, the latest MAX_SEEN_EACH: one a relay sends again
   *  is refused, however many others came since. */
  seen: string[];
  /** The key this chat gave them for the packets they send it (lib/sealed-packet.ts), base64url,
   *  once made; `sealTo`, the one they gave this chat, once said. `sealsIn`: their packets come
   *  sealed, so one that does not is tried in their conversations only now and then. */
  packetKey: string;
  sealTo: string;
  sealsIn: boolean;
  /** Their prekeys as they last gave them inside their conversation (their bundle, base64), when
   *  newer than their link's: what the conversation started next with them starts with. Missing
   *  until they give some. */
  bundle?: string;
  /** When the newest prekeys this chat gave them were made (`E2EData.prekeys`, ms), or 0. */
  bundleSent?: number;
  /** The first packet of a conversation started here with their newer prekeys, base64, until the
   *  relay has taken it. Nothing waits for it: it goes on its own. */
  renew?: string;
};

/** A queue on a backup relay: its sender id (hex), the relay, and the relay's key (base64url, or
 *  empty when it has none). */
export type Spare = { sender: string; relay: string; relayKey: string };

/** A backup queue as said, checked: null when it is not one. */
export function checkedSpare(value: unknown): Spare | null {
  const v = (value ?? {}) as Partial<Record<keyof Spare, unknown>>;
  if (!isHex(v.sender) || v.sender.length !== 48 || !isRelay(v.relay)) return null;
  return { sender: v.sender, relay: v.relay, relayKey: isRelayKey(v.relayKey) ? v.relayKey : '' };
}

/** A contact's picture of this chat's choosing: a sign (an emoji) on a colour, or a photo (lock/avatar-photos.ts). */
export type Avatar = { kind: 'emoji'; emoji: string; color: string } | ({ kind: 'photo' } & PhotoRef);

const HEX_COLOR = /^#[0-9A-F]{6}$/;

/** A kept picture, checked: one this version does not know (written by a newer one, or damaged) is none. */
export function checkedAvatar(value: unknown): Avatar | null {
  const v = (value ?? {}) as Partial<Record<'kind' | 'emoji' | 'color' | 'id' | 'key', unknown>>;
  if (v.kind === 'photo') return isPhotoRef(v) ? { kind: 'photo', id: v.id, key: v.key } : null;
  if (v.kind !== 'emoji' || !isText(v.emoji) || typeof v.color !== 'string') return null;
  const emoji = v.emoji.trim();
  const color = v.color.toUpperCase();
  // One sign: a few code points at most (a flag, a skin tone, a joined emoji).
  if (!emoji || [...emoji].length > 8 || /[\u0000-\u001f\u202a-\u202e\u2066-\u2069]/.test(emoji) || !HEX_COLOR.test(color)) return null;
  return { kind: 'emoji', emoji, color };
}

/**
 * The account's device list (lib/device-list.ts) as the primary signed it last, or as one of its
 * linked devices last checked it: its body and the account's signature of it (base64url), its `n`,
 * and which of its endpoints are the devices' (`real`, hex): the others only fill its places. Only
 * the account's own devices know which.
 */
export type OwnList = { b: string; s: string; n: number; real: string[] };

/** On a linked device: its account as the phone said it over the link (identity, hex; bundle, base64url), and the account's list as last checked. */
export type Own = { identity: string; bundle: string; list: OwnList | null };

/** A linked device's own endpoint (docs/multi-device.md) as others know it: its identity, hex, and its bundle, base64url. */
export type Endpoint = { id: string; bundle: string };

export type E2EData = {
  /** The account's secret keys, base64. Empty until the chat first opens. */
  account: string;
  contacts: Contact[];
  /** The ids of the first packets opened here, hex, oldest first, so a replayed one is dropped. */
  seen: string[];
  /** The restore of a backup (lock/restored.ts) the conversations were last moved past, or ''.
   *  Missing in what was kept before it. */
  restore: string;
  /** The account's newer prekeys (lib/e2e.ts PREKEYS_EVERY), newest first, each its secret and
   *  bundle (base64) and when it was made (ms): contacts start their next conversations with the
   *  newest, and a first packet opens with any kept. Missing in what was kept before them. */
  prekeys?: Prekeys[];
  /** On a linked device: its own endpoint (docs/multi-device.md), a core account's secret keys,
   *  base64, that the device made and no one else holds. Missing elsewhere, and in what was kept
   *  before it. */
  endpoint?: string;
  /** On a linked device: its account, and the account's device list. */
  own?: Own;
  /** On the primary: the device list as last signed, which a backup carries, so a phone put back
   *  from one signs a later one. */
  list?: OwnList;
};

export type Prekeys = { secret: string; bundle: string; at: number };

/** The most newer prekeys kept: a first packet started with older ones no longer opens. */
export const MAX_PREKEYS = 3;

export const EMPTY_E2E: E2EData = { account: '', contacts: [], seen: [], restore: '' };

export const FILE = 'erevos-e2e';
const BLOCK = 16 * 1024;

export const MAX_NAME = 40;

/** The longest a disappearing message lasts, seconds: four weeks. */
export const MAX_TIMER = 28 * 24 * 3600;

export const isTimer = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= MAX_TIMER;
const isTime = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0;

/** A contact's name as kept: one line of at most MAX_NAME characters, without control or direction marks. */
export function cleanName(text: string): string {
  const line = text.replace(/[\u0000-\u001f\u007f-\u009f\u200e\u200f\u202a-\u202e\u2028\u2029\u2066-\u2069]/g, ' ');
  return [...line.replace(/\s+/g, ' ').trim()].slice(0, MAX_NAME).join('').trim();
}

const isText = (v: unknown): v is string => typeof v === 'string';
const isBase64 = (v: unknown): v is string => isText(v) && /^[A-Za-z0-9+/]*={0,2}$/.test(v);
const isHex = (v: unknown): v is string => isText(v) && /^([0-9a-f]{2})*$/.test(v);
const isBase64Url = (v: unknown, most: number): v is string => isText(v) && v.length > 0 && v.length <= most && /^[A-Za-z0-9_-]+$/.test(v);
/** A relay address as contact links give it. */
export const isRelay = (v: unknown): v is string => isText(v) && v.length <= 512 && /^wss?:\/\/[^\s/?#]+(\/[^\s]*)?$/i.test(v);
/** A relay's public key for sealed sends: 32 bytes, base64url without padding. */
export const isRelayKey = (v: unknown): v is string => isText(v) && /^[A-Za-z0-9_-]{43}$/.test(v);

/** The most tags held for a contact, of each kind: the latest are kept. */
export const MAX_HELD = 200;
const heldTags = (v: unknown): string[] => (Array.isArray(v) ? v.filter(isTag).slice(-MAX_HELD) : []);
/** The most first-message ids kept for a contact. */
export const MAX_SEEN_EACH = 16;

function checkedContact(value: unknown): Contact | null {
  const v = (value ?? {}) as Partial<Record<keyof Contact, unknown>>;
  if (!isHex(v.identity) || v.identity.length !== 64) return null;
  const conversations = Array.isArray(v.conversations) ? v.conversations.filter(isBase64) : [];
  return {
    identity: v.identity,
    sender: isHex(v.sender) && v.sender.length === 48 ? v.sender : '',
    relay: isRelay(v.relay) ? v.relay : '',
    relayKey: isRelayKey(v.relayKey) ? v.relayKey : '',
    spare: checkedSpare(v.spare),
    conversations,
    first: isBase64(v.first) ? v.first : '',
    name: isText(v.name) ? cleanName(v.name) : '',
    timer: isTimer(v.timer) ? v.timer : 0,
    timerAt: isTime(v.timerAt) ? v.timerAt : 0,
    request: v.request === true,
    look: v.look && typeof v.look === 'object' ? checkedLook(v.look) : null,
    avatar: checkedAvatar(v.avatar),
    ownIdentity: isHex(v.ownIdentity) && v.ownIdentity.length === 64 ? v.ownIdentity : '',
    hide: v.hide === true,
    heldGot: heldTags(v.heldGot),
    heldRead: heldTags(v.heldRead),
    phone: isText(v.phone) && /^\+?\d{3,20}$/.test(v.phone) ? v.phone : '',
    seen: Array.isArray(v.seen) ? v.seen.filter(isHex).slice(-MAX_SEEN_EACH) : [],
    packetKey: isRelayKey(v.packetKey) ? v.packetKey : '',
    sealTo: isRelayKey(v.sealTo) ? v.sealTo : '',
    sealsIn: v.sealsIn === true,
    ...(isBase64(v.bundle) && v.bundle ? { bundle: v.bundle } : {}),
    ...(isTime(v.bundleSent) ? { bundleSent: v.bundleSent } : {}),
    ...(isBase64(v.renew) && v.renew ? { renew: v.renew } : {}),
  };
}

function checkedPrekeys(value: unknown): Prekeys | null {
  const v = (value ?? {}) as Partial<Record<keyof Prekeys, unknown>>;
  return isBase64(v.secret) && v.secret && isBase64(v.bundle) && v.bundle && isTime(v.at) ? { secret: v.secret, bundle: v.bundle, at: v.at } : null;
}

// A bundle is about 1800 characters, a list's body about four of them, and a list names at most
// four devices (lib/device-list.ts).
const MAX_BUNDLE = 4096;
const MAX_LIST = 24 * 1024;
const MAX_REAL = 4;

function checkedList(value: unknown): OwnList | null {
  const v = (value ?? {}) as Partial<Record<keyof OwnList, unknown>>;
  if (!isBase64Url(v.b, MAX_LIST) || !isBase64Url(v.s, 128) || !Number.isSafeInteger(v.n) || (v.n as number) <= 0) return null;
  const real = Array.isArray(v.real) ? v.real.filter((id): id is string => isHex(id) && id.length === 64).slice(0, MAX_REAL) : [];
  return { b: v.b, s: v.s, n: v.n as number, real };
}

function checkedOwn(value: unknown): Own | null {
  const v = (value ?? {}) as Partial<Record<keyof Own, unknown>>;
  if (!isHex(v.identity) || v.identity.length !== 64 || !isBase64Url(v.bundle, MAX_BUNDLE)) return null;
  return { identity: v.identity, bundle: v.bundle, list: checkedList(v.list) };
}

/** What was stored, with anything of the wrong shape left out. */
function checked(value: unknown): E2EData {
  const v = (value ?? {}) as Partial<Record<keyof E2EData, unknown>>;
  const contacts = Array.isArray(v.contacts) ? v.contacts.map(checkedContact).filter((c): c is Contact => c !== null) : [];
  const own = checkedOwn(v.own);
  const list = checkedList(v.list);
  return {
    account: isBase64(v.account) ? v.account : '',
    contacts,
    seen: Array.isArray(v.seen) ? v.seen.filter(isHex) : [],
    restore: isHex(v.restore) && v.restore.length === 32 ? v.restore : '',
    ...(Array.isArray(v.prekeys) ? { prekeys: v.prekeys.map(checkedPrekeys).filter((p): p is Prekeys => p !== null).slice(0, MAX_PREKEYS) } : {}),
    ...(isBase64(v.endpoint) && v.endpoint ? { endpoint: v.endpoint } : {}),
    ...(own ? { own } : {}),
    ...(list ? { list } : {}),
  };
}

const store = sealedFile({ name: FILE, empty: EMPTY_E2E, checked, block: BLOCK });

export const loadE2EData = store.load;
export const saveE2EData = store.save;
