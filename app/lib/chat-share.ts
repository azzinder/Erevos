// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import type { Archive, ArchivedChat, ArchivedMessage, Source } from '../lock/archive';
import { cleanFileName, cleanMime, HISTORY_CHUNKS, isFileMeta, newFileId, type FileMeta, type FileRef, type SharedMark } from '../lock/attachment-files';

import { chunkPlan } from './attachments';
import { utf8Decode, utf8Encode } from './crypto';
import { plural, t } from './i18n';
import { MAX_IMPORTED_FILE, SOURCE_LABELS } from './imports';

// Sharing the chats imported here (lib/imports.ts, lock/archive.ts) that go on with a contact, with
// that contact alone, once the owner says so (app/chat.tsx, from the chat's details or from
// Settings → Imported chats): all of them together, every message, and every photo, video, voice
// message and file they kept. Never with a group, and never with anyone else.
//
// Their words go as the file of ONE message, as a photo or file goes (lib/attachments.ts): a .json
// of their messages (the pack), marked `history` with where they came from and how many messages
// they have. The files they kept are not packed in: the pack names each one, with its key, by its
// place among the share's files, and their chunks follow in rounds through our relay
// (lib/share-rounds.ts), each as it is kept here already, so nothing is sealed again or held whole
// in memory, and a share of any size never needs more room on the relay than a few rounds. A file
// may be as large as an imported one (4 GB). All of it is end-to-end encrypted: the pack under a key
// of its own that only the message gives, the files' keys only in the pack, where their chunks wait
// only in messages between the two.
//
// The contact's Erevos keeps the chats at once, among the imported chats of the place the chat is
// in (its space, or its hidden chats), linked to the one who shared them and kept only in their chat,
// the sides swapped: what the sharer wrote shows as theirs, and in a chat of two, what the other one
// wrote as the contact's own. Their files fill in as their rounds come. Shared again, a chat takes
// the place of the copy kept before. An Erevos from before shows the pack as a file like any other
// ("Chat from Telegram.json"), and none of the rounds.

/** What the .json says it is. */
export const PACK_KIND = 'erevos-shared-chats';
const VERSION = 1;
const SOURCES: Source[] = ['telegram', 'whatsapp', 'viber'];
// The most chats one file holds, and the longest name of one; the most files it names.
const MOST_CHATS = 100;
const MOST_TITLE = 200;
const MOST_FILES = 1_000_000;
const SHARE_ID = /^[0-9a-f]{32}$/;
const KEY = /^[0-9a-f]{64}$/;

/** A file of the shared chats as the pack names it: what it is, its key, and how big its chunks are, which come in rounds. */
export type PackedFile = FileMeta & { key: string; chunk: number };

/** A message of a shared chat as it goes: its files by their place among the pack's. */
export type PackedMessage = [at: number, sender: string, text: string, media: string, files?: number[]];

/** A shared chat as it goes. `id` is the one it has on the sharer's phone; `me`, the sharer's name in it. */
export type PackedChat = { id: string; source: Source; title: string; me: string; skipped: number; messages: PackedMessage[] };

/**
 * What the pack holds: the share's id (`share`), which its rounds say; its files, in the order
 * their chunks come, null for one that does not read; and the chats.
 */
export type Pack = { share: string; files: (PackedFile | null)[]; chats: PackedChat[] };

const isText = (v: unknown): v is string => typeof v === 'string';

/** The chats imported here that go on with `contact` and can be shared with them: not those a contact shared. */
export function sharable(archive: Archive, contact: string): ArchivedChat[] {
  return archive
    .linkedChats(contact)
    .map((chat) => archive.chat(chat.id))
    .filter((chat): chat is ArchivedChat => !!chat && !chat.shared);
}

// The contact whose chat, once open, asks to share with them (from Settings → Imported chats):
// handed over in memory, never in the screen's address, which any app or web page can open.
let asked = '';

/** Asks the chat with `contact` (identity key, hex), once it opens, to share the chats imported with them. */
export function askToShare(contact: string): void {
  asked = contact;
}

/** Whether the chat with `contact` was asked to share, once: asked, it is not asked again. */
export function takeAskToShare(contact: string): boolean {
  if (!contact || asked !== contact) return false;
  asked = '';
  return true;
}

/** The files the chats keep here, each once, in the order they first come in them. */
export function keptFiles(chats: ArchivedChat[]): FileRef[] {
  const files = new Map<string, FileRef>();
  for (const chat of chats) for (const [, , , , kept = []] of chat.messages) for (const ref of kept) if (!ref.from) files.set(ref.id, ref);
  return [...files.values()];
}

/** How much sharing the chats sends: how many messages, and about how many bytes, their files with them. */
export function shareSize(chats: ArchivedChat[]): { count: number; bytes: number } {
  const count = chats.reduce((sum, chat) => sum + chat.messages.length, 0);
  const words = utf8Encode(JSON.stringify(chats.map((chat) => chat.messages.map(([at, sender, text, media]) => [at, sender, text, media])))).length;
  return { count, bytes: words + keptFiles(chats).reduce((sum, ref) => sum + ref.size, 0) };
}

// What the pack says of a file: what it is, its key, and the size of its chunks.
function packedFile({ name, mime, kind, size, w, h, key, chunk }: FileRef): PackedFile {
  return { name, mime, kind, size, ...(w !== undefined ? { w } : {}), ...(h !== undefined ? { h } : {}), key, chunk };
}

/**
 * The pack of the chats, for the share `share`: the files that go (`files`, kept here whole, in
 * the order their chunks are to come) named by their place among them, and any other named as one
 * that stayed behind.
 */
export function packChats(share: string, chats: ArchivedChat[], files: FileRef[]): Pack {
  const place = new Map(files.map((ref, i) => [ref.id, i]));
  return {
    share,
    files: files.map(packedFile),
    chats: chats.map(({ id, source, title, me, skipped, messages }) => ({
      id,
      source,
      title,
      me,
      skipped,
      messages: messages.map(([at, sender, text, media, kept = []]): PackedMessage => {
        const going = kept.map((ref) => place.get(ref.id)).filter((n): n is number => n !== undefined);
        const left = [media, ...kept.filter((ref) => !place.has(ref.id)).map((ref) => ref.kind)].filter(Boolean).join(',');
        return going.length > 0 ? [at, sender, text, left, going] : [at, sender, text, left];
      }),
    })),
  };
}

/** Where the chats came from, and how many messages they have: what their file says of itself. */
export function markOf(chats: { source: Source; messages: unknown[] }[]): SharedMark {
  return { from: SOURCES.filter((source) => chats.some((chat) => chat.source === source)), count: chats.reduce((sum, chat) => sum + chat.messages.length, 0) };
}

/** The file the chats go in. */
export function packBytes(pack: Pack): Uint8Array {
  return utf8Encode(JSON.stringify({ kind: PACK_KIND, v: VERSION, share: pack.share, files: pack.files, chats: pack.chats }));
}

/** Telegram, or Telegram and Viber. */
export function sourcesText(from: Source[]): string {
  return from.map((source) => SOURCE_LABELS[source]).join(` ${t('and')} `);
}

/** What the file says of itself: a .json named for where its chats came from, as an Erevos from before shows it. */
export function packMeta(mark: SharedMark): Omit<FileMeta, 'size'> {
  return { name: `${t('Chat from {source}', { source: sourcesText(mark.from) })}.json`, mime: 'application/json', kind: 'file', history: mark };
}

/** The line in the chat where the shared chats went or came. */
export function sharedLine(mark: SharedMark, mine: boolean, name: string): string {
  const source = sourcesText(mark.from);
  return mine
    ? plural(mark.count, 'You shared a chat from {source}: {n} message', 'You shared a chat from {source}: {n} messages', { source })
    : plural(mark.count, '{name} shared a chat from {source}: {n} message', '{name} shared a chat from {source}: {n} messages', { name, source });
}

/**
 * A file the pack names, or null when it does not read: one an imported chat may keep (4 GB at
 * most, in HISTORY_CHUNKS), never a message's file, whose chunks are planned as any file's.
 */
export function readPackedFile(value: unknown): PackedFile | null {
  const v = value as Partial<PackedFile> | null;
  if (!v || typeof v !== 'object') return null;
  const meta = {
    name: cleanFileName(typeof v.name === 'string' ? v.name : ''),
    mime: cleanMime(v.mime),
    kind: v.kind,
    size: v.size,
    ...(v.w !== undefined ? { w: v.w } : {}),
    ...(v.h !== undefined ? { h: v.h } : {}),
  };
  if (!isFileMeta(meta) || meta.size > MAX_IMPORTED_FILE || typeof v.key !== 'string' || !KEY.test(v.key)) return null;
  const plan = chunkPlan(meta.size);
  if (v.chunk !== plan.chunk || plan.count > HISTORY_CHUNKS) return null;
  return { ...meta, key: v.key, chunk: plan.chunk };
}

/** How many chunks a file the pack names has. */
export const chunksOf = (file: Pick<PackedFile, 'size'>): number => chunkPlan(file.size).count;

/** Where a file the pack names is kept here once its chunks came: under a new id, with its key. */
export function refOf(file: PackedFile): FileRef {
  return { ...file, id: newFileId(), count: chunksOf(file) };
}

const isPlace = (n: unknown, files: number): n is number => Number.isSafeInteger(n) && (n as number) >= 0 && (n as number) < files;

function readMessage(value: unknown, files: (PackedFile | null)[]): PackedMessage | null {
  if (!Array.isArray(value) || value.length < 4) return null;
  const [at, sender, text, media, named] = value as unknown[];
  if (typeof at !== 'number' || !Number.isFinite(at) || !isText(sender) || !isText(text) || !isText(media)) return null;
  // Its files by their place among the pack's; any other is named as a file that stayed behind.
  const places = Array.isArray(named) ? named : [];
  const going = places.filter((n): n is number => isPlace(n, files.length) && files[n] !== null);
  const left = [media, ...places.filter((n) => !isPlace(n, files.length) || files[n] === null).map(() => 'file')].filter(Boolean).join(',');
  return going.length > 0 ? [at, sender, text, left, going] : [at, sender, text, left];
}

function readChat(value: unknown, files: (PackedFile | null)[]): PackedChat | null {
  const c = (value ?? {}) as Record<string, unknown>;
  if (!isText(c.id) || !/^[0-9a-f]{1,64}$/.test(c.id) || !SOURCES.includes(c.source as Source) || !Array.isArray(c.messages)) return null;
  return {
    id: c.id,
    source: c.source as Source,
    title: isText(c.title) ? c.title.slice(0, MOST_TITLE) : '',
    me: isText(c.me) ? c.me : '',
    skipped: Number.isSafeInteger(c.skipped) && (c.skipped as number) >= 0 ? (c.skipped as number) : 0,
    messages: c.messages.map((m) => readMessage(m, files)).filter((m): m is PackedMessage => m !== null),
  };
}

/**
 * What a shared file holds; null when it is not one. What a later Erevos adds to it is left out.
 * Its files come only with a share's id; one that does not read is null, in its place.
 */
export function readPack(bytes: Uint8Array): Pack | null {
  let value: unknown;
  try {
    value = JSON.parse(utf8Decode(bytes));
  } catch {
    return null;
  }
  const v = value as { kind?: unknown; v?: unknown; share?: unknown; files?: unknown; chats?: unknown } | null;
  if (!v || v.kind !== PACK_KIND || typeof v.v !== 'number' || !Array.isArray(v.chats)) return null;
  const share = typeof v.share === 'string' && SHARE_ID.test(v.share) ? v.share : '';
  const files = share && Array.isArray(v.files) && v.files.length <= MOST_FILES ? v.files.map(readPackedFile) : [];
  return {
    share,
    files,
    chats: v.chats
      .slice(0, MOST_CHATS)
      .map((chat) => readChat(chat, files))
      .filter((chat): chat is PackedChat => chat !== null),
  };
}

/**
 * Who the one it was shared with is among a shared chat's senders: in a chat of two, the one who is
 * not the sharer; in a group, or when the sharer was not one of them, no one, and each keeps their name.
 */
export function theirSide(chat: Pick<PackedChat, 'me' | 'messages'>): string {
  if (!chat.me) return '';
  const others = new Set<string>();
  for (const [, sender] of chat.messages) if (sender && sender !== chat.me) others.add(sender);
  return others.size === 1 ? [...others][0] : '';
}

/**
 * The chats a contact shared (`by`, their identity key, hex; `name`, theirs here) as this phone
 * keeps them: linked to them, kept only in their chat, the sides swapped (theirSide), and each file
 * as `refs` keeps it here, by its place among the pack's, its chunks still to come; one with none
 * is named as one that stayed behind. A chat of two is named for the one who shared it.
 */
export function receivedChats({ chats, files: packed }: Pick<Pack, 'chats' | 'files'>, by: string, name: string, refs: readonly (FileRef | null)[], added = Date.now()): Omit<ArchivedChat, 'id'>[] {
  return chats.map((chat) => {
    const me = theirSide(chat);
    return {
      source: chat.source,
      title: me ? name || chat.title : chat.title,
      me,
      added,
      skipped: chat.skipped,
      contact: by,
      inChat: true as const,
      shared: { by, id: chat.id },
      messages: chat.messages.map(([at, sender, text, media, files = []]): ArchivedMessage => {
        const kept = files.map((n) => refs[n] ?? null).filter((ref): ref is FileRef => ref !== null);
        const left = [media, ...files.filter((n) => !refs[n]).map((n) => packed[n]?.kind ?? 'file')].filter(Boolean).join(',');
        return kept.length > 0 ? [at, sender, text, left, kept] : [at, sender, text, left];
      }),
    };
  });
}
