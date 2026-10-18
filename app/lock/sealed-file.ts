import { decryptText, encryptText, randomBytes, utf8Encode } from '../lib/crypto';
import { readFile, writeFile } from '../lib/files';

import { SLOTS } from './slots';

// What is too large for the keystore and belongs to one space, or to its hidden chats, is kept in
// a file in the app's folder holding one sealed value per password slot for the spaces and one
// per slot for the hidden chats: at least SLOTS of each, the unused ones sealed with random keys.
// A space's value is sealed with the space's key (keys.ts), its hidden chats' value with their
// key (hidden.ts). Every value is padded with spaces to whole blocks of `block` bytes, or, when
// `fixed`, to exactly `block` bytes, so a used value looks like an unused one. One file, rewritten
// whole, so neither the files there are nor when they last changed tell which spaces or hidden
// chats are in use. With a fixed size, not how much each holds either.
//
// Every space has POCKETS hidden chats, each with its own PIN (hidden.ts): the first is held as
// 'hidden', the others as 'hidden1', 'hidden2', … Each pocket has its value in every slot too.
//
// A space whose key changed (a new second password, or hidden chats set up again) finds its old
// value sealed with another key, and starts empty.

/** Hidden chats in every space, each opened with its own PIN. */
export const POCKETS = 4;

export type Holder = 'space' | 'hidden' | `hidden${number}`;

/** Where a space's hidden chats in `pocket` (0 to POCKETS - 1) keep their values. */
export const hiddenHolder = (pocket: number): Holder => (pocket ? `hidden${pocket}` : 'hidden');

export const HOLDERS: Holder[] = ['space', ...Array.from({ length: POCKETS }, (_, pocket) => hiddenHolder(pocket))];


export interface SealedFile<T> {
  /** A space's data, or its hidden chats', or an empty one when there is none sealed with `key`. */
  load(holder: Holder, space: number, key: Uint8Array): Promise<T>;
  /** Replaces a space's data, or its hidden chats'. The others' values are kept as they are. */
  save(holder: Holder, space: number, key: Uint8Array, data: T): Promise<void>;
}

type Values = Record<Holder, string[]>;

/** The bytes `data` takes once sealed, before padding. */
export function sealedSize(data: unknown): number {
  return utf8Encode(JSON.stringify(data)).length;
}

export function sealedFile<T>({ name, empty, checked, block, fixed = false }: {
  name: string;
  empty: T;
  /** What was stored, with anything of the wrong shape left out. */
  checked: (value: unknown) => T;
  block: number;
  fixed?: boolean;
}): SealedFile<T> {
  function seal(key: Uint8Array, data: T): string {
    const json = JSON.stringify(data);
    const bytes = utf8Encode(json).length;
    if (fixed && bytes > block) throw new Error(`${name}: ${bytes} bytes do not fit in ${block}`);
    const size = fixed ? block : Math.max(1, Math.ceil(bytes / block)) * block;
    return encryptText(key, json + ' '.repeat(size - bytes));
  }

  const fake = () => seal(randomBytes(32), empty);

  /** The sealed values in the file, at least `count` (and SLOTS) of each, the added ones unused. */
  async function loadValues(count: number): Promise<Values> {
    const values = Object.fromEntries(HOLDERS.map((holder) => [holder, [] as string[]])) as Values;
    const raw = await readFile(name);
    if (raw) {
      try {
        const data = JSON.parse(raw) as Partial<Values>;
        const list = (v: unknown) => (Array.isArray(v) ? v.map((s) => (typeof s === 'string' ? s : fake())) : []);
        for (const holder of HOLDERS) values[holder] = list(data[holder]);
      } catch {
        // A damaged file: every value in it is lost, and it starts again.
      }
    }
    for (const holder of HOLDERS) {
      while (values[holder].length < Math.max(SLOTS, count)) values[holder].push(fake());
    }
    return values;
  }

  // Writes run one after another, each on what the one before it left, since a space's chat and
  // its hidden chats can both be open and write the same file.
  let writes: Promise<void> = Promise.resolve();

  return {
    async load(holder, space, key) {
      await writes.catch(() => undefined);
      const sealed = (await loadValues(space + 1))[holder][space];
      try {
        return checked(JSON.parse(decryptText(key, sealed)));
      } catch {
        return checked(empty);
      }
    },
    save(holder, space, key, data) {
      const run = writes
        .catch(() => undefined)
        .then(async () => {
          const values = await loadValues(space + 1);
          values[holder][space] = seal(key, data);
          await writeFile(name, JSON.stringify(values));
        });
      writes = run;
      return run;
    },
  };
}
