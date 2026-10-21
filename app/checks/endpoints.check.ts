// Contacts writing to each endpoint of an account (lib/endpoints.ts, docs/multi-device.md), alone:
// what goes to each endpoint and what only to the account, the ways a contact's list makes, the first
// packets that wait for a list, what the account's devices are told of a contact's (lib/link-wire.ts
// `way`, `came`), and what is kept of it all (lock/e2e-data.ts, lock/fanout-data.ts). Through a relay,
// with a contact, the phone and its devices: checks/devices.check.ts.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { randomBytes } from '../lib/crypto';
import { bodyBytes, type Body } from '../lib/device-list';
import { toBase64Url } from '../lib/e2e';
import { blankWay, copiedAs, isCopied, waysFor, withEarlyFirst, withRoutes, withUnverified } from '../lib/endpoints';
import { encodeEnvelope, Parts, wayOf, withWay, type Envelope } from '../lib/link-wire';
import { EARLY_LASTS, EMPTY_E2E, loadE2EData, MAX_EARLY, MAX_UNVERIFIED, MAX_UNVERIFIED_EACH, saveE2EData, TOOK_DAY, UNVERIFIED_LASTS, type Contact, type E2EData, type Way } from '../lock/e2e-data';
import { EMPTY_FANOUT, loadFanoutData, MAX_COPIES, saveFanoutData, type Copy } from '../lock/fanout-data';
import { files } from './files-memory';

const id = (n: number) => n.toString(16).padStart(2, '0').repeat(32);
const SENDER = 'ab'.repeat(24);
const OTHER = 'cd'.repeat(24);
const RELAY = 'wss://relay.example.org';
const route = (s = SENDER, relay = RELAY) => ({ s, relay, rk: '' });
const KEY = 'k'.repeat(43);
const OWN_KEY = 'o'.repeat(43);
// A list's body as it travels, with the endpoints it names, each taking messages unless said.
const listOf = (a: string, n: number, d: { i: string; b: string; f?: number }[]) => {
  const body: Body = { a, n, d: d.map((e) => ({ f: 1, ...e })) };
  return { b: toBase64Url(bodyBytes(body)), s: 'c2lnbmF0dXJl', n, body };
};

const plain = { from: SENDER, text: '', tag: '', got: [], read: [], on: 0, ask: false };

test('what goes to each endpoint, and what to the account only', () => {
  const copied = [
    { ...plain, text: 'hello', tag: 'aaaaaaaaaaaa' },
    { ...plain, tag: 'aaaaaaaaaaaa', voice: { id: 'x', part: 0, parts: 1, ms: 10, data: new Uint8Array(1) } },
    { ...plain, tag: 'aaaaaaaaaaaa', file: { id: 'f' } },
    { ...plain, read: ['aaaaaaaaaaaa'] },
    { ...plain, erase: { tag: 'aaaaaaaaaaaa' } },
    { ...plain, react: { tag: 'aaaaaaaaaaaa', emoji: '👍' } },
    { ...plain, pin: { tag: 'aaaaaaaaaaaa', on: true } },
    { ...plain, vote: { tag: 'aaaaaaaaaaaa', chose: [0] } },
    { ...plain, ak: 'YnVuZGxl' },
    { ...plain, dl: { b: 'Ym9keQ', s: 'c2ln' } },
    // One that says nothing else says the chat's timer.
    { ...plain, timer: 3600, timerAt: 5 },
  ];
  for (const m of copied) assert.equal(isCopied(m), true, JSON.stringify(m));
  // Each whole, but what says only what was read: that goes alone (lib/e2e.ts receiptOf).
  for (const m of copied) assert.equal(copiedAs(m), m.read.length > 0 ? 'marks' : 'whole', JSON.stringify(m));
  const accountOnly = [
    { ...plain, got: ['aaaaaaaaaaaa'] },
    { ...plain, on: 75 },
    { ...plain, ask: true },
    { ...plain, typing: true },
    { ...plain, call: { kind: 'offer' } },
    { ...plain, group: { k: 'welcome' } },
    { ...plain, text: 'later', tag: 'aaaaaaaaaaaa', due: 1 },
    // Text without a tag is not a message the chat keeps.
    { ...plain, text: 'hello' },
  ];
  for (const m of accountOnly) assert.equal(isCopied(m), false, JSON.stringify(m));
  for (const m of accountOnly) assert.equal(copiedAs(m), 'none', JSON.stringify(m));
});

test('the ways a contact\'s list makes: kept for the same endpoint, new for a new one, gone with it', () => {
  const [a, b, c] = [id(1), id(2), id(3)];
  const talked: Way = { ...blankWay(a, 'QQ', route()), conversations: ['Y29udg=='], seen: ['ee'.repeat(16)], sealTo: 'a2V5', sealsIn: true };
  const kept = [talked, blankWay(b, 'Qg', route())];
  const first = listOf(id(9), 5, [
    { i: a, b: 'QQ' },
    { i: b, b: 'Qnc' },
    { i: c, b: 'Qw' },
  ]);
  const ways = waysFor(kept, first.body.d, { [a]: route(OTHER), [c]: route() });
  // The same endpoint and bundle: as it was, where it reads told anew.
  assert.deepEqual(ways[0], { ...talked, sender: OTHER });
  // A new bundle for the same identity is a new way, with nowhere known to write to.
  assert.deepEqual(ways[1], blankWay(b, 'Qnc'));
  assert.deepEqual(ways[2], blankWay(c, 'Qw', route()));
  // Not named any more: gone, conversations and all; one that takes no messages gets none.
  assert.deepEqual(waysFor(ways, [{ i: c, b: 'Qw', f: 1 }, { i: a, b: 'QQ', f: 0 }], undefined), [ways[2]]);
  // The same list said again: where each reads now, those it does not say as they were.
  assert.deepEqual(withRoutes(ways, { [b]: route(OTHER) })![1].sender, OTHER);
  assert.equal(withRoutes(ways, undefined), ways);
  assert.equal(withRoutes(undefined, { [b]: route() }), undefined);
  // An entry that names an account, this chat's own or a contact's, is no endpoint of theirs.
  assert.deepEqual(
    waysFor(undefined, first.body.d, undefined, (i) => i === b).map((w) => w.id),
    [a, c],
  );
});

test('what is sent to an endpoint is sealed for the relay from the first, with the key its list gives, until it gives its own', () => {
  const [a, b] = [id(1), id(2)];
  const keyed = { ...route(), pk: KEY };
  assert.equal(blankWay(a, 'QQ', keyed).sealTo, KEY);
  assert.equal(blankWay(a, 'QQ', route()).sealTo, '');
  const list = listOf(id(9), 5, [
    { i: a, b: 'QQ' },
    { i: b, b: 'Qg' },
  ]);
  const ways = waysFor(undefined, list.body.d, { [a]: keyed, [b]: route() });
  assert.deepEqual(ways.map((w) => w.sealTo), [KEY, '']);
  // Told where it reads with a key, one that had none takes it; one the endpoint gave its own keeps that.
  const answered = ways.map((w) => (w.id === a ? { ...w, sealTo: OWN_KEY } : w));
  assert.deepEqual(withRoutes(answered, { [a]: { ...keyed, s: OTHER }, [b]: keyed })!.map((w) => [w.sender, w.sealTo]), [
    [OTHER, OWN_KEY],
    [SENDER, KEY],
  ]);
  assert.deepEqual(waysFor(answered, list.body.d, { [a]: keyed }).map((w) => w.sealTo), [OWN_KEY, '']);
});

test('first packets that wait for their account\'s list: each once, the latest of each endpoint, a few of each account, not for ever, and none pushes out what waits from another endpoint', () => {
  const acct = id(4);
  const peer = (n: number) => (n + 0x10).toString(16).padStart(2, '0').repeat(32);
  const packet = (n: number) => toBase64Url(new Uint8Array([n]));
  let held = withUnverified(undefined, 'UA==', acct, peer(0), 1000);
  held = withUnverified(held, 'UA==', acct, peer(0), 2000);
  assert.deepEqual(held, [{ packet: 'UA==', acct, peer: peer(0), at: 2000 }]);
  // A later one from the same endpoint takes its place.
  held = withUnverified(held, 'Ug==', acct, peer(0), 2500);
  assert.deepEqual(held, [{ packet: 'Ug==', acct, peer: peer(0), at: 2500 }]);
  // From many endpoints of one account: as many as a list names, those that came first. The others
  // are left out, made up or not: none pushes one out (their way starts again a day later).
  for (let n = 1; n <= MAX_UNVERIFIED; n++) held = withUnverified(held, packet(n), acct, peer(n), 3000 + n);
  assert.deepEqual(held.map((u) => u.peer), [0, 1, 2, 3].map(peer));
  assert.equal(held.length, MAX_UNVERIFIED_EACH);
  // One of those sends again: its latest, in its place.
  held = withUnverified(held, packet(50), acct, peer(2), 4000);
  assert.deepEqual(held.map((u) => [u.peer, u.at]), [[peer(0), 2500], [peer(1), 3001], [peer(3), 3003], [peer(2), 4000]]);
  // From many accounts: MAX_UNVERIFIED in all, those that came first; those of one account not
  // pushed out by another's.
  for (let n = 0; n < MAX_UNVERIFIED + 3; n++) held = withUnverified(held, packet(100 + n), id(20 + n), peer(1), 5000 + n);
  assert.equal(held.length, MAX_UNVERIFIED);
  assert.deepEqual(held.filter((u) => u.acct === acct).map((u) => u.peer), [0, 1, 3, 2].map(peer));
  assert.equal(held.at(-1)!.at, 5000 + MAX_UNVERIFIED - MAX_UNVERIFIED_EACH - 1);
  // Too old, they make room.
  const late = 5000 + MAX_UNVERIFIED + 3 + UNVERIFIED_LASTS;
  assert.deepEqual(withUnverified(held, 'Tg==', acct, peer(0), late), [{ packet: 'Tg==', acct, peer: peer(0), at: late }]);
});

test('a linked device\'s first packets from contacts it does not know yet: each once, the latest of each, a few, not for ever, and none pushes out another\'s', () => {
  const who = (n: number) => (n + 0x30).toString(16).padStart(2, '0').repeat(32);
  const packet = (n: number) => toBase64Url(new Uint8Array([n]));
  let held = withEarlyFirst(undefined, 'UA==', who(0), 1000);
  held = withEarlyFirst(held, 'UA==', who(0), 2000);
  assert.deepEqual(held, [{ packet: 'UA==', identity: who(0), at: 2000 }]);
  held = withEarlyFirst(held, 'Ug==', who(0), 2500);
  assert.deepEqual(held, [{ packet: 'Ug==', identity: who(0), at: 2500 }]);
  // Made up under as many identities as one likes, the first MAX_EARLY stay.
  for (let n = 1; n <= MAX_EARLY + 5; n++) held = withEarlyFirst(held, packet(n), who(n), 3000 + n);
  assert.deepEqual(held.map((e) => e.identity), Array.from({ length: MAX_EARLY }, (_, n) => who(n)));
  // One of those again: its latest, in its place.
  held = withEarlyFirst(held, packet(60), who(1), 4000);
  assert.deepEqual([held.length, held.at(-1)], [MAX_EARLY, { packet: packet(60), identity: who(1), at: 4000 }]);
  const late = 4000 + EARLY_LASTS;
  assert.deepEqual(withEarlyFirst(held, 'Tg==', who(99), late), [{ packet: 'Tg==', identity: who(99), at: late }]);
});

test('what a linked device is told of a contact\'s devices, and what it keeps of it', () => {
  const carol = id(5);
  const [a, b] = [id(6), id(7)];
  const contact = { identity: carol, name: '', timer: 0, timerAt: 0 } as unknown as Contact;
  const first = listOf(carol, 10, [
    { i: a, b: 'QQ' },
    { i: b, b: 'Qg' },
  ]);
  // Knows nothing of devices: nothing to say.
  assert.equal(wayOf(contact, RELAY), null);
  // Holds none of theirs: only which of this account's they hold.
  assert.deepEqual(wayOf({ ...contact, dv: 3 }, RELAY), { dv: 3 });
  // With their list, where each endpoint reads, on the primary's relay when their messages say none.
  const known: Contact = { ...contact, dv: 3, list: { b: first.b, s: first.s, n: 10 }, endpoints: [{ ...blankWay(a, 'QQ', route()), relay: '' }, blankWay(b, 'Qg')] };
  const said = wayOf(known, 'wss://primary.example.org')!;
  assert.deepEqual(said, { dv: 3, list: { b: first.b, s: first.s, r: { [a]: route(SENDER, 'wss://primary.example.org') } } });
  // Kept on the device: the list and a way to each endpoint, talked to or not.
  const onDevice = withWay(contact, said);
  assert.deepEqual([onDevice.dv, onDevice.list, onDevice.endpoints?.map((w) => [w.id, w.sender])], [3, { b: first.b, s: first.s, n: 10 }, [[a, SENDER], [b, '']]]);
  // The same list again says where they read now; an older one, or one of another account, nothing.
  const moved = withWay(onDevice, { dv: 4, list: { b: first.b, s: first.s, r: { [b]: route(OTHER) } } });
  assert.deepEqual([moved.dv, moved.endpoints?.map((w) => w.sender)], [4, [SENDER, OTHER]]);
  const older = listOf(carol, 9, [{ i: a, b: 'QQ' }]);
  assert.deepEqual(withWay(moved, { dv: 4, list: older }).endpoints, moved.endpoints);
  const someoneElse = listOf(id(8), 11, [{ i: a, b: 'QQ' }]);
  assert.deepEqual(withWay(moved, { dv: 5, list: someoneElse }), { ...moved, dv: 5 });
  // A later one: the ways to the endpoints it still names stay.
  const later = listOf(carol, 12, [{ i: b, b: 'Qg' }]);
  assert.deepEqual(withWay(moved, { dv: 5, list: later }).endpoints, [moved.endpoints![1]]);
  // Said with no `dv`: what was kept of their devices goes, and this device's own way to them.
  const direct = { ...blankWay(carol, '', route()), conversations: ['Y29udg=='] };
  const bare = withWay({ ...moved, direct }, {});
  assert.deepEqual(['dv' in bare, 'list' in bare, 'endpoints' in bare, 'direct' in bare], [false, false, false, false]);
});

test('the link says what the phone knows of a contact\'s devices, and what came to a device; what is not that is nothing', () => {
  const parts = new Parts();
  const travel = (envelope: Envelope) => {
    let out: unknown = null;
    for (const bytes of encodeEnvelope(envelope, null)) out = parts.take('p', bytes);
    return out;
  };
  const list = listOf(id(5), 10, [{ i: id(6), b: 'QQ' }]);
  const way: Envelope = { k: 'way', c: id(5), dv: 2, list: { b: list.b, s: list.s, r: { [id(6)]: route() } } };
  assert.deepEqual(travel(way), way);
  assert.deepEqual(travel({ k: 'way', c: id(5) }), { k: 'way', c: id(5) });
  const came: Envelope = { k: 'came', c: id(5), got: ['aaaaaaaaaaaa', 'bbbbbbbbbbbb'] };
  assert.deepEqual(travel(came), came);
  const raw = (value: object) => parts.take('p', new TextEncoder().encode(JSON.stringify({ v: 1, ...value })));
  assert.equal(raw({ k: 'way', c: 'x', dv: 1 }), null);
  assert.deepEqual(raw({ k: 'way', c: id(5), dv: -1, list: { b: '' } }), { k: 'way', c: id(5) });
  assert.equal(raw({ k: 'came', c: id(5), got: ['not a tag'] }), null);
  const many = Array.from({ length: 250 }, (_, n) => n.toString(16).padStart(12, '0'));
  assert.equal((raw({ k: 'came', c: id(5), got: many }) as { got: string[] }).got.length, 200);
});

test('what the chat keeps of contacts\' devices and of the copies that wait: what is of the wrong shape is left out', async () => {
  files.clear();
  const key = randomBytes(32);
  const kept = (data: E2EData) => saveE2EData('space', 0, key, data).then(() => loadE2EData('space', 0, key));
  const way = { ...blankWay(id(6), 'QQ', route()), conversations: ['Y29udg==', ''], first: 'Zmlyc3Q=', seen: ['ee'.repeat(16)] };
  const direct = { ...blankWay(id(5), '', route()), conversations: ['Y29udg=='] };
  const contact = {
    identity: id(5), sender: SENDER, relay: RELAY, relayKey: '', spare: null, conversations: ['Y29udg=='], first: '', name: '', timer: 0, timerAt: 0, request: false,
    look: null, avatar: null, hide: false, heldGot: [], heldRead: [], phone: '', ownIdentity: '', seen: [], packetKey: '', sealTo: '', sealsIn: false,
    dv: 3, list: { b: 'Ym9keQ', s: 'c2ln', n: 10 }, endpoints: [{ ...way, again: 4321 }, { ...way, id: 'x' }], direct, listSent: 1234,
    took: [{ t: 'aaaaaaaaaaaa', at: 5 }, { t: 'bbbbbbbbbbbb', at: 3 * TOOK_DAY + 6, p: [0, 2, -1, 1.5, 'x'], two: true }, { t: 'dddddddddddd', at: 7, two: 'yes' }, 'aaaaaaaaaaaa', { t: 'not a tag', at: 7 }, { t: 'cccccccccccc' }, 7],
  } as unknown as Contact;
  const list = { b: 'Ym9keQ', s: 'c2ln', n: 4, real: [id(6)], r: { [id(6)]: { ...route(), pk: KEY }, [id(7)]: route(SENDER, '') }, q: { [id(7)]: OTHER, x: OTHER }, rAt: 99, restore: 'ab'.repeat(16) };
  const unverified = [{ packet: 'UA==', acct: id(5), peer: id(6), at: 5 }, { packet: '', acct: id(5), peer: id(6), at: 5 }, { packet: 'UA==', acct: 'x', peer: id(6), at: 5 }];
  const early = [{ packet: 'UA==', identity: id(5), at: 5 }, { packet: '', identity: id(5), at: 5 }, { packet: 'UA==', identity: 'x', at: 5 }, { packet: 'UA==', identity: id(5) }];
  const back = await kept({ ...EMPTY_E2E, contacts: [contact], list, unverified, early } as unknown as E2EData);
  assert.deepEqual(back.contacts[0].endpoints, [{ ...way, conversations: ['Y29udg=='], again: 4321 }]);
  assert.deepEqual([back.contacts[0].dv, back.contacts[0].list, back.contacts[0].direct, back.contacts[0].listSent, back.contacts[0].took], [
    3,
    contact.list,
    direct,
    1234,
    // Kept with the day each came only, as a version before kept the time to the millisecond.
    [{ t: 'aaaaaaaaaaaa', at: 0 }, { t: 'bbbbbbbbbbbb', at: 3 * TOOK_DAY, p: [0, 2], two: true }, { t: 'dddddddddddd', at: 0 }],
  ]);
  assert.deepEqual(back.list, { ...list, r: { [id(6)]: { ...route(), pk: KEY } }, q: { [id(7)]: OTHER } });
  assert.deepEqual([back.unverified, back.early], [[unverified[0]], [early[0]]]);

  const copy: Copy = { n: 4, c: id(5), w: id(6), p: 'UA==', at: 77, first: true };
  const fanout = { copies: [copy, { ...copy, n: 9, first: undefined }, { ...copy, n: 10, w: 'x' }, { ...copy, n: 11, p: '' }, { ...copy, n: 12, at: 0 }], next: 2 };
  const second = { n: 9, c: id(5), w: id(6), p: 'UA==', at: 77 };
  assert.deepEqual(await saveFanoutData('space', 0, key, fanout).then(() => loadFanoutData('space', 0, key)), { copies: [copy, second], next: 10 });
  const full = { copies: Array.from({ length: MAX_COPIES + 5 }, (_, n) => ({ ...copy, n: n + 1 })), next: 1 };
  const loaded = await saveFanoutData('space', 0, key, full).then(() => loadFanoutData('space', 0, key));
  assert.deepEqual([loaded.copies.length, loaded.copies[0].n, loaded.next], [MAX_COPIES, 6, MAX_COPIES + 6]);
  assert.deepEqual(await loadFanoutData('space', 1, key), EMPTY_FANOUT);
});
