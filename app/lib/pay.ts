// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// A payment request in a chat with a contact: an amount, its currency and what it is for, as a
// card (components/pay-card.tsx). Fasouli asks for one with a link that opens Erevos,
// erevos://pay?a=<amount, in its smallest units>&d=<decimals>&c=<currency>&w=<what for>&r=<its own
// mark>: Erevos opens Send to (app/share.tsx), with only Erevos chats, and the chat picked asks
// before it sends. The contact taps **Paid** on it, which tells the sender's phone (`settled`, by
// the request's tag), and the sender's card then offers **Mark in Fasouli**: a link back,
// lphlchrima://paid?r=<the mark>, that marks the transaction collected there. Erevos moves no
// money, and knows of no bank or wallet: the card only says what was asked and that it was paid.
// Its words say it all to an Erevos from before, or any other app.
// Self-contained on purpose, so it can run under plain Node for checks.

/** A payment request: `a` in the currency's smallest units (cents), `d` how many decimals they
 *  are, `c` the currency's code (EUR, or BTC for one Fasouli keeps), `w` what it is for, and `r`
 *  Fasouli's own mark for it, which only goes back to Fasouli. */
export type Pay = { a: number; d: number; c: string; w: string; r?: string };

/** That a payment request was paid, by the request's tag: the one asked sends it. */
export type Paid = { tag: string };

export const MAX_PAY_WHAT = 100;
const MAX_AMOUNT = 10 ** 15;
const MAX_DECIMALS = 8;
const CURRENCY = /^[A-Z][A-Z0-9]{1,9}$/;
const REF = /^[A-Za-z0-9_-]{1,64}$/;
const isTag = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f]{12}$/.test(v);

// One line, without the marks that change how text runs, as the words of a poll are kept.
function plainLine(v: unknown, most: number): string {
  if (typeof v !== 'string') return '';
  const text = v.replace(/[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁦-⁩﻿]/g, ' ').replace(/\s+/g, ' ').trim();
  return [...text].slice(0, most).join('');
}

/** A payment request as it may come, or null when it is not one. */
export function checkedPay(value: unknown): Pay | null {
  const v = value as Partial<Record<keyof Pay, unknown>> | null;
  if (!v || typeof v !== 'object') return null;
  const { a, d, c, r } = v;
  if (typeof a !== 'number' || !Number.isSafeInteger(a) || a < 1 || a > MAX_AMOUNT) return null;
  if (typeof d !== 'number' || !Number.isInteger(d) || d < 0 || d > MAX_DECIMALS) return null;
  if (typeof c !== 'string' || !CURRENCY.test(c)) return null;
  return { a, d, c, w: plainLine(v.w, MAX_PAY_WHAT), ...(typeof r === 'string' && REF.test(r) ? { r } : {}) };
}

/** That a request was paid, as it may come, or null. */
export function checkedPaid(value: unknown): Paid | null {
  const v = value as { tag?: unknown } | null;
  return v && typeof v === 'object' && isTag(v.tag) ? { tag: v.tag } : null;
}

/** The request a link's details ask for (linkParts in lib/open-link.ts), or null. */
export function payOfLink(params: Record<string, string | string[] | undefined>): Pay | null {
  const one = (key: string) => (typeof params[key] === 'string' ? (params[key] as string).trim() : '');
  const whole = (text: string) => (/^\d{1,16}$/.test(text) ? Number(text) : NaN);
  return checkedPay({ a: whole(one('a')), d: whole(one('d') || '2'), c: one('c').toUpperCase(), w: one('w'), ...(one('r') ? { r: one('r') } : {}) });
}

/** The link that asks for a request (as Fasouli makes it): its words go through linkParts. */
export function payLink(pay: Pay): string {
  const query = [`a=${pay.a}`, `d=${pay.d}`, `c=${encodeURIComponent(pay.c)}`, `w=${encodeURIComponent(pay.w)}`, ...(pay.r ? [`r=${encodeURIComponent(pay.r)}`] : [])];
  return `erevos://pay?${query.join('&')}`;
}

/** The amount as words, in `locale`: "45,00 €", or "0.00125 BTC" for a code the language does not name. */
export function payAmount(pay: Pay, locale?: string): string {
  const value = pay.a / 10 ** pay.d;
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency: pay.c, minimumFractionDigits: pay.d, maximumFractionDigits: pay.d }).format(value);
  } catch {
    const number = new Intl.NumberFormat(locale, { minimumFractionDigits: pay.d, maximumFractionDigits: pay.d }).format(value);
    return `${number} ${pay.c}`;
  }
}

/** The link that marks the request collected in Fasouli, from the sender's card once it is paid; null with no mark. */
export function fasouliPaidLink(pay: Pay): string | null {
  return pay.r ? `lphlchrima://paid?r=${encodeURIComponent(pay.r)}&a=${pay.a}&c=${encodeURIComponent(pay.c)}` : null;
}

// A request handed to the chat about to open (from Send to), to ask there before it goes.
let handed: { to: string; pay: Pay; until: number } | null = null;
const FRESH = 60_000;

/** Hands a request to the chat of `to` (`contact:` and an identity), which asks before it sends it. */
export function handPay(to: string, pay: Pay, now = Date.now()): void {
  handed = { to, pay, until: now + FRESH };
}

/** The request handed to `to`, once. */
export function takePay(to: string, now = Date.now()): Pay | null {
  const kept = handed;
  if (!kept || kept.until <= now || kept.to !== to) return null;
  handed = null;
  return kept.pay;
}
