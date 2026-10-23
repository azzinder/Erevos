import { mark } from './i18n';

// The stickers built into Erevos, in sets. Only a sticker's name travels (lib/chat-parts.ts), and
// each phone draws it itself (lib/sticker-art.ts, components/stickers.tsx), so nothing is ever
// downloaded. A name is never changed nor given to another sticker: an Erevos from before knows
// its stickers by it. Each has its words, said to those who cannot see it and in the line of the
// message, and an emoji: the words of the message it goes in, which an Erevos from before shows in
// its place. A sticker of the Words set shows its words themselves, in the app's language. The
// moons, ghosts, animals, sea, weather, space and celebrations move a little as they show
// (lib/sticker-motion.ts); the words and the treats stay still. A set's new stickers go at its
// end, so the first ones keep their places.

export type StickerSet = 'moons' | 'ghosts' | 'animals' | 'sea' | 'weather' | 'space' | 'celebrations' | 'words' | 'treats';

export type Sticker = { name: string; label: string; emoji: string; set: StickerSet };

/** The sets, as the picker shows them, each with its name and whether its stickers move. */
export const SETS: { set: StickerSet; label: string; moves: boolean }[] = [
  { set: 'moons', label: mark('Moons'), moves: true },
  { set: 'ghosts', label: mark('Ghosts'), moves: true },
  { set: 'animals', label: mark('Animals'), moves: true },
  { set: 'sea', label: mark('Sea'), moves: true },
  { set: 'weather', label: mark('Weather'), moves: true },
  { set: 'space', label: mark('Space'), moves: true },
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
    { name: 'moon-cool', label: mark('Cool moon'), emoji: '😎' },
    { name: 'moon-kiss', label: mark('Moon blowing a kiss'), emoji: '😘' },
    { name: 'moon-tongue', label: mark('Moon sticking its tongue out'), emoji: '😛' },
    { name: 'moon-think', label: mark('Thinking moon'), emoji: '🤔' },
    { name: 'moon-shy', label: mark('Shy moon'), emoji: '😊' },
    { name: 'moon-party', label: mark('Party moon'), emoji: '🥳' },
    { name: 'moon-cry', label: mark('Crying moon'), emoji: '😭' },
    { name: 'moon-dizzy', label: mark('Dizzy moon'), emoji: '😵‍💫' },
  ]),
  ...inSet('ghosts', [
    { name: 'ghost-hello', label: mark('Ghost saying hello'), emoji: '👻' },
    { name: 'ghost-boo', label: mark('Boo!'), emoji: '👻' },
    { name: 'ghost-laugh', label: mark('Laughing ghost'), emoji: '😂' },
    { name: 'ghost-love', label: mark('Ghost in love'), emoji: '🥰' },
    { name: 'ghost-wink', label: mark('Winking ghost'), emoji: '😜' },
    { name: 'ghost-wow', label: mark('Surprised ghost'), emoji: '😲' },
    { name: 'ghost-sad', label: mark('Crying ghost'), emoji: '😭' },
    { name: 'ghost-angry', label: mark('Angry ghost'), emoji: '😤' },
    { name: 'ghost-sleep', label: mark('Sleepy ghost'), emoji: '💤' },
    { name: 'ghost-shy', label: mark('Shy ghost'), emoji: '☺️' },
    { name: 'ghost-cool', label: mark('Cool ghost'), emoji: '😎' },
    { name: 'ghost-heart', label: mark('Ghost with a heart'), emoji: '💗' },
    { name: 'ghost-coffee', label: mark('Ghost with coffee'), emoji: '☕' },
    { name: 'ghost-party', label: mark('Party ghost'), emoji: '🥳' },
    { name: 'ghost-peek', label: mark('Peeking ghost'), emoji: '🫣' },
    { name: 'ghost-ok', label: mark('Ghost saying OK'), emoji: '👌' },
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
    { name: 'pig', label: mark('Pig'), emoji: '🐷' },
    { name: 'mouse', label: mark('Mouse'), emoji: '🐭' },
    { name: 'koala', label: mark('Koala'), emoji: '🐨' },
    { name: 'lion', label: mark('Lion'), emoji: '🦁' },
    { name: 'cow', label: mark('Cow'), emoji: '🐮' },
    { name: 'monkey', label: mark('Monkey'), emoji: '🐵' },
    { name: 'hedgehog', label: mark('Hedgehog'), emoji: '🦔' },
    { name: 'bee', label: mark('Bee'), emoji: '🐝' },
    { name: 'ladybug', label: mark('Ladybird'), emoji: '🐞' },
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
    { name: 'trophy', label: mark('Trophy'), emoji: '🏆' },
    { name: 'medal', label: mark('Medal'), emoji: '🥇' },
    { name: 'wedding-rings', label: mark('Wedding rings'), emoji: '💍' },
    { name: 'graduation-cap', label: mark('Graduation cap'), emoji: '🎓' },
    { name: 'bouquet', label: mark('Bouquet'), emoji: '💐' },
    { name: 'kite', label: mark('Kite'), emoji: '🪁' },
    { name: 'pomegranate', label: mark('Lucky pomegranate'), emoji: '🍎' },
    { name: 'easter-candle', label: mark('Easter candle'), emoji: '🕯️' },
    { name: 'pumpkin', label: mark('Pumpkin'), emoji: '🎃' },
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
    { name: 'hello', label: mark('Hello'), emoji: '👋' },
    { name: 'yes', label: mark('Yes'), emoji: '👍' },
    { name: 'no', label: mark('No'), emoji: '👎' },
    { name: 'good-luck', label: mark('Good luck'), emoji: '🍀' },
    { name: 'get-well', label: mark('Get well soon'), emoji: '🤒' },
    { name: 'enjoy-your-meal', label: mark('Enjoy your meal'), emoji: '🍽️' },
    { name: 'miss-you', label: mark('Miss you'), emoji: '🥺' },
    { name: 'call-me', label: mark('Call me'), emoji: '📞' },
    { name: 'chin-up', label: mark('Chin up'), emoji: '💪' },
  ]),
  ...inSet('treats', [
    { name: 'frappe', label: mark('Frappé'), emoji: '🥤' },
    { name: 'souvlaki', label: mark('Souvlaki'), emoji: '🍢' },
    { name: 'pizza', label: mark('Pizza'), emoji: '🍕' },
    { name: 'beer', label: mark('Beer'), emoji: '🍺' },
    { name: 'ice-cream', label: mark('Ice cream'), emoji: '🍦' },
    { name: 'watermelon', label: mark('Watermelon'), emoji: '🍉' },
    { name: 'doughnut', label: mark('Doughnut'), emoji: '🍩' },
    { name: 'gyros', label: mark('Gyros pita'), emoji: '🥙' },
    { name: 'koulouri', label: mark('Sesame bread ring'), emoji: '🥯' },
    { name: 'olives', label: mark('Olives'), emoji: '🫒' },
    { name: 'loukoumades', label: mark('Honey puffs'), emoji: '🍯' },
    { name: 'burger', label: mark('Burger'), emoji: '🍔' },
    { name: 'fries', label: mark('Fries'), emoji: '🍟' },
    { name: 'croissant', label: mark('Croissant'), emoji: '🥐' },
    { name: 'cupcake', label: mark('Cupcake'), emoji: '🧁' },
    { name: 'strawberry', label: mark('Strawberry'), emoji: '🍓' },
    { name: 'wine', label: mark('Wine'), emoji: '🍷' },
    { name: 'popcorn', label: mark('Popcorn'), emoji: '🍿' },
  ]),
  ...inSet('sea', [
    { name: 'fish', label: mark('Fish'), emoji: '🐟' },
    { name: 'octopus', label: mark('Octopus'), emoji: '🐙' },
    { name: 'crab', label: mark('Crab'), emoji: '🦀' },
    { name: 'dolphin', label: mark('Dolphin'), emoji: '🐬' },
    { name: 'whale', label: mark('Whale'), emoji: '🐳' },
    { name: 'jellyfish', label: mark('Jellyfish'), emoji: '🪼' },
    { name: 'starfish', label: mark('Starfish'), emoji: '⭐' },
    { name: 'pufferfish', label: mark('Pufferfish'), emoji: '🐡' },
    { name: 'seashell', label: mark('Seashell'), emoji: '🐚' },
    { name: 'sailboat', label: mark('Sailing boat'), emoji: '⛵' },
    { name: 'lighthouse', label: mark('Lighthouse'), emoji: '🗼' },
    { name: 'sea-wave', label: mark('Wave'), emoji: '🌊' },
    { name: 'anchor', label: mark('Anchor'), emoji: '⚓' },
    { name: 'beach-umbrella', label: mark('Beach umbrella'), emoji: '🏖️' },
  ]),
  ...inSet('weather', [
    { name: 'sun-cloud', label: mark('Sun and clouds'), emoji: '⛅' },
    { name: 'cloud', label: mark('Cloud'), emoji: '☁️' },
    { name: 'rain', label: mark('Rain'), emoji: '🌧️' },
    { name: 'storm', label: mark('Thunderstorm'), emoji: '⛈️' },
    { name: 'rainbow', label: mark('Rainbow'), emoji: '🌈' },
    { name: 'umbrella', label: mark('Umbrella'), emoji: '☔' },
    { name: 'wind', label: mark('Wind'), emoji: '🌬️' },
    { name: 'snowflake', label: mark('Snowflake'), emoji: '❄️' },
    { name: 'snowman', label: mark('Snowman'), emoji: '⛄' },
    { name: 'heatwave', label: mark('Heatwave'), emoji: '🥵' },
    { name: 'freezing', label: mark('Freezing'), emoji: '🥶' },
    { name: 'sunrise', label: mark('Sunrise'), emoji: '🌅' },
    { name: 'starry-night', label: mark('Starry night'), emoji: '🌌' },
  ]),
  ...inSet('space', [
    { name: 'rocket', label: mark('Rocket'), emoji: '🚀' },
    { name: 'planet', label: mark('Planet'), emoji: '🪐' },
    { name: 'earth', label: mark('Earth'), emoji: '🌍' },
    { name: 'ufo', label: mark('Flying saucer'), emoji: '🛸' },
    { name: 'alien', label: mark('Alien'), emoji: '👽' },
    { name: 'astronaut', label: mark('Astronaut'), emoji: '🧑‍🚀' },
    { name: 'comet', label: mark('Comet'), emoji: '☄️' },
    { name: 'shooting-star', label: mark('Shooting star'), emoji: '🌠' },
    { name: 'satellite', label: mark('Satellite'), emoji: '🛰️' },
    { name: 'crescent', label: mark('Crescent moon'), emoji: '🌙' },
    { name: 'black-hole', label: mark('Black hole'), emoji: '🕳️' },
    { name: 'telescope', label: mark('Telescope'), emoji: '🔭' },
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
