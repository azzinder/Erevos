import { sha1 } from '@noble/hashes/legacy.js';

import type { ChatNotify } from '../lock/chat-notify';
import { randomBytes, toBase64, toHex, utf8Encode } from './crypto';
import { t } from './i18n';
import { connectXmpp, type XmppLink, type XmppServer } from './xmpp-net';
import {
  bundleElement,
  bundleNode,
  bundleOf,
  deviceListElement,
  devicesOf,
  DEVICES_NODE,
  HINT_BODY,
  itemOf,
  itemsElement,
  keyFor,
  newOwnOmemo,
  NoOmemoError,
  OMEMO,
  omemoCall,
  publishElement,
  type OmemoPeople,
  type OwnOmemo,
  type PreKey,
} from './xmpp-omemo';
import { pickMechanism, startSasl } from './xmpp-sasl';
import { child, children, el, find, render, textOf, type XmlElement } from './xmpp-xml';

// An XMPP (Jabber) account in Erevos (docs/xmpp.md): signing in, the contacts (roster), and chats
// with one person, encrypted with OMEMO (lib/xmpp-omemo.ts) as Conversations, Monal, Gajim and
// Dino do. The connection is lib/xmpp-net.ts's; lib/xmpp-store.ts keeps it running for the open
// space and keeps the account sealed in it (lock/xmpp-data.ts).
//
// What a chat holds is kept here, as on the other networks: the latest KEEP_MESSAGES of each.
// Messages that came while the phone was away are fetched from the server's archive (MAM,
// XEP-0313) when it connects again; ones sent from the account's other devices come as carbons
// (XEP-0280).

export const NS = {
  client: 'jabber:client',
  streams: 'http://etherx.jabber.org/streams',
  sasl: 'urn:ietf:params:xml:ns:xmpp-sasl',
  bind: 'urn:ietf:params:xml:ns:xmpp-bind',
  session: 'urn:ietf:params:xml:ns:xmpp-session',
  stanzas: 'urn:ietf:params:xml:ns:xmpp-stanzas',
  roster: 'jabber:iq:roster',
  carbons: 'urn:xmpp:carbons:2',
  forward: 'urn:xmpp:forward:0',
  delay: 'urn:xmpp:delay',
  mam: 'urn:xmpp:mam:2',
  rsm: 'http://jabber.org/protocol/rsm',
  receipts: 'urn:xmpp:receipts',
  markers: 'urn:xmpp:chat-markers:0',
  sid: 'urn:xmpp:sid:0',
  hints: 'urn:xmpp:hints',
  eme: 'urn:xmpp:eme:0',
  ping: 'urn:xmpp:ping',
  discoInfo: 'http://jabber.org/protocol/disco#info',
  jmi: 'urn:xmpp:jingle-message:0',
  jingle: 'urn:xmpp:jingle:1',
  extdisco: 'urn:xmpp:extdisco:2',
  caps: 'http://jabber.org/protocol/caps',
  pubsubEvent: 'http://jabber.org/protocol/pubsub#event',
} as const;

/** How many messages each chat keeps. */
export const KEEP_MESSAGES = 300;
/** How many message ids are remembered, so one that comes twice shows once. */
const KEEP_SEEN = 3000;
/** Pages of the archive fetched when connecting again, 50 messages each. */
const MOST_PAGES = 20;
/** How long a person's device list is trusted before it is fetched again. */
const DEVICES_FRESH_MS = 24 * 3600_000;
/** How long after a device's bundle could not be had it is tried again. */
const RETRY_DEVICE_MS = 3600_000;

export type XmppMessage = {
  id: string;
  mine: boolean;
  text: string;
  at: number;
  encrypted: boolean;
  /** An encrypted message this device cannot open. */
  locked?: boolean;
  state?: 'sending' | 'sent' | 'received' | 'read' | 'failed';
  /** It asked to be marked as read (XEP-0333), and to whom that goes. */
  markable?: string;
  /** A call's line (lib/xmpp-calls.ts), kept here only: its text in English, shown by lib/call-lines.ts. */
  call?: true;
};

export type XmppChat = {
  jid: string;
  messages: XmppMessage[];
  unread: number;
  lastAt: number;
  /** The person chose to write without encryption, to someone whose app has none. */
  plain?: boolean;
  /** Its own notifications (lock/chat-notify.ts), kept on this device only. */
  notify?: ChatNotify;
};

export type XmppContact = {
  jid: string;
  name?: string;
  subscription: 'none' | 'to' | 'from' | 'both' | 'remove';
  /** We asked to see them, and they have not answered yet. */
  asked?: boolean;
};

export type XmppState = {
  /** The account's bare JID, such as name@example.org. */
  jid: string;
  password: string;
  resource: string;
  /** A server given by hand, when the domain's own DNS does not say. */
  server?: XmppServer;
  omemo: OwnOmemo;
  people: OmemoPeople;
  chats: Record<string, XmppChat>;
  roster: Record<string, XmppContact>;
  /** People who asked to add us. */
  requests: string[];
  /** The archive id of the newest message fetched or seen. */
  archived?: string;
  seen: string[];
};

export class XmppError extends Error {
  readonly condition: string;
  constructor(message: string, condition = '') {
    super(message);
    this.condition = condition;
  }
}

// ---- JIDs ----

/** user@domain/resource without the resource, lower-cased where XMPP says case does not matter. */
export function bare(jid: string): string {
  const slash = jid.indexOf('/');
  const base = slash >= 0 ? jid.slice(0, slash) : jid;
  const at = base.indexOf('@');
  return at >= 0 ? `${base.slice(0, at).toLowerCase()}@${base.slice(at + 1).toLowerCase()}` : base.toLowerCase();
}

export function domainOf(jid: string): string {
  const b = bare(jid);
  return b.slice(b.indexOf('@') + 1);
}

/** Whether `text` is a JID with a person in it, as name@example.org. */
export function isXmppId(text: string): boolean {
  return /^[^\s@/"&'<>:]+@[a-z0-9-]+(\.[a-z0-9-]+)*$/i.test(text.trim());
}

const newId = () => `erevos-${toHex(randomBytes(9))}`;

/** A chat's name: the one in the contacts, or the part before the @. */
export function nameOf(state: XmppState, jid: string): string {
  return state.roster[jid]?.name?.trim() || jid.slice(0, jid.indexOf('@')) || jid;
}

// ---- the connection ----

type Pending = { resolve: (answer: XmlElement) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> };

/** A signed-in connection: IQ answers are matched to their questions as they come; everything
 *  else waits in `inbox` for the store to take. */
export class XmppConnection {
  readonly link: XmppLink;
  readonly fullJid: string;
  private pending = new Map<string, Pending>();
  private inbox: XmlElement[] = [];
  private closed = false;
  private onStanza: (() => void) | null = null;
  lastHeard = Date.now();

  private constructor(link: XmppLink, fullJid: string) {
    this.link = link;
    this.fullJid = fullJid;
  }

  /** Connects, signs in and binds a resource. */
  static async open(state: Pick<XmppState, 'jid' | 'password' | 'resource' | 'server'>, connect: typeof connectXmpp = connectXmpp): Promise<XmppConnection> {
    const domain = domainOf(state.jid);
    const local = state.jid.slice(0, state.jid.indexOf('@'));
    const link = await connect(domain, state.server);
    try {
      await link.open(domain);
      let features = await expect(link, 'features');
      const offered = children(child(features, 'mechanisms', NS.sasl), 'mechanism').map((m) => textOf(m).trim());
      const mechanism = pickMechanism(offered, link.secure);
      if (!mechanism) throw new XmppError(t('The XMPP server offers no safe way to sign in.'));
      const sasl = startSasl(mechanism, local, state.password);
      await link.send(render(el('auth', { xmlns: NS.sasl, mechanism }, sasl.first || '=')));
      let answered = false;
      for (;;) {
        const step = await expect(link, 'challenge', 'success', 'failure');
        if (step.name === 'failure') {
          const condition = step.children.find((c): c is XmlElement => typeof c !== 'string' && c.name !== 'text')?.name ?? '';
          throw new XmppError(condition === 'not-authorized' ? t('The XMPP server says the name or the password is wrong.') : t('The XMPP server refused the sign-in ({reason}).', { reason: condition || '?' }), condition);
        }
        if (step.name === 'challenge') {
          // A last challenge carries the server's proof, before an empty success.
          if (answered) {
            sasl.finish(textOf(step).trim());
            await link.send(render(el('response', { xmlns: NS.sasl })));
            continue;
          }
          answered = true;
          await link.send(render(el('response', { xmlns: NS.sasl }, sasl.answer(textOf(step).trim()))));
          continue;
        }
        const last = textOf(step).trim();
        if (mechanism !== 'PLAIN' && last && last !== '=') sasl.finish(last);
        else if (mechanism !== 'PLAIN' && !answered) throw new XmppError(t('The XMPP server did not prove it knows the password: it may not be the real one.'));
        break;
      }
      await link.open(domain);
      features = await expect(link, 'features');
      if (!child(features, 'bind', NS.bind)) throw new XmppError(t('The XMPP server did not let Erevos in.'));
      const connection = new XmppConnection(link, state.jid);
      connection.pump();
      const bound = await connection.iq('set', undefined, el('bind', { xmlns: NS.bind }, el('resource', {}, state.resource)));
      const fullJid = textOf(find(bound, `bind|${NS.bind}`, 'jid')).trim();
      (connection as { fullJid: string }).fullJid = fullJid || `${state.jid}/${state.resource}`;
      const session = child(features, 'session', NS.session);
      if (session && !child(session, 'optional')) await connection.iq('set', undefined, el('session', { xmlns: NS.session }));
      return connection;
    } catch (error) {
      link.close();
      throw error;
    }
  }

  /** Reads what comes, until the connection closes: answers go to their questions, the rest waits. */
  private pump(): void {
    void (async () => {
      try {
        while (!this.closed) {
          const events = await this.link.read(30_000);
          if (events.length) this.lastHeard = Date.now();
          for (const event of events) {
            if (event.kind === 'close') throw new XmppError(t('The XMPP server closed the connection.'));
            if (event.kind !== 'stanza') continue;
            const stanza = event.element;
            if (stanza.name === 'error' && stanza.ns === NS.streams) {
              const condition = stanza.children.find((c): c is XmlElement => typeof c !== 'string' && c.name !== 'text')?.name ?? '';
              throw new XmppError(condition === 'conflict' ? t('This XMPP account signed in elsewhere as this device.') : t('The XMPP server ended the connection ({reason}).', { reason: condition || '?' }), condition);
            }
            const waiting = stanza.name === 'iq' && (stanza.attrs.type === 'result' || stanza.attrs.type === 'error') ? this.pending.get(stanza.attrs.id ?? '') : undefined;
            if (waiting) {
              this.pending.delete(stanza.attrs.id);
              clearTimeout(waiting.timer);
              if (stanza.attrs.type === 'result') waiting.resolve(stanza);
              else waiting.reject(stanzaError(stanza));
              continue;
            }
            this.inbox.push(stanza);
          }
          if (this.inbox.length) this.onStanza?.();
        }
      } catch (error) {
        this.fail(error instanceof Error ? error : new Error(String(error)));
      }
    })();
  }

  private failure: Error | null = null;

  private fail(error: Error): void {
    if (this.closed) return;
    this.closed = true;
    this.failure = error;
    for (const waiting of this.pending.values()) {
      clearTimeout(waiting.timer);
      waiting.reject(error);
    }
    this.pending.clear();
    this.link.close();
    this.onStanza?.();
  }

  get isOpen(): boolean {
    return !this.closed;
  }

  /** Why it closed, once it has. */
  get error(): Error | null {
    return this.failure;
  }

  /** Called when stanzas wait in the inbox, or the connection closed. */
  listen(onStanza: () => void): void {
    this.onStanza = onStanza;
    if (this.inbox.length || this.closed) onStanza();
  }

  take(): XmlElement[] {
    return this.inbox.splice(0);
  }

  async send(stanza: XmlElement): Promise<void> {
    if (this.closed) throw this.failure ?? new XmppError(t('The connection to the XMPP server is closed.'));
    // Each stanza says its namespace, as XMPP over WebSocket needs (RFC 7395).
    await this.link.send(render(stanza.ns ? stanza : { ...stanza, ns: NS.client }));
  }

  /** An IQ and its answer; an error answer throws, with its condition. */
  iq(type: 'get' | 'set', to: string | undefined, payload: XmlElement, wait = 30_000): Promise<XmlElement> {
    const id = newId();
    return new Promise<XmlElement>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new XmppError(t('The XMPP server did not answer in time.'), 'timeout'));
      }, wait);
      this.pending.set(id, { resolve, reject, timer });
      this.send(el('iq', { xmlns: NS.client, type, id, to }, payload)).catch((error: unknown) => {
        clearTimeout(timer);
        this.pending.delete(id);
        reject(error instanceof Error ? error : new Error(String(error)));
      });
    });
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    for (const waiting of this.pending.values()) clearTimeout(waiting.timer);
    this.pending.clear();
    this.link.close();
  }
}

/** The next stanza named one of `names` (anything else before it is an error). */
async function expect(link: XmppLink, ...names: string[]): Promise<XmlElement> {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    const events = await link.read(Math.max(1, deadline - Date.now()));
    for (const event of events) {
      if (event.kind === 'close') throw new XmppError(t('The XMPP server closed the connection.'));
      if (event.kind !== 'stanza') continue;
      if (event.element.name === 'error' && event.element.ns === NS.streams) {
        const condition = event.element.children.find((c): c is XmlElement => typeof c !== 'string' && c.name !== 'text')?.name ?? '';
        throw new XmppError(t('The XMPP server ended the connection ({reason}).', { reason: condition || '?' }), condition);
      }
      if (names.includes(event.element.name)) return event.element;
    }
  }
  throw new XmppError(t('The XMPP server did not answer in time.'), 'timeout');
}

function stanzaError(stanza: XmlElement): XmppError {
  const error = child(stanza, 'error');
  const condition = error?.children.find((c): c is XmlElement => typeof c !== 'string' && c.ns === NS.stanzas && c.name !== 'text')?.name ?? '';
  const text = textOf(child(error, 'text', NS.stanzas)).trim();
  return new XmppError(text || t('The XMPP server refused the request ({reason}).', { reason: condition || '?' }), condition);
}

// ---- signing in ----

/** Signs in for the first time: answers the account, with this device's new OMEMO keys. */
export async function signInXmpp(jid: string, password: string, server?: XmppServer, connect?: typeof connectXmpp): Promise<{ state: XmppState; connection: XmppConnection }> {
  const account = bare(jid.trim());
  if (!isXmppId(account)) throw new XmppError(t('Write an XMPP address, such as name@example.org.'));
  const resource = `Erevos.${toHex(randomBytes(3))}`;
  const connection = await XmppConnection.open({ jid: account, password, resource, server }, connect);
  try {
    const state: XmppState = { jid: account, password, resource, server, omemo: await newOwnOmemo(), people: {}, chats: {}, roster: {}, requests: [], seen: [] };
    return { state, connection };
  } catch (error) {
    connection.close();
    throw error;
  }
}

// ---- after signing in ----

const CAPS_NODE = 'https://erevos-web.lphl.nekten.eu';
// Calls (lib/xmpp-calls.ts) as Conversations looks for them before it shows its call buttons.
const CALL_FEATURES = [
  NS.jmi,
  NS.jingle,
  'urn:xmpp:jingle:apps:rtp:1',
  'urn:xmpp:jingle:apps:rtp:audio',
  'urn:xmpp:jingle:apps:rtp:video',
  'urn:xmpp:jingle:transports:ice-udp:1',
  'urn:xmpp:jingle:apps:dtls:0',
];
const FEATURES = [NS.caps, NS.discoInfo, NS.receipts, NS.markers, NS.ping, `${DEVICES_NODE}+notify`, ...CALL_FEATURES].sort();

/** Entity capabilities (XEP-0115): what this app can do, as a hash its contacts' servers know. */
export function capsVer(): string {
  const text = `client/phone//Erevos<${FEATURES.map((f) => `${f}<`).join('')}`;
  return toBase64(sha1(utf8Encode(text)));
}

/** What comes after signing in: the contacts, carbons, this device's OMEMO keys on the server,
 *  presence, and what the archive holds that this device has not seen. */
export async function startSession(state: XmppState, connection: XmppConnection): Promise<void> {
  const roster = await connection.iq('get', undefined, el('query', { xmlns: NS.roster }));
  takeRoster(state, child(roster, 'query', NS.roster), true);
  await connection.iq('set', undefined, el('enable', { xmlns: NS.carbons })).catch(() => undefined);
  await publishOmemo(state, connection).catch(() => undefined);
  await connection.send(el('presence', {}, el('c', { xmlns: NS.caps, hash: 'sha-1', node: CAPS_NODE, ver: capsVer() })));
  await fetchArchive(state, connection);
}

/** Makes sure this device is in the account's OMEMO device list, and its bundle is on the server. */
export async function publishOmemo(state: XmppState, connection: XmppConnection): Promise<void> {
  const own = state.omemo;
  let listed: number[] = [];
  try {
    listed = devicesOf(itemOf(await connection.iq('get', state.jid, itemsElement(DEVICES_NODE)), 'list'));
  } catch (error) {
    // No list yet: one is made.
    if (!(error instanceof XmppError) || error.condition !== 'item-not-found') throw error;
  }
  takeDeviceList(state, state.jid, listed);
  if (!own.published) await publishWithFallback(connection, bundleNode(own.device), bundleElement(own));
  if (!listed.includes(own.device)) await publishWithFallback(connection, DEVICES_NODE, deviceListElement([...listed, own.device]));
  own.published = true;
}

/** Publishes as open to all; a server that does not take publish options gets it without them. */
async function publishWithFallback(connection: XmppConnection, node: string, item: XmlElement): Promise<void> {
  try {
    await connection.iq('set', undefined, publishElement(node, item));
  } catch (error) {
    if (error instanceof XmppError && (error.condition === 'precondition-not-met' || error.condition === 'feature-not-implemented' || error.condition === 'bad-request')) {
      await connection.iq('set', undefined, publishElement(node, item, 'current', false));
    } else throw error;
  }
}

/** Fetches what the archive has after the last message seen, or the newest page the first time. */
export async function fetchArchive(state: XmppState, connection: XmppConnection): Promise<void> {
  for (let page = 0; page < MOST_PAGES; page++) {
    const set = el('set', { xmlns: NS.rsm }, el('max', {}, '50'), state.archived ? el('after', {}, state.archived) : el('before'));
    let fin: XmlElement | undefined;
    try {
      fin = child(await connection.iq('set', undefined, el('query', { xmlns: NS.mam, queryid: newId() }, set), 60_000), 'fin', NS.mam);
    } catch (error) {
      // An archive id the server no longer has: start again from its newest page.
      if (error instanceof XmppError && error.condition === 'item-not-found' && state.archived) {
        state.archived = undefined;
        continue;
      }
      return;
    }
    const last = textOf(find(fin, `set|${NS.rsm}`, 'last')).trim();
    const first = !state.archived;
    if (last) state.archived = last;
    if (first || fin?.attrs.complete === 'true' || !last) return;
  }
}

// ---- what comes ----

/** What calls need of what comes (lib/xmpp-calls.ts): the messages that ring and answer a call
 *  (XEP-0353), and Jingle's questions (XEP-0166), which the hook answers. */
export type CallHook = {
  /** A call message: `mine` when it is from this account, as a carbon of another device's or the
   *  accept it tells its devices; `live` unless it came from the archive. */
  message(state: XmppState, connection: XmppConnection, message: XmlElement, how: { at: number; live: boolean; mine: boolean }): void;
  iq(state: XmppState, connection: XmppConnection, iq: XmlElement): Promise<void>;
};

let callHook: CallHook | null = null;

/** Who hears of calls: lib/xmpp-calls.ts, or none (then a Jingle question is said no to). */
export function setCallHook(hook: CallHook | null): void {
  callHook = hook;
}

export type Taken = {
  /** Chats that changed. */
  chats: string[];
  /** This device used up pre-keys: its bundle goes to the server again. */
  republish: boolean;
};

/** Takes one stanza that came: messages, carbons, archived messages, receipts, contacts, OMEMO
 *  device lists, and questions to answer. */
export async function takeStanza(state: XmppState, connection: XmppConnection, stanza: XmlElement, taken: Taken): Promise<void> {
  const from = stanza.attrs.from ?? '';
  if (stanza.name === 'iq') return answerIq(state, connection, stanza, taken);
  if (stanza.name === 'presence') return takePresence(state, connection, stanza);
  if (stanza.name !== 'message') return;
  const ownServer = !from || bare(from) === state.jid || from === domainOf(state.jid);
  // An archived message, fetched by fetchArchive.
  const result = child(stanza, 'result', NS.mam);
  if (result && ownServer) {
    const forwarded = child(result, 'forwarded', NS.forward);
    const inner = child(forwarded, 'message', NS.client) ?? child(forwarded, 'message');
    if (inner) await takeMessage(state, connection, inner, { at: stampOf(forwarded), archiveId: result.attrs.id, live: false }, taken);
    return;
  }
  // A carbon: a message of ours sent from another device, or one to another of our devices.
  const carbon = child(stanza, 'sent', NS.carbons) ?? child(stanza, 'received', NS.carbons);
  if (carbon) {
    if (bare(from) !== state.jid) return; // Only our own server may send carbons.
    const inner = child(child(carbon, 'forwarded', NS.forward), 'message', NS.client) ?? child(child(carbon, 'forwarded', NS.forward), 'message');
    if (inner) await takeMessage(state, connection, inner, { at: Date.now(), live: true }, taken);
    return;
  }
  const event = child(stanza, 'event', NS.pubsubEvent);
  if (event) {
    const items = child(event, 'items');
    if (items?.attrs.node === DEVICES_NODE && from) {
      takeDeviceList(state, bare(from), devicesOf(itemOf(stanza, 'list')));
      if (bare(from) === state.jid && !devicesOf(itemOf(stanza, 'list')).includes(state.omemo.device)) {
        // Our device fell out of our own list (another app wrote it): it goes back in.
        await publishOmemo(state, connection).catch(() => undefined);
      }
    }
    return;
  }
  await takeMessage(state, connection, stanza, { at: stampOf(stanza), live: true }, taken);
}

function stampOf(element: XmlElement | undefined): number {
  const stamp = child(element, 'delay', NS.delay)?.attrs.stamp;
  const at = stamp ? Date.parse(stamp) : NaN;
  return Number.isFinite(at) ? at : Date.now();
}

function remember(state: XmppState, key: string): boolean {
  if (state.seen.includes(key)) return false;
  state.seen.push(key);
  if (state.seen.length > KEEP_SEEN) state.seen.splice(0, state.seen.length - KEEP_SEEN);
  return true;
}

function chatOf(state: XmppState, jid: string): XmppChat {
  return (state.chats[jid] ??= { jid, messages: [], unread: 0, lastAt: 0 });
}

function addMessage(chat: XmppChat, message: XmppMessage): void {
  chat.messages.push(message);
  chat.messages.sort((a, b) => a.at - b.at);
  if (chat.messages.length > KEEP_MESSAGES) chat.messages.splice(0, chat.messages.length - KEEP_MESSAGES);
  chat.lastAt = Math.max(chat.lastAt, message.at);
}

async function takeMessage(state: XmppState, connection: XmppConnection, message: XmlElement, how: { at: number; archiveId?: string; live: boolean }, taken: Taken): Promise<void> {
  const type = message.attrs.type ?? 'normal';
  if (type === 'groupchat' || type === 'headline') return;
  const from = bare(message.attrs.from ?? state.jid);
  const to = bare(message.attrs.to ?? state.jid);
  const mine = from === state.jid;
  // A call rung, answered or ended (XEP-0353): for the calls, once, and not a chat message.
  const call = message.children.find((c): c is XmlElement => typeof c !== 'string' && c.ns === NS.jmi);
  if (call) {
    if (how.archiveId) state.archived = how.archiveId;
    if (callHook && remember(state, `call|${message.attrs.from ?? ''}|${call.name}|${call.attrs.id ?? ''}`)) callHook.message(state, connection, message, { at: how.at, live: how.live, mine });
    return;
  }
  const peer = mine ? to : from;
  if (!peer.includes('@') || peer === state.jid) return;
  const id = message.attrs.id ?? '';
  const originId = child(message, 'origin-id', NS.sid)?.attrs.id;
  if (how.archiveId) state.archived = how.archiveId;

  if (type === 'error') {
    const chat = state.chats[peer];
    const failed = chat?.messages.find((m) => m.mine && m.id === id);
    if (failed) {
      failed.state = 'failed';
      taken.chats.push(peer);
    }
    return;
  }
  // Receipts and read marks for our messages.
  const receipt = child(message, 'received', NS.receipts)?.attrs.id ?? child(message, 'received', NS.markers)?.attrs.id;
  const displayed = child(message, 'displayed', NS.markers)?.attrs.id;
  // Another device of ours read the chat up to that message (its read mark, as a carbon): so it
  // is read here too, all but what came after it.
  if (displayed && mine) {
    const chat = state.chats[peer];
    const at = chat ? chat.messages.findIndex((m) => !m.mine && m.id === displayed) : -1;
    const after = at >= 0 ? chat.messages.slice(at + 1).filter((m) => !m.mine).length : chat?.unread ?? 0;
    if (chat && after < chat.unread) {
      chat.unread = after;
      taken.chats.push(peer);
    }
  }
  for (const [mark, state2] of [
    [receipt, 'received'],
    [displayed, 'read'],
  ] as const) {
    if (!mark || mine) continue;
    const chat = state.chats[peer];
    const target = chat?.messages.find((m) => m.mine && m.id === mark);
    if (target && target.state !== 'read') {
      target.state = state2;
      // Read marks mean everything before was read too.
      if (state2 === 'read') for (const m of chat.messages) if (m.mine && m.at <= target.at && m.state !== 'failed') m.state = 'read';
      taken.chats.push(peer);
    }
  }

  const encrypted = child(message, 'encrypted', OMEMO);
  const body = textOf(child(message, 'body')).trim();
  if (!encrypted && !body) return;
  if ((originId || id) && !remember(state, `${from}|${originId || id}`)) return;

  // An OMEMO message without a payload only moves the ratchet on (or carries a key for
  // something else): it is read, when it is for this device, and never shown.
  if (encrypted && !child(encrypted, 'payload', OMEMO)) {
    if (!mine) await openOmemo(state, connection, from, encrypted, taken, how.live);
    return;
  }
  let text = body;
  let locked = false;
  if (encrypted) {
    const opened = await openOmemo(state, connection, from, encrypted, taken, how.live);
    if (opened === 'empty') return;
    if (opened === null) {
      // Our own message from this device, archived: nothing in it is for this device.
      if (mine && state.chats[peer]?.messages.some((m) => m.id === (originId || id))) return;
      locked = true;
      text = '';
    } else text = opened;
  }
  const chat = chatOf(state, peer);
  if ((originId || id) && chat.messages.some((m) => m.id === (originId || id) && m.mine === mine)) return;
  const markable = !mine && child(message, 'markable', NS.markers) ? (message.attrs.from ?? from) : undefined;
  addMessage(chat, { id: originId || id || newId(), mine, text, at: how.at, encrypted: Boolean(encrypted), locked: locked || undefined, state: mine ? 'sent' : undefined, markable });
  if (!mine) chat.unread += 1;
  else chat.unread = 0;
  taken.chats.push(peer);
  // A receipt, when they asked and they are among the contacts (others do not learn we are here).
  if (how.live && !mine && id && child(message, 'request', NS.receipts) && ['both', 'from'].includes(state.roster[peer]?.subscription ?? '')) {
    await connection.send(el('message', { to: message.attrs.from, id: newId() }, el('received', { xmlns: NS.receipts, id }))).catch(() => undefined);
  }
}

/** Opens an OMEMO message to this device: its text, 'empty' for one that only moved the ratchet
 *  on, or null when nothing in it is for this device or it does not open. */
async function openOmemo(state: XmppState, connection: XmppConnection, from: string, encrypted: XmlElement, taken: Taken, live: boolean): Promise<string | 'empty' | null> {
  const header = child(encrypted, 'header', OMEMO);
  const sid = Number(header?.attrs.sid);
  const ours = keyFor(encrypted, state.omemo.device);
  if (!ours || !Number.isInteger(sid)) return null;
  const devices = (state.people[from] ??= { fetchedAt: 0, devices: {} }).devices;
  const device = (devices[String(sid)] ??= { listed: false });
  const payload = textOf(child(encrypted, 'payload', OMEMO)).trim();
  const iv = textOf(child(header, 'iv', OMEMO)).trim();
  try {
    const answer = await omemoCall<{ session: unknown; text: string | null; identity: string; used_pre_key: number | null }>({
      op: 'decrypt',
      identity: state.omemo.identity,
      signed_pre_keys: [state.omemo.signedPreKey],
      pre_keys: state.omemo.preKeys,
      session: device.session ?? null,
      key: ours.key,
      prekey: ours.prekey,
      payload: payload || null,
      iv: iv || null,
    });
    if (device.identity && device.identity !== answer.identity) device.changed = true;
    device.identity = answer.identity;
    device.session = answer.session;
    delete device.failedAt;
    if (answer.used_pre_key !== null) {
      await replacePreKey(state, answer.used_pre_key);
      taken.republish = true;
      // An empty message back completes the session, so their next ones are short (XEP-0384).
      if (live) await sendEmpty(state, connection, from, sid).catch(() => undefined);
    }
    return answer.text ?? 'empty';
  } catch {
    return null;
  }
}

async function replacePreKey(state: XmppState, used: number): Promise<void> {
  const own = state.omemo;
  own.preKeys = own.preKeys.filter((k) => k.id !== used);
  const { pre_keys } = await omemoCall<{ pre_keys: PreKey[] }>({ op: 'pre_keys_new', start: own.nextPreKey, count: 1 });
  own.preKeys.push(...pre_keys);
  own.nextPreKey += 1;
  own.published = false;
}

function takeDeviceList(state: XmppState, jid: string, ids: number[]): void {
  const person = (state.people[jid] ??= { fetchedAt: 0, devices: {} });
  person.fetchedAt = Date.now();
  for (const device of Object.values(person.devices)) device.listed = false;
  for (const id of ids) (person.devices[String(id)] ??= { listed: true }).listed = true;
}

function takeRoster(state: XmppState, query: XmlElement | undefined, whole: boolean): void {
  if (whole) state.roster = {};
  for (const item of children(query, 'item', NS.roster)) {
    const jid = bare(item.attrs.jid ?? '');
    if (!jid.includes('@')) continue;
    const subscription = (item.attrs.subscription ?? 'none') as XmppContact['subscription'];
    if (subscription === 'remove') {
      delete state.roster[jid];
      continue;
    }
    state.roster[jid] = { jid, name: item.attrs.name, subscription, asked: item.attrs.ask === 'subscribe' || undefined };
    if (subscription === 'both' || subscription === 'from') state.requests = state.requests.filter((r) => r !== jid);
  }
}

async function takePresence(state: XmppState, connection: XmppConnection, presence: XmlElement): Promise<void> {
  const from = bare(presence.attrs.from ?? '');
  if (!from.includes('@') || from === state.jid) return;
  if (presence.attrs.type === 'subscribe') {
    // Someone we added ourselves may see us at once; others ask first.
    const contact = state.roster[from];
    if (contact && (contact.asked || contact.subscription === 'to' || contact.subscription === 'both')) {
      await connection.send(el('presence', { to: from, type: 'subscribed' })).catch(() => undefined);
    } else if (!state.requests.includes(from)) state.requests.push(from);
  }
  if (presence.attrs.type === 'unsubscribe') state.requests = state.requests.filter((r) => r !== from);
}

async function answerIq(state: XmppState, connection: XmppConnection, iq: XmlElement, taken: Taken): Promise<void> {
  const type = iq.attrs.type;
  if (type !== 'get' && type !== 'set') return;
  const from = iq.attrs.from ?? '';
  const reply = (payload?: XmlElement) => connection.send(el('iq', { type: 'result', id: iq.attrs.id, to: from || undefined }, payload ?? null));
  const query = iq.children.find((c): c is XmlElement => typeof c !== 'string');
  // Roster changes come only from our own server.
  if (type === 'set' && query?.ns === NS.roster && (!from || bare(from) === state.jid)) {
    takeRoster(state, query, false);
    taken.chats.push('');
    return reply();
  }
  if (type === 'get' && query?.name === 'ping' && query.ns === NS.ping) return reply();
  if (type === 'set' && query?.name === 'jingle' && query.ns === NS.jingle && callHook) return callHook.iq(state, connection, iq);
  if (type === 'get' && query?.name === 'query' && query.ns === NS.discoInfo) {
    return reply(
      el('query', { xmlns: NS.discoInfo, node: query.attrs.node }, el('identity', { category: 'client', type: 'phone', name: 'Erevos' }), ...FEATURES.map((f) => el('feature', { var: f }))),
    );
  }
  return connection.send(
    el('iq', { type: 'error', id: iq.attrs.id, to: from || undefined }, el('error', { type: 'cancel' }, el('service-unavailable', { xmlns: NS.stanzas }))),
  );
}

// ---- what goes ----

/** Their device list, fetched again when old. */
async function devicesFor(state: XmppState, connection: XmppConnection, jid: string, fresh = false): Promise<void> {
  const person = state.people[jid];
  if (!fresh && person && Date.now() - person.fetchedAt < DEVICES_FRESH_MS) return;
  try {
    takeDeviceList(state, jid, devicesOf(itemOf(await connection.iq('get', jid, itemsElement(DEVICES_NODE)), 'list')));
  } catch (error) {
    if (error instanceof XmppError && ['item-not-found', 'service-unavailable', 'forbidden', 'not-authorized', 'subscription-required'].includes(error.condition)) {
      takeDeviceList(state, jid, []);
      return;
    }
    throw error;
  }
}

/** Sessions with every device of `jids` that has none yet, from their bundles. */
async function sessionsFor(state: XmppState, connection: XmppConnection, jids: string[]): Promise<void> {
  for (const jid of jids) {
    for (const [id, device] of Object.entries(state.people[jid]?.devices ?? {})) {
      if (!device.listed || device.session || (jid === state.jid && Number(id) === state.omemo.device)) continue;
      if (device.failedAt && Date.now() - device.failedAt < RETRY_DEVICE_MS) continue;
      try {
        const bundle = bundleOf(itemOf(await connection.iq('get', jid, itemsElement(bundleNode(Number(id)))), 'bundle'));
        if (!bundle) throw new Error('no bundle');
        const { session } = await omemoCall<{ session: { identity: string } }>({ op: 'session_start', identity: state.omemo.identity, bundle });
        if (device.identity && device.identity !== session.identity) device.changed = true;
        device.identity = session.identity;
        device.session = session;
      } catch {
        device.failedAt = Date.now();
      }
    }
  }
}

/** An <encrypted> for `peer`'s devices and our others, with `text`, or none for an empty one. */
async function encryptFor(state: XmppState, connection: XmppConnection, peer: string, text: string | null, only?: number): Promise<XmlElement> {
  await devicesFor(state, connection, peer);
  await devicesFor(state, connection, state.jid);
  await sessionsFor(state, connection, [peer, state.jid]);
  const targets: { jid: string; id: string }[] = [];
  for (const jid of [peer, state.jid]) {
    for (const [id, device] of Object.entries(state.people[jid]?.devices ?? {})) {
      if (!device.session || !device.listed) continue;
      if (jid === state.jid && Number(id) === state.omemo.device) continue;
      if (only !== undefined && (jid !== peer || Number(id) !== only)) continue;
      targets.push({ jid, id });
    }
  }
  if (!targets.some((d) => d.jid === peer)) {
    // A list fetched a while ago may be out of date: once more, freshly.
    if (only === undefined && Date.now() - (state.people[peer]?.fetchedAt ?? 0) > 60_000) {
      await devicesFor(state, connection, peer, true);
      return encryptFor(state, connection, peer, text, only);
    }
    throw new NoOmemoError(peer);
  }
  const answer = await omemoCall<{ payload: string | null; iv: string; keys: { key: string; prekey: boolean; session: unknown }[] }>({
    op: 'encrypt',
    text: text ?? undefined,
    sessions: targets.map((d) => state.people[d.jid].devices[d.id].session),
  });
  targets.forEach((d, i) => {
    state.people[d.jid].devices[d.id].session = answer.keys[i].session;
  });
  return el(
    'encrypted',
    { xmlns: OMEMO },
    el(
      'header',
      { sid: state.omemo.device },
      ...targets.map((d, i) => el('key', { rid: d.id, prekey: answer.keys[i].prekey ? 'true' : undefined }, answer.keys[i].key)),
      el('iv', {}, answer.iv),
    ),
    answer.payload ? el('payload', {}, answer.payload) : null,
  );
}

async function sendEmpty(state: XmppState, connection: XmppConnection, peer: string, device: number): Promise<void> {
  const encrypted = await encryptFor(state, connection, peer, null, device);
  await connection.send(el('message', { to: peer, type: 'chat', id: newId() }, encrypted, el('store', { xmlns: NS.hints })));
}

/** Sends `text` to `peer`, encrypted with OMEMO unless the chat chose otherwise. Throws
 *  NoOmemoError when their apps have no OMEMO keys and the chat has not chosen to send plain. */
export async function sendXmppText(state: XmppState, connection: XmppConnection, peer: string, text: string): Promise<XmppMessage> {
  const chat = chatOf(state, peer);
  const id = newId();
  const message: XmppMessage = { id, mine: true, text, at: Date.now(), encrypted: !chat.plain, state: 'sending' };
  const extras = [
    el('request', { xmlns: NS.receipts }),
    el('markable', { xmlns: NS.markers }),
    el('origin-id', { xmlns: NS.sid, id }),
  ];
  let stanza: XmlElement;
  if (chat.plain) {
    stanza = el('message', { to: peer, type: 'chat', id }, el('body', {}, text), ...extras);
  } else {
    const encrypted = await encryptFor(state, connection, peer, text);
    stanza = el(
      'message',
      { to: peer, type: 'chat', id },
      encrypted,
      el('encryption', { xmlns: NS.eme, namespace: OMEMO, name: 'OMEMO' }),
      el('store', { xmlns: NS.hints }),
      el('body', {}, HINT_BODY),
      ...extras,
    );
  }
  addMessage(chat, message);
  chat.unread = 0;
  remember(state, `${state.jid}|${id}`);
  try {
    await connection.send(stanza);
    message.state = 'sent';
  } catch (error) {
    message.state = 'failed';
    throw error;
  }
  return message;
}

/** Marks a chat as read here, and tells them, when their last message asked (XEP-0333). */
export async function markXmppRead(state: XmppState, connection: XmppConnection | null, peer: string): Promise<void> {
  const chat = state.chats[peer];
  if (!chat) return;
  chat.unread = 0;
  const last = [...chat.messages].reverse().find((m) => !m.mine);
  if (last?.markable && connection?.isOpen) {
    const to = last.markable;
    delete last.markable;
    await connection.send(el('message', { to, type: 'chat', id: newId() }, el('displayed', { xmlns: NS.markers, id: last.id }), el('store', { xmlns: NS.hints }))).catch(() => undefined);
  }
}

/** Adds someone to the contacts and asks to see them; accepting a request does the same. */
export async function addXmppContact(state: XmppState, connection: XmppConnection, jid: string, name?: string): Promise<void> {
  const who = bare(jid);
  if (!isXmppId(who)) throw new XmppError(t('Write an XMPP address, such as name@example.org.'));
  await connection.iq('set', undefined, el('query', { xmlns: NS.roster }, el('item', { jid: who, name: name || undefined })));
  if (state.requests.includes(who)) await connection.send(el('presence', { to: who, type: 'subscribed' }));
  await connection.send(el('presence', { to: who, type: 'subscribe' }));
  state.requests = state.requests.filter((r) => r !== who);
  state.roster[who] ??= { jid: who, subscription: 'none' };
  state.roster[who].asked = true;
  chatOf(state, who);
}

/** Says no to someone who asked to add us. */
export async function declineXmppRequest(state: XmppState, connection: XmppConnection, jid: string): Promise<void> {
  await connection.send(el('presence', { to: jid, type: 'unsubscribed' }));
  state.requests = state.requests.filter((r) => r !== jid);
}

/** A call's line in the chat with `jid`, kept here only; one with the same `id` is replaced. A
 *  missed call counts as not read. */
export function addCallLine(state: XmppState, jid: string, mine: boolean, text: string, id: string, at = Date.now()): void {
  const chat = chatOf(state, jid);
  const missed = !mine && text.includes('Missed ');
  const before = chat.messages.find((m) => m.call && m.id === id);
  if (before) {
    // A missed call that was answered on another device after all is no longer one to look at.
    if (!before.mine && before.text.includes('Missed ') && !missed && chat.unread > 0) chat.unread -= 1;
    before.text = text;
    before.mine = mine;
    return;
  }
  addMessage(chat, { id, mine, text, at, encrypted: true, call: true });
  if (missed) chat.unread += 1;
}

/** Removes a chat here; the contact stays in the account. */
export function forgetXmppChat(state: XmppState, jid: string): void {
  delete state.chats[jid];
}

/** Leaves the account: takes this device out of its OMEMO device list, and closes. */
export async function signOutXmpp(state: XmppState, connection: XmppConnection | null): Promise<void> {
  if (!connection?.isOpen) return;
  try {
    const listed = devicesOf(itemOf(await connection.iq('get', state.jid, itemsElement(DEVICES_NODE)), 'list'));
    if (listed.includes(state.omemo.device)) await publishWithFallback(connection, DEVICES_NODE, deviceListElement(listed.filter((d) => d !== state.omemo.device)));
  } catch {
    // Signing out goes on.
  }
  connection.close();
}

/** Chats, newest first. */
export function xmppChatList(state: XmppState): XmppChat[] {
  return Object.values(state.chats).sort((a, b) => b.lastAt - a.lastAt);
}

/** The fingerprints of a person's devices, as OMEMO apps show them, and whether each changed. */
export function xmppDevices(state: XmppState, jid: string): { id: string; identity?: string; changed?: boolean; listed: boolean }[] {
  return Object.entries(state.people[jid]?.devices ?? {}).map(([id, d]) => ({ id, identity: d.identity, changed: d.changed, listed: d.listed }));
}

export function sendKeepAlive(connection: XmppConnection): Promise<XmlElement> {
  return connection.iq('get', undefined, el('ping', { xmlns: NS.ping }), 60_000);
}
