import jsQR from 'jsqr';

// A QR code read from a picture's pixels, for the web app (lib/read-qr.web.ts), where the phone's
// own reader (modules/erevos-contacts, with ZXing) is not there. Plain JavaScript, so the checks run
// it under Node too.

// The longest side a photo is read at, in turn: small first, where a screenshot reads quickly; then
// as near its own size as a browser's canvas takes, which a dense contact link photographed from
// a hand's length needs; then in between; and last small, for a code that fills the photo.
const SIDES = [1600, 4096, 2400, 800];
// An iPhone draws no canvas past 16,777,216 pixels.
const MAX_PIXELS = 16_000_000;

/** The sizes to read a `width` × `height` photo at, in turn: never larger than it is, each once. */
export function readSizes(width: number, height: number): { width: number; height: number }[] {
  const sizes: { width: number; height: number }[] = [];
  for (const side of SIDES) {
    const scale = Math.min(1, side / Math.max(width, height), Math.sqrt(MAX_PIXELS / (width * height)));
    const size = { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
    if (!sizes.some((other) => other.width === size.width)) sizes.push(size);
  }
  return sizes;
}

/** The text of the QR code in RGBA pixels, row by row, or null when there is none. Light on dark
 *  reads as well, as a dark screen shows it. */
export function decodeQr(pixels: Uint8ClampedArray, width: number, height: number): string | null {
  const found = jsQR(pixels, width, height, { inversionAttempts: 'attemptBoth' });
  return found ? found.data : null;
}

/** The bytes of the QR code in RGBA pixels as written (a Matrix check's code is bytes), or null when there is none. */
export function decodeQrBytes(pixels: Uint8ClampedArray, width: number, height: number): Uint8Array | null {
  const found = jsQR(pixels, width, height, { inversionAttempts: 'attemptBoth' });
  return found ? Uint8Array.from(found.binaryData) : null;
}
