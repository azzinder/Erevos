// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import assert from "node:assert/strict";
import { test } from "node:test";

import { listFiles, writeBytes } from "../lib/files";
import {
  holdChunks,
  releaseChunks,
  sweepPendingChunks,
} from "../lib/pending-chunks";
import { secureGet } from "../lib/secure";
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
