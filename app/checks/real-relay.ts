// Real relays (crates/erevos-relay) for checks that go through one, started on free ports and
// stopped when the checks end. `ready` is false, with a note, when the relay is not built.
/// <reference types="node" />
import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after } from 'node:test';

import { RelaySession } from '../lib/relay';

const binary = new URL('../../target/debug/erevos-relay', import.meta.url).pathname;
export const ready = existsSync(binary) && typeof WebSocket === 'function';

export function relayNote(what: string): void {
  if (!ready) console.log(`Skipping ${what}: build the relay first (cargo build -p erevos-relay)`);
}

function freePort(): Promise<number> {
  return new Promise((resolve) => {
    const server = createServer().listen(0, '127.0.0.1', () => {
      const { port } = server.address() as { port: number };
      server.close(() => resolve(port));
    });
  });
}

const relays: ChildProcess[] = [];
let keys: string | null = null;

after(() => {
  for (const relay of relays) relay.kill();
  if (keys) rmSync(keys, { recursive: true, force: true });
});

/** Starts a relay and returns its address once it answers. Node's WebSocket cannot send the
 *  token header that React Native's does, so it takes none, unless given one (`token`), which
 *  goes as a browser's does. With `withKey`, it has a key for sealed sends, as relays that take
 *  messages from other relays do, and lends places. All of them reach each other on 127.0.0.1,
 *  which a relay forwards to only when allowed private peers. */
export async function startRelay(withKey = false, token = ''): Promise<string> {
  const [tcp, ws] = [await freePort(), await freePort()];
  keys ??= withKey ? mkdtempSync(join(tmpdir(), 'erevos-relay-keys-')) : null;
  const env = {
    ...process.env,
    EREVOS_RELAY_TOKEN: token,
    EREVOS_RELAY_KEY: withKey && keys ? join(keys, `key-${ws}`) : '',
    EREVOS_RELAY_PRIVATE_PEERS: 'allow',
  };
  const child = spawn(binary, [`127.0.0.1:${tcp}`, `127.0.0.1:${ws}`], { env, stdio: 'ignore' });
  relays.push(child);
  const url = `ws://127.0.0.1:${ws}`;
  for (let i = 0; i < 50; i++) {
    try {
      (await RelaySession.open({ url, token: token || undefined })).close();
      return url;
    } catch {
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  throw new Error(`the relay at ${url} did not start`);
}
