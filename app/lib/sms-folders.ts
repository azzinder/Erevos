// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import type { InboxRow, InboxSms } from './inbox';
import { sameConversation, smsNumbers } from './sms-group';
import { sameNumber } from './sms-invite';
import { t } from './i18n';
import { splitLinks } from './links';
import { TRASH_DAYS, type SmsData, type SmsDraft, type SmsMark, type Trashed } from '../lock/sms-data';
import type { SmsLink } from './sms-link';

// The space's own order of its SMS conversations (lock/sms-data.ts), over the phone's SMS as every
// space reads them: pinned ones at the top of the list, archived ones out of it until a message
// comes from them after, ones in the Trash out of everything until they go from the phone, and spam
// in Spam: a number blocked in Android's own list, one marked spam, or one the filter's rules
// catch. All of it is worked out here, on the phone: the filter sends nothing anywhere and asks
// nobody. Another space keeps its own order, and sees the phone's SMS as they are.

export type SmsFolder = 'list' | 'archived' | 'spam' | 'trash';

const DAY = 24 * 3600 * 1000;

// Words of the SMS that try to fool: a parcel held, an account stopped, a prize, details to give.
// Without accents and in small letters, as plainText makes the text. They count only with a link in
// the same SMS, from a number that is no contact and was never answered. The phone reads the same
// list to let such an SMS come with no notice (BuiltInSpam.kt in modules/erevos-sms): change both,
// as checks/sms-folders.check.ts fails when they differ, with LOOKS_LIKE and INVISIBLE too.
export const SPAM_PHRASES = [
  'κερδισατε',
  'κερδισες',
  'συγχαρητηρια',
  'το δεμα σας',
  'δεμα σας',
  'τελωνει',
  'ανασταλει',
  'αναστολη του λογαριασμου',
  'επιβεβαιωστε τα στοιχεια',
  'ενημερωστε τα στοιχεια',
  'επιστροφη φορου',
  'you won',
  'you have won',
  'winner',
  'congratulations',
  'claim your',
  'your parcel',
  'your package',
  'customs fee',
  'redelivery',
  'account suspended',
  'account has been suspended',
  'verify your account',
  'confirm your details',
  'update your details',
  'tax refund',
  'gift card',
  'bitcoin',
  'crypto',
];

/** Words as the filter compares them: small letters, no accents, single spaces. */
export function plainText(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

// Letters of other scripts that look like Latin ones, and marks that show nothing: a scammer swaps them
// into words to get past a filter ("pаypal" with a Cyrillic а, "gift\u200bcard").
export const INVISIBLE = /[\u00ad\u034f\u061c\u115f\u1160\u17b4\u17b5\u180b-\u180e\u200b-\u200f\u202a-\u202e\u2060-\u206f\u3164\ufe00-\ufe0f\ufeff\uffa0]/g;
export const LOOKS_LIKE: Record<string, string> = {
  а: 'a', с: 'c', е: 'e', о: 'o', р: 'p', х: 'x', у: 'y', к: 'k', м: 'm', н: 'h', т: 't', і: 'i', ї: 'i', ј: 'j', ѕ: 's', ԁ: 'd', ӏ: 'l', һ: 'h', ԛ: 'q', ԝ: 'w',
  ο: 'o', α: 'a', ν: 'v', ρ: 'p', υ: 'u', ι: 'i', κ: 'k', χ: 'x', τ: 't', γ: 'y', ω: 'w', η: 'n',
};

/**
 * Words as the spam filter compares them (spamWords): plainText, and besides, no marks that show
 * nothing, full-width and other styled letters as plain ones, and Cyrillic and Greek letters that
 * look like Latin ones as those. Applied to the text and to every rule alike, so a Greek rule still
 * finds Greek words. Never used to tell who sent an SMS: a sender that looks like an allowed one is
 * not that sender.
 */
export function lookAlike(text: string): string {
  const folded = text.normalize('NFKD').replace(INVISIBLE, '');
  return plainText(folded).replace(/[^\x00-\x7f]/g, (c) => LOOKS_LIKE[c] ?? c);
}

const hasLink = (text: string) => splitLinks(text).some((part) => part.url);

/**
 * Why an SMS went to Spam, to show the owner: the number is blocked in Android's list, the owner
 * marked it, a rule of theirs names the sender, it is a number from abroad, it has one of their
 * words, a link from an unknown number (with `links` on), or a link with words that try to fool.
 */
export type SpamReason =
  | { kind: 'blocked' }
  | { kind: 'marked' }
  | { kind: 'sender'; rule: string }
  | { kind: 'abroad' }
  | { kind: 'word'; word: string }
  | { kind: 'link' }
  | { kind: 'phrase'; phrase: string };

/**
 * Why an SMS looks like spam by the filter's rules on its words: one of the owner's words in it; or,
 * from a phone number (`number`, not a sender's name nor a short code, which banks and shops use), a
 * link with words that try to fool, or any link when `links` is on. Null when it does not.
 */
export function spamWords(text: string, words: string[], links: boolean, number: boolean): SpamReason | null {
  const plain = lookAlike(text);
  const word = words.find((w) => lookAlike(w) && plain.includes(lookAlike(w)));
  if (word) return { kind: 'word', word };
  if (!number || !hasLink(text)) return null;
  if (links) return { kind: 'link' };
  const phrase = SPAM_PHRASES.find((p) => plain.includes(lookAlike(p)));
  return phrase ? { kind: 'phrase', phrase } : null;
}

/** Whether an SMS looks like spam by the filter's rules on its words (spamWords). */
export function looksLikeSpam(text: string, words: string[], links: boolean, number: boolean): boolean {
  return spamWords(text, words, links, number) !== null;
}

// Rules on who sends: a sender's name, as banks and shops send (any letters, without accents or
// case), or a number, where * stands for anything after or before (+4470* is every number that
// starts so, 1234* every short code that does). A number is compared as written in full, with + for
// 00 and without spaces or dashes, and, when the phone's own country code is known, without it too,
// so 69* is every number +3069... with home 30.

const NUMBER_RULE = /^\+?[0-9*]+$/;

/** A number as rules compare it: + for 00, without spaces, dashes, dots or brackets. */
function numberForm(text: string): string {
  const bare = text.replace(/[\s().-]/g, '');
  return bare.startsWith('00') ? `+${bare.slice(2)}` : bare;
}

/** A rule as typed, as it is kept: null when it is none (empty, too long, or * alone). */
export function senderRule(typed: string): string | null {
  const text = typed.trim().replace(/\s+/g, ' ');
  if (!text || text.length > 40 || !text.replace(/\*/g, '').trim()) return null;
  const number = numberForm(text);
  return NUMBER_RULE.test(number) ? number : text;
}

const wildcard = (rule: string) => new RegExp(`^${rule.split('*').map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*')}$`);

/** Whether a rule names the sender at `address` (one number, a short code or a name). */
export function senderMatches(address: string, rule: string, home = ''): boolean {
  const kept = senderRule(rule);
  if (!kept) return false;
  const number = numberForm(address);
  if (NUMBER_RULE.test(kept)) {
    if (!/^\+?[0-9]+$/.test(number)) return false;
    const pattern = wildcard(kept);
    const national = home && number.startsWith(`+${home}`) ? number.slice(home.length + 1) : null;
    return pattern.test(number) || (national !== null && pattern.test(national));
  }
  return wildcard(plainText(kept)).test(plainText(address));
}

/** Whether `address` is a phone number written with a country code other than `home`. A number
 *  written without one is the phone's own country's; a name or a short code is from nowhere. */
export function isAbroad(address: string, home: string): boolean {
  const number = numberForm(address);
  if (!home || !/^\+[0-9]{7,}$/.test(number)) return false;
  return !number.startsWith(`+${home}`);
}

// The country calling codes (ITU E.164): none begins another, so a number's is the one it starts with.
const CODES = new Set(
  (
    '1 7 20 27 30 31 32 33 34 36 39 40 41 43 44 45 46 47 48 49 51 52 53 54 55 56 57 58 60 61 62 63 64 65 66 81 82 84 86 90 91 92 93 94 95 98 ' +
    '211 212 213 216 218 220 221 222 223 224 225 226 227 228 229 230 231 232 233 234 235 236 237 238 239 240 241 242 243 244 245 246 247 248 ' +
    '249 250 251 252 253 254 255 256 257 258 260 261 262 263 264 265 266 267 268 269 290 291 297 298 299 350 351 352 353 354 355 356 357 358 ' +
    '359 370 371 372 373 374 375 376 377 378 379 380 381 382 383 385 386 387 389 420 421 423 500 501 502 503 504 505 506 507 508 509 590 591 ' +
    '592 593 594 595 596 597 598 599 670 672 673 674 675 676 677 678 679 680 681 682 683 685 686 687 688 689 690 691 692 800 808 850 852 853 ' +
    '855 856 870 878 880 881 882 883 886 888 960 961 962 963 964 965 966 967 968 970 971 972 973 974 975 976 977 979 992 993 994 995 996 998'
  ).split(' '),
);

/** The country calling code of a number written with one ("+30 69..." is "30"), or ''. */
export function countryCode(address: string): string {
  const digits = numberForm(address).match(/^\+([0-9]{7,})$/)?.[1] ?? '';
  for (const length of [1, 2, 3]) if (CODES.has(digits.slice(0, length))) return digits.slice(0, length);
  return '';
}

/** The phone's own country code, as most of the numbers it talks with (`numbers`) are written: ''
 *  when none is written with one. */
export function guessHome(numbers: string[]): string {
  const counts = new Map<string, number>();
  for (const number of numbers) {
    const code = countryCode(number);
    if (code) counts.set(code, (counts.get(code) ?? 0) + 1);
  }
  return [...counts].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '';
}

/** Whether an address is one number in Android's list of blocked numbers. */
export function isBlocked(address: string, blocked: string[]): boolean {
  const numbers = smsNumbers(address);
  return numbers.length === 1 && blocked.some((b) => sameNumber(b, numbers[0]));
}

/** The owner's word on a number: spam (true), not spam (false), or none (null). */
export function spamMark(address: string, data: SmsData): boolean | null {
  return data.marks.find((m) => sameConversation(m.number, address))?.spam ?? null;
}

/** Why a conversation is spam: blocked, marked so, or caught by the filter while it is on; null
 *  when it is not. A group's conversation never is, nor one with a contact (`known`), nor one
 *  answered, nor, by the filter, a sender the owner always lets through. */
export function spamReason(sms: InboxSms, data: SmsData, blocked: string[], known: boolean): SpamReason | null {
  const numbers = smsNumbers(sms.address);
  if (numbers.length > 1) return null;
  if (isBlocked(sms.address, blocked)) return { kind: 'blocked' };
  const mark = spamMark(sms.address, data);
  if (mark !== null) return mark ? { kind: 'marked' } : null;
  if (!data.spam || known || sms.replied || sms.mine) return null;
  if (data.allowFrom.some((rule) => senderMatches(sms.address, rule, data.home))) return null;
  const rule = data.spamFrom.find((r) => senderMatches(sms.address, r, data.home));
  if (rule) return { kind: 'sender', rule };
  if (data.spamAbroad && isAbroad(sms.address, data.home)) return { kind: 'abroad' };
  const number = numbers.length === 1 && numbers[0].replace(/\D/g, '').length >= 7;
  return spamWords(sms.text, data.spamWords, data.spamLinks, number);
}

/** Whether a conversation is spam (spamReason). */
export function isSpam(sms: InboxSms, data: SmsData, blocked: string[], known: boolean): boolean {
  return spamReason(sms, data, blocked, known) !== null;
}

/** Why a conversation is in Spam, in a sentence. */
export function spamWhy(reason: SpamReason): string {
  switch (reason.kind) {
    case 'blocked':
      return t('Why: the number is blocked on this phone.');
    case 'marked':
      return t('Why: you marked it as spam.');
    case 'sender':
      return t('Why: your rule {rule} names the sender.', { rule: reason.rule });
    case 'abroad':
      return t('Why: a number from abroad.');
    case 'word':
      return t('Why: it has your word "{word}".', { word: reason.word });
    case 'link':
      return t('Why: a link, from a number that is no contact.');
    case 'phrase':
      return t('Why: a link, with words that try to fool ("{phrase}").', { phrase: reason.phrase });
  }
}

/** The Trash's entry for a conversation, if some of it is there. */
export function trashOf(address: string, data: SmsData): Trashed | null {
  return data.trash.find((t) => sameConversation(t.address, address)) ?? null;
}

/** Where a conversation shows, by its latest message: the Trash keeps it while nothing came after
 *  it was put there, Spam takes it next, and the Archive keeps it until a message comes from them
 *  after it was archived. */
export function smsFolder(sms: InboxSms, data: SmsData, blocked: string[], known: boolean): SmsFolder {
  const trashed = trashOf(sms.address, data);
  if (trashed && sms.at <= trashed.upTo) return 'trash';
  if (isSpam(sms, data, blocked, known)) return 'spam';
  const archived = data.archived.find((a) => sameConversation(a.address, sms.address));
  if (archived && (sms.at <= archived.at || sms.mine)) return 'archived';
  return 'list';
}

/** The conversations of each folder, and the archived ones a message brought back to the list,
 *  whose archiving can be forgotten. `known` says which have a contact. */
export function sortSms(threads: InboxSms[], data: SmsData, blocked: string[], known: (sms: InboxSms) => boolean): Record<SmsFolder, InboxSms[]> & { back: string[] } {
  const sorted: Record<SmsFolder, InboxSms[]> & { back: string[] } = { list: [], archived: [], spam: [], trash: [], back: [] };
  for (const sms of threads) {
    const folder = smsFolder(sms, data, blocked, known(sms));
    sorted[folder].push(sms);
    if (folder === 'list' && data.archived.some((a) => sameConversation(a.address, sms.address))) sorted.back.push(sms.address);
  }
  return sorted;
}

/** The messages of a conversation that show: those after the part of it in the Trash. */
export function shownMessages<T extends { at: number }>(messages: T[], trashed: Trashed | null): T[] {
  return trashed ? messages.filter((m) => m.at > trashed.upTo) : messages;
}

/** The Trash's entries whose time is up: they go from the phone. */
export function dueTrash(trash: Trashed[], now: number): Trashed[] {
  return trash.filter((t) => t.at <= now - TRASH_DAYS * DAY);
}

/** When an entry of the Trash goes from the phone. */
export function trashGoesAt(trashed: Trashed): number {
  return trashed.at + TRASH_DAYS * DAY;
}

/** The list with its pinned SMS conversations at the top, each marked, the rest in their order;
 *  and each SMS conversation with a draft shows it. */
export function arrangeRows(rows: InboxRow[], pinned: SmsMark[], drafts: SmsDraft[]): InboxRow[] {
  const marked = rows.map((row) => {
    if (!row.sms) return row;
    const pin = pinned.some((p) => sameConversation(p.address, row.sms));
    const draft = drafts.find((d) => sameConversation(d.address, row.sms))?.text;
    return pin || draft ? { ...row, pinned: pin || undefined, draft } : row;
  });
  return [...marked.filter((row) => row.pinned), ...marked.filter((row) => !row.pinned)];
}

/** Deletes these entries of the Trash from the phone (`remove`: as the SMS app does it) and forgets
 *  each that went; one that could not go stays, to be tried again. Returns how many went. */
export async function emptyTrash(link: SmsLink, entries: Trashed[], remove: (address: string, upTo: number) => Promise<unknown>): Promise<number> {
  let gone = 0;
  for (const entry of entries) {
    try {
      await remove(entry.address, entry.upTo);
    } catch {
      continue;
    }
    await link.untrash(entry.address);
    gone++;
  }
  return gone;
}

const changes = new Set<() => void>();

/** Says the space's order of its SMS changed (a conversation pinned, archived, put in the Trash,
 *  a number blocked), so the screens that show it read it again. */
export function smsOrderChanged(): void {
  changes.forEach((listener) => listener());
}

export function onSmsOrderChanged(listener: () => void): () => void {
  changes.add(listener);
  return () => changes.delete(listener);
}
