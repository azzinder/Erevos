// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { useState } from 'react';
import { View } from 'react-native';

import { plural, t } from '../lib/i18n';
import type { MatrixState } from '../lib/matrix';
import { findMessages, spacesOf, type FoundRoom } from '../lib/matrix-rooms';
import { matrixJoin, matrixPublicRooms, matrixSpaceRooms } from '../lib/matrix-store';
import { space } from '../theme/colors';

import { lineOf } from './matrix-message';
import { Button, Card, Chip, Input, Row, SectionTitle, Text } from './ui';

// Finding rooms and words in the Matrix screen (app/matrix.tsx): the public rooms our Matrix server
// lists, or another server's; the rooms in the spaces we are in; and the words in the messages this
// phone keeps. The first two ask the Matrix server, which then learns what was looked for, as it
// does for Element, and the screen says so; looking for words asks nobody.

const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error));

type Page = { rooms: FoundRoom[]; next?: string };

export function MatrixFind({ state, busy, open, run }: { state: MatrixState; busy: boolean; open: (roomId: string) => void; run: (work: () => Promise<unknown>) => Promise<void> }) {
  const [term, setTerm] = useState('');
  const [server, setServer] = useState('');
  const [found, setFound] = useState<Page | null>(null);
  const [asking, setAsking] = useState(false);
  const [inSpace, setInSpace] = useState<string | null>(null);
  const [inside, setInside] = useState<Page | null>(null);
  const [words, setWords] = useState('');
  const [note, setNote] = useState('');
  const spaces = spacesOf(state);
  const seen = findMessages(state, words).slice(0, 20);

  async function ask(work: () => Promise<void>) {
    setAsking(true);
    setNote('');
    try {
      await work();
    } catch (error) {
      setNote(errorText(error));
    } finally {
      setAsking(false);
    }
  }

  const look = () =>
    ask(async () => {
      const page = await matrixPublicRooms(term, server);
      setFound(page);
      if (!page.rooms.length) setNote(t('No rooms found.'));
    });

  const more = () =>
    ask(async () => {
      if (!found?.next) return;
      const page = await matrixPublicRooms(term, server, found.next);
      setFound({ rooms: [...found.rooms, ...page.rooms], next: page.next });
    });

  const enter = (spaceId: string) =>
    ask(async () => {
      setInSpace(spaceId);
      setInside(null);
      setInside(await matrixSpaceRooms(spaceId));
    });

  const moreInside = () =>
    ask(async () => {
      if (!inSpace || !inside?.next) return;
      const page = await matrixSpaceRooms(inSpace, inside.next);
      setInside({ rooms: [...inside.rooms, ...page.rooms], next: page.next });
    });

  // Joins, by the address when it has one, and opens it.
  const join = (room: FoundRoom) => void run(async () => open(await matrixJoin(room.alias ?? room.id)));

  return (
    <>
      <SectionTitle title={t('Find a group')} />
      <Card>
        <Input value={term} onChangeText={setTerm} autoCapitalize="none" autoCorrect={false} placeholder={t('Words in its name or topic')} accessibilityLabel={t('Words in its name or topic')} onSubmitEditing={() => void look()} />
        <Input value={server} onChangeText={setServer} autoCapitalize="none" autoCorrect={false} keyboardType="url" placeholder="matrix.org" accessibilityLabel={t('Another Matrix server, to look there')} />
        <Row>
          <Button title={asking ? t('Looking…') : t('Look')} compact disabled={busy || asking} onPress={() => void look()} />
        </Row>
        <Text variant="caption" tone="muted">
          {t('Your Matrix server learns what you look for, as it does for Element. A public group may not be encrypted.')}
        </Text>
        {found?.rooms.map((room) => (
          <FoundRow key={room.id} room={room} busy={busy} onOpen={() => open(room.id)} onJoin={() => join(room)} />
        ))}
        {found?.next ? <Button title={t('More')} kind="secondary" compact disabled={asking} onPress={() => void more()} /> : null}
        {note ? <Text tone="muted">{note}</Text> : null}
      </Card>

      {spaces.length ? (
        <>
          <SectionTitle title={t('Spaces')} />
          <Card>
            <Row wrap>
              {spaces.map((it) => (
                <Chip key={it.id} label={it.name} selected={inSpace === it.id} onPress={() => (inSpace === it.id ? (setInSpace(null), setInside(null)) : void enter(it.id))} />
              ))}
            </Row>
            {inSpace && inside ? (
              inside.rooms.length ? (
                inside.rooms.map((room) => <FoundRow key={room.id} room={room} busy={busy} onOpen={() => open(room.id)} onJoin={() => join(room)} />)
              ) : (
                <Text tone="muted">{t('This space has no rooms.')}</Text>
              )
            ) : null}
            {inSpace && inside?.next ? <Button title={t('More')} kind="secondary" compact disabled={asking} onPress={() => void moreInside()} /> : null}
          </Card>
        </>
      ) : null}

      <SectionTitle title={t('Search messages')} />
      <Card>
        <Input value={words} onChangeText={setWords} autoCapitalize="none" autoCorrect={false} placeholder={t('Words in your messages')} accessibilityLabel={t('Words in your messages')} />
        <Text variant="caption" tone="muted">
          {t('Looks only in the messages on this phone. Nobody is asked.')}
        </Text>
        {words.trim().length >= 2 && !seen.length ? <Text tone="muted">{t('Nothing found.')}</Text> : null}
        {seen.map(({ roomId, message }) => (
          <View key={`${roomId}${message.id}`} style={{ gap: 2 }}>
            <Text variant="caption" tone="muted" numberOfLines={1}>
              {state.rooms[roomId]?.name} · {state.rooms[roomId]?.members[message.sender]?.name || message.sender}
            </Text>
            <Text numberOfLines={2}>{lineOf(message)}</Text>
            <Row>
              <Button title={t('Open the chat')} kind="secondary" compact onPress={() => open(roomId)} />
            </Row>
          </View>
        ))}
      </Card>
    </>
  );
}

function FoundRow({ room, busy, onOpen, onJoin }: { room: FoundRoom; busy: boolean; onOpen: () => void; onJoin: () => void }) {
  return (
    <View style={{ gap: 2, paddingTop: space.xs }}>
      <Text variant="bodyStrong" numberOfLines={1}>
        {room.name}
      </Text>
      {room.topic ? (
        <Text tone="muted" numberOfLines={2}>
          {room.topic}
        </Text>
      ) : null}
      <Text variant="caption" tone="faint">
        {[plural(room.members, '{n} member', '{n} members'), room.alias ?? ''].filter(Boolean).join(' · ')}
      </Text>
      <Row>
        {room.joined ? (
          <Button title={t('Open')} kind="secondary" compact onPress={onOpen} />
        ) : room.open ? (
          <Button title={t('Join')} compact disabled={busy} onPress={onJoin} />
        ) : (
          <Text variant="caption" tone="muted">
            {t('By invitation only.')}
          </Text>
        )}
      </Row>
    </View>
  );
}
