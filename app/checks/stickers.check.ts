// Stickers (lib/stickers.ts, lib/sticker-art.ts, lib/sticker-motion.ts): the built-in ones, in
// their sets, how they move and how their words fit; and those made from photos
// (lib/own-stickers.ts, lock/sticker-data.ts): made, capped and kept per space or hidden chats,
// sent and received as a photo marked as a sticker, shown as a photo by an Erevos from before, and
// kept from a message. With the real core for the end-to-end checks, and a real relay
// (crates/erevos-relay) for the file store, each skipped with a note when it is not built.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { before, test } from 'node:test';

import { blobs, files } from './files-memory';
import { ready, relayNote, startRelay } from './real-relay';
import { bytesSource, chunkPlan, keepFile, offerRef, readFile, readOffer, sendFile, takeFile, type FileOffer } from '../lib/attachments';
import { chatText } from '../lib/chat-export';
import { carriedOf } from '../lib/chat-parts';
import { setCore, type Core } from '../lib/core';
import { randomBytes, toHex } from '../lib/crypto';
import { E2E, toBase64Url, type Received } from '../lib/e2e';
import { fileCopy } from '../lib/forward';
import { LANGS, words } from '../lib/i18n';
import { buildInbox, groupRows } from '../lib/inbox';
import { messageLine } from '../lib/message-line';
import { searchMessages } from '../lib/message-search';
import { fitSticker, keepAsSticker, NotStickerError, stickerMeta, stickerPhoto } from '../lib/own-stickers';
import { photoSize } from '../lib/photo';
import { ART, partsOf } from '../lib/sticker-art';
import { MOTIONS, motionFor, REST } from '../lib/sticker-motion';
import { SETS, STICKERS, stickersIn, wordsLines, wordsSize } from '../lib/stickers';
import { cleanFileName, cleanMime, fitsSticker, isFileMeta, isFileRef, MAX_STICKER, type FileRef } from '../lock/attachment-files';
import { PREFIX as PHOTO } from '../lock/avatar-photos';
import { History, newTag } from '../lock/history';
import { hiddenHolder } from '../lock/sealed-file';
import { addOwnSticker, FILE, loadOwnStickers, MAX_OWN_STICKERS, openOwnSticker, removeOwnSticker, TooManyStickersError, type StickerPlace } from '../lock/sticker-data';

const built = new URL('./.core/erevos_ffi.js', import.meta.url);
const coreReady = existsSync(built);
if (coreReady) {
  const wasm = createRequire(import.meta.url)(built.pathname) as Record<string, (...args: never[]) => unknown>;
  setCore(Object.fromEntries(Object.entries(wasm).map(([name, call]) => [name, async (...args: never[]) => call(...args)])) as unknown as Core);
} else {
  console.log('Skipping the end-to-end sticker checks: build the core first with node checks/build-core.mjs');
}
relayNote('the sticker file store checks');

const t = (name: string, fn: () => void | Promise<void>, skip = false) =>
  test(name, { skip }, async () => {
    files.clear();
    blobs.clear();
    await fn();
  });

// The built-in stickers.

t('every built-in sticker has a name of its own, never reused, its words, an emoji and its set', () => {
  const names = STICKERS.map((s) => s.name);
  assert.equal(new Set(names).size, names.length, 'no name twice');
  assert.equal(new Set(STICKERS.map((s) => s.label)).size, STICKERS.length, 'no words twice');
  for (const s of STICKERS) {
    assert.equal(carriedOf({ sticker: s.name }).sticker, s.name, `${s.name} travels by its name`);
    assert.ok(s.emoji && s.label, s.name);
    assert.ok(SETS.some(({ set }) => set === s.set), s.name);
  }
  // The first ones keep their names, in their order: an Erevos from before knows them by these.
  assert.deepEqual(stickersIn('moons').map((s) => s.name), [
    'moon-smile', 'moon-laugh', 'moon-love', 'moon-wink', 'moon-wow', 'moon-sad', 'moon-angry', 'moon-sleep', 'heart', 'sun', 'coffee', 'check',
  ]);
  assert.deepEqual(SETS.map(({ set }) => set), ['moons', 'animals', 'celebrations', 'words', 'treats']);
  for (const { set } of SETS) assert.ok(stickersIn(set).length >= 6 && stickersIn(set).length <= 12, set);
  // Each is drawn, and nothing is drawn that is not one.
  assert.deepEqual(Object.keys(ART).sort(), [...names].sort());
});

t('every sticker and set has its words in each language', () => {
  for (const lang of LANGS.filter((l) => l !== 'en')) {
    const said = words(lang);
    const missing = [...STICKERS.map((s) => s.label), ...SETS.map((s) => s.label), 'Mine'].filter((label) => !said[label]);
    assert.deepEqual(missing, [], lang);
  }
});

t('the words of a Words sticker fit its card in two lines, in every language', () => {
  for (const lang of LANGS) {
    const said = lang === 'en' ? {} : words(lang);
    for (const { label } of stickersIn('words')) {
      const shown = said[label] ?? label;
      assert.ok(wordsLines(shown, wordsSize(shown)) <= 2, `${lang}: ${shown}`);
    }
  }
  // As large as they fit: a short word large, a long one smaller, one too long for a line never.
  assert.ok(wordsSize('Danke') > wordsSize('Bin unterwegs'));
  assert.equal(wordsLines('Gute Nacht', 10), 1);
  assert.equal(wordsLines('a'.repeat(40), 10), Infinity);
});

t('the moons, animals and celebrations move a few seconds and end as drawn; words and treats stay still', () => {
  for (const { set, moves } of SETS) {
    for (const { name } of stickersIn(set)) assert.equal(name in MOTIONS, moves, name);
  }
  for (const [name, { ms, moves }] of Object.entries(MOTIONS)) {
    assert.ok(ms >= 1000 && ms <= 4000, `${name} plays a few seconds`);
    const parts = new Set(['all', ...partsOf(ART[name])]);
    for (const move of moves) {
      assert.ok(parts.has(move.part), `${name} has a part ${move.part}`);
      assert.equal(move.at[0], 0, name);
      assert.equal(move.at[move.at.length - 1], 1, name);
      assert.ok(move.at.every((at, i) => i === 0 || at > move.at[i - 1]), `${name}: its times go forward`);
      for (const key of Object.keys(REST) as (keyof typeof REST)[]) {
        const values = move[key];
        if (!values) continue;
        assert.equal(values.length, move.at.length, `${name} ${key}`);
        const last = values[values.length - 1];
        assert.equal(values[0], REST[key], `${name} ${key} starts as drawn`);
        // A part that looks the same turned by `every` degrees may end turned so.
        assert.ok(last === REST[key] || (key === 'turn' && move.every && last % move.every === 0), `${name} ${key} ends as drawn`);
      }
    }
  }
});

t('with reduce motion on, or not known yet, no sticker moves', () => {
  for (const { name } of STICKERS) {
    assert.equal(motionFor(name, true), null, name);
    assert.equal(motionFor(name, null), null, name);
    assert.equal(motionFor(name, false), MOTIONS[name] ?? null, name);
  }
  assert.equal(motionFor('moon-dance', false), null, 'one from a later Erevos is still');
});

// Stickers made from photos.

// A JPEG put together by hand (as in attachments.check.ts): EXIF with a "GPS" string, a comment,
// the picture, and `extra` bytes of it, then a "video" after its end.
function jpeg(extra = 0): Uint8Array {
  const seg = (marker: number, body: number[]) => [0xff, marker, (body.length + 2) >> 8, (body.length + 2) & 0xff, ...body];
  const text = (s: string) => [...s].map((c) => c.charCodeAt(0));
  const jfif = seg(0xe0, [...text('JFIF\0'), 1, 2, 0, 0, 72, 0, 72, 0, 0]);
  const exif = seg(0xe1, [...text('Exif\0\0'), 0x49, 0x49, 42, 0, 8, 0, 0, 0, 0, 0, ...text('GPS 37.97N 23.72E')]);
  const comment = seg(0xfe, text('Pixel 9, Athens'));
  const sof = seg(0xc0, [8, 2, 0, 2, 0, 1, 1, 0x11, 0]);
  const sos = seg(0xda, [1, 1, 0, 0, 63, 0]);
  const data = Array.from({ length: 64 + extra }, (_, i) => (i * 7) & 0x7f);
  return Uint8Array.from([0xff, 0xd8, ...jfif, ...exif, ...comment, ...sof, ...sos, ...data, 0xff, 0xd9, ...text('ftypmp42 motion')]);
}

// A PNG of 512 by 512 with a text chunk.
function png(): Uint8Array {
  const chunk = (type: string, body: number[]) => {
    const length = [body.length >>> 24, (body.length >> 16) & 255, (body.length >> 8) & 255, body.length & 255];
    return [...length, ...[...type].map((c) => c.charCodeAt(0)), ...body, 1, 2, 3, 4];
  };
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  return Uint8Array.from([
    ...signature,
    ...chunk('IHDR', [0, 0, 2, 0, 0, 0, 2, 0, 8, 6, 0, 0, 0]),
    ...chunk('tEXt', [...'Author\0me'].map((c) => c.charCodeAt(0))),
    ...chunk('IDAT', [9, 9, 9]),
    ...chunk('IEND', []),
  ]);
}

const has = (bytes: Uint8Array, s: string) => Buffer.from(bytes).includes(Buffer.from(s, 'latin1'));

t('a sticker keeps only the picture of its photo, and only a small JPEG or PNG is one', async () => {
  const sticker = stickerPhoto(jpeg());
  for (const gone of ['GPS', 'Pixel', 'motion']) assert.ok(!has(sticker, gone), gone);
  assert.deepEqual(photoSize(sticker), { w: 512, h: 512 });
  assert.deepEqual(stickerMeta(sticker), { name: 'sticker.jpg', mime: 'image/jpeg', kind: 'photo', sticker: true, w: 512, h: 512 });
  const picture = stickerPhoto(png());
  assert.ok(!has(picture, 'Author'));
  assert.deepEqual(stickerMeta(picture), { name: 'sticker.png', mime: 'image/png', kind: 'photo', sticker: true, w: 512, h: 512 });

  assert.throws(() => stickerPhoto(jpeg(MAX_STICKER)), NotStickerError, 'too large');
  assert.throws(() => stickerPhoto(randomBytes(500)), NotStickerError, 'not a photo');
  assert.throws(() => stickerPhoto(Uint8Array.from([...'GIF89a'].map((c) => c.charCodeAt(0)))), NotStickerError);
  assert.throws(() => stickerPhoto(jpeg().subarray(0, 40)), NotStickerError, 'cut short');

  // Drawn again at a lower quality until it is small enough, or not made.
  const asked: number[] = [];
  const made = await fitSticker(async (quality) => {
    asked.push(quality);
    return jpeg(quality > 0.7 ? MAX_STICKER : 100);
  });
  assert.deepEqual(asked, [0.85, 0.75, 0.65]);
  assert.ok(made.length <= MAX_STICKER && !has(made, 'GPS'));
  await assert.rejects(fitSticker(async () => jpeg(MAX_STICKER)), NotStickerError);
});

const place = (holder: StickerPlace['holder'] = 'space', space = 0, key = randomBytes(32)): StickerPlace => ({ holder, space, key });
const pictures = () => [...blobs.keys()].filter((name) => name.startsWith(PHOTO));

t("a space's stickers and its hidden chats' are each their own, sealed, and show nowhere else", async () => {
  const space = place('space', 0);
  const hidden = place(hiddenHolder(0), 0);
  const picture = stickerPhoto(jpeg());
  const ours = await addOwnSticker(space, picture);
  assert.deepEqual(await loadOwnStickers(space), [ours]);
  assert.deepEqual(await loadOwnStickers(hidden), [], 'not in the hidden chats');
  const secret = await addOwnSticker(hidden, stickerPhoto(png()));
  assert.deepEqual(await loadOwnStickers(hidden), [secret]);
  assert.deepEqual(await loadOwnStickers(space), [ours], 'nor theirs in the space');
  assert.deepEqual(await loadOwnStickers(place('space', 1)), [], 'nor in another space');
  assert.deepEqual(await loadOwnStickers({ ...space, key: randomBytes(32) }), [], 'nor with another key');

  // The picture is sealed in a file of its own, and only the sealed list says which and with what key.
  assert.deepEqual(await openOwnSticker(ours), picture);
  const sealed = blobs.get(PHOTO + ours.id)!;
  assert.ok(!has(sealed, 'JFIF') && sealed.length >= picture.length);
  const kept = files.get(FILE)!;
  for (const word of [ours.id, ours.key, secret.id, 'stickers']) assert.ok(!kept.includes(word), word);
  // A space's list and its hidden chats' look alike: each value is the same size, used or not.
  const values = Object.values(JSON.parse(kept) as Record<string, string[]>).flat();
  assert.equal(new Set(values.map((value) => value.length)).size, 1);

  // Deleted, it goes with its picture; the other place keeps its own.
  await removeOwnSticker(space, ours.id);
  assert.deepEqual(await loadOwnStickers(space), []);
  assert.equal(blobs.has(PHOTO + ours.id), false);
  assert.deepEqual(await loadOwnStickers(hidden), [secret]);
  assert.deepEqual(pictures(), [PHOTO + secret.id]);
});

t('a space keeps 100 stickers at most, in its own block', async () => {
  const space = place();
  const picture = stickerPhoto(jpeg());
  // Made at once, each on what the one before left.
  await Promise.all(Array.from({ length: MAX_OWN_STICKERS }, () => addOwnSticker(space, picture)));
  assert.equal((await loadOwnStickers(space)).length, MAX_OWN_STICKERS);
  assert.equal(pictures().length, MAX_OWN_STICKERS);
  assert.ok(![...files.keys(), ...blobs.keys()].some((name) => name.startsWith('erevos-page-')), 'all of them in the block');
  await assert.rejects(addOwnSticker(space, picture), TooManyStickersError);
  assert.equal(pictures().length, MAX_OWN_STICKERS, 'nothing kept of one too many');
  // The hidden chats have room of their own.
  await addOwnSticker(place(hiddenHolder(1), 0, space.key), picture);
  // One deleted makes room.
  const [first] = await loadOwnStickers(space);
  await removeOwnSticker(space, first.id);
  await addOwnSticker(space, picture);
  assert.equal((await loadOwnStickers(space)).length, MAX_OWN_STICKERS);
});

// Sent and received.

const OFFER: FileOffer = {
  name: 'sticker.jpg',
  mime: 'image/jpeg',
  kind: 'photo',
  size: 3000,
  w: 512,
  h: 512,
  sticker: true,
  relay: 'ws://127.0.0.1:7879',
  ids: 'ab'.repeat(24),
  key: 'cd'.repeat(32),
  chunk: 64 * 1024,
};

// How an Erevos from before read a file's offer in a message (lib/attachments.ts then): field by
// field, the ones it knew. A chat's and a group's message, and a linked device's, all read it so.
function readBefore(value: unknown): FileOffer | null {
  const v = value as Partial<FileOffer> | null;
  if (!v || typeof v !== 'object') return null;
  const meta = {
    name: cleanFileName(typeof v.name === 'string' ? v.name : ''),
    mime: cleanMime(v.mime),
    kind: v.kind,
    size: v.size,
    ...(v.w !== undefined ? { w: v.w } : {}),
    ...(v.h !== undefined ? { h: v.h } : {}),
  };
  if (!isFileMeta(meta) || typeof v.relay !== 'string' || typeof v.key !== 'string' || typeof v.ids !== 'string') return null;
  if (v.chunk !== chunkPlan(meta.size).chunk) return null;
  return { ...meta, relay: v.relay, ids: v.ids, key: v.key, chunk: v.chunk };
}

t('the sticker mark travels in the offer, and stays only on a small photo', () => {
  const wire = JSON.parse(JSON.stringify(OFFER));
  assert.deepEqual(readOffer(wire), OFFER);
  assert.equal(offerRef(readOffer(wire)!).sticker, true);
  // Marked on what cannot be one, it comes as what it is.
  assert.equal(readOffer({ ...wire, size: MAX_STICKER + 1, chunk: chunkPlan(MAX_STICKER + 1).chunk })!.sticker, undefined);
  assert.equal(readOffer({ ...wire, kind: 'file' })!.sticker, undefined);
  assert.equal(readOffer({ ...wire, mime: 'image/gif' })!.sticker, undefined);
  assert.equal(readOffer({ ...wire, sticker: 'yes' })!.sticker, undefined);
  assert.equal(fitsSticker({ kind: 'photo', mime: 'image/png', size: MAX_STICKER }), true);
  // Kept so only when it is one.
  const ref = { ...offerRef(OFFER), from: undefined };
  assert.equal(isFileRef(ref), true);
  assert.equal(isFileRef({ ...ref, size: MAX_STICKER + 1, chunk: chunkPlan(MAX_STICKER + 1).chunk }), false);
});

t('an Erevos from before shows a sticker made from a photo as a photo', () => {
  const old = readBefore(JSON.parse(JSON.stringify(OFFER)))!;
  assert.ok(old, 'it still reads the offer');
  assert.equal(old.kind, 'photo');
  assert.equal('sticker' in old, false);
  const ref = offerRef(old);
  assert.equal(messageLine({ text: '', file: ref }), 'Photo');
  // This one shows the same offer as a sticker.
  assert.equal(messageLine({ text: '', file: offerRef(readOffer(JSON.parse(JSON.stringify(OFFER)))!) }), 'Sticker');
});

const message = (r: Received) => {
  assert.equal(r.kind, 'message');
  return r as Extract<Received, { kind: 'message' }>;
};

const sender = () => toHex(randomBytes(24));

t(
  'a sticker made from a photo goes end-to-end encrypted as a photo, and comes as a sticker, kept so',
  async () => {
    const alice = await E2E.open('space', 0, randomBytes(32));
    const bobKey = randomBytes(32);
    const bob = await E2E.open('space', 1, bobKey);
    const [aliceFrom, bobFrom] = [sender(), sender()];
    const { identity } = await alice.addContact({ senderHex: bobFrom, key: toBase64Url(bob.bundle) }, aliceFrom);
    await bob.receive(alice.pending()[0].first);
    await alice.firstSent(identity);
    const sealed = await alice.sealFile(identity, OFFER, aliceFrom);
    const came = message(await bob.receive(sealed.packet));
    assert.deepEqual(came.file, OFFER);
    // Kept in the chat's history as a sticker, and still one once it opens again.
    const history = await History.open('space', 1, bobKey);
    await history.add({ peer: 'contact:aa', text: '', mine: false, at: 1, tag: newTag(), file: offerRef(came.file!) });
    const again = await History.open('space', 1, bobKey);
    assert.equal(again.messages()[0].file?.sticker, true);
    assert.equal(messageLine(again.messages()[0]), 'Sticker');
  },
  !coreReady,
);

let relay = '';
let theirs = '';

before(async () => {
  if (!ready) return;
  relay = await startRelay();
  theirs = await startRelay();
});

t(
  "a sticker's picture goes through the relay's file store and comes marked, as it was",
  async () => {
    const picture = stickerPhoto(jpeg(2000));
    const { ref, offer } = await sendFile({ url: relay }, bytesSource(picture), stickerMeta(picture));
    assert.equal(ref.sticker, true);
    assert.equal(offer.sticker, true);
    assert.equal(ref.count, 1, 'one small chunk, as a small photo');
    const taken = await takeFile({ url: theirs }, offerRef(readOffer(JSON.parse(JSON.stringify(offer)))!));
    assert.equal(taken.sticker, true);
    assert.deepEqual(await readFile(taken), picture);
    // Kept as one's own from the message it came in.
    const mine = place();
    const kept = await keepAsSticker(mine, taken);
    assert.deepEqual(await openOwnSticker(kept), picture);
    assert.deepEqual(await loadOwnStickers(mine), [kept]);
  },
  !ready,
);

t('a sticker that came is added to the stickers of the place it is in, and only one', async () => {
  const picture = stickerPhoto(png());
  const file = await keepFile(bytesSource(picture), stickerMeta(picture));
  const hidden = place(hiddenHolder(2), 0);
  const kept = await keepAsSticker(hidden, file);
  assert.deepEqual(await loadOwnStickers(hidden), [kept]);
  assert.notEqual(kept.id, file.id, 'a copy of its own: deleting the message leaves it');
  assert.deepEqual(await openOwnSticker(kept), picture);
  assert.deepEqual(await loadOwnStickers(place('space', 0, hidden.key)), []);

  // A photo is not a sticker; one still on the relay is not here to keep.
  const photo = await keepFile(bytesSource(picture), { name: 'p.png', mime: 'image/png', kind: 'photo' });
  await assert.rejects(keepAsSticker(hidden, photo), NotStickerError);
  await assert.rejects(keepAsSticker(hidden, offerRef(OFFER)));
  // Marked, but not a picture: nothing is kept.
  const odd = await keepFile(bytesSource(randomBytes(400)), { name: 'sticker.jpg', mime: 'image/jpeg', kind: 'photo', sticker: true });
  assert.equal(odd.sticker, true);
  await assert.rejects(keepAsSticker(hidden, odd), NotStickerError);
  assert.equal((await loadOwnStickers(hidden)).length, 1);
});

t('a sticker made from a photo forwards as one, and reads as a sticker in lists, search and a chat written out', () => {
  const { from: _relay, ...sticker }: FileRef = offerRef(OFFER);
  assert.equal(fileCopy(sticker).meta.sticker, true);
  const { sticker: _gone, ...photo } = sticker;
  assert.equal('sticker' in fileCopy({ ...photo, name: 'IMG_1.jpg' }).meta, false);

  const at = Date.UTC(2026, 9, 21, 9, 30);
  const said = [
    { peer: 'contact:aa', tag: newTag(), at, mine: false, text: '', file: sticker },
    { peer: 'contact:aa', tag: newTag(), at: at + 1, mine: true, text: '', file: { ...photo, name: 'IMG_1.jpg' } },
  ];
  assert.deepEqual(searchMessages(said, 'stick').map((found) => [found.tag, found.line]), [[said[0].tag, 'Sticker']]);
  assert.deepEqual(searchMessages(said, 'sticker.jpg'), [], 'not by the name of its file');
  const text = chatText(said, 'Alice', at + 2);
  assert.match(text, /\[Sticker\]/);
  assert.match(text, /\[Photo: IMG_1\.jpg\]/);

  const contacts = [{ identity: 'aa', name: 'Alice', timer: 0 }];
  assert.equal(buildInbox(contacts, [{ ...said[0] }], [], at + 2)[0].last, 'Sticker');
  const group = { id: 'g', name: 'g', status: 'in' as const, unread: 1, last: { at, from: 'bb', text: '', file: sticker } };
  assert.equal(groupRows([group], () => 'Bob', (text) => text)[0].last, 'Bob: Sticker');
});
