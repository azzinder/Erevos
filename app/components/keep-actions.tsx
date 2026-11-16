// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { useEffect, useState } from 'react';
import { ScrollView } from 'react-native';

import { CAN_COLLECT, importFromBytes } from '../lib/collection-import';
import { t } from '../lib/i18n';
import { useModules } from '../lib/modules';
import { stickerMeta } from '../lib/own-stickers';
import { stickerFrom } from '../lib/sticker-from';
import { starGone, starsIn, type LiveMessage, type Star, type StarService } from '../lib/stars';
import { addOwnSticker, openOwnSticker, type OwnSticker } from '../lock/sticker-data';
import { loadStars, onStarsChange, starMessage, starPlaceName, type StarPlace } from '../lock/stars-data';
import { space } from '../theme/colors';

import { FoundRow } from './found-row';
import type { MenuAction } from './message-menu';
import { Button, Sheet } from './ui';

// What keeps a message of a chat on Matrix, XMPP or Nostr, or an SMS, as an Erevos chat keeps its
// own (app/chat.tsx): in its menu, Star (lib/stars.ts, on this device only, sealed with the
// account's place, the space's or a hidden place's own), Add to my stickers for a sticker or a
// photo that came (lib/sticker-from.ts), and Save to the Collection for its photo, video, sound or
// file, into the Collection of the same place, while the Collection is on. The file is fetched,
// and opened, only then, as Save does. Starred messages, in the chat, lists the chat's starred
// ones, each going to its message.

const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error));

// The endings of the types whose second part is not one.
const ENDINGS: Record<string, string> = { jpeg: 'jpg', mpeg: 'mp3', 'x-m4a': 'm4a', quicktime: 'mov', 'x-vcard': 'vcf', vcard: 'vcf', plain: 'txt' };

/** A file's name as the Collection keeps it: its own, or for one that came without (an MMS's part, a Nostr photo), what it is with its type's ending. */
export function keptName(name: string | undefined, mime: string): string {
  if (name?.trim()) return name;
  const [kind, sub = ''] = mime.toLowerCase().split(';')[0].split('/');
  const ending = ENDINGS[sub] ?? (/^[a-z0-9]{2,5}$/.test(sub) ? sub : '');
  const base = kind === 'image' ? 'photo' : kind === 'video' ? 'video' : kind === 'audio' ? 'voice' : 'file';
  return ending ? `${base}.${ending}` : base;
}

/** A message's file, to keep: its name and type, and how its bytes are had. */
export type KeepFile = { name: string; mime: string; fetch: () => Promise<Uint8Array> };

/** A message to star: its id, when it was written, whether ours, its line, and in Matrix the thread it is in. */
export type Starrable = { id: string; at: number; mine: boolean; line: string; thread?: string };

/**
 * The keeping of a chat's messages: `place` is the account's (null while it has none), `account`
 * whose it is ('' for SMS), `chat` the chat, `group` whether it is a group's, `messages` the chat as
 * the device has it now (the oldest first), to leave out the stars of messages gone, and `say`
 * where what happened is said.
 */
export function useKeep({ service, place, account, chat, group, messages, say }: {
  service: StarService;
  place: StarPlace | null;
  account: string;
  chat: string;
  group: boolean;
  messages: readonly LiveMessage[] | undefined;
  say: (text: string) => void;
}) {
  const modules = useModules();
  const [all, setAll] = useState<Star[]>([]);
  useEffect(() => {
    if (!place) {
      setAll([]);
      return;
    }
    let active = true;
    const read = () =>
      loadStars(place).then(
        (stars) => active && setAll(stars),
        () => active && setAll([]),
      );
    void read();
    const off = onStarsChange((changed) => changed === starPlaceName(place) && void read());
    return () => {
      active = false;
      off();
    };
  }, [place?.holder, place?.space, place?.key]);

  // The chat's starred messages that are still here, or older than what is kept. Read again each
  // time, as a chat's messages change in place.
  const stars = starsIn(all, service, account, chat).filter((star) => !messages || !starGone(star, messages));
  const starred = new Set(stars.map((star) => star.id));

  async function star(message: Starrable, on: boolean) {
    if (!place) return;
    try {
      setAll(await starMessage(place, { service, account, chat, id: message.id, at: message.at, mine: message.mine, line: message.line, ...(group ? { group: true as const } : {}), ...(message.thread ? { thread: message.thread } : {}) }, on));
    } catch (error) {
      say(errorText(error));
    }
  }

  async function keepSticker(fetch: () => Promise<Uint8Array>, remote: boolean) {
    if (!place) return;
    if (remote) say(t('Fetching…'));
    try {
      await addOwnSticker(place, await stickerFrom(await fetch()));
      say(t('Added to your stickers.'));
    } catch (error) {
      say(errorText(error));
    }
  }

  async function save(file: KeepFile, remote: boolean) {
    if (!place) return;
    if (remote) say(t('Fetching…'));
    try {
      await importFromBytes(place, { name: file.name, mime: file.mime, bytes: await file.fetch() });
      say(t('Saved to the Collection.'));
    } catch (error) {
      say(t('Not added. {error}', { error: errorText(error) }));
    }
  }

  /**
   * What a message's menu offers to keep it: Star or Unstar (`star`, when it can be), Add to my
   * stickers (`sticker`, how a sticker's or a photo's bytes are had) and Save to the Collection
   * (`file`); `remote` when those bytes are fetched from a server.
   */
  function actions({ star: message, sticker, file, remote = false }: { star?: Starrable | null; sticker?: (() => Promise<Uint8Array>) | null; file?: KeepFile | null; remote?: boolean }): MenuAction[] {
    if (!place) return [];
    const list: MenuAction[] = [];
    if (message) {
      const on = !starred.has(message.id);
      list.push({ title: on ? t('Star') : t('Unstar'), onPress: () => void star(message, on) });
    }
    if (sticker) list.push({ title: t('Add to my stickers'), onPress: () => void keepSticker(sticker, remote) });
    if (file && CAN_COLLECT && modules.has('collection')) list.push({ title: t('Save to the Collection'), onPress: () => void save(file, remote) });
    return list;
  }

  return { stars, starred, actions };
}

/** One of the owner's stickers as an MMS carries it: its picture and type. Throws when its picture is gone. */
export async function ownStickerPart(sticker: OwnSticker): Promise<{ bytes: Uint8Array; mime: string }> {
  const picture = await openOwnSticker(sticker);
  if (!picture) throw new Error(t("This sticker's picture is gone."));
  return { bytes: picture, mime: stickerMeta(picture).mime };
}

/**
 * The chat's starred messages, behind a button that says how many (none, no button): the latest
 * first, each going to its message once tapped. `who` names the chat, for those not ours.
 */
export function StarredHere({ stars, who, onGo, onGoing }: { stars: Star[]; who: string; onGo: (id: string) => void; /** Called as it goes: a sheet it shows in closes too. */ onGoing?: () => void }) {
  const [open, setOpen] = useState(false);
  if (stars.length === 0) return null;
  const now = Date.now();
  return (
    <>
      <Button title={`${t('Starred messages')} · ${stars.length}`} kind="secondary" compact onPress={() => setOpen(true)} />
      <Sheet visible={open} onClose={() => setOpen(false)} title={t('Starred messages')}>
        <ScrollView nestedScrollEnabled style={{ maxHeight: 420 }} contentContainerStyle={{ gap: space.xs }}>
          {[...stars]
            .sort((a, b) => b.at - a.at)
            .map((star) => (
              <FoundRow
                key={star.id}
                name={star.mine ? t('You') : who}
                line={star.line}
                at={star.at}
                now={now}
                starred
                onPress={() => {
                  setOpen(false);
                  onGoing?.();
                  // Once the sheet is down, so the thread scrolls under it.
                  setTimeout(() => onGo(star.id), 300);
                }}
              />
            ))}
        </ScrollView>
      </Sheet>
    </>
  );
}
