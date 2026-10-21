// Contacts kept only in Erevos (lib/sealed-contacts.ts, lock/contacts-data.ts): sealed in their
// space or hidden chats, each seen only with its own key, the names they give numbers, and backups.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { EMPTY_FIELDS, type Fields } from '../lib/contacts';
import { randomBytes, setHardCost, setPbkdf2, webCryptoPbkdf2 } from '../lib/crypto';
import { setOpenHiddenPlace } from '../lib/hidden-contacts';
import { linkPhoneContact, linkSealed, loadPlace, placeOf, removeSealed, saveSealed, sealedNames, setSealedPhoto, spacePlace, starSealed } from '../lib/sealed-contacts';
import { loadPhoto } from '../lock/avatar-photos';
import { backupKey, makeBackup, openBackup } from '../lock/backup';
import { FILE, loadContactsData } from '../lock/contacts-data';
import { setCurrentSpace } from '../lock/keys';
import { blobs, files } from './files-memory';
import { store } from './secure-memory';
import { useWasmCore } from './wasm-core';

useWasmCore();
// Argon2id at a small cost, so the many unlocks here run quick; its full cost has its own check.
setHardCost({ m: 64, t: 1 });

setPbkdf2(webCryptoPbkdf2()!);

const t = (name: string, fn: () => Promise<void>) =>
  test(name, async () => {
    store.clear();
    files.clear();
    blobs.clear();
    setOpenHiddenPlace(null);
    setCurrentSpace(null);
    await fn();
  });

const person = (given: string, number = ''): Fields => ({ ...EMPTY_FIELDS, given, phones: number ? [{ value: number, kind: 'mobile', label: '' }] : [] });

const hiddenPlace = (key: Uint8Array) => ({ space: 0, pocket: 1, key, erevos: () => [], messages: () => [], open: () => undefined });

const IDENTITY = 'ab'.repeat(32);

t('a contact is kept sealed in its space, and changed in place', async () => {
  const key = randomBytes(32);
  setCurrentSpace(0, key);
  const id = await saveSealed(spacePlace(), null, person('Eleni', '+30 691 234 5678'));
  await starSealed(spacePlace(), id, true);
  await saveSealed(spacePlace(), id, { ...person('Eleni'), family: 'Papadopoulou' });
  const { contacts } = await loadPlace(spacePlace());
  assert.equal(contacts.length, 1);
  assert.equal(contacts[0].family, 'Papadopoulou');
  assert.deepEqual(contacts[0].phones, []);
  assert.equal(contacts[0].starred, true, 'a change keeps its star');
  assert.ok(!files.get(FILE)?.includes('Eleni'), 'nothing of it is in the file unsealed');
});

t('a contact without a name, number or email is not kept', async () => {
  setCurrentSpace(0, randomBytes(32));
  await assert.rejects(saveSealed(spacePlace(), null, { ...EMPTY_FIELDS, note: 'only a note' }));
  assert.equal((await loadPlace(spacePlace())).contacts.length, 0);
});

t('another space, and the hidden chats, see only their own', async () => {
  const key = randomBytes(32);
  const hiddenKey = randomBytes(32);
  setCurrentSpace(0, key);
  await saveSealed(spacePlace(), null, person('Space'));
  const hidden = placeOf(hiddenPlace(hiddenKey));
  await saveSealed(hidden, null, person('Hidden'));
  assert.deepEqual((await loadPlace(spacePlace())).contacts.map((c) => c.given), ['Space']);
  assert.deepEqual((await loadPlace(hidden)).contacts.map((c) => c.given), ['Hidden']);
  assert.equal((await loadContactsData('space', 1, randomBytes(32))).contacts.length, 0, 'another space finds none');
  assert.equal((await loadContactsData('hidden1', 0, key)).contacts.length, 0, "the space's key opens nothing of the hidden chats");
});

t('the names numbers have: the space, and the hidden chats only while open', async () => {
  const key = randomBytes(32);
  const hiddenKey = randomBytes(32);
  assert.deepEqual(await sealedNames(), {}, 'none while no space is open');
  setCurrentSpace(0, key);
  await saveSealed(spacePlace(), null, person('Eleni', '+30 (691) 234-5678'));
  await saveSealed(placeOf(hiddenPlace(hiddenKey)), null, person('Nikos', '6970000000'));
  assert.deepEqual(await sealedNames(), { '+306912345678': 'Eleni' });
  setOpenHiddenPlace(hiddenPlace(hiddenKey));
  assert.deepEqual(await sealedNames(), { '+306912345678': 'Eleni', '6970000000': 'Nikos' });
  setOpenHiddenPlace(null);
  assert.deepEqual(await sealedNames(), { '+306912345678': 'Eleni' });
});

t('a photo is sealed in its own file, and goes with its contact', async () => {
  setCurrentSpace(0, randomBytes(32));
  const id = await saveSealed(spacePlace(), null, person('Eleni'));
  await setSealedPhoto(spacePlace(), id, new Uint8Array([1, 2, 3]));
  const first = (await loadPlace(spacePlace())).contacts[0].photo!;
  assert.deepEqual(await loadPhoto(first), new Uint8Array([1, 2, 3]));
  await setSealedPhoto(spacePlace(), id, new Uint8Array([4, 5]));
  const second = (await loadPlace(spacePlace())).contacts[0].photo!;
  assert.equal(await loadPhoto(first), null, 'the photo before is deleted');
  assert.deepEqual(await loadPhoto(second), new Uint8Array([4, 5]));
  await removeSealed(spacePlace(), id);
  assert.equal(await loadPhoto(second), null);
  assert.equal(blobs.size, 0);
});

t('a phone contact or a sealed one is linked to one Erevos contact, or none', async () => {
  setCurrentSpace(0, randomBytes(32));
  await linkPhoneContact(spacePlace(), 'lookup-1', IDENTITY);
  await linkPhoneContact(spacePlace(), 'lookup-1', 'cd'.repeat(32));
  assert.deepEqual((await loadPlace(spacePlace())).links, [{ lookup: 'lookup-1', identity: 'cd'.repeat(32) }]);
  await linkPhoneContact(spacePlace(), 'lookup-1', '');
  assert.deepEqual((await loadPlace(spacePlace())).links, []);
  const id = await saveSealed(spacePlace(), null, person('Eleni'));
  await linkSealed(spacePlace(), id, IDENTITY);
  assert.equal((await loadPlace(spacePlace())).contacts[0].erevos, IDENTITY);
});

t('a backup holds the sealed contacts, and leaves the file out when there is none', async () => {
  const key = randomBytes(32);
  setCurrentSpace(0, key);
  store.set('erevos.lock', 'x');
  const password = await backupKey('backup password');
  const before = await openBackup(await makeBackup(password), 'backup password');
  assert.ok(!before.entries.some((e) => e.name === FILE), 'older versions still open it');
  await saveSealed(spacePlace(), null, person('Eleni'));
  const after = await openBackup(await makeBackup(password), 'backup password');
  assert.ok(after.entries.some((e) => e.name === FILE));
});
