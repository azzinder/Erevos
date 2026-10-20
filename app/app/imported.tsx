import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Card, Chip, Field, Input, Page, Row, Text, TextButton } from '../components/ui';
import { ask } from '../lib/alert';
import { canImport } from '../lib/core';
import { plural, t } from '../lib/i18n';
import { pickFile, TooLargeError } from '../lib/pick-file';
import { mediaText, readExport, senders, shownTime, SOURCE_LABELS, toArchived, type ImportedChat } from '../lib/imports';
import { Archive, type ArchivedMessage, type ChatSummary } from '../lock/archive';
import { loadE2EData } from '../lock/e2e-data';
import { currentSpace } from '../lock/keys';
import { radius, space, type Colors } from '../theme/colors';
import { useStyles } from '../theme/context';

// Chats brought in from Telegram and WhatsApp exports (lib/imports.ts), kept sealed in this space
// (lock/archive.ts). They are only to read: Erevos cannot show who really wrote them, and they
// are never sent anywhere. One can go on in Erevos: linked to one of the space's contacts, it shows
// in the chat with them, ahead of the new messages.

type Contact = { identity: string; name: string };

const contactLabel = (identity: string, contacts: Contact[]) =>
  contacts.find((contact) => contact.identity === identity)?.name || t('contact {id}', { id: identity.slice(0, 8) });

// What the phone can hold in memory to read at once. A WhatsApp export with its media is larger.
const MAX_BYTES = 100 * 1024 * 1024;

const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error));

const day = (at: number) => shownTime(at).slice(0, 10);

export default function ImportedScreen() {
  const [archive, setArchive] = useState<Archive | null>(null);
  const [chats, setChats] = useState<ChatSummary[]>([]);
  // The space's own contacts, that an imported chat can go on with. Not its hidden chats'.
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  // What a picked file held, waiting for the owner's name in it before it is kept.
  const [found, setFound] = useState<{ chats: ImportedChat[]; people: string[] } | null>(null);
  const [me, setMe] = useState('');
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    const { space: current, key } = currentSpace();
    Archive.open('space', current, key)
      .then((opened) => {
        if (!active) return;
        setArchive(opened);
        setChats(opened.chats());
      })
      .catch((error) => active && setNote(t('Imported chats could not open. {reason}', { reason: errorText(error) })));
    loadE2EData('space', current, key)
      .then((data) => active && setContacts(data.contacts.map(({ identity, name }) => ({ identity, name }))))
      .catch(() => {
        // No contacts to go on with.
      });
    return () => {
      active = false;
    };
  }, []);

  async function pick() {
    if (!canImport()) {
      setNote(t('This build cannot read exports yet. Rebuild the app.'));
      return;
    }
    setNote('');
    try {
      const picked = await pickFile(MAX_BYTES);
      if (!picked) return;
      setBusy(true);
      const read = await readExport(picked.name, picked.bytes);
      if (read.every((chat) => chat.messages.length === 0)) {
        setNote(t('There are no messages in that file.'));
        return;
      }
      const people = senders(read);
      setFound({ chats: read, people });
      // In an export of many chats, the one who wrote the most is almost surely its owner.
      setMe(read.length > 1 ? (people[0] ?? '') : '');
      setTitle(read[0].title);
    } catch (error) {
      setNote(
        error instanceof TooLargeError ? t('That file is too large. Export the chat again without media.') : t('Not imported. {reason}', { reason: errorText(error) }),
      );
    } finally {
      setBusy(false);
    }
  }

  async function keep() {
    if (!archive || !found) return;
    setBusy(true);
    try {
      const named = found.chats.length === 1 ? [{ ...found.chats[0], title: title.trim() || found.chats[0].title }] : found.chats;
      await archive.add(toArchived(named, me));
      setChats(archive.chats());
      const count = named.reduce((sum, chat) => sum + chat.messages.length, 0);
      setNote(
        t('Imported {chats} with {messages}.', {
          chats: plural(named.length, 'one chat', '{n} chats'),
          messages: plural(count, '{n} message', '{n} messages'),
        }) +
          ' ' +
          t('Delete the export file from the phone yourself: Erevos keeps its own sealed copy.'),
      );
      setFound(null);
    } catch (error) {
      setNote(t('Not kept. {reason}', { reason: errorText(error) }));
    } finally {
      setBusy(false);
    }
  }

  function remove(chat: ChatSummary) {
    ask(t('Delete imported chat'), t('Delete “{title}” from this phone? It cannot be brought back.', { title: chat.title || SOURCE_LABELS[chat.source] }), [
      { text: t('Cancel'), style: 'cancel' },
      {
        text: t('Delete'),
        style: 'destructive',
        onPress: () => {
          archive
            ?.remove(chat.id)
            .then(() => {
              setChats(archive.chats());
              setOpen(null);
            })
            .catch((error) => setNote(errorText(error)));
        },
      },
    ]);
  }

  async function link(chat: ChatSummary, contact: string) {
    try {
      await archive?.link(chat.id, contact);
      if (archive) setChats(archive.chats());
    } catch (error) {
      setNote(errorText(error));
    }
  }

  const opened = open ? chats.find((chat) => chat.id === open) : undefined;
  if (opened && archive) {
    return (
      <ChatView
        archive={archive}
        chat={opened}
        contacts={contacts}
        onLink={(contact) => void link(opened, contact)}
        onBack={() => setOpen(null)}
        onDelete={() => remove(opened)}
      />
    );
  }

  return (
    <Page>
      <Text variant="title">{t('Imported chats')}</Text>
      <Text tone="muted">
        {t(
          'Chats brought in from Telegram or WhatsApp, to read here. They stay on this phone, sealed in this space, and are never sent anywhere. Only the words come in: photos and other files stay behind.',
        )}
      </Text>

      {found ? (
        <Card>
          <Text variant="bodyStrong">
            {found.chats.length === 1
              ? `${SOURCE_LABELS[found.chats[0].source]}: ${plural(found.chats[0].messages.length, '{n} message', '{n} messages')}`
              : `${SOURCE_LABELS[found.chats[0].source]}: ${plural(found.chats.length, '{n} chat', '{n} chats')}, ${plural(
                  found.chats.reduce((sum, chat) => sum + chat.messages.length, 0),
                  '{n} message',
                  '{n} messages',
                )}`}
          </Text>
          {found.chats.length === 1 ? (
            <Field label={t('Name of the chat')}>
              <Input value={title} onChangeText={setTitle} placeholder={t('Name')} maxLength={80} />
            </Field>
          ) : null}
          <Text variant="caption" tone="muted">
            {t('Which one is you? Your messages then show on the right.')}
          </Text>
          <Row wrap>
            {found.people.slice(0, 8).map((person) => (
              <Chip key={person} label={person} selected={me === person} onPress={() => setMe(person)} />
            ))}
            <Chip label={t('None of them')} selected={me === ''} onPress={() => setMe('')} />
          </Row>
          <Row wrap>
            <Button title={t('Keep')} compact loading={busy} onPress={() => void keep()} />
            <Button title={t('Cancel')} kind="secondary" compact onPress={() => setFound(null)} />
          </Row>
        </Card>
      ) : (
        <Button title={t('Import a file')} loading={busy} onPress={() => void pick()} />
      )}

      {note ? <Text variant="caption" style={{ fontSize: 14 }}>{note}</Text> : null}

      {chats.length === 0 && !found ? (
        <Text variant="caption" tone="muted">
          {t(
            'Nothing imported yet. In Telegram Desktop: Export chat history, format JSON, and pick result.json here. In WhatsApp: a chat, then More, Export chat, Without media, and save the file to the phone.',
          )}
        </Text>
      ) : null}

      {chats.map((chat) => (
        <Card key={chat.id}>
          <Text variant="bodyStrong">{chat.title || SOURCE_LABELS[chat.source]}</Text>
          <Text variant="caption" tone="muted">
            {SOURCE_LABELS[chat.source]}, {plural(chat.count, '{n} message', '{n} messages')}
            {chat.last ? t(', {from} to {to}', { from: day(chat.first), to: day(chat.last) }) : ''}
            {chat.contact ? t('. Goes on in Erevos with {name}.', { name: contactLabel(chat.contact, contacts) }) : ''}
          </Text>
          <Row wrap>
            <TextButton title={t('Read')} onPress={() => setOpen(chat.id)} />
            <TextButton title={t('Delete')} onPress={() => remove(chat)} />
          </Row>
        </Card>
      ))}
    </Page>
  );
}

function ChatView({ archive, chat, contacts, onLink, onBack, onDelete }: {
  archive: Archive;
  chat: ChatSummary;
  contacts: Contact[];
  onLink: (contact: string) => void;
  onBack: () => void;
  onDelete: () => void;
}) {
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const [picking, setPicking] = useState(false);
  const title = chat.title || SOURCE_LABELS[chat.source];
  const messages = useMemo(() => archive.chat(chat.id)?.messages ?? [], [archive, chat.id]);
  // Newest first, in a list drawn upside down, so it opens at the latest message.
  const newestFirst = useMemo(() => [...messages].reverse(), [messages]);
  // In a group, each message says who wrote it.
  const group = useMemo(() => new Set(messages.map((m) => m[1]).filter((name) => name && name !== chat.me)).size > 1, [messages, chat.me]);

  const render = ({ item: [at, sender, text, kinds] }: { item: ArchivedMessage }) => {
    const mine = chat.me !== '' && sender === chat.me;
    const files = mediaText(kinds);
    return (
      <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
        {group && !mine && sender ? <Text style={[styles.sender, mine ? styles.mineText : styles.theirsText]}>{sender}</Text> : null}
        {text ? <Text style={mine ? styles.mineText : styles.theirsText}>{text}</Text> : null}
        {files ? <Text style={[styles.files, mine ? styles.mineText : styles.theirsText]}>{t('{files}, not imported', { files })}</Text> : null}
        <Text style={[styles.time, mine ? styles.mineText : styles.theirsText]}>{shownTime(at)}</Text>
      </View>
    );
  };

  return (
    <View style={[styles.screen, { paddingBottom: insets.bottom + space.md }]}>
      <View style={styles.header}>
        <Text variant="title" style={styles.grow} numberOfLines={1}>
          {title}
        </Text>
        <TextButton title={t('Delete')} onPress={onDelete} />
        <TextButton title={t('All imported')} onPress={onBack} />
      </View>
      <Text variant="caption" tone="muted">
        {t('Imported from {source}, only to read. Erevos cannot show who really wrote these.', { source: SOURCE_LABELS[chat.source] })}
        {chat.skipped === 1 ? t(' One notice or call was left out.') : chat.skipped ? t(' {n} notices and calls were left out.', { n: chat.skipped }) : ''}
      </Text>
      {chat.contact ? (
        <View style={styles.section}>
          <Text variant="caption" tone="muted">
            {t('Goes on in Erevos with {name}: these messages show in that chat, ahead of the new ones, only on this phone.', {
              name: contactLabel(chat.contact, contacts),
            })}
          </Text>
          <Row wrap>
            <TextButton title={t('Open the chat')} onPress={() => router.push({ pathname: '/chat', params: { contact: chat.contact } })} />
            <TextButton title={t('Unlink')} onPress={() => onLink('')} />
          </Row>
        </View>
      ) : picking ? (
        <View style={styles.section}>
          <Text variant="caption" tone="muted">
            {contacts.length === 0
              ? t("There are no Erevos contacts in this space yet. In Chat, open Relay and add {name}'s contact link, then come back here.", { name: title })
              : t('Which Erevos contact is {name}? These messages then show in the chat with them, ahead of the new ones, only on this phone.', { name: title })}
          </Text>
          <Row wrap>
            {contacts.map((contact) => (
              <Chip
                key={contact.identity}
                label={contactLabel(contact.identity, contacts)}
                mono={!contact.name}
                selected={false}
                onPress={() => {
                  setPicking(false);
                  onLink(contact.identity);
                }}
              />
            ))}
            <TextButton title={t('Cancel')} onPress={() => setPicking(false)} />
          </Row>
        </View>
      ) : (
        <TextButton title={t('Continue in Erevos')} onPress={() => setPicking(true)} />
      )}
      <FlatList
        data={newestFirst}
        // Android's clipping of rows off the screen closed Erevos on Fabric (a row added twice).
        removeClippedSubviews={false}
        inverted
        renderItem={render}
        keyExtractor={(_, index) => String(index)}
        contentContainerStyle={styles.thread}
        initialNumToRender={30}
      />
    </View>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      padding: space.lg,
      gap: space.md,
      backgroundColor: colors.ground,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.md,
    },
    grow: {
      flex: 1,
    },
    section: {
      gap: space.sm,
    },
    thread: {
      gap: space.sm,
      paddingVertical: space.sm,
    },
    bubble: {
      maxWidth: '80%',
      paddingVertical: space.sm,
      paddingHorizontal: space.md,
      borderRadius: Math.min(radius.md, 16),
      gap: 2,
    },
    mine: {
      alignSelf: 'flex-end',
      backgroundColor: colors.primary,
    },
    theirs: {
      alignSelf: 'flex-start',
      backgroundColor: colors.surfaceAlt,
    },
    mineText: {
      fontSize: 15,
      color: colors.onPrimary,
    },
    theirsText: {
      fontSize: 15,
      color: colors.text,
    },
    sender: {
      fontSize: 13,
      fontWeight: '700',
    },
    files: {
      fontSize: 13,
      fontStyle: 'italic',
    },
    time: {
      fontSize: 11,
      opacity: 0.7,
    },
  });
