// Client for the Erevos relay over WebSocket (ws:// or wss://). The relay holds
// one-way queues: a sender writes with its sender id, and the recipient reads
// with its recipient id. Each request is one binary message, and each reply is
// one binary message. The wire format is in crates/erevos-relay/src/server.rs.
// Self-contained on purpose, so it can run under plain Node for checks.

const CREATE = 1;
const SEND = 2;
const RECEIVE = 3;
const DELETE = 4;

const OK = 0;
const NOT_FOUND = 1;
const FULL = 2;
const FAILED = 3;

// Same limit as the relay's MAX_MESSAGE.
const MAX_MESSAGE = 64 * 1024;

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

/** Where the relay is. `token` is sent as a bearer token when the relay requires one. */
export type Relay = { url: string; token?: string };

export class RelayError extends Error {
  /** The relay's status byte when it refused the request, such as NOT_FOUND. */
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.status = status;
  }
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

/** Opens a connection, sends one request, and returns the reply. Closes the connection. */
function request(relay: Relay, bytes: Uint8Array): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const socket = relay.token
      ? new (WebSocket as unknown as HeaderSocket)(relay.url, undefined, {
          headers: { Authorization: `Bearer ${relay.token}` },
        })
      : new WebSocket(relay.url);
    socket.binaryType = 'arraybuffer';
    socket.onopen = () => socket.send(bytes);
    socket.onmessage = (event) => {
      socket.close();
      resolve(new Uint8Array(event.data as ArrayBuffer));
    };
    socket.onerror = () =>
      reject(new RelayError(`cannot reach the relay at ${relay.url}, or the token is wrong`));
    socket.onclose = () => reject(new RelayError('the relay closed the connection'));
  });
}

function check(reply: Uint8Array, what: string): void {
  if (reply[0] === OK) return;
  if (reply[0] === NOT_FOUND) throw new RelayError(`${what}: queue not found`, NOT_FOUND);
  if (reply[0] === FULL) throw new RelayError(`${what}: queue is full`, FULL);
  if (reply[0] === FAILED) throw new RelayError(`${what}: the relay could not save it, try again later`, FAILED);
  throw new RelayError(`${what}: unexpected reply ${reply[0]}`, reply[0]);
}

/** Creates a queue. Keep the recipient id private; hand the sender id to whoever writes to you. */
export async function createQueue(relay: Relay): Promise<QueueIds> {
  const reply = await request(relay, Uint8Array.of(CREATE));
  check(reply, 'create');
  return { recipientId: reply.slice(1, 25), senderId: reply.slice(25, 49) };
}

/** Queues one message. Throws if the sender id is unknown or the queue is full. */
export async function sendMessage(relay: Relay, senderId: Uint8Array, message: Uint8Array): Promise<void> {
  if (message.length > MAX_MESSAGE) throw new RelayError('message is too large');
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

/** Deletes the queue. Later sends to it fail. */
export async function deleteQueue(relay: Relay, recipientId: Uint8Array): Promise<void> {
  const bytes = new Uint8Array(1 + 24);
  bytes[0] = DELETE;
  bytes.set(recipientId, 1);
  check(await request(relay, bytes), 'delete');
}
