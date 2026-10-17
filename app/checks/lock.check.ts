// The lock and the spaces, checked the way LPHL FASOULI's config.test.ts checks its own.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { fromHex, randomBytes, setPbkdf2, toHex, webCryptoPbkdf2 } from '../lib/crypto';
import {
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
import { openHidden, prepareHidden, removeHiddenPassword, setHiddenPassword } from '../lock/hidden';
import { loadOpenKey, saveOpenKey } from '../lock/keys';
import { EMPTY_SPACE, firstSpaceKey, loadHiddenData, loadSpaceData, prepareSpaces, saveHiddenData, saveSpaceData } from '../lock/space-data';
import { FREE_TRIES, LockedOutError } from '../lock/tries';
import { store } from './secure-memory';

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
      await unlock(c, password);
      assert.equal(derivations, SLOTS, password);
    }
  } finally {
    subtle.deriveBits = deriveBits;
  }
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
  assert.deepEqual(await loadSpaceData(0, key), { ...older, via: '', viaToken: '', look: null });
  assert.ok(!store.get('erevos.space.0')!.includes('t0ken'));
  // The next start finds the same key.
  assert.deepEqual(await firstSpaceKey(), key);
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

t('hidden chats open only with their own password, in each space', async () => {
  await setLockPassword(0, 'real-1111', real);
  await setLockPassword(1, 'decoy-2222', decoy);
  await prepareHidden();
  assert.equal(await openHidden(0, 'secret-0'), null);
  const hidden0 = await setHiddenPassword(0, 'secret-0', null);
  const hidden1 = await setHiddenPassword(1, 'secret-1', null);
  assert.deepEqual(await openHidden(0, 'secret-0'), hidden0);
  assert.deepEqual(await openHidden(1, 'secret-1'), hidden1);
  // Each space's hidden chats open only there.
  assert.equal(await openHidden(1, 'secret-0'), null);
  assert.equal(await openHidden(0, 'secret-1'), null);
  await saveHiddenData(0, hidden0, { ...EMPTY_SPACE, url: 'wss://hidden.example.org' });
  assert.equal((await loadHiddenData(0, hidden0)).url, 'wss://hidden.example.org');
  assert.equal((await loadSpaceData(0, real)).url, '');
});

t('hidden chats look the same, set or not, and take the same work to try', async () => {
  await setLockPassword(0, 'real-1111', real);
  await prepareHidden();
  const before = new Map(store);
  await setHiddenPassword(0, 'secret-0', null);
  assert.deepEqual([...store.keys()].sort(), [...before.keys()].sort());
  for (const name of ['erevos.hidden-lock', 'erevos.hidden.0']) {
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
    for (const [space, password] of [[0, 'secret-0'], [0, 'wrong'], [2, 'wrong']] as const) {
      derivations = 0;
      await openHidden(space, password);
      assert.equal(derivations, 1, `${space} ${password}`);
    }
  } finally {
    subtle.deriveBits = deriveBits;
  }
});

t('a new hidden password starts empty, changing it keeps them, removing it closes them', async () => {
  await prepareHidden();
  const first = await setHiddenPassword(0, 'secret-0', null);
  await saveHiddenData(0, first, { ...EMPTY_SPACE, token: 'kept' });
  // Changed from inside: same key, same chats.
  assert.deepEqual(await setHiddenPassword(0, 'secret-new', first), first);
  assert.equal(await openHidden(0, 'secret-0'), null);
  assert.equal((await loadHiddenData(0, (await openHidden(0, 'secret-new'))!)).token, 'kept');
  // Set anew from the settings: a new, empty set of hidden chats.
  const second = await setHiddenPassword(0, 'secret-0', null);
  assert.notDeepEqual(second, first);
  assert.equal((await loadHiddenData(0, second)).token, '');
  assert.equal(await openHidden(0, 'secret-new'), null);
  await removeHiddenPassword(0);
  assert.equal(await openHidden(0, 'secret-0'), null);
});

t('refuses the space\'s own password for its hidden chats', async () => {
  await setLockPassword(0, 'real-1111', real);
  await assert.rejects(setHiddenPassword(0, 'real-1111', null), SamePasswordError);
  await setHiddenPassword(0, 'other', null);
});
