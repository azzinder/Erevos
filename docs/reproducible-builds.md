# Reproducible builds

Whether a file Erevos publishes can be built again from the source and come out the same, byte for
byte, so that anyone can check that it was built from the code it says, and nothing else.

## Where it stands

| What | Reproducible | Checked how |
| --- | --- | --- |
| **Web app** (`erevos-web.tar.gz`, what the release key signs and the web server serves) | Yes | `scripts/reproduce-web.sh`. The published 3.3.2 came out the same, all 78 files, built again on another machine on 2026-10-26. |
| **Desktop apps** (Linux, Windows, macOS) | Their app inside is the same web build; the packages around it are not checked yet | |
| **Android APK** | Not yet | |
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

## What makes it the same

- **One Rust**: `rust-toolchain.toml` names the exact version. It moves forward by hand.
- **No machine paths in the core**: `app/scripts/build-web-core.mjs` maps Cargo's folder and the
  checkout to fixed names (`--remap-path-prefix`). Releases built before that hold
  `/home/runner/.cargo`, GitHub's, in their core's panic messages; the script builds those with
  `CARGO_HOME` there, which needs that folder to be writable.
- **Locked packages**: `npm ci` from `app/package-lock.json`, `cargo` from `Cargo.lock`.
- **The inputs a release names**: its number and build (`EREVOS_VERSION`, `EREVOS_BUILD`, which
  the app shows) and the web app's release number (`--version` of `pwa/build.mjs`), all read back
  from the release itself.
- `release.json` says when it was made (`created`), the one field that differs from build to
  build; the check compares the files it lists, not that field.

## Next

The Android APK: the native parts (the Rust core, Tor's transports in Go, React Native's C++) need
fixed paths and dates too, and the comparison has to leave out the signature, as F-Droid does.
