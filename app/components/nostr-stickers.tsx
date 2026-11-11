// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';

import { t } from '../lib/i18n';
import { stickerPhoto } from '../lib/own-stickers';
import { photoUri, releaseUri } from '../lib/photo-uri';
import { pickSticker } from '../lib/pick-avatar';
import { stickerImage } from '../lib/sticker-image';
import { stickerToSend, type StickerToSend } from '../lib/sticker-send';
import { addOwnSticker, loadOwnStickers, MAX_OWN_STICKERS, openOwnSticker, type OwnSticker, type StickerPlace } from '../lock/sticker-data';
import { radius, space } from '../theme/colors';
import { useColors } from '../theme/context';

import { PhotoSticker, StickerPicker } from './stickers';
import { Button, Row, Text } from './ui';

// The stickers a Nostr chat sends (app/nostr-chat.tsx): Erevos's own sets, in the picker the
// Erevos chats have (components/stickers.tsx), each as its picture made on this device
// (lib/sticker-send.ts), and those made here from photos, "Mine" (lib/own-stickers.ts), of the
// place the chat is in, the space's or its hidden place's. One goes as a photo goes (kind 15,
// encrypted, through the file server), so any Nostr app shows it, as a photo: NIP-17 has no
// stickers. Their pictures are read into memory while this shows, and let go after.

export function NostrStickers({ place, onPick, onBuiltIn }: {
  place: StickerPlace;
  onPick: (picture: Uint8Array) => void;
  /** A built-in sticker, as its picture. */
  onBuiltIn: (sticker: StickerToSend) => void;
}) {
  const colors = useColors();
  const [own, setOwn] = useState<OwnSticker[]>([]);
  const [pictures, setPictures] = useState<Record<string, string>>({});
  const [note, setNote] = useState('');
  const [making, setMaking] = useState(false);
  const held = useRef(pictures);
  held.current = pictures;
  // Whether this still shows, and whether a built-in sticker's picture is being made: a tap more sends nothing more.
  const shown = useRef(true);
  useEffect(() => {
    shown.current = true;
    return () => {
      shown.current = false;
    };
  }, []);
  const drawing = useRef(false);

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

  // A built-in sticker, as its picture: when none could be made, nothing goes, and this says so.
  async function pickBuiltIn(name: string) {
    if (drawing.current) return;
    drawing.current = true;
    setNote('');
    try {
      const picture = await stickerToSend(name, stickerImage);
      if (!shown.current) return;
      if (picture) onBuiltIn(picture);
      else setNote(t('This sticker could not be made into a picture. Try again.'));
    } catch (error) {
      setNote(error instanceof Error ? error.message : String(error));
    } finally {
      drawing.current = false;
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
      <StickerPicker
        onPick={(name) => void pickBuiltIn(name)}
        ownTab={{
          place,
          view: (
            <>
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
            </>
          ),
        }}
      />
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
