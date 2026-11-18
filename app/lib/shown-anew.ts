// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import type { Message } from './chat-screen';

/**
 * The chat's messages with the history read whole again (`whole`), as once a look at the relay
 * that was under way as the chat opened ended: in place of those shown as it held them before
 * (`was`, their ids) and of any shown since that it holds too, by contact and tag; the rest, as
 * the radio brought them or as they are sent, after.
 */
export function shownAnew(whole: Message[], list: Message[], was: Set<number>): Message[] {
  const held = new Set(whole.filter((m) => m.tag).map((m) => `${m.peer}\n${m.tag}`));
  return [...whole, ...list.filter((m) => !was.has(m.id) && !(m.tag && held.has(`${m.peer}\n${m.tag}`)))];
}
