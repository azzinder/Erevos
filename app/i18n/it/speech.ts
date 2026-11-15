// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// A voice message in words (lib/speech.ts, components/speech-sheet.tsx) in Italian (i18n/it/index.ts).
export const speechText: Record<string, string> = {
  "In words": "In parole",
  "Voice message in words": "Messaggio vocale in parole",
  "To write out voice messages, Erevos needs a speech model ({size} MB), once. It is downloaded from {host}, which sees your IP address, as for any download. Then everything is done on this phone: the sound and its words never leave it.": "Per scrivere i messaggi vocali, Erevos ha bisogno di un modello vocale ({size} MB), una volta sola. Viene scaricato da {host}, che vede il tuo indirizzo IP, come per ogni download. Poi tutto avviene su questo telefono: il suono e le sue parole non lo lasciano mai.",
  "It hears about a hundred languages, Greek among them, and finds the one spoken. Best over Wi-Fi.": "Capisce circa cento lingue, tra cui il greco, e riconosce quella parlata. Meglio con il Wi-Fi.",
  "Download ({size} MB)": "Scarica ({size} MB)",
  "Downloading the speech model: {got} of {size} MB": "Download del modello vocale: {got} di {size} MB",
  "Writing it out…": "Scrittura in corso…",
  "No words were heard.": "Non si sono sentite parole.",
  "Written out on this phone, so it may have mistakes. It is not kept.": "Scritto su questo telefono, quindi può contenere errori. Non viene conservato.",
  "Copied": "Copiato",
  "Not downloaded. {error}": "Non scaricato. {error}",
  "Delete the speech model": "Elimina il modello vocale",
  "Voice messages cannot be written out until it is downloaded again ({size} MB).": "I messaggi vocali non potranno essere scritti finché non viene scaricato di nuovo ({size} MB).",
  "The download stopped each time it was tried, as the connection brought nothing for a while. Try again later, or on another network.": "Il download si è fermato a ogni tentativo, perché la connessione non portava nulla per un po’. Riprova più tardi o su un’altra rete.",
  "This Erevos cannot write out voice messages.": "Questo Erevos non può scrivere i messaggi vocali.",
  "The speech model is not on this phone.": "Il modello vocale non è su questo telefono.",
  "Android could not read the sound of this voice message.": "Android non è riuscito a leggere il suono di questo messaggio vocale.",
  "The speech model on this phone is not the one expected, so it was deleted. Download it again.": "Il modello vocale su questo telefono non è quello previsto, quindi è stato eliminato. Scaricalo di nuovo.",
};
