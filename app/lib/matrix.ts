// A Matrix account inside Erevos (docs/matrix.md): Erevos talks to the person's homeserver itself,
// as Element does, so chats with people on Matrix stay encrypted from end to end. No bridge reads
// them on the way. The homeserver still sees who talks with whom and when, so these chats are not
// anonymous, and the app says so on them.
//
// This file holds the account and does the talking to the homeserver (the Client-Server API, v3);
// the keys and the encryption are the core's (crates/erevos-matrix, through lib/core.ts
// matrixCore): Olm between two devices, Megolm for a room's messages. Everything the account
// needs, its keys and sessions included, is one JSON state (MatrixState), which the app keeps
// sealed with the rest of the space and hands back here.
//
// What it does:
//  - Signs in with a password (signIn), as a new device named Erevos, publishes the device's keys,
//    and, when the account has none yet, its cross-signing keys, signing this device with them.
//  - Syncs (sync): rooms, members, names, messages, invites, and the keys other devices send.
//  - Sends a text (sendText): in an encrypted room, it first gives the room's current Megolm key
//    to every device of every member that does not have it yet, through Olm, then sends.
//  - Starts a chat with someone (startChat), joins, leaves, marks as read, signs out.
//  - Passes the steps of a check by emoji, to-device or in a room, to lib/matrix-verify.ts.
//  - Passes a call's events to lib/matrix-calls.ts, and a room's events to Element Call while it
//    shows that room (lib/matrix-widget.ts), with what Element Call asks of the homeserver.
//
// Photos and files are lib/matrix-media.ts's; the key backup and secret storage,
// lib/matrix-backup.ts's. Not audited.

import type { ChatNotify } from '../lock/chat-notify';
import { canTorHttp, matrixCore, torHttp } from './core';
import type { MatrixBackup } from './matrix-backup';
import { randomBytes, toHex, utf8Decode, utf8Encode } from './crypto';
import { t } from './i18n';
import { throughTor, torFor } from './relay';

/** The olm and megolm algorithms, as Matrix names them. */
export const OLM = 'm.olm.v1.curve25519-aes-sha2';
export const MEGOLM = 'm.megolm.v1.aes-sha2';

/** How many messages of each room the account keeps, newest last. */
export const KEEP_MESSAGES = 300;

/** A room's Megolm key goes out of use after this many messages, or this long, as Matrix advises. */
export const ROTATE_MESSAGES = 100;
export const ROTATE_MS = 7 * 24 * 3600_000;

/** How many read message indexes are kept against replays. */
export const KEEP_SEEN = 5000;

export type Json = Record<string, unknown>;

/** One message in a room, as Erevos shows it. */
export type MatrixMessage = {
  id: string;
  sender: string;
  ts: number;
  text: string;
  /** Still locked: the key for it has not come (yet). Kept to try again as keys come. */
  locked?: { sessionId: string; ciphertext: string; senderKey: string };
  /** Ours, while the homeserver has not taken it, or when it refused it. */
  state?: 'sending' | 'failed';
  /** A photo, a video, a sound or a file: where it is, and its key when the room is encrypted (lib/matrix-media.ts). */
  file?: MatrixFile;
  /** A call's line, kept here only: its text in English, shown by lib/call-lines.ts. */
  call?: true;
};

/** The key and checks of an encrypted file, as Matrix writes them (EncryptedFile). */
export type EncryptedFile = { url: string; key: { kty: 'oct'; key_ops: string[]; alg: 'A256CTR'; k: string; ext: true }; iv: string; hashes: { sha256: string }; v: 'v2' };

export type MatrixFile = {
  kind: 'image' | 'video' | 'audio' | 'file';
  name: string;
  mime: string;
  size?: number;
  w?: number;
  h?: number;
  /** An mxc:// address, for a file sent in the clear. */
  url?: string;
  encrypted?: EncryptedFile;
};

export type MatrixRoom = {
  id: string;
  /** Its name, or for a chat with one person, theirs. */
  name: string;
  /** Members by their Matrix ID: 'join' or 'invite', with their display name. */
  members: Record<string, { membership: 'join' | 'invite'; name?: string }>;
  encrypted: boolean;
  direct: boolean;
  unread: number;
  messages: MatrixMessage[];
  /** Set while we are only invited: who asked. */
  invitedBy?: string;
  /** Its own notifications (lock/chat-notify.ts), kept on this device only. */
  notify?: ChatNotify;
};

type Device = { curve25519: string; ed25519: string };

type Outbound = { session: Json; sessionId: string; created: number; count: number; sharedWith: string[] };

/** All of a Matrix account, as the app keeps it sealed. */
export type MatrixState = {
  homeserver: string;
  userId: string;
  deviceId: string;
  accessToken: string;
  /** The device's Olm account (vodozemac's pickle). */
  account: Json;
  /** Cross-signing secrets made on this device, when the account had none. */
  crossSigning?: { master: string; selfSigning: string; userSigning: string };
  since?: string;
  rooms: Record<string, MatrixRoom>;
  /** Members' devices, checked, by user then device; a user whose list changed is in `outdated`. */
  devices: Record<string, Record<string, Device>>;
  outdated: string[];
  /** Olm sessions by the other device's Curve25519 key, the newest first. */
  olm: Record<string, Json[]>;
  /** Megolm sessions we read with, by `${roomId} ${sessionId}`: the session and who gave it. */
  inbound: Record<string, { session: Json; senderKey: string }>;
  /** The Megolm session we send with, by room. */
  outbound: Record<string, Outbound>;
  /** Which message index of which session has been read, by `${sessionId} ${index}`, against replays. */
  seen: Record<string, string>;
  /** What a check by emoji proved (lib/matrix-verify.ts), by user: their devices' Ed25519 keys, and their master key. */
  verified?: Record<string, { devices: Record<string, string>; master?: string }>;
  /** The key backup, once the Security Key opened it or this device set it up (lib/matrix-backup.ts). */
  backup?: MatrixBackup;
};

// The homeserver's answer to one request.
export type MatrixAnswer = { status: number; json: Json; bytes?: Uint8Array };
export type MatrixRequest = {
  method: 'GET' | 'POST' | 'PUT';
  url: string;
  body?: unknown;
  token?: string;
  /** Bytes to send as they are (an upload), of type `contentType`, instead of JSON. */
  bytes?: Uint8Array;
  contentType?: string;
  /** Answer the bytes as they are (a download). */
  raw?: boolean;
};
export type MatrixHttp = (request: MatrixRequest) => Promise<MatrixAnswer>;

const headersOf = ({ token, bytes, contentType }: MatrixRequest) => {
  const headers: Record<string, string> = { 'Content-Type': bytes ? (contentType ?? 'application/octet-stream') : 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
};

const jsonOf = (text: string): Json => {
  try {
    return text ? (JSON.parse(text) as Json) : {};
  } catch {
    return {};
  }
};

// Straight to the homeserver, over HTTPS.
async function straight(asked: MatrixRequest): Promise<MatrixAnswer> {
  const { method, url, body, bytes, raw } = asked;
  const sent = bytes ? (bytes as unknown as BodyInit) : body === undefined ? undefined : JSON.stringify(body);
  const response = await fetch(url, { method, headers: headersOf(asked), body: sent });
  if (raw && response.ok) return { status: response.status, json: {}, bytes: new Uint8Array(await response.arrayBuffer()) };
  return { status: response.status, json: jsonOf(await response.text()) };
}

// Through the core's Tor (crates/erevos-tor http), on circuits kept for this homeserver.
async function viaTor(asked: MatrixRequest): Promise<MatrixAnswer> {
  const { method, url, body, bytes, raw } = asked;
  const sent = bytes ?? (body === undefined ? new Uint8Array(0) : utf8Encode(JSON.stringify(body)));
  const answer = await torHttp(JSON.stringify({ method, url, headers: headersOf(asked) }), sent);
  const status = (answer[0] << 8) | answer[1];
  const rest = answer.slice(2);
  if (raw && status >= 200 && status < 300) return { status, json: {}, bytes: rest };
  return { status, json: jsonOf(utf8Decode(rest)) };
}

/**
 * The way the space goes through Tor (lib/tor.ts) is Matrix's too: with 'all', every request
 * goes through Tor, and none without it; with 'messages', each goes through Tor while it is
 * ready, photos and files too, and straight when it is not, as Erevos's own messages do; with
 * 'off', straight. The checks put a homeserver of their own here.
 */
export const defaultMatrixHttp: MatrixHttp = async (asked) => {
  const tor = canTorHttp() && torFor(false);
  if (!tor) {
    if (throughTor()) throw new Error(t('Tor is not ready.'));
    return straight(asked);
  }
  try {
    return await viaTor(asked);
  } catch (error) {
    if (throughTor()) throw error;
    return straight(asked);
  }
};

let http: MatrixHttp = defaultMatrixHttp;

/** Whether Matrix goes through Tor now, as the space's Tor way and Tor's state say. */
export function matrixThroughTor(): boolean {
  return canTorHttp() && torFor(false);
}

export function setMatrixHttp(next: MatrixHttp): void {
  http = next;
}

/** The homeserver said no: its Matrix error code and message. */
export class MatrixError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

/** One call to the core's Matrix part (crates/erevos-matrix). */
export async function core<T extends Json>(op: string, request: Json): Promise<T> {
  const answer = await matrixCore()(utf8Encode(JSON.stringify({ op, ...request })));
  return JSON.parse(utf8Decode(answer)) as T;
}

export const enc = encodeURIComponent;

/** A new transaction ID, so a request sent again is not taken twice. */
export const txn = () => `erevos${Date.now()}${toHex(randomBytes(6))}`;

/** One request to the Client-Server API (v3), its JSON answered or the refusal thrown. */
export async function call(state: Pick<MatrixState, 'homeserver' | 'accessToken'> | { homeserver: string; accessToken?: string }, method: MatrixRequest['method'], path: string, body?: unknown): Promise<Json> {
  return answered(await http({ method, url: `${state.homeserver}/_matrix/client/v3${path}`, body, token: state.accessToken || undefined }));
}

/** One request to a part of the Client-Server API still unstable, under the MSC that names it. */
async function unstable(state: Pick<MatrixState, 'homeserver' | 'accessToken'>, feature: string, method: MatrixRequest['method'], path: string, body?: unknown): Promise<Json> {
  return answered(await http({ method, url: `${state.homeserver}/_matrix/client/unstable/${feature}${path}`, body, token: state.accessToken }));
}

/** One request as it is (lib/matrix-media.ts), the homeserver's refusal thrown. */
export async function request(state: Pick<MatrixState, 'homeserver' | 'accessToken'>, asked: Omit<MatrixRequest, 'token'>): Promise<MatrixAnswer> {
  const answer = await http({ ...asked, token: state.accessToken });
  answered(answer);
  return answer;
}

function answered(answer: MatrixAnswer): Json {
  if (answer.status >= 200 && answer.status < 300) return answer.json;
  throw new MatrixError(answer.status, String(answer.json.errcode ?? 'M_UNKNOWN'), String(answer.json.error ?? t('The Matrix server refused the request.')));
}

/** Whether `id` looks like a Matrix ID: @name:server. */
export function isMatrixId(id: string): boolean {
  return /^@[^:\s]+:[^\s]+$/.test(id.trim());
}

/** The homeserver of a server name or Matrix ID, as its /.well-known/matrix/client says, or the server itself. */
export async function findHomeserver(nameOrId: string): Promise<string> {
  const given = nameOrId.trim();
  const server = isMatrixId(given) ? given.slice(given.indexOf(':') + 1) : given.replace(/^https?:\/\//, '').replace(/\/+$/, '');
  if (!server) throw new Error(t('Write a Matrix server or a Matrix ID, such as @name:matrix.org.'));
  try {
    const answer = await http({ method: 'GET', url: `https://${server}/.well-known/matrix/client` });
    const base = (answer.json['m.homeserver'] as Json | undefined)?.base_url;
    if (answer.status === 200 && typeof base === 'string' && /^https:\/\//.test(base)) return base.replace(/\/+$/, '');
  } catch {
    // No well-known: the server answers itself.
  }
  return `https://${server}`;
}

function userPart(nameOrId: string): string {
  const given = nameOrId.trim();
  return isMatrixId(given) ? given.slice(1, given.indexOf(':')) : given.replace(/^@/, '');
}

/**
 * Signs in to `homeserver` as a new device, and publishes its keys. When the account has no
 * cross-signing keys yet, it makes them and signs this device with them, with the same password,
 * so other people's apps trust this device as the account's own.
 */
export async function signIn(homeserver: string, user: string, password: string): Promise<MatrixState> {
  const identifier = { type: 'm.id.user', user: userPart(user) };
  const login = await call({ homeserver }, 'POST', '/login', {
    type: 'm.login.password',
    identifier,
    password,
    initial_device_display_name: 'Erevos',
  });
  const { account } = await core<{ account: Json }>('account_new', {});
  const state: MatrixState = {
    homeserver,
    userId: String(login.user_id),
    deviceId: String(login.device_id),
    accessToken: String(login.access_token),
    account,
    rooms: {},
    devices: {},
    outdated: [],
    olm: {},
    inbound: {},
    outbound: {},
    seen: {},
  };
  const keys = await core<{ device_keys: Json }>('device_keys', { account, user_id: state.userId, device_id: state.deviceId });
  await call(state, 'POST', '/keys/upload', { device_keys: keys.device_keys });
  await publishOneTimeKeys(state, 50, true);
  await setUpCrossSigning(state, keys.device_keys, { type: 'm.login.password', identifier, password });
  return state;
}

/** Publishes `count` new one-time keys, and a new fallback key with `fallback`. */
async function publishOneTimeKeys(state: MatrixState, count: number, fallback: boolean): Promise<void> {
  const made = await core<{ account: Json; one_time_keys: Json; fallback_keys: Json }>('one_time_keys', {
    account: state.account,
    user_id: state.userId,
    device_id: state.deviceId,
    count,
    fallback,
  });
  await call(state, 'POST', '/keys/upload', { one_time_keys: made.one_time_keys, ...(fallback ? { fallback_keys: made.fallback_keys } : {}) });
  state.account = made.account;
}

const KEY_ID = (publicKey: string) => `ed25519:${publicKey}`;

/** `object` signed by us: with a cross-signing `secret`, or else with this device's own key. Its
 *  `signatures` hold only the new one, as /keys/signatures/upload wants. */
export async function signWith(state: MatrixState, object: Json, secret?: string): Promise<Json> {
  const keyId = secret ? KEY_ID((await core<{ public: string }>('signing_key_public', { secret })).public) : `ed25519:${state.deviceId}`;
  const { signatures: _, unsigned: __, ...bare } = object;
  const signed = (await core<{ json: Json }>('sign_json', { json: bare, ...(secret ? { secret } : { account: state.account }), user_id: state.userId, key_id: keyId })).json;
  return { ...object, signatures: { [state.userId]: { [keyId]: (signed.signatures as Record<string, Json>)[state.userId][keyId] } } };
}

async function setUpCrossSigning(state: MatrixState, deviceKeys: Json, auth: Json): Promise<void> {
  const own = await call(state, 'POST', '/keys/query', { device_keys: { [state.userId]: [] } });
  if ((own.master_keys as Json | undefined)?.[state.userId]) return;
  const [master, selfSigning, userSigning] = await Promise.all([0, 1, 2].map(() => core<{ secret: string; public: string }>('signing_key_new', {})));
  const keyOf = (usage: string, key: { public: string }) => ({ user_id: state.userId, usage: [usage], keys: { [KEY_ID(key.public)]: key.public } });
  const byMaster = async (object: Json) =>
    (await core<{ json: Json }>('sign_json', { json: object, secret: master.secret, user_id: state.userId, key_id: KEY_ID(master.public) })).json;
  const masterKey = (
    await core<{ json: Json }>('sign_json', { json: keyOf('master', master), account: state.account, user_id: state.userId, key_id: `ed25519:${state.deviceId}` })
  ).json;
  const body: Json = {
    master_key: masterKey,
    self_signing_key: await byMaster(keyOf('self_signing', selfSigning)),
    user_signing_key: await byMaster(keyOf('user_signing', userSigning)),
  };
  // The server asks for the password again: the first try only opens a session for it.
  const first = await http({ method: 'POST', url: `${state.homeserver}/_matrix/client/v3/keys/device_signing/upload`, body, token: state.accessToken });
  if (first.status === 401) {
    await call(state, 'POST', '/keys/device_signing/upload', { ...body, auth: { ...auth, session: first.json.session } });
  } else if (first.status < 200 || first.status >= 300) {
    throw new MatrixError(first.status, String(first.json.errcode ?? 'M_UNKNOWN'), String(first.json.error ?? ''));
  }
  const signed = (
    await core<{ json: Json }>('sign_json', {
      json: deviceKeys,
      secret: selfSigning.secret,
      user_id: state.userId,
      key_id: KEY_ID(selfSigning.public),
    })
  ).json;
  // Only the new signature goes up: the server has the device's own already.
  const signature = (signed.signatures as Record<string, Json>)[state.userId][KEY_ID(selfSigning.public)];
  const onlyNew = { ...signed, signatures: { [state.userId]: { [KEY_ID(selfSigning.public)]: signature } } };
  await call(state, 'POST', '/keys/signatures/upload', { [state.userId]: { [state.deviceId]: onlyNew } });
  state.crossSigning = { master: master.secret, selfSigning: selfSigning.secret, userSigning: userSigning.secret };
}

/** Signs out: the homeserver forgets this device and its keys. */
export async function signOut(state: MatrixState): Promise<void> {
  await call(state, 'POST', '/logout', {});
}

const FILTER = JSON.stringify({ room: { timeline: { limit: 50 }, state: { lazy_load_members: true } } });

/** What one sync brought, before it is taken in (syncApply). */
export type MatrixNews = Json;

/**
 * Asks the homeserver for what came since the last sync, waiting up to `waitMs` for news. Changes
 * nothing: syncApply takes it in, so a send can go on while a sync waits.
 */
export async function syncFetch(state: Pick<MatrixState, 'homeserver' | 'accessToken' | 'since'>, waitMs = 30_000): Promise<MatrixNews> {
  const query = `?timeout=${waitMs}&filter=${enc(FILTER)}${state.since ? `&since=${enc(state.since)}` : ''}`;
  return call(state, 'GET', `/sync${query}`);
}

/** A step of a check by emoji (m.key.verification.*), as it came: to-device, or in `roomId`. */
export type VerificationEvent = { type: string; content: Json; sender: string; roomId?: string; eventId?: string; ts?: number };
type VerificationHandler = (state: MatrixState, event: VerificationEvent) => Promise<boolean>;
let verificationHandler: VerificationHandler | null = null;

/** Where the steps of checks by emoji go (lib/matrix-verify.ts sets it). */
export function setVerificationHandler(next: VerificationHandler | null): void {
  verificationHandler = next;
}

const isVerification = (type: unknown, content: Json | undefined) =>
  (typeof type === 'string' && type.startsWith('m.key.verification.')) || (type === 'm.room.message' && content?.msgtype === 'm.key.verification.request');

async function passVerification(state: MatrixState, event: VerificationEvent): Promise<boolean> {
  return verificationHandler ? verificationHandler(state, event).catch(() => false) : false;
}

/** A call's event: one that rings, answers or ends a call, a room's call members, or the keys of a
 *  call's media sent to this device, each opened first when it came encrypted. `age`: how long ago
 *  the homeserver had it, when it says. `encrypted`: for one sent to this device, whether it came
 *  encrypted. */
export type CallEvent = {
  type: string;
  content: Json;
  sender: string;
  ts: number;
  roomId?: string;
  eventId?: string;
  stateKey?: string;
  senderDevice?: string;
  age?: number;
  encrypted?: boolean;
};
type CallHandler = (state: MatrixState, event: CallEvent) => Promise<boolean>;
let callHandler: CallHandler | null = null;

/** Where calls' events go (the calls set it while the space is open), or none. */
export function setCallHandler(next: CallHandler | null): void {
  callHandler = next;
}

/** Legacy calls (m.call.*), and MatrixRTC's: rings, declines, call members, media keys. */
export const isCallEvent = (type: unknown): type is string =>
  typeof type === 'string' &&
  (type.startsWith('m.call.') ||
    type.startsWith('m.rtc.') ||
    type.startsWith('org.matrix.msc4075.') ||
    type.startsWith('org.matrix.msc4310.') ||
    type === 'org.matrix.msc3401.call.member' ||
    type.startsWith('io.element.call.'));

async function passCall(state: MatrixState, event: CallEvent): Promise<boolean> {
  return callHandler ? callHandler(state, event).catch(() => false) : false;
}

/** An event of a room as the homeserver has it (`room_id` set), opened when it came encrypted.
 *  `timeline`: it came in the room's timeline, not only as a piece of its state. */
export type RoomTap = (roomId: string, event: Json, timeline: boolean) => void;
let roomTap: RoomTap | null = null;

/** Where every event of the rooms goes as it comes, or nowhere: Element Call, while it shows (lib/matrix-calls.ts). */
export function setRoomTap(next: RoomTap | null): void {
  roomTap = next;
}

function tap(roomId: string, event: Json, timeline: boolean): void {
  try {
    roomTap?.(roomId, { ...event, room_id: roomId }, timeline);
  } catch {
    // Whoever listens, the sync goes on.
  }
}

const callIn = (roomId: string, event: Json, type: string, content: Json): CallEvent => {
  const age = (event.unsigned as Json | undefined)?.age;
  return {
    type,
    content,
    sender: String(event.sender),
    ts: Number(event.origin_server_ts ?? Date.now()),
    roomId,
    eventId: String(event.event_id),
    ...(typeof event.state_key === 'string' ? { stateKey: event.state_key } : {}),
    ...(typeof age === 'number' ? { age } : {}),
  };
};

/** Takes in what one sync brought. Answers whether anything a person would see changed. */
export async function syncApply(state: MatrixState, news: MatrixNews): Promise<boolean> {
  let seen = false;
  for (const event of ((news.to_device as Json | undefined)?.events as Json[] | undefined) ?? []) {
    const changed = isVerification(event.type, event.content as Json)
      ? await passVerification(state, { type: String(event.type), content: (event.content as Json) ?? {}, sender: String(event.sender) })
      : await takeToDevice(state, event);
    if (changed) seen = true;
  }
  const lists = news.device_lists as { changed?: string[]; left?: string[] } | undefined;
  for (const user of lists?.changed ?? []) if (!state.outdated.includes(user)) state.outdated.push(user);
  for (const user of lists?.left ?? []) delete state.devices[user];
  const direct = directRooms(news);
  const rooms = (news.rooms as Json | undefined) ?? {};
  for (const [id, room] of Object.entries((rooms.join as Record<string, Json> | undefined) ?? {})) {
    if (await takeRoom(state, id, room, direct)) seen = true;
  }
  for (const [id, room] of Object.entries((rooms.invite as Record<string, Json> | undefined) ?? {})) {
    takeInvite(state, id, room);
    seen = true;
  }
  for (const id of Object.keys((rooms.leave as Json | undefined) ?? {})) {
    if (state.rooms[id]) seen = true;
    delete state.rooms[id];
    delete state.outbound[id];
  }
  const counts = news.device_one_time_keys_count as Json | undefined;
  const left = Number(counts?.signed_curve25519 ?? 0);
  const fallbackGone = Array.isArray(news.device_unused_fallback_key_types) && !(news.device_unused_fallback_key_types as string[]).includes('signed_curve25519');
  if (left < 25 || fallbackGone) await publishOneTimeKeys(state, 50 - left, fallbackGone);
  // Only the latest indexes are needed against replays: older ones go, so the state stays small.
  const seenKeys = Object.keys(state.seen);
  if (seenKeys.length > KEEP_SEEN) for (const key of seenKeys.slice(0, seenKeys.length - KEEP_SEEN)) delete state.seen[key];
  state.since = String(news.next_batch);
  return seen;
}

/** One sync, fetched and taken in. */
export async function sync(state: MatrixState, waitMs = 30_000): Promise<boolean> {
  return syncApply(state, await syncFetch(state, waitMs));
}

function directRooms(news: Json): Set<string> | null {
  const events = ((news.account_data as Json | undefined)?.events as Json[] | undefined) ?? [];
  const direct = events.find((e) => e.type === 'm.direct');
  if (!direct) return null;
  return new Set(Object.values((direct.content as Record<string, string[]>) ?? {}).flat());
}

function roomOf(state: MatrixState, id: string): MatrixRoom {
  state.rooms[id] ??= { id, name: '', members: {}, encrypted: false, direct: false, unread: 0, messages: [] };
  return state.rooms[id];
}

function takeState(room: MatrixRoom, event: Json): void {
  const content = (event.content as Json | undefined) ?? {};
  switch (event.type) {
    case 'm.room.name':
      room.name = String(content.name ?? '');
      break;
    case 'm.room.encryption':
      if (content.algorithm === MEGOLM) room.encrypted = true;
      break;
    case 'm.room.member': {
      const who = String(event.state_key);
      if (content.membership === 'join' || content.membership === 'invite') {
        room.members[who] = { membership: content.membership, name: typeof content.displayname === 'string' ? content.displayname : undefined };
        if (content.is_direct === true) room.direct = true;
      } else delete room.members[who];
      break;
    }
  }
}

async function takeRoom(state: MatrixState, id: string, data: Json, direct: Set<string> | null): Promise<boolean> {
  const room = roomOf(state, id);
  delete room.invitedBy;
  if (direct) room.direct = direct.has(id);
  let seen = false;
  for (const event of ((data.state as Json | undefined)?.events as Json[] | undefined) ?? []) {
    takeState(room, event);
    tap(id, event, false);
    if (isCallEvent(event.type) && (await passCall(state, callIn(id, event, event.type, (event.content as Json) ?? {})))) seen = true;
  }
  for (const event of ((data.timeline as Json | undefined)?.events as Json[] | undefined) ?? []) {
    if (typeof event.state_key === 'string') {
      takeState(room, event);
      tap(id, event, true);
      if (isCallEvent(event.type) && (await passCall(state, callIn(id, event, event.type, (event.content as Json) ?? {})))) seen = true;
      continue;
    }
    if (typeof event.type === 'string' && event.type.startsWith('m.key.verification.')) {
      if (await passVerification(state, inRoom(id, event, event.type, (event.content as Json) ?? {}))) seen = true;
      continue;
    }
    const message = await messageOf(state, id, event);
    if (!message) continue;
    const mine = room.messages.findIndex((m) => m.id === message.id || (m.state && event.unsigned && (event.unsigned as Json).transaction_id === m.id));
    if (mine >= 0) room.messages[mine] = message;
    else room.messages.push(message);
    seen = true;
  }
  room.messages = room.messages.slice(-KEEP_MESSAGES);
  const unread = (data.unread_notifications as Json | undefined)?.notification_count;
  if (typeof unread === 'number') room.unread = unread;
  if (!room.name) room.name = nameFromMembers(state, room);
  return seen;
}

function nameFromMembers(state: MatrixState, room: MatrixRoom): string {
  const others = Object.entries(room.members).filter(([who]) => who !== state.userId);
  return others.map(([who, m]) => m.name || who).join(', ') || room.id;
}

function takeInvite(state: MatrixState, id: string, data: Json): void {
  const room = roomOf(state, id);
  for (const event of ((data.invite_state as Json | undefined)?.events as Json[] | undefined) ?? []) {
    takeState(room, event);
    const content = (event.content as Json | undefined) ?? {};
    if (event.type === 'm.room.member' && event.state_key === state.userId && content.membership === 'invite') {
      room.invitedBy = String(event.sender);
      if (content.is_direct === true) room.direct = true;
    }
  }
  if (!room.name) room.name = nameFromMembers(state, room);
}

const inRoom = (roomId: string, event: Json, type: string, content: Json): VerificationEvent => ({
  type,
  content,
  sender: String(event.sender),
  roomId,
  eventId: String(event.event_id),
  ts: Number(event.origin_server_ts ?? Date.now()),
});

/** What a timeline event shows as, or null for one that shows nothing. A step of a check by emoji
 *  goes on to lib/matrix-verify.ts; its request shows too, as Element shows it. */
async function messageOf(state: MatrixState, roomId: string, event: Json): Promise<MatrixMessage | null> {
  const base = { id: String(event.event_id), sender: String(event.sender), ts: Number(event.origin_server_ts ?? Date.now()) };
  let type = String(event.type);
  let content = (event.content as Json) ?? {};
  if (type === 'm.room.encrypted') {
    if (content.algorithm !== MEGOLM) return null;
    const locked = { sessionId: String(content.session_id), ciphertext: String(content.ciphertext), senderKey: String(content.sender_key ?? '') };
    const opened = await openMegolm(state, roomId, base.id, locked);
    if (!opened) return { ...base, text: '', locked };
    type = opened.type;
    content = opened.content;
  }
  tap(roomId, { ...event, type, content }, true);
  if (isVerification(type, content)) await passVerification(state, inRoom(roomId, event, type, content));
  // A call's events show as its line, which the calls keep (lib/matrix-calls.ts).
  if (isCallEvent(type)) await passCall(state, callIn(roomId, event, type, content));
  if (type === 'm.room.message') return { ...base, ...shownOf(content) };
  return null;
}

function bodyOf(content: Json | undefined): string {
  return typeof content?.body === 'string' ? content.body : '';
}

const KINDS: Record<string, MatrixFile['kind']> = { 'm.image': 'image', 'm.video': 'video', 'm.audio': 'audio', 'm.file': 'file' };

function isEncryptedFile(value: unknown): value is EncryptedFile {
  const v = value as Partial<EncryptedFile> | null;
  return (
    typeof v?.url === 'string' &&
    v.url.startsWith('mxc://') &&
    v.key?.alg === 'A256CTR' &&
    typeof v.key.k === 'string' &&
    typeof v.iv === 'string' &&
    typeof v.hashes?.sha256 === 'string'
  );
}

/** What a message's content shows: its words, and its file when it carries one. */
function shownOf(content: Json | undefined): Pick<MatrixMessage, 'text' | 'file'> {
  if (content?.msgtype === 'm.key.verification.request') return { text: t('Asked to check devices by emoji.') };
  const kind = KINDS[String(content?.msgtype)];
  if (!content || !kind) return { text: bodyOf(content) };
  const info = (content.info as Json | undefined) ?? {};
  const encrypted = isEncryptedFile(content.file) ? content.file : undefined;
  const url = typeof content.url === 'string' && content.url.startsWith('mxc://') ? content.url : undefined;
  if (!encrypted && !url) return { text: bodyOf(content) };
  const name = String(content.filename ?? content.body ?? 'file').slice(0, 200);
  const number = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : undefined);
  const file: MatrixFile = { kind, name, mime: typeof info.mimetype === 'string' ? info.mimetype : 'application/octet-stream' };
  if (number(info.size) !== undefined) file.size = number(info.size);
  if (number(info.w) !== undefined) file.w = number(info.w);
  if (number(info.h) !== undefined) file.h = number(info.h);
  if (encrypted) file.encrypted = encrypted;
  else file.url = url;
  // A caption, when the words are not only the file's name.
  const text = content.filename && content.body !== content.filename ? bodyOf(content) : '';
  return { text, file };
}

/** The content of a room message under the room's Megolm keys, or null without the key. */
async function openMegolm(state: MatrixState, roomId: string, eventId: string, locked: NonNullable<MatrixMessage['locked']>): Promise<{ type: string; content: Json } | null> {
  const key = `${roomId} ${locked.sessionId}`;
  const inbound = state.inbound[key];
  if (!inbound) return null;
  let opened: { session: Json; index: number; plaintext: string };
  try {
    opened = await core('megolm_decrypt', { session: inbound.session, ciphertext: locked.ciphertext });
  } catch {
    return null;
  }
  // The same index under the same session with another event is a replay: refused.
  const seenKey = `${locked.sessionId} ${opened.index}`;
  if (state.seen[seenKey] && state.seen[seenKey] !== eventId) return null;
  state.seen[seenKey] = eventId;
  const payload = JSON.parse(opened.plaintext) as Json;
  if (payload.room_id !== roomId) return null;
  return { type: String(payload.type), content: (payload.content as Json) ?? {} };
}

/** Takes in one to-device event: a room key sent us through Olm, or a call's. Answers whether a
 *  locked message opened with it, or the call took it. */
async function takeToDevice(state: MatrixState, event: Json): Promise<boolean> {
  if (event.type !== 'm.room.encrypted') {
    // Sent as it is: the call decides what to make of that.
    if (!isCallEvent(event.type)) return false;
    return passCall(state, { type: event.type, content: (event.content as Json) ?? {}, sender: String(event.sender), ts: Date.now(), encrypted: false });
  }
  const content = (event.content as Json) ?? {};
  const ours = await core<{ curve25519: string; ed25519: string }>('account_keys', { account: state.account });
  const mine = (content.ciphertext as Record<string, { type: number; body: string }> | undefined)?.[ours.curve25519];
  if (content.algorithm !== OLM || !mine) return false;
  const senderKey = String(content.sender_key);
  let opened: { account: Json; session: Json; index: number; plaintext: string };
  try {
    opened = await core('olm_decrypt', { account: state.account, sessions: state.olm[senderKey] ?? [], sender_key: senderKey, type: mine.type, body: mine.body });
  } catch {
    return false;
  }
  state.account = opened.account;
  const sessions = (state.olm[senderKey] ?? []).filter((_, i) => i !== opened.index);
  state.olm[senderKey] = [opened.session, ...sessions].slice(0, 5);
  const payload = JSON.parse(opened.plaintext) as Json;
  // The payload has to say it is from the sender and for us, as Matrix asks to check.
  if (payload.sender !== event.sender || payload.recipient !== state.userId) return false;
  if ((payload.recipient_keys as Json | undefined)?.ed25519 !== ours.ed25519) return false;
  const claimed = (payload.keys as Json | undefined)?.ed25519;
  const known = Object.values(state.devices[String(event.sender)] ?? {}).find((d) => d.curve25519 === senderKey);
  if (known && known.ed25519 !== claimed) return false;
  if (isVerification(payload.type, payload.content as Json)) return passVerification(state, { type: String(payload.type), content: (payload.content as Json) ?? {}, sender: String(event.sender) });
  if (isCallEvent(payload.type)) {
    const device = typeof payload.sender_device === 'string' ? payload.sender_device : known ? Object.entries(state.devices[String(event.sender)] ?? {}).find(([, d]) => d.curve25519 === senderKey)?.[0] : undefined;
    return passCall(state, { type: payload.type, content: (payload.content as Json) ?? {}, sender: String(event.sender), ts: Date.now(), encrypted: true, ...(device ? { senderDevice: device } : {}) });
  }
  if (payload.type !== 'm.room_key') return false;
  const key = (payload.content as Json) ?? {};
  if (key.algorithm !== MEGOLM || typeof key.room_id !== 'string' || typeof key.session_key !== 'string') return false;
  const made = await core<{ session: Json; session_id: string }>('megolm_inbound', { session_key: key.session_key });
  if (made.session_id !== key.session_id) return false;
  const roomId = key.room_id;
  if (!state.inbound[`${roomId} ${made.session_id}`]) state.inbound[`${roomId} ${made.session_id}`] = { session: made.session, senderKey };
  return retryLocked(state, roomId, made.session_id);
}

/** Opens the messages of `roomId` locked under `sessionId`, now that its key is here. */
export async function retryLocked(state: MatrixState, roomId: string, sessionId: string): Promise<boolean> {
  const room = state.rooms[roomId];
  if (!room) return false;
  let any = false;
  for (const message of room.messages) {
    if (message.locked?.sessionId !== sessionId) continue;
    const opened = await openMegolm(state, roomId, message.id, message.locked);
    if (!opened) continue;
    Object.assign(message, shownOf(opened.content));
    delete message.locked;
    any = true;
  }
  return any;
}

/** Everyone in a room who should be able to read what we send: those in it and those invited. */
async function membersOf(state: MatrixState, roomId: string): Promise<string[]> {
  const answer = await call(state, 'GET', `/rooms/${enc(roomId)}/members?not_membership=leave`);
  const room = roomOf(state, roomId);
  for (const event of (answer.chunk as Json[] | undefined) ?? []) takeState(room, event);
  return Object.keys(room.members);
}

/** Brings the devices of `users` up to date, keeping only those whose keys are signed by themselves. */
async function queryDevices(state: MatrixState, users: string[]): Promise<void> {
  const need = users.filter((u) => !state.devices[u] || state.outdated.includes(u));
  if (!need.length) return;
  const answer = await call(state, 'POST', '/keys/query', { device_keys: Object.fromEntries(need.map((u) => [u, []])) });
  const all = (answer.device_keys as Record<string, Record<string, Json>> | undefined) ?? {};
  for (const user of need) {
    const kept: Record<string, Device> = {};
    for (const [deviceId, keys] of Object.entries(all[user] ?? {})) {
      if (keys.user_id !== user || keys.device_id !== deviceId) continue;
      const k = (keys.keys as Json) ?? {};
      const ed25519 = String(k[`ed25519:${deviceId}`] ?? '');
      const curve25519 = String(k[`curve25519:${deviceId}`] ?? '');
      if (!ed25519 || !curve25519) continue;
      // A device we knew keeps its key: one that comes back with another is not taken.
      const before = state.devices[user]?.[deviceId];
      if (before && before.ed25519 !== ed25519) continue;
      const { ok } = await core<{ ok: boolean }>('verify_json', { json: keys, key: ed25519, user_id: user, key_id: `ed25519:${deviceId}` });
      if (ok) kept[deviceId] = { curve25519, ed25519 };
    }
    state.devices[user] = kept;
    state.outdated = state.outdated.filter((u) => u !== user);
  }
}

/** The Megolm session to send with in `roomId`: the one in use, or a new one when it is old or someone left. */
async function outboundFor(state: MatrixState, roomId: string, members: string[]): Promise<Outbound> {
  const now = Date.now();
  const current = state.outbound[roomId];
  const someoneLeft = current?.sharedWith.some((d) => !members.includes(d.slice(0, d.lastIndexOf(' '))));
  if (current && !someoneLeft && current.count < ROTATE_MESSAGES && now - current.created < ROTATE_MS) return current;
  const made = await core<{ session: Json; session_id: string; session_key: string }>('megolm_new', {});
  // We read our own messages with it too, as they come back in the sync.
  const own = await core<{ session: Json; session_id: string }>('megolm_inbound', { session_key: made.session_key });
  const ours = await core<{ curve25519: string }>('account_keys', { account: state.account });
  state.inbound[`${roomId} ${own.session_id}`] = { session: own.session, senderKey: ours.curve25519 };
  const next: Outbound = { session: made.session, sessionId: made.session_id, created: now, count: 0, sharedWith: [] };
  state.outbound[roomId] = next;
  return next;
}

/** One device to send to through Olm. */
type Target = { user: string; deviceId: string; device: Device };

/** Olm-encrypts to each of `targets` what `payloadOf` gives it, claiming a one-time key for a
 *  device with no session yet. Answers the to-device messages, by user and device, and the devices
 *  they are for: one whose one-time key cannot be had, or is not signed by it, is left out. */
async function sealToDevices<T extends Target>(state: MatrixState, targets: T[], payloadOf: (target: T) => { type: string; content: Json }): Promise<{ messages: Record<string, Record<string, Json>>; sealed: T[] }> {
  const noSession = targets.filter((d) => !state.olm[d.device.curve25519]?.length);
  const claimed: Record<string, string> = {};
  if (noSession.length) {
    const ask: Record<string, Record<string, string>> = {};
    for (const d of noSession) (ask[d.user] ??= {})[d.deviceId] = 'signed_curve25519';
    const answer = await call(state, 'POST', '/keys/claim', { one_time_keys: ask });
    const got = (answer.one_time_keys as Record<string, Record<string, Record<string, Json>>> | undefined) ?? {};
    for (const d of noSession) {
      const keys = got[d.user]?.[d.deviceId] ?? {};
      const [keyId, key] = Object.entries(keys)[0] ?? [];
      if (!keyId || !key) continue;
      const { ok } = await core<{ ok: boolean }>('verify_json', { json: key, key: d.device.ed25519, user_id: d.user, key_id: `ed25519:${d.deviceId}` });
      if (ok) claimed[d.device.curve25519] = String(key.key);
    }
  }
  const ours = await core<{ curve25519: string; ed25519: string }>('account_keys', { account: state.account });
  const messages: Record<string, Record<string, Json>> = {};
  const sealed: T[] = [];
  for (const d of targets) {
    const session = state.olm[d.device.curve25519]?.[0];
    if (!session && !claimed[d.device.curve25519]) continue;
    const payload = {
      ...payloadOf(d),
      sender: state.userId,
      sender_device: state.deviceId,
      keys: { ed25519: ours.ed25519 },
      recipient: d.user,
      recipient_keys: { ed25519: d.device.ed25519 },
    };
    const made = await core<{ session: Json; type: number; body: string }>('olm_encrypt', {
      account: state.account,
      session: session ?? null,
      identity_key: d.device.curve25519,
      one_time_key: claimed[d.device.curve25519] ?? null,
      plaintext: JSON.stringify(payload),
    });
    state.olm[d.device.curve25519] = [made.session, ...(state.olm[d.device.curve25519] ?? []).slice(session ? 1 : 0)].slice(0, 5);
    (messages[d.user] ??= {})[d.deviceId] = {
      algorithm: OLM,
      sender_key: ours.curve25519,
      ciphertext: { [d.device.curve25519]: { type: made.type, body: made.body } },
    };
    sealed.push(d);
  }
  return { messages, sealed };
}

/** Gives the room's current Megolm key to every member device that does not have it yet. */
async function shareRoomKey(state: MatrixState, roomId: string, outbound: Outbound, members: string[]): Promise<void> {
  await queryDevices(state, members);
  const targets: Target[] = [];
  for (const user of members) {
    for (const [deviceId, device] of Object.entries(state.devices[user] ?? {})) {
      if (user === state.userId && deviceId === state.deviceId) continue;
      if (outbound.sharedWith.includes(`${user} ${deviceId}`)) continue;
      targets.push({ user, deviceId, device });
    }
  }
  if (!targets.length) return;
  // The key as it is now: a member who comes later reads from here on, not what came before.
  const { session_key } = await core<{ session_key: string }>('megolm_session_key', { session: outbound.session });
  const { messages, sealed } = await sealToDevices(state, targets, () => ({
    type: 'm.room_key',
    content: { algorithm: MEGOLM, room_id: roomId, session_id: outbound.sessionId, session_key },
  }));
  for (const d of sealed) outbound.sharedWith.push(`${d.user} ${d.deviceId}`);
  if (Object.keys(messages).length) await call(state, 'PUT', `/sendToDevice/m.room.encrypted/${txn()}`, { messages });
}

/** Sends an event of `type` to devices, encrypted through Olm: `to` gives, by user, the content for
 *  each of their device IDs, or for all of them under '*'. This device is left out. */
export async function sendToDeviceSealed(state: MatrixState, type: string, to: Record<string, Record<string, Json>>): Promise<void> {
  await queryDevices(state, Object.keys(to));
  const targets: (Target & { content: Json })[] = [];
  for (const [user, devices] of Object.entries(to)) {
    for (const [deviceId, device] of Object.entries(state.devices[user] ?? {})) {
      if (user === state.userId && deviceId === state.deviceId) continue;
      const content = devices[deviceId] ?? devices['*'];
      if (content) targets.push({ user, deviceId, device, content });
    }
  }
  if (!targets.length) return;
  const { messages } = await sealToDevices(state, targets, (d) => ({ type, content: d.content }));
  if (Object.keys(messages).length) await call(state, 'PUT', `/sendToDevice/m.room.encrypted/${txn()}`, { messages });
}

/** Sends a to-device event as it is, not encrypted, to devices by user then device ID ('*' for all of a user's). */
export async function sendToDevicePlain(state: MatrixState, type: string, to: Record<string, Record<string, Json>>): Promise<void> {
  await call(state, 'PUT', `/sendToDevice/${enc(type)}/${txn()}`, { messages: to });
}

/** Sends `text` to a room, encrypted when the room is. Answers the message as it now shows. */
export function sendText(state: MatrixState, roomId: string, text: string): Promise<MatrixMessage> {
  return sendContent(state, roomId, { msgtype: 'm.text', body: text });
}

/** Sends a message's content to a room, encrypted when the room is. */
export async function sendContent(state: MatrixState, roomId: string, content: Json): Promise<MatrixMessage> {
  const room = roomOf(state, roomId);
  const id = txn();
  const message: MatrixMessage = { id, sender: state.userId, ts: Date.now(), ...shownOf(content), state: 'sending' };
  room.messages.push(message);
  try {
    message.id = await sendEvent(state, roomId, 'm.room.message', content, id);
    delete message.state;
  } catch (error) {
    message.state = 'failed';
    throw error;
  }
  return message;
}

/** Sends an event of any `type` to a room, encrypted when the room is, and answers its ID. */
export async function sendEvent(state: MatrixState, roomId: string, type: string, content: Json, id = txn()): Promise<string> {
  const room = roomOf(state, roomId);
  let sent: Json;
  {
    if (room.encrypted) {
      const members = await membersOf(state, roomId);
      const outbound = await outboundFor(state, roomId, members);
      await shareRoomKey(state, roomId, outbound, members);
      const sealed = await core<{ session: Json; ciphertext: string }>('megolm_encrypt', {
        session: outbound.session,
        plaintext: JSON.stringify({ type, content, room_id: roomId }),
      });
      outbound.session = sealed.session;
      outbound.count += 1;
      const ours = await core<{ curve25519: string }>('account_keys', { account: state.account });
      sent = await call(state, 'PUT', `/rooms/${enc(roomId)}/send/m.room.encrypted/${id}`, {
        algorithm: MEGOLM,
        sender_key: ours.curve25519,
        ciphertext: sealed.ciphertext,
        session_id: outbound.sessionId,
        device_id: state.deviceId,
      });
    } else {
      sent = await call(state, 'PUT', `/rooms/${enc(roomId)}/send/${enc(type)}/${id}`, content);
    }
  }
  return String(sent.event_id);
}

/** Sets a piece of a room's state (never encrypted, as Matrix keeps state readable to the
 *  homeserver), and answers its event's ID. */
export async function sendStateEvent(state: MatrixState, roomId: string, type: string, stateKey: string, content: Json): Promise<string> {
  const sent = await call(state, 'PUT', `/rooms/${enc(roomId)}/state/${enc(type)}/${enc(stateKey)}`, content);
  return String(sent.event_id);
}

/** A room's state as the homeserver has it now: each piece's latest event, `room_id` set. */
export async function roomState(state: MatrixState, roomId: string): Promise<Json[]> {
  const answer = (await call(state, 'GET', `/rooms/${enc(roomId)}/state`)) as unknown;
  return Array.isArray(answer) ? (answer as Json[]).map((event) => ({ ...event, room_id: roomId })) : [];
}

const DELAYED = 'org.matrix.msc4140';

/** Sets a piece of a room's state after `delayMs`, unless told otherwise before then (MSC4140):
 *  the homeserver keeps it back meanwhile. A call's "left the call" waits so, and goes out by itself
 *  if the phone goes quiet. Answers the delay's ID. */
export async function sendDelayedState(state: MatrixState, roomId: string, type: string, stateKey: string, content: Json, delayMs: number): Promise<string> {
  try {
    const sent = await unstable(state, DELAYED, 'PUT', `/rooms/${enc(roomId)}/delayed_event/${enc(type)}/${txn()}`, { delay_ms: delayMs, state_key: stateKey, content });
    return String(sent.delay_id);
  } catch (error) {
    if (!(error instanceof MatrixError && error.code === 'M_UNRECOGNIZED')) throw error;
  }
  // A homeserver with MSC4140 as it was first: the delay asked of the usual request.
  const sent = await call(state, 'PUT', `/rooms/${enc(roomId)}/state/${enc(type)}/${enc(stateKey)}?${DELAYED}.delay=${Math.round(delayMs)}`, content);
  return String(sent.delay_id);
}

/** Tells the homeserver what to do with a delayed event now: send it, wait again from now, or drop it. */
export async function updateDelayed(state: MatrixState, delayId: string, action: 'send' | 'restart' | 'cancel'): Promise<void> {
  try {
    await unstable(state, DELAYED, 'POST', `/delayed_events/${enc(delayId)}/${action}`, {});
    return;
  } catch (error) {
    if (!(error instanceof MatrixError && error.code === 'M_UNRECOGNIZED')) throw error;
  }
  await unstable(state, DELAYED, 'POST', `/delayed_events/${enc(delayId)}`, { action });
}

/** Where a call's media may go (MSC4143): the media servers the homeserver lists, or, from a
 *  homeserver that lists none, those its server's .well-known names, as servers said before. */
export async function rtcTransports(state: MatrixState): Promise<Json[]> {
  try {
    const listed = (await unstable(state, 'org.matrix.msc4143', 'GET', '/rtc/transports')).rtc_transports;
    if (Array.isArray(listed) && listed.length) return listed as Json[];
  } catch {
    // None listed: the .well-known then.
  }
  const server = state.userId.slice(state.userId.indexOf(':') + 1);
  const answer = await http({ method: 'GET', url: `https://${server}/.well-known/matrix/client` });
  const foci = answer.status === 200 ? answer.json['org.matrix.msc4143.rtc_foci'] : undefined;
  return Array.isArray(foci) ? (foci as Json[]) : [];
}

/** A token that proves to another service who this account is (OpenID), as a call's media
 *  server asks for (MatrixRTC with LiveKit). It says only the account, for an hour or so. */
export async function openIdToken(state: MatrixState): Promise<Json> {
  return call(state, 'POST', `/user/${enc(state.userId)}/openid/request_token`, {});
}

/** A call's line in `roomId`, kept here only; one with the same `id` is replaced. A missed call
 *  counts as not read. */
export function addMatrixCallLine(state: MatrixState, roomId: string, mine: boolean, text: string, id: string, at = Date.now()): void {
  const room = state.rooms[roomId];
  if (!room) return;
  const missed = !mine && text.includes('Missed ');
  const before = room.messages.find((m) => m.call && m.id === id);
  if (before) {
    if (before.sender !== state.userId && before.text.includes('Missed ') && !missed && room.unread > 0) room.unread -= 1;
    before.text = text;
    if (mine) before.sender = state.userId;
    return;
  }
  const others = Object.keys(room.members).filter((m) => m !== state.userId);
  room.messages.push({ id, sender: mine ? state.userId : (others[0] ?? ''), ts: at, text, call: true });
  room.messages.sort((a, b) => a.ts - b.ts);
  room.messages = room.messages.slice(-KEEP_MESSAGES);
  if (missed) room.unread += 1;
}

/** Starts an encrypted chat with one person, by their Matrix ID. Answers the room. */
export async function startChat(state: MatrixState, userId: string): Promise<MatrixRoom> {
  const who = userId.trim();
  if (!isMatrixId(who)) throw new Error(t('Write a Matrix ID, such as @name:matrix.org.'));
  const made = await call(state, 'POST', '/createRoom', {
    preset: 'trusted_private_chat',
    is_direct: true,
    invite: [who],
    initial_state: [{ type: 'm.room.encryption', state_key: '', content: { algorithm: MEGOLM } }],
  });
  const room = roomOf(state, String(made.room_id));
  room.encrypted = true;
  room.direct = true;
  room.members[state.userId] = { membership: 'join' };
  room.members[who] = { membership: 'invite' };
  room.name = who;
  // Element lists a chat with one person apart because of m.direct: ours keeps every such room.
  const direct: Record<string, string[]> = {};
  for (const r of Object.values(state.rooms)) {
    if (!r.direct) continue;
    for (const member of Object.keys(r.members)) if (member !== state.userId) (direct[member] ??= []).push(r.id);
  }
  await call(state, 'PUT', `/user/${enc(state.userId)}/account_data/m.direct`, direct);
  return room;
}

/** Joins a room we were invited to, or one by its ID or #alias:server. */
export async function joinRoom(state: MatrixState, idOrAlias: string): Promise<string> {
  const joined = await call(state, 'POST', `/join/${enc(idOrAlias.trim())}`, {});
  const id = String(joined.room_id);
  const room = roomOf(state, id);
  delete room.invitedBy;
  room.members[state.userId] = { membership: 'join' };
  return id;
}

/** Leaves a room, or says no to an invite. */
export async function leaveRoom(state: MatrixState, roomId: string): Promise<void> {
  await call(state, 'POST', `/rooms/${enc(roomId)}/leave`, {});
  delete state.rooms[roomId];
  delete state.outbound[roomId];
}

/** Tells the homeserver we read the room up to its last message. */
export async function markRead(state: MatrixState, roomId: string): Promise<void> {
  const room = state.rooms[roomId];
  const last = room?.messages.filter((m) => !m.state).at(-1);
  if (!room || !last) return;
  room.unread = 0;
  await call(state, 'POST', `/rooms/${enc(roomId)}/receipt/m.read/${enc(last.id)}`, {});
}

/** The rooms as a list shows them: invites first, then by their newest message. */
export function roomList(state: MatrixState): MatrixRoom[] {
  const last = (r: MatrixRoom) => r.messages.at(-1)?.ts ?? 0;
  return Object.values(state.rooms).sort((a, b) => Number(!!b.invitedBy) - Number(!!a.invitedBy) || last(b) - last(a));
}
