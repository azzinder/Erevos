// What a message can carry besides its words, in a chat with a contact (lib/e2e.ts carries it,
// lock/history.ts keeps it) and in a group (lib/groups.ts): a poll and the votes on it, a place, a
// sticker by its name (components/stickers.tsx draws it), and the preview of a link, which only the
// sender's phone makes (lib/link-preview.ts). Each is checked when it comes and when it is read
// from the phone: what is not of its shape is none, so an Erevos from before it, or a changed one,
// cannot make the chat show more than these.

/** A poll: its question, its options, and whether more than one can be chosen. */
export type Poll = { q: string; o: string[]; m?: boolean };

/** A place sent once: latitude and longitude, degrees, and how near it is, metres, when known. */
export type Place = { lat: number; lon: number; acc?: number };

/** A link's preview, made by the sender's phone: the page, its title and description, and a small picture (base64 JPEG). */
export type Preview = { url: string; title: string; text: string; image?: string };

export const MAX_QUESTION = 300;
export const MAX_OPTION = 100;
export const MIN_OPTIONS = 2;
export const MAX_OPTIONS = 12;
export const MAX_PREVIEW_TITLE = 200;
export const MAX_PREVIEW_TEXT = 400;
// The largest preview picture, as base64: a small JPEG fits well under it.
export const MAX_PREVIEW_IMAGE = 24 * 1024;
const MAX_URL = 2000;

/** The reactions offered at a tap; any other emoji can be one too (isReactionEmoji, lock/history.ts). */
export const REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

/** More reactions, behind the first ones. */
export const MORE_REACTIONS = ['🔥', '🎉', '👏', '😍', '🤔', '😅', '🙌', '💪', '👎', '😡', '🤝', '✅', '👀', '💯', '🌙', '⭐'];

const plainText = (v: unknown, most: number): string | null => {
  if (typeof v !== 'string') return null;
  // One line, without the marks that change how text runs.
  const text = v.replace(/[\u0000-\u001f\u007f‎‏‪-‮⁦-⁩]/g, ' ').replace(/\s+/g, ' ').trim();
  return text ? [...text].slice(0, most).join('') : null;
};

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
