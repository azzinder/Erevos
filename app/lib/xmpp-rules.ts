// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { checkedRules, goneOf, nextGoes, withHidden, withOne, withTimer, withoutOnes, withBlocked, type ChatRules } from './chat-rules';
import { acceptXmppDevice, bare, type XmppChat, type XmppConnection, type XmppMessage, type XmppState } from './xmpp';
import { fingerprint, type OmemoDevice } from './xmpp-omemo';
import { el } from './xmpp-xml';

// The rules of an XMPP chat on this phone (lib/chat-rules.ts), appearing offline to one contact,
// and checking a contact's keys in person by a QR code.
//
// Disappearing messages: no XEP the other apps follow makes them delete a message when its time
// comes, so a chat's timer, or one message's own time, deletes this phone's copy only: the other
// side keeps theirs. Delete for me does the same at once, for good.
//
// Appear offline to one contact is RFC 6121's directed presence: right after the presence the
// account shows everyone, an unavailable one goes to them alone, and again each time they come
// online, as their server may answer for ours with what we showed everyone. Their server then
// tells them we are offline; while it is on, no delivery receipt (XEP-0184), read marker
// (XEP-0333) nor typing (XEP-0085) goes to them either (lib/xmpp.ts). It needs nothing of the server beyond RFC 6121,
// unlike the privacy lists of XEP-0016, which XEP-0191 replaced and many servers lack. A group we
// share with them still shows us there.
//
// Checking in person is as Conversations, Dino and Gajim do it: a QR code of an xmpp: URI with the
// account's address and, for each OMEMO device, its id and its key (`omemo-sid-<id>=<key in hex>`).
// Theirs, photographed here, marks each of their devices whose key is the one in the code as
// checked; ours, photographed by their app, does the same there. A key that differs is said, and
// marks nothing.

/** A chat's rules, as kept and checked. */
export const rulesOf = (chat: Pick<XmppChat, 'rules'> | undefined): ChatRules | undefined => checkedRules(chat?.rules);

/** The messages of a chat that show: not gone by `now`. */
export function shownIn(chat: XmppChat | undefined, now = Date.now()): XmppMessage[] {
  if (!chat) return [];
  const gone = new Set(goneOf(rulesOf(chat), chat.messages, (m) => m.id, (m) => m.at, now));
  return gone.size ? chat.messages.filter((m) => !gone.has(m)) : chat.messages;
}

/** When the next message of a chat goes, or 0. */
export const nextGoesIn = (chat: XmppChat | undefined, now = Date.now()): number => (chat ? nextGoes(rulesOf(chat), chat.messages, (m) => m.id, (m) => m.at, now) : 0);

/** Sets a chat's timer, in seconds (0: messages stay), for new messages. */
export function setTimerIn(state: XmppState, jid: string, after: number, now = Date.now()): void {
  const chat = state.chats[jid];
  if (!chat) return;
  chat.rules = withTimer(rulesOf(chat), after, now);
  if (!chat.rules) delete chat.rules;
}

/** Takes messages out of a chat, with their pins and their places among those not read: the last of theirs. */
function drop(chat: XmppChat, ids: readonly string[]): void {
  const theirs = chat.messages.filter((m) => !m.mine);
  const unread = theirs.slice(theirs.length - chat.unread).filter((m) => ids.includes(m.id)).length;
  chat.unread = Math.max(0, chat.unread - unread);
  chat.messages = chat.messages.filter((m) => !ids.includes(m.id));
  if (chat.pins) chat.pins = chat.pins.filter((id) => !ids.includes(id));
}

/** Deletes these messages from this phone only, for good. */
export function hideIn(state: XmppState, jid: string, ids: readonly string[]): void {
  const chat = state.chats[jid];
  if (!chat || !ids.length) return;
  drop(chat, ids);
  chat.rules = withHidden(rulesOf(chat), ids);
}

/** The ids of a chat's messages now, to tell afterwards which of ours were sent meanwhile (markSent). */
export const idsIn = (state: XmppState, jid: string): Set<string> => new Set(state.chats[jid]?.messages.map((m) => m.id) ?? []);

/** Gives the messages of ours sent since `before` a time of their own: `lasts` seconds after each was sent. */
export function markSent(state: XmppState, jid: string, before: Set<string>, lasts: number): void {
  const chat = state.chats[jid];
  if (!chat || lasts <= 0) return;
  let rules = rulesOf(chat);
  for (const m of chat.messages) if (m.mine && !m.call && !before.has(m.id)) rules = withOne(rules, m.id, m.at + lasts * 1000);
  if (rules) chat.rules = rules;
}

/** Deletes from this phone what is gone by `now`, in every chat; answers whether anything went. */
export function sweepXmppRules(state: XmppState, now = Date.now()): boolean {
  let changed = false;
  for (const chat of Object.values(state.chats)) {
    if (!chat.rules) continue;
    const rules = rulesOf(chat);
    const gone = goneOf(rules, chat.messages, (m) => m.id, (m) => m.at, now);
    if (!gone.length) continue;
    const ids = gone.map((m) => m.id);
    drop(chat, ids);
    // One that went at a time of its own stays away should the archive bring it again.
    const own = ids.filter((id) => rules?.ones?.[id] !== undefined);
    chat.rules = own.length ? withHidden(rules, own) : withoutOnes(rules, ids);
    if (!chat.rules) delete chat.rules;
    changed = true;
  }
  return changed;
}

/** Whether anything of the account is gone by `now`, to sweep. */
export const xmppRulesDue = (state: XmppState, now = Date.now()): boolean =>
  Object.values(state.chats).some((chat) => chat.rules && goneOf(rulesOf(chat), chat.messages, (m) => m.id, (m) => m.at, now).length > 0);

// ---- appearing offline to one contact ----

/** Whether the account appears offline to `jid`. */
export const unseenBy = (state: Pick<XmppState, 'unseenBy'>, jid: string): boolean => !!state.unseenBy?.includes(bare(jid).toLowerCase());

/** Appears offline to one contact, or as to everyone again: told to their server at once when connected. */
export async function setUnseen(state: XmppState, connection: XmppConnection | null, jid: string, on: boolean): Promise<void> {
  const who = bare(jid).toLowerCase();
  state.unseenBy = withBlocked(state.unseenBy, who, on);
  if (!state.unseenBy) delete state.unseenBy;
  if (!connection?.isOpen) return;
  // Off, a directed presence shows us to them as we show to everyone (RFC 6121, 4.6).
  await connection.send(el('presence', on ? { to: who, type: 'unavailable' } : { to: who }));
}

// ---- checking keys in person ----

/** A key as the code writes it: its 32 bytes in hex, without the type byte before them. */
const hexOf = (identity: string): string => fingerprint(identity).replace(/\s/g, '').toLowerCase();

/** The account's code to be checked by: its address and its devices' keys, as Conversations writes them. */
export function ownCode(state: XmppState): string {
  const keys = [`omemo-sid-${state.omemo.device}=${hexOf(state.omemo.identity.public)}`];
  return `xmpp:${state.jid}?${keys.join(';')}`;
}

export type XmppCode = { jid: string; keys: { id: string; key: string; two: boolean }[] };

/** What a code says: an address and the keys of its devices; null for one that is no such code. */
export function readCode(text: string): XmppCode | null {
  const match = /^xmpp:(?:\/\/)?([^?#\s]+)\?([^#\s]*)$/i.exec(text.trim());
  if (!match) return null;
  let jid: string;
  try {
    jid = bare(decodeURIComponent(match[1])).toLowerCase();
  } catch {
    return null;
  }
  if (!/^[^@/\s]+@[^@/\s]+$/.test(jid)) return null;
  const keys: XmppCode['keys'] = [];
  for (const part of match[2].split(/[;&]/)) {
    const pair = /^omemo(2?)-sid-(\d{1,10})=([0-9a-f]{64}|05[0-9a-f]{64})$/i.exec(part);
    if (pair) keys.push({ id: pair[2], key: pair[3].toLowerCase().slice(-64), two: pair[1] === '2' });
  }
  return keys.length ? { jid, keys } : null;
}

export type CheckResult = { kind: 'checked'; count: number } | { kind: 'differs' } | { kind: 'unknown' } | { kind: 'other'; jid: string } | { kind: 'own' } | { kind: 'none' };

/**
 * Checks the devices of `jid` by the code photographed: each one whose key here is the code's is
 * marked checked; a key that waits to be accepted and is the code's is accepted so. Any key that
 * differs from the code's is said, and marks nothing of that device.
 */
export function checkByCode(state: XmppState, jid: string, text: string): CheckResult {
  const code = readCode(text);
  if (!code) return { kind: 'none' };
  if (code.jid === state.jid.toLowerCase()) return { kind: 'own' };
  if (code.jid !== bare(jid).toLowerCase()) return { kind: 'other', jid: code.jid };
  let count = 0;
  let differs = false;
  for (const { id, key, two } of code.keys) {
    const device: OmemoDevice | undefined = (two ? state.people2 : state.people)?.[jid]?.devices[id];
    if (!device?.identity) continue;
    if (device.pending && hexOf(device.pending.identity) === key) acceptXmppDevice(state, jid, id, two);
    if (hexOf(device.identity) === key) {
      device.checked = device.identity;
      count++;
    } else differs = true;
  }
  return differs ? { kind: 'differs' } : count ? { kind: 'checked', count } : { kind: 'unknown' };
}

/** Takes the marks off a contact's devices. */
export function uncheck(state: XmppState, jid: string): void {
  for (const people of [state.people, state.people2]) for (const device of Object.values(people?.[jid]?.devices ?? {})) delete device.checked;
}

