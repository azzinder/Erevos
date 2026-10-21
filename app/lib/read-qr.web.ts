import { t } from './i18n';
import { decodeQr, readSizes } from './qr-decode';

// A QR code read from a photo of it, as read-qr.ts, in the web app and on a computer: the photo is
// chosen from the device's files (an iPhone offers its camera there too) and read in the browser
// (lib/qr-decode.ts), at a few sizes in turn. It is not kept anywhere.

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

/** The QR code's text, '' when the photo has none, or null if the owner went back. */
export async function readQrPhoto(_from: 'photos' | 'camera'): Promise<string | null> {
  const file = await choose();
  if (!file) return null;
  let image: ImageBitmap;
  try {
    // With no options: a QR code reads at any turn, and older browsers refuse them
    // (lib/bitmap.web.ts).
    image = await createImageBitmap(file);
  } catch {
    throw new Error(t('The photo could not be read. Choose another one, or take it again.'));
  }
  const canvas = document.createElement('canvas');
  try {
    for (const { width, height } of readSizes(image.width, image.height)) {
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) break;
      context.imageSmoothingQuality = 'high';
      context.drawImage(image, 0, 0, width, height);
      const text = decodeQr(context.getImageData(0, 0, width, height).data, width, height);
      if (text !== null) return text;
    }
    return '';
  } finally {
    image.close();
    // An iPhone keeps a canvas's memory until it is made empty.
    canvas.width = 0;
    canvas.height = 0;
  }
}
