// Calls (lib/call.ts): how a call goes from ringing to connected to ended, with a stand-in for
// WebRTC, and which call signals are taken (lib/call-signal.ts). The sound and picture themselves
// are WebRTC's, tried on phones.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { afterEach, mock, test } from 'node:test';

import { Call, connectionConfig, currentCall, RING_MS, type Connection, type ConnectionConfig, type Rtc, type Stream, type Track } from '../lib/call';
import { decodeCall, MAX_SDP, type CallSignal } from '../lib/call-signal';
import { callClock, callSignal, closeCall, endedLine, shownCall, startCall, type CallPlace } from '../lib/calls';

class FakeTrack implements Track {
  enabled = true;
  stopped = false;
  switched = 0;
  readonly kind: string;
  constructor(kind: string) {
    this.kind = kind;
  }
  stop() {
    this.stopped = true;
  }
  _switchCamera() {
    this.switched++;
  }
}

class FakeStream implements Stream {
  readonly tracks: FakeTrack[];
  constructor(tracks: FakeTrack[]) {
    this.tracks = tracks;
  }
  getTracks() {
    return this.tracks;
  }
  getAudioTracks() {
    return this.tracks.filter((t) => t.kind === 'audio');
  }
  getVideoTracks() {
    return this.tracks.filter((t) => t.kind === 'video');
  }
}

class FakeConnection implements Connection {
  iceGatheringState = 'new';
  connectionState = 'new';
  localDescription: { sdp: string } | null = null;
  remote: { type: string; sdp: string } | null = null;
  added: Track[] = [];
  closed = false;
  private listeners: Record<string, ((event?: unknown) => void)[]> = {};
  readonly config: ConnectionConfig;
  constructor(config: ConnectionConfig) {
    this.config = config;
  }
  addTrack(track: Track) {
    this.added.push(track);
  }
  async createOffer() {
    return { type: 'offer' as const, sdp: 'v=0\r\noffer' };
  }
  async createAnswer() {
    return { type: 'answer' as const, sdp: 'v=0\r\nanswer' };
  }
  async setLocalDescription(description: { sdp: string }) {
    this.localDescription = { sdp: `${description.sdp}\r\na=candidate:relay` };
    // Gathering ends a moment later.
    setTimeout(() => {
      this.iceGatheringState = 'complete';
      this.emit('icegatheringstatechange');
    }, 10);
  }
  async setRemoteDescription(description: { type: string; sdp: string }) {
    this.remote = description;
  }
  addEventListener(type: string, listener: (event: any) => void) {
    (this.listeners[type] ??= []).push(listener as (event?: unknown) => void);
  }
  close() {
    this.closed = true;
  }
  emit(type: string, event?: unknown) {
    for (const listener of this.listeners[type] ?? []) listener(event);
  }
  /** WebRTC connects, and the other phone's stream comes. */
  connect(stream: Stream) {
    this.emit('track', { streams: [stream] });
    this.connectionState = 'connected';
    this.emit('connectionstatechange');
  }
}

function fakeRtc() {
  const connections: FakeConnection[] = [];
  const streams: FakeStream[] = [];
  const rtc: Rtc = {
    connect(config) {
      const connection = new FakeConnection(config);
      connections.push(connection);
      return connection;
    },
    async media({ video }) {
      const stream = new FakeStream([new FakeTrack('audio'), ...(video ? [new FakeTrack('video')] : [])]);
      streams.push(stream);
      return stream;
    },
  };
  return { rtc, connections, streams };
}

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
