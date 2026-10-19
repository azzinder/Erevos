import { PermissionsAndroid, Platform } from 'react-native';

import { device } from '../modules/erevos-device';
import { checkedPlace, type Place } from './chat-parts';
import { t } from './i18n';

// Where the phone is, once, to send as a place in a chat (lib/chat-parts.ts): on Android only, from
// the phone's own location (modules/erevos-device). Erevos asks for the location the first time a
// place is sent, and looks only when asked; nothing follows the phone after. A computer or the web
// app cannot send a place: their browsers would ask an outside service where they are.

/** Whether this build can send a place: an Android build with the module from this version. */
export const CAN_PLACE = Platform.OS === 'android' && typeof device?.findPlace === 'function';

export class PlaceError extends Error {}

/** Where the phone is now. Throws PlaceError, saying why, when it cannot be found. */
export async function findPlace(): Promise<Place> {
  const phone = device;
  if (!phone?.findPlace) throw new PlaceError(t('This build of Erevos cannot send a place.'));
  const asked = await PermissionsAndroid.requestMultiple(['android.permission.ACCESS_FINE_LOCATION', 'android.permission.ACCESS_COARSE_LOCATION']).catch(() => ({}));
  if (!Object.values(asked).includes(PermissionsAndroid.RESULTS.GRANTED)) {
    throw new PlaceError(t("Erevos may not use the phone's location. Allow it in the phone settings to send where you are."));
  }
  return new Promise<Place>((resolve, reject) => {
    const subscription = phone.addListener('onPlace', (event) => {
      subscription.remove();
      const place = checkedPlace({ lat: event.lat, lon: event.lon, ...(event.acc !== undefined && event.acc >= 0 ? { acc: event.acc } : {}) });
      if (place) resolve(place);
      else reject(new PlaceError(t('Where you are was not found in time. Try again outdoors, or in a while.')));
    });
    const started = phone.findPlace!();
    if (started) {
      subscription.remove();
      reject(
        new PlaceError(
          started === 'permission'
            ? t("Erevos may not use the phone's location. Allow it in the phone settings to send where you are.")
            : t("The phone's location is off. Turn it on to send where you are."),
        ),
      );
    }
  });
}
