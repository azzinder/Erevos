// The French of a relay proving its own key (lib/relay.ts, Channels; components/relay-key-note.tsx) (i18n/fr/index.ts).
export const relayKey: Record<string, string> = {
  "✓ Your relay proved its own key: no one in between can pass for it.": "✓ Ton relais a prouvé sa propre clé : personne entre les deux ne peut se faire passer pour lui.",
  "Your relay does not prove its own key yet: it is older than this app. It works as before; once its operator updates it, Erevos checks its key every time.": "Ton relais ne prouve pas encore sa propre clé : il est plus ancien que cette app. Il marche comme avant ; dès que son opérateur le met à jour, Erevos vérifie sa clé à chaque fois.",
  "Forget the key kept for this relay?": "Oublier la clé qu’Erevos garde pour ce relais ?",
  "Only when its operator told you it has a new key. Erevos then takes the key the relay gives next, and checks it every time from then on.": "Seulement si son opérateur t’a dit qu’il a une nouvelle clé. Erevos prend alors la clé que le relais donne ensuite, et la vérifie à chaque fois à partir de là.",
  "Forget it": "L’oublier",
  "Your relay did not prove the key Erevos keeps for it: someone may be in between, or it has a new key. Nothing goes to it until it proves it; your messages wait.": "Ton relais n’a pas prouvé la clé qu’Erevos garde pour lui : quelqu’un est peut-être entre les deux, ou il a une nouvelle clé. Rien ne lui est envoyé tant qu’il ne l’a pas prouvée ; tes messages attendent.",
  "It has a new key": "Il a une nouvelle clé",
  "the relay at {url} did not prove its key: someone may be in between, or the relay has a new key": "le relais à {url} n’a pas prouvé sa clé : quelqu’un est peut-être entre les deux, ou le relais a une nouvelle clé",
  "the relay sent what its channel does not hold": "le relais a envoyé ce qui n’appartient pas à son canal",
  "the relay has no channel": "le relais n’a pas de canal",
};
