// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { deleteChunks } from "../lock/attachment-files";
import { secureDelete, secureGet, secureSet } from "./secure";

// The chunks of files a long piece of work is still writing, as the files of an imported chat
// (lib/imports.ts): kept in the keystore entry PENDING, outside every space, until the work keeps
// them where they belong. When Erevos stops in the middle, as when Android closes it or the
// battery dies, nothing else names them, and they stayed on the phone, and in every backup, for
// good. The next start deletes them (sweepPendingChunks) before any such work begins. Only the
// files' random ids and how many chunks each has are kept, which the files' own names say anyway.

const PENDING = "erevos.chunks-pending";

// The list is kept in parts of PART files, each a keystore entry of its own (PENDING.0, PENDING.1,
// and so on), with how many parts there are in PENDING itself: a file noted writes the last part
// only, not the whole list, which for an export of thousands of files grew past what one keystore
// entry holds well and was written whole for each of them. It is read once and kept in memory. A
// list kept whole in PENDING, as an Erevos before this one left it, is read as it is.
const PART = 40;
const MOST_PARTS = 25_000;

type Held = { id: string; count: number };

const ID = /^[0-9a-f]{32}$/;

let chain: Promise<unknown> = Promise.resolve();

// One change at a time, each on what the one before left.
function serial<T>(run: () => Promise<T>): Promise<T> {
  const next = chain.then(run, run);
  chain = next.catch(() => undefined);
  return next;
}

// The list as last read or written; what each part on the phone says, as written; and whether
// PENDING itself says how many parts there are (not the whole list, nor nothing).
let known: Held[] | null = null;
let written: string[] = [];
let counted = false;

const part = (i: number) => `${PENDING}.${i}`;

function valid(value: unknown): Held[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (v): v is Held =>
      !!v &&
      typeof v.id === "string" &&
      ID.test(v.id) &&
      Number.isInteger(v.count) &&
      v.count >= 0 &&
      v.count <= 1_000_000,
  );
}

async function load(): Promise<Held[]> {
  if (known) return known;
  try {
    const value = JSON.parse((await secureGet(PENDING)) ?? "[]") as unknown;
    if (Array.isArray(value)) {
      // Whole in PENDING, or nothing kept.
      written = [];
      counted = false;
      known = valid(value);
      return known;
    }
    const parts = (value as { parts?: unknown } | null)?.parts;
    if (typeof parts !== "number" || !Number.isInteger(parts) || parts < 0 || parts > MOST_PARTS) return [];
    const held: Held[] = [];
    const texts: string[] = [];
    for (let i = 0; i < parts; i++) {
      const text = (await secureGet(part(i))) ?? "[]";
      texts.push(text);
      try {
        held.push(...valid(JSON.parse(text)));
      } catch {
        // A part that does not read: the others still do.
      }
    }
    written = texts;
    counted = true;
    known = held;
    return known;
  } catch {
    return [];
  }
}

async function save(held: Held[]): Promise<void> {
  const texts: string[] = [];
  for (let i = 0; i < held.length; i += PART) texts.push(JSON.stringify(held.slice(i, i + PART)));
  const before = written;
  const was = counted;
  // Until all of it is written, the next change reads the phone again.
  known = null;
  // Each part that changed, before PENDING names it: a file is noted before its first chunk is
  // written, so a stop in between leaves nothing behind.
  for (let i = 0; i < texts.length; i++) if (!was || texts[i] !== before[i]) await secureSet(part(i), texts[i]);
  if (texts.length === 0) await secureDelete(PENDING);
  else if (!was || texts.length !== before.length) await secureSet(PENDING, JSON.stringify({ parts: texts.length }));
  // The parts no longer named, last: left behind by a stop, they are written over when next used.
  if (was) for (let i = texts.length; i < before.length; i++) await secureDelete(part(i)).catch(() => undefined);
  written = texts;
  counted = texts.length > 0;
  known = held;
}

/** Notes that the file `id`, of `count` chunks, is being written, before its first chunk is. */
export function holdChunks(id: string, count: number): Promise<void> {
  return serial(async () =>
    save([...(await load()).filter((held) => held.id !== id), { id, count }]),
  );
}

/** The files `ids` are kept where they belong now, or deleted: no start deletes them. */
export function releaseChunks(ids: Iterable<string>): Promise<void> {
  const gone = new Set(ids);
  return serial(async () =>
    save((await load()).filter((held) => !gone.has(held.id))),
  );
}

/** Deletes the chunks of the files whose writing never ended. How many files went. */
export function sweepPendingChunks(): Promise<number> {
  return serial(async () => {
    const held = await load();
    const left: Held[] = [];
    for (const file of held)
      await deleteChunks(file.id, file.count).catch(() => left.push(file));
    await save(left);
    return held.length - left.length;
  });
}

/** As after a new start: the list is read from the phone again (the checks). */
export function forgetPendingChunks(): Promise<void> {
  return serial(async () => {
    known = null;
    written = [];
    counted = false;
  });
}
