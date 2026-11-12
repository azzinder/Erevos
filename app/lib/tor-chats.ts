// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { sparesOf, type Contact } from '../lock/e2e-data';
import { setTorChats } from './relay';

// The Erevos chats set to go only through Tor (Contact.tor, the chat's "Through Tor" switch), of
// every account running now: the space's, its hidden places', each told here by its own E2E as its
// contacts change, by its identity. What lib/relay.ts sends to them and reads from them then goes
// through Tor, each chat on its own circuits, whatever the space's Tor way. Kept apart from React
// Native, so the checks run in Node.

type Chats = { senders: Map<string, string>; readers: Set<string> };

const accounts = new Map<string, Chats>();

/** A chat's own circuits: named from its contact, so two chats never share an exit. */
export const circuitOf = (identity: string): string => identity.slice(0, 16).toLowerCase();

/** Each chat that goes through Tor of `contacts`: its queues' sender ids and the ids of the queues it writes to here. */
export function torChatsOf(contacts: readonly Contact[]): Chats {
  const senders = new Map<string, string>();
  const readers = new Set<string>();
  for (const c of contacts) {
    if (c.tor !== true) continue;
    const circuit = circuitOf(c.identity);
    for (const sender of [c.sender, c.ringSender ?? '', ...sparesOf(c.spare).map((spare) => spare.sender)]) if (sender) senders.set(sender.toLowerCase(), circuit);
    if (c.mine?.r) readers.add(c.mine.r.toLowerCase());
    if (c.mine?.was?.r) readers.add(c.mine.was.r.toLowerCase());
  }
  return { senders, readers };
}

/** An account's contacts as they are now (`account`: its identity, hex). */
export function tellTorChats(account: string, contacts: readonly Contact[]): void {
  const now = torChatsOf(contacts);
  const was = accounts.get(account);
  if (!was && now.senders.size === 0 && now.readers.size === 0) return;
  if (was && sameChats(was, now)) return;
  if (now.senders.size === 0 && now.readers.size === 0) accounts.delete(account);
  else accounts.set(account, now);
  const senders = new Map<string, string>();
  const readers = new Set<string>();
  for (const chats of accounts.values()) {
    chats.senders.forEach((circuit, sender) => senders.set(sender, circuit));
    chats.readers.forEach((reader) => readers.add(reader));
  }
  setTorChats(senders, readers);
}

function sameChats(a: Chats, b: Chats): boolean {
  if (a.senders.size !== b.senders.size || a.readers.size !== b.readers.size) return false;
  for (const [sender, circuit] of a.senders) if (b.senders.get(sender) !== circuit) return false;
  for (const reader of a.readers) if (!b.readers.has(reader)) return false;
  return true;
}
