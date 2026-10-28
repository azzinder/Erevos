import { randomBytes, toBase64, toHex, utf8Encode } from './crypto';
import { t } from './i18n';
import { throughTor } from './relay';
import { secureDelete, secureGet, secureSet } from './secure';

// Automatic backups (lib/backup-folder.ts) sent to a server too, when the owner wants it: a folder
// on a server that speaks WebDAV, as Nextcloud, ownCloud and many storage services do, the owner's
// own or one they choose. Erevos sends no backup anywhere by itself: this is off until the owner
// gives a folder's address, a user name and a password for it.
//
// What the server gets is a bare backup (lock/backup.ts): random bytes to look at, of one of
// Padmé's sizes, sealed with the backup's password, which never leaves the phone. Its name is
// random too, so neither the file nor its name says it is Erevos's, and the server keeps the KEEP
// newest, as the folder does. The server still sees the account, the phone's address, when one
// comes and roughly how big it is. Backups go to it straight, not through Tor (Erevos has no Tor
// for a server of this kind yet): so a space set to send Everything through Tor sends none.
//
// The settings are kept in the keystore entry CLOUD, outside every space and out of backups, as
// automatic backups' own are, with the names of the backups sent, oldest first.

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

/** Answers of the server: its status, as `fetch` gives. The checks put a server of their own here. */
export type CloudHttp = (method: string, url: string, headers: Record<string, string>, body?: Uint8Array) => Promise<number>;

const viaFetch: CloudHttp = async (method, url, headers, body) => {
  const response = await fetch(url, {
    method,
    headers,
    body: body as unknown as BodyInit | undefined,
  });
  // Read to the end, so the connection is let go.
  await response.text().catch(() => '');
  return response.status;
};

let http = viaFetch;

/** For the checks: a server of their own, or fetch again with null. */
export function setCloudHttp(next: CloudHttp | null): void {
  http = next ?? viaFetch;
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

function authorization(cloud: Pick<CloudBackup, 'user' | 'password'>): Record<string, string> {
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

async function ask(method: string, url: string, headers: Record<string, string>, body?: Uint8Array): Promise<number> {
  try {
    return await http(method, url, headers, body);
  } catch (error) {
    throw new CloudError(
      t('Could not reach the server. {error}', {
        error: error instanceof Error ? error.message : String(error),
      }),
    );
  }
}

// Erevos sends nothing straight while the open space sends everything through Tor.
function notThroughTor() {
  if (throughTor()) throw new CloudError(t('This space sends Everything through Tor, and backups to a server do not go through Tor yet, so none was sent.'));
}

export async function loadCloudBackup(): Promise<CloudBackup | null> {
  try {
    const value = JSON.parse((await secureGet(CLOUD)) ?? 'null') as Partial<CloudBackup> | null;
    if (!value || typeof value.url !== 'string' || typeof value.user !== 'string' || typeof value.password !== 'string') return null;
    return {
      url: value.url,
      user: value.user,
      password: value.password,
      names: Array.isArray(value.names) ? value.names.filter((name): name is string => typeof name === 'string' && /^[0-9a-f]{16}$/.test(name)) : [],
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
  notThroughTor();
  const url = cloudFolder(address);
  const said = statusText(
    await ask('PROPFIND', url, {
      ...authorization({ user, password }),
      Depth: '0',
    }),
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
    notThroughTor();
    const name = toHex(randomBytes(8));
    const said = statusText(await ask('PUT', cloud.url + name, { ...authorization(cloud), 'Content-Type': 'application/octet-stream' }, bytes));
    if (said) throw new CloudError(said);
    const names = [...cloud.names, name];
    const old = names.slice(0, Math.max(0, names.length - keep));
    const left: string[] = [];
    for (const gone of old) {
      // One already gone is gone; one the server would not delete is tried again next time.
      const status = await ask('DELETE', cloud.url + gone, authorization(cloud)).catch(() => 0);
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
