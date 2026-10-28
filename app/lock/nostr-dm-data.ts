import { isNostrDmState, type NostrDmState } from '../lib/nostr-dm';

import { sealedFile, type Holder } from './sealed-file';

// A space's Nostr key for chats with other Nostr apps (lib/nostr-dm.ts, docs/nostr-chats.md), its
// inbox relays and its chats with their latest messages, as one value kept in FILE, sealed with
// the space's key, one for each space (sealed-file.ts), so nothing tells whether a space has one;
// a hidden place's own key likewise, sealed with its key in its own value (lib/place-networks.ts).
// Not in backups yet.

export const FILE = 'erevos-nostr-dm';
const BLOCK = 16 * 1024;

type NostrDmData = { account: NostrDmState | null };

const object = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

function checked(value: unknown): NostrDmData {
  const account = object(value) ? value.account : null;
  return { account: isNostrDmState(account) ? account : null };
}

const store = sealedFile({ name: FILE, empty: { account: null } as NostrDmData, checked, block: BLOCK });

/** The space's Nostr chats account, or a hidden place's own (`holder`), or null when it has none. */
export async function loadNostrDm(space: number, key: Uint8Array, holder: Holder = 'space'): Promise<NostrDmState | null> {
  return (await store.load(holder, space, key)).account;
}

/** Keeps the space's Nostr chats account, or a hidden place's, or forgets it with null. */
export async function saveNostrDm(space: number, key: Uint8Array, account: NostrDmState | null, holder: Holder = 'space'): Promise<void> {
  await store.save(holder, space, key, { account });
}
