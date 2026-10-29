import { canTorHttp, torHttp } from './core';
import { t } from './i18n';
import { streamingFetch } from './net-fetch';
import { throughTor, torFor } from './relay';

// HTTPS for the other networks' files (lib/nostr-files.ts, lib/xmpp-files.ts), the relay's Matrix
// push gateway (lib/matrix-push.ts) and backups to a server (lib/backup-cloud.ts): through Tor as
// the space's Tor way says, as their chats go.
// With Messages, straight while Tor is not ready or when it fails; with Everything, only through
// Tor. In the web app and on a computer, straight.
//
// No answer is taken whole into memory unweighed: a contact picks a file's address, and a server
// that answered without end would fill the phone's memory. Each request takes at most `most`
// bytes, HTTP_MOST unless the caller asks for less. Straight, a length the server says that is too
// large stops it before anything is read, and the answer is read as a stream that stops as soon as
// it passes `most` (also with no length, in chunks). GETs on the phone go through Expo's fetch
// (lib/net-fetch.native.ts), which streams; React Native's own, which the phone's other requests
// (PUT, POST, PROPFIND) go through, has no stream, so for them only the length the server says is
// weighed before the whole answer is. Through Tor the core takes 64 MB at most
// (crates/erevos-tor), and the answer is weighed against `most` after.

/** The most bytes any answer may have, unless its caller asks for less: 100 MB. */
export const HTTP_MOST = 100 * 1024 * 1024;

export type HttpMethod = 'GET' | 'PUT' | 'POST' | 'DELETE' | 'PROPFIND';
export type HttpAnswer = { status: number; bytes: Uint8Array; reason?: string };
export type Http = (method: HttpMethod, url: string, headers: Record<string, string>, body?: Uint8Array, most?: number) => Promise<HttpAnswer>;

const megabytes = (bytes: number) => String(Math.floor(bytes / (1024 * 1024)));

/** An answer larger than its request takes. */
export class HttpTooLargeError extends Error {
  readonly most: number;
  constructor(most: number) {
    super(t('The answer was larger than {size} MB, the most Erevos takes, so it was stopped.', { size: megabytes(most) }));
    this.most = most;
    this.name = 'HttpTooLargeError';
  }
}

/**
 * The body of `response`, `most` bytes at most: throws HttpTooLargeError as soon as the length the
 * server says, or the bytes read so far, pass it, and calls `stop` (which aborts the request) so
 * no more comes. With no stream to read, the length said is weighed, then the whole body.
 */
export async function readCapped(response: Response, most: number, stop?: () => void): Promise<Uint8Array> {
  const reader = response.body && typeof response.body.getReader === 'function' ? response.body.getReader() : null;
  const tooLarge = () => {
    if (reader) void reader.cancel().catch(() => undefined);
    stop?.();
    return new HttpTooLargeError(most);
  };
  const said = Number(response.headers.get('content-length') ?? '');
  if (Number.isFinite(said) && said > most) throw tooLarge();
  if (!reader) {
    const whole = new Uint8Array(await response.arrayBuffer());
    if (whole.length > most) throw tooLarge();
    return whole;
  }
  const chunks: Uint8Array[] = [];
  let got = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value?.length) continue;
    got += value.length;
    if (got > most) throw tooLarge();
    chunks.push(value);
  }
  if (chunks.length === 1) return chunks[0];
  const bytes = new Uint8Array(got);
  let at = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, at);
    at += chunk.length;
  }
  return bytes;
}

/** A request straight, its answer read with readCapped. GETs go through the fetch that streams. */
export async function fetchCapped(url: string, init: RequestInit, most: number = HTTP_MOST): Promise<{ response: Response; bytes: Uint8Array }> {
  const stop = new AbortController();
  const outer = init.signal;
  if (outer) {
    if (outer.aborted) stop.abort();
    else outer.addEventListener('abort', () => stop.abort(), { once: true });
  }
  const method = (init.method ?? 'GET').toUpperCase();
  const response = await (method === 'GET' ? streamingFetch : fetch)(url, { ...init, signal: stop.signal });
  return { response, bytes: await readCapped(response, most, () => stop.abort()) };
}

async function straight(method: HttpMethod, url: string, headers: Record<string, string>, body: Uint8Array | undefined, most: number): Promise<HttpAnswer> {
  const { response, bytes } = await fetchCapped(url, { method, headers, body: body as unknown as BodyInit | undefined }, most);
  return { status: response.status, bytes, reason: response.headers.get('x-reason') ?? undefined };
}

async function viaTor(method: HttpMethod, url: string, headers: Record<string, string>, body: Uint8Array | undefined, most: number): Promise<HttpAnswer> {
  const answer = await torHttp(JSON.stringify({ method, url, headers }), body ?? new Uint8Array(0));
  if (answer.length - 2 > most) throw new HttpTooLargeError(most);
  return { status: (answer[0] << 8) | answer[1], bytes: answer.slice(2) };
}

export const netHttp: Http = async (method, url, headers, body, most = HTTP_MOST) => {
  const cap = Math.min(most, HTTP_MOST);
  if (!(canTorHttp() && torFor(false))) {
    if (throughTor()) throw new Error(t('Tor is not ready.'));
    return straight(method, url, headers, body, cap);
  }
  try {
    return await viaTor(method, url, headers, body, cap);
  } catch (error) {
    // Too large through Tor is too large straight too.
    if (throughTor() || error instanceof HttpTooLargeError) throw error;
    return straight(method, url, headers, body, cap);
  }
};
