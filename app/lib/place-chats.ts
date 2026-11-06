// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { History } from '../lock/history';
import { placeQueues } from '../lock/queues-data';
import { hiddenHolder } from '../lock/sealed-file';
import { E2E } from './e2e';
import { sweepPieces, type PiecePlace } from './nostr-pieces';
import type { SpaceChats } from './space-chats';
import { VoiceAssembler } from './voice';
import { placeSeenKey, shownAt } from './last-seen';
import { loadHiddenData, updateHiddenData } from '../lock/space-data';

// A hidden place's chats, opened once while they are open or receive while closed
// (lib/place-receiver.ts): its account and contacts, its messages and the voice messages still
// coming in parts, the same for the chat screen, the receiver and a chat moved into it, as the
// space's are (lib/space-chats.ts): two copies of a conversation's keys would each move on without
// the other. They are let go of once nothing holds them: as their chats close, unless they
// receive, and all of them when the space closes, so a place that does not receive leaves nothing
// in memory once closed. What joins them as they open, the place's own links to its other devices
// (lib/devices.ts), lives as long as they do.

// `ready`: the same once open, for what must know at once (lib/chat-notices.ts).
type Opened = { key: Uint8Array; chats: Promise<SpaceChats>; ready?: SpaceChats };

const opened = new Map<string, Opened>();
const at = (space: number, pocket: number) => `${space}.${pocket}`;

const sameKey = (a: Uint8Array, b: Uint8Array) => a.length === b.length && a.every((byte, i) => byte === b[i]);

// What joins a place's chats as they open, before anything uses them: its links to the place's
// other devices (lib/devices.ts), which registers itself here so this file need not know it.
const joiners: ((chats: SpaceChats, space: number, pocket: number, key: Uint8Array) => Promise<void>)[] = [];

/** Has `join` called each time a place's chats open, before they are handed out. */
export function joinPlaceChats(join: (chats: SpaceChats, space: number, pocket: number, key: Uint8Array) => Promise<void>): void {
  joiners.push(join);
}

/** The chats of the hidden place in `pocket` of `space`, open with `key`, opened the first time they are asked for. */
export function placeChats(space: number, pocket: number, key: Uint8Array): Promise<SpaceChats> {
  const was = opened.get(at(space, pocket));
  if (was && sameKey(was.key, key)) return was.chats;
  const chats = (async () => {
    const history = await History.open(hiddenHolder(pocket), space, key);
    const e2e = await E2E.open(hiddenHolder(pocket), space, key);
    // When their queue was made, as the place says it, before anything is sealed.
    const kept = await placeQueues(space, pocket, key).load();
    if (kept.moved > 0) e2e.setQueueAge(kept.moved, kept.now?.queue.senderHex);
    if (kept.now) e2e.setLinkOwn(!kept.link);
    // Whether its contacts are told when the place was last open, and it is shown theirs: its own
    // setting and its own time, never its space's (lib/last-seen.ts).
    const lastSeen = (await loadHiddenData(space, pocket, key).catch(() => null))?.lastSeen ?? true;
    e2e.setLastSeen({ on: lastSeen, at: () => shownAt(placeSeenKey(space, pocket)) });
    const pieces: PiecePlace = { holder: hiddenHolder(pocket), space, key: key.slice() };
    // What waited too long among the pieces of photos it keeps goes.
    void sweepPieces(pieces).catch(() => undefined);
    const made = { e2e, history, voiceParts: new VoiceAssembler(), pieces };
    // The chats still open without what could not join them.
    for (const join of joiners) await join(made, space, pocket, key.slice()).catch(() => undefined);
    return made;
  })();
  opened.set(at(space, pocket), { key: key.slice(), chats });
  chats.then(
    (made) => {
      const entry = opened.get(at(space, pocket));
      if (entry?.chats === chats) entry.ready = made;
    },
    // Tried again the next time they are asked for.
    () => {
      if (opened.get(at(space, pocket))?.chats === chats) opened.delete(at(space, pocket));
    },
  );
  return chats;
}

/** The chats of the hidden place in `pocket` of `space` if they are open already, or null. */
export function placeChatsNow(space: number, pocket: number): SpaceChats | null {
  return opened.get(at(space, pocket))?.ready ?? null;
}

/** Turns "last seen" on or off for the hidden place in `pocket` of `space`, open with `key`: kept, and its chats tell and show it, or no longer. */
export async function setPlaceLastSeen(space: number, pocket: number, key: Uint8Array, on: boolean): Promise<void> {
  await updateHiddenData(space, pocket, key, { lastSeen: on });
  const was = opened.get(at(space, pocket));
  if (was && sameKey(was.key, key)) (await was.chats).e2e.setLastSeen({ on, at: () => shownAt(placeSeenKey(space, pocket)) });
}

const forgets = new Set<(space?: number, pocket?: number) => void>();

/** Has `forget` called each time a place's chats are let go of, or every place's (no `space`), so what is opened with them goes too (lib/place-groups.ts). */
export function onForgetPlaceChats(forget: (space?: number, pocket?: number) => void): void {
  forgets.add(forget);
}

/** Lets go of a place's chats, or of every place's (the space closes), so nothing of them stays in memory. */
export function forgetPlaceChats(space?: number, pocket?: number): void {
  if (space === undefined || pocket === undefined) opened.clear();
  else opened.delete(at(space, pocket));
  forgets.forEach((forget) => forget(space, pocket));
}
