// What a message can carry besides its words, in a chat with a contact (lib/e2e.ts carries it,
// lock/history.ts keeps it) and in a group (lib/groups.ts): a poll and the votes on it, a place, a
// sticker by its name (components/stickers.tsx draws it), and the preview of a link, which only the
// sender's phone makes (lib/link-preview.ts). Each is checked when it comes and when it is read
// from the phone: what is not of its shape is none, so an Erevos from before it, or a changed one,
// cannot make the chat show more than these.

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

/** New words for the sender's own message with this tag, which then shows as edited. */
export type Edit = { tag: string; text: string };

/** An invite to the sender's relay (lib/relay-invite.ts): its address (`r`) and the invite's secret (`c`). */
export type RelayOffer = { r: string; c: string };

/**
 * What a contact's message carries beyond what lib/e2e.ts says itself, each in a field of its own
 * that an Erevos from before leaves alone. With words, which say it to an Erevos from before and
 * show nowhere in this one: a sticker, whose words are its emoji (lib/stickers.ts), a place, whose
 * words are where it is, or a poll, whose words are its question and options; and the preview of
 * a link in the words, which show as they are. With words, a voice message or a photo or file: that
 * it was forwarded from another chat (`forwarded`). With no words: a pin, a vote, new words for one
 * of the sender's own messages (`edit`), that they are typing to us now (`typing`), or an invite to
 * their relay, which a phone with a relay sends by itself to a contact with none (`ri`, app/chat.tsx).
 */
export type Carried = { sticker?: string; place?: Place; poll?: Poll; preview?: Preview; forwarded?: true; pin?: Pin; vote?: Vote; edit?: Edit; typing?: true; ri?: RelayOffer };

/** What of a message's parts is carried with its words, as lock/history.ts keeps them, to seal it again (lib/waiting.ts). */
export type Content = Pick<Carried, 'sticker' | 'place' | 'poll' | 'preview'> & { forwarded?: boolean };

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
  };
}

/** What a kept message carries with its words, as it goes again. */
export function contentOf({ sticker, place, poll, preview, forwarded }: Content): Carried {
  return carriedOf({ sticker, place, poll, preview, forwarded });
}

/** What a message may carry, as sealed: with words (`words`), what goes with them; with none, a signal only. */
export function toCarry(carried: Carried, words: boolean): Carried {
  const { sticker, place, poll, preview, forwarded, pin, vote, edit, typing, ri } = carriedOf(carried);
  if (words) return { ...(sticker ? { sticker } : {}), ...(place ? { place } : {}), ...(poll ? { poll } : {}), ...(preview ? { preview } : {}), ...(forwarded ? { forwarded } : {}) };
  return { ...(pin ? { pin } : {}), ...(vote ? { vote } : {}), ...(edit ? { edit } : {}), ...(typing ? { typing } : {}), ...(ri ? { ri } : {}) };
}

/** Whether what a message carries is the user's own doing, as words are: it accepts a request and says the phone is open. */
export const acts = (carried: Carried) => !!carried.pin || !!carried.vote || !!carried.edit;

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
export function editableWords(m: { text: string; sticker?: string; place?: Place; poll?: Poll; forwarded?: boolean; voice?: unknown; file?: unknown }): boolean {
  return !!m.text && !m.sticker && !m.place && !m.poll && !m.forwarded && !m.voice && !m.file;
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
