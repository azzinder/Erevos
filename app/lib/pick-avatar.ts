import { File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import { NoCameraError } from './pick-photo';

// A photo for a contact's picture, from the phone's photos or its camera: cut square by the owner,
// made 256 points wide and drawn anew as a JPEG, so nothing the photo said besides its picture
// (a place, a phone) is kept. The picker's copy and ours are deleted once read. On a computer,
// pick-avatar.web.ts.

export const SIDE = 256;

/** The photo's bytes, or null if the owner went back. */
export async function pickAvatar(from: 'photos' | 'camera'): Promise<Uint8Array | null> {
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 1, exif: false, allowsEditing: true, aspect: [1, 1] };
  let picked: ImagePicker.ImagePickerResult;
  if (from === 'camera') {
    const allowed = await ImagePicker.requestCameraPermissionsAsync();
    if (!allowed.granted) throw new NoCameraError();
    picked = await ImagePicker.launchCameraAsync(options);
  } else {
    picked = await ImagePicker.launchImageLibraryAsync(options);
  }
  const asset = picked.canceled ? null : picked.assets[0];
  if (!asset) return null;
  try {
    const image = await ImageManipulator.manipulate(asset.uri).resize({ width: SIDE, height: SIDE }).renderAsync();
    const saved = await image.saveAsync({ compress: 0.85, format: SaveFormat.JPEG });
    const file = new File(saved.uri);
    try {
      return await file.bytes();
    } finally {
      if (file.exists) file.delete();
    }
  } finally {
    const copy = new File(asset.uri);
    if (asset.uri.startsWith(Paths.cache.uri) && copy.exists) copy.delete();
  }
}
