import { checkedLook, type Look } from '../theme/look';
import { sealedFile, type Holder } from './sealed-file';

// What each space, and each space's hidden chats, keeps for end-to-end encryption (lib/e2e.ts):
// its own account, whose public keys its contact link gives out, and a conversation with each
// contact. Kept sealed in FILE, one value for each space and each hidden chats (sealed-file.ts),
// in blocks of BLOCK bytes. A space whose key changed starts with a new account and no contacts.

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
};

export type E2EData = {
  /** The account's secret keys, base64. Empty until the chat first opens. */
  account: string;
  contacts: Contact[];
  /** The ids of the first packets opened here, hex, oldest first, so a replayed one is dropped. */
  seen: string[];
};

export const EMPTY_E2E: E2EData = { account: '', contacts: [], seen: [] };

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
/** A relay address as contact links give it. */
export const isRelay = (v: unknown): v is string => isText(v) && v.length <= 512 && /^wss?:\/\/[^\s/?#]+(\/[^\s]*)?$/i.test(v);
/** A relay's public key for sealed sends: 32 bytes, base64url without padding. */
export const isRelayKey = (v: unknown): v is string => isText(v) && /^[A-Za-z0-9_-]{43}$/.test(v);

function checkedContact(value: unknown): Contact | null {
  const v = (value ?? {}) as Partial<Record<keyof Contact, unknown>>;
  if (!isHex(v.identity) || v.identity.length !== 64) return null;
  const conversations = Array.isArray(v.conversations) ? v.conversations.filter(isBase64) : [];
  return {
    identity: v.identity,
    sender: isHex(v.sender) && v.sender.length === 48 ? v.sender : '',
    relay: isRelay(v.relay) ? v.relay : '',
    relayKey: isRelayKey(v.relayKey) ? v.relayKey : '',
    conversations,
    first: isBase64(v.first) ? v.first : '',
    name: isText(v.name) ? cleanName(v.name) : '',
    timer: isTimer(v.timer) ? v.timer : 0,
    timerAt: isTime(v.timerAt) ? v.timerAt : 0,
    request: v.request === true,
    look: v.look && typeof v.look === 'object' ? checkedLook(v.look) : null,
  };
}

/** What was stored, with anything of the wrong shape left out. */
function checked(value: unknown): E2EData {
  const v = (value ?? {}) as Partial<Record<keyof E2EData, unknown>>;
  const contacts = Array.isArray(v.contacts) ? v.contacts.map(checkedContact).filter((c): c is Contact => c !== null) : [];
  return {
    account: isBase64(v.account) ? v.account : '',
    contacts,
    seen: Array.isArray(v.seen) ? v.seen.filter(isHex) : [],
  };
}

const store = sealedFile({ name: FILE, empty: EMPTY_E2E, checked, block: BLOCK });

export const loadE2EData = store.load;
export const saveE2EData = store.save;
