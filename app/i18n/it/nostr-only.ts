// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// The Italian of texting with no relay, through Nostr, and the relay invites that come by themselves (app/chat.tsx, lib/nostr-chats.ts) (i18n/it/index.ts).
export const nostrOnly: Record<string, string> = {
  'No Nostr relay took it: {reason}': 'Nessun relay Nostr l’ha preso: {reason}',
  'Contact added. Messages to it are end-to-end encrypted. Compare the safety number with theirs. With no relay between you, texts, stickers, reactions, photos, files and voice messages go through Nostr, over Tor; calls need a relay or their phone nearby.': 'Contatto aggiunto. I messaggi verso di lui sono cifrati end-to-end. Confronta il numero di sicurezza con il suo. Senza relay tra voi, testi, sticker, reazioni, foto, file e messaggi vocali passano da Nostr, tramite Tor; le chiamate richiedono un relay o il suo telefono vicino.',
  '{name} gave you a place on their relay, by itself. Photos, voice messages and calls now go there too, with everyone.': '{name} ti ha dato da solo un posto sul suo relay. Foto, messaggi vocali e chiamate ora passano anche da lì, con tutti.',
  'A contact gave you a place on their relay, by itself. Photos, voice messages and calls now go there too, with everyone.': 'Un contatto ti ha dato da solo un posto sul suo relay. Foto, messaggi vocali e chiamate ora passano anche da lì, con tutti.',
  'An invite to a contact’s relay came, but it was not taken. {error}': 'È arrivato un invito al relay di un contatto, ma non è stato preso. {error}',
  'Sticker sent through Nostr, end-to-end encrypted.': 'Sticker inviato tramite Nostr, cifrato end-to-end.',
  'Photo sent through Nostr, end-to-end encrypted.': 'Foto inviata tramite Nostr, cifrata end-to-end.',
  'File sent through Nostr, end-to-end encrypted.': 'File inviato tramite Nostr, cifrato end-to-end.',
  'Photos and files go through Nostr, which cannot be reached.': 'Foto e file passano da Nostr, che al momento non è raggiungibile.',
  'The photo waits, and goes by itself once Nostr can take it.': 'La foto aspetta e parte da sola appena Nostr potrà prenderla.',
  'The file waits, and goes by itself once Nostr can take it.': 'Il file aspetta e parte da solo appena Nostr potrà prenderlo.',
  '{have} of {count} pieces of the photo have come.': 'Sono arrivati {have} pezzi su {count} della foto.',
  'With no relay, files can be {size} MB at most.': 'Senza relay, i file possono pesare al massimo {size} MB.',
  'No Nostr relay or file server took it: {reason}': 'Nessun relay Nostr né server di file l’ha preso: {reason}',
};
