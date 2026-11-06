// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import type { HeldAt } from '../relay';
import { isThere, type Change, type Json, type Log } from './log';

// What the account sent for later, in the place's log (docs/sync.md, phase S4): each message a relay
// holds till its time, from whichever device sent it, as a record of kind `later` by its contact and
// tag, with its time (`at`), its words, what it is (`what`: words, a voice message, or a file and its
// name), how long it lasts once read, and where it is held: for the contact's account (`held`) and
// for each endpoint of theirs (`copies`). So every device shows it as scheduled, and any can take it
// back: the one that does removes the record, and the others let it go.
//
// - One is written once it is held, and its copies again as more are held.
// - A record is put in place here only while its time is ahead; one past its time a day goes.
// - The message itself never goes in the log: the relay has it, sealed for the contact.

const KIND = 'later';
const DAY = 24 * 60 * 60_000;
const ID = /^([0-9a-f]{64})\.([0-9a-f]{12})$/;
const HELD_ID = /^[0-9a-f]{32}(?:,[0-9a-f]{32}){0,63}$/;
/** The most copies kept with one, as many as a list names and some over. */
const MOST_COPIES = 8;
/** The longest words kept with one: the message is the relay's; the devices show these. */
const MOST_WORDS = 4096;

export type LaterWhat = 'text' | 'voice' | 'file';

/** One sent for later, as the log says it. */
export type Scheduled = { c: string; tag: string; at: number; text: string; what: LaterWhat; name?: string; lasts: number; held: HeldAt; copies: HeldAt[] };

export const laterId = (c: string, tag: string) => `${c}.${tag}`;

const heldJson = (h: HeldAt): Json => ({ id: h.id, relay: h.relay });
const isHeld = (v: unknown): v is HeldAt => {
  const h = v as Record<string, unknown> | null;
  return !!h && typeof h === 'object' && typeof h.id === 'string' && HELD_ID.test(h.id) && typeof h.relay === 'string' && h.relay.length > 0 && h.relay.length <= 512;
};

/** A record of the log as one sent for later, or null when it is not one. */
export function scheduledOf(log: Log, id: string): Scheduled | null {
  const m = ID.exec(id);
  const f = log.data[KIND]?.[id]?.f;
  if (!m || !f) return null;
  const at = f.at?.v;
  const text = f.text?.v;
  const what = f.what?.v;
  const lasts = f.lasts?.v;
  const held = f.held?.v;
  const copies = f.copies?.v;
  const name = f.name?.v;
  if (typeof at !== 'number' || !Number.isSafeInteger(at) || typeof text !== 'string' || text.length > MOST_WORDS || !isHeld(held)) return null;
  if (what !== 'text' && what !== 'voice' && what !== 'file') return null;
  return {
    c: m[1],
    tag: m[2],
    at,
    text,
    what,
    ...(typeof name === 'string' && name.length <= 255 ? { name } : {}),
    lasts: typeof lasts === 'number' && Number.isSafeInteger(lasts) && lasts >= 0 ? lasts : 0,
    held: { id: held.id, relay: held.relay },
    copies: Array.isArray(copies) ? copies.filter(isHeld).slice(0, MOST_COPIES).map((h) => ({ id: h.id, relay: h.relay })) : [],
  };
}

/**
 * What to write into the log for what is sent for later here (`here`): each held one the log does
 * not name yet, unless it removed it (taken back elsewhere); the copies of each as more are held;
 * and the removal of those past their time a day.
 */
export function laterChanges(log: Log, here: readonly Scheduled[], now = Date.now()): Change[] {
  const changes: Change[] = [];
  for (const s of here) {
    if (s.at <= now) continue;
    const id = laterId(s.c, s.tag);
    const entry = log.data[KIND]?.[id];
    const copies = s.copies.slice(0, MOST_COPIES).map(heldJson);
    if (!entry) {
      changes.push(
        { k: KIND, id, x: 'add' },
        { k: KIND, id, f: 'at', v: s.at },
        { k: KIND, id, f: 'text', v: s.text.slice(0, MOST_WORDS) },
        { k: KIND, id, f: 'what', v: s.what },
        ...(s.name ? [{ k: KIND, id, f: 'name', v: s.name.slice(0, 255) }] : []),
        { k: KIND, id, f: 'lasts', v: s.lasts },
        { k: KIND, id, f: 'held', v: heldJson(s.held) },
        { k: KIND, id, f: 'copies', v: copies },
      );
      continue;
    }
    if (!isThere(log, KIND, id)) continue;
    // More copies held since: all of them, those the log names and these.
    const said = scheduledOf(log, id)?.copies ?? [];
    const more = s.copies.filter((h) => !said.some((x) => x.id === h.id));
    if (more.length > 0) changes.push({ k: KIND, id, f: 'copies', v: [...said, ...more].slice(0, MOST_COPIES).map(heldJson) });
  }
  for (const id of Object.keys(log.data[KIND] ?? {})) {
    if (!isThere(log, KIND, id)) continue;
    const at = log.data[KIND]![id].f.at?.v;
    if (typeof at !== 'number' || at < now - DAY) changes.push({ k: KIND, id, x: 'del' });
  }
  return changes;
}

/** The removals that say these were taken back: of the message `tag` to `c`, or of all theirs without one. */
export function laterGone(log: Log, c: string, tag?: string): Change[] {
  const ids = tag ? [laterId(c, tag)] : Object.keys(log.data[KIND] ?? {}).filter((id) => id.startsWith(`${c}.`));
  return ids.filter((id) => isThere(log, KIND, id)).map((id) => ({ k: KIND, id, x: 'del' as const }));
}

/**
 * What the log says of those sent for later, of the records `ids` (all with null): those whose time
 * is ahead, to show here, and those it removed, to let go of.
 */
export function laterFrom(log: Log, ids: readonly string[] | null, now = Date.now()): { came: Scheduled[]; gone: { c: string; tag: string }[] } {
  const came: Scheduled[] = [];
  const gone: { c: string; tag: string }[] = [];
  for (const id of ids ?? Object.keys(log.data[KIND] ?? {})) {
    const m = ID.exec(id);
    if (!m || !log.data[KIND]?.[id]) continue;
    if (!isThere(log, KIND, id)) {
      gone.push({ c: m[1], tag: m[2] });
      continue;
    }
    const s = scheduledOf(log, id);
    if (s && s.at > now) came.push(s);
  }
  return { came, gone };
}
