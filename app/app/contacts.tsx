import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { FlatList, PermissionsAndroid, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ContactFace, usePhoneContactPhoto } from '../components/contact-face';
import { MoreIcon, PlusIcon, SearchIcon } from '../components/icons';
import { Button, Card, Chip, fontStyle, Sheet, Text } from '../components/ui';
import { groupsByTitle, groupTitles, phoneCards, type Card as ContactCard } from '../lib/contact-book';
import { saveVCards, vcfName } from '../lib/contact-files';
import { fillText, matches } from '../lib/contacts';
import { plural, t } from '../lib/i18n';
import { CAN_TAKE_PHOTOS } from '../lib/pick-photo';
import { readQrPhoto } from '../lib/read-qr';
import { contactFromQr } from '../lib/vcard';
import { contactsReady, contactsStatus, onContactsEvent, phoneGroups, watchContacts, type PhoneGroup } from '../modules/erevos-contacts';
import { radius, shape, space, withAlpha, type Colors } from '../theme/colors';
import { useStyles, useTheme } from '../theme/context';

// Contacts: the phone's own contacts, from Android's contacts (modules/erevos-contacts), with a
// search over every field, the favourites, each group's contacts, and a new contact. Read again
// each time it comes back into view, and when Android's contacts change while it shows (another
// app, a sync). The menu has the rest: groups (app/contact-groups.tsx), .vcf files in
// (app/contact-import.tsx) and out: the contacts shown, saved in a folder the owner picks, and a
// contact's QR code read from a photo of it, which starts a new contact.

/** What the list shows: everyone, the favourites, or a group's contacts (its id). */
type Filter = 'all' | 'starred' | number;

export default function Contacts() {
  const styles = useStyles(makeStyles);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [cards, setCards] = useState<ContactCard[] | null>(null);
  const [groups, setGroups] = useState<PhoneGroup[]>([]);
  const [allowed, setAllowed] = useState(() => contactsStatus().read);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [menu, setMenu] = useState(false);
  const [readingQr, setReadingQr] = useState(false);
  const [note, setNote] = useState('');
  const active = useRef(true);

  const load = useCallback(() => {
    const status = contactsStatus();
    setAllowed(status.read);
    if (!status.read) {
      setCards([]);
      return;
    }
    watchContacts();
    phoneCards()
      .then((read) => active.current && setCards(read))
      .catch((error) => active.current && setNote(t("The phone's contacts could not be read: {error}", { error: error instanceof Error ? error.message : String(error) })));
    phoneGroups()
      .then((found) => {
        if (!active.current) return;
        setGroups(groupsByTitle(found));
        // A group deleted meanwhile shows everyone again.
        setFilter((f) => (typeof f === 'number' && !found.some((g) => g.id === f) ? 'all' : f));
      })
      .catch(() => undefined);
  }, []);

  useFocusEffect(
    useCallback(() => {
      active.current = true;
      load();
      const changed = onContactsEvent('onContactsChanged', load);
      return () => {
        active.current = false;
        changed?.remove();
      };
    }, [load]),
  );

  // Android asks once for reading and changing the contacts, as one permission.
  async function allow() {
    setNote('');
    const answers = await PermissionsAndroid.requestMultiple(['android.permission.READ_CONTACTS', 'android.permission.WRITE_CONTACTS']).catch(() => null);
    if (answers?.['android.permission.READ_CONTACTS'] !== PermissionsAndroid.RESULTS.GRANTED) {
      setNote(t("Without it, Erevos cannot show the phone's contacts. Allow Contacts in Erevos's App info."));
      return;
    }
    load();
  }

  const shown = useMemo(() => {
    const list = (cards ?? []).filter((c) => (filter === 'all' ? true : filter === 'starred' ? c.starred : c.groups.includes(filter)));
    return query.trim() ? list.filter((c) => matches(c, query, groupTitles(c, groups))) : list;
  }, [cards, groups, query, filter]);

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
      const saved = await saveVCards(shown, name);
      if (saved) setNote(t('Saved as {name}. The file is outside Erevos: anyone who has it can read these contacts.', { name: saved }));
    } catch (error) {
      setNote(error instanceof Error ? error.message : String(error));
    }
  }

  if (Platform.OS !== 'android' || !contactsReady()) {
    return (
      <View style={[styles.container, styles.pad]}>
        <Text variant="title">{t('Contacts')}</Text>
        <Text tone="muted">
          {Platform.OS === 'android' ? t('This build of Erevos has no contacts part yet. It comes with the next build of the app.') : t("Only Erevos on Android reads the phone's contacts.")}
        </Text>
      </View>
    );
  }

  const header = (
    <View style={styles.headerBlock}>
      <View style={styles.topBar}>
        <Text variant="title">{t('Contacts')}</Text>
        <Pressable onPress={() => setMenu(true)} accessibilityRole="button" accessibilityLabel={t('Menu')} hitSlop={6} style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
          <MoreIcon color={colors.text} />
        </Pressable>
      </View>
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
        {groups.map((g) => (
          <Chip key={g.id} label={g.title || t('Group without a name')} selected={filter === g.id} onPress={() => setFilter(g.id)} />
        ))}
      </ScrollView>
      {!allowed ? (
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

  return (
    <View style={styles.container}>
      <FlatList
        data={shown}
        keyExtractor={(card) => card.key}
        ListHeaderComponent={header}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 120 }]}
        renderItem={({ item }) => <ContactRow card={item} />}
        initialNumToRender={20}
        windowSize={11}
        ListEmptyComponent={
          cards === null || !allowed ? null : (
            <Text tone="muted" style={styles.empty}>
              {query.trim()
                ? t('No contact has “{query}” in it.', { query: query.trim() })
                : filter === 'starred'
                  ? t('No favourites yet. Tap the star on a contact.')
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
        onPress={() => router.push('/contact-edit')}
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
        {allowed ? <MenuRow title={t('Groups')} detail={t('Family, Work, and your own: make, rename, who is in them')} onPress={() => go('/contact-groups')} /> : null}
        {allowed ? <MenuRow title={t('Import from a .vcf file')} detail={t('Contacts another phone or app saved as a vCard')} onPress={() => go('/contact-import')} /> : null}
        {allowed ? (
          <MenuRow
            title={t("Read a contact's QR code")}
            detail={t('From a photo of it, read on the phone')}
            onPress={() => {
              setMenu(false);
              setReadingQr(true);
            }}
          />
        ) : null}
        {allowed && shown.length > 0 ? (
          <MenuRow
            title={t('Save as a .vcf file')}
            detail={plural(shown.length, 'The {n} contact shown, in a folder you choose', 'The {n} contacts shown, in a folder you choose')}
            onPress={() => void saveShown()}
          />
        ) : null}
        <Text variant="caption" tone="muted">
          {t("These are the phone's contacts, kept in Android's own contacts: every app allowed to read them sees them, and an account (Google) may sync them.")}
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
    </View>
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

function ContactRow({ card }: { card: ContactCard }) {
  const styles = useStyles(makeStyles);
  const { colors } = useTheme();
  const photo = usePhoneContactPhoto(card.phone?.id ?? null, card.phone?.photo ?? 0);
  const detail = card.phones[0]?.value || card.emails[0]?.value || card.company;
  return (
    <Pressable
      onPress={() => router.push(`/contact-card?id=${card.phone?.id ?? 0}`)}
      accessibilityRole="button"
      accessibilityLabel={card.starred ? t('{name}, favourite', { name: card.name }) : card.name}
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
