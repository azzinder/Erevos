// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// The ways to give to Erevos (lib/donate.ts): the Bitcoin and Monero addresses have right checksums,
// so a wrong character can never reach a release, and the pages are the ones their makers serve,
// over https.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { keccak_256 } from '@noble/hashes/sha3.js';

import { BITCOIN, LIBERAPAY, LIBERAPAY_QR, MONERO, PAYPAL, PAYPAL_QR, walletLink } from '../lib/donate';

// Bech32 (BIP 173): the checksum over the human part and the data.
const CHARSET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
function polymod(values: number[]): number {
  const g = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
  let chk = 1;
  for (const v of values) {
    const top = chk >>> 25;
    chk = (((chk & 0x1ffffff) << 5) ^ v) >>> 0;
    for (let i = 0; i < 5; i++) if ((top >>> i) & 1) chk = (chk ^ g[i]) >>> 0;
  }
  return chk;
}
function isBech32(address: string, hrp: string): boolean {
  if (address !== address.toLowerCase() || !address.startsWith(`${hrp}1`)) return false;
  const data = [...address.slice(hrp.length + 1)].map((c) => CHARSET.indexOf(c));
  if (data.length < 7 || data.includes(-1)) return false;
  const expanded = [...[...hrp].map((c) => c.charCodeAt(0) >> 5), 0, ...[...hrp].map((c) => c.charCodeAt(0) & 31)];
  return polymod([...expanded, ...data]) === 1;
}

test('the Bitcoin address is a whole native SegWit address', () => {
  assert.ok(isBech32(BITCOIN, 'bc'));
  // Witness version 0 with a 20-byte program: 42 characters.
  assert.equal(BITCOIN.length, 42);
  assert.equal(BITCOIN[3], 'q');
  // One character changed, and the checksum says so.
  assert.ok(!isBech32(BITCOIN.slice(0, 10) + (BITCOIN[10] === 'q' ? 'p' : 'q') + BITCOIN.slice(11), 'bc'));
  assert.equal(walletLink('bitcoin', BITCOIN), `bitcoin:${BITCOIN}`);
});

// Monero's base58: blocks of 8 bytes as 11 characters, the last block shorter; the last 4 bytes
// are the start of the Keccak-256 of the rest.
const BASE58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const BLOCK_CHARS = [0, 2, 3, 5, 6, 7, 9, 10, 11];
function moneroBytes(address: string): Uint8Array | null {
  const out: number[] = [];
  for (let i = 0; i < address.length; i += 11) {
    const block = address.slice(i, i + 11);
    const size = BLOCK_CHARS.indexOf(block.length);
    if (size < 0) return null;
    let n = 0n;
    for (const c of block) {
      const digit = BASE58.indexOf(c);
      if (digit < 0) return null;
      n = n * 58n + BigInt(digit);
    }
    const bytes: number[] = [];
    for (let j = 0; j < size; j++) {
      bytes.unshift(Number(n & 255n));
      n >>= 8n;
    }
    if (n !== 0n) return null;
    out.push(...bytes);
  }
  return Uint8Array.from(out);
}
function isMonero(address: string): boolean {
  const bytes = moneroBytes(address);
  if (!bytes || bytes.length !== 69) return false;
  const sum = keccak_256(bytes.slice(0, -4)).slice(0, 4);
  return sum.every((b, i) => b === bytes[65 + i]);
}

test('the Monero address is a whole main-network subaddress', () => {
  assert.ok(isMonero(MONERO));
  // 42 is a subaddress on Monero's main network.
  assert.equal(moneroBytes(MONERO)![0], 42);
  assert.ok(!isMonero(MONERO.slice(0, -1) + (MONERO.endsWith('h') ? 'i' : 'h')));
  assert.equal(walletLink('monero', MONERO), `monero:${MONERO}`);
});

test("the pages for giving are the services' own, over https", () => {
  assert.equal(new URL(LIBERAPAY).origin, 'https://liberapay.com');
  assert.equal(new URL(PAYPAL).origin, 'https://www.paypal.com');
  assert.equal(new URL(LIBERAPAY).search, '');
});

test("PayPal's page is the donate page of the business, in euros, one-off or recurring", () => {
  const url = new URL(PAYPAL);
  assert.equal(url.origin, 'https://www.paypal.com');
  assert.equal(url.pathname, '/donate/');
  assert.deepEqual([...url.searchParams.entries()], [
    ['business', 'A9DV5LKGBGUF4'],
    ['no_recurring', '0'],
    ['currency_code', 'EUR'],
  ]);
});

test('the QR codes hold the links, PayPal marked as scanned, and the coins only the bare address', () => {
  assert.equal(PAYPAL_QR, PAYPAL + '&source=qr');
  assert.equal(LIBERAPAY_QR, 'https://liberapay.com/Nekten/donate');
  assert.equal(new URL(LIBERAPAY_QR).search, '');
  assert.equal(new URL(PAYPAL_QR).searchParams.get('source'), 'qr');
});
