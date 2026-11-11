// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { cardOf } from './card-share';
import { utf8Encode } from './crypto';
import type { Nameable } from './mentions';
import { npubOf, shortMentions } from './nostr-dm';
import { placeSms, placesIn } from './sms-parts';
import type { Place } from './chat-parts';
import { parseVCards } from './vcard';

// What a message carries besides its words, in the chats of Matrix, XMPP and Nostr, in the ways
// their other apps read it:
// - A contact card: a vCard file (.vcf, text/vcard), as a photo or file goes there: an m.file in
//   Matrix, a file by HTTP upload in XMPP, a file message (kind 15) in Nostr. As in an Erevos chat
//   (lib/card-share.ts), only its name, numbers and emails go. One that comes shows as a card,
//   its file fetched only when asked for, and is saved through the contact screen.
// - A place in a Nostr chat: its geo: address and an OpenStreetMap link in the words, as an SMS has
//   it (lib/sms-parts.ts), which any Nostr app shows and a phone's maps app opens; one that comes
//   so shows as a place.
// - Naming someone in a Nostr group (NIP-27): typed as @ and their name, it goes as nostr:npub1… in
//   the words, which the other apps show as the person; every member is named in the message's p
//   tags already (NIP-17). In an XMPP group, as its apps do it, the name they have there.
// - A video picked to send, without what its file says besides the picture and the sound (where
//   it was taken, the phone): an MP4's or QuickTime's udta and meta boxes are made free boxes of the
//   same size, which every player passes over, so nothing else in the file moves.

// --- Contact cards ------------------------------------------------------------------------------

/** How a contact card goes as a file. */
export const CARD_FILE_MIME = 'text/vcard';
const CARD_MIMES = ['text/vcard', 'text/x-vcard', 'text/directory'];

/** Whether a file is a contact card, by its type or its name's ending. */
export function isCardFile(name: string, mime: string): boolean {
  return CARD_MIMES.includes(mime.toLowerCase().split(';')[0].trim()) || /\.(vcf|vcard)$/i.test(name.trim());
}

/** A contact card (lib/card-share.ts cardOf) as a file to send: named for the contact. */
export function cardFile(card: string): { name: string; mime: string; bytes: Uint8Array } {
  const named = /^FN:(.*)$/m.exec(card)?.[1] ?? '';
  const name = [...named.replace(/\\(.)/g, '$1')]
    .map((c) => (c < ' ' || '\\/:*?"<>|'.includes(c) ? ' ' : c))
    .join('')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 60);
  return { name: `${name || 'contact'}.vcf`, mime: CARD_FILE_MIME, bytes: utf8Encode(card) };
}

/** The most contacts one card file shows. */
export const CARDS_SHOWN = 3;
// The most of a card file read: its first contacts, photos and all.
const CARD_FILE_READ = 2_000_000;

/** The contacts a card file holds, each as a contact card shows (name, numbers and emails), at most CARDS_SHOWN. */
export function cardsOfFile(bytes: Uint8Array): string[] {
  const cards: string[] = [];
  for (const read of parseVCards(bytes.subarray(0, CARD_FILE_READ))) {
    const card = cardOf(read);
    if (card) cards.push(card);
    if (cards.length >= CARDS_SHOWN) break;
  }
  return cards;
}

// --- Places -------------------------------------------------------------------------------------

/** A place as a Nostr chat's words say it: as an SMS does. */
export const placeWords = placeSms;

/** The place a message's words are, when they are only a place: as placeWords says one, or a lone geo: address. */
export function placeOnly(text: string): Place | null {
  const words = text.trim();
  if (!/^geo:/i.test(words)) return null;
  const place = placesIn(words, 1)[0];
  if (!place) return null;
  return /^geo:\S+$/i.test(words) || words === placeWords(place) ? place : null;
}

// --- Naming people -------------------------------------------------------------------------------

const LETTER = /[\p{L}\p{N}_]/u;

/**
 * Words typed in a Nostr group with the members named as @ and their whole name, as NIP-27 has
 * them: nostr:npub1…, the longest names first, so "@Anna Maria" is not "@Anna" too.
 */
export function withNpubs(text: string, members: Nameable[]): string {
  if (!text.includes('@')) return text;
  let out = text;
  for (const member of [...members].filter((m) => m.name && /^[0-9a-f]{64}$/.test(m.identity)).sort((a, b) => b.name.length - a.name.length)) {
    const mark = `@${member.name}`;
    let at = out.indexOf(mark);
    while (at >= 0) {
      const before = at > 0 ? out[at - 1] : '';
      const after = out[at + mark.length] ?? '';
      if (!LETTER.test(before) && !LETTER.test(after)) {
        const named = `nostr:${npubOf(member.identity)}`;
        out = out.slice(0, at) + named + out.slice(at + mark.length);
        at = out.indexOf(mark, at + named.length);
      } else at = out.indexOf(mark, at + 1);
    }
  }
  return out;
}

/** Words as they show in a Nostr chat: a person named (nostr:npub1…) as @ and their name when known, any other key or note shortened. */
export function namesShown(text: string, people: Nameable[]): string {
  if (!text.includes('nostr:')) return text;
  const byNpub = new Map(people.filter((p) => /^[0-9a-f]{64}$/.test(p.identity)).map((p) => [npubOf(p.identity), p.name]));
  const named = text.replace(/nostr:(npub1[02-9ac-hj-np-z]{58})(?![02-9ac-hj-np-z])/g, (whole, npub: string) => {
    const name = byNpub.get(npub);
    return name ? `@${name}` : whole;
  });
  return shortMentions(named);
}

/** Words typed in an XMPP group with the @word typed at their end made the name chosen, as its apps write it: "name: " to start with. */
export function withNick(text: string, nick: string): string {
  if (/^\s*@[^\s@]*$/u.test(text)) return `${nick}: `;
  return text.replace(/@[^\s@]*$/u, `${nick} `);
}

// --- Videos -------------------------------------------------------------------------------------

const be32 = (b: Uint8Array, at: number) => ((b[at] << 24) | (b[at + 1] << 16) | (b[at + 2] << 8) | b[at + 3]) >>> 0;
const kind = (b: Uint8Array, at: number) => String.fromCharCode(b[at + 4], b[at + 5], b[at + 6], b[at + 7]);

// Boxes saying more of a video than its picture and sound, and those holding them.
const SAYING = new Set(['udta', 'meta']);
const HOLDING = new Set(['moov', 'trak']);

/**
 * A video without what its MP4 or QuickTime file says of itself besides its picture and sound:
 * its udta and meta boxes (the place it was taken, the phone, the time) made free boxes of the
 * same size, wherever they sit at the top, in moov or in a trak. Any other file is left as it is.
 */
export function cleanVideo(bytes: Uint8Array): Uint8Array {
  if (bytes.length < 16 || kind(bytes, 0) !== 'ftyp') return bytes;
  let out: Uint8Array | null = null;
  const walk = (from: number, to: number, depth: number) => {
    let at = from;
    while (at + 8 <= to) {
      let size = be32(bytes, at);
      let head = 8;
      if (size === 1) {
        if (at + 16 > to) return;
        // A 64-bit size: past what a phone sends, it is the rest.
        const high = be32(bytes, at + 8);
        size = high ? to - at : be32(bytes, at + 12);
        head = 16;
      } else if (size === 0) size = to - at;
      if (size < head || at + size > to) return;
      const name = kind(bytes, at);
      if (SAYING.has(name)) {
        out ??= bytes.slice();
        out.set([0x66, 0x72, 0x65, 0x65], at + 4);
      } else if (HOLDING.has(name) && depth < 2) walk(at + head, at + size, depth + 1);
      at += size;
    }
  };
  walk(0, bytes.length, 0);
  return out ?? bytes;
}

/** The name and type a video goes with: what kind it is, and nothing of when it was made. */
export function videoNamed(mime: string): { name: string; mime: string } {
  const type = mime.toLowerCase();
  if (type === 'video/quicktime') return { name: 'video.mov', mime: type };
  if (type === 'video/webm') return { name: 'video.webm', mime: type };
  if (type === 'video/3gpp') return { name: 'video.3gp', mime: type };
  return { name: 'video.mp4', mime: 'video/mp4' };
}
