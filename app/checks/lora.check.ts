// Erevos over a Meshtastic LoRa radio (lib/lora.ts, lib/meshtastic.ts): phones with a radio each,
// and radios that speak as Meshtastic's do to the phone and hear each other on the air, carry
// nearby messages (lib/nearby.ts) sealed by the real Rust core built to WebAssembly by
// checks/build-core.mjs. The checks with the core are skipped, with a note, when that build is missing.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';

import { setCore, type Core } from '../lib/core';
import { randomBytes } from '../lib/crypto';
import { E2E, toBase64Url, type Received } from '../lib/e2e';
import { keepRadio, Lora, piecesOf, type LoraTiming, type RadioStore, type SavedRadio } from '../lib/lora';
import { ADMIN_APP, CONFIG_ONLY, fromRadio, PRIVATE_APP, quieted, readFromRadio, toRadioPacket, type FromRadio } from '../lib/meshtastic';
import { framesOf, Nearby, NoWayError, TooLargeForLoraError } from '../lib/nearby';
import { files } from './files-memory';

const require = createRequire(import.meta.url);
const built = new URL('./.core/erevos_ffi.js', import.meta.url);
const ready = existsSync(built);
if (ready) {
  const wasm = require(built.pathname) as Record<string, (...args: never[]) => unknown>;
  setCore(
    Object.fromEntries(Object.entries(wasm).map(([name, call]) => [name, async (...args: never[]) => call(...args)])) as unknown as Core,
  );
} else {
  console.log('Skipping the LoRa checks with the core: build it first with node checks/build-core.mjs');
}

const until = async (what: string, done: () => boolean, within = 5000) => {
  const start = Date.now();
  while (!done()) {
    if (Date.now() - start > within) throw new Error(`waited in vain for ${what}`);
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
};

const FAST: LoraTiming = { reconnectAfter: 30, answerWithin: 2000, retryAfter: 30, dropAfter: 60_000 };

/**
 * A Meshtastic radio as the phone sees it over Bluetooth: it tells its settings when asked, says
 * whether it took each packet (`answer`, Meshtastic's error code, or null for no word), and the
 * radios on the same air hear what it sends. Given settings, it restarts, as Meshtastic radios do
 * once the settings are committed; `takesSettings` false, it restarts without them.
 */
class Radio {
  readonly air: Radio[];
  readonly node: number;
  lora: Lora | null = null;
  up = false;
  connects = 0;
  written: { id: number; payload: Uint8Array }[] = [];
  answer: (id: number) => number | null = () => 0;
  // Its own settings, as Config.device and Config.position say them.
  device = fromRadio.device(0, 900);
  position = fromRadio.position(1, true, 600);
  admin: ReturnType<typeof fromRadio.admin>[] = [];
  takesSettings = true;
  private staged: { device?: Uint8Array; position?: Uint8Array; removeFixed?: boolean } = {};

  constructor(air: Radio[], node: number) {
    this.air = air;
    this.node = node;
    air.push(this);
  }

  connect() {
    this.connects++;
    setTimeout(() => {
      this.up = true;
      this.lora?.meshState('up');
    }, 1);
  }

  disconnect() {
    this.up = false;
  }

  write(bytes: Uint8Array): boolean {
    if (!this.up) return false;
    const said = fromRadio.read(bytes);
    const lora = this.lora!;
    if ('wantConfig' in said) {
      setTimeout(() => {
        for (const reply of [
          fromRadio.myInfo(this.node),
          fromRadio.nodeInfo(this.node, `Radio ${this.node}`, 'R'),
          fromRadio.nodeInfo(77, 'Someone else', 'S'),
          fromRadio.lora(3, 3),
          this.device,
          this.position,
          fromRadio.configComplete(said.wantConfig),
        ])
          lora.meshData(reply);
      }, 1);
      return true;
    }
    if (said.portnum === ADMIN_APP) {
      assert.equal(said.to, this.node, 'settings go to the own radio only');
      this.settings(fromRadio.admin(said.payload));
      return true;
    }
    assert.equal(said.portnum, PRIVATE_APP);
    assert.ok(said.wantAck);
    this.written.push({ id: said.id, payload: said.payload });
    const res = this.answer(said.id);
    setTimeout(() => {
      if (res === null) return;
      lora.meshData(fromRadio.queue(res, 15, said.id));
      if (res === 0) for (const other of this.air) if (other !== this && other.up) other.lora?.meshData(fromRadio.heard(this.node, bytes));
    }, 1);
    return true;
  }

  private settings(admin: ReturnType<typeof fromRadio.admin>) {
    this.admin.push(admin);
    if (admin.begin) this.staged = {};
    else if (admin.removeFixedPosition) this.staged.removeFixed = true;
    else if (admin.device) this.staged.device = admin.device;
    else if (admin.position) this.staged.position = admin.position;
    else if (admin.commit) {
      if (this.takesSettings) {
        if (this.staged.device) this.device = fromRadio.config(1, this.staged.device);
        if (this.staged.position) this.position = fromRadio.config(2, this.staged.position);
      }
      // It restarts: the phone's Bluetooth link drops, and it is back a moment later.
      setTimeout(() => {
        this.up = false;
        this.lora?.meshState('down', 'The radio is out of reach.');
      }, 1);
    }
  }
}

// What a radio's own settings say (FromRadio with Config.device or Config.position).
const deviceOf = (b: Uint8Array) => readFromRadio(b) as Extract<FromRadio, { kind: 'device' }>;
const roleOf = (b: Uint8Array) => deviceOf(b).role;
function positionOf(b: Uint8Array) {
  const position = readFromRadio(b) as Extract<FromRadio, { kind: 'position' }>;
  return { gpsMode: position.gpsMode, fixed: position.fixed, broadcastSecs: fromRadio.field(position.bytes, 1) };
}

/** A phone with a LoRa radio: its nearby messages over it, and what came. */
function phone(air: Radio[], node: number, timing = FAST) {
  const radio = new Radio(air, node);
  const lora = new Lora(radio, timing);
  radio.lora = lora;
  const nearby = new Nearby();
  const came: { link: string; packet: Uint8Array }[] = [];
  const links: string[] = [];
  nearby.start((link, text) => lora.sendFrame(link, text));
  lora.onLink((link) => {
    links.push(link);
    nearby.linkUp(link);
  });
  const listen = () =>
    lora.onText((link, text) => {
      const packet = nearby.frameIn(link, text);
      if (packet) came.push({ link, packet });
    });
  return { radio, lora, nearby, came, links, listen };
}

const message = (r: Received) => {
  assert.equal(r.kind, 'message');
  return r as Extract<Received, { kind: 'message' }>;
};

test('a packet goes in pieces that fit a Meshtastic packet', () => {
  for (const size of [1, 221, 222, 314, 1082, 1472, 3072]) {
    const packet = randomBytes(size);
    const pieces = piecesOf(packet)!;
    assert.ok(pieces.every((piece) => piece.length <= 228));
    assert.equal(pieces.length, Math.ceil(size / 221));
  }
  assert.equal(piecesOf(randomBytes(16 * 221 + 1)), null, 'too many pieces');
});

test('a radio turned on links, tells its name and region, and is one slow link', async () => {
  const air: Radio[] = [];
  const a = phone(air, 0x0a0b0c0d);
  assert.equal(a.lora.state().status, 'off');
  a.lora.turnOn('AA:BB');
  assert.equal(a.lora.state().status, 'connecting');
  await until('the link', () => a.links.length === 1);
  assert.equal(a.links[0], 'lora-0a0b0c0d');
  assert.deepEqual(a.lora.state(), { status: 'up', detail: '', address: 'AA:BB', name: 'Radio 168496141', region: 3, transmits: true, waiting: 0, notQuiet: false });
  // A slow link is not a phone nearby.
  assert.equal(a.nearby.count(), 0);
  // Gone, it links again a while later, as the same link.
  a.radio.up = false;
  a.lora.meshState('down', 'Out of reach');
  assert.deepEqual([a.lora.state().status, a.lora.state().detail], ['down', 'Out of reach']);
  await until('the link again', () => a.links.length === 2);
  assert.equal(a.radio.connects, 2);
  assert.equal(a.links[1], 'lora-0a0b0c0d');
  a.lora.turnOff();
  assert.equal(a.lora.state().status, 'off');
  assert.equal(a.radio.up, false);
});

test('with no relay and no phone near, a message goes over LoRa, end-to-end encrypted, and only when small', { skip: !ready }, async () => {
  files.clear();
  const air: Radio[] = [];
  const a = phone(air, 1);
  const b = phone(air, 2);
  a.listen();
  b.listen();
  a.lora.turnOn('A');
  b.lora.turnOn('B');
  await until('both links', () => a.links.length === 1 && b.links.length === 1);

  const alice = await E2E.open('space', 0, randomBytes(32));
  const bob = await E2E.open('space', 1, randomBytes(32));
  const { identity: bobId } = await alice.addContact({ senderHex: '', key: toBase64Url(bob.bundle) }, '');
  const hi = await alice.seal(bobId, 'over LoRa, no internet', '');
  assert.equal(await a.nearby.deliver(bobId, [hi.first!, hi.packet], null, null, true), 'lora');
  await until('both packets', () => b.came.length === 2);
  const [hello, text] = b.came.splice(0);
  assert.equal(message(await bob.receive(hello.packet)).request, true);
  const got = message(await bob.receive(text.packet));
  assert.equal(got.text, 'over LoRa, no internet');

  // Bob answers the contact heard on LoRa.
  b.nearby.heardOn(got.identity, text.link);
  assert.equal(b.nearby.isNear(got.identity), false, 'LoRa is not nearby');
  await bob.acceptRequest(got.identity);
  const answer = await bob.seal(got.identity, 'got it', '', { got: [got.tag] });
  assert.equal(await b.nearby.deliver(got.identity, answer.first ? [answer.first, answer.packet] : [answer.packet], null, null, true), 'lora');
  await until('the answer', () => a.came.length > 0);
  const back = a.came.splice(0);
  assert.deepEqual(message(await alice.receive(back[back.length - 1].packet)).got, [hi.tag]);

  // What is only a mark, or too large, as a voice message, does not go over LoRa.
  const written = a.radio.written.length;
  const mark = await alice.seal(bobId, '', '', { read: [got.tag] });
  await assert.rejects(a.nearby.deliver(bobId, [mark.packet], null, null, false), NoWayError);
  const voice = await alice.sealVoice(bobId, randomBytes(8000), 1000, '');
  await assert.rejects(a.nearby.deliver(bobId, voice.packets, null, null, true), TooLargeForLoraError);
  // With the relay up, it goes through the relay only.
  const later = await alice.seal(bobId, 'through the relay', '');
  assert.equal(await a.nearby.deliver(bobId, [later.packet], async () => undefined, null, true), 'relay');
  // The relay down, LoRa takes it.
  const down = async () => {
    throw new Error('Relay unreachable');
  };
  assert.equal(await a.nearby.deliver(bobId, [later.packet], down, null, true), 'lora');
  await until('its pieces', () => a.radio.written.length === written + Math.ceil(later.packet.length / 221));
  // A mark with the relay down: the relay's error, not LoRa.
  await assert.rejects(a.nearby.deliver(bobId, [mark.packet], down, null, false), /Relay unreachable/);
  a.lora.turnOff();
  b.lora.turnOff();
});

test('pieces wait for the radio to take each, and one it refused goes again, in order', async () => {
  const air: Radio[] = [];
  const a = phone(air, 1);
  const b = phone(air, 2);
  b.listen();
  a.lora.turnOn('A');
  b.lora.turnOn('B');
  await until('both links', () => a.links.length === 1 && b.links.length === 1);
  // The first try of each third piece: over the air time its region allows (Meshtastic's 9).
  let tries = 0;
  a.radio.answer = () => (++tries % 3 === 0 ? 9 : 0);
  const packets = [randomBytes(1082), randomBytes(314), randomBytes(1472)];
  for (const packet of packets) assert.equal(a.lora.sendFrame(a.links[0], framesOf(packet)![0]), true);
  await until('all three', () => b.came.length === 3);
  assert.deepEqual(
    b.came.map(({ packet }) => packet),
    packets,
  );
  // The pieces refused went again, each with a new id, as the radio drops an id it saw.
  const ids = a.radio.written.map(({ id }) => id);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(a.radio.written.length, tries);
  assert.ok(tries > 5 + 2 + 7);
  assert.equal(a.lora.state().waiting, 0);
  // A packet from this radio itself, heard back, is not taken.
  const own = toRadioPacket({ id: 5, channel: 0, portnum: PRIVATE_APP, payload: piecesOf(randomBytes(10))![0], hopLimit: 0, wantAck: true });
  b.lora.meshData(fromRadio.heard(2, own));
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(b.came.length, 3);
  a.lora.turnOff();
  b.lora.turnOff();
});

test('with too much waiting it takes no more, and says the link again once there is room', async () => {
  const air: Radio[] = [];
  const a = phone(air, 1, { ...FAST, answerWithin: 60_000 });
  a.lora.turnOn('A');
  await until('the link', () => a.links.length === 1);
  // The radio says nothing for now.
  const held: number[] = [];
  a.radio.answer = (id) => {
    held.push(id);
    return null;
  };
  let taken = 0;
  while ((await a.nearby.deliver('someone', [randomBytes(1082)], null, null, true).catch(() => 'none')) === 'lora') taken++;
  assert.equal(taken, 9, '48 pieces at most, 5 each');
  // Nearby took the link as gone: even a small one finds no way.
  await assert.rejects(a.nearby.deliver('someone', [randomBytes(300)], null, null, true), NoWayError);
  // The radio takes them now.
  a.radio.answer = () => 0;
  a.lora.meshData(fromRadio.queue(0, 15, held[0]));
  await until('the link said again', () => a.links.length === 2);
  assert.equal(await a.nearby.deliver('someone', [randomBytes(300)], null, null, true), 'lora');
  await until('all sent', () => a.lora.state().waiting === 0);
  a.lora.turnOff();
});

test('what came while no chat was open is kept for the next one', async () => {
  const air: Radio[] = [];
  const a = phone(air, 1);
  const b = phone(air, 2);
  a.lora.turnOn('A');
  b.lora.turnOn('B');
  await until('both links', () => a.links.length === 1 && b.links.length === 1);
  const packet = randomBytes(500);
  assert.equal(a.lora.sendFrame(a.links[0], framesOf(packet)![0]), true);
  await until('sent', () => a.lora.state().waiting === 0);
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.equal(b.came.length, 0);
  const stop = b.listen();
  assert.deepEqual(
    b.came.map((c) => c.packet),
    [packet],
  );
  stop();
  // Opened again: kept still, but taken already.
  b.listen();
  assert.equal(b.came.length, 1);
  a.lora.turnOff();
  b.lora.turnOff();
});

test('a radio asked only for its settings', async () => {
  const air: Radio[] = [];
  const a = phone(air, 9);
  let asked = 0;
  const write = a.radio.write.bind(a.radio);
  a.radio.write = (bytes) => {
    const said = fromRadio.read(bytes);
    if ('wantConfig' in said) asked = said.wantConfig;
    return write(bytes);
  };
  a.lora.turnOn('A');
  await until('the link', () => a.links.length === 1);
  assert.equal(asked, CONFIG_ONLY);
  // Rebooted, it is asked again, and the link stays the same.
  a.lora.meshData(Uint8Array.from([0x40, 0x01]));
  assert.equal(a.lora.state().status, 'starting');
  await until('up again', () => a.lora.state().status === 'up');
  assert.deepEqual(a.links, ['lora-00000009', 'lora-00000009']);
  a.lora.turnOff();
});

test('a slow link gets nothing carried for others, and says when something is too large for it', async () => {
  const sent: { link: string; text: string }[] = [];
  const near = new Nearby();
  near.start((link, text) => {
    sent.push({ link, text });
    return true;
  });
  const carry = async () => [{ url: 'wss://relay.example', sealed: randomBytes(400) }];
  near.linkUp('lora-00000001');
  // Only LoRa is up: the message goes on it, but not sealed for the relay, as phones nearby would carry it.
  assert.equal(await near.deliver('someone', [randomBytes(314)], null, carry, true), 'lora');
  assert.ok(sent.length > 0 && sent.every(({ text }) => text.startsWith('EVN1:')));
  // A phone nearby too: it gets the carried one, LoRa still does not.
  sent.length = 0;
  near.linkUp('ble-link-AA');
  assert.equal(await near.deliver('someone', [randomBytes(314)], null, carry, true), 'carried');
  assert.deepEqual(
    sent.filter(({ text }) => text.startsWith('EVC1:')).map(({ link }) => link),
    ['ble-link-AA'],
  );
  assert.ok(sent.some(({ link, text }) => link === 'lora-00000001' && text.startsWith('EVN1:')));
  // A new LoRa link is offered nothing carried; a new phone is.
  sent.length = 0;
  near.linkUp('lora-00000002');
  assert.equal(sent.length, 0);
  near.linkUp('ble-link-BB');
  assert.ok(sent.length > 0 && sent.every(({ link, text }) => link === 'ble-link-BB' && text.startsWith('EVC1:')));
  // Too large for LoRa, with only LoRa up: says so.
  const only = new Nearby();
  only.start(() => true);
  only.linkUp('lora-00000001');
  await assert.rejects(only.deliver('someone', [randomBytes(4154)], null, null, true), TooLargeForLoraError);
  await assert.rejects(only.deliver('someone', [randomBytes(300)], null, null, false), NoWayError);
});

/** The radio set, kept in memory as the phone's secure store would. */
function memoryStore(radio: SavedRadio): RadioStore & { radio: SavedRadio } {
  const store = {
    radio,
    get: async () => store.radio,
    set: async (next: SavedRadio) => {
      store.radio = JSON.parse(JSON.stringify(next)) as SavedRadio;
    },
  };
  return store;
}

test('Erevos keeps the radio from saying its name and where it is, unless it shares, and puts its settings back', async () => {
  const air: Radio[] = [];
  const a = phone(air, 1);
  const store = memoryStore({ address: 'A', name: 'Radio 1' });
  a.lora.onLink(() => void keepRadio(a.lora, store));
  a.lora.turnOn('A');
  // Linked, it is set quiet, restarts, and links again quiet.
  await until('quiet', () => roleOf(a.radio.device) === 8 && a.links.length === 2 && a.lora.state().status === 'up');
  assert.deepEqual(
    a.radio.admin.map((x) => Object.keys(x).filter((k) => k !== 'device' && k !== 'position' && x[k as keyof typeof x] !== undefined)),
    [['begin'], ['removeFixedPosition'], ['gpsMode', 'fixed'], ['role'], ['commit']],
  );
  assert.deepEqual(positionOf(a.radio.position), { gpsMode: 0, fixed: false, broadcastSecs: 600 });
  assert.equal(fromRadio.field(deviceOf(a.radio.device).bytes, 7), 900, 'the rest stays as it was');
  // What it was is kept, to put back.
  assert.ok(store.radio.kept);
  assert.equal(a.lora.state().notQuiet, false);
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(a.radio.admin.length, 5, 'quiet already: nothing more');

  // Sharing: its settings from before come back, once; the fixed position was removed with its place.
  store.radio = { ...store.radio, shares: true };
  await keepRadio(a.lora, store);
  await until('back as it was', () => roleOf(a.radio.device) === 0 && a.links.length === 3 && a.lora.state().status === 'up');
  assert.deepEqual(positionOf(a.radio.position), { gpsMode: 1, fixed: false, broadcastSecs: 600 });
  assert.equal(store.radio.kept, undefined);
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(a.radio.admin.length, 5 + 4);
  a.lora.turnOff();
});

test('a radio quiet already is left as it is, and one that never takes the settings is tried twice', async () => {
  const quiet = { device: deviceOf(fromRadio.device(8)).bytes, position: (readFromRadio(fromRadio.position(2, false)) as Extract<FromRadio, { kind: 'position' }>).bytes };
  assert.equal(quieted(quiet.device, quiet.position), null);
  assert.ok(quieted(quiet.device, (readFromRadio(fromRadio.position(1, false)) as Extract<FromRadio, { kind: 'position' }>).bytes), 'GPS on');
  const air: Radio[] = [];
  const a = phone(air, 1);
  a.radio.device = fromRadio.device(8);
  a.radio.position = fromRadio.position(2, false);
  const store = memoryStore({ address: 'A', name: 'Radio 1' });
  a.lora.onLink(() => void keepRadio(a.lora, store));
  a.lora.turnOn('A');
  await until('the link', () => a.links.length === 1);
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(a.radio.admin.length, 0);
  assert.equal(store.radio.kept, undefined);
  a.lora.turnOff();

  const b = phone(air, 2);
  b.radio.takesSettings = false;
  const other = memoryStore({ address: 'B', name: 'Radio 2' });
  b.lora.onLink(() => void keepRadio(b.lora, other));
  b.lora.turnOn('B');
  await until('three links', () => b.links.length === 3);
  await new Promise((resolve) => setTimeout(resolve, 100));
  assert.equal(b.radio.admin.filter((x) => x.commit).length, 2);
  assert.equal(b.links.length, 3);
  assert.equal(b.lora.state().notQuiet, true, 'the LoRa screen says so');
  b.lora.turnOff();
  assert.equal(b.lora.state().notQuiet, false);
});
