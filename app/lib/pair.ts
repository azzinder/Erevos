// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import type { SpaceData, SpareRelay } from '../lock/space-data';
import { canTor } from './core';
import { relayPair, sameRelay, type Relay } from './relay';
import type { SpareStore } from './spare';

// The home relay a space takes by itself (SpaceData.pairHome, on unless turned off). Its relay may
// name relays it is paired with (crates/erevos-relay coupons.rs, EREVOS_RELAY_PAIR): ones that take
// its coupons. A space with no home relay takes the first that is not its own relay as its home
// relay, only through Tor and with no token, so the coupon steps give it one (lib/coupons.ts):
// neither relay can tell whose it is, and nothing is typed. Every phone of the relay is told the
// same. Only the open space's, never a hidden place's, whose relays the space must not name; and
// only on Android, where Erevos has Tor. A home relay set so (SpareRelay.auto) follows the pair: it
// goes for the new one when the relay names others, and when it became the space's own relay. One
// typed on the Home relay screen is the owner's and stays; removing the home relay there turns this
// off (app/home-relay.tsx).

/** How long what a relay said of its pair holds before it is asked again; and after a failure. */
const ASK_EVERY = 24 * 60 * 60_000;
const RETRY = 15 * 60_000;

const NONE: SpareRelay = { url: '', token: '', queue: null };

// What each space's relay last said of its pair while Erevos runs, by whose store it is: which
// relay, when, and the pair (null when it could not be asked).
const said = new WeakMap<object, { url: string; at: number; pair: string[] | null }>();

// The platform Erevos runs on: React Native is asked only when it is there, so the checks, in
// plain Node, can load this file.
function platform(): string {
  try {
    return (require('react-native') as typeof import('react-native')).Platform.OS;
  } catch {
    return 'node';
  }
}

/** Whether a home relay can be taken from the relay's pair here: on Android, with Tor. */
export function pairHere(): boolean {
  return platform() === 'android' && canTor();
}

/**
 * What the first home relay becomes, from what the space keeps and its relay's `pair`: the first of
 * the pair that is neither the space's relay nor already among its home relays, through Tor and set
 * by itself; none for one set so that became the space's own relay with nothing to take instead.
 * Null to leave it as it is: turned off, the owner's own, or one of the pair still.
 */
export function pairChange(data: Pick<SpaceData, 'url' | 'pairHome' | 'stopped' | 'spare'>, pair: string[]): SpareRelay | null {
  if (!data.pairHome || data.stopped > 0 || !data.url.trim()) return null;
  const first = data.spare;
  const has = !!first.url.trim();
  if (has && first.auto !== true) return null;
  const own = has && sameRelay(first.url, data.url);
  if (has && !own && pair.some((url) => sameRelay(url, first.url))) return null;
  const others = (first.more ?? []).map((one) => one.url);
  const pick = pair.find((url) => !sameRelay(url, data.url) && !others.some((other) => sameRelay(other, url)));
  if (pick) return has && sameRelay(pick, first.url) ? null : { url: pick, token: '', queue: null, tor: true, auto: true };
  // Nothing to take: one set so stays while the relay names nothing, unless it is the relay itself.
  return own ? NONE : null;
}

/**
 * One look at the pair of the space's relay, asked at most once a day while Erevos runs (`again`:
 * whatever was said): sets the first home relay as pairChange says, keeping the others. True when it
 * changed, and the home relays are then made ready again.
 */
export async function takePair(store: SpareStore, again = false, now = Date.now()): Promise<boolean> {
  if (!store.space || !pairHere()) return false;
  const data = await store.load();
  const url = data.url.trim();
  if (!data.pairHome || data.stopped > 0 || !url || (data.spare.url.trim() && data.spare.auto !== true)) return false;
  const seen = said.get(store.of);
  let pair: string[];
  if (!again && seen && seen.url === url && now >= seen.at && now - seen.at < (seen.pair ? ASK_EVERY : RETRY)) {
    if (!seen.pair) return false;
    pair = seen.pair;
  } else {
    const relay: Relay = { url, token: data.token.trim() || undefined };
    try {
      pair = await relayPair(relay);
    } catch {
      said.set(store.of, { url, at: now, pair: null });
      return false;
    }
    said.set(store.of, { url, at: now, pair });
  }
  const next = pairChange(data, pair);
  if (!next) return false;
  // As it is now, should the owner have saved the Home relay screen meanwhile.
  const kept = await store.load();
  if (!kept.pairHome || kept.spare.url.trim() !== data.spare.url.trim() || (kept.spare.url.trim() && kept.spare.auto !== true)) return false;
  const more = kept.spare.more ?? [];
  let spare: SpareRelay;
  if (next.url) spare = more.length > 0 ? { ...next, more } : next;
  else {
    const [head, ...rest] = more;
    spare = head ? (rest.length > 0 ? { ...head, more: rest } : head) : next;
  }
  await store.update({ spare });
  return true;
}
