// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { useEffect, useState } from 'react';
import { View, type StyleProp, type TextStyle } from 'react-native';

import type { Among } from '../lib/contact-book';
import { useOpenHiddenPlace } from '../lib/hidden-contacts';
import { t } from '../lib/i18n';
import type { Nameable } from '../lib/mentions';
import { namesFor, typingMention } from '../lib/mentions';
import { cardsOfFile } from '../lib/message-carry';
import { actingWhere, type NetworkWhere } from '../lib/network-place';
import { CAN_TAKE_PHOTOS, type PhotoQuality } from '../lib/pick-photo';
import { loadPhotoQuality, QUALITIES, qualityNote, savePhotoQuality } from '../lib/photo-quality';
import { space } from '../theme/colors';
import { CardBubble, CardSheet, saveCard } from './card-share';
import { Button, Chip, Row, Sheet, Text } from './ui';

// What a message carries besides its words, in the chats of Matrix, XMPP and Nostr
// (app/matrix-chat.tsx, app/xmpp-chat.tsx, app/nostr-chat.tsx), as an Erevos chat has it: Camera,
// Video, Contact card and the photo quality beside Photo and File; a contact card that came, shown
// once asked for; and in a group, the members offered as @ is typed. What is sent is the chat's
// own to send (lib/message-carry.ts says how each goes).

/** How photos go, as an Erevos chat chooses it and remembers it on this phone (lib/photo-quality.ts). */
export function usePhotoQuality(): { quality: PhotoQuality; choose: (quality: PhotoQuality) => void } {
  const [quality, setQuality] = useState<PhotoQuality>('original');
  useEffect(() => {
    let live = true;
    loadPhotoQuality().then(
      (kept) => live && setQuality(kept),
      () => undefined,
    );
    return () => {
      live = false;
    };
  }, []);
  const choose = (next: PhotoQuality) => {
    setQuality(next);
    savePhotoQuality(next).catch(() => undefined);
  };
  return { quality, choose };
}

/** Whose contacts a contact card is chosen from in a network chat: the space's, or its hidden place's own while those are open. */
export function useNetworkAmong(where: NetworkWhere): Among {
  const lent = useOpenHiddenPlace();
  return where === 'place' ? lent : 'space';
}

/**
 * Camera, Video and Contact card, and how photos go, to sit in a row beside Photo and File: each
 * hands over what to send, and a contact card is chosen in its sheet from `among` (`foot` under it,
 * said when the chat is not encrypted).
 */
export function CarryButtons({ disabled, photos, among, shown = true, foot, onCamera, onVideo, onCard }: {
  disabled?: boolean;
  photos: { quality: PhotoQuality; choose: (quality: PhotoQuality) => void };
  among: Among;
  /** Whether the chat shows: its sheets open only then. */
  shown?: boolean;
  foot?: string;
  onCamera: () => void;
  onVideo: () => void;
  onCard: (card: string) => void;
}) {
  const [carding, setCarding] = useState(false);
  const [choosing, setChoosing] = useState(false);
  const label = QUALITIES.find((q) => q.value === photos.quality)?.label ?? '';
  return (
    <>
      {CAN_TAKE_PHOTOS ? <Button title={t('Camera')} kind="secondary" compact disabled={disabled} onPress={onCamera} /> : null}
      <Button title={t('Video')} kind="secondary" compact disabled={disabled} onPress={onVideo} />
      <Button title={t('Contact card')} kind="secondary" compact disabled={disabled} onPress={() => setCarding(true)} />
      <Button title={`${t('Photo quality')}: ${t(label)}`} kind="secondary" compact onPress={() => setChoosing(true)} />
      <CardSheet
        visible={carding && shown}
        onClose={() => setCarding(false)}
        onSend={(card) => {
          setCarding(false);
          onCard(card);
        }}
        among={among}
        foot={foot}
      />
      <Sheet visible={choosing && shown} onClose={() => setChoosing(false)} title={t('Photo quality')}>
        <Row wrap>
          {QUALITIES.map(({ value, label: named }) => (
            <Chip key={named} label={t(named)} selected={photos.quality === value} onPress={() => photos.choose(value)} />
          ))}
        </Row>
        <Text variant="caption" tone="muted">
          {qualityNote(photos.quality)}
        </Text>
      </Sheet>
    </>
  );
}

/**
 * A contact card that came as a file (lib/message-carry.ts isCardFile): its name, fetched only when
 * asked for, as a photo is; then each contact it holds, with Add to contacts, which opens a new
 * contact with what it says: among a hidden place's contacts in its chats.
 */
export function ContactFile({ name, fetch, ink }: { name: string; fetch: () => Promise<Uint8Array>; ink?: StyleProp<TextStyle> }) {
  const [cards, setCards] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');

  async function show() {
    setBusy(true);
    setNote('');
    try {
      const read = cardsOfFile(await fetch());
      setCards(read);
      if (!read.length) setNote(t('This contact card could not be read.'));
    } catch (error) {
      setNote(error instanceof Error ? error.message : t('The file could not be fetched.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ gap: space.xs }}>
      {cards?.length ? (
        cards.map((card, i) => <CardBubble key={i} card={card} ink={ink} onSave={() => saveCard(card, actingWhere() === 'place')} />)
      ) : (
        <>
          <Text style={[ink, { fontWeight: '700' }]}>{`👤 ${t('Contact card')}`}</Text>
          <Text style={ink} numberOfLines={2}>
            {name}
          </Text>
          {cards ? null : (
            <Row>
              <Button title={t('Show')} compact disabled={busy} onPress={() => void show()} />
            </Row>
          )}
        </>
      )}
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

/** In a group, the members whose names start as the @word typed at the end of `text`, each a chip that names them (`onPick`). */
export function MentionChips({ text, members, onPick }: { text: string; members: Nameable[]; onPick: (member: Nameable) => void }) {
  const typed = members.length ? typingMention(text) : null;
  const offered = typed !== null ? namesFor(typed, members) : [];
  if (!offered.length) return null;
  return (
    <Row wrap>
      {offered.map((member) => (
        <Chip key={member.identity} label={`@${member.name}`} onPress={() => onPick(member)} />
      ))}
    </Row>
  );
}
