// What goes on while a space is open (lib/space-running.ts): started once with its screens, it
// goes on when the screens start again and behind the password screen, and stops only when the
// space closes or another opens.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { keepSpaceRunning, onSpaceGatedChange, setSpaceGated, spaceGated, stopSpaceRunning } from '../lib/space-running';

test('what goes on for a space starts once, and stops when it closes or another opens', () => {
  const log: string[] = [];
  const start = (space: number) => () => [() => log.push(`stop ${space} a`), () => log.push(`stop ${space} b`)];
  const started = (space: number) => () => {
    log.push(`start ${space}`);
    return start(space)();
  };
  keepSpaceRunning(0, started(0));
  // The screens start again (Erevos swiped away and opened): nothing starts twice, nothing stops.
  keepSpaceRunning(0, started(0));
  assert.deepEqual(log, ['start 0']);
  keepSpaceRunning(1, started(1));
  assert.deepEqual(log, ['start 0', 'stop 0 a', 'stop 0 b', 'start 1']);
  stopSpaceRunning();
  stopSpaceRunning();
  assert.deepEqual(log.slice(4), ['stop 1 a', 'stop 1 b']);
  keepSpaceRunning(1, started(1));
  assert.equal(log.at(-1), 'start 1');
  stopSpaceRunning();
});

test('the password screen in front of the space leaves it going on, and goes when the space closes', () => {
  const log: string[] = [];
  const told: boolean[] = [];
  const stopTelling = onSpaceGatedChange(() => told.push(spaceGated()));
  keepSpaceRunning(2, () => {
    log.push('start 2');
    return [() => log.push(`stop 2 (gated: ${spaceGated()})`)];
  });
  setSpaceGated(true);
  setSpaceGated(true);
  assert.equal(spaceGated(), true);
  // Its password: the screens start again, and nothing starts twice.
  keepSpaceRunning(2, () => {
    log.push('start 2 again');
    return [];
  });
  setSpaceGated(false);
  setSpaceGated(true);
  // Another space's password: it closes first, and the password screen is no longer in front of anything.
  stopSpaceRunning();
  assert.equal(spaceGated(), false);
  assert.deepEqual(log, ['start 2', 'stop 2 (gated: true)']);
  assert.deepEqual(told, [true, false, true, false]);
  stopTelling();
  setSpaceGated(true);
  assert.deepEqual(told, [true, false, true, false]);
  setSpaceGated(false);
});
