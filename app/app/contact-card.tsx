import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { ContactFace, forgetPhoneContactPhoto, useCardPhoto } from '../components/contact-face';
import { QrCode } from '../components/QrCode';
import { Button, Card, Page, Row, Sheet, Text, TextButton } from '../components/ui';
import { confirm } from '../lib/alert';
import { groupsByTitle, phoneCard, sealedCard, type Card as ContactCard } from '../lib/contact-book';
import { saveVCards, vcfName } from '../lib/contact-files';
import { birthdayComing, birthdayLabel, kindLabel, parseBirthday, phoneSave, type Entry } from '../lib/contacts';
import { fromBase64 } from '../lib/crypto';
import { enterHiddenScreen, useOpenHiddenPlace } from '../lib/hidden-contacts';
import { t } from '../lib/i18n';
import { pickAvatar } from '../lib/pick-avatar';
import { CAN_TAKE_PHOTOS } from '../lib/pick-photo';
import { loadPlace, onSealedChange, placeOf, removeSealed, saveSealed, setSealedPhoto, spacePlace, starSealed, type Place } from '../lib/sealed-contacts';
import { smsAddress, smsNumbers } from '../lib/sms-group';
import { qrVCard } from '../lib/vcard';
import { loadPhoto, savePhoto } from '../lock/avatar-photos';
import {
  addToPhoneGroup,
  onContactsEvent,
  phoneContact,
  phoneContactPhoto,
  phoneGroups,
  pickRingtone,
  removeFromPhoneGroup,
  removePhoneContacts,
  ringtoneName,
  savePhoneContact,
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
// shows it large when they call; and its own ringtone, picked in Android's picker. Its QR code is
// its vCard, which another phone's camera reads as a contact to add.
//
// A contact kept only in Erevos (`sealed`, lib/sealed-contacts.ts) has the same, but for groups
// and a ringtone, which are Android's: its star and photo are sealed with it. A phone contact can
// move into Erevos, and one kept in Erevos out to the phone's contacts. Among the hidden chats'
// screens (`hidden`), it is one of theirs, and shows nothing once they close; it takes no photo
// there, as picking one leaves Erevos, which closes them.

const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error));
const PHOTO_SIDE = 720;
// A sealed photo is kept smaller: the phone never shows it on a call.
const SEALED_SIDE = 512;

export default function ContactCardScreen() {
  const params = useLocalSearchParams<{ id?: string; sealed?: string; hidden?: string }>();
  const id = Number(params.id ?? 0);
  const sealedId = typeof params.sealed === 'string' ? params.sealed : '';
  const hidden = params.hidden === '1';
  const hiddenOpen = useOpenHiddenPlace();
  const styles = useStyles(makeStyles);
  const { colors } = useTheme();
  const [card, setCard] = useState<ContactCard | null>(null);
  const [gone, setGone] = useState(false);
  const [groups, setGroups] = useState<PhoneGroup[]>([]);
  const [choosingGroups, setChoosingGroups] = useState(false);
  const [choosingPhoto, setChoosingPhoto] = useState(false);
  const [showingQr, setShowingQr] = useState(false);
  const [note, setNote] = useState('');
  const [tone, setTone] = useState('');
  const photo = useCardPhoto(card, true);
  const ringtone = card?.phone?.ringtone ?? '';

  useEffect(() => (hidden ? enterHiddenScreen() : undefined), [hidden]);

  // Where a sealed contact is: the hidden chats while they are open, else the space.
  const place = useMemo((): Place | null => {
    if (!sealedId) return null;
    if (hidden) return hiddenOpen ? placeOf(hiddenOpen) : null;
    try {
      return spacePlace();
    } catch {
      return null;
    }
  }, [sealedId, hidden, hiddenOpen]);

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
    if (sealedId) {
      if (!place) {
        setCard(null);
        return;
      }
      loadPlace(place)
        .then((data) => {
          const found = data.contacts.find((c) => c.id === sealedId);
          setCard(found ? sealedCard(found) : null);
          setGone(!found);
        })
        .catch((error) => setNote(errorText(error)));
      return;
    }
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
  }, [id, sealedId, place]);

  useFocusEffect(
    useCallback(() => {
      load();
      const changed = sealedId ? null : onContactsEvent('onContactsChanged', load);
      const sealed = onSealedChange(load);
      return () => {
        changed?.remove();
        sealed();
      };
    }, [load, sealedId]),
  );

  const close = () => (router.canGoBack() ? router.back() : router.replace(hidden ? '/contacts?hidden=1' : '/contacts'));

  if (hidden && !hiddenOpen) {
    return (
      <Page>
        <Text tone="muted">{t('The hidden chats are closed.')}</Text>
      </Page>
    );
  }
  if (gone) {
    return (
      <Page>
        <Text tone="muted">{sealedId ? t('This contact is no longer kept in Erevos.') : t('This contact is no longer on the phone.')}</Text>
        <Button title={t('Close')} kind="secondary" onPress={close} />
      </Page>
    );
  }
  if (!card) return <Page>{note ? <Text tone="muted">{note}</Text> : null}</Page>;

  async function star() {
    if (!card) return;
    setNote('');
    try {
      if (card.sealed && place) await starSealed(place, card.sealed.id, !card.starred);
      else if (card.phone) await starPhoneContact(card.phone.id, !card.starred);
      setCard({ ...card, starred: !card.starred });
    } catch (error) {
      setNote(errorText(error));
    }
  }

  async function remove() {
    if (!card) return;
    const question = card.sealed
      ? t('Delete {name}? It is kept only in Erevos, and cannot be brought back.', { name: card.name })
      : t('Delete {name} from the phone? It goes from every account it is kept in, and cannot be brought back.', { name: card.name });
    if (!(await confirm(t('Delete contact'), question, t('Delete')))) return;
    try {
      if (card.sealed && place) await removeSealed(place, card.sealed.id);
      else if (card.phone) await removePhoneContacts([card.phone.id]);
      close();
    } catch (error) {
      setNote(errorText(error));
    }
  }

  async function changePhoto(from: 'photos' | 'camera' | null) {
    if (!card) return;
    setNote('');
    try {
      const bytes = from ? await pickAvatar(from, card.sealed ? SEALED_SIDE : PHOTO_SIDE) : null;
      if (from && !bytes) return;
      if (card.sealed && place) {
        await setSealedPhoto(place, card.sealed.id, bytes);
      } else if (card.phone) {
        await setPhoneContactPhoto(card.phone.id, bytes);
        forgetPhoneContactPhoto(card.phone.id);
      }
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

  async function saveFile() {
    if (!card) return;
    setNote('');
    try {
      const saved = await saveVCards([card], vcfName(card.name));
      if (saved) setNote(t('Saved as {name}. The file is outside Erevos: anyone who has it can read this contact.', { name: saved }));
    } catch (error) {
      setNote(errorText(error));
    }
  }

  // A phone contact sealed in the space instead, with its star and photo, and taken out of
  // Android's contacts, where other apps and its account no longer see it.
  async function moveIntoErevos() {
    if (!card?.phone) return;
    if (!(await confirm(t('Keep only in Erevos'), t("Move {name} into Erevos? It is sealed in this space and deleted from the phone's contacts, from every account it is kept in: other apps no longer see it, and the phone no longer shows its name when it calls.", { name: card.name }), t('Move')))) return;
    setNote('');
    try {
      const base64 = card.phone.photo ? await phoneContactPhoto(card.phone.id, true).catch(() => null) : null;
      const ref = base64 ? await savePhoto(fromBase64(base64)) : null;
      const kept = await saveSealed(spacePlace(), null, card, { starred: card.starred, photo: ref });
      await removePhoneContacts([card.phone.id]);
      router.replace(`/contact-card?sealed=${kept}`);
    } catch (error) {
      setNote(errorText(error));
    }
  }

  // A sealed contact put in Android's contacts on this phone, and no longer kept in Erevos.
  async function moveToPhone() {
    if (!card?.sealed || !place) return;
    if (!(await confirm(t("Move to the phone's contacts"), t("Move {name} to the phone's contacts? Every app allowed to read them sees it there, and it is no longer kept in Erevos.", { name: card.name }), t('Move')))) return;
    setNote('');
    try {
      const made = await savePhoneContact(phoneSave(card, null, null, card.starred));
      const bytes = card.sealed.photo ? await loadPhoto(card.sealed.photo).catch(() => null) : null;
      if (bytes) await setPhoneContactPhoto(made, bytes).catch(() => undefined);
      await removeSealed(place, card.sealed.id);
      router.replace(`/contact-card?id=${made}`);
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
  const editHref = card.sealed ? `/contact-edit?sealed=${card.sealed.id}${hidden ? '&hidden=1' : ''}` : `/contact-edit?id=${card.phone?.id ?? 0}`;

  return (
    <Page>
      <View style={styles.top}>
        <Pressable onPress={() => setChoosingPhoto(true)} disabled={hidden} accessibilityRole="button" accessibilityLabel={photo ? t('Change photo') : t('Add a photo')}>
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
        {card.sealed ? (
          <Text variant="caption" tone="muted" style={styles.center}>
            {hidden ? t('Kept only in these hidden chats, sealed.') : t('Kept only in Erevos, sealed in this space. Not in the phone\'s contacts.')}
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

      {card.phone ? (
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
      ) : null}

      {card.phone ? (
        <Card>
          <Text variant="label" tone="muted">
            {t('Ringtone')}
          </Text>
          <Text tone={ringtone ? undefined : 'muted'}>{ringtone ? tone || t('A ringtone of its own') : t("The phone's own")}</Text>
          <Button title={t('Choose ringtone')} kind="secondary" compact onPress={() => void chooseRingtone()} />
        </Card>
      ) : null}

      <Row wrap>
        <Button title={t('Edit')} kind="secondary" compact onPress={() => router.push(editHref)} />
        <Button title={t('QR code')} kind="secondary" compact onPress={() => setShowingQr(true)} />
        {!hidden ? <Button title={t('Save as a .vcf file')} kind="secondary" compact onPress={() => void saveFile()} /> : null}
        {card.phone ? <Button title={t('Keep only in Erevos')} kind="secondary" compact onPress={() => void moveIntoErevos()} /> : null}
        {card.sealed && !hidden ? <Button title={t("Move to the phone's contacts")} kind="secondary" compact onPress={() => void moveToPhone()} /> : null}
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

      <Sheet visible={showingQr} onClose={() => setShowingQr(false)} title={card.name}>
        {showingQr ? <ContactQr card={card} /> : null}
        <Button title={t('Done')} compact onPress={() => setShowingQr(false)} />
      </Sheet>

      <Sheet visible={choosingPhoto} onClose={() => setChoosingPhoto(false)} title={t('Photo')}>
        <Text tone="muted">
          {card.sealed
            ? t('The photo is sealed with the contact, in a file of its own: only Erevos shows it.')
            : t("The photo is kept with the contact in Android's contacts, where the phone shows it when they call, and its account (Google) syncs it.")}
        </Text>
        <Row wrap>
          <Button title={t('Choose a photo')} compact onPress={() => void changePhoto('photos')} />
          {CAN_TAKE_PHOTOS ? <Button title={t('Take photo')} kind="secondary" compact onPress={() => void changePhoto('camera')} /> : null}
        </Row>
        {card.phone?.photo || card.sealed?.photo ? <TextButton title={t('Remove the photo')} onPress={() => void changePhoto(null)} /> : null}
        {note ? <Text tone="muted">{note}</Text> : null}
      </Sheet>
    </Page>
  );
}

/** The contact's vCard as a QR code, shorter when it would be too long, or why there is none. */
function ContactQr({ card }: { card: ContactCard }) {
  const qr = useMemo(() => qrVCard(card), [card]);
  if (!qr) return <Text tone="muted">{t('This contact holds too much for a QR code. Save it as a .vcf file instead.')}</Text>;
  return (
    <>
      <QrCode text={qr.text} size={300} />
      <Text variant="caption" tone="muted">
        {qr.whole
          ? t("Another phone's camera reads it as a contact to add: its name, numbers, emails, addresses and note, without its photo. Whoever sees the code can read it.")
          : t("Another phone's camera reads it as a contact to add, without its photo, and without its note or addresses, which do not fit. Whoever sees the code can read it.")}
      </Text>
    </>
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
