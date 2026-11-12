<!--
SPDX-FileCopyrightText: 2026 azzinder
SPDX-License-Identifier: AGPL-3.0-or-later
Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.
-->

# Editions: Erevos+ and Erevos

One codebase gives two editions of the app. They are the same package (`app.erevos`) with the
same release key and the same data, so a phone can go from one to the other as an ordinary
update and keeps everything.

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

## Moving between them

- Erevos+ → Erevos: the chats, accounts and settings of the other networks stay on the phone,
  unused. Nothing is deleted.
- Erevos → Erevos+: they are there again; modules the plain Erevos did not have are on.
