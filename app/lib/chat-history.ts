// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import type { Place } from './chat-parts';
import type { Written } from './chat-export';
import { dayKey, daysOf, linksIn, type MediaItem, type MediaKind } from './chat-media';
import { t } from './i18n';
import { searchMessages, type Findable, type Found } from './message-search';

// What the chats on Matrix, XMPP, Nostr and SMS share with an Erevos chat's own (app/chat.tsx):
// Search in this chat, Go to a day, Media, links and files, and Export chat, over the messages the
// phone keeps for the chat. Each service makes its messages into these (lib/chat-history-adapters.ts),
// and components/chat-history.tsx shows them. Nothing here reaches a server: the search looks
// only at what is on the phone, and a file on its network's server is fetched only in the chat,
// when tapped there, as before.

/** A message's file: a photo, a video, a sound or any other file. */
export type HistoryFile = {
  kind: 'photo' | 'video' | 'sound' | 'file';
  /** Its name; empty when it has none (an MMS's picture or sound). */
  name: string;
  size?: number;
  /** A voice message, and how long it lasts when that is known, milliseconds. */
  voice?: true;
  ms?: number;
  /** A contact card (an MMS's vCard). */
  card?: true;
  /** Where the phone shows it, for an MMS's part: it is on the phone. Without it, the file is on its
   *  network's server until it is fetched in the chat. */
  uri?: string;
};

/** A message of a chat on another network, as the search, the media and the export see it. */
export type HistoryMessage = {
  /** Its id in the chat, to go to it there. */
  id: string;
  /** When it was written, milliseconds. */
  at: number;
  mine: boolean;
  /** Who wrote it, in a group, when not us. */
  by?: string;
  text: string;
  files?: HistoryFile[];
  /** Its file is a sticker's picture: in no list, and written out as a sticker. */
  sticker?: true;
  place?: Place;
  /** A poll: its question, its options, and who chose which, by name. */
  poll?: { q: string; o: string[]; voted: { chose: number[]; name: string }[] };
  /** The message it answers, by its id. */
  replyTo?: string;
  edited?: true;
  forwarded?: true;
  /** Taken back by whoever wrote it: found nowhere, and not written out. */
  deleted?: true;
  /** Encrypted, and this device cannot open it. */
  locked?: true;
  /** A call's line: its words in English (lib/call-lines.ts). */
  call?: true;
  /** Each reaction, with who chose it. */
  reactions?: { emoji: string; name: string }[];
  /** A link's preview its sender made: the link and its title. */
  preview?: { url: string; title: string };
};

/** The messages a chat shows, and those the phone keeps besides (an SMS conversation's older ones),
 *  each once, the oldest first. */
export function joined(shown: HistoryMessage[], kept: HistoryMessage[] | null): HistoryMessage[] {
  if (!kept) return shown;
  const byId = new Map(kept.map((m) => [m.id, m]));
  for (const m of shown) byId.set(m.id, m);
  return [...byId.values()].sort((a, b) => a.at - b.at);
}

// What a message is found by: its words and its files' names (a sticker's, its words). One taken
// back or locked has none, nor has a place.
function findable(m: HistoryMessage): Findable | null {
  if (m.deleted || m.locked) return null;
  const base = { peer: '', tag: m.id, at: m.at, mine: m.mine };
  if (m.poll) return { ...base, text: '', poll: { q: m.poll.q, o: m.poll.o } };
  if (m.place) return null;
  const words = [m.text, ...(m.files ?? []).map((file) => file.name)].filter(Boolean);
  return words.length ? { ...base, text: [...new Set(words)].join('\n') } : null;
}

/** The messages with `query` in them, the latest first, as an Erevos chat's search finds them (lib/message-search.ts). */
export function searchHistory(messages: HistoryMessage[], query: string): Found[] {
  return searchMessages(
    messages.flatMap((m) => findable(m) ?? []),
    query,
  );
}

/** The days that have a message, for the calendar that goes to one. */
export const historyDays = (messages: HistoryMessage[]): Set<string> => daysOf(messages);

/** The first message of a day (dayKey), to go to it. */
export function firstOfDay(messages: HistoryMessage[], day: string): HistoryMessage | null {
  let first: HistoryMessage | null = null;
  for (const m of messages) if (dayKey(m.at) === day && (!first || m.at < first.at)) first = m;
  return first;
}

/** How many messages are as late as `at` or later: as many of the latest the chat draws to show it. */
export const drawnTo = (messages: HistoryMessage[], at: number): number => messages.filter((m) => m.at >= at).length;

// Which list a file goes in: a sound is a voice message or music; a sticker goes in none.
function kindOf(file: HistoryFile): MediaKind {
  if (file.kind === 'sound') return file.voice ? 'voice' : 'music';
  return file.kind;
}

/** The chat's photos, videos, voice messages, music, files and links, the newest first (components/chat-media.tsx). */
export function historyMedia(messages: HistoryMessage[]): MediaItem[] {
  const items: MediaItem[] = [];
  for (const m of messages) {
    if (m.deleted || m.locked || m.call) continue;
    const base = { at: m.at, mine: m.mine, sender: m.mine ? '' : (m.by ?? ''), tag: m.id };
    if (!m.sticker) {
      (m.files ?? []).forEach((file, n) => {
        items.push({
          ...base,
          key: `${m.id}|${n}`,
          kind: kindOf(file),
          outside: { name: file.name || (file.card ? t('Contact card') : ''), ...(file.size !== undefined ? { size: file.size } : {}), ...(file.uri ? { uri: file.uri } : {}) },
          ...(file.ms !== undefined ? { ms: file.ms } : {}),
        });
      });
    }
    // A sticker's, a place's or a poll's words are not the sender's own.
    if (m.text && !m.sticker && !m.place && !m.poll) {
      linksIn(m.text).forEach((url, n) => {
        items.push({ ...base, key: `${m.id}|link${n}`, kind: 'link', url, ...(m.preview?.url === url && m.preview.title ? { title: m.preview.title } : {}) });
      });
    }
  }
  return items.sort((a, b) => b.at - a.at);
}

// A file as the export names it: [Photo: name], [Voice message, 0:12], [File: name]; one with no
// name by what it is.
function fileLine(file: HistoryFile): Pick<Written, 'text' | 'file' | 'voice'> {
  if (file.card) return { text: `[${t('Contact card')}]` };
  if (file.voice) return file.ms !== undefined ? { text: '', voice: { ms: file.ms } } : { text: `[${t('Voice message')}]` };
  if (!file.name) return { text: `[${file.kind === 'photo' ? t('Photo') : t('File')}]` };
  return { text: '', file: { kind: file.kind === 'photo' ? 'photo' : 'file', name: file.name } };
}

/**
 * The chat as lib/chat-export.ts writes it out, as an Erevos chat's: each message on its line, a
 * file by its name, each of an MMS's parts on a line of its own and then its words. One taken back
 * is left out, as whoever wrote it meant it to go.
 */
export function historyWritten(messages: HistoryMessage[]): Written[] {
  const written: Written[] = [];
  for (const m of messages) {
    if (m.deleted) continue;
    const lines: Pick<Written, 'text' | 'file' | 'voice' | 'place' | 'poll' | 'votedBy'>[] = [];
    if (m.locked) lines.push({ text: `[${t('Locked message')}]` });
    else if (m.poll) lines.push({ text: '', poll: { q: m.poll.q, o: m.poll.o }, votedBy: m.poll.voted });
    else if (m.place) lines.push({ text: '', place: m.place });
    else if (m.sticker) lines.push({ text: `[${m.files?.[0]?.name ? t('Sticker: {name}', { name: m.files[0].name }) : t('Sticker')}]` });
    else {
      for (const file of m.files ?? []) lines.push(fileLine(file));
      if (m.text) lines.push({ text: m.text });
    }
    lines.forEach((line, n) => {
      written.push({
        ...line,
        mine: m.mine,
        at: m.at,
        ...(m.by ? { by: m.by } : {}),
        // What is said of the message goes with its first line only.
        ...(n === 0
          ? {
              tag: m.id,
              ...(m.replyTo ? { re: m.replyTo } : {}),
              ...(m.forwarded ? { forwarded: true } : {}),
              ...(m.edited ? { edited: m.at } : {}),
              reactedBy: m.reactions ?? [],
            }
          : { reactedBy: [] }),
      });
    });
  }
  return written;
}
