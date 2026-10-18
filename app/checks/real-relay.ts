// Real relays (crates/erevos-relay) for checks that go through one, started on free ports and
// stopped when the checks end. `ready` is false, with a note, when the relay is not built.
/// <reference types="node" />
import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createServer } from 'node:net';
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

after(() => {
  for (const relay of relays) relay.kill();
});

/** Starts a relay and returns its address once it answers. Node's WebSocket cannot send the
 *  token header that React Native's does, so it takes none. */
export async function startRelay(): Promise<string> {
  const [tcp, ws] = [await freePort(), await freePort()];
  const child = spawn(binary, [`127.0.0.1:${tcp}`, `127.0.0.1:${ws}`], { env: { ...process.env, EREVOS_RELAY_TOKEN: '' }, stdio: 'ignore' });
  relays.push(child);
  const url = `ws://127.0.0.1:${ws}`;
  for (let i = 0; i < 50; i++) {
    try {
      (await RelaySession.open({ url })).close();
      return url;
    } catch {
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  throw new Error(`the relay at ${url} did not start`);
}
