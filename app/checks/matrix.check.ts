// Matrix accounts (lib/matrix.ts) against a small homeserver played here, with the real core built
// to WebAssembly for the keys (crates/erevos-matrix): signing in publishes the device's keys and,
// for an account without them, cross-signing keys, asking the password again as servers do; a chat
// started with someone is encrypted, they see the invite, join, and read what is sent; the server
// keeps only ciphertext; each side reads the other and its own; the state survives being kept as
// JSON between every step, as the app keeps it; a message the server gives again under another ID
// does not show twice; a device that signs in later gets the room's key for what comes after, and
// what came before stays locked to it.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { after, before, test } from 'node:test';

import { setCore, type Core } from '../lib/core';
import { findHomeserver, isMatrixId, joinRoom, roomList, sendText, setMatrixHttp, signIn, startChat, sync, type MatrixRequest, type MatrixState } from '../lib/matrix';
import { ChangedFileError, decryptFile, encryptFile, fetchFile, MATRIX_MOST, MatrixFileTooLargeError, mimeOfName, sendFile } from '../lib/matrix-media';

const built = new URL('./.core/erevos_ffi.js', import.meta.url);
// A core built before Matrix has no `matrix` call: built again, it has.
const coreReady = existsSync(built) && typeof (createRequire(import.meta.url)(built.pathname) as Record<string, unknown>).matrix === 'function';
if (!coreReady) console.log('Skipping the Matrix checks: build the core first with node checks/build-core.mjs');

type Json = Record<string, any>;
type Logged = { seq: number; room: string; event: Json };

const HS = 'https://matrix.example.org';
const PASSWORD = 'correct horse';

// A homeserver as far as lib/matrix.ts uses one: users, devices and their keys, rooms as one log
// of events, to-device messages waiting for each device, and what each was asked.
class Homeserver {
  readonly log: Logged[] = [];
  readonly tokens = new Map<string, { user: string; device: string }>();
  readonly deviceKeys = new Map<string, Map<string, Json>>();
  readonly oneTime = new Map<string, Json>();
  readonly fallback = new Map<string, Json>();
  readonly master = new Map<string, Json>();
  readonly toDevice = new Map<string, Json[]>();
  readonly changed: { seq: number; user: string }[] = [];
  readonly direct = new Map<string, Json>();
  readonly asked: string[] = [];
  private seq = 0;
  private made = 0;

  private next(): number {
    return ++this.seq;
  }

  private membership(room: string, user: string): string | null {
    let now: string | null = null;
    for (const { room: r, event } of this.log) if (r === room && event.type === 'm.room.member' && event.state_key === user) now = event.content.membership;
    return now;
  }

  private rooms(): string[] {
    return [...new Set(this.log.map((l) => l.room))];
  }

  private add(room: string, sender: string, type: string, content: Json, stateKey?: string, txn?: string): string {
    const event: Json = { type, sender, content, event_id: `$e${++this.made}`, origin_server_ts: Date.now() + this.made };
    if (stateKey !== undefined) event.state_key = stateKey;
    if (txn) event.unsigned = { transaction_id: txn };
    this.log.push({ seq: this.next(), room, event });
    return event.event_id;
  }

  /** Gives `event` again under another ID, as a server bent on a replay would. */
  replay(eventId: string): void {
    const found = this.log.find((l) => l.event.event_id === eventId)!;
    this.log.push({ seq: this.next(), room: found.room, event: { ...found.event, event_id: `$replay${++this.made}`, unsigned: undefined } });
  }

  /** Uploaded files, by their mxc:// address. */
  media = new Map<string, Uint8Array>();

  answer(request: MatrixRequest): { status: number; json: Json; bytes?: Uint8Array } {
    const url = new URL(request.url);
    if (url.pathname === '/_matrix/media/v3/upload') {
      const address = `mxc://example.org/m${++this.made}`;
      this.media.set(address, request.bytes!.slice());
      return { status: 200, json: { content_uri: address } };
    }
    const download = url.pathname.match(/^\/_matrix\/client\/v1\/media\/download\/([^/]+)\/([^/]+)$/);
    if (download) {
      const bytes = this.media.get(`mxc://${decodeURIComponent(download[1])}/${decodeURIComponent(download[2])}`);
      return bytes ? { status: 200, json: {}, bytes } : { status: 404, json: { errcode: 'M_NOT_FOUND' } };
    }
    const path = url.pathname.replace('/_matrix/client/v3', '');
    this.asked.push(`${request.method} ${path}`);
    const body = (request.body ?? {}) as Json;
    if (path === '/.well-known/matrix/client') return { status: 404, json: {} };
    if (path === '/login') {
      if (body.password !== PASSWORD) return { status: 403, json: { errcode: 'M_FORBIDDEN', error: 'Invalid password' } };
      const user = `@${body.identifier.user}:example.org`;
      const device = `DEV${++this.made}`;
      const token = `tok${this.made}`;
      this.tokens.set(token, { user, device });
      return { status: 200, json: { user_id: user, device_id: device, access_token: token } };
    }
    const who = this.tokens.get(request.token ?? '');
    if (!who) return { status: 401, json: { errcode: 'M_UNKNOWN_TOKEN', error: 'Unknown token' } };
    const { user, device } = who;
    const room = (part: string) => decodeURIComponent(part);
    let m: RegExpMatchArray | null;
    if (path === '/keys/upload') {
      if (body.device_keys) {
        if (!this.deviceKeys.has(user)) this.deviceKeys.set(user, new Map());
        this.deviceKeys.get(user)!.set(device, body.device_keys);
        this.changed.push({ seq: this.next(), user });
      }
      for (const [id, key] of Object.entries((body.one_time_keys ?? {}) as Json)) this.oneTime.set(`${user} ${device} ${id}`, key);
      for (const [id, key] of Object.entries((body.fallback_keys ?? {}) as Json)) this.fallback.set(`${user} ${device}`, { [id]: key });
      return { status: 200, json: { one_time_key_counts: { signed_curve25519: this.countOneTime(user, device) } } };
    }
    if (path === '/keys/query') {
      const device_keys: Json = {};
      const master_keys: Json = {};
      for (const u of Object.keys(body.device_keys)) {
        device_keys[u] = Object.fromEntries(this.deviceKeys.get(u) ?? []);
        if (this.master.has(u)) master_keys[u] = this.master.get(u);
      }
      return { status: 200, json: { device_keys, master_keys } };
    }
    if (path === '/keys/device_signing/upload') {
      if (!body.auth) return { status: 401, json: { session: 'uia1', flows: [{ stages: ['m.login.password'] }] } };
      if (body.auth.password !== PASSWORD || body.auth.session !== 'uia1') return { status: 401, json: { errcode: 'M_FORBIDDEN' } };
      this.master.set(user, body.master_key);
      return { status: 200, json: {} };
    }
    if (path === '/keys/signatures/upload') {
      for (const [u, byDevice] of Object.entries(body as Json)) {
        for (const [d, signed] of Object.entries(byDevice as Json)) {
          const keys = this.deviceKeys.get(u)?.get(d);
          if (keys) keys.signatures[u] = { ...keys.signatures[u], ...(signed as Json).signatures[u] };
        }
      }
      return { status: 200, json: { failures: {} } };
    }
    if (path === '/keys/claim') {
      const one_time_keys: Json = {};
      for (const [u, devices] of Object.entries(body.one_time_keys as Json)) {
        for (const d of Object.keys(devices as Json)) {
          const prefix = `${u} ${d} `;
          const id = [...this.oneTime.keys()].find((k) => k.startsWith(prefix));
          const key = id ? { [id.slice(prefix.length)]: this.oneTime.get(id) } : this.fallback.get(`${u} ${d}`);
          if (id) this.oneTime.delete(id);
          if (key) ((one_time_keys[u] ??= {}) as Json)[d] = key;
        }
      }
      return { status: 200, json: { one_time_keys } };
    }
    if ((m = path.match(/^\/sendToDevice\/([^/]+)\/[^/]+$/))) {
      for (const [u, devices] of Object.entries(body.messages as Json)) {
        for (const [d, content] of Object.entries(devices as Json)) {
          const key = `${u} ${d}`;
          this.toDevice.set(key, [...(this.toDevice.get(key) ?? []), { type: decodeURIComponent(m[1]), sender: user, content }]);
        }
      }
      return { status: 200, json: {} };
    }
    if (path === '/createRoom') {
      const id = `!r${++this.made}:example.org`;
      this.add(id, user, 'm.room.create', { creator: user }, '');
      this.add(id, user, 'm.room.member', { membership: 'join' }, user);
      for (const s of body.initial_state ?? []) this.add(id, user, s.type, s.content, s.state_key);
      for (const invited of body.invite ?? []) this.add(id, user, 'm.room.member', { membership: 'invite', is_direct: body.is_direct }, invited);
      return { status: 200, json: { room_id: id } };
    }
    if ((m = path.match(/^\/user\/[^/]+\/account_data\/m\.direct$/))) {
      this.direct.set(user, body);
      return { status: 200, json: {} };
    }
    if ((m = path.match(/^\/join\/(.+)$/))) {
      const id = room(m[1]);
      if (this.membership(id, user) !== 'invite') return { status: 403, json: { errcode: 'M_FORBIDDEN', error: 'Not invited' } };
      this.add(id, user, 'm.room.member', { membership: 'join' }, user);
      return { status: 200, json: { room_id: id } };
    }
    if ((m = path.match(/^\/rooms\/([^/]+)\/members$/))) {
      const id = room(m[1]);
      const latest = new Map<string, Json>();
      for (const l of this.log) if (l.room === id && l.event.type === 'm.room.member') latest.set(l.event.state_key, l.event);
      return { status: 200, json: { chunk: [...latest.values()].filter((e) => e.content.membership !== 'leave') } };
    }
    if ((m = path.match(/^\/rooms\/([^/]+)\/send\/([^/]+)\/([^/]+)$/))) {
      const id = room(m[1]);
      if (this.membership(id, user) !== 'join') return { status: 403, json: { errcode: 'M_FORBIDDEN' } };
      return { status: 200, json: { event_id: this.add(id, user, decodeURIComponent(m[2]), body, undefined, m[3]) } };
    }
    if (path.match(/^\/rooms\/[^/]+\/receipt\//)) return { status: 200, json: {} };
    if (path === '/sync') return { status: 200, json: this.sync(user, device, Number(url.searchParams.get('since') ?? 0)) };
    return { status: 404, json: { errcode: 'M_UNRECOGNIZED', error: path } };
  }

  private countOneTime(user: string, device: string): number {
    return [...this.oneTime.keys()].filter((k) => k.startsWith(`${user} ${device} `)).length;
  }

  private sync(user: string, device: string, since: number): Json {
    const join: Json = {};
    const invite: Json = {};
    for (const id of this.rooms()) {
      const now = this.membership(id, user);
      const events = this.log.filter((l) => l.room === id && l.seq > since).map((l) => l.event);
      if (now === 'join' && events.length) {
        const joinedNow = events.some((e) => e.type === 'm.room.member' && e.state_key === user && e.content.membership === 'join');
        const state = joinedNow ? this.log.filter((l) => l.room === id && l.seq <= since && l.event.state_key !== undefined).map((l) => l.event) : [];
        join[id] = { state: { events: state }, timeline: { events } };
      } else if (now === 'invite' && events.length) {
        invite[id] = { invite_state: { events: this.log.filter((l) => l.room === id && l.event.state_key !== undefined).map((l) => l.event) } };
      }
    }
    const key = `${user} ${device}`;
    const toDevice = this.toDevice.get(key) ?? [];
    this.toDevice.delete(key);
    const direct = this.direct.get(user);
    return {
      next_batch: String(this.seq),
      rooms: { join, invite },
      to_device: { events: toDevice },
      device_lists: { changed: [...new Set(this.changed.filter((c) => c.seq > since).map((c) => c.user))] },
      device_one_time_keys_count: { signed_curve25519: this.countOneTime(user, device) },
      device_unused_fallback_key_types: this.fallback.has(key) ? ['signed_curve25519'] : [],
      account_data: { events: direct ? [{ type: 'm.direct', content: direct }] : [] },
    };
  }
}

const server = new Homeserver();

// Each step keeps the state as the app does: as JSON, then read back.
const kept = (state: MatrixState): MatrixState => JSON.parse(JSON.stringify(state)) as MatrixState;

before(() => {
  if (!coreReady) return;
  const wasm = createRequire(import.meta.url)(built.pathname) as Record<string, (...args: never[]) => unknown>;
  setCore(Object.fromEntries(Object.entries(wasm).map(([name, fn]) => [name, async (...args: never[]) => fn(...args)])) as unknown as Core);
  setMatrixHttp(async (request) => server.answer(request));
});

after(() => setCore(null));

test('Matrix IDs and homeservers', { skip: !coreReady }, async () => {
  assert.ok(isMatrixId('@nekten:matrix.org'));
  assert.ok(!isMatrixId('nekten'));
  assert.equal(await findHomeserver('@nekten:matrix.example.org'), HS);
  assert.equal(await findHomeserver('https://matrix.example.org/'), HS);
});

test('a wrong password signs nobody in', { skip: !coreReady }, async () => {
  await assert.rejects(signIn(HS, 'alice', 'wrong'), /Invalid password/);
});

test('two people chat encrypted, and a device that comes later reads only from then on', { skip: !coreReady }, async () => {
  let alice = kept(await signIn(HS, '@alice:example.org', PASSWORD));
  let bob = kept(await signIn(HS, 'bob', PASSWORD));
  assert.equal(alice.userId, '@alice:example.org');

  // Cross-signing was set up with the password asked again, and signs Alice's device.
  assert.ok(alice.crossSigning);
  const aliceKeys = server.deviceKeys.get(alice.userId)!.get(alice.deviceId)!;
  assert.equal(Object.keys(aliceKeys.signatures[alice.userId]).length, 2);
  assert.ok(server.master.has(alice.userId));

  const room = await startChat(alice, '@bob:example.org');
  alice = kept(alice);
  assert.ok(room.encrypted);
  assert.deepEqual(server.direct.get(alice.userId), { '@bob:example.org': [room.id] });

  await sync(bob, 0);
  bob = kept(bob);
  assert.equal(bob.rooms[room.id].invitedBy, alice.userId);
  assert.equal(roomList(bob)[0].id, room.id);
  await joinRoom(bob, room.id);
  await sync(bob, 0);
  bob = kept(bob);

  await sync(alice, 0);
  const first = await sendText(alice, room.id, 'γεια σου, Bob');
  alice = kept(alice);
  assert.equal(first.state, undefined);
  // The server holds ciphertext only.
  assert.ok(!JSON.stringify(server.log).includes('γεια'));
  const onServer = server.log.find((l) => l.event.event_id === first.id)!.event;
  assert.equal(onServer.type, 'm.room.encrypted');

  assert.ok(await sync(bob, 0));
  bob = kept(bob);
  assert.deepEqual(
    bob.rooms[room.id].messages.map((m) => [m.sender, m.text]),
    [[alice.userId, 'γεια σου, Bob']],
  );

  await sendText(bob, room.id, 'καλώς σε βρήκα');
  bob = kept(bob);
  await sync(alice, 0);
  await sync(bob, 0);
  alice = kept(alice);
  bob = kept(bob);
  const texts = (s: MatrixState) => s.rooms[room.id].messages.map((m) => m.text);
  assert.deepEqual(texts(alice), ['γεια σου, Bob', 'καλώς σε βρήκα']);
  assert.deepEqual(texts(bob), ['γεια σου, Bob', 'καλώς σε βρήκα']);

  // The same ciphertext again under another ID is not read twice.
  server.replay(first.id);
  await sync(bob, 0);
  bob = kept(bob);
  assert.deepEqual(texts(bob).filter((t) => t === 'γεια σου, Bob').length, 1);

  // Bob signs in on a second device: Alice's next message reaches it, the earlier ones stay locked.
  let bob2 = kept(await signIn(HS, 'bob', PASSWORD));
  assert.equal(bob2.crossSigning, undefined);
  await sync(alice, 0);
  await sendText(alice, room.id, 'και στη νέα σου συσκευή');
  alice = kept(alice);
  await sync(bob2, 0);
  bob2 = kept(bob2);
  const seen = bob2.rooms[room.id].messages;
  assert.equal(seen.at(-1)!.text, 'και στη νέα σου συσκευή');
  assert.ok(seen.filter((m) => m.locked).length >= 2);
  // Bob's first device reads it too, with the key it already had.
  await sync(bob, 0);
  assert.equal(bob.rooms[room.id].messages.at(-1)!.text, 'και στη νέα σου συσκευή');
});

test('a photo goes encrypted, comes back whole, and a changed one is refused', { skip: !coreReady }, async () => {
  let alice = kept(await signIn(HS, '@alice:example.org', PASSWORD));
  let bob = kept(await signIn(HS, 'bob', PASSWORD));
  const room = await startChat(alice, '@bob:example.org');
  alice = kept(alice);
  await sync(bob, 0);
  await joinRoom(bob, room.id);
  await sync(bob, 0);
  bob = kept(bob);
  await sync(alice, 0);

  const photo = new TextEncoder().encode('JPEG of the sea at Kalamata '.repeat(40));
  await sendFile(alice, room.id, { name: 'sea.jpg', mime: 'image/jpeg', bytes: photo, w: 400, h: 300 });
  alice = kept(alice);
  // The homeserver keeps only ciphertext, and its name tells nothing.
  const stored = [...server.media.values()].at(-1)!;
  assert.equal(stored.length, photo.length);
  assert.ok(!new TextDecoder().decode(stored).includes('Kalamata'));
  assert.ok(!JSON.stringify(server.log).includes('sea.jpg'));

  await sync(bob, 0);
  bob = kept(bob);
  const message = bob.rooms[room.id].messages.at(-1)!;
  assert.equal(message.file?.kind, 'image');
  assert.equal(message.file?.name, 'sea.jpg');
  assert.deepEqual([message.file?.w, message.file?.h], [400, 300]);
  assert.deepEqual(await fetchFile(bob, message.file!), photo);

  // One byte changed on the server: the hash no longer matches.
  stored[0] ^= 1;
  await assert.rejects(fetchFile(bob, message.file!), ChangedFileError);
});

test('Matrix files: encrypted as other apps read them, too large ones refused', { skip: !coreReady }, async () => {
  const bytes = new Uint8Array(1000).map((_, i) => i % 251);
  const { data, file } = encryptFile(bytes);
  assert.equal(file.v, 'v2');
  assert.match(file.key.k, /^[A-Za-z0-9_-]{43}$/);
  assert.match(file.iv, /^[A-Za-z0-9+/]{22}$/);
  // The counter's lower half starts at zero.
  assert.ok(Buffer.from(file.iv + '==', 'base64').subarray(8).every((b) => b === 0));
  assert.deepEqual(decryptFile(data, file), bytes);
  const alice = kept(await signIn(HS, '@alice:example.org', PASSWORD));
  await assert.rejects(sendFile(alice, '!none:example.org', { name: 'big', mime: 'application/zip', bytes: new Uint8Array(MATRIX_MOST + 1) }), MatrixFileTooLargeError);
  assert.equal(mimeOfName('Report.PDF'), 'application/pdf');
});
