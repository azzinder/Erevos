// The German of texting with no relay, through Nostr, and the relay invites that come by themselves (app/chat.tsx, lib/nostr-chats.ts) (i18n/de/index.ts).
export const nostrOnly: Record<string, string> = {
  'No Nostr relay took it: {reason}': 'Kein Nostr-Relay hat sie angenommen: {reason}',
  'Contact added. Messages to it are end-to-end encrypted. Compare the safety number with theirs. With no relay between you, texts, stickers, reactions, photos, files and voice messages go through Nostr, over Tor; calls need a relay or their phone nearby.': 'Kontakt hinzugefügt. Nachrichten an ihn sind Ende-zu-Ende-verschlüsselt. Vergleiche die Sicherheitsnummer mit seiner. Ohne Relay zwischen euch gehen Texte, Sticker, Reaktionen, Fotos, Dateien und Sprachnachrichten über Nostr, über Tor; Anrufe brauchen ein Relay oder sein Telefon in der Nähe.',
  '{name} gave you a place on their relay, by itself. Photos, voice messages and calls now go there too, with everyone.': '{name} hat dir von selbst einen Platz auf seinem Relay gegeben. Fotos, Sprachnachrichten und Anrufe gehen jetzt auch dorthin, mit allen.',
  'A contact gave you a place on their relay, by itself. Photos, voice messages and calls now go there too, with everyone.': 'Ein Kontakt hat dir von selbst einen Platz auf seinem Relay gegeben. Fotos, Sprachnachrichten und Anrufe gehen jetzt auch dorthin, mit allen.',
  'An invite to a contact’s relay came, but it was not taken. {error}': 'Eine Einladung zum Relay eines Kontakts kam, wurde aber nicht angenommen. {error}',
  'Sticker sent through Nostr, end-to-end encrypted.': 'Sticker über Nostr gesendet, Ende-zu-Ende-verschlüsselt.',
  'Photo sent through Nostr, end-to-end encrypted.': 'Foto über Nostr gesendet, Ende-zu-Ende-verschlüsselt.',
  'File sent through Nostr, end-to-end encrypted.': 'Datei über Nostr gesendet, Ende-zu-Ende-verschlüsselt.',
  'Photos and files go through Nostr, which cannot be reached.': 'Fotos und Dateien gehen über Nostr, das gerade nicht erreichbar ist.',
  'The photo waits, and goes by itself once Nostr can take it.': 'Das Foto wartet und geht von selbst, sobald Nostr es annehmen kann.',
  'The file waits, and goes by itself once Nostr can take it.': 'Die Datei wartet und geht von selbst, sobald Nostr sie annehmen kann.',
  '{have} of {count} pieces of the photo have come.': '{have} von {count} Teilen des Fotos sind angekommen.',
  'With no relay, files can be {size} MB at most.': 'Ohne Relay dürfen Dateien höchstens {size} MB groß sein.',
  'No Nostr relay or file server took it: {reason}': 'Kein Nostr-Relay und kein Dateiserver hat sie angenommen: {reason}',
};
