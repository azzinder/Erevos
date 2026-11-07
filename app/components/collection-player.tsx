// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { useEffect, useRef } from 'react';
import { Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { attachDeskVideo } from '../lib/collection-desk-player';
import { nextPlaying, pausePlaying, playingFile, playTime, previousPlaying, resumePlaying, stopPlaying } from '../lib/collection-play';
import { t } from '../lib/i18n';
import { collectionVideoView, type PlayerState } from '../modules/erevos-collection';
import { space, withAlpha } from '../theme/colors';
import { useColors } from '../theme/context';
import { BackIcon } from './icons';
import { Button, Text } from './ui';

// The Collection's player (lib/collection-play.ts) as its screens show it: the controls of the list
// playing under a file of music (components/collection-viewer.tsx), a bar on the Collection's screen
// while music plays (app/collection.tsx), each opening the player's screen (components/
// collection-now-playing.tsx), and a video over the whole screen with Media3's own
// controls (modules/erevos-collection, VideoView.kt). Stop ends the list, and its keys go. In the
// web build (the desktop app, a browser, Sailfish OS) the video is the page's own player (lib/
// collection-desk-player.ts), with the browser's controls, shown in a box over the whole window.

const DESK = Platform.OS === 'web';

/** Previous, play or pause, next and stop, with which file of the list plays and how far it is. */
export function PlayerControls({ state, ink, muted, onOpen }: { state: PlayerState; ink: string; muted: string; onOpen: () => void }) {
  const file = playingFile(state.index);
  return (
    <View style={styles.controls}>
      <Text variant="bodyStrong" color={ink} numberOfLines={1} style={styles.centered}>
        {state.title || file?.name || t('Playing')}
      </Text>
      <Text variant="caption" color={muted} style={styles.centered}>
        {t('{n} of {count}', { n: state.index + 1, count: state.count })} · {playTime(state.position)} / {playTime(state.duration)}
      </Text>
      {state.error ? (
        <Text variant="caption" color={muted} style={styles.centered}>
          {t('This file could not be played.')}
        </Text>
      ) : null}
      <View style={styles.row}>
        <Button title={t('Previous')} kind="ghost" compact onPress={() => void previousPlaying()} />
        {state.playing ? <Button title={t('Pause')} kind="secondary" compact onPress={() => void pausePlaying()} /> : <Button title={t('Play')} kind="primary" compact onPress={() => void resumePlaying()} />}
        <Button title={t('Next')} kind="ghost" compact onPress={() => void nextPlaying()} disabled={state.hasNext === undefined ? state.index >= state.count - 1 : !state.hasNext} />
      </View>
      <View style={styles.row}>
        <Button title={t('Now playing')} kind="secondary" compact onPress={onOpen} />
        <Button title={t('Stop')} kind="ghost" compact onPress={() => void stopPlaying()} />
      </View>
    </View>
  );
}

/** A bar with the file of music playing, to pause, play on or stop it, on the Collection's screen; a tap on it opens the player's screen. */
export function NowPlaying({ state, onOpen }: { state: PlayerState | null; onOpen: () => void }) {
  const colors = useColors();
  if (!state?.active || state.video) return null;
  const file = playingFile(state.index);
  return (
    <View style={[styles.bar, { backgroundColor: colors.sheet, borderTopColor: withAlpha(colors.text, 0.12) }]}>
      <Pressable onPress={onOpen} accessibilityRole="button" accessibilityLabel={t('Now playing')} style={{ flex: 1 }}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {state.title || file?.name || t('Playing')}
        </Text>
        <Text variant="caption" tone="muted">
          {t('{n} of {count}', { n: state.index + 1, count: state.count })} · {playTime(state.position)}
        </Text>
      </Pressable>
      {state.playing ? <Button title={t('Pause')} kind="secondary" compact onPress={() => void pausePlaying()} /> : <Button title={t('Play')} kind="secondary" compact onPress={() => void resumePlaying()} />}
      <Button title={t('Stop')} kind="ghost" compact onPress={() => void stopPlaying()} />
    </View>
  );
}

/** The video of the list playing, over the whole screen; Back stops it. */
export function VideoScreen({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const Video = DESK ? null : collectionVideoView();
  // On a computer, the box (a <div> in the page) the player is put in while the screen shows.
  const box = useRef<View>(null);
  useEffect(() => {
    if (!DESK || !visible) return;
    let detach: (() => void) | null = null;
    // The box is in the page once the Modal has drawn it.
    const timer = setTimeout(() => {
      const element = box.current as unknown as HTMLElement | null;
      if (element) detach = attachDeskVideo(element);
    }, 0);
    return () => {
      clearTimeout(timer);
      detach?.();
    };
  }, [visible]);
  const close = () => {
    void stopPlaying();
    onClose();
  };
  return (
    <Modal visible={visible} animationType="fade" onRequestClose={close} statusBarTranslucent navigationBarTranslucent supportedOrientations={['portrait', 'landscape-left', 'landscape-right']}>
      <View style={styles.video}>
        {Video ? <Video style={StyleSheet.absoluteFill} /> : null}
        {DESK ? <View ref={box} style={StyleSheet.absoluteFill} /> : null}
        <Pressable onPress={close} accessibilityRole="button" accessibilityLabel={t('Back')} hitSlop={8} style={[styles.back, { top: Math.max(space.sm, insets.top) }]}>
          <BackIcon color="#FFFFFF" size={24} />
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  controls: { alignSelf: 'stretch', alignItems: 'center', gap: space.sm },
  centered: { textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm },
  bar: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.md, paddingVertical: space.sm, borderTopWidth: StyleSheet.hairlineWidth },
  video: { flex: 1, backgroundColor: '#000000' },
  back: { position: 'absolute', left: space.md, width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.45)' },
});
