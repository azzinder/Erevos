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

type Held = { id: string; count: number };

const ID = /^[0-9a-f]{32}$/;

let chain: Promise<unknown> = Promise.resolve();

// One change at a time, each on what the one before left.
function serial<T>(run: () => Promise<T>): Promise<T> {
  const next = chain.then(run, run);
  chain = next.catch(() => undefined);
  return next;
}

async function load(): Promise<Held[]> {
  try {
    const value = JSON.parse((await secureGet(PENDING)) ?? "[]") as unknown;
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
  } catch {
    return [];
  }
}

async function save(held: Held[]): Promise<void> {
  if (held.length) await secureSet(PENDING, JSON.stringify(held));
  else await secureDelete(PENDING);
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
