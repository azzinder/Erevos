import { parseGuide, type GuideSection } from '../lib/guide';
import { lang } from '../lib/i18n';

import { guide as el } from './el';
import { guide as en } from './en';

/**
 * The user guide (Home → User guide), as in LPHL FASOULI: the same for everyone, in Greek and in
 * English. Keep it up to date with every visible change, like the README, and keep saying plainly
 * what Erevos does not protect yet.
 */
export type GuideLang = 'el' | 'en';

export const GUIDE_LANGS: GuideLang[] = ['el', 'en'];

export const GUIDE_SOURCES: Record<GuideLang, string> = { el, en };

/** The guide's own words around the sections. */
export const GUIDE_UI: Record<GuideLang, {
  title: string;
  search: string;
  noResults: (query: string) => string;
  sections: string;
  previous: string;
  next: string;
  missing: string;
  version: (version: string) => string;
  update: string;
}> = {
  el: {
    title: 'Οδηγός χρήσης',
    search: 'Αναζήτηση στον οδηγό',
    noResults: (query) => `Δεν βρέθηκε τίποτα για «${query}».`,
    sections: 'Ενότητες',
    previous: 'Προηγούμενη',
    next: 'Επόμενη',
    missing: 'Αυτό το κομμάτι του οδηγού δεν βρέθηκε.',
    version: (version) => `Erevos ${version}, δοκιμαστική έκδοση`,
    update: 'Έλεγχος για ενημέρωση',
  },
  en: {
    title: 'User guide',
    search: 'Search the guide',
    noResults: (query) => `Nothing found for “${query}”.`,
    sections: 'Sections',
    previous: 'Previous',
    next: 'Next',
    missing: 'This part of the guide was not found.',
    version: (version) => `Erevos ${version}, test version`,
    update: 'Check for updates',
  },
};

const parsed = new Map<GuideLang, GuideSection[]>();

export function guideFor(lang: GuideLang): GuideSection[] {
  let sections = parsed.get(lang);
  if (!sections) {
    sections = parseGuide(GUIDE_SOURCES[lang]);
    parsed.set(lang, sections);
  }
  return sections;
}

/** The guide shows in the app's language (lib/i18n.ts), and in English in the languages it is not written in. */
export function guideLang(): GuideLang {
  return lang() === 'el' ? 'el' : 'en';
}
