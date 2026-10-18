// Lets plain Node run the app's TypeScript for checks: the app's imports leave out the .ts
// ending, and the keystore (lib/secure) and the app's files (lib/files) are swapped for ones in
// memory. The SMS module is swapped for a phone without SMS.
import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const MEMORY = new URL('./secure-memory.ts', import.meta.url).href;
const FILES = new URL('./files-memory.ts', import.meta.url).href;
const SMS = new URL('./sms-none.ts', import.meta.url).href;

export async function resolve(specifier, context, next) {
  if (specifier.endsWith('/lib/secure')) return { url: MEMORY, shortCircuit: true };
  if (specifier.endsWith('/lib/files')) return { url: FILES, shortCircuit: true };
  if (specifier.endsWith('/modules/erevos-sms')) return { url: SMS, shortCircuit: true };
  if ((specifier.startsWith('./') || specifier.startsWith('../')) && context.parentURL?.startsWith('file:')) {
    const base = fileURLToPath(new URL(specifier, context.parentURL));
    for (const ending of ['.ts', '.tsx']) {
      if (existsSync(base + ending)) return { url: pathToFileURL(base + ending).href, shortCircuit: true };
    }
  }
  return next(specifier, context);
}
