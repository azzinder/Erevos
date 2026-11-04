// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { mutedNow } from '../lock/chat-notify';
import { doorSeen, onDoorsCame, openDoors } from '../lock/doors';
import { currentSpace } from '../lock/keys';
import { loadHiddenData } from '../lock/space-data';
import { onHiddenPlaceChange, openHiddenPlace } from './hidden-contacts';
import { buildInbox } from './inbox';
import { onPlaceNetworkMessage } from './network-notices';
import { placeChats, placeChatsNow } from './place-chats';
import { onPlaceGroupMessage, placeGroupsNow } from './place-groups';
import { onPlaceMessage, onPlacesChange, receivingPlaces } from './place-receiver';

// The small dots on the home screen (app/app/index.tsx) that say messages came unread where its
// chats do not show them, never how many or where, each only where it was asked for (SpaceData.sign):
// on the search of the chats, for a hidden place that receives while closed (lib/place-receiver.ts),
// while one of its chats or groups has a message unread, or one of its own Matrix, XMPP or Nostr
// chats had one since it was last open; on the lock, for another space whose door is open
// (lock/doors.ts), once a message came to it while closed (lib/closed-notices.ts), until it opens.
// Whoever sees the open space's chats sees the dots too, and may guess there is more on the phone.

// The places, by `space.pocket`, whose own accounts on other networks had a message since they were last open: kept in memory only.
const networkCame = new Set<string>();
const at = (space: number, pocket: number) => `${space}.${pocket}`;

/** Whether a hidden place of the open space that asked for the dot has a message unread. */
export async function hiddenSign(now = Date.now()): Promise<boolean> {
  for (const { space, pocket, key } of receivingPlaces()) {
    const data = await loadHiddenData(space, pocket, key).catch(() => null);
    if (!data?.sign) continue;
    if (networkCame.has(at(space, pocket))) return true;
    const chats = placeChatsNow(space, pocket) ?? (await placeChats(space, pocket, key).catch(() => null));
    if (chats && buildInbox(chats.e2e.contacts(), chats.history.messages(), [], now).some((row) => !row.muted && row.unread > 0)) return true;
    if (placeGroupsNow(space, pocket)?.list().some((group) => !mutedNow(group.notify, now) && group.unread > 0)) return true;
  }
  return false;
}

/** Whether another space that asked for the dot had a message while closed. What came to the open one is read here, so its own is forgotten. */
export async function spacesSign(): Promise<boolean> {
  const { space } = currentSpace();
  await doorSeen(space).catch(() => undefined);
  return (await openDoors(space)).some(({ door }) => door.sign && door.came);
}

const listeners = new Set<() => void>();
const changed = () => listeners.forEach((listener) => listener());
let following = false;

// What came on the places' own accounts is heard from the first time a dot is asked after, whatever screen shows then.
function follow() {
  if (following) return;
  following = true;
  onPlaceNetworkMessage((space, pocket) => {
    networkCame.add(at(space, pocket));
    changed();
  });
  // A place opened: what came on its own accounts is read there.
  onHiddenPlaceChange(() => {
    const open = openHiddenPlace();
    if (open && networkCame.delete(at(open.space, open.pocket))) changed();
  });
}

/** Calls `listener` each time a dot may have come or gone. Returns how to stop. */
export function onSignsChange(listener: () => void): () => void {
  follow();
  listeners.add(listener);
  const stops = [onPlaceMessage(listener), onPlaceGroupMessage(listener), onPlacesChange(listener), onDoorsCame(listener)];
  return () => {
    listeners.delete(listener);
    stops.forEach((stop) => stop());
  };
}

/** Forgets what came on the places' own accounts, as the space closes. */
export function forgetSigns(): void {
  networkCame.clear();
}
