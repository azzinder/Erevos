// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { MAX_STICKER } from '../lock/attachment-files';
import { bitmapOf } from './bitmap.web';
import { fitSticker, NotStickerError, STICKER_SIDE, stickerPhoto } from './own-stickers';

// A sticker or a photo that came in a chat, made one of the owner's own stickers, as
// sticker-from.ts, on a computer and in a browser: one that is a sticker already is kept as it is,
// with only its picture; any other is drawn anew by the page on a canvas, no larger than a sticker
// made here, as a PNG while that is small enough, else as a JPEG.

const MOST = 40 * 1000 * 1000;

async function encoded(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Uint8Array> {
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
  if (!blob) throw new NotStickerError();
  return new Uint8Array(await blob.arrayBuffer());
}

/** The picture's bytes as one of the owner's stickers. Throws NotStickerError when it cannot be one. */
export async function stickerFrom(bytes: Uint8Array): Promise<Uint8Array> {
  try {
    return stickerPhoto(bytes);
  } catch {
    // Not one yet: drawn anew below.
  }
  if (bytes.length === 0 || bytes.length > MOST || typeof document === 'undefined') throw new NotStickerError();
  let image: ImageBitmap;
  try {
    image = await bitmapOf(new Blob([bytes as BlobPart]));
  } catch {
    throw new NotStickerError();
  }
  try {
    const scale = Math.min(1, STICKER_SIDE / Math.max(1, image.width, image.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new NotStickerError();
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const png = await encoded(canvas, 'image/png');
    if (png.length <= MAX_STICKER) return stickerPhoto(png);
    return await fitSticker((quality) => encoded(canvas, 'image/jpeg', quality));
  } finally {
    image.close();
  }
}
