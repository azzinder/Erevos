// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// The relay side of SMS invites (lib/sms-invite.ts) for the open space's own chats, not its hidden
// ones: opening an answer to an invite sent from here, accepting the first message of someone whose
// invite was answered here, and answering the invites that came. The chat screen does this while it
// is open, the receiver (lib/receiver.ts) otherwise, with the same state (lib/sms-link.ts). Invites
// by plain SMS (lib/text-invite.ts) are made here too, answered the same way, and their invites to
// the relay taken back once they are over unused.

import { contactLink, parseContact } from './contact-code';
import { canRelaySeal, canSealOpen, relaySeal, sealPublic } from './core';
import { fromBase64, randomBytes } from './crypto';
import { BlockedContactError, randomLineName, toBase64Url, type E2E, type Where } from './e2e';
import { t } from './i18n';
import { fromHex, listInvites, makeInvite, relayKey, sendMessage, takeBackInvite, type Relay } from './relay';
import { inviteAnswer, plainNumber, sameNumber, type SmsInvite } from './sms-invite';
import { SmsLink } from './sms-link';
import { contactTarget, spaceChats } from './space-chats';
import { spaceLinkSender } from './queue-move';
import { inviteId, TEXT_INVITE_DAYS, textInviteLink, type TextInvite } from './text-invite';
import { currentSpace } from '../lock/keys';
import { loadCurrentSpaceData } from '../lock/space-data';
import { takeSmsInvites } from '../modules/erevos-sms';

const DAY = 24 * 3600 * 1000;

let opened: { of: object; link: Promise<SmsLink> } | null = null;
// Invites that came and could not be answered yet, answered with the next look; one by plain SMS
// taken here has no number (`from` is '') and the name given there to whoever sent it.
let unanswered: { from: string; invite: SmsInvite; name?: string }[] = [];

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
  // An invite by plain SMS went to one of the phone's contacts: the new contact takes their name.
  if (answer.name && !e2e.contacts().find((c) => c.identity === identity)?.name) await e2e.rename(identity, answer.name).catch(() => undefined);
  return { number: answer.number, identity };
}

/** After someone new's first message: if this chat answered their SMS invite, they are a contact
 *  without a request, their number is theirs (none for an invite by plain SMS), and they take the
 *  name given them when it was taken, unless they have one. Returns the number ('' for none) and
 *  the contact's name now, or null. */
export async function linkInviter(e2e: E2E, identity: string): Promise<{ number: string; name: string } | null> {
  const sender = e2e.contacts().find((c) => c.identity === identity)?.sender ?? '';
  const got = sender ? (await spaceSmsLink()).answeredFor(sender) : null;
  if (!got) return null;
  await e2e.acceptRequest(identity);
  if (got.number) await e2e.linkPhone(identity, got.number);
  if (got.name && !e2e.contacts().find((c) => c.identity === identity)?.name) await e2e.rename(identity, got.name).catch(() => undefined);
  return { number: got.number, name: e2e.contacts().find((c) => c.identity === identity)?.name ?? '' };
}

/** Answers SMS invites from Erevos phones with this chat's contact link, sealed for the inviter: the queue the link names (`linkSender`, lib/queue-move.ts). */
export async function answerInvites(e2e: E2E, linkSender: string, here: Where, sends: Relay): Promise<void> {
  if (!canSealOpen()) return;
  const link = await spaceSmsLink();
  // Taken off the list at once: one added meanwhile waits for the next look.
  const queued = unanswered;
  unanswered = [];
  let invites: typeof queued;
  try {
    const pieces = (await takeSmsInvites()).map((p) => ({ from: p.from, data: fromBase64(p.data), at: p.at }));
    invites = [...queued, ...(pieces.length ? await link.collect(pieces) : [])];
  } catch (error) {
    unanswered.push(...queued);
    throw error;
  }
  for (const item of invites) {
    const { from, invite } = item;
    if (from && e2e.phones().some((p) => sameNumber(p.phone, from))) continue;
    try {
      const own = contactLink({ senderHex: linkSender, relayUrl: here.relay, key: toBase64Url(e2e.bundle), relayKey: here.relayKey || undefined });
      const sealed = await relaySeal(invite.key, fromHex(linkSender), inviteAnswer(own));
      // This chat's contact link, which their phone adds: no message (lib/relay.ts, Mark).
      await sendMessage(contactTarget(sends, invite), fromHex(invite.sender), sealed, 'quiet');
      await link.answered(from, invite.sender, item.name ?? '');
    } catch {
      unanswered.push(item);
    }
  }
}

/** Answers an invite by plain SMS taken here, with the next look: by then this phone has joined its
 *  relay, if it does. `name`: what this phone calls whoever sent it. */
export function answerTextInvite(invite: TextInvite, name: string): void {
  // Opened first: opening it for the space anew starts the list afresh.
  void spaceSmsLink().catch(() => undefined);
  unanswered.push({ from: '', invite: { sender: invite.sender, key: invite.key, relay: invite.relay, relayKey: invite.relayKey }, name: name.trim() });
}

/**
 * An invite by plain SMS to `number`, a contact of the phone's named `name`, for its link: with an
 * invite to this phone's relay, so their phone joins it, and what its answer is sealed to. Throws
 * when this phone has no relay of its own to invite to, or its relay lets it invite no one.
 */
export async function makeTextInvite(number: string, name: string): Promise<string> {
  const data = await loadCurrentSpaceData();
  if (!data.url || !data.ownQueue) throw new Error(t('An invite by SMS needs a relay: your phone has none yet.'));
  const relay: Relay = { url: data.url, token: data.token || undefined };
  // The relay has a name of random letters for them, never their number; the name stays here (lib/e2e.ts lineFor).
  const chats = await spaceChats().catch(() => null);
  const line = chats ? await chats.e2e.lineFor(name.trim() || plainNumber(number)) : randomLineName();
  const access = relay.token ? await makeInvite(relay, line) : null;
  if (!access) {
    throw new Error(t('Your relay does not let this phone invite anyone, so an invite by SMS could not let them in. Invite them with a QR code instead, from New chat.'));
  }
  let key = '';
  if (canRelaySeal()) {
    const bytes = await relayKey(relay).catch(() => null);
    if (bytes) key = toBase64Url(bytes);
  }
  const secret = randomBytes(32);
  const as = chats?.e2e.invitedAs() ?? '';
  const invite: TextInvite = {
    // Its answer comes to the queue the contact link names (lib/queue-move.ts), as an SMS invite's.
    sender: await spaceLinkSender(data.ownQueue),
    key: await sealPublic(secret),
    code: access.code,
    relay: data.url,
    relayKey: key,
    name: as,
    expires: Math.min(Date.now() + TEXT_INVITE_DAYS * DAY, access.expires),
  };
  await (await spaceSmsLink()).textInvited(number, secret, access.code, name);
  return textInviteLink(invite);
}

/**
 * The invites by plain SMS sent from here that are over: one whose invite to the relay no phone
 * used is taken back from the relay at `own`, with this phone's token, and forgotten; for one used,
 * only the invite to the relay is forgotten, as its phone may still answer. Asks the relay only
 * when one is over.
 */
export async function expireTextInvites(own: Relay, now = Date.now()): Promise<void> {
  const link = await spaceSmsLink();
  const due = link.textInvitesDue(now - TEXT_INVITE_DAYS * DAY);
  if (due.length === 0) return;
  const listed = await listInvites(own);
  for (const sent of due) {
    const id = inviteId(sent.code!);
    const it = listed?.find((l) => l.id === id);
    if (it && it.used === 0) await takeBackInvite(own, id);
    // Listed by no relay that lets this phone invite, the relay forgot it, or it was taken back by hand.
    await link.settleTextInvite(sent.secret, !it || it.used === 0);
  }
}
