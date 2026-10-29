// Group calls in XMPP private groups (lib/xmpp-muji.ts) through the checks' XMPP server, the others
// played here as Dino plays them, stanza by stanza (MUJI, XEP-0272; Call Invites, XEP-0482): a call
// started here makes its own room, set up as Dino's, with the group's members its owners, and is
// told in the group in both forms; whoever joins it gets ready, is ready, and starts a session with
// us, through the server's TURN only, and their leaving ends it. Dino's call rings here, and
// answered, this phone gets ready in its room, is ready with what the others take, says yes in the
// group and calls each one ready in it; one who joins later calls us, even before we see them ready.
// Taken back, from the history, from a stranger, or answered on another device of ours, it does not
// ring on; turned down, it can be joined while its room is there, and once its room is gone it is
// over. A hidden place's own account's call rings as the place's, and ends as its chats close.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { after, before, test } from 'node:test';

import type { ConnectionConfig, Rtc } from '../lib/call';
import { setCore, type Core } from '../lib/core';
import { closeGroupCall, groupCallGoingOn, joinGroupCall, shownGroupCall, startGroupCall } from '../lib/group-calls';
import { ICE, JINGLE, jingleToSdp, RTP, sdpToJingle } from '../lib/jingle-sdp';
import { addCallLine, addXmppContact, bare, NS, takeStanza, type Taken, type XmppConnection, type XmppState } from '../lib/xmpp';
import { watchXmppCalls, type XmppCallsSpace } from '../lib/xmpp-calls';
import { createXmppGroup } from '../lib/xmpp-muc';
import { peekXmppGroupCalls, xmppGroupCalls, xmppGroupCallsKnown, xmppPlaceGroupCalls } from '../lib/xmpp-muji';
import { child, children, el, type XmlElement } from '../lib/xmpp-xml';
import { FakeConnection, FakeStream, FakeTrack } from './fake-rtc';
import { DOMAIN, MUC, person, Server, settle } from './xmpp-server';

const built = new URL('./.core/erevos_ffi.js', import.meta.url);
const coreReady = existsSync(built) && typeof (createRequire(import.meta.url)(built.pathname) as Record<string, unknown>).xmpp === 'function';
if (!coreReady) console.log('Skipping the XMPP group call checks: build the core first with node checks/build-core.mjs');

before(() => {
  if (!coreReady) return;
  const wasm = createRequire(import.meta.url)(built.pathname) as Record<string, (...args: never[]) => unknown>;
  setCore(Object.fromEntries(Object.entries(wasm).map(([name, fn]) => [name, async (...args: never[]) => fn(...args)])) as unknown as Core);
});
after(() => setCore(null));

const ANN = `ann@${DOMAIN}`;
const BOB = `bob@${DOMAIN}`;
const CAT = `cat@${DOMAIN}`;
const NS_MUC = 'http://jabber.org/protocol/muc';
const MUJI = NS.muji;
const INVITES = NS.callInvites;
const LEGACY = NS.callMessage;
const FINGERPRINT = new Array(32).fill('CD').join(':');

// ---- WebRTC, with descriptions as a browser writes them ----

function description(type: 'offer' | 'answer', video: boolean, ufrag: string): string {
  const section = (kind: string, mid: string, pt: string, map: string) => [
    `m=${kind} 9 UDP/TLS/RTP/SAVPF ${pt}`,
    'c=IN IP4 0.0.0.0',
    `a=candidate:1 1 udp 2122260223 192.0.2.${type === 'offer' ? 1 : 2} 5000${mid} typ host generation 0`,
    `a=ice-ufrag:${ufrag}`,
    'a=ice-pwd:0123456789abcdefghijklmn',
    `a=fingerprint:sha-256 ${FINGERPRINT}`,
    `a=setup:${type === 'offer' ? 'actpass' : 'active'}`,
    `a=mid:${mid}`,
    'a=sendrecv',
    `a=msid:s-${ufrag} ${kind}-${ufrag}`,
    'a=rtcp-mux',
    `a=rtpmap:${pt} ${map}`,
  ];
  return [
    'v=0',
    'o=- 1 2 IN IP4 127.0.0.1',
    's=-',
    't=0 0',
    `a=group:BUNDLE 0${video ? ' 1' : ''}`,
    ...section('audio', '0', '111', 'opus/48000/2'),
    ...(video ? section('video', '1', '96', 'VP8/90000') : []),
    '',
  ].join('\r\n');
}

class SdpConnection extends FakeConnection {
  ice: { candidate: string; sdpMid: string }[] = [];
  private video = () => this.added.some((track) => (track as FakeTrack).kind === 'video');
  async createOffer() {
    return { type: 'offer' as const, sdp: description('offer', this.video(), 'annu') };
  }
  async createAnswer() {
    return { type: 'answer' as const, sdp: description('answer', this.video(), 'annu') };
  }
  async setLocalDescription(given: { sdp: string }) {
    this.localDescription = { sdp: given.sdp };
    setTimeout(() => {
      this.iceGatheringState = 'complete';
      this.emit('icegatheringstatechange');
    }, 5);
  }
  async addIceCandidate(candidate: { candidate: string; sdpMid: string }) {
    this.ice.push(candidate);
  }
}

function sdpRtc() {
  const connections: SdpConnection[] = [];
  const rtc: Rtc = {
    connect(config: ConnectionConfig) {
      const connection = new SdpConnection(config);
      connections.push(connection);
      return connection;
    },
    async media({ video }) {
      return new FakeStream([new FakeTrack('audio'), ...(video ? [new FakeTrack('video')] : [])]);
    },
  };
  return { rtc, connections };
}

// ---- the people ----

type Device = { state: XmppState; connection: XmppConnection };
/** A device played here as Dino: what came to it is kept as it came, and nothing is answered by itself. */
type Played = Device & { got: XmlElement[] };

/** Ann, on Erevos, with Bob in her contacts and in her private group; Bob is played as Dino from then on. */
async function groupOf(server: Server): Promise<{ ann: Device; bob: Played; group: string }> {
  const ann = await person(server, 'ann');
  const bob = await person(server, 'bob');
  await addXmppContact(ann.state, ann.connection, BOB, 'Bob');
  await settle([ann, bob]);
  await addXmppContact(bob.state, bob.connection, ANN);
  await settle([ann, bob]);
  const group = await createXmppGroup(ann.state, ann.connection, 'Friends', [BOB]);
  await settle([ann, bob]);
  await bob.connection.send(el('presence', { to: `${group}/bob` }, el('x', { xmlns: NS_MUC })));
  await settle([ann, bob]);
  assert.equal(ann.state.chats[group].room!.occupants.bob, BOB);
  return { ann, bob: { ...bob, got: [] }, group };
}

/** Another device played as Dino, of `user`. */
async function played(server: Server, user: string): Promise<Played> {
  return { ...(await person(server, user)), got: [] };
}

/** Ann's space, as lib/xmpp-calls.ts needs it, and a hidden place's account when given. */
function spaceOf(ann: Device, place?: { device: Device; open: () => boolean; watching: Set<() => void> }): XmppCallsSpace {
  return {
    link: () => ({ state: ann.state, connection: ann.connection }),
    line: async (jid, mine, text, id, at) => addCallLine(ann.state, jid, mine, text, id, at),
    callRelay: async () => null,
    ...(place
      ? {
          place: {
            open: place.open,
            now: () => (place.open() ? place.device.state : null),
            link: () => (place.open() ? { state: place.device.state, connection: place.device.connection } : null),
            line: async (jid, mine, text, id, at) => addCallLine(place.device.state, jid, mine, text, id, at),
          },
          // Closed, it receives.
          closed: (state: XmppState) =>
            !place.open() && state === place.device.state ? { space: 4, pocket: 1, line: async (jid, mine, text, id, at) => addCallLine(place.device.state, jid, mine, text, id, at) } : null,
          watch: (listener: () => void) => {
            place.watching.add(listener);
            return () => place.watching.delete(listener);
          },
        }
      : {}),
  };
}

/** A while of the apps taking what comes, as lib/xmpp-store.ts does, and the played devices keeping theirs. */
async function run(apps: Device[], devices: Played[], rounds = 15): Promise<void> {
  for (let i = 0; i < rounds; i++) {
    await new Promise((resolve) => setTimeout(resolve, 8));
    for (const app of apps) {
      const taken: Taken = { chats: [], republish: false };
      for (const stanza of app.connection.take()) await takeStanza(app.state, app.connection, stanza, taken);
    }
    for (const device of devices) device.got.push(...device.connection.take());
  }
}

function came(device: Played, what: (stanza: XmlElement) => boolean, label: string): XmlElement {
  const found = device.got.filter(what);
  assert.ok(found.length, `no ${label} came`);
  return found[found.length - 1];
}

const cameIq = (device: Played, action: string) => came(device, (s) => s.name === 'iq' && child(s, 'jingle', JINGLE)?.attrs.action === action, action);
const cameCall = (device: Played, name: string, ns = INVITES) => came(device, (s) => s.name === 'message' && !!child(s, name, ns), name);
const answer = (device: Played, iq: XmlElement) => device.connection.send(el('iq', { type: 'result', id: iq.attrs.id, to: iq.attrs.from }));
const lines = (device: Device, jid: string) => (device.state.chats[jid]?.messages ?? []).filter((m) => m.call).map((m) => [m.id, m.mine, m.text]);
/** The names of what a presence in a call's room says it takes, for `media`. */
function names(said: XmlElement[] | undefined, media: string): string[] {
  const muji = said?.find((s) => s.name === 'muji' && s.ns === MUJI);
  const content = children(muji, 'content', JINGLE).find((c) => child(c, 'description', RTP)?.attrs.media === media);
  return children(child(content, 'description', RTP), 'payload-type', RTP).map((p) => p.attrs.name);
}

/** What Dino says it takes, in its presence in a call's room: more than WebRTC knows, too. */
function dinoContents(video: boolean): XmlElement[] {
  const audio = el(
    'content',
    { xmlns: JINGLE, name: 'audio' },
    el(
      'description',
      { xmlns: RTP, media: 'audio' },
      el('payload-type', { id: 111, name: 'opus', clockrate: 48000, channels: 2 }, el('parameter', { name: 'useinbandfec', value: '1' })),
      el('payload-type', { id: 98, name: 'speex', clockrate: 16000 }),
      el('payload-type', { id: 0, name: 'PCMU', clockrate: 8000 }),
    ),
  );
  const picture = el('content', { xmlns: JINGLE, name: 'video' }, el('description', { xmlns: RTP, media: 'video' }, el('payload-type', { id: 96, name: 'VP8', clockrate: 90000 })));
  return video ? [audio, picture] : [audio];
}

const getReady = (dino: Played, room: string, nick: string) =>
  dino.connection.send(el('presence', { to: `${room}/${nick}` }, el('x', { xmlns: NS_MUC }), el('muji', { xmlns: MUJI }, el('preparing'))));
const beReady = (dino: Played, room: string, nick: string, video: boolean) => dino.connection.send(el('presence', { to: `${room}/${nick}` }, el('muji', { xmlns: MUJI }, ...dinoContents(video))));

/** Dino starts a call: its room, set up, `owners` its owners, Dino ready in it, then the invitation to `to`. */
async function dinoStarts(dino: Played, room: string, owners: string[], id: string, video: boolean, to: string, type = 'groupchat', extra: XmlElement[] = []): Promise<void> {
  await getReady(dino, room, 'd1n0');
  const field = (name: string, value: string) => el('field', { var: name }, el('value', {}, value));
  await dino.connection.iq(
    'set',
    room,
    el('query', { xmlns: `${NS_MUC}#owner` }, el('x', { xmlns: 'jabber:x:data', type: 'submit' }, field('muc#roomconfig_persistentroom', '0'), field('muc#roomconfig_membersonly', '1'), field('muc#roomconfig_whois', 'anyone'))),
  );
  for (const jid of owners) await dino.connection.iq('set', room, el('query', { xmlns: `${NS_MUC}#admin` }, el('item', { affiliation: 'owner', jid })));
  await beReady(dino, room, 'd1n0', video);
  await invite(dino, to, type, id, video, room, extra);
}

const invite = (dino: Played, to: string, type: string, id: string, video: boolean, room: string, extra: XmlElement[] = []) =>
  dino.connection.send(
    el(
      'message',
      { to, type, id: `m-${id}` },
      el('invite', { xmlns: INVITES, id, video: String(video), multi: 'true' }, el('muji', { xmlns: MUJI, room })),
      el('propose', { xmlns: LEGACY, id, video: String(video), multi: 'true' }, el('muji', { xmlns: MUJI, room })),
      ...extra,
    ),
  );

const said = (dino: Played, to: string, type: string, name: string, id: string) => dino.connection.send(el('message', { to, type, id: `${name}-${id}` }, el(name, { xmlns: INVITES, id }), el(name, { xmlns: LEGACY, id })));

const initiate = (dino: Played, to: string, sid: string, room: string, ufrag: string, video = false) =>
  dino.connection.iq('set', to, el('jingle', { xmlns: JINGLE, action: 'session-initiate', sid, initiator: dino.connection.fullJid }, ...sdpToJingle(description('offer', video, ufrag), 'initiator'), el('muji', { xmlns: MUJI, room })));

test('a call started here: its room made and set up as Dino\'s, the members its owners, told in the group; who joins calls us, through the TURN server only', { skip: !coreReady }, async () => {
  const server = new Server();
  server.turn = { host: 'turn.example.org', port: '3478', username: 'user', password: 'secret' };
  const { ann, bob, group } = await groupOf(server);
  const { rtc, connections } = sdpRtc();
  const stop = watchXmppCalls(rtc, spaceOf(ann));
  try {
    const relay = await xmppGroupCalls.callRelay();
    const starting = startGroupCall(xmppGroupCalls, group, false, relay, rtc);
    await run([ann], [bob], 30);
    const call = await starting;
    assert.equal(call.state, 'in');

    // Told in the group, in both forms, as Dino tells it.
    const told = cameCall(bob, 'invite');
    assert.deepEqual([told.attrs.type, bare(told.attrs.from ?? '')], ['groupchat', group]);
    const inner = child(told, 'invite', INVITES)!;
    assert.deepEqual([inner.attrs.id, inner.attrs.video, inner.attrs.multi], [call.id, 'false', 'true']);
    const room = child(inner, 'muji', MUJI)!.attrs.room;
    assert.ok(room.endsWith(`@${MUC}`));
    assert.equal(child(child(told, 'propose', LEGACY), 'muji', MUJI)?.attrs.room, room);
    assert.ok(child(told, 'store', NS.hints));

    // Its room: members only, everyone's address seen, not kept; the group's members its owners.
    const made = server.rooms.get(room)!;
    assert.deepEqual([made.locked, made.membersOnly, made.nonAnonymous, made.passing], [false, true, true, true]);
    assert.deepEqual([made.affiliations.get(ANN), made.affiliations.get(BOB)], ['owner', 'owner']);
    // Ann is ready in it, with what WebRTC always takes.
    const annSaid = made.said!.get(ann.connection.fullJid);
    assert.deepEqual(names(annSaid, 'audio'), ['opus']);
    assert.deepEqual(names(annSaid, 'video'), []);

    // Bob joins it as Dino does: getting ready, ready, then a session with each one ready in it.
    await getReady(bob, room, 'b0b');
    await beReady(bob, room, 'b0b', false);
    await run([ann], [bob]);
    const asked = initiate(bob, ann.connection.fullJid, 'bob-1', room, 'bobu');
    await run([ann], [bob]);
    await asked;
    const accept = cameIq(bob, 'session-accept');
    await answer(bob, accept);
    const accepted = child(accept, 'jingle', JINGLE)!;
    assert.deepEqual([accepted.attrs.sid, accepted.attrs.responder], ['bob-1', ann.connection.fullJid]);
    assert.match(jingleToSdp(accepted, 'responder', 'bob-1'), /a=setup:active/);
    // Through the server's TURN only, though Bob's offer has no address of one.
    assert.deepEqual(connections[0].config, {
      iceServers: [{ urls: ['turn:turn.example.org:3478?transport=udp', 'turns:turn.example.org:5349?transport=tcp'], username: 'user', credential: 'secret' }],
      iceTransportPolicy: 'relay',
    });
    assert.match(connections[0].remote!.sdp, /a=ice-ufrag:bobu/);

    // An address of Bob's, told after.
    const trickled = bob.connection.iq(
      'set',
      ann.connection.fullJid,
      el(
        'jingle',
        { xmlns: JINGLE, action: 'transport-info', sid: 'bob-1' },
        el(
          'content',
          { creator: 'initiator', name: '0' },
          el('transport', { xmlns: ICE, ufrag: 'bobu', pwd: '0123456789abcdefghijklmn' }, el('candidate', { component: '1', foundation: '5', generation: '0', id: 'x', ip: '198.51.100.9', network: '0', port: '3478', priority: '1', protocol: 'udp', type: 'relay', 'rel-addr': '0.0.0.0', 'rel-port': '0' })),
        ),
      ),
    );
    await run([ann], [bob]);
    await trickled;
    assert.equal(connections[0].ice.length, 1);
    assert.match(connections[0].ice[0].candidate, /198\.51\.100\.9 3478 typ relay/);
    connections[0].connect(new FakeStream([new FakeTrack('audio')]));
    assert.deepEqual(call.peers().map((p) => [p.identity, p.state]), [[bob.connection.fullJid, 'connected']]);
    // Named by their address, as the account names them.
    assert.equal(xmppGroupCalls.name!(bob.connection.fullJid), 'Bob');

    // Bob leaves the room: his connection goes, and his session is ended.
    await bob.connection.send(el('presence', { to: `${room}/b0b`, type: 'unavailable' }));
    await run([ann], [bob]);
    assert.deepEqual(call.peers(), []);
    assert.equal(connections[0].closed, true);
    assert.equal(child(cameIq(bob, 'session-terminate'), 'jingle', JINGLE)!.attrs.sid, 'bob-1');

    // Ann hangs up: out of the room, which goes with her, and the group told she left.
    call.hangUp();
    await run([ann], [bob]);
    const left = cameCall(bob, 'left');
    assert.equal(child(left, 'finish', LEGACY)?.attrs.id, call.id);
    assert.equal(server.rooms.has(room), false);
    // Its line, with how long it went on: a moment.
    assert.deepEqual(lines(ann, group).map(([id, mine]) => [id, mine]), [[`call-${call.id}`, true]]);
    assert.match(String(lines(ann, group)[0][2]), /^📞 Group call, 0:0\d$/);
    closeGroupCall(call);
    assert.equal(xmppGroupCallsKnown(), 0);
  } finally {
    stop();
    ann.connection.close();
    bob.connection.close();
  }
});

test("Dino's call rings here; answered, this phone gets ready, takes what the others take, says yes and calls each one ready; one who comes later calls us", { skip: !coreReady }, async () => {
  const server = new Server();
  const { ann, bob, group } = await groupOf(server);
  const cat = await played(server, 'cat');
  const { rtc, connections } = sdpRtc();
  const stop = watchXmppCalls(rtc, spaceOf(ann));
  try {
    const room = `c0ffee01@${MUC}`;
    await dinoStarts(bob, room, [ANN, CAT], 'call-1', true, group);
    await run([ann], [bob, cat]);
    const shown = shownGroupCall()!;
    assert.equal(shown.place, xmppGroupCalls);
    assert.deepEqual([shown.call.id, shown.call.state, shown.call.video, shown.call.startedBy], ['call-1', 'incoming', true, BOB]);
    assert.equal((await xmppGroupCalls.names!(group)).group, 'Friends');

    // Answered: in the room, ready with what Bob takes that WebRTC takes too, yes said in the group, and a session with Bob.
    const answering = shown.call.answer();
    await run([ann], [bob, cat], 30);
    await answering;
    assert.equal(shown.call.state, 'in');
    const annSaid = server.rooms.get(room)!.said!.get(ann.connection.fullJid);
    assert.deepEqual(names(annSaid, 'audio'), ['opus', 'PCMU']);
    assert.deepEqual(names(annSaid, 'video'), ['VP8']);
    const yes = cameCall(bob, 'accept');
    assert.equal(yes.attrs.type, 'groupchat');
    assert.equal(child(child(yes, 'accept', INVITES), 'muji', MUJI)?.attrs.room, room);
    assert.equal(child(child(yes, 'accept', LEGACY), 'muji', MUJI)?.attrs.room, room);
    const asked = cameIq(bob, 'session-initiate');
    assert.equal(asked.attrs.to, bob.connection.fullJid);
    const offered = child(asked, 'jingle', JINGLE)!;
    assert.deepEqual([offered.attrs.initiator, child(offered, 'muji', MUJI)?.attrs.room], [ann.connection.fullJid, room]);
    assert.match(jingleToSdp(offered, 'initiator', offered.attrs.sid), /m=video/);
    await answer(bob, asked);
    const accepted = bob.connection.iq(
      'set',
      ann.connection.fullJid,
      el('jingle', { xmlns: JINGLE, action: 'session-accept', sid: offered.attrs.sid, responder: bob.connection.fullJid }, ...sdpToJingle(description('answer', true, 'bobu'), 'responder')),
    );
    await run([ann], [bob, cat]);
    await accepted;
    assert.match(connections[0].remote!.sdp, /a=ice-ufrag:bobu/);

    // Cat comes after: its session comes before Ann sees it ready, and waits for that.
    await getReady(cat, room, 'ca7');
    await run([ann], [bob, cat]);
    const catAsked = initiate(cat, ann.connection.fullJid, 'cat-1', room, 'catu', true);
    await run([ann], [bob, cat]);
    await catAsked;
    assert.equal(connections.length, 1);
    await beReady(cat, room, 'ca7', true);
    await run([ann], [bob, cat]);
    const catAccept = cameIq(cat, 'session-accept');
    await answer(cat, catAccept);
    assert.equal(child(catAccept, 'jingle', JINGLE)!.attrs.sid, 'cat-1');
    assert.equal(connections.length, 2);
    assert.match(connections[1].remote!.sdp, /a=ice-ufrag:catu/);
    assert.deepEqual(shown.call.peers().map((p) => p.identity).sort(), [bob.connection.fullJid, cat.connection.fullJid].sort());

    // Bob ends his session: his connection goes, and the call goes on with Cat.
    const ended = bob.connection.iq('set', ann.connection.fullJid, el('jingle', { xmlns: JINGLE, action: 'session-terminate', sid: offered.attrs.sid }, el('reason', { xmlns: JINGLE }, el('success'))));
    await run([ann], [bob, cat]);
    await ended;
    assert.deepEqual(shown.call.peers().map((p) => p.identity), [cat.connection.fullJid]);

    // A session for a call not going on here is said no to.
    const stray = initiate(cat, ann.connection.fullJid, 'cat-2', `elsewhere@${MUC}`, 'catu').then(
      () => 'answered',
      () => 'said no to',
    );
    await run([ann], [bob, cat]);
    assert.equal(await stray, 'said no to');

    shown.call.hangUp();
    await run([ann], [bob, cat]);
    assert.equal(cameCall(bob, 'left').attrs.type, 'groupchat');
    assert.equal(child(cameIq(cat, 'session-terminate'), 'jingle', JINGLE)!.attrs.sid, 'cat-1');
    assert.deepEqual(lines(ann, group).map(([id, mine]) => [id, mine]), [['call-call-1', false]]);
    assert.match(String(lines(ann, group)[0][2]), /^📞 Group video call, 0:0\d$/);
    closeGroupCall(shown.call);
  } finally {
    stop();
    for (const device of [ann, bob, cat]) device.connection.close();
  }
});

test('taken back, from the history, from a stranger, or answered on another device of ours: it rings no longer, and its line says so', { skip: !coreReady }, async () => {
  const server = new Server();
  const { ann, bob, group } = await groupOf(server);
  const dan = await played(server, 'dan');
  const ann2 = await played(server, 'ann');
  const { rtc } = sdpRtc();
  const stop = watchXmppCalls(rtc, spaceOf(ann));
  try {
    // Taken back before anyone answered: a missed call.
    await dinoStarts(bob, `r00m0001@${MUC}`, [ANN], 'r1', false, group);
    await run([ann], [bob]);
    const rang = shownGroupCall()!.call;
    assert.equal(rang.state, 'incoming');
    await said(bob, group, 'groupchat', 'retract', 'r1');
    await run([ann], [bob]);
    assert.deepEqual([rang.state, rang.ended], ['ended', 'missed']);
    closeGroupCall(rang);

    // From the group's history: only its line.
    await invite(bob, group, 'groupchat', 'h1', true, `r00m0002@${MUC}`, [el('delay', { xmlns: NS.delay, stamp: new Date(Date.now() - 3600_000).toISOString() })]);
    await run([ann], [bob]);
    assert.equal(shownGroupCall(), null);

    // From someone not in the contacts, to Ann alone: only its line, in a chat with them.
    await dinoStarts(dan, `r00m0003@${MUC}`, [ANN], 's1', false, ANN, 'chat');
    await run([ann], [bob, dan]);
    assert.equal(shownGroupCall(), null);
    assert.deepEqual(lines(ann, `dan@${DOMAIN}`), [['call-s1', false, '📞 Missed group call']]);

    // Answered on Ann's other device, in the group: it stops ringing here, and nothing is said from here.
    await ann2.connection.send(el('presence', { to: `${group}/ann` }, el('x', { xmlns: NS_MUC })));
    await run([ann], [bob, ann2]);
    await dinoStarts(bob, `r00m0004@${MUC}`, [ANN], 'e1', false, group);
    await run([ann], [bob, ann2]);
    const ringing = shownGroupCall()!.call;
    assert.equal(ringing.state, 'incoming');
    bob.got.length = 0;
    await ann2.connection.send(el('message', { to: group, type: 'groupchat', id: 'yes-e1' }, el('accept', { xmlns: INVITES, id: 'e1' }, el('muji', { xmlns: MUJI, room: `r00m0004@${MUC}` }))));
    await run([ann], [bob, ann2]);
    assert.deepEqual([ringing.state, ringing.ended], ['ended', 'elsewhere']);
    // Only the other device's yes reached the group.
    assert.equal(bob.got.filter((s) => s.name === 'message' && child(s, 'accept', INVITES)).length, 1);
    assert.equal(bob.got.filter((s) => s.name === 'message' && child(s, 'reject', INVITES)).length, 0);
    closeGroupCall(ringing);

    // The one from the history by when it was.
    assert.deepEqual(lines(ann, group), [
      ['call-h1', false, '📞 Missed group video call'],
      ['call-r1', false, '📞 Missed group call'],
      ['call-e1', false, '📞 Group call, answered on another device'],
    ]);
  } finally {
    stop();
    for (const device of [ann, bob, dan, ann2]) device.connection.close();
  }
});

test('turned down, it can be joined while its room is there; once its room is gone it is over', { skip: !coreReady }, async () => {
  const server = new Server();
  const { ann, bob, group } = await groupOf(server);
  const { rtc, connections } = sdpRtc();
  const stop = watchXmppCalls(rtc, spaceOf(ann));
  try {
    const room = `j01n0001@${MUC}`;
    await dinoStarts(bob, room, [ANN], 'j1', false, group);
    await run([ann], [bob]);
    const rang = shownGroupCall()!.call;
    rang.decline();
    await run([ann], [bob]);
    // Bob hears it was turned down, in the group, as Dino says it.
    assert.ok(child(cameCall(bob, 'reject'), 'reject', LEGACY));
    closeGroupCall(rang);
    assert.equal(groupCallGoingOn(group)?.id, 'j1');

    // Its room is still there: it goes on, and is joined.
    await peekXmppGroupCalls();
    assert.equal(groupCallGoingOn(group)?.id, 'j1');
    const relay = await xmppGroupCalls.callRelay();
    const joining = joinGroupCall(xmppGroupCalls, group, relay, rtc);
    await run([ann], [bob], 30);
    const call = await joining;
    assert.equal(call.state, 'in');
    assert.equal(cameIq(bob, 'session-initiate').attrs.to, bob.connection.fullJid);
    // No call relay: straight, as Ann's own group calls go without one.
    assert.equal(connections[0].config.iceTransportPolicy, 'all');
    call.hangUp();
    await run([ann], [bob]);
    closeGroupCall(call);
    assert.equal(cameCall(bob, 'left').attrs.type, 'groupchat');

    // Bob leaves too, and the room goes: the call is over.
    await bob.connection.send(el('presence', { to: `${room}/d1n0`, type: 'unavailable' }));
    await run([ann], [bob]);
    assert.equal(server.rooms.has(room), false);
    await peekXmppGroupCalls();
    assert.equal(groupCallGoingOn(group), null);
    assert.equal(xmppGroupCallsKnown(), 0);

    // One whose room went before it was joined: joining it says it ended, and leaves nothing behind.
    const gone = `g0ne0001@${MUC}`;
    await dinoStarts(bob, gone, [ANN], 'g1', false, group);
    await run([ann], [bob]);
    shownGroupCall()!.call.decline();
    await run([ann], [bob]);
    closeGroupCall(shownGroupCall()!.call);
    await bob.connection.send(el('presence', { to: `${gone}/d1n0`, type: 'unavailable' }));
    await run([ann], [bob]);
    const late = joinGroupCall(xmppGroupCalls, group, relay, rtc);
    const tried = late.then(
      () => null,
      (error: Error) => error.message,
    );
    await run([ann], [bob], 30);
    assert.equal(await tried, 'The call has ended.');
    assert.equal(server.rooms.get(gone)?.occupants.size ?? 0, 0);
  } finally {
    stop();
    ann.connection.close();
    bob.connection.close();
  }
});

test("a hidden place's own account's call rings as the place's, ends as its hidden chats close, and is missed while they are", { skip: !coreReady }, async () => {
  const server = new Server();
  // Ann's account is the open hidden place's here, in a group with Bob; Eve's is the space's.
  const { ann: place, bob, group } = await groupOf(server);
  const eve = await person(server, 'eve');
  let open = true;
  const watching = new Set<() => void>();
  const { rtc } = sdpRtc();
  const stop = watchXmppCalls(rtc, spaceOf(eve, { device: place, open: () => open, watching }));
  try {
    await dinoStarts(bob, `p1ace001@${MUC}`, [ANN], 'p1', false, group);
    await run([eve, place], [bob]);
    const shown = shownGroupCall()!;
    assert.deepEqual([shown.place, shown.call.id, shown.call.state], [xmppPlaceGroupCalls, 'p1', 'incoming']);

    // The hidden chats close: it stops ringing, and the place's calls are forgotten with its account.
    open = false;
    watching.forEach((listener) => listener());
    assert.deepEqual([shown.call.state, shown.call.ended], ['ended', 'decline']);
    closeGroupCall(shown.call);
    assert.equal(xmppGroupCallsKnown(), 0);
    assert.deepEqual(lines(place, group), [['call-p1', false, '📞 Group call, turned down']]);

    // Closed, it receives: a call that comes now is kept as missed, as the place's own groups' are.
    await dinoStarts(bob, `p1ace002@${MUC}`, [ANN], 'p2', true, group);
    await run([eve, place], [bob]);
    assert.equal(shownGroupCall(), null);
    assert.equal(xmppGroupCallsKnown(), 0);
    assert.deepEqual(lines(place, group), [
      ['call-p1', false, '📞 Group call, turned down'],
      ['call-p2', false, '📞 Missed group video call'],
    ]);
    assert.deepEqual(lines(eve, group), []);
  } finally {
    stop();
    for (const device of [eve, bob, place]) device.connection.close();
  }
});
