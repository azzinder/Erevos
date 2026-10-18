import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { KeyboardPaddedView } from '../components/keyboard';
import { KeyFace } from '../components/key-face';
import { Button, Card, Field, Input, Row, Sheet, Text, TextButton } from '../components/ui';
import { confirm } from '../lib/alert';
import { MAX_GROUP_NAME } from '../lib/group-signal';
import { MAX_GROUP_TEXT, memberName, noteText, type GroupInfo, type GroupMember } from '../lib/groups';
import { spaceChats } from '../lib/space-chats';
import { spaceGroups, spaceGroupTransport } from '../lib/space-groups';
import type { GroupMessage } from '../lock/group-data';
import { radius, space, type Colors } from '../theme/colors';
import { bubbleStyles } from '../theme/bubbles';
import { useStyles, useTheme } from '../theme/context';
import { ContactPicker, groupableContacts } from '../components/contact-picker';

// A group chat (lib/groups.ts): its messages, each of others' with the sender's name, notes of who
// joined and left, and the field to write in. Its members sheet lists who is in it; the admin adds
// contacts, takes members out and renames it, and anyone can leave.

type Contact = { identity: string; name: string };

const pad = (n: number) => String(n).padStart(2, '0');
const clock = (at: number) => {
  const d = new Date(at);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function GroupScreen() {
  const { id = '' } = useLocalSearchParams<{ id?: string }>();
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
  const scroll = useRef<ScrollView>(null);

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

  const name = (identity: string) => memberName(identity, contacts);

  async function send() {
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    setNote('');
    try {
      await (await spaceGroups()).send(id, text, spaceGroupTransport);
    } catch (error) {
      setDraft(text);
      setNote(error instanceof Error ? error.message : String(error));
    }
  }

  if (!info) {
    return (
      <View style={[styles.screen, styles.center]}>
        <Text tone="muted">{note || 'This group is not here.'}</Text>
      </View>
    );
  }

  const out = info.status !== 'in';
  return (
    <KeyboardPaddedView bottom={insets.bottom} style={styles.screen}>
      <Pressable onPress={() => setSheet(true)} accessibilityRole="button" accessibilityHint="Members and settings" style={({ pressed }) => [styles.top, pressed && styles.pressed]}>
        <KeyFace identity={id} name={info.name} size={40} />
        <View style={{ flex: 1 }}>
          <Text variant="heading" numberOfLines={1}>
            {info.name}
          </Text>
          <Text variant="caption" tone="muted">
            {out ? (info.status === 'leaving' ? 'Leaving' : 'You are not in this group') : 'Group · end-to-end encrypted · tap for members'}
          </Text>
        </View>
      </Pressable>
      <ScrollView ref={scroll} style={{ flex: 1 }} contentContainerStyle={styles.list} onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: false })}>
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
          return (
            <View key={i} style={[styles.bubble, mine ? b.mine : b.theirs]}>
              {!mine && first ? (
                <Text variant="label" color={colors.accentText}>
                  {name(m.from)}
                </Text>
              ) : null}
              <Text style={ink} selectable>
                {m.text}
              </Text>
              <Text style={[ink, styles.time]}>{clock(m.at)}</Text>
            </View>
          );
        })}
      </ScrollView>
      {note ? (
        <Text variant="caption" color={colors.danger} style={styles.noteText}>
          {note}
        </Text>
      ) : null}
      {out ? null : (
        <Row style={styles.dock}>
          <Input value={draft} onChangeText={setDraft} placeholder={`Message ${info.name}`} maxLength={MAX_GROUP_TEXT} multiline style={{ flex: 1 }} />
          <Button title="Send" compact disabled={!draft.trim()} onPress={() => void send()} />
        </Row>
      )}
      <MembersSheet visible={sheet} onClose={() => setSheet(false)} info={info} name={name} onNote={setNote} />
    </KeyboardPaddedView>
  );
}

function MembersSheet({ visible, onClose, info, name, onNote }: {
  visible: boolean;
  onClose: () => void;
  info: GroupInfo;
  name: (identity: string) => string;
  onNote: (text: string) => void;
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
            <Text variant="bodyStrong">Add to the group</Text>
            {adding.length === 0 ? (
              <Text tone="muted">Every contact is in the group or asked already.</Text>
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
                title="Ask them"
                compact
                disabled={busy || chosen.size === 0}
                onPress={() =>
                  void run(async () => {
                    await (await spaceGroups()).add(info.id, [...chosen], spaceGroupTransport);
                    onClose();
                  })
                }
              />
              <TextButton title="Back" onPress={() => setAdding(null)} />
            </Row>
          </>
        ) : (
          <>
            <Text variant="caption" tone="muted">
              {out
                ? 'You are no longer in this group. Its messages stay here until you delete it.'
                : `${members.length} in the group. Each has their own keys: the group's messages are end-to-end encrypted for those in it now.`}
            </Text>
            {members.map((m) => (
              <Row key={m.leaf}>
                <KeyFace identity={m.about?.id ?? ''} name={m.me ? 'You' : name(m.about?.id ?? '')} size={36} />
                <Text style={{ flex: 1 }} numberOfLines={1}>
                  {m.me ? 'You' : name(m.about?.id ?? '')}
                  {m.leaf === 0 ? '  · admin' : ''}
                </Text>
                {info.admin && !m.me && !out ? (
                  <TextButton
                    title="Take out"
                    onPress={() =>
                      void closeThenConfirm('Take out', `${name(m.about?.id ?? '')} will read nothing the group says from now on.`).then(
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
                Asked, joining once Erevos is open on their phone: {info.asked.map(name).join(', ')}
              </Text>
            ) : null}
            {info.admin && !out ? (
              <Card>
                <Field label="Group name">
                  <Input value={rename} onChangeText={setRename} maxLength={MAX_GROUP_NAME} />
                </Field>
                <Row wrap>
                  <Button
                    title="Rename"
                    kind="secondary"
                    compact
                    disabled={busy || !rename.trim() || rename.trim() === info.name}
                    onPress={() => void run(async () => (await spaceGroups()).rename(info.id, rename, spaceGroupTransport))}
                  />
                  <Button title="Add members" kind="secondary" compact disabled={busy} onPress={() => void startAdding()} />
                </Row>
              </Card>
            ) : null}
            {out ? (
              <Button
                title="Delete the group here"
                kind="secondary"
                onPress={() =>
                  void closeThenConfirm('Delete the group', 'Its messages are deleted from this phone.', 'Delete').then(
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
                title={info.admin ? 'Close the group' : 'Leave the group'}
                kind="secondary"
                disabled={busy}
                onPress={() =>
                  void closeThenConfirm(
                    info.admin ? 'Close the group' : 'Leave the group',
                    info.admin
                      ? 'You are its admin: closing it takes every member out, and no one can write in it again.'
                      : 'The admin takes you out the next time Erevos is open on their phone. You read nothing the group says after.',
                    info.admin ? 'Close' : 'Leave',
                  ).then((ok) => {
                    if (ok) void run(async () => (await spaceGroups()).leave(info.id, spaceGroupTransport));
                  })
                }
              />
            )}
            <Text variant="caption" color={colors.textFaint}>
              Members who are not your contacts show by the start of their key. Add them as contacts to give them names.
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
    top: {
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
      paddingHorizontal: space.lg,
      paddingVertical: space.sm,
      alignItems: 'flex-end',
    },
  });
