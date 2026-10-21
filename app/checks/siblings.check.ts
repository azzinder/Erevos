// The account's linked devices reaching each other directly (lib/siblings.ts, docs/multi-device.md,
// Own devices), alone: which devices a list makes a device's others and which of two starts, what
// is kept of them and refused, how what two devices change at once settles, and what of it goes
// between devices (lib/link-wire.ts). Through a relay, with the phone off: checks/devices.check.ts.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { encodeEnvelope, Parts, type Envelope, type Place, type Synced } from '../lib/link-wire';
import {
  blankSynced,
  buried,
  changedBy,
  checkedErased,
  checkedRemoved,
  checkedSiblings,
  EARLY_LASTS,
  goesFor,
  MAX_EARLY,
  MAX_ERASED,
  MAX_REMOVED,
  removedAtOf,
  settled,
  siblingsFrom,
  stamped,
  stampOf,
  starts,
  withEarly,
  withErased,
  withRemoved,
  withRoutes,
  type Siblings,
} from '../lib/siblings';

const id = (c: string) => c.repeat(64);
const place = (c: string): Place => ({ sender: c.repeat(48), relay: 'ws://localhost:1', relayKey: '', spare: null });
const KEY = 'k'.repeat(43);

test('which devices a list makes a device\'s others, which of two starts, and what is kept of them', () => {
  // Two of the account's devices besides this one, and a place no device takes.
  const entries = [{ i: id('1'), b: 'b1' }, { i: id('3'), b: 'b3' }, { i: id('5'), b: 'b5' }, { i: id('7'), b: 'b7' }];
  const real = [id('3'), id('1'), id('7')];
  let keys = 0;
  const key = () => `${'k'.repeat(42)}${keys++}`;
  const first = siblingsFrom(null, id('3'), 10, entries, real, { [id('1')]: place('a'), [id('7')]: place('b') }, key);
  assert.deepEqual(
    first.list.map((s) => [s.id, s.bundle, s.conversation, s.at?.sender ?? null]),
    [
      [id('1'), 'b1', '', 'a'.repeat(48)],
      [id('7'), 'b7', '', 'b'.repeat(48)],
    ],
  );
  // One the phone says nothing of where it reads, as a phone from before, is not met.
  assert.deepEqual(siblingsFrom(null, id('3'), 10, entries, real, { [id('1')]: place('a') }, () => KEY).list.map((s) => s.id), [id('1')]);
  assert.deepEqual([first.of, first.n, first.list.map((s) => s.key)], [id('3'), 10, [`${'k'.repeat(42)}0`, `${'k'.repeat(42)}1`]]);
  // The lower id starts.
  assert.deepEqual([starts(id('3'), id('7')), starts(id('3'), id('1'))], [true, false]);

  // The next list keeps a device still named as it was, with where it reads once it said nothing
  // itself; one named with another bundle is another, and one no longer named goes.
  const met = { ...first, list: first.list.map((s) => (s.id === id('7') ? { ...s, conversation: 'AAAA', heard: 5 } : s)), seen: ['ab'.repeat(16)] };
  const next = siblingsFrom(met, id('3'), 11, [{ i: id('1'), b: 'other' }, { i: id('3'), b: 'b3' }, { i: id('7'), b: 'b7' }], real, { [id('7')]: place('c'), [id('1')]: place('d') }, key);
  assert.deepEqual(
    next.list.map((s) => [s.id, s.bundle, s.conversation, s.at?.sender ?? null, s.key]),
    [
      [id('1'), 'other', '', 'd'.repeat(48), `${'k'.repeat(42)}2`],
      [id('7'), 'b7', 'AAAA', 'b'.repeat(48), `${'k'.repeat(42)}1`],
    ],
  );
  assert.deepEqual(next.seen, ['ab'.repeat(16)]);
  assert.equal(withRoutes(next, { [id('7')]: place('e') }).list[1].at?.sender, 'b'.repeat(48));
  assert.equal(withRoutes(first, { [id('7')]: place('e') }).list[1].at?.sender, 'e'.repeat(48));
  assert.equal(withRoutes(first, {}).list[1].at?.sender, 'b'.repeat(48));
  // A list that does not name this device's own makes none; one made as another endpoint starts anew.
  assert.deepEqual(siblingsFrom(met, id('3'), 12, entries, [id('1'), id('7')], {}, key).list, []);
  const anew = siblingsFrom(met, id('9'), 12, [...entries, { i: id('9'), b: 'b9' }], [...real, id('9')], { [id('7')]: place('c') }, key);
  assert.deepEqual([anew.seen, anew.list.map((s) => [s.id, s.conversation])], [[], [[id('7'), '']]]);

  // First packets to try again: a few, for a while.
  let early = withEarly([], 'AA==', 0);
  for (let n = 0; n < MAX_EARLY + 3; n++) early = withEarly(early, `B${n}==`, 1 + n);
  assert.equal(early.length, MAX_EARLY);
  assert.deepEqual(withEarly([{ packet: 'AA==', at: 0 }], 'BB==', EARLY_LASTS + 1), [{ packet: 'BB==', at: EARLY_LASTS + 1 }]);

  // Kept as they were; what is not one is left out.
  const kept: Siblings = { ...next, list: next.list.map((s) => ({ ...s, key: KEY })), early: [{ packet: 'AA==', at: 1 }] };
  assert.deepEqual(checkedSiblings(JSON.parse(JSON.stringify(kept))), kept);
  assert.equal(checkedSiblings({ ...kept, of: 'x' }), null);
  const mixed = checkedSiblings({ ...kept, list: [...kept.list, { ...kept.list[0], key: 'short' }, { ...kept.list[0], id: id('3') }, kept.list[1]] });
  assert.deepEqual(mixed?.list.map((s) => s.id), [id('1'), id('7')]);
});

test('what two devices change at once settles: the later setting, a request accepted, a removal until added again', () => {
  const c = id('c');
  const kept: Synced = stamped({ ...blankSynced(c), name: 'Carol', request: false }, { name: 'Carol' }, 100, true);
  assert.deepEqual(kept.at, { name: 100, look: 100, avatar: 100, hide: 100, added: 100 });
  // A change made now is set after every setting of its fields kept, whatever the clock says.
  assert.equal(stampOf(kept, { name: 'C' }, 500), 500);
  assert.equal(stampOf(kept, { name: 'C' }, 50), 101);
  assert.equal(stampOf(kept, { timer: 60, timerAt: 9 }, 50), 101);

  // From another device: a field set later is taken, one set before is not, nor one set at the same time.
  assert.equal(changedBy(kept, c, { name: 'Later' }, 200, false, 0)?.name, 'Later');
  assert.deepEqual(changedBy(kept, c, { name: 'Later' }, 200, false, 0)?.at, { ...kept.at, name: 200 });
  assert.equal(changedBy(kept, c, { name: 'Before' }, 90, false, 0), null);
  assert.equal(changedBy(kept, c, { name: 'Same' }, 100, false, 0), null);
  // Each field on its own: one set later, the other not.
  const both = changedBy({ ...kept, at: { ...kept.at, name: 200 } }, c, { name: 'Old', hide: true }, 150, false, 0);
  assert.deepEqual([both?.name, both?.hide, both?.at?.name, both?.at?.hide], ['Carol', true, 200, 150]);
  // The timer the later one; a request only accepted.
  assert.deepEqual(changedBy(kept, c, { timer: 60, timerAt: 7 }, 1, false, 0)?.timer, 60);
  assert.equal(changedBy({ ...kept, timer: 60, timerAt: 7 }, c, { timer: 5, timerAt: 3 }, 900, false, 0), null);
  assert.equal(changedBy(kept, c, { request: true }, 900, false, 0), null);
  assert.equal(changedBy({ ...kept, request: true }, c, { request: false }, 1, false, 0)?.request, false);
  // A picture set later too, or none.
  const drawn = { kind: 'emoji', emoji: '🌝', color: 0 } as unknown as Synced['avatar'];
  assert.deepEqual(changedBy(kept, c, { avatar: drawn }, 200, false, 0)?.avatar, drawn);
  assert.equal(changedBy(kept, c, { avatar: null }, 200, false, 0)?.avatar, null);

  // A contact not kept here comes only as one the other device added, and after it was removed here.
  const d = id('d');
  assert.equal(changedBy(undefined, d, { name: 'Dave' }, 300, false, 0), null);
  assert.deepEqual(changedBy(undefined, d, { name: 'Dave', request: false }, 300, true, 0), {
    ...blankSynced(d),
    name: 'Dave',
    request: false,
    at: { name: 300, look: 300, avatar: 300, hide: 300, added: 300 },
  });
  assert.equal(changedBy(undefined, d, { name: 'Dave' }, 300, true, 300), null);
  assert.equal(changedBy(undefined, d, { name: 'Dave' }, 301, true, 300)?.name, 'Dave');

  // A removal goes, unless the contact was added again since; it is set after the last adding.
  assert.deepEqual([goesFor(kept, 100), goesFor(kept, 99), goesFor(undefined, 0)], [true, false, true]);
  assert.deepEqual([removedAtOf(kept, 50), removedAtOf(kept, 500), removedAtOf(undefined, 5)], [101, 500, 5]);
  // What the phone says of one removed here stays out, unless added again since; a phone from
  // before, saying no times, is taken as it says.
  assert.deepEqual([buried(200, kept), buried(99, kept), buried(undefined, kept), buried(200, { ...kept, at: undefined })], [true, false, false, false]);

  // What the phone says, settled with what this device keeps: each field the later setting.
  const mine = { ...kept, name: 'Mine', at: { ...kept.at, name: 400 } };
  const phone: Synced = { ...kept, name: 'Phone', hide: true, request: true, at: { ...kept.at, name: 300, hide: 300 } };
  assert.deepEqual(settled(mine, phone), { ...phone, name: 'Mine', request: false, at: { ...phone.at, name: 400 } });
  assert.deepEqual(settled(mine, { ...phone, at: undefined }), { ...phone, at: undefined });
  assert.deepEqual(settled(undefined, phone), phone);
  assert.deepEqual(settled({ ...kept, timer: 60, timerAt: 9 }, { ...phone, timer: 5, timerAt: 2 }).timer, 60);
  // One whose picture this device left out keeps its own.
  const { avatar: _avatar, ...pictured } = { ...mine, at: { ...mine.at, avatar: 900 } };
  assert.equal('avatar' in settled(pictured, { ...phone, avatar: null }), false);

  // What is remembered of what went, and what is kept of it.
  let removed: Record<string, number> = {};
  for (let n = 0; n < MAX_REMOVED + 5; n++) removed = withRemoved(removed, n.toString(16).padStart(64, '0'), n);
  assert.equal(Object.keys(removed).length, MAX_REMOVED);
  assert.equal(removed['0'.repeat(64)], undefined);
  assert.equal(withRemoved({ [c]: 9 }, c, 5)[c], 9);
  assert.deepEqual(checkedRemoved({ [c]: 5, x: 1, [d]: -1 }), { [c]: 5 });
  const peer = `contact:${c}`;
  let erased: Record<string, string[]> = {};
  for (let n = 0; n < MAX_ERASED + 5; n++) erased = withErased(erased, peer, [n.toString(16).padStart(12, '0')]);
  assert.equal(erased[peer].length, MAX_ERASED);
  assert.equal(withErased(erased, peer, []), erased);
  assert.deepEqual(checkedErased({ [peer]: ['aabbccddeeff', 'x'], 'sms:1': ['aabbccddeeff'] }), { [peer]: ['aabbccddeeff'] });
});

test('what goes between devices for it: when a change was made, where the others read, the key for packets back', () => {
  const at = place('a');
  const parts = new Parts();
  const through = (envelope: Envelope, pk = '') => parts.take('x', encodeEnvelope(envelope, at, pk)[0]);
  // A change says when it was made, and whether the contact was added then; a removal when.
  const c = id('c');
  assert.deepEqual(through({ k: 'set', c, change: { name: 'Carol' }, when: 5, added: true }, KEY), { k: 'set', c, change: { name: 'Carol' }, when: 5, added: true, at, pk: KEY });
  assert.deepEqual(through({ k: 'set', c, change: {}, remove: true, when: 6 }), { k: 'set', c, change: {}, remove: true, when: 6, at });
  // A device from before says neither; nor a key, and none is taken that is not one.
  assert.deepEqual(through({ k: 'set', c, change: { hide: true } }), { k: 'set', c, change: { hide: true }, at });
  assert.deepEqual(through({ k: 'here' }, 'short'), { k: 'here', at });
  // The contacts say when each field was set, and those not one are left out.
  const synced: Synced = { ...blankSynced(c), at: { name: 3, added: 1 } };
  const told = through({ k: 'contacts', all: false, list: [{ ...synced, at: { ...synced.at, bad: -1, hide: 'x' } as never }], gone: [] });
  assert.deepEqual(told?.k === 'contacts' && told.list, [synced]);
  // Where each of the others reads goes with the list, at most as many as the list names.
  const list = { b: 'AA', s: 'BB' };
  const routes = { [id('1')]: at, [id('2')]: { ...at, sender: 'no' }, bad: at };
  const listed = through({ k: 'list', list, ak: 'CC', real: [id('1')], routes } as never);
  assert.deepEqual(listed?.k === 'list' && listed.routes, { [id('1')]: at });
  // When a device added a contact.
  const added = through({ k: 'add', code: { senderHex: 'ab'.repeat(24), relayUrl: 'ws://localhost:1', key: 'A'.repeat(1800) }, when: 9 });
  assert.equal(added?.k === 'add' && added.when, 9);
});
