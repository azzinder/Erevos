import { router, useFocusEffect, useLocalSearchParams, useNavigation, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Image, PermissionsAndroid, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FoundRow } from '../components/found-row';
import { GearIcon, LockIcon, MoreIcon, PersonIcon, PhoneIcon, PinIcon, PlusIcon, SearchIcon, TimerIcon } from '../components/icons';
import { KeyFace } from '../components/key-face';
import { KeyboardPaddedView } from '../components/keyboard';
import { SmsActions, type SmsTarget } from '../components/sms-actions';
import { SwipeTabs } from '../components/swipe-tabs';
import { Button, Chip, font, fontStyle, Input, Row, Sheet, Text } from '../components/ui';
import { UndoBar } from '../components/undo-bar';
import { ask } from '../lib/alert';
import { sealedNamer } from '../lib/contact-book';
import { canGroup, canPublicGroup, hasCore } from '../lib/core';
import { copyNote, linkedRole } from '../lib/devices';
import { memberName, noteText } from '../lib/groups';
import { handOverHidden } from '../lib/hidden-handoff';
import { lang, mark, t } from '../lib/i18n';
import { buildInbox, filterInbox, groupRows, mergeRows, rowTime, showsIn, shownName, type InboxGroup, type InboxRow, type InboxShow, type InboxSms } from '../lib/inbox';
import { foundAt, foundName, groupFindables, searchMessages, type Findable } from '../lib/message-search';
import { checksOffered, offerChecks } from '../lib/permissions';
import { HAS_LINKS, HAS_RADIO } from '../lib/radio';
import { onReceived } from '../lib/receiver';
import { spaceChats } from '../lib/space-chats';
import { publicMemberName, spaceGroups } from '../lib/space-groups';
import { arrangeRows, dueTrash, emptyTrash, onSmsOrderChanged, sortSms } from '../lib/sms-folders';
import { groupName, smsNumbers } from '../lib/sms-group';
import { sameNumber } from '../lib/sms-invite';
import { SmsLink } from '../lib/sms-link';
import { blockedNumbers, contactCards, deleteSmsThread, onSmsEvent, smsStatus, smsThreads, smsToolsReady, type ContactCard } from '../modules/erevos-sms';
import { Archive } from '../lock/archive';
import { useLock } from '../lock/context';
import { loadE2EData } from '../lock/e2e-data';
import { Logo } from '../lock/gate';
import { searchHidden } from '../lock/hidden';
import { History, type Message } from '../lock/history';
import { loadInboxCache, saveInboxCache } from '../lock/inbox-cache';
import { currentSpace } from '../lock/keys';
import type { SmsData } from '../lock/sms-data';
import { loadCurrentSpaceData } from '../lock/space-data';
import { radius, shape, space, withAlpha, type Colors } from '../theme/colors';
import { useStyles, useTheme } from '../theme/context';

// The home screen: the space's chats, newest first, as a messenger shows them, with a search over
// names and last messages, and the messages found under them, the relay's state, and the rest of
// the app behind the menu. It is read
// again each time it comes back into view, so a chat just written in moves to the top, and each
// time a message comes while it shows (lib/receiver.ts). Hidden
// chats never show here: their PIN, typed in the search or after holding New chat down, opens
// them, in every space alike.

const MARKS = ['✓', '✓✓', '✓✓✓'];

type Relay = 'ready' | 'no-queue' | 'none';

// The places of Erevos; its settings are in Settings (lib/settings.ts). `phone`: only on a phone.
// `links`: where there are links to phones nearby.
const MENU: { title: string; detail: string; href: Href; phone?: boolean; links?: boolean }[] = [
  { title: mark('New group'), detail: mark('A group chat with your contacts, end-to-end encrypted'), href: '/new-group' },
  { title: mark('Public groups'), detail: mark('Make a group anyone with its link can join, or join one by a link'), href: '/public-groups' },
  { title: mark('Starred messages'), detail: mark('The messages you starred, in all your chats'), href: '/starred' },
  {
    title: mark('Nearby phones'),
    detail: HAS_RADIO ? mark('Your contacts over Bluetooth and Wi-Fi, without internet') : mark('Your contacts on the same Wi-Fi, without internet'),
    href: '/chat',
    links: true,
  },
  { title: mark('Contacts'), detail: mark("The phone's contacts, their groups and birthdays"), href: '/contacts', phone: true },
  { title: mark('Phone'), detail: mark('Erevos as the phone app: the keypad, the calls and the favourites'), href: '/phone', phone: true },
  { title: mark('User guide'), detail: mark('How Erevos works, and what is not protected yet'), href: '/guide' },
];

// The phone's SMS conversations, by their numbers only until the owner turns names on (`names`,
// in the list or under SMS): then named as the phone's contacts name them, with their pictures,
// or as the space's contacts kept only in Erevos do; with the space's own order of them
// (lib/sms-folders.ts: pinned, archived, in the Trash, spam) and the numbers Android blocks.
type SmsList = { threads: InboxSms[]; order: SmsData | null; blocked: string[]; names: boolean };

const NO_SMS: SmsList = { threads: [], order: null, blocked: [], names: true };

async function smsRows(space: number, key: Uint8Array): Promise<SmsList> {
  const threads = await smsThreads();
  const link = await SmsLink.open(space, key).catch(() => null);
  const all = threads.flatMap((t) => smsNumbers(t.address));
  const cards: Record<string, ContactCard> = link?.names ? await contactCards(all).catch(() => ({})) : {};
  const sealed = link?.names ? await sealedNamer() : () => '';
  const names: Record<string, string> = {};
  for (const number of all) {
    const name = cards[number]?.name || sealed(number);
    if (name) names[number] = name;
  }
  // A group's MMS conversation: named by all its numbers.
  const rows = threads.map((t) => {
    const numbers = smsNumbers(t.address);
    const one = numbers[0] ?? t.address;
    const card = numbers.length > 1 ? undefined : cards[one];
    return { ...t, name: numbers.length > 1 ? groupName(numbers, names) : names[one], photo: card?.photo || undefined };
  });
  return { threads: rows, order: link?.state ?? null, blocked: await blockedNumbers(), names: !!link?.names };
}

// The spaces whose Trash was looked at since Erevos started: what was there long enough goes from
// the phone once each time.
const trashLooked = new Set<number>();

// Which of the list shows: all of it, the SMS, or the Erevos chats (lib/inbox.ts, showsIn).
// Erevos's widget and its icons in the launcher open on one of them (erevos://?show=sms), again
// each time they are tapped (`opened`, app/_layout.tsx).
const SHOWS: InboxShow[] = ['all', 'sms', 'erevos'];
const showOf = (show: unknown): InboxShow => (show === 'sms' || show === 'erevos' ? show : 'all');
const isSms = (row: InboxRow) => showsIn(row, 'sms');

// How long New chat is held down before it asks for a PIN of hidden chats, in milliseconds.
const DOOR_HOLD = 1500;

export default function Home() {
  const styles = useStyles(makeStyles);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const lock = useLock();
  const [rows, setRows] = useState<InboxRow[] | null>(null);
  const [relay, setRelay] = useState<Relay>('none');
  const [query, setQuery] = useState('');
  const params = useLocalSearchParams<{ show?: string; opened?: string }>();
  const [show, setShow] = useState<InboxShow>(showOf(params.show));
  useEffect(() => {
    if (typeof params.show === 'string') setShow(showOf(params.show));
  }, [params.show, params.opened]);
  // After a new version, the permissions check shows by itself once, when calls and messages in
  // the background need something (lib/permissions.ts); in the web app after a new signed release,
  // when messages, calls or the data need something (lib/permissions.web.ts). A moment later, and
  // only if nothing else opened meanwhile (a link, the widget, a call): then the next start offers it.
  const navigation = useNavigation();
  useEffect(() => {
    let active = true;
    const wait = setTimeout(() => {
      void offerChecks().then((offer) => {
        if (!offer || !active || !navigation.isFocused()) return;
        void checksOffered();
        router.push('/permissions?after=update');
      });
    }, 1500);
    return () => {
      active = false;
      clearTimeout(wait);
    };
  }, [navigation]);
  // The space's messages as last read, and its chats' names, for the search.
  const [searched, setSearched] = useState<{ messages: Findable[]; names: Map<string, string> }>({ messages: [], names: new Map() });

  // A search sent with the keyboard's search key is also tried as a PIN of hidden chats. A right
  // one opens those and the search empties; a wrong one is a search like any other.
  async function searchSubmitted() {
    const place = await searchHidden(currentSpace().space, query).catch(() => null);
    if (!place) return;
    setQuery('');
    handOverHidden(place);
    router.push('/chat?hidden=open');
  }
  // New chat held down asks for a PIN of hidden chats, alike in every space: a right one opens
  // them, a wrong one only closes it, as a search that finds nothing.
  const [door, setDoor] = useState(false);
  const [doorPin, setDoorPin] = useState('');
  const closeDoor = () => {
    setDoor(false);
    setDoorPin('');
  };
  async function openDoor() {
    const pin = doorPin;
    closeDoor();
    const place = await searchHidden(currentSpace().space, pin).catch(() => null);
    if (!place) return;
    handOverHidden(place);
    router.push('/chat?hidden=open');
  }
  const [menu, setMenu] = useState(false);
  const closeMenu = () => setMenu(false);
  const [now, setNow] = useState(Date.now());
  // The contacts whose phones said they are open, and not long ago (lib/e2e.ts).
  const [online, setOnline] = useState<Set<string>>(new Set());
  // The phone's SMS as last read: the list shows them while they are read again.
  const smsShown = useRef<SmsList>(NO_SMS);
  // Read again, as when the names were just turned on.
  const [again, setAgain] = useState(0);
  // How many SMS conversations are in the space's Archive, Spam and Trash.
  const [folders, setFolders] = useState({ archived: 0, spam: 0, trash: 0 });
  // The SMS conversation held down, whose actions show.
  const [target, setTarget] = useState<SmsTarget | null>(null);
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
        let chatsRead: ((sms: SmsList) => void) | null = null;
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
          if (smsToolsReady() && !trashLooked.has(current)) {
            trashLooked.add(current);
            void SmsLink.open(current, key)
              .then((link) => emptyTrash(link, dueTrash(link.state.trash, Date.now()), deleteSmsThread))
              .then((gone) => active && gone > 0 && load())
              .catch(() => undefined);
          }
        } else smsShown.current = NO_SMS;
        void Promise.all([
          quiet(chats(), [[], []]),
          quiet(Archive.open('space', current, key).then((a) => a.chats()), []),
          quiet(loadCurrentSpaceData(), null),
          canGroup() ? quiet(spaceGroups().then((g) => g.list() as InboxGroup[]), []) : Promise.resolve([] as InboxGroup[]),
          canGroup() ? quiet(spaceGroups().then((g) => g.list().flatMap((group) => groupFindables(group.id, g.messages(group.id)))), []) : Promise.resolve([]),
        ]).then(([[contacts, messages], imported, data, groups, said]) => {
          if (!active) return;
          const name = (identity: string) => publicMemberName(identity) ?? memberName(identity, contacts);
          const phones = contacts.flatMap((c) => (c.phone ? [c.phone] : []));
          setSearched({
            messages: [...messages, ...said],
            names: new Map([...contacts.map((c): [string, string] => [`contact:${c.identity}`, shownName(c)]), ...groups.map((g): [string, string] => [`group:${g.id}`, g.name])]),
          });
          chatsRead = (sms) => {
            const at = Date.now();
            // Archived, spam and those in the Trash are not in the list; pinned ones are at its top.
            const order = sms.order;
            const sorted = order ? sortSms(sms.threads, order, sms.blocked, (t) => !!t.name || phones.some((p) => sameNumber(p, t.address))) : null;
            const merged = mergeRows(buildInbox(contacts, messages, imported, at, sorted?.list ?? sms.threads), groupRows(groups, name, (text) => noteText(text, name)));
            const list = order ? arrangeRows(merged, order.pinned, order.drafts) : merged;
            setFolders({ archived: sorted?.archived.length ?? 0, spam: sorted?.spam.length ?? 0, trash: order?.trash.length ?? 0 });
            if (sorted && sorted.back.length > 0) void SmsLink.open(current, key).then((link) => link.unarchive(sorted.back)).catch(() => undefined);
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
      // Once, in a linked device's chats restored from its backup: that they are read, not written in, here.
      void copyNote().then((text) => {
        if (text && active) ask(t('Linked devices'), text, [{ text: t('OK') }]);
      });
      const every = setInterval(lookOnline, 5000);
      // What comes while this screen shows moves its chat to the top.
      const stop = onReceived(() => {
        load();
        lookOnline();
      });
      // And an SMS, as Erevos is the SMS app, and a change of the space's order of its SMS.
      const sms = onSmsEvent('onSms', load);
      const stopOrder = onSmsOrderChanged(load);
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
        stopOrder();
        stopGroups();
      };
    }, [again]),
  );

  const shown = useMemo(() => {
    const found = filterInbox(rows ?? [], query);
    return found.filter((row) => showsIn(row, show));
  }, [rows, query, show]);
  // The choice shows once the list has SMS and Erevos chats both, or while one of them is chosen.
  const mixed = show !== 'all' || ((rows ?? []).some(isSms) && (rows ?? []).some((row) => !row.sms));
  // Names, once there are SMS conversations: they unlock the names of their numbers.
  const hasSmsRows = (rows ?? []).some((row) => row.sms !== '');

  // Turns the names of SMS numbers on, as under Settings → Phone and SMS → SMS (Android asks first), or off.
  async function toggleNames() {
    const on = !smsShown.current.names;
    if (on && Platform.OS === 'android') {
      const answer = await PermissionsAndroid.request('android.permission.READ_CONTACTS').catch(() => null);
      if (answer !== PermissionsAndroid.RESULTS.GRANTED) {
        ask(t('Not done'), t("Erevos may not read the phone's contacts, so numbers stay as they are."), [{ text: t('OK') }]);
        return;
      }
    }
    const { space: current, key } = currentSpace();
    const link = await SmsLink.open(current, key).catch(() => null);
    if (!link) return;
    await link.setNames(on);
    smsShown.current = { ...smsShown.current, names: on };
    setAgain((n) => n + 1);
  }
  // Messages with what is looked for in them, once it is two letters or more.
  const hits = useMemo(() => (query.trim().length >= 2 ? searchMessages(searched.messages, query, 50) : []), [searched, query]);
  const nameOf = (peer: string) => searched.names.get(peer) ?? shownName({ identity: peer.replace(/^contact:/, ''), name: '' });

  const relayText = relay === 'ready' ? t('Relay ready · end-to-end encrypted') : relay === 'no-queue' ? t('Relay set · no queue yet') : t('No relay yet · tap to set one');

  const header = (
    <View style={styles.headerBlock}>
      <View style={styles.topBar}>
        <View style={styles.brand}>
          <Logo size={30} />
          <Text variant="title">Erevos</Text>
        </View>
        <View style={styles.tools}>
          {Platform.OS !== 'web' ? (
            <>
              <IconButton label={t('Phone')} onPress={() => router.push('/phone')}>
                <PhoneIcon color={colors.text} />
              </IconButton>
              <IconButton label={t('Contacts')} onPress={() => router.push('/contacts')}>
                <PersonIcon color={colors.text} />
              </IconButton>
            </>
          ) : null}
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
      {mixed || hasSmsRows ? (
        <Row wrap>
          {mixed ? (
            <>
              <Chip label={t('All messages')} selected={show === 'all'} onPress={() => setShow('all')} />
              <Chip label={t('SMS')} selected={show === 'sms'} onPress={() => setShow('sms')} />
              <Chip label="Erevos" selected={show === 'erevos'} onPress={() => setShow('erevos')} />
            </>
          ) : null}
          {hasSmsRows ? <Chip label={t('Names')} selected={smsShown.current.names} onPress={() => void toggleNames()} /> : null}
        </Row>
      ) : null}
      {folders.archived + folders.spam + folders.trash > 0 ? (
        <Row wrap>
          {folders.archived ? <Chip label={t('Archived · {n}', { n: folders.archived })} onPress={() => router.push('/sms-folder?folder=archived')} /> : null}
          {folders.spam ? <Chip label={t('Spam · {n}', { n: folders.spam })} onPress={() => router.push('/sms-folder?folder=spam')} /> : null}
          {folders.trash ? <Chip label={t('Trash · {n}', { n: folders.trash })} onPress={() => router.push('/sms-folder?folder=trash')} /> : null}
        </Row>
      ) : null}
    </View>
  );

  // The list ends above the keyboard while the search is typed in, and New chat floats above it.
  return (
    <KeyboardPaddedView inset={insets.bottom} style={styles.container}>
      {/* A swipe to the side goes to the chip beside (All messages, SMS, Erevos), on the rows too:
          an SMS conversation is archived or deleted by holding it down. */}
      <SwipeTabs tabs={mixed ? SHOWS : []} current={show} onChange={setShow}>
        <FlatList
          data={shown}
          // Android's clipping of rows off the screen closed Erevos on Fabric (a row added twice).
          removeClippedSubviews={false}
          keyExtractor={(row) => row.identity}
          ListHeaderComponent={header}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 120 }]}
          renderItem={({ item }) =>
            item.sms ? (
              <ChatRow row={item} now={now} onLong={() => setTarget({ address: item.sms, name: shownName(item), at: item.at, folder: 'list' })} />
            ) : (
              <ChatRow row={item} now={now} online={online.has(item.identity)} />
            )
          }
          extraData={online}
          ListEmptyComponent={
            rows === null || hits.length > 0 ? null : query ? (
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
            <>
              {hits.length > 0 ? (
                <View style={styles.found}>
                  <Text variant="overline" tone="muted">
                    {t('Messages')}
                  </Text>
                  {hits.map((hit) => (
                    <FoundRow
                      key={`${hit.peer}|${hit.tag}`}
                      name={foundName(hit, nameOf(hit.peer))}
                      line={hit.line}
                      at={hit.at}
                      now={now}
                      onPress={() => router.push(foundAt(hit))}
                    />
                  ))}
                </View>
              ) : null}
              <Text variant="caption" tone="faint" style={styles.footer}>
                {t('A test version: messages are end-to-end encrypted, through a relay and nearby alike, and nothing is audited.')}
              </Text>
            </>
          }
        />
      </SwipeTabs>
      <Pressable
        onPress={() => router.push('/chat?setup=1')}
        onLongPress={() => setDoor(true)}
        delayLongPress={DOOR_HOLD}
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
      <UndoBar bottom={insets.bottom + space.xl + 56 + space.md} />
      <SmsActions target={target} onClose={() => setTarget(null)} />
      <Sheet visible={door} onClose={closeDoor}>
        <Input
          value={doorPin}
          onChangeText={setDoorPin}
          placeholder={t('PIN')}
          secureTextEntry
          autoFocus
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="go"
          onSubmitEditing={() => void openDoor()}
        />
        <Button title={t('Open')} onPress={() => void openDoor()} />
      </Sheet>
      <Sheet visible={menu} onClose={closeMenu}>
        {/* A linked device has the phone's groups, but makes and joins none (lib/devices.ts). */}
        {MENU.filter((item) => (item.links ? HAS_LINKS : !item.phone || Platform.OS !== 'web') && (item.href !== '/new-group' || (canGroup() && linkedRole() !== 'linked')) && (item.href !== '/public-groups' || (canPublicGroup() && linkedRole() !== 'linked'))).map((item) => (
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
        {/* Named in English too, so the language is found in one that cannot be read. */}
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setMenu(false);
            router.push('/settings');
          }}
          style={({ pressed }) => [styles.menuRow, styles.settingsRow, pressed && styles.pressed]}
        >
          <GearIcon color={colors.accentText} size={22} />
          <View style={styles.settingsText}>
            <Text variant="bodyStrong">{lang() === 'en' ? 'Settings' : `${t('Settings')} · Settings`}</Text>
            <Text variant="caption" tone="muted">
              {t('Language, appearance, privacy, the relay and more')}
            </Text>
          </View>
        </Pressable>
      </Sheet>
    </KeyboardPaddedView>
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

function ChatRow({ row, now, online = false, onLong }: { row: InboxRow; now: number; online?: boolean; onLong?: () => void }) {
  const styles = useStyles(makeStyles);
  const { colors } = useTheme();
  const [photoFailed, setPhotoFailed] = useState(false);
  const name = shownName(row);
  const preview = row.draft || row.last || (row.imported ? t('Imported chat, goes on here') : t('No messages yet'));
  return (
    <Pressable
      onLongPress={onLong}
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
      {row.sms && row.photo && !photoFailed ? (
        // The picture the phone's contacts have for the number, read from them as it shows.
        <Image source={{ uri: row.photo }} style={styles.smsFace} onError={() => setPhotoFailed(true)} accessibilityIgnoresInvertColors />
      ) : row.sms ? (
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
          {row.pinned ? <PinIcon color={colors.textFaint} size={13} /> : null}
          <Text variant="caption" color={row.unread ? colors.accentText : colors.textFaint}>
            {rowTime(row.at, now)}
          </Text>
        </View>
        <View style={styles.rowLine}>
          <View style={styles.previewLine}>
            {row.timer ? <TimerIcon color={colors.textMuted} size={13} /> : null}
            {row.draft ? (
              <Text variant="caption" color={colors.danger}>
                {t('Draft')}
              </Text>
            ) : row.lastSms ? (
              <Text variant="caption" color={colors.warning}>
                SMS
              </Text>
            ) : null}
            {row.last && row.mine && !row.lastSms && !row.draft ? (
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
    // The messages the search found, under the chats it found.
    found: {
      gap: space.sm,
      paddingHorizontal: space.lg,
      paddingTop: space.lg,
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
    settingsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.md,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      borderTopLeftRadius: 0,
      borderTopRightRadius: 0,
      paddingTop: space.md,
    },
    settingsText: {
      flex: 1,
      gap: 2,
    },
  });
