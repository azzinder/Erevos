// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';

import { t } from '../lib/i18n';
import { stickerPhoto } from '../lib/own-stickers';
import { photoUri, releaseUri } from '../lib/photo-uri';
import { pickSticker } from '../lib/pick-avatar';
import { addOwnSticker, loadOwnStickers, MAX_OWN_STICKERS, openOwnSticker, type OwnSticker, type StickerPlace } from '../lock/sticker-data';
import { radius, space } from '../theme/colors';
import { useColors } from '../theme/context';

import { PhotoSticker } from './stickers';
import { Button, Row, Sheet, Text } from './ui';

// The stickers an XMPP chat sends (app/xmpp-chat.tsx): only those made here from photos ("Mine",
// lock/sticker-data.ts), the space's or, in a hidden place's chats, that place's own. One goes as a
// photo goes (lib/xmpp-files.ts), encrypted as the chat is, and the other XMPP apps show it as a
// photo, through the one way a sticker goes there (lib/xmpp-store.ts xmppSendSticker), which takes
// its picture alone, so a built-in one drawn as a still can go the same way. A sticker one of those
// apps sends (XEP-0449) names a pack on a server of theirs to fetch it from, so it is not fetched:
// it shows as what the message says besides.

/** The place's stickers made from photos, to send one; and a new one made from a photo. */
export function XmppStickerSheet({ visible, onClose, place, onPick }: {
  visible: boolean;
  onClose: () => void;
  /** Whose stickers: null while the account is not there. */
  place: StickerPlace | null;
  onPick: (sticker: OwnSticker) => void;
}) {
  const colors = useColors();
  const [own, setOwn] = useState<OwnSticker[]>([]);
  const [pictures, setPictures] = useState<Record<string, string>>({});
  const [note, setNote] = useState('');
  const [making, setMaking] = useState(false);
  const held = useRef(pictures);
  held.current = pictures;

  useEffect(() => {
    if (!visible || !place) return;
    let active = true;
    loadOwnStickers(place).then(
      (list) => active && setOwn(list),
      () => active && setOwn([]),
    );
    return () => {
      active = false;
    };
  }, [visible, place?.holder, place?.space, place?.key]);

  // Their pictures, read into memory while the sheet shows them.
  const ids = own.map((sticker) => sticker.id).join(',');
  useEffect(() => {
    if (!visible) return;
    let active = true;
    for (const sticker of own) {
      if (held.current[sticker.id]) continue;
      openOwnSticker(sticker)
        .then((bytes) => {
          if (!bytes || !active) return;
          const uri = photoUri(bytes, bytes[0] === 0x89 ? 'image/png' : 'image/jpeg');
          setPictures((now) => ({ ...now, [sticker.id]: uri }));
        })
        .catch(() => undefined);
    }
    return () => {
      active = false;
    };
  }, [visible, ids]);
  useEffect(
    () => () => {
      for (const uri of Object.values(held.current)) releaseUri(uri);
    },
    [],
  );

  async function make() {
    if (!place || making) return;
    if (own.length >= MAX_OWN_STICKERS) {
      setNote(t('You have {n} stickers, the most there can be. Delete one to make room.', { n: MAX_OWN_STICKERS }));
      return;
    }
    setMaking(true);
    setNote('');
    try {
      const picture = await pickSticker();
      if (!picture) return;
      setNote(t('Making the sticker…'));
      const made = await addOwnSticker(place, stickerPhoto(picture));
      setOwn((list) => [...list, made]);
      setNote('');
    } catch (error) {
      setNote(error instanceof Error ? error.message : String(error));
    } finally {
      setMaking(false);
    }
  }

  return (
    <Sheet visible={visible} onClose={onClose} title={t('Mine')}>
      <Row wrap>
        <Button title={t('New sticker from a photo')} compact loading={making} disabled={!place} onPress={() => void make()} />
      </Row>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, justifyContent: 'center' }}>
        {own.map((sticker) => (
          <Pressable
            key={sticker.id}
            onPress={() => onPick(sticker)}
            accessibilityRole="button"
            accessibilityLabel={t('Sticker')}
            style={({ pressed }) => ({ padding: 6, borderRadius: radius.md, backgroundColor: pressed ? colors.surfacePressed : 'transparent' })}
          >
            <PhotoSticker uri={pictures[sticker.id]} size={72} status="" />
          </Pressable>
        ))}
      </View>
      <Text variant="caption" tone="muted">
        {t('A sticker goes as a photo, encrypted as the chat is. Other XMPP apps show it as a photo.')}
      </Text>
      {note ? (
        <Text variant="caption" tone="muted">
          {note}
        </Text>
      ) : null}
    </Sheet>
  );
}
