import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { NetworkChatNotify, useNetworkChatShown } from '../components/network-chat-notify';
import { NetworkFile } from '../components/network-file';
import { PhoneSign, ShortcutTile, VideoSign } from '../components/shortcut-tile';
import { Button, Card, Chip, Input, Page, Row, SectionTitle, Text } from '../components/ui';
import { ask } from '../lib/alert';
import { currentCall } from '../lib/call';
import { shownLine } from '../lib/call-lines';
import { callPermissions } from '../lib/call-permissions';
import { currentGroupCall } from '../lib/group-call';
import { t } from '../lib/i18n';
import { mimeOfName } from '../lib/matrix-media';
import { pickFile } from '../lib/pick-file';
import { pickPhoto } from '../lib/pick-photo';
import { rtc } from '../lib/webrtc';
import { isXmppId, nameOf, xmppDevices, type XmppMessage, type XmppState } from '../lib/xmpp';
import { startXmppCall } from '../lib/xmpp-calls';
import { XMPP_FILE_MOST } from '../lib/xmpp-files';
import { groupPeople, type XmppRoom } from '../lib/xmpp-muc';
import { fingerprint, NoOmemoError } from '../lib/xmpp-omemo';
import {
  onXmppChange,
  runXmpp,
  xmppAddToGroup,
  xmppFile,
  xmppForgetChat,
  xmppLeaveGroup,
  xmppLookUpKeys,
  xmppNow,
  xmppRead,
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
// (lib/xmpp-calls.ts), on the same call screen as Erevos's own calls.
//
// A group (lib/xmpp-muc.ts) is the same screen with its own words: its name and address, whether
// it is encrypted (a private group is, to every member; a channel is not), whether we are in it
// yet, its subject; each message says who wrote it and has no read marks, and there are no call
// tiles. Below a private group are its members, each with their keys and a note when they have
// none, and for its admin Add people; Leave the group leaves it on the account's other apps too.

const MARKS = { sent: '✓', received: '✓✓', read: '✓✓✓' } as const;

export default function XmppChatScreen() {
  const router = useRouter();
  const { jid: given } = useLocalSearchParams<{ jid?: string }>();
  const jid = given?.toLowerCase();
  const [now, setNow] = useState(xmppNow());
  const [draft, setDraft] = useState('');
  const [note, setNote] = useState('');
  // What could not be sent with OMEMO, a text or a file, kept while the person decides about writing without it.
  const [unsent, setUnsent] = useState<{ text: string } | { file: XmppOutgoingFile } | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    runXmpp();
    setNow(xmppNow());
    return onXmppChange(() => setNow(xmppNow()));
  }, []);

  const state = now.state;
  const chat = jid && state ? state.chats[jid] : undefined;
  const count = chat?.messages.length ?? 0;
  const shown = useNetworkChatShown(jid ? `xmpp:${jid}` : undefined);
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

  async function send(text: string) {
    if (!jid) return;
    setNote('');
    try {
      await xmppSend(jid, text);
    } catch (error) {
      // Their apps have no OMEMO: the text waits for the person to say whether to write without it,
      // which the card below explains.
      if (error instanceof NoOmemoError) setUnsent({ text });
      else fail(error);
    }
  }

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

  function submit() {
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    void send(text);
  }

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
    await startXmppCall(jid, video, rtc).catch(fail);
  }

  const name = nameOf(state, jid);
  const room = chat?.room;
  // A private group is encrypted to every member, a channel never is, and any other chat may be chosen to go without.
  const channel = !!room && !room.private;
  const plain = !!chat?.plain;
  const devices = xmppDevices(state, jid);
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
      </Row>
      <Text variant="caption" tone="muted">
        {jid}
      </Text>
      <Text variant="caption" tone="muted">
        {how}
      </Text>
      {plain ? <Button title={t('Encrypt again')} kind="secondary" compact onPress={() => xmppSetPlain(jid, false).catch(fail)} /> : null}
      {room && !room.joined ? (
        <Text variant="caption" tone="muted">
          {room.problem || t('Not in this group yet: joining it.')}
        </Text>
      ) : null}
      {room?.subject ? <Text selectable>{room.subject}</Text> : null}

      {(chat?.messages ?? []).map((message) => (
        <Bubble key={message.id} message={message} group={!!room} />
      ))}

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
                  .then(() => ('text' in held ? send(held.text) : sendFile(held.file)))
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

      <Row>
        <Input style={{ flex: 1 }} value={draft} onChangeText={setDraft} multiline placeholder={t('Message')} accessibilityLabel={t('Message')} />
        <Button title={t('Send')} compact disabled={!draft.trim() || unsent !== null} onPress={submit} />
      </Row>
      <Row>
        <Button title={t('Photo')} kind="secondary" compact disabled={sending || unsent !== null} onPress={() => void sendPhoto()} />
        <Button title={t('File')} kind="secondary" compact disabled={sending || unsent !== null} onPress={() => void sendAnyFile()} />
        {sending ? <Text tone="muted">{t('Sending…')}</Text> : null}
      </Row>
      {note || now.problem ? <Text tone="muted">{note || now.problem}</Text> : null}
      {channel ? (
        <Text variant="caption" tone="muted">
          {t('A channel tells only of messages that name you.')}
        </Text>
      ) : null}
      <NetworkChatNotify notify={checkedChatNotify(chat?.notify)} onChange={(next) => xmppSetNotify(jid, next)} />

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

function Bubble({ message, group }: { message: XmppMessage; group: boolean }) {
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
        : `${when}${!group && mine && message.state ? ` ${MARKS[message.state]}` : ''}`;
  return (
    <View
      style={{
        alignSelf: mine ? 'flex-end' : 'flex-start',
        maxWidth: '85%',
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
      {message.locked ? (
        <Text tone="muted">{t('Locked: this message could not be opened on this device.')}</Text>
      ) : message.file ? (
        <NetworkFile name={message.file.name} type={message.file.type} size={message.file.size} fetch={() => xmppFile(message.file!)} />
      ) : (
        <Text selectable>{message.text}</Text>
      )}
      <Text variant="caption" tone="faint">
        {status}
        {!message.encrypted && !message.locked ? ` · ${t('not encrypted')}` : ''}
      </Text>
    </View>
  );
}
