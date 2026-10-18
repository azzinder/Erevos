// Messages over the nearby radio link (lib/nearby.ts), with the real Rust core built to
// WebAssembly by checks/build-core.mjs and phones joined by a radio in memory: the same sealed
// packets as through the relay, in frames the radio carries, to a contact heard nearby or to
// every phone linked, and kept for another space when none of the open chats opens them. When the
// relay cannot be reached, the phones nearby carry them, sealed for the contact's relay, and hand
// them over through their own, a real relay (crates/erevos-relay). The checks with the core or the
// relay are skipped, with a note, when that build is missing.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';

import { othersCarried, ownCarried } from '../lib/carried-store';
import { contactLink, parseContact } from '../lib/contact-code';
import { setCore, type Core } from '../lib/core';
import { randomBytes, toBase64 } from '../lib/crypto';
import { E2E, toBase64Url, type Received } from '../lib/e2e';
import { framesOf, Nearby, NoWayError, type Carried } from '../lib/nearby';
import { carryTo, createQueue, receiveMessage, relayKey, toHex } from '../lib/relay';
import { carriedFor } from '../lib/space-chats';
import { files } from './files-memory';
import { ready as relayReady, relayNote, startRelay } from './real-relay';

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
relayNote('the checks of messages carried to a relay');

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
  // `again` names the link anew, as when two phones link a second time.
  const link = (a: string, b: string, again = '') => {
    const [ab, ba] = [`ble-link-${b}${again}`, `ble-link-${a}${again}`];
    ends.set(`${a} ${ab}`, { to: b, as: ba });
    ends.set(`${b} ${ba}`, { to: a, as: ab });
    phones.get(a)!.nearby.linkUp(ab);
    phones.get(b)!.nearby.linkUp(ba);
  };
  const drop = (name: string) => {
    phones.get(name)!.up = false;
  };
  return { phone, link, drop };
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

const DAY = 24 * 3600 * 1000;

test('what could not go is carried by the phones nearby, two more at most, and handed to its relay in order', async () => {
  const { phone, link } = room();
  const [a, c, d, e] = ['A', 'C', 'D', 'E'].map(phone);
  link('A', 'C');
  const sealed = [randomBytes(300), randomBytes(300)];
  const carry = async (): Promise<Carried[]> => sealed.map((s) => ({ url: 'ws://relay.example:7879', sealed: s }));
  // No relay, and no contact heard nearby: it goes to every phone, and they carry it too.
  assert.equal(await a.nearby.deliver('bb', [randomBytes(100), randomBytes(100)], null, carry), 'carried');
  assert.deepEqual(a.nearby.carriedCount(), { own: 2, others: 0 });
  assert.deepEqual(c.nearby.carriedCount(), { own: 0, others: 2 });
  // A relay that answers needs no carrying; nor does a mark, which comes with no `carry`.
  assert.equal(await a.nearby.deliver('bb', [randomBytes(100)], async () => undefined, carry), 'relay');
  assert.equal(await a.nearby.deliver('bb', [randomBytes(100)], null), 'spread');
  assert.deepEqual(c.nearby.carriedCount(), { own: 0, others: 2 });

  // C meets D later: D takes them, and passes them on to nobody, as they have come far enough.
  link('C', 'D');
  assert.deepEqual(d.nearby.carriedCount(), { own: 0, others: 2 });
  link('D', 'E');
  assert.deepEqual(e.nearby.carriedCount(), { own: 0, others: 0 });
  // The phone that sent them, linked again, does not take them back as someone else's.
  link('C', 'A', '-again');
  assert.deepEqual(a.nearby.carriedCount(), { own: 2, others: 0 });

  // C reaches its relay: the first that cannot go holds the next one for that relay back, so they come in order.
  const handed: string[] = [];
  let up = false;
  const upload = async (url: string, s: Uint8Array) => {
    if (!up) throw new Error('cannot reach the relay');
    handed.push(`${url} ${toBase64(s)}`);
    return true;
  };
  assert.equal(await c.nearby.uploadCarried(upload, 1000), 0);
  up = true;
  assert.equal(await c.nearby.uploadCarried(upload, 30_000), 0, 'tried again only after a minute');
  assert.equal(await c.nearby.uploadCarried(upload, 61_001), 2);
  assert.deepEqual(handed, sealed.map((s) => `ws://relay.example:7879 ${toBase64(s)}`));
  assert.deepEqual(c.nearby.carriedCount(), { own: 0, others: 0 });
  // One its relay will never take is let go too.
  assert.equal(await d.nearby.uploadCarried(async () => false), 0);
  assert.deepEqual(d.nearby.carriedCount(), { own: 0, others: 0 });
  // The sender's own go once it reaches the relay, or after three days, unless a carrier was first.
  assert.deepEqual(a.nearby.carriedCount(Date.now() + 3 * DAY + 1000), { own: 0, others: 0 });
});

test('a phone that carries nothing for others takes nothing, and nonsense is not carried', async () => {
  const { phone, link } = room();
  const [a, c] = ['A', 'C'].map(phone);
  c.nearby.setCarrying(false);
  link('A', 'C');
  const carry = async (): Promise<Carried[]> => [{ url: 'ws://relay.example:7879', sealed: randomBytes(200) }];
  assert.equal(await a.nearby.deliver('bb', [randomBytes(100)], null, carry), 'carried');
  assert.deepEqual(c.nearby.carriedCount(), { own: 0, others: 0 });
  assert.deepEqual(a.nearby.carriedCount(), { own: 1, others: 0 }, 'its own still waits for the relay');
  // Turned on again, it takes what comes from then on.
  c.nearby.setCarrying(true);
  for (const url of ['http://relay.example', 'ws://', 'ws://a b']) {
    const bytes = new Uint8Array(7 + url.length + 10);
    new DataView(bytes.buffer).setUint32(1, 3600);
    new DataView(bytes.buffer).setUint16(5, url.length);
    for (let i = 0; i < url.length; i++) bytes[7 + i] = url.charCodeAt(i);
    for (const frame of framesOf(bytes, 'EVC1')!) assert.equal(c.nearby.frameIn('ble-link-A', frame), null);
  }
  assert.deepEqual(c.nearby.carriedCount(), { own: 0, others: 0 });
  // One phone cannot fill another with what it carries.
  const many = async (): Promise<Carried[]> => Array.from({ length: 40 }, () => ({ url: 'ws://relay.example:7879', sealed: randomBytes(50) }));
  await a.nearby.deliver('bb', [randomBytes(100)], null, many);
  assert.equal(c.nearby.carriedCount().others, 30);
});

test('what a phone carries stays when Erevos closes: for others on the phone, its own in their space only', async () => {
  files.clear();
  const { phone, link } = room();
  const [a, c] = ['A', 'C'].map(phone);
  const spaceKey = randomBytes(32);
  const leaveSpace = a.nearby.keepOwnIn(ownCarried(0, spaceKey));
  await c.nearby.keepOthersIn(othersCarried());
  link('A', 'C');
  const sealed = [randomBytes(300), randomBytes(300)];
  const carry = async (): Promise<Carried[]> => sealed.map((s) => ({ url: 'ws://relay.example:7879', sealed: s }));
  assert.equal(await a.nearby.deliver('bb', [randomBytes(100), randomBytes(100)], null, carry), 'carried');
  await a.nearby.carriedSaved();
  await c.nearby.carriedSaved();
  // Sealed on the phone: the packets are not in its files as they went.
  for (const text of files.values()) for (const s of sealed) assert.ok(!text.includes(toBase64(s)));
  // Its space closes: its own leave memory with it.
  leaveSpace();
  await a.nearby.carriedSaved();
  assert.deepEqual(a.nearby.carriedCount(), { own: 0, others: 0 });

  // Erevos opens again on both phones. Another space, or the same with another key, has none.
  const [a2, c2, d] = ['A2', 'C2', 'D'].map(phone);
  for (const [space, key] of [[1, spaceKey], [0, randomBytes(32)]] as const) {
    const leave = a2.nearby.keepOwnIn(ownCarried(space, key));
    await a2.nearby.carriedSaved();
    assert.deepEqual(a2.nearby.carriedCount(), { own: 0, others: 0 });
    leave();
  }
  const leaveAgain = a2.nearby.keepOwnIn(ownCarried(0, spaceKey));
  await c2.nearby.keepOthersIn(othersCarried());
  await a2.nearby.carriedSaved();
  assert.deepEqual(a2.nearby.carriedCount(), { own: 2, others: 0 });
  assert.deepEqual(c2.nearby.carriedCount(), { own: 0, others: 2 });
  // They go on as before: to a phone met later, in order, and to the relay.
  link('C2', 'D');
  assert.deepEqual(d.nearby.carriedCount(), { own: 0, others: 2 });
  const handed: string[] = [];
  assert.equal(await a2.nearby.uploadCarried(async (_url, s) => handed.push(toBase64(s)) > 0), 2);
  assert.deepEqual(handed, sealed.map(toBase64));
  leaveAgain();
  // Gone once handed over, and what was kept for others once carrying for them is turned off.
  c2.nearby.setCarrying(false);
  await a2.nearby.carriedSaved();
  await c2.nearby.carriedSaved();
  const [a3, c3] = ['A3', 'C3'].map(phone);
  a3.nearby.keepOwnIn(ownCarried(0, spaceKey));
  await c3.nearby.keepOthersIn(othersCarried());
  await a3.nearby.carriedSaved();
  assert.deepEqual(a3.nearby.carriedCount(), { own: 0, others: 0 });
  assert.deepEqual(c3.nearby.carriedCount(), { own: 0, others: 0 });
});

test('with no relay to reach, a phone nearby carries the message to the contact\'s relay, end-to-end encrypted', { skip: !ready || !relayReady }, async () => {
  files.clear();
  // Bob's relay has a key, so it takes sealed sends from other relays; Carol's relay is another one.
  const bobsRelay = await startRelay(true);
  const carolsRelay = await startRelay();
  const { phone, link } = room();
  const a = phone('A');
  const c = phone('C');
  const alice = await E2E.open('space', 0, randomBytes(32));
  const bob = await E2E.open('space', 1, randomBytes(32));
  const queue = await createQueue({ url: bobsRelay });
  const key = await relayKey({ url: bobsRelay });
  assert.ok(key);
  const code = parseContact(contactLink({ senderHex: toHex(queue.senderId), relayUrl: bobsRelay, key: toBase64Url(bob.bundle), relayKey: toBase64Url(key!) }))!;
  const { identity: bobId } = await alice.addContact(code, '');

  // Alice's relay does not answer, and Bob is not near: Carol's phone is.
  link('A', 'C');
  const sealed = await alice.seal(bobId, 'carried by Carol', '');
  const all = [sealed.first!, sealed.packet];
  const down = async () => {
    throw new Error('cannot reach the relay');
  };
  const way = await a.nearby.deliver(bobId, all, down, () => carriedFor(sealed, all, { url: '', key: '' }));
  assert.equal(way, 'carried');
  assert.deepEqual(c.nearby.carriedCount(), { own: 0, others: 2 });

  // Carol's phone reaches her relay, which passes them on to Bob's: her phone's address stays with hers.
  assert.equal(await c.nearby.uploadCarried((url, s) => carryTo({ url: carolsRelay }, url, s)), 2);
  const first = await receiveMessage({ url: bobsRelay }, queue.recipientId);
  const second = await receiveMessage({ url: bobsRelay }, queue.recipientId);
  assert.equal(message(await bob.receive(first!)).request, true);
  assert.equal(message(await bob.receive(second!)).text, 'carried by Carol');

  // Alice's phone reaches Bob's relay itself later, as his relay is hers too: that copy opens no second time.
  assert.equal(await a.nearby.uploadCarried((url, s) => carryTo({ url: bobsRelay }, url, s)), 2);
  for (let i = 0; i < 2; i++) {
    const again = await receiveMessage({ url: bobsRelay }, queue.recipientId);
    assert.equal((await bob.receive(again!)).kind, 'refused');
  }
  assert.equal(await receiveMessage({ url: bobsRelay }, queue.recipientId), null);

  // Sealed for the wrong relay, or a queue that is not there: that relay never takes it, and it is let go.
  assert.equal(await carryTo({ url: carolsRelay }, carolsRelay, randomBytes(120)), false);
  // A contact whose link has no key for their relay cannot be carried for.
  assert.deepEqual(await carriedFor({ ...sealed, relayKey: '' }, all, { url: '', key: '' }), []);
});
