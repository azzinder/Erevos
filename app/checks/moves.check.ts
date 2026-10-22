// When a relay queue moves, and what follows from it (lib/moves.ts): the junk meter that says a
// queue is flooded, the time each own queue says it was made (`qa`), when each kept contact is
// told the new one, how long an old queue is still read, and the queues entry (lock/queues-data.ts),
// one size whether a space or place moved or not. The moves themselves, through a real relay, are
// in queue-move.check.ts.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { randomBytes } from '../lib/crypto';
import {
  fakeRings,
  GRACE,
  graceOver,
  JUNK_AGAIN,
  JUNK_WITHIN,
  JunkMeter,
  junkStep,
  queueAge,
  RESTORED_QUIET,
  takesPlace,
  TELL_AGAIN,
  tellDue,
  toldOnce,
  withOld,
} from '../lib/moves';
import { tookOf } from '../lib/queue-move';
import type { Told } from '../lock/e2e-data';
import { EMPTY_QUEUES, MAX_OLD_OWN, MAX_WAS, placeQueues, prepareQueueEntries, SIZE, spaceQueues, type OldQueue } from '../lock/queues-data';
import { store } from './secure-memory';

const HOUR = 60 * 60_000;
const DAY = 24 * HOUR;
const hex = (n: number) => n.toString(16).padStart(48, '0');
const old = (n: number, kind: OldQueue['kind'], until: number, by?: number): OldQueue => ({
  queue: { recipientHex: hex(n), senderHex: hex(n + 1000) },
  url: 'ws://relay',
  token: '',
  kind,
  until,
  ...(by ? { by } : {}),
});

test('three looks within ten minutes, each a whole batch nearly all junk, flood a queue', () => {
  const meter = new JunkMeter();
  const t0 = 1_000_000;
  assert.equal(meter.look('own', { taken: 50, junk: 45 }, t0), false);
  assert.equal(meter.look('own', { taken: 50, junk: 45 }, t0 + 60_000), false);
  assert.equal(meter.look('own', { taken: 50, junk: 50 }, t0 + 120_000), true);
  // Counted again from nothing after that.
  assert.equal(meter.look('own', { taken: 50, junk: 50 }, t0 + 180_000), false);
});

test('a batch with less junk, a short one, two looks, or looks too far apart flood nothing', () => {
  const meter = new JunkMeter();
  const t0 = 5_000_000;
  for (let i = 0; i < 5; i++) assert.equal(meter.look('a', { taken: 50, junk: 44 }, t0 + i * 1000), false);
  for (let i = 0; i < 5; i++) assert.equal(meter.look('b', { taken: 49, junk: 49 }, t0 + i * 1000), false);
  assert.equal(meter.look('c', { taken: 50, junk: 50 }, t0), false);
  assert.equal(meter.look('c', { taken: 50, junk: 50 }, t0 + 1000), false);
  assert.equal(meter.look('c', { taken: 50, junk: 50 }, t0 + JUNK_WITHIN + 1), false);
  // Each queue counts apart, and one forgotten starts again.
  const other = new JunkMeter();
  other.look('d', { taken: 50, junk: 50 }, t0);
  other.look('d', { taken: 50, junk: 50 }, t0 + 1);
  other.forget('d');
  assert.equal(other.look('d', { taken: 50, junk: 50 }, t0 + 2), false);
  assert.equal(other.look('e', { taken: 50, junk: 50 }, t0 + 3), false);
});

test('what a kept contact sends never counts as junk, though it opens in none of their conversations', () => {
  assert.deepEqual(tookOf({ kind: 'refused', reason: 'unknown', theirs: true }), { junk: false });
  assert.deepEqual(tookOf({ kind: 'refused', reason: 'unknown' }), { junk: true });
  assert.deepEqual(tookOf({ kind: 'refused', reason: 'plain' }), { junk: true });
  assert.deepEqual(tookOf({ kind: 'refused', reason: 'blocked' }), { junk: true });
  assert.deepEqual(tookOf({ kind: 'refused', reason: 'replay' }), { junk: false });
  assert.deepEqual(tookOf({ kind: 'refused', reason: 'linked' }), { junk: false });
});

test('a queue moves for junk once a day at most, says the second flood, and nothing a day after a backup was put back', () => {
  const now = 50 * DAY;
  const none = { junk: {}, junkSaid: {} };
  assert.equal(junkStep(none, 'own', 0, now), 'move');
  assert.equal(junkStep(none, 'own', now - RESTORED_QUIET + 1, now), 'none');
  assert.equal(junkStep(none, 'own', now - RESTORED_QUIET, now), 'move');
  const moved = { junk: { own: now - HOUR }, junkSaid: {} };
  assert.equal(junkStep(moved, 'own', 0, now), 'say');
  assert.equal(junkStep({ ...moved, junkSaid: { own: now - 60_000 } }, 'own', 0, now), 'none');
  assert.equal(junkStep(moved, 'link', 0, now), 'move');
  assert.equal(junkStep({ junk: { own: now - JUNK_AGAIN }, junkSaid: {} }, 'own', 0, now), 'move');
});

test('each own queue says it was made later than the one before, on the hour, whatever the clock says', () => {
  const now = 1000 * HOUR + 1234;
  assert.equal(queueAge(0, now), 1000 * HOUR);
  assert.equal(queueAge(1000 * HOUR, now), 1000 * HOUR + 1);
  // The clock set back: later all the same.
  assert.equal(queueAge(2000 * HOUR, now), 2000 * HOUR + 1);
  // A contact's message with an older `qa` keeps where they read; one with none (0.1.16) takes it.
  assert.equal(takesPlace(undefined, 5), true);
  assert.equal(takesPlace(4, 5), false);
  assert.equal(takesPlace(5, 5), true);
  assert.equal(takesPlace(6, undefined), true);
});

test('kept contacts are told at 0, 7, 14 and 21 days while not heard on the new queue', () => {
  const moved = 100 * DAY;
  const since = 10 * DAY;
  let told: Told | undefined;
  let now = moved;
  const due: number[] = [];
  for (let day = 0; day <= 30; day++) {
    now = moved + day * DAY;
    if (tellDue(told, undefined, moved, since, now)) {
      due.push(day);
      told = toldOnce(told, moved, now);
    }
  }
  assert.deepEqual(due, [0, 7, 14, 21]);
  assert.equal(told?.n, 4);
  // Heard on it: no more.
  const once = toldOnce(undefined, moved, moved);
  assert.equal(tellDue(once, moved, moved, since, moved + TELL_AGAIN), false);
  assert.equal(tellDue(once, moved + 5, moved, since, moved + TELL_AGAIN), false);
  assert.equal(tellDue(once, moved - 1, moved, since, moved + TELL_AGAIN), true);
  // A later move: told again at once.
  assert.equal(tellDue({ qa: moved, at: moved, n: 4 }, undefined, moved + 1, since, moved + 1), true);
  // None for the queue every contact knew when this version first looked.
  assert.equal(tellDue(undefined, undefined, since, since, since + DAY), false);
});

test('an old queue is read for 14 days, or until every kept contact was heard on a later one; a group one while a group names it', () => {
  const now = 200 * DAY;
  const moved = now - DAY;
  const own = old(1, 'own', moved + GRACE, moved);
  assert.equal(graceOver(own, 0, true, now), false);
  assert.equal(graceOver(own, moved - 1, true, now), false);
  assert.equal(graceOver(own, moved, true, now), true);
  assert.equal(graceOver(own, Infinity, true, now), true);
  assert.equal(graceOver(own, 0, true, moved + GRACE), true);
  const link = old(2, 'link', moved + GRACE);
  assert.equal(graceOver(link, Infinity, true, now), false);
  assert.equal(graceOver(link, Infinity, true, moved + GRACE), true);
  const group = old(3, 'group', moved + GRACE);
  assert.equal(graceOver(group, Infinity, false, now), true);
  assert.equal(graceOver(group, Infinity, true, now), false);
  assert.equal(graceOver(group, Infinity, true, now + GRACE * 4), false);
  assert.equal(graceOver(old(4, 'public', moved + GRACE), Infinity, false, now), true);
});

test('at most four old own queues and six in all are kept: those over are emptied early, oldest first', () => {
  let was: OldQueue[] = [];
  const early: OldQueue[] = [];
  for (let n = 1; n <= 6; n++) {
    const made = withOld(was, old(n, 'own', n));
    was = made.was;
    early.push(...made.early);
  }
  assert.equal(was.length, MAX_OLD_OWN);
  assert.deepEqual(
    early.map((w) => w.queue.recipientHex),
    [hex(1), hex(2)],
  );
  for (let n = 7; n <= 10; n++) {
    const made = withOld(was, old(n, 'group', n));
    was = made.was;
    early.push(...made.early);
  }
  assert.equal(was.length, MAX_WAS);
  assert.equal(early.length, 4);
  // The same queue twice is kept once.
  assert.equal(withOld([old(1, 'own', 1)], old(1, 'own', 2)).was.length, 1);
});

test('a hidden place moves its ring queue after three rings that brought no call within a day', () => {
  const now = 10 * DAY;
  assert.equal(fakeRings([now - 1000, now - 2000], now), false);
  assert.equal(fakeRings([now - 1000, now - 2000, now - 3000], now), true);
  assert.equal(fakeRings([now - DAY, now - 2000, now - 3000], now), false);
});

test('the queues entry is there for every space and pocket from the first, one size whether used or not', async () => {
  store.clear();
  await prepareQueueEntries();
  const names = [...store.keys()].filter((name) => name.startsWith('erevos.queues'));
  assert.equal(names.length, 4 * 5);
  const sizes = new Set(names.map((name) => store.get(name)!.length));
  assert.equal(sizes.size, 1);
  const unused = store.get('erevos.queues.1')!.length;
  // A space that moved, with old queues on a relay of a long address, and a place that moved.
  const key = randomBytes(32);
  const space = spaceQueues(1, key);
  await space.update((d) => ({
    ...d,
    now: { queue: { recipientHex: hex(1), senderHex: hex(2) }, url: 'ws://relay.example', token: 't'.repeat(40) },
    was: Array.from({ length: MAX_WAS }, (_, n) => old(n + 10, 'own', n)),
    moved: 5 * HOUR,
    junk: { own: 1, link: 2 },
  }));
  await placeQueues(1, 3, key).update((d) => ({ ...d, moved: 7 * HOUR, rings: [1, 2, 3] }));
  assert.equal(store.get('erevos.queues.1')!.length, unused);
  assert.equal(store.get('erevos.queues3.1')!.length, unused);
  assert.equal((await space.load()).was.length, MAX_WAS);
  // Sealed with the key: another reads it as unused.
  assert.deepEqual(await spaceQueues(1, randomBytes(32)).load(), EMPTY_QUEUES);
  assert.ok(unused >= SIZE);
  // Preparing again keeps what is there.
  await prepareQueueEntries();
  assert.equal((await space.load()).moved, 5 * HOUR);
});
