// Chats imported with their photos, videos and files (lib/imports.ts): the zip read a piece at a
// time (lib/zip-source.ts), zip64 too, each file kept sealed as a message's file is
// (lib/attachments.ts keepFile) and deleted with its chat (lock/archive.ts). With the real Rust
// core, built to WebAssembly by checks/build-core.mjs.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';

import { zipSync } from 'fflate';

import { bytesSource, readFile, type Source } from '../lib/attachments';
import { setCore, type Core } from '../lib/core';
import { randomBytes, utf8Decode, utf8Encode } from '../lib/crypto';
import { exportFiles, ImportStoppedError, keepExportFiles, MAX_IMPORTED_FILE, openExport, toArchived } from '../lib/imports';
import { entrySource, isZip, readEntry, zipEntries, ZipError } from '../lib/zip-source';
import { Archive } from '../lock/archive';
import { PREFIX } from '../lock/attachment-files';
import { blobs, files } from './files-memory';

const built = new URL('./.core/erevos_ffi.js', import.meta.url);
const ready = existsSync(built);
if (ready) {
  const wasm = createRequire(import.meta.url)(built.pathname) as Record<string, (...args: never[]) => unknown>;
  setCore(
    Object.fromEntries(Object.entries(wasm).map(([name, call]) => [name, async (...args: never[]) => call(...args)])) as unknown as Core,
  );
} else {
  console.log('Skipping the checks of imports with files: build the core first with node checks/build-core.mjs');
}

const withCore = (name: string, fn: () => Promise<void>) =>
  test(name, { skip: !ready }, async () => {
    files.clear();
    blobs.clear();
    await fn();
  });

// Bytes that deflate well, but not to nothing.
const sample = (length: number, seed = 1) => {
  const out = new Uint8Array(length);
  let x = seed;
  for (let i = 0; i < length; i++) {
    x = (x * 1103515245 + 12345) & 0x7fffffff;
    out[i] = i % 7 === 0 ? x & 0xff : 65 + (i % 13);
  }
  return out;
};

const joined = (parts: Uint8Array[]) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const part of parts) {
    out.set(part, at);
    at += part.length;
  }
  return out;
};

// Counts how much of the zip is read, to show it is never read whole.
const counted = (bytes: Uint8Array) => {
  const source = bytesSource(bytes);
  const seen = { most: 0 };
  return {
    seen,
    source: {
      size: source.size,
      read: (at: number, length: number) => {
        seen.most = Math.max(seen.most, length);
        return source.read(at, length);
      },
    } as Source,
  };
};

test('a zip is read a piece at a time: stored and deflated files, in order, and again from the start', async () => {
  const big = sample(900_000);
  const zip = zipSync({ 'notes.txt': [utf8Encode('γεια'), { level: 0 }], 'folder/big.bin': [big, { level: 6 }] });
  const { source, seen } = counted(zip);
  assert.ok(await isZip(source));
  assert.ok(!(await isZip(bytesSource(utf8Encode('17/10/2026, 09:06 - Μαρία: γεια')))));
  const entries = await zipEntries(source);
  assert.deepEqual(entries.map((e) => [e.name, e.method, e.size]), [['notes.txt', 0, 8], ['folder/big.bin', 8, 900_000]]);
  assert.equal(utf8Decode(await readEntry(source, entries[0], 100)), 'γεια');
  await assert.rejects(readEntry(source, entries[0], 4), ZipError);

  const file = await entrySource(source, entries[1]);
  const parts: Uint8Array[] = [];
  for (let at = 0; at < file.size; at += 65_000) parts.push(await file.read(at, 65_000));
  assert.deepEqual(joined(parts), big);
  // From further back it starts again.
  assert.deepEqual(await file.read(10, 5), big.subarray(10, 15));
  assert.ok(seen.most <= 256 * 1024 + 0xffff + 22, `read ${seen.most} bytes at once`);

  await assert.rejects(zipEntries(bytesSource(zip.subarray(0, zip.length - 30))), ZipError);
  const cut = zip.slice();
  cut.fill(0, entries[1].offset, entries[1].offset + 4);
  await assert.rejects(async () => (await entrySource(bytesSource(cut), entries[1])).read(0, 900_000), ZipError);
});

// A zip64 of stored files, as a zip over 4 GB is, with each file wherever `at` puts it: what lies
// between reads as zeros, so the zip need not be that large in memory.
function zip64(entries: { name: string; bytes?: Uint8Array; size?: number; at: number }[]): Source {
  const segments: { at: number; bytes: Uint8Array }[] = [];
  const le = (value: number, width: number) => {
    const out = new Uint8Array(width);
    for (let i = 0; i < width; i++) out[i] = Math.floor(value / 2 ** (8 * i)) % 256;
    return out;
  };
  const central: Uint8Array[] = [];
  let end = 0;
  for (const { name, bytes, size = bytes?.length ?? 0, at } of entries) {
    const named = utf8Encode(name);
    const local = joined([le(0x04034b50, 4), le(45, 2), le(0, 2), le(0, 2), le(0, 4), le(0, 4), le(0xffffffff, 4), le(0xffffffff, 4), le(named.length, 2), le(20, 2), named, le(1, 2), le(16, 2), le(size, 8), le(size, 8)]);
    segments.push({ at, bytes: local });
    if (bytes) segments.push({ at: at + local.length, bytes });
    end = Math.max(end, at + local.length + size);
    central.push(
      joined([
        le(0x02014b50, 4), le(45, 2), le(45, 2), le(0x800, 2), le(0, 2), le(0, 4), le(0, 4),
        le(0xffffffff, 4), le(0xffffffff, 4), le(named.length, 2), le(28, 2), le(0, 2), le(0, 2), le(0, 2), le(0, 4),
        le(0xffffffff, 4), named, le(1, 2), le(24, 2), le(size, 8), le(size, 8), le(at, 8),
      ]),
    );
  }
  const dir = joined(central);
  const dirAt = end;
  const record = joined([le(0x06064b50, 4), le(44, 8), le(45, 2), le(45, 2), le(0, 4), le(0, 4), le(entries.length, 8), le(entries.length, 8), le(dir.length, 8), le(dirAt, 8)]);
  const recordAt = dirAt + dir.length;
  const tail = joined([
    record,
    le(0x07064b50, 4), le(0, 4), le(recordAt, 8), le(1, 4),
    le(0x06054b50, 4), le(0, 2), le(0, 2), le(0xffff, 2), le(0xffff, 2), le(0xffffffff, 4), le(0xffffffff, 4), le(0, 2),
  ]);
  segments.push({ at: dirAt, bytes: joined([dir, tail]) });
  const size = dirAt + dir.length + tail.length;
  return {
    size,
    read: async (at, length) => {
      const out = new Uint8Array(Math.max(0, Math.min(length, size - at)));
      for (const segment of segments) {
        const from = Math.max(at, segment.at);
        const to = Math.min(at + out.length, segment.at + segment.bytes.length);
        if (from < to) out.set(segment.bytes.subarray(from - segment.at, to - segment.at), from - at);
      }
      return out;
    },
  };
}

test('a zip over 4 GB (zip64): its files found and read where they are', async () => {
  const photo = sample(5000, 7);
  const source = zip64([
    { name: 'a.txt', bytes: utf8Encode('hi'), at: 0 },
    { name: 'IMG-1.jpg', bytes: photo, at: 5_000_000_000 },
  ]);
  assert.ok(source.size > 2 ** 32);
  const entries = await zipEntries(source);
  assert.deepEqual(entries.map((e) => [e.name, e.size, e.offset]), [['a.txt', 2, 0], ['IMG-1.jpg', 5000, 5_000_000_000]]);
  assert.deepEqual(await readEntry(source, entries[1], 10_000), photo);
});

const WHATSAPP = `17/10/2026, 09:06 - Μαρία: Καλημέρα!
17/10/2026, 22:41 - Nekten: IMG-20261017-WA0001.jpg (file attached)
17/10/2026, 22:42 - Μαρία: PTT-20261017-WA0002.opus (file attached)
17/10/2026, 22:43 - Μαρία: IMG-20261017-WA0003.jpg (file attached)`;

withCore('a WhatsApp zip with its media: the files come in sealed, and go with the chat', async () => {
  const photo = sample(300_000, 3);
  const voice = sample(40_000, 4);
  const zip = zipSync({
    'WhatsApp Chat with Μαρία.txt': utf8Encode(WHATSAPP),
    'IMG-20261017-WA0001.jpg': [photo, { level: 0 }],
    'PTT-20261017-WA0002.opus': voice,
  });
  const opened = await openExport('WhatsApp Chat with Μαρία.zip', bytesSource(zip), 1000);
  assert.deepEqual(opened.chats.map((c) => [c.source, c.title, c.messages.length]), [['whatsapp', 'Μαρία', 4]]);
  assert.deepEqual(exportFiles(opened), { count: 2, bytes: 340_000, tooLarge: 0 });

  const told: string[] = [];
  const chats = await keepExportFiles(opened, ({ done, count, percent }) => told.push(`${done}/${count} ${percent}%`));
  // Told chunk by chunk, never going back, until all of it is kept.
  assert.ok(told.length >= 4);
  assert.deepEqual(told.at(-1), '2/2 100%');
  assert.ok(told.includes('1/2 88%'));
  const percents = told.map((line) => Number(line.split(' ')[1].slice(0, -1)));
  assert.ok(percents.every((p, i) => i === 0 || p >= percents[i - 1]));
  const key = randomBytes(32);
  const archive = await Archive.open('space', 0, key);
  const [id] = await archive.add(toArchived(chats, 'Nekten'));

  const messages = (await Archive.open('space', 0, key)).chat(id)!.messages;
  // The one the zip does not hold stays behind, named.
  assert.deepEqual(messages.map(([, , text, media, kept = []]) => [text, media, kept.map((f) => [f.name, f.kind, f.mime])]), [
    ['Καλημέρα!', '', []],
    ['', '', [['IMG-20261017-WA0001.jpg', 'photo', 'image/jpeg']]],
    ['', '', [['PTT-20261017-WA0002.opus', 'file', 'audio/ogg']]],
    ['', 'photo', []],
  ]);
  const [kept] = messages[1][4]!;
  assert.deepEqual(await readFile(kept), photo);
  assert.deepEqual(await readFile(messages[2][4]![0]), voice);
  // Sealed: neither the file nor its name is in what is kept.
  const chunks = [...blobs.keys()].filter((name) => name.startsWith(PREFIX));
  assert.ok(chunks.length >= 2);
  assert.ok(chunks.every((name) => !name.includes('IMG')));

  await archive.link(id, 'ab'.repeat(32));
  assert.deepEqual(archive.linked('ab'.repeat(32)).map((m) => m.files.length), [0, 1, 1, 0]);
  await archive.remove(id);
  assert.deepEqual([...blobs.keys()].filter((name) => name.startsWith(PREFIX)), []);
});

withCore('keeping the files lets the screen draw, and stopped, keeps none of them', async () => {
  const zip = zipSync({
    'WhatsApp Chat with Μαρία.txt': utf8Encode(WHATSAPP),
    'IMG-20261017-WA0001.jpg': [sample(2_000_000, 6), { level: 0 }],
    'PTT-20261017-WA0002.opus': sample(40_000, 4),
  });
  const opened = await openExport('WhatsApp Chat with Μαρία.zip', bytesSource(zip), 1000);
  // Some time after the screen last drew, a timer set now runs before the files are all kept.
  await new Promise((resolve) => setTimeout(resolve, 60));
  let drew = false;
  setTimeout(() => (drew = true), 0);
  let drewBefore = false;
  await keepExportFiles(opened, ({ done }) => {
    if (done === 1) drewBefore ||= drew;
  });
  assert.ok(drewBefore);
  for (const name of [...blobs.keys()]) blobs.delete(name);

  // Stopped once one file is kept: neither it nor any of the next is.
  let stop = false;
  await assert.rejects(
    keepExportFiles(
      opened,
      ({ done }) => {
        if (done === 1) stop = true;
      },
      () => stop,
    ),
    ImportStoppedError,
  );
  assert.deepEqual([...blobs.keys()].filter((name) => name.startsWith(PREFIX)), []);
});

withCore('a Telegram export folder in a zip: files by their paths from result.json', async () => {
  const json = JSON.stringify({
    name: 'Μαρία',
    messages: [
      { id: 1, type: 'message', date_unixtime: '1700000000', from: 'Μαρία', text: 'δες', photo: 'photos/photo_1@14-11-2023_22-13-40.jpg' },
      { id: 2, type: 'message', date_unixtime: '1700000010', from: 'Μαρία', text: '', file: 'voice_messages/audio_1.ogg', media_type: 'voice_message' },
      { id: 3, type: 'message', date_unixtime: '1700000020', from: 'Nekten', text: '', file: 'video_files/missing.mp4', media_type: 'video_file' },
      { id: 4, type: 'message', date_unixtime: '1700000030', from: 'Nekten', text: 'again', photo: 'photos/photo_1@14-11-2023_22-13-40.jpg' },
    ],
  });
  const photo = sample(20_000, 9);
  const zip = zipSync({
    'ChatExport_2026-10-20/result.json': utf8Encode(json),
    'ChatExport_2026-10-20/photos/photo_1@14-11-2023_22-13-40.jpg': photo,
    'ChatExport_2026-10-20/voice_messages/audio_1.ogg': sample(3000, 2),
    'ChatExport_2026-10-20/photos/photo_1@14-11-2023_22-13-40_thumb.jpg': sample(100, 5),
  });
  const opened = await openExport('ChatExport.zip', bytesSource(zip), 1000);
  assert.equal(exportFiles(opened).count, 2);
  const [chat] = toArchived(await keepExportFiles(opened), 'Nekten');
  assert.deepEqual(chat.messages.map(([, , text, media, kept = []]) => [text, media, kept.map((f) => f.kind)]), [
    ['δες', '', ['photo']],
    ['', '', ['file']],
    ['', 'video', []],
    ['again', '', ['photo']],
  ]);
  // One file named twice is kept once.
  assert.equal(chat.messages[0][4]![0].id, chat.messages[3][4]![0].id);
  assert.deepEqual(await readFile(chat.messages[0][4]![0]), photo);
});

withCore('a file larger than an imported one may be stays behind, and a text export is read whole', async () => {
  const text = '17/10/2026, 22:41 - Nekten: VID-20261017-WA0001.mp4 (file attached)';
  const source = zip64([
    { name: 'WhatsApp Chat with Μαρία.txt', bytes: utf8Encode(text), at: 0 },
    { name: 'VID-20261017-WA0001.mp4', size: MAX_IMPORTED_FILE + 1, at: 1000 },
  ]);
  const opened = await openExport('WhatsApp Chat with Μαρία.zip', source, 1000);
  assert.deepEqual(exportFiles(opened), { count: 0, bytes: 0, tooLarge: 1 });
  const [chat] = toArchived(await keepExportFiles(opened), 'Nekten');
  assert.deepEqual(chat.messages.map(([, , , media, kept]) => [media, kept]), [['video', undefined]]);

  // A plain text export has no files to bring in, and is still read whole.
  const plain = await openExport('WhatsApp Chat with Μαρία.txt', bytesSource(utf8Encode(text)), 1000);
  assert.deepEqual([plain.zip, plain.files.size], [null, 0]);
  await assert.rejects(openExport('WhatsApp Chat with Μαρία.txt', bytesSource(utf8Encode(text)), 10), /100 MB|large/);
});
