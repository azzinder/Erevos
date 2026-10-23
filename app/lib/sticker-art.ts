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
 * A shape on the grid. A disc, an oval, a ring (pressed to a height `h` and turned, as a planet's),
 * an arc (a side of a ring: its bottom a smile, its top a frown or a closed eye, a thick one at a
 * side a crescent), a triangle (pointing up unless turned) and a heart are placed by
 * their middle; a box by its top left corner, with what is `inside` it cut to it. A stroke goes
 * from one end to the other, with round ends. The words of a Words sticker fill their box, in the
 * app's language. A tilt turns its shapes about a point; a part is one that moves.
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
};

/** The names of a sticker's parts, which its motion moves. */
export function partsOf(shapes: Shape[]): string[] {
  return shapes.flatMap((shape) =>
    shape.s === 'part' ? [shape.name, ...partsOf(shape.shapes)] : shape.s === 'tilt' ? partsOf(shape.shapes) : shape.s === 'box' && shape.inside ? partsOf(shape.inside) : [],
  );
}
