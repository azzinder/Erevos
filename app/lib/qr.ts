// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// QR codes, drawn as one picture (a PNG, components/QrCode.tsx), since a view for each stretch of
// modules made thousands of views for a contact link, heavy to draw on an older phone; and as rows
// of runs, for checks. Made here (ISO/IEC 18004, byte mode, as the QR code library made them before,
// which checks/qr-decode.check.ts compares it with), in typed arrays: that library took over a
// second on an older phone for a contact link, most of it choosing the mask. Self-contained on
// purpose, so it can run under plain Node for checks.

/** A stretch of modules of one colour in a row. */
export type Run = { dark: boolean; length: number };

/** The modules of the QR code for `text`, row by row, without the quiet zone around it. */
export function qrRows(text: string | Uint8Array): Run[][] {
  const { size, dark } = qrMatrix(text);
  const rows: Run[][] = [];
  for (let row = 0; row < size; row++) {
    const runs: Run[] = [];
    for (let col = 0; col < size; col++) {
      const on = dark[row * size + col] === 1;
      const last = runs[runs.length - 1];
      if (last && last.dark === on) last.length++;
      else runs.push({ dark: on, length: 1 });
    }
    rows.push(runs);
  }
  return rows;
}

export type Level = 'L' | 'M';

/**
 * The QR code for `text` (its UTF-8 bytes, or the bytes given): `size` modules a side, `dark` row by row, 1 for a dark
 * module. The smallest version that holds it, with the mask that scores best; `mask` forces one.
 */
export function qrMatrix(text: string | Uint8Array, level?: Level, mask?: number): { size: number; dark: Uint8Array; mask: number } {
  // Medium error correction, which still reads with a smudge or glare on the screen. A contact
  // link with its keys is long, and with low error correction its modules stay larger.
  const ecl = level ?? (text.length > 1000 ? 'L' : 'M');
  const bytes = typeof text === 'string' ? utf8(text) : [...text];
  let version = 1;
  for (; ; version++) {
    if (version > 40) throw new Error('Too long for a QR code');
    const header = 4 + (version < 10 ? 8 : 16);
    if (header + bytes.length * 8 <= dataCodewords(version, ecl) * 8) break;
  }
  const codewords = withEcc(dataBits(bytes, version, ecl), version, ecl);
  const size = version * 4 + 17;
  const code = new Grid(size);
  code.functionPatterns(version);
  code.place(codewords);
  let chosen = mask ?? 0;
  if (mask === undefined) {
    let least = Infinity;
    for (let m = 0; m < 8; m++) {
      code.mask(m);
      code.format(ecl, m);
      const penalty = code.penalty();
      if (penalty < least) {
        least = penalty;
        chosen = m;
      }
      code.mask(m); // undone: a mask is its own inverse
    }
  }
  code.mask(chosen);
  code.format(ecl, chosen);
  return { size, dark: code.dark, mask: chosen };
}

function utf8(text: string): number[] {
  const out: number[] = [];
  for (let i = 0; i < text.length; i++) {
    let c = text.charCodeAt(i);
    if (c >= 0xd800 && c < 0xdc00 && i + 1 < text.length) {
      const low = text.charCodeAt(i + 1);
      if (low >= 0xdc00 && low < 0xe000) {
        c = 0x10000 + ((c - 0xd800) << 10) + (low - 0xdc00);
        i++;
      }
    }
    if (c < 0x80) out.push(c);
    else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 63));
    else if (c < 0x10000) out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    else out.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
  }
  return out;
}

// Error correction codewords per block, and blocks, for each version from 1 (ISO/IEC 18004 table 9).
const ECC_PER_BLOCK: Record<Level, number[]> = {
  L: [7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  M: [10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28],
};
const BLOCKS: Record<Level, number[]> = {
  L: [1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25],
  M: [1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49],
};

// The modules a version has for data and error correction, all but its fixed patterns.
function rawModules(version: number): number {
  let modules = (16 * version + 128) * version + 64;
  if (version >= 2) {
    const align = Math.floor(version / 7) + 2;
    modules -= (25 * align - 10) * align - 55;
    if (version >= 7) modules -= 36;
  }
  return modules;
}

function dataCodewords(version: number, ecl: Level): number {
  return Math.floor(rawModules(version) / 8) - ECC_PER_BLOCK[ecl][version - 1] * BLOCKS[ecl][version - 1];
}

// The mode (byte), the count, the bytes, the end, and padding, as codewords.
function dataBits(bytes: number[], version: number, ecl: Level): Uint8Array {
  const capacity = dataCodewords(version, ecl);
  const out = new Uint8Array(capacity);
  let bit = 0;
  const put = (value: number, length: number) => {
    for (let i = length - 1; i >= 0; i--, bit++) if ((value >>> i) & 1) out[bit >> 3] |= 0x80 >> (bit & 7);
  };
  put(0b0100, 4);
  put(bytes.length, version < 10 ? 8 : 16);
  for (const b of bytes) put(b, 8);
  // The end (up to four 0 bits) and the rest of the byte stay 0; then the pad bytes.
  for (let at = (Math.min(bit + 4, capacity * 8) + 7) >> 3, pad = 0xec; at < capacity; at++, pad ^= 0xec ^ 0x11) out[at] = pad;
  return out;
}

// GF(256) with the QR code's polynomial, by logarithms.
const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);
for (let i = 0, x = 1; i < 255; i++, x = x & 0x80 ? ((x << 1) ^ 0x11d) & 0xff : x << 1) {
  EXP[i] = x;
  LOG[x] = i;
}
for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];

const times = (a: number, b: number) => (a === 0 || b === 0 ? 0 : EXP[LOG[a] + LOG[b]]);

// The Reed-Solomon generator of `degree`, highest power first but for its leading 1.
function generator(degree: number): Uint8Array {
  const out = new Uint8Array(degree);
  out[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < degree; j++) {
      out[j] = times(out[j], root);
      if (j + 1 < degree) out[j] ^= out[j + 1];
    }
    root = times(root, 2);
  }
  return out;
}

// The data split into blocks, each with its error correction, interleaved.
function withEcc(data: Uint8Array, version: number, ecl: Level): Uint8Array {
  const blocks = BLOCKS[ecl][version - 1];
  const ecc = ECC_PER_BLOCK[ecl][version - 1];
  const raw = Math.floor(rawModules(version) / 8);
  const short = blocks - (raw % blocks);
  const shortLength = Math.floor(raw / blocks) - ecc;
  const divisor = generator(ecc);
  const parts: { data: Uint8Array; ecc: Uint8Array }[] = [];
  for (let i = 0, at = 0; i < blocks; i++) {
    const length = shortLength + (i < short ? 0 : 1);
    const part = data.subarray(at, at + length);
    at += length;
    const rest = new Uint8Array(ecc);
    for (const b of part) {
      const factor = b ^ rest[0];
      rest.copyWithin(0, 1);
      rest[ecc - 1] = 0;
      if (factor) for (let j = 0; j < ecc; j++) rest[j] ^= times(divisor[j], factor);
    }
    parts.push({ data: part, ecc: rest });
  }
  const out = new Uint8Array(raw);
  let at = 0;
  for (let i = 0; i <= shortLength; i++) for (const part of parts) if (i < part.data.length) out[at++] = part.data[i];
  for (let i = 0; i < ecc; i++) for (const part of parts) out[at++] = part.ecc[i];
  return out;
}

class Grid {
  readonly size: number;
  readonly dark: Uint8Array;
  // The modules of the fixed patterns and the format, which data and masks leave alone.
  private readonly fixed: Uint8Array;

  constructor(size: number) {
    this.size = size;
    this.dark = new Uint8Array(size * size);
    this.fixed = new Uint8Array(size * size);
  }

  private set(row: number, col: number, on: boolean) {
    const at = row * this.size + col;
    this.dark[at] = on ? 1 : 0;
    this.fixed[at] = 1;
  }

  functionPatterns(version: number) {
    const size = this.size;
    for (let i = 0; i < size; i++) {
      this.set(6, i, i % 2 === 0);
      this.set(i, 6, i % 2 === 0);
    }
    // The three finders, each with its light separator.
    for (const [row, col] of [[3, 3], [3, size - 4], [size - 4, 3]]) {
      for (let dy = -4; dy <= 4; dy++) {
        for (let dx = -4; dx <= 4; dx++) {
          const r = row + dy;
          const c = col + dx;
          if (r < 0 || r >= size || c < 0 || c >= size) continue;
          const far = Math.max(Math.abs(dx), Math.abs(dy));
          this.set(r, c, far !== 2 && far !== 4);
        }
      }
    }
    // The alignment patterns, but where they would cover a finder.
    const places = alignment(version);
    const n = places.length;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if ((i === 0 && j === 0) || (i === 0 && j === n - 1) || (i === n - 1 && j === 0)) continue;
        for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) this.set(places[i] + dy, places[j] + dx, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
      }
    }
    // The format's places, drawn with each mask (format), and the version's.
    this.format('M', 0);
    if (version >= 7) {
      let rest = version;
      for (let i = 0; i < 12; i++) rest = (rest << 1) ^ ((rest >>> 11) * 0x1f25);
      const bits = (version << 12) | rest;
      for (let i = 0; i < 18; i++) {
        const on = ((bits >>> i) & 1) === 1;
        const a = size - 11 + (i % 3);
        const b = Math.floor(i / 3);
        this.set(b, a, on);
        this.set(a, b, on);
      }
    }
  }

  format(ecl: Level, mask: number) {
    const size = this.size;
    const data = ((ecl === 'L' ? 1 : 0) << 3) | mask;
    let rest = data;
    for (let i = 0; i < 10; i++) rest = (rest << 1) ^ ((rest >>> 9) * 0x537);
    const bits = ((data << 10) | rest) ^ 0x5412;
    const bit = (i: number) => ((bits >>> i) & 1) === 1;
    for (let i = 0; i <= 5; i++) this.set(i, 8, bit(i));
    this.set(7, 8, bit(6));
    this.set(8, 8, bit(7));
    this.set(8, 7, bit(8));
    for (let i = 9; i < 15; i++) this.set(8, 14 - i, bit(i));
    for (let i = 0; i < 8; i++) this.set(8, size - 1 - i, bit(i));
    for (let i = 8; i < 15; i++) this.set(size - 15 + i, 8, bit(i));
    this.set(size - 8, 8, true);
  }

  // The codewords in their zigzag, two columns at a time from the right, up and down by turns.
  place(codewords: Uint8Array) {
    const size = this.size;
    let i = 0;
    const total = codewords.length * 8;
    for (let right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      const up = ((right + 1) & 2) === 0;
      for (let vert = 0; vert < size; vert++) {
        const row = up ? size - 1 - vert : vert;
        for (let j = 0; j < 2; j++) {
          const at = row * size + right - j;
          if (this.fixed[at] || i >= total) continue;
          this.dark[at] = (codewords[i >>> 3] >>> (7 - (i & 7))) & 1;
          i++;
        }
      }
    }
  }

  mask(mask: number) {
    const size = this.size;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const at = y * size + x;
        if (this.fixed[at]) continue;
        let flip: boolean;
        switch (mask) {
          case 0: flip = (x + y) % 2 === 0; break;
          case 1: flip = y % 2 === 0; break;
          case 2: flip = x % 3 === 0; break;
          case 3: flip = (x + y) % 3 === 0; break;
          case 4: flip = (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0; break;
          case 5: flip = ((x * y) % 2) + ((x * y) % 3) === 0; break;
          case 6: flip = (((x * y) % 2) + ((x * y) % 3)) % 2 === 0; break;
          default: flip = (((x + y) % 2) + ((x * y) % 3)) % 2 === 0;
        }
        if (flip) this.dark[at] ^= 1;
      }
    }
  }

  // How hard the code would be to read (the standard's four penalties, the finder-like one
  // without its light margins): the mask with the least wins.
  penalty(): number {
    const { size, dark } = this;
    let score = 0;
    let darks = 0;
    for (let line = 0; line < 2; line++) {
      for (let a = 0; a < size; a++) {
        let run = 0;
        let last = -1;
        let window = 0;
        for (let b = 0; b < size; b++) {
          const on = line === 0 ? dark[a * size + b] : dark[b * size + a];
          if (line === 0) darks += on;
          if (on === last) {
            run++;
            if (run === 5) score += 3;
            else if (run > 5) score++;
          } else {
            run = 1;
            last = on;
          }
          window = ((window << 1) | on) & 0x7ff;
          if (b >= 10 && (window === 0b00001011101 || window === 0b10111010000)) score += 40;
        }
      }
    }
    for (let y = 0; y + 1 < size; y++) {
      for (let x = 0; x + 1 < size; x++) {
        const at = y * size + x;
        const sum = dark[at] + dark[at + 1] + dark[at + size] + dark[at + size + 1];
        if (sum === 0 || sum === 4) score += 3;
      }
    }
    const total = size * size;
    score += (Math.ceil(Math.abs(darks * 20 - total * 10) / total) - 1) * 10;
    return score;
  }
}

// Where a version's alignment patterns are centred, the same along both sides.
function alignment(version: number): number[] {
  if (version === 1) return [];
  const count = Math.floor(version / 7) + 2;
  const step = version === 32 ? 26 : Math.ceil((version * 4 + 4) / (count * 2 - 2)) * 2;
  const out = [6];
  for (let at = version * 4 + 10; out.length < count; at -= step) out.splice(1, 0, at);
  return out;
}

/**
 * The QR code for `text` as a PNG, black modules on white, with a quiet zone of `quiet` modules
 * around it, as scanners expect: each module a square of whole pixels, as many as fit in `pixels`
 * (2 at least), so the picture shows sharp at its own size. `size` is its width and height.
 */
export function qrPng(text: string | Uint8Array, pixels: number, quiet = 4): { png: Uint8Array; size: number } {
  const { size: count, dark } = qrMatrix(text);
  const cell = Math.max(2, Math.floor(pixels / (count + quiet * 2)));
  const size = cell * (count + quiet * 2);
  // One bit a pixel, 1 white; each line starts with its filter, none.
  const line = Math.ceil(size / 8) + 1;
  const raw = new Uint8Array(line * size).fill(0xff);
  for (let y = 0; y < size; y++) raw[y * line] = 0;
  for (let row = 0; row < count; row++) {
    const top = (row + quiet) * cell * line;
    for (let col = 0; col < count; col++) {
      if (!dark[row * count + col]) continue;
      for (let x = (col + quiet) * cell, end = x + cell; x < end; x++) raw[top + 1 + (x >> 3)] &= ~(0x80 >> (x & 7));
    }
    // The module row's other lines are the same as its first.
    for (let y = 1; y < cell; y++) raw.copyWithin(top + y * line, top, top + line);
  }
  const header = new Uint8Array(13);
  const view = new DataView(header.buffer);
  view.setUint32(0, size);
  view.setUint32(4, size);
  header.set([1, 0, 0, 0, 0], 8); // bit depth 1, greyscale, deflate, no filter, no interlace
  return { png: png([chunk('IHDR', header), chunk('IDAT', zlibStored(raw)), chunk('IEND', new Uint8Array(0))]), size };
}

const SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function png(chunks: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(SIGNATURE.length + chunks.reduce((sum, c) => sum + c.length, 0));
  out.set(SIGNATURE);
  let at = SIGNATURE.length;
  for (const c of chunks) {
    out.set(c, at);
    at += c.length;
  }
  return out;
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(data.length + 12);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  view.setUint32(8 + data.length, crc32(out, 4, 8 + data.length));
  return out;
}

// A zlib stream that keeps the bytes as they are (deflate's stored blocks): a QR code's picture
// is small enough not to need packing, and this needs no deflate written here.
function zlibStored(data: Uint8Array): Uint8Array {
  const BLOCK = 0xffff;
  const blocks = Math.max(1, Math.ceil(data.length / BLOCK));
  const out = new Uint8Array(2 + data.length + blocks * 5 + 4);
  out[0] = 0x78;
  out[1] = 0x01;
  let at = 2;
  for (let i = 0; i < blocks; i++) {
    const part = data.subarray(i * BLOCK, (i + 1) * BLOCK);
    out[at] = i === blocks - 1 ? 1 : 0;
    out[at + 1] = part.length & 0xff;
    out[at + 2] = part.length >> 8;
    out[at + 3] = ~part.length & 0xff;
    out[at + 4] = (~part.length >> 8) & 0xff;
    out.set(part, at + 5);
    at += 5 + part.length;
  }
  let a = 1;
  let b = 0;
  for (let i = 0; i < data.length; ) {
    // 5552 bytes at most before the sums could pass 2^32.
    for (const end = Math.min(data.length, i + 5552); i < end; i++) {
      a += data[i];
      b += a;
    }
    a %= 65521;
    b %= 65521;
  }
  new DataView(out.buffer).setUint32(at, ((b << 16) | a) >>> 0);
  return out;
}

let crcTable: Uint32Array | null = null;

function crc32(bytes: Uint8Array, start: number, end: number): number {
  if (!crcTable) {
    crcTable = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crcTable[n] = c >>> 0;
    }
  }
  let c = 0xffffffff;
  for (let i = start; i < end; i++) c = crcTable[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
