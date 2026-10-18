// Loads the Erevos core, built to WebAssembly by scripts/build-web-core.mjs, for the web and
// desktop builds (lib/crypto-setup.ts), and tells the app once it is ready, or missing.
try {
  const core = await import('./erevos_ffi.js');
  await core.default({ module_or_path: new URL('./erevos_ffi_bg.wasm', import.meta.url) });
  globalThis.erevosCore = core;
} catch (error) {
  console.warn('The Erevos core did not load:', error);
}
dispatchEvent(new Event('erevos-core'));
