// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// The «Through Tor» switch of a feature and what it says (components/tor-switch.tsx, lib/net-http.ts) in Spanish (i18n/es/index.ts).
export const torSwitch: Record<string, string> = {
  "This goes only through Tor, which this build of Erevos does not have.": "Esto va solo por Tor, que esta versión de Erevos no tiene.",
  "Through Tor: the server does not see this phone's internet address. It is slower, and waits while Tor starts.": "Por Tor: el servidor no ve la dirección de internet de este teléfono. Es más lento y espera mientras Tor arranca.",
  "This build of Erevos has no Tor, so with this on nothing goes to the server.": "Esta versión de Erevos no tiene Tor, así que con esto activado no va nada al servidor.",
  "Straight: the server sees this phone's internet address.": "Directo: el servidor ve la dirección de internet de este teléfono.",
  "This space sends everything through Tor, so this goes through Tor too: the server does not see this phone's internet address.": "Este espacio envía todo por Tor, así que esto también va por Tor: el servidor no ve la dirección de internet de este teléfono.",
  "As this space's Tor setting says: through Tor while Tor is ready, straight while it starts or fails, and then the server sees this phone's internet address.": "Como dice el ajuste de Tor de este espacio: por Tor mientras Tor esté listo, directo mientras arranca o falla, y entonces el servidor ve la dirección de internet de este teléfono.",
};
