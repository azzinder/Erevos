import { useEffect, useRef, useState } from 'react';
import { Image, Modal, Platform, StyleSheet, View, type StyleProp, type TextStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fileSize, readFile } from '../lib/attachments';
import { t } from '../lib/i18n';
import { photoUri, releaseUri } from '../lib/photo-uri';
import { CAN_CHOOSE_FOLDER } from '../lib/save-file';
import type { FileRef } from '../lock/attachment-files';
import { radius, space, withAlpha, type Colors } from '../theme/colors';
import { useColors, useStyles } from '../theme/context';
import { Button, Row, Text } from './ui';

// Photos and files in a thread, a contact's (app/chat.tsx) or a group's (app/group.tsx): each in
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

/** A photo (`uri` once it is read) or file shown on its own, with how big it is, to save; none while `file` is null. */
export function FileViewer({ file, uri, onSave, onClose }: { file: FileRef | null; uri?: string; onSave: (choose: boolean) => void; onClose: () => void }) {
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={file !== null} animationType="fade" onRequestClose={onClose}>
      <View style={[styles.viewer, { paddingTop: Math.max(space.lg, insets.top), paddingBottom: Math.max(space.lg, insets.bottom) }]}>
        {file?.kind === 'photo' ? (
          <>
            {uri ? (
              <Image source={{ uri }} style={styles.viewerPhoto} resizeMode="contain" accessibilityLabel={t('Photo')} />
            ) : (
              <Text tone="muted" style={styles.viewerPhoto}>
                {t('Opening the photo…')}
              </Text>
            )}
            <Text tone="muted">
              {file.w && file.h ? `${file.w} × ${file.h} · ` : ''}
              {fileSize(file.size)}
            </Text>
          </>
        ) : file ? (
          <View style={styles.viewerFile}>
            <Text variant="heading">{file.name}</Text>
            <Text tone="muted">{fileSize(file.size)}</Text>
          </View>
        ) : null}
        <Row wrap style={styles.viewerTools}>
          <Button title={t('Save')} compact onPress={() => onSave(false)} />
          {CAN_CHOOSE_FOLDER ? <Button title={t('Save in another folder')} kind="secondary" compact onPress={() => onSave(true)} /> : null}
          <Button title={t('Close')} kind="secondary" compact onPress={onClose} />
        </Row>
      </View>
    </Modal>
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
    viewerPhoto: {
      flex: 1,
      width: '100%',
      textAlign: 'center',
      textAlignVertical: 'center',
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
