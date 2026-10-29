import { useEffect, useRef, useState } from 'react';
import { Animated, Image, Modal, PanResponder, Platform, StyleSheet, View, type StyleProp, type TextStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fileSize, readFile } from '../lib/attachments';
import { t } from '../lib/i18n';
import { photoUri, releaseUri } from '../lib/photo-uri';
import { doubleTapped, fitted, kept, moved, pinched, WHOLE, type Look, type Point, type Size } from '../lib/photo-zoom';
import { CAN_CHOOSE_FOLDER } from '../lib/save-file';
import { device } from '../modules/erevos-device';
import type { FileRef } from '../lock/attachment-files';
import { radius, space, withAlpha, type Colors } from '../theme/colors';
import { useColors, useStyles } from '../theme/context';
import { Button, Row, Text } from './ui';

// Photos and files in a thread, a contact's (app/chat.tsx) or a group's (components/group-chat.tsx): each in
// its bubble, and the one looked at on its own, to save. They are sent from the panel under the
// message bar (components/composer.tsx). A photo is read into memory to show, never written out
// unsealed, and let go of once it no longer shows.

/** Photos shown in the thread at once, the latest: each is held whole in memory while shown. The
 *  others show when tapped. A computer has the memory for all of them. */
export const SHOWN_PHOTOS = Platform.OS === 'web' ? 200 : 6;

/** Stickers made from photos shown at once, the latest: they are small, so many more than photos. */
export const SHOWN_STICKERS = Platform.OS === 'web' ? 200 : 40;

/** Of a thread's files, oldest first, the photos here to show: the latest photos, and the latest stickers. */
export function shownOf(files: FileRef[]): FileRef[] {
  const here = files.filter((file) => file.kind === 'photo' && !file.from);
  return [...here.filter((file) => !file.sticker).slice(-SHOWN_PHOTOS), ...here.filter((file) => file.sticker).slice(-SHOWN_STICKERS)];
}

/** How far a file that is not here yet has come: `state` is how far it is ('40%'), or 'failed' or
 *  'gone' if it did not come. Null once it is here. */
export function comingText(file: FileRef, state?: string): string | null {
  return !file.from
    ? null
    : state === 'gone'
      ? t('No longer on the relay')
      : state === 'failed'
        ? t('Did not come · tap to try again')
        : state
          ? t('Coming, {progress}', { progress: state })
          : t('Tap to take it, {size}', { size: fileSize(file.size) });
}

// A photo or file in the thread: the photo itself once it is here and shown, otherwise what it
// is and how far it has come.
export function Attachment({ file, uri, state, ink }: { file: FileRef; uri?: string; state?: string; ink: StyleProp<TextStyle> }) {
  const colors = useColors();
  const status = comingText(file, state);
  if (file.kind === 'photo') {
    const width = 240;
    const height = Math.round(Math.min(320, Math.max(120, file.w && file.h ? (width * file.h) / file.w : 180)));
    // Hidden till tapped: blurred, and whole only once opened on its own.
    if (uri && file.hidden)
      return (
        <View style={{ width, height, borderRadius: radius.md, overflow: 'hidden' }}>
          <Image source={{ uri }} style={{ width, height }} resizeMode="cover" resizeMethod="resize" blurRadius={40} accessibilityLabel={t('Hidden photo · tap to see it')} />
          <View style={{ ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.35)' }}>
            <Text style={{ color: '#FFFFFF', fontWeight: '600', textAlign: 'center', padding: space.sm }}>{t('Hidden photo · tap to see it')}</Text>
          </View>
        </View>
      );
    return uri ? (
      <Image source={{ uri }} style={{ width, height, borderRadius: radius.md }} resizeMode="cover" resizeMethod="resize" accessibilityLabel={t('Photo')} />
    ) : (
      <View style={{ width, height, borderRadius: radius.md, backgroundColor: withAlpha(colors.text, 0.08), alignItems: 'center', justifyContent: 'center', padding: space.md }}>
        <Text style={[ink, { textAlign: 'center' }]}>{status ?? t('Photo · tap to see it')}</Text>
      </View>
    );
  }
  return (
    <View style={{ gap: 2, minWidth: 160 }}>
      <Text style={[ink, { fontWeight: '600' }]} numberOfLines={2}>
        {file.name}
      </Text>
      <Text style={[ink, { fontSize: 13, opacity: 0.8 }]}>{status ?? t('{size} · tap to save', { size: fileSize(file.size) })}</Text>
    </View>
  );
}

/**
 * The photos shown, by file id, as addresses an Image can show (lib/photo-uri.ts): each of `files`
 * here is read into memory, and let go of once it is no longer one of them, or the screen closes.
 */
export function useShownPhotos(files: FileRef[], onError: (error: unknown) => void): Record<string, string> {
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const photosRef = useRef(photos);
  photosRef.current = photos;
  const loading = useRef(new Set<string>());
  const shownKey = files.map((file) => file.id).join(',');
  useEffect(() => {
    const wanted = new Set(files.map((file) => file.id));
    for (const ref of files) {
      if (ref.from || photosRef.current[ref.id] || loading.current.has(ref.id)) continue;
      loading.current.add(ref.id);
      readFile(ref)
        .then((bytes) => {
          if (bytes) setPhotos((now) => ({ ...now, [ref.id]: photoUri(bytes, ref.mime) }));
        })
        .catch(onError)
        .finally(() => loading.current.delete(ref.id));
    }
    setPhotos((now) => {
      const gone = Object.keys(now).filter((id) => !wanted.has(id));
      if (gone.length === 0) return now;
      const kept = { ...now };
      for (const id of gone) {
        releaseUri(kept[id]);
        delete kept[id];
      }
      return kept;
    });
  }, [shownKey]);
  // Photos held in memory go when the screen closes.
  useEffect(
    () => () => {
      for (const uri of Object.values(photosRef.current)) releaseUri(uri);
    },
    [],
  );
  return photos;
}

/**
 * A photo (`uri` once it is read) or file shown on its own, with how big it is, to save; none while
 * `file` is null. A photo fills the screen, turned as the phone is, even with its auto-rotate off:
 * two fingers or a double tap zoom in, one finger moves it while zoomed, and a tap hides or shows
 * what is around it.
 */
export function FileViewer({ file, uri, onSave, onClose }: { file: FileRef | null; uri?: string; onSave: (choose: boolean) => void; onClose: () => void }) {
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const [bars, setBars] = useState(true);
  const id = file?.id;
  useEffect(() => setBars(true), [id]);
  // A photo shown turns with the phone, its auto-rotate on or off; the rest of Erevos follows the setting.
  const photo = file?.kind === 'photo';
  useEffect(() => {
    if (!photo) return;
    device?.turnWithPhone?.(true);
    return () => {
      device?.turnWithPhone?.(false);
    };
  }, [photo]);
  const tools = (
    <Row wrap style={styles.viewerTools}>
      <Button title={t('Save')} compact onPress={() => onSave(false)} />
      {CAN_CHOOSE_FOLDER ? <Button title={t('Save in another folder')} kind="secondary" compact onPress={() => onSave(true)} /> : null}
      <Button title={t('Close')} kind="secondary" compact onPress={onClose} />
    </Row>
  );
  return (
    <Modal
      visible={file !== null}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
      navigationBarTranslucent
      supportedOrientations={['portrait', 'landscape-left', 'landscape-right']}
    >
      {file?.kind === 'photo' ? (
        <View style={styles.photoViewer}>
          {uri ? (
            <ZoomPhoto key={file.id} uri={uri} w={file.w} h={file.h} onTap={() => setBars((shown) => !shown)} />
          ) : (
            <Text color="#FFFFFF" style={styles.opening}>
              {t('Opening the photo…')}
            </Text>
          )}
          {bars ? (
            <View
              style={[
                styles.photoBar,
                { paddingBottom: Math.max(space.lg, insets.bottom), paddingLeft: Math.max(space.lg, insets.left), paddingRight: Math.max(space.lg, insets.right) },
              ]}
            >
              <Text tone="muted" style={styles.centered}>
                {file.w && file.h ? `${file.w} × ${file.h} · ` : ''}
                {fileSize(file.size)}
              </Text>
              {tools}
            </View>
          ) : null}
        </View>
      ) : file ? (
        <View style={[styles.viewer, { paddingTop: Math.max(space.lg, insets.top), paddingBottom: Math.max(space.lg, insets.bottom) }]}>
          <View style={styles.viewerFile}>
            <Text variant="heading">{file.name}</Text>
            <Text tone="muted">{fileSize(file.size)}</Text>
          </View>
          {tools}
        </View>
      ) : null}
    </Modal>
  );
}

/** Two taps this close together, in ms, are a double tap. */
const DOUBLE_TAP = 260;
/** A touch that moves less than this, in points, is a tap. */
const TAP_SLOP = 10;

// Decoded at twice the size it shows (Android's resizeMultiplier, which React Native's types leave out).
const ZOOM_ROOM = { resizeMultiplier: 2 } as object;

type Touch = { pageX: number; pageY: number };

// A photo filling where it is, zoomed and moved by touch (lib/photo-zoom.ts). It is decoded no
// bigger than about twice the screen (resizeMethod "resize"), so a 50-megapixel photo opens as a
// small one does, still sharp when zoomed in.
function ZoomPhoto({ uri, w, h, onTap }: { uri: string; w?: number; h?: number; onTap: () => void }) {
  const scale = useRef(new Animated.Value(1)).current;
  const x = useRef(new Animated.Value(0)).current;
  const y = useRef(new Animated.Value(0)).current;
  const look = useRef<Look>(WHOLE);
  const room = useRef<Size>({ width: 0, height: 0 });
  // Where the touches began, as the look was then: begun again when a finger comes or goes.
  const start = useRef<{ look: Look; touches: Touch[]; moved: boolean } | null>(null);
  const lastTap = useRef(0);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tapRef = useRef(onTap);
  tapRef.current = onTap;
  useEffect(() => () => clearTimeout(tapTimer.current ?? undefined), []);

  const show = (next: Look, animated = false) => {
    const now = kept(next, room.current, fitted(room.current, w, h));
    look.current = now;
    if (!animated) {
      scale.setValue(now.scale);
      x.setValue(now.x);
      y.setValue(now.y);
      return;
    }
    Animated.parallel([
      Animated.timing(scale, { toValue: now.scale, duration: 180, useNativeDriver: true }),
      Animated.timing(x, { toValue: now.x, duration: 180, useNativeDriver: true }),
      Animated.timing(y, { toValue: now.y, duration: 180, useNativeDriver: true }),
    ]).start();
  };
  // A touch, or the middle of two, from the middle of where the photo is (it fills the screen).
  const middleOf = (touches: Touch[]): Point => ({
    x: touches.reduce((all, touch) => all + touch.pageX, 0) / touches.length - room.current.width / 2,
    y: touches.reduce((all, touch) => all + touch.pageY, 0) / touches.length - room.current.height / 2,
  });
  const apart = (touches: Touch[]) => (touches.length < 2 ? 0 : Math.hypot(touches[0].pageX - touches[1].pageX, touches[0].pageY - touches[1].pageY));
  const copy = (touches: readonly Touch[]) => touches.slice(0, 2).map(({ pageX, pageY }) => ({ pageX, pageY }));

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => look.current.scale <= 1,
      onPanResponderGrant: (event) => {
        start.current = { look: look.current, touches: copy(event.nativeEvent.touches), moved: false };
      },
      onPanResponderMove: (event) => {
        const began = start.current;
        const touches = copy(event.nativeEvent.touches);
        if (!began || touches.length === 0) return;
        if (touches.length !== began.touches.length) {
          start.current = { look: look.current, touches, moved: true };
          return;
        }
        const from = middleOf(began.touches);
        const to = middleOf(touches);
        if (!began.moved && touches.length === 1 && Math.hypot(to.x - from.x, to.y - from.y) < TAP_SLOP) return;
        began.moved = true;
        show(touches.length === 2 && apart(began.touches) > 0 ? pinched(began.look, from, to, apart(began.touches), apart(touches)) : moved(began.look, from, to));
      },
      onPanResponderRelease: (event) => {
        const began = start.current;
        start.current = null;
        if (look.current.scale < 1.05 && look.current.scale !== 1) show(WHOLE, true);
        if (!began || began.moved) return;
        const now = Date.now();
        if (now - lastTap.current >= DOUBLE_TAP) {
          lastTap.current = now;
          tapTimer.current = setTimeout(() => tapRef.current(), DOUBLE_TAP);
          return;
        }
        lastTap.current = 0;
        clearTimeout(tapTimer.current ?? undefined);
        show(doubleTapped(look.current, middleOf([event.nativeEvent])), true);
      },
    }),
  ).current;

  return (
    <View
      style={StyleSheet.absoluteFill}
      onLayout={(event) => {
        // Turned: whole again.
        room.current = { width: event.nativeEvent.layout.width, height: event.nativeEvent.layout.height };
        show(WHOLE);
      }}
      {...responder.panHandlers}
    >
      <Animated.Image
        source={{ uri }}
        resizeMode="contain"
        resizeMethod="resize"
        {...ZOOM_ROOM}
        style={[StyleSheet.absoluteFill, { transform: [{ translateX: x }, { translateY: y }, { scale }] }]}
        accessibilityLabel={t('Photo')}
      />
    </View>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    viewer: {
      flex: 1,
      gap: space.md,
      paddingHorizontal: space.lg,
      backgroundColor: colors.ground,
    },
    photoViewer: {
      flex: 1,
      backgroundColor: '#000000',
      justifyContent: 'center',
    },
    opening: {
      textAlign: 'center',
    },
    photoBar: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      gap: space.sm,
      paddingTop: space.md,
      backgroundColor: withAlpha(colors.ground, 0.85),
    },
    centered: {
      textAlign: 'center',
    },
    viewerFile: {
      flex: 1,
      gap: space.sm,
      justifyContent: 'center',
      alignItems: 'center',
    },
    viewerTools: {
      justifyContent: 'center',
    },
  });
