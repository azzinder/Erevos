import { Call, currentCall, OFFER_FRESH_MS, offerMissed, relayToAnswer, type Rtc } from './call';
import type { CallSignal } from './call-signal';
import { currentGroupCall } from './group-call';
import type { CallRelay } from './relay';
import { newTag, type Message } from '../lock/history';
import { t } from './i18n';

// The call on this phone, whatever screen shows: the chat starts it, and a contact's call rings
// from the chat or from the receiver beside the other screens (lib/receiver.ts), so it rings
// anywhere in the open space. The call screen at the app's root (components/call-host.tsx) shows
// it. Each call keeps where it belongs (CallPlace): the space's chats, or the hidden chats while
// they are open; its signals go through that chat's encryption, and its line is kept there.

export const CONTACT_PREFIX = 'contact:';
/** The start of a call's line in the chat. */
export const CALL_LINE = '📞 ';

/** Where a call belongs: how it reaches the contact, and where its line is kept. */
export type CallPlace = {
  /** Sends a call signal to the contact, end-to-end encrypted. Rejects if the relay did not take it. */
  send(identity: string, signal: CallSignal): Promise<void>;
  /** The call relay beside our relay, or null if it has none. */
  callRelay(): Promise<CallRelay | null>;
  /** Keeps the call's line in the chat. */
  line(peer: string, mine: boolean, text: string): void;
  /** The contact's name as the chat shows it. */
  name(peer: string): string;
};

let shown: { call: Call; place: CallPlace } | null = null;
const listeners = new Set<() => void>();
// A contact's hang-up of a call that has no Call here yet, by peer and call id, with when it came: the
// offer and the `end` came in one look, and the offer still waits for the call relay (callSignal) when
// the `end` is read, which would be dropped, and the phone would ring 45 seconds for a call nobody is on.
const endedBefore = new Map<string, number>();
const ENDED_KEPT_MS = 2 * OFFER_FRESH_MS;
const callKey = (peer: string, id: string) => `${peer} ${id}`;

// Whether the contact hung up the call `id` before its offer was read here; forgotten once asked.
function endedAlready(peer: string, id: string): boolean {
  const now = Date.now();
  for (const [key, at] of endedBefore) if (now - at > ENDED_KEPT_MS) endedBefore.delete(key);
  return endedBefore.delete(callKey(peer, id));
}
// Whether another device of the account has a call, but the one `id` names (lib/devices.ts): to a contact who calls, the account is in one.
let elsewhere: (id?: string) => boolean = () => false;

/** How to know whether another device of the account has a call. */
export function callsElsewhere(busy: (id?: string) => boolean): void {
  elsewhere = busy;
}

function changed() {
  listeners.forEach((listener) => listener());
}

/** The call to show, until its screen closes: it stays a moment after it ends. */
export function shownCall(): { call: Call; place: CallPlace } | null {
  return shown;
}

/** Calls `listener` each time the call, or anything about it, changes. Returns how to stop. */
export function onCallChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The screen of an ended call closed. */
export function closeCall(call: Call): void {
  if (shown?.call !== call) return;
  shown = null;
  changed();
}

/** What the line in the chat says about a call that ended. */
export function endedLine(ended: Call, now = Date.now()): string {
  const kind = ended.video ? 'Video call' : 'Voice call';
  const reason = ended.ended?.reason;
  if (ended.connectedAt) return `${kind}, ${callClock(now - ended.connectedAt)}`;
  if (ended.ended?.elsewhere) return reason === 'decline' ? `${kind}, turned down` : `${kind}, answered on another device`;
  if (reason === 'decline') return `${kind}, turned down`;
  if (reason === 'failed') return `${kind}, could not connect`;
  if (ended.outgoing) return reason === 'busy' ? `${kind}, they were in another call` : `${kind}, not answered`;
  return `Missed ${kind.toLowerCase()}`;
}

function events(place: CallPlace, identity: string) {
  return {
    send: (signal: CallSignal) => place.send(identity, signal),
    onChange: (call: Call) => {
      if (call.state === 'ended' && shown?.call === call) place.line(call.peer, call.outgoing, endedLine(call));
      changed();
    },
  };
}

/** Calls a contact. Throws if a call is already in progress. */
export function startCall(place: CallPlace, peer: string, video: boolean, relay: CallRelay | null, rtc: Rtc): Call {
  if (currentGroupCall() || elsewhere()) throw new Error(t('There is a call already.'));
  const call = Call.start({ peer, video, relay, rtc, events: events(place, peer.slice(CONTACT_PREFIX.length)) });
  shown = { call, place };
  changed();
  return call;
}

/**
 * A call signal from a contact: a call that rings here, or news of ours. `request`: they are a
 * message request, which hears nothing back, so it does not ring either. Says what to tell the
 * user, if anything.
 */
export async function callSignal(place: CallPlace, peer: string, signal: CallSignal, request: boolean, rtc: Rtc): Promise<string | null> {
  const ours = currentCall();
  if (signal.kind !== 'offer') {
    if (ours?.peer === peer && ours.id === signal.id) ours.receive(signal);
    // Their hang-up read before its offer rang here: the offer is not rung.
    else if (signal.kind === 'end') endedBefore.set(callKey(peer, signal.id), Date.now());
    return null;
  }
  if (ours?.id === signal.id) return null;
  const kind = signal.video ? 'video call' : 'voice call';
  if (request) return t('{name} tried to call. Accept their message request to take calls from them.', { name: place.name(peer) });
  // Made while no space was open here: it has stopped ringing on their side. Or hung up already.
  if (offerMissed(signal.at) || endedAlready(peer, signal.id)) {
    place.line(peer, false, `Missed ${kind}`);
    return null;
  }
  const identity = peer.slice(CONTACT_PREFIX.length);
  if (ours || currentGroupCall() || elsewhere(signal.id)) {
    place.send(identity, { id: signal.id, kind: 'end', reason: 'busy' }).catch(() => undefined);
    place.line(peer, false, `Missed ${kind}, while in another call`);
    return null;
  }
  const relay = relayToAnswer(signal.sdp, await place.callRelay().catch(() => null));
  // They hung up while the call relay was asked.
  if (endedAlready(peer, signal.id)) {
    place.line(peer, false, `Missed ${kind}`);
    return null;
  }
  const ringing = Call.incoming(signal, { peer, relay, rtc, events: events(place, identity) });
  if (!ringing) return null;
  shown = { call: ringing, place };
  changed();
  return null;
}

/** Ends the call if it belongs to `place`, as when hidden chats close. */
export function endCallsOf(place: CallPlace): void {
  if (shown?.place === place) shown.call.hangUp();
}

/** Ends any call, as when the space closes. */
export function endCall(): void {
  shown?.call.hangUp();
}

/** How long a call has lasted: 0:42, 12:05, 1:02:09. */
export function callClock(ms: number): string {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const two = (n: number) => String(n).padStart(2, '0');
  return hours ? `${hours}:${two(minutes % 60)}:${two(seconds % 60)}` : `${minutes}:${two(seconds % 60)}`;
}

/** A call's line as the chat keeps it: no marks, and it disappears with the chat's timer. */
export function callLineMessage(peer: string, mine: boolean, text: string, timer: number, at = Date.now()): Message {
  return { peer, text: `${CALL_LINE}${text}`, mine, at, tag: newTag(), until: timer ? at + timer * 1000 : 0, lasts: 0, mark: 2 };
}
