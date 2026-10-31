// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// The aikidoka of the Aikido stickers, drawn in curves on the stickers' grid of 100 by 100: a wide
// pleated hakama down to the mat (or spread out, sitting in seiza), a white keikogi with its thick
// collar crossed left over right, wide sleeves, and a round head that a mood's face goes on
// (lib/sticker-art.ts puts them together). Each arm hangs from its shoulder, to be turned there.

const svg = (body: string) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${body}</svg>`;

const NAVY = '#24305C';
const NAVY_EDGE = '#141B36';
const PLEAT = '#3B4C86';
const GI = '#FFFFFF';
const GI_EDGE = '#AEB6C4';
const GI_SHADE = '#E4E8EF';
const SKIN = '#F5C9A0';
const SKIN_SHADE = '#E2AC82';

/** Where each arm hangs from: its left (as one looks at it) and its right. */
export const AIKI_SHOULDERS: [number, number][] = [[37, 47], [63, 47]];

/** The hakama standing: from the waist it flares to the mat, its pleats fanning out. */
export const AIKI_HAKAMA = svg(
  `<path d="M34 61 C30 74 20 86 12 96 Q16 98.5 22 97 Q27 99 32 97 Q38 99 44 97 L50 92 L56 97 Q62 99 68 97 Q73 99 78 97 Q84 98.5 88 96 C80 86 70 74 66 61 Z" fill="${NAVY}" stroke="${NAVY_EDGE}" stroke-width="1.6" stroke-linejoin="round"/>` +
    `<path d="M50 70 L50 92" stroke="${NAVY_EDGE}" stroke-width="1.6" stroke-linecap="round"/>` +
    `<path d="M40 64 C36 76 30 87 26 96 M45 64 C43 76 40 87 38 96 M55 64 C57 76 60 87 62 96 M60 64 C64 76 70 87 74 96" fill="none" stroke="${PLEAT}" stroke-width="1.4" stroke-linecap="round"/>` +
    `<ellipse cx="41" cy="98" rx="4.5" ry="2" fill="${SKIN}"/><ellipse cx="59" cy="98" rx="4.5" ry="2" fill="${SKIN}"/>`,
);

/** The hakama sitting in seiza: spread over the knees, wide on the mat. */
export const AIKI_HAKAMA_SEATED = svg(
  `<path d="M34 61 C28 66 16 70 12 80 C9 88 10 95 14 96 Q30 99 50 97 Q70 99 86 96 C90 95 91 88 88 80 C84 70 72 66 66 61 Z" fill="${NAVY}" stroke="${NAVY_EDGE}" stroke-width="1.6" stroke-linejoin="round"/>` +
    `<path d="M50 72 L50 96" stroke="${NAVY_EDGE}" stroke-width="1.6" stroke-linecap="round"/>` +
    `<path d="M40 64 C32 72 24 82 22 94 M45 65 C42 76 38 86 37 96 M55 65 C58 76 62 86 63 96 M60 64 C68 72 76 82 78 94" fill="none" stroke="${PLEAT}" stroke-width="1.4" stroke-linecap="round"/>`,
);

/** The keikogi from the shoulders to the waist, its collar crossed, and the hakama's ties over it. */
export const AIKI_GI = svg(
  `<path d="M33 47 Q35 43.5 42 43 L58 43 Q65 43.5 67 47 L66 64 L34 64 Z" fill="${GI}" stroke="${GI_EDGE}" stroke-width="1.4" stroke-linejoin="round"/>` +
    `<path d="M44.5 43.5 L50 51 L55.5 43.5 Z" fill="${SKIN_SHADE}"/>` +
    `<path d="M44 43.5 L55 59" stroke="${GI_EDGE}" stroke-width="4.6" stroke-linecap="round"/><path d="M44 43.5 L55 59" stroke="${GI_SHADE}" stroke-width="2.6" stroke-linecap="round"/>` +
    `<path d="M56 43.5 L41 63" stroke="${GI_EDGE}" stroke-width="5" stroke-linecap="round"/><path d="M56 43.5 L41 63" stroke="${GI}" stroke-width="3" stroke-linecap="round"/>` +
    `<path d="M33.5 59.5 Q50 61.5 66.5 59.5 L66.8 65 Q50 67 33.2 65 Z" fill="${NAVY}" stroke="${NAVY_EDGE}" stroke-width="1.2" stroke-linejoin="round"/>` +
    `<path d="M34 62.3 Q50 64.3 66 62.3" fill="none" stroke="${PLEAT}" stroke-width="1"/>` +
    `<path d="M46 62.5 Q50 59.5 54 62.5 Q50 65.5 46 62.5 Z" fill="${PLEAT}" stroke="${NAVY_EDGE}" stroke-width="0.8"/>`,
);

/** An arm hanging from its shoulder (`side` 0 its left, 1 its right): a wide sleeve, the forearm, a hand. */
export function aikiArm(side: 0 | 1): string {
  const [x, y] = AIKI_SHOULDERS[side];
  const o = side === 0 ? -1 : 1; // the sleeve's open side flares outward
  return svg(
    `<path d="M${x - 5.5} ${y - 2} Q${x} ${y - 4.5} ${x + 5.5} ${y - 2} L${x + 6 + o * 1.5} ${y + 14} Q${x} ${y + 17} ${x - 6 + o * 1.5} ${y + 14} Z" fill="${GI}" stroke="${GI_EDGE}" stroke-width="1.4" stroke-linejoin="round"/>` +
      `<path d="M${x - 3.5 + o * 1.5} ${y + 3} L${x - 4 + o * 1.5} ${y + 13}" stroke="${GI_SHADE}" stroke-width="1.4" stroke-linecap="round"/>` +
      `<rect x="${x - 2.6 + o}" y="${y + 14.5}" width="5.2" height="6.5" rx="2.4" fill="${SKIN}"/>` +
      `<circle cx="${x + o}" cy="${y + 23}" r="4" fill="${SKIN}" stroke="${SKIN_SHADE}" stroke-width="0.9"/>`,
  );
}

/** The head with its ears and hair, `hair` its colour; the face goes on it. */
export function aikiHead(hair: string): string {
  return svg(
    `<circle cx="29.5" cy="30" r="4.5" fill="${SKIN}" stroke="${SKIN_SHADE}" stroke-width="1"/><circle cx="70.5" cy="30" r="4.5" fill="${SKIN}" stroke="${SKIN_SHADE}" stroke-width="1"/>` +
      `<circle cx="50" cy="28" r="20.5" fill="${SKIN}" stroke="${SKIN_SHADE}" stroke-width="1"/>` +
      `<path d="M29.6 27 C29 14 37 6.5 50 6.5 C63 6.5 71 14 70.4 27 C68 22 66 18.5 63 17 C58 20 49 21 41 19 C38 21 34 23.5 29.6 27 Z" fill="${hair}"/>`,
  );
}
