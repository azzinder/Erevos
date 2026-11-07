// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { itemSource, type CollectionItem } from '../lock/collection-data';
import type { PlayerState, Repeat } from '../modules/erevos-collection';
import { MOST_IN_MEMORY, TooLargeToOpenError, memoryUri, onCollectionMemoryDropped, openItemUri, releaseMemoryUri } from './collection-memory';
import { jumpTo, newQueue, nextIndex, previousIndex, setRepeat, setShuffle, type Queue } from './collection-queue';
import { playKind, playType } from './collection-view';
import { readTags, type MediaTags } from './media-tags';

// The Collection's music and videos in the web build: the desktop app, a browser (an iPhone's
// home-screen app too) and Sailfish OS (lib/collection-play.ts plays them through here there): one
// HTML media element, which plays a file of the list from a blob: address of its bytes, decrypted
// whole into memory (lib/collection-memory.ts, a Blob of its chunks' pieces), never onto the disk. Only the file
// playing is held; the next is opened as it starts, and the one before let go of. A file larger
// than MOST_IN_MEMORY is not played. The element is shown only for a video, on the whole window
// (components/collection-player.tsx attachDeskVideo), with the browser's own controls; music plays
// with it out of sight. There is no notice and no lock screen: the list stops when the space locks
// or closes, and with the panic button (dropCollectionMemory lets go of everything). Its state is
// told in the same shape as the Android player's (modules/erevos-collection PlayerState).
//
// The list goes as lib/collection-queue.ts says: shuffled or not, repeated or not, at the speed
// chosen; a file starts where it was left the first time it plays in the list (`resume`), and where
// each got to is kept here by its place in the list, for lib/collection-play.ts to take and keep
// sealed (deskTakePositions). What a file says of itself (its title, artist, album and cover) is
// read from its first chunks (lib/media-tags.ts), for the player's screen.

type Listener = (state: PlayerState) => void;

/** How much of a file's start is read for its tags. */
const TAGS_HEAD = 1024 * 1024;

let media: HTMLVideoElement | null = null;
let list: CollectionItem[] = [];
let resumes: number[] = [];
let queue: Queue = newQueue(0, 0);
let index = -1;
let video = false;
let shown: string | null = null;
let error: string | null = null;
let ended = false;
let buffering = false;
let speed = 1;
let tags: MediaTags = {};
let art: string | null = null;
const resumed = new Set<number>();
const positions = new Map<number, [number, number]>();
// Each file opened counts one up, so a file that took long to decrypt does not play after another was asked for.
let turn = 0;
const listeners = new Set<Listener>();

/** The file at `at` in the list playing, or null. */
export const deskItem = (at: number): CollectionItem | null => list[at] ?? null;

/** The files of the list playing, in its order. */
export const deskList = (): CollectionItem[] => list;

const durationNow = (m: HTMLVideoElement | null) => (m && Number.isFinite(m.duration) ? Math.round(m.duration * 1000) : -1);

/** The player's state now. */
export function deskState(): PlayerState {
  const m = media;
  return {
    active: index >= 0,
    playing: !!m && index >= 0 && !m.paused && !m.ended,
    index,
    count: list.length,
    position: m && index >= 0 ? Math.round(m.currentTime * 1000) : 0,
    duration: durationNow(m),
    video,
    buffering,
    ended,
    error,
    shuffle: queue.shuffle,
    repeat: queue.repeat,
    speed,
    hasNext: index >= 0 && nextIndex(queue) !== null,
    hasPrevious: index >= 0 && previousIndex(queue) !== null,
    title: tags.title ?? null,
    artist: tags.artist ?? null,
    album: tags.album ?? null,
    artwork: !!art,
  };
}

function tell(): void {
  const state = deskState();
  listeners.forEach((listener) => listener(state));
}

function element(): HTMLVideoElement {
  if (media) return media;
  const m = document.createElement('video');
  m.preload = 'auto';
  m.playsInline = true;
  m.controls = true;
  m.style.width = '100%';
  m.style.height = '100%';
  m.style.background = '#000000';
  m.style.objectFit = 'contain';
  for (const name of ['play', 'pause', 'durationchange', 'seeked', 'ratechange']) m.addEventListener(name, tell);
  m.addEventListener('loadedmetadata', () => {
    m.playbackRate = speed;
    const from = resumes[index] ?? 0;
    if (from > 0 && !resumed.has(index)) {
      resumed.add(index);
      m.currentTime = from / 1000;
    }
    tell();
  });
  m.addEventListener('waiting', () => {
    buffering = true;
    tell();
  });
  m.addEventListener('playing', () => {
    buffering = false;
    tell();
  });
  m.addEventListener('ended', () => {
    positions.set(index, [0, durationNow(m)]);
    const next = nextIndex(queue, true);
    if (next === null) {
      ended = true;
      tell();
    } else if (next === index) {
      m.currentTime = 0;
      void m.play().catch(() => undefined);
    } else void open(next);
  });
  m.addEventListener('error', () => {
    if (!m.getAttribute('src')) return;
    error = 'MEDIA_ERROR';
    tell();
  });
  media = m;
  return m;
}

function letGo(): void {
  if (media) {
    if (index >= 0 && media.getAttribute('src') && !media.ended) positions.set(index, [Math.round(media.currentTime * 1000), durationNow(media)]);
    media.pause();
    media.removeAttribute('src');
    media.load();
  }
  if (shown) releaseMemoryUri(shown);
  shown = null;
  if (art) releaseMemoryUri(art);
  art = null;
  tags = {};
}

// What the file says of itself, from its first chunks, while it is the one playing.
async function readTagsOf(item: CollectionItem, mine: number): Promise<void> {
  try {
    const source = itemSource(item);
    const head = await source.read(0, Math.min(TAGS_HEAD, source.size));
    const read = readTags(head);
    if (mine !== turn) return;
    tags = { title: read.title, artist: read.artist, album: read.album };
    if (read.picture) art = memoryUri(read.picture.bytes, read.picture.mime);
    tell();
  } catch {
    // No tags: the screen shows the file's name.
  }
}

async function open(at: number): Promise<void> {
  const item = list[at];
  if (!item) return;
  const mine = ++turn;
  letGo();
  index = at;
  queue = jumpTo(queue, at);
  video = playKind(item) === 'video';
  error = null;
  ended = false;
  buffering = true;
  tell();
  void readTagsOf(item, mine);
  let uri: string | null = null;
  try {
    uri = await openItemUri(item, playType(item));
  } catch {
    uri = null;
  }
  if (mine !== turn) {
    if (uri) releaseMemoryUri(uri);
    return;
  }
  buffering = false;
  if (!uri) {
    error = 'FILE_GONE';
    tell();
    return;
  }
  const m = element();
  shown = uri;
  m.src = shown;
  try {
    await m.play();
  } catch {
    // Paused: the file is ready, a press on play starts it; an error is told by its event.
  }
  tell();
}

/**
 * Plays `items` from `start`, each from where it was left (`resume`, ms by place in `items`), with
 * the order and repeat of the list before: only those small enough to hold in memory; throws
 * TooLargeToOpenError when the one asked for is not.
 */
export async function deskPlay(items: CollectionItem[], start: number, resume: number[] = []): Promise<void> {
  const asked = items[start];
  if (!asked) return;
  if (asked.file.size > MOST_IN_MEMORY) throw new TooLargeToOpenError();
  const kept = items.map((item, i) => ({ item, from: resume[i] ?? 0 })).filter(({ item }) => item.file.size <= MOST_IN_MEMORY);
  list = kept.map((k) => k.item);
  resumes = kept.map((k) => k.from);
  resumed.clear();
  positions.clear();
  const first = Math.max(0, list.findIndex((i) => i.id === asked.id));
  queue = newQueue(list.length, first, queue.shuffle, queue.repeat);
  await open(first);
}

export function deskPause(): void {
  media?.pause();
}

export function deskResume(): void {
  if (!media || index < 0) return;
  if (ended) {
    ended = false;
    media.currentTime = 0;
  }
  void media.play().catch(() => undefined);
}

export function deskNext(): void {
  const next = index >= 0 ? nextIndex(queue) : null;
  if (next !== null) void open(next);
}

export function deskPrevious(): void {
  if (!media || index < 0) return;
  // As players do: back to the start of this one, unless it just began.
  const before = previousIndex(queue);
  if (before !== null && media.currentTime < 3) void open(before);
  else media.currentTime = 0;
}

export function deskSeek(ms: number): void {
  if (media && index >= 0) media.currentTime = Math.max(0, ms / 1000);
}

/** To the file at `at` in the list, where it was left if it was not played yet. */
export function deskJump(at: number): void {
  if (at >= 0 && at < list.length) void open(at);
}

export function deskShuffle(on: boolean): void {
  queue = setShuffle(queue, on);
  tell();
}

export function deskRepeat(mode: Repeat): void {
  queue = setRepeat(queue, mode);
  tell();
}

export function deskSpeed(to: number): void {
  speed = Math.min(2, Math.max(0.5, to));
  if (media) media.playbackRate = speed;
  tell();
}

/** An address of the cover inside the file playing, or null. */
export const deskArtwork = (): string | null => art;

/** Where the files of the list got to since last asked, by their place in it; taken, they are forgotten here. */
export function deskTakePositions(): { index: number; position: number; duration: number }[] {
  if (media && index >= 0 && media.getAttribute('src')) positions.set(index, [ended ? 0 : Math.round(media.currentTime * 1000), durationNow(media)]);
  const out = [...positions].map(([at, [position, duration]]) => ({ index: at, position, duration }));
  positions.clear();
  return out;
}

/** Stops the list: the file playing is let go of. */
export function deskStop(): void {
  turn++;
  letGo();
  list = [];
  resumes = [];
  index = -1;
  video = false;
  error = null;
  ended = false;
  buffering = false;
  media?.remove();
  tell();
}

/** Calls `listener` with each change of the player's state, until the function it gives is called. */
export function onDeskPlayer(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Shows the video playing inside `box` (the whole window's), until the function it gives is called. */
export function attachDeskVideo(box: HTMLElement): () => void {
  const m = element();
  box.appendChild(m);
  return () => {
    if (m.parentElement === box) m.remove();
  };
}

// Everything the Collection held in memory goes (the space locked, the panic button): the list
// stops, and nothing of where it was stays.
onCollectionMemoryDropped(() => {
  if (index >= 0 || shown) deskStop();
  positions.clear();
});
