import { t } from '../lib/i18n';

import { deletePhoto, isPhotoRef, loadPhoto, savePhoto, type PhotoRef } from './avatar-photos';
import { sealedFile, type Holder } from './sealed-file';

// The stickers made here from photos (lib/own-stickers.ts), each space's and each of its hidden
// places' own: kept in FILE, one sealed value for each of them (sealed-file.ts), in blocks of BLOCK
// bytes, which hold MAX_OWN_STICKERS. Each sticker's picture is a photo sealed in a file of its
// own, as a contact's picture is (avatar-photos.ts): only the sticker's value holds its key. So
// stickers made in hidden chats show only there, and nothing tells they are there. They go with
// the rest of the phone into a backup (backup.ts), sealed as they are, and are never passed on to
// the account's other devices (lib/devices.ts).

/** A sticker made here: where its picture is sealed. */
export type OwnSticker = PhotoRef;

/** Whose stickers: a space's or one of its hidden places', as its key opens it. */
export type StickerPlace = { holder: Holder; space: number; key: Uint8Array };

type StickerData = { stickers: OwnSticker[] };

export const FILE = 'erevos-stickers';
const BLOCK = 16 * 1024;

/** The most stickers a space, or a hidden place, keeps. */
export const MAX_OWN_STICKERS = 100;

export class TooManyStickersError extends Error {
  constructor() {
    super(t('You have {n} stickers, the most there can be. Delete one to make room.', { n: MAX_OWN_STICKERS }));
  }
}

function checked(value: unknown): StickerData {
  const v = value as { stickers?: unknown } | null;
  const list = Array.isArray(v?.stickers) ? v.stickers.filter(isPhotoRef) : [];
  return { stickers: list.slice(0, MAX_OWN_STICKERS).map(({ id, key }) => ({ id, key })) };
}

const store = sealedFile({ name: FILE, empty: { stickers: [] } as StickerData, checked, block: BLOCK });

// Changes to a place's stickers run one after another, each on what the one before left.
const changes = new Map<string, Promise<unknown>>();

function change<T>({ holder, space }: StickerPlace, run: () => Promise<T>): Promise<T> {
  const name = `${holder}/${space}`;
  const next = (changes.get(name) ?? Promise.resolve()).catch(() => undefined).then(run);
  changes.set(name, next);
  return next;
}

/** A place's stickers, the newest last. */
export async function loadOwnStickers({ holder, space, key }: StickerPlace): Promise<OwnSticker[]> {
  return (await store.load(holder, space, key)).stickers;
}

/** Keeps a picture as a new sticker of the place, last. Throws TooManyStickersError when it has its most. */
export function addOwnSticker(place: StickerPlace, picture: Uint8Array): Promise<OwnSticker> {
  return change(place, async () => {
    const { holder, space, key } = place;
    const { stickers } = await store.load(holder, space, key);
    if (stickers.length >= MAX_OWN_STICKERS) throw new TooManyStickersError();
    const made = await savePhoto(picture);
    try {
      await store.save(holder, space, key, { stickers: [...stickers, made] });
    } catch (error) {
      await deletePhoto(made.id).catch(() => undefined);
      throw error;
    }
    return made;
  });
}

/** Deletes one of the place's stickers, and its picture. What was sent with it stays where it went. */
export function removeOwnSticker(place: StickerPlace, id: string): Promise<void> {
  return change(place, async () => {
    const { holder, space, key } = place;
    const { stickers } = await store.load(holder, space, key);
    if (!stickers.some((sticker) => sticker.id === id)) return;
    await store.save(holder, space, key, { stickers: stickers.filter((sticker) => sticker.id !== id) });
    await deletePhoto(id).catch(() => undefined);
  });
}

/** A sticker's picture, or null when its file is gone. */
export const openOwnSticker = (sticker: OwnSticker): Promise<Uint8Array | null> => loadPhoto(sticker);
