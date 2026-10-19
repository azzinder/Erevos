import { router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { FlatList, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LockIcon, MoreIcon, PlusIcon, SearchIcon, TimerIcon } from '../components/icons';
import { KeyFace } from '../components/key-face';
import { font, fontStyle, Sheet, Text } from '../components/ui';
import { ask } from '../lib/alert';
import { canGroup, hasCore } from '../lib/core';
import { memberName, noteText } from '../lib/groups';
import { handOverHidden } from '../lib/hidden-handoff';
import { LANG_LABELS, LANGS, lang, mark, setLang, t } from '../lib/i18n';
import { buildInbox, filterInbox, groupRows, mergeRows, rowTime, shownName, type InboxGroup, type InboxRow, type InboxSms } from '../lib/inbox';
import { HAS_LINKS, HAS_RADIO } from '../lib/radio';
import { onReceived } from '../lib/receiver';
import { spaceChats } from '../lib/space-chats';
import { spaceGroups } from '../lib/space-groups';
import { groupName, smsNumbers } from '../lib/sms-group';
import { SmsLink } from '../lib/sms-link';
import { contactNames, onSmsEvent, smsStatus, smsThreads } from '../modules/erevos-sms';
import { Archive } from '../lock/archive';
import { useLock } from '../lock/context';
import { loadE2EData } from '../lock/e2e-data';
import { Logo } from '../lock/gate';
import { searchHidden } from '../lock/hidden';
import { History, type Message } from '../lock/history';
import { loadInboxCache, saveInboxCache } from '../lock/inbox-cache';
import { currentSpace } from '../lock/keys';
import { loadCurrentSpaceData } from '../lock/space-data';
import { radius, shape, space, withAlpha, type Colors } from '../theme/colors';
import { useStyles, useTheme } from '../theme/context';

// The home screen: the space's chats, newest first, as a messenger shows them, with a search over
// names and last messages, the relay's state, and the rest of the app behind the menu. It is read
// again each time it comes back into view, so a chat just written in moves to the top, and each
// time a message comes while it shows (lib/receiver.ts). Hidden
// chats never show here: their PIN, typed in the search, opens them, in every space alike.

const MARKS = ['✓', '✓✓', '✓✓✓'];

type Relay = 'ready' | 'no-queue' | 'none';

// `phone`: only on a phone, as it needs its radio. `links`: where there are links to phones nearby.
const MENU: { title: string; detail: string; href: Href; phone?: boolean; links?: boolean }[] = [
  { title: mark('New group'), detail: mark('A group chat with your contacts, end-to-end encrypted'), href: '/new-group' },
  {
    title: mark('Nearby phones'),
    detail: HAS_RADIO ? mark('Your contacts over Bluetooth and Wi-Fi, without internet') : mark('Your contacts on the same Wi-Fi, without internet'),
    href: '/chat',
    links: true,
  },
  { title: mark('SMS'), detail: mark('Erevos as the SMS app, one list for all messages'), href: '/sms-settings', phone: true },
  { title: mark('Contacts'), detail: mark("The phone's contacts, their groups and birthdays"), href: '/contacts', phone: true },
  { title: mark('Home relay'), detail: mark('A second relay contacts write to while yours is down'), href: '/home-relay' },
  { title: mark('Tor'), detail: mark('Reach the relays through Tor, off unless turned on'), href: '/tor', phone: true },
  { title: mark('LoRa radio'), detail: mark('Text over a Meshtastic radio, kilometres away, without internet'), href: '/lora', phone: true },
  { title: mark('Imported chats'), detail: mark('Telegram and WhatsApp exports'), href: '/imported' },
  { title: mark('Appearance'), detail: mark('Style, colours, glass'), href: '/appearance' },
  { title: mark('Lock and second password'), detail: mark('Password, second space'), href: '/security' },
  { title: mark('Backups'), detail: mark('Make one, automatic backups, restore'), href: '/backup' },
  { title: mark('Updates'), detail: mark('This version, and Check for updates'), href: '/updates' },
  { title: mark('User guide'), detail: mark('How Erevos works, and what is not protected yet'), href: '/guide' },
  { title: mark('Relay test'), detail: mark('For testing a relay'), href: '/relay' },
  { title: mark('Radio test'), detail: mark('For testing the nearby link'), href: '/radio', phone: true },
];

// The phone's SMS conversations, named as the phone's contacts name them when the owner turned that on.
async function smsRows(space: number, key: Uint8Array): Promise<InboxSms[]> {
  const threads = await smsThreads();
  const named = (await SmsLink.open(space, key).catch(() => null))?.names ?? false;
  const names: Record<string, string> = named ? await contactNames(threads.flatMap((t) => smsNumbers(t.address))).catch(() => ({})) : {};
  // A group's MMS conversation: named by all its numbers.
  return threads.map((t) => {
    const numbers = smsNumbers(t.address);
    return { ...t, name: numbers.length > 1 ? groupName(numbers, names) : names[numbers[0] ?? t.address] };
  });
}

export default function Home() {
  const styles = useStyles(makeStyles);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const lock = useLock();
  const [rows, setRows] = useState<InboxRow[] | null>(null);
  const [relay, setRelay] = useState<Relay>('none');
  const [query, setQuery] = useState('');

  // A search sent with the keyboard's search key is also tried as a PIN of hidden chats. A right
  // one opens those and the search empties; a wrong one is a search like any other.
  async function searchSubmitted() {
    const place = await searchHidden(currentSpace().space, query).catch(() => null);
    if (!place) return;
    setQuery('');
    handOverHidden(place);
    router.push('/chat?hidden=open');
  }
  const [menu, setMenu] = useState(false);
  const [now, setNow] = useState(Date.now());
  // The contacts whose phones said they are open, and not long ago (lib/e2e.ts).
  const [online, setOnline] = useState<Set<string>>(new Set());
  // The phone's SMS as last read: the list shows them while they are read again.
  const smsShown = useRef<InboxSms[]>([]);
  const smsRead = useRef(false);
  // Whether the list read now shows, or still the copy kept from last time (lock/inbox-cache.ts).
  const readShown = useRef(false);
  const copyShown = useRef(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const { space: current, key } = currentSpace();
      const quiet = <T,>(promise: Promise<T>, fallback: T) => promise.catch(() => fallback);
      // The chats as the chat screen and the receiver have them (lib/space-chats.ts), or, in a
      // build that cannot encrypt, as kept on the phone.
      const chats = (): Promise<[{ identity: string; name: string; timer: number; phone?: string }[], Message[]]> =>
        hasCore()
          ? spaceChats().then(({ e2e, history }) => {
              const phones = new Map(e2e.phones().map((p) => [p.identity, p.phone]));
              return [e2e.contacts().map((c) => ({ ...c, phone: phones.get(c.identity) })), history.messages()];
            })
          : Promise.all([loadE2EData('space', current, key).then((d) => d.contacts), History.open('space', current, key).then((h) => h.messages())]);
      // The chats show as soon as they are read; the phone's SMS, slower to read (a hundred
      // conversations), join them when they are.
      const load = () => {
        let chatsRead: ((sms: InboxSms[]) => void) | null = null;
        // The phone's SMS show only once Erevos is its SMS app.
        let smsFirst = false;
        if (smsStatus()?.isDefault) {
          smsFirst = smsRead.current === false;
          void quiet(smsRows(current, key), smsShown.current).then((sms) => {
            if (!active) return;
            smsShown.current = sms;
            smsRead.current = true;
            smsFirst = false;
            chatsRead?.(sms);
          });
        } else smsShown.current = [];
        void Promise.all([
          quiet(chats(), [[], []]),
          quiet(Archive.open('space', current, key).then((a) => a.chats()), []),
          quiet(loadCurrentSpaceData(), null),
          canGroup() ? quiet(spaceGroups().then((g) => g.list() as InboxGroup[]), []) : Promise.resolve([] as InboxGroup[]),
        ]).then(([[contacts, messages], imported, data, groups]) => {
          if (!active) return;
          const name = (identity: string) => memberName(identity, contacts);
          chatsRead = (sms) => {
            const at = Date.now();
            const list = mergeRows(buildInbox(contacts, messages, imported, at, sms), groupRows(groups, name, (text) => noteText(text, name)));
            // Not "No chats yet", nor the kept copy without its SMS, while the SMS are still being
            // read the first time.
            if (smsFirst && (list.length === 0 || copyShown.current)) return;
            setNow(at);
            setRows(list);
            readShown.current = true;
            if (smsFirst) return;
            copyShown.current = false;
            void saveInboxCache(current, key, list).catch(() => undefined);
          };
          chatsRead(smsShown.current);
          setRelay(!data?.url ? 'none' : data.ownQueue ? 'ready' : 'no-queue');
        });
      };
      // Who shows online, again every few seconds, as it lasts only a while. A chat that appears
      // offline does not see it.
      const lookOnline = () =>
        void (hasCore() ? spaceChats() : Promise.reject())
          .then(({ e2e }) => {
            const at = Date.now();
            const ids = e2e.contacts().filter((c) => !c.hide && e2e.onlineUntil(c.identity, at) > 0).map((c) => c.identity);
            if (active) setOnline((before) => (before.size === ids.length && ids.every((id) => before.has(id)) ? before : new Set(ids)));
          })
          .catch(() => undefined);
      // The list as it showed last time, at once, until the one read now replaces it.
      if (!readShown.current) {
        void loadInboxCache(current, key)
          .then(({ rows: kept }) => {
            if (!active || readShown.current || kept.length === 0) return;
            copyShown.current = true;
            setNow(Date.now());
            setRows(kept);
          })
          .catch(() => undefined);
      }
      load();
      lookOnline();
      const every = setInterval(lookOnline, 5000);
      // What comes while this screen shows moves its chat to the top.
      const stop = onReceived(() => {
        load();
        lookOnline();
      });
      // And an SMS, as Erevos is the SMS app.
      const sms = onSmsEvent('onSms', load);
      // And what comes in a group.
      let stopGroups = () => undefined as void;
      if (canGroup()) {
        void spaceGroups()
          .then((g) => {
            if (active) stopGroups = g.onChange(load);
          })
          .catch(() => undefined);
      }
      return () => {
        active = false;
        clearInterval(every);
        stop();
        sms?.remove();
        stopGroups();
      };
    }, []),
  );

  const shown = useMemo(() => filterInbox(rows ?? [], query), [rows, query]);

  const relayText = relay === 'ready' ? t('Relay ready · end-to-end encrypted') : relay === 'no-queue' ? t('Relay set · no queue yet') : t('No relay yet · tap to set one');

  const header = (
    <View style={styles.headerBlock}>
      <View style={styles.topBar}>
        <View style={styles.brand}>
          <Logo size={30} />
          <Text variant="title">Erevos</Text>
        </View>
        <View style={styles.tools}>
          <IconButton
            label={lock.passwordLock ? t('Lock now') : t('Lock and second password')}
            onPress={() => (lock.passwordLock ? lock.lockNow() : router.push('/security'))}
          >
            <LockIcon color={colors.text} />
          </IconButton>
          <IconButton label={t('Menu')} onPress={() => setMenu(true)}>
            <MoreIcon color={colors.text} />
          </IconButton>
        </View>
      </View>
      <View style={styles.search}>
        <SearchIcon color={colors.textFaint} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => void searchSubmitted()}
          placeholder={t('Search chats')}
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
        renderItem={({ item }) => <ChatRow row={item} now={now} online={online.has(item.identity)} />}
        extraData={online}
        ListEmptyComponent={
          rows === null ? null : query ? (
            <Text tone="muted" style={styles.emptyText}>
              {t('No chat has “{query}” in it.', { query: query.trim() })}
            </Text>
          ) : (
            <View style={styles.empty}>
              <Logo size={64} />
              <Text variant="heading" style={styles.emptyText}>
                {t('No chats yet')}
              </Text>
              <Text tone="muted" style={styles.emptyText}>
                {t("No account and no phone number. Share your contact link or QR code, or add someone else's, to start a chat.")}
              </Text>
            </View>
          )
        }
        ListFooterComponent={
          <Text variant="caption" tone="faint" style={styles.footer}>
            {t('A test version: messages are end-to-end encrypted, through a relay and nearby alike, and nothing is audited.')}
          </Text>
        }
      />
      <Pressable
        onPress={() => router.push('/chat?setup=1')}
        accessibilityRole="button"
        accessibilityLabel={t('New chat')}
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
          {t('New chat')}
        </Text>
      </Pressable>
      <Sheet visible={menu} onClose={() => setMenu(false)}>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setMenu(false);
            chooseLanguage();
          }}
          style={({ pressed }) => [styles.menuRow, pressed && styles.pressed]}
        >
          <Text variant="bodyStrong">{lang() === 'el' ? 'Γλώσσα · Language' : 'Language · Γλώσσα'}</Text>
          <Text variant="caption" tone="muted">
            {LANG_LABELS[lang()]}
          </Text>
        </Pressable>
        {MENU.filter((item) => (item.links ? HAS_LINKS : !item.phone || Platform.OS !== 'web') && (item.href !== '/new-group' || canGroup())).map((item) => (
          <Pressable
            key={item.title}
            accessibilityRole="button"
            onPress={() => {
              setMenu(false);
              router.push(item.href);
            }}
            style={({ pressed }) => [styles.menuRow, pressed && styles.pressed]}
          >
            <Text variant="bodyStrong">{t(item.title)}</Text>
            <Text variant="caption" tone="muted">
              {t(item.detail)}
            </Text>
          </Pressable>
        ))}
      </Sheet>
    </View>
  );
}

// English or Greek, for the whole app (lib/i18n.ts). The screens start again in it, here.
function chooseLanguage() {
  ask(t('Language'), '', [
    ...LANGS.map((l) => ({ text: LANG_LABELS[l], onPress: () => void setLang(l) })),
    { text: t('Cancel'), style: 'cancel' as const },
  ]);
}

function IconButton({ label, onPress, children }: { label: string; onPress: () => void; children: React.ReactNode }) {
  const styles = useStyles(makeStyles);
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} hitSlop={6} style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
      {children}
    </Pressable>
  );
}

function ChatRow({ row, now, online = false }: { row: InboxRow; now: number; online?: boolean }) {
  const styles = useStyles(makeStyles);
  const { colors } = useTheme();
  const name = shownName(row);
  const preview = row.last || (row.imported ? t('Imported chat, goes on here') : t('No messages yet'));
  return (
    <Pressable
      onPress={() =>
        router.push(
          row.sms
            ? `/sms?to=${encodeURIComponent(row.sms)}`
            : row.identity.startsWith('group:')
              ? `/group?id=${row.identity.slice(6)}`
              : `/chat?contact=${row.identity}`,
        )
      }
      accessibilityRole="button"
      accessibilityLabel={`${name}${online ? t(', online') : ''}${row.unread ? t(', {n} not read', { n: row.unread }) : ''}`}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      {row.sms ? (
        <View style={styles.smsFace}>
          <Text variant="label" tone="muted">
            SMS
          </Text>
        </View>
      ) : (
        <View>
          <KeyFace identity={row.identity.startsWith('group:') ? row.identity.slice(6) : row.identity} name={row.name} size={52} avatar={row.avatar} />
          {online ? <View style={[styles.onlineDot, { backgroundColor: colors.success, borderColor: colors.background }]} /> : null}
        </View>
      )}
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
            {row.lastSms ? (
              <Text variant="caption" color={colors.warning}>
                SMS
              </Text>
            ) : null}
            {row.last && row.mine && !row.lastSms ? (
              <Text variant="caption" color={row.mark === 2 ? colors.accentText : colors.textMuted}>
                {row.mark < 0 ? t('Waiting') : MARKS[row.mark]}
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
    smsFace: {
      width: 52,
      height: 52,
      borderRadius: 26,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1,
      borderColor: withAlpha(colors.border, 0.6),
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
    onlineDot: {
      position: 'absolute',
      right: 0,
      bottom: 0,
      width: 14,
      height: 14,
      borderRadius: 7,
      borderWidth: 2,
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
