// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// Erevos on the same Wi-Fi (desktop/lan.js, the protocol the phone's LanLink.kt speaks too): two
// links on this computer find each other by UDP, link over TCP, and carry nearby messages
// (lib/nearby.ts), sealed by the real Rust core built to WebAssembly by checks/build-core.mjs. The
// checks with the core are skipped, with a note, when that build is missing.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createServer } from 'node:net';
import { after, test } from 'node:test';

import { setCore, type Core } from '../lib/core';
import { randomBytes } from '../lib/crypto';
import { E2E, toBase64Url, type Received } from '../lib/e2e';
import { Nearby } from '../lib/nearby';
import { files } from './files-memory';

const require = createRequire(import.meta.url);
type Lan = {
  start(): void;
  stop(): void;
  send(id: string, text: string): boolean;
  links: Map<string, unknown>;
  server: { address(): { port: number } | null };
};
const { Lan } = require('../../desktop/lan.js') as {
  Lan: new (options: {
    onLink: (id: string) => void;
    onGone: (id: string) => void;
    onText: (id: string, text: string) => void;
    udpPort: number;
    tcpPort: number;
    targets: () => { address: string; port: number }[];
  }) => Lan;
};

const built = new URL('./.core/erevos_ffi.js', import.meta.url);
const ready = existsSync(built);
if (ready) {
  const wasm = require(built.pathname) as Record<string, (...args: never[]) => unknown>;
  setCore(
    Object.fromEntries(Object.entries(wasm).map(([name, call]) => [name, async (...args: never[]) => call(...args)])) as unknown as Core,
  );
} else {
  console.log('Skipping the same Wi-Fi checks with the core: build it first with node checks/build-core.mjs');
}

function freePort(): Promise<number> {
  return new Promise((resolve) => {
    const server = createServer().listen(0, '127.0.0.1', () => {
      const { port } = server.address() as { port: number };
      server.close(() => resolve(port));
    });
  });
}

const until = async (what: string, done: () => boolean, within = 10_000) => {
  const start = Date.now();
  while (!done()) {
    if (Date.now() - start > within) throw new Error(`waited in vain for ${what}`);
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
};

const running: Lan[] = [];
after(() => running.forEach((lan) => lan.stop()));

/** A phone on the Wi-Fi: its link (as the desktop app has it) and the nearby messages over it. */
async function phones() {
  const [a, b] = [await freePort(), await freePort()];
  const one = (udpPort: number, other: number) => {
    const nearby = new Nearby();
    const came: { link: string; packet: Uint8Array }[] = [];
    const gone: string[] = [];
    const lan = new Lan({
      udpPort,
      tcpPort: 0,
      targets: () => [{ address: '127.0.0.1', port: other }],
      onLink: (id) => nearby.linkUp(id),
      onGone: (id) => gone.push(id),
      onText: (id, text) => {
        const packet = nearby.frameIn(id, text);
        if (packet) came.push({ link: id, packet });
      },
    });
    nearby.start((link, text) => lan.send(link, text));
    running.push(lan);
    lan.start();
    return { lan, nearby, came, gone };
  };
  return [one(a, b), one(b, a)] as const;
}

const message = (r: Received) => {
  assert.equal(r.kind, 'message');
  return r as Extract<Received, { kind: 'message' }>;
};

test('two Erevos on one Wi-Fi find each other and keep one link', async () => {
  const [a, b] = await phones();
  await until('the link', () => a.nearby.count() === 1 && b.nearby.count() === 1);
  // A few rounds later there is still one link each way, and it carries text both ways.
  await new Promise((resolve) => setTimeout(resolve, 3500));
  assert.equal(a.lan.links.size, 1);
  assert.equal(b.lan.links.size, 1);
  const [toB] = [...a.lan.links.keys()];
  assert.equal(a.lan.send(toB, 'not a sealed packet'), true);
  assert.equal(a.lan.send(toB, 'x'.repeat(17 * 1024)), false, 'larger than a frame');
  // One goes: the other's link to it goes too.
  b.lan.stop();
  await until('the link to go', () => a.gone.length === 1);
  assert.equal(a.lan.send(toB, 'hello?'), false);
  a.lan.stop();
});

test('with no relay and no internet, a message goes over the same Wi-Fi, end-to-end encrypted', { skip: !ready }, async () => {
  files.clear();
  const [a, b] = await phones();
  const alice = await E2E.open('space', 0, randomBytes(32));
  const bob = await E2E.open('space', 1, randomBytes(32));
  const { identity: bobId } = await alice.addContact({ senderHex: '', key: toBase64Url(bob.bundle) }, '');
  await until('the link', () => a.nearby.count() === 1 && b.nearby.count() === 1);

  const hi = await alice.seal(bobId, 'over the Wi-Fi, no internet', '');
  assert.equal(await a.nearby.deliver(bobId, [hi.first!, hi.packet], null), 'spread');
  await until('both packets', () => b.came.length === 2);
  const [hello, text] = b.came.splice(0);
  assert.equal(message(await bob.receive(hello.packet)).request, true);
  const got = message(await bob.receive(text.packet));
  assert.equal(got.text, 'over the Wi-Fi, no internet');

  // Bob answers on that link; from then on each goes straight to the other, a voice message too.
  b.nearby.heardOn(got.identity, text.link);
  await bob.acceptRequest(got.identity);
  const answer = await bob.seal(got.identity, 'got it', '', { got: [got.tag] });
  assert.equal(await b.nearby.deliver(got.identity, answer.first ? [answer.first, answer.packet] : [answer.packet], null), 'nearby');
  await until('the answer', () => a.came.length > 0);
  const back = a.came.splice(0);
  const answered = message(await alice.receive(back[back.length - 1].packet));
  assert.deepEqual([answered.text, answered.got], ['got it', [hi.tag]]);
  a.nearby.heardOn(bobId, back[0].link);
  const voice = await alice.sealVoice(bobId, randomBytes(40_000), 5000, '');
  assert.equal(await a.nearby.deliver(bobId, voice.packets, null), 'nearby');
  await until('the voice message', () => b.came.length === voice.packets.length);
  const opened = await Promise.all(b.came.map(({ packet }) => bob.receive(packet)));
  assert.equal(opened.filter((r) => r.kind === 'message' && r.voice).length, voice.packets.length);
  a.lan.stop();
  b.lan.stop();
});
