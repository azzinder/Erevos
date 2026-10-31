// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { hardenSlot, isSlot, ITER, loadLockConfig, SamePasswordError, sealSlot, trySlot, unusedSlot, type Slot } from './config';
import { armPlaceReminders } from '../lib/myself';
import { keepPlace, keptPlaces, prepareKeepEntries } from './hidden-keep';
import { prepareRingEntries } from './hidden-ring';
import { prepareDoors } from './doors';
import { prepareWatchEntries, unwatchPocket } from './hidden-watch';
import { prepareQueueEntries } from './queues-data';
import { currentSpace, newSpaceKey } from './keys';
import { changeSlots, clearSlot, fillSlots, getSlot, setSlot, SLOTS, type SlotStore } from './slots';
import { hiddenHolder, POCKETS } from './sealed-file';
import { EMPTY_SPACE, prepareHiddenEntries, saveHiddenData } from './space-data';
import { assertNotLockedOut, LockedOutError, prepareTries, recordRightPassword, recordWrongPassword, SEARCH_TRIES } from './tries';

// Hidden chats: inside every space, chats that open only with their own PIN, built like the
// second password (config.ts). Every space has POCKETS of them (sealed-file.ts), each with its own
// PIN: a password slot per space and pocket in the keystore entry 'erevos.hidden-lock' (the
// first pocket) or 'erevos.hidden-lock.<p>' (slots.ts: at least SLOTS, the unused ones random),
// each sealing the key of those hidden chats. Their relay, queue and contacts are kept like a
// space's (space-data.ts), in their own entry sealed with that key. Every space has all its pockets
// from the first start, set or not, and opening checks every pocket of the space whatever the PIN,
// so neither the keystore, nor the time it takes, nor the app shows whether, or how many, hidden
// chats a space has. Nor can the app tell which pockets are free: a new one is set in the pocket
// its owner names, and whatever was there before cannot be opened any more.
//
// They open with their PIN in the home screen's search (searchHidden), and a chat of the space
// can move into them (lock/move-chat.ts).
//
// A PIN's slot is a password slot, with Argon2id (config.ts): one from before it gets it, as
// every pocket's of every space does at once, before any PIN is tried or set (hardenPockets).
//
// Hidden chats have their own relay queue. While they are closed nothing reads it, and messages to
// them wait on the relay, so they never show among the other chats. Those that ask for it say
// that a message came, from the queue kept with their space (hidden-watch.ts). Those whose switch
// says they receive while closed have their key kept with their space instead (hidden-keep.ts),
// and are read as the space's chats are (lib/place-receiver.ts): new ones start so.

/** Hidden chats, open: their key, and which of the space's pockets they are. */
export type HiddenPlace = { key: Uint8Array; pocket: number };

const stores: SlotStore<Slot>[] = Array.from({ length: POCKETS }, (_, pocket) => ({
  key: pocket ? `erevos.hidden-lock.${pocket}` : 'erevos.hidden-lock',
  fake: () => unusedSlot(ITER),
  valid: isSlot,
}));

let hardening: Promise<void> | null = null;

// Gives every pocket's slot from before Argon2id the one it becomes, in every space.
function hardenPockets(): Promise<void> {
  hardening ??= (async () => {
    for (const store of stores) await changeSlots(store, hardenSlot);
  })().finally(() => {
    hardening = null;
  });
  return hardening;
}

/** Every space up to `count` (and SLOTS) has a slot and an entry for each pocket, used or not. */
export async function prepareHidden(count = SLOTS): Promise<void> {
  for (const store of stores) await fillSlots(store, count);
  await hardenPockets();
  await prepareHiddenEntries(count);
  await prepareWatchEntries(count);
  await prepareDoors(count);
  await prepareRingEntries(count);
  await prepareKeepEntries(count);
  await prepareQueueEntries(count);
  await prepareTries();
}

/** Tries `password` on every pocket of the space, all of them every time, so it takes as long whatever opens. */
async function tryPockets(space: number, password: string): Promise<HiddenPlace | null> {
  await hardenPockets();
  let found: HiddenPlace | null = null;
  for (let pocket = 0; pocket < POCKETS; pocket++) {
    const key = await trySlot(await getSlot(stores[pocket], space), password);
    if (key && !found) found = { key, pocket };
  }
  return found;
}

/** The space's hidden chats `password` opens, or null. Throws LockedOutError while it must wait. */
export async function openHidden(space: number, password: string, now = Date.now()): Promise<HiddenPlace | null> {
  await assertNotLockedOut(now);
  const place = await tryPockets(space, password);
  if (place) await recordRightPassword();
  else await recordWrongPassword(now);
  return place;
}

/** Shortest text a search is tried as a PIN of hidden chats. */
export const MIN_PIN = 4;

/**
 * A search on the home screen, tried as a PIN of the space's hidden chats: those it opens, or null.
 * It always takes the time a check takes, whatever is typed, and its wrong tries are counted apart
 * from the lock screen's: while they make it wait, it opens nothing and says nothing, as a search.
 */
export async function searchHidden(space: number, text: string, now = Date.now()): Promise<HiddenPlace | null> {
  if (text.length < MIN_PIN) return null;
  try {
    await assertNotLockedOut(now, SEARCH_TRIES);
  } catch (error) {
    if (error instanceof LockedOutError) return null;
    throw error;
  }
  const place = await tryPockets(space, text);
  if (place) await recordRightPassword(SEARCH_TRIES);
  else await recordWrongPassword(now, SEARCH_TRIES);
  return place;
}

// Sets the PIN of the hidden chats in a space's `pocket`. With `key` (they are open) they stay as
// they are and only the PIN changes. Without it they start empty, and whatever was in that pocket
// before cannot be opened any more; they receive while closed (hidden-keep.ts), as new ones do,
// once the space is open. The PIN must open nothing else: not the space, nor other hidden chats
// of it (SamePasswordError).
export async function setHiddenPassword(space: number, pocket: number, password: string, key: Uint8Array | null, now = Date.now()): Promise<Uint8Array> {
  await assertNotLockedOut(now);
  const own = (await loadLockConfig()).slots[space];
  if (own && (await trySlot(own, password))) throw new SamePasswordError();
  const other = await tryPockets(space, password);
  if (other && other.pocket !== pocket) throw new SamePasswordError();
  const hiddenKey = key ?? newSpaceKey();
  // What was there before reminds of nothing more: found while its key still opens it.
  const open = key ? null : openSpace(space);
  if (open) await forgetPocketReminders(space, open, pocket).catch(() => undefined);
  await setSlot(stores[pocket], space, await sealSlot(password, hiddenKey, ITER));
  if (!key) {
    await saveHiddenData(space, pocket, hiddenKey, EMPTY_SPACE);
    // What was there before tells of no more messages.
    if (open) await unwatchPocket(space, open, pocket, null).catch(() => undefined);
    if (open) await keepPlace(space, open, pocket, hiddenKey).catch(() => undefined);
  }
  return hiddenKey;
}

/**
 * Forgets the reminders the phone keeps for the hidden chats in `pocket`, as they stop opening:
 * the phone keeps them only while the place receives closed, so its key is kept then (hidden-keep.ts).
 */
async function forgetPocketReminders(space: number, open: Uint8Array, pocket: number): Promise<void> {
  const kept = (await keptPlaces(space, open)).find((place) => place.pocket === pocket);
  if (kept) await armPlaceReminders({ holder: hiddenHolder(pocket), space, key: kept.key }, false);
}

/** The key of `space` when it is the one open, else null. */
function openSpace(space: number): Uint8Array | null {
  try {
    const open = currentSpace();
    return open.space === space ? open.key : null;
  } catch {
    return null;
  }
}

/** Makes the hidden chats in a space's `pocket` stop opening. They stay on the phone, and nothing opens them. */
export async function removeHiddenPassword(space: number, pocket: number): Promise<void> {
  await hardenPockets();
  const open = openSpace(space);
  if (open) await forgetPocketReminders(space, open, pocket).catch(() => undefined);
  await clearSlot(stores[pocket], space);
  if (open) await unwatchPocket(space, open, pocket, null).catch(() => undefined);
  if (open) await keepPlace(space, open, pocket, null).catch(() => undefined);
}
