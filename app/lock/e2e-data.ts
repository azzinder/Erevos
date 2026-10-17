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
  /** Conversations with them, base64, newest first: the first is the one to send in. */
  conversations: string[];
  /** The first packet of a conversation started here, base64, until the relay has taken it. */
  first: string;
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

const isText = (v: unknown): v is string => typeof v === 'string';
const isBase64 = (v: unknown): v is string => isText(v) && /^[A-Za-z0-9+/]*={0,2}$/.test(v);
const isHex = (v: unknown): v is string => isText(v) && /^([0-9a-f]{2})*$/.test(v);

function checkedContact(value: unknown): Contact | null {
  const v = (value ?? {}) as Partial<Record<keyof Contact, unknown>>;
  if (!isHex(v.identity) || v.identity.length !== 64) return null;
  const conversations = Array.isArray(v.conversations) ? v.conversations.filter(isBase64) : [];
  return {
    identity: v.identity,
    sender: isHex(v.sender) && v.sender.length === 48 ? v.sender : '',
    conversations,
    first: isBase64(v.first) ? v.first : '',
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
