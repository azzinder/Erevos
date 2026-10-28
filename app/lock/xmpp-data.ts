import type { XmppState } from '../lib/xmpp';

import { sealedFile, type Holder } from './sealed-file';

// A space's XMPP account (lib/xmpp.ts, docs/xmpp.md): its sign-in, this device's OMEMO keys and
// sessions, its contacts and its chats with their latest messages, as one value kept in FILE,
// sealed with the space's key, one for each space (sealed-file.ts), so nothing tells whether a
// space has one; a hidden place's own account likewise, sealed with its key in its own value
// (lib/place-networks.ts). Not in backups yet: a restored phone signs in again.

export const FILE = 'erevos-xmpp';
const BLOCK = 16 * 1024;

type XmppData = { account: XmppState | null };

const object = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

/** Whether a kept account has its shape: a damaged one is left out, and the space signs in again. */
export function isXmppState(value: unknown): value is XmppState {
  if (!object(value)) return false;
  const v = value as Partial<Record<keyof XmppState, unknown>>;
  const omemo = v.omemo as Record<string, unknown> | undefined;
  return (
    typeof v.jid === 'string' &&
    v.jid.includes('@') &&
    typeof v.password === 'string' &&
    typeof v.resource === 'string' &&
    object(omemo) &&
    typeof omemo.device === 'number' &&
    object(omemo.identity) &&
    object(omemo.signedPreKey) &&
    Array.isArray(omemo.preKeys) &&
    object(v.people) &&
    object(v.chats) &&
    object(v.roster) &&
    Array.isArray(v.requests) &&
    Array.isArray(v.seen) &&
    (v.archived === undefined || typeof v.archived === 'string')
  );
}

function checked(value: unknown): XmppData {
  const account = object(value) ? value.account : null;
  return { account: isXmppState(account) ? account : null };
}

const store = sealedFile({ name: FILE, empty: { account: null } as XmppData, checked, block: BLOCK });

/** The space's XMPP account, or a hidden place's own (`holder`), or null when it has none. */
export async function loadXmpp(space: number, key: Uint8Array, holder: Holder = 'space'): Promise<XmppState | null> {
  return (await store.load(holder, space, key)).account;
}

/** Keeps the space's XMPP account, or a hidden place's, or forgets it with null. */
export async function saveXmpp(space: number, key: Uint8Array, account: XmppState | null, holder: Holder = 'space'): Promise<void> {
  await store.save(holder, space, key, { account });
}
