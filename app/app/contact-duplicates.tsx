// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ContactFace, usePhoneContactPhoto } from '../components/contact-face';
import { Button, Card, Page, Row, Text } from '../components/ui';
import { confirm } from '../lib/alert';
import { mergePhoneCards, phoneCards, type Card as ContactCard } from '../lib/contact-book';
import { findDuplicates, keeperFirst, type Same } from '../lib/contacts';
import { mark, plural, t } from '../lib/i18n';
import { onContactsEvent } from '../modules/erevos-contacts';
import { space } from '../theme/colors';
import { useStyles } from '../theme/context';

// The phone's contacts that look like the same person kept twice (lib/contacts.ts findDuplicates):
// the same name, number or email. Merging keeps the fullest of them with everything of the others
// (lib/contact-book.ts mergePhoneCards) and deletes the others. "Not the same" hides a set until
// the screen is opened again.

const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error));

const WHY: Record<Same, string> = {
  name: mark('The same name'),
  number: mark('The same number'),
  email: mark('The same email'),
};

export default function ContactDuplicates() {
  const [cards, setCards] = useState<ContactCard[] | null>(null);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');

  const load = useCallback(() => {
    phoneCards()
      .then(setCards)
      .catch((error) => setNote(errorText(error)));
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
      const changed = onContactsEvent('onContactsChanged', load);
      return () => changed?.remove();
    }, [load]),
  );

  const sets = useMemo(() => {
    const byKey = new Map((cards ?? []).map((c) => [c.key, c]));
    return findDuplicates((cards ?? []).map((c) => ({ key: c.key, name: c.name, fields: c })))
      .map((set) => ({ id: set.keys.join(' '), why: set.why, cards: keeperFirst(set.keys.map((k) => byKey.get(k)!).filter(Boolean)) }))
      .filter((set) => !hidden.has(set.id));
  }, [cards, hidden]);

  async function merge(list: ContactCard[]) {
    setBusy(true);
    setNote('');
    try {
      await mergePhoneCards(list);
    } catch (error) {
      setNote(errorText(error));
    } finally {
      setBusy(false);
      load();
    }
  }

  async function mergeOne(list: ContactCard[]) {
    if (!(await confirm(t('Merge'), t('Merge these {n} into {name}? The others are deleted, from every account they are kept in.', { n: list.length, name: list[0].name }), t('Merge')))) return;
    await merge(list);
  }

  async function mergeAll() {
    if (!(await confirm(t('Merge all'), plural(sets.length, 'Merge {n} set of contacts, each into its fullest? The others are deleted.', 'Merge {n} sets of contacts, each into its fullest? The others are deleted.'), t('Merge all')))) return;
    setBusy(true);
    setNote('');
    let failed = 0;
    for (const set of sets) {
      try {
        await mergePhoneCards(set.cards);
      } catch {
        failed++;
      }
    }
    setBusy(false);
    if (failed > 0) setNote(plural(failed, '{n} set could not be merged.', '{n} sets could not be merged.'));
    load();
  }

  return (
    <Page>
      <Text variant="title">{t('Duplicates')}</Text>
      <Text tone="muted">
        {t('Contacts that look like the same person: the same name, number or email. Merging keeps the fullest, with every number, email and address of the others, and deletes the others.')}
      </Text>
      {cards !== null && sets.length === 0 ? <Text tone="muted">{t('No duplicates found.')}</Text> : null}
      {sets.length > 1 ? <Button title={t('Merge all')} loading={busy} onPress={() => void mergeAll()} /> : null}
      {note ? <Text tone="muted">{note}</Text> : null}
      {sets.map((set) => (
        <Card key={set.id}>
          <Text variant="label" tone="muted">
            {t(WHY[set.why])}
          </Text>
          {set.cards.map((card, i) => (
            <DuplicateRow key={card.key} card={card} keeper={i === 0} />
          ))}
          <Row wrap>
            <Button title={t('Merge')} compact disabled={busy} onPress={() => void mergeOne(set.cards)} />
            <Button title={t('Not the same')} kind="secondary" compact disabled={busy} onPress={() => setHidden((before) => new Set(before).add(set.id))} />
          </Row>
        </Card>
      ))}
    </Page>
  );
}

function DuplicateRow({ card, keeper }: { card: ContactCard; keeper: boolean }) {
  const styles = useStyles(makeStyles);
  const photo = usePhoneContactPhoto(card.phone?.id ?? null, card.phone?.photo ?? 0);
  const detail = [...card.phones.map((p) => p.value), ...card.emails.map((e) => e.value), card.company].filter(Boolean).join(' · ');
  return (
    <View style={styles.row}>
      <ContactFace name={card.name} uri={photo} size={40} />
      <View style={styles.grow}>
        <Text variant="bodyStrong" numberOfLines={1} onPress={() => router.push(`/contact-card?id=${card.phone?.id ?? 0}`)}>
          {card.name}
        </Text>
        {detail ? (
          <Text variant="caption" tone="muted" numberOfLines={2}>
            {detail}
          </Text>
        ) : null}
        {keeper ? (
          <Text variant="caption" tone="faint">
            {t('Kept, with the others in it')}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const makeStyles = () =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.md,
    },
    grow: {
      flex: 1,
      gap: 2,
    },
  });
