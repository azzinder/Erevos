// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// What a message can carry besides its words, in a chat with a contact (lib/e2e.ts carries it,
// lock/history.ts keeps it) and in a group (lib/groups.ts): a poll and the votes on it, a place, a
// sticker by its name (components/stickers.tsx draws it), and the preview of a link, which only the
// sender's phone makes (lib/link-preview.ts), and a contact card (a vCard of a name, its numbers and
// emails, lib/card-share.ts). Each is checked when it comes and when it is read
// from the phone: what is not of its shape is none, so an Erevos from before it, or a changed one,
// cannot make the chat show more than these.

import { checkedPaid, checkedPay, type Paid, type Pay } from './pay';
import { checkInvite } from './relay-invite';

/** A poll: its question, its options, and whether more than one can be chosen. */
export type Poll = { q: string; o: string[]; m?: boolean };

/** A place sent once: latitude and longitude, degrees, and how near it is, metres, when known. */
export type Place = { lat: number; lon: number; acc?: number };

/** A link's preview, made by the sender's phone: the page, its title and description, and a small picture (base64 JPEG). */
export type Preview = { url: string; title: string; text: string; image?: string };

/** A message pinned to the top of the chat, by its tag, or (`on` false) taken down. */
export type Pin = { tag: string; on: boolean };

/** A vote on the poll with this tag: the options chosen, by number; none takes the vote back. */
export type Vote = { tag: string; chose: number[] };

/** The sender's own poll with this tag ended: it takes no more votes, and shows how they stood. */
export type Close = { tag: string };

/** New words for the sender's own message with this tag, which then shows as edited. */
export type Edit = { tag: string; text: string };

/** An invite to the sender's relay (lib/relay-invite.ts): its address (`r`) and the invite's secret (`c`). */
export type RelayOffer = { r: string; c: string };

/**
 * A step of an introduction (lib/intros.ts), by its id (`i`): 'ask', with words, asks whether to
 * meet `n` (the name the one who asks gives them), and `g` that this side would give its link;
 * 'yes' and 'no' answer it, a 'yes' of the side that gives with its contact link (`l`) and a
 * secret (`h`, lib/welcome.ts); 'go' gives the other side that link and secret.
 */
export type IntroSignal = { i: string; s: 'ask' | 'yes' | 'no' | 'go'; n?: string; g?: true; l?: string; h?: string };

const MAX_INTRO_LINK = 4096;
const MAX_INTRO_NAME = 64;

/** An introduction's step as it came, or null when it is not of its shape. */
export function checkedIntro(value: unknown): IntroSignal | null {
  const v = value as Record<string, unknown> | null;
  if (!v || typeof v !== 'object' || typeof v.i !== 'string' || !/^[0-9a-f]{32}$/.test(v.i)) return null;
  const s = v.s;
  if (s !== 'ask' && s !== 'yes' && s !== 'no' && s !== 'go') return null;
  const name = s === 'ask' ? plainText(v.n, MAX_INTRO_NAME) : null;
  if (s === 'ask' && !name) return null;
  const link = typeof v.l === 'string' && v.l.length <= MAX_INTRO_LINK && /^erevos:\/\/contact\?[\x21-\x7e]+$/.test(v.l) ? v.l : '';
  const hi = typeof v.h === 'string' && /^[0-9a-f]{32}$/.test(v.h) ? v.h : '';
  if (s === 'go' && (!link || !hi)) return null;
  return {
    i: v.i,
    s,
    ...(name ? { n: name } : {}),
    ...(s === 'ask' && v.g === true ? { g: true as const } : {}),
    ...((s === 'yes' || s === 'go') && link && hi ? { l: link, h: hi } : {}),
  };
}

/**
 * What a contact's message carries beyond what lib/e2e.ts says itself, each in a field of its own
 * that an Erevos from before leaves alone. With words, which say it to an Erevos from before and
 * show nowhere in this one: a sticker, whose words are its emoji (lib/stickers.ts), a place, whose
 * words are where it is, or a poll, whose words are its question and options; and the preview of
 * a link in the words, which show as they are. With words, a voice message or a photo or file: that
 * it was forwarded from another chat (`forwarded`). With words too, a contact card (`card`, a vCard),
 * whose words are its name, numbers and emails. With no words: a pin, a vote, the end of one of the
 * sender's own polls (`close`), new words for one
 * of the sender's own messages (`edit`), that they are typing to us now (`typing`), or an invite to
 * their relay, which a phone with a relay sends by itself to a contact with none (`ri`, app/chat.tsx).
 * An introduction's ask goes with words, which an Erevos from before shows as they are; its other
 * steps go with none (`intro`, lib/intros.ts). A piece of a backup password, given to keep or
 * given back, goes with words that say so and never hold it (`piece`, lib/pieces-kept.ts): the
 * piece is not kept with the message on either phone. A payment request goes with words that say
 * it (`pay`, lib/pay.ts), and that it was paid with none (`settled`).
 */
export type Carried = { sticker?: string; place?: Place; poll?: Poll; preview?: Preview; forwarded?: true; pin?: Pin; vote?: Vote; edit?: Edit; typing?: true; ri?: RelayOffer; intro?: IntroSignal; piece?: string; pay?: Pay; settled?: Paid; card?: string; close?: Close };

/** A backup piece's text (lib/backup-pieces.ts), as it is carried. */
export const isPieceText = (v: unknown): v is string => typeof v === 'string' && /^erevos-piece:[A-Za-z0-9_-]{447}$/.test(v);

/** What of a message's parts is carried with its words, as lock/history.ts keeps them, to seal it again (lib/waiting.ts). */
export type Content = Pick<Carried, 'sticker' | 'place' | 'poll' | 'preview' | 'pay' | 'card'> & { forwarded?: boolean };

export const MAX_QUESTION = 300;
export const MAX_OPTION = 100;
export const MIN_OPTIONS = 2;
export const MAX_OPTIONS = 12;
export const MAX_PREVIEW_TITLE = 200;
export const MAX_PREVIEW_TEXT = 400;
// The largest preview picture, as base64: a small JPEG fits under it, and the message in one.
export const MAX_PREVIEW_IMAGE = 8 * 1024;
const MAX_URL = 2000;
/** The most an edit's words are, as a message's: the field takes no more (app/chat.tsx). */
export const MAX_EDIT = 4000;
/** How long after it went a message of ours can still be edited. */
export const EDIT_FOR = 24 * 60 * 60_000;

/** The reactions offered at a tap; any other emoji can be one too (isReactionEmoji, lock/history.ts). */
export const REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

/** More reactions, behind the first ones. */
export const MORE_REACTIONS = ['🔥', '🎉', '👏', '😍', '🤔', '😅', '🙌', '💪', '👎', '😡', '🤝', '✅', '👀', '💯', '🌙', '⭐'];

// A message's tag, as lock/history.ts makes it.
const isTag = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f]{12}$/.test(v);

/** What a message carries, from the fields of the message as it came: each checked, or left out. */
export function carriedOf(value: Record<string, unknown>): Carried {
  const pin = value.pin as { tag?: unknown; on?: unknown } | null | undefined;
  const vote = value.vote as { tag?: unknown; chose?: unknown } | null | undefined;
  const edit = checkedEdit(value.edit);
  const place = checkedPlace(value.place);
  const poll = checkedPoll(value.poll);
  const preview = checkedPreview(value.preview);
  const chose = checkedChoices(vote?.chose);
  const ri = value.ri as { r?: unknown; c?: unknown } | null | undefined;
  const invite = ri && typeof ri === 'object' ? checkInvite(ri.r, ri.c) : null;
  const intro = checkedIntro(value.intro);
  const pay = checkedPay(value.pay);
  const settled = checkedPaid(value.settled);
  const card = checkedCard(value.card);
  const close = value.close as { tag?: unknown } | null | undefined;
  return {
    ...(isStickerName(value.sticker) ? { sticker: value.sticker } : {}),
    ...(place ? { place } : {}),
    ...(poll ? { poll } : {}),
    ...(preview ? { preview } : {}),
    ...(isTag(pin?.tag) && typeof pin.on === 'boolean' ? { pin: { tag: pin.tag, on: pin.on } } : {}),
    ...(isTag(vote?.tag) && chose ? { vote: { tag: vote.tag, chose } } : {}),
    ...(edit ? { edit } : {}),
    ...(value.forwarded === true ? { forwarded: true as const } : {}),
    ...(value.typing === true ? { typing: true as const } : {}),
    ...(invite ? { ri: { r: invite.relayUrl, c: invite.code } } : {}),
    ...(intro ? { intro } : {}),
    ...(isPieceText(value.piece) ? { piece: value.piece } : {}),
    ...(pay ? { pay } : {}),
    ...(settled ? { settled } : {}),
    ...(card ? { card } : {}),
    ...(isTag(close?.tag) ? { close: { tag: close.tag } } : {}),
  };
}

/** What a kept message carries with its words, as it goes again. */
export function contentOf({ sticker, place, poll, preview, pay, forwarded, card }: Content): Carried {
  return carriedOf({ sticker, place, poll, preview, pay, forwarded, card });
}

/** What a message may carry, as sealed: with words (`words`), what goes with them; with none, a signal only. */
export function toCarry(carried: Carried, words: boolean): Carried {
  const { sticker, place, poll, preview, forwarded, pin, vote, edit, typing, ri, intro, piece, pay, settled, card, close } = carriedOf(carried);
  const asks = intro?.s === 'ask';
  if (words) return { ...(sticker ? { sticker } : {}), ...(place ? { place } : {}), ...(poll ? { poll } : {}), ...(pay ? { pay } : {}), ...(card ? { card } : {}), ...(preview ? { preview } : {}), ...(forwarded ? { forwarded } : {}), ...(asks ? { intro } : {}), ...(piece ? { piece } : {}) };
  return { ...(pin ? { pin } : {}), ...(vote ? { vote } : {}), ...(close ? { close } : {}), ...(settled ? { settled } : {}), ...(edit ? { edit } : {}), ...(typing ? { typing } : {}), ...(ri ? { ri } : {}), ...(intro && !asks ? { intro } : {}) };
}

/** Whether what a message carries is the user's own doing, as words are: it accepts a request and says the phone is open. */
export const acts = (carried: Carried) => !!carried.pin || !!carried.vote || !!carried.close || !!carried.edit || !!carried.settled;

/** What a message carries, but a link's preview: what goes over LoRa, which takes only a little (lib/lora.ts). */
export function withoutPreview({ preview: _, ...rest }: Carried): Carried {
  return rest;
}

const plainText = (v: unknown, most: number): string | null => {
  if (typeof v !== 'string') return null;
  // One line, without the marks that change how text runs.
  const text = v.replace(/[\u0000-\u001f\u007f‎‏‪-‮⁦-⁩]/g, ' ').replace(/\s+/g, ' ').trim();
  return text ? [...text].slice(0, most).join('') : null;
};

/** An edit as it may come, or null: words of their own, as a message's, but none. */
export function checkedEdit(value: unknown): Edit | null {
  const v = value as { tag?: unknown; text?: unknown } | null;
  if (!v || typeof v !== 'object' || !isTag(v.tag) || typeof v.text !== 'string' || !v.text.trim()) return null;
  return { tag: v.tag, text: [...v.text].slice(0, MAX_EDIT).join('') };
}

/**
 * What can be edited of a message, by what it is: words of its sender's own, not a sticker's, a
 * place's or a poll's, which are what they are, nor words forwarded from another chat, which are
 * someone else's.
 */
export function editableWords(m: { text: string; sticker?: string; place?: Place; poll?: Poll; pay?: Pay; card?: string; forwarded?: boolean; voice?: unknown; file?: unknown }): boolean {
  return !!m.text && !m.sticker && !m.place && !m.poll && !m.pay && !m.card && !m.forwarded && !m.voice && !m.file;
}

/** Whether ours sent at `at` can still be edited `now` (EDIT_FOR). */
export const stillEditable = (at: number, now: number) => now - at <= EDIT_FOR;

/** The preview a message keeps once edited to `text`: its own while its link is still in the words, none otherwise. */
export function previewAfterEdit(preview: Preview | undefined, text: string): Preview | undefined {
  return preview && text.includes(preview.url) ? preview : undefined;
}

/** A poll as it may come, or null. */
export function checkedPoll(value: unknown): Poll | null {
  const v = value as { q?: unknown; o?: unknown; m?: unknown } | null;
  if (!v || typeof v !== 'object' || !Array.isArray(v.o)) return null;
  const q = plainText(v.q, MAX_QUESTION);
  const o = v.o.slice(0, MAX_OPTIONS).map((option) => plainText(option, MAX_OPTION));
  if (!q || o.length < MIN_OPTIONS || o.some((option) => option === null)) return null;
  return { q, o: o as string[], ...(v.m === true ? { m: true } : {}) };
}

/** A poll typed here: its question and the options filled in, or null while it is not one yet. */
export function pollOf(question: string, options: string[], multiple: boolean): Poll | null {
  return checkedPoll({ q: question, o: options.filter((option) => option.trim()), m: multiple });
}

/**
 * The options chosen on a poll of `count` options, in order, each once: none takes the vote back.
 * Null when it is not a choice. One that allows only one keeps the first.
 */
export function checkedChoices(value: unknown, count = MAX_OPTIONS, multiple = true): number[] | null {
  if (!Array.isArray(value) || value.length > MAX_OPTIONS) return null;
  if (!value.every((c) => typeof c === 'number' && Number.isInteger(c) && c >= 0 && c < count)) return null;
  const chosen = [...new Set(value as number[])].sort((a, b) => a - b);
  return multiple ? chosen : chosen.slice(0, 1);
}

/** A poll's words, for an Erevos from before: its question, then its options, numbered. */
export function pollWords({ q, o }: Poll): string {
  return [`📊 ${q}`, ...o.map((option, i) => `${i + 1}. ${option}`)].join('\n');
}

/** What choosing `option` makes of `before`: on a poll of one choice, only it, or none if it was it. */
export function choose(before: number[], option: number, multiple: boolean): number[] {
  if (before.includes(option)) return before.filter((c) => c !== option);
  return multiple ? [...before, option].sort((a, b) => a - b) : [option];
}

/** Whether a vote can still be given on a message's poll: it is one, and its sender has not ended it. */
export const pollOpen = (m: { poll?: Poll; closed?: number }): boolean => !!m.poll && !m.closed;

/** How many chose each option, from each voter's choices. */
export function tally(poll: Poll, votes: (number[] | undefined)[]): number[] {
  const counts = poll.o.map(() => 0);
  for (const vote of votes) for (const c of vote ?? []) if (c >= 0 && c < counts.length) counts[c]++;
  return counts;
}

const isDegrees = (v: unknown, most: number): v is number => typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= most;

/** A place as it may come, or null, to six decimals (about 10 cm). */
export function checkedPlace(value: unknown): Place | null {
  const v = value as { lat?: unknown; lon?: unknown; acc?: unknown } | null;
  if (!v || typeof v !== 'object' || !isDegrees(v.lat, 90) || !isDegrees(v.lon, 180)) return null;
  const round = (n: number) => Math.round(n * 1e6) / 1e6;
  const acc = typeof v.acc === 'number' && Number.isFinite(v.acc) && v.acc >= 0 && v.acc < 1e6 ? Math.round(v.acc) : undefined;
  return { lat: round(v.lat), lon: round(v.lon), ...(acc !== undefined ? { acc } : {}) };
}

/** Where a place opens in the phone's maps app: a geo: link, which Erevos itself never follows. */
export function geoLink({ lat, lon }: Place): string {
  return `geo:${lat},${lon}?q=${lat},${lon}`;
}

/** A place as people read it: 37.975360, 23.734950. */
export function placeText({ lat, lon }: Place): string {
  return `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
}

/** A place's words, for an Erevos from before: a pin and where it is. */
export function placeWords(place: Place): string {
  return `📍 ${placeText(place)}`;
}

/** Whether a sticker's name is one: the stickers themselves are drawn by components/stickers.tsx. */
export function isStickerName(value: unknown): value is string {
  return typeof value === 'string' && /^[a-z][a-z0-9-]{0,31}$/.test(value);
}

/** Whether this is a web address a preview can be of: http or https, and not too long. */
export function isWebLink(value: unknown): value is string {
  return typeof value === 'string' && value.length <= MAX_URL && /^https?:\/\/[^\s/?#]+[^\s]*$/i.test(value);
}

/** A preview as it may come, or null. */
export function checkedPreview(value: unknown): Preview | null {
  const v = value as { url?: unknown; title?: unknown; text?: unknown; image?: unknown } | null;
  if (!v || typeof v !== 'object' || !isWebLink(v.url)) return null;
  const title = plainText(v.title, MAX_PREVIEW_TITLE) ?? '';
  const text = plainText(v.text, MAX_PREVIEW_TEXT) ?? '';
  // A JPEG's base64 starts with /9j/.
  const image = typeof v.image === 'string' && v.image.length <= MAX_PREVIEW_IMAGE && /^\/9j\/[A-Za-z0-9+/]+={0,2}$/.test(v.image) ? v.image : undefined;
  if (!title && !text) return null;
  return { url: v.url, title, text, ...(image ? { image } : {}) };
}

/** The longest contact card, as its vCard goes (lib/card-share.ts makes and reads it). */
export const MAX_CARD = 4096;

/**
 * A contact card as it may come, or null: a vCard, short enough, and only text. What it says is
 * read where it shows (lib/card-share.ts cardShown), and only its name, numbers and emails.
 */
export function checkedCard(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > MAX_CARD || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)) return null;
  return /^BEGIN:VCARD\r?\n[\s\S]*\r?\nEND:VCARD\r?\n?$/i.test(value) ? value : null;
}

/**
 * Messages chosen to copy, as one text in the order they were sent: one alone, its words; several,
 * each on its own line with when it was sent and who wrote it (`who`), the day too when they are
 * not all of one day.
 */
export function joinedText(lines: { at: number; who: string; text: string }[]): string {
  const sorted = [...lines].sort((a, b) => a.at - b.at);
  if (sorted.length === 1) return sorted[0].text;
  const pad = (n: number) => String(n).padStart(2, '0');
  const day = (at: number) => {
    const d = new Date(at);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };
  const clock = (at: number) => {
    const d = new Date(at);
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };
  const oneDay = new Set(sorted.map((l) => day(l.at))).size <= 1;
  return sorted.map((l) => `[${oneDay ? '' : `${day(l.at)} `}${clock(l.at)}] ${l.who}: ${l.text}`).join('\n');
}

/**
 * The thread each message is in, by tag (a group's, components/group-messages.tsx): the message at
 * the top of what it answers, answer after answer, as far as those are here; one that answers none
 * here starts its own. Threads are only answers (`re`), as any Erevos sends them.
 */
export function threadRoots(messages: { tag: string; re?: string }[]): Map<string, string> {
  const answers = new Map<string, string | undefined>();
  for (const m of messages) if (m.tag && !answers.has(m.tag)) answers.set(m.tag, m.re);
  const roots = new Map<string, string>();
  for (const tag of answers.keys()) {
    const path: string[] = [];
    let at = tag;
    let root = tag;
    for (;;) {
      const known = roots.get(at);
      if (known) {
        root = known;
        break;
      }
      path.push(at);
      const re = answers.get(at);
      // One that answers itself, round and round, starts its thread where that shows.
      if (!re || !answers.has(re) || path.includes(re)) {
        root = at;
        break;
      }
      at = re;
    }
    for (const step of path) roots.set(step, root);
  }
  return roots;
}

/** How many answers each thread has, by the tag of the message at its top: none for one alone. */
export function threadSizes(roots: Map<string, string>): Map<string, number> {
  const sizes = new Map<string, number>();
  for (const [tag, root] of roots) if (tag !== root) sizes.set(root, (sizes.get(root) ?? 0) + 1);
  return sizes;
}
