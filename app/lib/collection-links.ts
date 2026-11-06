// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { deleteChunks, readChunk, saveChunk, type FileRef } from '../lock/attachment-files';
import {
  addMissingFiller,
  loadCollection,
  mergeCollection,
  placeIsOpen,
  watchCollections,
  type Collection,
  type CollectionItem,
  type CollectionPlace,
} from '../lock/collection-data';
import { MAX_FILE, type FileOffer } from './attachments';
import { fetchChunk, serverFolder } from './collection-webdav';
import { fromHex } from './crypto';
import { ChunkFetch, type ChunkStore, type ChunkWay, type Wanted } from './sync/chunks';
import { chunkIdsOf, collectionChanges, collectionFrom, collectionOn, type Since } from './sync/collection';
import type { Change, Log } from './sync/log';

// The Collection of a space, or of a hidden place, on the account's other devices (docs/sync.md,
// phase S7), once the owner turned it on there («On my linked devices too», which goes to every
// device of the place): its catalogue in the place's log (lib/sync/collection.ts), its files' chunks
// brought by whatever way is up (lib/sync/chunks.ts), each checked with the file's key before it is
// kept.
//
// - Small pictures come at once, by any way: the same Wi-Fi, the place's server, or the relay
//   (asked of a device that has the file, which puts it there for this one alone, `cfetch` and
//   `cfile`).
// - A whole file comes at once only on the same Wi-Fi; else when it is opened (addMissingFiller):
//   from the place's server, or by the relay when it is not larger than a chat's file.
// - A file deleted on any device is deleted on all, and only so: the log's removal says it. One
//   deleted while it comes stops, and none of its chunks stays.
// - A hidden place's goes only through its own links, sealed with its own key; the space's never
//   names it.

/** What the place's links do for it. */
export type CollectionIo = {
  place: CollectionPlace;
  /** Writes into the place's log what `changesOf` says, worked out on the log as it is. */
  write(changesOf: (log: Log) => readonly Change[]): Promise<boolean>;
  /** The account's devices these links tell, by their ids in the links. */
  peers(): string[];
  /** Asks `peer` to put the files `ids` (their chunks' names) on the relay for this device. */
  ask(peer: string, ids: string[]): Promise<void>;
  /** Tells `peer` where the files it asked for wait on the relay. */
  answer(peer: string, list: { id: string; offer: FileOffer }[]): Promise<void>;
  /** Puts a file kept here on this device's relay, for another of its devices: where it waits. */
  upload(ref: FileRef): Promise<FileOffer>;
  /** Takes a file from the relay, as `ref` names it, into its chunks here. */
  take(ref: FileRef, offer: FileOffer): Promise<void>;
  /** The fast ways on the same Wi-Fi, to the devices that said where they give chunks. */
  ways(): ChunkWay[];
  /** Lets `peer` take the chunks `ids` on the same Wi-Fi: whether it was told. */
  offer(peer: string, ids: string[]): Promise<boolean>;
};

const store: ChunkStore = { read: readChunk, save: saveChunk, drop: deleteChunks };

/** The most files asked of the relay at once. */
const MOST_ASKED = 20;
/** How long a device that was asked has to put the files on the relay. */
const ANSWER_WITHIN = 90_000;

const wantOf = (ref: FileRef): Wanted => ({ id: ref.id, key: fromHex(ref.key), chunk: ref.chunk, count: ref.count });
// Whether a file's chunks seem to be here: they are kept in order, so the first and the last say it (each is checked again as it opens).
const seemsHere = async (ref: FileRef) => (await readChunk(ref.id, ref.count - 1)) !== null && (ref.count === 1 || (await readChunk(ref.id, 0)) !== null);
const samePlace = (a: CollectionPlace, b: CollectionPlace) => a.holder === b.holder && a.space === b.space && a.key.length === b.key.length && a.key.every((x, i) => x === b.key[i]);

export class CollectionSync {
  private readonly io: CollectionIo;
  private readonly since: Since = new Map();
  private readonly fetch = new ChunkFetch(store);
  private readonly stops: (() => void)[] = [];
  // The files asked of the relay, by their chunks' name, until a device says where they wait.
  private readonly asked = new Map<string, { ref: FileRef; answer: Promise<FileOffer | null>; done: (offer: FileOffer | null) => void }>();
  private offered = '';
  // The small pictures asked of the relay already since the place opened: not asked again.
  private readonly relayTried = new Set<string>();
  private bringing: Promise<void> | null = null;
  private writing: Promise<void> = Promise.resolve();
  private again = false;
  private closed = false;

  constructor(io: CollectionIo) {
    this.io = io;
    this.stops.push(
      watchCollections((place, event) => {
        if (event === 'changed' && samePlace(place, io.place)) void this.written().catch(() => undefined);
      }),
      addMissingFiller((item) => this.fill(item)),
    );
  }

  close(): void {
    this.closed = true;
    for (const stop of this.stops) stop();
    for (const { done } of this.asked.values()) done(null);
    this.asked.clear();
  }

  /** Writes into the log what changed in the Collection here (and, with nothing linked, nothing), after what is being written. */
  written(): Promise<void> {
    this.writing = this.writing
      .catch(() => undefined)
      .then(async () => {
        if (this.closed) return;
        const c = await loadCollection(this.io.place);
        await this.io.write((log) => collectionChanges(log, c, this.since));
        if (c.devices) this.soon();
      });
    return this.writing;
  }

  /** What the log took, put in place here: as `whole` says, all of it, or only when the Collection's records changed. */
  async heard(log: Log, touched: boolean): Promise<void> {
    if (this.closed || !touched) return;
    let stopped: CollectionItem[] = [];
    await mergeCollection(this.io.place, (c) => {
      const merged = collectionFrom(log, c, this.since);
      stopped = merged?.dropped ?? [];
      return merged;
    });
    // Deleted while it came: it stops, and keeps nothing.
    for (const item of stopped) {
      await this.fetch.stop(wantOf(item.file)).catch(() => undefined);
      if (item.thumb) await this.fetch.stop(wantOf(item.thumb)).catch(() => undefined);
    }
    if (collectionOn(log)) this.soon();
  }

  // Brings what is missing, and tells the devices what they may take here, after what is under way.
  private soon(): void {
    if (this.bringing) {
      this.again = true;
      return;
    }
    this.bringing = (async () => {
      do {
        this.again = false;
        await this.offerAll().catch(() => undefined);
        await this.bringAll().catch(() => undefined);
      } while (this.again && !this.closed);
    })().finally(() => {
      this.bringing = null;
    });
  }

  /** For the checks: once what is under way is done. */
  async settled(): Promise<void> {
    await this.writing.catch(() => undefined);
    while (this.bringing) await this.bringing;
  }

  private async offerAll(): Promise<void> {
    const c = await loadCollection(this.io.place);
    if (!c.devices) return;
    const here: string[] = [];
    for (const id of chunkIdsOf(c)) {
      const ref = c.items.flatMap((i) => [i.file, ...(i.thumb ? [i.thumb] : [])]).find((r) => r.id === id)!;
      if (await seemsHere(ref)) here.push(id);
    }
    const said = `${this.io.peers().join(',')} ${here.join(',')}`;
    if (said === this.offered) return;
    let all = true;
    for (const peer of this.io.peers()) if (!(await this.io.offer(peer, here).catch(() => false))) all = false;
    if (all) this.offered = said;
  }

  private async bringAll(): Promise<void> {
    const c = await loadCollection(this.io.place);
    if (!c.devices) return;
    const lan = this.io.ways();
    const server = this.serverWay(c);
    const thumbs: FileRef[] = [];
    for (const item of c.items) {
      if (this.closed) return;
      if (item.thumb && !(await seemsHere(item.thumb))) {
        const done = (await this.fetch.bring(wantOf(item.thumb), [...lan, ...server(item.thumb)])).end === 'done';
        if (!done && !this.relayTried.has(item.thumb.id)) {
          this.relayTried.add(item.thumb.id);
          thumbs.push(item.thumb);
        }
      }
      // A whole file at once only on the same Wi-Fi.
      if (lan.length > 0 && !(await seemsHere(item.file))) await this.fetch.bring(wantOf(item.file), lan);
    }
    for (let n = 0; n < thumbs.length && !this.closed; n += MOST_ASKED) await this.byRelay(thumbs.slice(n, n + MOST_ASKED));
  }

  // The place's server as a way, for a file: when it has one, whether this device copies to it or not.
  private serverWay(c: Collection): (ref: FileRef) => ChunkWay[] {
    const at = c.server;
    if (!at) return () => [];
    const folder = serverFolder(at);
    return (ref) => [{ name: 'server', get: (_id, n) => fetchChunk(folder, ref, n) }];
  }

  // A file of this place opened and not here: brought by the ways up, the relay last.
  private async fill(item: CollectionItem): Promise<boolean> {
    // Only for what is open here, as what is opened is.
    if (this.closed || !placeIsOpen(this.io.place)) return false;
    const c = await loadCollection(this.io.place);
    const kept = c.items.find((i) => i.id === item.id && i.file.id === item.file.id);
    if (!c.devices || !kept) return false;
    const ways = [...this.io.ways(), ...this.serverWay(c)(kept.file)];
    if ((await this.fetch.bring(wantOf(kept.file), ways)).end === 'done') return true;
    if (kept.file.size > MAX_FILE) return false;
    await this.byRelay([kept.file]);
    return (await readChunk(kept.file.id, kept.file.count - 1)) !== null && (await this.fetch.bring(wantOf(kept.file), [])).end === 'done';
  }

  // Asks each device to put the files on the relay, and takes them from there as they say.
  private async byRelay(refs: FileRef[]): Promise<void> {
    const peers = this.io.peers();
    if (this.closed || peers.length === 0 || refs.length === 0) return;
    const waits = refs.map((ref) => {
      // Asked already, and not answered yet: the same answer.
      const now = this.asked.get(ref.id);
      if (now) return now.answer;
      let done: (offer: FileOffer | null) => void = () => undefined;
      const answer = new Promise<FileOffer | null>((resolve) => (done = resolve));
      const timer = setTimeout(() => {
          this.asked.delete(ref.id);
        done(null);
      }, ANSWER_WITHIN);
      this.asked.set(ref.id, {
        ref,
        answer,
        done: (offer) => {
          clearTimeout(timer);
          done(offer);
        },
      });
      return answer;
    });
    for (const peer of peers) await this.io.ask(peer, refs.map((r) => r.id)).catch(() => undefined);
    const offers = await Promise.all(waits);
    for (let i = 0; i < refs.length; i++) {
      const offer = offers[i];
      if (!offer || this.closed) continue;
      await this.io.take(refs[i], offer).catch(() => undefined);
    }
  }

  /** A device asked for files kept here, by their chunks' names: put on the relay for it, those this place has whole here. */
  async asking(peer: string, ids: string[]): Promise<void> {
    if (this.closed) return;
    const c = await loadCollection(this.io.place);
    if (!c.devices) return;
    const refs = new Map(c.items.flatMap((i) => [i.file, ...(i.thumb ? [i.thumb] : [])]).map((r) => [r.id, r]));
    const list: { id: string; offer: FileOffer }[] = [];
    for (const id of ids.slice(0, MOST_ASKED)) {
      const ref = refs.get(id);
      if (!ref || ref.size > MAX_FILE) continue;
      try {
        list.push({ id, offer: await this.io.upload(ref) });
      } catch {
        // Not here whole, or the relay cannot take it now: another device may have it.
      }
    }
    if (list.length > 0) await this.io.answer(peer, list);
  }

  /** A device said where files asked for wait on the relay. */
  answered(list: { id: string; offer: FileOffer }[]): void {
    for (const { id, offer } of list) {
      const asked = this.asked.get(id);
      if (!asked) continue;
      this.asked.delete(id);
      asked.done(offer);
    }
  }
}
