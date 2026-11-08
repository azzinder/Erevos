// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { hmac } from '@noble/hashes/hmac.js';
import { sha256 } from '@noble/hashes/sha2.js';

import * as core from './core';
import { sameBytes, toHex, utf8Decode, utf8Encode } from './crypto';
import { fromBase64Url, toBase64Url } from './e2e';

// What a phone a backup was put back on says to each device the phone it was made on had linked,
// to ask it to link again (lib/devices.ts askAgain, docs/linked-devices.md, Linking again). A
// backup holds no link, so no message key of one is ever used twice: it holds, for each device,
// what reaches and recognises it (lock/e2e-data.ts Relink), and a key that device gave the phone in
// their link to be asked with, which only the two of them hold.
//
// The ask is the first message of a conversation of the core's own kind that the account starts,
// from its own identity, with the device's endpoint, from the bundle the backup holds: only who
// holds the account's identity's secret can start it, and only that device opens it. It carries a
// statement the account signs (AGAIN_CONTEXT, lib/core.ts accountSign), as it signs its device list:
// whose it is, for which endpoint, when, and the phone's name; and an HMAC of that statement with
// the device's key (`m`), so a phone that holds the account but not that device's key now asks
// nothing. Once linked again, the device has a new endpoint and gives a new key, which the phone the
// backup came from never had: so that phone, or anyone with the same backup, asks it nothing more.

/** What the account signs an ask to link again as (lib/core.ts accountSign). */
export const AGAIN_CONTEXT = 'again';

/** How long an ask is taken for: as long as a relay keeps what waits for a device. */
export const AGAIN_LASTS = 14 * 24 * 60 * 60_000;
// A phone's clock ahead a little: an ask from up to a day later is taken still.
const AHEAD = 24 * 60 * 60_000;
const LABEL = utf8Encode('erevos again v1\0');
const MAX_BODY = 1024;

/** What an ask says: whose (`a`, the account's identity, hex), for which endpoint (`e`, hex), when (`at`, ms), and the phone's name. */
export type AgainBody = { a: string; e: string; at: number; name: string };

/** An ask as it travels: the body, the account's signature of it, and the HMAC of it with the device's key, base64url. */
export type AgainSaid = { b: string; s: string; m: string };

const isHex = (v: unknown, length: number): v is string => typeof v === 'string' && v.length === length && /^[0-9a-f]+$/.test(v);

/** An ask's body as the account signs it: one form only, keys in their order. */
export function againBytes({ a, e, at, name }: AgainBody): Uint8Array {
  return utf8Encode(JSON.stringify({ t: 'erevos again', v: 1, a, e, at, name }));
}

/** What an ask's body says, its shape and form checked (not its signature): null when it is not one. */
export function readAgain(b: string): AgainBody | null {
  if (b.length > MAX_BODY) return null;
  let value: unknown;
  try {
    value = JSON.parse(utf8Decode(fromBase64Url(b)));
  } catch {
    return null;
  }
  const v = (value ?? {}) as Partial<Record<'t' | 'v' | keyof AgainBody, unknown>>;
  if (v.t !== 'erevos again' || v.v !== 1 || !isHex(v.a, 64) || !isHex(v.e, 64) || !Number.isSafeInteger(v.at) || (v.at as number) <= 0 || typeof v.name !== 'string' || v.name.length > 80) return null;
  const body: AgainBody = { a: v.a, e: v.e, at: v.at as number, name: v.name };
  return toBase64Url(againBytes(body)) === b ? body : null;
}

/** The HMAC of an ask's body with the key a device gave to be asked with. */
export function againMac(key: Uint8Array, body: Uint8Array): Uint8Array {
  const joined = new Uint8Array(LABEL.length + body.length);
  joined.set(LABEL);
  joined.set(body, LABEL.length);
  return hmac(sha256, key, joined);
}

/** An ask, signed with the account's key (`sign`, as lib/e2e.ts E2E.sign) and with the device's key. */
export async function makeAgain(sign: (context: string, message: Uint8Array) => Promise<Uint8Array>, key: Uint8Array, body: AgainBody): Promise<AgainSaid> {
  const bytes = againBytes(body);
  return { b: toBase64Url(bytes), s: toBase64Url(await sign(AGAIN_CONTEXT, bytes)), m: toBase64Url(againMac(key, bytes)) };
}

/**
 * Checks an ask on the device: signed by the bundle of the account it is linked to (`identity`,
 * hex, the bundle as its phone gave it over their link), that account's, for this device's own
 * endpoint, made with the key it gave its phone, and from no more than AGAIN_LASTS before `now`, nor
 * much later. Returns what it says, or null.
 */
export async function checkAgain(bundle: Uint8Array, identity: string, endpoint: string, key: Uint8Array, said: AgainSaid, now = Date.now()): Promise<AgainBody | null> {
  const body = readAgain(said.b);
  if (!body || body.a !== identity || body.e !== endpoint || body.at < now - AGAIN_LASTS || body.at > now + AHEAD) return null;
  const bytes = fromBase64Url(said.b);
  let mac: Uint8Array;
  try {
    mac = fromBase64Url(said.m);
  } catch {
    return null;
  }
  if (!sameBytes(mac, againMac(key, bytes))) return null;
  const signer = await core.bundleVerify(bundle, AGAIN_CONTEXT, bytes, fromBase64Url(said.s)).catch(() => null);
  return signer && toHex(signer) === identity ? body : null;
}
