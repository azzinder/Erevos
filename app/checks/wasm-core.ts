// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';

import { setCore, type Core } from '../lib/core';

// The Erevos core built to WebAssembly (checks/build-core.mjs), plugged in as the app plugs in its
// own: for checks that need it only for Argon2id, which in JavaScript is far slower. Null when it
// is not built: then those checks run the JavaScript one.
export function useWasmCore(): Core | null {
  const built = new URL('./.core/erevos_ffi.js', import.meta.url);
  if (!existsSync(built)) return null;
  const wasm = createRequire(import.meta.url)(built.pathname) as Record<string, (...args: never[]) => unknown>;
  // The WebAssembly calls return at once. The Android module's return promises.
  const core = Object.fromEntries(Object.entries(wasm).map(([name, call]) => [name, async (...args: never[]) => call(...args)])) as unknown as Core;
  setCore(core);
  return core;
}
