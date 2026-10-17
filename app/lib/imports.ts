import type { ArchivedChat, ArchivedMessage, Source } from '../lock/archive';

import * as core from './core';
import { utf8Decode, utf8Encode } from './crypto';

// Chats exported from other messengers, read by the Erevos core (crates/erevos-import): Telegram's
// JSON export (result.json) and WhatsApp's exported chat (.txt, or .zip with the media). Nothing
// here leaves the phone. Viber is not read yet.

export type ImportedMessage = { at: number | null; local: boolean; sender: string | null; text: string; attachments: string[] };
export type ImportedChat = { source: Source; title: string; skipped: number; messages: ImportedMessage[] };

const SOURCES: Source[] = ['telegram', 'whatsapp', 'viber'];

function checkedMessage(value: unknown): ImportedMessage | null {
  const m = (value ?? {}) as Record<string, unknown>;
  if (typeof m.text !== 'string') return null;
  return {
    at: typeof m.at === 'number' ? m.at : null,
    local: m.local === true,
    sender: typeof m.sender === 'string' ? m.sender : null,
    text: m.text,
    attachments: Array.isArray(m.attachments) ? m.attachments.filter((a): a is string => typeof a === 'string') : [],
  };
}

function checkedChat(value: unknown): ImportedChat | null {
  const c = (value ?? {}) as Record<string, unknown>;
  if (!SOURCES.includes(c.source as Source) || !Array.isArray(c.messages)) return null;
  return {
    source: c.source as Source,
    title: typeof c.title === 'string' ? c.title : '',
    skipped: typeof c.skipped === 'number' ? c.skipped : 0,
    messages: c.messages.map(checkedMessage).filter((m): m is ImportedMessage => m !== null),
  };
}

/** The chats in an export file. `name` is the file's name, which holds a WhatsApp chat's name. Throws if it is not one Erevos reads. */
export async function readExport(name: string, data: Uint8Array): Promise<ImportedChat[]> {
  const json = JSON.parse(utf8Decode(await core.importChats(utf8Encode(name), data))) as unknown;
  return (Array.isArray(json) ? json : []).map(checkedChat).filter((c): c is ImportedChat => c !== null);
}

/** The file's own name from a picked file's address, which on Android may be a content URI. */
export function fileName(uri: string): string {
  let name = uri;
  try {
    name = decodeURIComponent(uri);
  } catch {
    // Keep it as it is.
  }
  return name.split(/[/:]/).pop() || name;
}

/** Everyone who wrote in the chats, the most messages first. */
export function senders(chats: ImportedChat[]): string[] {
  const counts = new Map<string, number>();
  for (const chat of chats) {
    for (const m of chat.messages) if (m.sender) counts.set(m.sender, (counts.get(m.sender) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name);
}

/**
 * Milliseconds of a time. A WhatsApp time is the exporting phone's clock with no time zone,
 * counted as seconds since 1970 on that clock: it is read in this phone's time zone.
 */
export function toMillis(at: number | null, local: boolean): number {
  if (at === null) return 0;
  if (!local) return at * 1000;
  const clock = new Date(at * 1000);
  return new Date(
    clock.getUTCFullYear(),
    clock.getUTCMonth(),
    clock.getUTCDate(),
    clock.getUTCHours(),
    clock.getUTCMinutes(),
    clock.getUTCSeconds(),
  ).getTime();
}

/** The chats as the archive keeps them. `me` is the name this phone's owner had in them, or empty. */
export function toArchived(chats: ImportedChat[], me: string, added = Date.now()): Omit<ArchivedChat, 'id'>[] {
  return chats.map((chat) => ({
    source: chat.source,
    title: chat.title,
    me,
    added,
    skipped: chat.skipped,
    messages: chat.messages.map(
      (m): ArchivedMessage => [toMillis(m.at, m.local), m.sender ?? '', m.text, m.attachments.join(',')],
    ),
  }));
}
