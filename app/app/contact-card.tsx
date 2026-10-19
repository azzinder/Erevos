import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { ContactFace, forgetPhoneContactPhoto, usePhoneContactPhoto } from '../components/contact-face';
import { Button, Card, Page, Row, Sheet, Text, TextButton } from '../components/ui';
import { confirm } from '../lib/alert';
import { groupsByTitle, phoneCard, type Card as ContactCard } from '../lib/contact-book';
import { birthdayComing, birthdayLabel, kindLabel, parseBirthday, type Entry } from '../lib/contacts';
import { t } from '../lib/i18n';
import { pickAvatar } from '../lib/pick-avatar';
import { CAN_TAKE_PHOTOS } from '../lib/pick-photo';
import { smsAddress, smsNumbers } from '../lib/sms-group';
import {
  addToPhoneGroup,
  onContactsEvent,
  phoneContact,
  phoneGroups,
  pickRingtone,
  removeFromPhoneGroup,
  removePhoneContacts,
  ringtoneName,
  setPhoneContactPhoto,
  starPhoneContact,
  type PhoneGroup,
} from '../modules/erevos-contacts';
import { radius, space, type Colors } from '../theme/colors';
import { useStyles, useTheme } from '../theme/context';

// One contact, whole: its photo and name, then every number, email and address, its birthday and
// note, and its groups. A number calls (Linking's tel: goes to the phone app) or writes an SMS in
// Erevos. The star makes it a favourite, in Android's contacts, which every phone app lists. Its
// photo, from the phone's photos or the camera, is kept there too, 720 points square, as Android
// shows it large when they call; and its own ringtone, picked in Android's picker.

const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error));
const PHOTO_SIDE = 720;

export default function ContactCardScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const id = Number(params.id ?? 0);
  const styles = useStyles(makeStyles);
  const { colors } = useTheme();
  const [card, setCard] = useState<ContactCard | null>(null);
  const [gone, setGone] = useState(false);
  const [groups, setGroups] = useState<PhoneGroup[]>([]);
  const [choosingGroups, setChoosingGroups] = useState(false);
  const [choosingPhoto, setChoosingPhoto] = useState(false);
  const [note, setNote] = useState('');
  const [tone, setTone] = useState('');
  const photo = usePhoneContactPhoto(card?.phone?.id ?? null, card?.phone?.photo ?? 0, true);
  const ringtone = card?.phone?.ringtone ?? '';

  useEffect(() => {
    let active = true;
    setTone('');
    ringtoneName(ringtone)
      .then((name) => active && setTone(name))
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [ringtone]);

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
    phoneGroups()
      .then((found) => setGroups(groupsByTitle(found)))
      .catch(() => undefined);
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

  async function changePhoto(from: 'photos' | 'camera' | null) {
    if (!card?.phone) return;
    setNote('');
    try {
      const bytes = from ? await pickAvatar(from, PHOTO_SIDE) : null;
      if (from && !bytes) return;
      await setPhoneContactPhoto(card.phone.id, bytes);
      forgetPhoneContactPhoto(card.phone.id);
      setChoosingPhoto(false);
      load();
    } catch (error) {
      setNote(errorText(error));
    }
  }

  async function chooseRingtone() {
    if (!card?.phone) return;
    setNote('');
    try {
      if ((await pickRingtone(card.phone.id)) !== null) load();
    } catch (error) {
      setNote(errorText(error));
    }
  }

  // In a group, or out of it, in Android's contacts: in the contact's raw contact of the group's account.
  async function toggleGroup(group: PhoneGroup) {
    if (!card?.phone) return;
    setNote('');
    const inIt = card.groups.includes(group.id);
    try {
      if (inIt) await removeFromPhoneGroup(group.id, card.phone.id);
      else if (!(await addToPhoneGroup(group.id, card.phone.id))) {
        setNote(t('{name} is kept in another account than the group {group}, so it cannot join it.', { name: card.name, group: group.title }));
        return;
      }
      setCard({ ...card, groups: inIt ? card.groups.filter((g) => g !== group.id) : [...card.groups, group.id] });
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
        <Pressable onPress={() => setChoosingPhoto(true)} accessibilityRole="button" accessibilityLabel={photo ? t('Change photo') : t('Add a photo')}>
          <ContactFace name={card.name} uri={photo} size={96} />
        </Pressable>
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

      <Card>
        <Text variant="label" tone="muted">
          {t('Groups')}
        </Text>
        <Text tone={card.groups.length ? undefined : 'muted'}>
          {groups
            .filter((g) => card.groups.includes(g.id))
            .map((g) => g.title)
            .join(', ') || t('In no group')}
        </Text>
        <Button title={t('Choose groups')} kind="secondary" compact onPress={() => setChoosingGroups(true)} />
      </Card>

      <Card>
        <Text variant="label" tone="muted">
          {t('Ringtone')}
        </Text>
        <Text tone={ringtone ? undefined : 'muted'}>{ringtone ? tone || t('A ringtone of its own') : t("The phone's own")}</Text>
        <Button title={t('Choose ringtone')} kind="secondary" compact onPress={() => void chooseRingtone()} />
      </Card>

      <Row wrap>
        <Button title={t('Edit')} kind="secondary" compact onPress={() => router.push(`/contact-edit?id=${card.phone?.id ?? 0}`)} />
        <Button title={t('Delete')} kind="danger" compact onPress={() => void remove()} />
      </Row>
      {note ? <Text tone="muted">{note}</Text> : null}

      <Sheet visible={choosingGroups} onClose={() => setChoosingGroups(false)} title={t('Groups')}>
        {groups.length === 0 ? <Text tone="muted">{t('No groups yet. Make one under Groups in the menu of Contacts.')}</Text> : null}
        {groups.map((g) => {
          const on = card.groups.includes(g.id);
          return (
            <Pressable key={g.id} onPress={() => void toggleGroup(g)} accessibilityRole="checkbox" accessibilityState={{ checked: on }} style={({ pressed }) => [styles.pick, (pressed || on) && styles.pressed]}>
              <View style={styles.grow}>
                <Text>{g.title}</Text>
                {g.account.name ? (
                  <Text variant="caption" tone="muted">
                    {g.account.name}
                  </Text>
                ) : null}
              </View>
              <Text variant="bodyStrong" color={on ? colors.accentText : colors.textFaint}>
                {on ? '✓' : '○'}
              </Text>
            </Pressable>
          );
        })}
        {note ? <Text tone="muted">{note}</Text> : null}
        <Button title={t('Done')} compact onPress={() => setChoosingGroups(false)} />
      </Sheet>

      <Sheet visible={choosingPhoto} onClose={() => setChoosingPhoto(false)} title={t('Photo')}>
        <Text tone="muted">{t("The photo is kept with the contact in Android's contacts, where the phone shows it when they call, and its account (Google) syncs it.")}</Text>
        <Row wrap>
          <Button title={t('Choose a photo')} compact onPress={() => void changePhoto('photos')} />
          {CAN_TAKE_PHOTOS ? <Button title={t('Take photo')} kind="secondary" compact onPress={() => void changePhoto('camera')} /> : null}
        </Row>
        {card.phone?.photo ? <TextButton title={t('Remove the photo')} onPress={() => void changePhoto(null)} /> : null}
        {note ? <Text tone="muted">{note}</Text> : null}
      </Sheet>
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
    grow: {
      flex: 1,
    },
    pick: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.md,
      padding: space.sm,
      borderRadius: radius.md,
    },
  });
