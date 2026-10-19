import { fromBase64, randomBytes, toBase64 } from '../lib/crypto';
import { secureDelete, secureGet, secureSet } from '../lib/secure';

import { isPasswordLocked, loadLockConfig, ownSpaceKey, type Unlocked } from './config';
import { opensSpace } from './space-data';

// Unlocking with a fingerprint or face, on Android 11 and later (modules/erevos-biometric). Off
// unless turned on in Lock, and turning it on asks for the password of the space it is turned on
// in. The first space's key is then sealed by a key in the Android Keystore that only a strong
// fingerprint or face check opens, for each single use, and that Android drops when fingerprints
// or faces change. What it seals is kept here, in one keystore entry. The password always works
// too, and its wrong tries are counted as before (tries.ts): a fingerprint changes nothing there.
//
// Only the space of the first password ever opens this way. Turned on in any other space (one a
// second password opens), it seals a random key that opens nothing, in the same entry and the
// same shape, so what is stored does not show which space it was turned on in. It never touches
// hidden chats, whose PINs are kept apart (hidden.ts). The setting shows the same in every space:
// on while there is a sealed key and Android still has its own. When what a fingerprint opens is
// not the first space's key, or Android has dropped its key, it turns itself off, the same way in
// both cases, and the password opens Erevos.

export type KeyState = 'none' | 'valid' | 'invalidated';

/** What the Keystore key sealed: its IV and the sealed data, base64. */
export interface Sealed {
  iv: string;
  data: string;
}

/** Android's prompt: its title and the button that closes it. */
export interface BiometricPrompt {
  title: string;
  cancel: string;
}

/** The phone's side (modules/erevos-biometric), or a stand-in for checks. */
export interface BiometricSealer {
  /** Android 11 or later, with a strong fingerprint or face set up. */
  available(): boolean;
  /** Whether the Keystore key is there, and still works. */
  keyState(): KeyState;
  /** Makes a new Keystore key, asks for a fingerprint or face and seals `data` (base64). */
  seal(data: string, prompt: BiometricPrompt): Promise<Sealed>;
  /** Asks for a fingerprint or face and opens what `seal` gave, as base64. */
  open(sealed: Sealed, prompt: BiometricPrompt): Promise<string>;
  /** Removes the Keystore key. */
  forget(): void;
}

// Why a fingerprint did not open anything: the prompt was closed, the key is gone or opens
// nothing, or Android said no (too many tries, say), in its own words.
export class BiometricError extends Error {
  reason: 'cancelled' | 'invalidated' | 'failed';

  constructor(reason: 'cancelled' | 'invalidated' | 'failed', message?: string) {
    super(message ?? reason);
    this.reason = reason;
  }
}

const ENTRY = 'erevos.biometric';

function parse(raw: string | null): Sealed | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Partial<Sealed> | null;
    return v && typeof v.iv === 'string' && typeof v.data === 'string' ? { iv: v.iv, data: v.data } : null;
  } catch {
    return null;
  }
}

/** Whether a fingerprint or face can open Erevos: shown the same in every space. */
export async function biometricOn(sealer: BiometricSealer): Promise<boolean> {
  if (!sealer.available() || !parse(await secureGet(ENTRY))) return false;
  if (sealer.keyState() === 'valid' && isPasswordLocked(await loadLockConfig())) return true;
  // Android dropped the key, or the lock is off: it is off too.
  await turnOffBiometric(sealer);
  return false;
}

// Turns it on in `space`, once `password` is shown to be that space's own: the first space's key
// is sealed, any other space's a random key that opens nothing. Anything turned on before is
// replaced, and stays off if the prompt is closed. False when the password is not this space's.
export async function turnOnBiometric(
  sealer: BiometricSealer,
  space: number,
  password: string,
  prompt: BiometricPrompt,
  now = Date.now(),
): Promise<boolean> {
  const key = await ownSpaceKey(space, password, now);
  if (!key) return false;
  await secureDelete(ENTRY);
  const sealed = await sealer.seal(toBase64(space === 0 ? key : randomBytes(32)), prompt);
  await secureSet(ENTRY, JSON.stringify(sealed));
  return true;
}

// The first space and its key, opened with a fingerprint or face. Null when that no longer works:
// it is then off. Throws BiometricError when the prompt was closed or Android said no.
export async function unlockWithBiometric(sealer: BiometricSealer, prompt: BiometricPrompt): Promise<Unlocked | null> {
  const sealed = parse(await secureGet(ENTRY));
  if (!sealed) return null;
  let key: Uint8Array | null = null;
  try {
    key = fromBase64(await sealer.open(sealed, prompt));
  } catch (e) {
    if (!(e instanceof BiometricError) || e.reason !== 'invalidated') throw e;
  }
  if (key && key.length === 32 && (await opensSpace(0, key))) return { space: 0, key };
  await turnOffBiometric(sealer);
  return null;
}

/** Turns it off: the sealed key and the Keystore key are removed. */
export async function turnOffBiometric(sealer: BiometricSealer): Promise<void> {
  await secureDelete(ENTRY);
  sealer.forget();
}
