import { checkedChoices, checkedPlace, checkedPoll, checkedPreview, isStickerName, type Place, type Poll, type Preview } from '../lib/chat-parts';
import { decryptBytes, encryptBytes, randomBytes, toHex, utf8Decode, utf8Encode } from '../lib/crypto';
import { deleteFile, readBytes, writeBytes } from '../lib/files';
import { isRelayAddress, type HeldAt } from '../lib/relay';

import { deleteChunks, isFileRef, type FileRef } from './attachment-files';
import { sealedFile, sealedSize, type Holder } from './sealed-file';
import { deleteClip, isVoiceRef, type VoiceRef } from './voice-clips';

// The messages each chat keeps on the phone, a space's own chat and its hidden chats, with no limit
// but the phone's room. They are kept in pages: files of PAGE bytes (or a few PAGEs, for a page
// with one very long message), each sealed with the key of the chat it belongs to and named by a
// random id after PAGE_PREFIX. The pages of every space and every hidden chats lie together, alike,
// so they tell how much the phone keeps in all, but not whose, nor whether any are hidden chats'.
// Which pages are a chat's is kept in its sealed value of FILE (sealed-file.ts), exactly SIZE
// bytes, used or not. A new message is written to the chat's last page, or a new one once that is
// full; a change to an older message rewrites only its page, and a page left empty is deleted.
// Messages kept in FILE itself, as before there were pages, move into pages when the chat opens.
//
// Only chats with contacts are kept, whether their messages came through the relay or nearby
// (lib/nearby.ts): both are a contact's, end-to-end encrypted.
//
// Each message keeps its mark: ours, whether it came to their phone and was read there (lib/e2e.ts
// carries what their phone says), or that it waits to go (lib/waiting.ts); theirs, whether it was
// read here.
//
// A disappearing message (lib/e2e.ts carries the chat's timer) waits, with how long it lasts,
// until it is read: theirs when it shows here, ours when their phone says it read it. From then
// on it is kept with the time it goes, and `expire` deletes it once that has passed: while the
// chat is open, or when it next opens.
//
// A voice message keeps where its sound is (lock/voice-clips.ts), and a photo or file where its
// chunks are (lock/attachment-files.ts). When a message leaves the history, however it goes, its
// sound's file or its chunks are deleted.

/**
 * Ours: it waits, as nothing could take it yet (-1, WAITING), the relay or their phone nearby took
 * it (0), it came to their phone (1), they read it (2). Theirs: read here (2) or not (0).
 */
export type Mark = -1 | 0 | 1 | 2;

export const WAITING = -1;

/**
 * One message: when (milliseconds), whether this phone sent it, its text, its tag, when it
 * disappears (milliseconds, 0 if not, or not yet), how long it lasts once read (seconds, 0 if it
 * does not disappear or its time has started), its mark, where its sound is if it is a voice
 * message, where its file is if it is a photo or file, and what more is said of ours (More). What
 * is empty at the end is left out.
 */
export type Kept = [
  at: number,
  mine: 0 | 1,
  text: string,
  tag: string,
  until?: number,
  lasts?: number,
  mark?: Mark,
  voice?: VoiceRef | 0,
  file?: FileRef | 0,
  more?: More,
];

/**
 * Of ours: `h`, the id a relay holds it by, sent for later, and `r` that relay (lib/relay.ts,
 * sendMessageLater), so it can still be taken back before it goes; `q` 1 when it goes without
 * sound, kept while it waits. Of either, its Parts: `p`, the tag of the message it answers; `y`,
 * our reaction to it, and `o`, theirs; `n`, when it was pinned to the top of the chat; `f` 1 when it
 * is starred, on this phone only; `s`, the name of the sticker it is (its text is the sticker's emoji);
 * `l`, the place it is (its text says where); `k`, the poll it is (its text asks it), with `a`, the
 * options we chose, and `b`, theirs; `w`, the preview of the link in its words, as its sender made
 * it; `d` 1 when it was forwarded from another chat.
 */
type More = { h?: string; r?: string; q?: 1; p?: string; y?: string; o?: string; n?: number; f?: 1; s?: string; l?: Place; k?: Poll; a?: number[]; b?: number[]; w?: Preview; d?: 1 };

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
  voice?: VoiceRef;
  file?: FileRef;
  /** Ours sent for later, held by a relay till `at`: its id there, and that relay. */
  held?: HeldAt;
  /** Ours that waits, to go without sound. */
  quiet?: boolean;
} & Parts;

/** What else a message is or carries, beyond its words, on both phones or this one only. */
export type Parts = {
  /** The tag of the message it answers. */
  re?: string;
  /** Our reaction to it, and theirs. */
  myReaction?: string;
  theirReaction?: string;
  /** When it was pinned to the top of the chat, by either phone (milliseconds, this phone's clock). */
  pinned?: number;
  /** Starred, to find again among the starred messages: on this phone only. */
  starred?: boolean;
  /** The sticker it is, by name (lib/stickers.ts). */
  sticker?: string;
  /** The place it is, sent once (lib/chat-parts.ts). */
  place?: Place;
  /** The poll it is, and the options we chose on it, and they did. */
  poll?: Poll;
  myVote?: number[];
  theirVote?: number[];
  /** The preview of the link in its words, made by the phone that sent it (lib/link-preview.ts). */
  preview?: Preview;
  /** Forwarded from another chat: its sender's, or this phone's. */
  forwarded?: boolean;
};

type Fields = Omit<Message, 'peer'>;

// A message's Parts as kept in More, and back.
function moreOf({ re, myReaction, theirReaction, pinned, starred, sticker, place, poll, myVote, theirVote, preview, forwarded }: Parts): More {
  return {
    ...(re ? { p: re } : {}),
    ...(myReaction ? { y: myReaction } : {}),
    ...(theirReaction ? { o: theirReaction } : {}),
    ...(pinned ? { n: pinned } : {}),
    ...(starred ? { f: 1 as const } : {}),
    ...(sticker ? { s: sticker } : {}),
    ...(place ? { l: place } : {}),
    ...(poll ? { k: poll } : {}),
    ...(poll && myVote?.length ? { a: myVote } : {}),
    ...(poll && theirVote?.length ? { b: theirVote } : {}),
    ...(preview ? { w: preview } : {}),
    ...(forwarded ? { d: 1 as const } : {}),
  };
}

function partsOf(more: More | undefined): Parts {
  return {
    ...(more?.p ? { re: more.p } : {}),
    ...(more?.y ? { myReaction: more.y } : {}),
    ...(more?.o ? { theirReaction: more.o } : {}),
    ...(more?.n ? { pinned: more.n } : {}),
    ...(more?.f ? { starred: true } : {}),
    ...(more?.s ? { sticker: more.s } : {}),
    ...(more?.l ? { place: more.l } : {}),
    ...(more?.k ? { poll: more.k } : {}),
    ...(more?.a ? { myVote: more.a } : {}),
    ...(more?.b ? { theirVote: more.b } : {}),
    ...(more?.w ? { preview: more.w } : {}),
    ...(more?.d ? { forwarded: true } : {}),
  };
}

function pack({ at, mine, text, tag, until = 0, lasts = 0, mark = 0, voice, file, held, quiet, ...parts }: Fields): Kept {
  const more: More = {
    ...(held ? { h: held.id, r: held.relay } : {}),
    ...(quiet ? { q: 1 as const } : {}),
    ...moreOf(parts),
  };
  const kept: Kept = [at, mine ? 1 : 0, text, tag, until, until ? 0 : lasts, mark, voice ?? 0, file ?? 0, Object.keys(more).length > 0 ? more : undefined];
  while (kept.length > 4 && !kept[kept.length - 1]) kept.pop();
  return kept;
}

function unpack([at, mine, text, tag, until = 0, lasts = 0, mark = 0, voice, file, more]: Kept): Fields {
  return {
    at,
    mine: mine === 1,
    text,
    tag,
    until,
    lasts,
    mark,
    ...(voice ? { voice } : {}),
    ...(file ? { file } : {}),
    ...(more?.h && more.r ? { held: { id: more.h, relay: more.r } } : {}),
    ...(more?.q ? { quiet: true } : {}),
    ...partsOf(more),
  };
}

const HELD_ID = /^[0-9a-f]{32}(?:,[0-9a-f]{32}){0,63}$/;

// What is said of ours only is kept of ours only.
function checkedMore(value: unknown, mine: boolean): More | undefined {
  const v = value as { h?: unknown; r?: unknown; q?: unknown; p?: unknown; y?: unknown; o?: unknown; n?: unknown; f?: unknown; s?: unknown; l?: unknown; k?: unknown; a?: unknown; b?: unknown; w?: unknown; d?: unknown } | null;
  if (!v || typeof v !== 'object') return undefined;
  const place = checkedPlace(v.l);
  const poll = checkedPoll(v.k);
  const preview = checkedPreview(v.w);
  const votes = (chose: unknown) => (poll ? checkedChoices(chose, poll.o.length, !!poll.m) : null);
  const [ours, theirs] = [votes(v.a), votes(v.b)];
  const held = mine && typeof v.h === 'string' && HELD_ID.test(v.h) && typeof v.r === 'string' && isRelayAddress(v.r);
  const more: More = {
    ...(held ? { h: v.h as string, r: v.r as string } : {}),
    ...(mine && v.q === 1 ? { q: 1 as const } : {}),
    ...(isTag(v.p) ? { p: v.p } : {}),
    ...(isReactionEmoji(v.y) ? { y: v.y } : {}),
    ...(isReactionEmoji(v.o) ? { o: v.o } : {}),
    ...(count(v.n) ? { n: count(v.n) } : {}),
    ...(v.f === 1 ? { f: 1 as const } : {}),
    ...(isStickerName(v.s) ? { s: v.s } : {}),
    ...(place ? { l: place } : {}),
    ...(poll ? { k: poll } : {}),
    ...(ours?.length ? { a: ours } : {}),
    ...(theirs?.length ? { b: theirs } : {}),
    ...(preview ? { w: preview } : {}),
    ...(v.d === 1 ? { d: 1 as const } : {}),
  };
  return Object.keys(more).length > 0 ? more : undefined;
}

const voiceIds = (data: HistoryData) =>
  new Set(Object.values(data.chats).flatMap((list) => list.flatMap((m) => (m[7] ? [m[7].id] : []))));

// Each file's chunks, by id, and how many there are.
const fileChunks = (data: HistoryData) =>
  new Map(Object.values(data.chats).flatMap((list) => list.flatMap((m): [string, number][] => (m[8] ? [[m[8].id, m[8].count]] : []))));

const count = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : 0);

const TAG = /^[0-9a-f]{12}$/;

export const newTag = () => toHex(randomBytes(6));
export const isTag = (value: unknown): value is string => typeof value === 'string' && TAG.test(value);

/** Whether this can be a reaction: one emoji or a few, no words. */
export const isReactionEmoji = (value: unknown): value is string => typeof value === 'string' && /^[^\sA-Za-z0-9<>&"'`\\]{1,16}$/.test(value);

export const FILE = 'erevos-history';
export const SIZE = 64 * 1024;
export const PAGE = 16 * 1024;
export const PAGE_PREFIX = 'erevos-page-';

const PAGE_ID = /^[0-9a-f]{24}$/;

/** A chat's value in FILE: its pages, in the order they were made, and messages kept before pages. */
type Stored = { pages: string[]; chats: Record<string, Kept[]> };

const EMPTY: Stored = { pages: [], chats: {} };

/** One message in a page, with the chat it belongs to. */
type Entry = [peer: string, kept: Kept];

// A message kept before tags has none: it gets one here, known to this phone only.
function checkedKept(m: unknown): Kept | null {
  if (!Array.isArray(m) || m.length < 3 || typeof m[0] !== 'number' || (m[1] !== 0 && m[1] !== 1) || typeof m[2] !== 'string') {
    return null;
  }
  const mark = m[6] === 1 || m[6] === 2 || (m[6] === WAITING && m[1] === 1) ? m[6] : 0;
  const voice = isVoiceRef(m[7]) ? m[7] : undefined;
  const file = isFileRef(m[8]) ? m[8] : undefined;
  const more = checkedMore(m[9], m[1] === 1);
  const held = more?.h && more.r ? { id: more.h, relay: more.r } : undefined;
  return pack({
    at: m[0],
    mine: m[1] === 1,
    text: m[2],
    tag: isTag(m[3]) ? m[3] : newTag(),
    until: count(m[4]),
    lasts: count(m[5]),
    mark,
    voice,
    file,
    held,
    quiet: !!more?.q,
    ...partsOf(more),
  });
}

function checkedChats(value: unknown): Record<string, Kept[]> {
  const chats: Record<string, Kept[]> = {};
  if (value && typeof value === 'object') {
    for (const [peer, list] of Object.entries(value)) {
      const kept = Array.isArray(list) ? list.map(checkedKept).filter((m): m is Kept => m !== null) : [];
      if (kept.length > 0) chats[peer] = kept;
    }
  }
  return chats;
}

function checked(value: unknown): Stored {
  const v = value as { pages?: unknown; chats?: unknown } | null;
  const pages = Array.isArray(v?.pages) ? v.pages.filter((id): id is string => typeof id === 'string' && PAGE_ID.test(id)) : [];
  return { pages, chats: checkedChats(v?.chats) };
}

function checkedPage(value: unknown): Entry[] {
  const list = (value as { m?: unknown } | null)?.m;
  if (!Array.isArray(list)) return [];
  return list.flatMap((e): Entry[] => {
    if (!Array.isArray(e) || typeof e[0] !== 'string') return [];
    const kept = checkedKept(e[1]);
    return kept ? [[e[0], kept]] : [];
  });
}

const store = sealedFile({ name: FILE, empty: EMPTY, checked, block: SIZE, fixed: true });

const pageSize = (entries: Entry[]) => sealedSize({ m: entries });

function sealPage(key: Uint8Array, entries: Entry[]): Uint8Array {
  const json = JSON.stringify({ m: entries });
  const bytes = utf8Encode(json).length;
  return encryptBytes(key, utf8Encode(json + ' '.repeat(Math.max(1, Math.ceil(bytes / PAGE)) * PAGE - bytes)));
}

// Names a message within its chat, to find it again in the pages after a change: its tag and time.
const entryKey = (peer: string, kept: Kept) => `${peer}|${kept[3]}|${kept[0]}`;

/** One chat's history, kept as messages come and go. */
export class History {
  private data: HistoryData = { chats: {} };
  // The pages, in the order they were made, with what each holds.
  private pages: { id: string; entries: Entry[] }[];
  // Writes run one after another, each with the pages as they were when it was asked for.
  private writes: Promise<void> = Promise.resolve();

  private readonly holder: Holder;
  private readonly space: number;
  private readonly key: Uint8Array;

  private constructor(holder: Holder, space: number, key: Uint8Array, pages: { id: string; entries: Entry[] }[]) {
    this.holder = holder;
    this.space = space;
    this.key = key;
    this.pages = pages;
    const chats: Record<string, Kept[]> = {};
    for (const page of pages) for (const [peer, kept] of page.entries) (chats[peer] ??= []).push(kept);
    for (const list of Object.values(chats)) list.sort((a, b) => a[0] - b[0]);
    this.data = { chats };
  }

  /** The space's own chat, or its hidden chats (`holder`), sealed with `key`. */
  static async open(holder: Holder, space: number, key: Uint8Array): Promise<History> {
    const stored = await store.load(holder, space, key);
    const pages: { id: string; entries: Entry[] }[] = [];
    for (const id of stored.pages) {
      const sealed = await readBytes(PAGE_PREFIX + id);
      if (!sealed) continue;
      try {
        pages.push({ id, entries: checkedPage(JSON.parse(utf8Decode(decryptBytes(key, sealed)))) });
      } catch {
        // A damaged page: its messages are lost, the others stay.
      }
    }
    const history = new History(holder, space, key, pages);
    // Messages kept before there were pages go into them, and leave FILE.
    if (Object.keys(stored.chats).length > 0 || pages.length !== stored.pages.length) {
      const chats = { ...history.data.chats };
      for (const [peer, list] of Object.entries(stored.chats)) chats[peer] = [...list, ...(chats[peer] ?? [])].sort((a, b) => a[0] - b[0]);
      await history.persist({ chats }, true);
    }
    return history;
  }

  /**
   * Puts `data` in the pages: each message stays in the page it is in, changed or not, and the new
   * ones go after the last. Only the pages that changed are written, and FILE when the pages did.
   */
  private persist(data: HistoryData, indexChanged = false): Promise<void> {
    this.data = data;
    const wanted = new Map<string, Kept[]>();
    const order: Entry[] = [];
    for (const [peer, list] of Object.entries(data.chats)) {
      for (const kept of list) {
        const k = entryKey(peer, kept);
        wanted.set(k, [...(wanted.get(k) ?? []), kept]);
        order.push([peer, kept]);
      }
    }
    const placed = new Set<Kept>();
    const dirty = new Set<string>();
    const pages = this.pages.map((page) => {
      const entries: Entry[] = [];
      for (const [peer, kept] of page.entries) {
        const now = wanted.get(entryKey(peer, kept));
        const next = now?.shift();
        if (next === undefined) continue;
        entries.push([peer, next]);
        placed.add(next);
      }
      const changed = entries.length !== page.entries.length || entries.some((e, i) => e[1] !== page.entries[i][1]);
      if (changed) dirty.add(page.id);
      return { id: page.id, entries };
    });
    // A page a change made too large gives its last messages to the end.
    const fresh: Entry[] = [];
    for (const page of pages) {
      if (!dirty.has(page.id)) continue;
      const moved: Entry[] = [];
      while (page.entries.length > 1 && pageSize(page.entries) > PAGE) moved.unshift(page.entries.pop()!);
      fresh.push(...moved);
    }
    fresh.push(...order.filter(([, kept]) => !placed.has(kept)).sort((a, b) => a[1][0] - b[1][0]));
    const kept = pages.filter((page) => page.entries.length > 0);
    const gone = pages.filter((page) => page.entries.length === 0).map((page) => page.id);
    for (const entry of fresh) {
      const last = kept[kept.length - 1];
      if (last && pageSize([...last.entries, entry]) <= PAGE) {
        last.entries.push(entry);
        dirty.add(last.id);
      } else {
        const id = toHex(randomBytes(12));
        kept.push({ id, entries: [entry] });
        dirty.add(id);
      }
    }
    const index = kept.map((page) => page.id);
    const reindex = indexChanged || gone.length > 0 || index.length !== this.pages.length || index.some((id, i) => id !== this.pages[i].id);
    this.pages = kept;
    const writes = kept.filter((page) => dirty.has(page.id)).map((page) => ({ id: page.id, sealed: sealPage(this.key, page.entries) }));
    const run = this.writes
      .catch(() => undefined)
      .then(async () => {
        for (const { id, sealed } of writes) await writeBytes(PAGE_PREFIX + id, sealed);
        if (reindex) await store.save(this.holder, this.space, this.key, { pages: index, chats: {} });
        for (const id of gone) await deleteFile(PAGE_PREFIX + id).catch(() => undefined);
      });
    this.writes = run;
    return run;
  }

  /** Every message, oldest first. */
  messages(): Message[] {
    return Object.entries(this.data.chats)
      .flatMap(([peer, list]) => list.map((m) => ({ peer, ...unpack(m) })))
      .sort((a, b) => a.at - b.at);
  }

  // Each change is made on what is in memory and saved in turn (sealed-file.ts writes one after
  // another), so changes made close together all land, in order. The sound of a voice message
  // that left, or the chunks of a file, go once the history without it is saved.
  private async save(data: HistoryData): Promise<void> {
    const kept = voiceIds(data);
    const gone = [...voiceIds(this.data)].filter((id) => !kept.has(id));
    const keptFiles = fileChunks(data);
    const goneFiles = [...fileChunks(this.data)].filter(([id]) => !keptFiles.has(id));
    await this.persist(data);
    await Promise.all(gone.map((id) => deleteClip(id).catch(() => undefined)));
    for (const [id, count] of goneFiles) await deleteChunks(id, count).catch(() => undefined);
  }

  add({ peer, ...message }: Message): Promise<void> {
    const list = [...(this.data.chats[peer] ?? []), pack(message)];
    return this.save({ chats: { ...this.data.chats, [peer]: list } });
  }

  /** Our messages that wait to go, oldest first. */
  waiting(): Message[] {
    return this.messages().filter((m) => m.mine && m.mark === WAITING);
  }

  /**
   * A message that waited went: as the relay took it, lasting `lasts` seconds once read, or, sent
   * for later, as a relay holds it till its time (`held`). With `bare`, it went without its link's
   * preview (over LoRa, lib/waiting.ts), which it no longer keeps. False if it is gone.
   */
  async sent(peer: string, tag: string, lasts: number, held?: HeldAt, bare = false): Promise<boolean> {
    const list = this.data.chats[peer];
    if (!list?.some((m) => m[3] === tag && m[6] === WAITING)) return false;
    const changed = list.map((m) => (m[3] === tag ? pack({ ...unpack(m), mark: 0, lasts, held, quiet: false, ...(bare ? { preview: undefined } : {}) }) : m));
    await this.save({ chats: { ...this.data.chats, [peer]: changed } });
    return true;
  }

  /**
   * Sets a reaction to a chat's message, by its tag: ours (`ours`) or theirs, an emoji, or none
   * (`''`). False if the message is gone.
   */
  react(peer: string, tag: string, ours: boolean, emoji: string): Promise<boolean> {
    return this.change(peer, tag, ours ? { myReaction: emoji } : { theirReaction: emoji });
  }

  /** Pins a chat's message to the top, by its tag, as of `at` (milliseconds), or takes it down (0). False if the message is gone. */
  pin(peer: string, tag: string, at: number): Promise<boolean> {
    return this.change(peer, tag, { pinned: at || undefined });
  }

  /**
   * Keeps a vote on a chat's poll, by its tag: ours (`ours`) or theirs, the options chosen; none
   * takes it back. False if the poll is gone, or the vote is not one on it.
   */
  vote(peer: string, tag: string, ours: boolean, chose: number[]): Promise<boolean> {
    const kept = this.data.chats[peer]?.find((m) => m[3] === tag);
    const poll = kept ? unpack(kept).poll : undefined;
    const checked = poll ? checkedChoices(chose, poll.o.length, !!poll.m) : null;
    if (!checked) return Promise.resolve(false);
    return this.change(peer, tag, ours ? { myVote: checked } : { theirVote: checked });
  }

  /** Stars a chat's message, by its tag, or takes the star off. False if the message is gone. */
  star(peer: string, tag: string, on: boolean): Promise<boolean> {
    return this.change(peer, tag, { starred: on || undefined });
  }

  // Changes what is kept of one message of a chat, by its tag. False if the message is gone.
  private async change(peer: string, tag: string, fields: Partial<Fields>): Promise<boolean> {
    const list = this.data.chats[peer];
    if (!list?.some((m) => m[3] === tag)) return false;
    const changed = list.map((m) => (m[3] === tag ? pack({ ...unpack(m), ...fields }) : m));
    await this.save({ chats: { ...this.data.chats, [peer]: changed } });
    return true;
  }

  /** Changes where a message's file is, once it is taken from the relay. False if the message is gone. */
  async setFile(peer: string, tag: string, file: FileRef): Promise<boolean> {
    const list = this.data.chats[peer];
    if (!list?.some((m) => m[3] === tag)) return false;
    const changed = list.map((m) => (m[3] === tag ? pack({ ...unpack(m), file }) : m));
    await this.save({ chats: { ...this.data.chats, [peer]: changed } });
    return true;
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
      // Theirs that came before its time (lib/later.ts, showsAt) is not read before it shows.
      if (m.mine !== mine || m.mark! >= mark || (tags && !tags.includes(m.tag)) || (!mine && m.at > now)) return kept;
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

  /**
   * Takes one chat's messages out, to be put in another history (moving a chat into hidden
   * chats): the sounds and files they name stay on the phone, as they go with them.
   */
  async takeOut(peer: string): Promise<Message[]> {
    const taken = (this.data.chats[peer] ?? []).map((m) => ({ peer, ...unpack(m) }));
    const { [peer]: _gone, ...chats } = this.data.chats;
    await this.persist({ chats });
    return taken;
  }

  /** Puts in messages taken out of another history, after any already here for their chats. */
  putIn(messages: Message[]): Promise<void> {
    const chats = { ...this.data.chats };
    for (const { peer, ...message } of messages) chats[peer] = [...(chats[peer] ?? []), pack(message)];
    for (const list of Object.values(chats)) list.sort((a, b) => a[0] - b[0]);
    return this.save({ chats });
  }

  /** Deletes one chat's messages from the phone. */
  clear(peer: string): Promise<void> {
    const { [peer]: _gone, ...chats } = this.data.chats;
    return this.save({ chats });
  }
}
