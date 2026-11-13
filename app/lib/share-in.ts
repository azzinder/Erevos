// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { File, FileMode, Paths } from 'expo-file-system';

import { cleanFileName, cleanMime, mimeOf, type FileRef } from '../lock/attachment-files';
import { collectionNative, type SealedRef } from '../modules/erevos-collection';
import { bytesSource, eachPiece, refSource, type Source } from './attachments';
import { fromBase64, randomBytes, toHex } from './crypto';
import { loadPhotoQuality } from './photo-quality';
import { preparePhoto } from './pick-photo';

// What another app shares with Erevos from its Share, on Android (modules/erevos-collection,
// ShareActivity.kt): words or a link, or one photo or file. Erevos opens on Send to
// (app/share.tsx) once a space is open, and the chat, group or SMS conversation picked there takes
// the words into its message field, to read and send there; a photo or file goes as soon as that
// chat or group opens, as one picked there would, or into the Collection. Android lets Erevos read
// a shared photo or file only while it asks, so it comes already encrypted into the Collection's
// chunks there, with a key of its own held in Android's memory only (SharedIn.kt), and the link
// says only its id (`sealed`): only the one waiting there is taken here, so a link from elsewhere
// cannot have Erevos send a file of its own. Nothing of it lies plain on the disk: the Collection
// takes the chunks as they are (lib/collection-import.ts importShared); a chat reads the file
// from them as it sends it, but a photo, made ready from a plain copy in the cache deleted as soon
// as it is read, as every photo sent is. The chunks go once sent, when Send to is left without a
// pick, or with the next share. What is handed to the next screen is held in memory only, for a
// minute at most. On a computer nothing is shared in (share-in.web.ts).

/**
 * A photo or file shared, encrypted as it came (`sealed`, with a photo's small picture, `thumb`);
 * a plain copy in Erevos's cache (`file`, its name there), as of a photo of the Collection sent to
 * a chat; or a file of the Collection sent to a chat (`held`), read from its encrypted chunks as it
 * goes, with no copy; with a photo's size when it is known (`w`, `h`; in the desktop app,
 * share-in.web.ts).
 */
export type SharedFile = { file: string; name: string; mime: string; held?: Source; sealed?: SealedRef; thumb?: Uint8Array; w?: number; h?: number };

/** A shared photo or file read to send: close it once sent, and its copy goes. */
export type SharedSource = { name: string; mime: string; source: Source; w?: number; h?: number; close(): void };

// As lib/collection-out.ts names its copies.
const COPY = /^erevos-shared-[0-9a-f]{16}$/;
// A file's id, as Sealer.kt makes it.
const SEALED = /^[0-9a-f]{32}$/;
// What goes as a photo, as one picked from the phone's photos does; anything else as a file.
const PHOTOS = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif']);
const FRESH = 60_000;

/** Whether `file` is a name a plain copy to send is given. */
export const isSharedCopy = (file: string) => COPY.test(file);

/**
 * The photo or file a share link names, by its `sealed` id (or a copy's name, `file`), `name` and
 * `mime`: null for one ShareActivity did not make, or that is gone.
 */
export function sharedFileOf(params: { file?: string; sealed?: string; name?: string; mime?: string }): SharedFile | null {
  const name = cleanFileName(params.name || 'file');
  const said = cleanMime(params.mime ?? '');
  const mime = said === 'application/octet-stream' ? mimeOf(name) : said;
  const id = params.sealed ?? '';
  if (SEALED.test(id)) {
    const waiting = collectionNative?.sharedFile?.(id) ?? null;
    if (!waiting || waiting.id !== id) return null;
    const { key, chunk, count, size, w, h, thumb } = waiting;
    return { file: '', name, mime, sealed: { id, key, chunk, count, size }, ...(thumb ? { thumb: fromBase64(thumb) } : {}), ...(w > 0 && h > 0 ? { w, h } : {}) };
  }
  const file = params.file ?? '';
  if (!isSharedCopy(file) || !new File(Paths.cache, file).exists) return null;
  return { file, name, mime };
}

// The shared file as its chunks are read.
const sealedFile = (shared: SharedFile & { sealed: SealedRef }): FileRef => ({ name: shared.name, mime: shared.mime, kind: 'file', ...shared.sealed });

/** Whether it goes as a photo. */
export function isSharedPhoto(shared: SharedFile): boolean {
  return PHOTOS.has(shared.mime);
}

/** Deletes the copy of a shared photo or file, or its chunks. */
export function dropShared(shared: SharedFile): void {
  if (shared.held) return;
  if (shared.sealed) {
    try {
      collectionNative?.sharedDrop?.(shared.sealed.id);
    } catch {
      // The next share deletes them.
    }
    return;
  }
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
  if (shared.held) return { name: shared.name, mime: shared.mime, source: shared.held, w: shared.w, h: shared.h, close: () => undefined };
  if (shared.sealed) return readSealed({ ...shared, sealed: shared.sealed });
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
    return handle.readBytesSync(length);
  };
  const close = () => {
    handle.close();
    dropShared(shared);
  };
  return { name: shared.name, mime: shared.mime, source: { size: copy.size, read }, close };
}

// A shared file, encrypted as it came: a file read from its chunks as it is sent; a photo made
// ready from a plain copy, deleted as soon as it is read, as a photo of the Collection is sent.
async function readSealed(shared: SharedFile & { sealed: SealedRef }): Promise<SharedSource> {
  const ref = sealedFile(shared);
  if (!isSharedPhoto(shared)) return { name: shared.name, mime: shared.mime, source: refSource(ref), close: () => dropShared(shared) };
  const copy = new File(Paths.cache, `erevos-shared-${toHex(randomBytes(8))}`);
  try {
    copy.create();
    const handle = copy.open(FileMode.Truncate);
    try {
      await eachPiece(ref, (piece) => handle.writeBytesSync(piece));
    } finally {
      handle.close();
    }
    const quality = await loadPhotoQuality().catch(() => 'original' as const);
    const photo = await preparePhoto({ uri: copy.uri, mimeType: shared.mime, width: 0, height: 0 }, quality);
    return { name: photo.name, mime: photo.mime, source: bytesSource(photo.bytes), w: photo.w, h: photo.h, close: () => undefined };
  } finally {
    if (copy.exists) copy.delete();
    dropShared(shared);
  }
}
