// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { decryptBytes, decryptText, encryptBytes, encryptText, randomBytes, sameBytes, toHex, utf8Decode, utf8Encode } from '../lib/crypto';
import { deleteFile, readBytes, readFile, writeBytes, writeFile } from '../lib/files';

import { SLOTS } from './slots';

// What is too large for the keystore and belongs to one space, or to its hidden chats, is kept in
// a file in the app's folder holding one sealed value per password slot for the spaces and one
// per slot for the hidden chats: at least SLOTS of each, the unused ones sealed with random keys.
// A space's value is sealed with the space's key (keys.ts), its hidden chats' value with their
// key (hidden.ts). Every value is padded with spaces to exactly `block` bytes, so a used value
// looks like an unused one. One file, rewritten whole, so neither the files there are nor when they
// last changed tell which spaces or hidden chats are in use, nor how much each holds.
//
// A value larger than that, unless the file is `fixed` (which refuses it), goes to pages: files of
// PAGE bytes named by a random id after PAGE_PREFIX, sealed with the same key, the same as the
// history's pages (history.ts) and lying among them. The value in the file then names its pages.
// So the pages tell how much the phone keeps in all, but not whose. A page never changes once
// written: a value saved again writes the pages that differ under new ids, then the file, and only
// then deletes the pages it no longer names. Values kept before there were pages, in whole blocks,
// are read as they are, and go to the new shape when next saved.
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
  /** Whether a space's value, or its hidden chats', is sealed with `key`: not for a slot no one wrote, nor with no file. */
  opens(holder: Holder, space: number, key: Uint8Array): Promise<boolean>;
}

type Values = Record<Holder, string[]>;

/** The bytes of a page, and the start of the names of their files. */
export const PAGE = 16 * 1024;
export const PAGE_PREFIX = 'erevos-page-';
// What a value in pages says instead of itself: its pages' ids, one after another, and how many
// bytes the last one holds.
const PAGES = '~pages';
const LAST = '~last';
const ID_LENGTH = 24;
const newPageId = () => toHex(randomBytes(ID_LENGTH / 2));

type Paged = { ids: string[]; last: number };

function pagedOf(value: unknown): Paged | null {
  const v = value as Record<string, unknown> | null;
  if (!v || typeof v !== 'object' || typeof v[PAGES] !== 'string' || typeof v[LAST] !== 'number') return null;
  const all = v[PAGES] as string;
  if (all.length === 0 || all.length % ID_LENGTH !== 0 || !/^[0-9a-f]+$/.test(all)) return null;
  return { ids: all.match(new RegExp(`.{${ID_LENGTH}}`, 'g'))!, last: v[LAST] as number };
}

/** A value's pages could not all be read: it is not read as empty, which a save would then keep. */
export class DamagedValueError extends Error {
  constructor(name: string) {
    super(`${name}: a page of this value is missing or damaged`);
  }
}

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
  function sealText(key: Uint8Array, json: string): string {
    const bytes = utf8Encode(json).length;
    if (bytes > block) throw new Error(`${name}: ${bytes} bytes do not fit in ${block}`);
    return encryptText(key, json + ' '.repeat(block - bytes));
  }

  const fake = () => sealText(randomBytes(32), JSON.stringify(empty));

  // Each slot's pages as last read or written here, with what they hold: a page that would hold
  // the same again is kept, not written anew.
  const known = new Map<string, { key: Uint8Array; ids: string[]; chunks: Uint8Array[] }>();
  const slotName = (holder: Holder, space: number) => `${holder}/${space}`;

  // The value a slot holds, or null when `key` does not open it.
  async function open(holder: Holder, space: number, key: Uint8Array, sealed: string): Promise<{ value: unknown; paged: Paged | null } | null> {
    let value: unknown;
    try {
      value = JSON.parse(decryptText(key, sealed));
    } catch {
      return null;
    }
    const paged = fixed ? null : pagedOf(value);
    if (!paged) return { value, paged };
    const chunks: Uint8Array[] = [];
    for (const [i, id] of paged.ids.entries()) {
      const page = await readBytes(PAGE_PREFIX + id);
      let bytes: Uint8Array;
      try {
        bytes = decryptBytes(key, page!);
      } catch {
        throw new DamagedValueError(name);
      }
      if (bytes.length !== PAGE) throw new DamagedValueError(name);
      chunks.push(i === paged.ids.length - 1 ? bytes.slice(0, paged.last) : bytes);
    }
    known.set(slotName(holder, space), { key, ids: paged.ids, chunks });
    const all = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0));
    let at = 0;
    for (const chunk of chunks) {
      all.set(chunk, at);
      at += chunk.length;
    }
    try {
      return { value: JSON.parse(utf8Decode(all)), paged };
    } catch {
      throw new DamagedValueError(name);
    }
  }

  // Seals `data` for a slot, writing the pages it needs. Returns the value for the file, and the
  // pages to delete once the file names the new ones.
  async function seal(holder: Holder, space: number, key: Uint8Array, data: T, before: Paged | null): Promise<{ sealed: string; gone: string[] }> {
    const json = JSON.stringify(data);
    const bytes = utf8Encode(json);
    const gone = before?.ids ?? [];
    if (fixed || bytes.length <= block) {
      known.delete(slotName(holder, space));
      return { sealed: sealText(key, json), gone };
    }
    const kept = known.get(slotName(holder, space));
    const reusable = kept && sameBytes(kept.key, key) && before ? kept : null;
    const ids: string[] = [];
    const chunks: Uint8Array[] = [];
    for (let at = 0; at < bytes.length; at += PAGE) {
      const chunk = bytes.slice(at, at + PAGE);
      const i = ids.length;
      const same = reusable && i < reusable.ids.length && before!.ids.includes(reusable.ids[i]) && sameBytes(reusable.chunks[i], chunk);
      if (same) {
        ids.push(reusable.ids[i]);
      } else {
        const id = newPageId();
        const page = new Uint8Array(PAGE).fill(0x20);
        page.set(chunk);
        await writeBytes(PAGE_PREFIX + id, encryptBytes(key, page));
        ids.push(id);
      }
      chunks.push(chunk);
    }
    known.set(slotName(holder, space), { key: key.slice(), ids, chunks });
    const last = bytes.length - (ids.length - 1) * PAGE;
    return { sealed: sealText(key, JSON.stringify({ [PAGES]: ids.join(''), [LAST]: last })), gone: gone.filter((id) => !ids.includes(id)) };
  }

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
      const opened = await open(holder, space, key, sealed);
      return checked(opened ? opened.value : empty);
    },
    save(holder, space, key, data) {
      const run = writes
        .catch(() => undefined)
        .then(async () => {
          const values = await loadValues(space + 1);
          // What the slot names now, read only for its pages: the ones no longer named go after.
          let before: Paged | null = null;
          try {
            before = fixed ? null : pagedOf(JSON.parse(decryptText(key, values[holder][space])));
          } catch {
            // Not this key's: no pages of its own to let go of.
          }
          const { sealed, gone } = await seal(holder, space, key, data, before);
          values[holder][space] = sealed;
          await writeFile(name, JSON.stringify(values));
          for (const id of gone) await deleteFile(PAGE_PREFIX + id).catch(() => undefined);
        });
      writes = run;
      return run;
    },
    async opens(holder, space, key) {
      await writes.catch(() => undefined);
      const sealed = (await loadValues(space + 1))[holder][space];
      try {
        decryptText(key, sealed);
        return true;
      } catch {
        return false;
      }
    },
  };
}
