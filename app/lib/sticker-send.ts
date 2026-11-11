// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { t } from './i18n';
import type { StickerPng } from './sticker-svg';
import { GONE_SETS, stickerOf } from './stickers';

// A built-in sticker (lib/stickers.ts) picked in a chat on another network, which takes a sticker
// only as a picture: Matrix (an m.sticker), XMPP and Nostr (a photo) and SMS (a picture in an
// MMS). Its picture is made on the device itself (lib/sticker-image.ts stickerImage, and its .web
// twin on a computer), at rest, on a clear ground, its words in the app's language, and it goes
// with the words it stands for, for an app that shows them instead. Nothing is fetched. The chats'
// sheets (components/matrix-stickers.tsx, xmpp-stickers.tsx, nostr-stickers.tsx) and the SMS
// screen (app/sms.tsx) send what this gives; when it gives nothing, nothing is sent. Plain
// TypeScript, so the checks run it under Node.

/** A built-in sticker ready to go as a picture: a PNG, how large, and its words in the app's language. */
export type StickerToSend = StickerPng & { label: string };

/** How large a built-in sticker's picture is, across, and the smaller ones tried when it must fit fewer bytes. */
export const SEND_SIDES = [512, 384, 256] as const;

/** What draws a built-in sticker as a PNG this large: lib/sticker-image.ts stickerImage. */
export type DrawSticker = (name: string, size: number) => Promise<StickerPng | null>;

/**
 * The built-in sticker `name` as a picture to send, drawn by `draw`: 512 across, or smaller when
 * that is more than `most` bytes (an MMS). Its label is its words in the app's language, as the
 * screen says them to those who cannot see it. Null, and nothing drawn, for a name this Erevos does
 * not have or one of a set gone from the picker; null too when no picture could be made, or none
 * small enough.
 */
export async function stickerToSend(name: string, draw: DrawSticker, most = Infinity): Promise<StickerToSend | null> {
  const sticker = stickerOf(name);
  if (!sticker || GONE_SETS.includes(sticker.set)) return null;
  const label = t(sticker.label).replace(/\s+/g, ' ').trim() || t('Sticker');
  for (const side of SEND_SIDES) {
    let png: StickerPng | null;
    try {
      png = await draw(name, side);
    } catch {
      png = null;
    }
    if (!png || png.mime !== 'image/png' || png.bytes.length === 0 || !(png.w > 0 && png.h > 0)) return null;
    if (png.bytes.length <= most) return { bytes: png.bytes, mime: png.mime, w: png.w, h: png.h, label };
  }
  return null;
}
