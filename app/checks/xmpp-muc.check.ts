// Group chats on XMPP (lib/xmpp-muc.ts, docs/xmpp.md) against the small server of
// checks/xmpp-server.ts, with the real core built to WebAssembly for OMEMO: a private group made,
// set up members only and not anonymous, its people invited and joining, everyone writing with
// OMEMO to every member's devices and reading each other, the server keeping only ciphertext; a
// second device of the account joining by the bookmarks and reading along; what came while one
// was away read from the group's archive, once; a member without OMEMO; a channel, written as it
// is, whose history counts as read and that tells only of what names you; groups joined and left
// in another app of the account; invitations only from contacts; photos in a private group; its
// owner renaming it, setting its subject, making admins and taking people out or barring them.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { after, before, test } from 'node:test';

import { setCore, type Core } from '../lib/core';
import { xmppInboxRows } from '../lib/inbox';
import { addXmppContact, prepareXmppFile, sendXmppFile, sendXmppText, startSession, XmppConnection, type XmppState } from '../lib/xmpp';
import { downloadXmppFile, setXmppHttp, uploadXmppFile } from '../lib/xmpp-files';
import { createXmppGroup, declineXmppInvite, groupPeople, joinXmppGroup, leaveXmppGroup, mentions, removeFromXmppGroup, renameXmppGroup, setXmppGroupAdmin, setXmppGroupSubject } from '../lib/xmpp-muc';
import { el } from '../lib/xmpp-xml';
import { DOMAIN, MUC, person, Server, settle, type Room } from './xmpp-server';

const built = new URL('./.core/erevos_ffi.js', import.meta.url);
const coreReady = existsSync(built) && typeof (createRequire(import.meta.url)(built.pathname) as Record<string, unknown>).xmpp === 'function';

before(() => {
  if (!coreReady) return;
  const wasm = createRequire(import.meta.url)(built.pathname) as Record<string, (...args: never[]) => unknown>;
  setCore(Object.fromEntries(Object.entries(wasm).map(([name, fn]) => [name, async (...args: never[]) => fn(...args)])) as unknown as Core);
});
after(() => setCore(null));

type Person = { state: XmppState; connection: XmppConnection };

/** Each adds the other, as people do before inviting each other. */
async function befriend(people: Person[], a: Person, b: Person): Promise<void> {
  await addXmppContact(a.state, a.connection, b.state.jid);
  await settle(people);
  await addXmppContact(b.state, b.connection, a.state.jid);
  await settle(people);
}

const last = (p: Person, room: string) => p.state.chats[room]?.messages.at(-1);

test('a name is told of only as a word of its own', () => {
  assert.ok(mentions('ann: look at this', 'ann'));
  assert.ok(mentions('Look, Ann!', 'ann'));
  assert.ok(mentions('για την Άννα;', 'άννα'));
  assert.ok(!mentions('annual report', 'ann'));
  assert.ok(!mentions('joanna', 'ann'));
  assert.ok(!mentions('a', 'a'));
});

test('a private group is made, joined and written to with OMEMO by all, a second device reading along', { skip: !coreReady }, async (t) => {
  const server = new Server();
  const ann = await person(server, 'ann');
  const ben = await person(server, 'ben');
  const cat = await person(server, 'cat');
  const people: Person[] = [ann, ben, cat];
  t.after(() => people.forEach((p) => p.connection.close()));
  await befriend(people, ann, ben);
  await befriend(people, ann, cat);

  const room = await createXmppGroup(ann.state, ann.connection, 'Friends', [ben.state.jid, cat.state.jid]);
  await settle(people);
  assert.ok(room.endsWith(`@${MUC}`));
  // Set up as Conversations' private groups are: members only, everyone's address seen by everyone, kept, archived.
  const made = server.rooms.get(room) as Room;
  assert.deepEqual([made.locked, made.membersOnly, made.nonAnonymous, made.mam, made.name], [false, true, true, true, 'Friends']);
  assert.deepEqual([...made.affiliations].sort(), [
    [`ann@${DOMAIN}`, 'owner'],
    [`ben@${DOMAIN}`, 'member'],
    [`cat@${DOMAIN}`, 'member'],
  ]);
  const own = ann.state.chats[room].room!;
  assert.deepEqual([own.joined, own.private, own.admin, own.name], [true, true, true, 'Friends']);
  assert.ok(server.bookmarks.get(`ann@${DOMAIN}`)?.has(room));

  // Ben and Cat are invited: a row each at the top of their lists, until they answer.
  for (const p of [ben, cat]) {
    assert.deepEqual(
      p.state.invites?.map((i) => [i.room, i.from]),
      [[room, `ann@${DOMAIN}`]],
    );
    const row = xmppInboxRows(p.state).find((r) => r.identity === `xmpp:${room}`);
    assert.equal(row?.invited, true);
  }
  for (const p of [ben, cat]) {
    await joinXmppGroup(p.state, p.connection, room);
    await settle(people);
  }
  for (const p of [ben, cat]) {
    const joined = p.state.chats[room].room!;
    assert.deepEqual([joined.joined, joined.private, joined.name, p.state.invites], [true, true, 'Friends', []]);
  }
  assert.deepEqual(groupPeople(ben.state, ben.state.chats[room].room!), [`ann@${DOMAIN}`, `cat@${DOMAIN}`]);

  // Ann writes: everyone reads it, by her name there; the server sees only ciphertext.
  await sendXmppText(ann.state, ann.connection, room, 'Γεια σε όλους');
  await settle(people);
  assert.ok(server.seen.every((s) => !s.includes('Γεια')));
  for (const p of [ben, cat]) {
    assert.deepEqual([last(p, room)?.text, last(p, room)?.by, last(p, room)?.mine, last(p, room)?.encrypted], ['Γεια σε όλους', 'ann', false, true]);
    assert.equal(p.state.chats[room].unread, 1);
  }
  // Back from the room once it has it: sent, and not twice.
  assert.equal(ann.state.chats[room].messages.length, 1);
  assert.equal(last(ann, room)?.state, 'sent');
  await sendXmppText(ben.state, ben.connection, room, 'Hi from Ben');
  await settle(people);
  assert.deepEqual([last(ann, room)?.text, last(ann, room)?.by], ['Hi from Ben', 'ben']);
  assert.deepEqual([last(cat, room)?.text, last(cat, room)?.by], ['Hi from Ben', 'ben']);
  assert.equal(ben.state.chats[room].unread, 0);

  // Ann's second device finds the group in her bookmarks and joins it.
  const ann2 = await person(server, 'ann');
  people.push(ann2);
  await settle(people);
  assert.equal(ann2.state.chats[room]?.room?.joined, true);
  assert.equal(ann2.state.chats[room]?.room?.name, 'Friends');
  // What was written before it was there was not for its keys: locked, and counted as read.
  assert.deepEqual(
    ann2.state.chats[room].messages.map((m) => [m.by, m.mine, m.locked]),
    [
      ['ann', true, true],
      ['ben', false, true],
    ],
  );
  assert.equal(ann2.state.chats[room].unread, 0);
  await sendXmppText(cat.state, cat.connection, room, 'Cat here');
  await settle(people);
  assert.deepEqual([last(ann2, room)?.text, last(ann2, room)?.by, last(ann2, room)?.locked], ['Cat here', 'cat', undefined]);
  await sendXmppText(ann2.state, ann2.connection, room, 'From my phone');
  await settle(people);
  // Ann's first device reads it as her own; the others as hers.
  assert.deepEqual([last(ann, room)?.text, last(ann, room)?.mine], ['From my phone', true]);
  assert.deepEqual([last(ben, room)?.text, last(ben, room)?.by, last(ben, room)?.mine], ['From my phone', 'ann', false]);

  // Ben is away while two come: on his return the group's archive gives them, once.
  ben.connection.close();
  await sendXmppText(ann.state, ann.connection, room, 'one');
  await sendXmppText(cat.state, cat.connection, room, 'two');
  await settle(people.filter((p) => p !== ben));
  const before = ben.state.chats[room].messages.length;
  const unread = ben.state.chats[room].unread;
  ben.connection = await XmppConnection.open(ben.state, server.connect);
  await startSession(ben.state, ben.connection);
  await settle(people);
  assert.deepEqual(
    ben.state.chats[room].messages.slice(before).map((m) => m.text),
    ['one', 'two'],
  );
  assert.equal(ben.state.chats[room].unread, unread + 2);
  assert.equal(ben.state.chats[room].room?.joined, true);
  ben.connection.close();
  ben.connection = await XmppConnection.open(ben.state, server.connect);
  await startSession(ben.state, ben.connection);
  await settle(people);
  assert.equal(ben.state.chats[room].messages.length, before + 2);
});

test('a member without OMEMO cannot read, the others still do; a group shows who wrote and what not read', { skip: !coreReady }, async (t) => {
  const server = new Server();
  const ann = await person(server, 'ann');
  const ben = await person(server, 'ben');
  server.noOmemo.add(`dan@${DOMAIN}`);
  const dan = await person(server, 'dan');
  const people: Person[] = [ann, ben, dan];
  t.after(() => people.forEach((p) => p.connection.close()));
  await befriend(people, ann, ben);
  await befriend(people, ann, dan);
  const room = await createXmppGroup(ann.state, ann.connection, '', [ben.state.jid, dan.state.jid]);
  await settle(people);
  await joinXmppGroup(ben.state, ben.connection, room);
  await joinXmppGroup(dan.state, dan.connection, room);
  await settle(people);
  // A group with no name of its own is called by its address.
  assert.equal(xmppInboxRows(ann.state).find((r) => r.identity === `xmpp:${room}`)?.name, room.slice(0, room.indexOf('@')));
  await sendXmppText(ann.state, ann.connection, room, 'secret plans');
  await settle(people);
  assert.equal(last(ben, room)?.text, 'secret plans');
  assert.equal(last(dan, room)?.locked, true);
  assert.ok(server.seen.every((s) => !s.includes('secret plans')));
  const row = xmppInboxRows(ben.state).find((r) => r.identity === `xmpp:${room}`);
  assert.deepEqual([row?.unread, row?.network], [1, 'xmpp']);
});

test('a channel is written as it is: its history counts as read, and it tells only of what names you', { skip: !coreReady }, async (t) => {
  const server = new Server();
  const ann = await person(server, 'ann');
  const ben = await person(server, 'ben');
  const ann2 = await person(server, 'ann');
  const people: Person[] = [ann, ben, ann2];
  t.after(() => people.forEach((p) => p.connection.close()));
  const lounge = `lounge@${MUC}`;
  const old = (n: number) => ({ id: server.id(), at: Date.now() - 60_000, message: el('message', { from: `${lounge}/old${n}`, type: 'groupchat', xmlns: 'jabber:client' }, el('body', {}, `old ${n}`)) });
  server.rooms.set(lounge, { jid: lounge, locked: false, membersOnly: false, nonAnonymous: false, mam: false, name: 'Lounge', affiliations: new Map(), occupants: new Map(), archive: [old(1), old(2), old(3)] });

  await joinXmppGroup(ann.state, ann.connection, lounge);
  await settle(people);
  const chat = ann.state.chats[lounge];
  assert.deepEqual([chat.room?.joined, chat.room?.private, chat.room?.name], [true, false, 'Lounge']);
  assert.deepEqual(
    chat.messages.map((m) => [m.text, m.by, m.encrypted]),
    [
      ['old 1', 'old1', false],
      ['old 2', 'old2', false],
      ['old 3', 'old3', false],
    ],
  );
  assert.equal(chat.unread, 0);
  // Joined in Ann's other app too, by her bookmarks.
  assert.equal(ann2.state.chats[lounge]?.room?.joined, true);

  await joinXmppGroup(ben.state, ben.connection, lounge);
  await settle(people);
  await sendXmppText(ben.state, ben.connection, lounge, 'hi all');
  await settle(people);
  assert.ok(server.seen.some((s) => s.includes('hi all')));
  assert.deepEqual([last(ann, lounge)?.text, last(ann, lounge)?.encrypted, ann.state.chats[lounge].unread], ['hi all', false, 0]);
  await sendXmppText(ben.state, ben.connection, lounge, 'Ann, are you there?');
  await settle(people);
  assert.equal(ann.state.chats[lounge].unread, 1);

  // Leaving takes it out of the bookmarks: Ann's other app leaves too.
  await leaveXmppGroup(ann.state, ann.connection, lounge);
  await settle(people);
  assert.equal(ann.state.chats[lounge], undefined);
  assert.equal(ann2.state.chats[lounge], undefined);
  assert.ok(!server.bookmarks.get(`ann@${DOMAIN}`)?.has(lounge));
  assert.deepEqual([...(server.rooms.get(lounge)?.occupants.values() ?? [])], ['ben']);
});

test('invitations come only from contacts, and one said no to goes', { skip: !coreReady }, async (t) => {
  const server = new Server();
  const ann = await person(server, 'ann');
  const ben = await person(server, 'ben');
  const eve = await person(server, 'eve');
  const people: Person[] = [ann, ben, eve];
  t.after(() => people.forEach((p) => p.connection.close()));
  await befriend(people, ann, ben);
  // A stranger's invitation, straight (XEP-0249), is not shown.
  await eve.connection.send(el('message', { to: ann.state.jid, id: 'x1' }, el('x', { xmlns: 'jabber:x:conference', jid: `spam@${MUC}` })));
  await settle(people);
  assert.deepEqual(ann.state.invites ?? [], []);
  // A contact's, straight, is.
  await ben.connection.send(el('message', { to: ann.state.jid, id: 'x2' }, el('x', { xmlns: 'jabber:x:conference', jid: `party@${MUC}`, reason: 'Come!' })));
  await settle(people);
  assert.deepEqual(
    ann.state.invites?.map((i) => [i.room, i.from, i.reason]),
    [[`party@${MUC}`, `ben@${DOMAIN}`, 'Come!']],
  );
  await declineXmppInvite(ann.state, ann.connection, `party@${MUC}`);
  assert.deepEqual(ann.state.invites, []);
  // A group that is not there is said so.
  await assert.rejects(joinXmppGroup(ann.state, ann.connection, `nothing@${MUC}`), /no group at this address/);
});

test('photos go to a private group encrypted, and every member opens them', { skip: !coreReady }, async (t) => {
  const server = new Server();
  server.upload = { most: 1024 * 1024 };
  setXmppHttp(server.http);
  const ann = await person(server, 'ann');
  const ben = await person(server, 'ben');
  const people: Person[] = [ann, ben];
  t.after(() => {
    setXmppHttp(null);
    people.forEach((p) => p.connection.close());
  });
  await befriend(people, ann, ben);
  const room = await createXmppGroup(ann.state, ann.connection, 'Photos', [ben.state.jid]);
  await settle(people);
  await joinXmppGroup(ben.state, ben.connection, room);
  await settle(people);
  const photo = new Uint8Array(3000).map((_, i) => (i * 7) % 256);
  const ready = await prepareXmppFile(ann.state, ann.connection, room);
  assert.equal(ready.encrypt, true);
  const file = await uploadXmppFile(ann.connection, ready.service, { bytes: photo, name: 'beach.jpg', type: 'image/jpeg' }, ready.encrypt);
  await sendXmppFile(ann.state, ann.connection, room, file);
  await settle(people);
  const came = last(ben, room);
  // Put under a random name, its ending kept, so it shows as a photo.
  assert.deepEqual([came?.file?.type, came?.by, came?.text], ['image/jpeg', 'ann', '']);
  assert.deepEqual(await downloadXmppFile(came!.file!), photo);
  assert.ok(server.seen.every((s) => !s.includes('aesgcm')));
});

test('the owner of a private group renames it, sets its subject, makes admins and takes people out; members may not', { skip: !coreReady }, async (t) => {
  const server = new Server();
  const ann = await person(server, 'ann');
  const ben = await person(server, 'ben');
  const cat = await person(server, 'cat');
  const people: Person[] = [ann, ben, cat];
  t.after(() => people.forEach((p) => p.connection.close()));
  await befriend(people, ann, ben);
  await befriend(people, ann, cat);
  const room = await createXmppGroup(ann.state, ann.connection, 'Friends', [ben.state.jid, cat.state.jid]);
  await settle(people);
  for (const p of [ben, cat]) {
    await joinXmppGroup(p.state, p.connection, room);
    await settle(people);
  }
  const made = server.rooms.get(room) as Room;
  const own = ann.state.chats[room].room!;
  assert.equal(own.owner, true);
  assert.equal(ben.state.chats[room].room!.admin, undefined);
  // A member may do none of it.
  await assert.rejects(setXmppGroupSubject(ben.state, ben.connection, room, 'mine'));
  await assert.rejects(removeFromXmppGroup(ben.state, ben.connection, room, { address: cat.state.jid }));
  await assert.rejects(renameXmppGroup(ben.state, ben.connection, room, 'Mine'));
  // The owner renames it, and sets the subject.
  await renameXmppGroup(ann.state, ann.connection, room, '  Old friends ');
  assert.equal(made.name, 'Old friends');
  assert.equal(own.name, 'Old friends');
  await assert.rejects(renameXmppGroup(ann.state, ann.connection, room, '   '));
  await setXmppGroupSubject(ann.state, ann.connection, room, 'Saturday at nine');
  assert.equal(own.subject, 'Saturday at nine');
  await setXmppGroupSubject(ann.state, ann.connection, room, '');
  assert.equal(own.subject, undefined);
  // Ben becomes an admin, and Ann may not be taken out by anyone; Ann cannot take herself out here.
  await setXmppGroupAdmin(ann.state, ann.connection, room, ben.state.jid, true);
  assert.equal(made.affiliations.get(ben.state.jid), 'admin');
  assert.deepEqual(own.admins, [ben.state.jid]);
  await assert.rejects(removeFromXmppGroup(ann.state, ann.connection, room, { address: ann.state.jid }));
  await assert.rejects(setXmppGroupAdmin(ann.state, ann.connection, room, `zed@${DOMAIN}`, true));
  // Cat is taken out of the members: the group's messages no longer go to her. Then barred.
  await removeFromXmppGroup(ann.state, ann.connection, room, { address: cat.state.jid });
  assert.equal(made.affiliations.has(cat.state.jid), false);
  assert.deepEqual(groupPeople(ann.state, own), [ben.state.jid]);
  await removeFromXmppGroup(ann.state, ann.connection, room, { address: ben.state.jid }, true);
  assert.equal(made.affiliations.get(ben.state.jid), 'outcast');
  assert.deepEqual(own.admins, []);
});
