// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// Photos and files (lib/attachments.ts, lib/photo.ts, lock/attachment-files.ts): the chunks, the
// offer a message carries, what a photo keeps, and sending and taking a file through real relays
// (crates/erevos-relay), skipped with a note when the relay is not built.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import * as nodeCrypto from 'node:crypto';
import { before, test } from 'node:test';

import { blobs } from './files-memory';
import { ready, relayNote, startRelay } from './real-relay';
import {
  bytesSource,
  chunkPlan,
  FileDamagedError,
  FileGoneError,
  FileMissingError,
  keepFile,
  offerRef,
  openChunk,
  readFile,
  readOffer,
  refSource,
  room,
  sealChunk,
  sealBlob,
  sendFile,
  takeFile,
  takesItself,
  BLOB_CHUNK,
  type FileOffer,
} from '../lib/attachments';
import { gcm } from '@noble/ciphers/aes.js';
import { sha256 } from '@noble/hashes/sha2.js';

import { decryptBytes, DecryptError, decryptText, encryptBytes, encryptText, nodeStyleGcm, randomBytes, setGcm, setSha256, sha256Bytes, type Gcm } from '../lib/crypto';
import { cleanJpeg, cleanPng, photoSize } from '../lib/photo';
import { cleanFileName, freeName, isFileRef, PREFIX } from '../lock/attachment-files';
import { History } from '../lock/history';
import { RelaySession, getChunk, setThroughTor, setTorReady } from '../lib/relay';
import { setCore, type Core } from '../lib/core';
import { setNostrHttp } from '../lib/nostr-files';

test('a file takes one small chunk, one middle one, or 1 MiB chunks', () => {
  assert.deepEqual(chunkPlan(0), { chunk: 64 * 1024, count: 1 });
  assert.deepEqual(chunkPlan(room(64 * 1024)), { chunk: 64 * 1024, count: 1 });
  assert.deepEqual(chunkPlan(room(64 * 1024) + 1), { chunk: 256 * 1024, count: 1 });
  assert.deepEqual(chunkPlan(room(256 * 1024) + 1), { chunk: 1024 * 1024, count: 1 });
  assert.deepEqual(chunkPlan(room(1024 * 1024) * 3 + 1), { chunk: 1024 * 1024, count: 4 });
});

test('a file saved beside one of the same name gets a number before its ending', () => {
  assert.equal(freeName('photo.jpg', new Set()), 'photo.jpg');
  assert.equal(freeName('photo.jpg', new Set(['photo.jpg', 'photo (1).jpg'])), 'photo (2).jpg');
  assert.equal(freeName('notes', new Set(['notes'])), 'notes (1)');
  assert.equal(freeName('.profile', new Set(['.profile'])), '.profile (1)');
});

test('a chunk opens only with its key, in its place, unchanged', () => {
  const key = randomBytes(32);
  const data = randomBytes(1000);
  const sealed = sealChunk(key, 2, data, 64 * 1024);
  assert.equal(sealed.length, 64 * 1024);
  assert.deepEqual(openChunk(key, 2, sealed, 64 * 1024), data);
  assert.throws(() => openChunk(key, 3, sealed, 64 * 1024), FileDamagedError);
  assert.throws(() => openChunk(randomBytes(32), 2, sealed, 64 * 1024), FileDamagedError);
  const changed = sealed.slice();
  changed[100] ^= 1;
  assert.throws(() => openChunk(key, 2, changed, 64 * 1024), FileDamagedError);
  assert.throws(() => openChunk(key, 2, sealed.slice(0, 1000), 64 * 1024), FileDamagedError);
});

const OFFER: FileOffer = {
  name: 'photo.jpg',
  mime: 'image/jpeg',
  kind: 'photo',
  size: 3000,
  w: 4,
  h: 3,
  relay: 'ws://127.0.0.1:7879',
  ids: 'ab'.repeat(24),
  key: 'cd'.repeat(32),
  chunk: 64 * 1024,
};

test('an offer is read only when it holds together', () => {
  assert.deepEqual(readOffer(JSON.parse(JSON.stringify(OFFER))), OFFER);
  const ref = offerRef(OFFER);
  assert.ok(isFileRef(ref));
  assert.equal(ref.count, 1);
  assert.deepEqual(ref.from, { relay: OFFER.relay, ids: OFFER.ids });
  assert.equal(readOffer({ ...OFFER, ids: OFFER.ids + 'ab'.repeat(24) }), null, 'more chunks than its size takes');
  assert.equal(readOffer({ ...OFFER, chunk: 1024 * 1024 }), null, 'a chunk size that does not fit');
  assert.equal(readOffer({ ...OFFER, relay: 'http://example.org' }), null);
  assert.equal(readOffer({ ...OFFER, key: 'x' }), null);
  assert.equal(readOffer({ ...OFFER, kind: 'virus' }), null);
  assert.equal(readOffer({ ...OFFER, size: 200_000_000 }), null, 'over 100 MB');
  assert.equal(readOffer({ ...OFFER, name: '../../etc/passwd' })?.name, 'passwd');
  assert.equal(readOffer('nothing'), null);
});

test('a photo hidden till tapped stays so, and only a photo can be', () => {
  const hidden = readOffer({ ...OFFER, hidden: true });
  assert.equal(hidden?.hidden, true);
  assert.ok(isFileRef(offerRef(hidden!)));
  assert.equal(readOffer({ ...OFFER, hidden: 'yes' })?.hidden, undefined);
  assert.equal(readOffer({ ...OFFER, kind: 'file', mime: 'application/pdf', name: 'a.pdf', hidden: true })?.hidden, undefined, 'a file is never hidden');
  assert.ok(!isFileRef({ ...offerRef(OFFER), kind: 'file', hidden: true }));
});

test('file names lose folders and what cannot be in a name', () => {
  assert.equal(cleanFileName('C:\\Users\\me\\plan.pdf'), 'plan.pdf');
  assert.equal(cleanFileName('a\u0000b<c>.txt'), 'abc.txt');
  assert.equal(cleanFileName('...hidden'), 'hidden');
  assert.equal(cleanFileName(''), 'file');
  const long = cleanFileName(`${'x'.repeat(300)}.jpeg`);
  assert.equal(long.length, 120);
  assert.ok(long.endsWith('.jpeg'));
});

// A JPEG put together by hand: JFIF with a thumbnail, EXIF (turned 90°, and a "GPS" string),
// a comment, Photoshop's APP13, an ICC profile, MPF, the picture's segments and data with stuffing
// and a restart, its end, and a "video" after it.
function jpeg(): { bytes: Uint8Array; picture: number[] } {
  const seg = (marker: number, body: number[]) => [0xff, marker, (body.length + 2) >> 8, (body.length + 2) & 0xff, ...body];
  const text = (t: string) => [...t].map((c) => c.charCodeAt(0));
  const jfif = seg(0xe0, [...text('JFIF\0'), 1, 2, 0, 0, 72, 0, 72, 2, 1, 1, 2, 3, 4, 5, 6]);
  const tiff = [0x49, 0x49, 42, 0, 8, 0, 0, 0, 2, 0, 0x12, 0x01, 3, 0, 1, 0, 0, 0, 6, 0, 0, 0, 0x25, 0x88, 4, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  const exif = seg(0xe1, [...text('Exif\0\0'), ...tiff, ...text('GPS 37.97N 23.72E')]);
  const comment = seg(0xfe, text('Pixel 9, Athens'));
  const photoshop = seg(0xed, text('Photoshop 3.0\0IPTC'));
  const icc = seg(0xe2, [...text('ICC_PROFILE\0'), 1, 1, 9, 9, 9]);
  const mpf = seg(0xe2, [...text('MPF\0'), 1, 2, 3]);
  const dqt = seg(0xdb, [0, ...Array(64).fill(1)]);
  const sof = seg(0xc0, [8, 0, 30, 0, 40, 1, 1, 0x11, 0]);
  const dht = seg(0xc4, [0, ...Array(16).fill(0)]);
  const sos = seg(0xda, [1, 1, 0, 0, 63, 0]);
  const data = [0x12, 0xff, 0x00, 0x34, 0xff, 0xd0, 0x56];
  const picture = [...dqt, ...sof, ...dht, ...sos, ...data, 0xff, 0xd9];
  const bytes = [0xff, 0xd8, ...jfif, ...exif, ...comment, ...photoshop, ...icc, ...mpf, ...picture, ...text('ftypmp42 motion photo')];
  return { bytes: Uint8Array.from(bytes), picture };
}

test('a JPEG keeps its picture and its turn, and nothing else it says', () => {
  const { bytes, picture } = jpeg();
  assert.deepEqual(photoSize(bytes), { w: 30, h: 40 }, 'turned 90°, so it shows higher than wide');
  const clean = cleanJpeg(bytes);
  const text = String.fromCharCode(...clean);
  for (const gone of ['GPS', 'Pixel', 'Photoshop', 'MPF', 'motion', 'II*']) assert.ok(!text.includes(gone), gone);
  assert.ok(text.includes('ICC_PROFILE'));
  assert.deepEqual([...clean.subarray(clean.length - picture.length)], picture, 'the picture byte for byte, then its end');
  // JFIF without its thumbnail, then an EXIF with only the turn.
  assert.deepEqual([...clean.subarray(0, 4)], [0xff, 0xd8, 0xff, 0xe0]);
  assert.equal(clean[4 + 2 + 12], 0, 'no thumbnail');
  assert.deepEqual(photoSize(clean), { w: 30, h: 40 }, 'still turned');
  assert.deepEqual(cleanJpeg(clean), clean, 'cleaning twice changes nothing');
  assert.throws(() => cleanJpeg(bytes.subarray(0, 60)));
});

test('a PNG loses its text, EXIF and time chunks', () => {
  const chunk = (type: string, body: number[]) => {
    const length = [body.length >>> 24, (body.length >> 16) & 255, (body.length >> 8) & 255, body.length & 255];
    return [...length, ...[...type].map((c) => c.charCodeAt(0)), ...body, 1, 2, 3, 4];
  };
  const ihdr = chunk('IHDR', [0, 0, 1, 0, 0, 0, 0, 200, 8, 6, 0, 0, 0]);
  const idat = chunk('IDAT', [9, 9, 9]);
  const iend = chunk('IEND', []);
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  const bytes = Uint8Array.from([
    ...signature,
    ...ihdr,
    ...chunk('tEXt', [...'Author\0me'].map((c) => c.charCodeAt(0))),
    ...idat,
    ...chunk('tIME', [7, 234, 10, 18, 9, 0, 0]),
    ...iend,
    1,
    2,
  ]);
  assert.deepEqual(photoSize(bytes), { w: 256, h: 200 });
  assert.deepEqual([...cleanPng(bytes)], [...signature, ...ihdr, ...idat, ...iend]);
});

test('a message that leaves the history takes its file with it', async () => {
  const history = await History.open('space', 0, randomBytes(32));
  const file = { name: 'a.txt', mime: 'text/plain', kind: 'file' as const, size: 5, id: 'ab'.repeat(16), key: 'cd'.repeat(32), chunk: 64 * 1024, count: 2 };
  blobs.set(`${PREFIX}${file.id}-0`, Uint8Array.of(1));
  blobs.set(`${PREFIX}${file.id}-1`, Uint8Array.of(2));
  await history.add({ peer: 'contact:x', text: '', mine: true, at: 1, tag: 'aaaaaaaaaaaa', file });
  assert.deepEqual(history.messages()[0].file, file);
  assert.equal(await history.setFile('contact:x', 'aaaaaaaaaaaa', { ...file, name: 'b.txt' }), true);
  assert.equal(history.messages()[0].file?.name, 'b.txt');
  assert.equal(await history.setFile('contact:x', 'bbbbbbbbbbbb', file), false);
  assert.ok(blobs.has(`${PREFIX}${file.id}-1`));
  await history.remove('contact:x', 'aaaaaaaaaaaa');
  assert.ok(!blobs.has(`${PREFIX}${file.id}-0`) && !blobs.has(`${PREFIX}${file.id}-1`));
});

test('a file kept here reads again as it was, a piece at a time, to forward it', async () => {
  const data = randomBytes(room(1024 * 1024) * 2 + 100);
  const ref = await keepFile(bytesSource(data), { name: 'big.bin', mime: 'application/octet-stream', kind: 'file' });
  assert.equal(ref.count, 3);
  const source = refSource(ref);
  assert.equal(source.size, data.length);
  // Across the end of a chunk, and past the end of the file.
  const edge = room(1024 * 1024) - 10;
  assert.deepEqual(await source.read(edge, 20), data.subarray(edge, edge + 20));
  assert.deepEqual(await source.read(data.length - 5, 50), data.subarray(data.length - 5));
  const pieces: Uint8Array[] = [];
  for (let at = 0; at < data.length; at += 700_000) pieces.push(await source.read(at, 700_000));
  assert.deepEqual(Buffer.concat(pieces), Buffer.from(data));
  // Still on the relay, or its chunks gone: nothing to read.
  await assert.rejects(refSource({ ...ref, from: { relay: 'ws://127.0.0.1:7879', ids: 'ab'.repeat(72) } }).read(0, 10), FileMissingError);
  blobs.delete(`${PREFIX}${ref.id}-1`);
  await assert.rejects(source.read(edge, 20), FileMissingError);
});

// Through real relays.
relayNote('the file store checks');

let mine = '';
let theirs = '';

before(async () => {
  if (!ready) return;
  mine = await startRelay();
  theirs = await startRelay();
});

test('a file goes to our relay and comes through theirs, then leaves the relay', { skip: !ready }, async () => {
  const data = randomBytes(room(1024 * 1024) * 2 + 12345);
  const progress: number[] = [];
  const { ref, offer } = await sendFile({ url: mine }, bytesSource(data), { name: 'big.bin', mime: 'application/octet-stream', kind: 'file' }, (done) =>
    progress.push(done),
  );
  assert.deepEqual(progress, [1, 2, 3]);
  assert.equal(offer.relay, mine);
  assert.deepEqual(await readFile(ref), data, 'kept here as it went');

  const came = readOffer(JSON.parse(JSON.stringify(offer)))!;
  const waiting = offerRef(came);
  assert.equal(await readFile(waiting), null, 'not here until taken');
  const taken = await takeFile({ url: theirs }, waiting);
  assert.equal(taken.from, undefined);
  assert.deepEqual(await readFile(taken), data);

  // Deleted from our relay once taken.
  const session = await RelaySession.open({ url: mine });
  assert.equal(await getChunk(session, Uint8Array.from(Buffer.from(offer.ids.slice(0, 48), 'hex'))), null);
  session.close();
  await assert.rejects(takeFile({ url: theirs }, offerRef(came)), FileGoneError);
});

test('a file on the same relay is taken straight, and a wrong key keeps nothing', { skip: !ready }, async () => {
  const data = randomBytes(5000);
  const { offer } = await sendFile({ url: mine }, bytesSource(data), { name: 'photo.png', mime: 'image/png', kind: 'photo', w: 2, h: 1 });
  const wrong = offerRef({ ...offer, key: 'ef'.repeat(32) });
  await assert.rejects(takeFile({ url: mine }, wrong), FileDamagedError);
  assert.ok(![...blobs.keys()].some((name) => name.startsWith(`${PREFIX}${wrong.id}`)), 'nothing kept');
  const taken = await takeFile({ url: `${mine}/` }, offerRef(offer));
  assert.deepEqual(await readFile(taken), data);
});

// Last, as the app does at startup: the checks before ran with the JavaScript AES-GCM.
test('a native AES-GCM is used only when it seals as the JavaScript one does', () => {
  const key = randomBytes(32);
  const piece = randomBytes(room(1024 * 1024));
  const before = sealChunk(key, 3, piece, 1024 * 1024);
  const text = encryptText(key, 'still opens');

  const native = nodeStyleGcm(nodeCrypto);
  const otherNonce: Gcm = { seal: (k, nonce, data) => native.seal(k, nonce.map((b) => b ^ 1), data), open: native.open };
  // Opens without checking the tag, so what was changed would open too.
  const unchecked: Gcm = {
    seal: native.seal,
    open: (k, nonce, sealed) => nodeCrypto.createDecipheriv('aes-256-gcm', k, nonce).update(sealed.subarray(0, sealed.length - 16)),
  };
  assert.equal(setGcm(otherNonce), false);
  assert.equal(setGcm(unchecked), false);
  assert.equal(setGcm({ seal: () => { throw new Error('no cipher here'); }, open: native.open }), false);
  // Wrong past 64 KB only, though it opens what it sealed: the known answer catches it.
  const flip = (data: Uint8Array) => (data.length > 65536 ? data.map((b, i) => (i === 66000 ? b ^ 1 : b)) : data);
  assert.equal(setGcm({ seal: (k, nonce, data) => native.seal(k, nonce, flip(data)), open: (k, nonce, sealed) => flip(native.open(k, nonce, sealed)) }), false);
  // The JavaScript one gives that answer too.
  assert.equal(setGcm({ seal: (k, nonce, data) => gcm(k, nonce).encrypt(data), open: (k, nonce, sealed) => gcm(k, nonce).decrypt(sealed) }), true);
  assert.equal(setGcm(native), true);

  // What was sealed before still opens, and what is sealed now is the same.
  assert.deepEqual(openChunk(key, 3, before, 1024 * 1024), piece);
  assert.equal(decryptText(key, text), 'still opens');
  const sealed = encryptBytes(key, piece);
  assert.equal(sealed.constructor, Uint8Array, 'plain bytes, not a Buffer');
  assert.deepEqual(decryptBytes(key, sealed), piece);
  sealed[100] ^= 1;
  assert.throws(() => decryptBytes(key, sealed), DecryptError);
  assert.throws(() => decryptBytes(key, sealed.subarray(0, 20)), DecryptError);
});

test('a native SHA-256 is used, for what is 4 KB or more, only when it hashes as the JavaScript one does', () => {
  const big = randomBytes(5 * 1024 * 1024).subarray(7);
  const small = randomBytes(100);
  const want = [sha256(big), sha256(small)];
  let asked = 0;
  const native = (data: Uint8Array): Uint8Array => {
    asked++;
    return nodeCrypto.createHash('sha256').update(data).digest();
  };
  // Hashes the whole array a part of it is in, or something else, or nothing.
  assert.equal(setSha256((data) => nodeCrypto.createHash('sha256').update(new Uint8Array(data.buffer)).digest()), false);
  assert.equal(setSha256((data) => native(data.map((b) => b ^ 1))), false);
  assert.equal(setSha256(() => { throw new Error('no hash here'); }), false);
  assert.equal(setSha256(() => 'cafe' as unknown as Uint8Array), false);
  assert.equal(setSha256(native), true);
  asked = 0;
  const got = [sha256Bytes(big), sha256Bytes(small)];
  assert.deepEqual(got, want);
  assert.equal(asked, 1, 'only the large one natively');
  assert.equal(got[0].constructor, Uint8Array, 'plain bytes, not a Buffer');
  // A part of a backup, and an attachment, check out as before.
  assert.equal(setSha256(null), true);
  assert.deepEqual(sha256Bytes(big), want[0]);
  assert.equal(setSha256(native), true);
});

test('a file from where its sender chose is taken by itself only through Tor; one through our relay always', () => {
  const own = { url: 'wss://own.example' };
  const lent = { url: 'wss://own.example', token: `lent.${'ab'.repeat(48)}` };
  const ids = 'cd'.repeat(24);
  const there = { relay: 'wss://theirs.example', ids };
  const blossom = { relay: 'blossom', ids, via: 'blossom' as const, url: 'https://files.example/x', x: 'cd'.repeat(32) };
  try {
    // Our relay, or one ours fetches from: by itself. With none, a file on a relay waits.
    assert.equal(takesItself(own, { relay: own.url, ids }), true);
    assert.equal(takesItself(own, there), true);
    assert.equal(takesItself(lent, { relay: own.url, ids }), true);
    assert.equal(takesItself(null, there), false);
    assert.equal(takesItself(null, { relay: 'nostr', ids, via: 'nostr' }), true);
    // From a lent place, their relay is reached straight: it waits for a tap, unless files go through Tor.
    assert.equal(takesItself(lent, there), false);
    setThroughTor('messages');
    setTorReady(true);
    assert.equal(takesItself(lent, there), false);
    setThroughTor('all');
    assert.equal(takesItself(lent, there), true);
    // A file server's address: only while the space's requests go through Tor now.
    setThroughTor('off');
    assert.equal(takesItself(own, blossom), false);
    setCore({ torRequest: async () => new Uint8Array(0), torHttp: async () => new Uint8Array([0, 200]) } as unknown as Core);
    assert.equal(takesItself(own, blossom), false);
    setThroughTor('messages');
    assert.equal(takesItself(own, blossom), true);
    setTorReady(false);
    assert.equal(takesItself(own, blossom), false);
  } finally {
    setThroughTor('off');
    setTorReady(false);
    setCore(null);
  }
});

test('a file on a file server is fetched by itself through Tor alone, and never straight without it', async () => {
  const key = randomBytes(32);
  const bytes = randomBytes(5000);
  const { blob, x } = sealBlob(key, bytes);
  const offer: FileOffer = { name: 'a.bin', mime: 'application/octet-stream', kind: 'file', size: bytes.length, relay: 'blossom', ids: x.slice(0, 48), key: Buffer.from(key).toString('hex'), chunk: BLOB_CHUNK, via: 'blossom', url: 'https://files.example/blob', x };
  const asked: string[] = [];
  const straight: string[] = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async (url: string) => {
    straight.push(String(url));
    return new Response(null, { status: 500 });
  }) as typeof fetch;
  setNostrHttp(null);
  try {
    // Tor off: by itself it is not fetched at all.
    await assert.rejects(takeFile({ url: 'wss://own.example' }, offerRef(offer), undefined, false, null, true), FileMissingError);
    assert.deepEqual(straight, []);
    // Tor on for the space: through it, and it is kept.
    setCore({
      torRequest: async () => new Uint8Array(0),
      torHttp: async (head: string) => {
        asked.push((JSON.parse(head) as { url: string }).url);
        return new Uint8Array([0, 200, ...blob]);
      },
    } as unknown as Core);
    setThroughTor('messages');
    setTorReady(true);
    const taken = await takeFile({ url: 'wss://own.example' }, offerRef(offer), undefined, false, null, true);
    assert.deepEqual(await readFile(taken), bytes);
    assert.deepEqual(asked, [offer.url]);
    assert.deepEqual(straight, []);
  } finally {
    globalThis.fetch = realFetch;
    setThroughTor('off');
    setTorReady(false);
    setCore(null);
  }
});
