// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// Shamir's secret sharing over GF(256), byte by byte: a secret split into n shares, any k of
// which give it back, while k - 1 or fewer say nothing at all of it (every secret of its length is
// as likely with them as any other). Used for pieces of a backup's password given to friends
// (lib/backup-pieces.ts). Small on purpose, to be read whole:
//
// - GF(256) is the field AES uses: bytes, added with XOR, multiplied modulo x^8 + x^4 + x^3 + x + 1
//   (0x11b), through tables of powers of 3, which generates all 255 bytes other than 0.
// - Each byte of the secret is the constant term of a polynomial of degree k - 1 whose other k - 1
//   coefficients are random bytes, each of all 256 values, 0 too (leaving 0 out would tell a
//   little of the secret). Share x (1 to n, never 0, which is the secret itself) holds the
//   polynomial's value at x for every byte.
// - k shares give the polynomial at 0 back by Lagrange's formula: the sum, over the shares j, of
//   y_j times the product, over the other shares m, of x_m / (x_m - x_j), where minus is XOR too.
//
// Tables are looked up by the secret's bytes; JavaScript gives no promise of constant time, and
// these are computed on the owner's phone only, when pieces are made or put together.

const EXP = new Uint8Array(510);
const LOG = new Uint8Array(256);
(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP[i] = x;
    LOG[x] = i;
    // x * 3 = x * 2 + x, with x * 2 reduced by 0x11b when it overflows a byte.
    x ^= (x << 1) ^ (x & 0x80 ? 0x11b : 0);
  }
  // Twice over, so a sum of two logarithms needs no modulo.
  for (let i = 255; i < 510; i++) EXP[i] = EXP[i - 255];
})();

/** a × b in GF(256). */
export function mul(a: number, b: number): number {
  return a === 0 || b === 0 ? 0 : EXP[LOG[a] + LOG[b]];
}

/** a ÷ b in GF(256); b is never 0. */
export function div(a: number, b: number): number {
  if (b === 0) throw new Error('division by zero');
  return a === 0 ? 0 : EXP[LOG[a] + 255 - LOG[b]];
}

/** A share: its x (1 to 255) and the polynomials' values there, one per byte of the secret. */
export type Share = { x: number; y: Uint8Array };

/** The most shares a secret is split into, and the fewest needed. */
export const MOST_SHARES = 255;
export const FEWEST_NEEDED = 2;

/**
 * Splits `secret` into `n` shares, any `k` of which give it back. `random` gives random bytes
 * (lib/crypto.ts randomBytes; another only in checks).
 */
export function split(secret: Uint8Array, k: number, n: number, random: (length: number) => Uint8Array): Share[] {
  if (!Number.isInteger(k) || !Number.isInteger(n) || k < FEWEST_NEEDED || n < k || n > MOST_SHARES) throw new Error('k and n out of range');
  if (secret.length === 0) throw new Error('nothing to split');
  // The k - 1 coefficients after the constant one, for every byte: coefficient c of byte i at
  // i * (k - 1) + c - 1.
  const coefficients = random(secret.length * (k - 1));
  if (coefficients.length !== secret.length * (k - 1)) throw new Error('random gave too few bytes');
  const shares: Share[] = [];
  for (let x = 1; x <= n; x++) {
    const y = new Uint8Array(secret.length);
    for (let i = 0; i < secret.length; i++) {
      // Horner's rule, from the highest coefficient down to the secret's byte.
      let value = 0;
      for (let c = k - 1; c >= 1; c--) value = mul(value, x) ^ coefficients[i * (k - 1) + c - 1];
      y[i] = mul(value, x) ^ secret[i];
    }
    shares.push({ x, y });
  }
  coefficients.fill(0);
  return shares;
}

/**
 * The secret that `shares` give: all of them are used, so pass exactly k, each with its own x.
 * Fewer than k give a value that has nothing to do with the secret: whoever puts shares together
 * checks what comes out (lib/backup-pieces.ts keeps a hash of it inside the secret).
 */
export function combine(shares: Share[]): Uint8Array {
  if (shares.length < FEWEST_NEEDED) throw new Error('too few shares');
  const length = shares[0].y.length;
  const xs = new Set<number>();
  for (const { x, y } of shares) {
    if (!Number.isInteger(x) || x < 1 || x > MOST_SHARES || xs.has(x)) throw new Error('shares must have distinct x from 1 to 255');
    if (y.length !== length) throw new Error('shares of different lengths');
    xs.add(x);
  }
  // Each share's Lagrange weight at 0: the product over the others of x_m / (x_m ^ x_j).
  const weights = shares.map(({ x: xj }, j) => shares.reduce((w, { x: xm }, m) => (m === j ? w : mul(w, div(xm, xm ^ xj))), 1));
  const secret = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    let value = 0;
    for (let j = 0; j < shares.length; j++) value ^= mul(shares[j].y[i], weights[j]);
    secret[i] = value;
  }
  return secret;
}
