// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { HLS, httpsLink, isHlsLink, nameFromLink, RadioLinkError, type StationLink } from './collection-radio';
import { utf8Decode } from './crypto';
import { t } from './i18n';
import type { HttpAnswer } from './net-http';

// TV in the Collection (app/collection.tsx, the TV tab), the Radio tab's sibling: a channel is a
// link to a live stream, most often HLS, kept sealed in the place's catalogue (lock/collection-
// data.ts channels) with its group and logo, and played by the Collection's player as a video
// (lib/collection-play.ts playChannel). Channels come from an IPTV list (.m3u with #EXTINF lines:
// tvg-name, tvg-logo, group-title, #EXTGRP), by its link, fetched once as it is added, or from a
// file on the device, read there; or one at a time by its own link. Only https, as for radio: a
// channel with only an http link is left out, and counted. There is no programme guide.
//
// iptv-org (github.com/iptv-org/iptv) is a public list of free channels, by country or whole:
// the add sheet offers it, and its server sees the device's IP address as the list is fetched.
//
// The channel, and whoever runs its server, sees the device's IP address while it plays, as any
// site does; the list's server too, once, as it is added; a logo's server, as it is shown, and
// logos are shown only when the place's Show channel logos is on (lock/collection-data.ts
// showLogos). Nothing else is sent: no cookies, and on Android and in the desktop app a
// User-Agent that says only "Erevos" (RADIO_AGENT).

/** The most of an IPTV list read, from its link or from a file: iptv-org's whole list is several MB. */
export const MOST_TV_LIST_BYTES = 16 * 1024 * 1024;
/** The most channels one list adds. */
export const MOST_LISTED_CHANNELS = 15000;
/** The longest group name kept. */
export const MOST_GROUP = 60;
/** The most of a logo read. */
export const MOST_LOGO_BYTES = 256 * 1024;

/** A channel a list names: its name, its link, its group and its logo's link ('' when none). */
export type ListedChannel = { name: string; url: string; group: string; logo: string };

/** A channel as it is added: its link and type (HLS or ''), its name, group and https logo ('' when none). */
export type ChannelLink = StationLink & { name: string; group: string; logo: string };

const clean = (text: string, most: number) => text.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, most);

/** A group as kept: iptv-org's "News;Sports" is the first of them. */
export const groupName = (text: string) => clean(text.split(';')[0] ?? '', MOST_GROUP);

/** Where the attributes of an #EXTINF line end: the first comma outside quotes, or -1. */
function nameComma(line: string): number {
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') quoted = !quoted;
    else if (c === ',' && !quoted) return i;
  }
  return -1;
}

/** An #EXTINF line's attributes (tvg-name, tvg-logo, group-title…) and the name after them. */
export function extinf(line: string): { attributes: Record<string, string>; name: string } {
  const body = line.replace(/^#EXTINF:/i, '');
  const comma = nameComma(body);
  const head = comma >= 0 ? body.slice(0, comma) : body;
  const attributes: Record<string, string> = {};
  for (const m of head.matchAll(/([\w-]+)\s*=\s*"([^"]*)"/g)) attributes[m[1].toLowerCase()] = m[2];
  return { attributes, name: comma >= 0 ? body.slice(comma + 1).trim() : '' };
}

const isLink = (line: string) => /^[a-z][a-z0-9+.-]*:\/\//i.test(line);

/** Whether the text is one HLS stream itself, not a list of channels. */
export const isHlsText = (text: string) => /^#EXT-X-(TARGETDURATION|STREAM-INF|MEDIA-SEQUENCE|VERSION|INDEPENDENT-SEGMENTS|MEDIA)\b/im.test(text);

/**
 * The channels an IPTV list names, in its order, MOST_LISTED_CHANNELS at most. Unlike radio's,
 * channels of the same name all stay (a channel in two qualities, or in two groups).
 */
export function tvChannels(text: string): ListedChannel[] {
  if (isHlsText(text)) return [];
  const out: ListedChannel[] = [];
  let info: { name: string; group: string; logo: string } | null = null;
  let extgrp = '';
  for (const raw of text.replace(/^﻿/, '').split(/\r\n|\r|\n/)) {
    const line = raw.trim();
    if (!line) continue;
    if (/^#EXTINF:/i.test(line)) {
      const { attributes, name } = extinf(line);
      info = { name: name || attributes['tvg-name'] || '', group: attributes['group-title'] ?? '', logo: attributes['tvg-logo'] ?? '' };
    } else if (/^#EXTGRP:/i.test(line)) extgrp = line.slice(8);
    else if (line.startsWith('#')) continue;
    else if (isLink(line)) {
      out.push({ name: clean(info?.name ?? '', 60), url: line, group: groupName(info?.group || extgrp), logo: info?.logo.trim() ?? '' });
      info = null;
      extgrp = '';
      if (out.length >= MOST_LISTED_CHANNELS) break;
    }
  }
  return out;
}

/** Whether a channel's link plays as HLS: .m3u8, or a link that says m3u8 in its query. */
export const isHlsChannel = (url: string) => isHlsLink(url) || /m3u8/i.test(url);

/**
 * Of the channels a list names, those Erevos can play (https links only), each as it is added,
 * named as the list says or by its server, its logo kept only when it is https; and how many were
 * left out for an http link.
 */
export function playableChannels(listed: ListedChannel[]): { channels: ChannelLink[]; plain: number } {
  const channels: ChannelLink[] = [];
  let plain = 0;
  for (const l of listed) {
    const url = httpsLink(l.url);
    if (!url) {
      plain++;
      continue;
    }
    const logo = l.logo ? (httpsLink(l.logo) ?? '') : '';
    channels.push({ url, mime: isHlsChannel(url) ? HLS : '', name: l.name || nameFromLink(url) || t('TV'), group: l.group, logo });
  }
  return { channels, plain };
}

const refused = (given: string) =>
  new RadioLinkError(/^\s*http:/i.test(given) ? t('Erevos opens only https links. Ask for the channel’s https link.') : t('That is not a link to a channel or a list.'));

/** A channel by its own link, as it plays: never fetched first. Throws RadioLinkError, said for the owner. */
export function channelLink(given: string): StationLink {
  const link = httpsLink(given);
  if (!link) throw refused(given);
  return { url: link, mime: isHlsChannel(link) ? HLS : '' };
}

/**
 * What an IPTV list's link adds, fetched once with `get`: its channels, and how many had only an
 * http link; or, when the link is one HLS stream after all, that stream as one channel. Throws
 * RadioLinkError, said for the owner, when it is neither.
 */
export async function listFromLink(given: string, get: (url: string) => Promise<HttpAnswer>): Promise<{ one: StationLink } | { many: ChannelLink[]; plain: number }> {
  const link = httpsLink(given);
  if (!link) throw refused(given);
  const answer = await get(link);
  if (answer.status < 200 || answer.status >= 300) throw new RadioLinkError(t('The list could not be read ({status}).', { status: answer.status }));
  const text = utf8Decode(answer.bytes.subarray(0, MOST_TV_LIST_BYTES));
  if (isHlsText(text)) return { one: { url: link, mime: HLS } };
  const listed = tvChannels(text);
  if (listed.length === 0) throw new RadioLinkError(t('This list names no channel.'));
  const { channels, plain } = playableChannels(listed);
  return { many: channels, plain };
}

// iptv-org (github.com/iptv-org/iptv): a public list of free channels, served from GitHub Pages.

/** iptv-org's list of every channel. */
export const IPTV_ORG_ALL = 'https://iptv-org.github.io/iptv/index.m3u';

/** iptv-org's list of a country's channels, by its ISO 3166 code; null for no such code. */
export function iptvOrgCountry(code: string): string | null {
  const cc = code.trim().toLowerCase();
  return /^[a-z]{2}$/.test(cc) ? `https://iptv-org.github.io/iptv/countries/${cc}.m3u` : null;
}

/** The countries iptv-org has a list of, by their ISO 3166 codes. */
export const IPTV_ORG_COUNTRIES = (
  'ad ae af ag al am ao ar at au aw az ba bb bd be bf bg bh bi bj bm bn bo bq br bs bt bw by bz ca cd cf cg ch ci cl cm cn co cr cu cv cw cy cz ' +
  'de dj dk dm do dz ec ee eg eh er es et fi fj fo fr ga gb gd ge gf gh gl gm gn gp gq gr gt gu gw gy hk hn hr ht hu id ie il in iq ir is it ' +
  'jm jo jp ke kg kh km kn kp kr kw kz la lb lc li lk lr ls lt lu lv ly ma mc md me mg mk ml mm mn mo mq mr mt mu mv mw mx my mz na nc ne ng ni nl no np nz ' +
  'om pa pe pf pg ph pk pl pr ps pt py qa re ro rs ru rw sa sc sd se sg si sk sl sm sn so sr ss sv sx sy sz td tg th tj tl tm tn tr tt tw tz ' +
  'ua ug us uy uz va vc ve vg vi vn ye yt za zm zw'
).split(' ');

/** Which country's list to offer first: the device's region, or the app's language's own. */
export function homeCountry(locale: string | undefined, lang: string): string {
  const region = /[-_]([A-Za-z]{2})(?:$|[-_@])/.exec(locale ?? '')?.[1]?.toLowerCase();
  if (region && IPTV_ORG_COUNTRIES.includes(region)) return region;
  const byLang: Record<string, string> = { el: 'gr', de: 'de', es: 'es', fr: 'fr', it: 'it', pt: 'br', sh: 'rs', en: 'gb' };
  return byLang[lang] ?? 'gb';
}

/** A country's name in the app's language, where the device can say it; its code otherwise. */
export function countryName(code: string, locale: string | undefined): string {
  try {
    const names = new Intl.DisplayNames(locale ? [locale] : undefined, { type: 'region' });
    return names.of(code.toUpperCase()) ?? code.toUpperCase();
  } catch {
    return code.toUpperCase();
  }
}

/** The type of a logo, from its first bytes: PNG, JPEG, GIF or WebP; null for anything else. */
export function logoType(bytes: Uint8Array): string | null {
  const at = (i: number, ...b: number[]) => b.every((v, k) => bytes[i + k] === v);
  if (at(0, 0x89, 0x50, 0x4e, 0x47)) return 'image/png';
  if (at(0, 0xff, 0xd8, 0xff)) return 'image/jpeg';
  if (at(0, 0x47, 0x49, 0x46, 0x38)) return 'image/gif';
  if (at(0, 0x52, 0x49, 0x46, 0x46) && at(8, 0x57, 0x45, 0x42, 0x50)) return 'image/webp';
  return null;
}

/** Whether a channel's name or group has `words`, ignoring case and accents. */
export function channelMatches(channel: { name: string; group: string }, words: string): boolean {
  const q = folded(words.trim());
  return !q || folded(channel.name).includes(q) || folded(channel.group).includes(q);
}

/** Text without case or accents, to search in. */
export const folded = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** The channels by group, the groups in the order of their names, those with no group last. */
export function channelGroups<C extends { group: string }>(channels: C[]): { group: string; channels: C[] }[] {
  const by = new Map<string, C[]>();
  for (const c of channels) {
    const list = by.get(c.group);
    if (list) list.push(c);
    else by.set(c.group, [c]);
  }
  return [...by.entries()]
    .sort(([a], [b]) => (a === '' ? 1 : b === '' ? -1 : a.localeCompare(b)))
    .map(([group, list]) => ({ group, channels: list }));
}
