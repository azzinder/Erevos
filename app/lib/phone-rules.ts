// Which calls the phone blocks while Erevos is the phone app (modules/erevos-phone, ScreeningService):
// numbers in the ranges some countries reserve for telemarketing, and numbers starting with a
// prefix the owner adds; never a number in the phone's contacts. Kept natively, on the phone, the
// same for every space: a call is screened with Erevos locked, and rules kept in one space would
// tell that it exists. Only prefixes are kept, no names. Here they are read, changed and turned
// into the digits the native side matches.

import { mark } from './i18n';

/** A country's range for telemarketing: its calling code, the starts of the numbers after it, how
 *  the country writes them, who reserved them, and what to know of it. */
export type Range = { country: string; code: string; prefixes: string[]; shown: string; source: string; note?: string };

/**
 * The countries that reserve numbers for telemarketing calls, so a call from one is one. Only
 * those whose regulator did: France (ARCEP, decision 2022-1583, since 2023), Spain (the 400 range,
 * BOE-A-2026-8409, since 17 October 2026), Chile (809, SUBTEL, since August 2025), India (140,
 * TRAI) and Brazil (0303, Anatel; optional for the callers since August 2025, so only part of the
 * telemarketing there uses it).
 */
export const TELEMARKETING: Range[] = [
  {
    country: mark('France'),
    code: '33',
    prefixes: ['162', '163', '270', '271', '377', '378', '424', '425', '568', '569', '948', '949', '9475', '9476', '9477', '9478', '9479'],
    shown: '01 62, 01 63, 02 70, 02 71, 03 77, 03 78, 04 24, 04 25, 05 68, 05 69, 09 48, 09 49, 09 475 – 09 479',
    source: 'ARCEP 2022-1583',
  },
  { country: mark('Spain'), code: '34', prefixes: ['400'], shown: '400', source: 'BOE-A-2026-8409' },
  { country: mark('Chile'), code: '56', prefixes: ['809'], shown: '809', source: 'SUBTEL' },
  { country: mark('India'), code: '91', prefixes: ['140'], shown: '140', source: 'TRAI' },
  { country: mark('Brazil'), code: '55', prefixes: ['303'], shown: '0303', source: 'Anatel', note: mark('optional for the callers since August 2025') },
];

/** The most prefixes of the owner's own, and the fewest and most digits of one. */
export const MAX_OWN = 50;
const FEWEST = 2;
const MOST = 15;

export type PhoneRules = {
  /** Calls from the telemarketing ranges are blocked. */
  telemarketing: boolean;
  /** The owner's prefixes, as typed and cleaned (ownPrefix): "+33162", "0162". */
  own: string[];
};

export const NO_RULES: PhoneRules = { telemarketing: false, own: [] };

/** What the native side keeps and matches: the rules, and the digits a number starts with,
 *  after its + (`international`), or as the phone's country writes it (`national`). */
export type StoredRules = PhoneRules & { international: string[]; national: string[] };

/** A prefix as the owner typed it: "+33 1 62", "0033162" or "0162". Null when it is none. */
export function ownPrefix(text: string): string | null {
  const plain = text.replace(/[\s().-]/g, '');
  if (!/^\+?\d+$/.test(plain)) return null;
  const international = plain.startsWith('+') ? plain.slice(1) : plain.startsWith('00') ? plain.slice(2) : null;
  const digits = international ?? plain;
  if (digits.length < FEWEST || digits.length > MOST) return null;
  return international !== null ? `+${digits}` : digits;
}

/** The rules, with the digits to match. */
export function storedRules(rules: PhoneRules): StoredRules {
  const international = new Set<string>();
  const national = new Set<string>();
  if (rules.telemarketing) for (const range of TELEMARKETING) for (const p of range.prefixes) international.add(range.code + p);
  for (const own of rules.own) {
    if (own.startsWith('+')) international.add(own.slice(1));
    else national.add(own);
  }
  return { ...rules, international: [...international], national: [...national] };
}

/** Rules as kept, checked: what is not understood is left out. */
export function checkedRules(value: unknown): PhoneRules {
  const v = (value ?? {}) as Partial<Record<keyof PhoneRules, unknown>>;
  const own = Array.isArray(v.own) ? v.own.map((p) => (typeof p === 'string' ? ownPrefix(p) : null)).filter((p): p is string => p !== null) : [];
  return { telemarketing: v.telemarketing === true, own: [...new Set(own)].slice(0, MAX_OWN) };
}

/** The rules the native side keeps (blockingRules() in modules/erevos-phone), or none. */
export function rulesFrom(json: string): PhoneRules {
  if (!json) return NO_RULES;
  try {
    return checkedRules(JSON.parse(json));
  } catch {
    return NO_RULES;
  }
}

/** What the native side is to keep: '' when nothing is blocked. */
export function rulesJson(rules: PhoneRules): string {
  return rules.telemarketing || rules.own.length ? JSON.stringify(storedRules(rules)) : '';
}

/** The rules with one more prefix, unless it is there already. */
export function addPrefix(rules: PhoneRules, prefix: string): PhoneRules {
  if (rules.own.includes(prefix) || rules.own.length >= MAX_OWN) return rules;
  return { ...rules, own: [...rules.own, prefix] };
}

export function removePrefix(rules: PhoneRules, prefix: string): PhoneRules {
  return { ...rules, own: rules.own.filter((p) => p !== prefix) };
}

/** Whether a number, its digits after the +(`international`, '' when unknown), starts with a
 *  blocked prefix. The native side matches the same way, and the owner's national prefixes in the
 *  way the phone's country writes numbers. */
export function blockedInternational(rules: StoredRules, international: string): boolean {
  return international !== '' && rules.international.some((p) => international.startsWith(p));
}

/** How a prefix of the owner's reads: "+33162…", "0162…". */
export function shownPrefix(prefix: string): string {
  return `${prefix}…`;
}
