// The "Through Tor" switch (lib/relay.ts setThroughTor, lib/tor.ts): while it is on, every relay
// request goes to the core's Tor and never to a WebSocket of the phone's own, and a build without
// Tor fails the request rather than going around it. Tor itself (crates/erevos-tor) is not run here.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';

import { setCore, type Core } from '../lib/core';
import { createQueue, RelayError, RelaySession, setThroughTor } from '../lib/relay';
import { torStatus } from '../lib/tor';

type Seen = { what: string; url?: string; token?: string; bytes?: Uint8Array };

function fakeCore(seen: Seen[], tor: boolean): Core {
  const reply = new Uint8Array(49);
  const core: Partial<Core> = {};
  if (tor) {
    Object.assign(core, {
      torStart: async () => void seen.push({ what: 'start' }),
      torStatus: async () => JSON.stringify({ text: 'done', ready: true }),
      torStop: async () => undefined,
      torRequest: async (url: string, token: string, bytes: Uint8Array) => {
        seen.push({ what: 'request', url, token, bytes });
        return reply;
      },
      torOpen: async (url: string, token: string) => {
        seen.push({ what: 'open', url, token });
        return Uint8Array.of(0, 0, 0, 0, 0, 0, 0, 7);
      },
      torCall: async (_id: Uint8Array, bytes: Uint8Array) => {
        seen.push({ what: 'call', bytes });
        if (bytes[0] === 99) throw new Error('the relay closed the connection');
        return Uint8Array.of(0, bytes[0]);
      },
      torClose: async () => {
        seen.push({ what: 'close' });
        return new Uint8Array(0);
      },
    });
  }
  return core as Core;
}

// Any WebSocket of the phone's own while Tor is on is a leak.
(globalThis as { WebSocket?: unknown }).WebSocket = class {
  constructor() {
    throw new Error('a WebSocket was opened while Tor is on');
  }
};

afterEach(() => {
  setThroughTor(false);
  setCore(null);
});

test('through Tor, a request goes to the core with the relay and its token', async () => {
  const seen: Seen[] = [];
  setCore(fakeCore(seen, true));
  setThroughTor(true);
  await createQueue({ url: 'wss://relay.example.org', token: 't' });
  assert.equal(seen.length, 1);
  assert.equal(seen[0].what, 'request');
  assert.equal(seen[0].url, 'wss://relay.example.org');
  assert.equal(seen[0].token, 't');
  assert.deepEqual(seen[0].bytes, Uint8Array.of(1));
  assert.deepEqual(await torStatus(), { text: 'done', ready: true });
});

test('through Tor, a session takes its requests in order on one connection, and fails once lost', async () => {
  const seen: Seen[] = [];
  setCore(fakeCore(seen, true));
  setThroughTor(true);
  const session = await RelaySession.open({ url: 'ws://relay:7879' });
  const replies = await Promise.all([session.call(Uint8Array.of(1)), session.call(Uint8Array.of(2))]);
  assert.deepEqual(replies, [Uint8Array.of(0, 1), Uint8Array.of(0, 2)]);
  await assert.rejects(session.call(Uint8Array.of(99)), /Through Tor: the relay closed/);
  await assert.rejects(session.call(Uint8Array.of(3)), RelayError);
  session.close();
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.deepEqual(
    seen.map((s) => s.what),
    ['open', 'call', 'call', 'call', 'close'],
  );
  assert.equal(seen[0].token, '');
});

test('with Tor on, a build without Tor fails the request and does not go around it', async () => {
  setCore(fakeCore([], false));
  setThroughTor(true);
  await assert.rejects(createQueue({ url: 'ws://relay:7879' }), (error: unknown) => {
    assert.ok(error instanceof RelayError);
    assert.match(error.message, /no Tor/);
    return true;
  });
  await assert.rejects(RelaySession.open({ url: 'ws://relay:7879' }), /no Tor/);
  assert.equal(await torStatus(), null);
});
