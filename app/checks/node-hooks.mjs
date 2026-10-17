// Lets plain Node run the app's TypeScript for checks: the app's imports leave out the .ts
// ending, and the keystore (lib/secure) is swapped for one in memory.
import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const MEMORY = new URL('./secure-memory.ts', import.meta.url).href;

export async function resolve(specifier, context, next) {
  if (specifier.endsWith('/lib/secure')) return { url: MEMORY, shortCircuit: true };
  if ((specifier.startsWith('./') || specifier.startsWith('../')) && context.parentURL?.startsWith('file:')) {
    const base = fileURLToPath(new URL(specifier, context.parentURL));
    for (const ending of ['.ts', '.tsx']) {
      if (existsSync(base + ending)) return { url: pathToFileURL(base + ending).href, shortCircuit: true };
    }
  }
  return next(specifier, context);
}
