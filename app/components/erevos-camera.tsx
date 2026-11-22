// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { CameraView, useCameraPermissions, useMicrophonePermissions, type CameraType, type FlashMode } from 'expo-camera';
import { useEffect, useRef, useState } from 'react';
import { AppState, Modal, Pressable, StyleSheet, View } from 'react-native';
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

  useEffect(() => {
    if (!visible) return;
    setTaken(0);
    setNote('');
    setReady(false);
    if (cameraAllowed && !cameraAllowed.granted && cameraAllowed.canAskAgain) void whilePicking(askCamera);
  }, [visible]);

  // Leaving Erevos closes the camera: nothing goes on filming behind the lock. Android's question
  // for the camera or the microphone is not leaving it (whilePicking).
  useEffect(() => {
    if (!visible) return;
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active' && !isPicking()) {
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

  async function shoot() {
    if (!camera.current || !place || busy || !ready) return;
    setBusy(true);
    setNote('');
    try {
      const picture = await camera.current.takePictureAsync({ pictureRef: true, exif: false });
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
    if (!micAllowed?.granted) {
      const asked = await whilePicking(askMic);
      if (!asked.granted) {
        setNote(t('Erevos may not use the microphone, so the video has no sound. Allow it in the phone settings for sound.'));
      }
    }
    setNote('');
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
          ) : (
            <View style={styles.pillRoom} />
          )}
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
            <View style={styles.side} />
            <Pressable
              onPress={() => void (mode === 'photo' ? shoot() : film())}
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
});
