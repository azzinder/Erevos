import { utf8Decode, utf8Encode } from './crypto';

// The few messages of the Meshtastic client protocol that Erevos needs to send its packets over a
// Meshtastic LoRa radio (lib/lora.ts), as protobuf bytes: what the phone writes to the radio
// (ToRadio) and what it reads from it (FromRadio). The field numbers are Meshtastic's
// (meshtastic/protobufs: mesh.proto, config.proto, portnums.proto). Anything else in the
// messages is skipped.

/** Meshtastic's port for an app's own data, which other Meshtastic apps leave alone. */
export const PRIVATE_APP = 256;
/** Meshtastic's port for a radio's settings: to the phone's own radio, it needs no key. */
export const ADMIN_APP = 6;
// The role of a radio that says nothing of itself unless asked (Config.DeviceConfig.Role), and
// GPS modes (Config.PositionConfig.GpsMode).
const CLIENT_HIDDEN = 8;
const GPS_ENABLED = 1;
const GPS_NOT_PRESENT = 2;
/** The node number a packet to every radio in reach goes to. */
export const BROADCAST = 0xffffffff;
/**
 * The most a packet's data carries here, so that with its port number (3 bytes for one over 127)
 * and the bitfield the radio adds it fits the 239 bytes after the header on the air: 231, less a
 * few bytes spare. Meshtastic's DATA_PAYLOAD_LEN (233) counts on a smaller port number.
 */
export const MAX_PAYLOAD = 228;
/** Asks the radio for its settings without the nodes it heard of, which can be many (firmware 2.7 on; older ones send all). */
export const CONFIG_ONLY = 69420;

/** A packet to send on the mesh: to every radio, on a channel, with data for an app's port. */
export type Outgoing = { id: number; channel: number; portnum: number; payload: Uint8Array; hopLimit: number; wantAck: boolean };

/** What a FromRadio says, of what Erevos needs. */
export type FromRadio =
  | { kind: 'myInfo'; node: number }
  | { kind: 'nodeInfo'; node: number; longName: string; shortName: string }
  | { kind: 'lora'; region: number; hopLimit: number; txEnabled: boolean }
  | { kind: 'device'; bytes: Uint8Array; role: number }
  | { kind: 'position'; bytes: Uint8Array; gpsMode: number; fixed: boolean }
  | { kind: 'configComplete'; id: number }
  | { kind: 'queue'; res: number; free: number; packetId: number }
  | { kind: 'packet'; from: number; to: number; channel: number; id: number; portnum: number; payload: Uint8Array }
  | { kind: 'rebooted' }
  | { kind: 'other' };

// Writing.

function varint(out: number[], value: number) {
  let v = Math.max(0, Math.floor(value));
  while (v >= 0x80) {
    out.push((v % 0x80) | 0x80);
    v = Math.floor(v / 0x80);
  }
  out.push(v);
}

const key = (out: number[], field: number, wire: number) => varint(out, field * 8 + wire);

function uintField(out: number[], field: number, value: number) {
  if (!value) return;
  key(out, field, 0);
  varint(out, value);
}

function fixed32Field(out: number[], field: number, value: number) {
  key(out, field, 5);
  const v = value >>> 0;
  out.push(v & 0xff, (v >>> 8) & 0xff, (v >>> 16) & 0xff, v >>> 24);
}

function bytesField(out: number[], field: number, bytes: ArrayLike<number>) {
  key(out, field, 2);
  varint(out, bytes.length);
  for (let i = 0; i < bytes.length; i++) out.push(bytes[i]);
}

/** ToRadio asking for the radio's settings, answered with config_complete_id `id` at their end. */
export function wantConfig(id: number): Uint8Array {
  const out: number[] = [];
  key(out, 3, 0);
  varint(out, id >>> 0);
  return Uint8Array.from(out);
}

/** ToRadio with a packet to every radio in reach (MeshPacket to BROADCAST, decoded Data). */
export function toRadioPacket(outgoing: Outgoing): Uint8Array {
  return toRadio(BROADCAST, outgoing);
}

function toRadio(to: number, { id, channel, portnum, payload, hopLimit, wantAck }: Outgoing): Uint8Array {
  const data: number[] = [];
  uintField(data, 1, portnum);
  bytesField(data, 2, payload);
  const packet: number[] = [];
  fixed32Field(packet, 2, to);
  uintField(packet, 3, channel);
  bytesField(packet, 4, data);
  fixed32Field(packet, 6, id);
  uintField(packet, 9, hopLimit);
  if (wantAck) uintField(packet, 10, 1);
  const out: number[] = [];
  bytesField(out, 1, packet);
  return Uint8Array.from(out);
}

// Reading.

type Field = { field: number; wire: number; value: number; bytes: Uint8Array | null };

class Reader {
  private at = 0;
  private readonly bytes: Uint8Array;

  constructor(bytes: Uint8Array) {
    this.bytes = bytes;
  }

  done() {
    return this.at >= this.bytes.length;
  }

  position() {
    return this.at;
  }

  // A varint as a number: exact up to 2^53, which covers every field read here. A negative int32
  // comes as ten bytes, and reads as a large number.
  varint(): number {
    let value = 0;
    let scale = 1;
    for (let i = 0; i < 10; i++) {
      if (this.at >= this.bytes.length) throw new Error('Cut short');
      const byte = this.bytes[this.at++];
      if (scale < 2 ** 53) value += (byte & 0x7f) * scale;
      scale *= 0x80;
      if (byte < 0x80) return value;
    }
    throw new Error('Varint too long');
  }

  take(length: number): Uint8Array {
    if (length > this.bytes.length - this.at) throw new Error('Cut short');
    const out = this.bytes.subarray(this.at, this.at + length);
    this.at += length;
    return out;
  }

  next(): Field {
    const tag = this.varint();
    const field = Math.floor(tag / 8);
    const wire = tag % 8;
    if (wire === 0) return { field, wire, value: this.varint(), bytes: null };
    if (wire === 1) {
      const b = this.take(8);
      return { field, wire, value: (b[0] | (b[1] << 8) | (b[2] << 16) | (b[3] << 24)) >>> 0, bytes: b };
    }
    if (wire === 2) return { field, wire, value: 0, bytes: this.take(this.varint()) };
    if (wire === 5) {
      const b = this.take(4);
      return { field, wire, value: (b[0] | (b[1] << 8) | (b[2] << 16) | (b[3] << 24)) >>> 0, bytes: b };
    }
    throw new Error('Unknown wire type');
  }
}

function fields(bytes: Uint8Array): Field[] {
  const reader = new Reader(bytes);
  const out: Field[] = [];
  while (!reader.done()) out.push(reader.next());
  return out;
}

const first = (list: Field[], field: number) => list.find((f) => f.field === field);
const text = (f: Field | undefined) => (f?.bytes ? utf8Decode(f.bytes) : '');

function packetOf(bytes: Uint8Array): FromRadio {
  const packet = fields(bytes);
  const decoded = first(packet, 4)?.bytes;
  // One the radio could not open, on a channel it does not have, comes as `encrypted` (5): not for us.
  if (!decoded) return { kind: 'other' };
  const data = fields(decoded);
  return {
    kind: 'packet',
    from: first(packet, 1)?.value ?? 0,
    to: first(packet, 2)?.value ?? 0,
    channel: first(packet, 3)?.value ?? 0,
    id: first(packet, 6)?.value ?? 0,
    portnum: first(data, 1)?.value ?? 0,
    payload: first(data, 2)?.bytes?.slice() ?? new Uint8Array(0),
  };
}

/** Reads a FromRadio, or says it was nothing Erevos uses. Throws on bytes that are no protobuf. */
export function readFromRadio(bytes: Uint8Array): FromRadio {
  for (const f of fields(bytes)) {
    if (f.field === 2 && f.bytes) return packetOf(f.bytes);
    if (f.field === 3 && f.bytes) return { kind: 'myInfo', node: first(fields(f.bytes), 1)?.value ?? 0 };
    if (f.field === 4 && f.bytes) {
      const info = fields(f.bytes);
      const user = first(info, 2)?.bytes;
      const said = user ? fields(user) : [];
      return { kind: 'nodeInfo', node: first(info, 1)?.value ?? 0, longName: text(first(said, 2)), shortName: text(first(said, 3)) };
    }
    if (f.field === 5 && f.bytes) {
      // Config: of its settings, the LoRa ones (6), and those that say who and where it is.
      const config = fields(f.bytes);
      const lora = first(config, 6)?.bytes;
      const device = first(config, 1)?.bytes;
      const position = first(config, 2)?.bytes;
      if (lora) {
        const set = fields(lora);
        // tx_enabled (9) is false unless set, and the Meshtastic app sets it when it sets the region.
        return { kind: 'lora', region: first(set, 7)?.value ?? 0, hopLimit: first(set, 8)?.value ?? 0, txEnabled: first(set, 9)?.value === 1 };
      }
      if (device) return { kind: 'device', bytes: device.slice(), role: first(fields(device), 1)?.value ?? 0 };
      if (position) {
        const set = fields(position);
        return { kind: 'position', bytes: position.slice(), gpsMode: first(set, 13)?.value ?? 0, fixed: first(set, 3)?.value === 1 };
      }
      return { kind: 'other' };
    }
    if (f.field === 7 && f.wire === 0) return { kind: 'configComplete', id: f.value };
    if (f.field === 8) return { kind: 'rebooted' };
    if (f.field === 11 && f.bytes) {
      const queue = fields(f.bytes);
      const res = first(queue, 1)?.value ?? 0;
      return { kind: 'queue', res: res > 0x7fffffff ? -1 : res, free: first(queue, 2)?.value ?? 0, packetId: first(queue, 4)?.value ?? 0 };
    }
  }
  return { kind: 'other' };
}

// The radio's own settings.

// A message as it was, but with a varint field set anew: left out when 0, as protobuf has it.
function withVarint(bytes: Uint8Array, field: number, value: number): Uint8Array {
  const reader = new Reader(bytes);
  const out: number[] = [];
  while (!reader.done()) {
    const start = reader.position();
    const f = reader.next();
    if (f.field !== field) for (const b of bytes.subarray(start, reader.position())) out.push(b);
  }
  uintField(out, field, value);
  return Uint8Array.from(out);
}

/** A setting for the phone's own radio, in an AdminMessage. */
export type Admin = { begin: true } | { commit: true } | { removeFixedPosition: true } | { device: Uint8Array } | { position: Uint8Array };

/**
 * The radio's device and position settings (Config.device, Config.position, as it sent them) made
 * quiet: the role that says nothing of itself unless asked (Client hidden), its GPS off and no fixed
 * position, the rest as it was. The settings to send, or null when it is quiet already.
 */
export function quieted(device: Uint8Array, position: Uint8Array): Admin[] | null {
  const role = first(fields(device), 1)?.value ?? 0;
  const set = fields(position);
  const gps = first(set, 13)?.value ?? 0;
  const fixed = first(set, 3)?.value === 1;
  if (role === CLIENT_HIDDEN && gps !== GPS_ENABLED && !fixed) return null;
  const quietPosition = withVarint(withVarint(position, 13, gps === GPS_NOT_PRESENT ? GPS_NOT_PRESENT : 0), 3, 0);
  // Position first: the role's own defaults, set with it, then stay.
  return [...(fixed ? [{ removeFixedPosition: true as const }] : []), { position: quietPosition }, { device: withVarint(device, 1, CLIENT_HIDDEN) }];
}

/**
 * The settings to put back on a radio made quiet, as they were before (Config.device and
 * Config.position). A fixed position was removed with its place, so it stays off: it is set again
 * in the Meshtastic app.
 */
export function restored(device: Uint8Array, position: Uint8Array): Admin[] {
  // Position first, as the role, set back, may change it.
  return [{ position: withVarint(position, 3, 0) }, { device }];
}

/** ToRadio with a setting for the phone's own radio, node `node`, which takes it with no key. */
export function toRadioAdmin(node: number, id: number, admin: Admin): Uint8Array {
  const message: number[] = [];
  if ('begin' in admin) uintField(message, 64, 1);
  else if ('commit' in admin) uintField(message, 65, 1);
  else if ('removeFixedPosition' in admin) uintField(message, 42, 1);
  else {
    const config: number[] = [];
    bytesField(config, 'device' in admin ? 1 : 2, 'device' in admin ? admin.device : admin.position);
    bytesField(message, 34, config);
  }
  return toRadio(node, { id, channel: 0, portnum: ADMIN_APP, payload: Uint8Array.from(message), hopLimit: 0, wantAck: false });
}

// The other side, for the checks: what the radio sends to the phone.

/** FromRadio bytes as a Meshtastic radio sends them, for the checks' radio (checks/lora.check.ts). */
export const fromRadio = {
  myInfo(node: number): Uint8Array {
    const info: number[] = [];
    uintField(info, 1, node);
    const out: number[] = [];
    bytesField(out, 3, info);
    return Uint8Array.from(out);
  },
  nodeInfo(node: number, longName: string, shortName: string): Uint8Array {
    const user: number[] = [];
    bytesField(user, 1, utf8Encode(`!${node.toString(16).padStart(8, '0')}`));
    bytesField(user, 2, utf8Encode(longName));
    bytesField(user, 3, utf8Encode(shortName));
    const info: number[] = [];
    uintField(info, 1, node);
    bytesField(info, 2, user);
    const out: number[] = [];
    bytesField(out, 4, info);
    return Uint8Array.from(out);
  },
  lora(region: number, hopLimit: number, txEnabled = true): Uint8Array {
    const lora: number[] = [];
    uintField(lora, 1, 1);
    uintField(lora, 7, region);
    uintField(lora, 8, hopLimit);
    if (txEnabled) uintField(lora, 9, 1);
    const config: number[] = [];
    bytesField(config, 6, lora);
    const out: number[] = [];
    bytesField(out, 5, config);
    return Uint8Array.from(out);
  },
  /** Config.device with a role and node_info_broadcast_secs, and Config.position with GPS mode and a fixed position. */
  device(role: number, nodeInfoSecs = 10800): Uint8Array {
    const device: number[] = [];
    uintField(device, 1, role);
    uintField(device, 7, nodeInfoSecs);
    const config: number[] = [];
    bytesField(config, 1, device);
    const out: number[] = [];
    bytesField(out, 5, config);
    return Uint8Array.from(out);
  },
  position(gpsMode: number, fixed: boolean, broadcastSecs = 900): Uint8Array {
    const position: number[] = [];
    uintField(position, 1, broadcastSecs);
    if (fixed) uintField(position, 3, 1);
    uintField(position, 13, gpsMode);
    const config: number[] = [];
    bytesField(config, 2, position);
    const out: number[] = [];
    bytesField(out, 5, config);
    return Uint8Array.from(out);
  },
  /** FromRadio with Config.device (1) or Config.position (2) as these bytes say it. */
  config(which: 1 | 2, bytes: Uint8Array): Uint8Array {
    const config: number[] = [];
    bytesField(config, which, bytes);
    const out: number[] = [];
    bytesField(out, 5, config);
    return Uint8Array.from(out);
  },
  /** A varint field of a message, 0 when left out. */
  field(bytes: Uint8Array, field: number): number {
    return first(fields(bytes), field)?.value ?? 0;
  },
  configComplete(id: number): Uint8Array {
    const out: number[] = [];
    key(out, 7, 0);
    varint(out, id >>> 0);
    return Uint8Array.from(out);
  },
  queue(res: number, free: number, packetId: number): Uint8Array {
    const queue: number[] = [];
    uintField(queue, 1, res);
    uintField(queue, 2, free);
    uintField(queue, 3, 16);
    uintField(queue, 4, packetId);
    const out: number[] = [];
    bytesField(out, 11, queue);
    return Uint8Array.from(out);
  },
  /** A packet the radio heard, from `from`, as ToRadio of the phone that sent it had it. */
  heard(from: number, toRadio: Uint8Array): Uint8Array {
    const sent = fields(toRadio);
    const packet = first(sent, 1)?.bytes;
    if (!packet) throw new Error('No packet in it');
    const out: number[] = [];
    const heard: number[] = [];
    fixed32Field(heard, 1, from);
    for (let i = 0; i < packet.length; i++) heard.push(packet[i]);
    bytesField(out, 2, heard);
    return Uint8Array.from(out);
  },
  /** What the phone wrote: a want_config_id, or a packet's id and data. */
  read(toRadio: Uint8Array): { wantConfig: number } | { to: number; id: number; channel: number; portnum: number; payload: Uint8Array; hopLimit: number; wantAck: boolean } {
    const sent = fields(toRadio);
    const want = first(sent, 3);
    if (want) return { wantConfig: want.value };
    const packet = fields(first(sent, 1)?.bytes ?? new Uint8Array(0));
    const data = fields(first(packet, 4)?.bytes ?? new Uint8Array(0));
    return {
      to: first(packet, 2)?.value ?? 0,
      id: first(packet, 6)?.value ?? 0,
      channel: first(packet, 3)?.value ?? 0,
      portnum: first(data, 1)?.value ?? 0,
      payload: first(data, 2)?.bytes?.slice() ?? new Uint8Array(0),
      hopLimit: first(packet, 9)?.value ?? 0,
      wantAck: first(packet, 10)?.value === 1,
    };
  },
  /** What an AdminMessage the phone wrote sets: as `Admin`, the configs' role, GPS mode and fixed position read. */
  admin(payload: Uint8Array): { begin?: true; commit?: true; removeFixedPosition?: true; role?: number; gpsMode?: number; fixed?: boolean; device?: Uint8Array; position?: Uint8Array } {
    const message = fields(payload);
    if (first(message, 64)) return { begin: true };
    if (first(message, 65)) return { commit: true };
    if (first(message, 42)) return { removeFixedPosition: true };
    const config = fields(first(message, 34)?.bytes ?? new Uint8Array(0));
    const device = first(config, 1)?.bytes;
    if (device) return { device: device.slice(), role: first(fields(device), 1)?.value ?? 0 };
    const position = first(config, 2)?.bytes ?? new Uint8Array(0);
    const set = fields(position);
    return { position: position.slice(), gpsMode: first(set, 13)?.value ?? 0, fixed: first(set, 3)?.value === 1 };
  },
};
