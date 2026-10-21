import { hkdf } from '@noble/hashes/hkdf.js';
import { hmac } from '@noble/hashes/hmac.js';
import { sha256 } from '@noble/hashes/sha2.js';

import { decryptBytes, encryptBytes, sameBytes, utf8Encode } from './crypto';

// A conversation's packets sealed once more for the relay. A packet of the double ratchet carries
// its header in the clear (crates/erevos-core/src/ratchet.rs): the ratchet key and the counters.
// Every contact of a space writes to the same queue, so the relay could tell those packets apart
// by their ratchet key, and the phone, not knowing whose a packet is, tries it in every contact's
// conversations. So each phone gives each contact a key of its own for the packets they send it,
// inside the chat (`pk` in a message), and once a contact has it, it seals every packet to the
// phone with it:
//
//   [1, 4], a mark of 16 bytes, then the packet sealed with AES-256-GCM (its nonce first).
//
// The mark is an HMAC of the nonce, so the phone finds whose packet it is with one HMAC a contact,
// and opens it in that contact's conversations only. To the relay every sealed packet is random
// bytes, apart from its size. First packets, which start a conversation, are never sealed.
//
// The key a phone gives a contact is drawn from its account's keys and the contact's identity, so
// it is the same after a backup is restored, and the contact's copy stays good.
//
// What contacts send the endpoints of an account's device list (docs/multi-device.md) is sealed the
// same way, with the key the list gives with where each reads until that endpoint gives one of its
// own. That key too is each contact's own: the phone keeps one key for each entry (`seed`: a
// device's, which it said, or a random one for a place that fills the list) and gives each contact
// the key drawn from it and their identity (`entryKey`), so no contact, nor a relay that works with
// one, opens what another seals for that endpoint. A device finds whose a packet is with one HMAC a
// contact, as the phone does.

export const SEALED_PACKET = [1, 4];
const MARK = 16;
const NONCE = 12;
// GCM's tag.
const TAG = 16;

export type PacketKeys = { mark: Uint8Array; seal: Uint8Array };

/** The keys a packet key gives: one for the mark, one for the seal. */
export function packetKeys(key: Uint8Array): PacketKeys {
  return {
    mark: hkdf(sha256, key, undefined, utf8Encode('erevos packet mark'), 32),
    seal: hkdf(sha256, key, undefined, utf8Encode('erevos packet seal'), 32),
  };
}

export function isSealedPacket(packet: Uint8Array): boolean {
  return packet.length > 2 + MARK + NONCE + TAG && packet[0] === SEALED_PACKET[0] && packet[1] === SEALED_PACKET[1];
}

/** `packet` sealed for the phone that gave this key. */
export function sealPacket(keys: PacketKeys, packet: Uint8Array): Uint8Array {
  const sealed = encryptBytes(keys.seal, packet);
  const mark = hmac(sha256, keys.mark, sealed.subarray(0, NONCE)).subarray(0, MARK);
  const out = new Uint8Array(2 + MARK + sealed.length);
  out.set(SEALED_PACKET);
  out.set(mark, 2);
  out.set(sealed, 2 + MARK);
  return out;
}

/** Whether a sealed packet was sealed with these keys: one HMAC, nothing opened. */
export function sealedWith(keys: PacketKeys, packet: Uint8Array): boolean {
  const nonce = packet.subarray(2 + MARK, 2 + MARK + NONCE);
  return sameBytes(hmac(sha256, keys.mark, nonce).subarray(0, MARK), packet.subarray(2, 2 + MARK));
}

/** The packet inside, or null when these keys do not open it. */
export function openPacket(keys: PacketKeys, packet: Uint8Array): Uint8Array | null {
  try {
    return decryptBytes(keys.seal, packet.subarray(2 + MARK));
  } catch {
    return null;
  }
}

/** The key this account gives the contact with `identity` (hex) for the packets they send it. */
export function ownPacketKey(account: Uint8Array, identity: string): Uint8Array {
  return hmac(sha256, account, utf8Encode(`erevos packet key v1 ${identity}`));
}

/** The key a device list's entry whose kept key is `seed` gives the contact with `identity` (hex) for the packets they send that endpoint. */
export function entryKey(seed: Uint8Array, identity: string): Uint8Array {
  return hmac(sha256, seed, utf8Encode(`erevos entry key v1 ${identity}`));
}
