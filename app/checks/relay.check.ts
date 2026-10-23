// Two-hop sending, many messages on one connection, call relay credentials and waiting for a message (lib/relay.ts) against two real relays (crates/erevos-relay) and the real core
// built to WebAssembly by checks/build-core.mjs. Skipped, with a note, when either build is
// missing: build the relay with `cargo build -p erevos-relay`.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, test } from 'node:test';

import { setCore, type Core } from '../lib/core';
import {
  BadRelayAddressError,
  callRelay,
  canTellNewsAt,
  canTryLater,
  canWaitAt,
  createQueue,
  isQueueNotFound,
  isRelayAddress,
  newsSince,
  NO_NEWS,
  receiveMessage,
  relayKey,
  RelayError,
  RelaySends,
  RelayUnreachableError,
  sendMessage,
  sendMessageLater,
  setPush,
  waitForMessage,
  waitForNews,
  type Relay,
} from '../lib/relay';

const built = new URL('./.core/erevos_ffi.js', import.meta.url);
const binary = new URL('../../target/debug/erevos-relay', import.meta.url).pathname;
const ready = existsSync(built) && existsSync(binary) && typeof WebSocket === 'function';
if (!ready) console.log('Skipping the two-hop checks: build the core (node checks/build-core.mjs) and the relay first');

function freePort(): Promise<number> {
  return new Promise((resolve) => {
    const server = createServer().listen(0, '127.0.0.1', () => {
      const { port } = server.address() as { port: number };
      server.close(() => resolve(port));
    });
  });
}

const relays: ChildProcess[] = [];
const dir = mkdtempSync(join(tmpdir(), 'erevos-relay-check-'));

/** Starts a relay and returns its WebSocket address once it answers. With `key`, it has a key
 *  for sealed sends, a call relay beside it, and a key for Web Push. Both forward to each other on
 *  127.0.0.1, which a relay does only when allowed private peers. */
async function startRelay(key: boolean): Promise<string> {
  const [tcp, ws] = [await freePort(), await freePort()];
  const env = {
    ...process.env,
    EREVOS_RELAY_KEY: key ? join(dir, `key-${ws}`) : '',
    EREVOS_TURN_URLS: key ? 'turn:127.0.0.1:3478,turn:127.0.0.1:3478?transport=tcp' : '',
    EREVOS_TURN_SECRET: key ? 'secret' : '',
    EREVOS_RELAY_PUSH_KEY: key ? join(dir, `push-${ws}`) : '',
    EREVOS_RELAY_PRIVATE_PEERS: 'allow',
  };
  const child = spawn(binary, [`127.0.0.1:${tcp}`, `127.0.0.1:${ws}`], { env, stdio: 'ignore' });
  relays.push(child);
  const url = `ws://127.0.0.1:${ws}`;
  for (let i = 0; i < 50; i++) {
    try {
      await relayKey({ url: `${url}/none-${i}` });
      return url;
    } catch {
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  throw new Error(`the relay at ${url} did not start`);
}

let far = '';
let near = '';

before(async () => {
  if (!ready) return;
  const wasm = createRequire(import.meta.url)(built.pathname) as Record<string, (...args: never[]) => unknown>;
  setCore(
    Object.fromEntries(Object.entries(wasm).map(([name, call]) => [name, async (...args: never[]) => call(...args)])) as unknown as Core,
  );
  far = await startRelay(true);
  near = await startRelay(false);
});

after(() => {
  for (const relay of relays) relay.kill();
  rmSync(dir, { recursive: true, force: true });
});

test('a message sent through a second relay reaches the queue', { skip: !ready }, async () => {
  const own: Relay = { url: far };
  const ids = await createQueue(own);
  await sendMessage({ url: far, via: { url: near } }, ids.senderId, Uint8Array.of(1, 2, 3));
  assert.deepEqual(await receiveMessage(own, ids.recipientId), Uint8Array.of(1, 2, 3));
  assert.equal(await receiveMessage(own, ids.recipientId), null);
});

test('a send that says what it carries reaches the queue as any, now, through a second relay, or held for later', { skip: !ready }, async () => {
  const own: Relay = { url: far };
  const ids = await createQueue(own);
  await sendMessage(own, ids.senderId, Uint8Array.of(1), 'message');
  await sendMessage(own, ids.senderId, Uint8Array.of(2), 'quiet');
  await sendMessage({ url: far, via: { url: near } }, ids.senderId, Uint8Array.of(3), 'ring');
  for (const n of [1, 2, 3]) assert.deepEqual(await receiveMessage(own, ids.recipientId), Uint8Array.of(n));
  await sendMessageLater(own, ids.senderId, [Uint8Array.of(4), Uint8Array.of(5)], Date.now() + 1000, 'message');
  let got: Uint8Array | null = null;
  for (let i = 0; i < 50 && !got; i++) {
    await new Promise((r) => setTimeout(r, 100));
    got = await receiveMessage(own, ids.recipientId);
  }
  assert.deepEqual(got, Uint8Array.of(4));
  assert.deepEqual(await receiveMessage(own, ids.recipientId), Uint8Array.of(5));
});

test("a relay that pushes takes a browser's keys and says it will count in its pushes", { skip: !ready }, async () => {
  const ids = await createQueue({ url: far });
  const browser = (await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])) as CryptoKeyPair;
  const keys = { p256dh: new Uint8Array(await crypto.subtle.exportKey('raw', browser.publicKey)), auth: crypto.getRandomValues(new Uint8Array(16)) };
  const endpoint = 'https://web.push.apple.com/erevos-check';
  assert.equal(await setPush({ url: far }, ids.recipientId, endpoint, keys), true);
  // Without them its pushes are empty.
  assert.equal(await setPush({ url: far }, ids.recipientId, endpoint), false);
  assert.equal(await setPush({ url: far }, ids.recipientId, '', keys), false);
  // A relay that does not push says so.
  const other = await createQueue({ url: near });
  await assert.rejects(setPush({ url: near }, other.recipientId, endpoint, keys), RelayError);
});

test('a web app on the screen takes its messages as any, from a relay that pushes or one that does not', { skip: !ready }, async () => {
  for (const url of [far, near]) {
    const own: Relay = { url };
    const ids = await createQueue(own);
    await sendMessage(own, ids.senderId, Uint8Array.of(6), 'message');
    assert.deepEqual(await receiveMessage(own, ids.recipientId, true), Uint8Array.of(6));
    assert.equal(await receiveMessage(own, ids.recipientId, true), null);
  }
});

test('many messages go on one connection to each relay, each answered as when sent alone, with what it carries or not, and one through a second relay as before', { skip: !ready }, async () => {
  const [a, b] = [await createQueue({ url: far }), await createQueue({ url: far })];
  const there = await createQueue({ url: near });
  const sends = new RelaySends();
  try {
    await sends.send({ url: far }, a.senderId, Uint8Array.of(1), 'message');
    await sends.send({ url: far }, b.senderId, Uint8Array.of(2), 'quiet');
    // A queue the relay does not have says so, and the next goes on the same connection.
    await assert.rejects(sends.send({ url: far }, Uint8Array.from({ length: 24 }, () => 7), Uint8Array.of(3)), (error) => isQueueNotFound(error));
    await sends.send({ url: far }, a.senderId, Uint8Array.of(4));
    await sends.send({ url: near }, there.senderId, Uint8Array.of(5));
    await sends.send({ url: far, via: { url: near } }, b.senderId, Uint8Array.of(6), 'message');
    await assert.rejects(sends.send({ url: `ws://127.0.0.1:${await freePort()}` }, a.senderId, Uint8Array.of(7)), RelayUnreachableError);
  } finally {
    sends.close();
  }
  const all = async (relay: Relay, recipient: Uint8Array) => {
    const got: number[] = [];
    for (let bytes = await receiveMessage(relay, recipient); bytes; bytes = await receiveMessage(relay, recipient)) got.push(...bytes);
    return got;
  };
  assert.deepEqual([await all({ url: far }, a.recipientId), await all({ url: far }, b.recipientId), await all({ url: near }, there.recipientId)], [[1, 4], [2, 6], [5]]);
});

test('a relay without a key refuses two-hop sending instead of sending straight', { skip: !ready }, async () => {
  const own: Relay = { url: near };
  const ids = await createQueue(own);
  await assert.rejects(sendMessage({ url: near, via: { url: far } }, ids.senderId, Uint8Array.of(9)), RelayError);
  assert.equal(await receiveMessage(own, ids.recipientId), null);
});

test('a second relay that cannot reach the first says so', { skip: !ready }, async () => {
  const ids = await createQueue({ url: far });
  const closed = `ws://127.0.0.1:${await freePort()}`;
  // The key is the far relay's, so sealing works; the address the second relay is given is wrong.
  const key = await relayKey({ url: far });
  assert.ok(key);
  const { forwardMessage } = await import('../lib/relay');
  const { relaySeal } = await import('../lib/core');
  await assert.rejects(forwardMessage({ url: near }, closed, await relaySeal(key, ids.senderId, Uint8Array.of(1))), /could not reach/);
});

test('a relay hands out credentials for its call relay, and one without says so', { skip: !ready }, async () => {
  const turn = await callRelay({ url: far });
  assert.ok(turn);
  assert.deepEqual(turn.urls, ['turn:127.0.0.1:3478', 'turn:127.0.0.1:3478?transport=tcp']);
  // The username is when they expire, hours from now.
  assert.ok(Number(turn.username) > Date.now() / 1000 + 3600);
  assert.equal(turn.credential.length, 28);
  assert.equal(await callRelay({ url: near }), null);
});

test('a relay waits until a message comes, without taking it, and a wait can be ended', { skip: !ready }, async () => {
  const own: Relay = { url: near };
  const ids = await createQueue(own);
  let started = Date.now();
  assert.equal(await waitForMessage(own, ids.recipientId, 1), false);
  assert.ok(Date.now() - started >= 900);
  // One comes while it waits: the wait ends at once, and the message is still there to take.
  started = Date.now();
  const waiting = waitForMessage(own, ids.recipientId, 30);
  await new Promise((r) => setTimeout(r, 200));
  await sendMessage(own, ids.senderId, Uint8Array.of(7));
  assert.equal(await waiting, true);
  assert.ok(Date.now() - started < 10_000);
  assert.deepEqual(await receiveMessage(own, ids.recipientId), Uint8Array.of(7));
  // Ended from this side, as when Erevos shows again.
  const ending = new AbortController();
  started = Date.now();
  const ended = waitForMessage(own, ids.recipientId, 30, ending.signal);
  setTimeout(() => ending.abort(), 100);
  assert.equal(await ended, false);
  assert.ok(Date.now() - started < 5000);
  assert.ok(canWaitAt(own));
});

test('a relay says what came into a queue by what each send said, without taking it', { skip: !ready }, async () => {
  const own: Relay = { url: near };
  const ids = await createQueue(own);
  let started = Date.now();
  assert.deepEqual(await waitForNews(own, ids.recipientId, 1, NO_NEWS), NO_NEWS);
  assert.ok(Date.now() - started >= 900);
  // Word between phones starts a round with nothing in it.
  await sendMessage(own, ids.senderId, Uint8Array.of(1), 'quiet');
  const first = (await waitForNews(own, ids.recipientId, 30, NO_NEWS))!;
  assert.ok(first.round > 0);
  assert.deepEqual(newsSince(null, first), { messages: 0, unmarked: 0, rings: 0 });
  // One waiting ends as a message comes.
  started = Date.now();
  const waiting = waitForNews(own, ids.recipientId, 30, first);
  await new Promise((r) => setTimeout(r, 200));
  await sendMessage(own, ids.senderId, Uint8Array.of(2), 'message');
  const now = (await waiting)!;
  assert.ok(Date.now() - started < 10_000);
  assert.deepEqual(now, { ...first, messages: 1 });
  await sendMessage(own, ids.senderId, Uint8Array.of(3), 'ring');
  await sendMessage(own, ids.senderId, Uint8Array.of(4));
  const all = (await waitForNews(own, ids.recipientId, 30, now))!;
  assert.deepEqual(newsSince(now, all), { messages: 0, unmarked: all.unmarked, rings: 1 });
  assert.ok(all.unmarked >= 1);
  // Ended from this side: what was heard, again.
  const ending = new AbortController();
  const ended = waitForNews(own, ids.recipientId, 30, all, ending.signal);
  setTimeout(() => ending.abort(), 100);
  assert.deepEqual(await ended, all);
  // Nothing was taken; found empty, the round ends.
  assert.deepEqual(await receiveMessage(own, ids.recipientId), Uint8Array.of(1));
  while (await receiveMessage(own, ids.recipientId));
  assert.deepEqual(await waitForNews(own, ids.recipientId, 0, all), NO_NEWS);
  assert.ok(canTellNewsAt(own));
});

test('a relay from before waiting is asked plainly from then on, and one not there throws', { skip: !ready }, async () => {
  // As an older relay does: KEY is answered (it has none), anything it does not know closes the connection.
  const { Server } = createRequire(import.meta.url)('ws') as {
    Server: new (options: { port: number; host: string }) => {
      on(event: 'connection', listener: (socket: { on(e: 'message', l: (data: Buffer) => void): void; send(d: Uint8Array): void; terminate(): void }) => void): void;
      close(): void;
    };
  };
  const port = await freePort();
  const old = new Server({ port, host: '127.0.0.1' });
  old.on('connection', (socket) => socket.on('message', (data) => (data[0] === 5 ? socket.send(Uint8Array.of(1)) : socket.terminate())));
  try {
    const relay: Relay = { url: `ws://127.0.0.1:${port}` };
    assert.ok(canTellNewsAt(relay));
    assert.equal(await waitForNews(relay, new Uint8Array(24), 30, NO_NEWS), null);
    assert.equal(canTellNewsAt(relay), false);
    assert.ok(canWaitAt(relay));
    assert.equal(await waitForMessage(relay, new Uint8Array(24), 30), false);
    assert.equal(canWaitAt(relay), false);
  } finally {
    old.close();
  }
  await assert.rejects(waitForMessage({ url: `ws://127.0.0.1:${await freePort()}` }, new Uint8Array(24), 5), RelayUnreachableError);
});

test('only whole relay addresses are opened: the letters of one being typed are refused, never sent to the WebSocket', async () => {
  for (const good of [
    'ws://192.168.178.29:7879',
    'wss://erevos.lphl.nekten.eu',
    'wss://relay.example.org/erevos?x=1',
    'ws://localhost:7879',
    'ws://1',
    'ws://[::1]:7879',
    'ws://[2001:db8::7]',
    'ws://[::ffff:192.168.1.10]:80',
    'ws://[1:2:3:4:5:6:7:8]',
  ]) {
    assert.equal(isRelayAddress(good), true, good);
  }
  for (const bad of [
    '',
    'w',
    'ws',
    'ws:',
    'ws:/',
    'ws://',
    'wss://erevos.',
    'wss://erevos..eu',
    'ws://-a',
    'http://relay.example.org',
    'WSS://relay.example.org',
    ' ws://relay.example.org',
    'ws://relay example.org',
    'ws://user@relay.example.org',
    'ws://relay.example.org:0',
    'ws://relay.example.org:70000',
    'ws://relay.example.org:',
    'ws://[1:2:3]',
    'ws://[::1',
    'ws://[1::2::3]',
    'ws://[::ffff:1.2.3]',
    'ws://[::ffff:1.2.3.04]',
    `ws://${'a'.repeat(64)}.org`,
  ]) {
    assert.equal(isRelayAddress(bad), false, bad);
  }
  // Refused before any connection, and what waits for it waits for a fixed address.
  await assert.rejects(createQueue({ url: 'w' }), (error: unknown) => error instanceof BadRelayAddressError && canTryLater(error));
  await assert.rejects(sendMessage({ url: 'ws:/' }, new Uint8Array(24), new Uint8Array([1])), BadRelayAddressError);
});
