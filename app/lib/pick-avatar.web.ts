// A photo for a contact's picture, as pick-avatar.ts, on a computer: from the computer's files,
// cut square from its middle and drawn anew by the browser as a 256-point JPEG.

export const SIDE = 256;

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

export async function pickAvatar(_from: 'photos' | 'camera'): Promise<Uint8Array | null> {
  const file = await choose();
  if (!file) return null;
  const image = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const side = Math.min(image.width, image.height);
  const canvas = document.createElement('canvas');
  canvas.width = SIDE;
  canvas.height = SIDE;
  canvas.getContext('2d')!.drawImage(image, (image.width - side) / 2, (image.height - side) / 2, side, side, 0, 0, SIDE, SIDE);
  image.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
  if (!blob) throw new Error('The photo could not be read.');
  return new Uint8Array(await blob.arrayBuffer());
}
