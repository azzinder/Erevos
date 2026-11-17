// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// How a call connects, as WebRTC measures it (lib/call.ts Call.stats): shown on the call screen
// only when it is held down (components/call-screen.tsx), to find why its sound has gaps. Of their
// sound: how much was lost on the way, and how much the phone had to fill in itself, which is
// what is heard as a gap; how unevenly it comes (jitter), and the time there and back. Each is of
// the last moments (since the reading before), not of the whole call, so a gap shows as it happens.
// Also the way the call goes (through the call relay or direct, over UDP or TCP, on Wi-Fi or
// mobile data) and how long it took to ring and to connect. Nothing of it leaves the phone.

/** The counts of their sound as last read, to measure the next moments from. */
export type SoundTotals = { lost: number; received: number; concealed: number; samples: number };

export type Quality = {
  /** Of their sound packets since the reading before, the share lost, percent; null before any came. */
  lost: number | null;
  /** Of their sound since the reading before, the share the phone filled in, percent: the gaps heard. */
  filled: number | null;
  /** How unevenly their sound comes, and the time there and back, milliseconds; null when not known. */
  jitter: number | null;
  rtt: number | null;
  /** The way it goes: 'relay udp cellular', say; '' when not known. */
  way: string;
  /** The counts read, for the next reading. */
  totals: SoundTotals | null;
};

/** A moment counts as one with a gap when more than this share of it was filled in, percent. */
export const GAP_FILLED = 2;

type Stat = Record<string, unknown>;
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const share = (part: number, whole: number): number | null => (whole > 0 ? Math.round((part / whole) * 1000) / 10 : null);

/** What `report` (Call.stats) says of the call since `before`, the totals of the reading before. */
export function readQuality(report: { forEach(each: (value: unknown) => void): void }, before: SoundTotals | null): Quality {
  const all: Stat[] = [];
  report.forEach((value) => {
    if (value && typeof value === 'object') all.push(value as Stat);
  });
  const byId = new Map(all.map((s) => [str(s.id), s]));
  const audio = all.find((s) => s.type === 'inbound-rtp' && (s.kind === 'audio' || s.mediaType === 'audio'));
  // Older WebRTC says what was filled in on the track's stats, not the inbound one's.
  const track = all.find((s) => s.type === 'track' && s.kind === 'audio' && s.remoteSource === true);
  let totals: SoundTotals | null = null;
  let lost: number | null = null;
  let filled: number | null = null;
  if (audio) {
    totals = {
      lost: num(audio.packetsLost) ?? 0,
      received: num(audio.packetsReceived) ?? 0,
      concealed: num(audio.concealedSamples) ?? num(track?.concealedSamples) ?? 0,
      samples: num(audio.totalSamplesReceived) ?? num(track?.totalSamplesReceived) ?? 0,
    };
    const from = before ?? { lost: 0, received: 0, concealed: 0, samples: 0 };
    const gone = Math.max(0, totals.lost - from.lost);
    lost = share(gone, gone + Math.max(0, totals.received - from.received));
    filled = share(Math.max(0, totals.concealed - from.concealed), Math.max(0, totals.samples - from.samples));
  }
  const jitter = num(audio?.jitter);
  // The pair of addresses the call goes on: the one the transport names, else the one chosen.
  const transport = all.find((s) => s.type === 'transport' && str(s.selectedCandidatePairId));
  const pair =
    (transport && byId.get(str(transport.selectedCandidatePairId))) ??
    all.find((s) => s.type === 'candidate-pair' && (s.selected === true || (s.nominated === true && s.state === 'succeeded')));
  const rtt = num(pair?.currentRoundTripTime);
  const local = pair ? byId.get(str(pair.localCandidateId)) : undefined;
  const way = local ? [str(local.candidateType), str(local.relayProtocol) || str(local.protocol), str(local.networkType)].filter(Boolean).join(' ') : '';
  return {
    lost,
    filled,
    jitter: jitter === null ? null : Math.round(jitter * 1000),
    rtt: rtt === null ? null : Math.round(rtt * 1000),
    way,
    totals,
  };
}

/** Seconds from `from` to `to`, to a tenth; null when either is not known. */
export function secondsBetween(from: number, to: number): number | null {
  return from > 0 && to >= from ? Math.round((to - from) / 100) / 10 : null;
}
