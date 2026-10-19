import type { InboxRow, InboxSms } from './inbox';
import { sameConversation, smsNumbers } from './sms-group';
import { sameNumber } from './sms-invite';
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
// the same SMS, from a number that is no contact and was never answered.
const SPAM_PHRASES = [
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

const hasLink = (text: string) => splitLinks(text).some((part) => part.url);

/**
 * Whether an SMS looks like spam by the filter's rules: one of the owner's words in it; or, from a
 * phone number (`number`, not a sender's name nor a short code, which banks and shops use), a link
 * with words that try to fool, or any link when `links` is on.
 */
export function looksLikeSpam(text: string, words: string[], links: boolean, number: boolean): boolean {
  const plain = plainText(text);
  if (words.some((word) => plainText(word) && plain.includes(plainText(word)))) return true;
  if (!number || !hasLink(text)) return false;
  return links || SPAM_PHRASES.some((phrase) => plain.includes(phrase));
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

/** Whether a conversation is spam: blocked, marked so, or caught by the filter while it is on. A
 *  group's conversation never is, nor one with a contact (`known`), nor one answered. */
export function isSpam(sms: InboxSms, data: SmsData, blocked: string[], known: boolean): boolean {
  const numbers = smsNumbers(sms.address);
  if (numbers.length > 1) return false;
  if (isBlocked(sms.address, blocked)) return true;
  const mark = spamMark(sms.address, data);
  if (mark !== null) return mark;
  if (!data.spam || known || sms.replied || sms.mine) return false;
  const number = numbers.length === 1 && numbers[0].replace(/\D/g, '').length >= 7;
  return looksLikeSpam(sms.text, data.spamWords, data.spamLinks, number);
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
