// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// The «Through Tor» switch of a feature and what it says (components/tor-switch.tsx, lib/net-http.ts) in French (i18n/fr/index.ts).
export const torSwitch: Record<string, string> = {
  "This goes only through Tor, which this build of Erevos does not have.": "Cela passe uniquement par Tor, que cette version d’Erevos n’a pas.",
  "Through Tor: the server does not see this phone's internet address. It is slower, and waits while Tor starts.": "Par Tor : le serveur ne voit pas l’adresse internet de ce téléphone. C’est plus lent, et cela attend pendant le démarrage de Tor.",
  "This build of Erevos has no Tor, so with this on nothing goes to the server.": "Cette version d’Erevos n’a pas Tor : activé, rien ne part vers le serveur.",
  "Straight: the server sees this phone's internet address.": "Direct : le serveur voit l’adresse internet de ce téléphone.",
  "This space sends everything through Tor, so this goes through Tor too: the server does not see this phone's internet address.": "Cet espace envoie tout par Tor, donc cela passe aussi par Tor : le serveur ne voit pas l’adresse internet de ce téléphone.",
  "As this space's Tor setting says: through Tor while Tor is ready, straight while it starts or fails, and then the server sees this phone's internet address.": "Comme le dit le réglage Tor de cet espace : par Tor tant que Tor est prêt, en direct pendant son démarrage ou s’il échoue, et alors le serveur voit l’adresse internet de ce téléphone.",
};
