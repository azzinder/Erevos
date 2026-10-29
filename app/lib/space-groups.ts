import { loadGroupData, saveGroupData, type GroupData } from '../lock/group-data';
import { currentSpace } from '../lock/keys';
import { loadPublicGroupData, savePublicGroupData, type PublicData } from '../lock/public-group-data';
import { spaceQueues, type QueuesStore } from '../lock/queues-data';
import { loadCurrentSpaceData, type SpaceData } from '../lock/space-data';
import { soon } from './call';
import { canGroup, canRelaySeal } from './core';
import { toBase64Url } from './e2e';
import type { GroupCallSignal } from './group-call-signal';
import type { GroupCallPlace } from './group-calls';
import { groupContacts } from './group-contacts';
import type { GroupSignal } from './group-signal';
import type { GroupTransport } from './groups';
import { nearby } from './nearby';
import { relayDoors } from './public-doors';
import { PublicGroups } from './public-groups';
import { groupSenders, useForMoves } from './queue-move';
import { callRelay, fromHex, relayKey, sendMessage, toHex, type Relay } from './relay';
import { contactTarget, relayFor, sendSealed, spaceChats, type SpaceChats } from './space-chats';
import { t } from './i18n';

// The open space's group chats (lib/groups.ts), opened once while the space is, as its chats are
// (lib/space-chats.ts): the chat screen, the group screens and the receiver use the same ones.
// Their messages go to each member's phone nearby when it is (lib/nearby.ts), as on the same Wi-Fi
// with no internet, and through the space's relay settings, read when sent. Their photos, files and
// voice messages go through the space's relay only, straight (lib/group-media.ts). A member asked
// for its contact link is added to the space's own chats (lib/group-contacts.ts), never to hidden ones.
// The groups say a queue of their own as where this phone reads, and the public groups another
// (lib/queue-move.ts), never the one its contacts write to: the own queue, until those are made.
// A hidden place's groups are made the same way (lib/place-groups.ts), from its own settings.

/**
 * Where groups are kept and go from: the space's (spaceGroupsAt), or a hidden place's
 * (lib/place-groups.ts). The group screens take it from components/groups-at.tsx.
 */
export type GroupsAt = {
  /** The groups, opened the first time they are asked for. */
  groups(): Promise<PublicGroups>;
  /** How their messages leave the phone. */
  transport: GroupTransport;
  /** Their calls (lib/group-calls.ts). */
  calls: GroupCallPlace;
  /** Their relay, straight: their photos, files and voice messages go to it and come through it. */
  relay(): Promise<Relay>;
  /** The chats whose contacts they are with. */
  chats(): Promise<SpaceChats>;
  /** A hidden place's: they go through its relay only, never to phones nearby, and none is public. */
  hidden: boolean;
};

/** What groups go by: the relay, straight and as it sends, the own queue's sender id, the groups' queues, and the relay's key. */
export type GroupSettings = { own: Relay; sends: Relay; senderHex: string; groupHex: string; publicHex: string; relayKey: string };

let opened: { of: object; groups: Promise<PublicGroups> } | null = null;
// The same once open, for what cannot wait for them (publicMemberName).
let shown: PublicGroups | null = null;

const callListeners = new Set<(group: string, from: string, signal: GroupCallSignal) => void>();
const messageListeners = new Set<(group: string) => void>();
const goneListeners = new Set<(group: string) => void>();

/** Calls `listener` with the group each time a member's message comes in one of the open space's groups. Returns how to stop. */
export function onSpaceGroupMessage(listener: (group: string) => void): () => void {
  messageListeners.add(listener);
  return () => {
    messageListeners.delete(listener);
  };
}

/** Calls `listener` with the group each time a member of one of the open space's groups deletes for everyone a message not read yet. Returns how to stop. */
export function onSpaceGroupGone(listener: (group: string) => void): () => void {
  goneListeners.add(listener);
  return () => {
    goneListeners.delete(listener);
  };
}

/** Calls `listener` with each group call signal in the open space's groups. Returns how to stop. */
export function onSpaceGroupCall(listener: (group: string, from: string, signal: GroupCallSignal) => void): () => void {
  callListeners.add(listener);
  return () => {
    callListeners.delete(listener);
  };
}

// Our relay's key, said to groups so members on other relays reach us: asked once.
let ownKey: { url: string; key: string } | null = null;

/** What groups go by, for chats whose settings are `data` and whose queues `queues` keeps. Throws with no relay queue. */
export async function groupSettings(data: SpaceData, queues: QueuesStore): Promise<GroupSettings> {
  const url = data.url.trim();
  if (!url || !data.ownQueue) throw new Error(t('Groups go through the relay. Type its address in Relay first.'));
  const own = { url, token: data.token.trim() || undefined };
  if (ownKey?.url !== url && canRelaySeal()) {
    const key = await soon(relayKey(own).catch(() => null), 4000, null);
    if (key) ownKey = { url, key: toBase64Url(key) };
  }
  return {
    own,
    sends: relayFor(url, data.token, data.via, data.viaToken) ?? own,
    senderHex: data.ownQueue.senderHex,
    ...groupSenders(await queues.load(), data.ownQueue, url),
    relayKey: ownKey?.url === url ? ownKey.key : '',
  };
}

async function settings() {
  const current = currentSpace();
  return groupSettings(await loadCurrentSpaceData(), spaceQueues(current.space, current.key));
}

/** Groups kept as `data` and `pub` (saved by `save` and `savePub`), of the chats `chats` gives, going by `settings`. */
export function openGroups({ data, save, pub, savePub, settings, chats }: {
  data: GroupData;
  save: (next: GroupData) => Promise<void>;
  pub: PublicData;
  savePub: (next: PublicData) => Promise<void>;
  settings: () => Promise<GroupSettings>;
  chats: () => Promise<SpaceChats>;
}): PublicGroups {
  const meAt = (kind: 'groupHex' | 'publicHex') => async () => {
    const [{ e2e }, place] = await Promise.all([chats(), settings()]);
    return { id: toHex(e2e.identity), sender: place[kind], relay: place.own.url, relayKey: place.relayKey };
  };
  return new PublicGroups(data, save, meAt('groupHex'), pub, savePub, relayDoors(settings), meAt('publicHex'));
}

/** The open space's groups, opened the first time they are asked for. */
export function spaceGroups(): Promise<PublicGroups> {
  const current = currentSpace();
  if (opened?.of !== current) {
    const groups = (async () => {
      const [data, pub] = await Promise.all([loadGroupData(current.space, current.key), loadPublicGroupData(current.space, current.key)]);
      const made = openGroups({
        data,
        save: (next) => saveGroupData(current.space, current.key, next),
        pub,
        savePub: (next) => savePublicGroupData(current.space, current.key, next),
        settings,
        chats: spaceChats,
      });
      made.onCall((group, from, signal) => callListeners.forEach((listener) => listener(group, from, signal)));
      made.onMessage((group) => messageListeners.forEach((listener) => listener(group)));
      made.onGone((group) => goneListeners.forEach((listener) => listener(group)));
      if (opened?.of === current) shown = made;
      // A contact deleted here lets go of the asks for its contact link at once (lib/groups.ts contactRemoved).
      void spaceChats()
        .then(({ e2e }) => e2e.onContactRemoved((identity) => void made.contactRemoved(identity).catch(() => undefined)))
        .catch(() => undefined);
      return made;
    })();
    opened = { of: current, groups };
    groups.catch(() => {
      if (opened?.groups === groups) opened = null;
    });
  }
  return opened.groups;
}

// A move of the groups' queue, or the public groups', has each group say the new one (lib/queue-move.ts).
useForMoves({
  groups: {
    renewAgain: async (kind) => {
      if (canGroup()) await (await spaceGroups()).renewAgain(kind);
    },
    named: async () => (canGroup() ? (await spaceGroups()).ownSenders() : new Set<string>()),
  },
});

/** Lets go of the space's groups when it closes. */
export function forgetSpaceGroups(): void {
  shown = null;
  opened = null;
}

/** The open space's groups if they are open already, or null. */
export function spaceGroupsNow(): PublicGroups | null {
  return shown;
}

/** A member of one of the open space's public groups, by its key there, once the groups are open; null for anyone else. */
export function publicMemberName(key: string): string | null {
  return shown?.nameOf(key) ?? null;
}

/**
 * How group messages leave the phone, from the chats `chats` gives, going by `settings`, each saying
 * to the relay what it carries: also to the member's phone nearby when it is, unless `relayOnly`, as
 * a hidden place's go.
 */
export function groupTransport(settings: () => Promise<GroupSettings>, chats: () => Promise<SpaceChats>, relayOnly = false): GroupTransport {
  // Through the relay, or, but in a hidden place, nearby when there is none.
  const deliver = async (identity: string, packets: Uint8Array[], relay: (() => Promise<void>) | null): Promise<void> => {
    if (!relayOnly) await nearby.deliver(identity, packets, relay);
    else if (relay) await relay();
    else throw new Error(t('Groups go through the relay. Type its address in Relay first.'));
  };
  return {
    async post(to, packet, mark) {
      const place = await settings().catch(() => null);
      const relay = place ? () => sendMessage(contactTarget(place.sends, to), fromHex(to.sender), packet, mark) : null;
      await deliver(to.id, [packet], relay);
    },
    async signal(identity, signal) {
      const { e2e } = await chats();
      const place = await settings().catch(() => null);
      const at = place ? { relay: place.own.url, relayKey: place.relayKey } : { relay: '', relayKey: '' };
      const sealed = await e2e.seal(identity, '', place?.senderHex ?? '', { group: signal, at });
      // Asking for a key package, giving one, or a welcome: word between phones.
      const relay = place && sealed.sender ? () => sendSealed(place.sends, sealed, [sealed.packet], 'quiet', () => e2e.firstSent(identity)) : null;
      await e2e.copiesAfter(sealed.copies, deliver(identity, sealed.first ? [sealed.first, sealed.packet] : [sealed.packet], relay));
    },
    // The chats open at each call: lib/group-contacts.ts refuses those of an account other than the
    // one the groups asking are.
    contacts: groupContacts(
      async () => (await chats()).e2e,
      async () => {
        const place = await settings();
        return { senderHex: place.senderHex, relay: place.own.url, relayKey: place.relayKey };
      },
    ),
  };
}

/** How the open space's group messages leave the phone, each saying to the relay what it carries. */
export const spaceGroupTransport: GroupTransport = groupTransport(settings, spaceChats);

/** The space's relay, straight, not through its second relay: groups' files go to it and come through it. */
export async function groupRelay(): Promise<Relay> {
  return (await settings()).own;
}

/** A group message from the space's relay queue. Says whether it was one. */
export async function takeGroupPacket(packet: Uint8Array): Promise<boolean> {
  if (!canGroup()) return false;
  return (await spaceGroups()).receive(packet, spaceGroupTransport);
}

/** A group signal from a contact's chat in the space. */
export async function takeGroupSignal(identity: string, signal: GroupSignal, request: boolean): Promise<void> {
  if (!canGroup()) return;
  await (await spaceGroups()).signal(identity, signal, request, spaceGroupTransport);
}

/** Sends again what the relay did not take, and makes keys new in the groups where they are due. */
export async function flushGroups(): Promise<void> {
  if (!canGroup() || !opened) return;
  const groups = await spaceGroups();
  await groups.flush(spaceGroupTransport);
  await groups.renewKeys(spaceGroupTransport);
}

/** Group calls in the groups `groups` gives (lib/group-calls.ts), going by `settings`. */
export function groupCalls(groups: () => Promise<PublicGroups>, transport: GroupTransport, settings: () => Promise<GroupSettings>, chats: () => Promise<SpaceChats>): GroupCallPlace {
  return {
    async send(group, signal) {
      await (await groups()).call(group, signal, transport);
    },
    async callRelay() {
      const { own } = await settings();
      return soon(callRelay(own), 4000, null);
    },
    async me() {
      const { e2e } = await chats();
      return toHex(e2e.identity);
    },
    line(group, text) {
      void groups()
        .then((made) => made.line(group, text))
        .catch(() => undefined);
    },
    async names(group) {
      const [made, { e2e }] = await Promise.all([groups(), chats()]);
      return {
        group: made.list().find((g) => g.id === group)?.name ?? '',
        contacts: e2e.contacts().map((c) => ({ identity: c.identity, name: c.name })),
      };
    },
  };
}

/** Group calls in the open space's groups (lib/group-calls.ts). */
export const spaceGroupCalls: GroupCallPlace = groupCalls(spaceGroups, spaceGroupTransport, settings, spaceChats);

/** The open space's groups, where they go from, for the group screens (components/groups-at.tsx). */
export const spaceGroupsAt: GroupsAt = { groups: spaceGroups, transport: spaceGroupTransport, calls: spaceGroupCalls, relay: groupRelay, chats: spaceChats, hidden: false };
