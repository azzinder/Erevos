import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState, type ElementRef } from 'react';
import { Pressable, View, type LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { KeyboardAwareScrollView } from '../components/keyboard';
import { Missing, type Answered } from '../components/matrix-message';
import { MicButton, RecordingLine, useVoiceCapture, VoiceClip } from '../components/matrix-voice';
import { MessageMenu, type MenuAction } from '../components/message-menu';
import { Quote } from '../components/message-parts';
import { NetworkChatNotify, useNetworkChatShown } from '../components/network-chat-notify';
import { NetworkFile } from '../components/network-file';
import { Button, Input, Page, Row, Text } from '../components/ui';
import { ask } from '../lib/alert';
import { CAN_COPY, copyText } from '../lib/clipboard';
import { voiceNamed } from '../lib/group-media';
import { t } from '../lib/i18n';
import { mimeOfName } from '../lib/matrix-media';
import { messageLine } from '../lib/message-line';
import { useNetworkWhere } from '../lib/network-place';
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
import { checkedChatNotify } from '../lock/chat-notify';
import { radius, space } from '../theme/colors';
import { useColors } from '../theme/context';

// One chat with someone on another Nostr app, or a group of them (lib/nostr-dm-store.ts): its
// messages, oldest first, and a field to write in. It is marked as not anonymous. Opening it, with
// Erevos on the screen, marks its messages read here only (NIP-17 tells the other app nothing), and
// looks up again, once a week, where they take messages and the name they gave themselves. A name
// given here shows in place of theirs; a group's name goes to all its members with the next
// message. Photos and files go encrypted to a file server (lib/nostr-files.ts); one that comes is
// fetched only when tapped. A message held down opens its menu (components/message-menu.tsx): react
// to it, answer it, copy it. An answer shows the message it is to above its words, which scrolls to
// it when tapped, and the message being answered shows over the field until sent or let go. The
// microphone beside the field records a voice message while it is held (components/matrix-voice.tsx),
// which the others play with Play: a sound with its length (a duration tag) is one. While the chat
// shows, what comes in it only sounds, and it can be muted or given a sound of its own
// (components/network-chat-notify.tsx). Opened from a hidden place's hidden chats (`hidden=1`) it is
// the chat of that place's own key (lib/network-place.ts), which has no notification settings.

/** A voice message among the files: a sound that says how long it lasts. */
const isVoice = (file: NostrDmFile): file is NostrDmFile & { duration: number } => file.type.startsWith('audio/') && !!file.duration;

/** A message in one line, for its menu, the strip over the field and the quote of an answer. */
function lineOf(message: NostrDmMessage): string {
  const file = message.file;
  if (typeof file === 'object') {
    return messageLine(isVoice(file) ? { text: '', voice: { ms: file.duration } } : { text: '', file: { kind: file.type.startsWith('image/') ? 'photo' : 'file', name: file.name ?? t('File') } });
  }
  return file ? t('File') : messageLine({ text: message.text }) || t('Message');
}

/** A recorded voice message as it is sent. */
const voiceFile = (audio: Uint8Array, ms: number): NostrOutgoingFile => ({ ...voiceNamed(audio), bytes: audio, durationMs: ms });

// Whether a message can be copied: it has words of its own.
const copyable = (message: NostrDmMessage) => CAN_COPY && !!message.text && !message.file;
// Whether it has a menu: one that did not go has nobody to answer or react to, only words to copy.
const menuable = (message: NostrDmMessage) => message.state !== 'failed' || copyable(message);

export default function NostrChatScreen() {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { key: given, hidden } = useLocalSearchParams<{ key?: string; hidden?: string }>();
  const where = useNetworkWhere(hidden === '1');
  const key = given && /^[0-9a-f]{64}$/.test(given) ? given : undefined;
  const [now, setNow] = useState(nostrDmNow(where));
  const [draft, setDraft] = useState('');
  const [note, setNote] = useState('');
  const [naming, setNaming] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  // The message the next one answers and the one whose menu is open, by their ids.
  const [replyId, setReplyId] = useState<string | null>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  // The screen's scrolling, and where the thread and each message in it begin, to scroll to one.
  const scroll = useRef<ElementRef<typeof KeyboardAwareScrollView>>(null);
  const threadAt = useRef(0);
  const placed = useRef<Record<string, number>>({});

  useEffect(() => {
    runNostrDm();
    setNow(nostrDmNow(where));
    return onNostrDmChange(() => setNow(nostrDmNow(where)));
  }, [where]);

  const state = now.state;
  const chat = key && state ? state.chats[key] : undefined;
  const count = chat?.messages.length ?? 0;
  // A hidden place's chat is not told apart on the screen: nothing of it reaches the space's notices.
  const shown = useNetworkChatShown(key && where === 'space' ? `nostr:${key}` : undefined);
  useEffect(() => {
    if (shown && key && chat?.unread) nostrDmRead(key).catch(() => undefined);
  }, [shown, key, count, chat?.unread]);
  const members = chat?.members;
  useEffect(() => {
    if (!key || !chat) return;
    for (const person of members ?? [key]) nostrDmFreshen(person);
  }, [key, !!chat, members?.join()]);

  const fail = (error: unknown) => setNote(error instanceof Error ? error.message : String(error));

  // A photo, file or voice message goes as an answer too, to the message chosen while it is still there.
  async function sendPicked(pick: () => Promise<NostrOutgoingFile | null>) {
    if (!key || sending) return;
    setNote('');
    setSending(true);
    try {
      const file = await pick();
      if (!file) return;
      const to = replyId && chat?.messages.some((m) => m.id === replyId) ? replyId : undefined;
      setReplyId(null);
      await nostrDmSendFile(key, file, to);
    } catch (error) {
      fail(error instanceof TooLargeError ? new NostrFileTooLargeError() : error);
    } finally {
      setSending(false);
    }
  }

  const voice = useVoiceCapture({ send: (audio, ms) => sendPicked(async () => voiceFile(audio, ms)), say: setNote });

  if (!state || !key || !chat) {
    return (
      <Page>
        <Text variant="title">{t('Nostr chats')}</Text>
        <Text tone="muted">{now.loaded ? t('This Nostr chat is not here any more.') : ''}</Text>
      </Page>
    );
  }

  const byId = new Map(chat.messages.map((message) => [message.id, message]));
  // One that is gone meanwhile is none: what is typed then goes as a new message.
  const answered = replyId ? byId.get(replyId) : undefined;
  const menuMessage = menuFor ? byId.get(menuFor) : undefined;

  // What is typed goes as a new message, or as an answer to the one chosen.
  function send() {
    const text = draft.trim();
    if (!text || !key) return;
    setDraft('');
    setNote('');
    setReplyId(null);
    nostrDmSend(key, text, answered?.id).catch(fail);
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
  const whoOf = (message: NostrDmMessage) => (message.mine ? t('You') : message.from ? personName(state, message.from) : name);

  // Scrolls the thread to a message, a little below the top.
  function goTo(id: string) {
    const y = placed.current[id];
    if (y !== undefined) scroll.current?.scrollTo({ y: Math.max(0, threadAt.current + y - 96), animated: true });
  }

  const react = (id: string, emoji: string) => nostrDmReact(key, id, emoji).catch(fail);

  async function copy(text: string) {
    setNote((await copyText(text)) ? t('Copied. Any app that reads the clipboard can read it now.') : t('Not copied.'));
  }

  // What can be done with a message, held down: answering is for one that went.
  function actionsOf(message: NostrDmMessage): MenuAction[] {
    const actions: MenuAction[] = [];
    if (message.state !== 'failed') actions.push({ title: t('Reply'), onPress: () => setReplyId(message.id) });
    if (copyable(message)) actions.push({ title: t('Copy'), onPress: () => void copy(message.text) });
    return actions;
  }

  // The message an answer is to, as the answer quotes it: null when it is not on this phone.
  const answeredBy = (message: NostrDmMessage): Answered | null | undefined => {
    if (!message.replyTo) return undefined;
    const to = byId.get(message.replyTo);
    return to ? { name: whoOf(to), line: lineOf(to), onPress: () => goTo(to.id) } : null;
  };

  return (
    <KeyboardAwareScrollView
      ref={scroll}
      style={{ flex: 1, backgroundColor: colors.ground }}
      // As Page (components/ui.tsx) has it, but with a hold on the scrolling.
      contentContainerStyle={{ width: '100%', maxWidth: 760, alignSelf: 'center', padding: space.xl - 4, paddingBottom: insets.bottom + space.xl, gap: space.md }}
      keyboardShouldPersistTaps="handled"
      bottomOffset={space.xl}
    >
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

      <View
        style={{ gap: space.md }}
        onLayout={(event) => {
          threadAt.current = event.nativeEvent.layout.y;
        }}
      >
        {chat.messages.map((message) => (
          <Bubble
            key={message.id}
            state={state}
            message={message}
            group={group}
            answered={answeredBy(message)}
            onRetry={() => nostrDmRetry(key, message.id).catch(fail)}
            onMenu={menuable(message) ? () => setMenuFor(message.id) : undefined}
            onLayout={(event) => {
              placed.current[message.id] = event.nativeEvent.layout.y;
            }}
          />
        ))}
      </View>

      {answered ? <Quote name={whoOf(answered)} line={lineOf(answered)} onPress={() => goTo(answered.id)} onClose={() => setReplyId(null)} /> : null}
      <Row>
        <Input style={{ flex: 1 }} value={draft} onChangeText={setDraft} multiline placeholder={t('Message')} accessibilityLabel={t('Message')} />
        <Button title={t('Send')} compact disabled={!draft.trim()} onPress={send} />
      </Row>
      <Row>
        {voice.recording ? (
          <RecordingLine />
        ) : (
          <>
            <Button title={t('Photo')} kind="secondary" compact disabled={sending} onPress={() => void sendPhoto()} />
            <Button title={t('File')} kind="secondary" compact disabled={sending} onPress={() => void sendAnyFile()} />
            {sending ? <Text tone="muted">{t('Sending…')}</Text> : <View style={{ flex: 1 }} />}
          </>
        )}
        <MicButton voice={voice} disabled={sending} />
      </Row>
      {note ? <Text tone="muted">{note}</Text> : null}
      {where === 'space' ? <NetworkChatNotify notify={checkedChatNotify(chat.notify)} onChange={(next) => nostrDmSetNotify(key, next)} /> : null}

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
              : where === 'place'
                ? t('Only in these hidden chats: they are not told. Empty, it shows the name they gave themselves.')
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
      <MessageMenu
        visible={!!menuMessage && menuable(menuMessage) && shown}
        onClose={() => setMenuFor(null)}
        line={menuMessage ? lineOf(menuMessage) : ''}
        onReact={menuMessage && menuMessage.state !== 'failed' ? (emoji) => void react(menuMessage.id, emoji) : undefined}
        actions={menuMessage ? actionsOf(menuMessage) : []}
      />
    </KeyboardAwareScrollView>
  );
}

function Bubble({ state, message, group, answered, onRetry, onMenu, onLayout }: {
  state: NostrDmState;
  message: NostrDmMessage;
  group: boolean;
  /** The message it answers, or null when that is not on this phone. */
  answered?: Answered | null;
  onRetry: () => void;
  /** Held down: its menu. */
  onMenu?: () => void;
  onLayout?: (event: LayoutChangeEvent) => void;
}) {
  const colors = useColors();
  const mine = message.mine;
  const when = new Date(message.at).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  // NIP-17 says nothing back: one tick once a relay of theirs took it, no more.
  const status = message.state === 'sending' ? t('Sending…') : message.state === 'failed' ? t('Not sent.') : `${when}${mine ? ' ✓' : ''}`;
  // Each reaction once, with how many chose it.
  const reactions = Object.values(message.reactions ?? {}).reduce<Record<string, number>>((all, emoji) => ({ ...all, [emoji]: (all[emoji] ?? 0) + 1 }), {});
  const file = typeof message.file === 'object' ? message.file : undefined;
  return (
    <Pressable
      onLongPress={onMenu}
      disabled={!onMenu}
      onLayout={onLayout}
      // One with buttons in it (Play, Save) stays apart from them for a screen reader.
      accessible={!file}
      accessibilityHint={onMenu ? t('Hold for more') : undefined}
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
      {message.replyTo ? answered ? <Quote name={answered.name} line={answered.line} onPress={answered.onPress} /> : <Missing /> : null}
      {file ? (
        isVoice(file) ? (
          <VoiceClip type={file.type} duration={file.duration} fetch={() => nostrDmFile(file)} />
        ) : (
          <NetworkFile name={file.name ?? (file.type.startsWith('image/') ? t('Photo') : t('File'))} type={file.type} size={file.size} dim={file.dim} fetch={() => nostrDmFile(file)} />
        )
      ) : message.file ? (
        <Text tone="muted">{t('A file: Erevos cannot open files sent this way yet.')}</Text>
      ) : (
        // Not selectable: holding the words opens the menu, which can copy them.
        <Text>{message.text}</Text>
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
