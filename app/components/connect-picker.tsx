import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, View } from 'react-native';

import { allowPhoneContacts, amongPlace, byName, cardErevos, erevosPeople, phoneCards, sealedCard, type Among, type Card as ContactCard } from '../lib/contact-book';
import { linkChoices, linkedElsewhere, matches } from '../lib/contacts';
import { plural, t } from '../lib/i18n';
import { loadPlace, onSealedChange } from '../lib/sealed-contacts';
import { contactsReady, contactsStatus } from '../modules/erevos-contacts';
import { radius, space, type Colors } from '../theme/colors';
import { useStyles, useTheme } from '../theme/context';
import { ContactFace, useCardPhoto } from './contact-face';
import { Button, Input, Sheet, Text } from './ui';

// Choosing one of my contacts, to connect an Erevos contact to: one added from a scanned link
// (app/contact.tsx) or in the chat (app/chat.tsx), or one of the chats with a card of its own
// (app/contact-card.tsx). In the space, the phone's contacts, once Erevos may read them (a button
// asks, as Contacts does), and those kept only in Erevos; in hidden chats only theirs, never the
// phone's, which they never read; on a computer and in the web app, which have no phone contacts,
// those kept in Erevos (lib/contacts.ts, linkChoices). Found by any field, without case or Greek
// accents (matches), by name. One that is another Erevos contact already says so, and choosing it
// links it here instead. Once the chats it was opened for close, it shows nothing of theirs.

/** The most contacts listed at once: the search finds the others. */
const MOST = 50;
/** The phone's own contacts: on Android, in a build with the contacts part. */
const PHONE = Platform.OS === 'android' && contactsReady();

const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error));

/**
 * Whether the picker has anything to offer for `among`: in the space on Android the phone's
 * contacts (asked for if need be), else a contact the place keeps in Erevos. Read again as those
 * change (onSealedChange).
 */
export function useCanConnect(among: Among): boolean {
  const place = useMemo(() => amongPlace(among), [among]);
  const phone = among === 'space' && PHONE;
  const [kept, setKept] = useState(false);
  useEffect(() => {
    setKept(false);
    if (!place || phone) return;
    let active = true;
    // One that cannot be read offers nothing, so no button opens an empty sheet.
    const read = () =>
      void loadPlace(place)
        .then((data) => data.contacts.length > 0)
        .catch(() => false)
        .then((has) => active && setKept(has));
    read();
    const stop = onSealedChange(read);
    return () => {
      active = false;
      stop();
    };
  }, [place, phone]);
  return place !== null && (phone || kept);
}

/** One of my contacts, chosen in a sheet (above). `identity`: the Erevos contact being connected, when known. */
export function ConnectPicker({ visible, among, identity = '', onPick, onClose, note = '' }: {
  visible: boolean;
  among: Among;
  identity?: string;
  onPick: (card: ContactCard) => void;
  onClose: () => void;
  /** What went wrong with the last pick, from the screen that acts on it. */
  note?: string;
}) {
  const { colors } = useTheme();
  const [query, setQuery] = useState('');
  // The contacts to choose, sorted once as they load, with whose they are: they show only while
  // those are the chats it is for. None is kept while it is closed.
  const [choices, setChoices] = useState<{ for: Among; list: ContactCard[] } | null>(null);
  const [allowed, setAllowed] = useState(() => contactsStatus().read);
  // Bumped once Erevos may read the phone's contacts, to read them.
  const [asked, setAsked] = useState(0);
  // What went wrong here: reading the phone's contacts, or asking to.
  const [own, setOwn] = useState('');
  // Where the contacts of `among` are kept; none while the hidden chats meant are closed, or no space is open.
  const place = useMemo(() => amongPlace(among), [among]);
  const phoneHere = among === 'space' && PHONE;

  // The chats it was opened for closed under it (hidden chats under app/contact.tsx): it goes.
  const openedFor = useRef(among);
  useEffect(() => {
    if (openedFor.current === among) return;
    openedFor.current = among;
    setChoices(null);
    if (visible) onClose();
  }, [among]);

  useEffect(() => {
    if (!visible) return;
    setQuery('');
    setOwn('');
  }, [visible]);

  // Read each time it opens, and again once the phone's contacts may be read.
  useEffect(() => {
    if (!visible) {
      setChoices(null);
      return;
    }
    // None: nothing read, nothing listed.
    if (!place) return;
    let active = true;
    const status = contactsStatus();
    setAllowed(status.read);
    Promise.all([
      // Never in hidden chats, never on a computer or in the web app.
      phoneHere && status.read
        ? phoneCards().catch((error): ContactCard[] => {
            if (active) setOwn(t("The phone's contacts could not be read: {error}", { error: errorText(error) }));
            return [];
          })
        : Promise.resolve([]),
      // As in Contacts: the phone's still list when these cannot be read.
      loadPlace(place).catch(() => null),
      erevosPeople(among === 'space' ? null : among),
    ]).then(([phone, data, people]) => {
      if (!active) return;
      const linked = (c: ContactCard) => ({ ...c, erevos: cardErevos(c, data?.links ?? [], people) });
      // Sorted once, here: typing only filters, as thousands of the phone's contacts sort slowly.
      setChoices({ for: among, list: byName(linkChoices(phone.map(linked), (data?.contacts ?? []).map(sealedCard).map(linked), among !== 'space')) });
    });
    return () => {
      active = false;
    };
  }, [visible, among, place, asked]);

  async function allow() {
    setOwn('');
    if (!(await allowPhoneContacts())) {
      setOwn(t("Without it, Erevos cannot show the phone's contacts. Allow Contacts in Erevos's App info."));
      return;
    }
    setAsked((n) => n + 1);
  }

  const list = choices?.for === among ? choices.list : null;
  const found = useMemo(() => (list && query.trim() ? list.filter((c) => matches(c, query)) : list), [choices, among, query]);
  const rest = found ? found.length - MOST : 0;
  const said = note || own;

  return (
    <Sheet visible={visible} onClose={onClose} title={t('Connect to one of my contacts')}>
      <Text tone="muted">
        {among === 'space'
          ? t("The Erevos contact takes the name of the one you choose, if it has none of its own, and its card shows the chat and calls. The link is sealed in Erevos, never in the phone's contacts.")
          : t("Only these hidden chats' contacts. The Erevos contact takes the name of the one you choose, if it has none of its own. The link is sealed with the hidden chats.")}
      </Text>
      <Input value={query} onChangeText={setQuery} placeholder={t('Search contacts')} accessibilityLabel={t('Search contacts')} autoCorrect={false} />
      {phoneHere && !allowed ? (
        <>
          <Text variant="caption" tone="muted">
            {t("The phone's contacts show here once Erevos may read them.")}
          </Text>
          <Button title={t('Allow contacts')} compact onPress={() => void allow()} />
        </>
      ) : null}
      {place && !found && !said ? <ActivityIndicator color={colors.textMuted} /> : null}
      {found?.slice(0, MOST).map((card) => <PickRow key={card.key} card={card} elsewhere={linkedElsewhere(card, identity)} onPress={() => onPick(card)} />)}
      {found && found.length === 0 ? <Text tone="muted">{query.trim() ? t('No contact has “{query}” in it.', { query: query.trim() }) : t('No contacts yet.')}</Text> : null}
      {rest > 0 ? (
        <Text variant="caption" tone="faint">
          {plural(rest, '{n} more contact. Search to find it.', '{n} more contacts. Search to find them.')}
        </Text>
      ) : null}
      {said ? <Text tone="muted">{said}</Text> : null}
      <Button title={t('Cancel')} kind="secondary" compact onPress={onClose} />
    </Sheet>
  );
}

// One contact to choose: its face, name, first number (or email, or company), and whether it is
// another Erevos contact already.
function PickRow({ card, elsewhere, onPress }: { card: ContactCard; elsewhere: boolean; onPress: () => void }) {
  const styles = useStyles(makeStyles);
  const photo = useCardPhoto(card);
  const detail = card.phones[0]?.value || card.emails[0]?.value || card.company;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [styles.pick, pressed && styles.pressed]}>
      <ContactFace name={card.name} uri={photo} size={36} />
      <View style={styles.grow}>
        <Text numberOfLines={1}>{card.name}</Text>
        {detail ? (
          <Text variant="caption" tone="muted" numberOfLines={1}>
            {detail}
          </Text>
        ) : null}
        {elsewhere ? (
          <Text variant="caption" tone="faint">
            {t('Linked to another Erevos contact. Choosing it links it here instead.')}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    pick: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.md,
      padding: space.sm,
      borderRadius: radius.md,
    },
    pressed: {
      backgroundColor: colors.surfacePressed,
    },
    grow: {
      flex: 1,
    },
  });
