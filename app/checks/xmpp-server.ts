// A small XMPP server for the checks (checks/xmpp.check.ts, checks/xmpp-calls.check.ts): signing
// in with PLAIN, binding, rosters and presence subscriptions, PEP, archives (MAM), carbons, an
// HTTP upload service (XEP-0363) and the files on it, and what goes between people as a server
// passes it on: messages, and questions (iq) to a device.
/// <reference types="node" />
import { fromBase64, utf8Decode } from '../lib/crypto';
import { signInXmpp, startSession, takeStanza, type Taken, type XmppConnection, type XmppState } from '../lib/xmpp';
import type { HttpAnswer, HttpMethod } from '../lib/net-http';
import { NS_UPLOAD } from '../lib/xmpp-files';
import type { XmppLink } from '../lib/xmpp-net';
import { child, children, el, parseXml, render, textOf, type StreamEvent, type XmlElement } from '../lib/xmpp-xml';

export type Item = { jid: string; subscription: 'none' | 'to' | 'from' | 'both'; name?: string; ask?: boolean };
type Archived = { id: string; at: number; message: XmlElement };

export const DOMAIN = 'example.org';
export const PASSWORD = 'correct horse';
/** Where its upload service is: an item of its domain, as Prosody and ejabberd have it. */
export const UPLOAD = `upload.${DOMAIN}`;
const NS_INFO = 'http://jabber.org/protocol/disco#info';
const NS_ITEMS = 'http://jabber.org/protocol/disco#items';

export class Server {
  readonly bound = new Map<string, Link>();
  readonly rosters = new Map<string, Map<string, Item>>();
  readonly pep = new Map<string, XmlElement>();
  readonly archives = new Map<string, Archived[]>();
  /** Everything people sent, as the server saw it. */
  readonly seen: string[] = [];
  private next = 1;
  readonly noOmemo = new Set<string>();
  /** The TURN server it tells of (XEP-0215), if any. */
  turn: { host: string; port: string; username: string; password: string } | null = null;
  /** The upload service it offers, with the largest file it takes; none when null. */
  upload: { most: number } | null = null;
  /** What was put on it, by the address it is fetched from, as the service keeps it. */
  readonly files = new Map<string, Uint8Array>();
  /** The places it gave: where to put, what to fetch it from, its size and the header that lets it in. */
  readonly slots = new Map<string, { get: string; size: number; token: string }>();

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

  deliver(to: string, stanza: XmlElement): void {
    const target = this.bound.get(to);
    if (target) target.push(stanza);
    else for (const link of this.resources(to)) link.push(stanza);
  }

  archive(jid: string, message: XmlElement): void {
    const list = this.archives.get(jid) ?? [];
    list.push({ id: this.id(), at: Date.now(), message });
    this.archives.set(jid, list);
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
      if (password !== PASSWORD) return this.push(el('failure', { xmlns: 'urn:ietf:params:xml:ns:xmpp-sasl' }, el('not-authorized')));
      this.jid = `${user}@${DOMAIN}`;
      return this.push(el('success', { xmlns: 'urn:ietf:params:xml:ns:xmpp-sasl' }));
    }
    if (stanza.name === 'iq') return this.iq(stanza);
    if (stanza.name === 'presence') {
      const to = stanza.attrs.to;
      if (!to) return;
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
    const reply = (...payload: XmlElement[]) => this.push(el('iq', { type: 'result', id: iq.attrs.id, xmlns: 'jabber:client' }, ...payload));
    const error = (condition: string) =>
      this.push(el('iq', { type: 'error', id: iq.attrs.id, xmlns: 'jabber:client' }, el('error', { type: 'cancel' }, el(condition, { xmlns: 'urn:ietf:params:xml:ns:xmpp-stanzas' }))));
    const query = iq.children.find((c): c is XmlElement => typeof c !== 'string');
    if (!query) return reply();
    if (query.name === 'bind') {
      this.full = `${this.jid}/${textOf(child(query, 'resource')) || 'x'}`;
      server.bound.set(this.full, this);
      return reply(el('bind', { xmlns: 'urn:ietf:params:xml:ns:xmpp-bind' }, el('jid', {}, this.full)));
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
      if (publish) {
        if (server.noOmemo.has(this.jid)) return error('forbidden');
        const node = publish.attrs.node;
        const payload = children(child(publish, 'item'))[0];
        server.pep.set(`${this.jid} ${node}`, payload);
        if (node.endsWith('.devicelist')) {
          const event = (to: string) =>
            el('message', { from: this.jid, to, xmlns: 'jabber:client' }, el('event', { xmlns: 'http://jabber.org/protocol/pubsub#event' }, el('items', { node }, el('item', { id: 'current' }, payload))));
          for (const link of server.resources(this.jid)) link.push(event(this.jid));
          for (const item of server.roster(this.jid).values()) if (item.subscription === 'from' || item.subscription === 'both') server.deliver(item.jid, event(item.jid));
        }
        return reply();
      }
      const items = child(query, 'items');
      const payload = items && server.pep.get(`${owner} ${items.attrs.node}`);
      if (!payload) return error('item-not-found');
      return reply(el('pubsub', { xmlns: 'http://jabber.org/protocol/pubsub' }, el('items', { node: items.attrs.node }, el('item', { id: 'current' }, payload))));
    }
    if (query.ns === 'urn:xmpp:mam:2') {
      const all = server.archives.get(this.jid) ?? [];
      const set = child(query, 'set');
      const max = Number(textOf(child(set, 'max')) || 50);
      const afterId = textOf(child(set, 'after'));
      let page: Archived[];
      if (afterId) {
        const at = all.findIndex((a) => a.id === afterId);
        if (at < 0) return error('item-not-found');
        page = all.slice(at + 1, at + 1 + max);
      } else page = all.slice(-max);
      for (const a of page) {
        this.push(
          el(
            'message',
            { to: this.full, xmlns: 'jabber:client' },
            el('result', { xmlns: 'urn:xmpp:mam:2', queryid: query.attrs.queryid, id: a.id }, el('forwarded', { xmlns: 'urn:xmpp:forward:0' }, el('delay', { xmlns: 'urn:xmpp:delay', stamp: new Date(a.at).toISOString() }), a.message)),
          ),
        );
      }
      const complete = !afterId || page.length < max || page[page.length - 1] === all[all.length - 1];
      return reply(el('fin', { xmlns: 'urn:xmpp:mam:2', complete: complete ? 'true' : undefined }, el('set', { xmlns: 'http://jabber.org/protocol/rsm' }, page.length ? el('last', {}, page[page.length - 1].id) : null)));
    }
    if (query.ns === NS_ITEMS) return reply(el('query', { xmlns: NS_ITEMS }, to === DOMAIN && server.upload ? el('item', { jid: UPLOAD }) : null));
    if (query.ns === NS_INFO) {
      const upload = server.upload;
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
