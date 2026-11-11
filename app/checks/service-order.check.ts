// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// The order of the services on home and those hidden there (lib/service-order.ts).
// Run with: npm run check
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { arrangeServices, readServiceOrder, servicePart } from '../lib/service-order';

test('All messages stays first and is never hidden; the rest follow the order kept, new ones after', () => {
  const kept = { order: ['nostr', 'sms'], hidden: ['xmpp'] };
  assert.deepEqual(arrangeServices(['all', 'sms', 'erevos', 'xmpp', 'nostr'], kept), { shown: ['all', 'nostr', 'sms', 'erevos'], hidden: ['xmpp'] });
  assert.deepEqual(arrangeServices(['all', 'sms', 'erevos'], { order: ['all', 'erevos'], hidden: ['all'] }), { shown: ['all', 'erevos', 'sms'], hidden: [] });
  assert.deepEqual(arrangeServices(['all', 'sms', 'erevos'], { order: [], hidden: [] }), { shown: ['all', 'sms', 'erevos'], hidden: [] });
});

test('what was kept is read safely', () => {
  assert.deepEqual(readServiceOrder(null), { order: [], hidden: [] });
  assert.deepEqual(readServiceOrder('not json'), { order: [], hidden: [] });
  assert.deepEqual(readServiceOrder('{"order":["sms",3],"hidden":["all","nostr"]}'), { order: ['sms'], hidden: ['nostr'] });
});

test('a chat is of its network, the SMS, or Erevos', () => {
  assert.equal(servicePart({ sms: '', network: 'matrix' }), 'matrix');
  assert.equal(servicePart({ sms: '+300000000001' }), 'sms');
  assert.equal(servicePart({ sms: '' }), 'erevos');
});
