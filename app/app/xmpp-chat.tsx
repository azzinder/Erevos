import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';

import { Missing, ReactionChips } from '../components/matrix-message';
import { MicButton, RecordingLine, useVoiceCapture } from '../components/matrix-voice';
import { MessageMenu, type MenuAction } from '../components/message-menu';
import { Quote } from '../components/message-parts';

import { hiddenOnScreen, NetworkChatNotify, useNetworkChatShown } from '../components/network-chat-notify';
import { NetworkFile } from '../components/network-file';
import { PhoneSign, ShortcutTile, VideoSign } from '../components/shortcut-tile';
import { Button, Card, Chip, Input, Page, Row, SectionTitle, Text, TextButton } from '../components/ui';
import { ask, confirm } from '../lib/alert';
import { currentCall } from '../lib/call';
import { shownLine } from '../lib/call-lines';
import { callPermissions } from '../lib/call-permissions';
import { CAN_COPY, copyText } from '../lib/clipboard';
import { currentGroupCall } from '../lib/group-call';
import { voiceNamed } from '../lib/group-media';
import { groupCallGoingOn, joinGroupCall, onGroupCallChange, startGroupCall } from '../lib/group-calls';
import { t } from '../lib/i18n';
import { mimeOfName } from '../lib/matrix-media';
import { useNetworkWhere } from '../lib/network-place';
import { pickFile } from '../lib/pick-file';
import { pickPhoto } from '../lib/pick-photo';
import { rtc } from '../lib/webrtc';
import { isBlocked, isXmppId, nameOf, onXmppTyping, TYPING_SHOWS, xmppDevices, xmppTyping, type XmppMessage, type XmppState } from '../lib/xmpp';
import { reactionsShown } from '../lib/xmpp-actions';
import { startXmppCall } from '../lib/xmpp-calls';
import { XMPP_FILE_MOST } from '../lib/xmpp-files';
import { groupPeople, type XmppRoom } from '../lib/xmpp-muc';
import { xmppGroupCalls, xmppPlaceGroupCalls } from '../lib/xmpp-muji';
import { fingerprint, NoOmemoError } from '../lib/xmpp-omemo';
import {
  onXmppChange,
  runXmpp,
  xmppAddToGroup,
  xmppBlock,
  xmppChange,
  xmppDelete,
  xmppFile,
  xmppForgetChat,
  xmppLeaveGroup,
  xmppLookUpKeys,
  xmppNow,
  xmppRead,
  xmppReact,
  xmppReply,
  xmppSend,
  xmppSendFile,
  xmppSetNotify,
  xmppSetPlain,
  type XmppOutgoingFile,
} from '../lib/xmpp-store';
import { checkedChatNotify } from '../lock/chat-notify';
import { radius, space } from '../theme/colors';
import { useColors } from '../theme/context';

// One XMPP chat (lib/xmpp-store.ts): its messages, oldest first, and a field to write in. It is
// marked as not anonymous, and as not encrypted when the person's apps have no OMEMO and the chat
// was chosen to go without it. Opening it, with Erevos on the screen, marks its messages read, and
// tells the other person's app when it asked; while it shows, what comes in it only sounds, and it
// can be muted or given sounds of its own (components/network-chat-notify.tsx). Photo and File send
// one through the server's HTTP upload, encrypted as the chat is (lib/xmpp-files.ts). The keys of
// their devices are listed below, to compare with them. The two tiles at the top call them
// (lib/xmpp-calls.ts), on the same call screen as Erevos's own calls. Opened from a hidden place's
// hidden chats (`hidden=1`) it is the place's own account's chat (lib/network-place.ts), whose
// calls are that account's, and no notifications, as a place's chats tell nothing outside the
// hidden chats.
//
// A group (lib/xmpp-muc.ts) is the same screen with its own words: its name and address, whether
// it is encrypted (a private group is, to every member; a channel is not), whether we are in it
// yet, its subject; each message says who wrote it and has no read marks. A private group we are
// in has call tiles too, which call in the group as Dino does (lib/xmpp-muji.ts), and a call going
// on in it can be joined, by its tile and by the line under its address; a channel has none.
// Below a private group are its members, each with their keys and a note when they have none, and
// for its admin Add people; Leave the group leaves it on the account's other apps too.
//
// A message held down opens its menu (components/message-menu.tsx), as in a Matrix chat: react to
// it, answer it, copy it, and for one of ours change its words or delete it for everyone
// (lib/xmpp-actions.ts). An answer shows the message it is to above its words; a message changed
// says so, and one taken back is only marked as such. The reactions are under it, tapped to react
// the same or take ours back. While the other person writes, their app may say so, and it shows;
// Erevos never says it of us.

const MARKS = { sent: '✓', received: '✓✓', read: '✓✓✓' } as const;

/** A message in one line, for its menu, the strip over the field and the quote of an answer. */
function lineOf(message: XmppMessage): string {
  if (message.deleted) return t('Message deleted');
  if (message.locked) return t('Locked message');
  if (message.file) return message.file.name;
  return shownLine(message.text).trim().split('\n')[0] || t('Message');
}

// Whether it has a menu: not one taken back, a call's line, or one still going or that did not go.
const menuable = (message: XmppMessage) => !message.deleted && !message.call && message.state !== 'sending' && message.state !== 'failed';
const copyable = (message: XmppMessage) => CAN_COPY && !!message.text && !message.file && !message.locked && !message.call && !message.deleted;

export default function XmppChatScreen() {
  const router = useRouter();
  const { jid: given, hidden } = useLocalSearchParams<{ jid?: string; hidden?: string }>();
  const where = useNetworkWhere(hidden === '1');
  const jid = given?.toLowerCase();
  const [now, setNow] = useState(xmppNow(where));
  const [draft, setDraft] = useState('');
  const [note, setNote] = useState('');
  // What could not be sent with OMEMO, a text or a file, kept while the person decides about writing without it.
  const [unsent, setUnsent] = useState<{ text: string; to?: string } | { file: XmppOutgoingFile } | null>(null);
  const [sending, setSending] = useState(false);
  // The message the next one answers or gives new words, and the one whose menu is open, by their IDs.
  const [replyId, setReplyId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  // Counts who starts and stops writing, and the end of each while it shows, so the line under the thread follows.
  const [, setTyped] = useState(0);
  // A voice message recorded with the microphone (components/matrix-voice.tsx) goes as a file, as Conversations sends one.
  const sendVoice = useRef<(audio: Uint8Array) => Promise<void>>(async () => undefined);
  const voice = useVoiceCapture({ send: (audio) => sendVoice.current(audio), say: setNote });
  // Counts the changes of the group calls, so a call going on in the group shows as it starts and ends.
  const [, setCalls] = useState(0);

  useEffect(() => onGroupCallChange(() => setCalls((n) => n + 1)), []);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const off = onXmppTyping(() => {
      setTyped((n) => n + 1);
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => setTyped((n) => n + 1), TYPING_SHOWS + 100);
    });
    return () => {
      off();
      if (timer) clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    runXmpp();
    setNow(xmppNow(where));
    return onXmppChange(() => setNow(xmppNow(where)));
  }, [where]);

  const state = now.state;
  const chat = jid && state ? state.chats[jid] : undefined;
  const count = chat?.messages.length ?? 0;
  // A hidden place's chat is not told apart on the screen: nothing of it reaches the space's notices.
  const shown = useNetworkChatShown(!jid ? undefined : where === 'space' ? `xmpp:${jid}` : hiddenOnScreen());
  useEffect(() => {
    if (shown && jid && chat?.unread) xmppRead(jid).catch(() => undefined);
  }, [shown, jid, count, chat?.unread]);
  // Their keys, or a private group's members', looked up as it opens, so they show before anything is written.
  const people = chat?.room ? (chat.room.private && state ? groupPeople(state, chat.room).join(' ') : '') : (jid ?? '');
  useEffect(() => {
    if (jid && people && now.online) xmppLookUpKeys(jid).catch(() => undefined);
  }, [jid, people, now.online]);

  if (!state || !jid || !isXmppId(jid)) {
    return (
      <Page>
        <Text variant="title">XMPP</Text>
        <Text tone="muted">{now.loaded ? t('This XMPP chat is not here any more.') : ''}</Text>
      </Page>
    );
  }

  const fail = (error: unknown) => setNote(error instanceof Error ? error.message : String(error));

  async function send(text: string, to?: string) {
    if (!jid) return;
    setNote('');
    try {
      await (to ? xmppReply(jid, text, to) : xmppSend(jid, text));
    } catch (error) {
      // Their apps have no OMEMO: the text waits for the person to say whether to write without it,
      // which the card below explains.
      if (error instanceof NoOmemoError) setUnsent({ text, ...(to ? { to } : {}) });
      else fail(error);
    }
  }

  sendVoice.current = (audio) => sendFile({ bytes: audio, ...voiceNamed(audio) });

  async function sendFile(file: XmppOutgoingFile) {
    if (!jid) return;
    setNote('');
    setSending(true);
    try {
      await xmppSendFile(jid, file);
    } catch (error) {
      if (error instanceof NoOmemoError) setUnsent({ file });
      else fail(error);
    } finally {
      setSending(false);
    }
  }

  async function sendPicked(pick: () => Promise<XmppOutgoingFile | null>) {
    try {
      const file = await pick();
      if (file) await sendFile(file);
    } catch (error) {
      fail(error);
    }
  }
  const sendPhoto = () =>
    sendPicked(async () => {
      const photo = await pickPhoto('photos', 90);
      return photo ? { bytes: photo.bytes, name: photo.name, mime: photo.mime } : null;
    });
  const sendAnyFile = () =>
    sendPicked(async () => {
      const picked = await pickFile(XMPP_FILE_MOST);
      return picked ? { ...picked, mime: mimeOfName(picked.name) } : null;
    });

  const byId = new Map((chat?.messages ?? []).map((message) => [message.id, message]));
  // One that is gone or taken back meanwhile is none: what is typed then goes as a new message.
  const replying = replyId ? byId.get(replyId) : undefined;
  const answered = replying && !replying.deleted ? replying : undefined;
  const editing = editId ? byId.get(editId) : undefined;
  const changed = editing && !editing.deleted && editing.mine ? editing : undefined;
  const menuMessage = menuFor ? byId.get(menuFor) : undefined;
  const me = state.jid;
  const writerOf = (message: XmppMessage) => (message.mine ? t('You') : chat?.room ? message.by || jid : nameOf(state, jid));

  const stopEditing = () => {
    setEditId(null);
    setDraft('');
  };

  // What is typed goes as a new message, as an answer to the one chosen, or as the new words of the
  // one being changed.
  function submit() {
    const text = draft.trim();
    if (!text || !jid) return;
    if (changed) {
      setNote('');
      xmppChange(jid, changed.id, text).then(stopEditing, fail);
      return;
    }
    setDraft('');
    setReplyId(null);
    void send(text, answered?.id);
  }

  const react = (id: string, emoji: string) => {
    if (jid) xmppReact(jid, id, emoji).catch(fail);
  };

  async function copy(text: string) {
    setNote((await copyText(text)) ? t('Copied. Any app that reads the clipboard can read it now.') : t('Not copied.'));
  }

  // Takes a message of ours back, for everyone in the chat, once asked.
  async function remove(message: XmppMessage) {
    if (!jid) return;
    if (!(await confirm(t('Delete message'), t('Delete this message for everyone in the chat? It cannot be brought back.'), t('Delete')))) return;
    try {
      await xmppDelete(jid, message.id);
    } catch (error) {
      setNote(t('Not deleted. {reason}', { reason: error instanceof Error ? error.message : String(error) }));
    }
  }

  // What can be done with a message, held down. In a group, reacting, answering and deleting wait
  // for the room's ID of it; changing and deleting are for our own, and changing for words only.
  function actionsOf(message: XmppMessage): MenuAction[] {
    const actions: MenuAction[] = [];
    const named = !chat?.room || !!message.sid;
    if (named) {
      actions.push({
        title: t('Reply'),
        onPress: () => {
          if (editId) stopEditing();
          setReplyId(message.id);
        },
      });
    }
    if (copyable(message)) actions.push({ title: t('Copy'), onPress: () => void copy(message.text) });
    if (message.mine && !message.file && !message.locked) {
      actions.push({
        title: t('Edit'),
        onPress: () => {
          setReplyId(null);
          setEditId(message.id);
          setDraft(message.text);
        },
      });
    }
    if (message.mine && named) actions.push({ title: t('Delete'), danger: true, onPress: () => void remove(message) });
    return actions;
  }

  // The message an answer is to, as the answer quotes it: null when it is not here.
  const answeredBy = (message: XmppMessage): Answer | null | undefined => {
    if (!message.replyTo) return undefined;
    const to = byId.get(message.replyTo);
    return to ? { name: writerOf(to), line: lineOf(to) } : null;
  };

  async function call(video: boolean) {
    if (!jid) return;
    setNote('');
    if (currentCall() || currentGroupCall()) {
      setNote(t('There is a call already.'));
      return;
    }
    if (!(await callPermissions(video))) {
      setNote(video ? t('A video call needs the camera and the microphone.') : t('A call needs the microphone.'));
      return;
    }
    await startXmppCall(jid, video, rtc, where === 'place').catch(fail);
  }

  // Starts a call in the private group, or joins the one going on, as it is: voice or video.
  async function callGroup(asked: boolean) {
    if (!jid) return;
    setNote('');
    if (currentCall() || currentGroupCall()) {
      setNote(t('There is a call already.'));
      return;
    }
    const calls = where === 'place' ? xmppPlaceGroupCalls : xmppGroupCalls;
    const going = groupCallGoingOn(jid);
    const video = going ? going.video : asked;
    if (!(await callPermissions(video))) {
      setNote(video ? t('A video call needs the camera and the microphone.') : t('A call needs the microphone.'));
      return;
    }
    try {
      const relay = await calls.callRelay();
      if (going) await joinGroupCall(calls, jid, relay, rtc);
      else await startGroupCall(calls, jid, video, relay, rtc);
    } catch (error) {
      fail(error);
    }
  }

  const name = nameOf(state, jid);
  const room = chat?.room;
  // A private group is encrypted to every member, a channel never is, and any other chat may be chosen to go without.
  const channel = !!room && !room.private;
  const plain = !!chat?.plain;
  const devices = xmppDevices(state, jid);
  const blocked = isBlocked(state, jid);
  // A private group we are in has call tiles, and one going on in it can be joined.
  const groupCalls = !!(room?.private && room.joined);
  const going = groupCalls ? groupCallGoingOn(jid) : null;
  const how = channel
    ? t('XMPP channel · not encrypted: everyone in it, and the servers, can read it')
    : plain
      ? t('Not encrypted: the XMPP server can read this chat.')
      : room
        ? t('XMPP group · encrypted with OMEMO for every member, not anonymous')
        : t('XMPP · encrypted with OMEMO, not anonymous');
  return (
    <Page>
      <Row>
        <Text variant="title" numberOfLines={2} style={{ flex: 1 }}>
          {name}
        </Text>
        {room ? null : (
          <>
            <ShortcutTile label={t('Video call')} tint="blue" onPress={() => void call(true)}>
              <VideoSign />
            </ShortcutTile>
            <ShortcutTile label={t('Voice call')} tint="green" onPress={() => void call(false)}>
              <PhoneSign />
            </ShortcutTile>
          </>
        )}
        {/* In a private group: a video call and a voice call; one going on is joined as it is, by its own tile alone. */}
        {groupCalls ? (
          going ? (
            going.video ? (
              <ShortcutTile label={t('A group video call is going on · Join')} tint="blue" onPress={() => void callGroup(true)}>
                <VideoSign />
              </ShortcutTile>
            ) : (
              <ShortcutTile label={t('A group call is going on · Join')} tint="green" onPress={() => void callGroup(false)}>
                <PhoneSign />
              </ShortcutTile>
            )
          ) : (
            <>
              <ShortcutTile label={t('Video call')} tint="blue" onPress={() => void callGroup(true)}>
                <VideoSign />
              </ShortcutTile>
              <ShortcutTile label={t('Voice call')} tint="green" onPress={() => void callGroup(false)}>
                <PhoneSign />
              </ShortcutTile>
            </>
          )
        ) : null}
      </Row>
      <Text variant="caption" tone="muted">
        {jid}
      </Text>
      <Text variant="caption" tone="muted">
        {how}
      </Text>
      {going ? (
        <TextButton
          title={going.video ? t('A group video call is going on · Join') : t('A group call is going on · Join')}
          onPress={() => void callGroup(going.video)}
        />
      ) : null}
      {plain ? <Button title={t('Encrypt again')} kind="secondary" compact onPress={() => xmppSetPlain(jid, false).catch(fail)} /> : null}
      {room && !room.joined ? (
        <Text variant="caption" tone="muted">
          {room.problem || t('Not in this group yet: joining it.')}
        </Text>
      ) : null}
      {room?.subject ? <Text selectable>{room.subject}</Text> : null}

      {(chat?.messages ?? []).map((message) => (
        <Bubble
          key={message.id}
          message={message}
          group={!!room}
          me={me}
          answered={answeredBy(message)}
          onReact={menuable(message) && (!room || message.sid) ? (emoji) => react(message.id, emoji) : undefined}
          onMenu={menuable(message) ? () => setMenuFor(message.id) : undefined}
        />
      ))}
      {!room && xmppTyping(jid) ? (
        <Text variant="caption" tone="muted">
          {name} · {t('typing…')}
        </Text>
      ) : null}

      {unsent !== null ? (
        <Card>
          <Text>
            {room
              ? t('Nobody in this group has an app with OMEMO that Erevos can find. You can write without encryption: the XMPP servers, and anyone who can read what passes through them, can then read it.')
              : t('{name} has no app with OMEMO that Erevos can find. You can write to them without encryption: the XMPP server, and anyone who can read what passes through it, can then read it.', { name })}
          </Text>
          <Row wrap>
            <Button
              title={t('Write without encryption')}
              compact
              onPress={() => {
                const held = unsent;
                setUnsent(null);
                setNote('');
                xmppSetPlain(jid, true)
                  .then(() => ('text' in held ? send(held.text, held.to) : sendFile(held.file)))
                  .catch(fail);
              }}
            />
            <Button
              title={t('Cancel')}
              kind="secondary"
              compact
              onPress={() => {
                if ('text' in unsent) setDraft(unsent.text);
                setUnsent(null);
                setNote('');
              }}
            />
          </Row>
        </Card>
      ) : null}

      {answered ? <Quote name={writerOf(answered)} line={lineOf(answered)} onClose={() => setReplyId(null)} /> : null}
      {changed ? <Quote name={t('Edit message')} line={lineOf(changed)} onClose={stopEditing} /> : null}
      <Row>
        <Input style={{ flex: 1 }} value={draft} onChangeText={setDraft} multiline placeholder={t('Message')} accessibilityLabel={changed ? t('Edit message') : t('Message')} />
        <Button title={changed ? t('Save') : t('Send')} compact disabled={!draft.trim() || unsent !== null} onPress={submit} />
      </Row>
      <Row>
        {voice.recording ? (
          <RecordingLine />
        ) : (
          <>
            <Button title={t('Photo')} kind="secondary" compact disabled={sending || unsent !== null || !!changed} onPress={() => void sendPhoto()} />
            <Button title={t('File')} kind="secondary" compact disabled={sending || unsent !== null || !!changed} onPress={() => void sendAnyFile()} />
            {sending ? <Text tone="muted">{t('Sending…')}</Text> : <View style={{ flex: 1 }} />}
          </>
        )}
        <MicButton voice={voice} disabled={sending || unsent !== null || !!changed} />
      </Row>
      {note || now.problem ? <Text tone="muted">{note || now.problem}</Text> : null}
      {channel ? (
        <Text variant="caption" tone="muted">
          {t('A channel tells only of messages that name you.')}
        </Text>
      ) : null}
      {where === 'space' ? <NetworkChatNotify notify={checkedChatNotify(chat?.notify)} onChange={(next) => xmppSetNotify(jid, next)} /> : null}

      {room?.private ? <Members state={state} jid={jid} room={room} fail={fail} /> : null}
      {!room && devices.length ? (
        <>
          <SectionTitle title={t('Their keys')} />
          <Card>
            <Text tone="muted">{t('Compare these with what their app shows, by another way than this chat, to be sure nobody sits in between.')}</Text>
            <Keys devices={devices} />
          </Card>
        </>
      ) : null}

      {room ? null : blocked ? (
        <>
          <Text variant="caption" tone="muted">
            {t('Blocked: nothing of theirs reaches your XMPP account, in any of its apps.')}
          </Text>
          <Button title={t('Unblock')} kind="secondary" onPress={() => void xmppBlock(jid, false).catch(fail)} />
        </>
      ) : (
        <Button
          title={t('Block')}
          kind="secondary"
          onPress={() =>
            ask(t('Block {name}?', { name }), t('Their messages, calls and requests no longer reach your XMPP account, in any of its apps. They are not told.'), [
              { text: t('Cancel'), style: 'cancel' },
              { text: t('Block'), style: 'destructive', onPress: () => void xmppBlock(jid, true).catch(fail) },
            ])
          }
        />
      )}
      {room ? (
        <Button
          title={t('Leave the group')}
          kind="secondary"
          onPress={() =>
            ask(t('Leave this group?'), t('Its messages are removed from this phone, and the other XMPP apps of your account leave the group too.'), [
              { text: t('Cancel'), style: 'cancel' },
              {
                text: t('Leave'),
                style: 'destructive',
                onPress: () =>
                  void xmppLeaveGroup(jid)
                    .then(() => router.back())
                    .catch(fail),
              },
            ])
          }
        />
      ) : (
        <Button
          title={t('Remove this chat')}
          kind="secondary"
          onPress={() =>
            ask(t('Remove this chat?'), t('Its messages are removed from this phone. The contact stays in your XMPP account, and the other person keeps theirs.'), [
              { text: t('Cancel'), style: 'cancel' },
              {
                text: t('Remove'),
                style: 'destructive',
                onPress: () =>
                  void xmppForgetChat(jid)
                    .then(() => router.back())
                    .catch(fail),
              },
            ])
          }
        />
      )}
      <MessageMenu
        visible={!!menuMessage && menuable(menuMessage) && shown}
        onClose={() => setMenuFor(null)}
        line={menuMessage ? lineOf(menuMessage) : ''}
        reaction={menuMessage?.reacted?.[me]?.[0]}
        onReact={menuMessage && (!room || menuMessage.sid) ? (emoji) => react(menuMessage.id, emoji) : undefined}
        actions={menuMessage ? actionsOf(menuMessage) : []}
      />
    </Page>
  );
}

type Devices = ReturnType<typeof xmppDevices>;

// A person's devices, each with its key to compare, whether it changed, and whether it is still listed.
function Keys({ devices }: { devices: Devices }) {
  return (
    <>
      {devices.map((device) => (
        <View key={`${device.two ? 2 : 1}-${device.id}`} style={{ gap: 2 }}>
          <Text selectable variant="bodyStrong" style={{ fontFamily: 'monospace' }}>
            {device.identity ? fingerprint(device.identity) : t('Not seen yet')}
          </Text>
          {device.two ? (
            <Text variant="caption" tone="muted">
              {t('OMEMO 2, as Kaidan shows it.')}
            </Text>
          ) : null}
          {device.changed ? (
            <Text variant="caption" tone="muted">
              {t('This key changed since it was first seen.')}
            </Text>
          ) : null}
          {!device.listed ? (
            <Text variant="caption" tone="faint">
              {t('No longer in their device list.')}
            </Text>
          ) : null}
        </View>
      ))}
    </>
  );
}

// A private group's members, each with their keys, and for its admin the contacts who can be added.
// Someone with no device known (they have none, or the look-up as the group opened has not come
// back yet) is marked, as the group's messages do not reach them.
function Members({ state, jid, room, fail }: { state: XmppState; jid: string; room: XmppRoom; fail: (error: unknown) => void }) {
  const [adding, setAdding] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const members = groupPeople(state, room);
  const others = Object.values(state.roster)
    .filter((c) => c.subscription !== 'remove' && c.jid !== state.jid && !members.includes(c.jid))
    .sort((a, b) => nameOf(state, a.jid).localeCompare(nameOf(state, b.jid)));
  const toggle = (who: string) => setPicked((now) => (now.includes(who) ? now.filter((j) => j !== who) : [...now, who]));
  const add = () => {
    setBusy(true);
    xmppAddToGroup(jid, picked)
      .then(() => {
        setPicked([]);
        setAdding(false);
      })
      .catch(fail)
      .finally(() => setBusy(false));
  };
  return (
    <>
      <SectionTitle title={t('Members')} />
      {members.length === 0 ? <Text tone="muted">{t('Nobody else is in this group yet.')}</Text> : null}
      {members.some((member) => xmppDevices(state, member).length) ? (
        <Text tone="muted">{t('Compare these with what their app shows, by another way than this chat, to be sure nobody sits in between.')}</Text>
      ) : null}
      {members.map((member) => {
        const devices = xmppDevices(state, member);
        return (
          <Card key={member}>
            <Text variant="bodyStrong" numberOfLines={1}>
              {nameOf(state, member)}
            </Text>
            <Text variant="caption" tone="muted" numberOfLines={1}>
              {member}
            </Text>
            {devices.some((device) => device.listed) ? null : (
              <Text variant="caption" tone="muted">
                {t('No OMEMO keys found yet: encrypted messages do not reach them.')}
              </Text>
            )}
            <Keys devices={devices} />
          </Card>
        );
      })}
      {room.admin ? (
        adding ? (
          <Card>
            {others.length ? (
              <Row wrap>
                {others.map((contact) => (
                  <Chip key={contact.jid} label={nameOf(state, contact.jid)} selected={picked.includes(contact.jid)} onPress={() => toggle(contact.jid)} />
                ))}
              </Row>
            ) : (
              <Text tone="muted">{t('Every contact is in the group or asked already.')}</Text>
            )}
            <Row wrap>
              <Button title={t('Add')} compact disabled={busy || picked.length === 0} onPress={add} />
              <Button
                title={t('Cancel')}
                kind="secondary"
                compact
                onPress={() => {
                  setAdding(false);
                  setPicked([]);
                }}
              />
            </Row>
          </Card>
        ) : (
          <Button title={t('Add people')} kind="secondary" compact onPress={() => setAdding(true)} />
        )
      ) : null}
    </>
  );
}

/** The message an answer is to, as the answer quotes it. */
type Answer = { name: string; line: string };

function Bubble({ message, group, me, answered, onReact, onMenu }: {
  message: XmppMessage;
  group: boolean;
  /** The account's address, to see which reactions are ours. */
  me: string;
  /** The message it answers, or null when that is not here. */
  answered?: Answer | null;
  /** A reaction under it was tapped: reacts the same, or takes ours back. Not given when it cannot be reacted to yet. */
  onReact?: (emoji: string) => void;
  /** Held down: its menu. */
  onMenu?: () => void;
}) {
  const colors = useColors();
  const mine = message.mine;
  const when = new Date(message.at).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  // A call's line: kept in English, shown in the app's language, with no marks.
  if (message.call) {
    return (
      <View style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '85%', padding: space.sm + 2, borderRadius: radius.md, backgroundColor: colors.surfaceAlt, gap: 2 }}>
        <Text>{shownLine(message.text)}</Text>
        <Text variant="caption" tone="faint">
          {when}
        </Text>
      </View>
    );
  }
  const status =
    message.state === 'sending'
      ? t('Sending…')
      : message.state === 'failed'
        ? t('Not sent.')
        : [`${when}${!group && mine && message.state ? ` ${MARKS[message.state]}` : ''}`, message.edited ? t('Edited') : ''].filter(Boolean).join('  ·  ');
  const reactions = reactionsShown(message);
  return (
    <View style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '85%', gap: 4 }}>
      <Pressable
        onLongPress={onMenu}
        disabled={!onMenu}
        // One with buttons in it (Save) stays apart from them for a screen reader.
        accessible={!message.file}
        accessibilityHint={onMenu ? t('Hold for more') : undefined}
        style={{
          alignSelf: mine ? 'flex-end' : 'flex-start',
          padding: space.sm + 2,
          borderRadius: radius.md,
          backgroundColor: mine ? colors.primarySoft : colors.surfaceAlt,
          gap: 2,
        }}
      >
        {group && !mine && message.by ? (
          <Text variant="caption" tone="muted" numberOfLines={1}>
            {message.by}
          </Text>
        ) : null}
        {message.replyTo ? answered ? <Quote name={answered.name} line={answered.line} /> : <Missing /> : null}
        {message.deleted ? (
          <Text tone="muted" style={{ fontStyle: 'italic' }}>
            {t('Message deleted')}
          </Text>
        ) : message.locked ? (
          <Text tone="muted">{t('Locked: this message could not be opened on this device.')}</Text>
        ) : message.file ? (
          <NetworkFile name={message.file.name} type={message.file.type} size={message.file.size} fetch={() => xmppFile(message.file!)} />
        ) : (
          // Not selectable when it has a menu: holding the words opens it, which can copy them.
          <Text selectable={!onMenu}>{message.text}</Text>
        )}
        <Text variant="caption" tone="faint">
          {status}
          {!message.encrypted && !message.locked && !message.deleted ? ` · ${t('not encrypted')}` : ''}
        </Text>
      </Pressable>
      {reactions ? <ReactionChips reactions={reactions} me={me} mine={mine} onReact={(emoji) => onReact?.(emoji)} /> : null}
    </View>
  );
}
