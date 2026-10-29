// A chat's media, links and files (lib/chat-media.ts): each kind apart, the newest first, its own
// messages' and what was imported; stickers left out; where each is in the chat; and the calendar's
// days and weeks.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { chatMedia, dayKey, daysOf, fileKind, groupMedia, importedTag, linksIn, monthWeeks } from '../lib/chat-media';
import type { GroupMessage } from '../lock/group-data';
import type { LinkedMessage } from '../lock/archive';
import type { FileRef } from '../lock/attachment-files';
import type { Message } from '../lock/history';

const file = (name: string, mime: string, kind: FileRef['kind'] = 'file', more: Partial<FileRef> = {}): FileRef => ({
  name,
  mime,
  kind,
  size: 1000,
  id: '0'.repeat(32),
  key: '0'.repeat(64),
  chunk: 65536,
  count: 1,
  ...more,
});
const message = (tag: string, at: number, more: Partial<Message> = {}): Message => ({ peer: 'p', text: '', mine: false, at, tag, ...more });
const linked = (at: number, more: Partial<LinkedMessage> = {}): LinkedMessage => ({ at, sender: 'Anna', text: '', media: '', files: [], mine: false, source: 'telegram', ...more });

test('each file goes in its own list, and a sticker in none', () => {
  assert.equal(fileKind(file('a.jpg', 'image/jpeg', 'photo')), 'photo');
  assert.equal(fileKind(file('a.png', 'image/png', 'photo', { sticker: true })), null);
  assert.equal(fileKind(file('sticker.webp', 'image/webp', 'photo'), true), null);
  assert.equal(fileKind(file('clip.mp4', 'video/mp4')), 'video');
  assert.equal(fileKind(file('clip.MOV', 'application/octet-stream')), 'video');
  assert.equal(fileKind(file('song.mp3', 'audio/mpeg')), 'music');
  // A voice message only as Telegram and WhatsApp name theirs, in what was imported.
  assert.equal(fileKind(file('PTT-20261001-WA0001.opus', 'audio/ogg'), true), 'voice');
  assert.equal(fileKind(file('audio_3@01-10-2026.ogg', 'audio/ogg'), true), 'voice');
  assert.equal(fileKind(file('song.ogg', 'audio/ogg'), true), 'music');
  assert.equal(fileKind(file('notes.pdf', 'application/pdf')), 'file');
});

test("a chat's media are its messages' and what was imported, the newest first, each knowing where it is", () => {
  const items = chatMedia(
    [
      message('t1', 100, { file: file('a.jpg', 'image/jpeg', 'photo') }),
      message('t2', 300, { voice: { id: '1'.repeat(32), key: '1'.repeat(64), ms: 4000 }, mine: true }),
      message('t3', 400, { text: 'see https://example.org/x. and www.erevos.test', preview: { url: 'https://example.org/x', title: 'Example', text: '' } }),
      message('t4', 500, { text: '🐶', sticker: 'dogs-1' }),
      message('t5', 600, { text: 'Where: https://maps.example/1', place: { lat: 1, lon: 2 } }),
    ],
    [linked(200, { files: [file('PTT-1.opus', 'audio/ogg'), file('b.jpg', 'image/jpeg', 'photo')], text: 'old https://old.example' })],
  );
  assert.deepEqual(
    items.map((item) => [item.kind, item.at, item.tag]),
    [
      ['link', 400, 't3'],
      ['link', 400, 't3'],
      ['voice', 300, 't2'],
      ['voice', 200, importedTag(0)],
      ['photo', 200, importedTag(0)],
      ['link', 200, importedTag(0)],
      ['photo', 100, 't1'],
    ],
  );
  assert.deepEqual(
    items.filter((item) => item.kind === 'link').map((item) => [item.url, item.title ?? '']),
    [
      ['https://example.org/x', 'Example'],
      ['https://www.erevos.test', ''],
      ['https://old.example', ''],
    ],
  );
  assert.equal(items.find((item) => item.kind === 'voice' && item.tag === 't2')?.mine, true);
  assert.equal(items.find((item) => item.tag === importedTag(0))?.sender, 'Anna');
  assert.equal(new Set(items.map((item) => item.key)).size, items.length);
});

test('a link is listed once, without the mark that ends its sentence', () => {
  assert.deepEqual(linksIn('https://a.example/1, https://a.example/1 and (https://b.example)'), ['https://a.example/1', 'https://b.example']);
  assert.deepEqual(linksIn('no links here'), []);
});

test("the calendar's days are those that have any, and its weeks start on Monday", () => {
  const at = new Date(2026, 9, 25, 10).getTime();
  assert.equal(dayKey(at), '2026-10-25');
  assert.deepEqual([...daysOf([{ at }, { at: at + 3600_000 }, { at: 0 }])], ['2026-10-25']);
  // October 2026 starts on a Thursday and has 31 days.
  const weeks = monthWeeks(2026, 9);
  assert.equal(weeks.length, 5);
  assert.deepEqual(weeks[0], [0, 0, 0, 1, 2, 3, 4]);
  assert.deepEqual(weeks[4], [26, 27, 28, 29, 30, 31, 0]);
  assert.ok(weeks.every((week) => week.length === 7));
  // February 2027 starts on a Monday: four whole weeks.
  assert.deepEqual(monthWeeks(2027, 1)[0], [1, 2, 3, 4, 5, 6, 7]);
  assert.equal(monthWeeks(2027, 1).length, 4);
});

test('a group lists its photos, voice messages, files and links, with who sent them, the newest first', () => {
  const sent = (tag: string, at: number, more: Partial<GroupMessage> = {}): GroupMessage => ({ at, from: 'aa', text: '', tag, ...more });
  const items = groupMedia(
    [
      sent('one', 1000, { file: file('a.jpg', 'image/jpeg', 'photo') }),
      sent('two', 2000, { file: file('voice', 'audio/mp4'), ms: 4000, from: '' }),
      sent('three', 3000, { text: 'see https://example.org/x and https://example.org/x' }),
      sent('four', 4000, { file: file('big.pdf', 'application/pdf', 'file', { from: { kind: 'blossom' } as never }) }),
      sent('five', 5000, { text: 'joined', note: true }),
      sent('six', 6000, { text: 'https://example.org/sticker', sticker: 'tux-1' }),
      sent('seven', 7000, { file: file('s.png', 'image/png', 'photo', { sticker: true }) }),
    ],
    (id) => `member ${id}`,
  );
  assert.deepEqual(
    items.map((i) => [i.tag, i.kind, i.sender, i.mine]),
    [
      ['four', 'file', 'member aa', false],
      ['three', 'link', 'member aa', false],
      ['two', 'voice', '', true],
      ['one', 'photo', 'member aa', false],
    ],
  );
  assert.equal(items.find((i) => i.kind === 'voice')?.ms, 4000);
});
