// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';

import { Button, Card, Chip, Field, Page, Row, Text } from '../components/ui';
import { phoneCards, sealedCard } from '../lib/contact-book';
import { importVCards, MAX_VCF, pickVCards } from '../lib/contact-files';
import { notKept } from '../lib/contacts';
import { enterHiddenScreen, useOpenHiddenPlace } from '../lib/hidden-contacts';
import { plural, t } from '../lib/i18n';
import { TooLargeError } from '../lib/pick-file';
import { importSealed, loadPlace, placeOf, type Place } from '../lib/sealed-contacts';
import type { VCard } from '../lib/vcard';
import { contactAccounts, type ContactAccount } from '../modules/erevos-contacts';

// Contacts from a .vcf file (a vCard), as another phone or app saves them: read here, and those
// not on the phone yet saved in Android's contacts, on this phone only or in an account. Among the
// hidden chats' screens (`hidden`), those not among their own contacts yet are kept with them,
// sealed, never in Android's contacts; the screen shows nothing once they close, and they stay
// open while the file is picked (lib/picking.ts).

const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error));

type Read = { file: string; all: number; fresh: VCard[] };

export default function ContactImport() {
  const params = useLocalSearchParams<{ hidden?: string }>();
  const hidden = params.hidden === '1';
  const hiddenOpen = useOpenHiddenPlace();
  const place = useMemo((): Place | null => (hidden && hiddenOpen ? placeOf(hiddenOpen) : null), [hidden, hiddenOpen]);
  const [accounts, setAccounts] = useState<ContactAccount[]>([]);
  const [account, setAccount] = useState<ContactAccount | null>(null);
  const [read, setRead] = useState<Read | null>(null);
  const [done, setDone] = useState<number | null>(null);
  const [result, setResult] = useState<{ saved: number; failed: number } | null>(null);
  const [note, setNote] = useState('');

  useEffect(() => (hidden ? enterHiddenScreen() : undefined), [hidden]);

  useEffect(() => {
    if (hidden) return;
    contactAccounts()
      .then(setAccounts)
      .catch(() => undefined);
  }, [hidden]);

  // What a file read for hidden chats was is forgotten once they close.
  useEffect(() => {
    if (hidden && !hiddenOpen) setRead(null);
  }, [hidden, hiddenOpen]);

  async function kept() {
    if (!hidden) return phoneCards();
    if (!place) throw new Error(t('The hidden chats are closed.'));
    return (await loadPlace(place)).contacts.map(sealedCard);
  }

  async function choose() {
    setNote('');
    setResult(null);
    try {
      const picked = await pickVCards();
      if (!picked) return;
      if (picked.cards.length === 0) {
        setRead(null);
        setNote(t('There are no contacts in {file}.', { file: picked.name }));
        return;
      }
      setRead({ file: picked.name, all: picked.cards.length, fresh: notKept(picked.cards, await kept()) });
    } catch (error) {
      setNote(error instanceof TooLargeError ? t('The file is larger than {n} MB.', { n: MAX_VCF / 1024 / 1024 }) : errorText(error));
    }
  }

  async function save() {
    if (!read || done !== null) return;
    setNote('');
    setDone(0);
    try {
      if (hidden && !place) throw new Error(t('The hidden chats are closed.'));
      setResult(place ? await importSealed(place, read.fresh, setDone) : await importVCards(read.fresh, account, setDone));
      setRead(null);
    } catch (error) {
      setNote(errorText(error));
    } finally {
      setDone(null);
    }
  }

  if (hidden && !hiddenOpen) {
    return (
      <Page>
        <Text tone="muted">{t('The hidden chats are closed.')}</Text>
      </Page>
    );
  }

  const known = read ? read.all - read.fresh.length : 0;

  return (
    <Page>
      <Text variant="title">{t('Import contacts')}</Text>
      <Text tone="muted">{t('Choose a .vcf file (a vCard), as other phones and apps save their contacts. Erevos reads it here and sends it nowhere.')}</Text>
      {hidden ? <Text tone="muted">{t("Kept only here, sealed with the hidden chats: they show nowhere else, not even in the space's contacts.")}</Text> : null}
      <Button title={t('Choose a .vcf file')} kind={read ? 'secondary' : 'primary'} disabled={done !== null} onPress={() => void choose()} />

      {read ? (
        <Card>
          <Text variant="bodyStrong">{read.file}</Text>
          <Text>{plural(read.all, 'It has {n} contact.', 'It has {n} contacts.')}</Text>
          {known > 0 ? (
            <Text tone="muted">
              {hidden
                ? plural(known, '{n} of them is in these hidden chats already, and is left out.', '{n} of them are in these hidden chats already, and are left out.')
                : plural(known, '{n} of them is on the phone already, and is left out.', '{n} of them are on the phone already, and are left out.')}
            </Text>
          ) : null}
          {read.fresh.length > 0 ? (
            <>
              {!hidden && accounts.length > 0 ? (
                <Field label={t('Kept in')}>
                  <Row wrap>
                    <Chip label={t('On this phone only')} selected={account === null} onPress={() => setAccount(null)} />
                    {accounts.map((a) => (
                      <Chip key={`${a.type}\n${a.name}`} label={a.name} selected={account?.type === a.type && account.name === a.name} onPress={() => setAccount(a)} />
                    ))}
                  </Row>
                </Field>
              ) : null}
              <Text variant="caption" tone="muted">
                {read.fresh
                  .slice(0, 8)
                  .map((c) => c.name)
                  .join(', ')}
                {read.fresh.length > 8 ? '…' : ''}
              </Text>
              <Button
                title={done !== null ? t('Importing… {done} of {total}', { done, total: read.fresh.length }) : plural(read.fresh.length, 'Import {n} contact', 'Import {n} contacts')}
                loading={done !== null}
                onPress={() => void save()}
              />
            </>
          ) : (
            <Text tone="muted">{t('Nothing new to import.')}</Text>
          )}
        </Card>
      ) : null}

      {result ? (
        <Card>
          <Text variant="bodyStrong">{plural(result.saved, '{n} contact imported.', '{n} contacts imported.')}</Text>
          {result.failed > 0 ? <Text tone="muted">{plural(result.failed, '{n} contact could not be saved.', '{n} contacts could not be saved.')}</Text> : null}
          <Button title={t('Done')} compact onPress={() => (router.canGoBack() ? router.back() : router.replace(hidden ? '/contacts?hidden=1' : '/contacts'))} />
        </Card>
      ) : null}
      {note ? <Text tone="muted">{note}</Text> : null}
    </Page>
  );
}
