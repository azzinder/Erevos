import { fromBase64, randomBytes, sha256Bytes, toBase64, toHex } from './crypto';

// Messages to and from contacts over the nearby radio link (modules/erevos-radio): Wi-Fi Aware or
// Bluetooth, phone to phone, with no internet. They are the same end-to-end encrypted packets as
// through the relay (lib/e2e.ts), so a phone nearby, a contact's or a stranger's, gets only bytes
// it cannot open unless they are for it. A packet does not say who it is for. Until a contact is
// heard on a link, the small packets for them go to every phone linked nearby, and each phone tries
// them in the open space's chats. Once one opens, the link it came on is that contact's, and what
// goes to them goes on it only. A voice message's parts go only to a contact heard nearby.
//
// Each packet also goes through the relay when there is one, so nothing is lost on a link that
// dropped. Whichever copy comes second does not open again (lib/e2e.ts), so nothing shows twice.
//
// A packet that opens in none of the open chats is kept in memory a while, for the other spaces
// as they open; none of it is written to the phone. The radio carries text frames of up to 16 KB,
// so a packet goes as base64, in pieces when it is long.

/** How a message went: to the contact's phone nearby, through the relay, or to the phones nearby, not knowing whether theirs is one. */
export type Delivery = 'nearby' | 'relay' | 'spread';

/** Sends a text frame on a link (sendText of modules/erevos-radio). False if the link is not up. */
export type RadioSend = (link: string, text: string) => boolean;

const PREFIX = 'EVN1';
// A packet's bytes in one frame: as base64 with the frame's head, under the radio's 16 KB.
const PIECE = 12_000;
const MAX_PIECES = 8;
// The largest packet sent to every phone nearby; larger ones go to a contact heard nearby only.
const MAX_SPREAD = 8 * 1024;
// Packets for none of the open chats, kept for the other spaces: how many, and how long.
const MAX_HELD = 200;
const HELD_FOR = 6 * 3600 * 1000;
// A packet coming in pieces is dropped if the rest takes longer than this, milliseconds.
const PIECES_WITHIN = 60_000;
const MAX_GATHERING = 32;
// Packets taken already, by digest, so one that comes on two links is tried once.
const MAX_SEEN = 500;

const FRAME = /^EVN1:([0-9a-f]{8}):([0-9]):([1-9]):([A-Za-z0-9+/]+={0,2})$/;

const digestOf = (packet: Uint8Array) => toHex(sha256Bytes(packet)).slice(0, 32);

/** The frames a packet goes in, or null when it is too large for the radio. */
export function framesOf(packet: Uint8Array): string[] | null {
  const count = Math.max(1, Math.ceil(packet.length / PIECE));
  if (count > MAX_PIECES) return null;
  const id = toHex(randomBytes(4));
  return Array.from({ length: count }, (_, n) => `${PREFIX}:${id}:${n}:${count}:${toBase64(packet.subarray(n * PIECE, (n + 1) * PIECE))}`);
}

/** Neither the relay nor a phone nearby took it. */
export class NoWayError extends Error {
  constructor() {
    super('There is no relay, and no Erevos phone is linked nearby. Type the relay address in Relay, or come near their phone.');
  }
}

/** The phone's radio links, and what goes over them. The app has one (`nearby`). */
export class Nearby {
  private send: RadioSend = () => false;
  private readonly links = new Set<string>();
  // The link each contact was last heard on, by identity.
  private readonly heard = new Map<string, string>();
  private readonly gathering = new Map<string, { pieces: (string | null)[]; at: number }>();
  private held: { packet: Uint8Array; digest: string; at: number }[] = [];
  private readonly seen: string[] = [];
  private readonly listeners = new Set<() => void>();

  private changed() {
    this.listeners.forEach((listener) => listener());
  }

  /** Sends on the radio from now on, with no link up yet. Returns how to stop: the links go then too. */
  start(radio: RadioSend): () => void {
    const forget = () => {
      this.links.clear();
      this.heard.clear();
      this.gathering.clear();
      this.changed();
    };
    this.send = radio;
    forget();
    return () => {
      if (this.send !== radio) return;
      this.send = () => false;
      forget();
    };
  }

  /** A data link to a phone nearby is up (an onPeer event of kind wifi-aware or ble-link). */
  linkUp(link: string): void {
    if (this.links.has(link)) return;
    this.links.add(link);
    this.changed();
  }

  /** How many phones nearby are linked now. */
  count(): number {
    return this.links.size;
  }

  /** Whether a contact was heard on a link that is still up. */
  isNear(identity: string): boolean {
    const link = this.heard.get(identity);
    return !!link && this.links.has(link);
  }

  /** A contact's packet came on this link: what goes to them goes there from now on. */
  heardOn(identity: string, link: string): void {
    if (this.heard.get(identity) === link) return;
    this.heard.set(identity, link);
    this.changed();
  }

  /** Calls `listener` when a link comes or goes, or a contact is heard nearby. Returns how to stop. */
  onChange(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private lost(link: string) {
    this.links.delete(link);
    for (const [identity, on] of this.heard) if (on === link) this.heard.delete(identity);
    this.changed();
  }

  private sendOn(link: string, frames: string[][]): boolean {
    for (const frame of frames.flat()) {
      if (!this.send(link, frame)) {
        this.lost(link);
        return false;
      }
    }
    return true;
  }

  // Sends packets over the radio: on the contact's link when they were heard on one, otherwise,
  // when they are small, on every link. Says which, or null when none took them.
  private toNearby(identity: string, packets: Uint8Array[]): 'direct' | 'spread' | null {
    const frames = packets.map(framesOf);
    if (frames.some((f) => f === null)) return null;
    const all = frames as string[][];
    const link = this.heard.get(identity);
    if (link && this.links.has(link) && this.sendOn(link, all)) return 'direct';
    if (packets.some((packet) => packet.length > MAX_SPREAD)) return null;
    let reached = 0;
    for (const other of [...this.links]) if (this.sendOn(other, all)) reached++;
    return reached > 0 ? 'spread' : null;
  }

  /**
   * Hands a contact's packets, in order, to their phone. `relay` sends them through the relay, or
   * is null when there is none. Sent to them nearby, the relay's copy goes too, unwaited.
   * Otherwise it waits for the relay, and if the relay fails, a copy that went to the phones
   * nearby will do. Throws the relay's error, or NoWayError, when nothing took them.
   */
  async deliver(identity: string, packets: Uint8Array[], relay: (() => Promise<void>) | null): Promise<Delivery> {
    const way = this.toNearby(identity, packets);
    if (way === 'direct') {
      relay?.().catch(() => {
        // They have it from the radio; the relay's copy was only in case the link dropped.
      });
      return 'nearby';
    }
    if (relay) {
      try {
        await relay();
        return 'relay';
      } catch (error) {
        if (way === 'spread') return 'spread';
        throw error;
      }
    }
    if (way === 'spread') return 'spread';
    throw new NoWayError();
  }

  /**
   * The packet a frame from a link completes, or null: a piece of one still coming, one taken
   * already, or not a sealed packet at all (as an older Erevos sent, plain).
   */
  frameIn(link: string, text: string, now = Date.now()): Uint8Array | null {
    const match = FRAME.exec(text);
    if (!match) return null;
    const [, id, at, of, data] = match;
    const n = Number(at);
    const count = Number(of);
    if (n >= count || count > MAX_PIECES) return null;
    this.linkUp(link);
    let pieces: (string | null)[] = [data];
    if (count > 1) {
      for (const [key, g] of this.gathering) if (now - g.at > PIECES_WITHIN) this.gathering.delete(key);
      const key = `${link} ${id}`;
      const g = this.gathering.get(key) ?? { pieces: new Array<string | null>(count).fill(null), at: now };
      if (g.pieces.length !== count) return null;
      g.pieces[n] = data;
      this.gathering.set(key, g);
      while (this.gathering.size > MAX_GATHERING) this.gathering.delete(this.gathering.keys().next().value!);
      if (g.pieces.some((piece) => piece === null)) return null;
      this.gathering.delete(key);
      pieces = g.pieces;
    }
    let packet: Uint8Array;
    try {
      const parts = pieces.map((piece) => fromBase64(piece!));
      packet = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
      let offset = 0;
      for (const part of parts) {
        packet.set(part, offset);
        offset += part.length;
      }
    } catch {
      return null;
    }
    const digest = digestOf(packet);
    if (this.seen.includes(digest)) return null;
    this.seen.push(digest);
    if (this.seen.length > MAX_SEEN) this.seen.shift();
    return packet;
  }

  /** Keeps a packet that opened in none of the open chats, for the spaces opened later. */
  hold(packet: Uint8Array, now = Date.now()): void {
    const digest = digestOf(packet);
    this.held = this.held.filter((h) => now - h.at < HELD_FOR && h.digest !== digest);
    this.held.push({ packet, digest, at: now });
    if (this.held.length > MAX_HELD) this.held = this.held.slice(-MAX_HELD);
  }

  /** The packets kept for other spaces, oldest first. They stay kept until `dropHeld`. */
  heldPackets(now = Date.now()): Uint8Array[] {
    this.held = this.held.filter((h) => now - h.at < HELD_FOR);
    return this.held.map((h) => h.packet);
  }

  /** Forgets a kept packet: it opened, or never can. */
  dropHeld(packet: Uint8Array): void {
    this.held = this.held.filter((h) => h.packet !== packet);
  }
}

/** This phone's. */
export const nearby = new Nearby();
