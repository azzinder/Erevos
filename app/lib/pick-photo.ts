import { File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import { cleanJpeg, cleanPng, isJpeg, isPng, photoSize } from './photo';
import { t } from './i18n';

// A photo to send, from the phone's photos or its camera, at the quality chosen: the original,
// with only what it says besides its picture taken out (lib/photo.ts), or a new JPEG at 90% or
// 75%. The picker hands over a copy in the app's cache; it is deleted once read. A photo taken
// here is not kept in the phone's photos. On a computer, pick-photo.web.ts.

/** How a photo goes: as it was, or made smaller at 90% or 75% JPEG quality. */
export type PhotoQuality = 'original' | 90 | 75;

export type PickedPhoto = { name: string; mime: string; bytes: Uint8Array; w?: number; h?: number };

export const CAN_TAKE_PHOTOS = true;

export class NoCameraError extends Error {
  constructor() {
    super(t('Erevos may not use the camera. Allow it in the phone settings to take photos.'));
  }
}

// A new JPEG of the photo at `uri`, turned upright: for 90% and 75%, and for kinds lib/photo.ts
// cannot clean, at 100%.
async function reencode(uri: string, quality: number): Promise<PickedPhoto> {
  const image = await ImageManipulator.manipulate(uri).renderAsync();
  const saved = await image.saveAsync({ compress: quality / 100, format: SaveFormat.JPEG });
  const file = new File(saved.uri);
  try {
    return { name: 'photo.jpg', mime: 'image/jpeg', bytes: await file.bytes(), w: saved.width, h: saved.height };
  } finally {
    if (file.exists) file.delete();
  }
}

/** The photo at `uri` (as the picker gives one, or as another app shared it, lib/share-in.ts), made ready to send at `quality`. */
export async function preparePhoto(asset: Pick<ImagePicker.ImagePickerAsset, 'uri' | 'mimeType' | 'width' | 'height'>, quality: PhotoQuality): Promise<PickedPhoto> {
  if (quality !== 'original') return reencode(asset.uri, quality);
  const bytes = await new File(asset.uri).bytes();
  try {
    if (isJpeg(bytes)) return { name: 'photo.jpg', mime: 'image/jpeg', bytes: cleanJpeg(bytes), ...photoSize(bytes) };
    if (isPng(bytes)) return { name: 'photo.png', mime: 'image/png', bytes: cleanPng(bytes), ...photoSize(bytes) };
  } catch {
    // Not read: made anew below.
  }
  // GIF has nowhere to keep a place or a phone, and may move: it goes as it is.
  if (asset.mimeType === 'image/gif') return { name: 'photo.gif', mime: 'image/gif', bytes, w: asset.width, h: asset.height };
  return reencode(asset.uri, 100);
}

/** Picks a photo from the phone's photos or takes one, or null if the owner went back. */
export async function pickPhoto(from: 'photos' | 'camera', quality: PhotoQuality): Promise<PickedPhoto | null> {
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 1, exif: false, allowsEditing: false };
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
    return await preparePhoto(asset, quality);
  } finally {
    // The copy the picker left in the cache.
    const copy = new File(asset.uri);
    if (asset.uri.startsWith(Paths.cache.uri) && copy.exists) copy.delete();
  }
}
