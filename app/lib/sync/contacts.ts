// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import type { Blocked } from '../../lock/e2e-data';
import { checkedLook, type Look } from '../../theme/look';
import type { Envelope, Synced } from '../link-wire';

import { idsOf, isThere, valueOf, type Change, type Json, type Log } from './log';

// What of the contacts goes into the account's log (lib/sync/log.ts, docs/sync.md, phase S1): each
// contact a record of kind `contact` by its identity, with what every device keeps alike of it
// (lib/link-wire.ts Synced: its name, timer, whether it is still a request, its look, whether it is
// hidden; a picture stays where it was chosen, and goes later), and each one blocked a record of
// kind `blocked`, with the name it had. `changesFor` says what to write so the log says what the
// phone has now: nothing for what it says already. A linked device writes what it changed, as it
// says it in `set` (`syncChangesOf`), and takes what the log says as such a `set` (`setsFromLog`).

/** What of a contact the log keeps: lib/link-wire.ts Synced without the picture and the times. */
export type LoggedContact = { identity: string; name: string; timer: number; request: boolean; look: Json; hide: boolean };

/** What of one blocked the log keeps. */
export type LoggedBlocked = { identity: string; name: string };

const FIELDS = ['name', 'timer', 'request', 'look', 'hide'] as const;

const same = (a: Json | undefined, b: Json) => JSON.stringify(a ?? null) === JSON.stringify(b);

/** The changes that make the log's records of `kind` those of `now`, each by its `identity`. */
function changesOf<T extends { identity: string }>(log: Log, kind: string, now: readonly T[], fields: readonly (keyof T & string)[]): Change[] {
  const changes: Change[] = [];
  const here = new Set<string>();
  for (const item of now) {
    const id = item.identity;
    here.add(id);
    if (!isThere(log, kind, id)) changes.push({ k: kind, id, x: 'add' });
    for (const f of fields) {
      const v = (item[f] ?? null) as Json;
      if (!isThere(log, kind, id) || !same(valueOf(log, kind, id, f), v)) changes.push({ k: kind, id, f, v });
    }
  }
  for (const id of idsOf(log, kind)) if (!here.has(id)) changes.push({ k: kind, id, x: 'del' });
  return changes;
}

/** What to write so the log holds `contacts` and `blocked` as they are here now. */
export function changesFor(log: Log, contacts: readonly LoggedContact[], blocked: readonly LoggedBlocked[]): Change[] {
  return [...changesOf(log, 'contact', contacts, FIELDS), ...changesOf(log, 'blocked', blocked, ['name'])];
}

/** The contacts as the log says them, by identity. */
export function contactsIn(log: Log): LoggedContact[] {
  return idsOf(log, 'contact').map((identity) => ({
    identity,
    name: String(valueOf(log, 'contact', identity, 'name') ?? ''),
    timer: Number(valueOf(log, 'contact', identity, 'timer') ?? 0),
    request: valueOf(log, 'contact', identity, 'request') === true,
    look: valueOf(log, 'contact', identity, 'look') ?? null,
    hide: valueOf(log, 'contact', identity, 'hide') === true,
  }));
}

/** Those blocked as the log says them. */
export function blockedIn(log: Log): LoggedBlocked[] {
  return idsOf(log, 'blocked').map((identity) => ({ identity, name: String(valueOf(log, 'blocked', identity, 'name') ?? '') }));
}

type SetEnvelope = Extract<Envelope, { k: 'set' }>;

/** A contact's look as the log holds it: null for none, undefined for what is not one. */
export function checkedLookOf(v: Json | undefined): Look | null | undefined {
  if (v === null) return null;
  return typeof v === 'object' && !Array.isArray(v) ? checkedLook(v) : undefined;
}

/** What a linked device writes into the log for a change it says in `set` (lib/siblings.ts). */
export function syncChangesOf(said: SetEnvelope): Change[] {
  const id = said.c;
  if (said.remove) return [{ k: 'contact', id, x: 'del' }];
  const out: Change[] = said.added ? [{ k: 'contact', id, x: 'add' }] : [];
  const c = said.change;
  if (c.name !== undefined) out.push({ k: 'contact', id, f: 'name', v: c.name });
  if (c.timer !== undefined) out.push({ k: 'contact', id, f: 'timer', v: c.timer });
  if (c.request === false) out.push({ k: 'contact', id, f: 'request', v: false });
  if (c.look !== undefined) out.push({ k: 'contact', id, f: 'look', v: (c.look ?? null) as unknown as Json });
  if (c.hide !== undefined) out.push({ k: 'contact', id, f: 'hide', v: c.hide });
  return out;
}

/** When the log last set a field of a contact, ms by the clock of the device that set it; 0 for never. */
function setAt(log: Log, id: string, f: string): number {
  return log.data.contact?.[id]?.f[f]?.at.t ?? 0;
}

/**
 * What the log says of a contact that this device keeps otherwise (`kept`), as the `set`s another
 * device would say: one for each field it holds otherwise, by when it was set there, the contact
 * added as the log adds it, or removed as it removes it. None for a contact the log never named.
 */
export function setsFromLog(log: Log, id: string, kept: Synced | undefined): SetEnvelope[] {
  const e = log.data.contact?.[id];
  if (!e) return [];
  if (!isThere(log, 'contact', id)) return kept && e.del ? [{ k: 'set', c: id, change: {}, remove: true, when: e.del.t }] : [];
  const name = valueOf(log, 'contact', id, 'name');
  const timer = valueOf(log, 'contact', id, 'timer');
  const look = checkedLookOf(valueOf(log, 'contact', id, 'look'));
  const hide = valueOf(log, 'contact', id, 'hide');
  const request = valueOf(log, 'contact', id, 'request');
  if (!kept) {
    // Added: with all it holds, as of when it was added.
    const change: SetEnvelope['change'] = {
      ...(typeof name === 'string' ? { name } : {}),
      ...(typeof timer === 'number' ? { timer, timerAt: setAt(log, id, 'timer') } : {}),
      ...(look !== undefined ? { look } : {}),
      ...(typeof hide === 'boolean' ? { hide } : {}),
      ...(typeof request === 'boolean' ? { request } : {}),
    };
    return [{ k: 'set', c: id, change, when: e.add!.t, added: true }];
  }
  const out: SetEnvelope[] = [];
  const one = (change: SetEnvelope['change'], f: string) => out.push({ k: 'set', c: id, change, when: setAt(log, id, f) });
  if (typeof name === 'string' && name !== kept.name) one({ name }, 'name');
  if (typeof timer === 'number' && timer !== kept.timer) one({ timer, timerAt: setAt(log, id, 'timer') }, 'timer');
  if (look !== undefined && JSON.stringify(look) !== JSON.stringify(kept.look)) one({ look }, 'look');
  if (typeof hide === 'boolean' && hide !== kept.hide) one({ hide }, 'hide');
  if (request === false && kept.request) one({ request: false }, 'request');
  return out;
}

/** Those blocked as the log says them, as the phone tells them (`blocked`). */
export function blockedFromLog(log: Log): Blocked[] {
  return idsOf(log, 'blocked').map((identity) => ({
    identity,
    name: String(valueOf(log, 'blocked', identity, 'name') ?? ''),
    at: log.data.blocked?.[identity]?.add?.t ?? 0,
  }));
}
