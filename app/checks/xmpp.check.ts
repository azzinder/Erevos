// XMPP accounts (lib/xmpp.ts) against a small XMPP server played here, with the real core built to
// WebAssembly for OMEMO (crates/erevos-xmpp): the stream's XML read in pieces cut anywhere; SCRAM
// as RFC 5802 and RFC 7677 write it; two people sign in, add each other, and write both ways
// encrypted, the server keeping only ciphertext; a second device of one of them reads what both
// write, and its own other device's messages, as carbons; what came while one was away comes from
// the archive, once; receipts and read marks; someone without OMEMO gets nothing unless the chat
// chooses to write without it. The account survives being kept as JSON between steps.
// lib/xmpp.ts was also run against a real Prosody 0.12 (docs/xmpp.md).
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { after, before, test } from 'node:test';

import { fromBase64, utf8Decode } from '../lib/crypto';
import { setCore, type Core } from '../lib/core';
import {
  addXmppContact,
  isXmppId,
  markXmppRead,
  sendXmppText,
  signInXmpp,
  startSession,
  takeStanza,
  XmppConnection,
  XmppError,
  type Taken,
  type XmppState,
} from '../lib/xmpp';
import { fingerprint, NoOmemoError } from '../lib/xmpp-omemo';
import type { XmppLink } from '../lib/xmpp-net';
import { startSasl } from '../lib/xmpp-sasl';
import { serverOf } from '../lib/xmpp-store';
import { child, children, el, find, parseXml, render, textOf, XmlStream, type StreamEvent, type XmlElement } from '../lib/xmpp-xml';

const built = new URL('./.core/erevos_ffi.js', import.meta.url);
const coreReady = existsSync(built) && typeof (createRequire(import.meta.url)(built.pathname) as Record<string, unknown>).xmpp === 'function';
if (!coreReady) console.log('Skipping the XMPP checks that need the core: build it first with node checks/build-core.mjs');

before(() => {
  if (!coreReady) return;
  const wasm = createRequire(import.meta.url)(built.pathname) as Record<string, (...args: never[]) => unknown>;
  setCore(Object.fromEntries(Object.entries(wasm).map(([name, fn]) => [name, async (...args: never[]) => fn(...args)])) as unknown as Core);
});
after(() => setCore(null));

test('the stream is read in pieces cut anywhere, entities and namespaces kept', () => {
  const input =
    "<?xml version='1.0'?><stream:stream xmlns='jabber:client' xmlns:stream='http://etherx.jabber.org/streams' id='s1' version='1.0'>" +
    "<stream:features><mechanisms xmlns='urn:ietf:params:xml:ns:xmpp-sasl'><mechanism>PLAIN</mechanism></mechanisms></stream:features> " +
    "<message from='a@x' type='chat'><body>caf&#233; &amp; &lt;b&gt; Γεια</body><x xmlns='urn:y'/></message></stream:stream>";
  const bytes = new TextEncoder().encode(input);
  for (const size of [1, 3, 7, 64]) {
    const stream = new XmlStream();
    const events: StreamEvent[] = [];
    for (let i = 0; i < bytes.length; i += size) events.push(...stream.push(bytes.subarray(i, i + size)));
    assert.deepEqual(
      events.map((e) => (e.kind === 'stanza' ? `${e.element.name} ${e.element.ns}` : e.kind)),
      ['open', 'features http://etherx.jabber.org/streams', 'message jabber:client', 'close'],
    );
    const message = (events[2] as { element: XmlElement }).element;
    assert.equal(textOf(child(message, 'body')), 'café & <b> Γεια');
    assert.equal(child(message, 'x')?.ns, 'urn:y');
    assert.equal(textOf(find((events[1] as { element: XmlElement }).element, 'mechanisms|urn:ietf:params:xml:ns:xmpp-sasl', 'mechanism')), 'PLAIN');
  }
  const out = render(el('message', { to: "o'neil@x", xmlns: 'jabber:client' }, el('body', {}, 'a < b & "c"'), el('x', { xmlns: 'urn:y' })));
  assert.equal(out, `<message to='o&apos;neil@x' xmlns='jabber:client'><body>a &lt; b &amp; &quot;c&quot;</body><x xmlns='urn:y'/></message>`);
  assert.equal(render(parseXml(out)), out);
});

test('SCRAM signs in as RFC 5802 and RFC 7677 show, and checks the server', () => {
  const sha1 = startSasl('SCRAM-SHA-1', 'user', 'pencil', 'fyko+d2lbbFgONRv9qkxdawL');
  assert.equal(utf8Decode(fromBase64(sha1.first)), 'n,,n=user,r=fyko+d2lbbFgONRv9qkxdawL');
  const final1 = sha1.answer(btoa('r=fyko+d2lbbFgONRv9qkxdawL3rfcNHYJY1ZVvWVs7j,s=QSXCR+Q6sek8bf92,i=4096'));
  assert.equal(utf8Decode(fromBase64(final1)), 'c=biws,r=fyko+d2lbbFgONRv9qkxdawL3rfcNHYJY1ZVvWVs7j,p=v0X8v3Bz2T0CJGbJQyF0X+HI4Ts=');
  sha1.finish(btoa('v=rmF9pqV8S7suAoZWja4dJRkFsKQ='));
  assert.throws(() => sha1.finish(btoa('v=AAAApqV8S7suAoZWja4dJRkFsKQ=')));

  const sha256 = startSasl('SCRAM-SHA-256', 'user', 'pencil', 'rOprNGfwEbeRWgbNEkqO');
  const final256 = sha256.answer(btoa('r=rOprNGfwEbeRWgbNEkqO%hvYDpWUa2RaTCAfuxFIlj)hNlF$k0,s=W22ZaJ0SNY7soEsUEjb6gQ==,i=4096'));
  assert.equal(utf8Decode(fromBase64(final256)), 'c=biws,r=rOprNGfwEbeRWgbNEkqO%hvYDpWUa2RaTCAfuxFIlj)hNlF$k0,p=dHzbZapWIk4jUhN+Ute9ytag9zjfMHgsqmmiz7AndVQ=');
  sha256.finish(btoa('v=6rriTRBi23WpRR/wtup+mMhUZUn/dB5nLTJRsjl95G4='));
  // A server that changes our nonce, or asks for too few rounds, is refused.
  assert.throws(() => startSasl('SCRAM-SHA-1', 'user', 'pencil', 'abc').answer(btoa('r=xyz123,s=QSXCR+Q6sek8bf92,i=4096')));
  assert.throws(() => startSasl('SCRAM-SHA-1', 'user', 'pencil', 'abc').answer(btoa('r=abc123,s=QSXCR+Q6sek8bf92,i=100')));
});

test('addresses and servers are read as people write them', () => {
  assert.ok(isXmppId('name@example.org'));
  assert.ok(isXmppId('name@localhost'));
  assert.ok(!isXmppId('example.org'));
  assert.ok(!isXmppId('@example.org'));
  assert.deepEqual(serverOf('xmpp.example.org'), { host: 'xmpp.example.org', port: 5222, tls: 'starttls' });
  assert.deepEqual(serverOf('xmpp.example.org:5223'), { host: 'xmpp.example.org', port: 5223, tls: 'direct' });
  assert.deepEqual(serverOf('wss://example.org/xmpp-websocket'), { websocket: 'wss://example.org/xmpp-websocket' });
  assert.equal(serverOf(''), undefined);
  assert.throws(() => serverOf('http://example.org'));
  assert.equal(fingerprint(btoa(String.fromCharCode(5, ...new Array(32).fill(0xab)))), new Array(8).fill('abababab').join(' '));
});

// ---- a server ----

type Item = { jid: string; subscription: 'none' | 'to' | 'from' | 'both'; name?: string; ask?: boolean };
type Archived = { id: string; at: number; message: XmlElement };

const DOMAIN = 'example.org';
const PASSWORD = 'correct horse';

class Server {
  readonly bound = new Map<string, Link>();
  readonly rosters = new Map<string, Map<string, Item>>();
  readonly pep = new Map<string, XmlElement>();
  readonly archives = new Map<string, Archived[]>();
  /** Everything people sent, as the server saw it. */
  readonly seen: string[] = [];
  private next = 1;
  readonly noOmemo = new Set<string>();

  connect = async (): Promise<XmppLink> => new Link(this);

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

const bareOf = (jid: string) => jid.split('/')[0];

class Link implements XmppLink {
  kind = 'websocket' as const;
  secure = true;
  tor = false;
  private queue: StreamEvent[] = [];
  private closed = false;
  private jid = '';
  private full = '';
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
    return error('service-unavailable');
  }
}

/** Takes what came for a while, as lib/xmpp-store.ts does. The account goes through JSON first. */
async function settle(people: { state: XmppState; connection: XmppConnection }[], rounds = 20): Promise<void> {
  for (let i = 0; i < rounds; i++) {
    await new Promise((resolve) => setTimeout(resolve, 10));
    for (const person of people) {
      person.state = JSON.parse(JSON.stringify(person.state)) as XmppState;
      const taken: Taken = { chats: [], republish: false };
      for (const stanza of person.connection.take()) await takeStanza(person.state, person.connection, stanza, taken);
    }
  }
}

async function person(server: Server, user: string) {
  const signed = await signInXmpp(`${user}@${DOMAIN}`, PASSWORD, undefined, server.connect);
  await startSession(signed.state, signed.connection);
  return signed;
}

test('a wrong password is said so', { skip: !coreReady }, async () => {
  const server = new Server();
  await assert.rejects(signInXmpp(`ann@${DOMAIN}`, 'wrong', undefined, server.connect), (error: unknown) => error instanceof XmppError && error.condition === 'not-authorized');
});

test('two people write encrypted both ways, and a second device reads along', { skip: !coreReady }, async () => {
  const server = new Server();
  const ann = await person(server, 'ann');
  const ben = await person(server, 'ben');
  await addXmppContact(ann.state, ann.connection, `ben@${DOMAIN}`, 'Ben');
  await settle([ann, ben]);
  assert.deepEqual(ben.state.requests, [`ann@${DOMAIN}`]);
  await addXmppContact(ben.state, ben.connection, `ann@${DOMAIN}`);
  await settle([ann, ben]);
  assert.equal(ann.state.roster[`ben@${DOMAIN}`].subscription, 'both');
  assert.equal(ben.state.roster[`ann@${DOMAIN}`].subscription, 'both');
  assert.deepEqual(ben.state.requests, []);

  // Ann's second device signs in later.
  const ann2 = await person(server, 'ann');
  await settle([ann, ben, ann2]);

  const sent = await sendXmppText(ann.state, ann.connection, `ben@${DOMAIN}`, 'Γεια σου Ben');
  assert.equal(sent.state, 'sent');
  await settle([ann, ben, ann2]);
  const benChat = ben.state.chats[`ann@${DOMAIN}`];
  assert.deepEqual(benChat.messages.map((m) => [m.text, m.mine, m.encrypted]), [['Γεια σου Ben', false, true]]);
  assert.equal(benChat.unread, 1);
  // The server never saw the words.
  assert.ok(server.seen.every((s) => !s.includes('Γεια')));
  // Ann's other device has it too, as hers.
  assert.deepEqual(ann2.state.chats[`ben@${DOMAIN}`]?.messages.map((m) => [m.text, m.mine]), [['Γεια σου Ben', true]]);
  // Ben's app said it arrived.
  assert.equal(ann.state.chats[`ben@${DOMAIN}`].messages[0].state, 'received');

  await sendXmppText(ben.state, ben.connection, `ann@${DOMAIN}`, 'Γεια σου Ann');
  await settle([ann, ben, ann2]);
  assert.deepEqual(ann.state.chats[`ben@${DOMAIN}`].messages.map((m) => [m.text, m.mine]), [['Γεια σου Ben', true], ['Γεια σου Ann', false]]);
  assert.deepEqual(ann2.state.chats[`ben@${DOMAIN}`].messages.map((m) => [m.text, m.mine]), [['Γεια σου Ben', true], ['Γεια σου Ann', false]]);
  // Ben reads; Ann sees it read.
  await markXmppRead(ben.state, ben.connection, `ann@${DOMAIN}`);
  await sendXmppText(ann.state, ann.connection, `ben@${DOMAIN}`, 'δεύτερο');
  await settle([ann, ben, ann2]);
  await markXmppRead(ben.state, ben.connection, `ann@${DOMAIN}`);
  await settle([ann, ben, ann2]);
  assert.deepEqual(ann.state.chats[`ben@${DOMAIN}`].messages.filter((m) => m.mine).map((m) => m.state), ['read', 'read']);

  // Ben goes away; Ann writes; Ben is back, and the archive gives it to him, once.
  ben.connection.close();
  await sendXmppText(ann.state, ann.connection, `ben@${DOMAIN}`, 'όσο έλειπες');
  ben.connection = await XmppConnection.open(ben.state, server.connect);
  await startSession(ben.state, ben.connection);
  await settle([ann, ben, ann2]);
  assert.deepEqual(ben.state.chats[`ann@${DOMAIN}`].messages.map((m) => m.text), ['Γεια σου Ben', 'Γεια σου Ann', 'δεύτερο', 'όσο έλειπες']);
  ben.connection.close();
  ben.connection = await XmppConnection.open(ben.state, server.connect);
  await startSession(ben.state, ben.connection);
  await settle([ben]);
  assert.equal(ben.state.chats[`ann@${DOMAIN}`].messages.length, 4);
  for (const p of [ann, ben, ann2]) p.connection.close();
});

test('someone without OMEMO gets nothing, unless the chat chooses to write without it', { skip: !coreReady }, async () => {
  const server = new Server();
  server.noOmemo.add(`old@${DOMAIN}`);
  const ann = await person(server, 'ann');
  const old = await person(server, 'old');
  await assert.rejects(sendXmppText(ann.state, ann.connection, `old@${DOMAIN}`, 'hello'), (error: unknown) => error instanceof NoOmemoError);
  assert.equal(server.seen.length, 0);
  ann.state.chats[`old@${DOMAIN}`].messages = [];
  ann.state.chats[`old@${DOMAIN}`].plain = true;
  const sent = await sendXmppText(ann.state, ann.connection, `old@${DOMAIN}`, 'hello in the clear');
  assert.equal(sent.encrypted, false);
  await settle([ann, old]);
  assert.deepEqual(old.state.chats[`ann@${DOMAIN}`].messages.map((m) => [m.text, m.encrypted]), [['hello in the clear', false]]);
  ann.connection.close();
  old.connection.close();
});
