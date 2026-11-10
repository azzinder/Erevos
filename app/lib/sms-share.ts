// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { markSmsRead, onSmsEvent, sendMms, sendSms, smsMessages, smsMirrored, smsReady, type SmsMessage } from '../modules/erevos-sms';
import { handSms } from './devices';
import { sameNumber } from './sms-invite';
import { shownMessages, smsFolder, onSmsOrderChanged, trashOf } from './sms-folders';
import { smsNumbers } from './sms-group';
import { SmsLink } from './sms-link';
import { smsRows } from './sms-rows';
import { ASK_LASTS, SHARED_CONVERSATIONS, SHARED_MESSAGES, type SharedConversation, type SharedSms, type SharedSmsAll } from './sync/sms';

// The phone's side of its SMS on the linked devices (docs/sync.md, phase S8; lib/sync/sms.ts says
// what goes): read here and given to lib/devices.ts (handSms), which writes them into the space's
// log; and what the devices asked of them, done here: an SMS sent, once ever, on the SIM chosen for
// that number, and a conversation marked read. Only while the owner turned it on for the space
// (Settings → SMS → On my linked devices too: SmsLink.devices), and only the conversations the space
// shows (not those in its Trash or in Spam), named only when the space names its SMS numbers.
//
// So the phone reads little each minute: a conversation's messages are read again only when it
// changed (its latest message, how many are not read), when an SMS came, went or was delivered in it,
// or once SHARE_AGAIN went by.

const SHARE_AGAIN = 10 * 60_000;
// After an SMS went or was delivered, the conversations whose latest came this recently are read again.
const RECENT = 60 * 60_000;
// The SMS change in bursts (one long SMS comes in parts): told once they settle.
const SETTLE = 2000;
// The most SMS the devices may have this phone send in an hour: past them, one does not go and
// shows as not sent, so a device lost or taken sends no flood of them meanwhile.
const MOST_PER_HOUR = 60;
const HOUR = 60 * 60_000;
const sentAt: number[] = [];

type Kept = { sig: string; at: number; messages: SharedSms[] };
const kept = new Map<string, Kept>();
const dirty = new Set<string>();
let allDirty = false;
const watchers = new Set<() => void>();
let settle: ReturnType<typeof setTimeout> | null = null;
let following = false;

function tell(): void {
  if (settle) clearTimeout(settle);
  settle = setTimeout(() => {
    settle = null;
    watchers.forEach((changed) => changed());
  }, SETTLE);
}

function follow(): void {
  if (following) return;
  following = true;
  onSmsEvent('onSms', ({ address }) => {
    if (address) dirty.add(address);
    else allDirty = true;
    tell();
  });
  const recent = () => {
    allDirty = true;
    tell();
  };
  onSmsEvent('onSmsSent', recent);
  onSmsEvent('onSmsDelivered', recent);
  onSmsEvent('onSmsChanged', recent);
  onSmsOrderChanged(recent);
}

/** The owner turned the SMS on the devices on or off, or changed what goes with them: they go at once. */
export function smsDevicesChanged(): void {
  allDirty = true;
  tell();
}

function sharedOf(m: SmsMessage): SharedSms | null {
  if (!Number.isSafeInteger(m.id) || m.id < 0) return null;
  return {
    kind: m.kind === 'mms' ? 'mms' : 'sms',
    row: m.id,
    text: m.text,
    at: m.at,
    mine: m.mine,
    state: m.state,
    read: m.read,
    ...(m.from ? { from: m.from } : {}),
    ...(m.pictures && m.pictures.length > 0 ? { pictures: m.pictures.length } : {}),
  };
}

/** The phone's SMS of the space as they go to its devices now; null while they do not go. `known`: the numbers of the space's contacts. */
async function shared(space: number, key: Uint8Array, known: readonly string[]): Promise<SharedSmsAll | null | undefined> {
  if (!smsReady() || smsMirrored()) return null;
  const link = await SmsLink.open(space, key);
  if (!link.devices) return null;
  const rows = await smsRows(space, key);
  const order = rows.order ?? link.state;
  const now = Date.now();
  const conversations: SharedConversation[] = [];
  const again = allDirty;
  allDirty = false;
  for (const row of rows.threads) {
    if (conversations.length >= SHARED_CONVERSATIONS) break;
    const known1 = !!row.name || known.some((p) => sameNumber(p, row.address));
    const folder = smsFolder(row, order, rows.blocked, known1);
    if (folder !== 'list' && folder !== 'archived') continue;
    const thread = (row as { thread?: number }).thread;
    if (typeof thread !== 'number' || !Number.isSafeInteger(thread)) continue;
    const id = `${space}:${thread}`;
    const sig = JSON.stringify([row.at, row.unread, row.text, row.mine]);
    const was = kept.get(id);
    const fresh = was && was.sig === sig && now - was.at < SHARE_AGAIN && !dirty.has(row.address) && !(again && row.at > now - RECENT);
    let messages = was?.messages ?? [];
    if (!fresh) {
      const read = await smsMessages(row.address, SHARED_MESSAGES).catch(() => null);
      if (read === null) {
        // Not read this time: what was to be read again still is, the next time.
        allDirty ||= again;
        return undefined;
      }
      messages = shownMessages(read, trashOf(row.address, order)).flatMap((m) => sharedOf(m) ?? []);
      kept.set(id, { sig, at: now, messages });
      dirty.delete(row.address);
    }
    const numbers = smsNumbers(row.address);
    const names: Record<string, string> = {};
    if (rows.names && numbers.length > 1 && row.name) {
      // A group's name is its members' names, comma-separated, in the order of its numbers.
      const parts = row.name.split(', ');
      if (parts.length === numbers.length) numbers.forEach((n, i) => parts[i] !== n && (names[n] = parts[i]));
    }
    conversations.push({
      thread,
      address: row.address,
      at: row.at,
      unread: row.unread,
      ...(rows.names && row.name ? { name: row.name } : {}),
      ...(Object.keys(names).length > 0 ? { names } : {}),
      messages,
    });
  }
  return { names: rows.names, conversations };
}

async function send(space: number, key: Uint8Array, ask: { id: string; address: string; text: string; at: number }): Promise<'sent' | 'failed' | 'old'> {
  const now = Date.now();
  if (ask.at < now - ASK_LASTS || ask.at > now + ASK_LASTS) return 'old';
  const link = await SmsLink.open(space, key);
  const was = link.deviceAsk(ask.id);
  if (was === 'sent') return 'sent';
  // Taken before and what came of it unknown (Erevos stopped meanwhile): it may have gone, so it does not go again.
  if (was) return 'failed';
  while (sentAt.length > 0 && sentAt[0] < now - HOUR) sentAt.shift();
  if (sentAt.length >= MOST_PER_HOUR) return 'failed';
  await link.setDeviceAsk(ask.id, 'sending');
  sentAt.push(now);
  let row = -1;
  try {
    const sim = link.simFor(ask.address);
    row = smsNumbers(ask.address).length > 1 ? await sendMms(ask.address, ask.text, null, sim) : await sendSms(ask.address, ask.text, sim);
  } catch {
    row = -1;
  }
  const done = row >= 0 ? 'sent' : 'failed';
  await link.setDeviceAsk(ask.id, done).catch(() => undefined);
  if (done === 'sent') dirty.add(ask.address);
  return done;
}

handSms({
  shared,
  send,
  read: async (address) => {
    await markSmsRead(address);
    dirty.add(address);
  },
  watch: (changed) => {
    follow();
    watchers.add(changed);
    return () => {
      watchers.delete(changed);
    };
  },
});
