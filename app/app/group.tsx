import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useGroupMedia } from '../components/group-media';
import { useGroupMessages } from '../components/group-messages';
import { KeyboardPaddedView } from '../components/keyboard';
import { KeyFace } from '../components/key-face';
import { LinkedText } from '../components/linked-text';
import { usePublicGroup } from '../components/public-group';
import { Button, Card, Field, Input, Row, Sheet, Text, TextButton } from '../components/ui';
import { confirm } from '../lib/alert';
import { currentCall } from '../lib/call';
import { shownLine } from '../lib/call-lines';
import { callPermissions } from '../lib/call-permissions';
import { currentGroupCall } from '../lib/group-call';
import { groupCallGoingOn, joinGroupCall, onGroupCallChange, startGroupCall } from '../lib/group-calls';
import { MAX_GROUP_NAME } from '../lib/group-signal';
import { MAX_GROUP_TEXT, memberName, noteText, type GroupInfo, type GroupMember } from '../lib/groups';
import { spaceChats } from '../lib/space-chats';
import { spaceGroupCalls, spaceGroups, spaceGroupTransport } from '../lib/space-groups';
import { t } from '../lib/i18n';
import { rtc } from '../lib/webrtc';
import type { GroupMessage } from '../lock/group-data';
import { radius, space, withAlpha, type Colors } from '../theme/colors';
import { bubbleStyles } from '../theme/bubbles';
import { useStyles, useTheme } from '../theme/context';
import { ContactPicker, groupableContacts } from '../components/contact-picker';

// A group chat (lib/groups.ts): its messages, each of others' with the sender's name, notes of who
// joined and left, and the field to write in. Its members sheet lists who is in it; the admin adds
// contacts, takes members out and renames it, and anyone can leave. Its Call and Video buttons start
// a call in the group (lib/group-calls.ts); the call going on shows above the messages, to join.
// Attach and Voice under the field send photos, files and voice messages (components/group-media.tsx).
// A message held down opens its menu, and its bubble shows what it answers, a sticker, a place, a
// poll or a link's preview, and its reactions (components/group-messages.tsx). `at`: the tag of a
// message to go to, starred or found.

type Contact = { identity: string; name: string };

const pad = (n: number) => String(n).padStart(2, '0');
const clock = (at: number) => {
  const d = new Date(at);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function GroupScreen() {
  const { id = '', at } = useLocalSearchParams<{ id?: string; at?: string }>();
  const styles = useStyles(makeStyles);
  const { colors, look } = useTheme();
  const b = useMemo(() => bubbleStyles(look.bubbles, colors), [look.bubbles, colors]);
  const insets = useSafeAreaInsets();
  const [info, setInfo] = useState<GroupInfo | null>(null);
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [draft, setDraft] = useState('');
  const [note, setNote] = useState('');
  const [sheet, setSheet] = useState(false);
  const [, setCalls] = useState(0);
  const scroll = useRef<ScrollView>(null);
  // A public group (app/public-group.tsx): its members by the names they chose, and its own screen for them.
  const pub = usePublicGroup(id);
  const name = (identity: string) => (pub.isPublic ? pub.name(identity) : memberName(identity, contacts));
  // Replies, reactions, pins, stickers, places, polls and the rest: the menu, sheets, and bubble parts.
  const parts = useGroupMessages({ id, info, messages, name, onNote: setNote, scroll, at });
  // Photos, files and voice messages: their buttons, sheets, and their place in the bubbles.
  const media = useGroupMedia(id, messages, setNote, parts.attachMore);

  // A call going on in the group shows, until its members' phones go quiet.
  useEffect(() => {
    const stop = onGroupCallChange(() => setCalls((n) => n + 1));
    const timer = setInterval(() => setCalls((n) => n + 1), 30_000);
    return () => {
      stop();
      clearInterval(timer);
    };
  }, []);

  const load = useCallback(async () => {
    const groups = await spaceGroups();
    setInfo(groups.list().find((g) => g.id === id) ?? null);
    setMessages(groups.messages(id));
    await groups.markRead(id);
  }, [id]);

  useEffect(() => {
    let stop = () => undefined as void;
    let active = true;
    void spaceChats()
      .then(({ e2e }) => setContacts(e2e.contacts().map((c) => ({ identity: c.identity, name: c.name }))))
      .catch(() => undefined);
    void spaceGroups()
      .then((groups) => {
        if (!active) return;
        void load();
        // Marking it read changes it too: only what came reloads it.
        let seen = groups.messages(id).length;
        stop = groups.onChange(() => {
          const now = groups.messages(id).length;
          const listed = groups.list().find((g) => g.id === id) ?? null;
          setInfo(listed);
          if (now !== seen) {
            seen = now;
            void load();
          }
        });
      })
      .catch((error) => setNote(error instanceof Error ? error.message : String(error)));
    return () => {
      active = false;
      stop();
    };
  }, [id, load]);

  async function send() {
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    setNote('');
    try {
      await parts.send(text);
    } catch (error) {
      setDraft(text);
      setNote(error instanceof Error ? error.message : String(error));
    }
  }

  // Starts a call, or joins the one going on, as it is: voice or video.
  async function call(asked: boolean) {
    setNote('');
    if (currentCall() || currentGroupCall()) {
      setNote(t('There is a call already.'));
      return;
    }
    const going = groupCallGoingOn(id);
    const video = going ? going.video : asked;
    if (!(await callPermissions(video))) {
      setNote(video ? t('A video call needs the camera and the microphone.') : t('A call needs the microphone.'));
      return;
    }
    try {
      const relay = await spaceGroupCalls.callRelay();
      const direct = t(
        "Your relay has no call relay beside it, so the call would go straight between the phones. That only works on the same Wi-Fi, and each phone in the call sees the others' addresses on it. With a call relay, none does.",
      );
      if (!relay && !(await confirm(t('Call without a call relay?'), direct, t('Call')))) return;
      if (going) await joinGroupCall(spaceGroupCalls, id, relay, rtc);
      else await startGroupCall(spaceGroupCalls, id, video, relay, rtc);
    } catch (error) {
      setNote(t('Could not call. {reason}', { reason: error instanceof Error ? error.message : String(error) }));
    }
  }

  if (!info) {
    return (
      <View style={[styles.screen, styles.center]}>
        <Text tone="muted">{note || t('This group is not here.')}</Text>
      </View>
    );
  }

  const out = info.status !== 'in';
  const going = out ? null : groupCallGoingOn(id);
  return (
    <KeyboardPaddedView bottom={insets.bottom} style={styles.screen}>
      <Row style={styles.head}>
        <Pressable onPress={() => (pub.isPublic ? router.push(`/public-group?id=${id}`) : setSheet(true))} accessibilityRole="button" accessibilityHint={t('Members and settings')} style={({ pressed }) => [styles.top, pressed && styles.pressed]}>
          <KeyFace identity={id} name={info.name} size={40} />
          <View style={{ flex: 1 }}>
            <Text variant="heading" numberOfLines={1}>
              {info.name}
            </Text>
            <Text variant="caption" tone="muted">
              {out ? (info.status === 'leaving' ? t('Leaving') : t('You are not in this group')) : (pub.caption ?? t('Group · end-to-end encrypted · tap for members'))}
            </Text>
          </View>
        </Pressable>
        {out ? null : <TextButton title={t('Call')} onPress={() => void call(false)} />}
        {out ? null : <TextButton title={t('Video')} onPress={() => void call(true)} />}
      </Row>
      {going ? (
        <Pressable onPress={() => void call(going.video)} accessibilityRole="button" style={({ pressed }) => [styles.going, pressed && styles.pressed]}>
          <Text variant="bodyStrong" color={colors.accentText}>
            {going.video ? t('A group video call is going on · Join') : t('A group call is going on · Join')}
          </Text>
          <Text variant="caption" tone="muted" numberOfLines={1}>
            {going.people.map(name).join(', ')}
          </Text>
        </Pressable>
      ) : null}
      {parts.pinned}
      {parts.search}
      <ScrollView ref={scroll} style={{ flex: 1 }} contentContainerStyle={styles.list} onContentSizeChange={() => parts.follows() && scroll.current?.scrollToEnd({ animated: false })}>
        {messages.map((m, i) => {
          if (m.note) {
            return (
              <Text key={i} variant="caption" tone="muted" style={styles.noteLine}>
                {noteText(m.text, name)}
              </Text>
            );
          }
          const mine = !m.from;
          const before = messages[i - 1];
          const first = !before || before.note || before.from !== m.from;
          const ink = mine ? b.mineText : b.theirsText;
          const caption = parts.caption(m);
          return (
            <View key={i} onLayout={parts.placedAt(m)}>
              <Pressable
                onLongPress={() => parts.hold(m)}
                accessibilityHint={t('Hold for more')}
                style={[styles.bubble, mine ? b.mine : b.theirs, m.file?.kind === 'photo' && (mine || !first) && styles.photoBubble, m.sticker && styles.stickerBubble, parts.litStyle(m)]}
              >
                {!mine && first ? (
                  <Text variant="label" color={colors.accentText}>
                    {name(m.from)}
                  </Text>
                ) : null}
                {parts.quote(m, ink)}
                {media.content(m, ink, () => parts.hold(m)) ??
                  parts.body(m, ink) ?? (
                    <Text style={ink}>
                      <LinkedText text={shownLine(m.text)} />
                    </Text>
                  )}
                {parts.preview(m, ink)}
                <Text style={[ink, styles.time, m.sticker && { color: colors.textMuted }]}>{caption ? `${clock(m.at)}  ·  ${caption}` : clock(m.at)}</Text>
              </Pressable>
              {parts.reactions(m)}
            </View>
          );
        })}
      </ScrollView>
      {note ? (
        <Text variant="caption" color={colors.danger} style={styles.noteText}>
          {note}
        </Text>
      ) : media.said ? (
        <Text variant="caption" tone="muted" style={styles.noteText}>
          {media.said}
        </Text>
      ) : null}
      {out ? null : (
        <View style={styles.dock}>
          {parts.replyBar}
          <Input value={draft} onChangeText={setDraft} placeholder={t('Message {name}', { name: info.name })} maxLength={MAX_GROUP_TEXT} multiline />
          <Row>
            <Row wrap style={{ flex: 1 }}>
              {media.tools}
            </Row>
            <Button title={t('Send')} compact disabled={!draft.trim()} onPress={() => void send()} />
          </Row>
        </View>
      )}
      {media.sheets}
      {parts.sheets}
      <MembersSheet
        visible={sheet}
        onClose={() => setSheet(false)}
        info={info}
        name={name}
        onNote={setNote}
        onSearch={parts.startSearch}
        onExport={parts.exportGroup}
      />
    </KeyboardPaddedView>
  );
}

function MembersSheet({ visible, onClose, info, name, onNote, onSearch, onExport }: {
  visible: boolean;
  onClose: () => void;
  info: GroupInfo;
  name: (identity: string) => string;
  onNote: (text: string) => void;
  /** Opens the search through the group's messages, and writes the group out as text. */
  onSearch: () => void;
  onExport: () => void;
}) {
  const { colors } = useTheme();
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [adding, setAdding] = useState<Contact[] | null>(null);
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const [rename, setRename] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setAdding(null);
    setChosen(new Set());
    setRename(info.name);
    void spaceGroups()
      .then((groups) => groups.members(info.id))
      .then(setMembers, () => setMembers([]));
  }, [visible, info.id, info.name]);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    try {
      await action();
    } catch (error) {
      onNote(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  };

  async function startAdding() {
    const ids = new Set(members.map((m) => m.about?.id));
    const all = await groupableContacts();
    setAdding(all.filter((c) => !ids.has(c.identity) && !info.asked.includes(c.identity)));
  }

  // The question shows once the sheet is gone: on the web, over it, it would not show.
  const closeThenConfirm = (title: string, message: string, action?: string) => {
    onClose();
    return confirm(title, message, action);
  };

  const out = info.status !== 'in';
  return (
    <Sheet visible={visible} onClose={onClose} title={info.name}>
      <ScrollView style={{ maxHeight: 520 }} contentContainerStyle={{ gap: space.sm }}>
        {adding ? (
          <>
            <Text variant="bodyStrong">{t('Add to the group')}</Text>
            {adding.length === 0 ? (
              <Text tone="muted">{t('Every contact is in the group or asked already.')}</Text>
            ) : (
              <ContactPicker
                contacts={adding}
                chosen={chosen}
                onToggle={(identity) =>
                  setChosen((before) => {
                    const next = new Set(before);
                    if (next.has(identity)) next.delete(identity);
                    else next.add(identity);
                    return next;
                  })
                }
              />
            )}
            <Row>
              <Button
                title={t('Ask them')}
                compact
                disabled={busy || chosen.size === 0}
                onPress={() =>
                  void run(async () => {
                    await (await spaceGroups()).add(info.id, [...chosen], spaceGroupTransport);
                    onClose();
                  })
                }
              />
              <TextButton title={t('Back')} onPress={() => setAdding(null)} />
            </Row>
          </>
        ) : (
          <>
            <Text variant="caption" tone="muted">
              {out
                ? t('You are no longer in this group. Its messages stay here until you delete it.')
                : t("{n} in the group. Each has their own keys: the group's messages are end-to-end encrypted for those in it now.", {
                    n: members.length,
                  })}
            </Text>
            {members.map((m) => (
              <Row key={m.leaf}>
                <KeyFace identity={m.about?.id ?? ''} name={m.me ? t('You') : name(m.about?.id ?? '')} size={36} />
                <Text style={{ flex: 1 }} numberOfLines={1}>
                  {m.me ? t('You') : name(m.about?.id ?? '')}
                  {m.leaf === 0 ? t('  · admin') : ''}
                </Text>
                {info.admin && !m.me && !out ? (
                  <TextButton
                    title={t('Take out')}
                    onPress={() =>
                      void closeThenConfirm(t('Take out'), t('{name} will read nothing the group says from now on.', { name: name(m.about?.id ?? '') })).then(
                        (ok) => {
                          if (ok) void run(async () => (await spaceGroups()).remove(info.id, m.leaf, spaceGroupTransport));
                        },
                      )
                    }
                  />
                ) : null}
              </Row>
            ))}
            {info.asked.length > 0 ? (
              <Text variant="caption" tone="muted">
                {t('Asked, joining once Erevos is open on their phone: {names}', { names: info.asked.map(name).join(', ') })}
              </Text>
            ) : null}
            {info.admin && !out ? (
              <Card>
                <Field label={t('Group name')}>
                  <Input value={rename} onChangeText={setRename} maxLength={MAX_GROUP_NAME} />
                </Field>
                <Row wrap>
                  <Button
                    title={t('Rename')}
                    kind="secondary"
                    compact
                    disabled={busy || !rename.trim() || rename.trim() === info.name}
                    onPress={() => void run(async () => (await spaceGroups()).rename(info.id, rename, spaceGroupTransport))}
                  />
                  <Button title={t('Add members')} kind="secondary" compact disabled={busy} onPress={() => void startAdding()} />
                </Row>
              </Card>
            ) : null}
            <Row wrap>
              <Button
                title={t('Search in this chat')}
                kind="secondary"
                compact
                onPress={() => {
                  onClose();
                  onSearch();
                }}
              />
              <Button
                title={t('Export chat')}
                kind="secondary"
                compact
                onPress={() => {
                  onClose();
                  setTimeout(onExport, Platform.OS === 'web' ? 0 : 300);
                }}
              />
            </Row>
            {out ? (
              <Button
                title={t('Delete the group here')}
                kind="secondary"
                onPress={() =>
                  void closeThenConfirm(t('Delete the group'), t('Its messages are deleted from this phone.'), t('Delete')).then(
                    (ok) => {
                      if (!ok) return;
                      void run(async () => {
                        await (await spaceGroups()).forget(info.id);
                        router.back();
                      });
                    },
                  )
                }
              />
            ) : (
              <Button
                title={info.admin ? t('Close the group') : t('Leave the group')}
                kind="secondary"
                disabled={busy}
                onPress={() =>
                  void closeThenConfirm(
                    info.admin ? t('Close the group') : t('Leave the group'),
                    info.admin
                      ? t('You are its admin: closing it takes every member out, and no one can write in it again.')
                      : t('The admin takes you out the next time Erevos is open on their phone. You read nothing the group says after.'),
                    info.admin ? t('Close') : t('Leave'),
                  ).then((ok) => {
                    if (ok) void run(async () => (await spaceGroups()).leave(info.id, spaceGroupTransport));
                  })
                }
              />
            )}
            <Text variant="caption" color={colors.textFaint}>
              {t('Members who are not your contacts show by the start of their key. Add them as contacts to give them names.')}
            </Text>
          </>
        )}
      </ScrollView>
    </Sheet>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      width: '100%',
      maxWidth: 760,
      alignSelf: 'center',
    },
    center: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: space.xl,
    },
    head: {
      paddingRight: space.lg,
    },
    going: {
      marginHorizontal: space.lg,
      paddingHorizontal: space.md,
      paddingVertical: space.sm,
      borderRadius: radius.md,
      backgroundColor: withAlpha(colors.primary, 0.16),
      gap: 2,
    },
    top: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.md,
      paddingHorizontal: space.lg,
      paddingVertical: space.sm,
      borderRadius: radius.md,
    },
    pressed: {
      backgroundColor: colors.surfacePressed,
    },
    list: {
      gap: 3,
      paddingHorizontal: space.lg,
      paddingVertical: space.sm,
    },
    bubble: {
      maxWidth: '82%',
      paddingTop: space.sm,
      paddingBottom: 6,
      paddingHorizontal: space.md,
      gap: 2,
      marginBottom: 3,
    },
    // A photo fills its bubble, with a thin edge.
    photoBubble: {
      paddingTop: 4,
      paddingHorizontal: 4,
    },
    // A sticker stands on its own, with no bubble behind it.
    stickerBubble: {
      backgroundColor: 'transparent',
      borderWidth: 0,
      paddingHorizontal: 0,
      shadowOpacity: 0,
      elevation: 0,
    },
    time: {
      fontSize: 11,
      opacity: 0.7,
      alignSelf: 'flex-end',
    },
    noteLine: {
      alignSelf: 'center',
      textAlign: 'center',
      paddingVertical: space.xs,
    },
    noteText: {
      paddingHorizontal: space.lg,
    },
    dock: {
      gap: space.sm,
      paddingHorizontal: space.lg,
      paddingVertical: space.sm,
    },
  });
