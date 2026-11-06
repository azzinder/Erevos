// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { bytesSource, keepFile, readFile, refSource, room, type Source } from '../lib/attachments';
import { randomBytes, sha256Bytes, toHex, utf8Encode } from '../lib/crypto';
import { listFiles } from '../lib/files';
import { t } from '../lib/i18n';

import { CHUNK_SIZES, PREFIX, chunksHere, cleanFileName, cleanMime, deleteChunks, freeName, isFileRef, readChunk, type FileKind, type FileRef } from './attachment-files';
import { currentSpace } from './keys';
import { sealedFile, type Holder } from './sealed-file';

// The Collection: each space's and each of its hidden places' own photos, files and folders,
// which the owner keeps apart from the chats. Every file is kept as a message's file is
// (lock/attachment-files.ts): encrypted with a key of its own, in chunks named at random lying
// among the chats' chunks, of the same sizes, though a file here may have more of them (up to
// COLLECTION_CHUNKS, about 4 GiB, where a message's has 1000 at most). So nothing on the phone
// tells a file of the Collection from a photo of a chat, nor whether any space or hidden place has
// a Collection.
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
//
// And whether its chunks are copied to a folder on a WebDAV server (`server`, CollectionServer;
// lib/collection-webdav.ts): off until the owner gives a server, kept here with its user name and
// password, so sealed with the place and in its backups, never in plain storage. While a place's
// copies there are whole (serverWhole), a backup made while it is open may leave its chunks out
// too: they are on the server, and the restored catalogue fetches them from there. That they were
// whole is kept with the server too (`whole`, wholeMark), so it holds after Erevos starts again,
// as long as the catalogue names the very chunks it named then: any file added or deleted since
// changes the mark, and the chunks go into backups again until the next copy is whole.

export type CollectionPlace = { holder: Holder; space: number; key: Uint8Array };

/** A file of the Collection: the file as kept (its name, type, size, chunks and key), a small picture of a photo, its folder ('' for none), when it came and when it last changed. */
export type CollectionItem = { id: string; file: FileRef; thumb?: FileRef; folder: string; added: number; at: number };

export type CollectionFolder = { id: string; name: string; at: number };

/**
 * A folder on a WebDAV server the place's chunks are copied to: the folder's address the owner
 * gave (https, ending in /), the user name and password for it, the random name of the subfolder
 * the chunks go in, whether it is on, and when the copies there were last whole (milliseconds, 0
 * if never), with the mark of the chunks the catalogue named then (`whole`, wholeMark).
 */
export type CollectionServer = { on: boolean; url: string; user: string; password: string; folder: string; last: number; whole?: string };

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
  /** The server the chunks are copied to, when the owner gave one. */
  server?: CollectionServer;
  /** The Collection goes to the account's linked devices too, through the place's log (lib/collection-links.ts). */
  devices?: boolean;
};

/** The place's own choices for its Collection, besides backups: each off until turned on. */
export type CollectionOption = 'deleteOriginals' | 'stopOnLock' | 'showTitle' | 'devices';
const OPTIONS: CollectionOption[] = ['deleteOriginals', 'stopOnLock', 'showTitle', 'devices'];

export const FILE = 'erevos-collection';
const BLOCK = 16 * 1024;

/** The most chunks a file of the Collection has: more than a message's (MOST_CHUNKS), as the owner chose. */
export const COLLECTION_CHUNKS = 4096;
/** The largest file the Collection keeps, about 4 GiB: COLLECTION_CHUNKS of the largest size. */
export const MAX_COLLECTION_FILE = COLLECTION_CHUNKS * room(CHUNK_SIZES[CHUNK_SIZES.length - 1]);
/** How many deletions are remembered, the newest. */
export const MAX_GONE = 2000;
export const MAX_FOLDER_NAME = 60;

const EMPTY: Collection = { items: [], folders: [], gone: [], backup: true };

const ID = /^[0-9a-f]{32}$/;
const newId = () => toHex(randomBytes(16));
const isTime = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0;
const SERVER_FOLDER = /^[0-9a-f]{24}$/;
const MARK = /^[0-9a-f]{64}$/;

function serverOf(value: unknown): CollectionServer | null {
  const v = value as Partial<CollectionServer> | null;
  if (!v || typeof v.url !== 'string' || !/^https:\/\/\S+\/$/.test(v.url) || v.url.length > 2048) return null;
  if (typeof v.user !== 'string' || typeof v.password !== 'string' || typeof v.folder !== 'string' || !SERVER_FOLDER.test(v.folder)) return null;
  const whole = typeof v.whole === 'string' && MARK.test(v.whole) ? { whole: v.whole } : {};
  return { on: v.on === true, url: v.url, user: v.user, password: v.password, folder: v.folder, last: isTime(v.last) ? v.last : 0, ...whole };
}

/** A file as the Collection keeps it: on this phone only, without a message's marks. */
function kept(value: unknown): FileRef | null {
  if (!isFileRef(value, COLLECTION_CHUNKS) || value.from) return null;
  const { name, mime, kind, size, w, h, id, key, chunk, count } = value;
  return { name, mime, kind, size, ...(w !== undefined && h !== undefined ? { w, h } : {}), id, key, chunk, count };
}

export function cleanFolderName(name: string): string {
  return name.replace(/[\u0000-\u001f\u007f/\\]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, MAX_FOLDER_NAME);
}

/** A Collection as kept, from what was read or came: what is not as it should be is left out. */
export function checkedCollection(value: unknown): Collection {
  return checked(value);
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
  const server = serverOf(v?.server);
  return { items, folders, gone: gone.slice(-MAX_GONE), backup: v?.backup !== false, ...on, ...(server ? { server } : {}) };
}

const store = sealedFile({ name: FILE, empty: EMPTY, checked, block: BLOCK });

// Changes to a place's Collection run one after another, each on what the one before left.
const changes = new Map<string, Promise<unknown>>();

const placeName = ({ holder, space }: Pick<CollectionPlace, 'holder' | 'space'>) => `${holder}/${space}`;

/** What happened to a place: its Collection changed, or it opened or closed. */
export type PlaceEvent = 'changed' | 'opened' | 'closed';
const watchers = new Set<(place: CollectionPlace, event: PlaceEvent) => void>();

/** Tells `watch` of every change to a Collection, and of hidden places opening and closing (hiddenPlaceOpen). Returns how to stop. */
export function watchCollections(watch: (place: CollectionPlace, event: PlaceEvent) => void): () => void {
  watchers.add(watch);
  return () => watchers.delete(watch);
}

function tell(place: CollectionPlace, event: PlaceEvent): void {
  for (const watch of watchers) {
    try {
      watch(place, event);
    } catch {
      // A watcher's trouble is its own.
    }
  }
}

// How many times each place's Collection changed since Erevos started, and at which of them its
// copies on the server were last whole (serverWhole): only in memory.
const generations = new Map<string, number>();
const wholeAt = new Map<string, number>();

/** How many times the place's Collection changed since Erevos started: to tell, after copying it to a server, whether it changed meanwhile. */
export function collectionGeneration(place: CollectionPlace): number {
  return generations.get(placeName(place)) ?? 0;
}

/** The place's copies on the server were whole as its Collection was at `generation` (collectionGeneration). */
export function serverWhole(place: CollectionPlace, generation: number): void {
  wholeAt.set(placeName(place), generation);
}

/** For the checks: forgets what this run of Erevos knew of the Collections' changes, as after Erevos starts again. */
export function forgetCollectionRuns(): void {
  generations.clear();
  wholeAt.clear();
}

/** Whether the place's copies on the server are whole as its Collection is now. */
export function isServerWhole(place: CollectionPlace): boolean {
  return wholeAt.get(placeName(place)) === collectionGeneration(place);
}

function change<T>(place: CollectionPlace, run: (now: Collection) => Promise<{ next: Collection | null; result: T }>, quiet = false): Promise<T> {
  const { holder, space, key } = place;
  const name = placeName(place);
  const next = (changes.get(name) ?? Promise.resolve())
    .catch(() => undefined)
    .then(async () => {
      const { next, result } = await run(await store.load(holder, space, key));
      if (next) {
        await store.save(holder, space, key, next);
        if (!quiet) {
          generations.set(name, (generations.get(name) ?? 0) + 1);
          tell(place, 'changed');
        }
      }
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
  const file = await keepFile(source, metaOf(item), progress, MAX_COLLECTION_FILE);
  return catalogued(place, file, { folder, thumb, now });
}

export class CollectionFileDamagedError extends Error {}

/**
 * Puts into the place's Collection a file already encrypted into chunks here, as keepFile does
 * (`sealed`: on Android, by modules/erevos-collection as it read the file, with no plain copy).
 * Its chunks are deleted if it cannot be kept: too large, not as a file of the Collection is, or
 * the catalogue not saved.
 */
export async function addSealedToCollection(
  place: CollectionPlace,
  sealed: { id: string; key: string; chunk: number; count: number; size: number },
  item: NewItem,
  { folder = '', thumb, now = Date.now() }: { folder?: string; thumb?: Uint8Array; now?: number } = {},
): Promise<CollectionItem> {
  const { id, key, chunk, count, size } = sealed;
  const file = kept({ ...metaOf(item), size, id, key, chunk, count });
  if (!file || size > MAX_COLLECTION_FILE) {
    await deleteChunks(id, count).catch(() => undefined);
    throw size > MAX_COLLECTION_FILE ? new CollectionFileTooLargeError() : new CollectionFileDamagedError();
  }
  return catalogued(place, file, { folder, thumb, now });
}

const metaOf = (item: NewItem) => ({ name: cleanFileName(item.name), mime: cleanMime(item.mime), kind: item.kind, ...(item.w && item.h ? { w: item.w, h: item.h } : {}) });

// A file kept in chunks, with its small picture, written into the catalogue; if any of it cannot
// be, nothing stays.
async function catalogued(place: CollectionPlace, file: FileRef, { folder, thumb, now }: { folder: string; thumb?: Uint8Array; now: number }): Promise<CollectionItem> {
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

/**
 * Changes the place's Collection as `merge` says, from what another of the account's devices did
 * (lib/collection-links.ts): the next Collection, or null for no change, and the files it no
 * longer has, whose chunks are deleted once the catalogue no longer names them.
 */
export async function mergeCollection(place: CollectionPlace, merge: (now: Collection) => { next: Collection; dropped: CollectionItem[] } | null): Promise<CollectionItem[]> {
  const dropped = await change(place, async (c) => {
    const merged = merge(c);
    return merged ? { next: checked(merged.next), result: merged.dropped } : { next: null, result: [] as CollectionItem[] };
  });
  const still = new Set((await loadCollection(place)).items.flatMap((i) => [i.file.id, ...(i.thumb ? [i.thumb.id] : [])]));
  for (const item of dropped) {
    if (!still.has(item.file.id)) await deleteChunks(item.file.id, item.file.count).catch(() => undefined);
    if (item.thumb && !still.has(item.thumb.id)) await deleteChunks(item.thumb.id, item.thumb.count).catch(() => undefined);
  }
  return dropped;
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

/** Gives the place's Collection a server to copy its chunks to, or changes it; null forgets it. */
export function setCollectionServer(place: CollectionPlace, server: CollectionServer | null): Promise<void> {
  return change(place, async (c) => {
    const { server: _was, ...rest } = c;
    return { next: server ? { ...rest, server } : rest, result: undefined };
  });
}

/**
 * Keeps when the place's copies on its server were last whole, and the mark of the chunks they
 * were whole for (`whole`, wholeMark of the catalogue the copy began with), if it still has that
 * server: no change to tell of, nor to copy.
 */
export function noteServerWhole(place: CollectionPlace, folder: string, last: number, whole?: string): Promise<void> {
  return change(
    place,
    async (c) => {
      if (!c.server || c.server.folder !== folder) return { next: null, result: undefined };
      const { whole: _was, ...server } = c.server;
      return { next: { ...c, server: { ...server, last, ...(whole ? { whole } : {}) } }, result: undefined };
    },
    true,
  );
}

/** The mark of the chunks a catalogue names, with their sizes (chunkFiles): the same for the same chunks, another for any other. */
export function wholeMark(collection: Pick<Collection, 'items'>): string {
  const names = [...chunkFiles(collection)].map(([name, size]) => `${name} ${size}`).sort();
  return toHex(sha256Bytes(utf8Encode(names.join('\n'))));
}

/**
 * Whether the copies of `collection` on its server are whole: copied whole as it is now since
 * Erevos started (isServerWhole), or, kept with the server, for the very chunks it names now.
 */
export function serverHoldsAll(place: CollectionPlace, collection: Pick<Collection, 'items' | 'server'>): boolean {
  const server = collection.server;
  if (!server?.on) return false;
  return isServerWhole(place) || (!!server.whole && server.whole === wholeMark(collection));
}

/** The chunk files of the place's Collection, each with its size: its files' and their small pictures'. */
export function chunkFiles(collection: Pick<Collection, 'items'>): Map<string, number> {
  const files = new Map<string, number>();
  for (const item of collection.items)
    for (const ref of item.thumb ? [item.file, item.thumb] : [item.file])
      for (let n = 0; n < ref.count; n++) files.set(`${PREFIX}${ref.id}-${n}`, ref.chunk);
  return files;
}

/**
 * The names of the chunk files a backup made now leaves out: those of the open places whose
 * Collection stays out of backups, or whose copies on their server are whole now.
 */
export async function backupSkips(places: CollectionPlace[]): Promise<Set<string>> {
  const skip = new Set<string>();
  for (const place of places) {
    const collection = await loadCollection(place);
    const { items, backup } = collection;
    if (backup && !serverHoldsAll(place, collection)) continue;
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
  const name = placeName(place);
  if (open && place.holder !== 'space') openHidden.set(name, place);
  else openHidden.delete(name);
  if (place.holder !== 'space') tell(place, open ? 'opened' : 'closed');
}

/** The places open now: the open space's and the open hidden places'. */
export function openPlaces(): CollectionPlace[] {
  let space: { space: number; key: Uint8Array } | null = null;
  try {
    space = currentSpace();
  } catch {
    // No space is open.
  }
  return [...(space ? [{ holder: 'space' as Holder, ...space }] : []), ...openHidden.values()];
}

const sameKey = (a: Uint8Array, b: Uint8Array) => a.length === b.length && a.every((byte, i) => byte === b[i]);

/** Whether `place` is open now, with this key. */
export function placeIsOpen(place: CollectionPlace): boolean {
  return openPlaces().some((open) => open.holder === place.holder && open.space === place.space && sameKey(open.key, place.key));
}

/** What a backup made now leaves out: the chunks of the open space's Collection and of the open hidden places', those the owner keeps out of backups. */
export async function openCollectionSkips(): Promise<Set<string>> {
  return backupSkips(openPlaces()).catch(() => new Set<string>());
}

/** How far fetching a file's missing chunks has come: its chunks here of all it has, and about how many of its bytes. */
export type FillProgress = { done: number; total: number; bytes: number; size: number };

/** What a fetch of missing chunks is told: `signal` stops it, keeping what came (the next one goes on from there); `progress` hears how far it is. */
export type FillOptions = { signal?: AbortSignal; progress?: (progress: FillProgress) => void };

/** Fetching a file's missing chunks was stopped (FillOptions signal): what came stays. */
export class FillStoppedError extends Error {
  constructor() {
    super('Stopped');
  }
}

type Filler = (item: CollectionItem, options?: FillOptions) => Promise<boolean>;

// What fetches a file's missing chunks from its place's server (lib/collection-webdav.ts), and
// from the account's other devices (lib/collection-links.ts): whether it did, so the file opens now.
let filler: Filler | null = null;
const fillers = new Set<Filler>();

/** Sets what fetches a file's missing chunks from its server when it is opened (null for nothing). */
export function setMissingFiller(fill: Filler | null): void {
  filler = fill;
}

/** Adds a way to fetch a file's missing chunks when it is opened, tried after the server: returns how to take it away. */
export function addMissingFiller(fill: Filler): () => void {
  fillers.add(fill);
  return () => fillers.delete(fill);
}

// Fetches the missing chunks of `item` from the place's server, if it has one, else from the
// account's other devices: whether it did. Throws FillStoppedError once stopped.
async function fillMissing(item: CollectionItem, options?: FillOptions): Promise<boolean> {
  for (const fill of [...(filler ? [filler] : []), ...fillers]) {
    if (options?.signal?.aborted) throw new FillStoppedError();
    const done = await fill(item, options).catch(() => false);
    if (options?.signal?.aborted) throw new FillStoppedError();
    if (done) return true;
  }
  return false;
}

// The file `ref` of `item`, read; when its chunks are not here, fetched first.
async function readOrFill(item: CollectionItem, ref: FileRef, options?: FillOptions): Promise<Uint8Array | null> {
  const bytes = await readFile(ref);
  if (bytes) return bytes;
  return (await fillMissing(item, options)) ? readFile(ref) : null;
}

/**
 * A file's bytes, whole, or null when its chunks are gone (as after a backup restored without
 * them) and neither its place's server nor another device has them. Those fetched are told to
 * `progress`; `signal` stops the fetch (FillStoppedError), keeping what came.
 */
export const openItem = (item: CollectionItem, options?: FillOptions): Promise<Uint8Array | null> => readOrFill(item, item.file, options);

/** A file's small picture, or null when it has none or it is gone. */
export const openThumb = (item: CollectionItem, options?: FillOptions): Promise<Uint8Array | null> => (item.thumb ? readOrFill(item, item.thumb, options) : Promise.resolve(null));

/**
 * Makes sure every chunk of a file is here before it is read from them as it goes (played, opened
 * with another app, sent): those missing are fetched as openItem fetches them, told to
 * `progress`, stopped by `signal`. Whether the file is whole here now.
 */
export async function fillItemHere(item: CollectionItem, options?: FillOptions): Promise<boolean> {
  if ((await missingOf(item.file)) === 0) return true;
  return fillMissing(item, options);
}

/** Of `items`, those whose every chunk is here: from one list of the folder, none read. */
export async function itemsWhole(items: CollectionItem[]): Promise<CollectionItem[]> {
  const here = new Set(await listFiles(PREFIX));
  return items.filter(({ file }) => Array.from({ length: file.count }, (_, n) => `${PREFIX}${file.id}-${n}`).every((name) => here.has(name)));
}

/** How many chunks of `ref` are not here. */
export async function missingOf(ref: FileRef): Promise<number> {
  const here = await chunksHere(ref.id);
  let missing = 0;
  for (let n = 0; n < ref.count; n++) if (!here.has(n)) missing++;
  return missing;
}

/** A file read a piece at a time, as it is decrypted, for a large one. */
export const itemSource = (item: CollectionItem): Source => refSource(item.file);

/** Whether a file's chunks are still here: a backup restored without them leaves its catalogue naming files that are gone. */
export async function itemThere(item: CollectionItem): Promise<boolean> {
  return (await readChunk(item.file.id, 0)) !== null && (await readChunk(item.file.id, item.file.count - 1)) !== null;
}
