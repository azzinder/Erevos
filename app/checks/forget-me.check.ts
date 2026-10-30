// "Delete me from everywhere" (lib/forget-me.ts): the list of a space's queues it deletes
// (lib/server-queues.ts) names every kind Erevos makes, and every file that makes a queue is named
// in it, so a new kind of queue cannot be left on the relays unseen; each queue a space keeps is
// on the list once, with the token for its relay; and a stopped space asks a relay for nothing but
// to delete (lib/relay.ts), so nothing makes its queues again, while what deletes still goes.
// The relay part is skipped, with a note, when the relay is not built.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { createQueue, deleteQueue, dropLater, fromHex, isQueueNotFound, receiveMessage, RelaySession, sendMessage, setRelayStopped, SpaceStoppedError, toHex, whileClearing } from '../lib/relay';
import { QUEUE_MAKERS, serverQueues, SOURCES, type KeptPlace, type Source } from '../lib/server-queues';
import { EMPTY_E2E } from '../lock/e2e-data';
import { EMPTY_QUEUES } from '../lock/queues-data';
import { EMPTY_SPACE } from '../lock/space-data';
import { ready as relayReady, relayNote, startRelay, stopRelay } from './real-relay';

relayNote('the stopped space checks');

const app = fileURLToPath(new URL('..', import.meta.url));
const MAKES = /\b(?:createQueue|borrowPlace)\(/;

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sources(path);
    return /\.tsx?$/.test(name) ? [relative(app, path).split('\\').join('/')] : [];
  });
}

test('every file that makes a relay queue says which kinds, and every kind is gathered', () => {
  const makers = ['lib', 'lock', 'app', 'components']
    .flatMap((dir) => sources(join(app, dir)))
    .filter((path) => path !== 'lib/relay.ts' && MAKES.test(readFileSync(join(app, path), 'utf8')))
    .sort();
  assert.deepEqual(makers, Object.keys(QUEUE_MAKERS).sort(), 'a file makes relay queues and is not in QUEUE_MAKERS (lib/server-queues.ts), or one there makes none any more');
  const made = new Set(Object.values(QUEUE_MAKERS).flat());
  for (const source of SOURCES) assert.ok(made.has(source), `no file says it makes ${source}`);
});

const id = (n: number) => n.toString(16).padStart(48, '0');
const relay = 'wss://relay.example.org';
const home = 'ws://192.168.1.10:7879';

// A space that keeps one queue of every kind.
function everything(): KeptPlace {
  const kept = (n: number, url = relay, token = 'tok') => ({ queue: { recipientHex: id(n), senderHex: id(n + 1000) }, url, token });
  return {
    data: {
      ...EMPTY_SPACE,
      url: relay,
      token: 'tok',
      ownQueue: { recipientHex: id(1), senderHex: id(1001) },
      ringQueue: { recipientHex: id(2), senderHex: id(1002) },
      spare: { url: home, token: 'home', queue: { recipientHex: id(3), senderHex: id(1003) } },
    },
    queues: {
      ...EMPTY_QUEUES,
      now: kept(1),
      next: { recipientHex: id(4), senderHex: id(1004) },
      link: kept(5),
      group: kept(6),
      public: kept(7),
      was: [{ ...kept(8), kind: 'own', until: 1 }],
      early: [{ ...kept(9, home, 'home'), kind: 'spare', until: 1 }],
    },
    e2e: {
      ...EMPTY_E2E,
      contacts: [{ mine: { r: id(10), s: id(1010), u: relay, qa: 1, g: 0, was: { r: id(11), u: relay, until: 1 } } } as never],
      ready: [{ r: id(12), s: id(1012), u: relay }],
      gone: [{ r: id(13), u: relay, until: 0 }],
      list: { b: '', s: '', n: 1, real: [], r: { a: { s: id(1014), relay, rk: '' } }, q: { a: id(14) }, qWas: [{ q: id(15), relay, until: 1 }] },
    },
    matrix: { push: { url: relay, recipientHex: id(16) } },
    xmpp: { push: { url: relay, recipientHex: id(17) } },
    publicGroups: { groups: [{ door: { relay, recipient: id(18), sender: id(1018), relayKey: '', secret: '', key: '' } } as never], asking: [] },
    watch: [{ url: relay, token: 'tok', recipientHex: id(19) }, null, null, null],
    rings: [{ url: relay, token: 'tok', recipientHex: id(20), senderHex: id(1020) }, null, null, null],
  };
}

test('every queue a space keeps is on the list once, with the token for its relay', () => {
  const list = serverQueues(everything());
  const found = new Set<Source>(list.map((q) => q.source));
  for (const source of SOURCES) assert.ok(found.has(source), `${source} is not gathered`);
  // The own queue, as the settings and the last move both say it, once.
  assert.equal(list.filter((q) => q.recipientHex === id(1)).length, 1);
  assert.equal(list.length, 20);
  // Each with its relay's token: the backup relay's its own, the contacts' the main relay's.
  assert.equal(list.find((q) => q.source === 'spare')?.token, 'home');
  assert.equal(list.find((q) => q.recipientHex === id(9))?.token, 'home');
  assert.equal(list.find((q) => q.source === 'contact')?.token, 'tok');
  assert.equal(list.find((q) => q.source === 'door')?.token, 'tok');
});

test('a space with nothing kept has nothing to delete', () => {
  assert.deepEqual(serverQueues({ data: EMPTY_SPACE, queues: EMPTY_QUEUES, e2e: null, matrix: null, xmpp: null }), []);
});

test('a stopped space asks a relay for nothing but to delete', { skip: !relayReady, timeout: 60_000 }, async () => {
  const url = await startRelay();
  try {
    const own = { url };
    const ids = await createQueue(own);
    const other = await createQueue(own);
    await sendMessage(own, ids.senderId, new Uint8Array([1, 2, 3]));
    setRelayStopped(true);
    await assert.rejects(createQueue(own), SpaceStoppedError);
    await assert.rejects(receiveMessage(own, ids.recipientId), SpaceStoppedError);
    await assert.rejects(sendMessage(own, other.senderId, new Uint8Array([4])), SpaceStoppedError);
    await assert.rejects(RelaySession.open(own, true), SpaceStoppedError);
    // What deletes still goes: the queue, with what waited there, and a message held for later.
    await deleteQueue(own, ids.recipientId);
    assert.equal(await dropLater(own, toHex(new Uint8Array(16))), false);
    // A session opens while the servers are cleared, for files to delete only.
    await whileClearing(async () => {
      const session = await RelaySession.open(own, true);
      try {
        await assert.rejects(session.call(Uint8Array.of(9, ...new Uint8Array(24))), SpaceStoppedError);
      } finally {
        session.close();
      }
    });
    setRelayStopped(false);
    await assert.rejects(receiveMessage(own, ids.recipientId), (error) => isQueueNotFound(error));
    assert.equal(await receiveMessage(own, other.recipientId), null);
    await deleteQueue(own, fromHex(toHex(other.recipientId)));
  } finally {
    setRelayStopped(false);
    await stopRelay(url);
  }
});
