// The web app's QR reader (lib/qr-decode.ts): a contact link's QR code, as Erevos draws it
// (lib/qr.ts), reads back from its pixels, dark on light and light on dark, and a picture with no
// code in it reads as none.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { contactLink, parseContact } from '../lib/contact-code';
import { qrRows } from '../lib/qr';
import { decodeQr, readSizes } from '../lib/qr-decode';

/** RGBA pixels of the QR code for `text`: `size` pixels a module, four modules of quiet zone. */
function picture(text: string, size: number, invert = false): { pixels: Uint8ClampedArray; width: number; height: number } {
  const rows = qrRows(text);
  const count = rows.length + 8;
  const width = count * size;
  const pixels = new Uint8ClampedArray(width * width * 4);
  const light = invert ? 0 : 255;
  const dark = invert ? 255 : 0;
  pixels.fill(light);
  for (let i = 3; i < pixels.length; i += 4) pixels[i] = 255;
  rows.forEach((runs, row) => {
    let col = 0;
    for (const run of runs) {
      if (run.dark) {
        for (let y = (row + 4) * size; y < (row + 5) * size; y++) {
          for (let x = (col + 4) * size; x < (col + 4 + run.length) * size; x++) {
            const at = (y * width + x) * 4;
            pixels[at] = pixels[at + 1] = pixels[at + 2] = dark;
          }
        }
      }
      col += run.length;
    }
  });
  return { pixels, width, height: width };
}

// As long as a real one: its keys are about 1800 characters.
const LINK = contactLink({
  senderHex: '0123456789abcdef0123456789abcdef0123456789abcdef',
  relayUrl: 'wss://erevos.example.org',
  key: Array.from({ length: 1800 }, (_, i) => 'Az09_-'[i % 6]).join(''),
});

test('a contact link QR code reads back from its pixels, and adds the contact it names', () => {
  const { pixels, width, height } = picture(LINK, 4);
  const text = decodeQr(pixels, width, height);
  assert.equal(text, LINK);
  assert.equal(parseContact(text ?? '')?.senderHex, '0123456789abcdef0123456789abcdef0123456789abcdef');
});

test('light on dark reads too, as a dark screen shows it', () => {
  const { pixels, width, height } = picture(LINK, 4, true);
  assert.equal(decodeQr(pixels, width, height), LINK);
});

test('a picture with no QR code in it reads as none', () => {
  const width = 200;
  const pixels = new Uint8ClampedArray(width * width * 4).fill(255);
  assert.equal(decodeQr(pixels, width, width), null);
});

test('a photo reads small first, then near its own size, never larger nor past what a canvas takes', () => {
  // An iPhone's 12 MP photo.
  assert.deepEqual(readSizes(4032, 3024), [
    { width: 1600, height: 1200 },
    { width: 4032, height: 3024 },
    { width: 2400, height: 1800 },
    { width: 800, height: 600 },
  ]);
  // A screenshot.
  assert.deepEqual(
    readSizes(1179, 2556).map(({ width }) => width),
    [738, 1179, 1107, 369],
  );
  // A small picture reads once, as it is.
  assert.deepEqual(readSizes(600, 400), [{ width: 600, height: 400 }]);
  // A 36 MP square photo stays under an iPhone's canvas limit.
  for (const { width, height } of readSizes(6000, 6000)) assert.ok(width * height <= 16_777_216);
});
