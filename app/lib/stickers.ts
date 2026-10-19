import { mark } from './i18n';

// The stickers built into Erevos. Only a sticker's name travels (lib/chat-parts.ts), and each phone
// draws it itself (components/stickers.tsx), so nothing is ever downloaded. Each has its words, said
// to those who cannot see it and in the line of the message, and an emoji: the words of the message
// it goes in, which an Erevos from before shows in its place.

export type Sticker = { name: string; label: string; emoji: string };

export const STICKERS: Sticker[] = [
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
];

/** The sticker of this name, or null for one this Erevos does not have (a later one's). */
export function stickerOf(name: string): Sticker | null {
  return STICKERS.find((sticker) => sticker.name === name) ?? null;
}
