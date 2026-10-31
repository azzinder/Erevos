// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import type { About } from '../lock/group-data';
import { bundleIdentity } from './core';
import { toHex } from './crypto';
import { fromBase64Url, toBase64Url, type E2E } from './e2e';
import { t } from './i18n';
import { sameRelay } from './relay';

// Members of a group who are not each other's contacts can ask for each other's contact links, in
// a group message only that member gets (lib/groups.ts `askContact`). Once both said yes, each
// phone adds the other here, in the space's own chats: from the key the member gave, reached where
// its group About says, which MLS vouches for. Nothing here touches hidden chats, nor a contact the
// space has already: a group cannot move a chat to another queue. Each call names the account the
// groups asking are this phone's for (`me`), and refuses once the space open is another's: one
// opened while an ask was on its way is not written to, nor are its keys given.

/** How the groups reach the space's contacts, to ask for contact links and add them. `me` is the
 *  identity the groups asking say of this phone. */
export type GroupContacts = {
  /** This account's public keys, base64url: what a member adds it by. */
  bundle(me: string): Promise<string>;
  /** Whether `identity` is in the space's contacts, accepted or a message request. */
  has(me: string, identity: string): Promise<boolean>;
  /** Whether `identity` is a contact the space has accepted: not a message request. */
  accepted(me: string, identity: string): Promise<boolean>;
  /** Whether `identity` is blocked in the space: what they ask is dropped, and nothing adds them. */
  blocked(me: string, identity: string): Promise<boolean>;
  /** Adds the member who gave `key`, reached where its group About says. Accepts their message
   *  request if they are one; a contact already here is left as it is. */
  add(me: string, about: About, key: string): Promise<void>;
};

/** The space's contacts for its groups: its chats (`chats`), and where they reach this phone (`place`). */
export function groupContacts(chats: () => Promise<E2E>, place: () => Promise<{ senderHex: string; relay: string; relayKey: string }>): GroupContacts {
  // The space's chats, while they are still those of the account `me`.
  const of = async (me: string) => {
    const e2e = await chats();
    if (toHex(e2e.identity) !== me) throw new Error(t('Another space is open now.'));
    return e2e;
  };
  const find = async (me: string, identity: string) => (await of(me)).contacts().find((c) => c.identity === identity);
  return {
    bundle: async (me) => toBase64Url((await of(me)).bundle),
    has: async (me, identity) => !!(await find(me, identity)),
    accepted: async (me, identity) => (await find(me, identity))?.request === false,
    blocked: async (me, identity) => (await of(me)).isBlocked(identity),
    async add(me, about, key) {
      const e2e = await of(me);
      // The key has to be the member's own, or the contact added, or changed, would be another.
      if (toHex(await bundleIdentity(fromBase64Url(key))) !== about.id) throw new Error('Not their key.');
      const known = e2e.contacts().find((c) => c.identity === about.id);
      if (known) {
        if (known.request) await e2e.acceptRequest(about.id);
        return;
      }
      const here = await place();
      // Where this phone is reached was read for the same space: else it would be another's queue.
      await of(me);
      // As a link is added in a chat: another relay is written to only with its key.
      if (!sameRelay(about.relay, here.relay) && !about.relayKey) throw new Error('No key for their relay.');
      const code = { senderHex: about.sender, relayUrl: about.relay, key, ...(about.relayKey ? { relayKey: about.relayKey } : {}) };
      await e2e.addContact(code, here.senderHex, { relay: here.relay, relayKey: here.relayKey });
      // The first packet waits in e2e.pending(), and goes with the chat's next look at the relay.
    },
  };
}
