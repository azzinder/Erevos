// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { randomBytes, toHex } from './crypto';
import { t } from './i18n';
import { bare, domainOf, isXmppId, newXmppId, NS, XmppError, type Taken, type XmppChat, type XmppConnection, type XmppState } from './xmpp';
import { child, children, el, textOf, type XmlElement } from './xmpp-xml';

// Group chats on XMPP (docs/xmpp.md), as Conversations, Monal, Gajim and Dino have them: rooms of
// a multi-user chat service (MUC, XEP-0045) that each device of the account joins. A private group
// is a room only its members may join (members-only) and where everyone sees who everyone is
// (non-anonymous), so OMEMO can encrypt each message to every member's devices, as Conversations'
// private groups do; any other room is a channel, written without encryption. The rooms the
// account is in are kept as its bookmarks (XEP-0402), so its other apps join them too, and join
// here those it joins there. Their messages are taken in lib/xmpp.ts with the others'. Who owns a
// group and who runs it is shown beside them, as the room says it (their affiliation); its
// description is the one its settings hold (muc#roomconfig_roomdesc), which its owner changes.

export const NS_MUC = 'http://jabber.org/protocol/muc';
export const NS_MUC_USER = `${NS_MUC}#user`;
export const NS_MUC_ADMIN = `${NS_MUC}#admin`;
export const NS_MUC_OWNER = `${NS_MUC}#owner`;
export const NS_CONFERENCE = 'jabber:x:conference';
export const NS_BOOKMARKS = 'urn:xmpp:bookmarks:1';
const NS_PUBSUB = 'http://jabber.org/protocol/pubsub';
const NS_INFO = 'http://jabber.org/protocol/disco#info';
const NS_ITEMS = 'http://jabber.org/protocol/disco#items';
export const NS_DATA = 'jabber:x:data';

/** How long the server's group service is known before it is looked for again. */
const SERVICE_FRESH_MS = 24 * 3600_000;
/** How many messages a room without an archive gives when it is first joined. */
const FIRST_HISTORY = 20;
/** The longest description of a group kept or set. */
export const DESCRIPTION_LONGEST = 500;

/** A group the account is in, kept with its chat (XmppChat.room). */
export type XmppRoom = {
  /** The name we have in it. */
  nick: string;
  /** Its name, as the room or the bookmark says. */
  name?: string;
  /** Members only, and everyone's address seen by everyone: written with OMEMO to every member. */
  private: boolean;
  /** Who is in it now, by name: their address, when the room says it. */
  occupants: Record<string, string>;
  /** Its members, admins and owners, by address: whom OMEMO writes to. */
  members: string[];
  /** The room's archive id of the newest message seen, when it keeps an archive (MAM). */
  archived?: string;
  /** It keeps an archive, as it says. */
  mam?: boolean;
  subject?: string;
  /** Its description, as the room says it (muc#roominfo_description). */
  description?: string;
  /** We own or run it, so we may add people, take them out and set its subject. */
  admin?: boolean;
  /** We own it, so we may also rename it and make admins. */
  owner?: boolean;
  /** Its admins and owners, by address, as far as the room lets us see them. */
  admins?: string[];
  /** Its owners, by address, as far as the room lets us see them. */
  owners?: string[];
  /** In it now, on this connection. */
  joined?: boolean;
  /** Why we are not in it, as the room said. */
  problem?: string;
  /** The password it asks for, when it asks. */
  password?: string;
  /** Messages from before this time were there before we joined: they count as read. */
  readTo?: number;
};

/** An invitation to a group, from one of the account's contacts. */
export type XmppInvite = { room: string; from: string; reason?: string; password?: string; at: number };

/** The server's group service, as last found. */
export type XmppMuc = { jid: string; at: number };

/** The group at `jid`, when the account is in it. */
export function roomOf(state: XmppState, jid: string): XmppRoom | undefined {
  return state.chats[bare(jid)]?.room;
}

/** A group's chat, made when it is not there yet. */
function roomChat(state: XmppState, jid: string, room: XmppRoom): XmppChat {
  const chat = (state.chats[jid] ??= { jid, messages: [], unread: 0, lastAt: 0 });
  chat.room ??= room;
  return chat;
}

/** The addresses OMEMO writes to in a private group: its members and those in it, not us. */
export function groupPeople(state: XmppState, room: XmppRoom): string[] {
  const people = new Set([...room.members, ...Object.values(room.occupants)].filter((jid) => jid && jid !== state.jid));
  return [...people].sort();
}

/** Whether someone owns the group or runs it, by their address, as far as the room lets us see it. */
export function rankOf(room: XmppRoom, address: string): 'owner' | 'admin' | null {
  if (!address) return null;
  return room.owners?.includes(address) ? 'owner' : room.admins?.includes(address) ? 'admin' : null;
}

// What the room says of someone's affiliation, as they come or it changes: among its owners and admins, or not.
function takeRank(room: XmppRoom, address: string, affiliation: string): void {
  const sorted = (list: string[] | undefined, on: boolean) => (on ? [...new Set([...(list ?? []), address])].sort() : list?.filter((a) => a !== address));
  const admin = affiliation === 'owner' || affiliation === 'admin';
  if (admin !== !!room.admins?.includes(address)) room.admins = sorted(room.admins, admin);
  if ((affiliation === 'owner') !== !!room.owners?.includes(address)) room.owners = sorted(room.owners, affiliation === 'owner');
}

/** Whether `text` names `nick`, as a word: a channel tells only of those. */
export function mentions(text: string, nick: string): boolean {
  const name = nick.trim().toLowerCase();
  if (name.length < 2) return false;
  const lower = text.toLowerCase();
  for (let at = lower.indexOf(name); at >= 0; at = lower.indexOf(name, at + 1)) {
    const before = at === 0 ? '' : lower[at - 1];
    const after = lower[at + name.length] ?? '';
    if (!/[\p{L}\p{N}]/u.test(before) && !/[\p{L}\p{N}]/u.test(after)) return true;
  }
  return false;
}

// ---- finding ----

/** The server's group service: an item of its domain whose identity is a text conference. */
export async function findMuc(connection: XmppConnection, domain: string, known?: XmppMuc, now = Date.now()): Promise<XmppMuc | null> {
  if (known && now - known.at < SERVICE_FRESH_MS) return known;
  const items = await connection.iq('get', domain, el('query', { xmlns: NS_ITEMS }));
  for (const item of children(child(items, 'query', NS_ITEMS), 'item')) {
    const jid = item.attrs.jid;
    if (!jid || jid.includes('@')) continue;
    try {
      const info = child(await connection.iq('get', jid, el('query', { xmlns: NS_INFO })), 'query', NS_INFO);
      if (children(info, 'identity').some((i) => i.attrs.category === 'conference' && i.attrs.type === 'text')) return { jid, at: now };
    } catch {
      // That item does not say: the next.
    }
  }
  return null;
}

/** A public group as a list of groups to join shows it. */
export type FoundChannel = { jid: string; name: string; description?: string; users?: number; joined: boolean };

/** The most groups a list brings. */
export const CHANNELS_MOST = 100;

/** The groups our server's group service lists (disco#items): those it lets anyone find. */
export async function serverChannels(state: XmppState, connection: XmppConnection): Promise<FoundChannel[]> {
  const muc = await findMuc(connection, state.jid.slice(state.jid.indexOf('@') + 1), state.muc);
  if (!muc) throw new XmppError(t('Your XMPP server has no groups.'));
  state.muc = muc;
  const items = child(await connection.iq('get', muc.jid, el('query', { xmlns: NS_ITEMS })), 'query', NS_ITEMS);
  return children(items, 'item')
    .filter((item) => isXmppId(item.attrs.jid ?? ''))
    .slice(0, CHANNELS_MOST)
    .map((item) => {
      const jid = bare(item.attrs.jid);
      return { jid, name: (item.attrs.name ?? '').trim().slice(0, 100) || jid, joined: !!state.chats[jid]?.room };
    });
}

/** The public channel search that Conversations and Dino use (XEP-0433), at search.jabber.network. */
export const CHANNEL_SEARCH = 'api@search.jabber.network';
const NS_CHANNEL_SEARCH = 'urn:xmpp:channel-search:0:search';

/**
 * Public groups on any server whose name or description has `term` (XEP-0433), as the search
 * service of search.jabber.network has them: it learns what was looked for, and from which server.
 */
export async function searchChannels(state: XmppState, connection: XmppConnection, term: string): Promise<FoundChannel[]> {
  const looked = term.trim().slice(0, 100);
  if (looked.length < 2) return [];
  const field = (name: string, value: string, type?: string) => el('field', { var: name, type }, el('value', {}, value));
  // A get with the filled form, as Conversations asks it.
  const answer = await connection.iq(
    'get',
    CHANNEL_SEARCH,
    el(
      'search',
      { xmlns: NS_CHANNEL_SEARCH },
      el('x', { xmlns: NS_DATA, type: 'submit' }, field('FORM_TYPE', `${NS_CHANNEL_SEARCH}-params`, 'hidden'), field('q', looked), field('sinname', 'true'), field('sindescription', 'true')),
      el('set', { xmlns: NS.rsm }, el('max', {}, String(CHANNELS_MOST))),
    ),
  );
  const result = child(answer, 'result', NS_CHANNEL_SEARCH);
  return children(result, 'item')
    .filter((item) => isXmppId(item.attrs.address ?? '') && textOf(child(item, 'service-type')).trim() !== 'xep0369')
    .slice(0, CHANNELS_MOST)
    .map((item) => {
      const jid = bare(item.attrs.address);
      const users = Number(textOf(child(item, 'nusers')).trim());
      const description = textOf(child(item, 'description')).trim().slice(0, 300);
      return {
        jid,
        name: textOf(child(item, 'name')).trim().slice(0, 100) || jid,
        ...(description ? { description } : {}),
        ...(Number.isInteger(users) && users >= 0 ? { users } : {}),
        joined: !!state.chats[jid]?.room,
      };
    });
}

export type RoomInfo = { private: boolean; mam: boolean; name?: string; description?: string; password: boolean };

/** What a room says of itself (XEP-0045 §6.4). Throws when there is no room at `jid`. */
export async function roomInfo(connection: XmppConnection, jid: string): Promise<RoomInfo> {
  let query: XmlElement | undefined;
  try {
    query = child(await connection.iq('get', jid, el('query', { xmlns: NS_INFO })), 'query', NS_INFO);
  } catch (error) {
    if (error instanceof XmppError && ['item-not-found', 'remote-server-not-found', 'service-unavailable'].includes(error.condition)) {
      throw new XmppError(t('There is no group at this address.'), error.condition);
    }
    throw error;
  }
  const identity = children(query, 'identity').find((i) => i.attrs.category === 'conference');
  if (!identity) throw new XmppError(t('There is no group at this address.'), 'item-not-found');
  const features = new Set(children(query, 'feature').map((f) => f.attrs.var));
  let name = identity.attrs.name?.trim() || undefined;
  let description = '';
  for (const form of children(query, 'x', NS_DATA)) {
    const field = (named: string) => textOf(child(children(form, 'field').find((f) => f.attrs.var === named), 'value')).trim();
    if (field('muc#roomconfig_roomname')) name = field('muc#roomconfig_roomname');
    description ||= field('muc#roominfo_description');
  }
  return {
    private: features.has('muc_membersonly') && features.has('muc_nonanonymous'),
    mam: features.has(NS.mam),
    name: name?.slice(0, 100),
    ...(description ? { description: description.slice(0, DESCRIPTION_LONGEST) } : {}),
    password: features.has('muc_passwordprotected'),
  };
}

// ---- joining ----

/** The presence that joins `jid` as `nick` (XEP-0045 §7.2), with what came before as `history` says. */
function joinElement(jid: string, nick: string, history: { max: number } | { since: number }, password?: string): XmlElement {
  return el(
    'presence',
    { to: `${jid}/${nick}` },
    el(
      'x',
      { xmlns: NS_MUC },
      'max' in history ? el('history', { maxstanzas: history.max }) : el('history', { since: new Date(history.since).toISOString() }),
      password ? el('password', {}, password) : null,
    ),
  );
}

/**
 * Joins a group the account is in, on this connection: what it says of itself, then the presence,
 * then, for a private group, its members, and what its archive has that was not seen. Whether it
 * let us in comes as presence, taken by takeRoomPresence.
 */
export async function enterRoom(state: XmppState, connection: XmppConnection, jid: string): Promise<void> {
  const chat = state.chats[jid];
  const room = chat?.room;
  if (!room) return;
  room.joined = false;
  room.occupants = {};
  let info: RoomInfo;
  try {
    info = await roomInfo(connection, jid);
  } catch (error) {
    room.problem = error instanceof Error ? error.message : String(error);
    return;
  }
  room.private = info.private;
  room.mam = info.mam;
  if (info.name) room.name = info.name;
  room.description = info.description;
  // With an archive, what came is read from it; without, the room gives what came since the last message.
  const history = info.mam ? { max: 0 } : chat.lastAt ? { since: chat.lastAt + 1 } : { max: FIRST_HISTORY };
  await connection.send(joinElement(jid, room.nick, history, room.password));
  if (room.private) await fetchMembers(connection, room, jid);
  if (room.mam) await fetchRoomArchive(state, connection, jid);
}

/** Joins every group the account is in: its bookmarks first, so groups joined elsewhere are joined here too. */
export async function enterRooms(state: XmppState, connection: XmppConnection): Promise<void> {
  try {
    const answer = await connection.iq('get', undefined, el('pubsub', { xmlns: NS_PUBSUB }, el('items', { node: NS_BOOKMARKS })));
    for (const item of children(child(child(answer, 'pubsub', NS_PUBSUB), 'items'), 'item')) takeBookmark(state, item);
  } catch {
    // No bookmarks on this server, or none yet.
  }
  for (const chat of Object.values(state.chats)) {
    if (chat.room) await enterRoom(state, connection, chat.jid).catch(() => undefined);
  }
}

/** A bookmark to join: its group is added, to be joined. Whether it was new. */
function takeBookmark(state: XmppState, item: XmlElement): boolean {
  const conference = child(item, 'conference', NS_BOOKMARKS);
  const jid = bare(item.attrs.id ?? '');
  if (!conference || !isXmppId(jid) || state.chats[jid]?.room) return false;
  if (conference.attrs.autojoin !== 'true' && conference.attrs.autojoin !== '1') return false;
  const nick = textOf(child(conference, 'nick', NS_BOOKMARKS)).trim() || ownNick(state);
  const password = textOf(child(conference, 'password', NS_BOOKMARKS)).trim() || undefined;
  roomChat(state, jid, { nick, name: conference.attrs.name?.trim() || undefined, private: false, occupants: {}, members: [], password, readTo: Date.now() });
  state.invites = state.invites?.filter((i) => i.room !== jid);
  return true;
}

function ownNick(state: XmppState): string {
  return state.jid.slice(0, state.jid.indexOf('@')) || 'erevos';
}

/** A private group's members, admins and owners, as far as the room lets us see them. */
async function fetchMembers(connection: XmppConnection, room: XmppRoom, jid: string): Promise<void> {
  const found = new Set<string>();
  const running = new Set<string>();
  const owning = new Set<string>();
  let any = false;
  for (const affiliation of ['owner', 'admin', 'member']) {
    try {
      const answer = await connection.iq('get', jid, el('query', { xmlns: NS_MUC_ADMIN }, el('item', { affiliation })));
      for (const item of children(child(answer, 'query', NS_MUC_ADMIN), 'item')) {
        const member = bare(item.attrs.jid ?? '');
        if (member.includes('@')) found.add(member);
        if (member.includes('@') && ['owner', 'admin'].includes(affiliation)) running.add(member);
        if (member.includes('@') && affiliation === 'owner') owning.add(member);
      }
      any = true;
    } catch {
      // Not ours to see: those in it say who they are.
    }
  }
  if (any) {
    room.members = [...found].sort();
    room.admins = [...running].sort();
    room.owners = [...owning].sort();
  }
}

/** What the room's archive keeps after the last message seen, or its newest page the first time. */
async function fetchRoomArchive(state: XmppState, connection: XmppConnection, jid: string): Promise<void> {
  for (let page = 0; page < 20; page++) {
    const room = state.chats[jid]?.room;
    if (!room) return;
    const set = el('set', { xmlns: NS.rsm }, el('max', {}, '50'), room.archived ? el('after', {}, room.archived) : el('before'));
    let fin: XmlElement | undefined;
    try {
      fin = child(await connection.iq('set', jid, el('query', { xmlns: NS.mam, queryid: newXmppId() }, set), 60_000), 'fin', NS.mam);
    } catch (error) {
      if (error instanceof XmppError && error.condition === 'item-not-found' && room.archived) {
        room.archived = undefined;
        continue;
      }
      return;
    }
    const last = textOf(child(child(fin, 'set', NS.rsm), 'last')).trim();
    const first = !room.archived;
    if (last) room.archived = last;
    if (first || fin?.attrs.complete === 'true' || !last) return;
  }
}

// ---- what comes ----

/** Takes a presence from a group the account is in: who is in it, and whether we are. False for any other presence. */
export async function takeRoomPresence(state: XmppState, connection: XmppConnection, presence: XmlElement, taken: Taken): Promise<boolean> {
  const from = presence.attrs.from ?? '';
  const jid = bare(from);
  const room = roomOf(state, jid);
  if (!room) return false;
  const slash = from.indexOf('/');
  if (slash < 0) return true;
  const nick = from.slice(slash + 1);
  const x = child(presence, 'x', NS_MUC_USER);
  const codes = new Set(children(x, 'status').map((s) => s.attrs.code));
  const item = child(x, 'item');
  const real = bare(item?.attrs.jid ?? '');
  taken.chats.push(jid);
  if (presence.attrs.type === 'error') {
    const error = child(presence, 'error');
    const condition = error?.children.find((c): c is XmlElement => typeof c !== 'string' && c.ns === NS.stanzas && c.name !== 'text')?.name ?? '';
    // The name is taken by someone else: once more, with a mark after it.
    if (condition === 'conflict' && !room.nick.endsWith('___')) {
      room.nick = `${room.nick}_`;
      await connection.send(joinElement(jid, room.nick, { max: 0 }, room.password)).catch(() => undefined);
      return true;
    }
    room.joined = false;
    room.problem =
      condition === 'registration-required'
        ? t('Only its members may join this group: ask one of its admins to add you.')
        : condition === 'forbidden'
          ? t('This group does not let you in.')
          : condition === 'not-authorized'
            ? t('This group asks for a password.')
            : condition === 'item-not-found'
              ? t('There is no group at this address.')
              : t('The group did not let you in ({reason}).', { reason: condition || '?' });
    return true;
  }
  const self = codes.has('110') || (nick === room.nick && (!real || real === state.jid));
  if (presence.attrs.type === 'unavailable') {
    if (codes.has('303') && item?.attrs.nick) {
      // A new name: the same person.
      if (self) room.nick = item.attrs.nick;
      else room.occupants[item.attrs.nick] = room.occupants[nick] ?? real;
      delete room.occupants[nick];
      return true;
    }
    delete room.occupants[nick];
    if (self) {
      room.joined = false;
      if (codes.has('301')) room.problem = t('You were banned from this group.');
      else if (codes.has('307') || codes.has('321') || codes.has('322')) room.problem = t('You were taken out of this group.');
      else if (codes.has('332')) room.problem = t('The group server stopped. It is joined again on the next connection.');
    }
    return true;
  }
  room.occupants[nick] = real.includes('@') ? real : '';
  if (real.includes('@') && item?.attrs.affiliation) takeRank(room, real, item.attrs.affiliation);
  if (room.private && real.includes('@') && real !== state.jid && ['owner', 'admin', 'member'].includes(item?.attrs.affiliation ?? '') && !room.members.includes(real)) {
    room.members = [...room.members, real].sort();
  }
  if (self) {
    room.joined = true;
    delete room.problem;
    room.admin = ['owner', 'admin'].includes(item?.attrs.affiliation ?? '') || undefined;
    room.owner = item?.attrs.affiliation === 'owner' || undefined;
  }
  return true;
}

/**
 * Takes an invitation to a group, through the room (XEP-0045 §7.8.2) or straight (XEP-0249):
 * kept when it is from one of the account's contacts, to a group it is not in. Whether the
 * message was one.
 */
export function takeInvite(state: XmppState, message: XmlElement): boolean {
  const from = message.attrs.from ?? '';
  const user = child(message, 'x', NS_MUC_USER);
  const mediated = child(user, 'invite');
  const direct = child(message, 'x', NS_CONFERENCE);
  if ((!mediated && !direct) || message.attrs.type === 'groupchat' || message.attrs.type === 'error') return false;
  const room = bare(mediated ? from : (direct?.attrs.jid ?? ''));
  const inviter = bare(mediated ? (mediated.attrs.from ?? '') : from);
  if (!isXmppId(room) || !isXmppId(inviter) || inviter === state.jid || state.chats[room]?.room) return true;
  // Anyone can invite anyone: only the account's contacts' invitations are shown.
  if (!state.roster[inviter]) return true;
  const invites = (state.invites ??= []);
  if (invites.some((i) => i.room === room)) return true;
  const reason = (textOf(child(mediated, 'reason')).trim() || direct?.attrs.reason?.trim() || '').slice(0, 300) || undefined;
  const password = textOf(child(user, 'password')).trim() || direct?.attrs.password || undefined;
  invites.push({ room, from: inviter, reason, password, at: Date.now() });
  return true;
}

/** A change of the account's bookmarks, from another of its apps: groups joined there are joined here, groups left there are left. */
export async function takeBookmarks(state: XmppState, connection: XmppConnection, items: XmlElement, taken: Taken): Promise<void> {
  for (const item of children(items, 'item')) {
    const jid = bare(item.attrs.id ?? '');
    const conference = child(item, 'conference', NS_BOOKMARKS);
    if (!conference) continue;
    if (takeBookmark(state, item)) {
      taken.chats.push(jid);
      await enterRoom(state, connection, jid).catch(() => undefined);
    } else if (conference.attrs.autojoin !== 'true' && conference.attrs.autojoin !== '1' && state.chats[jid]?.room) {
      await leaveHere(state, connection, jid);
      taken.chats.push(jid);
    }
  }
  for (const retract of children(items, 'retract')) {
    const jid = bare(retract.attrs.id ?? '');
    if (!state.chats[jid]?.room) continue;
    await leaveHere(state, connection, jid);
    taken.chats.push(jid);
  }
}

// ---- what goes ----

/** Keeps the group among the account's bookmarks, to join, seen only by the account. */
async function bookmark(connection: XmppConnection, jid: string, room: XmppRoom): Promise<void> {
  const item = el(
    'item',
    { id: jid },
    el('conference', { xmlns: NS_BOOKMARKS, name: room.name, autojoin: 'true' }, el('nick', {}, room.nick), room.password ? el('password', {}, room.password) : null),
  );
  const options = el(
    'publish-options',
    {},
    el(
      'x',
      { xmlns: NS_DATA, type: 'submit' },
      el('field', { var: 'FORM_TYPE', type: 'hidden' }, el('value', {}, `${NS_PUBSUB}#publish-options`)),
      el('field', { var: 'pubsub#persist_items' }, el('value', {}, 'true')),
      el('field', { var: 'pubsub#max_items' }, el('value', {}, 'max')),
      el('field', { var: 'pubsub#send_last_published_item' }, el('value', {}, 'never')),
      el('field', { var: 'pubsub#access_model' }, el('value', {}, 'whitelist')),
    ),
  );
  try {
    await connection.iq('set', undefined, el('pubsub', { xmlns: NS_PUBSUB }, el('publish', { node: NS_BOOKMARKS }, item), options));
  } catch (error) {
    if (!(error instanceof XmppError) || !['precondition-not-met', 'feature-not-implemented', 'bad-request'].includes(error.condition)) throw error;
    await connection.iq('set', undefined, el('pubsub', { xmlns: NS_PUBSUB }, el('publish', { node: NS_BOOKMARKS }, item)));
  }
}

/** The room's settings for a private group, from the form it gave (XEP-0045 §10.1.3): only the fields it has. */
function privateSettings(form: XmlElement | undefined, name: string): XmlElement {
  const offered = new Set(children(form, 'field').map((f) => f.attrs.var));
  const wanted: [string, string | string[]][] = [
    ['muc#roomconfig_roomname', name],
    ['muc#roomconfig_persistentroom', '1'],
    ['muc#roomconfig_membersonly', '1'],
    ['muc#roomconfig_whois', 'anyone'],
    ['muc#roomconfig_publicroom', '0'],
    ['muc#roomconfig_passwordprotectedroom', '0'],
    ['muc#roomconfig_moderatedroom', '0'],
    ['muc#roomconfig_changesubject', '0'],
    ['muc#roomconfig_enablearchiving', '1'],
    ['mam', '1'],
    // ejabberd: the members may see who the members are, which OMEMO needs.
    ['muc#roomconfig_getmemberlist', ['moderator', 'participant', 'visitor']],
  ];
  return el(
    'x',
    { xmlns: NS_DATA, type: 'submit' },
    el('field', { var: 'FORM_TYPE', type: 'hidden' }, el('value', {}, `${NS_MUC}#roomconfig`)),
    ...wanted.filter(([field]) => offered.has(field)).map(([field, value]) => el('field', { var: field }, ...(Array.isArray(value) ? value : [value]).map((v) => el('value', {}, v)))),
  );
}

/**
 * Makes a private group on the account's server, named `name`, with `people` as its members, each
 * invited: a room of its own, members only, everyone's address seen by everyone, kept, archived
 * when the server can, and not listed. The account owns it. Answers its address.
 */
export async function createXmppGroup(state: XmppState, connection: XmppConnection, name: string, people: string[]): Promise<string> {
  const service = await findMuc(connection, domainOf(state.jid), state.muc);
  if (!service) throw new XmppError(t('Your XMPP server has no group chats.'));
  state.muc = service;
  const jid = `${toHex(randomBytes(8))}@${service.jid}`;
  const title = name.trim().slice(0, 100);
  const chat = roomChat(state, jid, { nick: ownNick(state), name: title || undefined, private: true, occupants: {}, members: [], admin: true, readTo: Date.now() });
  const room = chat.room!;
  try {
    // The room is made by joining it, and stays locked until it has its settings.
    await connection.send(joinElement(jid, room.nick, { max: 0 }));
    const form = child(child(await connection.iq('get', jid, el('query', { xmlns: NS_MUC_OWNER })), 'query', NS_MUC_OWNER), 'x', NS_DATA);
    await connection.iq('set', jid, el('query', { xmlns: NS_MUC_OWNER }, privateSettings(form, title)));
  } catch (error) {
    delete state.chats[jid];
    await connection.send(el('presence', { to: `${jid}/${room.nick}`, type: 'unavailable' })).catch(() => undefined);
    throw error;
  }
  const info = await roomInfo(connection, jid).catch(() => null);
  if (info) {
    room.private = info.private;
    room.mam = info.mam;
  }
  await addXmppGroupPeople(state, connection, jid, people);
  await bookmark(connection, jid, room).catch(() => undefined);
  return jid;
}

/** Joins the group at `address`, as an invitation asked or as written; kept among the bookmarks. Answers its address. */
export async function joinXmppGroup(state: XmppState, connection: XmppConnection, address: string, password?: string): Promise<string> {
  const jid = bare(address.trim());
  if (!isXmppId(jid)) throw new XmppError(t('Write a group address, such as name@conference.example.org.'));
  if (state.chats[jid]?.room) return jid;
  if (state.chats[jid]) throw new XmppError(t('This is the address of a person, not of a group.'));
  const invite = state.invites?.find((i) => i.room === jid);
  const info = await roomInfo(connection, jid);
  const room: XmppRoom = { nick: ownNick(state), name: info.name, ...(info.description ? { description: info.description } : {}), private: info.private, occupants: {}, members: [], password: password || invite?.password, readTo: Date.now() };
  roomChat(state, jid, room);
  state.invites = state.invites?.filter((i) => i.room !== jid);
  await enterRoom(state, connection, jid);
  await bookmark(connection, jid, room).catch(() => undefined);
  return jid;
}

/** Says no to an invitation: the room tells whoever sent it. */
export async function declineXmppInvite(state: XmppState, connection: XmppConnection | null, jid: string): Promise<void> {
  const invite = state.invites?.find((i) => i.room === jid);
  state.invites = state.invites?.filter((i) => i.room !== jid);
  if (invite && connection?.isOpen) {
    await connection.send(el('message', { to: jid, id: newXmppId() }, el('x', { xmlns: NS_MUC_USER }, el('decline', { to: invite.from })))).catch(() => undefined);
  }
}

/** Makes `people` members of a private group and invites them; in a channel, only invites them. */
export async function addXmppGroupPeople(state: XmppState, connection: XmppConnection, jid: string, people: string[]): Promise<void> {
  const room = roomOf(state, jid);
  if (!room) throw new XmppError(t('This group is not here any more.'));
  const who = [...new Set(people.map(bare))].filter((p) => isXmppId(p) && p !== state.jid);
  if (!who.length) return;
  if (room.private) await connection.iq('set', jid, el('query', { xmlns: NS_MUC_ADMIN }, ...who.map((p) => el('item', { affiliation: 'member', jid: p }))));
  for (const person of who) {
    await connection.send(el('message', { to: jid, id: newXmppId() }, el('x', { xmlns: NS_MUC_USER }, el('invite', { to: person }))));
  }
  if (room.private) room.members = [...new Set([...room.members, ...who])].sort();
}

function ownedRoom(state: XmppState, jid: string, owner = false): XmppRoom {
  const room = roomOf(state, jid);
  if (!room) throw new XmppError(t('This group is not here any more.'));
  if (!room.joined) throw new XmppError(t('Not in this group yet: joining it.'));
  if (owner ? !room.owner : !room.admin) throw new XmppError(owner ? t('Only the owner of this group may do that.') : t('Only the admins of this group may do that.'));
  return room;
}

/** Sets the group's subject, the line under its name; empty takes it away. Its admins only. */
export async function setXmppGroupSubject(state: XmppState, connection: XmppConnection, jid: string, subject: string): Promise<void> {
  const room = ownedRoom(state, jid);
  const text = subject.trim().slice(0, 300);
  await connection.send(el('message', { to: jid, type: 'groupchat', id: newXmppId() }, el('subject', {}, text)));
  room.subject = text || undefined;
}

/** Sets one of the group's settings to `value`, when its form has it; `missing` is said when it has not. */
async function setRoomField(connection: XmppConnection, jid: string, field: string, value: string, missing: string): Promise<void> {
  const form = child(child(await connection.iq('get', jid, el('query', { xmlns: NS_MUC_OWNER })), 'query', NS_MUC_OWNER), 'x', NS_DATA);
  if (!children(form, 'field').some((f) => f.attrs.var === field)) throw new XmppError(missing);
  await connection.iq(
    'set',
    jid,
    el(
      'query',
      { xmlns: NS_MUC_OWNER },
      el('x', { xmlns: NS_DATA, type: 'submit' }, el('field', { var: 'FORM_TYPE', type: 'hidden' }, el('value', {}, `${NS_MUC}#roomconfig`)), el('field', { var: field }, el('value', {}, value))),
    ),
  );
}

/** Renames the group: its settings, and our bookmark of it. Its owner only. */
export async function renameXmppGroup(state: XmppState, connection: XmppConnection, jid: string, name: string): Promise<void> {
  const room = ownedRoom(state, jid, true);
  const title = name.trim().slice(0, 100);
  if (!title) throw new XmppError(t('Give the group a name.'));
  await setRoomField(connection, jid, 'muc#roomconfig_roomname', title, t('This group server does not let a group be renamed.'));
  room.name = title;
  await bookmark(connection, jid, room).catch(() => undefined);
}

/** Gives the group a new description, in its settings; empty takes it away. Its owner only. */
export async function describeXmppGroup(state: XmppState, connection: XmppConnection, jid: string, description: string): Promise<void> {
  const room = ownedRoom(state, jid, true);
  const text = description.trim().slice(0, DESCRIPTION_LONGEST);
  await setRoomField(connection, jid, 'muc#roomconfig_roomdesc', text, t('This group server does not let a group have a description.'));
  room.description = text || undefined;
}

/**
 * Reads again the name and description a group says of itself, as its settings changed (status
 * 104). Whether it is private, and keeps an archive, is read as it is joined.
 */
export async function refreshRoom(connection: XmppConnection, room: XmppRoom, jid: string): Promise<void> {
  const info = await roomInfo(connection, jid);
  if (info.name) room.name = info.name;
  room.description = info.description;
}

/**
 * Takes someone out of the group: out of its members (a private group's messages no longer go to
 * them), or, with `ban`, barred from joining again. In a channel without a member list, the one in
 * it under `nick` is put out. Its admins only; the owner stays.
 */
export async function removeFromXmppGroup(state: XmppState, connection: XmppConnection, jid: string, who: { address?: string; nick?: string }, ban = false): Promise<void> {
  const room = ownedRoom(state, jid);
  const address = who.address ? bare(who.address) : '';
  if (address === state.jid) throw new XmppError(t('To leave the group, use Leave the group.'));
  if (address && room.admins?.includes(address) && !room.owner) throw new XmppError(t('Only the owner of this group may do that.'));
  if (address && (room.private || ban)) {
    await connection.iq('set', jid, el('query', { xmlns: NS_MUC_ADMIN }, el('item', { affiliation: ban ? 'outcast' : 'none', jid: address })));
    room.members = room.members.filter((m) => m !== address);
    room.admins = room.admins?.filter((m) => m !== address);
    for (const [nick, real] of Object.entries(room.occupants)) if (real === address) delete room.occupants[nick];
  } else if (who.nick) {
    await connection.iq('set', jid, el('query', { xmlns: NS_MUC_ADMIN }, el('item', { nick: who.nick, role: 'none' })));
    delete room.occupants[who.nick];
  }
}

/** Makes a member an admin of the group, or an ordinary member again. Its owner only. */
export async function setXmppGroupAdmin(state: XmppState, connection: XmppConnection, jid: string, member: string, admin: boolean): Promise<void> {
  const room = ownedRoom(state, jid, true);
  const who = bare(member);
  if (!room.members.includes(who) || who === state.jid) throw new XmppError(t('This person is not a member of the group.'));
  await connection.iq('set', jid, el('query', { xmlns: NS_MUC_ADMIN }, el('item', { affiliation: admin ? 'admin' : 'member', jid: who })));
  room.admins = admin ? [...new Set([...(room.admins ?? []), who])].sort() : room.admins?.filter((m) => m !== who);
}

/** Leaves the group on this connection and forgets it here. */
async function leaveHere(state: XmppState, connection: XmppConnection | null, jid: string): Promise<void> {
  const room = roomOf(state, jid);
  if (room && connection?.isOpen) await connection.send(el('presence', { to: `${jid}/${room.nick}`, type: 'unavailable' })).catch(() => undefined);
  delete state.chats[jid];
}

/** Leaves a group: out of it, out of the bookmarks (so the account's other apps leave it too), and forgotten here. */
export async function leaveXmppGroup(state: XmppState, connection: XmppConnection | null, jid: string): Promise<void> {
  if (connection?.isOpen) {
    await connection.iq('set', undefined, el('pubsub', { xmlns: NS_PUBSUB }, el('retract', { node: NS_BOOKMARKS, notify: 'true' }, el('item', { id: jid })))).catch(() => undefined);
  }
  await leaveHere(state, connection, jid);
}
