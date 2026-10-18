// Messages over the nearby radio link (lib/nearby.ts), with the real Rust core built to
// WebAssembly by checks/build-core.mjs and two phones joined by a radio in memory: the same sealed
// packets as through the relay, in frames the radio carries, to a contact heard nearby or to
// every phone linked, and kept for another space when none of the open chats opens them. The
// checks with the core are skipped, with a note, when that build is missing.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';

import { contactLink, parseContact } from '../lib/contact-code';
import { setCore, type Core } from '../lib/core';
import { randomBytes } from '../lib/crypto';
import { E2E, toBase64Url, type Received } from '../lib/e2e';
import { framesOf, Nearby, NoWayError } from '../lib/nearby';
import { files } from './files-memory';

const built = new URL('./.core/erevos_ffi.js', import.meta.url);
const ready = existsSync(built);
if (ready) {
  const wasm = createRequire(import.meta.url)(built.pathname) as Record<string, (...args: never[]) => unknown>;
  setCore(
    Object.fromEntries(Object.entries(wasm).map(([name, call]) => [name, async (...args: never[]) => call(...args)])) as unknown as Core,
  );
} else {
  console.log('Skipping the nearby checks with the core: build it first with node checks/build-core.mjs');
}

/** Phones in one room: what one sends on a link comes out of the phone at its other end. */
function room() {
  const phones = new Map<string, { nearby: Nearby; came: { link: string; packet: Uint8Array }[]; up: boolean }>();
  // Each link id is the one the phone at that end calls it by, as the radio names them.
  const ends = new Map<string, { to: string; as: string }>();
  const phone = (name: string) => {
    const nearby = new Nearby();
    const kept = { nearby, came: [] as { link: string; packet: Uint8Array }[], up: true };
    phones.set(name, kept);
    nearby.start((link, text) => {
      const end = ends.get(`${name} ${link}`);
      const there = end ? phones.get(end.to) : undefined;
      if (!end || !there?.up) return false;
      const packet = there.nearby.frameIn(end.as, text);
      if (packet) there.came.push({ link: end.as, packet });
      return true;
    });
    return kept;
  };
  const link = (a: string, b: string) => {
    const [ab, ba] = [`ble-link-${b}`, `ble-link-${a}`];
    ends.set(`${a} ${ab}`, { to: b, as: ba });
    ends.set(`${b} ${ba}`, { to: a, as: ab });
    phones.get(a)!.nearby.linkUp(ab);
    phones.get(b)!.nearby.linkUp(ba);
  };
  return { phone, link };
}

const message = (r: Received) => {
  assert.equal(r.kind, 'message');
  return r as Extract<Received, { kind: 'message' }>;
};

test('a packet goes in frames the radio carries, and comes out whole once', () => {
  const nearby = new Nearby();
  const big = randomBytes(30_000);
  const frames = framesOf(big)!;
  assert.equal(frames.length, 3);
  assert.ok(frames.every((frame) => frame.length < 16 * 1024 && frame.startsWith('EVN1:')));
  assert.equal(nearby.frameIn('ble-link-1', frames[2]), null);
  assert.equal(nearby.frameIn('ble-link-1', frames[0]), null);
  assert.deepEqual(nearby.frameIn('ble-link-1', frames[1]), big);
  // The same packet on another link is not tried again.
  assert.equal(nearby.frameIn('aware-2', framesOf(big)!.join('')), null);
  for (const frame of framesOf(big)!) assert.equal(nearby.frameIn('aware-2', frame), null);
  // Plain text from an older Erevos, and pieces of different packets, are nothing.
  assert.equal(nearby.frameIn('ble-link-1', 'hello from 10:00'), null);
  assert.equal(nearby.frameIn('ble-link-1', 'EVN1:00000000:0:1:!!!'), null);
  assert.equal(framesOf(randomBytes(100_000)), null, 'too large for the radio');
});

test('with no relay and no link nothing goes; a link that dropped is let go', async () => {
  const nearby = new Nearby();
  let up = true;
  nearby.start(() => up);
  await assert.rejects(nearby.deliver('aa', [randomBytes(100)], null), NoWayError);
  nearby.linkUp('ble-link-1');
  assert.equal(await nearby.deliver('aa', [randomBytes(100)], null), 'spread');
  nearby.heardOn('aa', 'ble-link-1');
  assert.equal(nearby.isNear('aa'), true);
  up = false;
  await assert.rejects(nearby.deliver('aa', [randomBytes(100)], null), NoWayError);
  assert.equal(nearby.isNear('aa'), false);
  assert.equal(nearby.count(), 0);
});

test('the relay is waited for unless the contact is nearby, and a copy nearby stands in when it fails', async () => {
  const nearby = new Nearby();
  nearby.start(() => true);
  const relayDown = async () => {
    throw new Error('cannot reach the relay');
  };
  let relayed = 0;
  const relay = async () => {
    relayed++;
  };
  await assert.rejects(nearby.deliver('aa', [randomBytes(100)], relayDown), /cannot reach/);
  nearby.linkUp('ble-link-1');
  assert.equal(await nearby.deliver('aa', [randomBytes(100)], relay), 'relay');
  assert.equal(await nearby.deliver('aa', [randomBytes(100)], relayDown), 'spread');
  // A voice message's long parts go only to a contact heard nearby, never to every phone.
  await assert.rejects(nearby.deliver('aa', [randomBytes(12_000)], relayDown), /cannot reach/);
  nearby.heardOn('aa', 'ble-link-1');
  assert.equal(await nearby.deliver('aa', [randomBytes(12_000)], relayDown), 'nearby');
  // Nearby, the relay's copy goes too.
  assert.equal(await nearby.deliver('aa', [randomBytes(100)], relay), 'nearby');
  assert.equal(relayed, 2);
});

test('packets for none of the open chats are kept a while, once each', () => {
  const nearby = new Nearby();
  const a = randomBytes(50);
  const b = randomBytes(50);
  nearby.hold(a, 1000);
  nearby.hold(b, 2000);
  nearby.hold(a, 3000);
  assert.deepEqual(nearby.heldPackets(3000), [b, a]);
  nearby.dropHeld(b);
  assert.deepEqual(nearby.heldPackets(3000), [a]);
  assert.deepEqual(nearby.heldPackets(3000 + 7 * 3600 * 1000), []);
});

test('two phones with no relay add each other by QR and talk nearby, end-to-end encrypted', { skip: !ready }, async () => {
  files.clear();
  const { phone, link } = room();
  const a = phone('A');
  const b = phone('B');
  const stranger = phone('C');
  const alice = await E2E.open('space', 0, randomBytes(32));
  const bob = await E2E.open('space', 1, randomBytes(32));
  const other = await E2E.open('space', 2, randomBytes(32));

  // Bob has no relay queue: his link has only his keys.
  const bobLink = contactLink({ senderHex: '', relayUrl: '', key: toBase64Url(bob.bundle) });
  const code = parseContact(bobLink)!;
  assert.deepEqual(code, { senderHex: '', relayUrl: '', key: toBase64Url(bob.bundle) });
  assert.equal(parseContact('erevos://contact?id=&relay='), null, 'no keys, no contact');
  const { identity: bobId } = await alice.addContact(code, '');
  assert.deepEqual(alice.pending(), [], 'nothing waits for a relay');

  // Alice's phone is linked to Bob's and to a stranger's; it does not know which is which.
  link('A', 'B');
  link('A', 'C');
  const hi = await alice.seal(bobId, 'hi Bob, no internet here', '');
  assert.equal(hi.sender, '');
  assert.ok(hi.first);
  assert.equal(await a.nearby.deliver(bobId, [hi.first!, hi.packet], null), 'spread');

  // The stranger gets bytes it cannot open, and keeps them for its other spaces.
  assert.equal(stranger.came.length, 2);
  for (const { packet } of stranger.came) {
    const opened = await other.receive(packet);
    assert.deepEqual(opened, { kind: 'refused', reason: 'unknown' });
    stranger.nearby.hold(packet);
  }
  assert.equal(stranger.nearby.heldPackets().length, 2);

  // Bob's phone opens them: a request from Alice, then her message. It came on Alice's link.
  const [hello, text] = b.came.splice(0);
  const request = message(await bob.receive(hello.packet));
  assert.equal(request.request, true);
  const got = message(await bob.receive(text.packet));
  assert.equal(got.text, 'hi Bob, no internet here');
  b.nearby.heardOn(got.identity, text.link);
  assert.equal(b.nearby.isNear(got.identity), true);

  // Bob answers on that link only: the stranger gets nothing more.
  await bob.acceptRequest(got.identity);
  const answer = await bob.seal(got.identity, 'hi Alice', '', { got: [got.tag] });
  assert.equal(await b.nearby.deliver(got.identity, answer.first ? [answer.first, answer.packet] : [answer.packet], null), 'nearby');
  assert.equal(stranger.came.length, 2);
  const [back] = a.came.splice(0);
  const answered = message(await alice.receive(back.packet));
  assert.deepEqual([answered.text, answered.got], ['hi Alice', [hi.tag]]);
  a.nearby.heardOn(bobId, back.link);

  // From now on Alice's messages go to Bob's phone alone, a voice message's long parts too.
  const voice = await alice.sealVoice(bobId, randomBytes(25_000), 3000, '');
  assert.equal(await a.nearby.deliver(bobId, voice.first ? [voice.first, ...voice.packets] : voice.packets, null), 'nearby');
  assert.equal(stranger.came.length, 2);
  const parts = b.came.splice(0);
  assert.equal(parts.length, voice.packets.length + (voice.first ? 1 : 0));
  const opened = await Promise.all(parts.map(({ packet }) => bob.receive(packet)));
  assert.equal(opened.filter((r) => r.kind === 'message' && r.voice).length, voice.packets.length);
});

test('a packet for another space waits on the phone until that space opens', { skip: !ready }, async () => {
  files.clear();
  const { phone, link } = room();
  const a = phone('A');
  const b = phone('B');
  const alice = await E2E.open('space', 0, randomBytes(32));
  // Bob's phone has two spaces; Alice is a contact in the second one, which is not open.
  const first = await E2E.open('space', 1, randomBytes(32));
  const second = await E2E.open('space', 2, randomBytes(32));
  const { identity } = await alice.addContact({ senderHex: '', key: toBase64Url(second.bundle) }, '');
  link('A', 'B');
  const sealed = await alice.seal(identity, 'for your second space', '');
  await a.nearby.deliver(identity, [sealed.first!, sealed.packet], null);
  for (const { packet } of b.came) {
    assert.deepEqual(await first.receive(packet), { kind: 'refused', reason: 'unknown' });
    b.nearby.hold(packet);
  }
  // The second space opens: what was kept for it opens there, in order.
  const texts: string[] = [];
  for (const packet of b.nearby.heldPackets()) {
    const received = await second.receive(packet);
    if (received.kind === 'message') {
      b.nearby.dropHeld(packet);
      texts.push(received.text);
    }
  }
  assert.deepEqual(texts, ['', 'for your second space']);
  assert.deepEqual(b.nearby.heldPackets(), []);
});
