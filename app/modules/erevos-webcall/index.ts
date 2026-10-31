// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { requireOptionalNativeModule, type EventSubscription } from 'expo-modules-core';

export type WebCallEvents = {
  /** A message of the Widget API from Element Call, as JSON. */
  onMessage: (event: { message: string }) => void;
  /** Element Call asks the sound to go another way: "earpiece" or "speaker". */
  onAudioDevice: (event: { id: string }) => void;
  /** Its window went away without Erevos closing it: the call is over. */
  onClosed: () => void;
};

type WebCall = {
  /** Opens Element Call at `url`, its page in the app (ELEMENT_CALL_PAGE), with the ways the sound can
   *  go (JSON, as Element Call's controls take them) and the one it goes now. False if it could not. */
  open(url: string, devices: string, chosen: string): boolean;
  /** Hands it a message of the Widget API, as JSON. */
  post(message: string): void;
  /** Tells it again where the sound can go, and goes. */
  devices(devices: string, chosen: string): void;
  close(): void;
  addListener<Name extends keyof WebCallEvents>(name: Name, listener: WebCallEvents[Name]): EventSubscription;
};

// Element Call's window, for Matrix calls on Android (lib/element-call-window.ts). Null in a build
// made before it, and on other platforms.
export const webCall = requireOptionalNativeModule<WebCall>('ErevosWebCall');

/** Element Call's page, served from the app's assets at an address that never goes on the network. */
export const ELEMENT_CALL_PAGE = 'https://appassets.androidplatform.net/element-call/index.html';
