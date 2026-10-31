// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// Places lent on a relay to phones with no relay of their own (lib/relay.ts, crates/erevos-relay
// lend.rs): the ticket in a contact link, taking a place with it, and what a lent place sends,
// takes and is refused, against real relays with tokens and the real core built to WebAssembly
// by checks/build-core.mjs. Skipped, with a note, when either build is missing.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { before, test } from 'node:test';

import { ready, relayNote, startRelay } from './real-relay';
import { blobs } from './files-memory';
import { bytesSource, offerRef, readFile, sendFile, takeFile } from '../lib/attachments';
import { contactLink, parseContact } from '../lib/contact-code';
import { relaySeal, setCore, type Core } from '../lib/core';
import { randomBytes } from '../lib/crypto';
import { toBase64Url } from '../lib/e2e';
import {
  borrowPlace,
  callRelay,
  canHoldAt,
  carryTo,
  createQueue,
  isLentToken,
  isTicket,
  lendTicket,
  receiveMessage,
  relayKey,
  RelayError,
  RelayUnreachableError,
  sendMessage,
  ticketExpires,
  toHex,
  type Relay,
} from '../lib/relay';

const built = new URL('./.core/erevos_ffi.js', import.meta.url);
const go = ready && existsSync(built);
relayNote('the lent place checks');
if (ready && !go) console.log('Skipping the lent place checks: build the core first (node checks/build-core.mjs)');

const text = (words: string) => new TextEncoder().encode(words);

// Theirs: a relay with a token and a key, which lends. Another such relay, of a contact of ours.
let theirs: Relay = { url: '' };
let other: Relay = { url: '' };

before(async () => {
  if (!go) return;
  const wasm = createRequire(import.meta.url)(built.pathname) as Record<string, (...args: never[]) => unknown>;
  setCore(Object.fromEntries(Object.entries(wasm).map(([name, call]) => [name, async (...args: never[]) => call(...args)])) as unknown as Core);
  theirs = { url: await startRelay(true, 'their token'), token: 'their token' };
  other = { url: await startRelay(true, 'other token'), token: 'other token' };
});

test('a ticket goes in a contact link and comes out of it whole; one that does not read is left out', () => {
  const ticket = `ticket.${'ab'.repeat(40)}`;
  const code = { senderHex: '12'.repeat(24), relayUrl: 'wss://relay.example.org', key: 'abc' };
  assert.equal(parseContact(contactLink({ ...code, lend: ticket }))?.lend, ticket);
  assert.equal(parseContact(contactLink(code))?.lend, undefined);
  assert.equal(parseContact(`${contactLink(code)}&lend=ticket.short`)?.lend, undefined);
  assert.equal(parseContact(contactLink(code))?.senderHex, code.senderHex, 'the rest of the link still reads');
  assert.ok(!contactLink({ ...code, relayUrl: '', senderHex: '', lend: ticket }).includes('lend='), 'no relay, no ticket');
});

test('a phone with no relay takes a place with the ticket in a link, and messages go both ways', { skip: !go }, async () => {
  const queue = await createQueue(theirs);
  const ticket = await lendTicket(theirs);
  assert.ok(ticket && isTicket(ticket));
  assert.ok(Math.abs(ticketExpires(ticket) - (Date.now() + 30 * 24 * 3600 * 1000)) < 60_000, 'lasts 30 days');
  const link = parseContact(contactLink({ senderHex: toHex(queue.senderId), relayUrl: theirs.url, key: 'abc', lend: ticket }))!;

  const place = await borrowPlace(link.relayUrl, link.lend!);
  assert.ok(isLentToken(place.token));
  const ours: Relay = { url: theirs.url, token: place.token };
  await sendMessage(ours, queue.senderId, text('from a lent place'));
  assert.deepEqual(await receiveMessage(theirs, queue.recipientId), text('from a lent place'));
  await sendMessage(theirs, place.queue.senderId, text('back'));
  assert.deepEqual(await receiveMessage(ours, place.queue.recipientId), text('back'));

  // It lends none on, holds nothing for later and gives no call relay; a new queue it may make.
  assert.equal(await lendTicket(ours), null);
  assert.equal(await canHoldAt(ours), false);
  assert.equal(await callRelay(ours), null);
  assert.ok(await relayKey(ours));
  await createQueue(ours);
});

test('a ticket gives four places, and one made elsewhere none', { skip: !go }, async () => {
  const ticket = (await lendTicket(theirs))!;
  for (let n = 0; n < 4; n++) await borrowPlace(theirs.url, ticket);
  await assert.rejects(borrowPlace(theirs.url, ticket), (error: RelayError) => error.status === 2 && /all its places/.test(error.message));
  await assert.rejects(borrowPlace(theirs.url, (await lendTicket(other))!), RelayUnreachableError);
  await assert.rejects(borrowPlace(theirs.url, `ticket.${'0'.repeat(80)}`), RelayUnreachableError);
});

test('from a lent place, messages to a contact on another relay go straight to its /sealed path', { skip: !go }, async () => {
  const place = await borrowPlace(theirs.url, (await lendTicket(theirs))!);
  const ours: Relay = { url: theirs.url, token: place.token };
  const queue = await createQueue(other);
  const key = (await relayKey(other))!;
  // As lib/space-chats.ts makes it for a contact on another relay: sealed for theirs, through ours.
  await sendMessage({ url: other.url, key, via: ours }, queue.senderId, text('to another relay'));
  assert.deepEqual(await receiveMessage(other, queue.recipientId), text('to another relay'));
  // And a message carried for a phone nearby.
  assert.equal(await carryTo(ours, other.url, await relaySeal(key, queue.senderId, text('carried'))), true);
  assert.deepEqual(await receiveMessage(other, queue.recipientId), text('carried'));
  // A link of ours says our relay's key, so contacts on other relays reach us there.
  assert.equal(toBase64Url((await relayKey(ours))!), toBase64Url((await relayKey(theirs))!));
});

test('a lent place sends files from its relay and takes them straight from another relay', { skip: !go }, async () => {
  const place = await borrowPlace(theirs.url, (await lendTicket(theirs))!);
  const ours: Relay = { url: theirs.url, token: place.token };
  // From a contact on another relay.
  const data = randomBytes(70_000);
  const { offer } = await sendFile(other, bytesSource(data), { name: 'photo.png', mime: 'image/png', kind: 'photo', w: 2, h: 1 });
  const taken = await takeFile(ours, offerRef(JSON.parse(JSON.stringify(offer))));
  assert.deepEqual(await readFile(taken), data);
  // To them.
  const back = randomBytes(5000);
  const sent = await sendFile(ours, bytesSource(back), { name: 'notes.txt', mime: 'text/plain', kind: 'file' });
  assert.equal(sent.offer.relay, theirs.url);
  const came = await takeFile(other, offerRef(JSON.parse(JSON.stringify(sent.offer))));
  assert.deepEqual(await readFile(came), back);
  assert.ok(blobs.size > 0);
});
