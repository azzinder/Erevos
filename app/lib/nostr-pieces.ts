import { decryptBytes, encryptBytes, randomBytes, sha256Bytes, toHex } from './crypto';
import { deleteFile, listFiles, readBytes, readFile, writeBytes, writeFile } from './files';
import { NOSTR_PIECE } from '../lock/attachment-files';
import { loadPiecesData, savePiecesData, type KeptPiece } from '../lock/nostr-pieces-data';
import { PAGE, PAGE_PREFIX, type Holder } from '../lock/sealed-file';

// The pieces of a photo that goes through Nostr (lib/nostr-send-files.ts). A wrap carries 48 KB at
// most, so a photo goes in pieces of 32 KB, each sealed with the file's own key (lib/attachments.ts
// sealChunk), each in a wrap of its own: these two bytes, then the sealed piece. A piece's id is
// the first 24 bytes of its SHA-256; the message that offers the photo lists the ids in order, so a
// piece that was changed, or is none of the photo's, is not taken, and wraps that come in any order
// are put back in order. Wraps reach a phone before the message does, or after.
//
// A piece is kept by the place it came for, the space or a hidden place whose key it was read
// with (lib/nostr.ts), in that place's encrypted storage (lock/nostr-pieces-data.ts): which pieces
// it holds and when they came in its sealed value, each piece in two pages sealed with its key,
// alike to the history's pages and lying among them. So nothing outside a place's password says
// whether it waits for pieces, nor how many. They are kept until the photo is taken, for four days
// at most, PIECES_MOST of them in each place at most, the oldest dropped first. Anyone who knows
// the key a chat reads with can put a piece there, but not make one that opens with a photo's key:
// the most it costs is room, which is why it is capped.
//
// A piece that comes while no place can take it is held in memory only, never written, a few at
// most and for this run, until a place whose photo names it takes it (piecesCame), into its own
// storage. Pieces an Erevos from before kept, all places' together, in files of their own, go the
// same way: into the first place whose photo names them, or deleted once four days old.

const MARK = [9, 2];

/** How many pieces a place keeps, how many bytes, and for how long, milliseconds. */
export const PIECES_MOST = 1000;
export const PIECES_BYTES = PIECES_MOST * NOSTR_PIECE;
export const PIECES_LAST = 4 * 24 * 3600_000;

/** How many pieces are held in memory while no place takes them. */
export const HELD_MOST = 128;

/** Where a place keeps its pieces: the space's own, or a hidden place's, sealed with its key. */
export type PiecePlace = { holder: Holder; space: number; key: Uint8Array };

const ID = /^[0-9a-f]{48}$/;
const PAGE_ID = 24;
const newPageId = () => toHex(randomBytes(PAGE_ID / 2));

const listeners = new Set<() => void>();

/** Has `listener` called whenever a piece was kept. Returns how to stop. */
export function onPiece(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Whether what a wrap carried is a piece. */
export function isPiece(bytes: Uint8Array): boolean {
  return bytes.length > MARK.length && bytes[0] === MARK[0] && bytes[1] === MARK[1];
}

/** What a wrap carries for the sealed piece. */
export function wrapPiece(sealed: Uint8Array): Uint8Array {
  const out = new Uint8Array(MARK.length + sealed.length);
  out.set(MARK);
  out.set(sealed, MARK.length);
  return out;
}

/** The id of a sealed piece: the first 24 bytes of its SHA-256, hex. */
export const pieceId = (sealed: Uint8Array): string => toHex(sha256Bytes(sealed)).slice(0, 48);

const idsOf = (ids: string): string[] => Array.from({ length: Math.floor(ids.length / 48) }, (_, n) => ids.slice(n * 48, (n + 1) * 48));

// Changes, one after another, and reads between them.
let queue: Promise<unknown> = Promise.resolve();
function changing<T>(change: () => Promise<T>): Promise<T> {
  const next = queue.then(change, change);
  queue = next.catch(() => undefined);
  return next;
}

// Held in memory while no place takes them: by id, oldest first.
const held = new Map<string, { sealed: Uint8Array; at: number }>();

function hold(id: string, sealed: Uint8Array, now: number): void {
  for (const [old, { at }] of held) if (now - at >= PIECES_LAST) held.delete(old);
  if (held.has(id)) return;
  held.set(id, { sealed, at: now });
  while (held.size > HELD_MOST) held.delete(held.keys().next().value as string);
}

/** How many pieces are held in memory now. */
export const heldPieces = (): number => held.size;

// A place's pieces kept: its pages written, sealed with its key.
async function writePages(key: Uint8Array, sealed: Uint8Array): Promise<string> {
  let pages = '';
  for (let at = 0; at < sealed.length; at += PAGE) {
    const id = newPageId();
    await writeBytes(PAGE_PREFIX + id, encryptBytes(key, sealed.slice(at, at + PAGE)));
    pages += id;
  }
  return pages;
}

async function readPages(key: Uint8Array, [id, , pages]: KeptPiece): Promise<Uint8Array | null> {
  const sealed = new Uint8Array(NOSTR_PIECE);
  for (let n = 0; n < NOSTR_PIECE / PAGE; n++) {
    const page = await readBytes(PAGE_PREFIX + pages.slice(n * PAGE_ID, (n + 1) * PAGE_ID));
    if (!page) return null;
    let bytes: Uint8Array;
    try {
      bytes = decryptBytes(key, page);
    } catch {
      return null;
    }
    if (bytes.length !== PAGE) return null;
    sealed.set(bytes, n * PAGE);
  }
  return pieceId(sealed) === id ? sealed : null;
}

async function deletePages(gone: KeptPiece[]): Promise<void> {
  for (const [, , pages] of gone) {
    for (let n = 0; n < pages.length; n += PAGE_ID) await deleteFile(PAGE_PREFIX + pages.slice(n, n + PAGE_ID)).catch(() => undefined);
  }
}

// What a place keeps once the ones too old, too many or too much are dropped, the oldest first.
function within(pieces: KeptPiece[], now: number): { left: KeptPiece[]; gone: KeptPiece[] } {
  const gone = pieces.filter(([, at]) => now - at >= PIECES_LAST || at > now + PIECES_LAST);
  const left = pieces.filter((piece) => !gone.includes(piece));
  const most = Math.min(PIECES_MOST, Math.floor(PIECES_BYTES / NOSTR_PIECE));
  if (left.length > most) gone.push(...left.splice(0, left.length - most));
  return { left, gone };
}

// Changes a place's pieces: `change` gives what it keeps then, and the pages to delete once that
// is saved; null when nothing changed.
async function changePlace(place: PiecePlace, change: (pieces: KeptPiece[]) => Promise<{ pieces: KeptPiece[]; gone: KeptPiece[] } | null>): Promise<void> {
  const { holder, space, key } = place;
  const { pieces } = await loadPiecesData(holder, space, key);
  const changed = await change(pieces);
  if (!changed) return;
  await savePiecesData(holder, space, key, { pieces: changed.pieces });
  await deletePages(changed.gone);
}

/**
 * Keeps the piece a wrap carried (`isPiece`) in `place`, or in memory while there is none. One
 * already kept is left; one of another size than a piece's is none of a photo's, and dropped.
 */
export function keepPiece(place: PiecePlace | null, wrap: Uint8Array, now = Date.now()): Promise<void> {
  const sealed = wrap.slice(MARK.length);
  if (sealed.length !== NOSTR_PIECE) return Promise.resolve();
  const id = pieceId(sealed);
  return changing(async () => {
    if (!place) hold(id, sealed, now);
    else {
      try {
        await changePlace(place, async (pieces) => {
          if (pieces.some(([kept]) => kept === id)) return null;
          const { left, gone } = within([...pieces, [id, now, await writePages(place.key, sealed)]], now);
          return { pieces: left, gone };
        });
      } catch {
        // Its storage could not be read or written now: held, as for no place.
        hold(id, sealed, now);
      }
    }
    listeners.forEach((listener) => listener());
  });
}

/**
 * Which of these ids (hex, one after another) have come for `place`: kept there, or held in memory
 * or by an Erevos from before, which are then kept there, as its photo names them. With no place,
 * which are held.
 */
export function piecesCame(place: PiecePlace | null, ids: string, now = Date.now()): Promise<boolean[]> {
  const wanted = idsOf(ids);
  return changing(async () => {
    const old = await readLegacy();
    if (!place) return wanted.map((id) => held.has(id) || old.some(([kept]) => kept === id));
    let came = new Set<string>();
    const moved: string[] = [];
    await changePlace(place, async (pieces) => {
      came = new Set(pieces.map(([id]) => id));
      const added: KeptPiece[] = [];
      for (const id of wanted) {
        if (came.has(id)) continue;
        const was = held.get(id);
        const at = was?.at ?? old.find(([kept]) => kept === id)?.[1];
        const sealed = was?.sealed ?? (at !== undefined ? await readBytes(legacyName(id)) : null);
        if (at === undefined || !sealed || sealed.length !== NOSTR_PIECE || pieceId(sealed) !== id) continue;
        added.push([id, Math.min(at, now), await writePages(place.key, sealed)]);
        moved.push(id);
      }
      if (added.length === 0) return null;
      const { left, gone } = within([...pieces, ...added], now);
      came = new Set(left.map(([id]) => id));
      return { pieces: left, gone };
    });
    for (const id of moved) held.delete(id);
    await dropLegacy(moved);
    return wanted.map((id) => came.has(id));
  });
}

/** The sealed pieces with these ids (hex, one after another), as `place` keeps them, or null for each that it does not. With no place, those held. */
export function readPieces(place: PiecePlace | null, ids: string): Promise<(Uint8Array | null)[]> {
  const wanted = idsOf(ids);
  return changing(async () => {
    if (!place) {
      const old = await readLegacy();
      return Promise.all(wanted.map(async (id) => held.get(id)?.sealed ?? (old.some(([kept]) => kept === id) ? await readBytes(legacyName(id)) : null)));
    }
    const { pieces } = await loadPiecesData(place.holder, place.space, place.key);
    const out: (Uint8Array | null)[] = [];
    for (const id of wanted) {
      const kept = pieces.find(([k]) => k === id);
      out.push(kept ? await readPages(place.key, kept) : null);
    }
    return out;
  });
}

/** Drops the pieces with these ids (hex, one after another) that `place` keeps, or held ones with no place: the photo was taken. */
export function dropPieces(place: PiecePlace | null, ids: string): Promise<void> {
  const gone = new Set(idsOf(ids));
  return changing(async () => {
    if (!place) {
      for (const id of gone) held.delete(id);
      await dropLegacy([...gone]);
      return;
    }
    await changePlace(place, async (pieces) => {
      const dropped = pieces.filter(([id]) => gone.has(id));
      return dropped.length === 0 ? null : { pieces: pieces.filter(([id]) => !gone.has(id)), gone: dropped };
    });
  });
}

/**
 * Drops what `place` kept too long, and what an Erevos from before kept that is four days old,
 * as the place opens. Writes nothing when nothing goes.
 */
export function sweepPieces(place: PiecePlace, now = Date.now()): Promise<void> {
  return changing(async () => {
    await changePlace(place, async (pieces) => {
      const { left, gone } = within(pieces, now);
      return gone.length === 0 ? null : { pieces: left, gone };
    });
    await sweepLegacy(now);
  });
}

// What an Erevos from before kept: an index of the pieces with when each came, all places'
// together, and each piece in a file of its own, as it came.
const LEGACY_INDEX = 'erevos-pieces-index';
const LEGACY_PREFIX = 'erevos-piece-';
const legacyName = (id: string) => `${LEGACY_PREFIX}${id}`;
// Whether its files were looked for, this run, once its index was gone.
let legacySwept = false;

async function readLegacy(): Promise<[string, number][]> {
  try {
    const list = JSON.parse((await readFile(LEGACY_INDEX)) ?? '[]') as unknown;
    return Array.isArray(list) ? list.filter((e): e is [string, number] => Array.isArray(e) && typeof e[0] === 'string' && ID.test(e[0]) && typeof e[1] === 'number') : [];
  } catch {
    return [];
  }
}

async function writeLegacy(left: [string, number][]): Promise<void> {
  if (left.length > 0) await writeFile(LEGACY_INDEX, JSON.stringify(left));
  else await deleteFile(LEGACY_INDEX).catch(() => undefined);
}

async function dropLegacy(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const old = await readLegacy();
  const gone = new Set(ids.filter((id) => old.some(([kept]) => kept === id)));
  if (gone.size === 0) return;
  for (const id of gone) await deleteFile(legacyName(id)).catch(() => undefined);
  await writeLegacy(old.filter(([id]) => !gone.has(id)));
}

async function sweepLegacy(now: number): Promise<void> {
  const there = (await readFile(LEGACY_INDEX)) !== null;
  if (!there && legacySwept) return;
  const old = await readLegacy();
  const gone = old.filter(([, at]) => now - at >= PIECES_LAST || at > now + PIECES_LAST);
  for (const [id] of gone) await deleteFile(legacyName(id)).catch(() => undefined);
  const left = old.filter((entry) => !gone.includes(entry));
  if (gone.length > 0 || (there && left.length === 0)) await writeLegacy(left);
  if (left.length > 0) return;
  // None left: a file its index no longer named, left by one that stopped between the two, goes too.
  for (const name of await listFiles(LEGACY_PREFIX).catch(() => [] as string[])) await deleteFile(name).catch(() => undefined);
  legacySwept = true;
}
