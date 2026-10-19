// Lists the words each language besides English and Greek does not have yet, ready to fill in:
// by the part file each goes in, the Greek one that has it, with the Greek beside it. In the app
// they show in English meanwhile (lib/i18n.ts). Also lists words kept in another part file than
// the Greek keeps them in.
// Run with: npm run i18n-missing, or npm run i18n-missing de fr for some only.
/// <reference types="node" />
import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { englishInCode, partsOf, ROOT } from '../checks/words';
import { LANG_LABELS, LANGS, words } from '../lib/i18n';

const asked = process.argv.slice(2);
const others = LANGS.filter((l) => l !== 'en' && l !== 'el' && (asked.length === 0 || asked.includes(l)));
const used = englishInCode();
const greek = await partsOf('el');
const partOf = new Map<string, string>();
const greekOf = new Map<string, string>();
for (const [part, list] of greek) {
  for (const [english, shown] of Object.entries(list)) {
    partOf.set(english, part);
    greekOf.set(english, shown);
  }
}

const quote = (text: string) => `'${text.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

let total = 0;
for (const l of others) {
  const have = words(l);
  const missing = [...used.keys()].filter((english) => !(english in have));
  total += missing.length;
  console.log(`${LANG_LABELS[l]} (${l}): ${missing.length} missing`);
  const byFile = new Map<string, string[]>();
  for (const english of missing) {
    const part = partOf.get(english);
    // A word Greek does not have yet either: the file that shows it.
    const file = part ? `i18n/${l}/${part}.ts` : `not in Greek yet, shown in ${used.get(english)}`;
    byFile.set(file, [...(byFile.get(file) ?? []), english]);
  }
  for (const [file, list] of byFile) {
    const fresh = file.startsWith('i18n/') && !existsSync(join(ROOT, file));
    console.log(`  ${file}${fresh ? ` (a new file: add it to i18n/${l}/index.ts)` : ''}`);
    for (const english of list) console.log(`    ${quote(english)}: '',${greekOf.has(english) ? ` // el: ${greekOf.get(english)}` : ''}`);
  }
  for (const [part, list] of await partsOf(l)) {
    const elsewhere = Object.keys(list).filter((english) => partOf.has(english) && partOf.get(english) !== part);
    for (const english of elsewhere) console.log(`  in i18n/${l}/${part}.ts, Greek has it in ${partOf.get(english)}.ts: ${quote(english)}`);
  }
  console.log('');
}
console.log(total === 0 ? 'Every language has every word.' : `${total} missing in all.`);
