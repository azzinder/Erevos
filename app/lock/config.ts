import { decryptText, deriveKey, encryptText, fromBase64, fromHex, randomBytes, sameBytes, sha256Bytes, toBase64, toHex } from '../lib/crypto';
import { secureGet, secureSet } from '../lib/secure';

import { deleteOpenKey, saveOpenKey } from './keys';
import { SLOTS } from './slots';
import { assertNotLockedOut, recordRightPassword, recordWrongPassword } from './tries';

// Password lock, built the way LPHL FASOULI builds its own. Kept in the OS keystore, outside
// every space, because it decides which space opens and holds its key.
//
// Slot 0 holds the password of the real space. Any space can set a "second password". It goes in
// the next slot and opens its own separate space (slot 1 opens space 1, and so on). There are
// always at least SLOTS slots, the unused ones holding random values shaped like used ones, and
// unlocking checks every slot. So neither what is stored nor how long unlocking takes shows
// whether a second password is in use, and nothing in the app says so.
//
// A slot tells its password by `check` (SHA-256 of the key K that PBKDF2 derives from it) and
// holds its space's key sealed with K, so the space can only be opened with the password.
//
// Wrong passwords are counted on the phone and make the next check wait (tries.ts), wherever a
// password is compared with the slots.

export interface Slot {
  salt: string;
  iter: number;
  check: string;
  key: string;
}

export interface LockConfig {
  slots: Slot[];
  // A space that opens without asking. Turning the lock off in any space but the first sets
  // this: that space then opens directly (its key is in the keystore), while the ones before it
  // stay behind their passwords (see lockWithPassword).
  direct: number | null;
  // PBKDF2 iterations of every slot, so unlocking takes the same time whichever slot the
  // password opens.
  iter: number;
}

/** An unlocked space and its key. */
export interface Unlocked {
  space: number;
  key: Uint8Array;
}

export { SLOTS };
// Native PBKDF2 (OpenSSL) on phones: well under a second for every slot.
const ITER = 200_000;
const KEY = 'erevos.lock';
const EMPTY: LockConfig = { slots: [], direct: null, iter: ITER };

/** Seals a space key with a password. */
async function sealSlot(password: string, spaceKey: Uint8Array, iter: number): Promise<Slot> {
  const salt = randomBytes(16);
  const k = await deriveKey(password, salt, iter);
  return { salt: toBase64(salt), iter, check: toBase64(sha256Bytes(k)), key: encryptText(k, toHex(spaceKey)) };
}

/** A slot no password opens, shaped like a used one. */
function unusedSlot(iter: number): Slot {
  return {
    salt: toBase64(randomBytes(16)),
    iter,
    check: toBase64(randomBytes(32)),
    key: encryptText(randomBytes(32), toHex(randomBytes(32))),
  };
}

/** At least `min` slots (and SLOTS), the added ones unused. */
function padded(slots: Slot[], iter: number, min = SLOTS): Slot[] {
  const out = [...slots];
  while (out.length < Math.max(min, SLOTS)) out.push(unusedSlot(iter));
  return out;
}

const isSlot = (v: unknown): v is Slot => {
  const s = v as Partial<Slot> | null;
  return !!s && typeof s.salt === 'string' && typeof s.iter === 'number' && typeof s.check === 'string' && typeof s.key === 'string';
};

export async function loadLockConfig(): Promise<LockConfig> {
  const raw = await secureGet(KEY);
  if (!raw) return EMPTY;
  try {
    const data = JSON.parse(raw) as Partial<LockConfig>;
    if (!Array.isArray(data.slots) || !data.slots.every(isSlot)) return EMPTY;
    return {
      slots: data.slots,
      direct: typeof data.direct === 'number' ? data.direct : null,
      iter: typeof data.iter === 'number' ? data.iter : ITER,
    };
  } catch {
    return EMPTY;
  }
}

async function save(config: LockConfig): Promise<void> {
  await secureSet(KEY, JSON.stringify(config));
}

/** Whether the app asks for a password when it opens. */
export function isPasswordLocked(config: LockConfig): boolean {
  return config.slots.length > 0 && config.direct === null;
}

/** The slot a password opens (and its K), or -1. Every slot is checked, whichever matches. */
async function match(config: LockConfig, password: string): Promise<{ index: number; k: Uint8Array | null }> {
  const results = await Promise.all(
    config.slots.map(async (slot) => {
      const k = await deriveKey(password, fromBase64(slot.salt), slot.iter);
      return sameBytes(sha256Bytes(k), fromBase64(slot.check)) ? k : null;
    }),
  );
  const index = results.findIndex((k) => k !== null);
  return { index, k: index < 0 ? null : results[index] };
}

/** The space key a slot holds for K. */
function openSlot(config: LockConfig, index: number, k: Uint8Array): Uint8Array {
  return fromHex(decryptText(k, config.slots[index].key));
}

// match, counting: throws LockedOutError while wrong passwords have made it wait, counts a miss
// as one more and a hit as the end of the count. Every comparison with the slots goes through
// here, since each one would tell whether a password opens some space.
async function countedMatch(config: LockConfig, password: string, now: number): Promise<{ index: number; k: Uint8Array | null }> {
  await assertNotLockedOut(now);
  const result = await match(config, password);
  if (result.index < 0) await recordWrongPassword(now);
  else await recordRightPassword();
  return result;
}

/** Which space a password opens, with its key, or null if it opens none. Throws LockedOutError while it must wait. */
export async function unlock(config: LockConfig, password: string, now = Date.now()): Promise<Unlocked | null> {
  const { index, k } = await countedMatch(config, password, now);
  if (index < 0 || !k) return null;
  return { space: index, key: openSlot(config, index, k) };
}

export class SamePasswordError extends Error {
  constructor() {
    super('samePassword');
  }
}

// Sets (or changes) the password of a space, sealing `spaceKey` with it: its own password, or the
// second password of the space before it (then with a new key for the new space). It must differ
// from the other passwords.
export async function setLockPassword(space: number, password: string, spaceKey: Uint8Array, now = Date.now()): Promise<void> {
  const config = await loadLockConfig();
  // There is always a slot after this one, for its own second password.
  const slots = padded(config.slots, config.iter, space + 2);
  const { index } = await countedMatch({ ...config, slots }, password, now);
  if (index >= 0 && index !== space) throw new SamePasswordError();
  slots[space] = await sealSlot(password, spaceKey, config.iter);
  await save({ slots, direct: config.direct, iter: config.iter });
}

// Turns the password lock on from a space that opens without one (its key is `spaceKey`). A
// password that already opens another space opens that space instead: after the lock was turned
// off in a second space, this is how to get back to the space behind the first password. Any
// other password becomes this space's. Returns the space to open, or null to stay.
export async function lockWithPassword(space: number, password: string, spaceKey: Uint8Array, now = Date.now()): Promise<Unlocked | null> {
  const config = await loadLockConfig();
  if (config.slots.length > 0) {
    const { index, k } = await countedMatch(config, password, now);
    if (index >= 0 && index !== space && k) {
      const key = openSlot(config, index, k);
      await save({ ...config, direct: null });
      await deleteOpenKey(space);
      return { space: index, key };
    }
  }
  const slots = padded(config.slots, config.iter, space + 2);
  slots[space] = await sealSlot(password, spaceKey, config.iter);
  await save({ slots, direct: null, iter: config.iter });
  // From now on the key is only in the slot.
  await deleteOpenKey(space);
  return null;
}

/** Makes the second password set in this space (and any set beyond it) stop working. */
export async function removeSecondPassword(space: number): Promise<void> {
  const config = await loadLockConfig();
  await save({ ...config, slots: config.slots.map((slot, j) => (j > space ? unusedSlot(config.iter) : slot)) });
}

// Turns the password lock off. `spaceKey` is the open space's key, kept in the keystore from now
// on. In the first space that removes every password. In any other, that space opens directly
// from now on, its second password stops working, and the spaces before it stay locked.
export async function removePasswordLock(space: number, spaceKey: Uint8Array): Promise<void> {
  await saveOpenKey(space, spaceKey);
  if (space === 0) {
    await save(EMPTY);
    return;
  }
  const config = await loadLockConfig();
  await save({ slots: config.slots.map((slot, j) => (j > space ? unusedSlot(config.iter) : slot)), direct: space, iter: config.iter });
}
