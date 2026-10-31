// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { sha256 } from '@noble/hashes/sha2.js';

// Checking a contact by QR codes, in person (app/chat.tsx, Chat Details → Safety number): each
// phone shows a code and takes a photo of the other's, and each marks the contact checked on its
// own once theirs matches. Nothing goes over the network, and neither phone takes the other's word
// for it: a phone marks only what it saw itself.
//
// The code is
//   EREVOSV1:<43 base64url characters>
// the SHA-256 of a label, the identity key of the phone that shows it (as the other knows it) and
// the identity key it holds for the other, in that order. The phone that takes the photo works out
// the same from its side (the contact's identity key it holds, then its own) and compares. When
// someone in between gave either phone a key of their own, the two sides hold different keys and
// the codes differ, as the safety numbers do. In that order, a phone's own code never passes as
// the contact's, so a photo of one's own screen, or a mirror, checks nothing.
//
// The keys themselves are not in the code, only their hash: a photo of it says nothing of who the
// two are to someone who does not have both keys already. It is not a link (erevos://): the
// phone's own camera app shows it as text and opens nothing. A later version would start with
// another label (EREVOSV2:); this one refuses those and says so, rather than reading them as a
// mismatch, and a phone never takes an older form in its place: there is none.
// Self-contained on purpose, so it can run under plain Node for checks.

const PREFIX = 'EREVOSV1:';
const LABEL = 'erevos contact check v1';
const ANY_VERSION = /^EREVOSV(\d+):/i;

function hexBytes(hex: string): Uint8Array {
  if (!/^[0-9a-f]{64}$/.test(hex)) throw new Error('not an identity key');
  const out = new Uint8Array(32);
  for (let i = 0; i < 32; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

function base64Url(bytes: Uint8Array): string {
  const abc = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0);
    const chars = i + 2 < bytes.length ? 4 : i + 1 < bytes.length ? 3 : 2;
    for (let j = 0; j < chars; j++) out += abc[(n >> (18 - 6 * j)) & 63];
  }
  return out;
}

function digest(shower: string, other: string): string {
  const label = new TextEncoder().encode(LABEL);
  const data = new Uint8Array(label.length + 64);
  data.set(label, 0);
  data.set(hexBytes(shower), label.length);
  data.set(hexBytes(other), label.length + 32);
  return base64Url(sha256(data));
}

/** The code this phone shows a contact: `own`, its identity key as they know it, and `theirs`, the one it holds for them (hex). */
export function verifyCode(own: string, theirs: string): string {
  return PREFIX + digest(own, theirs);
}

/**
 * What a photographed code says, for the contact `theirs` as held here and this phone's `own`:
 * - 'match': it is theirs, and both phones hold the same keys;
 * - 'own': it is this phone's own code (a photo of its own screen);
 * - 'other': a code of this kind that does not match: someone in between, or another contact's;
 * - 'newer': from a later Erevos, which this one cannot check;
 * - 'none': not a code of this kind at all.
 */
export type VerifyResult = 'match' | 'own' | 'other' | 'newer' | 'none';

export function checkVerifyCode(text: string, own: string, theirs: string): VerifyResult {
  const clean = text.trim();
  const version = ANY_VERSION.exec(clean);
  if (!version) return 'none';
  if (version[1] !== '1') return Number(version[1]) > 1 ? 'newer' : 'none';
  const said = clean.slice(PREFIX.length);
  if (!/^[A-Za-z0-9_-]{43}$/.test(said)) return 'none';
  if (same(said, digest(theirs, own))) return 'match';
  if (same(said, digest(own, theirs))) return 'own';
  return 'other';
}

// Compares the whole of both, whatever differs first.
function same(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
