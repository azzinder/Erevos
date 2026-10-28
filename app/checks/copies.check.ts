// What a chat writes to the endpoints of a contact's account (lib/e2e.ts, lib/endpoints.ts,
// docs/multi-device.md), with the real core and the packets handed over by hand, without a relay: a
// list that names someone else's account has it read nothing, and one that names an account the
// chat knows is written nothing; each contact seals for each endpoint with a key of its own; hidden
// chats write to them as a space's chat that never linked a device, a chat moved into them or out
// says nothing of devices, and they keep their copies apart from the space's; the copies wait for
// what went to the account, go only once it went, not for ever, and no contact keeps the others'
// out; they are sealed only as they go, each endpoint's in that order, so what never went moves no
// conversation on; what waits to go again goes to the endpoints once; a voice message is copied
// whole; an endpoint whose queue is gone, or that moved; the first message of a way says when the
// queue it names was made, as each copy does; what a copy says of a message that goes to an
// endpoint only for what came from it or what was read, and what each tells the relay it
// carries; each message taken once, for as long as another copy of it may come; ways started again,
// as their account starts anew and a day after an endpoint never answered; when the account's list
// is given, by which list went and not by the clock; and what contacts say of the list they hold
// counting only on a phone a backup was put back on. Through a relay, with a phone and its devices:
// checks/devices.check.ts, and what each send tells the relay: checks/push-marks.check.ts.
// Skipped, with a note, when the core is not built.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { mock, test } from 'node:test';

import { acceptConversation, accountBundle, accountIdentity, conversationPeer, newAccount, open as openIn, seal as sealIn, startConversation } from '../lib/core';
import { decryptText, fromBase64, randomBytes, toBase64, toHex, utf8Decode, utf8Encode } from '../lib/crypto';
import { signList } from '../lib/device-list';
import { E2E, fromBase64Url, PENDING_LASTS, toBase64Url } from '../lib/e2e';
import { entryKey, isSealedPacket, openPacket, packetKeys } from '../lib/sealed-packet';
import { TooLargeForLoraError } from '../lib/nearby';
import { cameBefore, isNews, keepReceived } from '../lib/receiver';
import { RelayError, RelayUnreachableError } from '../lib/relay';
import { MAX_PARTS, PART_SIZE, splitVoice, VoiceAssembler } from '../lib/voice';
import { loadE2EData, MAX_TOOK, TOOK_DAY, TOOK_LASTS, tookDay, WAY_AGAIN, type Route } from '../lock/e2e-data';
import { COPIES_LAST, FILE as FANOUT_FILE, MAX_COPIES, MAX_COPIES_EACH, loadFanoutData, saveFanoutData } from '../lock/fanout-data';
import { History, newTag } from '../lock/history';
import { markRestore } from '../lock/restored';
import type { Holder } from '../lock/sealed-file';
import { files } from './files-memory';
import { store as secureStore } from './secure-memory';
import { useWasmCore } from './wasm-core';

const ready = useWasmCore() !== null;
if (!ready) console.log('Skipping the copies checks: build the core first with node checks/build-core.mjs');

const t = (name: string, fn: () => Promise<void>) =>
  test(name, { skip: !ready }, async () => {
    files.clear();
    try {
      await fn();
    } finally {
      mock.restoreAll();
    }
  });

const RELAY = 'wss://relay.example.org';
const where = { relay: RELAY, relayKey: '' };
const DAY = 24 * 60 * 60_000;
const sender = () => toHex(randomBytes(24));
const said = (plaintext: Uint8Array) => JSON.parse(utf8Decode(plaintext)) as Record<string, unknown>;

// A chat, the space's or hidden chats, with its relay sender id, and what it is kept under.
type Chat = { e2e: E2E; id: string; sender: string; space: number; key: Uint8Array; holder: Holder };
let spaces = 0;
async function chat(holder: Holder = 'space'): Promise<Chat> {
  const space = spaces++;
  const key = randomBytes(32);
  const e2e = await E2E.open(holder, space, key);
  return { e2e, id: e2e.identityHex(), sender: sender(), space, key, holder };
}

// What a list can name: an endpoint, or an account, with where it reads.
type Named = { id: string; b: string; route: Route };
const named = (c: Chat): Named => ({ id: c.id, b: toBase64Url(c.e2e.bundle), route: { s: c.sender, relay: RELAY, rk: '' } });

// An endpoint as a linked device has one: an account of its own.
async function endpoint(): Promise<Named & { secret: Uint8Array }> {
  const secret = await newAccount();
  return { secret, id: toHex(await accountIdentity(secret)), b: toBase64Url(await accountBundle(secret)), route: { s: sender(), relay: RELAY, rk: '' } };
}

// `a` adds `b`, who takes the first packet and accepts.
async function meet(a: Chat, b: Chat): Promise<void> {
  await a.e2e.addContact({ senderHex: b.sender, key: toBase64Url(b.e2e.bundle), relayUrl: RELAY }, a.sender, where);
  const first = a.e2e.pending().find((p) => p.identity === b.id)!;
  assert.equal((await b.e2e.receive(first.first)).kind, 'message');
  await a.e2e.firstSent(b.id);
  await b.e2e.acceptRequest(a.id);
}

// What `owner` is still to give `to` of its account, in a message of its own, as its phone gives
// it: what `to` keeps of `owner` then.
async function giveKeys(owner: Chat, to: Chat) {
  assert.ok(owner.e2e.keysDue().includes(to.id));
  const sealed = await owner.e2e.seal(to.id, '', owner.sender, { at: where, keys: true });
  await owner.e2e.keysGiven(to.id);
  assert.equal((await to.e2e.receive(sealed.packet)).kind, 'message');
  return to.e2e.record(owner.id)!;
}

// `owner` signs a list that names `d`, with where each reads (`r`), and keeps it.
async function keepList(owner: Chat, n: number, d: Named[], r: Record<string, Route> = Object.fromEntries(d.map((e) => [e.id, e.route]))) {
  const list = await signList((context, message) => owner.e2e.sign(context, message), { a: owner.id, n, d: d.map((e) => ({ i: e.id, b: e.b, f: 1 })) });
  await owner.e2e.keepList({ b: list.b, s: list.s, n, real: [], r });
}

// `owner` signs a list naming `d` and gives it to `to`.
async function giveList(owner: Chat, to: Chat, n: number, d: Named[]) {
  await keepList(owner, n, d);
  return giveKeys(owner, to);
}

// Carol and Mallory, who gave her a list naming `count` endpoints.
async function withEndpoints(count = 2) {
  const [carol, mallory] = [await chat(), await chat()];
  const ends = [];
  for (let i = 0; i < count; i++) ends.push(await endpoint());
  await meet(carol, mallory);
  await giveList(mallory, carol, 10, ends);
  return { carol, mallory, ends };
}

// Carol seals a message for Mallory, and it went to her account: its copies wait for the relay.
async function write(carol: Chat, to: string, text: string, extra = {}) {
  const sealed = await carol.e2e.seal(to, text, carol.sender, { at: where, ...extra });
  await carol.e2e.copiesGo(sealed.copies);
  return sealed;
}

// An endpoint as it reads the copies for it, in the order they go, from where it left off (`open`:
// what each says, or null for one it could not open), and writes back in that conversation (`write`).
function reader(x: { id: string; secret: Uint8Array; route: Route }) {
  let conversation: Uint8Array | null = null;
  const open = async (copies: { w: string; p: string; first?: true }[]) => {
    const opened: (Record<string, unknown> | null)[] = [];
    for (const c of copies.filter((c) => c.w === x.id)) {
      try {
        const o = c.first ? await acceptConversation(x.secret, fromBase64(c.p)) : conversation && (await openIn(conversation, fromBase64(c.p)));
        if (!o) throw new Error('no conversation yet');
        conversation = o.conversation;
        opened.push(said(o.plaintext));
      } catch {
        opened.push(null);
      }
    }
    return opened;
  };
  const write = async (text: string, tag: string, more: Record<string, unknown> = {}) => {
    const written = await sealIn(conversation!, utf8Encode(JSON.stringify({ from: x.route.s, text, tag, dv: 0, ...more })));
    conversation = written.conversation;
    return written.packet;
  };
  return { open, write };
}
const textOf = (m: Record<string, unknown> | null) => (m ? String(m.text ?? '') : 'refused');

t('a list that names someone else\'s account has it read nothing, as an account or as hidden chats, and one that names an account the chat knows is written nothing', async () => {
  const [carol, mallory, dave, olga, bob] = [await chat(), await chat(), await chat(), await chat(), await chat()];
  const [carolHidden, bobHidden] = [await chat('hidden'), await chat('hidden')];
  const x = await endpoint();
  await meet(carol, mallory);
  await meet(carol, dave);
  // Olga knows Carol by her hidden chats' identity, from where Carol moved her chat into the space's.
  await meet(carolHidden, olga);
  await carol.e2e.putIn({ ...carolHidden.e2e.record(olga.id)!, ownIdentity: carolHidden.id });

  // Mallory's list names Carol's own account, Dave's, the one Olga knows Carol by, and an endpoint:
  // only the endpoint is one of hers to Carol.
  let kept = await giveList(mallory, carol, 10, [named(carol), named(dave), named(carolHidden), x]);
  assert.equal(kept.list?.n, 10);
  assert.deepEqual(kept.endpoints!.map((w) => w.id), [x.id]);

  // A later one names Bob's account and his hidden chats', which Carol does not know: written to
  // as Mallory's endpoints, in conversations that say whose endpoints they are meant for (`to`).
  kept = await giveList(mallory, carol, 20, [named(bob), named(bobHidden), x]);
  assert.deepEqual(kept.endpoints!.map((w) => w.id).sort(), [bob.id, bobHidden.id, x.id].sort());
  await write(carol, mallory.id, 'meant for Mallory only');
  const copies = carol.e2e.copies();
  const to = (id: string) => copies.filter((c) => c.w === id).map((c) => fromBase64(c.p));
  assert.equal(copies.length, 6);
  // Bob's account and his hidden chats take neither the conversation nor what follows in it, and
  // no request is made of it.
  for (const them of [bob, bobHidden]) {
    for (const packet of to(them.id)) assert.equal((await them.e2e.receive(packet)).kind, 'refused');
    assert.deepEqual([them.e2e.contacts().length, them.e2e.pending().length], [0, 0]);
  }
  // Nor one whose `to` is no identity at all.
  const odd = await startConversation(x.secret, bob.e2e.bundle, utf8Encode(JSON.stringify({ from: sender(), text: '', to: 'nobody' })));
  assert.equal((await bob.e2e.receive(odd.packet)).kind, 'refused');
  assert.equal(bob.e2e.contacts().length, 0);
  // Mallory's endpoint takes it, and reads whose it is meant for.
  const [first, copy] = to(x.id);
  const atX = await acceptConversation(x.secret, first);
  assert.deepEqual([said(atX.plaintext).to, said(atX.plaintext).acct], [mallory.id, undefined]);
  assert.equal(said((await openIn(atX.conversation, copy)).plaintext).text, 'meant for Mallory only');
});

t('each contact is given a key of its own to seal with for each endpoint, drawn from the one the phone keeps, so none opens what another seals for it, nor tells its conversations apart', async () => {
  const [bob, carol, dave] = [await chat(), await chat(), await chat()];
  const ends = [await endpoint(), await endpoint()];
  for (const c of [carol, dave]) await meet(c, bob);
  // Bob's list, with the key kept for each entry: a device's, or a random one for a place that fills it.
  const kept = Object.fromEntries(ends.map((e) => [e.id, { ...e.route, pk: toBase64Url(randomBytes(32)) }]));
  await keepList(bob, 10, ends, kept);
  const ways = new Map<string, Record<string, string>>();
  for (const c of [carol, dave]) ways.set(c.id, Object.fromEntries((await giveKeys(bob, c)).endpoints!.map((w) => [w.id, w.sealTo])));
  // Each contact's is drawn from the kept one and their identity, the same each time it is given;
  // none is the kept one, nor another contact's.
  for (const e of ends) {
    const [atCarol, atDave] = [ways.get(carol.id)![e.id], ways.get(dave.id)![e.id]];
    assert.equal(atCarol, toBase64Url(entryKey(fromBase64Url(kept[e.id].pk), carol.id)));
    assert.equal(atDave, toBase64Url(entryKey(fromBase64Url(kept[e.id].pk), dave.id)));
    assert.ok(atCarol !== atDave && atCarol !== kept[e.id].pk && atDave !== kept[e.id].pk);
  }
  // Carol writes three times and Dave twice: their copies, as the relay holds them, each sealed.
  const copiesOf = async (c: Chat, n: number) => {
    for (let i = 0; i < n; i++) await write(c, bob.id, `m${i}`);
    const out = c.e2e.copies().filter((x) => !x.first);
    await c.e2e.copiesSent(c.e2e.copies());
    return out;
  };
  const fromCarol = await copiesOf(carol, 3);
  const fromDave = await copiesOf(dave, 2);
  assert.deepEqual([fromCarol.length, fromDave.length], [6, 4]);
  assert.ok([...fromCarol, ...fromDave].every((x) => isSealedPacket(fromBase64(x.p))));
  // With what Carol was given, a relay she works with opens none of Dave's, so it cannot read their
  // ratchet keys to tell his conversation from hers; each endpoint opens both, each with its own.
  const opens = (key: string, x: { p: string }) => openPacket(packetKeys(fromBase64Url(key)), fromBase64(x.p)) !== null;
  assert.equal(fromDave.filter((x) => opens(ways.get(carol.id)![x.w], x)).length, 0);
  assert.equal(fromCarol.filter((x) => opens(ways.get(dave.id)![x.w], x)).length, 0);
  assert.ok(fromCarol.every((x) => opens(toBase64Url(entryKey(fromBase64Url(kept[x.w].pk), carol.id)), x)));
  assert.ok(fromDave.every((x) => opens(toBase64Url(entryKey(fromBase64Url(kept[x.w].pk), dave.id)), x)));
});

t('a chat made in hidden chats says of devices what a space\'s chat that never linked one says, takes a contact\'s list and writes to its endpoints; one moved into them or out of them says nothing of devices, and starts no way from an identity its contact does not know it by', async () => {
  const [bob, plain, space] = [await chat(), await chat(), await chat()];
  const hidden = await chat('hidden');
  const ends = [await endpoint(), await endpoint()];
  await keepList(bob, 10, ends);
  // Hidden chats and a space's chat that never linked a device each add Bob: he keeps the same of
  // both, each saying it holds none of his lists, and each giving him its newer prekeys.
  await meet(hidden, bob);
  await meet(plain, bob);
  const seen = (c: Chat) => {
    const r = bob.e2e.record(c.id)!;
    return [r.dv, r.list, r.endpoints?.length, r.conversations.length];
  };
  assert.deepEqual(seen(hidden), seen(plain));
  assert.equal(seen(hidden)[0], 0);
  for (const c of [hidden, plain]) {
    assert.deepEqual(c.e2e.keysDue(), [bob.id]);
    const given = await c.e2e.seal(bob.id, '', c.sender, { at: where, keys: true });
    await c.e2e.keysGiven(bob.id);
    assert.equal((await bob.e2e.receive(given.packet)).kind, 'message');
    assert.deepEqual(c.e2e.keysDue(), []);
  }
  assert.deepEqual(seen(hidden), seen(plain));
  assert.equal(bob.e2e.record(hidden.id)!.renew !== undefined, bob.e2e.record(plain.id)!.renew !== undefined);
  // Bob gives both his list; each writes to his endpoints alike, and says it holds that list.
  for (const c of [hidden, plain]) assert.equal((await giveKeys(bob, c)).endpoints?.length, 2);
  for (const c of [hidden, plain]) {
    await bob.e2e.receive((await write(c, bob.id, `from ${c.holder}`)).packet);
    const opened = await reader(ends[0]).open(c.e2e.copies());
    assert.deepEqual(opened.map((m) => [m?.to, m?.acct, m?.dv, textOf(m)]), [[bob.id, undefined, 10, ''], [undefined, undefined, 10, `from ${c.holder}`]]);
    const [first] = c.e2e.copies().filter((x) => x.w === ends[0].id && x.first);
    assert.equal(toHex(await conversationPeer((await acceptConversation(ends[0].secret, fromBase64(first.p))).conversation)), c.id);
    await c.e2e.copiesSent(c.e2e.copies());
  }
  assert.deepEqual(seen(hidden), seen(plain));
  assert.equal(seen(hidden)[0], 10);
  assert.equal(hidden.e2e.signedList(), null);

  // The chat moves out of hidden chats into the space's, telling Bob first, as the space's chat
  // will say it to him: nothing of devices. He lets go of all he held of its devices, and its copy
  // goes to his endpoints, though nothing new starts with them.
  const bye = await hidden.e2e.seal(bob.id, '', hidden.sender, { at: where, leaving: true });
  assert.equal((await bob.e2e.receive(bye.packet)).kind, 'message');
  assert.deepEqual(seen(hidden).slice(0, 3), [undefined, undefined, undefined]);
  await hidden.e2e.copiesGo(bye.copies);
  assert.deepEqual(hidden.e2e.copies().map((x) => [x.w, !!x.first]).sort(), ends.map((e) => [e.id, false]).sort());
  await space.e2e.putIn({ ...hidden.e2e.record(bob.id)!, ownIdentity: hidden.id });
  await hidden.e2e.takeOut(bob.id);
  // There it says nothing of devices, takes nothing of his, and so starts no way to his endpoints,
  // which would show them the space's identity: Bob is given no reason to give it his list. What
  // the chat screen then tells him of where to write (app/chat.tsx moveToSpace) copies nothing.
  const inSpace = space.e2e.record(bob.id)!;
  assert.deepEqual([inSpace.dv, inSpace.list, inSpace.endpoints], [undefined, undefined, undefined]);
  const whereNow = await space.e2e.seal(bob.id, '', space.sender, { at: where });
  assert.equal(whereNow.copies, 0);
  assert.equal((await bob.e2e.receive(whereNow.packet)).kind, 'message');
  const there = await write(space, bob.id, 'from the space');
  assert.equal((await bob.e2e.receive(there.packet)).kind, 'message');
  assert.deepEqual([seen(hidden)[0], bob.e2e.keysDue(), space.e2e.copies()], [undefined, [], []]);
  await space.e2e.receive((await write(bob, hidden.id, 'still you')).packet);
  assert.deepEqual([space.e2e.record(bob.id)!.dv, space.e2e.record(bob.id)!.endpoints], [undefined, undefined]);
  await bob.e2e.receive((await write(space, bob.id, 'yes')).packet);
  assert.deepEqual([seen(hidden)[0], space.e2e.copies()], [undefined, []]);

  // The other way: the space's chat with Bob moves into hidden chats, which say nothing of devices
  // to one who knows them by the space's identity.
  const pocket = await chat('hidden');
  const leaving = await plain.e2e.seal(bob.id, '', plain.sender, { at: where, leaving: true });
  await bob.e2e.receive(leaving.packet);
  await pocket.e2e.putIn({ ...plain.e2e.record(bob.id)!, ownIdentity: plain.id });
  await plain.e2e.takeOut(bob.id);
  // Where to write from now on, said from hidden chats (app/chat.tsx moveToHidden): no copies.
  const whereHidden = await pocket.e2e.seal(bob.id, '', pocket.sender, { at: where });
  assert.equal(whereHidden.copies, 0);
  assert.equal((await bob.e2e.receive(whereHidden.packet)).kind, 'message');
  await bob.e2e.receive((await write(pocket, bob.id, 'from hidden chats')).packet);
  assert.deepEqual([seen(plain)[0], bob.e2e.keysDue(), pocket.e2e.copies(), pocket.e2e.keysDue()], [undefined, [], [], []]);
});

t('hidden chats keep the copies that wait for the relay apart from the space\'s, in the one file the space\'s chat writes as it opens, so that the file is there tells nothing of them', async () => {
  const [index, key, hiddenKey] = [spaces++, randomBytes(32), randomBytes(32)];
  // A space's chat that copies nothing has the file written as it opens, as every one of this version.
  let space = await E2E.open('space', index, key);
  assert.ok(files.has(FANOUT_FILE));
  const hidden: Chat = { e2e: await E2E.open('hidden', index, hiddenKey), id: '', sender: sender(), space: index, key: hiddenKey, holder: 'hidden' };
  hidden.id = hidden.e2e.identityHex();
  const bob = await chat();
  const ends = [await endpoint(), await endpoint()];
  await meet(hidden, bob);
  await giveList(bob, hidden, 10, ends);
  await write(hidden, bob.id, 'waits for the relay');
  const waiting = hidden.e2e.copies().map((c) => [c.w, c.p]);
  assert.equal(waiting.length, 4);
  // Opened again, hidden chats find them, and the space's chat none of them.
  hidden.e2e = await E2E.open('hidden', index, hiddenKey);
  space = await E2E.open('space', index, key);
  assert.deepEqual([hidden.e2e.copies().map((c) => [c.w, c.p]), space.copies()], [waiting, []]);
  assert.deepEqual((await loadFanoutData('space', index, key)).copies, []);
});

t('each space\'s chat writes its own value in that file as it opens, whichever space opened first, so each opens with its own key and none says another was there first', async () => {
  const opens = (holder: Holder, space: number, key: Uint8Array) => {
    try {
      decryptText(key, (JSON.parse(files.get(FANOUT_FILE)!) as Record<Holder, string[]>)[holder][space]);
      return true;
    } catch {
      return false;
    }
  };
  for (const first of [0, 1]) {
    files.clear();
    const index = [spaces++, spaces++];
    const keys = [randomBytes(32), randomBytes(32)];
    // As once this version is put on, or on a phone a backup was put back on: either opens first.
    await E2E.open('space', index[first], keys[first]);
    await E2E.open('space', index[1 - first], keys[1 - first]);
    await E2E.open('hidden', index[0], randomBytes(32));
    await E2E.open('space', index[0], keys[0]);
    assert.deepEqual([opens('space', index[0], keys[0]), opens('space', index[1], keys[1])], [true, true]);
  }
});

t('copies go once what went to the account went, however it went: none when it failed, none that waited too long', async () => {
  const { carol, mallory, ends: [x, y] } = await withEndpoints();
  const failed = await carol.e2e.seal(mallory.id, 'once', carol.sender, { at: where });
  assert.ok(failed.copies > 0);
  assert.deepEqual(carol.e2e.copies(), []);
  await assert.rejects(carol.e2e.copiesAfter(failed.copies, Promise.reject(new Error('no relay'))), /no relay/);
  await carol.e2e.copiesGo(failed.copies);
  assert.deepEqual(carol.e2e.copies(), []);

  // Tried again, it is sealed again with its tag, and its copies go once it went: each endpoint's
  // conversation with its first packet, which never went, and the message. What was lost is only
  // the copy that never went: the endpoint reads the one after it.
  const sent = await carol.e2e.seal(mallory.id, 'once', carol.sender, { at: where, tag: failed.tag });
  assert.equal(await carol.e2e.copiesAfter(sent.copies, Promise.resolve('went')), 'went');
  const copies = carol.e2e.copies();
  assert.deepEqual(copies.map((c) => `${c.w} ${c.first ?? false}`).sort(), [`${x.id} true`, `${x.id} false`, `${y.id} true`, `${y.id} false`].sort());
  const ofX = copies.filter((c) => c.w === x.id);
  const atX = await acceptConversation(x.secret, fromBase64(ofX.find((c) => c.first)!.p));
  assert.equal(said((await openIn(atX.conversation, fromBase64(ofX.find((c) => !c.first)!.p))).plaintext).text, 'once');
  await carol.e2e.copiesSent(copies);

  // The copies of a sending that never ends go unsent, once they waited longer than one takes.
  let clock = Date.now();
  mock.method(Date, 'now', () => clock);
  const stuck = await carol.e2e.seal(mallory.id, 'stuck', carol.sender, { at: where });
  clock += PENDING_LASTS;
  const after = await write(carol, mallory.id, 'after it');
  await carol.e2e.copiesGo(stuck.copies);
  assert.ok(after.copies > 0);
  assert.deepEqual(carol.e2e.copies().map((c) => c.w).sort(), [x.id, y.id].sort());
});

t('copies wait no longer than the relay keeps a message, nor for an endpoint the list names no more, nor for a contact who is gone', async () => {
  const { carol, mallory, ends: [x, y] } = await withEndpoints();
  const at = Date.now();
  let clock = at;
  mock.method(Date, 'now', () => clock);
  await write(carol, mallory.id, 'soon old');
  assert.equal(carol.e2e.copies().length, 4);
  assert.deepEqual(carol.e2e.copies(at + COPIES_LAST), []);
  // Sealing later, those go first: what goes now starts with the first packets again.
  clock = at + COPIES_LAST;
  await write(carol, mallory.id, 'later');
  const later = carol.e2e.copies();
  assert.deepEqual(later.map((c) => `${c.w} ${c.first ?? false}`).sort(), [`${x.id} true`, `${x.id} false`, `${y.id} true`, `${y.id} false`].sort());
  assert.ok(later.every((c) => c.at === clock));
  // Mallory's next list names `x` only: what waits for `y` goes.
  await giveList(mallory, carol, 20, [x]);
  assert.deepEqual([...new Set(carol.e2e.copies().map((c) => c.w))], [x.id]);
  // Mallory gone: none of hers waits, here nor as kept.
  await carol.e2e.removeContact(mallory.id);
  assert.deepEqual(carol.e2e.copies(), []);
  assert.deepEqual((await loadFanoutData(carol.holder, carol.space, carol.key)).copies, []);
});

t('no endpoint holds more than its share of the copies, and no contact keeps the others out: the oldest of the one with the most give way, first packets last', async () => {
  const { carol, mallory, ends: [x] } = await withEndpoints(1);
  // Once MAX_COPIES_EACH wait for an endpoint, nothing more is sealed for it; what goes to the
  // account goes all the same.
  let last = null;
  for (let i = 0; i < MAX_COPIES_EACH; i++) last = await write(carol, mallory.id, `${i}`);
  assert.equal(carol.e2e.copies().length, MAX_COPIES_EACH);
  assert.deepEqual([last!.copies, last!.packet.length > 0], [0, true]);

  // Many endpoints of Mallory's, the outbox full of what waits for them, as when their queues are
  // never read, and Carol opens again: Olga's endpoint still gets what Carol writes to Olga.
  const kept = await loadFanoutData(carol.holder, carol.space, carol.key);
  const now = Date.now();
  const filler = Array.from({ length: MAX_COPIES - kept.copies.length }, (_, i) => ({ n: kept.next + i, c: mallory.id, w: x.id, p: 'AAAA', at: now }));
  await saveFanoutData(carol.holder, carol.space, carol.key, { copies: [...kept.copies, ...filler], next: kept.next + filler.length });
  const reopened: Chat = { ...carol, e2e: await E2E.open('space', carol.space, carol.key) };
  assert.equal(reopened.e2e.copies().length, MAX_COPIES);
  const olga = await chat();
  const z = await endpoint();
  await meet(reopened, olga);
  await giveList(olga, reopened, 10, [z]);
  await write(reopened, olga.id, 'to Olga');
  const all = reopened.e2e.copies();
  assert.equal(all.length, MAX_COPIES);
  assert.deepEqual(all.filter((c) => c.c === olga.id).map((c) => `${c.w} ${c.first ?? false}`), [`${z.id} true`, `${z.id} false`]);
  // Mallory's two oldest went, but not the first packet of her endpoint's conversation.
  const theirs = all.filter((c) => c.c === mallory.id);
  assert.deepEqual([theirs.length, theirs[0].first, theirs[0].n, theirs[1].n], [MAX_COPIES - 2, true, kept.copies[0].n, kept.copies[3].n]);
});

t('copies for an endpoint whose queue the relay says is full keep no one out: nothing new is copied to it while one waits, and they give way first once all are taken, so a contact\'s device, and a long voice message, still have theirs', async () => {
  const carol = await chat();
  const contacts: { m: Chat; ends: (Named & { secret: Uint8Array })[] }[] = [];
  for (let k = 0; k < 8; k++) {
    const m = await chat();
    const ends = [await endpoint(), await endpoint(), await endpoint(), await endpoint()];
    await meet(carol, m);
    await giveList(m, carol, 10, ends);
    contacts.push({ m, ends });
  }
  const devices = new Set(contacts.map(({ ends }) => ends[0].id));
  const of = (id: string) => carol.e2e.copies().filter((c) => c.w === id);
  // Seven write: each one's device takes its copies, while the relay their places that fill the list
  // are on cannot be reached, as many wait for those as one endpoint holds, and the outbox fills.
  for (let i = 0; i < MAX_COPIES_EACH + 1; i++) {
    for (const { m } of contacts.slice(0, 7)) await write(carol, m.id, `t${i}`);
    await carol.e2e.copiesSent(carol.e2e.copies().filter((c) => devices.has(c.w)));
  }
  // Then that relay answers: their queues are full, as the phone that empties them is off.
  await carol.e2e.copiesSent([], [], carol.e2e.copies());
  // A text to the first of them, though a copy for each of its endpoints would not fit: one for its
  // device, none more for the others.
  const fillers = () => contacts[0].ends.slice(1).map((e) => of(e.id).length);
  const held = fillers();
  assert.ok(carol.e2e.copies().length + contacts[0].ends.length > MAX_COPIES);
  await write(carol, contacts[0].m.id, 'to the device');
  assert.deepEqual([of(contacts[0].ends[0].id).length, fillers()], [1, held]);
  // The longest voice message to the eighth, whose endpoints all take theirs: whole, to each.
  const voice = await carol.e2e.sealVoice(contacts[7].m.id, randomBytes(MAX_PARTS * PART_SIZE), 60_000, carol.sender, { at: where });
  await carol.e2e.copiesGo(voice.copies);
  assert.deepEqual(contacts[7].ends.map((e) => of(e.id).length), Array(4).fill(MAX_PARTS + 1));
  assert.ok(carol.e2e.copies().length <= MAX_COPIES);
  // One taken where the relay said it was full: that endpoint is copied to again.
  const [filler] = of(contacts[1].ends[1].id);
  await carol.e2e.copiesSent([filler]);
  const before = of(contacts[1].ends[1].id).length;
  await write(carol, contacts[1].m.id, 'room again');
  assert.equal(of(contacts[1].ends[1].id).length, before + 1);
});

t('an endpoint whose queue the relay does not have gets nothing more until where it reads is said again; what went where one no longer reads changes nothing', async () => {
  const { carol, mallory, ends: [x, y] } = await withEndpoints();
  const ways = () => carol.e2e.record(mallory.id)!.endpoints!;
  const wayTo = (id: string) => ways().find((w) => w.id === id)!;
  await write(carol, mallory.id, 'one');
  const one = carol.e2e.copies();
  await carol.e2e.copiesSent(one.filter((c) => c.w === x.id), one.filter((c) => c.w === y.id));
  assert.deepEqual(carol.e2e.copies(), []);
  assert.deepEqual([wayTo(x.id).sender, wayTo(x.id).first, wayTo(y.id).sender, wayTo(y.id).first !== ''], [x.route.s, '', '', true]);
  await write(carol, mallory.id, 'two');
  assert.deepEqual(carol.e2e.copies().map((c) => `${c.w} ${c.first ?? false}`), [`${x.id} false`]);

  // Mallory's phone says where `y` reads now: Carol writes to it again, its first packet first.
  const moved = { ...y.route, s: sender() };
  await mallory.e2e.keepRoutes(10, { [x.id]: x.route, [y.id]: moved }, {});
  await giveKeys(mallory, carol);
  assert.equal(wayTo(y.id).sender, moved.s);
  await write(carol, mallory.id, 'three');
  const toY = carol.e2e.copies().filter((c) => c.w === y.id);
  assert.deepEqual(toY.map((c) => `${c.first ?? false} ${c.s}`), [`true ${moved.s}`, `false ${moved.s}`]);

  // It moves again before those went: that they went to where it read, or that no queue was
  // there, changes nothing. They go where it reads now.
  const again = { ...y.route, s: sender() };
  await mallory.e2e.keepRoutes(10, { [x.id]: x.route, [y.id]: again }, {});
  await giveKeys(mallory, carol);
  await carol.e2e.copiesSent(toY.slice(0, 1), toY.slice(1));
  assert.deepEqual([wayTo(y.id).sender, wayTo(y.id).first !== ''], [again.s, true]);
  assert.deepEqual(carol.e2e.copies().filter((c) => c.w === y.id).map((c) => c.s), [again.s, again.s]);
});

t('the first message of a way to an endpoint says when the queue it names was made, as each copy after it does, so a late copy from before a move is not taken there', async () => {
  const { carol, mallory, ends: [x] } = await withEndpoints(1);
  const HOUR = 60 * 60_000;
  carol.e2e.setQueueAge(10 * HOUR, carol.sender);
  await write(carol, mallory.id, 'after a move');
  const [opening, copy] = await reader(x).open(carol.e2e.copies());
  assert.deepEqual([opening?.from, opening?.qa, opening?.text], [carol.sender, 10 * HOUR, '']);
  assert.deepEqual([copy?.from, copy?.qa, copy?.text], [carol.sender, 10 * HOUR, 'after a move']);
});

t('what goes to an endpoint only for what came from it says only that, a whole copy says nothing of being open, a message taken once is said to come twice, and their account starting anew starts each way anew', async () => {
  const { carol, mallory, ends: [x] } = await withEndpoints(1);
  await write(carol, mallory.id, 'hello', { on: 75, ask: true });
  const [first, copy] = carol.e2e.copies();
  // The text tells the relay it is a message someone reads (lib/relay.ts, Mark); the way's first packet is quiet.
  assert.deepEqual([first.mark, copy.mark], [undefined, 'message']);
  const atX = await acceptConversation(x.secret, fromBase64(first.p));
  let conversation = atX.conversation;
  const read = async (packet: string) => {
    const opened = await openIn(conversation, fromBase64(packet));
    conversation = opened.conversation;
    return said(opened.plaintext);
  };
  const whole = await read(copy.p);
  assert.deepEqual([whole.text, whole.on, whole.ask], ['hello', undefined, undefined]);
  await carol.e2e.copiesSent(carol.e2e.copies());

  // The endpoint writes to Carol in it, as Mallory's.
  const tag = newTag();
  const written = await sealIn(conversation, utf8Encode(JSON.stringify({ from: x.route.s, text: 'from the endpoint', tag, dv: 0 })));
  conversation = written.conversation;
  const came = await carol.e2e.receive(written.packet);
  assert.deepEqual(came.kind === 'message' && [came.identity, came.text, came.from, came.twice], [mallory.id, 'from the endpoint', x.id, false]);

  // That it came goes to that endpoint only, saying that alone: not that Carol's phone is open,
  // nor asking, nor that she types. Her account is told the rest.
  const got = await write(carol, mallory.id, '', { got: [tag], on: 75, ask: true, more: { typing: true } });
  const receipts = carol.e2e.copies();
  assert.deepEqual(receipts.map((c) => c.w), [x.id]);
  const receipt = await read(receipts[0].p);
  assert.deepEqual([receipt.got, receipts[0].mark], [[tag], undefined]);
  assert.deepEqual(['text', 'on', 'ask', 'typing', 'call', 'group', 'due'].filter((k) => !!receipt[k]), []);
  const atMallory = await mallory.e2e.receive(got.packet);
  assert.deepEqual(atMallory.kind === 'message' && [atMallory.got, atMallory.ask, atMallory.online > 0, atMallory.more.typing], [[], true, true, true]);
  await carol.e2e.copiesSent(receipts);

  // The same message again, from her account, as her phone passes it on: said to come twice, so
  // it is not kept again, whether or not the first is still kept.
  const passed = await mallory.e2e.seal(carol.id, 'from the endpoint', mallory.sender, { at: where, tag });
  const twice = await carol.e2e.receive(passed.packet);
  assert.deepEqual(twice.kind === 'message' && [twice.tag, twice.twice], [tag, true]);

  // Mallory deletes Carol and adds her again: her endpoints may have lost what they spoke with
  // Carol, so each way starts again, where it reads kept, and what waited in the old conversation goes.
  await write(carol, mallory.id, 'left waiting');
  assert.equal(carol.e2e.copies().length, 1);
  await mallory.e2e.removeContact(carol.id);
  await mallory.e2e.addContact({ senderHex: carol.sender, key: toBase64Url(carol.e2e.bundle), relayUrl: RELAY }, mallory.sender, where);
  assert.equal((await carol.e2e.receive(mallory.e2e.pending().find((p) => p.identity === carol.id)!.first)).kind, 'message');
  const way = carol.e2e.record(mallory.id)!.endpoints![0];
  assert.deepEqual([way.conversations.length, way.sender, way.first], [0, x.route.s, '']);
  assert.deepEqual(carol.e2e.copies(), []);
  await write(carol, mallory.id, 'anew');
  const [restart, next] = carol.e2e.copies();
  assert.equal(restart.first, true);
  const anew = await acceptConversation(x.secret, fromBase64(restart.p));
  assert.equal(said((await openIn(anew.conversation, fromBase64(next.p))).plaintext).text, 'anew');
});

t('each message of theirs is taken once for as long as another copy of it may come, however many come between: a voice message once by its tag, and what comes again in the order it came pushes out nothing still to come', async () => {
  const { carol, mallory, ends: [x] } = await withEndpoints(1);
  let clock = Date.now();
  mock.method(Date, 'now', () => clock);
  const atX = reader(x);
  await write(carol, mallory.id, 'hello');
  await atX.open(carol.e2e.copies());
  await carol.e2e.copiesSent(carol.e2e.copies());
  const fromX = async (text: string, tag: string, more = {}) => {
    const came = await carol.e2e.receive(await atX.write(text, tag, more));
    assert.equal(came.kind, 'message');
    return came.kind === 'message' && came.twice;
  };
  const passedOn = async (tag: string) => {
    const came = await carol.e2e.receive((await mallory.e2e.seal(carol.id, 'again', mallory.sender, { at: where, tag })).packet);
    return came.kind === 'message' && came.twice;
  };
  const first = newTag();
  assert.equal(await fromX('M', first), false);
  // Five voice messages of as many parts as one has, each part taken once.
  const voices: string[] = [];
  for (let v = 0; v < 5; v++) {
    const tag = newTag();
    voices.push(tag);
    const id = toHex(randomBytes(8));
    const part = (n: number) => ({ voice: { id, part: n, parts: MAX_PARTS, ms: 60_000, data: toBase64(randomBytes(16)) } });
    for (let n = 0; n < MAX_PARTS; n++) {
      assert.equal(await fromX('', tag, part(n)), false);
      if (v === 0 && n === 1) assert.equal(await fromX('', tag, part(0)), true);
    }
  }
  // And more texts than were kept before.
  const texts: string[] = [];
  for (let i = 0; i < 250; i++) {
    texts.push(newTag());
    assert.equal(await fromX(`t${i}`, texts[i]), false);
  }
  const took = carol.e2e.record(mallory.id)!.took!;
  assert.deepEqual([took.length, took.filter((t) => t.p).length], [1 + voices.length + texts.length, 0]);
  // Her account passes them all on, in the order they came: each comes twice, none pushed out.
  for (const tag of [first, ...voices, ...texts]) assert.equal(await passedOn(tag), true);
  assert.equal(carol.e2e.record(mallory.id)!.took!.length, took.length);
  // Kept with the day each came, no more of when, in memory and as saved.
  const saved = (await loadE2EData('space', carol.space, carol.key)).contacts.find((c) => c.identity === mallory.id)!.took!;
  assert.deepEqual([...new Set([...carol.e2e.record(mallory.id)!.took!, ...saved].map((t) => t.at))], [tookDay(clock)]);
  // As long as a second copy may take, waiting in their outbox and then in a device's queue on
  // the relay, or in the phone's queue and then the device's: still taken once on the last day.
  assert.ok(TOOK_LASTS >= COPIES_LAST + 14 * DAY);
  clock = tookDay(clock) + TOOK_DAY + TOOK_LASTS - 1;
  assert.equal(await passedOn(first), true);
  // Once no copy of them can still come, they are let go.
  clock += 1;
  assert.equal(await fromX('later', newTag()), false);
  assert.equal(carol.e2e.record(mallory.id)!.took!.length, 1);
});

t('past as many as are kept of one contact, those that came twice give way, and while none has a new one is not kept: what comes again in the order it came shows again only for those not kept', async () => {
  const { carol, mallory, ends: [x] } = await withEndpoints(1);
  const atX = reader(x);
  await write(carol, mallory.id, 'hello');
  await atX.open(carol.e2e.copies());
  await carol.e2e.copiesSent(carol.e2e.copies());
  const fromX = async (text: string, tag: string) => {
    const came = await carol.e2e.receive(await atX.write(text, tag));
    return came.kind === 'message' && came.twice;
  };
  const passedOn = async (tag: string) => {
    const came = await carol.e2e.receive((await mallory.e2e.seal(carol.id, 'again', mallory.sender, { at: where, tag })).packet);
    return came.kind === 'message' && came.twice;
  };
  // Ten more than are kept come from the endpoint, as with the phone off; then the phone passes
  // them all on, in the order they came.
  const tags: string[] = [];
  for (let i = 0; i < MAX_TOOK + 10; i++) {
    tags.push(newTag());
    assert.equal(await fromX(`t${i}`, tags[i]), false);
  }
  const again: string[] = [];
  for (const tag of tags) if (!(await passedOn(tag))) again.push(tag);
  assert.deepEqual(again, tags.slice(MAX_TOOK));
  // Those ten took the places of the first that came twice.
  const took = carol.e2e.record(mallory.id)!.took!;
  assert.deepEqual([took.length, took.slice(-10).map((t) => t.t)], [MAX_TOOK, tags.slice(MAX_TOOK)]);
});

t('a chat keeps what it took of a contact only when a copy of it may come again: not from one whose account lists no devices, so no trace is kept of messages that left the history', async () => {
  const [carol, mallory] = [await chat(), await chat()];
  await meet(carol, mallory);
  const hi = await write(carol, mallory.id, 'hi');
  assert.equal((await mallory.e2e.receive(hi.packet)).kind, 'message');
  const tags: string[] = [];
  for (let i = 0; i < 3; i++) {
    const sealed = await mallory.e2e.seal(carol.id, `goes in 30 seconds ${i}`, mallory.sender, { at: where, lasts: 30 });
    const came = await carol.e2e.receive(sealed.packet);
    assert.deepEqual(came.kind === 'message' && [came.text, came.twice], [`goes in 30 seconds ${i}`, false]);
    tags.push(sealed.tag);
  }
  const erase = await mallory.e2e.seal(carol.id, '', mallory.sender, { at: where, erase: { all: true } });
  assert.equal((await carol.e2e.receive(erase.packet)).kind, 'message');
  // She knows about devices, and has none.
  assert.deepEqual([carol.e2e.record(mallory.id)!.dv, carol.e2e.record(mallory.id)!.list], [0, undefined]);
  assert.equal(carol.e2e.record(mallory.id)!.took, undefined);
  assert.equal((await loadE2EData('space', carol.space, carol.key)).contacts.find((c) => c.identity === mallory.id)!.took, undefined);
});

t('a voice message that went in part, and goes again whole with its tag, is put together once: its parts are the first try\'s, and those that came then count, after a restart too; one that came whole and left the history is not kept again', async () => {
  const [bob, carol] = [await chat(), await chat()];
  await meet(bob, carol);
  const ends = [await endpoint()];
  // Carol's account lists a device, so Bob keeps what he took of her.
  await giveList(carol, bob, 10, ends);
  const history = await History.open('space', bob.space, bob.key);
  const chats = { e2e: bob.e2e, history, voiceParts: new VoiceAssembler() };
  const audio = randomBytes(PART_SIZE * 10);
  const shown = (tag: string) => history.messages().filter((m) => m.tag === tag && m.voice).length;
  const ids = new Set<string>();
  const take = async (packets: Uint8Array[], restart = false) => {
    const twice: boolean[] = [];
    for (const packet of packets) {
      const came = await bob.e2e.receive(packet);
      twice.push(came.kind === 'message' && came.twice);
      if (came.kind === 'message' && came.voice) ids.add(came.voice.id);
      await keepReceived(chats, came);
    }
    if (restart) chats.voiceParts = new VoiceAssembler();
    return twice;
  };
  for (const restart of [false, true]) {
    // The relay took the first six parts, then their queue was full; it waited, and goes again whole.
    const tag = newTag();
    ids.clear();
    const once = await carol.e2e.sealVoice(bob.id, audio, 9000, carol.sender, { at: where, tag });
    assert.equal(once.packets.length, 10);
    await take(once.packets.slice(0, 6), restart);
    const again = await carol.e2e.sealVoice(bob.id, audio, 9000, carol.sender, { at: where, tag });
    assert.deepEqual(await take(again.packets), [...Array(6).fill(true), ...Array(4).fill(false)]);
    assert.equal(shown(tag), 1);
    assert.equal(ids.size, 1);
    // Gone from the history, as once its timer ran out: coming whole again, it is not kept again.
    await history.remove(`contact:${carol.id}`, tag);
    await take((await carol.e2e.sealVoice(bob.id, audio, 9000, carol.sender, { at: where, tag })).packets);
    assert.equal(shown(tag), 0);
  }
});

t('a voice message from a contact with no devices that went in part, and goes again whole, says once that it came', async () => {
  const [bob, carol] = [await chat(), await chat()];
  await meet(bob, carol);
  const history = await History.open('space', bob.space, bob.key);
  const chats = { e2e: bob.e2e, history, voiceParts: new VoiceAssembler() };
  const audio = randomBytes(PART_SIZE * 10);
  const tag = newTag();
  const take = async (packets: Uint8Array[]) => {
    const news: boolean[] = [];
    for (const packet of packets) {
      const received = await bob.e2e.receive(packet);
      const came = cameBefore(chats, received);
      news.push(!!came && isNews(came));
      await keepReceived(chats, received);
    }
    return news;
  };
  const once = await carol.e2e.sealVoice(bob.id, audio, 9000, carol.sender, { at: where, tag });
  assert.deepEqual(await take(once.packets.slice(0, 6)), Array(6).fill(false));
  const again = await carol.e2e.sealVoice(bob.id, audio, 9000, carol.sender, { at: where, tag });
  assert.deepEqual(await take(again.packets), [...Array(9).fill(false), true]);
  assert.equal(history.messages().filter((m) => m.tag === tag && m.voice).length, 1);
});

t('a way whose first packet the relay took but its endpoint never read starts again a day later, those before kept to open in, and so ever less often until it answers; one that answered starts none again', async () => {
  const { carol, mallory, ends: [x, y, z] } = await withEndpoints(3);
  let clock = Date.now();
  mock.method(Date, 'now', () => clock);
  const [atX, atY, atZ] = [reader(x), reader(y), reader(z)];
  const copies = () => carol.e2e.copies().map((c) => [[x.id, 'x'], [y.id, 'y'], [z.id, 'z']].find(([id]) => id === c.w)![1] + (c.first ? ' first' : ` ${c.mark}`)).sort();
  await write(carol, mallory.id, 'A');
  // The relay takes them all. x never reads its own (it was off for longer than the relay keeps
  // them); y reads them and answers; z reads them and says nothing.
  const a = carol.e2e.copies();
  assert.deepEqual([(await atY.open(a)).map(textOf), (await atZ.open(a)).map(textOf)], [['', 'A'], ['', 'A']]);
  await carol.e2e.copiesSent(a);
  assert.equal((await carol.e2e.receive(await atY.write('from y', newTag()))).kind, 'message');

  // Within the day, nothing starts again.
  clock += WAY_AGAIN - 60_000;
  await write(carol, mallory.id, 'B');
  assert.deepEqual(copies(), ['x message', 'y message', 'z message']);
  assert.deepEqual([(await atX.open(carol.e2e.copies())).map(textOf), (await atY.open(carol.e2e.copies())).map(textOf)], [['refused'], ['B']]);
  await atZ.open(carol.e2e.copies());
  await carol.e2e.copiesSent(carol.e2e.copies());

  // A day after: another starts with x and with z, its first packet quiet, and x reads from there
  // on; y's goes on as it was.
  clock += 2 * 60_000;
  await write(carol, mallory.id, 'C');
  assert.deepEqual(copies(), ['x first', 'x message', 'y message', 'z first', 'z message']);
  const c = carol.e2e.copies();
  assert.deepEqual([(await atX.open(c)).map(textOf), (await atY.open(c)).map(textOf)], [['', 'C'], ['C']]);
  await carol.e2e.copiesSent(c);
  // z, away meanwhile, wrote in the one before: that still opens, and is an answer.
  const before = await atZ.write('written while away', newTag());
  await atZ.open(c);
  assert.equal((await carol.e2e.receive(before)).kind, 'message');
  const ways = () => [x, y, z].map((e) => carol.e2e.record(mallory.id)!.endpoints!.find((w) => w.id === e.id)!);
  assert.deepEqual(ways().map((w) => [w.conversations.length, w.again !== undefined]), [[2, true], [1, false], [2, false]]);

  // x says nothing: another starts with it two days after, then four, so one that never answers,
  // as a place that fills the list, costs ever less, until it answers. Then none.
  clock += WAY_AGAIN;
  await write(carol, mallory.id, 'D');
  assert.deepEqual(copies(), ['x message', 'y message', 'z message']);
  assert.deepEqual((await atX.open(carol.e2e.copies())).map(textOf), ['D']);
  await carol.e2e.copiesSent(carol.e2e.copies());
  clock += WAY_AGAIN;
  await write(carol, mallory.id, 'E');
  assert.deepEqual(copies(), ['x first', 'x message', 'y message', 'z message']);
  assert.deepEqual((await atX.open(carol.e2e.copies())).map(textOf), ['', 'E']);
  await carol.e2e.copiesSent(carol.e2e.copies());
  assert.deepEqual([ways()[0].conversations.length, ways()[0].again], [3, clock + 4 * WAY_AGAIN]);
  assert.equal((await carol.e2e.receive(await atX.write('from x', newTag()))).kind, 'message');
  clock += 5 * WAY_AGAIN;
  await write(carol, mallory.id, 'F');
  assert.deepEqual(copies(), ['x message', 'y message', 'z message']);
  assert.deepEqual((await atX.open(carol.e2e.copies())).map(textOf), ['F']);
  assert.deepEqual(ways().map((w) => w.again), [undefined, undefined, undefined]);
});

t('the account\'s list is given once where each endpoint reads is known, as it was when sealed, again a day later to one who still holds an older one, again once one reads elsewhere, and again to a chat moved into hidden chats and back', async () => {
  let clock = Date.now();
  mock.method(Date, 'now', () => clock);
  const [carol, mallory] = [await chat(), await chat()];
  const [x, y] = [await endpoint(), await endpoint()];
  await meet(carol, mallory);
  // Its prekeys given first, so what is due from now on is the list.
  await giveKeys(mallory, carol);
  assert.deepEqual(mallory.e2e.keysDue(), []);
  const routes = { [x.id]: x.route, [y.id]: y.route };

  // Signed while where one of its endpoints reads is not known: not given until it is.
  await keepList(mallory, 10, [x, y], { [x.id]: x.route });
  assert.deepEqual(mallory.e2e.keysDue(), []);
  await mallory.e2e.keepRoutes(10, routes, {});
  assert.deepEqual(mallory.e2e.keysDue(), [carol.id]);

  // A later list signed while the message that gives this one is on its way: given too.
  const sealed = await mallory.e2e.seal(carol.id, '', mallory.sender, { at: where, keys: true });
  clock += 1000;
  await keepList(mallory, 20, [x, y]);
  clock += 1000;
  await mallory.e2e.keysGiven(carol.id);
  assert.equal((await carol.e2e.receive(sealed.packet)).kind, 'message');
  assert.equal(carol.e2e.record(mallory.id)!.list?.n, 10);
  assert.deepEqual(mallory.e2e.keysDue(), [carol.id]);
  assert.equal((await giveKeys(mallory, carol)).list?.n, 20);

  // Carol says nothing yet, so as far as Mallory knows she holds an older one: given again a day later.
  clock += DAY - 1;
  assert.deepEqual(mallory.e2e.keysDue(), []);
  clock += 1;
  assert.deepEqual(mallory.e2e.keysDue(), [carol.id]);
  await giveKeys(mallory, carol);
  // She says she holds it: not again, until one of its endpoints reads elsewhere.
  await mallory.e2e.receive((await carol.e2e.seal(mallory.id, 'I hold it', carol.sender, { at: where })).packet);
  assert.equal(mallory.e2e.record(carol.id)!.dv, 20);
  clock += DAY;
  assert.deepEqual(mallory.e2e.keysDue(), []);
  clock += 1000;
  const moved = { ...y.route, s: sender() };
  await mallory.e2e.keepRoutes(20, { ...routes, [y.id]: moved }, {});
  assert.deepEqual(mallory.e2e.keysDue(), [carol.id]);
  assert.equal((await giveKeys(mallory, carol)).endpoints!.find((w) => w.id === y.id)!.sender, moved.s);

  // Mallory moves Carol's chat into her hidden chats, telling her first, as hidden chats say it:
  // nothing of devices. Carol lets go of all she held of Mallory's.
  const hidden = await chat('hidden');
  const bye = await mallory.e2e.seal(carol.id, '', mallory.sender, { at: where, leaving: true });
  assert.equal((await carol.e2e.receive(bye.packet)).kind, 'message');
  const left = carol.e2e.record(mallory.id)!;
  assert.deepEqual([left.dv, left.list, left.endpoints], [undefined, undefined, undefined]);
  await hidden.e2e.putIn({ ...mallory.e2e.record(carol.id)!, ownIdentity: mallory.id });
  await mallory.e2e.takeOut(carol.id);
  // And back, as lock/move-chat.ts moves it: known by the space's identity again, and given the
  // list once Carol says she holds none.
  const inHidden = hidden.e2e.record(carol.id)!;
  await mallory.e2e.putIn({ ...inHidden, ownIdentity: inHidden.ownIdentity || hidden.id });
  await hidden.e2e.takeOut(carol.id);
  assert.equal(mallory.e2e.record(carol.id)!.ownIdentity, '');
  await mallory.e2e.receive((await carol.e2e.seal(mallory.id, 'back', carol.sender, { at: where })).packet);
  assert.deepEqual(mallory.e2e.keysDue(), [carol.id]);
  assert.equal((await giveKeys(mallory, carol)).list?.n, 20);
});

t('a list, or where its endpoints read, changed while the clock was ahead is given once when the clock is set right, not with every look', async () => {
  const { carol, mallory, ends } = await withEndpoints(2);
  const real = Date.now();
  const look = async () => {
    const due = mallory.e2e.keysDue().includes(carol.id);
    if (due) await giveKeys(mallory, carol);
    return due;
  };
  // A device moves queue while Mallory's clock is a day ahead, then the clock is set right: Carol
  // is given where it reads now once, and not again with each look.
  mock.method(Date, 'now', () => real + DAY);
  await mallory.e2e.keepRoutes(10, Object.fromEntries(ends.map((e) => [e.id, { ...e.route, s: sender() }])), {});
  mock.method(Date, 'now', () => real + 1000);
  assert.deepEqual([await look(), await look(), await look()], [true, false, false]);
  // She says she holds it; a queue moved now, by a clock behind the time the last change says, is
  // given too, once.
  await mallory.e2e.receive((await carol.e2e.seal(mallory.id, 'I hold it', carol.sender, { at: where })).packet);
  assert.equal(mallory.e2e.record(carol.id)!.dv, 10);
  const moved = { ...ends[0].route, s: sender() };
  await mallory.e2e.keepRoutes(10, { ...Object.fromEntries(ends.map((e) => [e.id, e.route])), [ends[0].id]: moved }, {});
  assert.deepEqual([await look(), await look()], [true, false]);
  assert.equal(carol.e2e.record(mallory.id)!.endpoints!.find((w) => w.id === ends[0].id)!.sender, moved.s);
  // A list signed and given while the clock was a day ahead, which Carol does not say she holds:
  // given once more as the clock is set right, and then only a day later.
  mock.method(Date, 'now', () => real + DAY + 5000);
  await keepList(mallory, 20, ends);
  assert.equal(await look(), true);
  mock.method(Date, 'now', () => real + 6000);
  assert.deepEqual([await look(), await look()], [true, false]);
  mock.method(Date, 'now', () => real + 6000 + DAY);
  assert.equal(await look(), true);
});

t('what contacts say of the list they hold counts only on a phone a backup was put back on, from those it accepted, and up to a day after it was put back', async () => {
  const bob = await chat();
  const strangers = [await newAccount(), await newAccount()];
  const ids = await Promise.all(strangers.map(async (a) => toHex(await accountIdentity(a))));
  const says = (dv: number) => utf8Encode(JSON.stringify({ from: sender(), relay: RELAY, relayKey: '', text: '', dv }));
  // A stranger's message request says they hold a list of Bob's: it counts for nothing.
  const started = await startConversation(strangers[0], bob.e2e.bundle, says(5));
  const asked = await bob.e2e.receive(started.packet);
  assert.deepEqual([asked.kind, asked.kind === 'message' && asked.request, bob.e2e.record(ids[0])!.dv], ['message', true, 5]);
  assert.deepEqual([bob.e2e.newestHeld(), bob.e2e.heldAtMost()], [0, 0]);
  // Accepted, they say a later one, just ahead of Bob's clock: still nothing, as no backup was put
  // back here, so no list of Bob's can be later than the one he keeps (none).
  await bob.e2e.acceptRequest(ids[0]);
  const ahead = Date.now() + 60 * 60_000;
  const next = await sealIn(started.conversation, says(ahead));
  assert.equal((await bob.e2e.receive(next.packet)).kind, 'message');
  assert.equal(bob.e2e.record(ids[0])!.dv, ahead);
  assert.equal(bob.e2e.newestHeld(), 0);
  // A backup put back: what the contact Bob accepted says counts, up to a day after; another
  // stranger's request, saying a later one, does not.
  await markRestore();
  try {
    const put = await E2E.open('space', bob.space, bob.key);
    assert.ok(Math.abs(put.heldAtMost() - (Date.now() + DAY)) < 60_000);
    assert.equal(put.newestHeld(), ahead);
    const other = await startConversation(strangers[1], put.bundle, says(ahead + 1));
    assert.equal((await put.receive(other.packet)).kind, 'message');
    assert.deepEqual([put.record(ids[1])!.dv, put.newestHeld()], [ahead + 1, ahead]);
    // Nor one from more than a day after the backup was put back.
    const later = await sealIn(next.conversation, says(put.heldAtMost() + 1));
    assert.equal((await put.receive(later.packet)).kind, 'message');
    assert.equal(put.newestHeld(), 0);
    // An account made after the backup was put back was in no backup: nothing counts there.
    assert.equal((await chat()).e2e.heldAtMost(), 0);
  } finally {
    secureStore.delete('erevos.restored');
  }
});

t('copies are sealed only as they go, each endpoint\'s in that order: one whose send to the account ended first starts the way, and what never went moves no conversation on', async () => {
  const { carol, mallory, ends: [x] } = await withEndpoints(1);
  const atX = reader(x).open;
  // A starts the way to x, and is still going when B is sealed and goes: B's copy starts the way.
  const a = await carol.e2e.seal(mallory.id, 'A', carol.sender, { at: where });
  const b = await carol.e2e.seal(mallory.id, 'B', carol.sender, { at: where });
  let finish!: () => void;
  const going = carol.e2e.copiesAfter(a.copies, new Promise<void>((done) => (finish = done)));
  await carol.e2e.copiesAfter(b.copies, Promise.resolve());
  finish();
  await going;
  assert.deepEqual(carol.e2e.copies().map((c) => c.first ?? false), [true, false, false]);
  assert.deepEqual((await atX(carol.e2e.copies())).map(textOf), ['', 'B', 'A']);
  await carol.e2e.copiesSent(carol.e2e.copies());

  // Mallory links z. C would start its way and fails; D, sealed meanwhile, goes: z takes D in the
  // way D starts, and x takes D after A, as nothing of C was sealed for either.
  const z = await endpoint();
  await giveList(mallory, carol, 20, [x, z]);
  const atZ = reader(z).open;
  const c = await carol.e2e.seal(mallory.id, 'C', carol.sender, { at: where });
  const d = await carol.e2e.seal(mallory.id, 'D', carol.sender, { at: where });
  await assert.rejects(carol.e2e.copiesAfter(c.copies, Promise.reject(new Error('not sent'))), /not sent/);
  await carol.e2e.copiesAfter(d.copies, Promise.resolve());
  assert.deepEqual((await atX(carol.e2e.copies())).map(textOf), ['D']);
  assert.deepEqual((await atZ(carol.e2e.copies())).map(textOf), ['', 'D']);
  await carol.e2e.copiesSent(carol.e2e.copies());

  // Tried again more often than a conversation can skip what it never got (the core's MAX_SKIP,
  // 1000), as a read mark is with each look while the account cannot take it: what never went
  // moved neither way on, and each opens what goes next.
  for (let i = 0; i < 1001; i++) {
    const again = await carol.e2e.seal(mallory.id, '', carol.sender, { at: where, read: [newTag()] });
    await carol.e2e.copiesAfter(again.copies, Promise.reject(new Error('not sent'))).catch(() => undefined);
  }
  assert.deepEqual(carol.e2e.copies(), []);
  await write(carol, mallory.id, 'E');
  assert.deepEqual((await atX(carol.e2e.copies())).map(textOf), ['E']);
  assert.deepEqual((await atZ(carol.e2e.copies())).map(textOf), ['E']);
});

t('what is to go again as it is goes to the endpoints though the relay can take it only later, and once, however often it is tried; what is not to goes nowhere', async () => {
  const { carol, mallory, ends: [x] } = await withEndpoints(1);
  const atX = reader(x).open;
  const later = () => Promise.reject(new RelayUnreachableError('the relay cannot be reached'));
  // A walkie-talkie message, which does not wait, and one their account no longer takes: nothing.
  const talk = await carol.e2e.sealVoice(mallory.id, randomBytes(2 * PART_SIZE), 2000, carol.sender, { at: where, talk: true });
  await assert.rejects(carol.e2e.copiesAfter(talk.copies, later()));
  const gone = await carol.e2e.seal(mallory.id, 'their queue is gone', carol.sender, { at: where });
  await assert.rejects(carol.e2e.copiesAfter(gone.copies, Promise.reject(new Error('send: no such queue')), true));
  // Too large for LoRa, the only way left, when the relay was not tried: nothing.
  const lora = await carol.e2e.seal(mallory.id, 'too large for LoRa', carol.sender, { at: where });
  await assert.rejects(carol.e2e.copiesAfter(lora.copies, Promise.reject(new TooLargeForLoraError()), true));
  assert.deepEqual(carol.e2e.copies(), []);

  // A text and a voice message that wait (lib/waiting.ts): their copies go now. Sealed again with
  // their tags, each try and the one that goes copy nothing more, and each counts once.
  const text = await carol.e2e.seal(mallory.id, 'waits', carol.sender, { at: where });
  await assert.rejects(carol.e2e.copiesAfter(text.copies, later(), true));
  const audio = randomBytes(3 * PART_SIZE);
  const voice = await carol.e2e.sealVoice(mallory.id, audio, 3000, carol.sender, { at: where });
  await assert.rejects(carol.e2e.copiesAfter(voice.copies, later(), true));
  const went = carol.e2e.copies();
  assert.deepEqual(went.map((c) => c.mark ?? (c.first ? 'first' : 'quiet')), ['first', 'message', 'quiet', 'quiet', 'message']);
  for (let i = 0; i < 3; i++) {
    const again = await carol.e2e.seal(mallory.id, 'waits', carol.sender, { at: where, tag: text.tag });
    await assert.rejects(carol.e2e.copiesAfter(again.copies, later(), true));
    const parts = await carol.e2e.sealVoice(mallory.id, audio, 3000, carol.sender, { at: where, tag: voice.tag });
    await carol.e2e.copiesAfter(parts.copies, i < 2 ? later() : Promise.resolve(), true).catch(() => undefined);
  }
  await carol.e2e.copiesAfter((await carol.e2e.seal(mallory.id, 'waits', carol.sender, { at: where, tag: text.tag })).copies, Promise.resolve(), true);
  assert.deepEqual(carol.e2e.copies(), went);
  const opened = await atX(went);
  assert.deepEqual([opened.map(textOf), opened.slice(2).map((m) => (m?.voice as { part: number }).part)], [['', 'waits', '', '', ''], [0, 1, 2]]);
  await carol.e2e.copiesSent(went);
  // Too large for LoRa, the only way left once their queue was full: as the relay said, it goes.
  const full = await carol.e2e.seal(mallory.id, 'their queue is full, and LoRa too small', carol.sender, { at: where });
  await assert.rejects(carol.e2e.copiesAfter(full.copies, Promise.reject(new TooLargeForLoraError(new RelayError('send: queue is full', 2))), true));
  assert.deepEqual((await atX(carol.e2e.copies())).map(textOf), ['their queue is full, and LoRa too small']);
  await carol.e2e.copiesSent(carol.e2e.copies());

  // What was read, said again with each look while it cannot go: once. And the account's keys and
  // list, given again until they go: once.
  const tag = newTag();
  for (let i = 0; i < 3; i++) {
    const read = await carol.e2e.seal(mallory.id, '', carol.sender, { at: where, read: [tag], on: 75 });
    await assert.rejects(carol.e2e.copiesAfter(read.copies, later(), true));
  }
  await keepList(carol, 5, [await endpoint()]);
  for (let i = 0; i < 3; i++) {
    const keys = await carol.e2e.seal(mallory.id, '', carol.sender, { at: where, keys: true });
    await assert.rejects(carol.e2e.copiesAfter(keys.copies, later(), true));
  }
  const marks = await atX(carol.e2e.copies());
  assert.deepEqual(marks.map((m) => [m?.read ?? [], !!m?.dl, m?.on ?? 0]), [[[tag], false, 0], [[], true, 0]]);
});

t('a voice message is copied whole, however long and whatever waits for that endpoint; once as many as one endpoint holds wait, nothing new is, but a voice message goes on to its last part', async () => {
  const { carol, mallory, ends: [x] } = await withEndpoints(1);
  // The longest there is, as the first thing to a new way: its first packet, and every part.
  const longest = await carol.e2e.sealVoice(mallory.id, randomBytes(MAX_PARTS * PART_SIZE), 60_000, carol.sender, { at: where });
  assert.equal(longest.packets.length, MAX_PARTS);
  await carol.e2e.copiesGo(longest.copies);
  const all = carol.e2e.copies();
  assert.equal(all.length, MAX_PARTS + 1);
  // Its last part tells the relay a message came; the rest go quiet. The endpoint opens each.
  assert.deepEqual(all.map((c, i) => c.mark ?? (i === 0 ? 'first' : 'quiet')), ['first', ...Array(MAX_PARTS - 1).fill('quiet'), 'message']);
  assert.deepEqual((await reader(x).open(all)).map((m, i) => (i === 0 ? m?.text : (m?.voice as { part: number } | undefined)?.part)), ['', ...Array.from({ length: MAX_PARTS }, (_, i) => i)]);
  // More than one endpoint holds wait now: a text is not copied, and goes to the account only.
  assert.ok(all.length > MAX_COPIES_EACH);
  assert.equal((await write(carol, mallory.id, 'too many wait')).copies, 0);
  await carol.e2e.copiesSent(all);

  // One short of as many: a voice message of 52 parts, over the cap, is copied whole all the same.
  for (let i = 0; i < MAX_COPIES_EACH - 1; i++) await write(carol, mallory.id, `${i}`);
  const long = await carol.e2e.sealVoice(mallory.id, randomBytes(52 * PART_SIZE), 55_000, carol.sender, { at: where });
  await carol.e2e.copiesGo(long.copies);
  assert.equal(carol.e2e.copies().length, MAX_COPIES_EACH - 1 + 52);
  await carol.e2e.copiesSent(carol.e2e.copies());

  // A linked device's, which the phone seals part by part (E2E.sealAs): one whose first part was
  // copied goes on to its last though the cap is passed, and one whose first part was not gets
  // none of the rest, even once there is room.
  const asDevice = (tag: string, part: { id: string; part: number; parts: number; ms: number; data: Uint8Array }) =>
    utf8Encode(JSON.stringify({ text: '', tag, timer: 0, timerAt: 0, voice: { ...part, data: toBase64(part.data) } }));
  const parts = splitVoice(randomBytes(52 * PART_SIZE), 55_000);
  for (let i = 0; i < MAX_COPIES_EACH - 1; i++) await write(carol, mallory.id, `${i}`);
  const goesOn = newTag();
  for (const part of parts) await carol.e2e.copiesGo((await carol.e2e.sealAs(mallory.id, asDevice(goesOn, part), carol.sender, where)).copies);
  assert.equal(carol.e2e.copies().length, MAX_COPIES_EACH - 1 + 52);
  const none = newTag();
  for (const [i, part] of parts.entries()) {
    // Room again from its second part on.
    if (i === 1) await carol.e2e.copiesSent(carol.e2e.copies());
    await carol.e2e.copiesGo((await carol.e2e.sealAs(mallory.id, asDevice(none, part), carol.sender, where)).copies);
  }
  assert.deepEqual(carol.e2e.copies(), []);

  // What waits for what went to the account counts as what waits for the relay: with as many
  // sealed and not gone yet, nothing new is copied.
  const held: number[] = [];
  for (let i = 0; i < MAX_COPIES_EACH; i++) held.push((await carol.e2e.seal(mallory.id, `held ${i}`, carol.sender, { at: where })).copies);
  assert.equal((await carol.e2e.seal(mallory.id, 'one more', carol.sender, { at: where })).copies, 0);
  for (const n of held) await carol.e2e.copiesGo(n);
  assert.equal(carol.e2e.copies().length, MAX_COPIES_EACH);
});

t('what a message sent for later or a call\'s offer says was read goes to every endpoint, and what it says came back only the way it came, as marks alone', async () => {
  const { carol, mallory, ends: [x, y] } = await withEndpoints(2);
  const [atX, atY] = [reader(x), reader(y)];
  await write(carol, mallory.id, 'hello');
  await atX.open(carol.e2e.copies());
  await atY.open(carol.e2e.copies());
  await carol.e2e.copiesSent(carol.e2e.copies());
  // x writes three times. Carol's chat appears offline to Mallory, so what came and was read waits
  // for what she writes next.
  const [one, two, three] = [newTag(), newTag(), newTag()];
  for (const tag of [one, two, three]) assert.equal((await carol.e2e.receive(await atX.write('from x', tag))).kind, 'message');
  await carol.e2e.setHidden(mallory.id, true);
  await carol.e2e.hold(mallory.id, 'read', [one]);
  await carol.e2e.hold(mallory.id, 'got', [two]);

  // She sends one for later: it goes to Mallory's account only, but what it says was read goes to
  // each endpoint, and what came to x only, as marks alone, quiet.
  const later = await write(carol, mallory.id, 'for later', { due: Date.now() + 3600_000 });
  const marks = carol.e2e.copies();
  assert.deepEqual(marks.map((c) => [c.w, c.mark ?? 'quiet']).sort(), [[x.id, 'quiet'], [y.id, 'quiet']].sort());
  const ofMarks = (m: Record<string, unknown> | null) => [m?.text, m?.got ?? [], m?.read ?? [], m?.due ?? 0];
  assert.deepEqual((await atX.open(marks)).map(ofMarks), [['', [two], [one], 0]]);
  assert.deepEqual((await atY.open(marks)).map(ofMarks), [['', [], [one], 0]]);
  const atMallory = await mallory.e2e.receive(later.packet);
  assert.deepEqual(atMallory.kind === 'message' && [atMallory.text, atMallory.read, atMallory.got], ['for later', [one], []]);
  await carol.e2e.copiesSent(marks);

  // And with a call's offer, which rings on their account only.
  await carol.e2e.hold(mallory.id, 'read', [three]);
  await write(carol, mallory.id, '', { call: { id: 'abc', kind: 'offer', video: false, sdp: 'x', at: Date.now() } as never });
  const offer = carol.e2e.copies();
  assert.deepEqual((await atX.open(offer)).map(ofMarks), [['', [], [three], 0]]);
  assert.deepEqual((await atY.open(offer)).map(ofMarks), [['', [], [three], 0]]);
  assert.ok(offer.every((c) => !c.mark));
});
