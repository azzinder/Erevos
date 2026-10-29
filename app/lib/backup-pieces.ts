import { fromBase64, randomBytes, sameBytes, sha256Bytes, toBase64, toHex, utf8Decode, utf8Encode } from './crypto';
import type { CloudServer } from './backup-cloud';
import { t } from './i18n';
import { combine, split, type Share } from './shamir';

// A backup's password in pieces with friends (app/backup.tsx, Backups → Pieces with friends): the
// password, and the server automatic backups go to when there is one, split with Shamir's secret
// sharing (lib/shamir.ts) into n pieces, any k of which give them back (2 of 3 up to 3 of 5).
// Each piece goes to a contact chosen, as a message of their chat, inside its end-to-end
// encryption; their Erevos keeps it apart from the chat (lib/e2e.ts pieces), so a chat's
// disappearing messages or a deleted chat do not take it, and gives it back when asked: as a code
// to scan or copy, or as a message in the chat. On a new phone, k pieces put together give the
// password, and the server, back; the backup itself is in its folder or on that server.
//
// What one piece, or k - 1, holds says nothing of the password: every password is as likely with
// them as any other (Shamir). The secret split is always SECRET bytes, padded with random bytes,
// so a piece does not tell how long the password is or whether a server is in it. Pieces of one
// split share a random set id, drawn anew each time, so pieces of different people's, or of one's
// two splits, cannot be told to belong together by what they hold; nothing in a piece names its
// owner, or the other friends.
//
// The secret: VERSION, the password's length and its UTF-8, the server's length (2 bytes, 0 for
// none) and the server as JSON ({u, n, p}: folder address, user name, password), random bytes,
// then CHECK bytes of SHA-256 of all that. It is inside the split, so no piece shows it, and a
// friend with one piece has nothing to try guessed passwords against; put together, it says the
// pieces were the right ones.
//
// A piece: VERSION, k, its x, the set id (SET bytes), its share of the secret, then SUM bytes of
// SHA-256 of all that, which tells a piece mistyped or cut from one whole; that hash is of the
// piece only, and says nothing of the secret. As text: PREFIX and the piece in base64url.

const VERSION = 1;
export const SECRET = 320;
const CHECK = 16;
const SET = 8;
const SUM = 4;
const PIECE = 3 + SET + SECRET + SUM;
export const PREFIX = 'erevos-piece:';
const CHECK_LABEL = utf8Encode('erevos backup pieces 1');
// The longest password a split holds, in UTF-8 bytes; far longer than any typed.
const MOST_PASSWORD = 200;

/** The splits offered: k pieces needed of n given. */
export const SPLITS: { k: number; n: number }[] = [
  { k: 2, n: 3 },
  { k: 2, n: 4 },
  { k: 3, n: 4 },
  { k: 3, n: 5 },
];
// The most pieces put together at once: more than any split gives.
const MOST_PIECES = 16;

/** What pieces put together give back: the password, and the server when one was in them. */
export type PiecesSecret = { password: string; server: CloudServer | null };

/** A piece, read from its text. */
export type Piece = { k: number; x: number; set: string; y: Uint8Array };

export class NotAPieceError extends Error {
  constructor() {
    super(t('That is not a whole backup piece. Copy all of it, or scan it again.'));
  }
}

export class TooFewPiecesError extends Error {
  readonly have: number;
  readonly need: number;

  constructor(have: number, need: number) {
    super(t('{have} of the {need} pieces needed. Ask another friend for theirs.', { have, need }));
    this.have = have;
    this.need = need;
  }
}

export class PiecesDoNotFitError extends Error {
  constructor() {
    super(t('These pieces do not fit together. One may be from another time pieces were made.'));
  }
}

const toB64Url = (bytes: Uint8Array) => toBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const check = (body: Uint8Array) => sha256Bytes(new Uint8Array([...CHECK_LABEL, ...body])).subarray(0, CHECK);

/** The secret split: what is given, padded with random bytes to SECRET and ended with its check. */
export function packSecret({ password, server }: PiecesSecret, random: (length: number) => Uint8Array = randomBytes): Uint8Array {
  const pass = utf8Encode(password);
  if (pass.length === 0 || pass.length > MOST_PASSWORD) throw new Error(t('That password is too long to give in pieces.'));
  const where = server ? utf8Encode(JSON.stringify({ u: server.url, n: server.user, p: server.password })) : new Uint8Array(0);
  const used = 2 + pass.length + 2 + where.length;
  if (used > SECRET - CHECK) throw new Error(t('The server address and password are too long to give in pieces. Give the pieces without the server.'));
  const out = new Uint8Array(SECRET);
  out[0] = VERSION;
  out[1] = pass.length;
  out.set(pass, 2);
  out[2 + pass.length] = where.length >> 8;
  out[3 + pass.length] = where.length & 255;
  out.set(where, 4 + pass.length);
  out.set(random(SECRET - CHECK - used), used);
  out.set(check(out.subarray(0, SECRET - CHECK)), SECRET - CHECK);
  return out;
}

/** What a secret put together holds, or null when it is not one (wrong pieces, or one changed). */
export function unpackSecret(secret: Uint8Array): PiecesSecret | null {
  if (secret.length !== SECRET || !sameBytes(check(secret.subarray(0, SECRET - CHECK)), secret.subarray(SECRET - CHECK))) return null;
  if (secret[0] !== VERSION) return null;
  const length = secret[1];
  if (length === 0 || length > MOST_PASSWORD) return null;
  try {
    const password = utf8Decode(secret.subarray(2, 2 + length));
    const whereLength = (secret[2 + length] << 8) | secret[3 + length];
    if (4 + length + whereLength > SECRET - CHECK) return null;
    if (!whereLength) return { password, server: null };
    const v = JSON.parse(utf8Decode(secret.subarray(4 + length, 4 + length + whereLength))) as { u?: unknown; n?: unknown; p?: unknown };
    if (typeof v.u !== 'string' || typeof v.n !== 'string' || typeof v.p !== 'string') return null;
    return { password, server: { url: v.u, user: v.n, password: v.p } };
  } catch {
    return null;
  }
}

function pieceBody(k: number, x: number, set: Uint8Array, y: Uint8Array): Uint8Array {
  const out = new Uint8Array(PIECE);
  out[0] = VERSION;
  out[1] = k;
  out[2] = x;
  out.set(set, 3);
  out.set(y, 3 + SET);
  out.set(sha256Bytes(out.subarray(0, PIECE - SUM)).subarray(0, SUM), PIECE - SUM);
  return out;
}

/** The pieces of `secret`, any `k` of `n` giving it back, as texts to send. */
export function makePieces(secret: PiecesSecret, k: number, n: number, random: (length: number) => Uint8Array = randomBytes): string[] {
  const packed = packSecret(secret, random);
  const set = random(SET);
  const shares = split(packed, k, n, random);
  packed.fill(0);
  return shares.map(({ x, y }) => PREFIX + toB64Url(pieceBody(k, x, set, y)));
}

// A piece's text: PREFIX, then base64url letters, as many as PIECE bytes make.
const LETTERS = Math.ceil((PIECE * 4) / 3);
const PIECE_TEXT = new RegExp(`${PREFIX}[A-Za-z0-9_-]{${LETTERS}}(?![A-Za-z0-9_-])`, 'g');

/** The pieces' texts in `text`, as a message or what was pasted holds them, each once. */
export function piecesIn(text: string): string[] {
  return [...new Set(text.match(PIECE_TEXT) ?? [])];
}

/** A piece's text read, or NotAPieceError when it is not whole. */
export function readPiece(text: string): Piece {
  const clean = text.trim();
  if (!clean.startsWith(PREFIX)) throw new NotAPieceError();
  const letters = clean.slice(PREFIX.length);
  if (letters.length !== LETTERS || !/^[A-Za-z0-9_-]+$/.test(letters)) throw new NotAPieceError();
  const bytes = fromBase64(letters.replace(/-/g, '+').replace(/_/g, '/'));
  if (bytes.length !== PIECE || bytes[0] !== VERSION) throw new NotAPieceError();
  if (!sameBytes(sha256Bytes(bytes.subarray(0, PIECE - SUM)).subarray(0, SUM), bytes.subarray(PIECE - SUM))) throw new NotAPieceError();
  const k = bytes[1];
  const x = bytes[2];
  if (k < 2 || x < 1 || k > MOST_PIECES) throw new NotAPieceError();
  return { k, x, set: toHex(bytes.subarray(3, 3 + SET)), y: bytes.slice(3 + SET, 3 + SET + SECRET) };
}

/** The set a piece's text belongs to, or '' when it is not one. */
export function pieceSet(text: string): string {
  try {
    return readPiece(text).set;
  } catch {
    return '';
  }
}

// The server pieces gave back, handed to the backups screen to restore from (app/backup.tsx), in
// memory only, once, for a minute at most.
let handed: { server: CloudServer; until: number } | null = null;

/** Hands the server pieces gave back to the backups screen about to open. */
export function handServer(server: CloudServer, now = Date.now()): void {
  handed = { server, until: now + 60_000 };
}

/** The server handed to restore from, once, or null. */
export function takeHandedServer(now = Date.now()): CloudServer | null {
  const kept = handed;
  handed = null;
  return kept && kept.until > now ? kept.server : null;
}

// Every way of choosing `k` of `items`, in order.
function* choices<T>(items: T[], k: number, from = 0, chosen: T[] = []): Generator<T[]> {
  if (chosen.length === k) {
    yield chosen;
    return;
  }
  for (let i = from; i <= items.length - (k - chosen.length); i++) yield* choices(items, k, i + 1, [...chosen, items[i]]);
}

/**
 * Puts pieces' texts together. Pieces of the set with the most of them are used; one given twice
 * counts once. With more than needed, any k that fit give it, so one mistaken piece among them
 * does no harm. Throws NotAPieceError, TooFewPiecesError or PiecesDoNotFitError.
 */
export function putTogether(texts: string[]): PiecesSecret {
  const pieces = texts.map(readPiece);
  const sets = new Map<string, Map<number, Piece>>();
  for (const piece of pieces) {
    const set = sets.get(piece.set) ?? new Map<number, Piece>();
    const same = set.get(piece.x);
    if (same && !sameBytes(same.y, piece.y)) throw new PiecesDoNotFitError();
    set.set(piece.x, piece);
    sets.set(piece.set, set);
  }
  const best = [...sets.values()].map((set) => [...set.values()]).sort((a, b) => b.length - a.length)[0] ?? [];
  const need = best[0]?.k ?? 2;
  if (best.some((piece) => piece.k !== need)) throw new PiecesDoNotFitError();
  if (best.length < need) throw new TooFewPiecesError(best.length, need);
  if (best.length > MOST_PIECES) throw new PiecesDoNotFitError();
  for (const chosen of choices(best, need)) {
    const secret = combine(chosen.map(({ x, y }): Share => ({ x, y })));
    const found = unpackSecret(secret);
    secret.fill(0);
    if (found) return found;
  }
  throw new PiecesDoNotFitError();
}
