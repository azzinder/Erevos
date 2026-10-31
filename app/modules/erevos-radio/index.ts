// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { requireOptionalNativeModule, type EventSubscription } from 'expo-modules-core';
import { Platform } from 'react-native';

// Phone radio for Android: Wi-Fi Aware for data when both phones support it, BLE GATT
// for data otherwise, and BLE for presence. Apart from the radio, links to Erevos phones and
// computers on the same Wi-Fi or hotspot (startLan, the protocol of desktop/lan.js), on a Wi-Fi
// made with Wi-Fi Direct (startDirect), and to a Meshtastic LoRa radio over Bluetooth
// (meshConnect; lib/lora.ts speaks to it).
// On other platforms every function is a no-op, so the app still bundles for web.

export type RadioStatus = {
  sdk: number;
  wifiAware: boolean;
  ble: boolean;
  running: boolean;
  lan?: boolean;
  direct?: boolean;
};

export type RadioEvents = {
  onStatus: (event: { text: string }) => void;
  onPeer: (event: { id: string; kind: 'wifi-aware' | 'ble-link' | 'ble' | 'lan' }) => void;
  onText: (event: { peer: string; text: string }) => void;
  onMesh: (event: MeshEvent) => void;
};

/** What the Meshtastic radio's Bluetooth link says: a radio found, how the link is, or a FromRadio (base64). */
export type MeshEvent =
  | { kind: 'found'; address: string; name: string }
  | { kind: 'state'; state: 'connecting' | 'up' | 'down' | 'refused'; detail: string }
  | { kind: 'data'; data: string };

// Since Expo SDK 52 the native module object is itself the event emitter.
type NativeRadio = {
  status(): RadioStatus;
  start(aware?: boolean): void;
  stop(): void;
  startLan?(): void;
  stopLan?(): void;
  setQuiet?(on: boolean): void;
  startDirect?(): boolean;
  stopDirect?(): void;
  meshScan?(): void;
  meshConnect?(address: string): void;
  meshDisconnect?(): void;
  meshSend?(data: string): boolean;
  sendText(peer: string, text: string): boolean;
  addListener<Name extends keyof RadioEvents>(name: Name, listener: RadioEvents[Name]): EventSubscription;
};

const native = requireOptionalNativeModule<NativeRadio>('ErevosRadio');

export function radioStatus(): RadioStatus | null {
  return native ? native.status() : null;
}

/** Starts Bluetooth, and with `aware` Wi-Fi Aware too; started already, it starts again as asked. */
export function startRadio(aware = true): void {
  native?.start(aware);
}

export function stopRadio(): void {
  native?.stop();
}

/** Looks for Erevos on the same Wi-Fi or hotspot, and links to them (kind `lan`), until `stopLan`. */
export function startLan(): void {
  native?.startLan?.();
}

export function stopLan(): void {
  native?.stopLan?.();
}

/** Whether this build can make a Wi-Fi of its own with Erevos phones nearby (Wi-Fi Direct, Android 10 and later). */
export function hasDirect(): boolean {
  return !!native?.startDirect && Platform.OS === 'android' && Number(Platform.Version) >= 29;
}

/** Wi-Fi Direct with Erevos phones that share no Wi-Fi, linked then as on the same Wi-Fi: after `startLan`, until `stopDirect` or `stopLan`. */
export function startDirect(): void {
  native?.startDirect?.();
}

export function stopDirect(): void {
  native?.stopDirect?.();
}

/** Bluetooth at low power, found with the screen off too, and the same Wi-Fi said less often, as while Erevos is in the background; or as before. */
export function setRadioQuiet(on: boolean): void {
  native?.setQuiet?.(on);
}

/** Whether this build can link to a Meshtastic radio. */
export function hasMesh(): boolean {
  return !!native?.meshConnect;
}

/** Looks for Meshtastic radios for a few seconds: each found comes once, as an `onMesh` event. */
export function meshScan(): void {
  native?.meshScan?.();
}

/** Links to the Meshtastic radio at this Bluetooth address, pairing first if need be. */
export function meshConnect(address: string): void {
  native?.meshConnect?.(address);
}

export function meshDisconnect(): void {
  native?.meshDisconnect?.();
}

/** Writes a ToRadio (base64) to the radio. False when it is not linked. */
export function meshSend(data: string): boolean {
  return native?.meshSend?.(data) ?? false;
}

/** Sends text to a link id from an `onPeer` event with kind `wifi-aware`, `ble-link` or `lan`. */
export function sendText(peer: string, text: string): boolean {
  return native ? native.sendText(peer, text) : false;
}

export function onRadioEvent<Name extends keyof RadioEvents>(
  name: Name,
  listener: RadioEvents[Name],
): EventSubscription | null {
  return native ? native.addListener(name, listener) : null;
}
