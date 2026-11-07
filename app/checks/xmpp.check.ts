// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// XMPP accounts (lib/xmpp.ts) against a small XMPP server played here, with the real core built to
// WebAssembly for OMEMO (crates/erevos-xmpp): the stream's XML read in pieces cut anywhere; SCRAM
// as RFC 5802 and RFC 7677 write it; two people sign in, add each other, and write both ways
// encrypted, the server keeping only ciphertext; a second device of one of them reads what both
// write, and its own other device's messages, as carbons; what came while one was away comes from
// the archive, once; receipts and read marks; someone without OMEMO gets nothing unless the chat
// chooses to write without it; OMEMO 2 to the apps that have it (as Kaidan), OMEMO 0.3 to those
// that have only that (as Conversations), and an SCE envelope that names someone else is not read; photos and files both ways, through the server's upload service,
// encrypted (aesgcm:// links) or as they are (out of band). The account survives being kept as JSON
// between steps.
// lib/xmpp.ts was also run against a real Prosody 0.12 (docs/xmpp.md).
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { after, before, test } from 'node:test';

import { setCurrentSpace } from '../lock/keys';
import { markRestore } from '../lock/restored';
import { fromBase64, randomBytes, utf8Decode, utf8Encode } from '../lib/crypto';
import { setCore, type Core } from '../lib/core';
import { inboxParts, showsIn, xmppInboxRows } from '../lib/inbox';
import { addXmppContact, isXmppId, markXmppRead, prepareXmppFile, sendXmppFile, sendXmppText, signInXmpp, startSession, XmppConnection, XmppError, xmppDevices, type XmppState } from '../lib/xmpp';
import { downloadXmppFile, fileOfText, setXmppHttp, textOfFile, uploadXmppFile } from '../lib/xmpp-files';
import { fingerprint, NoOmemoError } from '../lib/xmpp-omemo';
import { envelope, openEnvelope } from '../lib/xmpp-omemo2';
import { startSasl } from '../lib/xmpp-sasl';
import { onNetworkMessage, onNetworkRead } from '../lib/network-notices';
import { runXmpp, serverOf, setXmppConnect, stopXmpp, xmppNow, xmppRead, xmppSend, xmppSignIn, xmppUnread } from '../lib/xmpp-store';
import { child, el, find, parseXml, render, textOf, XmlStream, type StreamEvent, type XmlElement } from '../lib/xmpp-xml';
import { DOMAIN, PASSWORD, person, Server, settle, UPLOAD } from './xmpp-server';

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
  // Ann's first device wrote to her second as it came: the chat says so.
  assert.deepEqual(ann.state.chats[`ben@${DOMAIN}`].messages.map((m) => [m.text, m.mine]), [
    ['Γεια σου Ben', true],
    [`🔑 New device of ann@${DOMAIN}: your messages go to it too.`, false],
    ['Γεια σου Ann', false],
  ]);
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

test('restored from a backup, the account goes on as a new device of itself, its chats and its key kept', { skip: !coreReady }, async () => {
  const server = new Server();
  const ann = await person(server, 'ann');
  // Contacts, so Ann's app is told of Ben's devices as they change.
  const ben = await person(server, 'ben');
  await addXmppContact(ann.state, ann.connection, `ben@${DOMAIN}`, 'Ben');
  await settle([ann, ben]);
  await addXmppContact(ben.state, ben.connection, `ann@${DOMAIN}`);
  await settle([ann, ben]);
  ben.connection.close();
  setXmppConnect(server.connect);
  setCurrentSpace(7, randomBytes(32));
  const listed = (node: string) => [...(server.pep.get(`ben@${DOMAIN} ${node}`)?.children ?? [])].flatMap((d) => (typeof d === 'string' ? [] : [Number(d.attrs.id)]));
  try {
    runXmpp();
    await until(() => xmppNow().loaded, 'the account to load');
    await xmppSignIn(`ben@${DOMAIN}`, PASSWORD);
    await until(() => xmppNow().online && !!xmppNow().state?.omemo2?.live, 'the account online, its keys out');
    await sendXmppText(ann.state, ann.connection, `ben@${DOMAIN}`, 'πριν');
    await until(() => xmppNow().state?.chats[`ann@${DOMAIN}`]?.messages.length === 1, 'the first message');
    const before = xmppNow().state!;
    const old = before.omemo.device;
    const identity = before.omemo.identity.public;
    const resource = before.resource;
    assert.ok(listed('eu.siacs.conversations.axolotl.devicelist').includes(old));

    // A backup of it restored here (lock/backup.ts): the same account loads again, marked so.
    stopXmpp();
    // Once kept as it is now (half a second after its last change).
    await new Promise((resolve) => setTimeout(resolve, 700));
    await markRestore();
    runXmpp();
    await until(() => xmppNow().online && !!xmppNow().state?.omemo2?.live && xmppNow().state?.omemo.gone === undefined, 'the account online again, as a new device');
    const after = xmppNow().state!;
    assert.notEqual(after.omemo.device, old);
    assert.equal(after.omemo.identity.public, identity);
    assert.notEqual(after.resource, resource);
    assert.deepEqual(after.chats[`ann@${DOMAIN}`].messages.map((m) => m.text), ['πριν']);
    // Off the account's lists, the old device; on them, the new one.
    for (const node of ['eu.siacs.conversations.axolotl.devicelist', 'urn:xmpp:omemo:2:devices']) {
      assert.ok(!listed(node).includes(old) && listed(node).includes(after.omemo.device), node);
    }

    // And both ways it goes on, with new conversations.
    await settle([ann]);
    await sendXmppText(ann.state, ann.connection, `ben@${DOMAIN}`, 'μετά');
    await until(() => xmppNow().state?.chats[`ann@${DOMAIN}`]?.messages.length === 2, 'a message after the restore');
    assert.equal(xmppNow().state!.chats[`ann@${DOMAIN}`].messages[1].text, 'μετά');
    await xmppSend(`ann@${DOMAIN}`, 'απάντηση');
    await settle([ann]);
    // Restored, Ben goes on as a new device of his, which Ann's chat says once.
    assert.deepEqual(ann.state.chats[`ben@${DOMAIN}`].messages.map((m) => m.text), ['πριν', 'μετά', `🔑 New device of ben@${DOMAIN}: your messages go to it too.`, 'απάντηση']);

    // Loaded again with no new restore, it stays the device it became.
    const device = xmppNow().state!.omemo.device;
    stopXmpp();
    await new Promise((resolve) => setTimeout(resolve, 700));
    runXmpp();
    await until(() => xmppNow().loaded && !!xmppNow().state, 'the account again');
    assert.equal(xmppNow().state!.omemo.device, device);
  } finally {
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

test('two who began a session with the same pre-key, before the new bundle was out, are both read', { skip: !coreReady }, async (t) => {
  const server = new Server();
  // Each bundle is given with one pre-key only, so all who write to Ann (OMEMO 2) and to Fay (only
  // OMEMO 0.3) take the same, as two may when both fetch a bundle before its new one is out.
  server.onePreKey.add(`ann@${DOMAIN}`);
  server.onePreKey.add(`fay@${DOMAIN}`);
  for (const user of ['dee', 'eve', 'fay']) server.onlyOmemo1.add(`${user}@${DOMAIN}`);
  const people = await Promise.all(['ann', 'ben', 'cid', 'dee', 'eve', 'fay'].map((user) => person(server, user)));
  const [ann, ben, cid, dee, eve, fay] = people;
  t.after(() => people.forEach((p) => p.connection.close()));
  await settle(people);
  const words = (who: typeof ann, jid: string) => who.state.chats[jid]?.messages.map((m) => m.text);

  await sendXmppText(ben.state, ben.connection, `ann@${DOMAIN}`, 'από τον Ben');
  await sendXmppText(cid.state, cid.connection, `ann@${DOMAIN}`, 'από τον Cid');
  await sendXmppText(dee.state, dee.connection, `fay@${DOMAIN}`, 'από τη Dee');
  await sendXmppText(eve.state, eve.connection, `fay@${DOMAIN}`, 'από την Eve');
  await settle(people);
  assert.deepEqual(words(ann, `ben@${DOMAIN}`), ['από τον Ben']);
  assert.deepEqual(words(ann, `cid@${DOMAIN}`), ['από τον Cid']);
  assert.deepEqual(words(fay, `dee@${DOMAIN}`), ['από τη Dee']);
  assert.deepEqual(words(fay, `eve@${DOMAIN}`), ['από την Eve']);
  // The pre-key went off the bundle once, kept a while for the second.
  assert.equal(ann.state.omemo2?.used?.length, 1);
  assert.equal(fay.state.omemo.used?.length, 1);
  assert.equal(ann.state.omemo2?.preKeys.length, 100);

  // And the sessions go on, both ways.
  await sendXmppText(cid.state, cid.connection, `ann@${DOMAIN}`, 'πάλι από τον Cid');
  await settle(people);
  await sendXmppText(ann.state, ann.connection, `cid@${DOMAIN}`, 'προς τον Cid');
  await sendXmppText(eve.state, eve.connection, `fay@${DOMAIN}`, 'πάλι από την Eve');
  await settle(people);
  assert.deepEqual(words(ann, `cid@${DOMAIN}`), ['από τον Cid', 'πάλι από τον Cid', 'προς τον Cid']);
  assert.deepEqual(words(cid, `ann@${DOMAIN}`), ['από τον Cid', 'πάλι από τον Cid', 'προς τον Cid']);
  assert.deepEqual(words(fay, `eve@${DOMAIN}`), ['από την Eve', 'πάλι από την Eve']);
});

test('OMEMO 2 goes to the apps that have it, OMEMO 0.3 to those that have only that', { skip: !coreReady }, async (t) => {
  const server = new Server();
  // Kai's app has only OMEMO 2, as Kaidan; Cid's only OMEMO 0.3, as Conversations; Ann's (Erevos) both.
  server.onlyOmemo2.add(`kai@${DOMAIN}`);
  server.onlyOmemo1.add(`cid@${DOMAIN}`);
  const ann = await person(server, 'ann');
  const ann2 = await person(server, 'ann');
  const kai = await person(server, 'kai');
  const cid = await person(server, 'cid');
  const people = [ann, ann2, kai, cid];
  t.after(() => people.forEach((p) => p.connection.close()));
  await settle(people);
  assert.ok(ann.state.omemo2?.live && kai.state.omemo2?.live);
  assert.ok(!cid.state.omemo2?.live);
  const last = () => server.seen[server.seen.length - 1];
  // Without the lines that say a device is new (Ann's second came after the list with her first).
  const words = (who: typeof ann, jid: string) => who.state.chats[jid]?.messages.filter((m) => !m.call).map((m) => [m.text, m.mine]);

  await sendXmppText(ann.state, ann.connection, `kai@${DOMAIN}`, 'προς το Kaidan');
  assert.ok(last().includes("xmlns='urn:xmpp:omemo:2'") && !last().includes('eu.siacs.conversations.axolotl'));
  await settle(people);
  await sendXmppText(kai.state, kai.connection, `ann@${DOMAIN}`, 'από το Kaidan');
  await settle(people);
  assert.deepEqual(words(kai, `ann@${DOMAIN}`), [['προς το Kaidan', false], ['από το Kaidan', true]]);
  assert.deepEqual(words(ann, `kai@${DOMAIN}`), [['προς το Kaidan', true], ['από το Kaidan', false]]);
  // Ann's other device reads both, in OMEMO 2 as well.
  assert.deepEqual(words(ann2, `kai@${DOMAIN}`), [['προς το Kaidan', true], ['από το Kaidan', false]]);
  // Kai's key as Kaidan shows it: the Ed25519 one of OMEMO 2.
  const kais = xmppDevices(ann.state, `kai@${DOMAIN}`).filter((d) => d.listed);
  assert.deepEqual(kais.map((d) => [d.two, d.identity]), [[true, kai.state.omemo2!.ik]]);

  await sendXmppText(ann.state, ann.connection, `cid@${DOMAIN}`, 'προς το Conversations');
  // Both in one message: OMEMO 0.3 for Cid's device, OMEMO 2 for Ann's other one.
  assert.ok(last().includes("xmlns='eu.siacs.conversations.axolotl'") && !last().includes(`<keys jid='cid@${DOMAIN}'>`));
  await settle(people);
  await sendXmppText(cid.state, cid.connection, `ann@${DOMAIN}`, 'από το Conversations');
  // Cid writes OMEMO 0.3 to Ann's devices, whose OMEMO 2 Cid's app does not have.
  assert.ok(!last().includes('urn:xmpp:omemo:2'));
  await settle(people);
  assert.deepEqual(words(cid, `ann@${DOMAIN}`), [['προς το Conversations', false], ['από το Conversations', true]]);
  assert.deepEqual(words(ann, `cid@${DOMAIN}`), [['προς το Conversations', true], ['από το Conversations', false]]);
  assert.deepEqual(words(ann2, `cid@${DOMAIN}`), [['προς το Conversations', true], ['από το Conversations', false]]);
  assert.ok(server.seen.every((s) => !s.includes('Kaidan') && !s.includes('Conversations')));
});

test("an OMEMO 2 envelope is read only when it says who wrote it and to whom as the message does", () => {
  const sealed = envelope('γεια <σου> & καλώς', `kai@${DOMAIN}`, `ann@${DOMAIN}`);
  assert.equal(openEnvelope(sealed, `kai@${DOMAIN}`, `ann@${DOMAIN}`), 'γεια <σου> & καλώς');
  // Passed on by someone else, or into another chat: not read.
  assert.equal(openEnvelope(sealed, `eve@${DOMAIN}`, `ann@${DOMAIN}`), null);
  assert.equal(openEnvelope(sealed, `kai@${DOMAIN}`, `group@muc.${DOMAIN}`), null);
  // As QXmpp writes one, with its padding and time.
  const qxmpp =
    "<envelope xmlns='urn:xmpp:sce:1'><time stamp='2026-10-28T20:00:00Z'/><to jid='ann@example.org'/><from jid='kai@example.org'/><rpad>AAAA</rpad><content><body xmlns='jabber:client'>Hi</body></content></envelope>";
  assert.equal(openEnvelope(qxmpp, 'kai@example.org', 'ann@example.org'), 'Hi');
  // A mark or a state with no words: nothing to show.
  assert.equal(openEnvelope("<envelope xmlns='urn:xmpp:sce:1'><content><active xmlns='http://jabber.org/protocol/chatstates'/></content></envelope>", 'kai@example.org', 'ann@example.org'), '');
  assert.equal(openEnvelope('not xml', 'kai@example.org', 'ann@example.org'), null);
});

test('a file is read from a message only as the apps that share files write it', () => {
  const key = 'ab'.repeat(12) + 'cd'.repeat(32);
  assert.deepEqual(fileOfText(`aesgcm://files.example.org/x/a%20b.jpg#${key.toUpperCase()}`), {
    url: 'https://files.example.org/x/a%20b.jpg',
    fragment: key,
    name: 'a b.jpg',
    type: 'image/jpeg',
  });
  // Some apps write a 16-byte IV.
  assert.equal(fileOfText(`aesgcm://f.example.org/y.pdf#${'01'.repeat(16)}${'02'.repeat(32)}`)?.type, 'application/pdf');
  assert.equal(fileOfText(`aesgcm://f.example.org/y.pdf#${'01'.repeat(10)}`), null);
  assert.equal(fileOfText(`look: aesgcm://f.example.org/y.pdf#${key}`), null);
  // A link alone is text, unless the message names it out of band too.
  assert.equal(fileOfText('https://example.org/cat.png'), null);
  assert.equal(fileOfText('https://example.org/cat.png', 'https://example.org/other.png'), null);
  assert.deepEqual(fileOfText('https://example.org/cat.png', 'https://example.org/cat.png'), { url: 'https://example.org/cat.png', name: 'cat.png', type: 'image/png' });
  assert.equal(fileOfText('http://example.org/cat.png', 'http://example.org/cat.png'), null);
  const file = { url: 'https://f.example.org/z.ogg', fragment: key, name: 'z.ogg', type: 'audio/ogg' };
  assert.deepEqual(fileOfText(textOfFile(file)), file);
});

test('photos and files go both ways, encrypted with the chat, or as they are when it is not', { skip: !coreReady }, async (t) => {
  const server = new Server();
  server.upload = { most: 1024 * 1024 };
  const puts: string[][] = [];
  setXmppHttp(async (method, url, headers, body) => {
    if (method === 'PUT') puts.push(Object.keys(headers));
    return server.http(method, url, headers, body);
  });
  const ann = await person(server, 'ann');
  const ben = await person(server, 'ben');
  const people = [ann, ben];
  t.after(() => {
    setXmppHttp(null);
    people.forEach((p) => p.connection.close());
  });
  await addXmppContact(ann.state, ann.connection, `ben@${DOMAIN}`, 'Ben');
  await settle([ann, ben]);
  await addXmppContact(ben.state, ben.connection, `ann@${DOMAIN}`);
  await settle([ann, ben]);

  // The upload service is an item of the domain; found once, it is kept.
  const ready = await prepareXmppFile(ann.state, ann.connection, `ben@${DOMAIN}`);
  assert.deepEqual([ready.encrypt, ready.service.jid, ready.service.most], [true, UPLOAD, 1024 * 1024]);
  assert.equal(ann.state.upload?.jid, UPLOAD);

  const photo = randomBytes(5000);
  const file = await uploadXmppFile(ann.connection, ready.service, { bytes: photo, name: 'beach.jpg', type: 'image/jpeg' }, ready.encrypt);
  assert.match(file.fragment ?? '', /^[0-9a-f]{88}$/);
  // The server keeps what it cannot read, by a name that says nothing but the ending; only the
  // headers the place allows went with it.
  const kept = server.files.get(file.url);
  assert.equal(kept?.length, photo.length + 16);
  assert.ok(!file.url.includes('beach') && file.url.endsWith('.jpg'));
  assert.deepEqual(puts, [['Content-Type', 'Authorization']]);
  const sent = await sendXmppFile(ann.state, ann.connection, `ben@${DOMAIN}`, file);
  assert.deepEqual([sent.text, sent.file?.name, sent.encrypted], ['', 'beach.jpg', true]);
  await settle([ann, ben]);
  const came = ben.state.chats[`ann@${DOMAIN}`].messages.at(-1);
  assert.deepEqual([came?.text, came?.encrypted, came?.file?.type, came?.file?.fragment], ['', true, 'image/jpeg', file.fragment]);
  assert.deepEqual(await downloadXmppFile(came!.file!), photo);
  // Its key never went past the server unencrypted.
  assert.ok(server.seen.every((s) => !s.includes(file.fragment!) && !s.includes('aesgcm')));
  assert.equal(xmppInboxRows(ben.state).find((row) => row.identity === `xmpp:ann@${DOMAIN}`)?.last, 'Photo');
  // Changed on the server, it is not opened.
  kept![10] ^= 1;
  await assert.rejects(downloadXmppFile(came!.file!), /could not be opened/);
  // Larger than the server takes, it is not sent.
  await assert.rejects(uploadXmppFile(ann.connection, ready.service, { bytes: new Uint8Array(1024 * 1024 + 1), name: 'big.bin', type: 'application/octet-stream' }, false), /Files up to 1 MB/);

  // A chat written without encryption sends the file as it is, its link out of band too, as every app reads it.
  ben.state.chats[`ann@${DOMAIN}`].plain = true;
  const plainReady = await prepareXmppFile(ben.state, ben.connection, `ann@${DOMAIN}`);
  assert.equal(plainReady.encrypt, false);
  const notes = utf8Encode('the notes');
  const plainFile = await uploadXmppFile(ben.connection, plainReady.service, { bytes: notes, name: 'my notes.txt', type: 'text/plain' }, false);
  assert.equal(plainFile.fragment, undefined);
  assert.deepEqual(server.files.get(plainFile.url), notes);
  await sendXmppFile(ben.state, ben.connection, `ann@${DOMAIN}`, plainFile);
  assert.ok(server.seen.some((s) => s.includes('jabber:x:oob') && s.includes(plainFile.url)));
  await settle([ann, ben]);
  const plainCame = ann.state.chats[`ben@${DOMAIN}`].messages.at(-1);
  assert.deepEqual([plainCame?.text, plainCame?.encrypted, plainCame?.file?.name, plainCame?.file?.type], ['', false, 'my_notes.txt', 'text/plain']);
  assert.deepEqual(await downloadXmppFile(plainCame!.file!), notes);
  assert.equal(xmppInboxRows(ann.state).find((row) => row.identity === `xmpp:ben@${DOMAIN}`)?.last, 'File: my_notes.txt');

  // A server with no upload service says so before anything is encrypted or sent.
  server.upload = null;
  delete ann.state.upload;
  await assert.rejects(prepareXmppFile(ann.state, ann.connection, `ben@${DOMAIN}`), /takes no files/);
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
  assert.deepEqual(inboxParts([], { xmpp: true }), ['xmpp']);
  assert.deepEqual(inboxParts(rows), ['xmpp']);
  assert.deepEqual(inboxParts([], { matrix: true, xmpp: true }), ['matrix', 'xmpp']);
});
