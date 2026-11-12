// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// Where a call's sound goes (lib/call-sound.ts): the call screen's Speaker stays as it was with no
// headset, and with one names where the sound goes, a Bluetooth headset by its own name.
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { headsetIn, readCallSound, soundInHeadset, soundName, soundShort } from '../lib/call-sound';
import type { CallOutput } from '../modules/erevos-call';
import { sound } from './call-audio-memory';

const earpiece: CallOutput = { id: '1', kind: 'earpiece', name: '' };
const speaker: CallOutput = { id: '2', kind: 'speaker', name: '' };
const wired: CallOutput = { id: '3', kind: 'wired', name: '' };
const buds: CallOutput = { id: '4', kind: 'bluetooth', name: 'Pixel Buds' };
const unnamed: CallOutput = { id: '5', kind: 'bluetooth', name: '' };

test('a headset, wired or Bluetooth, makes Speaker a choice of where the sound goes', () => {
  assert.equal(headsetIn([earpiece, speaker]), false);
  assert.equal(headsetIn([earpiece, speaker, wired]), true);
  assert.equal(headsetIn([earpiece, speaker, buds]), true);
  assert.equal(headsetIn([]), false);
});

test('each is named shortly on the round button, and a Bluetooth headset by its name in the list', () => {
  assert.deepEqual([earpiece, speaker, wired, buds].map(soundShort), ['Phone', 'Speaker', 'Headphones', 'Bluetooth']);
  assert.equal(soundName(buds), 'Pixel Buds');
  assert.equal(soundName(unnamed), 'Bluetooth');
  assert.equal(soundName(earpiece), 'Phone');
});

test('the camera turned on leaves the sound in a headset, not on the loudspeaker', () => {
  assert.equal(soundInHeadset({ outputs: [earpiece, speaker, buds], current: buds }), true);
  assert.equal(soundInHeadset({ outputs: [earpiece, speaker, wired], current: wired }), true);
  assert.equal(soundInHeadset({ outputs: [earpiece, speaker], current: earpiece }), false);
  assert.equal(soundInHeadset({ outputs: [], current: null }), false);
});

test('where the sound goes is read from the phone, and nothing where it cannot say', () => {
  sound.outputs = [];
  sound.current = null;
  assert.deepEqual(readCallSound(), { outputs: [], current: null });
  assert.equal(soundInHeadset(), false);
  sound.outputs = [earpiece, speaker, buds];
  sound.current = '4';
  assert.deepEqual(readCallSound(), { outputs: [earpiece, speaker, buds], current: buds });
  assert.equal(soundInHeadset(), true);
  // One the phone names but no longer lists (a headset just gone): not known.
  sound.current = '9';
  assert.equal(readCallSound().current, null);
});
