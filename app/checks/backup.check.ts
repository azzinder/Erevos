// Backups of everything Erevos keeps on the phone (lock/backup.ts).
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { encryptBytes, randomBytes, setPbkdf2, toHex, utf8Encode, webCryptoPbkdf2 } from '../lib/crypto';
import { backupKey, backupName, makeBackup, NotABackupError, openBackup, restoreBackup, WrongBackupPasswordError } from '../lock/backup';
import { loadLockConfig, setLockPassword, unlock } from '../lock/config';
import { History, newTag } from '../lock/history';
import { EMPTY_SPACE, loadSpaceData, prepareSpaces, saveSpaceData } from '../lock/space-data';
import { loadClip, saveClip } from '../lock/voice-clips';
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
  return { key, clip };
}

t('puts everything back: the lock opens the same space, with its relay, messages and voice', async () => {
  const { key, clip } = await phone();
  // Everything but the wrong tries, which stay with the phone.
  const before = new Map([...store].filter(([name]) => name !== 'erevos.lock-tries'));
  const file = await makeBackup(await backupKey('backup-pass'));

  wipe();
  store.set('erevos.space.7', 'left from before');
  files.set('erevos-archive', 'left from before');
  blobs.set('erevos-voice-ffffffffffffffffffffffffffffffff', new Uint8Array([9]));

  await restoreBackup(await openBackup(file, 'backup-pass'));
  assert.deepEqual(new Map(store), before);
  assert.equal(files.has('erevos-archive'), false);
  assert.equal(blobs.has('erevos-voice-ffffffffffffffffffffffffffffffff'), false);

  const opened = await unlock(await loadLockConfig(), 'real-1111');
  assert.equal(opened && toHex(opened.key), toHex(key));
  assert.equal((await loadSpaceData(0, key)).url, 'wss://relay.example');
  const history = await History.open('space', 0, key);
  assert.deepEqual(history.messages().map((m) => m.text), ['γεια σου']);
  assert.deepEqual(await loadClip(clip), new Uint8Array([1, 2, 3, 4]));
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
