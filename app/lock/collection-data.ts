// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { bytesSource, keepFile, readFile, refSource, room, type Source } from '../lib/attachments';
import { randomBytes, toHex } from '../lib/crypto';
import { t } from '../lib/i18n';

import { CHUNK_SIZES, PREFIX, cleanFileName, cleanMime, deleteChunks, freeName, isFileRef, readChunk, type FileKind, type FileRef } from './attachment-files';
import { currentSpace } from './keys';
import { sealedFile, type Holder } from './sealed-file';

// The Collection: each space's and each of its hidden places' own photos, files and folders,
// which the owner keeps apart from the chats. Every file is kept as a message's file is
// (lock/attachment-files.ts): encrypted with a key of its own, in chunks named at random lying
// among the chats' chunks, of the same sizes. So nothing on the phone tells a file of the
// Collection from a photo of a chat, nor whether any space or hidden place has a Collection.
// Only the catalogue says which chunks are whose, with their names, folders and keys: one sealed
// value per space and per hidden place in FILE (sealed-file.ts), in pages once it grows, so a
// hidden place's Collection shows only there, and the space's only in the space.
//
// The catalogue is shaped for the account's log (lib/sync/log.ts), which will carry it to the
// owner's other devices: every file and folder has an id of its own that never changes, each
// change says when it was made, and what is deleted leaves a mark (`gone`) for a while, so a
// device that had it does not bring it back.
//
// Backups (lock/backup.ts) hold the whole phone, every space at once, without opening any: they
// cannot tell the Collection's chunks from the chats', and take them all. A space, or a hidden
// place, whose owner said its Collection stays out of backups (`backup` false) names its chunks
// to a backup made while it is open (backupSkips), and only that backup leaves them out. Those of
// spaces that are closed go in, sealed as they are.
//
// Each place keeps its own choices for its Collection besides backups (CollectionOption), all off
// until the owner turns them on: whether a photo or video picked from the phone's gallery is then
// deleted there (lib/collection-import.ts, which Android has the owner confirm), whether the list
// playing stops when the space locks, and whether the notice of the list playing shows a file's
// name (lib/collection-play.ts).

export type CollectionPlace = { holder: Holder; space: number; key: Uint8Array };

/** A file of the Collection: the file as kept (its name, type, size, chunks and key), a small picture of a photo, its folder ('' for none), when it came and when it last changed. */
export type CollectionItem = { id: string; file: FileRef; thumb?: FileRef; folder: string; added: number; at: number };

export type CollectionFolder = { id: string; name: string; at: number };

/** What was deleted, and when. */
export type Gone = { id: string; at: number };

type Progress = (done: number, count: number) => void;

export type Collection = {
  items: CollectionItem[];
  folders: CollectionFolder[];
  gone: Gone[];
  backup: boolean;
  /** A photo or video picked from the gallery is deleted there once it is in the Collection. */
  deleteOriginals?: boolean;
  /** The list playing stops when the space locks. */
  stopOnLock?: boolean;
  /** The notice of the list playing shows the file's name. */
  showTitle?: boolean;
};

/** The place's own choices for its Collection, besides backups: each off until turned on. */
export type CollectionOption = 'deleteOriginals' | 'stopOnLock' | 'showTitle';
const OPTIONS: CollectionOption[] = ['deleteOriginals', 'stopOnLock', 'showTitle'];

export const FILE = 'erevos-collection';
const BLOCK = 16 * 1024;

/** The largest file the Collection keeps: as many chunks of the largest size as a file can have. */
export const MAX_COLLECTION_FILE = 1000 * room(CHUNK_SIZES[CHUNK_SIZES.length - 1]);
/** How many deletions are remembered, the newest. */
export const MAX_GONE = 2000;
export const MAX_FOLDER_NAME = 60;

const EMPTY: Collection = { items: [], folders: [], gone: [], backup: true };

const ID = /^[0-9a-f]{32}$/;
const newId = () => toHex(randomBytes(16));
const isTime = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0;

/** A file as the Collection keeps it: on this phone only, without a message's marks. */
function kept(value: unknown): FileRef | null {
  if (!isFileRef(value) || value.from) return null;
  const { name, mime, kind, size, w, h, id, key, chunk, count } = value;
  return { name, mime, kind, size, ...(w !== undefined && h !== undefined ? { w, h } : {}), id, key, chunk, count };
}

export function cleanFolderName(name: string): string {
  return name.replace(/[\u0000-\u001f\u007f/\\]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, MAX_FOLDER_NAME);
}

function checked(value: unknown): Collection {
  const v = value as Partial<Record<keyof Collection, unknown>> | null;
  const folders: CollectionFolder[] = [];
  for (const f of Array.isArray(v?.folders) ? v.folders : []) {
    const x = f as Partial<CollectionFolder> | null;
    if (typeof x?.id !== 'string' || !ID.test(x.id) || typeof x.name !== 'string' || !isTime(x.at)) continue;
    const name = cleanFolderName(x.name);
    if (name && !folders.some((g) => g.id === x.id)) folders.push({ id: x.id, name, at: x.at });
  }
  const folderIds = new Set(folders.map((f) => f.id));
  const items: CollectionItem[] = [];
  for (const i of Array.isArray(v?.items) ? v.items : []) {
    const x = i as Partial<CollectionItem> | null;
    if (typeof x?.id !== 'string' || !ID.test(x.id) || !isTime(x.added) || !isTime(x.at)) continue;
    const file = kept(x.file);
    if (!file || items.some((j) => j.id === x.id)) continue;
    const thumb = x.thumb === undefined ? null : kept(x.thumb);
    const folder = typeof x.folder === 'string' && folderIds.has(x.folder) ? x.folder : '';
    items.push({ id: x.id, file, ...(thumb ? { thumb } : {}), folder, added: x.added, at: x.at });
  }
  const gone: Gone[] = [];
  for (const g of Array.isArray(v?.gone) ? v.gone : []) {
    const x = g as Partial<Gone> | null;
    if (typeof x?.id === 'string' && ID.test(x.id) && isTime(x.at)) gone.push({ id: x.id, at: x.at });
  }
  const on: Partial<Record<CollectionOption, true>> = {};
  for (const option of OPTIONS) if (v?.[option] === true) on[option] = true;
  return { items, folders, gone: gone.slice(-MAX_GONE), backup: v?.backup !== false, ...on };
}

const store = sealedFile({ name: FILE, empty: EMPTY, checked, block: BLOCK });

// Changes to a place's Collection run one after another, each on what the one before left.
const changes = new Map<string, Promise<unknown>>();

function change<T>({ holder, space, key }: CollectionPlace, run: (now: Collection) => Promise<{ next: Collection | null; result: T }>): Promise<T> {
  const name = `${holder}/${space}`;
  const next = (changes.get(name) ?? Promise.resolve())
    .catch(() => undefined)
    .then(async () => {
      const { next, result } = await run(await store.load(holder, space, key));
      if (next) await store.save(holder, space, key, next);
      return result;
    });
  changes.set(name, next);
  return next;
}

const marked = (gone: Gone[], ids: string[], at: number): Gone[] => [...gone, ...ids.map((id) => ({ id, at }))].slice(-MAX_GONE);

/** A place's Collection: its files, the oldest first, its folders, and whether it goes into backups. */
export function loadCollection({ holder, space, key }: CollectionPlace): Promise<Collection> {
  return store.load(holder, space, key);
}

export class CollectionFileTooLargeError extends Error {
  constructor() {
    super(t('This file is too large for the Collection.'));
  }
}

export class NoSuchFolderError extends Error {
  constructor() {
    super(t('That folder is not there any more.'));
  }
}

export type NewItem = { name: string; mime: string; kind: FileKind; w?: number; h?: number };

/**
 * Encrypts a file into the place's Collection, in `folder` ('' for none), with a small picture of
 * it (`thumb`, a JPEG) when there is one. A name its folder has already gets a number. If any of
 * it cannot be kept, nothing is.
 */
export async function addToCollection(
  place: CollectionPlace,
  source: Source,
  item: NewItem,
  { folder = '', thumb, progress, now = Date.now() }: { folder?: string; thumb?: Uint8Array; progress?: Progress; now?: number } = {},
): Promise<CollectionItem> {
  if (source.size > MAX_COLLECTION_FILE) throw new CollectionFileTooLargeError();
  const meta = { name: cleanFileName(item.name), mime: cleanMime(item.mime), kind: item.kind, ...(item.w && item.h ? { w: item.w, h: item.h } : {}) };
  const file = await keepFile(source, meta, progress, MAX_COLLECTION_FILE);
  let small: FileRef | null = null;
  try {
    if (thumb) small = await keepFile(bytesSource(thumb), { name: 'thumb.jpg', mime: 'image/jpeg', kind: 'photo' });
    return await change(place, async (c) => {
      if (folder && !c.folders.some((f) => f.id === folder)) throw new NoSuchFolderError();
      const taken = new Set(c.items.filter((i) => i.folder === folder).map((i) => i.file.name));
      const added: CollectionItem = { id: newId(), file: { ...file, name: freeName(file.name, taken) }, ...(small ? { thumb: small } : {}), folder, added: now, at: now };
      return { next: { ...c, items: [...c.items, added] }, result: added };
    });
  } catch (error) {
    await deleteChunks(file.id, file.count).catch(() => undefined);
    if (small) await deleteChunks(small.id, small.count).catch(() => undefined);
    throw error;
  }
}

/** Renames a file; a name its folder has already gets a number. */
export function renameItem(place: CollectionPlace, id: string, name: string, now = Date.now()): Promise<void> {
  return change(place, async (c) => {
    const item = c.items.find((i) => i.id === id);
    const clean = cleanFileName(name);
    if (!item || !clean || clean === item.file.name) return { next: null, result: undefined };
    const taken = new Set(c.items.filter((i) => i.folder === item.folder && i.id !== id).map((i) => i.file.name));
    const items = c.items.map((i) => (i.id === id ? { ...i, file: { ...i.file, name: freeName(clean, taken) }, at: now } : i));
    return { next: { ...c, items }, result: undefined };
  });
}

/** Moves files into `folder` ('' for none); a name it has already gets a number. */
export function moveItems(place: CollectionPlace, ids: string[], folder: string, now = Date.now()): Promise<void> {
  return change(place, async (c) => {
    if (folder && !c.folders.some((f) => f.id === folder)) throw new NoSuchFolderError();
    const moving = new Set(ids);
    const taken = new Set(c.items.filter((i) => i.folder === folder && !moving.has(i.id)).map((i) => i.file.name));
    const items = c.items.map((i) => {
      if (!moving.has(i.id) || i.folder === folder) return i;
      const name = freeName(i.file.name, taken);
      taken.add(name);
      return { ...i, file: { ...i.file, name }, folder, at: now };
    });
    return { next: { ...c, items }, result: undefined };
  });
}

/** Deletes files from the Collection, and their chunks once the catalogue no longer names them. */
export async function deleteItems(place: CollectionPlace, ids: string[], now = Date.now()): Promise<void> {
  const going = new Set(ids);
  const removed = await change(place, async (c) => {
    const out = c.items.filter((i) => going.has(i.id));
    if (out.length === 0) return { next: null, result: out };
    const items = c.items.filter((i) => !going.has(i.id));
    return { next: { ...c, items, gone: marked(c.gone, out.map((i) => i.id), now) }, result: out };
  });
  for (const item of removed) {
    await deleteChunks(item.file.id, item.file.count).catch(() => undefined);
    if (item.thumb) await deleteChunks(item.thumb.id, item.thumb.count).catch(() => undefined);
  }
}

function freeFolderName(name: string, folders: CollectionFolder[], but = ''): string {
  return freeName(name, new Set(folders.filter((f) => f.id !== but).map((f) => f.name)));
}

/** Makes a folder; a name there is already gets a number. */
export function addFolder(place: CollectionPlace, name: string, now = Date.now()): Promise<CollectionFolder> {
  const clean = cleanFolderName(name);
  if (!clean) return Promise.reject(new Error('a folder needs a name'));
  return change(place, async (c) => {
    const folder: CollectionFolder = { id: newId(), name: freeFolderName(clean, c.folders), at: now };
    return { next: { ...c, folders: [...c.folders, folder] }, result: folder };
  });
}

export function renameFolder(place: CollectionPlace, id: string, name: string, now = Date.now()): Promise<void> {
  const clean = cleanFolderName(name);
  return change(place, async (c) => {
    const folder = c.folders.find((f) => f.id === id);
    if (!folder || !clean || clean === folder.name) return { next: null, result: undefined };
    const folders = c.folders.map((f) => (f.id === id ? { ...f, name: freeFolderName(clean, c.folders, id), at: now } : f));
    return { next: { ...c, folders }, result: undefined };
  });
}

/** Deletes a folder. Its files are not deleted: they go out of it, to the Collection's top. */
export function deleteFolder(place: CollectionPlace, id: string, now = Date.now()): Promise<void> {
  return change(place, async (c) => {
    if (!c.folders.some((f) => f.id === id)) return { next: null, result: undefined };
    const taken = new Set(c.items.filter((i) => i.folder === '').map((i) => i.file.name));
    const items = c.items.map((i) => {
      if (i.folder !== id) return i;
      const name = freeName(i.file.name, taken);
      taken.add(name);
      return { ...i, file: { ...i.file, name }, folder: '', at: now };
    });
    return { next: { ...c, items, folders: c.folders.filter((f) => f.id !== id), gone: marked(c.gone, [id], now) }, result: undefined };
  });
}

/** Whether the place's Collection goes into backups made while it is open. */
export function setCollectionBackup(place: CollectionPlace, on: boolean): Promise<void> {
  return change(place, async (c) => ({ next: c.backup === on ? null : { ...c, backup: on }, result: undefined }));
}

/** Turns one of the place's own choices for its Collection on or off. */
export function setCollectionOption(place: CollectionPlace, option: CollectionOption, on: boolean): Promise<void> {
  return change(place, async (c) => {
    if ((c[option] === true) === on) return { next: null, result: undefined };
    const { [option]: _was, ...rest } = c;
    return { next: on ? { ...rest, [option]: true } : rest, result: undefined };
  });
}

/** The names of the chunk files a backup made now leaves out: those of the open places whose Collection stays out of backups. */
export async function backupSkips(places: CollectionPlace[]): Promise<Set<string>> {
  const skip = new Set<string>();
  for (const place of places) {
    const { items, backup } = await loadCollection(place);
    if (backup) continue;
    for (const item of items)
      for (const ref of item.thumb ? [item.file, item.thumb] : [item.file])
        for (let n = 0; n < ref.count; n++) skip.add(`${PREFIX}${ref.id}-${n}`);
  }
  return skip;
}

// The hidden places open now, whose Collection a backup made now asks too (backupSkips): told by
// the screens that open and close them. Only in memory, as their keys are.
const openHidden = new Map<string, CollectionPlace>();

/** A hidden place opened, or closed (`open` false). */
export function hiddenPlaceOpen(place: CollectionPlace, open: boolean): void {
  const name = `${place.holder}/${place.space}`;
  if (open && place.holder !== 'space') openHidden.set(name, place);
  else openHidden.delete(name);
}

/** What a backup made now leaves out: the chunks of the open space's Collection and of the open hidden places', those the owner keeps out of backups. */
export async function openCollectionSkips(): Promise<Set<string>> {
  let space: { space: number; key: Uint8Array } | null = null;
  try {
    space = currentSpace();
  } catch {
    // No space is open: nothing is known to leave out.
  }
  const places = [...(space ? [{ holder: 'space' as Holder, ...space }] : []), ...openHidden.values()];
  return backupSkips(places).catch(() => new Set<string>());
}

/** A file's bytes, whole, or null when its chunks are gone (as after a backup restored without them). */
export const openItem = (item: CollectionItem): Promise<Uint8Array | null> => readFile(item.file);

/** A file's small picture, or null when it has none or it is gone. */
export const openThumb = (item: CollectionItem): Promise<Uint8Array | null> => (item.thumb ? readFile(item.thumb) : Promise.resolve(null));

/** A file read a piece at a time, as it is decrypted, for a large one. */
export const itemSource = (item: CollectionItem): Source => refSource(item.file);

/** Whether a file's chunks are still here: a backup restored without them leaves its catalogue naming files that are gone. */
export async function itemThere(item: CollectionItem): Promise<boolean> {
  return (await readChunk(item.file.id, 0)) !== null && (await readChunk(item.file.id, item.file.count - 1)) !== null;
}
