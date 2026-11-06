// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { idsOf, isThere, valueOf, type Change, type Json, type Log } from './log';

// What of the contacts goes into the account's log (lib/sync/log.ts, docs/sync.md, phase S1): each
// contact a record of kind `contact` by its identity, with what every device keeps alike of it
// (lib/link-wire.ts Synced: its name, timer, whether it is still a request, its look, whether it is
// hidden; a picture stays where it was chosen, and goes later), and each one blocked a record of
// kind `blocked`, with the name it had. `changesFor` says what to write so the log says what this
// device has now: nothing for what it says already. Self-contained, so it runs under plain Node.

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
