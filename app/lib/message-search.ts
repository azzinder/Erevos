import type { GroupMessage } from '../lock/group-data';
import { shownLine } from './call-lines';
import { asChatMessage } from './group-parts';
import { t } from './i18n';
import { messageLine, type LineOf } from './message-line';

// Messages found again across the open space's chats: the starred ones (app/starred.tsx), and those
// a search finds, on the home screen and in a chat. A chat with a contact is named `contact:` and
// their key, as the chat screen names it (lock/history.ts); a group, `group:` and its id. Hidden
// chats are never among the home screen's: only the chat screen has their messages, while they are
// open. A search ignores case and Greek accents, as the home screen's list does (lib/inbox.ts).

/** A message as it is looked through: its chat, its tag, when, whose, and what makes its line. */
export type Findable = LineOf & { peer: string; tag: string; at: number; mine: boolean; starred?: boolean; poll?: { q: string; o: string[] } };

/** A message found: its chat, its tag (to go to it), when, whose, and its line. */
export type Found = { peer: string; tag: string; at: number; mine: boolean; line: string };

const found = ({ peer, tag, at, mine, ...message }: Findable): Found => ({ peer, tag, at, mine, line: messageLine(message) });

const GROUP = 'group:';

/** A group's messages as they are looked through, its notes left out. */
export function groupFindables(id: string, messages: GroupMessage[]): Findable[] {
  return messages.filter((m) => !m.note).map((m) => ({ ...asChatMessage(m), peer: `${GROUP}${id}`, mine: !m.from }));
}

/** Where a message found opens: its chat, at it. */
export function foundAt({ peer, tag }: Found): string {
  return peer.startsWith(GROUP) ? `/group?id=${peer.slice(GROUP.length)}&at=${tag}` : `/chat?contact=${peer.replace(/^contact:/, '')}&at=${tag}`;
}

/** Whose a message found is, as its row names it: `name` is its chat's. */
export function foundName({ peer, mine }: Found, name: string): string {
  if (!mine) return name;
  return peer.startsWith(GROUP) ? t('You in {name}', { name }) : t('You to {name}', { name });
}

/** The starred messages, the latest first. */
export function starredOf(messages: Findable[]): Found[] {
  return messages
    .filter((m) => m.starred && m.tag)
    .sort((a, b) => b.at - a.at)
    .map(found);
}

const plain = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// What a message is found by: its words, a file's name, a poll's question and options, a sticker's
// words. A voice message and a place have none.
function wordsOf(m: Findable): string {
  if (m.voice || m.place) return '';
  if (m.file) return m.file.name;
  if (m.poll) return [m.poll.q, ...m.poll.o].join('\n');
  if (m.sticker) return messageLine(m);
  return shownLine(m.text);
}

/**
 * The messages with `query` in them, the latest first, `most` at most: each with the line of it the
 * query is in.
 */
export function searchMessages(messages: Findable[], query: string, most = 200): Found[] {
  const q = plain(query.trim());
  if (!q) return [];
  const hits: Found[] = [];
  for (const m of [...messages].sort((a, b) => b.at - a.at)) {
    if (hits.length >= most) break;
    if (!m.tag) continue;
    const line = wordsOf(m)
      .split('\n')
      .find((words) => plain(words).includes(q));
    if (line !== undefined) hits.push({ peer: m.peer, tag: m.tag, at: m.at, mine: m.mine, line: line.trim() });
  }
  return hits;
}
