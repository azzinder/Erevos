// What Matrix accounts (lib/matrix.ts) do besides chatting, against the small homeserver of
// checks/matrix-server.ts, with the real core built to WebAssembly: threads (m.thread), polls with
// votes and their end, places and links' previews as Element and Beeper carry them, messages pinned
// to a room's top, favourites and rooms of low priority, a room left and forgotten, public rooms
// and what a space holds, looking for words among the messages kept, making an account with the
// steps a homeserver asks for, and the account's devices, named and signed out.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { after, before, test } from 'node:test';

import { setCore, type Core } from '../lib/core';
import { createGroup, joinRoom, sendContent, sendStateEvent, sendInThread, sendLocation, sendPoll, sendPollEnd, sendText, sendVote, setMatrixHttp, signIn, sync, type MatrixState } from '../lib/matrix';
import { authFor, isAccountName, listDevices, nameFree, register, renameDevice, signOutDevices } from '../lib/matrix-account';
import { geoUri, placeOfGeo, pollOfContent, pollShown, previewContent, previewOfContent, threadOf } from '../lib/matrix-parts';
import { findMessages, leaveAndForget, pinMessage, publicRooms, sortedRooms, spaceRooms, tagRoom } from '../lib/matrix-rooms';
import { Homeserver, HS, PASSWORD } from './matrix-server';

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
