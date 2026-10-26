// Which queues the web app's pushes go for (lib/push-queues.ts): the space's own, its groups' and
// public groups', and its contacts' own queues with the ones made ahead, each once, on the relay of
// the own queue only; not the ones contacts moved away from, which with the contact queues not
// deleted yet lose theirs when notifications are turned off.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { leftAt, pushedQueues } from '../lib/push-queues';
import type { Mine, OldMine } from '../lock/e2e-data';

const here = 'wss://relay.example';
const there = 'wss://other.example';
const mine = (r: string, u = here, was?: OldMine): Mine => ({ r, s: `${r}s`, u, qa: 2, g: 0, ...(was ? { was } : {}) });
const kept = (r: string, url = here) => ({ queue: { recipientHex: r, senderHex: `${r}s` }, url, token: '' });

test('the own queue, the groups\' and the contacts\' queues on its relay push, each once', () => {
  const e2e = {
    contactQueues: () => [
      { identity: 'bob', mine: mine('bob') },
      { identity: 'carol', mine: mine('carol2', here, { r: 'carol1', u: here, until: 1 }) },
      { identity: 'dave', mine: mine('dave', there) },
      { identity: 'eve', mine: mine('eve2', here, { r: 'eve1', u: there, until: 1 }) },
    ],
    readyAt: (url: string) => (url === `${here}/` || url === here ? ['ready1', 'ready2'] : ['far']),
  };
  assert.deepEqual(pushedQueues({ recipientHex: 'own', senderHex: 'owns' }, { group: kept('group'), public: kept('public', there) }, e2e, `${here}/`), [
    'own',
    'group',
    'bob',
    'carol2',
    'eve2',
    'ready1',
    'ready2',
  ]);
  // A queue named twice goes once; with no chats, and no groups yet, the own queue alone.
  assert.deepEqual(pushedQueues({ recipientHex: 'group', senderHex: 'gs' }, { group: kept('group'), public: null }, null, here), ['group']);
  assert.deepEqual(pushedQueues({ recipientHex: 'own', senderHex: 'owns' }, null, null, here), ['own']);
});

test('the queues contacts moved away from, and those not deleted yet, are let go of when notifications are turned off', () => {
  const e2e = {
    contactQueues: () => [
      { identity: 'bob', mine: mine('bob') },
      { identity: 'carol', mine: mine('carol2', here, { r: 'carol1', u: here, until: 1 }) },
      { identity: 'eve', mine: mine('eve2', here, { r: 'eve1', u: there, until: 1 }) },
    ],
    goneQueues: (): OldMine[] => [
      { r: 'old', u: here, until: 0 },
      { r: 'later', u: `${here}/`, until: Date.now() + 60_000 },
      { r: 'far', u: there, until: 0 },
    ],
  };
  assert.deepEqual(leftAt(e2e, here), ['carol1', 'old', 'later']);
  assert.deepEqual(leftAt(null, here), []);
});
