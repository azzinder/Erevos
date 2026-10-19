import { router } from 'expo-router';
import { useEffect, useState } from 'react';

import { Button, Card, Chip, Field, Page, Row, Text } from '../components/ui';
import { phoneCards } from '../lib/contact-book';
import { importVCards, MAX_VCF, pickVCards } from '../lib/contact-files';
import { notKept } from '../lib/contacts';
import { plural, t } from '../lib/i18n';
import { TooLargeError } from '../lib/pick-file';
import type { VCard } from '../lib/vcard';
import { contactAccounts, type ContactAccount } from '../modules/erevos-contacts';

// Contacts from a .vcf file (a vCard), as another phone or app saves them: read here, and those
// not on the phone yet saved in Android's contacts, on this phone only or in an account.

const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error));

type Read = { file: string; all: number; fresh: VCard[] };

export default function ContactImport() {
  const [accounts, setAccounts] = useState<ContactAccount[]>([]);
  const [account, setAccount] = useState<ContactAccount | null>(null);
  const [read, setRead] = useState<Read | null>(null);
  const [done, setDone] = useState<number | null>(null);
  const [result, setResult] = useState<{ saved: number; failed: number } | null>(null);
  const [note, setNote] = useState('');

  useEffect(() => {
    contactAccounts()
      .then(setAccounts)
      .catch(() => undefined);
  }, []);

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
      setRead({ file: picked.name, all: picked.cards.length, fresh: notKept(picked.cards, await phoneCards()) });
    } catch (error) {
      setNote(error instanceof TooLargeError ? t('The file is larger than {n} MB.', { n: MAX_VCF / 1024 / 1024 }) : errorText(error));
    }
  }

  async function save() {
    if (!read || done !== null) return;
    setNote('');
    setDone(0);
    try {
      setResult(await importVCards(read.fresh, account, setDone));
      setRead(null);
    } catch (error) {
      setNote(errorText(error));
    } finally {
      setDone(null);
    }
  }

  const known = read ? read.all - read.fresh.length : 0;

  return (
    <Page>
      <Text variant="title">{t('Import contacts')}</Text>
      <Text tone="muted">{t('Choose a .vcf file (a vCard), as other phones and apps save their contacts. Erevos reads it here and sends it nowhere.')}</Text>
      <Button title={t('Choose a .vcf file')} kind={read ? 'secondary' : 'primary'} disabled={done !== null} onPress={() => void choose()} />

      {read ? (
        <Card>
          <Text variant="bodyStrong">{read.file}</Text>
          <Text>{plural(read.all, 'It has {n} contact.', 'It has {n} contacts.')}</Text>
          {known > 0 ? <Text tone="muted">{plural(known, '{n} of them is on the phone already, and is left out.', '{n} of them are on the phone already, and are left out.')}</Text> : null}
          {read.fresh.length > 0 ? (
            <>
              {accounts.length > 0 ? (
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
          <Button title={t('Done')} compact onPress={() => (router.canGoBack() ? router.back() : router.replace('/contacts'))} />
        </Card>
      ) : null}
      {note ? <Text tone="muted">{note}</Text> : null}
    </Page>
  );
}
