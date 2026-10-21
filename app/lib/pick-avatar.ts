import { File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import { fitSticker, STICKER_SIDE } from './own-stickers';
import { NoCameraError } from './pick-photo';

// A photo for a contact's picture, from the phone's photos or its camera: cut square by the owner,
// made 256 points wide and drawn anew as a JPEG, so nothing the photo said besides its picture
// (a place, a phone) is kept. A wallpaper's is drawn anew the same way, at most 1080 points wide,
// and a sticker's (lib/own-stickers.ts) cut square too, 512 points, at the best quality that keeps
// it small enough. The picker's copy and ours are deleted once read. On a computer, pick-avatar.web.ts.

export const SIDE = 256;
export const WALL = 1080;

/** The photo's bytes, `side` points square (a phone contact's is larger), or null if the owner went back. */
export function pickAvatar(from: 'photos' | 'camera', side = SIDE): Promise<Uint8Array | null> {
  return pick(from, true, side);
}

/** A wallpaper's photo, from the phone's photos, or null if the owner went back. */
export function pickWallpaper(): Promise<Uint8Array | null> {
  return pick('photos', false, WALL);
}

/** A sticker's photo, from the phone's photos, or null if the owner went back. Throws NotStickerError if it cannot be one. */
export function pickSticker(): Promise<Uint8Array | null> {
  return pick('photos', true, STICKER_SIDE, true);
}

async function pick(from: 'photos' | 'camera', square: boolean, side: number, sticker = false): Promise<Uint8Array | null> {
  const options: ImagePicker.ImagePickerOptions = square
    ? { mediaTypes: ['images'], quality: 1, exif: false, allowsEditing: true, aspect: [1, 1] }
    : { mediaTypes: ['images'], quality: 1, exif: false, allowsEditing: false };
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
    const width = square ? side : Math.min(side, asset.width || side);
    const image = await ImageManipulator.manipulate(asset.uri).resize(square ? { width, height: width } : { width }).renderAsync();
    const draw = async (compress: number) => {
      const saved = await image.saveAsync({ compress, format: SaveFormat.JPEG });
      const file = new File(saved.uri);
      try {
        return await file.bytes();
      } finally {
        if (file.exists) file.delete();
      }
    };
    return sticker ? await fitSticker(draw) : await draw(square ? 0.85 : 0.8);
  } finally {
    const copy = new File(asset.uri);
    if (asset.uri.startsWith(Paths.cache.uri) && copy.exists) copy.delete();
  }
}
