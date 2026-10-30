// The lock and the spaces, checked the way LPHL FASOULI's config.test.ts checks its own.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { deriveKey, encryptText, fromHex, HARD, hardCost, randomBytes, setHardCost, setPbkdf2, sha256Bytes, toBase64, toHex, webCryptoPbkdf2 } from '../lib/crypto';
import { setCore } from '../lib/core';
import {
  hardenLock,
  isPasswordLocked,
  loadLockConfig,
  lockWithPassword,
  removePasswordLock,
  removeSecondPassword,
  SamePasswordError,
  setLockPassword,
  SLOTS,
  unlock,
} from '../lock/config';
import { MIN_PIN, openHidden, prepareHidden, removeHiddenPassword, searchHidden, setHiddenPassword } from '../lock/hidden';
import { loadOpenKey, saveOpenKey } from '../lock/keys';
import { EMPTY_SPACE, firstSpaceKey, loadHiddenData, loadSpaceData, NOSTR_DEFAULT, prepareSpaces, saveHiddenData, saveSpaceData } from '../lock/space-data';
import { POCKETS } from '../lock/sealed-file';
import { assertNotLockedOut, FREE_TRIES, LockedOutError, SEARCH_TRIES } from '../lock/tries';
import { store } from './secure-memory';
import { useWasmCore } from './wasm-core';

const core = useWasmCore();
// Argon2id at a small cost, so the many unlocks here run quick; its full cost has its own check.
setHardCost({ m: 64, t: 1 });

setPbkdf2(webCryptoPbkdf2()!);
// Every check a couple of hours after the one before, so the wait after wrong passwords never
// gets in the way here; it has its own check below.
let clock = Date.now();
const realNow = Date.now;
Date.now = () => (clock += 2 * 3600_000);

const shape = () => (store.get('erevos.lock') ?? '').replace(/"[^"]{16,}"/g, '"…"');
const opened = async (password: string) => {
  const r = await unlock(await loadLockConfig(), password);
  return r && { space: r.space, key: toHex(r.key) };
};
const real = randomBytes(32);
const decoy = randomBytes(32);

const t = (name: string, fn: () => Promise<void>) => test(name, async () => { store.clear(); await fn(); });

// A slot as Erevos sealed it before Argon2id: SHA-256 of PBKDF2's key as its check, and the key
// sealed with that alone. Without a password, an unused one.
const oldSlot = async (password: string | null, key = randomBytes(32)) => {
  const salt = randomBytes(16);
  const k = password === null ? randomBytes(32) : await deriveKey(password, salt, 200_000);
  return { salt: toBase64(salt), iter: 200_000, check: toBase64(password === null ? randomBytes(32) : sha256Bytes(k)), key: encryptText(k, toHex(key)) };
};

// How many times Argon2id runs in `fn`.
const hardCalls = async (fn: () => Promise<unknown>) => {
  if (!core) return -1;
  let calls = 0;
  setCore({ ...core, hardKey: (...args) => { calls++; return core.hardKey!(...args); } });
  try {
    await fn();
  } finally {
    setCore(core);
  }
  return calls;
};

t('opens the real space or the second one, each with its key', async () => {
  assert.equal(await opened('x'), null);
  await setLockPassword(0, 'real-1111', real);
  await setLockPassword(1, 'decoy-2222', decoy);
  assert.deepEqual(await opened('real-1111'), { space: 0, key: toHex(real) });
  assert.deepEqual(await opened('decoy-2222'), { space: 1, key: toHex(decoy) });
  assert.equal(await opened('nope'), null);
  const stored = [...store.values()].join();
  assert.doesNotMatch(stored, /1111|2222/);
  assert.ok(!stored.includes(toHex(real)));
});

t('stores the same, and takes the same work, with or without a second password', async () => {
  await setLockPassword(0, 'real-1111', real);
  const without = shape();
  await setLockPassword(1, 'decoy-2222', decoy);
  assert.equal(shape(), without);
  assert.equal((await loadLockConfig()).slots.length, SLOTS);
  const subtle = globalThis.crypto.subtle as { deriveBits: SubtleCrypto['deriveBits'] };
  const { deriveBits } = subtle;
  let derivations = 0;
  subtle.deriveBits = (...args) => { derivations++; return deriveBits.apply(globalThis.crypto.subtle, args); };
  try {
    const c = await loadLockConfig();
    for (const password of ['real-1111', 'decoy-2222', 'wrong']) {
      derivations = 0;
      const hard = await hardCalls(() => unlock(c, password));
      assert.equal(derivations, SLOTS, password);
      if (core) assert.equal(hard, SLOTS, password);
    }
  } finally {
    subtle.deriveBits = deriveBits;
  }
});

t('a lock from before Argon2id gets it in every slot at once, and opens with the same passwords', async () => {
  const slots = [await oldSlot('real-1111', real), await oldSlot('decoy-2222', decoy), await oldSlot(null), await oldSlot(null)];
  store.set('erevos.lock', JSON.stringify({ slots, direct: null, iter: 200_000 }));
  // As it is, it opens as before.
  assert.deepEqual(await opened('real-1111'), { space: 0, key: toHex(real) });
  await hardenLock();
  const c = await loadLockConfig();
  assert.ok(c.slots.every((slot, i) => slot.hard?.m === hardCost().m && slot.hard.t === hardCost().t && slot.check !== slots[i].check), 'every slot, used or not');
  assert.deepEqual(await opened('real-1111'), { space: 0, key: toHex(real) });
  assert.deepEqual(await opened('decoy-2222'), { space: 1, key: toHex(decoy) });
  assert.equal(await opened('wrong'), null);
  // Done once: nothing changes the second time.
  const after = store.get('erevos.lock');
  if (core) assert.equal(await hardCalls(() => hardenLock()), 0);
  assert.equal(store.get('erevos.lock'), after);
  // It looks as a lock sealed today does, with or without the second password.
  const hardened = shape();
  store.clear();
  await setLockPassword(0, 'real-1111', real);
  assert.equal(shape(), hardened);
});

t('passwords are sealed with Argon2id at its full cost', async () => {
  setHardCost(null);
  try {
    await setLockPassword(0, 'real-1111', real);
    assert.ok((await loadLockConfig()).slots.every((slot) => slot.hard?.m === 32 * 1024 && slot.hard.t === 3 && HARD.m === 32 * 1024));
    assert.deepEqual(await opened('real-1111'), { space: 0, key: toHex(real) });
    assert.equal(await opened('wrong'), null);
  } finally {
    setHardCost({ m: 64, t: 1 });
  }
});

t('what changes the lock waits for every slot to get Argon2id, and leaves none without it', async () => {
  store.set('erevos.lock', JSON.stringify({ slots: [await oldSlot('real-1111', real), await oldSlot(null), await oldSlot(null), await oldSlot(null)], direct: null, iter: 200_000 }));
  await setLockPassword(1, 'decoy-2222', decoy);
  assert.ok((await loadLockConfig()).slots.every((slot) => slot.hard));
  assert.deepEqual(await opened('real-1111'), { space: 0, key: toHex(real) });
  assert.deepEqual(await opened('decoy-2222'), { space: 1, key: toHex(decoy) });
});

t('hidden chats from before Argon2id get it in every place of every space, and open with the same PIN', async () => {
  await setLockPassword(0, 'real-1111', real);
  const key = randomBytes(32);
  const before = await Promise.all(Array.from({ length: SLOTS }, (_, space) => oldSlot(space === 0 ? 'pin-1111' : null, key)));
  store.set('erevos.hidden-lock.1', JSON.stringify(before));
  for (const name of ['erevos.hidden-lock', 'erevos.hidden-lock.2', 'erevos.hidden-lock.3']) {
    store.set(name, JSON.stringify(await Promise.all(Array.from({ length: SLOTS }, () => oldSlot(null)))));
  }
  assert.deepEqual(await searchHidden(0, 'pin-1111'), { key, pocket: 1 });
  assert.equal(await searchHidden(1, 'pin-1111'), null);
  for (const name of ['erevos.hidden-lock', 'erevos.hidden-lock.1', 'erevos.hidden-lock.2', 'erevos.hidden-lock.3']) {
    const values = JSON.parse(store.get(name)!) as { hard?: { m: number } }[];
    assert.ok(values.length >= SLOTS && values.every((value) => value.hard?.m === hardCost().m), name);
  }
  assert.deepEqual(await openHidden(0, 'pin-1111'), { key, pocket: 1 });
});

t('refuses a password another space already uses', async () => {
  await setLockPassword(0, 'same', real);
  await assert.rejects(setLockPassword(1, 'same', decoy), SamePasswordError);
  await setLockPassword(1, 'other', decoy);
  await assert.rejects(setLockPassword(0, 'other', real), SamePasswordError);
  await setLockPassword(0, 'same', real);
});

t('lets the second space set a second password of its own', async () => {
  const third = randomBytes(32);
  await setLockPassword(0, 'a1', real);
  await setLockPassword(1, 'b2', decoy);
  await setLockPassword(2, 'c3', third);
  assert.deepEqual(await opened('c3'), { space: 2, key: toHex(third) });
});

t('removes the second password (and any set beyond it) or the whole lock', async () => {
  await setLockPassword(0, 'a1', real);
  await setLockPassword(1, 'b2', decoy);
  await setLockPassword(2, 'c3', randomBytes(32));
  await removeSecondPassword(0);
  assert.equal(await opened('b2'), null);
  assert.equal(await opened('c3'), null);
  assert.equal((await opened('a1'))?.space, 0);
  assert.equal((await loadLockConfig()).slots.length, SLOTS);
  await removePasswordLock(0, real);
  const c = await loadLockConfig();
  assert.equal(isPasswordLocked(c), false);
  assert.deepEqual(c.slots, []);
  assert.deepEqual(await loadOpenKey(0), real);
});

t('turned off in the second space, opens that space and keeps the real one locked', async () => {
  await setLockPassword(0, 'real-1111', real);
  await setLockPassword(1, 'decoy-2222', decoy);
  await removePasswordLock(1, decoy);
  let c = await loadLockConfig();
  assert.equal(c.direct, 1);
  assert.equal(isPasswordLocked(c), false);
  assert.deepEqual(await loadOpenKey(1), decoy);
  assert.notDeepEqual(await loadOpenKey(0), real);

  assert.equal(await lockWithPassword(1, 'new-3333', decoy), null);
  c = await loadLockConfig();
  assert.equal(isPasswordLocked(c), true);
  assert.notDeepEqual(await loadOpenKey(1), decoy);
  assert.deepEqual(await opened('new-3333'), { space: 1, key: toHex(decoy) });
  assert.equal(await opened('decoy-2222'), null);

  await removePasswordLock(1, decoy);
  const back = await lockWithPassword(1, 'real-1111', decoy);
  assert.deepEqual(back && { space: back.space, key: toHex(back.key) }, { space: 0, key: toHex(real) });
  c = await loadLockConfig();
  assert.equal(isPasswordLocked(c), true);
  assert.deepEqual(await opened('new-3333'), { space: 1, key: toHex(decoy) });
});

t('first turns the lock on from the real space, moving its key out of the keystore', async () => {
  await saveOpenKey(0, real);
  assert.equal(await lockWithPassword(0, 'real-1111', real), null);
  assert.equal((await loadLockConfig()).slots.length, SLOTS);
  assert.deepEqual(await opened('real-1111'), { space: 0, key: toHex(real) });
  assert.notDeepEqual(await loadOpenKey(0), real);
});

t('seals every slot with the same iteration count', async () => {
  await setLockPassword(0, 'real-1111', real);
  await setLockPassword(1, 'decoy-2222', decoy);
  const c = await loadLockConfig();
  assert.equal(c.iter, 200_000);
  assert.deepEqual(c.slots.map((s) => s.iter), Array(SLOTS).fill(200_000));
});

t('makes wrong passwords wait, longer each time, and a right one ends the wait', async () => {
  await setLockPassword(0, 'real-1111', real);
  // Setting a password that opens no space counted as a miss too (it is compared with every slot).
  store.delete('erevos.lock-tries');
  const c = await loadLockConfig();
  const now = realNow();
  for (let i = 0; i < FREE_TRIES - 1; i++) assert.equal(await unlock(c, 'wrong', now), null);
  assert.equal(await unlock(c, 'wrong', now), null);
  await assert.rejects(unlock(c, 'real-1111', now + 1000), LockedOutError);
  assert.equal(await unlock(c, 'wrong', now + 31_000), null);
  await assert.rejects(unlock(c, 'real-1111', now + 31_000 + 59_000), LockedOutError);
  assert.equal((await unlock(c, 'real-1111', now + 31_000 + 61_000))?.space, 0);
  assert.equal(await unlock(c, 'wrong', now + 31_000 + 62_000), null);
  // The count started over, so this one is free again.
  assert.equal((await unlock(c, 'real-1111', now + 31_000 + 63_000))?.space, 0);
});

t('a first start moves the chat settings kept before spaces into the first space, sealed', async () => {
  const older = { url: 'ws://172.22.140.150:7879', token: 't0ken', ownQueue: { recipientHex: 'a'.repeat(48), senderHex: 'b'.repeat(48) }, routes: { 'relay:x': 'c'.repeat(48) } };
  store.set('erevos.relay', JSON.stringify(older));
  const key = await firstSpaceKey();
  assert.equal(store.has('erevos.relay'), false);
  assert.deepEqual(await loadSpaceData(0, key), { ...older, via: '', viaToken: '', look: null, tor: 'messages', bridges: { use: 'none', own: '' }, spare: { url: '', token: '', queue: null }, push: false, pushLeft: false, previews: false, lend: { relay: '', ticket: '' }, offered: { relay: '', code: '', until: 0, from: '' }, ringQueue: null, ownToken: { relay: '', hash: '' }, nostr: NOSTR_DEFAULT, relayKeys: {}, stopped: 0 });
  assert.ok(!store.get('erevos.space.0')!.includes('t0ken'));
  // The next start finds the same key.
  assert.deepEqual(await firstSpaceKey(), key);
});

t('a space keeps which token it got as its own from which relay, and nothing of another shape', async () => {
  const key = await firstSpaceKey();
  const own = { relay: 'wss://relay.example.org', hash: 'ab'.repeat(32) };
  await saveSpaceData(0, key, { ...EMPTY_SPACE, url: own.relay, token: 'mine', ownToken: own });
  assert.deepEqual((await loadSpaceData(0, key)).ownToken, own);
  await saveSpaceData(0, key, { ...EMPTY_SPACE, ownToken: { relay: own.relay, hash: 'mine' } });
  assert.deepEqual((await loadSpaceData(0, key)).ownToken, { relay: '', hash: '' });
  // The keys its relays proved (lib/relay.ts, pinRelay): whole ones only, and only for the relays it uses.
  const proven = 'ab'.repeat(32);
  await saveSpaceData(0, key, { ...EMPTY_SPACE, url: 'wss://Relay.example.org/', relayKeys: { 'wss://relay.example.org': proven, 'wss://other.example.org': proven } });
  assert.deepEqual((await loadSpaceData(0, key)).relayKeys, { 'wss://relay.example.org': proven });
  await saveSpaceData(0, key, { ...EMPTY_SPACE, url: 'wss://relay.example.org', relayKeys: { 'wss://relay.example.org': 'ab' } });
  assert.deepEqual((await loadSpaceData(0, key)).relayKeys, {});
  await saveSpaceData(0, key, EMPTY_SPACE);
});

t('each space sees only its own data, and every entry looks alike', async () => {
  const key0 = await firstSpaceKey();
  await saveSpaceData(0, key0, { ...EMPTY_SPACE, url: 'wss://relay.example.org', token: 'secret' });
  await lockWithPassword(0, 'real-1111', key0);
  await prepareSpaces(1);
  const sizes = () => [0, 1, 2, 3].map((i) => store.get(`erevos.space.${i}`)?.length);
  const before = sizes();
  assert.ok(before.every((n) => n === before[0]), `entries differ: ${before}`);
  // A second password: a new, empty space with its own key.
  const key1 = randomBytes(32);
  await setLockPassword(1, 'decoy-2222', key1);
  await saveSpaceData(1, key1, EMPTY_SPACE);
  await prepareSpaces(2);
  assert.deepEqual(sizes(), before);
  const one = await opened('decoy-2222');
  assert.deepEqual(await loadSpaceData(1, randomBytes(32)), EMPTY_SPACE);
  assert.deepEqual(await loadSpaceData(1, fromHex(one!.key)), EMPTY_SPACE);
  const zero = await opened('real-1111');
  assert.equal((await loadSpaceData(0, fromHex(zero!.key))).token, 'secret');
  // The second space's key does not open the first one.
  assert.equal((await loadSpaceData(0, key1)).token, '');
  // The keystore entries are the same set as before the second password.
  assert.deepEqual([...store.keys()].sort(), ['erevos.lock', 'erevos.lock-tries', 'erevos.space-keys', 'erevos.space.0', 'erevos.space.1', 'erevos.space.2', 'erevos.space.3']);
});

const opens = async (space: number, password: string) => (await openHidden(space, password))?.key ?? null;

t('hidden chats open only with their own password, in each space', async () => {
  await setLockPassword(0, 'real-1111', real);
  await setLockPassword(1, 'decoy-2222', decoy);
  await prepareHidden();
  assert.equal(await openHidden(0, 'secret-0'), null);
  const hidden0 = await setHiddenPassword(0, 0, 'secret-0', null);
  const hidden1 = await setHiddenPassword(1, 0, 'secret-1', null);
  assert.deepEqual(await opens(0, 'secret-0'), hidden0);
  assert.deepEqual(await opens(1, 'secret-1'), hidden1);
  // Each space's hidden chats open only there.
  assert.equal(await openHidden(1, 'secret-0'), null);
  assert.equal(await openHidden(0, 'secret-1'), null);
  await saveHiddenData(0, 0, hidden0, { ...EMPTY_SPACE, url: 'wss://hidden.example.org' });
  assert.equal((await loadHiddenData(0, 0, hidden0)).url, 'wss://hidden.example.org');
  assert.equal((await loadSpaceData(0, real)).url, '');
});

t('every place of hidden chats has its own PIN and its own data', async () => {
  await setLockPassword(0, 'real-1111', real);
  await prepareHidden();
  const keys = [];
  for (let pocket = 0; pocket < POCKETS; pocket++) {
    const key = await setHiddenPassword(0, pocket, `pin-${pocket}`, null);
    await saveHiddenData(0, pocket, key, { ...EMPTY_SPACE, token: `place ${pocket}` });
    keys.push(key);
  }
  for (let pocket = 0; pocket < POCKETS; pocket++) {
    const place = await openHidden(0, `pin-${pocket}`);
    assert.equal(place?.pocket, pocket);
    assert.deepEqual(place?.key, keys[pocket]);
    assert.equal((await loadHiddenData(0, pocket, keys[pocket])).token, `place ${pocket}`);
    // Another place's key opens nothing of this one.
    assert.equal((await loadHiddenData(0, pocket, keys[(pocket + 1) % POCKETS])).token, '');
  }
  // A PIN that opens one place is refused for another, and for the space itself.
  await assert.rejects(setHiddenPassword(0, 1, 'pin-0', null), SamePasswordError);
  await assert.rejects(setHiddenPassword(0, 1, 'real-1111', null), SamePasswordError);
  // Removing one place leaves the others.
  await removeHiddenPassword(0, 2);
  assert.equal(await openHidden(0, 'pin-2'), null);
  assert.equal((await openHidden(0, 'pin-3'))?.pocket, 3);
});

t('hidden chats look the same, set or not, and take the same work to try', async () => {
  await setLockPassword(0, 'real-1111', real);
  await prepareHidden();
  const before = new Map(store);
  await setHiddenPassword(0, 2, 'secret-0', null);
  assert.deepEqual([...store.keys()].sort(), [...before.keys()].sort());
  for (const name of ['erevos.hidden-lock', 'erevos.hidden-lock.2', 'erevos.hidden.0', 'erevos.hidden2.0']) {
    assert.equal(store.get(name)!.length, before.get(name)!.length, name);
  }
  const subtle = globalThis.crypto.subtle as { deriveBits: SubtleCrypto['deriveBits'] };
  const { deriveBits } = subtle;
  let derivations = 0;
  subtle.deriveBits = (...args) => {
    derivations++;
    return deriveBits.apply(globalThis.crypto.subtle, args);
  };
  try {
    // Every place is tried, whichever opens.
    for (const [space, password] of [[0, 'secret-0'], [0, 'wrong'], [2, 'wrong']] as const) {
      derivations = 0;
      const hard = await hardCalls(() => openHidden(space, password));
      assert.equal(derivations, POCKETS, `${space} ${password}`);
      if (core) assert.equal(hard, POCKETS, `${space} ${password}`);
    }
  } finally {
    subtle.deriveBits = deriveBits;
  }
});

t('a new hidden password starts empty, changing it keeps them, removing it closes them', async () => {
  await prepareHidden();
  const first = await setHiddenPassword(0, 1, 'secret-0', null);
  await saveHiddenData(0, 1, first, { ...EMPTY_SPACE, token: 'kept' });
  // Changed from inside: same key, same chats.
  assert.deepEqual(await setHiddenPassword(0, 1, 'secret-new', first), first);
  assert.equal(await openHidden(0, 'secret-0'), null);
  assert.equal((await loadHiddenData(0, 1, (await opens(0, 'secret-new'))!)).token, 'kept');
  // Set anew from the settings: a new, empty set of hidden chats.
  const second = await setHiddenPassword(0, 1, 'secret-0', null);
  assert.notDeepEqual(second, first);
  assert.equal((await loadHiddenData(0, 1, second)).token, '');
  assert.equal(await openHidden(0, 'secret-new'), null);
  await removeHiddenPassword(0, 1);
  assert.equal(await openHidden(0, 'secret-0'), null);
});

t('refuses the space\'s own password for its hidden chats', async () => {
  await setLockPassword(0, 'real-1111', real);
  await assert.rejects(setHiddenPassword(0, 0, 'real-1111', null), SamePasswordError);
  await setHiddenPassword(0, 0, 'other', null);
});

t('hidden chats open from a search with their PIN, and a wrong one is only a search', async () => {
  await setLockPassword(0, 'real-1111', real);
  await setLockPassword(1, 'decoy-2222', decoy);
  await prepareHidden();
  const key = await setHiddenPassword(0, 3, 'pin-0', null);
  assert.deepEqual(await searchHidden(0, 'pin-0'), { key, pocket: 3 });
  assert.equal(await searchHidden(1, 'pin-0'), null);
  // Short searches are never tried.
  assert.equal(await searchHidden(0, 'pin-0'.slice(0, MIN_PIN - 1)), null);
  // Wrong searches count apart from the lock screen's tries: it never waits for them.
  const now = Date.now();
  for (let i = 0; i < FREE_TRIES + 1; i++) assert.equal(await searchHidden(0, `search ${i}`, now), null);
  await assertNotLockedOut(now);
  await assert.rejects(assertNotLockedOut(now, SEARCH_TRIES), LockedOutError);
  // While searches wait, even the right PIN opens nothing, and says nothing.
  assert.equal(await searchHidden(0, 'pin-0', now + 1), null);
  assert.deepEqual((await searchHidden(0, 'pin-0', now + 7 * 24 * 3600_000))?.key, key);
});
