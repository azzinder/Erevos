// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { bitmapOf } from './bitmap.web';
import { t } from './i18n';
import { fitSticker, STICKER_SIDE } from './own-stickers';
// A photo for a contact's picture, as pick-avatar.ts, on a computer: from the computer's files,
// cut square from its middle and drawn anew by the browser as a 256-point JPEG; a wallpaper's at
// most 1080 points wide; a sticker's 512 points, small enough to be one.

export const SIDE = 256;
export const WALL = 1080;

async function jpeg(canvas: HTMLCanvasElement, quality: number): Promise<Uint8Array> {
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
  if (!blob) throw new Error(t('The photo could not be read.'));
  return new Uint8Array(await blob.arrayBuffer());
}

export async function pickWallpaper(): Promise<Uint8Array | null> {
  const file = await choose();
  if (!file) return null;
  const image = await bitmapOf(file);
  const scale = Math.min(1, WALL / image.width);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(image.width * scale);
  canvas.height = Math.round(image.height * scale);
  canvas.getContext('2d')!.drawImage(image, 0, 0, canvas.width, canvas.height);
  image.close();
  return jpeg(canvas, 0.8);
}

function choose(): Promise<globalThis.File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.oncancel = () => resolve(null);
    input.click();
  });
}

// The middle of the photo, cut square and drawn `size` points wide.
async function squareOf(file: Blob, size: number): Promise<HTMLCanvasElement> {
  const image = await bitmapOf(file);
  const side = Math.min(image.width, image.height);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  canvas.getContext('2d')!.drawImage(image, (image.width - side) / 2, (image.height - side) / 2, side, side, 0, 0, size, size);
  image.close();
  return canvas;
}

export async function pickAvatar(_from: 'photos' | 'camera', size = SIDE): Promise<Uint8Array | null> {
  const file = await choose();
  return file ? jpeg(await squareOf(file, size), 0.85) : null;
}

export async function pickSticker(): Promise<Uint8Array | null> {
  const file = await choose();
  if (!file) return null;
  const canvas = await squareOf(file, STICKER_SIDE);
  return fitSticker((quality) => jpeg(canvas, quality));
}
