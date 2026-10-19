import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ContactFace, usePhoneContactPhoto } from '../components/contact-face';
import { Button, Card, Chip, Field, Input, Page, Row, SectionTitle, Sheet, Text } from '../components/ui';
import { confirm } from '../lib/alert';
import { groupsByTitle, phoneCards, type Card as ContactCard } from '../lib/contact-book';
import { cleanLine, matches } from '../lib/contacts';
import { plural, t } from '../lib/i18n';
import {
  addToPhoneGroup,
  contactAccounts,
  createPhoneGroup,
  deletePhoneGroup,
  onContactsEvent,
  phoneGroups,
  removeFromPhoneGroup,
  renamePhoneGroup,
  type ContactAccount,
  type PhoneGroup,
} from '../modules/erevos-contacts';
import { radius, space, type Colors } from '../theme/colors';
import { useStyles, useTheme } from '../theme/context';

// The groups (labels) of the phone's contacts: Family, Work, and whatever the owner makes. They
// are Android's own groups, in the account they are kept in, so other apps (and the account's
// sync) see them too; a contact joins one in its raw contact of that account. Without `id`, every
// group and a new one; with it, that group: who is in it, adding and taking out, its name.

const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error));
const PHONE: ContactAccount = { type: '', name: '' };

export default function ContactGroups() {
  const params = useLocalSearchParams<{ id?: string }>();
  const id = Number(params.id ?? 0);
  return id > 0 ? <OneGroup id={id} /> : <AllGroups />;
}

function AllGroups() {
  const styles = useStyles(makeStyles);
  const [groups, setGroups] = useState<PhoneGroup[] | null>(null);
  const [accounts, setAccounts] = useState<ContactAccount[]>([]);
  const [title, setTitle] = useState('');
  const [account, setAccount] = useState<ContactAccount>(PHONE);
  const [note, setNote] = useState('');

  const load = useCallback(() => {
    phoneGroups()
      .then((found) => setGroups(groupsByTitle(found)))
      .catch((error) => setNote(errorText(error)));
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
      contactAccounts()
        .then(setAccounts)
        .catch(() => undefined);
      const changed = onContactsEvent('onContactsChanged', load);
      return () => changed?.remove();
    }, [load]),
  );

  async function create() {
    const name = cleanLine(title, 80);
    setNote('');
    if (!name) {
      setNote(t('Give the group a name.'));
      return;
    }
    try {
      const made = await createPhoneGroup(name, account);
      setTitle('');
      router.push(`/contact-groups?id=${made}`);
    } catch (error) {
      setNote(t('The group could not be made. {error}', { error: errorText(error) }));
    }
  }

  return (
    <Page>
      <Text variant="title">{t('Groups')}</Text>
      <Text tone="muted">{t("Android's own groups of contacts, such as Family or Work. Your other apps see them too, and an account (Google) syncs its own.")}</Text>
      {groups && groups.length === 0 ? <Text tone="muted">{t('No groups yet.')}</Text> : null}
      {(groups ?? []).map((g) => (
        <Pressable key={g.id} onPress={() => router.push(`/contact-groups?id=${g.id}`)} accessibilityRole="button" style={({ pressed }) => [styles.group, pressed && styles.pressed]}>
          <View style={styles.grow}>
            <Text variant="bodyStrong">{g.title || t('Group without a name')}</Text>
            <Text variant="caption" tone="muted">
              {[plural(g.count, '{n} contact', '{n} contacts'), g.account.name].filter(Boolean).join(' · ')}
            </Text>
          </View>
          <Text tone="faint">›</Text>
        </Pressable>
      ))}

      <SectionTitle title={t('New group')} />
      <Card>
        <Field label={t('Name')}>
          <Input value={title} onChangeText={setTitle} placeholder={t('Family')} onSubmitEditing={() => void create()} />
        </Field>
        {accounts.length > 0 ? (
          <Field label={t('Kept in')} hint={t('A contact joins a group only in the account the group is kept in.')}>
            <Row wrap>
              <Chip label={t('On this phone only')} selected={account.type === ''} onPress={() => setAccount(PHONE)} />
              {accounts.map((a) => (
                <Chip key={`${a.type}\n${a.name}`} label={a.name} selected={account.type === a.type && account.name === a.name} onPress={() => setAccount(a)} />
              ))}
            </Row>
          </Field>
        ) : null}
        <Button title={t('Make the group')} onPress={() => void create()} />
      </Card>
      {note ? <Text tone="muted">{note}</Text> : null}
    </Page>
  );
}

function OneGroup({ id }: { id: number }) {
  const styles = useStyles(makeStyles);
  const { colors } = useTheme();
  const [group, setGroup] = useState<PhoneGroup | null>(null);
  const [gone, setGone] = useState(false);
  const [cards, setCards] = useState<ContactCard[]>([]);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [query, setQuery] = useState('');
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const [note, setNote] = useState('');

  const load = useCallback(() => {
    Promise.all([phoneGroups(), phoneCards()])
      .then(([groups, read]) => {
        const found = groups.find((g) => g.id === id) ?? null;
        setGroup(found);
        setGone(!found);
        setCards(read);
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

  const members = useMemo(() => cards.filter((c) => c.groups.includes(id)), [cards, id]);
  const others = useMemo(() => cards.filter((c) => !c.groups.includes(id) && matches(c, query)), [cards, id, query]);

  if (gone) {
    return (
      <Page>
        <Text tone="muted">{t('This group is no longer on the phone.')}</Text>
      </Page>
    );
  }
  if (!group) return <Page>{note ? <Text tone="muted">{note}</Text> : null}</Page>;

  async function rename() {
    const name = cleanLine(renaming ?? '', 80);
    if (!name) return;
    try {
      await renamePhoneGroup(id, name);
      setRenaming(null);
      load();
    } catch (error) {
      setNote(errorText(error));
    }
  }

  async function remove() {
    if (!group) return;
    if (!(await confirm(t('Delete group'), t('Delete the group {name}? Its contacts stay on the phone.', { name: group.title }), t('Delete')))) return;
    try {
      await deletePhoneGroup(id);
      router.back();
    } catch (error) {
      setNote(errorText(error));
    }
  }

  async function takeOut(card: ContactCard) {
    if (!card.phone) return;
    try {
      await removeFromPhoneGroup(id, card.phone.id);
      load();
    } catch (error) {
      setNote(errorText(error));
    }
  }

  async function addChosen() {
    setNote('');
    let elsewhere = 0;
    try {
      for (const card of cards.filter((c) => chosen.has(c.key))) {
        if (card.phone && !(await addToPhoneGroup(id, card.phone.id))) elsewhere++;
      }
    } catch (error) {
      setNote(errorText(error));
    }
    if (elsewhere > 0) {
      setNote(plural(elsewhere, '{n} contact could not join: it is kept in another account than this group.', '{n} contacts could not join: they are kept in another account than this group.'));
    }
    setAdding(false);
    setChosen(new Set());
    setQuery('');
    load();
  }

  const toggle = (key: string) =>
    setChosen((before) => {
      const next = new Set(before);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <Page>
      {renaming !== null ? (
        <Row>
          <Input value={renaming} onChangeText={setRenaming} autoFocus onSubmitEditing={() => void rename()} style={styles.grow} />
          <Button title={t('Save')} compact onPress={() => void rename()} />
        </Row>
      ) : (
        <Text variant="title">{group.title || t('Group without a name')}</Text>
      )}
      <Text tone="muted">{[plural(members.length, '{n} contact', '{n} contacts'), group.account.name || t('On this phone only')].join(' · ')}</Text>
      <Row wrap>
        <Button title={t('Add contacts')} compact onPress={() => setAdding(true)} />
        {!group.readOnly ? <Button title={t('Rename')} kind="secondary" compact onPress={() => setRenaming(group.title)} /> : null}
        {!group.readOnly ? <Button title={t('Delete group')} kind="danger" compact onPress={() => void remove()} /> : null}
      </Row>
      {note ? <Text tone="muted">{note}</Text> : null}
      {members.length === 0 ? <Text tone="muted">{t('No one in this group yet.')}</Text> : null}
      {members.map((card) => (
        <MemberRow key={card.key} card={card} onRemove={() => void takeOut(card)} />
      ))}

      <Sheet visible={adding} onClose={() => setAdding(false)} title={t('Add contacts')}>
        <Input value={query} onChangeText={setQuery} placeholder={t('Search contacts')} autoCorrect={false} />
        <ScrollView style={styles.picker} keyboardShouldPersistTaps="handled">
          {others.slice(0, 300).map((card) => {
            const on = chosen.has(card.key);
            return (
              <Pressable
                key={card.key}
                onPress={() => toggle(card.key)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                style={({ pressed }) => [styles.pick, (pressed || on) && styles.pressed]}
              >
                <Text style={styles.grow} numberOfLines={1}>
                  {card.name}
                </Text>
                <Text variant="bodyStrong" color={on ? colors.accentText : colors.textFaint}>
                  {on ? '✓' : '○'}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
        <Row wrap>
          <Button title={chosen.size > 0 ? plural(chosen.size, 'Add {n} contact', 'Add {n} contacts') : t('Add')} compact disabled={chosen.size === 0} onPress={() => void addChosen()} />
          <Button title={t('Cancel')} kind="secondary" compact onPress={() => setAdding(false)} />
        </Row>
      </Sheet>
    </Page>
  );
}

function MemberRow({ card, onRemove }: { card: ContactCard; onRemove: () => void }) {
  const styles = useStyles(makeStyles);
  const { colors } = useTheme();
  const photo = usePhoneContactPhoto(card.phone?.id ?? null, card.phone?.photo ?? 0);
  return (
    <View style={styles.group}>
      <Pressable onPress={() => router.push(`/contact-card?id=${card.phone?.id ?? 0}`)} accessibilityRole="button" style={[styles.grow, styles.member]}>
        <ContactFace name={card.name} uri={photo} size={40} />
        <Text style={styles.grow} numberOfLines={1}>
          {card.name}
        </Text>
      </Pressable>
      <Pressable onPress={onRemove} accessibilityRole="button" accessibilityLabel={t('Take {name} out of the group', { name: card.name })} hitSlop={6} style={styles.remove}>
        <Text variant="heading" color={colors.textMuted}>
          ×
        </Text>
      </Pressable>
    </View>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    group: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.md,
      paddingVertical: space.sm,
      paddingHorizontal: space.sm,
      marginHorizontal: -space.sm,
      borderRadius: radius.lg,
    },
    member: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.md,
    },
    grow: {
      flex: 1,
    },
    pressed: {
      backgroundColor: colors.surfacePressed,
    },
    remove: {
      width: 36,
      alignItems: 'center',
    },
    picker: {
      maxHeight: 360,
    },
    pick: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.md,
      padding: space.sm,
      borderRadius: radius.md,
    },
  });
