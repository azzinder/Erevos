// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// A voice message in words (lib/speech.ts, components/speech-sheet.tsx) in French (i18n/fr/index.ts).
export const speechText: Record<string, string> = {
  "In words": "En mots",
  "Voice message in words": "Message vocal en mots",
  "To write out voice messages, Erevos needs a speech model ({size} MB), once. It is downloaded from {host}, which sees your IP address, as for any download. Then everything is done on this phone: the sound and its words never leave it.": "Pour écrire les messages vocaux, Erevos a besoin d’un modèle vocal ({size} Mo), une seule fois. Il est téléchargé depuis {host}, qui voit ton adresse IP, comme pour tout téléchargement. Ensuite tout se fait sur ce téléphone : le son et ses mots ne le quittent jamais.",
  "It hears about a hundred languages, Greek among them, and finds the one spoken. Best over Wi-Fi.": "Il comprend une centaine de langues, dont le grec, et reconnaît celle qui est parlée. De préférence en Wi-Fi.",
  "Download ({size} MB)": "Télécharger ({size} Mo)",
  "Downloading the speech model: {got} of {size} MB": "Téléchargement du modèle vocal : {got} sur {size} Mo",
  "Writing it out…": "Écriture en cours…",
  "No words were heard.": "Aucun mot entendu.",
  "Written out on this phone, so it may have mistakes. It is not kept.": "Écrit sur ce téléphone, il peut donc contenir des erreurs. Il n’est pas gardé.",
  "Copied": "Copié",
  "Not downloaded. {error}": "Non téléchargé. {error}",
  "Delete the speech model": "Supprimer le modèle vocal",
  "Voice messages cannot be written out until it is downloaded again ({size} MB).": "Les messages vocaux ne pourront plus être écrits tant qu’il n’est pas téléchargé à nouveau ({size} Mo).",
  "The download stopped each time it was tried, as the connection brought nothing for a while. Try again later, or on another network.": "Le téléchargement s’est arrêté à chaque essai, la connexion n’apportant rien pendant un moment. Réessaie plus tard ou sur un autre réseau.",
  "This Erevos cannot write out voice messages.": "Cet Erevos ne peut pas écrire les messages vocaux.",
  "The speech model is not on this phone.": "Le modèle vocal n’est pas sur ce téléphone.",
  "Android could not read the sound of this voice message.": "Android n’a pas pu lire le son de ce message vocal.",
  "The speech model on this phone is not the one expected, so it was deleted. Download it again.": "Le modèle vocal de ce téléphone n’est pas celui attendu, il a donc été supprimé. Télécharge-le à nouveau.",
};
