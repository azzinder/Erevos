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

import { setCurrentSpace } from '../lock/keys';
import { fromBase64, randomBytes, utf8Decode } from '../lib/crypto';
import { setCore, type Core } from '../lib/core';
import { inboxParts, showsIn, xmppInboxRows } from '../lib/inbox';
import { addXmppContact, isXmppId, markXmppRead, sendXmppText, signInXmpp, startSession, XmppConnection, XmppError, type XmppState } from '../lib/xmpp';
import { fingerprint, NoOmemoError } from '../lib/xmpp-omemo';
import { startSasl } from '../lib/xmpp-sasl';
import { onNetworkMessage, onNetworkRead } from '../lib/network-notices';
import { runXmpp, serverOf, setXmppConnect, stopXmpp, xmppNow, xmppRead, xmppSignIn, xmppUnread } from '../lib/xmpp-store';
import { child, el, find, parseXml, render, textOf, XmlStream, type StreamEvent, type XmlElement } from '../lib/xmpp-xml';
import { DOMAIN, PASSWORD, person, Server, settle } from './xmpp-server';

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

test('a wrong password is said so', { skip: !coreReady }, async () => {
  const server = new Server();
  await assert.rejects(signInXmpp(`ann@${DOMAIN}`, 'wrong', undefined, server.connect), (error: unknown) => error instanceof XmppError && error.condition === 'not-authorized');
});

test('two people write encrypted both ways, and a second device reads along', { skip: !coreReady }, async (t) => {
  const server = new Server();
  const ann = await person(server, 'ann');
  const ben = await person(server, 'ben');
  // Closed however it ends: a connection left open keeps the checks from ending.
  const people = [ann, ben];
  t.after(() => people.forEach((p) => p.connection.close()));
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
  people.push(ann2);
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
  // Ann reads it on her second device: her first has it read too.
  assert.equal(ann.state.chats[`ben@${DOMAIN}`].unread, 1);
  await markXmppRead(ann2.state, ann2.connection, `ben@${DOMAIN}`);
  await settle([ann, ben, ann2]);
  assert.equal(ann.state.chats[`ben@${DOMAIN}`].unread, 0);
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
});

async function until(done: () => boolean, what: string, ms = 5000): Promise<void> {
  const end = Date.now() + ms;
  while (!done()) {
    if (Date.now() > end) throw new Error(`Waited in vain for ${what}`);
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
}

test('signed in, the archive from before tells of nothing; a message that comes after does, and its reading', { skip: !coreReady }, async () => {
  const server = new Server();
  const ann = await person(server, 'ann');
  const ben = await person(server, 'ben');
  await addXmppContact(ann.state, ann.connection, `ben@${DOMAIN}`, 'Ben');
  await settle([ann, ben]);
  await addXmppContact(ben.state, ben.connection, `ann@${DOMAIN}`);
  await settle([ann, ben]);
  ben.connection.close();
  await sendXmppText(ann.state, ann.connection, `ben@${DOMAIN}`, 'πριν');
  await sendXmppText(ann.state, ann.connection, `ben@${DOMAIN}`, 'κι άλλο πριν');

  const came: [string, number][] = [];
  const read: string[][] = [];
  const stopCame = onNetworkMessage((where, times) => came.push([where, times]));
  const stopRead = onNetworkRead((where) => read.push(where));
  setXmppConnect(server.connect);
  setCurrentSpace(7, randomBytes(32));
  try {
    runXmpp();
    await until(() => xmppNow().loaded, 'the account to load');
    await xmppSignIn(`ben@${DOMAIN}`, PASSWORD);
    await until(() => xmppNow().online && xmppUnread() === 2, 'the archive');
    await new Promise((resolve) => setTimeout(resolve, 50));
    assert.deepEqual(came, []);

    await sendXmppText(ann.state, ann.connection, `ben@${DOMAIN}`, 'τώρα');
    await until(() => xmppUnread() === 3, 'the new message');
    assert.deepEqual(came, [[`xmpp:ann@${DOMAIN}`, 1]]);
    await xmppRead(`ann@${DOMAIN}`);
    assert.deepEqual(read, [[`xmpp:ann@${DOMAIN}`]]);
  } finally {
    stopCame();
    stopRead();
    stopXmpp();
    setXmppConnect(undefined);
    setCurrentSpace(null);
    ann.connection.close();
  }
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

test('the chats and the people who asked to add us are rows of the home list, on XMPP\'s part', () => {
  const state = {
    jid: `me@${DOMAIN}`,
    requests: [`new@${DOMAIN}`],
    roster: { [`ann@${DOMAIN}`]: { jid: `ann@${DOMAIN}`, name: 'Ann', subscription: 'both' } },
    chats: {
      [`ann@${DOMAIN}`]: {
        jid: `ann@${DOMAIN}`,
        unread: 2,
        lastAt: 200,
        messages: [
          { id: 'a', mine: false, text: 'hi', at: 100, encrypted: true },
          { id: 'b', mine: true, text: 'there', at: 200, encrypted: true, state: 'read' },
        ],
      },
      [`bob@${DOMAIN}`]: { jid: `bob@${DOMAIN}`, unread: 1, lastAt: 50, messages: [{ id: 'c', mine: false, text: 'x', at: 50, encrypted: true, locked: true }] },
      [`new@${DOMAIN}`]: { jid: `new@${DOMAIN}`, unread: 0, lastAt: 0, messages: [] },
    },
  } as unknown as XmppState;
  const rows = xmppInboxRows(state, 1000);
  const by = Object.fromEntries(rows.map((row) => [row.identity, row]));
  assert.equal(rows.length, 3);
  assert.deepEqual([by[`xmpp:ann@${DOMAIN}`].name, by[`xmpp:ann@${DOMAIN}`].last, by[`xmpp:ann@${DOMAIN}`].mine, by[`xmpp:ann@${DOMAIN}`].mark, by[`xmpp:ann@${DOMAIN}`].unread], ['Ann', 'there', true, 2, 2]);
  assert.deepEqual([by[`xmpp:bob@${DOMAIN}`].name, by[`xmpp:bob@${DOMAIN}`].last], ['bob', 'Locked message']);
  // The person who asked to add us is one row, at the top until answered, and is not a chat.
  assert.deepEqual([by[`xmpp:new@${DOMAIN}`].invited, by[`xmpp:new@${DOMAIN}`].at, by[`xmpp:new@${DOMAIN}`].unread], [true, 1000, 1]);
  for (const row of rows) assert.deepEqual([showsIn(row, 'xmpp'), showsIn(row, 'erevos'), showsIn(row, 'matrix'), showsIn(row, 'sms'), showsIn(row, 'all')], [true, false, false, false, true]);
  assert.deepEqual(inboxParts([], false, true), ['xmpp']);
  assert.deepEqual(inboxParts(rows, false), ['xmpp']);
  assert.deepEqual(inboxParts([], true, true), ['matrix', 'xmpp']);
});
