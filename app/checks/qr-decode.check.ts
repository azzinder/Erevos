// The web app's QR reader (lib/qr-decode.ts): a contact link's QR code, as Erevos draws it
// (lib/qr.ts), reads back from its pixels, dark on light and light on dark, and a picture with no
// code in it reads as none; a Matrix check's code reads back as its bytes.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { crc32, inflateSync } from 'node:zlib';

import { contactLink, parseContact } from '../lib/contact-code';
import qrcode from 'qrcode-generator';

import { qrMatrix, qrPng, qrRows, type Level } from '../lib/qr';
import { qrBytes } from '../lib/matrix-qr';
import { decodeQr, decodeQrBytes, readSizes } from '../lib/qr-decode';

/** RGBA pixels of the QR code for `text`: `size` pixels a module, four modules of quiet zone. */
function picture(text: string | Uint8Array, size: number, invert = false): { pixels: Uint8ClampedArray; width: number; height: number } {
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

// RGBA pixels of a PNG as qrPng makes it (1 bit a pixel, greyscale), each chunk checked.
function unpng(png: Uint8Array): { pixels: Uint8ClampedArray; width: number; height: number } {
  assert.deepEqual([...png.subarray(0, 8)], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
  const chunks: Record<string, Uint8Array> = {};
  for (let at = 8; at < png.length; ) {
    const length = view.getUint32(at);
    const type = String.fromCharCode(...png.subarray(at + 4, at + 8));
    assert.equal(view.getUint32(at + 8 + length), crc32(png.subarray(at + 4, at + 8 + length)), type);
    chunks[type] = png.subarray(at + 8, at + 8 + length);
    at += 12 + length;
  }
  assert.deepEqual(Object.keys(chunks), ['IHDR', 'IDAT', 'IEND']);
  const header = new DataView(chunks.IHDR.buffer, chunks.IHDR.byteOffset, 13);
  const width = header.getUint32(0);
  const height = header.getUint32(4);
  assert.deepEqual([...chunks.IHDR.subarray(8)], [1, 0, 0, 0, 0]);
  // inflateSync checks the stream's Adler-32 too.
  const raw = inflateSync(chunks.IDAT);
  const line = Math.ceil(width / 8) + 1;
  assert.equal(raw.length, line * height);
  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    assert.equal(raw[y * line], 0);
    for (let x = 0; x < width; x++) {
      const white = (raw[y * line + 1 + (x >> 3)] >> (7 - (x & 7))) & 1;
      pixels.fill(white ? 255 : 0, (y * width + x) * 4, (y * width + x) * 4 + 3);
      pixels[(y * width + x) * 4 + 3] = 255;
    }
  }
  return { pixels, width, height };
}

// How many bytes each version holds (ISO/IEC 18004 table 7), with low and medium error correction.
const HOLDS: Record<Level, number[]> = {
  L: [17, 32, 53, 78, 106, 134, 154, 192, 230, 271, 321, 367, 425, 458, 520, 586, 644, 718, 792, 858, 929, 1003, 1091, 1171, 1273, 1367, 1465, 1528, 1628, 1732, 1840, 1952, 2068, 2188, 2303, 2431, 2563, 2699, 2809, 2953],
  M: [14, 26, 42, 62, 84, 106, 122, 152, 180, 213, 251, 287, 331, 362, 412, 450, 504, 560, 624, 666, 711, 779, 857, 911, 997, 1059, 1125, 1190, 1264, 1370, 1452, 1538, 1628, 1722, 1809, 1911, 1989, 2099, 2213, 2331],
};

test('a QR code made by Erevos is module for module what the QR code library makes, at every version', () => {
  const text = (length: number) => Array.from({ length }, (_, i) => 'Az09_-:/?&=.%~'[(i * 7 + (i >> 3)) % 14]).join('');
  for (const level of ['L', 'M'] as Level[]) {
    HOLDS[level].forEach((holds, i) => {
      // As full as the version gets, and one byte more, which takes the next.
      for (const length of i < 39 ? [holds, holds + 1] : [holds]) {
        const t = text(length);
        const theirs = qrcode(0, level);
        theirs.addData(t, 'Byte');
        theirs.make();
        const size = theirs.getModuleCount();
        assert.equal(size, (length > holds ? i + 2 : i + 1) * 4 + 17, `${level} ${length}`);
        // Their mask, from their format bits; ours makes the same code with it.
        const bit = (n: number) => (n <= 5 ? theirs.isDark(n, 8) : n === 6 ? theirs.isDark(7, 8) : n === 7 ? theirs.isDark(8, 8) : n === 8 ? theirs.isDark(8, 7) : theirs.isDark(8, 14 - n));
        let bits = 0;
        for (let n = 0; n < 15; n++) if (bit(n)) bits |= 1 << n;
        const ours = qrMatrix(t, level, ((bits ^ 0x5412) >> 10) & 7);
        assert.equal(ours.size, size);
        assert.ok(ours.dark.every((on, at) => (on === 1) === theirs.isDark(Math.floor(at / size), at % size)), `${level} ${length}`);
      }
    });
  }
  assert.throws(() => qrMatrix('a'.repeat(2954), 'L'));
  // Letters beyond English go as UTF-8.
  const greek = qrPng('Γειά σου, Erevos', 300);
  assert.equal(decodeQr(unpng(greek.png).pixels, greek.size, greek.size), 'Γειά σου, Erevos');
});

test('the QR code as Erevos draws it, one picture of whole pixels a module, reads back', () => {
  const { png, size } = qrPng(LINK, 790);
  const rows = qrRows(LINK);
  // As many pixels a module as fit, and a quiet zone of four modules.
  const cell = Math.floor(790 / (rows.length + 8));
  assert.equal(size, cell * (rows.length + 8));
  const { pixels, width, height } = unpng(png);
  assert.deepEqual([width, height], [size, size]);
  assert.equal(decodeQr(pixels, width, height), LINK);
  // Each module is the module qrRows says, the quiet zone white.
  const at = (row: number, col: number) => pixels[(((row + 4) * cell + 1) * width + (col + 4) * cell + 1) * 4] === 0;
  rows.forEach((runs, row) => {
    let col = 0;
    for (const run of runs) for (let i = 0; i < run.length; i++, col++) assert.equal(at(row, col), run.dark);
  });
  assert.ok(pixels.subarray(0, width * 4 * cell * 4).every((v) => v === 255));
  // A short text in a small place still gets 2 pixels a module.
  const small = qrPng('erevos', 10);
  assert.equal(small.size, 2 * (qrRows('erevos').length + 8));
  assert.equal(decodeQr(unpng(small.png).pixels, small.size, small.size), 'erevos');
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

test("a Matrix check's code is bytes, not words: drawn and read back byte for byte", () => {
  const key = (n: number) => Buffer.from(new Uint8Array(32).fill(n)).toString('base64').replace(/=+$/, '');
  const bytes = qrBytes({ mode: 0, id: '$event:example.org', first: key(0xff), second: key(0x80), secret: key(7).slice(0, 22) });
  // Bytes that are not UTF-8 (0xff, 0x80) come back as they were.
  const { pixels, width, height } = picture(bytes, 4);
  assert.deepEqual([...(decodeQrBytes(pixels, width, height) ?? [])], [...bytes]);
});
