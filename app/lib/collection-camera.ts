// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { type PictureRef } from 'expo-camera';
import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import { addToCollection, type CollectionItem, type CollectionPlace } from '../lock/collection-data';
import { bytesSource } from './attachments';
import { keepVideoFile, stamped, thumbOf } from './collection-import';
import { photoSize } from './photo';

// What Erevos's own camera (components/erevos-camera.tsx) takes, into the Collection. A photo
// comes as a picture held in memory, never written by the camera: it is drawn anew as a JPEG,
// which holds nothing but its picture, read back from the cache file drawing leaves and that file
// deleted at once, then encrypted with a key of its own. A video is recorded by the camera into
// the app's cache and encrypted from there a piece at a time, that copy deleted at once.

/** Keeps a photo taken in memory (`pictureRef`) in the Collection, in `folder`: the new item. */
export async function keepPicture(place: CollectionPlace, folder: string, picture: PictureRef): Promise<CollectionItem> {
  let bytes: Uint8Array;
  try {
    const image = await ImageManipulator.manipulate(picture).renderAsync();
    const saved = await image.saveAsync({ compress: 0.95, format: SaveFormat.JPEG });
    const file = new File(saved.uri);
    try {
      bytes = await file.bytes();
    } finally {
      if (file.exists) file.delete();
    }
  } finally {
    picture.release();
  }
  const size = photoSize(bytes);
  const thumb = await thumbOf(bytes);
  return addToCollection(place, bytesSource(bytes), { name: stamped('photo.jpg'), mime: 'image/jpeg', kind: 'photo', w: size?.w, h: size?.h }, { folder, thumb });
}

/** Keeps a video the camera recorded into the app's cache (`uri`) in the Collection, in `folder`, and deletes that copy: the new item. */
export function keepRecording(place: CollectionPlace, folder: string, uri: string): Promise<CollectionItem> {
  return keepVideoFile(place, folder, uri, stamped('video.mp4', new Date(), 'VID', '.mp4'), 'video/mp4');
}
