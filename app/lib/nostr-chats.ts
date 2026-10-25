// Contacts' texts through Nostr (lib/nostr.ts), for the chats: how a text sealed for Nostr goes,
// with the relay as its backup, and how what comes there is read, as from the relay.
//
// A text whose contact said they read on Nostr (lib/e2e.ts seal, `nostr`) goes to their Nostr
// relays while Tor is ready, and is kept: should their phone not say it came within
// NOSTR_BACKUP_MS, it goes through our relay as well (sendNostrBackups, with each look at the
// relay), and their phone, which may have it from both, shows it once. Should no Nostr relay take
// it, it goes through our relay at once, as it would have. To a contact that asked for a bell
// (their hidden chats, closed, hear of what came only from their relay queue), a bell goes to
// their relay queue too, marked as a message (lib/e2e.ts bell): their relay counts it, and their
// phone says something came; the backup then goes quiet, as it was counted once already. A bell
// their relay did not take counted nothing: then the backup is the message that counts.
//
// With no relay between the two (this phone has none, or the contact said none: lib/e2e.ts seal),
// Nostr is the only way, for all that goes, not only words (nostrOnlyWay): the conversation's
// first packet with what follows it, in one wrap, until they answer, as relays may give wraps in
// any order. A text that went so is kept and goes there again about daily while their phone does
// not say it came (sendNostrAgain), as a Nostr relay keeps a wrap two days, not the relay's
// fourteen. What no Nostr relay took waits, as for a relay out of reach (lib/waiting.ts).

import type { E2E } from './e2e';
import type { NostrTo } from '../lock/e2e-data';
import { NOSTR_MOST, nostrReady, packNostr, publishNostr, type NostrReader } from './nostr';
import { fromHex, RelayUnreachableError, sendMessage, type Relay } from './relay';
import { contactTarget, sendSealed } from './space-chats';
import { t } from './i18n';

const wentListeners = new Set<(identity: string, tag: string) => void>();

/** Has `listener` called with each text a Nostr relay took, by its contact and tag (lock/history.ts throughNostr). Returns how to stop. */
export function onNostrWent(listener: (identity: string, tag: string) => void): () => void {
  wentListeners.add(listener);
  return () => wentListeners.delete(listener);
}

/** What a seal gives that a text needs to go through Nostr: its tag, and where they read there. */
export type ForNostr = { tag?: string; nostr?: NostrTo | null };

/**
 * How `packets` sealed for a contact go: through Nostr when the seal said so (`sealed.nostr`) and
 * Tor is ready, kept to go through the relay as well should they not say it came in time; otherwise,
 * and when no Nostr relay took it, as `relay` sends it. `own` reaches their relay queue for a bell.
 * Says 'nostr' when a Nostr relay took it.
 */
export function orNostr(e2e: E2E, own: Relay | null, identity: string, sealed: ForNostr, packets: Uint8Array[], relay: () => Promise<void>): () => Promise<'nostr' | void> {
  const to = sealed.nostr;
  const tag = sealed.tag ?? '';
  if (!to || !own || !tag || packets.length !== 1) return relay;
  const [packet] = packets;
  return async () => {
    if (!nostrReady()) return relay();
    try {
      await publishNostr(to, packet);
    } catch {
      return relay();
    }
    wentListeners.forEach((listener) => listener(identity, tag));
    const rang = to.b === true && (await ringBell(e2e, own, identity, packet.length).then(
      () => true,
      () => false,
    ));
    await e2e.nostrKeep(identity, tag, packet, rang).catch(() => undefined);
    return 'nostr';
  };
}

/**
 * How a contact's packets go when no relay is between the two and the seal said they read on Nostr
 * (`sealed.nostr`): there only, after the conversation's first packet while they have not answered,
 * all in one wrap. A text that went is kept to go again (sendNostrAgain). Throws a relay's
 * unreachable error, which lets it wait, while Tor is not ready or no Nostr relay took it. Null
 * when it cannot go so: no Nostr place, or too large for a wrap.
 */
export function nostrOnlyWay(e2e: E2E, identity: string, sealed: ForNostr & { first: Uint8Array | null }, packets: Uint8Array[]): (() => Promise<'nostr'>) | null {
  const to = sealed.nostr;
  if (!to) return null;
  const packed = packNostr(sealed.first ? [sealed.first, ...packets] : packets);
  if (packed.length > NOSTR_MOST) return null;
  return async () => {
    if (!nostrReady()) throw new RelayUnreachableError(t('Tor is not ready.'));
    try {
      await publishNostr(to, packed);
    } catch (error) {
      throw new RelayUnreachableError(t('No Nostr relay took it: {reason}', { reason: error instanceof Error ? error.message : String(error) }));
    }
    const tag = sealed.tag ?? '';
    if (tag) {
      wentListeners.forEach((listener) => listener(identity, tag));
      await e2e.nostrKeepOnly(identity, tag, packed).catch(() => undefined);
    }
    return 'nostr';
  };
}

/** Sends to Nostr again what went to contacts there only and was not said to have come (lib/e2e.ts nostrAgainDue), each to where they read now. What cannot go now goes with the next look. */
export async function sendNostrAgain(e2e: E2E, now = Date.now()): Promise<void> {
  if (!nostrReady()) return;
  for (const { identity, tag, packed, to } of e2e.nostrAgainDue(now)) {
    try {
      await publishNostr(to, packed);
      await e2e.nostrWentAgain(identity, tag, now);
    } catch {
      // Tried again with the next look.
    }
  }
}

// A bell for a contact's hidden chats, to their relay queue, marked as a message. Rejects when
// none went.
async function ringBell(e2e: E2E, own: Relay, identity: string, length: number): Promise<void> {
  const queue = e2e.queueOf(identity);
  if (!queue?.sender) throw new Error('no queue for the bell');
  await sendMessage(contactTarget(own, queue), fromHex(queue.sender), e2e.bell(identity, length), 'message');
}

/**
 * Sends through the relay (`own`) the texts that went through Nostr and were not said to have come
 * in time (lib/e2e.ts nostrBackupsDue), each to where its contact reads now. What the relay cannot
 * take now goes with the next look.
 */
export async function sendNostrBackups(e2e: E2E, own: Relay, now = Date.now()): Promise<void> {
  for (const { identity, tag, packet, quiet } of e2e.nostrBackupsDue(now)) {
    const queue = e2e.queueOf(identity);
    try {
      if (queue?.sender) await sendSealed(own, { ...queue, first: null }, [packet], quiet ? 'quiet' : 'message', async () => undefined);
      await e2e.nostrBackupSent(identity, tag);
    } catch {
      // Tried again with the next look.
    }
  }
}

/** A chat as it reads on Nostr: its keys, until when it read, and `take` for what came. */
export function nostrReaderOf(e2e: () => E2E | null, take: (bytes: Uint8Array) => Promise<void>): NostrReader {
  return {
    keys: () => e2e()?.nostrKeys() ?? [],
    since: () => e2e()?.nostrSince() ?? 0,
    caught: (at) => void e2e()?.nostrRead(at).catch(() => undefined),
    take,
  };
}
