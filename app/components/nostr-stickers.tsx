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
import { Button, Row, Text } from './ui';

// The stickers a Nostr chat sends (app/nostr-chat.tsx): those made here from photos, "Mine"
// (lib/own-stickers.ts), of the place the chat is in, the space's or its hidden place's. One goes
// as a photo goes (kind 15, encrypted, through the file server), so any Nostr app shows it, as a
// photo: NIP-17 has no stickers, and the built-in ones are drawn by Erevos alone, with no picture
// to send. Their pictures are read into memory while this shows, and let go after.

export function NostrStickers({ place, onPick }: { place: StickerPlace; onPick: (picture: Uint8Array) => void }) {
  const colors = useColors();
  const [own, setOwn] = useState<OwnSticker[]>([]);
  const [pictures, setPictures] = useState<Record<string, string>>({});
  const [note, setNote] = useState('');
  const [making, setMaking] = useState(false);
  const held = useRef(pictures);
  held.current = pictures;

  useEffect(() => {
    let active = true;
    loadOwnStickers(place).then(
      (list) => active && setOwn(list),
      () => active && setOwn([]),
    );
    return () => {
      active = false;
    };
  }, [place.holder, place.space, place.key]);

  const ids = own.map((sticker) => sticker.id).join(',');
  useEffect(() => {
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
  }, [ids]);
  useEffect(
    () => () => {
      for (const uri of Object.values(held.current)) releaseUri(uri);
    },
    [],
  );

  async function pick(sticker: OwnSticker) {
    setNote('');
    try {
      const picture = await openOwnSticker(sticker);
      if (!picture) throw new Error(t("This sticker's picture is gone."));
      onPick(picture);
    } catch (error) {
      setNote(error instanceof Error ? error.message : String(error));
    }
  }

  async function make() {
    if (making) return;
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
    <View style={{ gap: space.md }}>
      <Row wrap>
        <Button title={t('New sticker from a photo')} kind="secondary" compact loading={making} onPress={() => void make()} />
      </Row>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, justifyContent: 'center' }}>
        {own.map((sticker) => (
          <Pressable
            key={sticker.id}
            onPress={() => void pick(sticker)}
            accessibilityRole="button"
            accessibilityLabel={t('Sticker')}
            style={({ pressed }) => ({ padding: 6, borderRadius: radius.md, backgroundColor: pressed ? colors.surfacePressed : 'transparent' })}
          >
            <PhotoSticker uri={pictures[sticker.id]} size={72} status="" />
          </Pressable>
        ))}
      </View>
      <Text variant="caption" tone="muted">
        {t('Your stickers go as photos do, encrypted: other Nostr apps show them as photos.')}
      </Text>
      {note ? (
        <Text variant="caption" tone="muted">
          {note}
        </Text>
      ) : null}
    </View>
  );
}
