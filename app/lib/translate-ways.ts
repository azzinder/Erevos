// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// Which languages a message can be translated between (lib/translate.ts), with which models, and
// which language a message is in. Each model goes one way, between English and another language;
// any other two go through English, with two models. The language of a message is guessed from
// its letters and its commonest words; the owner can change it.

/** The languages the app translates between, in the order the sheet shows them. */
export const LANGUAGES = ['el', 'en', 'de', 'es', 'fr', 'it'] as const;
export type Language = (typeof LANGUAGES)[number];

export type Model = { from: Language; to: Language; file: string; bytes: number };

/** Each model, one way, its file and its size (crates/erevos-speech TRANSLATIONS has their hashes). */
export const MODELS: readonly Model[] = [
  { from: 'de', to: 'en', file: 'erevos-opus-de-en-q8.gguf', bytes: 80_774_144 },
  { from: 'el', to: 'en', file: 'erevos-opus-el-en-q8.gguf', bytes: 60_222_432 },
  { from: 'en', to: 'de', file: 'erevos-opus-en-de-q8.gguf', bytes: 80_745_792 },
  { from: 'en', to: 'el', file: 'erevos-opus-en-el-q8.gguf', bytes: 84_803_616 },
  { from: 'en', to: 'es', file: 'erevos-opus-en-es-q8.gguf', bytes: 84_736_320 },
  { from: 'en', to: 'fr', file: 'erevos-opus-en-fr-q8.gguf', bytes: 81_558_144 },
  { from: 'en', to: 'it', file: 'erevos-opus-en-it-q8.gguf', bytes: 93_382_560 },
  { from: 'es', to: 'en', file: 'erevos-opus-es-en-q8.gguf', bytes: 84_760_608 },
  { from: 'fr', to: 'en', file: 'erevos-opus-fr-en-q8.gguf', bytes: 81_582_176 },
  { from: 'it', to: 'en', file: 'erevos-opus-it-en-q8.gguf', bytes: 93_602_816 },
];

const model = (from: Language, to: Language): Model => {
  const found = MODELS.find((m) => m.from === from && m.to === to);
  if (!found) throw new Error(`no model from ${from} into ${to}`);
  return found;
};

/** The models that take `from` into `to`, in turn: one when either is English, otherwise two, through English. */
export function steps(from: Language, to: Language): Model[] {
  if (from === to) return [];
  if (from === 'en' || to === 'en') return [model(from, to)];
  return [model(from, 'en'), model('en', to)];
}

/** The language a message is translated into for one who reads the app in `reads`: that one, or English. */
export function intoFor(reads: string): Language {
  return (LANGUAGES as readonly string[]).includes(reads) ? (reads as Language) : 'en';
}

// Words common in each language and rare in the others.
const WORDS: Record<Exclude<Language, 'el'>, string[]> = {
  en: ['the', 'and', 'you', 'is', 'are', 'to', 'of', 'it', 'that', 'this', 'what', 'have', 'for', 'with', 'not', 'i', 'my', 'will', 'can', 'be', 'was', 'your', 'me', 'we', 'how'],
  de: ['der', 'die', 'das', 'und', 'ist', 'nicht', 'ich', 'du', 'sie', 'wir', 'ein', 'eine', 'mit', 'auf', 'zu', 'den', 'dem', 'es', 'was', 'wie', 'bin', 'bist', 'auch', 'noch', 'morgen'],
  es: ['el', 'la', 'los', 'las', 'y', 'es', 'que', 'de', 'en', 'un', 'una', 'no', 'por', 'para', 'con', 'yo', 'tu', 'muy', 'pero', 'como', 'estoy', 'está', 'hola', 'gracias', 'mañana'],
  fr: ['le', 'la', 'les', 'et', 'est', 'je', 'tu', 'vous', 'nous', 'pas', 'que', 'de', 'du', 'des', 'un', 'une', 'en', 'pour', 'avec', 'ce', 'cette', 'bonjour', 'merci', 'demain', 'oui'],
  it: ['il', 'lo', 'la', 'gli', 'le', 'e', 'è', 'che', 'di', 'un', 'una', 'non', 'per', 'con', 'io', 'tu', 'sono', 'sei', 'ciao', 'grazie', 'domani', 'anche', 'come', 'ma', 'mi'],
};
// Letters only one of them writes.
const LETTERS: [RegExp, Exclude<Language, 'el'>][] = [
  [/[ßäöü]/, 'de'],
  [/[ñ¿¡]/, 'es'],
  [/[çœêâûëîïô]/, 'fr'],
  [/[ìò]/, 'it'],
];

/** The language of `text`, guessed: Greek when most of its letters are Greek, otherwise by its words and letters; null with too few letters to say. */
export function languageOf(text: string): Language | null {
  let greek = 0;
  let latin = 0;
  for (const c of text) {
    if (/[Ͱ-Ͽἀ-῿]/.test(c)) greek++;
    else if (/\p{Script=Latin}/u.test(c)) latin++;
  }
  if (greek + latin < 2) return null;
  if (greek >= latin) return 'el';
  const lower = text.toLowerCase();
  const words = lower.split(/[^\p{L}']+/u).flatMap((w) => [w, ...w.split("'")]).filter(Boolean);
  const score: Record<string, number> = { en: 0, de: 0, es: 0, fr: 0, it: 0 };
  for (const w of words) for (const [l, list] of Object.entries(WORDS)) if (list.includes(w)) score[l]++;
  for (const [letters, l] of LETTERS) if (letters.test(lower)) score[l] += 2;
  // English wins a tie: the language most messages in Latin letters are written in.
  let best: Language = 'en';
  for (const l of ['de', 'es', 'fr', 'it'] as const) if (score[l] > score[best]) best = l;
  return best;
}
