// Two-hop sending, call relay credentials and waiting for a message (lib/relay.ts) against two real relays (crates/erevos-relay) and the real core
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
  canTryLater,
  canWaitAt,
  createQueue,
  isRelayAddress,
  receiveMessage,
  relayKey,
  RelayError,
  RelayUnreachableError,
  sendMessage,
  waitForMessage,
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
 *  for sealed sends and a call relay beside it. Both forward to each other on 127.0.0.1, which a
 *  relay does only when allowed private peers. */
async function startRelay(key: boolean): Promise<string> {
  const [tcp, ws] = [await freePort(), await freePort()];
  const env = {
    ...process.env,
    EREVOS_RELAY_KEY: key ? join(dir, `key-${ws}`) : '',
    EREVOS_TURN_URLS: key ? 'turn:127.0.0.1:3478,turn:127.0.0.1:3478?transport=tcp' : '',
    EREVOS_TURN_SECRET: key ? 'secret' : '',
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
