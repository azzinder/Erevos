// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { openItem, type CollectionItem } from '../lock/collection-data';
import type { PlayerState } from '../modules/erevos-collection';
import { MOST_IN_MEMORY, TooLargeToOpenError, memoryUri, onCollectionMemoryDropped, releaseMemoryUri } from './collection-memory';

// The Collection's music and videos in the desktop app (lib/collection-play.ts plays them through
// here there): one HTML media element, which plays a file of the list from a blob: address of its
// bytes, decrypted whole into memory (lib/collection-memory.ts), never onto the disk. Only the file
// playing is held; the next is opened as it starts, and the one before let go of. A file larger
// than MOST_IN_MEMORY is not played. The element is shown only for a video, on the whole window
// (components/collection-player.tsx attachDeskVideo), with Chromium's own controls; music plays
// with it out of sight. There is no notice and no lock screen: the list stops when the space locks
// or closes, and with the panic button (dropCollectionMemory lets go of everything). Its state is
// told in the same shape as the Android player's (modules/erevos-collection PlayerState).

type Listener = (state: PlayerState) => void;

let media: HTMLVideoElement | null = null;
let list: CollectionItem[] = [];
let index = -1;
let video = false;
let shown: string | null = null;
let error: string | null = null;
let ended = false;
let buffering = false;
// Each file opened counts one up, so a file that took long to decrypt does not play after another was asked for.
let turn = 0;
const listeners = new Set<Listener>();

/** The file at `at` in the list playing, or null. */
export const deskItem = (at: number): CollectionItem | null => list[at] ?? null;

/** The player's state now. */
export function deskState(): PlayerState {
  const m = media;
  const duration = m && Number.isFinite(m.duration) ? Math.round(m.duration * 1000) : -1;
  return {
    active: index >= 0,
    playing: !!m && index >= 0 && !m.paused && !m.ended,
    index,
    count: list.length,
    position: m && index >= 0 ? Math.round(m.currentTime * 1000) : 0,
    duration,
    video,
    buffering,
    ended,
    error,
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
  for (const name of ['play', 'pause', 'durationchange', 'seeked', 'loadedmetadata']) m.addEventListener(name, tell);
  m.addEventListener('waiting', () => {
    buffering = true;
    tell();
  });
  m.addEventListener('playing', () => {
    buffering = false;
    tell();
  });
  m.addEventListener('ended', () => {
    if (index < list.length - 1) void open(index + 1);
    else {
      ended = true;
      tell();
    }
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
    media.pause();
    media.removeAttribute('src');
    media.load();
  }
  if (shown) releaseMemoryUri(shown);
  shown = null;
}

async function open(at: number): Promise<void> {
  const item = list[at];
  if (!item) return;
  const mine = ++turn;
  letGo();
  index = at;
  error = null;
  ended = false;
  buffering = true;
  tell();
  let bytes: Uint8Array | null = null;
  try {
    bytes = await openItem(item);
  } catch {
    bytes = null;
  }
  if (mine !== turn) return;
  buffering = false;
  if (!bytes) {
    error = 'FILE_GONE';
    tell();
    return;
  }
  const m = element();
  shown = memoryUri(bytes, item.file.mime || 'application/octet-stream');
  m.src = shown;
  try {
    await m.play();
  } catch {
    // Paused: the file is ready, a press on play starts it; an error is told by its event.
  }
  tell();
}

/**
 * Plays `items` from `start`: only those small enough to hold in memory; throws
 * TooLargeToOpenError when the one asked for is not.
 */
export async function deskPlay(items: CollectionItem[], start: number, isVideo: boolean): Promise<void> {
  const asked = items[start];
  if (!asked) return;
  if (asked.file.size > MOST_IN_MEMORY) throw new TooLargeToOpenError();
  list = items.filter((i) => i.file.size <= MOST_IN_MEMORY);
  video = isVideo;
  await open(Math.max(0, list.findIndex((i) => i.id === asked.id)));
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
  if (index >= 0 && index < list.length - 1) void open(index + 1);
}

export function deskPrevious(): void {
  if (!media || index < 0) return;
  // As players do: back to the start of this one, unless it just began.
  if (index > 0 && media.currentTime < 3) void open(index - 1);
  else media.currentTime = 0;
}

export function deskSeek(ms: number): void {
  if (media && index >= 0) media.currentTime = Math.max(0, ms / 1000);
}

/** Stops the list: the file playing is let go of. */
export function deskStop(): void {
  turn++;
  letGo();
  list = [];
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

// Everything the Collection held in memory goes (the space locked, the panic button): the list stops.
onCollectionMemoryDropped(() => {
  if (index >= 0 || shown) deskStop();
});
