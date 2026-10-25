// The Serbo-Croatian of a relay proving its own key (lib/relay.ts, Channels; components/relay-key-note.tsx) (i18n/sh/index.ts).
export const relayKey: Record<string, string> = {
  "✓ Your relay proved its own key: no one in between can pass for it.": "✓ Vaš relay je dokazao svoj ključ: niko između ne može da se predstavi kao on.",
  "Your relay does not prove its own key yet: it is older than this app. It works as before; once its operator updates it, Erevos checks its key every time.": "Vaš relay još ne dokazuje svoj ključ: stariji je od ove aplikacije. Radi kao i pre; kada ga njegov operater ažurira, Erevos svaki put proverava njegov ključ.",
  "Forget the key kept for this relay?": "Zaboraviti ključ koji Erevos čuva za ovaj relay?",
  "Only when its operator told you it has a new key. Erevos then takes the key the relay gives next, and checks it every time from then on.": "Samo ako vam je njegov operater rekao da ima novi ključ. Erevos tada uzima ključ koji relay sledeći put da, i od tada ga svaki put proverava.",
  "Forget it": "Zaboravi ga",
  "Your relay did not prove the key Erevos keeps for it: someone may be in between, or it has a new key. Nothing goes to it until it proves it; your messages wait.": "Vaš relay nije dokazao ključ koji Erevos čuva za njega: neko je možda između, ili ima novi ključ. Ništa mu ne ide dok ga ne dokaže; vaše poruke čekaju.",
  "It has a new key": "Ima novi ključ",
  "the relay at {url} did not prove its key: someone may be in between, or the relay has a new key": "relay na {url} nije dokazao svoj ključ: neko je možda između, ili relay ima novi ključ",
  "the relay sent what its channel does not hold": "relay je poslao nešto što ne pripada njegovom kanalu",
  "the relay has no channel": "relay nema kanal",
};
