// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// Change my voice (lib/voice-change.ts): the setting as kept, and the core changing a voice's
// samples, the same length, the pitch moved (crates/erevos-core/src/voice_shift.rs).

import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { after, before, test } from 'node:test';

import { setCore, type Core } from '../lib/core';
import { changeSamples, checkedVoice, coreChangesVoice, floatsToPcm, pcmToFloats, VOICE_KINDS } from '../lib/voice-change';

test('only a voice Erevos knows is kept', () => {
  for (const kind of VOICE_KINDS) assert.equal(checkedVoice(kind), kind);
  for (const bad of ['robot', '', 1, null, undefined, {}]) assert.equal(checkedVoice(bad), undefined);
});

test('samples go to 16 bits and back', () => {
  const floats = Float32Array.from([0, 0.5, -0.5, 1, -1, 2, -2]);
  const back = pcmToFloats(floatsToPcm(floats));
  assert.equal(back.length, floats.length);
  for (const [i, want] of [0, 0.5, -0.5, 1, -1, 1, -1].entries()) assert.ok(Math.abs(back[i] - want) < 0.001, `${i}: ${back[i]}`);
});

const built = new URL('./.core/erevos_ffi.js', import.meta.url);
const coreReady = existsSync(built) && typeof (createRequire(import.meta.url)(built.pathname) as Record<string, unknown>).voiceChange === 'function';
if (!coreReady) console.log('Skipping the voice change in the core: build the core first with node checks/build-core.mjs');

before(() => {
  if (!coreReady) return;
  const wasm = createRequire(import.meta.url)(built.pathname) as Record<string, (...args: never[]) => unknown>;
  setCore(Object.fromEntries(Object.entries(wasm).map(([name, fn]) => [name, async (...args: never[]) => fn(...args)])) as unknown as Core);
});

after(() => setCore(null));

// How often a sound crosses zero going up, a second: a tone's pitch.
function pitch(samples: Float32Array, rate: number): number {
  const middle = samples.subarray(samples.length / 4, (samples.length * 3) / 4);
  let ups = 0;
  for (let i = 1; i < middle.length; i++) if (middle[i - 1] < 0 && middle[i] >= 0) ups++;
  return (ups * rate) / middle.length;
}

test('the core changes a voice, the same length, higher or deeper', { skip: !coreReady }, async () => {
  assert.ok(coreChangesVoice());
  const rate = 48_000;
  const tone = Float32Array.from({ length: rate }, (_, i) => 0.3 * Math.sin((2 * Math.PI * 220 * i) / rate));
  const pcm = floatsToPcm(tone);
  const deeper = pcmToFloats(await changeSamples(pcm, rate, 'deeper'));
  const higher = pcmToFloats(await changeSamples(pcm, rate, 'higher'));
  assert.equal(deeper.length, tone.length);
  assert.equal(higher.length, tone.length);
  assert.ok(pitch(deeper, rate) < 200 && pitch(deeper, rate) > 150, `deeper: ${pitch(deeper, rate)} Hz`);
  assert.ok(pitch(higher, rate) > 260 && pitch(higher, rate) < 320, `higher: ${pitch(higher, rate)} Hz`);
  // Odd bytes are not samples: refused, never sent as they were.
  await assert.rejects(changeSamples(pcm.subarray(1), rate, 'deeper'));
});
