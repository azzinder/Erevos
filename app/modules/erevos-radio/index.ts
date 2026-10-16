import { requireOptionalNativeModule, type EventSubscription } from 'expo-modules-core';

// Phone radio for Android: Wi-Fi Aware for data when both phones support it, BLE GATT
// for data otherwise, and BLE for presence.
// On other platforms every function is a no-op, so the app still bundles for web.

export type RadioStatus = {
  sdk: number;
  wifiAware: boolean;
  ble: boolean;
  running: boolean;
};

export type RadioEvents = {
  onStatus: (event: { text: string }) => void;
  onPeer: (event: { id: string; kind: 'wifi-aware' | 'ble-link' | 'ble' }) => void;
  onText: (event: { peer: string; text: string }) => void;
};

// Since Expo SDK 52 the native module object is itself the event emitter.
type NativeRadio = {
  status(): RadioStatus;
  start(): void;
  stop(): void;
  sendText(peer: string, text: string): boolean;
  addListener<Name extends keyof RadioEvents>(name: Name, listener: RadioEvents[Name]): EventSubscription;
};

const native = requireOptionalNativeModule<NativeRadio>('ErevosRadio');

export function radioStatus(): RadioStatus | null {
  return native ? native.status() : null;
}

export function startRadio(): void {
  native?.start();
}

export function stopRadio(): void {
  native?.stop();
}

/** Sends text to a link id from an `onPeer` event with kind `wifi-aware` or `ble-link`. */
export function sendText(peer: string, text: string): boolean {
  return native ? native.sendText(peer, text) : false;
}

export function onRadioEvent<Name extends keyof RadioEvents>(
  name: Name,
  listener: RadioEvents[Name],
): EventSubscription | null {
  return native ? native.addListener(name, listener) : null;
}
