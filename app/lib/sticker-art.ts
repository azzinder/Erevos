// How each built-in sticker (lib/stickers.ts) is drawn: shapes on a grid of 100 by 100, which
// components/stickers.tsx turns into plain views scaled to the size asked, so every phone draws
// them itself and nothing is downloaded. A moon with its faces, animals, celebrations, words and
// treats. They are their own colours, the same in every look, as a picture is, each on shapes of
// its own (never ink straight on the chat's ground), so it reads in a light look and a dark one.
// A part is what moves of a sticker (lib/sticker-motion.ts); the rest of it stays as it is drawn.
// Self-contained on purpose, so it can run under plain Node for checks.

/** Corners rounded the same, or each: top left, top right, bottom right, bottom left. */
export type Corners = number | [number, number, number, number];

/**
 * A shape on the grid. A disc, an oval, a ring, an arc (a side of a ring: its bottom a smile, its
 * top a frown or a closed eye), a triangle (pointing up unless turned) and a heart are placed by
 * their middle; a box by its top left corner, with what is `inside` it cut to it. A stroke goes
 * from one end to the other, with round ends. The words of a Words sticker fill their box, in the
 * app's language. A tilt turns its shapes about a point; a part is one that moves.
 */
export type Shape =
  | { s: 'dot'; x: number; y: number; d: number; c: string }
  | { s: 'oval'; x: number; y: number; w: number; h: number; c: string; turn?: number }
  | { s: 'ring'; x: number; y: number; d: number; w: number; c: string }
  | { s: 'arc'; x: number; y: number; d: number; w: number; side: 'top' | 'bottom'; c: string }
  | { s: 'tri'; x: number; y: number; w: number; h: number; c: string; turn?: number }
  | { s: 'heart'; x: number; y: number; size: number; c: string }
  | { s: 'box'; x: number; y: number; w: number; h: number; c: string; r?: Corners; turn?: number; edge?: { w: number; c: string }; inside?: Shape[] }
  | { s: 'bar'; x1: number; y1: number; x2: number; y2: number; w: number; c: string }
  | { s: 'words'; x: number; y: number; w: number; h: number; c: string }
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
const ring = (x: number, y: number, d: number, w: number, c: string): Shape => ({ s: 'ring', x, y, d, w, c });
const arc = (x: number, y: number, d: number, w: number, side: 'top' | 'bottom', c = INK): Shape => ({ s: 'arc', x, y, d, w, side, c });
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

// A Words sticker: its card, the words on it, and something drawn at a corner of it.
const card = (fill: string, edge: string, ink: string, corner: Shape[]): Shape[] => [
  box(6, 24, 88, 56, fill, 16, { edge: { w: 3, c: edge } }),
  { s: 'words', x: 10, y: 28, w: 80, h: 50, c: ink },
  ...corner,
];
// A little moon at a card's corner, as the moons are.
const littleMoon = (x: number, y: number, face: Shape[]): Shape[] => [dot(x, y, 22, MOON_EDGE), dot(x, y, 19, MOON), ...face];

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
};

/** The names of a sticker's parts, which its motion moves. */
export function partsOf(shapes: Shape[]): string[] {
  return shapes.flatMap((shape) => (shape.s === 'part' ? [shape.name, ...partsOf(shape.shapes)] : shape.s === 'tilt' ? partsOf(shape.shapes) : []));
}
