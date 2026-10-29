import { canTorHttp } from './core';
import { randomBytes, toBase64, toHex, utf8Decode, utf8Encode } from './crypto';
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
// Padmé's sizes, sealed with the backup's password, which never leaves the phone. Its name is
// random too, so neither the file nor its name says it is Erevos's, and the server keeps the KEEP
// newest, as the folder does. The server still sees the account, when one comes and roughly how
// big it is, and the phone's address unless the backup goes through Tor.
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
// listed, only the names Erevos gives are shown, newest first, and the one chosen is downloaded
// and opened with its password as a file is, on the phone. Nothing is written on the server for it.
//
// The settings are kept in the keystore entry CLOUD, outside every space and out of backups, as
// automatic backups' own are, with the names of the backups sent, oldest first.

/** A folder on a server, with the user name and password for it. */
export type CloudServer = { url: string; user: string; password: string };

/** A backup on the server: its name, its size in bytes and when it came, milliseconds, 0 if the server does not say. */
export type CloudFile = { name: string; size: number; when: number };

// The names Erevos gives backups on a server.
const NAME = /^[0-9a-f]{16}$/;

/** Where backups go on a server. `last` milliseconds, 0 if none went yet. */
export type CloudBackup = {
  url: string;
  user: string;
  password: string;
  names: string[];
  last: number;
  error: string;
};

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
    return {
      url: value.url,
      user: value.user,
      password: value.password,
      names: Array.isArray(value.names) ? value.names.filter((name): name is string => typeof name === 'string' && NAME.test(name)) : [],
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
  const cloud: CloudBackup = {
    url,
    user,
    password,
    names: before?.url === url ? before.names : [],
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

/**
 * Sends a bare backup (lock/backup.ts) to the server, under a random name, and deletes there the
 * older ones it sent but the `keep` newest. Returns the settings as they are after it; one that
 * failed says why in `error`.
 */
export async function sendToCloud(cloud: CloudBackup, bytes: Uint8Array, keep: number, now = Date.now()): Promise<CloudBackup> {
  let next: CloudBackup;
  try {
    const name = toHex(randomBytes(8));
    const said = statusText((await ask('PUT', cloud.url + name, { ...authorization(cloud), 'Content-Type': 'application/octet-stream' }, bytes)).status);
    if (said) throw new CloudError(said);
    const names = [...cloud.names, name];
    const old = names.slice(0, Math.max(0, names.length - keep));
    const left: string[] = [];
    for (const gone of old) {
      // One already gone is gone; one the server would not delete is tried again next time.
      const status = await ask('DELETE', cloud.url + gone, authorization(cloud)).then(
        (answer) => answer.status,
        () => 0,
      );
      if (status !== 404 && statusText(status)) left.push(gone);
    }
    next = {
      ...cloud,
      names: [...left, ...names.slice(old.length)],
      last: now,
      error: '',
    };
  } catch (error) {
    next = {
      ...cloud,
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

/** The backups in the server's folder, newest first. Throws CloudError with why not. */
export async function listCloud(server: CloudServer): Promise<CloudFile[]> {
  const answer = await ask(
    'PROPFIND',
    server.url,
    { ...authorization(server), Depth: '1', 'Content-Type': 'application/xml; charset=utf-8' },
    utf8Encode(LISTING),
  );
  const said = statusText(answer.status);
  if (said) throw new CloudError(said);
  return backupsListed(utf8Decode(answer.bytes));
}

// One element's text in a piece of WebDAV's XML, whatever prefix its namespace has.
function element(xml: string, name: string): string | null {
  const found = new RegExp(`<(?:[\\w.-]+:)?${name}\\b[^>]*>([\\s\\S]*?)</(?:[\\w.-]+:)?${name}\\s*>`, 'i').exec(xml);
  return found ? found[1].trim() : null;
}

/** The backups a WebDAV listing (a PROPFIND's multistatus) names, newest first: only names Erevos gives. */
export function backupsListed(xml: string): CloudFile[] {
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
    if (!NAME.test(name)) continue;
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
  if (!NAME.test(name)) throw new CloudError(t('That file is not an Erevos backup.'));
  const cap = Math.min(most, CLOUD_RESTORE_MOST);
  const answer = await ask('GET', server.url + name, authorization(server), undefined, cap);
  const said = statusText(answer.status);
  if (said) throw new CloudError(said);
  if (answer.bytes.length > cap) throw new CloudError(tooLargeText(cap));
  return answer.bytes;
}
