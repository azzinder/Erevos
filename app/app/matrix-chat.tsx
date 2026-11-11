// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { KeyboardAwareScrollView } from '../components/keyboard';
import { MatrixRoomInfo } from '../components/matrix-members';
import { MatrixBubble, lineOf, type Answered } from '../components/matrix-message';
import { MatrixStickers } from '../components/matrix-stickers';
import { MatrixVerifyCard } from '../components/matrix-verify-card';
import { MicButton, RecordingLine, useVoiceCapture } from '../components/matrix-voice';
import { MessageMenu, type MenuAction } from '../components/message-menu';
import { Pinned, Quote } from '../components/message-parts';
import { ChatLookSheet, ChatScreen } from '../components/chat-look';
import { ChatHistory, HistoryButtons, useHistoryTools } from '../components/chat-history';
import { hiddenOnScreen, NetworkChatNotify, useNetworkChatShown } from '../components/network-chat-notify';
import { CarryButtons, useNetworkAmong, usePhotoQuality } from '../components/network-carry';
import { useNetworkThread } from '../components/network-thread';
import { PlaceSheet } from '../components/place-sheet';
import { PollSheet } from '../components/poll';
import { useSayTyping } from '../components/say-typing';
import { SelectBar, selectAction, useSelection } from '../components/select-bar';
import { PhoneSign, ShortcutTile, VideoSign } from '../components/shortcut-tile';
import { Button, Chip, Input, Page, Row, Sheet, Text } from '../components/ui';
import { WhoRead } from '../components/who-read';
import { ask, confirm } from '../lib/alert';
import { callPermissions } from '../lib/call-permissions';
import { matrixHistory } from '../lib/chat-history-adapters';
import { choose as chooseOption, type Place, type Poll } from '../lib/chat-parts';
import { CAN_COPY, copyText } from '../lib/clipboard';
import { canElementCall } from '../lib/element-call-window';
import { voiceNamed } from '../lib/group-media';
import { plural, t } from '../lib/i18n';
import { firstLink, fitPreview } from '../lib/link-preview';
import { CAN_PREVIEW, makePreview } from '../lib/make-preview';
import { mentionsIn, namesFor, typingMention, withMention, type Nameable } from '../lib/mentions';
import { directOther, isMatrixId, MATRIX_TYPING_SHOWS, matrixPresence, matrixTyping, onMatrixTyping, readByAll, readersOf, type MatrixMessage } from '../lib/matrix';
import { presenceText } from '../lib/net-presence';
import { startMatrixCall } from '../lib/matrix-calls';
import { pollOver, pollShown } from '../lib/matrix-parts';
import { mayRedactOthers } from '../lib/matrix-power';
import { canMatrixVoip, startMatrixVoip } from '../lib/matrix-voip';
import { MATRIX_MOST, MatrixFileTooLargeError, mimeOfName, type OutgoingFile } from '../lib/matrix-media';
import {
  matrixChange,
  matrixDelete,
  matrixDeleteMany,
  matrixEndPoll,
  matrixForward,
  matrixInvite,
  matrixLearnRule,
  matrixLeave,
  matrixLoadEarlier,
  matrixLocation,
  matrixNow,
  matrixPin,
  matrixPoll,
  matrixRead,
  matrixReact,
  matrixReply,
  matrixSend,
  matrixSendFile,
  matrixSendInThread,
  matrixSendSticker,
  matrixSetLook,
  matrixSetNotify,
  matrixStickerPlace,
  matrixTyped,
  matrixVerifications,
  matrixVerify,
  matrixVote,
  onMatrixChange,
  runMatrix,
} from '../lib/matrix-store';
import { isVerified } from '../lib/matrix-verify';
import { cardFile } from '../lib/message-carry';
import { useNetworkWhere, whereParams } from '../lib/network-place';
import { pickFile, TooLargeError } from '../lib/pick-file';
import { pickPhoto } from '../lib/pick-photo';
import { pickVideo } from '../lib/pick-video';
import { throughTor } from '../lib/relay';
import { useSharedFiles, useSharedWords } from '../lib/shared-here';
import { rtc } from '../lib/webrtc';
import { loadCurrentSpaceData } from '../lock/space-data';
import { checkedChatNotify } from '../lock/chat-notify';
import { space } from '../theme/colors';
import type { ChatLook } from '../theme/chat-theme';
import { useColors } from '../theme/context';
import { checkedLook } from '../theme/look';

// One Matrix chat (lib/matrix-store.ts): its messages, oldest first, and a field to write in.
// It is marked as not anonymous, and as not encrypted when the room is not. Opening it, with Erevos
// on the screen, marks its messages read on the homeserver; while it shows, what comes in it only
// sounds, and it can be muted or given a sound of its own (components/network-chat-notify.tsx). Photos and files go encrypted when the room is
// (lib/matrix-media.ts); a photo is fetched only when tapped, so the homeserver does not learn
// which were looked at merely by scrolling. Its call buttons open Element Call (lib/matrix-calls.ts),
// where Erevos has it. Opened from a hidden place's hidden chats (`hidden=1`) it is the chat of
// that place's own account (lib/network-place.ts), whose calls are that account's, and has no
// notification settings, as a place's chats tell nothing outside the hidden chats.
//
// A message held down opens its menu (components/message-menu.tsx): react to it, answer it, copy
// it, and for one of ours change it or delete it for everyone. An answer shows the message it is to
// above its words, which scrolls to it when tapped; a message changed says so, and one taken back
// is only marked as such. The reactions are under it, tapped to react the same or take ours back.
// A room with older messages on the homeserver offers them at the top, and the thread stays where
// it was when they come. The microphone beside the field records a voice message while it is held
// (components/matrix-voice.tsx), which the others play with Play. Who writes in it now, as the
// homeserver says, shows under the thread; we are said to write only when the account says so
// (components/say-typing.tsx). In a group, typing @ offers
// its members whose names start so (lib/mentions.ts), and a message names those written whole
// (m.mentions), so their apps tell them of it as Element does.
//
// A message held down can also be pinned to the top of the room (the bar over the thread goes to it
// when tapped), sent on to another chat, and answered in a thread (`thread` is the first message's
// ID: the screen then shows that thread alone, and what is written goes into it). A poll is voted
// on in its bubble and ended by its maker; a place goes once, as Element sends one. When this
// phone makes link previews (Settings, as for contacts), the first link in words typed goes with
// its preview, never through Tor and never in a hidden place. In a chat of two, the call buttons
// offer Element Call or the older call FluffyChat and Nheko make (lib/matrix-voip.ts).
//
// Ours are marked ✓ once the homeserver took them and ✓✓✓ once every other member read them, as
// their apps say (m.receipt, lib/matrix.ts readersOf); held down, Who read it lists who did, when.
// Matrix says nothing of what reached a phone, so there is no ✓✓.
//
// Select, in a message's menu, chooses several messages (components/select-bar.tsx) to copy their
// words, forward them, or delete them for everyone: ours, and others' too where our level in the
// room lets us take them back (lib/matrix-power.ts), as the homeserver allows the same; Matrix keeps
// nothing hidden on one phone only, so others' stay otherwise. Stickers, Erevos's own as their
// picture and those made from photos, go as Matrix's stickers (components/matrix-stickers.tsx). In
// a group, Members opens its sheet (components/matrix-members.tsx): who is in it and what they
// are, its name and what it is about, and what our level lets us do there; what it is about shows
// under its name.
//
// Words go as typed, and beside them, when their marks change their look (*bold*, _italic_…),
// their HTML (lib/matrix-html.ts), as Element sends it; what comes shows so too. Camera, Video,
// Contact card (a .vcf file) and how photos go sit by Location (components/network-carry.tsx).

// The most members Who read it names as not having read one of ours yet.
const MOST_SHOWN = 100;

const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error));

/** A recorded voice message as it is sent: the phone's AAC, or what the browser records in the web app and on a computer, with its waveform. */
function voiceFile(audio: Uint8Array, ms: number, waveform: number[]): OutgoingFile {
  return { ...voiceNamed(audio), bytes: audio, voice: { durationMs: ms, waveform } };
}

// Whether a message can be copied: it has words of its own.
const copyable = (message: MatrixMessage) => CAN_COPY && !!message.text && !message.file && !message.locked && !message.call;
// Whether it has a menu: not one taken back or a call's line, and one that still goes, or did not,
// has no ID on the homeserver yet, so nothing can be done with it but copy its words.
const menuable = (message: MatrixMessage) => !message.deleted && !message.call && (!message.state || copyable(message));
// Whether it can be chosen with others: one on the homeserver, not taken back nor a call's line.
const choosable = (message: MatrixMessage) => !message.deleted && !message.call && !message.state;

/** A Matrix chat's screen, in the room's own look or the space's (components/chat-look.tsx). */
export default function MatrixChatScreen() {
  const [look, setLook] = useState<ChatLook | null>(null);
  return (
    <ChatScreen chat={look} header>
      <MatrixChat onLook={setLook} />
    </ChatScreen>
  );
}

function MatrixChat({ onLook }: { onLook: (chat: ChatLook | null) => void }) {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { room: roomId, hidden, thread } = useLocalSearchParams<{ room?: string; hidden?: string; thread?: string }>();
  const where = useNetworkWhere(hidden === '1');
  const [now, setNow] = useState(matrixNow(where));
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  // The message the next one answers or gives new words, and the one whose menu is open, by their IDs.
  const [replyId, setReplyId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [earlier, setEarlier] = useState(false);
  // The sheets for a poll and a place, the message being sent on, whether this phone makes previews,
  // which pinned message the bar shows, and the one lit after going to it.
  const [polling, setPolling] = useState(false);
  const [placing, setPlacing] = useState(false);
  // The messages being sent on, in the thread's order.
  const [forwarding, setForwarding] = useState<string[] | null>(null);
  // The sheets of stickers, and of the group's members.
  const [stickering, setStickering] = useState(false);
  const [info, setInfo] = useState(false);
  const selection = useSelection<string>();
  // One of ours whose readers are shown, by its ID.
  const [readersFor, setReadersFor] = useState<string | null>(null);
  const [previews, setPreviews] = useState(false);
  const [pinShown, setPinShown] = useState(0);
  const [lit, setLit] = useState<string | null>(null);
  // Whether the room's own look shows its choices (components/chat-look.tsx).
  const [styling, setStyling] = useState(false);
  // Search in this chat, its media, Go to a day and Export chat (components/chat-history.tsx).
  const history = useHistoryTools();
  // Counts the changes of who writes, and the end of what was last said, so the line under the thread follows.
  const [, setTyped] = useState(0);
  // How far the screen is scrolled and how tall it is, to keep what is in view where it is when
  // older messages come in above (`keepAt`: how tall it was, with how many messages).
  const scrolled = useRef({ y: 0, height: 0 });
  const keepAt = useRef<{ height: number; count: number } | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const off = onMatrixTyping(() => {
      setTyped((n) => n + 1);
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => setTyped((n) => n + 1), MATRIX_TYPING_SHOWS + 100);
    });
    return () => {
      off();
      if (timer) clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (where !== 'space') return;
    loadCurrentSpaceData().then((data) => setPreviews(data.previews), () => setPreviews(false));
  }, [where]);

  useEffect(() => {
    if (!lit) return;
    const timer = setTimeout(() => setLit(null), 1600);
    return () => clearTimeout(timer);
  }, [lit]);

  useEffect(() => {
    runMatrix();
    setNow(matrixNow(where));
    return onMatrixChange(() => setNow(matrixNow(where)));
  }, [where]);

  // Back ends the choosing first.
  useEffect(() => {
    if (!selection.on) return;
    const held = BackHandler.addEventListener('hardwareBackPress', () => {
      selection.clear();
      return true;
    });
    return () => held.remove();
  }, [selection.on, selection.clear]);

  const state = now.state;
  const room = roomId && state ? state.rooms[roomId] : undefined;
  // The room's own look, told to the screen that draws it.
  const ownLook = useMemo(() => (room?.look ? checkedLook(room.look) : null), [room?.look]);
  const lookChat = useMemo<ChatLook | null>(() => (roomId ? { look: ownLook, save: (look) => matrixSetLook(roomId, look) } : null), [ownLook, roomId]);
  useEffect(() => onLook(lookChat), [onLook, lookChat]);
  // The room's thread holds what is not in a thread; a thread's own screen, its first message and what is in it.
  const shownMessages = room ? room.messages.filter((m) => (thread ? m.id === thread || m.thread === thread : !m.thread)) : [];
  const count = shownMessages.length;
  const counted = useRef(count);
  counted.current = count;
  // The thread opens at its last message, with the arrows to its start, to where it was left and to its
  // end (components/network-thread.tsx); older messages coming in above hold it.
  const { scroll, scrollProps, threadProps, endProps, place, goTo, withArrows } = useNetworkThread({
    list: shownMessages,
    idOf: (message) => message.id,
    mine: (message) => message.sender === state?.userId,
    // A thread's own screen has no place where it was left: the room's count is of the room.
    unread: thread ? 0 : (room?.unread ?? 0),
    held: () => keepAt.current !== null,
  });
  // A hidden place's chat is not told apart on the screen: nothing of it reaches the space's notices.
  const shown = useNetworkChatShown(!roomId ? undefined : where === 'space' ? `matrix:${roomId}` : hiddenOnScreen());
  useEffect(() => {
    if (shown && roomId && room?.unread) matrixRead(roomId).catch(() => undefined);
  }, [shown, roomId, count, room?.unread]);

  // Who may do what in it, once, for a room kept from before this phone kept that.
  const needsRule = !!room && !room.invitedBy && !room.power && !room.creators;
  useEffect(() => {
    if (needsRule && roomId) matrixLearnRule(roomId).catch(() => undefined);
  }, [needsRule, roomId]);

  const fail = (error: unknown) => setNote(errorText(error));

  async function sendPicked(pick: () => Promise<OutgoingFile | null>) {
    if (!roomId || sending) return;
    setNote('');
    setSending(true);
    try {
      const file = await pick();
      if (file) await matrixSendFile(roomId, file);
    } catch (error) {
      fail(error instanceof TooLargeError ? new MatrixFileTooLargeError() : error);
    } finally {
      setSending(false);
    }
  }

  const voice = useVoiceCapture({ send: (audio, ms, waveform) => sendPicked(async () => voiceFile(audio, ms, waveform)), say: setNote });
  // How photos go, and whose contacts a contact card is chosen from (components/network-carry.tsx).
  const photos = usePhotoQuality();
  const among = useNetworkAmong(where);
  // Tells the room we write, only when the account says so (app/matrix.tsx).
  const sayTyping = useSayTyping(!!state?.sayTyping && !!room && !room.invitedBy, (typing) => roomId && matrixTyped(roomId, typing));
  // What Send to handed this chat (app/share.tsx): its words in the message field until sent, a photo or file sent at once.
  const sharedTo = hidden === '1' || !roomId ? null : `matrix:${roomId}`;
  const sharedText = useSharedWords(sharedTo);
  const sharedWords = useRef(sharedText);
  useSharedFiles(room ? sharedTo : null, (file) => matrixSendFile(roomId ?? '', file), fail, setSending);

  if (!state || !room || !roomId) {
    return (
      <Page>
        <Text variant="title">Matrix</Text>
        <Text tone="muted">{now.loaded ? t('This Matrix chat is not here any more.') : ''}</Text>
      </Page>
    );
  }

  const me = state.userId;
  const byId = new Map(room.messages.map((message) => [message.id, message]));
  // One that is gone or taken back meanwhile is none: what is typed then goes as a new message.
  const replying = replyId ? byId.get(replyId) : undefined;
  const answered = replying && !replying.deleted ? replying : undefined;
  const editing = editId ? byId.get(editId) : undefined;
  const changed = editing && !editing.deleted && !editing.state ? editing : undefined;
  const menuMessage = menuFor ? byId.get(menuFor) : undefined;
  const nameOf = (message: MatrixMessage) => (message.sender === me ? t('You') : room.members[message.sender]?.name || message.sender);

  // A chat with one person can check their devices by emoji; the latest check in it shows.
  const other = room.direct ? Object.keys(room.members).find((who) => who !== me) : undefined;
  const check = matrixVerifications(where).find((v) => v.roomId === roomId);
  const writing = matrixTyping(state, roomId);
  // Whether the one person of the chat is online, as their homeserver says (when it says).
  const presence = thread ? '' : (() => {
    const one = directOther(state, room);
    return one ? presenceText(matrixPresence(state, one)) : '';
  })();

  const stopEditing = () => setEditId(null);
  // Whose stickers made from photos this chat sends: the account's space's, or its hidden place's.
  const stickerPlace = matrixStickerPlace(where);

  // What is typed goes as a new message, as an answer to the one chosen, or as the new words of the
  // one being changed. Says whether the words were taken, so the field empties; a change empties it
  // once it went.
  // The others in a group, as @ offers them: by the name they have there, or their ID's own part.
  const nameable: Nameable[] = room.direct
    ? []
    : Object.entries(room.members)
        .filter(([who, m]) => who !== me && m.membership === 'join')
        .map(([who, m]) => ({ identity: who, name: m.name || who.slice(1, who.indexOf(':')) }));

  function send(text: string): boolean {
    if (!roomId) return false;
    setNote('');
    if (changed) {
      if (text === changed.text) {
        stopEditing();
        return false;
      }
      setSaving(true);
      matrixChange(roomId, changed.id, text)
        .then(stopEditing, fail)
        .finally(() => setSaving(false));
      return false;
    }
    setReplyId(null);
    const named = mentionsIn(text, nameable);
    const answers = answered?.id;
    void (async () => {
      const preview = await previewOf(text);
      await (thread ? matrixSendInThread(roomId, thread, text, answers, named, preview) : answers ? matrixReply(roomId, text, answers, named, preview) : matrixSend(roomId, text, named, preview));
    })().catch(fail);
    return true;
  }

  // The preview of the first link in words typed, when this phone makes them (lib/make-preview.ts):
  // not in a hidden place, and never while the space goes through Tor. None if it takes too long.
  async function previewOf(text: string) {
    const link = previews && where === 'space' && CAN_PREVIEW && !throughTor() ? firstLink(text) : null;
    if (!link) return null;
    setNote(t('Making the link’s preview…'));
    const made = await makePreview(link);
    setNote('');
    return made ? fitPreview(text, made) : null;
  }

  async function sendPoll(poll: Poll) {
    if (!roomId) return;
    setPolling(false);
    matrixPoll(roomId, poll).catch(fail);
  }

  function sendPlace(place: Place) {
    if (!roomId) return;
    setPlacing(false);
    matrixLocation(roomId, place, thread).catch(fail);
  }

  function vote(message: MatrixMessage, option: number) {
    if (!roomId || !message.poll) return;
    const mineNow = pollShown(message.poll).votes.find((v) => v.who === me)?.chose ?? [];
    matrixVote(roomId, message.id, chooseOption(mineNow, option, message.poll.max > 1)).catch(fail);
  }

  // Goes to a message of the thread by its ID, and lights it a moment.
  function reach(id: string) {
    if (!byId.has(id)) {
      setNote(t('That message is not on this phone.'));
      return;
    }
    goTo(id);
    setLit(id);
  }

  async function call(video: boolean) {
    if (!roomId || !state) return;
    setNote('');
    if (!(await callPermissions(video))) {
      setNote(video ? t('A video call needs the camera and the microphone.') : t('A call needs the microphone.'));
      return;
    }
    const place = where === 'place';
    const older = () => startMatrixVoip(roomId, video, rtc, place).catch(fail);
    const newer = () => {
      try {
        startMatrixCall(roomId, video, place);
      } catch (error) {
        fail(error);
      }
    };
    // A chat of two can also be called as FluffyChat, Nheko and Element on a computer call: one of them may not have Element Call.
    if (!canMatrixVoip(state, roomId)) return newer();
    if (!canElementCall()) return void older();
    ask(video ? t('Video call') : t('Voice call'), t('Element Call works with Element X and the apps that have it. The older call works with FluffyChat, Nheko and Element on a computer.'), [
      { text: t('Cancel'), style: 'cancel' },
      { text: t('Element Call'), onPress: newer },
      { text: t('Older call'), onPress: () => void older() },
    ]);
  }

  const sendPhoto = (from: 'photos' | 'camera' = 'photos') => sendPicked(() => pickPhoto(from, photos.quality));
  // A video goes as Element sends one (m.video); a contact card as a .vcf file (m.file).
  const sendVideo = () =>
    sendPicked(async () => {
      const video = await pickVideo(MATRIX_MOST);
      return video && { name: video.name, mime: video.mime, bytes: video.bytes, w: video.w, h: video.h };
    });
  const sendCard = (card: string) => sendPicked(async () => cardFile(card));
  const sendAnyFile = () =>
    sendPicked(async () => {
      const picked = await pickFile(MATRIX_MOST);
      return picked ? { ...picked, mime: mimeOfName(picked.name) } : null;
    });

  // Fetches older messages. Once they are in, the screen is scrolled down by the room they take, so
  // the message being read stays under the thumb and what came is up above it.
  async function loadEarlier() {
    if (!roomId || earlier) return;
    setNote('');
    setEarlier(true);
    keepAt.current = { height: scrolled.current.height, count: counted.current };
    try {
      const added = await matrixLoadEarlier(roomId);
      if (!added) {
        keepAt.current = null;
        if (!matrixNow(where).state?.rooms[roomId]?.start) setNote(t('No earlier messages came this time. Try again to look further back.'));
      }
    } catch (error) {
      keepAt.current = null;
      fail(error);
    } finally {
      setEarlier(false);
    }
  }

  const react = (id: string, emoji: string) => matrixReact(roomId, id, emoji).catch(fail);

  async function copy(text: string) {
    setNote((await copyText(text)) ? t('Copied. Any app that reads the clipboard can read it now.') : t('Not copied.'));
  }

  // Takes a message back, for everyone in the room, once asked: ours, or another's where our level lets us.
  async function remove(message: MatrixMessage) {
    if (!roomId) return;
    if (!(await confirm(t('Delete message'), t('Delete this message for everyone in the chat? It cannot be brought back.'), t('Delete')))) return;
    try {
      await matrixDelete(roomId, message.id);
    } catch (error) {
      setNote(t('Not deleted. {reason}', { reason: errorText(error) }));
    }
  }

  // What can be done with a message, held down. Answering, changing and deleting need its ID on the
  // homeserver; changing and deleting are for our own, and changing for their words only.
  function actionsOf(message: MatrixMessage): MenuAction[] {
    const actions: MenuAction[] = [];
    const ours = message.sender === me && !message.state;
    if (!message.state) {
      actions.push({
        title: t('Reply'),
        onPress: () => {
          setEditId(null);
          setReplyId(message.id);
        },
      });
    }
    if (!message.state && !thread && !message.thread) {
      actions.push({ title: t('Reply in thread'), onPress: () => router.push({ pathname: '/matrix-chat', params: { room: roomId, thread: message.id, ...whereParams(where) } }) });
    }
    if (copyable(message)) actions.push({ title: t('Copy'), onPress: () => void copy(message.text) });
    if (!message.state) {
      const pinned = room?.pinned?.includes(message.id) ?? false;
      actions.push({ title: pinned ? t('Unpin') : t('Pin'), onPress: () => roomId && void matrixPin(roomId, message.id, !pinned).catch(fail) });
      actions.push({ title: t('Forward'), onPress: () => setForwarding([message.id]) });
    }
    if (ours && message.poll && !pollOver(message.poll)) actions.push({ title: t('End poll'), onPress: () => roomId && void matrixEndPoll(roomId, message.id).catch(fail) });
    if (ours && !message.file && !message.locked && !message.poll && !message.place) {
      actions.push({
        title: t('Edit'),
        onPress: () => {
          setReplyId(null);
          setEditId(message.id);
        },
      });
    }
    if (ours && !message.call) actions.push({ title: t('Who read it'), onPress: () => setReadersFor(message.id) });
    if (choosable(message)) actions.push(selectAction(() => selection.start(message.id)));
    if (deletable(message)) actions.push({ title: t('Delete'), danger: true, onPress: () => void remove(message) });
    return actions;
  }

  // Whether a message can be taken back for everyone: ours, or another's where our level lets us.
  const othersToo = mayRedactOthers(room, me);
  const deletable = (message: MatrixMessage) => !message.state && !message.deleted && !message.call && (message.sender === me || othersToo);

  // The messages chosen, in the thread's order, and what can be done to them all.
  const chosen = selection.on ? shownMessages.filter((message) => selection.chosen.has(message.id)) : [];
  const copyChosen = async () => {
    const one = new Set(chosen.map((message) => message.sender)).size === 1;
    selection.clear();
    await copy(chosen.map((message) => (one ? message.text : `${nameOf(message)}: ${message.text}`)).join('\n\n'));
  };
  const deleteChosen = async () => {
    const ids = chosen.map((message) => message.id);
    const asked = plural(ids.length, 'Delete {n} message for everyone in the chat? It cannot be brought back.', 'Delete {n} messages for everyone in the chat? They cannot be brought back.');
    if (!(await confirm(t('Delete messages'), asked, t('Delete')))) return;
    selection.clear();
    try {
      await matrixDeleteMany(roomId, ids);
    } catch (error) {
      setNote(t('Not deleted. {reason}', { reason: errorText(error) }));
    }
  };

  // Who of the room's members read one of ours, and when, as they said; who has not, the first
  // MOST_SHOWN of them. Matrix says nothing of what reached a phone.
  const readersShown = (message: MatrixMessage) => {
    const readers = readersOf(room, message, me);
    const others = Object.entries(room.members).filter(([who, m]) => who !== me && m.membership === 'join');
    const waiting = others.filter(([who]) => readers[who] === undefined).map(([who, m]) => ({ key: who, name: m.name || who }));
    const more = waiting.length - MOST_SHOWN;
    return (
      <WhoRead
        read={others.flatMap(([who, m]) => (readers[who] !== undefined ? [{ key: who, name: m.name || who, at: readers[who] }] : []))}
        waiting={more > 0 ? [...waiting.slice(0, MOST_SHOWN), { key: '', name: t('and {n} more', { n: more }) }] : waiting}
        note={t('As each one’s Matrix app tells their homeserver. Matrix does not say when a message reached a phone, and an app may keep from saying it was read.')}
      />
    );
  };

  // The message an answer is to, as the answer quotes it: null when it is older than what is here.
  const answeredBy = (message: MatrixMessage): Answered | null | undefined => {
    if (!message.replyTo) return undefined;
    const to = byId.get(message.replyTo);
    return to ? { name: nameOf(to), line: lineOf(to), onPress: () => reach(to.id) } : null;
  };

  // The bar over the thread while messages are chosen; the thread stays as it was under it.
  const screen = withArrows(
    <KeyboardAwareScrollView
      ref={scroll}
      style={{ flex: 1, backgroundColor: colors.ground }}
      // As Page (components/ui.tsx) has it, but with a hold on the scrolling.
      contentContainerStyle={{ width: '100%', maxWidth: 760, alignSelf: 'center', padding: space.xl - 4, paddingBottom: insets.bottom + space.xl, gap: space.md }}
      keyboardShouldPersistTaps="handled"
      bottomOffset={space.xl}
      {...scrollProps}
      onScroll={(event) => {
        scrolled.current.y = event.nativeEvent.contentOffset.y;
        scrollProps.onScroll(event);
      }}
      onContentSizeChange={(_width, height) => {
        const keep = keepAt.current;
        // Older messages came in above: what was in view moved down by as much as they take.
        if (keep && counted.current !== keep.count) {
          keepAt.current = null;
          scroll.current?.scrollTo({ y: Math.max(0, scrolled.current.y + height - keep.height), animated: false });
        }
        scrolled.current.height = height;
        scrollProps.onContentSizeChange();
      }}
    >
      <Row>
        <Text variant="title" numberOfLines={2} style={{ flex: 1 }}>
          {thread ? t('Thread · {name}', { name: room.name }) : room.name}
        </Text>
        {(canElementCall() || canMatrixVoip(state, roomId)) && !room.invitedBy ? (
          <>
            <ShortcutTile label={t('Video call')} tint="blue" onPress={() => void call(true)}>
              <VideoSign />
            </ShortcutTile>
            <ShortcutTile label={t('Voice call')} tint="green" onPress={() => void call(false)}>
              <PhoneSign />
            </ShortcutTile>
          </>
        ) : null}
      </Row>
      {presence ? (
        <Text variant="caption" numberOfLines={2}>
          {presence}
        </Text>
      ) : null}
      {room.topic && !thread ? (
        <Text variant="caption" numberOfLines={3}>
          {room.topic}
        </Text>
      ) : null}
      <Text variant="caption" tone="muted">
        {room.encrypted ? t('Matrix · encrypted, not anonymous') : t('Not encrypted: the Matrix server can read this chat.')}
      </Text>
      {other ? (
        isVerified(state, other) ? (
          <Text variant="caption" tone="muted">
            ✓ {t('Checked by emoji')}
          </Text>
        ) : !check || check.phase === 'done' || check.phase === 'cancelled' ? (
          <Row>
            <Button title={t('Check by emoji')} kind="secondary" compact onPress={() => matrixVerify(other, roomId).catch(fail)} />
          </Row>
        ) : null
      ) : null}
      {check ? <MatrixVerifyCard check={check} name={room.members[check.userId]?.name || check.userId} /> : null}
      {!thread && room.pinned?.length ? (
        <Pinned
          index={Math.min(pinShown, room.pinned.length - 1)}
          count={room.pinned.length}
          // The latest pinned first.
          line={(() => {
            const id = room.pinned[room.pinned.length - 1 - Math.min(pinShown, room.pinned.length - 1)];
            const pinned = byId.get(id);
            return pinned ? lineOf(pinned) : '';
          })()}
          onPress={() => {
            const at = Math.min(pinShown, room.pinned!.length - 1);
            reach(room.pinned![room.pinned!.length - 1 - at]);
            setPinShown((at + 1) % room.pinned!.length);
          }}
        />
      ) : null}
      <View style={{ gap: space.md }} {...threadProps}>
        {room.before && !room.start ? (
          <Row style={{ justifyContent: 'center' }}>
            <Button title={earlier ? t('Fetching…') : t('Load earlier messages')} kind="secondary" compact disabled={earlier} onPress={() => void loadEarlier()} />
          </Row>
        ) : null}
        {shownMessages.map((message) => (
          <MatrixBubble
            key={message.id}
            message={message}
            me={me}
            sender={room.members[message.sender]?.name || message.sender}
            answered={answeredBy(message)}
            names={(who) => room.members[who]?.name || who}
            onVote={(option) => vote(message, option)}
            onThread={!thread ? () => router.push({ pathname: '/matrix-chat', params: { room: roomId, thread: message.id, ...whereParams(where) } }) : undefined}
            lit={lit === message.id}
            onReact={(emoji) => void react(message.id, emoji)}
            onMenu={menuable(message) && !selection.on ? () => setMenuFor(message.id) : undefined}
            chosen={selection.chosen.has(message.id)}
            onChoose={selection.on && choosable(message) ? () => selection.toggle(message.id) : undefined}
            onLayout={place(message.id)}
            mark={message.sender === me && !message.state && !message.call && !message.deleted ? (readByAll(room, message, me) ? '✓✓✓' : '✓') : undefined}
          />
        ))}
      </View>
      {writing.length ? (
        <Text variant="caption" tone="muted" numberOfLines={1}>
          {writing.map((who) => room.members[who]?.name || who).join(', ')} · {t('typing…')}
        </Text>
      ) : null}
      {answered ? <Quote name={nameOf(answered)} line={lineOf(answered)} onPress={() => goTo(answered.id)} onClose={() => setReplyId(null)} /> : null}
      {changed ? <Quote name={t('Edit message')} line={lineOf(changed)} onClose={stopEditing} /> : null}
      <Field
        key={changed?.id ?? 'new'}
        initial={changed?.text ?? sharedWords.current}
        editing={!!changed}
        saving={saving}
        members={nameable}
        onSend={send}
        onTyped={sayTyping.typed}
        onSent={() => {
          if (!changed) sharedWords.current = '';
          sayTyping.sent();
        }}
      />
      {!voice.recording && !changed ? (
        <Row wrap>
          {!thread ? <Button title={t('Poll')} kind="secondary" compact disabled={sending} onPress={() => setPolling(true)} /> : null}
          <Button title={t('Location')} kind="secondary" compact disabled={sending} onPress={() => setPlacing(true)} />
          {stickerPlace ? <Button title={t('Sticker')} kind="secondary" compact disabled={sending} onPress={() => setStickering(true)} /> : null}
          <CarryButtons
            disabled={sending}
            photos={photos}
            among={among}
            foot={room.encrypted ? undefined : t('Not encrypted: the Matrix server can read this chat.')}
            onCamera={() => void sendPhoto('camera')}
            onVideo={() => void sendVideo()}
            onCard={(card) => void sendCard(card)}
          />
        </Row>
      ) : null}
      <Row {...endProps}>
        {voice.recording ? (
          <RecordingLine />
        ) : (
          <>
            <Button title={t('Photo')} kind="secondary" compact disabled={sending || !!changed} onPress={() => void sendPhoto()} />
            <Button title={t('File')} kind="secondary" compact disabled={sending || !!changed} onPress={() => void sendAnyFile()} />
            {sending ? <Text tone="muted">{t('Sending…')}</Text> : <View style={{ flex: 1 }} />}
          </>
        )}
        <MicButton voice={voice} disabled={sending || !!changed} />
      </Row>
      {note || now.problem ? <Text tone="muted">{note || now.problem}</Text> : null}
      {!room.direct && !room.invitedBy ? <InviteCard roomId={roomId} say={setNote} /> : null}
      {!room.invitedBy ? (
        <Row wrap>
          <NetworkChatNotify notify={checkedChatNotify(room.notify)} hidden={where !== 'space'} onChange={(next) => matrixSetNotify(roomId, next)} />
          <Button title={t('Chat look')} kind="secondary" compact onPress={() => setStyling(true)} />
          {!room.direct ? <Button title={t('Members')} kind="secondary" compact onPress={() => setInfo(true)} /> : null}
        </Row>
      ) : null}
      {!room.invitedBy ? <HistoryButtons tools={history} exportable={where === 'space'} /> : null}
      {!room.direct && !room.invitedBy ? <MatrixRoomInfo visible={info} onClose={() => setInfo(false)} room={room} me={me} /> : null}
      <MatrixStickers
        visible={stickering}
        place={stickerPlace}
        onClose={() => setStickering(false)}
        onPick={(sticker) => {
          setStickering(false);
          matrixSendSticker(roomId, sticker, thread).catch(fail);
        }}
      />
      <ChatLookSheet visible={styling} onClose={() => setStyling(false)} name={room.name} chat={lookChat} />
      <Button
        title={t('Leave')}
        kind="secondary"
        onPress={() =>
          ask(t('Leave this Matrix chat?'), t('You no longer get its messages, and it leaves your list. Someone in it can invite you again.'), [
            { text: t('Cancel'), style: 'cancel' },
            {
              text: t('Leave'),
              style: 'destructive',
              onPress: () =>
                void matrixLeave(roomId)
                  .then(() => router.back())
                  .catch(fail),
            },
          ])
        }
      />
      <PollSheet visible={polling} onClose={() => setPolling(false)} onSend={(poll) => void sendPoll(poll)} />
      <PlaceSheet visible={placing} onClose={() => setPlacing(false)} onSend={sendPlace} said={t('Everyone in this chat can see it.')} />
      <Sheet visible={readersFor !== null} onClose={() => setReadersFor(null)} title={t('Who read it')}>
        {readersFor && byId.get(readersFor) ? readersShown(byId.get(readersFor)!) : null}
      </Sheet>
      <Sheet visible={forwarding !== null} onClose={() => setForwarding(null)} title={t('Forward to')}>
        <ScrollView nestedScrollEnabled style={{ maxHeight: 380 }} contentContainerStyle={{ gap: space.xs }} keyboardShouldPersistTaps="handled">
          {Object.values(state.rooms)
            .filter((other) => !other.space && !other.invitedBy && other.id !== roomId)
            .map((other) => (
              <Button
                key={other.id}
                // A copy into a room not encrypted is read by its server: said beside its name.
                title={other.encrypted ? other.name : `${other.name} · ${t('not encrypted')}`}
                kind="secondary"
                onPress={() => {
                  const ids = forwarding ?? [];
                  setForwarding(null);
                  // One after another, in the thread's order.
                  void (async () => {
                    for (const id of ids) await matrixForward(roomId, id, other.id);
                  })().then(() => setNote(t('Forwarded to {name}.', { name: other.name })), fail);
                }}
              />
            ))}
        </ScrollView>
      </Sheet>
      <MessageMenu
        visible={!!menuMessage && menuable(menuMessage) && shown}
        onClose={() => setMenuFor(null)}
        line={menuMessage ? lineOf(menuMessage) : ''}
        reaction={menuMessage ? Object.keys(menuMessage.reactions ?? {}).find((emoji) => menuMessage.reactions![emoji].includes(me)) : undefined}
        onReact={menuMessage && !menuMessage.state ? (emoji) => void react(menuMessage.id, emoji) : undefined}
        actions={menuMessage ? actionsOf(menuMessage) : []}
      />
    </KeyboardAwareScrollView>,
  );
  return (
    <View style={{ flex: 1 }}>
      {chosen.length ? (
        <SelectBar
          count={chosen.length}
          onCancel={selection.clear}
          onAll={() => selection.set(shownMessages.filter(choosable).map((message) => message.id))}
          onCopy={chosen.every(copyable) ? () => void copyChosen() : undefined}
          onForward={
            chosen.every((message) => !message.locked)
              ? () => {
                  setForwarding(chosen.map((message) => message.id));
                  selection.clear();
                }
              : undefined
          }
          onDelete={chosen.every(deletable) ? () => void deleteChosen() : undefined}
        />
      ) : null}
      <ChatHistory
        tools={history}
        name={room.name}
        messages={() => matrixHistory(shownMessages, me, (who) => room.members[who]?.name || who, !room.direct)}
        goTo={(id) => {
          goTo(id);
          setLit(id);
          return true;
        }}
        earlier={room.before && !room.start ? loadEarlier : undefined}
        exportable={where === 'space'}
        shown={shown}
        say={setNote}
      />
      {screen}
    </View>
  );
}

// In a group: someone asked to join it by their Matrix ID. The homeserver refuses it for one who may not invite.
function InviteCard({ roomId, say }: { roomId: string; say: (text: string) => void }) {
  const [who, setWho] = useState('');
  const [busy, setBusy] = useState(false);
  const invite = () => {
    setBusy(true);
    matrixInvite(roomId, who)
      .then(() => {
        say(t('Invited.'));
        setWho('');
      })
      .catch((error: unknown) => say(errorText(error)))
      .finally(() => setBusy(false));
  };
  return (
    <Row>
      <Input
        style={{ flex: 1 }}
        value={who}
        onChangeText={setWho}
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="@name:matrix.org"
        accessibilityLabel={t('Invite someone by their Matrix ID')}
      />
      <Button title={t('Invite')} kind="secondary" compact disabled={busy || !isMatrixId(who.trim())} onPress={invite} />
    </Row>
  );
}

// The field and its button. What is typed is kept here, so typing draws only this and not the
// whole thread above it. `initial` is the words of a message being changed. In a group, an @ being
// typed offers the members whose names start so.
function Field({
  initial,
  editing,
  saving,
  members,
  onSend,
  onTyped,
  onSent,
}: {
  initial: string;
  editing: boolean;
  saving: boolean;
  members: Nameable[];
  onSend: (text: string) => boolean;
  onTyped: (text: string) => void;
  onSent: () => void;
}) {
  const [text, setText] = useState(initial);
  const typed = text.trim();
  const go = () => {
    if (!typed || saving) return;
    if (onSend(typed)) {
      setText('');
      onSent();
    }
  };
  const write = (next: string) => {
    setText(next);
    onTyped(next);
  };
  const naming = members.length ? typingMention(text) : null;
  const offered = naming !== null ? namesFor(naming, members) : [];
  return (
    <>
      {offered.length ? (
        <Row wrap>
          {offered.map((member) => (
            <Chip key={member.identity} label={`@${member.name}`} onPress={() => write(withMention(text, member.name))} />
          ))}
        </Row>
      ) : null}
      <Row>
        <Input style={{ flex: 1 }} value={text} onChangeText={write} multiline placeholder={t('Message')} accessibilityLabel={editing ? t('Edit message') : t('Message')} />
        <Button title={editing ? t('Save') : t('Send')} compact disabled={!typed || saving} onPress={go} />
      </Row>
    </>
  );
}
