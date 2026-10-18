import { router } from 'expo-router';
import { useEffect, useState } from 'react';

import { ContactPicker, groupableContacts, type Pick } from '../components/contact-picker';
import { Button, Card, Field, Input, Page, Text } from '../components/ui';
import { canGroup } from '../lib/core';
import { MAX_GROUP_NAME } from '../lib/group-signal';
import { spaceGroups, spaceGroupTransport } from '../lib/space-groups';
import { useTheme } from '../theme/context';

// A new group: its name, and the contacts asked to join. Whoever makes it is its admin
// (lib/groups.ts); each contact's phone joins by itself once it answers.
export default function NewGroup() {
  const { colors } = useTheme();
  const [name, setName] = useState('');
  const [contacts, setContacts] = useState<Pick[] | null>(null);
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');

  useEffect(() => {
    groupableContacts().then(setContacts, () => setContacts([]));
  }, []);

  if (!canGroup()) {
    return (
      <Page>
        <Text variant="title">New group</Text>
        <Text tone="muted">This build of Erevos has no group chats yet. Update it to make one.</Text>
      </Page>
    );
  }

  function toggle(identity: string) {
    setChosen((before) => {
      const next = new Set(before);
      if (next.has(identity)) next.delete(identity);
      else next.add(identity);
      return next;
    });
  }

  async function make() {
    setBusy(true);
    setNote('');
    try {
      const groups = await spaceGroups();
      const id = await groups.create(name, [...chosen], spaceGroupTransport);
      router.replace(`/group?id=${id}`);
    } catch (error) {
      setNote(error instanceof Error ? error.message : String(error));
      setBusy(false);
    }
  }

  return (
    <Page>
      <Text variant="title">New group</Text>
      <Field label="Name" hint="Every member sees it.">
        <Input value={name} onChangeText={setName} placeholder="Group name" maxLength={MAX_GROUP_NAME} autoFocus />
      </Field>
      <Card>
        <Text variant="bodyStrong">Who to ask</Text>
        {contacts === null ? null : contacts.length === 0 ? (
          <Text tone="muted">No contacts yet. Add someone in a chat first, then make a group with them.</Text>
        ) : (
          <ContactPicker contacts={contacts} chosen={chosen} onToggle={toggle} />
        )}
      </Card>
      <Text variant="caption" tone="muted">
        You are the group&apos;s admin: you add and take out members. Each contact&apos;s phone joins by itself the next time
        Erevos is open there. Messages are end-to-end encrypted for the whole group (MLS), and no relay learns who is in it.
      </Text>
      {note ? <Text color={colors.danger}>{note}</Text> : null}
      <Button title="Make the group" onPress={make} disabled={busy || !name.trim()} loading={busy} />
    </Page>
  );
}
