// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

/**
 * Erevos phones and computers on the same Wi-Fi or a phone's hotspot, with no internet: links the
 * app's nearby messages (app/lib/nearby.ts) go over, as over Bluetooth on a phone. The phone's
 * side is the same, in app/modules/erevos-radio (LanLink.kt).
 *
 * - Each one says it is there every few seconds, by UDP broadcast on port 47905: `EVL1 <nonce>
 *   <port>`, a random nonce for each start and the TCP port it listens on (47905 when free).
 * - On hearing another, the one with the lower nonce connects, or either does when no link came
 *   after a few seconds. A link is a TCP connection carrying frames: a 4-byte big-endian length,
 *   then the payload (crates/erevos-core/src/frame.rs). The first frame each way is `EVL1 <nonce>`.
 * - Then each frame is UTF-8 text: what the app sends, sealed end-to-end already, or `EVL1`
 *   alone, sent every few seconds to say the link is still there. A link nothing came on for a
 *   while is closed. When two links come up to one, both keep the one the lower nonce opened.
 *
 * Anyone on the network hears that an Erevos app is there; nothing else in the broadcast says who.
 */
const crypto = require('node:crypto');
const dgram = require('node:dgram');
const net = require('node:net');
const os = require('node:os');

const PORT = 47905;
const ANNOUNCE_EVERY = 3000;
// Nothing on a link for this long, it is closed; not heard for this long, one is forgotten.
const GONE_AFTER = 15_000;
const STILL_HERE = Buffer.from('EVL1', 'latin1');
// Heard for this long with no link, the one with the higher nonce connects too.
const DIAL_ANYWAY_AFTER = 6000;
const HELLO_WITHIN = 5000;
const MAX_LINKS = 16;
// Others heard at once: anyone on the network can say any nonce from any address, so a flood of
// them is not let grow without end, nor dialed.
const MAX_HEARD = 64;
const MAX_FRAME = 16 * 1024 + 64;
const ANNOUNCE = /^EVL1 ([0-9a-f]{16}) ([0-9]{1,5})$/;
const HELLO = /^EVL1 ([0-9a-f]{16})$/;

/** Where to broadcast: everywhere on each IPv4 network this computer is on. */
function broadcasts(port) {
  const out = new Set(['255.255.255.255']);
  for (const addresses of Object.values(os.networkInterfaces())) {
    for (const a of addresses ?? []) {
      if (a.family !== 'IPv4' || a.internal) continue;
      const ip = a.address.split('.').map(Number);
      const mask = a.netmask.split('.').map(Number);
      out.add(ip.map((part, i) => (part & mask[i]) | (~mask[i] & 255)).join('.'));
    }
  }
  return [...out].map((address) => ({ address, port }));
}

function frame(payload) {
  const head = Buffer.alloc(4);
  head.writeUInt32BE(payload.length);
  return Buffer.concat([head, payload]);
}

/** Cuts what comes on a socket into frames, calling `onFrame` with each. False when it is not frames. */
function framer(onFrame) {
  let held = Buffer.alloc(0);
  return (chunk) => {
    held = Buffer.concat([held, chunk]);
    while (held.length >= 4) {
      const length = held.readUInt32BE(0);
      if (length > MAX_FRAME) return false;
      if (held.length < 4 + length) break;
      const payload = held.subarray(4, 4 + length);
      held = held.subarray(4 + length);
      onFrame(Buffer.from(payload));
    }
    return true;
  };
}

class Lan {
  /**
   * `onLink(id)`, `onGone(id)` and `onText(id, text)` tell what happens. `udpPort`, `tcpPort` and
   * `targets` (where to broadcast, as `() => [{ address, port }]`) are there for checks.
   */
  constructor({ onLink, onGone, onText, onLog = () => {}, udpPort = PORT, tcpPort = PORT, targets = () => broadcasts(udpPort) }) {
    Object.assign(this, { onLink, onGone, onText, onLog, udpPort, tcpPort, targets });
    this.nonce = '';
    this.links = new Map(); // id → { id, nonce, socket, mine, at }
    this.heard = new Map(); // nonce → { at, first }
    this.dialing = new Set();
    this.counter = 0;
    this.running = false;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.nonce = crypto.randomBytes(8).toString('hex');
    this.server = net.createServer((socket) => this.accepted(socket));
    this.server.on('error', (error) => {
      // The usual port is taken (another Erevos on this computer): any free one will do.
      if (error.code === 'EADDRINUSE' && this.port !== 0) {
        this.port = 0;
        this.server.listen(0);
      } else this.onLog(`Same Wi-Fi: ${error.message}`);
    });
    this.port = this.tcpPort;
    this.server.listen(this.port);
    this.udp = dgram.createSocket({ type: 'udp4', reuseAddr: true });
    this.udp.on('message', (message, from) => this.announced(message.toString('latin1'), from.address));
    this.udp.on('error', (error) => this.onLog(`Same Wi-Fi: ${error.message}`));
    this.udp.bind(this.udpPort, () => {
      this.udp.setBroadcast(true);
      this.announce();
    });
    this.timer = setInterval(() => {
      this.announce();
      this.sweep();
    }, ANNOUNCE_EVERY);
  }

  stop() {
    if (!this.running) return;
    this.running = false;
    clearInterval(this.timer);
    this.udp.close();
    this.server.close();
    for (const link of [...this.links.values()]) link.socket.destroy();
    this.links.clear();
    this.heard.clear();
    this.dialing.clear();
  }

  /** Sends one text frame on a link. False when there is no such link. */
  send(id, text) {
    const link = this.links.get(id);
    const payload = Buffer.from(text, 'utf8');
    if (!link || payload.length > MAX_FRAME) return false;
    link.socket.write(frame(payload));
    return true;
  }

  announce() {
    const port = this.server.address()?.port;
    if (!port || !this.running) return;
    const message = Buffer.from(`EVL1 ${this.nonce} ${port}`, 'latin1');
    for (const { address, port: to } of this.targets()) {
      this.udp.send(message, to, address, () => {
        // A network that is gone, or refuses broadcasts: the others still go.
      });
    }
  }

  announced(text, address) {
    const match = ANNOUNCE.exec(text);
    if (!match || !this.running) return;
    const [, nonce, port] = match;
    if (nonce === this.nonce) return;
    if (!this.heard.has(nonce) && this.heard.size >= MAX_HEARD) return;
    const now = Date.now();
    const heard = this.heard.get(nonce) ?? { first: now };
    heard.at = now;
    this.heard.set(nonce, heard);
    if (this.linkTo(nonce) || this.dialing.has(nonce) || this.links.size + this.dialing.size >= MAX_LINKS) return;
    if (this.nonce < nonce || now - heard.first > DIAL_ANYWAY_AFTER) this.dial(nonce, address, Number(port));
  }

  linkTo(nonce) {
    for (const link of this.links.values()) if (link.nonce === nonce) return link;
    return null;
  }

  dial(nonce, address, port) {
    this.dialing.add(nonce);
    const socket = net.connect({ host: address, port, timeout: HELLO_WITHIN });
    socket.on('connect', () => socket.write(frame(Buffer.from(`EVL1 ${this.nonce}`, 'latin1'))));
    socket.on('error', () => undefined);
    socket.on('close', () => this.dialing.delete(nonce));
    this.greet(socket, true, nonce);
  }

  accepted(socket) {
    if (this.links.size >= MAX_LINKS) return socket.destroy();
    socket.setTimeout(HELLO_WITHIN);
    socket.on('error', () => undefined);
    this.greet(socket, false, null);
  }

  // Waits for the other's first frame, then the link is up. The one connecting says its nonce
  // first; the one connected to answers with its own.
  greet(socket, mine, expected) {
    let link = null;
    const take = framer((payload) => {
      if (link) {
        link.at = Date.now();
        if (!payload.equals(STILL_HERE)) this.onText(link.id, payload.toString('utf8'));
        return;
      }
      const match = HELLO.exec(payload.toString('latin1'));
      const nonce = match?.[1];
      if (!nonce || nonce === this.nonce || (expected && nonce !== expected)) return socket.destroy();
      if (!mine) socket.write(frame(Buffer.from(`EVL1 ${this.nonce}`, 'latin1')));
      link = this.up(socket, nonce, mine);
    });
    socket.on('data', (chunk) => {
      if (!take(chunk)) socket.destroy();
    });
    socket.on('timeout', () => {
      if (!link) socket.destroy();
    });
    socket.on('close', () => {
      if (link && this.links.get(link.id) === link) {
        this.links.delete(link.id);
        this.onGone(link.id);
      }
    });
  }

  up(socket, nonce, mine) {
    socket.setTimeout(0);
    socket.setNoDelay(true);
    const link = { id: `lan-${++this.counter}`, nonce, socket, mine, at: Date.now() };
    this.dialing.delete(nonce);
    // Two links to one: both ends keep the one the lower nonce opened.
    const other = this.linkTo(nonce);
    if (other) {
      const keepNew = mine === (this.nonce < nonce);
      const drop = keepNew ? other : link;
      if (drop === link) {
        socket.destroy();
        return null;
      }
      this.links.delete(other.id);
      other.socket.destroy();
      this.onGone(other.id);
    }
    this.links.set(link.id, link);
    this.onLink(link.id);
    return link;
  }

  // Each link says it is still there; one nothing came on for a while goes, as do those not heard.
  sweep() {
    const now = Date.now();
    for (const link of [...this.links.values()]) {
      if (now - link.at > GONE_AFTER) link.socket.destroy();
      else link.socket.write(frame(STILL_HERE));
    }
    for (const [nonce, heard] of this.heard) if (now - heard.at > GONE_AFTER) this.heard.delete(nonce);
  }
}

module.exports = { Lan, PORT };
