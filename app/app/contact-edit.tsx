import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { Button, Chip, Field, Input, Page, Row, SectionTitle, Text, TextButton } from '../components/ui';
import { sealedFields } from '../lib/contact-book';
import { askedFields, birthdayText, CHOSEN_KINDS, cleanFields, EMPTY_FIELDS, fieldsName, kindLabel, MAX_ENTRIES, parseBirthday, phoneFields, phoneSave, type Entry, type Fields } from '../lib/contacts';
import { enterHiddenScreen, useOpenHiddenPlace } from '../lib/hidden-contacts';
import { t } from '../lib/i18n';
import { loadPlace, placeOf, saveSealed, spacePlace, type Place } from '../lib/sealed-contacts';
import { contactAccounts, contactsReady, phoneContact, savePhoneContact, type ContactAccount, type PhoneContact } from '../modules/erevos-contacts';
import { radius, space, type Colors } from '../theme/colors';
import { useStyles, useTheme } from '../theme/context';

// A contact being written: a new one, or one of the phone's to change. A new one is kept in
// Android's contacts on this phone only, or in an account the phone syncs contacts with, as the
// owner chooses, or only in Erevos, sealed in the space (`sealed`, lib/sealed-contacts.ts). Among
// the hidden chats' screens (`hidden`), it is always theirs, sealed with them. Another app (or a
// QR code) can start one with fields of its own (`fill`), which are kept only once the owner saves.

type ListName = 'phones' | 'emails' | 'addresses';

const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error));

/** A birthday as typed here: day/month/year, or day/month. */
function typedBirthday(text: string): string {
  const b = parseBirthday(text);
  if (!b) return text;
  return b.year !== null ? `${b.day}/${b.month}/${b.year}` : `${b.day}/${b.month}`;
}

export default function ContactEdit() {
  const params = useLocalSearchParams<{ id?: string; fill?: string; sealed?: string; hidden?: string }>();
  const id = Number(params.id ?? 0);
  const sealedId = typeof params.sealed === 'string' ? params.sealed : '';
  const hidden = params.hidden === '1';
  const hiddenOpen = useOpenHiddenPlace();
  const phoneHere = Platform.OS === 'android' && contactsReady() && !hidden;
  const styles = useStyles(makeStyles);
  const [phone, setPhone] = useState<PhoneContact | null>(null);
  const [filled] = useState<Fields>(() => (typeof params.fill === 'string' ? (askedFields(params.fill) ?? EMPTY_FIELDS) : EMPTY_FIELDS));
  const [fields, setFields] = useState<Fields>(filled);
  const [birthday, setBirthday] = useState(() => typedBirthday(filled.birthday));
  const [birthdayBefore, setBirthdayBefore] = useState(() => typedBirthday(filled.birthday));
  const [accounts, setAccounts] = useState<ContactAccount[]>([]);
  const [account, setAccount] = useState<ContactAccount | null>(null);
  // A new contact: in Android's contacts, or sealed, only in Erevos.
  const [sealed, setSealed] = useState(() => !phoneHere);
  const [ready, setReady] = useState(!(id > 0) && !sealedId);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState('');

  useEffect(() => (hidden ? enterHiddenScreen() : undefined), [hidden]);

  // Where a sealed contact is kept: the hidden chats while they are open, else the space.
  const place = useMemo((): Place | null => {
    if (hidden) return hiddenOpen ? placeOf(hiddenOpen) : null;
    try {
      return spacePlace();
    } catch {
      return null;
    }
  }, [hidden, hiddenOpen]);
  const placeKey = place ? `${place.holder} ${place.space}` : '';
  const keptSealed = Boolean(sealedId) || hidden || (!phone && sealed);

  useEffect(() => {
    if (sealedId) {
      if (!place) return;
      loadPlace(place)
        .then((data) => {
          const found = data.contacts.find((c) => c.id === sealedId);
          if (!found) {
            setNote(t('This contact is no longer kept in Erevos.'));
            return;
          }
          const f = sealedFields(found);
          setFields(f);
          setBirthday(typedBirthday(f.birthday));
          setBirthdayBefore(typedBirthday(f.birthday));
          setReady(true);
        })
        .catch((error) => setNote(errorText(error)));
    } else if (id > 0) {
      phoneContact(id)
        .then((c) => {
          if (!c) {
            setNote(t('This contact is no longer on the phone.'));
            return;
          }
          const f = phoneFields(c);
          setPhone(c);
          setFields(f);
          setBirthday(typedBirthday(f.birthday));
          setBirthdayBefore(typedBirthday(f.birthday));
          setReady(true);
        })
        .catch((error) => setNote(errorText(error)));
    } else if (phoneHere) {
      contactAccounts()
        .then(setAccounts)
        .catch(() => undefined);
    }
    // Read once for the place, not each time the hidden chats lend it again, which would undo what is typed.
  }, [id, sealedId, phoneHere, placeKey]);

  const set = (patch: Partial<Fields>) => setFields((f) => ({ ...f, ...patch }));
  const setEntry = (list: ListName, index: number, patch: Partial<Entry>) =>
    setFields((f) => ({ ...f, [list]: f[list].map((e, i) => (i === index ? { ...e, ...patch } : e)) }));
  const addEntry = (list: ListName) => setFields((f) => ({ ...f, [list]: [...f[list], { value: '', kind: CHOSEN_KINDS[list][0], label: '' }].slice(0, MAX_ENTRIES) }));
  const removeEntry = (list: ListName, index: number) => setFields((f) => ({ ...f, [list]: f[list].filter((_, i) => i !== index) }));
  const keepIn = (a: ContactAccount | null) => {
    setSealed(false);
    setAccount(a);
  };

  async function save() {
    setNote('');
    // A birthday left as it was stays as Android had it.
    let born = fields.birthday;
    if (birthday.trim() !== birthdayBefore.trim()) {
      const b = birthday.trim() ? parseBirthday(birthday) : null;
      if (birthday.trim() && !b) {
        setNote(t('Write the birthday as day/month/year, or day/month.'));
        return;
      }
      born = b ? birthdayText(b) : '';
    }
    const clean = cleanFields({ ...fields, birthday: born });
    if (!fieldsName(clean)) {
      setNote(t('Give the contact a name, a number or an email.'));
      return;
    }
    setSaving(true);
    try {
      if (keptSealed) {
        if (!place) throw new Error(t('The hidden chats are closed.'));
        const kept = await saveSealed(place, sealedId || null, clean);
        if (sealedId) router.back();
        else router.replace(`/contact-card?sealed=${kept}${hidden ? '&hidden=1' : ''}`);
        return;
      }
      const saved = await savePhoneContact(phoneSave(clean, phone, account, phone?.starred ?? false));
      if (phone) router.back();
      else router.replace(`/contact-card?id=${saved}`);
    } catch (error) {
      setNote(t('Not saved. {error}', { error: errorText(error) }));
    } finally {
      setSaving(false);
    }
  }

  if (hidden && !hiddenOpen) {
    return (
      <Page>
        <Text tone="muted">{t('The hidden chats are closed.')}</Text>
      </Page>
    );
  }
  if (!ready) return <Page>{note ? <Text tone="muted">{note}</Text> : null}</Page>;

  return (
    <Page>
      <Text variant="title">{phone || sealedId ? t('Edit contact') : t('New contact')}</Text>
      <Field label={t('First name')}>
        <Input value={fields.given} onChangeText={(given) => set({ given })} autoCapitalize="words" />
      </Field>
      <Field label={t('Last name')}>
        <Input value={fields.family} onChangeText={(family) => set({ family })} autoCapitalize="words" />
      </Field>
      <Field label={t('Company')}>
        <Input value={fields.company} onChangeText={(company) => set({ company })} />
      </Field>
      <Field label={t('Job title')}>
        <Input value={fields.title} onChangeText={(title) => set({ title })} />
      </Field>

      <SectionTitle title={t('Phone numbers')} />
      <Entries list="phones" entries={fields.phones} onChange={setEntry} onRemove={removeEntry} />
      <TextButton title={t('Add a number')} onPress={() => addEntry('phones')} />

      <SectionTitle title={t('Emails')} />
      <Entries list="emails" entries={fields.emails} onChange={setEntry} onRemove={removeEntry} />
      <TextButton title={t('Add an email')} onPress={() => addEntry('emails')} />

      <SectionTitle title={t('Addresses')} />
      <Entries list="addresses" entries={fields.addresses} onChange={setEntry} onRemove={removeEntry} />
      <TextButton title={t('Add an address')} onPress={() => addEntry('addresses')} />

      <SectionTitle title={t('More')} />
      <Field label={t('Birthday')} hint={t('Day/month/year, or day/month without the year.')}>
        <Input value={birthday} onChangeText={setBirthday} keyboardType="numbers-and-punctuation" placeholder="4/5/1990" />
      </Field>
      <Field label={t('Note')}>
        <Input value={fields.note} onChangeText={(text) => set({ note: text })} multiline style={styles.multiline} />
      </Field>

      {hidden ? (
        <Text variant="caption" tone="faint">
          {t("Kept only here, sealed with the hidden chats: they show nowhere else, not even in the space's contacts.")}
        </Text>
      ) : !phone && !sealedId ? (
        <Field label={t('Kept in')}>
          <Row wrap>
            {phoneHere ? <Chip label={t('On this phone only')} selected={!sealed && account === null} onPress={() => keepIn(null)} /> : null}
            {phoneHere
              ? accounts.map((a) => (
                  <Chip key={`${a.type}\n${a.name}`} label={a.name} selected={!sealed && account?.type === a.type && account.name === a.name} onPress={() => keepIn(a)} />
                ))
              : null}
            <Chip label={t('Only in Erevos')} selected={sealed} onPress={() => setSealed(true)} />
          </Row>
          <Text variant="caption" tone="faint">
            {sealed
              ? t("Sealed in this space, and not in the phone's contacts: no other app sees it, nor any account the phone syncs with.")
              : account
                ? t("In Android's contacts, synced with {account}.", { account: account.name })
                : t("In Android's contacts on this phone, synced nowhere.")}
          </Text>
        </Field>
      ) : null}

      <Row wrap>
        <Button title={t('Save')} onPress={() => void save()} loading={saving} />
        <Button title={t('Cancel')} kind="secondary" onPress={() => router.back()} />
      </Row>
      {note ? <Text tone="muted">{note}</Text> : null}
    </Page>
  );
}

/** The numbers, emails or addresses being written, each with its kind and a way to take it out. */
function Entries({ list, entries, onChange, onRemove }: {
  list: ListName;
  entries: Entry[];
  onChange: (list: ListName, index: number, patch: Partial<Entry>) => void;
  onRemove: (list: ListName, index: number) => void;
}) {
  const styles = useStyles(makeStyles);
  const { colors } = useTheme();
  const kinds = CHOSEN_KINDS[list];
  return (
    <>
      {entries.map((entry, index) => (
        <View key={index} style={styles.entry}>
          <Row>
            <Input
              value={entry.value}
              onChangeText={(value) => onChange(list, index, { value })}
              keyboardType={list === 'phones' ? 'phone-pad' : list === 'emails' ? 'email-address' : 'default'}
              autoCapitalize={list === 'addresses' ? 'sentences' : 'none'}
              multiline={list === 'addresses'}
              style={[styles.grow, list === 'addresses' && styles.multiline]}
            />
            <Pressable onPress={() => onRemove(list, index)} accessibilityRole="button" accessibilityLabel={t('Remove')} hitSlop={6} style={styles.remove}>
              <Text variant="heading" color={colors.textMuted}>
                ×
              </Text>
            </Pressable>
          </Row>
          <Row wrap>
            {kinds.map((kind) => (
              <Chip key={kind} label={kindLabel({ kind, label: '' })} selected={entry.kind === kind} onPress={() => onChange(list, index, { kind })} />
            ))}
            {!kinds.includes(entry.kind) ? <Chip label={kindLabel(entry)} selected /> : null}
          </Row>
        </View>
      ))}
    </>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    entry: {
      gap: space.sm,
      padding: space.sm,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    grow: {
      flex: 1,
    },
    multiline: {
      minHeight: 80,
      textAlignVertical: 'top',
    },
    remove: {
      width: 36,
      alignItems: 'center',
    },
  });
