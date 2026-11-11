// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import type { Archive, ArchivedChat, ArchivedMessage, Source } from '../lock/archive';
import { deleteChunks, type FileMeta, type FileRef, type SharedMark } from '../lock/attachment-files';

import { doneTaking, FileMissingError, offerRef, readOffer, takeFile, takeOffRelay, uploadFile, type FileOffer, type TakenFiles } from './attachments';
import { utf8Decode, utf8Encode } from './crypto';
import { plural, t } from './i18n';
import { MAX_IMPORTED_FILE, SOURCE_LABELS } from './imports';
import { holdChunks, releaseChunks } from './pending-chunks';
import type { Relay } from './relay';

// Sharing the chats imported here (lib/imports.ts, lock/archive.ts) that go on with a contact, with
// that contact alone, once the owner says so (app/chat.tsx, from the chat's details or from
// Settings → Imported chats): all of them together, every message, and every photo, video, voice
// message and file they kept. Never with a group, and never with anyone else.
//
// They go as the file of ONE message, as a photo or file goes (lib/attachments.ts): a .json of
// their messages, marked `history` with where they came from and how many messages they have. The
// files they kept are not packed in it: each goes to our relay's file store in the sealed chunks it
// is kept in here already (uploadFile), and the .json says where each one is and its key. So each
// may be as large as an imported one (1 GB), nothing is sealed again or held whole in memory, and
// the .json stays small, well within what a message's file may be (100 MB). All of it is end-to-end
// encrypted: the .json under a key of its own that only the message gives, the files' keys only in
// the .json.
//
// The contact's Erevos keeps them at once, files and all, among the imported chats of the place the
// chat is in (its space, or its hidden chats), linked to the one who shared them and kept only in
// their chat, the sides swapped: what the sharer wrote shows as theirs, and in a chat of two, what
// the other one wrote as the contact's own. Shared again, a chat takes the place of the copy kept
// before. An Erevos from before shows the .json as a file like any other ("Chat from Telegram.json").

/** What the .json says it is. */
export const PACK_KIND = 'erevos-shared-chats';
const VERSION = 1;
const SOURCES: Source[] = ['telegram', 'whatsapp', 'viber'];
// The most chats one file holds, and the longest name of one.
const MOST_CHATS = 100;
const MOST_TITLE = 200;
// The ids of a file's chunks on the relay, hex, each this long.
const ID_HEX = 48;

/** A message of a shared chat as it goes: its files as where they wait on the relay. */
export type PackedMessage = [at: number, sender: string, text: string, media: string, files?: FileOffer[]];

/** A shared chat as it goes. `id` is the one it has on the sharer's phone; `me`, the sharer's name in it. */
export type PackedChat = { id: string; source: Source; title: string; me: string; skipped: number; messages: PackedMessage[] };

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

// The files the chats keep here, each once.
function keptFiles(chats: ArchivedChat[]): FileRef[] {
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

/**
 * The chats as they go: each file put on the relay (`offers`, by its id here) as where it is, and
 * any other named as one that stayed behind.
 */
export function packChats(chats: ArchivedChat[], offers: ReadonlyMap<string, FileOffer>): PackedChat[] {
  return chats.map(({ id, source, title, me, skipped, messages }) => ({
    id,
    source,
    title,
    me,
    skipped,
    messages: messages.map(([at, sender, text, media, kept = []]): PackedMessage => {
      const going = kept.map((ref) => offers.get(ref.id)).filter((offer): offer is FileOffer => offer !== undefined);
      const left = [media, ...kept.filter((ref) => !offers.has(ref.id)).map((ref) => ref.kind)].filter(Boolean).join(',');
      return going.length > 0 ? [at, sender, text, left, going] : [at, sender, text, left];
    }),
  }));
}

/** Where the chats came from, and how many messages they have: what their file says of itself. */
export function markOf(chats: { source: Source; messages: unknown[] }[]): SharedMark {
  return { from: SOURCES.filter((source) => chats.some((chat) => chat.source === source)), count: chats.reduce((sum, chat) => sum + chat.messages.length, 0) };
}

/** The file the chats go in. */
export function packBytes(chats: PackedChat[]): Uint8Array {
  return utf8Encode(JSON.stringify({ kind: PACK_KIND, v: VERSION, chats }));
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
 * Puts the files the chats kept on our relay (`own`), each as it is kept here, and packs the chats
 * with where each one is. A file whose chunks are no longer here is named as one that stayed
 * behind. `progress` hears how far it is, in hundredths. If the relay cannot take one, those it
 * took are taken off it again, and nothing goes. Returns the file to send, its mark, and the files
 * put on the relay (unshare, should the message not go).
 */
export async function shareChats(own: Relay, chats: ArchivedChat[], progress?: (percent: number) => void): Promise<{ bytes: Uint8Array; mark: SharedMark; offers: FileOffer[] }> {
  const files = keptFiles(chats);
  const total = Math.max(1, files.reduce((sum, ref) => sum + ref.count, 0));
  const offers = new Map<string, FileOffer>();
  let done = 0;
  try {
    for (const ref of files) {
      try {
        offers.set(ref.id, await uploadFile(own, ref, (n) => progress?.(Math.floor(((done + n) / total) * 100))));
      } catch (error) {
        if (!(error instanceof FileMissingError)) throw error;
      }
      done += ref.count;
    }
  } catch (error) {
    await unshare(own, [...offers.values()]);
    throw error;
  }
  return { bytes: packBytes(packChats(chats, offers)), mark: markOf(chats), offers: [...offers.values()] };
}

/** Takes the files shareChats put on our relay off it again, when the chats did not go after all. */
export async function unshare(own: Relay, offers: FileOffer[]): Promise<void> {
  for (const offer of offers) await takeOffRelay(own, offer.ids).catch(() => undefined);
}

function readMessage(value: unknown): PackedMessage | null {
  if (!Array.isArray(value) || value.length < 4) return null;
  const [at, sender, text, media, files] = value as unknown[];
  if (typeof at !== 'number' || !Number.isFinite(at) || !isText(sender) || !isText(text) || !isText(media)) return null;
  // Only files on a relay's file store, each as large as an imported one at most; any other is named as a file that stayed behind.
  const offers = Array.isArray(files) ? files.map((file) => readOffer(file, MAX_IMPORTED_FILE)) : [];
  const going = offers.filter((offer): offer is FileOffer => !!offer && offer.via === undefined && !offer.history);
  const left = [media, ...offers.filter((offer) => !offer || offer.via !== undefined || offer.history).map(() => 'file')].filter(Boolean).join(',');
  return going.length > 0 ? [at, sender, text, left, going] : [at, sender, text, left];
}

function readChat(value: unknown): PackedChat | null {
  const c = (value ?? {}) as Record<string, unknown>;
  if (!isText(c.id) || !/^[0-9a-f]{1,64}$/.test(c.id) || !SOURCES.includes(c.source as Source) || !Array.isArray(c.messages)) return null;
  return {
    id: c.id,
    source: c.source as Source,
    title: isText(c.title) ? c.title.slice(0, MOST_TITLE) : '',
    me: isText(c.me) ? c.me : '',
    skipped: Number.isSafeInteger(c.skipped) && (c.skipped as number) >= 0 ? (c.skipped as number) : 0,
    messages: c.messages.map(readMessage).filter((m): m is PackedMessage => m !== null),
  };
}

/** The chats a shared file holds; none when it is not one. What a later Erevos adds to it is left out. */
export function readPack(bytes: Uint8Array): PackedChat[] {
  let value: unknown;
  try {
    value = JSON.parse(utf8Decode(bytes));
  } catch {
    return [];
  }
  const v = value as { kind?: unknown; v?: unknown; chats?: unknown } | null;
  if (!v || v.kind !== PACK_KIND || typeof v.v !== 'number' || !Array.isArray(v.chats)) return [];
  return v.chats
    .slice(0, MOST_CHATS)
    .map(readChat)
    .filter((chat): chat is PackedChat => chat !== null);
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

/** The files the shared chats name, each once, by where it waits. */
export function packedFiles(chats: PackedChat[]): FileOffer[] {
  const offers = new Map<string, FileOffer>();
  for (const chat of chats) for (const [, , , , files = []] of chat.messages) for (const offer of files) offers.set(offer.ids, offer);
  return [...offers.values()];
}

/**
 * The chats a contact shared (`by`, their identity key, hex; `name`, theirs here) as this phone
 * keeps them: linked to them, kept only in their chat, the sides swapped (theirSide), and each file
 * as `taken` has it, by where it waited; one not there is named as one that stayed behind. A chat
 * of two is named for the one who shared it.
 */
export function receivedChats(chats: PackedChat[], by: string, name: string, taken: ReadonlyMap<string, FileRef>, added = Date.now()): Omit<ArchivedChat, 'id'>[] {
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
        const kept = files.map((offer) => taken.get(offer.ids)).filter((ref): ref is FileRef => ref !== undefined);
        const left = [media, ...files.filter((offer) => !taken.has(offer.ids)).map((offer) => offer.kind)].filter(Boolean).join(',');
        return kept.length > 0 ? [at, sender, text, left, kept] : [at, sender, text, left];
      }),
    };
  });
}

/**
 * Keeps the chats a contact shared, from the file they came in (`pack`, taken already), with their
 * files, in `archive`, the place's own. Each file is taken through our relay (`own`), every chunk
 * checked, and left on the relay until all are kept; then it goes from there, or stays for the
 * account's other devices, as `leave` says, as a message's file does (lib/attachments.ts takeFile).
 * Taken by itself (`itself`), never straight from where the sharer chose (takesItself). If one
 * cannot be taken, none is kept, and it can be tried again. `progress` hears how far, in hundredths.
 * Returns the ids of the chats kept.
 */
export async function keepShared(
  own: Relay | null,
  pack: Uint8Array,
  archive: Archive,
  from: { by: string; name: string },
  { leave, itself = false, progress }: { leave?: boolean | TakenFiles; itself?: boolean; progress?: (percent: number) => void } = {},
): Promise<string[]> {
  const chats = readPack(pack);
  if (chats.length === 0) throw new Error(t('There are no messages in that file.'));
  const offers = packedFiles(chats);
  const total = Math.max(1, offers.reduce((sum, offer) => sum + offer.ids.length / ID_HEX, 0));
  const taken = new Map<string, FileRef>();
  // Noted as pending while they come, so an Erevos that stops in the middle deletes them at its next start.
  const held: string[] = [];
  let done = 0;
  let ids: string[];
  try {
    for (const offer of offers) {
      const ref = offerRef(offer);
      held.push(ref.id);
      await holdChunks(ref.id, ref.count);
      taken.set(offer.ids, await takeFile(own, ref, (n) => progress?.(Math.floor(((done + n) / total) * 100)), true, null, itself));
      done += ref.count;
    }
    // No longer pending once about to be kept: a stop between the two leaves files no chat names, never a chat whose files went.
    await releaseChunks(held);
    ids = await archive.keepShared(receivedChats(chats, from.by, from.name, taken));
  } catch (error) {
    for (const ref of taken.values()) await deleteChunks(ref.id, ref.count).catch(() => undefined);
    await releaseChunks(held).catch(() => undefined);
    throw error;
  }
  if (own) for (const offer of offers) await doneTaking(own, { relay: offer.relay, ids: offer.ids }, leave);
  return ids;
}
