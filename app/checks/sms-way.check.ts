// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// Encrypted messages by SMS when nothing else takes them (lib/sms-packets.ts, lib/sms-way.ts,
// lib/nearby.ts): the pieces a message goes in and how they come back together, what is dropped
// (pieces changed, put in, too old, too many), when the SMS way is used and when not, and two
// phones whose SMS ports hand each other data SMS, with packets sealed by the real Rust core built
// to WebAssembly by checks/build-core.mjs. The checks with the core are skipped, with a note, when
// that build is missing.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';

import { setCore, type Core } from '../lib/core';
import { randomBytes, toBase64 } from '../lib/crypto';
import { E2E, toBase64Url, type Received } from '../lib/e2e';
import { Nearby, NoWayError, TooLargeForSmsError, type SmsWay } from '../lib/nearby';
import { GATHER_WITHIN, gatherSmsPieces, MAX_GATHERING, MAX_SMS_BYTES, MAX_SMS_PIECES, packetsOfWhole, PIECE, smsPiecesOf, smsWhole, type SmsPiece } from '../lib/sms-packets';
import { SmsWayRunner, type SmsPort, type SmsWaySettings } from '../lib/sms-way';
import { EMPTY_SMS, loadSmsData, saveSmsData } from '../lock/sms-data';
import { SmsLink } from '../lib/sms-link';
import { files } from './files-memory';

const built = new URL('./.core/erevos_ffi.js', import.meta.url);
const ready = existsSync(built);
if (ready) {
  const wasm = createRequire(import.meta.url)(built.pathname) as Record<string, (...args: never[]) => unknown>;
  setCore(Object.fromEntries(Object.entries(wasm).map(([name, call]) => [name, async (...args: never[]) => call(...args)])) as unknown as Core);
} else {
  console.log('Skipping the SMS checks with the core: build it first with node checks/build-core.mjs');
}

const NOW = 1_800_000_000_000;
let next = 1;
const came = (from: string, pieces: Uint8Array[], at = NOW): SmsPiece[] => pieces.map((data) => ({ n: next++, from, data, at }));

test('a message goes in data SMS of at most 133 bytes, and comes back whole, in any order', () => {
  const short = randomBytes(314);
  const pieces = smsPiecesOf([short])!;
  assert.equal(pieces.length, 3, 'a short text takes 3 SMS');
  assert.ok(pieces.every((p) => p.length <= PIECE));
  assert.equal(smsPiecesOf([randomBytes(360)])!.length, 3, 'also once both phones wrote');
  assert.equal(smsPiecesOf([randomBytes(1128)])!.length, MAX_SMS_PIECES, 'a longer text takes 10');
  const two = [randomBytes(40), randomBytes(500)];
  const parts = came('+306900000001', smsPiecesOf(two)!).reverse();
  const { came: whole, done } = gatherSmsPieces(parts, NOW);
  assert.equal(whole.length, 1);
  assert.deepEqual(whole[0].packets, two, 'its packets, in the order they went');
  assert.equal(whole[0].from, '+306900000001');
  assert.deepEqual(done.sort(), parts.map((p) => p.n).sort(), 'its pieces can be forgotten');
});

test('too much for SMS goes in none, and what is no message is not taken for one', () => {
  assert.equal(smsPiecesOf([randomBytes(1472), randomBytes(314)]), null, "a conversation's first packet with a text is too much");
  assert.equal(smsPiecesOf([randomBytes(MAX_SMS_BYTES)]), null);
  assert.equal(smsPiecesOf([]), null);
  assert.equal(smsWhole([new Uint8Array(0)]), null);
  assert.equal(packetsOfWhole(new Uint8Array([0, 5, 1, 2])), null, 'a length past the end');
  assert.equal(packetsOfWhole(new Uint8Array([0, 0])), null, 'an empty packet');
  // An invite's piece, plain bytes, an unknown version, a count past the most: forgotten at once.
  const junk = came('x', [new Uint8Array([0x45, 1, 0, 0, 0, 0, 0, 1, 9]), randomBytes(20), new Uint8Array([0x50, 2, 1, 2, 3, 4, 0, 1, 7]), new Uint8Array([0x50, 1, 1, 2, 3, 4, 0, 40, 7])]);
  const { came: none, done } = gatherSmsPieces(junk, NOW);
  assert.deepEqual(none, []);
  assert.equal(done.length, 4);
});

test('pieces wait for the rest a while, and only so many messages wait', () => {
  const message = smsPiecesOf([randomBytes(700)])!;
  const first = came('a', message.slice(0, 3));
  const waiting = gatherSmsPieces(first, NOW + 1000);
  assert.deepEqual(waiting.came, []);
  assert.deepEqual(waiting.done, [], 'they stay kept until the rest comes');
  const rest = came('a', message.slice(3));
  assert.equal(gatherSmsPieces([...first, ...rest], NOW + 2000).came.length, 1);
  // The same pieces from another number are not this message's.
  assert.equal(gatherSmsPieces([...first, ...came('b', message.slice(3))], NOW + 2000).came.length, 0);
  // Too old, they are let go.
  const old = gatherSmsPieces(first, NOW + GATHER_WITHIN + 1);
  assert.deepEqual(old.done.sort(), first.map((p) => p.n).sort());
  // More messages waiting than MAX_GATHERING: the oldest go.
  const many = Array.from({ length: MAX_GATHERING + 3 }, (_, i) => came(`+30${i}`, smsPiecesOf([randomBytes(400)])!.slice(0, 1), NOW + i));
  const crowded = gatherSmsPieces(many.flat(), NOW + 100);
  assert.deepEqual(crowded.done.sort(), many.slice(0, 3).flat().map((p) => p.n).sort());
});

test('a piece changed or put in by someone else spoils the message, which is dropped, not opened', () => {
  const pieces = smsPiecesOf([randomBytes(314)])!;
  // One byte of the second piece changed on the way.
  const changed = pieces.map((p, i) => (i === 1 ? Uint8Array.from(p, (b, j) => (j === 20 ? b ^ 1 : b)) : p));
  const one = gatherSmsPieces(came('a', changed), NOW);
  assert.deepEqual(one.came, []);
  assert.equal(one.done.length, 3, 'its pieces are forgotten');
  // Another second piece, beside the real one, with the same id: the message is dropped.
  const forged = Uint8Array.from(pieces[1]);
  forged[30] ^= 0xff;
  const two = gatherSmsPieces(came('a', [pieces[0], forged, pieces[1], pieces[2]]), NOW);
  assert.deepEqual(two.came, []);
  assert.equal(two.done.length, 4);
  // A piece that says another count.
  const counted = Uint8Array.from(pieces[2]);
  counted[7] = 4;
  assert.deepEqual(gatherSmsPieces(came('a', [pieces[0], pieces[1], counted]), NOW).came, []);
});

// A way that sends what it is given to `sent`, for whom `on` says.
function smsWay(on: (identity: string) => boolean, sent: Uint8Array[][], fails = false): SmsWay {
  return {
    can: on,
    send: async (identity, packets) => {
      if (!on(identity)) return false;
      if (fails) throw new Error('No signal');
      sent.push(packets);
      return true;
    },
  };
}

const down = async (): Promise<void> => {
  throw new Error('Relay unreachable');
};

test('SMS is the last way: only for texts, only when on for them, only when nothing else took it', async () => {
  const nearby = new Nearby();
  const sent: Uint8Array[][] = [];
  nearby.smsWay = smsWay((identity) => identity === 'alice', sent);
  const text = [randomBytes(314)];
  // The relay takes it: no SMS.
  assert.equal(await nearby.deliver('alice', text, async () => undefined, null, true), 'relay');
  assert.equal(await nearby.deliver('alice', text, async () => 'nostr', null, true), 'nostr');
  assert.equal(sent.length, 0);
  // Nothing else takes it: by SMS.
  assert.equal(await nearby.deliver('alice', text, down, null, true), 'sms');
  assert.equal(await nearby.deliver('alice', text, null, null, true), 'sms');
  assert.equal(sent.length, 2);
  // Not a text (a mark, a call's word): never by SMS.
  await assert.rejects(nearby.deliver('alice', text, down, null, false), /Relay unreachable/);
  // Not on for them.
  await assert.rejects(nearby.deliver('bob', text, down, null, true), /Relay unreachable/);
  await assert.rejects(nearby.deliver('bob', text, null, null, true), NoWayError);
  // Too large: said so, with what the relay said, so it can wait.
  const large = await nearby.deliver('alice', [randomBytes(1472), randomBytes(314)], down, null, true).catch((error: unknown) => error);
  assert.ok(large instanceof TooLargeForSmsError);
  assert.match(String(large.relayError), /Relay unreachable/);
  assert.equal(sent.length, 2);
  // A phone nearby linked: it takes it, not SMS.
  const frames: string[] = [];
  const stop = nearby.start((_link, frame) => {
    frames.push(frame);
    return true;
  });
  nearby.linkUp('wifi-aware-1');
  nearby.heardOn('alice', 'wifi-aware-1');
  assert.equal(await nearby.deliver('alice', text, down, null, true), 'nearby');
  // A LoRa radio linked: it takes it before SMS.
  nearby.heardOn('alice', 'gone');
  nearby.linkUp('lora-1');
  const before = sent.length;
  const way = await nearby.deliver('alice', text, down, null, true);
  assert.ok(way === 'lora' || way === 'spread', way);
  assert.equal(sent.length, before);
  stop();
  // An SMS that did not go: it fails as it would have, and so can wait.
  nearby.smsWay = smsWay(() => true, sent, true);
  await assert.rejects(nearby.deliver('alice', text, down, null, true), /Relay unreachable/);
  nearby.smsWay = null;
  await assert.rejects(nearby.deliver('alice', text, down, null, true), /Relay unreachable/);
});

test('SMS is off unless turned on, for all or for one, and a backup does not hold it', async () => {
  files.clear();
  const key = randomBytes(32);
  assert.equal(EMPTY_SMS.smsWay, false);
  const link = await SmsLink.open(0, key);
  assert.equal(link.smsWayOn('aa11'), false);
  assert.equal(await link.setSmsWayFor('aa11', true), true);
  assert.equal(link.smsWayOn('aa11'), true);
  assert.equal(link.smsWayOn('bb22'), false);
  await link.setSmsWay(true);
  assert.equal(link.smsWayOn('bb22'), true);
  const again = await SmsLink.open(0, key);
  assert.deepEqual(again.smsWay, { all: true, some: ['aa11'] });
  await again.setSmsWay(false);
  await again.setSmsWayFor('aa11', false);
  assert.deepEqual((await SmsLink.open(0, key)).smsWay, { all: false, some: [] });
  // What is not an identity is not kept.
  await saveSmsData('space', 0, key, { ...(await loadSmsData('space', 0, key)), smsWayFor: ['ab01', 'not hex', ''] });
  assert.deepEqual((await loadSmsData('space', 0, key)).smsWayFor, ['ab01']);
});

// The SMS ports of two phones: what one sends to a number, the phone with that number keeps, as
// SmsStore.kt does, until it is forgotten.
class Carrier {
  readonly kept = new Map<string, { n: number; from: string; data: string; at: number }[]>();
  // Pieces as they went, to send again or change.
  readonly air: { to: string; from: string; data: Uint8Array }[] = [];
  private n = 0;
  at = NOW;

  port(own: string, ready = () => true): SmsPort {
    this.kept.set(own, []);
    return {
      ready,
      send: async (to, data, piece) => {
        for (let i = 0; i < data.length; i += piece) this.deliver(to, own, data.slice(i, i + piece));
        return true;
      },
      parts: async () => [...(this.kept.get(own) ?? [])],
      forget: async (ns) => {
        this.kept.set(own, (this.kept.get(own) ?? []).filter((p) => !ns.includes(p.n)));
      },
    };
  }

  deliver(to: string, from: string, data: Uint8Array) {
    this.air.push({ to, from, data });
    this.kept.get(to)?.push({ n: ++this.n, from, data: toBase64(data), at: this.at });
  }
}

test('two phones with no relay, no internet and no one near talk by SMS, end-to-end encrypted, each message once', { skip: !ready }, async () => {
  const alice = await E2E.open('space', 0, randomBytes(32));
  const bob = await E2E.open('space', 1, randomBytes(32));
  const { identity: bobId } = await alice.addContact({ senderHex: '', key: toBase64Url(bob.bundle) }, '');
  const carrier = new Carrier();
  const got: Received[] = [];
  const bobPort = carrier.port('+306900000002');
  const bobRunner = new SmsWayRunner(bobPort, async (packet) => {
    got.push(await bob.receive(packet));
  });
  let on = true;
  const settings: SmsWaySettings = {
    refresh: async () => undefined,
    on: (identity) => on && identity === bobId,
    phone: (identity) => (identity === bobId ? '+306900000002' : ''),
    sim: () => -1,
  };
  const aliceRunner = new SmsWayRunner(carrier.port('+306900000001'), async () => undefined);
  const nearby = new Nearby();
  nearby.smsWay = aliceRunner.way(() => settings);

  // The conversation's first packet is too much for SMS with a text: it goes nearby or through the relay first.
  const hello = await alice.seal(bobId, 'hello', '');
  await assert.rejects(nearby.deliver(bobId, [hello.first!, hello.packet], null, null, true), TooLargeForSmsError);
  assert.equal(carrier.air.length, 0);
  assert.equal(message(await bob.receive(hello.first!)).request, true);
  assert.equal(message(await bob.receive(hello.packet)).text, 'hello');
  // As the relay says once it took the first packet.
  await alice.firstSent(bobId);

  const text = await alice.seal(bobId, 'by SMS, with no internet', '');
  assert.equal(text.first, null);
  assert.equal(await nearby.deliver(bobId, [text.packet], null, null, true), 'sms');
  assert.equal(carrier.air.length, 3, 'a short text in 3 data SMS');
  assert.ok(carrier.air.every((sms) => sms.data.length <= PIECE));
  // What the phone company carries holds none of the words.
  const words = new TextEncoder().encode('by SMS');
  assert.ok(carrier.air.every((sms) => !Buffer.from(sms.data).includes(Buffer.from(words))));
  // The last piece comes first: nothing opens until all have.
  const kept = carrier.kept.get('+306900000002')!;
  kept.reverse();
  const partial = kept.splice(0, 2);
  assert.equal(await bobRunner.take(NOW), 0);
  carrier.kept.get('+306900000002')!.push(...partial);
  assert.equal(await bobRunner.take(NOW), 1);
  assert.equal(message(got.pop()!).text, 'by SMS, with no internet');
  assert.equal(carrier.kept.get('+306900000002')!.length, 0, 'its pieces are forgotten');

  // The same SMS sent again (replayed): it does not open again.
  const replay = carrier.air.splice(0);
  for (const sms of replay) carrier.deliver(sms.to, sms.from, sms.data);
  assert.equal(await bobRunner.take(NOW), 0);
  assert.equal(got.length, 0);
  // Not even on a run that never saw it (Erevos started again): the conversation refuses it.
  const fresh = new SmsWayRunner(bobPort, async (packet) => {
    got.push(await bob.receive(packet).catch((): Received => ({ kind: 'refused', reason: 'unknown' }) as unknown as Received));
  });
  for (const sms of replay) carrier.deliver(sms.to, sms.from, sms.data);
  assert.equal(await fresh.take(NOW), 1);
  assert.equal(got.length, 1);
  assert.notEqual(got.pop()!.kind, 'message');
  carrier.air.splice(0);

  // Bob answers the same way, with a longer text.
  const aliceId = message(await bob.receive((await alice.seal(bobId, 'ping', '')).packet)).identity;
  await bob.acceptRequest(aliceId);
  // Text that packing cannot make shorter, so it still needs every piece.
  const longer = Array.from({ length: 600 }, (_, i) => String.fromCharCode(33 + ((i * 7919 + ((i * i) % 89)) % 94))).join('');
  const back = await bob.seal(aliceId, longer, '');
  const bobNearby = new Nearby();
  const bobSettings: SmsWaySettings = { ...settings, on: () => true, phone: () => '+306900000001' };
  bobNearby.smsWay = new SmsWayRunner(bobPort, async () => undefined).way(() => bobSettings);
  carrier.air.splice(0);
  assert.equal(await bobNearby.deliver('alice', [back.packet], null, null, true), 'sms');
  assert.equal(carrier.air.length, MAX_SMS_PIECES, 'a longer text in 10');
  const aliceGot: Received[] = [];
  const alicePieces = carrier.kept.get('+306900000001')!;
  const opened = gatherSmsPieces(alicePieces.map((p) => ({ ...p, data: Buffer.from(p.data, 'base64') })), NOW).came;
  assert.equal(opened.length, 1);
  for (const packet of opened[0].packets) aliceGot.push(await alice.receive(packet));
  assert.equal(message(aliceGot[0]).text, longer);

  // Turned off: nothing goes by SMS.
  on = false;
  carrier.air.splice(0);
  const after = await alice.seal(bobId, 'not by SMS', '');
  await assert.rejects(nearby.deliver(bobId, [after.packet], null, null, true), NoWayError);
  assert.equal(carrier.air.length, 0);
});

test('pieces from a stranger that open in no chat are dropped, and many cannot crowd the phone', { skip: !ready }, async () => {
  const carrier = new Carrier();
  const port = carrier.port('+306900000003');
  const opened: Uint8Array[] = [];
  const runner = new SmsWayRunner(port, async (packet) => {
    opened.push(packet);
  });
  // Well-formed pieces of garbage: they come whole, are tried once, and forgotten.
  for (let i = 0; i < 5; i++) for (const piece of smsPiecesOf([randomBytes(314)])!) carrier.deliver('+306900000003', '+999', piece);
  assert.equal(await runner.take(NOW), 5);
  assert.equal(carrier.kept.get('+306900000003')!.length, 0);
  // Halves of many messages: only MAX_GATHERING wait.
  for (let i = 0; i < MAX_GATHERING + 5; i++) carrier.deliver('+306900000003', `+99${i}`, smsPiecesOf([randomBytes(314)])![0]);
  await runner.take(NOW);
  assert.equal(carrier.kept.get('+306900000003')!.length, MAX_GATHERING);
});

function message(received: Received): Extract<Received, { kind: 'message' }> {
  assert.equal(received.kind, 'message');
  return received as Extract<Received, { kind: 'message' }>;
}
