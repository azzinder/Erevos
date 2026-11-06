// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// What two phones say to each other to set up a call, inside end-to-end encrypted messages
// (lib/e2e.ts). A call is a WebRTC connection (lib/call.ts). The offer and the answer carry each
// side's session description: the codecs, the addresses to try, which go through a call relay
// when there is one, and the fingerprint of the key that encrypts the call (DTLS-SRTP). Since
// that fingerprint comes sealed in the chat's end-to-end encryption, no one in between, the call
// relay included, can put their own key in its place and listen in.
//
// The descriptions hold every address to try (no trickling one at a time): the relay is only
// looked at every few seconds, so one message each way is quicker than many.

/**
 * Why a call ended: hung up, turned down, already in another call, not answered, or it could not
 * connect; or, from the caller to the other devices of the account it called, answered on another
 * of them (`taken`, docs/multi-device.md, Calls).
 */
export type CallEnd = 'hangup' | 'decline' | 'busy' | 'missed' | 'failed' | 'taken';

export type CallSignal =
  // `at`: when the call was made, milliseconds, so a phone that only sees it later does not ring.
  | { id: string; kind: 'offer'; video: boolean; sdp: string; at: number }
  | { id: string; kind: 'answer'; sdp: string }
  // Ringing on their phone now: the caller hears it ring rather than wait in silence.
  | { id: string; kind: 'ringing' }
  // `by`: from the caller, which device of the account called answered (`taken`) or turned it down:
  // its endpoint (hex), or '' for the account itself. The others stop ringing; that one goes on.
  | { id: string; kind: 'end'; reason: CallEnd; by?: string };

/** Longest session description sent: it must fit in one message with room to spare. */
export const MAX_SDP = 12_000;

const ENDS: CallEnd[] = ['hangup', 'decline', 'busy', 'missed', 'failed', 'taken'];
const isBy = (v: unknown): v is string => typeof v === 'string' && (v === '' || /^[0-9a-f]{64}$/.test(v));

export function isCallId(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{16}$/.test(value);
}

const isSdp = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0 && value.length <= MAX_SDP && value.startsWith('v=0');

/** A call signal from an opened message, or null when it is not one. */
export function decodeCall(value: unknown): CallSignal | null {
  const v = value as Record<string, unknown> | null;
  if (!v || !isCallId(v.id)) return null;
  const id = v.id;
  switch (v.kind) {
    case 'offer':
      return isSdp(v.sdp) && typeof v.at === 'number' && Number.isFinite(v.at) && v.at > 0
        ? { id, kind: 'offer', video: v.video === true, sdp: v.sdp, at: v.at }
        : null;
    case 'answer':
      return isSdp(v.sdp) ? { id, kind: 'answer', sdp: v.sdp } : null;
    case 'ringing':
      return { id, kind: 'ringing' };
    case 'end':
      if (!ENDS.includes(v.reason as CallEnd)) return null;
      // One answered elsewhere says where; without it, it says nothing.
      if (v.reason === 'taken' && !isBy(v.by)) return null;
      return { id, kind: 'end', reason: v.reason as CallEnd, ...(isBy(v.by) ? { by: v.by } : {}) };
    default:
      return null;
  }
}
