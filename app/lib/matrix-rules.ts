// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { checkedRules, goesAt, goneOf, nextGoes, withHidden, withOne, withTimer, withoutOnes, type ChatRules } from './chat-rules';
import { t } from './i18n';
import { call, enc, ignoredOf, isMatrixId, MatrixError, type Json, type MatrixMessage, type MatrixRoom, type MatrixState } from './matrix';

// The rules of a Matrix room on this phone (lib/chat-rules.ts), and whom the account blocks.
//
// Disappearing messages: Matrix has no adopted way to make others' apps delete a message when its
// time comes (MSC2228 never became the spec), so a room's timer, or one message's own time,
// deletes this phone's copy then. A message of ours is also taken back for everyone then (a
// redaction, as Delete for everyone does), while the account runs here: their apps show it as
// deleted. What the others wrote stays with them. Delete for me hides a message on this phone
// only, for good: Matrix keeps nothing hidden for one device, so it is remembered here, and one
// that comes again, in older messages fetched, stays away.
//
// Blocking is Matrix's own: the account's m.ignored_user_list (its account data), which the
// homeserver keeps for all the account's apps; from then on it sends nothing of theirs, invites
// neither. They are not told. What came from them before stays where it is.

/** Messages of ours taken back at most in one round, so the homeserver does not hold us back. */
const TAKE_BACK_AT_ONCE = 10;

/** A room's rules, as kept and checked. */
export const rulesOf = (room: Pick<MatrixRoom, 'rules'> | undefined): ChatRules | undefined => checkedRules(room?.rules);

/** The messages of a room that show: not gone by `now`, by its rules. */
export function shownIn(room: MatrixRoom, now = Date.now()): MatrixMessage[] {
  const rules = rulesOf(room);
  const gone = new Set(goneOf(rules, room.messages, (m) => m.id, (m) => m.ts, now));
  return gone.size ? room.messages.filter((m) => !gone.has(m)) : room.messages;
}

/** When the next message of a room goes, or 0. */
export const nextGoesIn = (room: MatrixRoom, now = Date.now()): number => nextGoes(rulesOf(room), room.messages, (m) => m.id, (m) => m.ts, now);

/** Sets a room's timer, in seconds (0: messages stay), for new messages. */
export function setTimerIn(state: MatrixState, roomId: string, after: number, now = Date.now()): void {
  const room = state.rooms[roomId];
  if (!room) return;
  room.rules = withTimer(rulesOf(room), after, now);
  if (!room.rules) delete room.rules;
}

/** Deletes these messages from this phone only, for good. */
export function hideIn(state: MatrixState, roomId: string, ids: readonly string[]): void {
  const room = state.rooms[roomId];
  if (!room || !ids.length) return;
  room.messages = room.messages.filter((m) => !ids.includes(m.id));
  room.rules = withHidden(rulesOf(room), ids);
  if (room.pinned) room.pinned = room.pinned.filter((id) => !ids.includes(id));
}

/** The ids of a room's messages now, to tell afterwards which of ours were sent meanwhile (markSent). */
export const idsIn = (state: MatrixState, roomId: string): Set<string> => new Set(state.rooms[roomId]?.messages.map((m) => m.id) ?? []);

/** Gives the messages of ours that went since `before` a time of their own: `lasts` seconds after each was sent. */
export function markSent(state: MatrixState, roomId: string, before: Set<string>, lasts: number): void {
  const room = state.rooms[roomId];
  if (!room || lasts <= 0) return;
  let rules = rulesOf(room);
  for (const m of room.messages) if (m.sender === state.userId && !m.state && !before.has(m.id)) rules = withOne(rules, m.id, m.ts + lasts * 1000);
  if (rules) room.rules = rules;
}

/**
 * Deletes from this phone what is gone by `now`, in every room: those whose time came, and those
 * deleted here that came again. A message of ours whose time came is taken back first (`takeBack`,
 * a redaction), a few at a time: one the homeserver refuses for good goes from here anyway; one it
 * could not be asked of now waits for the next round, hidden meanwhile. Answers whether anything went.
 */
export async function sweepMatrixRules(state: MatrixState, takeBack: (roomId: string, id: string) => Promise<void>, now = Date.now()): Promise<boolean> {
  let changed = false;
  let asked = 0;
  for (const room of Object.values(state.rooms)) {
    const rules = rulesOf(room);
    if (!rules) continue;
    const gone = goneOf(rules, room.messages, (m) => m.id, (m) => m.ts, now);
    if (!gone.length) continue;
    const went: MatrixMessage[] = [];
    for (const m of gone) {
      const due = !rules.hidden?.includes(m.id);
      if (due && m.sender === state.userId && !m.state && !m.deleted && !m.call) {
        if (asked >= TAKE_BACK_AT_ONCE) continue;
        asked++;
        try {
          await takeBack(room.id, m.id);
        } catch (error) {
          // Refused for good (not ours to take back any more, say): it goes from here all the same.
          if (!(error instanceof MatrixError) || error.code === 'M_LIMIT_EXCEEDED' || error.status >= 500) continue;
        }
      }
      went.push(m);
    }
    if (!went.length) continue;
    const ids = went.map((m) => m.id);
    room.messages = room.messages.filter((m) => !went.includes(m));
    // One that went at a time of its own is remembered, as older messages fetched could bring it
    // back; one that went by the timer would go again by it.
    const own = ids.filter((id) => rules.ones?.[id] !== undefined);
    room.rules = own.length ? withHidden(rules, own) : withoutOnes(rules, ids);
    if (!room.rules) delete room.rules;
    if (room.pinned) room.pinned = room.pinned.filter((id) => !ids.includes(id));
    changed = true;
  }
  return changed;
}

/** Whether a message of a room is gone by `now`. */
export const goneHere = (room: MatrixRoom, message: Pick<MatrixMessage, 'id' | 'ts'>, now = Date.now()): boolean => {
  const until = goesAt(rulesOf(room), message.id, message.ts);
  return (until > 0 && until <= now) || !!rulesOf(room)?.hidden?.includes(message.id);
};

/** Whether anything of the account is gone by `now`, to sweep. */
export function matrixRulesDue(state: MatrixState, now = Date.now()): boolean {
  return Object.values(state.rooms).some((room) => room.rules && goneOf(rulesOf(room), room.messages, (m) => m.id, (m) => m.ts, now).length > 0);
}

// ---- blocking ----

const IGNORED = 'm.ignored_user_list';

/** Whether the account blocks `userId`. */
export const isIgnored = (state: Pick<MatrixState, 'ignored'>, userId: string): boolean => !!state.ignored?.includes(userId);

/**
 * Blocks someone, or lets them through again, on every app of the account: the list as the
 * homeserver has it now, another app's changes kept, with them on it or off it. Their invites go too.
 */
export async function setIgnored(state: MatrixState, userId: string, on: boolean): Promise<void> {
  if (!isMatrixId(userId) || userId === state.userId) throw new Error(t('Write a Matrix ID, such as @name:matrix.org.'));
  const path = `/user/${enc(state.userId)}/account_data/${IGNORED}`;
  let users: Json = {};
  try {
    const kept = await call(state, 'GET', path);
    if (typeof kept.ignored_users === 'object' && kept.ignored_users !== null) users = { ...(kept.ignored_users as Json) };
  } catch (error) {
    // None yet.
    if (!(error instanceof MatrixError) || error.code !== 'M_NOT_FOUND') throw error;
  }
  if (on) users[userId] = {};
  else delete users[userId];
  await call(state, 'PUT', path, { ignored_users: users });
  const ignored = Object.keys(users).filter(isMatrixId);
  if (ignored.length) state.ignored = ignored;
  else delete state.ignored;
  if (on) for (const room of Object.values(state.rooms)) if (room.invitedBy === userId) delete state.rooms[room.id];
}

/** Reads the list again from the homeserver, as another app may have changed it. */
export async function refreshIgnored(state: MatrixState): Promise<void> {
  try {
    const kept = await call(state, 'GET', `/user/${enc(state.userId)}/account_data/${IGNORED}`);
    const ignored = ignoredOf(kept);
    if (ignored.length) state.ignored = ignored;
    else delete state.ignored;
  } catch (error) {
    if (error instanceof MatrixError && error.code === 'M_NOT_FOUND') delete state.ignored;
    else throw error;
  }
}
