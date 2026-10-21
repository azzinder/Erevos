import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, PermissionsAndroid, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ContactFace, useCardPhoto } from '../components/contact-face';
import { readErevosId } from '../components/erevos-id';
import { LockIcon, MoreIcon, PlusIcon, SearchIcon, ShieldIcon } from '../components/icons';
import { KeyboardPaddedView } from '../components/keyboard';
import { Button, Card, Chip, fontStyle, Sheet, Text } from '../components/ui';
import { allowPhoneContacts, byName, cardHref, erevosPeople, groupsByTitle, groupTitles, phoneCards, sealedCard, withErevos, type Card as ContactCard } from '../lib/contact-book';
import { saveVCards, vcfName } from '../lib/contact-files';
import { askedFields, birthdayComing, daysToBirthday, fillText, fieldsName, matches, mergeFields, parseBirthday } from '../lib/contacts';
import { enterHiddenScreen, useOpenHiddenPlace } from '../lib/hidden-contacts';
import { plural, t } from '../lib/i18n';
import { CAN_TAKE_PHOTOS } from '../lib/pick-photo';
import { readQrPhoto } from '../lib/read-qr';
import { loadPlace, onSealedChange, placeOf, spacePlace, type Place } from '../lib/sealed-contacts';
import { contactFromQr } from '../lib/vcard';
import { contactsReady, contactsStatus, onContactsEvent, phoneGroups, setBirthdayReminders, watchContacts, type PhoneGroup } from '../modules/erevos-contacts';
import { radius, shape, space, withAlpha, type Colors } from '../theme/colors';
import { useStyles, useTheme } from '../theme/context';

// Contacts: the phone's own contacts, from Android's contacts (modules/erevos-contacts), and those
// kept only in Erevos, sealed in the space (lib/sealed-contacts.ts), each as one card with the
// Erevos contact it is, and the chats' Erevos contacts that none is; with a search over every
// field, the favourites, the birthdays (the next first), each group's contacts, and a new contact.
// Read again each time it comes back into view, and when they change while it shows (another app,
// a sync). The menu has the rest: groups (app/contact-groups.tsx), birthday reminders, duplicates
// to merge (app/contact-duplicates.tsx), the SIM's contacts (app/contact-sim.tsx), .vcf files in
// (app/contact-import.tsx) and out, and a contact's QR code read from a photo.
//
// Another app's number or email to add to a contact (`add`, Android's INSERT_OR_EDIT through
// modules/erevos-contacts) makes it a list to choose that contact from, or a new one.
//
// Opened from hidden chats (`hidden`), it shows only their own sealed contacts, and nothing once
// they close (lib/hidden-contacts.ts): nothing of the phone's or the space's. It has no menu
// there: what it holds would leave Erevos (a photo picked, a file), which closes them.

/** What the list shows: everyone, the favourites, the Erevos contacts, those kept only in Erevos, the birthdays, or a group's contacts (its id). */
type Filter = 'all' | 'starred' | 'erevos' | 'sealed' | 'birthdays' | number;

export default function Contacts() {
  const styles = useStyles(makeStyles);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ hidden?: string; add?: string }>();
  const hidden = params.hidden === '1';
  // What another app asks to add to a contact, checked, kept as the screens pass it on.
  const adding = useMemo(() => {
    const fields = !hidden && typeof params.add === 'string' ? askedFields(params.add) : null;
    return fields ? { fields, text: fillText(fields) } : null;
  }, [hidden, params.add]);
  const hiddenOpen = useOpenHiddenPlace();
  const [cards, setCards] = useState<ContactCard[] | null>(null);
  const [groups, setGroups] = useState<PhoneGroup[]>([]);
  const [allowed, setAllowed] = useState(() => contactsStatus().read);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [menu, setMenu] = useState(false);
  const [readingQr, setReadingQr] = useState(false);
  const [reminders, setReminders] = useState(() => contactsStatus().birthdays);
  const [note, setNote] = useState('');
  const active = useRef(true);
  const phoneHere = Platform.OS === 'android' && contactsReady() && !hidden;

  useEffect(() => (hidden ? enterHiddenScreen() : undefined), [hidden]);

  // Where its sealed contacts are: the hidden chats while they are open, else the space.
  const place = useMemo((): Place | null => {
    if (hidden) return hiddenOpen ? placeOf(hiddenOpen) : null;
    try {
      return spacePlace();
    } catch {
      return null;
    }
  }, [hidden, hiddenOpen]);

  const load = useCallback(() => {
    const status = contactsStatus();
    setAllowed(status.read);
    if (status.read && phoneHere) watchContacts();
    const fail = (error: unknown) => active.current && setNote(t("The phone's contacts could not be read: {error}", { error: error instanceof Error ? error.message : String(error) }));
    Promise.all([
      phoneHere && status.read ? phoneCards() : Promise.resolve([]),
      place ? loadPlace(place).catch(() => null) : Promise.resolve(null),
      erevosPeople(hidden ? hiddenOpen : null),
    ])
      .then(([phone, data, people]) => {
        if (!active.current) return;
        setCards(byName(withErevos([...phone, ...(data?.contacts ?? []).map(sealedCard)], data?.links ?? [], people)));
      })
      .catch(fail);
    if (!phoneHere || !status.read) return;
    phoneGroups()
      .then((found) => {
        if (!active.current) return;
        setGroups(groupsByTitle(found));
        // A group deleted meanwhile shows everyone again.
        setFilter((f) => (typeof f === 'number' && !found.some((g) => g.id === f) ? 'all' : f));
      })
      .catch(() => undefined);
  }, [phoneHere, place, hidden, hiddenOpen]);

  useFocusEffect(
    useCallback(() => {
      active.current = true;
      load();
      const changed = phoneHere ? onContactsEvent('onContactsChanged', load) : null;
      const sealed = onSealedChange(load);
      return () => {
        active.current = false;
        changed?.remove();
        sealed();
      };
    }, [load, phoneHere]),
  );

  // Android asks once for reading and changing the contacts, as one permission.
  async function allow() {
    setNote('');
    if (!(await allowPhoneContacts())) {
      setNote(t("Without it, Erevos cannot show the phone's contacts. Allow Contacts in Erevos's App info."));
      return;
    }
    load();
  }

  const shown = useMemo(() => {
    if (filter === 'birthdays') {
      const now = new Date();
      const born = (cards ?? [])
        .map((c) => ({ c, b: parseBirthday(c.birthday) }))
        .filter((x): x is { c: ContactCard; b: NonNullable<typeof x.b> } => x.b !== null && (!query.trim() || matches(x.c, query, groupTitles(x.c, groups))))
        .sort((x, y) => daysToBirthday(x.b, now) - daysToBirthday(y.b, now));
      return born.map((x) => x.c);
    }
    const list = (cards ?? []).filter((c) =>
      filter === 'all' ? true : filter === 'starred' ? c.starred : filter === 'erevos' ? c.erevos !== '' : filter === 'sealed' ? c.sealed !== null : c.groups.includes(filter),
    );
    return query.trim() ? list.filter((c) => matches(c, query, groupTitles(c, groups))) : list;
  }, [cards, groups, query, filter]);

  // What a .vcf file takes of them: the contacts, not the chats' Erevos contacts, which stay sealed.
  const saveable = useMemo(() => shown.filter((c) => c.phone || c.sealed), [shown]);

  // A notice on the morning of each birthday: Android 13 and later ask first whether Erevos may show notices.
  async function toggleReminders() {
    setNote('');
    const on = !reminders;
    if (on && Number(Platform.Version) >= 33) {
      const answer = await PermissionsAndroid.request('android.permission.POST_NOTIFICATIONS').catch(() => null);
      if (answer !== PermissionsAndroid.RESULTS.GRANTED) {
        setNote(t("Without notices, Erevos cannot remind you of birthdays. Allow Notifications in Erevos's App info."));
        return;
      }
    }
    try {
      await setBirthdayReminders(on);
      setReminders(on);
    } catch (error) {
      setNote(error instanceof Error ? error.message : String(error));
    }
  }

  function go(href: Parameters<typeof router.push>[0]) {
    setMenu(false);
    router.push(href);
  }

  async function readQr(from: 'photos' | 'camera') {
    setNote('');
    try {
      const text = await readQrPhoto(from);
      if (text === null) return;
      setReadingQr(false);
      const card = text ? contactFromQr(text) : null;
      if (card) router.push(`/contact-edit?fill=${encodeURIComponent(fillText(card))}`);
      // Someone's Erevos QR code starts a contact with their Erevos ID.
      else if (text && readErevosId(text)) router.push(`/contact-edit?code=${encodeURIComponent(text)}`);
      else setNote(text ? t('This QR code holds no contact.') : t('No QR code was found in the photo. Take it again closer, with all of the code in it.'));
    } catch (error) {
      setReadingQr(false);
      setNote(error instanceof Error ? error.message : String(error));
    }
  }

  async function saveShown() {
    setMenu(false);
    setNote('');
    const day = new Date();
    const name = vcfName(`contacts-${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`);
    try {
      const saved = await saveVCards(saveable, name);
      if (saved) setNote(t('Saved as {name}. The file is outside Erevos: anyone who has it can read these contacts.', { name: saved }));
    } catch (error) {
      setNote(error instanceof Error ? error.message : String(error));
    }
  }

  if (hidden && !hiddenOpen) {
    return (
      <View style={[styles.container, styles.pad]}>
        <Text tone="muted">{t('The hidden chats are closed.')}</Text>
      </View>
    );
  }

  const header = (
    <View style={styles.headerBlock}>
      <View style={styles.topBar}>
        <Text variant="title">{hidden ? t('Hidden contacts') : t('Contacts')}</Text>
        {!hidden ? (
          <Pressable onPress={() => setMenu(true)} accessibilityRole="button" accessibilityLabel={t('Menu')} hitSlop={6} style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
            <MoreIcon color={colors.text} />
          </Pressable>
        ) : null}
      </View>
      {hidden ? <Text tone="muted">{t("Kept only here, sealed with the hidden chats: they show nowhere else, not even in the space's contacts.")}</Text> : null}
      <View style={styles.search}>
        <SearchIcon color={colors.textFaint} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t('Search contacts')}
          placeholderTextColor={colors.textFaint}
          style={styles.searchInput}
          autoCorrect={false}
          returnKeyType="search"
        />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters} keyboardShouldPersistTaps="handled">
        <Chip label={t('All')} selected={filter === 'all'} onPress={() => setFilter('all')} />
        <Chip label={t('Favourites')} selected={filter === 'starred'} onPress={() => setFilter('starred')} />
        <Chip label={t('Erevos contacts')} selected={filter === 'erevos'} onPress={() => setFilter('erevos')} />
        {!hidden ? <Chip label={t('Only in Erevos')} selected={filter === 'sealed'} onPress={() => setFilter('sealed')} /> : null}
        <Chip label={t('Birthdays')} selected={filter === 'birthdays'} onPress={() => setFilter('birthdays')} />
        {groups.map((g) => (
          <Chip key={g.id} label={g.title || t('Group without a name')} selected={filter === g.id} onPress={() => setFilter(g.id)} />
        ))}
      </ScrollView>
      {!hidden && !phoneHere ? (
        <Text tone="muted">
          {Platform.OS === 'android' ? t('This build of Erevos has no contacts part yet. It comes with the next build of the app.') : t("Only Erevos on Android reads the phone's contacts.")}
        </Text>
      ) : null}
      {adding ? (
        <Card>
          <Text variant="bodyStrong">{t('Add {what} to a contact', { what: adding.fields.phones[0]?.value || adding.fields.emails[0]?.value || fieldsName(adding.fields) })}</Text>
          <Text tone="muted">{t('Tap the contact to add it to, or make a new one.')}</Text>
          <Button title={t('New contact')} compact onPress={() => router.replace(`/contact-edit?fill=${encodeURIComponent(adding.text)}`)} />
        </Card>
      ) : null}
      {phoneHere && !allowed ? (
        <Card>
          <Text variant="bodyStrong">{t("Erevos may not read the phone's contacts yet")}</Text>
          <Text tone="muted">
            {t("Erevos reads and changes them only in Android's own contacts, where they stay for your other apps. It sends them nowhere.")}
          </Text>
          <Button title={t('Allow contacts')} onPress={() => void allow()} />
        </Card>
      ) : null}
      {note ? <Text tone="muted">{note}</Text> : null}
    </View>
  );

  const phoneMenu = phoneHere && allowed;
  // The list ends above the keyboard while the search is typed in, and New contact floats above it.
  return (
    <KeyboardPaddedView inset={insets.bottom} style={styles.container}>
      <FlatList
        data={shown}
        // Android's clipping of rows off the screen closed Erevos on Fabric (a row added twice).
        removeClippedSubviews={false}
        keyExtractor={(card) => card.key}
        ListHeaderComponent={header}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 120 }]}
        renderItem={({ item }) => (
          <ContactRow
            card={item}
            birthday={filter === 'birthdays'}
            hidden={hidden}
            onPress={
              adding
                ? () =>
                    router.replace(
                      item.phone
                        ? `/contact-edit?id=${item.phone.id}&add=${encodeURIComponent(adding.text)}`
                        : item.sealed
                          ? `/contact-edit?sealed=${item.sealed.id}&add=${encodeURIComponent(adding.text)}`
                          : `/contact-edit?fill=${encodeURIComponent(fillText(mergeFields([item, adding.fields])))}&erevos=${item.erevos}`,
                    )
                : undefined
            }
          />
        )}
        initialNumToRender={20}
        windowSize={11}
        ListEmptyComponent={
          cards === null ? null : (
            <Text tone="muted" style={styles.empty}>
              {query.trim()
                ? t('No contact has “{query}” in it.', { query: query.trim() })
                : filter === 'starred'
                  ? t('No favourites yet. Tap the star on a contact.')
                  : filter === 'birthdays'
                    ? t('No contact has a birthday yet. Add one in Edit.')
                    : filter === 'erevos'
                      ? t('No Erevos contacts yet. Add one in Chat, with their link or QR code.')
                    : filter === 'sealed'
                      ? t('No contact is kept only in Erevos yet. Choose Only in Erevos when you make one.')
                      : filter === 'all'
                        ? t('No contacts yet.')
                        : t('No one in this group yet.')}
            </Text>
          )
        }
        ListFooterComponent={
          cards && cards.length > 0 && !query.trim() && filter === 'all' ? (
            <Text variant="caption" tone="faint" style={styles.footer}>
              {plural(cards.length, '{n} contact', '{n} contacts')}
            </Text>
          ) : null
        }
      />
      <Pressable
        onPress={() => router.push(hidden ? '/contact-edit?hidden=1' : '/contact-edit')}
        accessibilityRole="button"
        accessibilityLabel={t('New contact')}
        style={({ pressed }) => [
          styles.fab,
          { bottom: insets.bottom + space.xl },
          shape.glow && { boxShadow: `0px 0px 18px ${withAlpha(colors.primary, 0.6)}` },
          pressed && styles.fabPressed,
        ]}
      >
        <PlusIcon color={colors.onPrimary} size={20} />
        <Text variant="label" color={colors.onPrimary}>
          {t('New contact')}
        </Text>
      </Pressable>
      <Sheet visible={menu} onClose={() => setMenu(false)} title={t('Contacts')}>
        {phoneMenu ? <MenuRow title={t('Groups')} detail={t('Family, Work, and your own: make, rename, who is in them')} onPress={() => go('/contact-groups')} /> : null}
        {phoneMenu ? (
          <MenuRow
            title={reminders ? t('Birthday reminders: on') : t('Birthday reminders: off')}
            detail={t("A notice on the morning of each phone contact's birthday")}
            onPress={() => void toggleReminders()}
          />
        ) : null}
        {phoneMenu ? <MenuRow title={t('Find duplicates')} detail={t('The same person kept twice, to merge into one')} onPress={() => go('/contact-duplicates')} /> : null}
        {phoneMenu ? <MenuRow title={t('SIM contacts')} detail={t('Copy the contacts on the SIM card to the phone')} onPress={() => go('/contact-sim')} /> : null}
        {phoneMenu ? <MenuRow title={t('Import from a .vcf file')} detail={t('Contacts another phone or app saved as a vCard')} onPress={() => go('/contact-import')} /> : null}
        <MenuRow
          title={t("Read a contact's QR code")}
          detail={t('From a photo of it, read on the phone')}
          onPress={() => {
            setMenu(false);
            setReadingQr(true);
          }}
        />
        {saveable.length > 0 ? (
          <MenuRow
            title={t('Save as a .vcf file')}
            detail={plural(saveable.length, 'The {n} contact shown, in a folder you choose', 'The {n} contacts shown, in a folder you choose')}
            onPress={() => void saveShown()}
          />
        ) : null}
        <Text variant="caption" tone="muted">
          {t("These are the phone's contacts, kept in Android's own contacts: every app allowed to read them sees them, and an account (Google) may sync them. Those with a lock are kept only in Erevos, sealed in this space.")}
        </Text>
        <Button title={t('Done')} kind="secondary" compact onPress={() => setMenu(false)} />
      </Sheet>
      <Sheet visible={readingQr} onClose={() => setReadingQr(false)} title={t("Read a contact's QR code")}>
        <Text tone="muted">{t('Take a photo of the code, or choose one. It is read here and not kept; what it holds starts a new contact, saved only when you save it.')}</Text>
        <View style={styles.qrButtons}>
          {CAN_TAKE_PHOTOS ? <Button title={t('Take photo')} compact onPress={() => void readQr('camera')} /> : null}
          <Button title={t('Choose a photo')} kind="secondary" compact onPress={() => void readQr('photos')} />
        </View>
        {note ? <Text tone="muted">{note}</Text> : null}
      </Sheet>
    </KeyboardPaddedView>
  );
}

function MenuRow({ title, detail, onPress }: { title: string; detail: string; onPress: () => void }) {
  const styles = useStyles(makeStyles);
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.menuRow, pressed && styles.pressed]}>
      <Text variant="bodyStrong">{title}</Text>
      <Text variant="caption" tone="muted">
        {detail}
      </Text>
    </Pressable>
  );
}

function ContactRow({ card, birthday, hidden, onPress }: { card: ContactCard; birthday?: boolean; hidden: boolean; onPress?: () => void }) {
  const styles = useStyles(makeStyles);
  const { colors } = useTheme();
  const photo = useCardPhoto(card);
  const born = birthday ? parseBirthday(card.birthday) : null;
  const onlyErevos = !card.phone && !card.sealed;
  const detail = born ? birthdayComing(born, new Date()) : card.phones[0]?.value || card.emails[0]?.value || card.company || (onlyErevos ? t('Erevos contact') : '');
  const sealed = card.sealed !== null && !hidden;
  const label = [card.name, card.starred ? t('favourite') : '', sealed ? t('only in Erevos') : '', card.erevos ? t('with an Erevos chat') : ''].filter(Boolean).join(', ');
  return (
    <Pressable
      onPress={onPress ?? (() => router.push(cardHref(card, hidden)))}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <ContactFace name={card.name} uri={photo} size={44} />
      <View style={styles.rowBody}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {card.name}
        </Text>
        {detail ? (
          <Text variant="caption" tone="muted" numberOfLines={1}>
            {detail}
          </Text>
        ) : null}
      </View>
      {card.erevos ? <ShieldIcon color={colors.success} size={14} /> : null}
      {sealed ? <LockIcon color={colors.textFaint} size={16} /> : null}
      {card.starred ? (
        <Text variant="bodyStrong" color={colors.accentText}>
          ★
        </Text>
      ) : null}
    </Pressable>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.ground,
    },
    pad: {
      padding: space.xl - 4,
      gap: space.md,
    },
    list: {
      width: '100%',
      maxWidth: 760,
      alignSelf: 'center',
      paddingHorizontal: space.lg,
    },
    headerBlock: {
      gap: space.md,
      paddingTop: space.sm,
      paddingBottom: space.sm,
    },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
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
    },
    filters: {
      gap: space.sm,
      paddingRight: space.lg,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.md,
      paddingVertical: space.sm,
      paddingHorizontal: space.sm,
      marginHorizontal: -space.sm,
      borderRadius: radius.lg,
    },
    rowBody: {
      flex: 1,
      gap: 2,
    },
    empty: {
      textAlign: 'center',
      paddingTop: space.xl,
    },
    footer: {
      textAlign: 'center',
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
    qrButtons: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: space.sm,
    },
    menuRow: {
      gap: 2,
      paddingVertical: space.sm + 2,
      paddingHorizontal: space.sm,
      borderRadius: radius.md,
    },
  });
