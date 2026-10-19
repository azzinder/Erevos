# erevos-core

Expo native module that puts the Erevos core (Rust, `crates/erevos-ffi`) into the Android app:
PQXDH with ML-KEM-768 to start a conversation, and the double ratchet for every message. The
JavaScript side is `lib/core.ts`, and `lib/e2e.ts` builds the chat's encryption on it.

The core keeps nothing between calls. Every call takes byte arrays and gives byte arrays back,
and the app keeps the results sealed (`lock/e2e-data.ts`). The same calls are built to
WebAssembly for the checks under Node (`checks/build-core.mjs`).

## Building

`android/build.gradle` runs `cargo ndk` before the module builds, for the ABIs of the build
(`reactNativeArchitectures`), and the app carries `liberevos_ffi.so` for each. So the build
computer needs, once:

```
sudo pacman -S rustup
rustup default stable
rustup target add aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android
cargo install cargo-ndk
```

On Arch, `rustup` replaces the `rust` package. Other systems install rustup from rustup.rs. A
debug build for one phone needs only that phone's target (`aarch64-linux-android` for current
phones), and a release build all four. The NDK is the one the rest of the app already uses.

Without them the build stops with a message that points here. A build made before this module
existed has no core: the chat then says it cannot encrypt, and leaves the relay alone.

Tor bridges also need Go, 1.26 or later, once (`sudo pacman -S go`, or go.dev/dl). The build then
builds lyrebird, Tor's pluggable transports (obfs4, Snowflake, WebTunnel, meek), from
`transports/go.mod` at the top of the repository, with the NDK's compiler for each ABI, and the
app carries it as `liblyrebird.so`. It is a program Tor starts, so Android must unpack the native
libraries on install (`plugins/with-native-programs.js`). Go fetches what lyrebird is built from
through proxy.golang.org, checked against `transports/go.sum`.

## Not done

- Written without an Android SDK, so the first compile is on a build computer.
- Calls run off the JavaScript thread, one after another per chat (`lib/e2e.ts`).
- Not audited.
