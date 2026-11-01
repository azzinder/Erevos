// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import type { Shape } from './sticker-art';
import type { Motion, Move } from './sticker-motion';

// Angry Eyes, a set the maintainer drew: 24 faces, big yellow eyes and a mouth on a black disc with
// a white edge, each drawn in curves on a grid of 200 by 200 with a margin of 6 around it, and
// each moving as he made it move. Here a face is its drawing in pieces: what stays still, and the
// groups that move, each with its round of moves and the point it turns or grows about (one group
// in another moves with it). Erevos draws the pieces in layers (lib/sticker-art.ts) and plays the
// rounds once, four seconds, as a sticker comes into view and when it is tapped
// (lib/sticker-motion.ts), as the other sets move: not in a loop.

/** How a group moves, as its maker named it. */
type Round =
  | 'blink'
  | 'doze'
  | 'beat'
  | 'glance'
  | 'roll'
  | 'shake'
  | 'shake-hard'
  | 'bob'
  | 'tilt'
  | 'lean'
  | 'pop'
  | 'sink'
  | 'jitter'
  | 'laugh'
  | 'drip'
  | 'zz'
  | 'throb';

/** A face's pieces: SVG of what stays still, and groups that move (`a`), about a point (`o`), with their own pieces (`k`). */
type Drawn = (string | { a: Round; o?: [number, number]; k: Drawn })[];

type Key = 'x' | 'y' | 'turn' | 'scale' | 'sx' | 'sy' | 'opacity';
const REST: Record<Key, number> = { x: 0, y: 0, turn: 0, scale: 1, sx: 1, sy: 1, opacity: 1 };

/** One step of a round: when, as a share of it, and how the group is then (shifts in the drawing's units, degrees, sizes). */
type Frame = [number, Partial<Record<Key, number>>];

/** A round: how long, the curve between its steps (CSS cubic-bezier), its steps of shape and of fading, and its point if its own. */
type RoundOf = { ms: number; ease: [number, number, number, number]; shape: Frame[]; fade?: Frame[]; about?: [number, number] };

const IN_OUT: RoundOf['ease'] = [0.42, 0, 0.58, 1];
const LINEAR: RoundOf['ease'] = [0, 0, 1, 1];

// The rounds as the maker wrote them (CSS keyframes), each step the whole of the group's shape then.
const ROUNDS: Record<Round, RoundOf> = {
  blink: { ms: 4000, ease: IN_OUT, shape: [[0, { sy: 1 }], [0.88, { sy: 1 }], [0.93, { sy: 0.08 }], [1, { sy: 1 }]] },
  doze: { ms: 4000, ease: IN_OUT, shape: [[0, { sy: 1 }], [0.55, { sy: 0.25 }], [0.7, { sy: 0.25 }], [1, { sy: 1 }]] },
  beat: { ms: 1000, ease: IN_OUT, shape: [[0, { scale: 1 }], [0.15, { scale: 1.14 }], [0.3, { scale: 1 }], [0.45, { scale: 1.1 }], [1, { scale: 1 }]] },
  glance: { ms: 4000, ease: IN_OUT, shape: [[0, { x: 0 }], [0.15, { x: 0 }], [0.35, { x: 5 }], [0.65, { x: 5 }], [0.85, { x: 0 }], [1, { x: 0 }]] },
  roll: { ms: 4000, ease: IN_OUT, shape: [[0, { y: 0 }], [0.4, { y: -5 }], [0.6, { y: -5 }], [1, { y: 0 }]] },
  shake: {
    ms: 2000,
    ease: LINEAR,
    shape: [[0, {}], [0.05, { x: -3, turn: -1.5 }], [0.1, { x: 3, turn: 1.5 }], [0.15, { x: -3, turn: -1 }], [0.2, { x: 3, turn: 1 }], [0.25, { x: -2 }], [0.3, { x: 2 }], [0.4, {}], [1, {}]],
  },
  'shake-hard': {
    ms: 1000,
    ease: LINEAR,
    shape: [
      [0, {}],
      [0.1, { x: -4, y: 1, turn: -2 }],
      [0.2, { x: 4, y: -1, turn: 2 }],
      [0.3, { x: -4, turn: -2 }],
      [0.4, { x: 4, y: 1, turn: 2 }],
      [0.5, { x: -3, y: -1, turn: -1 }],
      [0.6, { x: 3, turn: 1 }],
      [0.7, {}],
      [1, {}],
    ],
  },
  bob: { ms: 2000, ease: IN_OUT, shape: [[0, { y: 0 }], [0.5, { y: -7 }], [1, { y: 0 }]] },
  tilt: { ms: 4000, ease: IN_OUT, shape: [[0, { turn: -5 }], [0.5, { turn: 5 }], [1, { turn: -5 }]] },
  lean: { ms: 4000, ease: IN_OUT, shape: [[0, {}], [0.4, { x: 6, turn: 3 }], [0.7, { x: 6, turn: 3 }], [1, {}]] },
  pop: { ms: 2000, ease: [0.3, 1.6, 0.5, 1], shape: [[0, { scale: 1 }], [0.15, { scale: 1.1 }], [0.6, { scale: 1 }], [1, { scale: 1 }]] },
  sink: { ms: 4000, ease: IN_OUT, shape: [[0, {}], [0.5, { y: 6, turn: -1 }], [1, {}]] },
  jitter: { ms: 500, ease: LINEAR, shape: [[0, {}], [0.25, { x: -1.5, y: 0.5 }], [0.5, { x: 1.5, y: -0.5 }], [0.75, { x: -1, y: -0.5 }], [1, {}]] },
  laugh: { ms: 1000, ease: IN_OUT, shape: [[0, { y: 0, turn: -3 }], [0.5, { y: -6, turn: 3 }], [1, { y: 0, turn: -3 }]] },
  drip: { ms: 2000, ease: [0.42, 0, 1, 1], shape: [[0, { y: -6 }], [1, { y: 22 }]], fade: [[0, { opacity: 0 }], [0.15, { opacity: 1 }], [0.8, { opacity: 1 }], [1, { opacity: 0 }]] },
  zz: { ms: 2000, ease: [0, 0, 0.58, 1], shape: [[0, { x: -6, y: 10 }], [1, { x: 8, y: -14 }]], fade: [[0, { opacity: 0 }], [0.25, { opacity: 1 }], [1, { opacity: 0 }]] },
  throb: { ms: 1000, ease: IN_OUT, shape: [[0, { scale: 1 }], [0.5, { scale: 1.3 }], [1, { scale: 1 }]], about: [168, 31] },
};

/** Where `x` falls on a CSS cubic-bezier curve from 0 to 1. */
function eased([x1, y1, x2, y2]: RoundOf['ease'], x: number): number {
  if (x <= 0 || x >= 1) return x <= 0 ? 0 : 1;
  const at = (a: number, b: number, t: number) => 3 * a * t * (1 - t) ** 2 + 3 * b * t * t * (1 - t) + t ** 3;
  let low = 0;
  let high = 1;
  for (let i = 0; i < 40; i += 1) {
    const t = (low + high) / 2;
    if (at(x1, x2, t) < x) low = t;
    else high = t;
  }
  return at(y1, y2, (low + high) / 2);
}

/** How a round's steps have a group at `share` of it. */
function along(frames: Frame[], ease: RoundOf['ease'], keys: Key[], share: number): Partial<Record<Key, number>> {
  let i = 0;
  while (i < frames.length - 2 && share > frames[i + 1][0]) i += 1;
  const [from, a] = frames[i];
  const [to, b] = frames[i + 1];
  const e = eased(ease, to === from ? 1 : (share - from) / (to - from));
  return Object.fromEntries(keys.map((key) => [key, (a[key] ?? REST[key]) + ((b[key] ?? REST[key]) - (a[key] ?? REST[key])) * e]));
}

const keysOf = (frames: Frame[] = []) => [...new Set(frames.flatMap(([, values]) => Object.keys(values) as Key[]))];

/** How a group is `ms` into its round. */
function stateAt(round: RoundOf, ms: number): Partial<Record<Key, number>> {
  const share = (((ms % round.ms) + round.ms) % round.ms) / round.ms;
  return { ...along(round.shape, round.ease, keysOf(round.shape), share), ...(round.fade ? along(round.fade, round.ease, ['opacity'], share) : {}) };
}

// The drawing's grid of 200, inside its margin and drawn at 0.82 of its size about its middle, on
// the stickers' grid of 100.
const VIEW = '-6 -6 212 212';
const INSIDE = 'translate(100 100) scale(0.82) translate(-100 -100)';
const STEP = (0.82 * 100) / 212;
const onGrid = (v: number) => ((100 + (v - 100) * 0.82 + 6) * 100) / 212;
const DISC = '<circle cx="100" cy="100" r="96" fill="#000" stroke="#fff" stroke-width="6"/>';

// A play: four seconds, a step every 40 ms, followed straight (lib/sticker-motion.ts plays them
// in a line). A round starts where it is nearest the drawing; one that never comes near it (the
// laugh) comes in from the drawing and goes back to it, in 160 ms each way.
const PLAY = 4000;
const SAMPLE = 40;
const EASE_IN = 160;
const UNIT: Record<Key, number> = { x: 1, y: 1, turn: 1, scale: 0.02, sx: 0.02, sy: 0.02, opacity: 0.05 };
const NEAR = 1;

const round3 = (v: number) => Math.round(v * 1000) / 1000;

/** The move of a group, named `part`, that moves by `round` about `origin` (the drawing's units). */
function moveOf(part: string, name: Round, origin?: [number, number]): Move {
  const round = ROUNDS[name];
  const keys = [...keysOf(round.shape), ...(round.fade ? (['opacity'] as const) : [])];
  const away = (state: Partial<Record<Key, number>>) => Math.max(...keys.map((key) => Math.abs((state[key] ?? REST[key]) - REST[key]) / UNIT[key]));
  let start = 0;
  let off = Infinity;
  for (let ms = 0; ms < round.ms; ms += 10) {
    const d = away(stateAt(round, ms));
    if (d < off - 1e-9) [start, off] = [ms, d];
  }
  const near = off <= NEAR;
  // When it is drawn: every 40 ms, and at each of its steps, so a sharp turn of a shake is not missed.
  const lead = near ? 0 : EASE_IN;
  const steps = [...round.shape, ...(round.fade ?? [])].map(([share]) => share * round.ms);
  const times = new Set<number>();
  for (let t = 0; t <= PLAY; t += SAMPLE) times.add(t);
  for (let from = -round.ms; from < PLAY + round.ms; from += round.ms) {
    for (const step of steps) {
      const t = Math.round(from + step - start + lead);
      if (t > lead && t < PLAY - lead) times.add(t);
    }
  }
  const at: number[] = [];
  const values = Object.fromEntries(keys.map((key) => [key, [] as number[]])) as Record<Key, number[]>;
  for (const t of [...times].sort((a, b) => a - b)) {
    let state: Partial<Record<Key, number>>;
    if (near) state = stateAt(round, start + t);
    else if (t < EASE_IN) state = blend(REST, stateAt(round, start), t / EASE_IN, keys);
    else if (t > PLAY - EASE_IN) state = blend(stateAt(round, start + PLAY - 2 * EASE_IN), REST, (t - (PLAY - EASE_IN)) / EASE_IN, keys);
    else state = stateAt(round, start + t - EASE_IN);
    at.push(t / PLAY);
    for (const key of keys) values[key].push(t === 0 || t === PLAY ? REST[key] : round3(((state[key] ?? REST[key]) - REST[key]) * (key === 'x' || key === 'y' ? STEP : 1) + REST[key]));
  }
  const about = origin ?? round.about;
  if (!about && keys.some((key) => key !== 'x' && key !== 'y' && key !== 'opacity')) throw new Error(`${part} turns about no point`);
  return { part, ...(about ? { about: [round3(onGrid(about[0])), round3(onGrid(about[1]))] as [number, number] } : {}), at, ease: 'linear', ...values };
}

function blend(a: Partial<Record<Key, number>>, b: Partial<Record<Key, number>>, share: number, keys: Key[]): Partial<Record<Key, number>> {
  return Object.fromEntries(keys.map((key) => [key, (a[key] ?? REST[key]) + ((b[key] ?? REST[key]) - (a[key] ?? REST[key])) * share]));
}

const layer = (body: string): Shape => ({ s: 'svg', x: 0, y: 0, w: 100, h: 100, xml: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VIEW}">${body}</svg>` });

/** A face in layers, each moving group a part, and the moves of its parts. */
function made(drawn: Drawn): { shapes: Shape[]; motion: Motion } {
  let n = 0;
  const moves: Move[] = [];
  const pieces = (of: Drawn): Shape[] =>
    of.map((piece) => {
      if (typeof piece === 'string') return layer(`<g transform="${INSIDE}">${piece}</g>`);
      n += 1;
      const part = `${piece.a}${n}`;
      moves.push(moveOf(part, piece.a, piece.o));
      return { s: 'part', name: part, shapes: pieces(piece.k) };
    });
  const shapes = [layer(DISC), ...pieces(drawn)];
  return { shapes, motion: { ms: PLAY, moves } };
}

// The faces, by their names after "eyes-", as drawn.
const FACES: Record<string, Drawn> = {
  'angry': [
    { a: 'shake', o: [100, 120], k: [
      { a: 'blink', o: [50, 90], k: [
        '<path d="M24.5 67.5L83.4 96.3A34 34 0 1 1 24.5 67.5Z" fill="#C8A20A"/><path d="M21.2 71.9L82 101.6A34 34 0 1 1 21.2 71.9Z" fill="#FFD11A"/><path d="M40.3 75.3L78 93.6A24 24 0 1 1 40.3 75.3Z" fill="#CFCFCF"/><path d="M36.6 78.5L77.7 98.5A24 24 0 1 1 36.6 78.5Z" fill="#FFFFFF"/><circle cx="55" cy="89" r="11" fill="#000000"/><circle cx="50" cy="86" r="3.3" fill="#FFFFFF"/><circle cx="48" cy="92" r="2" fill="#FFFFFF"/>',
      ] },
      { a: 'blink', o: [150, 90], k: [
        '<path d="M116.6 96.3L175.5 67.5A34 34 0 1 1 116.6 96.3Z" fill="#C8A20A"/><path d="M118 101.6L178.8 71.9A34 34 0 1 1 118 101.6Z" fill="#FFD11A"/><path d="M122 93.6L159.7 75.3A24 24 0 1 1 122 93.6Z" fill="#CFCFCF"/><path d="M122.3 98.5L163.4 78.5A24 24 0 1 1 122.3 98.5Z" fill="#FFFFFF"/><circle cx="145" cy="89" r="11" fill="#000000"/><circle cx="150" cy="86" r="3.3" fill="#FFFFFF"/><circle cx="152" cy="92" r="2" fill="#FFFFFF"/>',
      ] },
      '<path d="M72 144Q102 138 130 131L130 137Q102 142 72 144Z" fill="#FFFFFF"/>',
    ] },
  ],
  'furious': [
    { a: 'shake-hard', o: [100, 120], k: [
      { a: 'blink', o: [50, 90], k: [
        '<path d="M25.6 66.3L80.1 105.9A34 34 0 1 1 25.6 66.3Z" fill="#C8A20A"/><path d="M22.5 70L77.5 110A34 34 0 0 1 22.5 70Z" fill="#FFD11A"/><path d="M39.2 76.1L76.5 103.3A24 24 0 1 1 39.2 76.1Z" fill="#CFCFCF"/><path d="M36.2 78.9L74.8 107A24 24 0 1 1 36.2 78.9Z" fill="#FFFFFF"/><circle cx="55" cy="89" r="9" fill="#000000"/><path d="M50 84L53.6 86.6A2.7 2.7 0 1 1 50 84Z" fill="#FFFFFF"/><circle cx="49.3" cy="91.5" r="1.6" fill="#FFFFFF"/>',
      ] },
      { a: 'blink', o: [150, 90], k: [
        '<path d="M119.9 105.9L174.4 66.3A34 34 0 1 1 119.9 105.9Z" fill="#C8A20A"/><path d="M122.5 110L177.5 70A34 34 0 0 1 122.5 110Z" fill="#FFD11A"/><path d="M123.5 103.3L160.8 76.1A24 24 0 1 1 123.5 103.3Z" fill="#CFCFCF"/><path d="M125.2 107L163.8 78.9A24 24 0 1 1 125.2 107Z" fill="#FFFFFF"/><circle cx="145" cy="89" r="9" fill="#000000"/><path d="M146.4 86.6L150 84A2.7 2.7 0 1 1 146.4 86.6Z" fill="#FFFFFF"/><circle cx="150.7" cy="91.5" r="1.6" fill="#FFFFFF"/>',
      ] },
      '<rect x="72" y="132" width="56" height="16" rx="5" fill="#FFFFFF"/><rect x="72" y="139" width="56" height="2" fill="#000000"/><rect x="85" y="132" width="2" height="16" fill="#000000"/><rect x="99" y="132" width="2" height="16" fill="#000000"/><rect x="113" y="132" width="2" height="16" fill="#000000"/>',
      { a: 'throb', k: [
        '<path d="M160 22Q168 30 176 22M160 40Q168 32 176 40M152 26Q160 31 152 36M184 26Q176 31 184 36" fill="none" stroke="#FFD11A" stroke-width="3" stroke-linecap="round"/>',
      ] },
    ] },
  ],
  'rage': [
    { a: 'shake-hard', o: [100, 120], k: [
      { a: 'blink', o: [50, 90], k: [
        '<path d="M23 69.3L75 113A34 34 0 0 1 23 69.3Z" fill="#C8A20A"/><path d="M20.4 73.2L71.7 116.2A34 34 0 0 1 20.4 73.2Z" fill="#FFD11A"/><path d="M35.4 79.8L72.2 110.6A24 24 0 0 1 35.4 79.8Z" fill="#CFCFCF"/><path d="M33.2 82.9L69.5 113.3A24 24 0 0 1 33.2 82.9Z" fill="#FFFFFF"/><circle cx="55" cy="89" r="8" fill="#000000"/><path d="M48.5 90.8L50.6 92.5A1.5 1.5 0 0 1 48.5 90.8Z" fill="#FFFFFF"/>',
      ] },
      { a: 'blink', o: [150, 90], k: [
        '<path d="M125 113L177 69.3A34 34 0 0 1 125 113Z" fill="#C8A20A"/><path d="M128.3 116.2L179.6 73.2A34 34 0 0 1 128.3 116.2Z" fill="#FFD11A"/><path d="M127.8 110.6L164.6 79.8A24 24 0 0 1 127.8 110.6Z" fill="#CFCFCF"/><path d="M130.5 113.3L166.8 82.9A24 24 0 0 1 130.5 113.3Z" fill="#FFFFFF"/><circle cx="145" cy="89" r="8" fill="#000000"/><path d="M149.4 92.5L151.5 90.8A1.5 1.5 0 0 1 149.4 92.5Z" fill="#FFFFFF"/>',
      ] },
      '<ellipse cx="100" cy="144" rx="22" ry="17" fill="#FFFFFF"/><ellipse cx="100" cy="148" rx="17" ry="11" fill="#000000"/>',
    ] },
  ],
  'evil-grin': [
    { a: 'bob', o: [100, 120], k: [
      { a: 'blink', o: [50, 90], k: [
        '<path d="M25.2 66.8L83.1 97.6A34 34 0 1 1 25.2 66.8Z" fill="#C8A20A"/><path d="M21.8 71L81.5 102.8A34 34 0 1 1 21.8 71Z" fill="#FFD11A"/><path d="M40.7 75L78 94.9A24 24 0 1 1 40.7 75Z" fill="#CFCFCF"/><path d="M37 78.1L77.5 99.6A24 24 0 1 1 37 78.1Z" fill="#FFFFFF"/><circle cx="55" cy="89" r="11" fill="#000000"/><circle cx="50" cy="86" r="3.3" fill="#FFFFFF"/><circle cx="48" cy="92" r="2" fill="#FFFFFF"/>',
      ] },
      { a: 'blink', o: [150, 90], k: [
        '<path d="M116.9 97.6L174.8 66.8A34 34 0 1 1 116.9 97.6Z" fill="#C8A20A"/><path d="M118.5 102.8L178.2 71A34 34 0 1 1 118.5 102.8Z" fill="#FFD11A"/><path d="M122 94.9L159.3 75A24 24 0 1 1 122 94.9Z" fill="#CFCFCF"/><path d="M122.5 99.6L163 78.1A24 24 0 1 1 122.5 99.6Z" fill="#FFFFFF"/><circle cx="145" cy="89" r="11" fill="#000000"/><circle cx="150" cy="86" r="3.3" fill="#FFFFFF"/><circle cx="152" cy="92" r="2" fill="#FFFFFF"/>',
      ] },
      '<path d="M64 128Q100 162 136 128Q100 142 64 128Z" fill="#FFFFFF"/><rect x="81" y="130" width="2" height="22" fill="#000000"/><rect x="99" y="130" width="2" height="24" fill="#000000"/><rect x="117" y="130" width="2" height="22" fill="#000000"/>',
    ] },
  ],
  'smug': [
    { a: 'tilt', o: [100, 120], k: [
      { a: 'blink', o: [50, 90], k: [
        '<path d="M18.2 78.1L83.7 94.4A34 34 0 1 1 18.2 78.1Z" fill="#C8A20A"/><path d="M16.6 83.7L82.5 100.1A34 34 0 0 1 16.6 83.7Z" fill="#FFD11A"/><path d="M33.8 82L77.9 93A24 24 0 1 1 33.8 82Z" fill="#CFCFCF"/><path d="M31.6 86.4L77.8 97.9A24 24 0 1 1 31.6 86.4Z" fill="#FFFFFF"/><circle cx="55" cy="89" r="11" fill="#000000"/><path d="M46.8 85.2L53.2 86.8A3.3 3.3 0 0 1 46.8 85.2Z" fill="#FFFFFF"/><circle cx="48" cy="92" r="2" fill="#FFFFFF"/>',
      ] },
      { a: 'blink', o: [150, 90], k: [
        '<path d="M116.3 94.4L181.8 78.1A34 34 0 1 1 116.3 94.4Z" fill="#C8A20A"/><path d="M117.5 100.1L183.4 83.7A34 34 0 0 1 117.5 100.1Z" fill="#FFD11A"/><path d="M122.1 93L166.2 82A24 24 0 1 1 122.1 93Z" fill="#CFCFCF"/><path d="M122.2 97.9L168.4 86.4A24 24 0 1 1 122.2 97.9Z" fill="#FFFFFF"/><circle cx="145" cy="89" r="11" fill="#000000"/><path d="M146.8 86.8L153.2 85.2A3.3 3.3 0 0 1 146.8 86.8Z" fill="#FFFFFF"/><circle cx="152" cy="92" r="2" fill="#FFFFFF"/>',
      ] },
      '<path d="M72 141Q104 147 128 127L131 131Q106 153 72 145Z" fill="#FFFFFF"/>',
    ] },
  ],
  'mischievous': [
    { a: 'tilt', o: [100, 120], k: [
      { a: 'blink', o: [50, 90], k: [
        '<path d="M22.6 69.8L83.3 96.8A34 34 0 1 1 22.6 69.8Z" fill="#C8A20A"/><path d="M19.7 74.5L81.8 102.1A34 34 0 1 1 19.7 74.5Z" fill="#FFD11A"/><path d="M38.3 76.8L78 94.5A24 24 0 1 1 38.3 76.8Z" fill="#CFCFCF"/><path d="M35 80.3L77.6 99.3A24 24 0 1 1 35 80.3Z" fill="#FFFFFF"/><circle cx="64" cy="90" r="11" fill="#000000"/><path d="M56.5 84.9L62.3 87.5A3.3 3.3 0 1 1 56.5 84.9Z" fill="#FFFFFF"/><circle cx="57" cy="93" r="2" fill="#FFFFFF"/>',
      ] },
      { a: 'blink', o: [150, 90], k: [
        '<path d="M116.7 96.8L177.4 69.8A34 34 0 1 1 116.7 96.8Z" fill="#C8A20A"/><path d="M118.2 102.1L180.3 74.5A34 34 0 1 1 118.2 102.1Z" fill="#FFD11A"/><path d="M122 94.5L161.7 76.8A24 24 0 1 1 122 94.5Z" fill="#CFCFCF"/><path d="M122.4 99.3L165 80.3A24 24 0 1 1 122.4 99.3Z" fill="#FFFFFF"/><circle cx="154" cy="90" r="11" fill="#000000"/><circle cx="159" cy="87" r="3.3" fill="#FFFFFF"/><circle cx="161" cy="93" r="2" fill="#FFFFFF"/>',
      ] },
      '<path d="M128 141Q96 147 72 127L69 131Q94 153 128 145Z" fill="#FFFFFF"/>',
    ] },
  ],
  'suspicious': [
    { a: 'lean', o: [100, 120], k: [
      { a: 'glance', o: [50, 90], k: [
        '<path d="M19.9 74.2L83.6 94.9A34 34 0 1 1 19.9 74.2Z" fill="#C8A20A"/><path d="M17.7 79.5L82.3 100.5A34 34 0 0 1 17.7 79.5Z" fill="#FFD11A"/><path d="M35.8 79.4L77.9 93.1A24 24 0 1 1 35.8 79.4Z" fill="#CFCFCF"/><path d="M33 83.5L77.8 98A24 24 0 1 1 33 83.5Z" fill="#FFFFFF"/><circle cx="62" cy="89" r="11" fill="#000000"/><path d="M53.8 85.2L60 87.3A3.3 3.3 0 0 1 53.8 85.2Z" fill="#FFFFFF"/><circle cx="55" cy="92" r="2" fill="#FFFFFF"/>',
      ] },
      { a: 'glance', o: [150, 90], k: [
        '<path d="M116 91L184 91A34 34 0 0 1 116 91Z" fill="#C8A20A"/><path d="M116.7 97L183.3 97A34 34 0 0 1 116.7 97Z" fill="#FFD11A"/><path d="M122.3 91L169.7 91A24 24 0 1 1 122.3 91Z" fill="#CFCFCF"/><path d="M122 96L170 96A24 24 0 0 1 122 96Z" fill="#FFFFFF"/><circle cx="152" cy="89" r="11" fill="#000000"/><path d="M157.3 91L160.7 91A2 2 0 1 1 157.3 91Z" fill="#FFFFFF"/>',
      ] },
      '<path d="M114 143L86 136L86 140L114 147Z" fill="#FFFFFF"/>',
    ] },
  ],
  'side-eye': [
    { a: 'lean', o: [100, 120], k: [
      { a: 'glance', o: [50, 90], k: [
        '<path d="M17 82L83 82A34 34 0 1 1 17 82Z" fill="#C8A20A"/><path d="M16.1 88L83.9 88A34 34 0 1 1 16.1 88Z" fill="#FFD11A"/><path d="M33.8 82L74.2 82A24 24 0 1 1 33.8 82Z" fill="#CFCFCF"/><path d="M31.4 87L76.6 87A24 24 0 1 1 31.4 87Z" fill="#FFFFFF"/><circle cx="67" cy="89" r="11" fill="#000000"/><circle cx="62" cy="86" r="3.3" fill="#FFFFFF"/><circle cx="60" cy="92" r="2" fill="#FFFFFF"/>',
      ] },
      { a: 'glance', o: [150, 90], k: [
        '<path d="M117 82L183 82A34 34 0 1 1 117 82Z" fill="#C8A20A"/><path d="M116.1 88L183.9 88A34 34 0 1 1 116.1 88Z" fill="#FFD11A"/><path d="M125.8 82L166.2 82A24 24 0 1 1 125.8 82Z" fill="#CFCFCF"/><path d="M123.4 87L168.6 87A24 24 0 1 1 123.4 87Z" fill="#FFFFFF"/><circle cx="157" cy="89" r="11" fill="#000000"/><circle cx="162" cy="86" r="3.3" fill="#FFFFFF"/><circle cx="164" cy="92" r="2" fill="#FFFFFF"/>',
      ] },
      '<rect x="96" y="138" width="30" height="4" rx="2" fill="#FFFFFF"/>',
    ] },
  ],
  'unimpressed': [
    { a: 'blink', o: [50, 90], k: [
      '<path d="M16.1 92L83.9 92A34 34 0 0 1 16.1 92Z" fill="#C8A20A"/><path d="M17 98L83 98A34 34 0 0 1 17 98Z" fill="#FFD11A"/><path d="M30.2 92L77.8 92A24 24 0 1 1 30.2 92Z" fill="#CFCFCF"/><path d="M30.1 97L77.9 97A24 24 0 0 1 30.1 97Z" fill="#FFFFFF"/><circle cx="55" cy="89" r="11" fill="#000000"/><path d="M46 92L50 92A2 2 0 0 1 46 92Z" fill="#FFFFFF"/>',
    ] },
    { a: 'blink', o: [150, 90], k: [
      '<path d="M116.1 92L183.9 92A34 34 0 0 1 116.1 92Z" fill="#C8A20A"/><path d="M117 98L183 98A34 34 0 0 1 117 98Z" fill="#FFD11A"/><path d="M122.2 92L169.8 92A24 24 0 1 1 122.2 92Z" fill="#CFCFCF"/><path d="M122.1 97L169.9 97A24 24 0 0 1 122.1 97Z" fill="#FFFFFF"/><circle cx="145" cy="89" r="11" fill="#000000"/><path d="M150 92L154 92A2 2 0 0 1 150 92Z" fill="#FFFFFF"/>',
    ] },
    '<rect x="80" y="138" width="40" height="4" rx="2" fill="#FFFFFF"/>',
  ],
  'eye-roll': [
    { a: 'roll', o: [50, 90], k: [
      '<path d="M16.1 88L83.9 88A34 34 0 1 1 16.1 88Z" fill="#C8A20A"/><path d="M16.2 94L83.8 94A34 34 0 0 1 16.2 94Z" fill="#FFD11A"/><path d="M31 88L77 88A24 24 0 1 1 31 88Z" fill="#CFCFCF"/><path d="M30.1 93L77.9 93A24 24 0 1 1 30.1 93Z" fill="#FFFFFF"/><circle cx="55" cy="77" r="11" fill="#000000"/>',
    ] },
    { a: 'roll', o: [150, 90], k: [
      '<path d="M116.1 88L183.9 88A34 34 0 1 1 116.1 88Z" fill="#C8A20A"/><path d="M116.2 94L183.8 94A34 34 0 0 1 116.2 94Z" fill="#FFD11A"/><path d="M123 88L169 88A24 24 0 1 1 123 88Z" fill="#CFCFCF"/><path d="M122.1 93L169.9 93A24 24 0 1 1 122.1 93Z" fill="#FFFFFF"/><circle cx="145" cy="77" r="11" fill="#000000"/>',
    ] },
    '<rect x="80" y="138" width="40" height="4" rx="2" fill="#FFFFFF"/>',
  ],
  'confused': [
    { a: 'tilt', o: [100, 120], k: [
      { a: 'blink', o: [50, 90], k: [
        '<path d="M19.5 74.9L83 98A34 34 0 1 1 19.5 74.9Z" fill="#C8A20A"/><path d="M17.5 80.2L81.3 103.4A34 34 0 0 1 17.5 80.2Z" fill="#FFD11A"/><path d="M34.9 80.5L78 96.2A24 24 0 1 1 34.9 80.5Z" fill="#CFCFCF"/><path d="M32.4 84.6L77.3 100.9A24 24 0 1 1 32.4 84.6Z" fill="#FFFFFF"/><circle cx="55" cy="89" r="11" fill="#000000"/><path d="M46.9 84.9L53.1 87.1A3.3 3.3 0 0 1 46.9 84.9Z" fill="#FFFFFF"/><circle cx="48" cy="92" r="2" fill="#FFFFFF"/>',
      ] },
      { a: 'blink', o: [150, 90], k: [
        '<path d="M123.1 69.3L182.4 79.7A34 34 0 1 1 123.1 69.3Z" fill="#C8A20A"/><path d="M119.7 74.7L183.8 86A34 34 0 1 1 119.7 74.7Z" fill="#FFD11A"/><path d="M139 72.1L160.5 75.8A24 24 0 1 1 139 72.1Z" fill="#CFCFCF"/><path d="M131.6 75.8L166.1 81.8A24 24 0 1 1 131.6 75.8Z" fill="#FFFFFF"/><circle cx="145" cy="89" r="11" fill="#000000"/><circle cx="150" cy="86" r="3.3" fill="#FFFFFF"/><circle cx="152" cy="92" r="2" fill="#FFFFFF"/>',
      ] },
      '<path d="M74 140Q84 130 94 140T114 140T134 140" fill="none" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round"/>',
    ] },
  ],
  'thinking': [
    { a: 'lean', o: [100, 120], k: [
      { a: 'blink', o: [50, 90], k: [
        '<path d="M18.8 76.5L83.9 88A34 34 0 1 1 18.8 76.5Z" fill="#C8A20A"/><path d="M16.9 82.2L83.8 94A34 34 0 1 1 16.9 82.2Z" fill="#FFD11A"/><path d="M35.7 79.5L76.5 86.7A24 24 0 1 1 35.7 79.5Z" fill="#CFCFCF"/><path d="M32.7 83.9L77.8 91.9A24 24 0 1 1 32.7 83.9Z" fill="#FFFFFF"/><circle cx="63" cy="82" r="11" fill="#000000"/><path d="M55.8 83L56.9 83.2A2 2 0 1 1 55.8 83Z" fill="#FFFFFF"/>',
      ] },
      { a: 'blink', o: [150, 90], k: [
        '<path d="M116.1 88L181.2 76.5A34 34 0 1 1 116.1 88Z" fill="#C8A20A"/><path d="M116.2 94L183.1 82.2A34 34 0 1 1 116.2 94Z" fill="#FFD11A"/><path d="M123.5 86.7L164.3 79.5A24 24 0 1 1 123.5 86.7Z" fill="#CFCFCF"/><path d="M122.2 91.9L167.3 83.9A24 24 0 1 1 122.2 91.9Z" fill="#FFFFFF"/><circle cx="153" cy="82" r="11" fill="#000000"/><path d="M155.4 81L161.1 80A3.3 3.3 0 0 1 155.4 81Z" fill="#FFFFFF"/><circle cx="160" cy="85" r="2" fill="#FFFFFF"/>',
      ] },
      '<path d="M86 143L114 136L114 140L86 147Z" fill="#FFFFFF"/>',
    ] },
  ],
  'surprised': [
    { a: 'pop', o: [100, 120], k: [
      { a: 'blink', o: [50, 90], k: [
        '<circle cx="50" cy="90" r="34" fill="#C8A20A"/><circle cx="50" cy="90" r="34" fill="#FFD11A"/><circle cx="54" cy="95" r="24" fill="#CFCFCF"/><circle cx="54" cy="95" r="24" fill="#FFFFFF"/><circle cx="55" cy="89" r="11" fill="#000000"/><circle cx="50" cy="86" r="3.3" fill="#FFFFFF"/><circle cx="48" cy="92" r="2" fill="#FFFFFF"/>',
      ] },
      { a: 'blink', o: [150, 90], k: [
        '<circle cx="150" cy="90" r="34" fill="#C8A20A"/><circle cx="150" cy="90" r="34" fill="#FFD11A"/><circle cx="146" cy="95" r="24" fill="#CFCFCF"/><circle cx="146" cy="95" r="24" fill="#FFFFFF"/><circle cx="145" cy="89" r="11" fill="#000000"/><circle cx="150" cy="86" r="3.3" fill="#FFFFFF"/><circle cx="152" cy="92" r="2" fill="#FFFFFF"/>',
      ] },
      '<circle cx="100" cy="142" r="8" fill="none" stroke="#FFFFFF" stroke-width="5"/>',
    ] },
  ],
  'shocked': [
    { a: 'pop', o: [100, 120], k: [
      { a: 'blink', o: [50, 90], k: [
        '<circle cx="50" cy="90" r="34" fill="#C8A20A"/><circle cx="50" cy="90" r="34" fill="#FFD11A"/><circle cx="54" cy="95" r="24" fill="#CFCFCF"/><circle cx="54" cy="95" r="24" fill="#FFFFFF"/><circle cx="55" cy="89" r="7" fill="#000000"/><circle cx="51.8" cy="87.1" r="2.1" fill="#FFFFFF"/><circle cx="50.5" cy="90.9" r="1.3" fill="#FFFFFF"/>',
      ] },
      { a: 'blink', o: [150, 90], k: [
        '<circle cx="150" cy="90" r="34" fill="#C8A20A"/><circle cx="150" cy="90" r="34" fill="#FFD11A"/><circle cx="146" cy="95" r="24" fill="#CFCFCF"/><circle cx="146" cy="95" r="24" fill="#FFFFFF"/><circle cx="145" cy="89" r="7" fill="#000000"/><circle cx="148.2" cy="87.1" r="2.1" fill="#FFFFFF"/><circle cx="149.5" cy="90.9" r="1.3" fill="#FFFFFF"/>',
      ] },
      '<ellipse cx="100" cy="146" rx="12" ry="17" fill="none" stroke="#FFFFFF" stroke-width="5"/>',
    ] },
  ],
  'scream': [
    { a: 'shake-hard', o: [100, 120], k: [
      { a: 'blink', o: [50, 90], k: [
        '<circle cx="50" cy="90" r="34" fill="#C8A20A"/><circle cx="50" cy="90" r="34" fill="#FFD11A"/><circle cx="54" cy="95" r="24" fill="#CFCFCF"/><circle cx="54" cy="95" r="24" fill="#FFFFFF"/><circle cx="55" cy="85" r="9" fill="#000000"/><circle cx="50.9" cy="82.5" r="2.7" fill="#FFFFFF"/><circle cx="49.3" cy="87.5" r="1.6" fill="#FFFFFF"/>',
      ] },
      { a: 'blink', o: [150, 90], k: [
        '<circle cx="150" cy="90" r="34" fill="#C8A20A"/><circle cx="150" cy="90" r="34" fill="#FFD11A"/><circle cx="146" cy="95" r="24" fill="#CFCFCF"/><circle cx="146" cy="95" r="24" fill="#FFFFFF"/><circle cx="145" cy="85" r="9" fill="#000000"/><circle cx="149.1" cy="82.5" r="2.7" fill="#FFFFFF"/><circle cx="150.7" cy="87.5" r="1.6" fill="#FFFFFF"/>',
      ] },
      '<ellipse cx="100" cy="150" rx="20" ry="26" fill="#FFFFFF"/><ellipse cx="100" cy="154" rx="15" ry="20" fill="#000000"/>',
    ] },
  ],
  'sad': [
    { a: 'sink', o: [100, 120], k: [
      { a: 'blink', o: [50, 90], k: [
        '<path d="M16.2 93.7L76.9 69.1A34 34 0 1 1 16.2 93.7Z" fill="#C8A20A"/><path d="M17.3 99.2L79.9 73.9A34 34 0 1 1 17.3 99.2Z" fill="#FFD11A"/><path d="M31.2 87.6L65.3 73.8A24 24 0 1 1 31.2 87.6Z" fill="#CFCFCF"/><path d="M30.1 93L69.9 77A24 24 0 1 1 30.1 93Z" fill="#FFFFFF"/><circle cx="55" cy="92" r="11" fill="#000000"/><circle cx="50" cy="89" r="3.3" fill="#FFFFFF"/><circle cx="48" cy="95" r="2" fill="#FFFFFF"/>',
      ] },
      { a: 'blink', o: [150, 90], k: [
        '<path d="M123.1 69.1L183.8 93.7A34 34 0 1 1 123.1 69.1Z" fill="#C8A20A"/><path d="M120.1 73.9L182.7 99.2A34 34 0 1 1 120.1 73.9Z" fill="#FFD11A"/><path d="M134.7 73.8L168.8 87.6A24 24 0 1 1 134.7 73.8Z" fill="#CFCFCF"/><path d="M130.1 77L169.9 93A24 24 0 1 1 130.1 77Z" fill="#FFFFFF"/><circle cx="145" cy="92" r="11" fill="#000000"/><circle cx="150" cy="89" r="3.3" fill="#FFFFFF"/><circle cx="152" cy="95" r="2" fill="#FFFFFF"/>',
      ] },
      '<path d="M70 148Q100 124 130 148Q100 136 70 148Z" fill="#FFFFFF"/>',
    ] },
  ],
  'crying': [
    { a: 'sink', o: [100, 120], k: [
      { a: 'blink', o: [50, 90], k: [
        '<path d="M16.4 95L76.2 68.3A34 34 0 1 1 16.4 95Z" fill="#C8A20A"/><path d="M17.6 100.4L79.4 72.9A34 34 0 1 1 17.6 100.4Z" fill="#FFD11A"/><path d="M30.9 88.5L64.6 73.5A24 24 0 1 1 30.9 88.5Z" fill="#CFCFCF"/><path d="M30 93.9L69.2 76.4A24 24 0 1 1 30 93.9Z" fill="#FFFFFF"/><circle cx="55" cy="92" r="11" fill="#000000"/><circle cx="50" cy="89" r="3.3" fill="#FFFFFF"/><circle cx="48" cy="95" r="2" fill="#FFFFFF"/>',
      ] },
      { a: 'blink', o: [150, 90], k: [
        '<path d="M123.8 68.3L183.6 95A34 34 0 1 1 123.8 68.3Z" fill="#C8A20A"/><path d="M120.6 72.9L182.4 100.4A34 34 0 1 1 120.6 72.9Z" fill="#FFD11A"/><path d="M135.4 73.5L169.1 88.5A24 24 0 1 1 135.4 73.5Z" fill="#CFCFCF"/><path d="M130.8 76.4L170 93.9A24 24 0 1 1 130.8 76.4Z" fill="#FFFFFF"/><circle cx="145" cy="92" r="11" fill="#000000"/><circle cx="150" cy="89" r="3.3" fill="#FFFFFF"/><circle cx="152" cy="95" r="2" fill="#FFFFFF"/>',
      ] },
      '<path d="M70 148Q100 124 130 148Q100 136 70 148Z" fill="#FFFFFF"/>',
      { a: 'drip', k: [
        '<path d="M54 118C60 134 62 144 62 152A8 8 0 0 1 46 152C46 144 48 134 54 118Z" fill="#8CD4FF"/><path d="M146 118C152 134 154 144 154 152A8 8 0 0 1 138 152C138 144 140 134 146 118Z" fill="#8CD4FF"/>',
      ] },
    ] },
  ],
  'pleading': [
    { a: 'bob', o: [100, 120], k: [
      { a: 'blink', o: [50, 90], k: [
        '<path d="M27.1 64.9L60.7 57.7A34 34 0 1 1 27.1 64.9Z" fill="#C8A20A"/><path d="M21.1 72.2L69.2 61.9A34 34 0 1 1 21.1 72.2Z" fill="#FFD11A"/><circle cx="54" cy="95" r="24" fill="#CFCFCF"/><circle cx="54" cy="95" r="24" fill="#FFFFFF"/><circle cx="55" cy="93" r="14" fill="#000000"/><circle cx="48.6" cy="89.2" r="5.5" fill="#FFFFFF"/><circle cx="46.1" cy="96.8" r="3.3" fill="#FFFFFF"/>',
      ] },
      { a: 'blink', o: [150, 90], k: [
        '<path d="M139.3 57.7L172.9 64.9A34 34 0 1 1 139.3 57.7Z" fill="#C8A20A"/><path d="M130.8 61.9L178.9 72.2A34 34 0 1 1 130.8 61.9Z" fill="#FFD11A"/><circle cx="146" cy="95" r="24" fill="#CFCFCF"/><circle cx="146" cy="95" r="24" fill="#FFFFFF"/><circle cx="145" cy="93" r="14" fill="#000000"/><circle cx="151.4" cy="89.2" r="5.5" fill="#FFFFFF"/><circle cx="153.9" cy="96.8" r="3.3" fill="#FFFFFF"/>',
      ] },
      '<path d="M82 146Q100 134 118 146Q100 141 82 146Z" fill="#FFFFFF"/>',
    ] },
  ],
  'nervous': [
    { a: 'jitter', o: [100, 120], k: [
      { a: 'blink', o: [50, 90], k: [
        '<path d="M19.2 75.7L83.6 84.7A34 34 0 1 1 19.2 75.7Z" fill="#C8A20A"/><path d="M17.1 81.4L84 90.8A34 34 0 1 1 17.1 81.4Z" fill="#FFD11A"/><path d="M36.9 78.2L75.1 83.5A24 24 0 1 1 36.9 78.2Z" fill="#CFCFCF"/><path d="M33.4 82.7L77.2 88.8A24 24 0 1 1 33.4 82.7Z" fill="#FFFFFF"/><circle cx="59" cy="89" r="11" fill="#000000"/><circle cx="54" cy="86" r="3.3" fill="#FFFFFF"/><circle cx="52" cy="92" r="2" fill="#FFFFFF"/>',
      ] },
      { a: 'blink', o: [150, 90], k: [
        '<path d="M116.4 84.7L180.8 75.7A34 34 0 1 1 116.4 84.7Z" fill="#C8A20A"/><path d="M116 90.8L182.9 81.4A34 34 0 1 1 116 90.8Z" fill="#FFD11A"/><path d="M124.9 83.5L163.1 78.2A24 24 0 1 1 124.9 83.5Z" fill="#CFCFCF"/><path d="M122.8 88.8L166.6 82.7A24 24 0 1 1 122.8 88.8Z" fill="#FFFFFF"/><circle cx="149" cy="89" r="11" fill="#000000"/><circle cx="154" cy="86" r="3.3" fill="#FFFFFF"/><circle cx="156" cy="92" r="2" fill="#FFFFFF"/>',
      ] },
      '<path d="M74 140Q84 130 94 140T114 140T134 140" fill="none" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round"/>',
      { a: 'drip', k: [
        '<path d="M170 30C178 44 182 50 182 56A12 12 0 0 1 158 56C158 50 162 44 170 30Z" fill="#8CD4FF"/>',
      ] },
    ] },
  ],
  'happy': [
    { a: 'bob', o: [100, 120], k: [
      { a: 'blink', o: [50, 90], k: [
        '<path d="M20.1 73.9L81.9 78.2A34 34 0 1 1 20.1 73.9Z" fill="#C8A20A"/><path d="M17.6 79.7L83.5 84.3A34 34 0 1 1 17.6 79.7Z" fill="#FFD11A"/><path d="M40.3 75.3L70.3 77.4A24 24 0 1 1 40.3 75.3Z" fill="#CFCFCF"/><path d="M35.3 80L74.6 82.7A24 24 0 1 1 35.3 80Z" fill="#FFFFFF"/><circle cx="55" cy="88" r="11" fill="#000000"/><circle cx="50" cy="85" r="3.3" fill="#FFFFFF"/><circle cx="48" cy="91" r="2" fill="#FFFFFF"/>',
      ] },
      { a: 'blink', o: [150, 90], k: [
        '<path d="M118.1 78.2L179.9 73.9A34 34 0 1 1 118.1 78.2Z" fill="#C8A20A"/><path d="M116.5 84.3L182.4 79.7A34 34 0 1 1 116.5 84.3Z" fill="#FFD11A"/><path d="M129.7 77.4L159.7 75.3A24 24 0 1 1 129.7 77.4Z" fill="#CFCFCF"/><path d="M125.4 82.7L164.7 80A24 24 0 1 1 125.4 82.7Z" fill="#FFFFFF"/><circle cx="145" cy="88" r="11" fill="#000000"/><circle cx="150" cy="85" r="3.3" fill="#FFFFFF"/><circle cx="152" cy="91" r="2" fill="#FFFFFF"/>',
      ] },
      '<path d="M68 128Q100 160 132 128Q100 146 68 128Z" fill="#FFFFFF"/>',
    ] },
  ],
  'laughing': [
    { a: 'laugh', o: [100, 120], k: [
      '<path d="M24 98Q50 60 76 98" fill="none" stroke="#FFD11A" stroke-width="11" stroke-linecap="round"/><path d="M124 98Q150 60 176 98" fill="none" stroke="#FFD11A" stroke-width="11" stroke-linecap="round"/><path d="M62 124Q100 128 138 124Q100 178 62 124Z" fill="#FFFFFF"/><path d="M72 132Q100 134 128 132Q100 164 72 132Z" fill="#000000"/>',
    ] },
  ],
  'wink': [
    { a: 'tilt', o: [100, 120], k: [
      { a: 'blink', o: [50, 90], k: [
        '<path d="M21.9 70.9L84 91A34 34 0 1 1 21.9 70.9Z" fill="#C8A20A"/><path d="M19 75.9L83.3 96.8A34 34 0 1 1 19 75.9Z" fill="#FFD11A"/><path d="M38.9 76.4L77.2 88.8A24 24 0 1 1 38.9 76.4Z" fill="#CFCFCF"/><path d="M35.1 80.2L78 94.1A24 24 0 1 1 35.1 80.2Z" fill="#FFFFFF"/><circle cx="55" cy="89" r="11" fill="#000000"/><circle cx="50" cy="86" r="3.3" fill="#FFFFFF"/><circle cx="48" cy="92" r="2" fill="#FFFFFF"/>',
      ] },
      '<path d="M124 98Q150 60 176 98" fill="none" stroke="#FFD11A" stroke-width="11" stroke-linecap="round"/><path d="M72 141Q104 147 128 127L131 131Q106 153 72 145Z" fill="#FFFFFF"/>',
    ] },
  ],
  'in-love': [
    { a: 'bob', o: [100, 120], k: [
      { a: 'beat', o: [50, 90], k: [
        '<path d="M18.9 76.2L78.8 72A34 34 0 1 1 18.9 76.2Z" fill="#C8A20A"/><path d="M16.9 82.3L81.7 77.8A34 34 0 1 1 16.9 82.3Z" fill="#FFD11A"/><path d="M41.3 74.6L63.7 73A24 24 0 1 1 41.3 74.6Z" fill="#CFCFCF"/><path d="M35.2 80L70.5 77.6A24 24 0 1 1 35.2 80Z" fill="#FFFFFF"/><path d="M55 100.2C53.9 99.2 44 93.1 44 88.2C44 83.8 47.1 81.5 50 81.5C52.8 81.5 55 83.8 55 86C55 83.8 57.2 81.5 60 81.5C62.9 81.5 66 83.8 66 88.2C66 93.1 56.1 99.2 55 100.2Z" fill="#000000"/><circle cx="51" cy="89" r="2.6" fill="#FFFFFF"/>',
      ] },
      { a: 'beat', o: [150, 90], k: [
        '<path d="M121.2 72L181.1 76.2A34 34 0 1 1 121.2 72Z" fill="#C8A20A"/><path d="M118.3 77.8L183.1 82.3A34 34 0 1 1 118.3 77.8Z" fill="#FFD11A"/><path d="M136.3 73L158.7 74.6A24 24 0 1 1 136.3 73Z" fill="#CFCFCF"/><path d="M129.5 77.6L164.8 80A24 24 0 1 1 129.5 77.6Z" fill="#FFFFFF"/><path d="M145 100.2C143.9 99.2 134 93.1 134 88.2C134 83.8 137.1 81.5 140.1 81.5C142.8 81.5 145 83.8 145 86C145 83.8 147.2 81.5 149.9 81.5C152.9 81.5 156 83.8 156 88.2C156 93.1 146.1 99.2 145 100.2Z" fill="#000000"/><circle cx="149" cy="89" r="2.6" fill="#FFFFFF"/>',
      ] },
      '<path d="M68 128Q100 160 132 128Q100 146 68 128Z" fill="#FFFFFF"/>',
    ] },
  ],
  'sleepy': [
    { a: 'sink', o: [100, 120], k: [
      { a: 'doze', o: [50, 90], k: [
        '<path d="M17 98L83 98A34 34 0 0 1 17 98Z" fill="#C8A20A"/><path d="M19 104L81 104A34 34 0 0 1 19 104Z" fill="#FFD11A"/><path d="M30.2 98L77.8 98A24 24 0 0 1 30.2 98Z" fill="#CFCFCF"/><path d="M31.4 103L76.6 103A24 24 0 0 1 31.4 103Z" fill="#FFFFFF"/><circle cx="55" cy="95" r="11" fill="#000000"/><path d="M46 98L50 98A2 2 0 0 1 46 98Z" fill="#FFFFFF"/>',
      ] },
      { a: 'doze', o: [150, 90], k: [
        '<path d="M117 98L183 98A34 34 0 0 1 117 98Z" fill="#C8A20A"/><path d="M119 104L181 104A34 34 0 0 1 119 104Z" fill="#FFD11A"/><path d="M122.2 98L169.8 98A24 24 0 0 1 122.2 98Z" fill="#CFCFCF"/><path d="M123.4 103L168.6 103A24 24 0 0 1 123.4 103Z" fill="#FFFFFF"/><circle cx="145" cy="95" r="11" fill="#000000"/><path d="M150 98L154 98A2 2 0 0 1 150 98Z" fill="#FFFFFF"/>',
      ] },
      '<rect x="86" y="138" width="28" height="4" rx="2" fill="#FFFFFF"/>',
      { a: 'zz', k: [
        '<path d="M148 50L162 50L148 62L162 62" fill="none" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><path d="M164 22L184 22L164 40L184 40" fill="none" stroke="#FFFFFF" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>',
      ] },
    ] },
  ],

};

const MADE = Object.entries(FACES).map(([name, drawn]) => [`eyes-${name}`, made(drawn)] as const);

/** Each face's layers, by sticker name. */
export const EYES_ART: Record<string, Shape[]> = Object.fromEntries(MADE.map(([name, { shapes }]) => [name, shapes]));

/** Each face's play, by sticker name. */
export const EYES_MOTIONS: Record<string, Motion> = Object.fromEntries(MADE.map(([name, { motion }]) => [name, motion]));
