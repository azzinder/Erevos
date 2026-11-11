// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { randomBytes, toHex } from './crypto';

// What the Matrix, XMPP and Nostr chats keep written here (app/matrix-chat.tsx, app/xmpp-chat.tsx,
// app/nostr-chat.tsx): each chat's draft, what is typed and not sent, which shows on its row as an
// SMS conversation's does; and the messages held to go later, each at its time. Both are kept in
// the account's own value (`writing` of lib/matrix.ts MatrixState, lib/xmpp.ts XmppState,
// lib/nostr-dm.ts NostrDmState), so encrypted with the space, or with the hidden place whose
// account it is, and in backups with it. Nothing of it goes anywhere until a message is sent.
//
// A message held for later goes from this phone, not from a server: Matrix's delayed events
// (MSC4140) are not on most homeservers, XMPP and NIP-17 have none. So it goes while the account
// runs, as the SMS sent later from Erevos do where Android cannot hold them (lib/sms-later.ts):
// with the space open, on Android with Erevos in the background too; a hidden place's while its
// hidden chats are open, or while they receive closed. One whose time came while nothing ran goes
// as soon as it runs again (lib/chat-later.ts). At its time it goes as a message typed then: once
// it shows in the chat, sent or not sent (with Send again), it is held no more. One that could not
// even be tried (nothing reaches the server, or the chat says why not) stays, says why, and is tried
// again a while later. One a backup brought back, whose time came before it was restored, waits for
// the owner: the phone the backup came from may have sent it already.

/** What is typed in a chat and not sent, and when it was last changed. */
export type Draft = { text: string; at: number };

/**
 * A message held to go later: its words, the chat it goes to (the room, the address or the key,
 * as the account names it), when it goes (`at`) and when it was held (`made`). `replyTo`: the
 * message it answers, when that is still there then; `thread`: a Matrix thread it goes in;
 * `mentions`: whom it names in a Matrix group. `problem`: why it did not go at its last try.
 */
export type HeldText = { id: string; chat: string; text: string; at: number; made: number; replyTo?: string; thread?: string; mentions?: string[]; problem?: string };

/** An account's drafts, by chat, and the messages it holds to go later, the soonest first. */
export type ChatWriting = { drafts?: Record<string, Draft>; later?: HeldText[] };

/** The longest a draft, or a message held, is kept. */
export const WRITING_TEXT = 8000;
/** How many drafts an account keeps: the oldest goes first. */
const MOST_DRAFTS = 200;
/** How many messages an account holds to go later. */
export const MOST_HELD = 100;
/** One that could not be tried is tried again after this, milliseconds. */
export const RETRY = 5 * 60_000;

const object = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const isTime = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0;
const isText = (value: unknown): value is string => typeof value === 'string' && value.length > 0 && value.length <= WRITING_TEXT;
const isId = (value: unknown): value is string => typeof value === 'string' && value.length > 0 && value.length <= 512;

function checkedHeld(value: unknown): HeldText | null {
  if (!object(value)) return null;
  const { id, chat, text, at, made, replyTo, thread, mentions, problem } = value;
  if (!isId(id) || !isId(chat) || !isText(text) || !isTime(at) || !isTime(made)) return null;
  return {
    id,
    chat,
    text,
    at,
    made,
    ...(isId(replyTo) ? { replyTo } : {}),
    ...(isId(thread) ? { thread } : {}),
    ...(Array.isArray(mentions) && mentions.every(isId) ? { mentions: mentions.slice(0, 32) } : {}),
    ...(typeof problem === 'string' && problem ? { problem: problem.slice(0, 500) } : {}),
  };
}

/** What an account keeps written, as it was kept: anything of the wrong shape is left out. */
export function checkedWriting(value: unknown): ChatWriting {
  if (!object(value)) return {};
  const drafts: Record<string, Draft> = {};
  if (object(value.drafts)) {
    for (const [chat, draft] of Object.entries(value.drafts)) {
      if (isId(chat) && object(draft) && isText(draft.text) && isTime(draft.at)) drafts[chat] = { text: draft.text, at: draft.at };
    }
  }
  const later = Array.isArray(value.later) ? value.later.map(checkedHeld).filter((held): held is HeldText => held !== null) : [];
  return { ...(Object.keys(drafts).length ? { drafts } : {}), ...(later.length ? { later: sortedHeld(later).slice(0, MOST_HELD) } : {}) };
}

const sortedHeld = (later: HeldText[]) => [...later].sort((a, b) => a.at - b.at || a.made - b.made);

/** A chat's draft, or nothing. */
export function draftIn(writing: unknown, chat: string): string {
  const drafts = object(writing) && object(writing.drafts) ? writing.drafts : null;
  const draft = drafts?.[chat];
  return object(draft) && isText(draft.text) ? draft.text : '';
}

/** What a chat's row of the list adds for its draft, when it has one (lib/inbox.ts). */
export function draftPart(writing: unknown, chat: string): { draft?: string } {
  const draft = draftIn(writing, chat);
  return draft ? { draft } : {};
}

/** Keeps what is typed in a chat as its draft; nothing typed (or only spaces) forgets it. The
 *  oldest drafts go once there are too many. */
export function keepDraft(writing: unknown, chat: string, text: string, now = Date.now()): ChatWriting {
  const was = checkedWriting(writing);
  const drafts = { ...was.drafts };
  delete drafts[chat];
  if (text.trim()) drafts[chat] = { text: text.slice(0, WRITING_TEXT), at: now };
  const kept = Object.entries(drafts)
    .sort(([, a], [, b]) => b.at - a.at)
    .slice(0, MOST_DRAFTS);
  const { drafts: _, ...rest } = was;
  return kept.length ? { ...rest, drafts: Object.fromEntries(kept) } : rest;
}

/** The messages held for a chat, the soonest first. */
export function heldIn(writing: unknown, chat: string): HeldText[] {
  return (checkedWriting(writing).later ?? []).filter((held) => held.chat === chat);
}

/** Holds a message to go at its time: the writing with it, and it; null when the account holds as
 *  many as it can, or the words are too long. */
export function holdText(writing: unknown, what: Omit<HeldText, 'id' | 'made' | 'problem'>, now = Date.now()): { writing: ChatWriting; held: HeldText } | null {
  const was = checkedWriting(writing);
  const later = was.later ?? [];
  if (later.length >= MOST_HELD || !isText(what.text)) return null;
  const held: HeldText = { ...what, id: toHex(randomBytes(8)), made: now };
  return { writing: { ...was, later: sortedHeld([...later, held]) }, held };
}

function changeHeld(writing: unknown, change: (later: HeldText[]) => HeldText[]): ChatWriting {
  const was = checkedWriting(writing);
  const later = sortedHeld(change(was.later ?? []));
  const { later: _, ...rest } = was;
  return later.length ? { ...rest, later } : rest;
}

/** Without a message held: it went, or was cancelled. */
export function dropHeld(writing: unknown, id: string): ChatWriting {
  return changeHeld(writing, (later) => later.filter((held) => held.id !== id));
}

/** With why a message held did not go at its last try. */
export function heldProblem(writing: unknown, id: string, problem: string): ChatWriting {
  return changeHeld(writing, (later) => later.map((held) => (held.id === id ? { ...held, problem: problem.slice(0, 500) || '?' } : held)));
}

/** A message held, to go now: its time is now, and what went wrong before is forgotten. */
export function heldNow(writing: unknown, id: string, now = Date.now()): ChatWriting {
  return changeHeld(writing, (later) =>
    later.map((held) => {
      if (held.id !== id) return held;
      const { problem: _, ...rest } = held;
      return { ...rest, at: now };
    }),
  );
}

/** Whether a message held waits for the owner: its time came before a backup was restored here,
 *  at `restored`, and it went from nowhere since. */
export const waitsForOwner = (held: HeldText, restored: number): boolean => restored > 0 && held.at <= restored;

/** One account, as a network store lends it to what sends the messages held (lib/chat-later.ts). */
export type WritingAccount = {
  /** What it keeps written now. */
  now(): ChatWriting;
  /** Changes it, after the account's other changes, then keeps it. */
  change(use: (writing: ChatWriting) => ChatWriting): Promise<void>;
  /** Keeps the account at once, as one that went must not go again should Erevos stop now. */
  keep(): Promise<void>;
  /** Whether it can send now: it runs, and reaches its server as far as it knows. */
  ready(): boolean;
  /** Whether the chat is still there to send in. */
  has(chat: string): boolean;
  /** Sends a message held, as typed now. Done once it shows in the chat, sent or not sent; throws
   *  when nothing of it could be tried, so it stays held. */
  send(held: HeldText): Promise<void>;
};

/**
 * Sends with `send`, for a message held. Done too when it failed but shows in its chat now as not
 * sent (`failed`, among `messages` that were not there before): there it has Send again, as one
 * typed then would. Throws when nothing of it shows.
 */
export async function sentOrShown<M extends { id: string }>(messages: () => readonly M[] | undefined, failed: (message: M) => boolean, send: () => Promise<unknown>): Promise<void> {
  const before = new Set((messages() ?? []).map((message) => message.id));
  try {
    await send();
  } catch (error) {
    if ((messages() ?? []).some((message) => failed(message) && !before.has(message.id))) return;
    throw error;
  }
}

const reason = (error: unknown) => (error instanceof Error ? error.message : String(error));

/**
 * Sends what an account holds whose time came, the soonest first, each forgotten once it showed in
 * its chat; one for a chat no longer there is forgotten too. One that could not be tried stays, with
 * why, and waits RETRY after its try (`tried`, by id) before the next. One that waits for the owner
 * (waitsForOwner) is left as it is. Says when to look again: the next time one is due to go, or 0
 * when nothing is ahead.
 */
export async function sendHeld(account: WritingAccount, tried: Map<string, number>, now = Date.now(), restored = 0): Promise<number> {
  let next = 0;
  const ahead = (at: number) => {
    next = next ? Math.min(next, at) : at;
  };
  for (const held of account.now().later ?? []) {
    if (waitsForOwner(held, restored)) continue;
    if (held.at > now) {
      ahead(held.at);
      continue;
    }
    const last = tried.get(held.id);
    if (last !== undefined && last + RETRY > now) {
      ahead(last + RETRY);
      continue;
    }
    if (!account.has(held.chat)) {
      await account.change((writing) => dropHeld(writing, held.id));
      continue;
    }
    // Not reaching its server now: tried again a while later, or as the account changes.
    if (!account.ready()) {
      ahead(now + RETRY);
      continue;
    }
    try {
      await account.send(held);
    } catch (error) {
      tried.set(held.id, now);
      await account.change((writing) => heldProblem(writing, held.id, reason(error)));
      ahead(now + RETRY);
      continue;
    }
    tried.delete(held.id);
    await account.change((writing) => dropHeld(writing, held.id));
    await account.keep().catch(() => undefined);
  }
  return next;
}
