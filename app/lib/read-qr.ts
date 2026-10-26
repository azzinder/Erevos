import { File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';

import { t } from './i18n';
import { NoCameraError } from './pick-photo';
import { whilePicking } from './picking';
import { readQrCode } from '../modules/erevos-contacts';

// A QR code read from a photo of it, taken with the camera or picked from the phone's photos
// (app/contacts.tsx, app/chat.tsx, components/erevos-id.tsx): the photo is read on the phone (modules/erevos-contacts, with ZXing) and the
// picker's copy deleted at once; it is not kept anywhere.

/** The QR code's text, '' when the photo has none, or null if the owner went back. */
export async function readQrPhoto(from: 'photos' | 'camera'): Promise<string | null> {
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 1, exif: false, allowsEditing: false };
  let picked: ImagePicker.ImagePickerResult;
  if (from === 'camera') {
    const allowed = await ImagePicker.requestCameraPermissionsAsync();
    if (!allowed.granted) throw new NoCameraError();
    picked = await whilePicking(() => ImagePicker.launchCameraAsync(options));
  } else {
    picked = await whilePicking(() => ImagePicker.launchImageLibraryAsync(options));
  }
  const asset = picked.canceled ? null : picked.assets[0];
  if (!asset) return null;
  try {
    return (await readQrCode(asset.uri)) ?? '';
  } catch {
    // Not the phone's own words, which are for developers.
    throw new Error(t('The photo could not be read. Choose another one, or take it again.'));
  } finally {
    const copy = new File(asset.uri);
    if (asset.uri.startsWith(Paths.cache.uri) && copy.exists) copy.delete();
  }
}
