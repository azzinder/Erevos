// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// The «Through Tor» switch of a feature and what it says (components/tor-switch.tsx, lib/net-http.ts) in Italian (i18n/it/index.ts).
export const torSwitch: Record<string, string> = {
  "This goes only through Tor, which this build of Erevos does not have.": "Questo passa solo tramite Tor, che questa versione di Erevos non ha.",
  "Through Tor: the server does not see this phone's internet address. It is slower, and waits while Tor starts.": "Tramite Tor: il server non vede l’indirizzo internet di questo telefono. È più lento e aspetta mentre Tor si avvia.",
  "This build of Erevos has no Tor, so with this on nothing goes to the server.": "Questa versione di Erevos non ha Tor, quindi con questo attivo non va nulla al server.",
  "Straight: the server sees this phone's internet address.": "Diretto: il server vede l’indirizzo internet di questo telefono.",
  "This space sends everything through Tor, so this goes through Tor too: the server does not see this phone's internet address.": "Questo spazio manda tutto tramite Tor, quindi anche questo passa tramite Tor: il server non vede l’indirizzo internet di questo telefono.",
  "As this space's Tor setting says: through Tor while Tor is ready, straight while it starts or fails, and then the server sees this phone's internet address.": "Come dice l’impostazione Tor di questo spazio: tramite Tor finché Tor è pronto, in modo diretto mentre si avvia o fallisce, e allora il server vede l’indirizzo internet di questo telefono.",
};
