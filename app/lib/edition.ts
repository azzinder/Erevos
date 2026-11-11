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
