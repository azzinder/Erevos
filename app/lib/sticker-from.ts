// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import { MAX_STICKER } from '../lock/attachment-files';
import { randomBytes, toHex } from './crypto';
import { fitSticker, NotStickerError, STICKER_SIDE, stickerPhoto } from './own-stickers';

// A sticker or a photo that came in a chat on Matrix, XMPP or Nostr, or in an MMS, made one of
// the owner's own stickers (lib/own-stickers.ts): one that is a sticker already, a small JPEG or
// PNG, is kept as it is, with only its picture; any other is drawn anew, no larger than a sticker
// made here (STICKER_SIDE points across its longer side, as it is shaped), as a PNG while that is
// small enough, so what shows through it still does, else as a JPEG. The copy written for the
// drawing, and the drawing's, are deleted once read. On a computer, sticker-from.web.ts.

// The largest picture drawn anew: more would hold too much in memory.
const MOST = 40 * 1000 * 1000;

/** The picture's bytes as one of the owner's stickers. Throws NotStickerError when it cannot be one. */
export async function stickerFrom(bytes: Uint8Array): Promise<Uint8Array> {
  try {
    return stickerPhoto(bytes);
  } catch {
    // Not one yet: drawn anew below.
  }
  if (bytes.length === 0 || bytes.length > MOST) throw new NotStickerError();
  const copy = new File(Paths.cache, `erevos-sticker-${toHex(randomBytes(8))}`);
  try {
    copy.create();
    copy.writeSync(bytes);
    const whole = await ImageManipulator.manipulate(copy.uri).renderAsync();
    const large = Math.max(whole.width, whole.height) > STICKER_SIDE;
    const image = large ? await ImageManipulator.manipulate(copy.uri).resize(whole.width >= whole.height ? { width: STICKER_SIDE } : { height: STICKER_SIDE }).renderAsync() : whole;
    const draw = async (format: SaveFormat, compress = 1) => {
      const saved = await image.saveAsync({ format, compress });
      const file = new File(saved.uri);
      try {
        return await file.bytes();
      } finally {
        if (file.exists) file.delete();
      }
    };
    const png = await draw(SaveFormat.PNG);
    if (png.length <= MAX_STICKER) return stickerPhoto(png);
    return await fitSticker((quality) => draw(SaveFormat.JPEG, quality));
  } catch (error) {
    throw error instanceof NotStickerError ? error : new NotStickerError();
  } finally {
    if (copy.exists) copy.delete();
  }
}
