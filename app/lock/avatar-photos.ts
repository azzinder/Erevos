import { decryptBytes, encryptBytes, fromHex, randomBytes, toHex } from '../lib/crypto';
import { deleteFile, readBytes, writeBytes } from '../lib/files';

// The photo given to a contact as their picture, chosen as a wallpaper or made a sticker, in its own
// file in the app's folder, sealed with a key of its own, as voice messages are
// (lock/voice-clips.ts). The key and the file's name are kept only in the contact
// (lock/e2e-data.ts), the look (theme/look.ts) or the stickers (lock/sticker-data.ts), themselves
// sealed in their space: without them the file is noise, and its name tells nothing. Changing a
// contact's picture, or forgetting the contact, deletes it, as deleting a sticker deletes its own.
// A wallpaper's stays while a look may still name it (a chat's look starts as a copy of the space's).

/** Where a contact's photo is: its file's id and key, hex. */
export type PhotoRef = { id: string; key: string };

export const PREFIX = 'erevos-avatar-';
const ID = /^[0-9a-f]{32}$/;
const KEY = /^[0-9a-f]{64}$/;

export function isPhotoRef(value: unknown): value is PhotoRef {
  const v = value as Partial<PhotoRef> | null;
  return typeof v?.id === 'string' && ID.test(v.id) && typeof v.key === 'string' && KEY.test(v.key);
}

/** Seals a photo in a new file. */
export async function savePhoto(bytes: Uint8Array): Promise<PhotoRef> {
  const key = randomBytes(32);
  const id = toHex(randomBytes(16));
  await writeBytes(PREFIX + id, encryptBytes(key, bytes));
  return { id, key: toHex(key) };
}

/** The photo, or null when its file is gone. Throws if the file was changed. */
export async function loadPhoto(ref: PhotoRef): Promise<Uint8Array | null> {
  const sealed = await readBytes(PREFIX + ref.id);
  return sealed ? decryptBytes(fromHex(ref.key), sealed) : null;
}

export async function deletePhoto(id: string): Promise<void> {
  if (ID.test(id)) await deleteFile(PREFIX + id);
}
