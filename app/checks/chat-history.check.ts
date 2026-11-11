// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// Search in this chat, Go to a day, Media, links and files and Export chat for the chats on
// Matrix, XMPP, Nostr and SMS (lib/chat-history.ts): what the search finds, the media each kind
// apart, the chat written out as an Erevos chat is, and each service's messages as they are looked
// through (lib/chat-history-adapters.ts).
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { chatText } from '../lib/chat-export';
import { drawnTo, firstOfDay, historyDays, historyMedia, historyWritten, joined, searchHistory, type HistoryMessage } from '../lib/chat-history';
import { matrixHistory, nostrHistory, smsHistory, xmppHistory } from '../lib/chat-history-adapters';
import { dayKey } from '../lib/chat-media';
import type { MatrixMessage } from '../lib/matrix';
import type { NostrDmMessage } from '../lib/nostr-dm';
import type { XmppMessage } from '../lib/xmpp';
import type { SmsMessage } from '../modules/erevos-sms';

// The times written out are the phone's own: here, UTC.
process.env.TZ = 'UTC';

const DAY = Date.UTC(2026, 9, 18, 9, 15);
const MINUTE = 60_000;
const message = (id: string, at: number, more: Partial<HistoryMessage> = {}): HistoryMessage => ({ id, at, mine: false, text: '', ...more });

test('the search finds words and file names, ignoring case and accents, the latest first', () => {
  const messages = [
    message('a', DAY, { text: 'Καλημέρα από την Αθήνα' }),
    message('b', DAY + MINUTE, { text: '', files: [{ kind: 'file', name: 'athens-map.pdf' }] }),
    message('c', DAY + 2 * MINUTE, { text: 'ATHENS again', mine: true }),
    message('d', DAY + 3 * MINUTE, { text: 'athens', deleted: true }),
    message('e', DAY + 4 * MINUTE, { text: 'athens', locked: true }),
    message('f', DAY + 5 * MINUTE, { text: '', poll: { q: 'Where?', o: ['Athens', 'Rome'], voted: [] } }),
    message('g', DAY + 6 * MINUTE, { text: '', place: { lat: 1, lon: 2 } }),
  ];
  assert.deepEqual(
    searchHistory(messages, 'athens').map((hit) => [hit.tag, hit.line]),
    [
      ['f', 'Athens'],
      ['c', 'ATHENS again'],
      ['b', 'athens-map.pdf'],
    ],
  );
  assert.deepEqual(
    searchHistory(messages, 'αθηνα').map((hit) => hit.tag),
    ['a'],
  );
  assert.deepEqual(searchHistory(messages, '  '), []);
});

test('the days, the first of a day, and how many to draw to show one further back', () => {
  const messages = [message('a', DAY), message('b', DAY + MINUTE), message('c', DAY + 24 * 60 * MINUTE)];
  assert.deepEqual([...historyDays(messages)].sort(), ['2026-10-18', '2026-10-19']);
  assert.equal(firstOfDay(messages, dayKey(DAY))?.id, 'a');
  assert.equal(firstOfDay(messages, '2026-10-20'), null);
  assert.equal(drawnTo(messages, DAY + MINUTE), 2);
  // What the thread shows and what the phone keeps besides, each once, the oldest first.
  assert.deepEqual(
    joined([message('c', 3, { text: 'new' }), message('b', 2)], [message('a', 1), message('b', 2), message('c', 3)]).map((m) => [m.id, m.text]),
    [
      ['a', ''],
      ['b', ''],
      ['c', 'new'],
    ],
  );
});

test('the media: each kind apart, the newest first, stickers and messages taken back left out', () => {
  const items = historyMedia([
    message('p', 1, { files: [{ kind: 'photo', name: 'sea.jpg', size: 2000 }] }),
    message('v', 2, { files: [{ kind: 'sound', name: 'voice.m4a', voice: true, ms: 4000 }], mine: true }),
    message('m', 3, { files: [{ kind: 'sound', name: 'song.mp3' }], by: 'Anna' }),
    message('s', 4, { files: [{ kind: 'photo', name: 'cat' }], sticker: true }),
    message('l', 5, { text: 'see https://example.org/x and www.erevos.test', preview: { url: 'https://example.org/x', title: 'Example' } }),
    message('d', 6, { text: 'https://gone.example', deleted: true }),
    message('mms', 7, { text: 'here', files: [{ kind: 'photo', name: '', uri: 'content://mms/part/1' }, { kind: 'file', name: '', card: true, uri: 'content://mms/part/2' }] }),
    message('o', 8, { text: 'https://maps.example/1', place: { lat: 1, lon: 2 } }),
  ]);
  assert.deepEqual(
    items.map((item) => [item.kind, item.tag, item.url ?? item.outside?.name, item.title ?? '']),
    [
      ['photo', 'mms', '', ''],
      ['file', 'mms', 'Contact card', ''],
      ['link', 'l', 'https://example.org/x', 'Example'],
      ['link', 'l', 'https://www.erevos.test', ''],
      ['music', 'm', 'song.mp3', ''],
      ['voice', 'v', 'voice.m4a', ''],
      ['photo', 'p', 'sea.jpg', ''],
    ],
  );
  // An MMS's picture is on the phone; a file of another network is on its server, with its size.
  assert.equal(items[0].outside?.uri, 'content://mms/part/1');
  assert.deepEqual(items[6].outside, { name: 'sea.jpg', size: 2000 });
  assert.equal(items.find((item) => item.kind === 'voice')?.ms, 4000);
  assert.equal(items.find((item) => item.kind === 'music')?.sender, 'Anna');
});

test('a chat written out as an Erevos chat is, each file by its name and each part of an MMS on its line', () => {
  const written = historyWritten([
    message('1', DAY, { text: 'Good morning', reactions: [{ emoji: '❤️', name: 'You' }] }),
    message('2', DAY + MINUTE, { text: 'Morning!', mine: true, replyTo: '1', edited: true }),
    message('3', DAY + 2 * MINUTE, { files: [{ kind: 'photo', name: 'sea.jpg' }], forwarded: true }),
    message('4', DAY + 3 * MINUTE, { text: 'taken back', deleted: true }),
    message('5', DAY + 4 * MINUTE, { files: [{ kind: 'sound', name: 'v.m4a', voice: true, ms: 7000 }], mine: true }),
    message('6', DAY + 5 * MINUTE, { locked: true }),
    message('7', DAY + 6 * MINUTE, { text: 'look', files: [{ kind: 'photo', name: '', uri: 'u1' }, { kind: 'sound', name: '', voice: true, uri: 'u2' }, { kind: 'file', name: '', card: true, uri: 'u3' }] }),
    message('8', DAY + 7 * MINUTE, { files: [{ kind: 'photo', name: 'Hello there' }], sticker: true, by: 'Anna' }),
    message('9', DAY + 8 * MINUTE, { poll: { q: 'Tea?', o: ['Yes', 'No'], voted: [{ chose: [0], name: 'You' }, { chose: [0], name: 'Anna' }] } }),
    message('10', DAY + 9 * MINUTE, { place: { lat: 37.97536, lon: 23.73495 } }),
    message('11', DAY + 10 * MINUTE, { files: [{ kind: 'file', name: 'notes.pdf' }] }),
  ]);
  assert.equal(
    chatText(written, 'Nekten', Date.UTC(2026, 9, 19, 14, 3)),
    [
      'Chat with Nekten, written out of Erevos',
      'Written out 2026-10-19 14:03. This file is not encrypted: anyone who has it can read it.',
      '',
      '2026-10-18',
      '09:15  Nekten: Good morning',
      '       ❤️ You',
      '09:16  You (edited, answering “Good morning”): Morning!',
      '09:17  Nekten (forwarded): [Photo: sea.jpg]',
      '09:19  You: [Voice message, 0:07]',
      '09:20  Nekten: [Locked message]',
      '09:21  Nekten: [Photo]',
      '09:21  Nekten: [Voice message]',
      '09:21  Nekten: [Contact card]',
      '09:21  Nekten: look',
      '09:22  Anna: [Sticker: Hello there]',
      '09:23  Nekten: [Poll: Tea?]',
      '         Yes: You, Anna',
      '         No',
      '09:24  Nekten: [Location: 37.975360, 23.734950]',
      '09:25  Nekten: [File: notes.pdf]',
      '',
    ].join('\n'),
  );
});

test('a poll written out names who chose each option', () => {
  const written = historyWritten([message('9', DAY, { poll: { q: 'Tea?', o: ['Yes', 'No'], voted: [{ chose: [1], name: 'Anna' }] } })]);
  assert.match(chatText(written, 'Group', DAY), /\n {9}No: Anna\n/);
});

test("a Matrix room's messages: files by kind, a sticker's words, a poll's voters and reactions by name", () => {
  const me = '@me:example.org';
  const names: Record<string, string> = { '@anna:example.org': 'Anna' };
  const nameOf = (who: string) => names[who] ?? who;
  const messages: MatrixMessage[] = [
    { id: '$1', sender: '@anna:example.org', ts: 1, text: 'hi https://example.org', reactions: { '👍': [me, '@anna:example.org'] }, preview: { url: 'https://example.org', title: 'Ex', text: '' } },
    { id: '$2', sender: me, ts: 2, text: '', file: { kind: 'audio', name: 'Voice message.ogg', mime: 'audio/ogg', voice: true, duration: 3000, url: 'mxc://x/y' } },
    { id: '$3', sender: '@anna:example.org', ts: 3, text: '', file: { kind: 'image', name: 'Sticker', mime: 'image/png', url: 'mxc://x/z' }, sticker: true },
    { id: '$4', sender: '@anna:example.org', ts: 4, text: '', poll: { q: 'Tea?', answers: [{ id: 'a1', text: 'Yes' }, { id: 'a2', text: 'No' }], max: 1, disclosed: true, votes: { [me]: { ids: ['a2'], ts: 5 } } } },
    { id: '$5', sender: '@anna:example.org', ts: 5, text: '', deleted: true },
    { id: '$6', sender: '@anna:example.org', ts: 6, text: 'Call', call: true },
  ];
  const history = matrixHistory(messages, me, nameOf, true);
  assert.deepEqual(history[0].reactions, [
    { emoji: '👍', name: 'You' },
    { emoji: '👍', name: 'Anna' },
  ]);
  assert.equal(history[0].by, 'Anna');
  assert.deepEqual(history[0].preview, { url: 'https://example.org', title: 'Ex' });
  assert.equal(history[1].by, undefined);
  assert.deepEqual(history[1].files, [{ kind: 'sound', name: 'Voice message.ogg', voice: true, ms: 3000 }]);
  assert.deepEqual(history[2].files, [{ kind: 'photo', name: '' }]);
  assert.equal(history[2].sticker, true);
  assert.deepEqual(history[3].poll, { q: 'Tea?', o: ['Yes', 'No'], voted: [{ chose: [1], name: 'You' }] });
  assert.equal(history[4].deleted, true);
  assert.equal(history[5].call, true);
  // In a chat of two, nobody is named: the chat's name says who.
  assert.equal(matrixHistory(messages, me, nameOf, false)[0].by, undefined);
  assert.deepEqual(
    historyMedia(history).map((item) => [item.kind, item.tag]),
    [
      ['voice', '$2'],
      ['link', '$1'],
    ],
  );
});

test("an XMPP chat's messages: a sound is a voice message, a geo: link a place, a group's reactions by nick", () => {
  const me = 'me@example.org';
  const messages: XmppMessage[] = [
    { id: '1', mine: false, text: '', at: 1, encrypted: true, by: 'anna', file: { url: 'https://up.example/a.m4a', name: 'a.m4a', type: 'audio/mp4', size: 900 } },
    { id: '2', mine: false, text: 'geo:37.97536,23.73495', at: 2, encrypted: true, by: 'anna' },
    { id: '3', mine: true, text: 'hello', at: 3, encrypted: true, reacted: { [me]: ['👍'], '/bob': ['😂'], 'carol@example.org': ['🎉'] }, forwarded: true, edited: 4 },
    { id: '4', mine: false, text: '', at: 4, encrypted: true, by: 'anna', file: { url: 'https://up.example/b', name: 'clip.mp4', type: 'application/octet-stream' } },
  ];
  const history = xmppHistory(messages, me, (address) => (address === 'carol@example.org' ? 'Carol' : address), true);
  assert.deepEqual(history[0].files, [{ kind: 'sound', name: 'a.m4a', size: 900, voice: true }]);
  assert.equal(history[0].by, 'anna');
  assert.deepEqual(history[1].place, { lat: 37.97536, lon: 23.73495 });
  assert.equal(history[1].text, '');
  assert.deepEqual(history[2].reactions, [
    { emoji: '👍', name: 'You' },
    { emoji: '😂', name: 'bob' },
    { emoji: '🎉', name: 'Carol' },
  ]);
  assert.equal(history[2].forwarded, true);
  assert.equal(history[2].edited, true);
  // A file sent with no type is known by its name.
  assert.equal(history[3].files?.[0].kind, 'video');
  assert.equal(xmppHistory(messages, me, (address) => address, false)[0].by, undefined);
});

test("a Nostr chat's messages: a voice message by its length, a file Erevos cannot open still named as a file", () => {
  const file = { url: 'https://files.example/x', type: 'audio/ogg', key: '00'.repeat(32), nonce: '00'.repeat(16), x: '00'.repeat(32) };
  const messages: NostrDmMessage[] = [
    { id: 'a', mine: false, text: 'https://files.example/x', at: 1, from: 'k1', file: { ...file, duration: 5000, size: 300 } },
    { id: 'b', mine: false, text: 'https://files.example/y', at: 2, from: 'k1', file: true },
    { id: 'c', mine: true, text: 'hi', at: 3, reactions: { k1: '❤️', me: '👍' }, replyTo: 'a' },
    { id: 'd', mine: false, text: '', at: 4, file: { ...file, type: 'image/jpeg', name: 'cat.jpg' } },
  ];
  const nameOf = (key: string) => (key === 'me' ? 'You' : key === 'k1' ? 'Anna' : key);
  const history = nostrHistory(messages, nameOf, true);
  assert.deepEqual(history[0].files, [{ kind: 'sound', name: '', size: 300, voice: true, ms: 5000 }]);
  assert.equal(history[0].text, '');
  assert.equal(history[0].by, 'Anna');
  assert.deepEqual(history[1].files, [{ kind: 'file', name: '' }]);
  assert.deepEqual(history[2].reactions, [
    { emoji: '❤️', name: 'Anna' },
    { emoji: '👍', name: 'You' },
  ]);
  assert.equal(history[2].replyTo, 'a');
  assert.deepEqual(history[3].files, [{ kind: 'photo', name: 'cat.jpg' }]);
  // What the export writes of them.
  assert.deepEqual(
    historyWritten(history).map((line) => line.file?.name ?? line.voice?.ms ?? line.text),
    [5000, '[File]', 'hi', 'cat.jpg'],
  );
});

test("an SMS conversation's messages: by their row's id, an MMS's parts on the phone, a group's by its number's name", () => {
  const messages: SmsMessage[] = [
    { id: 7, kind: 'sms', text: 'Hello', at: 1, mine: false, state: 'done', read: true },
    {
      id: 7,
      kind: 'mms',
      text: 'Look',
      at: 2,
      mine: false,
      state: 'done',
      read: true,
      from: '+306900000001',
      pictures: [{ uri: 'content://mms/part/1', type: 'image/jpeg' }],
      voices: [{ uri: 'content://mms/part/2', type: 'audio/amr' }],
      cards: [{ uri: 'content://mms/part/3', type: 'text/x-vcard' }],
    },
  ];
  const history = smsHistory(messages, (from) => (from === '+306900000001' ? 'Anna' : from));
  assert.deepEqual(
    history.map((m) => m.id),
    ['sms:7', 'mms:7'],
  );
  assert.equal(history[1].by, 'Anna');
  assert.deepEqual(history[1].files, [
    { kind: 'photo', name: '', uri: 'content://mms/part/1' },
    { kind: 'sound', name: '', voice: true, uri: 'content://mms/part/2' },
    { kind: 'file', name: '', card: true, uri: 'content://mms/part/3' },
  ]);
  assert.equal(smsHistory(messages)[1].by, undefined);
  assert.deepEqual(
    searchHistory(history, 'look').map((hit) => hit.tag),
    ['mms:7'],
  );
  assert.deepEqual(
    historyMedia(history).map((item) => [item.kind, item.outside?.uri]),
    [
      ['photo', 'content://mms/part/1'],
      ['voice', 'content://mms/part/2'],
      ['file', 'content://mms/part/3'],
    ],
  );
});
