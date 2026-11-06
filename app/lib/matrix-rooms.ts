// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// Finding and keeping Matrix rooms, as Element does (lib/matrix.ts holds the account): the public
// rooms a homeserver lists (/publicRooms), what a space holds (/hierarchy), pinning a message to a
// room's top (m.room.pinned_events), our own tags on a room (favourite, low priority), forgetting a
// room left, and looking for words in the messages this phone keeps.
//
// The public list and a space's rooms are asked of our homeserver, which then knows what was looked
// for, as it does for Element. Looking for words never asks the homeserver: an encrypted room's
// messages are readable only here, so only what this phone keeps is looked through.

import { t } from './i18n';
import { call, enc, MatrixError, request, type Json, type MatrixMessage, type MatrixRoom, type MatrixState } from './matrix';

/** A room as a list of rooms to join shows it. */
export type FoundRoom = {
  id: string;
  name: string;
  topic?: string;
  alias?: string;
  members: number;
  avatar?: string;
  /** A space, which holds rooms, not a chat. */
  space?: true;
  /** Whether we are in it already. */
  joined: boolean;
  /** Whether one may join it without an invite. */
  open: boolean;
};

const text = (value: unknown, most: number) => (typeof value === 'string' ? value.trim().slice(0, most) : '');
const mxc = (value: unknown) => (typeof value === 'string' && /^mxc:\/\/[^/]+\/[^/?#]+$/.test(value) ? value : undefined);

function foundOf(state: MatrixState, chunk: Json): FoundRoom | null {
  const id = chunk.room_id;
  if (typeof id !== 'string' || !id.startsWith('!')) return null;
  const alias = text(chunk.canonical_alias, 255);
  const topic = text(chunk.topic, 300);
  const members = typeof chunk.num_joined_members === 'number' && chunk.num_joined_members >= 0 ? Math.floor(chunk.num_joined_members) : 0;
  return {
    id,
    name: text(chunk.name, 100) || alias || id,
    ...(topic ? { topic } : {}),
    ...(alias.startsWith('#') ? { alias } : {}),
    members,
    ...(mxc(chunk.avatar_url) ? { avatar: mxc(chunk.avatar_url) } : {}),
    ...(chunk.room_type === 'm.space' ? { space: true as const } : {}),
    joined: !!state.rooms[id] && !state.rooms[id].invitedBy,
    open: chunk.join_rule === undefined || chunk.join_rule === 'public',
  };
}

/** The most rooms one page of a list brings. */
export const ROOMS_PAGE = 30;

/**
 * One page of the public rooms our homeserver lists, or those of `server` (another homeserver's,
 * asked through ours), with `term` in their name, address or topic when given. `next` fetches the
 * page after it.
 */
export async function publicRooms(state: MatrixState, term = '', server = '', since?: string): Promise<{ rooms: FoundRoom[]; next?: string }> {
  const at = server.trim().replace(/^https?:\/\//, '').replace(/\/+$/, '');
  if (at && !/^[a-z0-9.-]+(:\d+)?$/i.test(at)) throw new Error(t('Write a Matrix server, such as matrix.org.'));
  const body: Json = { limit: ROOMS_PAGE, ...(term.trim() ? { filter: { generic_search_term: term.trim().slice(0, 100) } } : {}), ...(since ? { since } : {}) };
  const answer = await call(state, 'POST', `/publicRooms${at ? `?server=${enc(at)}` : ''}`, body);
  const rooms = ((answer.chunk as Json[] | undefined) ?? []).map((chunk) => foundOf(state, chunk)).filter((r): r is FoundRoom => !!r);
  return { rooms, ...(typeof answer.next_batch === 'string' && rooms.length ? { next: answer.next_batch } : {}) };
}

/** What a space holds, one level down (/hierarchy): its rooms and the spaces in it, the space itself left out. */
export async function spaceRooms(state: MatrixState, spaceId: string, since?: string): Promise<{ rooms: FoundRoom[]; next?: string }> {
  const answer = await request(state, {
    method: 'GET',
    url: `${state.homeserver}/_matrix/client/v1/rooms/${enc(spaceId)}/hierarchy?max_depth=1&limit=${ROOMS_PAGE}${since ? `&from=${enc(since)}` : ''}`,
  });
  const rooms = ((answer.json.rooms as Json[] | undefined) ?? [])
    .filter((chunk) => chunk.room_id !== spaceId)
    .map((chunk) => foundOf(state, chunk))
    .filter((r): r is FoundRoom => !!r)
    // A room of a space may be for its members only (restricted): joining it is the homeserver's to allow.
    .map((r) => ({ ...r, open: true }));
  return { rooms, ...(typeof answer.json.next_batch === 'string' ? { next: answer.json.next_batch } : {}) };
}

/** The spaces we are in. */
export function spacesOf(state: MatrixState): MatrixRoom[] {
  return Object.values(state.rooms).filter((room) => room.space && !room.invitedBy);
}

/** The most messages pinned in a room, as this phone keeps them. */
export const MOST_PINNED = 50;

/** Pins a message to the room's top, or takes it down, for everyone in it: the homeserver refuses it for one who may not. */
export async function pinMessage(state: MatrixState, roomId: string, eventId: string, on: boolean): Promise<void> {
  const room = state.rooms[roomId];
  if (!room) return;
  const before = room.pinned ?? [];
  const pinned = on ? [...before.filter((id) => id !== eventId), eventId].slice(-MOST_PINNED) : before.filter((id) => id !== eventId);
  await call(state, 'PUT', `/rooms/${enc(roomId)}/state/m.room.pinned_events/`, { pinned });
  if (pinned.length) room.pinned = pinned;
  else delete room.pinned;
}

/** Our tags, as Matrix names them. */
const TAGS = { favourite: 'm.favourite', low: 'm.lowpriority' } as const;

/**
 * Makes a room one of our favourites, or of low priority, or neither: a room is one or the other,
 * as Element has it. Kept in our account on the homeserver, so our other apps sort it so too.
 */
export async function tagRoom(state: MatrixState, roomId: string, tag: keyof typeof TAGS | null): Promise<void> {
  const room = state.rooms[roomId];
  if (!room) return;
  const path = (name: string) => `/user/${enc(state.userId)}/rooms/${enc(roomId)}/tags/${enc(name)}`;
  for (const [key, name] of Object.entries(TAGS) as [keyof typeof TAGS, string][]) {
    if (key === tag) await call(state, 'PUT', path(name), key === 'favourite' ? { order: 0.5 } : {});
    else if (room.tags?.[key]) await call(state, 'DELETE', path(name));
  }
  if (tag) room.tags = { [tag]: true };
  else delete room.tags;
}

/** Leaves a room and has the homeserver forget it, so it no longer shows in our other apps either. */
export async function leaveAndForget(state: MatrixState, roomId: string): Promise<void> {
  await call(state, 'POST', `/rooms/${enc(roomId)}/leave`, {});
  await call(state, 'POST', `/rooms/${enc(roomId)}/forget`, {});
  delete state.rooms[roomId];
  delete state.outbound[roomId];
}

/** The rooms in the order a list shows them: invites, favourites, the rest by their newest message, then those of low priority. */
export function sortedRooms(rooms: MatrixRoom[]): MatrixRoom[] {
  const last = (r: MatrixRoom) => r.messages.at(-1)?.ts ?? 0;
  const rank = (r: MatrixRoom) => (r.invitedBy ? 0 : r.tags?.favourite ? 1 : r.tags?.low ? 3 : 2);
  return [...rooms].sort((a, b) => rank(a) - rank(b) || last(b) - last(a));
}

/** A message found by its words: its room, and it. */
export type FoundMessage = { roomId: string; message: MatrixMessage };

/** The most messages a look for words finds. */
export const MOST_FOUND = 100;

/**
 * The messages this phone keeps whose words, file's name, poll or place's words have `term` in
 * them, whatever their case, the newest first. Nothing is asked of the homeserver.
 */
export function findMessages(state: MatrixState, term: string, roomId?: string): FoundMessage[] {
  const looked = term.trim().toLocaleLowerCase();
  if (looked.length < 2) return [];
  const found: FoundMessage[] = [];
  for (const room of Object.values(state.rooms)) {
    if (roomId && room.id !== roomId) continue;
    for (const message of room.messages) {
      if (message.deleted || message.locked || message.call) continue;
      const words = [message.text, message.file?.name, message.poll?.q, ...(message.poll?.answers.map((a) => a.text) ?? []), message.preview?.title].filter(Boolean).join('\n');
      if (words.toLocaleLowerCase().includes(looked)) found.push({ roomId: room.id, message });
    }
  }
  return found.sort((a, b) => b.message.ts - a.message.ts).slice(0, MOST_FOUND);
}

/** The most rooms whose join rule one look asks the homeserver for. */
export const JOINS_AT_ONCE = 20;

/**
 * Asks the homeserver who may join the rooms we are in whose join rule (m.room.join_rules) this
 * phone does not know: rooms joined before Erevos kept it, as a sync tells it only when it
 * changes. JOINS_AT_ONCE at most; a room with none is open only to those asked. Answers how many
 * it learned; one the homeserver did not answer for is asked again the next time.
 */
export async function learnJoins(state: MatrixState, most = JOINS_AT_ONCE): Promise<number> {
  const rooms = Object.values(state.rooms).filter((room) => room.joins === undefined && !room.direct && !room.space && !room.invitedBy).slice(0, most);
  let learned = 0;
  for (const room of rooms) {
    try {
      const content = await call(state, 'GET', `/rooms/${enc(room.id)}/state/m.room.join_rules/`);
      room.joins = content.join_rule === 'public' ? 'public' : 'other';
      learned += 1;
    } catch (error) {
      if (error instanceof MatrixError && error.status === 404) {
        room.joins = 'other';
        learned += 1;
      }
    }
  }
  return learned;
}
