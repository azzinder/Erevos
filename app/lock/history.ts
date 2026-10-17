import { randomBytes, toHex } from '../lib/crypto';

import { sealedFile, sealedSize, type Holder } from './sealed-file';

// The messages each chat keeps on the phone: a space's own chat, and its hidden chats, each in one
// sealed value of FILE (sealed-file.ts). Every value is exactly SIZE bytes, used or not, so the
// file tells neither which chats are used nor how much anyone writes. When a chat's messages no
// longer fit, the oldest go: about a thousand short messages fit.
//
// Only chats with contacts are kept. Messages over the radio link are not: a link's id lasts as
// long as the link, and nothing is encrypted there yet.
//
// Each message keeps its mark: ours, whether it came to their phone and was read there (lib/e2e.ts
// carries what their phone says); theirs, whether it was read here.
//
// A disappearing message (lib/e2e.ts carries the chat's timer) waits, with how long it lasts,
// until it is read: theirs when it shows here, ours when their phone says it read it. From then
// on it is kept with the time it goes, and `expire` deletes it once that has passed: while the
// chat is open, or when it next opens.

/** Ours: the relay took it (0), it came to their phone (1), they read it (2). Theirs: read here (2) or not (0). */
export type Mark = 0 | 1 | 2;

/**
 * One message: when (milliseconds), whether this phone sent it, its text, its tag, when it
 * disappears (milliseconds, 0 if not, or not yet), how long it lasts once read (seconds, 0 if it
 * does not disappear or its time has started), and its mark. Zeros at the end are left out.
 */
export type Kept = [at: number, mine: 0 | 1, text: string, tag: string, until?: number, lasts?: number, mark?: Mark];

/** Each chat's messages, oldest first. */
export type HistoryData = { chats: Record<string, Kept[]> };

/**
 * A message as the chat shows it. Its tag names it on both phones, so either can ask the other
 * to delete it: the sender makes it (newTag) and it travels inside the message.
 */
export type Message = {
  peer: string;
  text: string;
  mine: boolean;
  at: number;
  tag: string;
  until?: number;
  lasts?: number;
  mark?: Mark;
};

type Fields = Omit<Message, 'peer'>;

function pack({ at, mine, text, tag, until = 0, lasts = 0, mark = 0 }: Fields): Kept {
  const kept: Kept = [at, mine ? 1 : 0, text, tag, until, until ? 0 : lasts, mark];
  while (kept.length > 4 && !kept[kept.length - 1]) kept.pop();
  return kept;
}

function unpack([at, mine, text, tag, until = 0, lasts = 0, mark = 0]: Kept): Fields {
  return { at, mine: mine === 1, text, tag, until, lasts, mark };
}

const count = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : 0);

const TAG = /^[0-9a-f]{12}$/;

export const newTag = () => toHex(randomBytes(6));
export const isTag = (value: unknown): value is string => typeof value === 'string' && TAG.test(value);

export const FILE = 'erevos-history';
export const SIZE = 64 * 1024;

const EMPTY: HistoryData = { chats: {} };

// A message kept before tags has none: it gets one here, known to this phone only.
function checkedKept(m: unknown): Kept | null {
  if (!Array.isArray(m) || m.length < 3 || typeof m[0] !== 'number' || (m[1] !== 0 && m[1] !== 1) || typeof m[2] !== 'string') {
    return null;
  }
  const mark = m[6] === 1 || m[6] === 2 ? m[6] : 0;
  return pack({ at: m[0], mine: m[1] === 1, text: m[2], tag: isTag(m[3]) ? m[3] : newTag(), until: count(m[4]), lasts: count(m[5]), mark });
}

function checked(value: unknown): HistoryData {
  const chats: Record<string, Kept[]> = {};
  const stored = (value as { chats?: unknown } | null)?.chats;
  if (stored && typeof stored === 'object') {
    for (const [peer, list] of Object.entries(stored)) {
      const kept = Array.isArray(list) ? list.map(checkedKept).filter((m): m is Kept => m !== null) : [];
      if (kept.length > 0) chats[peer] = kept;
    }
  }
  return { chats };
}

const store = sealedFile({ name: FILE, empty: EMPTY, checked, block: SIZE, fixed: true });

/** The data with its oldest messages left out until it fits in SIZE. */
export function fitted(data: HistoryData): HistoryData {
  const chats: Record<string, Kept[]> = {};
  for (const [peer, list] of Object.entries(data.chats)) if (list.length > 0) chats[peer] = [...list];
  while (sealedSize({ chats }) > SIZE) {
    let oldest: string | null = null;
    for (const peer of Object.keys(chats)) if (oldest === null || chats[peer][0][0] < chats[oldest][0][0]) oldest = peer;
    if (oldest === null) break;
    chats[oldest].shift();
    if (chats[oldest].length === 0) delete chats[oldest];
  }
  return { chats };
}

/** One chat's history, kept as messages come and go. */
export class History {
  private data: HistoryData;
  private readonly store: (data: HistoryData) => Promise<void>;

  private constructor(data: HistoryData, store: (data: HistoryData) => Promise<void>) {
    this.data = data;
    this.store = store;
  }

  /** The space's own chat, or its hidden chats (`holder`), sealed with `key`. */
  static async open(holder: Holder, space: number, key: Uint8Array): Promise<History> {
    return new History(await store.load(holder, space, key), (data) => store.save(holder, space, key, data));
  }

  /** Every message, oldest first. */
  messages(): Message[] {
    return Object.entries(this.data.chats)
      .flatMap(([peer, list]) => list.map((m) => ({ peer, ...unpack(m) })))
      .sort((a, b) => a.at - b.at);
  }

  // Each change is made on what is in memory and saved in turn (sealed-file.ts writes one after
  // another), so changes made close together all land, in order.
  private save(data: HistoryData): Promise<void> {
    this.data = data;
    return this.store(data);
  }

  add({ peer, ...message }: Message): Promise<void> {
    const list = [...(this.data.chats[peer] ?? []), pack(message)];
    return this.save(fitted({ chats: { ...this.data.chats, [peer]: list } }));
  }

  /** Deletes one message of a chat, by its tag. */
  remove(peer: string, tag: string): Promise<void> {
    const list = (this.data.chats[peer] ?? []).filter((m) => m[3] !== tag);
    const { [peer]: _gone, ...others } = this.data.chats;
    return this.save({ chats: list.length > 0 ? { ...others, [peer]: list } : others });
  }

  /**
   * Raises the mark of a chat's messages, ours (`mine`) or theirs, to `mark`: all of them, or
   * those with `tags`. A disappearing one marked read starts its time `now`. Returns the tags of
   * the messages whose mark went up.
   */
  async mark(peer: string, mine: boolean, mark: Mark, now: number, tags: string[] | null = null): Promise<string[]> {
    const raised: string[] = [];
    const list = (this.data.chats[peer] ?? []).map((kept): Kept => {
      const m = unpack(kept);
      if (m.mine !== mine || m.mark! >= mark || (tags && !tags.includes(m.tag))) return kept;
      raised.push(m.tag);
      const starts = mark === 2 && !m.until && m.lasts;
      return pack({ ...m, mark, ...(starts ? { until: now + m.lasts! * 1000, lasts: 0 } : {}) });
    });
    if (raised.length > 0) await this.save({ chats: { ...this.data.chats, [peer]: list } });
    return raised;
  }

  /** Deletes the messages whose time to disappear is `now` or before. Says whether there were any. */
  async expire(now: number): Promise<boolean> {
    const chats: Record<string, Kept[]> = {};
    let gone = false;
    for (const [peer, list] of Object.entries(this.data.chats)) {
      const kept = list.filter((m) => !(m[4] && m[4] <= now));
      gone ||= kept.length < list.length;
      if (kept.length > 0) chats[peer] = kept;
    }
    if (gone) await this.save({ chats });
    return gone;
  }

  /** Deletes one chat's messages from the phone. */
  clear(peer: string): Promise<void> {
    const { [peer]: _gone, ...chats } = this.data.chats;
    return this.save({ chats });
  }
}
