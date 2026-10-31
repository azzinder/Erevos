// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// The German of a relay proving its own key (lib/relay.ts, Channels; components/relay-key-note.tsx) (i18n/de/index.ts).
export const relayKey: Record<string, string> = {
  "✓ Your relay proved its own key: no one in between can pass for it.": "✓ Dein Relay hat seinen eigenen Schlüssel bewiesen: Niemand dazwischen kann sich als es ausgeben.",
  "Your relay does not prove its own key yet: it is older than this app. It works as before; once its operator updates it, Erevos checks its key every time.": "Dein Relay beweist seinen eigenen Schlüssel noch nicht: Es ist älter als diese App. Es funktioniert wie bisher; sobald sein Betreiber es aktualisiert, prüft Erevos seinen Schlüssel jedes Mal.",
  "Forget the key kept for this relay?": "Den Schlüssel vergessen, den Erevos für dieses Relay hat?",
  "Only when its operator told you it has a new key. Erevos then takes the key the relay gives next, and checks it every time from then on.": "Nur wenn sein Betreiber dir gesagt hat, dass es einen neuen Schlüssel hat. Erevos nimmt dann den Schlüssel, den das Relay als Nächstes gibt, und prüft ihn von da an jedes Mal.",
  "Forget it": "Vergessen",
  "Your relay did not prove the key Erevos keeps for it: someone may be in between, or it has a new key. Nothing goes to it until it proves it; your messages wait.": "Dein Relay hat den Schlüssel, den Erevos dafür hat, nicht bewiesen: Jemand könnte dazwischen sein, oder es hat einen neuen Schlüssel. Nichts geht dorthin, bis es ihn beweist; deine Nachrichten warten.",
  "It has a new key": "Es hat einen neuen Schlüssel",
  "the relay at {url} did not prove its key: someone may be in between, or the relay has a new key": "das Relay unter {url} hat seinen Schlüssel nicht bewiesen: Jemand könnte dazwischen sein, oder das Relay hat einen neuen Schlüssel",
  "the relay sent what its channel does not hold": "das Relay hat etwas gesendet, das nicht zu seinem Kanal gehört",
  "the relay has no channel": "das Relay hat keinen Kanal",
};
