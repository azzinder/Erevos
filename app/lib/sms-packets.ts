// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// Encrypted messages by SMS, the last way to a contact (lib/sms-way.ts): the same end-to-end
// encrypted packets the relay carries (lib/e2e.ts), nothing new sealed and nothing in plain words,
// cut into data SMS to Erevos's SMS port, which messaging apps do not show. The phone that gets
// them puts them together and opens them as it opens what comes from a phone nearby.
//
// The packets of one message go together, each after its length (2 bytes), so they come in the
// order they went, and that whole is cut into pieces of at most PIECE bytes, one data SMS each:
//   piece: 'P', VERSION, id (4 bytes), index, count, then up to ROOM bytes of the whole
// The id is the first 4 bytes of the whole's SHA-256: it tells one message's pieces from another's,
// and once all have come, a whole whose digest does not start with it was not the one sent (a piece
// lost, changed, or put in by someone else), and is dropped.
//
// What may wait for the rest, and how long, is bounded (MAX_WAITING_PIECES, MAX_GATHERING,
// GATHER_WITHIN), so SMS from anyone cannot fill the phone; one taken already does not open again
// (seen, in lib/sms-way.ts, and the conversation itself refuses a packet twice).

import { sha256Bytes, toHex } from './crypto';

/** The first byte of a piece: an SMS invite's is 'E' (lib/sms-invite.ts). */
export const PACKET_MAGIC = 0x50;
/** A data SMS carries 140 bytes; the port header takes 7 of them (as an invite's, lib/sms-invite.ts). */
export const PIECE = 133;
const VERSION = 1;
const HEAD = 8;
/** The bytes of the whole in one data SMS. */
export const ROOM = PIECE - HEAD;
/** The most data SMS one message takes: a short text takes 3, a longer one 10. */
export const MAX_SMS_PIECES = 10;
/** The most a message's packets can be, with their lengths. */
export const MAX_SMS_BYTES = MAX_SMS_PIECES * ROOM;
/** Pieces waiting for the rest are dropped after this long, milliseconds: an SMS can take a while. */
export const GATHER_WITHIN = 30 * 60_000;
/** Messages whose pieces wait for the rest at once, at most; the oldest go first. */
export const MAX_GATHERING = 12;
/** Pieces taken at once, at most: the phone keeps no more either (SmsStore.kt). */
export const MAX_WAITING_PIECES = 96;

/** The packets of one message together, each after its length, or null when too much for SMS. */
export function smsWhole(packets: Uint8Array[]): Uint8Array | null {
  if (packets.length === 0 || packets.some((packet) => packet.length === 0 || packet.length > 0xffff)) return null;
  const size = packets.reduce((sum, packet) => sum + 2 + packet.length, 0);
  if (size > MAX_SMS_BYTES) return null;
  const whole = new Uint8Array(size);
  let at = 0;
  for (const packet of packets) {
    whole[at] = packet.length >> 8;
    whole[at + 1] = packet.length & 0xff;
    whole.set(packet, at + 2);
    at += 2 + packet.length;
  }
  return whole;
}

/** Whether a message's packets go in SMS at all. */
export const fitsSms = (packets: Uint8Array[]): boolean => smsWhole(packets) !== null;

/** The data SMS a message's packets go in, in order, or null when too much for SMS. */
export function smsPiecesOf(packets: Uint8Array[]): Uint8Array[] | null {
  const whole = smsWhole(packets);
  if (!whole) return null;
  const id = sha256Bytes(whole).subarray(0, 4);
  const count = Math.ceil(whole.length / ROOM);
  return Array.from({ length: count }, (_, index) => {
    const part = whole.subarray(index * ROOM, (index + 1) * ROOM);
    const piece = new Uint8Array(HEAD + part.length);
    piece.set([PACKET_MAGIC, VERSION, ...id, index, count]);
    piece.set(part, HEAD);
    return piece;
  });
}

/** The packets of a whole, or null when it is not one. */
export function packetsOfWhole(whole: Uint8Array): Uint8Array[] | null {
  const packets: Uint8Array[] = [];
  let at = 0;
  while (at < whole.length) {
    if (at + 2 > whole.length) return null;
    const length = (whole[at] << 8) | whole[at + 1];
    if (length === 0 || at + 2 + length > whole.length) return null;
    packets.push(whole.slice(at + 2, at + 2 + length));
    at += 2 + length;
  }
  return packets.length > 0 ? packets : null;
}

/** A piece that came, as the phone keeps it (SmsStore.kt): `n` names it there, to forget it. */
export type SmsPiece = { n: number; from: string; data: Uint8Array; at: number };

/** A message whose pieces have all come: its packets, in order, and its digest, to take it once. */
export type SmsCame = { from: string; packets: Uint8Array[]; digest: string; at: number };

/**
 * Puts the pieces that came together. Says the messages whose pieces have all come, and the pieces
 * the phone can forget (`done`): those of these messages, those that are no piece, those of a
 * message that did not come whole in GATHER_WITHIN, or does not hold together, and the oldest
 * when more than MAX_GATHERING messages wait. The rest wait for more.
 */
export function gatherSmsPieces(pieces: SmsPiece[], now: number): { came: SmsCame[]; done: number[] } {
  const done: number[] = [];
  const groups = new Map<string, SmsPiece[]>();
  for (const piece of pieces.slice(-MAX_WAITING_PIECES)) {
    const d = piece.data;
    if (d.length <= HEAD || d.length > PIECE || d[0] !== PACKET_MAGIC || d[1] !== VERSION || d[7] === 0 || d[7] > MAX_SMS_PIECES || d[6] >= d[7] || !(now - piece.at < GATHER_WITHIN)) {
      done.push(piece.n);
      continue;
    }
    const key = `${piece.from}/${toHex(d.subarray(2, 6))}`;
    groups.set(key, [...(groups.get(key) ?? []), piece]);
  }
  for (const piece of pieces.slice(0, -MAX_WAITING_PIECES)) done.push(piece.n);
  // The messages that wait, newest last: the oldest go when there are too many.
  const waiting = [...groups.values()].sort((a, b) => Math.min(...a.map((p) => p.at)) - Math.min(...b.map((p) => p.at)));
  const came: SmsCame[] = [];
  const left: SmsPiece[][] = [];
  for (const group of waiting) {
    const count = group[0].data[7];
    // Pieces that say another count, or come twice, are not of this message as it went.
    const byIndex = new Map<number, SmsPiece>();
    let broken = false;
    for (const piece of group) {
      if (piece.data[7] !== count) broken = true;
      else if (byIndex.has(piece.data[6])) broken ||= !sameData(byIndex.get(piece.data[6])!.data, piece.data);
      else byIndex.set(piece.data[6], piece);
    }
    if (broken) {
      done.push(...group.map((p) => p.n));
      continue;
    }
    if (byIndex.size < count) {
      left.push(group);
      continue;
    }
    done.push(...group.map((p) => p.n));
    const parts = [...Array(count).keys()].map((i) => byIndex.get(i)!.data.subarray(HEAD));
    const whole = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
    parts.reduce((at, p) => (whole.set(p, at), at + p.length), 0);
    const digest = sha256Bytes(whole);
    if (toHex(digest.subarray(0, 4)) !== toHex(group[0].data.subarray(2, 6))) continue;
    const packets = packetsOfWhole(whole);
    if (packets) came.push({ from: group[0].from, packets, digest: toHex(digest), at: Math.max(...group.map((p) => p.at)) });
  }
  for (const group of left.slice(0, Math.max(0, left.length - MAX_GATHERING))) done.push(...group.map((p) => p.n));
  return { came, done };
}

function sameData(a: Uint8Array, b: Uint8Array): boolean {
  return a.length === b.length && a.every((byte, i) => byte === b[i]);
}
