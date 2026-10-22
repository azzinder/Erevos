// The relay side of SMS invites (lib/sms-invite.ts) for the open space's own chats, not its hidden
// ones: opening an answer to an invite sent from here, accepting the first message of someone whose
// invite was answered here, and answering the invites that came. The chat screen does this while it
// is open, the receiver (lib/receiver.ts) otherwise, with the same state (lib/sms-link.ts).

import { contactLink, parseContact } from './contact-code';
import { canSealOpen, relaySeal } from './core';
import { fromBase64 } from './crypto';
import { BlockedContactError, toBase64Url, type E2E, type Where } from './e2e';
import { fromHex, sendMessage, type Relay } from './relay';
import { inviteAnswer, plainNumber, sameNumber, type SmsInvite } from './sms-invite';
import { SmsLink } from './sms-link';
import { contactTarget } from './space-chats';
import { currentSpace } from '../lock/keys';
import { takeSmsInvites } from '../modules/erevos-sms';

let opened: { of: object; link: Promise<SmsLink> } | null = null;
// Invites that came and could not be answered yet, answered with the next look.
let unanswered: { from: string; invite: SmsInvite }[] = [];

/** The open space's SMS invite state, opened the first time it is asked for. */
export function spaceSmsLink(): Promise<SmsLink> {
  const current = currentSpace();
  if (opened?.of !== current) {
    const link = SmsLink.open(current.space, current.key);
    opened = { of: current, link };
    unanswered = [];
    link.catch(() => {
      if (opened?.link === link) opened = null;
    });
  }
  return opened.link;
}

/** Lets go of the space's SMS state when it closes. */
export function forgetSmsLink(): void {
  opened = null;
  unanswered = [];
}

/** Reads what the SMS screen changed since, as an invite it just sent. */
export async function refreshSmsLink(): Promise<void> {
  await (await spaceSmsLink()).refresh();
}

/**
 * Whether `bytes` from the relay answer an invite sent from here. If so, adds the contact from the
 * link it carries and links the number to it: their first packet goes with the next look. Returns
 * the number and the contact, or null when `bytes` are something else, or the answer of someone
 * blocked here, which is dropped (lib/e2e.ts BlockedContactError).
 */
export async function takeInviteAnswer(e2e: E2E, bytes: Uint8Array, ownSender: string, here: Where): Promise<{ number: string; identity: string } | null> {
  const link = await spaceSmsLink();
  if (!link.waiting) return null;
  const answer = await link.openAnswer(bytes);
  const code = answer ? parseContact(answer.link) : null;
  if (!answer || !code || code.senderHex === ownSender) return null;
  let identity: string;
  try {
    ({ identity } = await e2e.addContact(code, ownSender, here));
  } catch (error) {
    if (error instanceof BlockedContactError) return null;
    throw error;
  }
  await e2e.linkPhone(identity, plainNumber(answer.number));
  return { number: answer.number, identity };
}

/** After someone new's first message: if this chat answered their SMS invite, they are a contact
 *  without a request, and their number is theirs. Returns the number, or null. */
export async function linkInviter(e2e: E2E, identity: string): Promise<string | null> {
  const sender = e2e.contacts().find((c) => c.identity === identity)?.sender ?? '';
  const number = sender ? (await spaceSmsLink()).invitedBy(sender) : null;
  if (!number) return null;
  await e2e.acceptRequest(identity);
  await e2e.linkPhone(identity, number);
  return number;
}

/** Answers SMS invites from Erevos phones with this chat's contact link, sealed for the inviter: the queue the link names (`linkSender`, lib/queue-move.ts). */
export async function answerInvites(e2e: E2E, linkSender: string, here: Where, sends: Relay): Promise<void> {
  if (!canSealOpen()) return;
  const link = await spaceSmsLink();
  const pieces = (await takeSmsInvites()).map((p) => ({ from: p.from, data: fromBase64(p.data), at: p.at }));
  const invites = [...unanswered, ...(pieces.length ? await link.collect(pieces) : [])];
  unanswered = [];
  for (const item of invites) {
    const { from, invite } = item;
    if (e2e.phones().some((p) => sameNumber(p.phone, from))) continue;
    try {
      const own = contactLink({ senderHex: linkSender, relayUrl: here.relay, key: toBase64Url(e2e.bundle), relayKey: here.relayKey || undefined });
      const sealed = await relaySeal(invite.key, fromHex(linkSender), inviteAnswer(own));
      // This chat's contact link, which their phone adds: no message (lib/relay.ts, Mark).
      await sendMessage(contactTarget(sends, invite), fromHex(invite.sender), sealed, 'quiet');
      await link.answered(from, invite.sender);
    } catch {
      unanswered.push(item);
    }
  }
}
