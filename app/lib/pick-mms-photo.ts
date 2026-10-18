import { File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

// A photo for an MMS, from the phone's photos: drawn anew as a JPEG, so nothing besides its picture
// is kept, and made smaller until it fits what carriers take in one MMS. On a computer there is
// no SMS: pick-mms-photo.web.ts.

/** What most carriers take in one MMS, with room for the text and the message around it. */
export const MMS_MAX = 280 * 1024;

const STEPS = [
  { width: 1280, compress: 0.75 },
  { width: 1024, compress: 0.65 },
  { width: 800, compress: 0.55 },
  { width: 600, compress: 0.5 },
  { width: 400, compress: 0.45 },
];

export type MmsPhoto = { bytes: Uint8Array; mime: 'image/jpeg' };

/** The photo's bytes, or null if the owner went back. */
export async function pickMmsPhoto(): Promise<MmsPhoto | null> {
  const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1, exif: false, allowsEditing: false });
  const asset = picked.canceled ? null : picked.assets[0];
  if (!asset) return null;
  try {
    for (const step of STEPS) {
      const image = await ImageManipulator.manipulate(asset.uri)
        .resize(asset.width > asset.height ? { width: Math.min(step.width, asset.width || step.width) } : { height: Math.min(step.width, asset.height || step.width) })
        .renderAsync();
      const saved = await image.saveAsync({ compress: step.compress, format: SaveFormat.JPEG });
      const file = new File(saved.uri);
      try {
        const bytes = await file.bytes();
        if (bytes.length <= MMS_MAX) return { bytes, mime: 'image/jpeg' };
      } finally {
        if (file.exists) file.delete();
      }
    }
    throw new Error('This photo does not get small enough for an MMS.');
  } finally {
    const copy = new File(asset.uri);
    if (asset.uri.startsWith(Paths.cache.uri) && copy.exists) copy.delete();
  }
}
