import { sha256 } from '@noble/hashes/sha2.js';

import { randomBytes, toBase64, utf8Encode } from './crypto';
import { mark, t } from './i18n';
import { call, core, enc, sendEvent, setVerificationHandler, signWith, txn, type Json, type MatrixState, type VerificationEvent } from './matrix';
import { QR_SECRET_BYTES, readMatrixQr, type MatrixQr } from './matrix-qr';

// Checking a Matrix device by emoji (docs/matrix.md; spec: Key verification, m.sas.v1): both
// people see seven pictures made from a secret their two devices agreed on, and say whether they
// match. If they do, nobody sat in between, so the keys each device then sends under that secret
// (MACs, hkdf-hmac-sha256.v2) are the real ones: the device's own key, and the account's master
// key. Element and other Matrix apps do the same, so a check can go either way between them and
// Erevos: with another person in the chat with them (the steps go as room events), or between two
// devices of one account (the steps go to-device, as Element's "Verify this session" does).
//
// A check can go by QR code instead (lib/matrix-qr.ts, m.qr_code.show.v1 / m.reciprocate.v1), as
// Element offers it: one device shows a code of two keys and a one-use secret, the other photographs
// it, checks that the code's second key is its own side's and so learns the first, and sends back
// the secret; the device that showed it then asks its person whether the other app said the check
// went well, and learns the second key. Nothing is trusted from a code until both sides said done.
//
// A check lives only in memory, for the minutes it takes, its one-use key with it: nothing of it
// is kept but what it proved (MatrixState.verified). Once one proves an account's master key, or
// another device of ours, and this device holds our cross-signing keys, it signs them, so other
// apps see them as checked too.

/** How far a check has come. */
export type VerificationPhase =
  /** They asked: Accept or Decline. */
  | 'asked'
  /** Waiting for the other side (to accept, or to send its key). */
  | 'waiting'
  /** Both are ready: show our code, photograph theirs, or compare emoji. */
  | 'choose'
  /** They photographed our code and sent its secret back: did their app say it went well? */
  | 'scanned'
  /** The seven pictures are ready to compare. */
  | 'compare'
  /** We said they match; waiting for the other side's keys. */
  | 'confirmed'
  | 'done'
  | 'cancelled';

export type Verification = {
  /** The transaction's ID; in a room, the request's event ID. */
  id: string;
  roomId?: string;
  /** The other side. With our own user, another device of ours. */
  userId: string;
  deviceId?: string;
  /** We asked. */
  ours: boolean;
  phase: VerificationPhase;
  at: number;
  /** Seven numbers from 0 to 63 (lib/sas-emoji.ts), once there. */
  emoji?: number[];
  /** Why it stopped, said for a person. */
  reason?: string;
  // The steps, as they went.
  starter?: 'us' | 'them';
  start?: Json;
  secret?: string;
  ourKey?: string;
  theirKey?: string;
  commitment?: string;
  theirMac?: Json;
  macSent?: boolean;
  theirKeys?: { device?: string; deviceKeys?: Json; master?: string };
  /** The ways the other side offered. */
  theirMethods?: string[];
  /** The code we show, once there is one. */
  qr?: MatrixQr;
  /** What a code proves once both sides said done: their account's master key, a device's key, or our own master key. */
  trust?: { master?: string; device?: string; ownMaster?: string };
};

const SAS = 'm.sas.v1';
const QR_SHOW = 'm.qr_code.show.v1';
const QR_SCAN = 'm.qr_code.scan.v1';
const RECIPROCATE = 'm.reciprocate.v1';
/** The ways Erevos offers: emoji, and showing and photographing a code. */
const METHODS = [SAS, QR_SHOW, QR_SCAN, RECIPROCATE];
const AGREEMENT = 'curve25519-hkdf-sha256';
const MAC_METHOD = 'hkdf-hmac-sha256.v2';
/** A check asked longer ago than this, or not answered for as long, is dropped (as the spec asks). */
const TOO_OLD = 10 * 60_000;

// The checks of each signed-in device, by their ID.
const checks = new Map<string, Map<string, Verification>>();
const listeners = new Set<() => void>();

const own = (state: MatrixState) => {
  const key = `${state.userId} ${state.deviceId}`;
  let found = checks.get(key);
  if (!found) checks.set(key, (found = new Map()));
  return found;
};

const told = () => listeners.forEach((listener) => listener());

/** Hears when a check moves on outside a sync (a step sent, an answer given). */
export function onVerificationChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The device's checks still worth showing, newest first: those going on, and those ended in the last minutes. */
export function verifications(state: MatrixState, now = Date.now()): Verification[] {
  const list = [...own(state).values()];
  for (const v of list) {
    if (v.phase !== 'done' && v.phase !== 'cancelled' && now - v.at > TOO_OLD) stop(v, t('Nobody answered in time.'));
  }
  return list.filter((v) => now - v.at < TOO_OLD).sort((a, b) => b.at - a.at);
}

/** Forgets the device's checks (as it signs out, or its space closes). */
export function forgetVerifications(state: MatrixState): void {
  checks.delete(`${state.userId} ${state.deviceId}`);
}

/** Whether a check by emoji proved this user (or, with `deviceId`, that device of theirs). */
export function isVerified(state: MatrixState, userId: string, deviceId?: string): boolean {
  const proved = state.verified?.[userId];
  if (!proved) return false;
  return deviceId ? deviceId in proved.devices : Object.keys(proved.devices).length > 0 || !!proved.master;
}

const b64 = (bytes: Uint8Array) => toBase64(bytes).replace(/=+$/, '');

// Sends one step: in the room, tied to the request, or to their device (to every one of theirs
// while none has answered yet).
async function send(state: MatrixState, v: Verification, type: string, content: Json): Promise<Json> {
  if (v.roomId) {
    const full = { ...content, 'm.relates_to': { rel_type: 'm.reference', event_id: v.id } };
    await sendEvent(state, v.roomId, type, full);
    return full;
  }
  const full = { ...content, transaction_id: v.id };
  await call(state, 'PUT', `/sendToDevice/${enc(type)}/${txn()}`, { messages: { [v.userId]: { [v.deviceId ?? '*']: full } } });
  return full;
}

const REASONS: Record<string, string> = {
  'm.user': mark('The other side declined or stopped the check.'),
  'm.timeout': mark('Nobody answered in time.'),
  'm.mismatched_sas': mark('The pictures did not match, so the check stopped. Someone may be in between.'),
  'm.key_mismatch': mark('The keys that came do not match the device, so the check stopped. Someone may be in between.'),
  'm.mismatched_commitment': mark('The keys that came do not match the device, so the check stopped. Someone may be in between.'),
  'm.accepted': mark('Another of your devices answered the check.'),
};

function reasonOf(code: unknown): string {
  const known = REASONS[String(code)];
  return known ? t(known) : t('The check stopped: {code}', { code: String(code ?? '') });
}

function stop(v: Verification, reason: string): void {
  v.phase = 'cancelled';
  v.reason = reason;
  delete v.secret;
}

async function cancel(state: MatrixState, v: Verification, code: string): Promise<void> {
  stop(v, reasonOf(code));
  await send(state, v, 'm.key.verification.cancel', { code, reason: code }).catch(() => undefined);
}

/** Asks someone to check by emoji: in the chat with them (`roomId`), or, without one, another device of ours. */
export async function requestVerification(state: MatrixState, userId: string, roomId?: string): Promise<Verification> {
  const content = { from_device: state.deviceId, methods: METHODS };
  let id: string;
  if (roomId) {
    const body = `${state.userId} asks to check your devices by emoji. Your app may not do it yet.`;
    id = await sendEvent(state, roomId, 'm.room.message', { msgtype: 'm.key.verification.request', body, to: userId, ...content });
  } else {
    id = txn();
    await call(state, 'PUT', `/sendToDevice/m.key.verification.request/${txn()}`, {
      messages: { [userId]: { '*': { ...content, timestamp: Date.now(), transaction_id: id } } },
    });
  }
  const v: Verification = { id, roomId, userId, ours: true, phase: 'waiting', at: Date.now() };
  own(state).set(id, v);
  told();
  return v;
}

/** Says yes to a check they asked for. */
export async function acceptVerification(state: MatrixState, id: string): Promise<void> {
  const v = own(state).get(id);
  if (!v || v.phase !== 'asked') return;
  v.phase = 'waiting';
  v.at = Date.now();
  told();
  await send(state, v, 'm.key.verification.ready', { from_device: state.deviceId, methods: METHODS });
  await offerCodes(state, v);
}

// Once both are ready: when a code can go either way, the person chooses (our code shown, if we
// can make one); otherwise the emoji, which the side that asked starts, as before.
async function offerCodes(state: MatrixState, v: Verification): Promise<void> {
  const theirs = v.theirMethods ?? [];
  const byCode = theirs.includes(RECIPROCATE) && (theirs.includes(QR_SCAN) || theirs.includes(QR_SHOW));
  if (!byCode) return;
  v.theirKeys ??= await theirKeys(state, v);
  if (theirs.includes(QR_SCAN)) v.qr = (await ourCode(state, v)) ?? undefined;
  if (!v.starter) v.phase = 'choose';
}

/** Our account's master key, when this device trusts it: it holds the cross-signing keys, or a check proved it. */
async function trustedOwnMaster(state: MatrixState): Promise<string | undefined> {
  if (state.crossSigning) return (await core<{ public: string }>('signing_key_public', { secret: state.crossSigning.master })).public;
  return state.verified?.[state.userId]?.master;
}

// The code we show, as the spec has it for who the other side is and what this device trusts; null
// when we cannot make one honestly (we do not know a key it would need).
async function ourCode(state: MatrixState, v: Verification): Promise<MatrixQr | null> {
  const secret = b64(randomBytes(QR_SECRET_BYTES));
  const ownMaster = await trustedOwnMaster(state);
  if (v.userId !== state.userId) {
    if (!ownMaster || !v.theirKeys?.master) return null;
    return { mode: 0, id: v.id, first: ownMaster, second: v.theirKeys.master, secret };
  }
  if (ownMaster) return v.theirKeys?.device ? { mode: 1, id: v.id, first: ownMaster, second: v.theirKeys.device, secret } : null;
  const device = (await core<{ ed25519: string }>('account_keys', { account: state.account })).ed25519;
  return v.theirKeys?.master ? { mode: 2, id: v.id, first: device, second: v.theirKeys.master, secret } : null;
}

/** Compares emoji instead of a code: starts it from this side. */
export async function verifyByEmoji(state: MatrixState, id: string): Promise<void> {
  const v = own(state).get(id);
  if (!v || v.phase !== 'choose' || v.starter) return;
  if (!(v.theirMethods ?? []).includes(SAS)) throw new Error(t('Their app does not compare emoji: show or photograph a code.'));
  v.phase = 'waiting';
  told();
  await sendStart(state, v);
}

/**
 * The bytes of their code, photographed: checked against what this side knows (its own master key
 * or device key in the code's second place), and its secret sent back. What its first key proves
 * is trusted once they say done.
 */
export async function scanCode(state: MatrixState, id: string, bytes: Uint8Array): Promise<void> {
  const v = own(state).get(id);
  if (!v || v.phase !== 'choose' || v.starter) return;
  const qr = readMatrixQr(bytes);
  if (!qr) throw new Error(t('This is not the code of a Matrix check. Photograph the code their app shows for this check.'));
  if (qr.id !== v.id) throw new Error(t('This code is for another check. Photograph the code their app shows for this check.'));
  v.theirKeys ??= await theirKeys(state, v);
  const ownMaster = await trustedOwnMaster(state);
  const device = (await core<{ ed25519: string }>('account_keys', { account: state.account })).ed25519;
  let trust: Verification['trust'];
  if (v.userId !== state.userId) {
    // Their master key first, ours second.
    if (qr.mode !== 0) return cancel(state, v, 'm.key_mismatch');
    if (!ownMaster) throw new Error(t('This device does not know your own Matrix key yet, so it cannot check their code. Compare emoji, or let them photograph yours.'));
    if (qr.second !== ownMaster || qr.first !== v.theirKeys?.master) return cancel(state, v, 'm.key_mismatch');
    trust = { master: qr.first };
  } else if (qr.mode === 1) {
    // Another device of ours that trusts our master key: the master key first, this device second.
    if (qr.second !== device || (v.theirKeys?.master && qr.first !== v.theirKeys.master)) return cancel(state, v, 'm.key_mismatch');
    trust = { ownMaster: qr.first };
  } else if (qr.mode === 2) {
    // Another device of ours that does not trust our master key yet: its own key first, the master key second.
    if (!ownMaster) throw new Error(t('Neither device knows your own Matrix key yet. Compare emoji instead.'));
    if (qr.second !== ownMaster || qr.first !== v.theirKeys?.device) return cancel(state, v, 'm.key_mismatch');
    trust = { device: qr.first };
  } else {
    return cancel(state, v, 'm.key_mismatch');
  }
  v.trust = trust;
  v.starter = 'us';
  v.phase = 'confirmed';
  told();
  v.start = await send(state, v, 'm.key.verification.start', { from_device: state.deviceId, method: RECIPROCATE, secret: qr.secret });
}

/** They photographed our code: their app said the check went well, or it did not. */
export async function confirmScanned(state: MatrixState, id: string, ok: boolean): Promise<void> {
  const v = own(state).get(id);
  if (!v || v.phase !== 'scanned' || !v.qr) return;
  if (!ok) {
    await cancel(state, v, 'm.user');
    told();
    return;
  }
  // What our code's second key was, now proved too.
  const qr = v.qr;
  v.trust = qr.mode === 0 ? { master: qr.second } : qr.mode === 1 ? { device: qr.second } : { ownMaster: qr.second };
  await send(state, v, 'm.key.verification.done', {});
  await trustCode(state, v);
  told();
}

// What a code proved, kept and, with our cross-signing keys here, signed for other apps to see.
async function trustCode(state: MatrixState, v: Verification): Promise<void> {
  const trust = v.trust ?? {};
  const proved = ((state.verified ??= {})[v.userId] ??= { devices: {} });
  if (trust.master) proved.master = trust.master;
  if (trust.device && v.deviceId) proved.devices[v.deviceId] = trust.device;
  if (trust.ownMaster) ((state.verified[state.userId] ??= { devices: {} }).master = trust.ownMaster);
  v.phase = 'done';
  delete v.qr;
  if (trust.master && v.theirKeys) v.theirKeys.master = trust.master;
  await signProved(state, v, !!trust.master, !!trust.device && trust.device === v.theirKeys?.device).catch(() => undefined);
}

/** Stops a check: declined, or ended by the person. */
export async function cancelVerification(state: MatrixState, id: string): Promise<void> {
  const v = own(state).get(id);
  if (!v || v.phase === 'done' || v.phase === 'cancelled') return;
  await cancel(state, v, 'm.user');
  told();
}

/** The person compared the pictures: they match, or they do not. */
export async function confirmVerification(state: MatrixState, id: string, match: boolean): Promise<void> {
  const v = own(state).get(id);
  if (!v || v.phase !== 'compare') return;
  if (!match) {
    await cancel(state, v, 'm.mismatched_sas');
    told();
    return;
  }
  v.phase = 'confirmed';
  told();
  await sendMac(state, v);
  if (v.theirMac) await checkMac(state, v);
  told();
}

// The two sides of the MACs' info: who sends them, to whom, in this check.
const macBase = (fromUser: string, fromDevice: string, toUser: string, toDevice: string, id: string) =>
  `MATRIX_KEY_VERIFICATION_MAC${fromUser}${fromDevice}${toUser}${toDevice}${id}`;

async function sasCall<T extends Json>(op: string, v: Verification, request: Json): Promise<T> {
  return core<T>(op, { secret: v.secret, their: v.theirKey, ...request });
}

async function sendMac(state: MatrixState, v: Verification): Promise<void> {
  const ours = await core<{ ed25519: string }>('account_keys', { account: state.account });
  const keys: Record<string, string> = { [`ed25519:${state.deviceId}`]: ours.ed25519 };
  if (state.crossSigning) {
    const master = await core<{ public: string }>('signing_key_public', { secret: state.crossSigning.master });
    keys[`ed25519:${master.public}`] = master.public;
  }
  const base = macBase(state.userId, state.deviceId, v.userId, v.deviceId ?? '', v.id);
  const mac: Record<string, string> = {};
  for (const [keyId, key] of Object.entries(keys)) mac[keyId] = (await sasCall<{ mac: string }>('sas_mac', v, { info: base + keyId, input: key })).mac;
  const list = (await sasCall<{ mac: string }>('sas_mac', v, { info: `${base}KEY_IDS`, input: Object.keys(keys).sort().join(',') })).mac;
  await send(state, v, 'm.key.verification.mac', { mac, keys: list });
  v.macSent = true;
}

// Their MACs, checked against the keys their homeserver gave: every key they name that we know
// has to match, their device's own key at least.
async function checkMac(state: MatrixState, v: Verification): Promise<void> {
  const theirs = v.theirMac!;
  const mac = (theirs.mac as Record<string, string> | undefined) ?? {};
  const base = macBase(v.userId, v.deviceId ?? '', state.userId, state.deviceId, v.id);
  const verify = async (info: string, input: string, given: unknown) =>
    typeof given === 'string' && (await sasCall<{ ok: boolean }>('sas_verify', v, { info, input, mac: given })).ok;
  if (!(await verify(`${base}KEY_IDS`, Object.keys(mac).sort().join(','), theirs.keys))) return cancel(state, v, 'm.key_mismatch');
  const known: Record<string, string> = {};
  if (v.theirKeys?.device) known[`ed25519:${v.deviceId}`] = v.theirKeys.device;
  if (v.theirKeys?.master) known[`ed25519:${v.theirKeys.master}`] = v.theirKeys.master;
  if (!v.theirKeys?.device || !(`ed25519:${v.deviceId}` in mac)) return cancel(state, v, 'm.key_mismatch');
  let masterProved = false;
  for (const [keyId, given] of Object.entries(mac)) {
    const key = known[keyId];
    if (!key) continue;
    if (!(await verify(base + keyId, key, given))) return cancel(state, v, 'm.key_mismatch');
    if (key === v.theirKeys.master) masterProved = true;
  }
  const proved = ((state.verified ??= {})[v.userId] ??= { devices: {} });
  proved.devices[v.deviceId!] = v.theirKeys.device;
  if (masterProved) proved.master = v.theirKeys.master;
  await send(state, v, 'm.key.verification.done', {});
  v.phase = 'done';
  delete v.secret;
  await signProved(state, v, masterProved).catch(() => undefined);
}

// With our cross-signing keys on this device: another device of ours gets our self-signing key's
// signature, another person's master key our user-signing key's, so other apps see them checked.
async function signProved(state: MatrixState, v: Verification, masterProved: boolean, deviceProved = true): Promise<void> {
  const keys = state.crossSigning;
  if (!keys) return;
  const sign = (object: Json, secret: string) => signWith(state, object, secret);
  if (v.userId === state.userId && deviceProved && v.theirKeys?.deviceKeys) {
    await call(state, 'POST', '/keys/signatures/upload', { [state.userId]: { [v.deviceId!]: await sign(v.theirKeys.deviceKeys, keys.selfSigning) } });
  } else if (v.userId !== state.userId && masterProved && v.theirKeys?.master) {
    const answer = await call(state, 'POST', '/keys/query', { device_keys: { [v.userId]: [] } });
    const master = (answer.master_keys as Record<string, Json> | undefined)?.[v.userId];
    if (!master || !Object.values((master.keys as Json) ?? {}).includes(v.theirKeys.master)) return;
    await call(state, 'POST', '/keys/signatures/upload', { [v.userId]: { [v.theirKeys.master]: await sign(master, keys.userSigning) } });
  }
}

// Their device's key, checked by its own signature, and their account's master key, as their
// homeserver gives them: what their MACs are checked against.
async function theirKeys(state: MatrixState, v: Verification): Promise<Verification['theirKeys']> {
  const answer = await call(state, 'POST', '/keys/query', { device_keys: { [v.userId]: [] } });
  const keys = (answer.device_keys as Record<string, Record<string, Json>> | undefined)?.[v.userId]?.[v.deviceId ?? ''];
  const device = keys ? String((keys.keys as Json | undefined)?.[`ed25519:${v.deviceId}`] ?? '') : '';
  const ok = device ? (await core<{ ok: boolean }>('verify_json', { json: keys!, key: device, user_id: v.userId, key_id: `ed25519:${v.deviceId}` })).ok : false;
  const masterKeys = (answer.master_keys as Record<string, Json> | undefined)?.[v.userId]?.keys as Record<string, string> | undefined;
  const master = masterKeys ? Object.values(masterKeys)[0] : undefined;
  return ok ? { device, deviceKeys: keys, master } : { master };
}

const offers = (content: Json, field: string, value: string) => Array.isArray(content[field]) && (content[field] as unknown[]).includes(value);

async function sendStart(state: MatrixState, v: Verification): Promise<void> {
  v.starter = 'us';
  v.start = await send(state, v, 'm.key.verification.start', {
    from_device: state.deviceId,
    method: SAS,
    key_agreement_protocols: [AGREEMENT],
    hashes: ['sha256'],
    message_authentication_codes: [MAC_METHOD],
    short_authentication_string: ['emoji', 'decimal'],
  });
}

// The seven pictures, once both keys are here.
async function compare(state: MatrixState, v: Verification): Promise<void> {
  const us = `${state.userId}|${state.deviceId}|${v.ourKey}`;
  const them = `${v.userId}|${v.deviceId}|${v.theirKey}`;
  const [first, second] = v.starter === 'us' ? [us, them] : [them, us];
  const { emoji } = await sasCall<{ emoji: number[] }>('sas_bytes', v, { info: `MATRIX_KEY_VERIFICATION_SAS|${first}|${second}|${v.id}` });
  v.emoji = emoji;
  v.phase = 'compare';
}

async function commitmentOf(key: string, start: Json): Promise<string> {
  const { text } = await core<{ text: string }>('canonical_json', { json: start });
  return b64(sha256(utf8Encode(key + text)));
}

// One step that came: to-device or in a room.
async function take(state: MatrixState, event: VerificationEvent): Promise<boolean> {
  const { content, sender } = event;
  const kind = event.type === 'm.room.message' ? 'request' : event.type.slice('m.key.verification.'.length);
  // Our own steps come back in the room: only the other side's count.
  if (sender === state.userId && (event.roomId || content.from_device === state.deviceId)) return false;
  if (kind === 'request') {
    const id = event.roomId ? event.eventId! : String(content.transaction_id ?? '');
    const at = event.roomId ? (event.ts ?? 0) : Number(content.timestamp ?? 0);
    if (!id || Math.abs(Date.now() - at) > TOO_OLD || own(state).has(id)) return false;
    if (event.roomId && content.to !== state.userId) return false;
    const methods = Array.isArray(content.methods) ? (content.methods as unknown[]).filter((m): m is string => typeof m === 'string') : [];
    if (!(methods.includes(SAS) || (methods.includes(RECIPROCATE) && methods.includes(QR_SHOW))) || typeof content.from_device !== 'string') return false;
    own(state).set(id, { id, roomId: event.roomId, userId: sender, deviceId: content.from_device, ours: false, phase: 'asked', at: Date.now(), theirMethods: methods });
    return true;
  }
  const relates = (content['m.relates_to'] as Json | undefined)?.event_id;
  const v = own(state).get(String(event.roomId ? relates : content.transaction_id));
  if (!v || v.userId !== sender || v.phase === 'done' || v.phase === 'cancelled') return false;
  if (typeof content.from_device === 'string') {
    // To-device, once one of their devices answered, the check is with that one.
    if (v.deviceId && v.deviceId !== content.from_device) return false;
    v.deviceId = content.from_device;
  }
  v.at = Date.now();
  switch (kind) {
    case 'cancel':
      stop(v, reasonOf(content.code));
      return true;
    case 'ready':
      if (!v.ours || v.starter || v.phase !== 'waiting') return false;
      v.theirMethods = Array.isArray(content.methods) ? (content.methods as unknown[]).filter((m): m is string => typeof m === 'string') : [];
      v.theirKeys = await theirKeys(state, v);
      await offerCodes(state, v);
      // No code either way: the emoji, if they offered it.
      if ((v.phase as VerificationPhase) !== 'choose') {
        if (!v.theirMethods.includes(SAS)) return cancel(state, v, 'm.unknown_method').then(() => true);
        await sendStart(state, v);
      }
      return true;
    case 'start': {
      // Both started at once: the side whose user (then device) sorts first goes on (as the spec says).
      if (v.starter === 'us') {
        const weFirst = state.userId < sender || (state.userId === sender && state.deviceId < String(content.from_device));
        if (weFirst) return false;
      }
      if (content.method === RECIPROCATE) {
        // They photographed our code: the secret has to be the one in it.
        if (!v.qr || v.starter || v.phase !== 'choose') return cancel(state, v, 'm.unexpected_message').then(() => true);
        if (content.secret !== v.qr.secret) return cancel(state, v, 'm.key_mismatch').then(() => true);
        v.starter = 'them';
        v.start = content;
        v.phase = 'scanned';
        return true;
      }
      if (content.method !== SAS) return cancel(state, v, 'm.unknown_method').then(() => true);
      if (!offers(content, 'key_agreement_protocols', AGREEMENT) || !offers(content, 'hashes', 'sha256') || !offers(content, 'message_authentication_codes', MAC_METHOD)) {
        return cancel(state, v, 'm.unknown_method').then(() => true);
      }
      if (!offers(content, 'short_authentication_string', 'emoji')) return cancel(state, v, 'm.unknown_method').then(() => true);
      v.starter = 'them';
      v.start = content;
      v.theirKeys ??= await theirKeys(state, v);
      const made = await core<{ secret: string; public: string }>('sas_new', {});
      v.secret = made.secret;
      v.ourKey = made.public;
      v.phase = 'waiting';
      await send(state, v, 'm.key.verification.accept', {
        method: SAS,
        key_agreement_protocol: AGREEMENT,
        hash: 'sha256',
        message_authentication_code: MAC_METHOD,
        short_authentication_string: ['emoji', 'decimal'],
        commitment: await commitmentOf(made.public, content),
      });
      return true;
    }
    case 'accept': {
      if (v.starter !== 'us' || v.secret) return false;
      if (content.key_agreement_protocol !== AGREEMENT || content.hash !== 'sha256' || content.message_authentication_code !== MAC_METHOD) {
        return cancel(state, v, 'm.unknown_method').then(() => true);
      }
      v.commitment = String(content.commitment ?? '');
      const made = await core<{ secret: string; public: string }>('sas_new', {});
      v.secret = made.secret;
      v.ourKey = made.public;
      await send(state, v, 'm.key.verification.key', { key: made.public });
      return true;
    }
    case 'key': {
      if (!v.secret || v.theirKey || typeof content.key !== 'string') return false;
      v.theirKey = content.key;
      if (v.starter === 'us') {
        if ((await commitmentOf(content.key, v.start!)) !== v.commitment) return cancel(state, v, 'm.mismatched_commitment').then(() => true);
      } else {
        await send(state, v, 'm.key.verification.key', { key: v.ourKey });
      }
      await compare(state, v);
      return true;
    }
    case 'mac':
      if (v.theirMac || !v.theirKey) return false;
      v.theirMac = content;
      if (v.phase === 'confirmed') await checkMac(state, v);
      return true;
    case 'done':
      // They said our photograph of their code was right: what it proved holds now.
      if (v.starter !== 'us' || v.phase !== 'confirmed' || !v.trust || v.start?.method !== RECIPROCATE) return false;
      await send(state, v, 'm.key.verification.done', {});
      await trustCode(state, v);
      return true;
    default:
      return false;
  }
}

setVerificationHandler(take);
