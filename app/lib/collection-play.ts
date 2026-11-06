// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { useEffect, useState } from 'react';

import type { CollectionItem } from '../lock/collection-data';
import type { FileRef } from '../lock/attachment-files';
import { collectionNative, type PlayerState, type SealedRef } from '../modules/erevos-collection';
import { deskItem, deskNext, deskPause, deskPlay, deskPrevious, deskResume, deskSeek, deskState, deskStop, onDeskPlayer } from './collection-desk-player';
import { dropCollectionMemory } from './collection-memory';
import { playKind } from './collection-view';
import { t } from './i18n';

// The Collection's music and videos, played on the phone by its Android part
// (modules/erevos-collection, Playing.kt) straight from their encrypted chunks. One list plays at a
// time; it goes on with the screen off and after the space locks, as the owner chose, unless the
// place's Stop playing when the space locks is on (lock/collection-data.ts stopOnLock). Android's
// notice and lock screen then let only play, pause, next and previous within the list, and show a
// file's name only when Show the title in the notification is on (showTitle); otherwise "Playing".
// The keys of the list's files are held in Android's memory only while it plays.
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

// The names of the list playing, by place in it: Android is never told them unless shown in the notice.
let names: string[] = [];
let ids: string[] = [];

/** Plays `list` from `start`, with the place's own choices. */
export async function playItems(list: CollectionItem[], start: number, { showTitle, stopOnLock }: { showTitle: boolean; stopOnLock: boolean }): Promise<void> {
  if (DESK) {
    const isVideo = list[start] ? playKind(list[start]) === 'video' : false;
    await deskPlay(list, start, isVideo);
    return;
  }
  if (!collectionNative) throw new Error(t('This build of Erevos cannot do this. Update Erevos for it.'));
  names = list.map((i) => i.file.name);
  ids = list.map((i) => i.id);
  const items = list.map((i) => ({ ...sealedRef(i.file), name: showTitle ? i.file.name : '', mime: i.file.mime, video: playKind(i) === 'video' }));
  await collectionNative.playList(items, start, { showTitle, neutral: t('Playing'), stopOnLock, stopLabel: t('Stop') });
}

/** The name of the file at `index` in the list playing, and its id in the Collection. */
export const playingFile = (index: number): { name: string; id: string } | null => {
  if (DESK) {
    const item = deskItem(index);
    return item ? { name: item.file.name, id: item.id } : null;
  }
  return index >= 0 && index < names.length ? { name: names[index], id: ids[index] } : null;
};

export const pausePlaying = () => (DESK ? Promise.resolve(deskPause()) : collectionNative?.pause().catch(() => undefined));
export const resumePlaying = () => (DESK ? Promise.resolve(deskResume()) : collectionNative?.resume().catch(() => undefined));
export const nextPlaying = () => (DESK ? Promise.resolve(deskNext()) : collectionNative?.next().catch(() => undefined));
export const previousPlaying = () => (DESK ? Promise.resolve(deskPrevious()) : collectionNative?.previous().catch(() => undefined));
export const seekPlaying = (ms: number) => (DESK ? Promise.resolve(deskSeek(ms)) : collectionNative?.seek(-1, ms).catch(() => undefined));

/** Stops the list: its keys go. */
export async function stopPlaying(): Promise<void> {
  names = [];
  ids = [];
  if (DESK) {
    deskStop();
    return;
  }
  await collectionNative?.stop().catch(() => undefined);
}

/** The place's Stop playing when the space locks changed while its list plays. */
export function stopOnLockChanged(on: boolean): void {
  collectionNative?.setStopOnLock(on);
}

/**
 * The player's state, followed while the screen that asks is shown (and `on`): as it changes, and
 * its position every half second. Null where nothing plays here.
 */
export function usePlayer(on = true): PlayerState | null {
  const [state, setState] = useState<PlayerState | null>(null);
  useEffect(() => {
    if (DESK) {
      if (!on) return;
      setState(deskState());
      const stop = onDeskPlayer(setState);
      // The position moves without an event worth telling each time: asked every half second.
      const timer = setInterval(() => setState(deskState()), 500);
      return () => {
        stop();
        clearInterval(timer);
      };
    }
    const native = collectionNative;
    if (!native || !on) return;
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
    };
  }, [on]);
  return state;
}

/**
 * The space locked or closed: links and PDFs go, and the list stops if the owner chose so. In the
 * desktop app the list always stops, and everything held in memory to show goes.
 */
export function collectionLocked(): void {
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

/** The panic button: everything the Collection opened stops, and every key goes. */
export function collectionPanic(): void {
  names = [];
  ids = [];
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
