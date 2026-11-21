// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';

import { guardCore, isTrap, type WebCore } from '../lib/core-guard';

// The WebAssembly core's guard (lib/core-guard.ts): a trap inside it fails that call with a plain
// error and sets the core up again; an error the core answered with goes through as it is.

const trap = () => new WebAssembly.RuntimeError('unreachable');

test('a trap fails the call, and the core is set up again', async () => {
  let resets = 0;
  let broken = true;
  const core = guardCore({
    conversationOpen: () => {
      if (broken) {
        broken = false;
        throw trap();
      }
      return new Uint8Array([1]);
    },
    __wbg_reset_state: () => {
      resets++;
    },
  } as WebCore) as unknown as Record<string, (...args: unknown[]) => Promise<unknown>>;
  await assert.rejects(core.conversationOpen(new Uint8Array(3)), { message: 'the Erevos core failed' });
  assert.equal(resets, 1);
  assert.deepEqual(await core.conversationOpen(new Uint8Array(3)), new Uint8Array([1]));
  assert.equal(resets, 1);
  assert.equal(core.__wbg_reset_state, undefined);
});

test("an error the core answered with goes through, and sets nothing up again", async () => {
  let resets = 0;
  const core = guardCore({
    conversationOpen: () => {
      throw new Error('packet is too short');
    },
    __wbg_reset_state: () => {
      resets++;
    },
  } as WebCore) as unknown as Record<string, (...args: unknown[]) => Promise<unknown>>;
  await assert.rejects(core.conversationOpen(new Uint8Array(3)), { message: 'packet is too short' });
  assert.equal(resets, 0);
  assert.equal(isTrap(trap()), true);
  assert.equal(isTrap(new Error('no')), false);
});

test('a core without the reset still fails the call plainly', async () => {
  const core = guardCore({ packetKind: () => { throw trap(); } } as WebCore) as unknown as Record<string, () => Promise<unknown>>;
  await assert.rejects(core.packetKind(), { message: 'the Erevos core failed' });
});

// The real core, built with the reset (node checks/build-core.mjs): set up again, it still works.
const built = new URL('./.core/erevos_ffi.js', import.meta.url);
const wasm = existsSync(built) ? (createRequire(import.meta.url)(built.pathname) as WebCore) : null;
test('the built core can be set up again, and works after', { skip: wasm ? false : 'build the core first with node checks/build-core.mjs' }, async () => {
  assert.equal(typeof wasm?.__wbg_reset_state, 'function');
  const core = guardCore(wasm as WebCore) as unknown as Record<string, (...args: unknown[]) => Promise<Uint8Array>>;
  const account = await core.accountNew();
  (wasm?.__wbg_reset_state as () => void)();
  const identity = await core.accountIdentity(account);
  assert.equal(identity.length, 32);
});
