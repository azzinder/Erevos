// SMS invites (lib/sms-invite.ts, lib/sms-link.ts) and SMS rows in the home screen's list
// (lib/inbox.ts). The invite answer runs with the real core built to WebAssembly by
// checks/build-core.mjs, and is skipped, with a note, without it.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';

import { relaySeal, setCore, type Core } from '../lib/core';
import { fromHex, randomBytes, toHex } from '../lib/crypto';
import { toBase64Url } from '../lib/e2e';
import { buildInbox } from '../lib/inbox';
import { collectInvites, inviteAnswer, invitePieces, PIECE, plainNumber, sameNumber, type SmsInvite } from '../lib/sms-invite';
import { SmsLink } from '../lib/sms-link';
import { files } from './files-memory';

const invite = (relay: string): SmsInvite => ({
  sender: toHex(randomBytes(24)),
  key: randomBytes(32),
  relay,
  relayKey: toBase64Url(randomBytes(32)),
});

test('an invite with a short relay address fits one data SMS and comes back whole', () => {
  const sent = invite('wss://relay.example.org');
  const pieces = invitePieces(sent, randomBytes(4));
  assert.equal(pieces.length, 1);
  assert.ok(pieces[0].length <= PIECE);
  const { invites, waiting } = collectInvites([{ from: '+306900000001', data: pieces[0], at: 5 }]);
  assert.deepEqual(waiting, []);
  assert.deepEqual(invites, [{ from: '+306900000001', invite: sent, at: 5 }]);
});

test('a longer invite comes in pieces, in any order, and waits until all have come', () => {
  const sent = { ...invite(`wss://${'r'.repeat(60)}.example.org/erevos`), relayKey: '' };
  const pieces = invitePieces(sent, randomBytes(4));
  assert.equal(pieces.length, 2);
  const first = collectInvites([{ from: 'a', data: pieces[1], at: 1 }]);
  assert.deepEqual(first.invites, []);
  assert.equal(first.waiting.length, 1);
  const done = collectInvites([...first.waiting, { from: 'a', data: pieces[0], at: 2 }]);
  assert.deepEqual(done.invites, [{ from: 'a', invite: sent, at: 2 }]);
  // The same pieces from another number are another invite.
  assert.equal(collectInvites([{ from: 'b', data: pieces[0], at: 1 }, { from: 'a', data: pieces[1], at: 1 }]).invites.length, 0);
  assert.throws(() => invitePieces({ ...sent, relay: `wss://${'r'.repeat(400)}.org` }, randomBytes(4)));
});

test('pieces that are not invites are dropped', () => {
  const [piece] = invitePieces(invite('ws://relay:7879'), randomBytes(4));
  const bad = [Uint8Array.of(1, 2, 3), piece.map((b, i) => (i === 0 ? 0 : b)), piece.map((b, i) => (i === 7 ? 0 : b))];
  const { invites, waiting } = collectInvites(bad.map((data) => ({ from: 'a', data, at: 1 })));
  assert.deepEqual([invites, waiting], [[], []]);
  // A body whose relay address is not one.
  const wrong = invitePieces({ ...invite('ws://relay:7879') }, Uint8Array.of(1, 2, 3, 4))[0];
  wrong.set(new TextEncoder().encode('http'), wrong.length - 'ws://relay:7879'.length);
  assert.deepEqual(collectInvites([{ from: 'a', data: wrong, at: 1 }]).invites, []);
});

test('the same number written two ways is the same phone', () => {
  assert.equal(plainNumber('+30 690-000 0001'), '+306900000001');
  assert.ok(sameNumber('+30 6900000001', '6900000001'));
  assert.ok(sameNumber('0030 690 000 0001', '+306900000001'));
  assert.ok(!sameNumber('+306900000001', '+306900000002'));
  assert.ok(sameNumber('1234', '1234'));
  assert.ok(!sameNumber('', ''));
});

test('SMS with a linked number go in the contact row, the others get rows of their own', () => {
  const A = 'aa'.repeat(32);
  const rows = buildInbox(
    [{ identity: A, name: 'Άννα', timer: 0, phone: '+306900000001' }],
    [{ peer: `contact:${A}`, text: 'erevos', mine: true, at: 10, mark: 1 }],
    [],
    100,
    [
      { address: '6900000001', text: 'sms from Anna', at: 20, mine: false, unread: 1 },
      { address: '+306911111111', text: 'bank code', at: 30, mine: false, unread: 2 },
    ],
  );
  assert.deepEqual(
    rows.map((r) => [r.name, r.last, r.unread, r.sms, r.lastSms]),
    [
      ['+306911111111', 'bank code', 2, '+306911111111', true],
      ['Άννα', 'sms from Anna', 1, '', true],
    ],
  );
});

const built = new URL('./.core/erevos_ffi.js', import.meta.url);
if (existsSync(built)) {
  const wasm = createRequire(import.meta.url)(built.pathname) as Record<string, (...args: never[]) => unknown>;
  setCore(Object.fromEntries(Object.entries(wasm).map(([name, call]) => [name, async (...args: never[]) => call(...args)])) as unknown as Core);
} else {
  console.log('Skipping the SMS invite answer check: build the core first with node checks/build-core.mjs');
}

test('an invite answered through the relay gives the inviter the link, once', { skip: !existsSync(built) }, async () => {
  files.clear();
  const key = randomBytes(32);
  const link = await SmsLink.open(0, key);
  const own = { senderHex: toHex(randomBytes(24)), relay: 'wss://relay.example.org', relayKey: '' };
  const sent: Uint8Array[] = [];
  assert.ok(link.wantsInvite('+306900000001'));
  await link.invite('+306900000001', own, async (_number, piece) => void sent.push(piece));
  assert.ok(!link.wantsInvite('6900000001'));

  // The invited phone answers with its link, sealed to the invite's key.
  const [got] = collectInvites(sent.map((data) => ({ from: '+306900000002', data, at: 1 }))).invites;
  assert.equal(got.invite.sender, own.senderHex);
  const answer = await relaySeal(got.invite.key, fromHex(toHex(randomBytes(24))), inviteAnswer('erevos://contact?id=x'));

  // Another screen's copy sees what was sent, and opens the answer.
  const other = await SmsLink.open(0, key);
  assert.equal(await other.openAnswer(randomBytes(80)), null);
  assert.deepEqual(await other.openAnswer(answer), { number: '+306900000001', link: 'erevos://contact?id=x' });
  assert.equal(await other.openAnswer(answer), null);
  await link.refresh();
  assert.ok(!link.waiting);

  // The invited side remembers whose first message to accept.
  await other.answered('+30 690 000 0002', own.senderHex);
  assert.equal((await SmsLink.open(0, key)).invitedBy(own.senderHex), '+306900000002');
});
