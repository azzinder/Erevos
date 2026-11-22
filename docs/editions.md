<!--
SPDX-FileCopyrightText: 2026 azzinder
SPDX-License-Identifier: AGPL-3.0-or-later
Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.
-->

# Editions: Erevos+ and Erevos

One codebase gives the editions of the app. Each is an app of its own, signed with the same
release key: Erevos is `app.erevos`, Erevos+ `app.erevos.plus` (from 3.1.0; its 7.x were
`app.erevos`), and Erevos Lite, to come, `app.erevos.lite`. So they can be side by side on a
phone, each with its own data, and going from one to another is a move, not an update (below).

| Edition | `EREVOS_EDITION` | Modules |
|---|---|---|
| **Erevos+** | `plus` (default) | Erevos, Phone, SMS, Collection, Nostr, Matrix, XMPP, and the other networks as they come in (Telegram, Messenger, Signal, Session) |
| **Erevos** | `lite` | Erevos, Phone, SMS, Collection |

## What the edition changes

- `app/app.config.js` reads `EREVOS_EDITION`; `lite` is kept as `extra.edition` (`app/lib/edition.ts`). The name
  under the icon is the edition's: **Erevos+**, or **Erevos** for the plain one.
- `app/lib/modules.ts`: `modulesHere()` gives only the edition's modules, so the first start,
  Settings → Modules, the home screen and the menus offer nothing else. A module the plain Erevos
  does not have is never part of a choice made there (`known`), so it is on after moving to Erevos+.
- The core (`crates/erevos-ffi`): Matrix, XMPP and chats with other Nostr apps are behind the
  `networks` feature. `app/modules/erevos-core/android/build.gradle` builds it without them when
  `EREVOS_EDITION=lite`; asked anyway, they answer that they are in Erevos+. Nostr for Erevos's own
  messages (relays carrying sealed packets) is in both.

## In a browser

Each edition has a web app of its own (`pwa/build.mjs --edition`, by default `EREVOS_EDITION`):

| Edition | Web app (`release.json` `app`) | Address | Element Call | On the server |
|---|---|---|---|---|
| **Erevos+** | `erevosplus-web` | erevosplus-web.lphl.nekten.eu | erevosplus-call.lphl.nekten.eu | `/var/www/erevosplus-web` |
| **Erevos** | `erevos-web` | erevos-web.lphl.nekten.eu | none (`--no-element-call`) | `/var/www/erevos-web` |

Different addresses are different origins, so the browser keeps their data apart, and a worker
(`pwa/sw.js`) takes only releases of its own web app, even though one key signs both. In a browser
Erevos+ has Erevos, Matrix (with calls), XMPP (on servers with a WebSocket), Nostr and the
Collection; the Phone, the SMS, Telegram, Messenger, Signal and Session need Android.

## Moving between them

Updates (`app/updates.tsx`) offers **Erevos Lite**, **Erevos** and **Erevos+**. A release of the
edition installed is an update. Another edition's is a move (`app/lib/edition-move.ts`,
`modules/erevos-device` `Move.kt`):

1. The edition moved from makes a backup for the move (as Backups does, `lock/backup.ts`) into its
   own folder for moves, with a random password kept beside it in `move.json`, then downloads the
   other edition's APK from its channel (`app/lib/updates.ts`), checks its size, SHA-256 and the
   release computer's signature, and Android installs it beside this one. If the other is on the
   phone already, nothing downloads.
2. The edition moved to, at its first start, finds the move through Android: Move.kt's provider
   (`<package>.move`) answers only an app signed with its own key (`checkSignatures`), and Android
   11 and later show the other editions only to an app that names them (`<queries>`). It copies the
   files, restores the backup and tells the other, which deletes them. A move waits a day.
3. The phone's SMS and calls stay in Android's own stores; the edition moved to is made the SMS and
   phone app again, if wanted. The other edition stays until uninstalled.

What a module the edition moved to does not have stays in its data, unused, and is there again
after a move back. A build signed with another key (F-Droid's) cannot take a move: Backups does
the same by hand.

Each edition reads its own releases: Erevos and Erevos+ in `azzinder/erevos-releases` (Erevos+
under `channel-plus`), Erevos Lite in `azzinder/erevos-lite-releases`. `version.json` says the
release's Android app (`package`); for older ones `packageOf` (`app/lib/update-channel.ts`) knows it.
