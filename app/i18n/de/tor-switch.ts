// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// The «Through Tor» switch of a feature and what it says (components/tor-switch.tsx, lib/net-http.ts) in German (i18n/de/index.ts).
export const torSwitch: Record<string, string> = {
  "This goes only through Tor, which this build of Erevos does not have.": "Das läuft nur über Tor, das diese Erevos-Version nicht hat.",
  "Through Tor: the server does not see this phone's internet address. It is slower, and waits while Tor starts.": "Über Tor: Der Server sieht die Internetadresse dieses Telefons nicht. Es ist langsamer und wartet, während Tor startet.",
  "This build of Erevos has no Tor, so with this on nothing goes to the server.": "Diese Erevos-Version hat kein Tor, daher geht bei eingeschaltetem Schalter nichts an den Server.",
  "Straight: the server sees this phone's internet address.": "Direkt: Der Server sieht die Internetadresse dieses Telefons.",
  "This space sends everything through Tor, so this goes through Tor too: the server does not see this phone's internet address.": "Dieser Bereich schickt alles über Tor, also geht auch das über Tor: Der Server sieht die Internetadresse dieses Telefons nicht.",
  "As this space's Tor setting says: through Tor while Tor is ready, straight while it starts or fails, and then the server sees this phone's internet address.": "Wie die Tor-Einstellung dieses Bereichs es sagt: über Tor, solange Tor bereit ist, direkt, solange es startet oder scheitert, und dann sieht der Server die Internetadresse dieses Telefons.",
};
