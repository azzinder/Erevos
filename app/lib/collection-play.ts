// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { useEffect, useState } from 'react';

import { itemsWhole, keepPositions, loadCollection, placeIsOpen, positionOf, type CollectionItem, type CollectionPlace } from '../lock/collection-data';
import type { FileRef } from '../lock/attachment-files';
import { collectionNative, type PlayerState, type Repeat, type SealedRef } from '../modules/erevos-collection';
import {
  deskArtwork,
  deskItem,
  deskJump,
  deskNext,
  deskPause,
  deskPlay,
  deskPrevious,
  deskRepeat,
  deskResume,
  deskSeek,
  deskShuffle,
  deskSpeed,
  deskSubtitles,
  deskState,
  deskStop,
  deskTakePositions,
  onDeskPlayer,
} from './collection-desk-player';
import { dropCollectionMemory, memoryUri, releaseMemoryUri } from './collection-memory';
import { positionToKeep } from './collection-queue';
import { playKind, playType } from './collection-view';
import { t } from './i18n';
import { subtitlesFor, subtitlesType } from './subtitles';

// The Collection's music and videos, played on the phone by its Android part
// (modules/erevos-collection, Playing.kt) straight from their encrypted chunks. One list plays at a
// time; it goes on with the screen off and after the space locks, as the owner chose, unless the
// place's Stop playing when the space locks is on (lock/collection-data.ts stopOnLock). Android's
// notice and lock screen then let only play, pause, next and previous within the list, and show
// what a file is (its title, artist and cover) only when Show the title in the notification is on
// (showTitle); otherwise "Playing". The keys of the list's files are held in Android's memory only
// while it plays.
//
// The player's screen (components/collection-now-playing.tsx) shuffles, repeats, changes the speed
// and jumps within the list. A video, or music of 10 minutes or more, starts where it was left:
// where each file got to is asked of the player now and then while the Collection is open, and kept
// in the place's catalogue, sealed with it (lock/collection-data.ts keepPositions), never in plain
// storage; only while the place is open, so the player holds no place's key after it locks.
//
// What the space's locking, closing and the panic button do to what the Collection opened here is
// told from here too: links to open files with other apps, PDFs shown, and the list.
//
// In the web build (the desktop app, a browser, Sailfish OS) they play in the page instead (lib/
// collection-desk-player.ts), each file decrypted into memory; there is no notice nor lock screen,
// so the place's two choices for them do not apply: the list always stops when the space locks or
// closes, and everything the Collection held in memory to show is let go of then (lib/
// collection-memory.ts).

// The page's own player: the web build's (no Android part, and a page to play in).
const DESK = !collectionNative && typeof document !== 'undefined';

/** Whether this device plays the Collection's music and videos. */
export const CAN_PLAY = !!collectionNative || DESK;

/** Whether the place's choices for playing (stop when the space locks, the title in the notice) apply here: Android's player only. */
export const PLAY_CHOICES = !!collectionNative;

/** A file of the catalogue as the Android part reads it: where its chunks are, and its key. */
export const sealedRef = (file: FileRef): SealedRef => ({ id: file.id, key: file.key, chunk: file.chunk, count: file.count, size: file.size });

// The list playing, by place in it: Android is never told the names unless shown in the notice.
let names: string[] = [];
let ids: string[] = [];
let videos: boolean[] = [];
// The place the list is of, to keep where its files got to: only while that place is open.
let listPlace: CollectionPlace | null = null;

/** Plays `list` from `start`, of `place`, with the place's own choices; each file where it was left. */
export async function playItems(place: CollectionPlace | null, list: CollectionItem[], start: number, { showTitle, stopOnLock }: { showTitle: boolean; stopOnLock: boolean }): Promise<void> {
  await keepWhereLeft();
  const collection = place ? await loadCollection(place).catch(() => null) : null;
  const resume = list.map((i) => (collection ? positionOf(collection, i.id) : 0));
  // A video's subtitles: an .srt or .vtt beside it with its name (lib/subtitles.ts), when here.
  const found = list.map((i) => (collection && playKind(i) === 'video' ? subtitlesFor(collection.items, i) : null));
  const here = new Set((await itemsWhole(found.filter((s): s is CollectionItem => !!s)).catch(() => [])).map((s) => s.id));
  const subtitles = found.map((s) => (s && here.has(s.id) ? s : null));
  if (DESK) {
    await deskPlay(list, start, resume, subtitles);
    rememberList(place, list);
    return;
  }
  if (!collectionNative) throw new Error(t('This build of Erevos cannot do this. Update Erevos for it.'));
  const items = list.map((i, n) => {
    const s = subtitles[n];
    return {
      ...sealedRef(i.file),
      name: showTitle ? i.file.name : '',
      mime: playType(i),
      video: playKind(i) === 'video',
      resume: resume[n],
      ...(s ? { subtitles: { ...sealedRef(s.file), mime: subtitlesType(s) } } : {}),
    };
  });
  await collectionNative.playList(items, start, { showTitle, neutral: t('Playing'), stopOnLock, stopLabel: t('Stop') });
  rememberList(place, list);
}

function rememberList(place: CollectionPlace | null, list: CollectionItem[]): void {
  names = list.map((i) => i.file.name);
  ids = list.map((i) => i.id);
  videos = list.map((i) => playKind(i) === 'video');
  listPlace = place;
}

/** The name of the file at `index` in the list playing, and its id in the Collection. */
export const playingFile = (index: number): { name: string; id: string } | null => {
  if (DESK) {
    const item = deskItem(index);
    return item ? { name: item.file.name, id: item.id } : null;
  }
  return index >= 0 && index < names.length ? { name: names[index], id: ids[index] } : null;
};

/** The names and ids of the list playing, in its order. */
export const playingList = (): { name: string; id: string }[] => names.map((name, i) => ({ name, id: ids[i] }));

export const pausePlaying = () => (DESK ? Promise.resolve(deskPause()) : collectionNative?.pause().catch(() => undefined));
export const resumePlaying = () => (DESK ? Promise.resolve(deskResume()) : collectionNative?.resume().catch(() => undefined));
export const nextPlaying = () => (DESK ? Promise.resolve(deskNext()) : collectionNative?.next().catch(() => undefined));
export const previousPlaying = () => (DESK ? Promise.resolve(deskPrevious()) : collectionNative?.previous().catch(() => undefined));
export const seekPlaying = (ms: number) => (DESK ? Promise.resolve(deskSeek(ms)) : collectionNative?.seek(-1, ms).catch(() => undefined));
/** To the file at `index` of the list, where it was left. */
export const jumpPlaying = (index: number) => (DESK ? Promise.resolve(deskJump(index)) : collectionNative?.seek(index, 0).catch(() => undefined));
export const shufflePlaying = (on: boolean) => (DESK ? Promise.resolve(deskShuffle(on)) : collectionNative?.setShuffle?.(on).catch(() => undefined));
export const repeatPlaying = (mode: Repeat) => (DESK ? Promise.resolve(deskRepeat(mode)) : collectionNative?.setRepeat?.(mode).catch(() => undefined));
export const subtitlesPlaying = (on: boolean) => (DESK ? Promise.resolve(deskSubtitles(on)) : collectionNative?.setSubtitles?.(on).catch(() => undefined));
export const speedPlaying = (speed: number) => (DESK ? Promise.resolve(deskSpeed(speed)) : collectionNative?.setSpeed?.(speed).catch(() => undefined));
/** Whether this player shuffles, repeats and changes speed (an Android build before it does not). */
export const CAN_SHUFFLE = DESK || !!collectionNative?.setShuffle;

/**
 * Keeps, sealed in the catalogue of the list's place, where its long files got to, if that place
 * is open; otherwise nothing is asked, and the player keeps them till it is.
 */
export function keepWhereLeft(): Promise<void> {
  const place = listPlace;
  if (!place || !placeIsOpen(place) || ids.length === 0) return Promise.resolve();
  // Its own copy of the key, as the space's may be let go of while this is kept.
  return keepTaken({ ...place, key: place.key.slice() }, takePositionsNow(), [...ids], [...videos]);
}

// Where the list's files got to, asked of the player now: the page's at once.
type Taken = { index: number; position: number; duration: number }[];
function takePositionsNow(): Promise<Taken> {
  if (DESK) return Promise.resolve(deskTakePositions());
  return collectionNative?.takePositions?.().catch(() => []) ?? Promise.resolve([]);
}

async function keepTaken(place: CollectionPlace, taking: Promise<Taken>, listIds: string[], listVideos: boolean[]): Promise<void> {
  try {
    const left = (await taking).flatMap(({ index, position, duration }) => {
      const id = listIds[index];
      const ms = id === undefined ? null : positionToKeep(listVideos[index] === true, position, duration);
      return id !== undefined && ms !== null ? [{ id, ms }] : [];
    });
    await keepPositions(place, left).catch(() => undefined);
  } finally {
    place.key.fill(0);
  }
}

/** The Collection of `place` shows again: the list playing, if it is that place's, may keep where it got to there. */
export function placeShown(place: CollectionPlace | null): void {
  if (!place || listPlace || ids.length === 0) return;
  // The list's place went with the lock; the same place open again takes it back.
  if (pendingPlace && pendingPlace.holder === place.holder && pendingPlace.space === place.space) {
    listPlace = place;
    pendingPlace = null;
    void keepWhereLeft();
  }
}
// The place of the list playing while its space is locked: without its key.
let pendingPlace: Pick<CollectionPlace, 'holder' | 'space'> | null = null;

/** Stops the list: its keys go. */
export async function stopPlaying(): Promise<void> {
  if (DESK) deskStop();
  else await collectionNative?.stop().catch(() => undefined);
  await keepWhereLeft();
  names = [];
  ids = [];
  videos = [];
  listPlace = null;
  pendingPlace = null;
}

/** The place's Stop playing when the space locks changed while its list plays. */
export function stopOnLockChanged(on: boolean): void {
  collectionNative?.setStopOnLock(on);
}

/**
 * The player's state, followed while the screen that asks is shown (and `on`): as it changes, and
 * its position every half second. Null where nothing plays here. Where the list's files got to is
 * kept every 15 seconds meanwhile.
 */
export function usePlayer(on = true): PlayerState | null {
  const [state, setState] = useState<PlayerState | null>(null);
  useEffect(() => {
    if (!on) return;
    const keeping = setInterval(() => void keepWhereLeft(), 15_000);
    if (DESK) {
      setState(deskState());
      const stop = onDeskPlayer(setState);
      // The position moves without an event worth telling each time: asked every half second.
      const timer = setInterval(() => setState(deskState()), 500);
      return () => {
        stop();
        clearInterval(timer);
        clearInterval(keeping);
      };
    }
    const native = collectionNative;
    if (!native) return () => clearInterval(keeping);
    let active = true;
    const ask = () =>
      void native
        .playerState()
        .then((s) => active && setState(s))
        .catch(() => undefined);
    ask();
    const subscription = native.addListener('onPlayer', (s) => active && setState(s));
    const timer = setInterval(ask, 500);
    return () => {
      active = false;
      subscription.remove();
      clearInterval(timer);
      clearInterval(keeping);
    };
  }, [on]);
  return state;
}

/** The cover inside the file playing, as an address to show, while `state` says it has one; null otherwise. */
export function usePlayingArt(state: PlayerState | null): string | null {
  const [uri, setUri] = useState<string | null>(null);
  const has = !!state?.active && state.artwork === true;
  const index = state?.index ?? -1;
  useEffect(() => {
    if (!has) {
      setUri(null);
      return;
    }
    if (DESK) {
      setUri(deskArtwork());
      return;
    }
    let active = true;
    let made: string | null = null;
    void collectionNative
      ?.playerArtwork?.()
      .then((data) => {
        if (!active || !data) return;
        made = memoryUri(Uint8Array.from(atob(data), (c) => c.charCodeAt(0)), 'image/jpeg');
        setUri(made);
      })
      .catch(() => undefined);
    return () => {
      active = false;
      if (made) releaseMemoryUri(made);
    };
  }, [has, index]);
  return uri;
}

/**
 * The space locked or closed: links and PDFs go, and the list stops if the owner chose so. In the
 * desktop app the list always stops, and everything held in memory to show goes. Where the list's
 * files got to is kept first, while the place is still open.
 */
export function collectionLocked(): void {
  const place = listPlace;
  // Asked of the player before it stops, and kept with a copy of the key taken now.
  void keepWhereLeft();
  // From now on the list holds no place's key: the same place opened again takes it back (placeShown).
  if (place) pendingPlace = { holder: place.holder, space: place.space };
  listPlace = null;
  if (DESK) {
    deskLockCancel();
    dropCollectionMemory();
    return;
  }
  collectionNative?.locked();
}

// In the desktop app, the time set for collectionLockAfter.
let deskLockTimer: ReturnType<typeof setTimeout> | null = null;
function deskLockCancel(): void {
  if (deskLockTimer) clearTimeout(deskLockTimer);
  deskLockTimer = null;
}

/** The space locks in `ms` unless Erevos shows again first (-1): then what collectionLocked does happens, in Android, or in the page in the desktop app. */
export function collectionLockAfter(ms: number): void {
  if (DESK) {
    deskLockCancel();
    if (ms >= 0) deskLockTimer = setTimeout(collectionLocked, ms);
    return;
  }
  collectionNative?.lockAfter(ms);
}

/** The panic button: everything the Collection opened stops, and every key goes; nothing is kept. */
export function collectionPanic(): void {
  names = [];
  ids = [];
  videos = [];
  listPlace = null;
  pendingPlace = null;
  if (DESK) {
    deskLockCancel();
    dropCollectionMemory();
    return;
  }
  collectionNative?.panic();
}

/** A time in ms as the player shows it: 3:07, 1:02:05. */
export function playTime(ms: number): string {
  if (!(ms >= 0)) return '–:––';
  const all = Math.floor(ms / 1000);
  const h = Math.floor(all / 3600);
  const m = Math.floor((all % 3600) / 60);
  const s = String(all % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}
