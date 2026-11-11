// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';

import { t } from '../lib/i18n';
import type { OutgoingSticker } from '../lib/matrix-media';
import { stickerMeta, stickerPhoto } from '../lib/own-stickers';
import { photoUri, releaseUri } from '../lib/photo-uri';
import { pickSticker } from '../lib/pick-avatar';
import { stickerImage } from '../lib/sticker-image';
import { stickerToSend } from '../lib/sticker-send';
import { addOwnSticker, loadOwnStickers, MAX_OWN_STICKERS, openOwnSticker, type OwnSticker, type StickerPlace } from '../lock/sticker-data';
import { radius, space } from '../theme/colors';
import { useColors } from '../theme/context';

import { PhotoSticker, StickerPicker } from './stickers';
import { Button, Row, Sheet, Text } from './ui';

// The stickers a Matrix chat sends (app/matrix-chat.tsx), each as Matrix sends a sticker
// (lib/matrix-media.ts sendSticker), encrypted where the room is. Erevos's own sets, in the picker
// the Erevos chats have (components/stickers.tsx), go as their picture, made on this device
// (lib/sticker-send.ts), with their words for an app that shows only those. "Mine" holds those made
// here from photos, the space's or, in a hidden place's own account, that place's
// (lock/sticker-data.ts); a new one can be made from a photo there too, kept where the others are.

type Picture = { bytes: Uint8Array; uri: string };

const mimeOf = (bytes: Uint8Array) => (bytes[0] === 0x89 ? 'image/png' : 'image/jpeg');

export function MatrixStickers({ visible, place, onClose, onPick }: {
  visible: boolean;
  /** Whose stickers: the account's space's, or its hidden place's. */
  place: StickerPlace | null;
  onClose: () => void;
  onPick: (sticker: OutgoingSticker) => void;
}) {
  const colors = useColors();
  const [own, setOwn] = useState<OwnSticker[]>([]);
  const [pictures, setPictures] = useState<Record<string, Picture>>({});
  const [note, setNote] = useState('');
  const [making, setMaking] = useState(false);
  const held = useRef(pictures);
  held.current = pictures;
  // Whether the sheet still shows, and whether a built-in sticker's picture is being made: a tap more sends nothing more.
  const open = useRef(visible);
  open.current = visible;
  const drawing = useRef(false);

  // Read while the sheet shows; let go of as it closes.
  useEffect(() => {
    if (!visible || !place) return;
    let active = true;
    loadOwnStickers(place).then(
      (list) => active && setOwn(list),
      () => active && setOwn([]),
    );
    return () => {
      active = false;
      for (const picture of Object.values(held.current)) releaseUri(picture.uri);
      setPictures({});
    };
  }, [visible, place?.holder, place?.space, place?.key]);

  useEffect(() => {
    if (!visible) return;
    let active = true;
    for (const sticker of own) {
      if (held.current[sticker.id]) continue;
      openOwnSticker(sticker)
        .then((bytes) => {
          if (!bytes || !active) return;
          const picture = { bytes, uri: photoUri(bytes, mimeOf(bytes)) };
          setPictures((now) => ({ ...now, [sticker.id]: picture }));
        })
        .catch(() => undefined);
    }
    return () => {
      active = false;
    };
  }, [visible, own]);

  function pick(sticker: OwnSticker) {
    const picture = pictures[sticker.id];
    if (!picture) return;
    try {
      const bytes = stickerPhoto(picture.bytes);
      const { mime, w, h } = stickerMeta(bytes);
      onPick({ bytes, mime, ...(w && h ? { w, h } : {}) });
    } catch (error) {
      setNote(error instanceof Error ? error.message : String(error));
    }
  }

  // A built-in sticker, as its picture: when none could be made, nothing goes, and the sheet says so.
  async function pickBuiltIn(name: string) {
    if (drawing.current) return;
    drawing.current = true;
    setNote('');
    try {
      const picture = await stickerToSend(name, stickerImage);
      if (!open.current) return;
      if (picture) onPick(picture);
      else setNote(t('This sticker could not be made into a picture. Try again.'));
    } catch (error) {
      setNote(error instanceof Error ? error.message : String(error));
    } finally {
      drawing.current = false;
    }
  }

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
    <Sheet visible={visible} onClose={onClose} title={t('Sticker')}>
      <StickerPicker
        onPick={(name) => void pickBuiltIn(name)}
        ownTab={{
          place,
          view: (
            <>
              <Row wrap>
                <Button title={t('New sticker from a photo')} compact loading={making} disabled={!place} onPress={() => void make()} />
              </Row>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, justifyContent: 'center' }}>
                {own.map((sticker) => (
                  <Pressable
                    key={sticker.id}
                    onPress={() => pick(sticker)}
                    accessibilityRole="button"
                    accessibilityLabel={t('Sticker')}
                    style={({ pressed }) => ({ padding: 6, borderRadius: radius.md, backgroundColor: pressed ? colors.surfacePressed : 'transparent' })}
                  >
                    <PhotoSticker uri={pictures[sticker.id]?.uri} size={72} status="" />
                  </Pressable>
                ))}
              </View>
            </>
          ),
        }}
      />
      <Text variant="caption" tone="muted">
        {t('Stickers go to Matrix as pictures, encrypted where the chat is. Erevos’s own are drawn on your device, their words in your language.')}
      </Text>
      {note ? (
        <Text variant="caption" tone="muted">
          {note}
        </Text>
      ) : null}
    </Sheet>
  );
}
