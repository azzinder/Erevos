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
import { setThroughTor } from '../lib/relay';
import { defaultMatrixHttp, findHomeserver, isMatrixId, matrixThroughTor, joinRoom, roomList, sendText, setMatrixHttp, signIn, startChat, sync, type MatrixRequest, type MatrixState } from '../lib/matrix';
import { ChangedFileError, decryptFile, encryptFile, fetchFile, MATRIX_MOST, MatrixFileTooLargeError, mimeOfName, sendFile } from '../lib/matrix-media';
import { inboxParts, matrixInboxRows, showsIn } from '../lib/inbox';
import { backUpKeys, keyOfRecovery, recoveryKeyOf, setUpRecovery, unlockRecovery, WrongRecoveryError } from '../lib/matrix-backup';
import { acceptVerification, confirmVerification, isVerified, requestVerification, verifications } from '../lib/matrix-verify';

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
  readonly selfSigning = new Map<string, Json>();
  readonly userSigning = new Map<string, Json>();
  /** Account data by `${user} ${type}`. */
  readonly accountData = new Map<string, Json>();
  /** The key backup: its version, and its keys by `${user} ${room} ${session}`. */
  readonly backups = new Map<string, Json>();
  readonly backupKeys = new Map<string, Json>();
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
      const self_signing_keys: Json = {};
      const user_signing_keys: Json = {};
      for (const u of Object.keys(body.device_keys)) {
        device_keys[u] = Object.fromEntries(this.deviceKeys.get(u) ?? []);
        if (this.master.has(u)) master_keys[u] = this.master.get(u);
        if (this.selfSigning.has(u)) self_signing_keys[u] = this.selfSigning.get(u);
        if (u === user && this.userSigning.has(u)) user_signing_keys[u] = this.userSigning.get(u);
      }
      return { status: 200, json: { device_keys, master_keys, self_signing_keys, user_signing_keys } };
    }
    if (path === '/keys/device_signing/upload') {
      if (!body.auth) return { status: 401, json: { session: 'uia1', flows: [{ stages: ['m.login.password'] }] } };
      if (body.auth.password !== PASSWORD || body.auth.session !== 'uia1') return { status: 401, json: { errcode: 'M_FORBIDDEN' } };
      this.master.set(user, body.master_key);
      this.selfSigning.set(user, body.self_signing_key);
      this.userSigning.set(user, body.user_signing_key);
      return { status: 200, json: {} };
    }
    if (path === '/keys/signatures/upload') {
      for (const [u, byDevice] of Object.entries(body as Json)) {
        for (const [d, signed] of Object.entries(byDevice as Json)) {
          const keys = this.deviceKeys.get(u)?.get(d) ?? (Object.values(this.master.get(u)?.keys ?? {}).includes(d) ? this.master.get(u) : undefined);
          if (keys) for (const [signer, made] of Object.entries((signed as Json).signatures)) keys.signatures[signer] = { ...keys.signatures[signer], ...(made as Json) };
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
          for (const each of d === '*' ? [...(this.deviceKeys.get(u)?.keys() ?? [])] : [d]) {
            const key = `${u} ${each}`;
            this.toDevice.set(key, [...(this.toDevice.get(key) ?? []), { type: decodeURIComponent(m[1]), sender: user, content }]);
          }
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
    if ((m = path.match(/^\/user\/[^/]+\/account_data\/([^/]+)$/))) {
      const key = `${user} ${decodeURIComponent(m[1])}`;
      if (request.method === 'PUT') this.accountData.set(key, body);
      const found = this.accountData.get(key);
      return request.method === 'PUT' || found ? { status: 200, json: found ?? {} } : { status: 404, json: { errcode: 'M_NOT_FOUND' } };
    }
    if (path === '/room_keys/version') {
      if (request.method === 'POST') this.backups.set(user, { ...body, version: String(++this.made) });
      const found = this.backups.get(user);
      if (request.method === 'POST') return { status: 200, json: { version: found!.version } };
      return found ? { status: 200, json: found } : { status: 404, json: { errcode: 'M_NOT_FOUND' } };
    }
    if (path === '/room_keys/keys' && request.method === 'PUT') {
      for (const [r, { sessions }] of Object.entries(body.rooms as Record<string, { sessions: Json }>)) {
        for (const [sid, data] of Object.entries(sessions)) this.backupKeys.set(`${user} ${r} ${sid}`, data);
      }
      return { status: 200, json: { count: this.backupKeys.size } };
    }
    if ((m = path.match(/^\/room_keys\/keys\/([^/]+)\/([^/?]+)$/))) {
      const found = this.backupKeys.get(`${user} ${decodeURIComponent(m[1])} ${decodeURIComponent(m[2])}`);
      return found ? { status: 200, json: found } : { status: 404, json: { errcode: 'M_NOT_FOUND' } };
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

let wasmCore: Core | null = null;

before(() => {
  if (!coreReady) return;
  const wasm = createRequire(import.meta.url)(built.pathname) as Record<string, (...args: never[]) => unknown>;
  wasmCore = Object.fromEntries(Object.entries(wasm).map(([name, fn]) => [name, async (...args: never[]) => fn(...args)])) as unknown as Core;
  setCore(wasmCore);
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

test('Matrix rooms are rows of the home list, with a part of their own', () => {
  const state = {
    userId: '@me:example.org',
    rooms: {
      '!a:example.org': { id: '!a:example.org', name: 'Anna', members: {}, encrypted: true, direct: true, unread: 2, messages: [{ id: '$1', sender: '@anna:example.org', ts: 5000, text: 'hi\nthere' }] },
      '!b:example.org': { id: '!b:example.org', name: 'Club', members: { '@bo:example.org': { membership: 'join', name: 'Bo' } }, encrypted: true, direct: false, unread: 0, messages: [], invitedBy: '@bo:example.org' },
    },
  } as unknown as MatrixState;
  const rows = matrixInboxRows(state, 9000);
  const anna = rows.find((r) => r.identity === 'matrix:!a:example.org')!;
  assert.deepEqual([anna.last, anna.unread, anna.at, anna.mine, anna.network], ['hi\nthere', 2, 5000, false, 'matrix']);
  const club = rows.find((r) => r.invited)!;
  assert.deepEqual([club.last, club.unread, club.at], ['Invited by Bo', 1, 9000]);
  assert.deepEqual([showsIn(anna, 'matrix'), showsIn(anna, 'erevos'), showsIn(anna, 'sms'), showsIn(anna, 'all')], [true, false, false, true]);
  assert.deepEqual(inboxParts([], true), ['matrix']);
  assert.deepEqual(inboxParts(rows, false), ['matrix']);
});

test('two people check each other by emoji in their chat, and see the same seven', { skip: !coreReady }, async () => {
  const alice = await signIn(HS, '@dave:example.org', PASSWORD);
  const bob = await signIn(HS, 'erin', PASSWORD);
  const room = await startChat(alice, bob.userId);
  await sync(bob, 0);
  await joinRoom(bob, room.id);
  await sync(bob, 0);
  await sync(alice, 0);

  const asked = await requestVerification(alice, bob.userId, room.id);
  await sync(bob, 0);
  const theirs = verifications(bob).find((v) => v.id === asked.id)!;
  assert.equal(theirs.phase, 'asked');
  assert.equal(bob.rooms[room.id].messages.at(-1)!.text, 'Asked to check devices by emoji.');
  await acceptVerification(bob, asked.id);
  // ready → start → accept → key → key: each side syncs in turn.
  for (let i = 0; i < 3; i++) {
    await sync(alice, 0);
    await sync(bob, 0);
  }
  assert.equal(asked.phase, 'compare');
  assert.equal(theirs.phase, 'compare');
  assert.equal(asked.emoji!.length, 7);
  assert.deepEqual(asked.emoji, theirs.emoji);
  // Nothing of it is readable on the server.
  assert.ok(!JSON.stringify(server.log).includes('m.key.verification.key'));

  await confirmVerification(alice, asked.id, true);
  await sync(bob, 0);
  await confirmVerification(bob, asked.id, true);
  await sync(alice, 0);
  assert.equal(theirs.phase, 'done');
  assert.equal(asked.phase, 'done');
  assert.ok(isVerified(alice, bob.userId, bob.deviceId));
  assert.ok(isVerified(bob, alice.userId, alice.deviceId));
  assert.ok(alice.verified![bob.userId].master);
  // Alice's user-signing key signed Bob's master key (Dave and Erin, new here, made theirs).
  assert.equal(Object.keys(server.master.get(bob.userId)!.signatures[alice.userId] ?? {}).length, 1);

  // Pictures that do not match stop the check on both sides.
  const again = await requestVerification(bob, alice.userId, room.id);
  await sync(alice, 0);
  await acceptVerification(alice, again.id);
  for (let i = 0; i < 3; i++) {
    await sync(bob, 0);
    await sync(alice, 0);
  }
  assert.equal(again.phase, 'compare');
  await confirmVerification(bob, again.id, false);
  await sync(alice, 0);
  assert.equal(again.phase, 'cancelled');
  assert.equal(verifications(alice).find((v) => v.id === again.id)!.phase, 'cancelled');
});

test('a new device of ours is checked by emoji from one that holds our cross-signing keys', { skip: !coreReady }, async () => {
  const carol = await signIn(HS, '@carol:example.org', PASSWORD);
  const carol2 = await signIn(HS, 'carol', PASSWORD);
  assert.ok(carol.crossSigning);
  assert.equal(carol2.crossSigning, undefined);
  const asked = await requestVerification(carol2, carol.userId);
  await sync(carol, 0);
  await sync(carol2, 0);
  const theirs = verifications(carol).find((v) => v.id === asked.id)!;
  assert.equal(theirs.deviceId, carol2.deviceId);
  await acceptVerification(carol, asked.id);
  for (let i = 0; i < 3; i++) {
    await sync(carol2, 0);
    await sync(carol, 0);
  }
  assert.deepEqual(asked.emoji, theirs.emoji);
  await confirmVerification(carol, asked.id, true);
  await sync(carol2, 0);
  await confirmVerification(carol2, asked.id, true);
  await sync(carol, 0);
  assert.deepEqual([asked.phase, theirs.phase], ['done', 'done']);
  assert.ok(isVerified(carol, carol.userId, carol2.deviceId));
  // The first device's self-signing key now signs the new one, so other apps see it checked.
  const signatures = server.deviceKeys.get(carol.userId)!.get(carol2.deviceId)!.signatures[carol.userId];
  assert.equal(Object.keys(signatures).length, 2);
});

test('Security Keys are written and read as Element does', () => {
  const key = new Uint8Array(32).map((_, i) => i * 7);
  const words = recoveryKeyOf(key);
  assert.match(words, /^Es[1-9A-HJ-NP-Za-km-z]{2}( [1-9A-HJ-NP-Za-km-z]{4}){11}$/);
  assert.deepEqual(keyOfRecovery(words), key);
  assert.deepEqual(keyOfRecovery(words.replace(/ /g, '')), key);
  // One letter changed fails the parity byte (or the prefix).
  const typo = words.slice(0, 10) + (words[10] === 'a' ? 'b' : 'a') + words.slice(11);
  assert.equal(keyOfRecovery(typo), null);
});

test('a Security Key set up on one device opens the cross-signing keys and earlier messages on a new one', { skip: !coreReady }, async () => {
  const frank = await signIn(HS, '@frank:example.org', PASSWORD);
  const gina = await signIn(HS, '@gina:example.org', PASSWORD);
  const words = await setUpRecovery(frank);
  assert.ok(keyOfRecovery(words));
  assert.ok(frank.backup);
  // The server keeps the secrets only encrypted.
  const stored = JSON.stringify([...server.accountData.values()]);
  assert.ok(!stored.includes(frank.crossSigning!.master) && !stored.includes(frank.backup.secret));

  const room = await startChat(frank, gina.userId);
  await sync(gina, 0);
  await joinRoom(gina, room.id);
  await sync(gina, 0);
  await sync(frank, 0);
  await sendText(frank, room.id, 'before the new phone');
  assert.equal(await backUpKeys(frank), 1);
  assert.equal(await backUpKeys(frank), 0);

  const frank2 = await signIn(HS, 'frank', PASSWORD);
  await sync(frank2, 0);
  assert.ok(frank2.rooms[room.id].messages.some((m) => m.locked));
  await assert.rejects(unlockRecovery(frank2, recoveryKeyOf(new Uint8Array(32))), WrongRecoveryError);
  const unlocked = await unlockRecovery(frank2, words);
  assert.deepEqual(unlocked, { crossSigning: true, backup: true, opened: 1 });
  assert.equal(frank2.rooms[room.id].messages.find((m) => m.text === 'before the new phone')?.sender, frank.userId);
  assert.equal(frank2.crossSigning!.master, frank.crossSigning!.master);
  // The new device signed itself with the account's self-signing key, so Element trusts it.
  assert.equal(Object.keys(server.deviceKeys.get(frank.userId)!.get(frank2.deviceId)!.signatures[frank.userId]).length, 2);
  await assert.rejects(setUpRecovery(frank2), /already has a Security Key/);
});

test("Matrix goes through Tor as the space's Tor way says", async () => {
  const sent: { head: Json; body: string }[] = [];
  const fake = {
    torRequest: async () => new Uint8Array(0),
    torHttp: async (head: string, body: Uint8Array) => {
      sent.push({ head: JSON.parse(head) as Json, body: new TextDecoder().decode(body) });
      return new Uint8Array([0x01, 0x91, ...new TextEncoder().encode('{"errcode":"M_FORBIDDEN"}')]);
    },
  } as unknown as Core;
  setCore(fake);
  setThroughTor('all');
  try {
    const answer = await defaultMatrixHttp({ method: 'POST', url: `${HS}/_matrix/client/v3/login`, body: { a: 1 }, token: 'tok' });
    assert.deepEqual(answer, { status: 401, json: { errcode: 'M_FORBIDDEN' } });
    assert.equal(sent.length, 1);
    assert.deepEqual(sent[0].head, { method: 'POST', url: `${HS}/_matrix/client/v3/login`, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer tok' } });
    assert.equal(sent[0].body, '{"a":1}');
    assert.ok(matrixThroughTor());
    // With the way 'messages' and Tor not ready yet, it goes straight, as Erevos's own messages do.
    setThroughTor('messages');
    assert.equal(matrixThroughTor(), false);
    // With no Tor in the build, the way 'all' sends nothing.
    setCore({} as Core);
    setThroughTor('all');
    await assert.rejects(defaultMatrixHttp({ method: 'GET', url: `${HS}/x` }), /Tor is not ready/);
  } finally {
    setThroughTor('off');
    setCore(wasmCore);
  }
});

