// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// Builds the Erevos core (crates/erevos-ffi) to WebAssembly for the web and desktop builds, into
// public/core, which git leaves out; public/core/load.js loads it beside the app. Needs what
// checks/build-core.mjs needs: Rust's wasm32-unknown-unknown target and wasm-bindgen-cli at the
// version erevos-ffi pins. Run with: node scripts/build-web-core.mjs
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../..', import.meta.url));
const out = fileURLToPath(new URL('../public/core', import.meta.url));
// Paths of this machine are left out of the core (they show in its panic messages), so the same
// commit builds the same file anywhere: docs/reproducible-builds.md.
const cargoHome = process.env.CARGO_HOME || path.join(os.homedir(), '.cargo');
const remap = [`--remap-path-prefix=${cargoHome}=/cargo`, `--remap-path-prefix=${root.replace(/\/$/, '')}=/erevos`];
const env = { ...process.env, CARGO_ENCODED_RUSTFLAGS: remap.join('\x1f') };
const run = (command, args) => execFileSync(command, args, { cwd: root, stdio: 'inherit', env });

// The plain Erevos (EREVOS_EDITION=lite, docs/editions.md) has no Matrix, XMPP or chats with other
// Nostr apps in its core; Erevos+, the default, has them.
const lite = process.env.EREVOS_EDITION === 'lite';
run('cargo', ['build', '--release', '--target', 'wasm32-unknown-unknown', '-p', 'erevos-ffi', '--features', lite ? 'web' : 'web,networks']);
run('wasm-bindgen', ['--target', 'web', '--no-typescript', '--experimental-reset-state-function', '--out-dir', out, 'target/wasm32-unknown-unknown/release/erevos_ffi.wasm']);
