// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { after, isDevice, isStamp, later, saw, takenNow, tick, type Stamp } from './clock';

// The account's log (docs/sync.md): one record of what the account's own devices share, kept the
// same on each of them, for a space or for one hidden place, never both. Each change a device makes
// is one op: a field of a record set (`f`, `v`), a record added (`x: 'add'`) or removed
// (`x: 'del'`), stamped by lib/sync/clock.ts and numbered by its device (`s`, 1, 2, 3, ...). Devices
// tell each other how far they have each device's ops (`vv`, a version vector) and give each other
// what the other lacks (lib/sync/wire.ts); one too far behind for the ops kept takes the whole log
// instead. Whatever order the ops come in, every device ends with the same records:
//
// - a field keeps the value of its latest op (by stamp);
// - a record is there while its latest add is after its latest removal; a removal drops the fields
//   set before it, so a record added again starts empty, and a field set before a removal never
//   brings one back;
// - each record kind says who may write it (KINDS): any of the account's devices, or the primary
//   only (what the account itself decides). An op of a kind its device may not write is passed over
//   by its number, the same on every device, and changes nothing.
//
// What is kept of the ops is only what some device may still ask for: once every device said it has
// an op, it goes (`compact`), and so does a removed record once no op from before its removal can
// still come. A device unlinked is cut off by its links first (nothing it seals is opened any more);
// what the phone passes on of it, stamped after this one knew it left, is refused. Once every device
// has all it wrote, the phone forgets it was ever counted (`prune`), and each device after it, so the
// vectors hold the devices of now and not every one ever linked.
//
// Nothing signs an op: who made it is what the link it came in says. So only the primary passes on
// ops of other devices; a device gives its own alone, and what it gives in another's name, or of a
// kind only the primary writes, is refused (`take`, `takeWhole`). Otherwise one device could write
// as the phone, or take a number of the phone's before the phone's own op of it came.
//
// The functions change the log they are given, and say what changed. Self-contained, so it runs
// under plain Node for checks; lib/sync/store.ts (later) keeps it sealed with the space's key.

export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

/** One change one device made. */
export type Op = {
  /** The device that made it: its endpoint's identity. */
  d: string;
  /** Its number among that device's ops: 1 for the first. */
  s: number;
  at: Stamp;
  /** The kind of record (KINDS) and which one. */
  k: string;
  id: string;
  /** A field set: its name and value (null clears it). */
  f?: string;
  v?: Json;
  /** Or the record added or removed. */
  x?: 'add' | 'del';
};

/** What a change is before it is stamped: one of the three. */
export type Change = { k: string; id: string } & ({ f: string; v: Json } | { x: 'add' | 'del' });

/** A field's value, and when it was set. */
export type Field = { v: Json; at: Stamp };

/** One record: when it was last added and removed, and its fields. */
export type Entry = {
  add?: Stamp;
  del?: Stamp;
  /** The op that removed it last, to know when no op from before can come any more. */
  by?: { d: string; s: number };
  f: Record<string, Field>;
};

/** Who writes a kind of record. */
export type Writer = 'any' | 'primary';

/**
 * The kinds of records, and who writes each. A kind this version does not know (from a newer one)
 * is kept all the same, as any device's, so it survives in this device's log for the devices that
 * know it.
 */
export const KINDS: Record<string, Writer> = {
  // What any device changes (docs/sync.md, S1 and S2).
  contact: 'any',
  blocked: 'any',
  request: 'any',
  note: 'any',
  setting: 'any',
  account: 'any',
  place: 'any',
  collection: 'any',
  // What the account sent for later, held by a relay (S4, lib/sync/later.ts).
  later: 'any',
  // Groups as the device that holds them says they are (S6). Which device that is, the log does
  // not judge: the groups' own keys (MLS) do, and only the holder has them.
  group: 'any',
  // What the account decides: which device holds its groups (field `d` of record `groups`).
  holder: 'primary',
};

export type Log = {
  /** This device, and the account's primary. */
  me: string;
  primary: string;
  /** The latest stamp this device made or took. */
  clock?: Stamp;
  /** How far this device has each device's ops: the highest number with none missing below it. */
  vv: Record<string, number>;
  /** The account's devices now, this one among them. */
  peers: string[];
  /** Devices unlinked, and from when: what they stamped after it is refused. */
  gone: Record<string, Stamp>;
  /** The records, by kind and id. */
  data: Record<string, Record<string, Entry>>;
  /** Ops kept to give other devices, in the order taken. */
  ops: Op[];
  /** Up to which number each device's ops are no longer kept: one behind that takes the whole log. */
  cut: Record<string, number>;
  /** Ops that came before those they follow, or stamped too far ahead, or from a device not listed yet. */
  held: Op[];
  /** What each other device last said it has (its `vv`). */
  seen: Record<string, Record<string, number>>;
};

/** The most ops kept to give other devices; past it, the oldest go and a device behind takes the whole log. */
export const MAX_OPS = 5000;
/** The most ops held. */
export const MAX_HELD = 500;
/** The most ops given at once. */
export const MAX_BATCH = 200;
/** The longest value of a field, as JSON. */
export const MAX_VALUE = 16 * 1024;
/** The most devices a vector said by another device names: those of now, and those gone not yet let go. */
export const MAX_DEVICES = 256;

export function emptyLog(me: string, primary: string): Log {
  const peers = me === primary ? [me] : [primary, me];
  return { me, primary, vv: {}, peers, gone: {}, data: {}, ops: [], cut: {}, held: [], seen: {} };
}

/** Who may write `kind`: a device id, or null for any of the account's devices. */
function writerOf(log: Log, kind: string): string | null {
  return (KINDS[kind] ?? 'any') === 'primary' ? log.primary : null;
}

/** Whether `device` may write `kind`. */
export function mayWrite(log: Log, device: string, kind: string): boolean {
  const w = writerOf(log, kind);
  return w === null || w === device;
}

/** Puts one op into the records. */
function apply(log: Log, op: Op): void {
  const kind = (log.data[op.k] ??= {});
  const e = (kind[op.id] ??= { f: {} });
  if (op.x === 'add') {
    e.add = later(e.add, op.at);
  } else if (op.x === 'del') {
    if (after(op.at, e.del)) {
      e.del = op.at;
      e.by = { d: op.d, s: op.s };
      dropBefore(e);
    }
  } else if (op.f !== undefined) {
    if (e.del !== undefined && !after(op.at, e.del)) return;
    if (after(op.at, e.f[op.f]?.at)) e.f[op.f] = { v: op.v ?? null, at: op.at };
  }
}

/** Drops what a removal covers: the fields set before it. */
function dropBefore(e: Entry): void {
  if (e.del === undefined) return;
  for (const [name, field] of Object.entries(e.f)) if (!after(field.at, e.del)) delete e.f[name];
}

/**
 * Makes a change on this device: stamps it, puts it in the records, keeps it to give the others.
 * Null when this device may not write that kind.
 */
export function change(log: Log, now: number, c: Change): Op | null {
  if (!mayWrite(log, log.me, c.k)) return null;
  const at = tick(log.clock, now, log.me);
  const s = (log.vv[log.me] ?? 0) + 1;
  const op: Op = 'x' in c ? { d: log.me, s, at, k: c.k, id: c.id, x: c.x } : { d: log.me, s, at, k: c.k, id: c.id, f: c.f, v: c.v };
  if (!isOp(op)) throw new Error('not a change the log keeps');
  log.clock = at;
  log.vv[log.me] = s;
  apply(log, op);
  log.ops.push(op);
  trim(log);
  return op;
}

/** What `take` did with ops: how many it took, held and refused. */
export type Taken = { taken: Op[]; held: number; refused: number };

/**
 * What to do with an op from another device: 'take' it, 'old' one it has, 'wait' to hold it, 'no'
 * to refuse it, or 'skip' it: one of a kind its device may not write, passed over by its number.
 */
function judge(log: Log, op: Op, now: number): 'take' | 'old' | 'wait' | 'no' | 'skip' {
  if (op.d === log.me) return 'old';
  const gone = log.gone[op.d];
  if (gone !== undefined && after(op.at, gone)) return 'no';
  if (op.s <= (log.vv[op.d] ?? 0)) return 'old';
  if (gone === undefined && !log.peers.includes(op.d)) return 'wait';
  if (op.s !== (log.vv[op.d] ?? 0) + 1) return 'wait';
  if (!takenNow(op.at, now)) return 'wait';
  if (!mayWrite(log, op.d, op.k)) return 'skip';
  return 'take';
}

/**
 * Takes ops from another device, in any order; those that can follow later are held. From a device
 * other than the primary (`from`), only its own: another's it may not pass on.
 */
export function take(log: Log, ops: unknown[], now: number, from?: string): Taken {
  const out: Taken = { taken: [], held: 0, refused: 0 };
  const queue: Op[] = [];
  for (const o of ops) {
    if (isOp(o) && (from === undefined || from === log.primary || o.d === from)) queue.push(o);
    else out.refused++;
  }
  const waiting = [...log.held, ...queue];
  log.held = [];
  // Taken in each device's order; one taken may let others held go, so round again until none does.
  for (let moved = true; moved; ) {
    moved = false;
    waiting.sort((a, b) => (a.d === b.d ? a.s - b.s : a.d < b.d ? -1 : 1));
    for (let i = 0; i < waiting.length; i++) {
      const op = waiting[i];
      const j = judge(log, op, now);
      if (j === 'wait') continue;
      waiting.splice(i--, 1);
      if (j === 'no') { out.refused++; continue; }
      if (j === 'old') continue;
      log.vv[op.d] = op.s;
      // Kept to pass on all the same, so the devices after it have every number of its device.
      log.ops.push(op);
      moved = true;
      if (j === 'skip') { out.refused++; continue; }
      apply(log, op);
      log.clock = saw(log.clock, op.at, log.me);
      out.taken.push(op);
    }
  }
  // Held once each, the newest kept should there be too many.
  const seen = new Set<string>();
  const held = waiting.filter((op) => {
    const key = `${op.d}/${op.s}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  log.held = held.slice(-MAX_HELD);
  out.held = queue.filter((op) => log.held.includes(op)).length;
  trim(log);
  return out;
}

/** What another device lacks, as `answer` gives it. */
export type Answer = { ops: Op[]; more: boolean } | { whole: true };

/**
 * What to give `peer`, which said it has `theirs`: the ops it lacks, oldest first, MAX_BATCH at
 * most (`more` when there are others), or the whole log when it lacks ops no longer kept. What it
 * said is kept, so ops every device has go.
 */
export function answer(log: Log, peer: string, theirs: Record<string, number>): Answer {
  if (peer !== log.me && log.peers.includes(peer)) {
    log.seen[peer] = { ...theirs };
    compact(log);
  }
  return lackOf(log, peer, theirs);
}

/** What `peer` lacks if it has `theirs`, as `answer` gives it, keeping nothing of what it said. */
export function lackOf(log: Log, peer: string, theirs: Record<string, number>): Answer {
  // A device other than the primary gives its own ops alone, as no other takes another's from it;
  // and the whole log only for them, as that is all of it the other takes.
  if (log.me !== log.primary) {
    if ((theirs[log.me] ?? 0) < (log.cut[log.me] ?? 0)) return { whole: true };
    const own = log.ops.filter((op) => op.d === log.me && op.s > (theirs[log.me] ?? 0));
    return { ops: own.slice(0, MAX_BATCH), more: own.length > MAX_BATCH };
  }
  // A device that has fewer of its own ops than this one has of it was put back from a backup: it
  // takes the whole log, and numbers its next op after the last one it made, never again one used.
  if ((theirs[peer] ?? 0) < (log.vv[peer] ?? 0)) return { whole: true };
  // Never a device's own ops back to it: it alone makes them, and has them all.
  for (const [d, n] of Object.entries(log.cut)) if (d !== peer && (theirs[d] ?? 0) < n) return { whole: true };
  const lacking = log.ops.filter((op) => op.d !== peer && op.s > (theirs[op.d] ?? 0));
  return { ops: lacking.slice(0, MAX_BATCH), more: lacking.length > MAX_BATCH };
}

/** The whole log as another device takes it: how far it has each device, and the records. */
export type Whole = { vv: Record<string, number>; data: Record<string, Record<string, Entry>> };

export function whole(log: Log): Whole {
  return { vv: { ...log.vv }, data: structuredClone(log.data) };
}

/**
 * Takes another device's whole log: each record joined with this one's, each field its later value,
 * so taking it twice, or after its ops, changes nothing. From a device other than the primary, only
 * what that device stamped itself, and how far it is with its own ops: what it says of others,
 * nothing shows it had from them, and the primary gives those itself. So the records only the
 * primary writes are left as they are here too.
 */
export function takeWhole(log: Log, from: string, w: Whole, now = Date.now()): boolean {
  if (!isWhole(w) || !log.peers.includes(from) || from === log.me) return false;
  const all = from === log.primary;
  const its = (s: Stamp | undefined) => (s !== undefined && (all || s.d === from) ? s : undefined);
  for (const [k, entries] of Object.entries(w.data)) {
    const writer = writerOf(log, k);
    if (writer !== null && writer !== from) continue;
    const kind = (log.data[k] ??= {});
    for (const [id, theirs] of Object.entries(entries)) {
      const e = (kind[id] ??= { f: {} });
      e.add = later(e.add, its(theirs.add));
      const del = its(theirs.del);
      if (del !== undefined && after(del, e.del)) {
        e.del = del;
        e.by = theirs.by;
      }
      for (const [name, field] of Object.entries(theirs.f)) if (its(field.at) && after(field.at, e.f[name]?.at)) e.f[name] = field;
      dropBefore(e);
      if (e.add === undefined && e.del === undefined && Object.keys(e.f).length === 0) delete kind[id];
    }
    if (Object.keys(kind).length === 0) delete log.data[k];
  }
  for (const [d, n] of Object.entries(w.vv)) {
    if (!all && d !== from) continue;
    if (n > (log.vv[d] ?? 0)) {
      // Those ops are in the records now, but not kept one by one: a device behind takes the whole log.
      log.vv[d] = n;
      log.cut[d] = Math.max(log.cut[d] ?? 0, n);
    }
  }
  // The clock sees their stamps as it sees an op's: not one too far ahead (clock.ts MAX_AHEAD),
  // or one device's clock once far ahead would set every other device's forward for good.
  for (const e of Object.values(w.data).flatMap((k) => Object.values(k))) {
    for (const s of [e.add, e.del, ...Object.values(e.f).map((f) => f.at)]) if (its(s) && takenNow(s!, now)) log.clock = saw(log.clock, s!, log.me);
  }
  log.held = log.held.filter((op) => op.s > (log.vv[op.d] ?? 0));
  return true;
}

/**
 * The account's devices changed (the primary signed a new list): those that left are cut off from
 * now, and what is held from those that came may go.
 */
export function setPeers(log: Log, devices: string[], now: number): void {
  const next = [...new Set([log.primary, log.me, ...devices.filter(isDevice)])];
  for (const d of log.peers) {
    if (next.includes(d)) continue;
    log.gone[d] = tick(log.clock, now, log.me);
    log.clock = log.gone[d];
    delete log.seen[d];
    // What the primary said before this device knew it left says nothing of whether it let it go:
    // only what it says from now on (`prune`).
    const phone = log.seen[log.primary];
    if (log.me !== log.primary && phone) phone[d] = Math.max(phone[d] ?? 0, log.vv[d] ?? 0, 1);
  }
  for (const d of next) delete log.gone[d];
  log.peers = next;
  take(log, [], now);
  compact(log);
}

/** Whether every other device has the op `d`/`s`, and none can still send one from before it. */
function stable(log: Log, d: string, s: number): boolean {
  for (const p of log.peers) {
    if (p === log.me) continue;
    const theirs = log.seen[p];
    if (theirs === undefined || (theirs[d] ?? 0) < s) return false;
    // What `p` made before it had that op: this device has it all.
    if ((log.vv[p] ?? 0) < (theirs[p] ?? 0)) return false;
  }
  return (log.vv[d] ?? 0) >= s;
}

/** Lets go of the ops every device has, and of records removed for good. */
export function compact(log: Log): void {
  const others = log.peers.filter((p) => p !== log.me);
  const has = (op: Op) => others.every((p) => (log.seen[p]?.[op.d] ?? 0) >= op.s);
  const kept: Op[] = [];
  for (const op of log.ops) {
    if (has(op)) log.cut[op.d] = Math.max(log.cut[op.d] ?? 0, op.s);
    else kept.push(op);
  }
  log.ops = kept;
  for (const [k, entries] of Object.entries(log.data)) {
    for (const [id, e] of Object.entries(entries)) {
      if (e.del === undefined || e.by === undefined || after(e.add ?? e.del, e.del) || Object.keys(e.f).length > 0) continue;
      if (stable(log, e.by.d, e.by.s)) delete entries[id];
    }
    if (Object.keys(entries).length === 0) delete log.data[k];
  }
  prune(log);
}

/**
 * Forgets the devices gone for good, so a vector names the devices of now and not each one ever
 * linked (each link is a new endpoint): the primary once none of its ops is kept and every device
 * said it has them all; a device once the primary, since this one knew it left, said a vector that
 * no longer names it. A number missing is 0, so what comes later reads the same.
 */
function prune(log: Log): void {
  const ids = new Set([...Object.keys(log.vv), ...Object.keys(log.cut), ...Object.keys(log.gone)]);
  const others = log.peers.filter((p) => p !== log.me);
  for (const d of ids) {
    if (d === log.me || d === log.primary || log.peers.includes(d)) continue;
    if (log.me === log.primary) {
      if (log.ops.some((op) => op.d === d)) continue;
      if (!others.every((p) => (log.seen[p]?.[d] ?? 0) >= (log.vv[d] ?? 0))) continue;
      // Its records stay, but nothing counts it any more: a device that comes with none of the
      // primary's ops takes the whole log, and them with it. Never while the primary wrote none.
      if ((log.vv[d] ?? 0) > 0) {
        if ((log.vv[log.me] ?? 0) === 0) continue;
        log.cut[log.me] = Math.max(log.cut[log.me] ?? 0, 1);
      }
    } else {
      const phone = log.seen[log.primary];
      if (phone === undefined || d in phone) continue;
    }
    delete log.vv[d];
    delete log.cut[d];
    delete log.gone[d];
    for (const v of Object.values(log.seen)) delete v[d];
    log.ops = log.ops.filter((op) => op.d !== d);
    log.held = log.held.filter((op) => op.d !== d);
  }
}

/** Keeps at most MAX_OPS ops: the oldest go, and a device that lacks them takes the whole log. */
function trim(log: Log): void {
  const over = log.ops.length - MAX_OPS;
  if (over <= 0) return;
  for (const op of log.ops.slice(0, over)) log.cut[op.d] = Math.max(log.cut[op.d] ?? 0, op.s);
  log.ops = log.ops.slice(over);
}

/** Whether a record is there: added after it was last removed. */
export function isThere(log: Log, kind: string, id: string): boolean {
  const e = log.data[kind]?.[id];
  return e?.add !== undefined && after(e.add, e.del);
}

/** A field's value now, or undefined when none is set. */
export function valueOf(log: Log, kind: string, id: string, field: string): Json | undefined {
  return log.data[kind]?.[id]?.f[field]?.v;
}

/** The ids of the records of a kind that are there. */
export function idsOf(log: Log, kind: string): string[] {
  return Object.keys(log.data[kind] ?? {}).filter((id) => isThere(log, kind, id)).sort();
}

// What comes from another device is checked in full before anything of it is used.

const NAME = /^[a-z][a-z0-9-]{0,31}$/;

// A record's id names a key of a plain object: never one the object has already (`__proto__`,
// `constructor`, `toString`...), with which a device's op would reach into every object here.
function isId(x: unknown): x is string {
  return typeof x === 'string' && x.length > 0 && x.length <= 128 && !(x in Object.prototype);
}

function isValue(x: unknown): x is Json {
  try {
    const text = JSON.stringify(x);
    return text !== undefined && text.length <= MAX_VALUE && sameJson(x, JSON.parse(text), 0);
  } catch {
    return false;
  }
}

// JSON goes through as itself only: no undefined, functions, NaN or Infinity hidden in it.
function sameJson(a: unknown, b: unknown, depth: number): boolean {
  if (depth > 16) return false;
  if (a === null || typeof a === 'string' || typeof a === 'boolean') return a === b;
  if (typeof a === 'number') return Number.isFinite(a) && a === b;
  if (Array.isArray(a)) return Array.isArray(b) && a.length === b.length && a.every((v, i) => sameJson(v, b[i], depth + 1));
  if (typeof a === 'object' && Object.getPrototypeOf(a) === Object.prototype) {
    const keys = Object.keys(a as object);
    return typeof b === 'object' && b !== null && keys.length === Object.keys(b).length &&
      keys.every((key) => sameJson((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key], depth + 1));
  }
  return false;
}

export function isOp(x: unknown): x is Op {
  if (typeof x !== 'object' || x === null) return false;
  const o = x as Record<string, unknown>;
  if (!isDevice(o.d) || !Number.isSafeInteger(o.s) || (o.s as number) < 1 || !isStamp(o.at) || o.at.d !== o.d) return false;
  if (typeof o.k !== 'string' || !NAME.test(o.k) || !isId(o.id)) return false;
  const keys = Object.keys(o).sort().join();
  if (o.x !== undefined) return (o.x === 'add' || o.x === 'del') && keys === 'at,d,id,k,s,x';
  return typeof o.f === 'string' && NAME.test(o.f) && 'v' in o && isValue(o.v) && keys === 'at,d,f,id,k,s,v';
}

function isEntry(x: unknown): x is Entry {
  if (typeof x !== 'object' || x === null) return false;
  const e = x as Record<string, unknown>;
  if (e.add !== undefined && !isStamp(e.add)) return false;
  if (e.del !== undefined && !isStamp(e.del)) return false;
  if (e.by !== undefined) {
    const by = e.by as Record<string, unknown>;
    if (typeof by !== 'object' || by === null || !isDevice(by.d) || !Number.isSafeInteger(by.s)) return false;
  }
  if (typeof e.f !== 'object' || e.f === null) return false;
  return Object.entries(e.f).every(([name, f]) => NAME.test(name) && typeof f === 'object' && f !== null && isStamp((f as Field).at) && isValue((f as Field).v));
}

export function isVector(x: unknown, most = MAX_DEVICES): x is Record<string, number> {
  return typeof x === 'object' && x !== null && !Array.isArray(x) &&
    Object.entries(x).length <= most &&
    Object.entries(x).every(([d, n]) => isDevice(d) && Number.isSafeInteger(n) && (n as number) >= 0);
}

export function isWhole(x: unknown): x is Whole {
  if (typeof x !== 'object' || x === null) return false;
  const w = x as Record<string, unknown>;
  return isVector(w.vv) && isData(w.data);
}

function isData(x: unknown): x is Whole['data'] {
  return typeof x === 'object' && x !== null && Object.entries(x).every(([k, entries]) =>
    NAME.test(k) && typeof entries === 'object' && entries !== null &&
    Object.entries(entries).every(([id, e]) => isId(id) && isEntry(e)));
}

/**
 * A log as this device kept it, checked in full; null for anything else, as for none. Its vectors may
 * name more devices than one said by another may (kept before the gone were let go): it is taken all
 * the same, and those gone for good are let go at once, as starting anew would number the phone's
 * ops again from 1.
 */
export function checkedLog(x: unknown): Log | null {
  if (typeof x !== 'object' || x === null) return null;
  const l = x as Record<string, unknown>;
  if (!isDevice(l.me) || !isDevice(l.primary) || (l.clock !== undefined && !isStamp(l.clock))) return null;
  if (!isVector(l.vv, Infinity) || !isVector(l.cut, Infinity)) return null;
  if (!Array.isArray(l.peers) || !l.peers.every(isDevice) || !Array.isArray(l.ops) || !Array.isArray(l.held)) return null;
  if (typeof l.gone !== 'object' || l.gone === null || !Object.entries(l.gone).every(([d, s]) => isDevice(d) && isStamp(s))) return null;
  if (typeof l.seen !== 'object' || l.seen === null || !Object.entries(l.seen).every(([d, v]) => isDevice(d) && isVector(v, Infinity))) return null;
  if (!isData(l.data)) return null;
  const log: Log = {
    me: l.me,
    primary: l.primary,
    ...(l.clock !== undefined ? { clock: l.clock as Stamp } : {}),
    vv: l.vv,
    peers: l.peers,
    gone: l.gone as Record<string, Stamp>,
    data: l.data as Log['data'],
    ops: l.ops.filter(isOp).slice(-MAX_OPS),
    cut: l.cut,
    held: l.held.filter(isOp).slice(-MAX_HELD),
    seen: l.seen as Log['seen'],
  };
  compact(log);
  return log;
}
