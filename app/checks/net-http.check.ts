// Downloads read as a stream and stopped at their cap (lib/net-http.ts): a server that sends more
// than the cap, with Content-Length or without (chunked), is stopped, and stops sending.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { createServer, type Server, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { after, before, test } from 'node:test';

import { CloudError, fetchFromCloud } from '../lib/backup-cloud';
import { defaultMatrixHttp } from '../lib/matrix';
import { fetchCapped, HTTP_MOST, HttpTooLargeError, netHttp, readCapped } from '../lib/net-http';
import { downloadBlob, NOSTR_BLOB_MOST } from '../lib/nostr-files';
import { downloadXmppFile, XMPP_FILE_MOST } from '../lib/xmpp-files';

const MB = 1024 * 1024;
const CHUNK = new Uint8Array(64 * 1024).fill(7);

// What the server sent on each path before the other end stopped it or it was done.
const sent = new Map<string, number>();
// Each path's answer: `size` bytes, said in Content-Length or not (then chunked).
type Plan = { size: number; length: boolean };
const plans = new Map<string, Plan>();

let server: Server;
let base = '';

function send(res: ServerResponse, path: string, plan: Plan) {
  let gone = 0;
  sent.set(path, 0);
  res.writeHead(200, plan.length ? { 'Content-Length': String(plan.size) } : {});
  const more = () => {
    while (gone < plan.size && !res.destroyed) {
      const piece = gone + CHUNK.length <= plan.size ? CHUNK : CHUNK.subarray(0, plan.size - gone);
      gone += piece.length;
      sent.set(path, gone);
      if (!res.write(piece)) return void res.once('drain', more);
    }
    if (!res.destroyed) res.end();
  };
  res.on('close', () => sent.set(path, gone));
  more();
}

before(async () => {
  server = createServer((req, res) => {
    const path = new URL(req.url ?? '/', 'http://x').pathname;
    const plan = plans.get(path);
    if (!plan) {
      res.writeHead(404).end();
      return;
    }
    send(res, path, plan);
  });
  await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(async () => {
  server.closeAllConnections();
  await new Promise<void>((done) => server.close(() => done()));
});

const serve = (path: string, size: number, length: boolean) => {
  plans.set(path, { size, length });
  return `${base}${path}`;
};

// The server learns the other end went away a little after: wait for its close.
async function sentAfterStop(path: string): Promise<number> {
  for (let i = 0; i < 100; i++) {
    await new Promise((done) => setTimeout(done, 20));
    const before = sent.get(path);
    await new Promise((done) => setTimeout(done, 20));
    if (sent.get(path) === before) return before ?? 0;
  }
  return sent.get(path) ?? 0;
}

test('an answer within its cap comes whole, with Content-Length and without', async () => {
  for (const length of [true, false]) {
    const url = serve(`/small-${length}`, 300 * 1024 + 5, length);
    const answer = await netHttp('GET', url, {}, undefined, 300 * 1024 + 5);
    assert.equal(answer.status, 200);
    assert.equal(answer.bytes.length, 300 * 1024 + 5);
    assert.ok(answer.bytes.every((b) => b === 7));
  }
});

test('a Content-Length larger than the cap stops the answer before it is read', async () => {
  const url = serve('/said-large', 40 * MB, true);
  await assert.rejects(netHttp('GET', url, {}, undefined, MB), (error) => error instanceof HttpTooLargeError && error.most === MB && /1 MB/.test(error.message));
  assert.ok((await sentAfterStop('/said-large')) < 40 * MB);
});

test('an answer with no length (chunked) is stopped as soon as it passes the cap', async () => {
  const url = serve('/chunked-large', 40 * MB, false);
  await assert.rejects(netHttp('GET', url, {}, undefined, MB), HttpTooLargeError);
  // Stopped near the cap, not after the whole of it: what was on its way is all that went.
  assert.ok((await sentAfterStop('/chunked-large')) < 40 * MB);
});

test('the default cap is 100 MB, and no caller gets more', async () => {
  assert.equal(HTTP_MOST, 100 * MB);
  const url = serve('/endless', HTTP_MOST + 60 * MB, false);
  await assert.rejects(netHttp('GET', url, {}, undefined, 500 * MB), (error) => error instanceof HttpTooLargeError && error.most === HTTP_MOST && /100 MB/.test(error.message));
  assert.ok((await sentAfterStop('/endless')) < HTTP_MOST + 60 * MB);
  const said = serve('/said-endless', HTTP_MOST + 1, true);
  await assert.rejects(netHttp('GET', said, {}), HttpTooLargeError);
  // Exactly the cap still comes.
  const exact = serve('/exact', 2 * MB, false);
  assert.equal((await fetchCapped(exact, {}, 2 * MB)).bytes.length, 2 * MB);
});

test('readCapped weighs an answer with no stream by its length, then whole', async () => {
  const bytes = new Uint8Array(1000);
  const plain = (length?: string) =>
    ({ body: null, headers: new Headers(length ? { 'content-length': length } : {}), arrayBuffer: async () => bytes.buffer }) as unknown as Response;
  let stopped = 0;
  await assert.rejects(readCapped(plain('5000'), 999, () => stopped++), HttpTooLargeError);
  assert.equal(stopped, 1);
  await assert.rejects(readCapped(plain(), 999), HttpTooLargeError);
  assert.equal((await readCapped(plain(), 1000)).length, 1000);
});

test("a Nostr file's server is stopped past NOSTR_BLOB_MOST, an XMPP file's past XMPP_FILE_MOST", async () => {
  for (const length of [true, false]) {
    const url = serve(`/blob-${length}`, 3 * NOSTR_BLOB_MOST, length);
    await assert.rejects(downloadBlob(url), (error) => error instanceof HttpTooLargeError && /20 MB/.test(error.message));
    assert.ok((await sentAfterStop(`/blob-${length}`)) < 3 * NOSTR_BLOB_MOST);
    const xmpp = serve(`/xmpp-${length}`, XMPP_FILE_MOST + 64 * 1024, length);
    await assert.rejects(downloadXmppFile({ url: xmpp, name: 'f', type: 'application/octet-stream', size: 1 }), /larger than Erevos opens/);
  }
  const fine = serve('/blob-fine', 100 * 1024, false);
  assert.equal((await downloadBlob(fine)).length, 100 * 1024);
});

test('a backup from a server comes up to 100 MB, and the error says so', async () => {
  for (const length of [true, false]) {
    serve('/dav/0123456789abcdef', HTTP_MOST + 60 * MB, length);
    await assert.rejects(fetchFromCloud({ url: `${base}/dav/`, user: 'me', password: 'pw' }, '0123456789abcdef'), (error) => error instanceof CloudError && /100 MB/.test(error.message) && /Restore a backup/.test(error.message));
    assert.ok((await sentAfterStop('/dav/0123456789abcdef')) < HTTP_MOST + 60 * MB);
  }
  // A smaller cap asked for is kept, a larger one is not.
  serve('/dav/fedcba9876543210', 3 * MB, false);
  await assert.rejects(fetchFromCloud({ url: `${base}/dav/`, user: 'me', password: 'pw' }, 'fedcba9876543210', 2 * MB), /2 MB/);
  assert.equal((await fetchFromCloud({ url: `${base}/dav/`, user: 'me', password: 'pw' }, 'fedcba9876543210', 500 * MB)).length, 3 * MB);
});

test("Matrix's own straight requests are stopped the same way", async () => {
  const url = serve('/matrix-media', HTTP_MOST + 4 * MB, false);
  await assert.rejects(defaultMatrixHttp({ method: 'GET', url, raw: true }), HttpTooLargeError);
  const small = serve('/matrix-small', 3 * MB, true);
  await assert.rejects(defaultMatrixHttp({ method: 'GET', url: small, raw: true, most: MB }), HttpTooLargeError);
  assert.equal((await defaultMatrixHttp({ method: 'GET', url: small, raw: true })).bytes?.length, 3 * MB);
});
