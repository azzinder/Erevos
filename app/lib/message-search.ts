import { messageLine, type LineOf } from './message-line';

// Messages found again across the open space's chats: the starred ones (app/starred.tsx). A chat
// with a contact is named `contact:` and their key, as the chat screen names it (lock/history.ts);
// a group, `group:` and its id. Hidden chats are never among them: only the chat screen has their
// messages, while they are open.

/** A message as it is looked through: its chat, its tag, when, whose, and what makes its line. */
export type Findable = LineOf & { peer: string; tag: string; at: number; mine: boolean; starred?: boolean };

/** A message found: its chat, its tag (to go to it), when, whose, and its line. */
export type Found = { peer: string; tag: string; at: number; mine: boolean; line: string };

const found = ({ peer, tag, at, mine, ...message }: Findable): Found => ({ peer, tag, at, mine, line: messageLine(message) });

/** The starred messages, the latest first. */
export function starredOf(messages: Findable[]): Found[] {
  return messages
    .filter((m) => m.starred && m.tag)
    .sort((a, b) => b.at - a.at)
    .map(found);
}
