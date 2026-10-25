// Chats imported from other messengers (lib/imports.ts) with the real Rust core, built to
// WebAssembly by checks/build-core.mjs, and kept sealed (lock/archive.ts). The core's own
// tests (crates/erevos-import) cover the export formats; these cover the way into the app.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';

import { setCore, type Core } from '../lib/core';
import { randomBytes, utf8Encode } from '../lib/crypto';
import { fileName, mediaText, oneChatOf, readExport, senders, toArchived, toMillis, type OpenedExport } from '../lib/imports';
import { Archive, FILE } from '../lock/archive';
import { files } from './files-memory';

const built = new URL('./.core/erevos_ffi.js', import.meta.url);
const ready = existsSync(built);
if (ready) {
  const wasm = createRequire(import.meta.url)(built.pathname) as Record<string, (...args: never[]) => unknown>;
  setCore(
    Object.fromEntries(
      Object.entries(wasm).map(([name, call]) => [name, async (...args: never[]) => call(...args)]),
    ) as unknown as Core,
  );
} else {
  console.log('Skipping the import checks: build the core first with node checks/build-core.mjs');
}

const t = (name: string, fn: () => Promise<void>) =>
  test(name, { skip: !ready }, async () => {
    files.clear();
    await fn();
  });

const WHATSAPP = `17/10/2026, 09:05 - Messages and calls are end-to-end encrypted.
17/10/2026, 09:06 - Μαρία: Καλημέρα!
Τι κάνεις;
17/10/2026, 22:41 - Nekten: IMG-20261017-WA0001.jpg (file attached)
18/10/2026, 07:00 - Nekten: καλά`;

t('a WhatsApp export comes in, is kept sealed in its space, and can be deleted', async () => {
  const chats = await readExport('WhatsApp Chat with Μαρία.txt', utf8Encode(WHATSAPP));
  assert.equal(chats.length, 1);
  assert.deepEqual([chats[0].source, chats[0].title, chats[0].skipped], ['whatsapp', 'Μαρία', 1]);
  assert.deepEqual(senders(chats), ['Nekten', 'Μαρία']);

  const key = randomBytes(32);
  const archive = await Archive.open('space', 0, key);
  const [id] = await archive.add(toArchived(chats, 'Nekten', 5));
  const again = await Archive.open('space', 0, key);
  const [summary] = again.chats();
  assert.deepEqual([summary.id, summary.title, summary.me, summary.count, summary.added], [id, 'Μαρία', 'Nekten', 3, 5]);
  const messages = again.chat(id)!.messages;
  assert.deepEqual(
    messages.map(([, sender, text, media]) => [sender, text, media]),
    [
      ['Μαρία', 'Καλημέρα!\nΤι κάνεις;', ''],
      ['Nekten', '', 'photo'],
      ['Nekten', 'καλά', ''],
    ],
  );
  // 09:06 on the exporting phone's clock is 09:06 on this one's.
  const first = new Date(messages[0][0]);
  assert.deepEqual([first.getFullYear(), first.getMonth(), first.getDate(), first.getHours(), first.getMinutes()], [2026, 9, 17, 9, 6]);
  assert.ok(summary.first < summary.last);

  assert.ok(!files.get(FILE)!.includes('Καλημέρα') && !files.get(FILE)!.includes('Nekten'));
  assert.deepEqual((await Archive.open('space', 1, key)).chats(), []);
  assert.deepEqual((await Archive.open('hidden', 0, key)).chats(), []);

  await again.remove(id);
  assert.deepEqual((await Archive.open('space', 0, key)).chats(), []);
});

t('an imported chat goes on with a contact, its messages ahead of theirs', async () => {
  const key = randomBytes(32);
  const archive = await Archive.open('space', 0, key);
  const maria = 'ab'.repeat(32);
  const [whatsapp] = await archive.add(toArchived(await readExport('WhatsApp Chat with Μαρία.txt', utf8Encode(WHATSAPP)), 'Nekten'));
  const telegram = JSON.stringify({
    name: 'Μαρία',
    messages: [
      { id: 1, type: 'message', date_unixtime: '1600000000', from: 'Μαρία', text: 'πρώτο' },
      { id: 2, type: 'message', from: 'Μαρία', text: 'χωρίς ώρα' },
      { id: 3, type: 'message', date_unixtime: String(Date.UTC(2026, 9, 19) / 1000), from: 'Nekten', text: 'τελευταίο' },
    ],
  });
  const [older] = await archive.add(toArchived(await readExport('result.json', utf8Encode(telegram)), 'Nekten'));
  assert.deepEqual(archive.linked(maria), []);
  await assert.rejects(archive.link(whatsapp, 'not a key'), /contact/);

  await archive.link(whatsapp, maria);
  await archive.link(older, maria);
  const again = await Archive.open('space', 0, key);
  assert.deepEqual(again.linkedChats(maria).map((chat) => chat.id).sort(), [whatsapp, older].sort());
  assert.deepEqual(
    again.linked(maria).map((m) => [m.source, m.mine, m.text || m.media]),
    [
      ['telegram', false, 'πρώτο'],
      ['telegram', false, 'χωρίς ώρα'],
      ['whatsapp', false, 'Καλημέρα!\nΤι κάνεις;'],
      ['whatsapp', true, 'photo'],
      ['whatsapp', true, 'καλά'],
      ['telegram', true, 'τελευταίο'],
    ],
  );
  assert.deepEqual(again.linked(''), []);
  assert.deepEqual(again.linked('cd'.repeat(32)), []);

  await again.link(older, '');
  assert.deepEqual((await Archive.open('space', 0, key)).linked(maria).map((m) => m.source), ['whatsapp', 'whatsapp', 'whatsapp']);
  await again.remove(whatsapp);
  assert.deepEqual((await Archive.open('space', 0, key)).linked(maria), []);
});

t("an imported chat kept only in its contact's chat, until it goes on with no one", async () => {
  const key = randomBytes(32);
  const archive = await Archive.open('space', 0, key);
  const maria = 'ab'.repeat(32);
  const [id] = await archive.add(toArchived(await readExport('WhatsApp Chat with Μαρία.txt', utf8Encode(WHATSAPP)), 'Nekten'));
  await archive.link(id, maria, true);
  const inChat = (await Archive.open('space', 0, key)).chats()[0];
  assert.equal(inChat.contact, maria);
  assert.equal(inChat.inChat, true);
  // Kept among the Imported chats too, again.
  await archive.link(id, maria);
  assert.equal((await Archive.open('space', 0, key)).chats()[0].inChat, undefined);
  // With no one to go on with, it is never only in a chat.
  await archive.link(id, maria, true);
  await archive.link(id, '', true);
  const unlinked = (await Archive.open('space', 0, key)).chats()[0];
  assert.deepEqual([unlinked.contact, unlinked.inChat], ['', undefined]);
});

t('one chat of an export of many, with only its own files', async () => {
  const opened = {
    chats: [
      { title: 'Α', source: 'telegram', messages: [{ paths: ['a.jpg'] }, { paths: [] }] },
      { title: 'Β', source: 'telegram', messages: [{ paths: ['b.jpg', 'c.ogg'] }] },
    ],
    files: new Map([
      ['a.jpg', 1],
      ['b.jpg', 2],
      ['c.ogg', 3],
    ]),
  } as unknown as OpenedExport;
  const one = oneChatOf(opened, 1);
  assert.deepEqual(one.chats.map((chat) => chat.title), ['Β']);
  assert.deepEqual([...one.files.keys()], ['b.jpg', 'c.ogg']);
  assert.equal(opened.chats.length, 2);
});

t('every value in the file is the same size until one outgrows a block', async () => {
  const archive = await Archive.open('space', 2, randomBytes(32));
  await archive.add(toArchived(await readExport('a.txt', utf8Encode(WHATSAPP)), ''));
  const data = JSON.parse(files.get(FILE)!) as Record<string, string[]>;
  const sizes = new Set([...data.space, ...data.hidden].map((v) => v.length));
  assert.equal(sizes.size, 1);
});

t('a Telegram export of many chats, and a file Erevos cannot read', async () => {
  const json = JSON.stringify({
    chats: {
      list: [
        { name: 'Α', messages: [{ id: 1, type: 'message', date_unixtime: '1700000000', from: 'Nekten', text: 'hi' }] },
        { name: 'Β', messages: [{ id: 1, type: 'message', from: 'Nekten', text: ['a ', { type: 'bold', text: 'b' }] }] },
      ],
    },
  });
  const chats = await readExport('result.json', utf8Encode(json));
  assert.deepEqual(chats.map((c) => [c.source, c.title, c.messages[0].text]), [['telegram', 'Α', 'hi'], ['telegram', 'Β', 'a b']]);
  const [a, b] = toArchived(chats, 'Nekten');
  assert.equal(a.messages[0][0], 1_700_000_000_000);
  assert.equal(b.messages[0][0], 0);

  await assert.rejects(readExport('chat.html', utf8Encode('<html><body>Viber</body></html>')), /result\.json/);
});

test('names of picked files and times without a zone', () => {
  assert.equal(
    fileName('content://com.android.externalstorage.documents/document/primary%3ADownload%2FWhatsApp%20Chat%20with%20%CE%9C%CE%B1%CF%81%CE%AF%CE%B1.txt'),
    'WhatsApp Chat with Μαρία.txt',
  );
  assert.equal(fileName('file:///data/user/0/cache/result.json'), 'result.json');
  assert.equal(fileName('content://downloads/document/100%'), '100%');
  assert.equal(mediaText('photo,voice,hologram'), 'Photo, Voice message, File');
  assert.equal(mediaText(''), '');
  assert.equal(toMillis(null, true), 0);
  assert.equal(toMillis(10, false), 10_000);
  const local = new Date(toMillis(Date.UTC(2026, 0, 2, 3, 4, 5) / 1000, true));
  assert.deepEqual([local.getFullYear(), local.getMonth(), local.getDate(), local.getHours(), local.getMinutes(), local.getSeconds()], [2026, 0, 2, 3, 4, 5]);
});
