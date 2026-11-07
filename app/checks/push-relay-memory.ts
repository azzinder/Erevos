// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// The relays as lib/web-push.web.ts sees them in checks/web-push.check.ts: the push address each
// holds for each queue, and every address each was ever given, for any queue and for each, in memory.
import { toHex, type PushKeys, type Relay } from '../lib/relay';

export { fromHex, isPushExpired, isQueueNotFound, relayHome, toHex } from '../lib/relay';

export type Held = { key: Uint8Array; queues: Map<string, string>; ever: Set<string>; everFor: Map<string, Set<string>> };

/** Each relay by its address. */
export const relays = new Map<string, Held>();

export function relayAt(url: string): Held {
  let held = relays.get(url);
  if (!held) relays.set(url, (held = { key: new Uint8Array(65).fill(relays.size + 1), queues: new Map(), ever: new Set(), everFor: new Map() }));
  return held;
}

export async function pushKey(relay: Relay): Promise<Uint8Array> {
  return relayAt(relay.url).key;
}

export async function setPush(relay: Relay, recipientId: Uint8Array, endpoint: string, _keys?: PushKeys): Promise<boolean> {
  const held = relayAt(relay.url);
  if (endpoint) {
    const queue = toHex(recipientId);
    held.queues.set(queue, endpoint);
    held.ever.add(endpoint);
    held.everFor.set(queue, (held.everFor.get(queue) ?? new Set()).add(endpoint));
  } else held.queues.delete(toHex(recipientId));
  return true;
}

export async function setPushes(relay: Relay, recipientIds: Uint8Array[], endpoint: string, keys?: PushKeys): Promise<(Error | null)[]> {
  for (const id of recipientIds) await setPush(relay, id, endpoint, keys);
  return recipientIds.map(() => null);
}
