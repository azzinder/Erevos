// How the built-in stickers move (components/stickers.tsx plays it, lib/sticker-art.ts names the
// parts): each sticker of the sets that move once, for a few seconds, as it
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
const fall = (part: string, height: number, from = 0): Move => ({
  part,
  at: [0, from + 0.01, from + 0.3, from + 0.31, Math.min(0.99, from + 0.45), 1],
  y: [0, 0, height, 0, 0, 0],
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
  // Ghosts.
  'ghost-hello': { ms: 2200, moves: [{ part: 'arm2', about: [78, 46], at: [0, 0.15, 0.3, 0.45, 0.6, 0.75, 1], turn: [0, -25, 10, -25, 10, -10, 0] }, bob(4)] },
  'ghost-boo': { ms: 1600, moves: [{ part: 'all', about: [50, 86], at: [0, 0.2, 0.35, 0.55, 0.75, 1], scale: [1, 0.85, 1.18, 1.18, 0.97, 1] }, flap('arm1', [22, 46], -12), flap('arm2', [78, 46], 12)] },
  'ghost-laugh': { ms: 1800, moves: [{ part: 'all', at: [0, 0.12, 0.24, 0.36, 0.48, 0.6, 0.72, 1], y: [0, -6, 0, -6, 0, -4, 0, 0], turn: [0, -4, 4, -4, 4, -2, 0, 0] }, twinkle('tears')] },
  'ghost-love': { ms: 2400, moves: [beat('eye1', [40, 40], 1.35), beat('eye2', [60, 40], 1.35), rise('float', 10), bob(3)] },
  'ghost-wink': { ms: 1800, moves: [{ part: 'all', about: [50, 86], at: [0, 0.2, 0.7, 1], turn: [0, 8, 8, 0] }, blink('eye1', [40, 40])] },
  'ghost-wow': { ms: 1600, moves: [{ part: 'all', at: [0, 0.15, 0.3, 0.45, 1], y: [0, -10, 0, -3, 0] }, flap('arm1', [22, 46], -15), flap('arm2', [78, 46], 15)] },
  'ghost-sad': {
    ms: 2600,
    moves: [
      { part: 'tear1', at: [0, 0.1, 0.5, 0.51, 0.75, 1], y: [0, 0, 24, 0, 0, 0], opacity: [1, 1, 0, 0, 1, 1] },
      { part: 'tear2', at: [0, 0.3, 0.7, 0.71, 0.9, 1], y: [0, 0, 24, 0, 0, 0], opacity: [1, 1, 0, 0, 1, 1] },
      { part: 'all', at: [0, 0.3, 0.7, 1], y: [0, 3, 3, 0] },
    ],
  },
  'ghost-angry': { ms: 1600, moves: [{ part: 'all', at: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 1], x: [0, -3, 3, -3, 3, -2, 0, 0] }, pop('puff', [50, 14])] },
  'ghost-sleep': { ms: 3000, moves: [rise('z', 8), { part: 'body', about: [50, 86], at: EVEN, sy: [1, 0.97, 1, 0.97, 1], y: [0, 2, 0, 2, 0] }] },
  'ghost-shy': { ms: 2200, moves: [rock(5, 'all', [50, 86]), { part: 'blush', at: [0, 0.3, 0.7, 1], opacity: [1, 0.5, 1, 1] }] },
  'ghost-cool': { ms: 2000, moves: [{ part: 'all', about: [50, 86], at: [0, 0.25, 0.75, 1], turn: [0, -6, -6, 0] }, { part: 'glint', at: [0, 0.3, 0.45, 0.6, 1], opacity: [1, 1, 0, 1, 1], x: [0, 0, 6, 0, 0] }] },
  'ghost-heart': { ms: 2200, moves: [beat('heart', [50, 64], 1.2), bob(3)] },
  'ghost-coffee': { ms: 2600, moves: [rise('steam', 6), rock(4, 'all', [50, 86])] },
  'ghost-party': { ms: 2400, moves: [twinkle('confetti'), rise('confetti', 6, 0.4), { part: 'all', at: [0, 0.15, 0.3, 0.45, 0.6, 1], y: [0, -8, 0, -6, 0, 0] }, rock(10, 'hat', [50, 18])] },
  'ghost-peek': { ms: 2600, moves: [{ part: 'body', at: [0, 0.2, 0.45, 0.7, 1], y: [0, 26, 26, -4, 0] }] },
  'ghost-ok': { ms: 1800, moves: [pop('badge', [80, 70], 0.1), bob(3)] },
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
  // Sea.
  fish: { ms: 2400, moves: [flap('tail', [74, 52], 18), { part: 'all', at: EVEN, x: [0, -4, 0, -4, 0], y: [0, -2, 0, 2, 0] }, rise('bubbles', 10)] },
  octopus: { ms: 2400, moves: [{ part: 'legs', about: [50, 60], at: EVEN, sx: [1, 1.08, 0.94, 1.06, 1], sy: [1, 0.94, 1.04, 0.96, 1] }, bob(5)] },
  crab: { ms: 2000, moves: [flap('claw1', [28, 58], -16), flap('claw2', [72, 58], 16), { part: 'all', at: EVEN, x: [0, -5, 0, 5, 0] }, blink('eyes', [50, 34])] },
  dolphin: { ms: 2400, moves: [{ part: 'jump', about: [50, 90], at: [0, 0.3, 0.6, 1], turn: [0, -12, 10, 0], y: [0, -14, -6, 0] }, pop('splash', [50, 86], 0.5)] },
  whale: { ms: 2600, moves: [pop('spout', [46, 24]), flap('tail', [80, 52], -12), bob(3)] },
  jellyfish: { ms: 2600, moves: [{ part: 'all', at: EVEN, y: [0, -8, 0, -8, 0] }, { part: 'dome', about: [50, 40], at: EVEN, sx: [1, 0.92, 1, 0.92, 1], sy: [1, 1.06, 1, 1.06, 1] }, { part: 'tentacles', about: [50, 54], at: EVEN, turn: [0, 5, -5, 5, 0] }] },
  starfish: { ms: 2000, moves: [{ part: 'all', about: [50, 54], at: [0, 0.2, 0.45, 0.7, 1], turn: [0, -12, 10, -5, 0], scale: [1, 1.08, 0.96, 1.03, 1] }] },
  pufferfish: { ms: 2000, moves: [{ part: 'body', about: [50, 52], at: [0, 0.2, 0.5, 0.65, 1], scale: [1, 1.22, 1.22, 0.95, 1] }] },
  seashell: { ms: 1800, moves: [{ part: 'all', about: [50, 88], at: [0, 0.15, 0.35, 0.55, 1], sy: [1, 0.9, 1.08, 0.97, 1] }, twinkle('pearl')] },
  sailboat: { ms: 3000, moves: [rock(6, 'boat', [50, 82]), { part: 'waves', at: EVEN, x: [0, 6, 0, -6, 0] }] },
  lighthouse: { ms: 3000, moves: [{ part: 'beams', at: [0, 0.15, 0.3, 0.45, 0.6, 0.75, 1], opacity: [1, 0.1, 1, 0.1, 1, 0.3, 1] }] },
  'sea-wave': { ms: 2400, moves: [{ part: 'wave', about: [50, 94], at: EVEN, sx: [1, 1.04, 1, 1.04, 1], x: [0, -4, 0, -4, 0] }, rise('drops', 8, 0.1)] },
  anchor: { ms: 2400, moves: [rock(14, 'swing', [50, 8])] },
  'beach-umbrella': { ms: 2600, moves: [rock(5, 'umbrella', [48, 90])] },
  // Weather.
  'sun-cloud': { ms: 3000, moves: [{ part: 'rays', about: [38, 38], at: [0, 1], turn: [0, 45], every: 45 }, { part: 'cloud', at: EVEN, x: [0, -8, 0, -8, 0] }] },
  cloud: { ms: 2400, moves: [{ part: 'all', at: EVEN, x: [0, 4, 0, -4, 0], y: [0, -3, 0, -3, 0] }, { part: 'cloud', about: [50, 60], at: EVEN, sx: [1, 1.04, 1, 1.04, 1] }] },
  rain: { ms: 2400, moves: [fall('drops', 10), fall('drops', 10, 0.5), bob(2)] },
  storm: { ms: 2400, moves: [{ part: 'bolt', at: [0, 0.1, 0.15, 0.2, 0.25, 0.6, 0.65, 0.7, 1], opacity: [1, 0, 1, 0, 1, 1, 0, 1, 1] }, fall('drops', 10), { part: 'all', at: [0, 0.1, 0.15, 0.2, 1], x: [0, -2, 2, 0, 0] }] },
  rainbow: { ms: 2600, moves: [{ part: 'all', about: [50, 70], at: [0, 0.2, 0.4, 0.6, 1], scale: [1, 0.9, 1.06, 0.98, 1] }, twinkle('sparkle'), bob(3, 'cloud1'), { ...bob(3, 'cloud2'), y: [0, 0, -3, 0, 0] }] },
  umbrella: { ms: 2400, moves: [rock(6, 'umbrella', [50, 82]), fall('drops', 10)] },
  wind: { ms: 2400, moves: [{ part: 'gust', at: EVEN, x: [0, 6, 0, 6, 0], sx: [1, 1.05, 1, 1.05, 1] }, { part: 'leaf', about: [84, 82], at: [0, 0.3, 0.6, 1], x: [0, -10, -4, 0], y: [0, -14, -6, 0], turn: [0, -90, -200, -360], every: 360 }] },
  snowflake: { ms: 3000, moves: [{ part: 'flake', at: [0, 1], turn: [0, 60], every: 60 }, { part: 'all', at: EVEN, y: [0, 3, 0, 3, 0] }] },
  snowman: { ms: 2600, moves: [rock(5, 'body', [50, 94]), fall('snow', 8)] },
  heatwave: { ms: 2600, moves: [{ part: 'mercury', about: [36, 76], at: [0, 0.3, 0.6, 1], sy: [1, 0.5, 1.15, 1] }, { part: 'rays', about: [68, 32], at: [0, 1], turn: [0, 45], every: 45 }, fall('sweat', 8)] },
  freezing: { ms: 1800, moves: [{ part: 'face', at: [0, 0.06, 0.12, 0.18, 0.24, 0.3, 0.36, 0.42, 0.48, 1], x: [0, -2, 2, -2, 2, -2, 2, -2, 0, 0] }, twinkle('flakes')] },
  sunrise: { ms: 3000, moves: [{ part: 'sun', at: [0, 0.2, 0.35, 1], y: [0, 30, 30, 0] }] },
  'starry-night': { ms: 3000, moves: [twinkle('stars1'), { ...twinkle('stars2'), opacity: [1, 1, 0.25, 1, 0.25, 1, 1] }] },
  // Space.
  rocket: { ms: 2200, moves: [{ part: 'flame', about: [50, 80], at: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 1], sy: [1, 1.4, 0.8, 1.4, 0.8, 1.3, 1, 1] }, { part: 'all', at: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 1], x: [0, -1, 1, -1, 1, -1, 0, 0], y: [0, -2, -4, -6, -8, -10, -10, 0] }] },
  planet: { ms: 3000, moves: [rock(6, 'all'), twinkle('stars')] },
  earth: { ms: 3000, moves: [rock(8, 'globe'), bob(3)] },
  ufo: { ms: 2600, moves: [{ part: 'ship', at: EVEN, x: [0, -6, 0, 6, 0], turn: [0, -5, 0, 5, 0] }, { part: 'beam', at: [0, 0.2, 0.4, 0.6, 0.8, 1], opacity: [1, 0.2, 1, 0.2, 1, 1] }] },
  alien: { ms: 2000, moves: [blink('eyes', [50, 50]), rock(6, 'antennas', [50, 20]), bob(3)] },
  astronaut: { ms: 3000, moves: [{ part: 'body', at: EVEN, y: [0, -6, 0, -6, 0], turn: [0, -8, 0, 8, 0] }, twinkle('stars')] },
  comet: { ms: 2400, moves: [{ part: 'all', at: EVEN, x: [0, 4, 0, 4, 0], y: [0, -4, 0, -4, 0] }, { part: 'tail', about: [56, 44], at: EVEN, scale: [1, 1.12, 1, 1.12, 1], opacity: [1, 0.7, 1, 0.7, 1] }] },
  'shooting-star': { ms: 2000, moves: [{ part: 'star', about: [62, 38], at: [0, 0.3, 0.6, 1], turn: [0, 72, 144, 144], every: 72 }, { part: 'trail', at: EVEN, opacity: [1, 0.4, 1, 0.4, 1] }] },
  satellite: { ms: 3000, moves: [rock(8, 'sat'), { part: 'signal', at: [0, 0.2, 0.4, 0.6, 0.8, 1], opacity: [1, 0, 1, 0, 1, 1] }] },
  crescent: { ms: 3000, moves: [rock(10, 'moon'), twinkle('stars')] },
  'black-hole': { ms: 3000, moves: [{ part: 'swirl', at: [0, 1], turn: [0, -360], every: 360 }] },
  telescope: { ms: 2600, moves: [twinkle('stars')] },
  'moon-cool': { ms: 2000, moves: [{ part: 'all', at: [0, 0.25, 0.75, 1], turn: [0, -8, -8, 0] }, { part: 'glint', at: [0, 0.3, 0.45, 0.6, 1], opacity: [1, 1, 0, 1, 1], x: [0, 0, 7, 0, 0] }] },
  'moon-kiss': { ms: 2400, moves: [{ part: 'kiss', at: [0, 0.1, 0.5, 0.51, 0.7, 1], x: [0, 0, 12, 0, 0, 0], y: [0, 0, -30, 0, 0, 0], opacity: [1, 1, 0, 0, 1, 1] }, rock(5)] },
  'moon-tongue': { ms: 1800, moves: [{ part: 'tongue', about: [54, 60], at: [0, 0.15, 0.3, 0.45, 0.6, 1], sy: [1, 0.3, 1.15, 0.3, 1, 1] }, rock(6)] },
  'moon-think': { ms: 2600, moves: [{ part: 'hand', about: [30, 74], at: EVEN, turn: [0, 8, 0, 8, 0] }, twinkle('dots'), { part: 'all', at: [0, 0.3, 0.7, 1], turn: [0, 6, 6, 0] }] },
  'moon-shy': { ms: 2200, moves: [{ part: 'blush', at: [0, 0.3, 0.7, 1], opacity: [1, 0.4, 1, 1] }, rock(5)] },
  'moon-party': { ms: 2400, moves: [twinkle('confetti'), { part: 'all', at: [0, 0.15, 0.3, 0.45, 0.6, 1], y: [0, -8, 0, -6, 0, 0] }, rock(10, 'hat', [64, 24])] },
  'moon-cry': { ms: 2400, moves: [{ part: 'tears', about: [50, 44], at: [0, 0.2, 0.4, 0.6, 0.8, 1], sy: [1, 1.15, 0.9, 1.15, 0.9, 1] }, { part: 'all', at: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 1], y: [0, 2, 0, 2, 0, 2, 0] }] },
  'moon-dizzy': { ms: 2600, moves: [{ part: 'eye1', about: [36, 40], at: [0, 1], turn: [0, 360], every: 360 }, { part: 'eye2', about: [64, 40], at: [0, 1], turn: [0, -360], every: 360 }, { part: 'stars', about: [50, 12], at: EVEN, turn: [0, 8, 0, -8, 0] }, rock(6)] },
  pig: { ms: 2000, moves: [{ part: 'snout', about: [50, 64], at: [0, 0.15, 0.3, 0.45, 0.6, 1], sx: [1, 1.12, 1, 1.12, 1, 1], sy: [1, 0.9, 1, 0.9, 1, 1] }, flap('ears', [50, 34], 5), bob(3)] },
  mouse: { ms: 2000, moves: [flap('ear1', [32, 40], -12), flap('ear2', [68, 40], 12), rock(5)] },
  koala: { ms: 2400, moves: [flap('ear1', [26, 40], -10), flap('ear2', [74, 40], 10), rock(6)] },
  lion: { ms: 2400, moves: [{ part: 'mane', about: [50, 52], at: EVEN, scale: [1, 1.06, 1, 1.06, 1], turn: [0, 6, 0, -6, 0] }, bob(2)] },
  cow: { ms: 2200, moves: [flap('ears', [50, 40], 6), { part: 'bell', about: [50, 84], at: [0, 0.15, 0.3, 0.45, 0.6, 0.75, 1], turn: [0, 20, -20, 15, -10, 5, 0] }, rock(4)] },
  monkey: { ms: 1800, moves: [{ part: 'all', at: [0, 0.15, 0.3, 0.45, 0.6, 1], y: [0, -8, 0, -6, 0, 0], turn: [0, -6, 6, -4, 0, 0] }] },
  hedgehog: { ms: 2200, moves: [{ part: 'spines', about: [56, 80], at: EVEN, sy: [1, 1.06, 1, 1.06, 1] }, { part: 'all', at: EVEN, x: [0, -4, 0, -4, 0] }] },
  bee: { ms: 2400, moves: [{ part: 'wings', about: [50, 40], at: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 1], sy: [1, 0.5, 1, 0.5, 1, 0.5, 1, 0.5, 1, 1] }, { part: 'all', at: EVEN, x: [0, 6, 0, -6, 0], y: [0, -5, 0, -5, 0] }] },
  ladybug: { ms: 2400, moves: [{ part: 'wings', about: [50, 30], at: [0, 0.2, 0.5, 0.7, 1], sx: [1, 0.85, 1.06, 0.97, 1] }, rock(6, 'all', [50, 90])] },
  trophy: { ms: 2400, moves: [twinkle('shine'), beat('star', [56, 34], 1.3), rock(4, 'all', [50, 94])] },
  medal: { ms: 2400, moves: [{ part: 'medal', about: [50, 38], at: [0, 0.2, 0.4, 0.6, 0.8, 1], turn: [0, 12, -10, 6, -3, 0] }, { part: 'medal', about: [50, 62], at: [0, 0.3, 0.5, 1], sx: [1, -1, 1, 1] }] },
  'wedding-rings': { ms: 2400, moves: [{ part: 'ring1', at: [0, 0.2, 0.4, 1], x: [0, -6, 0, 0] }, { part: 'ring2', at: [0, 0.2, 0.4, 1], x: [0, 6, 0, 0] }, rise('hearts', 10, 0.4)] },
  'graduation-cap': { ms: 2400, moves: [{ part: 'cap', about: [50, 60], at: [0, 0.2, 0.4, 0.6, 1], y: [0, -24, -30, 0, 0], turn: [0, -20, 20, 0, 0] }, rock(20, 'tassel', [50, 37]), twinkle('stars')] },
  bouquet: { ms: 2400, moves: [rock(6, 'all', [50, 94]), { part: 'flowers', about: [50, 44], at: EVEN, scale: [1, 1.05, 1, 1.05, 1] }] },
  kite: { ms: 3000, moves: [{ part: 'kite', about: [30, 94], at: EVEN, turn: [0, 8, 0, -8, 0], y: [0, -4, 0, -4, 0] }] },
  pomegranate: { ms: 2400, moves: [{ part: 'all', about: [50, 94], at: [0, 0.15, 0.3, 0.45, 0.6, 1], y: [0, -8, 0, -4, 0, 0], turn: [0, -6, 6, -3, 0, 0] }, twinkle('shine'), pop('seeds', [69, 72], 0.3)] },
  'easter-candle': { ms: 2400, moves: [{ part: 'flame', about: [50, 20], at: [0, 0.15, 0.3, 0.45, 0.6, 0.75, 1], sy: [1, 1.3, 0.85, 1.25, 0.9, 1.15, 1], turn: [0, 6, -6, 6, -4, 2, 0] }] },
  pumpkin: { ms: 2200, moves: [{ part: 'face', at: [0, 0.2, 0.3, 0.4, 0.5, 1], opacity: [1, 1, 0.3, 1, 0.3, 1] }, rock(6, 'all', [50, 94])] },
};

/** A sticker's motion, to play now: none for one that stays still, or while motion is to be reduced (or not known yet). */
export function motionFor(name: string, reduceMotion: boolean | null): Motion | null {
  if (reduceMotion !== false) return null;
  return MOTIONS[name] ?? null;
}
