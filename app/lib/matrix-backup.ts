// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { cbc, ctr } from '@noble/ciphers/aes.js';
import { hkdf } from '@noble/hashes/hkdf.js';
import { hmac } from '@noble/hashes/hmac.js';
import { sha256 } from '@noble/hashes/sha2.js';

import { fromBase64, randomBytes, toBase64, utf8Decode, utf8Encode } from './crypto';
import { t } from './i18n';
import { call, core, enc, MatrixError, retryLocked, signWith, type Json, type MatrixState } from './matrix';

// Key backup and secret storage for a Matrix account (docs/matrix.md), as Element keeps them:
//
//  - Secret storage (m.secret_storage.v1.aes-hmac-sha2): the account's secrets, kept encrypted
//    in its account data on the homeserver under a key only the person has, the Security Key
//    (or a phrase that makes it). With it, this device takes the account's cross-signing keys,
//    signs itself, so the person's other apps trust it, and takes the backup's key.
//  - Key backup (m.megolm_backup.v1.curve25519-aes-sha2): every room key, encrypted to the
//    backup's public key and kept on the homeserver, so a device that signs in later reads what
//    came before it. This device takes from it the keys of the messages it shows locked, and
//    puts in it the keys it makes or gets.
//
// The Security Key is asked for once and never kept: what it opens is, sealed with the space.
// An account with no secret storage yet gets one here (setUpRecovery), with a new Security Key
// for the person to write down.

const SSSS = 'm.secret_storage.v1.aes-hmac-sha2';
const BACKUP = 'm.megolm_backup.v1.curve25519-aes-sha2';
const SECRETS = { master: 'm.cross_signing.master', selfSigning: 'm.cross_signing.self_signing', userSigning: 'm.cross_signing.user_signing', backup: 'm.megolm_backup.v1' };

/** The key backup this device reads from and writes to, as kept with the account. */
export type MatrixBackup = { version: string; secret: string; public: string; backedUp: Record<string, 1> };

const unpadded = (bytes: Uint8Array) => toBase64(bytes).replace(/=+$/, '');
const anyBase64 = (text: string) => fromBase64(text.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (text.length % 4)) % 4));
const same = (a: Uint8Array, b: Uint8Array) => a.length === b.length && a.every((x, i) => x === b[i]);

export class WrongRecoveryError extends Error {
  constructor() {
    super(t('That Security Key or phrase is not right.'));
  }
}

// --- The Security Key: 32 bytes, written in base58 with a 2-byte prefix and a parity byte. ---

const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

function base58(bytes: Uint8Array): string {
  let n = bytes.reduce((all, b) => (all << 8n) | BigInt(b), 0n);
  let out = '';
  while (n > 0n) {
    out = ALPHABET[Number(n % 58n)] + out;
    n /= 58n;
  }
  for (const b of bytes) {
    if (b !== 0) break;
    out = '1' + out;
  }
  return out;
}

function fromBase58(text: string): Uint8Array | null {
  let n = 0n;
  for (const c of text) {
    const i = ALPHABET.indexOf(c);
    if (i < 0) return null;
    n = n * 58n + BigInt(i);
  }
  const bytes: number[] = [];
  while (n > 0n) {
    bytes.unshift(Number(n & 255n));
    n >>= 8n;
  }
  for (const c of text) {
    if (c !== '1') break;
    bytes.unshift(0);
  }
  return new Uint8Array(bytes);
}

/** The Security Key for 32 key bytes, in groups of four as Element shows it. */
export function recoveryKeyOf(key: Uint8Array): string {
  const bytes = new Uint8Array(35);
  bytes.set([0x8b, 0x01]);
  bytes.set(key, 2);
  bytes[34] = bytes.slice(0, 34).reduce((p, b) => p ^ b, 0);
  return base58(bytes).replace(/(.{4})(?!$)/g, '$1 ');
}

/** The 32 key bytes of a Security Key, or null if it is not one (or a letter is wrong). */
export function keyOfRecovery(text: string): Uint8Array | null {
  const bytes = fromBase58(text.replace(/\s+/g, ''));
  if (!bytes || bytes.length !== 35 || bytes[0] !== 0x8b || bytes[1] !== 0x01) return null;
  if (bytes.reduce((p, b) => p ^ b, 0) !== 0) return null;
  return bytes.slice(2, 34);
}

// --- Secret storage ---

type KeyInfo = { algorithm?: string; iv?: string; mac?: string; passphrase?: { algorithm?: string; salt?: string; iterations?: number } };
type Sealed = { iv: string; ciphertext: string; mac: string };

const storageKeys = (key: Uint8Array, name: string) => {
  const both = hkdf(sha256, key, new Uint8Array(32), utf8Encode(name), 64);
  return { aes: both.slice(0, 32), mac: both.slice(32) };
};

// A new IV has its 64th bit clear, as the spec asks, so the counter never wraps its lower half.
const newIv = () => {
  const iv = randomBytes(16);
  iv[8] &= 0x7f;
  return iv;
};

function sealSecret(key: Uint8Array, name: string, secret: string, iv = newIv()): Sealed {
  const { aes, mac } = storageKeys(key, name);
  const ciphertext = ctr(aes, iv).encrypt(utf8Encode(secret));
  return { iv: toBase64(iv), ciphertext: toBase64(ciphertext), mac: toBase64(hmac(sha256, mac, ciphertext)) };
}

function openSecret(key: Uint8Array, name: string, sealed: Sealed): string | null {
  const { aes, mac } = storageKeys(key, name);
  const ciphertext = anyBase64(sealed.ciphertext);
  if (!same(hmac(sha256, mac, ciphertext), anyBase64(sealed.mac))) return null;
  return utf8Decode(ctr(aes, anyBase64(sealed.iv)).decrypt(ciphertext));
}

/** Whether `key` is the one `info` describes: it seals 32 zero bytes, named '', to the same MAC. */
function keyMatches(key: Uint8Array, info: KeyInfo): boolean {
  if (!info.iv || !info.mac) return false;
  const check = sealSecret(key, '', '\0'.repeat(32), anyBase64(info.iv));
  return same(anyBase64(check.mac), anyBase64(info.mac));
}

async function accountData(state: MatrixState, type: string): Promise<Json | null> {
  try {
    return await call(state, 'GET', `/user/${enc(state.userId)}/account_data/${enc(type)}`);
  } catch (error) {
    if (error instanceof MatrixError && (error.status === 404 || error.code === 'M_NOT_FOUND')) return null;
    throw error;
  }
}

const putAccountData = (state: MatrixState, type: string, content: Json) => call(state, 'PUT', `/user/${enc(state.userId)}/account_data/${enc(type)}`, content);

/** What the account has: secret storage (and whether a phrase opens it), and a key backup. */
export async function recoveryInfo(state: MatrixState): Promise<{ storage: boolean; phrase: boolean }> {
  const id = (await accountData(state, 'm.secret_storage.default_key'))?.key;
  const info = typeof id === 'string' ? ((await accountData(state, `m.secret_storage.key.${id}`)) as KeyInfo | null) : null;
  return { storage: info?.algorithm === SSSS, phrase: info?.passphrase?.algorithm === 'm.pbkdf2' };
}

/** What a Security Key opened: the account's cross-signing keys, its backup, and how many messages opened with it. */
export type Unlocked = { crossSigning: boolean; backup: boolean; opened: number };

/**
 * Opens the account's secret storage with a Security Key, or the phrase that makes it: takes
 * the cross-signing keys that match the account's, signs this device with them, and takes the
 * key backup, opening the locked messages it holds keys for.
 */
export async function unlockRecovery(state: MatrixState, words: string): Promise<Unlocked> {
  const id = (await accountData(state, 'm.secret_storage.default_key'))?.key;
  const info = typeof id === 'string' ? ((await accountData(state, `m.secret_storage.key.${id}`)) as KeyInfo | null) : null;
  if (typeof id !== 'string' || info?.algorithm !== SSSS) throw new Error(t('This Matrix account has no Security Key yet.'));
  let key = keyOfRecovery(words);
  if (!key && info.passphrase?.algorithm === 'm.pbkdf2' && info.passphrase.salt && info.passphrase.iterations) {
    const made = await core<{ key: string }>('pbkdf2_sha512', { passphrase: words, salt: info.passphrase.salt, iterations: info.passphrase.iterations, length: 32 });
    key = fromBase64(made.key);
  }
  if (!key || !keyMatches(key, info)) throw new WrongRecoveryError();
  const secret = async (name: string) => {
    const sealed = ((await accountData(state, name))?.encrypted as Record<string, Sealed> | undefined)?.[id];
    return sealed ? openSecret(key, name, sealed) : null;
  };
  const crossSigning = await takeCrossSigning(state, await secret(SECRETS.master), await secret(SECRETS.selfSigning), await secret(SECRETS.userSigning));
  const backupSecret = await secret(SECRETS.backup);
  const backup = backupSecret ? await takeBackup(state, backupSecret) : false;
  const opened = backup ? await restoreLocked(state) : 0;
  return { crossSigning, backup, opened };
}

/**
 * Takes the cross-signing keys and the key backup's key the phone gave a device of its own
 * (lib/linked-accounts.ts), as a Security Key opens them: each only when it makes the keys the
 * homeserver has, and only what this device has not got yet. Then this device is signed, and the
 * locked messages the backup holds keys for open (`asked`, as restoreLocked keeps it).
 */
export async function takeGiven(state: MatrixState, keys: { master: string; selfSigning: string; userSigning: string } | undefined, backup: string | undefined, asked?: Set<string>): Promise<Unlocked> {
  const crossSigning = !!state.crossSigning || (!!keys && (await takeCrossSigning(state, keys.master, keys.selfSigning, keys.userSigning)));
  const backedUp = !!state.backup || (!!backup && (await takeBackup(state, backup)));
  const opened = backedUp ? await restoreLocked(state, asked) : 0;
  return { crossSigning, backup: backedUp, opened };
}

// The cross-signing secrets, taken only when they make the keys the homeserver has for the
// account; then this device is signed with the self-signing key.
async function takeCrossSigning(state: MatrixState, master: string | null, selfSigning: string | null, userSigning: string | null): Promise<boolean> {
  if (!master || !selfSigning || !userSigning) return false;
  // Element writes them in base64 with its padding; the core takes them without.
  [master, selfSigning, userSigning] = [master, selfSigning, userSigning].map((secret) => secret.replace(/=+$/, ''));
  const answer = await call(state, 'POST', '/keys/query', { device_keys: { [state.userId]: [] } });
  const publicOf = async (secret: string) => (await core<{ public: string }>('signing_key_public', { secret })).public;
  const onServer = (field: string) => Object.values(((answer[field] as Record<string, Json> | undefined)?.[state.userId]?.keys as Json | undefined) ?? {});
  if (!onServer('master_keys').includes(await publicOf(master))) return false;
  if (!onServer('self_signing_keys').includes(await publicOf(selfSigning))) return false;
  if (!onServer('user_signing_keys').includes(await publicOf(userSigning))) return false;
  state.crossSigning = { master, selfSigning, userSigning };
  const device = (answer.device_keys as Record<string, Record<string, Json>> | undefined)?.[state.userId]?.[state.deviceId];
  if (device) await call(state, 'POST', '/keys/signatures/upload', { [state.userId]: { [state.deviceId]: await signWith(state, device, selfSigning) } });
  return true;
}

// The backup, taken only when its secret makes the public key the homeserver's backup has.
async function takeBackup(state: MatrixState, secret: string): Promise<boolean> {
  let version: Json;
  try {
    version = await call(state, 'GET', '/room_keys/version');
  } catch {
    return false;
  }
  const publicKey = String((version.auth_data as Json | undefined)?.public_key ?? '');
  if (version.algorithm !== BACKUP || !publicKey) return false;
  const made = await core<{ public: string }>('x25519_public', { secret });
  if (made.public !== publicKey.replace(/=+$/, '')) return false;
  state.backup = { version: String(version.version), secret, public: made.public, backedUp: {} };
  return true;
}

// --- Key backup: each room key encrypted to the backup's key (libolm's PkEncryption). ---

async function backupKeys(shared: string) {
  const out = hkdf(sha256, fromBase64(shared), undefined, new Uint8Array(0), 80);
  return { aes: out.slice(0, 32), mac: out.slice(32, 64), iv: out.slice(64) };
}

async function sealForBackup(publicKey: string, plaintext: string): Promise<Json> {
  const ephemeral = await core<{ secret: string; public: string }>('x25519_new', {});
  const { shared } = await core<{ shared: string }>('x25519_shared', { secret: ephemeral.secret, their: publicKey });
  const keys = await backupKeys(shared);
  const ciphertext = cbc(keys.aes, keys.iv).encrypt(utf8Encode(plaintext));
  // As libolm does: the MAC is of nothing, its first 8 bytes.
  return { ephemeral: ephemeral.public, ciphertext: unpadded(ciphertext), mac: unpadded(hmac(sha256, keys.mac, new Uint8Array(0)).slice(0, 8)) };
}

async function openFromBackup(secret: string, data: Json): Promise<Json | null> {
  try {
    const { shared } = await core<{ shared: string }>('x25519_shared', { secret, their: String(data.ephemeral) });
    const keys = await backupKeys(shared);
    const ciphertext = anyBase64(String(data.ciphertext));
    const mac = anyBase64(String(data.mac));
    // libolm's MAC is of nothing; one of the ciphertext, as the spec now says, is taken too.
    if (!same(hmac(sha256, keys.mac, new Uint8Array(0)).slice(0, 8), mac) && !same(hmac(sha256, keys.mac, ciphertext).slice(0, 8), mac)) return null;
    return JSON.parse(utf8Decode(cbc(keys.aes, keys.iv).decrypt(ciphertext))) as Json;
  } catch {
    return null;
  }
}

/**
 * Takes from the backup the keys of the messages this device shows locked, and opens them.
 * Answers how many opened. Each key is asked for once while Erevos runs (`asked`).
 */
export async function restoreLocked(state: MatrixState, asked = new Set<string>()): Promise<number> {
  const backup = state.backup;
  if (!backup) return 0;
  const wanted = new Map<string, Set<string>>();
  for (const room of Object.values(state.rooms)) {
    for (const message of room.messages) {
      const id = message.locked?.sessionId;
      const key = `${room.id} ${id}`;
      if (!id || state.inbound[key] || asked.has(key)) continue;
      asked.add(key);
      if (!wanted.has(room.id)) wanted.set(room.id, new Set());
      wanted.get(room.id)!.add(id);
    }
  }
  let opened = 0;
  for (const [roomId, sessions] of wanted) {
    for (const sessionId of sessions) {
      let found: Json;
      try {
        found = await call(state, 'GET', `/room_keys/keys/${enc(roomId)}/${enc(sessionId)}?version=${enc(backup.version)}`);
      } catch {
        continue;
      }
      const key = await openFromBackup(backup.secret, (found.session_data as Json) ?? {});
      if (!key || key.algorithm !== 'm.megolm.v1.aes-sha2' || typeof key.session_key !== 'string') continue;
      let made: { session: Json; session_id: string };
      try {
        made = await core('megolm_inbound', { exported_key: key.session_key });
      } catch {
        continue;
      }
      if (made.session_id !== sessionId) continue;
      state.inbound[`${roomId} ${sessionId}`] = { session: made.session, senderKey: String(key.sender_key ?? '') };
      backup.backedUp[`${roomId} ${sessionId}`] = 1;
      const before = state.rooms[roomId]?.messages.filter((m) => m.locked).length ?? 0;
      await retryLocked(state, roomId, sessionId);
      opened += before - (state.rooms[roomId]?.messages.filter((m) => m.locked).length ?? 0);
    }
  }
  return opened;
}

/** Puts in the backup the room keys this device has that it does not hold yet. Answers how many. */
export async function backUpKeys(state: MatrixState): Promise<number> {
  const backup = state.backup;
  if (!backup) return 0;
  const rooms: Record<string, { sessions: Record<string, Json> }> = {};
  const done: string[] = [];
  for (const [key, inbound] of Object.entries(state.inbound)) {
    if (backup.backedUp[key]) continue;
    const [roomId, sessionId] = key.split(' ');
    const exported = await core<{ exported_key: string; first_index: number }>('megolm_export', { session: inbound.session });
    const plaintext = JSON.stringify({ algorithm: 'm.megolm.v1.aes-sha2', sender_key: inbound.senderKey, session_key: exported.exported_key, sender_claimed_keys: {}, forwarding_curve25519_key_chain: [] });
    (rooms[roomId] ??= { sessions: {} }).sessions[sessionId] = {
      first_message_index: exported.first_index,
      forwarded_count: 0,
      is_verified: false,
      session_data: await sealForBackup(backup.public, plaintext),
    };
    done.push(key);
    if (done.length >= 100) break;
  }
  if (!done.length) return 0;
  await call(state, 'PUT', `/room_keys/keys?version=${enc(backup.version)}`, { rooms });
  for (const key of done) backup.backedUp[key] = 1;
  return done.length;
}

/**
 * Sets up secret storage and a key backup for an account that has neither, with this device's
 * cross-signing keys (made when it signed in) kept in it. Answers the new Security Key, for the
 * person to write down: it is not kept anywhere.
 */
export async function setUpRecovery(state: MatrixState): Promise<string> {
  if ((await recoveryInfo(state)).storage) throw new Error(t('This Matrix account already has a Security Key: enter it instead.'));
  const key = randomBytes(32);
  const id = unpadded(randomBytes(24)).replace(/[+/]/g, 'x');
  const check = sealSecret(key, '', '\0'.repeat(32));
  await putAccountData(state, `m.secret_storage.key.${id}`, { algorithm: SSSS, iv: check.iv, mac: check.mac });
  const keep = (name: string, secret: string) => putAccountData(state, name, { encrypted: { [id]: sealSecret(key, name, secret) } });
  if (state.crossSigning) {
    await keep(SECRETS.master, state.crossSigning.master);
    await keep(SECRETS.selfSigning, state.crossSigning.selfSigning);
    await keep(SECRETS.userSigning, state.crossSigning.userSigning);
  }
  const made = await core<{ secret: string; public: string }>('x25519_new', {});
  let authData: Json = { public_key: made.public };
  authData = await signWith(state, authData);
  if (state.crossSigning) {
    const byMaster = await signWith(state, { public_key: made.public }, state.crossSigning.master);
    authData.signatures = { [state.userId]: { ...(authData.signatures as Record<string, Json>)[state.userId], ...(byMaster.signatures as Record<string, Json>)[state.userId] } };
  }
  const created = await call(state, 'POST', '/room_keys/version', { algorithm: BACKUP, auth_data: authData });
  await keep(SECRETS.backup, made.secret);
  await putAccountData(state, 'm.secret_storage.default_key', { key: id });
  state.backup = { version: String(created.version), secret: made.secret, public: made.public, backedUp: {} };
  await backUpKeys(state);
  return recoveryKeyOf(key);
}
