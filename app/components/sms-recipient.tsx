// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { PermissionsAndroid, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { dialCards, type Card as ContactCard } from '../lib/contact-book';
import type { Findable } from '../lib/contacts';
import { t } from '../lib/i18n';
import { recipientRows, typedPart, withRecipient } from '../lib/sms-recipient';
import { contactsStatus } from '../modules/erevos-contacts';
import { useLock } from '../lock/context';
import { space, radius, type Colors } from '../theme/colors';
import { useStyles } from '../theme/context';
import { Button, Card, Field, Input, Row, Sheet, Text } from './ui';

// The recipient of a new SMS: numbers separated by commas (several make a group's MMS), with a
// search that suggests the contacts matching what is typed after the last comma, and a sheet to
// choose from all of them; each choice is added to the numbers. The contacts are the Phone's
// search's (lib/contact-book.ts dialCards): the phone's, and with all of Erevos open those kept
// only in Erevos and the Erevos contacts with a number; with only the SMS open (app/_layout.tsx),
// the phone's alone. Never the names of hidden chats.

const SUGGESTED = 4;

export function SmsRecipient({ value, onChange, onSubmit, autoFocus }: { value: string; onChange: (value: string) => void; onSubmit: () => void; autoFocus?: boolean }) {
  const styles = useStyles(makeStyles);
  const withSpace = useLock().only !== 'sms';
  const [cards, setCards] = useState<ContactCard[] | null>(null);
  const [mayRead, setMayRead] = useState(true);
  const [choosing, setChoosing] = useState(false);
  const [query, setQuery] = useState('');
  const [note, setNote] = useState('');
  const findables = useMemo(() => new Map<string, Findable>(), [cards]);

  // Read anew each time the contacts are looked at, so one added meanwhile is found.
  const read = useCallback(() => {
    setMayRead(contactsStatus().read);
    dialCards(withSpace).then(setCards, () => setCards([]));
  }, [withSpace]);

  const typed = typedPart(value);
  const typing = typed !== '' && !choosing;
  useEffect(() => {
    if (typing && cards === null) read();
  }, [typing, cards, read]);
  useEffect(() => {
    if (choosing) {
      setNote('');
      read();
    }
  }, [choosing, read]);

  const suggestions = useMemo(() => (typing && cards ? recipientRows(cards, typed, findables, SUGGESTED) : []), [typing, cards, typed, findables]);
  const listed = useMemo(() => (choosing && cards ? recipientRows(cards, query, findables, 200) : []), [choosing, cards, query, findables]);

  async function allow() {
    const answer = await PermissionsAndroid.request('android.permission.READ_CONTACTS').catch(() => null);
    if (answer === PermissionsAndroid.RESULTS.GRANTED) {
      setNote('');
      read();
    } else setNote(t('Android did not allow it. Under Settings, Allow calls and contacts says how to.'));
  }

  const close = () => {
    setChoosing(false);
    setQuery('');
  };

  return (
    <>
      <Field label={t('Phone number')} hint={t('For a group MMS, several numbers separated by commas.')}>
        <Row>
          <Input
            value={value}
            onChangeText={onChange}
            placeholder="+30 69…, +30 69…"
            autoFocus={autoFocus}
            autoCorrect={false}
            onSubmitEditing={onSubmit}
            style={styles.input}
          />
          <Button title={t('Contacts')} kind="secondary" compact onPress={() => setChoosing(true)} />
        </Row>
      </Field>
      {suggestions.map((row) => (
        <Pressable
          key={row.key}
          onPress={() => onChange(withRecipient(value, row.number, true))}
          accessibilityRole="button"
          accessibilityLabel={`${row.name}, ${row.kind}, ${row.number}`}
          style={({ pressed }) => [styles.row, pressed && styles.pressed]}
        >
          <Line name={row.name} detail={`${row.kind} · ${row.number}`} />
        </Pressable>
      ))}
      <Sheet visible={choosing} onClose={close} title={t('Choose from contacts')}>
        <Input value={query} onChangeText={setQuery} placeholder={t('Search contacts')} accessibilityLabel={t('Search contacts')} autoCorrect={false} />
        {mayRead ? null : (
          <Card>
            <Text tone="muted">{t("Android does not let Erevos read the phone's contacts yet.")}</Text>
            <Button title={t('Allow the contacts')} onPress={() => void allow()} />
            {note ? <Text tone="muted">{note}</Text> : null}
          </Card>
        )}
        <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
          {cards !== null && listed.length === 0 ? <Text tone="muted">{t('No contact with a number matches.')}</Text> : null}
          {listed.map((row) => (
            <Pressable
              key={row.key}
              // Added to the numbers there are, so a group's can be chosen one after the other.
              onPress={() => {
                onChange(withRecipient(value, row.number, false));
                close();
              }}
              accessibilityRole="button"
              accessibilityLabel={`${row.name}, ${row.kind}, ${row.number}`}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            >
              <Line name={row.name} detail={`${row.kind} · ${row.number}`} />
            </Pressable>
          ))}
        </ScrollView>
      </Sheet>
    </>
  );
}

function Line({ name, detail }: { name: string; detail: string }) {
  const styles = useStyles(makeStyles);
  return (
    <View style={styles.body}>
      <Text variant="bodyStrong" numberOfLines={1}>
        {name}
      </Text>
      <Text variant="caption" tone="muted" numberOfLines={1}>
        {detail}
      </Text>
    </View>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    input: { flex: 1 },
    list: { maxHeight: 360 },
    row: {
      paddingVertical: space.sm,
      paddingHorizontal: space.sm,
      borderRadius: radius.lg,
    },
    pressed: { backgroundColor: colors.surfacePressed },
    body: { gap: 2 },
  });
