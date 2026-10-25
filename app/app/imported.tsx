import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Platform, Pressable, StyleSheet, View, type ViewToken } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Attachment, FileViewer, SHOWN_PHOTOS, useShownPhotos } from '../components/attachment';
import { Button, Card, Chip, Field, Input, Page, Row, Text, TextButton } from '../components/ui';
import { ask } from '../lib/alert';
import { FileTooLargeError, fileSize } from '../lib/attachments';
import { canImport } from '../lib/core';
import { plural, t } from '../lib/i18n';
import { pickSource, TooLargeError, type PickedSource } from '../lib/pick-file';
import {
  exportFiles,
  keepExportFiles,
  mediaText,
  openExport,
  senders,
  shownTime,
  SOURCE_LABELS,
  toArchived,
  type OpenedExport,
} from '../lib/imports';
import { saveFile } from '../lib/save-file';
import { Archive, type ArchivedMessage, type ChatSummary } from '../lock/archive';
import type { FileRef } from '../lock/attachment-files';
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

// What the phone can hold in memory to read at once: a file that is not a zip is read whole. A zip,
// with its photos and videos, is read a piece at a time, from a copy in the app's cache.
const MAX_BYTES = 100 * 1024 * 1024;
const MAX_ZIP = 8 * 1000 * 1000 * 1000;

const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error));

const day = (at: number) => shownTime(at).slice(0, 10);

export default function ImportedScreen() {
  const [archive, setArchive] = useState<Archive | null>(null);
  const [chats, setChats] = useState<ChatSummary[]>([]);
  // The space's own contacts, that an imported chat can go on with. Not its hidden chats'.
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  // What a picked file held, waiting for the owner's name in it before it is kept, and the file,
  // open until then, for the photos and files it holds.
  const [found, setFound] = useState<{ opened: OpenedExport; picked: PickedSource; people: string[] } | null>(null);
  const [progress, setProgress] = useState('');
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

  // The picked file's copy goes once it is kept, or let go of.
  useEffect(() => () => found?.picked.close(), [found]);

  async function pick() {
    if (!canImport()) {
      setNote(t('This build cannot read exports yet. Rebuild the app.'));
      return;
    }
    setNote('');
    setBusy(true);
    let picked: PickedSource | null = null;
    try {
      picked = await pickSource(MAX_ZIP);
      if (!picked) return;
      const opened = await openExport(picked.name, picked.source, MAX_BYTES);
      const read = opened.chats;
      if (read.every((chat) => chat.messages.length === 0)) {
        setNote(t('There are no messages in that file.'));
        picked.close();
        return;
      }
      const people = senders(read);
      setFound({ opened, picked, people });
      picked = null;
      // In an export of many chats, the one who wrote the most is almost surely its owner.
      setMe(read.length > 1 ? (people[0] ?? '') : '');
      setTitle(read[0].title);
    } catch (error) {
      picked?.close();
      setNote(
        error instanceof TooLargeError || error instanceof FileTooLargeError
          ? t('That file is too large. A chat with its photos and videos comes in as a .zip.')
          : t('Not imported. {reason}', { reason: errorText(error) }),
      );
    } finally {
      setBusy(false);
    }
  }

  async function keep() {
    if (!archive || !found) return;
    setBusy(true);
    try {
      const files = exportFiles(found.opened);
      if (files.count > 0) setProgress(t('Bringing in the files: {done} of {count}', { done: 0, count: files.count }));
      const withFiles = await keepExportFiles(found.opened, (done, count) => setProgress(t('Bringing in the files: {done} of {count}', { done, count })));
      const named = withFiles.length === 1 ? [{ ...withFiles[0], title: title.trim() || withFiles[0].title }] : withFiles;
      await archive.add(toArchived(named, me));
      setChats(archive.chats());
      const count = named.reduce((sum, chat) => sum + chat.messages.length, 0);
      setNote(
        t('Imported {chats} with {messages}.', {
          chats: plural(named.length, 'one chat', '{n} chats'),
          messages: plural(count, '{n} message', '{n} messages'),
        }) +
          (files.count > 0 ? ' ' + plural(files.count, 'One photo or file came with them.', '{n} photos and files came with them.') : '') +
          (files.tooLarge > 0 ? ' ' + plural(files.tooLarge, 'One file larger than 1 GB stayed behind.', '{n} files larger than 1 GB stayed behind.') : '') +
          ' ' +
          t('Delete the export file from the phone yourself: Erevos keeps its own sealed copy.'),
      );
      setFound(null);
    } catch (error) {
      setNote(t('Not kept. {reason}', { reason: errorText(error) }));
    } finally {
      setProgress('');
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
          'Chats brought in from Telegram or WhatsApp, to read here, with their photos, videos, voice messages and files. They stay on this phone, sealed in this space, and are never sent anywhere.',
        )}
      </Text>

      {found ? (
        <Card>
          <Text variant="bodyStrong">
            {found.opened.chats.length === 1
              ? `${SOURCE_LABELS[found.opened.chats[0].source]}: ${plural(found.opened.chats[0].messages.length, '{n} message', '{n} messages')}`
              : `${SOURCE_LABELS[found.opened.chats[0].source]}: ${plural(found.opened.chats.length, '{n} chat', '{n} chats')}, ${plural(
                  found.opened.chats.reduce((sum, chat) => sum + chat.messages.length, 0),
                  '{n} message',
                  '{n} messages',
                )}`}
          </Text>
          <FoundFiles opened={found.opened} />
          {found.opened.chats.length === 1 ? (
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
            <Button title={t('Cancel')} kind="secondary" compact disabled={busy} onPress={() => setFound(null)} />
          </Row>
          {progress ? <Text variant="caption">{progress}</Text> : null}
        </Card>
      ) : (
        <Button title={t('Import a file')} loading={busy} onPress={() => void pick()} />
      )}

      {note ? <Text variant="caption" style={{ fontSize: 14 }}>{note}</Text> : null}

      {chats.length === 0 && !found ? (
        <Text variant="caption" tone="muted">
          {t(
            'Nothing imported yet. In WhatsApp: a chat, then More, Export chat, Include media, and save the .zip to the phone. In Telegram Desktop: Export chat history, format JSON, with photos, videos, voice messages and files, then make a .zip of the folder it made and copy it to the phone.',
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

// What of the chats' photos and files the picked export holds, and what stays behind.
function FoundFiles({ opened }: { opened: OpenedExport }) {
  const files = exportFiles(opened);
  const named = opened.chats.reduce((sum, chat) => sum + chat.messages.reduce((n, m) => n + m.attachments.length, 0), 0);
  if (named === 0) return null;
  return (
    <Text variant="caption" tone="muted">
      {files.count > 0
        ? plural(files.count, 'With one photo or file, {size}, kept sealed here too.', 'With {n} photos and files, {size} in all, kept sealed here too.', {
            size: fileSize(files.bytes),
          })
        : t('The photos and files are not in this file, so only their kind shows. A .zip exported with media brings them too.')}
      {files.tooLarge > 0 ? ' ' + plural(files.tooLarge, 'One file larger than 1 GB stays behind.', '{n} files larger than 1 GB stay behind.') : ''}
    </Text>
  );
}

// A message counts as on the screen once a tenth of it shows; at most this many of their photos are read.
const SEEN = { itemVisiblePercentThreshold: 10 };
const SEEN_PHOTOS = Platform.OS === 'web' ? 60 : 12;

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
  const [viewing, setViewing] = useState<FileRef | null>(null);
  const [note, setNote] = useState('');
  const title = chat.title || SOURCE_LABELS[chat.source];
  const messages = useMemo(() => archive.chat(chat.id)?.messages ?? [], [archive, chat.id]);
  // Newest first, in a list drawn upside down, so it opens at the latest message.
  const newestFirst = useMemo(() => [...messages].reverse(), [messages]);
  // In a group, each message says who wrote it.
  const group = useMemo(() => new Set(messages.map((m) => m[1]).filter((name) => name && name !== chat.me)).size > 1, [messages, chat.me]);
  // The photos of the messages on the screen, read as the list is scrolled, so they show as they were.
  const [seenPhotos, setSeenPhotos] = useState<FileRef[]>([]);
  const onSeen = useRef(({ viewableItems }: { viewableItems: ViewToken<ArchivedMessage>[] }) => {
    const files = viewableItems.flatMap(({ item }) => (item[4] ?? []).filter((file) => file.kind === 'photo')).slice(0, SEEN_PHOTOS);
    setSeenPhotos((now) => (now.map((file) => file.id).join() === files.map((file) => file.id).join() ? now : files));
  }).current;
  // The photos shown: the latest, those on the screen, and the one looked at on its own.
  const shownPhotos = useMemo(() => {
    const latest = newestFirst
      .flatMap(([, , , , files = []]) => files)
      .filter((file) => file.kind === 'photo')
      .slice(0, SHOWN_PHOTOS);
    return [...latest, ...seenPhotos.filter((file) => !latest.some((one) => one.id === file.id))];
  }, [newestFirst, seenPhotos]);
  const photos = useShownPhotos(viewing?.kind === 'photo' ? [...shownPhotos, viewing] : shownPhotos, (error) =>
    setNote(t('Cannot show the photo. {error}', { error: errorText(error) })),
  );

  async function save(file: FileRef, choose: boolean) {
    try {
      const where = await saveFile(file, choose);
      if (!where) return;
      setViewing(null);
      setNote(t('Saved in {where}. There it is outside Erevos, not sealed.', { where }));
    } catch (error) {
      setViewing(null);
      setNote(t('Not saved. {error}', { error: errorText(error) }));
    }
  }

  const render = ({ item: [at, sender, text, kinds, kept = []] }: { item: ArchivedMessage }) => {
    const mine = chat.me !== '' && sender === chat.me;
    const files = mediaText(kinds);
    const ink = mine ? styles.mineText : styles.theirsText;
    return (
      <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
        {group && !mine && sender ? <Text style={[styles.sender, ink]}>{sender}</Text> : null}
        {kept.map((file, i) => (
          <Pressable key={`${file.id}-${i}`} onPress={() => setViewing(file)} accessibilityRole="button">
            <Attachment file={file} uri={photos[file.id]} ink={ink} />
          </Pressable>
        ))}
        {text ? <Text style={ink}>{text}</Text> : null}
        {files ? <Text style={[styles.files, ink]}>{t('{files}, not imported', { files })}</Text> : null}
        <Text style={[styles.time, ink]}>{shownTime(at)}</Text>
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
      {note ? <Text variant="caption">{note}</Text> : null}
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
        onViewableItemsChanged={onSeen}
        viewabilityConfig={SEEN}
        keyExtractor={(_, index) => String(index)}
        contentContainerStyle={styles.thread}
        initialNumToRender={30}
      />
      <FileViewer
        file={viewing}
        uri={viewing ? photos[viewing.id] : undefined}
        onSave={(choose) => viewing && void save(viewing, choose)}
        onClose={() => setViewing(null)}
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
