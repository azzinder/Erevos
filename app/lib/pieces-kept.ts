import { newTag, WAITING, type History } from '../lock/history';
import type { PiecesKept } from '../lock/e2e-data';
import { makePieces, pieceSet, type PiecesSecret } from './backup-pieces';
import type { Carried } from './chat-parts';
import type { E2E } from './e2e';
import { t } from './i18n';

// Pieces of backup passwords (lib/backup-pieces.ts) as a space's chats keep them (lib/e2e.ts
// pieces), and the messages that carry them (app/backup-pieces.tsx).
//
// Given: each piece goes to the contact chosen with a message of their chat whose words say what
// it is, and never hold it: the piece goes beside them, inside the end-to-end encryption (`piece`,
// lib/chat-parts.ts). The message is put in the chat as one of ours that waits (lock/history.ts
// WAITING) and goes as any that waits does (lib/waiting.ts): at once when the relay or the
// contact's phone can take it, or later by itself. Until it went, its piece waits apart (`out`,
// by the message's tag), and is deleted once it went, so neither the chat nor anything else on
// this phone keeps the pieces given: a space opened with its password, or by someone made to,
// shows to whom pieces went, but not the pieces, and so not the backup's password. The split is
// remembered by its set id, k, n and to whom, so pieces of it that come back are known as ours.
//
// Kept: a piece that came with a message from a contact accepted (never from a message request)
// is kept for them, apart from the chat, so a chat's disappearing messages or a deleted chat do
// not take it, until this phone's owner deletes it. One of a split this chat made comes back to
// it instead, to be put together (`back`). Given back: with a message, to the contact who gave it.
// An Erevos from before pieces shows the words and keeps nothing.

const CONTACT_PREFIX = 'contact:';

type Chats = { e2e: E2E; history: Pick<History, 'add'> };

/** A piece kept here for a contact: who gave it, the piece, when it came (ms). */
export type HeldPiece = NonNullable<PiecesKept['held']>[number];

/** A split made here: its set id, k of n, the contacts given a piece, when (ms). */
export type GivenPieces = NonNullable<PiecesKept['given']>[number];

// Puts one of ours in the chat with `identity`, waiting to go as soon as it can, with `piece` beside it.
async function waitToGo({ e2e, history }: Chats, identity: string, text: string, piece: string, now: number): Promise<void> {
  const tag = newTag();
  // The piece is ready before the message is: the message may go the moment it is in the chat.
  await e2e.changePieces((kept) => ({ next: { ...kept, out: [...(kept.out ?? []), { tag, p: piece }] }, out: undefined }));
  await history.add({ peer: `${CONTACT_PREFIX}${identity}`, text, mine: true, at: now, tag, mark: WAITING });
}

/** What goes beside our waiting message of this tag (lib/waiting.ts): its piece, when it has one. */
export function pieceToGo(e2e: E2E, tag: string): Carried {
  const piece = e2e.pieces().out?.find((o) => o.tag === tag)?.p;
  return piece ? { piece } : {};
}

/** Our message of this tag went: the piece beside it is no longer kept here. */
export async function pieceWent(e2e: E2E, tag: string): Promise<void> {
  if (!e2e.pieces().out?.some((o) => o.tag === tag)) return;
  await e2e.changePieces((kept) => ({ next: { ...kept, out: (kept.out ?? []).filter((o) => o.tag !== tag) }, out: undefined }));
}

/**
 * Makes pieces of `secret`, `k` of them needed, one for each contact in `to`, and puts each in
 * its chat to go. Remembers the split, so pieces of it given back are known.
 */
export async function givePieces(chats: Chats, secret: PiecesSecret, k: number, to: string[], now = Date.now()): Promise<GivenPieces> {
  const contacts = chats.e2e.contacts();
  if (new Set(to).size !== to.length || to.some((identity) => !contacts.some((c) => c.identity === identity && !c.request))) throw new Error(t('Choose contacts you accepted, each once.'));
  const pieces = makePieces(secret, k, to.length);
  const n = to.length;
  const given: GivenPieces = { set: pieceSet(pieces[0]), k, n, to: [...to], at: now };
  // Remembered first: a piece that came back before this is saved would be taken for a friend's.
  await chats.e2e.changePieces((kept) => ({ next: { ...kept, given: [...(kept.given ?? []), given] }, out: undefined }));
  const words = t('I gave you a piece of my Erevos backup password to keep. {k} of the {n} pieces I gave friends give it back; one alone shows nothing. Your Erevos keeps it under Settings → Data and devices → Backup pieces. If I ever ask for it, give it back from there.', { k, n });
  for (let i = 0; i < n; i++) await waitToGo(chats, to[i], words, pieces[i], now);
  return given;
}

/**
 * Keeps a piece that came from `from` with a message: for them, or, of a split made here, as
 * ours come back. Nothing from a message request or someone not a contact. Says what was kept.
 */
export async function keepPieceFrom(e2e: E2E, from: string, p: string, request: boolean, now = Date.now()): Promise<'held' | 'back' | null> {
  const contact = e2e.contacts().find((c) => c.identity === from);
  if (request || !contact || contact.request || !pieceSet(p)) return null;
  return e2e.changePieces((kept) => {
    if ((kept.given ?? []).some((g) => g.set === pieceSet(p))) {
      const back = kept.back ?? [];
      return { next: back.some((b) => b.p === p) ? kept : { ...kept, back: [...back, { p, at: now }] }, out: 'back' as const };
    }
    const held = kept.held ?? [];
    return { next: held.some((h) => h.p === p && h.from === from) ? kept : { ...kept, held: [...held, { from, p, at: now }] }, out: 'held' as const };
  });
}

/** The pieces kept here for contacts, newest first. */
export function heldPieces(e2e: E2E): HeldPiece[] {
  return [...(e2e.pieces().held ?? [])].reverse();
}

/** The splits made here, newest first. */
export function givenPieces(e2e: E2E): GivenPieces[] {
  return [...(e2e.pieces().given ?? [])].reverse();
}

/** Our own pieces given back, to put together. */
export function piecesBack(e2e: E2E): string[] {
  return (e2e.pieces().back ?? []).map((b) => b.p);
}

/** Gives a piece kept here back to the contact who gave it, with a message in their chat. */
export async function givePieceBack(chats: Chats, piece: HeldPiece, now = Date.now()): Promise<void> {
  if (!chats.e2e.contacts().some((c) => c.identity === piece.from && !c.request)) throw new Error(t('They are no longer a contact here. Show them the code instead.'));
  await waitToGo(chats, piece.from, t('Here is the piece of your Erevos backup password that I kept for you. Your Erevos puts it with the others under Settings → Data and devices → Backup pieces.'), piece.p, now);
}

/** Deletes a piece kept here for a contact. */
export function dropHeldPiece(e2e: E2E, piece: HeldPiece): Promise<void> {
  return e2e.changePieces((kept) => ({ next: { ...kept, held: (kept.held ?? []).filter((h) => !(h.p === piece.p && h.from === piece.from)) }, out: undefined }));
}

/** Forgets the pieces given back, once put together or no longer wanted. */
export function dropPiecesBack(e2e: E2E): Promise<void> {
  return e2e.changePieces((kept) => ({ next: { ...kept, back: [] }, out: undefined }));
}

/** Forgets a split made here: pieces of it that come back are then kept as a friend's would be. */
export function forgetGiven(e2e: E2E, set: string): Promise<void> {
  return e2e.changePieces((kept) => ({ next: { ...kept, given: (kept.given ?? []).filter((g) => g.set !== set) }, out: undefined }));
}
