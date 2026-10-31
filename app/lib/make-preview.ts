// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import { MAX_PREVIEW_IMAGE, type Preview } from './chat-parts';
import { toBase64, utf8Decode } from './crypto';
import { MAX_PAGE, pageInfo } from './link-preview';
import { readCapped } from './net-http';
import { streamingFetch } from './net-fetch';

// Making a link's preview on the sender's phone, as it sends (lib/link-preview.ts): the page is
// fetched from this phone, straight, so the site sees this phone's internet address and when, as
// it would from a browser, and nothing about who the message is for. It is asked to keep no
// cookies. Its picture is drawn anew, small, as a JPEG, so only the picture goes. The chat makes
// none in hidden chats, nor while the space goes through Tor, which carries only relay requests
// here. On a computer, make-preview.web.ts: none.

/** Whether this build makes previews: on the phone, yes. */
export const CAN_PREVIEW = true;

// How long a preview may take before the message goes without one, milliseconds.
const WAIT = 8000;
// The largest page or picture fetched, bytes, and how wide the picture's copy is drawn, points.
const MOST = 2 * 1024 * 1024;
const WIDE = 112;
const PAGES = ['text/html', 'application/xhtml+xml'];
const PICTURES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

// The answer at `url` when it is of one of `types` and not too large, or null.
async function get(url: string, signal: AbortSignal, types: string[]): Promise<{ response: Response; type: string } | null> {
  // Through the fetch that streams, so a page larger than MOST is stopped as it comes (readCapped).
  const response = await streamingFetch(url, { signal, credentials: 'omit', headers: { Accept: types.join(', ') } });
  const type = (response.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
  const size = Number(response.headers.get('content-length') ?? 0);
  if (!response.ok || !types.includes(type) || size > MOST) return null;
  return { response, type };
}

// The page's picture, drawn anew small, as base64 JPEG; none when it is not one or too large.
async function picture(src: string, signal: AbortSignal): Promise<string | undefined> {
  const got = await get(src, signal, PICTURES);
  if (!got) return undefined;
  const bytes = await readCapped(got.response, MOST);
  if (bytes.length === 0) return undefined;
  const image = await ImageManipulator.manipulate(`data:${got.type};base64,${toBase64(bytes)}`).resize({ width: WIDE }).renderAsync();
  const saved = await image.saveAsync({ compress: 0.5, format: SaveFormat.JPEG, base64: true });
  const file = new File(saved.uri);
  if (file.exists) file.delete();
  return saved.base64 && saved.base64.length <= MAX_PREVIEW_IMAGE ? saved.base64 : undefined;
}

/** The preview of the page at `url`, or null when it says nothing of itself or does not answer in time. */
export async function makePreview(url: string): Promise<Preview | null> {
  const stop = new AbortController();
  const timer = setTimeout(() => stop.abort(), WAIT);
  try {
    const page = await get(url, stop.signal, PAGES);
    if (!page) return null;
    const info = pageInfo(utf8Decode(await readCapped(page.response, MOST)).slice(0, MAX_PAGE), url);
    if (!info) return null;
    const image = info.picture ? await picture(info.picture, stop.signal).catch(() => undefined) : undefined;
    return { url, title: info.title, text: info.text, ...(image ? { image } : {}) };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
