// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { setSmsMirror, smsMirrorEvent, type ContactCard, type SmsMessage, type SmsMirror, type SmsThread } from '../modules/erevos-sms';
import { randomBytes, toHex } from './crypto';
import { t } from './i18n';
import { setSmsMirrored } from './modules';
import { addNetwork, hearing } from './network-notices';
import { sameConversation, smsNumbers } from './sms-group';
import { sameNumber } from './sms-invite';
import { askChanges, askGone, readChanges, type SharedConversation, type SharedSms, type SmsAsk, type SmsView } from './sync/sms';
import type { Change, Log } from './sync/log';

// The phone's SMS on a linked device (docs/sync.md, phase S8), as the space's log brings them
// (lib/sync/sms.ts): the SMS module (modules/erevos-sms) reads them here in place of any this device
// has, so the home screen, the SMS screen and a contact's chat show them as on the phone. What is
// written here goes into the log for the phone: an SMS to send, which shows as sending until the
// phone sent it (then it is among the phone's own) or as not sent, should the phone say so; and a
// conversation read, which the phone marks read too. Their notices are those of a chat on another
// network (lib/network-notices.ts, `sms:` and the address): a number on the icon and a notice, as
// the device's settings say. Pictures stay on the phone: a message with some says so. Only the
// space's links (lib/devices.ts) show them, never a hidden place's.

/** How what is written here reaches the log: written, then shown again as the log has it then. */
export type MirrorWriter = (changesOf: (log: Log) => readonly Change[]) => Promise<void>;

let view: SmsView | null = null;
let write: MirrorWriter | null = null;
let unread = new Map<string, number>();
const heard = hearing();
let added = false;
// What each conversation showed last, so only one that changed is told.
let shownBefore = new Map<string, string>();

const where = (address: string) => `sms:${address}`;

// A conversation's messages not read here: those that came after it was last read on a device.
function unreadOf(c: SharedConversation, reads: ReadonlyMap<number, number>): number {
  const read = reads.get(c.thread) ?? 0;
  if (read <= 0) return c.unread;
  return Math.min(c.unread, c.messages.filter((m) => !m.mine && !m.read && m.at > read).length);
}

// An ask's row while it waits: below 0, so it never meets a row of the phone's.
const askRow = (a: SmsAsk) => -1 - parseInt(a.id.slice(0, 12), 16);

const pictureText = (m: SharedSms) => (m.pictures ? [`📷 ${t('A photo, on the phone')}`, m.text].filter(Boolean).join('\n') : m.text);

function conversationFor(address: string): SharedConversation | null {
  return view?.conversations.find((c) => c.address === address) ?? view?.conversations.find((c) => sameConversation(c.address, address)) ?? null;
}

const asksFor = (address: string) => (view?.asks ?? []).filter((a) => a.address === address || sameConversation(a.address, address));

function askMessage(a: SmsAsk): SmsMessage {
  return { id: askRow(a), kind: 'sms', text: a.text, at: a.at, mine: true, state: a.d ? 'failed' : 'sending', read: true, sim: -1, pictures: [] };
}

function threadsNow(limit: number): SmsThread[] {
  if (!view) return [];
  const reads = view.reads;
  const out: SmsThread[] = view.conversations.map((c) => {
    const last = c.messages[c.messages.length - 1];
    const ask = asksFor(c.address).pop();
    const newer = ask && ask.at > (last?.at ?? 0) ? ask : null;
    return {
      thread: c.thread,
      address: c.address,
      text: newer ? newer.text : last ? pictureText(last) : '',
      at: Math.max(c.at, newer?.at ?? 0),
      mine: newer ? true : !!last?.mine,
      unread: unreadOf(c, reads),
      replied: !!newer || c.messages.some((m) => m.mine),
    };
  });
  // A conversation started here, before the phone has it.
  for (const a of view.asks) {
    if (conversationFor(a.address) || out.some((o) => sameConversation(o.address, a.address))) continue;
    out.push({ thread: askRow(a), address: a.address, text: a.text, at: a.at, mine: true, unread: 0, replied: true });
  }
  return out.sort((a, b) => b.at - a.at).slice(0, limit);
}

function messagesNow(address: string, limit: number): SmsMessage[] {
  const c = conversationFor(address);
  const kept: SmsMessage[] = (c?.messages ?? []).map((m) => ({
    id: m.row,
    kind: m.kind,
    text: pictureText(m),
    at: m.at,
    mine: m.mine,
    state: m.state,
    read: m.read || (view?.reads.get(c!.thread) ?? 0) >= m.at,
    sim: -1,
    pictures: [],
    ...(m.from ? { from: m.from } : {}),
  }));
  return [...kept, ...asksFor(address).map(askMessage)].sort((a, b) => a.at - b.at).slice(-limit);
}

function cardsNow(numbers: string[]): Record<string, ContactCard> {
  if (!view?.names) return {};
  const names: { number: string; name: string }[] = [];
  for (const c of view.conversations) {
    const own = smsNumbers(c.address);
    if (c.name && own.length === 1) names.push({ number: own[0], name: c.name });
    for (const [number, name] of Object.entries(c.names ?? {})) names.push({ number, name });
  }
  const out: Record<string, ContactCard> = {};
  for (const number of numbers) {
    const found = names.find((n) => n.number === number) ?? names.find((n) => sameNumber(n.number, number));
    if (found) out[number] = { name: found.name, photo: '' };
  }
  return out;
}

const mirror: SmsMirror = {
  threads: async (limit) => threadsNow(limit),
  messages: async (address, limit) => messagesNow(address, limit),
  async markRead(address) {
    const c = conversationFor(address);
    const writing = write;
    if (!c || !writing || !view || unreadOf(c, view.reads) === 0) return;
    const at = Math.max(c.at, ...c.messages.filter((m) => !m.mine).map((m) => m.at));
    await writing((log) => readChanges(log, c.thread, at));
  },
  async send(address, text) {
    const writing = write;
    const words = text.trim();
    if (!writing || !view) throw new Error(t('The SMS go through your phone, and they no longer come to this device.'));
    if (!words) throw new Error(t('Write something first.'));
    const id = toHex(randomBytes(8));
    // One not sent before, with the same words to the same conversation, gives way to this.
    const again = asksFor(address).filter((a) => a.d && a.text === words);
    await writing((log) => [...again.flatMap((a) => askGone(log, a.id)), ...askChanges(id, address, words, Date.now())]);
    return -1 - parseInt(id.slice(0, 12), 16);
  },
  cards: (numbers) => cardsNow(numbers),
};

/**
 * The phone's SMS as the space's log has them now (`next`; null while they do not come here, or
 * the space is closed), and how to write into it. Tells the screens and the notices of what changed;
 * the first after none tells of nothing that came, as it was there before.
 */
export function showMirrored(next: SmsView | null, writer: MirrorWriter | null): void {
  const before = view;
  view = next;
  write = next ? writer : null;
  if (!added) {
    added = true;
    addNetwork('sms:', { unread: () => unread, notifyOf: () => null });
  }
  setSmsMirror(next ? mirror : null);
  setSmsMirrored(next !== null);
  const now = new Map<string, number>();
  const shown = new Map<string, string>();
  if (next) {
    for (const c of next.conversations) {
      const n = unreadOf(c, next.reads);
      if (n > 0) now.set(where(c.address), n);
      const last = c.messages[c.messages.length - 1];
      shown.set(c.address, JSON.stringify([c.at, n, c.messages.length, last?.row, last?.state, last?.read, asksFor(c.address).map((a) => [a.id, a.d ?? ''])]));
    }
    for (const a of next.asks) if (!shown.has(a.address)) shown.set(a.address, JSON.stringify([a.id, a.d ?? '']));
  }
  unread = now;
  heard.hear(now, before === null);
  const changed = [...shown].filter(([address, said]) => shownBefore.get(address) !== said).map(([address]) => address);
  const gone = [...shownBefore.keys()].filter((address) => !shown.has(address));
  shownBefore = shown;
  if ((before === null) !== (next === null)) smsMirrorEvent('onSms', { address: '', shown: false });
  for (const address of [...changed, ...gone]) smsMirrorEvent('onSms', { address, shown: false });
  if (changed.length > 0 || gone.length > 0) smsMirrorEvent('onSmsSent', { id: 0, ok: true });
}

/** Whether the phone sends its SMS here with the names its contacts give them. */
export const mirroredNames = (): boolean => !!view?.names;

/** For the checks: whether the phone's SMS show here now. */
export const mirroredNow = (): boolean => view !== null;
