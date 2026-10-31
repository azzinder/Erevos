// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// The Italian of the notice that a new version is out, and of Updates around it (app/updates.tsx, app/index.tsx, lib/release-notice.ts) (i18n/it/index.ts).
export const releaseNotice: Record<string, string> = {
  "Erevos asks GitHub for updates only when you tap the button: a regular check would tell GitHub that this device has Erevos. GitHub then sees this device's internet address, nothing else, and on Android so does the web app's server, which holds the release computer's signature of the update.": "Erevos chiede gli aggiornamenti a GitHub solo quando tocchi il pulsante: un controllo regolare direbbe a GitHub che questo dispositivo ha Erevos. GitHub vede allora l'indirizzo internet di questo dispositivo, nient'altro, e su Android anche il server dell'app web, che conserva la firma dell'aggiornamento fatta sul computer delle versioni.",
  "Tell me when a new version is out": "Avvisami quando esce una nuova versione",
  "Once a day Erevos asks LPHL's server, which runs the relay too, whether a new version is out, and says so at the top of the chats and in a notice. It asks only while this space uses LPHL's relay and does not send everything through Tor, so the server learns nothing it did not know. The answer counts only when signed by the release computer.": "Una volta al giorno Erevos chiede al server di LPHL, che gestisce anche il relay, se è uscita una nuova versione, e lo dice in cima alle chat e con una notifica. Chiede solo finché questo spazio usa il relay di LPHL e non manda tutto tramite Tor, quindi il server non scopre nulla che non sapesse già. La risposta conta solo con la firma del computer delle versioni.",
  "Erevos does not ask whether a new version is out: only Check for updates tells you.": "Erevos non chiede se è uscita una nuova versione: te lo dice solo Cerca aggiornamenti.",
  "Erevos {name} is out. Tap to see what is new and update.": "È uscito Erevos {name}. Tocca per vedere le novità e aggiornare.",
};
