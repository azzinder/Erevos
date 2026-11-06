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

const AUDIO_ENDINGS = new Set(['mp3', 'm4a', 'aac', 'ogg', 'oga', 'opus', 'flac', 'wav']);
const VIDEO_ENDINGS = new Set(['mp4', 'm4v', 'mov', 'webm', 'mkv', '3gp']);

/** Whether a file plays here, and how: as music, as a video, or not (null). */
export function playKind(item: CollectionItem): 'audio' | 'video' | null {
  const { mime, name, kind } = item.file;
  if (kind === 'photo') return null;
  const ending = fileEnding(name);
  if (mime.startsWith('video/') || (mime === 'application/octet-stream' && VIDEO_ENDINGS.has(ending))) return 'video';
  if (mime.startsWith('audio/') || (mime === 'application/octet-stream' && AUDIO_ENDINGS.has(ending))) return 'audio';
  return null;
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
