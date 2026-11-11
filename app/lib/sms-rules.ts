// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { goneOf, nextGoes, RULES_TICK, type ChatRules } from './chat-rules';
import { smsLineId } from './sms-chat';
import { sameConversation } from './sms-group';
import { SmsLink } from './sms-link';
import type { SmsData } from '../lock/sms-data';
import { deleteSmsMessages, smsMessages, smsMirrored, smsToolsReady, type SmsMessage } from '../modules/erevos-sms';

// Disappearing messages in an SMS conversation (lib/chat-rules.ts): an SMS cannot be taken back
// from the phone it went to, so a conversation's timer deletes this phone's copies only, the
// other phone keeps its own, which the conversation says. It counts from when each was sent or
// came, for those from when it was turned on. Erevos deletes them as the SMS app, when it runs:
// the conversation hides them at their time, and the list and the conversation delete them from
// the phone's store (sweepSms). The timers are the space's, sealed with its SMS data
// (lock/sms-data.ts).

/** A conversation's rules, as the space keeps them. */
export function smsRulesOf(data: Pick<SmsData, 'vanish'>, address: string): ChatRules | undefined {
  const steps = data.vanish.find((v) => sameConversation(v.address, address))?.steps;
  return steps?.length ? { vanish: steps } : undefined;
}

// One still going counts from when it goes, not from when it was written.
const done = (m: SmsMessage) => m.state !== 'sending';

/** The messages of a conversation gone by `now`. */
export const goneSms = (rules: ChatRules | undefined, messages: readonly SmsMessage[], now = Date.now()): SmsMessage[] =>
  goneOf(rules, messages.filter(done), smsLineId, (m) => m.at, now);

/** When the next message of a conversation goes, or 0. */
export const nextSmsGoes = (rules: ChatRules | undefined, messages: readonly SmsMessage[], now = Date.now()): number =>
  nextGoes(rules, messages.filter(done), smsLineId, (m) => m.at, now);

/** The most messages of a conversation looked at, the latest. */
const LOOKED = 1000;

/**
 * Deletes from the phone what is gone by `now` in every conversation with a timer (`remove`: as the
 * SMS app does it), with the pins of it. What could not go stays, to be tried again. Returns how
 * many went.
 */
export async function sweepSms(
  link: SmsLink,
  read: (address: string, limit: number) => Promise<SmsMessage[]>,
  remove: (ids: string[]) => Promise<unknown>,
  now = Date.now(),
): Promise<number> {
  let count = 0;
  for (const { address, steps } of link.state.vanish) {
    if (!steps.some((step) => step.after > 0)) continue;
    let ids: string[];
    try {
      ids = goneSms({ vanish: steps }, await read(address, LOOKED), now).map(smsLineId);
      if (!ids.length) continue;
      await remove(ids);
    } catch {
      continue;
    }
    count += ids.length;
    for (const pin of link.messagePins(address)) if (ids.includes(pin.id)) await link.pinMessage(address, pin, false).catch(() => undefined);
  }
  return count;
}

const swept = new Map<number, number>();

/** Sweeps a space's SMS (sweepSms) as the SMS app, at most once every RULES_TICK, or at once with
 *  `soon`; on a linked device, never: only the phone deletes its SMS. Returns how many went. */
export async function sweepSpaceSms(space: number, key: Uint8Array, soon = false, now = Date.now()): Promise<number> {
  if (smsMirrored() || !smsToolsReady() || (!soon && (swept.get(space) ?? -RULES_TICK) > now - RULES_TICK)) return 0;
  swept.set(space, now);
  const link = await SmsLink.open(space, key);
  return link.state.vanish.length ? sweepSms(link, smsMessages, deleteSmsMessages, now) : 0;
}
