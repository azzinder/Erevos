// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { checkedRounds, type Rounds } from '../lib/chat-parts';

import { HISTORY_CHUNKS, isFileRef, type FileRef } from './attachment-files';
import { sealedFile, type Holder } from './sealed-file';

// Imported chats shared with a contact whose files still go, or still come, in rounds (lib/share-rounds.ts):
// how far each is, kept in the place it belongs to, the space or its hidden chats, sealed with its
// key as its archive is (lock/archive.ts), so it goes on after Erevos stops and starts again. Only
// how far: the files themselves are named, by their ids and keys, in a file kept as a message's file
// is (`list`, lock/attachment-files.ts), written once when the share begins, so the value here stays
// small as it changes, chunk after chunk.

/** The ids of chunks on a relay, hex, each this long. */
export const ID_HEX = 48;

/**
 * A share going from here: its id (`s`), to whom (`to`, their identity key, hex), the tag of the
 * message its words went in, its files here (`list`: their ids, how many chunks each has and their
 * size, in the order their chunks go), and how many chunks there are in all. `ready` once the other
 * phone said it keeps it; `took`, how many chunks it took, in order. `out`: the ids on our relay
 * (`r`) of the chunks put there after those, not taken yet, ID_HEX each, zeros for a chunk of a
 * file no longer here; `said`, how many of them the other phone was told. `put`, when the first of
 * them went up; `heard`, when the other phone last said how far it is; `again`, when they were last
 * said again for want of word; `at`, when it began.
 */
export type OutShare = {
  s: string;
  to: string;
  tag: string;
  list: FileRef;
  total: number;
  ready?: true;
  took: number;
  r: string;
  out: string;
  said: number;
  put: number;
  heard: number;
  again?: number;
  at: number;
};

/**
 * A share coming here: its id (`s`), from whom (`by`), the tag of the message its words came in,
 * its files as they are kept here (`list`, null for one that stays behind), how many chunks and
 * files there are, and how many of the files are whole here. `taken`: how many chunks came, in
 * order. `wait`: where the next ones wait, as the sharer said (from their place `at`, on the relay,
 * their ids). `skip`: the files, by their place, whose chunks are taken off the relay but not kept,
 * their chat deleted meanwhile or a chunk changed on the way. `told`: `taken` as the sharer was
 * last told (-1 before they heard it keeps it), and when (`toldAt`). `chats`: the ids its chats have
 * among the imported ones here.
 */
export type InShare = {
  s: string;
  by: string;
  tag: string;
  list: FileRef;
  total: number;
  files: number;
  whole: number;
  taken: number;
  wait: [at: number, relay: string, ids: string][];
  skip: number[];
  told: number;
  toldAt: number;
  chats: string[];
};

/**
 * The shares going and coming; what the other phones said of them, not taken in yet (`heard`, by
 * whom); the shared chats that came, to keep (`packs`: who, and the tag of the message); and the
 * shares kept whole lately, to say so again to a sharer who did not hear it (`done`).
 */
export type RoundsData = {
  out: OutShare[];
  in: InShare[];
  heard: [identity: string, rounds: Rounds][];
  packs: [identity: string, tag: string][];
  done: [identity: string, s: string, total: number][];
};

export const EMPTY: RoundsData = { out: [], in: [], heard: [], packs: [], done: [] };

const FILE = 'erevos-share-rounds';
const BLOCK = 2048;
// The most kept of what was heard, of the shared chats to keep, and of the shares done.
const MOST_HEARD = 500;
const MOST_PACKS = 100;
export const MOST_DONE = 20;
// The most places told where chunks wait, of one share.
export const MOST_WAIT = 16;

const ID = /^[0-9a-f]{32}$/;
const IDENTITY = /^[0-9a-f]{64}$/;
const TAG = /^[0-9a-f]{12}$/;
const IDS = /^(?:[0-9a-f]{48})*$/;
const count = (v: unknown): v is number => Number.isSafeInteger(v) && (v as number) >= 0;
const text = (v: unknown, most = 512): v is string => typeof v === 'string' && v.length <= most;
const listOk = (v: unknown): v is FileRef => isFileRef(v, HISTORY_CHUNKS) && !(v as FileRef).from;

function checkedOut(value: unknown): OutShare | null {
  const v = value as Partial<OutShare> | null;
  if (!v || typeof v !== 'object' || !text(v.s) || !ID.test(v.s) || !text(v.to) || !IDENTITY.test(v.to) || !text(v.tag)) return null;
  if (!listOk(v.list) || !count(v.total) || !count(v.took) || v.took > v.total || !text(v.r) || typeof v.out !== 'string' || !IDS.test(v.out)) return null;
  const outs = v.out.length / ID_HEX;
  return {
    s: v.s,
    to: v.to,
    tag: TAG.test(v.tag) ? v.tag : '',
    list: v.list,
    total: v.total,
    ...(v.ready === true ? { ready: true as const } : {}),
    took: v.took,
    r: v.r,
    out: v.took + outs <= v.total ? v.out : '',
    said: count(v.said) ? Math.min(v.said, outs) : 0,
    put: count(v.put) ? v.put : 0,
    heard: count(v.heard) ? v.heard : 0,
    ...(count(v.again) && v.again > 0 ? { again: v.again } : {}),
    at: count(v.at) ? v.at : 0,
  };
}

const isWait = (w: unknown): w is InShare['wait'][number] =>
  Array.isArray(w) && w.length === 3 && count(w[0]) && text(w[1]) && typeof w[2] === 'string' && w[2].length > 0 && IDS.test(w[2]);

function checkedIn(value: unknown): InShare | null {
  const v = value as Partial<InShare> | null;
  if (!v || typeof v !== 'object' || !text(v.s) || !ID.test(v.s) || !text(v.by) || !IDENTITY.test(v.by) || !text(v.tag)) return null;
  if (!listOk(v.list) || !count(v.total) || !count(v.taken) || v.taken > v.total || !count(v.files) || !count(v.whole)) return null;
  return {
    s: v.s,
    by: v.by,
    tag: TAG.test(v.tag) ? v.tag : '',
    list: v.list,
    total: v.total,
    files: v.files,
    whole: Math.min(v.whole, v.files),
    taken: v.taken,
    wait: Array.isArray(v.wait) ? v.wait.filter(isWait).slice(-MOST_WAIT) : [],
    skip: Array.isArray(v.skip) ? v.skip.filter(count) : [],
    told: Number.isSafeInteger(v.told) && (v.told as number) >= -1 ? (v.told as number) : -1,
    toldAt: count(v.toldAt) ? v.toldAt : 0,
    chats: Array.isArray(v.chats) ? v.chats.filter((id): id is string => text(id, 64)) : [],
  };
}

function checked(value: unknown): RoundsData {
  const v = (value ?? {}) as Partial<Record<keyof RoundsData, unknown>>;
  const list = (items: unknown) => (Array.isArray(items) ? items : []);
  return {
    out: list(v.out).map(checkedOut).filter((s): s is OutShare => s !== null),
    in: list(v.in).map(checkedIn).filter((s): s is InShare => s !== null),
    heard: list(v.heard)
      .flatMap((h): RoundsData['heard'] => {
        const rounds = Array.isArray(h) && text(h[0]) && IDENTITY.test(h[0]) ? checkedRounds(h[1]) : null;
        return rounds ? [[h[0] as string, rounds]] : [];
      })
      .slice(-MOST_HEARD),
    packs: list(v.packs)
      .filter((p): p is [string, string] => Array.isArray(p) && text(p[0]) && IDENTITY.test(p[0]) && text(p[1]) && TAG.test(p[1]))
      .slice(-MOST_PACKS),
    done: list(v.done)
      .filter((d): d is [string, string, number] => Array.isArray(d) && text(d[0]) && IDENTITY.test(d[0]) && text(d[1]) && ID.test(d[1]) && count(d[2]))
      .slice(-MOST_DONE),
  };
}

const store = sealedFile<RoundsData>({ name: FILE, empty: EMPTY, checked, block: BLOCK });

/** Where a place keeps its shares: the space's or its hidden chats', with its key. */
export type RoundsPlace = { holder: Holder; space: number; key: Uint8Array };

const chains = new Map<string, Promise<unknown>>();
const placeName = ({ holder, space }: RoundsPlace) => `${holder}/${space}`;

/** The shares of a place, as the phone holds them now. */
export function loadRounds(place: RoundsPlace): Promise<RoundsData> {
  return store.load(place.holder, place.space, place.key);
}

/**
 * Changes a place's shares as the phone holds them now, after any change asked for before; `make`
 * returns them changed, or null to leave them as they are. Returns them as they are after.
 */
export function changeRounds(place: RoundsPlace, make: (data: RoundsData) => RoundsData | null): Promise<RoundsData> {
  const name = placeName(place);
  const run = (chains.get(name) ?? Promise.resolve())
    .catch(() => undefined)
    .then(async () => {
      const data = await loadRounds(place);
      const next = make(data);
      if (!next) return data;
      await store.save(place.holder, place.space, place.key, next);
      return next;
    });
  chains.set(name, run);
  return run;
}

/** What was heard, kept for the next round; the oldest go past MOST_HEARD. */
export function withHeard(data: RoundsData, identity: string, rounds: Rounds): RoundsData {
  return { ...data, heard: [...data.heard, [identity, rounds] as [string, Rounds]].slice(-MOST_HEARD) };
}

/** A shared chat that came, to keep; once. */
export function withPack(data: RoundsData, identity: string, tag: string): RoundsData | null {
  if (data.packs.some(([who, said]) => who === identity && said === tag)) return null;
  return { ...data, packs: [...data.packs, [identity, tag] as [string, string]].slice(-MOST_PACKS) };
}
