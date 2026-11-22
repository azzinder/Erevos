// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { CameraView, useCameraPermissions, useMicrophonePermissions, type CameraType, type FlashMode, type VideoQuality } from 'expo-camera';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Modal, PanResponder, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { keepPicture, keepRecording } from '../lib/collection-camera';
import { t } from '../lib/i18n';
import { isPicking, whilePicking } from '../lib/picking';
import { type CollectionItem, type CollectionPlace } from '../lock/collection-data';
import { space } from '../theme/colors';
import { Button, Text } from './ui';

// Erevos's own camera, for the Collection (lib/collection-camera.ts): no other app sees what it
// takes. A photo is held in memory, drawn anew as a JPEG with nothing in it but its picture
// (no place, no time, no phone), encrypted into the Collection, and the short-lived copy that
// drawing leaves in the app's cache deleted at once. A video is recorded into the app's cache,
// encrypted from there, and that copy deleted as soon as it is in, or fails to be. The camera
// stays open for the next one: photos and videos one after the other, each in the Collection as
// soon as it is taken. It closes when Erevos goes to the background, and so with the space.

type Mode = 'photo' | 'video';

// What the owner chose last, kept while Erevos runs (never written anywhere): the video's quality,
// a silent shutter, the grid and the timer.
const chosen: { quality: VideoQuality; silent: boolean; grid: boolean; timer: 0 | 3 | 10 } = { quality: '1080p', silent: false, grid: false, timer: 0 };
const QUALITIES: VideoQuality[] = ['720p', '1080p', '2160p'];
const QUALITY_NAMES: Record<string, string> = { '720p': 'HD', '1080p': 'Full HD', '2160p': '4K' };

/** The zoom after two fingers moved apart by `grown` points from where they began at `from` (0 to 1 of the camera's most). */
export const pinchedZoom = (from: number, grown: number) => Math.min(1, Math.max(0, from + grown / 600));

export function ErevosCamera({
  visible,
  place,
  folder,
  onClose,
  onAdded,
}: {
  visible: boolean;
  place: CollectionPlace | null;
  folder: string;
  onClose: () => void;
  onAdded: (item: CollectionItem) => void;
}) {
  const insets = useSafeAreaInsets();
  const camera = useRef<CameraView>(null);
  const [cameraAllowed, askCamera] = useCameraPermissions();
  const [micAllowed, askMic] = useMicrophonePermissions();
  const [mode, setMode] = useState<Mode>('photo');
  const [facing, setFacing] = useState<CameraType>('back');
  const [flash, setFlash] = useState<FlashMode>('off');
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [taken, setTaken] = useState(0);
  const [note, setNote] = useState('');
  const [zoom, setZoom] = useState(0);
  const [torch, setTorch] = useState(false);
  const [quality, setQuality] = useState<VideoQuality>(chosen.quality);
  const [silent, setSilent] = useState(chosen.silent);
  const [grid, setGrid] = useState(chosen.grid);
  const [timer, setTimer] = useState<0 | 3 | 10>(chosen.timer);
  const [counting, setCounting] = useState(0);
  const [more, setMore] = useState(false);
  const countdown = useRef<ReturnType<typeof setInterval> | null>(null);
  chosen.quality = quality;
  chosen.silent = silent;
  chosen.grid = grid;
  chosen.timer = timer;

  // Two fingers zoom: apart, in; together, out.
  const pinch = useRef<{ distance: number; zoom: number } | null>(null);
  const zoomNow = useRef(zoom);
  zoomNow.current = zoom;
  const fingers = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: (event) => event.nativeEvent.touches.length >= 2,
        onMoveShouldSetPanResponder: (event) => event.nativeEvent.touches.length >= 2,
        onPanResponderMove: (event) => {
          const touches = event.nativeEvent.touches;
          if (touches.length < 2) {
            pinch.current = null;
            return;
          }
          const distance = Math.hypot(touches[0].pageX - touches[1].pageX, touches[0].pageY - touches[1].pageY);
          if (!pinch.current) pinch.current = { distance, zoom: zoomNow.current };
          else setZoom(pinchedZoom(pinch.current.zoom, distance - pinch.current.distance));
        },
        onPanResponderRelease: () => {
          pinch.current = null;
        },
        onPanResponderTerminate: () => {
          pinch.current = null;
        },
      }),
    [],
  );

  useEffect(() => {
    if (!visible) return;
    setTaken(0);
    setNote('');
    setReady(false);
    setZoom(0);
    setTorch(false);
    setMore(false);
    if (cameraAllowed && !cameraAllowed.granted && cameraAllowed.canAskAgain) void whilePicking(askCamera);
  }, [visible]);

  // Leaving Erevos closes the camera: nothing goes on filming behind the lock. Android's question
  // for the camera or the microphone is not leaving it (whilePicking).
  useEffect(() => {
    if (!visible) return;
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active' && !isPicking()) {
        stopCounting();
        camera.current?.stopRecording();
        onClose();
      }
    });
    return () => subscription.remove();
  }, [visible, onClose]);

  useEffect(() => {
    if (!recording) return;
    setSeconds(0);
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [recording]);

  function stopCounting() {
    if (countdown.current) clearInterval(countdown.current);
    countdown.current = null;
    setCounting(0);
  }

  // The shutter: at once, or after the timer's seconds, counted down on the screen; a tap while
  // it counts stops it.
  function press() {
    if (counting > 0) {
      stopCounting();
      return;
    }
    const go = () => void (mode === 'photo' ? shoot() : film());
    if (timer === 0 || recording) {
      go();
      return;
    }
    let left = timer;
    setCounting(left);
    countdown.current = setInterval(() => {
      left -= 1;
      if (left > 0) {
        setCounting(left);
        return;
      }
      stopCounting();
      go();
    }, 1000);
  }

  useEffect(() => stopCounting, []);

  async function shoot() {
    if (!camera.current || !place || busy || !ready) return;
    setBusy(true);
    setNote('');
    try {
      const picture = await camera.current.takePictureAsync({ pictureRef: true, exif: false, shutterSound: !silent });
      const item = await keepPicture(place, folder, picture);
      setTaken((n) => n + 1);
      onAdded(item);
    } catch (error) {
      setNote(error instanceof Error ? error.message : String(error));
    }
    setBusy(false);
  }

  async function film() {
    if (!camera.current || !place || !ready) return;
    if (recording) {
      camera.current.stopRecording();
      return;
    }
    setNote('');
    if (!micAllowed?.granted) {
      const asked = await whilePicking(askMic);
      if (!asked.granted) {
        setNote(t('Erevos may not use the microphone, so the video has no sound. Allow it in the phone settings for sound.'));
      }
    }
    setRecording(true);
    let uri: string | undefined;
    try {
      const recorded = await camera.current.recordAsync();
      uri = recorded?.uri;
    } catch (error) {
      setNote(error instanceof Error ? error.message : String(error));
    }
    setRecording(false);
    if (!uri) return;
    setBusy(true);
    try {
      const item = await keepRecording(place, folder, uri);
      setTaken((n) => n + 1);
      onAdded(item);
    } catch (error) {
      setNote(error instanceof Error ? error.message : String(error));
    }
    setBusy(false);
  }

  const time = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  const allowed = cameraAllowed?.granted === true;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={() => {
        if (!recording) onClose();
      }}
      statusBarTranslucent
    >
      <View style={styles.screen}>
        {allowed ? (
          <CameraView
            ref={camera}
            style={StyleSheet.absoluteFill}
            facing={facing}
            flash={flash}
            mode={mode === 'photo' ? 'picture' : 'video'}
            mute={micAllowed?.granted !== true}
            zoom={zoom}
            enableTorch={mode === 'video' && torch}
            videoQuality={quality}
            onCameraReady={() => setReady(true)}
            onMountError={(event) => setNote(event.message)}
          />
        ) : (
          <View style={styles.center}>
            <Text color="#FFFFFF" style={styles.centered}>
              {t('Erevos may not use the camera. Allow it in the phone settings to take photos.')}
            </Text>
            {cameraAllowed?.canAskAgain !== false ? <Button title={t('Allow the camera')} compact onPress={() => void whilePicking(askCamera)} /> : null}
          </View>
        )}

        {allowed ? (
          <View style={StyleSheet.absoluteFill} {...fingers.panHandlers}>
            {grid ? (
              <View pointerEvents="none" style={StyleSheet.absoluteFill}>
                {[1, 2].map((i) => (
                  <View key={`v${i}`} style={[styles.gridLine, { left: `${(i * 100) / 3}%`, top: 0, bottom: 0, width: StyleSheet.hairlineWidth }]} />
                ))}
                {[1, 2].map((i) => (
                  <View key={`h${i}`} style={[styles.gridLine, { top: `${(i * 100) / 3}%`, left: 0, right: 0, height: StyleSheet.hairlineWidth }]} />
                ))}
              </View>
            ) : null}
            {counting > 0 ? (
              <View pointerEvents="none" style={styles.center}>
                <Text color="#FFFFFF" style={styles.count}>
                  {counting}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}

        <View style={[styles.top, { paddingTop: insets.top + space.sm }]}>
          <Pressable onPress={onClose} disabled={recording} accessibilityRole="button" accessibilityLabel={t('Close')} style={styles.pill}>
            <Text color="#FFFFFF">{t('Close')}</Text>
          </Pressable>
          <Text color="#FFFFFF" variant="caption" style={styles.middle}>
            {recording ? `● ${time}` : taken > 0 ? t('{n} in the Collection', { n: taken }) : t('Straight into the Collection, encrypted')}
          </Text>
          {mode === 'photo' && facing === 'back' ? (
            <Pressable onPress={() => setFlash((f) => (f === 'off' ? 'on' : f === 'on' ? 'auto' : 'off'))} accessibilityRole="button" style={styles.pill}>
              <Text color="#FFFFFF">{flash === 'off' ? t('Flash off') : flash === 'on' ? t('Flash on') : t('Flash auto')}</Text>
            </Pressable>
          ) : mode === 'video' && facing === 'back' ? (
            <Pressable onPress={() => setTorch((on) => !on)} accessibilityRole="button" style={styles.pill}>
              <Text color="#FFFFFF">{torch ? t('Light on') : t('Light off')}</Text>
            </Pressable>
          ) : (
            <View style={styles.pillRoom} />
          )}
        </View>
        <View style={[styles.tools, { top: insets.top + space.sm + 44 }]}>
          <Pressable onPress={() => setMore((m) => !m)} disabled={recording} accessibilityRole="button" style={styles.pill}>
            <Text color="#FFFFFF">{more ? t('Fewer') : t('More')}</Text>
          </Pressable>
          {more ? (
            <>
              <Pressable onPress={() => setTimer((s) => (s === 0 ? 3 : s === 3 ? 10 : 0))} accessibilityRole="button" style={styles.pill}>
                <Text color="#FFFFFF">{timer === 0 ? t('Timer off') : t('Timer {n} s', { n: timer })}</Text>
              </Pressable>
              <Pressable onPress={() => setGrid((on) => !on)} accessibilityRole="button" style={styles.pill}>
                <Text color="#FFFFFF">{grid ? t('Grid on') : t('Grid off')}</Text>
              </Pressable>
              <Pressable onPress={() => setSilent((on) => !on)} accessibilityRole="button" style={styles.pill}>
                <Text color="#FFFFFF">{silent ? t('Shutter silent') : t('Shutter sound')}</Text>
              </Pressable>
              {mode === 'video' ? (
                <Pressable onPress={() => setQuality((q) => QUALITIES[(QUALITIES.indexOf(q) + 1) % QUALITIES.length])} accessibilityRole="button" style={styles.pill}>
                  <Text color="#FFFFFF">{QUALITY_NAMES[quality] ?? quality}</Text>
                </Pressable>
              ) : null}
            </>
          ) : null}
        </View>

        <View style={[styles.bottom, { paddingBottom: insets.bottom + space.lg }]}>
          {note ? (
            <Text color="#FFFFFF" style={[styles.centered, styles.note]}>
              {note}
            </Text>
          ) : null}
          <View style={styles.modes}>
            {(['photo', 'video'] as const).map((m) => (
              <Pressable key={m} disabled={recording} onPress={() => setMode(m)} accessibilityRole="button" style={[styles.mode, mode === m && styles.modeOn]}>
                <Text color="#FFFFFF" variant="bodyStrong">
                  {m === 'photo' ? t('Photo') : t('Video')}
                </Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.controls}>
            <Pressable onPress={() => setZoom(0)} disabled={zoom === 0} accessibilityRole="button" accessibilityLabel={t('No zoom')} style={styles.side}>
              <Text color="#FFFFFF" variant="bodyStrong">
                {zoom === 0 ? '1×' : `+${Math.round(zoom * 100)}%`}
              </Text>
            </Pressable>
            <Pressable
              onPress={press}
              disabled={!allowed || !ready || (busy && !recording)}
              accessibilityRole="button"
              accessibilityLabel={mode === 'photo' ? t('Take a photo') : recording ? t('Stop') : t('Record a video')}
              style={({ pressed }) => [styles.shutter, (busy || !ready) && { opacity: 0.5 }, pressed && { opacity: 0.7 }]}
            >
              <View style={[styles.shutterInside, mode === 'video' && styles.shutterVideo, recording && styles.shutterStop]} />
            </Pressable>
            <Pressable onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))} disabled={recording} accessibilityRole="button" accessibilityLabel={t('Turn the camera')} style={styles.side}>
              <Text color="#FFFFFF" variant="heading">
                ⟲
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000000' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.md, padding: space.xl },
  centered: { textAlign: 'center' },
  top: { position: 'absolute', left: 0, right: 0, top: 0, flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.md },
  middle: { flex: 1, textAlign: 'center' },
  pill: { paddingHorizontal: space.md, paddingVertical: 6, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.45)' },
  pillRoom: { width: 64 },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, gap: space.md, paddingTop: space.md, backgroundColor: 'rgba(0,0,0,0.35)' },
  note: { paddingHorizontal: space.lg },
  modes: { flexDirection: 'row', justifyContent: 'center', gap: space.md },
  mode: { paddingHorizontal: space.md, paddingVertical: 4, borderRadius: 14 },
  modeOn: { backgroundColor: 'rgba(255,255,255,0.22)' },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  side: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
  shutter: { width: 76, height: 76, borderRadius: 38, borderWidth: 4, borderColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  shutterInside: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#FFFFFF' },
  shutterVideo: { backgroundColor: '#E53935' },
  shutterStop: { width: 28, height: 28, borderRadius: 6 },
  tools: { position: 'absolute', right: space.md, alignItems: 'flex-end', gap: space.sm },
  gridLine: { position: 'absolute', backgroundColor: 'rgba(255,255,255,0.6)' },
  count: { fontSize: 96, lineHeight: 110, fontWeight: '700' },
});
