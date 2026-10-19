import { currentCall, OFFER_FRESH_MS, type Rtc } from './call';
import { callClock, CALL_LINE } from './calls';
import { GroupCall, currentGroupCall, HERE_EVERY } from './group-call';
import type { GroupCallSignal } from './group-call-signal';
import type { CallRelay } from './relay';
import { t } from './i18n';

// The group call on this phone, whatever screen shows (as lib/calls.ts is for a contact's call),
// and the calls going on in this phone's groups, as their members say, so a group's screen can
// offer to join one. The call screen at the app's root (components/call-host.tsx) shows it.

/** Where a group call belongs: how it reaches the group, and where its line is kept. */
export type GroupCallPlace = {
  /** Says something about a call to the group. Rejects if it could not be sent. */
  send(group: string, signal: GroupCallSignal): Promise<void>;
  /** The call relay beside our relay, or null if it has none. */
  callRelay(): Promise<CallRelay | null>;
  /** This phone's identity in the group, hex. */
  me(): Promise<string>;
  /** Keeps a line in the group. */
  line(group: string, text: string): void;
};

/** A call going on in a group: its id, who started it, whether it is a video call, and who is in
 *  it, as their phones last said. */
export type GoingOn = { id: string; startedBy: string; video: boolean; people: Map<string, number> };

// A member whose phone said nothing for this long is taken as gone, milliseconds.
const GONE_AFTER = HERE_EVERY * 2.5;

let shown: { call: GroupCall; place: GroupCallPlace } | null = null;
const goingOn = new Map<string, GoingOn>();
const listeners = new Set<() => void>();

function changed() {
  listeners.forEach((listener) => listener());
}

/** Calls `listener` each time the group call, or a call going on in a group, changes. Returns how to stop. */
export function onGroupCallChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The group call to show, until its screen closes. */
export function shownGroupCall(): { call: GroupCall; place: GroupCallPlace } | null {
  return shown;
}

/** The screen of an ended group call closed. */
export function closeGroupCall(call: GroupCall): void {
  if (shown?.call !== call) return;
  shown = null;
  changed();
}

/** The call going on in a group that this phone is not in, if any: who is in it, by identity. */
export function groupCallGoingOn(group: string, now = Date.now()): { id: string; startedBy: string; video: boolean; people: string[] } | null {
  const call = goingOn.get(group);
  if (!call) return null;
  for (const [identity, at] of call.people) if (now - at > GONE_AFTER) call.people.delete(identity);
  if (call.people.size === 0) {
    goingOn.delete(group);
    return null;
  }
  if (currentGroupCall()?.id === call.id) return null;
  return { id: call.id, startedBy: call.startedBy, video: call.video, people: [...call.people.keys()] };
}

/** What the line in the group says about a call that ended. */
export function groupCallLine(call: GroupCall, now = Date.now()): string {
  const kind = call.video ? 'Group video call' : 'Group call';
  if (call.joinedAt) return `${CALL_LINE}${kind}, ${callClock(now - call.joinedAt)}`;
  if (call.ended === 'decline') return `${CALL_LINE}${kind}, turned down`;
  return `${CALL_LINE}Missed ${kind.toLowerCase()}`;
}

function show(call: GroupCall, place: GroupCallPlace) {
  shown = { call, place };
  changed();
}

function events(place: GroupCallPlace, group: string) {
  return {
    send: (signal: GroupCallSignal) => place.send(group, signal),
    onChange: (call: GroupCall) => {
      if (call.state === 'ended' && shown?.call === call && call.ended !== 'failed') place.line(group, groupCallLine(call));
      changed();
    },
  };
}

/** Starts a call in a group. Throws if a call is already in progress, or it could not start. */
export async function startGroupCall(place: GroupCallPlace, group: string, video: boolean, relay: CallRelay | null, rtc: Rtc): Promise<GroupCall> {
  const me = await place.me();
  const call = await GroupCall.start({ group, video, me, relay, rtc, events: events(place, group) });
  show(call, place);
  return call;
}

/** Joins the call going on in a group. */
export async function joinGroupCall(place: GroupCallPlace, group: string, relay: CallRelay | null, rtc: Rtc): Promise<GroupCall> {
  const going = groupCallGoingOn(group);
  if (!going) throw new Error(t('The call has ended.'));
  const me = await place.me();
  const call = await GroupCall.join(going.id, going.startedBy, { group, video: going.video, me, relay, rtc, events: events(place, group) });
  show(call, place);
  return call;
}

/** A member's signal about a call in a group: one that rings here, or news of ours. */
export async function groupCallSignal(place: GroupCallPlace, group: string, from: string, signal: GroupCallSignal, rtc: Rtc): Promise<void> {
  const now = Date.now();
  if (signal.kind === 'start' || signal.kind === 'join' || signal.kind === 'here') {
    let going = goingOn.get(group);
    if (going?.id !== signal.id) {
      // `here` and `join` of a call this phone never heard start: still one going on.
      going = { id: signal.id, startedBy: signal.kind === 'start' ? from : '', video: false, people: new Map() };
      goingOn.set(group, going);
    }
    if (signal.kind !== 'join') going.video = signal.video;
    going.people.set(from, now);
    changed();
  } else if (signal.kind === 'leave') {
    const going = goingOn.get(group);
    if (going?.id === signal.id) {
      going.people.delete(from);
      if (going.people.size === 0) goingOn.delete(group);
      // Rang here, and nobody is in it now.
      const ringing = currentGroupCall();
      if (ringing?.id === signal.id && ringing.state === 'incoming' && !goingOn.has(group)) ringing.missed();
      changed();
    }
  }

  const ours = currentGroupCall();
  if (signal.kind !== 'start') {
    if (ours?.id === signal.id) ours.receive(from, signal);
    return;
  }
  if (ours?.id === signal.id) return;
  const kind = signal.video ? 'group video call' : 'group call';
  if (now - signal.at > OFFER_FRESH_MS) {
    place.line(group, `${CALL_LINE}Missed ${kind}`);
    return;
  }
  // Two started a call in the group at once: the one with the lower id goes on, and the other's
  // phone joins it, if no one is in its own yet.
  if (ours && ours.group === group && ours.state === 'in' && ours.peers().length === 0 && signal.id < ours.id) {
    // Not a call of its own to keep a line of.
    shown = null;
    ours.hangUp();
    const relay = await place.callRelay().catch(() => null);
    const me = await place.me();
    show(await GroupCall.join(signal.id, from, { group, video: signal.video, me, relay, rtc, events: events(place, group) }), place);
    return;
  }
  if (ours || currentCall()) {
    place.line(group, `${CALL_LINE}Missed ${kind}, while in another call`);
    return;
  }
  const relay = await place.callRelay().catch(() => null);
  const me = await place.me();
  const ringing = GroupCall.incoming(signal.id, from, { group, video: signal.video, me, relay, rtc, events: events(place, group) });
  if (ringing) show(ringing, place);
}

/** Ends the group call, as when the space closes, and forgets the calls going on. */
export function endGroupCall(): void {
  shown?.call.hangUp();
  goingOn.clear();
}
