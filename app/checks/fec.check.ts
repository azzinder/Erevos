// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// Spare pieces (lib/fec.ts): any k of k pieces and their spares give back all k, whichever were lost.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { test } from 'node:test';

import { recover, sparesOf } from '../lib/fec';

// Every way to lose `lose` of `total` things, by their numbers.
function* lossesOf(total: number, lose: number, from = 0): Generator<number[]> {
  if (lose === 0) return yield [];
  for (let i = from; i <= total - lose; i++) for (const rest of lossesOf(total, lose - 1, i + 1)) yield [i, ...rest];
}

test('any k of k pieces and m spares give back the pieces, the last shorter too', () => {
  for (const [count, spares] of [
    [2, 1],
    [4, 1],
    [5, 2],
    [8, 2],
    [12, 3],
    [16, 4],
  ]) {
    const size = 37;
    const pieces = Array.from({ length: count }, (_, d) => new Uint8Array(randomBytes(d === count - 1 ? 11 : size)));
    const spare = sparesOf(pieces, spares, size);
    assert.equal(spare.length, spares);
    for (let lose = 0; lose <= spares; lose++) {
      for (const lost of lossesOf(count + spares, lose)) {
        const came = new Map(pieces.map((p, d) => [d, p] as const).filter(([d]) => !lost.includes(d)));
        const sparesCame = new Map(spare.map((p, j) => [j, p] as const).filter(([j]) => !lost.includes(count + j)));
        const back = recover(count, size, came, sparesCame);
        assert.ok(back, `${count}+${spares}, lost ${lost}`);
        back.forEach((piece, d) => assert.deepEqual(piece.subarray(0, pieces[d].length), pieces[d], `${count}+${spares}, lost ${lost}, piece ${d}`));
      }
    }
    // One more lost than spares: nothing.
    const came = new Map(pieces.slice(spares + 1).map((p, i) => [i + spares + 1, p] as const));
    assert.equal(recover(count, size, came, new Map(spare.map((p, j) => [j, p] as const))), null);
  }
});

test('a spare of the wrong size counts for nothing', () => {
  const pieces = [new Uint8Array(randomBytes(20)), new Uint8Array(randomBytes(20))];
  const [spare] = sparesOf(pieces, 1, 20);
  assert.equal(recover(2, 20, new Map([[0, pieces[0]]]), new Map([[0, spare.subarray(0, 19)]])), null);
  assert.deepEqual(recover(2, 20, new Map([[0, pieces[0]]]), new Map([[0, spare]]))![1], pieces[1]);
});
