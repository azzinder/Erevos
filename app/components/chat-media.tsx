// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Image, Modal, Platform, Pressable, ScrollView, StyleSheet, useWindowDimensions, View, type ListViewToken } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fileSize, readFile } from '../lib/attachments';
import { playVoice } from '../lib/audio';
import { dayKey, MEDIA_KINDS, monthKey, monthWeeks, soundEnding, type MediaItem, type MediaKind } from '../lib/chat-media';
import { CAN_COPY, copyText } from '../lib/clipboard';
import { locale, mark, t, useLang } from '../lib/i18n';
import { saveFile } from '../lib/save-file';
import { voiceDuration } from '../lib/voice';
import type { FileRef } from '../lock/attachment-files';
import { loadClip } from '../lock/voice-clips';
import { radius, space, withAlpha, type Colors } from '../theme/colors';
import { useColors, useStyles } from '../theme/context';
import { FileViewer, useShownPhotos } from './attachment';
import { ScreenBackdrop } from './backdrop';
import { IconButton } from './composer';
import { BackIcon, FileIcon, GlobeIcon, LaterIcon, MicIcon, MusicIcon, PhotoIcon, VideoIcon } from './icons';
import { openLink } from './linked-text';
import { MessageMenu, type MenuAction } from './message-menu';
import { SwipeBack } from './swipe-back';
import { Chip, Sheet, Text } from './ui';

// A chat's media, links and files, from its details (app/chat.tsx), each kind on its own, as
// Telegram shows a chat's shared media (lib/chat-media.ts): the photos in a grid, the rest in
// lists, under their months, the newest first. A photo or file opens to look at or save, a sound
// plays here, a link opens after asking; held, each goes to where it is in the chat. The calendar
// goes to a day that has any (DayCalendar, also the chat's own Go to a day). Photos are read only
// while they show, as in the chat, and let go of when they no longer do or this closes. A chat on
// Matrix, XMPP, Nostr or SMS shows its own here too (components/chat-history.tsx): its files open
// in the chat, where one on its network's server is fetched only when tapped, as before.

const KIND_LABELS: Record<MediaKind, string> = {
  photo: mark('Photos'),
  video: mark('Videos'),
  voice: mark('Voice messages'),
  music: mark('Music'),
  file: mark('Files'),
  link: mark('Links'),
};

// The rows' heights, fixed, so a day's row is gone to at once.
const MONTH = 40;
const LINE = 64;
const GAP = 3;
// The photos on the screen read at once: each is held whole in memory while it shows.
const SEEN_PHOTOS = Platform.OS === 'web' ? 60 : 18;
// How long a day gone to stays lit, and what this says stays, milliseconds.
const LIT_MS = 2500;
const SAID_MS = 6000;

type Row = { kind: 'month'; key: string; label: string } | { kind: 'cells'; key: string; items: MediaItem[] } | { kind: 'line'; key: string; item: MediaItem };

const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error)).split('\n')[0];

function shown(at: number, options: Intl.DateTimeFormatOptions): string {
  try {
    return new Date(at).toLocaleDateString(locale(), options);
  } catch {
    return new Date(at).toLocaleDateString();
  }
}

const capital = (text: string) => text.charAt(0).toLocaleUpperCase(locale()) + text.slice(1);

/** A month as its heading says it: October 2026 (in Greek, Οκτώβριος 2026, not the month of a date). */
function monthLabel(year: number, month: number): string {
  return capital(shown(new Date(year, month, 1).getTime(), { month: 'long', year: 'numeric' }));
}

/** A day, short: 25 Oct, with its year when not this one. */
function shortDay(at: number): string {
  if (!at) return '';
  const thisYear = new Date(at).getFullYear() === new Date().getFullYear();
  return shown(at, thisYear ? { day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short', year: 'numeric' });
}

const hostOf = (url: string) => url.replace(/^[a-z]+:\/\//i, '').replace(/^www\./i, '').split(/[/?#]/)[0];

/** The rows of one kind's items, under their months: photos `columns` to a row, the rest one each. */
function rowsOf(items: MediaItem[], columns: number): Row[] {
  const rows: Row[] = [];
  let month = '';
  let cells: MediaItem[] = [];
  const endCells = () => {
    if (cells.length > 0) rows.push({ kind: 'cells', key: cells[0].key, items: cells });
    cells = [];
  };
  for (const item of items) {
    const here = item.at ? monthKey(item.at) : '';
    if (here !== month || rows.length === 0) {
      endCells();
      month = here;
      const d = new Date(item.at);
      rows.push({ kind: 'month', key: `month-${here}`, label: item.at ? monthLabel(d.getFullYear(), d.getMonth()) : t('No date') });
    }
    if (item.kind === 'photo') {
      cells.push(item);
      if (cells.length === columns) endCells();
    } else rows.push({ kind: 'line', key: item.key, item });
  }
  endCells();
  return rows;
}

export function ChatMedia({ visible, items, name, onClose, onShow }: {
  visible: boolean;
  /** The chat's media, the newest first. */
  items: MediaItem[];
  /** The contact's name, for what they sent. */
  name: string;
  onClose: () => void;
  /** Goes to where an item is in the chat; this closes first. */
  onShow: (item: MediaItem) => void;
}) {
  useLang();
  const colors = useColors();
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [tab, setTab] = useState<MediaKind>('photo');
  const [calendar, setCalendar] = useState(false);
  const [lit, setLit] = useState<string | null>(null);
  const [menuFor, setMenuForNow] = useState<MediaItem | null>(null);
  // Each opening of the menu, so each is a menu of its own (components/message-menu.tsx).
  const [menuTurn, setMenuTurn] = useState(0);
  const setMenuFor = (item: MediaItem | null) => {
    if (item) setMenuTurn((n) => n + 1);
    setMenuForNow(item);
  };
  const [viewing, setViewing] = useState<FileRef | null>(null);
  const [seen, setSeen] = useState<FileRef[]>([]);
  const [playing, setPlaying] = useState<string | null>(null);
  const [played, setPlayed] = useState(0);
  const [said, setSaid] = useState('');
  const stop = useRef<(() => void) | null>(null);
  const list = useRef<FlatList<Row>>(null);
  const litTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saidTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const counts = useMemo(() => {
    const counted: Record<MediaKind, number> = { photo: 0, video: 0, voice: 0, music: 0, file: 0, link: 0 };
    for (const item of items) counted[item.kind] += 1;
    return counted;
  }, [items]);
  const kinds = MEDIA_KINDS.filter((kind) => counts[kind] > 0);
  // Opened on the first kind it has, or kept on the one chosen while it has any.
  useEffect(() => {
    if (visible && counts[tab] === 0 && kinds.length > 0) setTab(kinds[0]);
  }, [visible, counts]);
  // Closed: the sound stops, and nothing stays lit or said.
  useEffect(() => {
    if (visible) return;
    stop.current?.();
    stop.current = null;
    setPlaying(null);
    setCalendar(false);
    setLit(null);
    setSaid('');
  }, [visible]);
  useEffect(
    () => () => {
      stop.current?.();
      if (litTimer.current) clearTimeout(litTimer.current);
      if (saidTimer.current) clearTimeout(saidTimer.current);
    },
    [],
  );

  const wide = Math.min(width, 760) - space.lg * 2;
  const columns = wide >= 560 ? 5 : wide >= 400 ? 4 : 3;
  const cell = Math.floor((wide - GAP * (columns - 1)) / columns);
  const ofTab = useMemo(() => items.filter((item) => item.kind === tab), [items, tab]);
  const rows = useMemo(() => rowsOf(ofTab, columns), [ofTab, columns]);
  const heights = rows.map((row) => (row.kind === 'month' ? MONTH : row.kind === 'cells' ? cell + GAP : LINE));
  const offsets = useMemo(() => {
    const at = [0];
    for (const height of heights) at.push(at[at.length - 1] + height);
    return at;
  }, [rows, cell]);
  const days = useMemo(() => new Set(ofTab.filter((item) => item.at > 0).map((item) => dayKey(item.at))), [ofTab]);

  const onSeen = useRef(({ viewableItems }: { viewableItems: (Omit<ListViewToken, 'item'> & { item: Row })[] }) => {
    const files = viewableItems
      .flatMap(({ item }) => (item.kind === 'cells' ? item.items : []))
      .flatMap((item) => (item.file && !item.file.from ? [item.file] : []))
      .slice(0, SEEN_PHOTOS);
    setSeen((now) => (now.map((file) => file.id).join() === files.map((file) => file.id).join() ? now : files));
  }).current;
  const photos = useShownPhotos(visible ? (viewing?.kind === 'photo' && !seen.some((file) => file.id === viewing.id) ? [...seen, viewing] : seen) : [], (error) =>
    say(t('Cannot show the photo. {error}', { error: errorText(error) })),
  );

  function say(text: string) {
    setSaid(text);
    if (saidTimer.current) clearTimeout(saidTimer.current);
    saidTimer.current = setTimeout(() => setSaid(''), SAID_MS);
  }

  function show(item: MediaItem) {
    onClose();
    setTimeout(() => onShow(item), Platform.OS === 'web' ? 0 : 350);
  }

  async function play(item: MediaItem) {
    stop.current?.();
    stop.current = null;
    if (playing === item.key) {
      setPlaying(null);
      return;
    }
    try {
      const audio = item.voice ? await loadClip(item.voice) : item.file ? await readFile(item.file) : null;
      if (!audio) {
        say(t('This file is not on this phone.'));
        return;
      }
      setPlaying(item.key);
      setPlayed(0);
      stop.current = playVoice(
        audio,
        () => {
          stop.current = null;
          setPlaying((now) => (now === item.key ? null : now));
        },
        (ms) => setPlayed(Math.floor(ms / 1000) * 1000),
        item.file ? soundEnding(item.file) : undefined,
      );
    } catch (error) {
      say(t('Cannot play it. {error}', { error: errorText(error) }));
    }
  }

  // A tap: a photo or file opens, a sound plays, a link opens after asking. One not taken from
  // the relay yet is gone to in the chat, where a tap takes it; so is one of a chat on another
  // network, which opens there.
  function open(item: MediaItem) {
    if (item.kind === 'link' && item.url) openLink(item.url);
    else if (item.file?.from || item.outside) show(item);
    else if (item.kind === 'voice' || item.kind === 'music') void play(item);
    else if (item.file) setViewing(item.file);
  }

  async function save(file: FileRef, choose: boolean) {
    try {
      const where = await saveFile(file, choose);
      if (!where) return;
      setViewing(null);
      say(t('Saved in {where}. There it is outside Erevos, not sealed.', { where }));
    } catch (error) {
      setViewing(null);
      say(t('Not saved. {error}', { error: errorText(error) }));
    }
  }

  function goToDay(day: string) {
    const index = rows.findIndex((row) => (row.kind === 'cells' ? row.items : row.kind === 'line' ? [row.item] : []).some((item) => item.at > 0 && dayKey(item.at) === day));
    if (index < 0) return;
    // Its month's heading above it, when it is the month's first.
    const at = index > 0 && rows[index - 1].kind === 'month' ? index - 1 : index;
    list.current?.scrollToOffset({ offset: offsets[at], animated: true });
    setLit(day);
    if (litTimer.current) clearTimeout(litTimer.current);
    litTimer.current = setTimeout(() => setLit(null), LIT_MS);
  }

  const who = (item: MediaItem) => (item.mine ? t('You') : item.sender || name);

  function menuActions(item: MediaItem): MenuAction[] {
    const actions: MenuAction[] = [{ title: t('Show in chat'), onPress: () => show(item) }];
    if (item.kind === 'link' && item.url) {
      actions.push({ title: t('Open'), onPress: () => openLink(item.url!) });
      if (CAN_COPY) actions.push({ title: t('Copy link'), onPress: () => void copyText(item.url!).then((done) => say(done ? t('Copied. Any app that reads the clipboard can read it now.') : t('Not copied.'))) });
    } else if (item.file && !item.file.from) {
      actions.push({ title: t('Save'), onPress: () => void save(item.file!, false) });
    }
    return actions;
  }

  function lineTitle(item: MediaItem): string {
    if (item.kind === 'link') return item.title || hostOf(item.url ?? '');
    if (item.kind === 'voice') {
      const ms = item.voice?.ms ?? item.ms;
      return ms !== undefined ? `${t('Voice message')} · ${voiceDuration(ms)}` : t('Voice message');
    }
    return item.file?.name ?? item.outside?.name ?? '';
  }

  function lineText(item: MediaItem): string {
    if (playing === item.key) return `■  ${t('Playing, {time}', { time: voiceDuration(played) })}`;
    if (item.file?.from || (item.outside && !item.outside.uri)) return t('Not on this phone yet: tap to go to it in the chat.');
    if (item.kind === 'link') return item.url ?? '';
    const size = item.file?.size ?? item.outside?.size;
    return [size !== undefined ? fileSize(size) : '', who(item)].filter(Boolean).join(' · ');
  }

  const sign = (kind: MediaKind) => {
    const ink = colors.text;
    if (kind === 'video') return <VideoIcon color={ink} size={22} />;
    if (kind === 'voice') return <MicIcon color={ink} size={22} />;
    if (kind === 'music') return <MusicIcon color={ink} size={22} />;
    if (kind === 'link') return <GlobeIcon color={ink} size={22} />;
    return <FileIcon color={ink} size={22} />;
  };

  const renderRow = ({ item: row }: { item: Row }) => {
    if (row.kind === 'month') {
      return (
        <View style={styles.month}>
          <Text variant="overline" tone="muted">
            {row.label}
          </Text>
        </View>
      );
    }
    if (row.kind === 'cells') {
      return (
        <View style={styles.cells}>
          {row.items.map((item) => {
            const uri = item.outside?.uri ?? (item.file ? photos[item.file.id] : undefined);
            return (
              <Pressable
                key={item.key}
                onPress={() => open(item)}
                onLongPress={() => setMenuFor(item)}
                accessibilityRole="imagebutton"
                accessibilityLabel={`${t('Photo')}, ${shortDay(item.at)}`}
                accessibilityHint={t('Tap to open, hold for more')}
                style={({ pressed }) => [styles.cell, { width: cell, height: cell }, item.at > 0 && lit === dayKey(item.at) && styles.lit, pressed && { opacity: 0.7 }]}
              >
                {uri ? (
                  <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" resizeMethod="resize" blurRadius={item.file?.hidden ? 40 : undefined} />
                ) : (
                  <PhotoIcon color={withAlpha(colors.text, item.file?.from || item.outside ? 0.25 : 0.4)} size={Math.min(28, cell / 3)} />
                )}
              </Pressable>
            );
          })}
        </View>
      );
    }
    const item = row.item;
    return (
      <Pressable
        onPress={() => open(item)}
        onLongPress={() => setMenuFor(item)}
        accessibilityRole="button"
        accessibilityHint={item.kind === 'voice' || item.kind === 'music' ? t('Tap to play, hold for more') : t('Tap to open, hold for more')}
        style={({ pressed }) => [styles.line, item.at > 0 && lit === dayKey(item.at) && styles.lit, pressed && { backgroundColor: colors.surfacePressed }]}
      >
        <View style={styles.sign}>{sign(item.kind)}</View>
        <View style={styles.grow}>
          <Text numberOfLines={1} style={styles.lineTitle}>
            {lineTitle(item)}
          </Text>
          <Text variant="caption" tone="muted" numberOfLines={1}>
            {lineText(item)}
          </Text>
        </View>
        <Text variant="caption" tone="muted">
          {shortDay(item.at)}
        </Text>
      </Pressable>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <ScreenBackdrop>
        <SwipeBack onBack={onClose}>
          <View style={[styles.screen, { paddingTop: insets.top }]}>
            <View style={styles.bar}>
              <IconButton label={t('Back')} onPress={onClose}>
                <BackIcon color={colors.text} size={24} />
              </IconButton>
              <View style={styles.grow}>
                <Text variant="heading" numberOfLines={1}>
                  {name}
                </Text>
                <Text variant="caption" tone="muted" numberOfLines={1}>
                  {t('Media, links and files')}
                </Text>
              </View>
              {days.size > 0 ? (
                <IconButton label={t('Go to a day')} onPress={() => setCalendar(true)}>
                  <LaterIcon color={colors.text} size={22} />
                </IconButton>
              ) : null}
            </View>
            {kinds.length > 0 ? (
              <>
                <View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
                    {kinds.map((kind) => (
                      <Chip key={kind} label={`${t(KIND_LABELS[kind])} ${counts[kind]}`} selected={kind === tab} onPress={() => setTab(kind)} />
                    ))}
                  </ScrollView>
                </View>
                <FlatList
                  ref={list}
                  key={`${tab}-${columns}`}
                  data={rows}
                  keyExtractor={(row) => row.key}
                  renderItem={renderRow}
                  getItemLayout={(_, index) => ({ length: heights[index] ?? 0, offset: offsets[index] ?? 0, index })}
                  onViewableItemsChanged={onSeen}
                  viewabilityConfig={SEEN}
                  extraData={[photos, lit, playing, played]}
                  initialNumToRender={12}
                  windowSize={7}
                  style={styles.grow}
                  contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + space.xl }]}
                />
              </>
            ) : (
              <View style={styles.empty}>
                <Text tone="muted" style={styles.center}>
                  {t('Nothing here yet. The photos, videos, voice messages, music, files and links of this chat show here, each kind apart.')}
                </Text>
              </View>
            )}
            {said ? (
              <Text variant="caption" tone="muted" style={[styles.said, { marginBottom: insets.bottom + space.sm }]}>
                {said}
              </Text>
            ) : null}
          </View>
        </SwipeBack>
      </ScreenBackdrop>
      <DayCalendar
        visible={calendar}
        days={days}
        start={ofTab[0]?.at || Date.now()}
        onPick={(day) => {
          setCalendar(false);
          setTimeout(() => goToDay(day), Platform.OS === 'web' ? 0 : 300);
        }}
        onClose={() => setCalendar(false)}
      />
      <MessageMenu key={`menu-${menuTurn}`} visible={menuFor !== null} onClose={() => setMenuFor(null)} line={menuFor ? lineTitle(menuFor) || t('Photo') : ''} actions={menuFor ? menuActions(menuFor) : []} />
      <FileViewer file={viewing} uri={viewing ? photos[viewing.id] : undefined} onSave={(choose) => viewing && void save(viewing, choose)} onClose={() => setViewing(null)} />
    </Modal>
  );
}

const SEEN = { itemVisiblePercentThreshold: 10 };

/**
 * A month's days, Monday first, to go to one: those in `days` (dayKey) are marked and can be
 * tapped, the others not. It opens at `start`'s month, and goes from the first month with a day
 * to the last.
 */
export function DayCalendar({ visible, days, start, onPick, onClose }: {
  visible: boolean;
  days: Set<string>;
  /** A time in the month it opens at. */
  start: number;
  onPick: (day: string) => void;
  onClose: () => void;
}) {
  useLang();
  const colors = useColors();
  const styles = useStyles(makeStyles);
  const [month, setMonth] = useState(() => monthOf(start));
  useEffect(() => {
    if (visible) setMonth(monthOf(start));
  }, [visible]);
  const sorted = useMemo(() => [...days].sort(), [days]);
  const first = sorted[0]?.slice(0, 7) ?? '';
  const last = sorted[sorted.length - 1]?.slice(0, 7) ?? '';
  const key = `${month.year}-${String(month.month + 1).padStart(2, '0')}`;
  const step = (by: number) => setMonth(({ year, month: m }) => monthOf(new Date(year, m + by, 1).getTime()));
  // The weekdays' short names, Monday first: 1 January 2024 was a Monday.
  const weekdays = useMemo(() => Array.from({ length: 7 }, (_, i) => shown(new Date(2024, 0, 1 + i).getTime(), { weekday: 'short' })), [locale()]);
  const today = dayKey(Date.now());
  return (
    <Sheet visible={visible} onClose={onClose} title={t('Go to a day')}>
      <View style={styles.monthBar}>
        <IconButton label={t('Previous month')} onPress={() => step(-1)} disabled={!first || key <= first}>
          <BackIcon color={colors.text} size={22} />
        </IconButton>
        <Text variant="label" style={[styles.grow, styles.center]}>
          {monthLabel(month.year, month.month)}
        </Text>
        <IconButton label={t('Next month')} onPress={() => step(1)} disabled={!last || key >= last}>
          <View style={styles.flip}>
            <BackIcon color={colors.text} size={22} />
          </View>
        </IconButton>
      </View>
      <View style={styles.week}>
        {weekdays.map((name, i) => (
          <Text key={i} variant="caption" tone="muted" style={[styles.weekday, styles.center]}>
            {name}
          </Text>
        ))}
      </View>
      {monthWeeks(month.year, month.month).map((week, w) => (
        <View key={w} style={styles.week}>
          {week.map((date, i) => {
            const day = date ? `${key}-${String(date).padStart(2, '0')}` : '';
            const has = !!day && days.has(day);
            return (
              <View key={i} style={styles.dayCell}>
                {date ? (
                  <Pressable
                    onPress={has ? () => onPick(day) : undefined}
                    disabled={!has}
                    accessibilityRole="button"
                    accessibilityState={{ disabled: !has }}
                    style={({ pressed }) => [styles.day, has && styles.dayHas, day === today && styles.today, pressed && { opacity: 0.6 }]}
                  >
                    <Text style={[styles.center, has ? styles.dayHasText : { color: colors.textFaint }]}>{date}</Text>
                  </Pressable>
                ) : null}
              </View>
            );
          })}
        </View>
      ))}
      <Text variant="caption" tone="muted">
        {t('Marked days have something: tap one to go to it.')}
      </Text>
    </Sheet>
  );
}

function monthOf(at: number): { year: number; month: number } {
  const d = new Date(at || Date.now());
  return { year: d.getFullYear(), month: d.getMonth() };
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.ground,
    },
    bar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.sm,
      paddingHorizontal: space.sm,
      paddingVertical: space.xs,
    },
    grow: {
      flex: 1,
    },
    center: {
      textAlign: 'center',
    },
    tabs: {
      gap: space.sm,
      paddingHorizontal: space.lg,
      paddingVertical: space.sm,
    },
    content: {
      paddingHorizontal: space.lg,
      width: '100%',
      maxWidth: 760,
      alignSelf: 'center',
    },
    month: {
      height: MONTH,
      justifyContent: 'flex-end',
      paddingBottom: 6,
    },
    cells: {
      flexDirection: 'row',
      gap: GAP,
      marginBottom: GAP,
    },
    cell: {
      borderRadius: radius.sm,
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: withAlpha(colors.text, 0.06),
    },
    lit: {
      borderWidth: 2,
      borderColor: colors.primary,
    },
    line: {
      height: LINE,
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.md,
      paddingHorizontal: space.sm,
      borderRadius: radius.md,
    },
    sign: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: withAlpha(colors.text, 0.08),
    },
    lineTitle: {
      fontWeight: '600',
    },
    empty: {
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: space.xl,
    },
    said: {
      paddingHorizontal: space.lg,
      paddingTop: space.sm,
    },
    monthBar: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    flip: {
      transform: [{ rotate: '180deg' }],
    },
    week: {
      flexDirection: 'row',
    },
    weekday: {
      flex: 1,
    },
    dayCell: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 2,
    },
    day: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dayHas: {
      backgroundColor: withAlpha(colors.primary, 0.2),
    },
    dayHasText: {
      fontWeight: '700',
      color: colors.text,
    },
    today: {
      borderWidth: 1,
      borderColor: colors.textMuted,
    },
  });
