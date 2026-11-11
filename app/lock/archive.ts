// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { randomBytes, toHex } from '../lib/crypto';
import { t } from '../lib/i18n';

import { deleteChunks, HISTORY_CHUNKS, isFileRef, type FileRef } from './attachment-files';
import { sealedFile, type Holder } from './sealed-file';

// Chats brought in from other messengers (lib/imports.ts): kept on this phone, sealed in the
// space they were brought into, and sent nowhere but where the owner shares them (below). One sealed value per space in FILE
// (sealed-file.ts), padded to whole blocks of BLOCK bytes. The file's size tells about how much
// was brought in, but not into which space. The photos, videos and other files that came with an
// export are kept as a message's file is, each in chunks of its own (lock/attachment-files.ts),
// with only where they are and their keys here; those that did not come are named.
//
// A chat can go on in Erevos: linked to one of the space's contacts, its messages show in the chat
// with them, ahead of the new ones. They are still only on this phone, and only to read, unless the
// owner shares them with that contact alone (lib/chat-share.ts): their Erevos keeps them so too,
// linked to this phone's owner, each in place of a copy it had of the same chat from them.
//
// Each change is made on what the phone holds then, after any change asked for before: a screen
// that opened the chats earlier never puts back one that another took out (a chat moved into hidden
// chats takes its imported chats along, lock/move-chat.ts), nor leaves out one put in meanwhile.

export type Source = 'telegram' | 'whatsapp' | 'viber';

/**
 * One message: when (milliseconds, 0 if the export did not say), who wrote it, its text, the kinds
 * of the files it had that stayed behind, and those kept here.
 */
export type ArchivedMessage = [at: number, sender: string, text: string, media: string, files?: FileRef[]];

export type ArchivedChat = {
  id: string;
  source: Source;
  title: string;
  /** The name the owner of this phone had in that chat, to tell their messages apart. Empty if none. */
  me: string;
  /** When it was brought in, milliseconds. */
  added: number;
  /** Entries in the export that were not messages (notices, calls), left out. */
  skipped: number;
  /** The identity key, hex, of the space's contact the chat goes on with in Erevos. Empty if none. */
  contact: string;
  /** Kept only in the chat with that contact: not listed among the Imported chats while the contact is there. */
  inChat?: true;
  /** Shared by a contact (lib/chat-share.ts): their identity key, hex, and the id the chat has on their phone. */
  shared?: { by: string; id: string };
  messages: ArchivedMessage[];
};

/** A message of an imported chat as the chat with its contact shows it. */
export type LinkedMessage = { at: number; sender: string; text: string; media: string; files: FileRef[]; mine: boolean; source: Source };

export type ArchiveData = { chats: ArchivedChat[] };

export const FILE = 'erevos-archive';
const BLOCK = 64 * 1024;
const EMPTY: ArchiveData = { chats: [] };
const SOURCES: Source[] = ['telegram', 'whatsapp', 'viber'];

const isText = (v: unknown): v is string => typeof v === 'string';
const isIdentity = (v: unknown): v is string => isText(v) && /^[0-9a-f]{64}$/.test(v);
const isMessage = (m: unknown): m is ArchivedMessage =>
  Array.isArray(m) &&
  (m.length === 4 || (m.length === 5 && Array.isArray(m[4]) && m[4].every((f) => isFileRef(f, HISTORY_CHUNKS)))) &&
  typeof m[0] === 'number' &&
  isText(m[1]) &&
  isText(m[2]) &&
  isText(m[3]);

function checkedChat(value: unknown): ArchivedChat | null {
  const v = (value ?? {}) as Partial<Record<keyof ArchivedChat, unknown>>;
  if (!isText(v.id) || !SOURCES.includes(v.source as Source) || !Array.isArray(v.messages)) return null;
  return {
    id: v.id,
    source: v.source as Source,
    title: isText(v.title) ? v.title : '',
    me: isText(v.me) ? v.me : '',
    added: typeof v.added === 'number' ? v.added : 0,
    skipped: typeof v.skipped === 'number' ? v.skipped : 0,
    contact: isIdentity(v.contact) ? v.contact : '',
    ...(v.inChat === true && isIdentity(v.contact) ? { inChat: true as const } : {}),
    ...(isShared(v.shared) ? { shared: { by: v.shared.by, id: v.shared.id } } : {}),
    messages: v.messages.filter(isMessage),
  };
}

const isShared = (v: unknown): v is { by: string; id: string } =>
  !!v && typeof v === 'object' && isIdentity((v as { by?: unknown }).by) && isText((v as { id?: unknown }).id) && /^[0-9a-f]{1,64}$/.test((v as { id: string }).id);

/**
 * The chats with `added`, each in place of the one shared by the same contact under the same id
 * on their phone, and the chats they replace.
 */
export function replaceShared(chats: ArchivedChat[], added: ArchivedChat[]): { chats: ArchivedChat[]; gone: ArchivedChat[] } {
  const same = (a: ArchivedChat, b: ArchivedChat) => !!a.shared && !!b.shared && a.shared.by === b.shared.by && a.shared.id === b.shared.id;
  const gone = chats.filter((chat) => added.some((one) => same(chat, one)));
  return { chats: [...chats.filter((chat) => !gone.includes(chat)), ...added], gone };
}

function checked(value: unknown): ArchiveData {
  const chats = (value as { chats?: unknown } | null)?.chats;
  return { chats: Array.isArray(chats) ? chats.map(checkedChat).filter((c): c is ArchivedChat => c !== null) : [] };
}

const store = sealedFile({ name: FILE, empty: EMPTY, checked, block: BLOCK });

let changes: Promise<unknown> = Promise.resolve();

// Who hears of chats deleted from an archive with their files, or replaced by a copy shared again:
// a shared chat whose files still come (lib/share-rounds.ts) stops filling them.
const goneListeners = new Set<(chats: string[]) => void>();

/** Calls `listener` with the ids of the chats an archive deletes, or replaces, each time. Returns how to stop. */
export function onChatsGone(listener: (chats: string[]) => void): () => void {
  goneListeners.add(listener);
  return () => {
    goneListeners.delete(listener);
  };
}

const told = (chats: string[]) => {
  if (chats.length > 0) goneListeners.forEach((listener) => listener(chats));
};

/** A chat as the list shows it, without its messages. */
export type ChatSummary = Omit<ArchivedChat, 'messages'> & { count: number; first: number; last: number };

export class Archive {
  private data: ArchiveData;
  private readonly load: () => Promise<ArchiveData>;
  private readonly store: (data: ArchiveData) => Promise<void>;

  private constructor(data: ArchiveData, load: () => Promise<ArchiveData>, store: (data: ArchiveData) => Promise<void>) {
    this.data = data;
    this.load = load;
    this.store = store;
  }

  /** The chats brought into a space (or its hidden chats, `holder`), sealed with `key`. */
  static async open(holder: Holder, space: number, key: Uint8Array): Promise<Archive> {
    const load = () => store.load(holder, space, key);
    return new Archive(await load(), load, (data) => store.save(holder, space, key, data));
  }

  /** Reads the chats again as the phone holds them now. */
  async reload(): Promise<void> {
    this.data = await this.load();
  }

  /** The chats, newest brought in first. */
  chats(): ChatSummary[] {
    return [...this.data.chats]
      .sort((a, b) => b.added - a.added)
      .map(({ messages, ...chat }) => {
        // A loop, not Math.min(...), which runs out of stack on a long chat.
        let first = Infinity;
        let last = 0;
        for (const [at] of messages) {
          if (at > 0 && at < first) first = at;
          if (at > last) last = at;
        }
        return { ...chat, count: messages.length, first, last };
      });
  }

  chat(id: string): ArchivedChat | undefined {
    return this.data.chats.find((chat) => chat.id === id);
  }

  // Changes the chats as the phone holds them now, after any change asked for before.
  private change(make: (data: ArchiveData) => ArchiveData): Promise<void> {
    const run = changes
      .catch(() => undefined)
      .then(async () => {
        const data = make(await this.load());
        this.data = data;
        await this.store(data);
      });
    changes = run;
    return run;
  }

  /**
   * The messages of the chats that go on with `contact`, oldest first. A message the export gave
   * no time stays where its chat had it.
   */
  linked(contact: string): LinkedMessage[] {
    const placed = this.data.chats
      .filter((chat) => contact !== '' && chat.contact === contact)
      .flatMap(({ me, source, messages }) => {
        let after = 0;
        return messages.map(([at, sender, text, media, files = []]) => {
          after = at > 0 ? at : after;
          return { after, message: { at, sender, text, media, files, mine: me !== '' && sender === me, source } };
        });
      });
    return placed
      .map((entry, index) => ({ ...entry, index }))
      .sort((a, b) => a.after - b.after || a.index - b.index)
      .map(({ message }) => message);
  }

  /** The chats that go on with `contact`, as the list shows them. */
  linkedChats(contact: string): ChatSummary[] {
    return this.chats().filter((chat) => contact !== '' && chat.contact === contact);
  }

  /**
   * Lets a chat go on with one of the space's contacts (its identity key, hex), or with none
   * (empty), and keeps it only in their chat (`inChat`) or among the Imported chats too. One that
   * goes on with no one is always among them.
   */
  link(id: string, contact: string, inChat = false): Promise<void> {
    if (contact !== '' && !isIdentity(contact)) return Promise.reject(new Error(t('Not a contact.')));
    return this.change((data) => ({
      chats: data.chats.map((chat) => {
        if (chat.id !== id) return chat;
        const { inChat: _was, ...rest } = chat;
        return { ...rest, contact, ...(inChat && contact ? { inChat: true as const } : {}) };
      }),
    }));
  }

  /** Keeps chats, each under a new id. Returns the ids. */
  async add(chats: Omit<ArchivedChat, 'id'>[]): Promise<string[]> {
    const added = chats.map((chat) => ({ ...chat, id: toHex(randomBytes(8)) }));
    await this.change((data) => ({ chats: [...data.chats, ...added] }));
    return added.map((chat) => chat.id);
  }

  /**
   * Keeps chats a contact shared (lib/chat-share.ts), each under a new id, in place of any copy of
   * the same one from them, whose files go. Returns the ids.
   */
  async keepShared(chats: Omit<ArchivedChat, 'id'>[]): Promise<string[]> {
    const added = chats.map((chat) => ({ ...chat, id: toHex(randomBytes(8)) }));
    const kept = new Set(added.flatMap(({ messages }) => messages.flatMap(([, , , , files = []]) => files.map((ref) => ref.id))));
    const files = new Map<string, number>();
    const replaced: string[] = [];
    await this.change((data) => {
      const { chats: now, gone } = replaceShared(data.chats, added);
      for (const chat of gone) for (const [, , , , old = []] of chat.messages) for (const ref of old) if (!kept.has(ref.id)) files.set(ref.id, ref.count);
      replaced.push(...gone.map((chat) => chat.id));
      return { chats: now };
    });
    told(replaced);
    for (const [file, count] of files) await deleteChunks(file, count).catch(() => undefined);
    return added.map((chat) => chat.id);
  }

  /**
   * Names the files `gone` (by their id) in the chats `ids` as ones that stayed behind, as an import
   * names those it did not have: of a share whose files no longer come (lib/share-rounds.ts).
   */
  leaveBehind(ids: readonly string[], gone: ReadonlySet<string>): Promise<void> {
    if (ids.length === 0 || gone.size === 0) return Promise.resolve();
    return this.change((data) => ({
      chats: data.chats.map((chat) => {
        if (!ids.includes(chat.id)) return chat;
        const messages = chat.messages.map((message): ArchivedMessage => {
          const [at, sender, text, media, files = []] = message;
          const left = files.filter((ref) => gone.has(ref.id));
          if (left.length === 0) return message;
          const kept = files.filter((ref) => !gone.has(ref.id));
          const kinds = [media, ...left.map((ref) => ref.kind)].filter(Boolean).join(',');
          return kept.length > 0 ? [at, sender, text, kinds, kept] : [at, sender, text, kinds];
        });
        return { ...chat, messages };
      }),
    }));
  }

  /** Deletes a chat from the phone, with its files. */
  async remove(id: string): Promise<void> {
    const files = new Map<string, number>();
    await this.change((data) => {
      for (const [, , , , kept = []] of data.chats.find((chat) => chat.id === id)?.messages ?? []) for (const ref of kept) files.set(ref.id, ref.count);
      return { chats: data.chats.filter((chat) => chat.id !== id) };
    });
    told([id]);
    for (const [file, count] of files) await deleteChunks(file, count).catch(() => undefined);
  }

  /** Puts chats in as they are, under their own ids, in place of any with the same id (lock/move-chat.ts). */
  putIn(chats: ArchivedChat[]): Promise<void> {
    return this.change((data) => ({ chats: [...data.chats.filter((chat) => !chats.some((put) => put.id === chat.id)), ...chats] }));
  }

  /** Takes chats out, leaving their files, which went along with them (lock/move-chat.ts). */
  takeOut(ids: string[]): Promise<void> {
    return this.change((data) => ({ chats: data.chats.filter((chat) => !ids.includes(chat.id)) }));
  }
}
