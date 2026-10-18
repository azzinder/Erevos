// The home screen's list of chats (lib/inbox.ts) and the pictures drawn from keys (components/key-face.tsx).
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildInbox, filterInbox, rowTime, shownName } from '../lib/inbox';

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

test('says when a chat moved: the time today, the weekday this week, else the date', () => {
  const now = new Date(2026, 9, 17, 22, 0).getTime();
  assert.equal(rowTime(new Date(2026, 9, 17, 9, 5).getTime(), now), '09:05');
  assert.equal(rowTime(new Date(2026, 9, 15, 9, 5).getTime(), now), 'Thu');
  assert.equal(rowTime(new Date(2026, 8, 1).getTime(), now), '01/09/26');
  assert.equal(rowTime(0, now), '');
});
