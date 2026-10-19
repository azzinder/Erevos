import type { InboxRow } from '../lib/inbox';

import { checkedAvatar } from './e2e-data';
import { sealedFile, sealedSize } from './sealed-file';

// The home screen's list as it last showed, kept for the space and sealed like its contacts
// (sealed-file.ts), so the list shows at once when Erevos opens while the chats and the phone's SMS
// are read again, as the phone's own SMS app shows its own copy. Only the first ROWS rows, each
// last line cut short, in a value of one fixed size: the file tells neither how many chats a space
// has nor which spaces are in use. Hidden chats are never in the list, so never here, and a
// disappearing message's text is not kept either: it could outlast the message.

export type InboxCache = { rows: InboxRow[] };

export const EMPTY_INBOX: InboxCache = { rows: [] };

const FILE = 'erevos-inbox';
const BLOCK = 16 * 1024;
/** The rows kept: about a screen and a half. */
export const ROWS = 30;
/** The characters of a row's last line kept. */
export const LAST = 80;

const isText = (v: unknown, max: number): v is string => typeof v === 'string' && v.length <= max;
const isCount = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0;

function checkedRow(value: unknown): InboxRow | null {
  const r = (value ?? {}) as Record<string, unknown>;
  if (!isText(r.identity, 200) || !r.identity || !isText(r.name, 200) || !isText(r.last, LAST + 1) || !isText(r.sms, 400)) return null;
  if (!isCount(r.at) || !isCount(r.unread) || !isCount(r.timer)) return null;
  const mark = r.mark === -1 || r.mark === 1 || r.mark === 2 ? r.mark : 0;
  return {
    identity: r.identity,
    name: r.name,
    last: r.last,
    mine: r.mine === true,
    mark,
    at: r.at,
    unread: r.unread,
    timer: r.timer,
    imported: r.imported === true,
    avatar: checkedAvatar(r.avatar),
    sms: r.sms,
    lastSms: r.lastSms === true,
    ...(r.pinned === true ? { pinned: true } : {}),
  };
}

function checked(value: unknown): InboxCache {
  const rows = (value as { rows?: unknown } | null)?.rows;
  return { rows: Array.isArray(rows) ? rows.map(checkedRow).filter((r): r is InboxRow => r !== null).slice(0, ROWS) : [] };
}

/** The first rows, last lines cut short (none from a disappearing chat), as many as fit in the fixed size.
 *  A draft and a contact's photo are not kept: the space keeps its drafts itself, and the photos are the phone's. */
export function kept(rows: InboxRow[]): InboxCache {
  const line = (r: InboxRow) => (r.fades || r.timer > 0 ? '' : r.last.length > LAST ? `${r.last.slice(0, LAST)}…` : r.last);
  const cache = { rows: rows.slice(0, ROWS).map((r) => ({ ...r, last: line(r), fades: undefined, draft: undefined, photo: undefined })) };
  while (cache.rows.length > 0 && sealedSize(cache) > BLOCK) cache.rows.pop();
  return cache;
}

const store = sealedFile({ name: FILE, empty: EMPTY_INBOX, checked, block: BLOCK, fixed: true });

/** The space's list as it last showed, or none. */
export function loadInboxCache(space: number, key: Uint8Array): Promise<InboxCache> {
  return store.load('space', space, key);
}

// What was kept last, so the same list is not written again (every message reads the list anew).
let last = '';

/** Keeps the space's list as it shows now. */
export async function saveInboxCache(space: number, key: Uint8Array, rows: InboxRow[]): Promise<void> {
  const cache = kept(rows);
  const json = `${space}:${JSON.stringify(cache)}`;
  if (json === last) return;
  await store.save('space', space, key, cache);
  last = json;
}
