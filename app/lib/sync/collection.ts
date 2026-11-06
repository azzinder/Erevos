// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import type { Collection, CollectionFolder, CollectionItem, CollectionServer } from '../../lock/collection-data';
import { isThere, type Change, type Json, type Log } from './log';

// The Collection's catalogue in the place's log (docs/sync.md, phase S7): each file a record of
// kind `collection` by `i` and its id, with its file as kept (`file`, its key among it), its small
// picture (`thumb`), its folder and when it came; each folder by `d` and its id, with its name;
// the server its chunks are copied to as record `server` (its address, user name, password and
// folder, so the other devices can fetch from it too); and whether the Collection goes to the
// devices at all as record `on`. The files themselves never go in the log: their chunks come by
// lib/sync/chunks.ts.
//
// - A change made here is written as it is made: a field only when it changed here since the log
//   last said it (`since`, or else when it was made, by its `at`), so what came is never written
//   back over a newer one.
// - What the log says is put in place here field by field; a file or folder the log removed is
//   deleted here, and only then: one the log never named stays (it was made here, and goes in with
//   the next write), so nothing is deleted for being missing.

const KIND = 'collection';
const ID = /^[0-9a-f]{32}$/;

const itemId = (id: string) => `i${id}`;
const folderId = (id: string) => `d${id}`;

/** What this device last took from the log, by record: so a change here is told apart from one that came. */
export type Since = Map<string, string>;

type Entry = { add?: { t: number }; del?: { t: number }; f: Record<string, { v: Json; at: { t: number } }> };

const entryOf = (log: Log, id: string): Entry | undefined => log.data[KIND]?.[id] as Entry | undefined;
const removed = (log: Log, id: string) => entryOf(log, id) !== undefined && !isThere(log, KIND, id);
const latest = (e: Entry | undefined) => Math.max(e?.add?.t ?? 0, ...Object.values(e?.f ?? {}).map((f) => f.at.t));
const same = (a: Json | undefined, b: Json | undefined) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

function itemFields(item: CollectionItem): Record<string, Json> {
  return { file: item.file as unknown as Json, thumb: (item.thumb ?? null) as unknown as Json, folder: item.folder, added: item.added };
}

function serverField(server: CollectionServer | undefined): Json {
  return server ? { url: server.url, user: server.user, password: server.password, folder: server.folder } : null;
}

const fingerprint = (fields: Record<string, Json>) => JSON.stringify(fields);

// The fields of a record changed here since the log last said them, which what comes leaves as they are, to be written next.
function changedHere(since: Since, id: string, here: Record<string, Json>, at: number, e: Entry): Set<string> {
  const was = since.get(id);
  const before = was !== undefined ? (JSON.parse(was) as Record<string, Json>) : null;
  const out = new Set<string>();
  for (const [f, v] of Object.entries(here)) {
    if (same(e.f[f]?.v, v)) continue;
    if (before ? !same(before[f], v) : at >= (e.f[f]?.at.t ?? 0)) out.add(f);
  }
  return out;
}

// The changes that make a record say `fields`, those changed here since the log last said them,
// field by field; `since` then says the record as the log will after them.
function recordChanges(log: Log, id: string, fields: Record<string, Json>, at: number, since: Since): Change[] {
  if (removed(log, id)) return [];
  const e = entryOf(log, id);
  if (!e || !isThere(log, KIND, id)) {
    since.set(id, fingerprint(fields));
    return [{ k: KIND, id, x: 'add' }, ...Object.entries(fields).map(([f, v]) => ({ k: KIND, id, f, v }))];
  }
  const mine = changedHere(since, id, fields, at, e);
  const after: Record<string, Json> = {};
  for (const f of Object.keys(fields)) after[f] = mine.has(f) ? fields[f] : (e.f[f]?.v ?? null);
  since.set(id, fingerprint(after));
  return [...mine].map((f) => ({ k: KIND, id, f, v: fields[f] }));
}

/** What to write into the log for the Collection as it is here: none while it does not go to the devices, but its switch. */
export function collectionChanges(log: Log, c: Collection, since: Since): Change[] {
  const changes: Change[] = [];
  const on = c.devices === true;
  const logOn = isThere(log, KIND, 'on') ? entryOf(log, 'on')?.f.v?.v === true : false;
  const onWas = since.get('on');
  if (on !== logOn && (onWas === undefined ? on : onWas !== String(on))) {
    if (!isThere(log, KIND, 'on')) changes.push({ k: KIND, id: 'on', x: 'add' });
    changes.push({ k: KIND, id: 'on', f: 'v', v: on });
  }
  if (!on) return changes;
  for (const folder of c.folders) changes.push(...recordChanges(log, folderId(folder.id), { name: folder.name }, folder.at, since));
  for (const item of c.items) changes.push(...recordChanges(log, itemId(item.id), itemFields(item), item.at, since));
  const server = serverField(c.server);
  const logServer = entryOf(log, 'server')?.f.v?.v;
  const serverWas = since.get('server');
  if (!same(server, logServer) && (serverWas === undefined ? server !== null || isThere(log, KIND, 'server') : serverWas !== JSON.stringify(server))) {
    if (!isThere(log, KIND, 'server')) changes.push({ k: KIND, id: 'server', x: 'add' });
    changes.push({ k: KIND, id: 'server', f: 'v', v: server });
  }
  for (const gone of c.gone) {
    for (const id of [itemId(gone.id), folderId(gone.id)]) if (isThere(log, KIND, id)) changes.push({ k: KIND, id, x: 'del' });
  }
  return changes;
}

/** Whether the log says the Collection goes to the devices. */
export function collectionOn(log: Log): boolean {
  return isThere(log, KIND, 'on') && entryOf(log, 'on')?.f.v?.v === true;
}

/**
 * The Collection as the log says it, from `c` as it is here: the next one and the files it lets go
 * of, or null when the log changes nothing. `since` learns what was taken.
 */
export function collectionFrom(log: Log, c: Collection, since: Since): { next: Collection; dropped: CollectionItem[] } | null {
  let changed = false;
  let next: Collection = c;
  const on = collectionOn(log);
  if (entryOf(log, 'on')) {
    since.set('on', String(on));
    if ((c.devices === true) !== on) {
      changed = true;
      const { devices: _was, ...rest } = next;
      next = on ? { ...rest, devices: true } : rest;
    }
  }
  if (!on) return changed ? { next, dropped: [] } : null;
  const records = log.data[KIND] ?? {};
  const now = (id: string, f: string) => (records[id] as Entry | undefined)?.f[f];

  // Folders first, so the files find theirs.
  let folders = [...next.folders];
  const goneIds: string[] = [];
  for (const id of Object.keys(records)) {
    if (!id.startsWith('d') || !ID.test(id.slice(1))) continue;
    const fid = id.slice(1);
    const here = folders.find((f) => f.id === fid);
    if (!isThere(log, KIND, id)) {
      if (here) {
        folders = folders.filter((f) => f.id !== fid);
        goneIds.push(fid);
        changed = true;
      }
      since.delete(id);
      continue;
    }
    const name = now(id, 'name');
    if (typeof name?.v !== 'string') continue;
    const mine = here ? changedHere(since, id, { name: here.name }, here.at, records[id] as Entry) : new Set<string>();
    since.set(id, fingerprint({ name: name.v }));
    if (here?.name === name.v || mine.has('name')) continue;
    const folder: CollectionFolder = { id: fid, name: name.v, at: name.at.t };
    folders = here ? folders.map((f) => (f.id === fid ? folder : f)) : [...folders, folder];
    changed = true;
  }
  const folderIds = new Set(folders.map((f) => f.id));

  let items = [...next.items];
  const dropped: CollectionItem[] = [];
  for (const id of Object.keys(records)) {
    if (!id.startsWith('i') || !ID.test(id.slice(1))) continue;
    const iid = id.slice(1);
    const here = items.find((i) => i.id === iid);
    if (!isThere(log, KIND, id)) {
      if (here) {
        items = items.filter((i) => i.id !== iid);
        dropped.push(here);
        goneIds.push(iid);
        changed = true;
      }
      since.delete(id);
      continue;
    }
    const file = now(id, 'file')?.v;
    const added = now(id, 'added')?.v;
    if (!file || typeof file !== 'object' || typeof added !== 'number') continue;
    const thumb = now(id, 'thumb')?.v;
    const folder = now(id, 'folder')?.v;
    const fields: Record<string, Json> = { file, thumb: thumb ?? null, folder: typeof folder === 'string' ? folder : '', added };
    // What changed here and is not written yet stays.
    if (here) for (const f of changedHere(since, id, itemFields(here), here.at, records[id] as Entry)) fields[f] = itemFields(here)[f];
    since.set(id, fingerprint({ file, thumb: thumb ?? null, folder: typeof folder === 'string' ? folder : '', added }));
    const item = {
      id: iid,
      file: fields.file,
      ...(fields.thumb && typeof fields.thumb === 'object' ? { thumb: fields.thumb } : {}),
      folder: typeof fields.folder === 'string' && folderIds.has(fields.folder) ? fields.folder : '',
      added: fields.added,
      at: Math.max(latest(records[id] as Entry), here?.at ?? 0),
    } as unknown as CollectionItem;
    if (here && fingerprint(itemFields(here)) === fingerprint(itemFields(item))) continue;
    // Another file in its place (as cannot be made here): the chunks of the one before go.
    if (here && here.file.id !== item.file.id) dropped.push(here);
    items = here ? items.map((i) => (i.id === iid ? item : i)) : [...items, item];
    changed = true;
  }
  // A folder gone: its files go to the top, as there.
  if (folders.length !== next.folders.length) items = items.map((i) => (i.folder && !folderIds.has(i.folder) ? { ...i, folder: '' } : i));

  let server = next.server;
  const serverEntry = entryOf(log, 'server');
  if (serverEntry) {
    const v = isThere(log, KIND, 'server') ? serverEntry.f.v?.v : null;
    since.set('server', JSON.stringify(v ?? null));
    if (!same(serverField(server), v ?? null)) {
      changed = true;
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        const given = v as Record<string, Json>;
        // Copying to it is each device's own choice; fetching from it any device does.
        server = { on: server?.on === true && server.folder === given.folder, url: String(given.url), user: String(given.user), password: String(given.password), folder: String(given.folder), last: 0 };
      } else server = undefined;
    }
  }
  if (!changed) return null;
  const { server: _server, ...rest } = next;
  const gone = goneIds.length > 0 ? [...next.gone, ...goneIds.map((id) => ({ id, at: Date.now() }))] : next.gone;
  return { next: { ...rest, folders, items, gone, ...(server ? { server } : {}) }, dropped };
}

/** The ids of the files' chunks (and their small pictures') the log names, to give the devices that may take them. */
export function chunkIdsOf(c: Pick<Collection, 'items'>): string[] {
  return [...new Set(c.items.flatMap((i) => [i.file.id, ...(i.thumb ? [i.thumb.id] : [])]))];
}
