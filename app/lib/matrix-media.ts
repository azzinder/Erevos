// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { ctr } from '@noble/ciphers/aes.js';
import { sha256 } from '@noble/hashes/sha2.js';

import { fromBase64, randomBytes, toBase64 } from './crypto';
import { t } from './i18n';
import { request, sendContent, type EncryptedFile, type MatrixFile, type MatrixMessage, type MatrixState } from './matrix';

// Photos and files in Matrix chats (docs/matrix.md), as Matrix sends them: in an encrypted room,
// encrypted on the phone with a key of their own (AES-256-CTR) before they go up, and checked
// against their SHA-256 when they come back down, the key going inside the encrypted message; in a
// room that is not encrypted, as they are. They are kept on the homeserver (its media store), so
// the server sees how big each is and when, never what.

/** The largest file sent: most homeservers take 50 MB. */
export const MATRIX_MOST = 50 * 1024 * 1024;

export class MatrixFileTooLargeError extends Error {
  constructor() {
    super(t('Files on Matrix can be 50 MB at most.'));
  }
}

// Matrix writes keys in base64url, and the rest in base64 without padding.
const unpadded = (bytes: Uint8Array) => toBase64(bytes).replace(/=+$/, '');
const padded = (text: string) => text + '='.repeat((4 - (text.length % 4)) % 4);
const fromAnyBase64 = (text: string) => fromBase64(padded(text.replace(/-/g, '+').replace(/_/g, '/')));
const urlSafe = (bytes: Uint8Array) => unpadded(bytes).replace(/\+/g, '-').replace(/\//g, '_');

/** A file encrypted as Matrix does: the bytes to upload, and what the message says of them (without its url yet). */
export function encryptFile(bytes: Uint8Array): { data: Uint8Array; file: Omit<EncryptedFile, 'url'> } {
  const key = randomBytes(32);
  // The counter's last 8 bytes start at 0, as Matrix asks, so other apps can read it.
  const iv = new Uint8Array(16);
  iv.set(randomBytes(8));
  const data = ctr(key, iv).encrypt(bytes);
  return {
    data,
    file: {
      key: { kty: 'oct', key_ops: ['encrypt', 'decrypt'], alg: 'A256CTR', k: urlSafe(key), ext: true },
      iv: unpadded(iv),
      hashes: { sha256: unpadded(sha256(data)) },
      v: 'v2',
    },
  };
}

export class ChangedFileError extends Error {
  constructor() {
    super(t('This file was changed on the way, so it is not shown.'));
  }
}

/** The bytes of an encrypted file, once its SHA-256 matches. */
export function decryptFile(data: Uint8Array, file: Omit<EncryptedFile, 'url'>): Uint8Array {
  const hash = fromAnyBase64(file.hashes.sha256);
  const actual = sha256(data);
  if (hash.length !== actual.length || hash.some((b, i) => b !== actual[i])) throw new ChangedFileError();
  return ctr(fromAnyBase64(file.key.k), fromAnyBase64(file.iv)).decrypt(data);
}

/** Puts bytes on the homeserver: answers their mxc:// address. */
async function upload(state: MatrixState, bytes: Uint8Array, mime: string, name: string): Promise<string> {
  const answer = await request(state, {
    method: 'POST',
    url: `${state.homeserver}/_matrix/media/v3/upload?filename=${encodeURIComponent(name)}`,
    bytes,
    contentType: mime,
  });
  const url = answer.json.content_uri;
  if (typeof url !== 'string' || !url.startsWith('mxc://')) throw new Error(t('The Matrix server refused the request.'));
  return url;
}

/** The bytes at an mxc:// address, through the homeserver, signed in (Matrix 1.11), or as before for older servers. */
async function download(state: MatrixState, mxc: string, most?: number): Promise<Uint8Array> {
  const match = /^mxc:\/\/([^/]+)\/([^/?#]+)$/.exec(mxc);
  if (!match) throw new Error(t('The file could not be fetched.'));
  const [, server, id] = match;
  const where = `${encodeURIComponent(server)}/${encodeURIComponent(id)}`;
  try {
    const answer = await request(state, { method: 'GET', url: `${state.homeserver}/_matrix/client/v1/media/download/${where}`, raw: true, most });
    if (answer.bytes) return answer.bytes;
  } catch {
    // An older server: the media API without signing in.
  }
  const answer = await request(state, { method: 'GET', url: `${state.homeserver}/_matrix/media/v3/download/${where}`, raw: true, most });
  if (!answer.bytes) throw new Error(t('The file could not be fetched.'));
  return answer.bytes;
}

/** A photo or file to send; a voice message says how long it is (MSC3245), and may draw it as a wave of 0 to 1024. */
export type OutgoingFile = { name: string; mime: string; bytes: Uint8Array; w?: number; h?: number; voice?: { durationMs: number; waveform?: number[] } };

const MIMES: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp', heic: 'image/heic',
  mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime', mp3: 'audio/mpeg', ogg: 'audio/ogg', opus: 'audio/ogg', m4a: 'audio/mp4',
  pdf: 'application/pdf', txt: 'text/plain', zip: 'application/zip',
};

/** The type of a picked file by its name's ending, as the picker does not always say. */
export function mimeOfName(name: string): string {
  const end = /\.([a-z0-9]+)$/i.exec(name)?.[1]?.toLowerCase() ?? '';
  return MIMES[end] ?? 'application/octet-stream';
}

const kindOf = (mime: string): MatrixFile['kind'] => (mime.startsWith('image/') ? 'image' : mime.startsWith('video/') ? 'video' : mime.startsWith('audio/') ? 'audio' : 'file');

/** Sends a photo or file to a room: encrypted first when the room is. */
export async function sendFile(state: MatrixState, roomId: string, outgoing: OutgoingFile): Promise<MatrixMessage> {
  if (outgoing.bytes.length > MATRIX_MOST) throw new MatrixFileTooLargeError();
  const kind = kindOf(outgoing.mime);
  const info: Record<string, unknown> = { mimetype: outgoing.mime, size: outgoing.bytes.length };
  if (outgoing.w) info.w = outgoing.w;
  if (outgoing.h) info.h = outgoing.h;
  const content: Record<string, unknown> = { msgtype: `m.${kind}`, body: outgoing.name, filename: outgoing.name, info };
  // A voice message, as Element records and shows them.
  if (outgoing.voice && kind === 'audio') {
    info.duration = Math.round(outgoing.voice.durationMs);
    content.body = 'Voice message';
    content['org.matrix.msc3245.voice'] = {};
    content['org.matrix.msc1767.audio'] = { duration: info.duration, ...(outgoing.voice.waveform?.length ? { waveform: outgoing.voice.waveform } : {}) };
  }
  if (state.rooms[roomId]?.encrypted) {
    const { data, file } = encryptFile(outgoing.bytes);
    content.file = { ...file, url: await upload(state, data, 'application/octet-stream', 'file') };
  } else {
    content.url = await upload(state, outgoing.bytes, outgoing.mime, outgoing.name);
  }
  return sendContent(state, roomId, content);
}

/** A message's file, fetched and opened. */
export async function fetchFile(state: MatrixState, file: MatrixFile): Promise<Uint8Array> {
  if (file.encrypted) return decryptFile(await download(state, file.encrypted.url), file.encrypted);
  if (file.url) return download(state, file.url);
  throw new Error(t('The file could not be fetched.'));
}

/** The largest profile or room picture fetched: they are small. */
export const PICTURE_MOST = 1024 * 1024;

/** A profile or room picture at an mxc:// address. Pictures are never encrypted on Matrix, in any app. */
export function fetchPicture(state: MatrixState, mxc: string): Promise<Uint8Array> {
  return download(state, mxc, PICTURE_MOST);
}

/** Puts a profile picture on the homeserver: answers its mxc:// address. */
export function uploadPicture(state: MatrixState, bytes: Uint8Array, mime: string): Promise<string> {
  return upload(state, bytes, mime, 'avatar.jpg');
}
