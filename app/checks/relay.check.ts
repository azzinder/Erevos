// Two-hop sending (lib/relay.ts) against two real relays (crates/erevos-relay) and the real core
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
import { createQueue, receiveMessage, relayKey, RelayError, sendMessage, type Relay } from '../lib/relay';

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

/** Starts a relay and returns its WebSocket address once it answers. */
async function startRelay(key: boolean): Promise<string> {
  const [tcp, ws] = [await freePort(), await freePort()];
  const env = { ...process.env, EREVOS_RELAY_KEY: key ? join(dir, `key-${ws}`) : '' };
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
