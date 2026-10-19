import { PermissionsAndroid, Platform } from 'react-native';

import {
  hasDirect,
  hasMesh,
  meshConnect,
  meshDisconnect,
  meshScan,
  meshSend,
  onRadioEvent,
  sendText,
  setRadioQuiet,
  startDirect,
  startLan,
  startRadio,
  stopDirect,
  stopLan,
  stopRadio,
} from '../modules/erevos-radio';
import { fromBase64, toBase64 } from './crypto';
import { keepRadio, Lora, putBack, type RadioStore, type SavedRadio } from './lora';
import { SLOW_PREFIX } from './nearby';
import { secureDelete, secureGet, secureSet } from './secure';
import { SHELL, shellFetch } from './shell';

// The links to Erevos phones nearby that lib/nearby.ts sends over. On Android: the radio
// (Bluetooth, Wi-Fi Aware), the same Wi-Fi or a hotspot (modules/erevos-radio), a Wi-Fi of their
// own made with Wi-Fi Direct, linked as the same Wi-Fi is, and a Meshtastic LoRa radio when one is
// set (lib/lora.ts, app/lora.tsx). In the desktop app: the same Wi-Fi only,
// through the shell (desktop/lan.js), which tells what happens on /__lan as the page asks.
// Elsewhere there are none.

export type LinkKind = 'wifi-aware' | 'ble-link' | 'ble' | 'lan' | 'lora';

type Events = {
  onPeer: (event: { id: string; kind: LinkKind }) => void;
  onText: (event: { peer: string; text: string }) => void;
};

/** Whether this build has the phone's radio. */
export const HAS_RADIO = Platform.OS === 'android';
/** Whether this build has any link to phones nearby. */
export const HAS_LINKS = HAS_RADIO || SHELL === 'electron';

/** The phone's Meshtastic LoRa radio, off unless one is set (app/lora.tsx). */
export const lora = new Lora({ connect: meshConnect, disconnect: meshDisconnect, write: (bytes) => meshSend(toBase64(bytes)) });

export type { SavedRadio };

const LORA_KEY = 'erevos.lora';
const foundListeners = new Set<(radio: SavedRadio) => void>();

onRadioEvent('onMesh', (event) => {
  if (event.kind === 'data') lora.meshData(fromBase64(event.data));
  else if (event.kind === 'state') lora.meshState(event.state === 'refused' ? 'down' : event.state, event.detail, event.state !== 'refused');
  else foundListeners.forEach((listener) => listener({ address: event.address, name: event.name }));
});

/** Whether this build can link to a Meshtastic radio: an Android build with it in its radio. */
export function canLora(): boolean {
  return HAS_RADIO && hasMesh();
}

/** The radio set for LoRa, or null when LoRa is off. */
export async function savedRadio(): Promise<SavedRadio | null> {
  const value = JSON.parse((await secureGet(LORA_KEY)) ?? 'null') as Partial<SavedRadio> | null;
  if (typeof value?.address !== 'string') return null;
  const kept = typeof value.kept?.device === 'string' && typeof value.kept.position === 'string' ? { kept: value.kept } : {};
  return { address: value.address, name: typeof value.name === 'string' ? value.name : '', shares: value.shares === true, ...kept };
}

// The radio set, in the phone's secure store.
const store: RadioStore = {
  get: savedRadio,
  set: (radio) => secureSet(LORA_KEY, JSON.stringify(radio)),
};

/**
 * Sets the radio for LoRa and links to it, or with null turns LoRa off: then a radio linked gets
 * back the settings Erevos changed, first.
 */
export async function setRadio(radio: SavedRadio | null): Promise<void> {
  if (radio) {
    await secureSet(LORA_KEY, JSON.stringify(radio));
    lora.turnOn(radio.address);
    return;
  }
  const was = await savedRadio().catch(() => null);
  await secureDelete(LORA_KEY);
  if (was?.kept && putBack(lora, was.kept)) {
    // Its Bluetooth sends them before it lets go.
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }
  lora.turnOff();
}

/**
 * Lets the radio say its own name and where it is, as Meshtastic does, putting back its settings
 * from before; or keeps it quiet again.
 */
export async function setSharing(on: boolean): Promise<void> {
  const radio = await savedRadio();
  if (!radio) return;
  await store.set({ ...radio, shares: on });
  await keepRadio(lora, store);
}

// Each time the radio links, it is set as it should be: quiet, unless it shares.
lora.onLink(() => {
  keepRadio(lora, store).catch(() => {
    // Tried again the next time it links.
  });
});

/** Links to the radio set, if any, and not linked yet: LoRa stays on from then on while Erevos runs. */
export function resumeLora(): void {
  if (!canLora()) return;
  savedRadio()
    .then((radio) => {
      if (radio && lora.state().status === 'off') lora.turnOn(radio.address);
    })
    .catch(() => {
      // As if none was set.
    });
}

type Permissions = Parameters<typeof PermissionsAndroid.requestMultiple>[0];

/**
 * What the radios ask for on this phone: the location only up to Android 12, where Bluetooth needed
 * it (erevos-radio's manifest). From Android 13 the location is there for a place sent from a chat
 * (erevos-device), asked for then, and the radios must not ask for it.
 */
export function radioPermissions(permissions: Permissions): Permissions {
  if (Platform.OS === 'android' && Number(Platform.Version) <= 32) return permissions;
  return permissions.filter((permission) => permission !== 'android.permission.ACCESS_FINE_LOCATION');
}

const LORA_PERMISSIONS: Parameters<typeof PermissionsAndroid.requestMultiple>[0] = [
  'android.permission.BLUETOOTH_SCAN',
  'android.permission.BLUETOOTH_CONNECT',
  'android.permission.ACCESS_FINE_LOCATION',
];

/** Looks for Meshtastic radios for a few seconds, calling `listener` with each. Returns how to stop. */
export function findRadios(listener: (radio: SavedRadio) => void): () => void {
  foundListeners.add(listener);
  PermissionsAndroid.requestMultiple(radioPermissions(LORA_PERMISSIONS))
    .catch(() => undefined)
    .finally(() => {
      if (foundListeners.has(listener)) meshScan();
    });
  return () => {
    foundListeners.delete(listener);
  };
}

const RADIO_PERMISSIONS: Parameters<typeof PermissionsAndroid.requestMultiple>[0] = [
  'android.permission.NEARBY_WIFI_DEVICES',
  'android.permission.BLUETOOTH_SCAN',
  'android.permission.BLUETOOTH_ADVERTISE',
  'android.permission.BLUETOOTH_CONNECT',
  'android.permission.ACCESS_FINE_LOCATION',
  // Android 17 asks before an app reaches the local network; older ones do not know it.
  'android.permission.ACCESS_LOCAL_NETWORK' as (typeof RADIO_PERMISSIONS)[number],
];

type DeskEvent = { seq: number; kind: 'link' | 'gone' | 'text'; link: string; text?: string };

// The desktop app's side: the links up, the last event taken, and which start is current.
const desk = { after: 0, up: new Set<string>(), run: 0 };
const deskListeners = { onPeer: new Set<Events['onPeer']>(), onText: new Set<Events['onText']>() };

function deskEvent(event: DeskEvent) {
  desk.after = Math.max(desk.after, event.seq);
  if (event.kind === 'link') {
    desk.up.add(event.link);
    deskListeners.onPeer.forEach((listener) => listener({ id: event.link, kind: 'lan' }));
  } else if (event.kind === 'gone') {
    desk.up.delete(event.link);
  } else {
    deskListeners.onText.forEach((listener) => listener({ peer: event.link, text: event.text ?? '' }));
  }
}

// Takes what the shell tells, waiting for it, until another start or stop.
async function deskPoll(run: number) {
  while (desk.run === run) {
    try {
      const reply = await shellFetch(`/__lan?after=${desk.after}`);
      const { events } = (await reply.json()) as { events: DeskEvent[] };
      if (desk.run !== run) return;
      events.forEach(deskEvent);
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
}

async function deskLan(on: boolean) {
  const run = ++desk.run;
  desk.up.clear();
  const reply = await shellFetch(`/__lan?on=${on ? 1 : 0}`, { method: 'PUT' });
  if (!on || desk.run !== run) return;
  // Links up already, as after the page was opened again, come first.
  const { after, links } = (await reply.json()) as { after: number; links: string[] };
  desk.after = after;
  for (const link of links) deskEvent({ seq: after, kind: 'link', link });
  void deskPoll(run);
}

let lanOn = false;
// Whether the radio is wanted: it starts once Android has asked for its permissions. Wi-Fi Direct
// too, which needs the same Wi-Fi link on and the same permissions.
let started = false;
let asked = false;
let directWanted = false;
let directOn = false;

/** Whether this phone can make a Wi-Fi of its own with Erevos phones nearby (Wi-Fi Direct). */
export const CAN_DIRECT = HAS_RADIO && hasDirect();

/** Starts the links: the radio, with `lan` the same Wi-Fi, and with `direct` Wi-Fi Direct too. They stay until `stopLinks`. */
export function startLinks({ lan, direct }: { lan: boolean; direct: boolean }): void {
  directWanted = direct;
  setLanLinks(lan);
  if (!HAS_RADIO) return;
  resumeLora();
  started = true;
  PermissionsAndroid.requestMultiple(radioPermissions(RADIO_PERMISSIONS))
    .catch(() => undefined)
    .finally(() => {
      if (!started) return;
      asked = true;
      startRadio();
      followDirect();
    });
}

/** Looks on the same Wi-Fi or hotspot too, or no longer. */
export function setLanLinks(on: boolean): void {
  if (on === lanOn) return;
  lanOn = on;
  if (HAS_RADIO) {
    if (on) startLan();
    else stopLan();
    // Stopped with the same Wi-Fi, started again after it.
    directOn = false;
    followDirect();
  } else if (SHELL === 'electron') {
    deskLan(on).catch(() => undefined);
  }
}

/** Makes a Wi-Fi with Erevos phones that share none, while the same Wi-Fi link is on; or no longer. */
export function setDirectLinks(on: boolean): void {
  directWanted = on;
  followDirect();
}

function followDirect() {
  const on = CAN_DIRECT && started && asked && lanOn && directWanted;
  if (on === directOn) return;
  directOn = on;
  if (on) startDirect();
  else stopDirect();
}

export function stopLinks(): void {
  setLanLinks(false);
  if (HAS_RADIO && started) stopRadio();
  started = false;
  asked = false;
  followDirect();
}

/** Keeps the links quieter while Erevos is in the background, on Android: Bluetooth at low power, the same Wi-Fi said less often. */
export function setLinksQuiet(on: boolean): void {
  if (HAS_RADIO) setRadioQuiet(on);
}

/** Starts the radio again if the links want it, as after the radio test screen stopped it (app/radio.tsx). */
export function resumeRadio(): void {
  if (HAS_RADIO && started) startRadio();
}

/** Sends text on a link from an onPeer event. False when the link is not up. */
export function sendLink(link: string, text: string): boolean {
  if (link.startsWith(SLOW_PREFIX)) return lora.sendFrame(link, text);
  if (HAS_RADIO) return sendText(link, text);
  if (!desk.up.has(link)) return false;
  shellFetch(`/__lan?link=${encodeURIComponent(link)}`, { method: 'POST', body: text })
    .then((reply) => {
      if (reply.status === 404) desk.up.delete(link);
    })
    .catch(() => desk.up.delete(link));
  return true;
}

/** Calls `listener` with each event of this kind from the links. */
export function onLinkEvent<Name extends keyof Events>(name: Name, listener: Events[Name]): { remove(): void } {
  if (HAS_RADIO) {
    const subscription = onRadioEvent(name, listener as never);
    // The LoRa radio's link and what comes on it, with the others'.
    const stopLora =
      name === 'onPeer'
        ? lora.onLink((id) => (listener as Events['onPeer'])({ id, kind: 'lora' }))
        : lora.onText((peer, text) => (listener as Events['onText'])({ peer, text }));
    return {
      remove: () => {
        subscription?.remove();
        stopLora();
      },
    };
  }
  const listeners = deskListeners[name] as Set<Events[Name]>;
  listeners.add(listener);
  return { remove: () => listeners.delete(listener) };
}
