import type { ArchivedChat, ArchivedMessage, Source } from '../lock/archive';
import { deleteChunks, mimeOf, type FileRef } from '../lock/attachment-files';

import { FileTooLargeError, keepFile, type Source as FileSource } from './attachments';
import * as core from './core';
import { utf8Decode, utf8Encode } from './crypto';
import { t, mark } from './i18n';
import { entrySource, isZip, readEntry, zipEntries, type ZipEntry } from './zip-source';

// Chats exported from other messengers, read by the Erevos core (crates/erevos-import): Telegram's
// JSON export (result.json, or a .zip of the export's folder with its photos, videos and files)
// and WhatsApp's exported chat (.txt, or .zip with the media). The files a zip holds come in too,
// each kept sealed as a message's file is (lock/attachment-files.ts); the zip is read a piece at a
// time, so it may be larger than the phone's memory. Nothing here leaves the phone. Viber is not
// read yet.

/** A message as the export has it: `attachments` names the kind of each of its files, `paths` where each is in the export. */
export type ImportedMessage = {
  at: number | null;
  local: boolean;
  sender: string | null;
  text: string;
  attachments: string[];
  paths: string[];
  /** Each file once it is kept here, in the order of `attachments`; null for one that stayed behind. */
  kept?: (FileRef | null)[];
};
export type ImportedChat = { source: Source; title: string; skipped: number; messages: ImportedMessage[] };

/** The largest file brought in with a chat: a video can be larger than one sent (lib/attachments.ts MAX_FILE). */
export const MAX_IMPORTED_FILE = 1000 * 1000 * 1000;
// The chat's own text in a zip, read whole.
const MAX_TEXT = 256 * 1024 * 1024;

const SOURCES: Source[] = ['telegram', 'whatsapp', 'viber'];

export const SOURCE_LABELS: Record<Source, string> = { telegram: 'Telegram', whatsapp: 'WhatsApp', viber: 'Viber' };
const MEDIA_LABELS: Record<string, string> = { photo: mark('Photo'), video: mark('Video'), voice: mark('Voice message'), sticker: mark('Sticker'), file: mark('File') };

function checkedMessage(value: unknown): ImportedMessage | null {
  const m = (value ?? {}) as Record<string, unknown>;
  if (typeof m.text !== 'string') return null;
  return {
    at: typeof m.at === 'number' ? m.at : null,
    local: m.local === true,
    sender: typeof m.sender === 'string' ? m.sender : null,
    text: m.text,
    attachments: Array.isArray(m.attachments) ? m.attachments.filter((a): a is string => typeof a === 'string') : [],
    paths: Array.isArray(m.paths) ? m.paths.filter((p): p is string => typeof p === 'string') : [],
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

/** A picked export: its chats, and in a zip the files they name that it holds, by their place in the export. */
export type OpenedExport = { chats: ImportedChat[]; zip: FileSource | null; files: Map<string, ZipEntry> };

const folderOf = (name: string) => (name.includes('/') ? name.slice(0, name.lastIndexOf('/') + 1) : '');
const baseOf = (name: string) => name.slice(name.lastIndexOf('/') + 1);

/**
 * Reads a picked export: a zip a piece at a time, with the files its chats name; any other file
 * whole, up to `most` bytes. Throws if it is not one Erevos reads.
 */
export async function openExport(name: string, source: FileSource, most: number): Promise<OpenedExport> {
  if (!(await isZip(source))) {
    if (source.size > most) throw new FileTooLargeError();
    return { chats: await readExport(name, await source.read(0, source.size)), zip: null, files: new Map() };
  }
  const entries = await zipEntries(source);
  const named = (wanted: (base: string) => boolean) =>
    entries.filter((entry) => wanted(baseOf(entry.name))).sort((a, b) => a.name.split('/').length - b.name.split('/').length)[0];
  // Telegram's result.json, or WhatsApp's text: an iPhone names it _chat.txt, and the zip's own name holds the chat's.
  const text = named((base) => base === 'result.json') ?? named((base) => base === '_chat.txt') ?? named((base) => base.toLowerCase().endsWith('.txt'));
  if (!text) return { chats: await readExport(name, new Uint8Array()), zip: null, files: new Map() };
  const chats = await readExport(name, await readEntry(source, text, MAX_TEXT));
  // The paths are from the export's folder, where its text is; WhatsApp's may be anywhere in the zip.
  const folder = folderOf(text.name);
  const byPath = new Map(entries.map((entry) => [entry.name, entry]));
  const byName = new Map<string, ZipEntry>();
  for (const entry of entries) if (!byName.has(baseOf(entry.name))) byName.set(baseOf(entry.name), entry);
  const files = new Map<string, ZipEntry>();
  for (const chat of chats) {
    for (const message of chat.messages) {
      for (const path of message.paths) {
        const entry = byPath.get(folder + path) ?? (chat.source === 'whatsapp' ? byName.get(baseOf(path)) : undefined);
        if (entry && entry !== text) files.set(path, entry);
      }
    }
  }
  return { chats, zip: source, files };
}

/** The export with only its chat at `index`, and the files that chat names. */
export function oneChatOf(opened: OpenedExport, index: number): OpenedExport {
  const chat = opened.chats[index];
  const paths = new Set(chat.messages.flatMap((message) => message.paths));
  return { ...opened, chats: [chat], files: new Map([...opened.files].filter(([path]) => paths.has(path))) };
}

/** How many of the chats' files the export holds and how large they are together, and how many of them are too large to bring in. */
export function exportFiles(opened: OpenedExport): { count: number; bytes: number; tooLarge: number } {
  let count = 0;
  let bytes = 0;
  let tooLarge = 0;
  for (const entry of opened.files.values()) {
    if (entry.size > MAX_IMPORTED_FILE) tooLarge++;
    else {
      count++;
      bytes += entry.size;
    }
  }
  return { count, bytes, tooLarge };
}

const IMAGES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);

/**
 * Keeps the files the chats name that the export holds, each sealed in chunks of its own as a
 * message's file is, and gives each message its files (`kept`). One file the export names many
 * times is kept once. `progress` hears how many of how many are kept. If any cannot be kept, none
 * are.
 */
export async function keepExportFiles(opened: OpenedExport, progress?: (done: number, count: number) => void): Promise<ImportedChat[]> {
  const { zip } = opened;
  if (!zip) return opened.chats;
  const wanted = [...opened.files.entries()].filter(([, entry]) => entry.size <= MAX_IMPORTED_FILE);
  const kept = new Map<string, FileRef>();
  try {
    for (const [path, entry] of wanted) {
      const name = baseOf(path);
      const mime = mimeOf(name);
      kept.set(path, await keepFile(await entrySource(zip, entry), { name, mime, kind: IMAGES.has(mime) ? 'photo' : 'file' }, undefined, MAX_IMPORTED_FILE));
      progress?.(kept.size, wanted.length);
    }
  } catch (error) {
    for (const ref of kept.values()) await deleteChunks(ref.id, ref.count).catch(() => undefined);
    throw error;
  }
  return opened.chats.map((chat) => ({
    ...chat,
    messages: chat.messages.map((m) => ({ ...m, kept: m.attachments.map((_, i) => kept.get(m.paths[i] ?? '') ?? null) })),
  }));
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
    contact: '',
    messages: chat.messages.map((m): ArchivedMessage => {
      const files = (m.kept ?? []).filter((ref): ref is FileRef => ref !== null);
      // The kinds of the files that stayed behind, so the chat says where one was.
      const left = m.attachments.filter((_, i) => !m.kept?.[i]).join(',');
      const at = toMillis(m.at, m.local);
      return files.length > 0 ? [at, m.sender ?? '', m.text, left, files] : [at, m.sender ?? '', m.text, left];
    }),
  }));
}

/** What files a message had, as words: "Photo, File". */
export function mediaText(kinds: string): string {
  return kinds
    .split(',')
    .filter(Boolean)
    .map((kind) => t(MEDIA_LABELS[kind] ?? 'File'))
    .join(', ');
}

const pad = (n: number) => String(n).padStart(2, '0');

/** A message's time on this phone's clock, "2026-10-17 09:06", or nothing if the export did not say. */
export function shownTime(at: number): string {
  if (!at || !Number.isFinite(at)) return '';
  const d = new Date(at);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
