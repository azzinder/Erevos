import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { ContactFace, usePhoneContactPhoto } from '../components/contact-face';
import { Button, Card, Page, Row, Text } from '../components/ui';
import { confirm } from '../lib/alert';
import { phoneCard, type Card as ContactCard } from '../lib/contact-book';
import { birthdayComing, birthdayLabel, kindLabel, parseBirthday, type Entry } from '../lib/contacts';
import { t } from '../lib/i18n';
import { smsAddress, smsNumbers } from '../lib/sms-group';
import { onContactsEvent, phoneContact, removePhoneContacts, starPhoneContact } from '../modules/erevos-contacts';
import { radius, space, type Colors } from '../theme/colors';
import { useStyles, useTheme } from '../theme/context';

// One contact, whole: its photo and name, then every number, email and address, its birthday and
// note. A number calls (Linking's tel: goes to the phone app) or writes an SMS in Erevos. The star
// makes it a favourite, in Android's contacts, which every phone app lists.

const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error));

export default function ContactCardScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const id = Number(params.id ?? 0);
  const styles = useStyles(makeStyles);
  const { colors } = useTheme();
  const [card, setCard] = useState<ContactCard | null>(null);
  const [gone, setGone] = useState(false);
  const [note, setNote] = useState('');
  const photo = usePhoneContactPhoto(card?.phone?.id ?? null, card?.phone?.photo ?? 0, true);

  const load = useCallback(() => {
    if (!(id > 0)) {
      setGone(true);
      return;
    }
    phoneContact(id)
      .then((c) => {
        setCard(c ? phoneCard(c) : null);
        setGone(!c);
      })
      .catch((error) => setNote(errorText(error)));
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
      const changed = onContactsEvent('onContactsChanged', load);
      return () => changed?.remove();
    }, [load]),
  );

  if (gone) {
    return (
      <Page>
        <Text tone="muted">{t('This contact is no longer on the phone.')}</Text>
        <Button title={t('Close')} kind="secondary" onPress={() => (router.canGoBack() ? router.back() : router.replace('/contacts'))} />
      </Page>
    );
  }
  if (!card) return <Page>{note ? <Text tone="muted">{note}</Text> : null}</Page>;

  async function star() {
    if (!card?.phone) return;
    setNote('');
    try {
      await starPhoneContact(card.phone.id, !card.starred);
      setCard({ ...card, starred: !card.starred });
    } catch (error) {
      setNote(errorText(error));
    }
  }

  async function remove() {
    if (!card?.phone) return;
    if (!(await confirm(t('Delete contact'), t('Delete {name} from the phone? It goes from every account it is kept in, and cannot be brought back.', { name: card.name }), t('Delete')))) return;
    try {
      await removePhoneContacts([card.phone.id]);
      router.canGoBack() ? router.back() : router.replace('/contacts');
    } catch (error) {
      setNote(errorText(error));
    }
  }

  const call = (number: string) => void Linking.openURL(`tel:${number.replace(/[^\d+*#,;]/g, '')}`).catch((error) => setNote(errorText(error)));
  const sms = (number: string) => router.push(`/sms?to=${encodeURIComponent(smsAddress(smsNumbers(number)))}&plain=1`);
  const first = card.phones[0]?.value;
  const birthday = parseBirthday(card.birthday);

  return (
    <Page>
      <View style={styles.top}>
        <ContactFace name={card.name} uri={photo} size={96} />
        <Text variant="title" style={styles.center}>
          {card.name}
        </Text>
        {card.company || card.title ? (
          <Text tone="muted" style={styles.center}>
            {[card.title, card.company].filter(Boolean).join(' · ')}
          </Text>
        ) : null}
        <Pressable onPress={() => void star()} accessibilityRole="button" accessibilityLabel={card.starred ? t('Remove from favourites') : t('Add to favourites')} hitSlop={8}>
          <Text variant="heading" color={card.starred ? colors.accentText : colors.textFaint}>
            {card.starred ? `★ ${t('Favourite')}` : `☆ ${t('Add to favourites')}`}
          </Text>
        </Pressable>
      </View>

      {first ? (
        <Row wrap style={styles.actions}>
          <Button title={t('Call')} compact onPress={() => call(first)} />
          <Button title="SMS" kind="secondary" compact onPress={() => sms(first)} />
        </Row>
      ) : null}

      {card.phones.length > 0 ? (
        <Card>
          {card.phones.map((p, i) => (
            <EntryRow key={`p${i}`} entry={p} onPress={() => call(p.value)} side={t('SMS')} onSide={() => sms(p.value)} />
          ))}
        </Card>
      ) : null}
      {card.emails.length > 0 ? (
        <Card>
          {card.emails.map((e, i) => (
            <EntryRow key={`e${i}`} entry={e} onPress={() => void Linking.openURL(`mailto:${e.value}`).catch(() => undefined)} />
          ))}
        </Card>
      ) : null}
      {card.addresses.length > 0 ? (
        <Card>
          {card.addresses.map((a, i) => (
            <EntryRow key={`a${i}`} entry={a} onPress={() => void Linking.openURL(`geo:0,0?q=${encodeURIComponent(a.value)}`).catch(() => undefined)} />
          ))}
        </Card>
      ) : null}
      {card.birthday ? (
        <Card>
          <Text variant="label" tone="muted">
            {t('Birthday')}
          </Text>
          <Text>{birthday ? birthdayLabel(birthday) : card.birthday}</Text>
          {birthday ? (
            <Text variant="caption" tone="muted">
              {birthdayComing(birthday, new Date())}
            </Text>
          ) : null}
        </Card>
      ) : null}
      {card.note ? (
        <Card>
          <Text variant="label" tone="muted">
            {t('Note')}
          </Text>
          <Text selectable>{card.note}</Text>
        </Card>
      ) : null}

      <Row wrap>
        <Button title={t('Edit')} kind="secondary" compact onPress={() => router.push(`/contact-edit?id=${card.phone?.id ?? 0}`)} />
        <Button title={t('Delete')} kind="danger" compact onPress={() => void remove()} />
      </Row>
      {note ? <Text tone="muted">{note}</Text> : null}
    </Page>
  );
}

/** A number, an email or an address: its kind above it; tapped, it is used. */
function EntryRow({ entry, onPress, side, onSide }: { entry: Entry; onPress: () => void; side?: string; onSide?: () => void }) {
  const styles = useStyles(makeStyles);
  const { colors } = useTheme();
  return (
    <View style={styles.entry}>
      <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [styles.entryMain, pressed && styles.pressed]}>
        <Text variant="caption" tone="muted">
          {kindLabel(entry)}
        </Text>
        <Text selectable>{entry.value}</Text>
      </Pressable>
      {side && onSide ? (
        <Pressable onPress={onSide} accessibilityRole="button" hitSlop={6} style={({ pressed }) => [styles.side, pressed && styles.pressed]}>
          <Text variant="label" color={colors.accentText}>
            {side}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    top: {
      alignItems: 'center',
      gap: space.sm,
      paddingVertical: space.md,
    },
    center: {
      textAlign: 'center',
    },
    actions: {
      justifyContent: 'center',
    },
    entry: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.sm,
    },
    entryMain: {
      flex: 1,
      gap: 2,
      paddingVertical: 4,
      paddingHorizontal: space.xs,
      borderRadius: radius.md,
    },
    side: {
      paddingVertical: space.sm,
      paddingHorizontal: space.md,
      borderRadius: radius.md,
    },
    pressed: {
      backgroundColor: colors.surfacePressed,
    },
  });
