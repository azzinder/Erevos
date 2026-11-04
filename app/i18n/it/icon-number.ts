// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// L'italiano del numero sull'icona di Erevos (lib/icon-number.ts, la scelta in
// app/security.tsx, Impostazioni → Notifiche) (i18n/it/index.ts).
export const iconNumber: Record<string, string> = {
  'Number on the icon': "Numero sull'icona",
  "How many messages are not read, on Erevos's icon": "Quanti messaggi non sono letti, sull'icona di Erevos",
  'Show the number': 'Mostra il numero',
  'No number': 'Nessun numero',
  "Where the browser can show it (an iPhone's or iPad's home screen, a Mac's Dock, Chrome or Edge installed on a computer), Erevos's icon shows how many messages the space you had open has not read, and those that came since, never a hidden chat's. Only for a space with notifications while closed on. The number stays while Erevos is closed: one that does not match the space you open may hint at another. For every space on this device.":
    "Dove il browser può mostrarlo (la schermata Home di un iPhone o di un iPad, il Dock di un Mac, Chrome o Edge installati su un computer), l'icona di Erevos mostra quanti messaggi non ha letto lo spazio che avevi aperto, e quelli arrivati dopo, mai quelli di una chat nascosta. Solo per uno spazio con le notifiche ad app chiusa attive. Il numero resta finché Erevos è chiuso: se non corrisponde allo spazio che apri, può lasciarne intuire un altro. Per ogni spazio di questo dispositivo.",
  "Erevos's icon shows no number.": "L'icona di Erevos non mostra alcun numero.",
  // On Android, from the messages notice (lib/background.ts).
  "When you leave Erevos with messages not read in the open space's chats and groups, a notice without sound says how many, and counts on with those it tells of after, until you read them. Muted chats and hidden ones are not counted as you leave. The phone's launcher shows it on Erevos's icon: as a number, or on some phones, such as Pixels, as a dot. Only with Say a message came, under In the background. For every space on this phone.":
    "Quando esci da Erevos con messaggi non letti nelle chat e nei gruppi dello spazio aperto, una notifica senza suono dice quanti sono, e conta anche quelli che segnala dopo, finché non li leggi. Le chat in silenzio e quelle nascoste non contano quando esci. Il launcher del telefono la mostra sull'icona di Erevos: come numero o, su alcuni telefoni come i Pixel, come punto. Solo con Avvisa dei nuovi messaggi, in In background. Per ogni spazio di questo telefono.",
  "Erevos's icon keeps no number of its own: the launcher shows one only while the notice tells of messages that came since you last had Erevos open.":
    "L'icona di Erevos non tiene un numero suo: il launcher ne mostra uno solo finché la notifica segnala messaggi arrivati dall'ultima volta che avevi Erevos aperto.",
  // Huawei's and Honor's launchers, a number on each icon (modules/erevos-widget, IconNumbers.kt).
  "With Show the number, Huawei's and Honor's launchers put a number on each of Erevos's icons apart: on Erevos's own the messages its notice counts, on SMS's the SMS not read, on Phone's the missed calls, on Contacts's a birthday today. Other launchers, such as those of Pixel and GrapheneOS, Samsung's, Xiaomi's and Kvaesitso, show each notice of Erevos on all its icons alike: Android gives it to the app, not to one of its icons, and Erevos cannot change that.":
    "Con Mostra il numero, i launcher di Huawei e Honor mettono un numero su ciascuna icona di Erevos a parte: su quella di Erevos i messaggi che conta la sua notifica, su quella degli SMS gli SMS non letti, su quella del Telefono le chiamate perse, su quella dei Contatti un compleanno di oggi. Altri launcher, come quelli dei Pixel e di GrapheneOS, quello di Samsung, quello di Xiaomi e Kvaesitso, mostrano ogni notifica di Erevos su tutte le sue icone allo stesso modo: Android la dà all'app, non a una delle sue icone, ed Erevos non può cambiarlo.",
  // The card that turns notifications on (components/integrity-card.tsx).
  "Where the browser can show it, Erevos's icon then also shows how many messages this space has not read, unless turned off under Number on the icon.":
    "Dove il browser può mostrarlo, l'icona di Erevos mostra allora anche quanti messaggi questo spazio non ha letto, a meno che tu non lo spenga in Numero sull'icona.",
};
