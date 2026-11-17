// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { readQuality, secondsBetween } from '../lib/call-quality';

const report = (stats: Record<string, unknown>[]) => new Map(stats.map((s) => [String(s.id), s]));

test('how the call connects is read of the last moments: lost, filled in, jitter, there and back, the way', () => {
  const first = readQuality(
    report([
      { id: 'in', type: 'inbound-rtp', kind: 'audio', packetsLost: 2, packetsReceived: 98, jitter: 0.012, concealedSamples: 480, totalSamplesReceived: 48_000 },
      { id: 't', type: 'transport', selectedCandidatePairId: 'p' },
      { id: 'p', type: 'candidate-pair', localCandidateId: 'l', currentRoundTripTime: 0.18 },
      { id: 'l', type: 'local-candidate', candidateType: 'relay', relayProtocol: 'udp', networkType: 'cellular' },
    ]),
    null,
  );
  assert.equal(first.lost, 2);
  assert.equal(first.filled, 1);
  assert.equal(first.jitter, 12);
  assert.equal(first.rtt, 180);
  assert.equal(first.way, 'relay udp cellular');
  // The next reading counts only what came since.
  const next = readQuality(
    report([{ id: 'in', type: 'inbound-rtp', kind: 'audio', packetsLost: 12, packetsReceived: 188, concealedSamples: 5280, totalSamplesReceived: 96_000 }]),
    first.totals,
  );
  assert.equal(next.lost, 10);
  assert.equal(next.filled, 10);
  assert.equal(next.rtt, null);
  assert.equal(next.way, '');
  // Nothing measured yet: nothing said.
  const none = readQuality(report([]), null);
  assert.equal(none.lost, null);
  assert.equal(none.totals, null);
});

test('how long it took is said in seconds, only once both times are known', () => {
  assert.equal(secondsBetween(1000, 2850), 1.9);
  assert.equal(secondsBetween(0, 2850), null);
  assert.equal(secondsBetween(3000, 0), null);
});
