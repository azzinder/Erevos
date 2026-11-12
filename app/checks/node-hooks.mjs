// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// Lets plain Node run the app's TypeScript for checks: the app's imports leave out the .ts
// ending, and the keystore (lib/secure) and the app's files (lib/files) are swapped for ones in
// memory. The SMS module is swapped for a phone without SMS, and the phone's own module for one
// that only keeps the reminders asked of it. The calls' module, the folders backups go to
// (expo-file-system) and the panic button keep in memory what backups give them. The call module
// has only where a call's sound can go, in memory.
import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const MEMORY = new URL('./secure-memory.ts', import.meta.url).href;
const FILES = new URL('./files-memory.ts', import.meta.url).href;
const SMS = new URL('./sms-none.ts', import.meta.url).href;
const DEVICE = new URL('./device-memory.ts', import.meta.url).href;
const PHONE = new URL('./phone-memory.ts', import.meta.url).href;
const FOLDERS = new URL('./folder-memory.ts', import.meta.url).href;
const PANIC = new URL('./panic-memory.ts', import.meta.url).href;
const CALL_AUDIO = new URL('./call-audio-memory.ts', import.meta.url).href;

const LIB = new URL('../lib/', import.meta.url).href;

export async function resolve(specifier, context, next) {
  const inLib = context.parentURL?.startsWith(LIB) && specifier.startsWith('./');
  // From a folder inside lib/ too (lib/sync/), by where the specifier leads.
  const inLibAt = (name) => context.parentURL?.startsWith(LIB) && specifier.startsWith('.') && new URL(specifier, context.parentURL).href === LIB + name;
  if (specifier.endsWith('/lib/secure') || (inLib && specifier === './secure') || inLibAt('secure')) return { url: MEMORY, shortCircuit: true };
  if (specifier.endsWith('/lib/files') || (inLib && specifier === './files') || inLibAt('files')) return { url: FILES, shortCircuit: true };
  if (specifier.endsWith('/modules/erevos-sms')) return { url: SMS, shortCircuit: true };
  if (specifier.endsWith('/modules/erevos-device')) return { url: DEVICE, shortCircuit: true };
  if (specifier.endsWith('/modules/erevos-phone')) return { url: PHONE, shortCircuit: true };
  if (specifier.endsWith('/modules/erevos-call')) return { url: CALL_AUDIO, shortCircuit: true };
  if (specifier === 'expo-file-system') return { url: FOLDERS, shortCircuit: true };
  if (specifier.endsWith('/lib/panic') || (inLib && specifier === './panic')) return { url: PANIC, shortCircuit: true };
  if ((specifier.startsWith('./') || specifier.startsWith('../')) && context.parentURL?.startsWith('file:')) {
    const base = fileURLToPath(new URL(specifier, context.parentURL));
    for (const ending of ['.ts', '.tsx']) {
      if (existsSync(base + ending)) return { url: pathToFileURL(base + ending).href, shortCircuit: true };
    }
  }
  return next(specifier, context);
}
