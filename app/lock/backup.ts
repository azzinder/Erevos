import { decryptBytes, deriveKey, encryptBytes, randomBytes, sameBytes, utf8Decode, utf8Encode } from '../lib/crypto';
import { deleteFile, listFiles, readBytes, readFile, writeBytes, writeFile } from '../lib/files';
import { secureDelete, secureGet, secureSet } from '../lib/secure';
import { t } from '../lib/i18n';

import { FILE as ARCHIVE } from './archive';
import { ITER } from './config';
import { FILE as CONTACTS } from './contacts-data';
import { FILE as E2E } from './e2e-data';
import { FILE as GROUPS } from './group-data';
import { FILE as HISTORY, PAGE_PREFIX as PAGE } from './history';
import { FILE as PUBLIC_GROUPS } from './public-group-data';
import { POCKETS } from './sealed-file';
import { ORDER_FILE as SMS_ORDER } from './sms-data';
import { PREFIX as AVATAR } from './avatar-photos';
import { PREFIX as VOICE } from './voice-clips';

// A backup: everything Erevos keeps on the phone, in one file sealed with a password of its own.
// It holds the keystore entries and the files exactly as they are, each already sealed with its
// space's key, so it is the same whichever spaces are in use and shows nothing more than the phone
// does: not how many spaces there are, nor whether hidden chats are set. Restoring it puts all of
// it back, in place of what the phone had, and the passwords of the spaces open them as before.
//
// The file: MAGIC, the salt (SALT bytes) and PBKDF2 rounds (4 bytes) the password's key comes from,
// then, sealed with that key (AES-256-GCM, lib/crypto.ts), the entries one after another: their
// kind (1 byte), name (2-byte length, then the name) and data (4-byte length, then the data).
// An entry of a kind or name this Erevos does not know, from a newer one, is left out, and the
// rest restored; an Erevos before that refused the whole backup. What is damaged, or not sealed
// with the backup's key, opens nothing.
//
// What it leaves out stays with the phone: how many wrong passwords were typed, and how automatic
// backups are made (lib/backup-folder.ts). Of each space's SMS data (lock/sms-data.ts) it holds the
// space's own order of its SMS, and not the rest, with the SMS sent for later: restored on another
// phone, none of them goes again. An Erevos from before SMS_ORDER does not open a backup holding it;
// one from before, without it, restores as ever, and the spaces' order of their SMS starts empty.
//
// When the owner wants it, a backup also holds the phone's SMS and MMS (lib/backup-sms.ts), as
// one entry of its own kind, PHONE_SMS: they are the phone's, not a space's, the same in every
// space. Restoring the backup does not write them anywhere; the backup screen puts them back into
// the phone's SMS. An Erevos from before this kind does not open such a backup.

const MAGIC = utf8Encode('EREVOS BACKUP 1\n');
const SALT = 16;

// The keystore entries kept, in every space and slot whatever is in use: the lock, the spaces'
// keys, the hidden chats' lock, the password screen's look, and each slot's space and hidden chats.
const FIXED = ['erevos.lock', 'erevos.space-keys', 'erevos.hidden-lock', 'erevos.look'];
// The other pockets of hidden chats (hidden.ts): their locks, and their entries in every slot.
const OTHER_POCKETS = Array.from({ length: POCKETS - 1 }, (_, i) => i + 1);
// Slots looked for. There are never this many: SLOTS (slots.ts) unless more second passwords were set.
const MOST_SLOTS = 32;
const SLOTTED = Array.from({ length: MOST_SLOTS }, (_, n) => [
  `erevos.space.${n}`,
  `erevos.hidden.${n}`,
  ...OTHER_POCKETS.map((p) => `erevos.hidden${p}.${n}`),
]).flat();
const KEYS = [...FIXED, ...OTHER_POCKETS.map((p) => `erevos.hidden-lock.${p}`), ...SLOTTED];

// The sealed files that are text; voice messages' sounds are bytes. A file not on the phone is
// left out, so the backup of a phone that keeps no contacts in Erevos still opens in older versions.
const TEXT_FILES = [E2E, HISTORY, ARCHIVE, GROUPS, PUBLIC_GROUPS, SMS_ORDER, CONTACTS];

const KIND_KEY = 0;
const KIND_TEXT = 1;
const KIND_BYTES = 2;
const KIND_PHONE_SMS = 3;
const PHONE_SMS = 'phone-sms';

type Entry = { kind: number; name: string; data: Uint8Array };

/** What a backup holds, opened: ready to restore. `unknown`: how many entries in it this Erevos
 *  does not know (a newer one made it), left out. */
export type Backup = { entries: Entry[]; size: number; unknown: number };

/** The key a password gives for backups, with the salt and rounds it came from. */
export type BackupKey = { key: Uint8Array; salt: Uint8Array; iter: number };

export class NotABackupError extends Error {
  constructor() {
    super(t('That file is not an Erevos backup.'));
  }
}

export class WrongBackupPasswordError extends Error {
  constructor() {
    super(t('Wrong password for this backup.'));
  }
}

export async function backupKey(password: string, salt = randomBytes(SALT), iter = ITER): Promise<BackupKey> {
  return { key: await deriveKey(password, salt, iter), salt, iter };
}

async function collect(): Promise<Entry[]> {
  const entries: Entry[] = [];
  for (const name of KEYS) {
    const value = await secureGet(name);
    if (value !== null) entries.push({ kind: KIND_KEY, name, data: utf8Encode(value) });
  }
  for (const name of TEXT_FILES) {
    const text = await readFile(name);
    if (text !== null) entries.push({ kind: KIND_TEXT, name, data: utf8Encode(text) });
  }
  for (const name of [...(await listFiles(VOICE)), ...(await listFiles(AVATAR)), ...(await listFiles(PAGE))].sort()) {
    const bytes = await readBytes(name);
    if (bytes) entries.push({ kind: KIND_BYTES, name, data: bytes });
  }
  return entries;
}

function pack(entries: Entry[]): Uint8Array {
  const names = entries.map((entry) => utf8Encode(entry.name));
  const size = entries.reduce((sum, entry, i) => sum + 1 + 2 + names[i].length + 4 + entry.data.length, 0);
  const out = new Uint8Array(size);
  const view = new DataView(out.buffer);
  let at = 0;
  entries.forEach((entry, i) => {
    out[at] = entry.kind;
    view.setUint16(at + 1, names[i].length);
    out.set(names[i], at + 3);
    at += 3 + names[i].length;
    view.setUint32(at, entry.data.length);
    out.set(entry.data, at + 4);
    at += 4 + entry.data.length;
  });
  return out;
}

// A name a backup may restore: one of the keystore entries above, or a file of Erevos's own.
function allowed(kind: number, name: string): boolean {
  if (kind === KIND_KEY) return KEYS.includes(name);
  if (kind === KIND_TEXT) return TEXT_FILES.includes(name);
  if (kind === KIND_PHONE_SMS) return name === PHONE_SMS;
  return kind === KIND_BYTES && (name.startsWith(VOICE) || name.startsWith(AVATAR) || name.startsWith(PAGE)) && /^[a-z0-9-]+$/.test(name);
}

function unpack(bytes: Uint8Array): { entries: Entry[]; unknown: number } {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const entries: Entry[] = [];
  let unknown = 0;
  let at = 0;
  while (at < bytes.length) {
    if (at + 3 > bytes.length) throw new NotABackupError();
    const kind = bytes[at];
    const nameLength = view.getUint16(at + 1);
    at += 3;
    if (at + nameLength + 4 > bytes.length) throw new NotABackupError();
    const name = utf8Decode(bytes.subarray(at, at + nameLength));
    at += nameLength;
    const length = view.getUint32(at);
    at += 4;
    if (at + length > bytes.length) throw new NotABackupError();
    // One this Erevos does not know, as a newer one may hold, is left out and never written.
    if (allowed(kind, name)) entries.push({ kind, name, data: bytes.slice(at, at + length) });
    else unknown++;
    at += length;
  }
  return { entries, unknown };
}

/** A backup of everything on the phone, sealed with `key`: the bytes of the file. With
 *  `phoneSms`, the phone's SMS and MMS too (lib/backup-sms.ts). */
export async function makeBackup({ key, salt, iter }: BackupKey, phoneSms: Uint8Array | null = null): Promise<Uint8Array> {
  const entries = await collect();
  if (phoneSms) entries.push({ kind: KIND_PHONE_SMS, name: PHONE_SMS, data: phoneSms });
  const sealed = encryptBytes(key, pack(entries));
  const out = new Uint8Array(MAGIC.length + SALT + 4 + sealed.length);
  out.set(MAGIC);
  out.set(salt, MAGIC.length);
  new DataView(out.buffer).setUint32(MAGIC.length + SALT, iter);
  out.set(sealed, MAGIC.length + SALT + 4);
  return out;
}

/** Opens a backup file with its password. Throws NotABackupError or WrongBackupPasswordError. */
export async function openBackup(bytes: Uint8Array, password: string): Promise<Backup> {
  const head = MAGIC.length + SALT + 4;
  if (bytes.length < head || !sameBytes(bytes.subarray(0, MAGIC.length), MAGIC)) throw new NotABackupError();
  const salt = bytes.slice(MAGIC.length, MAGIC.length + SALT);
  const iter = new DataView(bytes.buffer, bytes.byteOffset).getUint32(MAGIC.length + SALT);
  if (iter < 1000 || iter > 10_000_000) throw new NotABackupError();
  const { key } = await backupKey(password, salt, iter);
  let packed: Uint8Array;
  try {
    packed = decryptBytes(key, bytes.subarray(head));
  } catch {
    throw new WrongBackupPasswordError();
  }
  const { entries, unknown } = unpack(packed);
  if (!entries.some((entry) => entry.name === 'erevos.space-keys' || entry.name === 'erevos.lock')) throw new NotABackupError();
  return { entries, size: bytes.length, unknown };
}

/**
 * Puts a backup in place of everything Erevos keeps on the phone. What the phone had and the
 * backup does not is deleted. Open again afterwards (the lock reads it all anew).
 */
export async function restoreBackup({ entries }: Backup): Promise<void> {
  const keep = new Set(entries.map((entry) => entry.name));
  for (const entry of entries) {
    if (entry.kind === KIND_TEXT) await writeFile(entry.name, utf8Decode(entry.data));
    if (entry.kind === KIND_BYTES) await writeBytes(entry.name, entry.data);
  }
  for (const name of [...TEXT_FILES, ...(await listFiles(VOICE)), ...(await listFiles(AVATAR)), ...(await listFiles(PAGE))]) {
    if (!keep.has(name)) await deleteFile(name);
  }
  for (const entry of entries) if (entry.kind === KIND_KEY) await secureSet(entry.name, utf8Decode(entry.data));
  for (const name of KEYS) if (!keep.has(name)) await secureDelete(name);
}

/** The phone's SMS and MMS a backup holds, or null when it holds none. */
export function backupPhoneSms({ entries }: Backup): Uint8Array | null {
  return entries.find((entry) => entry.kind === KIND_PHONE_SMS)?.data ?? null;
}

/** The name a backup made at `now` gets: the date and time, on this phone's clock. */
export function backupName(now = Date.now()): string {
  const d = new Date(now);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `erevos-backup-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}.erevos`;
}

export const BACKUP_PREFIX = 'erevos-backup-';
