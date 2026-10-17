import { File } from 'expo-file-system';
import { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Card, Chip, Field, Input, Page, Row, Text, TextButton } from '../components/ui';
import { canImport } from '../lib/core';
import { fileName, readExport, senders, toArchived, type ImportedChat } from '../lib/imports';
import { Archive, type ArchivedMessage, type ChatSummary, type Source } from '../lock/archive';
import { currentSpace } from '../lock/keys';
import { radius, space, type Colors } from '../theme/colors';
import { useStyles } from '../theme/context';

// Chats brought in from Telegram and WhatsApp exports (lib/imports.ts), kept sealed in this space
// (lock/archive.ts). They are only to read: Erevos cannot show who really wrote them, so they
// never mix with its own chats and are never sent anywhere.

const SOURCE_LABELS: Record<Source, string> = { telegram: 'Telegram', whatsapp: 'WhatsApp', viber: 'Viber' };
const MEDIA_LABELS: Record<string, string> = { photo: 'Photo', video: 'Video', voice: 'Voice message', sticker: 'Sticker', file: 'File' };
// What the phone can hold in memory to read at once. A WhatsApp export with its media is larger.
const MAX_BYTES = 100 * 1024 * 1024;

const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error));

const pad = (n: number) => String(n).padStart(2, '0');
function when(at: number): string {
  if (!at) return '';
  const d = new Date(at);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const day = (at: number) => (at && Number.isFinite(at) ? when(at).slice(0, 10) : '');

function media(kinds: string): string {
  return kinds
    .split(',')
    .filter(Boolean)
    .map((kind) => MEDIA_LABELS[kind] ?? 'File')
    .join(', ');
}

export default function ImportedScreen() {
  const [archive, setArchive] = useState<Archive | null>(null);
  const [chats, setChats] = useState<ChatSummary[]>([]);
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
      .catch((error) => active && setNote(`Imported chats could not open. ${errorText(error)}`));
    return () => {
      active = false;
    };
  }, []);

  async function pick() {
    if (!canImport()) {
      setNote('This build cannot read exports yet. Rebuild the app.');
      return;
    }
    setNote('');
    try {
      const picked = await File.pickFileAsync({ mimeTypes: ['*/*'] });
      if (picked.canceled) return;
      setBusy(true);
      const file = picked.result;
      if (file.size > MAX_BYTES) {
        setNote('That file is too large. Export the chat again without media.');
        return;
      }
      const read = await readExport(fileName(file.uri), await file.bytes());
      if (read.every((chat) => chat.messages.length === 0)) {
        setNote('There are no messages in that file.');
        return;
      }
      const people = senders(read);
      setFound({ chats: read, people });
      // In an export of many chats, the one who wrote the most is almost surely its owner.
      setMe(read.length > 1 ? (people[0] ?? '') : '');
      setTitle(read[0].title);
    } catch (error) {
      setNote(`Not imported. ${errorText(error)}`);
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
        `Imported ${named.length === 1 ? 'one chat' : `${named.length} chats`} with ${count} messages. ` +
          'Delete the export file from the phone yourself: Erevos keeps its own sealed copy.',
      );
      setFound(null);
    } catch (error) {
      setNote(`Not kept. ${errorText(error)}`);
    } finally {
      setBusy(false);
    }
  }

  function remove(chat: ChatSummary) {
    Alert.alert('Delete imported chat', `Delete "${chat.title || SOURCE_LABELS[chat.source]}" from this phone? It cannot be brought back.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
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

  const opened = open ? chats.find((chat) => chat.id === open) : undefined;
  if (opened && archive) {
    return <ChatView archive={archive} chat={opened} onBack={() => setOpen(null)} onDelete={() => remove(opened)} />;
  }

  return (
    <Page>
      <Text variant="title">Imported chats</Text>
      <Text tone="muted">
        Chats brought in from Telegram or WhatsApp, to read here. They stay on this phone, sealed in this space, and are
        never sent anywhere. Only the words come in: photos and other files stay behind.
      </Text>

      {found ? (
        <Card>
          <Text variant="bodyStrong">
            {found.chats.length === 1
              ? `${SOURCE_LABELS[found.chats[0].source]}: ${found.chats[0].messages.length} messages`
              : `${SOURCE_LABELS[found.chats[0].source]}: ${found.chats.length} chats, ${found.chats.reduce((sum, chat) => sum + chat.messages.length, 0)} messages`}
          </Text>
          {found.chats.length === 1 ? (
            <Field label="Name of the chat">
              <Input value={title} onChangeText={setTitle} placeholder="Name" maxLength={80} />
            </Field>
          ) : null}
          <Text variant="caption" tone="muted">
            Which one is you? Your messages then show on the right.
          </Text>
          <Row wrap>
            {found.people.slice(0, 8).map((person) => (
              <Chip key={person} label={person} selected={me === person} onPress={() => setMe(person)} />
            ))}
            <Chip label="None of them" selected={me === ''} onPress={() => setMe('')} />
          </Row>
          <Row wrap>
            <Button title="Keep" compact loading={busy} onPress={() => void keep()} />
            <Button title="Cancel" kind="secondary" compact onPress={() => setFound(null)} />
          </Row>
        </Card>
      ) : (
        <Button title="Import a file" loading={busy} onPress={() => void pick()} />
      )}

      {note ? <Text variant="caption" style={{ fontSize: 14 }}>{note}</Text> : null}

      {chats.length === 0 && !found ? (
        <Text variant="caption" tone="muted">
          Nothing imported yet. In Telegram Desktop: Export chat history, format JSON, and pick result.json here. In
          WhatsApp: a chat, then More, Export chat, Without media, and save the file to the phone.
        </Text>
      ) : null}

      {chats.map((chat) => (
        <Card key={chat.id}>
          <Text variant="bodyStrong">{chat.title || SOURCE_LABELS[chat.source]}</Text>
          <Text variant="caption" tone="muted">
            {SOURCE_LABELS[chat.source]}, {chat.count} messages
            {chat.last ? `, ${day(chat.first)} to ${day(chat.last)}` : ''}
          </Text>
          <Row wrap>
            <TextButton title="Read" onPress={() => setOpen(chat.id)} />
            <TextButton title="Delete" onPress={() => remove(chat)} />
          </Row>
        </Card>
      ))}
    </Page>
  );
}

function ChatView({ archive, chat, onBack, onDelete }: { archive: Archive; chat: ChatSummary; onBack: () => void; onDelete: () => void }) {
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const messages = useMemo(() => archive.chat(chat.id)?.messages ?? [], [archive, chat.id]);
  // Newest first, in a list drawn upside down, so it opens at the latest message.
  const newestFirst = useMemo(() => [...messages].reverse(), [messages]);
  // In a group, each message says who wrote it.
  const group = useMemo(() => new Set(messages.map((m) => m[1]).filter((name) => name && name !== chat.me)).size > 1, [messages, chat.me]);

  const render = ({ item: [at, sender, text, kinds] }: { item: ArchivedMessage }) => {
    const mine = chat.me !== '' && sender === chat.me;
    const files = media(kinds);
    return (
      <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
        {group && !mine && sender ? <Text style={[styles.sender, mine ? styles.mineText : styles.theirsText]}>{sender}</Text> : null}
        {text ? <Text style={mine ? styles.mineText : styles.theirsText}>{text}</Text> : null}
        {files ? <Text style={[styles.files, mine ? styles.mineText : styles.theirsText]}>{`${files}, not imported`}</Text> : null}
        <Text style={[styles.time, mine ? styles.mineText : styles.theirsText]}>{when(at)}</Text>
      </View>
    );
  };

  return (
    <View style={[styles.screen, { paddingBottom: insets.bottom + space.md }]}>
      <View style={styles.header}>
        <Text variant="title" style={styles.grow} numberOfLines={1}>
          {chat.title || SOURCE_LABELS[chat.source]}
        </Text>
        <TextButton title="Delete" onPress={onDelete} />
        <TextButton title="All imported" onPress={onBack} />
      </View>
      <Text variant="caption" tone="muted">
        Imported from {SOURCE_LABELS[chat.source]}, only to read. Erevos cannot show who really wrote these.
        {chat.skipped === 1 ? ' One notice or call was left out.' : chat.skipped ? ` ${chat.skipped} notices and calls were left out.` : ''}
      </Text>
      <FlatList
        data={newestFirst}
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
