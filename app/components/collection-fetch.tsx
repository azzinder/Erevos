// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { fileSize } from '../lib/attachments';
import { t } from '../lib/i18n';
import { FillStoppedError, type FillOptions, type FillProgress } from '../lock/collection-data';
import { space, withAlpha } from '../theme/colors';
import { Button, Text } from './ui';

// A file of the Collection opened while some of its chunks are not on this device, as after a
// backup restored without them: they are fetched from the place's server (lib/collection-webdav.ts)
// before it shows, plays or opens with another app. How far that is shows here, with Cancel, which
// stops the fetch and keeps what came: Go on, or opening the file again, fetches only the rest.

/** One fetch at a time, with how far it is, and Cancel and Go on. */
export type Fetching = {
  progress: FillProgress | null;
  stopped: boolean;
  /**
   * Runs `work` with a fresh stop and progress: its result, or `stopped` when it was stopped.
   * `again` is what Go on runs after a stop.
   */
  run<T>(work: (options: FillOptions) => Promise<T>, again: () => void): Promise<{ value: T } | 'stopped'>;
  /** Stops it, as Cancel does: Go on goes on from there. */
  cancel(): void;
  /** Stops it and shows nothing of it: another file is shown now. */
  reset(): void;
  goOn(): void;
};

export function useFetching(): Fetching {
  const [progress, setProgress] = useState<FillProgress | null>(null);
  const [stopped, setStopped] = useState(false);
  const current = useRef<AbortController | null>(null);
  const again = useRef<(() => void) | null>(null);
  // Leaving the screen stops it too, and what came stays.
  useEffect(() => () => current.current?.abort(), []);
  const run = useCallback(async <T,>(work: (options: FillOptions) => Promise<T>, next: () => void): Promise<{ value: T } | 'stopped'> => {
    current.current?.abort();
    const mine = new AbortController();
    current.current = mine;
    again.current = next;
    setStopped(false);
    setProgress(null);
    try {
      return { value: await work({ signal: mine.signal, progress: (p) => current.current === mine && setProgress(p) }) };
    } catch (error) {
      if (!(error instanceof FillStoppedError)) throw error;
      if (current.current === mine) setStopped(true);
      return 'stopped';
    } finally {
      if (current.current === mine) {
        current.current = null;
        setProgress(null);
      }
    }
  }, []);
  const cancel = useCallback(() => current.current?.abort(), []);
  const reset = useCallback(() => {
    const was = current.current;
    current.current = null;
    was?.abort();
    setProgress(null);
    setStopped(false);
  }, []);
  const goOn = useCallback(() => {
    setStopped(false);
    again.current?.();
  }, []);
  return { progress, stopped, run, cancel, reset, goOn };
}

/** How far the fetch is, with Cancel; or, once stopped, Go on. Nothing while none runs. */
export function FetchNote({ fetching, ink, muted }: { fetching: Fetching; ink: string; muted: string }) {
  const { progress, stopped } = fetching;
  if (!progress && !stopped) return null;
  return (
    <View style={styles.note}>
      <Text color={progress ? ink : muted} style={styles.centered}>
        {progress
          ? t('Fetching from the server: {done} of {total}', { done: fileSize(progress.bytes), total: fileSize(progress.size) })
          : t('Stopped. What came stays on this device; the rest comes when you go on.')}
      </Text>
      {progress ? (
        <View style={[styles.bar, { backgroundColor: withAlpha(muted, 0.3) }]}>
          <View style={[styles.fill, { backgroundColor: ink, width: `${progress.total ? Math.round((progress.done / progress.total) * 100) : 0}%` }]} />
        </View>
      ) : null}
      {progress ? <Button title={t('Cancel')} kind="secondary" compact onPress={fetching.cancel} /> : <Button title={t('Go on')} kind="secondary" compact onPress={fetching.goOn} />}
    </View>
  );
}

const styles = StyleSheet.create({
  note: { alignItems: 'center', gap: space.sm, alignSelf: 'stretch' },
  centered: { textAlign: 'center' },
  bar: { height: 4, borderRadius: 2, alignSelf: 'stretch', overflow: 'hidden' },
  fill: { height: 4, borderRadius: 2 },
});
