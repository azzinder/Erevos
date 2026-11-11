// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// What Matrix accounts (lib/matrix.ts) do besides chatting, against the small homeserver of
// checks/matrix-server.ts, with the real core built to WebAssembly: threads (m.thread), polls with
// votes and their end, places and links' previews as Element and Beeper carry them, messages pinned
// to a room's top, favourites and rooms of low priority, a room left and forgotten, public rooms
// and what a space holds, looking for words among the messages kept, making an account with the
// steps a homeserver asks for, and the account's devices, named and signed out. A room message
// opens only under a key its sender gave, from a device of theirs (one not known yet opens it as
// not verified until it is); a device that comes back with other keys gets no room key, and one
// new in a list gets them; the room says each once. Stickers, Element's and our own; who may do
// what in a room (its power levels, and its makers in rooms of version 12), its members, name and
// topic, admins made and unmade, someone taken out or barred; and people found in the directory.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { after, before, test } from 'node:test';

import { setCore, type Core } from '../lib/core';
import { call, createGroup, deleteMessage, inviteToRoom, joinRoom, sendContent, sendStateEvent, sendInThread, sendLocation, sendPoll, sendPollEnd, sendText, sendVote, setMatrixHttp, signIn, STICKER, stickerShown, sync, type MatrixState } from '../lib/matrix';
import { authFor, isAccountName, listDevices, nameFree, register, renameDevice, signOutDevices } from '../lib/matrix-account';
import { fetchFile, sendSticker } from '../lib/matrix-media';
import { learnRule, removeMember, renameRoom, roomMembers, searchPeople, setAdmin, setTopic } from '../lib/matrix-members';
import { adminContent, creatorsOf, levelOf, mayMakeAdmin, mayRedactOthers, mayRemove, maySetState, powerOfContent, roleOf } from '../lib/matrix-power';
import { geoUri, placeOfGeo, pollOfContent, pollShown, previewContent, previewOfContent, threadOf } from '../lib/matrix-parts';
import { findMessages, leaveAndForget, pinMessage, publicRooms, sortedRooms, spaceRooms, tagRoom } from '../lib/matrix-rooms';
import { Homeserver, HS, PASSWORD, type Json } from './matrix-server';

const built = new URL('./.core/erevos_ffi.js', import.meta.url);
const coreReady = existsSync(built) && typeof (createRequire(import.meta.url)(built.pathname) as Record<string, unknown>).matrix === 'function';
if (!coreReady) console.log('Skipping the Matrix checks: build the core first with node checks/build-core.mjs');

const server = new Homeserver();
const kept = (state: MatrixState): MatrixState => JSON.parse(JSON.stringify(state)) as MatrixState;

before(() => {
  if (!coreReady) return;
  const wasm = createRequire(import.meta.url)(built.pathname) as Record<string, (...args: never[]) => unknown>;
  setCore(Object.fromEntries(Object.entries(wasm).map(([name, fn]) => [name, async (...args: never[]) => fn(...args)])) as unknown as Core);
  setMatrixHttp(async (request) => server.answer(request));
});

after(() => setCore(null));

// Alice makes an encrypted group with Bob in it; both have synced.
async function group(a: string, b: string): Promise<{ alice: MatrixState; bob: MatrixState; roomId: string }> {
  const alice = await signIn(HS, a, PASSWORD);
  const bob = await signIn(HS, b, PASSWORD);
  const room = await createGroup(alice, 'Κήπος', [bob.userId]);
  await sync(bob, 0);
  await joinRoom(bob, room.id);
  await sync(bob, 0);
  await sync(alice, 0);
  return { alice: kept(alice), bob: kept(bob), roomId: room.id };
}

test('Matrix polls, places, previews and threads are read and written as Element has them', () => {
  const poll = pollOfContent({
    'org.matrix.msc3381.poll.start': {
      question: { 'org.matrix.msc1767.text': 'Πού;' },
      max_selections: 5,
      answers: [{ id: 'x', 'org.matrix.msc1767.text': 'Εδώ' }, { id: 'y', 'org.matrix.msc1767.text': 'Εκεί' }, { id: 'x', 'org.matrix.msc1767.text': 'again' }],
    },
  });
  assert.deepEqual(poll && { q: poll.q, answers: poll.answers, max: poll.max }, { q: 'Πού;', answers: [{ id: 'x', text: 'Εδώ' }, { id: 'y', text: 'Εκεί' }], max: 2 });
  // A poll of one answer, or with none of its shape, is none.
  assert.equal(pollOfContent({ 'org.matrix.msc3381.poll.start': { question: { 'org.matrix.msc1767.text': 'q' }, answers: [{ id: 'a', 'org.matrix.msc1767.text': 'one' }] } }), null);
  // The stable names read too.
  assert.equal(pollOfContent({ 'm.poll': { question: { 'm.text': [{ body: 'q' }] }, answers: [{ 'm.id': 'a', 'm.text': [{ body: '1' }] }, { 'm.id': 'b', 'm.text': [{ body: '2' }] }] } })?.answers.length, 2);

  assert.deepEqual(placeOfGeo('geo:37.97536,23.73495;u=35'), { lat: 37.97536, lon: 23.73495, acc: 35 });
  assert.deepEqual(placeOfGeo('geo:37.97536,23.73495,100;crs=wgs84'), { lat: 37.97536, lon: 23.73495 });
  assert.equal(placeOfGeo('geo:91,0'), null);
  assert.equal(placeOfGeo('https://maps.example.org'), null);
  assert.equal(geoUri({ lat: 1.5, lon: -2, acc: 10 }), 'geo:1.5,-2;u=10');

  const preview = { url: 'https://example.org/a', title: 'Τίτλος', text: 'Λόγια', image: '/9j/AAAA' };
  const carried = previewContent(preview);
  // Its picture stays on the phone that made it.
  assert.ok(!JSON.stringify(carried).includes('/9j/'));
  assert.deepEqual(previewOfContent(carried), { url: 'https://example.org/a', title: 'Τίτλος', text: 'Λόγια' });
  assert.equal(previewOfContent({ 'com.beeper.linkpreviews': [{ matched_url: 'javascript:alert(1)', 'og:title': 'x' }] }), null);

  assert.deepEqual(threadOf({ 'm.relates_to': { rel_type: 'm.thread', event_id: '$root', is_falling_back: true, 'm.in_reply_to': { event_id: '$latest' } } }), { root: '$root' });
  assert.deepEqual(threadOf({ 'm.relates_to': { rel_type: 'm.thread', event_id: '$root', 'm.in_reply_to': { event_id: '$that' } } }), { root: '$root', answers: '$that' });
});

test('a thread: its answers show in it, the root counts them, an answer there quotes what it answers', { skip: !coreReady }, async () => {
  const { alice, bob, roomId } = await group('alice-thread', 'bob-thread');
  const root = await sendText(alice, roomId, 'Για το Σάββατο');
  await sync(bob, 0);
  const first = await sendInThread(bob, roomId, root.id, 'Εγώ μπορώ');
  const second = await sendInThread(bob, roomId, root.id, 'Και ο Νίκος', first.id);
  await sendText(bob, roomId, 'Άλλο θέμα');
  await sync(alice, 0);
  const messages = alice.rooms[roomId].messages;
  const inThread = messages.filter((m) => m.thread === root.id);
  assert.deepEqual(inThread.map((m) => m.text), ['Εγώ μπορώ', 'Και ο Νίκος']);
  // The fallback (an answer to the thread's latest, for apps without threads) is not an answer here.
  assert.equal(inThread[0].replyTo, undefined);
  assert.equal(inThread[1].replyTo, first.id);
  assert.equal(messages.find((m) => m.text === 'Άλλο θέμα')?.thread, undefined);
  // On the wire, as Element writes it, encrypted, the relation readable.
  const wire = server.log.find((l) => l.event.event_id === second.id)!.event;
  assert.equal(wire.type, 'm.room.encrypted');
  assert.equal(wire.content['m.relates_to'].rel_type, 'm.thread');
  assert.equal(wire.content['m.relates_to'].event_id, root.id);
});

test('a poll: votes counted, changed, taken back; once its maker ends it, no more count', { skip: !coreReady }, async () => {
  const { alice, bob, roomId } = await group('alice-poll', 'bob-poll');
  const poll = await sendPoll(alice, roomId, { q: 'Πότε;', o: ['Σάββατο', 'Κυριακή'] });
  assert.equal(poll.poll?.q, 'Πότε;');
  await sync(bob, 0);
  const theirs = bob.rooms[roomId].messages.find((m) => m.id === poll.id)!;
  assert.deepEqual(theirs.poll?.answers.map((a) => a.text), ['Σάββατο', 'Κυριακή']);
  assert.equal(theirs.poll?.max, 1);
  await sendVote(bob, roomId, poll.id, [theirs.poll!.answers[1].id]);
  await sendVote(alice, roomId, poll.id, [theirs.poll!.answers[0].id]);
  await sync(alice, 0);
  assert.deepEqual(pollShown(alice.rooms[roomId].messages.find((m) => m.id === poll.id)!.poll!).votes.sort((a, b) => a.who.localeCompare(b.who)), [
    { who: alice.userId, chose: [0] },
    { who: bob.userId, chose: [1] },
  ]);
  // Bob changes his mind; then takes it back.
  await sendVote(bob, roomId, poll.id, [theirs.poll!.answers[0].id]);
  await sync(alice, 0);
  assert.deepEqual(pollShown(alice.rooms[roomId].messages.find((m) => m.id === poll.id)!.poll!).votes.find((v) => v.who === bob.userId)?.chose, [0]);
  // Only its maker ends it.
  await assert.rejects(sendPollEnd(bob, roomId, poll.id));
  await sendPollEnd(alice, roomId, poll.id);
  await sync(bob, 0);
  assert.ok(bob.rooms[roomId].messages.find((m) => m.id === poll.id)!.poll!.ended);
  await assert.rejects(sendVote(bob, roomId, poll.id, []));
  // A vote sent after the end, from an app that let it, does not count.
  await sendContent(bob, roomId, { 'm.relates_to': { rel_type: 'm.reference', event_id: poll.id }, 'org.matrix.msc3381.poll.response': { answers: ['a2'] } }, 'org.matrix.msc3381.poll.response');
  await sync(alice, 0);
  assert.deepEqual(pollShown(alice.rooms[roomId].messages.find((m) => m.id === poll.id)!.poll!).votes.find((v) => v.who === bob.userId)?.chose, [0]);
});

test('a place and a preview go encrypted and come as they went', { skip: !coreReady }, async () => {
  const { alice, bob, roomId } = await group('alice-place', 'bob-place');
  const place = await sendLocation(alice, roomId, { lat: 37.97536, lon: 23.73495, acc: 12 });
  await sendText(alice, roomId, 'Δες https://example.org/a', [], previewContent({ url: 'https://example.org/a', title: 'Σελίδα', text: '' }));
  assert.ok(!JSON.stringify(server.log).includes('37.97536'));
  await sync(bob, 0);
  const got = bob.rooms[roomId].messages;
  assert.deepEqual(got.find((m) => m.id === place.id)?.place, { lat: 37.97536, lon: 23.73495, acc: 12 });
  assert.deepEqual(got.at(-1)?.preview, { url: 'https://example.org/a', title: 'Σελίδα', text: '' });
});

test('pins, tags, a room left and forgotten, and words looked for among the messages kept', { skip: !coreReady }, async () => {
  const { alice, bob, roomId } = await group('alice-pin', 'bob-pin');
  const one = await sendText(alice, roomId, 'Η διεύθυνση είναι Ακαδημίας 1');
  const two = await sendText(alice, roomId, 'Ώρα 8');
  await pinMessage(alice, roomId, one.id, true);
  await pinMessage(alice, roomId, two.id, true);
  await pinMessage(alice, roomId, one.id, false);
  await sync(bob, 0);
  assert.deepEqual(bob.rooms[roomId].pinned, [two.id]);

  const other = await createGroup(alice, 'Άλλη', []);
  await sendText(alice, other.id, 'νεότερο');
  await tagRoom(alice, roomId, 'favourite');
  await tagRoom(alice, other.id, 'low');
  // As our other apps see them, from the homeserver.
  const fresh = kept(alice);
  delete fresh.rooms[roomId].tags;
  delete fresh.rooms[other.id].tags;
  await sync(fresh, 0);
  assert.deepEqual(fresh.rooms[roomId].tags, { favourite: true });
  assert.deepEqual(fresh.rooms[other.id].tags, { low: true });
  assert.deepEqual(sortedRooms(Object.values(fresh.rooms)).map((r) => r.id), [roomId, other.id]);
  // One tag at a time, as Element has it.
  await tagRoom(alice, roomId, 'low');
  assert.deepEqual(server.tags.get(`${alice.userId} ${roomId}`), { 'm.lowpriority': {} });

  assert.deepEqual(findMessages(bob, 'ακαδημίας').map((f) => f.message.id), [one.id]);
  assert.deepEqual(findMessages(bob, 'a'), []);

  await leaveAndForget(alice, other.id);
  assert.equal(alice.rooms[other.id], undefined);
  assert.ok(server.forgotten.has(`${alice.userId} ${other.id}`));
});

test('public rooms are found by their words and joined; a space shows what it holds', { skip: !coreReady }, async () => {
  const owner = await signIn(HS, 'owner-public', PASSWORD);
  const reader = await signIn(HS, 'reader-public', PASSWORD);
  const linux = await createGroup(owner, 'Linux στα ελληνικά', []);
  const cooking = await createGroup(owner, 'Μαγειρική', []);
  server.published.add(linux.id);
  server.published.add(cooking.id);
  const found = await publicRooms(reader, 'linux');
  assert.deepEqual(found.rooms.map((r) => [r.name, r.joined, r.open]), [['Linux στα ελληνικά', false, true]]);
  await assert.rejects(publicRooms(reader, '', 'not a server!'));
  await joinRoom(reader, linux.id);
  await sync(reader, 0);
  assert.equal((await publicRooms(reader, 'linux')).rooms[0].joined, true);

  const made = await createGroup(owner, 'Ο χώρος', []);
  await sendStateEvent(owner, made.id, 'm.space.child', cooking.id, { via: ['example.org'] });
  const held = await spaceRooms(owner, made.id);
  assert.deepEqual(held.rooms.map((r) => r.name), ['Μαγειρική']);
});

test('a new account is made with the steps the homeserver asks, then signed in as a new device', { skip: !coreReady }, async () => {
  assert.ok(isAccountName('nekten.erevos'));
  assert.ok(!isAccountName('Nekten'));
  await assert.rejects(register(HS, 'short', '1234'), /8/);

  server.registerFlows = [['m.login.terms', 'm.login.dummy'], ['m.login.email.identity']];
  const first = await register(HS, 'newcomer', PASSWORD);
  assert.ok('ask' in first);
  assert.equal(first.ask.stage, 'm.login.terms');
  assert.deepEqual(first.ask.terms, [{ name: 'Privacy', url: 'https://matrix.example.org/privacy' }]);
  const made = await register(HS, 'newcomer', PASSWORD, authFor(first.ask));
  assert.ok('state' in made);
  assert.equal(made.state.userId, '@newcomer:example.org');
  assert.ok(server.deviceKeys.get('@newcomer:example.org')?.has(made.state.deviceId));
  assert.equal(await nameFree(HS, 'newcomer'), false);
  await assert.rejects(register(HS, 'newcomer', PASSWORD, authFor(first.ask)), /someone/);

  // A token, then a captcha on the server's page.
  server.registerFlows = [['m.login.registration_token', 'm.login.recaptcha']];
  const asked = await register(HS, 'tokened', PASSWORD);
  assert.ok('ask' in asked && asked.ask.stage === 'm.login.registration_token');
  await assert.rejects(register(HS, 'tokened', PASSWORD, authFor(asked.ask, { token: 'wrong' })), /Invalid token/);
  const next = await register(HS, 'tokened', PASSWORD, authFor(asked.ask, { token: 'letmein' }));
  assert.ok('ask' in next && next.ask.stage === 'm.login.recaptcha');
  assert.match(next.ask.fallback!, /\/auth\/m\.login\.recaptcha\/fallback\/web\?session=reg1$/);
  server.pageDone.set('reg1', ['m.login.recaptcha']);
  assert.ok('state' in (await register(HS, 'tokened', PASSWORD, authFor(next.ask))));

  // A server that asks only for an e-mail says to make the account on its website.
  server.registerFlows = [['m.login.email.identity']];
  await assert.rejects(register(HS, 'mailed', PASSWORD), /website/);
  server.registerFlows = [['m.login.dummy']];
});

test("the account's devices: listed, this one first, named, and others signed out with the password", { skip: !coreReady }, async () => {
  const phone = await signIn(HS, 'devices', PASSWORD);
  const laptop = await signIn(HS, 'devices', PASSWORD);
  const listed = await listDevices(phone);
  assert.equal(listed[0].id, phone.deviceId);
  assert.ok(listed[0].ours);
  assert.ok(listed.some((d) => d.id === laptop.deviceId && !d.ours));
  await renameDevice(phone, laptop.deviceId, 'Laptop');
  assert.equal((await listDevices(phone)).find((d) => d.id === laptop.deviceId)?.name, 'Laptop');

  // This device is never among those signed out here.
  assert.deepEqual(await signOutDevices(phone, [phone.deviceId]), { done: true });
  const asked = await signOutDevices(phone, [laptop.deviceId]);
  assert.ok('ask' in asked && asked.ask.stage === 'm.login.password');
  await assert.rejects(signOutDevices(phone, [laptop.deviceId], authFor(asked.ask, { userId: 'devices', password: 'wrong' })), /Invalid password/);
  assert.deepEqual(await signOutDevices(phone, [laptop.deviceId], authFor(asked.ask, { userId: 'devices', password: PASSWORD })), { done: true });
  assert.deepEqual(server.signedOut, [laptop.deviceId]);
  assert.deepEqual((await listDevices(phone)).map((d) => d.id), [phone.deviceId]);
});

test('a room message opens only under its sender’s key; a changed device gets no key, a new one does, each said once', { skip: !coreReady }, async () => {
  let { alice: ivy, bob: jon, roomId } = await group('@ivy:example.org', '@jon:example.org');
  const shown = (state: MatrixState) => state.rooms[roomId].messages;
  const first = await sendText(jon, roomId, 'από τον Jon');
  const second = await sendText(jon, roomId, 'κι άλλο');
  // The homeserver says Jon's second is Ivy's: it does not open as hers.
  server.log.find((l) => l.event.event_id === second.id)!.event.sender = ivy.userId;
  await sync(ivy, 0);
  ivy = kept(ivy);
  const opened = shown(ivy).find((m) => m.id === first.id)!;
  assert.deepEqual([opened.text, opened.unverified], ['από τον Jon', undefined]);
  const forged = shown(ivy).find((m) => m.id === second.id)!;
  assert.deepEqual([forged.sender, forged.text, !!forged.locked], [ivy.userId, '', true]);
  const session = Object.entries(ivy.inbound).find(([key]) => key.startsWith(roomId) && ivy.inbound[key].sender === jon.userId);
  assert.ok(session && !session[1].untied && session[1].ed25519 === ivy.devices[jon.userId][jon.deviceId].ed25519);

  // A key that comes while its device cannot be looked up opens as not verified, until it can.
  const kim = await signIn(HS, '@kim:example.org', PASSWORD);
  let lea = await signIn(HS, '@lea:example.org', PASSWORD);
  const other = await createGroup(kim, 'Αυλή', [lea.userId]);
  await sync(lea, 0);
  await joinRoom(lea, other.id);
  await sync(lea, 0);
  await sync(kim, 0);
  setMatrixHttp(async (request) => (request.url.includes('/keys/query') && request.token === lea.accessToken ? { status: 502, json: {} } : server.answer(request)));
  const early = await sendText(kim, other.id, 'νωρίς');
  await sync(lea, 0);
  setMatrixHttp(async (request) => server.answer(request));
  lea = kept(lea);
  assert.deepEqual([lea.rooms[other.id].messages.find((m) => m.id === early.id)?.text, lea.rooms[other.id].messages.find((m) => m.id === early.id)?.unverified], ['νωρίς', true]);
  await sendText(lea, other.id, 'τώρα σε ξέρω');
  const later = await sendText(kim, other.id, 'αργότερα');
  await sync(lea, 0);
  assert.equal(lea.rooms[other.id].messages.find((m) => m.id === later.id)?.unverified, undefined);
  assert.ok(Object.values(lea.inbound).every((inbound) => !inbound.untied));

  // Jon's device comes back with Kim's keys under its ID: Ivy keeps the keys she had and gives it
  // no room key from now on, and the room says so once.
  const known = { ...ivy.devices[jon.userId][jon.deviceId] };
  const kims = server.deviceKeys.get(kim.userId)!.get(kim.deviceId)! as Json;
  const swapped: Json = { ...kims, user_id: jon.userId, device_id: jon.deviceId, keys: { [`ed25519:${jon.deviceId}`]: kims.keys[`ed25519:${kim.deviceId}`], [`curve25519:${jon.deviceId}`]: kims.keys[`curve25519:${kim.deviceId}`] } };
  server.deviceKeys.get(jon.userId)!.set(jon.deviceId, swapped);
  ivy.outdated.push(jon.userId);
  delete ivy.outbound[roomId];
  const hidden = await sendText(ivy, roomId, 'όχι για σένα');
  delete ivy.outbound[roomId];
  await sendText(ivy, roomId, 'ούτε αυτό');
  ivy = kept(ivy);
  const changedLine = `🔑 A device of ${jon.userId} changed its key: your messages do not go to it.`;
  assert.equal(shown(ivy).filter((m) => m.call && m.text === changedLine).length, 1);
  assert.deepEqual(ivy.devices[jon.userId][jon.deviceId], { ...known, changed: true });
  await sync(jon, 0);
  assert.ok(shown(jon).find((m) => m.id === hidden.id)?.locked);

  // Jon signs in on a second device: it gets the key, and Ivy's room says so once.
  const jon2 = await signIn(HS, 'jon', PASSWORD);
  await sync(ivy, 0);
  await sendText(ivy, roomId, 'και στο νέο');
  await sendText(ivy, roomId, 'ξανά');
  await sync(jon2, 0);
  assert.deepEqual(jon2.rooms[roomId].messages.filter((m) => !m.locked).map((m) => m.text).slice(-2), ['και στο νέο', 'ξανά']);
  assert.equal(shown(ivy).filter((m) => m.call && m.text === `🔑 New device of ${jon.userId}: your messages go to it too.`).length, 1);
});

test('a sticker is read as Element, FluffyChat and Element X send it, its picture as a photo’s', () => {
  // Element's, from a sticker pack: in the clear, its words its name.
  const plain = stickerShown({ body: 'Χαρούμενη γάτα', url: 'mxc://example.org/cat', info: { mimetype: 'image/png', w: 256, h: 200, size: 3 } });
  assert.deepEqual(plain, { text: '', sticker: true, file: { kind: 'image', name: 'Χαρούμενη γάτα', mime: 'image/png', size: 3, w: 256, h: 200, url: 'mxc://example.org/cat' } });
  // One with no words is named so; one with no picture shows only its words, and is not a sticker.
  assert.equal(stickerShown({ url: 'mxc://example.org/x', info: { mimetype: 'image/webp' } }).file?.name, 'Sticker');
  assert.deepEqual(stickerShown({ body: 'μόνο λόγια', url: 'https://example.org/x.png' }), { text: 'μόνο λόγια' });
  // An answer, and one in a thread, as messages are.
  assert.equal(stickerShown({ body: 'x', url: 'mxc://a/b', 'm.relates_to': { 'm.in_reply_to': { event_id: '$q' } } }).replyTo, '$q');
  assert.equal(stickerShown({ body: 'x', url: 'mxc://a/b', 'm.relates_to': { rel_type: 'm.thread', event_id: '$root', is_falling_back: true, 'm.in_reply_to': { event_id: '$root' } } }).thread, '$root');
});

test('a sticker of ours goes encrypted, its picture too, and one from Element shows; one taken back is gone', { skip: !coreReady }, async () => {
  const { alice, bob, roomId } = await group('alice-sticker', 'bob-sticker');
  // Bob's Element sends one from its packs, in the clear (the room's encryption hides the event).
  const theirs = await sendContent(bob, roomId, { body: 'Γεια', url: 'mxc://example.org/hello', info: { mimetype: 'image/png', w: 128, h: 128 } }, STICKER);
  assert.equal(theirs.sticker, true);
  // Alice's own, made from a photo: no one but the room reads it.
  const picture = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 7, 7, 7, 7, 0xff, 0xd9]);
  const ours = await sendSticker(alice, roomId, { bytes: picture, mime: 'image/jpeg', w: 512, h: 512 });
  assert.equal(ours.sticker, true);
  const wire = server.log.find((l) => l.event.event_id === ours.id)!.event;
  assert.equal(wire.type, 'm.room.encrypted');
  assert.ok(![...server.media.values()].some((bytes) => bytes.length === picture.length && bytes.every((b, i) => b === picture[i])), 'its picture went encrypted');
  await sync(bob, 0);
  await sync(alice, 0);
  const got = bob.rooms[roomId].messages.find((m) => m.id === ours.id)!;
  assert.deepEqual([got.sticker, got.text, got.file?.kind, got.file?.w, !!got.file?.encrypted], [true, '', 'image', 512, true]);
  assert.deepEqual(await fetchFile(bob, got.file!), picture);
  const elements = alice.rooms[roomId].messages.find((m) => m.id === theirs.id)!;
  assert.deepEqual([elements.sticker, elements.file?.url, elements.file?.name], [true, 'mxc://example.org/hello', 'Γεια']);

  // Taken back: nothing of it stays.
  await deleteMessage(alice, roomId, ours.id);
  await sync(bob, 0);
  const gone = bob.rooms[roomId].messages.find((m) => m.id === ours.id)!;
  assert.deepEqual([gone.deleted, gone.sticker, gone.file], [true, undefined, undefined]);

  // In a room that is not encrypted, as it is.
  const open = String((await call(alice, 'POST', '/createRoom', { preset: 'private_chat', name: 'Ανοιχτή' })).room_id);
  await sync(alice, 0);
  const clear = await sendSticker(alice, open, { bytes: picture, mime: 'image/jpeg' });
  const sent = server.log.find((l) => l.event.event_id === clear.id)!.event;
  assert.equal(sent.type, 'm.sticker');
  assert.deepEqual(server.media.get(sent.content.url), picture);
  // Named, its name its words, for apps that cannot show it; with none, it is called a sticker.
  assert.equal(sent.content.body, 'Sticker');
  const named = await sendSticker(alice, open, { bytes: picture, mime: 'image/png', w: 512, h: 512, label: ' Χαρούμενη γάτα ' });
  const said = server.log.find((l) => l.event.event_id === named.id)!.event;
  assert.deepEqual([said.content.body, said.content.info.w, said.content.info.mimetype], ['Χαρούμενη γάτα', 512, 'image/png']);
  assert.equal(named.file?.name, 'Χαρούμενη γάτα');
});

test('who may do what in a room, as its power levels say', () => {
  const power = powerOfContent({ users: { '@a:x': 100, '@m:x': '50', '@n:x': 'many', 'not an id': 100 }, events: { 'm.room.name': 75 } });
  assert.deepEqual(power, { users: { '@a:x': 100, '@m:x': 50 }, usersDefault: 0, events: { 'm.room.name': 75 }, eventsDefault: 0, stateDefault: 50, kick: 50, ban: 50, redact: 50, invite: 0 });
  const room = { power };
  assert.deepEqual(['@a:x', '@m:x', '@u:x'].map((who) => roleOf(room, who)), ['admin', 'moderator', null]);
  // A moderator sets the topic (50), not the name (75); takes out and bars those below, never those above.
  assert.deepEqual([maySetState(room, '@m:x', 'm.room.topic'), maySetState(room, '@m:x', 'm.room.name'), maySetState(room, '@a:x', 'm.room.name')], [true, false, true]);
  assert.deepEqual([mayRemove(room, '@m:x', '@u:x', 'kick'), mayRemove(room, '@m:x', '@a:x', 'ban'), mayRemove(room, '@u:x', '@m:x', 'kick'), mayRemove(room, '@a:x', '@a:x', 'kick')], [true, false, false, false]);
  assert.deepEqual([mayRedactOthers(room, '@m:x'), mayRedactOthers(room, '@u:x')], [true, false]);
  // An admin makes admins, and cannot take it from another admin; one with no say makes none.
  assert.deepEqual([mayMakeAdmin(room, '@a:x', '@m:x', true), mayMakeAdmin(room, '@a:x', '@a:x', false), mayMakeAdmin(room, '@m:x', '@u:x', true)], [true, false, false]);
  // Not known yet: nothing is offered.
  assert.deepEqual([roleOf({}, '@a:x'), maySetState({}, '@a:x', 'm.room.name'), mayRemove({}, '@a:x', '@u:x', 'kick'), mayRedactOthers({}, '@a:x')], [null, false, false, false]);

  // Version 12: those who made it stand above all, own it, and are never in its levels.
  assert.equal(creatorsOf('@o:x', { room_version: '11' }), undefined);
  const made = { power: powerOfContent({ users: { '@a:x': 100 } }), creators: creatorsOf('@o:x', { room_version: '12', additional_creators: ['@p:x', 'bad'] }) };
  assert.deepEqual(made.creators, ['@o:x', '@p:x']);
  assert.deepEqual([roleOf(made, '@o:x'), levelOf(made, '@p:x')], ['owner', Infinity]);
  assert.deepEqual([mayMakeAdmin(made, '@o:x', '@a:x', false), mayMakeAdmin(made, '@a:x', '@o:x', false), mayRemove(made, '@a:x', '@p:x', 'ban')], [true, false, false]);
  // Made an admin, or no more one, the rest of the levels as they were.
  assert.deepEqual(adminContent({ users: { '@a:x': 100 }, notifications: { room: 50 } }, '@b:x', true), { users: { '@a:x': 100, '@b:x': 100 }, notifications: { room: 50 } });
  assert.deepEqual(adminContent({ users: { '@a:x': 100, '@b:x': 100 } }, '@b:x', false), { users: { '@a:x': 100 } });
});

test('running a group: members and their roles, its name and topic, an admin made, someone taken out and barred', { skip: !coreReady }, async () => {
  const { alice, bob, roomId } = await group('alice-run', 'bob-run');
  const carol = await signIn(HS, 'carol-run', PASSWORD);
  await inviteToRoom(alice, roomId, carol.userId);
  await sync(carol, 0);
  await joinRoom(carol, roomId);
  await sync(bob, 0);

  const members = await roomMembers(alice, roomId);
  assert.deepEqual(members.map((m) => m.id).sort(), [alice.userId, bob.userId, carol.userId].sort());
  const room = alice.rooms[roomId];
  assert.deepEqual([roleOf(room, alice.userId), roleOf(room, bob.userId)], ['admin', null]);

  // Bob may do none of it: he is not asked to, and the homeserver would refuse.
  const bobs = bob.rooms[roomId];
  assert.equal(bobs.power?.users[alice.userId], 100);
  assert.equal(mayRemove(bobs, bob.userId, carol.userId, 'kick'), false);
  await assert.rejects(removeMember(bob, roomId, carol.userId, false), /admins/);
  await assert.rejects(renameRoom(bob, roomId, 'Δική μου'), /admins/);

  await renameRoom(alice, roomId, 'Νέο όνομα');
  await setTopic(alice, roomId, 'Για τον κήπο');
  await sync(bob, 0);
  assert.deepEqual([bobs.name, bobs.topic], ['Νέο όνομα', 'Για τον κήπο']);
  await setTopic(alice, roomId, '');
  await sync(bob, 0);
  assert.equal(bobs.topic, undefined);

  // Bob made an admin: he may now take back others' messages; Alice cannot take it back from him.
  const said = await sendText(carol, roomId, 'κάτι κακό');
  await setAdmin(alice, roomId, bob.userId, true);
  await sync(bob, 0);
  assert.deepEqual([roleOf(bobs, bob.userId), mayRedactOthers(bobs, bob.userId)], ['admin', true]);
  assert.equal(mayMakeAdmin(room, alice.userId, bob.userId, false), false);
  await assert.rejects(setAdmin(alice, roomId, bob.userId, false), /admins/);
  await deleteMessage(bob, roomId, said.id);
  await sync(alice, 0);
  assert.equal(room.messages.find((m) => m.id === said.id)?.deleted, true);

  // Carol taken out, then barred: she cannot come back.
  await removeMember(alice, roomId, carol.userId, false);
  assert.equal(room.members[carol.userId], undefined);
  await inviteToRoom(alice, roomId, carol.userId);
  await sync(carol, 0);
  await joinRoom(carol, roomId);
  await sync(alice, 0);
  await removeMember(alice, roomId, carol.userId, true);
  await assert.rejects(joinRoom(carol, roomId));
  assert.ok(!(await roomMembers(alice, roomId)).some((m) => m.id === carol.userId));
});

test('in a room of version 12 its maker owns it, learned again for a room kept from before', { skip: !coreReady }, async () => {
  server.roomVersion = '12';
  try {
    const { alice, bob, roomId } = await group('alice-v12', 'bob-v12');
    const room = alice.rooms[roomId];
    assert.deepEqual(room.creators, [alice.userId]);
    assert.deepEqual([roleOf(room, alice.userId), room.power?.users[alice.userId]], ['owner', undefined]);
    // The owner makes an admin, and takes it back.
    await setAdmin(alice, roomId, bob.userId, true);
    assert.equal(mayMakeAdmin(room, alice.userId, bob.userId, false), true);
    await setAdmin(alice, roomId, bob.userId, false);
    assert.equal(roleOf(room, bob.userId), null);
    // Kept before Erevos kept who may do what: learned again, as the whole event, or by its ID.
    for (const asEvent of [true, false]) {
      server.stateAsEvent = asEvent;
      delete room.creators;
      delete room.power;
      await learnRule(alice, roomId);
      const learned = alice.rooms[roomId];
      assert.deepEqual([learned.creators, learned.power?.ban], [[alice.userId], 50]);
    }
  } finally {
    server.roomVersion = null;
    server.stateAsEvent = true;
  }
});

test('people are found in the homeserver’s directory by name or ID, but us', { skip: !coreReady }, async () => {
  const dana = await signIn(HS, 'dana-dir', PASSWORD);
  await signIn(HS, 'eli-dir', PASSWORD);
  server.displayNames.set('@eli-dir:example.org', 'Ηλίας');
  assert.deepEqual((await searchPeople(dana, 'ηλί')).people, [{ id: '@eli-dir:example.org', name: 'Ηλίας' }]);
  assert.deepEqual((await searchPeople(dana, '-dir')).people.map((p) => p.id), ['@eli-dir:example.org']);
  assert.deepEqual(await searchPeople(dana, '   '), { people: [], more: false });
  assert.equal(server.asked.filter((a) => a === 'POST /user_directory/search').length, 2);
});
