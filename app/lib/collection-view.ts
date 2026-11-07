// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import type { Collection, CollectionFolder, CollectionItem } from '../lock/collection-data';

// How the Collection's screen (app/collection.tsx) lays out what lock/collection-data.ts keeps:
// what lies in a folder, the photos by month, the files, and what a search finds. Kept apart from
// the screen so it can be checked. Also which files play (music and videos), and the list a file
// starts playing (lib/collection-play.ts).

/** A photo is shown in the grid, anything else in the list of files. */
export const isPhoto = (item: CollectionItem) => item.file.kind === 'photo';

/** The files of a folder ('' for the Collection's top), the newest first. */
export function inFolder(collection: Collection, folder: string): CollectionItem[] {
  return collection.items.filter((i) => i.folder === folder).sort((a, b) => b.added - a.added || (a.id < b.id ? 1 : -1));
}

/** A folder and how many files it holds. */
export type FolderTile = CollectionFolder & { count: number };

/** The folders by name, each with how many files it holds. */
export function folderTiles(collection: Collection): FolderTile[] {
  return collection.folders
    .map((f) => ({ ...f, count: collection.items.filter((i) => i.folder === f.id).length }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** The Collection's tabs that hold files: photos, videos, music, and every other file. */
export type FileTab = 'photos' | 'videos' | 'music' | 'files';

/** The tab a file shows in. */
export function tabOf(item: CollectionItem): FileTab {
  if (isPhoto(item)) return 'photos';
  const kind = playKind(item);
  return kind === 'video' ? 'videos' : kind === 'audio' ? 'music' : 'files';
}

/**
 * The folders a tab shows at its top, by name, each with how many of the tab's files it holds:
 * those that hold any; Files shows the empty ones too, so a folder just made is there to open.
 */
export function folderTilesFor(collection: Collection, tab: FileTab): FolderTile[] {
  return collection.folders
    .map((f) => ({ ...f, count: collection.items.filter((i) => i.folder === f.id && tabOf(i) === tab).length }))
    .filter((f) => f.count > 0 || (tab === 'files' && !collection.items.some((i) => i.folder === f.id)))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** The month a time falls in, as `2026-11`, in the phone's own time. */
export function monthOf(at: number): string {
  const d = new Date(at);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Photos of one month, the newest first. */
export type MonthGroup = { month: string; at: number; items: CollectionItem[] };

/** Photos in groups by the month they came, the newest month first. */
export function monthGroups(items: CollectionItem[]): MonthGroup[] {
  const groups: MonthGroup[] = [];
  for (const item of [...items].sort((a, b) => b.added - a.added)) {
    const month = monthOf(item.added);
    const last = groups[groups.length - 1];
    if (last && last.month === month) last.items.push(item);
    else groups.push({ month, at: item.added, items: [item] });
  }
  return groups;
}

/** What the photo grid draws: a month's heading, or a row of at most `columns` photos. */
export type GridEntry = { kind: 'month'; month: string; at: number } | { kind: 'row'; key: string; items: CollectionItem[] };

/** The photos as the grid draws them: each month's heading, then its photos in rows. */
export function gridEntries(items: CollectionItem[], columns = 3): GridEntry[] {
  const entries: GridEntry[] = [];
  for (const group of monthGroups(items)) {
    entries.push({ kind: 'month', month: group.month, at: group.at });
    for (let i = 0; i < group.items.length; i += columns) {
      const row = group.items.slice(i, i + columns);
      entries.push({ kind: 'row', key: row.map((r) => r.id).join(''), items: row });
    }
  }
  return entries;
}

const plain = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** The files whose name holds every word of `query` (accents and case ignored), wherever they lie; all of `items` for no words. */
export function search(items: CollectionItem[], query: string): CollectionItem[] {
  const words = plain(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return items;
  return items.filter((i) => {
    const name = plain(i.file.name);
    return words.every((w) => name.includes(w));
  });
}

/** What kind of file it is, for its icon in the list. */
export type FileLook = 'photo' | 'pdf' | 'text' | 'archive' | 'other';

const ARCHIVES = new Set(['zip', 'rar', '7z', 'tar', 'gz', 'tgz', 'bz2', 'xz']);

export function fileEnding(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : '';
}

export function fileLook(item: CollectionItem): FileLook {
  const { mime, name, kind } = item.file;
  const ending = fileEnding(name);
  if (kind === 'photo' || mime.startsWith('image/')) return 'photo';
  if (mime === 'application/pdf' || ending === 'pdf') return 'pdf';
  if (ARCHIVES.has(ending) || /zip|compressed|x-tar|x-7z|x-rar/.test(mime)) return 'archive';
  if (isText(item)) return 'text';
  return 'other';
}

const TEXT_ENDINGS = new Set(['txt', 'md', 'csv', 'log', 'json', 'xml', 'html', 'ini', 'yaml', 'yml', 'vcf', 'ics', 'srt']);

/** Whether the file is plain text the Collection can show itself. */
export function isText(item: CollectionItem): boolean {
  const { mime, name } = item.file;
  return mime.startsWith('text/') || mime === 'application/json' || mime === 'application/xml' || TEXT_ENDINGS.has(fileEnding(name));
}

/** The largest text file shown in the Collection; a larger one is opened with another app. */
export const MOST_TEXT = 1000 * 1000;

// What plays, by the name's ending: files often come as application/octet-stream, from another
// app, a chat or a server, so the ending decides whenever the type does not say music or video.
// Every format AndroidX Media3 reads on the phone (Playing.kt): MP3, AAC (ADTS and in MP4), FLAC,
// Ogg (Vorbis, Opus), WAV, AMR, Matroska and WebM, MP4 and 3GP. A computer's page plays what
// Chromium does of them (no 3GP nor AMR); a browser what it can.
const AUDIO_ENDINGS = new Set(['mp3', 'm4a', 'm4b', 'aac', 'adts', 'ogg', 'oga', 'opus', 'flac', 'wav', 'wave', 'amr', 'mka', 'weba']);
const VIDEO_ENDINGS = new Set(['mp4', 'm4v', 'mov', 'webm', 'mkv', '3gp', '3g2', 'ogv']);
// Types that say music or video without saying audio/ or video/.
const AUDIO_TYPES = new Set(['application/ogg', 'application/x-ogg', 'application/flac', 'application/x-flac']);
const VIDEO_TYPES = new Set(['application/mp4', 'application/x-matroska']);

/** Whether a file plays here, and how: as music, as a video, or not (null): by its type, else by its name's ending. */
export function playKind(item: CollectionItem): 'audio' | 'video' | null {
  const { mime, name, kind } = item.file;
  if (kind === 'photo') return null;
  const type = mime.toLowerCase();
  if (type.startsWith('video/') || VIDEO_TYPES.has(type)) return 'video';
  if (type.startsWith('audio/') || AUDIO_TYPES.has(type)) return 'audio';
  const ending = fileEnding(name);
  if (VIDEO_ENDINGS.has(ending)) return 'video';
  if (AUDIO_ENDINGS.has(ending)) return 'audio';
  return null;
}

const TYPES_BY_ENDING: Record<string, string> = {
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  m4b: 'audio/mp4',
  aac: 'audio/aac',
  adts: 'audio/aac',
  ogg: 'audio/ogg',
  oga: 'audio/ogg',
  opus: 'audio/ogg',
  flac: 'audio/flac',
  wav: 'audio/wav',
  wave: 'audio/wav',
  amr: 'audio/amr',
  mka: 'audio/x-matroska',
  weba: 'audio/webm',
  mp4: 'video/mp4',
  m4v: 'video/mp4',
  mov: 'video/quicktime',
  webm: 'video/webm',
  mkv: 'video/x-matroska',
  '3gp': 'video/3gpp',
  '3g2': 'video/3gpp2',
  ogv: 'video/ogg',
};

/** The type a player is told the file is: its own when it says, else the one its name's ending says. */
export function playType(item: CollectionItem): string {
  const mime = item.file.mime.toLowerCase();
  if (mime && mime !== 'application/octet-stream' && mime !== 'binary/octet-stream') return mime;
  return TYPES_BY_ENDING[fileEnding(item.file.name)] ?? 'application/octet-stream';
}

/**
 * The list that playing `item` starts: the files of `items` that play as it does (music with
 * music, videos with videos), in the order shown, and where it is in them.
 */
export function playListOf(items: CollectionItem[], item: CollectionItem): { list: CollectionItem[]; start: number } {
  const kind = playKind(item);
  if (!kind) return { list: [], start: 0 };
  const list = items.filter((i) => playKind(i) === kind);
  return { list, start: Math.max(0, list.findIndex((i) => i.id === item.id)) };
}
