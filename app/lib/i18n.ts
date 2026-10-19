import { useSyncExternalStore } from 'react';

import { DE } from '../i18n/de/index';
import { EL } from '../i18n/el/index';
import { ES } from '../i18n/es/index';
import { FR } from '../i18n/fr/index';
import { secureGet, secureSet } from './secure';

/**
 * The app's language, for the whole app on every platform: English, Greek or another of LANGS.
 * The words are written in English in the code, inside t('…'), and i18n/el/ has each in Greek,
 * i18n/de/ in German and so on, keyed by the English. Greek has every one (checks/i18n.check.ts
 * makes sure none is missing); a word another language does not have yet shows in English, and
 * `npm run i18n-missing` lists them. The guide is in English and Greek only, so the other
 * languages show it in English. The first start follows the phone's language, if it is one of
 * these; the choice (Home → Menu → Language) is kept on the phone, outside every space, so the
 * password screen shows it too.
 */
export type Lang = 'en' | 'el' | 'de' | 'es' | 'fr';

/** As the language switch lists them: the two the guide is written in first, then the others. */
export const LANGS: Lang[] = ['el', 'en', 'de', 'es', 'fr'];
/** Each language by its own name. */
export const LANG_LABELS: Record<Lang, string> = { el: 'Ελληνικά', en: 'English', de: 'Deutsch', es: 'Español', fr: 'Français' };

const WORDS: Record<Exclude<Lang, 'en'>, Record<string, string>> = { el: EL, de: DE, es: ES, fr: FR };

// How each writes dates and times, when the phone's own is another language.
const LOCALES: Record<Exclude<Lang, 'en'>, string> = { el: 'el-GR', de: 'de-DE', es: 'es-ES', fr: 'fr-FR' };

// Which counts take a word's first form, as plural() is given it: 1 alone, unless the language
// counts otherwise here. French says 0 and 1 alike ("0 message").
const ONE: Partial<Record<Lang, (n: number) => boolean>> = { fr: (n) => Math.abs(n) < 2 };

const KEY = 'erevos.lang';

/** The language of a locale such as 'de-AT', if Erevos has it; English otherwise. */
export function langOf(locale: string): Lang {
  const code = locale.toLowerCase().split(/[-_]/)[0];
  return (LANGS as string[]).includes(code) ? (code as Lang) : 'en';
}

function phoneLocale(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale;
  } catch {
    return null;
  }
}

/** The phone's language, if Erevos has it; English otherwise. */
export function deviceLang(): Lang {
  const locale = phoneLocale();
  return locale ? langOf(locale) : 'en';
}

let current: Lang = deviceLang();
const listeners = new Set<() => void>();

export function lang(): Lang {
  return current;
}

/** Shows the app in `next` at once, and keeps the choice. */
export async function setLang(next: Lang): Promise<void> {
  if (next !== current) {
    current = next;
    for (const listener of listeners) listener();
  }
  await secureSet(KEY, next).catch(() => undefined);
}

/** Reads the kept choice, once at start, before the first screen. */
export async function loadLang(): Promise<Lang> {
  try {
    const kept = await secureGet(KEY);
    if (kept && (LANGS as string[]).includes(kept)) {
      if (kept !== current) {
        current = kept as Lang;
        for (const listener of listeners) listener();
      }
    }
  } catch {
    // The phone's language, then.
  }
  return current;
}

export function onLangChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The language, for a screen that shows words: it draws again when the language changes. */
export function useLang(): Lang {
  return useSyncExternalStore(onLangChange, lang, lang);
}

/** The words of `l` by their English, for the checks; none for English itself. */
export function words(l: Lang): Record<string, string> {
  return l === 'en' ? {} : WORDS[l];
}

/**
 * The locale dates and times are written in, for toLocaleString: the phone's own in English, or
 * when the phone is in the app's language (so de-AT stays Austrian), else the language's own.
 */
export function locale(): string | undefined {
  if (current === 'en') return undefined;
  const phone = phoneLocale();
  return phone && langOf(phone) === current ? phone : LOCALES[current];
}

/**
 * `text` in the app's language. `text` is the English, written out in the call so the check finds
 * it; {name} in it is replaced by vars.name, in every language. A word the language does not have
 * yet shows in English.
 */
export function t(text: string, vars?: Record<string, string | number>): string {
  const shown = current === 'en' ? text : (WORDS[current][text] ?? text);
  return vars ? fill(shown, vars) : shown;
}

/** Marks English kept in a constant and translated where it is shown, with t(value). */
export function mark<T extends string>(text: T): T {
  return text;
}

/**
 * The count's form of a word: plural(n, '{n} chat', '{n} chats'), both forms written for the
 * check. The language decides which counts take the first (ONE above); each language then has
 * its own words for both forms.
 */
export function plural(n: number, one: string, many: string, vars?: Record<string, string | number>): string {
  const first = ONE[current] ?? ((count: number) => count === 1);
  return t(first(n) ? one : many, { n, ...vars });
}

function fill(text: string, vars: Record<string, string | number>): string {
  return text.replace(/\{(\w+)\}/g, (all, name: string) => (name in vars ? String(vars[name]) : all));
}
