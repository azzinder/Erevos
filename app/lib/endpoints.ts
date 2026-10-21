import { EARLY_LASTS, MAX_EARLY, MAX_UNVERIFIED, MAX_UNVERIFIED_EACH, UNVERIFIED_LASTS, type Early, type Route, type Unverified, type Way } from '../lock/e2e-data';

// The endpoints of a contact's account (docs/multi-device.md): the devices its signed list names,
// and the places that only fill it, alike. A chat whose contact said it knows about devices (`dv`)
// keeps their list as checked against their account's bundle, and a way to each endpoint it names
// (lock/e2e-data.ts Way): where it reads, as the list said and then as its own messages say, and
// the conversations with it. What the chat seals for them goes to their account as before, and a
// copy to each endpoint (lib/e2e.ts, lock/fanout-data.ts): what the chat keeps, what was read,
// reacted to, pinned, voted, deleted or set, and the account's keys and list. What only says that
// messages came goes back only the way they came, as a copy that says only that; that a phone is
// open or someone types, a call's or a group's signals and what is sent for later go to their
// account only, but for what they say was read or came, which goes as a copy that says only that.
// Whatever an endpoint is, a device or a place that fills the list, the chat does the
// same for it, and seals what it sends it for the relay with the key the list gives with where it
// reads. A list's entry that names this chat's own account, or a contact's, is no endpoint of theirs.
// Self-contained on purpose, so it can run under plain Node for checks.

/** A list's entry, as lib/device-list.ts reads it. */
type Entry = { i: string; b: string; f: number };

/** What an entry says its endpoint takes from contacts directly (lib/device-list.ts): messages. */
const MESSAGES = 1;

type Said = Record<string, unknown>;

const isObject = (v: unknown): v is Said => !!v && typeof v === 'object' && !Array.isArray(v);

/** A way to an endpoint no conversation has started with yet: where the list says it reads, or nowhere known. */
export function blankWay(id: string, bundle: string, route?: Route): Way {
  return { id, bundle, sender: route?.s ?? '', relay: route?.relay ?? '', relayKey: route?.rk ?? '', spare: null, conversations: [], first: '', seen: [], sealTo: route?.pk ?? '', sealsIn: false };
}

// A way told where its endpoint reads now. The key to seal with that the list gives stays only
// until the endpoint gives one of its own.
function routed(way: Way, route: Route): Way {
  return { ...way, sender: route.s, relay: route.relay, relayKey: route.rk, sealTo: way.sealTo || route.pk || '' };
}

/**
 * The ways to the endpoints a contact's new list names (`entries`) as taking messages, with where
 * each reads (`routes`): one kept for the same endpoint and bundle stays as it was, where it reads
 * told anew when the list says; the others are new. Those it no longer names go, conversations and
 * all, and so do those `refused` says are no endpoint of theirs.
 */
export function waysFor(kept: Way[] | undefined, entries: Entry[], routes: Record<string, Route> | undefined, refused: (id: string) => boolean = () => false): Way[] {
  return entries.filter((e) => (e.f & MESSAGES) !== 0 && !refused(e.i)).map((e) => {
    const was = kept?.find((w) => w.id === e.i && w.bundle === e.b);
    const route = routes?.[e.i];
    if (!was) return blankWay(e.i, e.b, route);
    return route ? routed(was, route) : was;
  });
}

/** The same list said again, with where its endpoints read now. */
export function withRoutes(ways: Way[] | undefined, routes: Record<string, Route> | undefined): Way[] | undefined {
  if (!ways || !routes) return ways;
  return ways.map((w) => (routes[w.id] ? routed(w, routes[w.id]) : w));
}

/**
 * How a message goes to each endpoint as well as to the account: whole, as what the chat keeps, or
 * reacts to, pins, votes on, deletes or sets (one that says nothing else says the chat's timer), and
 * the account's keys and list; for what it says was read only (`marks`); or not (`none`), as a
 * call's or a group's signal, one sent for later, one that only says what came, that a phone is
 * open or someone types. What any of them says was read goes to every endpoint, and what came back
 * only the way it came, saying only that (lib/e2e.ts).
 */
export function copiedAs(m: Said): 'whole' | 'marks' | 'none' {
  if (m.call || m.group || m.due) return 'none';
  if (typeof m.tag === 'string' && m.tag && ((typeof m.text === 'string' && m.text !== '') || isObject(m.voice) || isObject(m.file))) return 'whole';
  if (m.erase || m.react || m.ak || m.dl) return 'whole';
  if (['pin', 'vote', 'poll', 'sticker', 'place'].some((key) => m[key] !== undefined && m[key] !== null)) return 'whole';
  if (Array.isArray(m.read) && m.read.length > 0) return 'marks';
  const says = (key: string) => (Array.isArray(m[key]) ? (m[key] as unknown[]).length > 0 : !!m[key]);
  return ['text', 'got', 'on', 'ask', 'typing', 'voice', 'file'].some(says) ? 'none' : 'whole';
}

/** Whether a message goes to each endpoint as well as to the account, whole or for what it says was read (copiedAs). */
export function isCopied(m: Said): boolean {
  return copiedAs(m) !== 'none';
}

/**
 * The first packets that wait for their account's next list, with `packet` (from the endpoint
 * `peer` of `acct`, now) in place of any before from that endpoint, none older than
 * UNVERIFIED_LASTS. One from an endpoint none waits from yet is kept only while that account has
 * fewer than MAX_UNVERIFIED_EACH waiting, as many as its list names, and all fewer than
 * MAX_UNVERIFIED: so what one sends, under as many endpoints as it makes, never pushes out what
 * another's endpoint sent. The one left out is started again a day or more later (lib/e2e.ts, Way.again).
 */
export function withUnverified(held: Unverified[] | undefined, packet: string, acct: string, peer: string, now: number): Unverified[] {
  const live = (held ?? []).filter((u) => u.packet !== packet && now - u.at < UNVERIFIED_LASTS);
  const kept = live.filter((u) => !(u.acct === acct && u.peer === peer));
  const again = kept.length < live.length;
  if (!again && (kept.length >= MAX_UNVERIFIED || kept.filter((u) => u.acct === acct).length >= MAX_UNVERIFIED_EACH)) return kept;
  return [...kept, { packet, acct, peer, at: now }];
}

/**
 * On a linked device: the first packets of contacts it does not know yet that wait for the phone to
 * say who they are, with `packet` (from `identity`, now) in place of any before from them, none
 * older than EARLY_LASTS. One from someone none waits from yet is kept only while fewer than
 * MAX_EARLY wait, so what one sends, under as many identities as it makes, never pushes out another's.
 */
export function withEarlyFirst(held: Early[] | undefined, packet: string, identity: string, now: number): Early[] {
  const live = (held ?? []).filter((e) => e.packet !== packet && now - e.at < EARLY_LASTS);
  const kept = live.filter((e) => e.identity !== identity);
  if (kept.length === live.length && kept.length >= MAX_EARLY) return kept;
  return [...kept, { packet, identity, at: now }];
}
