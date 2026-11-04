// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { BARE_PART, type PartReader, type PartSink } from '../lock/backup';

import { canTorHttp } from './core';
import { fromHex, randomBytes, sha256Bytes, toBase64, toHex, utf8Decode, utf8Encode } from './crypto';
import { t } from './i18n';
import { cloudRequest } from './backup-http';
import { HTTP_MOST, HttpTooLargeError, type HttpMethod } from './net-http';
import { throughTor, torFor, waitForTor } from './relay';
import { secureDelete, secureGet, secureSet } from './secure';

// Automatic backups (lib/backup-folder.ts) sent to a server too, when the owner wants it: a folder
// on a server that speaks WebDAV, as Nextcloud, ownCloud and many storage services do, the owner's
// own or one they choose. Erevos sends no backup anywhere by itself: this is off until the owner
// gives a folder's address, a user name and a password for it.
//
// What the server gets is a bare backup (lock/backup.ts): random bytes to look at, of one of
// Padmé's sizes, sealed with the backup's password, which never leaves the phone, and its parts,
// the photos, files and voice messages, each an upload of its own, all of one size, sent before
// it. Their names are random too, all of one length, the backup's as its parts', so neither the
// files nor their names say they are Erevos's, and the server keeps the KEEP newest backups with
// their parts, as the folder does. A part's name comes from a random seed of its backup's and its
// number (partName), so the phone keeps only the seed and how many went. The server still sees the
// account, when a backup comes and roughly how big it is, and the phone's address unless it goes
// through Tor; and it can count the parts, and tell them from the backup by their size, a whole
// number of full parts (BARE_PART, lock/backup.ts), which is how a restore tells them apart too.
// What a backup that never ended left there, as when the phone stopped while sending its parts, or
// the server had no room left, is deleted before the next one goes, so it makes room for it.
//
// On Android backups go as the open space's Tor way says (Settings → Relay and networks → Tor),
// through lib/net-http.ts, as Matrix's and the other networks' files do: with Everything only
// through Tor, and none when Tor cannot reach the server; with Messages through Tor while it is
// ready, straight when it is not or fails; with Nothing straight. Just after a space opens Tor is
// still starting, so a backup first waits for it a while (torWaitMs).
//
// On a computer the desktop app sends each request from its shell, as a page may not reach such a
// server (CORS); the web app reaches only a server that lets it (lib/backup-http.web.ts). Neither
// has Tor for it: with a space sending Everything through Tor, nothing goes there.
//
// A backup there can be put back from the server itself (listCloud, fetchFromCloud): the folder is
// listed, only the names Erevos gives backups are shown, newest first, and the one chosen is
// downloaded and opened with its password as a file is, on the phone, then its parts one at a
// time (cloudParts). Nothing is written on the server for it.
//
// The settings are kept in the keystore entry CLOUD, outside every space, as automatic backups'
// own are, with the names of the backups sent, oldest first. Backups hold it (lock/backup.ts):
// restored where the phone sends to the same folder, the phone's own list of what went there stays.

/** A folder on a server, with the user name and password for it. */
export type CloudServer = { url: string; user: string; password: string };

/** A backup on the server: its name, its size in bytes and when it came, milliseconds, 0 if the server does not say. */
export type CloudFile = { name: string; size: number; when: number };

// The names Erevos gives backups on a server, and their parts: of one length. A backup sent by an
// Erevos from before parts has a shorter one.
const NAME = /^[0-9a-f]{24}$/;
const OLD_NAME = /^[0-9a-f]{16}$/;
const PART_NAME = NAME;
const isBackupName = (name: string) => NAME.test(name) || OLD_NAME.test(name);
// A backup's parts' seed.
const SEED_BYTES = 16;
const SEED = /^[0-9a-f]{32}$/;
// The most parts a backup has (lock/backup.ts).
const MOST_PARTS = 1_000_000;

/** A backup's parts on the server: the seed their names come from, and how many there are (or,
 *  for one that never ended, may be). */
export type CloudParts = { seed: string; count: number };

/** Where backups go on a server. `names` are the backups sent, oldest first, `parts` the parts of
 *  each, `unfinished` those of backups that never ended, to delete. `last` milliseconds, 0 if none
 *  went yet. */
export type CloudBackup = {
  url: string;
  user: string;
  password: string;
  names: string[];
  parts: Record<string, CloudParts>;
  unfinished: CloudParts[];
  last: number;
  error: string;
};

/** The name of part `n` (from 0) of the backup whose parts' seed is `seed`. */
export function partName(seed: string, n: number): string {
  const joined = new Uint8Array(SEED_BYTES + 4);
  joined.set(fromHex(seed));
  new DataView(joined.buffer).setUint32(SEED_BYTES, n);
  return toHex(sha256Bytes(joined)).slice(0, 24);
}

function partsOf(value: unknown): CloudParts | null {
  const v = value as Partial<CloudParts> | null;
  if (!v || typeof v.seed !== 'string' || !SEED.test(v.seed) || typeof v.count !== 'number') return null;
  return Number.isInteger(v.count) && v.count >= 0 && v.count <= MOST_PARTS ? { seed: v.seed, count: v.count } : null;
}

const CLOUD = 'erevos.backup-cloud';

/** A server's answer: its status and what it said. */
export type CloudAnswer = { status: number; bytes: Uint8Array };

/** How a request goes to the server. The checks put a server of their own here. */
export type CloudHttp = (method: HttpMethod, url: string, headers: Record<string, string>, body?: Uint8Array, most?: number) => Promise<CloudAnswer>;

/** The largest backup that comes back from a server: what any download takes (lib/net-http.ts),
 *  100 MB. A larger one is downloaded from the server by hand and opened as a file. */
export const CLOUD_RESTORE_MOST = HTTP_MOST;

/** Why a backup did not come from the server: it is larger than `most`. */
export function tooLargeText(most: number): string {
  return t('A backup larger than {size} MB does not come from a server. Download it from the server and tap Restore a backup.', { size: String(Math.floor(most / (1024 * 1024))) });
}

const viaNet: CloudHttp = cloudRequest;

let http = viaNet;

/** For the checks: a server of their own, or the usual way again with null. */
export function setCloudHttp(next: CloudHttp | null): void {
  http = next ?? viaNet;
}

// How long a backup waits for Tor to start, milliseconds, before it goes as the Tor way says
// without it: one made as a space opens comes before Tor is ready.
let torWaitMs = 120_000;

/** For the checks: how long to wait for Tor. */
export function setCloudTorWait(ms: number): void {
  torWaitMs = ms;
}

/** Whether backups to a server go through Tor now, as the open space's Tor way and Tor's state say. */
export function cloudThroughTor(): boolean {
  return canTorHttp() && torFor(false);
}

export class CloudError extends Error {}

/** The folder's address as Erevos uses it: https, ending in /. Throws CloudError with why not. */
export function cloudFolder(address: string): string {
  // Without what follows ? or #, which a folder's address has no use for.
  const text = address.trim().replace(/[?#].*$/, '');
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    throw new CloudError(t('That is not a folder address. It starts with https://'));
  }
  if (url.protocol !== 'https:') throw new CloudError(t('The address has to start with https://, so the password and backups go encrypted.'));
  if (url.username || url.password) throw new CloudError(t('Put the user name and password in their own fields, not in the address.'));
  return text.endsWith('/') ? text : `${text}/`;
}

function authorization(cloud: Pick<CloudServer, 'user' | 'password'>): Record<string, string> {
  return {
    Authorization: `Basic ${toBase64(utf8Encode(`${cloud.user}:${cloud.password}`))}`,
  };
}

// What the server's status says, in words; null when all went well.
function statusText(status: number): string | null {
  if (status >= 200 && status < 300) return null;
  if (status === 401 || status === 403) return t('The server did not take that user name and password.');
  if (status === 404 || status === 409) return t('That folder is not on the server. Make it there first.');
  if (status === 507) return t('The server has no room left for it.');
  return t('The server answered {status}.', { status });
}

async function ask(method: HttpMethod, url: string, headers: Record<string, string>, body?: Uint8Array, most?: number): Promise<CloudAnswer> {
  // Erevos sends nothing straight while the open space sends everything through Tor.
  if (throughTor() && !canTorHttp()) throw new CloudError(t('This space sends Everything through Tor, and Tor here cannot reach a server, so nothing went to it.'));
  if (canTorHttp()) await waitForTor(torWaitMs);
  try {
    return await http(method, url, headers, body, most);
  } catch (error) {
    if (error instanceof HttpTooLargeError) throw new CloudError(tooLargeText(error.most));
    throw new CloudError(
      t('Could not reach the server. {error}', {
        error: error instanceof Error ? error.message : String(error),
      }),
    );
  }
}

export async function loadCloudBackup(): Promise<CloudBackup | null> {
  try {
    const value = JSON.parse((await secureGet(CLOUD)) ?? 'null') as Partial<CloudBackup> | null;
    if (!value || typeof value.url !== 'string' || typeof value.user !== 'string' || typeof value.password !== 'string') return null;
    const names = Array.isArray(value.names) ? value.names.filter((name): name is string => typeof name === 'string' && isBackupName(name)) : [];
    const parts: Record<string, CloudParts> = {};
    const listed = typeof value.parts === 'object' && value.parts ? (value.parts as Record<string, unknown>) : {};
    for (const name of names) {
      // Names of hex digits only, never one of an object's own.
      const of = partsOf(listed[name]);
      if (of) parts[name] = of;
    }
    return {
      url: value.url,
      user: value.user,
      password: value.password,
      names,
      parts,
      unfinished: Array.isArray(value.unfinished) ? value.unfinished.map(partsOf).filter((of): of is CloudParts => of !== null) : [],
      last: typeof value.last === 'number' ? value.last : 0,
      error: typeof value.error === 'string' ? value.error : '',
    };
  } catch {
    return null;
  }
}

/**
 * Sends automatic backups to the folder at `address` from now on, after asking the server whether
 * the folder is there and takes the user name and password. Throws CloudError with why not.
 */
export async function startCloudBackup(address: string, user: string, password: string): Promise<CloudBackup> {
  const url = cloudFolder(address);
  const said = statusText(
    (
      await ask('PROPFIND', url, {
        ...authorization({ user, password }),
        Depth: '0',
      })
    ).status,
  );
  if (said) throw new CloudError(said);
  const before = await loadCloudBackup();
  // The same folder keeps the names of what went there, so the oldest still go.
  const same = before?.url === url;
  const cloud: CloudBackup = {
    url,
    user,
    password,
    names: same ? before.names : [],
    parts: same ? before.parts : {},
    unfinished: same ? before.unfinished : [],
    last: 0,
    error: '',
  };
  await secureSet(CLOUD, JSON.stringify(cloud));
  return cloud;
}

/** Sends no more backups to the server; those there stay. */
export async function stopCloudBackup(): Promise<void> {
  await secureDelete(CLOUD);
}

// Sends `bytes` to the server as `name`. Throws CloudError with why not.
async function put(cloud: CloudBackup, name: string, bytes: Uint8Array): Promise<void> {
  const said = statusText((await ask('PUT', cloud.url + name, { ...authorization(cloud), 'Content-Type': 'application/octet-stream' }, bytes)).status);
  if (said) throw new CloudError(said);
}

// Deletes `name` on the server: whether it is gone now, as one already gone is.
async function gone(cloud: CloudBackup, name: string): Promise<boolean> {
  const status = await ask('DELETE', cloud.url + name, authorization(cloud)).then(
    (answer) => answer.status,
    () => 0,
  );
  return status === 404 || !statusText(status);
}

// Deletes a backup's parts on the server: whether all of them are gone now.
async function partsGone(cloud: CloudBackup, { seed, count }: CloudParts): Promise<boolean> {
  for (let n = 0; n < count; n++) if (!(await gone(cloud, partName(seed, n)))) return false;
  return true;
}

// How many parts' names are kept ahead of those sent, so the keystore is written once for so many.
const AHEAD = 16;

// Deletes there the backups sent but the `keep` newest, with their parts, and the parts of those
// that never ended: the settings as they are after it. One the server would not delete stays, to
// be tried again next time.
async function tidy(cloud: CloudBackup, next: CloudBackup, keep: number): Promise<CloudBackup> {
  const old = next.names.slice(0, Math.max(0, next.names.length - keep));
  const left: string[] = [];
  const parts = { ...next.parts };
  const loose = [...next.unfinished];
  for (const older of old) {
    // Its parts go once it did.
    if (!(await gone(cloud, older))) {
      left.push(older);
      continue;
    }
    if (parts[older]) loose.push(parts[older]);
    delete parts[older];
  }
  const unfinished: CloudParts[] = [];
  for (const of of loose) if (!(await partsGone(cloud, of))) unfinished.push(of);
  return { ...next, names: [...left, ...next.names.slice(old.length)], parts, unfinished };
}

/**
 * Sends a bare backup (lock/backup.ts) to the server: first deletes there what a backup that never
 * ended left, and those beyond the `keep` newest, so a server short of room has it again; then
 * `make` makes it, giving each part as it is made, which goes at once under its own name, then the
 * backup itself, which goes last under a random name. Then deletes there the older ones it sent but
 * the `keep` newest, with their parts. Returns the settings as they are after it; one that failed
 * says why in `error`.
 */
export async function sendToCloud(cloud: CloudBackup, make: (part: PartSink) => Promise<Uint8Array>, keep: number, now = Date.now()): Promise<CloudBackup> {
  let next = cloud;
  const save = async (value: CloudBackup) => {
    next = value;
    await secureSet(CLOUD, JSON.stringify(value));
  };
  const seed = toHex(randomBytes(SEED_BYTES));
  const without = (list: CloudParts[]) => list.filter((of) => of.seed !== seed);
  try {
    if (next.unfinished.length || next.names.length > keep) await save(await tidy(cloud, next, keep));
    let count = 0;
    const name = toHex(randomBytes(12));
    try {
      const bytes = await make(async (part) => {
        // Kept before they go, so those of a backup cut short are deleted next time. The backup
        // read this entry before its first part (lock/backup.ts), so it holds no such seed of its own.
        if (count % AHEAD === 0) await save({ ...next, unfinished: [...without(next.unfinished), { seed, count: count + AHEAD }] });
        const at = partName(seed, count);
        count++;
        await put(cloud, at, part);
        return at;
      });
      await put(cloud, name, bytes);
    } catch (error) {
      // What went of it goes again: now, if the server lets it, else next time.
      if (count && (await partsGone(cloud, { seed, count })) && (await gone(cloud, name))) next = { ...next, unfinished: without(next.unfinished) };
      throw error;
    }
    // Kept at once, so its parts are never taken for those of one that never ended.
    await save({
      ...next,
      names: [...next.names, name],
      parts: count ? { ...next.parts, [name]: { seed, count } } : next.parts,
      unfinished: without(next.unfinished),
      last: now,
      error: '',
    });
    next = await tidy(cloud, next, keep);
  } catch (error) {
    next = {
      ...next,
      error: error instanceof Error ? error.message : String(error),
    };
  }
  await secureSet(CLOUD, JSON.stringify(next));
  return next;
}

/** The server's name, as the screen shows it: cloud.example.org. */
export function cloudLabel(cloud: Pick<CloudBackup, 'url'>): string {
  try {
    return new URL(cloud.url).host;
  } catch {
    return cloud.url;
  }
}

/** A folder on a server as the owner typed it, to restore from. Throws CloudError when the address is not one. */
export function cloudServer(address: string, user: string, password: string): CloudServer {
  return { url: cloudFolder(address), user: user.trim(), password };
}

// What WebDAV is asked of each file in the folder.
const LISTING =
  '<?xml version="1.0" encoding="utf-8"?><d:propfind xmlns:d="DAV:"><d:prop><d:getlastmodified/><d:getcontentlength/></d:prop></d:propfind>';

/** The backups in the server's folder, newest first, without their parts. Throws CloudError with why not. */
export async function listCloud(server: CloudServer): Promise<CloudFile[]> {
  return backupsListed(await listing(server));
}

// The folder's WebDAV listing. Throws CloudError with why not.
async function listing(server: CloudServer): Promise<string> {
  const answer = await ask(
    'PROPFIND',
    server.url,
    { ...authorization(server), Depth: '1', 'Content-Type': 'application/xml; charset=utf-8' },
    utf8Encode(LISTING),
  );
  const said = statusText(answer.status);
  if (said) throw new CloudError(said);
  return utf8Decode(answer.bytes);
}

/**
 * The parts of the backups in the server's folder, to restore one (lock/backup.ts): which of a
 * backup's parts' names are not there, and each one's bytes, downloaded one at a time as asked,
 * at most CLOUD_RESTORE_MOST bytes. Throws CloudError with why not.
 */
export async function cloudParts(server: CloudServer): Promise<{ missing(names: string[]): string[]; read: PartReader }> {
  const there = new Set(listed(await listing(server), (name) => PART_NAME.test(name)).map((file) => file.name));
  return {
    missing: (names) => names.filter((name) => !there.has(name)),
    read: async (name) => {
      if (!PART_NAME.test(name) || !there.has(name)) return null;
      const answer = await ask('GET', server.url + name, authorization(server), undefined, CLOUD_RESTORE_MOST);
      if (answer.status === 404) return null;
      const said = statusText(answer.status);
      if (said) throw new CloudError(said);
      return answer.bytes;
    },
  };
}

// One element's text in a piece of WebDAV's XML, whatever prefix its namespace has.
function element(xml: string, name: string): string | null {
  const found = new RegExp(`<(?:[\\w.-]+:)?${name}\\b[^>]*>([\\s\\S]*?)</(?:[\\w.-]+:)?${name}\\s*>`, 'i').exec(xml);
  return found ? found[1].trim() : null;
}

/** The backups a WebDAV listing (a PROPFIND's multistatus) names, newest first: only names Erevos
 *  gives, and not their parts, whose size is a whole number of full parts. */
export function backupsListed(xml: string): CloudFile[] {
  return listed(xml, isBackupName).filter((file) => OLD_NAME.test(file.name) || file.size === 0 || file.size % BARE_PART !== 0);
}

// The files a WebDAV listing names whose names are of `kind`, newest first.
function listed(xml: string, kind: (name: string) => boolean): CloudFile[] {
  const files: CloudFile[] = [];
  for (const [response] of xml.matchAll(/<(?:[\w.-]+:)?response\b[\s\S]*?<\/(?:[\w.-]+:)?response\s*>/gi)) {
    const href = element(response, 'href');
    if (!href) continue;
    let name: string;
    try {
      name = decodeURIComponent(href.replace(/\/+$/, '').split('/').pop() ?? '');
    } catch {
      continue;
    }
    if (!kind(name)) continue;
    files.push({
      name,
      size: Number(element(response, 'getcontentlength')) || 0,
      when: Date.parse(element(response, 'getlastmodified') ?? '') || 0,
    });
  }
  return files.sort((a, b) => b.when - a.when);
}

/** Downloads the backup `name` from the server, at most `most` bytes (CLOUD_RESTORE_MOST at most):
 *  a larger answer is stopped as it comes. Throws CloudError with why not. */
export async function fetchFromCloud(server: CloudServer, name: string, most: number = CLOUD_RESTORE_MOST): Promise<Uint8Array> {
  if (!isBackupName(name)) throw new CloudError(t('That file is not an Erevos backup.'));
  const cap = Math.min(most, CLOUD_RESTORE_MOST);
  const answer = await ask('GET', server.url + name, authorization(server), undefined, cap);
  const said = statusText(answer.status);
  if (said) throw new CloudError(said);
  if (answer.bytes.length > cap) throw new CloudError(tooLargeText(cap));
  return answer.bytes;
}
