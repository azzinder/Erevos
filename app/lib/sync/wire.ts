// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { answer, isOp, isVector, isWhole, MAX_BATCH, take, takeWhole, whole, type Log, type Op, type Whole } from './log';

// What the account's devices say to each other of their log (lib/sync/log.ts, docs/sync.md), the
// way Briar's sync does: each says how far it has every device's ops (`have`); the other gives what
// it lacks (`ops`), or the whole log when it lacks ops no longer kept (`whole`), and says `have`
// again once it took them, which is also its thanks. Nothing here says which way it goes: the
// devices' own conversations carry it, sealed end to end (lib/siblings.ts, the phone's links), over
// the relay, nearby or whatever reaches the other, and a space and each hidden place each have their
// own log, said in their own links only. Self-contained, so it runs under plain Node for checks.

export type Said =
  | { k: 'have'; vv: Record<string, number> }
  | { k: 'ops'; ops: Op[]; more?: true }
  | ({ k: 'whole' } & Whole);

/** What was said, checked in full, or null for anything else. */
export function readSaid(x: unknown): Said | null {
  if (typeof x !== 'object' || x === null) return null;
  const m = x as Record<string, unknown>;
  const keys = Object.keys(m).sort().join();
  if (m.k === 'have') return keys === 'k,vv' && isVector(m.vv) ? { k: 'have', vv: m.vv } : null;
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

/** What to say first, and whenever this device changed something or a link comes up. */
export function have(log: Log): Said {
  return { k: 'have', vv: { ...log.vv } };
}

/** Whether `theirs` has an op that `log` lacks: never one of its own, which it alone makes. */
function ahead(theirs: Record<string, number>, log: Log): boolean {
  return Object.entries(theirs).some(([d, n]) => d !== log.me && n > (log.vv[d] ?? 0));
}

/**
 * What this device says back to what `from`, another of the account's devices, said: nothing when
 * there is nothing more to say, so two devices that have the same stop there.
 */
export function heard(log: Log, from: string, x: unknown, now: number): Said[] {
  const said = readSaid(x);
  if (said === null || from === log.me || !log.peers.includes(from)) return [];
  if (said.k === 'have') {
    const out: Said[] = [];
    const a = answer(log, from, said.vv);
    if ('whole' in a) out.push({ k: 'whole', ...whole(log) });
    else if (a.ops.length > 0) out.push(a.more ? { k: 'ops', ops: a.ops, more: true } : { k: 'ops', ops: a.ops });
    if (ahead(said.vv, log)) out.push(have(log));
    return out;
  }
  if (said.k === 'ops') {
    take(log, said.ops, now);
    return [have(log)];
  }
  return takeWhole(log, from, { vv: said.vv, data: said.data }) ? [have(log)] : [];
}
