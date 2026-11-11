// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { checkedStars, sameStar, withStar, type Star, type StarId } from '../lib/stars';

import { currentSpace } from './keys';
import { sealedFile, type Holder } from './sealed-file';

// The messages starred in the chats on Matrix, XMPP and Nostr and in the SMS (lib/stars.ts), each
// space's and each of its hidden places' own: kept in FILE, one sealed value for each of them
// (sealed-file.ts), in blocks of BLOCK bytes and the pages beyond. A hidden place's accounts star
// into the hidden place, so its stars show only in its hidden chats, and nothing tells they are
// there. They go with the rest of the phone into a backup (backup.ts), sealed as they are, and are
// never passed on to the account's other devices: each device stars its own.

/** Whose stars: a space's or one of its hidden places', as its key opens it. */
export type StarPlace = { holder: Holder; space: number; key: Uint8Array };

type StarsData = { stars: Star[] };

export const FILE = 'erevos-stars';
const BLOCK = 16 * 1024;

const store = sealedFile({ name: FILE, empty: { stars: [] } as StarsData, checked: (value) => ({ stars: checkedStars((value as { stars?: unknown } | null)?.stars) }), block: BLOCK });

const placeName = ({ holder, space }: Pick<StarPlace, 'holder' | 'space'>) => `${holder}/${space}`;

// Changes to a place's stars run one after another, each on what the one before left.
const changes = new Map<string, Promise<unknown>>();

function change<T>(place: StarPlace, run: () => Promise<T>): Promise<T> {
  const name = placeName(place);
  const next = (changes.get(name) ?? Promise.resolve()).catch(() => undefined).then(run);
  changes.set(name, next);
  return next;
}

// Told of each change, by the place's name, so the screens that show its stars follow.
const listeners = new Set<(place: string) => void>();

/** Told when a place's stars change: `place` is its holder and space, as "space/0". */
export function onStarsChange(listener: (place: string) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The open space's place, which the SMS and the space's own accounts star into; null while none is open. */
export function spaceStarPlace(): StarPlace | null {
  try {
    const { space, key } = currentSpace();
    return { holder: 'space', space, key };
  } catch {
    return null;
  }
}

/** The name onStarsChange tells a place by. */
export const starPlaceName = placeName;

/** A place's stars, the ones starred first first. */
export async function loadStars({ holder, space, key }: StarPlace): Promise<Star[]> {
  return (await store.load(holder, space, key)).stars;
}

/** Stars a message, or takes its star off (`on` false). Returns the place's stars after. */
export function starMessage(place: StarPlace, star: Star, on: boolean): Promise<Star[]> {
  return change(place, async () => {
    const { holder, space, key } = place;
    const { stars } = await store.load(holder, space, key);
    const next = withStar(stars, star, on);
    await store.save(holder, space, key, { stars: next });
    listeners.forEach((listener) => listener(placeName(place)));
    return next;
  });
}

/** Takes the stars off these messages (gone, or their chat left); nothing is written when none of them is starred. */
export function forgetStars(place: StarPlace, gone: StarId[]): Promise<void> {
  return change(place, async () => {
    if (gone.length === 0) return;
    const { holder, space, key } = place;
    const { stars } = await store.load(holder, space, key);
    const kept = stars.filter((s) => !gone.some((g) => sameStar(g, s)));
    if (kept.length === stars.length) return;
    await store.save(holder, space, key, { stars: kept });
    listeners.forEach((listener) => listener(placeName(place)));
  });
}
