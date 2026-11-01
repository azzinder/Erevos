// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// How each built-in sticker (lib/stickers.ts) is drawn: shapes on a grid of 100 by 100, which
// components/stickers.tsx turns into plain views scaled to the size asked, so every phone draws
// them itself and nothing is downloaded. Moons, ghosts, cats and the other faces with their moods,
// animals, things of the sea, the sky and the year, words, treats, fruit and more. They are
// their own colours, the same in every look, as a picture is, each on shapes of its own (never
// ink straight on the chat's ground), so it reads in a light look and a dark one.
// A part is what moves of a sticker (lib/sticker-motion.ts); the rest of it stays as it is drawn.
// Self-contained on purpose, so it can run under plain Node for checks.

import { TUX_BEAK as TUX_BEAK_SHAPE, TUX_BEAK_LINE, TUX_BELLY, TUX_BODY, TUX_BOX, TUX_EYES, TUX_FOOT2, TUX_FRONT, TUX_WING1, TUX_WING2, TUX_WING2_LOW, TUX_WING2_TIP } from './sticker-tux';
import { AIKI_GI, AIKI_HAKAMA, AIKI_HAKAMA_SEATED, AIKI_SHOULDERS, aikiArm, aikiHead } from './sticker-aikido';
import { EYES_ART } from './sticker-angry-eyes';
import { TAKIS_BROWS, TAKIS_HEAD, TAKIS_NOSE, TAKIS_OWN_FACE, TAKIS_SHOULDERS, TAKIS_SUIT, takisArm } from './sticker-takis';

/** Corners rounded the same, or each: top left, top right, bottom right, bottom left. */
export type Corners = number | [number, number, number, number];

/**
 * A shape on the grid. A disc, an oval, a ring (pressed to a height `h` and turned, as a planet's),
 * an arc (a side of a ring: its bottom a smile, its top a frown or a closed eye, a thick one at a
 * side a crescent), a triangle (pointing up unless turned) and a heart are placed by
 * their middle; a box by its top left corner, with what is `inside` it cut to it. A stroke goes
 * from one end to the other, with round ends. The words of a Words sticker fill their box, in the
 * app's language. A drawing of curves (SVG) fills its box. A tilt turns its shapes about a point;
 * a part is one that moves.
 */
export type Shape =
  | { s: 'dot'; x: number; y: number; d: number; c: string }
  | { s: 'oval'; x: number; y: number; w: number; h: number; c: string; turn?: number }
  | { s: 'ring'; x: number; y: number; d: number; w: number; c: string; h?: number; turn?: number }
  | { s: 'arc'; x: number; y: number; d: number; w: number; side: 'top' | 'bottom' | 'left' | 'right'; c: string }
  | { s: 'tri'; x: number; y: number; w: number; h: number; c: string; turn?: number }
  | { s: 'heart'; x: number; y: number; size: number; c: string }
  | { s: 'box'; x: number; y: number; w: number; h: number; c: string; r?: Corners; turn?: number; edge?: { w: number; c: string }; inside?: Shape[] }
  | { s: 'bar'; x1: number; y1: number; x2: number; y2: number; w: number; c: string }
  | { s: 'words'; x: number; y: number; w: number; h: number; c: string }
  | { s: 'svg'; x: number; y: number; w: number; h: number; xml: string }
  | { s: 'tilt'; turn: number; about: [number, number]; shapes: Shape[] }
  | { s: 'part'; name: string; shapes: Shape[] };

const INK = '#3B2A1A';
const WHITE = '#FFFFFF';
const MOON = '#F4CF57';
const MOON_EDGE = '#D9A441';
const CRATER = '#E8BC45';
const CHEEK = '#F29A8B';
const TEAR = '#6FB1E8';
const RED = '#E5484D';
const RED_DARK = '#C93A3F';
const PINK = '#F7A8B8';
const PINK_DARK = '#E58A9E';
const BROWN = '#6B4A33';
const STEAM = '#B9AFA3';
const GREEN = '#2F9E6E';
const SUN = '#F7B733';
const GOLD = '#F2A81D';
const ORANGE = '#F08A3C';
const BLUE = '#5B8DEF';
const SKY = '#7FD1F2';
const PURPLE = '#9B6BD3';
const NIGHT = '#2C3A63';
const STRING = '#9AA3AD';
const GLASS = '#EAF4FB';
const GLASS_EDGE = '#9FB8C8';

const dot = (x: number, y: number, d: number, c: string): Shape => ({ s: 'dot', x, y, d, c });
const oval = (x: number, y: number, w: number, h: number, c: string, turn = 0): Shape => ({ s: 'oval', x, y, w, h, c, ...(turn ? { turn } : {}) });
const ring = (x: number, y: number, d: number, w: number, c: string, h = d, turn = 0): Shape => ({ s: 'ring', x, y, d, w, c, ...(h !== d ? { h } : {}), ...(turn ? { turn } : {}) });
const arc = (x: number, y: number, d: number, w: number, side: 'top' | 'bottom' | 'left' | 'right', c = INK): Shape => ({ s: 'arc', x, y, d, w, side, c });
const tri = (x: number, y: number, w: number, h: number, c: string, turn = 0): Shape => ({ s: 'tri', x, y, w, h, c, ...(turn ? { turn } : {}) });
const heart = (x: number, y: number, size: number, c: string): Shape => ({ s: 'heart', x, y, size, c });
const bar = (x1: number, y1: number, x2: number, y2: number, w: number, c: string): Shape => ({ s: 'bar', x1, y1, x2, y2, w, c });
const box = (x: number, y: number, w: number, h: number, c: string, r: Corners = 0, more: { turn?: number; edge?: { w: number; c: string }; inside?: Shape[] } = {}): Shape => ({
  s: 'box',
  x,
  y,
  w,
  h,
  c,
  ...(r ? { r } : {}),
  ...more,
});
const tilt = (turn: number, about: [number, number], shapes: Shape[]): Shape => ({ s: 'tilt', turn, about, shapes });
const part = (name: string, shapes: Shape[]): Shape => ({ s: 'part', name, shapes });

/** Strokes out from x, y, from one distance to another, `n` of them round, the first `start` degrees from the top. */
function rays(x: number, y: number, from: number, to: number, n: number, w: number, c: string, start = 0): Shape[] {
  return Array.from({ length: n }, (_, i) => {
    const turn = ((start + (i * 360) / n - 90) * Math.PI) / 180;
    return bar(x + from * Math.cos(turn), y + from * Math.sin(turn), x + to * Math.cos(turn), y + to * Math.sin(turn), w, c);
  });
}

/** A star of five points, `size` across, its middle at x, y: a point out of each side of a disc. */
function star(x: number, y: number, size: number, c: string): Shape[] {
  const r = size / 2;
  return [
    ...Array.from({ length: 5 }, (_, i) => {
      const turn = -90 + i * 72;
      const out = 0.655 * r;
      return tri(x + out * Math.cos((turn * Math.PI) / 180), y + out * Math.sin((turn * Math.PI) / 180), 0.48 * r, 0.69 * r, c, turn + 90);
    }),
    dot(x, y, 0.72 * r, c),
  ];
}

// Faces: two eyes with a glint, and cheeks.
const eyes = (left: number, right: number, y: number, d = 8): Shape[] => [
  dot(left, y, d, INK),
  dot(right, y, d, INK),
  dot(left + d * 0.2, y - d * 0.2, d * 0.32, WHITE),
  dot(right + d * 0.2, y - d * 0.2, d * 0.32, WHITE),
];
const cheeksAt = (left: number, right: number, y: number, d = 9, c = CHEEK): Shape[] => [dot(left, y, d, c), dot(right, y, d, c)];
// A mouth like a 3 on its side: the cat's, the dog's, the bear's.
const muzzleMouth = (y: number, w = 10): Shape[] => [bar(50, y - 4, 50, y, 2.5, INK), arc(50 - w / 2, y - 2, w, 2.5, 'bottom'), arc(50 + w / 2, y - 2, w, 2.5, 'bottom')];

// The moon's face: its disc, its edge and craters, under what makes the face.
const moon = (face: Shape[], c = MOON): Shape[] => [
  box(6, 6, 88, 88, c, 44, { edge: { w: 3, c: MOON_EDGE } }),
  dot(18, 50, 8, CRATER),
  dot(76, 26, 7, CRATER),
  dot(74, 78, 9, CRATER),
  ...face,
];
const moonEyes = (d = 9) => [dot(36, 40, d, INK), dot(64, 40, d, INK)];
const moonCheeks = () => cheeksAt(26, 74, 58, 10);
const smile = () => arc(50, 50, 36, 5, 'bottom');

// Moods, the same for every face that has them (the cats, the dogs, the monsters, the robots, the
// dinosaurs): where its eyes are (l and r across, y down), where its mouth is (m), how large (k)
// and in what ink. The parts they make move as lib/sticker-motion.ts's moods do.
export type Mood = 'smile' | 'love' | 'laugh' | 'sad' | 'angry' | 'sleep' | 'wow' | 'wink' | 'cool' | 'shy' | 'cry' | 'kiss' | 'tongue' | 'dizzy' | 'think' | 'happy';
type Spot = { l: number; r: number; y: number; m: number; k?: number; ink?: string };
export function mood(kind: Mood, { l, r, y, m, k = 1, ink = INK }: Spot): Shape[] {
  const c = (l + r) / 2;
  const open = (w: number, h: number) => box(c - (w * k) / 2, m - 2 * k, w * k, h * k, ink, [0, 0, (w * k) / 2, (w * k) / 2], { inside: [box((w * k) / 2 - 5 * k, h * k - 7 * k, 10 * k, 8 * k, RED, 4 * k)] });
  const closed = () => [arc(l, y + 2 * k, 11 * k, 3 * k, 'top', ink), arc(r, y + 2 * k, 11 * k, 3 * k, 'top', ink)];
  const round = (d = 8) => [dot(l, y, d * k, ink), dot(r, y, d * k, ink), dot(l + 1.6 * k, y - 1.6 * k, 2.6 * k, WHITE), dot(r + 1.6 * k, y - 1.6 * k, 2.6 * k, WHITE)];
  const grin = (w = 14) => arc(c, m - (w * k) / 2, w * k, 3 * k, 'bottom', ink);
  const frown = (w = 14) => arc(c, m + (w * k) / 2, w * k, 3 * k, 'top', ink);
  const drop = (x: number, at: number) => box(x - 3.5 * k, at, 7 * k, 7 * k, TEAR, [0, 3.5 * k, 3.5 * k, 3.5 * k], { turn: 45 });
  switch (kind) {
    case 'smile':
      return [...round(), grin()];
    case 'happy':
      return [...closed(), grin()];
    case 'love':
      return [part('eye1', [heart(l, y, 13 * k, RED)]), part('eye2', [heart(r, y, 13 * k, RED)]), grin()];
    case 'laugh':
      return [...closed(), open(20, 13), part('tears', [oval(l - 9 * k, y, 5 * k, 8 * k, TEAR, 30), oval(r + 9 * k, y, 5 * k, 8 * k, TEAR, -30)])];
    case 'sad':
      return [...round(), frown(), part('tear1', [drop(l, y + 5 * k)])];
    case 'angry':
      return [...round(), bar(l - 6 * k, y - 9 * k, l + 4 * k, y - 5 * k, 3.5 * k, ink), bar(r + 6 * k, y - 9 * k, r - 4 * k, y - 5 * k, 3.5 * k, ink), frown(16)];
    case 'sleep':
      return [bar(l - 4.5 * k, y, l + 4.5 * k, y, 3 * k, ink), bar(r - 4.5 * k, y, r + 4.5 * k, y, 3 * k, ink), oval(c, m, 5 * k, 6 * k, ink)];
    case 'wow':
      return [dot(l, y, 11 * k, ink), dot(r, y, 11 * k, ink), dot(l + 2 * k, y - 2 * k, 3.5 * k, WHITE), dot(r + 2 * k, y - 2 * k, 3.5 * k, WHITE), box(c - 5 * k, m - 4 * k, 10 * k, 12 * k, 'transparent', 5 * k, { edge: { w: 3 * k, c: ink } })];
    case 'wink':
      return [part('eye1', [dot(l, y, 8 * k, ink), dot(l + 1.6 * k, y - 1.6 * k, 2.6 * k, WHITE)]), bar(r - 5 * k, y, r + 5 * k, y, 3 * k, ink), grin(), oval(c + 3 * k, m + 3 * k, 6 * k, 5 * k, PINK_DARK)];
    case 'cool':
      return [box(l - 10 * k, y - 6 * k, 18 * k, 12 * k, INK, [3 * k, 3 * k, 8 * k, 8 * k]), box(r - 8 * k, y - 6 * k, 18 * k, 12 * k, INK, [3 * k, 3 * k, 8 * k, 8 * k]), bar(l + 8 * k, y - 3 * k, r - 8 * k, y - 3 * k, 2.5 * k, INK), part('glint', [bar(l - 6 * k, y - 2 * k, l - 2 * k, y - 2 * k, 2 * k, WHITE), bar(r - 4 * k, y - 2 * k, r, y - 2 * k, 2 * k, WHITE)]), arc(c + 3 * k, m - 6 * k, 12 * k, 3 * k, 'bottom', ink)];
    case 'shy':
      return [...closed(), part('blush', [oval(l - 6 * k, y + 8 * k, 12 * k, 7 * k, CHEEK), oval(r + 6 * k, y + 8 * k, 12 * k, 7 * k, CHEEK)]), dot(c, m, 4.5 * k, ink)];
    case 'cry':
      return [...closed(), open(18, 11), part('tears', [box(l - 3.5 * k, y + 3 * k, 7 * k, 20 * k, TEAR, 3.5 * k), box(r - 3.5 * k, y + 3 * k, 7 * k, 20 * k, TEAR, 3.5 * k)])];
    case 'kiss':
      return [arc(l, y + 2 * k, 11 * k, 3 * k, 'top', ink), bar(r - 5 * k, y, r + 5 * k, y, 3 * k, ink), box(c - 4 * k, m - 4 * k, 8 * k, 4 * k, RED, 2 * k), box(c - 4 * k, m, 8 * k, 4 * k, RED, 2 * k), part('kiss', [heart(r + 14 * k, m, 12 * k, RED)])];
    case 'tongue':
      return [...round(), bar(c - 9 * k, m, c + 9 * k, m, 3 * k, ink), part('tongue', [box(c - 4 * k, m, 9 * k, 10 * k, RED, [0, 0, 4.5 * k, 4.5 * k])])];
    case 'dizzy':
      return [
        part('eye1', [arc(l, y, 12 * k, 2.5 * k, 'top', ink), arc(l, y, 7 * k, 2.5 * k, 'bottom', ink), dot(l, y, 3 * k, ink)]),
        part('eye2', [arc(r, y, 12 * k, 2.5 * k, 'top', ink), arc(r, y, 7 * k, 2.5 * k, 'bottom', ink), dot(r, y, 3 * k, ink)]),
        box(c - 5 * k, m - 3 * k, 10 * k, 7 * k, ink, 3.5 * k),
      ];
    case 'think':
      return [dot(l, y, 7 * k, ink), dot(r, y, 7 * k, ink), bar(r - 5 * k, y - 8 * k, r + 6 * k, y - 10 * k, 3 * k, ink), bar(c - 6 * k, m, c + 6 * k, m - 2 * k, 3 * k, ink)];
  }
}
// Things a face may have about it: a party hat, a cup of coffee, a heart held, a tick, z's of sleep and dots of a thought.
const partyHat = (x: number, y: number, k = 1): Shape[] => [part('hat', [tri(x, y - 11 * k, 22 * k, 24 * k, PURPLE), bar(x - 5 * k, y - 8 * k, x + 5 * k, y - 10 * k, 2.5 * k, SUN), bar(x - 8 * k, y - 2 * k, x + 8 * k, y - 4 * k, 2.5 * k, SUN), dot(x, y - 23 * k, 8 * k, SUN)])];
const coffeeCup = (x: number, y: number): Shape[] => [
  part('steam', [bar(x - 5, y - 16, x - 4, y - 10, 2.5, STEAM), bar(x + 4, y - 16, x + 5, y - 10, 2.5, STEAM)]),
  box(x + 9, y - 3, 10, 10, 'transparent', 5, { edge: { w: 3, c: BROWN } }),
  box(x - 12, y - 8, 24, 20, WHITE, [2, 2, 10, 10], { edge: { w: 2.5, c: BROWN } }),
  heart(x, y + 1, 8, RED),
];
const heldHeart = (x: number, y: number, size = 28): Shape[] => [part('heart', [heart(x, y, size, RED), dot(x - size / 4, y - size / 5, size / 6, '#F27D80')])];
const tick = (x: number, y: number): Shape[] => [part('badge', [dot(x, y, 30, WHITE), dot(x, y, 26, GREEN), bar(x - 8, y, x - 2, y + 6, 4.5, WHITE), bar(x - 2, y + 6, x + 8, y - 6, 4.5, WHITE)])];
const zees = (x: number, y: number): Shape[] => [part('z', [bar(x, y, x + 9, y, 3, BLUE), bar(x + 9, y, x, y + 9, 3, BLUE), bar(x, y + 9, x + 9, y + 9, 3, BLUE), bar(x + 12, y + 12, x + 18, y + 12, 2.5, BLUE), bar(x + 18, y + 12, x + 12, y + 18, 2.5, BLUE), bar(x + 12, y + 18, x + 18, y + 18, 2.5, BLUE)])];
const thought = (x: number, y: number): Shape[] => [part('dots', [dot(x, y, 6, '#C9C1E0'), dot(x + 8, y - 8, 9, '#C9C1E0')])];
const dizzyStars = (x: number, y: number): Shape[] => [part('stars', [...star(x - 30, y, 12, SUN), ...star(x + 30, y - 2, 10, SUN), ...star(x, y - 8, 8, SUN)])];

// A cat's face, for the Cats set, its moods' eyes and mouth (CAT) in `face`; `front` is drawn over it.
const CAT = { l: 37, r: 63, y: 53, m: 69 };
function catFace(face: Shape[], { c = '#F2A65A', dark = '#D9823B', inner = PINK, front = [] as Shape[] } = {}): Shape[] {
  return [
    part('ear1', [tri(30, 27, 26, 32, c, -18), tri(30, 30, 13, 17, inner, -18)]),
    part('ear2', [tri(70, 27, 26, 32, c, 18), tri(70, 30, 13, 17, inner, 18)]),
    oval(50, 58, 78, 66, c),
    bar(44, 28, 45, 35, 3.5, dark),
    bar(50, 26, 50, 35, 3.5, dark),
    bar(56, 28, 55, 35, 3.5, dark),
    ...cheeksAt(25, 75, 64, 9, PINK),
    ...face,
    tri(50, 61, 8, 5, PINK_DARK, 180),
    bar(12, 60, 26, 63, 2, INK),
    bar(12, 70, 26, 68, 2, INK),
    bar(74, 63, 88, 60, 2, INK),
    bar(74, 68, 88, 70, 2, INK),
    ...front,
  ];
}
const catPaw = (x: number, y: number, c = '#F2A65A'): Shape[] => [part('paw', [oval(x, y, 18, 22, c, -12), oval(x + 0.5, y + 3, 9, 8, PINK), dot(x - 5, y - 6, 4, PINK), dot(x + 0.5, y - 8, 4, PINK), dot(x + 6, y - 6, 4, PINK)])];

// A dog's face, for the Dogs set: floppy ears (ear1 its left, ear2 its right), a pale muzzle and,
// unless `blaze` is false, a stripe of it up its forehead; its moods' eyes and mouth (DOG) in `face`
// and its nose over them. `spots` are on its fur, and `front` is drawn over it all. With an `edge`,
// its head has one, so a pale dog reads on a light look.
const DOG = { l: 37, r: 63, y: 47, m: 72 };
const DOG_FUR = '#E2A35E';
function dogFace(face: Shape[], { c = DOG_FUR, ear = '#8A5A3C', muzzle = '#FFF1DC', blaze = true, front = [] as Shape[], spots = [] as Shape[], edge = '' } = {}): Shape[] {
  return [
    ...(edge ? [oval(50, 56, 78, 72, edge)] : []),
    oval(50, 56, 74, 68, c),
    ...spots,
    ...(blaze ? [box(45, 24, 10, 32, muzzle, 5)] : []),
    part('ear1', [oval(19, 50, 20, 44, ear, 14)]),
    part('ear2', [oval(81, 50, 20, 44, ear, -14)]),
    oval(50, 70, 40, 30, muzzle),
    ...cheeksAt(27, 73, 64, 8),
    ...face,
    oval(50, 60, 15, 10, INK),
    dot(47, 58, 3.5, WHITE),
    ...front,
  ];
}
const dogPaw = (x: number, y: number, c = DOG_FUR): Shape[] => [part('paw', [oval(x, y, 18, 22, c, -12), oval(x + 0.5, y + 3, 9, 8, BROWN), dot(x - 5, y - 6, 4, BROWN), dot(x + 0.5, y - 8, 4, BROWN), dot(x + 6, y - 6, 4, BROWN)])];
// A bone across a dog's mouth, `out` wider for its edge under it, and the foam of a bath, each bubble edged.
const bone = (c: string, out = 0): Shape[] => [...[[28, 72], [28, 80], [72, 72], [72, 80]].map(([x, y]) => dot(x, y, 9 + 2 * out, c)), box(27 - out, 73 - out, 46 + 2 * out, 6 + 2 * out, c, 3 + out)];
const foam = (bubbles: number[][]): Shape[] => bubbles.flatMap(([x, y, d]) => [dot(x, y, d + 2.5, GLASS_EDGE), dot(x, y, d, WHITE)]);

// A monster, for the Monsters set: a soft body of its colour with feet, horns, antennae, spikes or
// fur on top, and its arms; its moods' eyes and mouth (MONSTER) in `face`.
const MONSTER = { l: 38, r: 62, y: 46, m: 64 };
type Top = 'horns' | 'antennae' | 'spikes' | 'fur' | 'none';
function monster(face: Shape[], { c = '#7CD35C', dark = '#5BB43E', top = 'horns' as Top, arms = true, front = [] as Shape[] } = {}): Shape[] {
  const tops: Record<Top, Shape[]> = {
    horns: [tri(30, 20, 12, 18, '#F7E4C2', -20), tri(70, 20, 12, 18, '#F7E4C2', 20)],
    antennae: [bar(38, 24, 32, 8, 3, dark), bar(62, 24, 68, 8, 3, dark), dot(32, 8, 9, SUN), dot(68, 8, 9, SUN)],
    spikes: [tri(32, 20, 12, 14, dark, -20), tri(50, 15, 12, 14, dark), tri(68, 20, 12, 14, dark, 20)],
    fur: [dot(30, 26, 14, c), dot(42, 20, 14, c), dot(54, 19, 14, c), dot(66, 24, 14, c), dot(22, 40, 12, c), dot(78, 40, 12, c)],
    none: [],
  };
  return [
    part('top', tops[top]),
    ...(arms ? [part('arm1', [oval(14, 60, 12, 24, dark, 30)]), part('arm2', [oval(86, 60, 12, 24, dark, -30)])] : []),
    oval(34, 92, 18, 10, dark),
    oval(66, 92, 18, 10, dark),
    box(16, 22, 68, 70, c, [34, 34, 20, 20]),
    oval(50, 74, 40, 24, dark),
    ...face,
    ...front,
  ];
}

// A robot, for the Robots set: a head with a screen, its moods' eyes and mouth (ROBOT) drawn on the
// screen in light, an antenna, and a body with arms below; `screen` is all the screen shows in
// place of a face when it is given.
const ROBOT_INK = '#7FF0E8';
const ROBOT = { l: 39, r: 61, y: 40, m: 54, k: 0.85, ink: ROBOT_INK };
function robot(face: Shape[], { c = '#C9CED6', dark = '#9AA3AD', arm1 = [] as Shape[], arm2 = [] as Shape[], front = [] as Shape[] } = {}): Shape[] {
  return [
    part('antenna', [bar(50, 16, 50, 6, 3, dark), dot(50, 5, 8, RED)]),
    part('arm1', arm1.length ? arm1 : [bar(28, 78, 14, 90, 6, dark), dot(13, 91, 9, c)]),
    part('arm2', arm2.length ? arm2 : [bar(72, 78, 86, 90, 6, dark), dot(87, 91, 9, c)]),
    box(32, 70, 36, 26, c, 6, { edge: { w: 2.5, c: dark } }),
    dot(42, 80, 6, RED),
    dot(50, 80, 6, SUN),
    dot(58, 80, 6, GREEN),
    box(12, 30, 8, 18, dark, 3),
    box(80, 30, 8, 18, dark, 3),
    box(18, 16, 64, 52, c, 14, { edge: { w: 2.5, c: dark } }),
    box(24, 22, 52, 40, NIGHT, 10),
    ...face,
    ...front,
  ];
}

// A little dinosaur, for the Dinosaurs set, seen from the front: its head with spikes along its top,
// its belly and short arms, its moods' eyes and mouth (DINO) in `face`.
const DINO = { l: 38, r: 62, y: 38, m: 54 };
function dino(face: Shape[], { c = '#6CC24A', dark = '#4E9E33', belly = '#D8F3C8', arm2 = [] as Shape[], front = [] as Shape[] } = {}): Shape[] {
  return [
    part('spikes', [tri(30, 14, 12, 14, SUN, -30), tri(42, 8, 12, 14, SUN, -10), tri(58, 8, 12, 14, SUN, 10), tri(70, 14, 12, 14, SUN, 30)]),
    oval(30, 92, 20, 12, dark),
    oval(70, 92, 20, 12, dark),
    tri(86, 82, 20, 18, c, 60),
    box(22, 50, 56, 44, c, [20, 20, 22, 22]),
    oval(50, 76, 34, 30, belly),
    box(20, 12, 60, 54, c, [30, 30, 24, 24]),
    dot(32, 22, 5, dark),
    dot(66, 20, 4, dark),
    part('arm1', [oval(24, 66, 10, 16, dark, 40)]),
    part('arm2', arm2.length ? arm2 : [oval(76, 66, 10, 16, dark, -40)]),
    dot(44, 48, 3, dark),
    dot(56, 48, 3, dark),
    ...cheeksAt(29, 71, 48, 8),
    ...face,
    ...front,
  ];
}

// Tux, the penguin of Linux, as Larry Ewing drew him: one black pear of a body (a grey edge so
// it reads on a dark look), a cream belly and two white eye patches that touch, a broad orange
// beak (where his moods put their mouth) and big orange feet. His flippers are parts.
// Tux as the Linux penguin is drawn (lib/sticker-tux.ts), a little below the top for a hat or stars:
// his flippers are parts, and a mood's eyes and mouth take the place of his pupils and beak line
// (`plain` keeps his own, as he is drawn).
const TUX = { l: 43.1, r: 54.2, y: 25.4, m: 33.5, k: 0.6 };
const TUX_BEAK = '#F5A623';
const tuxLayer = (xml: string): Shape => ({ s: 'svg', x: 50 - (94 * TUX_BOX.w) / TUX_BOX.h / 2, y: 6, w: (94 * TUX_BOX.w) / TUX_BOX.h, h: 94, xml });
function tux(face: Shape[], { wave = false, plain = false, front = [] as Shape[] } = {}): Shape[] {
  const wing2 = (xml: string) => part('arm2', wave ? [tilt(-40, [70, 43], [tuxLayer(xml)])] : [tuxLayer(xml)]);
  return [
    tuxLayer(TUX_BODY),
    wing2(TUX_WING2),
    tuxLayer(TUX_FRONT),
    part('arm1', [tuxLayer(TUX_WING1)]),
    tuxLayer(TUX_BELLY),
    wing2(TUX_WING2_LOW),
    tuxLayer(TUX_FOOT2),
    wing2(TUX_WING2_TIP),
    ...(plain ? [tuxLayer(TUX_EYES)] : []),
    tuxLayer(TUX_BEAK_SHAPE),
    ...(plain ? [tuxLayer(TUX_BEAK_LINE)] : []),
    ...face,
    ...front,
  ];
}

// An aikidoka (lib/sticker-aikido.ts): a wide pleated hakama, standing or sitting in seiza, and above it
// the keikogi, the arms and the head, the upper body a part (to bow). Each arm is a part turned at its
// shoulder by `arm1` and `arm2`, in degrees (0 hangs straight down, more turns it the way a clock goes).
const AIKI = { l: 42, r: 58, y: 28, m: 38, k: 0.75 };
const aikiLayer = (xml: string): Shape => ({ s: 'svg', x: 0, y: 0, w: 100, h: 100, xml });
const AIKI_ARMS = [aikiArm(0), aikiArm(1)];
function aikidoka(face: Shape[], { arm1 = 10, arm2 = -10, hair = '#3B2A1A', seated = false, front = [] as Shape[] } = {}): Shape[] {
  return [
    aikiLayer(seated ? AIKI_HAKAMA_SEATED : AIKI_HAKAMA),
    part('upper', [
      aikiLayer(AIKI_GI),
      part('arm1', [tilt(arm1, AIKI_SHOULDERS[0], [aikiLayer(AIKI_ARMS[0])])]),
      part('arm2', [tilt(arm2, AIKI_SHOULDERS[1], [aikiLayer(AIKI_ARMS[1])])]),
      aikiLayer(aikiHead(hair)),
      ...cheeksAt(36, 64, 35, 7),
      ...face,
    ]),
    ...front,
  ];
}

// Takis (lib/sticker-takis.ts): a caricature in a dark suit. Each arm is a part turned at its shoulder by
// `arm1` and `arm2`, in degrees, as the aikidoka's; `own` keeps his own eyes and sly smile, else a mood's
// face goes on his, with his eyebrows unless `brows` is off (a mood with its own).
const TAKIS = { l: 42.5, r: 57.5, y: 40.5, m: 56.5, k: 0.7 };
const TAKIS_ARMS = [takisArm(0), takisArm(1)];
function takis(face: Shape[], { own = false, brows = true, arm1 = 6, arm2 = -6, front = [] as Shape[] } = {}): Shape[] {
  return [
    aikiLayer(TAKIS_SUIT),
    part('arm1', [tilt(arm1, TAKIS_SHOULDERS[0], [aikiLayer(TAKIS_ARMS[0])])]),
    part('arm2', [tilt(arm2, TAKIS_SHOULDERS[1], [aikiLayer(TAKIS_ARMS[1])])]),
    aikiLayer(TAKIS_HEAD),
    ...(brows ? [aikiLayer(TAKIS_BROWS)] : []),
    aikiLayer(TAKIS_NOSE),
    ...(own ? [aikiLayer(TAKIS_OWN_FACE)] : []),
    ...face,
    ...front,
  ];
}

// A Words sticker: its card, the words on it, and something drawn at a corner of it.
const card = (fill: string, edge: string, ink: string, corner: Shape[]): Shape[] => [
  box(6, 24, 88, 56, fill, 16, { edge: { w: 3, c: edge } }),
  { s: 'words', x: 10, y: 28, w: 80, h: 50, c: ink },
  ...corner,
];
// A little moon at a card's corner, as the moons are.
const littleMoon = (x: number, y: number, face: Shape[]): Shape[] => [dot(x, y, 22, MOON_EDGE), dot(x, y, 19, MOON), ...face];

// A little ghost: its body with a wavy hem, an edge so it reads on a light look, and its arms,
// under what makes its face. Each arm is a part (arm1 its left, arm2 its right) unless left out.
const GHOST = '#F7F5FC';
const GHOST_EDGE = '#C9C1E0';
const HEM = [27.5, 42.5, 57.5, 72.5];
type Arm = (c: string, grow: number) => Shape[];
const arm = (x: number, y: number, turn: number, w = 10, h = 20): Arm => (c, grow) => [oval(x, y, w + grow, h + grow, c, turn)];
const restingArm = (side: 1 | -1): Arm => arm(50 - side * 33, 54, side * 35);
const wavingArm = (): Arm => arm(84, 34, 150);
const raisedArm = (side: 1 | -1): Arm => arm(50 - side * 34, 36, side * -30);
const shyArm = (side: 1 | -1): Arm => arm(50 - side * 21, 54, side * -35);
const holdingArm = (side: 1 | -1): Arm => arm(50 - side * 21, 74, side * 65, 8, 14);
function ghost(face: Shape[], { arm1 = restingArm(1), arm2 = restingArm(-1), held = [], color = GHOST, edge = GHOST_EDGE }: { arm1?: Arm | []; arm2?: Arm | []; held?: Shape[]; color?: string; edge?: string } = {}): Shape[] {
  // Each arm behind the body, as its edge, and over it, so one held before it shows.
  const arms = (which: Arm | [], name: string, front: boolean) =>
    typeof which === 'function' ? [part(name, front ? [...which(edge, 3), ...which(color, 0)] : which(edge, 4))] : [];
  return [
    ...arms(arm1, 'arm1', false),
    ...arms(arm2, 'arm2', false),
    box(18, 10, 64, 76, edge, [32, 32, 5, 5]),
    ...HEM.map((x) => dot(x, 84, 20, edge)),
    box(20, 12, 60, 72, color, [30, 30, 4, 4]),
    ...HEM.map((x) => dot(x, 84, 16, color)),
    ...face,
    ...held,
    ...arms(arm1, 'arm1', true),
    ...arms(arm2, 'arm2', true),
  ];
}
const ghostEyes = (): Shape[] => [oval(40, 40, 8, 11, INK), oval(60, 40, 8, 11, INK), dot(41.5, 37.5, 3, WHITE), dot(61.5, 37.5, 3, WHITE)];
const ghostCheeks = (): Shape[] => cheeksAt(32, 68, 50, 8);

/** A crescent moon opening to the right: discs along a ring of radius r about x, y, `thick` at its middle and pointed at its ends. */
function crescent(x: number, y: number, r: number, thick: number, c: string): Shape[] {
  return Array.from({ length: 61 }, (_, i) => {
    const along = i / 60;
    const turn = ((60 + along * 240) * Math.PI) / 180;
    const d = 3 + (thick - 3) * Math.sin(along * Math.PI);
    return dot(x + (r - d / 2) * Math.cos(turn), y - (r - d / 2) * Math.sin(turn), d, c);
  });
}

// A cloud, its middle at x, y, `k` as large as one of 60 across, with an edge so a white one reads on a light look.
const CLOUD_EDGE = '#C9D2DE';
function cloud(x: number, y: number, k: number, c: string, edge: string): Shape[] {
  const puffs = (grow: number, fill: string) => [
    box(x - 30 * k - grow, y - 4 * k - grow, 60 * k + 2 * grow, 20 * k + 2 * grow, fill, 10 * k + grow),
    dot(x - 14 * k, y - 4 * k, 26 * k + 2 * grow, fill),
    dot(x + 6 * k, y - 10 * k, 32 * k + 2 * grow, fill),
    dot(x + 22 * k, y + 2 * k, 18 * k + 2 * grow, fill),
  ];
  return [...puffs(2, edge), ...puffs(0, c)];
}

export const ART: Record<string, Shape[]> = {
  // Moons.
  'moon-smile': moon([...moonEyes(), ...moonCheeks(), smile()]),
  'moon-laugh': moon([
    arc(36, 44, 16, 4, 'top'),
    arc(64, 44, 16, 4, 'top'),
    ...moonCheeks(),
    box(32, 56, 36, 20, INK, [0, 0, 18, 18], { inside: [box(10, 11, 16, 12, RED, 6)] }),
  ]),
  'moon-love': moon([part('eye1', [heart(35, 40, 18, RED)]), part('eye2', [heart(65, 40, 18, RED)]), smile()]),
  'moon-wink': moon([part('eye1', [dot(36, 40, 9, INK)]), bar(58, 41, 70, 41, 4, INK), ...moonCheeks(), smile()]),
  'moon-wow': moon([
    dot(36, 40, 13, INK),
    dot(64, 40, 13, INK),
    dot(38, 38, 4, WHITE),
    dot(66, 38, 4, WHITE),
    box(41, 58, 18, 20, 'transparent', 10, { edge: { w: 5, c: INK } }),
  ]),
  'moon-sad': moon([...moonEyes(), arc(50, 80, 34, 5, 'top'), part('tear', [box(61, 48, 9, 9, TEAR, [0, 4.5, 4.5, 4.5], { turn: 45 })])]),
  'moon-angry': moon([...moonEyes(), bar(26, 28, 42, 34, 5, INK), bar(74, 28, 58, 34, 5, INK), arc(50, 78, 30, 5, 'top')], '#F5B556'),
  'moon-sleep': [
    part('face', moon([bar(30, 42, 42, 42, 4, INK), bar(58, 42, 70, 42, 4, INK), ...moonCheeks(), dot(50, 64, 8, INK)])),
    part('z', [
      bar(74, 6, 84, 6, 3, BLUE),
      bar(84, 6, 74, 16, 3, BLUE),
      bar(74, 16, 84, 16, 3, BLUE),
      bar(88, 20, 95, 20, 2.5, BLUE),
      bar(95, 20, 88, 27, 2.5, BLUE),
      bar(88, 27, 95, 27, 2.5, BLUE),
    ]),
  ],
  heart: [heart(50, 46, 60, RED), dot(34, 36, 9, '#F27D80')],
  sun: [part('rays', rays(50, 50, 34, 46, 8, 8, SUN)), part('face', [dot(50, 50, 56, SUN), dot(42, 46, 6, INK), dot(58, 46, 6, INK), arc(50, 52, 22, 3.5, 'bottom')])],
  coffee: [
    part('steam', [bar(34, 14, 36, 28, 4, STEAM), bar(62, 14, 64, 28, 4, STEAM)]),
    part('steam2', [bar(48, 8, 50, 26, 4, STEAM)]),
    box(62, 46, 24, 24, 'transparent', 12, { edge: { w: 6, c: BROWN } }),
    box(18, 36, 56, 46, WHITE, [4, 4, 22, 22], { edge: { w: 4, c: BROWN } }),
    box(24, 41, 44, 7, BROWN, 3.5),
    heart(46, 62, 14, RED),
    box(8, 84, 76, 8, BROWN, 4),
  ],
  check: [dot(50, 50, 86, GREEN), bar(30, 52, 44, 66, 9, WHITE), bar(44, 66, 72, 36, 9, WHITE)],

  // Ghosts.
  'ghost-hello': ghost([...ghostEyes(), ...ghostCheeks(), arc(50, 46, 16, 3.5, 'bottom')], { arm2: wavingArm() }),
  'ghost-boo': ghost(
    [oval(40, 38, 10, 14, INK), oval(60, 38, 10, 14, INK), dot(41.5, 35, 3.5, WHITE), dot(61.5, 35, 3.5, WHITE), box(40, 50, 20, 22, INK, 10, { inside: [box(5, 12, 10, 10, RED, 5)] })],
    { arm1: raisedArm(1), arm2: raisedArm(-1) },
  ),
  'ghost-laugh': ghost([
    arc(40, 42, 13, 3.5, 'top'),
    arc(60, 42, 13, 3.5, 'top'),
    ...ghostCheeks(),
    box(37, 48, 26, 16, INK, [0, 0, 13, 13], { inside: [box(7, 8, 12, 10, RED, 5)] }),
    part('tears', [oval(26, 42, 5, 8, TEAR, 30), oval(74, 42, 5, 8, TEAR, -30)]),
  ]),
  'ghost-love': ghost([part('eye1', [heart(40, 40, 14, RED)]), part('eye2', [heart(60, 40, 14, RED)]), ...ghostCheeks(), arc(50, 46, 16, 3.5, 'bottom'), part('float', [heart(80, 14, 14, '#FF7EB6')])]),
  'ghost-wink': ghost([part('eye1', [oval(40, 40, 8, 11, INK), dot(41.5, 37.5, 3, WHITE)]), bar(55, 41, 65, 41, 3.5, INK), ...ghostCheeks(), arc(50, 46, 16, 3.5, 'bottom'), oval(53, 55.5, 7, 6, PINK_DARK)]),
  'ghost-wow': ghost([dot(40, 38, 12, INK), dot(60, 38, 12, INK), dot(42, 36, 4, WHITE), dot(62, 36, 4, WHITE), box(44, 50, 12, 14, 'transparent', 7, { edge: { w: 3.5, c: INK } })], { arm1: raisedArm(1), arm2: raisedArm(-1) }),
  'ghost-sad': ghost([
    ...ghostEyes(),
    arc(50, 60, 16, 3.5, 'top'),
    bar(33, 31, 40, 29, 3, INK),
    bar(67, 31, 60, 29, 3, INK),
    part('tear1', [box(36, 46, 7, 7, TEAR, [0, 3.5, 3.5, 3.5], { turn: 45 })]),
    part('tear2', [box(57, 46, 7, 7, TEAR, [0, 3.5, 3.5, 3.5], { turn: 45 })]),
  ]),
  'ghost-angry': ghost(
    [...ghostEyes(), bar(32, 30, 43, 35, 4, INK), bar(68, 30, 57, 35, 4, INK), arc(50, 60, 18, 3.5, 'top'), part('puff', [dot(18, 16, 9, STEAM), dot(25, 9, 7, STEAM), dot(82, 16, 9, STEAM), dot(75, 9, 7, STEAM)])],
    { color: '#FAD9D4', edge: '#E3A79F' },
  ),
  'ghost-sleep': [
    part('body', ghost([bar(35, 42, 44, 42, 3.5, INK), bar(56, 42, 65, 42, 3.5, INK), ...ghostCheeks(), oval(50, 52, 6, 7, INK)], { arm1: [], arm2: [] })),
    part('z', [bar(74, 2, 83, 2, 3, BLUE), bar(83, 2, 74, 11, 3, BLUE), bar(74, 11, 83, 11, 3, BLUE), bar(87, 14, 93, 14, 2.5, BLUE), bar(93, 14, 87, 20, 2.5, BLUE), bar(87, 20, 93, 20, 2.5, BLUE)]),
  ],
  'ghost-shy': ghost([arc(40, 44, 11, 3, 'top'), arc(60, 44, 11, 3, 'top'), part('blush', [oval(31, 50, 12, 8, CHEEK), oval(69, 50, 12, 8, CHEEK)]), dot(50, 53, 5, INK)], { arm1: shyArm(1), arm2: shyArm(-1) }),
  'ghost-cool': ghost([
    box(29, 34, 19, 12, INK, [3, 3, 9, 9]),
    box(52, 34, 19, 12, INK, [3, 3, 9, 9]),
    bar(46, 37, 54, 37, 3, INK),
    bar(24, 36, 30, 37, 2.5, INK),
    bar(70, 37, 76, 36, 2.5, INK),
    part('glint', [bar(33, 37, 37, 37, 2, WHITE), bar(56, 37, 60, 37, 2, WHITE)]),
    arc(54, 48, 14, 3.5, 'bottom'),
  ]),
  'ghost-heart': ghost([...ghostEyes(), ...ghostCheeks(), arc(50, 44, 14, 3.5, 'bottom')], {
    held: [part('heart', [heart(50, 64, 30, RED), dot(43, 58, 5, '#F27D80')])],
    arm1: holdingArm(1),
    arm2: holdingArm(-1),
  }),
  'ghost-coffee': ghost([...ghostEyes(), ...ghostCheeks(), arc(50, 44, 14, 3.5, 'bottom')], {
    held: [
      part('steam', [bar(43, 52, 44, 57, 2.5, STEAM), bar(53, 52, 54, 57, 2.5, STEAM)]),
      box(57, 66, 11, 11, 'transparent', 5.5, { edge: { w: 3, c: BROWN } }),
      box(35, 60, 26, 22, WHITE, [2, 2, 10, 10], { edge: { w: 2.5, c: BROWN } }),
      box(38, 63, 20, 4, BROWN, 2),
      heart(48, 73, 8, RED),
    ],
    arm1: holdingArm(1),
    arm2: holdingArm(-1),
  }),
  'ghost-party': [
    part('confetti', [dot(14, 22, 5, SUN), dot(86, 28, 5, PINK), bar(10, 40, 14, 36, 2.5, BLUE), bar(88, 46, 92, 49, 2.5, '#7CC36E'), dot(82, 10, 4, SKY), bar(18, 8, 22, 11, 2.5, RED)]),
    ...ghost([arc(40, 44, 11, 3, 'top'), arc(60, 44, 11, 3, 'top'), ...ghostCheeks(), box(41, 48, 18, 12, INK, [0, 0, 9, 9], { inside: [box(4, 5, 10, 8, RED, 4)] })], { arm1: raisedArm(1), arm2: raisedArm(-1) }),
    part('hat', [tri(50, 9, 24, 24, PURPLE), bar(45, 12, 55, 10, 2.5, SUN), bar(42, 18, 58, 16, 2.5, SUN), dot(50, -3, 8, SUN)]),
  ],
  'ghost-peek': [
    box(0, 0, 100, 62, 'transparent', 0, { inside: [part('body', ghost([...ghostEyes(), ...ghostCheeks(), dot(50, 47, 5, INK)], { arm1: [], arm2: [] }))] }),
    box(4, 58, 92, 38, '#7A5C9E', 8, { edge: { w: 3, c: '#5E4580' } }),
    box(12, 66, 30, 4, '#9277B5', 2),
    oval(32, 58, 14, 10, GHOST),
    oval(68, 58, 14, 10, GHOST),
    arc(32, 61, 10, 1.5, 'top', GHOST_EDGE),
    arc(68, 61, 10, 1.5, 'top', GHOST_EDGE),
  ],
  'ghost-ok': [
    ...ghost([arc(40, 42, 12, 3.5, 'top'), arc(60, 42, 12, 3.5, 'top'), ...ghostCheeks(), arc(50, 44, 16, 3.5, 'bottom')]),
    part('badge', [dot(80, 70, 30, WHITE), dot(80, 70, 26, GREEN), bar(72, 70, 78, 76, 4.5, WHITE), bar(78, 76, 88, 64, 4.5, WHITE)]),
  ],

  // Animals.
  cat: [
    part('ear1', [tri(30, 27, 26, 32, '#F2A65A', -18), tri(30, 30, 13, 17, PINK, -18)]),
    part('ear2', [tri(70, 27, 26, 32, '#F2A65A', 18), tri(70, 30, 13, 17, PINK, 18)]),
    oval(50, 58, 78, 66, '#F2A65A'),
    bar(44, 28, 45, 35, 3.5, '#D9823B'),
    bar(50, 26, 50, 35, 3.5, '#D9823B'),
    bar(56, 28, 55, 35, 3.5, '#D9823B'),
    ...cheeksAt(28, 72, 66, 10, PINK),
    oval(37, 54, 8, 11, INK),
    oval(63, 54, 8, 11, INK),
    dot(38.5, 51.5, 3, WHITE),
    dot(64.5, 51.5, 3, WHITE),
    tri(50, 63, 9, 6, PINK_DARK, 180),
    arc(45.5, 65, 9, 2.5, 'bottom'),
    arc(54.5, 65, 9, 2.5, 'bottom'),
    bar(17, 60, 31, 63, 2, INK),
    bar(17, 70, 31, 68, 2, INK),
    bar(69, 63, 83, 60, 2, INK),
    bar(69, 68, 83, 70, 2, INK),
  ],
  dog: [
    dot(50, 54, 72, '#D9A066'),
    oval(63, 45, 18, 16, '#8A5A3C'),
    part('ear1', [oval(20, 50, 22, 44, '#8A5A3C', 18)]),
    part('ear2', [oval(80, 50, 22, 44, '#8A5A3C', -18)]),
    oval(50, 68, 36, 26, '#FFF1DC'),
    box(46, 70, 8, 10, PINK_DARK, [0, 0, 4, 4]),
    ...muzzleMouth(68),
    oval(50, 61, 14, 10, INK),
    ...eyes(38, 62, 46),
  ],
  owl: [
    tri(28, 20, 16, 20, '#8B6B4A', -25),
    tri(72, 20, 16, 20, '#8B6B4A', 25),
    oval(50, 58, 74, 80, '#8B6B4A'),
    oval(16, 64, 14, 36, '#6E5236', 10),
    oval(84, 64, 14, 36, '#6E5236', -10),
    oval(50, 72, 46, 42, '#E9D6B9'),
    arc(43, 68, 9, 2, 'bottom', '#B89A74'),
    arc(57, 68, 9, 2, 'bottom', '#B89A74'),
    arc(50, 77, 9, 2, 'bottom', '#B89A74'),
    ring(36, 42, 28, 3, '#E9D6B9'),
    ring(64, 42, 28, 3, '#E9D6B9'),
    part('eyes', [dot(36, 42, 23, WHITE), dot(64, 42, 23, WHITE), dot(37, 43, 12, INK), dot(63, 43, 12, INK), dot(39, 40, 4, WHITE), dot(65, 40, 4, WHITE)]),
    tri(50, 56, 10, 10, ORANGE, 180),
    oval(40, 97, 10, 5, ORANGE),
    oval(60, 97, 10, 5, ORANGE),
  ],
  fox: [
    part('ears', [tri(28, 25, 26, 32, '#EE7B30', -20), tri(28, 28, 12, 16, '#5A3A2A', -20), tri(72, 25, 26, 32, '#EE7B30', 20), tri(72, 28, 12, 16, '#5A3A2A', 20)]),
    oval(50, 58, 78, 62, '#EE7B30'),
    oval(33, 72, 34, 26, WHITE, -10),
    oval(67, 72, 34, 26, WHITE, 10),
    oval(36, 55, 7, 10, INK),
    oval(64, 55, 7, 10, INK),
    dot(37, 52.5, 2.5, WHITE),
    dot(65, 52.5, 2.5, WHITE),
    dot(50, 72, 9, INK),
    arc(50, 73, 10, 2.5, 'bottom'),
  ],
  penguin: [
    part('wing1', [oval(17, 62, 19, 41, '#7D8BA0', 22), oval(17, 62, 14, 36, '#2F3640', 22)]),
    part('wing2', [oval(83, 62, 19, 41, '#7D8BA0', -22), oval(83, 62, 14, 36, '#2F3640', -22)]),
    oval(50, 56, 73, 89, '#7D8BA0'),
    oval(50, 56, 68, 84, '#2F3640'),
    oval(50, 62, 50, 66, WHITE),
    ...cheeksAt(34, 66, 55, 7),
    ...eyes(40, 60, 44, 7),
    oval(50, 52, 14, 8, SUN),
    oval(40, 97, 14, 6, SUN),
    oval(60, 97, 14, 6, SUN),
  ],
  turtle: [
    oval(30, 78, 16, 14, '#9ACD6E'),
    oval(66, 78, 16, 14, '#9ACD6E'),
    tri(12, 66, 8, 10, '#9ACD6E', -90),
    part('head', [bar(70, 62, 80, 56, 12, '#9ACD6E'), dot(82, 52, 26, '#9ACD6E'), dot(87, 48, 5, INK), dot(88, 47, 1.8, WHITE), arc(85, 53, 10, 2, 'bottom')]),
    box(16, 40, 64, 40, '#5E9E4E', [32, 32, 6, 6]),
    dot(48, 58, 14, '#447A39'),
    dot(31, 66, 10, '#447A39'),
    dot(65, 66, 10, '#447A39'),
    dot(36, 48, 8, '#447A39'),
    dot(60, 48, 8, '#447A39'),
    box(14, 74, 68, 8, '#447A39', 4),
  ],
  rabbit: [
    part('ear1', [box(30, 5, 16, 42, '#F4F1EE', 8, { turn: -8, edge: { w: 2, c: '#D3CBC2' } }), box(34, 10, 8, 30, PINK, 4, { turn: -8 })]),
    part('ear2', [box(54, 5, 16, 42, '#F4F1EE', 8, { turn: 8, edge: { w: 2, c: '#D3CBC2' } }), box(58, 10, 8, 30, PINK, 4, { turn: 8 })]),
    box(18, 30, 64, 64, '#F4F1EE', 32, { edge: { w: 2.5, c: '#D3CBC2' } }),
    ...cheeksAt(30, 70, 70, 9, PINK),
    ...eyes(39, 61, 58),
    box(47, 75, 6, 6, WHITE, 1, { edge: { w: 1, c: '#D3CBC2' } }),
    ...muzzleMouth(74, 8),
    oval(50, 68, 9, 6, PINK_DARK),
  ],
  bear: [
    dot(26, 28, 24, '#9C6B43'),
    dot(26, 28, 12, '#D9B28A'),
    dot(74, 28, 24, '#9C6B43'),
    dot(74, 28, 12, '#D9B28A'),
    dot(50, 56, 74, '#9C6B43'),
    oval(50, 68, 36, 28, '#D9B28A'),
    ...muzzleMouth(70),
    oval(50, 62, 14, 9, INK),
    ...eyes(37, 63, 48),
    part('paw', [oval(84, 72, 20, 24, '#9C6B43', -12), oval(84.5, 75, 10, 9, '#D9B28A'), dot(79, 66, 4.5, '#D9B28A'), dot(84.5, 64, 4.5, '#D9B28A'), dot(90, 66, 4.5, '#D9B28A')]),
  ],
  panda: [
    dot(26, 26, 26, '#C9CED6'),
    dot(74, 26, 26, '#C9CED6'),
    dot(26, 26, 22, '#2B2B33'),
    dot(74, 26, 22, '#2B2B33'),
    box(13, 19, 74, 74, WHITE, 37, { edge: { w: 2.5, c: '#C9CED6' } }),
    oval(36, 52, 18, 24, '#2B2B33', 35),
    oval(64, 52, 18, 24, '#2B2B33', -35),
    part('eyes', [dot(37, 51, 7.5, WHITE), dot(63, 51, 7.5, WHITE), dot(37.5, 51.5, 4, INK), dot(62.5, 51.5, 4, INK)]),
    ...cheeksAt(27, 73, 68, 8, PINK),
    oval(50, 64, 12, 8, '#2B2B33'),
    arc(46, 66, 8, 2.5, 'bottom', '#2B2B33'),
    arc(54, 66, 8, 2.5, 'bottom', '#2B2B33'),
  ],
  frog: [
    dot(30, 34, 32, '#6CC24A'),
    dot(70, 34, 32, '#6CC24A'),
    oval(50, 62, 86, 62, '#6CC24A'),
    part('eyes', [dot(30, 34, 22, WHITE), dot(70, 34, 22, WHITE), dot(31, 35, 11, INK), dot(69, 35, 11, INK), dot(33, 32, 3.5, WHITE), dot(71, 32, 3.5, WHITE)]),
    dot(46, 56, 3, '#4E9E33'),
    dot(54, 56, 3, '#4E9E33'),
    oval(20, 66, 12, 8, CHEEK),
    oval(80, 66, 12, 8, CHEEK),
    arc(50, 52, 58, 4, 'bottom'),
    dot(70, 82, 6, '#8FD46F'),
    dot(30, 84, 4, '#8FD46F'),
  ],
  chick: [
    oval(40, 96, 12, 6, ORANGE),
    oval(60, 96, 12, 6, ORANGE),
    oval(46, 20, 8, 16, '#FFD84D', -25),
    oval(54, 19, 8, 16, '#FFD84D', 20),
    dot(50, 58, 74, '#FFD84D'),
    part('wing1', [oval(18, 64, 16, 28, '#F5C02E', 25)]),
    part('wing2', [oval(82, 64, 16, 28, '#F5C02E', -25)]),
    ...cheeksAt(30, 70, 62),
    ...eyes(39, 61, 52),
    tri(50, 63, 14, 10, ORANGE, 180),
  ],

  // Celebrations.
  cake: [
    box(8, 86, 84, 7, '#C9CED6', 3.5),
    box(16, 52, 68, 36, PINK, 8),
    box(16, 68, 68, 5, '#F27D93'),
    bar(28, 79, 32, 77, 2.5, BLUE),
    bar(44, 81, 48, 81, 2.5, SUN),
    bar(60, 78, 63, 81, 2.5, GREEN),
    bar(72, 80, 76, 78, 2.5, BLUE),
    box(14, 47.5, 72, 14, '#EBCFD6', 7),
    dot(24, 60.5, 8, '#EBCFD6'),
    dot(40, 62.5, 9, '#EBCFD6'),
    dot(58, 61.5, 8, '#EBCFD6'),
    dot(74, 60.5, 8, '#EBCFD6'),
    box(14, 46, 72, 14, WHITE, 7),
    dot(24, 59, 8, WHITE),
    dot(40, 61, 9, WHITE),
    dot(58, 60, 8, WHITE),
    dot(74, 59, 8, WHITE),
    box(31, 27, 6, 21, SKY, 2),
    box(47, 24, 6, 24, PURPLE, 2),
    box(63, 27, 6, 21, '#7CC36E', 2),
    bar(34, 23, 34, 27, 1.5, INK),
    bar(50, 20, 50, 24, 1.5, INK),
    bar(66, 23, 66, 27, 1.5, INK),
    part('flames', [
      oval(34, 18, 7, 11, SUN),
      oval(34, 19.5, 3.5, 6, '#FFF1A8'),
      oval(50, 15, 7, 11, SUN),
      oval(50, 16.5, 3.5, 6, '#FFF1A8'),
      oval(66, 18, 7, 11, SUN),
      oval(66, 19.5, 3.5, 6, '#FFF1A8'),
    ]),
  ],
  gift: [
    box(16, 46, 68, 44, RED, 5),
    box(22, 52, 5, 32, '#F07A80', 2.5),
    box(44, 46, 12, 44, SUN),
    part('lid', [
      box(11, 34, 78, 16, RED_DARK, 4),
      box(44, 34, 12, 16, GOLD),
      oval(38, 26, 24, 14, SUN, 25),
      oval(62, 26, 24, 14, SUN, -25),
      dot(50, 30, 10, GOLD),
    ]),
  ],
  fireworks: [
    dot(50, 50, 94, NIGHT),
    dot(20, 26, 3, WHITE),
    dot(82, 22, 2.5, WHITE),
    dot(80, 82, 3, WHITE),
    dot(16, 54, 2, WHITE),
    dot(56, 86, 2, WHITE),
    part('burst1', [...rays(40, 38, 7, 20, 8, 3.5, '#FF7EB6'), dot(40, 38, 6, '#FFD1E6')]),
    part('burst2', [...rays(66, 60, 5, 15, 8, 3, SUN, 22.5), dot(66, 60, 5, '#FFF1A8')]),
    part('burst3', [...rays(32, 70, 4, 11, 6, 2.5, SKY), dot(32, 70, 4, WHITE)]),
  ],
  'christmas-tree': [
    box(44, 80, 12, 14, BROWN, 2),
    tri(50, 32, 44, 32, '#2F9E5A'),
    tri(50, 50, 62, 36, '#2F9E5A'),
    tri(50, 68, 78, 36, '#2F9E5A'),
    bar(40, 42, 60, 38, 2, GOLD),
    bar(32, 62, 68, 56, 2, GOLD),
    part('lights', [
      dot(44, 36, 6, RED),
      dot(57, 45, 6, SUN),
      dot(38, 57, 6, SKY),
      dot(62, 61, 6, RED),
      dot(50, 52, 5, PINK),
      dot(30, 77, 6, SUN),
      dot(50, 72, 6, RED),
      dot(69, 78, 6, SKY),
      dot(42, 68, 5, PINK),
    ]),
    part('star', star(50, 13, 20, SUN)),
  ],
  'easter-egg': [oval(50, 52, 62, 82, '#D6303A'), oval(36, 33, 10, 20, '#F07A80', 25), dot(31, 49, 5, '#F07A80'), oval(64, 80, 14, 5, '#B8222C', -20)],
  'party-popper': [
    part('confetti', [
      dot(64, 24, 6, SUN),
      dot(80, 34, 5, PINK),
      dot(72, 13, 5, BLUE),
      dot(89, 18, 4, '#7CC36E'),
      bar(57, 32, 61, 26, 3, RED),
      bar(76, 46, 82, 44, 3, BLUE),
      bar(84, 27, 90, 30, 3, SUN),
      bar(68, 40, 70, 34, 3, '#7CC36E'),
      arc(72, 26, 16, 2.5, 'top', PINK),
    ]),
    part('popper', [tri(36, 64, 34, 56, PURPLE, -135), bar(34.3, 54.3, 45.7, 65.7, 4, SUN), bar(41.8, 41.8, 58.2, 58.2, 4, SUN)]),
  ],
  hearts: [part('heart1', [heart(42, 54, 52, RED), dot(30, 44, 7, '#F27D80')]), part('heart2', [heart(73, 28, 28, '#FF7EB6')])],
  balloons: [
    bar(32, 56, 50, 92, 1.5, STRING),
    bar(68, 54, 50, 92, 1.5, STRING),
    bar(50, 46, 50, 92, 1.5, STRING),
    oval(32, 36, 30, 38, RED),
    tri(32, 57, 6, 5, RED),
    oval(25, 28, 5, 10, '#F59A9D', 20),
    oval(68, 34, 30, 38, BLUE),
    tri(68, 55, 6, 5, BLUE),
    oval(61, 26, 5, 10, '#9DBAF5', 20),
    oval(50, 26, 30, 38, SUN),
    tri(50, 47, 6, 5, SUN),
    oval(43, 18, 5, 10, '#FFE29A', 20),
    dot(50, 92, 5, STRING),
  ],
  cheers: [
    part('glass1', [
      tilt(10, [32, 88], [
        box(23, 18, 18, 44, GLASS, [3, 3, 9, 9], { edge: { w: 2, c: GLASS_EDGE } }),
        box(25, 30, 14, 30, '#F7D774', [0, 0, 7, 7]),
        bar(32, 62, 32, 84, 3, GLASS_EDGE),
        box(22, 84, 20, 5, GLASS_EDGE, 2.5),
      ]),
    ]),
    part('glass2', [
      tilt(-10, [68, 88], [
        box(59, 18, 18, 44, GLASS, [3, 3, 9, 9], { edge: { w: 2, c: GLASS_EDGE } }),
        box(61, 30, 14, 30, '#F7D774', [0, 0, 7, 7]),
        bar(68, 62, 68, 84, 3, GLASS_EDGE),
        box(58, 84, 20, 5, GLASS_EDGE, 2.5),
      ]),
    ]),
    part('bubbles', [dot(50, 11, 4, SUN), dot(43, 5, 3, SUN), dot(57, 6, 3, SUN)]),
  ],

  // Words: each in the app's language, on a card.
  'good-morning': card('#FFE08A', '#E9B949', INK, [...rays(17, 23, 9, 14, 8, 3.5, '#F7A021'), dot(17, 23, 15, SUN)]),
  'good-night': card(NIGHT, '#1D2747', WHITE, [
    ...littleMoon(83, 23, [bar(77.5, 22, 81, 22, 2, INK), bar(85, 22, 88.5, 22, 2, INK)]),
    dot(16, 36, 2.5, WHITE),
    dot(22, 72, 2, WHITE),
    dot(86, 70, 2.5, WHITE),
  ]),
  'thank-you': card('#FBD3DC', '#EFA3B5', INK, [
    ...Array.from({ length: 5 }, (_, i) => dot(84 + 6.5 * Math.cos(((i * 72 - 90) * Math.PI) / 180), 23 + 6.5 * Math.sin(((i * 72 - 90) * Math.PI) / 180), 10, '#FF8FB1')),
    dot(84, 23, 7, SUN),
  ]),
  'on-my-way': card('#BFE3F7', '#7DBBE0', INK, [dot(84, 24, 22, BLUE), bar(77, 24, 87, 24, 3, WHITE), tri(89, 24, 8, 7, WHITE, 90)]),
  'well-done': card('#C9F0D8', '#82CFA0', INK, [...star(84, 23, 24, GOLD), ...star(84, 23.5, 15, SUN)]),
  'many-happy-returns': card('#E7D4FA', '#B993EA', INK, [bar(84, 30, 80, 40, 1.2, STRING), oval(84, 18, 16, 20, RED), tri(84, 29.5, 5, 4, RED), oval(80.5, 13, 3, 6, '#F59A9D', 20)]),
  sorry: card('#D7DDE5', '#A8B3C2', INK, [...littleMoon(17, 24, [dot(13, 23, 3, INK), dot(21, 23, 3, INK), arc(17, 32, 10, 2, 'top')]), box(20, 26, 4, 4, TEAR, [0, 2, 2, 2], { turn: 45 })]),
  'see-you': card('#FFD3B0', '#F2A66B', INK, [...littleMoon(84, 24, [dot(80, 22, 3, INK), bar(86, 22, 89.5, 22, 2, INK), arc(84, 23, 10, 2, 'bottom')])]),
  'love-you': card('#F2545B', RED_DARK, WHITE, [heart(84, 23, 22, '#FF8FB1')]),

  // Treats.
  frappe: [
    bar(58, 4, 53, 40, 5, '#3FB27F'),
    box(28, 26, 44, 66, GLASS, [4, 4, 12, 12], { edge: { w: 2.5, c: GLASS_EDGE } }),
    box(31, 40, 38, 49, '#B98552', [0, 0, 9, 9]),
    box(37, 52, 10, 10, '#D9B48C', 2, { turn: 15 }),
    box(52, 64, 10, 10, '#D9B48C', 2, { turn: -12 }),
    box(31, 29, 38, 13, '#F6E7CF', [2, 2, 0, 0]),
    dot(36, 28, 8, '#F6E7CF'),
    dot(46, 27, 9, '#F6E7CF'),
    dot(56, 28, 8, '#F6E7CF'),
    dot(64, 29, 7, '#F6E7CF'),
  ],
  souvlaki: [
    bar(12, 88, 88, 12, 4, '#C9A26B'),
    box(19, 63, 18, 18, '#9C5A32', 5, { turn: 45 }),
    box(32.5, 54.5, 13, 13, '#4FA34A', 3, { turn: 45 }),
    box(41, 41, 18, 18, '#9C5A32', 5, { turn: 45 }),
    box(54.5, 32.5, 13, 13, RED, 4, { turn: 45 }),
    box(63, 19, 18, 18, '#9C5A32', 5, { turn: 45 }),
    bar(24, 70, 30, 76, 2.5, '#6B3A1F'),
    bar(46, 48, 52, 54, 2.5, '#6B3A1F'),
    bar(68, 26, 74, 32, 2.5, '#6B3A1F'),
  ],
  pizza: [
    tri(50, 54, 72, 74, '#F6C453', 180),
    box(12, 10, 76, 14, '#D08C47', 7),
    dot(40, 32, 12, '#D9443F'),
    dot(60, 35, 11, '#D9443F'),
    dot(50, 50, 11, '#D9443F'),
    dot(46, 66, 8, '#D9443F'),
    oval(56, 58, 8, 4, '#4FA34A', 30),
    oval(36, 44, 7, 4, '#4FA34A', -30),
    ring(62, 48, 6, 2, INK),
  ],
  beer: [
    ring(72, 58, 28, 7, '#E0A12A'),
    box(18, 30, 50, 62, '#F2B134', 6, { edge: { w: 2.5, c: '#D9952A' } }),
    box(26, 42, 6, 42, '#F8D27A', 3),
    box(36, 42, 3, 42, '#F8D27A', 1.5),
    dot(48, 62, 3, '#FBE3A5'),
    dot(55, 74, 2.5, '#FBE3A5'),
    dot(46, 82, 2, '#FBE3A5'),
    box(15, 26, 56, 14, '#E8DDC4', 7),
    dot(22, 26, 14, '#E8DDC4'),
    dot(34, 22, 16, '#E8DDC4'),
    dot(48, 23, 14, '#E8DDC4'),
    dot(60, 24, 14, '#E8DDC4'),
    box(15, 24, 56, 13, WHITE, 6.5),
    dot(22, 24, 13, WHITE),
    dot(34, 20, 15, WHITE),
    dot(48, 21, 13, WHITE),
    dot(60, 22, 13, WHITE),
  ],
  'ice-cream': [
    tri(50, 72, 40, 48, '#E2A65E', 180),
    bar(40, 56, 52, 82, 1.5, '#C98A42'),
    bar(52, 54, 59, 70, 1.5, '#C98A42'),
    bar(60, 56, 48, 82, 1.5, '#C98A42'),
    bar(48, 54, 41, 70, 1.5, '#C98A42'),
    dot(50, 46, 40, PINK),
    dot(36, 58, 11, PINK),
    dot(48, 60, 11, PINK),
    dot(62, 58, 11, PINK),
    dot(50, 27, 32, '#8B5A3C'),
    bar(44, 22, 47, 20, 2, SUN),
    bar(54, 30, 57, 31, 2, WHITE),
    bar(48, 34, 50, 36, 2, SKY),
    bar(58, 20, 60, 23, 2, PINK),
    bar(56, 9, 62, 2, 1.5, '#4E7A2E'),
    dot(56, 11, 10, RED),
    dot(54.5, 9.5, 3, '#F59A9D'),
  ],
  watermelon: [
    box(6, 30, 88, 44, '#3E8E41', [0, 0, 44, 44]),
    box(10, 30, 80, 40, '#E9F5D0', [0, 0, 40, 40]),
    box(13, 30, 74, 37, '#F25C5C', [0, 0, 37, 37]),
    oval(34, 40, 4, 6, INK, -20),
    oval(50, 46, 4, 6, INK),
    oval(66, 40, 4, 6, INK, 20),
    oval(42, 54, 4, 6, INK, -10),
    oval(58, 54, 4, 6, INK, 10),
  ],
  doughnut: [
    ring(50, 52, 80, 28, '#D9A066'),
    ring(50, 50, 74, 23, '#F48FB1'),
    arc(50, 50, 62, 3, 'top', '#F9C1D6'),
    ...[0, 36, 72, 108, 144, 180, 216, 252, 288, 324].map((at, i) => {
      const turn = (at * Math.PI) / 180;
      const [x, y] = [50 + 26 * Math.cos(turn), 50 + 26 * Math.sin(turn)];
      const along = turn + (i % 2 ? 0.9 : -0.6);
      return bar(x - 2.2 * Math.cos(along), y - 2.2 * Math.sin(along), x + 2.2 * Math.cos(along), y + 2.2 * Math.sin(along), 2.4, [SUN, WHITE, SKY, '#7CC36E', PURPLE][i % 5]);
    }),
  ],

  // Sea.
  fish: [
    part('bubbles', [ring(14, 34, 8, 2, SKY), ring(9, 20, 6, 1.5, SKY), ring(17, 10, 5, 1.5, SKY)]),
    part('tail', [tri(84, 52, 30, 24, '#F26B1D', -90)]),
    tri(48, 30, 22, 14, '#F26B1D', -10),
    oval(46, 52, 62, 42, '#FF8C42'),
    box(46, 33, 7, 38, '#FFD2A8', 3.5, { turn: 8 }),
    box(58, 35, 6, 34, '#FFD2A8', 3, { turn: 8 }),
    tri(46, 70, 14, 12, '#F26B1D', 160),
    dot(30, 47, 13, WHITE),
    dot(29, 47.5, 7, INK),
    dot(30.5, 46, 2.5, WHITE),
    arc(23, 56, 9, 2.5, 'bottom'),
  ],
  octopus: [
    part('legs', [
      ...[[24, 30], [37, 12], [50, 0], [63, -12], [76, -30]].map(([x, turn]) => oval(x, 74, 12, 34, '#9C63C9', turn)),
      ...[[18, 88], [33, 91], [50, 92], [67, 91], [82, 88]].map(([x, y]) => dot(x, y, 6, '#C9A3E6')),
    ]),
    box(22, 10, 56, 60, '#B57EDC', [28, 28, 22, 22]),
    dot(34, 22, 7, '#C9A3E6'),
    dot(68, 30, 5, '#C9A3E6'),
    dot(64, 18, 4, '#C9A3E6'),
    ...eyes(40, 60, 42, 9),
    ...cheeksAt(31, 69, 52, 8, PINK),
    arc(50, 50, 12, 3, 'bottom'),
  ],
  crab: [
    ...[0, 1, 2].flatMap((i) => [bar(30, 62 + i * 6, 14, 70 + i * 8, 3.5, RED_DARK), bar(70, 62 + i * 6, 86, 70 + i * 8, 3.5, RED_DARK)]),
    part('claw1', [bar(30, 56, 20, 40, 5, RED_DARK), oval(13, 30, 11, 20, RED, -25), oval(24, 28, 10, 18, RED, 25)]),
    part('claw2', [bar(70, 56, 80, 40, 5, RED_DARK), oval(87, 30, 11, 20, RED, 25), oval(76, 28, 10, 18, RED, -25)]),
    bar(42, 50, 40, 36, 3, RED_DARK),
    bar(58, 50, 60, 36, 3, RED_DARK),
    oval(50, 62, 58, 38, RED),
    oval(44, 54, 14, 6, '#F07A80', -10),
    part('eyes', [dot(40, 34, 12, WHITE), dot(60, 34, 12, WHITE), dot(41, 35, 6, INK), dot(61, 35, 6, INK)]),
    ...cheeksAt(34, 66, 66, 7, '#F7A8B8'),
    arc(50, 62, 14, 3, 'bottom'),
  ],
  dolphin: [
    arc(50, 106, 76, 5, 'top', SKY),
    part('jump', [
      tilt(-25, [50, 50], [
        tri(88, 46, 18, 26, '#3F86D1', 90),
        tri(87, 46, 4, 26, '#3F86D1', 90),
        tri(50, 30, 16, 18, '#3F86D1', 20),
        oval(48, 48, 72, 30, '#5BA4E6'),
        oval(44, 56, 50, 12, '#CFE7FA'),
        oval(12, 52, 16, 10, '#5BA4E6'),
        dot(26, 44, 6, INK),
        dot(27, 43, 2, WHITE),
        arc(16, 49, 10, 2, 'bottom'),
      ]),
    ]),
    part('splash', [dot(22, 86, 6, SKY), dot(30, 80, 4, SKY), dot(74, 82, 5, SKY), dot(80, 88, 4, SKY)]),
  ],
  whale: [
    part('spout', [bar(42, 24, 34, 8, 3.5, SKY), bar(46, 22, 46, 4, 3.5, SKY), bar(50, 24, 58, 8, 3.5, SKY), dot(34, 7, 6, SKY), dot(46, 3, 6, SKY), dot(58, 7, 6, SKY)]),
    part('tail', [tri(84, 40, 18, 22, '#3D6DB5', 25), tri(92, 48, 18, 22, '#3D6DB5', 70)]),
    box(10, 30, 76, 54, '#4A7CC7', [36, 30, 26, 28]),
    box(16, 62, 56, 20, '#A9C7EE', [8, 8, 20, 20]),
    bar(22, 66, 64, 66, 1.5, '#8DB2E6'),
    bar(26, 72, 60, 72, 1.5, '#8DB2E6'),
    ...eyes(28, 50, 50, 7),
    ...cheeksAt(22, 56, 58, 7, PINK),
    arc(38, 52, 12, 2.5, 'bottom'),
  ],
  jellyfish: [
    part('tentacles', [
      ...[30, 42, 58, 70].flatMap((x, i) => [bar(x, 54, x + (i % 2 ? 3 : -3), 66, 3, '#E58AC2'), bar(x + (i % 2 ? 3 : -3), 66, x, 78, 3, '#E58AC2'), bar(x, 78, x + (i % 2 ? 3 : -3), 90, 3, '#E58AC2')]),
      bar(50, 54, 50, 82, 3, '#F2A9D6'),
    ]),
    part('dome', [
      box(18, 14, 64, 44, '#F7B6DD', [32, 32, 8, 8]),
      ...[24, 34, 44, 56, 66, 76].map((x) => dot(x, 57, 10, '#F7B6DD')),
      oval(34, 26, 10, 6, '#FCE0F1', -30),
      ...eyes(40, 60, 38, 7),
      ...cheeksAt(31, 69, 46, 7),
      arc(50, 44, 10, 2.5, 'bottom'),
    ]),
  ],
  starfish: [...star(50, 54, 90, '#F59A3C'), ...star(50, 54, 80, '#FFB25B'), ...[[50, 24], [76, 44], [66, 74], [34, 74], [24, 44]].map(([x, y]) => dot(x, y, 4, '#FFD49A')), ...eyes(43, 57, 52, 6), arc(50, 56, 10, 2.5, 'bottom'), ...cheeksAt(37, 63, 59, 6)],
  pufferfish: [
    part('body', [
      ...rays(50, 52, 30, 42, 16, 3.5, '#E0A92A'),
      tri(88, 52, 14, 14, '#F2C14E', -90),
      dot(50, 52, 66, '#F7D26A'),
      oval(50, 68, 44, 26, '#FFF1C4'),
      ...eyes(38, 62, 46, 10),
      ...cheeksAt(30, 70, 58, 8),
      ring(50, 62, 9, 2.5, INK),
      oval(20, 58, 10, 14, '#E0A92A', 20),
    ]),
  ],
  seashell: [
    box(40, 78, 20, 12, '#E8A383', 4),
    box(12, 18, 76, 66, '#F7C6A8', [38, 38, 14, 14], { edge: { w: 3, c: '#E8A383' } }),
    ...[-60, -30, 0, 30, 60].map((turn) => {
      const r = (turn * Math.PI) / 180;
      return bar(50, 80, 50 + 34 * Math.sin(r), 80 - 54 * Math.cos(r), 3, '#E8A383');
    }),
    part('pearl', [dot(76, 84, 14, '#FFFFFF'), dot(76, 84, 12, '#EEE8F4'), dot(73, 81, 4, WHITE)]),
  ],
  sailboat: [
    part('boat', [
      bar(50, 12, 50, 70, 3, BROWN),
      tri(64, 42, 26, 52, WHITE, 0),
      box(51, 16, 2, 52, 'transparent'),
      tri(37, 48, 22, 40, RED, 0),
      tri(56, 9, 10, 8, BLUE, 90),
      box(14, 66, 72, 16, '#8B5A3C', [0, 0, 16, 16]),
      box(14, 66, 72, 5, '#A87456'),
      dot(36, 74, 5, '#F6E7CF'),
      dot(50, 74, 5, '#F6E7CF'),
      dot(64, 74, 5, '#F6E7CF'),
    ]),
    part('waves', [arc(20, 92, 20, 4, 'top', BLUE), arc(40, 92, 20, 4, 'top', BLUE), arc(60, 92, 20, 4, 'top', BLUE), arc(80, 92, 20, 4, 'top', BLUE)]),
  ],
  lighthouse: [
    part('beams', [tri(20, 25, 14, 30, '#FFE58A', -90), tri(80, 25, 14, 30, '#FFE58A', 90)]),
    box(30, 84, 40, 10, '#8B6B4A', 4),
    box(36, 34, 28, 52, WHITE, [2, 2, 0, 0], { edge: { w: 2, c: '#C9CED6' }, inside: [box(0, 10, 28, 10, RED), box(0, 32, 28, 10, RED)] }),
    box(44, 64, 12, 20, NIGHT, [6, 6, 0, 0]),
    box(32, 30, 36, 6, NIGHT, 2),
    box(38, 16, 24, 15, '#FFE58A', 2, { edge: { w: 2.5, c: NIGHT } }),
    tri(50, 9, 30, 13, RED),
    dot(50, 2.5, 4, RED),
  ],
  'sea-wave': [
    part('wave', [
      box(30, 22, 64, 48, '#3F86D1', [40, 6, 0, 0]),
      dot(36, 52, 30, '#BFE3F7'),
      dot(28, 38, 18, '#3F86D1'),
      dot(22, 44, 8, '#3F86D1'),
      box(6, 60, 88, 34, '#3F86D1', [0, 0, 12, 12]),
      box(10, 72, 80, 5, '#5BA4E6', 2.5),
      box(18, 83, 64, 4, '#5BA4E6', 2),
      box(60, 34, 6, 22, '#5BA4E6', 3),
      box(72, 30, 6, 26, '#5BA4E6', 3),
      dot(34, 26, 10, WHITE),
      dot(46, 20, 12, WHITE),
      dot(60, 19, 11, WHITE),
      dot(74, 20, 10, WHITE),
      dot(86, 22, 9, WHITE),
    ]),
    part('drops', [dot(84, 20, 6, '#BFE3F7'), dot(90, 32, 4, '#BFE3F7'), dot(14, 28, 4, '#BFE3F7')]),
  ],
  anchor: [
    part('swing', [
      ring(50, 14, 16, 4.5, '#3D5A80'),
      bar(50, 22, 50, 84, 7, '#3D5A80'),
      bar(32, 34, 68, 34, 6, '#3D5A80'),
      arc(50, 60, 60, 7, 'bottom', '#3D5A80'),
      tri(26, 78, 14, 14, '#3D5A80', -40),
      tri(74, 78, 14, 14, '#3D5A80', 40),
      bar(46, 40, 46, 76, 2, '#6E8BB3'),
    ]),
  ],
  'beach-umbrella': [
    box(4, 86, 92, 10, '#F2D49B', 5),
    dot(80, 84, 12, RED),
    box(76, 79, 8, 3, WHITE, 1.5),
    part('umbrella', [
      bar(54, 34, 46, 90, 3.5, '#8B6B4A'),
      tilt(-8, [50, 34], [
        box(10, 12, 80, 30, RED, [40, 40, 0, 0], { inside: [box(16, 0, 14, 30, WHITE), box(50, 0, 14, 30, WHITE)] }),
        box(10, 40, 80, 4, RED_DARK, 2),
        dot(50, 10, 5, '#8B6B4A'),
      ]),
    ]),
  ],

  // Weather.
  'sun-cloud': [
    part('rays', rays(38, 38, 26, 35, 8, 6, SUN)),
    dot(38, 38, 42, SUN),
    dot(31, 34, 5, INK),
    dot(45, 34, 5, INK),
    arc(38, 38, 14, 3, 'bottom'),
    part('cloud', cloud(60, 66, 1, WHITE, CLOUD_EDGE)),
  ],
  cloud: [part('cloud', cloud(50, 56, 1.3, WHITE, CLOUD_EDGE)), ...eyes(42, 58, 60, 7), ...cheeksAt(34, 66, 67, 7), arc(50, 63, 10, 2.5, 'bottom')],
  rain: [
    part('drops', [...[[30, 70], [46, 80], [62, 70], [76, 84], [38, 92]].map(([x, y]) => box(x - 3, y - 3, 7, 7, TEAR, [0, 3.5, 3.5, 3.5], { turn: 45 }))]),
    ...cloud(50, 40, 1.2, '#C9D2DE', '#A4B0C0'),
    arc(42, 48, 8, 2.5, 'top'),
    arc(58, 48, 8, 2.5, 'top'),
    arc(50, 56, 10, 2.5, 'top'),
  ],
  storm: [
    part('drops', [...[[22, 74], [80, 70], [70, 90]].map(([x, y]) => box(x - 3, y - 3, 7, 7, TEAR, [0, 3.5, 3.5, 3.5], { turn: 45 }))]),
    part('bolt', [tri(50, 60, 18, 30, SUN, 20), tri(48, 78, 14, 30, SUN, 200), bar(46, 66, 54, 68, 6, SUN)]),
    ...cloud(50, 36, 1.25, '#7B8798', '#5D6878'),
    bar(36, 32, 44, 36, 3, INK),
    bar(64, 32, 56, 36, 3, INK),
    dot(41, 40, 5, INK),
    dot(59, 40, 5, INK),
  ],
  rainbow: [
    box(0, 0, 100, 66, 'transparent', 0, {
      inside: [ring(50, 66, 88, 8, RED), ring(50, 66, 72, 8, ORANGE), ring(50, 66, 56, 8, SUN), ring(50, 66, 40, 8, '#7CC36E'), ring(50, 66, 24, 8, BLUE)],
    }),
    part('cloud1', cloud(14, 70, 0.62, WHITE, CLOUD_EDGE)),
    part('cloud2', cloud(86, 70, 0.62, WHITE, CLOUD_EDGE)),
    part('sparkle', [...star(84, 22, 10, SUN), ...star(18, 26, 8, SUN)]),
  ],
  umbrella: [
    part('drops', [...[[16, 20], [84, 26], [12, 54], [88, 58]].map(([x, y]) => box(x - 3, y - 3, 7, 7, TEAR, [0, 3.5, 3.5, 3.5], { turn: 45 }))]),
    part('umbrella', [
      bar(50, 20, 50, 80, 3.5, INK),
      arc(57, 80, 14, 3.5, 'bottom'),
      box(14, 20, 72, 32, PURPLE, [36, 36, 0, 0], { inside: [box(26, 0, 20, 32, '#B58DE3')] }),
      ...[23, 41, 59, 77].map((x) => arc(x, 52, 18, 5, 'top', '#7A4FB5')),
      dot(50, 18, 6, INK),
    ]),
  ],
  wind: [
    part('gust', [
      bar(8, 36, 62, 36, 6, '#9FC9E8'),
      ring(66, 28, 16, 5, '#9FC9E8'),
      bar(14, 54, 76, 54, 6, '#7FB5DE'),
      ring(80, 46, 16, 5, '#7FB5DE'),
      bar(20, 72, 52, 72, 6, '#9FC9E8'),
      ring(56, 64, 16, 5, '#9FC9E8'),
    ]),
    part('leaf', [oval(84, 82, 14, 8, '#6CC24A', -30), bar(78, 86, 90, 78, 1.5, '#4E9E33')]),
  ],
  snowflake: [
    part('flake', [
      ...[0, 60, 120].map((turn) => {
        const r = (turn * Math.PI) / 180;
        return bar(50 - 42 * Math.sin(r), 50 - 42 * Math.cos(r), 50 + 42 * Math.sin(r), 50 + 42 * Math.cos(r), 6, '#7FC4F0');
      }),
      ...[0, 60, 120, 180, 240, 300].flatMap((turn) => {
        const r = (turn * Math.PI) / 180;
        const [x, y] = [50 + 28 * Math.sin(r), 50 - 28 * Math.cos(r)];
        return [-1, 1].map((side) => {
          const b = r + (side * Math.PI) / 4;
          return bar(x, y, x + 11 * Math.sin(b), y - 11 * Math.cos(b), 4.5, '#7FC4F0');
        });
      }),
      dot(50, 50, 16, '#BFE3F7'),
    ]),
  ],
  snowman: [
    part('snow', [dot(14, 14, 5, '#D6E6F5'), dot(86, 22, 6, '#D6E6F5'), dot(80, 52, 4, '#D6E6F5'), dot(16, 46, 4, '#D6E6F5')]),
    part('body', [
      bar(26, 66, 12, 56, 3, BROWN),
      bar(74, 66, 88, 56, 3, BROWN),
      dot(50, 72, 46, '#D6E1EC'),
      dot(50, 72, 42, WHITE),
      dot(50, 64, 4, INK),
      dot(50, 74, 4, INK),
      dot(50, 84, 4, INK),
      dot(50, 38, 36, '#D6E1EC'),
      dot(50, 38, 32, WHITE),
      box(34, 50, 32, 8, RED, 4),
      box(56, 52, 8, 18, RED, 3),
      dot(44, 36, 5, INK),
      dot(56, 36, 5, INK),
      tri(56, 42, 6, 14, ORANGE, 90),
      box(36, 16, 28, 6, INK, 2),
      box(40, 4, 20, 14, INK, 2),
      box(40, 13, 20, 3, RED),
    ]),
  ],
  heatwave: [
    part('rays', rays(68, 32, 20, 28, 8, 5, SUN)),
    dot(68, 32, 30, ORANGE),
    box(26, 10, 20, 64, WHITE, 10, { edge: { w: 3, c: '#C9CED6' } }),
    part('mercury', [box(32, 30, 8, 46, RED, 4)]),
    dot(36, 80, 26, '#C9CED6'),
    dot(36, 80, 21, RED),
    bar(46, 24, 52, 24, 2.5, '#C9CED6'),
    bar(46, 36, 52, 36, 2.5, '#C9CED6'),
    bar(46, 48, 52, 48, 2.5, '#C9CED6'),
    part('sweat', [box(72, 64, 8, 8, TEAR, [0, 4, 4, 4], { turn: 45 }), box(84, 76, 6, 6, TEAR, [0, 3, 3, 3], { turn: 45 })]),
  ],
  freezing: [
    part('face', [
      dot(50, 54, 74, '#7FC4F0'),
      oval(36, 46, 9, 12, INK),
      oval(64, 46, 9, 12, INK),
      dot(37.5, 43, 3, WHITE),
      dot(65.5, 43, 3, WHITE),
      box(32, 62, 36, 12, WHITE, 4, { edge: { w: 2.5, c: INK } }),
      bar(41, 63, 41, 73, 2, INK),
      bar(50, 63, 50, 73, 2, INK),
      bar(59, 63, 59, 73, 2, INK),
    ]),
    box(14, 10, 72, 18, '#E5484D', [36, 36, 4, 4]),
    box(12, 24, 76, 8, WHITE, 4),
    dot(50, 8, 12, WHITE),
    part('flakes', [...star(14, 66, 10, '#5BB0E8'), ...star(88, 62, 8, '#5BB0E8')]),
  ],
  sunrise: [
    box(4, 8, 92, 60, 'transparent', 0, {
      inside: [part('sun', [...rays(46, 56, 28, 38, 9, 5, SUN, -80), dot(46, 56, 44, SUN), dot(40, 52, 5, INK), dot(52, 52, 5, INK), arc(46, 56, 14, 3, 'bottom')])],
    }),
    box(4, 64, 92, 12, '#3F86D1', 6),
    box(10, 78, 80, 6, '#5BA4E6', 3),
    box(22, 88, 56, 5, '#7FB5DE', 2.5),
    box(30, 66, 32, 3, '#FFE58A', 1.5),
  ],
  'starry-night': [
    box(6, 6, 88, 88, NIGHT, 24),
    dot(58, 42, 46, MOON),
    dot(72, 34, 40, NIGHT),
    dot(46, 44, 4, INK),
    arc(48, 50, 8, 2, 'bottom'),
    part('stars1', [...star(24, 24, 12, WHITE), ...star(78, 72, 10, WHITE), dot(30, 74, 3, WHITE)]),
    part('stars2', [...star(80, 18, 8, SUN), ...star(24, 56, 8, SUN), dot(56, 80, 3, WHITE), dot(86, 46, 3, WHITE)]),
  ],

  // Space.
  rocket: [
    part('flame', [oval(50, 88, 14, 22, ORANGE), oval(50, 86, 8, 14, SUN)]),
    tilt(0, [50, 50], [
      box(26, 58, 14, 24, RED, [10, 2, 2, 6]),
      box(60, 58, 14, 24, RED, [2, 10, 6, 2]),
      box(36, 10, 28, 70, '#EEF1F5', [14, 14, 4, 4], { edge: { w: 2.5, c: '#B8C0CC' } }),
      box(36, 10, 28, 16, RED, [14, 14, 0, 0]),
      dot(50, 40, 16, '#B8C0CC'),
      dot(50, 40, 12, SKY),
      dot(47, 37, 4, WHITE),
      box(46, 74, 8, 10, '#B8C0CC', 2),
    ]),
  ],
  planet: [
    ring(50, 52, 90, 7, '#F2A65A', 24, -18),
    dot(50, 50, 52, '#9B6BD3'),
    box(24, 24, 52, 52, 'transparent', 26, { inside: [box(0, 14, 52, 6, '#B58DE3'), box(0, 36, 52, 5, '#7A4FB5')] }),
    ...eyes(42, 58, 42, 6),
    arc(50, 44, 10, 2.5, 'bottom'),
    box(-10, 52, 120, 30, 'transparent', 0, { turn: -18, inside: [ring(60, 0, 90, 7, '#F2A65A', 24)] }),
    part('stars', [...star(14, 20, 10, SUN), ...star(86, 82, 8, SUN), dot(84, 18, 4, SKY)]),
  ],
  earth: [
    part('globe', [
      dot(50, 50, 84, '#3F86D1'),
      box(8, 8, 84, 84, 'transparent', 42, {
        inside: [oval(22, 22, 30, 22, '#4FA34A', 20), oval(30, 50, 22, 30, '#4FA34A', -10), oval(60, 22, 26, 16, '#4FA34A'), oval(62, 54, 30, 34, '#4FA34A', 15), oval(44, 84, 30, 12, '#4FA34A')],
      }),
    ]),
    ...eyes(40, 60, 46, 8),
    ...cheeksAt(31, 69, 56, 8),
    arc(50, 52, 14, 3, 'bottom'),
  ],
  ufo: [
    part('beam', [tri(50, 82, 44, 30, '#FFF1A8')]),
    part('ship', [
      dot(50, 40, 36, '#BFE3F7'),
      dot(44, 34, 8, WHITE),
      oval(50, 56, 84, 26, '#9AA3AD'),
      oval(50, 52, 84, 18, '#C9CED6'),
      dot(24, 56, 7, SUN),
      dot(50, 60, 7, RED),
      dot(76, 56, 7, '#7CC36E'),
      oval(50, 44, 12, 14, '#6CC24A'),
      dot(47, 42, 3, INK),
      dot(53, 42, 3, INK),
    ]),
  ],
  alien: [
    part('antennas', [bar(38, 20, 30, 6, 3, '#4E9E33'), bar(62, 20, 70, 6, 3, '#4E9E33'), dot(30, 6, 8, SUN), dot(70, 6, 8, SUN)]),
    box(18, 16, 64, 76, '#7CD35C', [32, 32, 30, 30]),
    part('eyes', [oval(38, 50, 16, 22, INK, 30), oval(62, 50, 16, 22, INK, -30), dot(36, 46, 5, WHITE), dot(60, 46, 5, WHITE)]),
    arc(50, 68, 14, 3, 'bottom'),
    ...cheeksAt(28, 72, 66, 7, '#5BB43E'),
  ],
  astronaut: [
    part('body', [
      box(26, 68, 48, 30, '#EEF1F5', [16, 16, 4, 4], { edge: { w: 2.5, c: '#B8C0CC' } }),
      box(42, 74, 16, 10, '#5B8DEF', 3),
      dot(50, 42, 64, '#B8C0CC'),
      dot(50, 42, 60, '#EEF1F5'),
      box(26, 26, 48, 36, NIGHT, 18),
      oval(38, 34, 10, 6, '#5A6A9A', -30),
      ...eyes(42, 58, 44, 7),
      arc(50, 46, 10, 2.5, 'bottom', WHITE),
      bar(82, 30, 82, 16, 2.5, '#B8C0CC'),
      dot(82, 14, 6, RED),
    ]),
    part('stars', [...star(14, 16, 10, SUN), ...star(88, 80, 8, SUN)]),
  ],
  comet: [
    part('tail', [tri(36, 64, 30, 60, '#FFB25B', -135), tri(36, 64, 16, 50, '#FFE29A', -135)]),
    dot(66, 34, 40, '#FFB25B'),
    dot(66, 34, 32, SUN),
    ...eyes(60, 72, 32, 6),
    arc(66, 34, 10, 2.5, 'bottom'),
  ],
  'shooting-star': [
    part('trail', [bar(10, 86, 44, 52, 6, '#B58DE3'), bar(20, 90, 48, 62, 4, '#7FD1F2'), bar(6, 74, 38, 46, 4, '#FF7EB6')]),
    part('star', [...star(62, 38, 52, SUN), ...eyes(56, 68, 38, 5), arc(62, 40, 8, 2, 'bottom')]),
  ],
  satellite: [
    part('sat', [
      tilt(-30, [50, 50], [
        box(4, 40, 30, 20, BLUE, 3, { edge: { w: 2, c: '#2F5BA8' }, inside: [box(13, 0, 2, 20, '#2F5BA8')] }),
        box(66, 40, 30, 20, BLUE, 3, { edge: { w: 2, c: '#2F5BA8' }, inside: [box(13, 0, 2, 20, '#2F5BA8')] }),
        bar(34, 50, 66, 50, 3, '#9AA3AD'),
        box(38, 36, 24, 28, GOLD, 4, { edge: { w: 2, c: '#C98A1D' } }),
        bar(50, 36, 50, 26, 2.5, '#9AA3AD'),
        dot(50, 24, 8, '#C9CED6'),
      ]),
    ]),
    part('signal', [arc(78, 22, 14, 2.5, 'top', '#7CC36E'), arc(78, 22, 24, 2.5, 'top', '#7CC36E')]),
  ],
  crescent: [
    part('moon', [...crescent(56, 50, 38, 30, MOON), dot(28, 46, 4, INK), arc(29, 52, 8, 2, 'bottom'), dot(24, 58, 6, CHEEK)]),
    part('stars', [...star(72, 70, 14, SUN), ...star(84, 20, 10, SKY)]),
  ],
  'black-hole': [
    part('swirl', [ring(50, 50, 92, 4, '#9B6BD3'), ring(50, 50, 74, 5, '#5B8DEF'), ring(50, 50, 56, 6, '#FF7EB6'), arc(50, 50, 92, 6, 'top', '#FFE29A'), arc(50, 50, 56, 6, 'bottom', '#FFE29A')]),
    dot(50, 50, 40, '#0B0B12'),
    dot(44, 46, 5, WHITE),
    dot(56, 46, 5, WHITE),
  ],
  telescope: [
    bar(44, 60, 30, 92, 3.5, BROWN),
    bar(44, 60, 58, 92, 3.5, BROWN),
    bar(44, 60, 44, 92, 3.5, BROWN),
    tilt(-28, [44, 56], [box(14, 48, 62, 16, '#5B8DEF', 6), box(70, 45, 14, 22, '#2F5BA8', 4), box(8, 51, 8, 10, '#2F5BA8', 2), box(36, 46, 8, 20, GOLD, 2)]),
    part('stars', [...star(80, 14, 14, SUN), ...star(62, 8, 8, SKY), ...star(92, 32, 8, SKY)]),
  ],

  // More moons.
  'moon-cool': moon([
    box(22, 32, 25, 16, INK, [4, 4, 12, 12]),
    box(53, 32, 25, 16, INK, [4, 4, 12, 12]),
    bar(45, 36, 55, 36, 3.5, INK),
    bar(12, 35, 22, 36, 3, INK),
    bar(78, 36, 88, 35, 3, INK),
    part('glint', [bar(27, 36, 33, 36, 2.5, WHITE), bar(58, 36, 64, 36, 2.5, WHITE)]),
    arc(56, 56, 26, 5, 'bottom'),
  ]),
  'moon-kiss': moon([
    arc(36, 44, 14, 4, 'top'),
    bar(58, 41, 70, 41, 4, INK),
    ...moonCheeks(),
    box(42, 60, 14, 6, RED, 3),
    box(42, 66, 14, 6, RED, 3),
    part('kiss', [heart(78, 66, 16, RED)]),
  ]),
  'moon-tongue': moon([...moonEyes(), ...moonCheeks(), bar(34, 60, 66, 60, 5, INK), part('tongue', [box(46, 60, 16, 18, RED, [0, 0, 8, 8]), bar(54, 62, 54, 70, 1.5, RED_DARK)])]),
  'moon-think': moon([
    dot(38, 38, 9, INK),
    dot(64, 38, 9, INK),
    bar(56, 26, 70, 28, 4, INK),
    bar(30, 30, 44, 28, 4, INK),
    bar(40, 66, 58, 62, 4.5, INK),
    part('hand', [oval(30, 74, 22, 16, '#E8B94A', -20), oval(34, 64, 8, 16, '#E8B94A', 10)]),
    part('dots', [dot(76, 10, 6, WHITE), dot(86, 4, 8, WHITE)]),
  ]),
  'moon-shy': moon([arc(36, 44, 14, 4, 'top'), arc(64, 44, 14, 4, 'top'), part('blush', [oval(26, 56, 18, 10, CHEEK), oval(74, 56, 18, 10, CHEEK)]), arc(50, 54, 16, 4, 'bottom')]),
  'moon-party': [
    part('confetti', [dot(10, 30, 6, SUN), dot(90, 40, 6, PINK), bar(6, 60, 10, 54, 3, BLUE), bar(92, 70, 96, 74, 3, '#7CC36E'), dot(14, 86, 5, SKY), bar(86, 90, 90, 86, 3, RED)]),
    ...moon([arc(36, 44, 14, 4, 'top'), arc(64, 44, 14, 4, 'top'), ...moonCheeks(), box(34, 56, 32, 18, INK, [0, 0, 16, 16], { inside: [box(8, 9, 16, 10, RED, 5)] })]),
    part('hat', [tilt(20, [64, 16], [tri(64, 6, 26, 30, PURPLE), bar(58, 8, 70, 6, 3, SUN), bar(54, 16, 74, 14, 3, SUN), dot(64, -8, 9, SUN)])]),
  ],
  'moon-cry': moon([
    arc(36, 44, 16, 4, 'top'),
    arc(64, 44, 16, 4, 'top'),
    box(36, 60, 28, 16, INK, [14, 14, 4, 4], { inside: [box(6, 9, 16, 8, RED, 4)] }),
    part('tears', [box(26, 44, 8, 30, TEAR, 4), box(66, 44, 8, 30, TEAR, 4)]),
  ]),
  'moon-dizzy': moon([
    part('eye1', [arc(36, 40, 18, 3.5, 'top'), arc(36, 40, 11, 3, 'bottom'), arc(36, 40, 11, 3, 'right'), dot(36, 40, 4, INK)]),
    part('eye2', [arc(64, 40, 18, 3.5, 'top'), arc(64, 40, 11, 3, 'bottom'), arc(64, 40, 11, 3, 'left'), dot(64, 40, 4, INK)]),
    ...moonCheeks(),
    box(42, 60, 16, 10, INK, [5, 5, 5, 5]),
    part('stars', [...star(20, 14, 12, SUN), ...star(80, 12, 10, SUN), ...star(50, 4, 8, SUN)]),
  ]),

  // More animals.
  pig: [
    part('ears', [tri(28, 24, 22, 22, '#F28BA8', -25), tri(72, 24, 22, 22, '#F28BA8', 25)]),
    dot(50, 56, 76, '#F7A8C0'),
    ...eyes(36, 64, 46, 8),
    ...cheeksAt(26, 74, 62, 9, '#F28BA8'),
    part('snout', [oval(50, 64, 30, 22, '#F28BA8'), oval(44, 64, 6, 8, '#C9607F'), oval(56, 64, 6, 8, '#C9607F')]),
    arc(50, 76, 10, 2.5, 'bottom'),
  ],
  mouse: [
    part('ear1', [dot(24, 30, 36, '#A7A9B4'), dot(24, 30, 22, PINK)]),
    part('ear2', [dot(76, 30, 36, '#A7A9B4'), dot(76, 30, 22, PINK)]),
    oval(50, 60, 64, 56, '#BFC2CC'),
    ...eyes(38, 62, 54, 8),
    ...cheeksAt(28, 72, 66, 8, PINK),
    dot(50, 66, 8, PINK_DARK),
    bar(30, 68, 16, 66, 1.5, INK),
    bar(30, 72, 16, 74, 1.5, INK),
    bar(70, 68, 84, 66, 1.5, INK),
    bar(70, 72, 84, 74, 1.5, INK),
    arc(50, 68, 10, 2.5, 'bottom'),
  ],
  koala: [
    part('ear1', [dot(20, 34, 34, '#8E959F'), dot(20, 34, 20, '#E6E8EC')]),
    part('ear2', [dot(80, 34, 34, '#8E959F'), dot(80, 34, 20, '#E6E8EC')]),
    dot(50, 56, 70, '#A3AAB4'),
    ...eyes(36, 64, 50, 8),
    oval(50, 62, 18, 24, '#3B3F47'),
    oval(47, 56, 4, 6, '#6B717C', -15),
    ...cheeksAt(28, 72, 66, 8, PINK),
    arc(50, 76, 10, 2.5, 'bottom'),
  ],
  lion: [
    part('mane', [
      ...Array.from({ length: 12 }, (_, i) => {
        const turn = (i * 30 * Math.PI) / 180;
        return dot(50 + 34 * Math.cos(turn), 52 + 34 * Math.sin(turn), 26, i % 2 ? '#D9822B' : '#E89A3C');
      }),
      dot(50, 52, 70, '#D9822B'),
    ]),
    dot(30, 30, 14, '#F7C66A'),
    dot(70, 30, 14, '#F7C66A'),
    dot(50, 54, 56, '#F7C66A'),
    ...eyes(40, 60, 48, 7),
    oval(50, 66, 26, 18, '#FBE3A5'),
    tri(50, 60, 10, 7, '#8B5A3C', 180),
    ...muzzleMouth(70, 8),
  ],
  cow: [
    part('ears', [oval(14, 40, 22, 12, WHITE, 20), oval(86, 40, 22, 12, WHITE, -20)]),
    tri(30, 16, 8, 14, '#E9D6B9', -20),
    tri(70, 16, 8, 14, '#E9D6B9', 20),
    box(20, 18, 60, 66, WHITE, [28, 28, 26, 26], { edge: { w: 2.5, c: '#C9CED6' } }),
    oval(32, 32, 18, 14, INK, 20),
    oval(70, 28, 12, 10, INK, -20),
    ...eyes(38, 62, 46, 8),
    box(24, 58, 52, 26, PINK, 13),
    oval(40, 70, 6, 8, PINK_DARK),
    oval(60, 70, 6, 8, PINK_DARK),
    part('bell', [bar(50, 84, 50, 88, 2, '#C98A1D'), dot(50, 92, 10, GOLD)]),
  ],
  monkey: [
    part('ear1', [dot(16, 50, 24, '#8A5A3C'), dot(16, 50, 14, '#E8C29A')]),
    part('ear2', [dot(84, 50, 24, '#8A5A3C'), dot(84, 50, 14, '#E8C29A')]),
    dot(50, 50, 72, '#8A5A3C'),
    oval(40, 48, 26, 30, '#E8C29A'),
    oval(60, 48, 26, 30, '#E8C29A'),
    oval(50, 68, 46, 28, '#E8C29A'),
    ...eyes(40, 60, 46, 7),
    dot(46, 62, 3, '#8A5A3C'),
    dot(54, 62, 3, '#8A5A3C'),
    arc(50, 66, 22, 3, 'bottom'),
  ],
  hedgehog: [
    part('spines', [
      ...Array.from({ length: 9 }, (_, i) => tri(26 + i * 7, 36 - Math.sin((i / 8) * Math.PI) * 10, 12, 18, '#6B4A33', -60 + i * 15)),
      oval(56, 60, 70, 52, '#6B4A33'),
    ]),
    oval(30, 64, 40, 36, '#E8C29A'),
    dot(12, 66, 8, INK),
    ...eyes(28, 40, 56, 6),
    ...cheeksAt(24, 44, 66, 6),
    arc(22, 68, 8, 2, 'bottom'),
    oval(36, 90, 10, 6, '#6B4A33'),
    oval(66, 90, 10, 6, '#6B4A33'),
  ],
  bee: [
    part('wings', [oval(36, 26, 22, 30, '#DDEFFA', -30), oval(62, 26, 22, 30, '#DDEFFA', 30)]),
    tri(88, 58, 10, 12, INK, 90),
    box(16, 34, 70, 48, SUN, 24, { inside: [box(30, 0, 10, 48, INK), box(50, 0, 10, 48, INK)] }),
    ...eyes(24, 36, 54, 6),
    ...cheeksAt(20, 40, 64, 6),
    arc(30, 60, 8, 2, 'bottom'),
    bar(24, 36, 18, 22, 2, INK),
    bar(32, 36, 34, 22, 2, INK),
    dot(18, 21, 5, INK),
    dot(34, 21, 5, INK),
  ],
  ladybug: [
    part('wings', [
      box(14, 28, 72, 64, RED, 36),
      bar(50, 30, 50, 90, 2.5, INK),
      dot(32, 50, 12, INK),
      dot(68, 50, 12, INK),
      dot(36, 74, 10, INK),
      dot(64, 74, 10, INK),
      dot(50, 86, 6, INK),
    ]),
    box(30, 14, 40, 28, INK, 20),
    bar(42, 16, 36, 4, 2, INK),
    bar(58, 16, 64, 4, 2, INK),
    dot(36, 4, 5, INK),
    dot(64, 4, 5, INK),
    dot(42, 26, 8, WHITE),
    dot(58, 26, 8, WHITE),
    dot(43, 27, 4, INK),
    dot(59, 27, 4, INK),
  ],

  // More celebrations.
  trophy: [
    box(28, 84, 44, 10, BROWN, 3),
    box(38, 72, 24, 14, GOLD, 2),
    bar(50, 58, 50, 72, 8, GOLD),
    ring(22, 34, 22, 5, GOLD),
    ring(78, 34, 22, 5, GOLD),
    box(24, 14, 52, 46, SUN, [4, 4, 26, 26]),
    box(32, 20, 6, 28, '#FFE29A', 3),
    part('star', star(56, 34, 18, '#FFF1A8')),
    part('shine', [...star(16, 12, 10, SUN), ...star(86, 64, 8, SUN)]),
  ],
  medal: [
    tri(38, 22, 18, 40, BLUE, 160),
    tri(62, 22, 18, 40, RED, 200),
    part('medal', [dot(50, 62, 50, GOLD), dot(50, 62, 38, SUN), ...star(50, 62, 22, '#FFF1A8')]),
  ],
  'wedding-rings': [
    part('ring1', [ring(38, 60, 40, 7, GOLD), arc(38, 60, 40, 3, 'top', '#FFE29A')]),
    part('ring2', [ring(62, 60, 40, 7, '#C9CED6'), arc(62, 60, 40, 3, 'top', WHITE), tri(62, 36, 14, 10, '#BFE3F7', 180), dot(62, 30, 6, '#DFF3FD')]),
    part('hearts', [heart(20, 20, 12, RED), heart(82, 16, 10, '#FF7EB6')]),
  ],
  'graduation-cap': [
    box(32, 46, 36, 22, '#2C3A63', [0, 0, 10, 10]),
    part('cap', [
      tri(50, 30, 84, 26, '#4A5D96'),
      tri(50, 43, 84, 26, '#4A5D96', 180),
      dot(50, 37, 6, GOLD),
      part('tassel', [bar(50, 37, 78, 44, 2.5, GOLD), bar(78, 44, 78, 62, 2.5, GOLD), oval(78, 66, 7, 12, GOLD)]),
    ]),
    part('stars', [...star(16, 76, 10, SUN), ...star(86, 82, 8, SUN)]),
  ],
  bouquet: [
    tri(50, 74, 40, 40, '#F7D3A4', 180),
    ...[[30, 50], [44, 40], [60, 40], [72, 52]].map(([x, y]) => bar(50, 78, x, y, 3, GREEN)),
    oval(30, 56, 12, 20, '#4FA34A', -40),
    oval(70, 58, 12, 20, '#4FA34A', 40),
    part('flowers', [
      ...[[30, 44, RED], [50, 32, PINK], [70, 44, PURPLE], [44, 54, SUN], [58, 54, '#FF8C42']].flatMap(([x, y, c]) => [
        ...[0, 72, 144, 216, 288].map((turn) => dot((x as number) + 7 * Math.cos((turn * Math.PI) / 180), (y as number) + 7 * Math.sin((turn * Math.PI) / 180), 10, c as string)),
        dot(x as number, y as number, 7, '#FFF1A8'),
      ]),
    ]),
    box(36, 70, 28, 8, RED, 4),
  ],
  kite: [
    part('kite', [
      tri(50, 24, 60, 32, RED, 180),
      tri(50, 24, 60, 32, '#F07A80', 0),
      tri(50, 56, 60, 32, SUN, 180),
      box(23, 39, 54, 2, '#9C5A32', 1),
      bar(50, 8, 50, 72, 2, '#9C5A32'),
      bar(50, 72, 40, 84, 1.5, STRING),
      bar(40, 84, 30, 94, 1.5, STRING),
      tri(46, 79, 6, 6, BLUE, 90),
      tri(36, 89, 6, 6, '#7CC36E', 90),
    ]),
    bar(30, 94, 10, 98, 1.5, STRING),
  ],
  pomegranate: [
    tri(50, 16, 20, 14, '#A3242C', 0),
    tri(42, 16, 8, 12, '#A3242C', -30),
    tri(58, 16, 8, 12, '#A3242C', 30),
    dot(50, 56, 76, '#C9303A'),
    oval(34, 40, 12, 20, '#E05A63', 30),
    part('seeds', [box(56, 60, 26, 24, '#F4E4D0', 12, { inside: [...[[6, 6], [14, 6], [20, 10], [8, 14], [16, 15], [12, 20]].map(([x, y]) => oval(x, y, 6, 7, '#E5484D'))] })]),
    part('shine', [...star(84, 18, 12, SUN), ...star(14, 82, 10, SUN)]),
  ],
  'easter-candle': [
    part('flame', [oval(50, 12, 10, 18, SUN), oval(50, 14, 5, 10, '#FFF1A8')]),
    bar(50, 20, 50, 24, 1.5, INK),
    box(42, 24, 16, 70, WHITE, 3, { edge: { w: 2, c: '#C9CED6' } }),
    bar(36, 50, 64, 54, 4, '#7CC36E'),
    heart(44, 58, 12, '#7CC36E'),
    heart(56, 58, 12, '#7CC36E'),
    box(46, 56, 8, 8, RED, 4),
    bar(50, 64, 50, 78, 2, BLUE),
    bar(50, 64, 44, 80, 2, PINK),
    bar(50, 64, 56, 80, 2, SUN),
  ],
  pumpkin: [
    box(46, 12, 8, 14, '#4E7A2E', 2),
    oval(64, 18, 14, 8, '#6CC24A', -20),
    oval(30, 58, 36, 66, '#E8751A'),
    oval(70, 58, 36, 66, '#E8751A'),
    oval(50, 58, 40, 70, '#F28C28'),
    part('face', [tri(36, 48, 12, 10, '#3B2A1A'), tri(64, 48, 12, 10, '#3B2A1A'), tri(50, 58, 8, 7, '#3B2A1A'), box(32, 66, 36, 10, '#3B2A1A', [2, 2, 8, 8], { inside: [box(8, 0, 6, 4, '#F28C28'), box(22, 0, 6, 4, '#F28C28')] })]),
  ],

  // More words.
  hello: card('#FFE6A8', '#F2C35B', INK, [...littleMoon(84, 24, [dot(80, 22, 3, INK), dot(88, 22, 3, INK), arc(84, 24, 9, 2, 'bottom')]), arc(70, 16, 8, 2, 'top', '#F2A21D'), arc(70, 16, 14, 2, 'top', '#F2A21D')]),
  yes: card('#C9F0D8', '#82CFA0', INK, [dot(84, 24, 22, GREEN), bar(78, 24, 82, 28, 3, WHITE), bar(82, 28, 90, 19, 3, WHITE)]),
  no: card('#FFD6D6', '#F29A9A', INK, [dot(84, 24, 22, RED), bar(79, 19, 89, 29, 3, WHITE), bar(89, 19, 79, 29, 3, WHITE)]),
  'good-luck': card('#D8F3C8', '#9BD77F', INK, [bar(84, 26, 88, 36, 2, '#2F7A3A'), ...[0, 90, 180, 270].map((turn) => tilt(turn, [84, 24], [heart(84, 18, 11, '#3E9E4F')]))]),
  'get-well': card('#DCEBFA', '#9CC3EA', INK, [tilt(-35, [84, 24], [box(72, 19, 24, 10, '#F7C99B', 5), box(80, 19, 8, 10, '#E8A97A'), dot(76, 24, 1.8, '#C98A5A'), dot(92, 24, 1.8, '#C98A5A')])]),
  'enjoy-your-meal': card('#FFE2C7', '#F2B07A', INK, [dot(84, 24, 22, WHITE), dot(84, 24, 15, '#F3EEE8'), bar(73, 16, 73, 32, 2, '#9AA3AD'), bar(95, 16, 95, 32, 2, '#9AA3AD'), box(93, 15, 4, 9, '#9AA3AD', 2)]),
  'miss-you': card('#E2DAF7', '#B3A3E6', INK, [heart(84, 22, 20, '#9B6BD3'), box(90, 28, 5, 5, TEAR, [0, 2.5, 2.5, 2.5], { turn: 45 })]),
  'call-me': card('#C8F0EE', '#7FD0CB', INK, [dot(84, 24, 22, '#2FA89F'), tilt(-30, [84, 24], [box(80, 16, 8, 16, WHITE, 2.5, { inside: [box(1.5, 2, 5, 9, '#2FA89F', 1)] })])]),
  'chin-up': card('#FFD9B8', '#F2A66B', INK, [...star(84, 23, 24, '#F26B1D'), ...star(84, 23.5, 15, ORANGE)]),

  // More treats.
  gyros: [
    bar(56, 8, 54, 26, 4, '#F7C948'),
    bar(44, 10, 46, 26, 4, '#FFD95A'),
    dot(28, 34, 14, '#4FA34A'),
    dot(72, 34, 14, '#4FA34A'),
    dot(36, 30, 16, '#9C5A32'),
    dot(50, 26, 18, '#9C5A32'),
    dot(64, 30, 16, '#9C5A32'),
    dot(42, 22, 10, '#E5484D'),
    ring(60, 21, 10, 2.5, WHITE),
    box(18, 32, 64, 14, '#F2D49B', 7),
    tri(50, 66, 64, 56, '#F2D49B', 180),
    tri(50, 74, 48, 40, WHITE, 180),
    bar(36, 62, 64, 62, 2.5, '#5B8DEF'),
    dot(34, 40, 3, '#D9A85E'),
    dot(62, 42, 3, '#D9A85E'),
  ],
  koulouri: [ring(50, 50, 84, 22, '#C98A42'), ring(50, 50, 78, 16, '#E0A65E'), ...Array.from({ length: 20 }, (_, i) => {
    const turn = (i * 18 * Math.PI) / 180;
    const r = i % 2 ? 31 : 36;
    return oval(50 + r * Math.cos(turn), 50 + r * Math.sin(turn), 2.5, 4.5, '#FFF1DC', i * 18 + 90);
  })],
  olives: [
    oval(50, 82, 76, 18, '#E8DDC4'),
    oval(50, 79, 70, 12, WHITE),
    bar(60, 12, 30, 52, 2, BROWN),
    oval(56, 20, 12, 24, '#4FA34A', 40),
    oval(44, 36, 12, 24, '#4FA34A', -40),
    oval(36, 60, 26, 34, '#6B8E23', -20),
    dot(39, 52, 8, '#C9303A'),
    oval(62, 64, 26, 34, '#3B2A3F', 20),
    oval(56, 56, 6, 10, '#6A4F6E', 20),
  ],
  loukoumades: [
    box(8, 66, 84, 22, '#F0EBE3', [4, 4, 40, 40], { edge: { w: 2.5, c: '#C9CED6' } }),
    dot(30, 60, 26, '#D9902F'),
    dot(54, 58, 28, '#E0A040'),
    dot(74, 62, 24, '#D9902F'),
    dot(42, 44, 24, '#E0A040'),
    dot(64, 42, 22, '#D9902F'),
    bar(18, 52, 84, 48, 3, '#F7C35B'),
    bar(26, 40, 76, 56, 3, '#F7C35B'),
    dot(36, 50, 3, '#6B4A33'),
    dot(58, 46, 3, '#6B4A33'),
    dot(70, 58, 3, '#6B4A33'),
    dot(48, 62, 3, '#6B4A33'),
  ],
  burger: [
    box(14, 20, 72, 30, '#E8A04A', [36, 36, 6, 6]),
    ...[[30, 30], [44, 26], [58, 30], [68, 36], [38, 38]].map(([x, y]) => oval(x, y, 4, 2.5, '#FFF1DC', 20)),
    box(10, 48, 80, 8, '#6CC24A', 4),
    tri(18, 58, 12, 8, SUN, 180),
    tri(46, 58, 12, 8, SUN, 180),
    tri(74, 58, 12, 8, SUN, 180),
    box(12, 54, 76, 6, SUN, 2),
    box(12, 58, 76, 12, '#7A4A2A', 6),
    box(14, 70, 72, 16, '#E8A04A', [4, 4, 12, 12]),
  ],
  fries: [
    ...[[30, -8], [40, -3], [50, 0], [60, 4], [70, 8], [36, -5], [56, 2], [64, 6]].map(([x, turn], i) => box(x - 4, 12 + (i % 3) * 5, 8, 50, i % 2 ? '#F7C948' : '#FFD95A', 2, { turn })),
    box(22, 46, 56, 46, RED, [4, 4, 14, 14]),
    box(22, 46, 56, 10, RED_DARK, [4, 4, 0, 0]),
    dot(50, 70, 18, SUN),
    dot(50, 70, 12, RED),
  ],
  croissant: [
    oval(50, 58, 46, 40, '#E8A04A'),
    oval(26, 64, 26, 26, '#D98A33', 30),
    oval(74, 64, 26, 26, '#D98A33', -30),
    oval(12, 72, 16, 12, '#E8A04A', 40),
    oval(88, 72, 16, 12, '#E8A04A', -40),
    bar(40, 44, 44, 72, 2.5, '#B86E22'),
    bar(60, 44, 56, 72, 2.5, '#B86E22'),
    oval(46, 46, 12, 6, '#F7C27A', -10),
  ],
  cupcake: [
    box(26, 56, 48, 36, '#5B8DEF', [2, 2, 8, 8], { inside: [box(8, 0, 4, 36, '#7FA6F2'), box(22, 0, 4, 36, '#7FA6F2'), box(36, 0, 4, 36, '#7FA6F2')] }),
    dot(32, 54, 20, PINK),
    dot(50, 50, 26, PINK),
    dot(68, 54, 20, PINK),
    dot(50, 36, 24, '#F9C1D6'),
    bar(40, 46, 43, 44, 2, SUN),
    bar(58, 48, 60, 51, 2, SKY),
    bar(48, 56, 51, 56, 2, '#7CC36E'),
    bar(52, 32, 54, 35, 2, WHITE),
    dot(50, 20, 12, RED),
    bar(50, 14, 56, 6, 1.5, '#4E7A2E'),
  ],
  strawberry: [
    tri(50, 74, 64, 44, '#E5484D', 180),
    dot(34, 46, 34, '#E5484D'),
    dot(66, 46, 34, '#E5484D'),
    dot(50, 54, 46, '#E5484D'),
    ...[[36, 46], [50, 44], [64, 46], [42, 58], [58, 58], [50, 70], [30, 56], [70, 56]].map(([x, y]) => oval(x, y, 3, 4.5, '#FFE29A')),
    tri(38, 30, 14, 12, '#3E9E4F', -60),
    tri(62, 30, 14, 12, '#3E9E4F', 60),
    tri(50, 28, 14, 14, '#3E9E4F'),
    bar(50, 22, 52, 10, 3, '#2F7A3A'),
  ],
  wine: [
    box(32, 86, 36, 6, GLASS_EDGE, 3),
    bar(50, 60, 50, 86, 3, GLASS_EDGE),
    box(26, 10, 48, 54, GLASS, [4, 4, 24, 24], { edge: { w: 2.5, c: GLASS_EDGE } }),
    box(29, 30, 42, 31, '#8E1F3A', [0, 0, 21, 21]),
    box(33, 14, 5, 14, WHITE, 2.5),
  ],
  popcorn: [
    ...[[30, 30], [44, 22], [58, 24], [70, 32], [38, 40], [54, 36], [66, 42], [28, 44]].map(([x, y]) => dot(x, y, 18, '#FFF6E0')),
    ...[[44, 22], [66, 42], [28, 44]].map(([x, y]) => dot(x + 2, y + 2, 7, '#F7D58A')),
    box(22, 44, 56, 50, WHITE, [2, 2, 8, 8], { inside: [box(8, 0, 9, 50, RED), box(26, 0, 9, 50, RED), box(44, 0, 9, 50, RED)] }),
  ],
  'moon-sweat': moon([...moonEyes(), ...moonCheeks(), bar(36, 64, 44, 61, 4, INK), bar(44, 61, 52, 64, 4, INK), bar(52, 64, 60, 61, 4, INK), bar(60, 61, 66, 64, 4, INK), part('sweat', [box(70, 20, 10, 10, TEAR, [0, 5, 5, 5], { turn: 45 })])]),
  'moon-yum': moon([arc(36, 44, 14, 4, 'top'), arc(64, 44, 14, 4, 'top'), ...moonCheeks(), smile(), part('tongue', [oval(60, 66, 12, 10, RED)])]),
  'moon-angel': [part('halo', [ring(50, 6, 44, 4, GOLD, 12)]), ...moon([arc(36, 44, 14, 4, 'top'), arc(64, 44, 14, 4, 'top'), ...moonCheeks(), smile()])],
  'moon-devil': [
    part('horns', [tri(24, 12, 16, 22, RED, -25), tri(76, 12, 16, 22, RED, 25)]),
    ...moon([bar(28, 32, 42, 38, 4, INK), bar(72, 32, 58, 38, 4, INK), dot(36, 44, 9, INK), dot(64, 44, 9, INK), ...moonCheeks(), arc(56, 54, 24, 5, 'bottom')], '#F5B556'),
  ],
  'ghost-kiss': ghost([arc(40, 42, 12, 3.5, 'top'), bar(55, 41, 65, 41, 3.5, INK), ...ghostCheeks(), box(46, 48, 8, 4, RED, 2), box(46, 52, 8, 4, RED, 2), part('kiss', [heart(76, 50, 14, RED)])]),
  'ghost-think': ghost([dot(42, 38, 8, INK), dot(62, 38, 8, INK), bar(54, 30, 66, 28, 3, INK), bar(44, 50, 56, 48, 3.5, INK), part('dots', [dot(80, 14, 5, '#C9C1E0'), dot(88, 6, 7, '#C9C1E0')])], { arm1: holdingArm(1) }),
  'ghost-scared': ghost([dot(40, 38, 13, WHITE), dot(60, 38, 13, WHITE), ring(40, 38, 13, 2, INK), ring(60, 38, 13, 2, INK), dot(40, 38, 4, INK), dot(60, 38, 4, INK), oval(50, 54, 10, 14, INK)], { color: '#E6EEFB', edge: '#A9BEE3', arm1: raisedArm(1), arm2: raisedArm(-1) }),
  'ghost-music': ghost([arc(40, 44, 11, 3, 'top'), arc(60, 44, 11, 3, 'top'), ...ghostCheeks(), arc(50, 46, 14, 3, 'bottom'), arc(50, 36, 52, 4, 'top', '#5B8DEF'), box(18, 30, 9, 18, '#5B8DEF', 4), box(73, 30, 9, 18, '#5B8DEF', 4), part('notes', [dot(86, 14, 6, PURPLE), bar(88, 14, 88, 4, 2, PURPLE), dot(12, 20, 5, PURPLE), bar(14, 20, 14, 11, 2, PURPLE)])]),
  'ghost-cake': ghost([...ghostEyes(), ...ghostCheeks(), arc(50, 44, 14, 3.5, 'bottom')], {
    held: [box(34, 62, 32, 18, PINK, 5), box(34, 62, 32, 6, WHITE, [5, 5, 0, 0]), box(48, 52, 4, 10, SKY, 1), part('flame', [oval(50, 49, 5, 8, SUN)])],
    arm1: holdingArm(1),
    arm2: holdingArm(-1),
  }),
  'ghost-umbrella': [
    part('drops', [...[[10, 30], [90, 36], [14, 62]].map(([x, y]) => box(x - 3, y - 3, 6, 6, TEAR, [0, 3, 3, 3], { turn: 45 }))]),
    ...ghost([...ghostEyes(), ...ghostCheeks(), arc(50, 44, 14, 3.5, 'bottom')], { arm2: holdingArm(-1) }),
    bar(74, 6, 72, 72, 2.5, INK),
    box(52, 0, 44, 20, '#E5484D', [22, 22, 0, 0]),
    arc(63, 20, 12, 3, 'top', RED_DARK),
    arc(85, 20, 12, 3, 'top', RED_DARK),
  ],
  'ghost-flower': ghost([arc(40, 42, 11, 3, 'top'), arc(60, 42, 11, 3, 'top'), ...ghostCheeks(), arc(50, 44, 14, 3.5, 'bottom')], {
    held: [bar(50, 82, 52, 62, 2.5, GREEN), oval(56, 72, 8, 4, GREEN, -30), part('flower', [...[0, 72, 144, 216, 288].map((t) => dot(52 + 6 * Math.cos((t * Math.PI) / 180), 58 + 6 * Math.sin((t * Math.PI) / 180), 9, PINK)), dot(52, 58, 6, SUN)])],
    arm1: holdingArm(1),
    arm2: holdingArm(-1),
  }),
  'ghost-bye': ghost([...ghostEyes(), ...ghostCheeks(), arc(50, 44, 14, 3.5, 'bottom')], { arm1: raisedArm(1), arm2: wavingArm() }),
  elephant: [
    part('ear1', [oval(20, 48, 34, 44, '#8FA3B8', 10), oval(22, 48, 22, 32, '#F2B8C6', 10)]),
    part('ear2', [oval(80, 48, 34, 44, '#8FA3B8', -10), oval(78, 48, 22, 32, '#F2B8C6', -10)]),
    dot(50, 46, 56, '#A7B8CA'),
    part('trunk', [bar(50, 56, 50, 80, 14, '#A7B8CA'), bar(50, 80, 58, 88, 12, '#A7B8CA')]),
    ...eyes(40, 60, 42, 7),
    ...cheeksAt(34, 66, 54, 7),
    tri(36, 64, 6, 12, WHITE, 200),
    tri(64, 64, 6, 12, WHITE, 160),
  ],
  sheep: [
    ...[[30, 30], [50, 24], [70, 30], [24, 50], [76, 50], [30, 70], [50, 76], [70, 70]].map(([x, y]) => dot(x, y, 30, '#F4F1EE')),
    dot(50, 50, 56, '#F4F1EE'),
    part('ears', [oval(26, 48, 20, 10, '#5A4A44', 20), oval(74, 48, 20, 10, '#5A4A44', -20)]),
    oval(50, 54, 34, 40, '#5A4A44'),
    dot(42, 52, 7, WHITE),
    dot(58, 52, 7, WHITE),
    dot(42.5, 52.5, 4, INK),
    dot(58.5, 52.5, 4, INK),
    arc(50, 62, 10, 2.5, 'bottom', '#F2B8C6'),
    dot(50, 34, 16, '#F4F1EE'),
    dot(42, 36, 12, '#F4F1EE'),
    dot(58, 36, 12, '#F4F1EE'),
  ],
  donkey: [
    part('ear1', [oval(32, 20, 14, 36, '#9AA0A8', -15), oval(32, 22, 7, 26, '#F2B8C6', -15)]),
    part('ear2', [oval(68, 20, 14, 36, '#9AA0A8', 15), oval(68, 22, 7, 26, '#F2B8C6', 15)]),
    box(24, 30, 52, 64, '#9AA0A8', [26, 26, 24, 24]),
    box(30, 62, 40, 30, '#E6E0D8', 15),
    oval(42, 74, 5, 7, INK),
    oval(58, 74, 5, 7, INK),
    arc(50, 80, 12, 2.5, 'bottom'),
    ...eyes(40, 60, 50, 7),
    box(44, 24, 12, 12, '#5A4A44', 6),
  ],
  raccoon: [
    part('ears', [tri(26, 22, 22, 22, '#7D7F88', -25), tri(74, 22, 22, 22, '#7D7F88', 25), tri(26, 24, 10, 10, '#3B3F47', -25), tri(74, 24, 10, 10, '#3B3F47', 25)]),
    oval(50, 56, 80, 62, '#9EA1AA'),
    oval(50, 68, 40, 28, WHITE),
    box(14, 42, 72, 20, '#3B3F47', 10),
    dot(34, 52, 12, WHITE),
    dot(66, 52, 12, WHITE),
    part('eyes', [dot(34, 52, 6, INK), dot(66, 52, 6, INK)]),
    oval(50, 64, 10, 7, INK),
    arc(50, 68, 10, 2.5, 'bottom'),
  ],
  shark: [
    part('swim', [
      tri(50, 24, 22, 28, '#6E8BB3', 15),
      tri(88, 50, 26, 30, '#6E8BB3', -90),
      oval(48, 54, 76, 38, '#7FA0C8'),
      oval(44, 64, 56, 16, '#E6EEF6'),
      tri(46, 72, 14, 14, '#6E8BB3', 200),
      ...eyes(24, 36, 48, 6),
      box(16, 58, 22, 8, WHITE, [0, 0, 4, 4], { edge: { w: 2, c: INK } }),
      bar(62, 46, 62, 56, 2, '#6E8BB3'),
      bar(68, 46, 68, 56, 2, '#6E8BB3'),
    ]),
    arc(20, 96, 24, 4, 'top', SKY),
    arc(80, 96, 24, 4, 'top', SKY),
  ],
  seal: [
    part('ball', [dot(50, 14, 22, RED), box(39, 11, 22, 6, WHITE, 3), dot(50, 14, 6, SUN)]),
    oval(76, 88, 22, 10, '#8D99A6', -20),
    oval(52, 70, 60, 40, '#A3AEBB'),
    dot(42, 48, 44, '#A3AEBB'),
    oval(30, 84, 18, 10, '#8D99A6', 30),
    ...eyes(34, 50, 44, 7),
    oval(42, 54, 14, 10, '#C9D1DA'),
    dot(42, 52, 5, INK),
    bar(32, 56, 24, 54, 1.5, INK),
    bar(52, 56, 60, 54, 1.5, INK),
  ],
  seahorse: [
    part('horse', [
      dot(52, 30, 34, '#F2A65A'),
      bar(64, 30, 82, 32, 12, '#F2A65A'),
      oval(50, 58, 32, 40, '#F2A65A'),
      oval(52, 60, 18, 28, '#FFD2A8'),
      ring(52, 84, 20, 7, '#F2A65A'),
      tri(30, 24, 12, 16, '#E8751A', -60),
      tri(32, 40, 10, 14, '#E8751A', -80),
      tri(30, 56, 10, 14, '#E8751A', -90),
      oval(66, 52, 10, 16, '#FFD2A8', -20),
      dot(56, 26, 7, INK),
      dot(57, 25, 2, WHITE),
      dot(60, 34, 5, CHEEK),
    ]),
    part('bubbles', [ring(84, 18, 8, 2, SKY), ring(90, 8, 5, 1.5, SKY)]),
  ],
  shrimp: [
    bar(30, 24, 10, 8, 1.5, '#E8751A'),
    bar(34, 22, 22, 4, 1.5, '#E8751A'),
    part('body', [
      tri(80, 74, 20, 18, '#F28C5A', 120),
      ...[[34, 34, 30], [48, 40, 28], [60, 50, 26], [68, 62, 22], [74, 72, 18]].map(([x, y, d]) => dot(x, y, d, '#F7A07A')),
      ...[[48, 40], [60, 50], [68, 62]].map(([x, y]) => arc(x, y, 22, 2, 'right', '#E8751A')),
      ...eyes(30, 38, 32, 5),
      bar(42, 54, 38, 62, 2, '#E8751A'),
      bar(54, 62, 50, 70, 2, '#E8751A'),
    ]),
  ],
  coral: [
    box(10, 84, 80, 10, '#F2D49B', 5),
    part('coral', [
      bar(50, 86, 50, 40, 9, '#FF7E9D'),
      bar(50, 60, 30, 40, 7, '#FF7E9D'),
      bar(30, 40, 26, 22, 6, '#FF7E9D'),
      bar(50, 52, 70, 34, 7, '#FF7E9D'),
      bar(70, 34, 76, 18, 6, '#FF7E9D'),
      bar(50, 40, 46, 20, 6, '#FF7E9D'),
      ...[[26, 22], [76, 18], [46, 20], [50, 40]].map(([x, y]) => dot(x, y, 9, '#FFB3C4')),
    ]),
    part('fish', [oval(78, 60, 14, 9, SUN), tri(86, 60, 7, 7, SUN, -90), dot(75, 59, 2.5, INK)]),
    oval(20, 82, 14, 8, '#9B6BD3'),
  ],
  sandcastle: [
    box(6, 82, 88, 12, '#E9C98A', 6),
    box(20, 46, 60, 40, '#F2D49B'),
    box(14, 30, 20, 56, '#F2D49B'),
    box(66, 30, 20, 56, '#F2D49B'),
    ...[14, 22, 30, 66, 74, 82].map((x) => box(x - 1, 24, 6, 8, '#F2D49B')),
    box(42, 62, 16, 24, '#C9A46B', [8, 8, 0, 0]),
    dot(24, 44, 5, '#C9A46B'),
    dot(76, 44, 5, '#C9A46B'),
    bar(50, 46, 50, 22, 2, BROWN),
    part('flag', [tri(57, 26, 12, 14, RED, 90)]),
    oval(86, 88, 12, 6, '#F7C6A8'),
  ],
  'swim-ring': [part('ring', [ring(50, 52, 84, 26, '#F25C5C'), ...[0, 90, 180, 270].map((t) => box(50 + 35.5 * Math.cos((t * Math.PI) / 180) - 6.5, 52 + 35.5 * Math.sin((t * Math.PI) / 180) - 13, 13, 26, WHITE, 2, { turn: t })), arc(50, 52, 68, 3, 'top', '#FF9A9A')])],
  surfboard: [
    arc(50, 106, 90, 8, 'top', '#3F86D1'),
    part('board', [tilt(30, [50, 50], [box(36, 6, 28, 88, '#FFB25B', 14, { edge: { w: 2.5, c: '#E8751A' } }), box(47, 6, 6, 88, '#5B8DEF'), dot(50, 70, 10, WHITE), dot(50, 70, 6, RED)])]),
  ],
  'flip-flops': [
    tilt(-12, [32, 52], [box(18, 12, 28, 80, '#5B8DEF', 14), arc(32, 40, 24, 4, 'top', WHITE), bar(32, 30, 32, 38, 3.5, WHITE)]),
    part('right', [tilt(12, [68, 52], [box(54, 12, 28, 80, '#5B8DEF', 14), arc(68, 40, 24, 4, 'top', WHITE), bar(68, 30, 68, 38, 3.5, WHITE)])]),
  ],
  'diving-mask': [
    part('mask', [
      bar(16, 54, 6, 52, 6, '#3B3F47'),
      bar(84, 54, 94, 52, 6, '#3B3F47'),
      box(12, 32, 76, 42, '#F2C14E', 16),
      box(18, 38, 30, 30, '#BFE3F7', 12),
      box(52, 38, 30, 30, '#BFE3F7', 12),
      bar(24, 46, 30, 40, 2.5, WHITE),
      bar(58, 46, 64, 40, 2.5, WHITE),
      bar(86, 30, 86, 6, 6, '#5B8DEF'),
      box(80, 0, 12, 8, '#3B3F47', 3),
    ]),
    part('bubbles', [ring(70, 86, 10, 2, SKY), ring(78, 78, 6, 1.5, SKY), ring(62, 92, 5, 1.5, SKY)]),
  ],
  tornado: [part('twist', [...[[50, 14, 76], [52, 28, 62], [48, 42, 50], [52, 56, 38], [48, 70, 26], [50, 82, 16]].map(([x, y, w]) => box(x - w / 2, y - 5, w, 10, '#9AA3AD', 5)), ...[[44, 14], [58, 42], [44, 70]].map(([x, y]) => bar(x - 6, y, x + 6, y, 2, '#C9CED6'))]), part('leaf', [oval(84, 30, 10, 6, '#6CC24A', 30)]), oval(50, 92, 30, 6, '#C9CED6')],
  fog: [...cloud(50, 34, 1.1, '#C9D2DE', '#A4B0C0'), part('mist', [bar(12, 62, 70, 62, 6, '#B8C0CC'), bar(30, 74, 88, 74, 6, '#C9D2DE'), bar(16, 86, 64, 86, 6, '#B8C0CC')])],
  hail: [part('hail', [...[[28, 70], [46, 82], [64, 70], [78, 86], [36, 92]].map(([x, y]) => dot(x, y, 9, '#DFF3FD')), ...[[28, 70], [46, 82], [64, 70], [78, 86], [36, 92]].map(([x, y]) => ring(x, y, 9, 1.5, '#9FC9E8'))]), ...cloud(50, 40, 1.2, '#9AA8BA', '#7B8798')],
  snowfall: [part('snow', [...[[26, 70], [44, 80], [62, 70], [78, 84], [36, 92], [56, 94]].map(([x, y]) => dot(x, y, 7, WHITE)), ...[[26, 70], [44, 80], [62, 70], [78, 84], [36, 92], [56, 94]].map(([x, y]) => ring(x, y, 8, 1, '#A4B0C0'))]), ...cloud(50, 40, 1.2, '#E3E9F0', '#A4B0C0')],
  'sun-shower': [
    part('rays', rays(32, 32, 22, 30, 8, 5, SUN)),
    dot(32, 32, 36, SUN),
    ...cloud(58, 52, 1, WHITE, CLOUD_EDGE),
    part('drops', [...[[46, 76], [62, 84], [76, 74]].map(([x, y]) => box(x - 3, y - 3, 7, 7, TEAR, [0, 3.5, 3.5, 3.5], { turn: 45 }))]),
  ],
  'cloudy-night': [part('moon', crescent(36, 36, 28, 22, MOON)), part('stars', [...star(80, 16, 10, SUN), ...star(14, 74, 8, SUN)]), part('cloud', cloud(58, 64, 1.1, '#C9D2DE', '#A4B0C0'))],
  sunset: [
    box(4, 8, 92, 56, 'transparent', 0, { inside: [part('sun', [dot(46, 60, 52, ORANGE), dot(46, 60, 40, '#FF9F5A')])] }),
    box(4, 62, 92, 12, '#9B6BD3', 6),
    box(10, 76, 80, 6, '#B58DE3', 3),
    box(22, 86, 56, 5, '#C9A3E6', 2.5),
    part('birds', [arc(20, 24, 10, 2.5, 'top', '#7D7F88'), arc(29, 24, 10, 2.5, 'top', '#7D7F88'), arc(74, 18, 8, 2.5, 'top', '#7D7F88'), arc(81, 18, 8, 2.5, 'top', '#7D7F88')]),
  ],
  'autumn-leaves': [
    part('leaf1', [oval(36, 38, 30, 46, '#E8751A', -30), bar(24, 60, 46, 20, 2, '#B85A12')]),
    part('leaf2', [oval(66, 58, 28, 42, '#D9443F', 30), bar(76, 80, 56, 38, 2, '#A3242C')]),
    part('leaf3', [oval(38, 80, 22, 30, SUN, 70), bar(24, 84, 52, 76, 2, '#C98A1D')]),
  ],
  puddle: [
    part('splash', [dot(16, 66, 6, SKY), dot(84, 64, 6, SKY), dot(24, 56, 4, SKY), dot(76, 54, 4, SKY)]),
    oval(50, 86, 88, 18, '#5BA4E6'),
    oval(50, 84, 70, 10, '#7FC4F0'),
    part('boots', [box(26, 26, 18, 50, '#F2C14E', [4, 4, 0, 0]), box(26, 68, 26, 14, '#F2C14E', [0, 8, 6, 4]), box(56, 26, 18, 50, '#F2C14E', [4, 4, 0, 0]), box(56, 68, 26, 14, '#F2C14E', [0, 8, 6, 4]), box(24, 26, 22, 6, '#E0A92A', 3), box(54, 26, 22, 6, '#E0A92A', 3)]),
  ],
  lightning: [part('bolt', [bar(64, 8, 36, 52, 16, '#E0A92A'), bar(36, 52, 64, 50, 16, '#E0A92A'), bar(64, 50, 38, 92, 16, '#E0A92A'), bar(64, 8, 36, 52, 11, SUN), bar(36, 52, 64, 50, 11, SUN), bar(64, 50, 38, 92, 11, SUN), bar(56, 18, 46, 36, 3, '#FFF1A8')])],
  'scorching-sun': [
    part('rays', rays(50, 50, 36, 46, 12, 6, '#F28C28')),
    dot(50, 50, 64, SUN),
    box(26, 40, 21, 13, INK, [3, 3, 9, 9]),
    box(53, 40, 21, 13, INK, [3, 3, 9, 9]),
    bar(46, 43, 54, 43, 3, INK),
    arc(50, 56, 22, 4, 'bottom'),
    part('sweat', [box(76, 30, 8, 8, TEAR, [0, 4, 4, 4], { turn: 45 })]),
  ],
  mars: [part('planet', [dot(50, 50, 76, '#D9603B'), dot(34, 36, 14, '#B84A2B'), dot(64, 62, 18, '#B84A2B'), dot(60, 30, 8, '#B84A2B'), dot(36, 66, 8, '#E8805E'), oval(50, 16, 24, 8, '#FFE9E0')]), ...eyes(42, 58, 48, 6), arc(50, 52, 10, 2.5, 'bottom')],
  jupiter: [
    part('planet', [dot(50, 50, 80, '#E8B07A'), box(10, 10, 80, 80, 'transparent', 40, { inside: [box(0, 18, 80, 8, '#C98A5A'), box(0, 34, 80, 6, '#F2D3B0'), box(0, 48, 80, 8, '#C98A5A'), box(0, 62, 80, 6, '#B87648'), oval(58, 54, 16, 10, '#D9603B')] })]),
    ...eyes(40, 60, 46, 7),
    arc(50, 50, 10, 2.5, 'bottom'),
  ],
  galaxy: [part('swirl', [oval(50, 50, 90, 50, '#5B3E96', -20), oval(50, 50, 64, 34, '#9B6BD3', -20), oval(50, 50, 36, 20, '#FF9ED8', -20), dot(50, 50, 14, '#FFF1A8'), ...[[18, 34], [80, 64], [30, 70], [72, 28]].map(([x, y]) => dot(x, y, 4, WHITE))]), part('stars', [...star(14, 14, 10, SUN), ...star(88, 88, 10, SUN)])],
  constellation: [
    bar(16, 70, 34, 46, 2, '#9FB8C8'),
    bar(34, 46, 56, 52, 2, '#9FB8C8'),
    bar(56, 52, 72, 28, 2, '#9FB8C8'),
    bar(56, 52, 80, 74, 2, '#9FB8C8'),
    bar(72, 28, 90, 16, 2, '#9FB8C8'),
    part('stars', [...[[16, 70], [34, 46], [56, 52], [72, 28], [80, 74], [90, 16]].flatMap(([x, y]) => star(x, y, 14, SUN))]),
  ],
  meteor: [part('fall', [tri(30, 30, 18, 44, '#FF7E3C', -45), tri(32, 32, 10, 36, SUN, -45), dot(56, 56, 34, '#8B6B4A'), dot(50, 50, 8, '#6B4A33'), dot(62, 60, 10, '#6B4A33'), dot(54, 66, 5, '#6B4A33')])],
  'full-moon': [part('moon', [dot(50, 50, 84, '#E6E2D6'), dot(32, 34, 16, '#C9C3B3'), dot(64, 28, 10, '#C9C3B3'), dot(68, 62, 20, '#C9C3B3'), dot(36, 70, 12, '#C9C3B3'), ...eyes(42, 58, 48, 7), arc(50, 52, 12, 2.5, 'bottom'), ...cheeksAt(34, 66, 56, 7)])],
  'moon-rover': [
    box(4, 84, 92, 10, '#C9C3B3', 5),
    part('rover', [
      bar(30, 40, 22, 20, 2.5, '#9AA3AD'),
      dot(22, 18, 8, '#5B8DEF'),
      box(18, 40, 64, 26, '#EEF1F5', 6, { edge: { w: 2.5, c: '#9AA3AD' } }),
      box(52, 30, 26, 12, '#5B8DEF', 3),
      box(26, 46, 12, 10, '#BFE3F7', 3),
      ...[28, 50, 72].map((x) => dot(x, 74, 18, '#3B3F47')),
      ...[28, 50, 72].map((x) => dot(x, 74, 7, '#9AA3AD')),
    ]),
  ],
  'space-station': [part('station', [box(6, 38, 26, 24, BLUE, 2, { edge: { w: 2, c: '#2F5BA8' } }), box(68, 38, 26, 24, BLUE, 2, { edge: { w: 2, c: '#2F5BA8' } }), bar(32, 50, 68, 50, 4, '#9AA3AD'), box(38, 36, 24, 28, '#EEF1F5', 12, { edge: { w: 2.5, c: '#9AA3AD' } }), dot(50, 50, 10, SKY), bar(50, 36, 50, 22, 2.5, '#9AA3AD'), dot(50, 20, 6, RED)]), part('stars', [...star(16, 16, 10, SUN), ...star(84, 84, 10, SUN)])],
  'bright-star': [part('glow', [dot(50, 52, 86, '#FFF1A8')]), part('star', [...star(50, 52, 80, GOLD), ...star(50, 53, 66, SUN), ...eyes(42, 58, 50, 7), arc(50, 54, 10, 2.5, 'bottom'), ...cheeksAt(36, 64, 60, 6)])],
  'alien-hello': [
    bar(38, 18, 32, 6, 3, '#4E9E33'),
    bar(62, 18, 68, 6, 3, '#4E9E33'),
    dot(32, 6, 7, SUN),
    dot(68, 6, 7, SUN),
    part('arm', [bar(76, 64, 90, 38, 7, '#7CD35C'), dot(90, 36, 12, '#7CD35C')]),
    box(20, 14, 60, 72, '#7CD35C', [30, 30, 28, 28]),
    oval(38, 46, 14, 20, INK, 30),
    oval(62, 46, 14, 20, INK, -30),
    dot(36, 42, 4, WHITE),
    dot(60, 42, 4, WHITE),
    arc(50, 62, 16, 3, 'bottom'),
  ],
  'rocket-launch': [
    part('smoke', [dot(28, 88, 22, '#D6DCE4'), dot(50, 92, 26, '#E6EBF0'), dot(72, 88, 22, '#D6DCE4')]),
    part('rocket', [
      oval(50, 78, 12, 22, ORANGE),
      oval(50, 76, 6, 12, SUN),
      box(30, 52, 12, 20, RED, [8, 2, 2, 4]),
      box(58, 52, 12, 20, RED, [2, 8, 4, 2]),
      box(38, 8, 24, 62, '#EEF1F5', [12, 12, 4, 4], { edge: { w: 2.5, c: '#B8C0CC' } }),
      box(38, 8, 24, 14, RED, [12, 12, 0, 0]),
      dot(50, 36, 12, SKY),
    ]),
  ],
  'space-cat': [
    part('cat', [
      tri(32, 24, 20, 22, '#F2A65A', -18),
      tri(68, 24, 20, 22, '#F2A65A', 18),
      dot(50, 52, 60, '#F2A65A'),
      ...eyes(40, 60, 50, 7),
      tri(50, 58, 6, 5, PINK_DARK, 180),
      arc(46, 60, 7, 2, 'bottom'),
      arc(54, 60, 7, 2, 'bottom'),
      ring(50, 48, 84, 4, '#BFE3F7'),
      oval(26, 26, 14, 8, '#E6F4FC', -40),
    ]),
    part('stars', [...star(12, 84, 10, SUN), ...star(90, 12, 8, SUN)]),
  ],
  champagne: [
    part('pop', [dot(70, 14, 6, '#FFF1A8'), dot(80, 8, 5, '#FFF1A8'), dot(82, 22, 4, '#FFF1A8'), oval(76, 28, 10, 8, '#C98A42', 30)]),
    tilt(30, [44, 60], [box(34, 44, 20, 48, '#2F7A3A', 6), box(38, 22, 12, 26, '#2F7A3A', [4, 4, 0, 0]), box(36, 18, 16, 10, GOLD, 3), box(34, 58, 20, 18, '#F2D49B'), dot(44, 67, 6, RED)]),
  ],
  confetti: [part('burst', [...Array.from({ length: 14 }, (_, i) => {
    const turn = (i * 360) / 14 * (Math.PI / 180);
    const r = i % 2 ? 26 : 38;
    const c = [RED, SUN, BLUE, '#7CC36E', PINK, PURPLE, SKY][i % 7];
    return i % 3 ? bar(50 + r * Math.cos(turn) - 3, 50 + r * Math.sin(turn) - 2, 50 + r * Math.cos(turn) + 3, 50 + r * Math.sin(turn) + 2, 4, c) : dot(50 + r * Math.cos(turn), 50 + r * Math.sin(turn), 7, c);
  }), ...star(50, 50, 26, SUN)])],
  'carnival-mask': [
    part('mask', [
      box(10, 34, 80, 34, PURPLE, [30, 30, 14, 14]),
      box(22, 42, 22, 14, '#2C1E3F', 7),
      box(56, 42, 22, 14, '#2C1E3F', 7),
      dot(50, 60, 8, GOLD),
      dot(16, 40, 6, GOLD),
      dot(84, 40, 6, GOLD),
      tri(74, 22, 10, 30, '#FF7EB6', 30),
      tri(82, 24, 8, 26, SKY, 50),
    ]),
    bar(18, 66, 10, 94, 3, GOLD),
  ],
  'new-year': [
    part('sparks', [...rays(50, 52, 42, 48, 12, 3, SUN)]),
    dot(50, 52, 76, '#C9CED6'),
    dot(50, 52, 68, WHITE),
    ...Array.from({ length: 12 }, (_, i) => dot(50 + 28 * Math.cos((i * 30 * Math.PI) / 180), 52 + 28 * Math.sin((i * 30 * Math.PI) / 180), i % 3 ? 3 : 5, INK)),
    bar(50, 52, 50, 28, 4, INK),
    part('hand', [bar(50, 52, 50, 34, 2.5, RED)]),
    dot(50, 52, 7, INK),
  ],
  'baby-rattle': [part('rattle', [bar(56, 56, 84, 86, 7, '#F7A8C0'), dot(86, 88, 12, '#F7A8C0'), dot(42, 40, 50, SKY), dot(42, 40, 38, '#BFE3F7'), dot(34, 32, 8, WHITE), heart(42, 42, 16, '#FF7EB6'), ring(42, 40, 50, 3, '#5BA4E6')]), part('stars', [...star(84, 18, 12, SUN), ...star(14, 82, 10, SUN)])],
  vasilopita: [
    box(8, 74, 84, 10, '#C9CED6', 5),
    box(12, 40, 76, 38, '#E8A04A', [20, 20, 8, 8]),
    box(12, 40, 76, 12, '#F7E4C2', [20, 20, 0, 0]),
    ...[[30, 46], [44, 44], [58, 46], [72, 44]].map(([x, y]) => dot(x, y, 4, '#D9A85E')),
    box(36, 52, 28, 8, '#F7E4C2', 4),
    part('coin', [dot(70, 26, 20, GOLD), dot(70, 26, 14, SUN), bar(70, 21, 70, 31, 2.5, GOLD)]),
    part('shine', [...star(26, 22, 10, SUN), ...star(88, 12, 8, SUN)]),
  ],
  'good-evening': card('#FFC9A8', '#F28C5A', INK, [box(72, 11, 24, 13, 'transparent', 0, { inside: [dot(12, 13, 22, ORANGE)] }), bar(70, 24, 98, 24, 2.5, '#F28C5A')]),
  'sweet-dreams': card('#C9D3F2', '#8D9EDB', INK, [...littleMoon(84, 24, [bar(79, 23, 82, 23, 1.8, INK), bar(86, 23, 89, 23, 1.8, INK)]), bar(68, 14, 73, 14, 2, '#5B6FC2'), bar(73, 14, 68, 19, 2, '#5B6FC2'), bar(68, 19, 73, 19, 2, '#5B6FC2')]),
  kisses: card('#FFD1E1', '#F28FB1', INK, [box(77, 18, 14, 6, RED, 3), box(77, 24, 14, 6, RED, 3), heart(92, 14, 8, '#FF7EB6')]),
  hugs: card('#FFE3B8', '#F2B95B', INK, [heart(84, 24, 20, '#F28C28'), oval(74, 28, 8, 14, '#F2D49B', 40), oval(94, 28, 8, 14, '#F2D49B', -40)]),
  haha: card('#FFF1A8', '#F2D04E', INK, [...littleMoon(84, 24, [arc(80, 23, 5, 1.8, 'top'), arc(88, 23, 5, 1.8, 'top'), box(80, 26, 8, 5, INK, [0, 0, 4, 4])]), box(72, 16, 3, 5, TEAR, 1.5), box(94, 16, 3, 5, TEAR, 1.5)]),
  wow: card('#D9C9FA', '#A98DEA', INK, [...star(84, 23, 24, GOLD), ...star(84, 23.5, 15, SUN), dot(70, 12, 3, GOLD), dot(96, 34, 3, GOLD)]),
  'greek-coffee': [
    box(10, 78, 80, 10, '#C9CED6', 5),
    box(14, 76, 72, 6, WHITE, 3),
    box(28, 40, 40, 38, WHITE, [4, 4, 16, 16], { edge: { w: 2.5, c: '#C9CED6' } }),
    box(66, 48, 12, 14, 'transparent', 7, { edge: { w: 3, c: '#C9CED6' } }),
    box(31, 42, 34, 8, '#C9A27A', 3),
    dot(40, 45, 3, '#E8D3B8'),
    dot(52, 46, 4, '#E8D3B8'),
    box(32, 56, 32, 4, '#5B8DEF', 2),
    bar(42, 16, 44, 30, 3, STEAM),
    bar(54, 12, 56, 30, 3, STEAM),
    dot(86, 64, 10, '#F7F2EA'),
    dot(86, 64, 6, '#C9CED6'),
  ],
  baklava: [
    box(6, 80, 88, 10, '#C9CED6', 5),
    ...[[16, 52], [46, 52]].map(([x, y]) => box(x, y, 38, 30, '#E8B060', 3, { inside: [box(0, 8, 38, 2, '#C98A42'), box(0, 16, 38, 2, '#C98A42'), box(0, 24, 38, 2, '#C98A42'), box(0, 0, 38, 7, '#F2C77A')] })),
    box(32, 30, 38, 26, '#E8B060', 3, { inside: [box(0, 8, 38, 2, '#C98A42'), box(0, 16, 38, 2, '#C98A42'), box(0, 0, 38, 7, '#F2C77A')] }),
    ...[[40, 30], [52, 31], [62, 30], [26, 52], [66, 52]].map(([x, y]) => dot(x, y, 4, '#7CC36E')),
  ],
  spanakopita: [
    box(6, 82, 88, 10, '#C9CED6', 5),
    tri(50, 54, 84, 56, '#E8B060'),
    tri(50, 58, 70, 44, '#F2C77A'),
    bar(30, 70, 70, 70, 2, '#C98A42'),
    bar(38, 58, 62, 58, 2, '#C98A42'),
    bar(44, 46, 56, 46, 2, '#C98A42'),
    oval(50, 82, 60, 6, '#4FA34A'),
    dot(30, 82, 4, WHITE),
    dot(62, 83, 4, WHITE),
  ],
  cookie: [dot(50, 50, 84, '#D9A066'), dot(50, 50, 76, '#E8B47A'), ...[[34, 34], [60, 30], [70, 52], [40, 62], [56, 70], [28, 50], [52, 48]].map(([x, y], i) => dot(x, y, i % 2 ? 9 : 11, '#5A3A2A'))],
  lemonade: [
    box(26, 22, 48, 70, GLASS, [4, 4, 12, 12], { edge: { w: 2.5, c: GLASS_EDGE } }),
    box(29, 34, 42, 55, '#FFE58A', [0, 0, 9, 9]),
    box(36, 44, 10, 10, WHITE, 2, { turn: 15 }),
    box(52, 58, 10, 10, WHITE, 2, { turn: -12 }),
    bar(60, 4, 52, 40, 4, '#E5484D'),
    dot(74, 24, 26, '#F2C14E'),
    dot(74, 24, 20, '#FFE58A'),
    ...rays(74, 24, 2, 9, 6, 1.5, '#F2C14E'),
    oval(36, 20, 10, 6, '#6CC24A', -20),
  ],
  chocolate: [
    tilt(-15, [50, 50], [
      box(22, 14, 56, 74, '#6B3A1F', 4, { inside: [...[0, 1, 2].flatMap((r) => [0, 1].map((c) => box(4 + c * 26, 4 + r * 22, 22, 18, '#7E4A2A', 3)))] }),
      box(20, 46, 60, 44, '#E5484D', [0, 0, 4, 4]),
      box(20, 46, 60, 6, '#C93A3F'),
      box(36, 60, 28, 14, GOLD, 3),
    ]),
  ],

  // Cats.
  'cat-hello': catFace(mood('smile', CAT), { front: catPaw(84, 70) }),
  'cat-love': catFace(mood('love', CAT)),
  'cat-laugh': catFace(mood('laugh', CAT)),
  'cat-happy': catFace(mood('happy', CAT)),
  'cat-sad': catFace(mood('sad', CAT)),
  'cat-angry': catFace(mood('angry', CAT), { c: '#E8875A', dark: '#C9643B' }),
  'cat-sleep': catFace([...mood('sleep', CAT), ...zees(76, 6)]),
  'cat-wow': catFace(mood('wow', CAT)),
  'cat-wink': catFace(mood('wink', CAT)),
  'cat-cool': catFace(mood('cool', CAT)),
  'cat-shy': catFace(mood('shy', CAT)),
  'cat-cry': catFace(mood('cry', CAT)),
  'cat-kiss': catFace(mood('kiss', CAT)),
  'cat-tongue': catFace(mood('tongue', CAT)),
  'cat-dizzy': catFace([...mood('dizzy', CAT), ...dizzyStars(50, 8)]),
  'cat-think': catFace([...mood('think', CAT), ...thought(82, 14)]),
  'cat-heart': catFace(mood('happy', CAT), { front: [...heldHeart(50, 80, 24), oval(36, 82, 12, 10, '#F2A65A'), oval(64, 82, 12, 10, '#F2A65A')] }),
  'cat-coffee': catFace(mood('smile', CAT), { front: [...coffeeCup(50, 82), oval(36, 86, 12, 10, '#F2A65A'), oval(64, 86, 12, 10, '#F2A65A')] }),
  'cat-party': [...catFace(mood('laugh', CAT)), ...partyHat(50, 22)],
  'cat-ok': [...catFace(mood('happy', CAT)), ...tick(82, 82)],
  'cat-yarn': catFace(mood('smile', CAT), { front: [part('yarn', [dot(78, 82, 30, '#9B6BD3'), arc(78, 82, 22, 2, 'top', '#C9A3E6'), arc(78, 82, 14, 2, 'bottom', '#C9A3E6'), bar(64, 90, 40, 96, 2, '#9B6BD3')])] }),
  'cat-fish': catFace(mood('happy', CAT), { front: [part('fish', [oval(50, 80, 28, 14, '#7FB5DE'), tri(68, 80, 12, 14, '#5BA4E6', -90), dot(42, 78, 3, INK)])] }),
  'cat-box': [box(0, 0, 100, 62, 'transparent', 0, { inside: [part('cat', catFace(mood('smile', CAT)))] }), box(8, 56, 84, 40, '#D9A066', 4, { edge: { w: 2.5, c: '#B8844E' } }), box(8, 56, 84, 8, '#C9905A', 2), bar(50, 66, 50, 94, 3, '#B8844E'), oval(30, 58, 14, 10, '#F2A65A'), oval(70, 58, 14, 10, '#F2A65A')],
  'black-cat': catFace([oval(37, 53, 10, 12, '#F7D35A'), oval(63, 53, 10, 12, '#F7D35A'), part('pupils', [oval(37, 53, 3, 9, INK), oval(63, 53, 3, 9, INK)]), arc(50, 62, 14, 3, 'bottom', '#8A8F99')], { c: '#3B3F47', dark: '#2B2E35', inner: '#6B6F79' }),

  // Dogs.
  'dog-hello': dogFace(mood('smile', DOG), { front: dogPaw(84, 74) }),
  'dog-love': dogFace(mood('love', DOG)),
  'dog-laugh': dogFace(mood('laugh', DOG)),
  'dog-happy': dogFace(mood('happy', DOG)),
  'dog-sad': dogFace(mood('sad', DOG)),
  'dog-angry': dogFace(mood('angry', DOG), { c: '#E0834F' }),
  'dog-sleep': dogFace([...mood('sleep', DOG), ...zees(76, 6)]),
  'dog-wow': dogFace(mood('wow', DOG)),
  'dog-wink': dogFace(mood('wink', DOG)),
  'dog-cool': dogFace(mood('cool', DOG)),
  'dog-shy': dogFace(mood('shy', DOG)),
  'dog-cry': dogFace(mood('cry', DOG)),
  'dog-kiss': dogFace(mood('kiss', DOG)),
  'dog-tongue': dogFace(mood('tongue', DOG)),
  'dog-dizzy': dogFace([...mood('dizzy', DOG), ...dizzyStars(50, 8)]),
  'dog-think': dogFace([...mood('think', DOG), ...thought(82, 14)]),
  'dog-heart': dogFace(mood('happy', DOG), { front: [...heldHeart(50, 84, 22), oval(36, 88, 12, 10, DOG_FUR), oval(64, 88, 12, 10, DOG_FUR)] }),
  'dog-coffee': dogFace(mood('smile', DOG), { front: [...coffeeCup(50, 89), oval(36, 93, 12, 10, DOG_FUR), oval(64, 93, 12, 10, DOG_FUR)] }),
  'dog-party': [...dogFace(mood('laugh', DOG)), ...partyHat(50, 22)],
  'dog-ok': [...dogFace(mood('happy', DOG)), ...tick(82, 82)],
  'dog-ball': dogFace(mood('smile', DOG), { front: [part('ball', [box(68, 70, 24, 24, '#CDE14B', 12, { inside: [arc(-5, 12, 24, 2.5, 'right', WHITE), arc(29, 12, 24, 2.5, 'left', WHITE)] })])] }),
  'dog-bone': dogFace(mood('happy', DOG), { front: [part('bone', [tilt(-6, [50, 76], [...bone('#C9B08A', 1.5), ...bone('#FFF8EA')])])] }),
  'dog-bath': [
    part('dog', dogFace(mood('happy', DOG), { front: foam([[40, 23, 9.5], [50, 20, 11.5], [60, 23, 9.5]]) })),
    part('bubbles', [ring(14, 22, 10, 2, TEAR), ring(86, 16, 12, 2, TEAR), ring(90, 36, 7, 2, TEAR)]),
    oval(24, 97, 8, 6, GOLD),
    oval(76, 97, 8, 6, GOLD),
    box(10, 78, 80, 18, WHITE, [2, 2, 16, 16], { edge: { w: 2.5, c: GLASS_EDGE } }),
    box(5, 74, 90, 8, WHITE, 4, { edge: { w: 2.5, c: GLASS_EDGE } }),
    ...foam([[14, 73, 10], [24, 71, 12], [34, 74, 9], [66, 74, 9], [76, 71, 12], [86, 73, 10]]),
  ],
  dalmatian: dogFace(mood('smile', DOG), {
    c: WHITE,
    ear: '#3B3F47',
    muzzle: '#ECEEF1',
    blaze: false,
    edge: '#C9CED6',
    spots: [dot(36, 30, 7, '#2B2E35'), dot(61, 28, 8, '#2B2E35'), dot(50, 37, 4, '#2B2E35'), dot(70, 37, 4.5, '#2B2E35'), dot(28, 79, 7, '#2B2E35'), dot(73, 81, 6, '#2B2E35'), dot(38, 87, 4.5, '#2B2E35'), dot(63, 88, 4, '#2B2E35')],
  }),

  // Monsters.
  'monster-happy': monster(mood('smile', MONSTER)),
  'monster-wave': monster(mood('happy', MONSTER), { c: '#5BC8E8', dark: '#3AA5C8', top: 'antennae' }),
  'monster-love': monster(mood('love', MONSTER), { c: '#F7A8C0', dark: '#E58AA6' }),
  'monster-laugh': monster(mood('laugh', MONSTER), { c: '#F2C14E', dark: '#D9A22F', top: 'spikes' }),
  'monster-sad': monster(mood('sad', MONSTER), { c: '#8DA9E8', dark: '#6B8BD6', top: 'none' }),
  'monster-grumpy': monster(mood('angry', MONSTER), { c: '#E5484D', dark: '#C93A3F' }),
  'monster-sleep': monster([...mood('sleep', MONSTER), ...zees(76, 6)], { c: '#9B6BD3', dark: '#7A4FB5', top: 'fur' }),
  'monster-wow': monster(mood('wow', MONSTER), { c: '#FF8C42', dark: '#E8751A', top: 'antennae' }),
  'monster-wink': monster(mood('wink', MONSTER), { c: '#5BC8A8', dark: '#3AA588' }),
  'monster-cool': monster(mood('cool', MONSTER), { c: '#4A5D96', dark: '#36467A', top: 'spikes' }),
  'monster-shy': monster(mood('shy', MONSTER), { c: '#FFB3C4', dark: '#F28FA8', top: 'none' }),
  'monster-cry': monster(mood('cry', MONSTER), { c: '#7FC4F0', dark: '#5BA4E6', top: 'fur' }),
  'monster-kiss': monster(mood('kiss', MONSTER), { c: '#C9A3E6', dark: '#A97FD3' }),
  'monster-silly': monster(mood('tongue', MONSTER), { c: '#A3D65C', dark: '#82B83E', top: 'antennae' }),
  'monster-dizzy': monster([...mood('dizzy', MONSTER), ...dizzyStars(50, 10)], { c: '#F2A65A', dark: '#D9823B', top: 'none' }),
  'monster-think': monster([...mood('think', MONSTER), ...thought(84, 14)], { c: '#9AA3AD', dark: '#7D868F', top: 'horns' }),
  'monster-party': [...monster(mood('laugh', MONSTER), { c: '#FF7EB6', dark: '#E55E9A', top: 'none' }), ...partyHat(50, 26)],
  'monster-hungry': monster([...mood('happy', MONSTER), part('mouth', [box(30, 54, 40, 22, INK, [4, 4, 20, 20], { inside: [tri(8, 2, 8, 8, WHITE, 180), tri(20, 2, 8, 8, WHITE, 180), tri(32, 2, 8, 8, WHITE, 180), box(12, 12, 16, 10, RED, 5)] })]), part('cookie', [dot(84, 80, 22, '#D9A066'), dot(80, 76, 4, '#5A3A2A'), dot(88, 82, 4, '#5A3A2A'), dot(82, 86, 3, '#5A3A2A')])], { c: '#3FB2C8', dark: '#2A93A8', top: 'fur' }),
  'monster-one-eye': monster([part('eye', [dot(50, 44, 26, WHITE), dot(50, 46, 14, '#4FA34A'), dot(50, 46, 8, INK), dot(53, 42, 4, WHITE)]), arc(50, 58, 20, 3, 'bottom')], { c: '#9B6BD3', dark: '#7A4FB5', top: 'horns' }),
  'monster-three-eyes': monster([part('eyes', [...[[34, 46], [50, 36], [66, 46]].flatMap(([x, y]) => [dot(x, y, 14, WHITE), dot(x, y + 1, 7, INK)])]), arc(50, 58, 16, 3, 'bottom')], { c: '#F2C14E', dark: '#D9A22F', top: 'antennae' }),
  'monster-furry': monster(mood('smile', MONSTER), { c: '#C98A5A', dark: '#A86E42', top: 'fur' }),
  'monster-spiky': monster(mood('wink', MONSTER), { c: '#E8751A', dark: '#C95A0A', top: 'spikes' }),
  'monster-bouncy': [part('tiny', monster(mood('smile', MONSTER), { c: '#7FD1F2', dark: '#5BB3D9', top: 'antennae' }))],
  'monster-heart': monster(mood('happy', MONSTER), { c: '#5BC8A8', dark: '#3AA588', top: 'horns', front: heldHeart(50, 76, 26) }),

  // Robots.
  'robot-hello': robot(mood('smile', ROBOT), { arm2: [bar(72, 76, 86, 58, 6, '#9AA3AD'), dot(87, 56, 9, '#C9CED6')] }),
  'robot-happy': robot(mood('happy', ROBOT)),
  'robot-love': robot(mood('love', ROBOT), { c: '#F7C6D3', dark: '#E59AB0' }),
  'robot-laugh': robot(mood('laugh', ROBOT)),
  'robot-sad': robot(mood('sad', ROBOT), { c: '#B8C7E6', dark: '#8DA0CC' }),
  'robot-angry': robot(mood('angry', { ...ROBOT, ink: '#FF8A8A' }), { c: '#E8A0A0', dark: '#C97A7A' }),
  'robot-sleep': robot([...mood('sleep', ROBOT), ...zees(78, 0)]),
  'robot-wow': robot(mood('wow', ROBOT)),
  'robot-wink': robot(mood('wink', ROBOT), { c: '#BFE3F7', dark: '#7FB5DE' }),
  'robot-cool': robot(mood('cool', { ...ROBOT, ink: ROBOT_INK }), { c: '#F2C14E', dark: '#D9A22F' }),
  'robot-shy': robot(mood('shy', ROBOT)),
  'robot-cry': robot(mood('cry', ROBOT)),
  'robot-kiss': robot(mood('kiss', ROBOT)),
  'robot-silly': robot(mood('tongue', ROBOT), { c: '#C9E8A8', dark: '#9BC97A' }),
  'robot-dizzy': robot([...mood('dizzy', ROBOT), ...dizzyStars(50, 4)]),
  'robot-think': robot([...mood('think', ROBOT), part('gears', [ring(86, 12, 12, 3.5, '#9AA3AD'), ...rays(86, 12, 6, 9, 6, 3, '#9AA3AD')])]),
  'robot-party': [...robot(mood('laugh', ROBOT), { c: '#C9A3E6', dark: '#A97FD3' }), ...partyHat(34, 18, 0.8)],
  'robot-heart': robot(mood('happy', ROBOT), { front: heldHeart(50, 82, 24) }),
  'robot-ok': [...robot(mood('happy', ROBOT)), ...tick(84, 74)],
  'robot-charging': robot([box(34, 32, 30, 20, 'transparent', 3, { edge: { w: 3, c: ROBOT_INK } }), box(64, 37, 4, 10, ROBOT_INK, 1), part('charge', [box(37, 35, 24, 14, '#7CC36E', 1)])]),
  'robot-tired': robot([...mood('sleep', ROBOT), box(64, 52, 10, 6, 'transparent', 1, { edge: { w: 1.5, c: '#FF8A8A' } }), part('low', [box(65.5, 53.5, 2, 3, '#FF8A8A')])], { c: '#AEB5BF', dark: '#858C96' }),
  'robot-confused': robot([part('mark', [arc(50, 34, 16, 4, 'top', SUN), arc(50, 34, 16, 4, 'right', SUN), bar(54, 40, 50, 45, 4, SUN), dot(50, 54, 5, SUN)])]),
  'robot-loading': robot([part('spinner', [...Array.from({ length: 8 }, (_, i) => dot(50 + 11 * Math.cos((i * 45 * Math.PI) / 180), 42 + 11 * Math.sin((i * 45 * Math.PI) / 180), 3 + i * 0.6, ROBOT_INK))])]),
  'robot-dance': robot(mood('happy', ROBOT), { arm1: [bar(28, 76, 14, 60, 6, '#9AA3AD'), dot(13, 58, 9, '#C9CED6')], arm2: [bar(72, 76, 86, 60, 6, '#9AA3AD'), dot(87, 58, 9, '#C9CED6')] }),

  // Dinosaurs.
  'dino-hello': dino(mood('smile', DINO), { arm2: [oval(82, 50, 10, 18, '#4E9E33', 20)] }),
  'dino-love': dino(mood('love', DINO), { c: '#F7A8C0', dark: '#E58AA6', belly: '#FDE0EA' }),
  'dino-laugh': dino(mood('laugh', DINO)),
  'dino-sad': dino(mood('sad', DINO), { c: '#7FB5DE', dark: '#5B95C2', belly: '#DCEBFA' }),
  'dino-roar': dino([dot(38, 36, 8, INK), dot(62, 36, 8, INK), bar(31, 27, 42, 31, 3.5, INK), bar(69, 27, 58, 31, 3.5, INK), part('mouth', [box(34, 46, 32, 18, INK, [4, 4, 16, 16], { inside: [tri(6, 2, 7, 7, WHITE, 180), tri(16, 2, 7, 7, WHITE, 180), tri(26, 2, 7, 7, WHITE, 180), box(9, 9, 14, 9, RED, 4)] })])], { c: '#E8751A', dark: '#C95A0A', belly: '#FFE2C7' }),
  'dino-sleep': dino([...mood('sleep', DINO), ...zees(76, 0)]),
  'dino-wow': dino(mood('wow', DINO), { c: '#9B6BD3', dark: '#7A4FB5', belly: '#E7D4FA' }),
  'dino-wink': dino(mood('wink', DINO)),
  'dino-cool': dino(mood('cool', DINO), { c: '#3FB2C8', dark: '#2A93A8', belly: '#C8F0EE' }),
  'dino-shy': dino(mood('shy', DINO), { c: '#F2C14E', dark: '#D9A22F', belly: '#FFF1C4' }),
  'dino-cry': dino(mood('cry', DINO)),
  'dino-party': [...dino(mood('laugh', DINO), { c: '#FF7EB6', dark: '#E55E9A', belly: '#FFD1E1' }), ...partyHat(50, 14)],
  'dino-heart': dino(mood('happy', DINO), { front: heldHeart(50, 74, 24) }),
  'dino-hungry': dino(mood('happy', DINO), { front: [part('leaf', [bar(50, 82, 50, 64, 2, '#2F7A3A'), oval(44, 68, 10, 16, '#2F9E5A', -30), oval(56, 70, 10, 16, '#2F9E5A', 30)])] }),
  'dino-think': dino([...mood('think', DINO), ...thought(86, 12)]),
  'dino-dizzy': dino([...mood('dizzy', DINO), ...dizzyStars(50, 0)]),
  'long-neck': [oval(54, 74, 56, 32, '#7CC36E'), oval(34, 90, 10, 14, '#5BA43E'), oval(70, 90, 10, 14, '#5BA43E'), tri(88, 76, 18, 14, '#7CC36E', 70), part('neck', [bar(36, 66, 24, 28, 14, '#7CC36E'), oval(22, 20, 26, 18, '#7CC36E'), dot(18, 16, 5, INK), dot(19, 15, 2, WHITE), arc(14, 21, 8, 2, 'bottom'), dot(30, 24, 5, CHEEK)]), dot(56, 66, 6, '#A3D67C'), dot(68, 74, 5, '#A3D67C')],
  triceratops: [part('frill', [dot(50, 40, 76, '#F2A65A'), ...[[18, 30], [30, 12], [50, 4], [70, 12], [82, 30]].map(([x, y]) => dot(x, y, 10, '#E8751A'))]), box(24, 34, 52, 56, '#F7C66A', 26), tri(36, 30, 8, 22, '#FFF6E0', -15), tri(64, 30, 8, 22, '#FFF6E0', 15), tri(50, 60, 8, 12, '#FFF6E0'), ...mood('smile', { l: 40, r: 60, y: 48, m: 76 }), ...cheeksAt(32, 68, 60, 7)],
  stegosaurus: [part('plates', [...[[30, 46], [42, 36], [54, 34], [66, 38], [78, 48]].map(([x, y]) => tri(x, y, 14, 20, '#E8751A', (x - 54) * 0.8))]), oval(54, 66, 64, 34, '#9BC97A'), tri(90, 70, 18, 10, '#9BC97A', 80), oval(18, 66, 22, 18, '#9BC97A'), oval(36, 88, 10, 14, '#7AA858'), oval(70, 88, 10, 14, '#7AA858'), dot(14, 62, 5, INK), dot(15, 61, 2, WHITE), arc(10, 66, 8, 2, 'bottom'), dot(22, 68, 5, CHEEK)],
  pterodactyl: [part('wing1', [tri(26, 44, 44, 26, '#B58DE3', -100)]), part('wing2', [tri(74, 44, 44, 26, '#B58DE3', 100)]), oval(50, 52, 22, 34, '#9B6BD3'), tri(50, 18, 10, 18, '#7A4FB5'), dot(50, 32, 20, '#9B6BD3'), tri(50, 42, 8, 12, SUN, 180), ...eyes(45, 55, 30, 5)],
  'dino-egg': [part('egg', [oval(50, 58, 60, 74, '#F7F2EA'), dot(36, 46, 8, '#9BC97A'), dot(62, 66, 10, '#9BC97A'), dot(46, 78, 6, '#9BC97A'), bar(24, 50, 34, 44, 2.5, INK), bar(34, 44, 42, 52, 2.5, INK), bar(42, 52, 52, 42, 2.5, INK), bar(52, 42, 62, 50, 2.5, INK), bar(62, 50, 72, 44, 2.5, INK)]), part('baby', [dot(50, 30, 30, '#6CC24A'), ...eyes(44, 56, 28, 5), arc(50, 32, 8, 2, 'bottom')])],
  volcano: [part('lava', [dot(40, 12, 10, '#FF7E3C'), dot(56, 6, 8, SUN), dot(64, 16, 9, '#FF7E3C')]), tri(50, 64, 84, 64, '#8B6B4A'), box(38, 30, 24, 10, '#E8751A', 4), tri(42, 48, 10, 24, '#E8751A', 10), tri(58, 44, 8, 18, '#FF7E3C', -10), box(6, 86, 88, 10, '#6B4A33', 5)],
  fossil: [box(10, 10, 80, 80, '#E9D6B9', 20, { edge: { w: 3, c: '#C9A46B' } }), part('fossil', [ring(50, 50, 52, 6, '#A8865A'), ring(50, 50, 32, 5, '#A8865A'), dot(50, 50, 12, '#A8865A'), ...rays(50, 50, 16, 26, 10, 2, '#C9A46B')])],
  footprint: [box(6, 70, 88, 24, '#E9C98A', 12), part('print', [oval(50, 58, 40, 46, '#6CC24A'), oval(32, 24, 14, 22, '#6CC24A', -25), oval(50, 18, 14, 24, '#6CC24A'), oval(68, 24, 14, 22, '#6CC24A', 25)])],

  // Love.
  'love-beating': [part('heart', [heart(50, 42, 62, RED), dot(35, 32, 9, '#F27D80')]), part('lines', [bar(8, 30, 16, 35, 3, '#FF7EB6'), bar(6, 50, 15, 50, 3, '#FF7EB6'), bar(84, 35, 92, 30, 3, '#FF7EB6'), bar(85, 50, 94, 50, 3, '#FF7EB6')])],
  'love-two': [part('h1', [heart(38, 60, 48, RED), dot(27, 51, 7, '#F27D80')]), part('h2', [heart(68, 34, 36, '#FF7EB6'), dot(60, 28, 6, '#FFB3D1')])],
  'love-broken': [part('left', [tilt(-6, [50, 88], [box(12, 10, 38, 82, 'transparent', 0, { inside: [heart(38, 30, 64, RED), dot(24, 22, 9, '#F27D80')] })])]), part('right', [tilt(6, [50, 88], [box(50, 10, 38, 82, 'transparent', 0, { inside: [heart(0, 30, 64, RED_DARK)] })])])],
  'love-arrow': [bar(14, 80, 86, 24, 3.5, BROWN), tri(16, 78, 8, 12, '#FF7EB6', 52), tri(22, 73, 8, 12, '#FF7EB6', 52), part('heart', [heart(50, 42, 56, RED), dot(37, 36, 8, '#F27D80')]), tri(87, 23, 11, 13, STRING, 52)],
  'love-letter': [box(12, 34, 76, 50, '#FFF4E8', 6, { edge: { w: 2.5, c: '#E0B9A0' }, inside: [tri(36, 8, 80, 34, '#F5DCCB', 180), bar(2, 48, 30, 26, 2.5, '#E0B9A0'), bar(74, 48, 46, 26, 2.5, '#E0B9A0')] }), part('seal', [heart(50, 58, 20, RED)]), part('float', [heart(76, 22, 12, '#FF7EB6'), heart(88, 10, 8, RED)])],
  'love-lips': [part('lips', [oval(50, 60, 66, 30, RED), oval(36, 44, 36, 24, RED, -15), oval(64, 44, 36, 24, RED, 15), bar(22, 54, 78, 54, 3, RED_DARK), oval(40, 66, 14, 6, '#F27D80')]), part('kiss', [heart(84, 18, 16, '#FF7EB6')])],
  'love-rose': [bar(50, 94, 50, 50, 3.5, GREEN), oval(40, 74, 18, 8, '#4FA34A', -30), oval(60, 66, 18, 8, '#4FA34A', 30), tri(42, 52, 12, 12, '#4FA34A', -40), tri(58, 52, 12, 12, '#4FA34A', 40), oval(50, 36, 40, 34, RED_DARK), oval(41, 35, 22, 28, RED, -20), oval(59, 35, 22, 28, RED, 20), oval(50, 30, 22, 20, '#F05A60'), arc(50, 30, 12, 3, 'bottom', RED_DARK), part('petal', [oval(72, 60, 9, 6, RED, 30)])],
  'love-ring': [ring(50, 64, 46, 7, GOLD), arc(50, 64, 46, 3, 'bottom', '#FFE29A'), box(45, 42, 10, 6, GOLD, 2), box(38, 26, 24, 8, '#DFF3FD', [3, 3, 0, 0]), tri(50, 41, 24, 14, '#9ED3F0', 180), bar(44, 30, 48, 30, 2, WHITE), part('shine', [...star(76, 22, 12, SUN), ...star(24, 30, 9, SUN)])],
  'love-balloon': [bar(50, 76, 44, 96, 1.5, STRING), part('balloon', [tri(50, 76, 8, 6, RED_DARK), heart(50, 30, 56, RED), oval(34, 24, 6, 12, '#F59A9D', 30)])],
  'love-chocolates': [heart(50, 36, 74, '#8C1C24'), heart(50, 36, 62, RED), part('c1', [dot(36, 32, 15, BROWN), dot(34, 30, 4, '#8A6247')]), part('c2', [dot(64, 32, 15, '#4A3020'), dot(62, 30, 4, '#6B4A33')]), part('c3', [dot(50, 46, 15, BROWN), dot(48, 44, 4, '#8A6247')]), part('c4', [dot(35, 50, 12, '#F5E1C8')]), part('c5', [dot(65, 50, 12, '#F5E1C8')]), part('c6', [dot(50, 64, 13, '#4A3020')])],
  'love-teddy': [dot(30, 20, 18, '#B9835A'), dot(70, 20, 18, '#B9835A'), dot(30, 20, 9, '#E8C39E'), dot(70, 20, 9, '#E8C39E'), dot(32, 90, 18, '#A0704A'), dot(68, 90, 18, '#A0704A'), oval(50, 74, 50, 42, '#B9835A'), dot(50, 36, 46, '#B9835A'), oval(50, 45, 20, 14, '#E8C39E'), oval(50, 41, 8, 5, INK), arc(50, 45, 8, 2, 'bottom'), dot(41, 32, 5, INK), dot(59, 32, 5, INK), ...cheeksAt(34, 66, 42, 7), ...heldHeart(50, 74, 30), oval(31, 70, 12, 22, '#A0704A', -35), oval(69, 70, 12, 22, '#A0704A', 35)],
  'love-lock': [part('shackle', [arc(50, 42, 36, 6, 'top', STRING), bar(32, 42, 32, 54, 6, STRING), bar(68, 42, 68, 54, 6, STRING)]), heart(50, 54, 54, GOLD), dot(38, 50, 8, '#FFE29A'), dot(50, 60, 8, BROWN), tri(50, 68, 6, 10, BROWN)],
  'love-hug': [dot(36, 58, 48, '#FF9EC4'), dot(66, 58, 48, '#9DBAF5'), arc(28, 54, 8, 2.5, 'top'), arc(42, 54, 8, 2.5, 'top'), arc(35, 62, 10, 2.5, 'bottom'), arc(60, 54, 8, 2.5, 'top'), arc(74, 54, 8, 2.5, 'top'), arc(67, 62, 10, 2.5, 'bottom'), dot(24, 62, 6, CHEEK), dot(78, 62, 6, CHEEK), oval(64, 74, 26, 10, '#F07AAE', -15), oval(38, 76, 26, 10, '#7FA6EE', 15), part('heart', [heart(51, 22, 18, RED)])],
  'love-potion': [box(42, 18, 16, 16, GLASS, 2, { edge: { w: 2.5, c: GLASS_EDGE } }), box(40, 10, 20, 10, '#C99A66', 3), box(20, 30, 60, 60, GLASS, 30, { edge: { w: 3, c: GLASS_EDGE }, inside: [box(0, 26, 60, 34, '#FF7EB6')] }), heart(50, 72, 18, WHITE), part('bubbles', [dot(38, 64, 5, '#FFD1E1'), dot(62, 62, 4, '#FFD1E1')]), part('hearts', [heart(70, 12, 10, RED), heart(82, 22, 8, '#FF7EB6')])],
  'love-sparkle': [part('heart', [heart(50, 42, 60, '#FF7EB6'), dot(36, 36, 8, '#FFB3D1')]), part('stars', [...star(20, 20, 14, SUN), ...star(82, 24, 12, SUN), ...star(82, 82, 10, SUN), ...star(16, 76, 8, SUN)])],
  'love-growing': [heart(50, 36, 76, '#FFD1E1'), part('mid', [heart(50, 41, 52, '#FF7EB6')]), part('core', [heart(50, 46, 28, RED)])],
  'love-rain': [part('h1', [heart(22, 22, 18, RED)]), part('h2', [heart(54, 14, 22, '#FF7EB6')]), part('h3', [heart(82, 28, 16, RED)]), part('h4', [heart(36, 54, 22, '#FF7EB6')]), part('h5', [heart(70, 60, 26, RED)]), part('h6', [heart(26, 84, 16, '#F27D80')]), part('h7', [heart(56, 86, 14, RED)])],
  'love-dinner': [box(6, 76, 88, 8, BROWN, 3), box(27, 42, 12, 34, '#FFF4E8', 2, { edge: { w: 2, c: '#E0B9A0' } }), box(61, 42, 12, 34, '#FFF4E8', 2, { edge: { w: 2, c: '#E0B9A0' } }), bar(33, 42, 33, 36, 2, INK), bar(67, 42, 67, 36, 2, INK), part('f1', [oval(33, 28, 10, 16, SUN), oval(33, 31, 5, 8, '#FFF1A8')]), part('f2', [oval(67, 28, 10, 16, SUN), oval(67, 31, 5, 8, '#FFF1A8')]), part('heart', [heart(50, 60, 16, RED)])],
  'love-message': [box(10, 14, 80, 58, BLUE, 20), tri(30, 76, 16, 16, BLUE, 200), part('heart', [heart(50, 44, 32, WHITE)]), dot(26, 30, 5, '#9DBAF5')],
  'love-birds': [bar(6, 80, 94, 80, 4, BROWN), part('b1', [tri(14, 70, 14, 12, '#4E9E33', -110), oval(32, 64, 34, 28, '#7CC36E'), dot(40, 46, 22, '#7CC36E'), oval(26, 66, 18, 12, '#5BA54D', -20), dot(43, 44, 4.5, INK), tri(53, 48, 7, 8, GOLD, 90), dot(36, 52, 5, CHEEK)]), part('b2', [tri(86, 70, 14, 12, '#E58AA6', 110), oval(68, 64, 34, 28, '#F7A8C0'), dot(60, 46, 22, '#F7A8C0'), oval(74, 66, 18, 12, '#E58AA6', 20), dot(57, 44, 4.5, INK), tri(47, 48, 7, 8, GOLD, -90), dot(64, 52, 5, CHEEK)]), part('heart', [heart(50, 22, 16, RED)])],
  'love-key': [part('key', [heart(28, 44, 36, GOLD), heart(28, 44, 16, '#FFE29A'), bar(42, 44, 88, 44, 7, GOLD), box(72, 44, 6, 14, GOLD, 1), box(82, 44, 6, 10, GOLD, 1)]), part('shine', [...star(60, 22, 12, SUN), ...star(84, 70, 9, SUN)])],
  'love-cake': [oval(50, 88, 84, 12, '#E3E6EA'), heart(50, 46, 56, PINK_DARK), heart(50, 41, 56, PINK), dot(36, 40, 4, WHITE), dot(60, 46, 4, SUN), dot(50, 60, 4, WHITE), dot(66, 36, 4, '#9DBAF5'), dot(42, 52, 4, '#7CC36E'), box(47, 12, 6, 20, '#9DBAF5', 2), part('flame', [oval(50, 7, 8, 12, SUN), oval(50, 9, 4, 6, '#FFF1A8')])],
  'love-wings': [part('w1', [oval(24, 42, 36, 18, '#DCEBFA', -25), oval(24, 54, 28, 12, '#BFD7F5', -15)]), part('w2', [oval(76, 42, 36, 18, '#DCEBFA', 25), oval(76, 54, 28, 12, '#BFD7F5', 15)]), heart(50, 44, 44, RED), dot(41, 40, 7, '#F27D80')],
  'love-latte': [oval(48, 88, 80, 12, '#E3E6EA'), ring(78, 60, 20, 5, '#C9CED6'), box(18, 44, 58, 40, WHITE, [4, 4, 26, 26], { edge: { w: 2.5, c: '#C9CED6' } }), oval(47, 47, 52, 12, '#8A5A3B'), heart(47, 47, 12, '#F5E1C8'), part('steam', [bar(38, 34, 40, 22, 3, STEAM), bar(54, 34, 52, 20, 3, STEAM)])],

  // Greece.
  parthenon: [part('sun', [dot(82, 16, 18, SUN)]), box(6, 82, 88, 8, '#C9B994', 2), box(10, 75, 80, 8, '#E0D3B5', 2), tri(50, 22, 84, 18, '#E0D3B5'), box(8, 30, 84, 8, '#C9B994', 1), ...[16, 29.5, 43, 56.5, 70, 83.5].map((x) => box(x - 4, 38, 8, 37, '#F3EADB', 1, { inside: [box(3.2, 0, 1.6, 37, '#E0D3B5')] }))],
  'greek-flag': [bar(14, 8, 14, 94, 4, BROWN), dot(14, 8, 7, GOLD), part('flag', [box(16, 12, 72, 46, '#0D5EAF', 2, { inside: [...[5.1, 15.3, 25.6, 35.8].map((y) => box(0, y, 72, 5.1, WHITE)), box(0, 0, 25.6, 25.6, '#0D5EAF'), box(10.2, 0, 5.1, 25.6, WHITE), box(0, 10.2, 25.6, 5.1, WHITE)] })])],
  'evil-eye': [dot(50, 50, 82, '#1F5FBF'), dot(50, 50, 60, WHITE), part('iris', [dot(50, 50, 36, '#7FC8F8'), dot(50, 50, 16, INK), dot(45, 45, 5, WHITE)]), part('shine', [...star(14, 14, 12, SUN), ...star(86, 84, 10, SUN)])],
  komboloi: [part('beads', [ring(50, 42, 56, 1.5, BROWN, 60), ...Array.from({ length: 12 }, (_, i) => dot(50 + 28 * Math.cos((i * Math.PI) / 6), 42 + 30 * Math.sin((i * Math.PI) / 6), 11, '#E89A2E')), ...Array.from({ length: 12 }, (_, i) => dot(48.5 + 28 * Math.cos((i * Math.PI) / 6), 40.5 + 30 * Math.sin((i * Math.PI) / 6), 3.5, '#FFD08A')), bar(50, 72, 50, 80, 2, BROWN), dot(50, 81, 10, '#C9741A'), tri(50, 92, 12, 16, '#C9741A')])],
  santorini: [part('sun', [dot(84, 16, 16, SUN)]), bar(50, 8, 50, 24, 2.5, '#1F5FBF'), bar(45, 13, 55, 13, 2.5, '#1F5FBF'), box(30, 24, 40, 20, '#1F5FBF', [20, 20, 0, 0]), box(22, 44, 56, 40, WHITE, 2, { edge: { w: 2, c: '#D5DCE4' } }), box(44, 62, 12, 22, '#1F5FBF', [6, 6, 0, 0]), box(29, 52, 9, 10, '#1F5FBF', [4.5, 4.5, 0, 0]), box(62, 52, 9, 10, '#1F5FBF', [4.5, 4.5, 0, 0]), box(4, 84, 92, 12, '#3E8FD6', 6), part('waves', [arc(22, 92, 10, 2, 'top', WHITE), arc(50, 92, 10, 2, 'top', WHITE), arc(78, 92, 10, 2, 'top', WHITE)])],
  windmill: [box(34, 40, 32, 54, WHITE, [16, 16, 2, 2], { edge: { w: 2.5, c: '#D5DCE4' } }), tri(50, 34, 36, 20, BROWN), box(44, 74, 12, 20, '#1F5FBF', [6, 6, 0, 0]), dot(50, 56, 8, '#1F5FBF'), part('blades', [...[45, 135, 225, 315].map((a) => oval(50 + 21 * Math.cos((a * Math.PI) / 180), 34 + 21 * Math.sin((a * Math.PI) / 180), 30, 12, '#F3EADB', a)), ...[45, 135, 225, 315].map((a) => bar(50, 34, 50 + 38 * Math.cos((a * Math.PI) / 180), 34 + 38 * Math.sin((a * Math.PI) / 180), 2.5, BROWN)), dot(50, 34, 9, BROWN)])],
  amphora: [box(40, 80, 20, 12, '#B5561E', 2), ring(29, 34, 16, 4, '#B5561E'), ring(71, 34, 16, 4, '#B5561E'), box(41, 14, 18, 22, '#D9823B', 2), box(35, 10, 30, 7, '#B5561E', 3), box(24, 28, 52, 58, '#D9823B', [22, 22, 26, 26], { inside: [box(0, 20, 52, 12, INK), ...[0, 1, 2, 3, 4].map((i) => box(4 + i * 10, 23, 5, 5, '#D9823B')), box(0, 38, 52, 3, INK)] }), oval(34, 46, 5, 12, '#F0A866', 10)],
  'olive-branch': [part('branch', [bar(14, 90, 82, 18, 3.5, '#7A5A33'), oval(39.4, 77.9, 24, 9, '#6F9440', -6.7), oval(24.8, 64.2, 24, 9, '#8DB05A', -86.7), oval(50.9, 65.7, 24, 9, '#8DB05A', -6.7), oval(36.3, 51.9, 24, 9, '#6F9440', -86.7), oval(62.4, 53.4, 24, 9, '#6F9440', -6.7), oval(47.8, 39.7, 24, 9, '#8DB05A', -86.7), oval(73.9, 41.2, 24, 9, '#8DB05A', -6.7), oval(59.4, 27.5, 24, 9, '#6F9440', -86.7), oval(84.2, 30.3, 24, 9, '#6F9440', -6.7)]), part('olives', [oval(30, 82, 11, 14, '#4B3A5C', 20), oval(58, 56, 11, 14, '#9BB84A', 20), oval(44, 30, 11, 14, '#4B3A5C', 20), dot(28, 79, 3, '#8A7AA0'), dot(42, 27, 3, '#8A7AA0')])],
  bouzouki: [tilt(-35, [50, 52], [box(46, 4, 8, 54, '#6B4A33', 2), box(43, 0, 14, 10, '#6B4A33', 3), oval(50, 72, 42, 46, '#A0582A'), oval(50, 71, 34, 38, '#E8C39E'), dot(50, 64, 10, INK), bar(42, 84, 58, 84, 2.5, BROWN), bar(48.5, 6, 48.5, 84, 0.8, '#FFF8E8'), bar(51.5, 6, 51.5, 84, 0.8, '#FFF8E8')]), part('notes', [dot(80, 28, 8, PURPLE), bar(83.5, 28, 83.5, 12, 2, PURPLE), bar(83.5, 12, 90, 15, 2, PURPLE), dot(16, 22, 6, BLUE), bar(18.5, 22, 18.5, 10, 1.8, BLUE)])],
  'greek-salad': [dot(30, 50, 20, RED), dot(26, 46, 5, '#F27D80'), dot(70, 50, 18, RED), dot(48, 48, 18, '#5BA54D'), dot(48, 48, 13, '#C8E6A0'), ring(38, 40, 16, 3, '#C77DB8'), ring(62, 40, 14, 3, '#C77DB8'), part('feta', [box(40, 22, 22, 16, '#FAF7EE', 2, { turn: -10, edge: { w: 1.5, c: '#E3DCC8' } }), dot(46, 28, 2, '#6F9440'), dot(54, 30, 2, '#6F9440')]), part('olive', [oval(78, 40, 9, 11, '#3B2A1A')]), box(12, 52, 76, 34, '#1F5FBF', [2, 2, 38, 38]), box(12, 52, 76, 5, '#3E8FD6', 2)],
  ouzo: [box(28, 20, 44, 70, GLASS, [2, 2, 8, 8], { edge: { w: 3, c: GLASS_EDGE }, inside: [part('milk', [box(0, 22, 44, 48, '#CFD8E2')]), part('ice', [box(8, 18, 14, 14, '#DFF3FD', 3, { turn: 15 }), box(22, 26, 14, 14, '#CDEBFB', 3, { turn: -10 })])] }), box(36, 30, 4, 50, WHITE, 2), box(68, 12, 3, 30, '#7FC8F8', 1.5)],
  tavli: [box(6, 44, 88, 48, '#8C5A32', 6), box(12, 50, 76, 36, '#F3E3C3', 3), box(48, 50, 4, 36, '#8C5A32'), ...[18, 30, 42, 58, 70, 82].map((x, i) => tri(x, 58, 10, 16, i % 2 ? '#2F7A6A' : RED_DARK, 180)), ...[18, 30, 42, 58, 70, 82].map((x, i) => tri(x, 78, 10, 16, i % 2 ? RED_DARK : '#2F7A6A')), part('dice1', [box(22, 10, 24, 24, WHITE, 5, { turn: 12, edge: { w: 2, c: '#C9CED6' }, inside: [dot(6, 6, 5, INK), dot(18, 6, 5, INK), dot(12, 12, 5, INK), dot(6, 18, 5, INK), dot(18, 18, 5, INK)] })]), part('dice2', [box(56, 14, 24, 24, WHITE, 5, { turn: -10, edge: { w: 2, c: '#C9CED6' }, inside: [dot(6, 6, 5, RED), dot(12, 12, 5, RED), dot(18, 18, 5, RED)] })])],
  kaiki: [part('boat', [bar(32, 60, 32, 20, 2.5, BROWN), tri(42, 40, 18, 34, WHITE, 0), box(46, 44, 26, 16, WHITE, 2, { edge: { w: 2, c: '#D5DCE4' } }), box(44, 40, 30, 5, '#1F5FBF', 2), box(52, 48, 6, 6, '#7FC8F8', 1), box(62, 48, 6, 6, '#7FC8F8', 1), box(12, 60, 76, 18, '#F3EADB', [0, 0, 22, 22], { edge: { w: 2, c: '#C9B994' }, inside: [box(0, 0, 76, 5, '#1F5FBF'), box(0, 7, 76, 3, RED)] }), dot(22, 68, 5, INK)]), part('waves', [box(4, 76, 92, 16, '#3E8FD6', 8), arc(24, 84, 10, 2, 'top', WHITE), arc(52, 84, 10, 2, 'top', WHITE), arc(80, 84, 10, 2, 'top', WHITE)])],
  cicada: [part('wings', [oval(37, 58, 22, 56, '#DCEBFA', 14), oval(63, 58, 22, 56, '#DCEBFA', -14), bar(38, 36, 34, 80, 1.2, '#9DBAF5'), bar(62, 36, 66, 80, 1.2, '#9DBAF5')]), oval(50, 52, 22, 44, '#7A6A3A'), oval(50, 30, 30, 15, '#5B4E2A'), dot(37, 28, 9, '#3B2A1A'), dot(63, 28, 9, '#3B2A1A'), dot(38, 26, 3, WHITE), dot(64, 26, 3, WHITE), part('song', [arc(20, 24, 12, 2.5, 'left', '#F2A81D'), arc(14, 24, 22, 2.5, 'left', '#F2A81D'), arc(80, 24, 12, 2.5, 'right', '#F2A81D'), arc(86, 24, 22, 2.5, 'right', '#F2A81D')])],
  'laurel-wreath': [oval(66, 77.7, 20, 9, '#7DB24E', 150), oval(74.5, 70.6, 20, 9, '#5E9C3A', 130), oval(80.1, 60.9, 20, 9, '#7DB24E', 110), oval(82, 50, 20, 9, '#5E9C3A', 90), oval(80.1, 39.1, 20, 9, '#7DB24E', 70), oval(74.5, 29.4, 20, 9, '#5E9C3A', 50), oval(66, 22.3, 20, 9, '#7DB24E', 30), oval(34, 77.7, 20, 9, '#7DB24E', 30), oval(25.5, 70.6, 20, 9, '#5E9C3A', 50), oval(19.9, 60.9, 20, 9, '#7DB24E', 70), oval(18, 50, 20, 9, '#5E9C3A', 90), oval(19.9, 39.1, 20, 9, '#7DB24E', 110), oval(25.5, 29.4, 20, 9, '#5E9C3A', 130), oval(34, 22.3, 20, 9, '#7DB24E', 150), tri(42, 90, 10, 14, RED, 30), tri(58, 90, 10, 14, RED, -30), dot(50, 84, 9, RED_DARK), part('star', star(50, 50, 28, SUN))],
  'greek-helmet': [part('crest', [box(26, 2, 48, 22, RED, [24, 24, 0, 0]), ...[34, 42, 50, 58, 66].map((x) => bar(x, 6, x, 20, 1.5, RED_DARK))]), box(20, 20, 60, 72, '#D9A441', [30, 30, 12, 12], { edge: { w: 2.5, c: '#B8842A' } }), box(30, 44, 40, 12, INK, 6), box(44, 50, 12, 36, INK, 4), oval(32, 32, 8, 14, '#F3D27A', 20)],
  'greek-island': [part('sun', [dot(80, 18, 18, SUN)]), oval(50, 74, 80, 44, '#D9B97A'), box(24, 50, 14, 12, WHITE, 1, { edge: { w: 1.5, c: '#D5DCE4' } }), box(42, 42, 16, 16, WHITE, 1, { edge: { w: 1.5, c: '#D5DCE4' } }), box(44, 35, 12, 8, '#1F5FBF', [6, 6, 0, 0]), box(62, 52, 14, 12, WHITE, 1, { edge: { w: 1.5, c: '#D5DCE4' } }), box(29, 55, 4, 7, '#1F5FBF', 1), box(48, 50, 4, 8, '#1F5FBF', 1), box(67, 57, 4, 7, '#1F5FBF', 1), part('sea', [box(4, 72, 92, 22, '#3E8FD6', 11), arc(24, 84, 10, 2, 'top', WHITE), arc(52, 86, 10, 2, 'top', WHITE), arc(78, 82, 10, 2, 'top', WHITE)])],
  honey: [box(20, 38, 60, 52, '#F7B733', [6, 6, 16, 16], { edge: { w: 3, c: '#D9822B' } }), box(18, 34, 64, 9, '#D9822B', 4), box(32, 56, 36, 22, '#FFF4E8', 5), oval(50, 67, 12, 9, SUN), bar(46, 63, 46, 71, 1.5, INK), bar(52, 63, 52, 71, 1.5, INK), oval(46, 61, 7, 5, '#DCEBFA', -20), oval(54, 61, 7, 5, '#DCEBFA', 20), part('dipper', [bar(76, 2, 58, 20, 3.5, BROWN), oval(55, 23, 13, 17, '#C9741A', -40)]), part('drop', [oval(52, 32, 6, 8, '#F2A81D')])],
  trident: [part('trident', [bar(50, 30, 50, 86, 5, GOLD), bar(28, 32, 72, 32, 5, GOLD), bar(28, 32, 28, 14, 5, GOLD), bar(50, 32, 50, 8, 5, GOLD), bar(72, 32, 72, 14, 5, GOLD), tri(28, 9, 10, 12, GOLD), tri(50, 3, 10, 12, GOLD), tri(72, 9, 10, 12, GOLD)]), part('waves', [box(8, 80, 84, 14, '#3E8FD6', 7), arc(26, 86, 12, 2.5, 'top', WHITE), arc(50, 86, 12, 2.5, 'top', WHITE), arc(74, 86, 12, 2.5, 'top', WHITE)]), part('shine', [...star(14, 40, 10, SUN), ...star(86, 50, 12, SUN)])],
  lyre: [box(30, 80, 40, 10, GOLD, 4), oval(28, 50, 11, 64, GOLD, -10), oval(72, 50, 11, 64, GOLD, 10), bar(22, 22, 78, 22, 5, BROWN), ...[40, 46.5, 53.5, 60].map((x) => bar(x, 22, x, 80, 1.2, '#FFF1A8')), part('notes', [dot(86, 30, 7, PURPLE), bar(89, 30, 89, 16, 2, PURPLE), dot(12, 40, 6, BLUE), bar(14.5, 40, 14.5, 28, 1.8, BLUE), bar(14.5, 28, 19, 30, 1.8, BLUE)])],
  'spartan-shield': [dot(50, 50, 88, '#B8842A'), dot(50, 50, 78, '#D9A441'), dot(50, 50, 66, RED), bar(34, 70, 50, 30, 8, '#F3D27A'), bar(50, 30, 66, 70, 8, '#F3D27A'), part('shine', [...star(26, 24, 12, WHITE)])],
  'olympic-torch': [tri(50, 70, 22, 44, '#C9CED6', 180), bar(44, 58, 56, 58, 2, '#9AA3AD'), box(33, 40, 34, 10, GOLD, 3), part('flame', [oval(50, 24, 28, 36, ORANGE), oval(50, 28, 18, 24, SUN), oval(50, 32, 9, 13, '#FFF1A8')])],
  ferry: [part('smoke', [dot(70, 10, 8, '#C9CED6'), dot(78, 6, 6, '#C9CED6')]), part('boat', [box(62, 18, 10, 18, RED, 2), box(30, 26, 30, 14, WHITE, 2, { edge: { w: 2, c: '#D5DCE4' } }), box(20, 38, 62, 18, WHITE, 2, { edge: { w: 2, c: '#D5DCE4' } }), ...[26, 36, 46, 56, 66].map((x) => box(x, 44, 6, 6, '#7FC8F8', 2)), box(34, 30, 22, 5, '#7FC8F8', 2), box(8, 56, 84, 18, '#1F5FBF', [2, 2, 16, 16]), box(8, 56, 84, 4, '#3E8FD6')]), part('waves', [box(4, 76, 92, 16, '#3E8FD6', 8), arc(24, 84, 10, 2, 'top', WHITE), arc(52, 84, 10, 2, 'top', WHITE), arc(80, 84, 10, 2, 'top', WHITE)])],
  feta: [oval(50, 82, 86, 14, '#E3E6EA'), box(18, 38, 64, 42, '#FAF7EE', 4, { edge: { w: 2.5, c: '#E3DCC8' } }), dot(30, 52, 4, '#EDE6D2'), dot(60, 64, 5, '#EDE6D2'), dot(70, 48, 3, '#EDE6D2'), part('oregano', [dot(36, 42, 2.5, '#6F9440'), dot(52, 44, 2.5, '#6F9440'), dot(64, 41, 2.5, '#6F9440'), dot(44, 40, 2, '#6F9440')]), part('oil', [oval(50, 40, 40, 5, '#E5C84A')]), part('olive', [oval(72, 30, 11, 14, '#4B3A5C', 20), dot(70, 27, 3, '#8A7AA0')])],

  // Sports.
  football: [part('ball', [box(18, 16, 64, 64, WHITE, 32, { edge: { w: 2.5, c: '#C9CED6' }, inside: [...[[32, 2], [4, 24], [60, 24], [13, 58], [51, 58]].map(([x, y]) => bar(32, 32, x, y, 2, '#9AA3AD')), dot(32, 32, 20, INK), dot(32, 2, 16, INK), dot(4, 24, 16, INK), dot(60, 24, 16, INK), dot(13, 58, 16, INK), dot(51, 58, 16, INK)] })])],
  basketball: [part('ball', [box(18, 16, 64, 64, '#F08A3C', 32, { inside: [bar(32, 0, 32, 64, 2.5, INK), bar(0, 32, 64, 32, 2.5, INK), ring(-6, 32, 40, 2.5, INK), ring(70, 32, 40, 2.5, INK)] }), oval(32, 30, 8, 14, '#F7B27A', 30)])],
  tennis: [part('racket', [tilt(-30, [50, 56], [bar(50, 60, 50, 92, 7, '#4A3020'), box(30, 8, 40, 52, 'transparent', 20, { inside: [...[8, 16, 24, 32].map((x) => bar(x, 0, x, 52, 1, '#E3E6EA')), ...[10, 18, 26, 34, 42].map((y) => bar(0, y, 40, y, 1, '#E3E6EA'))] }), ring(50, 34, 40, 5, RED, 52)])]), part('ball', [dot(80, 72, 22, '#C9E04A'), arc(72, 72, 14, 2, 'right', WHITE), arc(88, 72, 14, 2, 'left', WHITE)])],
  volleyball: [part('ball', [box(18, 16, 64, 64, WHITE, 32, { edge: { w: 2.5, c: '#C9CED6' }, inside: [ring(6, 6, 64, 10, '#1F5FBF'), ring(58, 58, 64, 10, '#F2C14E'), ring(60, 4, 40, 8, '#1F5FBF')] })])],
  goal: [...[20, 30, 40, 50, 60, 70, 80].map((x) => bar(x, 24, x, 84, 1, '#9AA3AD')), ...[34, 44, 54, 64, 74].map((y) => bar(12, y, 88, y, 1, '#9AA3AD')), bar(12, 22, 12, 86, 5, '#E3E6EA'), bar(88, 22, 88, 86, 5, '#E3E6EA'), bar(12, 22, 88, 22, 5, '#E3E6EA'), part('ball', [box(38, 52, 24, 24, WHITE, 12, { edge: { w: 1.5, c: '#C9CED6' }, inside: [dot(12, 12, 8, INK), dot(12, 1, 6, INK), dot(1, 10, 6, INK), dot(23, 10, 6, INK)] })]), part('stars', [...star(22, 10, 10, SUN), ...star(50, 8, 12, SUN), ...star(78, 10, 10, SUN)])],
  whistle: [ring(26, 30, 26, 3, RED), box(38, 44, 50, 18, '#C9CED6', 5, { edge: { w: 2, c: '#9AA3AD' } }), dot(36, 62, 42, '#C9CED6'), ring(36, 62, 42, 2, '#9AA3AD'), dot(36, 62, 14, '#6B7480'), box(82, 48, 6, 10, '#6B7480', 2), part('sound', [bar(90, 40, 96, 34, 3, SUN), bar(92, 53, 99, 53, 3, SUN), bar(90, 66, 96, 72, 3, SUN)])],
  stopwatch: [box(44, 8, 12, 12, '#9AA3AD', 2), bar(76, 24, 82, 18, 5, '#9AA3AD'), dot(50, 56, 72, '#C9CED6'), dot(50, 56, 60, WHITE), ...rays(50, 56, 23, 28, 12, 2, INK), part('hand', [bar(50, 56, 50, 32, 3, RED)]), dot(50, 56, 6, INK)],
  'running-shoe': [part('lines', [bar(4, 42, 14, 42, 3, '#9AA3AD'), bar(2, 54, 14, 54, 3, '#9AA3AD'), bar(6, 66, 14, 66, 3, '#9AA3AD')]), box(18, 36, 40, 36, BLUE, [18, 8, 0, 0]), oval(62, 62, 50, 22, BLUE), box(18, 70, 76, 10, WHITE, [2, 4, 8, 8], { edge: { w: 2, c: '#C9CED6' } }), bar(40, 46, 52, 52, 3, WHITE), bar(46, 42, 58, 48, 3, WHITE), bar(34, 50, 46, 56, 3, WHITE), bar(22, 62, 76, 62, 3, '#F2C14E'), box(16, 30, 14, 10, '#3D6FD6', 4)],
  dumbbell: [part('weight', [bar(22, 50, 78, 50, 6, '#C9CED6'), box(12, 30, 11, 40, '#5B6470', 3), box(23, 34, 8, 32, '#7D8794', 3), box(77, 30, 11, 40, '#5B6470', 3), box(69, 34, 8, 32, '#7D8794', 3)]), part('power', [...star(20, 14, 10, SUN), ...star(80, 14, 10, SUN)])],
  'boxing-glove': [part('glove', [box(28, 66, 40, 24, WHITE, 4, { edge: { w: 2, c: '#C9CED6' } }), box(28, 72, 40, 5, RED, 1), box(22, 14, 56, 56, RED, [28, 28, 20, 20]), oval(26, 50, 18, 28, RED_DARK, -15), oval(42, 28, 14, 10, '#F27D80', -20)]), part('stars', [...star(86, 20, 12, SUN), ...star(90, 44, 9, SUN), ...star(12, 18, 8, SUN)])],
  'ping-pong': [part('paddle', [box(46, 56, 12, 34, '#C99A66', 4, { turn: -30 }), dot(40, 40, 54, RED), dot(40, 40, 46, '#F05A60')]), part('ball', [box(70, 14, 16, 16, WHITE, 8, { edge: { w: 1.5, c: '#E3DCC8' } })])],
  golf: [oval(50, 84, 88, 20, '#6CC24A'), oval(62, 84, 16, 6, INK), bar(62, 84, 62, 14, 2.5, '#9AA3AD'), part('flag', [tri(73, 22, 18, 20, RED, 90)]), part('ball', [dot(28, 80, 13, WHITE), dot(26, 78, 3, '#E3E6EA')])],
  bowling: [part('pins', [...[50, 64, 78].flatMap((x) => [oval(x, 66, 18, 40, '#C9CED6'), oval(x, 66, 15, 37, WHITE), oval(x, 42, 9, 14, WHITE), dot(x, 34, 13, '#C9CED6'), dot(x, 34, 11, WHITE), bar(x - 4, 47, x + 4, 47, 2.5, RED), bar(x - 4, 51, x + 4, 51, 2.5, RED)])]), part('ball', [dot(22, 72, 32, '#5B3FA8'), dot(18, 66, 5, '#2C1F5A'), dot(26, 64, 5, '#2C1F5A'), dot(24, 72, 5, '#2C1F5A')])],
  darts: [dot(46, 54, 78, INK), dot(46, 54, 68, '#F3E3C3'), dot(46, 54, 52, RED), dot(46, 54, 36, '#F3E3C3'), dot(46, 54, 22, '#2F7A6A'), dot(46, 54, 9, RED), part('dart', [bar(48, 52, 80, 20, 3, '#9AA3AD'), bar(46, 54, 50, 50, 2, '#6B7480'), tri(82, 12, 9, 14, BLUE, 45), tri(88, 18, 9, 14, BLUE, 45)])],
  'chess-knight': [part('knight', [box(22, 80, 56, 12, '#A86E3E', 4), box(28, 70, 44, 12, '#8C5A32', 4), box(36, 20, 32, 52, '#A86E3E', [16, 6, 4, 4]), oval(36, 40, 30, 18, '#A86E3E', -25), tri(58, 16, 12, 16, '#A86E3E', 15), dot(46, 32, 5, '#F3E3C3'), dot(26, 46, 4, '#2A1C10'), ...[24, 32, 40, 48, 56].map((y) => bar(66, y, 70, y + 4, 2.5, '#6B4A33'))])],
  'foam-finger': [part('hand', [box(42, 6, 16, 46, BLUE, 8), box(28, 44, 44, 46, BLUE, [10, 10, 16, 16]), box(28, 54, 10, 14, '#3D6FD6', 5), ...star(50, 72, 20, SUN)])],
  'finish-flag': [bar(16, 8, 16, 94, 4, BROWN), part('flag', [box(18, 12, 66, 44, WHITE, 2, { edge: { w: 1.5, c: '#C9CED6' }, inside: Array.from({ length: 12 }, (_, j) => box(((j % 3) * 2 + (Math.floor(j / 3) % 2)) * 11, Math.floor(j / 3) * 11, 11, 11, INK)) })])],
  podium: [box(36, 44, 28, 48, GOLD, 3), box(8, 60, 28, 32, '#C9CED6', 3), box(64, 70, 28, 22, '#D9823B', 3), bar(50, 54, 50, 72, 4.5, WHITE), bar(46, 58, 50, 54, 4.5, WHITE), part('star', star(50, 28, 24, SUN)), part('shine', [...star(20, 44, 10, SUN), ...star(80, 54, 9, SUN)])],
  'rugby-ball': [part('ball', [oval(50, 50, 78, 46, '#9C5A32', -30), tilt(-30, [50, 50], [bar(34, 50, 66, 50, 2.5, WHITE), ...[38, 44, 50, 56, 62].map((x) => bar(x, 46, x, 54, 2, WHITE)), arc(20, 50, 16, 2, 'right', '#7A4425'), arc(80, 50, 16, 2, 'left', '#7A4425')])])],
  shuttlecock: [part('shuttle', [tri(50, 40, 52, 56, '#F3F4F6', 180), ...[30, 40, 50, 60, 70].map((x) => bar(x, 14, 46 + (x - 50) * 0.2, 66, 1.5, '#C9CED6')), bar(26, 18, 74, 18, 2.5, '#C9CED6'), box(38, 64, 24, 24, RED, [4, 4, 12, 12]), bar(38, 68, 62, 68, 2, WHITE)])],
  skateboard: [part('board', [box(20, 56, 12, 5, '#9AA3AD', 2), box(68, 56, 12, 5, '#9AA3AD', 2), dot(26, 66, 13, SUN), dot(74, 66, 13, SUN), dot(26, 66, 5, GOLD), dot(74, 66, 5, GOLD), box(8, 44, 84, 13, PURPLE, 7), box(14, 46, 72, 4, '#7A4FB5', 2)]), part('lines', [bar(8, 82, 20, 82, 3, '#9AA3AD'), bar(28, 88, 44, 88, 3, '#9AA3AD')])],
  'ice-skate': [part('skate', [box(26, 14, 32, 52, '#F7A8C0', [8, 8, 0, 0]), box(26, 46, 58, 22, '#F7A8C0', [0, 14, 8, 4]), ...[22, 30, 38].map((y) => bar(52, y, 60, y + 3, 2.5, WHITE)), box(24, 12, 36, 7, '#E58AA6', 3), bar(36, 68, 36, 78, 3, '#9AA3AD'), bar(74, 68, 74, 78, 3, '#9AA3AD'), bar(20, 80, 86, 80, 3.5, '#9AA3AD'), arc(86, 74, 12, 3, 'right', '#9AA3AD')]), part('shine', [...star(12, 30, 10, SKY), ...star(14, 70, 8, SKY), ...star(90, 30, 9, SKY)])],
  skiing: [tri(50, 66, 96, 56, '#C8DCEB'), tri(50, 50, 30, 24, WHITE), part('skis', [bar(18, 90, 80, 24, 6, RED), bar(82, 90, 20, 24, 6, BLUE), dot(80, 24, 6, RED), dot(20, 24, 6, BLUE), bar(36, 92, 64, 30, 2, '#4A5560'), bar(64, 92, 36, 30, 2, '#4A5560')]), part('snow', [dot(14, 14, 5, WHITE), dot(86, 12, 4, WHITE), dot(54, 8, 4, WHITE)])],
  hockey: [part('stick', [bar(72, 8, 42, 80, 5, '#9C5A32'), bar(42, 80, 18, 86, 8, '#9C5A32'), bar(66, 22, 62, 32, 6, INK)]), part('puck', [oval(72, 84, 26, 11, '#3B3F48'), oval(72, 82, 26, 9, '#6B7480')]), part('lines', [bar(90, 80, 98, 80, 2.5, '#9AA3AD'), bar(90, 88, 98, 88, 2.5, '#9AA3AD')])],

  // Music.
  'music-note': [part('note', [oval(40, 74, 30, 22, PURPLE, -20), bar(53, 72, 53, 14, 5, PURPLE), bar(53, 14, 70, 26, 5, PURPLE), bar(70, 26, 70, 40, 5, PURPLE), oval(34, 70, 8, 5, '#C9A8F0', -20)])],
  'music-notes': [part('notes', [oval(30, 76, 26, 20, BLUE, -20), oval(68, 68, 26, 20, BLUE, -20), bar(41, 74, 41, 22, 5, BLUE), bar(79, 66, 79, 14, 5, BLUE), bar(41, 22, 79, 14, 8, BLUE), bar(41, 34, 79, 26, 5, BLUE)])],
  guitar: [part('guitar', [tilt(35, [50, 54], [box(46, 4, 8, 50, BROWN, 2), box(43, 0, 14, 10, '#4A3020', 3), dot(50, 74, 42, '#D9823B'), dot(50, 50, 32, '#D9823B'), dot(50, 60, 13, INK), box(42, 78, 16, 4, BROWN, 2), bar(48.5, 4, 48.5, 80, 0.8, '#FFF8E8'), bar(51.5, 4, 51.5, 80, 0.8, '#FFF8E8')])]), part('notes', [dot(16, 24, 8, PURPLE), bar(19.5, 24, 19.5, 10, 2, PURPLE), bar(19.5, 10, 25, 13, 2, PURPLE)])],
  'electric-guitar': [part('guitar', [tilt(-35, [50, 54], [box(46, 4, 8, 52, '#4A3020', 2), box(43, 0, 14, 10, INK, 3), tri(36, 52, 14, 20, RED, -20), tri(64, 50, 14, 24, RED, 20), oval(50, 72, 42, 36, RED), box(42, 62, 16, 5, INK, 1), box(42, 72, 16, 5, INK, 1), dot(62, 82, 5, WHITE), bar(48.5, 4, 48.5, 80, 0.8, '#FFF8E8'), bar(51.5, 4, 51.5, 80, 0.8, '#FFF8E8')])]), part('zap', [bar(84, 16, 78, 28, 3, SUN), bar(78, 28, 86, 30, 3, SUN), bar(86, 30, 80, 42, 3, SUN)])],
  piano: [box(6, 26, 88, 14, '#3B2A1A', [6, 6, 0, 0]), box(8, 32, 84, 50, WHITE, [0, 0, 4, 4], { edge: { w: 2, c: '#C9CED6' }, inside: [...[1, 2, 3, 4, 5, 6, 7].map((i) => bar(i * 10.5, 0, i * 10.5, 50, 1.5, '#C9CED6')), ...[1, 2, 4, 5, 6].map((i) => box(i * 10.5 - 3.5, 0, 7, 30, INK, [0, 0, 2, 2]))] }), part('notes', [dot(26, 12, 7, PURPLE), bar(29, 12, 29, 0, 2, PURPLE), dot(70, 16, 7, BLUE), bar(73, 16, 73, 4, 2, BLUE)])],
  drum: [box(18, 46, 64, 34, RED, [0, 0, 14, 14]), ...[22, 36, 50, 64].map((x) => bar(x, 50, x + 14, 76, 2.5, GOLD)), ...[22, 36, 50, 64].map((x) => bar(x + 14, 50, x, 76, 2.5, GOLD)), part('skin', [oval(50, 46, 64, 20, '#F3E3C3'), ring(50, 46, 64, 2.5, '#C9CED6', 20)]), part('s1', [bar(18, 12, 44, 40, 3.5, '#C99A66'), dot(44, 40, 7, '#C99A66')]), part('s2', [bar(82, 12, 56, 40, 3.5, '#C99A66'), dot(56, 40, 7, '#C99A66')])],
  violin: [tilt(25, [50, 50], [dot(50, 68, 36, '#A0582A'), dot(50, 42, 28, '#A0582A'), box(40, 50, 20, 10, '#A0582A'), bar(42, 58, 42, 70, 2, INK), bar(58, 58, 58, 70, 2, INK), box(47, 10, 6, 64, INK, 2), dot(50, 8, 9, '#7A4425'), box(43, 76, 14, 4, '#3B2A1A', 2)]), part('bow', [bar(10, 74, 88, 30, 2.5, '#C99A66'), bar(13, 76, 86, 35, 1, '#F3EADB')])],
  trumpet: [box(24, 48, 44, 14, 'transparent', 7, { edge: { w: 4, c: GOLD } }), bar(14, 46, 70, 46, 6, GOLD), tri(78, 46, 34, 22, GOLD, -90), oval(89, 46, 6, 36, '#F7C948'), ...[36, 46, 56].map((x) => box(x - 3, 30, 6, 16, GOLD, 1)), ...[36, 46, 56].map((x) => dot(x, 28, 8, '#F7C948')), box(6, 42, 10, 8, '#F7C948', 2), part('notes', [dot(80, 16, 7, PURPLE), bar(83, 16, 83, 4, 2, PURPLE), dot(88, 78, 6, BLUE), bar(90.5, 78, 90.5, 66, 1.8, BLUE)])],
  saxophone: [bar(40, 18, 40, 66, 10, GOLD), bar(40, 66, 47, 78, 10, GOLD), bar(47, 78, 58, 78, 10, GOLD), bar(58, 78, 64, 66, 10, GOLD), bar(64, 66, 66, 44, 12, GOLD), tri(66, 38, 26, 16, GOLD), oval(66, 31, 28, 7, '#F7C948'), bar(40, 18, 52, 8, 5, GOLD), bar(52, 8, 58, 8, 4, INK), ...[28, 38, 48, 58].map((y) => dot(40, y, 5, '#F7C948')), part('notes', [dot(80, 18, 7, PURPLE), bar(83, 18, 83, 6, 2, PURPLE), dot(16, 40, 6, BLUE), bar(18.5, 40, 18.5, 28, 1.8, BLUE)])],
  microphone: [box(42, 46, 16, 40, '#5B6470', [2, 2, 8, 8]), box(40, 46, 20, 6, GOLD, 2), box(31, 10, 38, 38, '#9AA3AD', 19, { inside: [...[8, 14, 20, 26, 32].map((x) => bar(x, 0, x, 38, 1.5, '#C9CED6')), ...[8, 14, 20, 26, 32].map((y) => bar(0, y, 38, y, 1.5, '#C9CED6'))] }), part('sound', [arc(50, 29, 52, 3, 'left', SUN), arc(50, 29, 66, 3, 'left', SUN), arc(50, 29, 52, 3, 'right', SUN), arc(50, 29, 66, 3, 'right', SUN)])],
  headphones: [arc(50, 50, 66, 7, 'top', '#5B6470'), box(10, 44, 22, 34, RED, 10), box(68, 44, 22, 34, RED, 10), box(28, 50, 8, 22, '#5B6470', 4), box(64, 50, 8, 22, '#5B6470', 4), part('notes', [dot(46, 64, 7, PURPLE), bar(49, 64, 49, 50, 2, PURPLE), bar(49, 50, 55, 53, 2, PURPLE)])],
  speaker: [box(20, 10, 56, 80, '#5B6470', 8), dot(48, 28, 18, '#2E343C'), dot(48, 28, 6, '#9AA3AD'), part('woofer', [dot(48, 62, 38, '#2E343C'), ring(48, 62, 38, 3, '#9AA3AD'), dot(48, 62, 14, '#9AA3AD')]), part('waves', [arc(78, 50, 14, 3, 'right', SUN), arc(78, 50, 26, 3, 'right', SUN)])],
  radio: [bar(68, 36, 86, 8, 2.5, '#9AA3AD'), dot(86, 8, 6, '#9AA3AD'), box(10, 34, 80, 52, '#E8751A', 8), box(18, 42, 38, 36, '#F3E3C3', 6, { inside: [...[6, 12, 18, 24, 30].map((y) => bar(4, y, 34, y, 2, '#C9B994'))] }), dot(73, 52, 18, '#F3E3C3'), bar(73, 52, 78, 46, 2, RED), box(64, 68, 18, 6, '#B5561E', 3), part('notes', [dot(26, 22, 7, PURPLE), bar(29, 22, 29, 8, 2, PURPLE), dot(46, 14, 6, BLUE), bar(48.5, 14, 48.5, 4, 1.8, BLUE)])],
  vinyl: [part('disc', [dot(50, 50, 86, '#2E343C'), ring(50, 50, 86, 2, '#5B6470'), ring(50, 50, 70, 1, '#4A5560'), ring(50, 50, 56, 1, '#4A5560'), ring(50, 50, 42, 1, '#4A5560'), dot(50, 50, 28, RED), box(36, 48, 28, 4, '#F27D80', 2), dot(50, 50, 5, '#E3E6EA'), arc(50, 50, 76, 3, 'top', '#6B7480')])],
  cassette: [box(8, 22, 84, 56, '#F2C14E', 6), box(16, 28, 68, 14, '#FFF4E8', 3), bar(22, 35, 60, 35, 2, '#C9B994'), box(26, 48, 48, 18, '#3B2A1A', 9), part('r1', [dot(38, 57, 13, WHITE), ...rays(38, 57, 0, 6, 6, 2, '#3B2A1A')]), part('r2', [dot(62, 57, 13, WHITE), ...rays(62, 57, 0, 6, 6, 2, '#3B2A1A')]), box(30, 70, 40, 8, '#D9A22F', [4, 4, 0, 0])],
  accordion: [part('bellows', [box(30, 32, 40, 44, '#F3E3C3', 2, { inside: [...[5, 10, 15, 20, 25, 30, 35].map((x) => bar(x, 0, x, 44, 2, '#C9B994'))] })]), box(8, 28, 24, 52, RED, 5), box(68, 28, 24, 52, RED, 5), ...[38, 48, 58, 68].map((y) => dot(80, y, 5, WHITE)), ...[38, 48, 58, 68].map((y) => dot(20, y, 4, '#F3E3C3'))],
  maracas: [part('m1', [tilt(-22, [38, 88], [bar(38, 88, 38, 58, 6, '#C99A66'), oval(38, 40, 30, 40, RED), bar(28, 40, 48, 40, 3, SUN), dot(32, 30, 4, SUN), dot(44, 50, 4, SUN)])]), part('m2', [tilt(22, [62, 88], [bar(62, 88, 62, 58, 6, '#C99A66'), oval(62, 40, 30, 40, '#2F9E6E'), bar(52, 40, 72, 40, 3, SUN), dot(56, 30, 4, SUN), dot(68, 50, 4, SUN)])])],
  tambourine: [ring(50, 50, 72, 10, '#C99A66'), dot(50, 50, 60, '#F3E3C3'), part('jingles', Array.from({ length: 6 }, (_, i) => dot(50 + 36 * Math.cos((i * Math.PI) / 3), 50 + 36 * Math.sin((i * Math.PI) / 3), 12, GOLD))), tri(22, 80, 10, 18, RED, 40), tri(28, 84, 10, 18, BLUE, 20)],
  xylophone: [bar(8, 40, 92, 54, 3, BROWN), bar(8, 80, 92, 72, 3, BROWN), ...[RED, ORANGE, SUN, '#7CC36E', SKY, BLUE, PURPLE].map((c, i) => box(10 + i * 11.5, 30 + i * 2.5, 9, 56 - i * 5, c, 3)), part('mallet', [bar(62, 4, 82, 30, 3, '#C99A66'), dot(62, 4, 10, RED)])],
  flute: [bar(6, 78, 94, 26, 7, '#C9CED6'), bar(8, 76.5, 94, 25, 2, '#E3E6EA'), ...[0.3, 0.42, 0.54, 0.66, 0.78].map((t) => dot(6 + 88 * t, 78 - 52 * t, 4, '#4A5560')), dot(16, 72, 5, '#4A5560'), part('notes', [dot(38, 30, 7, PURPLE), bar(41, 30, 41, 16, 2, PURPLE), dot(70, 82, 6, BLUE), bar(72.5, 82, 72.5, 70, 1.8, BLUE)])],
  bell: [part('bell', [box(44, 8, 12, 14, '#9C5A32', 4), box(26, 20, 48, 52, GOLD, [24, 24, 4, 4]), oval(50, 72, 64, 12, '#D9A441'), dot(50, 80, 11, BROWN), oval(36, 38, 7, 16, '#F7D46A', 10)]), part('ring', [arc(18, 30, 16, 3, 'left', SUN), arc(82, 30, 16, 3, 'right', SUN)])],
  metronome: [box(16, 86, 68, 8, '#7A4425', 3), box(22, 14, 56, 74, '#9C5A32', [20, 20, 2, 2]), box(32, 26, 36, 58, '#F3E3C3', [14, 14, 2, 2]), ...[36, 46, 56, 66, 76].map((y) => bar(46, y, 54, y, 1.5, '#C9B994')), part('arm', [bar(50, 82, 50, 22, 3, INK), box(44, 36, 12, 8, GOLD, 2)])],
  'disco-ball': [bar(50, 0, 50, 16, 2, '#9AA3AD'), box(18, 16, 64, 64, '#9AA3AD', 32, { inside: Array.from({ length: 64 }, (_, i) => box((i % 8) * 8 + 0.5, Math.floor(i / 8) * 8 + 0.5, 7, 7, ['#E3E6EA', '#C9CED6', '#DCEBFA', '#F7D3E1', '#FFF1C4'][(i * 7 + Math.floor(i / 8) * 3) % 5], 1)) }), part('shine', [...star(22, 22, 12, PINK), ...star(84, 34, 10, SKY), ...star(80, 84, 12, SUN), ...star(16, 76, 9, '#7CC36E')])],
  'sound-bars': [...[RED, ORANGE, SUN, '#7CC36E', SKY, BLUE, PURPLE].map((c, i) => part('b' + i, [box(9 + i * 12, 88 - [40, 56, 70, 50, 64, 44, 30][i], 9, [40, 56, 70, 50, 64, 44, 30][i], c, 3)]))],

  // On the move.
  car: [part('lines', [bar(2, 40, 10, 40, 3, '#9AA3AD'), bar(0, 52, 6, 52, 3, '#9AA3AD')]), part('car', [box(24, 26, 46, 24, RED, [14, 14, 0, 0]), box(30, 31, 16, 15, '#BFE3F7', [8, 2, 0, 0]), box(50, 31, 15, 15, '#BFE3F7', [2, 8, 0, 0]), box(8, 44, 84, 24, RED, [8, 10, 6, 6]), box(84, 50, 8, 6, SUN, 2), box(8, 50, 6, 6, '#F7A8B8', 2), bar(46, 52, 52, 52, 2.5, RED_DARK), dot(28, 68, 20, '#3B3F48'), dot(28, 68, 8, '#C9CED6'), dot(72, 68, 20, '#3B3F48'), dot(72, 68, 8, '#C9CED6')])],
  taxi: [part('car', [box(38, 16, 24, 9, INK, 2, { inside: [box(3, 2, 18, 5, SUN, 1)] }), box(24, 26, 46, 24, '#F7C948', [14, 14, 0, 0]), box(30, 31, 16, 15, '#BFE3F7', [8, 2, 0, 0]), box(50, 31, 15, 15, '#BFE3F7', [2, 8, 0, 0]), box(8, 44, 84, 24, '#F7C948', [8, 10, 6, 6], { inside: [...Array.from({ length: 10 }, (_, i) => box(i * 8.4 + (i % 2) * 0, 8, 4.2, 4, INK)), ...Array.from({ length: 10 }, (_, i) => box(i * 8.4 + 4.2, 12, 4.2, 4, INK))] }), box(84, 50, 8, 6, WHITE, 2), dot(28, 68, 20, '#3B3F48'), dot(28, 68, 8, '#C9CED6'), dot(72, 68, 20, '#3B3F48'), dot(72, 68, 8, '#C9CED6')])],
  bus: [part('bus', [box(6, 22, 88, 52, BLUE, [10, 10, 6, 6]), ...[12, 30, 48].map((x) => box(x, 30, 15, 16, '#BFE3F7', 3)), box(70, 30, 16, 36, '#BFE3F7', 3), bar(78, 32, 78, 64, 1.5, BLUE), box(6, 54, 62, 5, WHITE, 0), box(88, 60, 6, 6, SUN, 2), dot(24, 74, 20, '#3B3F48'), dot(24, 74, 8, '#C9CED6'), dot(76, 74, 20, '#3B3F48'), dot(76, 74, 8, '#C9CED6')])],
  truck: [part('truck', [box(6, 22, 56, 46, '#E3E6EA', 4, { edge: { w: 2, c: '#9AA3AD' } }), box(14, 32, 40, 8, ORANGE, 3), box(62, 36, 32, 32, ORANGE, [12, 6, 4, 4]), box(70, 42, 16, 12, '#BFE3F7', [8, 2, 2, 2]), box(90, 60, 4, 5, SUN, 1), dot(22, 70, 18, '#3B3F48'), dot(22, 70, 7, '#C9CED6'), dot(46, 70, 18, '#3B3F48'), dot(46, 70, 7, '#C9CED6'), dot(80, 70, 18, '#3B3F48'), dot(80, 70, 7, '#C9CED6')])],
  motorbike: [part('bike', [ring(22, 70, 28, 6, '#3B3F48'), ring(78, 70, 28, 6, '#3B3F48'), bar(22, 70, 46, 62, 4, '#9AA3AD'), bar(72, 40, 78, 70, 4, '#9AA3AD'), bar(30, 64, 12, 62, 4, '#C9CED6'), box(32, 56, 34, 12, '#5B6470', 4), oval(56, 50, 28, 16, RED, -8), box(26, 46, 22, 7, INK, 3), bar(70, 40, 76, 32, 3, '#9AA3AD'), dot(80, 46, 8, SUN)])],
  scooter: [part('scooter', [dot(28, 76, 18, '#3B3F48'), dot(28, 76, 7, '#C9CED6'), dot(76, 76, 18, '#3B3F48'), dot(76, 76, 7, '#C9CED6'), box(14, 50, 40, 22, '#7FC8F8', [18, 6, 6, 14]), box(40, 64, 34, 8, '#7FC8F8', 3), bar(72, 30, 78, 66, 10, '#7FC8F8'), oval(34, 46, 30, 10, BROWN), bar(64, 24, 80, 24, 3, '#9AA3AD'), dot(80, 32, 8, SUN), box(16, 40, 14, 6, '#5B6470', 2)])],
  bicycle: [part('w1', [ring(24, 66, 34, 3.5, '#6B7480'), ...rays(24, 66, 0, 15, 4, 1.2, '#9AA3AD')]), part('w2', [ring(76, 66, 34, 3.5, '#6B7480'), ...rays(76, 66, 0, 15, 4, 1.2, '#9AA3AD', 45)]), bar(24, 66, 46, 66, 3.5, '#2F9E6E'), bar(24, 66, 38, 40, 3.5, '#2F9E6E'), bar(38, 40, 46, 66, 3.5, '#2F9E6E'), bar(38, 40, 66, 40, 3.5, '#2F9E6E'), bar(66, 40, 46, 66, 3.5, '#2F9E6E'), bar(66, 40, 76, 66, 3.5, '#2F9E6E'), box(30, 33, 16, 5, INK, 2), bar(66, 40, 68, 30, 3, '#9AA3AD'), bar(62, 30, 74, 30, 3, '#9AA3AD'), dot(46, 66, 6, '#5B6470')],
  'kick-scooter': [part('scooter', [bar(20, 76, 72, 76, 6, '#5B6470'), bar(72, 76, 80, 20, 4, '#9AA3AD'), bar(70, 20, 90, 20, 5, RED), dot(20, 82, 14, '#3B3F48'), dot(20, 82, 5, '#C9CED6'), dot(78, 82, 14, '#3B3F48'), dot(78, 82, 5, '#C9CED6')]), part('lines', [bar(2, 60, 12, 60, 3, '#9AA3AD'), bar(4, 70, 12, 70, 3, '#9AA3AD')])],
  train: [bar(4, 86, 96, 86, 3, '#9AA3AD'), part('train', [box(6, 26, 84, 50, '#E3E6EA', [10, 34, 6, 4], { edge: { w: 2, c: '#9AA3AD' } }), box(6, 58, 84, 6, RED, 0), box(14, 34, 14, 14, '#7FC8F8', 3), box(34, 34, 14, 14, '#7FC8F8', 3), box(54, 34, 14, 14, '#7FC8F8', 3), box(72, 32, 14, 18, '#7FC8F8', [3, 12, 3, 3]), dot(84, 66, 6, SUN), dot(22, 80, 10, '#3B3F48'), dot(42, 80, 10, '#3B3F48'), dot(70, 80, 10, '#3B3F48')])],
  tram: [bar(0, 8, 100, 8, 1.5, '#9AA3AD'), part('tram', [bar(40, 24, 50, 9, 2, '#5B6470'), bar(60, 24, 50, 9, 2, '#5B6470'), box(14, 24, 72, 56, SUN, 8), box(14, 60, 72, 6, '#2F9E6E', 0), ...[20, 38, 56].map((x) => box(x, 32, 14, 18, '#BFE3F7', 3)), box(72, 32, 8, 18, '#BFE3F7', 3), dot(28, 82, 10, '#3B3F48'), dot(72, 82, 10, '#3B3F48')])],
  'steam-train': [part('smoke', [dot(70, 14, 12, '#C9CED6'), dot(80, 8, 9, '#C9CED6'), dot(60, 8, 7, '#C9CED6')]), part('train', [box(64, 22, 10, 22, '#4A5560', 2), box(62, 20, 14, 5, '#4A5560', 2), box(30, 42, 54, 28, '#2F7A6A', [12, 6, 0, 0]), box(84, 50, 8, 12, SUN, 3), box(8, 30, 28, 40, RED, 3), box(6, 26, 32, 6, '#4A5560', 2), box(13, 36, 18, 14, '#BFE3F7', 2), box(6, 68, 86, 6, '#4A5560', 2), dot(22, 78, 18, '#3B3F48'), dot(22, 78, 7, RED), dot(50, 80, 14, '#3B3F48'), dot(50, 80, 6, RED), dot(74, 80, 14, '#3B3F48'), dot(74, 80, 6, RED)])],
  airplane: [part('clouds', [...cloud(18, 78, 0.35, WHITE, CLOUD_EDGE), ...cloud(82, 20, 0.3, WHITE, CLOUD_EDGE)]), part('plane', [tilt(-20, [50, 50], [tri(50, 34, 20, 34, BLUE, -20), tri(50, 66, 20, 34, BLUE, 200), tri(16, 40, 12, 20, RED), oval(50, 50, 84, 18, '#E3E6EA'), ...[38, 48, 58, 68].map((x) => dot(x, 48, 5, '#7FC8F8')), box(78, 44, 8, 8, '#7FC8F8', [2, 6, 2, 2])])])],
  helicopter: [part('heli', [bar(50, 38, 50, 26, 3, '#5B6470'), bar(24, 54, 6, 44, 7, RED), bar(4, 38, 8, 50, 3, '#5B6470'), oval(50, 56, 50, 36, RED), oval(60, 52, 22, 18, '#BFE3F7'), bar(34, 74, 34, 82, 2.5, '#5B6470'), bar(62, 74, 62, 82, 2.5, '#5B6470'), bar(24, 82, 74, 82, 3, '#5B6470'), part('rotor', [bar(10, 26, 90, 26, 3.5, '#5B6470')])])],
  'hot-air-balloon': [part('clouds', [...cloud(80, 76, 0.32, WHITE, CLOUD_EDGE)]), part('balloon', [tri(50, 64, 36, 18, RED, 180), box(20, 4, 60, 62, RED, 30, { inside: [box(14, 0, 9, 62, SUN), box(37, 0, 9, 62, SUN)] }), bar(36, 70, 44, 80, 1.5, BROWN), bar(64, 70, 56, 80, 1.5, BROWN), box(42, 78, 16, 14, '#9C5A32', 3)])],
  speedboat: [part('boat', [box(44, 40, 18, 14, '#BFE3F7', [8, 2, 0, 0]), box(12, 52, 80, 18, WHITE, [0, 4, 24, 6], { edge: { w: 2, c: '#C9CED6' }, inside: [box(0, 6, 80, 4, RED)] })]), part('spray', [dot(6, 64, 8, '#BFE3F7'), dot(10, 56, 6, '#BFE3F7'), dot(4, 50, 4, '#BFE3F7')]), part('waves', [box(4, 72, 92, 14, '#3E8FD6', 7), arc(28, 80, 10, 2, 'top', WHITE), arc(60, 80, 10, 2, 'top', WHITE)])],
  'police-car': [part('siren', [box(40, 16, 10, 10, RED, [4, 0, 0, 0]), box(50, 16, 10, 10, BLUE, [0, 4, 0, 0])]), box(24, 26, 46, 24, '#2C3A63', [14, 14, 0, 0]), box(30, 31, 16, 15, '#BFE3F7', [8, 2, 0, 0]), box(50, 31, 15, 15, '#BFE3F7', [2, 8, 0, 0]), box(8, 44, 84, 24, WHITE, [8, 10, 6, 6], { edge: { w: 2, c: '#C9CED6' }, inside: [box(0, 8, 84, 6, BLUE)] }), box(84, 50, 8, 6, SUN, 2), dot(28, 68, 20, '#3B3F48'), dot(28, 68, 8, '#C9CED6'), dot(72, 68, 20, '#3B3F48'), dot(72, 68, 8, '#C9CED6')],
  ambulance: [part('siren', [box(30, 18, 12, 8, RED, [4, 4, 0, 0])]), box(6, 26, 60, 46, '#F3F4F6', [6, 4, 4, 4], { edge: { w: 2, c: '#C9CED6' } }), box(64, 40, 30, 32, '#F3F4F6', [12, 6, 4, 4], { edge: { w: 2, c: '#C9CED6' } }), box(70, 45, 16, 12, '#BFE3F7', [8, 2, 2, 2]), box(30, 36, 10, 26, RED, 1), box(22, 44, 26, 10, RED, 1), box(6, 62, 88, 4, RED, 0), dot(24, 74, 18, '#3B3F48'), dot(24, 74, 7, '#C9CED6'), dot(76, 74, 18, '#3B3F48'), dot(76, 74, 7, '#C9CED6')],
  'fire-engine': [part('siren', [box(70, 26, 10, 8, '#7FC8F8', [4, 4, 0, 0])]), part('ladder', [bar(10, 30, 62, 22, 3, '#C9CED6'), bar(10, 36, 62, 28, 3, '#C9CED6'), ...[18, 28, 38, 48, 58].map((x) => bar(x, 35 - (x - 10) * 0.154, x, 29 - (x - 10) * 0.154, 2, '#C9CED6'))]), box(6, 40, 60, 32, RED, 4), box(64, 34, 30, 38, RED, [12, 6, 4, 4]), box(70, 40, 16, 12, '#BFE3F7', [8, 2, 2, 2]), box(12, 48, 46, 6, GOLD, 2), dot(24, 74, 18, '#3B3F48'), dot(24, 74, 7, '#C9CED6'), dot(76, 74, 18, '#3B3F48'), dot(76, 74, 7, '#C9CED6')],
  tractor: [part('smoke', [dot(66, 12, 9, '#C9CED6'), dot(74, 6, 6, '#C9CED6')]), bar(66, 46, 66, 22, 4, '#5B6470'), box(18, 22, 30, 34, '#2F9E5A', 3), box(23, 27, 20, 14, '#BFE3F7', 2), box(38, 44, 50, 22, '#2F9E5A', 4), box(86, 50, 6, 8, SUN, 2), dot(30, 68, 38, '#3B3F48'), dot(30, 68, 16, SUN), dot(76, 76, 22, '#3B3F48'), dot(76, 76, 9, SUN)],
  'traffic-light': [bar(50, 80, 50, 96, 5, '#5B6470'), box(32, 4, 36, 78, '#4A5560', 10), part('red', [dot(50, 20, 20, RED)]), part('yellow', [dot(50, 43, 20, SUN)]), part('green', [dot(50, 66, 20, '#3CC36B')])],
  'fuel-pump': [box(14, 86, 56, 8, '#5B6470', 3), box(20, 18, 44, 70, RED, 6), box(28, 26, 28, 18, '#BFE3F7', 3), box(28, 52, 28, 8, RED_DARK, 2), bar(64, 40, 80, 46, 4, '#4A5560'), bar(80, 46, 80, 70, 4, '#4A5560'), box(74, 24, 12, 18, '#5B6470', 3), part('drop', [box(76, 72, 8, 8, SUN, [0, 4, 4, 4], { turn: 45 })])],
  suitcase: [box(38, 18, 24, 14, 'transparent', 5, { edge: { w: 4, c: '#7A4425' } }), box(14, 30, 72, 56, '#E8751A', 8), bar(32, 32, 32, 84, 4, '#B5561E'), bar(68, 32, 68, 84, 4, '#B5561E'), dot(24, 92, 8, '#3B3F48'), dot(76, 92, 8, '#3B3F48'), dot(50, 50, 14, '#7FC8F8'), box(42, 64, 16, 10, '#FFF4E8', 2, { turn: 10 })],
  map: [box(8, 22, 28, 62, '#F3E3C3', 2), box(36, 16, 28, 62, '#E8D4A8', 2), box(64, 22, 28, 62, '#F3E3C3', 2), oval(22, 40, 18, 14, '#9BD08A'), oval(78, 66, 18, 16, '#9BD08A'), oval(50, 66, 20, 12, '#7FC8F8'), ...[[16, 70], [26, 62], [36, 56], [46, 48], [56, 42]].map(([x, y]) => dot(x, y, 4, RED)), part('pin', [dot(66, 32, 16, RED), tri(66, 43, 10, 12, RED, 180), dot(66, 32, 6, WHITE)])],
  ticket: [part('ticket', [box(10, 30, 80, 42, '#FF7EB6', 6), box(62, 30, 2, 42, '#FFD1E1'), ...[34, 42, 50, 58, 66].map((y) => dot(63, y, 3, '#E55E9A')), box(18, 40, 36, 6, '#FFD1E1', 3), box(18, 52, 26, 5, '#FFD1E1', 2.5), ...star(76, 51, 14, SUN)])],

  // Flowers and plants.
  sunflower: [bar(50, 94, 50, 50, 4, '#3F8E3F'), oval(38, 72, 22, 10, '#4FA34A', -30), oval(62, 64, 22, 10, '#4FA34A', 30), part('head', [...Array.from({ length: 12 }, (_, i) => oval(50 + 20 * Math.cos(((i * 30 + 0) * Math.PI) / 180), 36 + 20 * Math.sin(((i * 30 + 0) * Math.PI) / 180), 22, 11, SUN, i * 30 + 0)), ...Array.from({ length: 12 }, (_, i) => oval(50 + 17 * Math.cos(((i * 30 + 15) * Math.PI) / 180), 36 + 17 * Math.sin(((i * 30 + 15) * Math.PI) / 180), 16, 9, GOLD, i * 30 + 15)), dot(50, 36, 28, '#7A4425'), dot(44, 32, 4, '#5B3A20'), dot(56, 34, 4, '#5B3A20'), dot(50, 42, 4, '#5B3A20')])],
  tulip: [bar(50, 94, 50, 46, 4, '#3F8E3F'), oval(38, 76, 12, 34, '#4FA34A', -25), oval(62, 74, 12, 34, '#4FA34A', 25), part('flower', [tri(38, 22, 12, 18, RED), tri(62, 22, 12, 18, RED), box(35, 22, 30, 28, RED, [4, 4, 15, 15]), tri(50, 20, 14, 22, RED_DARK), oval(42, 32, 5, 12, '#F27D80')])],
  daisy: [bar(50, 94, 50, 50, 3.5, '#3F8E3F'), oval(40, 76, 20, 9, '#4FA34A', -30), part('head', [...Array.from({ length: 12 }, (_, i) => oval(50 + 18 * Math.cos(((i * 30 + 0) * Math.PI) / 180), 40 + 18 * Math.sin(((i * 30 + 0) * Math.PI) / 180), 22, 11, '#D5DCE4', i * 30 + 0)), ...Array.from({ length: 12 }, (_, i) => oval(50 + 18 * Math.cos(((i * 30 + 0) * Math.PI) / 180), 40 + 18 * Math.sin(((i * 30 + 0) * Math.PI) / 180), 19, 8, WHITE, i * 30 + 0)), dot(50, 40, 18, SUN), dot(47, 37, 5, '#FFE29A')])],
  cactus: [box(26, 70, 48, 8, '#B5561E', 3), box(30, 76, 40, 18, '#D9823B', [0, 0, 8, 8]), box(40, 22, 20, 52, '#4FA34A', [10, 10, 0, 0]), box(22, 36, 12, 26, '#4FA34A', 6), bar(28, 58, 42, 58, 9, '#4FA34A'), box(66, 28, 12, 24, '#4FA34A', 6), bar(58, 48, 72, 48, 9, '#4FA34A'), ...[[46, 34], [54, 46], [46, 58], [28, 44], [72, 36]].map(([x, y]) => bar(x - 2, y, x + 2, y, 1.5, '#C8E6A0')), part('bloom', [...Array.from({ length: 5 }, (_, i) => oval(50 + 4.8999999999999995 * Math.cos(((i * 72 + -90) * Math.PI) / 180), 20 + 4.8999999999999995 * Math.sin(((i * 72 + -90) * Math.PI) / 180), 9.799999999999999, 7.699999999999999, PINK, i * 72 + -90)), dot(50, 20, 5.6, SUN)])],
  'potted-plant': [part('leaves', [oval(28, 54, 12, 28, '#3F8E3F', -60), oval(72, 54, 12, 28, '#3F8E3F', 60), oval(36, 40, 14, 36, '#4FA34A', -30), oval(64, 40, 14, 36, '#4FA34A', 30), oval(50, 32, 14, 42, '#5BB45A'), bar(50, 64, 50, 20, 2, '#3F8E3F')]), box(28, 62, 44, 8, '#B5561E', 3), box(32, 68, 36, 26, '#D9823B', [0, 0, 10, 10])],
  'palm-tree': [oval(50, 92, 70, 12, '#E8C98E'), bar(46, 92, 52, 38, 8, '#9C6A3A'), ...[50, 60, 70, 80].map((y) => bar(44 + (92 - y) * 0.1, y, 54 + (92 - y) * 0.1, y, 2, '#7A5030')), part('leaves', [oval(32, 32, 38, 12, '#4FA34A', -20), oval(72, 32, 38, 12, '#4FA34A', 20), oval(30, 46, 34, 10, '#3F8E3F', 35), oval(74, 46, 34, 10, '#3F8E3F', -35), oval(52, 22, 12, 30, '#5BB45A'), dot(47, 42, 10, BROWN), dot(57, 42, 10, BROWN)])],
  'fir-tree': [box(44, 80, 12, 14, BROWN, 2), tri(50, 26, 40, 30, '#2F7A4A'), tri(50, 46, 56, 34, '#2F7A4A'), tri(50, 66, 72, 34, '#2F7A4A'), part('snow', [dot(20, 20, 5, WHITE), dot(82, 30, 4, WHITE), dot(30, 50, 4, WHITE), dot(76, 60, 5, WHITE), dot(60, 14, 4, WHITE)])],
  'leafy-tree': [box(44, 58, 12, 36, '#9C6A3A', 3), bar(50, 70, 38, 58, 4, '#9C6A3A'), part('crown', [dot(32, 48, 32, '#4FA34A'), dot(68, 48, 32, '#4FA34A'), dot(50, 34, 48, '#4FA34A'), dot(40, 26, 26, '#5BB45A'), dot(62, 28, 24, '#5BB45A')]), part('apples', [dot(36, 46, 8, RED), dot(60, 40, 8, RED), dot(70, 54, 8, RED), dot(48, 22, 7, RED)])],
  clover: [bar(50, 50, 62, 92, 3.5, '#3F8E3F'), part('leaves', [...[0, 90, 180, 270].map((t) => tilt(t, [50, 46], [heart(50, 22, 34, t % 180 ? '#4FA34A' : '#5BB45A')])), dot(50, 46, 6, '#3F8E3F')])],
  mushroom: [oval(50, 90, 66, 10, '#4FA34A'), part('shroom', [box(40, 50, 20, 40, '#F3E3C3', [4, 4, 8, 8]), box(14, 18, 72, 40, RED, [36, 36, 6, 6]), dot(32, 34, 10, WHITE), dot(56, 26, 12, WHITE), dot(70, 42, 8, WHITE), dot(44, 46, 7, WHITE)])],
  seedling: [oval(50, 86, 64, 14, '#7A4425'), oval(50, 83, 50, 6, '#9C6A3A'), part('sprout', [bar(50, 84, 50, 54, 3.5, '#3F8E3F'), oval(36, 50, 28, 13, '#5BB45A', -25), oval(64, 46, 28, 13, '#4FA34A', 25)])],
  'cherry-blossom': [bar(6, 82, 90, 30, 4, '#7A4425'), bar(48, 56, 56, 80, 3, '#7A4425'), part('flowers', [...Array.from({ length: 5 }, (_, i) => oval(30 + 9.1 * Math.cos(((i * 72 + -90) * Math.PI) / 180), 62 + 9.1 * Math.sin(((i * 72 + -90) * Math.PI) / 180), 18.2, 14.3, '#F7A8C0', i * 72 + -90)), dot(30, 62, 10.4, '#E55E9A'), ...Array.from({ length: 5 }, (_, i) => oval(64 + 9.1 * Math.cos(((i * 72 + -90) * Math.PI) / 180), 40 + 9.1 * Math.sin(((i * 72 + -90) * Math.PI) / 180), 18.2, 14.3, '#FFC2D6', i * 72 + -90)), dot(64, 40, 10.4, '#E55E9A'), ...Array.from({ length: 5 }, (_, i) => oval(56 + 7 * Math.cos(((i * 72 + -90) * Math.PI) / 180), 80 + 7 * Math.sin(((i * 72 + -90) * Math.PI) / 180), 14, 11, '#F7A8C0', i * 72 + -90)), dot(56, 80, 8, '#E55E9A'), ...Array.from({ length: 5 }, (_, i) => oval(84 + 6.3 * Math.cos(((i * 72 + -90) * Math.PI) / 180), 30 + 6.3 * Math.sin(((i * 72 + -90) * Math.PI) / 180), 12.6, 9.9, '#FFC2D6', i * 72 + -90)), dot(84, 30, 7.2, '#E55E9A')]), part('petal', [oval(24, 30, 8, 6, '#FFC2D6', 30), oval(74, 72, 8, 6, '#F7A8C0', -30)])],
  lavender: [box(36, 80, 28, 14, '#C9B994', [2, 2, 6, 6]), part('stems', [...[[36, -14], [50, 0], [64, 14]].flatMap(([x, t]) => [tilt(t, [50, 84], [bar(50, 84, 50, 30, 2.5, '#3F8E3F'), ...[20, 28, 36, 44, 52].flatMap((y) => [oval(46.5, y, 6, 9, PURPLE, -20), oval(53.5, y, 6, 9, '#B48BE0', 20)]), dot(50, 15, 6, '#B48BE0')])]), bar(34, 82, 66, 82, 3, '#9C6A3A')])],
  poppy: [bar(50, 94, 52, 54, 3.5, '#3F8E3F'), oval(40, 80, 18, 8, '#4FA34A', -30), part('flower', [dot(38, 36, 34, RED), dot(62, 36, 34, RED), dot(50, 24, 34, '#F05A60'), dot(50, 48, 34, RED_DARK), dot(50, 38, 16, INK), ...rays(50, 38, 8, 13, 8, 1.5, INK)])],
  hibiscus: [oval(22, 80, 30, 14, '#4FA34A', -30), oval(78, 80, 30, 14, '#4FA34A', 30), part('flower', [...Array.from({ length: 5 }, (_, i) => oval(50 + 20 * Math.cos(((i * 72 + -90) * Math.PI) / 180), 50 + 20 * Math.sin(((i * 72 + -90) * Math.PI) / 180), 32, 30, '#FF5A8A', i * 72 + -90)), dot(50, 50, 16, '#C9184A'), bar(50, 50, 70, 26, 2.5, SUN), dot(70, 26, 6, SUN), dot(66, 30, 4, SUN), dot(73, 31, 4, SUN)])],
  'maple-leaf': [part('leaf', [bar(50, 58, 54, 92, 3, '#9C4A1A'), ...star(50, 42, 72, '#E8751A'), tri(28, 58, 18, 20, '#E8751A', -120), tri(72, 58, 18, 20, '#E8751A', 120), bar(50, 60, 50, 22, 1.5, '#C95A0A'), bar(50, 46, 30, 32, 1.5, '#C95A0A'), bar(50, 46, 70, 32, 1.5, '#C95A0A')])],
  lotus: [oval(50, 82, 92, 20, '#3E8FD6'), oval(26, 80, 34, 12, '#4FA34A'), oval(76, 84, 30, 10, '#4FA34A'), part('flower', [oval(30, 58, 20, 34, '#F7A8C0', -50), oval(70, 58, 20, 34, '#F7A8C0', 50), oval(40, 52, 20, 38, '#FF8FB8', -22), oval(60, 52, 20, 38, '#FF8FB8', 22), oval(50, 48, 20, 42, '#FFC2D6'), oval(50, 70, 44, 10, '#E55E9A')])],
  bonsai: [box(20, 76, 60, 14, '#3B6EA8', [2, 2, 8, 8]), box(16, 72, 68, 7, '#2C5A8C', 3), bar(48, 74, 42, 56, 5, '#7A5030'), bar(42, 56, 56, 42, 4, '#7A5030'), bar(56, 42, 46, 30, 3.5, '#7A5030'), bar(44, 58, 24, 50, 3, '#7A5030'), part('leaves', [oval(24, 46, 30, 14, '#4FA34A'), oval(62, 38, 32, 14, '#4FA34A'), oval(44, 24, 36, 16, '#5BB45A'), oval(70, 30, 18, 10, '#5BB45A')])],
  basil: [part('bush', [...[[30, 50], [42, 40], [56, 38], [68, 48], [36, 30], [52, 26], [64, 30], [26, 40], [48, 50], [74, 38], [44, 22], [58, 50]].map(([x, y], i) => oval(x, y, 14, 18, i % 2 ? '#4FA34A' : '#5BB45A', i * 30))]), box(26, 58, 48, 36, '#D9823B', [2, 2, 10, 10]), box(26, 64, 48, 6, '#F3E3C3', 0), box(22, 56, 56, 6, '#B5561E', 3)],
  'watering-can': [part('can', [box(26, 28, 34, 30, 'transparent', 12, { edge: { w: 5, c: '#3E8FD6' } }), bar(64, 64, 86, 40, 6, '#7FC8F8'), oval(88, 37, 10, 15, '#3E8FD6', -40), box(20, 44, 48, 40, '#7FC8F8', [6, 6, 10, 10]), box(20, 52, 48, 5, '#5BA8D8', 0)]), part('drops', [dot(90, 52, 5, '#3E8FD6'), dot(96, 60, 4, '#3E8FD6'), dot(86, 64, 4, '#3E8FD6')])],
  dandelion: [bar(50, 94, 46, 50, 3, '#3F8E3F'), oval(38, 84, 18, 6, '#4FA34A', -30), ...rays(46, 36, 3, 22, 16, 1, '#C9CED6'), ...Array.from({ length: 16 }, (_, i) => dot(46 + 22 * Math.cos(((i * 22.5 - 90) * Math.PI) / 180), 36 + 22 * Math.sin(((i * 22.5 - 90) * Math.PI) / 180), 5, '#E3E6EA')), dot(46, 36, 8, '#9AA3AD'), part('seeds', [bar(78, 26, 84, 20, 1, '#C9CED6'), dot(84, 20, 5, '#E3E6EA'), bar(86, 40, 92, 36, 1, '#C9CED6'), dot(92, 36, 4, '#E3E6EA')])],
  snail: [part('feelers', [bar(80, 60, 76, 44, 2, '#B8A47A'), bar(86, 60, 90, 44, 2, '#B8A47A'), dot(76, 43, 5, '#B8A47A'), dot(90, 43, 5, '#B8A47A')]), oval(56, 78, 76, 16, '#D9C79E'), oval(83, 64, 14, 22, '#D9C79E'), dot(85, 60, 4, INK), dot(44, 52, 46, '#D9823B'), ring(45, 53, 32, 4, '#B5561E'), ring(47, 54, 16, 3.5, '#B5561E'), dot(36, 40, 6, '#F0A866')],
  violets: [heart(28, 70, 26, '#4FA34A'), heart(72, 72, 24, '#3F8E3F'), heart(50, 80, 22, '#5BB45A'), part('flowers', [...Array.from({ length: 5 }, (_, i) => oval(32 + 8.4 * Math.cos(((i * 72 + -90) * Math.PI) / 180), 42 + 8.4 * Math.sin(((i * 72 + -90) * Math.PI) / 180), 16.8, 13.2, PURPLE, i * 72 + -90)), dot(32, 42, 9.6, '#FFE29A'), ...Array.from({ length: 5 }, (_, i) => oval(64 + 8.4 * Math.cos(((i * 72 + -90) * Math.PI) / 180), 36 + 8.4 * Math.sin(((i * 72 + -90) * Math.PI) / 180), 16.8, 13.2, '#B48BE0', i * 72 + -90)), dot(64, 36, 9.6, '#FFE29A'), ...Array.from({ length: 5 }, (_, i) => oval(48 + 7 * Math.cos(((i * 72 + -90) * Math.PI) / 180), 60 + 7 * Math.sin(((i * 72 + -90) * Math.PI) / 180), 14, 11, PURPLE, i * 72 + -90)), dot(48, 60, 8, '#FFE29A')])],
  fern: [part('fern', [bar(44, 94, 54, 12, 3, '#3F8E3F'), ...[0, 1, 2, 3, 4, 5, 6].flatMap((i) => [oval(44 + i * 1.4 - (14 - i * 1.4), 84 - i * 10.5, 26 - i * 2.6, 8, i % 2 ? '#4FA34A' : '#5BB45A', -20), oval(44 + i * 1.4 + (14 - i * 1.4), 82 - i * 10.5, 26 - i * 2.6, 8, i % 2 ? '#5BB45A' : '#4FA34A', 20)])])],

  // Fruit and veg.
  apple: [bar(50, 34, 53, 14, 3.5, BROWN), part('leaf', [oval(64, 18, 22, 10, '#4FA34A', -30)]), dot(38, 58, 50, RED), dot(62, 58, 50, RED), dot(50, 70, 44, RED), oval(32, 48, 8, 16, '#F27D80', 20)],
  pear: [bar(50, 22, 54, 8, 3.5, BROWN), part('leaf', [oval(62, 12, 18, 9, '#4FA34A', -30)]), dot(50, 68, 52, '#B8D44A'), dot(50, 40, 32, '#B8D44A'), oval(50, 54, 38, 30, '#B8D44A'), oval(40, 62, 8, 16, '#D9EC8A', 15), dot(62, 74, 3, '#8A9E2A')],
  orange: [dot(50, 56, 72, ORANGE), ...[[34, 44], [60, 40], [70, 62], [44, 70], [56, 56], [30, 60]].map(([x, y]) => dot(x, y, 3, '#E07A2A')), bar(50, 22, 50, 14, 3, BROWN), part('leaf', [oval(62, 16, 22, 10, '#4FA34A', -30)]), oval(34, 42, 10, 16, '#FBB673', 25)],
  lemon: [tilt(-20, [50, 54], [oval(17, 54, 14, 12, '#F7DC4A'), oval(83, 54, 14, 12, '#F7DC4A'), oval(50, 54, 66, 50, '#F7DC4A'), oval(36, 44, 14, 8, '#FFF1A8', -10)]), part('leaf', [oval(70, 22, 22, 10, '#4FA34A', -30)])],
  banana: [tilt(-80, [50, 44], [...crescent(50, 44, 36, 22, '#F7DC4A'), dot(67.5, 13.5, 6, '#7A5030'), dot(67.5, 74.5, 6, '#9C7A30')])],
  grapes: [bar(50, 22, 54, 6, 3, BROWN), part('leaf', [oval(66, 14, 24, 12, '#4FA34A', -20)]), ...[[38, 30], [50, 30], [62, 30], [32, 44], [44, 44], [56, 44], [68, 44], [38, 58], [50, 58], [62, 58], [44, 72], [56, 72], [50, 85]].flatMap(([x, y]) => [dot(x, y, 15, PURPLE), dot(x - 2.5, y - 2.5, 4, '#C9A8F0')])],
  cherries: [part('cherries', [bar(34, 66, 54, 16, 2.5, '#6B8E3A'), bar(66, 62, 54, 16, 2.5, '#6B8E3A'), oval(64, 14, 24, 10, '#4FA34A', -15), dot(34, 72, 32, RED), dot(66, 68, 32, RED_DARK), oval(27, 64, 6, 10, '#F27D80', 25), oval(59, 60, 6, 10, '#F07A80', 25)])],
  peach: [dot(50, 58, 70, '#FFB07A'), oval(62, 62, 34, 40, '#FF8A6A', 20), arc(46, 58, 40, 2.5, 'right', '#E8735A'), bar(50, 24, 52, 14, 3, BROWN), part('leaf', [oval(64, 16, 22, 10, '#4FA34A', -30)]), oval(32, 46, 8, 14, '#FFD3B5', 20)],
  pineapple: [part('crown', [tri(50, 20, 12, 30, '#3F8E3F'), tri(40, 24, 10, 26, '#4FA34A', -25), tri(60, 24, 10, 26, '#4FA34A', 25), tri(32, 30, 9, 20, '#5BB45A', -50), tri(68, 30, 9, 20, '#5BB45A', 50)]), box(26, 34, 48, 60, '#F2B33D', 24, { inside: [...[-24, -12, 0, 12, 24, 36].map((x) => bar(x, 0, x + 48, 60, 2, '#D9922A')), ...[-24, -12, 0, 12, 24, 36].map((x) => bar(x + 48, 0, x, 60, 2, '#D9922A'))] })],
  mango: [oval(50, 58, 60, 72, '#F7B733', 30), oval(36, 46, 30, 40, '#F07A3C', 30), oval(64, 74, 14, 18, '#FFD36A', 30), bar(36, 26, 32, 16, 3, BROWN), part('leaf', [oval(46, 14, 24, 11, '#4FA34A', -15)])],
  kiwi: [dot(50, 50, 78, '#8A6A3A'), dot(50, 50, 70, '#8CC63F'), dot(50, 50, 44, '#A6D65A'), part('seeds', [...Array.from({ length: 12 }, (_, i) => oval(50 + 16 * Math.cos((i * Math.PI) / 6), 50 + 16 * Math.sin((i * Math.PI) / 6), 5, 3, INK, i * 30)), dot(50, 50, 18, '#E8F5C8')])],
  avocado: [oval(50, 56, 58, 76, '#3F7A2A', -10), oval(50, 58, 48, 64, '#C8E07A', -10), part('pit', [dot(51, 66, 28, '#8A5A33'), dot(46, 61, 7, '#B07A4A')])],
  coconut: [dot(50, 60, 68, '#7A5030'), oval(50, 40, 48, 14, '#F3EADB'), oval(50, 40, 40, 9, WHITE), part('straw', [bar(58, 40, 74, 8, 4, '#FF7EB6'), bar(74, 8, 82, 8, 4, '#FF7EB6')]), tri(30, 30, 24, 12, SUN), bar(30, 30, 34, 42, 2, BROWN), dot(40, 66, 5, '#5B3A20'), dot(50, 72, 5, '#5B3A20'), dot(60, 66, 5, '#5B3A20')],
  fig: [dot(50, 64, 60, '#7A4A8C'), oval(50, 40, 32, 36, '#7A4A8C'), box(46, 16, 8, 10, '#6B8E3A', 2), oval(38, 58, 8, 18, '#A67ABA', 15), part('half', [dot(76, 80, 30, '#7A4A8C'), dot(76, 80, 24, '#F7A8C0'), ...[0, 1, 2, 3, 4, 5].map((i) => dot(76 + 6 * Math.cos(i * 1.05), 80 + 6 * Math.sin(i * 1.05), 3, '#C9184A'))])],
  melon: [part('slice', [box(10, 34, 80, 42, '#9CC34A', [0, 0, 40, 40]), box(15, 34, 70, 36, '#FFD3A0', [0, 0, 35, 35]), box(22, 34, 56, 28, '#FFB07A', [0, 0, 28, 28]), ...[30, 40, 50, 60, 70].map((x) => oval(x, 44, 4, 7, '#E8C98E'))])],
  blueberries: [part('leaf', [oval(66, 20, 26, 12, '#4FA34A', -25)]), ...[[34, 44, 30], [62, 46, 28], [48, 66, 32], [26, 70, 24], [72, 72, 24]].flatMap(([x, y, d]) => [dot(x, y, d, '#3D5BA8'), dot(x - d / 6, y - d / 6, d / 4, '#7F98D8'), ...star(x, y - d * 0.32, d * 0.28, '#24356E')])],
  tomato: [dot(50, 58, 72, RED), oval(32, 44, 10, 18, '#F27D80', 25), part('top', [...star(50, 26, 30, '#3F8E3F'), bar(50, 24, 52, 12, 3, '#3F8E3F')])],
  carrot: [part('leaves', [oval(40, 16, 10, 26, '#4FA34A', -25), oval(50, 12, 10, 28, '#5BB45A'), oval(60, 16, 10, 26, '#4FA34A', 25)]), tri(50, 60, 34, 66, ORANGE, 180), bar(40, 40, 48, 40, 2, '#D9631A'), bar(52, 54, 60, 54, 2, '#D9631A'), bar(44, 66, 50, 66, 2, '#D9631A'), box(32, 26, 36, 6, ORANGE, 3)],
  aubergine: [tilt(35, [50, 54], [oval(50, 62, 42, 64, '#6B3A8C'), oval(40, 54, 8, 22, '#9A6ABA'), tri(50, 26, 26, 14, '#4FA34A', 180), oval(50, 24, 22, 10, '#4FA34A'), bar(50, 22, 50, 8, 4, '#3F8E3F')])],
  corn: [oval(50, 44, 34, 72, '#F7DC4A'), ...Array.from({ length: 21 }, (_, i) => dot(41 + (i % 3) * 9, 20 + Math.floor(i / 3) * 8, 7, '#F2C14E')), part('husk', [oval(32, 68, 18, 52, '#4FA34A', -18), oval(68, 68, 18, 52, '#5BB45A', 18), oval(50, 80, 22, 36, '#3F8E3F')])],
  broccoli: [box(42, 56, 16, 36, '#8CC63F', [2, 2, 6, 6]), bar(46, 60, 34, 50, 6, '#8CC63F'), bar(54, 60, 66, 50, 6, '#8CC63F'), part('top', [dot(30, 44, 28, '#3F8E3F'), dot(70, 44, 28, '#3F8E3F'), dot(50, 32, 34, '#4FA34A'), dot(38, 22, 24, '#5BB45A'), dot(62, 24, 24, '#5BB45A'), dot(50, 50, 22, '#3F8E3F')])],
  pepper: [dot(36, 62, 42, RED), dot(64, 62, 42, RED), dot(50, 60, 40, RED_DARK), oval(50, 66, 30, 44, RED), oval(32, 54, 8, 18, '#F27D80', 15), box(38, 28, 24, 10, '#4FA34A', 5), part('stem', [bar(50, 30, 54, 14, 4, '#3F8E3F')])],
  potato: [oval(50, 58, 76, 54, '#C9A26B', -10), oval(36, 46, 16, 10, '#DABA88', -10), ...[[30, 60], [52, 48], [66, 66], [44, 72], [70, 50]].map(([x, y]) => dot(x, y, 4, '#9C7A4A'))],
  garlic: [tri(50, 26, 18, 28, '#F3EADB'), oval(50, 62, 64, 50, '#F3EADB'), arc(36, 62, 30, 2.5, 'right', '#D9CFBF'), arc(64, 62, 30, 2.5, 'left', '#D9CFBF'), bar(50, 40, 50, 84, 2, '#D9CFBF'), part('roots', [...[42, 46, 50, 54, 58].map((x) => bar(x, 86, x + (x - 50) * 0.3, 94, 1.5, '#C9B994'))]), oval(34, 52, 8, 14, WHITE, 20)],

  // Tux.
  'tux-hello': tux([], { plain: true, wave: true }),
  'tux-love': tux(mood('love', TUX)),
  'tux-laugh': tux(mood('laugh', TUX)),
  'tux-happy': tux(mood('happy', TUX)),
  'tux-sad': tux(mood('sad', TUX)),
  'tux-angry': tux(mood('angry', TUX)),
  'tux-sleep': tux([...mood('sleep', TUX), ...zees(72, 2)]),
  'tux-wow': tux(mood('wow', TUX)),
  'tux-wink': tux(mood('wink', TUX)),
  'tux-cool': tux(mood('cool', TUX)),
  'tux-shy': tux(mood('shy', TUX)),
  'tux-cry': tux(mood('cry', TUX)),
  'tux-kiss': tux(mood('kiss', TUX)),
  'tux-tongue': tux(mood('tongue', TUX)),
  'tux-dizzy': tux([...mood('dizzy', TUX), ...dizzyStars(49, 6)]),
  'tux-think': tux([...mood('think', TUX), ...thought(76, 10)]),
  'tux-party': [...tux(mood('laugh', TUX)), ...partyHat(49, 12, 0.8)],
  'tux-heart': tux(mood('happy', TUX), { front: heldHeart(50, 64, 22) }),
  'tux-coffee': tux(mood('happy', TUX), { front: coffeeCup(66, 72) }),
  'tux-ok': tux([], { plain: true, front: tick(76, 76) }),
  'tux-nervous': tux([part('sweat', [box(64, 10, 7, 7, TEAR, [0, 3.5, 3.5, 3.5], { turn: 45 })])], { plain: true }),
  'tux-hungry': tux(mood('tongue', TUX), { front: [part('fish', [tri(84, 68, 12, 14, '#5BA8D8', 90), oval(68, 68, 26, 14, '#7FC8F8'), dot(61, 66, 4, INK), arc(72, 68, 8, 2, 'left', '#5BA8D8')])] }),
  'tux-busy': tux(mood('think', TUX), { front: [box(28, 60, 44, 26, '#9AA3AD', 4), box(22, 85, 56, 5, '#6B7480', 2), dot(50, 72, 9, '#F4F1EA'), dot(50, 73, 4, TUX_BEAK)] }),
  'tux-cold': tux([...mood('wow', TUX), box(33, 43, 34, 7, RED, 3.5), box(57, 46, 7, 18, RED, 3), part('snow', [dot(12, 14, 5, '#DCEBFA'), dot(88, 22, 4, '#DCEBFA'), dot(16, 44, 4, '#DCEBFA'), dot(86, 50, 5, '#DCEBFA')])]),

  // Aikido.
  'aiki-hello': aikidoka(mood('smile', AIKI), { arm2: -120 }),
  'aiki-love': aikidoka(mood('love', AIKI)),
  'aiki-laugh': aikidoka(mood('laugh', AIKI)),
  'aiki-happy': aikidoka(mood('happy', AIKI)),
  'aiki-sad': aikidoka(mood('sad', AIKI)),
  'aiki-angry': aikidoka(mood('angry', AIKI)),
  'aiki-sleep': aikidoka([...mood('sleep', AIKI), ...zees(68, 0)]),
  'aiki-wow': aikidoka(mood('wow', AIKI), { arm1: 125, arm2: -125 }),
  'aiki-wink': aikidoka(mood('wink', AIKI)),
  'aiki-cool': aikidoka(mood('cool', AIKI)),
  'aiki-shy': aikidoka(mood('shy', AIKI), { arm1: -35, arm2: 35 }),
  'aiki-cry': aikidoka(mood('cry', AIKI)),
  'aiki-kiss': aikidoka(mood('kiss', AIKI)),
  'aiki-think': aikidoka([...mood('think', AIKI), ...thought(74, 10)], { arm2: 40 }),
  'aiki-dizzy': aikidoka([...mood('dizzy', AIKI), ...dizzyStars(50, 6)]),
  'aiki-bow': aikidoka(mood('happy', AIKI)),
  'aiki-calm': aikidoka(mood('happy', AIKI), { seated: true, arm1: -12, arm2: 12 }),
  'aiki-ready': aikidoka([...mood('smile', AIKI), bar(36, 21, 46, 24, 2.5, INK), bar(64, 21, 54, 24, 2.5, INK), bar(54, 66, 84, 22, 3.2, '#B07A45'), bar(58.5, 58.5, 63.5, 62, 2.2, '#3B2A1A')], { arm1: -55, arm2: 25 }),
  'aiki-roll': aikidoka(mood('laugh', AIKI)),
  'aiki-tired': aikidoka([...mood('sad', AIKI), part('sweat', [box(70, 10, 7, 7, TEAR, [0, 3.5, 3.5, 3.5], { turn: 45 })])], { arm1: 3, arm2: -3 }),
  'aiki-proud': aikidoka(mood('happy', AIKI), { front: [box(33, 59.5, 34, 5.5, '#2B2F36', 2), bar(46, 64, 43, 76, 3.2, '#2B2F36'), bar(54, 64, 57, 76, 3.2, '#2B2F36'), part('shine', [...star(20, 30, 12, SUN), ...star(82, 24, 10, SUN), ...star(84, 56, 8, SUN)])] }),
  'aiki-sensei': aikidoka([...mood('happy', AIKI), tri(50, 50, 18, 22, '#E3E6EA', 180), bar(42, 41, 58, 41, 3, '#E3E6EA')], { hair: '#C9CED6' }),
  'aiki-ok': aikidoka(mood('smile', AIKI), { front: tick(78, 76) }),
  'aiki-heart': aikidoka(mood('happy', AIKI), { arm1: -40, arm2: 40, front: heldHeart(50, 60, 22) }),

  // Takis.
  'takis-hello': takis([], { own: true, arm2: -140 }),
  'takis-smirk': takis([], { own: true }),
  'takis-love': takis(mood('love', TAKIS)),
  'takis-laugh': takis(mood('laugh', TAKIS)),
  'takis-happy': takis(mood('happy', TAKIS)),
  'takis-sad': takis(mood('sad', TAKIS)),
  'takis-angry': takis(mood('angry', TAKIS), { brows: false }),
  'takis-sleep': takis([...mood('sleep', TAKIS), ...zees(72, 4)]),
  'takis-wow': takis(mood('wow', TAKIS), { arm1: 140, arm2: -140 }),
  'takis-wink': takis(mood('wink', TAKIS)),
  'takis-cool': takis(mood('cool', TAKIS)),
  'takis-shy': takis(mood('shy', TAKIS), { arm1: -35, arm2: 35 }),
  'takis-cry': takis(mood('cry', TAKIS)),
  'takis-kiss': takis(mood('kiss', TAKIS)),
  'takis-tongue': takis(mood('tongue', TAKIS)),
  'takis-dizzy': takis([...mood('dizzy', TAKIS), ...dizzyStars(50, 12)], { brows: false }),
  'takis-think': takis([...mood('think', TAKIS), ...thought(78, 14)], { arm2: 40 }),
  'takis-party': [...takis(mood('laugh', TAKIS)), ...partyHat(58, 10, 0.75)],
  'takis-heart': takis(mood('happy', TAKIS), { arm1: -40, arm2: 40, front: heldHeart(50, 84, 20) }),
  'takis-coffee': takis(mood('happy', TAKIS), { arm2: 25, front: coffeeCup(64, 86) }),
  'takis-ok': takis([], { own: true, front: tick(80, 84) }),
  'takis-nervous': takis([...mood('smile', TAKIS), part('sweat', [box(66, 14, 7, 7, TEAR, [0, 3.5, 3.5, 3.5], { turn: 45 })])]),
  'takis-busy': takis(mood('think', TAKIS), { arm1: -30, arm2: 30, front: [box(27, 80, 46, 16, '#9AA3AD', 3), box(21, 95, 58, 4, '#6B7480', 2), dot(50, 88, 7, '#F4F1EA')] }),
  'takis-cold': takis([...mood('wow', TAKIS), box(38, 63, 24, 7, RED, 3.5), box(53, 66, 7, 18, RED, 3), part('snow', [dot(12, 14, 5, '#DCEBFA'), dot(88, 22, 4, '#DCEBFA'), dot(14, 50, 4, '#DCEBFA'), dot(86, 56, 5, '#DCEBFA')])]),
  // Angry Eyes (lib/sticker-angry-eyes.ts): the maintainer's own drawings, in layers.
  ...EYES_ART,
};

/** The names of a sticker's parts, which its motion moves. */
export function partsOf(shapes: Shape[]): string[] {
  return shapes.flatMap((shape) =>
    shape.s === 'part' ? [shape.name, ...partsOf(shape.shapes)] : shape.s === 'tilt' ? partsOf(shape.shapes) : shape.s === 'box' && shape.inside ? partsOf(shape.inside) : [],
  );
}
