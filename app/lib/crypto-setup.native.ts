import { nativeCore } from '../modules/erevos-core';

import { setCore } from './core';
import { nodeStyleGcm, setGcm, setPbkdf2, setRandomSource } from './crypto';

// Native randomness (expo-crypto), and PBKDF2 and AES-GCM (OpenSSL, through
// react-native-quick-crypto) on Android and iOS, as in LPHL FASOULI. They are loaded here rather
// than imported, so a build made before they were added still starts: it then checks passwords
// and seals files in JavaScript, which is slow, and cannot make keys until it is rebuilt. The
// Erevos core (lib/core.ts) is plugged in here too.
export function setupCrypto(): void {
  setCore(nativeCore);
  try {
    const { getRandomBytes } = require('expo-crypto') as typeof import('expo-crypto');
    setRandomSource(getRandomBytes);
  } catch {
    // crypto.ts refuses to make keys without a secure random source.
  }
  let quick: typeof import('react-native-quick-crypto');
  try {
    quick = require('react-native-quick-crypto') as typeof import('react-native-quick-crypto');
  } catch {
    return;
  }
  const { pbkdf2 } = quick;
  // Kept only if it seals exactly as the JavaScript one does (setGcm checks).
  setGcm(nodeStyleGcm(quick));
  setPbkdf2(
    (password, salt, iterations, length) =>
      new Promise((resolve, reject) => {
        pbkdf2(password, salt, iterations, length, 'sha256', (err, key) => {
          if (err || !key) reject(err ?? new Error('pbkdf2'));
          else resolve(new Uint8Array(key));
        });
      }),
  );
}

/** The core is in the app itself, ready at once. */
export function cryptoReady(): Promise<void> {
  return Promise.resolve();
}
