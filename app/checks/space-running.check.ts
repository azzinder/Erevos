// What goes on while a space is open (lib/space-running.ts): started once with its screens, it
// goes on when the screens start again, and stops only when the space closes or another opens.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { keepSpaceRunning, stopSpaceRunning } from '../lib/space-running';

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
