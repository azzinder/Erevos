// Photos and files sent to a contact, in the style of SimpleX's XFTP. The phone encrypts the file
// with a key of its own, in chunks of one of three sizes, every chunk of a file the same size, and
// puts them on its relay's file store. Only where they are and the key go to the contact, inside
// an end-to-end message (FileOffer, in lib/e2e.ts). The contact's phone takes the chunks through
// its own relay, checks each, keeps them as they came (lock/attachment-files.ts) and deletes them
// from the relay. Chunks nobody takes expire on the relay after 14 days.
//
// Each chunk holds its place in the file and how much of it is the file, then zeros to its size,
// all sealed with AES-256-GCM: a chunk cannot be changed, swapped with another or left out unseen.
// The relay sees how many chunks there are and their size, so roughly how big the file is, and
// which addresses put and took them. Self-contained on purpose, so it can run under plain Node for
// checks.

import { decryptBytes, encryptBytes, fromHex, randomBytes, toHex } from './crypto';
import { deleteChunk, getChunk, isLentToken, putChunk, RelaySession, relayPath, sameRelay, type Relay } from './relay';
import {
  CHUNK_SIZES,
  cleanFileName,
  cleanMime,
  deleteChunks,
  fitsSticker,
  isFileMeta,
  newFileId,
  readChunk,
  saveChunk,
  type FileMeta,
  type FileRef,
} from '../lock/attachment-files';
import { t } from './i18n';

/** The largest file that can be sent. */
export const MAX_FILE = 100 * 1000 * 1000;

/** Photos and files that came, up to this size, are taken from the relay as soon as they come. */
export const AUTO_TAKE = 16 * 1000 * 1000;

/** Where a file that came waits on the relay until taken: the relay, and its chunks' ids (hex, one after another). */
export type FileFrom = NonNullable<FileRef['from']>;

/**
 * What the account's other devices (lib/devices.ts) need of the files taken here: whether a file
 * stays on the relay for now, as another of them still takes it, and to hear once it was taken,
 * and whether it was left there. The one that takes it last has it deleted there.
 */
export type TakenFiles = { leave(from: FileFrom): boolean; taken(from: FileFrom, left: boolean): void };

let takenFiles: TakenFiles | null = null;

/** Who hears of the files the open space's chats take from now on, or no one. */
export function watchTakenFiles(watch: TakenFiles | null): void {
  takenFiles = watch;
}

// The nonce and tag AES-GCM adds, and the chunk's place and length.
const SEALING = 12 + 16;
const HEAD = 8;
const ID_HEX = 48;

/** How much of a file fits in a chunk of `chunk` bytes. */
export const room = (chunk: number) => chunk - SEALING - HEAD;

/** The chunk size for a file of `size` bytes, and how many chunks it takes. */
export function chunkPlan(size: number): { chunk: number; count: number } {
  for (const chunk of CHUNK_SIZES.slice(0, -1)) if (size <= room(chunk)) return { chunk, count: 1 };
  const chunk = CHUNK_SIZES[CHUNK_SIZES.length - 1];
  return { chunk, count: Math.max(1, Math.ceil(size / room(chunk))) };
}

/** What a message carries for a file: where its chunks are, their ids (hex, one after another) and the key. */
export type FileOffer = FileMeta & { relay: string; ids: string; key: string; chunk: number };

export class FileTooLargeError extends Error {
  constructor() {
    super(t('Files can be 100 MB at most.'));
  }
}

/** A chunk that does not open with the file's key, or is not the one expected. */
export class FileDamagedError extends Error {
  constructor() {
    super(t('The file was changed on the way, so it was not kept.'));
  }
}

/** The file is not on the relay any more: taken already, or expired after 14 days. */
export class FileGoneError extends Error {
  constructor() {
    super(t('The file is not on the relay any more. Files wait there 14 days.'));
  }
}

/** Seals the `index`th piece of a file into a chunk of `chunk` bytes. */
export function sealChunk(key: Uint8Array, index: number, data: Uint8Array, chunk: number): Uint8Array {
  if (data.length > room(chunk)) throw new Error('too much for one chunk');
  const plain = new Uint8Array(chunk - SEALING);
  const view = new DataView(plain.buffer);
  view.setUint32(0, index);
  view.setUint32(4, data.length);
  plain.set(data, HEAD);
  return encryptBytes(key, plain);
}

/** The piece of the file in a chunk. Throws FileDamagedError unless it is the `index`th, whole. */
export function openChunk(key: Uint8Array, index: number, sealed: Uint8Array, chunk: number): Uint8Array {
  if (sealed.length !== chunk) throw new FileDamagedError();
  let plain: Uint8Array;
  try {
    plain = decryptBytes(key, sealed);
  } catch {
    throw new FileDamagedError();
  }
  const view = new DataView(plain.buffer, plain.byteOffset, plain.byteLength);
  const length = view.getUint32(4);
  if (view.getUint32(0) !== index || length > plain.length - HEAD) throw new FileDamagedError();
  return plain.slice(HEAD, HEAD + length);
}

const isRelayAddress = (value: unknown): value is string => typeof value === 'string' && /^wss?:\/\/\S+$/.test(value) && value.length <= 512;

/** A FileOffer from a message, or null if it is not a well-formed one. */
export function readOffer(value: unknown): FileOffer | null {
  const v = value as Partial<FileOffer> | null;
  if (!v || typeof v !== 'object') return null;
  const meta = {
    name: cleanFileName(typeof v.name === 'string' ? v.name : ''),
    mime: cleanMime(v.mime),
    kind: v.kind,
    size: v.size,
    ...(v.w !== undefined ? { w: v.w } : {}),
    ...(v.h !== undefined ? { h: v.h } : {}),
  };
  if (!isFileMeta(meta) || meta.size > MAX_FILE || !isRelayAddress(v.relay)) return null;
  if (typeof v.key !== 'string' || !/^[0-9a-f]{64}$/.test(v.key) || typeof v.ids !== 'string' || !/^(?:[0-9a-f]{48})+$/.test(v.ids)) return null;
  const plan = chunkPlan(meta.size);
  if (v.chunk !== plan.chunk || v.ids.length !== plan.count * ID_HEX) return null;
  // A sticker made from a photo, when it is small enough to be one; otherwise a photo.
  const sticker = v.sticker === true && fitsSticker(meta) ? { sticker: true as const } : {};
  return { ...meta, ...sticker, relay: v.relay, ids: v.ids, key: v.key, chunk: v.chunk };
}

// What a file to send says of itself, cleaned: a sticker only while it is small enough to be one.
function shaped({ sticker, ...meta }: Omit<FileMeta, 'size'>, size: number): FileMeta {
  const clean: FileMeta = { ...meta, name: cleanFileName(meta.name), mime: cleanMime(meta.mime), size };
  return sticker && fitsSticker(clean) ? { ...clean, sticker } : clean;
}

/** Where a file that came is, until it is taken: its chunks are still on the relay. */
export function offerRef({ relay, ids, key, chunk, ...meta }: FileOffer): FileRef {
  return { ...meta, id: newFileId(), key, chunk, count: ids.length / ID_HEX, from: { relay, ids } };
}

/** Where to read a file to send from: how big it is, and its bytes from `at`, `length` of them. */
export type Source = { size: number; read(at: number, length: number): Promise<Uint8Array> };

export function bytesSource(bytes: Uint8Array): Source {
  return { size: bytes.length, read: async (at, length) => bytes.subarray(at, at + length) };
}

type Progress = (done: number, count: number) => void;

/**
 * Encrypts a file, keeps its chunks here and puts them on our relay (`own`, straight, not through
 * a second relay). Returns where it is kept, and the offer for the contact. If the relay cannot
 * take all of it, nothing is kept, here or there.
 */
export async function sendFile(
  own: Relay,
  source: Source,
  meta: Omit<FileMeta, 'size'>,
  progress?: Progress,
): Promise<{ ref: FileRef; offer: FileOffer }> {
  const size = source.size;
  if (size > MAX_FILE) throw new FileTooLargeError();
  const { chunk, count } = chunkPlan(size);
  const key = randomBytes(32);
  const id = newFileId();
  const ids: string[] = [];
  const session = await RelaySession.open({ url: own.url, token: own.token }, true);
  try {
    for (let n = 0; n < count; n++) {
      const at = n * room(chunk);
      const sealed = sealChunk(key, n, await source.read(at, Math.min(room(chunk), size - at)), chunk);
      await saveChunk(id, n, sealed);
      ids.push(toHex(await putChunk(session, sealed)));
      progress?.(n + 1, count);
    }
  } catch (error) {
    await deleteChunks(id, count).catch(() => undefined);
    for (const put of ids) await deleteChunk(session, fromHex(put)).catch(() => undefined);
    throw error;
  } finally {
    session.close();
  }
  const ref: FileRef = { ...shaped(meta, size), id, key: toHex(key), chunk, count };
  const { id: _id, count: _count, ...shared } = ref;
  return { ref, offer: { ...shared, relay: own.url, ids: ids.join('') } };
}

/**
 * Encrypts a file and keeps its chunks here only, to put on the relay later (uploadFile): a photo
 * or file that waits (lib/waiting.ts), or one brought in with an imported chat, which may be
 * larger (`most`). If any of it cannot be kept, nothing is.
 */
export async function keepFile(source: Source, meta: Omit<FileMeta, 'size'>, progress?: Progress, most = MAX_FILE): Promise<FileRef> {
  const size = source.size;
  if (size > most) throw new FileTooLargeError();
  const { chunk, count } = chunkPlan(size);
  const key = randomBytes(32);
  const id = newFileId();
  try {
    for (let n = 0; n < count; n++) {
      const at = n * room(chunk);
      await saveChunk(id, n, sealChunk(key, n, await source.read(at, Math.min(room(chunk), size - at)), chunk));
      progress?.(n + 1, count);
    }
  } catch (error) {
    await deleteChunks(id, count).catch(() => undefined);
    throw error;
  }
  return { ...shaped(meta, size), id, key: toHex(key), chunk, count };
}

/**
 * Puts a file kept here (keepFile) on our relay (`own`). Returns the offer for the contact. If the
 * relay cannot take all of it, what it took is deleted there; the chunks here stay. With `from`
 * (milliseconds), for a message sent for later, the chunks' time on the relay starts then.
 */
export async function uploadFile(own: Relay, ref: FileRef, progress?: Progress, from = 0): Promise<FileOffer> {
  if (ref.from) throw new FileMissingError();
  const ids: string[] = [];
  const session = await RelaySession.open({ url: own.url, token: own.token }, true);
  try {
    for (let n = 0; n < ref.count; n++) {
      const sealed = await readChunk(ref.id, n);
      if (!sealed) throw new FileMissingError();
      ids.push(toHex(await putChunk(session, sealed, from)));
      progress?.(n + 1, ref.count);
    }
  } catch (error) {
    for (const put of ids) await deleteChunk(session, fromHex(put)).catch(() => undefined);
    throw error;
  } finally {
    session.close();
  }
  const { id: _id, count: _count, ...shared } = ref;
  return { ...shared, relay: own.url, ids: ids.join('') };
}

// Where a file on the relay at `relay` is taken from: our relay (`own`), and through it the relay
// the file is on; or, from a place lent on ours, which connects nowhere for us, straight from that
// relay's /files path.
function fileWay(own: Relay, relay: string): { at: Relay; via?: string } {
  if (sameRelay(relay, own.url)) return { at: { url: own.url, token: own.token } };
  if (isLentToken(own.token)) return { at: relayPath(relay, '/files') };
  return { at: { url: own.url, token: own.token }, via: relay };
}

/**
 * Takes a file that came, through our relay (`own`), checks every chunk and keeps them here, then
 * deletes them from the relay, unless they are left there (`leave`): a group's file the other
 * members take too stays on the relay and expires there. Left out, for a chat's file, the
 * account's other devices say (see watchTakenFiles): while one still takes it, it stays there
 * until it did. Returns where it is now kept. If any chunk is missing or was changed, nothing is
 * kept.
 */
export async function takeFile(own: Relay, ref: FileRef, progress?: Progress, leave?: boolean): Promise<FileRef> {
  const { from, ...taken } = ref;
  if (!from) return ref;
  const watch = leave === undefined ? takenFiles : null;
  const left = leave ?? watch?.leave(from) ?? false;
  const { at, via } = fileWay(own, from.relay);
  const key = fromHex(ref.key);
  const ids = Array.from({ length: ref.count }, (_, n) => fromHex(from.ids.slice(n * ID_HEX, (n + 1) * ID_HEX)));
  const session = await RelaySession.open(at, true);
  try {
    let size = 0;
    for (let n = 0; n < ref.count; n++) {
      const sealed = await getChunk(session, ids[n], via);
      if (!sealed) throw new FileGoneError();
      size += openChunk(key, n, sealed, ref.chunk).length;
      await saveChunk(ref.id, n, sealed);
      progress?.(n + 1, ref.count);
    }
    if (size !== ref.size) throw new FileDamagedError();
    // Taken: the relay need not keep it. One it cannot delete expires there.
    if (!left) for (const id of ids) await deleteChunk(session, id, via).catch(() => false);
  } catch (error) {
    await deleteChunks(ref.id, ref.count).catch(() => undefined);
    throw error;
  } finally {
    session.close();
  }
  watch?.taken(from, left);
  return taken;
}

/** Deletes from the relay, through ours (`own`), a file left there once taken. One it cannot delete expires there. */
export async function dropFile(own: Relay, from: FileFrom): Promise<void> {
  const { at, via } = fileWay(own, from.relay);
  const session = await RelaySession.open(at, true);
  try {
    for (let at = 0; at < from.ids.length; at += ID_HEX) await deleteChunk(session, fromHex(from.ids.slice(at, at + ID_HEX)), via).catch(() => false);
  } finally {
    session.close();
  }
}

/** The file is not on this phone: not taken from the relay yet, or its chunks are gone. */
export class FileMissingError extends Error {
  constructor() {
    super(t('This file is not on this phone.'));
  }
}

/** Hands the file over a piece at a time, in order, each checked. */
export async function eachPiece(ref: FileRef, take: (piece: Uint8Array) => void | Promise<void>): Promise<void> {
  if (ref.from) throw new FileMissingError();
  const key = fromHex(ref.key);
  let size = 0;
  for (let n = 0; n < ref.count; n++) {
    const sealed = await readChunk(ref.id, n);
    if (!sealed) throw new FileMissingError();
    const piece = openChunk(key, n, sealed, ref.chunk);
    size += piece.length;
    if (size > ref.size) throw new FileDamagedError();
    await take(piece);
  }
  if (size !== ref.size) throw new FileDamagedError();
}

/**
 * A file kept here, to send again (forwarded): its pieces opened as they are read, one chunk at a
 * time. Reading throws FileMissingError when its chunks are not here.
 */
export function refSource(ref: FileRef): Source {
  const key = fromHex(ref.key);
  const piece = room(ref.chunk);
  return {
    size: ref.size,
    read: async (at, length) => {
      if (ref.from) throw new FileMissingError();
      const out = new Uint8Array(Math.max(0, Math.min(length, ref.size - at)));
      let done = 0;
      while (done < out.length) {
        const n = Math.floor((at + done) / piece);
        const sealed = await readChunk(ref.id, n);
        if (!sealed) throw new FileMissingError();
        const data = openChunk(key, n, sealed, ref.chunk);
        const from = at + done - n * piece;
        const part = data.subarray(from, Math.min(data.length, from + out.length - done));
        if (part.length === 0) throw new FileDamagedError();
        out.set(part, done);
        done += part.length;
      }
      return out;
    },
  };
}

/**
 * Takes chunks off our relay before they expire, by their ids (hex, one after another): those of a
 * group's file deleted for everyone. One it cannot take off expires there.
 */
export async function takeOffRelay(own: Relay, ids: string): Promise<void> {
  const session = await RelaySession.open({ url: own.url, token: own.token }, true);
  try {
    for (let at = 0; at + ID_HEX <= ids.length; at += ID_HEX) await deleteChunk(session, fromHex(ids.slice(at, at + ID_HEX))).catch(() => false);
  } finally {
    session.close();
  }
}

/** The file's bytes, or null when it is not here (not taken yet, or its chunks are gone). */
export async function readFile(ref: FileRef): Promise<Uint8Array | null> {
  const out = new Uint8Array(ref.size);
  let at = 0;
  try {
    await eachPiece(ref, (piece) => {
      out.set(piece, at);
      at += piece.length;
    });
  } catch (error) {
    if (error instanceof FileMissingError) return null;
    throw error;
  }
  return out;
}

/** How big a file is, for people: 820 KB, 3.4 MB. */
export function fileSize(bytes: number): string {
  if (bytes < 1000) return `${bytes} B`;
  if (bytes < 1000 * 1000) return `${Math.round(bytes / 1000)} KB`;
  const mb = bytes / (1000 * 1000);
  return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`;
}
