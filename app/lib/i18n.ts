import { useSyncExternalStore } from 'react';

import { EL } from '../i18n/el/index';
import { secureGet, secureSet } from './secure';

/**
 * The app's language: English or Greek, for the whole app and the guide, on every platform. The
 * words are written in English in the code, inside t('…'), and i18n/el/ has each in Greek, keyed
 * by the English (checks/i18n.check.ts makes sure none is missing). The first start follows the
 * phone's language; the choice (Home → Menu → Language, or the password screen) is kept on the
 * phone, outside every space, so the password screen shows it too.
 */
export type Lang = 'en' | 'el';

export const LANGS: Lang[] = ['el', 'en'];
export const LANG_LABELS: Record<Lang, string> = { el: 'Ελληνικά', en: 'English' };

const KEY = 'erevos.lang';

/** The phone's language, if Erevos has it; English otherwise. */
export function deviceLang(): Lang {
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale.toLowerCase().startsWith('el') ? 'el' : 'en';
  } catch {
    return 'en';
  }
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
    if (kept === 'en' || kept === 'el') {
      if (kept !== current) {
        current = kept;
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

/**
 * `text` in the app's language. `text` is the English, written out in the call so the check finds
 * it; {name} in it is replaced by vars.name, in either language.
 */
export function t(text: string, vars?: Record<string, string | number>): string {
  const shown = current === 'el' ? (EL[text] ?? text) : text;
  return vars ? fill(shown, vars) : shown;
}

/** Marks English kept in a constant and translated where it is shown, with t(value). */
export function mark<T extends string>(text: T): T {
  return text;
}

/** The count's form of a word: plural(n, '{n} chat', '{n} chats'), both forms written for the check. */
export function plural(n: number, one: string, many: string, vars?: Record<string, string | number>): string {
  return t(n === 1 ? one : many, { n, ...vars });
}

function fill(text: string, vars: Record<string, string | number>): string {
  return text.replace(/\{(\w+)\}/g, (all, name: string) => (name in vars ? String(vars[name]) : all));
}
