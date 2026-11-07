// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// A new release of the web app (pwa/sw.js): the worker gets it ready while the app is open, takes
// it into use when the app opens again in its only window, and a check that was still asking the
// server meanwhile does not undo that, putting back the release whose files were let go of.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { createHash, generateKeyPairSync, sign } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import vm from 'node:vm';

const WORKER = readFileSync(join(import.meta.dirname, '../../pwa/sw.js'), 'utf8');
const APP = 'https://erevos.example';

const { privateKey, publicKey } = generateKeyPairSync('ed25519');
const KEY = publicKey.export({ format: 'der', type: 'spki' }).subarray(-32).toString('base64');
const hash = (text: string) => createHash('sha256').update(text).digest('hex');

/** A release as pwa/build.mjs lists it, and its signature. */
function release(version: number, files: Record<string, string>) {
  const body = Buffer.from(JSON.stringify({ app: 'erevos-web', version, files: Object.fromEntries(Object.entries(files).map(([p, text]) => [p, hash(text)])) }));
  return { files, body, signature: sign(null, body, privateKey).toString('base64') };
}

type Release = ReturnType<typeof release>;

const OLD = release(9, { '/index.html': 'page 9', '/app.js': 'app 9', '/sw.js': 'worker', '/chunk.js': 'chunk 9' });
const NEW = release(10, { '/index.html': 'page 10', '/app.js': 'app 10', '/sw.js': 'worker', '/chunk.js': 'chunk 10' });

// The worker installed by a browser, its server offering `offered`, which a test may change, or
// make wait (`held`) before it answers for the release.
function browser(first: Release) {
  const server = { offered: first, held: null as Promise<void> | null };
  const caches = new Map<string, Map<string, Response>>();
  const open = async (name: string) => {
    if (!caches.has(name)) caches.set(name, new Map());
    const store = caches.get(name)!;
    return {
      match: async (key: string) => store.get(key)?.clone(),
      put: async (key: string, response: Response) => void store.set(key, response.clone()),
    };
  };
  const fetch = async (path: string) => {
    if (path === '/release.json' && server.held) await server.held;
    const offered = server.offered;
    if (path === '/release.json') return new Response(offered.body);
    if (path === '/release.sig') return new Response(offered.signature);
    return path in offered.files ? new Response(offered.files[path]) : new Response('', { status: 404 });
  };
  const listeners: Record<string, (event: unknown) => void> = {};
  const self = {
    addEventListener: (type: string, listener: (event: unknown) => void) => void (listeners[type] = listener),
    clients: { matchAll: async () => [], claim: async () => undefined },
    skipWaiting: async () => undefined,
    location: { origin: APP },
  };
  const worker = WORKER.replace('__EREVOS_PUBLIC_KEY__', KEY).replace('__EREVOS_APP_ORIGIN__', '').replace('__EREVOS_CALL_ORIGIN__', '');
  vm.runInNewContext(worker, { self, caches: { open, keys: async () => [...caches.keys()], delete: async (name: string) => caches.delete(name) }, Response, URL, crypto, TextEncoder, TextDecoder, DOMException, setTimeout, fetch, atob });
  const fire = async (type: string) => {
    let work: Promise<unknown> = Promise.resolve();
    listeners[type]({ waitUntil: (promise: Promise<unknown>) => (work = promise) });
    await work;
  };
  const ask = (what: string) =>
    new Promise<{ current: { version: number } | null; pending: { version: number } | null; refused: unknown[] }>((resolve) =>
      listeners.message({ data: { erevos: what }, ports: [{ postMessage: resolve }], waitUntil: () => undefined }),
    );
  const got = async (path: string, mode: string) => {
    let answer: Promise<Response> | undefined;
    listeners.fetch({ request: { url: `${APP}${path}`, method: 'GET', mode }, respondWith: (response: Promise<Response> | Response) => (answer = Promise.resolve(response)), waitUntil: () => undefined });
    const response = await answer!;
    return `${response.status} ${await response.text()}`;
  };
  return { server, fire, ask, open: (path: string) => got(path, 'navigate'), load: (path: string) => got(path, 'no-cors') };
}

test('a new release waits for the app to open again, then is used, and the old one is let go of', async () => {
  const b = browser(OLD);
  await b.fire('install');
  await b.fire('activate');
  assert.equal(await b.open('/'), '200 page 9');
  b.server.offered = NEW;
  const ready = await b.ask('check');
  assert.equal(ready.current?.version, 9);
  assert.equal(ready.pending?.version, 10);
  // Still the old one, whole, while the app is open.
  assert.equal(await b.load('/chunk.js'), '200 chunk 9');
  assert.equal(await b.open('/'), '200 page 10');
  assert.equal(await b.load('/chunk.js'), '200 chunk 10');
  const now = await b.ask('status');
  assert.equal(now.current?.version, 10);
  assert.equal(now.pending, null);
});

test('a check still asking the server when the new release is taken into use does not put the old one back', async () => {
  const b = browser(OLD);
  await b.fire('install');
  await b.fire('activate');
  b.server.offered = NEW;
  await b.ask('check');
  // A second check asks the server, which answers only later.
  let answer = () => undefined as void;
  b.server.held = new Promise<void>((resolve) => (answer = resolve));
  const checking = b.ask('check');
  await new Promise((resolve) => setTimeout(resolve, 20));
  // Meanwhile the app opens again in its only window: release 10 is taken into use, 9's files go.
  assert.equal(await b.open('/'), '200 page 10');
  b.server.held = null;
  answer();
  const after = await checking;
  assert.equal(after.current?.version, 10);
  assert.equal(after.pending, null);
  // A part of the app loaded later still comes, from release 10.
  assert.equal(await b.load('/chunk.js'), '200 chunk 10');
  assert.equal(await b.open('/'), '200 page 10');
  assert.deepEqual(after.refused, []);
});
