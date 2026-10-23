// Encryption helpers for what the app keeps on the phone: AES-256-GCM with keys derived from a
// password by PBKDF2-SHA256, the same as in LPHL FASOULI, and then Argon2id. Pure JavaScript (the
// audited @noble libraries), so it runs the same on Android, iOS, web and under plain Node for
// checks. The app plugs in native randomness, a native PBKDF2 and a native AES-GCM at startup
// (crypto-setup), and the Erevos core's Argon2id once the core is in (lib/core.ts).
import { gcm } from '@noble/ciphers/aes.js';
import { argon2idAsync } from '@noble/hashes/argon2.js';
import { pbkdf2Async } from '@noble/hashes/pbkdf2.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { t } from './i18n';

export type RandomBytes = (length: number) => Uint8Array;

// Web Crypto where there is one (browsers, Node). React Native has none, so a phone build that
// lacks expo-crypto refuses to make keys rather than make weak ones.
let random: RandomBytes = (length) => {
  if (!globalThis.crypto?.getRandomValues) {
    throw new Error(t('This build has no secure random source. Rebuild the app so it includes expo-crypto.'));
  }
  return globalThis.crypto.getRandomValues(new Uint8Array(length));
};

export function setRandomSource(fn: RandomBytes): void {
  random = fn;
}

// The most a random source gives at a time: expo-crypto refuses more than 1024 bytes, Web Crypto
// more than 65536.
const RANDOM_CHUNK = 1024;

export function randomBytes(length: number): Uint8Array {
  if (length <= RANDOM_CHUNK) return random(length);
  const out = new Uint8Array(length);
  for (let at = 0; at < length; at += RANDOM_CHUNK) out.set(random(Math.min(RANDOM_CHUNK, length - at)), at);
  return out;
}

// The phone's own UTF-8, where it has one (browsers; Hermes for encoding), much faster than these
// loops on large values; never for a text with half an emoji, which it would write otherwise.
const encoder = typeof TextEncoder === 'function' ? new TextEncoder() : null;
const decoder = (() => {
  try {
    return typeof TextDecoder === 'function' ? new TextDecoder('utf-8', { fatal: true }) : null;
  } catch {
    return null;
  }
})();
const LONE_SURROGATE = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:^|[^\uD800-\uDBFF])[\uDC00-\uDFFF]/;

export function utf8Encode(text: string): Uint8Array {
  if (encoder && text.length > 32 && !LONE_SURROGATE.test(text)) return encoder.encode(text);
  const bytes: number[] = [];
  for (const ch of text) {
    const c = ch.codePointAt(0)!;
    if (c < 0x80) bytes.push(c);
    else if (c < 0x800) bytes.push(0xc0 | (c >> 6), 0x80 | (c & 63));
    else if (c < 0x10000) bytes.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    else bytes.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
  }
  return Uint8Array.from(bytes);
}

export function utf8Decode(bytes: Uint8Array): string {
  if (decoder && bytes.length > 32) {
    try {
      // As the loop below reads it: no byte order mark is taken away.
      return bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf ? '\ufeff' + decoder.decode(bytes.subarray(3)) : decoder.decode(bytes);
    } catch {
      // Not UTF-8 throughout: read as the loop reads it.
    }
  }
  let out = '';
  const chunk: number[] = [];
  const flush = () => {
    out += String.fromCodePoint(...chunk);
    chunk.length = 0;
  };
  for (let i = 0; i < bytes.length; ) {
    const b = bytes[i];
    let c: number;
    if (b < 0x80) {
      c = b;
      i += 1;
    } else if (b < 0xe0) {
      c = ((b & 31) << 6) | (bytes[i + 1] & 63);
      i += 2;
    } else if (b < 0xf0) {
      c = ((b & 15) << 12) | ((bytes[i + 1] & 63) << 6) | (bytes[i + 2] & 63);
      i += 3;
    } else {
      c = ((b & 7) << 18) | ((bytes[i + 1] & 63) << 12) | ((bytes[i + 2] & 63) << 6) | (bytes[i + 3] & 63);
      i += 4;
    }
    chunk.push(c);
    if (chunk.length >= 4096) flush();
  }
  flush();
  return out;
}

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const B64_INDEX = new Map([...B64].map((c, i) => [c, i]));

// Base64 in JavaScript is fine in browsers and checks, but sealed values, pages and photos made it
// much of a phone's time, so the app plugs in a native one at startup (setBase64).
type Base64 = { encode: (bytes: Uint8Array) => string; decode: (text: string) => Uint8Array };
let nativeBase64: Base64 | null = null;

/** Takes a native base64, kept only if it writes and reads exactly as the JavaScript one does. Says whether it was kept. */
export function setBase64(next: Base64): boolean {
  try {
    for (const length of [0, 1, 2, 3, 64, 65, 66, 1000]) {
      const bytes = randomBytes(length);
      const text = jsToBase64(bytes);
      if (next.encode(bytes) !== text || !sameBytes(next.decode(text), bytes)) return false;
    }
  } catch {
    return false;
  }
  nativeBase64 = next;
  return true;
}

export function toBase64(bytes: Uint8Array): string {
  return nativeBase64 && bytes.length >= 48 ? nativeBase64.encode(bytes) : jsToBase64(bytes);
}

function jsToBase64(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i];
    const b = bytes[i + 1] ?? 0;
    const c = bytes[i + 2] ?? 0;
    const n = (a << 16) | (b << 8) | c;
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63];
    out += i + 1 < bytes.length ? B64[(n >> 6) & 63] : '=';
    out += i + 2 < bytes.length ? B64[n & 63] : '=';
  }
  return out;
}

export function fromBase64(text: string): Uint8Array {
  const clean = text.replace(/[^A-Za-z0-9+/]/g, '');
  // Whole groups of four, padded as the native one wants; a lone last letter is no byte, as below.
  if (nativeBase64 && clean.length >= 64 && clean.length % 4 !== 1) return nativeBase64.decode(clean + '='.repeat((4 - (clean.length % 4)) % 4));
  const out = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let o = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const n =
      ((B64_INDEX.get(clean[i]) ?? 0) << 18) |
      ((B64_INDEX.get(clean[i + 1]) ?? 0) << 12) |
      ((B64_INDEX.get(clean[i + 2]) ?? 0) << 6) |
      (B64_INDEX.get(clean[i + 3]) ?? 0);
    if (o < out.length) out[o++] = (n >> 16) & 255;
    if (o < out.length) out[o++] = (n >> 8) & 255;
    if (o < out.length) out[o++] = n & 255;
  }
  return out;
}

export type Pbkdf2 = (password: Uint8Array, salt: Uint8Array, iterations: number, length: number) => Promise<Uint8Array>;

let pbkdf2: Pbkdf2 = (password, salt, iterations, length) =>
  pbkdf2Async(sha256, password, salt, { c: iterations, dkLen: length, asyncTick: 20 });

// PBKDF2 in JavaScript is fine in browsers and checks but far too slow on phones, so the app
// plugs in a native one at startup.
export function setPbkdf2(fn: Pbkdf2): void {
  pbkdf2 = fn;
}

// PBKDF2 through Web Crypto: native in browsers, and it runs several derivations at once. Null
// where Web Crypto is missing.
export function webCryptoPbkdf2(): Pbkdf2 | null {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) return null;
  const fallback = pbkdf2;
  return async (password, salt, iterations, length) => {
    try {
      const key = await subtle.importKey('raw', new Uint8Array(password), 'PBKDF2', false, ['deriveBits']);
      const bits = await subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: new Uint8Array(salt), iterations }, key, length * 8);
      return new Uint8Array(bits);
    } catch {
      // Web Crypto without PBKDF2 in it: the same result, in JavaScript.
      return fallback(password, salt, iterations, length);
    }
  };
}

/** PBKDF2-HMAC-SHA256, 32-byte key. */
export async function deriveKey(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  return pbkdf2(utf8Encode(password), salt, iterations, 32);
}

/** What Argon2id costs: memory in KiB, and passes. One lane, 32 bytes out. */
export type HardCost = { m: number; t: number };

/** The cost of the keys made from passwords and PINs from now on: in the core, about a tenth of
 *  a second each on a computer. */
export const HARD: HardCost = { m: 32 * 1024, t: 3 };

let cost = HARD;

/** The cost new keys get: HARD, unless checks asked for less, to run quicker (setHardCost). */
export const hardCost = (): HardCost => cost;

export function setHardCost(next: HardCost | null): void {
  cost = next ?? HARD;
}

/** Whether a cost read from storage or a file is one Erevos takes (as the core does): never so
 *  much that it runs the phone out of memory or time. */
export function isHardCost(cost: Partial<HardCost>): cost is HardCost {
  const { m, t } = cost;
  return Number.isInteger(m) && Number.isInteger(t) && m! >= 8 && m! <= 256 * 1024 && t! >= 1 && t! <= 16;
}

export type HardKey = (input: Uint8Array, salt: Uint8Array, cost: HardCost) => Promise<Uint8Array>;

const jsHardKey: HardKey = (input, salt, { m, t }) => argon2idAsync(input, salt, { m, t, p: 1, dkLen: 32, asyncTick: 20 });
let hard = jsHardKey;

// Argon2id in JavaScript is slow in browsers and far too slow on phones, so the core's takes its
// place once the core is plugged in; null puts the JavaScript one back.
export function setHardKey(fn: HardKey | null): void {
  hard = fn ?? jsHardKey;
}

/** Argon2id of `input` with `salt`, 32 bytes: what makes each guess at a password cost memory as
 *  well as time. */
export async function hardKey(input: Uint8Array, salt: Uint8Array, cost: HardCost): Promise<Uint8Array> {
  if (!isHardCost(cost)) throw new Error('that cost is more than Erevos takes');
  return hard(input, salt, cost);
}

/** AES-256-GCM: `seal` gives what was sealed with the 16-byte tag after it, `open` throws when the tag is wrong. */
export type Gcm = {
  seal(key: Uint8Array, nonce: Uint8Array, data: Uint8Array): Uint8Array;
  open(key: Uint8Array, nonce: Uint8Array, sealed: Uint8Array): Uint8Array;
};

const nobleGcm: Gcm = {
  seal: (key, nonce, data) => gcm(key, nonce).encrypt(data),
  open: (key, nonce, sealed) => gcm(key, nonce).decrypt(sealed),
};

let aesGcm: Gcm = nobleGcm;

// AES-GCM in JavaScript takes seconds for each megabyte of a file on a phone, so the app plugs in
// a native one at startup. It is kept only if it seals exactly as the JavaScript one does, opens
// what that sealed, and refuses what was changed. Says whether it was kept. Past 64 KB, where a
// native cipher works in parts, it is held to a known answer (BIG) instead: the JavaScript one
// took an older phone a good part of a second at each start to seal that much.
export function setGcm(next: Gcm): boolean {
  try {
    for (const length of [0, 1, 15, 16, 17, 1000, BIG.length]) {
      const big = length === BIG.length;
      const key = big ? BIG.key : randomBytes(32);
      const nonce = big ? BIG.nonce : randomBytes(12);
      const data = big ? BIG.data() : randomBytes(length);
      const sealed = big ? next.seal(key, nonce, data) : nobleGcm.seal(key, nonce, data);
      if (big ? toHex(sealed.subarray(length - 16)) !== BIG.end : !sameBytes(next.seal(key, nonce, data), sealed)) return false;
      if (!sameBytes(next.open(key, nonce, sealed), data)) return false;
      const changed = sealed.slice();
      changed[length >> 1] ^= 1;
      let refused = false;
      try {
        next.open(key, nonce, changed);
      } catch {
        refused = true;
      }
      if (!refused) return false;
    }
  } catch {
    return false;
  }
  aesGcm = next;
  return true;
}

// 70000 bytes sealed with a set key and nonce: the last block, and the tag, as AES-256-GCM makes them.
const BIG = {
  length: 70000,
  key: Uint8Array.from({ length: 32 }, (_, i) => i),
  nonce: Uint8Array.from({ length: 12 }, (_, i) => (i * 7) & 255),
  data: () => Uint8Array.from({ length: 70000 }, (_, i) => (i * 31 + 7) & 255),
  end: 'ad3280153bec2294be9834aed0c8202ba2054b7f993ab0966c9bc815bdc8fc61',
};

type CipherLike = { update(data: Uint8Array): Uint8Array; final(): Uint8Array };

/** What Node's crypto and react-native-quick-crypto give for AES-256-GCM. */
export type NodeStyleCiphers = {
  createCipheriv(algorithm: 'aes-256-gcm', key: Uint8Array, iv: Uint8Array): CipherLike & { getAuthTag(): Uint8Array };
  createDecipheriv(algorithm: 'aes-256-gcm', key: Uint8Array, iv: Uint8Array): CipherLike & { setAuthTag(tag: Uint8Array): unknown };
};

const TAG = 16;

// Plain bytes, one part after another: what the ciphers give may be Buffers, whose slice() does not copy.
function joinBytes(...parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let at = 0;
  for (const part of parts) {
    out.set(part, at);
    at += part.length;
  }
  return out;
}

/** AES-256-GCM through Node-style ciphers (createCipheriv, createDecipheriv). */
export function nodeStyleGcm({ createCipheriv, createDecipheriv }: NodeStyleCiphers): Gcm {
  return {
    seal(key, nonce, data) {
      const cipher = createCipheriv('aes-256-gcm', key, nonce);
      const sealed = cipher.update(data);
      const last = cipher.final();
      return joinBytes(sealed, last, cipher.getAuthTag());
    },
    open(key, nonce, sealed) {
      if (sealed.length < TAG) throw new DecryptError();
      const decipher = createDecipheriv('aes-256-gcm', key, nonce);
      decipher.setAuthTag(sealed.subarray(sealed.length - TAG));
      const plain = decipher.update(sealed.subarray(0, sealed.length - TAG));
      return joinBytes(plain, decipher.final());
    },
  };
}

const PREFIX = 'EVENC1:';

export function isEncrypted(text: string): boolean {
  return text.startsWith(PREFIX);
}

/** AES-256-GCM with a random 96-bit nonce; the output is text-safe. */
export function encryptText(key: Uint8Array, text: string): string {
  const nonce = randomBytes(12);
  const sealed = aesGcm.seal(key, nonce, utf8Encode(text));
  const joined = new Uint8Array(nonce.length + sealed.length);
  joined.set(nonce);
  joined.set(sealed, nonce.length);
  return PREFIX + toBase64(joined);
}

/** AES-256-GCM with a random 96-bit nonce, for bytes: the nonce, then what was sealed. */
export function encryptBytes(key: Uint8Array, data: Uint8Array): Uint8Array {
  const nonce = randomBytes(12);
  const sealed = aesGcm.seal(key, nonce, data);
  const joined = new Uint8Array(nonce.length + sealed.length);
  joined.set(nonce);
  joined.set(sealed, nonce.length);
  return joined;
}

export class DecryptError extends Error {
  constructor() {
    super('decrypt');
  }
}

/** Throws DecryptError when the key is wrong or the data was changed. */
export function decryptText(key: Uint8Array, blob: string): string {
  if (!isEncrypted(blob)) throw new DecryptError();
  const joined = fromBase64(blob.slice(PREFIX.length));
  try {
    return utf8Decode(aesGcm.open(key, joined.slice(0, 12), joined.subarray(12)));
  } catch {
    throw new DecryptError();
  }
}

/** Throws DecryptError when the key is wrong or the data was changed. */
export function decryptBytes(key: Uint8Array, joined: Uint8Array): Uint8Array {
  try {
    return aesGcm.open(key, joined.slice(0, 12), joined.subarray(12));
  } catch {
    throw new DecryptError();
  }
}

export function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function fromHex(text: string): Uint8Array {
  const out = new Uint8Array(text.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(text.slice(2 * i, 2 * i + 2), 16);
  return out;
}

export function sha256Bytes(data: Uint8Array): Uint8Array {
  return sha256(data);
}

/** Constant-time comparison. */
export function sameBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}
