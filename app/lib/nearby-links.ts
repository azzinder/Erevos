import { AppState } from 'react-native';

import { currentSpace } from '../lock/keys';
import { loadBatteryMode, onBatteryMode } from './battery-mode';
import { othersCarried, ownCarried } from './carried-store';
import { nearby } from './nearby';
import { HAS_LINKS, onLinkEvent, SAMSUNG, sendLink, setAwareLinks, setDirectLinks, setLanLinks, setLinksQuiet, startLinks, stopLinks } from './radio';
import { nearbyChanged, openNearby } from './receiver';
import { secureGet, secureSet } from './secure';

// The links to phones nearby while a space is open, whatever screen shows: the radio (Bluetooth,
// Wi-Fi Aware, and a LoRa radio when one is set) and the same Wi-Fi or hotspot (lib/radio.ts). So
// a message, a group's message or a call from a phone nearby comes on the home screen and in the
// group screens too, and while Erevos is in the background, and what waits for a contact goes
// once their phone is near. The links belong to the phone, not to
// a space: what comes on them opens only in the chats of the space open (lib/receiver.ts), and the
// rest is tried in the open hidden chats, or kept a while for the others (lib/place-nearby.ts). What the phone
// carries for relays stays when Erevos closes (lib/carried-store.ts): what it carries for others
// from when the first space opens, and the open space's own while it is. While Erevos is in the
// background the links are kept quieter, to spare the battery (setLinksQuiet), and with a battery mode that asks for it, off (lib/battery-mode.ts).

// Whether this phone carries messages from phones nearby to their relays, whether it looks for
// Erevos on the same Wi-Fi, whether it makes one with Wi-Fi Direct, and whether it looks with
// Wi-Fi Aware: for the whole phone, on unless turned off. On a Samsung phone Wi-Fi Direct and
// Wi-Fi Aware are off unless turned on, as Samsung asks to turn off its own sharing for them.
const CARRY_KEY = 'erevos.carry';
const LAN_KEY = 'erevos.lan';
const DIRECT_KEY = 'erevos.direct';
const AWARE_KEY = 'erevos.aware';

let othersKept = false;

/** Keeps the links up until the function it gives is called: from when a space opens until it closes. */
export function startNearbyLinks(): () => void {
  if (!HAS_LINKS) return () => undefined;
  let active = true;
  const { space, key } = currentSpace();
  const stopOwn = nearby.keepOwnIn(ownCarried(space, key));
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
  // A contact heard nearby, or a LoRa radio linked: what waits for them may go now (lib/waiting.ts).
  const stopWatching = nearby.onChange(nearbyChanged);
  setLinksQuiet(AppState.currentState !== 'active');
  // With the battery mode Also nearby (or more), the radios are off while Erevos is in the
  // background (lib/battery-mode.ts), and start again as it shows.
  let paused = false;
  const follow = async () => {
    const want = (await loadBatteryMode()) !== 'normal' && AppState.currentState !== 'active';
    if (!active || want === paused) return;
    paused = want;
    if (want) {
      stopLinks();
      return;
    }
    const { lan, direct, aware } = await nearbySettings();
    if (active && !paused) startLinks({ lan, direct, aware });
  };
  const quiet = AppState.addEventListener('change', (state) => {
    setLinksQuiet(state !== 'active');
    void follow();
  });
  const stopBattery = onBatteryMode(() => void follow());
  void nearbySettings().then(async ({ carrying, lan, direct, aware }) => {
    if (!active) return;
    nearby.setCarrying(carrying);
    if (!othersKept) {
      othersKept = true;
      void nearby.keepOthersIn(othersCarried());
    }
    // Opened in the background (a call, say) with the radios to be off: they stay off.
    paused = (await loadBatteryMode()) !== 'normal' && AppState.currentState !== 'active';
    if (active && !paused) startLinks({ lan, direct, aware });
  });
  // What came nearby for this space while another was open.
  void (async () => {
    for (const packet of nearby.heldPackets()) await openNearby(null, packet);
  })();
  return () => {
    active = false;
    subscriptions.forEach((subscription) => subscription.remove());
    stopWatching();
    quiet.remove();
    stopBattery();
    setLinksQuiet(false);
    stopNearby();
    stopLinks();
    stopOwn();
  };
}

/** Whether this phone carries for others, looks on the same Wi-Fi, makes one with Wi-Fi Direct, and looks with Wi-Fi Aware, as last set. */
export async function nearbySettings(): Promise<{ carrying: boolean; lan: boolean; direct: boolean; aware: boolean }> {
  const [carry, lan, direct, aware] = await Promise.all([CARRY_KEY, LAN_KEY, DIRECT_KEY, AWARE_KEY].map((key) => secureGet(key).catch(() => null)));
  // Carrying for others is off unless turned on: a stranger nearby must not have this phone send
  // what they give it through its relay.
  return { carrying: carry === 'on', lan: lan !== 'off', direct: SAMSUNG ? direct === 'on' : direct !== 'off', aware: SAMSUNG ? aware === 'on' : aware !== 'off' };
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

/** Looks for Erevos phones nearby with Wi-Fi Aware too, or no longer. Throws as setCarryingKept. */
export async function setAwareKept(on: boolean): Promise<void> {
  setAwareLinks(on);
  await secureSet(AWARE_KEY, on ? 'on' : 'off');
}

/** Makes a Wi-Fi with Erevos phones nearby that share none (Wi-Fi Direct), or no longer. Throws as setCarryingKept. */
export async function setDirectKept(on: boolean): Promise<void> {
  setDirectLinks(on);
  await secureSet(DIRECT_KEY, on ? 'on' : 'off');
}
