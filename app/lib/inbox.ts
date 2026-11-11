// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// The home screen's list of chats (app/index.tsx): one row for each of the space's contacts, with
// the last message, how many of theirs are not read yet, and when the chat last moved, newest
// first. Made from what the space keeps sealed: its contacts (lock/e2e-data.ts), the messages with
// them (lock/history.ts) and the chats imported into it (lock/archive.ts). Hidden chats are not in
// it, and nothing about them is: the home screen looks the same whether a space has them or not.
// When Erevos is the phone's SMS app, the phone's SMS conversations are rows too: one with a
// number linked to a contact goes into that contact's row, the others have rows of their own.
// Once the space has signed in to Matrix (lib/matrix-store.ts), each of its Matrix rooms is a row
// too (matrixInboxRows), so the list holds every network's chats, and each network has its part.

import { mutedNow, type ChatNotify } from '../lock/chat-notify';
import type { Avatar } from '../lock/e2e-data';

import { LOCKED_ROW, lockedChat } from './chat-protect';
import { roomAvatar, type MatrixState } from './matrix';
import type { Module } from './modules';
import { nameOf as nostrNameOf, npubOf, shortNpub, type NostrDmState } from './nostr-dm';
import { bare, nameOf, type XmppState } from './xmpp';
import { sameNumber } from './sms-invite';
import { voiceDuration } from './voice';
import { shownLine } from './call-lines';
import { plainWords } from './text-style';
import { t, mark } from './i18n';

/** A contact as the list has it: `locked`, with a PIN of its own (lock/chat-pin.ts), and its own
 *  notifications (lock/chat-notify.ts). */
export type InboxContact = { identity: string; name: string; timer: number; avatar?: Avatar | null; phone?: string; locked?: boolean; notify?: ChatNotify };

/** The latest SMS of a conversation with one number. `name`: what the phone's contacts call the
 *  number, when the owner lets Erevos show it, and `photo` the picture they have for it. `replied`:
 *  any message in it is ours (missing from a build before it). `locked`: with a PIN of its own in
 *  the space (lib/chat-protect.ts), so the list shows nothing of what it says. */
export type InboxSms = { address: string; text: string; at: number; mine: boolean; unread: number; name?: string; photo?: string; replied?: boolean; locked?: boolean };

export type InboxMessage = {
  peer: string;
  text: string;
  mine: boolean;
  at: number;
  until?: number;
  /** Seconds a disappearing message lasts once read, before its time starts. */
  lasts?: number;
  mark?: -1 | 0 | 1 | 2;
  voice?: { ms: number };
  file?: { kind: 'photo' | 'file'; name: string; sticker?: true };
};

export type InboxImported = { title: string; contact: string; last: number };

export type InboxRow = {
  identity: string;
  /** The name given here, or the imported chat's that goes on with them; empty if neither. */
  name: string;
  /** The last message's text, how long it is if it is a voice message, or what file it is; empty if there is none yet. */
  last: string;
  /** Whether the last message is ours, and its mark. */
  mine: boolean;
  mark: -1 | 0 | 1 | 2;
  /** When the chat last moved, milliseconds, 0 if never. */
  at: number;
  /** Their messages not read yet. */
  unread: number;
  /** Seconds after which new messages disappear, 0 if they stay. */
  timer: number;
  /** An imported chat goes on here. */
  imported: boolean;
  /** The picture given to them here, or null for the one drawn from their key. */
  avatar: Avatar | null;
  /** The number of an SMS conversation with no contact; empty for a contact's row. */
  sms: string;
  /** The last message is a plain SMS. */
  lastSms: boolean;
  /** The last message disappears (or will, once read), so its text is never kept elsewhere. */
  fades?: boolean;
  /** An SMS conversation pinned at the top (lib/sms-folders.ts). */
  pinned?: boolean;
  /** What is typed in an SMS conversation and not sent yet. */
  draft?: string;
  /** The picture the phone's contacts have for an SMS number, as an address the app may show. */
  photo?: string;
  /** Locked with a PIN of its own (lock/chat-pin.ts): it shows nothing of its messages, `last` is empty. */
  locked?: boolean;
  /** Muted now (lock/chat-notify.ts): its messages make no sound and no notice. */
  muted?: boolean;
  /** The network of a chat that is not Erevos's nor an SMS: a Matrix room (`matrix:` and its id in `identity`), an XMPP person (`xmpp:` and their address) or someone on another Nostr app (`nostr:` and their key in hex). */
  network?: 'matrix' | 'xmpp' | 'nostr';
  /** A Matrix room we are only invited to, or an XMPP person who asked to add us. */
  invited?: boolean;
  /** A Matrix room's picture, or its person's in a chat with one: an mxc:// address (lib/matrix.ts roomAvatar). */
  picture?: string;
};

const PREFIX = 'contact:';

/**
 * The rows, chats that moved latest first, then the rest by name. Messages gone by `now` are left
 * out, and so are those whose time has not come: ours sent for later (lib/waiting.ts), and theirs
 * that came before the time they were sent for (lib/later.ts, showsAt).
 */
export function buildInbox(
  contacts: InboxContact[],
  messages: InboxMessage[],
  imported: InboxImported[],
  now: number,
  sms: InboxSms[] = [],
): InboxRow[] {
  const latest = new Map<string, InboxMessage>();
  const unread = new Map<string, number>();
  for (const m of messages) {
    if (!m.peer.startsWith(PREFIX) || (m.until && m.until <= now) || m.at > now) continue;
    const identity = m.peer.slice(PREFIX.length);
    const before = latest.get(identity);
    if (!before || m.at >= before.at) latest.set(identity, m);
    if (!m.mine && !m.mark) unread.set(identity, (unread.get(identity) ?? 0) + 1);
  }
  const used = new Set<InboxSms>();
  const rows = contacts.map((contact): InboxRow => {
    const last = latest.get(contact.identity);
    const linked = imported.filter((chat) => chat.contact === contact.identity);
    const importedAt = linked.reduce((at, chat) => Math.max(at, chat.last), 0);
    // A group's MMS conversation (numbers comma-separated) keeps a row of its own.
    const texts = contact.phone ? sms.filter((t) => !/[,;]/.test(t.address) && sameNumber(t.address, contact.phone!)) : [];
    texts.forEach((t) => used.add(t));
    // One locked with its PIN in the SMS (lib/chat-protect.ts) says nothing here either.
    const text = texts.filter((t) => !t.locked).reduce<InboxSms | null>((a, t) => (!a || t.at > a.at ? t : a), null);
    const row: InboxRow = {
      identity: contact.identity,
      name: contact.name || linked[0]?.title.trim() || '',
      last: preview(last),
      mine: last?.mine ?? false,
      mark: last?.mark ?? 0,
      at: Math.max(last?.at ?? 0, importedAt),
      unread: unread.get(contact.identity) ?? 0,
      timer: contact.timer,
      imported: linked.length > 0,
      avatar: contact.avatar ?? null,
      sms: '',
      lastSms: false,
      fades: !!(last?.until || last?.lasts),
    };
    if (text && text.at > row.at) Object.assign(row, { last: text.text, mine: text.mine, mark: 0, at: text.at, lastSms: true, fades: false });
    row.unread += texts.reduce((n, t) => n + t.unread, 0);
    // A chat locked with its PIN says only that it moved, and how many came.
    if (contact.locked) Object.assign(row, { last: '', mine: false, mark: 0, lastSms: false, fades: false, locked: true });
    if (mutedNow(contact.notify, now)) row.muted = true;
    return row;
  });
  for (const t of sms) {
    if (used.has(t)) continue;
    rows.push({ identity: `sms:${t.address}`, name: t.name || t.address, last: t.text, mine: t.mine, mark: 0, at: t.at, unread: t.unread, timer: 0, imported: false, avatar: null, sms: t.address, lastSms: true, photo: t.photo, ...(t.locked ? LOCKED_ROW : {}) });
  }
  return rows.sort((a, b) => b.at - a.at || shownName(a).localeCompare(shownName(b)));
}

function preview(message: Pick<InboxMessage, 'text' | 'voice' | 'file'> | undefined): string {
  if (message?.voice) return t('Voice message, {time}', { time: voiceDuration(message.voice.ms) });
  if (message?.file?.sticker) return t('Sticker');
  if (message?.file) return message.file.kind === 'photo' ? t('Photo') : t('File: {name}', { name: message.file.name });
  return plainWords(shownLine(message?.text ?? ''));
}

/** Which of the list shows (app/index.tsx): all of it, the SMS, the Erevos chats, or one other network's. */
export type InboxShow = 'all' | 'sms' | 'erevos' | 'matrix' | 'xmpp' | 'nostr' | 'public';

/**
 * Whether a row shows in that part of the list. The SMS are the SMS conversations, and the chats
 * whose last message was an SMS; the Erevos chats are every contact's and every group's, whatever
 * came last, so a contact whose number's SMS came after stays among them; the Matrix chats are the
 * Matrix rooms, the XMPP chats the XMPP people, and the Nostr chats the people on other Nostr apps.
 * The public feed (components/public-feed.tsx) is no row of the list: none shows in it.
 */
export function showsIn(row: Pick<InboxRow, 'sms' | 'lastSms' | 'network'>, show: InboxShow): boolean {
  if (show === 'sms') return row.sms !== '' || row.lastSms;
  if (show === 'erevos') return row.sms === '' && !row.network;
  if (show === 'matrix' || show === 'xmpp' || show === 'nostr') return row.network === show;
  if (show === 'public') return false;
  return true;
}

/**
 * Whether a row's module is on (lib/modules.ts): a Matrix room, an XMPP chat or a Nostr one with
 * its own; an SMS conversation with the SMS; every other, a contact's chat, a group or a chat
 * brought in from another app, with Erevos.
 */
export function rowOn(row: Pick<InboxRow, 'sms' | 'network'>, on: ReadonlySet<Module>): boolean {
  if (row.network) return on.has(row.network);
  return on.has(row.sms !== '' ? 'sms' : 'erevos');
}

/**
 * How many messages are not read in that part of the list, for its chip's number: the sum of its
 * rows' `unread`, whatever the search says. A muted chat's or group's are left out, as the number
 * on Erevos's icon leaves them out (lib/unread.ts); the groups are rows (groupRows) that carry
 * their `muted`, and show under the Erevos chats and all.
 */
export function tabUnread(rows: Pick<InboxRow, 'unread' | 'muted' | 'sms' | 'lastSms' | 'network'>[], show: InboxShow): number {
  return rows.reduce((sum, row) => (row.muted || !showsIn(row, show) ? sum : sum + row.unread), 0);
}

/** Which parts of the list are on (`on`): their modules (lib/modules.ts), and the public feed's
 *  (`feed`) when the space has a Nostr key or a public Matrix room. */
export type InboxPartsOn = { erevos?: boolean; sms?: boolean; matrix?: boolean; xmpp?: boolean; nostr?: boolean; feed?: boolean };

/** The parts of the list (each one shows as a chip on home once there are two): each one whose
 *  module is on, even with no chat yet, so a chip chosen and left, or one an icon opened, is there
 *  to come back to; and any a row is of. */
export function inboxParts(rows: InboxRow[], on: InboxPartsOn = {}): InboxShow[] {
  const parts: InboxShow[] = [];
  if (on.sms || rows.some((row) => showsIn(row, 'sms'))) parts.push('sms');
  if (on.erevos || rows.some((row) => showsIn(row, 'erevos'))) parts.push('erevos');
  if (on.matrix || rows.some((row) => row.network === 'matrix')) parts.push('matrix');
  if (on.xmpp || rows.some((row) => row.network === 'xmpp')) parts.push('xmpp');
  if (on.feed) parts.push('public');
  if (on.nostr || rows.some((row) => row.network === 'nostr')) parts.push('nostr');
  return parts;
}

/** A Matrix account's rooms as rows (lib/matrix-store.ts). One we are invited to moves to the
 *  top, at `now`, until it is joined or declined. */
export function matrixInboxRows(state: MatrixState, now = Date.now()): InboxRow[] {
  return Object.values(state.rooms).map((room): InboxRow => {
    const last = room.messages[room.messages.length - 1];
    const text = room.invitedBy
      ? t('Invited by {name}', { name: room.members[room.invitedBy]?.name || room.invitedBy })
      : !last
        ? ''
        : last.locked
          ? t('Locked message')
          : last.file?.voice
            ? t('Voice message, {time}', { time: voiceDuration(last.file.duration ?? 0) })
            : last.file
              ? last.file.kind === 'image'
                ? t('Photo')
                : t('File: {name}', { name: last.file.name })
              : last.call
                ? shownLine(last.text)
                : last.text;
    const mine = !room.invitedBy && !!last && last.sender === state.userId;
    return {
      identity: `matrix:${room.id}`,
      name: room.name,
      last: text,
      mine,
      mark: mine && last?.state ? -1 : 0,
      at: room.invitedBy ? now : (last?.ts ?? 0),
      unread: room.invitedBy ? 1 : room.unread,
      timer: 0,
      imported: false,
      avatar: null,
      sms: '',
      lastSms: false,
      network: 'matrix',
      ...(roomAvatar(state, room) ? { picture: roomAvatar(state, room) } : {}),
      ...(mutedNow(room.notify, now) ? { muted: true } : {}),
      ...(room.invitedBy ? { invited: true } : {}),
      // Locked with a PIN of its own (lib/chat-protect.ts): it says only that it moved, and how many came.
      ...(lockedChat(room) ? LOCKED_ROW : {}),
    };
  });
}

/** The marks of an XMPP message we sent: waiting while it goes (or failed), then one tick, two
 *  once their app has it, three once it is read. */
const XMPP_MARKS = { sending: -1, failed: -1, sent: 0, received: 1, read: 2 } as const;

/** An XMPP account's chats and groups as rows (lib/xmpp-store.ts), and its people who asked to
 *  add us and its invitations to groups, which move to the top, at `now`, until they are answered.
 *  A group's last message says who wrote it. */
export function xmppInboxRows(state: XmppState, now = Date.now()): InboxRow[] {
  const asked = new Set(state.requests.map(bare));
  const rows = Object.values(state.chats)
    .filter((chat) => !asked.has(chat.jid))
    .map((chat): InboxRow => {
      const last = chat.messages[chat.messages.length - 1];
      const mine = !!last?.mine;
      const said = !last
        ? ''
        : last.locked
          ? t('Locked message')
          : last.call
            ? shownLine(last.text)
            : last.file
              ? last.file.type.startsWith('image/')
                ? t('Photo')
                : t('File: {name}', { name: last.file.name })
              : last.text;
      return {
        identity: `xmpp:${chat.jid}`,
        name: nameOf(state, chat.jid),
        last: chat.room && last && !mine && last.by ? `${last.by}: ${said}` : said,
        mine,
        // A call's line has no marks of its own: as a space chat's (lib/calls.ts callLineMessage).
        mark: !mine ? 0 : last.call ? 2 : XMPP_MARKS[last.state ?? 'sent'],
        at: last?.at ?? chat.lastAt,
        unread: chat.unread,
        timer: 0,
        imported: false,
        avatar: null,
        sms: '',
        lastSms: false,
        network: 'xmpp',
        ...(mutedNow(chat.notify, now) ? { muted: true } : {}),
        ...(lockedChat(chat) ? LOCKED_ROW : {}),
      };
    });
  for (const jid of asked) {
    rows.push({
      identity: `xmpp:${jid}`,
      name: nameOf(state, jid),
      last: t('Asks to add you'),
      mine: false,
      mark: 0,
      at: now,
      unread: 1,
      timer: 0,
      imported: false,
      avatar: null,
      sms: '',
      lastSms: false,
      network: 'xmpp',
      invited: true,
    });
  }
  for (const invite of state.invites ?? []) {
    rows.push({
      identity: `xmpp:${invite.room}`,
      name: nameOf(state, invite.room),
      last: t('{name} invites you to a group', { name: nameOf(state, invite.from) }),
      mine: false,
      mark: 0,
      at: now,
      unread: 1,
      timer: 0,
      imported: false,
      avatar: null,
      sms: '',
      lastSms: false,
      network: 'xmpp',
      invited: true,
    });
  }
  return rows;
}

/** The marks of a Nostr message we sent: waiting while it goes (or failed), then one tick once a
 *  relay of theirs took it. NIP-17 has no more to say. */
const NOSTR_MARKS = { sending: -1, failed: -1, sent: 0 } as const;

/** The Nostr chats of a space (lib/nostr-dm-store.ts) as rows: named as given here, or as they call
 *  themselves, or by the start and end of their npub; a group as named, or by its members. */
export function nostrInboxRows(state: NostrDmState, now = Date.now()): InboxRow[] {
  return Object.values(state.chats).map((chat): InboxRow => {
    const last = chat.messages[chat.messages.length - 1];
    const mine = !!last?.mine;
    return {
      identity: `nostr:${chat.key}`,
      // Notes to oneself, written from another app with the same key.
      name: chat.key === state.public ? t('Chat with myself') : nostrNameOf(state, chat.key) || shortNpub(npubOf(chat.key)),
      last: !last
        ? ''
        : typeof last.file === 'object'
          ? last.file.type.startsWith('image/')
            ? t('Photo')
            : last.file.type.startsWith('audio/') && last.file.duration
              ? t('Voice message, {time}', { time: voiceDuration(last.file.duration) })
              : t('File: {name}', { name: last.file.name ?? last.file.type })
          : last.file
            ? t('A file')
            : last.text,
      mine,
      mark: mine ? NOSTR_MARKS[last.state ?? 'sent'] : 0,
      at: last?.at ?? chat.lastAt,
      unread: chat.unread,
      timer: 0,
      imported: false,
      avatar: null,
      sms: '',
      lastSms: false,
      network: 'nostr',
      ...(mutedNow(chat.notify, now) ? { muted: true } : {}),
      ...(lockedChat(chat) ? LOCKED_ROW : {}),
    };
  });
}

/** A row's name, or the start of the contact's key when it has none. */
export function shownName(row: { identity: string; name: string }): string {
  return row.name || t('contact {id}', { id: row.identity.slice(0, 8) });
}

/** Rows whose name or last message has `query` in it, ignoring case and Greek accents. */
export function filterInbox(rows: InboxRow[], query: string): InboxRow[] {
  const plain = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const q = plain(query.trim());
  if (!q) return rows;
  return rows.filter((row) => plain(shownName(row)).includes(q) || plain(row.last).includes(q));
}

/** A group as the list has it (lib/groups.ts). */
export type InboxGroup = {
  id: string;
  name: string;
  status: 'in' | 'leaving' | 'out';
  last: { at: number; from: string; text: string; note?: boolean; file?: { kind: 'photo' | 'file'; name: string; sticker?: true }; ms?: number } | null;
  unread: number;
  /** Locked with a PIN of its own here (lock/chat-pin.ts). */
  locked?: boolean;
  /** Its own notifications here (lock/chat-notify.ts). */
  notify?: ChatNotify;
};

// A group's photo, file or voice message (with `ms`) shows as a chat's does.
const groupPreview = (last: NonNullable<InboxGroup['last']>) => preview(last.file && last.ms !== undefined ? { text: '', voice: { ms: last.ms } } : last);

/** The space's groups as rows, `group:` and their id in place of a contact's identity. `name`
 *  gives a member's name by identity, and `note` a note's text. */
export function groupRows(groups: InboxGroup[], name: (identity: string) => string, note: (text: string) => string, now = Date.now()): InboxRow[] {
  return groups.map((g) => {
    const last = g.last;
    const text = !last || g.locked ? '' : last.note ? note(last.text) : last.from ? `${name(last.from)}: ${groupPreview(last)}` : t('You: {text}', { text: groupPreview(last) });
    return {
      identity: `group:${g.id}`,
      name: g.name || t('Group'),
      last: text,
      mine: false,
      mark: 0,
      at: last?.at ?? 0,
      unread: g.unread,
      timer: 0,
      imported: false,
      avatar: null,
      sms: '',
      lastSms: false,
      ...(g.locked ? { locked: true } : {}),
      ...(mutedNow(g.notify, now) ? { muted: true } : {}),
    };
  });
}

/** Rows merged and sorted as `buildInbox` sorts them. */
export function mergeRows(rows: InboxRow[], more: InboxRow[]): InboxRow[] {
  return [...rows, ...more].sort((a, b) => b.at - a.at || shownName(a).localeCompare(shownName(b)));
}

const pad = (n: number) => String(n).padStart(2, '0');
const DAYS = [mark('Sun'), mark('Mon'), mark('Tue'), mark('Wed'), mark('Thu'), mark('Fri'), mark('Sat')];

/** When a row last moved: the time today, the weekday within a week, or the date. */
export function rowTime(at: number, now: number): string {
  if (!at) return '';
  const d = new Date(at);
  const today = new Date(now);
  if (d.toDateString() === today.toDateString()) return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const midnight = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  if (at > midnight - 6 * 24 * 3600 * 1000 && at < midnight) return t(DAYS[d.getDay()]);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${String(d.getFullYear()).slice(2)}`;
}
