import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button, Card, Chip, Field, Page, Row, Text } from '../components/ui';
import { phoneCards } from '../lib/contact-book';
import { notKept, phoneSave, simFields, type Fields } from '../lib/contacts';
import { plural, t } from '../lib/i18n';
import { contactAccounts, savePhoneContact, simContacts, type ContactAccount } from '../modules/erevos-contacts';
import { radius, space, type Colors } from '../theme/colors';
import { useStyles, useTheme } from '../theme/context';

// The contacts on the phone's SIM cards, copied into Android's contacts: those not on the phone
// yet, all chosen at first, on this phone only or in an account. The SIM keeps its own.

const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error));

type SimCard = Fields & { name: string; key: string; sim: number };

export default function ContactSim() {
  const styles = useStyles(makeStyles);
  const { colors } = useTheme();
  const [all, setAll] = useState<number | null>(null);
  const [fresh, setFresh] = useState<SimCard[]>([]);
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const [accounts, setAccounts] = useState<ContactAccount[]>([]);
  const [account, setAccount] = useState<ContactAccount | null>(null);
  const [done, setDone] = useState<number | null>(null);
  const [copied, setCopied] = useState<{ saved: number; failed: number } | null>(null);
  const [note, setNote] = useState('');

  useEffect(() => {
    Promise.all([simContacts(), phoneCards()])
      .then(([sim, phone]) => {
        const cards = sim.map((s, i) => ({ ...simFields(s), key: `s${i}`, sim: s.sim }));
        const left = notKept(cards, phone);
        setAll(cards.length);
        setFresh(left);
        setChosen(new Set(left.map((c) => c.key)));
      })
      .catch((error) => setNote(errorText(error)));
    contactAccounts()
      .then(setAccounts)
      .catch(() => undefined);
  }, []);

  const slots = useMemo(() => new Set(fresh.map((c) => c.sim)).size, [fresh]);

  const toggle = (key: string) =>
    setChosen((before) => {
      const next = new Set(before);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  async function copy() {
    if (done !== null) return;
    setNote('');
    setDone(0);
    let saved = 0;
    let failed = 0;
    for (const card of fresh.filter((c) => chosen.has(c.key))) {
      try {
        await savePhoneContact(phoneSave(card, null, account, false));
        saved++;
      } catch {
        failed++;
      }
      setDone(saved + failed);
    }
    setDone(null);
    setCopied({ saved, failed });
    setFresh((before) => before.filter((c) => !chosen.has(c.key)));
    setChosen(new Set());
  }

  return (
    <Page>
      <Text variant="title">{t('SIM contacts')}</Text>
      <Text tone="muted">{t("The contacts kept on the phone's SIM cards. Copied, they are in Android's contacts like the others; the SIM keeps its own.")}</Text>
      {all === null && !note ? <Text tone="muted">{t('Reading the SIM…')}</Text> : null}
      {all === 0 ? <Text tone="muted">{t('No contacts on the SIM, or the phone does not let Erevos read it.')}</Text> : null}
      {all !== null && all > 0 ? (
        <Card>
          <Text>{plural(all, 'The SIM has {n} contact.', 'The SIM has {n} contacts.')}</Text>
          {all > fresh.length && !copied ? (
            <Text tone="muted">{plural(all - fresh.length, '{n} of them is on the phone already, and is left out.', '{n} of them are on the phone already, and are left out.')}</Text>
          ) : null}
          {fresh.length > 0 && accounts.length > 0 ? (
            <Field label={t('Kept in')}>
              <Row wrap>
                <Chip label={t('On this phone only')} selected={account === null} onPress={() => setAccount(null)} />
                {accounts.map((a) => (
                  <Chip key={`${a.type}\n${a.name}`} label={a.name} selected={account?.type === a.type && account.name === a.name} onPress={() => setAccount(a)} />
                ))}
              </Row>
            </Field>
          ) : null}
          {fresh.length > 0 ? (
            <Button
              title={done !== null ? t('Copying… {done} of {total}', { done, total: chosen.size }) : chosen.size > 0 ? plural(chosen.size, 'Copy {n} contact to the phone', 'Copy {n} contacts to the phone') : t('Choose who to copy')}
              loading={done !== null}
              disabled={chosen.size === 0}
              onPress={() => void copy()}
            />
          ) : null}
        </Card>
      ) : null}
      {copied ? (
        <Card>
          <Text variant="bodyStrong">{plural(copied.saved, '{n} contact copied to the phone.', '{n} contacts copied to the phone.')}</Text>
          {copied.failed > 0 ? <Text tone="muted">{plural(copied.failed, '{n} contact could not be saved.', '{n} contacts could not be saved.')}</Text> : null}
          <Button title={t('Done')} compact onPress={() => (router.canGoBack() ? router.back() : router.replace('/contacts'))} />
        </Card>
      ) : null}
      {note ? <Text tone="muted">{note}</Text> : null}
      {fresh.map((card) => {
        const on = chosen.has(card.key);
        return (
          <Pressable key={card.key} onPress={() => toggle(card.key)} accessibilityRole="checkbox" accessibilityState={{ checked: on }} style={({ pressed }) => [styles.pick, (pressed || on) && styles.pressed]}>
            <View style={styles.grow}>
              <Text numberOfLines={1}>{card.name}</Text>
              <Text variant="caption" tone="muted">
                {[card.phones[0]?.value, slots > 1 ? t('SIM {n}', { n: card.sim + 1 }) : ''].filter(Boolean).join(' · ')}
              </Text>
            </View>
            <Text variant="bodyStrong" color={on ? colors.accentText : colors.textFaint}>
              {on ? '✓' : '○'}
            </Text>
          </Pressable>
        );
      })}
    </Page>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    grow: {
      flex: 1,
    },
    pressed: {
      backgroundColor: colors.surfacePressed,
    },
    pick: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.md,
      padding: space.sm,
      borderRadius: radius.md,
    },
  });
