// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import { MAX_PREVIEW_IMAGE, type Preview } from './chat-parts';
import { toBase64, utf8Decode } from './crypto';
import { MAX_PAGE, pageInfo, partsThroughTor } from './link-preview';
import { readCapped } from './net-http';
import { streamingFetch } from './net-fetch';

// Making a link's preview on the sender's phone, as it sends (lib/link-preview.ts): the page is
// fetched from this phone, straight, so the site sees this phone's internet address and when, as
// it would from a browser, and nothing about who the message is for. It is asked to keep no
// cookies. Its picture is drawn anew, small, as a JPEG, so only the picture goes. The chat makes
// none while the space sends everything through Tor (lib/link-preview.ts previewWay).
//
// With the previews' own Tor switch on (SpaceData.previewsTor, `tor`), the page and its picture are
// fetched only through Tor instead (partsThroughTor), whatever the space's Tor way, and never
// straight: the site does not see this phone's address. Tor may still be starting, so the message
// waits longer for it (TOR_WAIT), then goes without one. On a computer, make-preview.web.ts: none.

/** Whether this build makes previews: on the phone, yes. */
export const CAN_PREVIEW = true;

// How long a preview may take before the message goes without one, milliseconds: straight, and
// through Tor.
const WAIT = 8000;
const TOR_WAIT = 20_000;
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
  return drawn(await readCapped(got.response, MOST), got.type);
}

// A picture of `type`, drawn anew small, as base64 JPEG; none when it is empty or too large.
async function drawn(bytes: Uint8Array, type: string): Promise<string | undefined> {
  if (bytes.length === 0) return undefined;
  const image = await ImageManipulator.manipulate(`data:${type};base64,${toBase64(bytes)}`).resize({ width: WIDE }).renderAsync();
  const saved = await image.saveAsync({ compress: 0.5, format: SaveFormat.JPEG, base64: true });
  const file = new File(saved.uri);
  if (file.exists) file.delete();
  return saved.base64 && saved.base64.length <= MAX_PREVIEW_IMAGE ? saved.base64 : undefined;
}

/** The preview of the page at `url`, or null when it says nothing of itself or does not answer in time; with `tor`, fetched only through Tor. */
export async function makePreview(url: string, tor = false): Promise<Preview | null> {
  if (tor) return throughTor(url);
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

// The preview through Tor alone. A request through Tor cannot be stopped, so one that takes longer
// than TOR_WAIT is let go of, and the message goes without it.
async function throughTor(url: string): Promise<Preview | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const late = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), TOR_WAIT);
  });
  try {
    const parts = await Promise.race([partsThroughTor(url, MOST), late]);
    if (!parts) return null;
    const image = parts.picture ? await drawn(parts.picture.bytes, parts.picture.type).catch(() => undefined) : undefined;
    return { url, title: parts.title, text: parts.text, ...(image ? { image } : {}) };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
