// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { callNow, currentCall, type Call, type Rtc } from './call';
import type { CallEnd } from './call-signal';
import { CALL_LINE, callSignal, shownCall, startCall, type CallPlace } from './calls';
import { randomBytes, toHex } from './crypto';
import { t } from './i18n';
import { addMatrixCallLine, call as ask, sendEvent, setLegacyCallHandler, shownRoomName, type CallEvent, type Json, type MatrixState } from './matrix';
import type { MatrixCallsAccount } from './matrix-calls';
import type { CallRelay } from './relay';
import { spaceCalls } from './space-calls';

// One-to-one calls with people on Matrix as FluffyChat, Nheko and Element on a computer make them
// (the Client-Server API's VoIP, m.call.*, version 1), beside Element Call's (lib/matrix-calls.ts),
// which Element X makes and these apps do not take. The call itself is lib/call.ts's, the same as
// Erevos's own, and shows on the same screen (lib/calls.ts, components/call-host.tsx).
//
// The caller's description goes in an invite (m.call.invite) to the room, the answer in an answer
// (m.call.answer), which the caller picks (m.call.select_answer) when more than one device of the
// person answered; more addresses may come apart (m.call.candidates), and the call ends with a
// hang-up or, before it was answered, a no (m.call.reject). In an encrypted room these go
// encrypted, as the room's messages do, so the key fingerprint of the call's encryption
// (DTLS-SRTP) reaches the other side end to end and no server can put itself in between. One that
// comes unencrypted in an encrypted room is not taken. The call goes through our own call relay
// when the space has one, else the homeserver's (/voip/turnServer), and only through it, so the
// other side learns no address of this phone.
//
// Video is added to a voice call, and a camera turned on in a video call answered without it, with
// a new description of the call (m.call.negotiate), which the other side's app takes without
// asking, as Element and FluffyChat do; so is theirs here: their picture added to a voice call
// shows, and our camera stays off until it is turned on. Only with an app of version 1, which has it.
//
// Only in a room we are in, with only the two of us in it, and only an invite to us, or to nobody
// named. A hidden place's own account calls and is called the same way while its hidden chats are
// open; while they are closed, a call to it is told as missed.

export const MATRIX_VOIP_PREFIX = 'matrix-voip:';
const VERSION = '1';
/** How long an invite of ours rings, milliseconds, as Element asks. */
const LIFETIME = 60_000;
/** How long a new description of ours waits for their app's answer, which needs no one, milliseconds. */
const NEGOTIATE_MS = 30_000;
/** The events of these calls, as lib/matrix.ts hands them over. */
export const LEGACY = new Set(['m.call.invite', 'm.call.candidates', 'm.call.answer', 'm.call.select_answer', 'm.call.hangup', 'm.call.reject', 'm.call.negotiate']);

/** One call, from its invite to its end. */
type Session = {
  id: string;
  roomId: string;
  outgoing: boolean;
  video: boolean;
  /** Ours, for this call (party_id); theirs once their device is known. */
  party: string;
  theirs?: string;
  /** It was answered: a hang-up then ends it, not a no. */
  answered?: boolean;
  place?: true;
  /** Their addresses that came before the call was there. */
  early?: { candidate: string; sdpMid: string }[];
  /** Our new description (m.call.negotiate), waiting for their answer; null when none came. */
  adding?: (sdp: string | null) => void;
};

/** The accounts the calls are of: the space's, and the open hidden place's. */
export type VoipAccounts = MatrixCallsAccount & { place?: MatrixCallsAccount };

const sessions = new Map<string, Session>();
let accounts: VoipAccounts | null = null;
let rtcNow: Rtc | null = null;

const accountOf = (place: boolean | undefined): MatrixCallsAccount | undefined => (place ? accounts?.place : (accounts ?? undefined));
const roomOfPeer = (peer: string) => peer.slice(peer.indexOf(':') + 1);
const calling = (id: string): Call | null => {
  const call = currentCall();
  return call?.id === id ? call : null;
};

function placeOf(state: MatrixState): boolean | null {
  if (accounts?.now() === state) return false;
  if (accounts?.place?.now() === state) return true;
  return null;
}

/** The other one in a room of two, or null when it is not one. */
function otherIn(state: MatrixState, roomId: string): string | null {
  const room = state.rooms[roomId];
  if (!room || room.invitedBy) return null;
  const others = Object.entries(room.members).filter(([who, m]) => who !== state.userId && m.membership === 'join');
  const invited = Object.entries(room.members).filter(([who, m]) => who !== state.userId && m.membership === 'invite');
  return others.length + invited.length === 1 ? (others[0] ?? invited[0])[0] : null;
}

const hangupReason = (end: CallEnd, outgoing: boolean, answered: boolean): string =>
  end === 'busy' ? 'user_busy' : end === 'failed' ? (answered ? 'ice_failed' : 'unknown_error') : end === 'missed' && outgoing ? 'invite_timeout' : 'user_hangup';

function endOf(type: string, reason: unknown, answered: boolean): CallEnd {
  if (type === 'm.call.reject') return 'decline';
  if (reason === 'user_busy') return 'busy';
  if (reason === 'invite_timeout') return 'missed';
  if (reason === 'ice_failed' || reason === 'ice_timeout' || reason === 'user_media_failed' || reason === 'unknown_error') return 'failed';
  return answered ? 'hangup' : 'decline';
}

const isSdp = (value: unknown): value is string => typeof value === 'string' && value.startsWith('v=0') && value.length <= 20_000;
/** Whether their app takes a new description of the call (m.call.negotiate): one of version 1. */
const negotiates = (content: Json): { reoffer?: true } => (String(content.version) === VERSION ? { reoffer: true } : {});

/** The homeserver's TURN server (/voip/turnServer), when it has one. */
async function homeserverTurn(state: MatrixState): Promise<CallRelay | null> {
  const turn = await ask(state, 'GET', '/voip/turnServer');
  const urls = Array.isArray(turn.uris) ? turn.uris.filter((u): u is string => typeof u === 'string' && /^turns?:/.test(u)).slice(0, 8) : [];
  if (!urls.length || typeof turn.username !== 'string' || typeof turn.password !== 'string') return null;
  return { urls, username: turn.username, credential: turn.password };
}

function send(place: boolean, roomId: string, type: string, content: Json): Promise<void> {
  const account = accountOf(place);
  if (!account) return Promise.reject(new Error(t('There is no Matrix account in this space.')));
  return account.change(async (state) => {
    await sendEvent(state, roomId, type, { version: VERSION, ...content });
  });
}

function callsOf(place: boolean): CallPlace {
  return {
    async send(roomId, signal) {
      const s = sessions.get(signal.id);
      switch (signal.kind) {
        case 'offer': {
          const state = accountOf(place)?.now();
          const invitee = state ? otherIn(state, roomId) : null;
          if (!invitee) throw new Error(t('A call like this is only with one person.'));
          const party = toHex(randomBytes(8));
          sessions.set(signal.id, { id: signal.id, roomId, outgoing: true, video: signal.video, party, ...(place ? { place: true as const } : {}) });
          await send(place, roomId, 'm.call.invite', { call_id: signal.id, party_id: party, lifetime: LIFETIME, invitee, offer: { type: 'offer', sdp: signal.sdp } });
          return;
        }
        case 'ringing':
          // These calls say nothing while they ring.
          return;
        case 'answer':
          if (!s) throw new Error(t('The call ended.'));
          s.answered = true;
          await send(place, s.roomId, 'm.call.answer', { call_id: s.id, party_id: s.party, answer: { type: 'answer', sdp: signal.sdp } });
          return;
        case 'end': {
          if (!s) return;
          sessions.delete(s.id);
          if (!s.outgoing && !s.answered && signal.reason !== 'busy') await send(place, s.roomId, 'm.call.reject', { call_id: s.id, party_id: s.party }).catch(() => undefined);
          else await send(place, s.roomId, 'm.call.hangup', { call_id: s.id, party_id: s.party, reason: hangupReason(signal.reason, s.outgoing, !!s.answered || !!s.theirs) }).catch(() => undefined);
          return;
        }
      }
    },

    async callRelay() {
      const ours = await spaceCalls.callRelay().catch(() => null);
      if (ours) return ours;
      const account = accountOf(place);
      return account ? account.read((state) => homeserverTurn(state)).catch(() => null) : null;
    },

    line(peer, mine, text, id) {
      const roomId = roomOfPeer(peer);
      void accountOf(place)
        ?.change(async (state) => addMatrixCallLine(state, roomId, mine, `${CALL_LINE}${text}`, `voip-${id}`))
        .catch(() => undefined);
    },

    name(peer) {
      const roomId = roomOfPeer(peer);
      const room = accountOf(place)?.now()?.rooms[roomId];
      return (room && shownRoomName(room)) || roomId;
    },

    // Our new description of the call, and their app's answer to it.
    async addMedia(roomId, id, sdp) {
      const s = sessions.get(id);
      if (!s || s.roomId !== roomId || !s.theirs || s.adding) throw new Error(t('The call ended.'));
      const came = new Promise<string | null>((resolve) => (s.adding = resolve));
      const timer = setTimeout(() => s.adding?.(null), NEGOTIATE_MS);
      try {
        await send(place, roomId, 'm.call.negotiate', { call_id: id, party_id: s.party, lifetime: NEGOTIATE_MS, description: { type: 'offer', sdp } });
        const answer = await came;
        if (!answer) throw new Error('No answer came.');
        return answer;
      } finally {
        clearTimeout(timer);
        s.adding = undefined;
      }
    },

    // Our answer to theirs. These calls have no no: one not taken is left unanswered.
    async answerMedia(roomId, id, sdp) {
      const s = sessions.get(id);
      if (!s || s.roomId !== roomId || sdp === null) return;
      await send(place, roomId, 'm.call.negotiate', { call_id: id, party_id: s.party, lifetime: NEGOTIATE_MS, description: { type: 'answer', sdp } });
    },
  };
}

/** The calls of the space's Matrix account, and of the open hidden place's own. */
export const matrixVoip: CallPlace = callsOf(false);
export const matrixPlaceVoip: CallPlace = callsOf(true);

/** Calls the other one of a room of two, as FluffyChat does. Throws when it is not one, or a call is going on. */
export async function startMatrixVoip(roomId: string, video: boolean, rtc: Rtc, place = false): Promise<Call> {
  const state = accountOf(place)?.now();
  if (!state || !otherIn(state, roomId)) throw new Error(t('A call like this is only with one person.'));
  const calls = place ? matrixPlaceVoip : matrixVoip;
  const relay = await calls.callRelay();
  return startCall(calls, `${MATRIX_VOIP_PREFIX}${roomId}`, video, relay, rtc);
}

/** Whether the room is one such a call can be made in: of two, us and one other. */
export function canMatrixVoip(state: MatrixState, roomId: string): boolean {
  return otherIn(state, roomId) !== null;
}

// What comes for these calls, as sync brings it.
async function onEvent(state: MatrixState, event: CallEvent): Promise<boolean> {
  const place = placeOf(state);
  const content = event.content;
  const id = typeof content.call_id === 'string' ? content.call_id.slice(0, 100) : '';
  const roomId = event.roomId;
  if (!id || !roomId || event.encrypted !== undefined) return false;
  const room = state.rooms[roomId];
  // Unencrypted where the room is encrypted: not from whoever writes there.
  if (!room || (room.encrypted && !event.sealed)) return false;
  const party = typeof content.party_id === 'string' ? content.party_id : '';
  const s = sessions.get(id);
  const kind = (video: boolean) => (video ? 'video call' : 'voice call');
  if (event.sender === state.userId) {
    // Another device of ours answered or turned down the call that rings here.
    if (s && !s.outgoing && party !== s.party && (event.type === 'm.call.answer' || event.type === 'm.call.reject')) {
      sessions.delete(id);
      calling(id)?.endedElsewhere(event.type === 'm.call.reject');
      return true;
    }
    return false;
  }
  switch (event.type) {
    case 'm.call.invite': {
      const offer = (content.offer as Json | undefined)?.sdp;
      if (s || !isSdp(offer) || otherIn(state, roomId) !== event.sender) return false;
      if (typeof content.invitee === 'string' && content.invitee !== state.userId) return false;
      const video = /^m=video /m.test(offer);
      const lifetime = typeof content.lifetime === 'number' && content.lifetime > 0 ? Math.min(content.lifetime, 120_000) : LIFETIME;
      const age = event.age ?? Math.max(0, Date.now() - event.ts);
      // Old, as a first sync brings it, or to a hidden place now closed: missed. Inside the sync's
      // change of the account, so kept in it at once.
      if (age > lifetime || place === null || !rtcNow) {
        if (age < 24 * 3600_000) addMatrixCallLine(state, roomId, false, `${CALL_LINE}Missed ${kind(video)}`, `voip-${id}`, event.ts);
        return age < 24 * 3600_000;
      }
      const ours: Session = { id, roomId, outgoing: false, video, party: toHex(randomBytes(8)), theirs: party, ...(place ? { place: true as const } : {}) };
      sessions.set(id, ours);
      const stamp = callNow() - age;
      void callSignal(place ? matrixPlaceVoip : matrixVoip, `${MATRIX_VOIP_PREFIX}${roomId}`, { id, kind: 'offer', video, sdp: offer, at: stamp, ...negotiates(content) }, false, rtcNow)
        .then(() => {
          const call = calling(id);
          if (!call) sessions.delete(id);
          else if (ours.early?.length) call.addCandidates(ours.early.splice(0));
        })
        .catch(() => sessions.delete(id));
      return true;
    }
    case 'm.call.candidates': {
      if (!s || (s.theirs && party && party !== s.theirs)) return false;
      const candidates = (Array.isArray(content.candidates) ? (content.candidates as Json[]) : [])
        .filter((c) => typeof c?.candidate === 'string' && c.candidate.length < 1000 && c.candidate.length > 0)
        .slice(0, 50)
        .map((c) => ({ candidate: String(c.candidate), sdpMid: typeof c.sdpMid === 'string' ? c.sdpMid : '0' }));
      const call = calling(id);
      if (call) call.addCandidates(candidates);
      else (s.early ??= []).push(...candidates);
      return false;
    }
    case 'm.call.answer': {
      const answer = (content.answer as Json | undefined)?.sdp;
      if (!s?.outgoing || s.theirs || !isSdp(answer)) return false;
      s.theirs = party;
      // The first device of theirs to answer is the one, as their others hear. Sent after the sync's
      // change of the account, which this runs inside.
      void send(!!s.place, roomId, 'm.call.select_answer', { call_id: id, party_id: s.party, selected_party_id: party }).catch(() => undefined);
      calling(id)?.receive({ id, kind: 'answer', sdp: answer, ...negotiates(content) });
      if (s.early?.length) calling(id)?.addCandidates(s.early.splice(0));
      return false;
    }
    case 'm.call.negotiate': {
      // A new description of the call, from their device in it.
      if (!s?.theirs || (party && party !== s.theirs)) return false;
      const description = content.description as Json | undefined;
      const sdp = description?.sdp;
      if (!isSdp(sdp)) return false;
      if (description?.type === 'answer') {
        s.adding?.(sdp);
        return false;
      }
      if (description?.type !== 'offer') return false;
      // Both at once: as Matrix's apps settle it, the caller's goes on, and the one called takes it.
      if (s.adding) {
        if (s.outgoing) return false;
        s.adding(null);
      }
      takeTheirs(id, sdp);
      return false;
    }
    case 'm.call.select_answer': {
      // Their pick: another device's answer of ours, or none of ours, ends it here.
      if (!s || s.outgoing || content.selected_party_id === s.party) return false;
      sessions.delete(id);
      calling(id)?.endedElsewhere(false);
      return true;
    }
    case 'm.call.hangup':
    case 'm.call.reject': {
      if (!s || (s.theirs && party && party !== s.theirs && s.answered)) return false;
      sessions.delete(id);
      const call = calling(id);
      if (call) call.receive({ id, kind: 'end', reason: endOf(event.type, content.reason, !!call.connectedAt) });
      return true;
    }
  }
  return false;
}

// Their new description, taken at once once ours, if one was waiting, is taken back.
function takeTheirs(id: string, sdp: string, tries = 30): void {
  const call = calling(id);
  if (!call) return;
  if (call.addingVideo && tries > 0) setTimeout(() => takeTheirs(id, sdp, tries - 1), 100);
  else call.videoAsked(sdp, false);
}

/** Hears these calls for the space's account and the open hidden place's. Returns how to stop. */
export function watchMatrixVoip(rtc: Rtc, given: VoipAccounts): () => void {
  rtcNow = rtc;
  accounts = given;
  setLegacyCallHandler(onEvent);
  return () => {
    setLegacyCallHandler(null);
    const shown = shownCall();
    if (shown && (shown.place === matrixVoip || shown.place === matrixPlaceVoip)) shown.call.hangUp();
    sessions.clear();
    accounts = null;
    rtcNow = null;
  };
}

/** For the checks: what takes these calls' events, while they are watched. */
export const matrixVoipEvent = (state: MatrixState, event: CallEvent): Promise<boolean> => onEvent(state, event);

/** For the checks: how many calls are going on. */
export function matrixVoipSessions(): number {
  return sessions.size;
}
