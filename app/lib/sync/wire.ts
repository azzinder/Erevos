// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { answer, isOp, isVector, isWhole, lackOf, MAX_BATCH, take, takeWhole, whole, type Answer, type Log, type Op, type Whole } from './log';

// What the account's devices say to each other of their log (lib/sync/log.ts, docs/sync.md), the
// way Briar's sync does: each says how far it has every device's ops (`have`); the other gives what
// it lacks (`ops`), or the whole log when it lacks ops no longer kept (`whole`). A device that
// changed something gives each other device what it has not given it yet, at once. Nothing thanks
// for ops taken: now and then (`asking`) a device asks one that may lack its ops how far it is
// (`ask`), and that one says it; so two devices that have all of each other's ops say nothing. Nothing here says which way it goes: the
// devices' own conversations carry it, sealed end to end (lib/siblings.ts, the phone's links), over
// the relay, nearby or whatever reaches the other, and a space and each hidden place each have their
// own log, said in their own links only. Self-contained, so it runs under plain Node for checks.

export type Said =
  | { k: 'have'; vv: Record<string, number>; ask?: true }
  | { k: 'ops'; ops: Op[]; more?: true }
  | ({ k: 'whole' } & Whole);

/** What was said, checked in full, or null for anything else. */
export function readSaid(x: unknown): Said | null {
  if (typeof x !== 'object' || x === null) return null;
  const m = x as Record<string, unknown>;
  const keys = Object.keys(m).sort().join();
  if (m.k === 'have') {
    if (!isVector(m.vv)) return null;
    if (keys === 'k,vv') return { k: 'have', vv: m.vv };
    return keys === 'ask,k,vv' && m.ask === true ? { k: 'have', vv: m.vv, ask: true } : null;
  }
  if (m.k === 'ops') {
    if (!Array.isArray(m.ops) || m.ops.length > MAX_BATCH || !m.ops.every(isOp)) return null;
    if (keys === 'k,ops') return { k: 'ops', ops: m.ops };
    return keys === 'k,more,ops' && m.more === true ? { k: 'ops', ops: m.ops, more: true } : null;
  }
  if (m.k === 'whole') {
    const w = { vv: m.vv, data: m.data };
    return keys === 'data,k,vv' && isWhole(w) ? { k: 'whole', ...w } : null;
  }
  return null;
}

/** How far this device is; with `ask`, asking the other to say how far it is too. */
export function have(log: Log, ask = false): Said {
  return ask ? { k: 'have', vv: { ...log.vv }, ask: true } : { k: 'have', vv: { ...log.vv } };
}

/** Whether `theirs` has an op that `log` lacks: never one of its own, which it alone makes. */
function ahead(theirs: Record<string, number>, log: Log): boolean {
  return Object.entries(theirs).some(([d, n]) => d !== log.me && n > (log.vv[d] ?? 0));
}

/** What a log's Answer says, as said. */
function said(log: Log, a: Answer): Said[] {
  if ('whole' in a) return [{ k: 'whole', ...whole(log) }];
  if (a.ops.length === 0) return [];
  return [a.more ? { k: 'ops', ops: a.ops, more: true } : { k: 'ops', ops: a.ops }];
}

/** The later of each device's number in two vectors. */
export function upTo(a: Record<string, number> | undefined, b: Record<string, number> | undefined): Record<string, number> {
  const out: Record<string, number> = { ...(a ?? {}) };
  for (const [d, n] of Object.entries(b ?? {})) out[d] = Math.max(out[d] ?? 0, n);
  return out;
}

/**
 * What to give `peer` now, after a change here: what it lacks beyond what it said it has and what
 * was given it since (`given`). Nothing when it lacks nothing.
 */
export function push(log: Log, peer: string, given?: Record<string, number>): Said[] {
  // Its own ops it has, whatever this one knows of it: only what it says itself tells it was put back.
  const theirs = upTo(log.seen[peer], given);
  theirs[peer] = Math.max(theirs[peer] ?? 0, log.vv[peer] ?? 0);
  return said(log, lackOf(log, peer, theirs));
}

/** Whether `peer` may lack ops this device has (not its own): what it said it has is behind, or it said nothing. */
export function asking(log: Log, peer: string): boolean {
  const theirs = log.seen[peer] ?? {};
  return Object.entries(log.vv).some(([d, n]) => d !== peer && n > (theirs[d] ?? 0));
}

/** What hearing something did: what to say back, the ops taken, whether a whole log was taken. */
export type Heard = { back: Said[]; took: Op[]; whole: boolean };

/**
 * What this device says back to what `from`, another of the account's devices, said, and what it
 * took of it: nothing to say when there is nothing more to say.
 */
export function hear(log: Log, from: string, x: unknown, now: number): Heard {
  const none: Heard = { back: [], took: [], whole: false };
  const m = readSaid(x);
  if (m === null || from === log.me || !log.peers.includes(from)) return none;
  if (m.k === 'have') {
    const back = said(log, answer(log, from, m.vv));
    if (m.ask || ahead(m.vv, log)) back.push(have(log));
    return { ...none, back };
  }
  if (m.k === 'ops') {
    const { taken } = take(log, m.ops, now);
    return { back: m.more ? [have(log)] : [], took: taken, whole: false };
  }
  return takeWhole(log, from, { vv: m.vv, data: m.data }, now) ? { back: [have(log)], took: [], whole: true } : none;
}

/** What to say back to what `from` said, as `hear` says. */
export function heard(log: Log, from: string, x: unknown, now: number): Said[] {
  return hear(log, from, x, now).back;
}
