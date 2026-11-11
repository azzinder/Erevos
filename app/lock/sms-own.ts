// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { checkedLook, type Look } from '../theme/look';

import { checkedChatNotify, type ChatNotify } from './chat-notify';
import { checkedChatPin, type ChatPin } from './chat-pin';

// What an SMS conversation has of its own in a space, kept with the space's SMS data (sms-data.ts),
// as a Matrix, XMPP or Nostr chat keeps it with its account (lib/chat-protect.ts): the PIN it is
// locked with, as kept (chat-pin.ts), its screenshots blocked, its own look (theme/look.ts) and its
// own notifications (chat-notify.ts). The phone's SMS store, which other apps read, holds none of it.

/** A conversation, by its address (a group's numbers comma-separated), and what it has of its own. */
export type SmsOwn = { address: string; pin?: ChatPin; shots?: true; look?: Look; notify?: ChatNotify };

/** The conversations kept with something of their own, at most. */
export const MAX_SMS_OWN = 500;

/** The conversations as kept, those of the wrong shape left out, and those with nothing of their own. */
export function checkedSmsOwn(value: unknown): SmsOwn[] {
  const list = Array.isArray(value) ? value : [];
  const kept: SmsOwn[] = [];
  for (const item of list) {
    const v = (item ?? {}) as Partial<Record<keyof SmsOwn, unknown>>;
    if (typeof v.address !== 'string' || v.address.length === 0 || v.address.length > 400) continue;
    const pin = checkedChatPin(v.pin);
    const notify = checkedChatNotify(v.notify);
    const own: SmsOwn = {
      address: v.address,
      ...(pin ? { pin } : {}),
      ...(v.shots === true ? { shots: true as const } : {}),
      ...(v.look && typeof v.look === 'object' ? { look: checkedLook(v.look) } : {}),
      ...(notify ? { notify } : {}),
    };
    if (Object.keys(own).length > 1) kept.push(own);
  }
  // Past the most, those with no PIN go, the oldest first: a PIN never goes by itself.
  let over = kept.length - MAX_SMS_OWN;
  return over > 0 ? kept.filter((own) => !!own.pin || over-- <= 0) : kept;
}
