// What a chat's messages can do beyond words: what they carry (lib/chat-parts.ts), their line
// (lib/message-line.ts) and finding them again (lib/message-search.ts).
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { carriedOf, checkedPlace, contentOf, geoLink, placeWords, toCarry } from '../lib/chat-parts';
import { messageLine } from '../lib/message-line';
import { starredOf } from '../lib/message-search';
import { STICKERS, stickerOf } from '../lib/stickers';

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

test('a sticker goes by its name, with words, and an Erevos from before reads its emoji', () => {
  assert.deepEqual(toCarry({ sticker: 'moon-smile' }, true), { sticker: 'moon-smile' });
  assert.deepEqual(toCarry({ sticker: 'moon-smile' }, false), {});
  assert.deepEqual(carriedOf({ sticker: 'Not A Name!' }), {});
  assert.deepEqual(contentOf({ sticker: 'heart' }), { sticker: 'heart' });
  // A later Erevos's sticker is still one, drawn as its emoji here.
  assert.deepEqual(carriedOf({ sticker: 'moon-dance' }), { sticker: 'moon-dance' });
  assert.equal(stickerOf('moon-dance'), null);
  assert.equal(messageLine({ text: '🌝', sticker: 'moon-smile' }), 'Sticker: Smiling moon');
  assert.equal(messageLine({ text: '💃', sticker: 'moon-dance' }), 'Sticker');
  assert.equal(new Set(STICKERS.map((s) => s.name)).size, STICKERS.length);
  assert.ok(STICKERS.every((s) => carriedOf({ sticker: s.name }).sticker === s.name && s.emoji));
});

test('a place goes with its coordinates as words, to six decimals, and opens as a geo: link', () => {
  const place = checkedPlace({ lat: 37.97536123, lon: 23.7349512, acc: 12.4 })!;
  assert.deepEqual(place, { lat: 37.975361, lon: 23.734951, acc: 12 });
  assert.equal(placeWords(place), '📍 37.975361, 23.734951');
  assert.equal(geoLink(place), 'geo:37.975361,23.734951?q=37.975361,23.734951');
  assert.deepEqual(toCarry({ place }, true), { place });
  assert.deepEqual(toCarry({ place }, false), {});
  assert.deepEqual(contentOf({ place }), { place });
  assert.equal(checkedPlace({ lat: 91, lon: 0 }), null);
  assert.equal(checkedPlace({ lat: '1', lon: 0 }), null);
  assert.deepEqual(checkedPlace({ lat: 1, lon: 2, acc: -3 }), { lat: 1, lon: 2 });
  assert.equal(messageLine({ text: placeWords(place), place }), 'Location');
});
