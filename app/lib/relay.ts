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

// Same limit as the relay's MAX_MESSAGE.
const MAX_MESSAGE = 64 * 1024;

export type QueueIds = { recipientId: Uint8Array; senderId: Uint8Array };

export class RelayError extends Error {}

/** Opens a connection, sends one request, and returns the reply. Closes the connection. */
function request(url: string, bytes: Uint8Array): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(url);
    socket.binaryType = 'arraybuffer';
    socket.onopen = () => socket.send(bytes);
    socket.onmessage = (event) => {
      socket.close();
      resolve(new Uint8Array(event.data as ArrayBuffer));
    };
    socket.onerror = () => reject(new RelayError(`cannot reach the relay at ${url}`));
    socket.onclose = () => reject(new RelayError('the relay closed the connection'));
  });
}

function check(reply: Uint8Array, what: string): void {
  if (reply[0] === OK) return;
  if (reply[0] === NOT_FOUND) throw new RelayError(`${what}: queue not found`);
  if (reply[0] === FULL) throw new RelayError(`${what}: queue is full`);
  throw new RelayError(`${what}: unexpected reply ${reply[0]}`);
}

/** Creates a queue. Keep the recipient id private; hand the sender id to whoever writes to you. */
export async function createQueue(url: string): Promise<QueueIds> {
  const reply = await request(url, Uint8Array.of(CREATE));
  check(reply, 'create');
  return { recipientId: reply.slice(1, 25), senderId: reply.slice(25, 49) };
}

/** Queues one message. Throws if the sender id is unknown or the queue is full. */
export async function sendMessage(url: string, senderId: Uint8Array, message: Uint8Array): Promise<void> {
  if (message.length > MAX_MESSAGE) throw new RelayError('message is too large');
  const header = new Uint8Array(1 + 24 + 4);
  header[0] = SEND;
  header.set(senderId, 1);
  new DataView(header.buffer).setUint32(25, message.length);
  const bytes = new Uint8Array(header.length + message.length);
  bytes.set(header, 0);
  bytes.set(message, header.length);
  check(await request(url, bytes), 'send');
}

/** Takes the oldest message from the queue, or returns null if it is empty. The relay then forgets it. */
export async function receiveMessage(url: string, recipientId: Uint8Array): Promise<Uint8Array | null> {
  const bytes = new Uint8Array(1 + 24);
  bytes[0] = RECEIVE;
  bytes.set(recipientId, 1);
  const reply = await request(url, bytes);
  check(reply, 'receive');
  if (reply[1] === 0) return null;
  const length = new DataView(reply.buffer, reply.byteOffset, reply.byteLength).getUint32(2);
  return reply.slice(6, 6 + length);
}

/** Deletes the queue. Later sends to it fail. */
export async function deleteQueue(url: string, recipientId: Uint8Array): Promise<void> {
  const bytes = new Uint8Array(1 + 24);
  bytes[0] = DELETE;
  bytes.set(recipientId, 1);
  check(await request(url, bytes), 'delete');
}
