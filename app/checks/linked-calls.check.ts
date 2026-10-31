// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// Calls on the account's linked devices (lib/linked-calls.ts): where the phone sends each call
// signal, so a contact's call rings everywhere, the first to answer takes it and the others stop,
// and a device calls through the account. Then a call stopped here because another device took it
// (lib/call.ts), and its line (lib/calls.ts, lib/call-lines.ts).
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';

import { Call, currentCall } from '../lib/call';
import type { CallSignal } from '../lib/call-signal';
import { shownLine } from '../lib/call-lines';
import { endedLine } from '../lib/calls';
import { LinkedCalls } from '../lib/linked-calls';
import { fakeRtc } from './fake-rtc';

const C = 'c'.repeat(64);
const DELL = 'd'.repeat(64);
const MAC = 'e'.repeat(64);
const ID = '0123456789abcdef';
const offer: CallSignal = { id: ID, kind: 'offer', video: false, sdp: 'v=0\r\noffer', at: 1 };
const answer: CallSignal = { id: ID, kind: 'answer', sdp: 'v=0\r\nanswer' };
const end = (reason: 'hangup' | 'decline' | 'busy' | 'missed' | 'failed'): CallSignal => ({ id: ID, kind: 'end', reason });

afterEach(() => {
  currentCall()?.hangUp();
});

test('a contact calls: it rings on every device, the first to answer takes it, the others stop', () => {
  const calls = new LinkedCalls();
  assert.deepEqual(calls.contact(C, offer, [DELL, MAC], false), [{ to: 'devices', c: C, ids: [DELL, MAC], signal: offer }]);
  // Said twice, or ringing there: nothing more.
  assert.deepEqual(calls.contact(C, offer, [DELL, MAC], false), []);
  assert.deepEqual(calls.device(DELL, C, { id: ID, kind: 'ringing' }, false), []);
  assert.equal(calls.busy(), false);
  // The computer answers: the contact gets its answer, the phone and the other device stop.
  assert.deepEqual(calls.device(DELL, C, answer, false), [
    { to: 'contact', c: C, signal: answer },
    { to: 'phone', id: ID, declined: false },
    { to: 'done', ids: [MAC], id: ID, declined: false },
  ]);
  assert.equal(calls.busy(), true);
  // Too late on the other one; the phone's own answer, too late, goes nowhere else.
  assert.deepEqual(calls.device(MAC, C, answer, false), [{ to: 'done', ids: [MAC], id: ID, declined: false }]);
  assert.deepEqual(calls.phone(C, answer), []);
  // What the contact says next goes to that computer only; their hanging up ends it.
  assert.deepEqual(calls.contact(C, end('hangup'), [DELL, MAC], false), [{ to: 'devices', c: C, ids: [DELL], signal: end('hangup') }]);
  assert.equal(calls.busy(), false);
  assert.deepEqual(calls.contact(C, end('hangup'), [DELL, MAC], false), []);
});

test('the phone answers first, or turns it down, or it is missed', () => {
  const calls = new LinkedCalls();
  calls.contact(C, offer, [DELL], false);
  assert.deepEqual(calls.phone(C, answer), [{ to: 'done', ids: [DELL], id: ID, declined: false }]);
  assert.deepEqual(calls.device(DELL, C, answer, false), [{ to: 'done', ids: [DELL], id: ID, declined: false }]);
  assert.deepEqual(calls.phone(C, end('hangup')), []);
  assert.equal(calls.busy(), false);

  calls.contact(C, offer, [DELL, MAC], false);
  assert.deepEqual(calls.phone(C, end('decline')), [{ to: 'done', ids: [DELL, MAC], id: ID, declined: true }]);
  calls.contact(C, offer, [DELL, MAC], false);
  assert.deepEqual(calls.phone(C, end('missed')), [{ to: 'devices', c: C, ids: [DELL, MAC], signal: end('missed') }]);

  // Turned down on a device: for the account, and the others stop.
  calls.contact(C, offer, [DELL, MAC], false);
  assert.deepEqual(calls.device(MAC, C, end('decline'), false), [
    { to: 'contact', c: C, signal: end('decline') },
    { to: 'phone', id: ID, declined: true },
    { to: 'done', ids: [DELL], id: ID, declined: true },
  ]);
  // A device that only stops ringing leaves the others ringing; the contact giving up stops them.
  calls.contact(C, offer, [DELL, MAC], false);
  assert.deepEqual(calls.device(MAC, C, end('missed'), false), []);
  assert.deepEqual(calls.device(MAC, C, answer, false), [{ to: 'done', ids: [MAC], id: ID, declined: false }]);
  assert.deepEqual(calls.contact(C, end('missed'), [DELL, MAC], false), [{ to: 'devices', c: C, ids: [DELL], signal: end('missed') }]);
});

test('a device calls through the account, and the account is busy while it is in the call', () => {
  const calls = new LinkedCalls();
  assert.deepEqual(calls.device(DELL, C, offer, false), [{ to: 'contact', c: C, signal: offer }]);
  assert.deepEqual(calls.contact(C, { id: ID, kind: 'ringing' }, [DELL, MAC], false), [{ to: 'devices', c: C, ids: [DELL], signal: { id: ID, kind: 'ringing' } }]);
  assert.deepEqual(calls.contact(C, answer, [DELL, MAC], false), [{ to: 'devices', c: C, ids: [DELL], signal: answer }]);
  // Someone else calls meanwhile: it rings on none of them (the phone says the account is busy).
  const other = { ...offer, id: 'ffffffffffffffff' };
  assert.deepEqual(calls.contact('b'.repeat(64), other, [DELL, MAC], false), []);
  assert.deepEqual(calls.device(MAC, 'b'.repeat(64), other, false), [{ to: 'devices', c: 'b'.repeat(64), ids: [MAC], signal: { id: other.id, kind: 'end', reason: 'busy' } }]);
  // Hung up there: to the contact.
  assert.deepEqual(calls.device(DELL, C, end('hangup'), false), [{ to: 'contact', c: C, signal: end('hangup') }]);
  assert.equal(calls.busy(), false);
  // A device unlinked during its call: the call ends for the contact.
  calls.device(DELL, C, offer, false);
  assert.deepEqual(calls.unlinked(DELL), [{ to: 'contact', c: C, signal: end('hangup') }]);
  // While the phone is in a call of its own, nothing rings on the devices.
  assert.deepEqual(calls.contact(C, offer, [DELL], true), []);
  assert.deepEqual(calls.device(DELL, C, offer, true), [{ to: 'devices', c: C, ids: [DELL], signal: end('busy') }]);
});

test('a call no one answered is let go after ringing; one someone has after hours', () => {
  const calls = new LinkedCalls();
  calls.contact(C, offer, [DELL], false, 0);
  assert.deepEqual(calls.device(DELL, C, answer, false, 80_000), [{ to: 'done', ids: [DELL], id: ID, declined: false }]);
  calls.contact(C, offer, [DELL], false, 100_000);
  calls.device(DELL, C, answer, false, 101_000);
  assert.equal(calls.busy(102_000), true);
  assert.equal(calls.busy(101_000 + 13 * 60 * 60_000), false);
});

test('a call answered on another device stops here quietly, and says so in its line', () => {
  const { rtc } = fakeRtc();
  const sent: CallSignal[] = [];
  const options = { peer: `contact:${C}`, relay: null, rtc, events: { onChange: () => undefined, send: async (signal: CallSignal) => void sent.push(signal) } };
  const ringing = Call.incoming({ ...offer, at: Date.now() }, options)!;
  ringing.endedElsewhere(false);
  assert.deepEqual(ringing.ended, { reason: 'hangup', byUs: true, elsewhere: true });
  // Only that it rang was said; the device that answered said the rest.
  assert.deepEqual(sent, [{ id: ID, kind: 'ringing' }]);
  assert.equal(currentCall(), null);
  assert.equal(endedLine(ringing), 'Voice call, answered on another device');
  assert.equal(shownLine(`📞 ${endedLine(ringing)}`), '📞 Voice call, answered on another device');

  const declined = Call.incoming({ ...offer, id: '1111111111111111', video: true, at: Date.now() }, options)!;
  declined.endedElsewhere(true);
  assert.equal(endedLine(declined), 'Video call, turned down');
  // Our own call is not stopped so.
  const ours = Call.start({ ...options, video: false });
  ours.endedElsewhere(false);
  assert.equal(ours.state, 'calling');
  ours.hangUp();
});
