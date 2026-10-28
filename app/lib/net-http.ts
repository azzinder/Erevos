import { canTorHttp, torHttp } from './core';
import { t } from './i18n';
import { throughTor, torFor } from './relay';

// HTTPS for the other networks' files (lib/nostr-files.ts, lib/xmpp-files.ts) and the relay's Matrix
// push gateway (lib/matrix-push.ts): through Tor as the space's Tor way says, as their chats go.
// With Messages, straight while Tor is not ready or when it fails; with Everything, only through
// Tor. In the web app and on a computer, straight.

export type HttpMethod = 'GET' | 'PUT' | 'POST';
export type HttpAnswer = { status: number; bytes: Uint8Array; reason?: string };
export type Http = (method: HttpMethod, url: string, headers: Record<string, string>, body?: Uint8Array) => Promise<HttpAnswer>;

async function straight(method: HttpMethod, url: string, headers: Record<string, string>, body?: Uint8Array): Promise<HttpAnswer> {
  const response = await fetch(url, { method, headers, body: body as unknown as BodyInit | undefined });
  return { status: response.status, bytes: new Uint8Array(await response.arrayBuffer()), reason: response.headers.get('x-reason') ?? undefined };
}

async function viaTor(method: HttpMethod, url: string, headers: Record<string, string>, body?: Uint8Array): Promise<HttpAnswer> {
  const answer = await torHttp(JSON.stringify({ method, url, headers }), body ?? new Uint8Array(0));
  return { status: (answer[0] << 8) | answer[1], bytes: answer.slice(2) };
}

export const netHttp: Http = async (method, url, headers, body) => {
  if (!(canTorHttp() && torFor(false))) {
    if (throughTor()) throw new Error(t('Tor is not ready.'));
    return straight(method, url, headers, body);
  }
  try {
    return await viaTor(method, url, headers, body);
  } catch (error) {
    if (throughTor()) throw error;
    return straight(method, url, headers, body);
  }
};
