import { loadGroupData, saveGroupData } from '../lock/group-data';
import { currentSpace } from '../lock/keys';
import { loadCurrentSpaceData } from '../lock/space-data';
import { soon } from './call';
import { canGroup, canRelaySeal } from './core';
import { toBase64Url } from './e2e';
import type { GroupCallSignal } from './group-call-signal';
import type { GroupCallPlace } from './group-calls';
import type { GroupSignal } from './group-signal';
import { Groups, type GroupTransport } from './groups';
import { nearby } from './nearby';
import { callRelay, fromHex, relayKey, sendMessage, toHex } from './relay';
import { contactTarget, relayFor, spaceChats } from './space-chats';
import { t } from './i18n';

// The open space's group chats (lib/groups.ts), opened once while the space is, as its chats are
// (lib/space-chats.ts): the chat screen, the group screens and the receiver use the same ones.
// Their messages go to each member's phone nearby when it is (lib/nearby.ts), as on the same Wi-Fi
// with no internet, and through the space's relay settings, read when sent.

let opened: { of: object; groups: Promise<Groups> } | null = null;

const callListeners = new Set<(group: string, from: string, signal: GroupCallSignal) => void>();
const messageListeners = new Set<() => void>();

/** Calls `listener` each time a member's message comes in one of the open space's groups. Returns how to stop. */
export function onSpaceGroupMessage(listener: () => void): () => void {
  messageListeners.add(listener);
  return () => {
    messageListeners.delete(listener);
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

async function settings() {
  const data = await loadCurrentSpaceData();
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
    relayKey: ownKey?.url === url ? ownKey.key : '',
  };
}

/** The open space's groups, opened the first time they are asked for. */
export function spaceGroups(): Promise<Groups> {
  const current = currentSpace();
  if (opened?.of !== current) {
    const groups = (async () => {
      const data = await loadGroupData(current.space, current.key);
      const me = async () => {
        const [{ e2e }, place] = await Promise.all([spaceChats(), settings()]);
        return { id: toHex(e2e.identity), sender: place.senderHex, relay: place.own.url, relayKey: place.relayKey };
      };
      const made = new Groups(data, (next) => saveGroupData(current.space, current.key, next), me);
      made.onCall((group, from, signal) => callListeners.forEach((listener) => listener(group, from, signal)));
      made.onMessage(() => messageListeners.forEach((listener) => listener()));
      return made;
    })();
    opened = { of: current, groups };
    groups.catch(() => {
      if (opened?.groups === groups) opened = null;
    });
  }
  return opened.groups;
}

/** Lets go of the space's groups when it closes. */
export function forgetSpaceGroups(): void {
  opened = null;
}

/** How the open space's group messages leave the phone. */
export const spaceGroupTransport: GroupTransport = {
  async post(to, packet) {
    const place = await settings().catch(() => null);
    const relay = place ? () => sendMessage(contactTarget(place.sends, to), fromHex(to.sender), packet) : null;
    await nearby.deliver(to.id, [packet], relay);
  },
  async signal(identity, signal) {
    const { e2e } = await spaceChats();
    const place = await settings().catch(() => null);
    const at = place ? { relay: place.own.url, relayKey: place.relayKey } : { relay: '', relayKey: '' };
    const sealed = await e2e.seal(identity, '', place?.senderHex ?? '', { group: signal, at });
    const relay =
      place && sealed.sender
        ? async () => {
            const to = contactTarget(place.sends, sealed);
            if (sealed.first) {
              await sendMessage(to, fromHex(sealed.sender), sealed.first);
              await e2e.firstSent(identity);
            }
            await sendMessage(to, fromHex(sealed.sender), sealed.packet);
          }
        : null;
    await nearby.deliver(identity, sealed.first ? [sealed.first, sealed.packet] : [sealed.packet], relay);
  },
};

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

/** Sends again what the relay did not take. */
export async function flushGroups(): Promise<void> {
  if (!canGroup() || !opened) return;
  await (await spaceGroups()).flush(spaceGroupTransport);
}

/** Group calls in the open space's groups (lib/group-calls.ts). */
export const spaceGroupCalls: GroupCallPlace = {
  async send(group, signal) {
    await (await spaceGroups()).call(group, signal, spaceGroupTransport);
  },
  async callRelay() {
    const { own } = await settings();
    return soon(callRelay(own), 4000, null);
  },
  async me() {
    const { e2e } = await spaceChats();
    return toHex(e2e.identity);
  },
  line(group, text) {
    void spaceGroups()
      .then((groups) => groups.line(group, text))
      .catch(() => undefined);
  },
};
