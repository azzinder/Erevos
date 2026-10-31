// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// A photo shown on its own zooms and moves as the fingers do (lib/photo-zoom.ts): the point between
// two fingers stays between them, a double tap keeps the point tapped, and it never moves past its edges.

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { doubleTapped, fitted, kept, MOST_ZOOM, moved, pinched, WHOLE, type Look, type Point } from '../lib/photo-zoom';

const room = { width: 400, height: 800 };
// Where a point of the photo (from its middle, not zoomed) shows with `look`.
const shown = (look: Look, at: Point): Point => ({ x: at.x * look.scale + look.x, y: at.y * look.scale + look.y });

test('a photo fits inside the screen, whole, whichever way it is turned', () => {
  assert.deepEqual(fitted(room, 4000, 3000), { width: 400, height: 300 });
  assert.deepEqual(fitted({ width: 800, height: 400 }, 3000, 4000), { width: 300, height: 400 });
  // Its size not known: the screen.
  assert.deepEqual(fitted(room), room);
});

test('two fingers zoom around the point between them, which stays between them as they move', () => {
  const from = { x: 50, y: -20 };
  const look = pinched(WHOLE, from, { x: 70, y: 10 }, 100, 250);
  assert.equal(look.scale, 2.5);
  const point = { x: (from.x - WHOLE.x) / WHOLE.scale, y: (from.y - WHOLE.y) / WHOLE.scale };
  assert.deepEqual(shown(look, point), { x: 70, y: 10 });
  // Again, from there: the same point of the photo still follows the fingers.
  const again = pinched(look, { x: 70, y: 10 }, { x: 0, y: 0 }, 100, 140);
  assert.equal(again.scale, 3.5);
  const p = shown(again, point);
  assert.ok(Math.abs(p.x) < 1e-9 && Math.abs(p.y) < 1e-9);
  // Never past the most, nor smaller than whole.
  assert.equal(pinched(WHOLE, from, from, 10, 1000).scale, MOST_ZOOM);
  assert.equal(pinched(WHOLE, from, from, 100, 10).scale, 1);
});

test('a double tap zooms in keeping the point tapped where it is, and a second shows it whole', () => {
  const at = { x: -120, y: 200 };
  const look = doubleTapped(WHOLE, at);
  assert.deepEqual(shown(look, at), at);
  assert.deepEqual(doubleTapped(look, at), WHOLE);
});

test('one finger moves a zoomed photo only, and never past its edges', () => {
  assert.deepEqual(moved(WHOLE, { x: 0, y: 0 }, { x: 80, y: 0 }), WHOLE);
  const fit = fitted(room, 4000, 3000);
  const zoomed = kept(moved({ scale: 2, x: 0, y: 0 }, { x: 0, y: 0 }, { x: 900, y: 900 }), room, fit);
  // 800 wide at twice: 200 to each side; 600 high inside 800: not at all up or down.
  assert.deepEqual(zoomed, { scale: 2, x: 200, y: 0 });
  assert.deepEqual(kept({ scale: 4, x: -2000, y: -2000 }, room, fit), { scale: 4, x: -600, y: -200 });
  assert.deepEqual(kept({ scale: 0.5, x: 30, y: 30 }, room, fit), WHOLE);
});
