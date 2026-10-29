import { sha256Bytes, toHex } from './crypto';
import { deleteFile, readBytes, readFile, writeBytes, writeFile } from './files';

// The pieces of a photo that goes through Nostr (lib/nostr-send-files.ts). A wrap carries 48 KB at
// most, so a photo goes in pieces of 32 KB, each sealed with the file's own key (lib/attachments.ts
// sealChunk), each in a wrap of its own: these two bytes, then the sealed piece. A piece's id is
// the first 24 bytes of its SHA-256; the message that offers the photo lists the ids in order, so a
// piece that was changed, or is none of the photo's, is not taken, and wraps that come in any order
// are put back in order. Wraps reach a phone before the message does, or after: pieces are kept
// here, as they came, until the photo is taken, for a few days at most and a few hundred pieces,
// the oldest dropped first. Anyone who knows the key a chat reads with can put a piece here, but
// not make one that opens with a photo's key: the most it costs is room, which is why it is capped.

const MARK = [9, 2];

/** How many pieces are kept, and for how long, milliseconds. */
export const PIECES_MOST = 1000;
export const PIECES_LAST = 4 * 24 * 3600_000;

const INDEX = 'erevos-pieces-index';
const nameOf = (id: string) => `erevos-piece-${id}`;
const ID = /^[0-9a-f]{48}$/;

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

// Changes to the index, one after another.
let queue: Promise<unknown> = Promise.resolve();
function changing<T>(change: () => Promise<T>): Promise<T> {
  const next = queue.then(change, change);
  queue = next.catch(() => undefined);
  return next;
}

async function readIndex(): Promise<[string, number][]> {
  try {
    const list = JSON.parse((await readFile(INDEX)) ?? '[]') as unknown;
    return Array.isArray(list) ? list.filter((e): e is [string, number] => Array.isArray(e) && typeof e[0] === 'string' && ID.test(e[0]) && typeof e[1] === 'number') : [];
  } catch {
    return [];
  }
}

/** Keeps the piece a wrap carried (`isPiece`); one already kept is left. */
export function keepPiece(wrap: Uint8Array, now = Date.now()): Promise<void> {
  const sealed = wrap.slice(MARK.length);
  const id = pieceId(sealed);
  return changing(async () => {
    const index = await readIndex();
    if (index.some(([kept]) => kept === id)) return;
    await writeBytes(nameOf(id), sealed);
    const fresh = index.filter(([, at]) => now - at < PIECES_LAST);
    const left = [...fresh, [id, now] as [string, number]];
    const dropped = [...index.filter(([, at]) => now - at >= PIECES_LAST), ...left.splice(0, Math.max(0, left.length - PIECES_MOST))];
    for (const [old] of dropped) await deleteFile(nameOf(old)).catch(() => undefined);
    await writeFile(INDEX, JSON.stringify(left));
    listeners.forEach((listener) => listener());
  });
}

/** The sealed piece with this id, or null when it has not come. */
export function readPiece(id: string): Promise<Uint8Array | null> {
  return ID.test(id) ? readBytes(nameOf(id)) : Promise.resolve(null);
}

/** Which of these ids (hex, one after another) have come. */
export async function piecesCame(ids: string): Promise<boolean[]> {
  const index = new Set((await readIndex()).map(([id]) => id));
  return Array.from({ length: ids.length / 48 }, (_, n) => index.has(ids.slice(n * 48, (n + 1) * 48)));
}

/** Drops the pieces with these ids (hex, one after another): the photo was taken. */
export function dropPieces(ids: string): Promise<void> {
  return changing(async () => {
    const gone = new Set<string>();
    for (let at = 0; at + 48 <= ids.length; at += 48) gone.add(ids.slice(at, at + 48));
    const index = await readIndex();
    for (const id of gone) await deleteFile(nameOf(id)).catch(() => undefined);
    await writeFile(INDEX, JSON.stringify(index.filter(([id]) => !gone.has(id))));
  });
}
