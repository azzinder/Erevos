// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// Takis, a caricature drawn in curves on the stickers' grid of 100 by 100: a big long head with a
// high forehead, grey-brown hair swept to one side, large ears, a long nose and a sly smile, over a
// dark suit, a white shirt and a purple tie with dots. A mood's eyes and mouth go on his face
// (lib/sticker-art.ts puts them together); each arm hangs from its shoulder, to be turned there.

const svg = (body: string) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${body}</svg>`;

const SUIT = '#1F2747';
const SUIT_EDGE = '#10152B';
const SUIT_LIGHT = '#2E3A66';
const SHIRT = '#FFFFFF';
const SHIRT_EDGE = '#B7BDC9';
const TIE = '#5B3F86';
const TIE_DOT = '#E0559A';
const SKIN = '#E9B58E';
const SKIN_SHADE = '#C98D66';
const HAIR = '#6E655D';
const HAIR_GREY = '#A59C93';
const BROW = '#3A2D25';

/** Where each arm hangs from: its left (as one looks at it) and its right. */
export const TAKIS_SHOULDERS: [number, number][] = [[33, 75], [67, 75]];

/** The suit, the shirt and the tie, from the shoulders down. */
export const TAKIS_SUIT = svg(
  `<path d="M44 62 L56 62 L57 72 L43 72 Z" fill="${SKIN}" stroke="${SKIN_SHADE}" stroke-width="1"/>` +
    `<path d="M26 100 L26 80 Q27 71 38 69 L44 67 L50 74 L56 67 L62 69 Q73 71 74 80 L74 100 Z" fill="${SUIT}" stroke="${SUIT_EDGE}" stroke-width="1.6" stroke-linejoin="round"/>` +
    `<path d="M42 67 L50 76 L58 67 L55 64 L50 70 L45 64 Z" fill="${SHIRT}" stroke="${SHIRT_EDGE}" stroke-width="1" stroke-linejoin="round"/>` +
    `<path d="M50 76 L42 67 L38 70 L45 84 L50 100 M50 76 L58 67 L62 70 L55 84 L50 100" fill="${SHIRT}" stroke="${SHIRT_EDGE}" stroke-width="1" stroke-linejoin="round"/>` +
    `<path d="M38 70 L45 84 L42 86 L35 73 Z M62 70 L55 84 L58 86 L65 73 Z" fill="${SUIT_LIGHT}" stroke="${SUIT_EDGE}" stroke-width="1" stroke-linejoin="round"/>` +
    `<path d="M47.5 72 L52.5 72 L51.5 76 L48.5 76 Z" fill="${TIE}" stroke="#3E2A5E" stroke-width="0.8"/>` +
    `<path d="M48.5 76 L51.5 76 L54 92 L50 97 L46 92 Z" fill="${TIE}" stroke="#3E2A5E" stroke-width="0.8" stroke-linejoin="round"/>` +
    `<circle cx="49.5" cy="79" r="0.8" fill="${TIE_DOT}"/><circle cx="51" cy="83" r="0.8" fill="${TIE_DOT}"/><circle cx="48.5" cy="86" r="0.8" fill="${TIE_DOT}"/><circle cx="51.5" cy="89" r="0.8" fill="${TIE_DOT}"/><circle cx="49" cy="92" r="0.8" fill="${TIE_DOT}"/>`,
);

/** An arm hanging from its shoulder (`side` 0 its left, 1 its right): a suit sleeve, a shirt cuff, a hand. */
export function takisArm(side: 0 | 1): string {
  const [x, y] = TAKIS_SHOULDERS[side];
  return svg(
    `<path d="M${x - 4.5} ${y - 3} Q${x} ${y - 5} ${x + 4.5} ${y - 3} L${x + 4} ${y + 15} L${x - 4} ${y + 15} Z" fill="${SUIT}" stroke="${SUIT_EDGE}" stroke-width="1.4" stroke-linejoin="round"/>` +
      `<rect x="${x - 3.6}" y="${y + 14.5}" width="7.2" height="2.6" rx="1" fill="${SHIRT}" stroke="${SHIRT_EDGE}" stroke-width="0.8"/>` +
      `<circle cx="${x}" cy="${y + 20.5}" r="4" fill="${SKIN}" stroke="${SKIN_SHADE}" stroke-width="0.9"/>`,
  );
}

/** His head: the ears, the long face, the cheeks' smile lines, the hair swept to one side. */
export const TAKIS_HEAD = svg(
  `<ellipse cx="28.5" cy="40" rx="6" ry="8" fill="${SKIN}" stroke="${SKIN_SHADE}" stroke-width="1.1"/><path d="M27 36 Q25 40 27.5 44" fill="none" stroke="${SKIN_SHADE}" stroke-width="1.1" stroke-linecap="round"/>` +
    `<ellipse cx="71.5" cy="40" rx="6" ry="8" fill="${SKIN}" stroke="${SKIN_SHADE}" stroke-width="1.1"/><path d="M73 36 Q75 40 72.5 44" fill="none" stroke="${SKIN_SHADE}" stroke-width="1.1" stroke-linecap="round"/>` +
    `<path d="M31 30 C31 15 39 8 50 8 C61 8 69 15 69 30 C69 44 67 53 60 59 C56 63 53 64 50 64 C47 64 44 63 40 59 C33 53 31 44 31 30 Z" fill="${SKIN}" stroke="${SKIN_SHADE}" stroke-width="1.1"/>` +
    `<path d="M40.5 49.5 Q38.5 54 40.5 58 M59.5 49.5 Q61.5 54 59.5 58" fill="none" stroke="${SKIN_SHADE}" stroke-width="1" stroke-linecap="round"/>` +
    `<path d="M41 52 C44 49.5 56 49.5 59 52 C60.5 57 57 62.5 50 63.6 C43 62.5 39.5 57 41 52 Z" fill="${SKIN_SHADE}" fill-opacity="0.22"/>` +
    `<path d="M30.6 33 C29 22 31 13 38 8 C44 3 56 1.5 63 4.5 C70 8.5 72.5 18 70 33 C69.5 27 68.5 23.5 66.5 21.5 C64 20.5 60 20.5 56 19 C50 17 44.5 15.8 40.5 14.2 C38.2 16 36.6 19 35.6 23 C34 25 32.2 29 30.6 33 Z" fill="${HAIR}"/>` +
    `<path d="M31 32 C30.5 27 31 23 33 19.5 L35.4 23.5 C33.8 25.5 32.2 29 31 32 Z M69.6 32 C69.8 27 69.4 23 68 19.5 L66.5 21.5 C68.2 23.5 69.2 27.5 69.6 32 Z" fill="${HAIR_GREY}"/>` +
    `<path d="M37.5 9.5 C45 4.8 57 4.6 65.5 11.5 M41.5 12.6 C49 9.4 58.5 10.2 66.5 16.4 M48 15.6 C54 14.2 60 15 64.5 18.6" fill="none" stroke="${HAIR_GREY}" stroke-width="1" stroke-linecap="round"/>`,
);

/** His thick dark eyebrows, for the moods that have none of their own. */
export const TAKIS_BROWS = svg(
  `<path d="M36.5 34.5 Q42 31 47 33.5 L46.6 35.4 Q42 33.6 37 36.2 Z M53 33.5 Q58 31 63.5 34.5 L63 36.2 Q58 33.6 53.4 35.4 Z" fill="${BROW}" stroke="${BROW}" stroke-width="0.8" stroke-linejoin="round"/>`,
);

/** His long nose, over his face. */
export const TAKIS_NOSE = svg(
  `<path d="M48.5 37 C48 42 46.5 45 45.6 47.5 C44.6 50.5 46.5 52.5 48.5 51.8 C49.4 52.6 50.6 52.6 51.5 51.8 C53.5 52.5 55.4 50.5 54.4 47.5 C53.5 45 52 42 51.5 37" fill="${SKIN}" stroke="${SKIN_SHADE}" stroke-width="1.1" stroke-linejoin="round"/>` +
    `<path d="M47.6 50.4 Q48.3 49.6 49 50.4 M51 50.4 Q51.7 49.6 52.4 50.4" fill="none" stroke="${SKIN_SHADE}" stroke-width="0.9" stroke-linecap="round"/>`,
);

/** His own look: deep-set dark eyes and the sly closed smile, higher on one side. */
export const TAKIS_OWN_FACE = svg(
  `<ellipse cx="42.5" cy="40.5" rx="2.6" ry="2.2" fill="#2A1E18"/><ellipse cx="57.5" cy="40.5" rx="2.6" ry="2.2" fill="#2A1E18"/>` +
    `<circle cx="42.7" cy="39.8" r="0.8" fill="#FFFFFF"/><circle cx="57.7" cy="39.8" r="0.8" fill="#FFFFFF"/>` +
    `<path d="M39.5 38.6 Q42.5 37 45.5 38.6 M54.5 38.6 Q57.5 37 60.5 38.6" fill="none" stroke="${SKIN_SHADE}" stroke-width="0.9" stroke-linecap="round"/>` +
    `<path d="M39.8 43.6 Q42.5 44.8 45 43.6 M55 43.6 Q57.5 44.8 60.2 43.6" fill="none" stroke="${SKIN_SHADE}" stroke-width="0.8" stroke-linecap="round"/>` +
    `<path d="M42 55.5 Q49 58.6 58.6 54.2" fill="none" stroke="#8A4F3C" stroke-width="1.5" stroke-linecap="round"/>`,
);
