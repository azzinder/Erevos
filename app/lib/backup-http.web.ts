import { t } from './i18n';
import { netHttp, type HttpAnswer, type HttpMethod } from './net-http';
import { SHELL, shellFetch } from './shell';

// How a backup reaches a server (lib/backup-cloud.ts) on a computer and in the web app. A page may
// read only the answers of a server that lets it (CORS), and WebDAV servers do not as they come,
// Nextcloud neither. So the desktop app asks its shell for each request (desktop/main.js /__webdav),
// which sends it from outside the page: only https, only WebDAV's few methods and headers. The web
// app in a plain browser has no such shell: it asks the server itself, which works only with a
// server set to let the web app's address in. None of them has Tor for it (lib/backup-cloud.ts).

/** One request to the server. */
export async function cloudRequest(method: HttpMethod, url: string, headers: Record<string, string>, body?: Uint8Array): Promise<HttpAnswer> {
  if (SHELL === 'electron') {
    const response = await shellFetch(`/__webdav?method=${method}&url=${encodeURIComponent(url)}`, {
      method: 'POST',
      headers,
      body: body as BodyInit | undefined,
    });
    const status = Number(response.headers.get('X-Erevos-Status'));
    if (!status) throw new Error(t('The desktop app answered {status}.', { status: response.status }));
    return { status, bytes: new Uint8Array(await response.arrayBuffer()) };
  }
  if (SHELL) throw new Error(t('Backups to a server do not work here yet.'));
  try {
    return await netHttp(method, url, headers, body);
  } catch (error) {
    // A browser says no more of a server that did not let it in than of one it could not reach.
    if (error instanceof TypeError) throw new Error(t('In a browser the server has to let the web app in (CORS), and this one did not, or could not be reached.'));
    throw error;
  }
}
