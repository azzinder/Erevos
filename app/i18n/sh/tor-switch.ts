// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// The «Through Tor» switch of a feature and what it says (components/tor-switch.tsx, lib/net-http.ts) in Serbo-Croatian (i18n/sh/index.ts).
export const torSwitch: Record<string, string> = {
  "This goes only through Tor, which this build of Erevos does not have.": "Ovo ide samo preko Tora, kojeg ova verzija Erevosa nema.",
  "Through Tor: the server does not see this phone's internet address. It is slower, and waits while Tor starts.": "Preko Tora: server ne vidi IP adresu ovog telefona. Sporije je i čeka dok se Tor pokreće.",
  "This build of Erevos has no Tor, so with this on nothing goes to the server.": "Ova verzija Erevosa nema Tor, pa kad je ovo uključeno ništa ne ide na server.",
  "Straight: the server sees this phone's internet address.": "Direktno: server vidi IP adresu ovog telefona.",
  "This space sends everything through Tor, so this goes through Tor too: the server does not see this phone's internet address.": "Ovaj prostor šalje sve preko Tora, pa i ovo ide preko Tora: server ne vidi IP adresu ovog telefona.",
  "As this space's Tor setting says: through Tor while Tor is ready, straight while it starts or fails, and then the server sees this phone's internet address.": "Kako kaže Tor podešavanje ovog prostora: preko Tora dok je Tor spreman, direktno dok se pokreće ili ne uspije, i tada server vidi IP adresu ovog telefona.",
};
