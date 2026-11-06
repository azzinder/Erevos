// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { FlatList, Modal, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fileSize } from '../lib/attachments';
import { fileLook, isText, MOST_TEXT } from '../lib/collection-view';
import { utf8Decode } from '../lib/crypto';
import { locale, t } from '../lib/i18n';
import { photoUri, releaseUri } from '../lib/photo-uri';
import { openItem, type CollectionItem } from '../lock/collection-data';
import { device } from '../modules/erevos-device';
import { space, withAlpha } from '../theme/colors';
import { useColors } from '../theme/context';
import { ZoomPhoto } from './attachment';
import { BackIcon, DownloadIcon, FileIcon, InfoIcon, SendIcon, TrashIcon } from './icons';
import { Button, Sheet, Text } from './ui';

// One file of the Collection looked at on its own (app/collection.tsx): a photo fills the screen,
// to swipe to the next and to zoom (the chat's own photo zoom, components/attachment.tsx); a text
// file is read here; any other file shows what it is, to open with another app, which the screen
// asks about first, as the file leaves the Collection unencrypted. A photo is read into memory to
// show, never written out, and let go of once it is no longer near. Under it: send it to a chat,
// save it to the phone, its information, and delete it.

type Props = {
  /** The files that can be swiped between, in the order shown. */
  items: CollectionItem[];
  /** Which of them opens first; null while nothing is shown. */
  start: number | null;
  /** Whether it can be sent to a chat from here (not from a hidden place's Collection). */
  canSend: boolean;
  onClose: () => void;
  onSend: (item: CollectionItem) => void;
  onSave: (item: CollectionItem) => void;
  onDelete: (item: CollectionItem) => void;
  onOpenWith: (item: CollectionItem) => void;
};

/** The day and time a file came, as the phone writes them. */
export const addedText = (at: number) => new Date(at).toLocaleString(locale(), { day: 'numeric', month: 'short', year: 'numeric' });

export function CollectionViewer({ items, start, canSend, onClose, onSend, onSave, onDelete, onOpenWith }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(start ?? 0);
  const [bars, setBars] = useState(true);
  const [info, setInfo] = useState(false);
  const shown = start !== null;
  useEffect(() => {
    if (start !== null) {
      setIndex(start);
      setBars(true);
    }
  }, [start]);
  // One deleted from here: the next one shows, or the viewer closes when none is left.
  const at = Math.min(index, items.length - 1);
  const item: CollectionItem | undefined = items[at];
  useEffect(() => {
    if (shown && items.length === 0) onClose();
  }, [shown, items.length]);
  const photo = item?.file.kind === 'photo';
  // A photo shown turns with the phone, its auto-rotate on or off; the rest of Erevos follows the setting.
  useEffect(() => {
    if (!shown || !photo) return;
    device?.turnWithPhone?.(true);
    return () => {
      device?.turnWithPhone?.(false);
    };
  }, [shown, photo]);

  const pager = useRef<FlatList<CollectionItem>>(null);
  const ink = photo ? '#FFFFFF' : colors.text;
  const faint = photo ? 'rgba(255,255,255,0.7)' : colors.textMuted;

  const act = (icon: ReactNode, label: string, run: () => void, danger = false) => (
    <Pressable key={label} onPress={run} accessibilityRole="button" accessibilityLabel={label} style={({ pressed }) => [styles.action, pressed && { opacity: 0.6 }]}>
      {icon}
      <Text variant="caption" color={danger ? colors.danger : faint} style={styles.actionText}>
        {label}
      </Text>
    </Pressable>
  );

  return (
    <Modal visible={shown && !!item} animationType="fade" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent supportedOrientations={['portrait', 'landscape-left', 'landscape-right']}>
      {item ? (
        <View style={[styles.screen, { backgroundColor: photo ? '#000000' : colors.ground }]}>
          {photo ? (
            <FlatList
              // Turned, the pages are laid out again at the photo in view.
              key={width}
              ref={pager}
              data={items}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              initialScrollIndex={at}
              getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
              keyExtractor={(i) => i.id}
              onMomentumScrollEnd={(event) => setIndex(Math.round(event.nativeEvent.contentOffset.x / width))}
              windowSize={3}
              renderItem={({ item: page, index: i }) => <PhotoPage item={page} width={width} near={Math.abs(i - at) <= 1} onTap={() => setBars((b) => !b)} />}
            />
          ) : (
            <FilePage item={item} ink={ink} muted={faint} onOpenWith={() => onOpenWith(item)} />
          )}
          {bars || !photo ? (
            <View style={[styles.top, { paddingTop: Math.max(space.sm, insets.top), backgroundColor: photo ? withAlpha('#000000', 0.55) : 'transparent' }]}>
              <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel={t('Back')} hitSlop={8} style={styles.back}>
                <BackIcon color={ink} size={24} />
              </Pressable>
              <View style={styles.titles}>
                <Text variant="bodyStrong" color={ink} numberOfLines={1}>
                  {item.file.name}
                </Text>
                <Text variant="caption" color={faint} numberOfLines={1}>
                  {addedText(item.added)} · {fileSize(item.file.size)}
                </Text>
              </View>
            </View>
          ) : null}
          {bars || !photo ? (
            <View
              style={[
                styles.bottom,
                { paddingBottom: Math.max(space.md, insets.bottom), backgroundColor: photo ? withAlpha('#000000', 0.7) : colors.sheet, borderTopColor: withAlpha(ink, 0.12) },
              ]}
            >
              {canSend ? act(<SendIcon color={ink} cut={photo ? '#000000' : colors.sheet} size={22} />, t('Send to a chat'), () => onSend(item)) : null}
              {act(<DownloadIcon color={ink} size={22} />, t('Save to phone'), () => onSave(item))}
              {act(<InfoIcon color={ink} size={22} />, t('Information'), () => setInfo(true))}
              {act(<TrashIcon color={colors.danger} size={22} />, t('Delete'), () => onDelete(item), true)}
            </View>
          ) : null}
          <Sheet visible={info} onClose={() => setInfo(false)} title={t('Information')}>
            <InfoRow label={t('Name')} value={item.file.name} />
            <InfoRow label={t('Type')} value={item.file.mime} />
            <InfoRow label={t('Size')} value={fileSize(item.file.size)} />
            {item.file.w && item.file.h ? <InfoRow label={t('Dimensions')} value={`${item.file.w} × ${item.file.h}`} /> : null}
            <InfoRow label={t('Added')} value={addedText(item.added)} />
            <Button title={t('Close')} kind="secondary" compact onPress={() => setInfo(false)} />
          </Sheet>
        </View>
      ) : null}
    </Modal>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text variant="caption" tone="muted">
        {label}
      </Text>
      <Text>{value}</Text>
    </View>
  );
}

// One photo of the pager: read when it is the one in view or next to it, let go of otherwise.
function PhotoPage({ item, width, near, onTap }: { item: CollectionItem; width: number; near: boolean; onTap: () => void }) {
  const [uri, setUri] = useState<string | null>(null);
  const [gone, setGone] = useState(false);
  useEffect(() => {
    if (!near) return;
    let active = true;
    let made: string | null = null;
    openItem(item)
      .then((bytes) => {
        if (!active) return;
        if (!bytes) {
          setGone(true);
          return;
        }
        made = photoUri(bytes, item.file.mime);
        setUri(made);
      })
      .catch(() => active && setGone(true));
    return () => {
      active = false;
      if (made) releaseUri(made);
      setUri(null);
    };
  }, [near, item.id]);
  return (
    <View style={{ width, flex: 1 }}>
      {uri ? (
        <ZoomPhoto uri={uri} w={item.file.w} h={item.file.h} onTap={onTap} />
      ) : (
        <View style={styles.center}>
          <Text color="#FFFFFF" style={styles.centered}>
            {gone ? t('This file is not here any more. A backup restored without it leaves its name behind.') : t('Opening the photo…')}
          </Text>
        </View>
      )}
    </View>
  );
}

// A file that is not a photo: its text if it is text, else what it is, to open with another app.
function FilePage({ item, ink, muted, onOpenWith }: { item: CollectionItem; ink: string; muted: string; onOpenWith: () => void }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const readable = isText(item) && item.file.size <= MOST_TEXT;
  const [text, setText] = useState<string | null>(null);
  const [gone, setGone] = useState(false);
  useEffect(() => {
    if (!readable) return;
    let active = true;
    openItem(item)
      .then((bytes) => (active ? (bytes ? setText(utf8Decode(bytes)) : setGone(true)) : undefined))
      .catch(() => active && setGone(true));
    return () => {
      active = false;
    };
  }, [item.id, readable]);
  const pad = { paddingTop: Math.max(space.sm, insets.top) + 64, paddingBottom: 96 + insets.bottom };
  if (readable && text !== null) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={[styles.text, pad]}>
        <Text selectable color={ink}>
          {text}
        </Text>
      </ScrollView>
    );
  }
  return (
    <View style={[styles.center, pad]}>
      <FileIcon color={muted} size={56} />
      <Text variant="heading" color={ink} style={styles.centered}>
        {item.file.name}
      </Text>
      <Text tone="muted" style={styles.centered}>
        {fileLook(item) === 'pdf' ? 'PDF' : item.file.mime} · {fileSize(item.file.size)}
      </Text>
      {gone ? (
        <Text color={colors.danger} style={styles.centered}>
          {t('This file is not here any more. A backup restored without it leaves its name behind.')}
        </Text>
      ) : (
        <Button title={t('Open with another app')} kind="secondary" compact onPress={onOpenWith} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.md, padding: space.xl },
  centered: { textAlign: 'center' },
  text: { paddingHorizontal: space.lg },
  top: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.md, paddingBottom: space.sm },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  titles: { flex: 1 },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', justifyContent: 'space-around', paddingTop: space.md, borderTopWidth: StyleSheet.hairlineWidth },
  action: { flex: 1, alignItems: 'center', gap: 4, paddingHorizontal: 2 },
  actionText: { textAlign: 'center' },
  infoRow: { gap: 2, paddingVertical: 2 },
});
