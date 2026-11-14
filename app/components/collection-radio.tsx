// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { router } from 'expo-router';
import { useMemo, useState, type ReactElement, type ReactNode } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { confirm } from '../lib/alert';
import { cloudRequest } from '../lib/backup-http';
import { canPlayThroughTor, playStation, playsThroughTor } from '../lib/collection-play';
import { foundStations, linkStations, MOST_COUNTRY, MOST_COUNTRY_BYTES, MOST_FOUND_BYTES, radioCountryUrl, MOST_LIST_BYTES, nameFromLink, playableStations, playlistStations, RADIO_AGENT, radioSearchUrl, type FoundStation, type StationLink } from '../lib/collection-radio';
import { utf8Decode } from '../lib/crypto';
import { countryName, homeCountry, IPTV_ORG_COUNTRIES, safeLocale } from '../lib/collection-tv';
import { lang, locale, plural, t } from '../lib/i18n';
import { type IpFix } from '../lib/ip-warning';
import { throughTorNow } from '../lib/net-http';
import { pickFile, TooLargeError } from '../lib/pick-file';
import { addStation, addStations, deleteStation, renameStation, setCollectionOption, type CollectionPlace, type CollectionStation } from '../lock/collection-data';
import { radius, space, withAlpha, type Colors } from '../theme/colors';
import { useColors } from '../theme/context';
import { MoreIcon, PencilIcon, SendIcon, SignalIcon, TrashIcon } from './icons';
import { hiddenKeep, ipGate } from './ip-warning';
import { Button, Input, Sheet, Text } from './ui';

// The Collection's Radio tab (app/collection.tsx): internet radio stations, each by its https link,
// kept sealed in the place's catalogue (lock/collection-data.ts stations). A tap plays one (lib/
// collection-play.ts playStation), its menu renames or deletes it; + adds one by its link (lib/
// collection-radio.ts), a playlist's (.m3u, .pls) fetched once for the stream's own, or found in
// Radio Browser by the words typed, sent only when Search is pressed. A playlist that names several
// stations (by its link, or a .m3u or .pls file from this device) adds each of them. What the
// station learns is said where it is added and where it plays: this device's IP address. Its menu
// also sends its name and link to a chat (sendLinkToChat), as text. With the place's Tor switch for
// its radio and TV lists on (`tor`, Collection.listsTor), Radio Browser and the playlists are asked
// only through Tor, and do not see that address. The stations play only through Tor with its Play
// through Tor on (`playTor`, Collection.playTor) or the space sending everything through Tor;
// otherwise straight, and before the first one plays Erevos says that the station sees the address
// (liveTor), once for the place's Radio, with Play through Tor to turn on instead.

/** The place's choices for playing a station or a channel, its Play through Tor (`tor`) too. */
type Options = { showTitle: boolean; stopOnLock: boolean; tor: boolean };

/**
 * Before a station or a channel plays (`act`) of a place whose Play through Tor is `tor`: whether it
 * goes through Tor, and if not, the warning that its server sees this device's IP address, said once
 * for the place's Radio, or TV (lib/ip-warning.ts), kept with the hidden chats for theirs
 * (`hidden`); with Play through Tor to turn on instead (`turnOn`) where this device plays through
 * Tor. Whether it goes through Tor; null to play nothing.
 */
export async function liveTor(act: 'station' | 'channel', hidden: boolean, tor: boolean, turnOn: (() => Promise<void>) | null): Promise<boolean | null> {
  if (playsThroughTor(tor)) return tor;
  let turned = false;
  const fix: IpFix | undefined =
    turnOn && canPlayThroughTor()
      ? {
          label: t('Play through Tor'),
          run: async () => {
            await turnOn();
            turned = true;
          },
        }
      : undefined;
  const go = await ipGate({ network: 'Erevos', act, of: 'collection', ...(hidden ? { keep: hiddenKeep() } : {}) }, fix);
  return go ? turned : null;
}

/** Turns on Play through Tor for `place`, for liveTor: what fails is said by `say`, and stops the play. */
export function turnOnPlayTor(place: CollectionPlace | null, say: (text: string) => void, done: () => void): (() => Promise<void>) | null {
  if (!place) return null;
  return async () => {
    try {
      await setCollectionOption(place, 'playTor', true);
    } catch (error) {
      say(error instanceof Error ? error.message : String(error));
      throw error;
    }
    done();
  };
}

/** How a station or a channel reaches this device as it plays, said under the list it was added from. */
export const playLine = (tor: boolean): string =>
  playsThroughTor(tor) ? t('Stations and channels play through Tor, so they do not see this device’s IP address.') : t('Stations and channels see this device’s IP address while they play.');

/**
 * Sends a station's or a channel's name and link to a chat, as a message's text: through Send to
 * (app/share.tsx), or from a hidden place's Collection (`hidden`) through its own picker (app/
 * collection-send.tsx), which lists only that hidden place's chats.
 */
export function sendLinkToChat(name: string, url: string, hidden: boolean): void {
  router.push(`${hidden ? '/collection-send' : '/share'}?text=${encodeURIComponent(`${name}\n${url}`)}`);
}

export function StationsList({
  header,
  stations,
  place,
  hidden,
  options,
  onAdd,
  onChanged,
  onPlaying,
  bottom,
}: {
  header: ReactElement;
  stations: CollectionStation[];
  place: CollectionPlace | null;
  hidden: boolean;
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
      const tor = await liveTor('station', hidden, options.tor, turnOnPlayTor(place, setNote, onChanged));
      if (tor === null) return;
      await playStation(s, { ...options, tor });
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
                {playsThroughTor(options.tor)
                  ? t('Stations play from their https links, through Tor, so the station does not see this device’s IP address.')
                  : t('Stations play from their https links. The station sees this device’s IP address while it plays, as any site does.')}
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
          icon={<SendIcon color={colors.primary} cut={colors.sheet} size={22} />}
          title={t('Send to a chat')}
          onPress={() => {
            const s = menu;
            setMenu(null);
            if (s) sendLinkToChat(s.name, s.url, hidden);
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

/** Adds a station by its link, with a name of the owner's or its server's; with `tor`, what it asks goes only through Tor; `playTor`, the place's Play through Tor. */
export function AddStationSheet({ visible, place, tor = false, playTor = false, onClose, onAdded }: { visible: boolean; place: CollectionPlace | null; tor?: boolean; playTor?: boolean; onClose: () => void; onAdded: () => void }) {
  const [link, setLink] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [words, setWords] = useState('');
  const [found, setFound] = useState<FoundStation[] | null>(null);
  const [country, setCountry] = useState(() => homeCountry(locale() ?? safeLocale(), lang()));
  const [picking, setPicking] = useState(false);
  const countries = useMemo(() => (picking ? IPTV_ORG_COUNTRIES.map((code) => ({ code, name: countryName(code, locale()) })).sort((a, b) => a.name.localeCompare(b.name)) : []), [picking]);
  const colors = useColors();

  // Adds a station by its link (the one typed, or one found), named as given or by its server.
  async function add(given = link, called = name) {
    if (!place || busy) return;
    setBusy(true);
    setNote('');
    try {
      const got = await linkStations(given, get(MOST_LIST_BYTES, tor));
      if ('many' in got) {
        await addMany(got.many, got.plain);
      } else {
        await addStation(place, called.trim() || nameFromLink(got.one.url) || t('Radio'), got.one);
        setLink('');
        setName('');
        setWords('');
        setFound(null);
        onAdded();
        onClose();
      }
    } catch (error) {
      setNote(error instanceof Error ? error.message : String(error));
    }
    setBusy(false);
  }

  // The stations of a playlist added at once; the sheet stays open and says how many were added,
  // and how many were left out (an http link, one already here, or past the most a place keeps).
  async function addMany(stations: (StationLink & { name: string })[], plain: number) {
    if (!place) return;
    const { added, skipped } = stations.length > 0 ? await addStations(place, stations) : { added: 0, skipped: 0 };
    const said = [added > 0 ? plural(added, '{n} station added.', '{n} stations added.') : t('No station was added.')];
    if (plain > 0) said.push(plural(plain, '{n} had only an http link.', '{n} had only http links.'));
    if (skipped > 0) said.push(plural(skipped, '{n} was here already.', '{n} were here already.'));
    setNote(said.join(' '));
    if (added > 0) {
      setLink('');
      setName('');
      onAdded();
    }
  }

  // A playlist file from this device (.m3u, .m3u8, .pls): read here, nothing is sent anywhere.
  async function importFile() {
    if (!place || busy) return;
    setBusy(true);
    setNote('');
    try {
      const picked = await pickFile(MOST_LIST_BYTES);
      if (picked) {
        const listed = playlistStations(utf8Decode(picked.bytes));
        if (listed.length === 0) throw new Error(t('This file names no station.'));
        const { stations, plain } = playableStations(listed);
        await addMany(stations, plain);
      }
    } catch (error) {
      setNote(error instanceof TooLargeError ? t('This file is too large for a playlist.') : error instanceof Error ? error.message : String(error));
    }
    setBusy(false);
  }

  // A ready list: Radio Browser's most listened stations of the country chosen, asked once, when
  // the button is pressed, and each with an https link added at once.
  async function addCountry() {
    const url = radioCountryUrl(country);
    if (!place || !url || busy) return;
    setBusy(true);
    setNote('');
    try {
      const answer = await get(MOST_COUNTRY_BYTES, tor)(url);
      if (answer.status < 200 || answer.status >= 300) throw new Error(t('Radio Browser answered {status}.', { status: answer.status }));
      const listed = foundStations(answer.bytes, MOST_COUNTRY);
      await addMany(listed.map(({ name: called, url: link, mime }) => ({ name: called, url: link, mime })), 0);
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
      const answer = await get(MOST_FOUND_BYTES, tor)(url);
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
        {throughTorNow(tor)
          ? t('Radio Browser (radio-browser.info), a free directory of stations, is sent only the words you type, when you press Search, through Tor, so it does not see this device’s IP address. Only stations with an https link are shown.')
          : t('Radio Browser (radio-browser.info), a free directory of stations, is sent only the words you type, when you press Search, and sees this device’s IP address. Only stations with an https link are shown.')}
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
      <Text variant="label">{t('Or a ready list of a country')}</Text>
      <Text variant="caption" tone="muted">
        {throughTorNow(tor)
          ? t('Radio Browser gives the most listened stations of the country you choose, up to {n}, and each with an https link is added. It is asked once, when you press the button, through Tor, so it does not see this device’s IP address.', { n: MOST_COUNTRY })
          : t('Radio Browser gives the most listened stations of the country you choose, up to {n}, and each with an https link is added. It is asked once, when you press the button, and sees this device’s IP address.', { n: MOST_COUNTRY })}
      </Text>
      <Pressable onPress={() => setPicking((p) => !p)} accessibilityRole="button" accessibilityLabel={t('Country')} style={({ pressed }) => [styles.sheetRow, pressed && { opacity: 0.6 }]}>
        <Text variant="bodyStrong" style={styles.grow}>
          {t('Country: {name}', { name: countryName(country, locale()) })}
        </Text>
        <Text variant="label" color={colors.primary}>
          {picking ? t('Close') : t('Change')}
        </Text>
      </Pressable>
      {picking ? (
        <ScrollView style={styles.countries} nestedScrollEnabled keyboardShouldPersistTaps="handled">
          {countries.map((c) => (
            <Pressable
              key={c.code}
              onPress={() => {
                setCountry(c.code);
                setPicking(false);
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: c.code === country }}
              style={({ pressed }) => [styles.country, c.code === country && { backgroundColor: withAlpha(colors.primary, 0.14) }, pressed && { opacity: 0.6 }]}
            >
              <Text>{c.name}</Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}
      <Button title={t('Add the stations of this country')} kind="secondary" compact loading={busy && found === null && !words.trim() && !link.trim()} disabled={busy} onPress={() => void addCountry()} />
      <Text variant="label">{t('Or by its link')}</Text>
      <Input value={link} onChangeText={setLink} placeholder="https://…" accessibilityLabel={t('The station’s link')} autoCapitalize="none" autoCorrect={false} keyboardType="url" maxLength={2048} />
      <Input value={name} onChangeText={setName} placeholder={t('Name (optional)')} accessibilityLabel={t('Name (optional)')} maxLength={60} onSubmitEditing={() => void add()} />
      <Text variant="caption" tone="muted">
        {throughTorNow(tor)
          ? t('Only https links: Erevos opens no plain http. A playlist link (.m3u, .pls) is read once, now, through Tor: for the stream’s own link, or for each station it names. That playlist’s server does not see this device’s IP address.')
          : t('Only https links: Erevos opens no plain http. A playlist link (.m3u, .pls) is read once, now: for the stream’s own link, or for each station it names. That playlist’s server sees this device’s IP address.')}{' '}
        {playLine(playTor)}
      </Text>
      {note ? (
        <Text variant="caption" color={colors.warning}>
          {note}
        </Text>
      ) : null}
      <Button title={t('Add')} loading={busy} disabled={!link.trim() || busy} onPress={() => void add()} />
      <Text variant="label">{t('Or from a playlist file')}</Text>
      <Text variant="caption" tone="muted">
        {t('A .m3u or .pls file on this device, with one station or many: each station with an https link is added. The file is read here and sent nowhere.')}
      </Text>
      <Button title={t('Import a playlist file')} kind="secondary" compact disabled={busy} onPress={() => void importFile()} />
    </Sheet>
  );
}

// A GET as backups make them (lib/backup-http.ts: on the phone through Tor as the space says, or
// only through Tor with `tor`; on a computer through the shell), with only Erevos's name as the
// User-Agent, `most` bytes at most.
const get = (most: number, tor: boolean) => (url: string) => cloudRequest('GET', url, { 'User-Agent': RADIO_AGENT }, undefined, most, tor);

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
  countries: { maxHeight: 260 },
  country: { paddingVertical: space.sm, paddingHorizontal: space.sm, borderRadius: radius.md },
});
