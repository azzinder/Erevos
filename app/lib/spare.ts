// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import type { Spare } from '../lock/e2e-data';
import { currentSpace } from '../lock/keys';
import { loadCurrentSpaceData, loadHiddenData, MORE_SPARES, updateCurrentSpaceData, updateHiddenData, type Queue, type SpaceData, type SpareRelay } from '../lock/space-data';
import type { SpareCode } from './contact-code';
import type { E2E } from './e2e';
import { toBase64Url } from './e2e';
import { CouponWaitError, couponStep, wantsCoupon } from './coupons';
import { takePair } from './pair';
import { createQueue, fromHex, isQueueNotFound, receiveMessage, relayKey, toHex, type Relay } from './relay';
import { ensureTor } from './tor';

// The space's backup relay, as Briar's Mailbox: a second relay (one at home, on a Raspberry Pi or
// an old computer, say) with a queue of its own. The contact link and every message say that
// queue beside the main one (lib/contact-code.ts, lib/e2e.ts), so a contact writes there while
// the main relay cannot be reached, and sends to contacts go through it when ours cannot
// (lib/space-chats.ts). The chat screen, or the receiver beside the other screens, takes what
// came there with each look. Each hidden place (lock/hidden.ts) can have one of its own, kept
// sealed with that place's key and never the space's: one relay seeing both queues would tie them
// together. A hidden place's is looked at only while it is open, as its key is in memory only then.
// A space can have up to MORE_SPARES more (SpaceData.spare.more), a list of home relays: each has a
// queue of its own, the contact link and messages say each after the first (Spare.more), a contact
// tries them in order, and each is looked at. Sends of this phone go through the first one ready
// when its own relay cannot be reached. An Erevos before the list reads only the first.
//
// A home relay may be reached only through Tor (SpareRelay.tor), files too, whatever the space's
// way, so it never sees this phone's address: Tor starts for it alone when the space's way is off.
// With no token typed, such a relay gives one for a coupon the space's relay signs blind
// (lib/coupons.ts), so neither relay can tell whose it is. Two spaces can then each use the
// other's relay as their home relay, and no relay ties them together.

// Messages taken from each backup queue in one look, at most.
const BATCH = 50;

type Ready = { url: string; relay: Relay; queue: Queue; said: Spare };

/** Where a backup relay's settings are kept: the open space's, or a hidden place's. `of` stands for
 *  whose they are while they are open. `space`: the open space's own, which may take its relay's
 *  pair as its home relay (lib/pair.ts); never a hidden place's. */
export type SpareStore = { of: object; load: () => Promise<SpaceData>; update: (patch: Partial<SpaceData>) => Promise<void>; space?: boolean };

/** The open space's. */
export function spaceSpare(): SpareStore {
  return { of: currentSpace(), load: loadCurrentSpaceData, update: updateCurrentSpaceData, space: true };
}

/** A hidden place's, while it is open with its key. */
export function hiddenSpare(space: number, pocket: number, key: Uint8Array): SpareStore {
  return { of: key, load: () => loadHiddenData(space, pocket, key), update: (patch) => updateHiddenData(space, pocket, key, patch) };
}

// The home relays ready this run, by store, then by place in the list (0 the first, 1.. its `more`).
const ready = new Map<object, Map<number, Ready>>();

/** Each home relay of what is kept, the first and then the others, in order. */
export function homeRelays(spare: SpareRelay): SpareRelay[] {
  const { more, ...first } = spare;
  return [first, ...(more ?? []).filter((one) => one.url.trim())];
}

// What is kept, with the home relay at `at` changed.
function withAt(spare: SpareRelay, at: number, next: SpareRelay): SpareRelay {
  const list = homeRelays(spare);
  list[at] = next;
  const [first, ...more] = list;
  return more.length > 0 ? { ...first, more } : first;
}

function readyIn(store: SpareStore): Ready[] {
  const known = ready.get(store.of);
  return known ? [...known.entries()].sort(([a], [b]) => a - b).map(([, one]) => one) : [];
}

/** The backup relay to send through when the relay cannot be reached: the first home relay ready, if any. */
export function spareBackup(store: SpareStore = spaceSpare()): Relay | undefined {
  return readyIn(store)[0]?.relay;
}

/** What to say of the backup queues, once ready: the first one's sender id, relay and relay key,
 *  with the others ready after it (`more`). Null while none is. */
export function spareSaid(store: SpareStore = spaceSpare()): Spare | null {
  const [first, ...more] = readyIn(store).map((one) => one.said);
  if (!first) return null;
  return more.length > 0 ? { ...first, more } : first;
}

/** The backup queues a contact link gives, from what the chat says of them. */
export function spareCode(spare: Spare | null): SpareCode | undefined {
  if (!spare) return undefined;
  const code = (one: Spare): SpareCode => ({ senderHex: one.sender, relayUrl: one.relay, relayKey: one.relayKey || undefined });
  return spare.more?.length ? { ...code(spare), more: spare.more.map(code) } : code(spare);
}

/** Lets go of one place's backup relays, when an address changes or its hidden place closes, or,
 *  with none named, of all of them, when the space closes. */
export function forgetSpare(store?: SpareStore): void {
  if (store) ready.delete(store.of);
  else ready.clear();
}

/** Saves the first backup relay, keeping the others; `tor`, as it was unless given. A new address gets a new queue there with the next look. */
export async function setSpareRelay(url: string, token: string, store: SpareStore = spaceSpare(), tor?: boolean): Promise<void> {
  const data = await store.load();
  const kept = keptFor(data.spare, { url, token, tor: tor ?? data.spare.tor === true });
  const { more } = data.spare;
  await store.update({ spare: more?.length ? { ...kept, more } : kept });
  forgetSpare(store);
}

// A home relay as given, with what was kept for its address: its queue, and a token from a coupon
// and the coupon waiting, while no other token is typed and it is still reached through Tor.
function keptFor(was: SpareRelay | undefined, given: { url: string; token: string; tor?: boolean }): SpareRelay {
  const url = given.url.trim();
  const same = !!was && was.url.trim() === url;
  const tor = given.tor === true;
  const token = given.token.trim();
  const fromCoupon = same && tor && was.tor === true && was.coupon !== undefined && (!token || token === was.token);
  // One Erevos set from the relay's pair stays so while it is saved as it was: through Tor, with no token typed.
  const auto = same && was.auto === true && tor && (!token || fromCoupon);
  return {
    url,
    token: fromCoupon ? was.token : token,
    queue: same ? was.queue : null,
    ...(tor ? { tor: true } : {}),
    ...(fromCoupon ? { coupon: was.coupon, ...(was.renew !== undefined ? { renew: was.renew } : {}) } : {}),
    ...(same && tor && was.tor === true && !token && was.pending ? { pending: was.pending } : {}),
    ...(auto ? { auto: true } : {}),
  };
}

/**
 * Saves the list of home relays, the first one first: up to 1 + MORE_SPARES, each address once,
 * empty ones left out. One whose address stays keeps its queue; a new one gets a new queue there
 * with the next look.
 */
export async function setSpareRelays(list: { url: string; token: string; tor?: boolean }[], store: SpareStore = spaceSpare()): Promise<void> {
  const data = await store.load();
  const was = homeRelays(data.spare);
  const seen = new Set<string>();
  const next: SpareRelay[] = [];
  for (const one of list) {
    const url = one.url.trim();
    if (!url || seen.has(url.toLowerCase()) || next.length > MORE_SPARES) continue;
    seen.add(url.toLowerCase());
    next.push(keptFor(was.find((w) => w.url.trim() === url), one));
  }
  const [first, ...more] = next;
  await store.update({ spare: first ? (more.length > 0 ? { ...first, more } : first) : { url: '', token: '', queue: null } });
  forgetSpare(store);
}

/** Makes the backup queues now, where a home relay has none. Once each was tried, throws the first
 *  error of one that could not be reached. */
export async function readySpare(store: SpareStore = spaceSpare()): Promise<boolean> {
  const list = homeRelays((await store.load()).spare);
  let any = false;
  let failed: unknown = null;
  for (let at = 0; at < list.length; at++) {
    try {
      if (await prepare(store, at, list[at])) any = true;
    } catch (error) {
      failed ??= error;
    }
  }
  if (failed) throw failed;
  return any;
}

// The prepares under way for each store, by home relay: one at a time, so that two looks never have
// two coupons signed, nor one write over the other's.
const busy = new WeakMap<object, Map<string, Promise<Ready | null>>>();

// The backup queue on the home relay at `at`, made the first time, and what to say of it: its
// sender id, the relay and the relay's key. Null when there is no relay there.
function prepare(store: SpareStore, at: number, given: SpareRelay): Promise<Ready | null> {
  const url = given.url.trim();
  if (!url) return Promise.resolve(null);
  const mine = busy.get(store.of) ?? new Map<string, Promise<Ready | null>>();
  busy.set(store.of, mine);
  const before = mine.get(url);
  const run = (before ?? Promise.resolve(null)).catch(() => null).then(() => prepareNow(store, at, given, !!before));
  mine.set(url, run);
  const done = () => {
    if (mine.get(url) === run) mine.delete(url);
  };
  run.then(done, done);
  return run;
}

async function prepareNow(store: SpareStore, at: number, given: SpareRelay, waited: boolean): Promise<Ready | null> {
  const url = given.url.trim();
  // After another's turn, as that one left it.
  let spare = waited ? (homeRelays((await store.load()).spare).find((one) => one.url.trim() === url) ?? given) : given;
  const known = ready.get(store.of)?.get(at);
  const coupon = wantsCoupon(spare);
  if (!coupon && known && known.url === url && known.queue.recipientHex === spare.queue?.recipientHex && (known.relay.token ?? '') === spare.token.trim()) return known;
  if (spare.tor) await ensureTor();
  if (coupon) {
    const data = await store.load();
    const primary: Relay | null = data.url.trim() ? { url: data.url.trim(), token: data.token.trim() || undefined } : null;
    const { next, waits } = await couponStep(spare, primary);
    if (next) {
      spare = next;
      await keep(store, url, () => next);
    }
    if (waits && !spare.token.trim()) throw new CouponWaitError();
  }
  if (known && known.url === url && known.queue.recipientHex === spare.queue?.recipientHex && (known.relay.token ?? '') === spare.token.trim()) return known;
  const relay: Relay = { url, token: spare.token.trim() || undefined, ...(spare.tor ? { tor: true } : {}) };
  let queue = spare.queue;
  if (!queue) {
    const ids = await createQueue(relay);
    const made: Queue = { recipientHex: toHex(ids.recipientId), senderHex: toHex(ids.senderId) };
    queue = made;
    await keep(store, url, (one) => ({ ...one, queue: made }));
  }
  const key = await relayKey(relay).catch(() => null);
  const next: Ready = { url, relay, queue, said: { sender: queue.senderHex, relay: url, relayKey: key ? toBase64Url(key) : '' } };
  const all = ready.get(store.of) ?? new Map<number, Ready>();
  all.set(at, next);
  ready.set(store.of, all);
  return next;
}

// Changes the home relay at `url` as `change` says, where that address is now, should the list
// have changed meanwhile.
async function keep(store: SpareStore, url: string, change: (one: SpareRelay) => SpareRelay): Promise<void> {
  const data = await store.load();
  const list = homeRelays(data.spare);
  const now = list.findIndex((one) => one.url.trim() === url);
  if (now >= 0) await store.update({ spare: withAt(data.spare, now, change(list[now])) });
}

/**
 * One look at the space's backup queues: says them to contacts from now on (E2E.setSpare), and
 * hands each message that came there to `take`, as one from the main queue. Says nothing when a
 * backup relay cannot be reached: the main relay's note says enough, and it is tried again.
 */
export async function lookAtSpare(
  e2e: E2E,
  take: (bytes: Uint8Array) => Promise<void>,
  stop: () => boolean,
  store: SpareStore = spaceSpare(),
): Promise<void> {
  // The space's relay may name the home relay to take (lib/pair.ts): before the look, so it is made ready in it.
  if (store.space && (await takePair(store).catch(() => false))) forgetSpare(store);
  const data = await store.load();
  const list = homeRelays(data.spare);
  // One no longer in the list, or moved in it, is let go of.
  const known = ready.get(store.of);
  if (known) for (const at of [...known.keys()]) if (at >= list.length || known.get(at)?.url !== list[at].url.trim()) known.delete(at);
  const places: (Ready | null)[] = [];
  for (let at = 0; at < list.length; at++) places.push(await prepare(store, at, list[at]).catch(() => null));
  e2e.setSpare(spareSaid(store));
  for (const place of places) {
    if (!place) continue;
    const recipient = fromHex(place.queue.recipientHex);
    for (let i = 0; i < BATCH && !stop(); i++) {
      let bytes: Uint8Array | null;
      try {
        bytes = await receiveMessage(place.relay, recipient);
      } catch (error) {
        // The backup relay lost the queue: a new one, which contacts learn from the next message.
        if (isQueueNotFound(error)) {
          const now = await store.load().catch(() => null);
          const at = now ? homeRelays(now.spare).findIndex((one) => one.url.trim() === place.url) : -1;
          if (now && at >= 0) await store.update({ spare: withAt(now.spare, at, { ...homeRelays(now.spare)[at], queue: null }) }).catch(() => undefined);
          forgetSpare(store);
        }
        break;
      }
      if (!bytes) break;
      try {
        await take(bytes);
      } catch {
        // This one is lost, as from the main queue; the next ones still come.
      }
    }
  }
}
