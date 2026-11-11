// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';

import { cleanVideo, videoNamed } from './message-carry';
import { TooLargeError } from './pick-file';
import { whilePicking } from './picking';

// A video from the phone's gallery to send in a chat of Matrix, XMPP or Nostr: as it was filmed,
// without what its file says besides its picture and sound (lib/message-carry.ts cleanVideo), named
// by its kind only. The picker hands over a copy in the app's cache; it is deleted once read. On a
// computer, pick-video.web.ts.

export type PickedVideo = { name: string; mime: string; bytes: Uint8Array; w?: number; h?: number; ms?: number };

/** Picks a video from the phone's gallery, or null if the owner went back. Throws TooLargeError above `most` bytes. */
export async function pickVideo(most: number): Promise<PickedVideo | null> {
  const picked = await whilePicking(() => ImagePicker.launchImageLibraryAsync({ mediaTypes: ['videos'], quality: 1, exif: false, allowsEditing: false }));
  const asset = picked.canceled ? null : picked.assets[0];
  if (!asset) return null;
  const copy = new File(asset.uri);
  try {
    if ((asset.fileSize ?? 0) > most) throw new TooLargeError();
    const bytes = await copy.bytes();
    if (bytes.length > most) throw new TooLargeError();
    const ms = asset.duration && asset.duration > 0 ? Math.round(asset.duration) : undefined;
    return { ...videoNamed(asset.mimeType ?? ''), bytes: cleanVideo(bytes), ...(asset.width && asset.height ? { w: asset.width, h: asset.height } : {}), ...(ms ? { ms } : {}) };
  } finally {
    // The copy the picker left in the cache.
    if (asset.uri.startsWith(Paths.cache.uri) && copy.exists) copy.delete();
  }
}
