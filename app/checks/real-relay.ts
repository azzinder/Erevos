// Real relays (crates/erevos-relay) for checks that go through one, started on free ports and
// stopped when the checks end. `ready` is false, with a note, when the relay is not built.
/// <reference types="node" />
import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after } from 'node:test';

import { relayPath, RelaySession } from '../lib/relay';

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
const byUrl = new Map<string, ChildProcess>();
let keys: string | null = null;

after(() => {
  for (const relay of relays) relay.kill();
  if (keys) rmSync(keys, { recursive: true, force: true });
});

/** Starts a relay and returns its address once it answers. Node's WebSocket cannot send the
 *  token header that React Native's does, so it takes none, unless given one (`token`), which
 *  goes as a browser's does. With `withKey`, it has a key for sealed sends, as relays that take
 *  messages from other relays do, and lends places, which a relay does only when turned on. With
 *  `push`, a key for Web Push too, so it reads what each send says it carries. All of them reach
 *  each other on 127.0.0.1, which a relay forwards to only when allowed private peers. `more`
 *  sets more of its settings; with a file of phones' tokens and no `token`, it is seen to answer on
 *  the /join path, which needs none. */
export async function startRelay(withKey = false, token = '', push = false, more: Record<string, string> = {}): Promise<string> {
  keys ??= withKey || push ? mkdtempSync(join(tmpdir(), 'erevos-relay-keys-')) : null;
  // A port found free may be taken by the time the relay binds it, and a busy machine (the CI's)
  // starts it slowly: one that stopped starts again on other ports, and each is waited for up to
  // 20 seconds.
  let url = '';
  for (let attempt = 0; attempt < 3; attempt++) {
    const [tcp, ws] = [await freePort(), await freePort()];
    const env = {
      ...process.env,
      EREVOS_RELAY_TOKEN: token,
      EREVOS_RELAY_KEY: withKey && keys ? join(keys, `key-${ws}`) : '',
      EREVOS_RELAY_LEND: withKey ? 'on' : '',
      EREVOS_RELAY_PUSH_KEY: push && keys ? join(keys, `push-${ws}`) : '',
      EREVOS_RELAY_PRIVATE_PEERS: 'allow',
      ...more,
    };
    const child = spawn(binary, [`127.0.0.1:${tcp}`, `127.0.0.1:${ws}`], { env, stdio: 'ignore' });
    relays.push(child);
    url = `ws://127.0.0.1:${ws}`;
    byUrl.set(url, child);
    const stopped = () => child.exitCode !== null || child.signalCode !== null;
    const probe = !token && more.EREVOS_RELAY_TOKENS ? relayPath(url, '/join') : { url, token: token || undefined };
    for (let i = 0; i < 200 && !stopped(); i++) {
      try {
        (await RelaySession.open(probe)).close();
        return url;
      } catch {
        await new Promise((r) => setTimeout(r, 100));
      }
    }
    if (!stopped()) break;
    byUrl.delete(url);
  }
  throw new Error(`the relay at ${url} did not start`);
}

/** Stops a relay startRelay started, as one that went away: nothing answers at its address after. */
export async function stopRelay(url: string): Promise<void> {
  const child = byUrl.get(url);
  if (!child || child.exitCode !== null) return;
  await new Promise<void>((done) => {
    child.once('exit', () => done());
    child.kill();
  });
}
