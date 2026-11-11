// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// What each member of a Matrix room may do there, as its power levels say (m.room.power_levels):
// a level for each member, and the level each thing asks for. Element calls 100 an admin and 50 a
// moderator. In rooms of version 12 on, those who made the room (m.room.create: its sender and
// additional_creators) stand above every level, and are never listed in it; Element calls them
// owners. The homeserver checks every change as the spec has it: this only says what to offer,
// so nothing is offered that it would refuse. Nothing here asks the homeserver (lib/matrix-members.ts does).

/** A room's power levels as a phone keeps them: the levels only, the rest of the event left out. */
export type MatrixPower = {
  users: Record<string, number>;
  usersDefault: number;
  /** The level that sending each type of event asks for, where the room names one. */
  events: Record<string, number>;
  eventsDefault: number;
  stateDefault: number;
  kick: number;
  ban: number;
  redact: number;
  invite: number;
};

/** The level Element calls an admin, and a moderator. */
export const ADMIN = 100;
export const MODERATOR = 50;

/** The most members, and event types, a room's levels keep. */
export const MOST_POWERED = 2000;
const MOST_EVENTS = 100;

type Json = Record<string, unknown>;

const object = (value: unknown): Json => (value && typeof value === 'object' && !Array.isArray(value) ? (value as Json) : {});

// A level as the spec writes it: an integer, or in rooms before version 10 its digits too.
function level(value: unknown): number | null {
  if (typeof value === 'number' && Number.isInteger(value)) return value;
  if (typeof value === 'string' && /^[+-]?\d{1,16}$/.test(value.trim())) return Number(value.trim());
  return null;
}

const levelOr = (value: unknown, otherwise: number) => level(value) ?? otherwise;

/** The levels of an m.room.power_levels event's content, with the spec's defaults for those it leaves out. */
export function powerOfContent(content: unknown): MatrixPower {
  const c = object(content);
  const users: Record<string, number> = {};
  for (const [who, value] of Object.entries(object(c.users)).slice(0, MOST_POWERED)) {
    const at = level(value);
    if (at !== null && /^@[^:\s]+:\S+$/.test(who)) users[who] = at;
  }
  const events: Record<string, number> = {};
  for (const [type, value] of Object.entries(object(c.events)).slice(0, MOST_EVENTS)) {
    const at = level(value);
    if (at !== null && type.length <= 255) events[type] = at;
  }
  return {
    users,
    usersDefault: levelOr(c.users_default, 0),
    events,
    eventsDefault: levelOr(c.events_default, 0),
    stateDefault: levelOr(c.state_default, 50),
    kick: levelOr(c.kick, 50),
    ban: levelOr(c.ban, 50),
    redact: levelOr(c.redact, 50),
    invite: levelOr(c.invite, 0),
  };
}

/** Whether a room of this version holds its makers above every level (version 12 on). */
export function creatorsRule(version: unknown): boolean {
  const v = typeof version === 'string' ? version : '1';
  return (/^\d+$/.test(v) && Number(v) >= 12) || v.startsWith('org.matrix.hydra.');
}

/** Who made a room, from its m.room.create event, where they stand above every level; none otherwise. */
export function creatorsOf(sender: unknown, content: unknown): string[] | undefined {
  const c = object(content);
  if (!creatorsRule(c.room_version) || typeof sender !== 'string') return undefined;
  const more = Array.isArray(c.additional_creators) ? c.additional_creators.filter((who): who is string => typeof who === 'string' && /^@[^:\s]+:\S+$/.test(who)) : [];
  return [...new Set([sender, ...more])].slice(0, 50);
}

/** What a room says of who may do what: its levels, when known, and who made it. */
export type Ruled = { power?: MatrixPower; creators?: string[] };

/** A member's level: Infinity for one who made the room where makers stand above all; null while the room's levels are not known. */
export function levelOf(room: Ruled, user: string): number | null {
  if (room.creators?.includes(user)) return Infinity;
  if (!room.power) return null;
  return room.power.users[user] ?? room.power.usersDefault;
}

export type MatrixRole = 'owner' | 'admin' | 'moderator';

/** What Element calls a member: its owner, an admin, a moderator, or nothing. */
export function roleOf(room: Ruled, user: string): MatrixRole | null {
  const at = levelOf(room, user);
  if (at === null) return null;
  if (at === Infinity) return 'owner';
  return at >= ADMIN ? 'admin' : at >= MODERATOR ? 'moderator' : null;
}

/** Whether `me` may set a piece of the room's state of `type` (its name, its topic, its levels). */
export function maySetState(room: Ruled, me: string, type: string): boolean {
  const mine = levelOf(room, me);
  if (mine === Infinity) return true;
  return mine !== null && !!room.power && mine >= (room.power.events[type] ?? room.power.stateDefault);
}

/** Whether `me` may take `target` out of the room ('kick') or bar them ('ban'): one below us, not us. */
export function mayRemove(room: Ruled, me: string, target: string, how: 'kick' | 'ban'): boolean {
  if (target === me) return false;
  const mine = levelOf(room, me);
  const theirs = levelOf(room, target) ?? (mine === Infinity ? 0 : null);
  if (mine === null || theirs === null) return false;
  return (mine === Infinity || (!!room.power && mine >= room.power[how])) && theirs < mine;
}

/** Whether `me` may take back the messages of others (a redaction of theirs). */
export function mayRedactOthers(room: Ruled, me: string): boolean {
  const mine = levelOf(room, me);
  if (mine === Infinity) return true;
  return mine !== null && !!room.power && mine >= room.power.redact && mine >= (room.power.events['m.room.redaction'] ?? room.power.eventsDefault);
}

/**
 * Whether `me` may make `target` an admin, or no more one (`admin` false): only with the right to
 * change the levels, for one below us, never one who made the room; an admin is made by an admin,
 * and only one above admins takes it away.
 */
export function mayMakeAdmin(room: Ruled, me: string, target: string, admin: boolean): boolean {
  if (target === me || room.creators?.includes(target) || !room.power) return false;
  const mine = levelOf(room, me);
  const theirs = levelOf(room, target);
  if (mine === null || theirs === null || theirs >= mine || !maySetState(room, me, 'm.room.power_levels')) return false;
  return admin ? theirs < ADMIN && mine >= ADMIN : theirs >= ADMIN;
}

/** The content of the room's levels, as the homeserver has it now, with `target` made an admin or no more one. */
export function adminContent(content: unknown, target: string, admin: boolean): Json {
  const c = object(content);
  const users = { ...object(c.users) };
  if (admin) users[target] = ADMIN;
  // Back to the room's default, unless that is an admin's too.
  else if (levelOr(c.users_default, 0) >= ADMIN) users[target] = 0;
  else delete users[target];
  return { ...c, users };
}
