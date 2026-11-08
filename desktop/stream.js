// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

/**
 * The Collection's TV channels and radio stations that come as HLS, fetched here for the page's
 * hls.js (app/lib/collection-desk-player.ts). hls.js reads a stream's playlists and pieces from
 * the page, and a page may read only what a server lets it (CORS), which most of iptv-org's
 * streams' servers do not. So in the desktop app the page asks the shell for them instead:
 *
 *   POST   /__stream               (with the page's token) a stream to play: JSON {url}, its https
 *                                  link; answers {token}, 32 random hex characters
 *   GET    /__stream/<token>/<n>   link n of that stream (0: its own link), fetched here; a
 *                                  playlist comes with every https link it names made such an
 *                                  address, so hls.js asks for each of them here too, by its
 *                                  number; without the page's token, which hls.js does not send:
 *                                  the address is known to the page alone, while the stream plays
 *   DELETE /__stream?token=…       (with the page's token) forgets one, and with no token all
 *
 * Only the stream's own link and the links its playlists named are fetched, by their numbers: the
 * page cannot have any other address fetched through here. Each is asked for over https only (a
 * redirect to anything else is refused, never followed), with the User-Agent "Erevos", no cookies
 * and, of the page's request, only its Range (a piece named by its bytes). Nothing of it is
 * logged. An answer that starts as a playlist (#EXTM3U) is read whole, 4 MB at most, and
 * rewritten; any other comes through as it arrives, as application/octet-stream: hls.js reads a
 * piece or a key by its bytes. A stream is forgotten when the page lets it go, the space locks,
 * the panic button (main.js, wipe) and when the window closes for good, and its requests still
 * under way stop then.
 */

const crypto = require('node:crypto');
const { Readable } = require('node:stream');

/** What the requests say of the app: its name, nothing of the computer. */
const AGENT = 'Erevos';
const TOKEN = /^[0-9a-f]{32}$/;
const NUMBER = /^(0|[1-9][0-9]{0,8})$/;
const RANGE = /^bytes=[0-9]{0,15}-[0-9]{0,15}$/;
const CONTENT_RANGE = /^bytes ([0-9]{1,15}-[0-9]{1,15}|\*)\/([0-9]{1,15}|\*)$/;
// The most streams held at once: the one playing, and a few the page has not let go of yet.
const MOST_STREAMS = 4;
// The most links one stream keeps, and their length in all; the oldest asked for go first, so a
// live stream's pieces that have passed. A playlist of a whole film names a few thousand.
const MOST_LINKS = 20000;
const MOST_LINK = 4096;
const MOST_LINK_CHARS = 8 * 1024 * 1024;
const MOST_PLAYLIST = 4 * 1024 * 1024;
const MOST_REDIRECTS = 10;
// How long a server may take to begin its answer, and then a playlist to come whole.
const WAIT = 20_000;
// Enough of an answer's start to tell a playlist: #EXTM3U, after a BOM or a blank or two.
const HEAD = 16;
const PLAYLIST = 'application/vnd.apple.mpegurl';
const HEADERS = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };

/** `given` as an https link to ask for, without its #part; null when it is not one. */
function httpsLink(given, base) {
  if (typeof given !== 'string' || given.length > MOST_LINK) return null;
  let target;
  try {
    target = base === undefined ? new URL(given) : new URL(given, base);
  } catch {
    return null;
  }
  if (target.protocol !== 'https:' || target.username || target.password) return null;
  target.hash = '';
  return target.href.length > MOST_LINK ? null : target.href;
}

/**
 * Playlist `text`, fetched from `base`, with every https link it names given as `address(link)`
 * says: on a line of its own (a piece, a rendition) and in a tag's URI="…" (a key, an init piece,
 * another rendition, a part). A link that is not https, or holds a variable of #EXT-X-DEFINE,
 * stays as it is, for the page to ask for itself, as it would without the shell.
 */
function rewritePlaylist(text, base, address) {
  const made = (link) => {
    if (link.includes('{$')) return null;
    const target = httpsLink(link.trim(), base);
    return target ? address(target) : null;
  };
  return text
    .replace(/^﻿/, '')
    .split(/\r\n|\r|\n/)
    .map((line) => {
      const plain = line.trim();
      if (!plain) return '';
      if (plain.startsWith('#')) {
        if (!plain.startsWith('#EXT')) return plain;
        return plain.replace(/([:,](?:[A-Z0-9-]+-)?URI=)"([^"]*)"/g, (all, name, link) => {
          const address = made(link);
          return address ? `${name}"${address}"` : all;
        });
      }
      return made(plain) ?? plain;
    })
    .join('\n');
}

/** Whether an answer that begins with `head` is a playlist. */
function isPlaylist(head) {
  let at = head[0] === 0xef && head[1] === 0xbb && head[2] === 0xbf ? 3 : 0;
  while (at < head.length && (head[at] === 0x20 || head[at] === 0x09 || head[at] === 0x0d || head[at] === 0x0a)) at += 1;
  return Buffer.from(head.subarray(at, at + 7)).toString('latin1') === '#EXTM3U';
}

/** One stream's links, by number, the oldest asked for first. */
class Stream {
  constructor(link) {
    this.links = new Map();
    this.numbers = new Map();
    this.chars = 0;
    this.next = 0;
    // Its requests under way, stopped when it is forgotten.
    this.asking = new Set();
    this.number(link);
  }

  /** The number of `link`, given now if it has none. */
  number(link) {
    const known = this.numbers.get(link);
    if (known !== undefined) {
      this.links.delete(known);
      this.links.set(known, link);
      return known;
    }
    const n = this.next;
    this.next += 1;
    this.links.set(n, link);
    this.numbers.set(link, n);
    this.chars += link.length;
    while (this.links.size > MOST_LINKS || this.chars > MOST_LINK_CHARS) {
      const [old, oldLink] = this.links.entries().next().value;
      if (old === n) break;
      this.links.delete(old);
      this.numbers.delete(oldLink);
      this.chars -= oldLink.length;
    }
    return n;
  }

  /** The link of number `n`, now the latest asked for; null when it has none (any more). */
  link(n) {
    const link = this.links.get(n);
    if (link === undefined) return null;
    this.links.delete(n);
    this.links.set(n, link);
    return link;
  }

  stop() {
    for (const asked of [...this.asking]) asked.abort();
    this.asking.clear();
  }
}

class Streams {
  /**
   * `ask`: Electron's net.request, which asks as Chromium does, through the system's proxy;
   * `origin`: the page's own (app://erevos), for the addresses a playlist is rewritten with.
   */
  constructor(ask, origin) {
    this.ask = ask;
    this.origin = origin;
    this.streams = new Map();
  }

  /** Holds a stream to play by its https link; its token, or null when it is not one. */
  add(url) {
    const link = httpsLink(url);
    if (!link) return null;
    while (this.streams.size >= MOST_STREAMS) this.forget(this.streams.keys().next().value);
    const token = crypto.randomBytes(16).toString('hex');
    this.streams.set(token, new Stream(link));
    return token;
  }

  /** Forgets one stream, and stops its requests. */
  forget(token) {
    const stream = this.streams.get(token);
    if (!stream) return;
    this.streams.delete(token);
    stream.stop();
  }

  /** Forgets every stream: the space locked, the panic button, the window closed. */
  clear() {
    for (const token of [...this.streams.keys()]) this.forget(token);
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
      const token = this.add(value?.url);
      return token ? Response.json({ token }) : new Response('not an https link', { status: 400 });
    }
    if (request.method === 'DELETE') {
      const token = url.searchParams.get('token');
      if (token) this.forget(token);
      else this.clear();
      return new Response(null, { status: 204 });
    }
    return new Response('', { status: 405 });
  }

  /** What hls.js asks for at /__stream/<token>/<n>: `rest` is <token>/<n>. */
  async serve(request, rest) {
    if (request.method !== 'GET') return new Response('', { status: 405 });
    const [token, n, more] = rest.split('/');
    const stream = more === undefined && TOKEN.test(token ?? '') && NUMBER.test(n ?? '') ? this.streams.get(token) : undefined;
    const link = stream?.link(Number(n));
    if (!link) return new Response('', { status: 404, headers: HEADERS });
    const range = request.headers.get('range');
    let got;
    try {
      got = await this.fetch(stream, link, range && RANGE.test(range) ? range : null);
    } catch {
      return new Response('', { status: 502, headers: HEADERS });
    }
    const { status, reader, stop } = got;
    if (status < 200 || status > 299 || status === 204 || status === 205) {
      stop();
      return new Response('', { status: status >= 400 && status <= 599 ? status : 502, headers: HEADERS });
    }
    // The answer's start, to tell a playlist.
    const first = [];
    let had = 0;
    let ended = false;
    try {
      while (had < HEAD) {
        const { done, value } = await reader.read();
        if (done) {
          ended = true;
          break;
        }
        first.push(value);
        had += value.length;
      }
    } catch {
      stop();
      return new Response('', { status: 502, headers: HEADERS });
    }
    const head = Buffer.concat(first);
    if (isPlaylist(head)) return this.playlist(token, stream, got, first, had, ended);
    const headers = { ...HEADERS, 'Content-Type': 'application/octet-stream' };
    const said = [Object.entries(got.headers).find(([name]) => name.toLowerCase() === 'content-range')?.[1]].flat()[0];
    if (status === 206 && typeof said === 'string' && CONTENT_RANGE.test(said)) headers['Content-Range'] = said;
    let given = 0;
    const body = new ReadableStream({
      async pull(controller) {
        if (given < first.length) {
          controller.enqueue(new Uint8Array(first[given]));
          given += 1;
          return;
        }
        if (ended) {
          controller.close();
          return;
        }
        try {
          const { done, value } = await reader.read();
          if (done) controller.close();
          else controller.enqueue(new Uint8Array(value));
        } catch (error) {
          controller.error(error);
        }
      },
      cancel() {
        stop();
      },
    });
    return new Response(body, { status, headers });
  }

  /** A playlist, read whole and rewritten so that each link it names comes here too. */
  async playlist(token, stream, got, first, had, ended) {
    const { reader, stop, url } = got;
    const parts = [...first];
    let size = had;
    const late = setTimeout(stop, WAIT);
    try {
      while (!ended) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.length;
        if (size > MOST_PLAYLIST) {
          stop();
          return new Response('', { status: 502, headers: HEADERS });
        }
        parts.push(value);
      }
    } catch {
      stop();
      return new Response('', { status: 502, headers: HEADERS });
    } finally {
      clearTimeout(late);
    }
    // Forgotten meanwhile: nothing more is numbered for it.
    if (this.streams.get(token) !== stream) return new Response('', { status: 404, headers: HEADERS });
    const text = new TextDecoder('utf-8').decode(Buffer.concat(parts));
    const rewritten = rewritePlaylist(text, url, (link) => `${this.origin}/__stream/${token}/${stream.number(link)}`);
    return new Response(rewritten, { status: 200, headers: { ...HEADERS, 'Content-Type': PLAYLIST } });
  }

  /**
   * Asks for `link`, following https redirects only; resolves once the answer begins, with its
   * status, headers, the link it finally came from, a reader of its body and how to stop it.
   */
  fetch(stream, link, range) {
    return new Promise((resolve, reject) => {
      let at = link;
      let hops = 0;
      let settled = false;
      let late = null;
      const asked = this.ask({ method: 'GET', url: link, redirect: 'manual', credentials: 'omit', useSessionCookies: false, cache: 'no-store', referrerPolicy: 'no-referrer' });
      stream.asking.add(asked);
      const stop = () => {
        stream.asking.delete(asked);
        asked.abort();
      };
      const fail = (error) => {
        stream.asking.delete(asked);
        clearTimeout(late);
        if (settled) return;
        settled = true;
        reject(error);
      };
      late = setTimeout(() => {
        stop();
        fail(new Error('no answer'));
      }, WAIT);
      asked.setHeader('User-Agent', AGENT);
      if (range) asked.setHeader('Range', range);
      asked.on('redirect', (_status, _method, next) => {
        hops += 1;
        const target = hops <= MOST_REDIRECTS ? httpsLink(next) : null;
        if (!target) return; // Not followed: the request ends with an error.
        at = target;
        asked.followRedirect();
      });
      asked.on('response', (answer) => {
        clearTimeout(late);
        if (settled) {
          stop();
          return;
        }
        settled = true;
        const forget = () => stream.asking.delete(asked);
        answer.on('end', forget);
        answer.on('close', forget);
        answer.on('error', forget);
        resolve({ status: answer.statusCode, headers: answer.headers, url: at, reader: Readable.toWeb(answer).getReader(), stop });
      });
      asked.on('error', fail);
      asked.on('abort', () => fail(new Error('stopped')));
      asked.end();
    });
  }
}

module.exports = { Streams, rewritePlaylist, isPlaylist, AGENT };
