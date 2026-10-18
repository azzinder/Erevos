import { nearby } from './nearby';
import { HAS_LINKS, onLinkEvent, sendLink, setLanLinks, startLinks, stopLinks } from './radio';
import { openNearby } from './receiver';
import { secureGet, secureSet } from './secure';

// The links to phones nearby while a space is open, whatever screen shows: the radio (Bluetooth,
// Wi-Fi Aware, and a LoRa radio when one is set) and the same Wi-Fi or hotspot (lib/radio.ts). So
// a message, a group's message or a call from a phone nearby comes on the home screen and in the
// group screens too, and while Erevos is in the background. The links belong to the phone, not to
// a space: what comes on them opens only in the chats of the space open (lib/receiver.ts), and the
// rest is kept a while for the others (lib/nearby.ts). Hidden chats never use them.

// Whether this phone carries messages from phones nearby to their relays, and whether it looks
// for Erevos on the same Wi-Fi: for the whole phone, on unless turned off.
const CARRY_KEY = 'erevos.carry';
const LAN_KEY = 'erevos.lan';

/** Keeps the links up until the function it gives is called: from when a space opens until it closes. */
export function startNearbyLinks(): () => void {
  if (!HAS_LINKS) return () => undefined;
  let active = true;
  const stopNearby = nearby.start(sendLink);
  const subscriptions = [
    onLinkEvent('onPeer', ({ id, kind }) => {
      if (kind !== 'ble') nearby.linkUp(id); // 'ble' is presence only, not a data link
    }),
    onLinkEvent('onText', ({ peer, text }) => {
      const packet = nearby.frameIn(peer, text);
      if (packet) void openNearby(peer, packet);
    }),
  ];
  void nearbySettings().then(({ carrying, lan }) => {
    if (!active) return;
    nearby.setCarrying(carrying);
    startLinks({ lan });
  });
  // What came nearby for this space while another was open.
  void (async () => {
    for (const packet of nearby.heldPackets()) await openNearby(null, packet);
  })();
  return () => {
    active = false;
    subscriptions.forEach((subscription) => subscription.remove());
    stopNearby();
    stopLinks();
  };
}

/** Whether this phone carries for others, and looks on the same Wi-Fi, as last set. */
export async function nearbySettings(): Promise<{ carrying: boolean; lan: boolean }> {
  const [carry, lan] = await Promise.all([secureGet(CARRY_KEY).catch(() => null), secureGet(LAN_KEY).catch(() => null)]);
  return { carrying: carry !== 'off', lan: lan !== 'off' };
}

/** Carries messages from phones nearby to their relays, or no longer. Throws when the phone could not keep it: it holds until Erevos closes. */
export async function setCarryingKept(on: boolean): Promise<void> {
  nearby.setCarrying(on);
  await secureSet(CARRY_KEY, on ? 'on' : 'off');
}

/** Looks for Erevos on the same Wi-Fi or hotspot too, or no longer. Throws as setCarryingKept. */
export async function setLanKept(on: boolean): Promise<void> {
  setLanLinks(on);
  await secureSet(LAN_KEY, on ? 'on' : 'off');
}
