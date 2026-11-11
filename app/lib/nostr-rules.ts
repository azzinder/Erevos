// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { checkedRules, goneOf, nextGoes, vanishTimer, withBlocked, withOne, withTimer, withoutOnes, type ChatRules } from './chat-rules';
import { readKey, removeHere, type NostrDmChat, type NostrDmMessage, type NostrDmState } from './nostr-dm';

// The rules of a Nostr chat (lib/chat-rules.ts), whom the space's key blocks, and checking a
// chat's key in person.
//
// Disappearing messages are NIP-40's, as NIP-17 offers them: what goes from a chat with a timer,
// or as one message to disappear, carries an `expiration` in its message (the rumor, for the
// readers' apps) and on each of its wraps (for the relays), set an hour later at most there, at
// random, so that the relays' copy does not say to the second when it was sent. Relays and apps
// that honour it delete it then; others keep it, which the chat says. This phone deletes its own
// copy then too, and a message that comes with an expiration goes from here at its time, whatever
// the chat's timer; one that comes already past it is not kept. With the chat's timer, theirs
// without one go from here too, that long after they were sent.
//
// Blocking is this phone's: Nostr cannot stop anyone from writing to a key. What a blocked key
// sends is dropped as it comes (lib/nostr-dm.ts takeWrap), and not kept, so unblocking brings back
// none of it. The list stays with the space's key, sealed, and goes nowhere: NIP-51 has a mute
// list (kind 10000) whose private part is encrypted to oneself, but it is one list for the key in
// every app, so publishing it would replace one another app keeps for this key, and the core
// encrypts with NIP-44 only between two keys in a wrap.
//
// Checking in person: their app shows their key as a QR code (nostr:npub…); photographed here, the
// chat is marked checked when it is this chat's key, which proves the key the messages go to is
// the one on their phone.

/** The most keys a space blocks. */
export const BLOCKED_MOST = 1000;

/** A chat's rules, as kept and checked. */
export const rulesOf = (chat: Pick<NostrDmChat, 'rules'> | undefined): ChatRules | undefined => checkedRules(chat?.rules);

/** The messages of a chat that show: not gone by `now`. */
export function shownIn(chat: NostrDmChat, now = Date.now()): NostrDmMessage[] {
  const gone = new Set(goneOf(rulesOf(chat), chat.messages, (m) => m.id, (m) => m.at, now));
  return gone.size ? chat.messages.filter((m) => !gone.has(m)) : chat.messages;
}

/** When the next message of a chat goes, or 0. */
export const nextGoesIn = (chat: NostrDmChat, now = Date.now()): number => nextGoes(rulesOf(chat), chat.messages, (m) => m.id, (m) => m.at, now);

/** The chat's timer now, in seconds; 0 when its messages stay. */
export const timerOf = (chat: NostrDmChat | undefined): number => vanishTimer(rulesOf(chat));

/** Sets a chat's timer, in seconds (0: messages stay), for new messages. */
export function setTimerIn(state: NostrDmState, key: string, after: number, now = Date.now()): void {
  const chat = state.chats[key];
  if (!chat) return;
  chat.rules = withTimer(rulesOf(chat), after, now);
  if (!chat.rules) delete chat.rules;
}

/** A message of the chat goes at `until` (ms), its expiration, ours or as it came. */
export function goesAtIn(chat: NostrDmChat, id: string, until: number): void {
  chat.rules = withOne(rulesOf(chat), id, until);
}

/** Deletes from this phone what is gone by `now`, in every chat; one that comes again stays away (removeHere). Answers whether anything went. */
export function sweepNostrRules(state: NostrDmState, now = Date.now()): boolean {
  let changed = false;
  for (const chat of Object.values(state.chats)) {
    if (!chat.rules) continue;
    const rules = rulesOf(chat);
    const ids = goneOf(rules, chat.messages, (m) => m.id, (m) => m.at, now).map((m) => m.id);
    if (!ids.length) continue;
    removeHere(state, chat.key, ids);
    chat.rules = withoutOnes(rules, ids);
    if (!chat.rules) delete chat.rules;
    changed = true;
  }
  return changed;
}

/** Whether anything of the account is gone by `now`, to sweep. */
export const nostrRulesDue = (state: NostrDmState, now = Date.now()): boolean =>
  Object.values(state.chats).some((chat) => chat.rules && goneOf(rulesOf(chat), chat.messages, (m) => m.id, (m) => m.at, now).length > 0);

/** Whether the space's key blocks `key`. */
export const isBlocked = (state: Pick<NostrDmState, 'blocked'>, key: string): boolean => Array.isArray(state.blocked) && state.blocked.includes(key);

/** Blocks a key on this phone, or lets it through again. */
export function setBlocked(state: NostrDmState, key: string, on: boolean): void {
  if (!/^[0-9a-f]{64}$/.test(key) || key === state.public) return;
  state.blocked = withBlocked(Array.isArray(state.blocked) ? state.blocked : [], key, on, BLOCKED_MOST);
  if (!state.blocked) delete state.blocked;
}

/** The space's code for their app to check it by: its key as a nostr: URI (NIP-21). */
export const ownCode = (npub: string): string => `nostr:${npub}`;

export type NostrCheck = 'match' | 'own' | 'other' | 'none';

/** Checks a chat with one person by the code of their key photographed: marked checked when it is the chat's key. */
export async function checkByCode(state: NostrDmState, key: string, text: string, now = Date.now()): Promise<NostrCheck> {
  let found: string;
  try {
    const written = await readKey(text.trim());
    if (written.type === 'nsec') return 'none';
    found = written.public;
  } catch {
    return 'none';
  }
  if (found === state.public) return 'own';
  if (found !== key) return 'other';
  const chat = state.chats[key];
  if (chat) chat.checked = now;
  return 'match';
}

/** Takes the mark off a chat. */
export function uncheck(state: NostrDmState, key: string): void {
  const chat = state.chats[key];
  if (chat) delete chat.checked;
}
