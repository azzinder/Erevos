import type { InboxRow, InboxSms } from './inbox';
import { sameConversation } from './sms-group';
import { TRASH_DAYS, type SmsData, type SmsMark, type Trashed } from '../lock/sms-data';
import type { SmsLink } from './sms-link';

// The space's own order of its SMS conversations (lock/sms-data.ts), over the phone's SMS as every
// space reads them: pinned ones at the top of the list, archived ones out of it until a message
// comes from them after, and ones in the Trash out of everything until they go from the phone. All
// of it is worked out here, on the phone. Another space keeps its own order, and sees the phone's
// SMS as they are.

export type SmsFolder = 'list' | 'archived' | 'trash';

const DAY = 24 * 3600 * 1000;

/** The Trash's entry for a conversation, if some of it is there. */
export function trashOf(address: string, data: SmsData): Trashed | null {
  return data.trash.find((t) => sameConversation(t.address, address)) ?? null;
}

/** Where a conversation shows, by its latest message: the Trash keeps it while nothing came after
 *  it was put there, and the Archive keeps it until a message comes from them after it was
 *  archived. */
export function smsFolder(sms: InboxSms, data: SmsData): SmsFolder {
  const trashed = trashOf(sms.address, data);
  if (trashed && sms.at <= trashed.upTo) return 'trash';
  const archived = data.archived.find((a) => sameConversation(a.address, sms.address));
  if (archived && (sms.at <= archived.at || sms.mine)) return 'archived';
  return 'list';
}

/** The conversations of each folder, and the archived ones a message brought back to the list,
 *  whose archiving can be forgotten. */
export function sortSms(threads: InboxSms[], data: SmsData): Record<SmsFolder, InboxSms[]> & { back: string[] } {
  const sorted: Record<SmsFolder, InboxSms[]> & { back: string[] } = { list: [], archived: [], trash: [], back: [] };
  for (const sms of threads) {
    const folder = smsFolder(sms, data);
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

/** The list with its pinned SMS conversations at the top, each marked, the rest in their order. */
export function arrangeRows(rows: InboxRow[], pinned: SmsMark[]): InboxRow[] {
  const marked = rows.map((row) => (row.sms && pinned.some((p) => sameConversation(p.address, row.sms)) ? { ...row, pinned: true } : row));
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

/** Says the space's order of its SMS changed (a conversation pinned, archived, put in the Trash),
 *  so the screens that show it read it again. */
export function smsOrderChanged(): void {
  changes.forEach((listener) => listener());
}

export function onSmsOrderChanged(listener: () => void): () => void {
  changes.add(listener);
  return () => changes.delete(listener);
}
