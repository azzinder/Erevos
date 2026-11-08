// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// When a relay queue moves, and what follows from it (lib/moves.ts): the junk meter that says a
// queue is flooded, the time each own queue says it was made (`qa`), when each kept contact is
// told the new one, how long an old queue is still read, and the queues entry (lock/queues-data.ts),
// one size in bytes whether a space or place moved or not, its words in any script, the queues the
// groups say, and the backup queue the contact link carries. The moves themselves, through a real relay, are in queue-move.check.ts.
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
  linkSpare,
  newOffset,
  QUEUE_JITTER,
  QUEUE_OFFSET,
  queueAge,
  randomHours,
  RESTORED_QUIET,
  takesPlace,
  TELL_AGAIN,
  tellDue,
  toldOnce,
  withOld,
} from '../lib/moves';
import { groupSenders, tookOf } from '../lib/queue-move';
import type { Told } from '../lock/e2e-data';
import { EMPTY_QUEUES, MAX_OLD_OWN, MAX_OLD_SPARE, MAX_WAS, placeQueues, prepareQueueEntries, SIZE, spaceQueues, type OldQueue } from '../lock/queues-data';
import { slow, store } from './secure-memory';

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

test('a qa tells no one when: a move says the hour put off by the place’s own offset and a few random hours, two places never alike, and never less than before', () => {
  const now = 1000 * HOUR + 1234;
  assert.equal(queueAge(0, now, 5 * HOUR, 2 * HOUR), 1007 * HOUR);
  assert.equal(queueAge(2000 * HOUR, now, 5 * HOUR, 11 * HOUR), 2000 * HOUR + 1);
  // Each place's offset: whole hours, one at least, under QUEUE_OFFSET; drawn apart for each.
  const offsets = Array.from({ length: 64 }, () => newOffset());
  assert.ok(offsets.every((o) => o >= HOUR && o < QUEUE_OFFSET && o % HOUR === 0));
  assert.ok(new Set(offsets).size > 48);
  assert.equal(newOffset(() => 0), HOUR);
  // A move's few hours more: whole, under QUEUE_JITTER.
  assert.equal(randomHours(QUEUE_JITTER, () => 0), 0);
  assert.equal(randomHours(QUEUE_JITTER, () => 0.9999), QUEUE_JITTER - HOUR);
  // After a backup was put back, later than any a move since could have made, at the same hour.
  for (let i = 0; i < 32; i++) assert.ok(queueAge(0, now, 5 * HOUR, randomHours(QUEUE_JITTER)) < queueAge(0, now, 5 * HOUR, QUEUE_JITTER));
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

test('an old queue is read for 14 days, or until every kept contact was heard on a later one; any while a group names it', () => {
  const now = 200 * DAY;
  const moved = now - DAY;
  const own = old(1, 'own', moved + GRACE, moved);
  assert.equal(graceOver(own, 0, false, now), false);
  assert.equal(graceOver(own, moved - 1, false, now), false);
  assert.equal(graceOver(own, moved, false, now), true);
  assert.equal(graceOver(own, Infinity, false, now), true);
  assert.equal(graceOver(own, 0, false, moved + GRACE), true);
  const link = old(2, 'link', moved + GRACE);
  assert.equal(graceOver(link, Infinity, false, now), false);
  assert.equal(graceOver(link, Infinity, false, moved + GRACE), true);
  // One a group of this space still names stays, whatever kind it is now: the own queue from before
  // this version, which the groups say until they renew there, became the link's, or an own one.
  assert.equal(graceOver(link, Infinity, true, moved + GRACE * 4), false);
  assert.equal(graceOver(own, Infinity, true, moved + GRACE * 4), false);
  const group = old(3, 'group', moved + GRACE);
  assert.equal(graceOver(group, Infinity, false, now), true);
  assert.equal(graceOver(group, Infinity, true, now), false);
  assert.equal(graceOver(group, Infinity, true, now + GRACE * 4), false);
  assert.equal(graceOver(old(4, 'public', moved + GRACE), Infinity, false, now), true);
  // A backup one goes with its 14 days, or, once given a `by` as after the phone a backup came from
  // was lost, as an own one does.
  assert.equal(graceOver(old(5, 'spare', moved + GRACE), Infinity, false, now), false);
  assert.equal(graceOver(old(5, 'spare', moved + GRACE), 0, false, moved + GRACE), true);
  const spare = old(6, 'spare', moved + GRACE, moved);
  assert.equal(graceOver(spare, moved - 1, false, now), false);
  assert.equal(graceOver(spare, moved, false, now), true);
  assert.equal(graceOver(spare, Infinity, true, now), false);
});

test('at most four old own queues, four old backup ones and twelve in all are kept: those over are emptied early, oldest first', () => {
  let was: OldQueue[] = [];
  const early: OldQueue[] = [];
  const add = (w: OldQueue) => {
    const made = withOld(was, w);
    was = made.was;
    early.push(...made.early);
  };
  // Each move leaves an own queue and the backup queue that moved with it: four moves of each fit.
  for (let n = 1; n <= 6; n++) {
    add(old(n, 'own', n));
    add(old(n + 100, 'spare', n));
  }
  assert.equal(was.filter((w) => w.kind === 'own').length, MAX_OLD_OWN);
  assert.equal(was.filter((w) => w.kind === 'spare').length, MAX_OLD_SPARE);
  assert.deepEqual(
    early.map((w) => w.queue.recipientHex),
    [hex(1), hex(101), hex(2), hex(102)],
  );
  // The link's, the groups' and the public groups' are kept beside them.
  add(old(200, 'link', 7));
  add(old(201, 'group', 7));
  add(old(202, 'public', 7));
  assert.equal(was.length, MAX_OLD_OWN + MAX_OLD_SPARE + 3);
  assert.equal(early.length, 4);
  // Over MAX_WAS in all, the oldest goes.
  add(old(203, 'group', 8));
  add(old(204, 'group', 9));
  assert.equal(was.length, MAX_WAS);
  assert.deepEqual(early.at(-1)!.queue.recipientHex, hex(3));
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
  // All it keeps at most, on a relay of an address as long as most, with a token: one size still.
  const kept = (n: number, kind: OldQueue['kind']): OldQueue => ({ ...old(n, kind, 10 * DAY + n, 9 * DAY), url: 'wss://relay.' + 'e'.repeat(40) + '.org:7879', token: 't'.repeat(64) });
  const full = (from: number) => Array.from({ length: MAX_WAS }, (_, n) => kept(from + n, 'own'));
  await space.update((d) => ({
    ...d,
    link: kept(1, 'link'),
    group: kept(2, 'group'),
    public: kept(3, 'public'),
    was: full(10),
    early: full(40).slice(0, 4),
    next: { recipientHex: hex(70), senderHex: hex(71) },
    nextWhy: 'junk',
    offset: 700 * HOUR,
    junk: { own: 1, link: 2, group: 3, public: 4 },
    junkSaid: { own: 1, link: 2, group: 3, public: 4 },
    linkAt: 5,
    linkUntil: 6,
    rings: [1, 2, 3, 4, 5, 6, 7, 8],
    ringDue: true,
    restore: 'r'.repeat(64),
    lost: 'l'.repeat(64),
    losing: 'm'.repeat(64),
    lostDone: ['mines', 'own', 'link', 'group', 'public'],
  }));
  assert.equal(store.get('erevos.queues.1')!.length, unused);
  // Addresses and tokens of letters beyond ASCII, each two bytes or more: one size still.
  const wide = (n: number, kind: OldQueue['kind']): OldQueue => ({ ...kept(n, kind), url: 'wss://ρελέ.' + 'έ'.repeat(40) + '.org:7879', token: 'τ'.repeat(64) });
  await space.update((d) => ({
    ...d,
    now: wide(0, 'own'),
    link: wide(1, 'link'),
    group: wide(2, 'group'),
    public: wide(3, 'public'),
    was: Array.from({ length: MAX_WAS }, (_, n) => wide(10 + n, 'own')),
    early: Array.from({ length: 4 }, (_, n) => wide(40 + n, 'own')),
  }));
  assert.equal(store.get('erevos.queues.1')!.length, unused);
  // Nothing is let go of to fit: what would not takes the next whole size.
  const long = (from: number) => full(from).map((w) => ({ ...w, url: 'wss://' + 'r'.repeat(400) + '.org' }));
  await space.update((d) => ({ ...d, was: long(100), early: long(200) }));
  assert.ok(store.get('erevos.queues.1')!.length > unused);
  let back = await space.load();
  assert.deepEqual([back.was.length, back.early.length, back.nextWhy, back.ringDue, back.offset], [MAX_WAS, MAX_WAS, 'junk', true, 700 * HOUR]);
  // However many were let go of early and not deleted yet, none is forgotten.
  await space.update((d) => ({ ...d, early: [...full(200), ...full(300)] }));
  back = await space.load();
  assert.equal(back.early.length, 2 * MAX_WAS);
  // Sealed with the key: another reads it as unused.
  assert.deepEqual(await spaceQueues(1, randomBytes(32)).load(), EMPTY_QUEUES);
  assert.ok(unused >= SIZE);
  // Preparing again keeps what is there.
  await prepareQueueEntries();
  assert.equal((await space.load()).moved, 5 * HOUR);
});

test('preparing the entries waits for a write to the same one under way, and never writes over it', async () => {
  store.clear();
  const key = randomBytes(32);
  slow.set = 20;
  try {
    // The first look writes while the start prepares them: the keystore takes its time with each.
    const written = spaceQueues(0, key).update((d) => ({ ...d, moved: 9 * HOUR }));
    await Promise.all([written, prepareQueueEntries()]);
  } finally {
    slow.set = 0;
  }
  assert.equal((await spaceQueues(0, key).load()).moved, 9 * HOUR);
});

test('the groups say the queue the contact link names until theirs is made, never the own one once it moved', () => {
  const own = { recipientHex: hex(1), senderHex: hex(2) };
  const kept = (n: number, url = 'ws://relay') => ({ queue: { recipientHex: hex(n), senderHex: hex(n + 1000) }, url, token: '' });
  // Before the first move the own queue is the link's.
  assert.deepEqual(groupSenders(EMPTY_QUEUES, own, 'ws://relay'), { groupHex: hex(2), publicHex: hex(2) });
  // After it, the link's, until the groups' own are made, or again after the relay lost them.
  assert.deepEqual(groupSenders({ ...EMPTY_QUEUES, link: kept(5) }, own, 'ws://relay'), { groupHex: hex(1005), publicHex: hex(1005) });
  assert.deepEqual(groupSenders({ ...EMPTY_QUEUES, link: kept(5), group: kept(6) }, own, 'ws://relay'), { groupHex: hex(1006), publicHex: hex(1006) });
  assert.deepEqual(groupSenders({ ...EMPTY_QUEUES, link: kept(5), group: kept(6), public: kept(7) }, own, 'ws://relay'), { groupHex: hex(1006), publicHex: hex(1007) });
  // One on another relay is not where the groups reach this phone.
  assert.deepEqual(groupSenders({ ...EMPTY_QUEUES, link: kept(5), group: kept(6, 'ws://other') }, own, 'ws://relay'), { groupHex: hex(1005), publicHex: hex(1005) });
});

test('the contact link carries the own queue’s backup queue while it names the own queue, and none once it names a queue of its own', () => {
  const spare = { senderHex: hex(3), relayUrl: 'ws://spare' };
  // Before the first move, on a phone or a linked device that has no link queue yet.
  assert.deepEqual(linkSpare('', hex(2), spare), spare);
  assert.deepEqual(linkSpare(hex(2), hex(2), spare), spare);
  // After it: the backup queue moved with the own queue, and would lead to it.
  assert.equal(linkSpare(hex(1005), hex(2), spare), undefined);
  assert.equal(linkSpare(hex(1005), hex(2), undefined), undefined);
});
