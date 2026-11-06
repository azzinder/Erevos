// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { PREFIX, chunksHere, readChunk, saveChunk, type FileRef } from '../lock/attachment-files';
import {
  chunkFiles,
  collectionGeneration,
  FillStoppedError,
  loadCollection,
  noteServerWhole,
  openPlaces,
  placeIsOpen,
  serverWhole,
  setCollectionServer,
  setMissingFiller,
  watchCollections,
  wholeMark,
  type CollectionItem,
  type CollectionPlace,
  type CollectionServer,
  type FillOptions,
} from '../lock/collection-data';

import { openChunk } from './attachments';
import { askServer, cloudFolder, CloudError, cloudStatusText, listFolder, type CloudAnswer, type CloudServer } from './backup-cloud';
import { fromHex, randomBytes, toHex } from './crypto';

// The Collection on a WebDAV server: each space's and hidden place's own choice, off until its
// owner gives a server (lock/collection-data.ts CollectionServer), which may be any that speaks
// WebDAV, Nextcloud, ownCloud and the rest, and each place's own. Its chunks go there as they lie
// on the phone, already encrypted, under the same random names (lock/attachment-files.ts), into a
// subfolder of the folder given whose name is random too: the server can open none of them, and
// sees only how many there are and their sizes, of the three a chunk has. The catalogue, which
// says whose they are, never goes there: it stays sealed in the place, and in its backups.
//
// A copy runs while the place is open, a while after its Collection changed, and soon after it
// opens; it stops when the place closes or locks, and with the panic button. It lists the
// subfolder (PROPFIND), sends each chunk not there, or there with another size, one at a time
// (PUT), each tried again a few times after a while when the network fails, and deletes there the
// chunks the catalogue no longer names (DELETE). Nothing else in the subfolder is touched: only
// names of chunks. So a copy cut short goes on where it stopped the next time, and one with
// nothing new changes nothing.
//
// A file whose chunks are not on this phone, as after a backup restored without them on a new
// phone, is fetched from there as it is opened (fillItem): each chunk only if its size is a
// chunk's and it opens with the file's key as the chunk it should be, so the server can neither
// change nor swap one unseen. The device sync (lib/sync/) can fetch them the same way.
//
// Requests go as backups to a server go (lib/backup-cloud.ts): through Tor as the space's Tor way
// says, and in the desktop app through its shell.

/** How a place's copying to its server goes: bytes of chunks there out of all, whether it runs now, when it was last whole, and why it last failed. */
export type ServerStatus = { running: boolean; done: number; total: number; last: number; error: string };

const CHUNK_FILE = /^erevos-file-[0-9a-f]{32}-\d+$/;

// How long after a change a copy starts, and after the place opens, milliseconds.
const AFTER_CHANGE_MS = 10_000;
const AFTER_OPEN_MS = 5_000;
// How long a request that failed waits before it is tried again, each time.
let retryMs = [2_000, 10_000, 30_000];

/** For the checks: how long a failed request waits before each new try. */
export function setServerRetry(ms: number[]): void {
  retryMs = ms;
}

const nameOf = ({ holder, space }: CollectionPlace) => `${holder}/${space}`;

/** The subfolder the place's chunks go in, with the user name and password. */
export function serverFolder(server: Pick<CollectionServer, 'url' | 'folder' | 'user' | 'password'>): CloudServer {
  return { url: `${server.url}${server.folder}/`, user: server.user, password: server.password };
}

// The server said no, clearly: not tried again now.
class Refused extends CloudError {}

function check(answer: CloudAnswer, fine: number[] = []): void {
  if (fine.includes(answer.status)) return;
  const said = cloudStatusText(answer.status);
  if (!said) return;
  if (answer.status >= 500 && answer.status !== 507) throw new CloudError(said);
  throw new Refused(said);
}

class Stopped extends Error {}

function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new Stopped());
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', stop);
      resolve();
    }, ms);
    const stop = () => {
      clearTimeout(timer);
      reject(new Stopped());
    };
    signal?.addEventListener('abort', stop, { once: true });
  });
}

// `run`, tried again after each of retryMs when it fails but by a clear no of the server.
async function retried<T>(run: () => Promise<T>, signal?: AbortSignal): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    if (signal?.aborted) throw new Stopped();
    try {
      return await run();
    } catch (error) {
      if (error instanceof Refused || attempt >= retryMs.length) throw error;
      await wait(retryMs[attempt], signal);
    }
  }
}

/** Asks the server whether the folder at `address` is there and takes the user name and password. Returns its address as kept. Throws CloudError with why not. */
export async function testCollectionServer(address: string, user: string, password: string): Promise<string> {
  const url = cloudFolder(address);
  check(await askServer({ url, user: user.trim(), password }, 'PROPFIND', '', { headers: { Depth: '0' } }));
  return url;
}

// Makes the place's subfolder on the server, unless it is there.
async function ensureFolder(server: CollectionServer, signal?: AbortSignal): Promise<void> {
  const base: CloudServer = { url: server.url, user: server.user, password: server.password };
  const there = await retried(() => askServer(base, 'PROPFIND', `${server.folder}/`, { headers: { Depth: '0' } }), signal);
  if (there.status !== 404) return check(there);
  // 405: made meanwhile.
  check(await retried(() => askServer(base, 'MKCOL', `${server.folder}/`), signal), [405]);
}

/**
 * Copies the place's Collection to the folder at `address` from now on, with `user` and
 * `password`: after asking the server, which makes the place's subfolder there. The same folder
 * as before keeps its subfolder, so what went there stays. Throws CloudError with why not.
 */
export async function connectCollectionServer(place: CollectionPlace, address: string, user: string, password: string): Promise<CollectionServer> {
  const url = await testCollectionServer(address, user, password);
  const before = (await loadCollection(place)).server;
  const same = before?.url === url;
  const server: CollectionServer = { on: true, url, user: user.trim(), password, folder: same ? before.folder : toHex(randomBytes(12)), last: same ? before.last : 0 };
  await ensureFolder(server);
  await setCollectionServer(place, server);
  return server;
}

/** Turns the place's copies on its server on or off; what is there stays. */
export async function turnCollectionServer(place: CollectionPlace, on: boolean): Promise<void> {
  const server = (await loadCollection(place)).server;
  if (!server || server.on === on) return;
  if (!on) stopServer(place);
  await setCollectionServer(place, { ...server, on });
}

/** Forgets the place's server; what is there stays. */
export async function forgetCollectionServer(place: CollectionPlace): Promise<void> {
  stopServer(place);
  await setCollectionServer(place, null);
}

// Each place's status, and who watches it.
const statuses = new Map<string, ServerStatus>();
const statusWatchers = new Map<string, Set<(status: ServerStatus) => void>>();

/** How the place's copying goes, as far as this run of Erevos knows. */
export function serverStatus(place: CollectionPlace): ServerStatus | null {
  return statuses.get(nameOf(place)) ?? null;
}

/** Tells `watch` how the place's copying goes, each time it changes. Returns how to stop. */
export function watchServerStatus(place: CollectionPlace, watch: (status: ServerStatus) => void): () => void {
  const name = nameOf(place);
  const set = statusWatchers.get(name) ?? new Set();
  set.add(watch);
  statusWatchers.set(name, set);
  return () => set.delete(watch);
}

function setStatus(place: CollectionPlace, status: ServerStatus): void {
  const name = nameOf(place);
  statuses.set(name, status);
  for (const watch of statusWatchers.get(name) ?? []) watch(status);
}

const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error));

/**
 * Copies the place's Collection to its server once, now: sends the chunks not there whole, then
 * deletes there those the catalogue no longer names. Returns how it went; one that failed says why
 * in `error`, and the next one goes on from there. Stops with `signal`.
 */
export async function copyToServer(place: CollectionPlace, signal?: AbortSignal, now: () => number = Date.now): Promise<ServerStatus> {
  const generation = collectionGeneration(place);
  const collection = await loadCollection(place);
  const server = collection.server;
  if (!server?.on) {
    const idle = { running: false, done: 0, total: 0, last: server?.last ?? 0, error: '' };
    setStatus(place, idle);
    return idle;
  }
  const wanted = chunkFiles(collection);
  let total = 0;
  for (const size of wanted.values()) total += size;
  let status: ServerStatus = { running: true, done: 0, total, last: server.last, error: '' };
  setStatus(place, status);
  try {
    await ensureFolder(server, signal);
    const folder = serverFolder(server);
    const there = new Map((await retried(() => listFolder(folder, (name) => CHUNK_FILE.test(name)), signal)).map((file) => [file.name, file.size]));
    let done = 0;
    const missing: [string, number][] = [];
    for (const [name, size] of wanted) {
      if (there.get(name) === size) done += size;
      else missing.push([name, size]);
    }
    status = { ...status, done };
    setStatus(place, status);
    for (const [name, size] of missing) {
      if (signal?.aborted) throw new Stopped();
      const [id, n] = [name.slice(PREFIX.length, PREFIX.length + 32), Number(name.slice(PREFIX.length + 33))];
      const bytes = await readChunk(id, n);
      // Not on this phone either: nothing to send, nor to count.
      if (!bytes || bytes.length !== size) {
        status = { ...status, total: status.total - size };
        continue;
      }
      await retried(async () => check(await askServer(folder, 'PUT', name, { headers: { 'Content-Type': 'application/octet-stream' }, body: bytes })), signal);
      status = { ...status, done: status.done + size };
      setStatus(place, status);
    }
    // Only names of chunks, and only those the catalogue does not name.
    for (const name of there.keys()) {
      if (wanted.has(name)) continue;
      if (signal?.aborted) throw new Stopped();
      await retried(async () => check(await askServer(folder, 'DELETE', name), [404]), signal);
    }
    const last = now();
    serverWhole(place, generation);
    // Kept with the server, for after Erevos starts again: the chunks of the catalogue copied.
    await noteServerWhole(place, server.folder, last, wholeMark(collection)).catch(() => undefined);
    status = { ...status, running: false, last };
  } catch (error) {
    status = { ...status, running: false, error: error instanceof Stopped ? '' : errorText(error) };
  }
  setStatus(place, status);
  return status;
}

/** The chunk `n` of the file `ref` from the server's folder `folder`, if it is there whole and opens with the file's key as that chunk; else null. Throws CloudError when the server cannot be reached. */
export async function fetchChunk(folder: CloudServer, ref: FileRef, n: number): Promise<Uint8Array | null> {
  const answer = await askServer(folder, 'GET', `${PREFIX}${ref.id}-${n}`, { most: ref.chunk });
  if (answer.status === 404) return null;
  check(answer);
  if (answer.bytes.length !== ref.chunk) return null;
  try {
    openChunk(fromHex(ref.key), n, answer.bytes, ref.chunk);
  } catch {
    return null;
  }
  return answer.bytes;
}

/**
 * Fetches from the server's folder `folder` the chunks of `ref` not on this phone, keeping each
 * that opens: how many are still missing. How far it is goes to `progress`, the chunks here
 * already counted as done; `signal` stops it (FillStoppedError) between chunks, and what came
 * stays, so the next fetch goes on from there.
 */
export async function fetchMissingChunks(folder: CloudServer, ref: FileRef, { signal, progress }: FillOptions = {}): Promise<number> {
  const here = await chunksHere(ref.id);
  let done = 0;
  for (let n = 0; n < ref.count; n++) if (here.has(n)) done++;
  const tell = () => progress?.({ done, total: ref.count, bytes: Math.min(ref.size, Math.round((ref.size * done) / ref.count)), size: ref.size });
  tell();
  let missing = 0;
  try {
    for (let n = 0; n < ref.count; n++) {
      if (signal?.aborted) throw new FillStoppedError();
      if (here.has(n)) continue;
      const bytes = await retried(() => fetchChunk(folder, ref, n), signal);
      if (signal?.aborted) throw new FillStoppedError();
      if (!bytes) {
        missing++;
        continue;
      }
      await saveChunk(ref.id, n, bytes);
      done++;
      tell();
    }
  } catch (error) {
    throw error instanceof Stopped ? new FillStoppedError() : error;
  }
  return missing;
}

/**
 * Fetches from the place's server the chunks of `item` (and of its small picture) not on this
 * phone: whether the file is whole here now. False when the place has no server on. How far the
 * file is goes to `progress`; `signal` stops it, keeping what came.
 */
export async function fillItem(place: CollectionPlace, item: CollectionItem, options: FillOptions = {}): Promise<boolean> {
  const collection = await loadCollection(place);
  const server = collection.server;
  const kept = collection.items.find((i) => i.id === item.id && i.file.id === item.file.id);
  if (!server?.on || !kept) return false;
  const folder = serverFolder(server);
  const missing = await fetchMissingChunks(folder, kept.file, options);
  if (kept.thumb) await fetchMissingChunks(folder, kept.thumb, { signal: options.signal }).catch(() => 0);
  return missing === 0;
}

// When a file opened is not here (lock/collection-data.ts openItem, fillItemHere): fetched from
// the server of the open place whose file it is; one stopped stops there.
setMissingFiller(async (item, options) => {
  for (const place of openPlaces()) {
    try {
      if (await fillItem(place, item, options)) return true;
    } catch (error) {
      if (error instanceof FillStoppedError) throw error;
    }
  }
  return false;
});

// The copy waiting to start, or running, of each place.
type Slot = { place: CollectionPlace; timer: ReturnType<typeof setTimeout> | null; stop: AbortController | null; again: boolean };
const slots = new Map<string, Slot>();

/** Copies the place's Collection to its server `after` milliseconds from now, while it is open; one running now goes again once it ends. */
export function scheduleServerCopy(place: CollectionPlace, after = AFTER_CHANGE_MS): void {
  if (!placeIsOpen(place)) return;
  const name = nameOf(place);
  const slot: Slot = slots.get(name) ?? { place, timer: null, stop: null, again: false };
  slots.set(name, slot);
  slot.place = place;
  if (slot.stop) {
    slot.again = true;
    return;
  }
  if (slot.timer) clearTimeout(slot.timer);
  slot.timer = setTimeout(() => void start(name, slot), after);
  (slot.timer as { unref?: () => void }).unref?.();
}

async function start(name: string, slot: Slot): Promise<void> {
  slot.timer = null;
  if (slots.get(name) !== slot || !placeIsOpen(slot.place)) return;
  const stop = new AbortController();
  slot.stop = stop;
  try {
    await copyToServer(slot.place, stop.signal);
  } catch {
    // Its status says why.
  }
  slot.stop = null;
  if (slot.again && !stop.signal.aborted) {
    slot.again = false;
    scheduleServerCopy(slot.place);
  }
}

function stopServer(place: CollectionPlace): void {
  const name = nameOf(place);
  const slot = slots.get(name);
  if (!slot) return;
  if (slot.timer) clearTimeout(slot.timer);
  slot.stop?.abort();
  slots.delete(name);
}

/** The space opened: its Collection is copied to its server soon, if it has one. */
export function collectionServerOpened(): void {
  for (const place of openPlaces()) scheduleServerCopy(place, AFTER_OPEN_MS);
}

/** The space locked or closed, or the panic button: every copy stops, and none starts until a place opens again. */
export function stopCollectionServers(): void {
  for (const slot of [...slots.values()]) stopServer(slot.place);
}

watchCollections((place, event) => {
  if (event === 'closed') stopServer(place);
  else scheduleServerCopy(place, event === 'opened' ? AFTER_OPEN_MS : AFTER_CHANGE_MS);
});
