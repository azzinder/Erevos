import { sealedFile, type Holder } from './sealed-file';

// What each space keeps for SMS (lib/sms-invite.ts), sealed like its contacts (sealed-file.ts):
// whether to send SMS invites, the invites sent and not answered yet with the keys that open
// their answers, the invites that came from other Erevos phones, and invite pieces still waiting
// for the rest; whether to show names from the phone's contacts, and the SIM chosen for each number.
// The SMS themselves stay in the phone's SMS store, where every SMS app keeps them; one sent for
// later is kept here instead until it goes (lib/sms-later.ts), so no other app sees it before, and
// Android holds a copy locked with this phone's own key, to send it then with the space locked.
// The space's own order of its SMS is sealed in ORDER_FILE, never in the phone's store, so no other
// app and no other space sees it (lib/sms-folders.ts): the conversations pinned, archived and put
// in the Trash, what is typed in each and not sent, the spam filter's rules and the numbers marked
// spam or not, and the seconds an SMS waits before it goes, to be taken back. Backups hold that
// file and not this one, so a backup restored on another phone never sends an SMS for later again.

export type { Holder };

export type SentInvite = { number: string; secret: string; at: number };
export type GotInvite = { number: string; sender: string; at: number };
export type WaitingPiece = { from: string; data: string; at: number };
/** The SIM (its subscription id) chosen for SMS to a number, or a group's numbers comma-separated. */
export type NumberSim = { number: string; sim: number };
/** An SMS to one number, to go at `at` on `sim` (-1: the phone's default). */
export type LaterSms = { id: string; to: string; text: string; at: number; sim: number };
/** A conversation, by its address (a group's numbers comma-separated), pinned or archived at `at`. */
export type SmsMark = { address: string; at: number };
/** A conversation put in the Trash at `at`: its messages up to `upTo` show no more, and go from
 *  the phone TRASH_DAYS later. */
export type Trashed = { address: string; upTo: number; at: number };
/** What is typed in a conversation and not sent yet. */
export type SmsDraft = { address: string; text: string; at: number };
/** A number the owner said sends spam, or does not. */
export type SpamMark = { number: string; spam: boolean; at: number };

export type SmsData = {
  /** Send an invite with the first SMS to a number with no contact. */
  invites: boolean;
  sent: SentInvite[];
  got: GotInvite[];
  waiting: WaitingPiece[];
  /** Show the names the phone's contacts give SMS numbers. Off until the owner turns it on. */
  names: boolean;
  sims: NumberSim[];
  /** SMS sent for later, until they go. */
  later: LaterSms[];
  /** Conversations at the top of the list. */
  pinned: SmsMark[];
  /** Conversations out of the list, until a message comes after. */
  archived: SmsMark[];
  trash: Trashed[];
  drafts: SmsDraft[];
  /** The spam filter: on unless turned off. With `spamLinks`, any number that is no contact and
   *  sends a link goes to Spam; with `spamWords`, any that writes one of them; with `spamFrom`, any
   *  sender a rule there names (lib/sms-folders.ts, senderRule); with `spamAbroad`, any number written
   *  with another country code than `home`. A sender `allowFrom` names never goes by those rules. */
  spam: boolean;
  spamLinks: boolean;
  spamWords: string[];
  spamFrom: string[];
  allowFrom: string[];
  spamAbroad: boolean;
  /** The phone's own country calling code, in digits ("30"), or '' when not known. */
  home: string;
  marks: SpamMark[];
  /** Seconds an SMS waits before it goes, to be taken back: 0, 5 or 10. */
  undo: number;
};

export const EMPTY_SMS: SmsData = {
  invites: true,
  sent: [],
  got: [],
  waiting: [],
  names: false,
  sims: [],
  later: [],
  pinned: [],
  archived: [],
  trash: [],
  drafts: [],
  spam: true,
  spamLinks: false,
  spamWords: [],
  spamFrom: [],
  allowFrom: [],
  spamAbroad: false,
  home: '',
  marks: [],
  undo: 5,
};

const FILE = 'erevos-sms';
/** The space's own order of its SMS, in a file of its own that backups hold (lock/backup.ts). */
export const ORDER_FILE = 'erevos-sms-order';
const BLOCK = 4 * 1024;
/** Invites older than this are forgotten, and a number can be invited again. */
export const INVITE_DAYS = 30;
const MAX = 50;
const MAX_SIMS = 300;
/** The SMS that can wait to go later at once, and the longest text of one: as long as a chat's. */
export const MAX_LATER = MAX;
export const LATER_TEXT = 4000;
/** The conversations that can be pinned at once, and those kept archived, in the Trash, with a
 *  draft, and numbers marked; the owner's spam words and sender rules, each this long at most. */
export const MAX_PINS = 10;
const MAX_ARCHIVED = 500;
export const MAX_TRASH = 300;
const MAX_DRAFTS = 100;
const MAX_MARKS = 500;
export const MAX_WORDS = 50;
export const WORD = 40;
/** Days a conversation stays in the Trash before it goes from the phone. */
export const TRASH_DAYS = 30;
export const UNDO_SECONDS = [0, 5, 10];

const isText = (v: unknown): v is string => typeof v === 'string';
const isTime = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0;
const isNumber = (v: unknown): v is string => isText(v) && v.length > 0 && v.length <= 32;
const isAddress = (v: unknown): v is string => isText(v) && v.length > 0 && v.length <= 400;
const list = <T>(v: unknown, ok: (item: Record<string, unknown>) => T | null, max = MAX): T[] =>
  Array.isArray(v) ? v.map((item) => ok((item ?? {}) as Record<string, unknown>)).filter((x): x is T => x !== null).slice(-max) : [];
const words = (v: unknown): string[] => (Array.isArray(v) ? v : []).filter((w): w is string => isText(w) && w.trim().length > 0 && w.length <= WORD).slice(-MAX_WORDS);
const marked = (m: Record<string, unknown>): SmsMark | null => (isAddress(m.address) && isTime(m.at) ? { address: m.address, at: m.at } : null);

function checked(value: unknown): SmsData {
  const v = (value ?? {}) as Partial<Record<keyof SmsData, unknown>>;
  return {
    invites: v.invites !== false,
    sent: list(v.sent, (s) => (isNumber(s.number) && isText(s.secret) && /^[A-Za-z0-9_-]{43}$/.test(s.secret) && isTime(s.at) ? { number: s.number, secret: s.secret, at: s.at } : null)),
    got: list(v.got, (g) => (isNumber(g.number) && isText(g.sender) && /^[0-9a-f]{48}$/.test(g.sender) && isTime(g.at) ? { number: g.number, sender: g.sender, at: g.at } : null)),
    waiting: list(v.waiting, (w) => (isNumber(w.from) && isText(w.data) && w.data.length <= 400 && isTime(w.at) ? { from: w.from, data: w.data, at: w.at } : null)),
    names: v.names === true,
    sims: (Array.isArray(v.sims) ? v.sims : [])
      .map((item) => (item ?? {}) as Record<string, unknown>)
      .filter((n) => isText(n.number) && n.number.length > 0 && n.number.length <= 400 && Number.isInteger(n.sim) && (n.sim as number) >= 0)
      .map((n) => ({ number: n.number as string, sim: n.sim as number }))
      .slice(-MAX_SIMS),
    later: list(v.later, (l) =>
      isText(l.id) && /^[A-Za-z0-9_-]{1,32}$/.test(l.id) && isNumber(l.to) && isText(l.text) && l.text.length > 0 && l.text.length <= LATER_TEXT && isTime(l.at) && Number.isInteger(l.sim) && (l.sim as number) >= -1
        ? { id: l.id, to: l.to, text: l.text, at: l.at, sim: l.sim as number }
        : null,
    ),
    pinned: list(v.pinned, marked, MAX_PINS),
    archived: list(v.archived, marked, MAX_ARCHIVED),
    trash: list(v.trash, (t) => (isAddress(t.address) && isTime(t.upTo) && isTime(t.at) ? { address: t.address, upTo: t.upTo, at: t.at } : null), MAX_TRASH),
    drafts: list(v.drafts, (d) => (isAddress(d.address) && isText(d.text) && d.text.length > 0 && d.text.length <= LATER_TEXT && isTime(d.at) ? { address: d.address, text: d.text, at: d.at } : null), MAX_DRAFTS),
    spam: v.spam !== false,
    spamLinks: v.spamLinks === true,
    spamWords: words(v.spamWords),
    spamFrom: words(v.spamFrom),
    allowFrom: words(v.allowFrom),
    spamAbroad: v.spamAbroad === true,
    home: isText(v.home) && /^[1-9][0-9]{0,2}$/.test(v.home) ? v.home : '',
    marks: list(v.marks, (m) => (isNumber(m.number) && typeof m.spam === 'boolean' && isTime(m.at) ? { number: m.number, spam: m.spam, at: m.at } : null), MAX_MARKS),
    undo: UNDO_SECONDS.includes(v.undo as number) ? (v.undo as number) : EMPTY_SMS.undo,
  };
}

/** Drops what is older than INVITE_DAYS. */
export function fresh(data: SmsData, now: number): SmsData {
  const after = now - INVITE_DAYS * 24 * 3600 * 1000;
  return { ...data, sent: data.sent.filter((s) => s.at > after), got: data.got.filter((g) => g.at > after), waiting: data.waiting.filter((w) => w.at > after) };
}

// What ORDER_FILE holds of a space's SMS data; FILE holds the rest. `kept` is written with each
// save: from then on the order is ORDER_FILE's, and what FILE kept of it before (as an Erevos before
// ORDER_FILE did) is read no more.
const ORDER = ['pinned', 'archived', 'trash', 'drafts', 'spam', 'spamLinks', 'spamWords', 'spamFrom', 'allowFrom', 'spamAbroad', 'home', 'marks', 'undo'] as const;
type SmsOrder = Pick<SmsData, (typeof ORDER)[number]>;
type KeptOrder = SmsOrder & { kept: boolean };

const orderOf = (data: SmsOrder): SmsOrder => Object.fromEntries(ORDER.map((name) => [name, data[name]])) as SmsOrder;

const store = sealedFile({ name: FILE, empty: EMPTY_SMS, checked, block: BLOCK });
const orders = sealedFile<KeptOrder>({
  name: ORDER_FILE,
  empty: { ...orderOf(EMPTY_SMS), kept: false },
  checked: (value) => ({ ...orderOf(checked(value)), kept: (value as { kept?: unknown } | null)?.kept === true }),
  block: BLOCK,
});

// Counts the saves here, so what read the data can tell whether it changed since without reading
// it again (lib/sms-link.ts): every save goes through saveSmsData.
let saves = 0;

/** How many saves there were so far: the same number again means none since. */
export const smsSaves = (): number => saves;

/** The data was written another way (a backup put back): read again by all that read it. */
export function smsDataChanged(): void {
  saves++;
}

export async function loadSmsData(holder: Holder, space: number, key: Uint8Array): Promise<SmsData> {
  const [data, order] = await Promise.all([store.load(holder, space, key), orders.load(holder, space, key)]);
  return order.kept ? { ...data, ...orderOf(order) } : data;
}

/** Saves the order first: once it is kept there, FILE's copy of it from before is read no more. */
export async function saveSmsData(holder: Holder, space: number, key: Uint8Array, data: SmsData): Promise<void> {
  try {
    await orders.save(holder, space, key, { ...orderOf(data), kept: true });
    await store.save(holder, space, key, { ...data, ...orderOf(EMPTY_SMS) });
  } finally {
    saves++;
  }
}
