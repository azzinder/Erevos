import { randomBytes, toHex } from '../lib/crypto';
import { deleteFile, readBytes, writeBytes } from '../lib/files';

// The photos and files of messages, each in chunks in the app's folder, exactly as they went
// through the relay: encrypted with the file's own key (lib/attachments.ts). The key, the file's
// name and its size are kept only in the message (lock/history.ts), itself sealed in its space:
// without them a chunk is noise, and its name tells nothing. Deleting the message deletes its
// chunks. How many there are tells roughly how much the phone keeps, in all its spaces together.
//
// A photo can be a sticker made from a photo (lib/own-stickers.ts): small, and marked so in what it
// says of itself, which travels with it. An Erevos from before reads a file's fields one by one and
// leaves the mark out, so to it the sticker is a photo like any other.

export type FileKind = 'photo' | 'file';

/** What a file is: its name, type and size, for a photo how wide and high it is, and whether it is a sticker. */
export type FileMeta = { name: string; mime: string; kind: FileKind; size: number; w?: number; h?: number; sticker?: true };

/** The largest photo that goes as a sticker. */
export const MAX_STICKER = 100 * 1000;

/** Whether a photo can be a sticker: a JPEG or a PNG, and small. */
export function fitsSticker({ kind, mime, size }: Pick<FileMeta, 'kind' | 'mime' | 'size'>): boolean {
  return kind === 'photo' && (mime === 'image/jpeg' || mime === 'image/png') && size <= MAX_STICKER;
}

/**
 * Where a message's file is: the id of its chunks here, its key (hex), how big each chunk is and
 * how many there are. `from` is where to take them while they are still only on the relay: its
 * address and the chunks' ids there, hex, one after another.
 */
export type FileRef = FileMeta & { id: string; key: string; chunk: number; count: number; from?: { relay: string; ids: string } };

export const PREFIX = 'erevos-file-';
const ID = /^[0-9a-f]{32}$/;
const KEY = /^[0-9a-f]{64}$/;
const IDS = /^(?:[0-9a-f]{48})+$/;
export const CHUNK_SIZES = [64 * 1024, 256 * 1024, 1024 * 1024];
const MIME = /^[a-z0-9][a-z0-9.+-]*\/[a-z0-9][a-z0-9.+-]*$/;
/** The longest file name kept. */
export const MAX_FILE_NAME = 120;

const whole = (v: unknown, most: number): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= most;

/** A file name as it may be shown and saved: no folders, no control characters, not too long. */
export function cleanFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? '';
  // eslint-disable-next-line no-control-regex
  const clean = base.replace(/[\u0000-\u001f\u007f<>:"|?*]/g, '').trim().replace(/^\.+/, '');
  if (clean.length <= MAX_FILE_NAME) return clean || 'file';
  const dot = clean.lastIndexOf('.');
  const ending = dot > 0 && clean.length - dot <= 10 ? clean.slice(dot) : '';
  return clean.slice(0, MAX_FILE_NAME - ending.length) + ending;
}

const TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  heic: 'image/heic',
  pdf: 'application/pdf',
  txt: 'text/plain',
  zip: 'application/zip',
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  ogg: 'audio/ogg',
  opus: 'audio/ogg',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  webm: 'video/webm',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  odt: 'application/vnd.oasis.opendocument.text',
  ods: 'application/vnd.oasis.opendocument.spreadsheet',
};

/** The type a file's name ending says, for when the phone or computer does not say one. */
export function mimeOf(name: string): string {
  const ending = name.toLowerCase().split('.').pop() ?? '';
  return TYPES[ending] ?? 'application/octet-stream';
}

export function cleanMime(mime: unknown): string {
  return typeof mime === 'string' && mime.length <= 100 && MIME.test(mime.toLowerCase()) ? mime.toLowerCase() : 'application/octet-stream';
}

/** Whether `value` is a well-formed FileMeta. */
export function isFileMeta(value: unknown): value is FileMeta {
  const v = value as Partial<FileMeta> | null;
  return (
    typeof v?.name === 'string' &&
    v.name === cleanFileName(v.name) &&
    typeof v.mime === 'string' &&
    v.mime === cleanMime(v.mime) &&
    (v.kind === 'photo' || v.kind === 'file') &&
    whole(v.size, Number.MAX_SAFE_INTEGER) &&
    (v.w === undefined || whole(v.w, 100_000)) &&
    (v.h === undefined || whole(v.h, 100_000)) &&
    (v.sticker === undefined || (v.sticker === true && fitsSticker(v as FileMeta)))
  );
}

export function isFileRef(value: unknown): value is FileRef {
  const v = value as Partial<FileRef> | null;
  if (!v || !isFileMeta(value) || typeof v.id !== 'string' || !ID.test(v.id) || typeof v.key !== 'string' || !KEY.test(v.key)) return false;
  if (!CHUNK_SIZES.includes(v.chunk as number) || !whole(v.count, 1000) || v.count === 0) return false;
  if (v.from === undefined) return true;
  const from = v.from as Partial<NonNullable<FileRef['from']>> | null;
  return typeof from?.relay === 'string' && typeof from.ids === 'string' && IDS.test(from.ids) && from.ids.length === 48 * v.count;
}

export const newFileId = () => toHex(randomBytes(16));

const chunkName = (id: string, n: number) => `${PREFIX}${id}-${n}`;

export function saveChunk(id: string, n: number, sealed: Uint8Array): Promise<void> {
  return writeBytes(chunkName(id, n), sealed);
}

/** One chunk as it was kept, or null when it is gone. */
export function readChunk(id: string, n: number): Promise<Uint8Array | null> {
  return readBytes(chunkName(id, n));
}

export async function deleteChunks(id: string, count: number): Promise<void> {
  if (!ID.test(id)) return;
  for (let n = 0; n < count; n++) await deleteFile(chunkName(id, n));
}

/** `name`, or `name (1)`, `name (2)`… before its ending, whichever is not in `taken`. */
export function freeName(name: string, taken: Set<string>): string {
  if (!taken.has(name)) return name;
  const dot = name.lastIndexOf('.');
  const [stem, ending] = dot > 0 ? [name.slice(0, dot), name.slice(dot)] : [name, ''];
  for (let n = 1; ; n++) {
    const next = `${stem} (${n})${ending}`;
    if (!taken.has(next)) return next;
  }
}
