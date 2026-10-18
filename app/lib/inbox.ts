// The home screen's list of chats (app/index.tsx): one row for each of the space's contacts, with
// the last message, how many of theirs are not read yet, and when the chat last moved, newest
// first. Made from what the space keeps sealed: its contacts (lock/e2e-data.ts), the messages with
// them (lock/history.ts) and the chats imported into it (lock/archive.ts). Hidden chats are not in
// it, and nothing about them is: the home screen looks the same whether a space has them or not.

import type { Avatar } from '../lock/e2e-data';
import { voiceDuration } from './voice';

export type InboxContact = { identity: string; name: string; timer: number; avatar?: Avatar | null };

export type InboxMessage = {
  peer: string;
  text: string;
  mine: boolean;
  at: number;
  until?: number;
  mark?: 0 | 1 | 2;
  voice?: { ms: number };
  file?: { kind: 'photo' | 'file'; name: string };
};

export type InboxImported = { title: string; contact: string; last: number };

export type InboxRow = {
  identity: string;
  /** The name given here, or the imported chat's that goes on with them; empty if neither. */
  name: string;
  /** The last message's text, how long it is if it is a voice message, or what file it is; empty if there is none yet. */
  last: string;
  /** Whether the last message is ours, and its mark. */
  mine: boolean;
  mark: 0 | 1 | 2;
  /** When the chat last moved, milliseconds, 0 if never. */
  at: number;
  /** Their messages not read yet. */
  unread: number;
  /** Seconds after which new messages disappear, 0 if they stay. */
  timer: number;
  /** An imported chat goes on here. */
  imported: boolean;
  /** The picture given to them here, or null for the one drawn from their key. */
  avatar: Avatar | null;
};

const PREFIX = 'contact:';

/** The rows, chats that moved latest first, then the rest by name. Messages gone by `now` are left out. */
export function buildInbox(contacts: InboxContact[], messages: InboxMessage[], imported: InboxImported[], now: number): InboxRow[] {
  const latest = new Map<string, InboxMessage>();
  const unread = new Map<string, number>();
  for (const m of messages) {
    if (!m.peer.startsWith(PREFIX) || (m.until && m.until <= now)) continue;
    const identity = m.peer.slice(PREFIX.length);
    const before = latest.get(identity);
    if (!before || m.at >= before.at) latest.set(identity, m);
    if (!m.mine && !m.mark) unread.set(identity, (unread.get(identity) ?? 0) + 1);
  }
  const rows = contacts.map((contact): InboxRow => {
    const last = latest.get(contact.identity);
    const linked = imported.filter((chat) => chat.contact === contact.identity);
    const importedAt = linked.reduce((at, chat) => Math.max(at, chat.last), 0);
    return {
      identity: contact.identity,
      name: contact.name || linked[0]?.title.trim() || '',
      last: preview(last),
      mine: last?.mine ?? false,
      mark: last?.mark ?? 0,
      at: Math.max(last?.at ?? 0, importedAt),
      unread: unread.get(contact.identity) ?? 0,
      timer: contact.timer,
      imported: linked.length > 0,
      avatar: contact.avatar ?? null,
    };
  });
  return rows.sort((a, b) => b.at - a.at || shownName(a).localeCompare(shownName(b)));
}

function preview(message: InboxMessage | undefined): string {
  if (message?.voice) return `Voice message, ${voiceDuration(message.voice.ms)}`;
  if (message?.file) return message.file.kind === 'photo' ? 'Photo' : `File: ${message.file.name}`;
  return message?.text ?? '';
}

/** A row's name, or the start of the contact's key when it has none. */
export function shownName(row: { identity: string; name: string }): string {
  return row.name || `contact ${row.identity.slice(0, 8)}`;
}

/** Rows whose name or last message has `query` in it, ignoring case and Greek accents. */
export function filterInbox(rows: InboxRow[], query: string): InboxRow[] {
  const plain = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const q = plain(query.trim());
  if (!q) return rows;
  return rows.filter((row) => plain(shownName(row)).includes(q) || plain(row.last).includes(q));
}

const pad = (n: number) => String(n).padStart(2, '0');
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** When a row last moved: the time today, the weekday within a week, or the date. */
export function rowTime(at: number, now: number): string {
  if (!at) return '';
  const d = new Date(at);
  const today = new Date(now);
  if (d.toDateString() === today.toDateString()) return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const midnight = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  if (at > midnight - 6 * 24 * 3600 * 1000 && at < midnight) return DAYS[d.getDay()];
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${String(d.getFullYear()).slice(2)}`;
}
