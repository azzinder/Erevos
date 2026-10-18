import { CONFIG_ONLY, MAX_PAYLOAD, PRIVATE_APP, readFromRadio, toRadioPacket, wantConfig } from './meshtastic';
import { framesOf, SLOW_PREFIX } from './nearby';
import { fromBase64, randomBytes } from './crypto';

// Erevos over a Meshtastic LoRa radio linked to the phone by Bluetooth (modules/erevos-radio), for
// when there is no internet and no phone near: one slow link of lib/nearby.ts, to every Erevos
// with a radio of the same mesh, kilometres away, through the Meshtastic radios between.
//
// What goes are nearby's packets, end-to-end encrypted already, each in pieces of the most a
// Meshtastic packet carries, to every radio on the radio's first channel, on Meshtastic's port for
// an app's own data. Each radio passes them on, as Meshtastic does, and every phone tries them, as
// a packet does not say who it is for. A radio sends only so much a minute, as the law of its
// region allows, so pieces go one at a time, each once the radio says it took the last.
//
// The radio stays linked while Erevos runs, chat open or not, until it is turned off. What comes
// while no chat is open is kept a while for the next one.

/** The link to a radio, as the phone's Bluetooth does it (modules/erevos-radio). */
export type Mesh = {
  connect(address: string): void;
  disconnect(): void;
  /** Writes a ToRadio. False when the radio is not linked. */
  write(bytes: Uint8Array): boolean;
};

export type LoraStatus = 'off' | 'connecting' | 'starting' | 'up' | 'down';

/** How the radio is, for the LoRa screen. `region` is Meshtastic's code (0 is not set yet), null until read. */
export type LoraState = { status: LoraStatus; detail: string; address: string; name: string; region: number | null; transmits: boolean; waiting: number };

/** How long things take, milliseconds; shorter in the checks. */
export type LoraTiming = { reconnectAfter: number; answerWithin: number; retryAfter: number; dropAfter: number };

const TIMING: LoraTiming = { reconnectAfter: 30_000, answerWithin: 5_000, retryAfter: 30_000, dropAfter: 15 * 60_000 };

// A piece: 'E' '1', the packet's id (4 bytes), its number and how many there are (4 bits each),
// then its bytes.
const MAGIC = [0x45, 0x31];
const HEAD = MAGIC.length + 5;
const PIECE = MAX_PAYLOAD - HEAD;
const MAX_PIECES = 16;
// Pieces waiting for the radio, at most: a few messages.
const MAX_WAITING = 48;
// A packet coming in pieces is dropped if the rest takes longer than this.
const PIECES_WITHIN = 10 * 60_000;
const MAX_GATHERING = 32;
// Packets that came, kept for chats opened later: how many, and how long.
const MAX_KEPT = 50;
const KEPT_FOR = 6 * 3600_000;
// Meshtastic's error code for a packet that went to no radio, as one for this radio only would.
const SHOULD_RELEASE = 35;

// A frame of nearby's with one whole packet (framesOf in lib/nearby.ts). Only those go over LoRa.
const WHOLE = /^EVN1:[0-9a-f]{8}:0:1:([A-Za-z0-9+/]+={0,2})$/;

const newId = () => {
  const b = randomBytes(4);
  return ((b[0] << 24) | (b[1] << 16) | (b[2] << 8) | b[3]) >>> 0 || 1;
};

/** The pieces a packet goes in on LoRa, or null when it is too large. */
export function piecesOf(packet: Uint8Array): Uint8Array[] | null {
  const count = Math.max(1, Math.ceil(packet.length / PIECE));
  if (count > MAX_PIECES) return null;
  const size = Math.ceil(packet.length / count);
  const id = randomBytes(4);
  return Array.from({ length: count }, (_, n) => {
    const part = packet.subarray(n * size, (n + 1) * size);
    const piece = new Uint8Array(HEAD + part.length);
    piece.set(MAGIC, 0);
    piece.set(id, MAGIC.length);
    piece[MAGIC.length + 4] = (n << 4) | (count - 1);
    piece.set(part, HEAD);
    return piece;
  });
}

type Timer = ReturnType<typeof setTimeout>;

/** The phone's LoRa radio, and what goes over it. The app has one (`lora` in lib/radio.ts). */
export class Lora {
  private address = '';
  private status: LoraStatus = 'off';
  private detail = '';
  private node = 0;
  private name = '';
  private region: number | null = null;
  private transmits = true;
  // Pieces to send, oldest first, and the one the radio is asked to send now.
  private queue: { piece: Uint8Array; at: number }[] = [];
  private sending: { id: number; timer: Timer } | null = null;
  private resting: Timer | null = null;
  private full = false;
  // Refused a packet as the queue was full: the link is told again once there is room.
  private refused = false;
  private reconnect: Timer | null = null;
  private readonly gathering = new Map<string, { pieces: (Uint8Array | null)[]; at: number }>();
  private kept: { text: string; at: number }[] = [];
  private readonly linkListeners = new Set<(link: string) => void>();
  private readonly textListeners = new Set<(link: string, text: string) => void>();
  private readonly changeListeners = new Set<() => void>();

  private readonly mesh: Mesh;
  private readonly timing: LoraTiming;

  constructor(mesh: Mesh, timing: LoraTiming = TIMING) {
    this.mesh = mesh;
    this.timing = timing;
  }

  private changed() {
    this.changeListeners.forEach((listener) => listener());
  }

  /** Links to the radio at this Bluetooth address, and keeps linking to it, until `turnOff`. */
  turnOn(address: string): void {
    if (this.address === address && this.status !== 'off' && this.status !== 'down') return;
    this.stop();
    this.address = address;
    this.connect();
  }

  turnOff(): void {
    this.stop();
    this.address = '';
    this.status = 'off';
    this.detail = '';
    this.changed();
  }

  private stop() {
    if (this.address) this.mesh.disconnect();
    if (this.reconnect) clearTimeout(this.reconnect);
    this.reconnect = null;
    this.idle();
    this.queue = [];
    this.gathering.clear();
    this.node = 0;
    this.name = '';
    this.region = null;
  }

  private idle() {
    if (this.sending) clearTimeout(this.sending.timer);
    if (this.resting) clearTimeout(this.resting);
    this.sending = null;
    this.resting = null;
    this.full = false;
  }

  private connect() {
    this.reconnect = null;
    this.status = 'connecting';
    this.detail = '';
    this.changed();
    this.mesh.connect(this.address);
  }

  state(): LoraState {
    const { status, detail, address, name, region, transmits } = this;
    return { status, detail, address, name, region, transmits, waiting: this.queue.length };
  }

  /** The slow link to the mesh (lib/nearby.ts), while the radio is linked. */
  link(): string | null {
    return this.status === 'up' ? this.linkId() : null;
  }

  // The link's id, once the radio said its node number: it stays the same for this radio.
  private linkId(): string | null {
    return this.node ? `${SLOW_PREFIX}${this.node.toString(16).padStart(8, '0')}` : null;
  }

  /** Calls `listener` when the radio changes. Returns how to stop. */
  onChange(listener: () => void): () => void {
    this.changeListeners.add(listener);
    return () => {
      this.changeListeners.delete(listener);
    };
  }

  /** Calls `listener` with the link each time it is up, now too if it is. Returns how to stop. */
  onLink(listener: (link: string) => void): () => void {
    this.linkListeners.add(listener);
    const link = this.link();
    if (link) listener(link);
    return () => {
      this.linkListeners.delete(listener);
    };
  }

  /** Calls `listener` with each packet that comes, as a frame of nearby's: first those kept. Returns how to stop. */
  onText(listener: (link: string, text: string) => void): () => void {
    this.textListeners.add(listener);
    const link = this.linkId();
    this.kept = this.kept.filter(({ at }) => Date.now() - at < KEPT_FOR);
    if (link) for (const { text } of this.kept) listener(link, text);
    return () => {
      this.textListeners.delete(listener);
    };
  }

  private linkUp() {
    const link = this.link();
    if (link) this.linkListeners.forEach((listener) => listener(link));
  }

  /** Sends a frame of nearby's on the link. False when the radio is not linked, or has too much to send. */
  sendFrame(link: string, text: string): boolean {
    if (link !== this.link()) return false;
    const whole = WHOLE.exec(text);
    if (!whole) return false;
    const pieces = piecesOf(fromBase64(whole[1]));
    if (!pieces) return false;
    if (this.queue.length + pieces.length > MAX_WAITING) {
      this.refused = true;
      return false;
    }
    const at = Date.now();
    for (const piece of pieces) this.queue.push({ piece, at });
    this.pump();
    this.changed();
    return true;
  }

  // Asks the radio to send the next piece, when it is free and took the last one.
  private pump() {
    if (this.status !== 'up' || this.sending || this.resting || this.full) return;
    const now = Date.now();
    this.queue = this.queue.filter(({ at }) => now - at < this.timing.dropAfter);
    if (this.refused && this.queue.length <= MAX_WAITING / 2) {
      this.refused = false;
      this.linkUp();
    }
    const next = this.queue[0];
    if (!next) {
      this.changed();
      return;
    }
    const id = newId();
    // Hop limit 0 asks the radio for its own, as Meshtastic's apps do. The radio sends a piece
    // again if it hears no radio pass it on.
    const sent = this.mesh.write(toRadioPacket({ id, channel: 0, portnum: PRIVATE_APP, payload: next.piece, hopLimit: 0, wantAck: true }));
    if (!sent) return;
    // A radio that says nothing back took it, as older ones do not tell.
    this.sending = {
      id,
      timer: setTimeout(() => {
        this.sending = null;
        this.queue.shift();
        this.pump();
      }, this.timing.answerWithin),
    };
  }

  /**
   * What the phone's Bluetooth says of the radio (modules/erevos-radio). Down, it links again a
   * while later, unless not `again`: not paired, or no Meshtastic radio.
   */
  meshState(state: 'connecting' | 'up' | 'down', detail = '', again = true): void {
    if (!this.address) return;
    if (state === 'connecting') {
      this.status = 'connecting';
    } else if (state === 'up') {
      // Linked: it tells its settings first, then what it hears.
      this.status = 'starting';
      this.mesh.write(wantConfig(CONFIG_ONLY));
    } else {
      this.status = 'down';
      this.detail = detail;
      this.idle();
      if (again && !this.reconnect) this.reconnect = setTimeout(() => this.connect(), this.timing.reconnectAfter);
    }
    this.changed();
  }

  /** A FromRadio the radio sent. */
  meshData(bytes: Uint8Array, now = Date.now()): void {
    let said: ReturnType<typeof readFromRadio>;
    try {
      said = readFromRadio(bytes);
    } catch {
      return;
    }
    if (said.kind === 'myInfo') {
      this.node = said.node;
    } else if (said.kind === 'nodeInfo') {
      if (said.node === this.node) this.name = said.longName;
    } else if (said.kind === 'lora') {
      this.region = said.region;
      this.transmits = said.txEnabled;
    } else if (said.kind === 'configComplete') {
      if (this.status !== 'starting' || said.id !== CONFIG_ONLY) return;
      this.status = 'up';
      this.changed();
      this.linkUp();
      this.pump();
    } else if (said.kind === 'rebooted') {
      this.idle();
      this.status = 'starting';
      this.mesh.write(wantConfig(CONFIG_ONLY));
      this.changed();
    } else if (said.kind === 'queue') {
      this.queueSaid(said.res, said.free, said.packetId);
    } else if (said.kind === 'packet') {
      if (said.portnum === PRIVATE_APP && said.from !== this.node) this.pieceIn(said.from, said.payload, now);
    }
  }

  private queueSaid(res: number, free: number, packetId: number) {
    this.full = free === 0;
    const sending = this.sending;
    if (sending && packetId === sending.id) {
      clearTimeout(sending.timer);
      this.sending = null;
      if (res === 0 || res === SHOULD_RELEASE) {
        this.queue.shift();
      } else {
        // Its queue is full, or it sent as much as its region allows for now: the same piece, later.
        this.resting = setTimeout(() => {
          this.resting = null;
          this.pump();
        }, this.timing.retryAfter);
      }
    }
    this.pump();
  }

  private pieceIn(from: number, piece: Uint8Array, now: number) {
    if (piece.length <= HEAD || piece[0] !== MAGIC[0] || piece[1] !== MAGIC[1]) return;
    const n = piece[MAGIC.length + 4] >> 4;
    const count = (piece[MAGIC.length + 4] & 0x0f) + 1;
    if (n >= count) return;
    const key = `${from} ${Array.from(piece.subarray(MAGIC.length, MAGIC.length + 4)).join('.')}`;
    for (const [other, g] of this.gathering) if (now - g.at > PIECES_WITHIN) this.gathering.delete(other);
    const g = this.gathering.get(key) ?? { pieces: new Array<Uint8Array | null>(count).fill(null), at: now };
    if (g.pieces.length !== count) return;
    g.pieces[n] = piece.slice(HEAD);
    this.gathering.set(key, g);
    while (this.gathering.size > MAX_GATHERING) this.gathering.delete(this.gathering.keys().next().value!);
    if (g.pieces.some((p) => p === null)) return;
    this.gathering.delete(key);
    const packet = new Uint8Array(g.pieces.reduce((sum, p) => sum + p!.length, 0));
    let offset = 0;
    for (const p of g.pieces) {
      packet.set(p!, offset);
      offset += p!.length;
    }
    const [text] = framesOf(packet) ?? [];
    const link = this.linkId();
    if (!text || !link) return;
    this.kept.push({ text, at: now });
    if (this.kept.length > MAX_KEPT) this.kept.shift();
    this.textListeners.forEach((listener) => listener(link, text));
  }
}
