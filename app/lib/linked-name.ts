// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { cleanName } from '../lock/e2e-data';

// The name an Erevos contact takes from a contact linked to it (lib/sealed-contacts.ts): the
// contact's own, kept as Erevos keeps names (lock/e2e-data.ts, cleanName), while the Erevos contact
// has none of its own, so the chat list, the chat, the search and the calls show who it is instead
// of "contact 1a2b3c4d". A name given in Erevos is never written over, and one the contact gets
// later is not followed: the chat keeps the one it took.

/**
 * The name an Erevos contact takes once a contact is linked to it: the contact's name, cleaned as
 * Erevos keeps names, while the Erevos contact has none of its own (`own`); '' to leave it as it is.
 */
export function linkedName(own: string, contact: { name: string }): string {
  return cleanName(own) ? '' : cleanName(contact.name);
}

/** What giveLinkedName needs of a chat (lib/e2e.ts, E2E): its contacts, and naming one. */
export type Namer = {
  contacts(): { identity: string; name: string; ownName?: string }[];
  rename(identity: string, name: string): Promise<void>;
};

/**
 * Gives the Erevos contact `identity` of `chats` the name of the contact linked to it, as
 * linkedName says. Returns the name given, or '' when it kept its own or is not there.
 */
export async function giveLinkedName(chats: Namer, identity: string, contact: { name: string }): Promise<string> {
  const kept = chats.contacts().find((c) => c.identity === identity);
  // Only a name this chat gave them is its own: the one they go by gives way to the linked contact's.
  const name = kept ? linkedName(kept.ownName ?? kept.name, contact) : '';
  if (name) await chats.rename(identity, name);
  return name;
}
