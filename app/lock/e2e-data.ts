import { isRelayAddress } from '../lib/relay';
import { MAX_PARTS } from '../lib/voice';
import { checkedLook, type Look } from '../theme/look';
import { isPhotoRef, type PhotoRef } from './avatar-photos';
import { isTag } from './history';
import { sealedFile, type Holder } from './sealed-file';

// What each space, and each space's hidden chats, keeps for end-to-end encryption (lib/e2e.ts):
// its own account, whose public keys its contact link gives out, and a conversation with each
// contact; on a linked device also its own endpoint and what it checked of its account, and on the
// phone that holds the account its device list (lib/device-list.ts). Of a contact whose account
// lists devices, also that list as checked here and a way to each endpoint it names (`Way`), and on
// a linked device its endpoint's own way to their account (docs/multi-device.md). Kept sealed in
// FILE, one value for each space and each hidden chats (sealed-file.ts), in blocks of BLOCK bytes.
// A space whose key changed starts with a new account and no contacts.

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
   *  same, and one moved from hidden chats into the space keeps theirs; to them the chat says nothing
   *  of devices (lib/e2e.ts partOf). Empty for this account's own; on a linked device, its account's. */
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
  /** The relay sender id, hex, of a ring queue this contact (a hidden place) said it has, for a
   *  call to ring them while their hidden chats are closed (lock/hidden-ring.ts). On the same relay
   *  as their message queue (`relay`/`sender`). Empty when they said none, or an older Erevos that
   *  says nothing of a ring queue: then a call to them rings only while their chats are open. */
  ringSender?: string;
  /** Their prekeys as they last gave them inside their conversation (their bundle, base64), when
   *  newer than their link's: what the conversation started next with them starts with. Missing
   *  until they give some. */
  bundle?: string;
  /** When the newest prekeys this chat gave them were made (`E2EData.prekeys`, ms), or 0. */
  bundleSent?: number;
  /** The first packet of a conversation started here with their newer prekeys, base64, until the
   *  relay has taken it. Nothing waits for it: it goes on its own. */
  renew?: string;
  /** The `n` of this chat's account's device list they last said they hold (`dv`), 0 for none;
   *  missing while what they send says nothing of devices (an Erevos before, or a chat of theirs
   *  moved into or out of hidden chats), and with one this chat says nothing of devices to. */
  dv?: number;
  /** Their account's device list as last checked here, against `bundle`. */
  list?: TheirList;
  /** A way to each endpoint their list names, devices and the places that fill it alike. */
  endpoints?: Way[];
  /** On a linked device: its own endpoint's way to their account, once it writes to them itself. */
  direct?: Way;
  /** On the primary: when this chat last gave them its account's list (ms), so one they still do
   *  not hold is given again a day later; and which it gave, its `n` and its `rAt` (OwnList), so the
   *  same is not given again, but a later one, or where its endpoints read changed since, is. */
  listSent?: number;
  listGiven?: { n: number; rAt: number };
  /** The `qa` their messages last said (lib/moves.ts): when the queue they read on was made. A later
   *  message that says an older one, as a late copy, leaves where they read as it is. Missing while
   *  none said one (an Erevos before). */
  qa?: number;
  /** When this chat last told them its own queue (lib/queue-move.ts), and `onNew`: the `qa` of this
   *  chat's own queue they were last heard on, so the old one goes once all were. */
  told?: Told;
  onNew?: number;
  /** Moved here from the space or one of its hidden places (lock/move-chat.ts): the `qa` the other
   *  said to them last (`qaFloor`), and this chat's own then (`qaBase`). What this chat says them is
   *  later than the first by as much as its own moved on since, so a late copy of what the other
   *  sent, or of what this chat sent before a move, never takes them back, nor are its moves lost
   *  on them. */
  qaFloor?: number;
  qaBase?: number;
  /** The place's ring queue moved since they were told it: the next tell says it (`rf`). */
  ringTell?: true;
  /** On a linked device, and from a contact whose account lists devices (`list`): their messages
   *  taken here, each once by its tag, with the day it first came, for as long as another copy of
   *  it may still come (TOOK_LASTS), and of a voice message not all taken yet the parts that were;
   *  so one that comes again, through the phone and directly, or from their account and from one
   *  of their endpoints, is taken once, whether or not it is still kept. */
  took?: Took[];
};

/**
 * A message of a contact's taken here (Contact.took): its tag (`t`), the day it first came (`at`,
 * ms at the start of that day, UTC: no more than the day is kept), of a voice message not all taken
 * yet the parts that were (`p`), and whether it came again since (`two`).
 */
export type Took = { t: string; at: number; p?: number[]; two?: true };

/** When a contact was told this chat's own queue: its `qa`, when first, and how many times (lib/moves.ts). */
export type Told = { qa: number; at: number; n: number };

/** Someone blocked (E2E.deleteContact): their identity (hex), the name they had here, and when. */
export type Blocked = { identity: string; name: string; at: number };

/** The most blocked kept: the oldest goes first. */
export const MAX_BLOCKED = 200;

/**
 * Ours a relay holds for later that is to go no more, that it was not yet asked to drop
 * (lib/waiting.ts, dropHeld): for a contact deleted or blocked here, or held anew elsewhere
 * (holdAgain); its ids there (hex, comma-separated), that relay, and when it would go (ms), after
 * which there is nothing to drop.
 */
export type Undropped = { id: string; relay: string; at: number };

/** The most kept to drop, far more than wait to go at once; past it the oldest goes first. */
export const MAX_UNDROPPED = 256;

/** A contact's device list as checked: its body and the account's signature (base64url), and its `n`. */
export type TheirList = { b: string; s: string; n: number };

/**
 * One endpoint of a contact's account, as their list names it, or their account itself from a
 * linked device: its identity (hex) and bundle (base64url, empty for their account); where it reads (its relay queue's sender
 * id, hex, empty until known; the relay; the relay's key, base64url); the conversations with it,
 * base64, newest first; the first packet of one started here, until the relay has taken it; the ids
 * of the first packets taken from it; the key it gave this chat for the packets it sends it
 * (`sealTo`), and whether its packets come sealed (`sealsIn`). `again`: from when the next copy
 * starts another conversation with it, those it has kept to open in, until it answers in one: a
 * day after one was started here, should it never answer in it (its first packet may have been
 * lost after the relay took it), longer as more were before it (`againAfter`), and at once when
 * its side may have lost them.
 */
export type Way = {
  id: string;
  bundle: string;
  sender: string;
  relay: string;
  relayKey: string;
  spare?: Spare | null;
  conversations: string[];
  first: string;
  seen: string[];
  sealTo: string;
  sealsIn: boolean;
  again?: number;
};

/** How long a conversation started with an endpoint, or with another of the account's devices, waits for an answer in it before the next packet for it starts another (Way.again): a day, and as more are kept from before it to open in (`before`), two, four, then eight days, so one that never answers costs ever less, and a device away for long still finds one the relay kept (14 days). */
export const WAY_AGAIN = 24 * 60 * 60_000;
export const againAfter = (before: number): number => WAY_AGAIN * 2 ** Math.min(before, 3);

/** A first packet from an endpoint (`peer`, hex) its account's list could not be checked to name yet: tried again with that account's next list. */
export type Unverified = { packet: string; acct: string; peer: string; at: number };

/** The most first packets kept to try again, in all and from one account, and for how long. */
export const MAX_UNVERIFIED = 16;
export const MAX_UNVERIFIED_EACH = 4;
export const UNVERIFIED_LASTS = 14 * 24 * 60 * 60_000;

/** On a linked device: a first packet a contact's account (`identity`, hex) started with its endpoint before the phone said who they are: tried again once it does. */
export type Early = { packet: string; identity: string; at: number };

/** The most of those kept, and for how long. */
export const MAX_EARLY = 8;
export const EARLY_LASTS = UNVERIFIED_LASTS;

/**
 * The most of a contact's messages kept as taken (`took`), and for how long after the day one came:
 * as long as its second copy may take within what this version and its relay keep, one waiting in
 * the contact's outbox (lock/fanout-data.ts COPIES_LAST) and then in a device's queue on the relay,
 * or in the phone's queue and then, passed on, in the device's, 14 days each, and two days more. A
 * copy can come later still: one the phone passes on after it was off, or its queue full, for
 * longer, as the contact's phone tries it again until it takes it, or one from a relay that keeps
 * messages longer.
 */
export const MAX_TOOK = 2000;
export const TOOK_LASTS = 30 * 24 * 60 * 60_000;
export const TOOK_DAY = 24 * 60 * 60_000;

/** The start of the day (UTC) `ms` is in, as Took.at says when a message came. */
export const tookDay = (ms: number): number => ms - (ms % TOOK_DAY);

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
export type OwnList = { b: string; s: string; n: number; real: string[]; r?: Record<string, Route>; q?: Record<string, string>; rAt?: number; restore?: string; cut?: number; qWas?: OldFiller[] };

/**
 * A queue a place that fills the list read on before the phone's own queue moved for a contact
 * deleted or blocked (lib/devices.ts): its recipient id (hex), on the relay it was made on, emptied
 * now and then until `until` (ms), then deleted. Kept in `qWas`, at most MAX_OLD_FILLERS.
 */
export type OldFiller = { q: string; relay: string; until: number };
export const MAX_OLD_FILLERS = 16;

/**
 * Where an endpoint reads, as a list says it to contacts (lib/device-list.ts Route): its queue's
 * sender id (hex), its relay, that relay's key, and the key contacts seal what they send it with
 * for that relay (`pk`, lib/sealed-packet.ts), each contact's its own. On the primary `r` holds one
 * for each endpoint its list names, with the key each contact's is drawn from (entryKey: a device's
 * `ek`, a random one for a place that fills the list), `q` the recipient id (hex) of each queue it made for a place that fills the list, on
 * the relay `r` says, `rAt` when the list was signed or `r` last changed (later each time, whatever
 * the clock says), `restore` the restore of a backup (E2EData.restore) the list was signed after,
 * and `cut` the `n` of the last list before it that may name a device it does not (one unlinked, or
 * one a phone put back from a backup does not know of): a contact who holds that one or an older
 * one is given it even while a place in it has no route yet.
 */
export type Route = { s: string; relay: string; rk: string; pk?: string };

/** On a linked device: its account as the phone said it over the link (identity, hex; bundle, base64url), and the account's list as last checked. */
export type Own = { identity: string; bundle: string; list: OwnList | null };

/** A linked device's own endpoint (docs/multi-device.md) as others know it: its identity, hex, and its bundle, base64url. */
/** A linked device's endpoint: its identity (hex) and bundle (base64url), and what the key each contact seals what they send it with for the relay is drawn from (`ek`, base64url, lib/sealed-packet.ts entryKey), which a device from before does not say. */
export type Endpoint = { id: string; bundle: string; ek?: string };

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
  /** When a backup was last put back under this account (ms, by this phone's clock then): its
   *  contacts may hold a later list than the one kept, signed after the backup was made. Missing on
   *  one never put back, and on an account made since. */
  putBack?: number;
  /** First packets from endpoints of contacts' accounts, their lists not checked to name them yet. */
  unverified?: Unverified[];
  /** On a linked device: first packets from contacts' accounts it did not know yet. */
  early?: Early[];
  /** When a contact was deleted or blocked here (ms): this chat's own queue moves (lib/queue-move.ts)
   *  once it has not since. Saved with the contact's removal, so neither is kept without the other.
   *  Missing when no move is due. */
  moveDue?: number;
  /** Who is blocked: a first packet from them is dropped, and so is what they ask through a group or an SMS invite. */
  blocked?: Blocked[];
  /** What a relay still holds for later for those deleted or blocked here. Saved with their removal. Missing when none. */
  undropped?: Undropped[];
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
    ...(isHex(v.ringSender) && v.ringSender.length === 48 ? { ringSender: v.ringSender } : {}),
    ...(isBase64(v.bundle) && v.bundle ? { bundle: v.bundle } : {}),
    ...(isTime(v.bundleSent) ? { bundleSent: v.bundleSent } : {}),
    ...(isBase64(v.renew) && v.renew ? { renew: v.renew } : {}),
    ...(isCount(v.dv) ? { dv: v.dv } : {}),
    ...(checkedTheirList(v.list) ? { list: checkedTheirList(v.list)! } : {}),
    ...(Array.isArray(v.endpoints) ? { endpoints: v.endpoints.map(checkedWay).filter((w): w is Way => w !== null).slice(0, MAX_REAL) } : {}),
    ...(checkedWay(v.direct) ? { direct: checkedWay(v.direct)! } : {}),
    ...(isCount(v.listSent) ? { listSent: v.listSent } : {}),
    ...(checkedGiven(v.listGiven) ? { listGiven: checkedGiven(v.listGiven)! } : {}),
    ...(Array.isArray(v.took) ? { took: v.took.map(checkedTook).filter((t): t is Took => t !== null).slice(-MAX_TOOK) } : {}),
    ...(isTime(v.qa) ? { qa: v.qa } : {}),
    ...(checkedTold(v.told) ? { told: checkedTold(v.told)! } : {}),
    ...(isTime(v.onNew) ? { onNew: v.onNew } : {}),
    ...(isTime(v.qaFloor) && v.qaFloor > 0 ? { qaFloor: v.qaFloor } : {}),
    ...(isTime(v.qaBase) && v.qaBase > 0 ? { qaBase: v.qaBase } : {}),
    ...(v.ringTell === true ? { ringTell: true as const } : {}),
  };
}

function checkedTold(value: unknown): Told | null {
  const v = (value ?? {}) as Partial<Record<keyof Told, unknown>>;
  return isTime(v.qa) && isTime(v.at) && isCount(v.n) ? { qa: v.qa, at: v.at, n: v.n } : null;
}

/** One blocked, as stored or as the phone tells its devices (lib/link-wire.ts), or null if of the wrong shape. */
export function checkedBlocked(value: unknown): Blocked | null {
  const v = (value ?? {}) as Partial<Record<keyof Blocked, unknown>>;
  return isHex(v.identity) && v.identity.length === 64 && isTime(v.at) ? { identity: v.identity, name: isText(v.name) ? cleanName(v.name) : '', at: v.at } : null;
}

const HELD_ID = /^[0-9a-f]{32}(?:,[0-9a-f]{32}){0,63}$/;

function checkedUndropped(value: unknown): Undropped | null {
  const v = (value ?? {}) as Partial<Record<keyof Undropped, unknown>>;
  return typeof v.id === 'string' && HELD_ID.test(v.id) && typeof v.relay === 'string' && isRelayAddress(v.relay) && isTime(v.at) ? { id: v.id, relay: v.relay, at: v.at } : null;
}

const isCount = (v: unknown): v is number => Number.isSafeInteger(v) && (v as number) >= 0;

function checkedGiven(value: unknown): { n: number; rAt: number } | null {
  const v = (value ?? {}) as Partial<Record<'n' | 'rAt', unknown>>;
  return isCount(v.n) && isCount(v.rAt) ? { n: v.n, rAt: v.rAt } : null;
}

// One kept by the version before, with the time it came to the millisecond, is kept with its day only.
function checkedTook(value: unknown): Took | null {
  const v = (value ?? {}) as Partial<Record<keyof Took, unknown>>;
  if (!isTag(v.t) || !isTime(v.at)) return null;
  const parts = Array.isArray(v.p) ? v.p.filter((p): p is number => isCount(p)).slice(0, MAX_PARTS) : null;
  return { t: v.t, at: tookDay(v.at), ...(parts ? { p: parts } : {}), ...(v.two === true ? { two: true as const } : {}) };
}

function checkedTheirList(value: unknown): TheirList | null {
  const v = (value ?? {}) as Partial<Record<keyof TheirList, unknown>>;
  return isBase64Url(v.b, MAX_LIST) && isBase64Url(v.s, 128) && isCount(v.n) && v.n > 0 ? { b: v.b, s: v.s, n: v.n } : null;
}

/** A way as kept, checked: null when it is not one. */
export function checkedWay(value: unknown): Way | null {
  const v = (value ?? {}) as Partial<Record<keyof Way, unknown>>;
  // A linked device's way to their account has no bundle: their account started it.
  if (!isHex(v.id) || v.id.length !== 64 || !(v.bundle === '' || isBase64Url(v.bundle, MAX_BUNDLE))) return null;
  return {
    id: v.id,
    bundle: v.bundle as string,
    sender: isHex(v.sender) && v.sender.length === 48 ? v.sender : '',
    relay: isRelay(v.relay) ? v.relay : '',
    relayKey: isRelayKey(v.relayKey) ? v.relayKey : '',
    spare: checkedSpare(v.spare),
    conversations: Array.isArray(v.conversations) ? v.conversations.filter((c): c is string => isBase64(c) && c !== '').slice(0, 3) : [],
    first: isBase64(v.first) ? v.first : '',
    seen: Array.isArray(v.seen) ? v.seen.filter(isHex).slice(-MAX_SEEN_EACH) : [],
    sealTo: isRelayKey(v.sealTo) ? v.sealTo : '',
    sealsIn: v.sealsIn === true,
    ...(isTime(v.again) && v.again > 0 ? { again: v.again } : {}),
  };
}

function checkedRoute(value: unknown): Route | null {
  const v = (value ?? {}) as Partial<Record<keyof Route, unknown>>;
  return isHex(v.s) && v.s.length === 48 && isRelay(v.relay) ? { s: v.s, relay: v.relay, rk: isRelayKey(v.rk) ? v.rk : '', ...(isRelayKey(v.pk) ? { pk: v.pk } : {}) } : null;
}

function checkedUnverified(value: unknown): Unverified | null {
  const v = (value ?? {}) as Partial<Record<keyof Unverified, unknown>>;
  if (!isBase64(v.packet) || !v.packet || !isHex(v.acct) || v.acct.length !== 64 || !isTime(v.at)) return null;
  return { packet: v.packet, acct: v.acct, peer: isHex(v.peer) && v.peer.length === 64 ? v.peer : '', at: v.at };
}

function checkedEarly(value: unknown): Early | null {
  const v = (value ?? {}) as Partial<Record<keyof Early, unknown>>;
  if (!isBase64(v.packet) || !v.packet || !isHex(v.identity) || v.identity.length !== 64 || !isTime(v.at)) return null;
  return { packet: v.packet, identity: v.identity, at: v.at };
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
  const r: Record<string, Route> = {};
  const q: Record<string, string> = {};
  if (v.r && typeof v.r === 'object') {
    for (const [id, route] of Object.entries(v.r).slice(0, MAX_REAL)) {
      const checked = isHex(id) && id.length === 64 ? checkedRoute(route) : null;
      if (checked) r[id] = checked;
    }
  }
  if (v.q && typeof v.q === 'object') {
    for (const [id, recipient] of Object.entries(v.q).slice(0, MAX_REAL)) if (isHex(id) && id.length === 64 && isHex(recipient) && recipient.length === 48) q[id] = recipient;
  }
  const qWas = Array.isArray(v.qWas) ? v.qWas.map(checkedOldFiller).filter((w): w is OldFiller => w !== null).slice(-MAX_OLD_FILLERS) : [];
  return {
    b: v.b,
    s: v.s,
    n: v.n as number,
    real,
    ...(Object.keys(r).length > 0 ? { r } : {}),
    ...(Object.keys(q).length > 0 ? { q } : {}),
    ...(isTime(v.rAt) && v.rAt > 0 ? { rAt: v.rAt } : {}),
    ...(isText(v.restore) && v.restore ? { restore: v.restore } : {}),
    ...(isCount(v.cut) && v.cut > 0 ? { cut: v.cut } : {}),
    ...(qWas.length > 0 ? { qWas } : {}),
  };
}

function checkedOldFiller(value: unknown): OldFiller | null {
  const v = (value ?? {}) as Partial<Record<keyof OldFiller, unknown>>;
  return isHex(v.q) && v.q.length === 48 && isText(v.relay) && v.relay.length <= 2048 && isTime(v.until) ? { q: v.q, relay: v.relay, until: v.until } : null;
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
    ...(isTime(v.putBack) && v.putBack > 0 ? { putBack: v.putBack } : {}),
    ...(Array.isArray(v.unverified) ? { unverified: v.unverified.map(checkedUnverified).filter((u): u is Unverified => u !== null).slice(-MAX_UNVERIFIED) } : {}),
    ...(Array.isArray(v.early) ? { early: v.early.map(checkedEarly).filter((e): e is Early => e !== null).slice(-MAX_EARLY) } : {}),
    ...(isTime(v.moveDue) && v.moveDue > 0 ? { moveDue: v.moveDue } : {}),
    ...(Array.isArray(v.blocked) ? { blocked: v.blocked.map(checkedBlocked).filter((b): b is Blocked => b !== null).slice(-MAX_BLOCKED) } : {}),
    ...(Array.isArray(v.undropped) ? { undropped: v.undropped.map(checkedUndropped).filter((u): u is Undropped => u !== null).slice(-MAX_UNDROPPED) } : {}),
  };
}

const store = sealedFile({ name: FILE, empty: EMPTY_E2E, checked, block: BLOCK });

export const loadE2EData = store.load;
export const saveE2EData = store.save;
