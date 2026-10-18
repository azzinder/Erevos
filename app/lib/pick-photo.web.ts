import { cleanJpeg, cleanPng, isJpeg, isPng, photoSize } from './photo';

// A photo to send, as pick-photo.ts, on a computer: from the computer's files, no camera. A new
// JPEG at 90% or 75% is drawn by the browser, turned upright.

export type PhotoQuality = 'original' | 90 | 75;

export type PickedPhoto = { name: string; mime: string; bytes: Uint8Array; w?: number; h?: number };

export const CAN_TAKE_PHOTOS = false;

export class NoCameraError extends Error {}

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

async function reencode(file: Blob, quality: number): Promise<PickedPhoto> {
  const image = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  canvas.getContext('2d')!.drawImage(image, 0, 0);
  image.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality / 100));
  if (!blob) throw new Error('The photo could not be read.');
  return { name: 'photo.jpg', mime: 'image/jpeg', bytes: new Uint8Array(await blob.arrayBuffer()), w: canvas.width, h: canvas.height };
}

export async function pickPhoto(_from: 'photos' | 'camera', quality: PhotoQuality): Promise<PickedPhoto | null> {
  const file = await choose();
  if (!file) return null;
  if (quality !== 'original') return reencode(file, quality);
  const bytes = new Uint8Array(await file.arrayBuffer());
  try {
    if (isJpeg(bytes)) return { name: 'photo.jpg', mime: 'image/jpeg', bytes: cleanJpeg(bytes), ...photoSize(bytes) };
    if (isPng(bytes)) return { name: 'photo.png', mime: 'image/png', bytes: cleanPng(bytes), ...photoSize(bytes) };
  } catch {
    // Not read: made anew below.
  }
  if (file.type === 'image/gif') return { name: 'photo.gif', mime: 'image/gif', bytes };
  return reencode(file, 100);
}
