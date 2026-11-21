// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { loadCurrentSpaceData } from '../lock/space-data';
import { smsPacketsReady, smsReady, smsStatus } from '../modules/erevos-sms';
import { canTor } from './core';
import { nearby } from './nearby';
import { nearbySettings } from './nearby-links';
import { nostrRelays, nostrStates, onNostrStates } from './nostr';
import { canLora, HAS_LINKS, HAS_RADIO, lora, savedRadio } from './radio';
import { onRelayHeard, relayHeard } from './relay';
import { spaceSmsLink } from './sms-relay';
import { spaceChats } from './space-chats';
import { torStatus } from './tor';
import type { WayId, WaysInput } from './ways';

// What the ways out of the open space are now (lib/ways.ts), read from each of them: for the Ways
// screen (app/ways.tsx) and its line on home (app/index.tsx).

// A colour of its own for each way, for a light and a dark look.
export const HUES: Record<WayId, [string, string]> = {
  relay: ['#3D78A8', '#7FB4E0'],
  nostr: ['#7A5BB5', '#B9A0E8'],
  nearby: ['#2F8A63', '#72C7A0'],
  lora: ['#9A7A12', '#D9B85A'],
  sms: ['#B5652A', '#E4A06A'],
  tor: ['#5E6B66', '#A6B3AD'],
};

export const NO_INPUT: WaysInput = { relay: { url: '', answered: 0, failed: 0, spare: '', via: false }, nostr: null, nearby: null, lora: null, sms: null, tor: null };

// What the screen reads now of each way, and how many of the space's own messages wait.
export async function readWays(): Promise<{ input: WaysInput; waiting: number }> {
  const data = await loadCurrentSpaceData();
  const heard = data.url ? relayHeard(data.url) : { answered: 0, failed: 0 };
  const input: WaysInput = { ...NO_INPUT, relay: { url: data.url, ...heard, spare: data.spare.url, via: !!data.via.trim() } };
  // The relays the space reads on now, and those of them that answer.
  const relays = nostrRelays() ?? [];
  const states = nostrStates();
  input.nostr = { on: data.nostr.on && relays.length > 0, relays: relays.length, reading: relays.filter((url) => states.get(url)?.read?.reading).length };
  if (HAS_LINKS) {
    const kept = await nearbySettings();
    input.nearby = { phones: nearby.count(), bluetooth: HAS_RADIO && kept.on, lan: kept.on && kept.lan, direct: HAS_RADIO && kept.on && kept.direct, carried: nearby.carriedCount().others };
  }
  if (canLora()) {
    const radio = await savedRadio().catch(() => null);
    const state = lora.state();
    input.lora = { set: radio !== null, status: state.status, name: state.name || radio?.name || '' };
  }
  if (smsReady() && smsPacketsReady()) {
    const app = !!smsStatus()?.isDefault;
    let contacts = 0;
    if (app) {
      const [link, chats] = await Promise.all([spaceSmsLink(), spaceChats()]);
      contacts = chats.e2e.phones().filter(({ identity, phone }) => !!phone && link.smsWayOn(identity)).length;
    }
    input.sms = { app, contacts };
  }
  if (canTor()) input.tor = { way: data.tor, ready: data.tor === 'off' ? false : !!(await torStatus().catch(() => null))?.ready };
  // Those sent for later wait for their time, not for a way.
  const now = Date.now();
  const waiting = (await spaceChats()).history.waiting().filter((message) => message.at <= now).length;
  return { input, waiting };
}


/** The ways now, read while the screen shows: every `every` ms, and at once as one of them changes. */
export function useWays(every: number): { input: WaysInput; waiting: number } | null {
  const [read, setRead] = useState<{ input: WaysInput; waiting: number } | null>(null);
  useFocusEffect(
    useCallback(() => {
      let stopped = false;
      const look = () =>
        readWays()
          .then((next) => !stopped && setRead(next))
          .catch(() => undefined);
      look();
      const timer = setInterval(look, every);
      const stops = [onRelayHeard(look), onNostrStates(look), nearby.onChange(look), lora.onChange(look)];
      return () => {
        stopped = true;
        clearInterval(timer);
        stops.forEach((stop) => stop());
      };
    }, [every]),
  );
  return read;
}
