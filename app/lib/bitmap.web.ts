// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// A picture the owner chose, as a bitmap to draw (lib/pick-photo.web.ts, lib/pick-avatar.web.ts,
// lib/read-qr.web.ts).

/** The picture as a bitmap, turned upright. Older browsers (the Sailfish OS app's Gecko 91, an
 *  older Safari) refuse the option, and take it with their own default, which is upright too in
 *  Gecko 91. */
export async function bitmapOf(file: Blob): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch (error) {
    if (!(error instanceof TypeError)) throw error;
    return createImageBitmap(file);
  }
}
