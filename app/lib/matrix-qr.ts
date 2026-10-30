import { fromBase64, toBase64, utf8Decode, utf8Encode } from './crypto';

// The QR code of a Matrix check (spec: Key verification, QR codes, m.qr_code.show.v1): "MATRIX",
// version 2, a mode, the check's ID, two Ed25519 keys and a one-use secret, as Element, Element X
// and FluffyChat make and read them. Which two keys depends on the mode:
//   0: checking another person: our account's master key, then theirs as we know it;
//   1: another device of ours, while this one trusts our master key: the master key, then the
//      other device's key as we know it;
//   2: another device of ours, while this one does not trust our master key yet: this device's
//      key, then the master key as we know it.
// Whoever scans it checks that the second key is what it knows itself (its own master key, or its
// own device's), and so learns that the first is real; it then sends back the secret, which tells
// the device that showed it that its second key was right too.

export type QrMode = 0 | 1 | 2;

export type MatrixQr = {
  mode: QrMode;
  /** The check's ID: its transaction ID, or in a room the request's event ID. */
  id: string;
  /** The two keys, as Matrix writes them (unpadded base64). */
  first: string;
  second: string;
  /** The one-use secret, unpadded base64. */
  secret: string;
};

const HEAD = utf8Encode('MATRIX');
const VERSION = 2;
/** The secret's bytes: the spec asks for at least 8; Element makes 16. */
export const QR_SECRET_BYTES = 16;

const unpadded = (bytes: Uint8Array) => toBase64(bytes).replace(/=+$/, '');
const keyBytes = (key: string) => {
  const bytes = fromBase64(key.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (key.length % 4)) % 4));
  if (bytes.length !== 32) throw new Error('Not an Ed25519 key');
  return bytes;
};

/** The code's bytes. */
export function qrBytes(qr: MatrixQr): Uint8Array {
  const id = utf8Encode(qr.id);
  const secret = fromBase64(qr.secret + '='.repeat((4 - (qr.secret.length % 4)) % 4));
  if (id.length > 0xffff || secret.length < 8) throw new Error('Not a code that can be made');
  const out = new Uint8Array(HEAD.length + 2 + 2 + id.length + 64 + secret.length);
  let at = 0;
  out.set(HEAD, at);
  at += HEAD.length;
  out[at++] = VERSION;
  out[at++] = qr.mode;
  out[at++] = id.length >> 8;
  out[at++] = id.length & 0xff;
  out.set(id, at);
  at += id.length;
  out.set(keyBytes(qr.first), at);
  at += 32;
  out.set(keyBytes(qr.second), at);
  at += 32;
  out.set(secret, at);
  return out;
}

/** What a code says, or null when it is not a Matrix check's. */
export function readMatrixQr(bytes: Uint8Array): MatrixQr | null {
  const fixed = HEAD.length + 2 + 2;
  if (bytes.length < fixed + 64 + 8) return null;
  if (HEAD.some((b, i) => bytes[i] !== b)) return null;
  if (bytes[HEAD.length] !== VERSION) return null;
  const mode = bytes[HEAD.length + 1];
  if (mode !== 0 && mode !== 1 && mode !== 2) return null;
  const length = (bytes[HEAD.length + 2] << 8) | bytes[HEAD.length + 3];
  if (bytes.length < fixed + length + 64 + 8) return null;
  let id: string;
  try {
    id = utf8Decode(bytes.subarray(fixed, fixed + length));
  } catch {
    return null;
  }
  const keys = fixed + length;
  return {
    mode,
    id,
    first: unpadded(bytes.subarray(keys, keys + 32)),
    second: unpadded(bytes.subarray(keys + 32, keys + 64)),
    secret: unpadded(bytes.subarray(keys + 64)),
  };
}
