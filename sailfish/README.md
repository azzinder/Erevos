# Erevos for Sailfish OS

The app's web build, with its core in WebAssembly, shown by Sailfish WebView (Gecko) in a Silica
window. The code is installed with the package; nothing is fetched from a server.

## How it fits together

- `src/shellserver.cpp`: a small HTTP server on `127.0.0.1:47823`, inside the app. It serves the
  web build from `/usr/share/erevos/web` and gives the page what a browser cannot, with the same
  protocol as the desktop app (`desktop/main.js`): `/__secret` (the keystore), `/__file` and
  `/__files` (the sealed files), `/__folder` and `/__backup` (backups, into `Documents/Erevos`)
  and `/__save` (into Downloads). Each start makes a new random token, passed to the page in the
  address's `#` part; every `/__` request must carry it, and the `Host` must be the server's own,
  so other apps and web pages on the phone get nothing. Data goes to `~/.local/share/erevos`,
  written with QSaveFile, readable by the user only.
- `qml/erevos.qml`: one page with the WebView; the app draws its own screens.
- `polyfills.js`: what the web build uses and Gecko 91 lacks, loaded first.
- `app/lib/shell.ts`: the app knows it runs here from `EXPO_PUBLIC_SHELL=sailfish` at build time.

What it does not do: the nearby link and SMS (Android only), notifications while closed. Sailfish
has no keyring for apps, so the keystore is kept as it is: the password lock seals it.

## Build

On Linux, with Node, Rust with the `wasm32-unknown-unknown` target and wasm-bindgen-cli 0.2.129:

    sailfish/build-web.sh

Then the RPM, with the Sailfish SDK's build image (Docker):

    cd sailfish
    docker run --rm -v "$PWD:/home/mersdk/src" -w /home/mersdk/src \
      coderus/sailfishos-platform-sdk-aarch64:5.0.0.43 \
      bash -lc 'mb2 -t SailfishOS-5.0.0.43-aarch64 build'

The package is `RPMS/erevos-<version>-1.aarch64.rpm`. `.github/workflows/sailfish.yml` does the
same on main.

## Install on the phone

Settings → Untrusted software → allow it; copy the RPM to the phone and tap it in Files, or in a
terminal (Developer mode): `pkcon install-local erevos-<version>-1.aarch64.rpm`.

## Tested

Built with the SDK for Sailfish OS 5.0.0.43 (aarch64). The server's endpoints were checked with
curl (wrong token, wrong Host, paths outside its folders), and the page it serves chatted through a
relay with a browser in Firefox 91, the Gecko of Sailfish WebView, including after a restart. Not
yet on a phone.
