// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { mark } from './i18n';

// A word of care over the first messages of someone not accepted yet (a message request): what in
// them often comes with a scam, looked for on this phone only, in the words of every language the
// app has. It only advises: nothing is blocked, hidden or sent anywhere, and a message that says
// none of it says nothing. Self-contained, so it runs under plain Node for checks.

export type ScamSign = 'code' | 'money' | 'gain' | 'name';

/** What each sign says, in the app's words (t()). */
export const SCAM_SAYS: Record<ScamSign, string> = {
  code: mark('It asks for a code, a PIN or a password. No one who knows you needs the codes your phone or bank sends you.'),
  money: mark('It asks for money, a gift card or crypto. Check with them another way, by calling a number you already have.'),
  gain: mark('It promises easy money: a win, a sure profit or an investment. These are almost always scams.'),
  name: mark('Their name looks like the name of one of your contacts, but this is not that contact.'),
};

// Lower case, without accents, so «κωδικό» is «κωδικο» and «código» is «codigo».
export function plain(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

// What each sign looks for, in plain() text: en, el, de, es, fr, it, pt, sh.
const SIGNS: Record<Exclude<ScamSign, 'name'>, RegExp[]> = {
  code: [
    /\b(verification|confirmation|security|sms|login|one[- ]time|6[- ]digit|activation) code\b/,
    /\bcode (you|that) (got|received|just got)\b/,
    /\b(send|tell|give|forward) me (the|your|that) (code|pin|password|passcode)\b/,
    /\b(your|the) (pin|password|passcode)\b/,
    /\b(seed|recovery) phrase\b|\botp\b/,
    /κωδικ(ο|ος|ου)? (επαληθευσης|επιβεβαιωσης|ασφαλειας|sms|που (σου )?ηρθε|που ελαβες)|στειλε μου (τον|το) (κωδικο|pin)|(τον|το) (κωδικο|pin) σου/,
    /\b(bestatigungs|verifizierungs|sicherheits|sms)code\b|\bcode, den du\b|\b(dein|deine|das|die) (pin|passwort|kennwort|tan)\b/,
    /\bcodigo (de verificacion|de confirmacion|de seguridad|sms|que (te )?(llego|recibiste))\b|\b(tu|la) (contrasena|clave|pin)\b/,
    /\bcode (de verification|de confirmation|de securite|sms|que tu as recu)\b|\b(ton|ta) (mot de passe|pin|code)\b/,
    /\bcodice (di verifica|di conferma|di sicurezza|sms|che (ti e arrivato|hai ricevuto))\b|\b(la tua|il tuo) (password|pin|codice)\b/,
    /\bcodigo (de verificacao|de confirmacao|de seguranca|sms|que (voce )?recebeu)\b|\b(sua|seu|a) (senha|pin)\b/,
    /\b(verifikacijski|sigurnosni|sms) kod\b|\bkod (koji|sto) (si|ste) dobi|\b(tvoj|tvoja|vas|vasa) (pin|lozinka|sifra|kod)\b/,
  ],
  money: [
    /\b(send|transfer|wire|lend|pay) (me )?(some |the )?(money|cash|euros?|dollars?|€|\$)/,
    /\bgift ?cards?\b|\bwestern union\b|\bmoneygram\b|\b(bitcoin|btc|usdt|ethereum|crypto) (address|wallet)\b/,
    /(στειλε|δανεισε|καταθεσε|μεταφερε) (μου )?(λεφτα|χρηματα|ευρω)|δωροκαρτ|κουπονι (google|apple|amazon)/,
    /\b(schick|uberweis|leih)\w* (mir )?(geld|euro)|\bgutschein ?karte|\bgeschenkkarte\b/,
    /\b(envia|enviame|transfiere|presta|prestame)\w* (me )?(dinero|euros?|plata)|\btarjeta(s)? regalo\b/,
    /\b(envoie|vire|prete)\w* (moi )?(de l'argent|des euros|l'argent)|\bcarte(s)? cadeau\b/,
    /\b(manda|mandami|invia|inviami|presta|prestami|bonifica)\w* (mi )?(soldi|denaro|euro)|\bcarta regalo\b|\bbuono regalo\b/,
    /\b(manda|mande|envia|envie|transfere|empresta|me empresta)\w* (me )?(dinheiro|grana|euros?|um pix)|\bcartao presente\b|\bvale presente\b/,
    /\b(posalji|posaljite|uplati|uplatite|pozajmi)\w* (mi )?(novac|pare|novce|eura)|\bpoklon ?kartic/,
  ],
  gain: [
    /\b(guaranteed|sure) (profit|returns?|income)\b|\bdouble your\b|\bpassive income\b|\b(forex|crypto) (trading|investment)\b|\byou (have )?won\b|\bairdrop\b|\binvest(ment)? opportunity\b/,
    /εγγυημενο κερδος|σιγουρο κερδος|διπλασιασε|κερδισες|επενδυτικη ευκαιρια|παθητικο εισοδημα/,
    /\bgarantierte(r|n)? (gewinn|rendite)\b|\bverdopple\b|\bdu hast gewonnen\b|\b(passives einkommen|investitionsmoglichkeit)\b/,
    /\b(ganancia|beneficio|rentabilidad) garantizad[ao]\b|\bduplica tu\b|\bhas ganado\b|\b(ingresos pasivos|oportunidad de inversion)\b/,
    /\b(profit|gain|rendement) garanti\b|\bdouble(z)? ton\b|\btu as gagne\b|\b(revenu passif|opportunite d'investissement)\b/,
    /\b(guadagno|profitto|rendimento) garantito\b|\braddoppia\b|\bhai vinto\b|\b(reddito passivo|opportunita di investimento)\b/,
    /\b(lucro|ganho|retorno) garantido\b|\bdobre seu\b|\bvoce ganhou\b|\b(renda passiva|oportunidade de investimento)\b/,
    /\bzagarantovan\w* (profit|zarad)|\budvostruci\b|\bosvojili ste\b|\bosvojio si\b|\b(pasivni prihod|prilika za ulaganje)\b/,
  ],
};

// How many changes turn one name into another (insert, delete, change one letter).
function distance(a: string, b: string): number {
  let row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const next = [i];
    for (let j = 1; j <= b.length; j++) next[j] = Math.min(row[j] + 1, next[j - 1] + 1, row[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    row = next;
  }
  return row[b.length];
}

// Letters that look alike across scripts, taken as one: a Greek or Cyrillic «Α» passing for a Latin «A».
const LOOKALIKE: Record<string, string> = { а: 'a', α: 'a', е: 'e', ε: 'e', о: 'o', ο: 'o', р: 'p', ρ: 'p', с: 'c', х: 'x', χ: 'x', у: 'y', υ: 'y', і: 'i', ι: 'i', κ: 'k', к: 'k', ν: 'v', τ: 't', т: 't', μ: 'm', м: 'm', η: 'n', н: 'h', β: 'b', в: 'b', ζ: 'z', '0': 'o', '1': 'l' };
const skeleton = (name: string) => [...plain(name).replace(/\s+/g, ' ').trim()].map((c) => LOOKALIKE[c] ?? c).join('');

/** Whether `name`, given by someone not accepted, looks like one of `contacts`' names: the same, or one letter off, or the same letters of another script. */
export function looksLike(name: string, contacts: string[]): boolean {
  const own = skeleton(name);
  if (own.length < 3) return false;
  return contacts.some((other) => {
    const theirs = skeleton(other);
    return theirs.length >= 3 && (own === theirs || (Math.min(own.length, theirs.length) >= 5 && distance(own, theirs) <= 1));
  });
}

/**
 * The signs of a scam in the first messages of someone not accepted yet (`texts`), and in the name
 * they go by (`name`) set beside the names of the contacts accepted (`contacts`). Each sign once,
 * in a fixed order.
 */
export function scamSigns(texts: string[], name: string, contacts: string[]): ScamSign[] {
  const words = texts.map(plain).join('\n');
  const signs = (Object.keys(SIGNS) as Exclude<ScamSign, 'name'>[]).filter((sign) => SIGNS[sign].some((pattern) => pattern.test(words)));
  return looksLike(name, contacts) ? [...signs, 'name'] : signs;
}

/** How many of a request's first messages are looked at. */
export const SCAM_LOOKED = 5;
