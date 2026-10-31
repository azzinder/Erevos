// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { PermissionsAndroid, Platform } from 'react-native';

import { device } from '../modules/erevos-device';
import { checkedPlace, type Place } from './chat-parts';
import { t } from './i18n';

// Where the phone is, once, to send as a place in a chat (lib/chat-parts.ts): on Android only, from
// the phone's own location (modules/erevos-device), on every way it has at once, since the
// satellites alone find nothing indoors and the network alone is off on many phones without
// Google. Erevos asks for the location the first time a place is sent, and looks only when asked;
// nothing follows the phone after. A computer or the web app cannot send a place: their browsers
// would ask an outside service where they are.

/** Whether this build can send a place: an Android build with the module from this version. */
export const CAN_PLACE = Platform.OS === 'android' && typeof device?.findPlace === 'function';

/** Why no place was found, and what the owner can open to change that. */
export type Trouble = 'build' | 'permission' | 'approximate' | 'off' | 'timeout';

export class PlaceError extends Error {
  constructor(readonly trouble: Trouble) {
    super(troubleText(trouble));
  }
}

function troubleText(trouble: Trouble): string {
  switch (trouble) {
    case 'build':
      return t('This build of Erevos cannot send a place.');
    case 'permission':
      return t("Erevos may not use the phone's location. Allow it in the phone settings to send where you are.");
    case 'approximate':
      return t("Erevos may use only the approximate location, which this phone cannot find now. Allow the precise location in Erevos's App info to send where you are.");
    case 'off':
      return t("The phone's location is off. Turn it on to send where you are.");
    case 'timeout':
      return t('Where you are was not found in time. Try again outdoors, or in a while.');
  }
}

/** A place found, and how long before the phone found it, in seconds. */
export type Found = { place: Place; age: number };

// Ends the look going on, with nothing found; and counts the stops, so one asked for while
// Android's question about the location shows starts no look after it.
let stopLooking: (() => void) | null = null;
let stops = 0;

/**
 * Where the phone is now, or, when nothing came in time, where it was a few minutes ago, said
 * with its age. Throws PlaceError, saying why, when it cannot be found; null when stopPlace
 * stopped it.
 */
export async function findPlace(): Promise<Found | null> {
  stopPlace();
  const phone = device;
  if (!phone?.findPlace) throw new PlaceError('build');
  const before = stops;
  const asked = await PermissionsAndroid.requestMultiple(['android.permission.ACCESS_FINE_LOCATION', 'android.permission.ACCESS_COARSE_LOCATION']).catch(() => ({}));
  if (stops !== before) return null;
  if (!Object.values(asked).includes(PermissionsAndroid.RESULTS.GRANTED)) throw new PlaceError('permission');
  return new Promise<Found | null>((resolve, reject) => {
    const subscription = phone.addListener('onPlace', (event) => {
      done();
      const place = checkedPlace({ lat: event.lat, lon: event.lon, ...(event.acc !== undefined && event.acc >= 0 ? { acc: event.acc } : {}) });
      if (place) resolve({ place, age: Math.max(0, Math.round(event.age ?? 0)) });
      else reject(new PlaceError('timeout'));
    });
    const done = () => {
      subscription.remove();
      if (stopLooking === stop) stopLooking = null;
    };
    const stop = () => {
      done();
      phone.stopPlace?.();
      resolve(null);
    };
    stopLooking = stop;
    const started = phone.findPlace!();
    if (started) {
      done();
      reject(new PlaceError(started));
    }
  });
}

/** Stops looking for where the phone is: the one waiting for it gets null. */
export function stopPlace(): void {
  stops++;
  stopLooking?.();
}
