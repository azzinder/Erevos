import { sealedFile, type Holder } from './sealed-file';

// What each space keeps for SMS (lib/sms-invite.ts), sealed like its contacts (sealed-file.ts):
// whether to send SMS invites, the invites sent and not answered yet with the keys that open
// their answers, the invites that came from other Erevos phones, and invite pieces still waiting
// for the rest. The SMS themselves stay in the phone's SMS store, where every SMS app keeps them.

export type { Holder };

export type SentInvite = { number: string; secret: string; at: number };
export type GotInvite = { number: string; sender: string; at: number };
export type WaitingPiece = { from: string; data: string; at: number };

export type SmsData = {
  /** Send an invite with the first SMS to a number with no contact. */
  invites: boolean;
  sent: SentInvite[];
  got: GotInvite[];
  waiting: WaitingPiece[];
};

export const EMPTY_SMS: SmsData = { invites: true, sent: [], got: [], waiting: [] };

const FILE = 'erevos-sms';
const BLOCK = 4 * 1024;
/** Invites older than this are forgotten, and a number can be invited again. */
export const INVITE_DAYS = 30;
const MAX = 50;

const isText = (v: unknown): v is string => typeof v === 'string';
const isTime = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0;
const isNumber = (v: unknown): v is string => isText(v) && v.length > 0 && v.length <= 32;
const list = <T>(v: unknown, ok: (item: Record<string, unknown>) => T | null): T[] =>
  Array.isArray(v) ? v.map((item) => ok((item ?? {}) as Record<string, unknown>)).filter((x): x is T => x !== null).slice(-MAX) : [];

function checked(value: unknown): SmsData {
  const v = (value ?? {}) as Partial<Record<keyof SmsData, unknown>>;
  return {
    invites: v.invites !== false,
    sent: list(v.sent, (s) => (isNumber(s.number) && isText(s.secret) && /^[A-Za-z0-9_-]{43}$/.test(s.secret) && isTime(s.at) ? { number: s.number, secret: s.secret, at: s.at } : null)),
    got: list(v.got, (g) => (isNumber(g.number) && isText(g.sender) && /^[0-9a-f]{48}$/.test(g.sender) && isTime(g.at) ? { number: g.number, sender: g.sender, at: g.at } : null)),
    waiting: list(v.waiting, (w) => (isNumber(w.from) && isText(w.data) && w.data.length <= 400 && isTime(w.at) ? { from: w.from, data: w.data, at: w.at } : null)),
  };
}

/** Drops what is older than INVITE_DAYS. */
export function fresh(data: SmsData, now: number): SmsData {
  const after = now - INVITE_DAYS * 24 * 3600 * 1000;
  return { ...data, sent: data.sent.filter((s) => s.at > after), got: data.got.filter((g) => g.at > after), waiting: data.waiting.filter((w) => w.at > after) };
}

const store = sealedFile({ name: FILE, empty: EMPTY_SMS, checked, block: BLOCK });

export const loadSmsData = store.load;
export const saveSmsData = store.save;
