// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// Runs the real Element Call (app/node_modules/@element-hq/element-call-embedded) in Chromium as
// Erevos's Android window serves it (modules/erevos-webcall): its files from a page of their own,
// without the ones the app leaves out, an empty config.json, the same listener put in its <head>
// and the same bridge, every other host blocked. Erevos's side is the real one (lib/matrix-calls.ts,
// lib/matrix-widget.ts) against the homeserver of checks/matrix-server.ts with the real core: Alice
// calls Bob, and the check prints what Element Call asked, what reached the homeserver, and which
// hosts it tried. No media server runs here, so the call stops where Element Call would reach LiveKit.
// Usage, from app/: node --import ./checks/register.mjs ../docs/matrix-checks/element-call-browser.ts [--show] [--seconds=N]
/// <reference types="node" />
import { readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import type { AddressInfo } from 'node:net';
import { extname, join, normalize } from 'node:path';

import { setCore, type Core } from '../../app/lib/core';
import { joinRoom, setMatrixHttp, signIn, startChat, sync, type MatrixState } from '../../app/lib/matrix';
import { shownMatrixCall, startMatrixCall, watchMatrixCalls, callWindowMessage, type CallWindow } from '../../app/lib/matrix-calls';
import type { WidgetMessage } from '../../app/lib/matrix-widget';
import { Homeserver, HS, PASSWORD, type Json } from '../../app/checks/matrix-server';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const show = process.argv.includes('--show');
const seconds = Number(process.argv.find((a) => a.startsWith('--seconds='))?.slice(10) ?? 20);

const wasm = require(new URL('../../app/checks/.core/erevos_ffi.js', import.meta.url).pathname) as Record<string, (...args: never[]) => unknown>;
setCore(Object.fromEntries(Object.entries(wasm).map(([name, fn]) => [name, async (...args: never[]) => fn(...args)])) as unknown as Core);
const homeserver = new Homeserver();
setMatrixHttp(async (request) => homeserver.answer(request));
homeserver.transports = [{ type: 'livekit', livekit_service_url: 'https://sfu.example.org/livekit/jwt' }];

// As modules/erevos-webcall/android/build.gradle copies it.
const DIST = new URL('../../app/node_modules/@element-hq/element-call-embedded/dist/', import.meta.url).pathname;
const LEFT_OUT = [/\.map$/, /vision_wasm_internal/, /selfie_segmenter/, /matrix_sdk_crypto_wasm/, /\.woff$/];
// As ElementCallActivity.kt puts it in the page.
const LISTENER =
  "window.addEventListener('message',function(e){var d=e.data;if(!d||typeof d!=='object')return;" +
  "if((d.api==='fromWidget'&&!d.response)||(d.api==='toWidget'&&d.response))erevosCall.postMessage(JSON.stringify(d));});";
const TYPES: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.wasm': 'application/wasm', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.png': 'image/png', '.ogg': 'audio/ogg', '.mp3': 'audio/mpeg' };

const served: string[] = [];
const missing: string[] = [];
const files = createServer((request, response) => {
  const path = decodeURIComponent(new URL(request.url ?? '/', 'http://x').pathname);
  if (!path.startsWith('/element-call/')) return response.writeHead(404).end();
  const name = normalize(path.slice('/element-call/'.length)) || 'index.html';
  if (name === 'config.json') return response.writeHead(200, { 'Content-Type': 'application/json' }).end('{}');
  const file = join(DIST, name);
  let ok = !name.startsWith('..') && !LEFT_OUT.some((r) => r.test(name));
  try {
    ok &&= statSync(file).isFile();
  } catch {
    ok = false;
  }
  if (!ok) {
    missing.push(name);
    return response.writeHead(404).end();
  }
  served.push(name);
  const body = name === 'index.html' ? readFileSync(file, 'utf8').replace('<head>', `<head><script>${LISTENER}</script>`) : readFileSync(file);
  response.writeHead(200, { 'Content-Type': TYPES[extname(name)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' }).end(body);
});
await new Promise<void>((resolve) => files.listen(0, '127.0.0.1', resolve));
const PAGE = `http://localhost:${(files.address() as AddressInfo).port}/element-call/index.html`;

// Alice and Bob, in an encrypted chat with each other.
const alice: MatrixState = await signIn(HS, 'alice', PASSWORD);
const bob: MatrixState = await signIn(HS, 'bob', PASSWORD);
const roomId = (await startChat(alice, bob.userId)).id;
await sync(bob, 0);
await joinRoom(bob, roomId);
await sync(bob, 0);
await sync(alice, 0);

const browser = await chromium.launch({ args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] });
const context = await browser.newContext({ permissions: ['microphone', 'camera'] });
const page = await context.newPage();
const tried = new Map<string, number>();
const sfu: Json[] = [];
await context.route('**/*', async (route: any) => {
  const url = new URL(route.request().url());
  if (url.hostname === 'localhost') return route.continue();
  tried.set(url.host, (tried.get(url.host) ?? 0) + 1);
  if (show) console.log('host:', route.request().method(), url.href);
  // The media server's token, asked with the OpenID token: answered, so the call goes as far as
  // LiveKit. Its member state and its ring go only once LiveKit took it, so not here.
  if (url.host === 'sfu.example.org') {
    let body: unknown = null;
    try {
      body = route.request().postDataJSON();
    } catch {
      body = route.request().postData();
    }
    sfu.push({ path: url.pathname, body });
    // A token shaped as LiveKit's service gives it (not signed: nothing here checks it).
    const part = (o: Json) => Buffer.from(JSON.stringify(o)).toString('base64url');
    const claims = { sub: `${alice.userId}:${alice.deviceId}`, iss: 'erevos-check', exp: Math.floor(Date.now() / 1000) + 3600, video: { room: 'check-room', roomJoin: true } };
    const jwt = `${part({ alg: 'HS256', typ: 'JWT' })}.${part(claims)}.c2ln`;
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ url: 'wss://sfu.example.org', jwt }) });
  }
  return route.abort();
});
const logs: string[] = [];
page.on('console', (m: any) => logs.push(`${m.type()}: ${m.text()}`));
page.on('pageerror', (e: Error) => logs.push(`pageerror: ${e.message}`));

const fromIt: WidgetMessage[] = [];
const toIt: WidgetMessage[] = [];
await page.exposeBinding('erevosCallPost', (_source: unknown, message: string) => {
  const parsed = JSON.parse(message) as WidgetMessage;
  fromIt.push(parsed);
  if (show) console.log('←', parsed.action, JSON.stringify(parsed.response ?? parsed.data).slice(0, 300));
  callWindowMessage(parsed);
});
await page.addInitScript(() => {
  const w = window as any;
  w.erevosCall = { postMessage: (s: string) => w.erevosCallPost(s), audioDevice: () => undefined, back: () => undefined, playing: () => undefined };
});

let opened = '';
const callWindow: CallWindow = {
  open(url) {
    opened = url.replace(/^[^#]*/, PAGE);
    void page.goto(opened).then(() =>
      page.evaluate(() => {
        const c = (window as any).controls;
        c.setAvailableAudioDevices([
          { id: 'earpiece', name: 'Earpiece', isEarpiece: true },
          { id: 'speaker', name: 'Speaker', isSpeaker: true },
        ]);
        c.setAudioDevice('speaker');
      }),
    );
  },
  post(message) {
    toIt.push(message);
    if (show && !message.response) console.log('→', message.action, JSON.stringify(message.data).slice(0, 300));
    void page.evaluate((m: WidgetMessage) => window.postMessage(m, '*'), message).catch(() => undefined);
  },
  close() {
    void page.close();
  },
};

let chain: Promise<unknown> = Promise.resolve();
const change = <T>(use: (s: MatrixState) => Promise<T>): Promise<T> => {
  const run = chain.then(() => use(alice));
  chain = run.catch(() => undefined);
  return run;
};
const stop = watchMatrixCalls(callWindow, { now: () => alice, change, read: (use) => use(alice), page: PAGE, parentUrl: PAGE });
startMatrixCall(roomId, true);

// Alice's phone syncs as it does while the call is on.
const end = Date.now() + seconds * 1000;
while (Date.now() < end) {
  await change((s) => sync(s, 0));
  await new Promise((resolve) => setTimeout(resolve, 300));
}

const actions = (list: WidgetMessage[], api: string) => [...new Set(list.filter((m) => m.api === api && !m.response).map((m) => m.action))];
console.log('Element Call asked:', actions(fromIt, 'fromWidget').join(', '));
console.log('Erevos told it:', actions(toIt, 'toWidget').join(', '));
const refused = toIt.filter((m) => m.api === 'fromWidget' && (m.response as Json | undefined)?.error);
console.log('Refused:', refused.map((m) => `${m.action} (${(m.response as Json).error.message})`).join('; ') || 'nothing');
const caps = toIt.find((m) => m.action === 'notify_capabilities')?.data as { requested: string[]; approved: string[] } | undefined;
if (caps) console.log('Capabilities not given:', caps.requested.filter((c) => !caps.approved.includes(c)).join(', ') || 'none');
console.log('Homeserver was asked:', [...new Set(homeserver.asked.filter((a) => !a.includes('/sync')).map((a) => a.replace(/![^/]+|%21[^/]+/, '!room').replace(/\/[^/]*erevos[0-9a-f]+$/, '/txn')))].join('\n  '));
console.log('Member state:', JSON.stringify(homeserver.stateOf(roomId, 'org.matrix.msc3401.call.member', `_${alice.userId}_${alice.deviceId}_m.call`)?.content ?? null));
console.log('Delayed:', [...homeserver.delayed.values()].map((d) => `${d.type} ${d.delayMs} ms`).join(', ') || 'none');
console.log('Media server asked:', JSON.stringify(sfu));
console.log('Other hosts tried (blocked):', [...tried].map(([h, n]) => `${h} ×${n}`).join(', ') || 'none');
console.log('Files left out that it asked for:', [...new Set(missing)].join(', ') || 'none');
console.log('Call now:', shownMatrixCall()?.state ?? 'none');
const problems = logs.filter((l) => /^(error|pageerror)/.test(l));
console.log(`Page errors (${problems.length}):`);
for (const l of problems.slice(0, 25)) console.log('  ', l.slice(0, 400));
if (show) for (const l of logs) console.log('  ', l.slice(0, 300));

stop();
await browser.close();
files.close();
setCore(null);
process.exit(0);
