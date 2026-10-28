// Srpskohrvatski za broj na ikoni Erevosa (lib/icon-number.ts, izbor u app/security.tsx,
// Postavke → Obavijesti) (i18n/sh/index.ts).
export const iconNumber: Record<string, string> = {
  'Number on the icon': 'Broj na ikoni',
  "How many messages are not read, on Erevos's icon": 'Koliko poruka nije pročitano, na ikoni Erevosa',
  'Show the number': 'Prikaži broj',
  'No number': 'Bez broja',
  "Where the browser can show it (an iPhone's or iPad's home screen, a Mac's Dock, Chrome or Edge installed on a computer), Erevos's icon shows how many messages the space you had open has not read, and those that came since, never a hidden chat's. Only for a space with notifications while closed on. The number stays while Erevos is closed: one that does not match the space you open may hint at another. For every space on this device.":
    'Gdje preglednik to može prikazati (na početnom ekranu iPhonea ili iPada, u Docku na Macu, u Chromeu ili Edgeu instaliranom na računaru), ikona Erevosa pokazuje koliko poruka nije pročitao prostor koji je bio otvoren, i one koje su stigle poslije, nikad iz skrivenog razgovora. Samo za prostor s uključenim obavijestima dok je Erevos zatvoren. Broj ostaje dok je Erevos zatvoren: ako se ne slaže s prostorom koji otvarate, može nagovijestiti drugi. Za svaki prostor na ovom uređaju.',
  "Erevos's icon shows no number.": 'Ikona Erevosa ne pokazuje broj.',
  // On Android, from the messages notice (lib/background.ts).
  "When you leave Erevos with messages not read in the open space's chats and groups, a notice without sound says how many, and counts on with those it tells of after, until you read them. Muted chats and hidden ones are not counted as you leave. The phone's launcher shows it on Erevos's icon: as a number, or on some phones, such as Pixels, as a dot. Only with Say a message came, under In the background. For every space on this phone.":
    "Kad napustite Erevos s nepročitanim porukama u razgovorima i grupama otvorenog prostora, obavijest bez zvuka kaže koliko ih je, i broji i one koje javi poslije, dok ih ne pročitate. Utišani i skriveni razgovori se ne broje kad izlazite. Pokretač (launcher) telefona je prikazuje na ikoni Erevosa: kao broj ili, na nekim telefonima, poput Pixela, kao tačku. Samo uz Javi da je stigla poruka, pod U pozadini. Za svaki prostor na ovom telefonu.",
  "Erevos's icon keeps no number of its own: the launcher shows one only while the notice tells of messages that came since you last had Erevos open.":
    "Ikona Erevosa ne čuva vlastiti broj: pokretač ga prikazuje samo dok obavijest javlja poruke koje su stigle otkako ste zadnji put imali Erevos otvoren.",
  // The card that turns notifications on (components/integrity-card.tsx).
  "Where the browser can show it, Erevos's icon then also shows how many messages this space has not read, unless turned off under Number on the icon.":
    'Gdje preglednik to može prikazati, ikona Erevosa tada pokazuje i koliko poruka ovaj prostor nije pročitao, osim ako to isključite pod „Broj na ikoni“.',
};
