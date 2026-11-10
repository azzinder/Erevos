// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import assert from "node:assert/strict";
import { test } from "node:test";

import { encryptBytes, randomBytes, toHex, utf8Encode } from "../lib/crypto";
import { writeBytes } from "../lib/files";
import {
  idsIn,
  idsOfPlace,
  leftoversOf,
  LEFTOVER_AGE_MS,
} from "../lib/leftovers";
import { PAGE_PREFIX, sealedFile } from "../lock/sealed-file";

const id = () => toHex(randomBytes(16));

test("ids are every run of 32 hex digits, and each 32 of a longer run cut in 32s", () => {
  const a = id();
  const b = id();
  const found = idsIn(
    JSON.stringify({
      file: { id: a, key: "ff".repeat(32) },
      joined: a + b,
      short: "abc123",
      odd: `${a}0`,
    }),
  );
  assert.ok(found.has(a));
  assert.ok(found.has(b));
  assert.ok(found.has("ff".repeat(16)));
  assert.equal(
    [...found].every((x) => x.length === 32),
    true,
  );
});

test("a place names the files of all its sealed values and of its history pages, and no other place’s", async () => {
  const space = randomBytes(32);
  const hidden = randomBytes(32);
  const [inCollection, inPage, inHidden, nowhere] = [id(), id(), id(), id()];
  const store = sealedFile<unknown>({
    name: "erevos-collection-t",
    empty: null,
    checked: (v) => v,
    block: 4096,
  });
  await store.save("space", 0, space, {
    items: [{ file: { id: inCollection, count: 3 } }],
  });
  await store.save("hidden", 0, hidden, {
    items: [{ file: { id: inHidden, count: 1 } }],
  });
  const pageId = toHex(randomBytes(12));
  const history = sealedFile<unknown>({
    name: "erevos-history-t",
    empty: null,
    checked: (v) => v,
    block: 4096,
    fixed: true,
  });
  await history.save("space", 0, space, { pages: [pageId], chats: {} });
  await writeBytes(
    PAGE_PREFIX + pageId,
    encryptBytes(
      space,
      utf8Encode(
        JSON.stringify({
          m: [
            ["peer", [1, 0, "hi", "aaaaaaaaaaaa", 0, 0, 0, 0, { id: inPage }]],
          ],
        }),
      ),
    ),
  );

  const stores = ["erevos-collection-t", "erevos-history-t"];
  const ofSpace = await idsOfPlace(
    { holder: "space", space: 0, key: space },
    stores,
  );
  assert.ok(ofSpace.has(inCollection) && ofSpace.has(inPage));
  assert.ok(!ofSpace.has(inHidden));
  const both = await idsOfPlace(
    { holder: "hidden", space: 0, key: hidden },
    stores,
    ofSpace,
  );
  assert.ok(both.has(inHidden));

  const now = 10 * LEFTOVER_AGE_MS;
  const old = now - 2 * LEFTOVER_AGE_MS;
  const files = [inCollection, inPage, inHidden, nowhere].map((f) => ({
    id: f,
    bytes: 100,
    files: 2,
    at: old,
  }));
  const fresh = id();
  files.push({ id: fresh, bytes: 7, files: 1, at: now - 1000 });
  assert.deepEqual(leftoversOf(files, both, now), {
    ids: [nowhere],
    bytes: 100,
    files: 2,
  });
  // Read with the space alone, the hidden chats' file would be one: hence every place first.
  assert.deepEqual(
    leftoversOf(
      files,
      await idsOfPlace({ holder: "space", space: 0, key: space }, stores),
      now,
    ).ids.sort(),
    [inHidden, nowhere].sort(),
  );
});
