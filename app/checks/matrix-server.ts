// A small Matrix homeserver for the checks (checks/matrix.check.ts, checks/matrix-calls.check.ts),
// as far as lib/matrix.ts uses one: users, devices and their keys, rooms as one log of events,
// to-device messages waiting for each device, and what each was asked; and for calls, a room's
// state, delayed events (MSC4140), OpenID tokens, and where a call's media goes (MSC4143); and
// pushers, which it tells of events through their gateways (checks/doors.check.ts); redactions,
// and a room's older events (/messages) behind a sync that gives only the latest.
/// <reference types="node" />
import type { MatrixRequest } from '../lib/matrix';

export type Json = Record<string, any>;
type Logged = { seq: number; room: string; event: Json };

export const HS = 'https://matrix.example.org';
export const PASSWORD = 'correct horse';

// A homeserver as far as lib/matrix.ts uses one: users, devices and their keys, rooms as one log
// of events, to-device messages waiting for each device, and what each was asked.
export class Homeserver {
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
  /** What /.well-known/matrix/client answers; none when null. */
  wellKnown: Json | null = null;
  /** The media servers for calls that /rtc/transports lists (MSC4143); unknown to the server when null. */
  transports: Json[] | null = null;
  /** Whether delayed events go only as MSC4140 was first (a query on the usual state request). */
  delaysAsFirst = false;
  /** Delayed state, by delay ID, until sent or dropped. */
  readonly delayed = new Map<string, { room: string; sender: string; type: string; stateKey: string; content: Json; delayMs: number; due: number }>();
  /** OpenID tokens given, and whose they are. */
  readonly openId = new Map<string, string>();
  /** Read receipts: up to which event of the log, by `${user} ${room}`. */
  readonly readUpTo = new Map<string, number>();
  /** How many events of a room a sync gives at most; the rest are older, fetched with /messages. */
  timelineLimit = Infinity;
  /** Who writes in each room now (m.typing), said in every sync to those in it. */
  typing = new Map<string, string[]>();
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

  /** Sends each delayed event due by `now` (all of them by default), as the homeserver does once their time is up. */
  runDelays(now = Infinity): void {
    for (const [id, d] of [...this.delayed]) {
      if (d.due > now) continue;
      this.delayed.delete(id);
      this.add(d.room, d.sender, d.type, d.content, d.stateKey);
    }
  }

  /** The latest piece of `room`'s state of `type` under `stateKey`. */
  stateOf(room: string, type: string, stateKey: string): Json | undefined {
    let found: Json | undefined;
    for (const l of this.log) if (l.room === room && l.event.type === type && l.event.state_key === stateKey) found = l.event;
    return found;
  }

  private delay(room: string, sender: string, type: string, stateKey: string, content: Json, delayMs: number): string {
    const id = `syd_${++this.made}`;
    this.delayed.set(id, { room, sender, type, stateKey, content, delayMs, due: Date.now() + delayMs });
    return id;
  }

  /** Pushers by user, as set (/pushers/set). */
  readonly pushers = new Map<string, Json[]>();

  /**
   * Tells `user`'s pushers of an event, as a homeserver does of a message its push rules notify of,
   * in the format event_id_only; with no event, of a count alone, as when something was read. A
   * pusher its gateway rejects goes, as the spec has it.
   */
  async push(user: string, eventId?: string): Promise<void> {
    for (const pusher of [...(this.pushers.get(user) ?? [])]) {
      const device = { app_id: pusher.app_id, pushkey: pusher.pushkey, pushkey_ts: 1, data: { format: pusher.data.format } };
      const notification = { ...(eventId ? { event_id: eventId, room_id: '!room:example.org' } : {}), counts: { unread: 1 }, prio: 'high', devices: [device] };
      const answer = await fetch(pusher.data.url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notification }) });
      const { rejected } = (await answer.json()) as { rejected: string[] };
      if (rejected.includes(pusher.pushkey)) this.pushers.set(user, (this.pushers.get(user) ?? []).filter((p) => p !== pusher));
    }
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
    if (path === '/.well-known/matrix/client') return this.wellKnown ? { status: 200, json: this.wellKnown } : { status: 404, json: {} };
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
      if (typeof body.name === 'string') this.add(id, user, 'm.room.name', { name: body.name }, '');
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
    if ((m = path.match(/^\/rooms\/([^/]+)\/invite$/))) {
      const id = room(m[1]);
      if (this.membership(id, user) !== 'join') return { status: 403, json: { errcode: 'M_FORBIDDEN' } };
      this.add(id, user, 'm.room.member', { membership: 'invite' }, body.user_id);
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
    if ((m = path.match(/^\/rooms\/([^/]+)\/redact\/([^/]+)\/([^/]+)$/)) && request.method === 'PUT') {
      const id = room(m[1]);
      const target = this.log.find((l) => l.room === id && l.event.event_id === decodeURIComponent(m![2]));
      if (this.membership(id, user) !== 'join' || !target) return { status: 404, json: { errcode: 'M_NOT_FOUND' } };
      // Only one's own, as a room's default power levels let members.
      if (target.event.sender !== user) return { status: 403, json: { errcode: 'M_FORBIDDEN' } };
      const redaction = this.add(id, user, 'm.room.redaction', { redacts: target.event.event_id }, undefined, m[3]);
      this.log.at(-1)!.event.redacts = target.event.event_id;
      target.event.content = {};
      target.event.unsigned = { ...(target.event.unsigned ?? {}), redacted_because: { event_id: redaction } };
      return { status: 200, json: { event_id: redaction } };
    }
    if ((m = path.match(/^\/rooms\/([^/]+)\/messages$/)) && request.method === 'GET') {
      const id = room(m[1]);
      if (this.membership(id, user) !== 'join') return { status: 403, json: { errcode: 'M_FORBIDDEN' } };
      const from = url.searchParams.get('from');
      const limit = Number(url.searchParams.get('limit') ?? 10);
      const upTo = from ? Number(from.slice(1)) : Infinity;
      const older = this.log.filter((l) => l.room === id && l.seq <= upTo);
      const page = older.slice(-limit).reverse();
      const more = older.length > page.length;
      return { status: 200, json: { chunk: page.map((l) => l.event), start: from ?? `b${this.seq}`, ...(more ? { end: `b${page.at(-1)!.seq - 1}` } : {}) } };
    }
    if ((m = path.match(/^\/rooms\/([^/]+)\/send\/([^/]+)\/([^/]+)$/))) {
      const id = room(m[1]);
      if (this.membership(id, user) !== 'join') return { status: 403, json: { errcode: 'M_FORBIDDEN' } };
      return { status: 200, json: { event_id: this.add(id, user, decodeURIComponent(m[2]), body, undefined, m[3]) } };
    }
    if ((m = path.match(/^\/rooms\/([^/]+)\/state\/([^/]+)\/([^/]*)$/)) && request.method === 'PUT') {
      const id = room(m[1]);
      if (this.membership(id, user) !== 'join') return { status: 403, json: { errcode: 'M_FORBIDDEN' } };
      const delayMs = url.searchParams.get('org.matrix.msc4140.delay');
      if (delayMs !== null) {
        if (!this.delaysAsFirst) return { status: 400, json: { errcode: 'M_UNKNOWN', error: 'Delays as first are not kept here' } };
        return { status: 200, json: { delay_id: this.delay(id, user, decodeURIComponent(m[2]), decodeURIComponent(m[3]), body, Number(delayMs)) } };
      }
      return { status: 200, json: { event_id: this.add(id, user, decodeURIComponent(m[2]), body, decodeURIComponent(m[3])) } };
    }
    if ((m = path.match(/^\/rooms\/([^/]+)\/state$/)) && request.method === 'GET') {
      const id = room(m[1]);
      if (this.membership(id, user) !== 'join') return { status: 403, json: { errcode: 'M_FORBIDDEN' } };
      const latest = new Map<string, Json>();
      for (const l of this.log) if (l.room === id && l.event.state_key !== undefined) latest.set(`${l.event.type} ${l.event.state_key}`, l.event);
      return { status: 200, json: [...latest.values()] as unknown as Json };
    }
    if ((m = path.match(/^\/user\/([^/]+)\/openid\/request_token$/)) && request.method === 'POST') {
      if (decodeURIComponent(m[1]) !== user) return { status: 403, json: { errcode: 'M_FORBIDDEN' } };
      const token = `oid${++this.made}`;
      this.openId.set(token, user);
      return { status: 200, json: { access_token: token, token_type: 'Bearer', matrix_server_name: 'example.org', expires_in: 3600 } };
    }
    if (path === '/_matrix/client/unstable/org.matrix.msc4143/rtc/transports') {
      return this.transports ? { status: 200, json: { rtc_transports: this.transports } } : { status: 404, json: { errcode: 'M_UNRECOGNIZED' } };
    }
    if ((m = path.match(/^\/_matrix\/client\/unstable\/org\.matrix\.msc4140\/rooms\/([^/]+)\/delayed_event\/([^/]+)\/[^/]+$/)) && request.method === 'PUT') {
      if (this.delaysAsFirst) return { status: 404, json: { errcode: 'M_UNRECOGNIZED' } };
      const id = room(m[1]);
      if (this.membership(id, user) !== 'join') return { status: 403, json: { errcode: 'M_FORBIDDEN' } };
      if (typeof body.state_key !== 'string') return { status: 400, json: { errcode: 'M_INVALID_PARAM' } };
      return { status: 200, json: { delay_id: this.delay(id, user, decodeURIComponent(m[2]), body.state_key, body.content, Number(body.delay_ms)) } };
    }
    if ((m = path.match(/^\/_matrix\/client\/unstable\/org\.matrix\.msc4140\/delayed_events\/([^/]+)(?:\/(send|restart|cancel))?$/)) && request.method === 'POST') {
      // Each server takes one way: the action in the path, or (as MSC4140 was first) in the body.
      const fromPath = m[2];
      if (this.delaysAsFirst === Boolean(fromPath)) return { status: 404, json: { errcode: 'M_UNRECOGNIZED' } };
      const id = decodeURIComponent(m[1]);
      const found = this.delayed.get(id);
      if (!found || found.sender !== user) return { status: 404, json: { errcode: 'M_NOT_FOUND' } };
      const action = fromPath ?? body.action;
      if (action === 'cancel') this.delayed.delete(id);
      else if (action === 'restart') found.due = Date.now() + found.delayMs;
      else if (action === 'send') {
        this.delayed.delete(id);
        this.add(found.room, found.sender, found.type, found.content, found.stateKey);
      } else return { status: 400, json: { errcode: 'M_INVALID_PARAM' } };
      return { status: 200, json: {} };
    }
    const receipt = path.match(/^\/rooms\/([^/]+)\/receipt\/m\.read\/([^/]+)$/);
    if (receipt) {
      const found = this.log.find((l) => l.room === decodeURIComponent(receipt[1]) && l.event.event_id === decodeURIComponent(receipt[2]));
      if (found) this.readUpTo.set(`${user} ${found.room}`, Math.max(found.seq, this.readUpTo.get(`${user} ${found.room}`) ?? 0));
      return { status: 200, json: {} };
    }
    if (path.match(/^\/rooms\/[^/]+\/receipt\//)) return { status: 200, json: {} };
    if (path === '/pushers/set' && request.method === 'POST') {
      const kept = (this.pushers.get(user) ?? []).filter((p) => !(p.app_id === body.app_id && p.pushkey === body.pushkey));
      if (body.kind) {
        // As Synapse: the gateway must be at the path the spec fixes.
        if (new URL(String(body.data?.url)).pathname !== '/_matrix/push/v1/notify') return { status: 400, json: { errcode: 'M_INVALID_PARAM' } };
        kept.push(body);
      }
      this.pushers.set(user, kept);
      return { status: 200, json: {} };
    }
    if (path === '/pushers' && request.method === 'GET') return { status: 200, json: { pushers: this.pushers.get(user) ?? [] } };
    if (path === '/sync') return { status: 200, json: this.sync(user, device, Number(url.searchParams.get('since') ?? 0)) };
    return { status: 404, json: { errcode: 'M_UNRECOGNIZED', error: path } };
  }

  private countOneTime(user: string, device: string): number {
    return [...this.oneTime.keys()].filter((k) => k.startsWith(`${user} ${device} `)).length;
  }

  // Messages from others since the user last read, joined, or wrote, as a homeserver's push rules
  // count them by default.
  private unread(user: string, room: string): number {
    let from = this.readUpTo.get(`${user} ${room}`) ?? 0;
    for (const { seq, room: r, event } of this.log) {
      if (r !== room) continue;
      if (event.sender === user && (event.state_key === undefined || (event.type === 'm.room.member' && event.content.membership === 'join'))) from = Math.max(from, seq);
    }
    return this.log.filter((l) => l.room === room && l.seq > from && l.event.sender !== user && l.event.state_key === undefined && ['m.room.message', 'm.room.encrypted'].includes(l.event.type)).length;
  }

  private sync(user: string, device: string, since: number): Json {
    const join: Json = {};
    const invite: Json = {};
    for (const id of this.rooms()) {
      const now = this.membership(id, user);
      const all = this.log.filter((l) => l.room === id && l.seq > since);
      // Only the latest, as homeservers cut a long timeline: the rest are fetched from where it says.
      const given = all.slice(-this.timelineLimit);
      const events = given.map((l) => l.event);
      if (now === 'join' && events.length) {
        const joinedNow = all.some((l) => l.event.type === 'm.room.member' && l.event.state_key === user && l.event.content.membership === 'join');
        const before = joinedNow ? this.log.filter((l) => l.room === id && l.seq <= since && l.event.state_key !== undefined) : [];
        const cut = all.slice(0, all.length - given.length).filter((l) => l.event.state_key !== undefined);
        const state = [...before, ...cut].map((l) => l.event);
        const timeline = { events, limited: given.length < all.length, prev_batch: `b${given[0].seq - 1}` };
        join[id] = { state: { events: state }, timeline, unread_notifications: { notification_count: this.unread(user, id) } };
      }
      const writing = this.typing.get(id);
      if (now === 'join' && writing) join[id] = { ...(join[id] ?? {}), ephemeral: { events: [{ type: 'm.typing', content: { user_ids: writing } }] } };
      if (now === 'join') {
        // Nothing more.
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
