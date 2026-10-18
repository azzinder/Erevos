// Client for the Erevos relay over WebSocket (ws:// or wss://). The relay holds
// one-way queues: a sender writes with its sender id, and the recipient reads
// with its recipient id. Each request is one binary message, and each reply is
// one binary message. The wire format is in crates/erevos-relay/src/server.rs.
// Self-contained on purpose, so it can run under plain Node for checks.
//
// Two-hop sending: when a relay is given a second relay (`via`), messages for it are sealed to
// its key and handed to the second relay, which passes them on. The first relay then never sees
// this phone's address, and the second never sees which queue a message is for.
//
// Files: the chunks of an encrypted file (lib/attachments.ts) go to the relay's file store, many
// requests on one connection (RelaySession). A contact on another relay takes them through its
// own relay (`via`), so the sender's relay never sees the contact's phone.
//
// Carried messages (lib/nearby.ts): a message sealed for a contact's relay, which a phone nearby
// hands to that relay once it reaches the internet, through its own relay (carryTo).
//
// Through Tor (setThroughTor, off by default): every request goes through the core's Tor
// (crates/erevos-tor) instead of the phone's own connection. There is no falling back to a direct
// connection: when Tor cannot reach the relay, the request fails.

import { relaySeal, tor } from './core';

const CREATE = 1;
const SEND = 2;
const RECEIVE = 3;
const DELETE = 4;
const KEY = 5;
const FORWARD = 6;
const SEALED_SEND = 7;
const FILE_PUT = 8;
const FILE_GET = 9;
const FILE_DELETE = 10;
const FILE_VIA = 11;
const CALL_RELAY = 12;
const WAIT = 13;

const OK = 0;
const NOT_FOUND = 1;
const FULL = 2;
const FAILED = 3;
const UNREACHABLE = 4;

// Same limit as the relay's MAX_MESSAGE.
const MAX_MESSAGE = 64 * 1024;
/** The largest chunk of a file the relay takes, as its MAX_CHUNK. */
export const MAX_CHUNK = 1024 * 1024;

// UTF-8 without TextEncoder, which not every JS runtime has.
function utf8Encode(text: string): Uint8Array {
  const binary = unescape(encodeURIComponent(text));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function utf8Decode(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return decodeURIComponent(escape(binary));
}

export type QueueIds = { recipientId: Uint8Array; senderId: Uint8Array };

/** Where the relay is. `token` is sent as a bearer token when the relay requires one. With
 *  `via`, messages for this relay go through that relay first (two-hop sending). */
// `fallback`: where a send goes next when this relay cannot take it (lib/spare.ts), each with the
// sender id there, or the same one when it has none. `backup`: this phone's backup relay, which
// sends to contacts go through when its own relay cannot be reached.
export type Relay = { url: string; token?: string; via?: Relay; key?: Uint8Array; fallback?: Fallback[]; backup?: Relay };
export type Fallback = { relay: Relay; senderId?: Uint8Array };

export class RelayError extends Error {
  /** The relay's status byte when it refused the request, such as NOT_FOUND. */
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.status = status;
  }
}

/** The relay could not be reached, or the connection to it ended before it answered. */
export class RelayUnreachableError extends RelayError {}

/**
 * Whether what failed may go later: the relay could not be reached, or said to try again later
 * (full, could not save it, or could not reach the next relay).
 */
export function canTryLater(error: unknown): boolean {
  if (error instanceof RelayUnreachableError) return true;
  return error instanceof RelayError && (error.status === FULL || error.status === FAILED || error.status === UNREACHABLE);
}

/** Whether the relay said the queue does not exist: it was deleted, or the relay lost it. */
export function isQueueNotFound(error: unknown): boolean {
  return error instanceof RelayError && error.status === NOT_FOUND;
}

/** Lowercase hex for an id or any other bytes. */
export function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** Parses a 48-character hex id. Throws if the text is not one. */
export function fromHex(hex: string): Uint8Array {
  const clean = hex.trim().toLowerCase();
  if (!/^[0-9a-f]{48}$/.test(clean)) throw new RelayError('An id is 48 hex characters.');
  const bytes = new Uint8Array(24);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  return bytes;
}

/** What the app sends through a queue: the sender's own relay sender id (so the
 *  recipient can answer) and the text. Empty `from` means the sender has no queue. */
export type Envelope = { from: string; text: string };

export function encodeEnvelope(from: string, text: string): Uint8Array {
  return utf8Encode(JSON.stringify({ from, text }));
}

export function decodeEnvelope(bytes: Uint8Array): Envelope | null {
  try {
    const value = JSON.parse(utf8Decode(bytes));
    return typeof value?.from === 'string' && typeof value?.text === 'string' ? value : null;
  } catch {
    return null;
  }
}

// React Native's WebSocket takes a third argument with request headers. The DOM typings do not.
type HeaderSocket = new (url: string, protocols: undefined, options: { headers: Record<string, string> }) => WebSocket;

const IN_REACT_NATIVE = typeof navigator !== 'undefined' && navigator.product === 'ReactNative';

/** A browser cannot set headers on a WebSocket, so there the token goes as a subprotocol, in
 * hex, next to the plain "erevos" one the relay answers with (crates/erevos-relay, serve_ws). */
export function tokenProtocols(token: string): string[] {
  const hex = Array.from(new TextEncoder().encode(token), (b) => b.toString(16).padStart(2, '0')).join('');
  return ['erevos', `erevos-token.${hex}`];
}

function connect(relay: Relay): WebSocket {
  const socket = !relay.token
    ? new WebSocket(relay.url)
    : IN_REACT_NATIVE
      ? new (WebSocket as unknown as HeaderSocket)(relay.url, undefined, {
          headers: { Authorization: `Bearer ${relay.token}` },
        })
      : new WebSocket(relay.url, tokenProtocols(relay.token));
  socket.binaryType = 'arraybuffer';
  return socket;
}

let throughTorOn = false;

/** Sends every relay request through Tor from now on, or no longer. */
export function setThroughTor(on: boolean): void {
  throughTorOn = on;
}

/** Whether relay requests go through Tor. */
export function throughTor(): boolean {
  return throughTorOn;
}

// The core's Tor says what failed in its own words: a RelayError, as a direct connection's failure is.
async function viaTor<T>(call: () => Promise<T>): Promise<T> {
  try {
    return await call();
  } catch (error) {
    throw new RelayUnreachableError(`Through Tor: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// A request ended from this side (`signal`) before its reply came.
class Ended extends Error {}

/** Opens a connection, sends one request, and returns the reply. Closes the connection, also when `signal` ends it. */
function request(relay: Relay, bytes: Uint8Array, signal?: AbortSignal): Promise<Uint8Array> {
  if (signal?.aborted) return Promise.reject(new Ended());
  if (throughTorOn) {
    const reply = viaTor(() => tor().torRequest(relay.url, relay.token ?? '', bytes));
    if (!signal) return reply;
    // Tor's request runs on until it ends; its reply is not waited for.
    return new Promise((resolve, reject) => {
      const end = () => reject(new Ended());
      signal.addEventListener('abort', end);
      reply.then(resolve, reject).finally(() => signal.removeEventListener('abort', end));
    });
  }
  return new Promise((resolve, reject) => {
    const socket = connect(relay);
    const end = () => {
      socket.close();
      reject(new Ended());
    };
    signal?.addEventListener('abort', end);
    const settled = () => signal?.removeEventListener('abort', end);
    socket.onopen = () => socket.send(bytes);
    socket.onmessage = (event) => {
      settled();
      socket.close();
      resolve(new Uint8Array(event.data as ArrayBuffer));
    };
    socket.onerror = () => {
      settled();
      reject(new RelayUnreachableError(`cannot reach the relay at ${relay.url}, or the token is wrong`));
    };
    socket.onclose = () => {
      settled();
      reject(new RelayUnreachableError('the relay closed the connection'));
    };
  });
}

function check(reply: Uint8Array, what: string): void {
  if (reply[0] === OK) return;
  if (reply[0] === NOT_FOUND) throw new RelayError(`${what}: queue not found`, NOT_FOUND);
  if (reply[0] === FULL) throw new RelayError(`${what}: queue is full`, FULL);
  if (reply[0] === FAILED) throw new RelayError(`${what}: the relay could not save it, try again later`, FAILED);
  if (reply[0] === UNREACHABLE)
    throw new RelayError(`${what}: the second relay could not reach your relay, try again later`, UNREACHABLE);
  throw new RelayError(`${what}: unexpected reply ${reply[0]}`, reply[0]);
}

/** Creates a queue. Keep the recipient id private; hand the sender id to whoever writes to you. */
export async function createQueue(relay: Relay): Promise<QueueIds> {
  const reply = await request(relay, Uint8Array.of(CREATE));
  check(reply, 'create');
  return { recipientId: reply.slice(1, 25), senderId: reply.slice(25, 49) };
}

// Relay keys by address, fetched once per run.
const keys = new Map<string, Uint8Array>();

/** The relay's key for sealed sends, or null if it has none. A key given with the relay (from a
 *  contact link) is used as it is, without asking that relay. */
export async function relayKey(relay: Relay): Promise<Uint8Array | null> {
  if (relay.key) return relay.key;
  const known = keys.get(relay.url);
  if (known) return known;
  const reply = await request(relay, Uint8Array.of(KEY));
  if (reply[0] === NOT_FOUND) return null;
  check(reply, 'key');
  if (reply.length !== 33) throw new RelayError('key: unexpected reply');
  const key = reply.slice(1);
  keys.set(relay.url, key);
  return key;
}

/** Hands a message sealed for the relay at `to` to the relay `via`, which passes it on. */
export async function forwardMessage(via: Relay, to: string, sealed: Uint8Array): Promise<void> {
  const address = utf8Encode(to);
  const bytes = new Uint8Array(1 + 2 + address.length + 4 + sealed.length);
  const view = new DataView(bytes.buffer);
  bytes[0] = FORWARD;
  view.setUint16(1, address.length);
  bytes.set(address, 3);
  view.setUint32(3 + address.length, sealed.length);
  bytes.set(sealed, 3 + address.length + 4);
  check(await request(via, bytes), 'send');
}

/**
 * Hands a message sealed for the relay at `url` (relaySeal) to that relay, for the phone that
 * carried it there (lib/nearby.ts): through our own relay, or the second one when set, as a
 * two-hop send, so the relay at `url` never sees this phone's address. True when the relay took
 * it, false when it never will: the queue is not there, or it was sealed for another key. Throws
 * when a relay could not be reached or could not keep it now: try again later.
 */
export async function carryTo(own: Relay, url: string, sealed: Uint8Array): Promise<boolean> {
  if (sealed.length > MAX_MESSAGE + 1024) return false;
  const first = own.via ?? own;
  try {
    if (sameRelay(first.url, url)) {
      const bytes = new Uint8Array(1 + 4 + sealed.length);
      bytes[0] = SEALED_SEND;
      new DataView(bytes.buffer).setUint32(1, sealed.length);
      bytes.set(sealed, 5);
      check(await request(first, bytes), 'send');
    } else {
      await forwardMessage(first, url.trim().replace(/\/+$/, ''), sealed);
    }
    return true;
  } catch (error) {
    if (isQueueNotFound(error)) return false;
    throw error;
  }
}

/** Queues one message, through the relay's `via` if it has one, or else where its `fallback` says,
 *  in turn. Throws, with what the relay first said, if none takes it: the sender id is unknown,
 *  the queue is full, or no relay can be reached. */
export async function sendMessage(relay: Relay, senderId: Uint8Array, message: Uint8Array): Promise<void> {
  if (message.length > MAX_MESSAGE) throw new RelayError('message is too large');
  try {
    await sendOne(relay, senderId, message);
  } catch (error) {
    for (const next of relay.fallback ?? []) {
      try {
        await sendOne(next.relay, next.senderId ?? senderId, message);
        return;
      } catch {
        // The next one, if any.
      }
    }
    throw error;
  }
}

async function sendOne(relay: Relay, senderId: Uint8Array, message: Uint8Array): Promise<void> {
  if (relay.via) {
    const key = await relayKey(relay);
    if (!key) throw new RelayError('your relay has no key for two-hop sending, so it was not sent through the second relay');
    await forwardMessage(relay.via, relay.url, await relaySeal(key, senderId, message));
    return;
  }
  const header = new Uint8Array(1 + 24 + 4);
  header[0] = SEND;
  header.set(senderId, 1);
  new DataView(header.buffer).setUint32(25, message.length);
  const bytes = new Uint8Array(header.length + message.length);
  bytes.set(header, 0);
  bytes.set(message, header.length);
  check(await request(relay, bytes), 'send');
}

/** Takes the oldest message from the queue, or returns null if it is empty. The relay then forgets it. */
export async function receiveMessage(relay: Relay, recipientId: Uint8Array): Promise<Uint8Array | null> {
  const bytes = new Uint8Array(1 + 24);
  bytes[0] = RECEIVE;
  bytes.set(recipientId, 1);
  const reply = await request(relay, bytes);
  check(reply, 'receive');
  if (reply[1] === 0) return null;
  const length = new DataView(reply.buffer, reply.byteOffset, reply.byteLength).getUint32(2);
  return reply.slice(6, 6 + length);
}

// Relays that cannot wait for a message (from before WAIT), by address, for this run.
const cannotWait = new Set<string>();

/** Whether the relay may be asked to wait for a message (`waitForMessage`), as far as this run knows. */
export function canWaitAt(relay: Relay): boolean {
  return !cannotWait.has(relay.url.trim().toLowerCase());
}

/**
 * Waits until a message is in the queue, `seconds` at most (60), without taking it: true once
 * one is, false when none came in that time, the wait was ended (`signal`), or the relay cannot
 * wait. A relay from before it closes the connection, as for any request it does not know: then
 * one that answers a plain request is not asked to wait again this run. Throws when the relay
 * cannot be reached.
 */
export async function waitForMessage(relay: Relay, recipientId: Uint8Array, seconds: number, signal?: AbortSignal): Promise<boolean> {
  const bytes = new Uint8Array(1 + 24 + 1);
  bytes[0] = WAIT;
  bytes.set(recipientId, 1);
  bytes[25] = Math.max(0, Math.min(60, Math.round(seconds)));
  let reply: Uint8Array;
  try {
    reply = await request(relay, bytes, signal);
  } catch (error) {
    if (error instanceof Ended) return false;
    if (!(error instanceof RelayUnreachableError) || signal?.aborted) throw error;
    // It answers a request any relay knows: it is there, and cannot wait.
    try {
      await request(relay, Uint8Array.of(KEY), signal);
    } catch (again) {
      if (again instanceof Ended) return false;
      throw error;
    }
    cannotWait.add(relay.url.trim().toLowerCase());
    return false;
  }
  check(reply, 'wait');
  return reply[1] === 1;
}

/** Deletes the queue. Later sends to it fail. */
export async function deleteQueue(relay: Relay, recipientId: Uint8Array): Promise<void> {
  const bytes = new Uint8Array(1 + 24);
  bytes[0] = DELETE;
  bytes.set(recipientId, 1);
  check(await request(relay, bytes), 'delete');
}

/** Relay addresses that differ only in case or a trailing slash are the same relay. */
export function sameRelay(a: string, b: string): boolean {
  const plain = (url: string) => url.trim().replace(/\/+$/, '').toLowerCase();
  return plain(a) === plain(b);
}

/** One connection to a relay for many requests, each answered before the next goes. */
export class RelaySession {
  private readonly socket: WebSocket | null;
  // The connection's handle in the core's Tor, when it goes through Tor.
  private readonly torId: Uint8Array | null;
  private waiting: ((reply: Uint8Array | RelayError) => void) | null = null;
  private last: Promise<unknown> = Promise.resolve();
  private ended: RelayError | null = null;

  private constructor(socket: WebSocket | null, torId: Uint8Array | null = null) {
    this.socket = socket;
    this.torId = torId;
    if (!socket) return;
    const answer = (reply: Uint8Array | RelayError) => {
      const waiting = this.waiting;
      this.waiting = null;
      waiting?.(reply);
    };
    socket.onmessage = (event) => answer(new Uint8Array(event.data as ArrayBuffer));
    socket.onerror = () => {
      this.ended ??= new RelayUnreachableError('lost the connection to the relay');
      answer(this.ended);
    };
    socket.onclose = () => {
      this.ended ??= new RelayUnreachableError('the relay closed the connection');
      answer(this.ended);
    };
  }

  static async open(relay: Relay): Promise<RelaySession> {
    if (throughTorOn) {
      const id = await viaTor(() => tor().torOpen(relay.url, relay.token ?? ''));
      return new RelaySession(null, id);
    }
    return new Promise((resolve, reject) => {
      const socket = connect(relay);
      socket.onopen = () => resolve(new RelaySession(socket));
      socket.onerror = () => reject(new RelayUnreachableError(`cannot reach the relay at ${relay.url}, or the token is wrong`));
      socket.onclose = () => reject(new RelayUnreachableError('the relay closed the connection'));
    });
  }

  /** Sends one request after the ones before it are answered, and returns its reply. */
  call(bytes: Uint8Array): Promise<Uint8Array> {
    const torId = this.torId;
    const reply = this.last.then(
      () =>
        torId
          ? this.ended
            ? Promise.reject(this.ended)
            : viaTor(() => tor().torCall(torId, bytes)).catch((error: RelayError) => {
                this.ended ??= error;
                throw error;
              })
          :
        new Promise<Uint8Array>((resolve, reject) => {
          if (this.ended) {
            reject(this.ended);
            return;
          }
          this.waiting = (answer) => (answer instanceof RelayError ? reject(answer) : resolve(answer));
          this.socket?.send(bytes);
        }),
    );
    this.last = reply.catch(() => undefined);
    return reply;
  }

  close(): void {
    this.ended ??= new RelayError('closed');
    if (this.torId) {
      const id = this.torId;
      tor()
        .torClose(id)
        .catch(() => undefined);
    } else this.socket?.close();
  }
}

function checkFile(reply: Uint8Array, what: string): void {
  if (reply[0] === OK) return;
  if (reply[0] === NOT_FOUND) throw new RelayError(`${what}: the file is not on the relay any more`, NOT_FOUND);
  if (reply[0] === FULL) throw new RelayError(`${what}: the relay has no room for files now, try again later`, FULL);
  if (reply[0] === FAILED) throw new RelayError(`${what}: the relay could not keep it, try again later`, FAILED);
  if (reply[0] === UNREACHABLE) throw new RelayError(`${what}: your relay could not reach the relay the file is on`, UNREACHABLE);
  throw new RelayError(`${what}: unexpected reply ${reply[0]}`, reply[0]);
}

// A relay from before files closes the connection at a file request.
function older(error: unknown): unknown {
  if (error instanceof RelayError && error.status === undefined) {
    return new RelayError(`${error.message}. A relay older than this app cannot take files: update it.`);
  }
  return error;
}

/** Puts one chunk of an encrypted file on the relay, and returns its id. */
export async function putChunk(session: RelaySession, chunk: Uint8Array): Promise<Uint8Array> {
  if (chunk.length > MAX_CHUNK) throw new RelayError('chunk is too large');
  const bytes = new Uint8Array(1 + 4 + chunk.length);
  bytes[0] = FILE_PUT;
  new DataView(bytes.buffer).setUint32(1, chunk.length);
  bytes.set(chunk, 5);
  const reply = await session.call(bytes).catch((error) => {
    throw older(error);
  });
  checkFile(reply, 'send');
  if (reply.length !== 25) throw new RelayError('send: unexpected reply');
  return reply.slice(1);
}

// A file request, through our relay to the relay at `via` when the chunk is there.
function fileRequest(op: number, id: Uint8Array, via?: string): Uint8Array {
  if (!via) return Uint8Array.of(op, ...id);
  const address = utf8Encode(via);
  const bytes = new Uint8Array(1 + 2 + address.length + 1 + id.length);
  bytes[0] = FILE_VIA;
  new DataView(bytes.buffer).setUint16(1, address.length);
  bytes.set(address, 3);
  bytes[3 + address.length] = op;
  bytes.set(id, 4 + address.length);
  return bytes;
}

/** Takes one chunk, from our relay or, with `via`, from that relay through ours. Null if it is gone. */
export async function getChunk(session: RelaySession, id: Uint8Array, via?: string): Promise<Uint8Array | null> {
  const reply = await session.call(fileRequest(FILE_GET, id, via)).catch((error) => {
    throw older(error);
  });
  if (reply[0] === NOT_FOUND) return null;
  checkFile(reply, 'receive');
  const length = reply.length >= 5 ? new DataView(reply.buffer, reply.byteOffset, reply.byteLength).getUint32(1) : -1;
  if (length !== reply.length - 5) throw new RelayError('receive: unexpected reply');
  return reply.slice(5);
}

/** Deletes one chunk, as `getChunk` finds it. False if it was gone already. */
export async function deleteChunk(session: RelaySession, id: Uint8Array, via?: string): Promise<boolean> {
  const reply = await session.call(fileRequest(FILE_DELETE, id, via));
  if (reply[0] === NOT_FOUND) return false;
  checkFile(reply, 'delete');
  return true;
}

/** A call relay (TURN server) and credentials for it, as WebRTC takes them. */
export type CallRelay = { urls: string[]; username: string; credential: string };

/** Credentials for the call relay beside the relay, or null if it has none. They last hours, so
 *  they are fetched for each call. */
export async function callRelay(relay: Relay): Promise<CallRelay | null> {
  const reply = await request(relay, Uint8Array.of(CALL_RELAY));
  if (reply[0] === NOT_FOUND) return null;
  check(reply, 'call relay');
  const view = new DataView(reply.buffer, reply.byteOffset, reply.byteLength);
  let at = 1;
  const short = () => {
    if (at + 2 > reply.length) throw new RelayError('call relay: unexpected reply');
    const length = view.getUint16(at);
    if (at + 2 + length > reply.length) throw new RelayError('call relay: unexpected reply');
    const text = utf8Decode(reply.slice(at + 2, at + 2 + length));
    at += 2 + length;
    return text;
  };
  const username = short();
  const credential = short();
  const count = reply[at++] ?? 0;
  const urls = Array.from({ length: count }, short).filter((url) => /^turns?:/.test(url));
  return urls.length > 0 ? { urls, username, credential } : null;
}
