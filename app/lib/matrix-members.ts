// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// Running a Matrix group, as Element does (lib/matrix.ts holds the account): who is in it, as the
// homeserver has them now; who may do what there (m.room.power_levels, lib/matrix-power.ts);
// making someone an admin or no more one; its name (m.room.name) and topic (m.room.topic); taking
// someone out (a kick) or barring them (a ban). And finding people by name in the homeserver's
// user directory, to start a chat with. Each is a request to our homeserver, which checks it as the
// spec has it: only what our level allows is asked, so it is not refused.
//
// The homeserver learns what is looked for in its directory, as it does for Element. Which people
// it finds is its own choice: those it shares a room with, or all its users.

import { t } from './i18n';
import { call, enc, isMatrixId, MatrixError, sendStateEvent, type Json, type MatrixState } from './matrix';
import { adminContent, creatorsOf, creatorsRule, mayMakeAdmin, mayRemove, maySetState, powerOfContent } from './matrix-power';

/** A member of a room, as its list of members shows them. */
export type RoomMember = { id: string; membership: 'join' | 'invite'; name?: string; avatar?: string };

/** A room keeps its members' list when it has at most this many (an encrypted one keeps all, to send to each). */
export const MOST_MEMBERS_KEPT = 500;

const words = (value: unknown, most: number) => (typeof value === 'string' && value.trim() ? value.trim().slice(0, most) : undefined);
const mxc = (value: unknown) => (typeof value === 'string' && /^mxc:\/\/[^/]+\/[^/?#]+$/.test(value) ? value : undefined);

function roomOf(state: MatrixState, roomId: string) {
  const room = state.rooms[roomId];
  if (!room) throw new Error(t('This Matrix chat is not here any more.'));
  return room;
}

/**
 * The members of a room, those in it and those asked, as the homeserver has them now; the room
 * learns again who may do what in it. Answers them.
 */
export async function roomMembers(state: MatrixState, roomId: string): Promise<RoomMember[]> {
  const room = roomOf(state, roomId);
  const answer = await call(state, 'GET', `/rooms/${enc(roomId)}/members?not_membership=leave`);
  const found = new Map<string, RoomMember>();
  for (const event of (answer.chunk as Json[] | undefined) ?? []) {
    const who = event.state_key;
    const content = (event.content as Json | undefined) ?? {};
    if (event.type !== 'm.room.member' || typeof who !== 'string' || !isMatrixId(who)) continue;
    if (content.membership !== 'join' && content.membership !== 'invite') continue;
    const name = words(content.displayname, 100);
    const avatar = mxc(content.avatar_url);
    found.set(who, { id: who, membership: content.membership, ...(name ? { name } : {}), ...(avatar ? { avatar } : {}) });
  }
  const members = [...found.values()];
  if (room.encrypted || members.length <= MOST_MEMBERS_KEPT) room.members = Object.fromEntries(members.map(({ id, ...member }) => [id, member]));
  await learnRule(state, roomId);
  return members;
}

/**
 * Learns who may do what in a room: its levels (m.room.power_levels) and, in a room of version 12
 * on, who made it (m.room.create's sender), which a room synced before Erevos kept them lacks.
 */
export async function learnRule(state: MatrixState, roomId: string): Promise<void> {
  const room = roomOf(state, roomId);
  try {
    room.power = powerOfContent(await call(state, 'GET', `/rooms/${enc(roomId)}/state/m.room.power_levels/`));
  } catch (error) {
    if (!(error instanceof MatrixError && error.status === 404)) throw error;
  }
  if (room.creators) return;
  // The whole event, where the homeserver gives it (spec 1.16); its content alone otherwise.
  const create = await call(state, 'GET', `/rooms/${enc(roomId)}/state/m.room.create/?format=event`).catch(() => null);
  if (!create) return;
  const whole = create.type === 'm.room.create' && typeof create.sender === 'string' && create.content && typeof create.content === 'object';
  const content = whole ? (create.content as Json) : create;
  let sender = whole ? create.sender : undefined;
  // In a room of version 12 on, the room's ID is its m.room.create event's, with ! for $.
  if (sender === undefined && !roomId.includes(':') && creatorsRule(content.room_version)) {
    const event = await call(state, 'GET', `/rooms/${enc(roomId)}/event/${enc(`$${roomId.slice(1)}`)}`).catch(() => null);
    if (event?.type === 'm.room.create') sender = event.sender;
  }
  const makers = creatorsOf(sender, content);
  if (makers) room.creators = makers;
}

const NOT_ALLOWED = () => new Error(t('Only the admins of this group may do that.'));

/** Makes a member an admin, or no more one, as our level allows: on the room's levels as the homeserver has them now. */
export async function setAdmin(state: MatrixState, roomId: string, target: string, admin: boolean): Promise<void> {
  const room = roomOf(state, roomId);
  const path = `/rooms/${enc(roomId)}/state/m.room.power_levels/`;
  const now = await call(state, 'GET', path);
  if (!mayMakeAdmin({ ...room, power: powerOfContent(now) }, state.userId, target, admin)) throw NOT_ALLOWED();
  const next = adminContent(now, target, admin);
  await call(state, 'PUT', path, next);
  room.power = powerOfContent(next);
}

/** Takes a member out of a room (a kick), or bars them from it (`ban`), as our level allows. */
export async function removeMember(state: MatrixState, roomId: string, target: string, ban: boolean): Promise<void> {
  const room = roomOf(state, roomId);
  if (!mayRemove(room, state.userId, target, ban ? 'ban' : 'kick')) throw NOT_ALLOWED();
  await call(state, 'POST', `/rooms/${enc(roomId)}/${ban ? 'ban' : 'kick'}`, { user_id: target });
  delete room.members[target];
}

/** Gives a room a new name, as our level allows. */
export async function renameRoom(state: MatrixState, roomId: string, name: string): Promise<void> {
  const room = roomOf(state, roomId);
  const named = name.trim().slice(0, 100);
  if (!named) throw new Error(t('Give the group a name.'));
  if (!maySetState(room, state.userId, 'm.room.name')) throw NOT_ALLOWED();
  await sendStateEvent(state, roomId, 'm.room.name', '', { name: named });
  room.name = named;
}

/** Sets what a room is about (its topic), or takes it away with '', as our level allows. */
export async function setTopic(state: MatrixState, roomId: string, topic: string): Promise<void> {
  const room = roomOf(state, roomId);
  const said = topic.trim().slice(0, 500);
  if (!maySetState(room, state.userId, 'm.room.topic')) throw NOT_ALLOWED();
  await sendStateEvent(state, roomId, 'm.room.topic', '', { topic: said });
  if (said) room.topic = said;
  else delete room.topic;
}

/** Someone the homeserver's directory found. */
export type FoundPerson = { id: string; name?: string; avatar?: string };

/** The most people one look in the directory finds. */
export const PEOPLE_FOUND = 20;

/**
 * The people the homeserver's user directory finds by `term`, in their name or Matrix ID, but us;
 * `more`: it found more than it gave.
 */
export async function searchPeople(state: MatrixState, term: string): Promise<{ people: FoundPerson[]; more: boolean }> {
  const looked = term.trim().slice(0, 100);
  if (!looked) return { people: [], more: false };
  const answer = await call(state, 'POST', '/user_directory/search', { search_term: looked, limit: PEOPLE_FOUND });
  const people: FoundPerson[] = [];
  for (const result of (answer.results as Json[] | undefined) ?? []) {
    const id = result?.user_id;
    if (typeof id !== 'string' || !isMatrixId(id) || id === state.userId || people.some((p) => p.id === id)) continue;
    const name = words(result.display_name, 100);
    const avatar = mxc(result.avatar_url);
    people.push({ id, ...(name ? { name } : {}), ...(avatar ? { avatar } : {}) });
    if (people.length >= PEOPLE_FOUND) break;
  }
  return { people, more: answer.limited === true };
}
