import { setPbkdf2, webCryptoPbkdf2 } from './crypto';

// Browsers have Web Crypto randomness and a native PBKDF2, which keeps checking every password
// slot quick. Without it the JavaScript PBKDF2 is used.
export function setupCrypto(): void {
  const pbkdf2 = webCryptoPbkdf2();
  if (pbkdf2) setPbkdf2(pbkdf2);
}
