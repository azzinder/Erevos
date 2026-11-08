// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { idsOf, isThere, valueOf, type Change, type Json, type Log } from './log';

// The phone's SMS in the space's log (docs/sync.md, phase S8), so the linked devices show them and
// can answer: only once the owner turned it on, on the phone (Settings → SMS → On my linked devices
// too). Only the phone writes them (kind `sms`, KINDS), as only the phone has them:
//
// - record `on`, there while they go, with whether the phone names the numbers (`names`);
// - each conversation `c<thread>` (the phone's thread), with its address, when its latest came, how
//   many are not read, and its name and its numbers' as the phone names them, when it does;
// - each of its latest messages `m<s|m><row>` (an SMS's or an MMS's row on the phone), with its
//   words, when, whose, how far it went, whether it was read, who wrote it in a group, and how many
//   pictures it has (those stay on the phone).
//
// Each value goes whole in field `v`, as only the phone writes it. Only the latest conversations
// and the latest messages of each go (SHARED_CONVERSATIONS, SHARED_MESSAGES): the older ones stay
// on the phone. One that leaves them, or that the phone no longer has, is removed; turned off, all
// of them are, and the devices show no SMS.
//
// What a device asks of them, any device writes:
//
// - an SMS to send (kind `sms-ask`, a random id), with its address, its words and when it was
//   written. The phone sends it once (lock/sms-data.ts keeps which it took), as long as it comes
//   within ASK_LASTS, then removes it, as the SMS itself is among its messages then; one it could not
//   send, or that came too late, it marks (`d`) and the device shows it as not sent, till the device
//   removes it or ASK_KEPT has gone by.
// - a conversation read on a device (kind `sms-read`, by the conversation's id): up to when, in
//   field `v`. The phone marks it read too.
//
// Self-contained, so it runs under plain Node.

export const SMS_KIND = 'sms';
export const ASK_KIND = 'sms-ask';
export const READ_KIND = 'sms-read';

/** How many conversations go, the latest, and how many of the latest messages of each. */
export const SHARED_CONVERSATIONS = 50;
export const SHARED_MESSAGES = 50;
/** An SMS asked for this long ago, or more, is not sent: it would come out of the blue. */
export const ASK_LASTS = 24 * 60 * 60_000;
/** One not sent shows that long, unless the device removes it. */
export const ASK_KEPT = 7 * 24 * 60 * 60_000;
/** The longest words that go of a message, and of what a device asks to send. */
export const MOST_TEXT = 4000;
const MOST_NAME = 200;
const MOST_ADDRESS = 400;

const ON = 'on';
const ASK_ID = /^[0-9a-f]{16}$/;
const MESSAGE_ID = /^m([sm])(\d{1,18})$/;
const CONVERSATION_ID = /^c(-?\d{1,18})$/;

export type SharedState = 'done' | 'sending' | 'failed' | 'sent' | 'delivered' | 'undelivered';
const STATES: readonly SharedState[] = ['done', 'sending', 'failed', 'sent', 'delivered', 'undelivered'];

/** One message as it goes: `row` its row on the phone, of an SMS or an MMS. */
export type SharedSms = { kind: 'sms' | 'mms'; row: number; text: string; at: number; mine: boolean; state: SharedState; read: boolean; from?: string; pictures?: number };

/** A conversation as it goes, its latest messages oldest first. */
export type SharedConversation = { thread: number; address: string; at: number; unread: number; name?: string; names?: Record<string, string>; messages: SharedSms[] };

/** The phone's SMS as they go: whether it names the numbers, and the conversations, the latest first. */
export type SharedSmsAll = { names: boolean; conversations: SharedConversation[] };

/** What a device asked to send, as the log says it. `d`: why it did not go, once the phone said. */
export type SmsAsk = { id: string; address: string; text: string; at: number; by: string; d?: 'failed' | 'old' };

/** The SMS as a linked device shows them. */
export type SmsView = {
  names: boolean;
  /** The latest first, each its latest messages oldest first. */
  conversations: SharedConversation[];
  asks: SmsAsk[];
  /** Up to when each conversation was read on a device, by its thread. */
  reads: Map<number, number>;
};

export const conversationId = (thread: number) => `c${thread}`;
export const messageId = (m: Pick<SharedSms, 'kind' | 'row'>) => `m${m.kind === 'mms' ? 'm' : 's'}${m.row}`;

const isNumber = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v);
const isText = (v: unknown, most: number): v is string => typeof v === 'string' && v.length <= most;
const record = (v: unknown): Record<string, unknown> | null => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null);

// The same JSON whatever order its keys were written in.
function stable(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(stable).join(',')}]`;
  const o = record(v);
  if (o) return `{${Object.keys(o).sort().map((k) => `${JSON.stringify(k)}:${stable(o[k])}`).join(',')}}`;
  return JSON.stringify(v ?? null);
}

function namesValue(names: Record<string, string> | undefined): Json | undefined {
  if (!names) return undefined;
  const out: Record<string, string> = {};
  for (const [number, name] of Object.entries(names).slice(0, 20)) if (number.length <= 40 && name) out[number] = name.slice(0, MOST_NAME);
  return Object.keys(out).length > 0 ? out : undefined;
}

function conversationValue(c: SharedConversation): Json {
  const v: Record<string, Json> = { a: c.address.slice(0, MOST_ADDRESS), at: c.at, u: Math.max(0, c.unread) };
  if (c.name) v.n = c.name.slice(0, MOST_NAME);
  const names = namesValue(c.names);
  if (names) v.nn = names;
  return v;
}

function messageValue(thread: number, m: SharedSms): Json {
  const v: Record<string, Json> = { c: thread, x: m.text.slice(0, MOST_TEXT), at: m.at, s: m.state };
  if (m.mine) v.o = true;
  if (m.read) v.r = true;
  if (m.from) v.w = m.from.slice(0, 40);
  if (m.pictures && m.pictures > 0) v.p = Math.min(m.pictures, 99);
  return v;
}

/**
 * What to write into the log for the phone's SMS as they are now (`shared`; null while they do not
 * go): each conversation and message as it is, what changed of one, and the removal of those the
 * phone no longer has or that left the latest; with null, the removal of all of them, and of what the
 * devices asked. Read marks of conversations that went go too.
 */
export function smsChanges(log: Log, shared: SharedSmsAll | null): Change[] {
  const want = new Map<string, Json>();
  if (shared) {
    want.set(ON, { names: shared.names });
    for (const c of shared.conversations.slice(0, SHARED_CONVERSATIONS)) {
      if (!Number.isSafeInteger(c.thread)) continue;
      want.set(conversationId(c.thread), conversationValue(c));
      for (const m of c.messages.slice(-SHARED_MESSAGES)) if (Number.isSafeInteger(m.row) && m.row >= 0) want.set(messageId(m), messageValue(c.thread, m));
    }
  }
  const changes: Change[] = [];
  for (const [id, v] of want) {
    if (!isThere(log, SMS_KIND, id)) changes.push({ k: SMS_KIND, id, x: 'add' }, { k: SMS_KIND, id, f: 'v', v });
    else if (stable(valueOf(log, SMS_KIND, id, 'v')) !== stable(v)) changes.push({ k: SMS_KIND, id, f: 'v', v });
  }
  for (const id of idsOf(log, SMS_KIND)) if (!want.has(id)) changes.push({ k: SMS_KIND, id, x: 'del' });
  for (const id of idsOf(log, READ_KIND)) if (!want.has(id)) changes.push({ k: READ_KIND, id, x: 'del' });
  if (!shared) for (const id of idsOf(log, ASK_KIND)) changes.push({ k: ASK_KIND, id, x: 'del' });
  return changes;
}

/** Whether the phone's SMS go to the devices, as the log says. */
export const smsShared = (log: Log): boolean => isThere(log, SMS_KIND, ON);

function conversationOf(id: string, v: unknown): SharedConversation | null {
  const m = CONVERSATION_ID.exec(id);
  const o = record(v);
  if (!m || !o || !isText(o.a, MOST_ADDRESS) || !o.a || !isNumber(o.at) || !isNumber(o.u)) return null;
  const names: Record<string, string> = {};
  const nn = record(o.nn);
  if (nn) for (const [number, name] of Object.entries(nn)) if (isText(name, MOST_NAME) && name && number.length <= 40) names[number] = name;
  return {
    thread: Number(m[1]),
    address: o.a,
    at: o.at,
    unread: Math.max(0, o.u),
    ...(isText(o.n, MOST_NAME) && o.n ? { name: o.n } : {}),
    ...(Object.keys(names).length > 0 ? { names } : {}),
    messages: [],
  };
}

function messageOf(id: string, v: unknown): { thread: number; sms: SharedSms } | null {
  const m = MESSAGE_ID.exec(id);
  const o = record(v);
  if (!m || !o || !isNumber(o.c) || !isText(o.x, MOST_TEXT) || !isNumber(o.at) || !STATES.includes(o.s as SharedState)) return null;
  const sms: SharedSms = { kind: m[1] === 'm' ? 'mms' : 'sms', row: Number(m[2]), text: o.x, at: o.at, mine: o.o === true, state: o.s as SharedState, read: o.r === true };
  if (isText(o.w, 40) && o.w) sms.from = o.w;
  if (isNumber(o.p) && o.p > 0) sms.pictures = Math.min(o.p, 99);
  return { thread: o.c, sms };
}

/** What a device asked to send that the log has, the oldest first. */
export function asksOf(log: Log): SmsAsk[] {
  const out: SmsAsk[] = [];
  for (const id of idsOf(log, ASK_KIND)) {
    const e = log.data[ASK_KIND]?.[id];
    const o = record(e?.f.v?.v);
    if (!ASK_ID.test(id) || !e?.add || !o || !isText(o.a, MOST_ADDRESS) || !o.a || !isText(o.x, MOST_TEXT) || !o.x || !isNumber(o.at)) continue;
    const d = e.f.d?.v;
    out.push({ id, address: o.a, text: o.x, at: o.at, by: e.add.d, ...(d === 'failed' || d === 'old' ? { d } : {}) });
  }
  return out.sort((a, b) => a.at - b.at || (a.id < b.id ? -1 : 1));
}

/** The SMS as the log has them, for a linked device to show; null while they do not go. */
export function smsView(log: Log): SmsView | null {
  if (!smsShared(log)) return null;
  const on = record(valueOf(log, SMS_KIND, ON, 'v'));
  const byThread = new Map<number, SharedConversation>();
  for (const id of idsOf(log, SMS_KIND)) {
    if (!id.startsWith('c')) continue;
    const c = conversationOf(id, valueOf(log, SMS_KIND, id, 'v'));
    if (c) byThread.set(c.thread, c);
  }
  for (const id of idsOf(log, SMS_KIND)) {
    if (!id.startsWith('m')) continue;
    const m = messageOf(id, valueOf(log, SMS_KIND, id, 'v'));
    if (m) byThread.get(m.thread)?.messages.push(m.sms);
  }
  const conversations = [...byThread.values()].sort((a, b) => b.at - a.at || a.thread - b.thread);
  for (const c of conversations) c.messages.sort((a, b) => a.at - b.at || a.row - b.row);
  return { names: on?.names === true, conversations, asks: asksOf(log), reads: readsOf(log) };
}

/** A device asks the phone to send `text` to `address` (one number, or a group's comma-separated), as `id`. */
export function askChanges(id: string, address: string, text: string, at: number): Change[] {
  if (!ASK_ID.test(id) || !address || address.length > MOST_ADDRESS || !text) return [];
  return [
    { k: ASK_KIND, id, x: 'add' },
    { k: ASK_KIND, id, f: 'v', v: { a: address, x: text.slice(0, MOST_TEXT), at } },
  ];
}

/** What the phone did with what was asked: sent, it goes (the SMS is among its messages); else it says why not. */
export function askDone(log: Log, id: string, how: 'sent' | 'failed' | 'old'): Change[] {
  if (!isThere(log, ASK_KIND, id)) return [];
  if (how === 'sent') return [{ k: ASK_KIND, id, x: 'del' }];
  return valueOf(log, ASK_KIND, id, 'd') === how ? [] : [{ k: ASK_KIND, id, f: 'd', v: how }];
}

/** The removal of what was asked: let go of on a device, or not sent and shown long enough (ASK_KEPT). */
export function askGone(log: Log, id: string): Change[] {
  return isThere(log, ASK_KIND, id) ? [{ k: ASK_KIND, id, x: 'del' }] : [];
}

/** On the phone: those not sent, shown long enough, removed. */
export function oldAsks(log: Log, now: number): Change[] {
  return asksOf(log)
    .filter((a) => a.d && a.at < now - ASK_KEPT)
    .flatMap((a) => askGone(log, a.id));
}

/** A conversation read on a device up to `at`: written only when that is later than the log says. */
export function readChanges(log: Log, thread: number, at: number): Change[] {
  const id = conversationId(thread);
  const was = valueOf(log, READ_KIND, id, 'v');
  if (isThere(log, READ_KIND, id) && isNumber(was) && was >= at) return [];
  return [...(isThere(log, READ_KIND, id) ? [] : [{ k: READ_KIND, id, x: 'add' as const }]), { k: READ_KIND, id, f: 'v', v: at }];
}

/** The conversations' read marks the devices wrote, by thread. */
export function readsOf(log: Log): Map<number, number> {
  const reads = new Map<number, number>();
  for (const id of idsOf(log, READ_KIND)) {
    const m = CONVERSATION_ID.exec(id);
    const at = valueOf(log, READ_KIND, id, 'v');
    if (m && isNumber(at)) reads.set(Number(m[1]), at);
  }
  return reads;
}
