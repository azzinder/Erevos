import type { GroupMessage, GroupParts } from '../lock/group-data';
import { isReactionEmoji, isTag } from '../lock/history';
import { carriedOf, checkedChoices } from './chat-parts';

// What a group's messages do beyond words and files (lib/groups.ts carries them), as in a chat with
// a contact (lib/chat-parts.ts): a message can answer another, be a sticker, a place or a poll,
// carry a link's preview, or be forwarded; and any member can react to a message, vote on a poll,
// pin a message to the top for everyone, or delete their own for everyone. It all rides inside the
// group's encrypted messages, in fields and kinds an Erevos from before leaves alone: it shows the
// words, a sticker's emoji, a place's coordinates and a poll's question as words, and nothing of
// the rest.

/** What a member says of a message already in the group, by its tag. An empty `emoji` takes a reaction back; no `chose`, a vote. */
export type Marked =
  | { t: 'react'; tag: string; emoji: string }
  | { t: 'pin'; tag: string; on: boolean }
  | { t: 'vote'; tag: string; chose: number[] }
  | { t: 'erase'; tag: string };

/**
 * What a member's message carries beyond itself, from its fields as they came, each checked or
 * left out: with words (`words`), a sticker, a place, a poll or a preview; with either, the
 * message it answers and that it was forwarded.
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
 * a vote counts only on a poll, and only as the poll allows; only who sent a message deletes it
 * for everyone. Null when it changes nothing.
 */
export function withMarked(messages: GroupMessage[], from: string, marked: Marked, at: number): GroupMessage[] | null {
  const i = messages.findIndex((m) => !m.note && m.tag === marked.tag);
  if (i < 0) return null;
  const m = messages[i];
  if (marked.t === 'erase') return m.from === from ? messages.filter((_, j) => j !== i) : null;
  const next: GroupMessage = { ...m };
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
