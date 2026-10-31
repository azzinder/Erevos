// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// A relay that never answers (lib/relay.ts answerWithin): a connection that died on the way says
// nothing, so each request, alone or on a session, counts as failed once its time is up, and a look
// waiting on it goes on. Against a WebSocket server that takes the connection and answers nothing.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createServer, type Server, type Socket } from 'node:net';
import { after, before, test } from 'node:test';

import { answerWithin, canTryLater, createQueue, RelaySends, RelayUnreachableError, setAnswerScale, waitForMessage } from '../lib/relay';

let server: Server;
let url = '';
const sockets = new Set<Socket>();

before(async () => {
  // Takes the WebSocket handshake, then says nothing ever again.
  server = createServer((socket) => {
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));
    socket.once('data', (data) => {
      const key = /Sec-WebSocket-Key: *(.+)\r\n/i.exec(data.toString())?.[1]?.trim() ?? '';
      const accept = createHash('sha1').update(`${key}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`).digest('base64');
      socket.write(`HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${accept}\r\n\r\n`);
    });
  });
  await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));
  const address = server.address();
  url = `ws://127.0.0.1:${typeof address === 'object' && address ? address.port : 0}`;
  setAnswerScale(0.002);
});

after(() => {
  setAnswerScale(null);
  for (const socket of sockets) socket.destroy();
  server.close();
});

test('each request has its time: a wait at the relay its seconds and half a minute, a file chunk two minutes', () => {
  setAnswerScale(null);
  try {
    assert.equal(answerWithin(Uint8Array.of(13, ...new Uint8Array(24), 60)), 90_000);
    assert.equal(answerWithin(Uint8Array.of(27, ...new Uint8Array(24), 20, ...new Uint8Array(16))), 50_000);
    assert.equal(answerWithin(Uint8Array.of(8, 1, 2, 3)), 120_000);
    assert.equal(answerWithin(Uint8Array.of(1)), 45_000);
  } finally {
    setAnswerScale(0.002);
  }
});

test('a relay that takes the connection and never answers fails the request once its time is up, to be tried later', async () => {
  const started = Date.now();
  const error = await createQueue({ url }).then(
    () => null,
    (e: unknown) => e,
  );
  assert.ok(error instanceof RelayUnreachableError, String(error));
  assert.equal(canTryLater(error), true);
  assert.ok(Date.now() - started < 5000);
  // A wait at it too, and a later look is not stuck behind it.
  await assert.rejects(waitForMessage({ url }, new Uint8Array(24), 1), RelayUnreachableError);
});

test('on one connection for many, a reply that never comes ends it, and the requests after it fail too', async () => {
  const sends = new RelaySends();
  const id = new Uint8Array(24);
  await assert.rejects(sends.send({ url }, id, Uint8Array.of(1, 2, 3)), RelayUnreachableError);
  await assert.rejects(sends.send({ url }, id, Uint8Array.of(4, 5, 6)), RelayUnreachableError);
  sends.close();
});
