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
- `watch/`: `erevos-watch`, the helper that waits at the relay while Erevos is not in front, or
  closed (below). `src/watchlink.cpp` is Erevos's side of it: the name `app.erevos` on D-Bus,
  with `show()` for a tap on a notice, and the list the page gives on `/__watch`.

- `src/lanlink.cpp`: Erevos on the same Wi-Fi or a hotspot, the protocol of the desktop app's
  `desktop/lan.js` and Android's `LanLink.kt` (UDP broadcasts `EVL1 <nonce> <port>` on port 47905, a
  new nonce each start, then TCP frames of text already end-to-end encrypted). The page turns it on
  and off, sends and hears on `/__lan`, as in the desktop app (`app/lib/radio.ts`), while a space
  is open and **Find Erevos on the same Wi-Fi** is on. Sailfish OS's own firewall (ConnMan) lets
  ports 1024–65535 in, UDP and TCP, so 47905 needs nothing
  ([Sailfish OS: Firewall](https://docs.sailfishos.org/Support/Help_Articles/Firewall/)). The RPM
  adds no rule of its own: a phone whose firewall was made stricter by hand lets it in on Wi-Fi only
  with a file `/etc/connman/firewall.d/50-erevos-firewall.conf`, then `systemctl reload connman`:

  ```
  [wifi]
  IPv4.INPUT.RULES = -p udp -m udp --dport 47905 -j ACCEPT; -p tcp -m tcp --dport 47905 -j ACCEPT
  ```

What it does not do: Bluetooth, Wi-Fi Aware, Wi-Fi Direct and SMS (Android only). Sailfish has no keyring for apps, so
the keystore is kept as it is: the password lock seals it.

## While Erevos is closed

With a space open, the page gives the shell, on `/__watch`, the queues the space reads on, each
relay's key once the relay proved it, and the words of the notices in the app's language
(`app/lib/shell-watch.ts`): no key of the space, no token, no name. The shell hands them over D-Bus
to `erevos-watch` (`app.erevos.watch`, `/app/erevos/watch`), which D-Bus starts as the systemd user
service `erevos-watch.service`, and says each time whether Erevos is in front. While it is not, or
is closed, the helper holds one connection per relay and 64 queues on the relay's `/read` path,
in a channel to the relay's key when it has one, and asks `NEWS_ANY` (opcode 30) for up to a
minute at a time. It never asks anything that takes a message: the app finds it all when it opens.

- Each connection's first answer is heard, not told of: what was there came while Erevos was in
  front, or before the connection was made. After that, what came is counted as the app counts it
  (`newsSince`), and one notice (category `x-erevos.message`) says how many, never who or what.
- A call whose ring the relay counts while the helper waits rings with the profile's ringtone
  (ngfd's `ringtone` event) and a notice of its own (`x-erevos.call`), for 45 seconds at most. The
  page does not ring then too (`page-ring.web.ts`).
- A tap on either calls `app.erevos` `show()`, which starts Erevos when it is not running
  (`data/app.erevos.service`).
- nemo-keepalive lets the phone sleep between answers and wakes it every 2½ minutes, to make again
  a connection that went quiet; a change of network makes them all again.
- The list is kept in memory only: locking the space takes it back, and after a restart the
  helper waits on nothing until Erevos opens the space.

To check it on a computer, build it with `qmake CONFIG+=watch_test` (Qt 5 and OpenSSL, no
Sailfish libraries): it then writes what it would show and ring, and `EREVOS_WATCH_TEST_CA` names
a certificate authority to trust beside the computer's, for a relay behind TLS there.

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
relay with a browser in Firefox 91, the Gecko of Sailfish WebView, including after a restart.
`erevos-watch`, in its build for a computer, was checked against `erevos-relay` over `ws://` and,
through a TLS proxy, `wss://`: counting, a call's ring, a relay that does not prove its key, a
relay that restarts, and with the shell's `/__watch` and D-Bus, starting it. Not yet on a phone:
sleep, battery, the profile's ringtone and a tap on the lock screen can only be seen there.
The same Wi-Fi: `lan-check/run.sh` builds the shell's server with Qt 5 on a computer (no Sailfish
libraries) and, through `/__lan` as the page asks, links it with `desktop/lan.js` over real UDP
broadcasts and TCP, both ways, UTF-8 too. The SDK build (Qt 5.6) and a phone's Wi-Fi and firewall
are not tried yet.
