// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// The home screen's list of chats (lib/inbox.ts) and the pictures drawn from keys (components/key-face.tsx).
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildInbox, filterInbox, groupRows, inboxParts, mergeRows, rowTime, shownName, showsIn, tabUnread, type InboxRow, type InboxShow } from '../lib/inbox';
import { randomBytes } from '../lib/crypto';
import { kept, LAST, loadInboxCache, ROWS, saveInboxCache } from '../lock/inbox-cache';
import { files } from './files-memory';

const A = 'aa'.repeat(32);
const B = 'bb'.repeat(32);
const C = 'cc'.repeat(32);
const contacts = [
  { identity: A, name: 'Άννα', timer: 0 },
  { identity: B, name: '', timer: 3600 },
  { identity: C, name: 'Zoe', timer: 0 },
];

test('puts the chat that moved last first, and counts their messages not read yet', () => {
  const rows = buildInbox(
    contacts,
    [
      { peer: `contact:${A}`, text: 'γεια', mine: false, at: 10, mark: 2 },
      { peer: `contact:${B}`, text: 'one', mine: false, at: 20 },
      { peer: `contact:${B}`, text: 'two', mine: false, at: 30 },
      { peer: `contact:${A}`, text: 'τι κάνεις;', mine: true, at: 40, mark: 1 },
      { peer: 'radio-peer', text: 'nearby', mine: false, at: 50 },
    ],
    [],
    100,
  );
  const voice = buildInbox(contacts, [{ peer: `contact:${C}`, text: '', mine: false, at: 60, voice: { ms: 7400 } }], [], 100);
  assert.equal(voice.find((r) => r.identity === C)?.last, 'Voice message, 0:07');
  const photo = buildInbox(contacts, [{ peer: `contact:${C}`, text: '', mine: true, at: 60, file: { kind: 'photo', name: 'IMG_1.jpg' } }], [], 100);
  assert.equal(photo.find((r) => r.identity === C)?.last, 'Photo');
  const file = buildInbox(contacts, [{ peer: `contact:${C}`, text: '', mine: false, at: 60, file: { kind: 'file', name: 'plan.pdf' } }], [], 100);
  assert.equal(file.find((r) => r.identity === C)?.last, 'File: plan.pdf');
  assert.deepEqual(
    rows.map((r) => [r.identity, r.last, r.mine, r.mark, r.unread, r.at]),
    [
      [A, 'τι κάνεις;', true, 1, 0, 40],
      [B, 'two', false, 0, 2, 30],
      [C, '', false, 0, 0, 0],
    ],
  );
  assert.equal(rows[1].timer, 3600);
});

test('leaves out messages that have disappeared', () => {
  const rows = buildInbox(contacts.slice(0, 1), [
    { peer: `contact:${A}`, text: 'stays', mine: false, at: 1, mark: 2 },
    { peer: `contact:${A}`, text: 'gone', mine: false, at: 2, until: 50 },
  ], [], 100);
  assert.equal(rows[0].last, 'stays');
  assert.equal(rows[0].unread, 0);
});

test('leaves out ours sent for later until their time, as nothing went yet', () => {
  const messages = [
    { peer: `contact:${A}`, text: 'said', mine: false, at: 1, mark: 2 as const },
    { peer: `contact:${A}`, text: 'tomorrow', mine: true, at: 500, mark: -1 as const },
  ];
  assert.deepEqual(buildInbox(contacts.slice(0, 1), messages, [], 100).map((r) => [r.last, r.at]), [['said', 1]]);
  assert.deepEqual(buildInbox(contacts.slice(0, 1), messages, [], 600).map((r) => [r.last, r.mark]), [['tomorrow', -1]]);
});

test('names a contact without a name after the imported chat that goes on with them', () => {
  const rows = buildInbox(contacts, [], [{ title: ' Telegram group ', contact: B, last: 5 }], 100);
  assert.equal(rows[0].identity, B);
  assert.equal(rows[0].name, 'Telegram group');
  assert.ok(rows[0].imported);
  assert.equal(shownName({ identity: C, name: '' }), 'contact cccccccc');
});

test('finds chats by name or last message, without minding case or Greek accents', () => {
  const rows = buildInbox(contacts, [{ peer: `contact:${C}`, text: 'Καλημέρα', mine: false, at: 1, mark: 2 }], [], 100);
  assert.deepEqual(filterInbox(rows, 'αννα').map((r) => r.identity), [A]);
  assert.deepEqual(filterInbox(rows, 'καλημερα').map((r) => r.identity), [C]);
  assert.deepEqual(filterInbox(rows, 'bbbb').map((r) => r.identity), [B]);
  assert.equal(filterInbox(rows, '  ').length, 3);
});

test("counts the messages not read in each part of the list for its chip, a muted chat's and group's aside", () => {
  const row = (over: Partial<InboxRow>): InboxRow => ({ identity: 'x', name: '', last: '', mine: false, mark: 0, at: 0, unread: 0, timer: 0, imported: false, avatar: null, sms: '', lastSms: false, ...over });
  const them = (peer: string, n: number) => Array.from({ length: n }, (_, i) => ({ peer: `contact:${peer}`, text: `m${i}`, mine: false, at: 10 + i }));
  const rows = mergeRows(
    buildInbox(
      [
        { identity: A, name: 'Άννα', timer: 0 },
        { identity: B, name: 'Bob', timer: 0, notify: { until: 1000 } },
        { identity: C, name: 'Zoe', timer: 0, phone: '+306900000000' },
      ],
      [...them(A, 2), ...them(B, 5), ...them(C, 1)],
      [],
      100,
      [
        { address: '+306900000000', text: 'hello', at: 50, mine: false, unread: 2 },
        { address: '+306911111111', text: 'hi', at: 5, mine: false, unread: 3 },
      ],
    ),
    [
      ...groupRows(
        [
          { id: 'g1', name: 'Team', status: 'in', last: null, unread: 4 },
          { id: 'g2', name: 'Noise', status: 'in', last: null, unread: 6, notify: { until: 1000 } },
        ],
        () => '',
        (text) => text,
        100,
      ),
      row({ identity: 'matrix:!a', network: 'matrix', unread: 7 }),
      row({ identity: 'matrix:!b', network: 'matrix', unread: 8, muted: true }),
      row({ identity: 'xmpp:a@b', network: 'xmpp', unread: 1 }),
      row({ identity: 'nostr:aa', network: 'nostr', unread: 2 }),
    ],
  );
  const counts = (['all', 'sms', 'erevos', 'matrix', 'xmpp', 'nostr', 'public'] as InboxShow[]).map((show) => tabUnread(rows, show));
  // A contact whose last message is an SMS is among the SMS and the Erevos chats alike (showsIn).
  assert.deepEqual(counts, [2 + 3 + 3 + 4 + 7 + 1 + 2, 2 + 1 + 3, 2 + 1 + 2 + 4, 7, 1, 2, 0]);
  assert.equal(showsIn(row({ identity: 'matrix:!a', network: 'matrix' }), 'public'), false);
  assert.deepEqual(inboxParts([], false, false, false, true), ['public']);
  assert.equal(tabUnread([], 'all'), 0);
});

test('says when a chat moved: the time today, the weekday this week, else the date', () => {
  const now = new Date(2026, 9, 17, 22, 0).getTime();
  assert.equal(rowTime(new Date(2026, 9, 17, 9, 5).getTime(), now), '09:05');
  assert.equal(rowTime(new Date(2026, 9, 15, 9, 5).getTime(), now), 'Thu');
  assert.equal(rowTime(new Date(2026, 8, 1).getTime(), now), '01/09/26');
  assert.equal(rowTime(0, now), '');
});

test('keeps the list as it showed, sealed, for the space whose key opens it', async () => {
  const key = randomBytes(32);
  const rows = buildInbox(contacts, [{ peer: `contact:${A}`, text: 'γεια', mine: false, at: 10 }], [], 100, [
    { address: '+306900000001', text: 'SMS', at: 20, mine: true, unread: 0, name: 'Μαρία' },
  ]);
  await saveInboxCache(0, key, rows);
  assert.deepEqual((await loadInboxCache(0, key)).rows, rows.map((r) => ({ ...r, fades: undefined })).map((r) => JSON.parse(JSON.stringify(r))));
  assert.deepEqual((await loadInboxCache(0, randomBytes(32))).rows, []);
  assert.deepEqual((await loadInboxCache(1, key)).rows, []);
  assert.ok(!files.get('erevos-inbox')?.includes('γεια'));
});

test('keeps only the first rows, last lines cut short, and nothing a disappearing message said', () => {
  const many = Array.from({ length: ROWS + 10 }, (_, i) => ({ identity: `${i}`.padStart(64, '0'), name: `n${i}`, timer: 0 }));
  const rows = buildInbox(many, [{ peer: `contact:${many[0].identity}`, text: 'x'.repeat(500), mine: false, at: 50 }], [], 100);
  const cache = kept(rows);
  assert.equal(cache.rows.length, ROWS);
  assert.equal(cache.rows[0].last, `${'x'.repeat(LAST)}…`);
  const fading = buildInbox(contacts, [
    { peer: `contact:${A}`, text: 'gone soon', mine: false, at: 10, lasts: 60 },
    { peer: `contact:${C}`, text: 'read, going', mine: false, at: 10, until: 500 },
  ], [], 100);
  const kept2 = kept(fading).rows;
  assert.equal(kept2.find((r) => r.identity === A)?.last, '');
  assert.equal(kept2.find((r) => r.identity === C)?.last, '');
  assert.equal(kept2.find((r) => r.identity === B)?.last, '');
});

test('a used list and an unused one take the same room in the file', async () => {
  files.delete('erevos-inbox');
  await saveInboxCache(2, randomBytes(32), buildInbox(contacts, [], [], 100));
  const values = JSON.parse(files.get('erevos-inbox') ?? '{}') as Record<string, string[]>;
  const sizes = new Set(Object.values(values).flat().map((v) => v.length));
  assert.equal(sizes.size, 1);
});
