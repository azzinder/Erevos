// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { splitLinks } from './links';

// What the public feed (components/public-feed.tsx) shows of a post besides its words: the photos
// it carries, as Amethyst or Damus show them inside the post, and the first other link, which
// shows as a card with the page's title and picture. A Nostr post names its photos by their
// addresses, in its words and in its imeta tags (NIP-92), with their size and words for those who
// cannot see them; a Matrix message carries its own photo, fetched from the homeserver
// (lib/matrix-store.ts), which is not this. Here, what is read from a post, kept pure; fetching is
// lib/public-fetch.ts.

/** How photos and link cards of the public feed are fetched (SpaceData.publicImages): at once, as
 *  the space's Tor way says; only through Tor, else on a tap; or only on a tap. */
export type PublicImages = 'always' | 'tor' | 'tap';

export const PUBLIC_IMAGES: readonly PublicImages[] = ['always', 'tor', 'tap'];

/** One photo of a post: where it is, and what the post says of it. */
export type PublicImage = { url: string; w?: number; h?: number; alt?: string };

/** The most photos a post shows; more are links, in its words. */
export const IMAGES_MOST = 4;
/** The longest address fetched. */
const URL_MOST = 2048;

const IMAGE_END = /\.(?:jpe?g|png|gif|webp|avif)$/i;
// IPv4 addresses that are not out on the internet: this phone, its network, and those near it.
const PRIVATE_V4 = [/^0\./, /^10\./, /^127\./, /^169\.254\./, /^172\.(?:1[6-9]|2\d|3[01])\./, /^192\.168\./, /^100\.(?:6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./, /^(?:22[4-9]|2[3-5]\d)\./];

/**
 * Whether an address may be fetched for a post: https only, on a name or an address out on the
 * internet. Anyone can write any address in a public post, and a fetch from this phone reaches
 * where it says: one on the phone itself or its home network (a router's page, a printer) could
 * be made to do something, or tell that this phone looked. Through Tor the exit would not reach
 * them anyway; straight, they are let be here.
 */
export function fetchable(url: string): boolean {
  if (url.length > URL_MOST || !/^https:\/\//i.test(url)) return false;
  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return false;
  }
  if (!host || host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal') || host.endsWith('.lan') || host.endsWith('.home.arpa')) return false;
  // An IPv6 address, written in brackets: none, as few servers of photos have only one, and its
  // nearby kinds are many.
  if (host.startsWith('[') || host.includes(':')) return false;
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) return !PRIVATE_V4.some((range) => range.test(host)) && host !== '255.255.255.255';
  // A name with no dot is one of the home network's.
  return host.includes('.') && !/^[\d.]+$/.test(host);
}

/** Whether a link is to a photo, by how its address ends. */
export function isImageLink(url: string): boolean {
  try {
    return IMAGE_END.test(new URL(url).pathname);
  } catch {
    return false;
  }
}

// The size an imeta tag gives, "1200x800".
function sizeOf(dim: string | undefined): { w?: number; h?: number } {
  const match = /^(\d{1,5})x(\d{1,5})$/.exec(dim ?? '');
  if (!match) return {};
  const w = Number(match[1]);
  const h = Number(match[2]);
  return w > 0 && h > 0 ? { w, h } : {};
}

/** What one imeta tag (NIP-92) says of a file: its address and kind, size and words. */
function imetaOf(tag: readonly string[]): (PublicImage & { mime?: string }) | null {
  if (tag[0] !== 'imeta') return null;
  const fields: Record<string, string> = {};
  for (const part of tag.slice(1)) {
    if (typeof part !== 'string') continue;
    const space = part.indexOf(' ');
    if (space <= 0) continue;
    const name = part.slice(0, space);
    if (fields[name] === undefined) fields[name] = part.slice(space + 1).trim();
  }
  if (!fields.url) return null;
  return { url: fields.url, ...sizeOf(fields.dim), ...(fields.alt ? { alt: fields.alt.slice(0, 300) } : {}), ...(fields.m ? { mime: fields.m.toLowerCase() } : {}) };
}

/** A post's photos, its first other link, and its words with the photos' addresses taken out. */
export type PostMedia = { text: string; images: PublicImage[]; link: string | null };

/**
 * The photos and the link of a post, from its words and its tags: every https address that is a
 * photo, by its imeta tag (which says so with its kind) or by how it ends, IMAGES_MOST at most, in
 * the order the words have them, each once; the first other https address, for its card. The
 * photos' addresses leave the words, which then lose the empty lines left; any other address
 * stays, to be tapped. Only addresses that may be fetched (fetchable) count.
 */
export function mediaIn(content: string, tags: readonly (readonly string[])[] = []): PostMedia {
  const metas = new Map<string, PublicImage & { mime?: string }>();
  for (const tag of tags) {
    const meta = imetaOf(tag);
    if (meta && !metas.has(meta.url)) metas.set(meta.url, meta);
  }
  const images: PublicImage[] = [];
  const seen = new Set<string>();
  let link: string | null = null;
  const words: string[] = [];
  for (const part of splitLinks(content)) {
    const url = part.url;
    if (!url || !fetchable(url)) {
      words.push(part.text);
      continue;
    }
    const meta = metas.get(url);
    const photo = meta?.mime ? meta.mime.startsWith('image/') && meta.mime !== 'image/svg+xml' : isImageLink(url);
    if (photo) {
      if (!seen.has(url) && images.length < IMAGES_MOST) {
        seen.add(url);
        images.push({ url, ...(meta?.w && meta.h ? { w: meta.w, h: meta.h } : {}), ...(meta?.alt ? { alt: meta.alt } : {}) });
        continue;
      }
      if (seen.has(url)) continue;
    } else if (!link && !(meta?.mime && !meta.mime.startsWith('text/'))) link = url;
    words.push(part.text);
  }
  const text = words
    .join('')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return { text, images, link };
}

/** What kind of photo these bytes are, by how they begin, or null when none Erevos shows: JPEG,
 *  PNG, GIF, WebP or AVIF. What a server says of a file is not believed. */
export function imageType(bytes: Uint8Array): string | null {
  const at = (i: number, ...want: number[]) => want.every((b, k) => bytes[i + k] === b);
  if (bytes.length < 12) return null;
  if (at(0, 0xff, 0xd8, 0xff)) return 'image/jpeg';
  if (at(0, 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return 'image/png';
  if (at(0, 0x47, 0x49, 0x46, 0x38)) return 'image/gif';
  if (at(0, 0x52, 0x49, 0x46, 0x46) && at(8, 0x57, 0x45, 0x42, 0x50)) return 'image/webp';
  if (at(4, 0x66, 0x74, 0x79, 0x70) && (at(8, 0x61, 0x76, 0x69, 0x66) || at(8, 0x61, 0x76, 0x69, 0x73))) return 'image/avif';
  return null;
}

/** The site a link is on, as a card names it: its host without www. */
export function siteOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./i, '');
  } catch {
    return '';
  }
}
