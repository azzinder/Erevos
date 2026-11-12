// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { askAddress, askServer, CloudError, cloudFolder, cloudStatusText, type CloudServer } from './backup-cloud';
import { utf8Decode, utf8Encode } from './crypto';
import { t } from './i18n';

// Signing in to a Nextcloud, as LPHL's, without typing its password: Nextcloud's Login Flow v2,
// which its own apps use, as Fasouli does. Erevos asks the Nextcloud for a flow, the owner signs in
// in the browser (through Authentik, or however that Nextcloud signs in) and grants access, and
// Erevos gets an app password of its own, which the owner can take back in Nextcloud → Settings →
// Security without changing theirs.
//
// Its folders are Erevos's own, in the owner's files: Erevos/Backups and Erevos/Collection, beside
// Fasouli's, which Erevos never reads. Requests go as backups to a server go (lib/backup-cloud.ts),
// through Tor as the space's Tor way says, or only through Tor with `tor`: the Tor switch of the
// server it signs in for, backups' or the Collection's, so the sign-in goes as that server will.
// The sign-in page itself opens in the browser, which goes as the browser does. The flow's
// addresses must be on the Nextcloud's own address, or it is refused.

export type LoginFlow = { login: string; poll: { endpoint: string; token: string } };
/** `tor`: asked only through Tor, as the server signed in for will be; left out while it is not. */
export type NextcloudLogin = { base: string; user: string; password: string; tor?: boolean };

/** How long a flow lasts on the server, and how often Erevos asks whether access was granted. */
export const FLOW_LIFETIME_MS = 20 * 60_000;
const POLL_EVERY_MS = 2_000;

/** The folders Erevos keeps in the owner's files there. */
export const NEXTCLOUD_FOLDERS = { backups: 'Backups', collection: 'Collection' } as const;
export type NextcloudFolder = keyof typeof NEXTCLOUD_FOLDERS;
const ROOT = 'Erevos';

export class SignInCancelled extends Error {}

const originOf = (url: string) => {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
};

/**
 * The Nextcloud's address from what the owner typed: https, without a page or folder of it after,
 * as …/index.php/… or …/remote.php/…, and without a closing /. Throws CloudError with why not.
 */
export function nextcloudBase(typed: string): string {
  const text = typed.trim();
  const folder = cloudFolder(/^[a-z][a-z0-9+.-]*:/i.test(text) ? text : `https://${text}`);
  return folder.replace(/\/(index\.php|remote\.php|apps|login|ocs)(\/.*)?$/, '/').replace(/\/+$/, '');
}

function json(bytes: Uint8Array): Record<string, unknown> | null {
  try {
    const value: unknown = JSON.parse(utf8Decode(bytes));
    return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** Asks the Nextcloud at `base` for a flow; with `tor`, only through Tor. Throws CloudError with why not. */
export async function startLoginFlow(base: string, tor = false): Promise<LoginFlow> {
  const answer = await askAddress('POST', `${base}/index.php/login/v2`, {}, undefined, tor);
  const said = cloudStatusText(answer.status);
  if (said) throw new CloudError(answer.status === 404 ? t('There is no Nextcloud at that address.') : said);
  const data = json(answer.bytes);
  const poll = data?.poll as { endpoint?: unknown; token?: unknown } | undefined;
  if (typeof data?.login !== 'string' || typeof poll?.endpoint !== 'string' || typeof poll.token !== 'string') {
    throw new CloudError(t('There is no Nextcloud at that address.'));
  }
  const origin = originOf(base);
  if (!origin || originOf(data.login) !== origin || originOf(poll.endpoint) !== origin) {
    throw new CloudError(t('That Nextcloud sent its sign-in elsewhere, so Erevos stopped.'));
  }
  return { login: data.login, poll: { endpoint: poll.endpoint, token: poll.token } };
}

/**
 * Waits until the owner grants access, asking every 2 seconds; with `tor`, only through Tor, and
 * the login says so. Throws SignInCancelled when `signal` aborts, and CloudError when the flow ran
 * out.
 */
export async function waitForLogin(
  base: string,
  flow: LoginFlow,
  signal: AbortSignal,
  { every = POLL_EVERY_MS, lifetime = FLOW_LIFETIME_MS, now = Date.now, tor = false } = {},
): Promise<NextcloudLogin> {
  const until = now() + lifetime;
  const pause = () =>
    new Promise<void>((resolve, reject) => {
      const timer = setTimeout(resolve, every);
      signal.addEventListener(
        'abort',
        () => {
          clearTimeout(timer);
          reject(new SignInCancelled());
        },
        { once: true },
      );
    });
  const body = utf8Encode(`token=${encodeURIComponent(flow.poll.token)}`);
  while (now() < until) {
    if (signal.aborted) throw new SignInCancelled();
    const answer = await askAddress('POST', flow.poll.endpoint, { 'Content-Type': 'application/x-www-form-urlencoded' }, body, tor).catch(() => null);
    if (signal.aborted) throw new SignInCancelled();
    if (answer && answer.status >= 200 && answer.status < 300) {
      const data = json(answer.bytes);
      if (typeof data?.loginName === 'string' && typeof data.appPassword === 'string') {
        return { base, user: data.loginName, password: data.appPassword, ...(tor ? { tor: true } : {}) };
      }
    }
    await pause();
  }
  throw new CloudError(t('The sign-in ran out of time. Try again.'));
}

/**
 * The owner's own WebDAV folder: Nextcloud's answer to who they are (current-user-principal), since
 * the user name signed in with need not be the user id.
 */
export async function filesOf(login: NextcloudLogin): Promise<string> {
  const fallback = `${login.base}/remote.php/dav/files/${encodeURIComponent(login.user)}`;
  const answer = await askServer({ url: `${login.base}/remote.php/dav/`, user: login.user, password: login.password, ...(login.tor ? { tor: true } : {}) }, 'PROPFIND', '', {
    headers: { Depth: '0', 'Content-Type': 'application/xml; charset=utf-8' },
    body: utf8Encode('<?xml version="1.0"?><d:propfind xmlns:d="DAV:"><d:prop><d:current-user-principal/></d:prop></d:propfind>'),
  }).catch(() => null);
  if (!answer || cloudStatusText(answer.status)) return fallback;
  const id = /<(?:[\w-]+:)?current-user-principal>\s*<(?:[\w-]+:)?href>[^<]*\/principals\/users\/([^/<]+)\/?<\//.exec(utf8Decode(answer.bytes))?.[1];
  return id ? `${login.base}/remote.php/dav/files/${id}` : fallback;
}

/**
 * Erevos's folder for `which` there, made when it is not yet (Erevos, then Backups or Collection):
 * the server to give to backups or to the Collection, through Tor alone when the login was.
 * Throws CloudError with why not.
 */
export async function nextcloudFolder(login: NextcloudLogin, which: NextcloudFolder): Promise<CloudServer> {
  const files = await filesOf(login);
  const server: CloudServer = { url: `${files}/`, user: login.user, password: login.password, ...(login.tor ? { tor: true } : {}) };
  for (const name of [`${ROOT}/`, `${ROOT}/${NEXTCLOUD_FOLDERS[which]}/`]) {
    const answer = await askServer(server, 'MKCOL', name);
    // 405: it is there already.
    if (answer.status !== 405) {
      const said = cloudStatusText(answer.status);
      if (said) throw new CloudError(said);
    }
  }
  return { ...server, url: `${files}/${ROOT}/${NEXTCLOUD_FOLDERS[which]}/` };
}
