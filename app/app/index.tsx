import { router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LockIcon, MoreIcon, PlusIcon, SearchIcon, TimerIcon } from '../components/icons';
import { KeyFace } from '../components/key-face';
import { font, fontStyle, Sheet, Text } from '../components/ui';
import { buildInbox, filterInbox, rowTime, shownName, type InboxRow } from '../lib/inbox';
import { Archive } from '../lock/archive';
import { useLock } from '../lock/context';
import { loadE2EData } from '../lock/e2e-data';
import { Logo } from '../lock/gate';
import { History } from '../lock/history';
import { currentSpace } from '../lock/keys';
import { loadCurrentSpaceData } from '../lock/space-data';
import { radius, shape, space, withAlpha, type Colors } from '../theme/colors';
import { useStyles, useTheme } from '../theme/context';

// The home screen: the space's chats, newest first, as a messenger shows them, with a search over
// names and last messages, the relay's state, and the rest of the app behind the menu. It is read
// again each time it comes back into view, so a chat just written in moves to the top. Hidden
// chats never show here; the menu offers them in every space alike.

const MARKS = ['✓', '✓✓', '✓✓✓'];

type Relay = 'ready' | 'no-queue' | 'none';

const MENU: { title: string; detail: string; href: Href }[] = [
  { title: 'Hidden chats', detail: 'Open them with their own password', href: '/chat?hidden=1' },
  { title: 'Nearby phones', detail: 'Bluetooth and Wi-Fi, without internet', href: '/chat' },
  { title: 'Imported chats', detail: 'Telegram and WhatsApp exports', href: '/imported' },
  { title: 'Appearance', detail: 'Style, colours, glass', href: '/appearance' },
  { title: 'Lock and second password', detail: 'Password, second space', href: '/security' },
  { title: 'Backups', detail: 'Make one, automatic backups, restore', href: '/backup' },
  { title: 'User guide', detail: 'How Erevos works, and what is not protected yet', href: '/guide' },
  { title: 'Relay test', detail: 'For testing a relay', href: '/relay' },
  { title: 'Radio test', detail: 'For testing the nearby link', href: '/radio' },
];

export default function Home() {
  const styles = useStyles(makeStyles);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const lock = useLock();
  const [rows, setRows] = useState<InboxRow[] | null>(null);
  const [relay, setRelay] = useState<Relay>('none');
  const [query, setQuery] = useState('');
  const [menu, setMenu] = useState(false);
  const [now, setNow] = useState(Date.now());

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const { space: current, key } = currentSpace();
      const quiet = <T,>(promise: Promise<T>, fallback: T) => promise.catch(() => fallback);
      void Promise.all([
        quiet(loadE2EData('space', current, key), null),
        quiet(History.open('space', current, key).then((h) => h.messages()), []),
        quiet(Archive.open('space', current, key).then((a) => a.chats()), []),
        quiet(loadCurrentSpaceData(), null),
      ]).then(([e2e, messages, imported, data]) => {
        if (!active) return;
        const at = Date.now();
        setNow(at);
        setRows(buildInbox(e2e?.contacts ?? [], messages, imported, at));
        setRelay(!data?.url ? 'none' : data.ownQueue ? 'ready' : 'no-queue');
      });
      return () => {
        active = false;
      };
    }, []),
  );

  const shown = useMemo(() => filterInbox(rows ?? [], query), [rows, query]);

  const relayText = relay === 'ready' ? 'Relay ready · end-to-end encrypted' : relay === 'no-queue' ? 'Relay set · no queue yet' : 'No relay yet · tap to set one';

  const header = (
    <View style={styles.headerBlock}>
      <View style={styles.topBar}>
        <View style={styles.brand}>
          <Logo size={30} />
          <Text variant="title">Erevos</Text>
        </View>
        <View style={styles.tools}>
          <IconButton
            label={lock.passwordLock ? 'Lock now' : 'Lock and second password'}
            onPress={() => (lock.passwordLock ? lock.lockNow() : router.push('/security'))}
          >
            <LockIcon color={colors.text} />
          </IconButton>
          <IconButton label="Menu" onPress={() => setMenu(true)}>
            <MoreIcon color={colors.text} />
          </IconButton>
        </View>
      </View>
      <View style={styles.search}>
        <SearchIcon color={colors.textFaint} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search chats"
          placeholderTextColor={colors.textFaint}
          style={styles.searchInput}
          autoCorrect={false}
          returnKeyType="search"
        />
      </View>
      <Pressable
        onPress={() => router.push(relay === 'ready' ? '/chat' : '/chat?setup=1')}
        accessibilityRole="button"
        style={({ pressed }) => [styles.status, pressed && styles.pressed]}
      >
        <View style={[styles.dot, { backgroundColor: relay === 'ready' ? colors.success : relay === 'no-queue' ? colors.warning : colors.textFaint }]} />
        <Text variant="caption" tone="muted" style={styles.statusText}>
          {relayText}
        </Text>
      </Pressable>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <FlatList
        data={shown}
        keyExtractor={(row) => row.identity}
        ListHeaderComponent={header}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 120 }]}
        renderItem={({ item }) => <ChatRow row={item} now={now} />}
        ListEmptyComponent={
          rows === null ? null : query ? (
            <Text tone="muted" style={styles.emptyText}>
              No chat has “{query.trim()}” in it.
            </Text>
          ) : (
            <View style={styles.empty}>
              <Logo size={64} />
              <Text variant="heading" style={styles.emptyText}>
                No chats yet
              </Text>
              <Text tone="muted" style={styles.emptyText}>
                No account and no phone number. Share your contact link or QR code, or add someone else&apos;s, to start
                a chat.
              </Text>
            </View>
          )
        }
        ListFooterComponent={
          <Text variant="caption" tone="faint" style={styles.footer}>
            A test version: messages through a relay are end-to-end encrypted, nearby ones not yet, and nothing is audited.
          </Text>
        }
      />
      <Pressable
        onPress={() => router.push('/chat?setup=1')}
        accessibilityRole="button"
        accessibilityLabel="New chat"
        style={({ pressed }) => [
          styles.fab,
          { bottom: insets.bottom + space.xl },
          // Neon and Matrix: lit, so it glows.
          shape.glow && { boxShadow: `0px 0px 18px ${withAlpha(colors.primary, 0.6)}` },
          pressed && styles.fabPressed,
        ]}
      >
        <PlusIcon color={colors.onPrimary} size={20} />
        <Text variant="label" color={colors.onPrimary}>
          New chat
        </Text>
      </Pressable>
      <Sheet visible={menu} onClose={() => setMenu(false)}>
        {MENU.map((item) => (
          <Pressable
            key={item.title}
            accessibilityRole="button"
            onPress={() => {
              setMenu(false);
              router.push(item.href);
            }}
            style={({ pressed }) => [styles.menuRow, pressed && styles.pressed]}
          >
            <Text variant="bodyStrong">{item.title}</Text>
            <Text variant="caption" tone="muted">
              {item.detail}
            </Text>
          </Pressable>
        ))}
      </Sheet>
    </View>
  );
}

function IconButton({ label, onPress, children }: { label: string; onPress: () => void; children: React.ReactNode }) {
  const styles = useStyles(makeStyles);
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} hitSlop={6} style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
      {children}
    </Pressable>
  );
}

function ChatRow({ row, now }: { row: InboxRow; now: number }) {
  const styles = useStyles(makeStyles);
  const { colors } = useTheme();
  const name = shownName(row);
  const preview = row.last || (row.imported ? 'Imported chat, goes on here' : 'No messages yet');
  return (
    <Pressable
      onPress={() => router.push(`/chat?contact=${row.identity}`)}
      accessibilityRole="button"
      accessibilityLabel={`${name}${row.unread ? `, ${row.unread} not read` : ''}`}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <KeyFace identity={row.identity} name={row.name} size={52} />
      <View style={styles.rowBody}>
        <View style={styles.rowLine}>
          <Text variant="bodyStrong" numberOfLines={1} style={[styles.rowName, !row.name && styles.mono]}>
            {name}
          </Text>
          <Text variant="caption" color={row.unread ? colors.accentText : colors.textFaint}>
            {rowTime(row.at, now)}
          </Text>
        </View>
        <View style={styles.rowLine}>
          <View style={styles.previewLine}>
            {row.timer ? <TimerIcon color={colors.textMuted} size={13} /> : null}
            {row.last && row.mine ? (
              <Text variant="caption" color={row.mark === 2 ? colors.accentText : colors.textMuted}>
                {MARKS[row.mark]}
              </Text>
            ) : null}
            <Text
              numberOfLines={1}
              variant="caption"
              tone={row.unread ? undefined : 'muted'}
              style={[styles.preview, !row.last && styles.italic, row.unread ? styles.previewUnread : null]}
            >
              {preview}
            </Text>
          </View>
          {row.unread ? (
            <View style={styles.badge}>
              <Text variant="caption" color={colors.onPrimary} style={styles.badgeText}>
                {row.unread > 99 ? '99+' : row.unread}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.ground,
    },
    list: {
      width: '100%',
      maxWidth: 760,
      alignSelf: 'center',
      paddingHorizontal: space.lg,
    },
    headerBlock: {
      gap: space.md,
      paddingTop: space.md,
      paddingBottom: space.sm,
    },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    brand: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.sm,
    },
    tools: {
      flexDirection: 'row',
      gap: space.xs,
    },
    iconButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pressed: {
      backgroundColor: colors.surfacePressed,
    },
    search: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.sm,
      height: 46,
      paddingHorizontal: space.md,
      borderRadius: radius.pill,
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1,
      borderColor: withAlpha(colors.border, 0.6),
    },
    searchInput: {
      flex: 1,
      height: '100%',
      color: colors.text,
      fontSize: 16,
      ...(fontStyle('400') ?? {}),
      ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : {}),
    },
    status: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: space.sm,
      paddingVertical: 6,
      paddingHorizontal: space.md,
      borderRadius: radius.pill,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: withAlpha(colors.border, 0.6),
    },
    statusText: {
      fontSize: 12,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.md,
      paddingVertical: space.sm + 2,
      paddingHorizontal: space.sm,
      marginHorizontal: -space.sm,
      borderRadius: radius.lg,
    },
    rowBody: {
      flex: 1,
      gap: 3,
    },
    rowLine: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: space.sm,
    },
    rowName: {
      flex: 1,
    },
    mono: {
      fontFamily: 'monospace',
      fontSize: 14,
    },
    previewLine: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    preview: {
      flex: 1,
      fontSize: 14,
    },
    previewUnread: {
      ...font('600'),
    },
    italic: {
      fontStyle: 'italic',
    },
    badge: {
      minWidth: 22,
      height: 22,
      paddingHorizontal: 6,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
    },
    badgeText: {
      fontSize: 12,
      ...font('700'),
    },
    empty: {
      alignItems: 'center',
      gap: space.md,
      paddingTop: space.xxl * 2,
      paddingHorizontal: space.xl,
    },
    emptyText: {
      textAlign: 'center',
    },
    footer: {
      textAlign: 'center',
      paddingTop: space.xl,
      paddingHorizontal: space.lg,
    },
    fab: {
      position: 'absolute',
      right: space.xl,
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.sm,
      height: 56,
      paddingHorizontal: space.xl - 4,
      borderRadius: 28,
      backgroundColor: colors.primary,
      boxShadow: `0px 8px 24px ${withAlpha('#000000', 0.35)}`,
    },
    fabPressed: {
      backgroundColor: colors.primaryPressed,
    },
    menuRow: {
      gap: 2,
      paddingVertical: space.sm + 2,
      paddingHorizontal: space.sm,
      borderRadius: radius.md,
    },
  });
