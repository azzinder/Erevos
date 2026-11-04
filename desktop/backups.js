// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

/**
 * Backups in a folder the owner chose for them (main.js, /__backup; app/lib/backup-place.web.ts):
 * a backup's own file, erevos-backup-2026-11-04-0312.erevos, and its parts beside it, the photos,
 * files and voice messages, erevos-backup-2026-11-04-0312.part1.erevos and on, which share its
 * start (app/lock/backup.ts). The page writes each part as it is made, then the backup itself,
 * and reads them back to restore one. Only names of these kinds are listed, read, written or
 * deleted, and only in a folder the owner chose.
 *
 *   GET    ?folder=             the names of the backups' files there, as JSON
 *   GET    ?folder=&name=       one of them
 *   PUT    ?folder=&name=&keep= writes one; with keep, then deletes the older backups there but
 *                               the newest `keep`, with their parts, and the parts of older ones
 *                               that never ended
 *   DELETE ?folder=&name=       deletes one, as of a backup that failed
 *
 * 403 for a folder not chosen, 400 for another name, 404 when the folder or the file is not there.
 */

const fs = require('node:fs');
const path = require('node:path');

// A backup's own file or one of its parts, by its name: its start, and whether it is a part.
const FILE = /^(erevos-backup-[0-9-]+)(\.part[0-9]+)?\.erevos$/;

/** Whether `name` is the name of a backup's file or of one of its parts. */
const isBackupFile = (name) => typeof name === 'string' && FILE.test(name);

/**
 * The files of a folder that go once a backup was made into it, keeping the `keep` newest: as
 * app/lock/backup.ts staleBackups says, the older backups with their parts, and the parts of older
 * ones that never ended; those of one newer than the newest whole one, still being made, stay.
 */
function staleBackups(names, keep) {
  if (!(keep > 0)) return [];
  const files = names.map((name) => ({ name, of: FILE.exec(name) })).filter((file) => file.of);
  const whole = [...new Set(files.filter((file) => !file.of[2]).map((file) => file.of[1]))].sort();
  if (whole.length === 0) return [];
  const kept = new Set(whole.slice(-keep));
  const newest = whole[whole.length - 1];
  return files.filter((file) => !kept.has(file.of[1]) && file.of[1] < newest).map((file) => file.name);
}

/** Answers a request to /__backup; `chosen` gives the folders the owner chose for backups. */
async function backupRequest(request, url, chosen) {
  const where = url.searchParams.get('folder');
  const name = url.searchParams.get('name');
  if (!where || !chosen().includes(where)) return new Response('That folder was not chosen for backups.', { status: 403 });
  if (!fs.existsSync(where)) return new Response('', { status: 404 });
  const listed = () => fs.readdirSync(where).filter(isBackupFile).sort();
  if (request.method === 'GET' && name === null) return Response.json(listed());
  if (!isBackupFile(name)) return new Response('bad name', { status: 400 });
  const file = path.join(where, name);
  if (request.method === 'GET') {
    if (!fs.existsSync(file)) return new Response('', { status: 404 });
    return new Response(fs.readFileSync(file), { status: 200, headers: { 'Content-Type': 'application/octet-stream' } });
  }
  if (request.method === 'DELETE') {
    fs.rmSync(file, { force: true });
    return new Response(null, { status: 204 });
  }
  if (request.method !== 'PUT') return new Response('', { status: 405 });
  fs.writeFileSync(file, Buffer.from(await request.arrayBuffer()));
  const keep = Number(url.searchParams.get('keep') ?? 0);
  for (const old of staleBackups(listed(), keep)) fs.rmSync(path.join(where, old), { force: true });
  return new Response(null, { status: 204 });
}

module.exports = { backupRequest, isBackupFile, staleBackups };
