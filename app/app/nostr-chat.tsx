import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, Pressable, View } from 'react-native';

import { NetworkChatNotify, useNetworkChatShown } from '../components/network-chat-notify';
import { Button, Chip, Input, Page, Row, Text } from '../components/ui';
import { ask } from '../lib/alert';
import { fileSize } from '../lib/attachments';
import { toBase64 } from '../lib/crypto';
import { t } from '../lib/i18n';
import { mimeOfName } from '../lib/matrix-media';
import { nameOf, npubOf, personName, shortNpub, type NostrDmMessage, type NostrDmState } from '../lib/nostr-dm';
import {
  nostrDmFile,
  nostrDmForgetChat,
  nostrDmFreshen,
  nostrDmNow,
  nostrDmReact,
  nostrDmRead,
  nostrDmRename,
  nostrDmRetry,
  nostrDmSend,
  nostrDmSendFile,
  nostrDmSetNotify,
  nostrDmSetSubject,
  NostrFileTooLargeError,
  onNostrDmChange,
  runNostrDm,
  type NostrOutgoingFile,
} from '../lib/nostr-dm-store';
import { NOSTR_FILE_MOST, type NostrDmFile } from '../lib/nostr-files';
import { pickFile, TooLargeError } from '../lib/pick-file';
import { pickPhoto } from '../lib/pick-photo';
import { saveBytes } from '../lib/save-file';
import { checkedChatNotify } from '../lock/chat-notify';
import { radius, space } from '../theme/colors';
import { useColors } from '../theme/context';

// One chat with someone on another Nostr app, or a group of them (lib/nostr-dm-store.ts): its
// messages, oldest first, and a field to write in. It is marked as not anonymous. Opening it, with
// Erevos on the screen, marks its messages read here only (NIP-17 tells the other app nothing), and
// looks up again, once a week, where they take messages and the name they gave themselves. A name
// given here shows in place of theirs; a group's name goes to all its members with the next
// message. Photos and files go encrypted to a file server (lib/nostr-files.ts); one that comes is
// fetched only when tapped. A long press on a message reacts to it. While it shows, what comes in
// it only sounds, and it can be muted or given a sound of its own (components/network-chat-notify.tsx).

const REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

export default function NostrChatScreen() {
  const router = useRouter();
  const { key: given } = useLocalSearchParams<{ key?: string }>();
  const key = given && /^[0-9a-f]{64}$/.test(given) ? given : undefined;
  const [now, setNow] = useState(nostrDmNow());
  const [draft, setDraft] = useState('');
  const [note, setNote] = useState('');
  const [naming, setNaming] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  // The message a long press chose, to react to.
  const [reacting, setReacting] = useState<string | null>(null);

  useEffect(() => {
    runNostrDm();
    setNow(nostrDmNow());
    return onNostrDmChange(() => setNow(nostrDmNow()));
  }, []);

  const state = now.state;
  const chat = key && state ? state.chats[key] : undefined;
  const count = chat?.messages.length ?? 0;
  const shown = useNetworkChatShown(key ? `nostr:${key}` : undefined);
  useEffect(() => {
    if (shown && key && chat?.unread) nostrDmRead(key).catch(() => undefined);
  }, [shown, key, count, chat?.unread]);
  const members = chat?.members;
  useEffect(() => {
    if (!key || !chat) return;
    for (const person of members ?? [key]) nostrDmFreshen(person);
  }, [key, !!chat, members?.join()]);

  if (!state || !key || !chat) {
    return (
      <Page>
        <Text variant="title">{t('Nostr chats')}</Text>
        <Text tone="muted">{now.loaded ? t('This Nostr chat is not here any more.') : ''}</Text>
      </Page>
    );
  }

  const fail = (error: unknown) => setNote(error instanceof Error ? error.message : String(error));

  function send() {
    const text = draft.trim();
    if (!text || !key) return;
    setDraft('');
    setNote('');
    nostrDmSend(key, text).catch(fail);
  }

  async function sendPicked(pick: () => Promise<NostrOutgoingFile | null>) {
    if (!key || sending) return;
    setNote('');
    setSending(true);
    try {
      const file = await pick();
      if (file) await nostrDmSendFile(key, file);
    } catch (error) {
      fail(error instanceof TooLargeError ? new NostrFileTooLargeError() : error);
    } finally {
      setSending(false);
    }
  }

  const sendPhoto = () =>
    sendPicked(async () => {
      const photo = await pickPhoto('photos', 90);
      return photo ? { bytes: photo.bytes, name: photo.name, mime: photo.mime, ...(photo.w && photo.h ? { dim: `${photo.w}x${photo.h}` } : {}) } : null;
    });
  const sendAnyFile = () =>
    sendPicked(async () => {
      const picked = await pickFile(NOSTR_FILE_MOST);
      return picked ? { ...picked, mime: mimeOfName(picked.name) } : null;
    });

  const self = key === state.public;
  const group = !!members;
  const npub = npubOf(key);
  const name = self ? t('Chat with myself') : nameOf(state, key) || shortNpub(npub);
  return (
    <Page>
      <Text variant="title" numberOfLines={2}>
        {name}
      </Text>
      {group ? (
        <Text variant="caption" tone="muted">
          {t('A group with {names}', { names: members.map((member) => personName(state, member)).join(', ') })}
        </Text>
      ) : (
        <Text selectable variant="caption" tone="muted" style={{ fontFamily: 'monospace' }}>
          {npub}
        </Text>
      )}
      <Text variant="caption" tone="muted">
        {t('Nostr · encrypted (NIP-17), not anonymous')}
      </Text>

      {chat.messages.map((message) => (
        <View key={message.id} style={{ gap: space.xs }}>
          <Bubble
            state={state}
            message={message}
            group={group}
            onRetry={() => nostrDmRetry(key, message.id).catch(fail)}
            onLongPress={() => setReacting(reacting === message.id ? null : message.id)}
          />
          {reacting === message.id ? (
            <Row wrap style={{ alignSelf: message.mine ? 'flex-end' : 'flex-start' }}>
              {REACTIONS.map((emoji) => (
                <Chip
                  key={emoji}
                  label={emoji}
                  selected={message.reactions?.[state.public] === emoji}
                  onPress={() => {
                    setReacting(null);
                    nostrDmReact(key, message.id, emoji).catch(fail);
                  }}
                />
              ))}
            </Row>
          ) : null}
        </View>
      ))}

      <Row>
        <Input style={{ flex: 1 }} value={draft} onChangeText={setDraft} multiline placeholder={t('Message')} accessibilityLabel={t('Message')} />
        <Button title={t('Send')} compact disabled={!draft.trim()} onPress={send} />
      </Row>
      <Row>
        <Button title={t('Photo')} kind="secondary" compact disabled={sending} onPress={() => void sendPhoto()} />
        <Button title={t('File')} kind="secondary" compact disabled={sending} onPress={() => void sendAnyFile()} />
        {sending ? <Text tone="muted">{t('Sending…')}</Text> : null}
      </Row>
      {note ? <Text tone="muted">{note}</Text> : null}
      <NetworkChatNotify notify={checkedChatNotify(chat.notify)} onChange={(next) => nostrDmSetNotify(key, next)} />

      {self ? null : naming === null ? (
        <Button title={group ? t('Name this group') : t('Name them here')} kind="secondary" compact onPress={() => setNaming((group ? chat.subject : chat.name) ?? '')} />
      ) : (
        <View style={{ gap: space.xs }}>
          <Row>
            <Input
              style={{ flex: 1 }}
              value={naming}
              onChangeText={setNaming}
              maxLength={group ? 100 : 64}
              placeholder={group ? name : state.people[key]?.name || shortNpub(npub)}
              accessibilityLabel={group ? t('Name this group') : t('Name them here')}
            />
            <Button
              title={t('Save')}
              compact
              onPress={() =>
                void (group ? nostrDmSetSubject(key, naming) : nostrDmRename(key, naming))
                  .then(() => setNaming(null))
                  .catch(fail)
              }
            />
          </Row>
          <Text variant="caption" tone="faint">
            {group
              ? t('Everyone in the group sees it, with your next message.')
              : t('Only in this space: they are not told. Empty, it shows the name they gave themselves.')}
          </Text>
        </View>
      )}

      <Button
        title={t('Remove this chat')}
        kind="secondary"
        onPress={() =>
          ask(
            t('Remove this chat?'),
            group
              ? t('Its messages are removed from this phone. The others keep theirs, and a new message in the group starts it again.')
              : t('Its messages are removed from this phone. The other person keeps theirs, and a new message from them starts the chat again.'),
            [
              { text: t('Cancel'), style: 'cancel' },
              {
                text: t('Remove'),
                style: 'destructive',
                onPress: () =>
                  void nostrDmForgetChat(key)
                    .then(() => router.back())
                    .catch(fail),
              },
            ],
          )
        }
      />
    </Page>
  );
}

function Bubble({ state, message, group, onRetry, onLongPress }: { state: NostrDmState; message: NostrDmMessage; group: boolean; onRetry: () => void; onLongPress: () => void }) {
  const colors = useColors();
  const mine = message.mine;
  const when = new Date(message.at).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  // NIP-17 says nothing back: one tick once a relay of theirs took it, no more.
  const status = message.state === 'sending' ? t('Sending…') : message.state === 'failed' ? t('Not sent.') : `${when}${mine ? ' ✓' : ''}`;
  // Each reaction once, with how many chose it.
  const reactions = Object.values(message.reactions ?? {}).reduce<Record<string, number>>((all, emoji) => ({ ...all, [emoji]: (all[emoji] ?? 0) + 1 }), {});
  return (
    <Pressable
      onLongPress={onLongPress}
      accessibilityHint={t('Hold to react')}
      style={{
        alignSelf: mine ? 'flex-end' : 'flex-start',
        maxWidth: '85%',
        padding: space.sm + 2,
        borderRadius: radius.md,
        backgroundColor: mine ? colors.primarySoft : colors.surfaceAlt,
        gap: 2,
      }}
    >
      {group && !mine && message.from ? (
        <Text variant="caption" tone="muted" numberOfLines={1}>
          {personName(state, message.from)}
        </Text>
      ) : null}
      {typeof message.file === 'object' ? (
        <FilePart file={message.file} />
      ) : message.file ? (
        <Text tone="muted">{t('A file: Erevos cannot open files sent this way yet.')}</Text>
      ) : (
        <Text selectable>{message.text}</Text>
      )}
      {Object.keys(reactions).length ? (
        <Text variant="caption">
          {Object.entries(reactions)
            .map(([emoji, n]) => (n > 1 ? `${emoji} ${n}` : emoji))
            .join('  ')}
        </Text>
      ) : null}
      <Text variant="caption" tone="faint">
        {status}
      </Text>
      {message.state === 'failed' ? <Button title={t('Try again')} kind="secondary" compact onPress={onRetry} /> : null}
    </Pressable>
  );
}

// A photo or file in a message: fetched only when asked for, a photo then shown, any file saved.
function FilePart({ file }: { file: NostrDmFile }) {
  const [bytes, setBytes] = useState<Uint8Array | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const image = file.type.startsWith('image/');
  const name = file.name ?? (image ? t('Photo') : t('File'));

  async function get(): Promise<Uint8Array | null> {
    if (bytes) return bytes;
    setBusy(true);
    setNote('');
    try {
      const got = await nostrDmFile(file);
      setBytes(got);
      return got;
    } catch (error) {
      setNote(error instanceof Error ? error.message : t('The file could not be fetched.'));
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    const got = await get();
    if (!got) return;
    try {
      if (await saveBytes(name, file.type, got)) setNote(t('Saved.'));
    } catch (error) {
      setNote(error instanceof Error ? error.message : String(error));
    }
  }

  const [w, h] = (file.dim ?? '').split('x').map(Number);
  const ratio = w && h ? w / h : 4 / 3;
  return (
    <View style={{ gap: space.xs }}>
      {image && bytes ? (
        <Image source={{ uri: `data:${file.type};base64,${toBase64(bytes)}` }} style={{ width: 240, height: 240 / ratio, borderRadius: radius.sm }} resizeMode="contain" accessibilityLabel={name} />
      ) : (
        <Text numberOfLines={2}>
          {name}
          {file.size ? ` · ${fileSize(file.size)}` : ''}
        </Text>
      )}
      <Row>
        {image && !bytes ? <Button title={t('Show photo')} compact disabled={busy} onPress={() => void get()} /> : null}
        <Button title={t('Save')} kind="secondary" compact disabled={busy} onPress={() => void save()} />
      </Row>
      {busy ? (
        <Text variant="caption" tone="muted">
          {t('Fetching…')}
        </Text>
      ) : null}
      {note ? (
        <Text variant="caption" tone="muted">
          {note}
        </Text>
      ) : null}
    </View>
  );
}
