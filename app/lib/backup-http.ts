import { netHttp, type HttpAnswer, type HttpMethod } from './net-http';

// How a backup reaches a server (lib/backup-cloud.ts) on the phone: through lib/net-http.ts, so
// through Tor as the space's Tor way says. On a computer and in the web app, lib/backup-http.web.ts.

/** One request to the server. */
export function cloudRequest(method: HttpMethod, url: string, headers: Record<string, string>, body?: Uint8Array): Promise<HttpAnswer> {
  return netHttp(method, url, headers, body);
}
