// Builds the Erevos core (crates/erevos-ffi) to WebAssembly for the web and desktop builds, into
// public/core, which git leaves out; public/core/load.js loads it beside the app. Needs what
// checks/build-core.mjs needs: Rust's wasm32-unknown-unknown target and wasm-bindgen-cli at the
// version erevos-ffi pins. Run with: node scripts/build-web-core.mjs
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../..', import.meta.url));
const out = fileURLToPath(new URL('../public/core', import.meta.url));
const run = (command, args) => execFileSync(command, args, { cwd: root, stdio: 'inherit' });

run('cargo', ['build', '--release', '--target', 'wasm32-unknown-unknown', '-p', 'erevos-ffi', '--features', 'web']);
run('wasm-bindgen', ['--target', 'web', '--no-typescript', '--out-dir', out, 'target/wasm32-unknown-unknown/release/erevos_ffi.wasm']);
