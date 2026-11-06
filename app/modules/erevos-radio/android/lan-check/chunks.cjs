// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// desktop/chunks.js for ChunkInteropTest.kt: `serve <folder> <key> <id>` gives that file's chunks
// and says `port <n>`; `take <port> <key> <folder> <id> <count> <fileKey> <size>` takes them and
// says `kept <n>`.
const path = require('node:path');
const { ChunkServer, ChunkTaker } = require(path.join(__dirname, '../../../../../desktop/chunks.js'));

const [mode, ...args] = process.argv.slice(2);
if (mode === 'serve') {
  const [folder, key, id] = args;
  const server = new ChunkServer({ folder });
  server.allow(key, [id]);
  server.start().then((port) => console.log(`port ${port}`));
} else {
  const [port, key, folder, id, count, fileKey, size] = args;
  (async () => {
    const taker = await ChunkTaker.open(['127.0.0.1'], Number(port), key);
    let kept = 0;
    for (let n = 0; n < Number(count); n++) if ((await taker.take(folder, id, n, fileKey, Number(size))) === 'kept') kept++;
    taker.close();
    console.log(`kept ${kept}`);
  })().catch((error) => {
    console.log(`failed ${error.message}`);
    process.exit(1);
  });
}
