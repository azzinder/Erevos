// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { useState, type ReactNode } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fileSize } from '../lib/attachments';
import { confirm } from '../lib/alert';
import { CAN_SHUFFLE, playItems, shufflePlaying } from '../lib/collection-play';
import { moved, playlistItems } from '../lib/collection-view';
import { t } from '../lib/i18n';
import { deletePlaylist, itemsWhole, renamePlaylist, setPlaylistItems, type Collection, type CollectionItem, type CollectionPlace, type CollectionPlaylist } from '../lock/collection-data';
import { radius, space, withAlpha, type Colors } from '../theme/colors';
import { useColors } from '../theme/context';
import { BackIcon, ChevronIcon, CloseIcon, MusicIcon, PencilIcon, PlusIcon, TrashIcon } from './icons';
import { Button, Input, Sheet, Text } from './ui';

// A playlist of the Collection's music (lock/collection-data.ts playlists), kept sealed in the
// place's catalogue: its files in the order the owner chose, played in that order (or shuffled)
// by the same player as the rest (lib/collection-play.ts). Opened from its tile at the top of the
// Music tab (app/collection.tsx): Play, Shuffle, a tap on a file to play from it, each file moved up
// or down or taken out (it stays in the Collection), and the playlist renamed or deleted.

type Options = { showTitle: boolean; stopOnLock: boolean };

export function PlaylistScreen({
  playlist,
  collection,
  place,
  options,
  onClose,
  onChanged,
  onPlaying,
}: {
  playlist: CollectionPlaylist | null;
  collection: Collection;
  place: CollectionPlace | null;
  options: Options;
  onClose: () => void;
  onChanged: () => void;
  onPlaying: () => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [note, setNote] = useState('');
  const [renaming, setRenaming] = useState<string | null>(null);
  const items = playlist ? playlistItems(collection, playlist) : [];

  async function run(job: () => Promise<unknown>) {
    setNote('');
    try {
      await job();
    } catch (error) {
      setNote(error instanceof Error ? error.message : String(error));
    }
    onChanged();
  }

  // Plays the playlist from `start`: only its files whose chunks are all here, in its order.
  async function play(start: number, shuffle = false) {
    if (!place || items.length === 0) return;
    setNote('');
    try {
      const here = await itemsWhole(items);
      const ids = new Set(here.map((i) => i.id));
      const list = items.filter((i) => ids.has(i.id));
      if (list.length === 0) {
        setNote(t('The files of this playlist are not on this device yet.'));
        return;
      }
      const from = Math.max(0, list.findIndex((i) => i.id === items[start]?.id));
      await playItems(place, list, from, options);
      if (CAN_SHUFFLE) await shufflePlaying(shuffle);
      onPlaying();
    } catch (error) {
      setNote(error instanceof Error ? error.message : String(error));
    }
  }

  const order = items.map((i) => i.id);
  const move = (index: number, by: number) => place && playlist && void run(() => setPlaylistItems(place, playlist.id, moved(order, index, by)));
  const takeOut = (id: string) => place && playlist && void run(() => setPlaylistItems(place, playlist.id, order.filter((x) => x !== id)));

  async function remove() {
    if (!place || !playlist) return;
    if (!(await confirm(t('Delete the playlist “{name}”?', { name: playlist.name }), t('Its files stay in the Collection.'), t('Delete')))) return;
    await run(() => deletePlaylist(place, playlist.id));
    onClose();
  }

  async function saveName() {
    if (!place || !playlist || renaming === null) return;
    const name = renaming;
    setRenaming(null);
    await run(() => renamePlaylist(place, playlist.id, name));
  }

  return (
    <Modal visible={playlist !== null} animationType="slide" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      <View style={[styles.screen, { backgroundColor: colors.ground, paddingTop: insets.top }]}>
        <View style={styles.bar}>
          <Tap label={t('Back')} onPress={onClose}>
            <BackIcon color={colors.text} size={24} />
          </Tap>
          <View style={styles.grow}>
            <Text variant="heading" numberOfLines={1}>
              {playlist?.name ?? ''}
            </Text>
            <Text variant="caption" tone="muted">
              {t('Playlist')}
            </Text>
          </View>
          <Tap label={t('Rename the playlist')} onPress={() => setRenaming(playlist?.name ?? '')}>
            <PencilIcon color={colors.text} size={20} />
          </Tap>
          <Tap label={t('Delete the playlist')} onPress={() => void remove()}>
            <TrashIcon color={colors.danger} size={20} />
          </Tap>
        </View>
        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ paddingBottom: insets.bottom + space.xl }}
          ListHeaderComponent={
            <View style={styles.top}>
              {items.length > 0 ? (
                <View style={styles.buttons}>
                  <Button title={t('Play')} compact onPress={() => void play(0)} />
                  {CAN_SHUFFLE ? <Button title={t('Shuffle')} kind="secondary" compact onPress={() => void play(Math.floor(Math.random() * items.length), true)} /> : null}
                </View>
              ) : null}
              {note ? (
                <Pressable onPress={() => setNote('')} accessibilityRole="button" accessibilityLabel={t('Close')}>
                  <Text variant="caption" color={colors.warning}>
                    {note}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          }
          ListEmptyComponent={
            <Text tone="muted" style={styles.empty}>
              {t('No music in this playlist yet. Hold a song down in Music, or open its menu, to add it.')}
            </Text>
          }
          renderItem={({ item, index }) => (
            <Row
              item={item}
              colors={colors}
              onPress={() => void play(index)}
              onUp={index > 0 ? () => move(index, -1) : undefined}
              onDown={index < items.length - 1 ? () => move(index, 1) : undefined}
              onRemove={() => takeOut(item.id)}
            />
          )}
        />
        <Sheet visible={renaming !== null} onClose={() => setRenaming(null)} title={t('Rename the playlist')}>
          <Input value={renaming ?? ''} onChangeText={setRenaming} placeholder={t('Playlist name')} accessibilityLabel={t('Playlist name')} autoFocus maxLength={60} onSubmitEditing={() => void saveName()} />
          <Button title={t('Save')} disabled={!renaming?.trim()} onPress={() => void saveName()} />
        </Sheet>
      </View>
    </Modal>
  );
}

/** Which playlist chosen files go to, or a new one. */
export function AddToPlaylistSheet({
  visible,
  playlists,
  onPick,
  onNew,
  onClose,
}: {
  visible: boolean;
  playlists: CollectionPlaylist[];
  onPick: (id: string) => void;
  onNew: () => void;
  onClose: () => void;
}) {
  const colors = useColors();
  return (
    <Sheet visible={visible} onClose={onClose} title={t('Add to a playlist')}>
      {playlists.map((l) => (
        <SheetRow key={l.id} icon={<MusicIcon color={colors.primary} size={22} />} title={l.name} text={String(l.items.length)} onPress={() => onPick(l.id)} colors={colors} />
      ))}
      <SheetRow icon={<PlusIcon color={colors.primary} size={22} />} title={t('New playlist')} onPress={onNew} colors={colors} />
    </Sheet>
  );
}

function SheetRow({ icon, title, text, onPress, colors }: { icon: ReactNode; title: string; text?: string; onPress: () => void; colors: Colors }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [styles.sheetRow, pressed && { opacity: 0.6 }]}>
      <View style={[styles.icon, { backgroundColor: withAlpha(colors.primary, 0.14) }]}>{icon}</View>
      <View style={styles.grow}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {title}
        </Text>
        {text ? (
          <Text variant="caption" tone="muted">
            {text}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

function Row({ item, colors, onPress, onUp, onDown, onRemove }: { item: CollectionItem; colors: Colors; onPress: () => void; onUp?: () => void; onDown?: () => void; onRemove: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}>
      <MusicIcon color={colors.textMuted} size={20} />
      <View style={styles.grow}>
        <Text variant="body" numberOfLines={1}>
          {item.file.name}
        </Text>
        <Text variant="caption" tone="muted">
          {fileSize(item.file.size)}
        </Text>
      </View>
      <Tap label={t('Move up')} onPress={onUp}>
        <ChevronIcon color={onUp ? colors.text : colors.textFaint} size={18} />
      </Tap>
      <Tap label={t('Move down')} onPress={onDown}>
        <ChevronIcon color={onDown ? colors.text : colors.textFaint} size={18} down />
      </Tap>
      <Tap label={t('Take out of the playlist')} onPress={onRemove}>
        <CloseIcon color={colors.textMuted} size={18} />
      </Tap>
    </Pressable>
  );
}

function Tap({ label, onPress, children }: { label: string; onPress?: () => void; children: ReactNode }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: !onPress }} hitSlop={4} style={({ pressed }) => [styles.tap, pressed && { opacity: 0.6 }]}>
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  bar: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.md, paddingVertical: space.sm, minHeight: 56 },
  grow: { flex: 1 },
  top: { gap: space.sm, paddingHorizontal: space.lg, paddingBottom: space.sm },
  buttons: { flexDirection: 'row', gap: space.sm },
  empty: { textAlign: 'center', padding: space.xl },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingLeft: space.lg, paddingRight: space.sm, paddingVertical: space.sm },
  sheetRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm },
  icon: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  tap: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
});
