// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// Checking that a backup is whole where it went (lib/backup-check.ts).
// Run with: npm run check
/// <reference types="node" />
import assert from "node:assert/strict";
import * as nodeCrypto from "node:crypto";
import { test } from "node:test";

import {
  checkBackup,
  checkedWhole,
  checkListed,
  newestIn,
  type BackupFiles,
} from "../lib/backup-check";
import {
  nodeStyleGcm,
  randomBytes,
  setGcm,
  setHardCost,
  setPbkdf2,
  sha256Bytes,
  toHex,
  webCryptoPbkdf2,
} from "../lib/crypto";
import { writeBytes } from "../lib/files";
import {
  backupKey,
  makeBackup,
  type BackupKey,
  type PartMade,
} from "../lock/backup";
import { setLockPassword } from "../lock/config";
import { prepareSpaces } from "../lock/space-data";
import { blobs, files } from "./files-memory";
import { store } from "./secure-memory";

setHardCost({ m: 64, t: 1 });
setPbkdf2(webCryptoPbkdf2()!);
assert.ok(setGcm(nodeStyleGcm(nodeCrypto)));

const MB = 1024 * 1024;

// A phone with a space and three photos of 3 MB, each of a part of its own, backed up as an
// automatic backup is (earlier given: every part says its size and SHA-256).
async function backedUp(): Promise<{
  key: BackupKey;
  place: Map<string, Uint8Array>;
  made: PartMade[];
}> {
  store.clear();
  files.clear();
  blobs.clear();
  await setLockPassword(0, "real-1111", randomBytes(32));
  await prepareSpaces(1);
  for (let i = 0; i < 3; i++)
    await writeBytes(
      `erevos-file-${toHex(randomBytes(16))}-0`,
      randomBytes(3 * MB),
    );
  const key = await backupKey("backup-pass");
  const place = new Map<string, Uint8Array>();
  let made: PartMade[] = [];
  const bytes = await makeBackup(key, {
    parts: async (part) => {
      const name = `erevos-backup-2026-11-11-0700.part${place.size + 1}.erevos`;
      place.set(name, part);
      return name;
    },
    earlier: [],
    made: (parts) => (made = parts),
  });
  place.set("erevos-backup-2026-11-11-0700.erevos", bytes);
  return { key, place, made };
}

const filesOf = (place: Map<string, Uint8Array>): BackupFiles => ({
  sizes: new Map([...place].map(([name, bytes]) => [name, bytes.length])),
  read: async (name) => place.get(name) ?? null,
});

const NAME = "erevos-backup-2026-11-11-0700.erevos";

test("a whole backup opens, has every part, and the parts read through open", async () => {
  const { key, place } = await backedUp();
  const checked = await checkBackup(filesOf(place), NAME, key, 2);
  assert.equal(checked.error, "");
  assert.equal(checked.opened, true);
  assert.equal(checked.parts, 3);
  assert.equal(checked.read, 2);
  assert.ok(checkedWhole(checked));
});

test("a part missing, one cut short and one changed inside are each found", async () => {
  const { key, place } = await backedUp();
  const parts = [...place.keys()].filter((name) => name !== NAME);
  place.delete(parts[0]);
  place.set(parts[1], place.get(parts[1])!.subarray(0, 1000));
  const changed = place.get(parts[2])!.slice();
  changed[5000] ^= 1;
  place.set(parts[2], changed);
  const checked = await checkBackup(filesOf(place), NAME, key, 10);
  assert.equal(checked.missing, 1);
  // One by its size, without reading it; the other read through.
  assert.equal(checked.damaged, 2);
  assert.equal(checked.read, 0);
  assert.equal(checkedWhole(checked), false);
});

test("a backup not there, damaged, or made with another password says so", async () => {
  const { key, place } = await backedUp();
  const other = await backupKey("another-pass");
  assert.match(
    (await checkBackup(filesOf(place), NAME, other, 2)).error,
    /password/,
  );
  const damaged = place.get(NAME)!.slice();
  damaged[damaged.length - 3] ^= 1;
  const broken = new Map(place).set(NAME, damaged);
  const checked = await checkBackup(filesOf(broken), NAME, key, 2);
  assert.equal(checked.opened, false);
  assert.notEqual(checked.error, "");
  place.delete(NAME);
  assert.notEqual((await checkBackup(filesOf(place), NAME, key, 2)).error, "");
});

test("on a server, the listing alone says whether the backup and its parts are there, of their sizes", async () => {
  const { place, made } = await backedUp();
  const sizes = filesOf(place).sizes;
  assert.ok(checkedWhole(checkListed(sizes, NAME, made)));
  sizes.set(made[0].name, made[0].size - 1);
  sizes.delete(made[1].name);
  const checked = checkListed(sizes, NAME, made);
  assert.deepEqual(
    [checked.missing, checked.damaged, checked.opened],
    [1, 1, false],
  );
  assert.notEqual(checkListed(new Map(), NAME, made).error, "");
});

test("the newest backup is the newest this phone made there, else the newest there", () => {
  const names = [
    "erevos-backup-2026-11-09-0700.erevos",
    "erevos-backup-2026-11-10-0700.erevos",
    "erevos-backup-2026-11-10-0700.part1.erevos",
    "erevos-backup-2026-11-11-0700.erevos",
  ];
  assert.equal(
    newestIn(names, undefined),
    "erevos-backup-2026-11-11-0700.erevos",
  );
  assert.equal(
    newestIn(names, new Map([["erevos-backup-2026-11-10-0700.erevos", []]])),
    "erevos-backup-2026-11-10-0700.erevos",
  );
  assert.equal(newestIn([], undefined), null);
});

// The place's own SHA-256 of each file, as Android's side tells it (Folders.kt).
const withSha = (place: Map<string, Uint8Array>): BackupFiles => ({
  ...filesOf(place),
  sha: async (names) => names.map((name) => (place.has(name) ? { size: place.get(name)!.length, sha: toHex(sha256Bytes(place.get(name)!)) } : null)),
});

test('the full check compares every part with its SHA-256, and can be stopped', async () => {
  const { key, place } = await backedUp();
  const told: number[] = [];
  const whole = await checkBackup(withSha(place), NAME, key, 'all', 1, Math.random, { progress: (done) => told.push(done) });
  assert.ok(checkedWhole(whole));
  assert.equal(whole.read, 3);
  assert.equal(told[told.length - 1], 3);
  const parts = [...place.keys()].filter((name) => name !== NAME);
  const changed = place.get(parts[1])!.slice();
  changed[100] ^= 1;
  place.set(parts[1], changed);
  const found = await checkBackup(withSha(place), NAME, key, 'all');
  assert.deepEqual([found.read, found.damaged], [2, 1]);
  // Without the place's SHA-256, each part is read here and opened.
  const read = await checkBackup(filesOf(place), NAME, key, 'all');
  assert.deepEqual([read.read, read.damaged], [2, 1]);
  const stopped = await checkBackup(withSha(place), NAME, key, 'all', 1, Math.random, { stopped: () => true });
  assert.match(stopped.error, /0 of 3/);
});
