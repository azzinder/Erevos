// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import type { E2E } from '../lib/e2e';
import { t } from '../lib/i18n';

import type { Archive } from './archive';
import type { History } from './history';

// Moving a chat from a space into its hidden chats: the contact, with its conversations, name,
// picture and look, and its messages go from the space's sealed data into the hidden chats', and
// the imported chats that went on with it go along, kept only in its chat there (moving back
// brings them back the same way). Afterwards nothing in the space names the contact. Their phone still writes to the space's relay queue until it hears from the hidden
// chats' queue (app/chat.tsx tells it at once). What the hidden chats say them of when their queue
// was made (`qa`) is later than what the space said them last, whichever moved more lately, so
// their phone takes it, and a late copy of what the space sent never takes them back (lib/e2e.ts
// saidAge). The contact keeps the space's identity key as the one they know this chat by, so the
// safety number stays the same.

const PREFIX = 'contact:';

export async function moveChat(identity: string, from: { e2e: E2E; history: History; archive: Archive | null }, to: { e2e: E2E; history: History; archive?: Archive | null }): Promise<void> {
  const contact = from.e2e.record(identity);
  if (!contact) throw new Error(t('No such contact.'));
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
