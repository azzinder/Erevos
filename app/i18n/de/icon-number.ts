// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// Das Deutsche für die Zahl auf dem Symbol von Erevos (lib/icon-number.ts, der Schalter in
// app/security.tsx, Einstellungen → Benachrichtigungen) (i18n/de/index.ts).
export const iconNumber: Record<string, string> = {
  'Number on the icon': 'Zahl auf dem Symbol',
  "How many messages are not read, on Erevos's icon": 'Wie viele Nachrichten ungelesen sind, auf dem Symbol von Erevos',
  'Show the number': 'Zahl zeigen',
  'No number': 'Keine Zahl',
  "Where the browser can show it (an iPhone's or iPad's home screen, a Mac's Dock, Chrome or Edge installed on a computer), Erevos's icon shows how many messages the space you had open has not read, and those that came since, never a hidden chat's. Only for a space with notifications while closed on. The number stays while Erevos is closed: one that does not match the space you open may hint at another. For every space on this device.":
    'Wo der Browser es zeigen kann (der Home-Bildschirm eines iPhones oder iPads, das Dock eines Macs, ein auf einem Computer installiertes Chrome oder Edge), zeigt das Symbol von Erevos, wie viele Nachrichten der zuletzt geöffnete Bereich nicht gelesen hat, und die seitdem gekommenen, nie die eines versteckten Chats. Nur für einen Bereich mit eingeschalteten Benachrichtigungen, wenn geschlossen. Die Zahl bleibt, solange Erevos geschlossen ist: Passt sie nicht zu dem Bereich, den du öffnest, kann sie auf einen anderen hindeuten. Für jeden Bereich auf diesem Gerät.',
  "Erevos's icon shows no number.": 'Das Symbol von Erevos zeigt keine Zahl.',
  // On Android, from the messages notice (lib/background.ts).
  "When you leave Erevos with messages not read in the open space's chats and groups, a notice without sound says how many, and counts on with those it tells of after, until you read them. Muted chats and hidden ones are not counted as you leave. The phone's launcher shows it on Erevos's icon: as a number, or on some phones, such as Pixels, as a dot. Only with Say a message came, under In the background. For every space on this phone.":
    "Verlässt du Erevos mit ungelesenen Nachrichten in den Chats und Gruppen des offenen Bereichs, sagt eine Meldung ohne Ton, wie viele es sind, und zählt die mit, die sie danach meldet, bis du sie liest. Stumme und versteckte Chats zählen beim Verlassen nicht. Der Launcher des Telefons zeigt sie am Symbol von Erevos: als Zahl oder auf manchen Telefonen, etwa Pixels, als Punkt. Nur mit Neue Nachrichten melden unter Im Hintergrund. Für jeden Bereich auf diesem Telefon.",
  "Erevos's icon keeps no number of its own: the launcher shows one only while the notice tells of messages that came since you last had Erevos open.":
    "Das Symbol von Erevos behält keine eigene Zahl: Der Launcher zeigt nur eine, solange die Meldung Nachrichten anzeigt, die gekommen sind, seit du Erevos zuletzt offen hattest.",
  // The card that turns notifications on (components/integrity-card.tsx).
  "Where the browser can show it, Erevos's icon then also shows how many messages this space has not read, unless turned off under Number on the icon.":
    'Wo der Browser es zeigen kann, zeigt das Symbol von Erevos dann auch, wie viele Nachrichten dieser Bereich nicht gelesen hat, außer du schaltest es unter Zahl auf dem Symbol aus.',
};
