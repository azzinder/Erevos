// Group voice calls (lib/group-call.ts, lib/group-calls.ts): this phone in a group's call, with
// the other members' phones played by hand, and a stand-in for WebRTC (checks/fake-rtc.ts). Which
// member offers to which, who is in the call, what rings and what is missed. The group messages
// that carry the signals are in checks/groups.check.ts.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { afterEach, mock, test } from 'node:test';

import { RING_MS } from '../lib/call';
import { currentGroupCall, MAX_GROUP_CALL, MAX_VIDEO } from '../lib/group-call';
import { decodeGroupCall, type GroupCallSignal } from '../lib/group-call-signal';
import { closeGroupCall, endGroupCall, groupCallGoingOn, groupCallSignal, joinGroupCall, shownGroupCall, startGroupCall, type GroupCallPlace } from '../lib/group-calls';
import { fakeRtc, FakeStream, FakeTrack } from './fake-rtc';

const GROUP = 'ab'.repeat(16);
const ME = '11'.repeat(32);
const BOB = '22'.repeat(32);
const CAROL = '33'.repeat(32);
// Lower than ours, so its offer counts when both offer.
const ADA = '00'.repeat(32);
const SDP = 'v=0\r\ntheirs';

const settle = () => new Promise((resolve) => setTimeout(resolve, 30));

function place() {
  const sent: GroupCallSignal[] = [];
  const lines: string[] = [];
  const calls: GroupCallPlace = {
    send: async (_group, signal) => void sent.push(signal),
    callRelay: async () => null,
    me: async () => ME,
    line: (_group, text) => void lines.push(text),
  };
  return { calls, sent, lines };
}

afterEach(() => {
  const shown = shownGroupCall();
  endGroupCall();
  if (shown) closeGroupCall(shown.call);
});

test('whoever starts a call is in it, and offers to each member who joins', async () => {
  const { calls, sent, lines } = place();
  const { rtc, connections } = fakeRtc();
  const call = await startGroupCall(calls, GROUP, false, null, rtc);
  assert.equal(call.state, 'in');
  assert.equal(sent[0].kind, 'start');
  assert.equal(shownGroupCall()?.call, call);

  await groupCallSignal(calls, GROUP, BOB, { id: call.id, kind: 'join' }, rtc);
  await settle();
  const offer = sent.find((s) => s.kind === 'offer');
  assert.ok(offer && offer.kind === 'offer' && offer.to === BOB);
  assert.deepEqual(call.peers().map((p) => [p.identity, p.state]), [[BOB, 'connecting']]);

  // Bob's answer, then WebRTC connects.
  await groupCallSignal(calls, GROUP, BOB, { id: call.id, kind: 'answer', to: ME, sdp: SDP }, rtc);
  assert.equal(connections[0].remote?.sdp, SDP);
  connections[0].connect(new FakeStream([new FakeTrack('audio')]));
  assert.equal(call.peers()[0].state, 'connected');
  assert.ok(call.peers()[0].remote);

  // A second answer, or an answer to someone else's call, changes nothing.
  await groupCallSignal(calls, GROUP, BOB, { id: call.id, kind: 'answer', to: ME, sdp: 'v=0\r\nagain' }, rtc);
  assert.equal(connections[0].remote?.sdp, SDP);

  await groupCallSignal(calls, GROUP, BOB, { id: call.id, kind: 'leave' }, rtc);
  assert.equal(call.peers().length, 0);
  assert.ok(connections[0].closed);

  call.hangUp();
  assert.equal(sent[sent.length - 1].kind, 'leave');
  assert.equal(currentGroupCall(), null);
  assert.match(lines[0], /Group call, 0:0\d/);
});

test('a call rings, joins, and takes the offers of those already in it', async () => {
  const { calls, sent } = place();
  const { rtc, connections } = fakeRtc();
  const id = 'cd'.repeat(8);
  await groupCallSignal(calls, GROUP, BOB, { id, kind: 'start', at: Date.now(), video: false }, rtc);
  const ringing = shownGroupCall()!.call;
  assert.equal(ringing.state, 'incoming');
  assert.equal(ringing.startedBy, BOB);
  // Not in it yet: an offer is not taken.
  await groupCallSignal(calls, GROUP, BOB, { id, kind: 'offer', to: ME, sdp: SDP }, rtc);
  assert.equal(connections.length, 0);

  await ringing.answer();
  assert.equal(ringing.state, 'in');
  assert.deepEqual(sent.map((s) => s.kind), ['join']);
  await groupCallSignal(calls, GROUP, BOB, { id, kind: 'offer', to: ME, sdp: SDP }, rtc);
  await settle();
  assert.equal(connections[0].remote?.sdp, SDP);
  const answer = sent.find((s) => s.kind === 'answer');
  assert.ok(answer && answer.kind === 'answer' && answer.to === BOB);
});

test('two joining at once: the lower identity’s offer counts', async () => {
  const { calls, sent } = place();
  const { rtc, connections } = fakeRtc();
  const call = await startGroupCall(calls, GROUP, false, null, rtc);
  // Ada and Carol each joined; this phone offered to both.
  await groupCallSignal(calls, GROUP, ADA, { id: call.id, kind: 'join' }, rtc);
  await groupCallSignal(calls, GROUP, CAROL, { id: call.id, kind: 'join' }, rtc);
  await settle();
  // Both offered here too: Ada's counts (lower than ours), Carol's does not (higher).
  await groupCallSignal(calls, GROUP, ADA, { id: call.id, kind: 'offer', to: ME, sdp: SDP }, rtc);
  await groupCallSignal(calls, GROUP, CAROL, { id: call.id, kind: 'offer', to: ME, sdp: SDP }, rtc);
  await settle();
  assert.equal(call.peers().length, 2);
  const answers = sent.filter((s) => s.kind === 'answer').map((s) => (s as { to: string }).to);
  assert.deepEqual(answers, [ADA]);
  // Our first connection to Ada was closed for hers.
  assert.ok(connections[0].closed);
  assert.equal(connections.filter((c) => !c.closed).length, 2);
});

test('a call holds at most MAX_GROUP_CALL members', async () => {
  const { calls } = place();
  const { rtc } = fakeRtc();
  const call = await startGroupCall(calls, GROUP, false, null, rtc);
  for (let i = 0; i < MAX_GROUP_CALL + 2; i++) {
    await groupCallSignal(calls, GROUP, (40 + i).toString(16).padStart(2, '0').repeat(32), { id: call.id, kind: 'join' }, rtc);
  }
  assert.equal(call.peers().length, MAX_GROUP_CALL - 1);
});

test('a call going on shows until its members leave, and one this phone is busy for is missed', async () => {
  const { calls, lines } = place();
  const { rtc } = fakeRtc();
  const id = 'ef'.repeat(8);
  await groupCallSignal(calls, GROUP, BOB, { id, kind: 'start', at: Date.now(), video: false }, rtc);
  shownGroupCall()!.call.decline();
  closeGroupCall(shownGroupCall()!.call);
  assert.deepEqual(lines, ['📞 Group call, turned down']);
  await groupCallSignal(calls, GROUP, CAROL, { id, kind: 'join' }, rtc);
  assert.deepEqual(groupCallGoingOn(GROUP)?.people, [BOB, CAROL]);
  // Phones that went quiet are taken as gone.
  assert.equal(groupCallGoingOn(GROUP, Date.now() + 10 * 60_000), null);

  await groupCallSignal(calls, GROUP, CAROL, { id, kind: 'here', video: false }, rtc);
  const joined = await joinGroupCall(calls, GROUP, null, rtc);
  assert.equal(joined.id, id);
  // Not shown as going on to the phone that is in it.
  assert.equal(groupCallGoingOn(GROUP), null);

  // Another group's call, while in this one.
  await groupCallSignal(calls, 'cd'.repeat(16), BOB, { id: '12'.repeat(8), kind: 'start', at: Date.now(), video: false }, rtc);
  assert.equal(shownGroupCall()?.call, joined);
  assert.equal(lines[lines.length - 1], '📞 Missed group call, while in another call');

  // Started long ago: missed, not rung.
  joined.hangUp();
  closeGroupCall(joined);
  await groupCallSignal(calls, GROUP, BOB, { id: '34'.repeat(8), kind: 'start', at: Date.now() - 5 * 60_000, video: false }, rtc);
  assert.equal(shownGroupCall(), null);
  assert.equal(lines[lines.length - 1], '📞 Missed group call');
});

test('a call that rings unanswered is missed, and stops ringing once nobody is in it', async () => {
  const { calls, lines } = place();
  const { rtc } = fakeRtc();
  await groupCallSignal(calls, GROUP, BOB, { id: '56'.repeat(8), kind: 'start', at: Date.now(), video: false }, rtc);
  const first = shownGroupCall()!.call;
  await groupCallSignal(calls, GROUP, BOB, { id: '56'.repeat(8), kind: 'leave' }, rtc);
  assert.equal(first.state, 'ended');
  assert.equal(first.ended, 'missed');
  closeGroupCall(first);

  mock.timers.enable({ apis: ['setTimeout'] });
  try {
    await groupCallSignal(calls, GROUP, BOB, { id: '78'.repeat(8), kind: 'start', at: Date.now(), video: false }, rtc);
    const second = shownGroupCall()!.call;
    mock.timers.tick(RING_MS);
    assert.equal(second.ended, 'missed');
  } finally {
    mock.timers.reset();
  }
  assert.deepEqual(lines, ['📞 Missed group call', '📞 Missed group call']);
});

test('two start a call in the same group at once: the lower id goes on', async () => {
  const { calls, sent } = place();
  const { rtc } = fakeRtc();
  const ours = await startGroupCall(calls, GROUP, false, null, rtc);
  const theirs = '00'.repeat(8);
  await groupCallSignal(calls, GROUP, BOB, { id: theirs, kind: 'start', at: Date.now(), video: false }, rtc);
  assert.equal(ours.state, 'ended');
  const now = shownGroupCall()!.call;
  assert.equal(now.id, theirs);
  assert.equal(now.state, 'in');
  assert.deepEqual(sent.map((s) => s.kind), ['start', 'leave', 'join']);
});

test('a video call: pictures pause with more than MAX_VIDEO in it, and come back', async () => {
  const { calls, lines } = place();
  const { rtc, streams } = fakeRtc();
  const call = await startGroupCall(calls, GROUP, true, null, rtc);
  const camera = streams[0].getVideoTracks()[0];
  assert.ok(camera && camera.enabled);
  call.setCameraOff(true);
  assert.equal(camera.enabled, false);
  call.setCameraOff(false);
  const others = Array.from({ length: MAX_VIDEO }, (_, i) => (50 + i).toString(16).repeat(32));
  for (const other of others.slice(0, MAX_VIDEO - 1)) await groupCallSignal(calls, GROUP, other, { id: call.id, kind: 'join' }, rtc);
  assert.equal(call.videoPaused, false);
  assert.ok(camera.enabled);
  await groupCallSignal(calls, GROUP, others[MAX_VIDEO - 1], { id: call.id, kind: 'join' }, rtc);
  assert.equal(call.videoPaused, true);
  assert.equal(camera.enabled, false);
  // Sound goes on.
  assert.ok(streams[0].getAudioTracks()[0].enabled);
  await groupCallSignal(calls, GROUP, others[0], { id: call.id, kind: 'leave' }, rtc);
  assert.equal(call.videoPaused, false);
  assert.ok(camera.enabled);
  call.hangUp();
  assert.match(lines[0], /^📞 Group video call, /);
});

test('a video call going on is joined as one', async () => {
  const { calls, lines } = place();
  const { rtc, streams } = fakeRtc();
  const id = 'ba'.repeat(8);
  // Heard only from a member still in it.
  await groupCallSignal(calls, GROUP, BOB, { id, kind: 'here', video: true }, rtc);
  assert.equal(groupCallGoingOn(GROUP)?.video, true);
  const call = await joinGroupCall(calls, GROUP, null, rtc);
  assert.equal(call.video, true);
  assert.equal(streams[0].getVideoTracks().length, 1);
  call.hangUp();
  closeGroupCall(call);
  await groupCallSignal(calls, GROUP, BOB, { id: 'bc'.repeat(8), kind: 'start', at: Date.now() - 5 * 60_000, video: true }, rtc);
  assert.equal(lines[lines.length - 1], '📞 Missed group video call');
});

test('with a call relay, offers go through it, and an offer without one is answered direct', async () => {
  const { calls } = place();
  const { rtc, connections } = fakeRtc();
  const turn = { urls: ['turn:relay.example.org:3478'], username: '1', credential: 'c' };
  const call = await startGroupCall(calls, GROUP, false, turn, rtc);
  await groupCallSignal(calls, GROUP, BOB, { id: call.id, kind: 'join' }, rtc);
  assert.equal(connections[0].config.iceTransportPolicy, 'relay');
  // Ada has no internet, only the same Wi-Fi: her offer has no call relay address.
  await groupCallSignal(calls, GROUP, ADA, { id: call.id, kind: 'offer', to: ME, sdp: 'v=0\r\na=candidate:1 1 udp 1 192.168.1.20 5000 typ host' }, rtc);
  assert.deepEqual(connections[1].config, { iceServers: [], iceTransportPolicy: 'all' });
  call.hangUp();
});

test('group call signals are checked as they come', () => {
  const id = '9a'.repeat(8);
  assert.deepEqual(decodeGroupCall({ id, kind: 'offer', to: BOB, sdp: SDP }), { id, kind: 'offer', to: BOB, sdp: SDP });
  assert.deepEqual(decodeGroupCall({ id, kind: 'leave', extra: 1 }), { id, kind: 'leave' });
  assert.equal(decodeGroupCall({ id, kind: 'offer', to: 'bob', sdp: SDP }), null);
  assert.equal(decodeGroupCall({ id, kind: 'answer', to: BOB, sdp: 'hello' }), null);
  assert.equal(decodeGroupCall({ id, kind: 'start' }), null);
  assert.equal(decodeGroupCall({ id: 'x', kind: 'join' }), null);
});
