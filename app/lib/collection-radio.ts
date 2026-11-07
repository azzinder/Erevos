// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { utf8Decode } from './crypto';
import { t } from './i18n';
import type { HttpAnswer } from './net-http';

// Internet radio in the Collection (app/collection.tsx, the Radio tab): a station is a link the
// owner gives, kept sealed in the place's catalogue (lock/collection-data.ts stations), and played
// by the same player as the music (lib/collection-play.ts playStation). A link to a playlist (.m3u
// or .pls) is fetched once, as it is added, and its first link kept; an HLS stream (.m3u8, or an
// .m3u that is one) is kept as it is and played as such (on Android). Only https: Erevos opens no
// plain http anywhere, so a station that has only an http link is refused, and said so.
//
// The station, and whoever runs its server, sees the device's IP address and when it listens, as
// any site does; the playlist's server too, once, as it is added. Nothing else is sent: no
// cookies, and on Android and in the desktop app a User-Agent that says only "Erevos" (a page in a
// browser or on Sailfish OS cannot set one: there the browser's own goes, lib/backup-http.web.ts).

/** The User-Agent a station is asked with: the app's name, nothing of the device. */
export const RADIO_AGENT = 'Erevos';
/** The most of a playlist file read. */
export const MOST_PLAYLIST = 64 * 1024;
/** The longest link kept. */
export const MOST_LINK = 2048;
/** The type said for an HLS stream. */
export const HLS = 'application/x-mpegURL';

export class RadioLinkError extends Error {}

/** `text` as an https link, or null: never http, nor a link with a name and password in it. */
export function httpsLink(text: string): string | null {
  const s = text.trim();
  if (s.length === 0 || s.length > MOST_LINK || /\s/.test(s)) return null;
  let url: URL;
  try {
    url = new URL(s);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' || !url.hostname || url.username || url.password) return null;
  return url.href;
}

const ending = (link: string) => {
  try {
    return new URL(link).pathname.toLowerCase().split('.').pop() ?? '';
  } catch {
    return '';
  }
};

/** Whether `link` names a playlist to fetch (.m3u, .pls), not the stream itself. */
export const isPlaylistLink = (link: string) => ['m3u', 'pls'].includes(ending(link));

/** Whether `link` names an HLS stream (.m3u8). */
export const isHlsLink = (link: string) => ending(link) === 'm3u8';

/** What a playlist file says: whether it is an HLS stream itself, and the links it lists, in order. */
export function playlistLinks(text: string): { hls: boolean; links: string[] } {
  const lines = text.replace(/^﻿/, '').split(/\r\n|\r|\n/).map((l) => l.trim());
  if (lines.some((l) => l.startsWith('#EXT-X-'))) return { hls: true, links: [] };
  const links: string[] = [];
  for (const line of lines) {
    // .pls: File1=…; .m3u: any line not a comment.
    const pls = /^File\d+\s*=\s*(.+)$/i.exec(line);
    const link = pls ? pls[1].trim() : line && !line.startsWith('#') && !line.startsWith('[') && !/^\w+\s*=/.test(line) ? line : '';
    if (link && /^[a-z][a-z0-9+.-]*:\/\//i.test(link)) links.push(link);
  }
  return { hls: false, links };
}

/** A station's link as it plays, and its type: an HLS stream, or anything else (''). */
export type StationLink = { url: string; mime: string };

/**
 * The link a station plays from, from the link the owner gave: a playlist's first link, fetched
 * with `get`, or the link itself. Throws RadioLinkError, said for the owner, when it cannot be one.
 */
export async function stationLink(given: string, get: (url: string) => Promise<HttpAnswer>): Promise<StationLink> {
  const link = httpsLink(given);
  if (!link) {
    throw new RadioLinkError(/^\s*http:/i.test(given) ? t('Erevos opens only https links. Ask the station for its https link.') : t('That is not a link to a station.'));
  }
  if (isHlsLink(link)) return { url: link, mime: HLS };
  if (!isPlaylistLink(link)) return { url: link, mime: '' };
  const answer = await get(link);
  if (answer.status < 200 || answer.status >= 300) throw new RadioLinkError(t('The station’s playlist could not be read ({status}).', { status: answer.status }));
  const { hls, links } = playlistLinks(utf8Decode(answer.bytes.subarray(0, MOST_PLAYLIST)));
  if (hls) return { url: link, mime: HLS };
  const first = links.find((l) => httpsLink(l));
  if (first) return { url: httpsLink(first)!, mime: isHlsLink(first) ? HLS : '' };
  throw new RadioLinkError(links.length > 0 ? t('This station gives only http links, which Erevos does not open. Ask it for an https link.') : t('The station’s playlist holds no link.'));
}

// Radio Browser (radio-browser.info), a free directory of stations anyone may edit: a search sends
// it only the words typed, with the User-Agent "Erevos" on Android and in the desktop app (the
// browser's own in a browser and on Sailfish OS), and it sees the device's IP address. Only
// stations it gives an https link for are offered.

/** The most stations a search shows. */
export const MOST_FOUND = 30;
/** The most of Radio Browser's answer read. */
export const MOST_FOUND_BYTES = 512 * 1024;

/** The address a search for `words` asks Radio Browser at; null for nothing to look for. */
export function radioSearchUrl(words: string): string | null {
  const q = words.trim().slice(0, 100);
  if (!q) return null;
  return `https://de1.api.radio-browser.info/json/stations/search?name=${encodeURIComponent(q)}&limit=${MOST_FOUND}&hidebroken=true`;
}

/** A station Radio Browser found: its name, its https link and type, and a few words of it (country, codec, bitrate). */
export type FoundStation = { name: string; url: string; mime: string; about: string };

/** The stations in Radio Browser's answer that have an https link, at most MOST_FOUND. */
export function foundStations(bytes: Uint8Array): FoundStation[] {
  let list: unknown;
  try {
    list = JSON.parse(utf8Decode(bytes));
  } catch {
    return [];
  }
  if (!Array.isArray(list)) return [];
  const out: FoundStation[] = [];
  const seen = new Set<string>();
  for (const entry of list) {
    const v = entry as Record<string, unknown> | null;
    if (!v || typeof v.name !== 'string') continue;
    const link = [v.url_resolved, v.url].map((u) => (typeof u === 'string' ? httpsLink(u) : null)).find((u) => u);
    const name = v.name.replace(/\s+/g, ' ').trim().slice(0, 60);
    if (!link || !name || seen.has(link)) continue;
    seen.add(link);
    const words = [v.country, v.codec, typeof v.bitrate === 'number' && v.bitrate > 0 ? `${v.bitrate} kbps` : null].filter((w): w is string => typeof w === 'string' && w.trim() !== '').map((w) => w.trim().slice(0, 40));
    out.push({ name, url: link, mime: v.hls === 1 || isHlsLink(link) ? HLS : '', about: words.join(' · ') });
    if (out.length >= MOST_FOUND) break;
  }
  return out;
}

/** A name for a station from its link, when the owner gives none: its server's name. */
export function nameFromLink(link: string): string {
  try {
    return new URL(link).hostname.replace(/^www\./, '').slice(0, 60);
  } catch {
    return '';
  }
}
