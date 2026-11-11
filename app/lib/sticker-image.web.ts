// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { sizedSvg, stickerPng, type StickerPng } from './sticker-svg';

// A built-in sticker as a PNG on a computer (the web app, the desktop app and Sailfish OS's), for
// the networks that take a sticker only as a picture: its SVG (lib/sticker-svg.ts) drawn by the
// browser itself, through an image and a canvas, on a clear ground. Nothing is fetched. On the
// phone, lib/sticker-image.ts.

/** `svg` drawn `size` across as PNG bytes; null when the browser could not draw it. */
export async function rasterizeSvg(svg: string, size: number): Promise<Uint8Array | null> {
  const url = URL.createObjectURL(new Blob([sizedSvg(svg, size)], { type: 'image/svg+xml' }));
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('The sticker could not be drawn'));
      image.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d');
    if (!context) return null;
    context.drawImage(image, 0, 0, size, size);
    const png = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
    return png ? new Uint8Array(await png.arrayBuffer()) : null;
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * The built-in sticker `name` as a PNG `size` across, with a clear ground, kept in memory by name,
 * language and size; null for one with no picture (lib/sticker-svg.ts stickerSvg).
 */
export function stickerImage(name: string, size = 512): Promise<StickerPng | null> {
  return stickerPng(name, size, rasterizeSvg);
}

/** What the phone mounts to draw its stickers (lib/sticker-image.ts); a browser draws without it. */
export function StickerImageHost(): null {
  return null;
}
