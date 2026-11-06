// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

/**
 * The account's own devices on the same Wi-Fi or hotspot handing each other the chunks of large
 * files (the Collection's, up to 4 GB), fast: a TCP connection of its own, apart from the links of
 * lan.js, whose frames of 16 KB go through the app. The phone's side is the same, in
 * app/modules/erevos-radio (ChunkChannel.kt). docs/sync.md, phase S3.
 *
 * - A device that has chunks to give listens on a port of its own, and tells each linked device,
 *   inside their end-to-end encrypted link, where (its addresses, the port) and a key of 32 random
 *   bytes for that device alone, and which files that key may take.
 * - On connecting, the device giving says `EVC1` and a challenge of 16 random bytes; the one taking
 *   answers `EVC1`, HMAC-SHA256(key, "EVC1 client" ‖ challenge) and a challenge of its own; the one
 *   giving answers HMAC-SHA256(key, "EVC1 server" ‖ its challenge ‖ the first). Who holds no key
 *   is cut off before anything else, and each side knows the other holds it.
 * - Then each ask is 1 byte (1), the file's id (16 bytes) and the chunk's number (4 bytes, big
 *   endian); each answer the chunk's length (4 bytes) and the chunk as it is kept, already
 *   encrypted with the file's own key; length 0 when it is not here or not that key's to take.
 * - The one taking opens each chunk with the file's key before keeping it (its tag, and its place
 *   in the file), and keeps it under its name only once it opened: one cut short or changed on the
 *   way is never kept. A transfer cut off goes on later from the chunk that was missing.
 *
 * What someone else on the network sees: that two devices talk, and the random names of chunks.
 */

const crypto = require('node:crypto');
const fs = require('node:fs');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');

const MAGIC = Buffer.from('EVC1', 'latin1');
const ASK = 1;
const MOST_CHUNK = 1024 * 1024;
const CHUNK_SIZES = [64 * 1024, 256 * 1024, 1024 * 1024];
const HELLO_WITHIN = 5000;
const IDLE = 30_000;
const MOST_TAKERS = 8;
const ID = /^[0-9a-f]{32}$/;
const KEY = /^[0-9a-f]{64}$/;

const mac = (key, ...parts) => crypto.createHmac('sha256', key).update(Buffer.concat(parts)).digest();
const chunkName = (id, n) => `erevos-file-${id}-${n}`;

/** Reads exactly what comes on a socket, a given number of bytes at a time. */
function reader(socket) {
  let held = Buffer.alloc(0);
  let want = null;
  let ended = false;
  socket.on('data', (data) => {
    held = Buffer.concat([held, data]);
    pump();
  });
  const end = () => {
    ended = true;
    pump();
  };
  socket.on('close', end);
  socket.on('error', end);
  function pump() {
    if (!want) return;
    if (held.length >= want.n) {
      const out = held.subarray(0, want.n);
      held = held.subarray(want.n);
      const { done } = want;
      want = null;
      done(Buffer.from(out));
    } else if (ended) {
      const { fail } = want;
      want = null;
      fail(new Error('cut off'));
    }
  }
  return (n) =>
    new Promise((done, fail) => {
      want = { n, done, fail };
      pump();
    });
}

/** This computer's IPv4 addresses on its networks, for the devices to reach it at. */
function addresses() {
  const out = [];
  for (const list of Object.values(os.networkInterfaces())) for (const a of list ?? []) if (a.family === 'IPv4' && !a.internal) out.push(a.address);
  return out;
}

/** Gives chunks from `folder` (the app's files) to the devices holding a key it was given. */
class ChunkServer {
  constructor({ folder, port = 0, onLog = () => {} }) {
    Object.assign(this, { folder, port, onLog });
    // key hex → the file ids that key may take.
    this.keys = new Map();
    this.takers = new Set();
  }

  /** Listens, once; answers the port it listens on. */
  start() {
    if (this.server) return Promise.resolve(this.server.address().port);
    return new Promise((done, fail) => {
      this.server = net.createServer((socket) => this.taker(socket));
      this.server.on('error', (error) => {
        this.onLog(`Chunks: ${error.message}`);
        fail(error);
      });
      this.server.listen(this.port, () => done(this.server.address().port));
    });
  }

  stop() {
    this.server?.close();
    this.server = null;
    for (const socket of this.takers) socket.destroy();
    this.takers.clear();
    this.keys.clear();
  }

  /** Lets `key` (hex) take the chunks of the files `ids` from now on, in place of what it could before. */
  allow(key, ids) {
    if (!KEY.test(key)) return;
    this.keys.set(key, new Set(ids.filter((id) => ID.test(id))));
  }

  /** `key` takes nothing more, and its connections are cut. */
  forget(key) {
    this.keys.delete(key);
    for (const socket of this.takers) if (socket.erevosKey === key) socket.destroy();
  }

  async taker(socket) {
    if (this.takers.size >= MOST_TAKERS) return socket.destroy();
    this.takers.add(socket);
    socket.on('close', () => this.takers.delete(socket));
    socket.on('error', () => undefined);
    socket.setNoDelay(true);
    socket.setTimeout(HELLO_WITHIN, () => socket.destroy());
    const read = reader(socket);
    try {
      const challenge = crypto.randomBytes(16);
      socket.write(Buffer.concat([MAGIC, challenge]));
      const hello = await read(4 + 32 + 16);
      if (!hello.subarray(0, 4).equals(MAGIC)) return socket.destroy();
      const proof = hello.subarray(4, 36);
      const theirs = hello.subarray(36);
      let key = null;
      for (const k of this.keys.keys()) {
        if (crypto.timingSafeEqual(mac(Buffer.from(k, 'hex'), Buffer.from('EVC1 client'), challenge), proof)) key = k;
      }
      if (!key) return socket.destroy();
      socket.erevosKey = key;
      socket.write(mac(Buffer.from(key, 'hex'), Buffer.from('EVC1 server'), theirs, challenge));
      socket.setTimeout(IDLE, () => socket.destroy());
      for (;;) {
        const ask = await read(1 + 16 + 4);
        if (ask[0] !== ASK) return socket.destroy();
        const id = ask.subarray(1, 17).toString('hex');
        const n = ask.readUInt32BE(17);
        const allowed = this.keys.get(key);
        let chunk = null;
        if (allowed?.has(id)) {
          try {
            chunk = fs.readFileSync(path.join(this.folder, chunkName(id, n)));
          } catch {
            chunk = null;
          }
        }
        if (chunk && (chunk.length === 0 || chunk.length > MOST_CHUNK)) chunk = null;
        const head = Buffer.alloc(4);
        head.writeUInt32BE(chunk ? chunk.length : 0);
        socket.write(chunk ? Buffer.concat([head, chunk]) : head);
      }
    } catch {
      socket.destroy();
    }
  }
}

/** Whether `sealed` is the `n`th chunk of the file with `fileKey`, whole: as lib/attachments.ts openChunk. */
function opens(fileKey, n, sealed, size) {
  if (sealed.length !== size || size < 12 + 16 + 8) return false;
  try {
    const decipher = crypto.createDecipheriv('aes-256-gcm', fileKey, sealed.subarray(0, 12));
    decipher.setAuthTag(sealed.subarray(sealed.length - 16));
    const plain = Buffer.concat([decipher.update(sealed.subarray(12, sealed.length - 16)), decipher.final()]);
    return plain.readUInt32BE(0) === n && plain.readUInt32BE(4) <= plain.length - 8;
  } catch {
    return false;
  }
}

/** One connection to a device that gives chunks, once both showed they hold the key. */
class ChunkTaker {
  /** Connects to the first of `hosts` that answers at `port`, with `key` (hex). Throws when none does, or it holds another key. */
  static async open(hosts, port, key) {
    let last = new Error('no address');
    for (const host of hosts) {
      try {
        return await ChunkTaker.openAt(host, port, Buffer.from(key, 'hex'));
      } catch (error) {
        last = error;
      }
    }
    throw last;
  }

  static openAt(host, port, key) {
    return new Promise((done, fail) => {
      const socket = net.connect({ host, port, timeout: HELLO_WITHIN });
      socket.setNoDelay(true);
      socket.on('timeout', () => socket.destroy(new Error('timed out')));
      socket.on('error', (error) => fail(error));
      const read = reader(socket);
      (async () => {
        const hello = await read(4 + 16);
        if (!hello.subarray(0, 4).equals(MAGIC)) throw new Error('not chunks');
        const challenge = hello.subarray(4);
        const mine = crypto.randomBytes(16);
        socket.write(Buffer.concat([MAGIC, mac(key, Buffer.from('EVC1 client'), challenge), mine]));
        const answer = await read(32);
        if (!crypto.timingSafeEqual(answer, mac(key, Buffer.from('EVC1 server'), mine, challenge))) throw new Error('another key');
        socket.setTimeout(IDLE);
        return new ChunkTaker(socket, read);
      })().then(done, (error) => {
        socket.destroy();
        fail(error);
      });
    });
  }

  constructor(socket, read) {
    this.socket = socket;
    this.read = read;
    this.turn = Promise.resolve();
  }

  /**
   * Takes the `n`th chunk of the file `id` (hex), of `size` bytes, and keeps it in `folder` once it
   * opens with `fileKey` (hex): 'kept'; 'none' when the other does not have it whole. Throws when cut off.
   */
  take(folder, id, n, fileKey, size) {
    const work = this.turn.then(async () => {
      if (!ID.test(id) || !KEY.test(fileKey) || !CHUNK_SIZES.includes(size) || !Number.isInteger(n) || n < 0) return 'none';
      const ask = Buffer.alloc(1 + 16 + 4);
      ask[0] = ASK;
      Buffer.from(id, 'hex').copy(ask, 1);
      ask.writeUInt32BE(n, 17);
      this.socket.write(ask);
      const length = (await this.read(4)).readUInt32BE(0);
      if (length > MOST_CHUNK) {
        this.socket.destroy();
        throw new Error('too long');
      }
      if (length === 0) return 'none';
      const sealed = await this.read(length);
      if (!opens(Buffer.from(fileKey, 'hex'), n, sealed, size)) return 'none';
      // Kept whole under its name, or not at all.
      const target = path.join(folder, chunkName(id, n));
      const part = `${target}.part`;
      fs.mkdirSync(folder, { recursive: true, mode: 0o700 });
      fs.writeFileSync(part, sealed, { mode: 0o600 });
      fs.renameSync(part, target);
      return 'kept';
    });
    this.turn = work.catch(() => undefined);
    return work;
  }

  close() {
    this.socket.destroy();
  }
}

module.exports = { ChunkServer, ChunkTaker, addresses, opens };
