// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import type { HiddenPlace } from '../lock/hidden';

// The hidden chats opened from the home screen's search (lock/hidden.ts searchHidden), held in
// memory only until the chat screen takes them, so their key never goes into a route's address.

let held: HiddenPlace | null = null;

export function handOverHidden(place: HiddenPlace): void {
  held = place;
}

/** The hidden chats handed over, once: taking them clears them. */
export function takeHidden(): HiddenPlace | null {
  const place = held;
  held = null;
  return place;
}
