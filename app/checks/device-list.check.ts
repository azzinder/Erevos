// The account's device list (lib/device-list.ts, docs/multi-device.md) with the real Rust core,
// built to WebAssembly by checks/build-core.mjs: its body in its one form, signed by the account and
// checked against its bundle, what is refused, the places no device takes filled and kept from one
// list to the next, the link's two envelopes for it (lib/link-wire.ts), and what the chat keeps of
// it (lock/e2e-data.ts). Skipped, with a note, when that build is missing.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { accountBundle, accountIdentity, accountSign, newAccount } from '../lib/core';
import { randomBytes, toHex, utf8Decode, utf8Encode } from '../lib/crypto';
import { bodyBytes, bodyOf, checkedList, MAX_LISTED, nextList, nextN, PAD_LIST, readBody, signList, verifyList, type Body, type Entry } from '../lib/device-list';
import { fromBase64Url, toBase64Url } from '../lib/e2e';
import { encodeEnvelope, Parts, type Envelope } from '../lib/link-wire';
import { EMPTY_E2E, loadE2EData, saveE2EData, type E2EData, type OwnList } from '../lock/e2e-data';
import { files } from './files-memory';
import { useWasmCore } from './wasm-core';

const ready = useWasmCore() !== null;
if (!ready) console.log('Skipping the device list checks: build the core first with node checks/build-core.mjs');

const t = (name: string, fn: () => Promise<void>) => test(name, { skip: !ready }, fn);

// An account as the core makes one: its secret, identity (hex) and bundle.
async function account() {
  const secret = await newAccount();
  const bundle = await accountBundle(secret);
  const id = toHex(await accountIdentity(secret));
  const entry: Entry = { i: id, b: toBase64Url(bundle), f: 0 };
  return { secret, id, bundle, entry };
}

const signer = (secret: Uint8Array) => (context: string, message: Uint8Array) => accountSign(secret, context, message);

// What a list kept on the phone is, from a body it signed and its devices' endpoints.
async function kept(secret: Uint8Array, body: Body, real: string[]): Promise<OwnList> {
  const list = await signList(signer(secret), body);
  return { b: list.b, s: list.s, n: body.n, real };
}

t('a list is one form of bytes only, and the account signs it', async () => {
  const a = 'aa'.repeat(32);
  const one: Entry = { i: 'cc'.repeat(32), b: 'Bundle_1-x', f: 0 };
  const two: Entry = { i: 'bb'.repeat(32), b: 'Bundle_2', f: 3 };
  // Keys in their order, endpoints by identity, whatever order they were given in.
  const bytes = bodyBytes({ a, n: 1700000000000, d: [one, two] });
  assert.equal(utf8Decode(bytes), `{"t":"erevos devices","v":1,"a":"${a}","n":1700000000000,"d":[{"i":"${two.i}","b":"Bundle_2","f":3},{"i":"${one.i}","b":"Bundle_1-x","f":0}]}`);
  assert.deepEqual(readBody(bytes), { a, n: 1700000000000, d: [two, one] });
  assert.deepEqual(bodyBytes({ a, n: 1700000000000, d: [two, one] }), bytes);
  // Any other form of the same list is not one: keys in another order, one more, spaces, endpoints
  // not sorted, a number that is not a whole one, or what is not a list at all.
  const text = utf8Decode(bytes);
  for (const other of [
    text.replace('"t":"erevos devices","v":1', '"v":1,"t":"erevos devices"'),
    text.replace('"v":1,', '"v":1,"x":0,'),
    text.replace('"n":', '"n": '),
    `{"t":"erevos devices","v":1,"a":"${a}","n":1700000000000,"d":[{"i":"${one.i}","b":"Bundle_1-x","f":0},{"i":"${two.i}","b":"Bundle_2","f":3}]}`,
    text.replace('"n":1700000000000', '"n":1.5'),
    text.replace('"v":1', '"v":2'),
    text.replace('"f":3', '"f":"3"'),
    'not json',
  ]) {
    assert.equal(readBody(utf8Encode(other)), null, other);
  }
  // Each list is later than the one before, and than any signed before now.
  assert.equal(nextN(5, 3), 6);
  assert.equal(nextN(5, 900), 900);

  // Signed by the account: its bundle checks it, and says what it says.
  const owner = await account();
  const device = await account();
  const body: Body = { a: owner.id, n: 10, d: [device.entry] };
  const list = await signList(signer(owner.secret), body);
  assert.deepEqual(fromBase64Url(list.b), bodyBytes(body));
  assert.deepEqual(await verifyList(owner.bundle, owner.id, list), body);
  assert.deepEqual(bodyOf(list), body);
});

t('a list that does not hold, or is not later, is refused', async () => {
  const owner = await account();
  const other = await account();
  const [one, two] = [await account(), await account()];
  const signed = (body: Body, by = owner.secret) => signList(signer(by), body);
  const list = await signed({ a: owner.id, n: 10, d: [one.entry, two.entry] });
  // Held already: nothing to do; an older one is refused.
  assert.equal(await verifyList(owner.bundle, owner.id, list, 10), 'same');
  assert.equal(await verifyList(owner.bundle, owner.id, list, 11), null);
  assert.ok(await verifyList(owner.bundle, owner.id, list, 9));
  // Signed by another account: refused against the account's bundle, and as the account's against
  // the other's, even when it says it is the account's.
  const forged = await signed({ a: owner.id, n: 11, d: [one.entry] }, other.secret);
  assert.equal(await verifyList(owner.bundle, owner.id, forged), null);
  assert.equal(await verifyList(other.bundle, owner.id, forged), null);
  // One that names another account than the bundle's.
  assert.equal(await verifyList(owner.bundle, owner.id, await signed({ a: other.id, n: 11, d: [] })), null);
  // A body changed after it was signed, or a signature from another body.
  const changed = { ...list, b: toBase64Url(bodyBytes({ a: owner.id, n: 11, d: [one.entry, two.entry] })) };
  assert.equal(await verifyList(owner.bundle, owner.id, changed), null);
  // An endpoint whose bundle is another's, or does not hold; the account's own; one named twice;
  // more than MAX_LISTED.
  assert.equal(await verifyList(owner.bundle, owner.id, await signed({ a: owner.id, n: 11, d: [{ ...one.entry, b: two.entry.b }] })), null);
  assert.equal(await verifyList(owner.bundle, owner.id, await signed({ a: owner.id, n: 11, d: [{ ...one.entry, b: 'AAAA' }] })), null);
  assert.equal(await verifyList(owner.bundle, owner.id, await signed({ a: owner.id, n: 11, d: [owner.entry, one.entry] })), null);
  assert.equal(await verifyList(owner.bundle, owner.id, await signed({ a: owner.id, n: 11, d: [one.entry, one.entry] })), null);
  const five = await Promise.all(Array.from({ length: MAX_LISTED + 1 }, () => account()));
  assert.equal(await verifyList(owner.bundle, owner.id, await signed({ a: owner.id, n: 11, d: five.map((x) => x.entry) })), null);
  assert.ok(await verifyList(owner.bundle, owner.id, await signed({ a: owner.id, n: 11, d: five.slice(0, MAX_LISTED).map((x) => x.entry) })));
});

t('every list has its places filled, and keeps the endpoints that fill them while it has room', async () => {
  assert.equal(PAD_LIST, true);
  const owner = await account();
  const [dell, mac] = [await account(), await account()];
  const devices = (...xs: { id: string; entry: Entry }[]) => xs.map((x) => ({ id: x.id, bundle: x.entry.b }));
  const ids = (body: Body) => body.d.map((e) => e.i);

  // One device: three endpoints made only for the list beside it, all of them checking as any, sorted.
  const first = await nextList(owner.id, devices(dell), null, { now: 100 });
  assert.equal(first.d.length, MAX_LISTED);
  assert.ok(ids(first).includes(dell.id));
  assert.deepEqual(ids(first), [...ids(first)].sort());
  assert.equal(first.n, 100);
  assert.ok(first.d.every((e) => e.f === first.d[0].f));
  assert.ok(await verifyList(owner.bundle, owner.id, await signList(signer(owner.secret), first)));
  const filling = ids(first).filter((id) => id !== dell.id);

  // A second device takes one of their places; the others stay.
  const second = await nextList(owner.id, devices(dell, mac), await kept(owner.secret, first, [dell.id]), { now: 50 });
  assert.equal(second.n, 101);
  assert.equal(second.d.length, MAX_LISTED);
  assert.ok(ids(second).includes(dell.id) && ids(second).includes(mac.id));
  assert.equal(ids(second).filter((id) => filling.includes(id)).length, MAX_LISTED - 2);

  // Unlinked, a device's endpoint fills no place: a new one does, and the others stay.
  const third = await nextList(owner.id, devices(mac), await kept(owner.secret, second, [dell.id, mac.id]), { now: 50 });
  assert.equal(third.d.length, MAX_LISTED);
  assert.ok(!ids(third).includes(dell.id) && ids(third).includes(mac.id));
  const stayed = ids(second).filter((id) => id !== dell.id && id !== mac.id);
  assert.ok(stayed.every((id) => ids(third).includes(id)));

  // Signed again with the same devices, the list is the same but for its `n`.
  const again = await nextList(owner.id, devices(mac), await kept(owner.secret, third, [mac.id]), { now: 50 });
  assert.deepEqual(ids(again), ids(third));
  assert.equal(again.n, third.n + 1);

  // Put back elsewhere, with no device linked: none of its devices stays, the filling ones do.
  const none = await nextList(owner.id, [], await kept(owner.secret, again, [mac.id]), { now: 50 });
  assert.equal(none.d.length, MAX_LISTED);
  assert.ok(!ids(none).includes(mac.id));
  assert.ok(ids(again).filter((id) => id !== mac.id).every((id) => ids(none).includes(id)));

  // Without filling, a list names its devices only.
  assert.deepEqual(ids(await nextList(owner.id, devices(mac), null, { pad: false })), [mac.id]);
  assert.deepEqual((await nextList(owner.id, [], null, { pad: false })).d, []);
});

t('the link carries a device\'s endpoint and the list, and a kind it does not know is nothing', async () => {
  const owner = await account();
  const device = await account();
  const list = await signList(signer(owner.secret), { a: owner.id, n: 7, d: [device.entry] });
  const parts = new Parts();
  const travel = (envelope: Envelope) => {
    let out: unknown = null;
    for (const bytes of encodeEnvelope(envelope, null)) out = parts.take('p', bytes);
    return out;
  };
  const endpoint: Envelope = { k: 'endpoint', bundle: device.entry.b };
  assert.deepEqual(travel(endpoint), endpoint);
  const told: Envelope = { k: 'list', list, ak: toBase64Url(owner.bundle), real: [device.id] };
  assert.deepEqual(travel(told), told);
  // Where each endpoint reads goes with it, unsigned; what is not that is left out.
  const route = { s: 'ab'.repeat(24), relay: 'wss://relay.example.org', rk: '' };
  const routed: Envelope = { k: 'list', list: { ...list, r: { [device.id]: route } }, ak: toBase64Url(owner.bundle) };
  assert.deepEqual(travel(routed), routed);
  assert.deepEqual(checkedList({ ...list, r: { [device.id]: { ...route, s: 'x' }, nobody: route } }), list);
  // What is not one is nothing.
  const raw = (value: object) => parts.take('p', utf8Encode(JSON.stringify({ v: 1, ...value })));
  assert.equal(raw({ k: 'endpoint', bundle: 'not a bundle!' }), null);
  assert.equal(raw({ k: 'endpoint' }), null);
  assert.equal(raw({ k: 'list', list: { b: list.b }, ak: told.ak }), null);
  assert.equal(raw({ k: 'list', list, ak: '' }), null);
  assert.deepEqual(raw({ k: 'list', list, ak: told.ak, real: ['x', device.id] }), { ...told, real: [device.id] });
  assert.equal(raw({ k: 'devices', list }), null);
});

test('what the chat keeps of it: what was kept before loads, and what is of the wrong shape is left out', async () => {
  files.clear();
  const key = randomBytes(32);
  const kept = (data: E2EData) => saveE2EData('space', 0, key, data).then(() => loadE2EData('space', 0, key));
  // Kept before endpoints: as it was, with none of them.
  const before = { ...EMPTY_E2E, account: 'QUJDRA==' };
  assert.deepEqual(await kept(before), before);
  const list: OwnList = { b: 'Ym9keQ', s: 'c2lnbmF0dXJl', n: 5, real: ['aa'.repeat(32)] };
  const own = { identity: 'bb'.repeat(32), bundle: 'YnVuZGxl', list };
  const all = { ...before, endpoint: 'RU5EUE9JTlQ=', own, list };
  assert.deepEqual(await kept(all), all);
  // A list of the wrong shape is none; an account's that is not one goes, list and all.
  const wrong = { ...all, endpoint: 'not base64!', own: { ...own, list: { ...list, n: 0 } }, list: { ...list, b: '' } };
  assert.deepEqual(await kept(wrong), { ...before, own: { ...own, list: null } });
  const { own: _own, ...ownless } = all;
  assert.deepEqual(await kept({ ...all, own: { ...own, identity: 'x' }, list: { ...list, real: ['x', 'cc'.repeat(32)] } }), { ...ownless, list: { ...list, real: ['cc'.repeat(32)] } });
});
