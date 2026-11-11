// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// The older one-to-one Matrix calls (lib/matrix-voip.ts), as FluffyChat makes them, against the
// small homeserver of checks/matrix-server.ts with the real core for the keys, and a stand-in for
// WebRTC: Bob's app is played here, writing m.call.* as FluffyChat writes them. His call rings,
// is answered encrypted, takes his addresses that come apart, and ends with his hang-up; ours
// rings him, takes his answer and picks it, and ends with ours; an invite not encrypted in an
// encrypted room, or in a room of three, does not ring; a voice call answered with video turns the
// camera on with a new description (m.call.negotiate), and his are taken without asking.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { after, before, test } from 'node:test';

import { currentCall } from '../lib/call';
import { setCore, type Core } from '../lib/core';
import { createGroup, joinRoom, sendEvent, setLegacyCallHandler, setMatrixHttp, signIn, startChat, sync, type Json, type MatrixState } from '../lib/matrix';
import { MATRIX_VOIP_PREFIX, matrixVoipEvent, matrixVoipSessions, startMatrixVoip, watchMatrixVoip, type VoipAccounts } from '../lib/matrix-voip';
import { FakeConnection, FakeStream, FakeTrack } from './fake-rtc';
import { Homeserver, HS, PASSWORD } from './matrix-server';

const built = new URL('./.core/erevos_ffi.js', import.meta.url);
const coreReady = existsSync(built) && typeof (createRequire(import.meta.url)(built.pathname) as Record<string, unknown>).matrix === 'function';

const server = new Homeserver();

before(() => {
  if (!coreReady) return;
  const wasm = createRequire(import.meta.url)(built.pathname) as Record<string, (...args: never[]) => unknown>;
  setCore(Object.fromEntries(Object.entries(wasm).map(([name, fn]) => [name, async (...args: never[]) => fn(...args)])) as unknown as Core);
  setMatrixHttp(async (request) => server.answer(request));
});
after(() => setCore(null));

const ANSWER = 'v=0\r\no=- 3 4 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111\r\n';
const OFFER = 'v=0\r\no=- 1 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111\r\na=candidate:1 1 udp 1 192.0.2.1 5000 typ host\r\n';

class IceConnection extends FakeConnection {
  ice: { candidate: string; sdpMid: string }[] = [];
  async addIceCandidate(candidate: { candidate: string; sdpMid: string }) {
    this.ice.push(candidate);
  }
}

function rtcOf() {
  const connections: IceConnection[] = [];
  return {
    connections,
    rtc: {
      connect(config: ConstructorParameters<typeof FakeConnection>[0]) {
        const connection = new IceConnection(config);
        connections.push(connection);
        return connection;
      },
      async media({ video }: { video: boolean }) {
        return new FakeStream([new FakeTrack('audio'), ...(video ? [new FakeTrack('video')] : [])]);
      },
    },
  };
}

const accountOf = (state: () => MatrixState): VoipAccounts => ({ now: state, change: (use) => use(state()), read: (use) => use(state()) });
const wait = (ms = 30) => new Promise((resolve) => setTimeout(resolve, ms));

// Alice and Bob in an encrypted chat of two, both joined and synced.
async function pair(a: string, b: string) {
  const alice = await signIn(HS, a, PASSWORD);
  const bob = await signIn(HS, b, PASSWORD);
  const room = await startChat(alice, bob.userId);
  await sync(bob, 0);
  await joinRoom(bob, room.id);
  await sync(bob, 0);
  await sync(alice, 0);
  return { alice, bob, roomId: room.id };
}

test("their call as FluffyChat makes it rings, is answered encrypted, takes their addresses and ends with their hang-up", { skip: !coreReady }, async (t) => {
  const { alice, bob, roomId } = await pair('alice-voip', 'bob-voip');
  const { rtc, connections } = rtcOf();
  const stop = watchMatrixVoip(rtc, accountOf(() => alice));
  t.after(stop);
  await sendEvent(bob, roomId, 'm.call.invite', { call_id: 'fluffy1', party_id: 'bobparty', version: '1', lifetime: 60000, offer: { type: 'offer', sdp: OFFER } });
  // As the server keeps it: encrypted.
  assert.equal(server.log.at(-1)!.event.type, 'm.room.encrypted');
  await sync(alice, 0);
  await wait();
  const call = currentCall();
  assert.equal(call?.state, 'incoming');
  assert.equal(call?.peer, `${MATRIX_VOIP_PREFIX}${roomId}`);
  assert.equal(call?.video, false);
  await sendEvent(bob, roomId, 'm.call.candidates', { call_id: 'fluffy1', party_id: 'bobparty', version: '1', candidates: [{ candidate: 'candidate:2 1 udp 1 192.0.2.9 6000 typ host', sdpMid: '0', sdpMLineIndex: 0 }] });
  await sync(alice, 0);
  await call!.answer();
  await wait();
  // Its answer went encrypted, and Bob's app reads it.
  assert.equal(server.log.at(-1)!.event.type, 'm.room.encrypted');
  assert.deepEqual(connections[0].ice.map((c) => c.candidate), ['candidate:2 1 udp 1 192.0.2.9 6000 typ host']);
  await sendEvent(bob, roomId, 'm.call.hangup', { call_id: 'fluffy1', party_id: 'bobparty', version: '1', reason: 'user_hangup' });
  await sync(alice, 0);
  assert.equal(call!.state, 'ended');
  assert.equal(matrixVoipSessions(), 0);
});

test('our call rings them with an invite to them, takes their answer and picks it, and ends with our hang-up', { skip: !coreReady }, async (t) => {
  const { alice, bob, roomId } = await pair('alice-voip2', 'bob-voip2');
  const { rtc, connections } = rtcOf();
  const stop = watchMatrixVoip(rtc, accountOf(() => alice));
  t.after(stop);
  // Bob's app: what comes to him, opened, is kept here; Alice's goes to the calls.
  const sent: Json[] = [];
  setLegacyCallHandler(async (state, event) => {
    if (state !== bob) return matrixVoipEvent(state, event);
    sent.push({ type: event.type, ...event.content, sealed: event.sealed });
    return false;
  });
  const call = await startMatrixVoip(roomId, false, rtc);
  await wait(60);
  await sync(bob, 0);
  const invite = sent.find((e) => e.type === 'm.call.invite')!;
  assert.equal(invite.invitee, bob.userId);
  assert.equal(invite.sealed, true);
  assert.equal(invite.version, '1');
  assert.equal(invite.call_id, call.id);
  assert.match(String((invite.offer as Json).sdp), /^v=0/);
  await sendEvent(bob, roomId, 'm.call.answer', { call_id: call.id, party_id: 'bobparty', version: '1', answer: { type: 'answer', sdp: ANSWER } });
  await sync(alice, 0);
  await wait();
  assert.equal(call.state, 'connecting');
  assert.equal(connections[0].remote?.sdp, ANSWER);
  await sync(bob, 0);
  assert.equal(sent.find((e) => e.type === 'm.call.select_answer')?.selected_party_id, 'bobparty');
  call.hangUp();
  await wait();
  await sync(bob, 0);
  assert.equal(sent.find((e) => e.type === 'm.call.hangup')?.reason, 'user_hangup');
});

test('an invite not encrypted in an encrypted room, or in a room of three, does not ring', { skip: !coreReady }, async (t) => {
  const { alice, bob, roomId } = await pair('alice-voip3', 'bob-voip3');
  const { rtc } = rtcOf();
  const stop = watchMatrixVoip(rtc, accountOf(() => alice));
  t.after(stop);
  // Sent as it is, past the encryption, as only a server or a broken app would.
  await server.answer({ method: 'PUT', url: `${HS}/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/send/m.call.invite/x1`, token: bob.accessToken, body: { call_id: 'plain1', party_id: 'p', version: '1', lifetime: 60000, offer: { type: 'offer', sdp: OFFER } } });
  await sync(alice, 0);
  await wait();
  assert.equal(currentCall(), null);
  const carl = await signIn(HS, 'carl-voip3', PASSWORD);
  const group = await createGroup(alice, 'Τρεις', [bob.userId, carl.userId]);
  await sync(bob, 0);
  await joinRoom(bob, group.id);
  await sync(carl, 0);
  await joinRoom(carl, group.id);
  await sync(alice, 0);
  await sync(bob, 0);
  await sendEvent(bob, group.id, 'm.call.invite', { call_id: 'three1', party_id: 'p', version: '1', lifetime: 60000, offer: { type: 'offer', sdp: OFFER } });
  await sync(alice, 0);
  await wait();
  assert.equal(currentCall(), null);
  await assert.rejects(startMatrixVoip(group.id, false, rtc), /one person/);
});

const WITH_VIDEO = `${OFFER}m=video 9 UDP/TLS/RTP/SAVPF 96\r\n`;

test('a voice call answered with video turns the camera on with a new description his app answers; his are taken without asking', { skip: !coreReady }, async (t) => {
  const { alice, bob, roomId } = await pair('alice-voip4', 'bob-voip4');
  const { rtc, connections } = rtcOf();
  const stop = watchMatrixVoip(rtc, accountOf(() => alice));
  t.after(stop);
  const sent: Json[] = [];
  setLegacyCallHandler(async (state, event) => {
    if (state !== bob) return matrixVoipEvent(state, event);
    sent.push({ type: event.type, ...event.content, sealed: event.sealed });
    return false;
  });
  // What Bob's app has of `type`, once it came.
  const came = async (type: string, count = 1) => {
    for (let i = 0; i < 40 && sent.filter((e) => e.type === type).length < count; i++) {
      await wait();
      await sync(bob, 0);
    }
    return sent.filter((e) => e.type === type)[count - 1];
  };
  await sendEvent(bob, roomId, 'm.call.invite', { call_id: 'fluffy4', party_id: 'bobparty', version: '1', lifetime: 60000, offer: { type: 'offer', sdp: OFFER } });
  await sync(alice, 0);
  await wait();
  const call = currentCall()!;
  assert.deepEqual([call.video, call.canAnswerWithVideo], [false, true]);
  await call.answer(true);
  connections[0].connect(new FakeStream([new FakeTrack('audio')]));
  const offer = (await came('m.call.negotiate'))!;
  assert.equal(offer.sealed, true);
  assert.equal(offer.call_id, 'fluffy4');
  assert.equal((offer.description as Json).type, 'offer');
  assert.equal(call.addingVideo, true);
  await sendEvent(bob, roomId, 'm.call.negotiate', { call_id: 'fluffy4', party_id: 'bobparty', version: '1', lifetime: 30000, description: { type: 'answer', sdp: ANSWER } });
  await sync(alice, 0);
  await wait();
  assert.deepEqual(connections[0].remote, { type: 'answer', sdp: ANSWER });
  assert.deepEqual([call.video, call.hasCamera, call.addingVideo], [true, true, false]);
  // Bob changes the call himself: taken at once, and answered.
  await sendEvent(bob, roomId, 'm.call.negotiate', { call_id: 'fluffy4', party_id: 'bobparty', version: '1', lifetime: 30000, description: { type: 'offer', sdp: WITH_VIDEO } });
  await sync(alice, 0);
  await wait(60);
  assert.deepEqual(connections[0].remote, { type: 'offer', sdp: WITH_VIDEO });
  assert.equal(((await came('m.call.negotiate', 2))!.description as Json).type, 'answer');
  call.hangUp();
  await wait();

  // Answered with voice only, his picture added to it shows, and the camera here stays off until turned on.
  await sendEvent(bob, roomId, 'm.call.invite', { call_id: 'fluffy5', party_id: 'bobparty', version: '1', lifetime: 60000, offer: { type: 'offer', sdp: OFFER } });
  await sync(alice, 0);
  await wait();
  const voice = currentCall()!;
  await voice.answer(false);
  connections[1].connect(new FakeStream([new FakeTrack('audio')]));
  await sendEvent(bob, roomId, 'm.call.negotiate', { call_id: 'fluffy5', party_id: 'bobparty', version: '1', lifetime: 30000, description: { type: 'offer', sdp: WITH_VIDEO } });
  await sync(alice, 0);
  await wait(60);
  assert.equal(voice.askingVideo, false);
  assert.deepEqual([voice.video, voice.hasCamera, voice.cameraOff, voice.canTurnCameraOn], [true, false, true, true]);
  voice.hangUp();
  await wait();

  // An app of the first version has no new descriptions: its voice call is answered with voice only.
  await sendEvent(bob, roomId, 'm.call.invite', { call_id: 'fluffy6', party_id: 'bobparty', version: 0, lifetime: 60000, offer: { type: 'offer', sdp: OFFER } });
  await sync(alice, 0);
  await wait();
  const old = currentCall()!;
  assert.equal(old.canAnswerWithVideo, false);
  old.decline();
  await wait();
});
