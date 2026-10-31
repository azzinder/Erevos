// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { fitsSticker, MAX_STICKER, type FileMeta, type FileRef } from '../lock/attachment-files';
import { addOwnSticker, type OwnSticker, type StickerPlace } from '../lock/sticker-data';
import { FileMissingError, readFile } from './attachments';
import { t } from './i18n';
import { cleanJpeg, cleanPng, isJpeg, isPng, photoSize } from './photo';

// Stickers made from photos, besides the ones built in (lib/stickers.ts). One is made from a photo
// cut square and drawn anew, small (lib/pick-avatar.ts, pickSticker), with only its picture kept
// (lib/photo.ts), and is kept in the space, or the hidden place, it was made in
// (lock/sticker-data.ts). It goes as a photo goes, end-to-end encrypted through the relay's file
// store (lib/attachments.ts), marked as a sticker (lock/attachment-files.ts): an Erevos from this
// one on shows it as a sticker, with no bubble, and one from before as a photo. A sticker that came
// can be kept as one's own too. Nothing else goes anywhere for it. Self-contained on purpose, so it
// can run under plain Node for checks.

/** How wide and high a sticker made here is, in points. */
export const STICKER_SIDE = 512;

// The JPEG qualities a sticker is drawn at, from the best, until it is small enough.
const QUALITIES = [0.85, 0.75, 0.65, 0.55, 0.45];

export class NotStickerError extends Error {
  constructor() {
    super(t('This photo cannot be a sticker.'));
  }
}

/**
 * A photo as a sticker keeps it: a JPEG or PNG with only its picture (lib/photo.ts), small enough
 * to be one. Throws NotStickerError when it is not.
 */
export function stickerPhoto(bytes: Uint8Array): Uint8Array {
  let clean: Uint8Array;
  try {
    clean = isJpeg(bytes) ? cleanJpeg(bytes) : isPng(bytes) ? cleanPng(bytes) : new Uint8Array();
  } catch {
    throw new NotStickerError();
  }
  if (!photoSize(clean) || !fitsSticker({ kind: 'photo', mime: isPng(clean) ? 'image/png' : 'image/jpeg', size: clean.length })) throw new NotStickerError();
  return clean;
}

/** What a sticker says of itself as it goes: a photo, marked as a sticker. */
export function stickerMeta(picture: Uint8Array): Omit<FileMeta, 'size'> {
  const png = isPng(picture);
  return { name: png ? 'sticker.png' : 'sticker.jpg', mime: png ? 'image/png' : 'image/jpeg', kind: 'photo', sticker: true, ...photoSize(picture) };
}

/** A sticker's picture drawn at the best quality that is small enough (`draw` makes a JPEG at one). */
export async function fitSticker(draw: (quality: number) => Promise<Uint8Array>): Promise<Uint8Array> {
  for (const quality of QUALITIES) {
    const bytes = await draw(quality);
    if (bytes.length <= MAX_STICKER) return stickerPhoto(bytes);
  }
  throw new NotStickerError();
}

/** Keeps a sticker that came (a photo marked as one, here) as one of the place's own. */
export async function keepAsSticker(place: StickerPlace, file: FileRef): Promise<OwnSticker> {
  if (!file.sticker) throw new NotStickerError();
  const bytes = await readFile(file);
  if (!bytes) throw new FileMissingError();
  return addOwnSticker(place, stickerPhoto(bytes));
}
