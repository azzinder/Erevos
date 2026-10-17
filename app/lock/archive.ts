import { randomBytes, toHex } from '../lib/crypto';

import { sealedFile, type Holder } from './sealed-file';

// Chats brought in from other messengers (lib/imports.ts): kept on this phone, sealed in the
// space they were brought into, and never sent anywhere. One sealed value per space in FILE
// (sealed-file.ts), padded to whole blocks of BLOCK bytes. The file's size tells about how much
// was brought in, but not into which space. Only the messages' words are kept: the photos and
// other files stay behind.

export type Source = 'telegram' | 'whatsapp' | 'viber';

/** One message: when (milliseconds, 0 if the export did not say), who wrote it, its text, and what files it had. */
export type ArchivedMessage = [at: number, sender: string, text: string, media: string];

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
  messages: ArchivedMessage[];
};

export type ArchiveData = { chats: ArchivedChat[] };

export const FILE = 'erevos-archive';
const BLOCK = 64 * 1024;
const EMPTY: ArchiveData = { chats: [] };
const SOURCES: Source[] = ['telegram', 'whatsapp', 'viber'];

const isText = (v: unknown): v is string => typeof v === 'string';
const isMessage = (m: unknown): m is ArchivedMessage =>
  Array.isArray(m) && m.length === 4 && typeof m[0] === 'number' && isText(m[1]) && isText(m[2]) && isText(m[3]);

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
    messages: v.messages.filter(isMessage),
  };
}

function checked(value: unknown): ArchiveData {
  const chats = (value as { chats?: unknown } | null)?.chats;
  return { chats: Array.isArray(chats) ? chats.map(checkedChat).filter((c): c is ArchivedChat => c !== null) : [] };
}

const store = sealedFile({ name: FILE, empty: EMPTY, checked, block: BLOCK });

/** A chat as the list shows it, without its messages. */
export type ChatSummary = Omit<ArchivedChat, 'messages'> & { count: number; first: number; last: number };

export class Archive {
  private data: ArchiveData;
  private readonly store: (data: ArchiveData) => Promise<void>;

  private constructor(data: ArchiveData, store: (data: ArchiveData) => Promise<void>) {
    this.data = data;
    this.store = store;
  }

  /** The chats brought into a space (or its hidden chats, `holder`), sealed with `key`. */
  static async open(holder: Holder, space: number, key: Uint8Array): Promise<Archive> {
    return new Archive(await store.load(holder, space, key), (data) => store.save(holder, space, key, data));
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

  private save(data: ArchiveData): Promise<void> {
    this.data = data;
    return this.store(data);
  }

  /** Keeps chats, each under a new id. Returns the ids. */
  async add(chats: Omit<ArchivedChat, 'id'>[]): Promise<string[]> {
    const added = chats.map((chat) => ({ ...chat, id: toHex(randomBytes(8)) }));
    await this.save({ chats: [...this.data.chats, ...added] });
    return added.map((chat) => chat.id);
  }

  /** Deletes a chat from the phone. */
  remove(id: string): Promise<void> {
    return this.save({ chats: this.data.chats.filter((chat) => chat.id !== id) });
  }
}
