# Reproducible builds

Whether a file Erevos publishes can be built again from the source and come out the same, byte for
byte, so that anyone can check that it was built from the code it says, and nothing else.

## Where it stands

| What | Reproducible | Checked how |
| --- | --- | --- |
| **Web app** (`erevos-web.tar.gz`, what the release key signs and the web server serves) | Yes | `scripts/reproduce-web.sh`. The published 3.3.2 came out the same, all 78 files, built again on another machine on 2026-10-26. |
| **Desktop apps** (Linux, Windows, macOS) | Their app inside is the same web build; the packages around it are not checked yet | |
| **Android APK** | Not known yet: prepared, not yet tried | `scripts/reproduce-apk.sh`, or on GitHub `.github/workflows/reproduce-apk.yml` (by hand). |
| **Sailfish RPM** | Not yet | |
| **Relay** | Not checked; whoever runs one builds it from the source anyway | |

While the repository is private, only those with access to it can build from the source. The
check needs no secret: the public download repository has everything else.

## Check the web app

On Linux, with git, Node 22, rustup and wasm-bindgen-cli at the version `crates/erevos-ffi` pins:

    scripts/reproduce-web.sh 3.3.2 https://erevos-web.lphl.nekten.eu

It downloads that release's web app, checks it against the release's `SHA256SUMS`, builds the
commit it names with the same steps as `.github/workflows/release.yml`, and compares every file's
SHA-256 with the published one and with the `release.json` the server gives out. That
`release.json` is the list the release key signs, which `node pwa/release.mjs verify <address>`
checks; so the two together tie what the server serves to the source.

## Check the Android app

    scripts/reproduce-apk.sh 3.3.2 [folder to build in]

It downloads that release's APK, checks it against `SHA256SUMS`, builds the commit `version.json`
names, unsigned (`EREVOS_UNSIGNED=1`, see `app/plugins/with-release-signing.js`), with the same
steps as the release's apk job, then copies the published APK's signature onto it with
`apksigcopier compare`: the signature verifies only if every other byte is the same. It needs
what that job needs (Node 22, Java 21, rustup with cargo-ndk, Go, the Android SDK) and
apksigcopier. React Native's modules are C++ built with CMake, which keeps the folder it was built
in, so build in the folder GitHub's runner used, `/home/runner/work/Erevos/Erevos`. The workflow
`reproduce-apk` does all this on a fresh GitHub runner, started by hand; it uses about as many
Actions minutes as a release's Android build.

## What makes it the same

- **One Rust**: `rust-toolchain.toml` names the exact version. It moves forward by hand.
- **No machine paths in the core**: `app/scripts/build-web-core.mjs` maps Cargo's folder and the
  checkout to fixed names (`--remap-path-prefix`). Releases built before that hold
  `/home/runner/.cargo`, GitHub's, in their core's panic messages; the script builds those with
  `CARGO_HOME` there, which needs that folder to be writable.
- **No machine paths in the Android core**: `app/modules/erevos-core/android/build.gradle` maps
  Cargo's folder, the checkout and the NDK to fixed names, for Rust and for the C that build
  scripts compile. Lyrebird (Go) is built with `-trimpath` and no build id.
- **Locked packages**: `npm ci` from `app/package-lock.json`, `cargo` from `Cargo.lock`.
- **The inputs a release names**: its number and build (`EREVOS_VERSION`, `EREVOS_BUILD`, which
  the app shows) and the web app's release number (`--version` of `pwa/build.mjs`), all read back
  from the release itself.
- `release.json` says when it was made (`created`), the one field that differs from build to
  build; the check compares the files it lists, not that field.

## Next

Run `reproduce-apk` on a published release and fix what differs. Then the desktop packages and
the Sailfish RPM.
