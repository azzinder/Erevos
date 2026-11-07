// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// What XMPP accounts (lib/xmpp.ts) do besides chatting, against the small server of
// checks/xmpp-server.ts, with the real core built to WebAssembly for OMEMO: a new account made on
// its server (XEP-0077) with a name and a password, or a form of them, and said not to be made
// when the server asks for a captcha or makes none here; a new password; the account deleted;
// the groups a server lists and those the public channel search finds (XEP-0433), without MIX;
// and a link's preview (XEP-0511), which goes only in a chat without encryption. A device that
// comes with another key keeps its first session and gets nothing until its new key is accepted,
// and a device new in a list is written to; the chat says each once.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { after, before, test } from 'node:test';

import { setCore, type Core } from '../lib/core';
import {
  acceptXmppDevice,
  addXmppContact,
  changeXmppPassword,
  deleteXmppAccount,
  publishOmemo,
  registerXmpp,
  sendXmppText,
  signInXmpp,
  startSession,
  XmppError,
  xmppDevices,
  XmppRegisterError,
  type XmppConnection,
  type XmppState,
} from '../lib/xmpp';
import { newOwnOmemo, NoOmemoError } from '../lib/xmpp-omemo';
import { newOwnOmemo2 } from '../lib/xmpp-omemo2';
import { previewElement, previewOf } from '../lib/xmpp-links';
import { createXmppGroup, searchChannels, serverChannels } from '../lib/xmpp-muc';
import { el, parseXml, render } from '../lib/xmpp-xml';
import { DOMAIN, MUC, PASSWORD, person, Server, settle } from './xmpp-server';

const built = new URL('./.core/erevos_ffi.js', import.meta.url);
const coreReady = existsSync(built) && typeof (createRequire(import.meta.url)(built.pathname) as Record<string, unknown>).xmpp === 'function';

before(() => {
  if (!coreReady) return;
  const wasm = createRequire(import.meta.url)(built.pathname) as Record<string, (...args: never[]) => unknown>;
  setCore(Object.fromEntries(Object.entries(wasm).map(([name, fn]) => [name, async (...args: never[]) => fn(...args)])) as unknown as Core);
});
after(() => setCore(null));

type Person = { state: XmppState; connection: XmppConnection };

test('a preview is read and written as Link Metadata, its picture left out', () => {
  const written = parseXml(render(el('message', { xmlns: 'jabber:client' }, el('body', {}, 'https://example.org/a'), previewElement({ url: 'https://example.org/a', title: 'Σελίδα', text: 'Λόγια', image: '/9j/AAAA' }))));
  assert.deepEqual(previewOf(written), { url: 'https://example.org/a', title: 'Σελίδα', text: 'Λόγια' });
  assert.ok(!render(written).includes('/9j/'));
  // As other apps write it, with prefixes.
  const theirs = parseXml(
    "<message xmlns='jabber:client'><rdf:Description xmlns:rdf='http://www.w3.org/1999/02/22-rdf-syntax-ns#' xmlns:og='https://ogp.me/ns#' rdf:about='https://example.org/b'><og:title>B</og:title></rdf:Description></message>",
  );
  assert.deepEqual(previewOf(theirs), { url: 'https://example.org/b', title: 'B', text: '' });
  const bad = parseXml("<message xmlns='jabber:client'><rdf:Description xmlns:rdf='http://www.w3.org/1999/02/22-rdf-syntax-ns#' xmlns:og='https://ogp.me/ns#' rdf:about='javascript:x'><og:title>B</og:title></rdf:Description></message>");
  assert.equal(previewOf(bad), null);
});

test('a new account: made with a name and a password, or their form; refused with a captcha, taken names or none made here', { skip: !coreReady }, async () => {
  const server = new Server();
  await assert.rejects(registerXmpp(`nina@${DOMAIN}`, 'short', undefined, server.connect), /8/);
  const made = await registerXmpp(`nina@${DOMAIN}`, 'nina’s password', undefined, server.connect);
  assert.equal(made.state.jid, `nina@${DOMAIN}`);
  assert.equal(server.accounts.get(`nina@${DOMAIN}`), 'nina’s password');
  made.connection.close();
  await assert.rejects(registerXmpp(`nina@${DOMAIN}`, 'another password', undefined, server.connect), /someone/);

  server.registration = 'form';
  const formed = await registerXmpp(`omar@${DOMAIN}`, 'omar’s password', undefined, server.connect);
  assert.equal(formed.state.jid, `omar@${DOMAIN}`);
  formed.connection.close();

  server.registration = 'captcha';
  const captcha = await registerXmpp(`pia@${DOMAIN}`, 'pia’s password', undefined, server.connect).catch((error: unknown) => error);
  assert.ok(captcha instanceof XmppRegisterError);
  assert.match(captcha.message, /captcha/);
  assert.equal(captcha.page, `https://${DOMAIN}/register`);
  assert.ok(!server.accounts.has(`pia@${DOMAIN}`));

  server.registration = 'closed';
  const closed = await registerXmpp(`pia@${DOMAIN}`, 'pia’s password', undefined, server.connect).catch((error: unknown) => error);
  assert.ok(closed instanceof XmppRegisterError);
  assert.match(closed.message, /website/);
  assert.equal(closed.page, `https://${DOMAIN}/register`);
});

test('a new password signs in from then on; a deleted account signs in no more', { skip: !coreReady }, async () => {
  const server = new Server();
  const quinn = await person(server, 'quinn');
  await changeXmppPassword(quinn.state, quinn.connection, 'a new password');
  assert.equal(quinn.state.password, 'a new password');
  quinn.connection.close();
  await assert.rejects(signInXmpp(`quinn@${DOMAIN}`, PASSWORD, undefined, server.connect), /wrong/);
  const again = await signInXmpp(`quinn@${DOMAIN}`, 'a new password', undefined, server.connect);
  await startSession(again.state, again.connection);
  await assert.rejects(changeXmppPassword(again.state, again.connection, 'short'), /8/);
  await deleteXmppAccount(again.state, again.connection);
  assert.ok(!again.connection.isOpen);
  await assert.rejects(signInXmpp(`quinn@${DOMAIN}`, 'a new password', undefined, server.connect), /wrong/);
});

test('groups to join: those the server lists, and those the public search finds, never MIX', { skip: !coreReady }, async (t) => {
  const server = new Server();
  const ann = await person(server, 'ann');
  const ben = await person(server, 'ben');
  const people: Person[] = [ann, ben];
  t.after(() => people.forEach((p) => p.connection.close()));
  await addXmppContact(ann.state, ann.connection, ben.state.jid);
  await settle(people);
  // A private group is not listed; a channel is.
  await createXmppGroup(ann.state, ann.connection, 'Ιδιωτική', [ben.state.jid]);
  const lounge = `lounge@${MUC}`;
  server.rooms.set(lounge, { jid: lounge, locked: false, membersOnly: false, nonAnonymous: false, mam: false, name: 'Σαλόνι Linux', affiliations: new Map(), occupants: new Map(), archive: [] });
  await settle(people);
  assert.deepEqual(
    (await serverChannels(ben.state, ben.connection)).map((c) => [c.jid, c.name, c.joined]),
    [[lounge, 'Σαλόνι Linux', false]],
  );
  const found = await searchChannels(ben.state, ben.connection, 'linux');
  assert.deepEqual(found.map((c) => [c.jid, c.name]), [[lounge, 'Σαλόνι Linux']]);
  assert.deepEqual(await searchChannels(ben.state, ben.connection, 'l'), []);
});

test('a preview goes beside words not encrypted only, and comes so', { skip: !coreReady }, async (t) => {
  const server = new Server();
  const ann = await person(server, 'ann');
  const ben = await person(server, 'ben');
  const people: Person[] = [ann, ben];
  t.after(() => people.forEach((p) => p.connection.close()));
  await addXmppContact(ann.state, ann.connection, ben.state.jid);
  await settle(people);
  await addXmppContact(ben.state, ben.connection, ann.state.jid);
  await settle(people);
  const preview = { url: 'https://example.org/a', title: 'Σελίδα', text: '' };
  await sendXmppText(ann.state, ann.connection, ben.state.jid, 'https://example.org/a', preview);
  await settle(people);
  // Encrypted: the preview stays here, as it would tell the servers what the link is.
  assert.ok(!server.seen.some((sent) => sent.includes('ogp.me')));
  assert.equal(ben.state.chats[ann.state.jid].messages.at(-1)?.preview, undefined);
  ann.state.chats[ben.state.jid].plain = true;
  await sendXmppText(ann.state, ann.connection, ben.state.jid, 'https://example.org/a', preview);
  await settle(people);
  assert.ok(server.seen.some((sent) => sent.includes('ogp.me')));
  assert.deepEqual(ben.state.chats[ann.state.jid].messages.at(-1)?.preview, preview);
});

test('a device that comes with another key keeps its first session and gets nothing until accepted; a new device is said once', { skip: !coreReady }, async (t) => {
  const server = new Server();
  const ann = await person(server, 'ann');
  const ben = await person(server, 'ben');
  const people: Person[] = [ann, ben];
  t.after(() => people.forEach((p) => p.connection.close()));
  const [toAnn, toBen] = [ann.state.jid, ben.state.jid];
  await addXmppContact(ann.state, ann.connection, toBen);
  await settle(people);
  await addXmppContact(ben.state, ben.connection, toAnn);
  await settle(people);
  await sendXmppText(ann.state, ann.connection, toBen, 'πρώτο');
  await settle(people);
  await sendXmppText(ben.state, ben.connection, toAnn, 'δεύτερο');
  await settle(people);
  const id = String(ben.state.omemo.device);
  const first = xmppDevices(ann.state, toBen).find((d) => d.id === id && d.identity)!;
  const kept = (d: { two?: true }) => (d.two ? ann.state.people2! : ann.state.people)[toBen].devices[id];
  const firstSession = JSON.stringify(kept(first).session);

  // Ben's device comes back under its ID with another identity key (as a server could make it):
  // what it writes still shows, but Ann's first key and session stay, and the chat says so.
  const fresh = await newOwnOmemo();
  ben.state.omemo = { ...fresh, device: Number(id) };
  ben.state.omemo2 = await newOwnOmemo2(fresh.identity);
  for (const known of [ben.state.people, ben.state.people2 ?? {}]) for (const person of Object.values(known)) for (const device of Object.values(person.devices)) delete device.session;
  await publishOmemo(ben.state, ben.connection);
  await sendXmppText(ben.state, ben.connection, toAnn, 'άλλο κλειδί');
  await settle(people);
  await sendXmppText(ben.state, ben.connection, toAnn, 'πάλι');
  await settle(people);
  const changedLine = `🔑 A device of ${toBen} changed its key: your messages do not go to it.`;
  const texts = () => ann.state.chats[toBen].messages.map((m) => m.text);
  assert.deepEqual(texts().slice(-4).sort(), ['δεύτερο', changedLine, 'άλλο κλειδί', 'πάλι'].sort());
  const now = xmppDevices(ann.state, toBen).find((d) => d.id === id && d.pending)!;
  assert.ok(now.changed);
  assert.equal(now.identity === first.identity, false);
  assert.equal(kept(now).identity, first.identity);
  assert.equal(JSON.stringify(kept(now).session), firstSession);

  // Nothing goes to it, and that is no reason to offer writing without encryption.
  const sent = server.seen.length;
  await assert.rejects(sendXmppText(ann.state, ann.connection, toBen, 'κρυφό'), (error: unknown) => error instanceof XmppError && !(error instanceof NoOmemoError) && /changed its key/.test(error.message));
  assert.equal(server.seen.slice(sent).filter((s) => s.includes('<message')).length, 0);

  // Accepted, it is written to under its new key.
  acceptXmppDevice(ann.state, toBen, id, !!now.two);
  await sendXmppText(ann.state, ann.connection, toBen, 'δεκτό');
  await settle(people);
  assert.equal(ben.state.chats[toAnn].messages.at(-1)?.text, 'δεκτό');
  assert.equal(xmppDevices(ann.state, toBen).find((d) => d.id === id && d.listed)?.pending, undefined);
  assert.equal(texts().filter((text) => text === changedLine).length, 1);

  // Ben signs in on a second device: it is written to, and Ann's chat says so once.
  const ben2 = await person(server, 'ben');
  people.push(ben2);
  await settle(people);
  await sendXmppText(ann.state, ann.connection, toBen, 'και στο νέο');
  await sendXmppText(ann.state, ann.connection, toBen, 'ξανά');
  await settle(people);
  // What came before it stays locked to it.
  assert.deepEqual(ben2.state.chats[toAnn]?.messages.slice(-2).map((m) => m.text), ['και στο νέο', 'ξανά']);
  assert.equal(texts().filter((text) => text === `🔑 New device of ${toBen}: your messages go to it too.`).length, 1);
});
