// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import assert from "node:assert/strict";
import { test } from "node:test";

import { listFiles, writeBytes } from "../lib/files";
import {
  forgetPendingChunks,
  holdChunks,
  releaseChunks,
  sweepPendingChunks,
} from "../lib/pending-chunks";
import { secureGet, secureSet } from "../lib/secure";
import { PREFIX } from "../lock/attachment-files";

const A = "a".repeat(32);
const B = "b".repeat(32);
const C = "c".repeat(32);

test("the chunks of a file whose writing never ended are deleted at the next start, and only those", async () => {
  for (const id of [A, B, C])
    for (let n = 0; n < 3; n++)
      await writeBytes(`${PREFIX}${id}-${n}`, new Uint8Array([n]));
  await holdChunks(A, 3);
  await holdChunks(B, 3);
  // B was kept where it belongs; C was never held, as a chat's file.
  await releaseChunks([B]);
  // A file noted but deleted already, as one keepFile dropped itself.
  await holdChunks("d".repeat(32), 2);
  assert.equal(await sweepPendingChunks(), 2);
  const left = (await listFiles(PREFIX)).sort();
  assert.deepEqual(
    left,
    [B, C].flatMap((id) => [0, 1, 2].map((n) => `${PREFIX}${id}-${n}`)),
  );
  assert.equal(await secureGet("erevos.chunks-pending"), null);
  assert.equal(await sweepPendingChunks(), 0);
});

const id = (n: number) => n.toString(16).padStart(32, "0");

test("many files are noted in parts, each written alone, and read again after a new start", async () => {
  for (let n = 0; n < 100; n++) await holdChunks(id(n), 1);
  assert.deepEqual(JSON.parse((await secureGet("erevos.chunks-pending"))!), { parts: 3 });
  assert.equal(JSON.parse((await secureGet("erevos.chunks-pending.0"))!).length, 40);
  assert.equal(JSON.parse((await secureGet("erevos.chunks-pending.2"))!).length, 20);
  await forgetPendingChunks();
  await releaseChunks([...Array(70).keys()].map(id));
  assert.deepEqual(JSON.parse((await secureGet("erevos.chunks-pending"))!), { parts: 1 });
  assert.equal(await secureGet("erevos.chunks-pending.1"), null);
  await forgetPendingChunks();
  for (let n = 70; n < 100; n++) await writeBytes(`${PREFIX}${id(n)}-0`, new Uint8Array([1]));
  assert.equal(await sweepPendingChunks(), 30);
  assert.equal(await secureGet("erevos.chunks-pending"), null);
  assert.equal(await secureGet("erevos.chunks-pending.0"), null);
  assert.equal((await listFiles(PREFIX)).some((name) => name.startsWith(`${PREFIX}${id(70).slice(0, 30)}`)), false);
});

test("a list an Erevos before this one kept whole is read, and swept", async () => {
  await forgetPendingChunks();
  await secureSet("erevos.chunks-pending", JSON.stringify([{ id: id(500), count: 2 }]));
  for (let n = 0; n < 2; n++) await writeBytes(`${PREFIX}${id(500)}-${n}`, new Uint8Array([n]));
  await holdChunks(id(501), 1);
  assert.deepEqual(JSON.parse((await secureGet("erevos.chunks-pending"))!), { parts: 1 });
  await forgetPendingChunks();
  assert.equal(await sweepPendingChunks(), 2);
  assert.equal(await secureGet("erevos.chunks-pending"), null);
});
