// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import type { CollectionItem } from '../lock/collection-data';
import { fileEnding } from './collection-view';

// A video's subtitles: an .srt or .vtt file of the Collection in the same folder, with the same
// name but for its ending (film.mkv, film.srt), or with a language between (film.en.srt), plays
// with it (lib/collection-play.ts). On Android Media3 reads it from its encrypted chunks as it
// reads the video (Playing.kt); the page's player is given it as WebVTT (srtToVtt), in memory only.

const SUBTITLE_ENDINGS = new Set(['srt', 'vtt']);

const baseOf = (name: string) => {
  const dot = name.lastIndexOf('.');
  return (dot > 0 ? name.slice(0, dot) : name).normalize('NFC').toLowerCase();
};

/** Whether the file is subtitles the player takes. */
export const isSubtitles = (item: CollectionItem): boolean => item.file.kind !== 'photo' && SUBTITLE_ENDINGS.has(fileEnding(item.file.name));

/** The subtitles of `video` among `items`: same folder, same name; the one without a language first. Null for none. */
export function subtitlesFor(items: CollectionItem[], video: CollectionItem): CollectionItem | null {
  const base = baseOf(video.file.name);
  let withLanguage: CollectionItem | null = null;
  for (const item of items) {
    if (item.id === video.id || item.folder !== video.folder || !isSubtitles(item)) continue;
    const name = baseOf(item.file.name);
    if (name === base) return item;
    // film.en, film.el-GR: a language of letters after the video's name.
    if (!withLanguage && name.startsWith(`${base}.`) && /^[a-z]{2,3}([-_][a-z0-9]{2,4})?$/.test(name.slice(base.length + 1))) withLanguage = item;
  }
  return withLanguage;
}

/** The type a player is told the subtitles are, by their ending. */
export const subtitlesType = (item: CollectionItem): string => (fileEnding(item.file.name) === 'vtt' ? 'text/vtt' : 'application/x-subrip');

/**
 * SubRip (.srt) as WebVTT, which a page's <track> takes: the header, times with a dot, and cues as
 * they are; WebVTT stays as it is. Its own numbers go, as do blank cues; line breaks of any
 * system are taken.
 */
export function srtToVtt(text: string): string {
  const plain = text.replace(/^﻿/, '').replace(/\r\n?/g, '\n');
  if (/^WEBVTT/.test(plain)) return plain;
  const cues: string[] = [];
  for (const block of plain.split(/\n{2,}/)) {
    const lines = block.split('\n').filter((line, i) => !(i === 0 && /^\d+\s*$/.test(line)));
    const at = lines.findIndex((line) => line.includes('-->'));
    if (at < 0) continue;
    const time = lines[at]
      .replace(/(\d{1,2}):(\d{2}):(\d{2})[,.](\d{1,3})/g, (_, h: string, m: string, s: string, ms: string) => `${h.padStart(2, '0')}:${m}:${s}.${ms.padEnd(3, '0')}`)
      .trim();
    const words = lines.slice(at + 1).join('\n').trim();
    if (words) cues.push(`${time}\n${words}`);
  }
  return `WEBVTT\n\n${cues.join('\n\n')}\n`;
}

/** Subtitles' bytes as text: UTF-8, or, when they are not, Latin-1, as older .srt files often are something of the kind. */
export function subtitlesText(bytes: Uint8Array): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    let out = '';
    for (const byte of bytes) out += String.fromCharCode(byte);
    return out;
  }
}
