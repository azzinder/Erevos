// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

/**
 * The Collection's music and videos played on a computer straight from their encrypted chunks
 * (app/lib/collection-desk-player.ts), as the phone's player does (Playing.kt, SealedFile.kt): the
 * page's <audio> or <video> asks for the bytes it needs, by range, at an address of its own, and
 * only the chunks that hold them are read from files/ and opened here, one at a time, never kept
 * whole and never written anywhere. So a file of some GB plays and seeks at once, where the page
 * would otherwise hold it whole in its memory.
 *
 *   POST   /__play              (with the page's token) a file of the Collection to play: JSON
 *                               {id, key, chunk, count, size, mime}, as the catalogue keeps it;
 *                               answers {token}, 32 random hex characters
 *   GET    /__play/<token>      its bytes, by Range (206), as the media element asks; without the
 *                               page's token, which a media element cannot send: the address is
 *                               known to the page alone, and only for as long as the file plays
 *   DELETE /__play?token=…      (with the page's token) forgets one, and with no token all
 *
 * Each file's key is held in this process's memory only, in a Buffer of its own, zeroed when it
 * is forgotten: when the list stops or changes, the space locks, the panic button (main.js, wipe)
 * and when the window closes for good. A chunk is opened as SealedFile.kt opens it: whole, by the
 * key, at its own place and holding exactly the bytes the file's size says; anything else stops
 * the answer, never bytes that may be wrong.
 */

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const NONCE = 12;
const TAG = 16;
const HEAD = 8;
const CHUNK_SIZES = [64 * 1024, 256 * 1024, 1024 * 1024];
const MOST_CHUNKS = 4096;
// The most files held at once: a list of the Collection's, with its subtitles.
const MOST_FILES = 4000;
const ID = /^[0-9a-f]{32}$/;
const KEY = /^[0-9a-f]{64}$/;
const TOKEN = /^[0-9a-f]{32}$/;
// The types an answer may carry: what the page says the file is, if it is one of these kinds.
const TYPE = /^(audio|video)\/[a-z0-9.+-]{1,60}$|^text\/vtt$|^application\/x-subrip$/;

/** How many of a file's bytes a chunk of `chunk` bytes holds. */
const room = (chunk) => chunk - NONCE - TAG - HEAD;

/** A file to play as the page gives it, checked; null when it is not one. */
function fileOf(value) {
  const v = value ?? {};
  if (typeof v.id !== 'string' || !ID.test(v.id) || typeof v.key !== 'string' || !KEY.test(v.key)) return null;
  if (!CHUNK_SIZES.includes(v.chunk) || !Number.isInteger(v.count) || v.count < 1 || v.count > MOST_CHUNKS) return null;
  if (!Number.isSafeInteger(v.size) || v.size < 0 || Math.max(1, Math.ceil(v.size / room(v.chunk))) !== v.count) return null;
  const mime = typeof v.mime === 'string' && TYPE.test(v.mime) ? v.mime : 'application/octet-stream';
  return { id: v.id, key: Buffer.from(v.key, 'hex'), chunk: v.chunk, count: v.count, size: v.size, mime };
}

/**
 * The range a Range header asks of a file of `size` bytes: [start, end] (end included), or null
 * for the whole file, or false when it cannot be answered (416).
 */
function rangeOf(header, size) {
  if (!header) return null;
  const m = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!m || (m[1] === '' && m[2] === '')) return false;
  if (m[1] === '') {
    const last = Math.min(Number(m[2]), size);
    return last === 0 ? false : [size - last, size - 1];
  }
  const start = Number(m[1]);
  const end = m[2] === '' ? size - 1 : Math.min(Number(m[2]), size - 1);
  return start >= size || end < start ? false : [start, end];
}

/** The file's bytes in chunk `n`, opened and checked; throws when it is missing or wrong. */
function piece(folder, file, n) {
  const sealed = fs.readFileSync(path.join(folder, `erevos-file-${file.id}-${n}`));
  if (sealed.length !== file.chunk) throw new Error('chunk not whole');
  const decipher = crypto.createDecipheriv('aes-256-gcm', file.key, sealed.subarray(0, NONCE));
  decipher.setAuthTag(sealed.subarray(sealed.length - TAG));
  const plain = Buffer.concat([decipher.update(sealed.subarray(NONCE, sealed.length - TAG)), decipher.final()]);
  try {
    const length = plain.readUInt32BE(4);
    const must = n < file.count - 1 ? room(file.chunk) : file.size - (file.count - 1) * room(file.chunk);
    if (plain.readUInt32BE(0) !== n || length !== must || length > plain.length - HEAD) throw new Error('chunk wrong');
    return Buffer.from(plain.subarray(HEAD, HEAD + length));
  } finally {
    plain.fill(0);
  }
}

class Plays {
  /** `folder`: where the app's files are (files/). */
  constructor(folder) {
    this.folder = folder;
    this.files = new Map();
  }

  /** Holds a file to play; its token, or null when it is not one. */
  add(value) {
    const file = fileOf(value);
    if (!file) return null;
    if (this.files.size >= MOST_FILES) {
      file.key.fill(0);
      return null;
    }
    const token = crypto.randomBytes(16).toString('hex');
    this.files.set(token, file);
    return token;
  }

  /** Forgets one file, and zeroes its key. */
  forget(token) {
    const file = this.files.get(token);
    if (!file) return;
    this.files.delete(token);
    file.key.fill(0);
  }

  /** Forgets every file: the list stopped, the space locked, the panic button, the window closed. */
  clear() {
    for (const token of [...this.files.keys()]) this.forget(token);
  }

  /** The answer to the page's own requests (POST, DELETE), which come with its token. */
  async request(request, url) {
    if (request.method === 'POST') {
      let value = null;
      try {
        value = JSON.parse(await request.text());
      } catch {
        // Not JSON: refused below.
      }
      const token = this.add(value);
      return token ? Response.json({ token }) : new Response('bad file', { status: 400 });
    }
    if (request.method === 'DELETE') {
      const token = url.searchParams.get('token');
      if (token) this.forget(token);
      else this.clear();
      return new Response(null, { status: 204 });
    }
    return new Response('', { status: 405 });
  }

  /** The bytes a media element asks for at /__play/<token>. */
  serve(request, token) {
    if (request.method !== 'GET' && request.method !== 'HEAD') return new Response('', { status: 405 });
    const file = TOKEN.test(token) ? this.files.get(token) : undefined;
    if (!file) return new Response('', { status: 404 });
    const headers = { 'Content-Type': file.mime, 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
    const range = rangeOf(request.headers.get('range'), file.size);
    if (range === false) return new Response('', { status: 416, headers: { ...headers, 'Content-Range': `bytes */${file.size}` } });
    const [start, end] = range ?? [0, file.size - 1];
    const length = file.size === 0 ? 0 : end - start + 1;
    const partial = range !== null;
    const status = partial ? 206 : 200;
    const all = { ...headers, 'Content-Length': String(length), ...(partial ? { 'Content-Range': `bytes ${start}-${end}/${file.size}` } : {}) };
    if (request.method === 'HEAD' || length === 0) return new Response(null, { status, headers: all });
    const plays = this;
    const per = room(file.chunk);
    let at = start;
    const body = new ReadableStream({
      pull(controller) {
        // Forgotten meanwhile (the list stopped, the space locked): the answer ends here.
        if (plays.files.get(token) !== file) {
          controller.error(new Error('forgotten'));
          return;
        }
        if (at > end) {
          controller.close();
          return;
        }
        const n = Math.floor(at / per);
        try {
          const bytes = piece(plays.folder, file, n);
          const from = at - n * per;
          const to = Math.min(bytes.length, end - n * per + 1);
          controller.enqueue(new Uint8Array(bytes.subarray(from, to)));
          bytes.fill(0);
          at = n * per + to;
        } catch (error) {
          controller.error(error);
        }
      },
    });
    return new Response(body, { status, headers: all });
  }
}

module.exports = { Plays, rangeOf, fileOf };
