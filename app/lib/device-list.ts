import { isRelay, isRelayKey, type OwnList } from '../lock/e2e-data';
import * as core from './core';
import { randomBytes, toHex, utf8Decode, utf8Encode } from './crypto';
import { fromBase64Url, toBase64Url } from './e2e';

// The account's device list (docs/multi-device.md): the endpoint of each of its linked devices, a
// core account the device made for itself, by its bundle, signed by the account's own identity key
// (lib/core.ts accountSign). The phone that holds the account (the primary) alone signs it, again
// each time a device says its endpoint, is unlinked or is gone, each time with a higher `n`. The
// account's own devices take it from the phone, over their links (lib/devices.ts); in this version
// no one else is given it.
//
// Its body is JSON in one form only, keys in a fixed order and the endpoints sorted by identity, so
// the same list is always the same bytes, and a body in any other form is refused. It names no
// device and says nothing of one but its endpoint's bundle and what it takes (`f`). With PAD_LIST it
// always names MAX_LISTED endpoints: the places no device takes hold endpoints made only for the
// list, whose secrets are thrown away at once, so the list does not say how many devices there are.
// Only the primary knows which are its devices' (E2EData.list, `real`), and tells its own devices.
// Each list keeps the filling endpoints of the one before, but one for each device that takes a
// place, so linking a device and unlinking one look the same in it: an endpoint goes, another comes.

/** The most endpoints one list names: as many devices as an account links. */
export const MAX_LISTED = 4;

/** Whether every list names MAX_LISTED endpoints, the places no device takes filled with endpoints made only for it. */
export const PAD_LIST = true;

/** What the account signs a list as (lib/core.ts accountSign). */
export const LIST_CONTEXT = 'devices';

// What each endpoint takes from contacts directly (1 messages, 2 calls, 4 a group's): nothing yet,
// while only the account's own devices are given the list. The places no device takes say the same.
const FLAGS = 0;
// A bundle is about 1800 characters, and a list's body about four of them.
const MAX_BUNDLE = 4096;
const MAX_BODY = 24 * 1024;

/** One endpoint as a list names it: its identity (hex), its bundle (base64url), and what it takes. */
export type Entry = { i: string; b: string; f: number };

/** What a list says: whose it is (the account's identity, hex), which it is (`n`, higher each time), and the endpoints. */
export type Body = { a: string; n: number; d: Entry[] };

/** Where an endpoint reads: its queue's sender id (hex), its relay, and that relay's key (base64url, or empty). */
export type Route = { s: string; relay: string; rk: string };

/** A list as it travels: its body and the account's signature of it, base64url, and, not signed, where each endpoint reads (by identity). */
export type DeviceList = { b: string; s: string; r?: Record<string, Route> };

const isText = (v: unknown): v is string => typeof v === 'string';
const isHex = (v: unknown, length: number): v is string => isText(v) && v.length === length && /^[0-9a-f]+$/.test(v);
const isBase64Url = (v: unknown, most: number): v is string => isText(v) && v.length > 0 && v.length <= most && /^[A-Za-z0-9_-]+$/.test(v);
const isFlags = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 0 && (v as number) <= 255;
const byIdentity = (x: Entry, y: Entry) => (x.i < y.i ? -1 : x.i > y.i ? 1 : 0);

/** A list's body as the account signs it: its keys in their order, the endpoints sorted by identity. */
export function bodyBytes({ a, n, d }: Body): Uint8Array {
  const sorted = [...d].sort(byIdentity).map(({ i, b, f }) => ({ i, b, f }));
  return utf8Encode(JSON.stringify({ t: 'erevos devices', v: 1, a, n, d: sorted }));
}

/** What a list's body says: null when it is not one, or not in the one form the account signs. */
export function readBody(bytes: Uint8Array): Body | null {
  let value: unknown;
  try {
    value = JSON.parse(utf8Decode(bytes));
  } catch {
    return null;
  }
  const v = (value ?? {}) as Partial<Record<'t' | 'v' | 'a' | 'n' | 'd', unknown>>;
  if (v.t !== 'erevos devices' || v.v !== 1 || !isHex(v.a, 64) || !Number.isSafeInteger(v.n) || (v.n as number) <= 0 || !Array.isArray(v.d)) return null;
  const d: Entry[] = [];
  for (const e of v.d as unknown[]) {
    const entry = (e ?? {}) as Partial<Record<keyof Entry, unknown>>;
    if (!isHex(entry.i, 64) || !isBase64Url(entry.b, MAX_BUNDLE) || !isFlags(entry.f)) return null;
    d.push({ i: entry.i, b: entry.b, f: entry.f });
  }
  const body = { a: v.a, n: v.n as number, d };
  // Any other form of the same list, its keys in another order, more of them, or its endpoints not sorted, is not taken.
  const again = bodyBytes(body);
  return again.length === bytes.length && again.every((byte, at) => byte === bytes[at]) ? body : null;
}

/** The body of a list as it travels or is kept, or null. */
export function bodyOf(list: Pick<DeviceList, 'b'>): Body | null {
  return readBody(fromBase64Url(list.b));
}

/** The `n` of the list after one whose `n` was `held`: later than it, and than any signed before now. */
export function nextN(held: number, now = Date.now()): number {
  return Math.max(held + 1, now);
}

/** Signs a list with the account's key (`sign`, as lib/e2e.ts E2E.sign). */
export async function signList(sign: (context: string, message: Uint8Array) => Promise<Uint8Array>, body: Body): Promise<DeviceList> {
  const bytes = bodyBytes(body);
  return { b: toBase64Url(bytes), s: toBase64Url(await sign(LIST_CONTEXT, bytes)) };
}

/**
 * Checks a list against the bundle of the account it should be of (`identity`, hex), a bundle that
 * came from inside a conversation with that identity: the bundle's key signed it and is that
 * identity's, the list says it is that account's, and it is later than the one held (`held`, its
 * `n`); each endpoint's bundle holds and names it, none is the account's, none is named twice, and
 * there are at most MAX_LISTED. Returns what it says, 'same' for the one held, or null.
 */
export async function verifyList(bundle: Uint8Array, identity: string, list: Pick<DeviceList, 'b' | 's'>, held = 0): Promise<Body | 'same' | null> {
  const bytes = fromBase64Url(list.b);
  const signer = await core.bundleVerify(bundle, LIST_CONTEXT, bytes, fromBase64Url(list.s));
  if (!signer || toHex(signer) !== identity) return null;
  const body = readBody(bytes);
  if (!body || body.a !== identity || body.n < held) return null;
  if (body.n === held) return 'same';
  if (body.d.length > MAX_LISTED) return null;
  const named = new Set<string>();
  for (const { i, b } of body.d) {
    if (i === identity || named.has(i)) return null;
    named.add(i);
    const of = await core.bundleIdentity(fromBase64Url(b)).then(toHex, () => '');
    if (of !== i) return null;
  }
  return body;
}

// An endpoint made only to fill a place in the list: its secret is thrown away at once, so no one
// ever reads what is written to it.
async function filler(): Promise<Entry> {
  const account = await core.newAccount();
  const [identity, bundle] = await Promise.all([core.accountIdentity(account), core.accountBundle(account)]);
  return { i: toHex(identity), b: toBase64Url(bundle), f: FLAGS };
}

// The entries in an order of chance.
function shuffled(entries: Entry[]): Entry[] {
  const out = [...entries];
  for (let at = out.length - 1; at > 0; at--) {
    const view = new DataView(randomBytes(4).buffer);
    const other = view.getUint32(0) % (at + 1);
    [out[at], out[other]] = [out[other], out[at]];
  }
  return out;
}

/**
 * The account's next list, after the one it signed last (`held`, or null), naming the endpoints of
 * `devices` (at most MAX_LISTED). With `pad`, the places left hold the filling endpoints of the list
 * before, those a device now takes left out at random, and new ones for the rest.
 */
export async function nextList(account: string, devices: { id: string; bundle: string }[], held: OwnList | null, { now = Date.now(), pad = PAD_LIST }: { now?: number; pad?: boolean } = {}): Promise<Body> {
  const real: Entry[] = devices.slice(0, MAX_LISTED).map(({ id, bundle }) => ({ i: id, b: bundle, f: FLAGS }));
  const taken = new Set(real.map((e) => e.i));
  const before = held ? bodyOf(held) : null;
  const filling = pad && before?.a === account ? before.d.filter((e) => !held!.real.includes(e.i) && !taken.has(e.i)) : [];
  const d = [...real, ...shuffled(filling).slice(0, MAX_LISTED - real.length).map((e) => ({ ...e, f: FLAGS }))];
  while (pad && d.length < MAX_LISTED) d.push(await filler());
  return { a: account, n: nextN(held?.n ?? 0, now), d: d.sort(byIdentity) };
}

/** A list as said, its shape checked (not its signature): null when it is not one. Where its endpoints read is left out where it is not that. */
export function checkedList(value: unknown): DeviceList | null {
  const v = (value ?? {}) as Partial<Record<keyof DeviceList, unknown>>;
  if (!isBase64Url(v.b, MAX_BODY) || !isBase64Url(v.s, 128)) return null;
  const routes: Record<string, Route> = {};
  if (v.r && typeof v.r === 'object' && !Array.isArray(v.r)) {
    for (const [id, route] of Object.entries(v.r).slice(0, MAX_LISTED)) {
      const r = (route ?? {}) as Partial<Record<keyof Route, unknown>>;
      if (isHex(id, 64) && isHex(r.s, 48) && isRelay(r.relay)) routes[id] = { s: r.s, relay: r.relay, rk: isRelayKey(r.rk) ? r.rk : '' };
    }
  }
  return { b: v.b, s: v.s, ...(Object.keys(routes).length > 0 ? { r: routes } : {}) };
}
