import { fromHex, randomBytes, toHex } from '../lib/crypto';

import { clearSlot, getSlot, setSlot, type SlotStore } from './slots';

// Every space has its own random 256-bit key, which seals what that space keeps on the phone
// (space-data.ts). A space that opens without a password keeps its key in the OS keystore.
// Behind a password the key is kept only sealed by that password (config.ts), so the space's
// data cannot be read without it.
//
// The keystore holds one key per password slot (slots.ts), a random one where no space opens
// without a password. A random key and a real one look the same, so only the lock config says
// which slot opens directly.
//
// A space is the position of its password slot: 0 is the real one, 1 the space the second
// password opens, 2 the one a second password set inside that one opens, and so on.

export function newSpaceKey(): Uint8Array {
  return randomBytes(32);
}

const HEX_KEY = /^[0-9a-f]{64}$/;

const STORE: SlotStore<string> = {
  key: 'erevos.space-keys',
  fake: () => toHex(randomBytes(32)),
  valid: (v): v is string => typeof v === 'string' && HEX_KEY.test(v),
};

/** The key in a space's slot: its key when it opens without a password (the lock config says), else a random one. */
export async function loadOpenKey(space: number): Promise<Uint8Array> {
  return fromHex(await getSlot(STORE, space));
}

export async function saveOpenKey(space: number, key: Uint8Array): Promise<void> {
  await setSlot(STORE, space, toHex(key));
}

/** The key leaves the keystore (it is now only sealed in its password slot): a random one takes its place. */
export async function deleteOpenKey(space: number): Promise<void> {
  await clearSlot(STORE, space);
}

let current: { space: number; key: Uint8Array } | null = null;

/** The space that is open and its key, kept in memory while it is open. */
export function currentSpace(): { space: number; key: Uint8Array } {
  if (!current) throw new Error('No space is open');
  return current;
}

export function setCurrentSpace(space: number | null, key?: Uint8Array): void {
  current = space === null || !key ? null : { space, key };
}
