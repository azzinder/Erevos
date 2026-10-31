// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import type { GroupMessage, GroupParts } from '../lock/group-data';
import { isReactionEmoji, isTag } from '../lock/history';
import { carriedOf, checkedChoices, checkedEdit, editableWords, previewAfterEdit } from './chat-parts';
import { isMentions } from './mentions';

// What a group's messages do beyond words and files (lib/groups.ts carries them), as in a chat with
// a contact (lib/chat-parts.ts): a message can answer another, be a sticker, a place or a poll,
// carry a link's preview, or be forwarded; and any member can react to a message, vote on a poll,
// pin a message to the top for everyone, or edit or delete their own for everyone. It all rides
// inside the group's encrypted messages, in fields and kinds an Erevos from before leaves alone: it
// shows the words, a sticker's emoji, a place's coordinates and a poll's question as words, and
// nothing of the rest.

/** What a member says of a message already in the group, by its tag. An empty `emoji` takes a reaction back; no `chose`, a vote. `text`: new words for their own. */
export type Marked =
  | { t: 'react'; tag: string; emoji: string }
  | { t: 'pin'; tag: string; on: boolean }
  | { t: 'vote'; tag: string; chose: number[] }
  | { t: 'edit'; tag: string; text: string }
  | { t: 'erase'; tag: string };

/**
 * What a member's phone says of messages that came to it, by their tags, to their senders only:
 * which reached it (`got`) and which were read there (`read`). Not in public groups.
 */
export type Seen = { t: 'seen'; got: string[]; read: string[] };

/** The most tags one `seen` says, of each kind: more go in more of them. */
export const MAX_SEEN_TAGS = 100;

/** What a member's phone says of messages that came to it, as it came, or null when it is not of that shape. */
export function seenOf(value: Record<string, unknown>): Seen | null {
  if (value.t !== 'seen') return null;
  const tags = (list: unknown) => (Array.isArray(list) ? [...new Set(list.filter(isTag))].slice(0, MAX_SEEN_TAGS) : []);
  const got = tags(value.got);
  const read = tags(value.read);
  return got.length > 0 || read.length > 0 ? { t: 'seen', got, read } : null;
}

/**
 * A group's messages once the member `from` (an identity) said `seen`, at `at`: of our own only,
 * when it reached their phone and when it was read there, each member once. A message read is one
 * that came. Null when it changes nothing.
 */
export function withSeen(messages: GroupMessage[], from: string, seen: Seen, at: number): GroupMessage[] | null {
  if (!from) return null;
  const got = new Set(seen.got);
  const read = new Set(seen.read);
  let changed = false;
  const next = messages.map((m) => {
    if (m.note || m.from || !m.tag || (!got.has(m.tag) && !read.has(m.tag))) return m;
    if (read.has(m.tag)) {
      if (m.read?.[from] !== undefined) return m;
      const { [from]: _came, ...gotBefore } = m.got ?? {};
      const marked: GroupMessage = { ...m, read: { ...m.read, [from]: at }, got: gotBefore };
      if (Object.keys(gotBefore).length === 0) delete marked.got;
      changed = true;
      return marked;
    }
    if (m.got?.[from] !== undefined || m.read?.[from] !== undefined) return m;
    changed = true;
    return { ...m, got: { ...m.got, [from]: at } };
  });
  return changed ? next : null;
}

/**
 * How far one of our own messages went among `members` (the identities of those in the group when
 * it was sent, but this phone): 0 (✓) on its way to them, 1 (✓✓) once it reached every one's
 * phone, 2 (✓✓✓) once every one read it. With no one else in the group, 0.
 */
export function seenMark(m: Pick<GroupMessage, 'got' | 'read'>, members: string[]): 0 | 1 | 2 {
  if (members.length === 0) return 0;
  if (members.every((id) => m.read?.[id] !== undefined)) return 2;
  return members.every((id) => m.read?.[id] !== undefined || m.got?.[id] !== undefined) ? 1 : 0;
}

/**
 * What a member's message carries beyond itself, from its fields as they came, each checked or
 * left out: with words (`words`), a sticker, a place, a poll, a preview or the members named; with
 * either, the message it answers and that it was forwarded.
 */
export function groupPartsOf(value: Record<string, unknown>, words: boolean): GroupParts {
  const { sticker, place, poll, preview } = words ? carriedOf(value) : {};
  return {
    ...(isTag(value.re) ? { re: value.re } : {}),
    ...(sticker ? { sticker } : {}),
    ...(place ? { place } : {}),
    ...(poll ? { poll } : {}),
    ...(preview ? { preview } : {}),
    ...(value.forwarded === true ? { forwarded: true as const } : {}),
    ...(words && isMentions(value.named) ? { named: value.named } : {}),
  };
}

/** What a member says of a message, as it came, or null when it is not of that shape. */
export function markedOf(value: Record<string, unknown>): Marked | null {
  if (!isTag(value.tag)) return null;
  const tag = value.tag;
  if (value.t === 'react' && (value.emoji === '' || isReactionEmoji(value.emoji))) return { t: 'react', tag, emoji: value.emoji as string };
  if (value.t === 'pin' && typeof value.on === 'boolean') return { t: 'pin', tag, on: value.on };
  if (value.t === 'vote') {
    const chose = checkedChoices(value.chose);
    if (chose) return { t: 'vote', tag, chose };
  }
  if (value.t === 'edit') {
    const edit = checkedEdit(value);
    if (edit) return { t: 'edit', tag, text: edit.text };
  }
  if (value.t === 'erase') return { t: 'erase', tag };
  return null;
}

// What each member did, with `from`'s now `value`, or without it when null; none when empty.
function byMember<T>(before: Record<string, T> | undefined, from: string, value: T | null): Record<string, T> | undefined {
  const next = { ...before };
  if (value === null) delete next[from];
  else next[from] = value;
  return Object.keys(next).length > 0 ? next : undefined;
}

/**
 * A group's messages once `from` (a member's identity, '' for this phone) said `marked`, at `at`:
 * a vote counts only on a poll, and only as the poll allows; only who sent a message edits its
 * words (lib/chat-parts.ts editableWords) or deletes it for everyone. Null when it changes nothing.
 */
export function withMarked(messages: GroupMessage[], from: string, marked: Marked, at: number): GroupMessage[] | null {
  const i = messages.findIndex((m) => !m.note && m.tag === marked.tag);
  if (i < 0) return null;
  const m = messages[i];
  if (marked.t === 'erase') return m.from === from ? messages.filter((_, j) => j !== i) : null;
  const next: GroupMessage = { ...m };
  if (marked.t === 'edit') {
    if (m.from !== from || m.text === marked.text || !editableWords(m)) return null;
    next.text = marked.text;
    next.edited = at;
    next.preview = previewAfterEdit(m.preview, marked.text);
    if (!next.preview) delete next.preview;
    return messages.map((old, j) => (j === i ? next : old));
  }
  if (marked.t === 'react') {
    if ((m.reactions?.[from] ?? '') === marked.emoji) return null;
    next.reactions = byMember(m.reactions, from, marked.emoji || null);
  } else if (marked.t === 'pin') {
    if (!!m.pinned === marked.on) return null;
    next.pinned = marked.on ? at : undefined;
  } else {
    const chose = m.poll ? checkedChoices(marked.chose, m.poll.o.length, !!m.poll.m) : null;
    if (!chose) return null;
    next.votes = byMember(m.votes, from, chose.length > 0 ? chose : null);
  }
  for (const key of ['reactions', 'pinned', 'votes'] as const) if (next[key] === undefined) delete next[key];
  return messages.map((old, j) => (j === i ? next : old));
}

/** A group's message as a contact's chat has its parts, to show it in a line or find it: its voice message apart from its files. */
export function asChatMessage(m: GroupMessage): Omit<GroupMessage, 'file'> & { file?: GroupMessage['file']; voice?: { ms: number } } {
  if (!m.file || !m.ms) return m;
  const { file: _sound, ...rest } = m;
  return { ...rest, voice: { ms: m.ms } };
}
