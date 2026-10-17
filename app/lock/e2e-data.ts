import { decryptText, encryptText, randomBytes } from '../lib/crypto';
import { readFile, writeFile } from '../lib/files';

import { SLOTS } from './slots';

// What each space, and each space's hidden chats, keeps for end-to-end encryption (lib/e2e.ts):
// its own account, whose public keys its contact link gives out, and a conversation with each
// contact. Too large for the keystore, so it is kept in one file in the app's folder, FILE,
// holding one sealed value per password slot for the spaces and one per slot for the hidden
// chats: at least SLOTS of each, the unused ones sealed with random keys, every value padded to
// whole blocks of BLOCK characters. A space's value is sealed with the space's key (keys.ts),
// its hidden chats' value with their key (hidden.ts). One file, rewritten whole, so neither the
// files there are nor when they last changed tell which spaces or hidden chats are in use.
//
// A space whose key changed (a new second password, or hidden chats set up again) finds its old
// value sealed with another key, so it starts with a new account and no contacts.

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

export type Holder = 'space' | 'hidden';

export const EMPTY_E2E: E2EData = { account: '', contacts: [], seen: [] };

export const FILE = 'erevos-e2e';
const BLOCK = 16 * 1024;

type Values = Record<Holder, string[]>;

function seal(key: Uint8Array, data: E2EData): string {
  const json = JSON.stringify(data);
  return encryptText(key, json.padEnd(Math.max(1, Math.ceil(json.length / BLOCK)) * BLOCK, ' '));
}

const fake = () => seal(randomBytes(32), EMPTY_E2E);

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

/** The sealed values in the file, at least `count` (and SLOTS) of each, the added ones unused. */
async function loadValues(count = SLOTS): Promise<Values> {
  let values: Values = { space: [], hidden: [] };
  const raw = await readFile(FILE);
  if (raw) {
    try {
      const data = JSON.parse(raw) as Partial<Values>;
      values = {
        space: Array.isArray(data.space) ? data.space.map((v) => (isText(v) ? v : fake())) : [],
        hidden: Array.isArray(data.hidden) ? data.hidden.map((v) => (isText(v) ? v : fake())) : [],
      };
    } catch {
      // A damaged file: every value in it is lost, and it starts again.
    }
  }
  for (const holder of ['space', 'hidden'] as const) {
    while (values[holder].length < Math.max(SLOTS, count)) values[holder].push(fake());
  }
  return values;
}

// Writes run one after another, each on what the one before it left, since the space's chat
// and its hidden chats can both be open and write the same file.
let writes: Promise<void> = Promise.resolve();

/** A space's data, or its hidden chats', or an empty one when there is none sealed with `key`. */
export async function loadE2EData(holder: Holder, space: number, key: Uint8Array): Promise<E2EData> {
  await writes.catch(() => undefined);
  const sealed = (await loadValues(space + 1))[holder][space];
  try {
    return checked(JSON.parse(decryptText(key, sealed)));
  } catch {
    return { ...EMPTY_E2E };
  }
}

/** Replaces a space's data, or its hidden chats'. The others' values are kept as they are. */
export function saveE2EData(holder: Holder, space: number, key: Uint8Array, data: E2EData): Promise<void> {
  const run = writes
    .catch(() => undefined)
    .then(async () => {
      const values = await loadValues(space + 1);
      values[holder][space] = seal(key, data);
      await writeFile(FILE, JSON.stringify(values));
    });
  writes = run;
  return run;
}
