// Backups of everything Erevos keeps on the phone (lock/backup.ts).
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { encryptBytes, randomBytes, setPbkdf2, toHex, utf8Encode, webCryptoPbkdf2 } from '../lib/crypto';
import { backupKey, backupName, backupPhoneSms, makeBackup, NotABackupError, openBackup, restoreBackup, WrongBackupPasswordError } from '../lock/backup';
import { loadLockConfig, setLockPassword, unlock } from '../lock/config';
import { History, newTag } from '../lock/history';
import { openHidden, prepareHidden, setHiddenPassword } from '../lock/hidden';
import { EMPTY_SPACE, loadHiddenData, loadSpaceData, prepareSpaces, saveHiddenData, saveSpaceData } from '../lock/space-data';
import { loadClip, saveClip } from '../lock/voice-clips';
import { loadPhoto, savePhoto } from '../lock/avatar-photos';
import { blobs, files } from './files-memory';
import { store } from './secure-memory';

setPbkdf2(webCryptoPbkdf2()!);

const t = (name: string, fn: () => Promise<void>) =>
  test(name, async () => {
    store.clear();
    files.clear();
    blobs.clear();
    await fn();
  });

const wipe = () => {
  store.clear();
  files.clear();
  blobs.clear();
};

// A phone with a locked space, its relay, a message and a voice message.
async function phone() {
  const key = randomBytes(32);
  await setLockPassword(0, 'real-1111', key);
  await prepareSpaces(1);
  await saveSpaceData(0, key, { ...EMPTY_SPACE, url: 'wss://relay.example' });
  const history = await History.open('space', 0, key);
  await history.add({ peer: 'contact:aa', text: 'γεια σου', mine: true, at: 1, tag: newTag() });
  const clip = await saveClip(new Uint8Array([1, 2, 3, 4]), 1500);
  const photo = await savePhoto(new Uint8Array([5, 6, 7]));
  return { key, clip, photo };
}

t('puts everything back: the lock opens the same space, with its relay, messages and voice', async () => {
  const { key, clip, photo } = await phone();
  // Everything but the wrong tries, which stay with the phone.
  const before = new Map([...store].filter(([name]) => name !== 'erevos.lock-tries'));
  const file = await makeBackup(await backupKey('backup-pass'));

  wipe();
  store.set('erevos.space.7', 'left from before');
  files.set('erevos-archive', 'left from before');
  blobs.set('erevos-voice-ffffffffffffffffffffffffffffffff', new Uint8Array([9]));
  blobs.set('erevos-avatar-ffffffffffffffffffffffffffffffff', new Uint8Array([9]));

  await restoreBackup(await openBackup(file, 'backup-pass'));
  assert.deepEqual(new Map(store), before);
  assert.equal(files.has('erevos-archive'), false);
  assert.equal(blobs.has('erevos-voice-ffffffffffffffffffffffffffffffff'), false);
  assert.equal(blobs.has('erevos-avatar-ffffffffffffffffffffffffffffffff'), false);

  const opened = await unlock(await loadLockConfig(), 'real-1111');
  assert.equal(opened && toHex(opened.key), toHex(key));
  assert.equal((await loadSpaceData(0, key)).url, 'wss://relay.example');
  const history = await History.open('space', 0, key);
  assert.deepEqual(history.messages().map((m) => m.text), ['γεια σου']);
  assert.deepEqual(await loadClip(clip), new Uint8Array([1, 2, 3, 4]));
  assert.deepEqual(await loadPhoto(photo), new Uint8Array([5, 6, 7]));
});

t('shows nothing of what it holds, and leaves out the wrong tries and its own settings', async () => {
  await phone();
  store.set('erevos.lock-tries', '{"count":3}');
  store.set('erevos.backup-auto', '{}');
  const file = await makeBackup(await backupKey('backup-pass'));
  const text = Buffer.from(file).toString('latin1');
  assert.ok(text.startsWith('EREVOS BACKUP 1\n'));
  assert.doesNotMatch(text, /erevos\.|relay\.example|γεια/);

  const { entries } = await openBackup(file, 'backup-pass');
  const names = entries.map((entry) => entry.name);
  assert.ok(!names.includes('erevos.lock-tries'));
  assert.ok(!names.includes('erevos.backup-auto'));
  assert.ok(names.includes('erevos.lock') && names.includes('erevos-history'));
});

t('a wrong password or another file opens nothing', async () => {
  await phone();
  const file = await makeBackup(await backupKey('backup-pass'));
  await assert.rejects(openBackup(file, 'wrong'), WrongBackupPasswordError);
  await assert.rejects(openBackup(utf8Encode('hello, this is not a backup at all'), 'backup-pass'), NotABackupError);
  const changed = file.slice();
  changed[changed.length - 1] ^= 1;
  await assert.rejects(openBackup(changed, 'backup-pass'), WrongBackupPasswordError);
});

t('will not restore names that are not Erevos’s own', async () => {
  const { key, salt, iter } = await backupKey('backup-pass');
  // A file sealed right, holding the lock and an entry of some other name.
  const entry = (kind: number, name: string, data: string) => {
    const n = utf8Encode(name);
    const d = utf8Encode(data);
    const out = new Uint8Array(3 + n.length + 4 + d.length);
    const view = new DataView(out.buffer);
    out[0] = kind;
    view.setUint16(1, n.length);
    out.set(n, 3);
    view.setUint32(3 + n.length, d.length);
    out.set(d, 7 + n.length);
    return out;
  };
  const forged = (kind: number, name: string) => {
    const packed = Buffer.concat([entry(0, 'erevos.lock', '{}'), entry(kind, name, 'x')]);
    const head = new Uint8Array(4);
    new DataView(head.buffer).setUint32(0, iter);
    return new Uint8Array(Buffer.concat([utf8Encode('EREVOS BACKUP 1\n'), salt, head, encryptBytes(key, new Uint8Array(packed))]));
  };
  await openBackup(forged(0, 'erevos.space.3'), 'backup-pass');
  await assert.rejects(openBackup(forged(0, 'erevos.lock-tries'), 'backup-pass'), NotABackupError);
  await assert.rejects(openBackup(forged(2, '../erevos-history'), 'backup-pass'), NotABackupError);
  await assert.rejects(openBackup(forged(1, 'erevos-voice-aa'), 'backup-pass'), NotABackupError);
  await assert.rejects(openBackup(new Uint8Array(0), 'backup-pass'), NotABackupError);
});

t('names backups by the date and time they were made', () => {
  const name = backupName(new Date(2026, 9, 18, 9, 5).getTime());
  assert.equal(name, 'erevos-backup-2026-10-18-0905.erevos');
  return Promise.resolve();
});

t('holds every place of hidden chats, and gives them back', async () => {
  await setLockPassword(0, 'real-1111', randomBytes(32));
  await prepareHidden();
  const key = await setHiddenPassword(0, 3, 'hidden-pin', null);
  await saveHiddenData(0, 3, key, { ...EMPTY_SPACE, token: 'place 4' });
  const file = await makeBackup(await backupKey('backup-pass'));
  const names = (await openBackup(file, 'backup-pass')).entries.map((entry) => entry.name);
  for (const name of ['erevos.hidden-lock', 'erevos.hidden-lock.3', 'erevos.hidden.0', 'erevos.hidden3.0']) assert.ok(names.includes(name), name);
  wipe();
  await restoreBackup(await openBackup(file, 'backup-pass'));
  const place = await openHidden(0, 'hidden-pin');
  assert.equal(place?.pocket, 3);
  assert.equal((await loadHiddenData(0, 3, place!.key)).token, 'place 4');
});

t('holds the phone\'s SMS when given them, sealed, and restoring writes them nowhere', async () => {
  await phone();
  const sms = utf8Encode('EREVOS SMS 1\n…+306911111111 see you at eight');
  const file = await makeBackup(await backupKey('backup-pass'), sms);
  assert.doesNotMatch(Buffer.from(file).toString('latin1'), /EREVOS SMS|6911111111|see you/);
  const opened = await openBackup(file, 'backup-pass');
  assert.deepEqual(backupPhoneSms(opened), sms);
  const before = { files: new Map(files), blobs: new Map(blobs) };
  wipe();
  await restoreBackup(opened);
  assert.deepEqual({ files: new Map(files), blobs: new Map(blobs) }, before);
  // A backup made without them is as it was.
  const without = await openBackup(await makeBackup(await backupKey('backup-pass')), 'backup-pass');
  assert.equal(backupPhoneSms(without), null);
  assert.deepEqual(
    without.entries.map((entry) => entry.name),
    opened.entries.map((entry) => entry.name).filter((name) => name !== 'phone-sms'),
  );
});
