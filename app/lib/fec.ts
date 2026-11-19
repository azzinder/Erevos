// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// Spare pieces that make up for lost ones (an erasure code, Reed-Solomon over GF(256) with a
// Cauchy matrix), for what goes over LoRa in pieces (lib/lora.ts): with m spare pieces made from
// k pieces of the same size, any k of the k + m that come give back all k. Each spare byte is a
// sum, in GF(256), of the same byte of every piece, each times its own number of the matrix, so
// the k pieces stay as they are and an Erevos that knows nothing of spares reads them as before.
// Self-contained on purpose, so it runs under plain Node for checks.

/** The most pieces, and the most spare pieces, a matrix row and column can stand for here. */
export const MOST_PIECES = 16;
export const MOST_SPARES = 16;

// GF(256) with the polynomial x^8 + x^4 + x^3 + x^2 + 1 (0x11d), by tables of its powers of 2.
const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);
{
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP[i] = x;
    LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
}

function mul(a: number, b: number): number {
  return a === 0 || b === 0 ? 0 : EXP[LOG[a] + LOG[b]];
}

function inv(a: number): number {
  return EXP[255 - LOG[a]];
}

// The number spare `j` takes piece `d` times: 1 / (x_j + y_d), with x_j = 16 + j and y_d = d, all
// apart, so every square part of the matrix can be undone, whichever pieces were lost.
function factor(j: number, d: number): number {
  return inv((MOST_PIECES + j) ^ d);
}

// `into` += `factor` × `piece`, byte by byte, the piece read as zeros past its end.
function addTimes(into: Uint8Array, piece: Uint8Array, by: number): void {
  if (by === 0) return;
  const log = LOG[by];
  const n = Math.min(into.length, piece.length);
  for (let i = 0; i < n; i++) {
    const b = piece[i];
    if (b !== 0) into[i] ^= EXP[LOG[b] + log];
  }
}

/** `spares` spare pieces, `size` bytes each, for these pieces (the last may be shorter: read as ending in zeros). */
export function sparesOf(pieces: Uint8Array[], spares: number, size: number): Uint8Array[] {
  if (pieces.length < 1 || pieces.length > MOST_PIECES || spares < 0 || spares > MOST_SPARES) throw new RangeError('pieces');
  return Array.from({ length: spares }, (_, j) => {
    const spare = new Uint8Array(size);
    pieces.forEach((piece, d) => addTimes(spare, piece, factor(j, d)));
    return spare;
  });
}

/**
 * The `count` pieces, `size` bytes each, from those that came (`pieces`, by number, each `size`
 * bytes, the last read as ending in zeros) and the spares that came (by number): null when too few
 * came. Each piece given back is `size` bytes: the last is cut to its length by the caller.
 */
export function recover(count: number, size: number, pieces: ReadonlyMap<number, Uint8Array>, spares: ReadonlyMap<number, Uint8Array>): Uint8Array[] | null {
  if (count < 1 || count > MOST_PIECES) return null;
  const lost: number[] = [];
  for (let d = 0; d < count; d++) if (!pieces.has(d)) lost.push(d);
  const full = (d: number) => {
    const out = new Uint8Array(size);
    out.set(pieces.get(d)!.subarray(0, size));
    return out;
  };
  if (lost.length === 0) return Array.from({ length: count }, (_, d) => full(d));
  const used = [...spares.keys()].filter((j) => j >= 0 && j < MOST_SPARES && spares.get(j)!.length === size).sort((a, b) => a - b).slice(0, lost.length);
  if (used.length < lost.length) return null;
  const n = lost.length;
  // The equations: for each spare used, what of it the lost pieces make, once those that came are
  // taken off; a = the matrix's numbers for the lost pieces.
  const a = used.map((j) => lost.map((d) => factor(j, d)));
  const b = used.map((j) => {
    const rest = spares.get(j)!.slice();
    for (const [d, piece] of pieces) if (d < count) addTimes(rest, piece, factor(j, d));
    return rest;
  });
  // Gauss-Jordan in GF(256): adding is xor, so taking off is too.
  for (let col = 0; col < n; col++) {
    let pivot = col;
    while (pivot < n && a[pivot][col] === 0) pivot++;
    if (pivot === n) return null;
    [a[col], a[pivot]] = [a[pivot], a[col]];
    [b[col], b[pivot]] = [b[pivot], b[col]];
    const scale = inv(a[col][col]);
    a[col] = a[col].map((v) => mul(v, scale));
    const scaled = new Uint8Array(size);
    addTimes(scaled, b[col], scale);
    b[col] = scaled;
    for (let row = 0; row < n; row++) {
      if (row === col || a[row][col] === 0) continue;
      const by = a[row][col];
      a[row] = a[row].map((v, i) => v ^ mul(a[col][i], by));
      addTimes(b[row], b[col], by);
    }
  }
  const found = new Map(lost.map((d, i) => [d, b[i]]));
  return Array.from({ length: count }, (_, d) => found.get(d) ?? full(d));
}
