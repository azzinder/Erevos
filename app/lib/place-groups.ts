// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { loadGroupData, saveGroupData } from '../lock/group-data';
import { loadPublicGroupData, savePublicGroupData } from '../lock/public-group-data';
import { placeQueues } from '../lock/queues-data';
import { hiddenHolder } from '../lock/sealed-file';
import { loadHiddenData } from '../lock/space-data';
import { CALL_LINE } from './calls';
import { canGroup } from './core';
import type { GroupCallSignal } from './group-call-signal';
import type { GroupSignal } from './group-signal';
import { onForgetPlaceChats, placeChats } from './place-chats';
import type { PublicGroups } from './public-groups';
import type { MoveGroups } from './queue-move';
import { groupCalls, groupSettings, groupTransport, openGroups, type GroupsAt } from './space-groups';

// A hidden place's groups (lib/groups.ts), as the space's are (lib/space-groups.ts): kept with the
// place, encrypted with its key, and opened once while its chats are (lib/place-chats.ts), the same
// for its chat screen and its receiver (lib/place-receiver.ts), let go of with them. Their members
// are the place's contacts. What goes in them goes through the place's relay only, never to phones
// nearby, and comes to queues of their own there, which the place's moves make and read
// (lib/queue-move.ts), as the space's do. None is public. Their calls ring while the place's chats
// are open, which take them (answerPlaceGroupCalls); closed, one started is kept as missed.

/** A hidden place's groups, and how what comes for them is taken. */
export type PlaceGroupsAt = GroupsAt & {
  /** A group message from one of the place's relay queues. Says whether it was one. */
  take(packet: Uint8Array): Promise<boolean>;
  /** A group signal from a contact's chat in the place. */
  signal(identity: string, signal: GroupSignal, request: boolean): Promise<void>;
  /** Sends again what the relay did not take, and makes keys new in the groups where they are due. */
  flush(): Promise<void>;
  /** What the place's moves need of them. */
  moves: MoveGroups;
};

// `ready`: its groups once open, for what must know at once (lib/chat-notices.ts).
type Opened = { key: Uint8Array; at: PlaceGroupsAt; ready: () => PublicGroups | null; close: () => void };

const opened = new Map<string, Opened>();
const at = (space: number, pocket: number) => `${space}.${pocket}`;
const sameKey = (a: Uint8Array, b: Uint8Array) => a.length === b.length && a.every((byte, i) => byte === b[i]);

const messageListeners = new Set<(space: number, pocket: number, group: string, named?: boolean) => void>();
type CallTaker = (group: string, from: string, signal: GroupCallSignal) => void;
const callTakers = new Map<string, CallTaker>();

/** Calls `listener` with the place and the group each time a member's message comes in a hidden place's group, and whether it names this phone with @. Returns how to stop. */
export function onPlaceGroupMessage(listener: (space: number, pocket: number, group: string, named?: boolean) => void): () => void {
  messageListeners.add(listener);
  return () => {
    messageListeners.delete(listener);
  };
}

/** Has `take` take each group call signal in the place in `pocket` of `space`, while its chats are open. Returns how to stop. */
export function answerPlaceGroupCalls(space: number, pocket: number, take: CallTaker): () => void {
  callTakers.set(at(space, pocket), take);
  return () => {
    if (callTakers.get(at(space, pocket)) === take) callTakers.delete(at(space, pocket));
  };
}

/** The groups of the hidden place in `pocket` of `space`, open with `key`, opened the first time they are asked for. */
export function placeGroupsAt(space: number, pocket: number, key: Uint8Array): PlaceGroupsAt {
  const was = opened.get(at(space, pocket));
  if (was && sameKey(was.key, key)) return was.at;
  const holder = hiddenHolder(pocket);
  const kept = key.slice();
  const chats = () => placeChats(space, pocket, kept);
  const settings = async () => groupSettings(await loadHiddenData(space, pocket, kept), placeQueues(space, pocket, kept));
  let made: Promise<PublicGroups> | null = null;
  let ready: PublicGroups | null = null;
  const groups = (): Promise<PublicGroups> => {
    if (made) return made;
    const opening = (async () => {
      const [data, pub] = await Promise.all([loadGroupData(space, kept, holder), loadPublicGroupData(space, kept, holder)]);
      const place = openGroups({
        data,
        save: (next) => saveGroupData(space, kept, next, holder),
        pub,
        savePub: (next) => savePublicGroupData(space, kept, next, holder),
        settings,
        chats,
      });
      place.onCall((group, from, signal) => {
        const take = callTakers.get(at(space, pocket));
        if (take) take(group, from, signal);
        else if (signal.kind === 'start') void place.line(group, `${CALL_LINE}Missed ${signal.video ? 'group video call' : 'group call'}`).catch(() => undefined);
      });
      place.onMessage((group, named) => messageListeners.forEach((listener) => listener(space, pocket, group, named)));
      return place;
    })();
    made = opening;
    opening.then(
      (place) => {
        if (made === opening) ready = place;
      },
      // Tried again the next time they are asked for.
      () => {
        if (made === opening) made = null;
      },
    );
    return opening;
  };
  const transport = groupTransport(settings, chats, true);
  const placeAt: PlaceGroupsAt = {
    groups,
    transport,
    calls: groupCalls(groups, transport, settings, chats),
    relay: async () => (await settings()).own,
    chats,
    hidden: true,
    take: async (packet) => (canGroup() ? (await groups()).receive(packet, transport) : false),
    signal: async (identity, signal, request) => {
      if (canGroup()) await (await groups()).signal(identity, signal, request, transport);
    },
    flush: async () => {
      if (!canGroup() || !made) return;
      const place = await groups();
      await place.flush(transport);
      await place.renewKeys(transport);
    },
    moves: {
      renewAgain: async (kind, members) => {
        if (canGroup()) await (await groups()).renewAgain(kind, members);
      },
      named: async () => (canGroup() ? (await groups()).ownSenders() : new Set<string>()),
      kinds: ['group'],
    },
  };
  // Let go of, they send nothing more, as their chats (lib/groups.ts close).
  const close = () => void made?.then((place) => place.close(), () => undefined);
  opened.set(at(space, pocket), { key: kept, at: placeAt, ready: () => ready, close });
  return placeAt;
}

/** The groups of the hidden place in `pocket` of `space` if they are open already, or null. */
export function placeGroupsNow(space: number, pocket: number): PublicGroups | null {
  return opened.get(at(space, pocket))?.ready() ?? null;
}

/** Lets go of a place's groups, or of every place's, as their chats are let go of (lib/place-chats.ts). */
export function forgetPlaceGroups(space?: number, pocket?: number): void {
  const gone = space === undefined || pocket === undefined ? [...opened.values()] : [opened.get(at(space, pocket))];
  for (const was of gone) was?.close();
  if (space === undefined || pocket === undefined) opened.clear();
  else opened.delete(at(space, pocket));
}

onForgetPlaceChats(forgetPlaceGroups);
