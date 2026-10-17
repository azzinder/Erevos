// Builds the Erevos core (crates/erevos-ffi) to WebAssembly for the checks under Node, into
// checks/.core, which git leaves out. Needs Rust's wasm32-unknown-unknown target and
// wasm-bindgen-cli at the version erevos-ffi pins:
//   rustup target add wasm32-unknown-unknown
//   cargo install wasm-bindgen-cli --version 0.2.129
// Run with: node checks/build-core.mjs
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../..', import.meta.url));
const out = fileURLToPath(new URL('./.core', import.meta.url));
const run = (command, args) => execFileSync(command, args, { cwd: root, stdio: 'inherit' });

run('cargo', ['build', '--release', '--target', 'wasm32-unknown-unknown', '-p', 'erevos-ffi', '--features', 'web']);
run('wasm-bindgen', [
  '--target',
  'nodejs',
  '--out-dir',
  out,
  'target/wasm32-unknown-unknown/release/erevos_ffi.wasm',
]);
