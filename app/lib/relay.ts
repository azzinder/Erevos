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
// Sent for later (sendMessageLater): a message sealed now is handed to the relay that would take it
// now, with the time it should go, and that relay sends it on then, so it goes though this phone is
// off by then. Until then this phone may take it back (dropLater).
//
// Lent places (crates/erevos-relay/src/lend.rs): a relay lends places to phones that have no relay
// of their own. Its phones put a ticket for one in their contact link (lendTicket); a phone with no
// relay that adds them takes a place with it (borrowPlace): a queue, and a lent token, which goes
// where the relay's token goes from then on. With a lent token the relay connects nowhere for this
// phone, so sends to contacts on other relays go straight to their /sealed path, and their files
// come straight from their /files path; it holds nothing for later and gives no call relay.
//
// Invites (crates/erevos-relay/src/invites.rs): a phone with a token of its own on a relay that
// invites makes an invite for one more phone (makeInvite), shown as a QR code (lib/relay-invite.ts).
// The phone that takes it makes a token for itself and gives the relay only its SHA-256 with the
// invite, on the /join path, which needs no token (redeemInvite): the relay adds a line for it to
// its file of tokens, and the token goes where the relay's token goes from then on. The inviter
// sees its invites (listInvites) and takes back one (takeBackInvite), which for one already used
// cuts that phone off.
//
// Signing in (crates/erevos-relay/src/signin.rs): a relay may let phones sign in with a provider,
// such as LPHL, for a token of their own (signInOffer). The browser signs in on the relay's pages,
// which then show a code; the phone claims the token on the /join path with the claim secret it
// made before and the code typed from the page (claimSignIn, lib/relay-signin.ts), giving the relay
// only the new token's SHA-256. The relay drops the sign-in after 5 wrong codes.
//
// Marks: a send may say what it carries (Mark), for a web app's notice while it is closed
// (lib/web-push.web.ts): a message someone reads, which the relay counts in the push, word between
// phones, which pushes nothing, or a call that rings, which pushes, counts as no message, and has
// the push say a call rang. The mark is one byte after the request; a relay from before
// marks reads no further than the request, and one that holds a message for later keeps the mark
// for when it goes. Without a mark the relay pushes, but says it could not count it, as for what
// another phone carried there (carryTo), which cannot know what it holds. A web app on
// the screen also says so when it takes its messages (receiveMessage): finding the queue empty
// then, the relay drops a push still waiting, which would tell of messages already read.
//
// Through Tor (setThroughTor, off by default): every request goes through the core's Tor
// (crates/erevos-tor) instead of the phone's own connection. There is no falling back to a direct
// connection: when Tor cannot reach the relay, the request fails.

import { relaySeal, tor } from './core';
import { randomBytes, sha256Bytes } from './crypto';
import { t } from './i18n';
import { isSignInPage } from './relay-signin';

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
const PUSH_KEY = 14;
const PUSH_SET = 15;
const LATER = 16;
const UNLATER = 17;
const FILE_KEEP = 18;
const LEND = 19;
const BORROW = 20;
const INVITE = 21;
const INVITES = 22;
const UNINVITE = 23;
const REDEEM = 24;
const SIGN_IN = 25;
const CLAIM = 26;
const NEWS = 27;

// The marks' bytes (crates/erevos-relay/src/server.rs).
const MARKS = { message: 1, quiet: 2, ring: 3 } as const;
const SHOWN = 1;

const OK = 0;
const NOT_FOUND = 1;
const FULL = 2;
const FAILED = 3;
const UNREACHABLE = 4;
// For a claim only: not the code the relay's page shows (crates/erevos-relay/src/server.rs).
const WRONG = 5;

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

/** The address is not one a connection can be opened to; what waits for it goes once it is fixed. */
export class BadRelayAddressError extends RelayUnreachableError {
  constructor(url: string) {
    super(`"${url}" is not a relay address. One looks like wss://relay.example.org or ws://192.168.1.10:7879.`);
  }
}

// ws:// or wss://, then a host (a name of dot-separated labels, or an IPv6 address in brackets), a
// port maybe, and a path maybe.
const LABEL = '[A-Za-z0-9_](?:[A-Za-z0-9_-]{0,61}[A-Za-z0-9_])?';
const RELAY_ADDRESS = new RegExp(`^wss?://(?:${LABEL}(?:\\.${LABEL})*|\\[([0-9A-Fa-f:.]+)\\])(?::(\\d{1,5}))?(?:/\\S*)?$`);
const IPV4_PART = /^(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/;

function isIpv6(text: string): boolean {
  const halves = text.split('::');
  if (halves.length > 2) return false;
  let groups = halves.flatMap((half) => (half === '' ? [] : half.split(':')));
  let count = groups.length;
  // The last group may be four numbers, which count as two groups.
  const last = groups[groups.length - 1];
  if (last?.includes('.')) {
    const parts = last.split('.');
    if (parts.length !== 4 || !parts.every((part) => IPV4_PART.test(part))) return false;
    groups = groups.slice(0, -1);
    count += 1;
  }
  if (!groups.every((group) => /^[0-9A-Fa-f]{1,4}$/.test(group))) return false;
  return halves.length === 2 ? count <= 7 : count === 8;
}

/**
 * Whether `url` is an address a relay connection can be opened to. Android's WebSocket stops the
 * whole app on an address it cannot read, such as the first letters of one being typed, so no other
 * is ever opened.
 */
export function isRelayAddress(url: string): boolean {
  const match = RELAY_ADDRESS.exec(url);
  if (!match) return false;
  const [, ipv6, port] = match;
  if (ipv6 !== undefined && !isIpv6(ipv6)) return false;
  return port === undefined || (Number(port) >= 1 && Number(port) <= 65535);
}

/**
 * Whether what failed may go later: the relay could not be reached, or said to try again later
 * (full, could not save it, or could not reach the next relay).
 */
export function canTryLater(error: unknown): boolean {
  if (error instanceof RelayUnreachableError) return true;
  return error instanceof RelayError && (error.status === FULL || error.status === FAILED || error.status === UNREACHABLE);
}

/** Whether the relay said the queue is full: as many wait there as it keeps for one, unread. */
export function isQueueFull(error: unknown): boolean {
  return error instanceof RelayError && error.status === FULL;
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
  if (!/^[0-9a-f]{48}$/.test(clean)) throw new RelayError(t('An id is 48 hex characters.'));
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
    throw new RelayUnreachableError(t('Through Tor: {reason}', { reason: error instanceof Error ? error.message : String(error) }));
  }
}

// A request ended from this side (`signal`) before its reply came.
class Ended extends Error {}

/** Opens a connection, sends one request, and returns the reply. Closes the connection, also when `signal` ends it. */
function request(relay: Relay, bytes: Uint8Array, signal?: AbortSignal): Promise<Uint8Array> {
  if (signal?.aborted) return Promise.reject(new Ended());
  if (!isRelayAddress(relay.url)) return Promise.reject(new BadRelayAddressError(relay.url));
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
      reject(new RelayUnreachableError(t('cannot reach the relay at {url}, or the token is wrong', { url: relay.url })));
    };
    socket.onclose = () => {
      settled();
      reject(new RelayUnreachableError(t('the relay closed the connection')));
    };
  });
}

function check(reply: Uint8Array, what: string): void {
  if (reply[0] === OK) return;
  if (reply[0] === NOT_FOUND) throw new RelayError(t('{what}: queue not found', { what }), NOT_FOUND);
  if (reply[0] === FULL) throw new RelayError(t('{what}: queue is full', { what }), FULL);
  if (reply[0] === FAILED) throw new RelayError(t('{what}: the relay could not save it, try again later', { what }), FAILED);
  if (reply[0] === UNREACHABLE)
    throw new RelayError(t('{what}: the second relay could not reach your relay, try again later', { what }), UNREACHABLE);
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

/** What a send carries: a message someone reads, word between phones, or a call that rings (see Marks above). */
export type Mark = keyof typeof MARKS;

// The request with its mark after it, if it has one.
function marked(bytes: Uint8Array, mark: Mark | undefined): Uint8Array {
  if (!mark) return bytes;
  const out = new Uint8Array(bytes.length + 1);
  out.set(bytes);
  out[bytes.length] = MARKS[mark];
  return out;
}

/** Hands a message sealed for the relay at `to` to the relay `via`, which passes it on. */
export async function forwardMessage(via: Relay, to: string, sealed: Uint8Array, mark?: Mark): Promise<void> {
  check(await request(via, marked(forwardRequest(to, sealed), mark)), 'send');
}

function sealedSendRequest(sealed: Uint8Array): Uint8Array {
  const bytes = new Uint8Array(1 + 4 + sealed.length);
  bytes[0] = SEALED_SEND;
  new DataView(bytes.buffer).setUint32(1, sealed.length);
  bytes.set(sealed, 5);
  return bytes;
}

function forwardRequest(to: string, sealed: Uint8Array): Uint8Array {
  const address = utf8Encode(to);
  const bytes = new Uint8Array(1 + 2 + address.length + 4 + sealed.length);
  const view = new DataView(bytes.buffer);
  bytes[0] = FORWARD;
  view.setUint16(1, address.length);
  bytes.set(address, 3);
  view.setUint32(3 + address.length, sealed.length);
  bytes.set(sealed, 3 + address.length + 4);
  return bytes;
}

/**
 * Hands a message sealed for the relay at `url` (relaySeal) to that relay, for the phone that
 * carried it there (lib/nearby.ts): through our own relay, or the second one when set, as a
 * two-hop send, so the relay at `url` never sees this phone's address. `mark` only for this
 * phone's own: one carried for another says nothing, as it cannot know. True when the relay took
 * it, false when it never will: the queue is not there, or it was sealed for another key. Throws
 * when a relay could not be reached or could not keep it now: try again later.
 */
export async function carryTo(own: Relay, url: string, sealed: Uint8Array, mark?: Mark): Promise<boolean> {
  if (sealed.length > MAX_MESSAGE + 1024) return false;
  const first = own.via ?? own;
  try {
    if (sameRelay(first.url, url)) check(await request(first, marked(sealedSendRequest(sealed), mark)), 'send');
    // A place lent on our relay cannot have it connect to theirs.
    else if (isLentToken(first.token)) check(await request(relayPath(url, '/sealed'), marked(sealedSendRequest(sealed), mark)), 'send');
    else await forwardMessage(first, url.trim().replace(/\/+$/, ''), sealed, mark);
    return true;
  } catch (error) {
    if (isQueueNotFound(error)) return false;
    throw error;
  }
}

/** Queues one message, through the relay's `via` if it has one, or else where its `fallback` says,
 *  in turn, with its `mark` if given. Throws, with what the relay first said, if none takes it: the
 *  sender id is unknown, the queue is full, or no relay can be reached. */
export async function sendMessage(relay: Relay, senderId: Uint8Array, message: Uint8Array, mark?: Mark): Promise<void> {
  if (message.length > MAX_MESSAGE) throw new RelayError(t('message is too large'));
  try {
    await sendOne(relay, senderId, message, mark);
  } catch (error) {
    for (const next of relay.fallback ?? []) {
      try {
        await sendOne(next.relay, next.senderId ?? senderId, message, mark);
        return;
      } catch {
        // The next one, if any.
      }
    }
    throw error;
  }
}

async function sendOne(relay: Relay, senderId: Uint8Array, message: Uint8Array, mark: Mark | undefined): Promise<void> {
  const { to, bytes } = await sendRequest(relay, senderId, message);
  check(await request(to, marked(bytes, mark)), 'send');
}

// The request that queues one message, and the relay it goes to: the second relay with the message
// sealed for this one, when it has one, or else this one. From a place lent on the second relay,
// which connects nowhere for it, the sealed message goes straight to this one's /sealed path.
async function sendRequest(relay: Relay, senderId: Uint8Array, message: Uint8Array): Promise<{ to: Relay; bytes: Uint8Array }> {
  if (relay.via) {
    const key = await relayKey(relay);
    if (!key) throw new RelayError(t('your relay has no key for two-hop sending, so it was not sent through the second relay'));
    const sealed = await relaySeal(key, senderId, message);
    if (isLentToken(relay.via.token)) return { to: relayPath(relay.url, '/sealed'), bytes: sealedSendRequest(sealed) };
    return { to: relay.via, bytes: forwardRequest(relay.url, sealed) };
  }
  const bytes = new Uint8Array(1 + 24 + 4 + message.length);
  bytes[0] = SEND;
  bytes.set(senderId, 1);
  new DataView(bytes.buffer).setUint32(25, message.length);
  bytes.set(message, 1 + 24 + 4);
  return { to: relay, bytes };
}

// Relays that can hold messages for later, or cannot (from before LATER), by address, for this run.
const holds = new Map<string, boolean>();

/**
 * Whether the relay can hold a message for later. A relay from before it closes the connection, as
 * for any request it does not know: then one that answers a plain request cannot, and is not asked
 * again this run. Throws when the relay cannot be reached.
 */
export async function canHoldAt(relay: Relay): Promise<boolean> {
  // A lent place holds nothing for later.
  if (isLentToken(relay.token)) return false;
  const address = relay.url.trim().toLowerCase();
  const known = holds.get(address);
  if (known !== undefined) return known;
  try {
    // Taking back one it never held: a relay that holds says it holds none.
    const reply = await request(relay, Uint8Array.of(UNLATER, ...randomBytes(16)));
    if (reply[0] !== NOT_FOUND) check(reply, 'later');
  } catch (error) {
    if (!(error instanceof RelayUnreachableError)) throw error;
    await request(relay, Uint8Array.of(KEY)).catch(() => {
      throw error;
    });
    holds.set(address, false);
    return false;
  }
  holds.set(address, true);
  return true;
}

// Unix seconds as 8 bytes at `at`, without BigInt.
function putSeconds(view: DataView, at: number, ms: number): void {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  view.setUint32(at, Math.floor(seconds / 2 ** 32));
  view.setUint32(at + 4, seconds % 2 ** 32);
}

/** A message held for later: its ids (hex, one for each packet, comma-separated) and the relay that holds it. */
export type HeldAt = { id: string; relay: string };

/** Thrown when no relay that would take a message can hold it for later. */
export class CannotHoldError extends RelayError {}

/**
 * Hands the packets of one message to the relay that would take them now, or else where its
 * `fallback` says, in turn, to go at `at` (milliseconds) in their order: they go then, though this
 * phone is off by then. Says which relay holds them, and the ids to take them back with. Throws,
 * with what the relay first said, if none takes them all: CannotHoldError when none of them can
 * hold any. What a relay took of them before it failed, it is asked to drop. The `mark` goes
 * after each packet's whole request (inside it, the relay would refuse it): a message is one,
 * so it goes with the last packet, and the ones before it are quiet.
 */
export async function sendMessageLater(relay: Relay, senderId: Uint8Array, messages: Uint8Array[], at: number, mark?: Mark): Promise<HeldAt> {
  if (messages.some((message) => message.length > MAX_MESSAGE)) throw new RelayError(t('message is too large'));
  let first: unknown = null;
  for (const route of [{ relay, senderId }, ...(relay.fallback ?? []).map((f) => ({ relay: f.relay, senderId: f.senderId ?? senderId }))]) {
    const ids: string[] = [];
    let holder: Relay | null = null;
    try {
      for (const [i, message] of messages.entries()) {
        const { to, bytes } = await sendRequest(route.relay, route.senderId, message);
        if (!(await canHoldAt(to))) throw new CannotHoldError(t('the relay at {url} cannot keep messages for later: update it', { url: to.url }));
        holder = to;
        const id = randomBytes(16);
        const held = new Uint8Array(1 + 8 + 16 + 4 + bytes.length);
        const view = new DataView(held.buffer);
        held[0] = LATER;
        putSeconds(view, 1, at);
        held.set(id, 9);
        view.setUint32(25, bytes.length);
        held.set(bytes, 29);
        check(await request(to, marked(held, mark === 'message' && i < messages.length - 1 ? 'quiet' : mark)), 'send');
        ids.push(toHex(id));
      }
      return { id: ids.join(','), relay: holder!.url };
    } catch (error) {
      first ??= error;
      if (holder) for (const id of ids) await dropLater(holder, id).catch(() => undefined);
    }
  }
  throw first;
}

/**
 * Takes back a message held for later by the relay `holder`: true when it did not go and now never
 * will, false when it went already (or is going now). Throws when the relay cannot be reached.
 */
export async function dropLater(holder: Relay, id: string): Promise<boolean> {
  let dropped = false;
  for (const one of id.split(',')) {
    if (!/^[0-9a-f]{32}$/.test(one)) throw new RelayError(t('message is not held'));
    const id = Uint8Array.from(one.match(/../g)!, (pair) => parseInt(pair, 16));
    const reply = await request(holder, Uint8Array.of(UNLATER, ...id));
    if (reply[0] === NOT_FOUND) continue;
    check(reply, 'delete');
    dropped = true;
  }
  return dropped;
}

// Whether the web app shows on the screen. Never on a phone, whose queues the relay does not push for.
function onScreen(): boolean {
  return typeof document !== 'undefined' && document.visibilityState === 'visible';
}

/**
 * Takes the oldest message from the queue, or returns null if it is empty. The relay then forgets
 * it. `shown`: taken on the screen (see Marks above).
 */
export async function receiveMessage(relay: Relay, recipientId: Uint8Array, shown = onScreen()): Promise<Uint8Array | null> {
  const bytes = new Uint8Array(1 + 24 + (shown ? 1 : 0));
  bytes[0] = RECEIVE;
  bytes.set(recipientId, 1);
  if (shown) bytes[25] = SHOWN;
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

/**
 * What came into a queue since its recipient last found it empty, as the relay counts it by what
 * each send said it carries (Mark): messages, sends that did not say, and rings; word between
 * phones counts nothing. `round` is new each time something comes into a queue found empty, and
 * 0 while nothing came since.
 */
export type News = { round: number; messages: number; unmarked: number; rings: number };

export const NO_NEWS: News = { round: 0, messages: 0, unmarked: 0, rings: 0 };

// Relays that cannot say what came (from before NEWS), by address, for this run.
const cannotTell = new Set<string>();

/** Whether the relay may be asked what came into a queue (`waitForNews`), as far as this run knows. */
export function canTellNewsAt(relay: Relay): boolean {
  return !cannotTell.has(relay.url.trim().toLowerCase());
}

/**
 * Waits until what came into the queue differs from `heard`, `seconds` at most (60), without
 * taking anything, and returns what came: `heard` again when nothing changed in that time or the
 * wait was ended (`signal`). Null when the relay cannot say: a relay from before it closes the
 * connection, as for any request it does not know, and then one that answers a plain request is
 * not asked again this run (waitForMessage may still wait there). Throws when the relay cannot be
 * reached.
 */
export async function waitForNews(relay: Relay, recipientId: Uint8Array, seconds: number, heard: News, signal?: AbortSignal): Promise<News | null> {
  const bytes = new Uint8Array(1 + 24 + 1 + 16);
  bytes[0] = NEWS;
  bytes.set(recipientId, 1);
  bytes[25] = Math.max(0, Math.min(60, Math.round(seconds)));
  const view = new DataView(bytes.buffer);
  [heard.round, heard.messages, heard.unmarked, heard.rings].forEach((n, i) => view.setUint32(26 + 4 * i, n >>> 0));
  let reply: Uint8Array;
  try {
    reply = await request(relay, bytes, signal);
  } catch (error) {
    if (error instanceof Ended) return heard;
    if (!(error instanceof RelayUnreachableError) || signal?.aborted) throw error;
    try {
      await request(relay, Uint8Array.of(KEY), signal);
    } catch (again) {
      if (again instanceof Ended) return heard;
      throw error;
    }
    cannotTell.add(relay.url.trim().toLowerCase());
    return null;
  }
  check(reply, 'news');
  if (reply.length < 17) throw new RelayError(`news: unexpected reply of ${reply.length} bytes`, reply[0]);
  const read = new DataView(reply.buffer, reply.byteOffset, reply.byteLength);
  return { round: read.getUint32(1), messages: read.getUint32(5), unmarked: read.getUint32(9), rings: read.getUint32(13) };
}

/** What `now` counts that `heard` did not: all of it when it is another round, or nothing was heard. */
export function newsSince(heard: News | null, now: News): Omit<News, 'round'> {
  const before = heard && heard.round === now.round ? heard : NO_NEWS;
  return {
    messages: Math.max(0, now.messages - before.messages),
    unmarked: Math.max(0, now.unmarked - before.unmarked),
    rings: Math.max(0, now.rings - before.rings),
  };
}

/**
 * A ticket for a place on the relay, for our contact link, or null if it lends none: it has no
 * key, lending is off, or it is from before lending (it closes the connection, as for any request
 * it does not know). None for a place lent to us. Throws when the relay cannot be reached.
 */
export async function lendTicket(relay: Relay): Promise<string | null> {
  if (isLentToken(relay.token)) return null;
  let reply: Uint8Array;
  try {
    reply = await request(relay, Uint8Array.of(LEND));
  } catch (error) {
    if (!(error instanceof RelayUnreachableError)) throw error;
    await request(relay, Uint8Array.of(KEY)).catch(() => {
      throw error;
    });
    return null;
  }
  if (reply[0] === NOT_FOUND) return null;
  check(reply, 'lend');
  const ticket = utf8Decode(reply.slice(1));
  if (!isTicket(ticket)) throw new RelayError('lend: unexpected reply');
  return ticket;
}

/**
 * Takes a place on the relay at `url` with a ticket from a contact's link: our queue there, and
 * the lent token to use it with from now on, where the relay's token goes. Throws when the ticket
 * gave all its places (FULL), or the relay cannot be reached or does not take it (expired, or the
 * relay has a new key).
 */
export async function borrowPlace(url: string, ticket: string): Promise<{ queue: QueueIds; token: string }> {
  const reply = await request({ url, token: ticket }, Uint8Array.of(BORROW));
  if (reply[0] === FULL) throw new RelayError(t('the link has given all its places on its relay. Ask them for a new link'), FULL);
  check(reply, 'borrow');
  const token = utf8Decode(reply.slice(49));
  if (!isLentToken(token)) throw new RelayError('borrow: unexpected reply');
  return { queue: { recipientId: reply.slice(1, 25), senderId: reply.slice(25, 49) }, token };
}

/** The longest name an invite may carry, bytes of UTF-8, as the relay's MAX_TYPED. */
const MAX_INVITE_NAME = 64;

/** An invite as its inviter sees it: `id` (hex) to take it back with, the name on the line it
 *  gives, when it expires, and when it was used (milliseconds; 0 while it was not). */
export type InviteListed = { id: string; name: string; expires: number; used: number };

// Unix seconds as 8 bytes at `at`, in milliseconds, without BigInt.
function secondsAt(view: DataView, at: number): number {
  return (view.getUint32(at) * 2 ** 32 + view.getUint32(at + 4)) * 1000;
}

/**
 * An invite for one more phone, named `name` (cut to what the relay takes), with the relay's token
 * of this phone's own: its secret (64 hex characters) and when it expires (milliseconds). Null when
 * this phone cannot invite here: the relay does not invite, the token is not one of its own, or the
 * relay is from before invites (it closes the connection, as for any request it does not know).
 * Throws when the phone made all the invites it may for now, or the relay let in all the phones it
 * lets in by invite (FULL), or the relay cannot be reached.
 */
export async function makeInvite(relay: Relay, name: string): Promise<{ code: string; expires: number } | null> {
  let letters = Array.from(name.trim());
  while (utf8Encode(letters.join('')).length > MAX_INVITE_NAME) letters = letters.slice(0, -1);
  const bytes = utf8Encode(letters.join(''));
  let reply: Uint8Array;
  try {
    reply = await request(relay, Uint8Array.of(INVITE, bytes.length, ...bytes));
  } catch (error) {
    if (await fromBefore(relay, error)) return null;
    throw error;
  }
  if (reply[0] === NOT_FOUND) return null;
  if (reply[0] === FULL) throw new RelayError(t('No invite now: you may have 5 waiting at once and make 10 a day, and this relay lets in only so many phones by invite.'), FULL);
  check(reply, 'invite');
  const code = utf8Decode(reply.slice(9));
  if (reply.length < 9 || !/^[0-9a-f]{64}$/.test(code)) throw new RelayError('invite: unexpected reply');
  return { code, expires: secondsAt(new DataView(reply.buffer, reply.byteOffset, reply.byteLength), 1) };
}

/**
 * This phone's invites on the relay, the oldest first: those waiting and those used whose phone is
 * still let in. Null when this phone cannot invite here, as for makeInvite.
 */
export async function listInvites(relay: Relay): Promise<InviteListed[] | null> {
  let reply: Uint8Array;
  try {
    reply = await request(relay, Uint8Array.of(INVITES));
  } catch (error) {
    if (await fromBefore(relay, error)) return null;
    throw error;
  }
  if (reply[0] === NOT_FOUND) return null;
  check(reply, 'invites');
  const view = new DataView(reply.buffer, reply.byteOffset, reply.byteLength);
  const unexpected = () => new RelayError('invites: unexpected reply');
  if (reply.length < 3) throw unexpected();
  const count = view.getUint16(1);
  const listed: InviteListed[] = [];
  let at = 3;
  for (let i = 0; i < count; i++) {
    if (at + 33 > reply.length) throw unexpected();
    const length = reply[at + 32];
    if (at + 33 + length > reply.length) throw unexpected();
    listed.push({
      id: toHex(reply.slice(at, at + 16)),
      expires: secondsAt(view, at + 16),
      used: secondsAt(view, at + 24),
      name: utf8Decode(reply.slice(at + 33, at + 33 + length)),
    });
    at += 33 + length;
  }
  return listed;
}

/** Takes back one of this phone's invites: one used cuts its phone off. False when the relay has no
 *  such invite of this phone's (it expired, or was taken back already). */
export async function takeBackInvite(relay: Relay, id: string): Promise<boolean> {
  if (!/^[0-9a-f]{32}$/.test(id)) return false;
  const reply = await request(relay, Uint8Array.of(UNINVITE, ...id.match(/../g)!.map((pair) => parseInt(pair, 16))));
  if (reply[0] === NOT_FOUND) return false;
  check(reply, 'invite');
  return true;
}

// The token made for each invite taken, or sign-in claimed, here while Erevos runs, so taking one
// again after the answer was lost gives the same token, which the relay answers again.
const madeFor = new Map<string, string>();

/** A token of this phone's own, as `erevos-relay new-token` makes one: 64 hex characters. */
export function newPhoneToken(): string {
  return toHex(randomBytes(32));
}

/**
 * Takes the invite `code` (64 hex characters) on the relay at `url`: makes a token of this phone's
 * own and has the relay add a line for it, from the /join path, which needs no token. Returns the
 * token, for where the relay's token goes, and the name on its line there. Throws when the invite
 * is no longer good (NOT_FOUND), another phone took it (FULL), or the relay cannot be reached.
 */
export async function redeemInvite(url: string, code: string): Promise<{ token: string; name: string }> {
  if (!/^[0-9a-f]{64}$/.test(code)) throw new RelayError(t('That is not an invite to a relay.'));
  const token = madeFor.get(code) ?? newPhoneToken();
  madeFor.set(code, token);
  const secret = Uint8Array.from(code.match(/../g)!, (pair) => parseInt(pair, 16));
  const reply = await request(relayPath(url, '/join'), Uint8Array.of(REDEEM, ...secret, ...sha256Bytes(utf8Encode(token))));
  if (reply[0] === NOT_FOUND) throw new RelayError(t('The invite is no longer good: it lasts 7 days, for one phone, and can be taken back. Ask for a new one.'), NOT_FOUND);
  if (reply[0] === FULL) throw new RelayError(t('Another phone took this invite already. Ask for a new one.'), FULL);
  check(reply, 'invite');
  madeFor.delete(code);
  return { token, name: utf8Decode(reply.slice(1)) };
}

/**
 * Whether the relay at `url` lets phones sign in with a provider for a token of their own: the
 * provider's name, and the page the browser opens to sign in. Null when it does not, is from
 * before signing in, or cannot be reached now. Asked on the /join path, which needs no token.
 * The page must be an https:// one on the relay's own host (lib/relay-signin.ts, isSignInPage).
 */
export async function signInOffer(url: string): Promise<{ name: string; start: string } | null> {
  let reply: Uint8Array;
  try {
    reply = await request(relayPath(url, '/join'), Uint8Array.of(SIGN_IN));
  } catch {
    return null;
  }
  if (reply[0] !== OK || reply.length < 4) return null;
  const at = 2 + reply[1];
  const name = utf8Decode(reply.slice(2, at));
  const start = utf8Decode(reply.slice(at + 2, at + 2 + ((reply[at] << 8) | reply[at + 1])));
  if (!name.trim() || !isSignInPage(url, start)) return null;
  return { name, start };
}

/**
 * Claims, on the relay at `url`, what was signed in in the browser with the claim secret `claim`
 * (64 hex characters) and the six digits `code` the relay's page showed: makes a token of this
 * phone's own and has the relay add a line for it, in place of the line of `oldToken`, this phone's
 * token before on that relay (lib/relay-signin.ts, oldToken), when that line is the same account's.
 * Returns the token and the name on its line; `wrong` with the tries left when the code is not the
 * page's, the sign-in being over at none; null when nothing was signed in with that secret yet, or
 * `code` is not six digits. Throws when the account has all the phones it may there (FULL), or the
 * relay cannot be reached.
 */
export async function claimSignIn(
  url: string,
  claim: string,
  code: string,
  oldToken = '',
): Promise<{ token: string; name: string } | { wrong: number } | null> {
  const digits = code.replace(/\s/g, '');
  if (!/^[0-9a-f]{64}$/.test(claim) || !/^\d{6}$/.test(digits)) return null;
  const token = madeFor.get(claim) ?? newPhoneToken();
  madeFor.set(claim, token);
  const old = oldToken.trim() && !isLentToken(oldToken) ? sha256Bytes(utf8Encode(oldToken.trim())) : new Uint8Array(32);
  const secret = Uint8Array.from(claim.match(/../g)!, (pair) => parseInt(pair, 16));
  const reply = await request(
    relayPath(url, '/join'),
    Uint8Array.of(CLAIM, ...secret, ...sha256Bytes(utf8Encode(token)), ...old, ...utf8Encode(digits)),
  );
  if (reply[0] === NOT_FOUND) return null;
  if (reply[0] === WRONG && reply.length === 2) return { wrong: reply[1] };
  if (reply[0] === FULL) throw new RelayError(t('This account is signed in on all the phones it may be on this relay. Ask whoever runs it to take one off.'), FULL);
  check(reply, 'claim');
  madeFor.delete(claim);
  return { token, name: utf8Decode(reply.slice(1)) };
}

// A relay from before a request closes the connection, as for any it does not know: then one that
// answers a plain request is from before it. Throws what failed when that relay cannot be reached.
async function fromBefore(relay: Relay, error: unknown): Promise<boolean> {
  if (!(error instanceof RelayUnreachableError)) return false;
  await request(relay, Uint8Array.of(KEY)).catch(() => {
    throw error;
  });
  return true;
}

/** Deletes the queue. Later sends to it fail. */
export async function deleteQueue(relay: Relay, recipientId: Uint8Array): Promise<void> {
  const bytes = new Uint8Array(1 + 24);
  bytes[0] = DELETE;
  bytes.set(recipientId, 1);
  check(await request(relay, bytes), 'delete');
}

/** Whether `token` is a lent token, for a place lent on a relay, rather than the relay's own token:
 *  `lent.` and, in hex, its ticket's nonce, its own nonce and its code (crates/erevos-relay lend.rs). */
export function isLentToken(token: string | undefined): boolean {
  return !!token && /^lent\.[0-9a-f]{96}$/.test(token.trim());
}

/** Whether `text` is a ticket for a place on a relay, as a contact link carries. */
export function isTicket(text: string): boolean {
  return /^ticket\.[0-9a-f]{80}$/.test(text);
}

/** When a ticket expires, in milliseconds. */
export function ticketExpires(ticket: string): number {
  return parseInt(ticket.slice(7, 23), 16) * 1000;
}

/** The path of the relay at `url` that other relays use: `/sealed` for sealed sends, `/files` for files; and `/join`, where a
 *  phone takes an invite. No token. */
export function relayPath(url: string, path: '/sealed' | '/files' | '/join'): Relay {
  return { url: `${url.trim().replace(/\/+$/, '')}${path}` };
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
      this.ended ??= new RelayUnreachableError(t('lost the connection to the relay'));
      answer(this.ended);
    };
    socket.onclose = () => {
      this.ended ??= new RelayUnreachableError(t('the relay closed the connection'));
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
      socket.onerror = () => reject(new RelayUnreachableError(t('cannot reach the relay at {url}, or the token is wrong', { url: relay.url })));
      socket.onclose = () => reject(new RelayUnreachableError(t('the relay closed the connection')));
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

/**
 * Queues messages one after another as `sendMessage` does, each with its `mark`, those for one
 * relay on one connection (RelaySession), until `close`: the copies of what a chat sealed for the
 * endpoints of a contact's account, which go to the same few relays (lib/fanout.ts). One through a
 * second relay (`via`), or one a connection could not take, goes as `sendMessage` sends it, with
 * its fallbacks.
 */
export class RelaySends {
  private readonly sessions = new Map<string, Promise<RelaySession | null>>();

  async send(relay: Relay, senderId: Uint8Array, message: Uint8Array, mark?: Mark): Promise<void> {
    if (relay.via || message.length > MAX_MESSAGE) return sendMessage(relay, senderId, message, mark);
    const key = `${relay.url}\n${relay.token ?? ''}`;
    let opened = this.sessions.get(key);
    if (!opened) {
      opened = RelaySession.open(relay).catch(() => null);
      this.sessions.set(key, opened);
    }
    const session = await opened;
    if (session) {
      try {
        const { bytes } = await sendRequest(relay, senderId, message);
        check(await session.call(marked(bytes, mark)), 'send');
        return;
      } catch (error) {
        // What the relay answered stands, unless there is somewhere else to try; a connection
        // lost is opened again for the next.
        if (error instanceof RelayUnreachableError) this.sessions.delete(key);
        else if (!relay.fallback?.length) throw error;
      }
    }
    return sendMessage(relay, senderId, message, mark);
  }

  close(): void {
    for (const opened of this.sessions.values()) void opened.then((session) => session?.close());
    this.sessions.clear();
  }
}

function checkFile(reply: Uint8Array, what: string): void {
  if (reply[0] === OK) return;
  if (reply[0] === NOT_FOUND) throw new RelayError(t('{what}: the file is not on the relay any more', { what }), NOT_FOUND);
  if (reply[0] === FULL) throw new RelayError(t('{what}: the relay has no room for files now, try again later', { what }), FULL);
  if (reply[0] === FAILED) throw new RelayError(t('{what}: the relay could not keep it, try again later', { what }), FAILED);
  if (reply[0] === UNREACHABLE) throw new RelayError(t('{what}: your relay could not reach the relay the file is on', { what }), UNREACHABLE);
  throw new RelayError(`${what}: unexpected reply ${reply[0]}`, reply[0]);
}

// A relay from before files closes the connection at a file request.
function older(error: unknown): unknown {
  if (error instanceof RelayError && error.status === undefined) {
    return new RelayError(t('{reason}. A relay older than this app cannot take files: update it.', { reason: error.message }));
  }
  return error;
}

/**
 * Puts one chunk of an encrypted file on the relay, and returns its id. With `from` (milliseconds),
 * for a file in a message sent for later, its time on the relay starts then instead of now.
 */
export async function putChunk(session: RelaySession, chunk: Uint8Array, from = 0): Promise<Uint8Array> {
  if (chunk.length > MAX_CHUNK) throw new RelayError('chunk is too large');
  const head = from > 0 ? 9 : 1;
  const bytes = new Uint8Array(head + 4 + chunk.length);
  bytes[0] = from > 0 ? FILE_KEEP : FILE_PUT;
  if (from > 0) putSeconds(new DataView(bytes.buffer), 1, from);
  new DataView(bytes.buffer).setUint32(head, chunk.length);
  bytes.set(chunk, head + 4);
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
  // A lent place gets none.
  if (isLentToken(relay.token)) return null;
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

/** The relay's key for Web Push, or null if it does not push (an older relay closes the
 *  connection at an opcode it does not know, which is the same answer). */
export async function pushKey(relay: Relay): Promise<Uint8Array | null> {
  let reply: Uint8Array;
  try {
    reply = await request(relay, Uint8Array.of(PUSH_KEY));
  } catch (error) {
    if (error instanceof RelayUnreachableError) return null;
    throw error;
  }
  if (reply[0] === NOT_FOUND) return null;
  check(reply, 'push key');
  return reply.slice(1);
}

/** A browser's keys for its push address (PushSubscription.getKey): its P-256 key, 65 bytes, and
 *  its authentication secret, 16 bytes. */
export type PushKeys = { p256dh: Uint8Array; auth: Uint8Array };

/** Asks the relay for a push to `endpoint` whenever a message comes into the queue, or for none
 *  when `endpoint` is empty. With the browser's `keys`, a relay that counts puts in each push how
 *  many messages came, encrypted for the browser: true when it said it will. An older relay takes
 *  the address alone, and its pushes are empty. */
export async function setPush(relay: Relay, recipientId: Uint8Array, endpoint: string, keys?: PushKeys): Promise<boolean> {
  const address = utf8Encode(endpoint);
  const sent = keys && endpoint ? keys.p256dh.length + keys.auth.length : 0;
  const bytes = new Uint8Array(1 + 24 + 2 + address.length + sent);
  bytes[0] = PUSH_SET;
  bytes.set(recipientId, 1);
  new DataView(bytes.buffer).setUint16(25, address.length);
  bytes.set(address, 27);
  if (keys && sent) {
    bytes.set(keys.p256dh, 27 + address.length);
    bytes.set(keys.auth, 27 + address.length + keys.p256dh.length);
  }
  const reply = await request(relay, bytes);
  check(reply, 'push');
  return sent > 0 && reply[1] === 1;
}
