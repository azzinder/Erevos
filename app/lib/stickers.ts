import { mark } from './i18n';

// The stickers built into Erevos, in sets. Only a sticker's name travels (lib/chat-parts.ts), and
// each phone draws it itself (lib/sticker-art.ts, components/stickers.tsx), so nothing is ever
// downloaded. A name is never changed nor given to another sticker: an Erevos from before knows
// its stickers by it. Each has its words, said to those who cannot see it and in the line of the
// message, and an emoji: the words of the message it goes in, which an Erevos from before shows in
// its place. A sticker of the Words set shows its words themselves, in the app's language. The
// moons, animals and celebrations move a little as they show (lib/sticker-motion.ts); the words
// and the treats stay still.

export type StickerSet = 'moons' | 'animals' | 'celebrations' | 'words' | 'treats';

export type Sticker = { name: string; label: string; emoji: string; set: StickerSet };

/** The sets, as the picker shows them, each with its name and whether its stickers move. */
export const SETS: { set: StickerSet; label: string; moves: boolean }[] = [
  { set: 'moons', label: mark('Moons'), moves: true },
  { set: 'animals', label: mark('Animals'), moves: true },
  { set: 'celebrations', label: mark('Celebrations'), moves: true },
  { set: 'words', label: mark('Words'), moves: false },
  { set: 'treats', label: mark('Treats'), moves: false },
];

const inSet = (set: StickerSet, stickers: Omit<Sticker, 'set'>[]): Sticker[] => stickers.map((sticker) => ({ ...sticker, set }));

export const STICKERS: Sticker[] = [
  ...inSet('moons', [
    { name: 'moon-smile', label: mark('Smiling moon'), emoji: '🌝' },
    { name: 'moon-laugh', label: mark('Laughing moon'), emoji: '😆' },
    { name: 'moon-love', label: mark('Moon in love'), emoji: '😍' },
    { name: 'moon-wink', label: mark('Winking moon'), emoji: '😉' },
    { name: 'moon-wow', label: mark('Surprised moon'), emoji: '😮' },
    { name: 'moon-sad', label: mark('Sad moon'), emoji: '😢' },
    { name: 'moon-angry', label: mark('Angry moon'), emoji: '😠' },
    { name: 'moon-sleep', label: mark('Sleeping moon'), emoji: '😴' },
    { name: 'heart', label: mark('Heart'), emoji: '❤️' },
    { name: 'sun', label: mark('Sunshine'), emoji: '☀️' },
    { name: 'coffee', label: mark('Coffee'), emoji: '☕' },
    { name: 'check', label: mark('All good'), emoji: '✅' },
  ]),
  ...inSet('animals', [
    { name: 'cat', label: mark('Cat'), emoji: '🐱' },
    { name: 'dog', label: mark('Dog'), emoji: '🐶' },
    { name: 'owl', label: mark('Owl'), emoji: '🦉' },
    { name: 'fox', label: mark('Fox'), emoji: '🦊' },
    { name: 'penguin', label: mark('Penguin'), emoji: '🐧' },
    { name: 'turtle', label: mark('Turtle'), emoji: '🐢' },
    { name: 'rabbit', label: mark('Rabbit'), emoji: '🐰' },
    { name: 'bear', label: mark('Bear'), emoji: '🐻' },
    { name: 'panda', label: mark('Panda'), emoji: '🐼' },
    { name: 'frog', label: mark('Frog'), emoji: '🐸' },
    { name: 'chick', label: mark('Chick'), emoji: '🐥' },
  ]),
  ...inSet('celebrations', [
    { name: 'cake', label: mark('Birthday cake'), emoji: '🎂' },
    { name: 'gift', label: mark('Gift'), emoji: '🎁' },
    { name: 'fireworks', label: mark('Fireworks'), emoji: '🎆' },
    { name: 'christmas-tree', label: mark('Christmas tree'), emoji: '🎄' },
    { name: 'easter-egg', label: mark('Red Easter egg'), emoji: '🥚' },
    { name: 'party-popper', label: mark('Party popper'), emoji: '🎉' },
    { name: 'hearts', label: mark('Hearts'), emoji: '💕' },
    { name: 'balloons', label: mark('Balloons'), emoji: '🎈' },
    { name: 'cheers', label: mark('Cheers'), emoji: '🥂' },
  ]),
  ...inSet('words', [
    { name: 'good-morning', label: mark('Good morning'), emoji: '🌅' },
    { name: 'good-night', label: mark('Good night'), emoji: '🌙' },
    { name: 'thank-you', label: mark('Thank you'), emoji: '🙏' },
    { name: 'on-my-way', label: mark('On my way'), emoji: '🏃' },
    { name: 'well-done', label: mark('Well done'), emoji: '👏' },
    { name: 'many-happy-returns', label: mark('Many happy returns'), emoji: '🎉' },
    { name: 'sorry', label: mark('Sorry'), emoji: '😔' },
    { name: 'see-you', label: mark('See you'), emoji: '👋' },
    { name: 'love-you', label: mark('Love you'), emoji: '🥰' },
  ]),
  ...inSet('treats', [
    { name: 'frappe', label: mark('Frappé'), emoji: '🥤' },
    { name: 'souvlaki', label: mark('Souvlaki'), emoji: '🍢' },
    { name: 'pizza', label: mark('Pizza'), emoji: '🍕' },
    { name: 'beer', label: mark('Beer'), emoji: '🍺' },
    { name: 'ice-cream', label: mark('Ice cream'), emoji: '🍦' },
    { name: 'watermelon', label: mark('Watermelon'), emoji: '🍉' },
    { name: 'doughnut', label: mark('Doughnut'), emoji: '🍩' },
  ]),
];

/** The sticker of this name, or null for one this Erevos does not have (a later one's). */
export function stickerOf(name: string): Sticker | null {
  return STICKERS.find((sticker) => sticker.name === name) ?? null;
}

/** The stickers of a set, in the picker's order. */
export function stickersIn(set: StickerSet): Sticker[] {
  return STICKERS.filter((sticker) => sticker.set === set);
}

/** How wide a Words sticker's card holds words, on its grid of 100, and the sizes they are drawn in. */
export const WORDS_ROOM = 80;
const WORDS_SIZES = [19, 16, 14, 12, 10];
// About how wide a letter of the card's bold words is, for their size.
const LETTER = 0.66;

/** How many lines `words` take, `size` large, wrapped between words; Infinity when a word is too long for a line. */
export function wordsLines(words: string, size: number): number {
  const most = Math.floor(WORDS_ROOM / (LETTER * size));
  let lines = 0;
  let line = 0;
  for (const word of words.split(/\s+/).filter(Boolean)) {
    const length = [...word].length;
    if (length > most) return Infinity;
    if (line && line + 1 + length <= most) line += 1 + length;
    else {
      lines += 1;
      line = length;
    }
  }
  return lines;
}

/**
 * How large a Words sticker's words are drawn, on its grid of 100: as large as they fit in two
 * lines on the card, whatever the language says.
 */
export function wordsSize(words: string): number {
  return WORDS_SIZES.find((size) => wordsLines(words, size) <= 2) ?? WORDS_SIZES[WORDS_SIZES.length - 1];
}
