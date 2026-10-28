// Calls (lib/call.ts): how a call goes from ringing to connected to ended, with a stand-in for
// WebRTC, and which call signals are taken (lib/call-signal.ts). The sound and picture themselves
// are WebRTC's, tried on phones.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { afterEach, mock, test } from 'node:test';

import { Call, callNow, connectionConfig, currentCall, OFFER_FRESH_MS, offerMissed, offerRingsFor, relayToAnswer, RING_MS, setClockOffset, soon, type Rtc } from '../lib/call';
import { decodeCall, MAX_SDP, type CallSignal } from '../lib/call-signal';
import { callClock, callSignal, closeCall, endedLine, shownCall, startCall, type CallPlace } from '../lib/calls';
import { fakeRtc, FakeStream, FakeTrack } from './fake-rtc';

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
  // No call relay: straight between the phones.
  assert.deepEqual(connection.config, { iceServers: [], iceTransportPolicy: 'all' });
  assert.deepEqual(connection.remote, { type: 'offer', sdp: offer.sdp });
  assert.deepEqual(ours.sent.at(-1), { id: offer.id, kind: 'answer', sdp: 'v=0\r\nanswer\r\na=candidate:relay' });
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
