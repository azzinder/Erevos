// The Serbo-Croatian of texting with no relay, through Nostr, and the relay invites that come by themselves (app/chat.tsx, lib/nostr-chats.ts) (i18n/sh/index.ts).
export const nostrOnly: Record<string, string> = {
  'No Nostr relay took it: {reason}': 'Nijedan Nostr relej ga nije primio: {reason}',
  'Contact added. Messages to it are end-to-end encrypted. Compare the safety number with theirs. With no relay between you, texts, stickers and reactions go through Nostr, over Tor; photos, voice messages and calls need a relay or their phone nearby.': 'Kontakt je dodan. Poruke prema njemu su šifrirane s kraja na kraj. Usporedite sigurnosni broj s njegovim. Bez releja između vas, tekstovi, naljepnice i reakcije idu preko Nostra, kroz Tor; fotografije, glasovne poruke i pozivi trebaju relej ili njegov telefon u blizini.',
  '{name} gave you a place on their relay, by itself. Photos, voice messages and calls now go there too, with everyone.': '{name}: dobili ste sami od sebe mjesto na njegovom releju. Fotografije, glasovne poruke i pozivi sada idu i tamo, sa svima.',
  'A contact gave you a place on their relay, by itself. Photos, voice messages and calls now go there too, with everyone.': 'Jedan kontakt vam je sam od sebe dao mjesto na svom releju. Fotografije, glasovne poruke i pozivi sada idu i tamo, sa svima.',
  'An invite to a contact’s relay came, but it was not taken. {error}': 'Stigla je pozivnica za relej jednog kontakta, ali nije prihvaćena. {error}',
};
