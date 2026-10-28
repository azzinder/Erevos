// Runs a Matrix call in the web app as it is served: a release made by pwa/build.mjs and signed,
// on one server with two addresses, as Apache serves it (deploy/web/install.sh): the app's at
// localhost, which never gives Element Call's files, and Element Call's at 127.0.0.1, which gives
// only them and the release. In Chromium the app installs its service worker and starts; then the
// real lib/element-call-window.web.ts runs in its page (turned to plain JavaScript, with what it
// imports handed over from here) and opens Element Call's frame, whose start page installs the
// worker on its own origin, which checks the release and then serves Element Call. Erevos's side
// of the call is the real one (lib/matrix-calls.ts, lib/matrix-widget.ts) against the homeserver of
// checks/matrix-server.ts with the real core: Alice calls Bob. The check prints what Element Call
// asked, what the policies refused, which hosts it tried, and that its back arrow puts the frame
// small. No media server runs here, so the call stops where Element Call would reach LiveKit.
//
// Build the release first, from the repository's root, with a key made for the check:
//   EREVOS_RELEASE_PASSPHRASE=… node pwa/release.mjs keygen /tmp/k/test.key /tmp/k/test.pub
//   (in app/) EXPO_NO_TELEMETRY=1 npx expo export --clear --platform web --output-dir /tmp/web
//   node pwa/build.mjs /tmp/web /tmp/webapp --key /tmp/k/test.pub --origin http://localhost:8731 --call-origin http://127.0.0.1:8731
//   EREVOS_RELEASE_PASSPHRASE=… node pwa/release.mjs sign /tmp/webapp /tmp/k/test.key
// Usage, from app/: node --import ./checks/register.mjs ../docs/matrix-checks/element-call-web.ts /tmp/webapp [--show] [--seconds=N]
/// <reference types="node" />
import { readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { extname, join, normalize } from 'node:path';

import { setCore, type Core } from '../../app/lib/core';
import { joinRoom, setMatrixHttp, signIn, startChat, sync, type MatrixState } from '../../app/lib/matrix';
import { callWindowClosed, callWindowMessage, shownMatrixCall, startMatrixCall, watchMatrixCalls, type CallWindow } from '../../app/lib/matrix-calls';
import type { WidgetMessage } from '../../app/lib/matrix-widget';
import { Homeserver, HS, PASSWORD, type Json } from '../../app/checks/matrix-server';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
// The app's own TypeScript, to turn lib/element-call-window.web.ts into JavaScript for the page.
const ts = createRequire(new URL('../../app/package.json', import.meta.url))('typescript') as typeof import('typescript');
const show = process.argv.includes('--show');
const seconds = Number(process.argv.find((a) => a.startsWith('--seconds='))?.slice(10) ?? 25);
const WEB = process.argv.slice(2).find((a) => !a.startsWith('--'));
if (!WEB) throw new Error('usage: element-call-web.ts <signed web app folder> [--show] [--seconds=N]');
const release = JSON.parse(readFileSync(join(WEB, 'release.json'), 'utf8')) as { origins?: { app: string; call: string } };
if (!release.origins) throw new Error(`${WEB} was built without Element Call.`);
const APP = release.origins.app;
const CALL = release.origins.call;
const PORT = Number(new URL(APP).port);
if (new URL(CALL).port !== String(PORT) || new URL(APP).hostname !== 'localhost' || new URL(CALL).hostname !== '127.0.0.1') {
  throw new Error('Build it with --origin http://localhost:<port> --call-origin http://127.0.0.1:<port>.');
}

const wasm = require(new URL('../../app/checks/.core/erevos_ffi.js', import.meta.url).pathname) as Record<string, (...args: never[]) => unknown>;
setCore(Object.fromEntries(Object.entries(wasm).map(([name, fn]) => [name, async (...args: never[]) => fn(...args)])) as unknown as Core);
const homeserver = new Homeserver();
setMatrixHttp(async (request) => homeserver.answer(request));
homeserver.transports = [{ type: 'livekit', livekit_service_url: 'https://sfu.example.org/livekit/jwt' }];

const TYPES: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.wasm': 'application/wasm', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.png': 'image/png', '.ogg': 'audio/ogg', '.mp3': 'audio/mpeg', '.webmanifest': 'application/manifest+json', '.ttf': 'font/ttf' };
// What each address was asked for, as the server saw it.
const asked: Record<string, string[]> = { app: [], call: [] };
const send = (response: import('node:http').ServerResponse, file: string) => {
  try {
    if (!statSync(file).isFile()) throw new Error('not a file');
  } catch {
    return response.writeHead(404).end();
  }
  response.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-cache' }).end(readFileSync(file));
};
const server = createServer((request, response) => {
  const url = new URL(request.url ?? '/', 'http://x');
  const path = normalize(decodeURIComponent(url.pathname));
  if (path.includes('..')) return response.writeHead(400).end();
  const call = (request.headers.host ?? '').startsWith('127.0.0.1');
  asked[call ? 'call' : 'app'].push(path);
  // As Apache serves Element Call's address: only its files, the release and the worker.
  if (call) {
    if (path.startsWith('/element-call/') || ['/sw.js', '/release.json', '/release.sig'].includes(path)) return send(response, join(WEB, path));
    return response.writeHead(404).end();
  }
  // And the app's: never Element Call's files; any other address the app.
  if (path.startsWith('/element-call/')) return response.writeHead(403).end();
  if (path === '/i') return response.writeHead(301, { Location: '/i/' }).end();
  const file = join(WEB, path.endsWith('/') ? `${path}index.html` : path);
  try {
    if (statSync(file).isFile()) return send(response, file);
  } catch {
    // A screen of the app.
  }
  return send(response, join(WEB, 'index.html'));
});
await new Promise<void>((resolve) => server.listen(PORT, '127.0.0.1', resolve));

// Alice and Bob, in an encrypted chat with each other.
const alice: MatrixState = await signIn(HS, 'alice', PASSWORD);
const bob: MatrixState = await signIn(HS, 'bob', PASSWORD);
const roomId = (await startChat(alice, bob.userId)).id;
await sync(bob, 0);
await joinRoom(bob, roomId);
await sync(bob, 0);
await sync(alice, 0);

// The whole Chromium, not Playwright's headless shell: that one has no Badging API, and ends the
// page when the app puts its number on the icon.
const browser = await chromium.launch({ channel: 'chromium', args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] });
const context = await browser.newContext({ permissions: ['microphone', 'camera'] });
const page = await context.newPage();
const tried = new Map<string, number>();
const sfu: Json[] = [];
await context.route('**/*', async (route: any) => {
  const url = new URL(route.request().url());
  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') return route.continue();
  tried.set(url.host, (tried.get(url.host) ?? 0) + 1);
  if (show) console.log('host:', route.request().method(), url.href);
  // The media server's token, asked with the OpenID token: answered, so the call goes as far as LiveKit.
  if (url.host === 'sfu.example.org') {
    let body: unknown = null;
    try {
      body = route.request().postDataJSON();
    } catch {
      body = route.request().postData();
    }
    sfu.push({ path: url.pathname, body });
    const part = (o: Json) => Buffer.from(JSON.stringify(o)).toString('base64url');
    const claims = { sub: `${alice.userId}:${alice.deviceId}`, iss: 'erevos-check', exp: Math.floor(Date.now() / 1000) + 3600, video: { room: 'check-room', roomJoin: true } };
    const jwt = `${part({ alg: 'HS256', typ: 'JWT' })}.${part(claims)}.c2ln`;
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ url: 'wss://sfu.example.org', jwt }) });
  }
  return route.abort();
});
const logs: string[] = [];
const refusedUrls: string[] = [];
page.on('response', (r: any) => {
  if (r.status() === 403) refusedUrls.push(r.url().slice(0, 120));
});
const watch = (p: any, where: string) => {
  p.on('console', (m: any) => logs.push(`${where} ${m.type()}: ${m.text()}`));
  p.on('pageerror', (e: Error) => logs.push(`${where} pageerror: ${e.message}`));
  p.on('crash', () => logs.push(`${where} error: the page crashed`));
};
watch(page, 'page');

// The app, as a browser opens it the first time: its worker checks the release, then it starts.
await page.goto(`${APP}/`);
await page.waitForFunction(() => !!navigator.serviceWorker.controller && !document.querySelector('.erevos-boot'), null, { timeout: 60_000 });
await page.waitForTimeout(3000);
const appWorker = await page.evaluate(() => navigator.serviceWorker.controller?.scriptURL);
console.log('App page served by its worker:', appWorker);
// Element Call's files, asked of the app's address, through its worker: none.
const fromApp = await page.evaluate(async () => (await fetch('/element-call/index.html')).status);
console.log('App origin gives /element-call/index.html:', fromApp);

// The real lib/element-call-window.web.ts, in the app's page, with what it imports handed over.
const source = readFileSync(new URL('../../app/lib/element-call-window.web.ts', import.meta.url), 'utf8');
const plain = ts
  .transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } })
  .outputText.replace(/^import .*;$/gm, '')
  .replace(/^export function /gm, 'function ');
const told: string[] = [];
const fromIt: WidgetMessage[] = [];
const toIt: WidgetMessage[] = [];
await page.exposeBinding('erevosCheckMessage', (_s: unknown, message: string) => {
  const parsed = JSON.parse(message) as WidgetMessage;
  fromIt.push(parsed);
  if (show) console.log('←', parsed.action, JSON.stringify(parsed.response ?? parsed.data).slice(0, 300));
  callWindowMessage(parsed);
});
await page.exposeBinding('erevosCheckClosed', () => callWindowClosed());
await page.exposeBinding('erevosCheckAsk', (_s: unknown, title: string, text: string) => void told.push(`${title} ${text}`));
await page.evaluate(`(() => {
  const ask = (title, text) => window.erevosCheckAsk(String(title), String(text));
  const t = (english) => english;
  const callWindowMessage = (message) => window.erevosCheckMessage(JSON.stringify(message));
  const callWindowClosed = () => window.erevosCheckClosed();
  const matrixCallAccount = {};
  const SHELL = null;
  ${plain}
  window.erevosCheck = { canElementCall: canElementCall(), element: elementCall() };
})()`);
const shown = (await page.evaluate(() => {
  const check = (window as any).erevosCheck;
  return { can: check.canElementCall, page: check.element?.space.page, parentUrl: check.element?.space.parentUrl, hostAudio: check.element?.space.hostAudio };
})) as { can: boolean; page: string; parentUrl: string; hostAudio: boolean };
console.log('canElementCall:', shown.can, '| page:', shown.page, '| parentUrl:', shown.parentUrl, '| hostAudio:', shown.hostAudio);

const callWindow: CallWindow = {
  open(url) {
    void page.evaluate((u: string) => (window as any).erevosCheck.element.window.open(u, true), url);
  },
  post(message) {
    toIt.push(message);
    if (show && !message.response) console.log('→', message.action, JSON.stringify(message.data).slice(0, 300));
    void page.evaluate((m: WidgetMessage) => (window as any).erevosCheck.element.window.post(m), message).catch(() => undefined);
  },
  close() {
    void page.evaluate(() => (window as any).erevosCheck.element.window.close()).catch(() => undefined);
  },
};
let chain: Promise<unknown> = Promise.resolve();
const change = <T>(use: (s: MatrixState) => Promise<T>): Promise<T> => {
  const run = chain.then(() => use(alice));
  chain = run.catch(() => undefined);
  return run;
};
const stop = watchMatrixCalls(callWindow, { now: () => alice, change, read: (use) => use(alice), page: shown.page, parentUrl: shown.parentUrl, hostAudio: shown.hostAudio });
startMatrixCall(roomId, true);

// Alice's phone syncs as it does while the call is on.
const end = Date.now() + seconds * 1000;
let framed: any = null;
while (Date.now() < end) {
  await change((s) => sync(s, 0));
  framed ??= page.frames().find((f: any) => f.url().startsWith(`${CALL}/element-call/index.html`)) ?? null;
  await new Promise((resolve) => setTimeout(resolve, 300));
}
const frameUrl = framed?.url() ?? page.frames().map((f: any) => f.url()).join(', ');
console.log('Frame shows:', frameUrl.replace(/#.*/, '#…'));
const callWorker = framed ? await framed.evaluate(() => navigator.serviceWorker.controller?.scriptURL ?? 'none') : 'no frame';
console.log("Element Call's page served by its origin's worker:", callWorker);
const policy = framed ? await framed.evaluate(async () => (await fetch(location.href.replace(/#.*/, ''))).headers.get('Content-Security-Policy')) : null;
console.log("Element Call's page policy:", policy);
const leak = framed ? await framed.evaluate(async () => [(await fetch('/index.html')).status, (await fetch('/element-call/assets/' + 'x.js')).status]) : null;
console.log('Call origin gives /index.html and an unlisted file:', leak);

// Its back arrow, as Escape: the frame goes small; a tap brings it back.
const box = () => page.evaluate(() => (document.querySelector('iframe[title="Element Call"]')?.parentElement as HTMLElement | null)?.style.width ?? 'none');
if (framed) {
  console.log('Back arrow handed to Erevos:', await framed.evaluate(() => typeof (window as any).controls?.onBackButtonPressed));
  await framed.evaluate(() => (window as any).controls.onBackButtonPressed());
  await page.waitForTimeout(800);
  console.log('After the back arrow, frame width:', (await box()) || 'full');
  await page.click('button[title="Back to the call"]', { timeout: 5000 }).catch((e: Error) => console.log('Tap failed:', e.message.split('\n')[0]));
  await page.waitForTimeout(500);
  console.log('After a tap, frame width:', (await box()) || 'full');
}

const actions = (list: WidgetMessage[], api: string) => [...new Set(list.filter((m) => m.api === api && !m.response).map((m) => m.action))];
console.log('Element Call asked:', actions(fromIt, 'fromWidget').join(', '));
console.log('Erevos told it:', actions(toIt, 'toWidget').join(', '));
const refused = toIt.filter((m) => m.api === 'fromWidget' && (m.response as Json | undefined)?.error);
console.log('Refused:', refused.map((m) => `${m.action} (${(m.response as Json).error.message})`).join('; ') || 'nothing');
console.log('Member state:', JSON.stringify(homeserver.stateOf(roomId, 'org.matrix.msc3401.call.member', `_${alice.userId}_${alice.deviceId}_m.call`)?.content ?? null));
console.log('Media server asked:', JSON.stringify(sfu));
console.log('Other hosts tried (blocked):', [...tried].map(([h, n]) => `${h} ×${n}`).join(', ') || 'none');
console.log('Call address asked for (not Element Call):', [...new Set(asked.call.filter((p) => !p.startsWith('/element-call/')))].join(', '));
console.log('App address asked for Element Call:', asked.app.filter((p) => p.startsWith('/element-call/')).join(', ') || 'nothing');
console.log('Answered 403:', refusedUrls.join(', ') || 'nothing');
console.log('Told the person:', told.join(' | ') || 'nothing');
console.log('Call now:', shownMatrixCall()?.state ?? 'none');
const violations = logs.filter((l) => /Content Security Policy|Refused to/i.test(l));
console.log(`Policy refusals (${violations.length}):`);
for (const l of violations.slice(0, 20)) console.log('  ', l.slice(0, 400));
const problems = logs.filter((l) => /(error|pageerror):/.test(l) && !violations.includes(l));
console.log(`Page errors (${problems.length}):`);
for (const l of problems.slice(0, 25)) console.log('  ', l.slice(0, 400));
if (show) for (const l of logs) console.log('  ', l.slice(0, 300));

stop();
await browser.close();
server.close();
setCore(null);
process.exit(0);
