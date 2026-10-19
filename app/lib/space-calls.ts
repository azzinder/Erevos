import { loadCurrentSpaceData } from '../lock/space-data';
import { soon } from './call';
import { callLineMessage, CONTACT_PREFIX, type CallPlace } from './calls';
import { callRelay, fromHex, relayKey, sendMessage } from './relay';
import { canRelaySeal } from './core';
import { toBase64Url } from './e2e';
import { nearby } from './nearby';
import { announceReceived } from './receiver';
import { contactTarget, relayFor, spaceChats } from './space-chats';
import type { Message } from '../lock/history';
import { t } from './i18n';

// Calls in the open space's chats (lib/calls.ts): their signals go through the space's own
// encryption, to the contact's phone nearby when it is (lib/nearby.ts), as on the same Wi-Fi with
// no internet, and through the relay as its settings say, read when sent. Their lines are kept in
// its history. The
// chat screen, while open, shows a line as it comes (onSpaceCallLine); the home screen hears of
// it as of a message.

const lineListeners = new Set<(message: Message) => void>();

/** Calls `listener` with each call line kept in the space's history. Returns how to stop. */
export function onSpaceCallLine(listener: (message: Message) => void): () => void {
  lineListeners.add(listener);
  return () => {
    lineListeners.delete(listener);
  };
}

// How long a call waits on the relay before going on without it, as on a Wi-Fi with no internet,
// where reaching it can take long to fail, milliseconds.
const RELAY_WAIT = 4000;

// Our relay's key, said with every message so contacts on other relays reach us: asked once.
let ownKey: { url: string; key: string } | null = null;

async function where(own: { url: string; token?: string }) {
  if (ownKey?.url !== own.url && canRelaySeal()) {
    const key = await relayKey(own).catch(() => null);
    if (key) ownKey = { url: own.url, key: toBase64Url(key) };
  }
  return { relay: own.url, relayKey: ownKey?.url === own.url ? ownKey.key : '' };
}

async function settings() {
  const data = await loadCurrentSpaceData();
  const url = data.url.trim();
  if (!url || !data.ownQueue) throw new Error(t('Calls are set up through the relay. Type its address in Relay first.'));
  const own = { url, token: data.token.trim() || undefined };
  return { own, sends: relayFor(url, data.token, data.via, data.viaToken) ?? own, senderHex: data.ownQueue.senderHex };
}

export const spaceCalls: CallPlace = {
  async send(identity, signal) {
    const { e2e } = await spaceChats();
    // No relay set: to a phone nearby only.
    const place = await settings().catch(() => null);
    const at = place ? await soon(where(place.own), RELAY_WAIT, { relay: place.own.url, relayKey: '' }) : { relay: '', relayKey: '' };
    const sealed = await e2e.seal(identity, '', place?.senderHex ?? '', { call: signal, at });
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
  async callRelay() {
    const { own } = await settings();
    return soon(callRelay(own), RELAY_WAIT, null);
  },
  line(peer, mine, text) {
    void spaceChats()
      .then(async ({ e2e, history }) => {
        const timer = e2e.contacts().find((contact) => `${CONTACT_PREFIX}${contact.identity}` === peer)?.timer ?? 0;
        const message = callLineMessage(peer, mine, text, timer);
        await history.add(message);
        lineListeners.forEach((listener) => listener(message));
        announceReceived();
      })
      .catch(() => {
        // Not kept: the call still happened.
      });
  },
  name(peer) {
    // Filled in by the call screen from the space's contacts (see spaceCallName).
    return spaceNames.get(peer) ?? t('contact {id}', { id: peer.slice(CONTACT_PREFIX.length, CONTACT_PREFIX.length + 8) });
  },
};

const spaceNames = new Map<string, string>();

/** Learns the names the space's chats give their contacts, for the call screen. */
export async function learnSpaceNames(): Promise<void> {
  const { e2e } = await spaceChats();
  spaceNames.clear();
  for (const contact of e2e.contacts()) if (contact.name) spaceNames.set(`${CONTACT_PREFIX}${contact.identity}`, contact.name);
}
