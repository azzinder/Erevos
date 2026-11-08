// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// The computer app's fetching of HLS streams for the page's hls.js (desktop/stream.js): a
// playlist's links are made addresses of the shell, each by a number, and only those are fetched,
// over https only, with the User-Agent "Erevos" and the page's Range alone. Electron's net.request
// is played here by a stand-in that asks a local server for each https link.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { createServer, request as httpRequest, type IncomingHttpHeaders, type IncomingMessage, type Server } from 'node:http';
import { createRequire } from 'node:module';
import type { AddressInfo } from 'node:net';
import { after, before, test } from 'node:test';

type StreamsType = {
  add: (url: unknown) => string | null;
  forget: (token: string) => void;
  clear: () => void;
  request: (request: Request, url: URL) => Promise<Response>;
  serve: (request: Request, rest: string) => Promise<Response>;
};
const require = createRequire(import.meta.url);
const { Streams, rewritePlaylist, isPlaylist } = require('../../desktop/stream.js') as {
  Streams: new (ask: (options: { url: string }) => unknown, origin: string) => StreamsType;
  rewritePlaylist: (text: string, base: string, address: (link: string) => string | null) => string;
  isPlaylist: (head: Uint8Array) => boolean;
};

const ORIGIN = 'app://erevos';
const SEGMENT = Buffer.from(Array.from({ length: 1000 }, (_, i) => i % 251));

// What the server was asked: the path and the headers.
const asked: { path: string; headers: IncomingHttpHeaders }[] = [];
let server: Server;
let port = 0;

before(async () => {
  server = createServer((req, res) => {
    asked.push({ path: req.url ?? '', headers: req.headers });
    const path = req.url ?? '';
    if (path === '/live/master.m3u8') {
      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      res.end('﻿#EXTM3U\r\n#EXT-X-STREAM-INF:BANDWIDTH=800000\r\nlow/index.m3u8\r\n#EXT-X-STREAM-INF:BANDWIDTH=2000000\r\nhttps://other.example/high.m3u8?sig=a%20b\r\n');
    } else if (path === '/live/low/index.m3u8') {
      // Moved: its links are relative to where it is now.
      res.writeHead(302, { Location: 'https://cdn.example/moved/index.m3u8' });
      res.end();
    } else if (path === '/moved/index.m3u8') {
      // A type that says nothing: the answer's start tells.
      res.setHeader('Content-Type', 'text/plain');
      res.end(
        '#EXTM3U\n#EXT-X-TARGETDURATION:6\n#EXT-X-MAP:URI="init.mp4"\n#EXT-X-KEY:METHOD=AES-128,URI="/keys/1",IV=0x00\n#EXTINF:6,\nseg1.ts\n#EXT-X-BYTERANGE:500@0\n#EXTINF:6,\nseg2.ts\n# a comment\nhttp://plain.example/seg3.ts\n',
      );
    } else if (path === '/moved/seg1.ts' || path === '/moved/seg2.ts') {
      const range = /^bytes=(\d+)-(\d+)$/.exec(String(req.headers.range ?? ''));
      if (range) {
        const [start, end] = [Number(range[1]), Number(range[2])];
        res.writeHead(206, { 'Content-Type': 'text/html', 'Content-Range': `bytes ${start}-${end}/${SEGMENT.length}`, 'Set-Cookie': 'a=b' });
        res.end(SEGMENT.subarray(start, end + 1));
      } else {
        res.writeHead(200, { 'Content-Type': 'video/mp2t', 'Set-Cookie': 'a=b' });
        res.end(SEGMENT);
      }
    } else if (path === '/down.m3u8') {
      res.writeHead(302, { Location: 'http://cdn.example/moved/index.m3u8' });
      res.end();
    } else if (path === '/huge.m3u8') {
      res.write('#EXTM3U\n');
      const line = `#EXTINF:1,\n${'x'.repeat(1000)}.ts\n`;
      for (let i = 0; i < 5000; i += 1) res.write(line);
      res.end();
    } else {
      res.writeHead(404);
      res.end();
    }
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  port = (server.address() as AddressInfo).port;
});

after(() => {
  server.close();
});

/** Electron's ClientRequest as stream.js uses it, asking the local server for any https link. */
class Asking extends EventEmitter {
  url: string;
  headers: Record<string, string> = {};
  followed = false;
  aborted = false;
  constructor(options: { url: string; credentials?: string; useSessionCookies?: boolean; redirect?: string }) {
    super();
    assert.equal(options.credentials, 'omit');
    assert.equal(options.useSessionCookies, false);
    assert.equal(options.redirect, 'manual');
    this.url = options.url;
  }
  setHeader(name: string, value: string) {
    this.headers[name] = value;
  }
  followRedirect() {
    this.followed = true;
  }
  abort() {
    if (this.aborted) return;
    this.aborted = true;
    process.nextTick(() => this.emit('abort'));
  }
  end() {
    this.go(this.url);
  }
  go(url: string) {
    const target = new URL(url);
    if (target.protocol !== 'https:') {
      this.emit('error', new Error('not https'));
      return;
    }
    const req = httpRequest({ host: '127.0.0.1', port, path: target.pathname + target.search, headers: this.headers }, (res: IncomingMessage) => {
      if (this.aborted) return res.destroy();
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        this.followed = false;
        const next = new URL(res.headers.location, url).href;
        this.emit('redirect', res.statusCode, 'GET', next, res.headers);
        if (this.followed) this.go(next);
        else this.emit('error', new Error('Redirect was cancelled'));
        return;
      }
      this.emit('response', res);
    });
    req.on('error', (error) => this.emit('error', error));
    req.end();
  }
}

const made = () => new Streams((options) => new Asking(options as { url: string }), ORIGIN);
const get = (streams: StreamsType, address: string, headers: Record<string, string> = {}) =>
  streams.serve(new Request(address, { headers }), address.slice(`${ORIGIN}/__stream/`.length));
const linksOf = (playlist: string) => playlist.split('\n').filter((line) => line && !line.startsWith('#'));

test('a playlist names its https links as addresses of the shell, and leaves the rest', () => {
  let n = 0;
  const seen: string[] = [];
  const address = (link: string) => {
    seen.push(link);
    return `app://erevos/__stream/t/${n++}`;
  };
  const text =
    '﻿#EXTM3U\r\n#EXT-X-SESSION-KEY:METHOD=AES-128,URI="k.bin"\r\n#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="a",NAME="en",URI="audio/en.m3u8"\r\n#EXT-X-CONTENT-STEERING:SERVER-URI="/steer.json"\r\n#EXT-X-STREAM-INF:BANDWIDTH=1,AUDIO="a"\r\n  v1/index.m3u8  \r\n\r\n# just words, URI="no.m3u8"\r\nhttp://plain.example/a.m3u8\r\nhttps://x.example/{$token}/b.m3u8\r\n#EXT-X-KEY:METHOD=SAMPLE-AES,URI="skd://key"\r\n';
  const out = rewritePlaylist(text, 'https://site.example/live/master.m3u8?x=1#top', address);
  assert.deepEqual(seen, ['https://site.example/live/k.bin', 'https://site.example/live/audio/en.m3u8', 'https://site.example/steer.json', 'https://site.example/live/v1/index.m3u8']);
  assert.equal(
    out,
    [
      '#EXTM3U',
      '#EXT-X-SESSION-KEY:METHOD=AES-128,URI="app://erevos/__stream/t/0"',
      '#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="a",NAME="en",URI="app://erevos/__stream/t/1"',
      '#EXT-X-CONTENT-STEERING:SERVER-URI="app://erevos/__stream/t/2"',
      '#EXT-X-STREAM-INF:BANDWIDTH=1,AUDIO="a"',
      'app://erevos/__stream/t/3',
      '',
      '# just words, URI="no.m3u8"',
      'http://plain.example/a.m3u8',
      'https://x.example/{$token}/b.m3u8',
      '#EXT-X-KEY:METHOD=SAMPLE-AES,URI="skd://key"',
      '',
    ].join('\n'),
  );
  assert.equal(isPlaylist(new TextEncoder().encode('#EXTM3U\n#EXT')), true);
  assert.equal(isPlaylist(new Uint8Array([0xef, 0xbb, 0xbf, 0x0d, 0x0a, ...new TextEncoder().encode('#EXTM3U')])), true);
  assert.equal(isPlaylist(new Uint8Array([0x47, 0x40, 0x00, 0x10])), false);
});

test("a stream's playlists and pieces come through the shell, only by the numbers its playlists gave", async () => {
  const streams = made();
  assert.equal(streams.add('http://site.example/live/master.m3u8'), null);
  assert.equal(streams.add('https://user:pw@site.example/live/master.m3u8'), null);
  assert.equal(streams.add('not a link'), null);
  const token = streams.add('https://site.example/live/master.m3u8');
  assert.ok(token && /^[0-9a-f]{32}$/.test(token));
  asked.length = 0;

  const master = await get(streams, `${ORIGIN}/__stream/${token}/0`, { Cookie: 'c=d', 'User-Agent': 'page', Authorization: 'x' });
  assert.equal(master.status, 200);
  assert.equal(master.headers.get('content-type'), 'application/vnd.apple.mpegurl');
  assert.equal(master.headers.get('cache-control'), 'no-store');
  const variants = linksOf(await master.text());
  assert.deepEqual(variants, [`${ORIGIN}/__stream/${token}/1`, `${ORIGIN}/__stream/${token}/2`]);
  // Only the app's name, and nothing of the page's request.
  assert.equal(asked[0].path, '/live/master.m3u8');
  assert.equal(asked[0].headers['user-agent'], 'Erevos');
  assert.equal(asked[0].headers.cookie, undefined);
  assert.equal(asked[0].headers.authorization, undefined);

  // Its links are relative to where it was moved.
  const media = await get(streams, variants[0]);
  assert.equal(media.status, 200);
  const text = await media.text();
  assert.match(text, new RegExp(`#EXT-X-MAP:URI="${ORIGIN}/__stream/${token}/3"`));
  assert.match(text, new RegExp(`#EXT-X-KEY:METHOD=AES-128,URI="${ORIGIN}/__stream/${token}/4",IV=0x00`));
  assert.deepEqual(linksOf(text), [`${ORIGIN}/__stream/${token}/5`, `${ORIGIN}/__stream/${token}/6`, 'http://plain.example/seg3.ts']);
  assert.deepEqual(
    asked.slice(1).map((a) => a.path),
    ['/live/low/index.m3u8', '/moved/index.m3u8'],
  );

  // A piece comes as bytes, whatever its server calls it, without its cookie.
  const piece = await get(streams, `${ORIGIN}/__stream/${token}/5`);
  assert.equal(piece.status, 200);
  assert.equal(piece.headers.get('content-type'), 'application/octet-stream');
  assert.equal(piece.headers.get('set-cookie'), null);
  assert.deepEqual(Buffer.from(await piece.arrayBuffer()), SEGMENT);
  // By its bytes: the page's Range alone is passed on.
  const part = await get(streams, `${ORIGIN}/__stream/${token}/6`, { Range: 'bytes=0-499' });
  assert.equal(part.status, 206);
  assert.equal(part.headers.get('content-range'), `bytes 0-499/${SEGMENT.length}`);
  assert.equal(part.headers.get('content-type'), 'application/octet-stream');
  assert.deepEqual(Buffer.from(await part.arrayBuffer()), SEGMENT.subarray(0, 500));
  assert.equal(asked.at(-1)?.headers.range, 'bytes=0-499');

  // No other address: a number not given, a number of another stream, a token not given.
  asked.length = 0;
  assert.equal((await get(streams, `${ORIGIN}/__stream/${token}/7`)).status, 404);
  assert.equal((await get(streams, `${ORIGIN}/__stream/${token}/01`)).status, 404);
  assert.equal((await get(streams, `${ORIGIN}/__stream/${token}/1/2`)).status, 404);
  assert.equal((await get(streams, `${ORIGIN}/__stream/${'0'.repeat(32)}/0`)).status, 404);
  const other = streams.add('https://site.example/down.m3u8');
  assert.ok(other);
  assert.equal((await get(streams, `${ORIGIN}/__stream/${other}/3`)).status, 404);
  assert.equal(asked.length, 0);
  assert.equal((await streams.serve(new Request(`${ORIGIN}/__stream/${token}/0`, { method: 'POST', body: 'x' }), `${token}/0`)).status, 405);

  // A redirect to plain http is not followed.
  assert.equal((await get(streams, `${ORIGIN}/__stream/${other}/0`)).status, 502);
  assert.deepEqual(
    asked.map((a) => a.path),
    ['/down.m3u8'],
  );

  // Forgotten, it answers no more.
  streams.forget(token);
  assert.equal((await get(streams, `${ORIGIN}/__stream/${token}/5`)).status, 404);
  streams.clear();
  assert.equal((await get(streams, `${ORIGIN}/__stream/${other}/0`)).status, 404);
});

test('a playlist larger than 4 MB is refused', async () => {
  const streams = made();
  const token = streams.add('https://site.example/huge.m3u8');
  assert.ok(token);
  assert.equal((await get(streams, `${ORIGIN}/__stream/${token}/0`)).status, 502);
});

test('the page holds and forgets streams by its own requests', async () => {
  const streams = made();
  const post = (body: string) => streams.request(new Request(`${ORIGIN}/__stream`, { method: 'POST', body }), new URL(`${ORIGIN}/__stream`));
  assert.equal((await post('{}')).status, 400);
  assert.equal((await post('not json')).status, 400);
  assert.equal((await post(JSON.stringify({ url: 'http://site.example/a.m3u8' }))).status, 400);
  const answer = await post(JSON.stringify({ url: 'https://site.example/live/master.m3u8' }));
  assert.equal(answer.status, 200);
  const { token } = (await answer.json()) as { token: string };
  assert.match(token, /^[0-9a-f]{32}$/);
  assert.equal((await get(streams, `${ORIGIN}/__stream/${token}/0`)).status, 200);
  const del = await streams.request(new Request(`${ORIGIN}/__stream?token=${token}`, { method: 'DELETE' }), new URL(`${ORIGIN}/__stream?token=${token}`));
  assert.equal(del.status, 204);
  assert.equal((await get(streams, `${ORIGIN}/__stream/${token}/0`)).status, 404);
  // At most four at once: the oldest goes.
  const tokens = [];
  for (let i = 0; i < 5; i += 1) tokens.push(streams.add('https://site.example/live/master.m3u8'));
  assert.equal((await get(streams, `${ORIGIN}/__stream/${tokens[0]}/0`)).status, 404);
  assert.equal((await get(streams, `${ORIGIN}/__stream/${tokens[4]}/0`)).status, 200);
});
