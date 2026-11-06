// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { File, FileMode, Paths } from 'expo-file-system';

import { cleanFileName, cleanMime, mimeOf } from '../lock/attachment-files';
import { bytesSource, type Source } from './attachments';
import { loadPhotoQuality } from './photo-quality';
import { preparePhoto } from './pick-photo';

// What another app shares with Erevos from its Share, on Android (modules/erevos-device,
// ShareActivity.kt): words or a link, or one photo or file. Erevos opens on Send to
// (app/share.tsx) once a space is open, and the chat, group or SMS conversation picked there takes
// the words into its message field, to read and send there; a photo or file goes as soon as that
// chat or group opens, as one picked there would. Android lets Erevos read a shared photo or file
// only while it asks, so it comes copied into Erevos's cache, under a name made at random there,
// which the link says: only such a name is taken here, so a link from elsewhere cannot have Erevos
// send a file of its own. The copy goes once sent, when Send to is left without a pick, or with
// the next share. What is handed to the next screen is held in memory only, for a minute at most.
// On a computer nothing is shared in (share-in.web.ts).

/** A photo or file shared, as its copy in Erevos's cache (`file`, its name there). */
export type SharedFile = { file: string; name: string; mime: string };

/** A shared photo or file read to send: close it once sent, and its copy goes. */
export type SharedSource = { name: string; mime: string; source: Source; w?: number; h?: number; close(): void };

// As ShareActivity.kt names its copies.
const COPY = /^erevos-shared-[0-9a-f]{16}$/;
// What goes as a photo, as one picked from the phone's photos does; anything else as a file.
const PHOTOS = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif']);
const FRESH = 60_000;

/** Whether `file` is a name ShareActivity gives its copies. */
export const isSharedCopy = (file: string) => COPY.test(file);

/** The photo or file a share link names, by its `file`, `name` and `mime`: null for a name ShareActivity did not make, or a copy gone. */
export function sharedFileOf(params: { file?: string; name?: string; mime?: string }): SharedFile | null {
  const file = params.file ?? '';
  if (!isSharedCopy(file) || !new File(Paths.cache, file).exists) return null;
  const name = cleanFileName(params.name || 'file');
  const said = cleanMime(params.mime ?? '');
  return { file, name, mime: said === 'application/octet-stream' ? mimeOf(name) : said };
}

/** Whether it goes as a photo. */
export function isSharedPhoto(shared: SharedFile): boolean {
  return PHOTOS.has(shared.mime);
}

/** Deletes the copy of a shared photo or file. */
export function dropShared(shared: SharedFile): void {
  try {
    const copy = new File(Paths.cache, shared.file);
    if (copy.exists) copy.delete();
  } catch {
    // The next share clears it.
  }
}

let handed: { to: string; shared: SharedFile[]; until: number } | null = null;

/**
 * Hands a shared photo or file to the screen of `to` about to open: `contact:` and a contact's identity, or `group:` and a group's id.
 * Several (as when files of the Collection are sent) are taken one after another.
 */
export function handShared(to: string, shared: SharedFile | SharedFile[], now = Date.now()): void {
  handed = { to, shared: Array.isArray(shared) ? [...shared] : [shared], until: now + FRESH };
}

/** The next photo or file handed to `to`, once each: it is let go as it is read, so it goes only once. */
export function takeShared(to: string, now = Date.now()): SharedFile | null {
  const kept = handed;
  if (!kept || kept.to !== to) return null;
  if (kept.until <= now) {
    handed = null;
    kept.shared.forEach(dropShared);
    return null;
  }
  const next = kept.shared.shift() ?? null;
  if (kept.shared.length === 0) handed = null;
  return next;
}

/** Reads a shared photo, made ready at the photo quality chosen (lib/photo-quality.ts), or a file as it is, a piece at a time. */
export async function readShared(shared: SharedFile): Promise<SharedSource> {
  const copy = new File(Paths.cache, shared.file);
  if (isSharedPhoto(shared)) {
    const quality = await loadPhotoQuality().catch(() => 'original' as const);
    try {
      const photo = await preparePhoto({ uri: copy.uri, mimeType: shared.mime, width: 0, height: 0 }, quality);
      return { name: photo.name, mime: photo.mime, source: bytesSource(photo.bytes), w: photo.w, h: photo.h, close: () => undefined };
    } finally {
      dropShared(shared);
    }
  }
  let handle: ReturnType<File['open']>;
  try {
    handle = copy.open(FileMode.ReadOnly);
  } catch (error) {
    dropShared(shared);
    throw error;
  }
  const read = async (at: number, length: number) => {
    if (handle.offset !== at) handle.offset = at;
    return handle.readBytes(length);
  };
  const close = () => {
    handle.close();
    dropShared(shared);
  };
  return { name: shared.name, mime: shared.mime, source: { size: copy.size, read }, close };
}
