// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { memo, useEffect, useMemo, useState, type ReactElement, type ReactNode } from 'react';
import { Image, Pressable, ScrollView, SectionList, StyleSheet, View } from 'react-native';

import { confirm } from '../lib/alert';
import { cloudRequest } from '../lib/backup-http';
import { memoryUri, onCollectionMemoryDropped, releaseMemoryUri } from '../lib/collection-memory';
import { playChannel, playsThroughTor } from '../lib/collection-play';
import { RADIO_AGENT } from '../lib/collection-radio';
import {
  channelGroups,
  channelLink,
  countryName,
  folded,
  homeCountry,
  safeLocale,
  IPTV_ORG_ALL,
  IPTV_ORG_COUNTRIES,
  iptvOrgCountry,
  listFromLink,
  logoType,
  MOST_LOGO_BYTES,
  MOST_TV_LIST_BYTES,
  playableChannels,
  tvChannels,
  type ChannelLink,
} from '../lib/collection-tv';
import { utf8Decode } from '../lib/crypto';
import { lang, locale, plural, t } from '../lib/i18n';
import { throughTorNow } from '../lib/net-http';
import { pickFile, TooLargeError } from '../lib/pick-file';
import { addChannel, addChannels, deleteChannel, deleteChannelGroup, renameChannel, type CollectionChannel, type CollectionPlace } from '../lock/collection-data';
import { radius, space, withAlpha, type Colors } from '../theme/colors';
import { useColors } from '../theme/context';
import { liveTor, playLine, sendLinkToChat, turnOnPlayTor } from './collection-radio';
import { VideoScreen } from './collection-player';
import { MoreIcon, PencilIcon, SendIcon, TrashIcon, TvIcon } from './icons';
import { Button, Input, Sheet, Text } from './ui';

// The Collection's TV tab (app/collection.tsx), the Radio tab's sibling: TV channels, each by its
// https link, kept sealed in the place's catalogue (lock/collection-data.ts channels), from IPTV
// lists (lib/collection-tv.ts) or one at a time. Grouped as the list groups them, a row of groups
// to show one, and a search by name. A tap plays one over the whole screen (lib/collection-play.ts
// playChannel, components/collection-player.tsx VideoScreen); its menu renames it, sends its name
// and link to a chat, deletes it or its whole group. + adds a list by its link, iptv-org's by
// country or whole, a list file from this device, or one channel by its link. There is no
// programme guide. What the channel learns is said where it is added and where it plays: this
// device's IP address. Logos are fetched, as the lists are, only when the place's Show channel
// logos is on, as their servers see the device's IP address too; otherwise an icon. With the
// place's Tor switch for its radio and TV lists on (`tor`, Collection.listsTor), the lists and the
// logos are asked only through Tor, and those servers do not see it. The channels play as the
// stations do (components/collection-radio.tsx liveTor): only through Tor with the place's Play
// through Tor on, where a channel may start slowly or stall; otherwise straight, said once first.

/** The place's choices for playing a channel, its Play through Tor (`tor`) too. */
type Options = { showTitle: boolean; stopOnLock: boolean; tor: boolean };

// The groups shown: every one, or one by name.
const ALL = '\u0000all';

export function ChannelsList({
  header,
  channels,
  place,
  hidden,
  options,
  showLogos,
  tor = false,
  onAdd,
  onChanged,
  bottom,
}: {
  header: ReactElement;
  channels: CollectionChannel[];
  place: CollectionPlace | null;
  hidden: boolean;
  options: Options;
  showLogos: boolean;
  /** The logos are fetched only through Tor (Collection.listsTor). */
  tor?: boolean;
  onAdd: () => void;
  onChanged: () => void;
  bottom: number;
}) {
  const colors = useColors();
  const [note, setNote] = useState('');
  const [words, setWords] = useState('');
  const [group, setGroup] = useState(ALL);
  const [menu, setMenu] = useState<CollectionChannel | null>(null);
  const [renaming, setRenaming] = useState<{ id: string; text: string } | null>(null);
  const [watching, setWatching] = useState(false);

  // What was held in memory went (the space locked): no video stays over the window.
  useEffect(() => onCollectionMemoryDropped(() => setWatching(false)), []);

  const groups = useMemo(() => channelGroups(channels), [channels]);
  // Each channel's name as searched, made once for the list, not at each letter typed.
  const searchable = useMemo(() => new Map(channels.map((c) => [c.id, folded(c.name)])), [channels]);
  const sections = useMemo(() => {
    const q = folded(words.trim());
    const shown = group === ALL ? groups : groups.filter((g) => g.group === group);
    return shown
      .map((g) => ({ title: g.group, data: q ? g.channels.filter((c) => searchable.get(c.id)?.includes(q)) : g.channels }))
      .filter((s) => s.data.length > 0);
  }, [groups, group, words, searchable]);
  // A group gone (deleted) is no longer the one shown.
  useEffect(() => {
    if (group !== ALL && !groups.some((g) => g.group === group)) setGroup(ALL);
  }, [groups, group]);

  async function play(c: CollectionChannel) {
    setNote('');
    try {
      const tor = await liveTor('channel', hidden, options.tor, turnOnPlayTor(place, setNote, onChanged));
      if (tor === null) return;
      await playChannel(c, { ...options, tor });
      setWatching(true);
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

  const groupLabel = (name: string) => name || t('No group');

  return (
    <>
      <SectionList
        sections={sections}
        keyExtractor={(c) => c.id}
        contentContainerStyle={{ paddingBottom: bottom }}
        keyboardShouldPersistTaps="handled"
        stickySectionHeadersEnabled={false}
        initialNumToRender={20}
        windowSize={9}
        ListHeaderComponent={
          <View>
            {header}
            <View style={styles.intro}>
              <Text variant="caption" tone="muted">
                {playsThroughTor(options.tor)
                  ? t('Channels play from their https links, through Tor, so the channel does not see this device’s IP address. Through Tor a channel may start slowly or stall for a moment. There is no programme guide.')
                  : t('Channels play from their https links. The channel sees this device’s IP address while it plays, as any site does. There is no programme guide.')}
              </Text>
              {note ? (
                <Pressable onPress={() => setNote('')} accessibilityRole="button" accessibilityLabel={t('Close')}>
                  <Text variant="caption" color={colors.warning}>
                    {note}
                  </Text>
                </Pressable>
              ) : null}
              {channels.length > 0 ? <Input value={words} onChangeText={setWords} placeholder={t('Search channels')} accessibilityLabel={t('Search channels')} autoCorrect={false} maxLength={100} /> : null}
            </View>
            {groups.length > 1 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.groups} keyboardShouldPersistTaps="handled">
                <GroupChip label={t('All channels')} count={channels.length} on={group === ALL} onPress={() => setGroup(ALL)} colors={colors} />
                {groups.map((g) => (
                  <GroupChip key={g.group} label={groupLabel(g.group)} count={g.channels.length} on={group === g.group} onPress={() => setGroup(g.group)} colors={colors} />
                ))}
              </ScrollView>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          channels.length > 0 ? (
            <Text tone="muted" style={[styles.centered, styles.emptyText]}>
              {t('Nothing found.')}
            </Text>
          ) : (
            <View style={styles.empty}>
              <Text tone="muted" style={styles.centered}>
                {t('No channels yet. Add a list or a channel with +.')}
              </Text>
              <Button title={t('Add channels')} kind="secondary" compact onPress={onAdd} />
            </View>
          )
        }
        renderSectionHeader={({ section }) =>
          groups.length > 1 ? (
            <Text variant="overline" tone="muted" style={styles.section}>
              {groupLabel(section.title)}
            </Text>
          ) : null
        }
        renderItem={({ item }) => <ChannelRow channel={item} showLogo={showLogos} tor={tor} onPress={() => void play(item)} onMenu={() => setMenu(item)} />}
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
            const c = menu;
            setMenu(null);
            if (c) sendLinkToChat(c.name, c.url, hidden);
          }}
          colors={colors}
        />
        <SheetRow
          icon={<TrashIcon color={colors.danger} size={22} />}
          title={t('Delete the channel')}
          onPress={() => {
            const c = menu;
            setMenu(null);
            if (!c || !place) return;
            void confirm(t('Delete the channel “{name}”?', { name: c.name }), t('Only its link goes from the Collection.'), t('Delete')).then((yes) => (yes ? run(() => deleteChannel(place, c.id)) : undefined));
          }}
          colors={colors}
        />
        {menu && groups.length > 1 ? (
          <SheetRow
            icon={<TrashIcon color={colors.danger} size={22} />}
            title={t('Delete the group “{name}”', { name: groupLabel(menu.group) })}
            onPress={() => {
              const c = menu;
              setMenu(null);
              if (!c || !place) return;
              const count = channels.filter((o) => o.group === c.group).length;
              void confirm(
                t('Delete the group “{name}”?', { name: groupLabel(c.group) }),
                plural(count, 'Its {n} channel goes from the Collection.', 'Its {n} channels go from the Collection.'),
                t('Delete'),
              ).then((yes) => (yes ? run(() => deleteChannelGroup(place, c.group)) : undefined));
            }}
            colors={colors}
          />
        ) : null}
      </Sheet>
      <Sheet visible={renaming !== null} onClose={() => setRenaming(null)} title={t('Rename')}>
        <Input value={renaming?.text ?? ''} onChangeText={(text) => setRenaming((r) => (r ? { ...r, text } : r))} placeholder={t('Name')} accessibilityLabel={t('Name')} autoFocus maxLength={60} />
        <Button
          title={t('Save')}
          disabled={!renaming?.text.trim()}
          onPress={() => {
            const r = renaming;
            setRenaming(null);
            if (r && place) void run(() => renameChannel(place, r.id, r.text));
          }}
        />
      </Sheet>
      <VideoScreen visible={watching} onClose={() => setWatching(false)} />
    </>
  );
}

const ChannelRow = memo(function ChannelRow({ channel, showLogo, tor, onPress, onMenu }: { channel: CollectionChannel; showLogo: boolean; tor: boolean; onPress: () => void; onMenu: () => void }) {
  const colors = useColors();
  return (
    <Pressable onPress={onPress} onLongPress={onMenu} accessibilityRole="button" style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}>
      <Logo url={showLogo ? channel.logo : ''} tor={tor} colors={colors} />
      <View style={styles.grow}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {channel.name}
        </Text>
        <Text variant="caption" tone="muted" numberOfLines={1}>
          {hostOf(channel.url)}
        </Text>
      </View>
      <Pressable onPress={onMenu} accessibilityRole="button" accessibilityLabel={t('More')} hitSlop={8}>
        <MoreIcon color={colors.textMuted} size={20} />
      </Pressable>
    </Pressable>
  );
});

// Logos fetched, by their link: an address to show, or null for one that could not be. Kept while
// Erevos runs, the newest MOST_LOGOS, and let go of when what the Collection held in memory goes.
const logos = new Map<string, string | null>();
const MOST_LOGOS = 300;
// Logos fetched at once, and those waiting their turn.
let fetching = 0;
const waiting: (() => void)[] = [];
const AT_ONCE = 4;

onCollectionMemoryDropped(() => logos.clear());

function keepLogo(url: string, uri: string | null): void {
  logos.set(url, uri);
  while (logos.size > MOST_LOGOS) {
    const [oldest, was] = logos.entries().next().value as [string, string | null];
    logos.delete(oldest);
    if (was) releaseMemoryUri(was);
  }
}

// A logo fetched as lists are (through Tor on the phone as the space says, or only through Tor with
// `tor`; through the shell in the desktop app), with only Erevos's name as the User-Agent; only a
// picture, MOST_LOGO_BYTES at most. A row scrolled away before its turn came fetches nothing
// (undefined).
async function fetchLogo(url: string, wanted: () => boolean, tor: boolean): Promise<string | null | undefined> {
  if (fetching >= AT_ONCE) await new Promise<void>((go) => waiting.push(go));
  fetching++;
  try {
    if (!wanted()) return undefined;
    const answer = await cloudRequest('GET', url, { 'User-Agent': RADIO_AGENT }, undefined, MOST_LOGO_BYTES, tor);
    const type = answer.status >= 200 && answer.status < 300 ? logoType(answer.bytes) : null;
    return type ? memoryUri(answer.bytes, type) : null;
  } catch {
    return null;
  } finally {
    fetching--;
    waiting.shift()?.();
  }
}

function Logo({ url, tor, colors }: { url: string; tor: boolean; colors: Colors }) {
  const [uri, setUri] = useState<string | null>(url ? (logos.get(url) ?? null) : null);
  useEffect(() => {
    if (!url) {
      setUri(null);
      return;
    }
    if (logos.has(url)) {
      setUri(logos.get(url) ?? null);
      return;
    }
    let active = true;
    void fetchLogo(url, () => active, tor).then((made) => {
      if (made === undefined) return;
      keepLogo(url, made);
      if (active) setUri(made);
    });
    return () => {
      active = false;
    };
  }, [url, tor]);
  return (
    <View style={[styles.icon, { backgroundColor: withAlpha(colors.primary, 0.14) }]}>
      {uri ? <Image source={{ uri }} style={styles.logo} resizeMode="contain" accessibilityIgnoresInvertColors /> : <TvIcon color={colors.primary} size={22} />}
    </View>
  );
}

/** Adds channels: a list by its link, iptv-org's by country or whole, a list file, or one channel by its link. */
export function AddChannelsSheet({ visible, place, tor = false, playTor = false, onClose, onAdded }: { visible: boolean; place: CollectionPlace | null; tor?: boolean; playTor?: boolean; onClose: () => void; onAdded: () => void }) {
  const colors = useColors();
  const [list, setList] = useState('');
  const [link, setLink] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [country, setCountry] = useState(() => homeCountry(locale() ?? safeLocale(), lang()));
  const [picking, setPicking] = useState(false);
  const countries = useMemo(() => (picking ? IPTV_ORG_COUNTRIES.map((code) => ({ code, name: countryName(code, locale()) })).sort((a, b) => a.name.localeCompare(b.name)) : []), [picking]);

  // A list's channels added at once; the sheet stays open and says how many were added, and how
  // many were left out (an http link, one already here, or past the most a place keeps).
  async function addMany(channels: ChannelLink[], plain: number) {
    if (!place) return;
    const { added, skipped } = channels.length > 0 ? await addChannels(place, channels) : { added: 0, skipped: 0 };
    const said = [added > 0 ? plural(added, '{n} channel added.', '{n} channels added.') : t('No channel was added.')];
    if (plain > 0) said.push(plural(plain, '{n} channel had only an http link.', '{n} channels had only http links.'));
    if (skipped > 0) said.push(plural(skipped, '{n} channel was here already, or one too many.', '{n} channels were here already, or too many.'));
    setNote(said.join(' '));
    if (added > 0) onAdded();
  }

  // A list by its link: fetched once, now.
  async function addList(given: string) {
    if (!place || busy) return;
    setBusy(true);
    setNote('');
    try {
      const got = await listFromLink(given, (url) => cloudRequest('GET', url, { 'User-Agent': RADIO_AGENT }, undefined, MOST_TV_LIST_BYTES, tor));
      if ('many' in got) await addMany(got.many, got.plain);
      else await addOne(got.one.url, got.one.mime, '');
      setList('');
    } catch (error) {
      setNote(error instanceof Error ? error.message : String(error));
    }
    setBusy(false);
  }

  async function addOne(url: string, mime: string, called: string) {
    if (!place) return;
    await addChannel(place, { url, mime, name: called.trim() || hostOf(url) || t('TV') });
    setNote(t('The channel was added.'));
    onAdded();
  }

  // One channel by its own link: not fetched before it plays.
  async function addLink() {
    if (!place || busy) return;
    setBusy(true);
    setNote('');
    try {
      const one = channelLink(link);
      await addOne(one.url, one.mime, name);
      setLink('');
      setName('');
    } catch (error) {
      setNote(error instanceof Error ? error.message : String(error));
    }
    setBusy(false);
  }

  // A list file from this device (.m3u, .m3u8): read here, nothing is sent anywhere.
  async function importFile() {
    if (!place || busy) return;
    setBusy(true);
    setNote('');
    try {
      const picked = await pickFile(MOST_TV_LIST_BYTES);
      if (picked) {
        const listed = tvChannels(utf8Decode(picked.bytes));
        if (listed.length === 0) throw new Error(t('This list names no channel.'));
        const { channels, plain } = playableChannels(listed);
        await addMany(channels, plain);
      }
    } catch (error) {
      setNote(error instanceof TooLargeError ? t('This file is too large for a list.') : error instanceof Error ? error.message : String(error));
    }
    setBusy(false);
  }

  return (
    <Sheet visible={visible} onClose={onClose} title={t('Add channels')}>
      <Text variant="label">{t('From iptv-org')}</Text>
      <Text variant="caption" tone="muted">
        {throughTorNow(tor)
          ? t('iptv-org (github.com/iptv-org/iptv) is a public list of free channels. Its list is fetched through Tor, so its server does not see this device’s IP address.')
          : t('iptv-org (github.com/iptv-org/iptv) is a public list of free channels. Its server sees this device’s IP address when the list is fetched.')}{' '}
        {playLine(playTor)}
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
      <View style={styles.buttons}>
        <Button title={t('iptv-org by country')} kind="secondary" compact disabled={busy} onPress={() => void addList(iptvOrgCountry(country) ?? IPTV_ORG_ALL)} />
        <Button title={t('iptv-org: all channels')} kind="secondary" compact disabled={busy} onPress={() => void addList(IPTV_ORG_ALL)} />
      </View>
      <Text variant="label">{t('Add a list by its link')}</Text>
      <Input value={list} onChangeText={setList} placeholder="https://…/list.m3u" accessibilityLabel={t('The list’s link')} autoCapitalize="none" autoCorrect={false} keyboardType="url" maxLength={2048} onSubmitEditing={() => void addList(list)} />
      <Text variant="caption" tone="muted">
        {throughTorNow(tor)
          ? t('Only https links: Erevos opens no plain http. The list (.m3u) is read once, now, through Tor, and each channel in it with an https link is added, with its group and logo. The list’s server does not see this device’s IP address.')
          : t('Only https links: Erevos opens no plain http. The list (.m3u) is read once, now, and each channel in it with an https link is added, with its group and logo. The list’s server sees this device’s IP address.')}
      </Text>
      <Button title={t('Add the list')} loading={busy && !!list.trim()} disabled={!list.trim() || busy} onPress={() => void addList(list)} />
      {note ? (
        <Text variant="caption" color={colors.warning}>
          {note}
        </Text>
      ) : null}
      <Text variant="label">{t('Or from a list file')}</Text>
      <Text variant="caption" tone="muted">
        {t('A .m3u file on this device: each channel with an https link is added. The file is read here and sent nowhere.')}
      </Text>
      <Button title={t('Import a list file (.m3u)')} kind="secondary" compact disabled={busy} onPress={() => void importFile()} />
      <Text variant="label">{t('Or one channel by its link')}</Text>
      <Input value={link} onChangeText={setLink} placeholder="https://…/live.m3u8" accessibilityLabel={t('The channel’s link')} autoCapitalize="none" autoCorrect={false} keyboardType="url" maxLength={2048} />
      <Input value={name} onChangeText={setName} placeholder={t('Name (optional)')} accessibilityLabel={t('Name (optional)')} maxLength={60} onSubmitEditing={() => void addLink()} />
      <Button title={t('Add')} disabled={!link.trim() || busy} onPress={() => void addLink()} />
    </Sheet>
  );
}

const hostOf = (url: string) => {
  try {
    return new URL(url).host;
  } catch {
    return '';
  }
};

function GroupChip({ label, count, on, onPress, colors }: { label: string; count: number; on: boolean; onPress: () => void; colors: Colors }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      accessibilityLabel={`${label}, ${count}`}
      style={({ pressed }) => [styles.chip, { borderColor: on ? colors.primary : withAlpha(colors.text, 0.18), backgroundColor: on ? withAlpha(colors.primary, 0.14) : 'transparent' }, pressed && { opacity: 0.7 }]}
    >
      <Text variant="label" numberOfLines={1} color={on ? colors.primary : undefined}>
        {label}
      </Text>
      <Text variant="caption" tone="muted">
        {count}
      </Text>
    </Pressable>
  );
}

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
  emptyText: { padding: space.xl },
  intro: { gap: space.sm, paddingHorizontal: space.lg, paddingBottom: space.sm },
  empty: { alignItems: 'center', gap: space.md, padding: space.xl },
  groups: { gap: space.sm, paddingHorizontal: space.lg, paddingBottom: space.sm },
  chip: { flexDirection: 'row', alignItems: 'center', gap: space.xs, borderWidth: 1, borderRadius: radius.lg, paddingHorizontal: space.md, paddingVertical: space.xs, maxWidth: 220 },
  section: { paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: space.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.sm },
  sheetRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm },
  icon: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  logo: { width: 36, height: 36 },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  countries: { maxHeight: 260 },
  country: { paddingVertical: space.sm, paddingHorizontal: space.sm, borderRadius: radius.md },
});
