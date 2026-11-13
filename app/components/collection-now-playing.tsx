// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { useEffect, useState } from 'react';
import { FlatList, Image, Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  CAN_SHUFFLE,
  jumpPlaying,
  nextPlaying,
  pausePlaying,
  playingFile,
  playingList,
  playTime,
  previousPlaying,
  repeatPlaying,
  resumePlaying,
  seekPlaying,
  shufflePlaying,
  speedPlaying,
  stationPlaying,
  stationThroughTor,
  stopPlaying,
  usePlayer,
  usePlayingArt,
} from '../lib/collection-play';
import { nextRepeat, nextSpeed } from '../lib/collection-queue';
import { t } from '../lib/i18n';
import type { PlayerState } from '../modules/erevos-collection';
import { radius, space, withAlpha, type Colors } from '../theme/colors';
import { useColors } from '../theme/context';
import { BackIcon, MusicIcon } from './icons';
import { Button, Chip, Text } from './ui';

// The player's screen: what plays now in the Collection (lib/collection-play.ts), opened from the
// bar at the bottom of the Collection's screen while music plays, and from a file of music once it
// plays (components/collection-viewer.tsx). Its cover and what it says of itself (title, artist,
// album) when it has them, else its name; a bar to see and move how far it is; previous, play or
// pause, next; shuffle, repeat (the list, the one file, or not) and the speed; Stop; and the list,
// the one playing marked, a tap on another to play it. All inside Erevos: the notice and the lock
// screen show only what the owner chose (Playing.kt).

export function NowPlayingScreen({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const state = usePlayer(visible);
  const art = usePlayingArt(visible ? state : null);
  // The list stopped (Stop, the notice's Stop, the space locked): nothing to show.
  useEffect(() => {
    if (visible && state && !state.active) onClose();
  }, [visible, state?.active]);
  // A station has no list to show.
  const list = state?.active && !stationPlaying() ? playingList() : [];
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      <View style={[styles.screen, { backgroundColor: colors.ground, paddingTop: insets.top }]}>
        <View style={styles.bar}>
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel={t('Back')} hitSlop={8} style={styles.back}>
            <BackIcon color={colors.text} size={24} />
          </Pressable>
          <Text variant="heading" style={styles.grow}>
            {t('Now playing')}
          </Text>
        </View>
        {state?.active ? (
          <FlatList
            data={list}
            keyExtractor={(entry, i) => `${i}-${entry.id}`}
            contentContainerStyle={{ paddingBottom: insets.bottom + space.xl }}
            ListHeaderComponent={<Playing state={state} art={art} colors={colors} />}
            renderItem={({ item: entry, index }) => {
              const now = index === state.index;
              return (
                <Pressable
                  onPress={() => void jumpPlaying(index)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: now }}
                  style={({ pressed }) => [styles.row, now && { backgroundColor: withAlpha(colors.primary, 0.14) }, pressed && { opacity: 0.7 }]}
                >
                  {now ? <MusicIcon color={colors.primary} size={20} /> : <Text variant="caption" tone="muted" style={styles.number}>{index + 1}</Text>}
                  <Text variant={now ? 'bodyStrong' : 'body'} color={now ? colors.primary : undefined} numberOfLines={1} style={styles.grow}>
                    {entry.name}
                  </Text>
                </Pressable>
              );
            }}
          />
        ) : null}
      </View>
    </Modal>
  );
}

// The file playing: its cover, what it is, how far, and the controls.
function Playing({ state, art, colors }: { state: PlayerState; art: string | null; colors: Colors }) {
  const file = playingFile(state.index);
  const live = stationPlaying();
  const title = state.title || file?.name || t('Playing');
  const about = [state.artist, state.album].filter(Boolean).join(' · ');
  const repeat = state.repeat ?? 'off';
  const speed = state.speed ?? 1;
  return (
    <View style={styles.playing}>
      <View style={[styles.cover, { backgroundColor: withAlpha(colors.text, 0.08) }]}>
        {art ? <Image source={{ uri: art }} style={styles.coverImage} resizeMode="cover" accessibilityIgnoresInvertColors /> : <MusicIcon color={colors.textFaint} size={64} />}
      </View>
      <Text variant="heading" numberOfLines={2} style={styles.centered}>
        {title}
      </Text>
      {about ? (
        <Text tone="muted" numberOfLines={1} style={styles.centered}>
          {about}
        </Text>
      ) : null}
      {state.title && file && state.title !== file.name ? (
        <Text variant="caption" tone="muted" numberOfLines={1} style={styles.centered}>
          {file.name}
        </Text>
      ) : null}
      {state.error ? (
        <Text variant="caption" color={colors.danger} style={styles.centered}>
          {live ? t('The station could not be played. It may be off the air, or its stream is in a form this device does not play.') : t('This file could not be played.')}
        </Text>
      ) : null}
      {live ? (
        <Text variant="caption" tone="muted" style={styles.centered}>
          {state.buffering ? t('Loading…') : stationThroughTor() ? t('Through Tor: the station does not see this device’s IP address.') : t('The station sees this device’s IP address while it plays.')}
        </Text>
      ) : null}
      {live ? null : <SeekBar position={state.position} duration={state.duration} colors={colors} />}
      {live ? null : (
        <View style={styles.times}>
          <Text variant="caption" tone="muted">
            {playTime(state.position)}
          </Text>
          <Text variant="caption" tone="muted">
            {state.buffering ? t('Loading…') : t('{n} of {count}', { n: state.index + 1, count: state.count })}
          </Text>
          <Text variant="caption" tone="muted">
            {playTime(state.duration)}
          </Text>
        </View>
      )}
      <View style={styles.controls}>
        {live ? null : <Button title={t('Previous')} kind="ghost" compact onPress={() => void previousPlaying()} />}
        {state.playing ? <Button title={t('Pause')} kind="secondary" compact onPress={() => void pausePlaying()} /> : <Button title={t('Play')} kind="primary" compact onPress={() => void resumePlaying()} />}
        {live ? null : <Button title={t('Next')} kind="ghost" compact onPress={() => void nextPlaying()} disabled={state.hasNext === undefined ? state.index >= state.count - 1 : !state.hasNext} />}
      </View>
      {CAN_SHUFFLE && !live ? (
        <View style={styles.options}>
          <Chip label={t('Shuffle')} selected={state.shuffle === true} onPress={() => void shufflePlaying(!state.shuffle)} />
          <Chip label={repeat === 'all' ? t('Repeat all') : repeat === 'one' ? t('Repeat one') : t('Repeat')} selected={repeat !== 'off'} onPress={() => void repeatPlaying(nextRepeat(repeat))} />
          <Chip label={t('Speed {speed}×', { speed: String(speed) })} selected={speed !== 1} onPress={() => void speedPlaying(nextSpeed(speed))} />
        </View>
      ) : null}
      <Button title={t('Stop')} kind="ghost" compact onPress={() => void stopPlaying()} />
      {live ? null : (
        <Text variant="overline" tone="muted" style={styles.listTitle}>
          {t('The list')}
        </Text>
      )}
    </View>
  );
}

/** How far the file playing is, to tap or drag to another place; with no length known, only shown. */
export function SeekBar({ position, duration, colors }: { position: number; duration: number; colors: Colors }) {
  const [width, setWidth] = useState(1);
  const [drag, setDrag] = useState<number | null>(null);
  const known = duration > 0;
  const shown = drag ?? (known ? Math.min(1, Math.max(0, position / duration)) : 0);
  const at = (x: number) => Math.min(1, Math.max(0, x / width));
  const by = (ms: number) => void seekPlaying(Math.min(duration, Math.max(0, position + ms)));
  return (
    <View
      onLayout={(e) => setWidth(Math.max(1, e.nativeEvent.layout.width))}
      style={styles.seek}
      onStartShouldSetResponder={() => known}
      onMoveShouldSetResponder={() => known}
      onResponderTerminationRequest={() => false}
      onResponderGrant={(e) => setDrag(at(e.nativeEvent.locationX))}
      onResponderMove={(e) => setDrag(at(e.nativeEvent.locationX))}
      onResponderRelease={(e) => {
        const to = at(e.nativeEvent.locationX);
        setDrag(null);
        void seekPlaying(Math.round(to * duration));
      }}
      onResponderTerminate={() => setDrag(null)}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={t('Position')}
      accessibilityValue={{ text: `${playTime(position)} / ${playTime(duration)}` }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => known && by(e.nativeEvent.actionName === 'increment' ? 10_000 : -10_000)}
    >
      <View pointerEvents="none" style={[styles.track, { backgroundColor: withAlpha(colors.text, 0.15) }]}>
        <View style={[styles.fill, { width: `${shown * 100}%`, backgroundColor: colors.primary }]} />
      </View>
      {known ? <View pointerEvents="none" style={[styles.knob, { left: shown * width - 8, backgroundColor: colors.primary }]} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  bar: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.md, paddingVertical: space.sm, minHeight: 56 },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  grow: { flex: 1 },
  playing: { alignItems: 'center', gap: space.sm, paddingHorizontal: space.lg, paddingBottom: space.md },
  cover: { width: 220, height: 220, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginVertical: space.md },
  coverImage: { width: 220, height: 220 },
  centered: { textAlign: 'center' },
  seek: { alignSelf: 'stretch', height: 36, justifyContent: 'center', marginTop: space.sm },
  track: { height: 4, borderRadius: 2, overflow: 'hidden' },
  fill: { height: 4 },
  knob: { position: 'absolute', top: 10, width: 16, height: 16, borderRadius: 8 },
  times: { alignSelf: 'stretch', flexDirection: 'row', justifyContent: 'space-between' },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm },
  options: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: space.sm },
  listTitle: { alignSelf: 'flex-start', paddingTop: space.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.md },
  number: { width: 20, textAlign: 'center' },
});
