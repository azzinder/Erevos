// What the phone plays for the space's calls (lib/call-ringing.ts): a ring stops only for the call
// it rang for, an end plays once for each call, a group's changes while its ended call shows play
// nothing again, and a call of the space that comes ends a hidden call that rings, before it rings.
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ringKeeper } from '../lib/call-ringing';

function phone() {
  const played: string[] = [];
  let hidden = false;
  const keeper = ringKeeper(
    {
      ring: (video, chat) => void played.push(`ring ${video ? 'video' : 'voice'} ${chat}`),
      start: (video) => void played.push(`start ${video ? 'video' : 'voice'}`),
      stopRinging: () => void played.push('stopRinging'),
      stop: () => void played.push('stop'),
      showOverLock: (on) => void played.push(`overLock ${on}`),
    },
    {
      ringing: () => hidden,
      end: () => {
        hidden = false;
        played.push('hidden ended');
      },
    },
  );
  return { keeper, played, ringHidden: () => void (hidden = true), hidden: () => hidden };
}

test('a contact\'s call that comes while a hidden call rings ends that ring first; turned down, its ring stops once, and its end plays once', () => {
  const p = phone();
  p.ringHidden();
  const call = { video: false, state: 'incoming', outgoing: false };
  p.keeper.contact(call, 'chat:aa');
  assert.deepEqual(p.played, ['hidden ended', 'ring voice chat:aa']);
  assert.equal(p.hidden(), false);
  call.state = 'ended';
  p.keeper.contact(call, 'chat:aa');
  p.keeper.contact(call, 'chat:aa');
  // Its screen closes: nothing more, nor for a hidden ring that came meanwhile.
  p.ringHidden();
  p.keeper.contact(null, '');
  assert.deepEqual(p.played, ['hidden ended', 'ring voice chat:aa', 'stopRinging', 'stop', 'overLock false']);
  assert.equal(p.hidden(), true);
});

test('ours starts its sound at once, and stops no ring it did not start', () => {
  const p = phone();
  const call = { video: true, state: 'calling', outgoing: true };
  p.keeper.contact(call, '');
  call.state = 'connected';
  p.keeper.contact(call, '');
  assert.deepEqual(p.played, ['start video']);
});

test('a group\'s call: changes while its ended call shows play nothing again, and one that comes ends a hidden ring', () => {
  const p = phone();
  const call = { video: false, state: 'incoming' };
  p.ringHidden();
  p.keeper.group(call, 'group:g', false);
  assert.deepEqual(p.played, ['hidden ended', 'ring voice group:g']);
  call.state = 'ended';
  p.keeper.group(call, 'group:g', false);
  p.keeper.group(call, 'group:g', false);
  p.keeper.group(null, '', false);
  assert.deepEqual(p.played, ['hidden ended', 'ring voice group:g', 'stopRinging', 'stop', 'overLock false']);
  // One that ends while a contact's call goes on plays nothing of its end.
  const other = phone();
  const joined = { video: false, state: 'in' };
  other.keeper.group(joined, '', false);
  joined.state = 'ended';
  other.keeper.group(joined, '', true);
  assert.deepEqual(other.played, ['start voice']);
});
