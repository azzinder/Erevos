// How the built-in stickers move (components/stickers.tsx plays it, lib/sticker-art.ts names the
// parts): each of the moons, animals and celebrations once, for a few seconds, as it
// comes into view and when it is tapped, and then it rests on its still frame. Nothing loops, so
// a long chat full of stickers is as calm, and as light on the battery, as one without. With the
// phone's reduce motion setting on, or while it is not known yet, every sticker stays still.
//
// A move is a part of a sticker (`all`, the whole of it) at given times over the play, from 0 to 1:
// shifted (`x`, `y`, on the sticker's grid of 100), turned (degrees), grown (`scale`, or `sx` and
// `sy` across and up), or faded (`opacity`), about a point of the grid (`about`, its middle unless
// said). A part may have more than one move. Each starts and ends as the sticker is drawn, so it
// never jumps when it stops; a part that looks the same once turned some way (`every`, degrees, as
// a sun's rays) may end turned so.

export type Move = {
  part: string;
  about?: [number, number];
  at: number[];
  x?: number[];
  y?: number[];
  turn?: number[];
  scale?: number[];
  sx?: number[];
  sy?: number[];
  opacity?: number[];
  every?: number;
};

/** A sticker's play: how long it lasts, milliseconds, and its moves. */
export type Motion = { ms: number; moves: Move[] };

/** How each of a move's values is at rest. */
export const REST = { x: 0, y: 0, turn: 0, scale: 1, sx: 1, sy: 1, opacity: 1 } as const;

const EVEN = [0, 0.25, 0.5, 0.75, 1];

// A few moves that many stickers share.
const rock = (degrees: number, part = 'all', about?: [number, number]): Move => ({
  part,
  ...(about ? { about } : {}),
  at: [0, 0.2, 0.45, 0.7, 1],
  turn: [0, -degrees, degrees * 0.8, -degrees * 0.4, 0],
});
const bob = (height: number, part = 'all'): Move => ({ part, at: EVEN, y: [0, -height, 0, -height / 2, 0] });
const blink = (part: string, about: [number, number]): Move => ({
  part,
  about,
  at: [0, 0.3, 0.36, 0.42, 0.7, 0.76, 0.82, 1],
  sy: [1, 1, 0.1, 1, 1, 0.1, 1, 1],
});
const beat = (part: string, about: [number, number], most = 1.2): Move => ({
  part,
  about,
  at: [0, 0.1, 0.2, 0.3, 0.4, 0.55, 0.65, 0.75, 0.85, 1],
  scale: [1, most, 1, most * 0.95, 1, 1, most, 1, most * 0.95, 1],
});
const flap = (part: string, about: [number, number], degrees: number): Move => ({
  part,
  about,
  at: [0, 0.15, 0.3, 0.45, 0.6, 0.75, 1],
  turn: [0, degrees, 0, degrees, 0, degrees * 0.6, 0],
});
const rise = (part: string, height: number, from = 0): Move => ({
  part,
  at: [0, from + 0.01, from + 0.3, from + 0.31, Math.min(0.99, from + 0.55), 1],
  y: [0, 0, -height, 0, 0, 0],
  opacity: [1, 1, 0, 0, 1, 1],
});
const pop = (part: string, about: [number, number], from = 0): Move => ({
  part,
  about,
  at: [0, from + 0.01, from + 0.12, from + 0.3, from + 0.45, 1],
  scale: [1, 1, 0.5, 1.2, 1, 1],
  opacity: [1, 1, 0.4, 1, 1, 1],
});
const twinkle = (part: string): Move => ({ part, at: [0, 0.15, 0.3, 0.45, 0.6, 0.75, 1], opacity: [1, 0.25, 1, 0.25, 1, 0.4, 1] });

/** The motion of each sticker that moves, by name. */
export const MOTIONS: Record<string, Motion> = {
  // Moons.
  'moon-smile': { ms: 2000, moves: [rock(6), bob(3)] },
  'moon-laugh': { ms: 1800, moves: [{ part: 'all', at: [0, 0.12, 0.24, 0.36, 0.48, 0.6, 0.72, 1], y: [0, -6, 0, -6, 0, -4, 0, 0], turn: [0, -5, 5, -5, 5, -3, 0, 0] }] },
  'moon-love': { ms: 2200, moves: [beat('eye1', [35, 40], 1.3), beat('eye2', [65, 40], 1.3), bob(2)] },
  'moon-wink': { ms: 1800, moves: [{ part: 'all', at: [0, 0.2, 0.7, 1], turn: [0, 9, 9, 0] }, blink('eye1', [36, 40])] },
  'moon-wow': { ms: 1600, moves: [{ part: 'all', at: [0, 0.15, 0.35, 0.55, 1], scale: [1, 1.14, 0.95, 1.04, 1] }] },
  'moon-sad': { ms: 2600, moves: [{ part: 'tear', at: [0, 0.1, 0.55, 0.56, 0.8, 1], y: [0, 0, 22, 0, 0, 0], opacity: [1, 1, 0, 0, 1, 1] }, { part: 'all', at: [0, 0.3, 0.7, 1], y: [0, 2, 2, 0] }] },
  'moon-angry': { ms: 1400, moves: [{ part: 'all', at: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 1], x: [0, -3, 3, -3, 3, -2, 0, 0] }] },
  'moon-sleep': { ms: 3000, moves: [rise('z', 8), { part: 'face', at: EVEN, scale: [1, 1.03, 1, 1.03, 1] }] },
  heart: { ms: 2000, moves: [beat('all', [50, 46], 1.15)] },
  sun: { ms: 3000, moves: [{ part: 'rays', at: [0, 1], turn: [0, 45], every: 45 }, rock(4, 'face')] },
  coffee: { ms: 2600, moves: [rise('steam', 6), rise('steam2', 6, 0.35)] },
  check: { ms: 1400, moves: [{ part: 'all', at: [0, 0.2, 0.45, 0.7, 1], scale: [1, 0.85, 1.12, 0.97, 1] }] },
  // Animals.
  cat: {
    ms: 2200,
    moves: [
      rock(7),
      { part: 'ear1', about: [30, 42], at: [0, 0.35, 0.42, 0.49, 1], turn: [0, 0, -14, 0, 0] },
      { part: 'ear2', about: [70, 42], at: [0, 0.6, 0.67, 0.74, 1], turn: [0, 0, 14, 0, 0] },
    ],
  },
  dog: { ms: 2000, moves: [flap('ear1', [24, 34], 14), flap('ear2', [76, 34], -14), bob(3)] },
  owl: { ms: 2400, moves: [blink('eyes', [50, 42]), rock(5)] },
  fox: { ms: 2000, moves: [rock(8), flap('ears', [50, 40], 4)] },
  penguin: { ms: 2000, moves: [flap('wing1', [22, 50], 22), flap('wing2', [78, 50], -22), rock(5, 'all', [50, 96])] },
  turtle: { ms: 2600, moves: [{ part: 'head', about: [76, 60], at: EVEN, turn: [0, -12, 0, -8, 0] }, { part: 'all', at: EVEN, x: [0, 2, 0, 2, 0] }] },
  rabbit: { ms: 2000, moves: [flap('ear1', [40, 40], -10), flap('ear2', [60, 40], 10), bob(4)] },
  bear: { ms: 2000, moves: [rock(6), flap('paw', [82, 84], -18)] },
  panda: { ms: 2400, moves: [blink('eyes', [50, 51]), rock(5)] },
  frog: { ms: 1800, moves: [{ part: 'all', at: [0, 0.15, 0.3, 0.45, 0.6, 1], y: [0, -10, 0, -5, 0, 0], sy: [1, 1.04, 0.94, 1.02, 1, 1] }, blink('eyes', [50, 34])] },
  chick: { ms: 1800, moves: [flap('wing1', [24, 56], 25), flap('wing2', [76, 56], -25), bob(5)] },
  // Celebrations.
  cake: { ms: 2400, moves: [{ part: 'flames', about: [50, 26], at: [0, 0.15, 0.3, 0.45, 0.6, 0.75, 1], sy: [1, 1.3, 0.85, 1.25, 0.9, 1.15, 1], opacity: [1, 0.8, 1, 0.8, 1, 0.9, 1] }] },
  gift: { ms: 1800, moves: [{ part: 'all', about: [50, 90], at: [0, 0.15, 0.3, 0.45, 0.6, 1], y: [0, -8, 0, -4, 0, 0], turn: [0, -6, 6, -3, 0, 0] }, { part: 'lid', at: [0, 0.15, 0.3, 0.45, 0.6, 1], y: [0, -5, 0, -3, 0, 0] }] },
  fireworks: { ms: 3000, moves: [pop('burst1', [40, 38]), pop('burst2', [66, 60], 0.25), pop('burst3', [32, 70], 0.5)] },
  'christmas-tree': { ms: 3000, moves: [twinkle('lights'), beat('star', [50, 13], 1.25)] },
  'easter-egg': { ms: 2000, moves: [{ part: 'all', about: [50, 94], at: [0, 0.15, 0.35, 0.55, 0.75, 1], turn: [0, -10, 8, -5, 3, 0] }] },
  'party-popper': { ms: 2400, moves: [{ part: 'popper', about: [20, 84], at: [0, 0.1, 0.25, 1], turn: [0, -10, 0, 0] }, rise('confetti', 10, 0.1)] },
  hearts: { ms: 2400, moves: [beat('heart1', [42, 54], 1.15), { ...beat('heart2', [72, 28], 1.25), at: [0, 0.15, 0.25, 0.35, 0.45, 0.6, 0.7, 0.8, 0.9, 1] }] },
  balloons: { ms: 3000, moves: [{ part: 'all', about: [50, 94], at: EVEN, y: [0, -5, 0, -5, 0], turn: [0, 3, -3, 2, 0] }] },
  cheers: { ms: 2000, moves: [flap('glass1', [32, 88], 4), flap('glass2', [68, 88], -4), twinkle('bubbles')] },
};

/** A sticker's motion, to play now: none for one that stays still, or while motion is to be reduced (or not known yet). */
export function motionFor(name: string, reduceMotion: boolean | null): Motion | null {
  if (reduceMotion !== false) return null;
  return MOTIONS[name] ?? null;
}
