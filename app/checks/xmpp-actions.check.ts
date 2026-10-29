// What can be done with a message in an XMPP chat (lib/xmpp-actions.ts, lib/xmpp.ts), against the
// small server of checks/xmpp-server.ts with the real core built to WebAssembly for OMEMO: an
// answer, a change of words, reactions and a taking back, one-to-one with OMEMO (the server never
// seeing the words, a second device of the writer following) and in a channel, where they name a
// message by the room's id; only the writer may change or take back a message; the quote other
// apps put before an answer is left out; whether someone writes shows a while, and is never sent.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { after, before, test } from 'node:test';

import { setCore, type Core } from '../lib/core';
import { addXmppContact, changeXmppText, onXmppTyping, reactXmpp, replyXmppText, retractXmpp, sendXmppText, xmppTyping, type XmppConnection, type XmppState } from '../lib/xmpp';
import { NS_FALLBACK, NS_REPLY, reactionsShown, react, replyParts, retract, targetOf, toggled, withoutQuote, wroteIt } from '../lib/xmpp-actions';
import { joinXmppGroup } from '../lib/xmpp-muc';
import { el } from '../lib/xmpp-xml';
import { DOMAIN, MUC, person, Server, settle } from './xmpp-server';

const built = new URL('./.core/erevos_ffi.js', import.meta.url);
const coreReady = existsSync(built) && typeof (createRequire(import.meta.url)(built.pathname) as Record<string, unknown>).xmpp === 'function';

before(() => {
  if (!coreReady) return;
  const wasm = createRequire(import.meta.url)(built.pathname) as Record<string, (...args: never[]) => unknown>;
  setCore(Object.fromEntries(Object.entries(wasm).map(([name, fn]) => [name, async (...args: never[]) => fn(...args)])) as unknown as Core);
});
after(() => setCore(null));

type Person = { state: XmppState; connection: XmppConnection };

test('the quote before an answer is left out, by the part the fallback names or by its > lines', () => {
  const { quote, elements } = replyParts('ben@example.org', 'm1', 'Γεια σου\nδεύτερη\nτρίτη\nτέταρτη');
  assert.equal(quote, '> Γεια σου\n> δεύτερη\n> τρίτη\n');
  const stanza = el('message', {}, ...elements);
  assert.equal(withoutQuote(stanza, `${quote}ναι`), 'ναι');
  // A fallback that names no part that fits: the > lines go.
  const loose = el('message', {}, el('fallback', { xmlns: NS_FALLBACK, for: NS_REPLY }));
  assert.equal(withoutQuote(loose, '> what\n> was said\nmy answer'), 'my answer');
  // Only > lines, or no fallback at all: the words stay as they are.
  assert.equal(withoutQuote(loose, '> only a quote'), '> only a quote');
  assert.equal(withoutQuote(el('message', {}, el('reply', { xmlns: NS_REPLY, id: 'x' })), '> quoted\nwords'), '> quoted\nwords');
});

test('only the writer changes or takes back a message; reactions replace what the same person chose', () => {
  const theirs = { id: 'a', mine: false, text: 'hi', by: 'ben', sid: 's1' };
  assert.equal(wroteIt(theirs, { mine: false }, false), true);
  assert.equal(wroteIt(theirs, { mine: true }, false), false);
  assert.equal(wroteIt(theirs, { mine: false, nick: 'ben' }, true), true);
  assert.equal(wroteIt(theirs, { mine: false, nick: 'eve' }, true), false);
  // By their address when the room says it, whatever name they took.
  assert.equal(wroteIt({ ...theirs, who: 'ben@x' }, { mine: false, who: 'eve@x', nick: 'ben' }, true), false);
  assert.equal(targetOf([theirs], 's1', true), theirs);
  assert.equal(targetOf([theirs], 's1', false), undefined);

  const message: { id: string; mine: boolean; text: string; reacted?: Record<string, string[]> } = { id: 'b', mine: true, text: 'x' };
  assert.equal(react(message, 'ben', ['👍', '❤️']), true);
  assert.equal(react(message, 'ann', ['👍']), true);
  assert.deepEqual(reactionsShown(message), { '👍': ['ben', 'ann'], '❤️': ['ben'] });
  assert.equal(react(message, 'ben', []), true);
  assert.deepEqual(reactionsShown(message), { '👍': ['ann'] });
  assert.deepEqual(toggled(['👍'], '👍'), []);
  assert.deepEqual(toggled(['👍'], '😂'), ['👍', '😂']);
  const gone = { id: 'c', mine: true, text: 'secret', replyTo: 'b', edited: 1, reacted: { ben: ['👍'] } };
  assert.equal(retract(gone), true);
  assert.deepEqual(gone, { id: 'c', mine: true, text: '', deleted: true });
});

test('one-to-one with OMEMO: answer, change, react and take back, the server never seeing the words', { skip: !coreReady }, async (t) => {
  const server = new Server();
  const ann = await person(server, 'ann');
  const ben = await person(server, 'ben');
  const people: Person[] = [ann, ben];
  t.after(() => people.forEach((p) => p.connection.close()));
  await addXmppContact(ann.state, ann.connection, `ben@${DOMAIN}`);
  await settle(people);
  await addXmppContact(ben.state, ben.connection, `ann@${DOMAIN}`);
  const ann2 = await person(server, 'ann');
  people.push(ann2);
  await settle(people);
  const toBen = `ben@${DOMAIN}`;
  const toAnn = `ann@${DOMAIN}`;

  const first = await sendXmppText(ann.state, ann.connection, toBen, 'Πάμε σινεμά;');
  await settle(people);
  const benFirst = ben.state.chats[toAnn].messages[0];
  assert.equal(benFirst.id, first.id);

  // Ben answers: Ann sees what it answers, without the quote; the words went encrypted.
  await replyXmppText(ben.state, ben.connection, toAnn, 'Ναι, στις εννιά', first.id);
  await settle(people);
  const answer = ann.state.chats[toBen].messages.at(-1)!;
  assert.deepEqual([answer.text, answer.replyTo], ['Ναι, στις εννιά', first.id]);
  assert.deepEqual([ann2.state.chats[toBen].messages.at(-1)?.text, ann2.state.chats[toBen].messages.at(-1)?.replyTo], ['Ναι, στις εννιά', first.id]);
  assert.equal(ben.state.chats[toAnn].messages.at(-1)?.replyTo, first.id);

  // Ann changes her first words: Ben and her other device see the new ones, marked; nothing new comes.
  const unread = ben.state.chats[toAnn].unread;
  await changeXmppText(ann.state, ann.connection, toBen, first.id, 'Πάμε θέατρο;');
  await settle(people);
  for (const [who, peer] of [[ben, toAnn], [ann2, toBen], [ann, toBen]] as const) {
    const changed = who.state.chats[peer].messages.find((m) => m.id === first.id)!;
    assert.deepEqual([changed.text, !!changed.edited], ['Πάμε θέατρο;', true]);
    assert.equal(who.state.chats[peer].messages.length, 2);
  }
  assert.equal(ben.state.chats[toAnn].unread, unread);
  // Ben cannot change Ann's words.
  await assert.rejects(changeXmppText(ben.state, ben.connection, toAnn, first.id, 'hacked'));

  // Ben reacts, and takes it back; Ann reacts twice.
  await reactXmpp(ben.state, ben.connection, toAnn, first.id, '👍');
  await reactXmpp(ann.state, ann.connection, toBen, answer.id, '❤️');
  await settle(people);
  assert.deepEqual(ann.state.chats[toBen].messages.find((m) => m.id === first.id)?.reacted, { [toBen]: ['👍'] });
  assert.deepEqual(ben.state.chats[toAnn].messages.find((m) => m.id === answer.id)?.reacted, { [toAnn]: ['❤️'] });
  assert.deepEqual(ann2.state.chats[toBen].messages.find((m) => m.id === answer.id)?.reacted, { [toAnn]: ['❤️'] });
  await reactXmpp(ben.state, ben.connection, toAnn, first.id, '👍');
  await settle(people);
  assert.equal(ann.state.chats[toBen].messages.find((m) => m.id === first.id)?.reacted, undefined);

  // Ben tries to take back Ann's message, by hand: nothing happens. Ann takes it back: it is gone everywhere.
  await ben.connection.send(el('message', { to: toAnn, type: 'chat', id: 'x1' }, el('retract', { xmlns: 'urn:xmpp:message-retract:1', id: first.id })));
  await settle(people);
  assert.equal(ann.state.chats[toBen].messages.find((m) => m.id === first.id)?.deleted, undefined);
  await retractXmpp(ann.state, ann.connection, toBen, first.id);
  await settle(people);
  for (const [who, peer] of [[ben, toAnn], [ann2, toBen], [ann, toBen]] as const) {
    const gone = who.state.chats[peer].messages.find((m) => m.id === first.id)!;
    assert.deepEqual([gone.deleted, gone.text], [true, '']);
  }
  // The server saw none of the words, only which message each was about.
  assert.ok(server.seen.every((s) => !s.includes('σινεμά') && !s.includes('θέατρο') && !s.includes('εννιά')));
});

test('whether they write shows a while, and Erevos says nothing of its own writing', { skip: !coreReady }, async (t) => {
  const server = new Server();
  const ann = await person(server, 'ann');
  const ben = await person(server, 'ben');
  const people: Person[] = [ann, ben];
  t.after(() => people.forEach((p) => p.connection.close()));
  let told = 0;
  const off = onXmppTyping(() => (told += 1));
  t.after(off);
  await ben.connection.send(el('message', { to: `ann@${DOMAIN}`, type: 'chat', id: 'c1' }, el('composing', { xmlns: 'http://jabber.org/protocol/chatstates' })));
  await settle(people);
  assert.equal(xmppTyping(`ben@${DOMAIN}`), true);
  assert.ok(told > 0);
  assert.equal(xmppTyping(`ben@${DOMAIN}`, Date.now() + 60_000), false);
  await ben.connection.send(el('message', { to: `ann@${DOMAIN}`, type: 'chat', id: 'c2' }, el('paused', { xmlns: 'http://jabber.org/protocol/chatstates' })));
  await settle(people);
  assert.equal(xmppTyping(`ben@${DOMAIN}`), false);
  // Nothing Ann sends says she writes.
  const before = server.seen.length;
  await sendXmppText(ann.state, ann.connection, `ben@${DOMAIN}`, 'x');
  assert.ok(server.seen.length > before && server.seen.slice(before).every((s) => !s.includes('chatstates')));
});

test('in a channel, reactions, answers and takings back name a message by the room\'s id', { skip: !coreReady }, async (t) => {
  const server = new Server();
  const ann = await person(server, 'ann');
  const ben = await person(server, 'ben');
  const people: Person[] = [ann, ben];
  t.after(() => people.forEach((p) => p.connection.close()));
  const lounge = `lounge@${MUC}`;
  server.rooms.set(lounge, { jid: lounge, locked: false, membersOnly: false, nonAnonymous: false, mam: false, name: 'Lounge', affiliations: new Map(), occupants: new Map(), archive: [] });
  await joinXmppGroup(ann.state, ann.connection, lounge);
  await joinXmppGroup(ben.state, ben.connection, lounge);
  await settle(people);

  const hello = await sendXmppText(ann.state, ann.connection, lounge, 'hello');
  // Before the room passes it back it has no id there: it cannot be answered yet.
  await assert.rejects(reactXmpp(ann.state, ann.connection, lounge, hello.id, '👍'));
  await settle(people);
  const sid = ann.state.chats[lounge].messages.find((m) => m.id === hello.id)?.sid;
  assert.ok(sid);
  const benHello = ben.state.chats[lounge].messages.find((m) => m.text === 'hello')!;
  assert.equal(benHello.sid, sid);

  await reactXmpp(ben.state, ben.connection, lounge, benHello.id, '🎉');
  await replyXmppText(ben.state, ben.connection, lounge, 'hi Ann', benHello.id);
  await settle(people);
  const annHello = ann.state.chats[lounge].messages.find((m) => m.id === hello.id)!;
  assert.deepEqual(reactionsShown(annHello), { '🎉': ['/ben'] });
  const answer = ann.state.chats[lounge].messages.at(-1)!;
  assert.deepEqual([answer.text, answer.replyTo, answer.by], ['hi Ann', hello.id, 'ben']);

  // Ben cannot change Ann's words; Ann changes and takes back her own.
  await ben.connection.send(el('message', { to: lounge, type: 'groupchat', id: 'x2' }, el('body', {}, 'hacked'), el('replace', { xmlns: 'urn:xmpp:message-correct:0', id: hello.id })));
  await settle(people);
  assert.equal(ann.state.chats[lounge].messages.find((m) => m.id === hello.id)?.text, 'hello');
  await changeXmppText(ann.state, ann.connection, lounge, hello.id, 'hello all');
  await settle(people);
  assert.equal(ben.state.chats[lounge].messages.find((m) => m.sid === sid)?.text, 'hello all');
  await retractXmpp(ann.state, ann.connection, lounge, hello.id);
  await settle(people);
  assert.equal(ben.state.chats[lounge].messages.find((m) => m.sid === sid)?.deleted, true);
  assert.equal(ann.state.chats[lounge].messages.find((m) => m.id === hello.id)?.deleted, true);
});
