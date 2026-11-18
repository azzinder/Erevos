// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { randomBytes, toHex } from './crypto';

// What lib/xmpp.ts and lib/xmpp-muc.ts both need: the XML namespaces, the error a server's answer
// becomes, and addresses (JIDs). lib/xmpp.ts gives them out as its own too.

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
  muji: 'urn:xmpp:jingle:muji:0',
  callInvites: 'urn:xmpp:call-invites:0',
  /** The older Call Invites, which Dino still sends and reads. */
  callMessage: 'urn:xmpp:call-message:1',
  extdisco: 'urn:xmpp:extdisco:2',
  caps: 'http://jabber.org/protocol/caps',
  pubsubEvent: 'http://jabber.org/protocol/pubsub#event',
  bookmarks: 'urn:xmpp:bookmarks:1',
  blocking: 'urn:xmpp:blocking',
} as const;

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

/** An id for a stanza or a message. */
export function newXmppId(): string {
  return `erevos-${toHex(randomBytes(9))}`;
}
