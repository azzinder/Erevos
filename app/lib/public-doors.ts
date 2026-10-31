// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import type { DoorPlace } from './public-groups';
import { createQueue, deleteQueue, fromHex, receiveMessage, sameRelay, sendMessage, toHex, type Relay } from './relay';
import { contactTarget } from './space-chats';

// Public groups' doors on relays (lib/public-groups.ts): a door is a queue on the owner's relay,
// made, read and deleted straight there, as the space's own queue is. A request to a link's door
// goes as a message to a contact on that relay does: through this phone's relay (or the second
// one), sealed for the door's relay when it is another, so it never sees this phone's address.

/** Where a space's relay is: `own` straight, `sends` as messages leave, and its key, base64url, for the link. */
export type DoorRelay = { own: Relay; sends: Relay; relayKey: string };

/** The doors on the relay `place` says, read when each is used. */
export function relayDoors(place: () => Promise<DoorRelay>): DoorPlace {
  // A door made on the relay before this one was set: reached there, without our token.
  const at = (own: Relay, url: string): Relay => (sameRelay(own.url, url) ? own : { url });
  return {
    async open() {
      const { own, relayKey } = await place();
      const queue = await createQueue(own);
      return { relay: own.url, relayKey, recipient: toHex(queue.recipientId), sender: toHex(queue.senderId) };
    },
    async close(door) {
      const { own } = await place();
      await deleteQueue(at(own, door.relay), fromHex(door.recipient));
    },
    async take(door) {
      const { own } = await place();
      return receiveMessage(at(own, door.relay), fromHex(door.recipient));
    },
    async knock(link, sealed) {
      const { sends } = await place();
      // Asking to join, which the owner's phone answers: no message (lib/relay.ts, Mark).
      await sendMessage(contactTarget(sends, link), fromHex(link.door), sealed, 'quiet');
    },
  };
}
