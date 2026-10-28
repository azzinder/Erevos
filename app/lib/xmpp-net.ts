import { canNet, canTorHttp, net, torHttp } from './core';
import { utf8Decode, utf8Encode } from './crypto';
import { t } from './i18n';
import { throughTor, torFor } from './relay';
import { el, parseXml, render, textOf, XmlStream, type StreamEvent } from './xmpp-xml';

// How Erevos reaches an XMPP server (lib/xmpp.ts, docs/xmpp.md): on Android a TCP connection of
// its own made by the core (crates/erevos-tor), straight or through Tor as the space's Tor way says,
// in TLS from the start or after STARTTLS; in a browser, where there is no TCP, XMPP over
// WebSocket (RFC 7395), where the server offers it. Either way the app sees one link: text out,
// the stream's events in.

export type XmppLink = {
  kind: 'socket' | 'websocket';
  /** Whether the link is in TLS (or is a test's own, which counts as one). */
  secure: boolean;
  /** Whether it goes through Tor. */
  tor: boolean;
  /** Opens the stream to `domain`, again after signing in. */
  open(domain: string): Promise<void>;
  send(stanza: string): Promise<void>;
  /** What came, waiting up to `wait` ms for something: [] when nothing came. Throws once closed. */
  read(wait: number): Promise<StreamEvent[]>;
  close(): void;
};

export type XmppServer = { host: string; port: number; tls: 'direct' | 'starttls' } | { websocket: string };

const STREAM_OPEN = (domain: string) =>
  `<?xml version='1.0'?><stream:stream to='${domain}' version='1.0' xmlns='jabber:client' xmlns:stream='http://etherx.jabber.org/streams'>`;

const FRAMING = 'urn:ietf:params:xml:ns:xmpp-framing';

function waitBytes(ms: number): Uint8Array {
  const out = new Uint8Array(8);
  new DataView(out.buffer).setBigUint64(0, BigInt(Math.max(0, Math.round(ms))));
  return out;
}

/** A connection the core made (Android): `tor` through Tor. */
async function socketLink(server: { host: string; port: number; tls: 'direct' | 'starttls' }, domain: string, tor: boolean): Promise<XmppLink> {
  const core = net();
  const id = await core.netOpen(JSON.stringify({ host: server.host, port: server.port, domain, tls: server.tls, tor }));
  const reader = new XmlStream();
  let closed = false;
  return {
    kind: 'socket',
    secure: true,
    tor,
    async open(to) {
      reader.reset();
      await core.netWrite(id, utf8Encode(STREAM_OPEN(to)));
    },
    async send(stanza) {
      await core.netWrite(id, utf8Encode(stanza));
    },
    async read(wait) {
      if (closed) throw new Error(t('The connection to the XMPP server is closed.'));
      const bytes = await core.netRead(id, waitBytes(wait));
      return bytes.length ? reader.push(bytes) : [];
    },
    close() {
      if (closed) return;
      closed = true;
      core.netWrite(id, utf8Encode('</stream:stream>')).catch(() => undefined).finally(() => void core.netClose(id).catch(() => undefined));
    },
  };
}

/** XMPP over WebSocket (RFC 7395): each frame one element. */
export function websocketLink(url: string, make: (url: string, protocols: string[]) => WebSocket = (u, p) => new WebSocket(u, p)): Promise<XmppLink> {
  return new Promise((resolve, reject) => {
    const socket = make(url, ['xmpp']);
    const queue: StreamEvent[] = [];
    let waiting: (() => void) | null = null;
    let closed = false;
    const wake = () => {
      waiting?.();
      waiting = null;
    };
    socket.onmessage = (event) => {
      try {
        const element = parseXml(String(event.data));
        if (element.ns === FRAMING && element.name === 'open') queue.push({ kind: 'open', attrs: element.attrs });
        else if (element.ns === FRAMING && element.name === 'close') queue.push({ kind: 'close' });
        else queue.push({ kind: 'stanza', element });
      } catch {
        queue.push({ kind: 'close' });
      }
      wake();
    };
    socket.onclose = () => {
      closed = true;
      wake();
    };
    socket.onerror = () => {
      if (!closed && socket.readyState !== 1) reject(new Error(t('Cannot reach the XMPP server.')));
    };
    socket.onopen = () =>
      resolve({
        kind: 'websocket',
        secure: url.startsWith('wss://'),
        tor: false,
        async open(to) {
          socket.send(render(el('open', { xmlns: FRAMING, to, version: '1.0' })));
        },
        async send(stanza) {
          if (closed) throw new Error(t('The connection to the XMPP server is closed.'));
          socket.send(stanza);
        },
        async read(wait) {
          if (!queue.length && !closed) {
            await new Promise<void>((done) => {
              waiting = done;
              setTimeout(done, wait);
            });
          }
          if (!queue.length && closed) throw new Error(t('The connection to the XMPP server is closed.'));
          return queue.splice(0);
        },
        close() {
          if (closed) return;
          closed = true;
          try {
            socket.send(render(el('close', { xmlns: FRAMING })));
            socket.close();
          } catch {
            // Already gone.
          }
        },
      });
  });
}

// ---- finding the server ----

/** A GET over HTTPS, through Tor when the space's Tor way says so (as lib/matrix.ts does). */
async function httpGet(url: string, headers: Record<string, string>): Promise<{ status: number; text: string }> {
  const tor = canTorHttp() && torFor(false);
  if (!tor && throughTor()) throw new Error(t('Tor is not ready.'));
  if (tor) {
    try {
      const answer = await torHttp(JSON.stringify({ method: 'GET', url, headers }), new Uint8Array(0));
      return { status: (answer[0] << 8) | answer[1], text: utf8Decode(answer.subarray(2)) };
    } catch (error) {
      if (throughTor()) throw error;
    }
  }
  const response = await fetch(url, { headers });
  return { status: response.status, text: await response.text() };
}

type Srv = { priority: number; weight: number; port: number; target: string; tls: 'direct' | 'starttls' };

/** A domain's SRV records, asked of a DNS-over-HTTPS resolver: phones have no way to ask for SRV
 *  themselves, and through Tor no other way exists. */
async function srv(name: string, tls: 'direct' | 'starttls'): Promise<Srv[]> {
  for (const resolver of ['https://cloudflare-dns.com/dns-query', 'https://dns.google/resolve']) {
    try {
      const answer = await httpGet(`${resolver}?name=${encodeURIComponent(name)}&type=SRV`, { accept: 'application/dns-json' });
      if (answer.status !== 200) continue;
      const json = JSON.parse(answer.text) as { Status?: number; Answer?: { type: number; data: string }[] };
      return (json.Answer ?? [])
        .filter((a) => a.type === 33)
        .map((a) => {
          const [priority, weight, port, target] = a.data.trim().split(/\s+/);
          return { priority: Number(priority), weight: Number(weight), port: Number(port), target: target.replace(/\.$/, ''), tls };
        })
        // "." as the target says the service is not offered (RFC 2782).
        .filter((r) => r.target && r.target !== '.' && Number.isInteger(r.port) && r.port > 0);
    } catch {
      // The next resolver.
    }
  }
  return [];
}

/** Where to reach `domain`'s XMPP service with a TCP connection: its SRV records, direct TLS first
 *  at the same priority (XEP-0368), then the domain itself on 5222. */
export async function socketServers(domain: string): Promise<{ host: string; port: number; tls: 'direct' | 'starttls' }[]> {
  const [direct, start] = await Promise.all([srv(`_xmpps-client._tcp.${domain}`, 'direct'), srv(`_xmpp-client._tcp.${domain}`, 'starttls')]);
  const all = [...direct, ...start].sort((a, b) => a.priority - b.priority || (a.tls === b.tls ? b.weight - a.weight : a.tls === 'direct' ? -1 : 1));
  const servers = all.map((r) => ({ host: r.target, port: r.port, tls: r.tls }));
  if (!servers.some((s) => s.host === domain && s.port === 5222)) servers.push({ host: domain, port: 5222, tls: 'starttls' });
  return servers;
}

/** The WebSocket address the domain gives for XMPP (XEP-0156), if it gives one. */
export async function websocketOf(domain: string): Promise<string | null> {
  try {
    const json = await httpGet(`https://${domain}/.well-known/host-meta.json`, { accept: 'application/json' });
    if (json.status === 200) {
      const links = (JSON.parse(json.text) as { links?: { rel?: string; href?: string }[] }).links ?? [];
      const href = links.find((l) => l.rel === 'urn:xmpp:alt-connections:websocket')?.href;
      if (href?.startsWith('wss://')) return href;
    }
  } catch {
    // The XML form next.
  }
  try {
    const xml = await httpGet(`https://${domain}/.well-known/host-meta`, { accept: 'application/xrd+xml' });
    if (xml.status !== 200) return null;
    const doc = parseXml(xml.text);
    const link = doc.children.find((c) => typeof c !== 'string' && c.name === 'Link' && c.attrs.rel === 'urn:xmpp:alt-connections:websocket');
    const href = link && typeof link !== 'string' ? link.attrs.href : undefined;
    return href?.startsWith('wss://') ? href : null;
  } catch {
    return null;
  }
}

/** Whether XMPP goes through Tor now, as the space's Tor way and Tor's state say. In the web app, which has no socket of its own, it never does. */
export function xmppThroughTor(): boolean {
  return canNet() && canTorHttp() && torFor(false);
}

/** Connects to `domain`'s XMPP service: the server given, or the ones its DNS names, one after the
 *  other. Answers the link, not yet opened. */
export async function connectXmpp(domain: string, given?: XmppServer): Promise<XmppLink> {
  if (given && 'websocket' in given) return websocketLink(given.websocket);
  if (!canNet()) {
    const url = await websocketOf(domain);
    if (!url) throw new Error(t('{domain} offers no XMPP over WebSocket, which Erevos needs here. On Android it connects without it.', { domain }));
    return websocketLink(url);
  }
  const tor = canTorHttp() && torFor(false);
  if (!tor && throughTor()) throw new Error(t('Tor is not ready.'));
  const servers = given ? [given] : await socketServers(domain);
  let last: unknown = null;
  for (const server of servers) {
    try {
      return await socketLink(server, domain, tor);
    } catch (error) {
      last = error;
      // With the way Messages, a server Tor could not reach is tried straight.
      if (tor && !throughTor()) {
        try {
          return await socketLink(server, domain, false);
        } catch (again) {
          last = again;
        }
      }
    }
  }
  throw last instanceof Error ? last : new Error(t('Cannot reach the XMPP server.'));
}

/** The text of an element, for errors. */
export function said(element: Parameters<typeof textOf>[0]): string {
  return textOf(element).trim();
}
