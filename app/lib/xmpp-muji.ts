import { callNow, OFFER_FRESH_MS, type Rtc } from './call';
import { CALL_LINE } from './calls';
import { randomBytes, toHex } from './crypto';
import { currentGroupCall, HERE_EVERY, MAX_GROUP_CALL, type GroupCall } from './group-call';
import { groupCallSignal, onGroupCallChange, shownGroupCall, type GroupCallPlace } from './group-calls';
import { t } from './i18n';
import { candidatesOf, JINGLE, jingleToSdp, RTP, sdpToJingle } from './jingle-sdp';
import type { CallRelay } from './relay';
import { bare, domainOf, isXmppId, nameOf, newXmppId, NS, XmppError, type XmppConnection, type XmppState } from './xmpp';
import { findMuc, groupPeople, NS_DATA, NS_MUC, NS_MUC_ADMIN, NS_MUC_OWNER, NS_MUC_USER, roomOf } from './xmpp-muc';
import { child, children, el, type XmlElement } from './xmpp-xml';

// Group calls in XMPP private groups (docs/xmpp.md), as Dino makes them, so they work with Dino's:
// each call has a room of its own on the group service (MUJI, XEP-0272), members only, where
// everyone sees who everyone is. Each one in the call joins it, saying in its presence first that
// it is getting ready, then what sound and picture it takes. Whoever joins starts a Jingle session
// (XEP-0166, XEP-0167) with each one ready in it already, at their own address, so the call is a
// WebRTC connection between each two of them: the same mesh as Erevos's own group calls
// (lib/group-call.ts), each connection set up as a call with one person on XMPP is
// (lib/xmpp-calls.ts, lib/jingle-sdp.ts). It rings with an invitation in the group (Call Invites,
// XEP-0482, with the older urn:xmpp:call-message:1 beside it, as Dino sends and reads both), once
// the group's members were made owners of the call's room, so they may join it; or with one sent
// to a person alone, as Dino asks someone into a call. Who is in a call is who its room says, and
// a call whose room is gone is over: one that rang here is looked at now and then (peek), so it can
// be joined while it goes on.
//
// What is not the same as Erevos's own group calls: the invitations, and the descriptions with the
// key fingerprint of each connection's encryption (DTLS-SRTP), pass through the XMPP servers as
// they are, not end-to-end encrypted, so those servers could put themselves in between; and the
// call's room tells the group service who is in the call. Each connection goes through our call
// relay, else the XMPP server's (XEP-0215), and only through it, as a call with one person does.
//
// A hidden place's own account calls the same way while its hidden chats are open, as a place of
// its own (xmppPlaceGroupCalls); its calls end, and are forgotten, as they close.

const MUJI = NS.muji;
const INVITES = NS.callInvites;
const LEGACY = NS.callMessage;
const ERRORS = 'urn:xmpp:jingle:errors:1';

/** How long the call's room is waited for, to let us in and for those getting ready in it, milliseconds. */
const ROOM_MS = 15_000;
/** How long an offer from someone not seen ready in the call's room yet waits for them, milliseconds. */
const UNSEEN_MS = 10_000;
/** How long a call that rang here is looked after, while it may still go on, milliseconds. */
const KEEP_MS = 12 * 3600_000;

/** The sound and picture a call this phone starts says it takes: what WebRTC always can. */
const OWN_PAYLOADS: Record<string, () => XmlElement[]> = {
  audio: () => [el('payload-type', { id: 111, name: 'opus', clockrate: 48000, channels: 2 }, el('parameter', { name: 'useinbandfec', value: '1' }))],
  video: () => [el('payload-type', { id: 96, name: 'VP8', clockrate: 90000 })],
};
/** Of what others in a call say they take, what WebRTC can too. */
const WEBRTC_CODECS = new Set(['opus', 'pcmu', 'pcma', 'g722', 'telephone-event', 'vp8', 'vp9', 'h264', 'av1']);

/** What the group calls need of the open space's XMPP accounts (lib/xmpp-calls.ts gives it; the checks their own). */
export type MujiSpace = {
  /** The space's account (false) or the open hidden place's (true), and its connection, while it is connected. */
  link(place: boolean): { state: XmppState; connection: XmppConnection } | null;
  /** Keeps a call's line in a chat of that account; one with the same `id` is said again in its place. */
  line(place: boolean, jid: string, mine: boolean, text: string, id: string, at?: number): Promise<void>;
  /** The call relay that account's calls go through, or null. */
  callRelay(place: boolean): Promise<CallRelay | null>;
  /** Whether `state` is the open hidden place's account (true) or the space's (false); null for neither. */
  placeOf(state: XmppState): boolean | null;
  /** Whether a person may ring us: one in the account's contacts. */
  mayRing(state: XmppState, jid: string): boolean;
  /** Whether the hidden place's hidden chats are open. */
  placeOpen(): boolean;
  /** Calls the listener as the accounts change (a place's opened or closed). Returns how to stop. */
  watch?(listener: () => void): () => void;
};

/** Someone in a call's room: their own address, and whether they are ready, no longer getting ready. */
type Occupant = { real: string; ready: boolean };

/** One group call, from its invitation, or its start here, on. */
type Muji = {
  /** The invitation's id: the call's. */
  id: string;
  /** The group it is in; for an invitation to us alone, the person's address. */
  group: string;
  /** Answers go to the group as a group message, or to the person. */
  type: 'groupchat' | 'chat';
  /** Where answers go: the group, or the address that invited. */
  to: string;
  /** The call's own room. */
  room: string;
  video: boolean;
  /** Of the open hidden place's own account. */
  place: boolean;
  /** Who invited, by address; empty for ours. */
  from: string;
  outgoing: boolean;
  /** Since when it is known here, milliseconds. */
  at: number;
  /** Our name in its room, while we are in it or getting in. */
  nick: string;
  /** In its room now. */
  inside: boolean;
  /** Its room was made by our joining it: for a call that rang here, it was gone. */
  made: boolean;
  /** Someone else was ready in its room once: our end says we left, not that it is taken back. */
  joined: boolean;
  /** Answered or turned down on another device of the account: nothing more is said of it from here. */
  elsewhere: boolean;
  /** The call it is on this phone, while it rings, or is going on, here. */
  call: GroupCall | null;
  /** Who is in its room, by their name there. */
  occupants: Map<string, Occupant>;
  /** The sound and picture the first one ready in it said it takes, by media. */
  payloads: Record<string, XmlElement[]>;
  /** Jingle sessions, by the other one's address. */
  sessions: Map<string, { sid: string; outgoing: boolean }>;
  /** Offers from someone not seen ready in the room yet, by their address. */
  held: Map<string, { sdp: string; timer: ReturnType<typeof setTimeout> }>;
  /** Waiting for the room: to let us in, then for those getting ready. */
  wait: { until: 'in' | 'ready'; done: () => void; fail: (error: Error) => void } | null;
};

const mujis = new Map<string, Muji>();
/** The last call rung or started in each group, for its line. */
const lastIn = new Map<string, string>();
let space: MujiSpace | null = null;
let rtcNow: Rtc | null = null;

const hex = (bytes: number) => toHex(randomBytes(bytes));

function newMuji(given: Pick<Muji, 'id' | 'group' | 'type' | 'to' | 'room' | 'video' | 'place' | 'from' | 'outgoing'>): Muji {
  return { ...given, at: Date.now(), nick: '', inside: false, made: false, joined: false, elsewhere: false, call: null, occupants: new Map(), payloads: {}, sessions: new Map(), held: new Map(), wait: null };
}

function link(place: boolean): { state: XmppState; connection: XmppConnection } {
  const now = space?.link(place);
  if (!now) throw new Error(t('Not connected to the XMPP server yet. Try again in a moment.'));
  return now;
}

// ---- the places, as lib/group-calls.ts knows places: the space's account's group calls, and the open hidden place's ----

function callsOf(place: boolean): GroupCallPlace {
  return {
    async send(group, signal) {
      switch (signal.kind) {
        case 'start':
          return start(group, signal.id, signal.video, place);
        case 'join':
          return join(signal.id);
        case 'offer':
          return offer(signal.id, signal.to, signal.sdp);
        case 'answer':
          return answer(signal.id, signal.to, signal.sdp);
        default:
          // Who is in the call is what its room says; its end is told as it ends (over).
          return;
      }
    },
    callRelay: () => space?.callRelay(place) ?? Promise.resolve(null),
    async me() {
      return link(place).connection.fullJid;
    },
    line(group, text) {
      const shown = shownGroupCall()?.call;
      const call = shown?.group === group ? shown : null;
      const id = call?.id ?? lastIn.get(group) ?? hex(8);
      void space?.line(place, group, call?.startedBy === '', text, `call-${id}`).catch(() => undefined);
    },
    async names(group) {
      const state = space?.link(place)?.state;
      return { group: state ? nameOf(state, group) : group, contacts: [] };
    },
    name(identity) {
      const jid = bare(identity);
      const state = space?.link(place)?.state;
      return state ? nameOf(state, jid) : jid;
    },
    relayAlways: true,
  };
}

/** The group calls of the space's XMPP account. */
export const xmppGroupCalls: GroupCallPlace = callsOf(false);
/** The group calls of the open hidden place's own XMPP account, while its hidden chats are open. */
export const xmppPlaceGroupCalls: GroupCallPlace = callsOf(true);

const callsFor = (place: boolean) => (place ? xmppPlaceGroupCalls : xmppGroupCalls);

// ---- going in ----

/** The call's room set up as Dino sets it up: members only, everyone's address seen, not kept, not listed; only the fields it has. */
function callSettings(form: XmlElement | undefined): XmlElement {
  const offered = new Set(children(form, 'field').map((f) => f.attrs.var));
  const wanted: [string, string][] = [
    ['muc#roomconfig_persistentroom', '0'],
    ['muc#roomconfig_membersonly', '1'],
    ['muc#roomconfig_whois', 'anyone'],
    ['muc#roomconfig_allowinvites', '1'],
    ['muc#roomconfig_publicroom', '0'],
  ];
  return el(
    'x',
    { xmlns: NS_DATA, type: 'submit' },
    el('field', { var: 'FORM_TYPE', type: 'hidden' }, el('value', {}, `${NS_MUC}#roomconfig`)),
    ...wanted.filter(([field]) => offered.has(field)).map(([field, value]) => el('field', { var: field }, el('value', {}, value))),
  );
}

/** Starts a call in a private group: its room, made by joining it and set up, the group's members its
 *  owners, then the invitation in the group. */
async function start(group: string, id: string, video: boolean, place: boolean): Promise<void> {
  const { state, connection } = link(place);
  const room = roomOf(state, group);
  if (!room?.private) throw new XmppError(t('Group calls are only in private groups.'));
  const service = await findMuc(connection, domainOf(state.jid), state.muc);
  if (!service) throw new XmppError(t('Your XMPP server has no group chats.'));
  const m = newMuji({ id, group, type: 'groupchat', to: group, room: `${hex(4)}@${service.jid}`, video, place, from: '', outgoing: true });
  mujis.set(id, m);
  lastIn.set(group, id);
  const call = currentGroupCall();
  if (call?.id === id) m.call = call;
  try {
    await enter(m, connection);
    // Made by joining it, it is locked until it has its settings.
    const form = child(child(await connection.iq('get', m.room, el('query', { xmlns: NS_MUC_OWNER })), 'query', NS_MUC_OWNER), 'x', NS_DATA);
    await connection.iq('set', m.room, el('query', { xmlns: NS_MUC_OWNER }, callSettings(form)));
    // Each member may join it: an owner, as Dino makes them, one by one, as some servers take one at a time.
    await Promise.all(groupPeople(state, room).map((jid) => connection.iq('set', m.room, el('query', { xmlns: NS_MUC_ADMIN }, el('item', { affiliation: 'owner', jid }))).catch(() => undefined)));
    await ready(m, connection);
    await connection.send(inviteMessage(m));
  } catch (error) {
    mujis.delete(id);
    await out(m, connection);
    throw error;
  }
}

/** Joins a call that rang here, or goes on in a group: in its room, ready, the invitation answered,
 *  and then this phone connects to each one ready in it (lib/group-call.ts offers to whoever joins). */
async function join(id: string): Promise<void> {
  const m = mujis.get(id);
  if (!m) throw new Error(t('The call has ended.'));
  const { connection } = link(m.place);
  const call = currentGroupCall();
  if (call?.id === id) m.call = call;
  m.elsewhere = false;
  try {
    await enter(m, connection);
    // Its room was gone, and joining it made a new one: the call is over.
    if (m.made) throw new Error(t('The call has ended.'));
    const there = [...m.occupants.values()].filter((o) => o.ready);
    if (there.length > MAX_GROUP_CALL - 1) throw new XmppError(t('This call is full.'));
    await ready(m, connection);
    await connection.send(answerMessage(m, 'accept'));
    for (const o of there) m.call?.receive(o.real, { id, kind: 'join' });
  } catch (error) {
    await out(m, connection);
    if (m.made) forget(m);
    throw error;
  }
}

/** Into the call's room, getting ready; then waits for those getting ready in it already, as each
 *  connects to those ready when it is (XEP-0272 §3.2). */
async function enter(m: Muji, connection: XmppConnection): Promise<void> {
  m.nick = hex(4);
  m.inside = false;
  m.made = false;
  m.occupants.clear();
  m.payloads = {};
  const came = waitFor(m, 'in');
  await connection.send(el('presence', { to: `${m.room}/${m.nick}` }, el('x', { xmlns: NS_MUC }, el('history', { maxstanzas: 0 })), el('muji', { xmlns: MUJI }, el('preparing'))));
  await came;
  if ([...m.occupants.values()].some((o) => !o.ready)) await waitFor(m, 'ready').catch(() => undefined);
}

function waitFor(m: Muji, until: 'in' | 'ready'): Promise<void> {
  return new Promise((resolve, reject) => {
    const finish = (error?: Error) => {
      clearTimeout(timer);
      if (m.wait === wait) m.wait = null;
      if (error) reject(error);
      else resolve();
    };
    const timer = setTimeout(() => finish(new XmppError(t('Could not get into the call.'), 'remote-server-timeout')), ROOM_MS);
    const wait = { until, done: () => finish(), fail: (error: Error) => finish(error) };
    m.wait = wait;
  });
}

/** Ready: what sound, and picture, this phone takes, said in its presence, as the others in the room
 *  said theirs, so each one's list is the same as the others' (Dino takes only what all say). */
async function ready(m: Muji, connection: XmppConnection): Promise<void> {
  const contents = (m.video ? ['audio', 'video'] : ['audio']).map((media) => {
    const theirs = (m.payloads[media] ?? []).filter((p) => WEBRTC_CODECS.has((p.attrs.name ?? '').toLowerCase()));
    const types = theirs.length ? theirs : OWN_PAYLOADS[media]();
    return el('content', { xmlns: JINGLE, name: media }, el('description', { xmlns: RTP, media }, ...types));
  });
  await connection.send(el('presence', { to: `${m.room}/${m.nick}` }, el('muji', { xmlns: MUJI }, ...contents)));
}

/** Out of the call's room, whatever came of getting in. */
async function out(m: Muji, connection: XmppConnection): Promise<void> {
  const nick = m.nick;
  m.nick = '';
  m.inside = false;
  m.wait?.fail(new Error(t('The call has ended.')));
  if (nick) await connection.send(el('presence', { to: `${m.room}/${nick}`, type: 'unavailable' })).catch(() => undefined);
}

function forget(m: Muji): void {
  for (const held of m.held.values()) clearTimeout(held.timer);
  m.held.clear();
  if (mujis.get(m.id) === m) mujis.delete(m.id);
}

// ---- the invitations, and their answers (XEP-0482, and the older form beside it) ----

const store = () => el('store', { xmlns: NS.hints });

function inviteMessage(m: Muji): XmlElement {
  const what = (xmlns: string, name: string) => el(name, { xmlns, id: m.id, video: String(m.video), multi: 'true' }, el('muji', { xmlns: MUJI, room: m.room }));
  return el('message', { to: m.to, type: m.type, id: newXmppId() }, what(INVITES, 'invite'), what(LEGACY, 'propose'), store());
}

function answerMessage(m: Muji, name: 'accept' | 'reject' | 'retract' | 'left'): XmlElement {
  const method = name === 'accept' ? el('muji', { xmlns: MUJI, room: m.room }) : null;
  // The older form says `finish` for `left`.
  return el('message', { to: m.to, type: m.type, id: newXmppId() }, el(name, { xmlns: INVITES, id: m.id }, method), el(name === 'left' ? 'finish' : name, { xmlns: LEGACY, id: m.id }, method), store());
}

function onInvite(state: XmppState, connection: XmppConnection, message: XmlElement, how: { at: number; live: boolean }): void {
  const place = space?.placeOf(state);
  if (!space || place === null || place === undefined) return;
  const node = children(message).find((c) => c.ns === INVITES) ?? children(message).find((c) => c.ns === LEGACY);
  const id = node?.attrs.id;
  if (!node || !id) return;
  const from = message.attrs.from ?? '';
  const groupchat = message.attrs.type === 'groupchat';
  let sender = bare(from);
  let mine = sender === state.jid;
  if (groupchat) {
    const room = roomOf(state, from);
    if (!room) return;
    const nick = from.slice(from.indexOf('/') + 1);
    sender = room.occupants[nick] || bare(child(child(message, 'x', NS_MUC_USER), 'item')?.attrs.jid ?? '');
    mine = sender ? sender === state.jid : nick === room.nick;
  } else if (from === connection.fullJid) {
    return;
  }
  const m = mujis.get(id);
  switch (node.name) {
    case 'invite':
    case 'propose': {
      const muji = child(node, 'muji', MUJI);
      const room = bare(muji?.attrs.room ?? '');
      // An invitation to a call with one person: those ring with XEP-0353 (lib/xmpp-calls.ts). Ours, back from the group: not one to ring.
      if (!muji || !isXmppId(room) || mine || m) return;
      const group = groupchat ? bare(from) : sender;
      const video = node.attrs.video === 'true';
      lastIn.set(group, id);
      const fresh = how.live && Date.now() - how.at < OFFER_FRESH_MS;
      if (!fresh || !rtcNow || (!groupchat && !space.mayRing(state, sender))) {
        void space.line(place, group, false, `${CALL_LINE}Missed ${video ? 'group video call' : 'group call'}`, `call-${id}`, how.at).catch(() => undefined);
        return;
      }
      mujis.set(id, newMuji({ id, group, type: groupchat ? 'groupchat' : 'chat', to: groupchat ? group : from, room, video, place, from: sender || from, outgoing: false }));
      // By the relay's clock, as lib/group-calls.ts judges a start fresh.
      const at = callNow() - (Date.now() - how.at);
      void groupCallSignal(callsFor(place), group, sender || from, { id, kind: 'start', at, video }, rtcNow).catch(() => undefined);
      return;
    }
    case 'accept':
    case 'reject':
      // Answered, or turned down, on another device of the account, while it rings here: it stops.
      if (mine && m && !m.outgoing && m.call?.state === 'incoming') {
        m.elsewhere = true;
        if (node.name === 'reject') m.call.decline();
        else m.call.endedElsewhere();
      }
      return;
    case 'retract':
      // Taken back by whoever invited, before anyone answered: it rings no longer.
      if (!mine && m && !m.outgoing && !m.nick && sender === m.from) {
        forget(m);
        if (rtcNow) void groupCallSignal(callsFor(m.place), m.group, m.from, { id, kind: 'leave' }, rtcNow).catch(() => undefined);
      }
      return;
    default:
      // `left`, `finish`: who is in the call is what its room says.
      return;
  }
}

// ---- its room ----

function onPresence(state: XmppState, connection: XmppConnection, presence: XmlElement): boolean {
  const from = presence.attrs.from ?? '';
  const room = bare(from);
  const m = [...mujis.values()].find((c) => c.room === room && c.nick);
  if (!m || space?.placeOf(state) !== m.place) return false;
  const slash = from.indexOf('/');
  if (slash < 0) return true;
  const nick = from.slice(slash + 1);
  const x = child(presence, 'x', NS_MUC_USER);
  const codes = new Set(children(x, 'status').map((s) => s.attrs.code));
  if (presence.attrs.type === 'error') {
    const condition = child(presence, 'error')?.children.find((c): c is XmlElement => typeof c !== 'string' && c.ns === NS.stanzas && c.name !== 'text')?.name ?? '';
    m.wait?.fail(new XmppError(t('Could not get into the call.'), condition));
    return true;
  }
  // Ours: by the name we asked for, or as the room says, when it gave us another.
  if (nick === m.nick || codes.has('110')) {
    if (presence.attrs.type === 'unavailable') {
      // Taken out of the room, or it went away: so did the call, here.
      const was = m.inside;
      m.inside = false;
      m.nick = '';
      if (was && m.call?.state === 'in') m.call.hangUp();
      return true;
    }
    m.inside = true;
    m.nick = nick;
    if (codes.has('201')) m.made = true;
    if (m.wait?.until === 'in') m.wait.done();
    return true;
  }
  const muji = child(presence, 'muji', MUJI);
  const real = child(x, 'item')?.attrs.jid ?? '';
  if (presence.attrs.type === 'unavailable' || !muji || !real.includes('/')) {
    // Gone, or in the room but not in the call, or one whose address the room does not tell.
    const gone = m.occupants.get(nick);
    m.occupants.delete(nick);
    if (gone) left(m, connection, gone.real);
    settled(m);
    return true;
  }
  const ready = !child(muji, 'preparing', MUJI);
  m.occupants.set(nick, { real, ready });
  if (ready) {
    m.joined = true;
    for (const media of ['audio', 'video']) {
      if (m.payloads[media]) continue;
      const types = children(muji, 'content', JINGLE)
        .map((c) => child(c, 'description', RTP))
        .filter((d) => d?.attrs.media === media)
        .flatMap((d) => children(d, 'payload-type', RTP));
      if (types.length) m.payloads[media] = types;
    }
    // Their offer came before this.
    const held = m.held.get(real);
    if (held) {
      clearTimeout(held.timer);
      m.held.delete(real);
      m.call?.receive(real, { id: m.id, kind: 'offer', to: connection.fullJid, sdp: held.sdp });
    }
  }
  settled(m);
  return true;
}

/** Whether those getting ready in the room, as we got in, are ready now (or gone). */
function settled(m: Muji): void {
  if (m.wait?.until === 'ready' && [...m.occupants.values()].every((o) => o.ready)) m.wait.done();
}

/** Someone left the call: their session ends, and their connection with it. */
function left(m: Muji, connection: XmppConnection, real: string): void {
  const held = m.held.get(real);
  if (held) clearTimeout(held.timer);
  m.held.delete(real);
  const session = m.sessions.get(real);
  m.sessions.delete(real);
  if (session) void terminate(connection, real, session.sid, 'cancel');
  m.call?.receive(real, { id: m.id, kind: 'leave' });
}

function terminate(connection: XmppConnection, to: string, sid: string, reason: string): Promise<unknown> {
  return connection.iq('set', to, el('jingle', { xmlns: JINGLE, action: 'session-terminate', sid }, el('reason', { xmlns: JINGLE }, el(reason)))).catch(() => undefined);
}

// ---- the connections: a Jingle session with each one in the call ----

async function offer(id: string, to: string, sdp: string): Promise<void> {
  const m = mujis.get(id);
  if (!m?.inside) throw new Error(t('The call has ended.'));
  const { connection } = link(m.place);
  const sid = newXmppId();
  m.sessions.set(to, { sid, outgoing: true });
  await connection.iq('set', to, el('jingle', { xmlns: JINGLE, action: 'session-initiate', sid, initiator: connection.fullJid }, ...sdpToJingle(sdp, 'initiator'), el('muji', { xmlns: MUJI, room: m.room })));
}

async function answer(id: string, to: string, sdp: string): Promise<void> {
  const m = mujis.get(id);
  const session = m?.sessions.get(to);
  if (!m || !session || session.outgoing) throw new Error(t('The call has ended.'));
  const { connection } = link(m.place);
  await connection.iq('set', to, el('jingle', { xmlns: JINGLE, action: 'session-accept', sid: session.sid, responder: connection.fullJid }, ...sdpToJingle(sdp, 'responder')));
}

/** A Jingle question about a group call's session: answered here (true), or not one (false, for lib/xmpp-calls.ts). */
async function onIq(state: XmppState, connection: XmppConnection, iq: XmlElement): Promise<boolean> {
  const jingle = child(iq, 'jingle', JINGLE);
  const place = space?.placeOf(state);
  if (!jingle || place === null || place === undefined) return false;
  const from = iq.attrs.from ?? '';
  const sid = jingle.attrs.sid ?? '';
  const action = jingle.attrs.action;
  const reply = () => connection.send(el('iq', { type: 'result', id: iq.attrs.id, to: from }));
  const refuse = (condition: string, extra?: XmlElement) =>
    connection.send(el('iq', { type: 'error', id: iq.attrs.id, to: from }, el('error', { type: 'cancel' }, el(condition, { xmlns: NS.stanzas }), extra ?? null)));
  if (action === 'session-initiate') {
    const room = bare(child(jingle, 'muji', MUJI)?.attrs.room ?? '');
    // A call with one person: lib/xmpp-calls.ts's.
    if (!room) return false;
    const m = [...mujis.values()].find((c) => c.room === room && c.place === place && c.inside);
    if (!m?.call || m.call.state !== 'in') {
      await refuse('item-not-found', el('unknown-session', { xmlns: ERRORS }));
      return true;
    }
    let sdp: string;
    try {
      sdp = jingleToSdp(jingle, 'initiator', sid);
    } catch {
      await refuse('feature-not-implemented');
      return true;
    }
    await reply();
    m.sessions.set(from, { sid, outgoing: false });
    // Only from someone ready in the call's room, which only the group's members may join.
    if ([...m.occupants.values()].some((o) => o.real === from && o.ready)) {
      m.call.receive(from, { id: m.id, kind: 'offer', to: connection.fullJid, sdp });
      return true;
    }
    const before = m.held.get(from);
    if (before) clearTimeout(before.timer);
    const timer = setTimeout(() => {
      if (m.held.get(from)?.timer !== timer) return;
      m.held.delete(from);
      m.sessions.delete(from);
      void terminate(connection, from, sid, 'decline');
    }, UNSEEN_MS);
    m.held.set(from, { sdp, timer });
    return true;
  }
  const m = [...mujis.values()].find((c) => c.place === place && c.sessions.get(from)?.sid === sid);
  const session = m?.sessions.get(from);
  if (!m || !session) return false;
  switch (action) {
    case 'session-accept': {
      if (!session.outgoing) {
        await refuse('bad-request');
        return true;
      }
      let sdp: string;
      try {
        sdp = jingleToSdp(jingle, 'responder', sid);
      } catch {
        await refuse('feature-not-implemented');
        m.sessions.delete(from);
        m.call?.receive(from, { id: m.id, kind: 'leave' });
        return true;
      }
      await reply();
      m.call?.receive(from, { id: m.id, kind: 'answer', to: connection.fullJid, sdp });
      return true;
    }
    case 'transport-info':
      await reply();
      m.call?.addCandidates(from, candidatesOf(jingle));
      return true;
    case 'session-info':
      // Ringing, muted and the rest: nothing a group call shows.
      await reply();
      return true;
    case 'session-terminate':
      await reply();
      m.sessions.delete(from);
      m.call?.receive(from, { id: m.id, kind: 'leave' });
      return true;
    default:
      // Video added later, and the rest: not in a group call.
      await refuse('feature-not-implemented', el('unsupported-info', { xmlns: ERRORS }));
      return true;
  }
}

// ---- the end ----

function changed(): void {
  const shown = shownGroupCall();
  if (shown && (shown.place === xmppGroupCalls || shown.place === xmppPlaceGroupCalls) && shown.call.state !== 'ended') {
    const m = mujis.get(shown.call.id);
    if (m) m.call = shown.call;
  }
  for (const m of [...mujis.values()]) {
    if (m.call?.state === 'ended') void over(m, m.call);
  }
}

/** A call ended here: out of its room, each session ended, and the group told as Dino tells it. One
 *  that rang here is kept, to be joined while it goes on. */
async function over(m: Muji, call: GroupCall): Promise<void> {
  m.call = null;
  const now = space?.link(m.place);
  const was = !!m.nick;
  const sessions = [...m.sessions];
  m.sessions.clear();
  m.occupants.clear();
  for (const held of m.held.values()) clearTimeout(held.timer);
  m.held.clear();
  if (m.outgoing) forget(m);
  if (!now) {
    m.nick = '';
    m.inside = false;
    return;
  }
  const { connection } = now;
  await out(m, connection);
  // Not waited for: one whose app went quiet does not hold up the rest.
  for (const [full, session] of sessions) void terminate(connection, full, session.sid, 'success');
  if (m.elsewhere) return;
  const told = was ? (m.outgoing && !m.joined ? 'retract' : 'left') : call.ended === 'decline' ? 'reject' : null;
  if (told) await connection.send(answerMessage(m, told)).catch(() => undefined);
}

/** Calls that rang here, and may go on: whether their rooms are still there. A gone room is a call over. */
async function peek(): Promise<void> {
  for (const m of [...mujis.values()]) {
    // Ours, and one this phone is in or getting into: its room says.
    if (m.outgoing || m.nick || m.call?.state === 'in') continue;
    if (Date.now() - m.at > KEEP_MS) {
      forget(m);
      continue;
    }
    const now = space?.link(m.place);
    if (!now) continue;
    try {
      await now.connection.iq('get', m.room, el('query', { xmlns: NS.discoInfo }), 10_000);
      if (mujis.get(m.id) === m && rtcNow) void groupCallSignal(callsFor(m.place), m.group, m.from, { id: m.id, kind: 'here', video: m.video }, rtcNow).catch(() => undefined);
    } catch (error) {
      if (!(error instanceof XmppError) || !['item-not-found', 'gone', 'remote-server-not-found'].includes(error.condition) || mujis.get(m.id) !== m || m.nick) continue;
      forget(m);
      if (rtcNow) void groupCallSignal(callsFor(m.place), m.group, m.from, { id: m.id, kind: 'leave' }, rtcNow).catch(() => undefined);
    }
  }
}

/** The hidden place's hidden chats closed: its call ends, and its calls are forgotten, as its account goes with them. */
function placeChanged(): void {
  if (space?.placeOpen()) return;
  const shown = shownGroupCall();
  if (shown?.place === xmppPlaceGroupCalls && shown.call.state !== 'ended') {
    if (shown.call.state === 'incoming') shown.call.decline();
    else shown.call.hangUp();
  }
  for (const m of [...mujis.values()]) if (m.place && !m.call) forget(m);
}

/** What lib/xmpp-calls.ts hands over of what comes, for the group calls. */
export type MujiHooks = {
  invite(state: XmppState, connection: XmppConnection, message: XmlElement, how: { at: number; live: boolean }): void;
  presence(state: XmppState, connection: XmppConnection, presence: XmlElement): boolean;
  /** Answers a Jingle question about a group call's session (true), or leaves it (false). */
  iq(state: XmppState, connection: XmppConnection, iq: XmlElement): Promise<boolean>;
  stop(): void;
};

/** Takes XMPP group calls in, with `rtc`, while the space is open: lib/xmpp-calls.ts hands over what
 *  comes for them. Returns what it hands over, and how to stop. */
export function watchXmppGroupCalls(rtc: Rtc, given: MujiSpace): MujiHooks {
  rtcNow = rtc;
  space = given;
  const stopChange = onGroupCallChange(changed);
  const stopWatch = given.watch?.(placeChanged);
  const timer = setInterval(() => void peek(), HERE_EVERY);
  return {
    invite: onInvite,
    presence: onPresence,
    iq: onIq,
    stop() {
      clearInterval(timer);
      stopWatch?.();
      stopChange();
      for (const m of [...mujis.values()]) forget(m);
      lastIn.clear();
      if (space === given) {
        space = null;
        rtcNow = null;
      }
    },
  };
}

/** For the checks: the calls known here, and looks at their rooms now. */
export function xmppGroupCallsKnown(): number {
  return mujis.size;
}
export const peekXmppGroupCalls = peek;
