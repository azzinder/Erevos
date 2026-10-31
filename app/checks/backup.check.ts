// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// Backups of everything Erevos keeps on the phone (lock/backup.ts).
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

import { encryptBytes, HARD, hardCost, randomBytes, setHardCost, setPbkdf2, toHex, utf8Encode, webCryptoPbkdf2 } from '../lib/crypto';
import { SmsLink } from '../lib/sms-link';
import { backupKey, backupName, backupPhoneSms, hardBackupKey, makeBackup, newBackupHard, NotABackupError, openBackup, padme, restoreBackup, WrongBackupPasswordError } from '../lock/backup';
import {
  backupsListed,
  cloudFolder,
  CloudError,
  cloudServer,
  cloudThroughTor,
  fetchFromCloud,
  listCloud,
  loadCloudBackup,
  sendToCloud,
  setCloudHttp,
  setCloudTorWait,
  startCloudBackup,
  stopCloudBackup,
} from '../lib/backup-cloud';
import { setCore, type Core } from '../lib/core';
import { setThroughTor, setTorReady } from '../lib/relay';
import { loadLockConfig, setLockPassword, unlock } from '../lock/config';
import { History, newTag } from '../lock/history';
import { openHidden, prepareHidden, setHiddenPassword } from '../lock/hidden';
import { keepsPlace } from '../lock/hidden-keep';
import { setCurrentSpace } from '../lock/keys';
import { EMPTY_SPACE, loadHiddenData, loadSpaceData, prepareSpaces, saveHiddenData, saveSpaceData } from '../lock/space-data';
import { loadClip, saveClip } from '../lock/voice-clips';
import { loadPhoto, savePhoto } from '../lock/avatar-photos';
import { addOwnSticker, loadOwnStickers, openOwnSticker } from '../lock/sticker-data';
import { prepareQueueEntries } from '../lock/queues-data';
import { lastRestore } from '../lock/restored';
import { loadMatrix, saveMatrix } from '../lock/matrix-data';
import { loadNostrDm, saveNostrDm } from '../lock/nostr-dm-data';
import { loadXmpp, saveXmpp } from '../lock/xmpp-data';
import type { MatrixState } from '../lib/matrix';
import { newNostrDm, type NostrDmState } from '../lib/nostr-dm';
import type { XmppState } from '../lib/xmpp';
import { cloudRequest as browserRequest } from '../lib/backup-http.web';
import { blobs, files } from './files-memory';
import { store } from './secure-memory';
import { useWasmCore } from './wasm-core';

const wasmCore = useWasmCore();
// Argon2id at a small cost, so the many unlocks here run quick; its full cost has its own check.
setHardCost({ m: 64, t: 1 });

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

// A phone with a locked space, its relay, a message, a voice message and a sticker made from a photo;
// and, as every start makes them, the queues entries (lock/queues-data.ts).
async function phone() {
  const key = randomBytes(32);
  await setLockPassword(0, 'real-1111', key);
  await prepareSpaces(1);
  await prepareQueueEntries();
  await saveSpaceData(0, key, { ...EMPTY_SPACE, url: 'wss://relay.example' });
  const history = await History.open('space', 0, key);
  await history.add({ peer: 'contact:aa', text: 'γεια σου', mine: true, at: 1, tag: newTag() });
  const clip = await saveClip(new Uint8Array([1, 2, 3, 4]), 1500);
  const photo = await savePhoto(new Uint8Array([5, 6, 7]));
  const sticker = await addOwnSticker({ holder: 'space', space: 0, key }, new Uint8Array([8, 9]));
  return { key, clip, photo, sticker };
}

t('puts everything back: the lock opens the same space, with its relay, messages, voice and stickers', async () => {
  const { key, clip, photo, sticker } = await phone();
  // Everything but the wrong tries and the panic password's place, which stay with the phone.
  const before = new Map([...store].filter(([name]) => name !== 'erevos.lock-tries' && name !== 'erevos.lock-panic'));
  const file = await makeBackup(await backupKey('backup-pass'));

  wipe();
  store.set('erevos.space.7', 'left from before');
  files.set('erevos-archive', 'left from before');
  blobs.set('erevos-voice-ffffffffffffffffffffffffffffffff', new Uint8Array([9]));
  blobs.set('erevos-avatar-ffffffffffffffffffffffffffffffff', new Uint8Array([9]));

  await restoreBackup(await openBackup(file, 'backup-pass'));
  // Besides, the phone is marked as restored (lock/restored.ts), so each chat moves past the
  // message keys its conversations may have used since the backup.
  const mark = await lastRestore();
  assert.match(mark, /^[0-9a-f]{32}$/);
  assert.deepEqual(new Map([...store].filter(([name]) => name !== 'erevos.restored')), before);
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
  assert.deepEqual(await loadOwnStickers({ holder: 'space', space: 0, key }), [sticker]);
  assert.deepEqual(await openOwnSticker(sticker), new Uint8Array([8, 9]));
});

t('holds the accounts on Matrix, XMPP and Nostr, the space\'s and a hidden place\'s, with the pages they take', async () => {
  const { key } = await phone();
  const placeKey = randomBytes(32);
  const nostr = await newNostrDm();
  // Large enough to go to pages, as an account with its chats does.
  nostr.chats.someone = { key: 'someone', messages: Array.from({ length: 300 }, (_, i) => ({ id: `m${i}`, mine: false, at: i, text: 'λόγια '.repeat(20), state: 'sent' })), unread: 0, lastAt: 299 } as unknown as NostrDmState['chats'][string];
  await saveNostrDm(0, key, nostr);
  const placeNostr = await newNostrDm();
  await saveNostrDm(0, placeKey, placeNostr, 'hidden1');
  const xmpp = { jid: 'ben@example.org', password: 'pw', resource: 'Erevos.aa', omemo: { device: 7, identity: {}, signedPreKey: {}, preKeys: [] }, people: {}, chats: {}, roster: {}, requests: [], seen: [], restored: '' } as unknown as XmppState;
  await saveXmpp(0, key, xmpp);
  const matrix = { homeserver: 'https://matrix.example.org', userId: '@dan:example.org', deviceId: 'D', accessToken: 'tok', account: {}, rooms: {}, devices: {}, outdated: [], olm: {}, inbound: {}, outbound: {}, seen: {}, restored: '' } as unknown as MatrixState;
  await saveMatrix(0, placeKey, matrix, 'hidden2');
  assert.ok([...blobs.keys()].some((name) => name.startsWith('erevos-page-')), 'the Nostr chats went to pages');
  const file = await makeBackup(await backupKey('backup-pass'));

  wipe();
  // What the phone restored on has of its own goes: its accounts and their pages alike.
  await saveXmpp(0, key, { ...xmpp, jid: 'other@example.org' });
  await restoreBackup(await openBackup(file, 'backup-pass'));
  assert.equal((await loadNostrDm(0, key))?.public, nostr.public);
  assert.equal((await loadNostrDm(0, key))?.chats.someone.messages.length, 300);
  assert.equal((await loadNostrDm(0, placeKey, 'hidden1'))?.public, placeNostr.public);
  assert.equal((await loadXmpp(0, key))?.jid, 'ben@example.org');
  assert.equal((await loadMatrix(0, placeKey, 'hidden2'))?.userId, '@dan:example.org');
  assert.equal(await loadMatrix(0, key), null);
});

t('a backup from before the queues entries leaves none missing: each space and pocket has one again, all one size', async () => {
  await phone();
  // As one made before they were: none in it.
  for (const name of [...store.keys()]) if (name.startsWith('erevos.queues')) store.delete(name);
  const file = await makeBackup(await backupKey('backup-pass'));
  wipe();
  await restoreBackup(await openBackup(file, 'backup-pass'));
  const names = [...store.keys()].filter((name) => name.startsWith('erevos.queues'));
  // Four spaces, each with its own and its four hidden places'.
  assert.equal(names.length, 4 * 5);
  assert.equal(new Set(names.map((name) => store.get(name)!.length)).size, 1);
});

t('shows nothing of what it holds, and leaves out the wrong tries and its own settings', async () => {
  await phone();
  store.set('erevos.lock-tries', '{"count":3}');
  store.set('erevos.backup-auto', '{}');
  const file = await makeBackup(await backupKey('backup-pass'));
  const text = Buffer.from(file).toString('latin1');
  assert.ok(text.startsWith('EREVOS BACKUP 2\n'));
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

t('leaves out what is not Erevos’s own, as a newer Erevos may hold, and opens nothing damaged', async () => {
  // In the shape of a backup from before Argon2id, which still opens.
  const { key, salt, iter } = await backupKey('backup-pass', undefined, undefined, null);
  // A file sealed right, holding these entries.
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
  const forged = (entries: Uint8Array[], sealedWith = key) => {
    const head = new Uint8Array(4);
    new DataView(head.buffer).setUint32(0, iter);
    return new Uint8Array(Buffer.concat([utf8Encode('EREVOS BACKUP 1\n'), salt, head, encryptBytes(sealedWith, new Uint8Array(Buffer.concat(entries)))]));
  };
  const lock = entry(0, 'erevos.lock', '{}');
  const known = await openBackup(forged([lock, entry(0, 'erevos.space.3', 'x')]), 'backup-pass');
  assert.deepEqual([known.entries.map((e) => e.name), known.unknown], [['erevos.lock', 'erevos.space.3'], 0]);
  // A name or a kind this Erevos does not know is left out, and the rest restores; nothing of it is
  // written anywhere.
  for (const [kind, name] of [[0, 'erevos.lock-tries'], [2, '../erevos-history'], [1, 'erevos-voice-aa'], [9, 'erevos-from-later']] as const) {
    const backup = await openBackup(forged([lock, entry(kind, name, 'x')]), 'backup-pass');
    assert.deepEqual([backup.entries.map((e) => e.name), backup.unknown], [['erevos.lock'], 1], name);
    await restoreBackup(backup);
    assert.equal(store.get('erevos.lock'), '{}');
    assert.ok(!store.has(name) && !files.has(name) && !blobs.has(name), name);
  }
  // Cut short, sealed with another key, holding nothing Erevos knows, or empty: it opens nothing.
  await assert.rejects(openBackup(forged([lock, entry(1, 'erevos-history', 'x').subarray(0, 10)]), 'backup-pass'), NotABackupError);
  await assert.rejects(openBackup(forged([lock], randomBytes(32)), 'backup-pass'), WrongBackupPasswordError);
  await assert.rejects(openBackup(forged([entry(9, 'erevos-from-later', 'x')]), 'backup-pass'), NotABackupError);
  await assert.rejects(openBackup(new Uint8Array(0), 'backup-pass'), NotABackupError);
});

t('a backup costs Argon2id to open, and a key kept from before it gets it without the password', async () => {
  await phone();
  const kept = await backupKey('backup-pass', undefined, undefined, null);
  setHardCost(null);
  const hard = newBackupHard();
  setHardCost({ m: 64, t: 1 });
  assert.deepEqual([hard.m, hard.t, hardCost().m], [HARD.m, HARD.t, 64]);
  // What automatic backups do with the key they kept (lib/backup-folder.ts).
  const file = await makeBackup({ ...kept, key: await hardBackupKey(kept.key, hard), hard });
  assert.ok((await openBackup(file, 'backup-pass')).entries.some((entry) => entry.name === 'erevos.lock'));
  await assert.rejects(openBackup(file, 'wrong'), WrongBackupPasswordError);
  // Without Argon2id, none is made.
  await assert.rejects(makeBackup(kept));
  // A cost no Erevos makes is not a backup.
  const costly = file.slice();
  new DataView(costly.buffer).setUint32(16 + 16 + 4 + 16, 1024 * 1024);
  await assert.rejects(openBackup(costly, 'backup-pass'), NotABackupError);
});

t('names backups by the date and time they were made', () => {
  const name = backupName(new Date(2026, 9, 18, 9, 5).getTime());
  assert.equal(name, 'erevos-backup-2026-10-18-0905.erevos');
  return Promise.resolve();
});

t('holds every place of hidden chats, and gives them back', async () => {
  const spaceKey = randomBytes(32);
  await setLockPassword(0, 'real-1111', spaceKey);
  await prepareHidden();
  // Set while its space is open, it receives while closed, and so again once restored.
  setCurrentSpace(0, spaceKey);
  const key = await setHiddenPassword(0, 3, 'hidden-pin', null).finally(() => setCurrentSpace(null));
  await saveHiddenData(0, 3, key, { ...EMPTY_SPACE, token: 'place 4' });
  const file = await makeBackup(await backupKey('backup-pass'));
  const names = (await openBackup(file, 'backup-pass')).entries.map((entry) => entry.name);
  for (const name of ['erevos.hidden-lock', 'erevos.hidden-lock.3', 'erevos.hidden.0', 'erevos.hidden3.0', 'erevos.keep.0']) assert.ok(names.includes(name), name);
  wipe();
  await restoreBackup(await openBackup(file, 'backup-pass'));
  const place = await openHidden(0, 'hidden-pin');
  assert.equal(place?.pocket, 3);
  assert.equal((await loadHiddenData(0, 3, place!.key)).token, 'place 4');
  assert.ok(await keepsPlace(0, spaceKey, 3, place!.key));
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

t('holds each space\'s own order of its SMS, never the SMS it sends later', async () => {
  const { key } = await phone();
  const link = await SmsLink.open(0, key);
  assert.equal(await link.pin('+306911111111', true), true);
  await link.setDraft('+306922222222', 'half written');
  await link.setUndo(10);
  assert.equal(await link.addLater({ to: '+306933333333', text: 'at eight', at: 5, sim: -1 }), true);
  const file = await makeBackup(await backupKey('backup-pass'));

  // Restored on another phone, the order comes back, and no SMS for later goes again.
  wipe();
  await restoreBackup(await openBackup(file, 'backup-pass'));
  const restored = await SmsLink.open(0, key);
  assert.deepEqual(restored.state.pinned.map((p) => p.address), ['+306911111111']);
  assert.equal(restored.draftFor('+306922222222'), 'half written');
  assert.equal(restored.undo, 10);
  assert.deepEqual(restored.later, []);

  // A backup without the order, as an Erevos before made them, restores as ever, and the order
  // starts empty.
  files.delete('erevos-sms-order');
  const older = await makeBackup(await backupKey('backup-pass'));
  await restoreBackup(await openBackup(file, 'backup-pass'));
  await restoreBackup(await openBackup(older, 'backup-pass'));
  assert.equal(files.has('erevos-sms-order'), false);
  assert.deepEqual((await SmsLink.open(0, key)).state.pinned, []);
  assert.equal((await loadSpaceData(0, key)).url, 'wss://relay.example');
});

t('a bare backup, as sent to a server, looks like random bytes of a Padmé size, and opens as the others do', async () => {
  await phone();
  const key = await backupKey('backup-pass');
  const plain = await makeBackup(key);
  const bare = await makeBackup(key, null, true);
  assert.equal(bare.length, padme(bare.length));
  assert.ok(bare.length >= plain.length - 16);
  // Nothing in it says Erevos, nor the rounds and cost the plain one shows after its salt.
  assert.ok(!new TextDecoder().decode(bare).includes('EREVOS'));
  assert.notDeepEqual(bare.subarray(16, 44), plain.subarray(32, 60));
  const opened = await openBackup(bare, 'backup-pass');
  // The padding is nothing to restore, and no sign of a newer Erevos.
  assert.equal(opened.unknown, 0);
  assert.ok(!opened.entries.some((entry) => entry.name === 'pad'));
  assert.deepEqual(
    opened.entries.map((e) => e.name),
    (await openBackup(plain, 'backup-pass')).entries.map((e) => e.name),
  );
  await assert.rejects(openBackup(bare, 'not-the-pass'), WrongBackupPasswordError);
  await assert.rejects(openBackup(randomBytes(bare.length), 'backup-pass'), NotABackupError);
});

test('Padmé sizes add at most 12%, and grow with what they hold', () => {
  for (const n of [1, 2, 100, 1000, 4097, 123_456, 9_999_999, 150_000_000]) {
    const padded = padme(n);
    assert.ok(padded >= n && padded <= n * 1.12 + 1, `${n} → ${padded}`);
    assert.equal(padme(padded), padded);
  }
});

// A WebDAV folder at https://cloud.example/dav/Backups/, for user `me` with the password `password()`.
function davServer(there: Map<string, Uint8Array>, password: () => string, asked: string[] = []) {
  return (method: string, url: string, headers: Record<string, string>, body?: Uint8Array): { status: number; bytes: Uint8Array } => {
    const said = (status: number, bytes: Uint8Array = new Uint8Array(0)) => ({ status, bytes });
    asked.push(`${method} ${url}`);
    if (headers.Authorization !== `Basic ${Buffer.from(`me:${password()}`).toString('base64')}`) return said(401);
    if (!url.startsWith('https://cloud.example/dav/Backups/')) return said(404);
    const name = url.slice('https://cloud.example/dav/Backups/'.length);
    if (method === 'PROPFIND' && headers.Depth === '1') {
      // As Nextcloud answers: the folder itself, a file of the owner's, and the backups, in the order they came.
      const entry = (href: string, size: number, at: number) =>
        `<d:response><d:href>${href}</d:href><d:propstat><d:prop><d:getlastmodified>${new Date(Date.UTC(2026, 9, 1, 12, at)).toUTCString()}</d:getlastmodified><d:getcontentlength>${size}</d:getcontentlength></d:prop><d:status>HTTP/1.1 200 OK</d:status></d:propstat></d:response>`;
      const xml = [
        '<?xml version="1.0"?><d:multistatus xmlns:d="DAV:" xmlns:oc="http://owncloud.org/ns">',
        entry('/dav/Backups/', 0, 0),
        entry('/dav/Backups/notes.txt', 12, 1),
        ...[...there].map(([name, bytes], i) => entry(`/dav/Backups/${name}`, bytes.length, 2 + i)),
        '</d:multistatus>',
      ].join('');
      return said(207, new TextEncoder().encode(xml));
    }
    if (method === 'PROPFIND') return said(207);
    if (method === 'PUT') return there.set(name, body!), said(201);
    if (method === 'DELETE') return said(there.delete(name) ? 204 : 404);
    if (method === 'GET') return there.has(name) ? said(200, there.get(name)) : said(404);
    return said(405);
  };
}

t('sends automatic backups to a WebDAV folder under random names, keeps the newest there, and sends none while a space sends Everything through Tor and has no Tor for it', async () => {
  const asked: string[] = [];
  const there = new Map<string, Uint8Array>();
  let password = 'app-pass';
  const server = davServer(there, () => password, asked);
  setCloudHttp(async (method, url, headers, body) => server(method, url, headers, body));
  try {
    assert.equal(cloudFolder(' https://cloud.example/dav/Backups '), 'https://cloud.example/dav/Backups/');
    assert.throws(() => cloudFolder('http://cloud.example/dav'), CloudError);
    assert.throws(() => cloudFolder('https://me:pw@cloud.example/dav'), CloudError);
    await assert.rejects(startCloudBackup('https://cloud.example/dav/Backups', 'me', 'wrong'), /did not take/);
    await assert.rejects(startCloudBackup('https://cloud.example/dav/Elsewhere', 'me', 'app-pass'), /not on the server/);
    let cloud = await startCloudBackup('https://cloud.example/dav/Backups', 'me', 'app-pass');
    assert.equal(cloud.names.length, 0);

    await phone();
    const key = await backupKey('backup-pass');
    for (let i = 1; i <= 4; i++) cloud = await sendToCloud(cloud, await makeBackup(key, null, true), 3, i);
    assert.equal(cloud.error, '');
    assert.equal(cloud.last, 4);
    assert.equal(there.size, 3);
    assert.deepEqual([...there.keys()].sort(), [...cloud.names].sort());
    for (const name of cloud.names) assert.match(name, /^[0-9a-f]{16}$/);
    assert.deepEqual(await loadCloudBackup(), cloud);
    const newest = there.get(cloud.names[2])!;
    assert.equal((await openBackup(newest, 'backup-pass')).unknown, 0);

    // Restored from the server itself, with the folder and password typed again: only Erevos's
    // names, newest first, and the one chosen comes back whole.
    const server = cloudServer('https://cloud.example/dav/Backups', ' me ', 'app-pass');
    const listed = await listCloud(server);
    assert.deepEqual(
      listed.map((file) => file.name),
      [...cloud.names].reverse(),
    );
    assert.equal(listed[0].size, newest.length);
    assert.ok(listed[0].when > listed[1].when);
    const fetched = await fetchFromCloud(server, listed[0].name, 200 * 1024 * 1024);
    assert.deepEqual(fetched, newest);
    await assert.rejects(fetchFromCloud(server, listed[0].name, 10), /does not come from a server/);
    await assert.rejects(fetchFromCloud(server, '../elsewhere', 1e9), /not an Erevos backup/);
    await assert.rejects(listCloud({ ...server, password: 'wrong' }), /did not take/);

    // The server's own words for what went wrong, kept to show, and tried again next time.
    password = 'taken-back';
    const failed = await sendToCloud(cloud, await makeBackup(key, null, true), 3, 5);
    assert.match(failed.error, /did not take/);
    assert.equal(failed.last, 4);

    // A space that sends Everything through Tor sends nothing straight to a server, in a build without Tor.
    password = 'app-pass';
    asked.length = 0;
    setThroughTor('all');
    const held = await sendToCloud(cloud, await makeBackup(key, null, true), 3, 6);
    assert.match(held.error, /through Tor/);
    assert.deepEqual(asked, []);
  } finally {
    setThroughTor('off');
    setCloudHttp(null);
    await stopCloudBackup();
  }
  assert.equal(await loadCloudBackup(), null);
});

test('reads the backups out of WebDAV listings, whatever the prefix of their namespace', () => {
  const xml = `<?xml version="1.0"?>
    <D:multistatus xmlns:D="DAV:">
      <D:response><D:href>https://host/dav/B/</D:href></D:response>
      <D:response>
        <D:href>/dav/B/0123456789abcdef</D:href>
        <D:propstat><D:prop><D:getcontentlength>4096</D:getcontentlength><D:getlastmodified>Wed, 28 Oct 2026 10:00:00 GMT</D:getlastmodified></D:prop></D:propstat>
      </D:response>
      <D:response><D:href>/dav/B/fedcba9876543210</D:href><D:propstat><D:prop><D:getlastmodified>Thu, 29 Oct 2026 10:00:00 GMT</D:getlastmodified></D:prop></D:propstat></D:response>
      <D:response><D:href>/dav/B/0123456789ABCDEF</D:href></D:response>
      <D:response><D:href>/dav/B/%zz</D:href></D:response>
    </D:multistatus>`;
  assert.deepEqual(backupsListed(xml), [
    { name: 'fedcba9876543210', size: 0, when: Date.UTC(2026, 9, 29, 10) },
    { name: '0123456789abcdef', size: 4096, when: Date.UTC(2026, 9, 28, 10) },
  ]);
  assert.deepEqual(backupsListed('<response><href>/x/0123456789abcdef</href></response>'), [{ name: '0123456789abcdef', size: 0, when: 0 }]);
});

t("sends backups to a server through Tor as the space's Tor way says, waiting for Tor a while", async () => {
  const there = new Map<string, Uint8Array>();
  const server = davServer(there, () => 'app-pass');
  const heads: { method: string; url: string; headers: Record<string, string> }[] = [];
  setCore({
    torRequest: async () => new Uint8Array(0),
    torHttp: async (head: string, body: Uint8Array) => {
      const asked = JSON.parse(head) as { method: string; url: string; headers: Record<string, string> };
      heads.push(asked);
      const { status, bytes } = server(asked.method, asked.url, asked.headers, body);
      return new Uint8Array([status >> 8, status & 0xff, ...bytes]);
    },
  } as unknown as Core);
  const straight: string[] = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async (url: string) => {
    straight.push(String(url));
    return new Response(null, { status: 201 });
  }) as typeof fetch;
  setCloudTorWait(50);
  try {
    // Everything: through Tor, even while it is not ready yet (after the wait).
    setThroughTor('all');
    assert.ok(cloudThroughTor());
    let cloud = await startCloudBackup('https://cloud.example/dav/Backups', 'me', 'app-pass');
    await phone();
    const key = await backupKey('backup-pass');
    cloud = await sendToCloud(cloud, await makeBackup(key, null, true), 3, 1);
    assert.equal(cloud.error, '');
    assert.equal(there.size, 1);
    assert.deepEqual(
      heads.map((head) => head.method),
      ['PROPFIND', 'PUT'],
    );
    assert.deepEqual(straight, []);

    // Messages: straight while Tor is not ready, through Tor once it is, and a backup waits for it.
    setThroughTor('messages');
    assert.equal(cloudThroughTor(), false);
    cloud = await sendToCloud(cloud, await makeBackup(key, null, true), 3, 2);
    assert.equal(straight.length, 1);
    setCloudTorWait(5_000);
    setTimeout(() => setTorReady(true), 20);
    cloud = await sendToCloud(cloud, await makeBackup(key, null, true), 3, 3);
    assert.equal(cloud.error, '');
    assert.equal(straight.length, 1);
    assert.equal(heads.at(-1)?.method, 'PUT');
    assert.ok(cloudThroughTor());

    // Nothing: straight.
    setThroughTor('off');
    assert.equal(cloudThroughTor(), false);
    await sendToCloud(cloud, await makeBackup(key, null, true), 9, 4);
    assert.equal(straight.length, 2);
  } finally {
    globalThis.fetch = realFetch;
    setTorReady(false);
    setThroughTor('off');
    setCloudTorWait(120_000);
    setCore(wasmCore);
    await stopCloudBackup();
  }
});

test('in a browser, a server that does not let the web app in says so', async () => {
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async () => {
    throw new TypeError('Failed to fetch');
  }) as typeof fetch;
  try {
    await assert.rejects(browserRequest('PROPFIND', 'https://cloud.example/dav/Backups/', { Depth: '0' }), /CORS/);
  } finally {
    globalThis.fetch = realFetch;
  }
});

test("the desktop app's shell sends only WebDAV's requests for backups, over https, with no cookies and no redirects", () => {
  const shell = readFileSync(join(import.meta.dirname, '../../desktop/main.js'), 'utf8');
  const webdav = shell.slice(shell.indexOf('async function webdav('), shell.indexOf('// Whether Erevos keeps running'));
  assert.match(shell, /const WEBDAV_METHODS = new Set\(\['PROPFIND', 'PUT', 'GET', 'DELETE'\]\);/);
  assert.match(shell, /const WEBDAV_HEADERS = \['authorization', 'depth', 'content-type'\];/);
  assert.match(webdav, /target\.protocol !== 'https:'/);
  assert.match(webdav, /credentials: 'omit', redirect: 'error'/);
  assert.doesNotMatch(webdav, /console\./);
  // The server's answer is read as it comes, 100 MB at most, as the app's downloads (lib/net-http.ts).
  assert.match(shell, /const WEBDAV_MOST = 100 \* 1024 \* 1024;/);
  assert.match(webdav, /readCapped\(answer, WEBDAV_MOST/);
  assert.match(webdav, /status: 413/);
  assert.doesNotMatch(webdav, /arrayBuffer\(\)\);\n\s*if \(said/);
  assert.match(shell, /url\.pathname === '\/__webdav'\) return webdav\(request, url\)/);
});
