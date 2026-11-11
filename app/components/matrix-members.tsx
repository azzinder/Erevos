// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';

import { ask, confirm } from '../lib/alert';
import { plural, t } from '../lib/i18n';
import type { MatrixRoom } from '../lib/matrix';
import type { RoomMember } from '../lib/matrix-members';
import { ADMIN, levelOf, mayMakeAdmin, mayRemove, maySetState, roleOf } from '../lib/matrix-power';
import { matrixMembers, matrixRemoveMember, matrixRename, matrixSetAdmin, matrixSetTopic } from '../lib/matrix-store';
import { radius, space } from '../theme/colors';
import { useColors } from '../theme/context';

import { Button, Input, Row, SectionTitle, Sheet, Text } from './ui';

// A Matrix group's own sheet (app/matrix-chat.tsx): its name and what it is about (its topic), which
// whoever may changes here, and who is in it, as its homeserver has them when the sheet opens, each
// with what Element calls them (owner, admin, moderator, lib/matrix-power.ts). A member tapped shows
// what may be done to them, only what our level allows: made an admin or no more one, taken out of
// the group, or barred from it.

// The most members the sheet lists.
const MOST_SHOWN = 200;

const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error));

export function MatrixRoomInfo({ visible, onClose, room, me }: { visible: boolean; onClose: () => void; room: MatrixRoom; me: string }) {
  const colors = useColors();
  const [members, setMembers] = useState<RoomMember[] | null>(null);
  const [name, setName] = useState(room.name);
  const [topic, setTopic] = useState(room.topic ?? '');
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');

  // Fetched again each time it opens, as the homeserver has them now.
  useEffect(() => {
    if (!visible) return;
    let live = true;
    setName(room.name);
    setTopic(room.topic ?? '');
    setOpen(null);
    setNote('');
    matrixMembers(room.id).then(
      (list) => live && setMembers(list),
      (error: unknown) => live && setNote(errorText(error)),
    );
    return () => {
      live = false;
    };
  }, [visible, room.id]);

  function run(work: () => Promise<void>, after?: () => void) {
    setBusy(true);
    setNote('');
    work()
      .then(() => after?.())
      .catch((error: unknown) => setNote(errorText(error)))
      .finally(() => setBusy(false));
  }

  const nameOf = (member: RoomMember) => member.name || member.id;
  const gone = (id: string) => setMembers((list) => list?.filter((m) => m.id !== id) ?? null);

  function remove(member: RoomMember, ban: boolean) {
    const title = ban ? t('Bar {name} from the group?', { name: nameOf(member) }) : t('Take {name} out of the group?', { name: nameOf(member) });
    const said = ban ? t('They are taken out and cannot join again until an admin lets them.') : t('The group’s messages no longer go to them. An admin can add them again.');
    ask(title, said, [
      { text: t('Cancel'), style: 'cancel' },
      { text: ban ? t('Bar') : t('Take out'), style: 'destructive', onPress: () => run(() => matrixRemoveMember(room.id, member.id, ban), () => gone(member.id)) },
    ]);
  }

  async function makeAdmin(member: RoomMember, admin: boolean) {
    // One made an admin by an admin stands as high: it cannot be taken back from them.
    if (admin && levelOf(room, me) === ADMIN && !(await confirm(t('Make admin'), t('Make {name} an admin? They may then do all you may in this group, and you cannot undo it.', { name: nameOf(member) }), t('Make admin')))) return;
    run(() => matrixSetAdmin(room.id, member.id, admin));
  }

  const roleText = (id: string) => {
    const role = roleOf(room, id);
    return role === 'owner' ? t('owner') : role === 'admin' ? t('admin') : role === 'moderator' ? t('moderator') : '';
  };
  const rank = (id: string) => levelOf(room, id) ?? 0;
  const sorted = [...(members ?? [])].sort((a, b) => rank(b.id) - rank(a.id) || Number(a.membership === 'invite') - Number(b.membership === 'invite') || nameOf(a).localeCompare(nameOf(b)));
  const more = sorted.length - MOST_SHOWN;
  const canName = maySetState(room, me, 'm.room.name');
  const canTopic = maySetState(room, me, 'm.room.topic');

  return (
    <Sheet visible={visible} onClose={onClose} title={room.name}>
      {canName ? (
        <Row>
          <Input style={{ flex: 1 }} value={name} onChangeText={setName} placeholder={t('Name of the group')} accessibilityLabel={t('Name of the group')} />
          <Button title={t('Rename')} compact disabled={busy || !name.trim() || name.trim() === room.name} onPress={() => run(() => matrixRename(room.id, name))} />
        </Row>
      ) : null}
      {canTopic ? (
        <Row>
          <Input style={{ flex: 1 }} value={topic} onChangeText={setTopic} multiline placeholder={t('Subject')} accessibilityLabel={t('Subject')} />
          <Button title={t('Save')} compact disabled={busy || topic.trim() === (room.topic ?? '')} onPress={() => run(() => matrixSetTopic(room.id, topic))} />
        </Row>
      ) : room.topic ? (
        <Text selectable>{room.topic}</Text>
      ) : null}
      <SectionTitle title={members ? `${t('Members')} · ${plural(members.length, '{n} member', '{n} members')}` : t('Members')} />
      {!members && !note ? <Text tone="muted">{t('Fetching…')}</Text> : null}
      {sorted.slice(0, MOST_SHOWN).map((member) => {
        const role = roleText(member.id);
        const shown = open === member.id;
        const actions = [
          mayMakeAdmin(room, me, member.id, true) ? { title: t('Make admin'), onPress: () => void makeAdmin(member, true) } : null,
          mayMakeAdmin(room, me, member.id, false) ? { title: t('Remove as admin'), onPress: () => void makeAdmin(member, false) } : null,
          mayRemove(room, me, member.id, 'kick') ? { title: t('Take out'), onPress: () => remove(member, false) } : null,
          mayRemove(room, me, member.id, 'ban') ? { title: t('Bar'), onPress: () => remove(member, true) } : null,
        ].filter((action): action is { title: string; onPress: () => void } => !!action);
        return (
          <View key={member.id} style={{ gap: space.xs }}>
            <Pressable
              onPress={() => setOpen(shown ? null : member.id)}
              disabled={!actions.length}
              accessibilityRole={actions.length ? 'button' : undefined}
              accessibilityState={actions.length ? { expanded: shown } : undefined}
              style={({ pressed }) => ({ paddingVertical: space.xs, paddingHorizontal: space.sm, borderRadius: radius.md, backgroundColor: pressed ? colors.surfacePressed : 'transparent' })}
            >
              <Text variant="bodyStrong" numberOfLines={1}>
                {nameOf(member)}
                {member.id === me ? ` · ${t('You')}` : ''}
              </Text>
              <Text variant="caption" tone="muted" numberOfLines={1}>
                {[member.id, role, member.membership === 'invite' ? t('invited') : ''].filter(Boolean).join(' · ')}
              </Text>
            </Pressable>
            {shown && actions.length ? (
              <Row wrap>
                {actions.map((action) => (
                  <Button key={action.title} title={action.title} kind="secondary" compact disabled={busy} onPress={action.onPress} />
                ))}
              </Row>
            ) : null}
          </View>
        );
      })}
      {more > 0 ? <Text tone="muted">{t('and {n} more', { n: more })}</Text> : null}
      {note ? <Text tone="muted">{note}</Text> : null}
    </Sheet>
  );
}
