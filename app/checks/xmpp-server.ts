// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// A small XMPP server for the checks (checks/xmpp.check.ts, checks/xmpp-calls.check.ts,
// checks/xmpp-muc.check.ts): signing in with PLAIN, binding, rosters and presence subscriptions,
// PEP with bookmarks (XEP-0402), archives (MAM), carbons, an HTTP upload service (XEP-0363) and the
// files on it, a group service (MUC, XEP-0045) with rooms made, set up, joined and archived as
// Prosody does, and what goes between people as a server passes it on: messages, and questions
// (iq) to a device.
/// <reference types="node" />
import { fromBase64, utf8Decode } from '../lib/crypto';
import { signInXmpp, startSession, takeStanza, type Taken, type XmppConnection, type XmppState } from '../lib/xmpp';
import type { HttpAnswer, HttpMethod } from '../lib/net-http';
import { NS_UPLOAD } from '../lib/xmpp-files';
import type { XmppLink } from '../lib/xmpp-net';
import { child, children, el, parseXml, render, textOf, type StreamEvent, type XmlElement } from '../lib/xmpp-xml';

export type Item = { jid: string; subscription: 'none' | 'to' | 'from' | 'both'; name?: string; ask?: boolean };
type Archived = { id: string; at: number; message: XmlElement };
type Affiliation = 'owner' | 'admin' | 'member' | 'outcast';
/** A room of the group service: who it lets in, who is in it (by full address, with their name), and what was said. */
export type Room = {
  jid: string;
  locked: boolean;
  membersOnly: boolean;
  nonAnonymous: boolean;
  mam: boolean;
  name: string;
  /** Its description (muc#roomconfig_roomdesc), said in its disco#info form as Prosody does. */
  description?: string;
  affiliations: Map<string, Affiliation>;
  occupants: Map<string, string>;
  /** What each one in it said in their presence besides joining (a group call's, XEP-0272), by full address. */
  said?: Map<string, XmlElement[]>;
  /** Set up as not kept: it goes away once the last one leaves it. */
  passing?: boolean;
  archive: Archived[];
};

export const DOMAIN = 'example.org';
export const PASSWORD = 'correct horse';
/** Where its upload service is: an item of its domain, as Prosody and ejabberd have it. */
export const UPLOAD = `upload.${DOMAIN}`;
/** Where its group service is, as an item of its domain too. */
export const MUC = `conference.${DOMAIN}`;
const NS_MUC = 'http://jabber.org/protocol/muc';
const NS_MUC_USER = `${NS_MUC}#user`;
const NS_BOOKMARKS = 'urn:xmpp:bookmarks:1';
const STANZAS = 'urn:ietf:params:xml:ns:xmpp-stanzas';
const NS_INFO = 'http://jabber.org/protocol/disco#info';
const NS_ITEMS = 'http://jabber.org/protocol/disco#items';
const NS_PUSH = 'urn:xmpp:push:0';

export class Server {
  readonly bound = new Map<string, Link>();
  /** Accounts made here (XEP-0077) and those whose password changed, by bare address: their passwords. Any other name signs in with PASSWORD. */
  readonly accounts = new Map<string, string>();
  /** Accounts deleted: they sign in no more. */
  readonly deleted = new Set<string>();
  /** How it makes accounts: here with a name and a password, with a form, with a captcha too, or not at all (with its page). */
  registration: 'plain' | 'form' | 'captcha' | 'closed' = 'plain';
  readonly rosters = new Map<string, Map<string, Item>>();
  readonly pep = new Map<string, XmlElement>();
  readonly archives = new Map<string, Archived[]>();
  /** Everything people sent, as the server saw it. */
  readonly seen: string[] = [];
  private next = 1;
  readonly noOmemo = new Set<string>();
  /** Accounts whose apps have only one OMEMO: 0.3 (as Conversations), or only OMEMO 2 (as Kaidan). */
  readonly onlyOmemo1 = new Set<string>();
  readonly onlyOmemo2 = new Set<string>();
  /** Accounts whose bundles are given with their first one-time pre-key only, so all who start a session with them take the same. */
  readonly onePreKey = new Set<string>();
  /** The TURN server it tells of (XEP-0215), if any. */
  turn: { host: string; port: string; username: string; password: string } | null = null;
  /** The upload service it offers, with the largest file it takes; none when null. */
  upload: { most: number } | null = null;
  /** What was put on it, by the address it is fetched from, as the service keeps it. */
  readonly files = new Map<string, Uint8Array>();
  /** The places it gave: where to put, what to fetch it from, its size and the header that lets it in. */
  readonly slots = new Map<string, { get: string; size: number; token: string }>();
  /** Whether it has a group service, and its rooms. */
  muc = true;
  readonly rooms = new Map<string, Room>();
  /** Each account's bookmarks (XEP-0402), by item id. */
  readonly bookmarks = new Map<string, Map<string, XmlElement>>();
  /** Whether it pushes to app servers (XEP-0357), and where each account asked it to. */
  pushes = true;
  readonly pushTo = new Map<string, { jid: string; node: string }[]>();

  connect = async (): Promise<XmppLink> => new Link(this);

  /** The upload service's HTTPS, for setXmppHttp: a PUT to a place given, once, with its header and size; a GET of what was put. */
  http = async (method: HttpMethod, url: string, headers: Record<string, string>, body?: Uint8Array): Promise<HttpAnswer> => {
    if (method === 'GET') {
      const file = this.files.get(url);
      return file ? { status: 200, bytes: file.slice() } : { status: 404, bytes: new Uint8Array(0) };
    }
    const slot = this.slots.get(url);
    if (!slot || headers.Authorization !== `Bearer ${slot.token}` || body?.length !== slot.size) return { status: 403, bytes: new Uint8Array(0) };
    this.slots.delete(url);
    this.files.set(slot.get, body.slice());
    return { status: 201, bytes: new Uint8Array(0) };
  };

  id(): string {
    return `a${this.next++}`;
  }

  roster(jid: string): Map<string, Item> {
    let roster = this.rosters.get(jid);
    if (!roster) this.rosters.set(jid, (roster = new Map()));
    return roster;
  }

  resources(jid: string): Link[] {
    return [...this.bound.entries()].filter(([full]) => full.startsWith(`${jid}/`)).map(([, link]) => link);
  }

  /** Whom each account blocks (XEP-0191): nothing of theirs is delivered to it. */
  blocked = new Map<string, Set<string>>();

  deliver(to: string, stanza: XmlElement): void {
    const from = bareOf(stanza.attrs.from ?? '');
    if (from && this.blocked.get(bareOf(to))?.has(from)) return;
    const target = this.bound.get(to);
    if (target) target.push(stanza);
    else for (const link of this.resources(to)) link.push(stanza);
  }

  archive(jid: string, message: XmlElement): void {
    const list = this.archives.get(jid) ?? [];
    list.push({ id: this.id(), at: Date.now(), message });
    this.archives.set(jid, list);
  }

  /** The people of a room by the name they have there: their full addresses. */
  occupantsByNick(room: Room): Map<string, string[]> {
    const byNick = new Map<string, string[]>();
    for (const [full, nick] of room.occupants) byNick.set(nick, [...(byNick.get(nick) ?? []), full]);
    return byNick;
  }

  /** How `nick` in `room` shows to `to`: affiliation, role, their address when the room is not anonymous, and status codes. */
  occupantPresence(room: Room, nick: string, full: string, to: string, codes: string[], type?: string): XmlElement {
    const affiliation = room.affiliations.get(bareOf(full)) ?? 'none';
    const role = type === 'unavailable' ? 'none' : affiliation === 'owner' || affiliation === 'admin' ? 'moderator' : 'participant';
    return el(
      'presence',
      { from: `${room.jid}/${nick}`, to, type, xmlns: 'jabber:client' },
      el('x', { xmlns: NS_MUC_USER }, el('item', { affiliation, role, jid: room.nonAnonymous ? full : undefined }), ...codes.map((code) => el('status', { code }))),
      ...(type === 'unavailable' ? [] : (room.said?.get(full) ?? [])),
    );
  }

  /** What a presence to a room says besides joining it. */
  private saidIn(stanza: XmlElement): XmlElement[] {
    return stanza.children.filter((c): c is XmlElement => typeof c !== 'string' && c.ns !== NS_MUC);
  }

  roomError(link: Link, stanza: XmlElement, condition: string): void {
    link.push(el(stanza.name, { from: stanza.attrs.to, to: link.full, type: 'error', id: stanza.attrs.id, xmlns: 'jabber:client' }, el('x', { xmlns: NS_MUC }), el('error', { type: 'cancel' }, el(condition, { xmlns: STANZAS }))));
  }

  /** A presence to a room: joining (and so making it, when there is none), or leaving. */
  roomPresence(link: Link, stanza: XmlElement): void {
    const [roomJid, nick] = (stanza.attrs.to ?? '').split('/');
    if (!this.muc || !nick) return this.roomError(link, stanza, 'service-unavailable');
    const real = bareOf(link.full);
    let room = this.rooms.get(roomJid);
    if (stanza.attrs.type === 'unavailable') {
      if (!room || !room.occupants.has(link.full)) return;
      const was = room.occupants.get(link.full)!;
      room.occupants.delete(link.full);
      room.said?.delete(link.full);
      link.push(this.occupantPresence(room, was, link.full, link.full, ['110'], 'unavailable'));
      for (const other of room.occupants.keys()) this.deliver(other, this.occupantPresence(room, was, link.full, other, [], 'unavailable'));
      if (room.passing && !room.occupants.size) this.rooms.delete(roomJid);
      return;
    }
    if (!room) {
      room = { jid: roomJid, locked: true, membersOnly: false, nonAnonymous: false, mam: false, name: '', affiliations: new Map([[real, 'owner']]), occupants: new Map([[link.full, nick]]), said: new Map([[link.full, this.saidIn(stanza)]]), archive: [] };
      this.rooms.set(roomJid, room);
      return link.push(this.occupantPresence(room, nick, link.full, link.full, ['110', '201']));
    }
    // In it already, with a new presence: to everyone in it, ourselves too.
    if (room.occupants.get(link.full) === nick) {
      (room.said ??= new Map()).set(link.full, this.saidIn(stanza));
      for (const other of room.occupants.keys()) this.deliver(other, this.occupantPresence(room, nick, link.full, other, other === link.full ? ['110'] : []));
      return;
    }
    const affiliation = room.affiliations.get(real);
    if (room.locked && affiliation !== 'owner') return this.roomError(link, stanza, 'item-not-found');
    if (affiliation === 'outcast') return this.roomError(link, stanza, 'forbidden');
    if (room.membersOnly && !affiliation) return this.roomError(link, stanza, 'registration-required');
    const holders = this.occupantsByNick(room).get(nick) ?? [];
    if (holders.some((full) => bareOf(full) !== real)) return this.roomError(link, stanza, 'conflict');
    for (const [otherNick, fulls] of this.occupantsByNick(room)) if (otherNick !== nick) link.push(this.occupantPresence(room, otherNick, fulls[0], link.full, []));
    room.occupants.set(link.full, nick);
    (room.said ??= new Map()).set(link.full, this.saidIn(stanza));
    link.push(this.occupantPresence(room, nick, link.full, link.full, room.nonAnonymous ? ['110', '100'] : ['110']));
    for (const other of room.occupants.keys()) if (other !== link.full) this.deliver(other, this.occupantPresence(room, nick, link.full, other, []));
    // What came before, as the presence asks: the last few, or since a time.
    const history = child(child(stanza, 'x', NS_MUC), 'history');
    const max = history?.attrs.maxstanzas !== undefined ? Number(history.attrs.maxstanzas) : 20;
    const since = history?.attrs.since ? Date.parse(history.attrs.since) : 0;
    const before = room.archive.filter((a) => a.at >= since).slice(max > 0 ? -max : room.archive.length);
    for (const a of before) {
      link.push({ ...a.message, attrs: { ...a.message.attrs, to: link.full }, children: [...a.message.children, el('delay', { xmlns: 'urn:xmpp:delay', from: room.jid, stamp: new Date(a.at).toISOString() })] });
    }
  }

  /** A message to a room: said to everyone in it (back to whoever said it too), or an invitation passed on. */
  roomMessage(link: Link, stanza: XmlElement): void {
    const roomJid = bareOf(stanza.attrs.to ?? '');
    const room = this.rooms.get(roomJid);
    if (!room) return this.roomError(link, stanza, 'item-not-found');
    const user = child(stanza, 'x', NS_MUC_USER);
    const invite = child(user, 'invite');
    if (invite) {
      const affiliation = room.affiliations.get(bareOf(link.full));
      if (room.membersOnly && affiliation !== 'owner' && affiliation !== 'admin') return this.roomError(link, stanza, 'forbidden');
      return this.deliver(
        bareOf(invite.attrs.to ?? ''),
        el('message', { from: room.jid, to: invite.attrs.to, xmlns: 'jabber:client' }, el('x', { xmlns: NS_MUC_USER }, el('invite', { from: bareOf(link.full) }, ...children(invite, 'reason')))),
      );
    }
    const decline = child(user, 'decline');
    if (decline) {
      return this.deliver(bareOf(decline.attrs.to ?? ''), el('message', { from: room.jid, to: decline.attrs.to, xmlns: 'jabber:client' }, el('x', { xmlns: NS_MUC_USER }, el('decline', { from: bareOf(link.full) }))));
    }
    const nick = room.occupants.get(link.full);
    if (stanza.attrs.type !== 'groupchat' || !nick) return this.roomError(link, stanza, 'not-acceptable');
    const id = this.id();
    const said = parseXml(render({ ...stanza, attrs: { ...stanza.attrs, from: `${room.jid}/${nick}` }, children: [...stanza.children, el('stanza-id', { xmlns: 'urn:xmpp:sid:0', by: room.jid, id })] }));
    room.archive.push({ id, at: Date.now(), message: said });
    for (const full of room.occupants.keys()) this.deliver(full, { ...said, attrs: { ...said.attrs, to: full } });
  }

  /** A question to the group service or one of its rooms. */
  roomIq(link: Link, iq: XmlElement): void {
    const to = iq.attrs.to ?? '';
    const query = iq.children.find((c): c is XmlElement => typeof c !== 'string');
    const reply = (...payload: XmlElement[]) => link.push(el('iq', { type: 'result', id: iq.attrs.id, from: to, xmlns: 'jabber:client' }, ...payload));
    const error = (condition: string) =>
      link.push(el('iq', { type: 'error', id: iq.attrs.id, from: to, xmlns: 'jabber:client' }, el('error', { type: 'cancel' }, el(condition, { xmlns: STANZAS }))));
    if (!this.muc) return error('service-unavailable');
    if (to === MUC) {
      if (query?.ns === NS_INFO) return reply(el('query', { xmlns: NS_INFO }, el('identity', { category: 'conference', type: 'text', name: 'Groups' }), el('feature', { var: NS_MUC })));
      // Its rooms anyone may find: not those for members only.
      return reply(el('query', { xmlns: NS_ITEMS }, ...[...this.rooms.values()].filter((r) => !r.membersOnly && !r.locked).map((r) => el('item', { jid: r.jid, name: r.name }))));
    }
    const room = this.rooms.get(to);
    const real = bareOf(link.full);
    const affiliation = room?.affiliations.get(real);
    if (!room || (room.locked && affiliation !== 'owner')) return error('item-not-found');
    if (query?.ns === NS_INFO) {
      return reply(
        el(
          'query',
          { xmlns: NS_INFO },
          el('identity', { category: 'conference', type: 'text', name: room.name || undefined }),
          ...[NS_MUC, room.membersOnly ? 'muc_membersonly' : 'muc_open', room.nonAnonymous ? 'muc_nonanonymous' : 'muc_semianonymous', 'muc_persistent', room.mam ? 'urn:xmpp:mam:2' : ''].filter(Boolean).map((f) => el('feature', { var: f })),
          room.description
            ? el(
                'x',
                { xmlns: 'jabber:x:data', type: 'result' },
                el('field', { var: 'FORM_TYPE', type: 'hidden' }, el('value', {}, `${NS_MUC}#roominfo`)),
                el('field', { var: 'muc#roominfo_description' }, el('value', {}, room.description)),
              )
            : null,
        ),
      );
    }
    if (query?.ns === `${NS_MUC}#owner`) {
      if (affiliation !== 'owner') return error('forbidden');
      if (iq.attrs.type === 'get') {
        const field = (name: string, value: string) => el('field', { var: name }, el('value', {}, value));
        return reply(
          el(
            'query',
            { xmlns: `${NS_MUC}#owner` },
            el(
              'x',
              { xmlns: 'jabber:x:data', type: 'form' },
              el('field', { var: 'FORM_TYPE', type: 'hidden' }, el('value', {}, `${NS_MUC}#roomconfig`)),
              field('muc#roomconfig_roomname', room.name),
              field('muc#roomconfig_roomdesc', room.description ?? ''),
              field('muc#roomconfig_persistentroom', '0'),
              field('muc#roomconfig_membersonly', '0'),
              field('muc#roomconfig_whois', 'moderators'),
              field('muc#roomconfig_publicroom', '1'),
              field('muc#roomconfig_changesubject', '1'),
              field('muc#roomconfig_enablearchiving', '0'),
            ),
          ),
        );
      }
      const values = new Map(children(child(query, 'x', 'jabber:x:data'), 'field').map((f) => [f.attrs.var, textOf(child(f, 'value'))]));
      if (values.has('muc#roomconfig_roomname')) room.name = values.get('muc#roomconfig_roomname') ?? '';
      if (values.has('muc#roomconfig_membersonly')) room.membersOnly = ['1', 'true'].includes(values.get('muc#roomconfig_membersonly')!);
      if (values.has('muc#roomconfig_whois')) room.nonAnonymous = values.get('muc#roomconfig_whois') === 'anyone';
      if (values.has('muc#roomconfig_enablearchiving')) room.mam = ['1', 'true'].includes(values.get('muc#roomconfig_enablearchiving')!);
      if (values.has('muc#roomconfig_persistentroom')) room.passing = !['1', 'true'].includes(values.get('muc#roomconfig_persistentroom')!);
      if (values.has('muc#roomconfig_roomdesc')) room.description = values.get('muc#roomconfig_roomdesc') || undefined;
      const was = room.locked;
      room.locked = false;
      reply();
      // Its settings changed: everyone in it is told (status 104), as XEP-0045 §10.2.1 has it.
      if (!was) {
        for (const full of room.occupants.keys()) {
          this.deliver(full, el('message', { from: room.jid, to: full, type: 'groupchat', id: this.id(), xmlns: 'jabber:client' }, el('x', { xmlns: NS_MUC_USER }, el('status', { code: '104' }))));
        }
      }
      return;
    }
    if (query?.ns === `${NS_MUC}#admin`) {
      const asked = children(query, 'item');
      if (iq.attrs.type === 'get') {
        const wanted = asked[0]?.attrs.affiliation;
        const may = affiliation === 'owner' || affiliation === 'admin' || (room.membersOnly && affiliation === 'member');
        if (!may) return error('forbidden');
        return reply(el('query', { xmlns: `${NS_MUC}#admin` }, ...[...room.affiliations].filter(([, a]) => a === wanted).map(([jid, a]) => el('item', { jid, affiliation: a }))));
      }
      if (affiliation !== 'owner' && affiliation !== 'admin') return error('forbidden');
      for (const item of asked) {
        const jid = bareOf(item.attrs.jid ?? '');
        const next = item.attrs.affiliation;
        if (next === 'none') room.affiliations.delete(jid);
        else room.affiliations.set(jid, next as Affiliation);
      }
      return reply();
    }
    if (query?.ns === 'urn:xmpp:mam:2') {
      if (!room.mam) return error('service-unavailable');
      if (room.membersOnly && !affiliation) return error('forbidden');
      return link.page(room.archive, iq, query, room.jid);
    }
    return error('service-unavailable');
  }

  rosterPush(jid: string, item: Item): void {
    for (const link of this.resources(jid)) {
      link.push(el('iq', { type: 'set', id: this.id(), xmlns: 'jabber:client' }, el('query', { xmlns: 'jabber:iq:roster' }, itemElement(item))));
    }
  }
}

function itemElement(item: Item): XmlElement {
  return el('item', { jid: item.jid, subscription: item.subscription, name: item.name, ask: item.ask ? 'subscribe' : undefined });
}

export const bareOf = (jid: string) => jid.split('/')[0];

export class Link implements XmppLink {
  kind = 'websocket' as const;
  secure = true;
  tor = false;
  private queue: StreamEvent[] = [];
  private closed = false;
  private jid = '';
  full = '';
  private readonly server: Server;

  constructor(server: Server) {
    this.server = server;
  }

  push(stanza: XmlElement): void {
    this.queue.push({ kind: 'stanza', element: parseXml(render(stanza)) });
  }

  async open(): Promise<void> {
    this.queue.push({ kind: 'open', attrs: { from: DOMAIN } });
    const features = this.jid
      ? el('features', { xmlns: 'http://etherx.jabber.org/streams' }, el('bind', { xmlns: 'urn:ietf:params:xml:ns:xmpp-bind' }))
      : el('features', { xmlns: 'http://etherx.jabber.org/streams' }, el('mechanisms', { xmlns: 'urn:ietf:params:xml:ns:xmpp-sasl' }, el('mechanism', {}, 'PLAIN')));
    this.push(features);
  }

  async read(wait: number): Promise<StreamEvent[]> {
    if (!this.queue.length && !this.closed) await new Promise((resolve) => setTimeout(resolve, Math.min(wait, 5)));
    if (!this.queue.length && this.closed) throw new Error('closed');
    return this.queue.splice(0);
  }

  close(): void {
    this.closed = true;
    if (this.full && this.server.bound.get(this.full) === this) this.server.bound.delete(this.full);
  }

  async send(text: string): Promise<void> {
    if (this.closed) throw new Error('closed');
    const stanza = parseXml(text);
    const server = this.server;
    if (stanza.name === 'auth') {
      const [, user, password] = utf8Decode(fromBase64(textOf(stanza))).split('\0');
      const jid = `${user}@${DOMAIN}`;
      if (server.deleted.has(jid) || password !== (server.accounts.get(jid) ?? PASSWORD)) return this.push(el('failure', { xmlns: 'urn:ietf:params:xml:ns:xmpp-sasl' }, el('not-authorized')));
      this.jid = jid;
      return this.push(el('success', { xmlns: 'urn:ietf:params:xml:ns:xmpp-sasl' }));
    }
    if (stanza.name === 'iq') return this.iq(stanza);
    if (stanza.name === 'presence') {
      const to = stanza.attrs.to;
      if (!to) return;
      if (bareOf(to).endsWith(`@${MUC}`)) return server.roomPresence(this, stanza);
      const type = stanza.attrs.type;
      if (type === 'subscribe') {
        const item = server.roster(this.jid).get(to) ?? { jid: to, subscription: 'none' };
        item.ask = true;
        server.roster(this.jid).set(to, item);
        server.rosterPush(this.jid, item);
        server.deliver(to, el('presence', { from: this.jid, type: 'subscribe', xmlns: 'jabber:client' }));
      }
      if (type === 'subscribed') {
        const mine = server.roster(this.jid).get(to) ?? { jid: to, subscription: 'none' };
        mine.subscription = mine.subscription === 'to' || mine.subscription === 'both' ? 'both' : 'from';
        server.roster(this.jid).set(to, mine);
        server.rosterPush(this.jid, mine);
        const theirs = server.roster(to).get(this.jid) ?? { jid: this.jid, subscription: 'none' };
        theirs.subscription = theirs.subscription === 'from' || theirs.subscription === 'both' ? 'both' : 'to';
        theirs.ask = false;
        server.roster(to).set(this.jid, theirs);
        server.rosterPush(to, theirs);
      }
      return;
    }
    if (stanza.name === 'message') {
      server.seen.push(text);
      const to = bareOf(stanza.attrs.to ?? '');
      if (to.endsWith(`@${MUC}`)) return server.roomMessage(this, stanza);
      const sent = parseXml(render({ ...stanza, attrs: { ...stanza.attrs, from: this.full } }));
      server.archive(this.jid, sent);
      if (to !== this.jid) server.archive(to, sent);
      server.deliver(stanza.attrs.to ?? '', sent);
      // Carbons to our other devices.
      for (const link of server.resources(this.jid)) {
        if (link === this) continue;
        link.push(el('message', { from: this.jid, to: link.full, xmlns: 'jabber:client' }, el('sent', { xmlns: 'urn:xmpp:carbons:2' }, el('forwarded', { xmlns: 'urn:xmpp:forward:0' }, sent))));
      }
    }
  }

  /** In-band registration (XEP-0077): a new account before signing in, a new password or the account deleted after. */
  private register(iq: XmlElement, query: XmlElement, reply: (...payload: XmlElement[]) => void, error: (condition: string) => void): void {
    const server = this.server;
    const NS_REG = 'jabber:iq:register';
    if (this.jid) {
      if (iq.attrs.type !== 'set') return error('bad-request');
      if (child(query, 'remove')) {
        server.deleted.add(this.jid);
        reply();
        return this.close();
      }
      server.accounts.set(this.jid, textOf(child(query, 'password')));
      return reply();
    }
    const page = el('x', { xmlns: 'jabber:x:oob' }, el('url', {}, `https://${DOMAIN}/register`));
    if (iq.attrs.type === 'get') {
      if (server.registration === 'closed') return this.push(el('iq', { type: 'error', id: iq.attrs.id, xmlns: 'jabber:client' }, el('query', { xmlns: NS_REG }, page), el('error', { type: 'cancel' }, el('not-allowed', { xmlns: STANZAS }))));
      if (server.registration === 'plain') return reply(el('query', { xmlns: NS_REG }, el('instructions', {}, 'Choose a name and a password'), el('username'), el('password')));
      const field = (name: string, type = 'text-single') => el('field', { var: name, type }, el('required'));
      return reply(
        el(
          'query',
          { xmlns: NS_REG },
          el(
            'x',
            { xmlns: 'jabber:x:data', type: 'form' },
            el('field', { var: 'FORM_TYPE', type: 'hidden' }, el('value', {}, NS_REG)),
            field('username'),
            field('password', 'text-private'),
            server.registration === 'captcha' ? field('ocr') : null,
          ),
          page,
        ),
      );
    }
    const form = new Map(children(child(query, 'x', 'jabber:x:data'), 'field').map((f) => [f.attrs.var, textOf(child(f, 'value'))]));
    const name = form.get('username') ?? textOf(child(query, 'username'));
    const password = form.get('password') ?? textOf(child(query, 'password'));
    const jid = `${name}@${DOMAIN}`;
    if (!name || !password) return error('not-acceptable');
    if (server.accounts.has(jid) || server.rosters.has(jid)) return error('conflict');
    server.accounts.set(jid, password);
    return reply();
  }

  /** A page of `all`, an archive, as `query` asks (MAM): its messages, from `from` when it is a room's, then the answer. */
  page(all: Archived[], iq: XmlElement, query: XmlElement, from?: string): void {
    const set = child(query, 'set');
    const max = Number(textOf(child(set, 'max')) || 50);
    const afterId = textOf(child(set, 'after'));
    let page: Archived[];
    if (afterId) {
      const at = all.findIndex((a) => a.id === afterId);
      if (at < 0) {
        return this.push(el('iq', { type: 'error', id: iq.attrs.id, from, xmlns: 'jabber:client' }, el('error', { type: 'cancel' }, el('item-not-found', { xmlns: STANZAS }))));
      }
      page = all.slice(at + 1, at + 1 + max);
    } else page = all.slice(-max);
    for (const a of page) {
      this.push(
        el(
          'message',
          { from, to: this.full, xmlns: 'jabber:client' },
          el('result', { xmlns: 'urn:xmpp:mam:2', queryid: query.attrs.queryid, id: a.id }, el('forwarded', { xmlns: 'urn:xmpp:forward:0' }, el('delay', { xmlns: 'urn:xmpp:delay', stamp: new Date(a.at).toISOString() }), a.message)),
        ),
      );
    }
    const complete = !afterId || page.length < max || page[page.length - 1] === all[all.length - 1];
    this.push(
      el(
        'iq',
        { type: 'result', id: iq.attrs.id, from, xmlns: 'jabber:client' },
        el('fin', { xmlns: 'urn:xmpp:mam:2', complete: complete ? 'true' : undefined }, el('set', { xmlns: 'http://jabber.org/protocol/rsm' }, page.length ? el('last', {}, page[page.length - 1].id) : null)),
      ),
    );
  }

  private iq(iq: XmlElement): void {
    const server = this.server;
    // To another person's device, or an answer to one: passed on, from this device.
    const to = iq.attrs.to ?? '';
    if ((to.includes('/') && bareOf(to) !== this.jid) || iq.attrs.type === 'result' || iq.attrs.type === 'error') {
      if (!to) return;
      const target = server.bound.get(to);
      const passed = parseXml(render({ ...iq, attrs: { ...iq.attrs, from: this.full } }));
      if (target) return target.push(passed);
      if (iq.attrs.type === 'result' || iq.attrs.type === 'error') return;
      return this.push(
        el('iq', { type: 'error', id: iq.attrs.id, from: to, xmlns: 'jabber:client' }, el('error', { type: 'cancel' }, el('service-unavailable', { xmlns: 'urn:ietf:params:xml:ns:xmpp-stanzas' }))),
      );
    }
    if (to === MUC || to.endsWith(`@${MUC}`)) return server.roomIq(this, iq);
    const reply = (...payload: XmlElement[]) => this.push(el('iq', { type: 'result', id: iq.attrs.id, xmlns: 'jabber:client' }, ...payload));
    const error = (condition: string) =>
      this.push(el('iq', { type: 'error', id: iq.attrs.id, xmlns: 'jabber:client' }, el('error', { type: 'cancel' }, el(condition, { xmlns: 'urn:ietf:params:xml:ns:xmpp-stanzas' }))));
    const query = iq.children.find((c): c is XmlElement => typeof c !== 'string');
    if (!query) return reply();
    if (query.ns === 'jabber:iq:register') return this.register(iq, query, reply, error);
    if (to === 'api@search.jabber.network') {
      const q = textOf(child(children(child(query, 'x', 'jabber:x:data'), 'field').find((f) => f.attrs.var === 'q'), 'value')).toLowerCase();
      const found = [...server.rooms.values()].filter((r) => !r.membersOnly && r.name.toLowerCase().includes(q));
      return reply(
        el(
          'result',
          { xmlns: 'urn:xmpp:channel-search:0:search' },
          ...found.map((r) => el('item', { address: r.jid }, el('name', {}, r.name), el('nusers', {}, String(r.occupants.size)), el('service-type', {}, 'xep0045'))),
          el('item', { address: `mix@mix.${DOMAIN}` }, el('name', {}, q), el('service-type', {}, 'xep0369')),
        ),
      );
    }
    if (query.name === 'bind') {
      this.full = `${this.jid}/${textOf(child(query, 'resource')) || 'x'}`;
      server.bound.set(this.full, this);
      return reply(el('bind', { xmlns: 'urn:ietf:params:xml:ns:xmpp-bind' }, el('jid', {}, this.full)));
    }
    if (query.ns === 'urn:xmpp:blocking') {
      const list = server.blocked.get(this.jid) ?? new Set<string>();
      server.blocked.set(this.jid, list);
      const item = (jid: string) => el('item', { jid });
      if (iq.attrs.type === 'get') return reply(el('blocklist', { xmlns: 'urn:xmpp:blocking' }, ...[...list].map(item)));
      const named = children(query, 'item').map((i) => i.attrs.jid ?? '');
      if (query.name === 'block') named.forEach((jid) => list.add(jid));
      else if (named.length) named.forEach((jid) => list.delete(jid));
      else list.clear();
      reply();
      // Told to the account's other devices, as servers do.
      for (const link of server.resources(this.jid)) if (link !== this) link.push(el('iq', { type: 'set', id: server.id(), xmlns: 'jabber:client' }, el(query.name, { xmlns: 'urn:xmpp:blocking' }, ...named.map(item))));
      return;
    }
    if (query.ns === 'jabber:iq:roster') {
      if (iq.attrs.type === 'get') return reply(el('query', { xmlns: 'jabber:iq:roster' }, ...[...server.roster(this.jid).values()].map(itemElement)));
      for (const item of children(query, 'item')) {
        const kept = server.roster(this.jid).get(item.attrs.jid) ?? { jid: item.attrs.jid, subscription: 'none' };
        kept.name = item.attrs.name;
        server.roster(this.jid).set(item.attrs.jid, kept);
        server.rosterPush(this.jid, kept);
      }
      return reply();
    }
    if (query.ns === 'urn:xmpp:carbons:2' || query.ns === 'urn:xmpp:ping') return reply();
    if (query.ns === 'urn:xmpp:extdisco:2') {
      const turn = server.turn;
      if (!turn) return error('service-unavailable');
      return reply(el('services', { xmlns: 'urn:xmpp:extdisco:2' }, el('service', { type: 'turn', transport: 'udp', ...turn }), el('service', { type: 'turns', transport: 'tcp', ...turn, port: '5349' })));
    }
    if (query.name === 'pubsub') {
      const owner = bareOf(iq.attrs.to ?? this.jid);
      const publish = child(query, 'publish');
      const retract = child(query, 'retract');
      // The account's bookmarks: an item each, told to its devices as they change.
      if ((publish ?? retract ?? child(query, 'items'))?.attrs.node === NS_BOOKMARKS) {
        const kept = server.bookmarks.get(this.jid) ?? new Map<string, XmlElement>();
        server.bookmarks.set(this.jid, kept);
        const tell = (change: XmlElement) => {
          for (const link of server.resources(this.jid)) {
            link.push(el('message', { from: this.jid, to: link.full, xmlns: 'jabber:client' }, el('event', { xmlns: 'http://jabber.org/protocol/pubsub#event' }, el('items', { node: NS_BOOKMARKS }, change))));
          }
        };
        if (publish) {
          const item = child(publish, 'item')!;
          kept.set(item.attrs.id, children(item)[0]);
          tell(el('item', { id: item.attrs.id }, children(item)[0]));
          return reply();
        }
        if (retract) {
          const id = child(retract, 'item')?.attrs.id ?? '';
          if (kept.delete(id)) tell(el('retract', { id }));
          return reply();
        }
        if (!kept.size) return error('item-not-found');
        return reply(el('pubsub', { xmlns: 'http://jabber.org/protocol/pubsub' }, el('items', { node: NS_BOOKMARKS }, ...[...kept].map(([id, payload]) => el('item', { id }, payload)))));
      }
      if (publish) {
        const node = publish.attrs.node;
        const two = node.startsWith('urn:xmpp:omemo:2');
        if (server.noOmemo.has(this.jid) || (two && server.onlyOmemo1.has(this.jid)) || (!two && server.onlyOmemo2.has(this.jid))) return error('forbidden');
        const itemId = child(publish, 'item')?.attrs.id ?? 'current';
        const payload = children(child(publish, 'item'))[0];
        // OMEMO 2's bundles share one node, an item each.
        server.pep.set(itemId === 'current' ? `${this.jid} ${node}` : `${this.jid} ${node} ${itemId}`, payload);
        if (node.endsWith('.devicelist') || node === 'urn:xmpp:omemo:2:devices' || node === 'urn:xmpp:avatar:metadata') {
          const event = (to: string) =>
            el('message', { from: this.jid, to, xmlns: 'jabber:client' }, el('event', { xmlns: 'http://jabber.org/protocol/pubsub#event' }, el('items', { node }, el('item', { id: 'current' }, payload))));
          for (const link of server.resources(this.jid)) link.push(event(this.jid));
          for (const item of server.roster(this.jid).values()) if (item.subscription === 'from' || item.subscription === 'both') server.deliver(item.jid, event(item.jid));
        }
        return reply();
      }
      if (retract) {
        server.pep.delete(`${this.jid} ${retract.attrs.node} ${child(retract, 'item')?.attrs.id ?? ''}`);
        return reply();
      }
      const items = child(query, 'items');
      const itemId = child(items, 'item')?.attrs.id;
      const payload = items && server.pep.get(itemId ? `${owner} ${items.attrs.node} ${itemId}` : `${owner} ${items.attrs.node}`);
      if (!payload) return error('item-not-found');
      const prekeys = payload.name === 'bundle' && server.onePreKey.has(owner) ? child(payload, 'prekeys') : undefined;
      const given = prekeys ? { ...payload, children: payload.children.map((c) => (c === prekeys ? { ...prekeys, children: prekeys.children.filter((k) => typeof k !== 'string').slice(0, 1) } : c)) } : payload;
      return reply(el('pubsub', { xmlns: 'http://jabber.org/protocol/pubsub' }, el('items', { node: items.attrs.node }, el('item', { id: itemId ?? 'current' }, given))));
    }
    if (query.ns === 'urn:xmpp:mam:2') return this.page(server.archives.get(this.jid) ?? [], iq, query);
    if (query.ns === NS_PUSH) {
      if (!server.pushes) return error('feature-not-implemented');
      const list = (server.pushTo.get(this.jid) ?? []).filter((p) => !(p.jid === query.attrs.jid && (!query.attrs.node || p.node === query.attrs.node)));
      if (query.name === 'enable') list.push({ jid: query.attrs.jid ?? '', node: query.attrs.node ?? '' });
      server.pushTo.set(this.jid, list);
      return reply();
    }
    if (query.ns === NS_ITEMS) {
      return reply(el('query', { xmlns: NS_ITEMS }, to === DOMAIN && server.upload ? el('item', { jid: UPLOAD }) : null, to === DOMAIN && server.muc ? el('item', { jid: MUC }) : null));
    }
    if (query.ns === NS_INFO) {
      const upload = server.upload;
      // The account's own address says it pushes (XEP-0357), as Prosody's and ejabberd's do.
      if (bareOf(to) === this.jid && server.pushes) return reply(el('query', { xmlns: NS_INFO }, el('feature', { var: NS_INFO }), el('feature', { var: NS_PUSH })));
      if (to !== UPLOAD || !upload) return reply(el('query', { xmlns: NS_INFO }, el('feature', { var: NS_INFO })));
      return reply(
        el(
          'query',
          { xmlns: NS_INFO },
          el('identity', { category: 'store', type: 'file' }),
          el('feature', { var: NS_UPLOAD }),
          el(
            'x',
            { xmlns: 'jabber:x:data', type: 'result' },
            el('field', { var: 'FORM_TYPE', type: 'hidden' }, el('value', {}, NS_UPLOAD)),
            el('field', { var: 'max-file-size' }, el('value', {}, String(upload.most))),
          ),
        ),
      );
    }
    if (query.ns === NS_UPLOAD && query.name === 'request') {
      const size = Number(query.attrs.size);
      if (to !== UPLOAD || !server.upload) return error('service-unavailable');
      if (!(size > 0 && size <= server.upload.most)) return error('not-acceptable');
      const id = server.id();
      const put = `https://${UPLOAD}/put/${id}`;
      const get = `https://${UPLOAD}/${id}/${encodeURIComponent(query.attrs.filename ?? 'file')}`;
      server.slots.set(put, { get, size, token: `t${id}` });
      // A header the app must not pass on comes with the ones it must.
      return reply(
        el('slot', { xmlns: NS_UPLOAD }, el('put', { url: put }, el('header', { name: 'Authorization' }, `Bearer t${id}`), el('header', { name: 'Host' }, 'elsewhere.example')), el('get', { url: get })),
      );
    }
    return error('service-unavailable');
  }
}

/** Takes what came for a while, as lib/xmpp-store.ts does. The account goes through JSON first. */
export async function settle(people: { state: XmppState; connection: XmppConnection }[], rounds = 20): Promise<void> {
  for (let i = 0; i < rounds; i++) {
    await new Promise((resolve) => setTimeout(resolve, 10));
    for (const person of people) {
      person.state = JSON.parse(JSON.stringify(person.state)) as XmppState;
      const taken: Taken = { chats: [], republish: false };
      for (const stanza of person.connection.take()) await takeStanza(person.state, person.connection, stanza, taken);
    }
  }
}

export async function person(server: Server, user: string) {
  const signed = await signInXmpp(`${user}@${DOMAIN}`, PASSWORD, undefined, server.connect);
  await startSession(signed.state, signed.connection);
  return signed;
}
