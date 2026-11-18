// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// Calls (lib/call.ts): how a call goes from ringing to connected to ended, with a stand-in for
// WebRTC, and which call signals are taken (lib/call-signal.ts); a call answered with the camera or
// voice only, video added to it and their asking for it, the camera turned on later and switched,
// and an Erevos from before sent no new description. The sound and picture themselves are
// WebRTC's, tried on phones.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { afterEach, mock, test } from 'node:test';

import { ASK_MS, Call, describedSdp, theirStream, GATHER_MS, RELAYED_GRACE_MS, callNow, connectionConfig, currentCall, candidateFits, capVideo, RELAY_VIDEO_BITRATE, isLocalAddress, localOnlySdp, OFFER_FRESH_MS, offerMissed, offerRingsFor, relayToAnswer, remoteSdp, RING_MS, RINGING_BACK_MS, setClockOffset, soon, type Rtc } from '../lib/call';
import { decodeCall, MAX_SDP, type CallSignal } from '../lib/call-signal';
import { callClock, callSignal, closeCall, endedLine, onCallChange, shownCall, startCall, type CallPlace } from '../lib/calls';
import { FakeConnection, fakeRtc, FakeStream, FakeTrack } from './fake-rtc';

function events() {
  const sent: CallSignal[] = [];
  let changes = 0;
  return {
    sent,
    changes: () => changes,
    events: {
      onChange: () => void changes++,
      send: async (signal: CallSignal) => void sent.push(signal),
    },
  };
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 30));

const TURN = { urls: ['turn:relay.example.org:3478'], username: '1', credential: 'c' };

afterEach(() => {
  currentCall()?.hangUp();
  const shown = shownCall();
  if (shown) closeCall(shown.call);
});

// Where calls belong, as the space's or the hidden chats' would be.
function place(relay: typeof TURN | null = TURN) {
  const sent: { identity: string; signal: CallSignal }[] = [];
  const lines: { peer: string; mine: boolean; text: string }[] = [];
  const calls: CallPlace = {
    send: async (identity, signal) => void sent.push({ identity, signal }),
    callRelay: async () => relay,
    line: (peer, mine, text) => void lines.push({ peer, mine, text }),
    name: () => 'Anna',
  };
  return { calls, sent, lines };
}

test('a call we make: offer, ringing, answer, connected, hung up', async () => {
  const { rtc, connections, streams } = fakeRtc();
  const ours = events();
  const call = Call.start({ peer: 'contact:a', video: true, relay: TURN, rtc, events: ours.events });
  assert.equal(call.state, 'calling');
  assert.equal(currentCall(), call);
  assert.throws(() => Call.start({ peer: 'contact:b', video: false, relay: TURN, rtc, events: events().events }));
  await settle();

  const [connection] = connections;
  // Through the call relay only.
  assert.deepEqual(connection.config, { iceServers: [{ urls: TURN.urls, username: '1', credential: 'c' }], iceTransportPolicy: 'relay' });
  assert.equal(connection.added.length, 2);
  const [offer] = ours.sent;
  assert.equal(offer.kind, 'offer');
  assert.ok(offer.kind === 'offer' && offer.video && offer.sdp.includes('candidate') && offer.id === call.id);

  call.receive({ id: 'ffffffffffffffff', kind: 'ringing' });
  assert.equal(call.state, 'calling');
  call.receive({ id: call.id, kind: 'ringing' });
  assert.equal(call.state, 'ringing');

  call.receive({ id: call.id, kind: 'answer', sdp: 'v=0\r\nanswer' });
  assert.equal(call.state, 'connecting');
  await settle();
  assert.deepEqual(connection.remote, { type: 'answer', sdp: 'v=0\r\nanswer' });

  const theirs = new FakeStream([new FakeTrack('audio'), new FakeTrack('video')]);
  connection.connect(theirs);
  assert.equal(call.state, 'connected');
  assert.equal(call.remote, theirs);
  assert.ok(call.connectedAt > 0);

  call.setMuted(true);
  assert.equal(streams[0].getAudioTracks()[0].enabled, false);
  call.setCameraOff(true);
  assert.equal(streams[0].getVideoTracks()[0].enabled, false);
  call.switchCamera();
  assert.equal(streams[0].getVideoTracks()[0].switched, 1);

  call.hangUp();
  assert.equal(call.state, 'ended');
  assert.deepEqual(call.ended, { reason: 'hangup', byUs: true });
  assert.deepEqual(ours.sent.at(-1), { id: call.id, kind: 'end', reason: 'hangup' });
  assert.ok(streams[0].tracks.every((track) => track.stopped));
  assert.ok(connection.closed);
  assert.equal(currentCall(), null);
});

test('a call goes direct only between addresses on the same network; else through the call relay, never showing an internet address', () => {
  const line = (address: string, typ = 'host') => `a=candidate:1 1 udp 2122260223 ${address} 50000 typ ${typ}`;
  const sdp = (...addresses: string[]) => ['v=0', ...addresses.map((a) => line(a))].join('\r\n');
  for (const local of ['192.168.1.4', '10.0.0.2', '172.20.1.1', '169.254.3.3', 'fe80::1', 'fd12::5', 'abcd-1234.local']) assert.ok(isLocalAddress(local), local);
  for (const open of ['8.8.8.8', '172.32.0.1', '2a02:587:1::5', '']) assert.ok(!isLocalAddress(open), open);
  // An offer with no call relay and only local addresses: answered direct.
  assert.equal(relayToAnswer(sdp('192.168.1.4', 'fe80::1'), TURN), null);
  // One with an internet address and no call relay, as a changed app might send: through ours all the same.
  assert.equal(relayToAnswer(sdp('192.168.1.4', '2a02:587:1::5'), TURN), TURN);
  assert.equal(relayToAnswer(`${sdp('192.168.1.4')}\r\n${line('1.2.3.4', 'relay')}`, TURN), TURN);
  // What a direct call says of this device: its local addresses only.
  assert.equal(localOnlySdp(sdp('192.168.1.4', '2a02:587:1::5', '8.8.8.8')), sdp('192.168.1.4'));
  // And what it takes of the other side's: with no call relay, their local addresses only, so its
  // checks never reach an internet address; through a call relay, all of it.
  assert.equal(remoteSdp(sdp('192.168.1.4', '8.8.8.8'), true), sdp('192.168.1.4'));
  assert.equal(remoteSdp(sdp('192.168.1.4', '8.8.8.8'), false), sdp('192.168.1.4', '8.8.8.8'));
  assert.ok(candidateFits({ candidate: 'candidate:1 1 udp 2122260223 192.168.1.9 50000 typ host' }, true));
  assert.ok(!candidateFits({ candidate: 'candidate:1 1 udp 1686052607 8.8.8.8 50000 typ srflx' }, true));
  assert.ok(candidateFits({ candidate: 'candidate:1 1 udp 1686052607 8.8.8.8 50000 typ srflx' }, false));
});

test('a call that rings here: ringing said, answered, and ended by them', async () => {
  const { rtc, connections } = fakeRtc();
  const ours = events();
  const offer = { id: '0123456789abcdef', kind: 'offer' as const, video: false, sdp: 'v=0\r\noffer', at: Date.now() };
  const call = Call.incoming(offer, { peer: 'contact:a', relay: null, rtc, events: ours.events })!;
  assert.equal(call.state, 'incoming');
  assert.equal(call.video, false);
  assert.deepEqual(ours.sent, [{ id: offer.id, kind: 'ringing' }]);
  // A second call while this one rings finds the phone busy.
  assert.equal(Call.incoming({ ...offer, id: '1111111111111111' }, { peer: 'contact:b', relay: null, rtc, events: events().events }), null);

  await call.answer();
  const [connection] = connections;
  // No call relay: straight between the phones, saying only addresses on this network.
  assert.deepEqual(connection.config, { iceServers: [], iceTransportPolicy: 'all' });
  assert.deepEqual(connection.remote, { type: 'offer', sdp: offer.sdp });
  assert.deepEqual(ours.sent.at(-1), { id: offer.id, kind: 'answer', sdp: 'v=0\r\nanswer', reoffer: true });
  assert.equal(call.state, 'connecting');

  call.receive({ id: offer.id, kind: 'end', reason: 'hangup' });
  assert.deepEqual(call.ended, { reason: 'hangup', byUs: false });
  // Not said back.
  assert.equal(ours.sent.at(-1)?.kind, 'answer');
});

test('a call turned down here, and one we stop before it is answered', async () => {
  const { rtc } = fakeRtc();
  const theirs = events();
  const offer = { id: '0123456789abcdef', kind: 'offer' as const, video: true, sdp: 'v=0\r\noffer', at: Date.now() };
  Call.incoming(offer, { peer: 'contact:a', relay: TURN, rtc, events: theirs.events })!.decline();
  assert.deepEqual(theirs.sent.at(-1), { id: offer.id, kind: 'end', reason: 'decline' });

  const ours = events();
  const call = Call.start({ peer: 'contact:a', video: false, relay: TURN, rtc, events: ours.events });
  await settle();
  call.hangUp();
  // To them, a call they missed.
  assert.deepEqual(ours.sent.at(-1), { id: call.id, kind: 'end', reason: 'missed' });
});

test('a call nobody answers stops ringing on both phones', async () => {
  mock.timers.enable({ apis: ['setTimeout'] });
  try {
    const { rtc } = fakeRtc();
    const ours = events();
    const offer = { id: '0123456789abcdef', kind: 'offer' as const, video: false, sdp: 'v=0\r\noffer', at: Date.now() };
    const call = Call.incoming(offer, { peer: 'contact:a', relay: TURN, rtc, events: ours.events })!;
    mock.timers.tick(RING_MS);
    assert.deepEqual(call.ended, { reason: 'missed', byUs: true });
    assert.equal(currentCall(), null);
  } finally {
    mock.timers.reset();
  }
});

// Lets the promises waiting go on, with setTimeout's timers mocked: the fake's gathering ends 10 ms in.
const flush = async () => {
  for (let i = 0; i < 20; i++) await new Promise((resolve) => setImmediate(resolve));
  mock.timers.tick(10);
  for (let i = 0; i < 20; i++) await new Promise((resolve) => setImmediate(resolve));
};

test("a call we make waits for their phone to ring as long as it may still ring there, then RING_MS from then", async () => {
  mock.timers.enable({ apis: ['setTimeout'] });
  try {
    const { rtc } = fakeRtc();
    // Their phone took the offer late, as through a slow look: it rings well after RING_MS.
    const ours = events();
    const call = Call.start({ peer: 'contact:a', video: false, relay: TURN, rtc, events: ours.events });
    await flush();
    assert.equal(ours.sent.at(-1)?.kind, 'offer');
    mock.timers.tick(RING_MS + 5000);
    assert.equal(call.state, 'calling');
    call.receive({ id: call.id, kind: 'ringing' });
    assert.equal(call.state, 'ringing');
    mock.timers.tick(RING_MS - 1);
    assert.equal(call.state, 'ringing');
    mock.timers.tick(1);
    assert.deepEqual(call.ended, { reason: 'missed', byUs: true });
    assert.deepEqual(ours.sent.at(-1), { id: call.id, kind: 'end', reason: 'missed' });

    // Their phone never rang: it gives up once the offer could no longer ring there, and a while for its word.
    const again = events();
    const unanswered = Call.start({ peer: 'contact:a', video: false, relay: TURN, rtc, events: again.events });
    await flush();
    mock.timers.tick(OFFER_FRESH_MS + RINGING_BACK_MS - 1);
    assert.equal(unanswered.state, 'calling');
    mock.timers.tick(1);
    assert.deepEqual(unanswered.ended, { reason: 'missed', byUs: true });
    assert.deepEqual(again.sent.at(-1), { id: unanswered.id, kind: 'end', reason: 'missed' });
  } finally {
    mock.timers.reset();
  }
});

test('a call we make whose offer does not go gives up as before, RING_MS from the start', async () => {
  mock.timers.enable({ apis: ['setTimeout'] });
  try {
    const { rtc } = fakeRtc();
    const sent: CallSignal[] = [];
    // The relay never answers the send.
    const call = Call.start({ peer: 'contact:a', video: false, relay: TURN, rtc, events: { onChange: () => undefined, send: (signal) => (sent.push(signal), signal.kind === 'offer' ? new Promise<void>(() => undefined) : Promise.resolve()) } });
    await flush();
    mock.timers.tick(RING_MS);
    assert.deepEqual(call.ended, { reason: 'missed', byUs: true });
  } finally {
    mock.timers.reset();
  }
});

test('a connection that fails ends the call', async () => {
  const { rtc, connections } = fakeRtc();
  const call = Call.start({ peer: 'contact:a', video: false, relay: TURN, rtc, events: events().events });
  await settle();
  call.receive({ id: call.id, kind: 'answer', sdp: 'v=0\r\nanswer' });
  connections[0].connectionState = 'failed';
  connections[0].emit('connectionstatechange');
  assert.deepEqual(call.ended, { reason: 'failed', byUs: true });
});

test('no microphone: the call ends at once', async () => {
  const rtc: Rtc = { connect: () => assert.fail('no connection without media'), media: async () => Promise.reject(new Error('refused')) };
  const ours = events();
  const call = Call.start({ peer: 'contact:a', video: false, relay: TURN, rtc, events: ours.events });
  await settle();
  assert.deepEqual(call.ended, { reason: 'failed', byUs: true });
  assert.deepEqual(ours.sent, [{ id: call.id, kind: 'end', reason: 'failed' }]);
});

test('only well-formed call signals are taken', () => {
  const id = '0123456789abcdef';
  assert.deepEqual(decodeCall({ id, kind: 'offer', video: 1, sdp: 'v=0\r\n', at: 3 }), { id, kind: 'offer', video: false, sdp: 'v=0\r\n', at: 3 });
  assert.equal(decodeCall({ id, kind: 'offer', sdp: 'v=0\r\n' }), null);
  assert.equal(decodeCall({ id, kind: 'answer', sdp: 'nonsense' }), null);
  assert.equal(decodeCall({ id, kind: 'answer', sdp: `v=0${'x'.repeat(MAX_SDP)}` }), null);
  assert.equal(decodeCall({ id: 'XYZ', kind: 'ringing' }), null);
  assert.equal(decodeCall({ id, kind: 'end', reason: 'because' }), null);
  assert.deepEqual(decodeCall({ id, kind: 'end', reason: 'busy' }), { id, kind: 'end', reason: 'busy' });
  assert.equal(decodeCall(null), null);
  assert.equal(decodeCall('offer'), null);
});

test('without a call relay a call goes direct, with one only through it', () => {
  assert.equal(connectionConfig(null).iceTransportPolicy, 'all');
  assert.equal(connectionConfig(TURN).iceTransportPolicy, 'relay');
});

test('an offer with no call relay address is answered direct, as on a Wi-Fi with no internet', async () => {
  const sdp = (candidate: string) => `v=0\r\na=candidate:1 1 udp 2122260223 192.168.1.20 50000 typ ${candidate}`;
  assert.equal(relayToAnswer(sdp('host'), TURN), null);
  assert.equal(relayToAnswer(sdp('relay'), TURN), TURN);
  assert.equal(relayToAnswer(sdp('relay'), null), null);

  const { rtc, connections } = fakeRtc();
  const here = place();
  await callSignal(here.calls, 'contact:a', { id: '0123456789abcdef', kind: 'offer', video: false, sdp: sdp('host'), at: Date.now() }, false, rtc);
  const { call } = shownCall()!;
  await call.answer();
  assert.deepEqual(connections[0].config, { iceServers: [], iceTransportPolicy: 'all' });
  call.hangUp();
  closeCall(call);
});

test('soon gives up on what takes too long', async () => {
  assert.equal(await soon(new Promise<string>(() => undefined), 20, 'late'), 'late');
  assert.equal(await soon(Promise.resolve('now'), 1000, 'late'), 'now');
});

test('a call rings wherever it comes from, and leaves its line where it belongs', async () => {
  const { rtc } = fakeRtc();
  const here = place();
  const offer = { id: '0123456789abcdef', kind: 'offer' as const, video: true, sdp: 'v=0\r\noffer', at: Date.now() };
  assert.equal(await callSignal(here.calls, 'contact:a', offer, false, rtc), null);
  const shown = shownCall()!;
  assert.equal(shown.place, here.calls);
  assert.equal(shown.call.state, 'incoming');
  assert.deepEqual(here.sent, [{ identity: 'a', signal: { id: offer.id, kind: 'ringing' } }]);
  // The same offer again, and news of another call, change nothing.
  await callSignal(here.calls, 'contact:a', offer, false, rtc);
  await callSignal(here.calls, 'contact:a', { id: '2222222222222222', kind: 'end', reason: 'hangup' }, false, rtc);
  assert.equal(shown.call.state, 'incoming');

  // Someone else calls meanwhile: told we are busy, and a line here.
  const other = place();
  await callSignal(other.calls, 'contact:b', { ...offer, id: '1111111111111111' }, false, rtc);
  assert.deepEqual(other.sent, [{ identity: 'b', signal: { id: '1111111111111111', kind: 'end', reason: 'busy' } }]);
  assert.deepEqual(other.lines, [{ peer: 'contact:b', mine: false, text: 'Missed video call, while in another call' }]);

  await callSignal(here.calls, 'contact:a', { id: offer.id, kind: 'end', reason: 'hangup' }, false, rtc);
  assert.equal(shown.call.state, 'ended');
  assert.deepEqual(here.lines, [{ peer: 'contact:a', mine: false, text: 'Missed video call' }]);
  closeCall(shown.call);
  assert.equal(shownCall(), null);
});

test('two calls read in one look: the second is told busy, and the same offer twice rings once', async () => {
  const { rtc } = fakeRtc();
  const a = place();
  const b = place();
  const offer = { id: '0123456789abcdef', kind: 'offer' as const, video: false, sdp: 'v=0\r\noffer', at: Date.now() };
  // Both are past the first look at whether a call goes on while their call relay is asked.
  await Promise.all([callSignal(a.calls, 'contact:a', offer, false, rtc), callSignal(b.calls, 'contact:b', { ...offer, id: '1111111111111111' }, false, rtc)]);
  const shown = shownCall()!;
  assert.equal(shown.call.peer, 'contact:a');
  assert.equal(shown.call.state, 'incoming');
  assert.deepEqual(b.sent, [{ identity: 'b', signal: { id: '1111111111111111', kind: 'end', reason: 'busy' } }]);
  assert.deepEqual(b.lines, [{ peer: 'contact:b', mine: false, text: 'Missed voice call, while in another call' }]);
  shown.call.hangUp();
  closeCall(shown.call);

  // The same offer through two ways at once: one ring, no busy, no line.
  const c = place();
  const again = { ...offer, id: '2222222222222222' };
  await Promise.all([callSignal(c.calls, 'contact:c', again, false, rtc), callSignal(c.calls, 'contact:c', again, false, rtc)]);
  assert.deepEqual(c.sent, [{ identity: 'c', signal: { id: again.id, kind: 'ringing' } }]);
  assert.deepEqual(c.lines, []);
  assert.equal(shownCall()?.call.state, 'incoming');
});

test('a listener that fails does not keep a call from ringing, nor the others from hearing', async () => {
  const { rtc } = fakeRtc();
  const here = place();
  let heard = 0;
  const stopFailing = onCallChange(() => {
    throw new Error('no ringtone');
  });
  const stopHearing = onCallChange(() => void heard++);
  try {
    const offer = { id: '3333333333333333', kind: 'offer' as const, video: false, sdp: 'v=0\r\noffer', at: Date.now() };
    assert.equal(await callSignal(here.calls, 'contact:a', offer, false, rtc), null);
    assert.ok(heard > 0);
    assert.equal(shownCall()?.call.state, 'incoming');
  } finally {
    stopFailing();
    stopHearing();
  }
});

test('an old call, or one from a message request, does not ring', async () => {
  const { rtc } = fakeRtc();
  const here = place();
  const offer = { id: '0123456789abcdef', kind: 'offer' as const, video: false, sdp: 'v=0\r\noffer', at: Date.now() - 5 * 60_000 };
  assert.equal(await callSignal(here.calls, 'contact:a', offer, false, rtc), null);
  assert.deepEqual(here.lines, [{ peer: 'contact:a', mine: false, text: 'Missed voice call' }]);
  const said = await callSignal(here.calls, 'contact:a', { ...offer, at: Date.now() }, true, rtc);
  assert.match(said ?? '', /Anna tried to call/);
  assert.equal(shownCall(), null);
  assert.deepEqual(here.sent, []);
});

test('a call is stamped and judged by the relay’s clock: one from a phone minutes behind rings, one stamped hours ahead waits a minute at most', async () => {
  assert.equal(offerMissed(1000, 1000 + OFFER_FRESH_MS), false);
  assert.equal(offerMissed(1000, 1000 + OFFER_FRESH_MS + 1), true);
  assert.equal(offerRingsFor(1000, 1000), OFFER_FRESH_MS);
  assert.equal(offerRingsFor(1000 + 3 * 3600_000, 1000), OFFER_FRESH_MS);
  assert.equal(offerRingsFor(1000, 1000 + OFFER_FRESH_MS + 5), 0);
  // This phone's clock is 5 minutes ahead of the relay's; the caller's is right.
  setClockOffset(-5 * 60_000);
  try {
    assert.ok(Math.abs(callNow() - (Date.now() - 5 * 60_000)) < 100);
    const { rtc } = fakeRtc();
    const here = place();
    const offer = { id: 'fedcba9876543210', kind: 'offer' as const, video: false, sdp: 'v=0\r\noffer', at: Date.now() - 5 * 60_000 };
    assert.equal(await callSignal(here.calls, 'contact:a', offer, false, rtc), null);
    assert.equal(shownCall()?.call.state, 'incoming');
  } finally {
    setClockOffset(0);
  }
});

test('the line a call we made leaves', async () => {
  const { rtc } = fakeRtc();
  const here = place();
  const call = startCall(here.calls, 'contact:a', false, TURN, rtc);
  await settle();
  call.receive({ id: call.id, kind: 'end', reason: 'decline' });
  assert.deepEqual(here.lines, [{ peer: 'contact:a', mine: true, text: 'Voice call, turned down' }]);
  assert.equal(endedLine(call), 'Voice call, turned down');
  assert.equal(callClock(3_725_000), '1:02:05');
  assert.equal(callClock(42_000), '0:42');
});

test('a call rings on every device of the account it calls: the first to answer has it, the others are told, and stop ringing there', async () => {
  const { rtc, connections } = fakeRtc();
  const DELL = 'd'.repeat(64);
  // The caller: answered on the computer, it tells the account's devices which one has it.
  const caller = place();
  const call = startCall(caller.calls, 'contact:b', false, TURN, rtc);
  await settle();
  await callSignal(caller.calls, 'contact:b', { id: call.id, kind: 'ringing' }, false, rtc, '');
  await callSignal(caller.calls, 'contact:b', { id: call.id, kind: 'answer', sdp: 'v=0\r\nanswer' }, false, rtc, DELL);
  assert.equal(call.state, 'connecting');
  assert.deepEqual(caller.sent.at(-1), { identity: 'b', signal: { id: call.id, kind: 'end', reason: 'taken', by: DELL } });
  // A second answer, from the phone too late, changes nothing and says nothing more.
  const said = caller.sent.length;
  await callSignal(caller.calls, 'contact:b', { id: call.id, kind: 'answer', sdp: 'v=0\r\nlate' }, false, rtc, '');
  assert.equal(caller.sent.length, said);
  connections[0].connect(new FakeStream([new FakeTrack('audio')]));
  assert.equal(call.state, 'connected');
  call.hangUp();
  closeCall(call);

  // On the account's phone, where it rang: stops, answered on another device; on the computer that has it, nothing.
  const offer = { id: '0123456789abcdef', kind: 'offer' as const, video: false, sdp: 'v=0\r\noffer', at: Date.now() };
  const phone = place();
  await callSignal(phone.calls, 'contact:a', offer, false, rtc);
  const ringing = shownCall()!.call;
  await callSignal(phone.calls, 'contact:a', { id: offer.id, kind: 'end', reason: 'taken', by: DELL }, false, rtc);
  assert.deepEqual([ringing.state, ringing.ended?.elsewhere], ['ended', true]);
  closeCall(ringing);
  const computer = place();
  computer.calls.me = async () => DELL;
  await callSignal(computer.calls, 'contact:a', { ...offer, id: '1111111111111111' }, false, rtc);
  const there = shownCall()!.call;
  await callSignal(computer.calls, 'contact:a', { id: '1111111111111111', kind: 'end', reason: 'taken', by: DELL }, false, rtc);
  assert.equal(there.state, 'incoming');
  there.hangUp();
  closeCall(there);

  // Turned down on one device: turned down on the others.
  const decliner = place();
  const outgoing = startCall(decliner.calls, 'contact:c', false, TURN, rtc);
  await settle();
  await callSignal(decliner.calls, 'contact:c', { id: outgoing.id, kind: 'end', reason: 'decline' }, false, rtc, DELL);
  assert.equal(outgoing.state, 'ended');
  assert.deepEqual(decliner.sent.at(-1), { identity: 'c', signal: { id: outgoing.id, kind: 'end', reason: 'decline', by: DELL } });
  closeCall(outgoing);
});

test('an end that says which device has the call is read only so', () => {
  assert.deepEqual(decodeCall({ id: '0123456789abcdef', kind: 'end', reason: 'taken', by: 'a'.repeat(64) }), { id: '0123456789abcdef', kind: 'end', reason: 'taken', by: 'a'.repeat(64) });
  assert.deepEqual(decodeCall({ id: '0123456789abcdef', kind: 'end', reason: 'taken', by: '' }), { id: '0123456789abcdef', kind: 'end', reason: 'taken', by: '' });
  assert.equal(decodeCall({ id: '0123456789abcdef', kind: 'end', reason: 'taken' }), null);
  assert.equal(decodeCall({ id: '0123456789abcdef', kind: 'end', reason: 'taken', by: 'xyz' }), null);
  assert.deepEqual(decodeCall({ id: '0123456789abcdef', kind: 'end', reason: 'hangup', by: 7 }), { id: '0123456789abcdef', kind: 'end', reason: 'hangup' });
});

// ---- answered with the camera or voice only, video added, the camera turned on later and switched ----

const VOICE_OFFER = 'v=0\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111\r\n';
const VIDEO_OFFER = 'v=0\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111\r\nm=video 9 UDP/TLS/RTP/SAVPF 96\r\n';
const kinds = (connection: FakeConnection) => connection.transceivers.map((t) => [t.receiver.track.kind, t.direction, !!t.sender.track]);

test('a video call answered with voice only opens no camera, gets their picture, and turns the camera on later as their phone takes it', async () => {
  const { rtc, connections, asked } = fakeRtc();
  const ours = events();
  const offer = { id: '0123456789abcdef', kind: 'offer' as const, video: true, sdp: VIDEO_OFFER, at: Date.now(), reoffer: true as const };
  const call = Call.incoming(offer, { peer: 'contact:a', relay: TURN, rtc, events: ours.events })!;
  assert.equal(call.canAnswerWithVideo, true);
  await call.answer(false);
  assert.deepEqual(asked, [{ audio: true, video: false }]);
  assert.deepEqual([call.video, call.hasCamera, call.cameraOff], [true, false, true]);
  const [connection] = connections;
  // Their picture comes; nothing of ours goes on it.
  assert.deepEqual(kinds(connection), [['audio', 'sendrecv', true], ['video', 'recvonly', false]]);
  assert.deepEqual(ours.sent.at(-1), { id: offer.id, kind: 'answer', sdp: 'v=0\r\nanswer\r\na=candidate:relay', reoffer: true });
  connection.connect(new FakeStream([new FakeTrack('audio'), new FakeTrack('video')]));
  // No camera to turn on by its button: it is turned on as a change of the call.
  call.setCameraOff(false);
  assert.equal(call.cameraOff, true);
  assert.deepEqual([call.canTurnCameraOn, call.canAddVideo], [true, false]);
  const turning = call.turnCameraOn();
  await settle();
  assert.equal(call.addingVideo, true);
  assert.deepEqual(ours.sent.at(-1), { id: offer.id, kind: 'reoffer', sdp: 'v=0\r\noffer\r\na=candidate:relay' });
  // Their phone answers it without asking: the camera took the video that only came.
  call.receive({ id: offer.id, kind: 'reanswer', sdp: 'v=0\r\ntheirs' });
  await turning;
  assert.deepEqual(connection.remote, { type: 'answer', sdp: 'v=0\r\ntheirs' });
  assert.deepEqual([call.video, call.hasCamera, call.cameraOff, call.addingVideo, call.canTurnCameraOn], [true, true, false, false, false]);
  assert.deepEqual(kinds(connection), [['audio', 'sendrecv', true], ['video', 'sendrecv', true]]);
  call.hangUp();
});

test('their camera turned on in a video call is taken without asking, once though it comes twice', async () => {
  const { rtc, connections } = fakeRtc();
  const ours = events();
  const call = Call.start({ peer: 'contact:a', video: true, relay: TURN, rtc, events: ours.events });
  await settle();
  assert.equal((ours.sent[0] as Extract<CallSignal, { kind: 'offer' }>).reoffer, true);
  call.receive({ id: call.id, kind: 'answer', sdp: 'v=0\r\nanswer', reoffer: true });
  await settle();
  connections[0].connect(new FakeStream([new FakeTrack('audio')]));
  call.receive({ id: call.id, kind: 'reoffer', sdp: 'v=0\r\ntheir camera' });
  await settle();
  assert.equal(call.askingVideo, false);
  assert.deepEqual(connections[0].remote, { type: 'offer', sdp: 'v=0\r\ntheir camera' });
  assert.deepEqual(ours.sent.at(-1), { id: call.id, kind: 'reanswer', sdp: 'v=0\r\nanswer\r\na=candidate:relay' });
  const said = ours.sent.length;
  call.receive({ id: call.id, kind: 'reoffer', sdp: 'v=0\r\ntheir camera' });
  await settle();
  assert.equal(ours.sent.length, said);
  call.hangUp();
});

test('a voice call answered with video asks for it once connected; said no to, it goes on with voice; added later, said yes to', async () => {
  const { rtc, connections, asked } = fakeRtc();
  const ours = events();
  const offer = { id: '0123456789abcdef', kind: 'offer' as const, video: false, sdp: VOICE_OFFER, at: Date.now(), reoffer: true as const };
  const call = Call.incoming(offer, { peer: 'contact:a', relay: TURN, rtc, events: ours.events })!;
  assert.equal(call.canAnswerWithVideo, true);
  await call.answer(true);
  // The camera opens only once its video can go.
  assert.deepEqual(asked, [{ audio: true, video: false }]);
  const [connection] = connections;
  connection.connect(new FakeStream([new FakeTrack('audio')]));
  await settle();
  assert.equal(call.addingVideo, true);
  assert.equal(ours.sent.at(-1)?.kind, 'reoffer');
  assert.deepEqual(asked.at(-1), { audio: false, video: true });
  // Their screen asked, and they said no: the offer is taken back, the camera off.
  call.receive({ id: offer.id, kind: 'reanswer' });
  await settle();
  assert.deepEqual([call.video, call.hasCamera, call.addingVideo, call.canAddVideo], [false, false, false, true]);
  assert.equal(connection.added.length, 1);

  // Added from here later, and they say yes.
  const adding = call.addVideo();
  await settle();
  assert.equal(ours.sent.at(-1)?.kind, 'reoffer');
  call.receive({ id: offer.id, kind: 'reanswer', sdp: 'v=0\r\nyes' });
  await adding;
  assert.deepEqual([call.video, call.hasCamera, call.cameraOff, call.canAddVideo], [true, true, false, false]);
  call.hangUp();
});

test('their asking to add video is asked here: no, yes, and no once it waited too long', async () => {
  const { rtc, connections, asked } = fakeRtc();
  const ours = events();
  const call = Call.start({ peer: 'contact:a', video: false, relay: TURN, rtc, events: ours.events });
  await settle();
  call.receive({ id: call.id, kind: 'answer', sdp: 'v=0\r\nanswer', reoffer: true });
  await settle();
  const [connection] = connections;
  connection.connect(new FakeStream([new FakeTrack('audio')]));
  call.receive({ id: call.id, kind: 'reoffer', sdp: 'v=0\r\nvideo 1' });
  assert.equal(call.askingVideo, true);
  call.declineVideo();
  await settle();
  assert.deepEqual(ours.sent.at(-1), { id: call.id, kind: 'reanswer' });
  assert.deepEqual([call.askingVideo, call.video], [false, false]);

  call.receive({ id: call.id, kind: 'reoffer', sdp: 'v=0\r\nvideo 2' });
  await call.acceptVideo();
  assert.deepEqual(asked.at(-1), { audio: false, video: true });
  assert.deepEqual(connection.remote, { type: 'offer', sdp: 'v=0\r\nvideo 2' });
  assert.deepEqual(ours.sent.at(-1), { id: call.id, kind: 'reanswer', sdp: 'v=0\r\nanswer\r\na=candidate:relay' });
  assert.deepEqual([call.video, call.hasCamera, call.cameraOff], [true, true, false]);
  call.hangUp();

  mock.timers.enable({ apis: ['setTimeout'] });
  try {
    const later = events();
    const again = Call.start({ peer: 'contact:a', video: false, relay: TURN, rtc, events: later.events });
    await flush();
    again.receive({ id: again.id, kind: 'answer', sdp: 'v=0\r\nanswer', reoffer: true });
    await flush();
    connections[1].connect(new FakeStream([new FakeTrack('audio')]));
    again.receive({ id: again.id, kind: 'reoffer', sdp: 'v=0\r\nvideo 3' });
    mock.timers.tick(ASK_MS - 1);
    assert.equal(again.askingVideo, true);
    mock.timers.tick(1);
    assert.equal(again.askingVideo, false);
    assert.deepEqual(later.sent.at(-1), { id: again.id, kind: 'reanswer' });
    again.hangUp();
  } finally {
    mock.timers.reset();
  }
});

test('an Erevos from before, which says nothing of new descriptions, is sent none, and its are not taken', async () => {
  const { rtc, connections } = fakeRtc();
  const ours = events();
  const offer = { id: '0123456789abcdef', kind: 'offer' as const, video: false, sdp: VOICE_OFFER, at: Date.now() };
  const call = Call.incoming(offer, { peer: 'contact:a', relay: TURN, rtc, events: ours.events })!;
  assert.equal(call.canAnswerWithVideo, false);
  await call.answer(true);
  connections[0].connect(new FakeStream([new FakeTrack('audio')]));
  await settle();
  assert.deepEqual([call.canAddVideo, call.addingVideo], [false, false]);
  assert.equal(ours.sent.at(-1)?.kind, 'answer');
  call.receive({ id: offer.id, kind: 'reoffer', sdp: 'v=0\r\nvideo' });
  assert.equal(call.askingVideo, false);
  assert.equal(ours.sent.at(-1)?.kind, 'answer');
  // A video call from it answered with voice only keeps the camera off: there is no way to turn it on.
  call.hangUp();
  const video = Call.incoming({ ...offer, id: '1111111111111111', video: true, sdp: VIDEO_OFFER }, { peer: 'contact:a', relay: TURN, rtc, events: events().events })!;
  await video.answer(false);
  connections[1].connect(new FakeStream([new FakeTrack('audio'), new FakeTrack('video')]));
  assert.deepEqual([video.hasCamera, video.canTurnCameraOn], [false, false]);
  video.hangUp();
});

test('where an answer keeps video both ways (XMPP), the camera turned on later goes on it with nothing said', async () => {
  const { rtc, connections } = fakeRtc();
  const ours = events();
  const asked: (string | null)[] = [];
  const offer = { id: '0123456789abcdef', kind: 'offer' as const, video: true, sdp: VIDEO_OFFER, at: Date.now(), reoffer: true as const };
  const call = Call.incoming(offer, {
    peer: 'xmpp:bob@example.org',
    relay: TURN,
    rtc,
    events: { ...ours.events, addMedia: async () => 'v=0\r\nnever', answerMedia: async (_id, sdp) => void asked.push(sdp), addsOnly: true, bothWays: true },
  })!;
  await call.answer(false);
  const [connection] = connections;
  assert.deepEqual(kinds(connection), [['audio', 'sendrecv', true], ['video', 'sendrecv', false]]);
  connection.connect(new FakeStream([new FakeTrack('audio'), new FakeTrack('video')]));
  // More video asked for in a video call, where media can only be added: not taken.
  call.videoAsked('v=0\r\nmore');
  assert.deepEqual(asked, [null]);
  const said = ours.sent.length;
  assert.equal(call.canTurnCameraOn, true);
  await call.turnCameraOn();
  assert.equal(ours.sent.length, said);
  assert.deepEqual([call.hasCamera, call.cameraOff, call.canTurnCameraOn], [true, false, false]);
  assert.deepEqual(kinds(connection), [['audio', 'sendrecv', true], ['video', 'sendrecv', true]]);
  call.hangUp();
});

test('the camera switches: on the phone by its own switch, in a browser to the next camera, and is known to have where to', async () => {
  const phone = fakeRtc({ cameras: 2 });
  const call = Call.start({ peer: 'contact:a', video: true, relay: TURN, rtc: phone.rtc, events: events().events });
  await settle();
  assert.equal(call.cameras, 2);
  call.switchCamera();
  assert.equal(phone.streams[0].getVideoTracks()[0].switched, 1);
  call.hangUp();

  const web = fakeRtc({ cameras: 2, browser: true });
  const there = Call.start({ peer: 'contact:a', video: true, relay: TURN, rtc: web.rtc, events: events().events });
  await settle();
  const [first] = web.streams[0].getVideoTracks();
  const [connection] = web.connections;
  there.switchCamera();
  await settle();
  const [second] = web.streams[0].getVideoTracks();
  assert.equal(second.deviceId, 'cam-1');
  assert.ok(first.stopped && !second.stopped);
  assert.equal(connection.getSenders().find((s) => s.track?.kind === 'video')?.track, second);
  there.switchCamera();
  await settle();
  assert.equal(web.streams[0].getVideoTracks()[0].deviceId, 'cam-0');
  there.hangUp();

  // One camera: nowhere to switch to.
  const one = fakeRtc({ cameras: 1, browser: true });
  const single = Call.start({ peer: 'contact:a', video: true, relay: TURN, rtc: one.rtc, events: events().events });
  await settle();
  assert.equal(single.cameras, 1);
  const [only] = one.streams[0].getVideoTracks();
  single.switchCamera();
  await settle();
  assert.deepEqual([one.streams[0].getVideoTracks()[0], only.stopped], [only, false]);
  single.hangUp();
});

test('new descriptions of a call are read only so', () => {
  const id = '0123456789abcdef';
  assert.deepEqual(decodeCall({ id, kind: 'offer', video: true, sdp: 'v=0\r\n', at: 3, reoffer: true }), { id, kind: 'offer', video: true, sdp: 'v=0\r\n', at: 3, reoffer: true });
  assert.deepEqual(decodeCall({ id, kind: 'answer', sdp: 'v=0\r\n', reoffer: 'yes' }), { id, kind: 'answer', sdp: 'v=0\r\n' });
  assert.deepEqual(decodeCall({ id, kind: 'reoffer', sdp: 'v=0\r\nmore' }), { id, kind: 'reoffer', sdp: 'v=0\r\nmore' });
  assert.equal(decodeCall({ id, kind: 'reoffer' }), null);
  assert.deepEqual(decodeCall({ id, kind: 'reanswer', sdp: 'v=0\r\nyes' }), { id, kind: 'reanswer', sdp: 'v=0\r\nyes' });
  assert.deepEqual(decodeCall({ id, kind: 'reanswer' }), { id, kind: 'reanswer' });
  assert.equal(decodeCall({ id, kind: 'reanswer', sdp: 'nonsense' }), null);
});

test('a camera through the call relay is held to 1 Mbps; sound, a direct call and a platform with no parameters are not', async () => {
  const sender = () => {
    const made = { kept: null as null | { encodings?: { maxBitrate?: number }[] } };
    return { made, getParameters: () => ({ encodings: [{}] as { maxBitrate?: number }[] }), setParameters: async (p: { encodings?: { maxBitrate?: number }[] }) => void (made.kept = p) };
  };
  const video = { kind: 'video', enabled: true, stop() {} };
  const audio = { kind: 'audio', enabled: true, stop() {} };
  const relayed = sender();
  await capVideo(relayed, video, true);
  assert.equal(relayed.made.kept?.encodings?.[0]?.maxBitrate, RELAY_VIDEO_BITRATE);
  const direct = sender();
  await capVideo(direct, video, false);
  assert.equal(direct.made.kept, null);
  const sound = sender();
  await capVideo(sound, audio, true);
  assert.equal(sound.made.kept, null);
  // A lower one already set stays; a sender with nothing to set leaves the call as it is.
  const lower = { ...sender(), getParameters: () => ({ encodings: [{ maxBitrate: 300_000 }] }) };
  await capVideo(lower, video, true);
  assert.equal(lower.made.kept?.encodings?.[0]?.maxBitrate, 300_000);
  await capVideo({}, video, true);
  await capVideo({ getParameters: () => { throw new Error('no'); }, setParameters: async () => undefined }, video, true);
});

test('through a call relay, the description goes soon after its first address relayed over UDP', async () => {
  const listeners = new Map<string, ((event?: unknown) => void)[]>();
  const connection = {
    iceGatheringState: 'gathering',
    connectionState: 'new',
    localDescription: { sdp: 'v=0\r\na=candidate:1 1 udp 1 203.0.113.9 50001 typ relay\r\n' },
    addEventListener(type: string, listener: (event?: unknown) => void) {
      listeners.set(type, [...(listeners.get(type) ?? []), listener]);
    },
  } as unknown as Parameters<typeof describedSdp>[0];
  const began = Date.now();
  const sdp = describedSdp(connection);
  // One over TCP alone does not end the wait; one over UDP does, a moment later.
  listeners.get('icecandidate')!.forEach((l) => l({ candidate: { candidate: 'candidate:2 1 tcp 1 203.0.113.9 3478 typ relay' } }));
  listeners.get('icecandidate')!.forEach((l) => l({ candidate: { candidate: 'candidate:1 1 udp 1 203.0.113.9 50001 typ relay' } }));
  assert.match(await sdp, /typ relay/);
  assert.ok(Date.now() - began < GATHER_MS / 2 && Date.now() - began >= RELAYED_GRACE_MS - 50);
  // Direct on the same network, it waits for every address as before: one while gathering ends nothing.
  const direct = new Map<string, ((event?: unknown) => void)[]>();
  let directSent = false;
  void describedSdp({ ...connection, addEventListener: (type: string, l: (event?: unknown) => void) => direct.set(type, [l]) } as typeof connection, true)
    .then(() => (directSent = true))
    .catch(() => undefined);
  direct.get('icecandidate')!.forEach((l) => l({ candidate: { candidate: 'candidate:3 1 udp 1 192.168.1.20 50002 typ host' } }));
  await new Promise((r) => setTimeout(r, RELAYED_GRACE_MS + 100));
  assert.equal(directSent, false);
});

test('«complete» said before any address is not taken: the description waits for the addresses', async () => {
  // As WebRTC 155 on a Pixel did: gathering said complete at once, the relayed address 150 ms later.
  for (const direct of [false, true]) {
    const listeners = new Map<string, ((event?: unknown) => void)[]>();
    const connection = {
      iceGatheringState: 'complete',
      connectionState: 'new',
      localDescription: { sdp: 'v=0\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111\r\n' },
      addEventListener(type: string, listener: (event?: unknown) => void) {
        listeners.set(type, [...(listeners.get(type) ?? []), listener]);
      },
    } as unknown as Parameters<typeof describedSdp>[0] & { localDescription: { sdp: string } };
    const fire = (type: string, event?: unknown) => listeners.get(type)?.forEach((l) => l(event));
    let sent: string | null = null;
    const sdp = describedSdp(connection, direct).then((s) => (sent = s));
    fire('icecandidate', { candidate: null });
    fire('icegatheringstatechange');
    await new Promise((r) => setTimeout(r, 50));
    assert.equal(sent, null, 'nothing goes while it holds no address');
    const line = direct ? 'candidate:1 1 udp 1 192.168.1.20 50001 typ host' : 'candidate:1 1 udp 1 203.0.113.9 50001 typ relay';
    connection.localDescription = { sdp: `${connection.localDescription.sdp}a=${line}\r\n` };
    fire('icecandidate', { candidate: { candidate: line } });
    assert.match(await sdp, /a=candidate:/);
  }
});

test('their picture is not put aside by their sound coming in a stream of its own', () => {
  const sound = new FakeTrack('audio');
  const picture = new FakeTrack('video');
  const heard = new FakeStream([sound]);
  const seen = new FakeStream([picture]);
  // The picture after the sound: its stream is shown, with their sound in it.
  const first = theirStream(theirStream(null, heard, sound), seen, picture);
  assert.equal(first, seen);
  assert.deepEqual(first.getVideoTracks(), [picture]);
  assert.equal(first.getAudioTracks().length, 1);
  // The sound after the picture: the picture's stream stays, and takes the sound.
  const picture2 = new FakeTrack('video');
  const sound2 = new FakeTrack('audio');
  const seen2 = new FakeStream([picture2]);
  const after = theirStream(theirStream(null, seen2, picture2), new FakeStream([sound2]), sound2);
  assert.equal(after, seen2);
  assert.equal(after.getAudioTracks().length, 1);
  // A track said with a stream that does not hold it yet joins it.
  const late = new FakeTrack('video');
  const both = new FakeStream([new FakeTrack('audio')]);
  assert.equal(theirStream(null, both, late).getVideoTracks().length, 1);
});
