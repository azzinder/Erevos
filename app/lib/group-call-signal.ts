import { isCallId, MAX_SDP } from './call-signal';

// What phones say to each other about a group's voice call (lib/group-call.ts), inside the group's
// own end-to-end encrypted messages (lib/groups.ts). A group call is a WebRTC connection between
// each two members in it, as a call with a contact is (lib/call-signal.ts): the one already in the
// call offers to the one joining, and the session descriptions carry the fingerprint of the key
// that encrypts each connection, sealed in the group's encryption.
//
// `start`, `join`, `here` and `leave` go to every member; `offer` and `answer` only to the member
// named in `to`, and are dropped by any other.

export type GroupCallSignal =
  // Someone started a call: it rings. `at`: when, milliseconds, so a phone that only sees it later does not ring.
  | { id: string; kind: 'start'; at: number }
  // Someone is in the call now: those already in it offer to them.
  | { id: string; kind: 'join' }
  // Still in the call: said now and then, so a call whose last member's phone went quiet stops showing.
  | { id: string; kind: 'here' }
  | { id: string; kind: 'leave' }
  // `to`: the identity of the member it is for, hex.
  | { id: string; kind: 'offer'; to: string; sdp: string }
  | { id: string; kind: 'answer'; to: string; sdp: string };

const isIdentity = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{64}$/.test(value);
const isSdp = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0 && value.length <= MAX_SDP && value.startsWith('v=0');

/** A group call signal from a group message, or null when it is not one. */
export function decodeGroupCall(value: unknown): GroupCallSignal | null {
  const v = value as Record<string, unknown> | null;
  if (!v || !isCallId(v.id)) return null;
  const id = v.id;
  switch (v.kind) {
    case 'start':
      return typeof v.at === 'number' && Number.isFinite(v.at) && v.at > 0 ? { id, kind: 'start', at: v.at } : null;
    case 'join':
    case 'here':
    case 'leave':
      return { id, kind: v.kind };
    case 'offer':
    case 'answer':
      return isIdentity(v.to) && isSdp(v.sdp) ? { id, kind: v.kind, to: v.to, sdp: v.sdp } : null;
    default:
      return null;
  }
}
