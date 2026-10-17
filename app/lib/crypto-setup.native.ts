import { setPbkdf2, setRandomSource } from './crypto';

// Native randomness (expo-crypto) and PBKDF2 (OpenSSL, through react-native-quick-crypto) on
// Android and iOS, as in LPHL FASOULI. Both are loaded here rather than imported, so a build made
// before they were added still starts: it then checks passwords in JavaScript, which is slow, and
// cannot make keys until it is rebuilt.
export function setupCrypto(): void {
  try {
    const { getRandomBytes } = require('expo-crypto') as typeof import('expo-crypto');
    setRandomSource(getRandomBytes);
  } catch {
    // crypto.ts refuses to make keys without a secure random source.
  }
  let pbkdf2: typeof import('react-native-quick-crypto').pbkdf2;
  try {
    pbkdf2 = (require('react-native-quick-crypto') as typeof import('react-native-quick-crypto')).pbkdf2;
  } catch {
    return;
  }
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
