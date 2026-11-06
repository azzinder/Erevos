// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import { addToCollection, MAX_COLLECTION_FILE, type CollectionItem, type CollectionPlace } from '../lock/collection-data';
import { cleanFileName, cleanMime, mimeOf, type FileRef } from '../lock/attachment-files';
import { bytesSource, readFile, refSource } from './attachments';
import { randomBytes, toHex } from './crypto';
import { NoCameraError, preparePhoto } from './pick-photo';
import { photoSize } from './photo';
import { pickSource } from './pick-file';
import { whilePicking } from './picking';
import { isSharedPhoto, readShared, type SharedFile } from './share-in';

// Bringing photos and files into the Collection (lock/collection-data.ts), on the phone: a photo
// taken with the camera, a file picked from the phone's files, a photo or file another app shared,
// and a photo or file of a chat. Each goes straight into the Collection, encrypted a piece at a
// time, with a small picture of a photo; the copies that Android or the picker leave in the app's
// cache are deleted as soon as they are read. On a computer nothing is brought in (collection-
// import.web.ts).

/** Whether this device can bring files into the Collection. */
export const CAN_COLLECT = true;

/** The side of a photo's small picture, its shorter side, in points. */
export const THUMB_SIDE = 256;
// Photos larger than this are kept without a small picture: drawing one would hold too much in memory.
const MOST_THUMBED = 40 * 1000 * 1000;

// What shows as a photo; anything else is a file.
const PHOTOS = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);

export type Progress = (done: number, count: number) => void;

/** Whether a file of this type is kept as a photo. */
export const isPhotoType = (mime: string) => PHOTOS.has(mime);

// The small JPEG of the photo at `uri`: its shorter side THUMB_SIDE points, drawn anew, so nothing
// the photo said besides its picture is in it.
async function thumbAt(uri: string, size: { w: number; h: number } | null): Promise<Uint8Array | undefined> {
  try {
    const resize = size && size.h > size.w ? { width: THUMB_SIDE } : size ? { height: THUMB_SIDE } : { width: THUMB_SIDE };
    const image = await ImageManipulator.manipulate(uri).resize(resize).renderAsync();
    const saved = await image.saveAsync({ compress: 0.7, format: SaveFormat.JPEG });
    const file = new File(saved.uri);
    try {
      return await file.bytes();
    } finally {
      if (file.exists) file.delete();
    }
  } catch {
    // The photo is kept without one; the grid shows a plain tile for it.
    return undefined;
  }
}

/** The small picture of a photo held in memory, or undefined when it cannot be drawn. */
export async function thumbOf(bytes: Uint8Array): Promise<Uint8Array | undefined> {
  if (bytes.length > MOST_THUMBED) return undefined;
  const copy = new File(Paths.cache, `erevos-thumb-${toHex(randomBytes(8))}`);
  try {
    copy.create();
    copy.write(bytes);
    return await thumbAt(copy.uri, photoSize(bytes));
  } finally {
    if (copy.exists) copy.delete();
  }
}

/** Takes a photo with the camera into the Collection, in `folder`, or returns null if the owner went back. */
export async function importFromCamera(place: CollectionPlace, folder: string, progress?: Progress): Promise<CollectionItem | null> {
  const allowed = await ImagePicker.requestCameraPermissionsAsync();
  if (!allowed.granted) throw new NoCameraError();
  const taken = await whilePicking(() => ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1, exif: false, allowsEditing: false }));
  const asset = taken.canceled ? null : taken.assets[0];
  if (!asset) return null;
  try {
    const photo = await preparePhoto(asset, 'original');
    const thumb = await thumbAt(asset.uri, photoSize(photo.bytes));
    return await addToCollection(place, bytesSource(photo.bytes), { name: stamped(photo.name), mime: photo.mime, kind: 'photo', w: photo.w, h: photo.h }, { folder, thumb, progress });
  } finally {
    // The copy the camera left in the cache goes as soon as it is encrypted, or fails to be.
    const copy = new File(asset.uri);
    if (asset.uri.startsWith(Paths.cache.uri) && copy.exists) copy.delete();
  }
}

// A name for what the camera made: the day and time, as phones name their photos.
function stamped(name: string, now = new Date()): string {
  const two = (n: number) => String(n).padStart(2, '0');
  const ending = name.includes('.') ? name.slice(name.lastIndexOf('.')) : '.jpg';
  return `IMG_${now.getFullYear()}${two(now.getMonth() + 1)}${two(now.getDate())}_${two(now.getHours())}${two(now.getMinutes())}${two(now.getSeconds())}${ending}`;
}

/** Picks a file from the phone's files into the Collection, in `folder`, or returns null if the owner went back. */
export async function importFromFiles(place: CollectionPlace, folder: string, progress?: Progress): Promise<CollectionItem | null> {
  const picked = await pickSource(MAX_COLLECTION_FILE);
  if (!picked) return null;
  try {
    const name = cleanFileName(picked.name);
    const said = cleanMime(picked.mime);
    const mime = said === 'application/octet-stream' ? mimeOf(name) : said;
    return await keepSource(place, folder, { name, mime, source: picked.source }, progress);
  } finally {
    picked.close();
  }
}

// A file read from `source`: a photo gets its small picture, read whole for the purpose.
async function keepSource(place: CollectionPlace, folder: string, file: { name: string; mime: string; source: { size: number; read(at: number, length: number): Promise<Uint8Array> }; w?: number; h?: number }, progress?: Progress): Promise<CollectionItem> {
  const photo = isPhotoType(file.mime);
  let thumb: Uint8Array | undefined;
  let size = file.w && file.h ? { w: file.w, h: file.h } : null;
  if (photo && file.source.size <= MOST_THUMBED) {
    const whole = await file.source.read(0, file.source.size);
    thumb = await thumbOf(whole);
    size = size ?? photoSize(whole);
  }
  return addToCollection(place, file.source, { name: file.name, mime: file.mime, kind: photo ? 'photo' : 'file', w: size?.w, h: size?.h }, { folder, thumb, progress });
}

/** Brings a photo or file another app shared into the Collection (lib/share-in.ts); its copy in the cache is deleted once read. */
export async function importShared(place: CollectionPlace, shared: SharedFile, folder: string, progress?: Progress): Promise<CollectionItem> {
  const read = await readShared(shared);
  try {
    // A shared photo comes ready as bytes (cleaned of what it said besides its picture).
    const photo = isSharedPhoto(shared);
    return await keepSource(place, folder, { name: read.name, mime: read.mime, source: read.source, w: photo ? read.w : undefined, h: photo ? read.h : undefined }, progress);
  } finally {
    read.close();
  }
}

/** Copies a photo or file of a chat into the Collection, as the same bytes, encrypted anew with a key of its own. */
export async function importFromChat(place: CollectionPlace, ref: FileRef, folder = '', progress?: Progress): Promise<CollectionItem> {
  const photo = ref.kind === 'photo';
  const thumb = photo && ref.size <= MOST_THUMBED ? await readFile(ref).then((bytes) => (bytes ? thumbOf(bytes) : undefined)) : undefined;
  return addToCollection(place, refSource(ref), { name: ref.name, mime: ref.mime, kind: ref.kind, w: ref.w, h: ref.h }, { folder, thumb, progress });
}
