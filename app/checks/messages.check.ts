// What a chat's messages can do beyond words: what they carry (lib/chat-parts.ts), their line
// (lib/message-line.ts) and finding them again (lib/message-search.ts).
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { carriedOf, toCarry } from '../lib/chat-parts';
import { messageLine } from '../lib/message-line';
import { starredOf } from '../lib/message-search';

const A = `contact:${'aa'.repeat(32)}`;
const B = `contact:${'bb'.repeat(32)}`;

test('a pin is carried with no words only, and one of the wrong shape is none', () => {
  const pin = { tag: '0123456789ab', on: true };
  assert.deepEqual(carriedOf({ pin }), { pin });
  assert.deepEqual(carriedOf({ pin: { tag: 'x', on: true } }), {});
  assert.deepEqual(carriedOf({ pin: { tag: pin.tag, on: 'yes' } }), {});
  assert.deepEqual(toCarry({ pin }, false), { pin });
  assert.deepEqual(toCarry({ pin }, true), {});
});

test('a message in one line: its first line of words, or what it is', () => {
  assert.equal(messageLine({ text: 'first\nsecond' }), 'first');
  assert.equal(messageLine({ text: '', voice: { ms: 7400 } }), 'Voice message, 0:07');
  assert.equal(messageLine({ text: '', file: { kind: 'photo', name: 'a.jpg' } }), 'Photo');
});

test('the starred messages, the latest first, from every chat', () => {
  const found = starredOf([
    { peer: A, tag: '000000000001', at: 1, mine: false, text: 'old', starred: true },
    { peer: B, tag: '000000000002', at: 2, mine: true, text: 'not starred' },
    { peer: B, tag: '000000000003', at: 3, mine: true, text: '', voice: { ms: 2000 }, starred: true },
  ]);
  assert.deepEqual(found, [
    { peer: B, tag: '000000000003', at: 3, mine: true, line: 'Voice message, 0:02' },
    { peer: A, tag: '000000000001', at: 1, mine: false, line: 'old' },
  ]);
});
