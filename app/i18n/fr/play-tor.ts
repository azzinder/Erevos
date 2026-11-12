// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// The Collection's Play through Tor for its radio stations and TV channels (app/collection-settings.tsx, components/collection-radio.tsx, collection-tv.tsx, lib/collection-play.ts) in French (i18n/fr/index.ts).
export const playTor: Record<string, string> = {
  "Stations and channels play through Tor, so they do not see this device’s IP address.": "Les stations et les chaînes sont lues par Tor, donc elles ne voient pas l’adresse IP de cet appareil.",
  "Stations and channels see this device’s IP address while they play.": "Les stations et les chaînes voient l’adresse IP de cet appareil pendant la lecture.",
  "Stations play from their https links, through Tor, so the station does not see this device’s IP address.": "Les stations se lisent depuis leurs liens https, par Tor, donc la station ne voit pas l’adresse IP de cet appareil.",
  "Channels play from their https links, through Tor, so the channel does not see this device’s IP address. Through Tor a channel may start slowly or stall for a moment. There is no programme guide.": "Les chaînes se lisent depuis leurs liens https, par Tor, donc la chaîne ne voit pas l’adresse IP de cet appareil. Par Tor, une chaîne peut démarrer lentement ou se figer un instant. Il n’y a pas de guide des programmes.",
  "Play through Tor": "Lire par Tor",
  "Stations and channels play only through Tor, so they do not see this phone’s internet address. It is slower and waits while Tor starts, and TV may stall for a moment.": "Les stations et les chaînes sont lues uniquement par Tor, donc elles ne voient pas l’adresse internet de ce téléphone. C’est plus lent, cela attend pendant le démarrage de Tor, et la TV peut se figer un instant.",
  "This build of Erevos has no Tor, so with this on, stations and channels do not play.": "Cette version d’Erevos n’a pas Tor : activé, les stations et les chaînes ne sont pas lues.",
  "This space sends everything through Tor, so stations and channels play through Tor too, and do not see this phone’s internet address.": "Cet espace envoie tout par Tor, donc les stations et les chaînes sont aussi lues par Tor et ne voient pas l’adresse internet de ce téléphone.",
  "Stations and channels play straight and see this phone’s internet address while they play. Erevos says so before the first one plays.": "Les stations et les chaînes sont lues en direct et voient l’adresse internet de ce téléphone pendant la lecture. Erevos le dit avant la première lecture.",
  "This build of Erevos has no Tor, so with Play through Tor on, stations and channels do not play.": "Cette version d’Erevos n’a pas Tor : avec Lire par Tor activé, les stations et les chaînes ne sont pas lues.",
  "Stations and channels play through Tor only on the phone, so with Tor on for them they do not play here.": "Les stations et les chaînes ne sont lues par Tor que sur le téléphone : avec Tor activé pour elles, elles ne sont pas lues ici.",
};
