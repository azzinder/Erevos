// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import type { Module } from './modules';

// The edition this build is (docs/editions.md), from the same code: Erevos+ (`plus`, the default)
// has every module; the plain Erevos (`lite`, built with EREVOS_EDITION=lite, app.config.js) has
// only Erevos's own chats, the Phone, the SMS and the Collection, and its core has no other
// network in it. Same package, so moving from one to the other keeps everything: the chats of a
// module the edition has not stay kept, and are there again in Erevos+.

export type Edition = 'plus' | 'lite';

/** The modules of the plain Erevos. */
export const LITE_MODULES: readonly Module[] = ['erevos', 'phone', 'sms', 'collection'];

/** The edition of this build: `extra.edition` 'lite' in app.config.js, else Erevos+. Expo is asked
 *  only when it is there, so the checks, in plain Node, can load this file. */
function read(): Edition {
  try {
    const constants = (require('expo-constants') as typeof import('expo-constants')).default;
    return constants.expoConfig?.extra?.edition === 'lite' ? 'lite' : 'plus';
  } catch {
    return 'plus';
  }
}

export const EDITION: Edition = read();

/** Whether `module` is part of `edition`. */
export function inEdition(module: Module, edition: Edition = EDITION): boolean {
  return edition === 'plus' || LITE_MODULES.includes(module);
}

/** The app's name in `edition`. */
export function editionName(edition: Edition = EDITION): string {
  return edition === 'plus' ? 'Erevos+' : 'Erevos';
}

/** `text` (already in the app's language) with the app's name as `edition` has it: in Erevos+ each
 *  «Erevos» is «Erevos+», so the same words serve both editions in every language. A word that names
 *  more than the app is left: ErevosGram, a path or address (azzinder/Erevos, Erevos.apk). */
export function named(text: string, edition: Edition = EDITION): string {
  return edition === 'plus' ? text.replace(/(?<![\w/.-])Erevos(?![\w+/-])(?!\.\w)/g, 'Erevos+') : text;
}

/** Whether `t` gives the edition's own name (lib/i18n.ts): always in the app; the checks read the
 *  words as Erevos has them (checks/register.mjs), and edition.check.ts turns this on to check it. */
export function ownNames(): boolean {
  return (globalThis as { __EREVOS_PLAIN_NAMES__?: boolean }).__EREVOS_PLAIN_NAMES__ !== true;
}

/** Whether a text speaks of the two editions apart (it names Erevos+ already: «the next update is the
 *  plain Erevos») or says whose Erevos is (the licence's «Erevos, by azzinder»): then it stays as written. */
export function namesEditions(text: string): boolean {
  return text.includes('Erevos+') || text.includes('azzinder');
}

/** `text` as Erevos+ says it (named), unless it speaks of the two editions apart (namesEditions). */
export function asEdition(text: string, edition: Edition = EDITION): string {
  return edition === 'plus' && !namesEditions(text) ? named(text, edition) : text;
}

/** A guide's text as `edition` says it: in Erevos+ each paragraph, list item, table row or heading with
 *  the app's name, unless it speaks of the two editions apart (asEdition), on any of its lines. */
export function guideNamed(source: string, edition: Edition = EDITION): string {
  if (edition !== 'plus') return source;
  const blocks: string[][] = [];
  for (const line of source.split('\n')) {
    const starts = line.trim() === '' || /^\s*(- |\| |#|> |\d+\. )/.test(line) || blocks.length === 0 || blocks[blocks.length - 1][0].trim() === '';
    if (starts) blocks.push([line]);
    else blocks[blocks.length - 1].push(line);
  }
  return blocks.map((block) => asEdition(block.join('\n'), edition)).join('\n');
}
