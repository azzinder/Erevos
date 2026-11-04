// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import type { E2E } from '../lib/e2e';
import { t } from '../lib/i18n';

import type { Archive } from './archive';
import type { History } from './history';

// Moving a chat from a space into its hidden chats, back, or into another space: the contact, with
// its conversations, name, picture and look, and its messages go from one's sealed data into the
// other's, and the imported chats that went on with it go along, kept only in its chat there
// (moving back brings them back the same way). Afterwards nothing where it was names the contact.
// Their phone still writes to the old relay queue until it hears from the new one (app/chat.tsx
// tells it at once). What the new chats say them of when their queue was made (`qa`) is later than
// what the old ones said them last, whichever moved more lately, so their phone takes it, and a
// late copy of what the old ones sent never takes them back (lib/e2e.ts saidAge). The contact
// keeps the identity key they know this chat by, so the safety number stays the same.

const PREFIX = 'contact:';

/**
 * Throws when the chats `to` already have a chat of their own with this contact, as two spaces can
 * each have one: moving would put this one in its place, and the other's messages and keys would be
 * lost. A chat that a move cut short left there is this same one, known by the same identity, and
 * goes on moving.
 */
export function checkMove(identity: string, from: E2E, to: E2E): void {
  const contact = from.record(identity);
  if (!contact) throw new Error(t('No such contact.'));
  const there = to.record(identity);
  if (there && (there.ownIdentity || to.identityHex()) !== (contact.ownIdentity || from.identityHex())) {
    throw new Error(t('They have a chat of their own there already: this one stays here.'));
  }
}

export async function moveChat(identity: string, from: { e2e: E2E; history: History; archive: Archive | null }, to: { e2e: E2E; history: History; archive?: Archive | null }): Promise<void> {
  checkMove(identity, from.e2e, to.e2e);
  const contact = from.e2e.record(identity)!;
  const peer = PREFIX + identity;
  // Put in first and taken out after: a move cut short leaves the chat in both, never in neither.
  await to.e2e.putIn({ ...contact, ownIdentity: contact.ownIdentity || from.e2e.identityHex() }, from.e2e.saidTo(identity));
  await to.history.putIn(from.history.messages().filter((m) => m.peer === peer));
  await from.archive?.reload();
  const imported = (from.archive?.linkedChats(identity) ?? []).map((chat) => chat.id);
  if (to.archive && imported.length > 0) {
    const going = imported.map((id) => from.archive?.chat(id)).filter((chat) => chat !== undefined);
    await to.archive.putIn(going.map((chat) => ({ ...chat, contact: identity, inChat: true as const })));
  }
  await from.history.takeOut(peer);
  await from.e2e.takeOut(identity);
  if (!from.archive || imported.length === 0) return;
  // With nowhere to go, they stay, going on with no one.
  if (to.archive) await from.archive.takeOut(imported);
  else for (const id of imported) await from.archive.link(id, '');
}
