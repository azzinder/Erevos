// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { useState, type ReactElement, type ReactNode } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { confirm } from '../lib/alert';
import { cloudRequest } from '../lib/backup-http';
import { playStation } from '../lib/collection-play';
import { foundStations, MOST_FOUND_BYTES, MOST_PLAYLIST, nameFromLink, RADIO_AGENT, radioSearchUrl, stationLink, type FoundStation } from '../lib/collection-radio';
import { t } from '../lib/i18n';
import { addStation, deleteStation, renameStation, type CollectionPlace, type CollectionStation } from '../lock/collection-data';
import { radius, space, withAlpha, type Colors } from '../theme/colors';
import { useColors } from '../theme/context';
import { MoreIcon, PencilIcon, SignalIcon, TrashIcon } from './icons';
import { Button, Input, Sheet, Text } from './ui';

// The Collection's Radio tab (app/collection.tsx): internet radio stations, each by its https link,
// kept sealed in the place's catalogue (lock/collection-data.ts stations). A tap plays one (lib/
// collection-play.ts playStation), its menu renames or deletes it; + adds one by its link (lib/
// collection-radio.ts), a playlist's (.m3u, .pls) fetched once for the stream's own, or found in
// Radio Browser by the words typed, sent only when Search is pressed. What the
// station learns is said where it is added and where it plays: this device's IP address.

type Options = { showTitle: boolean; stopOnLock: boolean };

export function StationsList({
  header,
  stations,
  place,
  options,
  onAdd,
  onChanged,
  onPlaying,
  bottom,
}: {
  header: ReactElement;
  stations: CollectionStation[];
  place: CollectionPlace | null;
  options: Options;
  onAdd: () => void;
  onChanged: () => void;
  onPlaying: () => void;
  bottom: number;
}) {
  const colors = useColors();
  const [note, setNote] = useState('');
  const [menu, setMenu] = useState<CollectionStation | null>(null);
  const [renaming, setRenaming] = useState<{ id: string; text: string } | null>(null);

  async function play(s: CollectionStation) {
    setNote('');
    try {
      await playStation(s, options);
      onPlaying();
    } catch (error) {
      setNote(error instanceof Error ? error.message : String(error));
    }
  }

  async function run(job: () => Promise<unknown>) {
    try {
      await job();
    } catch (error) {
      setNote(error instanceof Error ? error.message : String(error));
    }
    onChanged();
  }

  return (
    <>
      <FlatList
        data={stations}
        keyExtractor={(s) => s.id}
        contentContainerStyle={{ paddingBottom: bottom }}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View>
            {header}
            <View style={styles.intro}>
              <Text variant="caption" tone="muted">
                {t('Stations play from their https links. The station sees this device’s IP address while it plays, as any site does.')}
              </Text>
              {note ? (
                <Pressable onPress={() => setNote('')} accessibilityRole="button" accessibilityLabel={t('Close')}>
                  <Text variant="caption" color={colors.warning}>
                    {note}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text tone="muted" style={styles.centered}>
              {t('No stations yet. Add one by its link with +.')}
            </Text>
            <Button title={t('Add a station')} kind="secondary" compact onPress={onAdd} />
          </View>
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => void play(item)} onLongPress={() => setMenu(item)} accessibilityRole="button" style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}>
            <View style={[styles.icon, { backgroundColor: withAlpha(colors.primary, 0.14) }]}>
              <SignalIcon color={colors.primary} size={22} />
            </View>
            <View style={styles.grow}>
              <Text variant="bodyStrong" numberOfLines={1}>
                {item.name}
              </Text>
              <Text variant="caption" tone="muted" numberOfLines={1}>
                {hostOf(item.url)}
              </Text>
            </View>
            <Pressable onPress={() => setMenu(item)} accessibilityRole="button" accessibilityLabel={t('More')} hitSlop={8}>
              <MoreIcon color={colors.textMuted} size={20} />
            </Pressable>
          </Pressable>
        )}
      />
      <Sheet visible={menu !== null && renaming === null} onClose={() => setMenu(null)} title={menu?.name}>
        <SheetRow
          icon={<PencilIcon color={colors.primary} size={22} />}
          title={t('Rename')}
          onPress={() => {
            if (menu) setRenaming({ id: menu.id, text: menu.name });
            setMenu(null);
          }}
          colors={colors}
        />
        <SheetRow
          icon={<TrashIcon color={colors.danger} size={22} />}
          title={t('Delete the station')}
          onPress={() => {
            const s = menu;
            setMenu(null);
            if (!s || !place) return;
            void confirm(t('Delete the station “{name}”?', { name: s.name }), t('Only its link goes from the Collection.'), t('Delete')).then((yes) => (yes ? run(() => deleteStation(place, s.id)) : undefined));
          }}
          colors={colors}
        />
      </Sheet>
      <Sheet visible={renaming !== null} onClose={() => setRenaming(null)} title={t('Rename')}>
        <Input value={renaming?.text ?? ''} onChangeText={(text) => setRenaming((r) => (r ? { ...r, text } : r))} placeholder={t('Name')} accessibilityLabel={t('Name')} autoFocus maxLength={60} />
        <Button
          title={t('Save')}
          disabled={!renaming?.text.trim()}
          onPress={() => {
            const r = renaming;
            setRenaming(null);
            if (r && place) void run(() => renameStation(place, r.id, r.text));
          }}
        />
      </Sheet>
    </>
  );
}

/** Adds a station by its link, with a name of the owner's or its server's. */
export function AddStationSheet({ visible, place, onClose, onAdded }: { visible: boolean; place: CollectionPlace | null; onClose: () => void; onAdded: () => void }) {
  const [link, setLink] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [words, setWords] = useState('');
  const [found, setFound] = useState<FoundStation[] | null>(null);
  const colors = useColors();

  // Adds a station by its link (the one typed, or one found), named as given or by its server.
  async function add(given = link, called = name) {
    if (!place || busy) return;
    setBusy(true);
    setNote('');
    try {
      const at = await stationLink(given, get(MOST_PLAYLIST));
      await addStation(place, called.trim() || nameFromLink(at.url) || t('Radio'), at);
      setLink('');
      setName('');
      setWords('');
      setFound(null);
      onAdded();
      onClose();
    } catch (error) {
      setNote(error instanceof Error ? error.message : String(error));
    }
    setBusy(false);
  }

  // Radio Browser is asked only for the words typed, and only when Search is pressed.
  async function search() {
    const url = radioSearchUrl(words);
    if (!url || busy) return;
    setBusy(true);
    setNote('');
    try {
      const answer = await get(MOST_FOUND_BYTES)(url);
      if (answer.status < 200 || answer.status >= 300) throw new Error(t('Radio Browser answered {status}.', { status: answer.status }));
      setFound(foundStations(answer.bytes));
    } catch (error) {
      setNote(error instanceof Error ? error.message : String(error));
    }
    setBusy(false);
  }

  return (
    <Sheet visible={visible} onClose={onClose} title={t('Add a station')}>
      <Text variant="label">{t('Search Radio Browser')}</Text>
      <Input value={words} onChangeText={setWords} placeholder={t('A station’s name')} accessibilityLabel={t('Search Radio Browser')} autoCorrect={false} maxLength={100} onSubmitEditing={() => void search()} />
      <Text variant="caption" tone="muted">
        {t('Radio Browser (radio-browser.info), a free directory of stations, is sent only the words you type, when you press Search, and sees this device’s IP address. Only stations with an https link are shown.')}
      </Text>
      <Button title={t('Search')} kind="secondary" compact loading={busy && found === null && !!words.trim()} disabled={!words.trim() || busy} onPress={() => void search()} />
      {found !== null && found.length === 0 ? (
        <Text variant="caption" tone="muted">
          {t('Nothing found.')}
        </Text>
      ) : null}
      {(found ?? []).map((s) => (
        <Pressable key={s.url} onPress={() => void add(s.url, s.name)} disabled={busy} accessibilityRole="button" accessibilityLabel={t('Add {name}', { name: s.name })} style={({ pressed }) => [styles.sheetRow, pressed && { opacity: 0.6 }]}>
          <View style={[styles.icon, { backgroundColor: withAlpha(colors.primary, 0.14) }]}>
            <SignalIcon color={colors.primary} size={22} />
          </View>
          <View style={styles.grow}>
            <Text variant="bodyStrong" numberOfLines={1}>
              {s.name}
            </Text>
            <Text variant="caption" tone="muted" numberOfLines={1}>
              {s.about || hostOf(s.url)}
            </Text>
          </View>
        </Pressable>
      ))}
      <Text variant="label">{t('Or by its link')}</Text>
      <Input value={link} onChangeText={setLink} placeholder="https://…" accessibilityLabel={t('The station’s link')} autoCapitalize="none" autoCorrect={false} keyboardType="url" maxLength={2048} />
      <Input value={name} onChangeText={setName} placeholder={t('Name (optional)')} accessibilityLabel={t('Name (optional)')} maxLength={60} onSubmitEditing={() => void add()} />
      <Text variant="caption" tone="muted">
        {t('Only https links: Erevos opens no plain http. A playlist link (.m3u, .pls) is read once, now, for the stream’s own link. The station, and that playlist’s server, see this device’s IP address.')}
      </Text>
      {note ? (
        <Text variant="caption" color={colors.warning}>
          {note}
        </Text>
      ) : null}
      <Button title={t('Add')} loading={busy} disabled={!link.trim() || busy} onPress={() => void add()} />
    </Sheet>
  );
}

// A GET as backups make them (lib/backup-http.ts: on the phone through Tor as the space says, on a
// computer through the shell), with only Erevos's name as the User-Agent, `most` bytes at most.
const get = (most: number) => (url: string) => cloudRequest('GET', url, { 'User-Agent': RADIO_AGENT }, undefined, most);

const hostOf = (url: string) => {
  try {
    return new URL(url).host;
  } catch {
    return '';
  }
};

function SheetRow({ icon, title, onPress, colors }: { icon: ReactNode; title: string; onPress: () => void; colors: Colors }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [styles.sheetRow, pressed && { opacity: 0.6 }]}>
      <View style={[styles.icon, { backgroundColor: withAlpha(colors.primary, 0.14) }]}>{icon}</View>
      <Text variant="bodyStrong" style={styles.grow}>
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  grow: { flex: 1 },
  centered: { textAlign: 'center' },
  intro: { gap: space.xs, paddingHorizontal: space.lg, paddingBottom: space.sm },
  empty: { alignItems: 'center', gap: space.md, padding: space.xl },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.md },
  sheetRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm },
  icon: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
});
