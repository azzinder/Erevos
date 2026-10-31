// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// The French of the notice that a new version is out, and of Updates around it (app/updates.tsx, app/index.tsx, lib/release-notice.ts) (i18n/fr/index.ts).
export const releaseNotice: Record<string, string> = {
  "Erevos asks GitHub for updates only when you tap the button: a regular check would tell GitHub that this device has Erevos. GitHub then sees this device's internet address, nothing else, and on Android so does the web app's server, which holds the release computer's signature of the update.": "Erevos ne demande les mises à jour à GitHub que quand tu touches le bouton : une vérification régulière dirait à GitHub que cet appareil a Erevos. GitHub voit alors l'adresse internet de cet appareil, rien d'autre, et sur Android le serveur de l'appli web aussi, qui garde la signature de la mise à jour faite sur l'ordinateur des versions.",
  "Tell me when a new version is out": "Me prévenir quand une nouvelle version sort",
  "Once a day Erevos asks LPHL's server, which runs the relay too, whether a new version is out, and says so at the top of the chats and in a notice. It asks only while this space uses LPHL's relay and does not send everything through Tor, so the server learns nothing it did not know. The answer counts only when signed by the release computer.": "Une fois par jour, Erevos demande au serveur de LPHL, qui fait aussi tourner le relais, si une nouvelle version est sortie, et le dit en haut des discussions et dans une notification. Il ne demande que tant que cet espace utilise le relais de LPHL et n'envoie pas tout par Tor : le serveur n'apprend donc rien qu'il ne savait déjà. La réponse ne compte qu'avec la signature de l'ordinateur des versions.",
  "Erevos does not ask whether a new version is out: only Check for updates tells you.": "Erevos ne demande pas si une nouvelle version est sortie : seul Rechercher des mises à jour te le dit.",
  "Erevos {name} is out. Tap to see what is new and update.": "Erevos {name} est sorti. Touche pour voir les nouveautés et mettre à jour.",
};
