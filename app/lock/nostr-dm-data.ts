import { isNostrDmState, type NostrDmState } from '../lib/nostr-dm';

import { sealedFile } from './sealed-file';

// A space's Nostr key for chats with other Nostr apps (lib/nostr-dm.ts, docs/nostr-chats.md), its
// inbox relays and its chats with their latest messages, as one value kept in FILE, sealed with
// the space's key, one for each space (sealed-file.ts), so nothing tells whether a space has one.
// Only the space's own, never its hidden places'. Not in backups yet.

export const FILE = 'erevos-nostr-dm';
const BLOCK = 16 * 1024;

type NostrDmData = { account: NostrDmState | null };

const object = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

function checked(value: unknown): NostrDmData {
  const account = object(value) ? value.account : null;
  return { account: isNostrDmState(account) ? account : null };
}

const store = sealedFile({ name: FILE, empty: { account: null } as NostrDmData, checked, block: BLOCK });

/** The space's Nostr chats account, or null when it has none. */
export async function loadNostrDm(space: number, key: Uint8Array): Promise<NostrDmState | null> {
  return (await store.load('space', space, key)).account;
}

/** Keeps the space's Nostr chats account, or forgets it with null. */
export async function saveNostrDm(space: number, key: Uint8Array, account: NostrDmState | null): Promise<void> {
  await store.save('space', space, key, { account });
}
