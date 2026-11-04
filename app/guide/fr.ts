// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

/** The user guide in French. Its format: lib/guide.ts. The same sections, in the same order and shape, as the English one. */
export const guide = `
## Ce qu’est Erevos {#about}

Erevos est une messagerie faite pour la confidentialité. Tu n’as besoin ni de compte, ni de numéro de téléphone, ni
d’e-mail pour l’utiliser, et elle est faite pour continuer à fonctionner où que tu sois : par un téléphone à proximité
sans aucun réseau, par Wi-Fi, ou par internet.

- **À proximité, sans internet :** deux téléphones Android se parlent directement par Bluetooth, Wi-Fi Aware ou Wi-Fi
  Direct, chiffré de bout en bout, et les téléphones et ordinateurs sur le même Wi-Fi ou sur le point d’accès d’un
  téléphone aussi. Avec une radio LoRa, les textes vont à des kilomètres.
- **Par un relais :** par Wi-Fi ou par internet, via un petit serveur (un relais) que tu peux faire tourner toi-même.
- **Espaces :** un verrou par mot de passe, un second mot de passe qui ouvre un Erevos séparé et vide, et des
  discussions masquées dans chaque espace.
- **Apparence :** les rendus LPHL : Classic, Modernist et Nocturne, douze palettes, et le verre comme sur
  lphl.nekten.eu.

> Les messages sont **chiffrés de bout en bout**, par un relais comme à proximité, mais rien n’a encore été audité par
> des experts indépendants. [Ce qui est protégé aujourd’hui](#privacy) dit exactement ce qui l’est et ce qui ne l’est
> pas.

Ce guide s’ouvre depuis **Guide d’utilisation** dans le menu de l’écran d’accueil (les trois points en haut). La
recherche en haut du guide y trouve n’importe quel mot. Le guide est dans toutes les langues de l’app, et s’affiche dans celle
que tu as choisie, voir [Langue](#start).

### Qui le fait, et pourquoi

- **Qui :** Erevos, by azzinder : la même personne qui a fait FASOULI.
- **Où :** cela n’a pas d’importance. Ce qui compte, c’est que le relais et l’app pour le navigateur tournent sur le
  propre serveur de son auteur (lphl.nekten.eu).
- **Pour qui :** pour quiconque veut parler avec ses proches sans donner de numéro de téléphone, d’e-mail ni de compte :
  amis, familles, groupes, et ceux qui vivent là où internet est coupé ou surveillé. Et pour ceux qui, sans rien à
  cacher, veulent garder leur espace personnel privé, à l’abri des regards indiscrets.
- **Pourquoi :** parce que les applis connues demandent un numéro de téléphone, savent qui parle à qui, et s’arrêtent
  quand internet tombe. Parce que les « conditions d’utilisation » de certaines d’entre elles ne nous protègent pas, et
  que nous avons des doutes sur la façon dont elles protègent notre vie privée. Parce que d’autres n’ont pas des
  fonctions dont nous avons besoin. Erevos ne demande rien, et trouve un chemin par ce qui est là : internet, le Wi-Fi,
  le Bluetooth, un téléphone à proximité.
- **Qui paie :** personne : pas de publicité, pas d’investisseurs, pas de collecte de données. Qui le veut peut aider
  pour les frais de fonctionnement, comme le serveur : **Réglages** → **Général** → **Soutenir Erevos** donne les
  moyens, Liberapay, PayPal, Monero et Bitcoin. Donner ou non ne change rien dans l’app. **Pourquoi :** chaque moyen
  s’ouvre hors d’Erevos, dans le navigateur ou un portefeuille, seulement quand tu appuies dessus, si bien qu’Erevos
  lui-même n’envoie rien et ne sait jamais qui a donné. PayPal sait qui donne ; Monero ne montre ni qui a donné ni
  combien ; Bitcoin ne montre aucun nom, mais ce que l’adresse a reçu est public.
- **Contact :** **Réglages** → **Général** → **Contact** ajoute l’auteur d’Erevos comme contact, et tu lui écris dans
  Erevos même, avec chiffrement de bout en bout, sans numéro de téléphone ni e-mail.

### Fait avec l’open source des autres

Erevos lui-même est un logiciel libre, sous la licence AGPL-3.0-or-later, voir [Licence](#licence), et il est construit
sur le travail open source d’autres personnes. Voici les principales parties, chacune avec ses auteurs et sa licence :

- **Element Call** (Element ; AGPL-3.0) : les appels Matrix.
- **Arti, lyrebird, Snowflake et WebTunnel** (The Tor Project ; Arti MIT ou Apache-2.0, lyrebird BSD-2-Clause, Snowflake
  BSD-3-Clause, WebTunnel MIT) : Tor dans l’app, et les ponts Tor sur Android.
- **vodozemac** (Matrix.org Foundation ; Apache-2.0) : le chiffrement de Matrix.
- **OpenMLS** (OpenMLS Authors ; MIT) : les groupes chiffrés.
- **Les bibliothèques de RustCrypto et de dalek-cryptography** (leurs développeurs ; MIT ou Apache-2.0 pour RustCrypto,
  BSD-3-Clause pour dalek-cryptography) : le chiffrement lui-même.
- **React Native, Expo et react-native-webrtc** (Meta, 650 Industries et la communauté React Native WebRTC ; MIT) :
  l’app et ses appels.
- **Electron** (Electron contributors ; MIT) : l’app pour ordinateur.
- **Les polices Inter** (Rasmus Andersson et les Inter Project Authors ; SIL Open Font License 1.1) : les polices de
  l’app.

La liste complète, chaque paquet avec sa licence, est dans le fichier \`CREDITS.md\` qui vient avec le code source
d’Erevos.

**Pourquoi :** parce que leurs auteurs ont donné leur travail librement et ont demandé à être nommés, et parce que tu
dois pouvoir voir de quoi Erevos est fait.

Cette partie s’ouvre aussi depuis **Réglages** → **Général** → **À propos d’Erevos**.

## Premiers pas {#start}

Erevos se télécharge depuis sa page des versions, un fichier pour chaque système : voir [Mises à jour](#updates) pour
savoir où, et comment le mettre à jour. Il fonctionne sur Android, sur un ordinateur (Linux, macOS et Windows), sur
Sailfish OS et, depuis le navigateur, sur un iPhone. Si tu es nouveau, commence par une invitation de quelqu’un qui
l’utilise : un code QR ou un lien, et tu y es, avec cette personne comme contact (voir Inviter quelqu’un de nouveau,
sous [Discuter par un relais](#relay)).

L’écran d’accueil est la liste de tes discussions, celle qui a bougé en dernier en haut. Chacune montre l’image du
contact, le dernier message avec ses marques, quand il est arrivé, et combien de ses messages tu n’as pas lus. Une
horloge à côté signifie que ses messages disparaissent. **Rechercher dans les discussions** trouve une discussion par
son nom ou son dernier message, et, sous les discussions, les messages qui contiennent ce que tu tapes, dans toutes les
discussions de l’espace : appuie sur l’un d’eux pour ouvrir sa discussion à cet endroit. Dans une discussion, ses
détails ont **Rechercher dans cette discussion** : ▲ et ▼ vont à ce qu’elle a trouvé plus tôt et plus tard. L’une comme
l’autre ne cherche que sur ce téléphone : dans ce qu’il garde scellé, et **Rechercher dans cette discussion** aussi dans
les SMS que montre la discussion d’un contact ; les discussions masquées ne se cherchent que de l’intérieur. Une longue
discussion s’ouvre sur ses 100 derniers messages, et les plus anciens, dont ceux importés de Telegram ou WhatsApp,
arrivent tout seuls quand tu remontes (**Afficher les messages plus anciens**, au-dessus d’eux, les amène aussi) ; aller
à un message plus ancien (depuis la recherche, un message avec étoile ou celui auquel un message répond) l’amène aussi.
Chaque discussion s’ouvre sur son dernier message, avec la barre de message en dessous : les discussions avec des
contacts, les groupes et les conversations SMS, comme les discussions Matrix, XMPP et Nostr. Quand tu as un peu remonté,
des flèches rondes apparaissent en bas à droite, dans chacune : celle du haut va au début de la discussion, celle du bas
revient à sa fin. Entre les deux, si des messages étaient nouveaux à l’ouverture, une double coche va au premier d’entre
eux, là où tu en étais, tant que ce message n’est pas à l’écran. Depuis le début, **Afficher les messages suivants**, sous
ce qui s’affiche, en amène d’autres ; écrire un message, ou la flèche du bas, ramène à la fin.

**Pourquoi :** une longue discussion s’ouvre sur ses derniers messages pour s’ouvrir tout de suite : tout afficher d’un
coup serait lent, surtout sur les téléphones anciens. Les discussions masquées sont exclues de la recherche de l’écran
d’accueil pour que l’écran d’accueil ait le même aspect, qu’un espace en ait ou non : leurs messages ne peuvent être lus
que tant que leur code PIN les tient ouvertes.

- **L’image** est dessinée à partir de la clé du contact : la même clé donne toujours les mêmes couleurs et la même lune
  (en verts sous Matrix), si bien que tu reconnais une discussion d’un coup d’œil sans aucune photo. Ce n’est pas une
  vérification de la clé ; le [numéro de sécurité](#relay) en est une.
- **La ligne sous la recherche** dit si un relais est configuré et si ta file d’attente est prête. Appuie dessus pour en
  configurer un.
- **Discussion avec moi-même**, toujours la première des discussions, avec une épingle, contient tes notes pour
  toi-même : voir Discussion avec moi-même et rappels ci-dessous.
- **Les discussions Matrix**, une fois que tu t’es connecté à Matrix, sont dans la liste avec les autres, les plus
  récentes d’abord, chacune marquée **Matrix**, et une invitation s’affiche en haut. La puce **Matrix** ne montre
  qu’elles, et là **Nouvelle discussion** commence une discussion Matrix : voir [Matrix](#matrix).
- **Les discussions XMPP**, une fois que tu t’es connecté à XMPP, sont dans la liste de la même façon, chacune marquée
  **XMPP**, et une personne qui demande à t’ajouter, ou un groupe qui t’invite, s’affiche en haut. La puce **XMPP** ne
  montre qu’elles, et là **Nouvelle discussion** commence une discussion XMPP : voir [XMPP](#xmpp).
- **Les discussions Nostr**, une fois que l’espace a une clé Nostr, sont dans la liste de la même façon, chacune
  marquée **Nostr**. Le bouton **Nostr** n’affiche qu’elles, et là **Nouvelle discussion** ouvre l’écran des
  discussions Nostr : voir [Discussions avec d’autres applis Nostr](#nostr-chats).
- **Nouvelle discussion**, en bas, ouvre les réglages du relais et l’ajout d’un contact. **Me rappeler**, la cloche
  orange à côté, t’écrit un rappel.
- **Le combiné vert et la personne violette** en haut, sur Android, ouvrent directement **Téléphone** et **Contacts**,
  aux couleurs de leurs icônes sur l’écran d’accueil du téléphone. Ils ne sont pas aussi dans le menu sous les trois
  points.
- **Tous**, **SMS** et **Erevos**, au-dessus des discussions dès qu’il y a aussi des conversations SMS, montrent tout,
  seulement les SMS (avec les discussions dont le dernier message était un SMS), ou seulement les discussions Erevos,
  pour chaque contact ce qui est arrivé en dernier.
  Chaque puce, celles-ci et celles de **Matrix**, **XMPP** et **Nostr**, montre un petit nombre après son nom : les
  messages non lus qu’elle contient (99+ au-delà de 99), et rien quand il n’y en a pas. Les discussions et groupes
  **En sourdine** ne comptent pas, comme dans le nombre sur l’icône d’Erevos, et ce qui est tapé dans la recherche n’y
  change rien.
- **Le widget**, sur Android : ajoute Erevos depuis les widgets de ton écran d’accueil. Ses quatre boutons ouvrent
  **Téléphone**, les **SMS**, les **Messages** d’Erevos et **Contacts**, après le mot de passe comme tout lien (le
  Téléphone sans lui, si tu le permets). Au-dessus des trois premiers, il montre combien il y a d’appels manqués, de SMS
  non lus et de nouveaux messages, jamais de qui ni quoi ; avec des appels manqués, **Téléphone** s’ouvre sur
  **Récents**. Un bouton touché de nouveau montre de nouveau son écran, même après que tu as choisi un autre onglet
  là-bas. Ses mots suivent la langue d’Erevos. **Réglages** → **Apparence** → **Widget** définit l’ordre de ses boutons.
- **Le cadenas orange** en haut verrouille Erevos aussitôt quand un mot de passe est défini, ou ouvre les réglages du
  verrou sinon.
- **Les trois points** ouvrent le reste :

| Dans le menu | Ce que ça ouvre |
| --- | --- |
| **Nouveau groupe** | Une discussion de groupe avec tes contacts. Voir [Discussions de groupe](#groups). |
| **Groupes publics** | Un groupe que quiconque a son lien peut demander à rejoindre, avec un propriétaire et des admins. Voir [Groupes publics](#public-groups). |
| **Messages avec étoile** | Les messages auxquels tu as ajouté une étoile, dans toutes tes discussions. Voir Le menu d’un message, sous Discuter par un relais. |
| **Téléphones à proximité** | Tes contacts par Bluetooth et Wi-Fi Aware, ou sur le même Wi-Fi, sans internet. Voir [Discuter avec un téléphone à proximité](#nearby). |
| **Guide d’utilisation** | Ce guide. |
| **Réglages · Settings** | La dernière ligne, avec un engrenage : tout ce que tu peux régler, par groupes, avec une recherche. Voir Réglages ci-dessous. |

Dans une discussion, son nom et son image sont en haut avec la façon dont elle passe : **Chiffré** (de bout en bout),
**En ligne**, **À proximité** tant que son téléphone est relié au tien par radio, ou **écrit…**, avec un chronomètre
quand les messages de la discussion disparaissent. À côté, la tuile bleue avec une caméra lance un appel vidéo et la
verte avec un combiné un appel vocal. Appuie sur le nom, ou sur **⋯** après eux (**⋮** sur Android), pour les
**Détails** de la discussion : son image (appuie dessus pour la changer), **Appeler**, **Vidéo**, **Renommer** et
**Image**, puis **Messages éphémères**, **Apparaître hors ligne**, **Apparence de la discussion**, le **Numéro de
sécurité**, **Déplacer dans les discussions masquées** et **Supprimer les messages**. **Terminé** les ferme.

**Médias, liens et fichiers**, dans les détails sous **Rechercher dans cette discussion**, liste ce que contient la
discussion, chaque type sous son propre onglet avec leur nombre : **Photos** (en grille), **Vidéos**, **Messages
vocaux**, **Musique**, **Fichiers** et **Liens**, les plus récents en premier sous leurs mois, ceux importés de Telegram
ou WhatsApp aussi. Un appui ouvre une photo ou un fichier pour le regarder ou l’enregistrer, joue un son sur place, ou
ouvre un lien après avoir demandé ; en appui long, chacun propose **Voir dans la discussion**, qui va à son message.
Pour un élément pas encore récupéré du relais, on va à lui dans la discussion, où un appui le récupère. Le calendrier en
haut va à un jour : les jours qui ont quelque chose de ce type sont marqués. **Aller à un jour**, en dessous dans les
détails, fait de même pour la discussion elle-même : il va au premier message de ce jour-là.

**Pourquoi :** les listes sont faites sur ce téléphone à partir de ce qu’il garde déjà, si bien qu’aucun serveur
n’apprend ce que contient une discussion ; et seules les photos à l’écran sont lues, comme dans la discussion, si bien
qu’une discussion qui en a des milliers s’ouvre aussi vite qu’une qui n’en a aucune.

Une bonne première heure :

1. Ouvre **Réglages** → **Confidentialité et sécurité** → **Verrou et second mot de passe** et définis un mot de passe,
   pour que personne qui prend le téléphone ne puisse ouvrir Erevos.
2. Ouvre **Téléphones à proximité** depuis le menu sur deux téléphones proches l’un de l’autre, et autorise ce
   qu’Android demande.
3. Ajoutez-vous l’un l’autre avec **Afficher mon code QR**, comme dans [Discuter avec un téléphone à
   proximité](#nearby), et envoie un message : il part à proximité, chiffré de bout en bout, sans relais et sans
   internet.
4. Pour parler de plus loin, configure un relais comme dans [Discuter par un relais](#relay).

### Discussion avec moi-même et rappels

**Discussion avec moi-même** est toujours en haut des discussions, avec une épingle, dans chaque espace. C’est une
discussion où il n’y a personne d’autre : écris-toi des notes, des liens, des photos, des fichiers et des messages
vocaux, comme dans n’importe quelle discussion. Elle ne va à personne d’autre : elle reste chiffrée dans l’espace, et
ne va qu’à tes propres appareils associés, chiffrée de bout en bout, pour que chacun ait les mêmes notes et les mêmes
rappels (voir [Appareils associés](#devices)). Une sauvegarde prend ses notes et ses messages vocaux, mais pas ses
photos ni ses fichiers, comme pour les discussions.

- **Un rappel :** appuie sur **Me rappeler** (la cloche orange à côté de **Nouvelle discussion**), écris de quoi te
  rappeler, choisis une heure (**Dans 1 heure**, **Ce soir 20:00**, **Demain 09:00**, ou n’importe quel jour, heure et
  minute) et appuie sur **Me rappeler**. Il va dans Discussion avec moi-même, avec une cloche et son heure. Dans la
  discussion, **+** → **Me rappeler**, ou maintenir la flèche d’envoi, donne aussi une heure à la note que tu écris.
- **À son heure**, sur Android, le téléphone montre une notification, **Reminder** (ou **3 reminders**) – « Open Chat
  with myself to read it », jamais ce que dit le rappel, même avec Erevos fermé et verrouillé ; quand tu appuies
  dessus, elle ouvre Discussion avec moi-même, après le mot de passe. Tant que tu n’as pas ouvert la discussion, le
  rappel s’affiche sur sa ligne en haut des discussions, avec un compteur, et dans la discussion avec un bord coloré ;
  vu là, il quitte aussi la notification. Sur un ordinateur, dans l’app web, ou avec les notifications désactivées,
  c’est là que tu le vois. Si **Heures exactes** n’est pas autorisé (**Réglages** → **Général** → **Autorisations**),
  Android peut l’afficher avec quelques minutes de retard.
- **Un appui long sur une note** propose **Copier**, **Ouvrir** (une photo ou un fichier), **Me rappeler**, ou **Changer
  le rappel** et **Sans rappel**, et **Supprimer**.
- Chaque espace a sa propre Discussion avec moi-même, et chaque emplacement de discussions masquées aussi, en haut de
  leur liste (voir [Discussions masquées](#hidden)). Les rappels d’un emplacement masqué s’y affichent une fois que son
  code PIN l’ouvre ; le téléphone les signale à leur heure seulement tant que **Recevoir une fois fermées** est activé
  pour cet emplacement, dans la même notification. Un nouveau code PIN pour l’emplacement, qui le recommence vide, ou
  l’emplacement retiré, enlève ses rappels du téléphone. Les notes d’un emplacement masqué ne vont jamais à un
  appareil associé.

**Pourquoi :** une notification s’affiche sur l’écran verrouillé pour quiconque tient le téléphone, donc ce que dit un
rappel reste chiffré dans son espace et Android n’apprend que son heure : la notification ne peut dire à personne ce que
tu voulais te rappeler, ni dans quel espace il se trouve. Et les notes ne vont à personne d’autre qu’à tes propres
appareils, chiffrées de bout en bout entre eux comme tes discussions : le relais ne les transporte que chiffrées.

### Se déplacer par balayage

- **Retour :** balaie vers la droite n’importe où sur un écran pour revenir en arrière, comme le fait la flèche de
  retour. Une flèche ronde sort à gauche ; lâche une fois qu’elle est entière, ou donne un petit coup rapide, et tu es
  revenu. Lâche plus tôt et tu restes. Dans une discussion, le balayage fait ce que fait sa flèche de retour : retour à
  la liste des discussions, ou sortie des discussions masquées, en les fermant. Dans les **Détails** d’une discussion,
  il les ferme.
- **Onglets :** balaie vers la gauche ou la droite pour aller à l’onglet d’à côté, comme en appuyant sur sa puce :
  **Tous**, **SMS**, **Erevos**, **Matrix**, **XMPP** et **Nostr** sur l’écran d’accueil (ceux pour lesquels tu as des
  discussions ou un compte), **Clavier**, **Récents** et **Favoris** dans **Téléphone**, les filtres dans
  **Contacts**, et les séries de stickers. Sur l’écran d’accueil, les puces restent sur une seule ligne : quand elles
  ne tiennent pas toutes, fais glisser la ligne sur le côté pour voir les autres ; celle qui est choisie reste
  toujours visible.
- Sur un écran avec des onglets, un balayage ne fait que changer d’onglet, sur les lignes de sa liste aussi, et au-delà
  du premier ou du dernier onglet il ne fait rien : reviens-y avec la flèche de retour. Une conversation SMS s’archive
  ou se supprime par un appui long.

### Réglages

**Réglages · Settings**, la dernière ligne du menu (les trois points), contient tout ce que tu peux régler dans Erevos,
par groupes, comme le font les réglages du téléphone lui-même. Dans les autres langues, ils portent le nom dans cette
langue et en anglais, comme **Einstellungen · Settings**, pour qu’on les trouve dans une langue qu’on ne sait pas lire.

- **Rechercher dans les réglages,** en haut, trouve un réglage par le début de ses mots, avec ou sans accents, et montre
  où il se trouve, comme **Téléphone et SMS › SMS**. Appuie dessus pour l’ouvrir.
- **Langue · Language,** la ligne sous la recherche, ouvre la liste des langues, voir Langue ci-dessous.
- **Un groupe** ouvre la liste de ses réglages, et un réglage ouvre son écran. Un réglage avec des parties, comme
  **SMS**, les liste, et chaque partie s’ouvre seule.
- **Seul ce qui marche ici s’affiche :** sur un ordinateur, sur Sailfish OS et dans l’app web, il n’y a ni **Téléphone
  et SMS**, ni Tor, ni Nostr, ni LoRa, et un groupe sans rien à régler ici ne s’affiche pas.

| Groupe | Ce qu’il contient |
| --- | --- |
| **Général** | **Langue**, **Mises à jour**, **Donner Erevos à un téléphone proche** (Android), **Nouveautés**, **À propos d’Erevos**, **Soutenir Erevos** et **Autorisations** (Android et l’app web). Voir Langue ci-dessous, [Mises à jour](#updates) et [Erevos vers un téléphone proche](#give-app). |
| **Apparence** | **Style et couleurs** (rendu, verre, style, thème, couleurs et texte sur les zones colorées, avec l’aperçu), **Fond d’écran**, **Messages** (la forme des bulles), **Icônes du lanceur** (Android), **Widget** (Android) et **Vibrer au toucher** (Android). Voir [Apparence](#appearance). |
| **Notifications** | **En arrière-plan** (Android et l’app pour ordinateur) : recevoir et sonner quand Erevos est fermé, et la notification des messages ; sur un ordinateur, si Erevos continue de tourner fenêtre fermée. **Notifications quand l’app est fermée** (l’app web) : Web Push. **Nombre sur l’icône** : combien de messages ne sont pas lus, sur l’icône d’Erevos. Voir [Sur un iPhone](#iphone) et [Sur un ordinateur](#desktop). |
| **Confidentialité et sécurité** | **Verrou et second mot de passe** (verrouiller à l’ouverture d’Erevos, le mot de passe, la confidentialité de l’écran, l’empreinte digitale ou le visage, le second mot de passe), **Discussions masquées** (les codes PIN des 4 emplacements), **Bouton de panique** (avec le mot de passe de panique), **Calculatrice à la place d’Erevos** (Android, dans Apparence), **Captures d’écran** (Android) et **Cette app web** (l’app web seulement). Voir [Verrou par mot de passe](#lock), [Second mot de passe](#second), [Discussions masquées](#hidden) et [Bouton de panique](#panic). Voir aussi [Me supprimer partout](#forget). |
| **Relais et réseaux** | **Relais** (il ouvre **Nouvelle discussion** avec **Pour les utilisateurs avancés** ouvert), **Relais d’attache**, **Tor** (Android), **Nostr** (Android), **Radio LoRa** (Android), **Matrix**, **XMPP** et **Discussions Nostr**. Voir [Discuter par un relais](#relay), [Relais d’attache](#home-relay), [Par Tor](#tor), [Par Nostr](#nostr), [Par une radio LoRa](#lora), [Matrix](#matrix), [XMPP](#xmpp) et [Discussions avec d’autres applis Nostr](#nostr-chats). |
| **Téléphone et SMS** (Android) | **Téléphone**, les réglages de l’app Téléphone, les mêmes que **Téléphone** → **Réglages**. **SMS**, en parties : **Erevos comme app SMS**, **Trouver Erevos derrière un numéro**, **SMS quand rien d’autre ne marche**, **Noms de tes contacts**, **Archivées, spam et corbeille**, **Filtre anti-spam**, **Numéros bloqués**, **Annuler l’envoi d’un SMS**, **Deux SIM** (seulement avec deux SIM) et **Nouveau SMS**. Voir [Téléphone](#phone) et [SMS](#sms). |
| **Données et appareils** | **Sauvegardes**, **Morceaux de sauvegarde**, **Appareils associés** et **Discussions importées**. Voir [Sauvegardes](#backup), [Morceaux de sauvegarde chez des amis](#backup-pieces), [Appareils associés](#devices) et [Discussions importées](#import). |
| **Pour les tests** | **Test du relais** et **Test radio** (Android). Voir [Les écrans de test](#tests). |

### Langue

Erevos est en anglais, en grec, en allemand, en français, en espagnol, en italien, en portugais et en serbo-croate. La
première fois qu’il démarre, il suit la langue du téléphone si c’est l’une de celles-ci (un téléphone en serbe, croate,
bosnien ou monténégrin démarre en serbo-croate), et il est en anglais sinon. Pour la changer, ouvre le menu (les trois
points), appuie sur **Réglages · Settings**, sa dernière ligne, puis sur la première ligne là, **Langue · Language**.
Dans les autres langues, les deux portent le nom dans cette langue et en anglais, comme **Einstellungen · Settings** et
**Sprache · Language**. Appuie ensuite sur la langue, chacune nommée dans ses propres mots : **Ελληνικά**, **English**,
**Deutsch**, **Español**, **Français**, **Italiano**, **Português** ou **Srpskohrvatski**. Toute l’app change aussitôt.

- **Ce guide** est lui aussi dans chacune de ces langues, et nomme les boutons comme l’app les affiche dans la tienne.
  Dans les langues autres que l’anglais et le grec, un mot nouveau dans l’app peut s’afficher en anglais pendant un
  temps, jusqu’à ce qu’il soit traduit.
- **Gardé sur le téléphone :** le choix est gardé sur ce téléphone, hors de tout espace, si bien que l’écran du mot de
  passe s’affiche aussi dans cette langue, et que chaque espace s’ouvre dans cette langue. Il n’est pas scellé :
  quiconque tient le téléphone peut voir quelle langue tu as choisie.
- **Les notifications d’Android** (un appel entrant, de nouveaux messages, Erevos qui reçoit en arrière-plan) sont en
  grec quand Erevos l’est, et en anglais dans toutes les autres langues.

## Discuter avec un téléphone à proximité {#nearby}

Tant qu’un espace est ouvert, sur n’importe quel écran, Erevos cherche d’autres téléphones Erevos autour de lui, par
Bluetooth et, là où le téléphone l’a, par Wi-Fi Aware, et sur le Wi-Fi où il se trouve, téléphones comme ordinateurs. Ni
internet, ni SIM, ni réseau Wi-Fi ne sont nécessaires. Il porte les messages à tes contacts, chiffrés de bout en bout
comme ceux qui passent par le relais.

1. Ouvre **Téléphones à proximité** depuis le menu sur les deux téléphones. La première fois, Android demande
   l’autorisation de trouver les appareils à proximité (sur Android 12 et plus ancien, aussi pour la position) ;
   autorise-la, sinon les téléphones ne peuvent pas se trouver.
2. Si vous n’êtes pas encore contacts, ajoutez-vous l’un l’autre : sur un téléphone, appuie sur **Nouvelle discussion**,
   puis sur **Afficher mon code QR** (sous **Commencer sans relais** tant qu’il n’a pas de relais), et scanne-le avec
   l’autre, comme dans [Discuter par un relais](#relay). Sans relais, le code ne contient que tes clés, et vous ne vous
   joignez qu’à proximité, jusqu’à ce que tu en aies un.
3. Choisis le contact, tape dans la barre de message en bas et appuie sur la flèche d’envoi. Dès que son téléphone
   répond, le haut de la discussion indique **À proximité**.

- **Tant qu’un espace est ouvert :** les liaisons démarrent quand un espace s’ouvre, quel que soit l’écran affiché, et
  s’arrêtent quand un autre espace s’ouvre : verrouillé, l’espace continue derrière l’écran du mot de passe. Un message
  venu d’à proximité s’affiche sur l’écran d’accueil comme un message passé par le relais, et un appel y sonne aussi.
  Sur Android, elles restent actives avec Erevos en arrière-plan, tant que **En arrière-plan** est sur **Recevoir et
  sonner**. Pour y ménager la batterie, il cherche les téléphones moins souvent : Wi-Fi Direct toutes les dix minutes,
  Wi-Fi Aware une minute sur cinq, et sur le même Wi-Fi il écoute les autres vingt secondes toutes les deux minutes. Un
  téléphone à proximité peut donc être trouvé quelques minutes plus tard ; les liaisons établies le restent, et dès
  qu’Erevos s’affiche, il cherche aussi souvent qu’avant.
- **Portée :** quelques dizaines de mètres en plein air, moins à travers les murs.
- **Wi-Fi Aware :** plus rapide, mais tous les téléphones ne l’ont pas. Le Bluetooth fonctionne sur tous. Pour
  l’arrêter, désactive **Chercher avec Wi-Fi Aware**, au-dessus de **Trouver Erevos sur le même Wi-Fi**.
- **Le même Wi-Fi ou un point d’accès :** les téléphones sur un même Wi-Fi, ou sur le point d’accès d’un téléphone, se
  trouvent et se parlent directement, même quand ce Wi-Fi n’a pas internet ; l’app pour ordinateur aussi. Si Android
  demande s’il faut rester sur un Wi-Fi sans internet, reste. Toute personne sur ce Wi-Fi peut savoir qu’une app Erevos
  est là, pas à qui elle est. Le pare-feu d’un ordinateur doit laisser entrer le port 47905 (UDP et TCP). Pour
  l’arrêter, désactive **Trouver Erevos sur le même Wi-Fi** sous **À proximité, sans internet**, dans **Nouvelle
  discussion**.
- **Un Wi-Fi à eux (Android 10 et plus récent) :** sans Wi-Fi commun, deux téléphones Erevos proches l’un de l’autre
  créent un petit Wi-Fi à eux (Wi-Fi Direct) et se parlent par lui comme sur le même Wi-Fi : plus rapide que le
  Bluetooth, et un appel passe par lui sans internet. Il ne demande rien ; chaque téléphone reste aussi sur son propre
  Wi-Fi là où il le peut. Toute personne à proximité peut savoir qu’un téléphone Erevos est là, et pourrait rejoindre ce
  petit Wi-Fi, n’y obtenant que des octets scellés. Il faut que **Trouver Erevos sur le même Wi-Fi** soit activé ; pour
  arrêter celui-ci seul, désactive **Créer un Wi-Fi avec les téléphones à proximité** en dessous.
- **Sur un téléphone Samsung,** **Chercher avec Wi-Fi Aware** et **Créer un Wi-Fi avec les téléphones à proximité** sont
  désactivés tant que tu ne les actives pas : tant qu’une app les utilise, Samsung demande de désactiver son propre
  partage. Le Bluetooth et le même Wi-Fi fonctionnent sans eux.
- **Les autres téléphones à proximité** ne reçoivent que des octets scellés qu’ils ne peuvent pas ouvrir, et seulement
  jusqu’à ce que le téléphone de ton contact soit connu : à partir de là, ce que tu envoies va à lui seul. Les messages
  vocaux ne vont qu’à un contact qu’on sait proche. Les photos et les fichiers ont besoin du relais.
- **Avec un relais en plus,** chaque message passe aussi par lui, si bien que rien n’est perdu si la liaison tombe ; la
  copie qui arrive en second n’est pas affichée de nouveau. Si le relais est injoignable, c’est la copie à proximité qui
  compte.
- **Transportés par d’autres téléphones :** quand le relais est injoignable et que ton contact n’est pas proche, les
  téléphones Erevos à proximité prennent aussi ton message, scellé pour le relais de ton contact. Chacun le garde, trois
  jours au plus, le donne à deux autres téléphones au plus qu’il croise, et le remet à ce relais par son propre relais
  dès qu’il le peut ; le tien fait de même. Ils ne peuvent pas le lire, ni savoir de qui il vient ni à qui il va : ils
  ne voient que l’adresse du relais. Il reste quand Erevos se ferme, scellé sur le téléphone. Les tiens restent dans ton
  espace, et ne partent que tant qu’il est ouvert. Transporter pour d’autres est désactivé tant que tu n’actives pas
  **Transporter des messages pour d’autres** sous **À proximité, sans internet**, dans **Nouvelle discussion**, et alors
  seulement pour des relais sur internet en TLS (wss://) : un inconnu à proximité ne fait jamais joindre à ton
  téléphone, ni à ton relais, un relais sur un réseau local ou sur le téléphone lui-même. Tes propres messages sont
  transportés par les téléphones à proximité qui l’ont activé.

**Pourquoi :** un paquet ne dit pas à qui il est destiné, si bien que personne à proximité ne peut savoir d’après lui à
qui il est. Tant que le téléphone de ton contact n’a pas répondu sur une liaison, ton téléphone ne peut pas non plus
savoir lequel des téléphones à proximité est le sien : les paquets courts vont donc à tous, chacun les essaie, et à
partir du premier qui s’ouvre, cette liaison est celle de ton contact. Un message vocal, en morceaux plus grands, attend
cela.

> Un message venu d’à proximité ne s’ouvre que dans l’espace qui a ce contact. Un message pour un autre espace de ce
> téléphone attend en mémoire, six heures au plus, que cet espace s’ouvre. Un message pour des discussions
> masquées ne s’ouvre que tant qu’elles sont ouvertes, ou reçoivent fermées, et attend de même jusque-là.

**Pourquoi :** les liaisons à proximité appartiennent au téléphone, pas à un espace, et rien sur elles n’en nomme un :
ce qui arrive est essayé dans les discussions de l’espace ouvert, et gardé un moment en mémoire pour les autres, jamais
écrit sur le téléphone. Les discussions masquées les
utilisent aussi, mais ce qu’elles entendent leur est propre : la liaison où un contact masqué a été entendu est gardée à
part de celle de l’espace, en mémoire seulement et seulement tant que ces discussions masquées sont ouvertes ou
reçoivent fermées, si bien que l’espace n’apprend jamais qu’un de leurs contacts est à proximité ; et dans l’air leurs
messages ressemblent à ceux de l’espace. Elles ne portent jamais les messages des autres, ne sont jamais portées, et ne
passent jamais par LoRa ni par SMS.

**Un Bluetooth qu’on ne peut pas suivre :** ce que votre téléphone émet en Bluetooth pour que d’autres le trouvent dit
seulement qu’un téléphone avec Erevos est proche, avec un nombre aléatoire qui change toutes les neuf à douze minutes,
et sous Android 8 et plus depuis une adresse qui change avec lui. Quelqu’un qui écoute à un endroit puis à un autre ne
peut donc pas savoir que c’est le même téléphone, du moins par Erevos. Les liaisons établies le restent. Les téléphones
avec un Erevos plus ancien trouvent le vôtre, et le vôtre les trouve, comme avant.

## Par une radio LoRa {#lora}

Avec une radio LoRa Meshtastic connectée au téléphone par Bluetooth, Erevos joint un autre Erevos qui a une radio sur le
même mesh, à des kilomètres, sans internet : directement, ou par les radios Meshtastic entre les deux. C’est désactivé
tant que tu ne configures pas de radio, et sur Android seulement.

1. Configure d’abord la radio dans l’app Meshtastic, sa **région** avant tout : sans région, elle n’émet rien. Puis
   ferme l’app Meshtastic, ou déconnecte-la là-bas : une radio ne se connecte qu’à une app à la fois.
2. Ouvre **Réglages** → **Relais et réseaux** → **Radio LoRa**, appuie sur **Trouver ma radio**, lis ce qui est dit, et
   appuie sur ta radio quand elle apparaît. Une radio pas encore appairée demande son code PIN : il s’affiche sur
   l’écran de la radio, ou c’est 123456.
3. Ton contact fait de même avec la sienne, sur le même mesh : la même région et le même premier canal.
4. Écris comme d’habitude. Quand le relais est injoignable et qu’aucun téléphone n’est proche, un texte part par LoRa,
   et la ligne sous la discussion le dit.

- **Du texte seulement, et lentement :** un message part en morceaux d’environ 220 octets, chacun une seconde ou deux
  sur les ondes, et la loi limite le temps d’émission d’une radio (dans l’UE, un dixième de chaque heure). LoRa ne prend
  donc que des textes et des suppressions, et seulement quand rien d’autre ne le fait. Les messages vocaux, photos et
  fichiers attendent dans la discussion, marqués **En attente**, et partent tout seuls dès que le relais ou un téléphone
  à proximité peut les recevoir ; les appels ont aussi besoin de l’un des deux. Le premier message à un contact prend
  plus de temps, car il contient les clés.
- **Marques :** **✓✓** arrive avec son prochain message, car les marques seules ne passent pas par LoRa.
- **À toutes les radios à portée :** chaque message est entendu par toutes les radios alentour, et retransmis par les
  radios Meshtastic, comme le fait Meshtastic. Chaque Erevos l’essaie ; seul celui de ton contact l’ouvre. Rien n’est
  transporté pour d’autres par LoRa.
- **Son nom et sa position :** les radios Meshtastic annoncent de temps en temps leur nom à toutes les radios à portée,
  et leur position si elles ont un GPS ou une position fixe, en clair. Erevos empêche la tienne de le faire (**Gardés
  secrets**) : il règle son rôle sur Client hidden, coupe son GPS et supprime une position fixe. Elle répond encore à
  une radio qui demande son nom, alors donne-lui un nom qui ne dit rien de toi, dans l’app Meshtastic. **Annoncés à tous
  à portée** remet son rôle et son GPS, après un avertissement ; une position fixe se redéfinit dans l’app Meshtastic.
  Si la radio ne garde pas les réglages, l’écran LoRa le dit.
- **Elle reste connectée** tant qu’Erevos tourne, et se reconnecte toute seule quand la radio revient à portée.
  **Désactiver LoRa** rend à la radio son rôle et son GPS, si elle est connectée, puis la déconnecte et l’oublie. Les
  discussions masquées ne passent jamais par LoRa.

**Pourquoi :** ce qu’une radio Meshtastic dit d’elle-même part en clair, vers quiconque écoute à des kilomètres : son
nom et sa position pourraient montrer où tu es et relier la radio à toi, donc Erevos la fait taire sauf si tu choisis
autrement. Et comme la loi limite le temps d’émission d’une radio, LoRa est réservé à tes propres textes, quand rien
d’autre ne peut les prendre, jamais à ce que d’autres téléphones voudraient lui faire transporter.

> Une radio LoRa s’entend à des kilomètres, et son signal peut être localisé, qu’elle se taise ou non. Ce qu’Erevos
> envoie reste chiffré de bout en bout, mais quiconque a une radio peut savoir que la tienne émet, quand et combien.
> Avec **Annoncés à tous à portée**, quiconque a une radio peut aussi lire son nom et sa position.

## Discuter par un relais {#relay}

Un relais est un petit serveur qui garde des files d’attente à sens unique : chaque téléphone a sa propre file, et
quiconque a son **lien de contact** peut y déposer des messages. Le relais ne contient ni comptes, ni noms, ni numéros
de téléphone, et ne peut pas lire les messages : ils sont chiffrés de bout en bout, et seuls les deux téléphones ont les
clés. Chaque téléphone peut utiliser son propre relais : un message à un contact sur un autre relais est scellé pour le
sien et remis au tien, qui le transmet, si bien que son relais ne voit jamais l’adresse de ton téléphone. Un téléphone
sans relais obtient une place sur celui de son contact, voir **Pas de relais à toi** ci-dessous.

**Pourquoi :** avec des files d’attente et sans comptes, aucun serveur ne détient une liste de qui connaît qui, et
personne n’a besoin de ton numéro de téléphone ou de ton e-mail pour te joindre : quiconque a ton lien de contact peut
écrire dans ta file, et toi seul la lis.

1. Sur l’écran d’accueil, appuie sur **Nouvelle discussion**. En haut, **Comment tu te connectes maintenant** dit en
   mots simples comment tes contacts te joignent : par ton relais, par Nostr sans relais, ou seulement à proximité. En
   dessous se trouvent les façons d’entrer pour un téléphone qui n’a pas encore de relais, ou, avec un relais, **Ajouter
   un contact** et **Ton lien de contact**. Les réglages propres du relais sont sous **Pour les utilisateurs avancés**,
   en bas ; **Réglages** → **Relais et réseaux** → **Relais** ouvre Nouvelle discussion avec ceux-ci ouverts.
2. Sous **Pour les utilisateurs avancés**, tape l’**Adresse du relais** : \`ws://<adresse de l’ordinateur>:7879\` pour
   un relais sur ton propre réseau, ou \`wss://relay.example.org\` pour un relais sur internet. Ajoute le **Jeton** si
   le relais en demande un.
3. Appuie sur **Créer ma file d’attente sur le relais**. Erevos dit **File d’attente créée sur le relais**, et **Comment
   tu te connectes maintenant** dit **Par ton relais** : tout fonctionne, textes, photos, messages vocaux, appels et
   groupes.
4. Sous **Ton lien de contact**, appuie sur **Afficher mon code QR** : il s’ouvre par-dessus l’écran. Laisse l’autre
   téléphone le scanner avec son appareil photo, puis ouvrir le lien dans Erevos. L’écran **Ajouter un contact** montre
   ce qu’il contient : appuie sur **Ajouter à la discussion** seulement si tu l’as scanné toi-même. **Ajouter et
   associer à un de mes contacts** l’ajoute aussi, relié au contact que tu choisis, dont la discussion prend le nom.
5. Si son appareil photo ne montre que le texte, ou si la personne est loin, appuie sur **Partager mon lien de contact**
   et envoie-le-lui. Elle le colle dans le champ sous **Ajouter un contact** et appuie sur **Ajouter**.
6. Ou dans l’autre sens : sous **Ajouter un contact**, appuie sur **Photographier le code QR** sur son écran, ou sur
   **Choisir une photo du code QR** pour une capture d’écran ou une photo du code qu’elle t’a envoyée. Erevos le lit et
   l’ajoute aussitôt. Sur un ordinateur, sur Sailfish OS et dans l’app web, il n’y a que **Choisir une photo du code
   QR** ; sur un iPhone, il propose aussi l’appareil photo. Les discussions masquées n’ont ni l’un ni l’autre, car une
   photo sort d’Erevos, ce qui les ferme : colle-y son lien.

La nouvelle discussion apparaît sur l’écran d’accueil nommée **contact** suivi des premiers caractères de sa clé,
jusqu’à ce qu’elle ait un nom : **Renommer** dans ses détails lui en donne un. Juste après que tu l’as ajouté ici,
**Associer à un de mes contacts** sous la note qui dit qu’il a été ajouté te permet de choisir plutôt un de tes contacts
(**Pas maintenant** laisse comme c’est) : la discussion prend le nom de ce contact, si elle n’en a pas à elle, et la
fiche du contact montre la discussion. Les discussions masquées ne proposent que leurs propres contacts, jamais ceux du
téléphone. Il suffit qu’un téléphone ajoute l’autre : ajouter un lien démarre une conversation chiffrée et dit à l’autre
téléphone comment répondre, si bien qu’il affiche la discussion la prochaine fois qu’il regarde sa file d’attente, ce
qu’il fait toutes les quelques secondes.

**Ce que le relais voit d’une discussion :** tous tes contacts écrivent dans ton unique file d’attente. Dès que chaque
téléphone a reçu un message de l’autre, chaque message entre eux est scellé une fois de plus pour le téléphone auquel il
va, avec une clé que ce téléphone a donnée dans la discussion, si bien que pour le relais chacun est une suite d’octets
aléatoires de l’une de quelques tailles, et il ne peut pas savoir d’après eux à quelle conversation ils appartiennent.
Le premier message d’une discussion, et tout message envoyé avant que la réponse arrive, le montrent encore. Le relais
voit toujours quelle adresse dépose chaque message, et quand. Et chacun dit au relais, dans un octet qu’il lit, ce qu’il
transporte : un message que quelqu’un lit, des échanges entre téléphones (qu’un message est arrivé ou a été lu, la
saisie, la présence en ligne, les réactions, de nouvelles clés), ou un appel qui sonne. Le relais voit donc lesquels
sont des messages, et quand un appel commence, que les notifications soient activées ou non : c’est ainsi que la
notification d’une app web fermée peut les compter, de même que la notification des discussions masquées fermées.

### Les façons d’entrer sur le relais

Un relais qui demande un jeton laisse entrer un téléphone de trois façons. Chaque façon aboutit à un jeton propre au
téléphone sur ce relais, si bien que celui qui fait tourner le relais peut retirer n’importe quel téléphone à lui seul.

- **Une invitation :** un code QR ou un lien d’un téléphone déjà sur le relais (voir Inviter quelqu’un de nouveau
  ci-dessous). Rien à taper, et vous êtes contacts aussitôt.
- **Un compte :** **Se connecter avec LPHL**, quand le relais le propose (voir Se connecter au relais ci-dessous).
  N’importe quel compte LPHL le peut, sur 10 téléphones au plus.
- **Le jeton du relais :** le jeton unique pour tous, donné par celui qui fait tourner le relais, tapé sous **Jeton**.
  Erevos l’échange aussitôt, tout seul, contre un jeton propre au téléphone, nommé là-bas comme tu te nommes dans les
  invitations (\`phone\` quand tu n’as donné aucun nom), le dit, et n’utilise plus que celui-ci à partir de là. Ce
  téléphone peut donc aussi inviter. Il faut un relais qui accepte les invitations, postérieur à Erevos 3.1.0 ; avec un
  plus ancien, ou un qui n’accepte pas d’invitations, le téléphone garde le jeton du relais et ne peut pas inviter.
- **Les limites :** un téléphone peut avoir 5 invitations en attente à la fois et en créer 10 par jour (le jour selon
  UTC) ; chacune est pour un téléphone et dure 7 jours. Le relais laisse entrer 100 téléphones par invitation en tout,
  les invitations encore en attente comptant aussi, sauf si son opérateur en a décidé autrement. Les téléphones venus
  avec un compte ou avec le jeton du relais ne comptent pas dans ces 100 : le relais donne un jeton propre à 50
  téléphones par jour venus avec son jeton, et un compte a 10 téléphones. Le relais sert 512 connexions à la fois,
  quelles qu’elles soient, sauf si son opérateur en a décidé autrement.
- **Retirer un téléphone :** celui qui fait tourner le relais supprime sa ligne dans le fichier des jetons du relais :
  le téléphone ne peut plus utiliser le relais, ni les téléphones qu’il a invités. S’il a jamais eu le jeton du relais,
  il faut aussi changer ce jeton, pour qu’il ne puisse pas revenir avec. Les téléphones qui ont leur propre jeton
  continuent comme avant : seul un téléphone où l’ancien jeton est encore tapé (pas ouvert depuis, ou avec un Erevos
  plus ancien) a besoin du nouveau.
- **Les discussions masquées** gardent le jeton du relais tapé pour elles : l’échanger au même moment que celui de
  l’espace montrerait au relais qu’elles sont celles de ce téléphone. Quand le jeton du relais change, tape le nouveau
  sous leur **Pour les utilisateurs avancés**.

**Pourquoi :** le relais donne à chaque connexion son propre fil d’exécution, il n’en sert donc qu’un nombre limité à la
fois ; et il n’ajoute qu’un nombre limité de lignes par jour pour les téléphones venus avec son jeton unique, si bien
qu’un jeton parti là où il ne devait pas ne peut pas remplir son fichier de jetons.

### Inviter quelqu’un de nouveau

Un code QR ou un lien fait entrer quelqu’un de nouveau : son téléphone rejoint Erevos sur ton relais, avec un accès à
lui, sans rien taper, et vous êtes aussitôt contacts l’un de l’autre, sans demande de message.

- **Pour inviter :** dans les discussions, sans contact choisi, appuie sur **Inviter quelqu’un**. Tape pour qui c’est
  (son nom dans tes discussions) et, si tu veux, **Ton nom, pour cette personne**, puis appuie sur **Créer
  l’invitation**. Un code QR s’ouvre : une fois Erevos sur son téléphone, la personne le scanne avec l’appareil photo et
  ouvre le lien dans Erevos ; ou bien appuie sur **Partager l’invitation** et envoie-lui le lien. L’invitation est pour
  une personne, pour 7 jours, ou moins quand l’invitation du relais se termine plus tôt. Qui la prend en premier l’a,
  alors ne la donne qu’à cette personne.
- **Pour rejoindre :** sur un téléphone qui n’a pas encore de relais, **Nouvelle discussion** affiche **Choisis comment
  commencer** : appuie sur **J’ai une invitation**. Scanne l’invitation avec l’appareil photo et ouvre le lien dans
  Erevos, ou appuie sur **Prendre une photo de l’invitation** ou **Choisir une photo de l’invitation**, ou colle le lien
  et appuie sur **Rejoindre**. Le lien ouvre **… t’invite sur Erevos** : appuie sur **Rejoindre** seulement s’il vient
  de cette personne. Erevos prend un accès à lui sur son relais et une file d’attente là-bas, l’ajoute et dit
  **Bienvenue sur Erevos**. Son premier message prévient le téléphone de la personne, qui ajoute aussitôt celui-ci comme
  contact, nommé comme elle l’a tapé.
- **Avec un compte plutôt :** **Se connecter avec LPHL**, la deuxième façon d’entrer, connecte ce téléphone au relais de
  LPHL avec un compte LPHL, dans le navigateur (voir Se connecter au relais ci-dessous) ; ajoute ensuite tes contacts
  par leurs invitations ou leurs liens. La troisième, **Commencer sans relais**, se trouve dans Sans aucun relais, sous
  Par Nostr. **Pour les utilisateurs avancés** contient les réglages du relais, comme aux étapes 1 à 6 ci-dessus.
- **Ce que ton relais doit permettre :** l’accès à lui est une invitation à ton relais (voir Invitations au relais
  ci-dessous), donc il ne vient que d’un téléphone qui a son propre jeton sur un relais qui accepte les invitations. Il
  compte parmi tes invitations, sous le nom que tu as tapé pour la personne, et disparaît avec le tien. Un téléphone qui
  a le jeton unique du relais pour tous l’échange d’abord contre un jeton à lui (voir Les façons d’entrer sur le relais
  ci-dessus) ; là où le relais ne le fait pas, il ne crée pas d’invitation : connecte-toi d’abord au relais (sous le
  **Jeton**, dans **Pour les utilisateurs avancés**), ou prends une invitation à celui-ci. Quand ton relais n’accepte
  pas d’invitations, l’invitation fait quand même de vous des contacts, et son téléphone n’utilise ton relais que dans
  la mesure où ton lien de contact le permet, comme dans Pas de relais à toi ci-dessous.
- **Un téléphone qui a déjà un relais** garde le sien : l’invitation ne fait que t’ajouter, et vous êtes aussitôt
  contacts tout de même.
- **Ce qui est gardé :** ton téléphone garde le secret de chaque invitation et le nom de la personne, scellés dans
  l’espace, jusqu’à ce qu’elle soit utilisée ou que ses 7 jours se terminent, 20 au plus à la fois. Rien de tout cela
  n’est sur le relais, sauf l’invitation au relais.
- **Par SMS, à quelqu’un qui n’a pas encore Erevos :** sur Android, la fiche d’un contact qui n’est pas dans Erevos a
  **Inviter par SMS**. Ce bouton écrit un SMS à son premier numéro avec un lien court, dans l’app SMS (celle d’Erevos
  quand c’est l’app SMS du téléphone), que tu envoies ou non. La page du lien sur le serveur web de LPHL propose Erevos
  à la personne (l’app Android, ou l’app web sur un iPhone) puis y ouvre l’invitation ; dans l’app web sur un iPhone,
  elle colle le lien sous **J’ai une invitation**. Elle appuie sur **Rejoindre** : son téléphone rejoint ton relais
  comme ci-dessus et répond au tien par lui, ce qui l’ajoute, reliée à ce numéro et nommée comme sur la fiche. Son
  premier message, qui part tout seul, fait de toi son contact, nommé comme tu t’es nommé dans ta dernière invitation.
  L’invitation suit le **#** dans le lien, qui n’est envoyé à aucun serveur web, mais l’opérateur téléphonique voit le
  SMS, comme tout SMS : elle est donc pour une personne, pour deux jours, et quand les deux jours se terminent sans
  qu’aucun téléphone l’ait utilisée, ton téléphone reprend son invitation au relais. Il faut un relais qui permet à ton
  téléphone d’inviter, comme ci-dessus.

### Pas de relais à toi

Un téléphone sans relais discute tout de même par internet : en ajoutant le lien d’un contact dont le relais prête des
places, il prend une place là-bas, sans jeton.

- **Comment :** ajoute son lien comme aux étapes 4 et 5, sans rien sous **Relais**. Erevos dit que tu as maintenant une
  place sur son relais, prêtée par son lien, et l’utilise désormais comme la tienne : ton propre lien la nomme, si bien
  que d’autres te joignent là aussi.
- **Qui prête :** ton lien porte un ticket pour une place sur ton relais seulement quand tu actives **Partager une place
  sur mon relais avec ce lien**, sous **Ton lien de contact** dans **Nouvelle discussion**, et seulement pour le lien
  affiché à ce moment-là : la prochaine fois que la discussion s’ouvre, c’est de nouveau désactivé. Le relais a besoin
  d’une clé pour l’envoi en deux sauts, et ne prête qu’une fois que celui qui le fait tourner active le prêt ; il peut
  aussi reprendre les places d’un ticket. Un ticket dure 30 jours et donne jusqu’à quatre places. Quiconque voit un lien
  avec un ticket peut prendre une place avec, alors ne donne un tel lien qu’à qui tu le destines.
- **Ce qu’une place prêtée ne fait pas :** les messages à des contacts sur d’autres relais vont directement à leur
  relais, qui voit alors l’adresse de ton téléphone. Elle ne garde rien pour plus tard (un message envoyé plus tard
  attend sur le téléphone), ne donne pas de relais d’appel (les appels passent directement entre les téléphones), et
  crée 4 files d’attente de plus et envoie 50 Mo de fichiers par jour au plus. Ton lien ne prête rien plus loin.
- **Ton propre relais à la place :** tape son adresse sous **Relais** : la place prêtée est rendue, et tes contacts
  apprennent la nouvelle par ton prochain message.
- **Un lien sans ticket** (d’un relais ou d’un Erevos plus ancien) : un relais qui ne demande pas de jeton est utilisé
  tel quel ; sinon vous ne vous joignez qu’à proximité, jusqu’à ce que tu aies un relais.

**Pourquoi :** un lien avec un ticket est une clé de ton relais pour quiconque le voit, donc ton lien n’en porte un que
quand tu le choisis, pour le lien affiché à ce moment-là, et le relais ne prête qu’une fois que celui qui le fait
tourner le permet. Les fichiers d’une place prêtée sont limités à quelques photos et messages vocaux par jour, si bien
qu’elle ne prend jamais tout le stockage du relais.

### Invitations au relais

Un téléphone qui a son propre jeton sur un relais qui accepte les invitations peut laisser un téléphone de plus utiliser
ce relais, avec un jeton propre à ce téléphone, si bien qu’aucun jeton n’est tapé ni transmis.

- **Pour inviter :** sous **Pour les utilisateurs avancés** dans **Nouvelle discussion**, sous le **Jeton**, appuie sur
  **Inviter sur le relais**, tape pour qui c’est et appuie sur **Créer l’invitation**. Un code QR s’ouvre : laisse son
  téléphone le scanner avec son appareil photo et ouvrir le lien dans Erevos, ou appuie sur **Partager l’invitation** et
  envoie-la-lui. Elle vaut pour un téléphone pendant 7 jours, et qui la prend en premier l’a, alors ne la montre qu’à
  cette personne.
- **Pour en prendre une :** le lien ouvre **Invitation à un relais**, avec l’adresse du relais : appuie sur **Utiliser
  ce relais** seulement si elle vient de quelqu’un que tu connais. Dans Erevos, **Photographier le code QR** et
  **Choisir une photo du code QR** sous **Ajouter un contact** lisent aussi une invitation, et son lien peut être collé
  dans le champ là. Erevos crée un jeton pour ce téléphone, le garde avec l’adresse du relais dans cet espace seulement,
  y crée ta file d’attente et dit le nom que le relais a donné au téléphone. Si le téléphone utilise un autre relais, il
  demande d’abord, et tes contacts apprennent ta nouvelle file d’attente par ton prochain message. Erevos accepte une
  invitation à un relais wss://, ou à un relais ws:// sur un réseau domestique seulement (comme
  \`ws://192.168.1.10:7879\`). Les discussions masquées n’acceptent pas d’invitations.
- **Tes invitations :** listées sous le bouton, en attente ou utilisées. **Reprendre** reprend une invitation encore en
  attente, ou coupe aussitôt le téléphone qui l’a prise, et les téléphones qu’il a invités à son tour.
- **Aussi longtemps que le tien :** un téléphone que tu as invité n’utilise le relais que tant que le tien le peut.
  Quand ta ligne disparaît, parce que le téléphone qui t’a invité l’a reprise, que le compte avec lequel tu t’es
  connecté ne peut plus utiliser le relais, ou que son opérateur l’a retiré, les lignes des téléphones que tu as invités
  disparaissent aussi, ainsi que celles des téléphones qu’ils ont invités. Te reconnecter sur ton téléphone les garde.
- **Ce que le relais garde :** le nom que tu as tapé, en lettres latines (Μαρία devient \`maria\`), le fait que tu as
  invité ce téléphone, et une empreinte de son jeton, pas le jeton. Celui qui fait tourner le relais voit cela, et peut
  en retirer n’importe quel téléphone. Un téléphone peut avoir 5 invitations en attente à la fois, et en créer 10 par
  jour, et le relais ne laisse entrer qu’un nombre limité de téléphones par invitation (100, sauf si son opérateur en a
  décidé autrement).
- **Qui peut inviter :** un téléphone qui a son propre jeton, sur un relais dont l’opérateur a activé les invitations
  (voir [Faire tourner ton propre relais](#own-relay)). Un téléphone qui a le jeton unique du relais pour tous l’échange
  d’abord contre un jeton à lui (voir Les façons d’entrer sur le relais ci-dessus). Avec une place prêtée, il n’y a pas
  d’**Inviter sur le relais**.

**Pourquoi :** le relais ne garde qu’une empreinte de chaque jeton, jamais le jeton, si bien que son fichier n’apprend à
personne comment se connecter. Et une invitation nomme un relais wss://, ou un relais ws:// à la maison, si bien qu’elle
ne peut jamais faire partir en clair les requêtes de ton téléphone à travers internet.

### Se connecter au relais

Un relais peut laisser des téléphones se connecter avec un compte auquel son opérateur fait confiance, comme LPHL, pour
obtenir un jeton à eux, sans rien à taper dans Erevos.

- **Pour te connecter :** tape l’adresse du relais sous **Relais**. Quand le relais le propose, **Se connecter avec
  LPHL** apparaît sous le **Jeton**. Appuie dessus : le navigateur ouvre la page de connexion, où tu tapes ton nom et
  ton mot de passe, qu’Erevos ne voit jamais. La page du relais montre alors six chiffres. De retour dans Erevos, qui te
  place directement dans **Code de la page**, tape-les là et appuie sur **Terminer la connexion** : le téléphone garde
  son jeton avec l’adresse du relais dans cet espace seulement, et y crée ta file d’attente. Ne tape le code que dans
  Erevos sur ton propre téléphone et ne le donne à personne, même si on te le demande : qui le tape utilise le relais en
  ton nom. Après 5 codes erronés, la connexion est terminée : reconnecte-toi. Erevos n’ouvre qu’une page de connexion à
  l’adresse propre du relais, en https.
- **Se reconnecter** sur le même téléphone prend la place de sa ligne sur le relais, quand son jeton est celui qu’il a
  obtenu de ce relais. Chaque téléphone obtient sa propre ligne, 10 au plus pour un compte.
- **Ce que voient le relais et LPHL :** le relais nomme la ligne du téléphone d’après ton nom d’utilisateur
  (\`lphl:nekten\`), et chaque heure il demande à LPHL si le compte peut encore l’utiliser : dès que le compte est fermé
  ou désactivé, ou que LPHL ne peut pas être interrogé pendant 3 jours, la ligne disparaît, et le téléphone ne peut plus
  utiliser le relais, ni les téléphones qu’il a invités. LPHL voit chaque connexion et ces vérifications, mais rien de
  tes espaces, discussions ou contacts. Se connecter depuis un autre espace avec le même compte montre au relais que les
  deux sont à toi.
- **Les discussions masquées** ne se connectent pas.

**Pourquoi :** la page montre le code et tu le tapes dans Erevos, pas l’inverse, si bien qu’un lien de connexion que
quelqu’un d’autre t’envoie ne lui apporte rien : seul celui qui s’est connecté voit le code, et cinq codes erronés y
mettent fin. Erevos n’ouvre une page de connexion qu’à l’adresse propre du relais, en https, si bien que rien qui répond
à la place du relais ne peut t’envoyer vers une page ailleurs. Et un fournisseur qu’on ne peut pas interroger pendant un
moment ne coupe aucun téléphone aussitôt : seuls 3 jours sans bonne réponse le font.

### La clé propre du relais

Dès qu’Erevos connaît la clé de ton relais (il la demande au relais la première fois, ou un lien de contact la donne),
chaque connexion à ce relais commence par une vérification : le relais doit prouver qu’il détient cette clé, et le jeton
et tout ce qui suit partent chiffrés pour cette clé, à l’intérieur du chiffrement propre de la connexion (TLS). Sous
**Comment tu te connectes maintenant**, Erevos dit alors que ton relais a prouvé sa propre clé. À partir de là, cet
espace ne joint jamais ce relais sans la vérification.

- Un relais plus ancien que cette app ne prouve rien : il fonctionne comme avant, et **Comment tu te connectes
  maintenant** dit qu’il est plus ancien. Erevos réessaie toutes les heures.
- Un relais qui ne peut pas prouver la clé qu’Erevos garde pour lui n’obtient rien, et tes messages attendent ;
  **Comment tu te connectes maintenant** le dit en rouge. Seulement si son opérateur t’a dit qu’il a une nouvelle clé,
  appuie sur **Il a une nouvelle clé** : Erevos prend alors la clé que le relais donne ensuite.

**Pourquoi :** le certificat de la connexion dit seulement que celui qui répond détient un certificat pour le nom du
relais, ce qu’une entreprise qui délivre des certificats peut aussi donner à quelqu’un d’autre, par erreur ou sous la
contrainte. La clé propre du relais n’est que sur son serveur, si bien que personne entre les deux ne peut se faire
passer pour lui, et un certificat renouvelé ne change rien.

### Le numéro de sécurité

Ouvre la discussion, appuie sur son nom puis sur **Numéro de sécurité**. Les deux téléphones montrent les mêmes 60
chiffres pour vous deux. Compare-les en personne ou lors d’un appel : s’ils correspondent, personne n’est entre vous.
S’ils diffèrent, ne fais pas confiance à cette discussion, et ajoute de nouveau le lien, scanné depuis son propre
téléphone. Dès que ton contact a associé un appareil, il dit aussi quand la liste de ses appareils a changé pour la
dernière fois : tes messages vont aussi à chaque élément de cette liste, donc s’il n’a pas associé ou dissocié
d’appareil à ce moment-là, demande-lui.

Côte à côte, vous pouvez vérifier avec des codes au lieu de lire les chiffres : sous le numéro, chaque téléphone
montre un code QR. Touchez **Photographier son code** et photographiez le code de son téléphone, puis laissez-le faire
de même avec le vôtre. Quand ça correspond, la ligne indique **Vérifié en personne**. Chaque téléphone marque l’autre
seulement d’après ce qu’il a vu lui-même, et rien n’est envoyé. S’il dit que ça ne correspond pas, quelqu’un est
peut-être entre vous : ne faites pas confiance à cette discussion. **Choisir une photo de son code** vérifie à la
place une photo de son code que vous avez déjà. La marque **Vérifié en personne**, avec le jour, reste jusqu’à ce que
vous touchiez **Retirer la marque**. Elle reste sur ce téléphone, suit la discussion quand elle entre dans les
discussions masquées ou en sort, et n’est pas transmise à vos appareils associés. Un code d’un Erevos plus récent le
dit : mettez Erevos à jour, puis refaites la photo.

**Pourquoi :** le code ne contient qu’un hash de vos deux clés, dans un ordre qui distingue les deux téléphones : une
photo de votre propre écran ne vérifie donc rien, et une photo du code ne dit pas qui vous êtes à quelqu’un qui n’a
pas déjà les deux clés.

### Présenter deux contacts

Dans les détails de la discussion d’un contact, **Présenter à un contact** vous laisse choisir un autre de vos contacts
et **Demander aux deux**. Chacun est sollicité dans votre discussion avec lui, par un message qui nomme l’autre comme
vous l’avez nommé ; les deux doivent avoir un nom. Chacun répond **Dire oui** ou **Dire non** dans cette discussion. Ils
ne deviennent contacts que si les deux disent oui : celui depuis la discussion duquel vous avez fait la présentation
écrit en premier, et le téléphone de l’autre l’accepte aussitôt, nommé comme vous l’avez nommé. Si l’un dit non, rien ne
se passe, et l’autre n’en est pas informé. Une présentation attend une semaine.

**Pourquoi :** tout passe dans le chiffrement de vos discussions avec chacun, si bien qu’aucun relais ne voit qui est
présenté à qui. Vous ne transmettez que le lien de contact que le second a choisi de donner, après avoir dit oui. Comme
celui qui présente pourrait faire passer quelqu’un d’autre, comparez le numéro de sécurité avec le nouveau contact comme
avec tout autre.

### Envoyé, arrivé et lu

Sous chacun de tes messages à un contact, **✓** dit que le relais ou un téléphone à proximité l’a pris, **✓✓** qu’il est
arrivé sur son téléphone, et **✓✓✓** qu’il l’a lu. Son téléphone le dit au tien, à l’intérieur du chiffrement, la
prochaine fois que chacun regarde le relais, ou aussitôt quand vous êtes proches. Un message compte comme lu dès que sa
discussion s’affiche à l’écran.

Dans un groupe qui n’est pas public, tes messages ont les mêmes marques, pour tous les autres membres à la fois :
**✓** une fois envoyé, **✓✓** quand le message est arrivé sur le téléphone de chaque membre qui était dans le groupe
quand tu l’as envoyé, et **✓✓✓** quand tous l’ont lu. Le téléphone de chaque membre le dit au tien, dans un message de
groupe discret destiné à toi seul, chiffré de bout en bout comme le reste du groupe : que le message est arrivé,
quelques secondes après (avec les autres arrivés entre-temps, en un seul), et qu’il a été lu, dès que le groupe
s’affiche à l’écran. Maintiens un de tes messages et choisis **Qui l’a lu** pour voir qui l’a lu et quand, sur le
téléphone de qui il est arrivé et quand, et qui n’a encore fait ni l’un ni l’autre, sous **Pas encore**. Un membre
dont l’Erevos est plus ancien que ces marques ne dit rien, donc il reste sous **Pas encore** et le message reste à
**✓**. Les groupes publics n’ont pas de marques. Un ordinateur associé à ce téléphone montre les mêmes marques.

- **Envoi… :** au moment où tu appuies sur Envoyer, le téléphone vibre brièvement, le champ se vide et le message
  s’affiche, marqué **Envoi…** jusqu’à ce que le relais ou son téléphone le prenne. S’il ne peut ni partir ni attendre,
  ses mots retournent dans le champ.
- **En attente :** un message que rien n’a pu prendre, parce que le relais est injoignable et que son téléphone n’est
  pas proche, reste dans la discussion marqué **En attente**, et part tout seul, dans l’ordre, dès que le relais ou son
  téléphone à proximité peut le prendre, tant qu’un espace est ouvert ; il affiche alors **✓**. Un texte attend
  aussitôt. Un message vocal, une photo ou un fichier demande d’abord : **Laisser en attente** ou **Supprimer**. Un
  message en attente n’est supprimé que sur ce téléphone. Dans les discussions masquées, il attend aussi, mais ne passe
  que par leur relais, jamais vers le téléphone à proximité ni par LoRa : tant qu’elles sont ouvertes, ou, avec
  **Recevoir une fois fermées** activé, tant que l’espace est ouvert. Quand la file d’attente du contact sur le relais
  est pleine, un texte, un message vocal, une photo ou un fichier va tout de même à ses appareils associés, s’il en a,
  s’affiche comme envoyé, et est retenté pour son téléphone tant que les discussions masquées restent ouvertes : si
  elles sont fermées avant qu’il soit parti, son téléphone ne le reçoit jamais.
- **Envoyer plus tard :** maintiens la flèche d’envoi et choisis **Plus tard…**, ou appuie sur **+** puis sur **Envoyer
  plus tard**. Choisis une heure d’un appui (**Dans 1 heure**, **Ce soir 20:00**, **Demain 09:00**) ou le jour, l’heure
  et les minutes, jusqu’à un an à l’avance, puis **Envoyer plus tard**. Le message reste dans la discussion marqué
  **Programmé** avec son heure. Il part chiffré vers le relais, qui le garde et l’envoie à cette heure, même si ce
  téléphone est alors éteint ou verrouillé, et son téléphone l’affiche à partir de cette heure, pas avant. Sans relais
  joignable maintenant, il attend sur ce téléphone et part vers le relais dès qu’on peut en joindre un. Sans rien de
  tapé, l’heure que tu choisis vaut pour la prochaine photo, le prochain fichier ou message vocal : une photo ou un
  fichier part aussitôt vers ton relais et y reste jusqu’à ce que la personne le prenne, 14 jours après son heure au
  plus. Les discussions masquées l’ont aussi, de la même façon, par leur relais. Jusqu’à son heure, supprime-le pour le
  reprendre au relais, et il ne part jamais. Si sa file d’attente sur le relais change d’ici là, Erevos le retient de
  nouveau pour la nouvelle la prochaine fois qu’il joint le relais. Avec un jeton propre à ce téléphone, il ne part que
  si le téléphone a encore sa ligne sur ce relais à ce moment-là. Un message sans son reste sans son. Un relais d’avant
  cela ne garde rien pour plus tard : le message attend alors sur ce téléphone et part à son heure tant qu’Erevos
  tourne, en arrière-plan aussi tant que **En arrière-plan** est sur **Recevoir et sonner** (ci-dessous), ou à la
  prochaine ouverture d’Erevos.
- **Message de sécurité :** écris-le, appuie sur **+** puis sur **Message de sécurité**, et choisis combien de temps :
  6 ou 12 heures, 1, 2 ou 3 jours, ou une semaine. Il part aussitôt vers le relais, comme un message envoyé pour plus
  tard, et le relais l’envoie tout seul à cette heure. Chaque fois que tu ouvres Erevos, après son mot de passe, il est
  repoussé d’autant, donc il ne part que si tu n’ouvres pas Erevos à temps : si le téléphone est perdu, pris, cassé ou
  coupé d’internet, ou s’il t’est arrivé quelque chose. Erevos qui tourne en arrière-plan ne le repousse pas, ni son
  écran de mot de passe, ni une fenêtre laissée ouverte que personne n’a touchée ni dans laquelle personne n’a écrit
  depuis 10 minutes. Dans les discussions masquées, il est repoussé tant que leur place reçoit, ou quand tu l’ouvres.
  Dans la discussion, il est marqué **Message de sécurité** avec l’heure à laquelle il partirait ; supprime-le pour
  l’arrêter. Écris-le de façon qu’il dise ce qu’il est : chez ton contact, il arrive comme un message ordinaire. Si le
  relais est injoignable quand tu ouvres Erevos, il garde son heure. Il est chiffré une seule fois et repart vers le
  relais tel quel à chaque fois qu’il est repoussé, donc il ne coûte rien à ta discussion.
  **Pourquoi :** un message gardé par le relais n’a besoin de rien de ce téléphone pour partir, donc personne qui
  prend le téléphone ne peut l’arrêter, sauf en ouvrant Erevos avec son mot de passe.
- **Envoyer sans son :** maintiens la flèche d’envoi et choisis **Sans son** : son téléphone affiche la notification
  sans son ni vibration. Un Erevos d’avant cela ne le sait pas et sonne comme d’habitude, tout comme Erevos en app web,
  dont la notification vient du navigateur. De même pour la notification d’un emplacement de discussions masquées fermé,
  avec **Prévenir quand un message arrive** activé, et d’un espace fermé avec **Aussi quand un autre espace est
  ouvert** : celles-ci demandent seulement au relais combien sont arrivés, et il ne peut pas distinguer un message sans
  son d’un autre, car seul le message chiffré le dit.
- **Liens :** une adresse web dans un message est soulignée. Appuie dessus et Erevos la montre en entier, pour l’ouvrir
  dans le navigateur seulement si c’est là que tu veux aller. Rien n’est chargé avant cela.
- **Partager depuis une autre app** (Android) : dans **Partager** d’une autre app, comme celui du navigateur pour une
  page, choisis **Erevos**. Dès qu’un espace est ouvert, **Envoyer à** liste les discussions, groupes et conversations
  SMS que l’écran d’accueil a montrés en dernier, puis toutes les autres discussions et tous les autres groupes, avec
  une recherche ; jamais les discussions masquées. Les mots et les liens s’ouvrent dans le champ de message de celui que
  tu choisis, à relire et envoyer là ; une photo ou un fichier (100 Mo au plus) part dès que cette discussion ou ce
  groupe s’ouvre, une photo à la qualité que tu as choisie pour les photos, et jamais en SMS. D’ici là, sa copie attend
  dans le stockage propre d’Erevos sur le téléphone, et disparaît une fois envoyée, ou quand tu quittes **Envoyer à**.
- **Ton contact voit quand tu lis :** ton téléphone le dit au sien, comme le sien le dit au tien, sauf si cette
  discussion apparaît hors ligne (ci-dessous).
- **Quand les messages arrivent :** Erevos regarde le relais toutes les quelques secondes tant qu’il est ouvert et
  déverrouillé, sur n’importe quel écran, et l’écran d’accueil remonte la discussion en haut tout seul. Sur Android,
  chaque nouveau message sonne, avec une notification qui dit seulement combien sont arrivés, même quand Erevos est
  affiché ; dans la discussion ou le groupe ouvert à l’écran, seul le son joue, et ouvrir une discussion retire du
  compte ce qui y est arrivé. La saisie, et le fait qu’un message est arrivé ou a été lu, n’en déclenchent aucune. Sur
  Android, cela continue aussi en arrière-plan, tant que **En arrière-plan** est sur **Recevoir et sonner**
  (ci-dessous) : là, il attend au relais que quelque chose arrive, une minute à la fois, au lieu de demander toutes les
  quelques secondes, et ne demande rien de plus quand rien n’est arrivé, si bien que la batterie tient, et une
  notification dit seulement combien de messages sont arrivés. Fermé, verrouillé, ou longtemps en arrière-plan
  autrement, il ne le fait pas : les messages attendent sur le relais, jusqu’à 14 jours, et arrivent dès qu’Erevos
  s’ouvre de nouveau. Une question au relais sans réponse à temps (une attente là-bas, sa minute plus une demi-minute ;
  toute autre chose, 45 secondes ; une partie de fichier, 2 minutes) compte comme échouée et est reposée, si bien qu’une
  connexion morte en route, comme quand le réseau du téléphone s’endort ou change, ne retient rien.

### En ligne, et apparaître hors ligne

Tant que la discussion d’un contact est ouverte sur ton écran, Erevos demande de temps en temps à son téléphone s’il est
ouvert, et dit que le tien l’est. Si le sien l’est, la discussion indique **En ligne** sous son nom avec un point vert,
et l’écran d’accueil montre le point sur son image. Écrire à quelqu’un te montre aussi en ligne pour cette personne
pendant deux minutes. Tout cela passe à l’intérieur du chiffrement, seulement entre toi et ce contact : le relais voit
un message de temps en temps, comme pour n’importe quelle discussion. Il n’y a pas de « vu pour la dernière fois ».

Pendant que tu écris à un contact qui apparaît en ligne, sa discussion montre **écrit…** sous ton nom pendant quelques
secondes, et la tienne sous le sien quand il écrit. C’est dit toutes les quelques secondes au plus, seulement tant qu’il
apparaît en ligne, jamais à une demande de message, et pas dans les groupes.

**Pourquoi :** être en ligne n’est dit qu’entre toi et un contact dont la discussion est ouverte, à l’intérieur du
chiffrement, si bien que le relais ne voit pas plus qu’un message de temps en temps entre deux personnes qui se parlent,
et rien n’en est gardé : il n’y a donc pas de « vu pour la dernière fois » à montrer. Quelqu’un qui n’a que ton lien, et
qui écrit en tant que demande de message, n’apprend rien en retour tant que tu n’acceptes pas : ni que tu as lu, ni que
tu es en ligne ou que tu écris.

Pour le cacher à un contact, ouvre sa discussion, appuie sur son nom puis sur **Apparaître hors ligne**. Quand c’est
activé :

- **Il ne te voit pas en ligne**, ni que tu écris, et ton téléphone ne lui envoie rien pendant que tu lis.
- **Ses messages restent à ✓** sur son téléphone, pas ✓✓ ni ✓✓✓, pendant que tu les lis.
- **Quand tu lui écris**, tu apparais en ligne pendant deux minutes, et chacun de ses messages que tu as lus passe
  aussitôt à ✓✓✓.
- **Tu ne le vois pas en ligne non plus**, puisque ton téléphone ne demande pas.

C’est réglé pour chaque discussion, sur ce téléphone seulement. Désactive-le de nouveau et il voit ce que tu as lu à ton
prochain passage sur le relais.

### Noms et suppression

Ouvre une discussion, appuie sur son nom puis sur **Renommer** pour lui donner un nom. Le nom reste sur ce téléphone,
scellé avec la discussion : l’autre téléphone ne le voit pas. Un nom vide ramène le début de sa clé, sauf si l’un de tes
contacts lui est associé : la discussion reprend alors son nom la prochaine fois que sa fiche s’ouvre, tant que
l’association reste (voir [Contacts](#contacts)).

Appuie sur son nom puis sur **Image** pour lui donner une image de ton choix, un signe sur une couleur, au lieu de celle
dessinée à partir de sa clé. Ou appuie sur **Photo** (ou **Prendre une photo**) pour une photo : recadrée en carré,
réduite et redessinée, si bien que rien de ce qu’elle disait en plus de son image (un lieu, un téléphone) n’est gardé,
puis scellée dans un fichier à elle. Elle aussi reste sur ce téléphone, et va dans les sauvegardes ; **Image tirée de sa
clé** ramène celle qui est dessinée.

Chaque discussion peut aussi avoir son propre aspect : appuie sur son nom puis sur **Apparence de la discussion** pour
les mêmes choix que dans **Apparence** (style, thème, couleurs, fond d’écran, messages), pour cette discussion
seulement. Comme le nom, cet aspect reste sur ce téléphone, scellé avec la discussion. **Comme l’app** lui redonne
l’aspect de l’app.

Pour garder une discussion hors d’Erevos, appuie sur son nom puis sur **Exporter la discussion** : ses messages vont
dans un fichier texte, chaque jour sous sa date et chaque message avec son heure et son auteur, enregistré dans le
dossier que tu choisis (sur un ordinateur, là où tu choisis). Le fichier n’est pas chiffré : quiconque l’a, ou toute app
qui lit ce dossier, peut le lire. Les photos, fichiers et messages vocaux sont seulement nommés, les messages qui
disparaissent sont exclus, et les discussions masquées ne sont pas exportées, pour qu’aucun fichier hors d’Erevos ne
montre qu’elles sont là.

**Pourquoi :** un message qui disparaît est exclu, de même qu’une citation de celui-ci, car son expéditeur voulait qu’il
disparaisse, pas qu’il reste dans un fichier.

Pour supprimer un message, appuie longuement dessus et appuie sur **Supprimer**. Pour supprimer tous les messages d’une
discussion, appuie sur son nom puis sur **Supprimer les messages**. Dans les deux cas, Erevos demande où :

- **Ce téléphone :** seulement ici. L’autre téléphone garde les siens.
- **Les deux téléphones :** son téléphone les supprime aussi, la prochaine fois qu’il regarde le relais. Son Erevos le
  fait, mais une app modifiée, une capture d’écran ou une copie peut encore les garder.

### Supprimer et bloquer un contact

Appuie sur le nom d’une discussion puis sur **Supprimer le contact** pour l’oublier : sa discussion disparaît de ce
téléphone, et Erevos te donne aussitôt une nouvelle file d’attente sur le relais. Tes autres contacts en sont informés
discrètement, dans un message vide, et de nouveau 7, 14 et 21 jours plus tard tant qu’ils n’ont pas écrit dans la
nouvelle ; ce qu’ils ont écrit dans l’ancienne entre-temps s’affiche encore pendant 14 jours. Celui que tu as supprimé
n’est pas informé, et rien de ce qu’il y envoie ne s’affiche. Ton lien de contact reste tel quel, si bien qu’il peut
encore demander à reparler avec, en demande de message, comme quiconque l’a.

**Pourquoi :** tous tes contacts écrivent dans ton unique file d’attente, donc celui que tu supprimes sait encore où
elle est ; une fois qu’elle a bougé, il ne peut plus t’y écrire, pas plus que celui qui a envoyé les indésirables
ci-dessous. Ton lien de contact nomme une file à lui, qu’une suppression ne touche pas, si bien que chaque lien et code
QR que tu as donné continue de fonctionner.

**Une file pour chaque contact :** sur un relais mis à jour pour cela, chaque contact écrit dans sa propre file, que lui
seul connaît, indiquée à l’intérieur de tes messages chiffrés ; la file de ton lien de contact ne sert alors qu’aux
premiers messages. Le relais ne peut donc pas savoir, d’après la destination des messages, que deux contacts écrivent au
même téléphone, et supprimer ou bloquer quelqu’un ne supprime que sa file : la tienne ne bouge que s’il la connaissait
aussi, comme c’est le cas des contacts d’avant cela, et de quelqu’un venu par ton lien de contact avant son premier
déplacement. Les contacts d’avant reçoivent à leur tour une file à eux, quelques-uns à la fois, discrètement, et un
Erevos d’avant chez eux la prend aussi. Ces files se lisent sans jeton, si bien que le jeton, qui nomme ton téléphone,
ne les relie pas entre elles ; par Tor, huit à la fois, chaque groupe de huit sur ses propres circuits. Elles sont tout
de même créées et supprimées avec le jeton, si bien qu’un relais qui garde des journaux peut alors les relier. Les
discussions masquées et les ordinateurs associés gardent une file pour tout le monde, pour l’instant. L’app web n’a pas
Tor, donc tant qu’elle est ouverte, elle attend sur les files de tous tes contacts ensemble, depuis une seule adresse ;
avec les notifications quand l’app est fermée activées, ton relais a aussi une adresse push pour les files de tous tes
contacts (voir [Sur un iPhone](#iphone)).

- **Bloquer le contact**, en dessous, fait de même, et rejette aussi ce qu’il envoie ensuite, une demande aussi.
  **Bloquer**, à côté de **Refuser**, bloque une demande de message : une demande ne connaît que ton lien de contact,
  donc elle ne déplace ta file que tant que le lien nomme encore celle-ci, comme c’est le cas jusqu’à ton premier
  déplacement. Ceux que tu as bloqués sont sous **Contacts bloqués** dans **Nouvelle discussion**, avec **Débloquer**.
  Les ajouter de nouveau depuis leur lien te demande d’abord de les débloquer ; d’ici là, rien ne les ajoute, ni leur
  réponse à une invitation par SMS ni leur lien de contact dans un groupe. Chaque personne qui écrit depuis ton lien de
  contact peut faire sonner le téléphone, comme tout message : **Refuser** ou **Bloquer** arrête celle-là,
  **Notifications** → **En sourdine** dans sa discussion la fait taire sans la refuser, et **Nouveau lien de contact**
  arrête quiconque a l’ancien lien une fois ses 14 jours passés.
- **Groupes :** quelqu’un dans l’un de tes groupes peut encore t’y écrire. Erevos dit dans combien de groupes vous êtes
  ensemble : quitte-les, ou demande à leur admin de le retirer.
- **Quand le relais est injoignable**, la file change dès qu’il répond, et d’ici là rien de ce qu’il envoie ne
  s’affiche.
- **Les messages programmés** que tu avais pour lui sont repris au relais, aussitôt ou dès qu’il répond, si bien qu’ils
  ne partent jamais.
- **Indésirables :** quand ta file se remplit de ce qui n’est pour personne ici, Erevos t’en donne une nouvelle de la
  même façon et le dit, au plus une fois par jour. Quand des indésirables remplissent la file que nomme ton lien de
  contact, tu obtiens plutôt un nouveau lien. Un déluge de demandes de message inventées compte aussi comme indésirable,
  tandis qu’un lot de vraies demandes arrive quand même.
- **Nouveau lien de contact**, à côté de **Partager mon lien de contact**, te donne un nouveau lien : les liens et codes
  QR que tu as donnés avant fonctionnent encore 14 jours, puis plus du tout. Tes contacts ne sont pas touchés. Si le
  relais perdait la file que nomme ton lien, tu obtiendrais un nouveau lien de la même façon, mais ceux que tu as donnés
  avant cesseraient aussitôt de fonctionner.
- **Lien pour un site web**, à côté, dans les discussions de l’espace, te donne un lien à mettre sur une page web, comme
  ta page de contact, avec le nom que tu choisis. Il ouvre une page qui propose Erevos à qui ne l’a pas encore, sur
  Android, un iPhone ou un ordinateur, puis t’ajoute. Quiconque le voit peut t’écrire, donc ce qu’on envoie arrive comme
  demande de message, que tu acceptes, refuses ou bloques. Il ne donne aucune place sur ton relais et vaut tant que ton
  lien de contact vaut : **Nouveau lien de contact** l’annule aussi.
- **Sur un ordinateur associé**, cela passe par le téléphone, qui le supprime ou le bloque aussi et déplace ses files,
  celle de l’ordinateur aussi. Le téléphone garde qui est bloqué et le dit à l’ordinateur : l’y ajouter depuis son lien
  te demande aussi de le débloquer, et **Débloquer** le débloque aussi sur le téléphone.
- **Dans les discussions masquées**, seules les files de cet emplacement bougent, sa file de sonnerie aussitôt, si bien
  que celui que tu as supprimé ne peut plus faire sonner le téléphone. Rien de l’espace ni des autres emplacements ne
  bouge.

Le **Supprimer** de la fiche du contact (voir [Contacts](#contacts)) n’enlève que la fiche, pas la discussion. Une
sauvegarde faite avant une suppression ou un blocage ramène ce contact : supprime-le ou bloque-le de nouveau après
l’avoir restaurée. Une fois restaurée, ta file dit qu’elle est plus récente que toutes celles que tes contacts
connaissent, et chacun en est de nouveau informé, si bien qu’ils écrivent tous là où tu lis.

### Le menu d’un message

Appuie longuement sur un message pour ouvrir son menu : les réactions en haut, puis ce que tu peux en faire.

- **Réactions :** appuie sur l’une, ou sur **+** pour en avoir plus. Elle s’affiche sous le message sur les deux
  téléphones, la tienne en surbrillance ; appuie de nouveau dessus pour la retirer. Chacun de vous a une réaction sur un
  message. Elle part aussitôt, ou pas du tout : quand ni le relais ni son téléphone à proximité ne peuvent la prendre,
  rien ne change.
- **Répondre :** ton prochain message y répond, et l’affiche cité au-dessus de tes mots, sur les deux téléphones. Appuie
  sur la citation pour aller au message auquel elle répond ; **✕** la retire. Un Erevos d’avant cela affiche la réponse
  sans la citation.
- **Transférer :** en envoie une copie dans une autre discussion : choisis un contact, ou un groupe. Ses mots, son
  sticker ou son lieu repartent de zéro, un sondage comme un nouveau sondage sans réponses encore, et le son d’un
  message vocal ou les octets d’une photo ou d’un fichier sont envoyés de nouveau, chiffrés avec une nouvelle clé, si
  bien que rien ne relie la copie au message d’origine. La copie indique **Transféré** en dessous, pas d’où ; un Erevos
  d’avant cela l’affiche sans cette mention. Un message qui disparaît n’est pas transféré, et depuis les discussions
  masquées un message ne va que vers les mêmes discussions masquées.
- **Ajouter une étoile :** lui ajoute une étoile, sur ce téléphone seulement, pour le retrouver : **Messages avec
  étoile** dans le menu de l’écran d’accueil les liste depuis toutes tes discussions, et les détails d’une discussion
  listent les siens. Un appui va au message. Les messages avec étoile des discussions masquées ne s’affichent que dans
  les détails de leurs discussions.
- **Épingler :** l’épingle en haut de la discussion, sur les deux téléphones ; chacun de vous peut le **Désépingler**.
  Avec plus d’un message épinglé, le dernier s’affiche ; appuie dessus pour y aller, et le suivant s’affiche.
- **Copier :** met ses mots dans le presse-papiers, pour les coller dans une autre app. Sur Android, la copie est
  marquée privée, si bien que la notification du téléphone à son sujet ne montre pas les mots, mais toute app qui lit le
  presse-papiers peut les lire.
- **Modifier :** pour un message à toi, jusqu’à un jour après l’avoir envoyé. Ses mots vont dans le champ sous
  **Modifier le message** : change-les et envoie, ou **✕** pour le laisser tel qu’il était. Les deux téléphones montrent
  les nouveaux mots, avec **Modifié** à côté de l’heure. Seuls les mots se modifient, pas un sticker, un lieu, un
  sondage, un message vocal, une photo ou un fichier, ni des mots que tu as transférés. Un message qui attend encore de
  partir part avec les nouveaux mots, sans marque ; un message programmé pour plus tard ne se modifie pas. La
  modification part aussitôt, ou pas du tout, comme une réaction, et tes appareils associés la montrent aussi. Un Erevos
  d’avant cela garde les anciens mots. **Pourquoi :** un jour suffit pour corriger une erreur, et personne ne peut
  changer ce qu’il a dit il y a des jours. La marque montre que les mots ne sont pas les premiers.
- **Supprimer :** sur ce téléphone, ou sur les deux, comme ci-dessus.

Les réactions, réponses, épingles et modifications voyagent à l’intérieur du chiffrement, comme les messages.

### Comment les mots s’affichent

Les marques tapées autour des mots changent leur aspect, dans les discussions et les groupes, comme dans WhatsApp et
Signal : \`*gras*\`, \`_italique_\`, \`~barré~\`, un mot entre accents graves comme code (trois accents graves autour de
lignes pour un bloc de code) et \`||mots||\`, cachés derrière une barre grise jusqu’à ce que vous touchiez, sur l’écran,
dans la ligne de l’écran d’accueil et dans une citation (là sous la forme ▒▒▒).

- **Seulement autour de mots :** une marque compte quand elle commence un mot et en termine un, donc \`2*3*4\`,
  \`snake_case\` et les adresses web restent tels quels. Le gras, l’italique et le barré restent sur une ligne.
- **Les autres voient les marques :** un Erevos d’avant et d’autres apps montrent les mots avec leurs marques, tels
  que tapés.
- **Photo cachée :** sous **+**, **Photo cachée** envoie une photo qui apparaît floue dans la discussion, dans les
  discussions avec les contacts et dans les groupes, jusqu’à ce qu’on la touche, et elle s’ouvre alors toute seule.
  Dans **Médias, liens et fichiers**, elle apparaît floue aussi. Un Erevos d’avant la montre comme n’importe quelle
  photo.

**Pourquoi :** une marque tapée dans les mots voyage avec eux, à l’intérieur du chiffrement, sans rien à côté qui la
distingue.

### Messages éphémères

Ouvre une discussion, appuie sur son nom puis sur **Messages éphémères** pour choisir combien de temps ses nouveaux
messages durent une fois lus : 5 minutes, 1 heure, 1 jour ou 1 semaine. Pour ne faire disparaître que le prochain
message, appuie sur le chronomètre à côté du champ de message (ou sur **Message éphémère** sous **+**, ou sur
**Éphémère** dans le menu de la flèche d’envoi) : **Disparaît 1 heure après lecture** s’affiche au-dessus du champ.
Appuie sur la durée pour en choisir une autre, ou sur **✕** pour le désactiver. Il part avec le prochain message que tu
envoies : des mots, un message vocal, une photo ou un fichier, un sticker, un lieu ou un sondage, maintenant ou plus
tard. Un SMS ne peut pas disparaître : envoyé en SMS, il reste sur les deux téléphones (Erevos le dit d’abord), et le
chronomètre se désactive. Son délai commence quand l’autre téléphone l’affiche à l’écran, et celui de ta copie quand son
téléphone le dit (**✓✓✓**). Chaque message dit quand il disparaît. L’autre téléphone apprend le réglage de la discussion
la prochaine fois qu’il regarde le relais, et l’un ou l’autre téléphone peut le changer : le dernier changement
l’emporte. Les messages déjà dans la discussion restent.

- **Jusqu’à ce qu’il soit lu**, un message éphémère reste sur les deux téléphones, scellé comme le reste. Si son Erevos
  ne dit jamais l’avoir lu, ta copie reste.
- **Tant qu’Erevos est fermé :** un message dont l’heure est venue est supprimé à la prochaine ouverture de la
  discussion. D’ici là, il reste sur le téléphone, scellé comme le reste.
- **Pas une garantie :** son Erevos les supprime, mais une app modifiée, une capture d’écran ou une copie peut encore
  les garder.

### Notifications de cette discussion

Sur Android, ouvre une discussion, touche son nom puis **Notifications** ; dans un groupe, touche son nom (dans un
groupe public, **⋯**) puis **Notifications**. **En sourdine** pendant 8 heures, 1 semaine ou **Toujours** : ses
messages ne sonnent pas et n’affichent aucune notification, donc l’icône d’Erevos ne les compte pas non plus ; la liste
les montre toujours, avec une cloche barrée, et ses appels sonnent toujours. **Son des messages** et **Sonnerie** lui
donnent un son à elle pour ses messages et pour ses appels, pris dans la liste de sons d’Android, ou **Sans son**. Dans
les détails d’une discussion, la ligne dit alors **En sourdine jusqu’à** et l’heure, ou **Sons propres**.

**Pourquoi :** une discussion en sourdine compte toujours dans la liste, pour que rien de ce qui est arrivé ne se perde :
seul le téléphone cesse de t’y appeler. Ses sons sont gardés sur ce téléphone seulement, avec la discussion dans les
données chiffrées de l’espace, car chaque téléphone a ses propres sons : un appareil associé garde les siens, et l’autre
téléphone n’en sait rien.

- **Dans les discussions masquées** il n’y a que **En sourdine** : un son à elle dirait à quiconque est près de quelle
  discussion il s’agit.
- **Un espace fermé, et les discussions masquées tant qu’elles sont fermées,** ne savent pas dans quelle discussion un
  message est arrivé, et le signalent donc comme le disent les réglages de l’app.
- **Seulement sur Android** pour l’instant : l’app web signale chaque discussion comme le disent ses réglages.

### Messages vocaux

Dans la discussion d’un contact, sans rien de tapé, maintiens le micro au bout de la barre de message pendant que tu
parles, et relâche pour envoyer ; glisse vers la gauche avant de relâcher pour l’abandonner. Un appui de moins d’une
seconde est pris pour une erreur et n’envoie rien. Au bout d’une minute, il s’envoie tout seul. La première fois,
Android demande si Erevos peut utiliser le micro : il n’enregistre que tant que tu le maintiens. Avec TalkBack, appuie
une fois pour commencer et une autre pour envoyer. Appuie sur un message vocal pour l’écouter, et de nouveau pour
l’arrêter. Les messages vocaux ont les mêmes marques que le reste, et suivent le réglage éphémère de la discussion.

**Pourquoi :** sur un téléphone, un message vocal est en AAC à 64 kbit/s, environ 480 Ko par minute : aussi clair que la
parole peut l’être. Plus ne s’entendrait pas dans une voix, mais serait plus lent à envoyer, surtout par Bluetooth.

- **Par le relais, ou à proximité,** chiffrés de bout en bout comme les mots, en plusieurs morceaux. Personne entre les
  deux ne peut les entendre, mais d’après les morceaux, le relais, ou qui écoute à proximité, peut savoir que quelque
  chose de long a été envoyé, et à peu près de quelle durée. À proximité, ils ne vont qu’au téléphone d’un contact qu’on
  sait proche.
- **Sur le téléphone**, chaque son est gardé dans un fichier à lui, scellé avec sa propre clé, que seul l’historique
  scellé de la discussion contient. Quand le message s’en va, supprimé, disparu ou parce qu’il est le plus ancien, son
  fichier s’en va aussi. Le nombre de ces fichiers, et leurs tailles, montrent à peu près combien de messages vocaux le
  téléphone garde, dans tous ses espaces ensemble, pas dans lequel.
- **Pendant la lecture**, le son est descellé dans le cache d’Erevos, et supprimé dès qu’il s’arrête. Si Erevos est
  fermé pendant qu’il enregistre ou joue, ce qui restait s’en va à la prochaine ouverture d’une discussion.

### Photos et fichiers

Dans la discussion d’un contact, appuie sur **+** à côté du champ de message, qui s’ouvre là où était le clavier, puis
sur **Photo** pour en choisir une parmi les photos du téléphone, **Appareil photo** pour en prendre une, ou **Fichier**
pour tout le reste, jusqu’à 100 Mo. En dessous, **Qualité de la photo** règle comment partent les photos, et Erevos s’en
souvient :

- **Original** (par défaut) : la photo exactement telle qu’elle était, en pleine taille, sans perte de qualité. Seul ce
  qu’elle dit en plus de son image est retiré : où elle a été prise, le téléphone, l’heure, les miniatures. Son nom est
  simplement « photo ».
- **90%** et **75% :** une nouvelle photo, plus petite, plus rapide à envoyer, qui ne dit rien d’autre que son image.

Leurs photos et fichiers jusqu’à 16 Mo arrivent tout seuls ; appuie sur un plus gros pour le récupérer. Appuie sur une
photo pour la voir sur tout l’écran, avec sa taille : deux doigts ou un double appui zooment, un doigt la déplace tant
qu’elle est zoomée, et un appui cache ou montre ce qu’il y a autour. Appuie sur un fichier pour l’enregistrer. Erevos
tourne avec le téléphone tant que sa **Rotation automatique** est activée, et une photo montrée seule tourne même
quand elle est désactivée. **Enregistrer** en met une copie dans un dossier que tu choisis la première fois, et
**Enregistrer dans un autre dossier** le change. Les photos et fichiers ont les mêmes marques que le reste, et suivent
le réglage éphémère de la discussion.

- **Comment ils voyagent :** chaque fichier est chiffré sur le téléphone avec sa propre clé, en morceaux tous de même
  taille, et déposé sur ton relais. Seuls l’emplacement des morceaux et la clé vont au contact, chiffrés de bout en
  bout. Son téléphone prend les morceaux par son propre relais, si bien que ton relais ne voit jamais l’adresse de son
  téléphone, vérifie chaque morceau, puis les supprime du relais. Les morceaux que personne ne prend sont supprimés au
  bout de 14 jours.
- **Ce que le relais voit :** combien il y a de morceaux et leur taille, donc à peu près la taille du fichier, et quand.
  Pas ce que c’est ni à qui c’est destiné.
- **Un fichier part tel quel,** avec tout ce qu’il dit à l’intérieur : l’auteur d’un document, ou le lieu et le
  téléphone d’une photo si tu l’envoies avec **Fichier**. Envoie les photos avec **Photo**.
- **Sur le téléphone**, chaque fichier est gardé en morceaux, tels qu’ils ont voyagé, scellé avec sa propre clé, que
  seul l’historique scellé de la discussion contient. Quand le message s’en va, ses morceaux s’en vont aussi. Le nombre
  de morceaux montre à peu près combien le téléphone garde, dans tous ses espaces ensemble, pas dans lequel. Une photo
  est affichée depuis la mémoire, jamais écrite descellée. Le sélecteur de photos du téléphone remet une copie dans le
  cache d’Erevos, supprimée une fois lue, et une photo prise ici n’est pas gardée dans les photos du téléphone.
- **Enregistrés**, les photos et fichiers sont hors d’Erevos, non scellés : quiconque a le téléphone peut les ouvrir.
- **Par le relais seulement :** les fichiers ont besoin de son stockage de fichiers, même quand le contact est proche.
  Un relais plus ancien que cette version ne peut pas prendre de fichiers : mets-le à jour.

### Plus sous +

Sous **+**, il y a plus à envoyer que des photos et des fichiers (le smiley au bout du champ de message ouvre aussi les
stickers) :

- **Sticker :** l’un des 576 stickers intégrés à Erevos, en 24 séries de 24 (parmi elles **Lunes**, **Chiens**,
  **Grèce**, **Mots** et **Gourmandises**), dessinés par chaque téléphone lui-même : seul son nom voyage, si bien que
  rien n’est jamais téléchargé. Un Erevos d’avant cela affiche son emoji à la place. Tous sauf les mots et les
  gourmandises bougent un peu pendant quelques secondes quand ils arrivent et quand on appuie dessus, puis se reposent ;
  avec le réglage de réduction des animations du téléphone activé, ils restent immobiles. Les mots s’affichent dans la
  langue de l’app.
- **Les miens**, parmi les stickers, contient ceux que tu fais à partir de photos. **Nouveau sticker à partir d’une
  photo** en découpe un carré, le réduit (512 sur 512, environ 100 Ko au plus) et ne garde que son image, rien de
  l’endroit ni de l’appareil avec lequel elle a été prise. Il est gardé scellé dans l’espace, ou dans les discussions
  masquées où il a été fait, et ne s’affiche que là, jusqu’à 100 ; appuie longuement sur l’un d’eux pour le supprimer.
  Comme le reste, il va dans une sauvegarde, scellé, et jamais vers les autres appareils du compte. Il part comme part
  une photo, chiffré de bout en bout par le relais, marqué comme sticker, si bien qu’il s’affiche seul sans bulle ; un
  Erevos d’avant cela l’affiche comme une photo. Appuie longuement sur un sticker qu’on t’a envoyé et appuie sur
  **Ajouter à mes stickers** pour le garder.
- **Position** (sur Android) : envoie où tu es, une fois, comme un lieu. La première fois, Android demande si Erevos
  peut utiliser la position. Le téléphone cherche par tous ses moyens à la fois : par satellite, quand tu as autorisé la
  position précise, et par sa position réseau, ce qui sur beaucoup de téléphones interroge Google ou le fabricant du
  téléphone. Une feuille s’ouvre tout de suite et dit qu’il cherche ; à l’intérieur, où les satellites se voient mal, cela
  peut prendre jusqu’à une minute. Si rien n’arrive à temps, il propose le lieu que le téléphone a trouvé dans les dix
  dernières minutes, en disant il y a combien de temps, ou il dit pourquoi aucun n’a été trouvé, avec **Réessayer** et
  l’écran du téléphone qui change cela. Erevos ne regarde que quand tu appuies, te montre le lieu avant qu’il parte, et ne
  te suit pas ensuite. Le message ne contient que les coordonnées, chiffrées de bout en bout ; aucune carte n’est chargée
  dans Erevos. **Ouvrir la carte** passe le lieu à ton app de cartes, qui peut charger sa carte depuis internet. Un Erevos
  d’avant cela affiche les coordonnées en mots.
- **Sondage :** une question avec deux options ou plus, jusqu’à 12, et, avec **Plusieurs réponses possibles**, plus
  d’une à choisir. Appuie sur une option pour la choisir, de nouveau pour la retirer ; chaque option montre combien
  l’ont choisie, et qui. Les votes voyagent à l’intérieur du chiffrement, comme les réactions. Un Erevos d’avant cela
  affiche la question et ses options en mots, pour répondre en mots.

**Pourquoi :** un pack de stickers chargé depuis internet dirait à un serveur que ce téléphone a Erevos, donc les
stickers sont intégrés et seuls leurs noms voyagent. Les tiens sont listés dans une seule valeur scellée de même taille
pour chaque espace et emplacement masqué, utilisé ou non, si bien qu’une liste utilisée ressemble à une liste qui ne
l’est pas : elle en contient 100. Un lieu n’est envoyé que depuis Android : sur un ordinateur ou dans l’app web, le
navigateur demanderait à un service extérieur où il est.

### Aperçus des liens

Un lien dans un message est souligné, et ne s’ouvre qu’une fois que tu appuies dessus et le confirmes. Avec **Aperçus
des liens** activé, dans les détails d’une discussion, un lien que tu envoies part avec son aperçu : au moment où tu
l’envoies, ce téléphone charge la page et en prend le titre, une ligne de description et une petite image, et ils
partent dans le message, chiffrés de bout en bout. Le téléphone qui le reçoit ne charge rien : il affiche ce qui est
arrivé. C’est désactivé tant que tu ne l’actives pas, et alors c’est activé pour toutes les discussions de l’espace ;
chaque emplacement de discussions masquées a son propre interrupteur, dans les détails d’une discussion là-bas.

**Pourquoi :** seul le téléphone de l’expéditeur charge la page, si bien que le téléphone qui reçoit un lien ne joint
aucun site choisi par quelqu’un d’autre, et ne montre rien de lui-même à ce site, pas même son adresse.

- **Le site voit l’adresse internet de ce téléphone**, et quand, comme il le verrait depuis un navigateur, mais pas à
  qui le message est destiné. Par Tor, Erevos n’envoie que ses requêtes au relais, pas des pages, donc tant que tout
  dans l’espace passe par Tor (**Tout** sous Tor), aucun aperçu n’est fait du tout.
- Erevos sur un ordinateur n’en fait aucun, mais affiche quand même ceux qui arrivent.
- **Par LoRa**, qui ne prend que peu, un message part sans son aperçu plutôt que d’attendre, et n’en garde aucun ici.
- Un aperçu est ce que la page dit d’elle-même, vrai ou non. Un Erevos d’avant cela affiche le lien sans aperçu.

### Appels vocaux et vidéo

Dans la discussion d’un contact, appuie sur le combiné vert en haut pour un appel vocal, ou sur la caméra bleue à côté
pour un appel vidéo. La première fois, Android demande si Erevos peut utiliser le micro, et la caméra pour la vidéo. Son
téléphone sonne tant qu’Erevos y est ouvert, sur n’importe quel écran de l’espace : il appuie sur **Répondre** ou
**Refuser**. Pendant l’appel, tu peux couper le micro, passer au haut-parleur, désactiver ta caméra, basculer entre la
caméra avant et arrière, et **Raccrocher**. Chaque appel laisse une ligne dans la discussion, comme sa durée, ou un
appel manqué.

**Un appel vers un téléphone qui tarde à le recevoir :** quand son téléphone reçoit ton appel en retard, par exemple
parce qu'il lit par Tor, **Appel…** reste affiché jusqu'à une minute et quart, et dès qu'il sonne là-bas, il sonne 45
secondes à partir de ce moment, pour qu'un appel arrivé en retard ne sonne pas sur son téléphone pour s'arrêter
aussitôt. Son téléphone lit aussi un appel avant tout ce qu'il a à envoyer, et après un changement de réseau (du Wi-Fi
aux données mobiles) il attend de nouveau les appels tout de suite.

**Un appel ordinaire sur le réseau mobile :** quand un contact a son numéro de téléphone associé, ou est associé à l’un
de tes contacts qui a un numéro (**Associer à un de mes contacts** dans sa discussion, un numéro mobile d’abord), le
clavier orange en haut de sa discussion, avant la caméra, ouvre un clavier avec ce numéro déjà tapé, de même que celui
en haut d’une conversation SMS. C’est le **Téléphone** d’Erevos quand Erevos est l’app de téléphone, sinon celui du
téléphone : appuie là sur la touche d’appel. Un tel appel passe par le réseau de l’opérateur téléphonique et n’est pas
chiffré, pas plus qu’un SMS ordinaire. Les discussions masquées et les ordinateurs ne l’ont pas.

- **Chiffré de bout en bout :** l’appel est établi par des messages via le relais, chiffrés comme le reste. Ceux-ci
  portent la clé qui chiffre l’appel lui-même, si bien que personne entre les deux ne peut écouter, pas même le relais
  d’appel ci-dessous.
- **Par le relais d’appel :** un relais installé avec le kit dans \`deploy/relay\` a un relais d’appel à côté. L’appel
  passe par lui, si bien qu’aucun téléphone n’apprend l’adresse IP de l’autre. Par Wi-Fi ou données mobiles, n’importe
  où.
- **Sans relais d’appel** (un relais sur ton propre ordinateur, par exemple), Erevos demande d’abord : l’appel passe
  alors directement entre les téléphones, ne marche que sur le même Wi-Fi, et chaque téléphone y voit l’adresse de
  l’autre.
- **Sans internet :** sur le même Wi-Fi, le point d’accès d’un téléphone, ou le Wi-Fi que deux téléphones créent (Wi-Fi
  Direct), avec un espace ouvert sur les deux, un appel n’a besoin d’aucun relais : il est établi par la liaison à
  proximité et passe directement entre les téléphones (ou ordinateurs). Il en va de même pour les messages de groupe et
  les appels de groupe.
- **En arrière-plan (Android) :** tant qu’un espace est ouvert, Erevos continue de tourner quand tu le quittes, avec
  Accueil, avec Retour sur son premier écran ou en le balayant hors des applis récentes, avec une notification discrète,
  « Erevos – Ready for calls and messages », qui ne s’affiche pas sur l’écran de verrouillage. Il attend au relais et
  sur les liaisons avec les téléphones à proximité, si bien que les messages arrivent : une notification dit seulement
  « New message », ou combien sont arrivés, et sur un téléphone verrouillé seulement « Erevos ». Une demande de message,
  de quelqu’un qui n’a que ton lien de contact, donne la même notification et le même son, et compte sur l’icône, comme
  tout message. Un appel sonne avec la sonnerie du téléphone et une notification, « Incoming call » (ou « Incoming video
  call ») – « Open Erevos to answer », sans nom, par-dessus l’écran de verrouillage et l’économiseur d’écran aussi, et
  l’écran se réveille. Appuie dessus pour répondre. Avec le verrou par mot de passe activé, un appel qui sonne s’affiche
  avant le mot de passe, et Erevos se verrouille dès qu’il se termine. Verrouillé, l’espace continue derrière l’écran du
  mot de passe, si bien que messages et appels arrivent encore, et un appel s’affiche par-dessus l’écran du mot de
  passe. Seuls les discussions et groupes de cet espace arrivent ainsi, et les discussions masquées avec **Recevoir une
  fois fermées** activé ; les autres discussions masquées disent seulement qu’un message est arrivé, ou sonnent sans
  nom, si tu le leur permets (voir Discussions masquées). Règle-le dans **Réglages** → **Notifications** → **En
  arrière-plan** : **Recevoir et sonner** (par défaut) ou **Seulement quand Erevos est affiché**, et **Signaler les
  nouveaux messages** (par défaut) ou **Pas de notification**, qui vaut aussi pendant qu’Erevos est affiché. Là aussi,
  si Android les demande, **Continuer malgré l’économie de batterie** et **Afficher les appels sur l’écran de
  verrouillage**. En dessous, **Seulement le gaspillage** (par défaut), **Et les téléphones proches** et **Et le
  sommeil** règlent combien de batterie il économise en arrière-plan : le deuxième éteint aussi les radios pour
  téléphones proches tant qu’Erevos est en arrière-plan, le troisième laisse aussi dormir le téléphone, si bien
  qu’Erevos regarde le relais environ une fois par minute et qu’un message ou un appel peut avoir une ou deux minutes de
  retard.
- **Le nombre sur l’icône :** avec **Signaler les nouveaux messages** activé, quand tu quittes Erevos avec des messages
  non lus dans les discussions et groupes de l’espace ouvert, la notification reste, sans son, et dit combien, avec ceux
  qu’elle signale ensuite ; elle part tant qu’Erevos est affiché, et revient quand tu le quittes, jusqu’à ce que tu les
  aies lus. Elle ne compte pas les messages d’une discussion en sourdine (voir Notifications de cette discussion), ni
  ceux d’une discussion masquée au moment où tu quittes. Le launcher d’Android l’affiche sur l’icône d’Erevos, comme un
  nombre ou, sur certains téléphones comme les Pixel, comme un point. **Réglages** → **Notifications** → **Nombre sur
  l’icône** le désactive : la notification ne parle alors que de ce qui est arrivé depuis la dernière fois qu’Erevos
  était ouvert, et le nombre du launcher part avec elle. Un message supprimé pour tout le monde avant que tu l’aies lu,
  ou lu sur un ordinateur associé, ne compte plus.

  **Pourquoi :** sur Android, seule une notification peut mettre un nombre sur l’icône d’une app, donc la notification
  reste tant que des messages attendent ; elle ne dit rien de plus que combien, comme toujours.
- **Un espace fermé :** il ne reçoit rien, car sa clé n’est en mémoire que tant qu’il est ouvert : ses messages
  attendent sur son relais et arrivent quand tu l’ouvres. Sauf si tu choisis, dans cet espace, **Aussi quand un autre
  espace est ouvert** sous **Réglages** → **Notifications** → **En arrière-plan** (par défaut, c’est **Cet espace
  seulement quand il est ouvert**) : alors, tant qu’un autre espace est ouvert et reçoit, il dit seulement « New
  message », ou combien sont arrivés, avec la même notification que cet espace, jamais quel espace, et ses discussions
  masquées ne disent rien. Ce que d’autres téléphones ont transporté jusqu’à son relais compte comme un message, les
  suppressions aussi, et un message qui lui est envoyé sans son sonne comme d’habitude (voir **Envoyer sans son**). Pour
  cela, le téléphone garde les adresses de ses files d’attente sur son relais hors de son mot de passe, dont celle où
  écrit chacun de ses contacts, jusqu’à 64 contacts, jamais ses clés, ni qui sont ses contacts, ni ses messages, et ne
  demande au relais que combien sont arrivés, jamais les messages eux-mêmes : ils restent là-bas jusqu’à ce que l’espace
  s’ouvre. Un espace qui passe par Tor (**Messages**, par défaut, ou **Tout**, sous **Ce qui passe par Tor**) n’est
  interrogé que par Tor : tant que l’espace ouvert a Tor désactivé, ou que son Tor démarre ou vient d’échouer, l’espace
  fermé ne dit rien, et ce qui est arrivé est signalé dès que Tor y est prêt.

  **Pourquoi :** un espace derrière un second mot de passe ne doit pas montrer qu’il est là, donc c’est désactivé tant
  que tu ne l’actives pas, et alors il n’en dit pas plus que ne le dirait l’espace ouvert. Si on l’interrogeait
  directement depuis le téléphone pendant qu’un autre espace est ouvert, son relais ou quelqu’un qui observe le réseau
  pourrait relier les deux espaces par l’adresse internet du téléphone. Comme chaque contact écrit dans sa propre file
  d’attente, l’espace doit aussi interroger le relais sur chacune d’elles, sinon leurs messages ne diraient rien. Le
  prix à payer : son relais peut savoir que les deux espaces sont sur un même téléphone, et quelqu’un qui examine le
  téléphone avec des outils peut trouver qu’un second espace y garde des adresses, et combien de contacts il a.
- **Quand le téléphone s’allume :** après le démarrage du téléphone, Erevos ne tourne pas tant que tu ne l’ouvres pas.
  Avec **Démarrer à l’allumage du téléphone** sous **Réglages** → **Notifications** → **En arrière-plan** (par défaut,
  c’est **Attendre que je l’ouvre**), il démarre tout seul une fois le téléphone allumé, ou Erevos mis à jour, sans
  espace ouvert : aucun espace ne peut s’ouvrir sans son mot de passe, car Erevos ne garde aucune clé sur le
  téléphone. Alors les espaces réglés sur **Aussi quand un autre espace est ouvert** disent déjà « New message », ou
  combien sont arrivés, jamais quel espace, ni qui ou quoi, et une notification discrète dit « Locked ». Les appels ne
  sonnent pas, et rien d’autre n’arrive, tant que tu n’ouvres pas un espace ; les espaces qui passent par Tor ne
  disent rien jusque-là. S’il n’y a aucun espace de ce genre, ou avec **Pas de notification**, il s’arrête aussitôt.
  Android seulement.

  **Pourquoi :** après un redémarrage, Erevos ne pouvait pas te dire que des messages attendent avant que tu ne
  l’ouvres par hasard. Sans ton mot de passe, il ne peut toujours pas les lire, donc il n’en dit pas plus qu’un espace
  fermé.
- **Là où ça ne peut pas sonner :** arrêté par Android (ou par l’économie de batterie du téléphone, ou par le réglage
  propre du fabricant), après un redémarrage du téléphone jusqu’à ce que tu ouvres Erevos et l’espace une fois, dans un
  autre espace (il dit seulement qu’un message est arrivé, si tu le permets, comme ci-dessus), ou sur un ordinateur ou
  dans l’app web quand ils sont fermés. Un appel là-bas s’affiche comme appel manqué dès qu’Erevos s’ouvre. Quand
  Android ferme Erevos pendant qu’il reçoit et le relance, comme il le fait d’habitude, une notification discrète le
  dit : ouvre Erevos et l’espace pour recevoir de nouveau. Après **Forcer l’arrêt**, avec une utilisation de la batterie
  réglée sur Restreinte, ou quand le réglage propre du fabricant le ferme, Android ne relance rien, donc aucune
  notification ne le dit : la notification « Erevos » disparaît simplement, et rien ne sonne tant que tu n’as pas ouvert
  Erevos. **Autorisations** (ci-dessous) prévient à l’avance si l’un de ces réglages est en place. Une autre
  notification, « Locked », le dit aussi quand l’espace qui recevait se ferme (après la restauration d’une sauvegarde,
  par exemple) et qu’Erevos quitte l’écran en demandant le mot de passe. Une demande de message ne peut pas t’appeler
  tant que tu ne l’as pas acceptée.
- **Autorisations (Android) :** **Réglages** → **Général** → **Autorisations** montre ce qu’Android permet à Erevos pour
  les appels et les messages en arrière-plan (les notifications, la notification d’appel et son affichage par-dessus
  l’écran, la notification des messages, avec ses notifications « Messages without sound » et « Messages with a chat's
  own sound », qui gardent aussi le nombre sur l’icône, les appels sur l’écran de verrouillage, le fonctionnement sur
  batterie, le fonctionnement en arrière-plan avec une utilisation de la batterie non réglée sur Restreinte, pas de mise
  en pause quand l’app n’est pas utilisée, les données mobiles en arrière-plan, le micro) et pour d’autres choses (le
  son des nouveaux messages, les notifications sur l’écran de verrouillage, les appels malgré Ne pas déranger,
  l’appareil photo, les téléphones à proximité, les contacts, les heures exactes pour les SMS envoyés plus tard et les
  rappels, la notification des rappels une fois qu’un rappel est arrivé), chacun avec sa raison et un bouton qui ouvre
  la question ou le réglage d’Android lui-même. Il dit aussi quand le téléphone est en silencieux ou en vibreur, quand
  l’économiseur de batterie est activé, et quand Ne pas déranger est activé sans laisser passer les appels d’Erevos. Sur
  les téléphones Huawei, Honor, Xiaomi, OPPO, realme, OnePlus, vivo, Samsung et ASUS, il dit aussi où se trouve le
  réglage propre du fabricant, qu’Erevos ne peut pas lire : appuie sur **C’est fait** une fois qu’il est réglé. Après
  chaque nouvelle version, et la première fois, il s’ouvre tout seul quand les appels ou les messages ont besoin de
  quelque chose. Dans l’app web, il montre ce que le navigateur permet, voir [Sur un iPhone](#iphone).
- **Un appel à la fois.** Un appel continue pendant que tu passes d’un écran de l’espace à l’autre. Il se termine quand
  l’espace se ferme, et un appel dans les discussions masquées quand elles se ferment, ce qu’elles ne font pas pendant
  un appel. Balayer Erevos hors des applis récentes termine aussi un appel.
- Les appels ne passent ni par un téléphone à proximité ni par Bluetooth. Là, **Talkie** sous **+** transforme la
  discussion en talkie-walkie, et **Talkie activé** s’affiche au-dessus du champ : maintiens le talkie-walkie au bout de
  la barre pendant que tu parles, relâche, et ta voix est lue sur son téléphone dès qu’elle arrive, si la discussion
  avec toi y est ouverte ; sinon, elle attend comme message vocal. C’est un message vocal plus petit (environ 3 Ko par
  seconde), si bien qu’il passe partout où passe un message, Bluetooth compris.

**Pourquoi :** les clés qui ouvrent les messages d’un espace ne sont en mémoire que tant qu’il est ouvert, et scellées
derrière son mot de passe sinon. Donc après un redémarrage du téléphone, rien ne peut être lu et rien ne sonne tant que
tu n’as pas ouvert Erevos et l’espace une fois ; et les discussions masquées, dont la clé n’est en mémoire que tant
qu’elles sont ouvertes, sauf si **Recevoir une fois fermées** la garde avec l’espace, disent sinon seulement qu’un
message est arrivé, ou sonnent sans nom, si tu le leur permets.

> Les réglages du relais, ta file d’attente, tes contacts et leurs noms, les clés de tes conversations et les messages
> sont gardés dans cet espace, scellés. L’historique n’a pas de limite : il est gardé dans des pages scellées de même
> taille, mêlées aux pages des autres espaces et des discussions masquées, si bien que seule la place qu’elles prennent
> toutes ensemble se voit, pas à qui elles sont. Le reste est gardé à la même taille pour chaque espace et les
> discussions masquées, utilisés ou non ; ce qui est plus grand va dans des pages comme celles de l’historique, parmi
> elles. Les messages supprimés peuvent rester un moment dans le stockage du téléphone, scellés comme le reste, jusqu’à
> ce que quelque chose soit écrit par-dessus. Les messages envoyés ou reçus à proximité sont gardés de la même façon.

## Discussions de groupe {#groups}

Depuis le menu de l’écran d’accueil, **Nouveau groupe** : donne-lui un nom, coche les contacts à inviter, et appuie sur
**Créer le groupe**. Tu en es l’admin. Le téléphone de chaque contact répond tout seul la prochaine fois qu’Erevos y est
ouvert, et rejoint le groupe : celui-ci s’affiche alors sur son écran d’accueil, avec une note disant qui l’a ajouté. Un
téléphone ne rejoint qu’un groupe dont l’admin est le contact qui le lui a demandé, et un admin ne fait entrer un
contact qu’en tant que lui-même, jamais en tant que quelqu’un d’autre. Les groupes passent par le relais, il doit donc
être configuré.

**Pourquoi :** seul le téléphone de l’admin change le groupe (qui en fait partie, son nom), si bien qu’aucun serveur n’a
à mettre les changements en ordre : chaque téléphone les prend de celui-là. Un membre part donc en le demandant à
l’admin, et seul l’admin ajoute ou retire des membres.

- **Qui peut être invité :** les contacts que tu as acceptés, dans cet espace. Les membres qui ne sont pas contacts
  entre eux se parlent quand même dans le groupe, et apparaissent par le début de leur clé.
- **Ajouter comme contact :** dans la liste des membres (**⋯**), **Ajouter comme contact** sous un membre qui n’est pas
  ton contact lui demande, dans un message que lui seul reçoit, son lien de contact, et lui donne le tien. Sur son
  téléphone, la demande s’affiche une fois, en haut du groupe, et il appuie sur **Envoyer** ou **Ne pas envoyer** ; s’il
  appuie sur **Ne pas envoyer**, tu n’en es pas informé. Une fois qu’il l’a envoyé, vous êtes contacts l’un de l’autre,
  avec votre propre discussion, et **Nom** lui donne un nom, comme sous tout contact qui n’en a pas encore. L’absence de
  réponse peut signifier qu’il n’a pas encore ouvert le groupe, a dit non, a un Erevos plus ancien, ou t’a toujours
  comme contact, ce qui ne lui montre rien ; au bout d’une semaine, tu peux redemander. Une fois que vous êtes contacts
  l’un de l’autre, dans n’importe quel groupe ou par un lien de contact, ce qui a été demandé dans vos autres groupes
  disparaît, et sa demande ne s’affiche plus. Un membre retiré du groupe ne demande plus rien. Si deux membres montrent
  la même clé, l’un d’eux n’est pas qui il prétend être, et aucun lien de contact ne va à l’un ou à l’autre ni n’est
  pris de l’un ou de l’autre. Pas dans les groupes publics. Demander est réservé au téléphone qui détient le compte ;
  **Nom** fonctionne aussi sur un appareil associé.
- **Chiffré de bout en bout pour le groupe :** MLS (RFC 9420). Chaque message est chiffré une fois pour le groupe, puis
  scellé de nouveau pour chaque membre, si bien que ce qui arrive dans la file de chaque membre ne ressemble à rien de
  ce que reçoivent les autres, et aucun relais ne peut savoir qui est dans un groupe. Il va directement dans la file de
  chaque membre, par ton relais. Chaque semaine, les clés de chaque téléphone dans le groupe sont renouvelées, celles de
  l’admin par lui-même et celles de chaque membre par l’admin, si bien que des clés prises une fois sur un téléphone
  cessent de lire le groupe.
- **Membres :** appuie sur le nom du groupe en haut, ou sur **⋯** à côté. L’admin ajoute des contacts, retire des
  membres et renomme le groupe. Un membre retiré ne lit plus rien de ce que dit le groupe à partir de là, et le groupe
  reste sur son téléphone, en lecture seule, jusqu’à ce qu’il le supprime.
- **Partir :** **Quitter le groupe** le demande à l’admin, dont le téléphone te retire la prochaine fois qu’Erevos y est
  ouvert. Le bouton propre de l’admin est **Fermer le groupe** : il retire tous les membres.
- **Appels de groupe :** le combiné vert en haut du groupe y lance un appel vocal, et la caméra bleue à côté un appel
  vidéo (aussi **Appel vidéo** sous **⋯**). Tant qu’un appel est en cours, seul son propre bouton s’affiche, pour le
  rejoindre. Il sonne sur les téléphones des membres où Erevos est ouvert, et qui répond y participe. Un appel en cours
  s’affiche en haut du groupe, pour le rejoindre plus tard. Jusqu’à huit personnes : chaque téléphone se connecte à
  chacun des autres, par le relais d’appel, si bien qu’aucun téléphone ne voit l’adresse IP d’un autre ; sans relais
  d’appel, seulement sur le même Wi-Fi. Chiffré de bout en bout entre chaque paire de téléphones, leurs clés étant
  envoyées dans le chiffrement du groupe. Dans un appel vidéo, chaque téléphone envoie son image à chacun des autres, si
  bien que les images s’affichent pour quatre personnes au plus ; au-delà, elles se mettent en pause et le son continue,
  jusqu’à ce qu’un serveur pour les appels vidéo plus grands soit mis en place.
- **Photos, fichiers et messages vocaux :** **+** à côté du champ envoie une photo ou un fichier, comme dans la
  discussion d’un contact, avec la même **Qualité de la photo** ; maintiens le micro pendant que tu parles, et relâche
  pour envoyer. Chacun est chiffré avec sa propre clé et déposé une fois sur ton relais, et seuls son emplacement et sa
  clé vont au groupe, dans son chiffrement. Le téléphone de chaque membre le prend là par son propre relais : jusqu’à 16
  Mo tout seul tant que le groupe est ouvert, un plus gros quand on appuie dessus. Appuie sur une photo pour la voir en
  entier, sur un fichier pour l’enregistrer, sur un message vocal pour l’écouter.
  - **Le relais le garde 14 jours,** chiffré, car il ne peut pas savoir quand chaque membre l’a pris.
  - **Par le relais seulement,** même quand les membres sont proches.
  - **Un membre qui rejoint plus tard** ne reçoit pas ce qui est venu avant, comme pour les mots. Un membre dont
    l’Erevos est d’avant cette version n’en voit rien.
  - **Sur le téléphone**, chacun est gardé en morceaux, scellé, comme dans la discussion d’un contact. Supprimer le
    groupe ici les supprime.
- **Le menu d’un message,** par appui long, comme dans la discussion d’un contact : les réactions, **Répondre**,
  **Transférer**, **Ajouter une étoile**, **Épingler**, **Copier**, **Modifier** et **Supprimer**. Chaque membre a une
  réaction sur un message, et un sondage montre qui a choisi quoi. Une épingle vaut pour tout le monde, et n’importe
  quel membre peut la **Désépingler**. **Modifier** remplace tes propres mots par de nouveaux pour chaque membre,
  jusqu’à un jour après leur envoi, marqués **Modifié**. **Supprimer** demande **Ce téléphone** ou, pour ton propre
  message, **Pour tout le monde** : les Erevos des membres le suppriment aussi, et une photo, un fichier ou un message
  vocal à toi quitte ton relais aussitôt au lieu de 14 jours plus tard. **+** a aussi **Sticker**, **Position** et
  **Sondage** ici. Les liens sont soulignés et demandent confirmation avant de s’ouvrir, et les **Aperçus des liens**,
  quand ils sont activés, partent avec les tiens. Dans la feuille des membres, ou l’écran propre d’un groupe public,
  **Rechercher dans cette discussion** parcourt les messages du groupe et **Exporter la discussion** les écrit dans un
  fichier, et **Médias, liens et fichiers** liste les photos, vidéos, messages vocaux, musiques, fichiers et liens du groupe, chaque sorte à part, comme dans la discussion d’un contact (voir plus haut), chacun menant à son message ; **Messages avec étoile** et la recherche de l’écran d’accueil incluent aussi les groupes. Un membre dont
  l’Erevos est d’avant cette version voit les mots, l’emoji d’un sticker, les coordonnées d’un lieu et la question d’un
  sondage, et rien des réactions, épingles, modifications et suppressions.
- **Nommer un membre :** tapez **@** dans le champ du message, et les membres dont le nom commence par ce qui suit
  s’affichent au-dessus : touchez-en un pour mettre son nom entier. Un membre nommé ainsi est averti du message même
  s’il a mis le groupe en sourdine. Seuls les noms entiers comptent, donc **@Anna** ne nomme pas Anna Maria. Un Erevos
  d’avant montre seulement les mots, et avertit comme le disent les réglages du groupe.
- **Pas encore :** la saisie et les messages éphémères dans les groupes, et les groupes par un téléphone à
  proximité.

## Groupes publics {#public-groups}

Un groupe public est un groupe que quiconque a son lien, ou son code QR, peut demander à rejoindre : pour un club, une
rue ou une classe, où tout le monde n’est pas ton contact. Depuis le menu de l’écran d’accueil, **Groupes publics** :
donne-lui un nom et le nom sous lequel tu y apparais, choisis qui entre, et appuie sur **Créer le groupe public**. Tu en
es le propriétaire. Ses messages sont chiffrés de bout en bout avec MLS et vont à chaque membre comme dans tout groupe,
et aucun relais n’apprend qui en fait partie.

- **Le lien :** appuie sur le nom du groupe en haut pour son lien et son code QR, et sur **Partager le lien**. Quiconque
  l’ouvre, ou scanne le code avec l’appareil photo du téléphone, choisit le nom que voit le groupe et appuie sur
  **Demander à rejoindre**. Un lien peut aussi être collé sous **Rejoindre par un lien**. Chaque membre a le lien, et
  peut le transmettre.
- **Rejoindre en ton absence :** la demande attend sur ton relais, scellée pour que seul ton téléphone l’ouvre, jusqu’à
  ce qu’Erevos soit ouvert sur ton téléphone : il regarde toutes les quelques secondes tant qu’Erevos est affiché, et
  environ chaque minute en arrière-plan. Il fait alors entrer la personne, et le groupe s’affiche sur son téléphone.
- **Qui peut entrer :** **Quiconque a le lien**, ou **Un admin les fait entrer** : alors celui qui demande attend sous
  **Demandes pour rejoindre**, que toi ou un admin appuyiez sur **Faire entrer** ou **Refuser**. Ton téléphone le fait
  quand même entrer, dès qu’il l’apprend.
- **Admins :** sous **Membres**, appuie sur **Modérer** à côté d’un membre, puis sur **Nommer admin**. Les admins
  mettent en sourdine, retirent et bannissent des membres, font entrer qui demande, et suppriment un message pour tout
  le monde ; toi seul modères les admins, et personne ne te modère.
  - **Couper micro :** son téléphone n’envoie rien dans le groupe, et aucun téléphone n’affiche de toute façon ce que le
    sien envoie. **Laisser écrire** l’annule.
  - **Retirer :** il ne lit plus rien de ce que dit le groupe à partir de là, et peut redemander à rejoindre par le
    lien.
  - **Bannir :** retiré, et ce que son téléphone demande ensuite est refusé. **Lever le bannissement**, sous **Bannis**,
    l’annule. Un bannissement arrête le même téléphone, pas quelqu’un qui revient avec une nouvelle file d’attente sur
    un relais : contre cela, choisis **Un admin les fait entrer**, ou change le lien.
  - **Supprimer pour tout le monde :** les derniers messages sont listés en bas ; **Supprimer** en retire un du
    téléphone de chaque membre. Qui l’a déjà lu peut en avoir gardé une copie.
- **Changer le lien :** le lien et le code QR partagés jusque-là cessent aussitôt de fonctionner, et chaque membre
  reçoit le nouveau. Les demandes encore en attente sur l’ancien sont perdues.
- **Céder le groupe :** sous **Modérer** d’un membre. Son téléphone en est propriétaire à partir de là et fait entrer
  les gens, donc le lien change pour un lien sur son relais ; tu restes admin. Si ton téléphone est perdu avant que tu
  le cèdes, personne ne peut plus faire entrer qui que ce soit, même si le groupe continue pour ceux qui en font partie.
- **Fermer le groupe** retire tous les membres. **Quitter le groupe** d’un membre demande à ton téléphone de le retirer.
- **Jusqu’à 100 membres,** car tout le groupe doit tenir dans l’unique message qui fait entrer quelqu’un.
- **Chaque téléphone d’un groupe public a besoin de cette version d’Erevos.** Les groupes faits à partir de contacts
  fonctionnent comme avant.

**Pourquoi :** seul le téléphone du propriétaire change le groupe et fait entrer les gens, si bien que les changements
ne se font jamais concurrence et qu’aucun serveur n’a à les mettre en ordre. C’est pourquoi le groupe continue sans lui,
mais personne de nouveau n’entre : cède-le avant de changer de téléphone.

### Ce qu’un groupe public révèle

> Quiconque a le lien peut lire le groupe à partir du moment où il est admis, jamais ce qui a été dit avant, et le lien
> peut être transmis : change-le pour arrêter cela.

- **Le lien** montre le nom du groupe et l’adresse de ton relais à quiconque le voit.
- **Chaque membre voit, de chaque membre,** le nom choisi, une clé faite pour ce groupe seul, l’adresse de son relais et
  l’identifiant d’expéditeur de sa file. La clé ne dit rien de qui il est dans ses discussions, ni des autres groupes
  dont il fait partie. La file est une file sur laquelle seuls ses groupes publics lisent, pas celle de son lien de
  contact, la même dans chacun de ses groupes publics (un Erevos d’avant 2.0.0 donne celle de son lien de contact).
- **Les noms sont choisis, pas prouvés :** n’importe qui peut s’appeler n’importe comment. Le début de la clé de chaque
  membre s’affiche à côté du nom, et le propriétaire et les admins sont marqués.
- **Tout ce qui est dit peut être copié** par n’importe qui dans le groupe : le chiffrement de bout en bout tient les
  relais à l’écart, pas les membres.
- **Les relais** ne lisent rien et n’apprennent rien de qui est dans le groupe. Le tien voit des demandes arriver à la
  porte du groupe, combien et quand, pas de qui. Les membres peuvent remplir la file des uns des autres de ce qui ne
  peut pas être lu, jusqu’à ce que le relais accepte.

## Comment Erevos choisit le chemin {#paths}

Quand tu envoies un message, Erevos choisit le chemin tout seul :

1. **Son téléphone est proche** (le haut de la discussion indique **À proximité**) : il part par la liaison à proximité,
   et aussi par le relais quand il y en a un.
2. **Sinon, avec un relais :** il passe par le relais, et un message court part aussi vers les téléphones Erevos reliés
   à proximité, si bien que le sien peut répondre à proximité s’il est l’un d’eux. Si le relais est injoignable, c’est
   cette copie qui compte, et ces téléphones la portent aussi au relais de ton contact, comme dans [Discuter avec un
   téléphone à proximité](#nearby).
3. **Sinon, sans relais,** il va vers les téléphones Erevos reliés à proximité, comme à l’étape 2.
4. **Et par LoRa,** quand une radio est configurée et que le relais n’a pas pu prendre un texte, comme dans [Par une
   radio LoRa](#lora). Sans aucun moyen, le message attend, marqué **En attente**, et part tout seul dès qu’il y en a
   un, comme dans [Envoyé, arrivé et lu](#relay) ; une ligne sous la discussion dit pourquoi.
5. **Et par SMS,** en tout dernier, quand tu l’as activé pour ce contact et que rien d’autre n’a pris un texte,
   comme dans [SMS](#sms).

Tous les chemins sont chiffrés de bout en bout : aucun relais ni aucun téléphone entre les deux ne peut lire ce que tu
envoies.

| Ligne sous la discussion | Que faire |
| --- | --- |
| **Envoyé à proximité, chiffré de bout en bout.** | Rien : son téléphone est proche et l’a reçu. |
| **Envoyé par le relais, chiffré de bout en bout.** | Rien : il est en route. |
| **Envoyé aux téléphones Erevos à proximité, chiffré de bout en bout, car le relais était injoignable.** | Il n’arrive que si l’un d’eux est le sien : attends **✓✓**, ou vérifie le relais. |
| **… Si le sien n’en fait pas partie, ils le remettent à son relais dès qu’ils ont internet, et ce téléphone aussi.** | Rien : il arrive dès que l’un d’eux, ou ce téléphone, atteint internet. Attends **✓✓**. |
| **Envoyé par LoRa, chiffré de bout en bout, car le relais était injoignable.** | Il arrive si son Erevos a une radio sur le même mesh, à portée : attends **✓✓**, ou vérifie le relais. |
| **Envoyé par SMS, chiffré de bout en bout, car rien d’autre ne pouvait le prendre.** | Rien : ça coûte des SMS, et l’opérateur voit que tu as écrit à son numéro. **✓✓** arrive dès que le relais ou Nostr sont joignables. |
| **En attente. Le relais est injoignable (ou Il n’y a pas de relais), et son téléphone n’est pas à proximité.** | Rien : il part tout seul dès que le relais ou son téléphone à proximité peut le recevoir, puis affiche **✓**. Sans relais, remplis son adresse, comme dans [Discuter par un relais](#relay), ou approche-toi de son téléphone. |
| **En attente. Il est trop long pour LoRa.** | Rien : il part dès que le relais ou son téléphone à proximité peut le recevoir. Ou envoie-le en parties plus courtes. |
| **En attente. Il est trop long pour un SMS.** | Rien : il part dès que le relais ou son téléphone à proximité peut le prendre. Ou envoie-le en parties plus courtes. |
| **Non envoyé. Le relais n’a plus la file d’attente de ce contact.** | Demande-lui de t’écrire, ou son nouveau lien de contact. |
| **Cette version ne peut pas chiffrer, donc les discussions par le relais sont désactivées.** | Recompile l’app : cette version est plus ancienne que son chiffrement. |

## Faire tourner ton propre relais {#own-relay}

Un relais que tu fais tourner toi-même est le plus sûr, car celui qui fait tourner un relais voit qui s’y connecte. Le
code source contient tout dans \`deploy/relay\`.

- **Sur ton propre réseau :** fais tourner le relais sur un ordinateur, ouvre le port 7879 dans son pare-feu, et tape
  \`ws://<son adresse>:7879\` sur chaque téléphone. Referme le port quand tu as fini.
- **Sur internet :** un serveur (VPS) sous Debian 12 ou Ubuntu 22.04 ou plus récent, un nom de domaine (ou un nom
  \`sslip.io\` gratuit) et les ports 80 et 443 ouverts. Une seule commande installe le relais derrière Caddy, avec un
  certificat de Let's Encrypt et un jeton aléatoire. Chaque téléphone utilise alors \`wss://<ton domaine>\` et ce jeton.
  La même commande installe le relais d’appel pour les appels, qui a aussi besoin du port 3478 et des ports UDP 50000 à
  50999 ouverts.

Les files d’attente et les messages en attente sont gardés sur le disque du serveur, de même que les morceaux chiffrés
des photos et des fichiers jusqu’à ce qu’ils soient pris (1024 Mo ensemble au plus), si bien qu’un redémarrage ne perd
rien, et aucune requête n’est journalisée. Les messages envoyés pour plus tard y sont aussi gardés jusqu’à leur heure,
10 000 ou 256 Mo au plus : le relais voit quand chacun doit partir, pas ce qu’il dit.

**Pourquoi :** ce que le relais garde a des limites, si bien que les téléphones qui l’utilisent ne peuvent pas remplir
son disque ni sa mémoire.

**Sa propre clé :** le fichier de clé du relais (\`EREVOS_RELAY_KEY\`, que la commande unique met en place) est ce qu’il
prouve à chaque connexion, si bien que les téléphones le reconnaissent à cette clé plutôt qu’à son certificat (voir [La
clé propre du relais](#relay)). Garde ce fichier, dans ses sauvegardes aussi : avec un nouveau, chaque téléphone qui
connaissait l’ancienne clé refuse le relais jusqu’à ce que quelqu’un y appuie sur **Il a une nouvelle clé**.

**Invitations :** le relais peut laisser chaque téléphone avoir son propre jeton, dans un fichier de jetons, puis
laisser ces téléphones en inviter d’autres, chaque invitation pour un téléphone (voir [Invitations au relais](#relay)).
Active-le avec \`EREVOS_RELAY_INVITES=on\` à côté de \`EREVOS_RELAY_TOKENS\` ; le relais écrit alors lui-même les lignes
des téléphones invités dans ce fichier, avec qui les a invités et quand, et retirer une ligne coupe ce téléphone, ainsi
que les téléphones qu’il a invités. Il laisse entrer 100 téléphones par invitation au plus
(\`EREVOS_RELAY_MAX_INVITED\`). Qui a invité qui se suit par le jeton, pas par le nom : une ligne mise à la place d’une
autre avec un nouveau jeton coupe les téléphones que l’ancienne avait invités, sauf si \`erevos-relay free-line NAME\`,
lancé avec le relais arrêté, les libère d’abord. Un téléphone qui vient avec le jeton du relais (\`EREVOS_RELAY_TOKEN\`)
demande une fois une ligne à lui, que le relais ajoute comme l’une des tiennes, en notant qu’il est venu avec le jeton
du relais et quand, 50 par jour au plus : tu peux ainsi distribuer ce jeton, supprimer la ligne de n’importe quel
téléphone, puis changer le jeton sans couper les autres. \`deploy/relay/README.md\` explique comment.

**Connexion :** avec un fichier de jetons, le relais peut aussi laisser des téléphones se connecter avec un fournisseur
OpenID Connect, comme Authentik, pour obtenir un jeton à eux, et vérifie chaque compte toutes les heures, retirant ses
téléphones après 3 jours sans réponse et deux vérifications de plus de chaque téléphone qui échouent à une heure
d’intervalle (voir [Se connecter au relais](#relay)). Un navigateur peut lancer 10 connexions par minute. Avec
\`EREVOS_RELAY_OIDC_GROUP\`, seuls les comptes de ce groupe le peuvent. Il faut un client chez le fournisseur, quelques
réglages, et \`/signin/\` transmis au relais en HTTP simple : \`deploy/relay/README.md\` explique comment.

> Ne publie jamais le jeton là où d’autres peuvent le lire. Celui qui fait tourner le serveur voit les adresses IP qui
> se connectent, les identifiants des files d’attente, et quand et combien arrive. Il ne peut pas lire les messages, qui
> sont chiffrés de bout en bout.

## Relais d’attache {#home-relay}

Sous **Réglages** → **Relais et réseaux** → **Relais d’attache**, un espace peut avoir un second relais avec sa propre
file d’attente : un relais à la maison, sur un Raspberry Pi ou un vieil ordinateur, ou tout autre relais en qui tu as
confiance. C’est facultatif.

- **Ce qu’il fait :** ton lien de contact et chaque message indiquent cette file à côté de ton relais. Tant que ton
  relais est injoignable, tes contacts écrivent là, et Erevos prend ce qui y arrive à chaque passage. Ce que tu envoies
  passe par lui quand ton propre relais est en panne.
- **Comment le configurer :** fais tourner un relais comme dans [Faire tourner ton propre relais](#own-relay), tape son
  adresse (et son jeton, s’il en a un) et choisis **Enregistrer**. Tes contacts l’apprennent par ton prochain message,
  ou par ton nouveau lien de contact.
- **Ce qu’il voit :** ce que voit ton relais, l’adresse de ce téléphone quand il prend des messages, et quand et combien
  arrive. Les discussions masquées ne l’utilisent pas.
- **Pour les discussions masquées :** chaque emplacement masqué peut avoir son propre relais d’attache, sous **Pour les
  utilisateurs avancés** sur son écran sans discussion choisie, tant qu’il est ouvert. Il est gardé avec cet emplacement
  seul, scellé avec son code PIN, si bien que l’espace n’en sait rien, et il est consulté tant que l’emplacement est
  ouvert. Utilise un autre relais que celui de l’espace : un même relais qui verrait les deux files les relierait.

**Plus d’un :** **Ajouter un autre relais d’attache** en donne jusqu’à deux de plus, chacun avec sa propre file, par
exemple un à la maison et un chez un ami. Vos contacts les essaient dans l’ordre affiché, et Erevos prend ce qui arrive
sur chacun. Votre lien de contact ne nomme les autres que tant qu’il reste assez court pour un code QR ; le reste
parvient à vos contacts avec votre prochain message. Un contact avec un Erevos plus ancien n’utilise que le premier.

## Par Tor {#tor}

Sous **Réglages** → **Relais et réseaux** → **Tor**, **Ce qui passe par Tor** choisit lesquelles des requêtes de cet
espace vers ses relais passent par le réseau Tor. Chaque espace a son propre choix :

| Choix | Ce qui passe par Tor |
| --- | --- |
| **Messages** | Tant que tu ne changes rien. Ce que tu écris, et ce qui dit quelque chose à tes contacts, comme le fait qu’un message a été lu. Les images, fichiers et messages vocaux passent en direct, ce qui est plus rapide : pour eux, le relais voit l’adresse IP de ton téléphone. |
| **Tout** | Les fichiers aussi. Rien ne va à un relais sans Tor. |
| **Rien** | Le relais voit l’adresse IP de ton téléphone pour tout. |

**Pourquoi :** avec **Messages**, ce que tu écris est caché par Tor et ne l’attend jamais, tandis que les images,
fichiers et messages vocaux, qui sont gros, passent en direct et donc plus vite.

- **Ce qu’il cache :** le relais ne voit plus l’adresse IP de ton téléphone, seulement une sortie Tor (ou rien, pour un
  relais avec une adresse \`.onion\`). Ton opérateur téléphonique ou le Wi-Fi voit seulement que tu utilises Tor, pas
  quel relais.
- **Ce qu’il coûte :** ce qui passe par Tor arrive et part plus lentement, et le premier démarrage de Tor prend un
  moment. L’écran montre où en est Tor. Pour ménager la batterie, Erevos envoie le remplissage réduit que Tor a conçu
  pour les téléphones : le remplissage que Tor envoie pour cacher quand tu parles part toutes les 9 à 14 secondes, pas
  toutes les quelques secondes, et rien n’arrive au téléphone.
- **Ce qu’il ne couvre pas :** les appels, dont le son et l’image passent directement entre les téléphones ou par le
  relais d’appel ; les téléphones à proximité et les SMS, qui n’utilisent pas internet.
- **Sur Android seulement :** Erevos sur un ordinateur et l’app web n’ont pas encore Tor, donc là, tout passe en direct.

> Avec **Messages**, un message n’attend jamais Tor : un message que Tor n’a pas pu porter au relais part aussitôt en
> direct, de même que les messages pendant que Tor démarre, ou pendant une minute après qu’il n’a pas pu joindre le
> relais ; puis Tor est réessayé. Avec **Tout**, rien ne va à un relais sans Tor : quand Tor ne peut pas joindre le
> relais, le message attend et est réessayé ; Erevos ne se rabat jamais tout seul sur ta propre connexion.

### Ponts

Là où Tor lui-même est bloqué, **Ponts** sur le même écran permet à Tor de joindre son réseau par des ponts. C’est
**Aucun pont** tant que tu ne choisis pas, chaque espace a le sien, et cela ne compte que tant que quelque chose passe
par Tor.

| Choix | Ce que c’est |
| --- | --- |
| **obfs4** | Les ponts obfs4 fournis avec Tor Browser. Pour qui surveille le réseau, Tor ressemble à des octets aléatoires. Un censeur qui les connaît peut les bloquer. |
| **Snowflake** | Par les navigateurs de bénévoles, via WebRTC, comme un appel vidéo. Pour en trouver un, Erevos interroge le broker de Snowflake à travers un CDN, derrière le nom d’un autre site, et des serveurs STUN indiquent au téléphone sa propre adresse : ils voient cette adresse, jamais tes messages. Plus lent, et difficile à bloquer. |
| **Les miens** | Des lignes de pont de bridges.torproject.org, de bridges@torproject.org par e-mail, ou de @GetBridgesBot sur Telegram, collées une par ligne ; puis appuie sur **Utiliser ces ponts**. Les ponts obfs4, Snowflake, WebTunnel, meek et les ponts simples fonctionnent. |

- **Seulement par eux :** avec des ponts, Tor ne va jamais directement à ses relais. Quand aucun pont ne répond, avec
  **Tout**, les messages attendent, comme quand Tor ne peut pas joindre le relais ; avec **Messages**, ils vont au
  relais sans Tor jusqu’à ce qu’un pont réponde. Les lignes qui ne sont pas des ponts ne sont pas prises, et Tor reste
  désactivé.
- **Les changer** pendant que Tor tourne ferme ses connexions et les refait de la nouvelle façon.
- **Sur Android seulement :** l’app embarque lyrebird, le programme de Tor lui-même pour obfs4, Snowflake, WebTunnel et
  meek. Un ordinateur et l’app web n’ont pas encore Tor, donc pas de ponts non plus.

## Par Nostr {#nostr}

Sous **Réglages** → **Relais et réseaux** → **Nostr**, **Les textes par Nostr** est sur **Activé** tant que tu ne le
changes pas. Alors ce que tu écris à un contact dont l’Erevos lit aussi sur Nostr passe par des relais Nostr publics,
via Tor, au lieu de passer par ton relais. Chaque espace a son propre choix, et ses propres relais Nostr.

- **Comment c’est scellé :** chiffré de bout en bout comme toujours, puis scellé une fois de plus pour une clé que ton
  contact a donnée à cette discussion seule, et signé par une clé faite pour ce seul texte (un gift wrap NIP-59). Les
  relais Nostr voient que quelqu’un a écrit à une clé qui ne nomme personne, quand, et quelle taille ; pas qui l’a
  écrit, ni à qui. Ton relais ne le voit pas du tout.
- **Ce que les relais Nostr peuvent savoir :** ton téléphone demande à chacun d’eux toutes ses clés à la fois, via Tor :
  un relais peut savoir que ces clés sont lues ensemble, jamais d’où. Chaque relais est joint par ses propres circuits
  Tor, si bien qu’aucune sortie Tor ne porte ce qui va à deux d’entre eux, et aucune ne peut savoir que c’est le même
  téléphone. Certains relais refusent certaines sorties Tor, et certaines sorties ne peuvent pas joindre un relais :
  après un tel échec, l’essai suivant passe par une autre sortie.
- **Seulement via Tor :** avec Tor réglé sur **Rien**, ou pendant que Tor démarre, les textes passent par ton relais.
- **Les relais :** relay.damus.io, nos.lol et relay.primal.net tant que tu ne les changes pas ; tu peux ajouter les
  tiens, cinq au plus. Tes contacts apprennent les relais sur lesquels tu lis, et t’y écrivent ; un relais qui prend un
  texte suffit.
- **Ce qui reste sur ton relais :** les appels, réactions, et les marques qu’un message est arrivé ou a été lu ; et ce que tu écris à des contacts sur un iPhone ou un ordinateur, qui ne lisent pas sur Nostr. Les images, fichiers et messages vocaux passent par ton relais quand il y en a un entre vous ; sans relais entre vous, ils passent aussi par Nostr (voir Sans aucun relais).
- **Par où il est passé :** appuie longuement sur un message : son menu dit **Envoyé par Nostr** ou **Arrivé par Nostr**
  quand un relais Nostr l’a pris. Désormais il dit aussi **Envoyé par le relais**, **Arrivé par le relais**, **Envoyé à son téléphone proche**, **Arrivé d’un téléphone proche** ou **Envoyé par LoRa** ; un message plus ancien ne dit rien. La note sous les
  messages dit aussi **Envoyé par Nostr**. Deux téléphones côte à côte se donnent d’abord les textes à proximité : pour
  essayer Nostr, désactive le Bluetooth et **Trouver Erevos sur le même Wi-Fi** sur les deux.
- **Ce que les relais ont fait en dernier :** l’écran **Nostr** montre, pour chaque relais, s’il a pris le dernier texte
  qu’on lui a donné et combien de secondes après, ou pourquoi pas, et si ton téléphone y lit. C’est gardé sur ce
  téléphone seulement, jusqu’à la fermeture d’Erevos. Un relais qui a pris un texte mais ne l’a pas dit dans les 20
  secondes compte comme un relais qui ne l’a pas pris : le texte passe alors aussi par ton relais, et ton contact le
  voit une fois.
- **Sur Android seulement,** comme Tor.

**Pourquoi :** les relais Nostr sont publics, donc Erevos ne les joint que via Tor, et ils n’apprennent jamais où est
ton téléphone. Seuls les textes y vont : un texte a ton relais comme secours, s’il n’arrivait pas, alors que les marques
qu’un message est arrivé ou a été lu n’en auraient aucun, et un message envoyé pour plus tard a besoin de ton relais
pour le garder jusqu’à son heure. Sans relais entre vous, les images, fichiers et messages vocaux y vont aussi (voir Sans aucun relais).

> Si le téléphone de ton contact ne dit pas dans les cinq minutes qu’un texte est arrivé, celui-ci passe aussi par ton
> relais, et ton contact le voit une fois. Quand aucun relais Nostr ne le prend, il passe aussitôt par ton relais.

- **Discussions masquées :** elles lisent aussi sur Nostr, tant qu’elles sont ouvertes, et fermées aussi tant que
  **Recevoir une fois fermées** est activé pour elles et que l’espace est ouvert (voir [Discussions masquées](#hidden)).
  Fermées, elles affichent quand même « Nouveau message » : avec chaque texte par Nostr, ton contact envoie aussi à ton
  relais une sonnette, un message qui ne dit rien, que ton relais compte comme un message, comme avant. Sans relais,
  leur lien de contact et leur code QR disent où elles lisent sur Nostr, avec une clé de cet emplacement seul, et les
  textes, les réactions et les marques qu’un message est arrivé y vont, comme depuis un téléphone sans relais.

### Sans aucun relais {#nostr-only}

Un téléphone sans relais, sans invitation et sans compte LPHL peut quand même commencer : son lien de contact et son
code QR disent où il lit sur Nostr, et cela suffit pour parler.

- **Pour commencer :** dans **Nouvelle discussion**, appuie sur **Commencer sans relais**, puis sur **Afficher mon code
  QR** ou **Partager mon lien de contact**, et donne-le à quelqu’un qui utilise Erevos. Celui qui l’ajoute t’écrit par
  Nostr, via Tor, et apparaît comme une demande de message, que tu acceptes. Tu peux aussi ajouter son lien ou son code
  QR, de la même façon.
- **Ce qui passe :** les textes, stickers, réactions, modifications, et les marques qu’un message est arrivé ou a été lu, tout par Nostr ; et les photos, fichiers et messages vocaux. Un message vocal passe en wraps comme un texte. Une photo jusqu’à 3 Mo passe en morceaux de 32 Ko, un wrap chacun, envoyés avant le message qui la propose ; l’autre téléphone les garde, chiffrés avec le reste de l’espace ou des discussions masquées pour lesquels ils sont venus, jusqu’à ce que tous soient arrivés, quatre jours au plus. Une photo plus grande, une vidéo ou tout autre fichier, jusqu’à 20 Mo, passe en un seul blob, chiffré sur le téléphone, vers un serveur de fichiers Blossom (blossom.primal.net, blossom.band ou nostr.download), via Tor : le serveur ne garde que ce qu’il ne peut pas lire. Les appels et les groupes ont besoin d’un relais, ou de l’autre téléphone à proximité. Les discussions masquées fonctionnent ainsi aussi, par Nostr seulement (voir [Discussions masquées](#hidden)).
- **Quand il n’arrive pas :** les relais Nostr gardent un texte deux jours. Tant que le téléphone de ton contact n’a pas
  dit qu’il est arrivé, Erevos le lui redonne une fois par jour, pendant deux semaines.
- **Un relais tout seul :** quand ton contact a un relais qui lui permet d’inviter, son Erevos envoie tout seul au tien
  une invitation à celui-ci, une fois, dans la discussion, que vous vous soyez rencontrés par Nostr ou à proximité, par
  Bluetooth, Wi-Fi ou un code QR. Ton téléphone la prend tout seul, et à partir de là les photos, messages vocaux et
  appels fonctionnent aussi, avec tout le monde. Elle compte comme l’une de ses invitations. Quelqu’un dont tu n’as pas
  accepté la demande de message ne choisit aucun relais pour toi : son invitation attend que tu l’acceptes, une semaine
  au plus.
- **Un Erevos plus ancien** ne lit pas la partie Nostr d’un lien : il te joint à proximité seulement, jusqu’à ce que tu
  aies un relais.

**Pourquoi :** Nostr n’est que la porte d’entrée. Personne n’a besoin d’une invitation pour commencer, et dès que l’un
de vous a un relais, celui-ci porte ce qui est trop gros pour Nostr.

## Matrix {#matrix}

Dans **Réglages** → **Relais et réseaux** → **Matrix**, un espace peut se connecter à un compte Matrix, pour discuter
avec des personnes qui utilisent Element ou une autre app Matrix. Erevos parle lui-même au serveur Matrix, comme
Element : aucun pont ne se met entre les deux.

- **Se connecter :** ton identifiant Matrix, comme @nom:matrix.org, et son mot de passe. Erevos devient un nouvel
  appareil du compte, nommé Erevos. La connexion et les clés de l’appareil sont gardées chiffrées dans cet espace, et
  sont dans les sauvegardes : après une restauration, l’espace se reconnecte, comme un nouvel appareil. Ses discussions
  masquées peuvent avoir un compte Matrix à elles, voir [Discussions masquées](#hidden).
- **Authentification unique :** sur Android, quand ton serveur Matrix fait se connecter les gens ailleurs (comme
  matrix.org le demande pour les nouveaux comptes), **Se connecter par authentification unique (SSO)** ouvre le
  navigateur sur cette page, et revient à Erevos une fois connecté là-bas ; un serveur avec plusieurs fournisseurs te
  laisse en choisir un. Le navigateur ne passe pas par Tor, donc cette page voit ton adresse. Comme il n’y a pas de
  mot de passe à donner, Erevos ne crée les clés de signature croisée du compte que si le serveur les prend sans
  redemander ; sinon vérifie cet appareil par emoji ou QR code depuis un autre des tiens, ou entre la clé de sécurité.
- **Discussions :** **Nouvelle discussion** lance une discussion chiffrée avec un identifiant Matrix. Les invitations
  s’affichent en premier, avec **Rejoindre** et **Refuser**.
- **Groupes :** **Nouveau groupe**, sur l’écran Matrix, crée un groupe chiffré à partir d’un nom et des ID Matrix que tu
  écris, chacun invité à le rejoindre, comme Element en crée un ; chacun y voit qui sont les autres. **Rejoindre un
  groupe** en rejoint un par son adresse, comme #name:matrix.org. Un groupe public peut ne pas être chiffré, et son
  écran le dit alors. Dans un groupe, **Inviter** invite quelqu’un d’autre, si le groupe te le permet.
  Taper **@** dans un groupe propose ses membres ; un message nomme ceux écrits en entier, et leurs applis les
  préviennent.
- **Chiffrement :** les messages sont chiffrés de bout en bout avec le chiffrement propre à Matrix (Olm et Megolm, par
  vodozemac). Une discussion non chiffrée le dit.
- **Pas anonyme :** le serveur Matrix voit ton compte, qui parle avec qui et quand, et, sans Tor, d’où. Dans une
  discussion avec des personnes sur d’autres serveurs, ces serveurs le voient aussi.
- **Par Tor :** sur Android, Matrix suit le choix de cet espace sous **Réglages** → **Relais et réseaux** → **Tor**.
  Avec **Messages**, tout, les photos aussi, passe par Tor dès que Tor est prêt, et en direct tant que Tor démarre ou
  quand il échoue ; avec **Tout**, seulement par Tor ; avec **Rien**, en direct. L’écran Matrix dit par où il passe en
  ce moment.
- **Messages d’avant :** un message envoyé avant qu’Erevos se connecte, ou dont la clé n’est pas encore arrivée,
  s’affiche verrouillé.
- **Photos et fichiers :** **Photo** et **Fichier** les envoient, jusqu’à 50 Mo, chiffrés sur le téléphone avant
  d’aller au serveur Matrix, qui ne garde ainsi que ce qu’il ne peut pas lire. Une photo reçue n’est téléchargée que si
  vous touchez **Afficher la photo** ; **Enregistrer** garde n’importe quel fichier sur le téléphone.
  Touchez une photo affichée pour la voir sur tout l’écran, comme dans la discussion d’un contact : deux doigts ou un
  double appui zooment, elle tourne avec le téléphone, et **Enregistrer** la garde (voir Photos et fichiers, sous
  [Discuter par un relais](#relay)).
- **Réactions, réponses, modifications et suppression :** appuie longuement sur un message pour ouvrir son menu :
  choisis une réaction en haut, **Répondre** pour lui répondre, **Copier** pour ses mots, et sur un message de toi
  **Modifier** ou **Supprimer**. Une réponse montre le message auquel elle répond au-dessus de ses mots, et un appui
  dessus mène au message. Les réactions s’affichent sous un message ; appuie sur l’une pour réagir pareil, ou sur la
  tienne pour la retirer. Elles ne sont pas chiffrées, comme Element les envoie, même dans une discussion chiffrée : le
  serveur Matrix voit quel message a reçu quelle réaction, et de qui. Tu es le seul à pouvoir modifier tes propres
  messages, et un message modifié affiche **Modifié**. **Supprimer** retire un message de toi pour tout le monde dans la
  discussion, une fois que tu confirmes ; on ne peut pas l’annuler, et la discussion garde une ligne disant qu’il a été
  supprimé.
- **Écrit :** qui écrit en ce moment dans la discussion, comme le dit le serveur Matrix, s’affiche dessous avec
  **écrit…**. Erevos ne le dit de toi que si tu actives **Dire quand j’écris** sur l’écran Matrix ; c’est désactivé au
  départ, car cela passe par le serveur Matrix sans chiffrement, donc le serveur sait chaque fois que tu écris.
- **Marques :** tes messages montrent **✓** quand le serveur Matrix les a pris et **✓✓✓** quand tous les autres
  membres de la discussion les ont lus, comme l’appli Matrix de chacun le dit à son serveur (accusés de lecture).
  Matrix n’a pas de marque pour un message arrivé sur un téléphone, donc il n’y a pas de **✓✓**. Maintiens un de tes
  messages et choisis **Qui l’a lu** pour voir qui l’a lu et quand, et qui ne l’a pas lu (les 100 premiers). Une appli
  Matrix peut être réglée pour n’envoyer aucun accusé de lecture : son membre apparaît alors comme n’ayant pas lu.
- **Photos de profil :** un salon Matrix, ou la personne dans une discussion avec une personne, montre sa photo dans
  la liste des discussions, de même qu’un contact XMPP. **Choisir une photo**, sur l’écran Matrix, met la tienne pour
  tes contacts ; **Retirer** l’enlève. Les photos ne sont chiffrées dans aucune appli Matrix ou XMPP : le serveur les
  voit, et tes contacts voient la tienne.
- **Messages précédents :** une discussion qui a plus d’historique sur le serveur Matrix affiche **Charger les messages
  précédents** en haut ; chaque appui en rapporte d’autres, et la discussion reste là où tu lisais. Un message dont la
  clé n’est pas encore arrivée s’affiche verrouillé.
- **Messages vocaux :** maintiens le micro sous le champ du message pour enregistrer, et relâche pour envoyer ; glisse
  vers la gauche avant de relâcher pour abandonner l’enregistrement. Une minute au maximum, et un appui de moins d’une
  seconde n’envoie rien. Avec TalkBack, appuie une fois pour commencer et une autre pour envoyer. Dans une discussion
  chiffrée, il est chiffré comme une photo, et Element et les autres applis Matrix le lisent comme un message vocal. Un
  message vocal qui arrive se lit avec **Lire**, et n’est récupéré que quand tu le lis. Sa forme d’onde part avec lui,
  comme Element la dessine, et un message vocal qui arrive avec une forme d’onde la montre sous **Lire**, colorée
  pendant la lecture.
- **Vérifier par emoji :** dans une discussion avec une personne, **Vérifier par emoji** vous montre à tous les deux
  sept images ; si elles sont identiques, dans le même ordre, touchez **Ils correspondent** sur les deux téléphones.
  Personne ne peut alors être au milieu sans qu’on le voie, et la discussion indique **Vérifié par emoji**.
  **Vérifier cet appareil avec un autre des vôtres**, sur l’écran Matrix, fait de même avec votre propre Element, pour
  qu’il fasse confiance à l’appareil d’Erevos. Element peut aussi lancer l’une ou l’autre.
- **Vérifier par QR code :** une fois qu’une vérification est acceptée des deux côtés, et que les deux applis le
  peuvent, la carte montre un code et **Photographier leur code**. Laisse l’autre appli photographier le code montré
  ici (dans Element : **Scanner**), puis réponds **Oui, elle le dit** quand elle dit que la vérification a réussi ; ou
  photographie le code que leur appli montre. **Comparer des emoji à la place** passe par l’autre chemin. Le code
  contient les clés des deux comptes (ou appareils) et un secret à usage unique, donc un code de quelqu’un au milieu
  ne correspond pas. Rien n’est considéré comme sûr tant que les deux côtés n’ont pas dit terminé.
- **Clé de sécurité :** sous **Clé de sécurité**, sur l’écran Matrix, saisissez la clé (ou phrase) de sécurité créée
  par Element : les messages précédents s’ouvrent depuis la sauvegarde des clés du compte, les nouvelles clés y vont,
  et vos autres appareils font confiance à celui-ci. Un compte sans clé peut **Créer une clé de sécurité** ici ;
  notez-la, car Erevos ne la garde pas.
- **Appels :** les deux tuiles en haut de la discussion appellent en voix ou en vidéo, avec Element Call, l’app d’appel
  d’Element et d’Element X, qu’Erevos porte en lui et montre par-dessus l’app, dans une fenêtre à elle : sur Android,
  dans l’app web et sur un ordinateur (Windows, macOS et Linux). La flèche de retour qui s’y trouve, ou la touche Échap,
  rend la fenêtre petite, dans un coin par-dessus Erevos, pour que tu puisses continuer à utiliser Erevos pendant
  l’appel ; un appui sur la petite fenêtre la ramène à sa pleine taille. Tant que l’appel n’a pas commencé, un bouton
  **Fermer** en dessous y met fin, au cas où il ne commencerait jamais. Les appels pour toi sonnent ici comme ceux
  d’Erevos, tant que cet espace est ouvert : **Répondre** ouvre Element Call dans l’appel, **Refuser** le dit à la
  personne qui appelle. Le son et l’image sont chiffrés de bout en bout, avec des clés que seules les personnes dans
  l’appel ont, et passent par le serveur média (LiveKit) que ton serveur Matrix indique, qui voit l’adresse de cet
  appareil ; un serveur Matrix sans serveur média ne peut pas appeler. Ce qu’Element Call dit au serveur Matrix passe
  par Erevos, et par Tor comme le reste de Matrix, mais l’appel lui-même ne passe jamais par Tor. Element Call
  n’atteint aucun traceur. Les anciens appels Matrix à deux, comme les fait FluffyChat, sonnent aussi ici (voir **Ancien appel**). Tant qu’un
  appel Matrix est en cours ou sonne, un autre appel, d’Erevos ou sur XMPP, ne sonne pas et s’affiche comme manqué, et
  inversement. Sur Android, Retour ou quitter Erevos rend la fenêtre de l’appel petite, par-dessus d’autres apps
  (image dans l’image). Sailfish OS n’a pas d’appels Matrix.
- **Dans l’app web et sur un ordinateur :** le navigateur ou l’ordinateur demande une seule fois la caméra et le
  microphone ; sur un ordinateur, seule la fenêtre de l’appel peut utiliser la caméra. Où va le son, et quel microphone
  sert, c’est l’ordinateur ou le navigateur qui le décide. Dans l’app web, Element Call vient d’une seconde adresse à
  lui, erevos-call.lphl.nekten.eu, et sur un ordinateur d’une partie à part de l’app, si bien qu’il ne peut rien lire
  d’Erevos : ni ses clés, ni ses discussions. L’app web vérifie les fichiers d’Element Call avec la même version signée
  que l’app elle-même avant de le lancer ; le premier appel dans l’app web prend donc un moment de plus, le temps de
  récupérer et de vérifier Element Call.
  **Pourquoi :** le code d’Element Call n’est pas écrit par Erevos, alors il tourne à part d’Erevos, où il ne peut
  jamais approcher ses clés ni ses discussions.
- **Notifications :** un message qui arrive affiche une notification et compte dans le nombre sur l’icône d’Erevos,
  comme dans les discussions d’Erevos lui-même, tant que cet espace est ouvert ; sur un ordinateur, tant qu’Erevos
  tourne. Sur Android, **Notifications**, en bas d’une discussion, la met en sourdine ou lui donne un son à elle ; une
  discussion en sourdine ne compte pas.
- **Tant que cet espace est fermé :** sur Android, **Signaler les nouveaux messages**, sous **Tant que cet espace est
  fermé** sur l’écran Matrix, laisse cet espace dire « New message » quand quelque chose arrive sur Matrix pendant
  qu’un autre espace est ouvert, comme le font ses propres discussions avec **Aussi quand un autre espace est ouvert**
  dans **Réglages** → **Notifications** → **En arrière-plan**, qu’il faut aussi. Il ne dit jamais quoi, de qui ni dans
  quelle discussion, et un appel ne sonne pas alors : seule la clé de l’espace ouvre ce qui est arrivé. Pour cela, le
  serveur Matrix signale chaque message au relais de cet espace, sans aucun de ses mots : le serveur Matrix apprend
  l’adresse du relais, et le relais quand des messages arrivent. Désactivé tant que vous ne l’activez pas ; il faut un
  relais mis à jour pour cela, que le serveur Matrix puisse joindre.
- **Fils :** maintiens un message et choisis **Répondre dans le fil** pour répondre dans un fil. Un fil s’ouvre sur un
  écran à part, et un message qui a des réponses dit combien ; touche-le pour ouvrir le fil. Les applis sans fils
  montrent les réponses comme de simples réponses.
- **Sondages :** **Sondage**, sous le champ de message, pose une question avec plusieurs options. Touche une option
  dans la bulle pour la choisir, et touche encore pour la reprendre ; tout le monde voit qui a choisi quoi. Celui qui
  a fait un sondage peut le maintenir et choisir **Terminer le sondage** : plus aucun vote ne compte ensuite.
- **Positions :** **Position** envoie où tu es, une fois, comme le fait Element ; elle part chiffrée comme le chat, et
  s’affiche avec **Ouvrir la carte** sur Android.
- **Aperçus des liens :** avec les **Aperçus des liens** activés, comme pour les chats avec tes contacts, le premier
  lien d’un message part avec un aperçu fait par ton téléphone, chiffré aussi dans un chat chiffré. Jamais par Tor, et
  jamais dans un lieu caché.
- **Épingler et transférer :** **Épingler**, dans le menu d’un message, l’épingle en haut du salon pour tout le monde,
  si le salon te le permet ; une barre au-dessus du chat montre le dernier message épinglé, et un toucher y va puis
  montre le suivant. **Désépingler** l’enlève. **Transférer** envoie une copie à un autre chat de ce compte ; la copie
  ne partage rien avec l’original. Un chat non chiffré le dit à côté de son nom, car son serveur lit une copie envoyée
  là.
- **Trouver des groupes :** **Trouver un groupe**, sur l’écran Matrix, cherche parmi les salons publics de ton serveur
  Matrix, ou d’un autre que tu écris, qui apprend alors ce que tu cherches. **Espaces** liste les salons des espaces
  où tu es, pour les rejoindre. **Chercher des messages** cherche seulement dans les messages gardés sur ce téléphone,
  et ne demande à personne.
- **Favoris :** maintiens un chat dans la liste pour **Mettre en favori** (il passe en premier), **Basse priorité**
  (il passe en dernier) et **Quitter et oublier**, qui fait aussi oublier le chat au serveur Matrix, de sorte que tes
  autres applis Matrix ne le montrent plus. Ils sont gardés dans ton compte, donc tes autres applis Matrix trient
  pareil.
- **Un nouveau compte :** sur l’écran de connexion, **Créer un nouveau compte** en crée un sur un serveur Matrix qui
  le permet, à partir d’un serveur, d’un nom et d’un mot de passe. Si le serveur le demande, Erevos te demande
  d’accepter ses conditions, de donner un jeton d’inscription ou de faire une étape sur la page propre du serveur,
  comme un captcha, qui s’ouvre dans le navigateur, pas par Tor. Un serveur qui demande une adresse e-mail ne crée de
  comptes que sur son site ; crées-en un là-bas, puis connecte-toi ici.
- **Appareils :** **Appareils**, sur l’écran Matrix, liste les appareils du compte avec la dernière fois que chacun a
  été vu. **Renommer** donne un nouveau nom à l’un. **Déconnecter les autres appareils** les retire du compte : ils
  perdent leurs clés et ne peuvent plus lire ce qui arrive. Le serveur Matrix demande d’abord ton mot de passe.
- **Anciens appels :** dans un chat avec une personne, les tuiles d’appel demandent **Element Call** ou **Ancien
  appel**. L’ancien appel fonctionne avec FluffyChat, Nheko et Element sur ordinateur, et sonne ici quand ils
  appellent. Ses signaux passent comme le chat, chiffrés dans un chat chiffré, par ton relais quand l’espace en a un,
  sinon par le relais d’appels de ton serveur Matrix ; l’appel lui-même est chiffré (DTLS-SRTP).

**Pourquoi :** les discussions propres à Erevos cachent qui parle avec qui ; un serveur Matrix ne le peut pas. Les
discussions Matrix restent donc à part et marquées, pour les personnes que tu ne joindrais autrement que sur Matrix.

## XMPP {#xmpp}

Dans **Réglages** → **Relais et réseaux** → **XMPP**, un espace peut se connecter à un compte XMPP, pour discuter avec
des personnes qui utilisent Conversations, Monal, Gajim, Dino ou une autre app XMPP. Erevos parle lui-même au serveur
XMPP, comme ces apps : aucun pont ne se met entre les deux.

- **Se connecter :** ton adresse XMPP, comme name@example.org, et son mot de passe. Erevos trouve le serveur à partir
  de l’adresse ; **Serveur** ne sert que s’il ne le trouve pas (un nom, nom:port ou une adresse wss://). Erevos devient
  un nouvel appareil du compte. La connexion et les clés de l’appareil sont gardées chiffrées dans cet espace, et sont
  dans les sauvegardes : après une restauration, le compte continue comme un nouvel appareil. Ses discussions masquées
  peuvent avoir un compte XMPP à elles, voir [Discussions masquées](#hidden).
- **Discussions :** **Nouvelle discussion** ajoute l’adresse à tes contacts, demande à la personne de te laisser voir
  quand elle est en ligne, comme le font les autres apps XMPP, et ouvre la discussion. Qui demande à t’ajouter s’affiche
  en haut de la liste et sur l’écran XMPP, avec **Accepter** et **Refuser**. Les contacts que le compte a déjà sont sous
  **Contacts**.
- **Chiffrement :** les messages sont chiffrés avec OMEMO, pour chacun de ses appareils et pour les autres appareils de
  ton compte, qui lisent en même temps : avec OMEMO 2 pour un appareil dont l’app l’a, comme Kaidan, et avec la version
  0.3, que parlent Conversations, Monal, Gajim et Dino, pour les autres. C’est le code propre d’Erevos, non audité,
  vérifié contre d’autres bibliothèques OMEMO. Si ses apps n’ont pas OMEMO, Erevos le dit et n’écrit que si tu choisis
  **Écrire sans chiffrement** pour cette discussion ; **Chiffrer de nouveau** revient en arrière.
- **Ses clés :** en bas de la discussion sont les empreintes de ses appareils. Compare-les avec ce que montre son app,
  par un autre moyen que la discussion. Une clé qui a changé depuis qu’elle a été vue pour la première fois le dit. La
  clé de cet appareil est sur l’écran XMPP, deux fois : comme les apps avec OMEMO 0.3 la montrent, et comme Kaidan la
  montre. Un appareil a une seule clé dans les deux, écrite de deux façons.
- **Marques :** un trait à l’envoi, deux quand son app l’a, trois quand il est lu, comme dans les discussions propres
  d’Erevos, pour les apps qui envoient ces marques.
- **Répondre, modifier, réagir, supprimer :** un appui long sur un message ouvre son menu : **Répondre** y répond,
  **Modifier** change les mots d’un des tiens, **Supprimer** retire un des tiens pour tout le monde dans la
  discussion, et les emoji y réagissent ; toucher une réaction sous un message réagit de même, ou retire la tienne.
  Cela marche avec les apps qui font pareil, comme Conversations, Dino, Gajim, Monal et Kaidan ; les autres apps
  montrent une réponse avec une citation de ce qu’elle répond, et une modification comme un nouveau message. Les mots
  d’une réponse et d’une modification sont chiffrés comme la discussion, mais le message que concerne une réponse, une
  modification, une réaction ou une suppression, et l’emoji d’une réaction, partent comme ces apps les envoient, non
  chiffrés, si bien que les serveurs XMPP les voient. Dans un groupe, un message peut être répondu, recevoir une
  réaction ou être supprimé une fois que le groupe l’a renvoyé.
- **Écriture :** quand l’app de l’autre personne dit qu’elle écrit, **écrit…** s’affiche sous la discussion. Erevos ne
  le dit de toi que si tu actives **Dire quand j’écris** sur l’écran XMPP, et seulement à un contact qui voit ta
  présence, jamais dans un groupe ; c’est désactivé au départ, car cela passe par le serveur XMPP sans chiffrement,
  donc le serveur sait chaque fois que tu écris.
- **Photos de profil :** un salon Matrix, ou la personne dans une discussion avec une personne, montre sa photo dans
  la liste des discussions, de même qu’un contact XMPP. **Choisir une photo**, sur l’écran XMPP, met la tienne pour
  tes contacts ; **Retirer** l’enlève. Les photos ne sont chiffrées dans aucune appli Matrix ou XMPP : le serveur les
  voit, et tes contacts voient la tienne.
- **Bloquer :** **Bloquer**, en bas d’une discussion, empêche les messages, appels et demandes de cette personne
  d’atteindre ton compte XMPP, dans toutes ses applis, comme le fait le serveur XMPP (XEP-0191) ; elle n’est pas
  prévenue. **Débloquer** la laisse passer à nouveau. Quelqu’un bloqué dans une autre appli du compte l’est ici aussi.
- **Messages d’avant :** ce qui est arrivé pendant qu’Erevos était fermé est récupéré dans l’archive du serveur à la
  connexion, si le serveur en tient une. Un message envoyé avant la connexion de cet appareil, ou qui ne lui était pas
  destiné, s’affiche verrouillé.
- **Photos et fichiers :** **Photo** et **Fichier**, sous la zone du message, envoient un fichier jusqu’à 50 Mo, ou
  moins si ton serveur XMPP accepte moins, par l’envoi de fichiers du serveur. Dans une discussion chiffrée, il est
  d’abord chiffré sur ce téléphone, avec une clé faite pour lui seul, et la clé part dans le message, chiffrée avec
  OMEMO : le serveur ne garde ainsi que ce qu’il ne peut pas lire ; Conversations, Monal, Gajim et Dino l’ouvrent. Dans
  une discussion écrite sans chiffrement, le fichier part tel quel. Une photo, un son ou un fichier qui arrive n’est
  téléchargé que si tu touches **Afficher la photo**, **Lire** ou **Enregistrer**. Sur Android, les fichiers passent
  par Tor comme la discussion.
  Touche une photo affichée pour la voir sur tout l’écran, comme dans la discussion d’un contact : deux doigts ou un
  double appui zooment, elle tourne avec le téléphone, et **Enregistrer** la garde (voir Photos et fichiers, sous
  [Discuter par un relais](#relay)).
- **Messages vocaux :** appuie longuement sur le micro sous la zone de message pour enregistrer, et relâche pour
  envoyer, comme dans une discussion Matrix. Il part comme fichier son, chiffré comme la discussion, comme Conversations
  l’envoie.
- **Groupes :** un **groupe privé** est réservé à ses membres, et chacun voit qui sont les autres. Chaque message y est
  chiffré avec OMEMO pour les appareils de chaque membre, comme dans les groupes privés de Conversations, si bien que les
  serveurs XMPP ne peuvent pas le lire ; ce qui a été écrit avant ton arrivée s’affiche verrouillé. Un **canal** est tout
  autre groupe : il n’est pas chiffré, donc tous ceux qui y sont, et les serveurs, peuvent le lire, et son écran le dit.
  Sur l’écran XMPP, **Nouveau groupe** crée un groupe privé sur ton serveur XMPP à partir d’un nom et des contacts que tu
  choisis, et **Rejoindre un groupe** en rejoint un par son adresse, comme nom@conference.example.org, avec son mot de
  passe s’il en demande un. Sous un groupe privé, **Membres** liste ses personnes avec leurs clés, à comparer comme dans
  une discussion, et signale celles qui n’ont aucune clé OMEMO et ne peuvent pas lire ce qui est chiffré ; son
  administrateur peut **Ajouter des personnes**. Un contact qui t’invite dans un groupe s’affiche sous **Invitations à
  des groupes**, avec **Rejoindre** et **Refuser** ; l’invitation de toute autre personne n’est pas montrée. Tes groupes
  suivent les autres apps XMPP de ton compte par ses marque-pages : un groupe rejoint là-bas l’est ici aussi, et
  **Quitter le groupe** le quitte là-bas aussi. Un canal ne signale que les messages qui te nomment.
- **Gérer un groupe :** les admins d’un groupe voient **Gérer le groupe** sur son écran. Ils mettent le **Sujet** ; le
  propriétaire peut aussi le **renommer**. Dans un groupe privé, chaque membre a **Retirer** (les messages du groupe
  ne lui arrivent plus, et un admin peut le rajouter) et **Bannir** (il ne peut plus revenir tant qu’un admin ne
  l’autorise pas) ; le propriétaire peut **Nommer admin** un membre ou le **Retirer comme admin**. Dans un canal,
  **Gérer le groupe** liste qui s’y trouve, chacun avec **Retirer**. Les admins ne peuvent pas retirer d’autres admins
  ; seul le propriétaire le peut.
- **Appels :** les deux tuiles en haut de la discussion appellent la personne, en voix ou en vidéo, sur le même écran
  d’appel que les appels propres d’Erevos, et ses appels sonnent ici de la même façon, tant que cet espace est ouvert ;
  un appel de quelqu’un qui n’est pas dans tes contacts s’affiche seulement comme manqué. Cela marche avec les apps qui
  appellent comme Conversations (Jingle, avec la sonnerie de XEP-0353). L’appel lui-même est chiffré (DTLS-SRTP), mais
  l’empreinte de sa clé passe par les serveurs XMPP telle quelle, sans chiffrement de bout en bout, donc ces serveurs
  pourraient se mettre entre les deux. Il passe par le relais d’appel de cet espace s’il y en a un, sinon par le serveur
  TURN du serveur XMPP, et seulement par lui, donc l’autre personne n’apprend pas ton adresse ; sans aucun des deux, il
  passe directement, et elle l’apprend. Un appel ne passe jamais par Tor : le relais d’appel ou le serveur TURN voit
  l’adresse de ce téléphone.
  Dans un appel vocal, chacun de vous peut activer la vidéo : **Ajouter la vidéo**, sur l’écran de l’appel, allume ta
  caméra et demande d’abord à l’autre personne, qui choisit **Pas maintenant** ou **Activer la vidéo**. La vidéo ne
  démarre que si elle dit oui, et un non laisse l’appel comme il était. Cela marche avec les applis qui ajoutent la
  vidéo à un appel comme Conversations.
- **Appels de groupe :** dans un groupe privé où tu es, les deux tuiles en haut lancent un appel vocal ou un appel vidéo
  dans le groupe, et un appel lancé dans l’un de tes groupes sonne ici, tant que cet espace est ouvert. Tant qu’un appel
  est en cours dans un groupe, une tuile en haut et une ligne sous son nom le disent, et toucher l’une ou l’autre
  rejoint l’appel, jusqu’à ce que sa dernière personne parte. Cela marche avec Dino, qui appelle dans les groupes de la
  même façon (MUJI) : chaque appel a un salon à lui sur le service de groupes, que seuls les membres du groupe peuvent
  rejoindre, et chaque téléphone de l’appel se connecte directement à chacun des autres, comme dans les appels de groupe
  propres d’Erevos, par le relais d’appel de cet espace ou par le serveur TURN du serveur XMPP, huit personnes au plus.
  Comme dans un appel avec une personne, l’appel est chiffré (DTLS-SRTP), mais les empreintes de ses clés, et les
  invitations, passent par les serveurs XMPP telles quelles, et le service de groupes voit qui est dans l’appel et
  quand. Le compte XMPP propre aux discussions masquées appelle dans ses groupes de la même façon, tant que les
  discussions masquées sont ouvertes ; fermées, avec **Recevoir une fois fermées** activé, un appel qui arrive dans l’un
  de ses groupes s’affiche comme manqué.
- **Pas anonyme :** le serveur XMPP voit ton compte, tes contacts, qui parle avec qui et quand, et, sans Tor, d’où. Le
  serveur de l’autre personne voit la même chose de ses discussions avec toi.
- **Par Tor :** sur Android, XMPP suit le choix de cet espace sous **Réglages** → **Relais et réseaux** → **Tor** : avec
  **Messages**, il passe par Tor dès que Tor est prêt, et en direct tant que Tor démarre ou quand il échoue ; avec
  **Tout**, seulement par Tor ; avec **Rien**, en direct. L’écran XMPP dit par où il passe en ce moment. Là où Erevos ne
  peut pas ouvrir de connexion propre (l’appli web, un ordinateur), il utilise le WebSocket du serveur, en direct, et un
  serveur sans WebSocket n’est pas joignable.
- **Notifications :** un message qui arrive affiche une notification et compte dans le nombre sur l’icône d’Erevos,
  comme dans les discussions d’Erevos lui-même, tant que cet espace est ouvert ; sur un ordinateur, tant qu’Erevos
  tourne. Sur Android, **Notifications**, en bas d’une discussion, la met en sourdine ou lui donne un son à elle ; une
  discussion en sourdine ne compte pas.
- **Tant que cet espace est fermé :** sur Android, **Signaler les nouveaux messages**, sous **Tant que cet espace est
  fermé** sur l’écran XMPP, laisse cet espace dire « New message » quand quelque chose arrive sur XMPP pendant qu’un
  autre espace est ouvert, comme le font ses propres discussions avec **Aussi quand un autre espace est ouvert** dans
  **Réglages** → **Notifications** → **En arrière-plan**, qu’il faut aussi. Il ne dit jamais quoi, de qui ni dans quelle
  discussion, et un appel ne sonne pas alors : seule la clé de l’espace ouvre ce qui est arrivé. Pour cela, le serveur
  XMPP signale chaque message au relais de cet espace tant qu’aucune appli du compte n’est active : le serveur XMPP
  apprend le nom du relais, et le relais quand des messages arrivent. Désactivé tant que vous ne l’activez pas ; il faut
  un relais mis à jour pour cela, que les serveurs XMPP puissent joindre (son propriétaire ouvre un port pour eux), et un
  serveur XMPP qui envoie des notifications aux applis inactives, comme la plupart.
- **Un nouveau compte :** sur l’écran de connexion, **Créer un nouveau compte** en crée un sur un serveur XMPP qui le
  permet (XEP-0077), à partir d’une adresse et d’un mot de passe. Un serveur qui demande un captcha, ou ne crée de
  comptes que sur son site, le dit et donne sa page s’il en a une ; crée le compte là-bas, puis connecte-toi ici.
- **Mot de passe et suppression :** **Compte**, sur l’écran XMPP, a **Changer le mot de passe** et **Supprimer le
  compte**, qui supprime le compte du serveur pour de bon, après deux questions, la seconde demandant l’adresse.
  Erevos oublie ses clés ; l’adresse ne pourra peut-être pas être recréée.
- **Trouver des groupes :** **Trouver un groupe** a **Groupes sur ton serveur**, ceux que le serveur laisse trouver à
  tous, et **Chercher des groupes publics**, qui interroge search.jabber.network : il apprend les mots que tu cherches
  et voit le nom de ton serveur, et ton serveur non. Un groupe public est un canal, non chiffré.
- **Positions :** **Position** envoie où tu es comme un lien geo:, comme le fait Conversations, chiffré comme le chat
  ; une position qui arrive ainsi s’affiche comme position, avec **Ouvrir la carte** sur Android.
- **Aperçus des liens :** dans un chat écrit sans chiffrement, avec les **Aperçus des liens** activés, le premier lien
  part avec son aperçu (XEP-0511), et un aperçu qui arrive ainsi s’affiche sous les mots. Un chat chiffré n’en envoie
  aucun, car il dirait aux serveurs ce qu’est le lien.

**Pourquoi :** les discussions propres à Erevos cachent qui parle avec qui ; un serveur XMPP ne le peut pas. Les
discussions XMPP restent donc à part et marquées, pour les personnes que tu ne joindrais autrement que sur XMPP.

## Discussions avec d’autres applis Nostr {#nostr-chats}

Dans **Réglages** → **Relais et réseaux** → **Discussions Nostr**, un espace peut avoir sa propre clé Nostr, pour
discuter en tête-à-tête ou en groupe avec des personnes qui utilisent Damus, Amethyst, Primal, 0xchat ou une autre appli
Nostr qui envoie les messages privés comme le demande NIP-17. Ce n’est pas [Par Nostr](#nostr), qui porte les
discussions propres à Erevos.

- **La clé :** **Créer une clé Nostr** en crée une pour cet espace ; **Ou apporter une clé d’une autre appli Nostr**
  prend le nsec d’une clé que tu as déjà, et lit ce que ses relais gardent encore. La clé et ses discussions sont
  gardées chiffrées dans cet espace, et sont dans les sauvegardes : après une restauration, elles reviennent telles
  qu’elles étaient. Ses discussions masquées peuvent avoir une clé Nostr à elles, voir [Discussions masquées](#hidden).
  **Afficher la clé secrète (nsec)** l’affiche, pour la noter ou l’emporter dans une autre appli : qui l’a lit ces
  discussions et écrit en ton nom.
- **Ta clé Nostr :** donne son npub aux personnes qui doivent t’écrire, avec **Copier** ou **Afficher le code QR**.
  **Ton nom**, si tu en donnes un, est public : les autres applis Nostr l’affichent à la place de ton npub. Seul le nom y change :
  une photo ou des mots qu’une autre appli de ta clé a mis dans ton profil restent.
- **Discussions :** **Nouvelle discussion** prend son npub (ou nprofile), depuis son profil dans son appli, ou un nom
  comme nom@example.org (NIP-05). **Afficher les personnes que tu suis**, juste dessous, liste les personnes que suit ta
  clé Nostr (sa liste publique de personnes suivies, cherchée aussi sur des relais qui rassemblent de telles listes et
  sur les relais où écrit ta clé), avec leurs noms : touches-en une pour lui écrire. Quand il ne trouve personne, il dit
  pourquoi, de qui il a cherché la liste et comment chaque relais a répondu. Rien n’est chargé avant que tu appuies
  dessus, et aucune photo de profil. Les discussions sont aussi dans la liste de l’accueil, chacune marquée **Nostr** ;
  le bouton **Nostr** n’affiche qu’elles, et là **Nouvelle discussion** ouvre cet écran. **Lui donner un nom ici** donne
  à une discussion un nom que toi seul vois.
- **Groupes :** **Nouveau groupe** en crée un avec deux personnes ou plus parmi celles avec qui tu discutes, vingt au
  plus, avec un nom si tu veux. Les groupes Nostr n’ont pas d’administrateurs : un groupe, ce sont les personnes que
  nomment ses messages, chaque message va à chacune, chiffré pour chacune, et personne ne peut y être ajouté ou retiré
  ensuite ; un groupe avec d’autres personnes est un nouveau groupe. **Nommer ce groupe** le renomme pour tous, avec ton
  prochain message. Un message qu’une autre appli t’envoie, à toi et à d’autres, s’affiche aussi comme un groupe, chaque
  message avec qui l’a écrit.
- **Photos et fichiers :** **Photo** et **Fichier**, sous le champ du message d’une discussion, en envoient un de 20 Mo
  au plus. Il est chiffré sur ce téléphone avec une clé faite pour lui seul (AES-GCM, comme le demande NIP-17) et déposé
  sur un serveur de fichiers Blossom, qui ne garde que ce qu’il ne peut pas lire ; sa clé va dans le message, chiffrée
  comme les messages, et l’envoi est signé par une clé faite pour lui seul, si bien que le serveur n’apprend pas à qui
  il est. Sur Android, les fichiers passent par Tor comme ces discussions. **Serveurs de fichiers** dit où ils vont, au
  premier qui en accepte un : blossom.primal.net, blossom.band et nostr.download, sauf si tu les changes. Une photo ou
  un fichier qui arrive n’est récupéré que quand tu touches **Afficher la photo** ou **Enregistrer**, et ne s’ouvre que
  s’il est celui qui a été envoyé.
  Touche une photo affichée pour la voir sur tout l’écran, comme dans la discussion d’un contact : deux doigts ou un
  double appui zooment, elle tourne avec le téléphone, et **Enregistrer** la garde (voir Photos et fichiers, sous
  [Discuter par un relais](#relay)).
- **Réactions :** appuie longuement sur un message pour ouvrir son menu et réagir avec 👍, ❤️, 😂, 😮, 😢 ou 🙏, ou avec
  l’une de celles derrière **+** ; dessous s’affichent les réactions, la dernière de chaque personne, comme les autres
  applis Nostr les envoient (NIP-25).
- **Réponses :** **Répondre**, dans le menu d’un message maintenu, lui répond. Le message s’affiche au-dessus du champ
  du message, avec une ✕ pour l’abandonner, puis au-dessus de ta réponse dans la discussion, où un appui mène à lui. Les
  autres applis Nostr l’affichent aussi comme une réponse (NIP-17 la marque comme réponse). Une photo, un fichier ou un
  message vocal envoyé pendant qu’il s’affiche lui répond aussi. **Copier**, dans le même menu, prend les mots d’un
  message.
- **Messages vocaux :** maintiens le micro sous le champ du message pour enregistrer, et relâche pour envoyer ; glisse
  vers la gauche avant de relâcher pour abandonner l’enregistrement. Une minute au maximum, et un appui de moins d’une
  seconde n’envoie rien. Il part comme un fichier : chiffré sur ce téléphone et déposé sur un serveur de fichiers, avec
  sa durée dans le message ; qu’une autre appli le lise comme un message vocal ou comme un fichier son, c’est à elle
  d’en décider. Un message qui arrive avec sa durée se lit avec **Lire**, et n’est récupéré que quand tu le lis.
- **Chiffrement :** chaque message est chiffré pour l’autre personne et signé par toi, puis enveloppé de nouveau par une
  clé créée pour ce seul message, son heure reculée jusqu’à deux jours (NIP-17, avec NIP-44 et NIP-59). Les relais
  voient à qui il est destiné, pas qui l’a écrit, quand, ni ce qu’il dit. Une copie va à tes propres relais, pour que
  tes autres applis Nostr avec cette clé lisent aussi. C’est le code propre d’Erevos, non audité, vérifié avec l’exemple
  de NIP-17 lui-même et face à nostr-tools.
- **Où arrivent tes messages :** les relais auxquels les autres applis envoient tes messages : relay.damus.io, nos.lol
  et relay.primal.net si tu ne les changes pas, trois au plus. Erevos les fait connaître aux autres applis (une liste
  kind 10050) quand ils changent et une fois par semaine. Il envoie aux relais que nomme l’appli de l’autre personne ;
  une appli qui n’en nomme aucun ne peut pas encore recevoir de message, et Erevos le dit. Une clé venue d’une autre
  appli lit là où cette appli a dit que tes messages arrivent (sa propre liste kind 10050), sauf si tu les as changés
  ici, et redit cette liste, si bien que les deux applis reçoivent les mêmes messages ; elle lit ces relais depuis leur
  début, et récupère une fois ce que les relais nommés dans d’anciennes listes de la clé gardent encore.
- **Anciens messages privés :** beaucoup d’applis envoient et gardent encore des messages privés à l’ancienne manière
  (NIP-04, kind 4) ; Damus et Primal les ont montrés pendant des années. Erevos les lit aussi, passés et nouveaux, et
  les montre dans les mêmes discussions : sur les relais où arrivent tes messages et sur quatre autres au plus, ceux
  que lit l’autre appli de ta clé (sa liste kind 10002, pour une clé venue d’une autre appli) et relay.damus.io,
  nos.lol et relay.primal.net. Ces messages sont chiffrés eux aussi, mais les relais voient qui a écrit à qui, et
  quand. Erevos lui-même n’envoie qu’à la manière de NIP-17.
- **Publications publiques :** dans une discussion avec une personne, **Publications publiques** montre ce que la
  personne publie pour tous (kind 1) et les publications d’autres personnes qu’elle a repartagées, les plus récentes
  d’abord, trente à la fois, avec **Publications plus anciennes** pour en voir plus. C’est en lecture seule : d’ici, on
  ne peut ni répondre, ni réagir, ni publier. C’est cherché à l’ouverture, sur les relais utilisés pour les recherches
  et sur ceux où, selon sa liste de relais (NIP-65), elle écrit, comme le dit le choix de Tor de cet espace, et rien
  n’en est gardé. Aucune image ni aucun lien n’est ouvert : ils s’affichent sous forme d’adresses, qui peuvent être
  copiées. Une publication avec un avertissement de contenu montre ses mots après un appui sur **Afficher**. Un compte
  qui ne publie que pour tous, comme celui d’un projet, n’envoie pas de messages privés : sa discussion reste vide, et
  ses publications sont ici.
- **Marques :** un ✓ dès qu’un de ses relais a accepté le message. NIP-17 ne renvoie rien : ni quand son appli l’a, ni
  quand la personne le lit. Lire une discussion ici ne le dit à personne.
- **Pas anonyme :** ta clé est la même pour tous ceux à qui tu écris, et quiconque a un npub peut lui écrire. Les relais
  où arrivent tes messages voient ta clé les lire et, sans Tor, d’où. Seule la connexion qui lit tes relais leur dit qui
  lit, quand un relais le demande (NIP-42) ; l’envoi et la recherche de personnes, jamais.
- **Par Tor :** sur Android, les discussions Nostr suivent le choix de cet espace sous **Réglages** → **Relais et
  réseaux** → **Tor** : avec **Messages**, elles passent par Tor dès que Tor est prêt, et en direct tant que Tor démarre
  ou quand il échoue ; avec **Tout**, seulement par Tor ; avec **Rien**, en direct. L’écran dit par où elles passent en
  ce moment. Dans l’appli web et sur un ordinateur, elles passent en direct.
- **Notifications :** un message qui arrive affiche une notification et compte dans le nombre sur l’icône d’Erevos,
  comme dans les discussions d’Erevos lui-même, tant que cet espace est ouvert ; sur un ordinateur, tant qu’Erevos
  tourne. Sur Android, **Notifications**, en bas d’une discussion, la met en sourdine ou lui donne un son à elle ; une
  discussion en sourdine ne compte pas.
- **Pas encore :** les fichiers qu’une autre appli chiffre autrement (ils s’affichent comme un fichier qu’Erevos ne sait
  pas ouvrir).

**Pourquoi :** beaucoup de gens sont sur Nostr et y resteront. Ainsi tu leur écris depuis Erevos, à part et marqué, car
une clé Nostr est la même pour tous ceux à qui tu écris, alors que les discussions propres à Erevos cachent qui parle
avec qui.

## SMS {#sms}

Sur Android, Erevos peut être l’app SMS du téléphone : sous **Réglages** → **Téléphone et SMS** → **SMS** → **Erevos
comme app SMS**, appuie sur **Faire d’Erevos l’app SMS**. L’écran d’accueil montre alors les SMS et les discussions
Erevos dans une seule liste.

> **Les SMS et MMS ne sont pas chiffrés par Erevos.** Ils voyagent comme tout SMS, et restent dans le stockage SMS
> d’Android lui-même, où toute app autorisée à lire les SMS les voit et où les sauvegardes d’Android les contiennent.
> Seules les discussions Erevos sont chiffrées de bout en bout.

- **Les SMS d’avant :** rien à importer. Erevos montre les SMS et MMS déjà sur le téléphone, depuis le stockage propre
  d’Android, où ils restent pour toute autre app SMS. Android les garde, non scellés par Erevos, comme avec toute app
  SMS.
- **Si Erevos ne devient pas l’app SMS :** Android 15 et plus récent peut l’empêcher pour une app installée depuis un
  navigateur. Sous **Réglages** → **Téléphone et SMS** → **SMS** → **Erevos comme app SMS**, appuie sur **Ouvrir les
  applis par défaut** → **Appli SMS** → Erevos. Si Android parle d’un paramètre restreint, ouvre les **infos sur l’appli
  Erevos**, appuie sur **⋮** en haut à droite → **Autoriser les paramètres restreints**, et choisis de nouveau Erevos.
- **Quand un SMS arrive :** une notification dit « Nouveau message », sans qui l’a envoyé ni ce qu’il dit. Si aucune
  n’arrive, **Erevos comme app SMS** affiche **Autoriser les notifications** tant qu’Android les bloque.
- **Codes à usage unique :** un SMS qui dit contenir un code (d’une banque, d’une connexion), dans n’importe laquelle
  des langues de l’app, reçoit **Copier le code** en dessous dans la discussion, et sur sa notification aussi, sans que
  le code s’y affiche ; sur Android 12 et plus récent, le bouton de la notification demande d’abord de déverrouiller le
  téléphone. Seuls ses 4 à 8 chiffres sont copiés, jamais un numéro de téléphone, un montant, une date ou une heure, et
  Android n’en montre aucun aperçu. Toute app qui lit le presse-papiers peut les lire, alors colle le code rapidement.
- **Si aucun SMS ne s’affiche :** Android 15 et plus récent bloque l’autorisation SMS pour une app installée depuis un
  navigateur. Sous **Réglages** → **Téléphone et SMS** → **SMS** → **Erevos comme app SMS**, appuie sur **Autoriser les
  SMS**. Si Android parle d’un paramètre restreint, ouvre les **infos sur l’appli Erevos**, appuie sur **⋮** en haut à
  droite → **Autoriser les paramètres restreints**, et autorise les SMS sous **Autorisations**. Les discussions envoyées
  en RCS (« chat » dans Google Messages) restent dans cette app et ne s’affichent pas. **Erevos comme app SMS** dit
  combien de conversations SMS Erevos lit, ou pourquoi il n’a pas pu les lire.
- **Écrire à quelqu’un qui a Erevos :** cela passe par Erevos, chiffré de bout en bout, dès que son numéro est associé à
  son contact. Associe-le à la main dans la conversation SMS, ou laisse une invitation cachée le trouver. À partir de
  là, sa conversation SMS ouvre sa discussion.
- **Ses SMS dans la discussion :** les SMS et MMS avec son numéro, ceux d’avant et ceux qui arrivent, s’affichent parmi
  les messages de la discussion selon l’heure, chacun bordé et marqué **SMS (non chiffré)**, avec son ✓ et ses photos.
  Appuie longuement sur l’un d’eux pour le copier, le transférer ou le supprimer, comme dans la conversation SMS. Ils
  restent dans les SMS du téléphone, jamais dans l’historique scellé de la discussion ; seule la conversation avec ce
  numéro-là s’affiche, pas un MMS de groupe, et seulement tant qu’Erevos est l’app SMS ou peut lire les SMS, jamais dans
  les discussions masquées. Les plus récents s’affichent d’abord : **Afficher les SMS plus anciens**, au-dessus d’eux,
  en amène d’autres, et la recherche de la discussion les trouve aussi. Ouvrir la discussion les lit tous, les plus
  anciens aussi, si bien qu’aucun ne reste compté sur l’écran d’accueil. Un numéro sur sa fiche de contact fait de même,
  sans l’associer.
- **Un SMS ordinaire à ton contact :** quand il n’y a pas internet, par exemple. **SMS ordinaire** dans les **Détails**
  de la discussion ouvre sa conversation SMS pour l’y écrire, et **+** → **Envoyer par SMS**, ou **Par SMS** quand tu
  maintiens la flèche d’envoi, envoie ce que tu as tapé en SMS, après avoir demandé. Il s’affiche dans la discussion
  comme un SMS. L’opérateur téléphonique peut le lire. Un SMS ne peut ni disparaître ni répondre à un message : avec le
  chronomètre activé, ou un message auquel tu réponds, Erevos le dit quand il demande.
- **Invitations cachées :** avec le premier SMS à un numéro qui n’est pas un contact, Erevos envoie aussi une courte
  invitation cachée. Aucune ne part vers le numéro d’un contact Erevos, associé ou sur sa fiche de contact. Un téléphone
  sans Erevos n’affiche rien ; un téléphone avec Erevos répond par le relais et les deux deviennent contacts. Chaque
  numéro est sollicité une fois par mois au plus, et **Désactiver les invitations**, sous **Réglages** → **Téléphone et
  SMS** → **SMS** → **Trouver Erevos derrière un numéro**, les arrête.

**Pourquoi :** pour que deux téléphones Erevos se trouvent à partir d’un simple numéro de téléphone, sans serveur qui
connaît les numéros. L’invitation est un SMS de données, que les apps de messagerie n’affichent pas, si bien qu’un
téléphone sans Erevos n’affiche rien.

- **Tous les autres :** un SMS ordinaire, marqué SMS. L’opérateur téléphonique peut le lire, comme il lit tout SMS.
- **✓ et ✓✓✓ :** un SMS à toi affiche ✓ dès qu’il est parti, et ✓✓✓ dès que l’accusé de réception du réseau dit qu’il
  est arrivé sur son téléphone, ou « non distribué ». Certains opérateurs n’envoient pas d’accusés de réception ; il
  reste alors à ✓. Un SMS ne peut pas dire s’il a été lu.
- **Photos (MMS) :** l’image avant le champ de message (**Photo**) ajoute une photo, réduite pour tenir dans un MMS
  (environ 280 Ko), sans rien d’autre que l’image. Les photos qui arrivent par MMS s’affichent dans la conversation. Un
  MMS est aussi peu protégé qu’un SMS : l’opérateur téléphonique peut le voir.
- **Choisir le destinataire :** sous **Nouveau SMS**, touche **Contacts** pour choisir parmi tes contacts, avec une
  recherche, ou tape simplement : les contacts dont le nom ou le numéro correspond à ce que tu tapes s'affichent sous le
  champ, et un toucher le remplit. Un contact avec plusieurs numéros montre une ligne pour chacun. Pour un groupe,
  chaque contact choisi s'ajoute aux numéros déjà là. Ce sont les contacts du téléphone et, avec Erevos déverrouillé,
  ceux gardés seulement dans Erevos et tes contacts Erevos avec un numéro, jamais les noms des chats cachés. Avec
  seulement les SMS ouverts, seuls les contacts du téléphone s'affichent. Android demande d'abord si Erevos peut les
  lire.
- **MMS de groupe :** sous **Réglages** → **Téléphone et SMS** → **SMS** → **Nouveau SMS**, tape plusieurs numéros
  séparés par des virgules et appuie sur **Écrire**. Chaque message part à tous en un seul MMS, même un texte seul, et
  leurs réponses arrivent dans la même conversation, chacune avec son auteur. Tout le monde y voit le numéro de chacun,
  et l’opérateur téléphonique voit tout.
- **Deux SIM :** la SIM d’envoi s’affiche au-dessus du champ de message ; appuie une fois sur **Choisir la SIM** pour
  laisser Erevos les voir. Ton choix est gardé pour ce numéro ; d’ici là, Erevos répond sur la SIM où est arrivé le
  dernier message. Chaque message montre sa SIM.
- **SMS plus tard :** maintiens le bouton rond **Envoyer** après le champ et choisis une heure, comme dans une
  discussion. Le SMS s’affiche à la fin de la conversation marqué **Programmé** ; appuie dessus pour l’annuler. Il part
  à cette heure, même avec Erevos fermé et verrouillé ; si le téléphone est alors éteint, dès qu’il est rallumé et
  déverrouillé. D’ici là, il n’est pas dans les SMS du téléphone, où d’autres apps le verraient, et l’opérateur
  téléphonique ne l’a pas. Il attend verrouillé avec une clé du téléphone lui-même (Android Keystore), pas avec le mot
  de passe de ton espace, car Android doit l’envoyer pendant qu’Erevos est verrouillé : la protection qu’a tout SMS une
  fois envoyé, puisque les SMS envoyés restent dans les SMS du téléphone. Texte seulement, vers un seul numéro.
- **Liens :** une adresse web dans un SMS est soulignée, et s’ouvre comme dans une discussion, une fois que tu l’as vue
  en entier.
- **Noms de tes contacts :** désactivé au début, si bien que les numéros des SMS s’affichent comme numéros. **Noms**,
  au-dessus de la liste, les débloque (comme **Afficher les noms de mes contacts** sous **Réglages** → **Téléphone et
  SMS** → **SMS** → **Noms de tes contacts**) : les noms que les contacts de ton téléphone donnent aux numéros des SMS,
  et les photos qu’ils ont pour eux, ou sinon ceux de tes contacts gardés seulement dans Erevos, dans la liste et dans
  la conversation. Appuie de nouveau sur **Noms** pour n’avoir que les numéros. Erevos ne les lit que pour les afficher,
  et n’en garde aucune copie.
- **Expéditeurs avec un nom :** un SMS venant d’un nom au lieu d’un numéro, comme celui d’une banque, s’ouvre pour être
  lu, mais on ne peut pas y répondre.

### SMS chiffrés quand rien d’autre ne marche

Quand le relais, Nostr, les téléphones à proximité et LoRa échouent tous, un texte à un contact Erevos dont le numéro
est lié peut partir par SMS, chiffré de bout en bout comme tout message Erevos. C’est désactivé sauf si tu l’actives :
pour tous ces contacts dans **Réglages** → **Téléphone et SMS** → **SMS** → **SMS quand rien d’autre ne marche**
(**Activer pour tous les contacts**), ou pour un seul dans les **Détails** de sa discussion → **SMS quand rien d’autre
ne marche**.

- **Ce que ça coûte :** chaque SMS coûte ce que dit ton forfait. Un texte court prend 3 SMS, un plus long jusqu’à 10 ; à
  l’étranger un SMS peut coûter bien plus.
- **Ce que voit l’opérateur :** quel numéro a écrit à quel autre, quand, et combien de SMS, comme pour tout SMS ; jamais
  ce qui a été écrit, qui part comme le même message chiffré que le relais aurait porté.
- **Ce qui part :** seulement les textes et les suppressions. Pas les photos, fichiers, messages vocaux, appels,
  réactions ni les marques qu’un message est arrivé ou a été lu, ni les textes de plus d’environ 800 lettres latines
  (400 grecques), ni le tout premier message à un nouveau contact, qui porte les clés. Ceux-là attendent, marqués
  **En attente**, comme dans [Comment Erevos choisit le chemin](#paths). Les discussions cachées ne passent jamais
  par SMS.
- **Les deux téléphones** ont besoin d’Erevos comme app SMS, et du numéro du contact lié à sa discussion. Ces SMS sont
  des SMS de données cachés pour Erevos, qu’aucune app SMS n’affiche, et rien n’en reste dans les SMS du téléphone.
- **Par où il est passé :** reste appuyé sur le message : son menu dit **Envoyé par SMS** ou **Arrivé par SMS**.
  **✓✓** arrive dès que le relais ou Nostr sont de nouveau joignables : aucun SMS ne repart tout seul.

**Pourquoi :** les SMS atteignent un téléphone sans aucun internet, partout où il y a un réseau mobile. Mais ils
coûtent de l’argent et disent à l’opérateur qui parle à qui, ce qu’Erevos cache sinon ; c’est pourquoi le SMS est le
dernier chemin, et seulement quand tu le choisis.

> Active-le seulement pour ceux que tu dois joindre ainsi. L’opérateur, et quiconque peut voir ses registres, sait
> grâce à ces SMS que vos deux numéros se parlent, et quand.

### Garder les SMS en ordre

- **Appui long :** dans la liste, appuie longuement sur une conversation SMS pour ce qu’elle peut faire : **Épingler en
  haut**, **Archiver**, **Marquer comme spam**, **Bloquer** et **Supprimer**, et **Ajouter aux contacts** pour un numéro
  qui n’est aucun de tes contacts. Dans une conversation, **⋮** en haut montre la même chose, et un tel numéro a aussi
  **Ajouter aux contacts** sous son nom : un nouveau contact avec le numéro dedans.
- **Épinglées :** jusqu’à 10 conversations SMS restent en haut de la liste, avec une épingle. **Désépingler** en laisse
  une retourner à sa place.
- **Conversations archivées :** hors de la liste, sous **Archivées** en haut de l’écran d’accueil. Une conversation
  revient toute seule dans la liste quand un nouveau SMS en arrive, ou avec **Désarchiver**.
- **Corbeille :** une conversation supprimée attend 30 jours dans la **Corbeille**, puis Erevos la supprime des SMS du
  téléphone. D’ici là, **Récupérer** la remet dans la liste ; **Supprimer maintenant** et **Vider la corbeille**
  suppriment aussitôt, pour de bon. Un SMS qui arrive après qu’elle est partie dans la corbeille s’affiche de nouveau
  dans la liste. Seule l’app SMS peut supprimer des SMS.
- **Spam :** un filtre qui fonctionne sur le téléphone seul, par des règles, et n’envoie rien nulle part. Un SMS d’un
  numéro qui n’est pas un contact et auquel tu n’as jamais répondu va dans **Spam** quand il contient un lien avec des
  mots qui cherchent à tromper, comme un colis retenu ou un prix gagné, ou l’un des mots que tu ajoutes sous
  **Réglages** → **Téléphone et SMS** → **SMS** → **Filtre anti-spam**. **Marquer comme spam** et **Pas du spam**
  décident pour un numéro pour de bon. Un SMS que les mots propres du filtre attrapent (un lien avec des mots qui cherchent à tromper, d’un numéro de téléphone qui n’est dans aucun contact du téléphone et auquel tu n’as jamais répondu) arrive sans notification ni son, car le téléphone connaît aussi ces mots ; tout autre spam, par tes mots, tes règles ou de l’étranger, affiche encore « Nouveau message », car cette notification arrive avant qu’Erevos soit ouvert et le reste du filtre reste chiffré dans l’espace. Un numéro que tu as marqué **Pas du spam** ou que tu laisses passer arrive aussi en silence quand il envoie de tels mots, sauf s’il est dans les contacts du téléphone. Avec le **Filtre anti-spam** désactivé, chaque SMS a sa notification : le téléphone garde seulement si le filtre est activé, comme le dit le dernier espace ouvert.
  Chaque conversation dans **Spam**, dans le dossier et en haut de la
  conversation, dit pourquoi elle est là : le numéro est bloqué, tu l’as marqué, ta règle nomme l’expéditeur, un numéro
  de l’étranger, ton mot, ou un lien et quels mots.
- **Lettres qui se ressemblent :** un SMS d’arnaque qui remplace une lettre par une autre d’un autre alphabet qui lui ressemble, comme un а cyrillique dans un mot latin, ou cache dans un mot une marque qu’on ne voit pas, ne passe pas le filtre : il lit les mots comme ils se voient. L’expéditeur n’est jamais comparé ainsi, car un expéditeur qui ressemble à un expéditeur autorisé n’est pas celui-ci.
- **Règles sur qui envoie :** sous **Filtre anti-spam**, **Expéditeurs** accepte un nom d’expéditeur, comme en envoient
  les magasins et les banques (des lettres, sans accents ni majuscules), ou un numéro, où \`*\` remplace n’importe
  quoi : \`+4470*\` désigne tout numéro qui commence ainsi, \`1234*\` tout numéro court qui commence ainsi, et, une fois
  ton indicatif de pays connu, \`69*\` désigne aussi tout numéro \`+3069...\`. **Dans « Spam »** y envoie les siens ;
  **Laisser passer** les soustrait aux règles du filtre, comme ceux de ta banque ou de ta famille, même si un numéro que
  tu as marqué comme spam, ou bloqué, y va quand même. **Envoyer dans « Spam » les numéros de l’étranger** y envoie tout
  numéro écrit avec un autre indicatif de pays que **Ton indicatif de pays**, qu’Erevos tire des numéros auxquels tu
  réponds et que tu peux changer. Un numéro écrit sans indicatif est d’ici. Appuie sur une règle pour la retirer.
- **Bloquer :** **Bloquer** dans le menu d’une conversation, ou **Réglages** → **Téléphone et SMS** → **SMS** →
  **Numéros bloqués**, met un numéro dans la liste des numéros bloqués d’Android lui-même : Android rejette ses SMS, MMS
  et appels, et chaque espace et l’app de téléphone voient la même liste. Seules l’app SMS ou l’app de téléphone peuvent
  la voir et la changer.
- **Brouillons :** ce que tu tapes sans l’envoyer reste avec cette conversation, et la liste l’affiche comme
  **Brouillon**. Un SMS qui n’a pas pu partir reste là aussi comme brouillon.
- **Annuler l’envoi d’un SMS :** un SMS que tu envoies attend d’abord 5 secondes à la fin de la conversation : appuie
  alors dessus pour le reprendre dans le champ de message. **Réglages** → **Téléphone et SMS** → **SMS** → **Annuler
  l’envoi d’un SMS** règle **Désactivé**, 5 ou 10 secondes. Quand tu quittes Erevos, il part aussitôt.
- **Renvoyer :** un de tes SMS qui n’est pas parti, ou n’a pas été distribué, le dit : appuie dessus pour le renvoyer.
  Appuie longuement sur n’importe quel message pour **Transférer**, **Renvoyer** et **Supprimer**, avec ses mots à
  sélectionner et copier ; un message supprimé a aussi **Annuler**.
- **Transférer :** appui long sur un message → **Transférer**, puis tape un numéro et appuie sur **Écrire**, ou choisis
  un contact sous **Dans une discussion Erevos**. Il s’ouvre dans cette conversation, pour être relu et envoyé là. Vers
  un numéro, son image part aussi, en MMS ; dans une discussion, seulement ses mots.
- **Chaque espace a les siens :** les épingles, les conversations archivées, la corbeille, les marques de spam et les
  brouillons appartiennent à l’espace, scellés avec son mot de passe. Les SMS eux-mêmes restent dans les SMS du
  téléphone : un autre espace les voit tels qu’ils sont, et une conversation dans la corbeille ici s’affiche là-bas
  jusqu’à ce qu’elle soit supprimée du téléphone.

## Téléphone {#phone}

Sur Android, Erevos peut être l’app de téléphone du téléphone : sous **Téléphone** dans le menu, appuie sur **Réglages**
→ **Faire d’Erevos l’app Téléphone**. Chaque appel s’affiche alors sur l’écran d’appel propre d’Erevos, et les liens
tel: et le bouton d’appel du téléphone ouvrent le clavier d’Erevos. **Téléphone** s’ouvre aussi depuis le combiné en
haut de l’écran d’accueil, et a sa propre icône dans les apps du téléphone, **Téléphone**, verte avec un combiné sur la
marque d’Erevos, qui ouvre le clavier. Chacun de ceux-ci, comme un lien tel:, l’ouvre une fois Erevos déverrouillé :
avec un mot de passe, après que tu l’as tapé, sauf si le Téléphone s’ouvre sans lui (voir Le mot de passe d’Erevos,
ci-dessous). D’ici là, une carte en haut dit **Erevos n’est pas l’app Téléphone** ; sur un petit téléphone, elle ne
montre que ce titre, et appuyer dessus ouvre les **Réglages** du Téléphone.

- **Rechercher des contacts :** en haut du Téléphone, tape un nom, un numéro ou une partie de l’un ou de l’autre : les
  contacts avec un numéro s’affichent à la place des onglets, chaque numéro sur sa propre ligne. Appuie sur l’un pour
  l’appeler, ou appuie longuement pour le mettre sur le clavier. La recherche regarde dans les contacts du téléphone et,
  avec Erevos déverrouillé, dans ceux gardés seulement dans Erevos et tes contacts Erevos qui ont un numéro ; jamais
  dans les discussions masquées.
- **L’écran d’appel :** qui appelle, ou qui tu appelles, avec le nom et la photo que les contacts de ton téléphone lui
  donnent ; tant qu’Erevos est déverrouillé, un numéro associé à l’un de tes contacts Erevos montre le nom que tu lui as
  donné, de même que le numéro d’un contact gardé seulement dans Erevos ; celui d’un contact des discussions masquées
  ouvertes, seulement tant qu’elles sont ouvertes. Il s’affiche par-dessus l’écran de verrouillage et n’a pas besoin du
  mot de passe, car il faut pouvoir répondre à un appel avec Erevos verrouillé. Un appel entrant affiche **Answer**,
  **Decline** et **Message**, et Android sonne avec la sonnerie propre du contact ; les touches de volume la font taire.
  Pendant un appel : **Mute**, **Keypad** pour les tonalités qu’un menu demande, **Speaker**, **Hold**,
  **Add call** et **End**. À ton oreille, l’écran s’éteint.
- **Où va le son :** avec un appareil Bluetooth ou un casque, le bouton à côté de **Keypad** nomme où va le son, et un
  appui te laisse choisir : le téléphone, le haut-parleur, le casque ou l’appareil Bluetooth.
- **Un second appel :** un appel qui arrive pendant un appel affiche **Hold and answer**, **End and
  answer** et **Decline**. Avec un appel en attente, la ligne sous le nom le dit : appuie dessus, ou sur **Swap**,
  pour parler avec l’autre. **Merge** réunit les deux en un seul appel, quand ton opérateur téléphonique le permet.
- **Refuser avec un message :** **Message**, sur un appel qui sonne, le refuse avec une réponse rapide, ou une que tu
  écris, que ton téléphone envoie à l’appelant en SMS ; elle s’affiche parmi tes SMS. Sous **Téléphone** → **Réglages**,
  **Réponses rapides** les change : **Ajouter une réponse**, **Retirer**, **Enregistrer**, et **Utiliser les réponses
  habituelles**. Elles sont gardées sur le téléphone, non scellées, car l’écran d’appel les montre avec Erevos
  verrouillé.
- **Le clavier :** sous **Téléphone**, tape un numéro et appuie sur **Appeler** ; maintiens **0** pour +. En appui long,
  le champ du numéro en colle un. **Add call**, pendant un appel, l’ouvre une fois Erevos déverrouillé.
- **Deux SIM :** au-dessus d’**Appeler**, appuie sur la SIM avec laquelle appeler ; la première fois, **Choisir la SIM**
  demande à Android de laisser Erevos les voir. Un numéro que tu appelles sans choisir demande **Appeler avec**
  laquelle. Erevos garde la SIM que tu as utilisée pour chaque numéro, scellée dans l’espace, et l’appelle avec la même
  la fois suivante. L’écran d’appel nomme la SIM de chaque appel.
- **Les appels :** sous **Téléphone**, **Récents** liste l’historique des appels d’Android, les plus récents en premier,
  sous chaque jour : qui, quel type d’appel, sur quelle SIM, et comment. **Tous**, **Manqués**, **Entrants**,
  **Sortants** et, dès qu’un appel a été bloqué, **Bloqués** le filtrent ; avec deux SIM, **SIM 1** ou **SIM 2** garde
  les appels de cette SIM. Les appels successifs avec le même numéro s’affichent une fois, avec leur nombre. **☏**
  rappelle ; un appui sur la ligne montre ses appels, la durée de chacun, et **Appeler** (avec deux SIM, un pour
  chacune), **Envoyer un SMS**, **Ajouter aux contacts** pour un numéro qui n’est aucun de tes contacts, et **Modifier
  le numéro avant d’appeler**. Une fois vus là, les appels manqués quittent la notification d’Android, et cette
  notification ouvre **Récents**.
- **Supprimer des appels :** dans les appels de la ligne, **Supprimer cet appel** (ou **Supprimer ces 3 appels**, pour
  une ligne qui en a plusieurs) les supprime de l’historique des appels d’Android, **Supprimer** à côté de l’un de
  plusieurs supprime seulement celui-là, et **Supprimer tous les appels avec ce numéro**, quand il y en a d’autres, les
  supprime tous, les plus anciens aussi. **Annuler** s’affiche d’abord quelques secondes ; d’ici là, ils sont seulement
  masqués.
- **Favoris :** les contacts avec une étoile dans les contacts de ton téléphone, avec leurs photos. Un appui appelle le
  numéro par défaut du contact, ou demande lequel quand il y en a plusieurs et qu’aucun n’est par défaut ; en appui
  long, il les montre tous.
- **Plus pour un numéro :** dès qu’un numéro est tapé sur le clavier, **⋯** à côté propose **Ajouter aux contacts**, **Ajouter à un contact existant** (tes contacts s’ouvrent : touche celui auquel ajouter le numéro, ou crées-en un nouveau), **Envoyer un SMS** et **Copier le numéro**. Dans **Récents**, les appels de la ligne proposent la même chose, et **Ouvrir le contact** pour un numéro qui est l’un de tes contacts. Dans **Favoris**, un appui long sur un contact montre ses numéros, chacun avec **Envoyer un SMS** et **Copier le numéro**, et **Ouvrir le contact**. Avec Erevos verrouillé, le Téléphone ne fait qu’appeler et copier un numéro : pas de SMS, pas de changement dans tes contacts. Chaque touche, **Appeler** et la touche Entrée du clavier font vibrer brièvement ; **Réglages** → **Apparence** → **Vibrer au toucher** l’éteint. Voir [Apparence](#appearance).
- **Appels Wi-Fi et voix HD :** l’écran d’appel le dit sous le nom quand un appel passe par le Wi-Fi ou en voix HD, et
  **Récents** le dit pour chaque appel.
- **Blocage :** sous **Téléphone** → **Réglages**, **Bloquer le démarchage** bloque les appels des numéros que certains
  pays réservent au démarchage : la France (01 62, 01 63, 02 70, 02 71, 03 77, 03 78, 04 24, 04 25, 05 68, 05 69, 09 48,
  09 49 et 09 475 à 09 479, selon la décision 2022-1583 de l’ARCEP), l’Espagne (400, depuis le 17 octobre 2026), le
  Chili (809), l’Inde (140) et le Brésil (0303, que les appelants là-bas peuvent omettre depuis août 2025). Les autres
  pays ne réservent pas de tels numéros, ou Erevos n’en est pas sûr, donc rien n’est bloqué pour eux. Sous **Numéros
  commençant par**, tape le début d’autres numéros à bloquer, avec l’indicatif de pays (+33 162) ou comme tu le composes
  ici (0162), et appuie sur **Bloquer** ; **Retirer** en enlève un. Ceux-ci ne bloquent jamais un numéro des contacts de
  ton téléphone. Un appel bloqué ne sonne pas et ne laisse aucune notification ; il s’affiche dans **Récents**, sous
  **Bloqués**. Android demande une fois si Erevos peut filtrer les appels (**Laisser Erevos filtrer les appels**) : sans
  cela, un appel bloqué sonne un instant avant qu’Erevos y mette fin. Ce qui est bloqué est le même dans chaque espace,
  si bien que cela ne dit rien d’un autre, et c’est gardé sur le téléphone sans aucun nom.
- **Numéros bloqués :** sous **Téléphone** → **Réglages**, **Numéros bloqués** est la liste d’Android lui-même, la même
  que **Réglages** → **Téléphone et SMS** → **SMS** → **Numéros bloqués** : tape un numéro et appuie sur **Bloquer**, ou
  appuie sur l’un pour le débloquer. Dans **Récents**, les appels d’une ligne affichent **Bloquer ce numéro** ou
  **Débloquer ce numéro**, avec **Annuler**. Android rejette leurs appels avant qu’ils sonnent, et leurs SMS et MMS.
  Chaque espace voit la même liste.
- **Un groupe de contacts pour un temps :** sous **Téléphone** → **Réglages**, **Bloquer un groupe de contacts** liste
  les groupes (les libellés) des contacts de ton téléphone. **Bloquer** à côté de l’un bloque les appels de ses contacts
  **Pendant une heure**, **Jusqu’à demain matin** (7:00) ou **Jusqu’à ce que je lève le blocage** ; la ligne sous le
  groupe dit jusqu’à quand, et **Lever** y met fin plus tôt. Un tel appel est bloqué comme les autres : il ne sonne pas,
  et s’affiche dans **Récents**, sous **Bloqués**. Erevos ne fait que lire les groupes, et garde l’identifiant du groupe
  et l’heure, pas son nom. Tant qu’un groupe est bloqué, l’écran **Téléphone** le dit en haut, jusqu’à quand, avec
  **Lever**.

**Pourquoi :** un appel est filtré même avec Erevos verrouillé, donc ce qui est bloqué ne peut pas être scellé dans un
espace ; et, gardé de la même façon pour chaque espace, cela ne montre rien d’aucun d’eux.

- **Le mot de passe d’Erevos :** l’écran **Téléphone**, avec le clavier, les appels et les favoris, est derrière lui
  comme le reste d’Erevos. Seul l’écran d’appel ne l’est pas, sauf si tu laisses le Téléphone s’ouvrir sans lui : sous
  **Téléphone** → **Réglages**, **Ouvrir le Téléphone sans le mot de passe** (désactivé au début, et affiché seulement
  tant qu’Erevos a un mot de passe). Avec Erevos verrouillé, l’icône du Téléphone, un lien tel: et la notification d’un
  appel manqué ouvrent alors le clavier, **Récents** et **Favoris**, qu’Android garde pour toute app de téléphone, avec
  les noms des contacts du téléphone seulement : jamais ceux gardés seulement dans Erevos ni ceux des discussions
  masquées, et aucune SIM gardée pour un numéro. Là, tu peux appeler, rien de plus : pas de suppression, de blocage, de
  SMS ni d’ajout aux contacts. **Ouvrir Erevos** en haut affiche l’écran du mot de passe, tout comme l’icône propre
  d’Erevos après qu’Erevos a été en arrière-plan plus de 30 secondes, sauf si c’est un appel passé de là qui l’a mis en
  arrière-plan. **Remettre le Téléphone derrière le mot de passe** le désactive.
- **Si Erevos ne devient pas l’app Téléphone :** comme pour les SMS, Android 15 et plus récent peut l’empêcher pour une
  app installée depuis un navigateur. Sous **Réglages**, appuie sur **Ouvrir les applis par défaut** → **Appli de
  téléphone** → Erevos. Si Android parle d’un paramètre restreint, ouvre les **infos sur l’appli Erevos**, appuie sur
  **⋮** en haut à droite → **Autoriser les paramètres restreints**, et choisis de nouveau Erevos. **Autoriser les appels
  et les contacts** s’affiche tant qu’Android bloque encore les appels, l’historique des appels ou les contacts.
- **Après un redémarrage du téléphone :** tant que tu n’as pas déverrouillé le téléphone pour la première fois, c’est
  l’écran d’appel d’Android lui-même qui répond.
- **Ce qu’est un appel téléphonique :** un appel téléphonique ordinaire, comme avec toute app de téléphone : l’opérateur
  téléphonique le transporte et peut écouter. Les appels à tes contacts Erevos depuis une discussion sont autre chose :
  chiffrés de bout en bout, par internet.

## Contacts {#contacts}

Sur Android, **Contacts** dans le menu montre les contacts du téléphone : ceux des contacts d’Android lui-même, que tes
autres apps utilisent aussi, donc il n’y a rien à importer. Android demande une fois si Erevos peut les lire et les
modifier (**Autoriser les contacts**). Ils s’ouvrent aussi depuis la personne en haut de l’écran d’accueil, et ont leur
propre icône dans les apps du téléphone, **Contacts**, violette avec une personne sur la marque d’Erevos, qui les ouvre
derrière le verrou d’Erevos : avec un mot de passe, une fois que tu l’as tapé.

- **Trouver quelqu’un :** **Rechercher des contacts** cherche dans tous les champs : noms, numéros (quelle que soit leur
  écriture, avec ou sans l’indicatif de pays), e-mails, adresses, l’entreprise, l’anniversaire et la note. **Favoris**
  ne montre que les contacts avec une étoile.
- **Un contact :** appuie sur l’un pour tout voir. Appuie sur un numéro pour l’appeler, ou sur **SMS** à côté pour lui
  écrire dans Erevos ; appuie sur un e-mail ou une adresse pour l’ouvrir. **Ajouter aux favoris** en haut lui donne une
  étoile, dans les contacts d’Android, si bien que l’app de téléphone le liste aussi parmi les favoris.
- **Nouveau contact** et **Modifier** : prénom et nom, entreprise et poste, autant de numéros, d’e-mails et d’adresses
  qu’il te faut, chacun avec son type (**Mobile**, **Domicile**, **Travail**, **Autre**), un anniversaire
  (jour/mois/année, ou jour/mois) et une note. Un nouveau contact est gardé **Seulement sur ce téléphone**, ou dans un
  compte avec lequel le téléphone synchronise les contacts (Google), comme tu le choisis. Ce qu’Erevos ne montre pas
  d’un contact, comme les détails propres d’une autre app, reste tel quel.
- **Photo :** appuie sur l’image en haut d’un contact pour **Choisir une photo** parmi les photos du téléphone,
  **Prendre une photo** avec l’appareil photo, ou **Retirer la photo**. Tu la recadres en carré, et Erevos la redessine,
  si bien que rien de ce que disait la photo en plus de son image (un lieu, un téléphone) n’est gardé. Elle est gardée
  avec le contact dans les contacts d’Android, où le téléphone l’affiche quand il appelle.
- **Sonnerie :** sur un contact, **Choisir la sonnerie** ouvre le sélecteur propre d’Android, avec les sons du téléphone
  et ceux que tu as ajoutés ; le téléphone sonne avec elle quand ce contact appelle. **Sonnerie par défaut**, là,
  redonne celle du téléphone.
- **Fichiers .vcf :** **Importer depuis un fichier .vcf** dans le menu de Contacts lit un fichier vCard qu’un autre
  téléphone ou une autre app a enregistré (dans n’importe laquelle de ses versions, même celle des vieux téléphones
  grecs) et enregistre ceux qui ne sont pas encore sur le téléphone, avec leurs photos et leurs groupes, sur ce
  téléphone seulement ou dans un compte. **Enregistrer en fichier .vcf**, là, enregistre les contacts affichés (tous,
  les favoris, un groupe, ou ce que la recherche a trouvé) en un seul fichier, dans un dossier que tu choisis ; sur un
  contact, il enregistre celui-là. Le fichier est hors d’Erevos et non scellé : quiconque l’a peut lire les contacts.
- **Codes QR :** **Code QR** sur un contact montre sa vCard sous forme de code QR, que l’appareil photo d’un autre
  téléphone lit comme un contact à ajouter : son nom, ses numéros, e-mails, adresses et sa note, sans sa photo (une
  longue note ou beaucoup d’adresses sont laissées de côté pour tenir). Quiconque le voit peut le lire. **Lire le code
  QR d’un contact** dans le menu en lit un sur une photo que tu prends ou choisis, ici sur le téléphone, et commence
  avec lui un nouveau contact, enregistré seulement quand tu l’enregistres. Le code QR Erevos de quelqu’un en commence
  un avec son ID Erevos.
- **Doublons :** **Trouver les doublons** dans le menu liste les contacts qui semblent être la même personne gardée deux
  fois : le même nom (ses mots dans n’importe quel ordre), numéro ou e-mail. **Fusionner** garde le plus complet d’entre
  eux, avec chaque numéro, e-mail et adresse des autres, leurs notes, et leur photo, sonnerie, étoile et groupes quand
  il n’en a pas, et supprime les autres ; **Tout fusionner** le fait pour chaque série. **Pas la même personne** masque
  une série jusqu’à ce que tu rouvres la liste.
- **Anniversaires :** la puce **Anniversaires** sous la recherche liste les contacts qui ont un anniversaire, le
  prochain en premier, avec le nombre de jours restants et l’âge qu’ils vont avoir. **Rappels d’anniversaire** dans le
  menu (désactivé au début) met une notification le matin de chacun, à partir de 9:00, même avec Erevos fermé ; sur
  l’écran de verrouillage, elle dit seulement qu’il y a un anniversaire. Ce sont seulement les anniversaires des
  contacts du téléphone, jamais ceux des contacts gardés seulement dans Erevos.
- **Contacts de la SIM** dans le menu lit les contacts des cartes SIM du téléphone et copie ceux qui ne sont pas encore
  sur le téléphone (tous choisis au début) dans les contacts d’Android, sur ce téléphone seulement ou dans un compte. La
  SIM garde les siens.
- **Seulement dans Erevos :** sous **Enregistré dans**, un nouveau contact peut plutôt être gardé **Seulement dans
  Erevos** : scellé dans cet espace comme ses discussions, jamais dans les contacts d’Android, si bien qu’aucune autre
  app ni aucun compte ne le voit, et les autres apps ne montrent que son numéro ; l’écran d’appel d’Erevos montre son
  nom tant qu’Erevos est déverrouillé. Il a un cadenas dans la liste, et la puce **Seulement dans Erevos** ne montre que
  ceux-là. **Garder seulement dans Erevos** sur un contact du téléphone l’y déplace, avec sa photo et son étoile, et le
  supprime des contacts du téléphone ; **Déplacer dans les contacts du téléphone** l’en ressort. Sa photo est scellée
  avec lui. Les groupes, sonneries et rappels d’anniversaire sont ceux d’Android, il n’en a donc aucun. Un appel ou un
  SMS vers lui passe quand même par le téléphone, et s’affiche dans l’historique des appels et les SMS du téléphone
  comme n’importe quel autre. Une sauvegarde Erevos contient ces contacts, scellés.
- **Dans les discussions masquées :** **Contacts** en haut des discussions masquées ouvertes liste leurs propres
  contacts, gardés seulement là et scellés avec elles : ils ne s’affichent nulle part ailleurs, pas même dans les
  contacts de l’espace, et l’écran ne montre plus rien une fois les discussions masquées fermées. Un nouveau contact là
  est toujours l’un des leurs. On peut donner une photo à l’un d’eux, car les discussions masquées restent ouvertes
  pendant que tu la choisis ou la prends. Leur menu n’a que ce qui est à elles : **Importer depuis un fichier .vcf**
  garde les contacts d’un fichier avec elles, scellés, jamais dans les contacts du téléphone ; **Enregistrer en fichier
  .vcf** enregistre ceux qui sont affichés, ou un seul depuis sa fiche, dans un dossier que tu choisis (hors d’Erevos et
  non chiffré) ; **Lire le code QR d’un contact** commence un de leurs contacts. Un ID Erevos tapé ou lu là ajoute la
  personne aux discussions masquées, jamais à celles de l’espace. En appeler un par l’app de téléphone ferme les
  discussions masquées dès qu’Erevos est absent plus de 30 secondes, et s’affiche dans son historique des appels.
- **ID Erevos :** l’ID Erevos d’un contact est le lien de contact que montre son Erevos, sous **Copier mon lien de
  contact** ou en tant que son code QR. Sur la fiche d’un contact, ou sous **ID Erevos** quand tu en écris un, colle-le,
  ou lis-le avec **Photographier le code QR** ou **Choisir une photo du code QR** : **Ajouter à Erevos** (ou
  **Enregistrer**) ajoute la personne à tes discussions Erevos, qui s’ouvrent avec elle, et y associe le contact, et la
  discussion prend le nom du contact si elle n’en a pas à elle. Un contact qui est un contact Erevos montre le début de
  sa clé comme **ID Erevos**.
- **Contacts Erevos :** un contact qui est la même personne que l’un des contacts Erevos de tes discussions s’affiche
  comme une seule fiche avec lui : par un numéro associé à lui dans Erevos, par son ID Erevos, ou avec **Choisir dans
  mes discussions Erevos** sur sa fiche, une association scellée dans l’espace, jamais dans les contacts d’Android
  (**Pas ce contact Erevos** l’annule). La fiche a alors **Message**, **Appeler** et **Vidéo**, chiffrés de bout en bout
  par Erevos au lieu de passer par l’opérateur téléphonique. Un contact des discussions qui n’est aucun contact a sa
  propre fiche, avec le bouclier, où **Ajouter aux contacts** en crée un et **Associer à un de mes contacts** l’associe
  à l’un de ceux que tu as, dont la fiche le montre alors ; la puce **Contacts Erevos** les liste tous. Un contact
  Erevos sans nom à lui prend le nom du contact qui lui est associé, au moment de l’association ou quand la fiche de ce
  contact s’ouvre ; un nom que tu lui as donné dans Erevos reste, et un nom que tu as vidé revient alors depuis le
  contact. Dans les discussions masquées, ce sont les propres contacts des discussions masquées, et leur discussion
  s’ouvre là.
- **Historique :** la fiche d’un contact liste ses derniers appels dans l’historique des appels du téléphone, ses SMS et
  ses messages dans Erevos, les plus récents en premier ; appuie sur l’un pour rappeler, écrire un SMS ou ouvrir la
  discussion. Les appels s’affichent une fois que tu laisses Erevos lire l’historique des appels (**Afficher les
  appels**). Erevos ne les lit que pour les afficher, et n’en garde aucune copie.
- **Autres apps :** l’**Ajouter aux contacts** d’une autre app (un numéro dans l’app de téléphone, un e-mail dans la
  messagerie) peut s’ouvrir dans Erevos : un nouveau contact avec ce que cette app a donné, ou la liste pour appuyer sur
  le contact auquel l’ajouter. Une app qui montre ou modifie un contact peut aussi l’ouvrir dans Erevos, derrière le
  verrou d’Erevos. Android demande quelle app utiliser ; choisis Erevos. Une app qui te demande de choisir un contact,
  ou un numéro, un e-mail ou une adresse, n’obtient que celui sur lequel tu appuies, parmi les contacts du téléphone :
  ceux gardés seulement dans Erevos n’y apparaissent jamais.
- **Supprimer** retire le contact du téléphone, de chaque compte où il est gardé ; un contact gardé seulement dans
  Erevos, d’Erevos.
- **Groupes :** **Groupes** dans le menu de Contacts (les trois points) liste les groupes d’Android lui-même, comme
  Famille ou Travail, avec combien de contacts dans chacun, et en crée de nouveaux. Ouvres-en un pour **Ajouter des
  contacts**, en retirer un avec **×**, le **Renommer** ou **Supprimer le groupe** (ses contacts restent). Sur un
  contact, **Choisir les groupes** le met dans des groupes ou l’en retire. Les puces sous la recherche montrent les
  contacts d’un groupe. Un groupe est gardé dans un compte, comme ses contacts : un contact ne le rejoint que s’il est
  gardé dans ce compte aussi.

## Verrou par mot de passe {#lock}

Sous **Réglages** → **Confidentialité et sécurité** → **Verrou et second mot de passe**, **Verrouiller à l’ouverture
d’Erevos** a deux choix : **Pas de verrou** et **Mot de passe**.

1. Appuie sur **Mot de passe**, tape-le deux fois (au moins 4 caractères) et appuie sur **Enregistrer**.
2. À partir de là, Erevos le demande à chaque ouverture, et de nouveau après 30 secondes en arrière-plan.
3. **Changer le mot de passe** le change, et **Verrouiller maintenant** verrouille Erevos tout de suite.

- **Verrouillé, il reçoit encore :** quand Erevos se verrouille, l’écran du mot de passe passe devant l’espace ouvert,
  qui continue derrière lui : messages et appels arrivent encore, avec leurs notifications, et un appel s’affiche
  par-dessus l’écran du mot de passe. Ses écrans se ferment, les discussions masquées aussi, et l’écran d’appel ne
  montre plus les noms de ses contacts. Son mot de passe le rouvre ; le mot de passe d’un autre espace le ferme d’abord,
  sans rien en garder en mémoire.
- **Seulement les SMS :** quand Erevos est verrouillé, l’icône SMS, le bouton **SMS** du widget et la notification d’un
  nouveau SMS demandent encore le mot de passe, mais n’ouvrent ensuite que les SMS : la liste des conversations SMS du
  téléphone, chacune sur sa propre ligne, les conversations elles-mêmes, **Archivées**, **Spam** et **Corbeille**, et
  **Nouveau SMS**. Rien d’autre de l’espace ne s’affiche. Tout le reste, un contact, une discussion, **Réglages**,
  l’icône d’Erevos elle-même ou le cadenas orange **Tout déverrouiller** en haut, redemande le mot de passe, puis ouvre
  tout l’espace. Ainsi un code arrivé par SMS peut se lire avec quelqu’un à côté de toi, et le reste d’Erevos reste
  fermé.
- **Seulement les contacts :** de la même façon, l’icône Contacts, le bouton **Contacts** du widget et la notification
  d’un anniversaire demandent le mot de passe, puis n’ouvrent que les contacts : leur liste, la fiche d’un contact
  (sans tes discussions ni tes appels avec lui), **Modifier**, les groupes, les doublons, la SIM et l’importation.
  **Appeler** ouvre toujours le numéroteur du téléphone. Une discussion, un SMS, **Réglages** ou le cadenas orange
  **Tout déverrouiller** en haut redemande le mot de passe, puis ouvre tout l’espace. Une autre icône, le widget ou une
  notification, quand seuls les SMS ou seuls les contacts sont ouverts, demande le mot de passe comme quand Erevos est
  verrouillé, puis ouvre ce qu’elle désigne : l’icône Contacts seulement les contacts, l’icône SMS seulement les SMS,
  l’icône d’Erevos elle-même tout l’espace.

- **Voir ce que tu tapes :** chaque champ pour un mot de passe, un PIN ou un jeton, ici et partout dans Erevos, a un
  œil au bout : touche-le pour voir ce que tu tapes, et encore pour le masquer. Il est masqué de nouveau chaque fois
  que le champ réapparaît, et sur Android le clavier est prié de ne pas l’apprendre.
- **Mots de passe erronés :** après 5 essais erronés, chaque essai suivant te fait attendre, 30 secondes au début et
  deux fois plus longtemps à chaque fois, jusqu’à une heure. Le compte survit à un redémarrage. L’attente suit
  l’horloge propre du téléphone depuis son allumage, que personne ne peut régler, si bien qu’avancer la date et
  l’heure n’y met pas fin ; si le téléphone est éteint puis rallumé pendant une attente, il la refait depuis son
  début, car le temps déjà attendu ne peut pas être connu. Dans l’app web et sur un ordinateur, c’est pareil tant
  qu’Erevos reste ouvert, et cela repart de son début quand Erevos s’ouvre de nouveau.
- **Ce qui est scellé :** les contacts de chaque espace, les clés de ses conversations, ses messages, ses réglages de
  relais et son apparence sont gardés sur le téléphone scellés avec une clé que seul son mot de passe ouvre.
- **La liste tout de suite :** l’écran d’accueil garde une copie scellée de ses premières lignes, si bien que la liste
  s’affiche dès que l’espace s’ouvre, puis se met à jour. Elle a toujours la même taille, si bien qu’elle ne dit à
  personne combien il y a de discussions ni quels espaces sont utilisés, et elle ne contient jamais ce qu’a dit un
  message éphémère.

**Pourquoi :** chaque mot de passe essayé coûte exprès du temps et beaucoup de mémoire (PBKDF2, puis Argon2id), pour que
celui qui copie ce que garde le téléphone ne puisse pas essayer des mots de passe rapidement ; et quelqu’un qui tient le
téléphone attend plus longtemps après chaque essai erroné. Le compte est unique pour tout le téléphone, gardé d’un
redémarrage à l’autre, car l’écran du mot de passe vient avant l’ouverture de tout espace, et l’attente est mesurée là
où changer l’horloge ne peut pas la raccourcir.

> Il n’y a aucun moyen de récupérer un mot de passe oublié : rien n’est stocké qui pourrait ouvrir les données sans lui.
> Seule une empreinte digitale ou le visage, tant que c’est activé, ouvre encore le premier espace (voir ci-dessous).

### Captures d’écran

Avec le verrou par mot de passe activé, Android tient Erevos à l’écart des captures d’écran, des enregistrements d’écran
et des applis récentes : là, le dernier écran d’Erevos apparaît vide, si bien que celui qui tient un moment le téléphone
déverrouillé n’y voit pas tes discussions. Sous **Réglages** → **Confidentialité et sécurité** → **Captures d’écran**,
**Désactiver** permet de nouveau les captures d’écran (pour en envoyer une, par exemple), et **Activer** rétablit la
protection. Les discussions masquées en restent toujours à l’écart tant qu’elles sont ouvertes, quel que soit le
réglage. Le réglage est celui du téléphone, le même dans chaque espace. Sur un ordinateur et dans l’app web, il n’existe
pas.

**Pourquoi :** sans cela, le dernier écran d’Erevos reste comme une image parmi les applis récentes jusqu’à ce qu’Erevos
s’ouvre de nouveau, donc les discussions masquées en restent toujours à l’écart, pour ne jamais s’y montrer sans leur
code PIN. Le réglage est le même dans chaque espace pour qu’il ne dise rien de l’espace qui s’est ouvert.

### Empreinte digitale ou visage

Sur Android 11 et plus récent, avec une empreinte digitale ou un visage configuré dans les réglages du téléphone, Erevos
peut aussi s’ouvrir avec. C’est désactivé tant que tu ne l’actives pas.

1. Avec le verrou par mot de passe activé, sous **Empreinte digitale ou visage**, appuie sur **Activer**.
2. Tape le mot de passe de l’espace où tu te trouves, appuie sur **Activer**, et touche le capteur (ou regarde le
   téléphone).
3. À partir de là, l’écran du mot de passe a un bouton **Empreinte digitale ou visage**. Le mot de passe fonctionne
   toujours aussi, et **Désactiver** le désactive.

- **Seulement l’espace du premier mot de passe :** une empreinte n’ouvre jamais l’espace d’un second mot de passe, ni
  les discussions masquées. Activée dans l’espace qu’ouvre un second mot de passe, elle n’ouvre rien : la première fois
  qu’on l’essaie, elle se désactive d’elle-même, et le mot de passe ouvre Erevos. Le réglage a le même aspect dans
  chaque espace.
- **Sous la contrainte :** quelqu’un qui te retient peut appuyer ton doigt sur le téléphone, ou le tenir devant ton
  visage. Si cela peut arriver, laisse-la désactivée : il lui faut alors un mot de passe, et tu peux lui donner le
  second.
- **Comment c’est gardé :** la clé du premier espace est scellée par une clé dans le matériel sécurisé du téléphone
  (l’Android Keystore) qui ne fonctionne que juste après une vérification forte de l’empreinte ou du visage, une fois
  pour chaque utilisation. Ajouter ou retirer une empreinte ou un visage fait abandonner cette clé par Android : c’est
  alors désactivé, et tu l’actives de nouveau. Rien ne quitte le téléphone.
- **Quel visage :** un visage ne compte que là où Android classe son déverrouillage par le visage comme fort, comme sur
  le Pixel 8 et plus récent ; ailleurs, c’est l’empreinte.
- **Les mots de passe erronés** sont comptés comme avant : une empreinte ne change pas le compte.
- **Pas sur un ordinateur ni sur le web :** ce n’est proposé que sur Android. Désactiver le verrou le désactive aussi.

**Pourquoi :** un doigt est plus facile à forcer qu’un mot de passe, et quiconque dont le téléphone connaît le doigt ou
le visage pourrait l’utiliser, donc cela n’ouvre jamais l’espace d’un second mot de passe ni les discussions masquées.
Activé dans un autre espace, il garde une clé qui n’ouvre rien, de la même forme, si bien que ce qui est stocké ne
montre pas dans quel espace il a été activé.

## Second mot de passe {#second}

Si quelqu’un te force à ouvrir Erevos, tape le second mot de passe au lieu du tien. Il ouvre un Erevos séparé et vide,
avec ses propres contacts, son propre relais et sa propre apparence. Tes vraies discussions restent cachées, et rien
dans l’app ne montre qu’elles existent.

1. Avec le verrou par mot de passe activé, appuie sur **Définir le second mot de passe**.
2. Tape-le deux fois et appuie sur **Enregistrer**. Il doit être différent de ton propre mot de passe.

- **L’apparence :** le second espace commence avec l’apparence de l’espace où il a été défini, pour ne pas se faire
  remarquer.
- **Un seul à la fois :** définir de nouveau un second mot de passe remplace le précédent. **Supprimer le second mot de
  passe** le supprime.
- **Discrétion :** pour ta confidentialité, l’app ne montre jamais si un second mot de passe est défini. Dans l’app web
  avec les notifications quand l’app est fermée activées, le nombre sur l’icône d’Erevos reste tant qu’Erevos est
  fermé : s’il ne correspond pas à l’espace que tu ouvres, il peut en trahir un autre (**Nombre sur l’icône** le
  désactive).

## Discussions masquées {#hidden}

Chaque espace a 4 emplacements pour des discussions masquées, chacun ouvert seulement avec son propre code PIN, et elles
n’apparaissent jamais parmi tes autres discussions. Il n’y a aucun bouton pour elles nulle part. Chaque emplacement peut
contenir une discussion ou plusieurs, donc 2 espaces ont 8 emplacements.

**Pourquoi :** chaque emplacement a déjà son propre code PIN, donc une discussion seule dans un emplacement a sa propre
clé, et un emplacement peut aussi contenir plusieurs discussions sous un même code PIN. Le nombre d’emplacements est
fixe pour deux raisons :

- **Pour que rien ne se voie.** Les 4 emplacements existent dès le premier démarrage, remplis de données aléatoires tant
  qu’ils ne sont pas utilisés. Celui qui te force à ouvrir le téléphone, ou copie ce qu’il garde, ne peut pas savoir si
  tu as des discussions masquées, ni combien. Avec une clé pour chaque discussion, les fichiers scellés grossiraient à
  chaque nouvelle discussion masquée, et trahiraient leur nombre.
- **Pour que ça reste rapide.** Un code PIN tapé dans la recherche est essayé sur chaque emplacement, et chaque essai
  est lent exprès (Argon2id, qui prend beaucoup de mémoire et de temps, pour que les codes PIN ne puissent pas être
  devinés rapidement). Avec 4 emplacements, l’ouverture reste courte et prend toujours le même temps, si bien que le
  temps ne dit pas non plus combien sont utilisés.

Le nombre pourra être augmenté plus tard sans rien perdre, au prix d’une ouverture un peu plus lente ; le diminuer
supprimerait ce que contiennent les emplacements retirés.

1. Commence un emplacement de l’une de deux façons : sous **Réglages** → **Confidentialité et sécurité** → **Discussions
   masquées**, choisis **Emplacement 1** à **Emplacement 4**, appuie sur **Définir le code PIN des discussions
   masquées**, tape-le deux fois et appuie sur **Enregistrer** ; ou ouvre les **Détails** d’une discussion, appuie sur
   **Déplacer dans les discussions masquées**, tape un code PIN de 4 caractères ou plus, appuie sur **Nouvelles
   discussions masquées**, choisis un emplacement, puis **Créer et déplacer**. Retiens les emplacements que tu
   utilises : par discrétion, Erevos ne peut pas dire lesquels sont libres.
2. Pour les ouvrir, tape le code PIN dans **Rechercher dans les discussions** sur l’écran d’accueil et appuie sur Entrée
   (la touche de recherche du clavier). Ou maintiens **Nouvelle discussion** un instant : un champ pour le code PIN
   s’ouvre, avec une courte vibration sur Android, le même dans chaque espace ; tape-le et appuie sur **Ouvrir**. Il n’ouvre que l’emplacement qui a ce code
   PIN. Un code PIN erroné n’est qu’une recherche, ou ne fait que fermer le champ : rien ne se passe.
3. Elles s’ouvrent avec le titre **Discussions masquées**, avec **Contacts** et **Changer le code PIN** en haut, et
   listent leurs discussions et groupes comme l’écran d’accueil liste les tiens : les plus récents en premier, chacun
   avec ce qui a été dit en dernier, quand, et combien de messages ne sont pas lus. Appuie sur l’un pour l’ouvrir. La
   flèche de retour les ferme.
4. Pour déplacer une autre discussion dans un emplacement, ouvre ses **Détails**, appuie sur **Déplacer dans les
   discussions masquées**, tape le code PIN de cet emplacement et appuie sur **Déplacer**. La discussion quitte ta liste
   avec ses messages, son nom, son image et son apparence, et les discussions importées dedans, et son numéro de
   sécurité reste le même. Le téléphone du contact est aussitôt informé qu’il doit désormais écrire aux discussions
   masquées ; un message qu’il envoie à ce moment précis peut ne pas arriver.
5. Pour remettre une discussion parmi celles de l’espace, ouvre-la dans les discussions masquées, puis ses **Détails**,
   appuie sur **Remettre dans mes discussions** et **Déplacer**. Elle part avec ses messages, son nom, son image, son
   apparence et ses discussions importées, et son téléphone est informé d’où écrire.

- **Relais, Nostr et téléphones à proximité :** les discussions masquées ont leur propre file d’attente sur le relais et
  leurs propres clés. Tant qu’elles sont ouvertes, ou reçoivent fermées, elles atteignent aussi le téléphone d’un contact
  à proximité, comme tes autres discussions (voir [Discuter avec un téléphone à proximité](#nearby)), mais d’autres
  téléphones ne les portent jamais, et elles ne passent jamais par LoRa ni par SMS. Sans relais, leur lien de contact dit où elles lisent sur Nostr,
  avec une clé de cet emplacement seul, et les textes y vont, comme depuis un téléphone sans relais ; les photos,
  messages vocaux, appels et groupes ont besoin d’un relais. Tant qu’elles sont fermées, leurs messages attendent sur le
  relais, ou sur Nostr pendant deux jours, sauf si **Recevoir une fois fermées** est activé.
- **Recevoir une fois fermées :** un interrupteur en haut de chaque emplacement. Activé, ses discussions masquées
  reçoivent comme tes autres discussions tant que l’espace est ouvert, quel que soit l’écran affiché et avec Erevos en
  arrière-plan : leurs contacts voient aussitôt qu’un message est arrivé, une notification dit seulement « Nouveau
  message », sur Android un appel sonne avec « Appel entrant » et sans nom (sur l’écran de sonnerie, appuie sur
  **Répondre** ou sur le petit signe, tape le code PIN et appuie sur **Connecter**), et un rappel de leur Discussion
  avec moi-même affiche une notification qui dit seulement **Rappel**. Ce qui leur arrive par Nostr est alors lu aussi,
  et leurs comptes Matrix, XMPP et Nostr à elles restent connectés (voir plus bas). Un appel terminé avant que tu les
  ouvres, ou qui a sonné trop longtemps, s’affiche comme manqué. Rien d’elles ne s’affiche nulle part tant que le code
  PIN ne les ouvre pas. Un nouvel emplacement commence avec cet interrupteur activé ; les emplacements définis avant
  restent comme ils étaient jusqu’à ce que tu l’actives. Pour cela, la clé de l’emplacement est gardée chiffrée avec
  l’espace, parmi une clé aléatoire pour chaque autre emplacement, si bien qu’ouvrir l’espace ne montre pas quels
  emplacements reçoivent, ni lesquels sont définis. Mais celui qui ouvre l’espace et copie ce que garde le téléphone
  pourrait aussi ouvrir cet emplacement, sans code PIN : le code PIN les cache alors aux yeux de qui tient le téléphone,
  pas d’un outil d’analyse forensique. Désactivé, leur clé n’est que derrière le code PIN, et leurs messages attendent
  sur le relais jusqu’à ce que tu les ouvres. Les sauvegardes gardent l’interrupteur.
- **Elles se ferment toutes seules** dès qu’Erevos a été en arrière-plan plus de 30 secondes, comme se reverrouille le
  code PIN propre d’une discussion, mais pas pendant un appel, ni pendant que tu choisis une photo ou un fichier pour
  elles ou que tu prends une photo.
- **Tant qu’elles sont ouvertes,** un message qui arrive joue le son des nouveaux messages, comme dans tes autres
  discussions. Avec Erevos en arrière-plan avant qu’elles se ferment, une notification dit « Nouveau message » seulement
  si **Recevoir une fois fermées** ou **Prévenir quand un message arrive** est activé pour cet emplacement.
- **Comme tes autres discussions :** ce qui ne peut pas partir maintenant attend, marqué **En attente**, par leur relais
  seulement, ou par Nostr sans relais (voir **En attente** sous [Discuter par un relais](#relay)), **Envoyer plus tard**
  fonctionne comme là-bas, et une discussion exportée d’une autre app peut être importée dans les détails d’une
  discussion masquée (voir [Discussions importées](#import)). Un contact peut aussi y être ajouté depuis une photo de
  son code QR, prise ou choisie pendant qu’elles restent ouvertes. Chaque emplacement a sa propre **Discussion avec
  moi-même**, la première de sa liste (voir **Discussion avec moi-même et rappels** sous [Premiers pas](#start)).
- **Groupes :** **Nouveau groupe**, sous leur liste, crée un groupe avec leurs contacts, comme sur l’écran d’accueil
  (voir [Discussions de groupe](#groups)), et il s’affiche dans leur liste parmi leurs discussions. Ses membres ne sont
  que des contacts de cet emplacement, et quelqu’un que tu y ajoutes comme contact devient un contact de cet
  emplacement. Ce qui y est écrit passe seulement par le relais de l’emplacement, vers sa propre file d’attente là-bas,
  jamais vers un téléphone à proximité ; tant que l’emplacement est fermé, il n’est lu qu’avec **Recevoir une fois
  fermées** activé, et **Prévenir quand un message arrive** ne le compte pas. Ses appels ne sonnent que tant que les
  discussions masquées sont ouvertes : un appel lancé pendant qu’elles sont fermées s’affiche comme manqué. Un groupe
  là-bas n’a pas de code PIN à lui, et aucun n’est public.
- **Matrix, XMPP et Nostr :** sous leur liste, **Matrix**, **XMPP** et **Nostr** ouvrent les écrans de ces réseaux (voir
  [Matrix](#matrix), [XMPP](#xmpp) et [Discussions avec d’autres applis Nostr](#nostr-chats)) pour des comptes à elles,
  à part de ceux de l’espace : un compte Matrix et un compte XMPP où se connecter, et une clé Nostr. Les connexions et
  la clé sont gardées chiffrées avec la clé des discussions masquées, et rien d’elles ne se voit en dehors des
  discussions masquées : leurs discussions ne sont que dans la liste des discussions masquées, et n’ajoutent rien au
  numéro sur l’icône d’Erevos ni à la liste de l’accueil. Les comptes se connectent tant que les discussions masquées
  sont ouvertes, et aussi fermées si **Recevoir une fois fermées** est activé, comme les discussions masquées
  elles-mêmes reçoivent : alors un message y affiche une notification qui dit seulement « Nouveau message », et sur
  Android un appel Matrix ou XMPP sonne avec « Appel entrant » et sans nom, et se prend avec le code PIN comme leurs
  autres appels ; un appel non pris à temps s’affiche comme manqué, et de même un appel de groupe XMPP qui arrive
  pendant qu’elles sont fermées. Désactivé, les comptes ne se connectent que tant que les discussions masquées sont
  ouvertes, et fermées, rien n’arrive. Leurs discussions appellent comme celles de l’espace, depuis le compte propre aux
  discussions masquées ; un appel vers lui, tant que les discussions masquées sont ouvertes, sonne avec la sonnerie du
  téléphone, et elles restent ouvertes jusqu’à sa fin. Un compte Matrix à elles n’a pas **Signaler les nouveaux
  messages**.
- **Aperçus des liens** a son propre interrupteur dans les détails d’une discussion masquée, pour toutes les discussions
  de cet emplacement, désactivé tant que tu ne l’actives pas (voir **Aperçus des liens** sous [Discuter par un
  relais](#relay)).
- **Prévenir quand un message arrive** (Android) : en haut d’un emplacement tant que **Recevoir une fois fermées** est
  désactivé. Activé, tant que l’emplacement est fermé, une notification dit seulement « New message », ou combien sont
  arrivés, comme pour les autres discussions, avec Erevos en arrière-plan ou affiché, une fois pour chaque message, même
  quand Erevos a été fermé puis redémarré ; ce qui est arrivé pendant que l’emplacement était ouvert n’en déclenche
  aucune une fois qu’il se ferme. Qu’un de tes messages leur soit arrivé ou ait été lu, la saisie et les nouvelles clés
  n’en déclenchent aucune, pas plus qu’un appel qui a sonné (voir **Faire sonner les appels quand elles sont
  fermées**) ; un appel qui n’a pas sonné compte comme un message. Un message ou une suppression que d’autres téléphones
  Erevos ont transporté jusqu’au relais (voir **Transportés par d’autres téléphones** dans [Discuter avec un téléphone à
  proximité](#nearby)) ne peut pas dire ce qu’il transporte, car les téléphones qui le transportent ne doivent pas le
  savoir : il compte comme un message, si bien qu’une suppression affiche aussi « New message », et le premier message
  d’une discussion peut compter pour deux ; et un message envoyé sans son sonne comme d’habitude (voir **Envoyer sans
  son**). Il faut **Recevoir et sonner** et **Signaler les nouveaux messages** sous **En arrière-plan**, ce que
  l’interrupteur dit quand ils ne sont pas activés, et un relais qui attend (à partir du 18 octobre 2026) ; un relais
  d’avant le 23 octobre 2026 ne peut que dire que quelque chose attend, donc « New message » s’affiche aussi pour cela,
  une fois jusqu’à ce que tu ouvres cet emplacement. Pour cela, l’espace garde une file d’attente sur le relais pour
  chacun de ses 4 emplacements, celles qui ne servent pas étant créées pour rien sur le même relais, si bien qu’ouvrir
  l’espace ne montre ni si des discussions masquées sont définies ni lesquelles, tant qu’elles utilisent le relais de
  l’espace ; on ne demande au relais que combien de messages sont arrivés, car il les compte grâce à l’octet que chacun
  porte (voir ce que voit le relais, plus haut), jamais les messages eux-mêmes. Celui qui voit la notification et ne
  trouve rien de nouveau dans tes discussions peut deviner qu’il y en a d’autres. Après que tu as supprimé ou bloqué
  quelqu’un dans l’emplacement, le premier message d’une nouvelle personne, par le lien de contact ou le code QR de
  l’emplacement, n’en fait aucune : il se voit quand tu ouvres l’emplacement. Les sauvegardes ne le gardent pas :
  active-le de nouveau après une restauration.
- **Faire sonner les appels quand elles sont fermées** (Android) : sous **Prévenir quand un message arrive**, tant que
  **Recevoir une fois fermées** est désactivé. Activé, tant que l’emplacement est fermé, avec Erevos en arrière-plan ou
  sur n’importe quel écran, un appel d’un de ses contacts fait sonner le téléphone et affiche « Incoming call » sans
  nom, comme un appel de tes autres discussions. Sur l’écran de sonnerie, appuie sur **Répondre** ou sur le petit signe,
  tape le code PIN et appuie sur **Connecter** pour répondre ; **Refuser** arrête la sonnerie. Qui appuie sur
  **Répondre** sans le code PIN ne va pas plus loin que le champ du code PIN. La sonnerie dure environ 45 secondes. Il
  faut **Recevoir et sonner** sous **En arrière-plan**, ce que l’interrupteur dit quand ce n’est pas activé, et un
  relais qui attend, et cela utilise une file d’attente sur le relais pour chacun des 4 emplacements, celles qui ne
  sonnent pas étant créées pour rien sur le même relais, comme pour la notification des messages ci-dessus, si bien
  qu’ouvrir l’espace ne trahit rien. L’appelant ne fait que sonner une file là-bas ; l’appel lui-même attend sur la file
  propre de la discussion jusqu’à ce que le code PIN l’ouvre. Un contact que tu as supprimé peut encore le faire sonner,
  mais l’appel ne peut jamais se connecter. Un appel passé depuis un ordinateur associé ne sonne que tant que les
  discussions masquées sont ouvertes. Les sauvegardes ne le gardent pas : active-le de nouveau après une restauration.
- **Un nouveau code PIN pour un emplacement** (depuis **Discussions masquées** dans **Réglages**, ou **Nouvelles
  discussions masquées**) le recommence vide et remplace ce qui s’y trouvait. Pour garder les discussions et changer
  seulement le code PIN, ouvre-les et utilise **Changer le code PIN** là. Chaque code PIN doit être différent des autres
  et du mot de passe qui ouvre Erevos.
- **Les codes PIN erronés dans la recherche** sont comptés à part de ceux de l’écran de verrouillage : après cinq, les
  recherches cessent d’essayer pendant un moment, en silence, et l’écran de verrouillage n’attend jamais à cause d’eux.
- **Un code PIN tient à l’écart celui qui prend le téléphone,** pas celui qui copie ce qu’il garde : avec un outil
  d’analyse forensique sur un téléphone déverrouillé ou rooté, les codes PIN peuvent être essayés sans attente. Chaque
  essai coûte un Argon2id (beaucoup de mémoire et de temps), mais un code PIN de 4 chiffres ne représente que 10 000
  essais. Si c’est ce que tu crains, utilise un code PIN plus long, ou quelques mots.
- **Discrétion :** chaque espace a ses 4 emplacements dès le départ, ceux qui ne servent pas étant remplis de données
  aléatoires qui ressemblent à des emplacements utilisés, et la recherche essaie chaque emplacement à chaque fois. Ainsi
  rien ne montre si des discussions masquées sont définies, ni combien.

### Une discussion verrouillée par un code PIN {#chat-pin}

Une discussion ou un groupe peut avoir son propre code PIN, à part des discussions masquées : il reste parmi tes
discussions, mais ne s’ouvre qu’avec son code PIN.

1. Ouvre la discussion, appuie sur **⋮** en haut pour ses **Détails**, puis sur **Verrouiller par un code PIN** (dans un
   groupe : le nom du groupe en haut, puis **Verrouiller par un code PIN**).
2. Tape deux fois un code PIN d’au moins 4 caractères, puis **Verrou**.

- **L’ouvrir :** il demande le code PIN. Il se reverrouille dès que tu le quittes, que tu ouvres une autre discussion,
  ou qu’Erevos est absent plus d’une demi-minute (comme le verrou par mot de passe).
- **Derrière le code PIN**, rien de la discussion ne se voit : aucun de ses messages n’est affiché avant que le code PIN
  soit tapé, et avec le verre, un fond d’écran ou un style qui dessine sa propre scène, l’écran du code PIN repose sur
  un givre dense qui ne laisse rien voir.
- **Dans la liste**, elle montre son nom avec un cadenas et **Verrouillée par un code PIN**, rien de ses messages, ni
  dans la recherche, ni dans **Messages avec étoile**, ni dans **Discussions importées**. La notification dit seulement
  **Nouveau message**, comme pour toute discussion.
- **Les codes PIN erronés** sont comptés sur le téléphone, pour toutes les discussions à la fois et à part de ceux de
  l’écran de verrouillage : après cinq, l’essai suivant attend, plus longtemps à chaque fois.
- **Code PIN oublié ?** Sous le code PIN, là où l’espace a un mot de passe, **Code PIN oublié ?** le retire avec le mot
  de passe qui ouvre l’espace. Sans mot de passe, rien ne peut la rouvrir : supprimer le contact est alors le seul
  moyen.
- **Dans les discussions masquées :** une discussion que tu déplaces dans les discussions masquées emporte son code PIN,
  qui ne demande rien là-bas, car le code PIN propre des discussions masquées les protège. Remise parmi les discussions,
  le même code PIN est de nouveau demandé.
- **Pour le retirer :** **Détails** → **Verrouiller par un code PIN** de nouveau, et tape son code PIN.
- **Seul ce téléphone le connaît,** et chaque appareil associé a le sien. Les sauvegardes le gardent.

**Pourquoi :** certaines discussions doivent rester où elles sont, mais sans s’ouvrir pour quiconque tient un moment le
téléphone. Le code PIN n’est gardé que sous forme d’Argon2id, si bien qu’il ne peut pas être lu sur le téléphone, et les
essais sont lents. C’est un verrou sur l’écran, pas une clé à part : les messages de la discussion restent chiffrés avec
le reste de l’espace, et celui qui copie ce que garde le téléphone pendant que l’espace est ouvert pourrait quand même
les lire. Pour une discussion qui ne doit même pas être vue, utilise les discussions masquées.

## Sauvegardes {#backup}

Une sauvegarde est un fichier unique qui contient tout ce qu’Erevos garde sur ce téléphone : chaque espace, avec ses
contacts, les clés de ses conversations, ses messages, messages vocaux, discussions importées et discussions masquées,
ses comptes Matrix, XMPP et Nostr, sa Discussion avec moi-même, et le verrou. À l’intérieur, chaque espace reste scellé
avec son propre mot de passe, et le fichier est scellé de nouveau avec un mot de passe à lui. C’est sous **Réglages** →
**Données et appareils** → **Sauvegardes**.

1. **Créer une sauvegarde :** appuie sur **Créer une sauvegarde**, choisis un dossier (sur le téléphone, une carte
   mémoire, ou une app cloud qui y montre ses dossiers ; sur un ordinateur, n’importe quel dossier), tape deux fois un
   mot de passe pour la sauvegarde (au moins 12 caractères, ou quatre mots) et appuie sur **Enregistrer**.
2. **Sauvegardes automatiques :** choisis **Chaque jour** ou **Chaque semaine**, puis un dossier et un mot de passe.
   Erevos en crée une quand il s’ouvre et que la dernière est plus ancienne que cela, et le dossier garde les 3 plus
   récentes. En dessous se trouvent **Sauvegarder maintenant**, **Changer de dossier** et **Changer le mot de passe** ;
   **Désactivé** les arrête, et celles déjà faites restent dans le dossier.
3. **Aussi vers un serveur :** sur Android et dans l’app de bureau, avec les sauvegardes automatiques activées,
   **Ajouter un serveur** sous **Aussi vers un serveur** envoie chacune aussi dans un dossier sur un serveur de ton
   choix qui parle WebDAV, comme ton propre Nextcloud : donne l’adresse du dossier, un nom d’utilisateur et, mieux, un
   mot de passe d’application rien que pour Erevos, puis appuie sur **Connecter**. Le serveur garde les 3 plus
   récentes ; **Ne plus envoyer** l’arrête, et celles qui y sont restent. Dans l’app web, qui ne fait pas de
   sauvegardes d’elle-même, **Envoyer une sauvegarde maintenant** en envoie une là-bas, avec un mot de passe que tu
   tapes à chaque fois.
4. **Restaurer :** appuie sur **Restaurer une sauvegarde**, choisis le fichier et tape son mot de passe. Erevos
   demande encore une fois, puis met la sauvegarde à la place de tout ce qui est sur le téléphone, et s’ouvre tel
   qu’il était quand la sauvegarde a été faite, avec les mots de passe utilisés alors. **Restaurer depuis un serveur**
   regarde dans le dossier où vont les sauvegardes automatiques, ou dans un dossier que tu donnes avec son nom
   d’utilisateur et son mot de passe, et montre les sauvegardes qui s’y trouvent, les plus récentes d’abord :
   choisis-en une, tape son mot de passe, et elle est restaurée de la même façon.

- **Garde le mot de passe de la sauvegarde :** rien n’ouvre une sauvegarde sans lui, et personne ne peut le récupérer.
  Sans verrou par mot de passe, le mot de passe de la sauvegarde est tout ce qui la protège. Celui qui a le fichier peut
  y essayer des mots de passe aussi vite que va son ordinateur, sans téléphone pour le ralentir, donc un mot de passe
  court ne tient pas : Erevos n’en accepte aucun de moins de 12 caractères.
- **Les sauvegardes automatiques gardent leur mot de passe sur le téléphone,** pour ne pas demander de mot de passe à
  chaque fois. Celui qui ouvre leur dossier a quand même besoin des mots de passe des espaces pour lire les discussions.
- **Sur un serveur :** la sauvegarde envoyée là-bas est scellée avec son mot de passe comme les autres, et ce mot de
  passe ne quitte jamais le téléphone, donc le serveur ne peut pas l’ouvrir. Son nom est aléatoire et le fichier
  ressemble à des octets aléatoires, d’une taille parmi quelques-unes, donc ni l’un ni l’autre ne dit qu’il est
  d’Erevos ni combien il contient exactement. Le serveur voit quand même ton compte, quand une arrive et à peu près sa
  taille. Sur Android, les sauvegardes y vont comme le dit le choix de l’espace sous **Réglages** → **Relais et
  réseaux** → **Tor**, comme Matrix : avec **Tout** seulement par Tor, donc le serveur ne voit pas l’adresse du
  téléphone ; avec **Messages** par Tor dès que Tor est prêt, et en direct tant que Tor démarre ou quand il échoue ;
  avec **Rien** en direct, et le serveur voit l’adresse du téléphone. Une sauvegarde attend d’abord jusqu’à deux
  minutes que Tor démarre, et **Aussi vers un serveur** dit par où elle passe en ce moment. Dans l’app de bureau,
  c’est l’app elle-même qui les envoie, pas sa page, car une page ne peut pas joindre un tel serveur ; dans l’app web,
  c’est le navigateur, qui ne joint qu’un serveur réglé pour laisser entrer l’app web (CORS), ce que Nextcloud n’est
  pas de base. Aucune des deux n’a Tor pour cela : tant qu’un espace envoie **Tout** par Tor, aucune ne part de là.
  Dans l’app web, le mot de passe du serveur est gardé dans le navigateur, scellé avec une clé que le navigateur ne
  donne pas. **Restaurer depuis un serveur** télécharge celle que tu choisis de la même façon, par Tor comme le dit
  l’espace, et n’écrit rien là-bas ; un mot de passe tapé pour cela ne sert qu’à cette restauration et n’est pas
  gardé. Par Tor, une sauvegarde de plus de 64 Mo ne vient pas, et en direct aucune de plus de 100 Mo, le maximum
  qu’Erevos accepte pour un téléchargement : télécharge-la alors depuis le serveur et appuie sur
  **Restaurer une sauvegarde**. Un Erevos d’avant cette version n’ouvre pas une telle sauvegarde. Google Drive est
  laissé de côté exprès : Google lie le fichier à ton nom, et Erevos aurait besoin des apps de Google et d’une
  connexion Google sur le téléphone.
- **Les discussions qui ont continué après la sauvegarde :** restaurer remet les clés de chaque conversation telles
  qu’elles étaient alors. Les messages arrivés après la sauvegarde et déjà lus n’y sont pas, et une discussion qui a
  continué peut ne plus ouvrir les nouveaux messages. Demande alors de nouveau son lien de contact au contact. Avant
  qu’une discussion restaurée écrive de nouveau, ses conversations sautent au-delà des clés qu’elles ont pu utiliser
  depuis la sauvegarde, si bien qu’aucune clé ne scelle jamais deux messages : une clé qui en scellerait deux
  permettrait à celui qui a gardé les deux paquets de les lire ensemble.
- **Matrix, XMPP et Nostr :** les comptes de chaque espace et de ses discussions masquées sont dans la sauvegarde. Une
  clé **Nostr** revient avec ses discussions, telles qu’elles étaient. Un compte **XMPP** revient avec sa connexion, ses
  contacts, ses discussions et les clés qu’il connaît des autres, et continue comme un nouvel appareil du compte : il
  garde sa clé d’identité, si bien que les applis de tes contacts connaissent toujours sa clé, mais il prend un nouvel
  identifiant d’appareil, une nouvelle ressource et de nouvelles clés, chaque conversation recommence, et l’ancien
  appareil est retiré des listes d’appareils du compte dès qu’il se connecte. Il ne peut pas lire les messages chiffrés
  pour l’ancien appareil après la sauvegarde. Un compte **Matrix** est lâché sur ce téléphone, sans être déconnecté sur
  le serveur, ce qui mettrait fin à l’appareil du téléphone d’où vient la sauvegarde ; l’espace se reconnecte, comme un
  nouvel appareil, et sa clé de sécurité ouvre les messages d’avant. Remises telles qu’elles étaient, les conversations
  d’un tel appareil réutiliseraient des clés de message que les autres refusent, et le téléphone d’où vient la
  sauvegarde peut encore se servir de l’appareil.
- **Un téléphone à la fois :** une sauvegarde restaurée sur un second téléphone lit les mêmes files d’attente sur le
  relais que le premier, et chacun prend des messages que l’autre ne reçoit alors jamais. Utilise-la pour passer à un
  nouveau téléphone, pas pour en garder deux.
- **Discrétion :** chaque espace montre le même écran Sauvegardes, et une sauvegarde contient chaque espace, si bien que
  ni l’un ni l’autre ne dit combien il y a d’espaces ni si des discussions masquées sont définies. Le nom du fichier dit
  que c’est une sauvegarde Erevos, et sa taille montre à peu près combien est gardé.
- **Les SMS du téléphone :** sur Android, **Inclure les SMS dans les sauvegardes** ajoute les SMS et MMS du téléphone à
  chaque sauvegarde à partir de là, avec jusqu’à 32 Mo de leurs images, tant qu’Erevos est l’app SMS. Ils sont scellés
  avec le mot de passe de la sauvegarde comme le reste. Restaurer la sauvegarde remet dans les SMS du téléphone chaque
  message qu’il n’a pas encore, et n’en supprime aucun ; Erevos doit alors aussi être l’app SMS, sinon le reste est
  restauré sans eux. Les SMS sont ceux du téléphone, les mêmes dans chaque espace. Un Erevos plus ancien n’ouvre pas une
  sauvegarde qui contient des SMS.
- **Les SMS en ordre :** les épingles, conversations archivées, corbeille, brouillons, filtre anti-spam et marques de
  chaque espace, et le délai pendant lequel un SMS peut encore être annulé, sont dans chaque sauvegarde, scellés avec le
  mot de passe de l’espace comme le reste. Les SMS envoyés plus tard (**SMS plus tard**) n’y sont pas, si bien qu’une
  sauvegarde restaurée sur un autre téléphone n’en renvoie jamais un ; pas plus que les invitations, les noms de tes
  contacts et la SIM choisie pour chaque numéro. Un Erevos plus ancien n’ouvre pas une sauvegarde qui les contient ; une
  sauvegarde faite par un Erevos plus ancien se restaure comme toujours, sans eux.
- **Pas dans une sauvegarde :** les photos et les fichiers, pas encore : une sauvegarde est faite dans la mémoire du
  téléphone, et ils n’y tiendraient pas. Une sauvegarde restaurée sur le même téléphone les montre de nouveau ; sur un
  autre téléphone, ils s’affichent comme absents de celui-ci. Sont aussi exclus : le compte des mots de passe erronés,
  et le réglage des sauvegardes automatiques.
- **Les appareils associés** ne sont pas dans une sauvegarde : une association reste avec le téléphone et l’ordinateur
  où elle a été faite. Après la restauration d’une sauvegarde sur un autre téléphone, associe de nouveau l’ordinateur :
  sur l’ordinateur, appuie sur **Dissocier cet appareil**, puis associe-le comme la première fois, voir [Appareils
  associés](#devices). Les contacts qui ont cette version cessent alors d’écrire à tes ordinateurs jusqu’à ce que tu le
  fasses : le téléphone leur donne une nouvelle liste de ses appareils qui n’en nomme aucun. Si l’horloge de ce
  téléphone retarde sur celle du téléphone perdu, cette liste disparaît dès qu’ils lui écrivent, et les détails de leur
  discussion peuvent dire qu’elle a changé le lendemain de ta restauration. La propre sauvegarde d’un ordinateur associé
  contient les discussions du téléphone telles qu’elles étaient, mais pas l’association permettant d’y écrire :
  restaurées, elles peuvent y être lues mais pas écrites, et Erevos le dit une fois. Pour y écrire, associe de nouveau
  cet ordinateur au téléphone : les discussions que le téléphone a encore restent, avec ce qui est arrivé depuis, et les
  autres disparaissent. Sur le téléphone, dissocie l’appareil qu’il était avant. Fais les sauvegardes sur le téléphone.
- **Une sauvegarde d’un Erevos plus récent :** Erevos 0.1.8 et plus récent l’ouvrent aussi, et en restaurent tout ce
  qu’ils connaissent ; avant cela, ils disent qu’une partie reste dehors. Mets d’abord Erevos à jour pour tout
  restaurer.

## Morceaux de sauvegarde chez des amis {#backup-pieces}

Le mot de passe de vos sauvegardes peut aller à des amis en morceaux, dans **Réglages** → **Données et appareils** →
**Morceaux de sauvegarde** : choisissez **2 sur 3**, **2 sur 4**, **3 sur 4** ou **3 sur 5**, puis autant de contacts,
et touchez **Donner les morceaux**. Avec les sauvegardes automatiques activées, Erevos vérifie que le mot de passe que
vous tapez est bien le leur. Avec un serveur dans **Aussi vers un serveur**, les morceaux peuvent contenir aussi son
adresse, son nom d’utilisateur et son mot de passe, pour qu’on puisse y trouver et ouvrir les sauvegardes avec eux.
Chaque contact reçoit un message qui dit ce que c’est, et son Erevos garde le morceau à part de la conversation, dans
**Morceaux que vous gardez pour des amis**.

1. **Pour le récupérer :** demandez leurs morceaux à assez d’entre eux. Chacun touche **Afficher le code** à côté du
   vôtre, et vous touchez **Scanner un code** dans **Rassembler vos morceaux** ; ou ils touchent **Copier** et vous
   envoient le texte autrement, et vous le collez puis touchez **Ajouter** ; ou, tant que votre téléphone a encore le
   compte, ils touchent **Le rendre dans votre conversation**. Touchez ensuite **Rassembler** : Erevos affiche le mot
   de passe et, avec un serveur dans les morceaux, **Restaurer depuis ce serveur** liste les sauvegardes qui s’y
   trouvent.
2. **Un nouveau mot de passe :** dès que vos sauvegardes ont un nouveau mot de passe, les morceaux donnés avant ne
   servent plus : donnez-en de nouveaux.

- **Ce que montre un morceau :** rien. Moins de morceaux que nécessaire ne disent rien du mot de passe, quelle que
  soit la puissance de calcul employée : avec eux, chaque mot de passe est aussi probable qu’un autre. Chaque morceau
  a la même taille, quel que soit le mot de passe, et rien dedans ne vous nomme, ni les autres amis.
- **Sur votre téléphone :** le message reste dans la conversation, mais pas son morceau : une fois parti, rien sur
  votre téléphone ne garde les morceaux, seulement à qui ils sont allés. Qui ouvre l’un de vos espaces apprend à qui
  vous avez donné des morceaux, pas le mot de passe. Les morceaux ne vont qu’aux contacts de l’espace, pas aux
  discussions cachées.
- **Ce que cela ne peut empêcher :** assez d’amis ensemble peuvent ouvrir vos sauvegardes s’ils obtiennent aussi le
  fichier : choisissez des personnes qui ne se connaissent pas toutes. Quelqu’un peut se faire passer pour vous, depuis
  un nouveau numéro ou un nouveau compte, pour obtenir les morceaux : un ami ne devrait rendre le sien qu’à vous en
  personne, ou dans la conversation qu’il a déjà avec vous. Un ami dont l’Erevos est plus ancien que cette version voit
  le message mais ne garde aucun morceau.

**Pourquoi :** une sauvegarde n’est pas plus sûre que son mot de passe, et un mot de passe fort se perd facilement.
Partagé ainsi (le partage de secret de Shamir), aucun ami seul, ni aucun relay, ne détient de quoi l’ouvrir.

## Bouton de panique {#panic}

Quand vous êtes en danger, Erevos peut s’effacer d’un coup, dans **Réglages** → **Confidentialité et sécurité** →
**Bouton de panique** : touchez **Tout effacer maintenant** et dites **Effacer**. Sur Android, dans l’app web, sur un
ordinateur et sur Sailfish OS.

- **Ce qui part :** chaque espace avec ses discussions cachées, leurs contacts, messages, photos, fichiers et clés ; le
  verrou et ses mots de passe ; les comptes Matrix, XMPP et Nostr et les jetons du relay ; les réglages et le mot de
  passe des sauvegardes automatiques, et de leur serveur. Sur Android, Erevos se ferme ensuite et s’ouvre la fois
  suivante comme fraîchement installé. Avec **Aussi les sauvegardes automatiques de** choisi, les fichiers de
  sauvegarde qui s’y trouvent partent d’abord.
- **Ce qui reste :** ce qu’Erevos ne peut atteindre : les sauvegardes copiées ailleurs ou envoyées à un serveur (leur
  mot de passe les protège toujours), ce que le relay garde pour vous jusqu’à expiration, et ce qu’ont vos contacts.

1. **Depuis une app de panique :** sur Android, une app de panique comme Ripple efface les apps que vous choisissez
   d’un seul geste. Installez-en une et choisissez-y Erevos : Erevos ouvre cet écran, après son mot de passe, et
   demande. Touchez **Dire oui**.
2. **Seulement cette app :** seule l’app à laquelle vous avez dit oui peut effacer Erevos, et seulement tant que **Une
   app de panique peut effacer Erevos** est activé. Erevos vérifie le nom de l’app et sa signature : une autre app, ou
   le même nom réinstallé par quelqu’un d’autre, ne le peut pas. Une mise à jour de l’app qui passe à une nouvelle clé
   comme Android le permet (rotation de clé) reste de confiance. **Ne plus faire confiance** y met fin.
4. **Quand Erevos a refusé :** si l’app de confiance a demandé d’effacer alors que l’interrupteur était coupé, ou signée
   d’une autre clé, cet écran le dit en rouge, avec le jour et l’heure. Quand l’app est signée d’une autre clé, **Faire
   confiance à … tel qu’il est maintenant** lui fait de nouveau confiance : dites oui seulement si vous l’avez mise à
   jour vous-même.
3. **Après l’effacement :** l’app de panique est oubliée aussi : redites-lui oui quand vous configurez Erevos à
   nouveau.

- **Sur un ordinateur et sur Sailfish OS :** il n’y a pas d’app de panique, seulement **Tout effacer maintenant**, avec
  **Aussi les sauvegardes automatiques de** leur dossier si vous le choisissez. Sur un ordinateur, Erevos redémarre
  ensuite comme fraîchement installé ; sur Sailfish OS, il se ferme. L’élément du trousseau pour Erevos reste sur un
  ordinateur, mais ce qu’il scellait a disparu, il n’ouvre donc plus rien.
- **Ce qu’il ne peut cacher :** sur le téléphone, sans le mot de passe, on voit encore qu’Erevos est installé et
  qu’une app de panique peut l’effacer, mais pas ce qu’il contenait.

**Pourquoi :** à une frontière ou lors d’une arrestation, il n’y a peut-être pas le temps d’ouvrir chaque discussion.
Un toucher, ou le geste d’une app de panique, ne laisse rien à ouvrir.

### Mot de passe de panique

Avec le verrou par mot de passe activé, le même écran propose un **Mot de passe de panique** : un mot de passe à part
qui, saisi sur l’écran de verrouillage, efface Erevos comme **Tout effacer maintenant**. Sur Android, dans l’app web,
sur un ordinateur et sur Sailfish OS.

1. Touchez **Définir le mot de passe de panique**, saisissez-le deux fois (au moins 4 caractères) et touchez
   **Enregistrer**. Il doit différer de chaque mot de passe de vos espaces : Erevos en refuse un qui ouvre un espace,
   et le mot de passe d’aucun espace ne peut le devenir plus tard.
2. Saisi sur l’écran de verrouillage, il affiche **Mot de passe incorrect**, comme tout mot de passe incorrect, et
   Erevos efface tout aussitôt. Sur Android, Erevos se ferme ensuite et s’ouvre la fois suivante comme fraîchement
   installé, et les sauvegardes automatiques de leur dossier partent aussi quand **Aussi les sauvegardes automatiques
   de** est activé sous **Depuis une app de panique** ; ailleurs, elles restent.
3. **Désactiver le mot de passe de panique** en refait seulement un mot de passe incorrect. Le définir de nouveau
   remplace le précédent. Désactiver le verrou par mot de passe le désactive aussi.

- **Rien ne le montre :** Erevos garde une place pour un mot de passe de panique dès son premier démarrage, au hasard
  tant qu’aucun n’est défini et de même forme ensuite, et la vérifie avec chaque mot de passe saisi sur l’écran de
  verrouillage, de la même façon et pendant la même durée. Ni ce que garde le téléphone ni le temps d’une vérification
  ne montrent donc s’il y en a un de défini, et cet écran ne peut pas vous le dire non plus : si vous n’êtes pas sûr,
  définissez-le de nouveau.
- **Seulement sur l’écran de verrouillage :** saisi partout ailleurs où Erevos demande un mot de passe, ce n’est qu’un
  mot de passe incorrect. Il n’est pas dans les sauvegardes : après en avoir restauré une, définissez-le de nouveau.
  Tant que des essais incorrects font attendre l’écran de verrouillage (voir [Verrou par mot de passe](#lock)), il
  attend aussi.

**Pourquoi :** quelqu’un peut vous forcer à ouvrir Erevos. Avec un mot de passe de panique, vous pouvez sembler lui
donner le vôtre, et ce qu’il verrait a disparu avant que l’écran ne change.

## Me supprimer partout {#forget}

Quand vous voulez que disparaisse ce que les serveurs gardent de vous, dans **Réglages** → **Confidentialité et sécurité** →
**Me supprimer partout** : touchez **Me supprimer partout** et dites oui deux fois. Votre téléphone garde tout ce qu'il a ; ce
n'est pas le [Bouton de panique](#panic), qui efface le téléphone.

- **Ce qui part :** chaque file que cet espace a sur les relais, avec les messages qui y attendent : la vôtre, celle que nomme
  votre lien de contact, celles de vos groupes, de vos contacts, de votre relais maison, celles des notifications Matrix et XMPP,
  les portes de vos groupes publics et celles de vos appareils liés. Aussi les messages qu'un relais garde pour les envoyer plus
  tard, les fichiers arrivés qui y attendent, et les invitations que vous avez faites et que personne n'a utilisées. Les
  conversations cachées qui reçoivent même fermées partent avec l'espace ; les autres, quand vous les ouvrez alors que l'espace
  est arrêté. Les listes de l'écran laissent de côté les conversations cachées, pour ne jamais montrer qu'il y en a. Via Tor,
  Erevos demande aussi à chaque relais Nostr d'oublier les clés sur lesquelles vos conversations lisent (une demande de
  disparition, NIP-62).
- **Matrix, XMPP, Nostr :** avec **Aussi me déconnecter de Matrix et XMPP, et supprimer le compte Nostr créé ici**, ces comptes
  sont déconnectés ici. Les comptes restent sur leurs serveurs, qui sont les leurs, pas ceux d'Erevos. Un compte Nostr apporté
  d'une autre appli est laissé tel quel.
- **L'espace est arrêté :** il ne reçoit et n'envoie rien, pour qu'aucune file ne soit aussitôt refaite (Erevos refait seul une
  file perdue). **Relancer** y met fin : de nouvelles files sont créées, comme lorsqu'un relais les a perdues, et vos contacts
  sont prévenus discrètement. Donnez-leur aussi un nouveau lien de contact, car les anciens nomment des files qui n'existent plus.
- **Ce que cela n'atteint pas :** les téléphones de vos contacts, les relais Nostr qui ne font pas ce qu'on leur demande, les
  fichiers envoyés via un serveur de fichiers, et les serveurs Matrix et XMPP. L'écran liste ce qui a été supprimé, ce qui avait
  déjà disparu et ce qui n'a pas pu être atteint ; **Supprimer à nouveau** essaie le reste.

**Pourquoi :** un relais, même de confiance, est un endroit qui garde quelque chose de vous. C'est le seul geste qui reprend tout
sans effacer le téléphone, pour quand vous quittez un relais ou fermez un chapitre de votre vie.

## Discussions importées {#import}

Tes anciennes discussions de Telegram et de WhatsApp peuvent entrer dans Erevos, pour être lues, avec leurs photos,
vidéos, messages vocaux et fichiers, et celles de Viber avec leurs mots. Elles restent sur ce téléphone, scellées dans
l’espace où tu les fais entrer, et ne sont jamais envoyées nulle part.

Exporte d’abord la discussion depuis l’autre appli :

- **WhatsApp :** ouvre la discussion, puis **Plus**, **Exporter la discussion**, **Inclure les médias**, et enregistre
  le .zip sur le téléphone. **Sans médias** n’apporte que les mots.
- **Telegram Desktop :** **Exporter l’historique de la discussion**, format **JSON**, avec les photos, vidéos, messages
  vocaux et fichiers que tu veux. Ensuite, fais un .zip du dossier qu’il a créé (sous Windows : clic droit dessus,
  **Envoyer vers**, **Dossier compressé**) et copie le .zip sur le téléphone. **result.json** seul n’apporte que les
  mots.
- **Viber :** Viber lui-même n’exporte aucune discussion. Sur Android, l’appli **Backup Text for Viber** en enregistre
  une sous forme de fichier .html : copie-le sur le téléphone. Seuls les mots entrent, avec les émoticônes de Viber en
  emoji. Tes propres messages là-bas ne portent aucun nom, alors ils entrent comme **Moi**, déjà choisi comme étant toi.
  Les messages datés d’un jour d’avant l’existence de Viber, comme 1970, viennent d’un téléphone dont l’horloge était
  fausse : ils entrent sans heure.

Ensuite :

1. Dans Erevos, ouvre **Réglages** → **Données et appareils** → **Discussions importées** et appuie sur **Importer un
   fichier**, puis choisis le fichier.
2. Erevos dit ce qu’il a trouvé, avec combien de photos et de fichiers et quelle taille ils font ensemble. Appuie sur
   ton propre nom, pour que tes messages s’affichent à droite, et appuie sur **Garder**. Les fichiers entrent l’un après
   l’autre, et il dit combien et quelle part d’entre eux est entrée. **Annuler** l’arrête alors, et n’en garde aucun.
3. Supprime toi-même le fichier exporté du téléphone : Erevos garde sa propre copie scellée, mais le fichier que tu as
   enregistré n’est pas scellé.

Pour continuer la conversation dans Erevos, l’autre personne a aussi besoin d’Erevos :

1. Avec **Nouvelle discussion**, ajoute-la comme contact par le relais, comme dans [Discuter par un relais](#relay).
2. Ouvre la discussion importée, appuie sur **Continuer dans Erevos** et choisis-la.
3. Sa discussion montre maintenant les anciens messages avant les nouveaux, comme s’ils avaient toujours été dans
   Erevos : en bulles, par jour, avec leurs heures, et **Suite dans Erevos** entre eux et les nouveaux. **Ouvrir la
   discussion** t’y emmène, et un contact que tu n’as pas nommé prend le nom de la discussion importée.

**Depuis la discussion :** la discussion d’un contact a **Discussions importées** dans ses **Détails**, au-dessus de
**Confidentialité**. **Importer une discussion ici** fait entrer un fichier directement dans cette discussion, sans
passer par **Réglages** : quand le fichier contient plusieurs discussions, comme un export Telegram de toutes les
discussions, il demande laquelle continue ici, et propose la plus longue. Chaque discussion importée qui continue là est
listée avec trois boutons :

- **Seulement dans la discussion** la retire de **Réglages** → **Données et appareils** → **Discussions importées** :
  elle ne s’affiche que dans cette discussion, comme si elle y avait toujours été. Une discussion amenée depuis les
  détails de la discussion est gardée ainsi dès le départ. **Afficher aussi dans Discussions importées** la remet dans
  la liste, et la liste elle-même le fait aussi, quand ce contact n’est plus là.
- **Dissocier** cesse de l’afficher dans la discussion ; elle reste dans **Discussions importées**, pour la lire ou pour
  continuer avec quelqu’un d’autre.
- **Supprimer** la supprime du téléphone, avec ses photos et ses fichiers, après avoir demandé.

**Pourquoi :** une ancienne discussion va avec la personne avec qui elle a eu lieu, alors elle est amenée, gardée et
supprimée là où tu lui parles, et la liste dans **Réglages** ne garde que ce qui n’a nulle part ailleurs où aller. Rien
n’en quitte le téléphone, dans un cas comme dans l’autre.

- Les **photos, vidéos, messages vocaux et fichiers** entrent depuis un .zip, chacun scellé dans cet espace comme l’est
  un fichier dans une discussion. Les photos s’affichent dans la discussion à mesure que tu fais défiler jusqu’à elles,
  et les stickers comme des stickers ; appuie sur une photo ou un fichier pour le voir seul et l’**Enregistrer**. Les
  messages vocaux et les chansons se lisent directement dans la discussion d’un appui ; une vidéo se lit dans l’appli du
  téléphone une fois enregistrée. Maintiens un message importé pour le **Copier** ou **Ouvrir** son fichier.
  **Rechercher dans cette discussion** trouve aussi les messages importés. Les fichiers de plus de 1 Go, et ceux que
  l’export ne contient pas, restent en arrière, et la discussion dit où il y en avait un.
- **De la place sur le téléphone :** pendant qu’un .zip entre, le téléphone a besoin d’environ deux fois sa taille
  d’espace libre, car Erevos en lit une copie et garde les fichiers scellés. Les fichiers importés ne sont pas encore
  dans les sauvegardes, comme les autres fichiers ne le sont pas.
- **Seulement sur ce téléphone, seulement pour les lire :** les messages importés ne sont jamais envoyés, donc l’autre
  téléphone ne les reçoit pas. Erevos ne peut pas montrer qui les a vraiment écrits.
- Les **notifications et appels** de l’autre appli sont laissés de côté, et la discussion dit combien.
- **Dans les discussions masquées** aussi : dans les **Détails** d’une discussion masquée, **Importer une discussion
  ici** garde la discussion avec cet emplacement, chiffrée avec sa clé, et ne l’affiche que dans cette discussion,
  jamais dans **Réglages** → **Données et appareils** → **Discussions importées** ; là, elle ne peut qu’être supprimée.
  Une discussion déplacée dans les discussions masquées emporte avec elle les discussions qui y ont été importées,
  gardées là-bas seulement en elle, et les ramène si elle revient.
- **Supprimer les messages** dans une discussion laisse les messages importés : supprime-les dans les **Détails** de la
  discussion, sous **Discussions importées**, ou dans **Réglages** → **Données et appareils** → **Discussions
  importées**.

> Le fichier des discussions importées grandit avec ce que tu y fais entrer, donc sa taille dit à peu près combien a été
> importé, mais pas dans quel espace.

## Apparence {#appearance}

L’**Apparence** suit LPHL FASOULI et le site LPHL. Elle se trouve sous **Réglages** → **Apparence**, en parties qui
s’ouvrent chacune seule : **Style et couleurs** (le rendu, le verre, le style, le thème, les couleurs et le texte sur
les zones colorées ci-dessous, avec l’**Aperçu**), **Fond d’écran**, **Messages**, et sur Android **Icônes du lanceur**
et **Widget**.

| Réglage | Choix |
| --- | --- |
| **Rendu** | **Plat**, ou **Glass** comme sur lphl.nekten.eu. Le verre se décline en deux sortes : **Vitres** (chaque carte est une vitre sur le fond d’écran) et **Une vitre** (chaque écran sur une seule vitre dépolie). |
| **Style** | **Classic** (le sombre et l’or d’Erevos), **Modernist** (Inter Tight), **Nocturne** (toujours sombre, avec ses propres couleurs), **Neon** (des LED cyan et magenta qui brillent, sur une grille qui file vers un soleil couchant), **Matrix** (vert sur noir en chasse fixe, avec du code qui pleut derrière), **Paper** (bleu de stylo-plume sur crème, avec empattements, sur des lignes réglées et une marge rouge), **Aurora** (violet sur un blanc presque pur, doux et arrondi, sur des flaques de lumière menthe, lilas et pêche), **Material You** (les couleurs du téléphone, sur Android 12 et plus récent) et **Personnalisé** (ton propre fond et ton propre accent). |
| **Thème** | **Système**, **Clair** ou **Sombre**. Nocturne, Neon et Matrix sont toujours sombres, Paper et Aurora toujours clairs, et Personnalisé est clair ou sombre selon son fond. Material You le suit. |
| **Couleurs** | Celles du style, l’une des douze palettes LPHL, ou **Ma couleur**. Choisir une palette sous un style qui a ses propres couleurs revient au style choisi avant. |
| **Personnalisé** | Avec **Personnalisé** choisi : son **fond** (huit clairs, huit sombres) et son **accent**. Le texte et les surfaces sont tirés du fond, et chaque couleur est vérifiée pour rester lisible dessus. |
| **Texte sur les zones colorées** | **Blanc**, **Comme la palette**, ou **Ma couleur**. |
| **Fond d’écran** | Ce qui se trouve derrière chaque écran : **Selon le style** (la scène ou la lueur propre au style), **Uni**, ou un motif tracé légèrement dans l’accent : **Points**, **Grille**, **Rayures**, **Étoiles**, **Lumières** (de doux cercles de lumière) ou **Dégradé** ; ou **Photo**, une photo à toi, réduite, redessinée et scellée, sous un voile pour que le texte se lise (**Changer de photo** en choisit une autre). L’écran du mot de passe montre celui du style à la place. |
| **Messages** | Comment une discussion dessine les messages : en bulles rondes (**Arrondi**) ou carrées (**Carré**), ou en **Ligne**, sans bulle mais avec un trait à côté du texte, comme un journal. |

Neon, Matrix, Paper et Aurora dessinent leur propre scène derrière chaque écran, Personnalisé garde le fond que tu as
choisi et Material You les couleurs du téléphone, alors **Glass** attend tant qu’ils sont choisis. La pluie reste
immobile quand le téléphone est réglé pour réduire les animations.

L’**Aperçu** montre quelques messages et boutons dans l’apparence que tu as choisie. Chaque combinaison est vérifiée
pour que le texte se lise toujours bien, sur le verre aussi.

- **Chaque espace garde sa propre apparence.**
- **L’écran du mot de passe** montre la dernière apparence utilisée. Pour cela, elle est gardée en dehors des données
  scellées : elle ne dit rien de tes discussions, mais quiconque ouvre le téléphone voit quelle apparence tu utilises.
- **Material You** prend les couleurs qu’Android tire de ton fond d’écran (Android 12 et plus récent), clair ou sombre
  selon ce que dit **Thème**, avec des boutons ronds et des cartes doucement arrondies, dans la police du téléphone. Un
  nouveau fond d’écran les change aussi dans Erevos, dès qu’il s’affiche de nouveau. Elles sont lues sur le téléphone et
  ne vont nulle part. Sur un Android plus ancien et sur un ordinateur, il n’est pas proposé.
- **Icônes du lanceur** (Android) : la couleur de chacune des icônes d’Erevos parmi les applis du téléphone, **Erevos**
  (rouge, elle ouvre les discussions d’Erevos, ou la discussion que tu as laissée ouverte), **Téléphone** (verte, elle
  ouvre le clavier), **SMS** (bleue, elle ouvre la liste des SMS) et **Contacts** (violette) : rouge, orange, vert,
  bleu, violet ou sombre. Chaque appui ouvre ce que son icône nomme, même quand Erevos montrait une autre d’entre elles.
  La couleur est celle du téléphone, pas de chaque espace, car les icônes s’affichent avant qu’Erevos soit déverrouillé.
  Après un changement, certains lanceurs retirent l’icône de l’écran d’accueil : ajoute-la de nouveau depuis la liste
  des applis.
- **Points et nombres sur les icônes** (Android) : Android donne le point ou le nombre d’une notification à l’appli,
  pas à l’une de ses icônes ; sur la plupart des lanceurs, comme ceux des Pixel et de GrapheneOS, celui de Samsung,
  celui de Xiaomi et Kvaesitso, chaque notification d’Erevos (un message, un SMS, un appel, un anniversaire) s’affiche
  donc à l’identique sur les icônes Erevos, Téléphone, SMS et Contacts, et Erevos n’y peut rien changer. Pour garder
  le point pour certaines notifications seulement, désactive-le pour les autres dans les réglages d’Android pour les
  notifications d’Erevos, où chaque type de notification a son propre interrupteur. Les lanceurs de Huawei et d’Honor
  acceptent un nombre pour chaque icône : là, avec **Réglages** → **Notifications** → **Nombre sur l’icône** →
  **Afficher le nombre**, l’icône d’Erevos elle-même montre les messages que compte sa notification, celle des SMS les
  SMS non lus, celle du Téléphone les appels manqués et celle des Contacts un anniversaire du jour, chaque nombre sur
  sa propre icône seulement.
- **Calculatrice à la place d’Erevos** (Android, sous **Icônes du lanceur**) : une calculatrice qui fonctionne
  apparaît parmi les applis du téléphone à la place de l’icône d’Erevos. Appuie sur **Mettre la calculatrice à sa
  place**, saisis deux fois un code de 4 à 12 chiffres et appuie sur **Enregistrer**. Ensuite, ouvre la calculatrice,
  tape le code, puis **=** : Erevos s’ouvre en demandant son mot de passe comme toujours. Tout autre calcul n’est
  qu’un calcul. **Changer le code** le change ; **Réafficher l’icône d’Erevos** ramène l’icône, dans sa couleur, et
  oublie le code. Seule l’icône est cachée : la liste des applis d’Android, les notifications, les applis récentes et
  les icônes Téléphone, SMS et Contacts montrent toujours Erevos. Le téléphone ne garde qu’un hash du code : c’est une
  porte, pas la serrure.

  **Pourquoi :** celui qui jette un œil au téléphone voit une calculatrice, pas une messagerie ; le mot de passe garde
  toujours ce qu’il y a dedans.
- **Widget** (Android) : l’ordre des quatre boutons du widget, de gauche à droite, avec le widget dessiné tel qu’il
  sera. Appuie sur ↑ ou ↓ pour déplacer un bouton ; **Ordre initial** les remet en place.
- **Vibrer au toucher** (Android) : une brève vibration quand tu touches une touche du clavier, Envoyer, Entrée ou un interrupteur, et quand un menu s’ouvre ; jamais pendant le défilement. Activée, sauf si tu l’éteins ici. Elle est celle du téléphone, la même dans chaque espace.

## Sur un ordinateur {#desktop}

Erevos fonctionne aussi sur un ordinateur, sous Linux, macOS ou Windows, comme une appli à part entière. Il discute par
un relais, chiffré de bout en bout comme sur le téléphone, et garde ses contacts, ses messages et ses réglages scellés
de la même façon.

1. Installe-le. Sous Linux : le paquet pour les systèmes basés sur Arch (\`erevos-linux-x86_64.pacman\`, avec \`sudo
   pacman -U\`) ou l’AppImage. Sur un Mac : ouvre l’image disque et fais glisser Erevos dans Applications. Il n’a pas de
   signature Apple payante, alors la première fois, autorise-le sous **Réglages Système → Confidentialité et sécurité →
   Ouvrir quand même**. Sous Windows 10 ou 11 : lance \`erevos-windows-x64-setup.exe\`, qui installe Erevos pour toi
   seul, sans administrateur, et le met dans le menu Démarrer ; ou garde \`erevos-windows-x64-portable.exe\` où tu veux
   et lance-le, sans rien installer. Aucun des deux n’a de signature payante, alors la première fois Windows dit qu’il a
   protégé ton ordinateur : clique sur **Informations complémentaires**, puis sur **Exécuter quand même**.
2. Configure le relais et ajoute des contacts comme sur le téléphone, voir [Discuter par un relais](#relay). **Copier
   mon lien de contact** copie ton lien, à coller là où il doit aller.

- **Ce que seul le téléphone fait :** Bluetooth, Wi-Fi Aware et LoRa, et leurs tests. Les contacts sur le même Wi-Fi, il
  les joint comme le fait un téléphone, voir [Discuter avec un téléphone à proximité](#nearby). Le reste est pareil :
  les espaces et le second mot de passe, les discussions masquées, les messages vocaux, les discussions importées et les
  sauvegardes.
- **Où il garde les choses :** dans son propre dossier (sous Linux \`~/.config/Erevos\`, sur un Mac
  \`~/Library/Application Support/Erevos\`, sous Windows \`%APPDATA%\\Erevos\`), scellé comme sur le téléphone. Son
  magasin de clés est scellé avec le trousseau du système (sur un Mac le Trousseau, sous Windows la clé de ton compte
  Windows). Sur un système Linux sans trousseau (KWallet ou GNOME Keyring), ou avec un trousseau qu’Erevos ne trouve
  pas, Erevos s’ouvre avec une note et ne garde rien : démarre le trousseau, ou donne à Erevos
  \`--password-store=gnome-libsecret\`. Lancé avec \`--plain-secrets\`, il y garde son magasin de clés tel quel, lisible
  par ton utilisateur : configure alors un verrou par mot de passe. L’appli Windows portable garde ses choses dans le
  même dossier que l’appli installée, et la désinstaller les y laisse.

**Pourquoi :** sans trousseau, le magasin de clés resterait sur le disque tel quel, lisible par ton utilisateur, alors
Erevos n’y garde rien à moins que tu ne le choisisses avec \`--plain-secrets\` : aucun emplacement de mot de passe n’y
reste non scellé par surprise.

- **Le pare-feu de Windows** demande, la première fois qu’Erevos s’ouvre, s’il peut utiliser le réseau. Autorise-le sur
  les réseaux privés, sinon les téléphones et les ordinateurs sur le même Wi-Fi ne peuvent pas le joindre ; les relais
  fonctionnent dans les deux cas.
- Les **messages vocaux** enregistrés sur un ordinateur sont en Opus, sur un téléphone en AAC. Les deux se lisent sur
  les deux.
- Les **photos** viennent des fichiers de l’ordinateur ; il n’y a pas d’appareil photo. **Enregistrer** demande où
  mettre une photo ou un fichier.
- **Un ordinateur et un téléphone peuvent partager un compte :** associe l’ordinateur au téléphone, et les deux ont les
  mêmes discussions et les mêmes contacts, voir [Appareils associés](#devices). Ou bien une sauvegarde déplace tout de
  l’un à l’autre, voir [Sauvegardes](#backup), et à partir de là n’utilise que l’un des deux.
- **En arrière-plan :** fermer sa fenêtre laisse Erevos tourner dans la zone de notification (sur un Mac, dans le Dock),
  sauf si tu le désactives : **Réglages** → **Notifications** → **En arrière-plan** → **Quitter à la fermeture**. Il
  continue d’attendre sur le relais : un appel sonne, avec une sonnerie à lui, et fait revenir la fenêtre, et une
  notification dit combien de messages ne sont pas lus, jamais de qui ni quoi, jusqu’à ce qu’Erevos s’affiche de
  nouveau. Tu l’ouvres depuis son icône dans la zone de notification, ou en relançant Erevos, et tu le quittes depuis le
  menu de cette icône (sur un Mac, depuis son menu). Là où le bureau n’affiche pas de zone de notification, comme GNOME
  sans extension pour cela, relancer Erevos fait revenir la fenêtre. Une fois quitté, il ne reçoit rien : les messages
  attendent sur le relais, et un appel s’affiche comme appel manqué dès qu’il s’ouvre.
- Les **appels** sonnent tant qu’Erevos est à l’écran, avec une sonnerie à lui : deux courtes toutes les 3 secondes,
  jusqu’à ce que l’appel soit décroché ou se termine.
- **Testé jusqu’ici** sous Linux. Les versions Mac et Windows sont compilées et ouvertes sur les ordinateurs de GitHub,
  pas encore par une personne.

## Appareils associés {#devices}

Le même compte sur le téléphone et sur un ordinateur, ou dans un navigateur : les mêmes discussions, contacts et
messages sur les deux. Le téléphone reste le compte : lui seul ajoute des contacts, et associe et dissocie des
appareils. Chaque appareil associé a ses propres clés, que le téléphone signe dans une liste des appareils du compte et
donne à ses contacts. Les contacts sur cette version écrivent alors aussi à chaque appareil, chiffré de bout en bout, si
bien qu’il reçoit leurs messages même téléphone éteint ; pour ceux sur des versions plus anciennes, le téléphone
transmet à l’ordinateur ce qui arrive, et scelle pour eux ce que l’ordinateur écrit. Les contacts voient le même compte
et le même numéro de sécurité, quelle que soit la version d’Erevos qu’ils ont.

**Pourquoi :** chaque appareil a ses propres clés, jamais une copie de celles du compte : Erevos n’a pas de serveur qui
pourrait couper un appareil perdu, donc un appareil n’est jamais plus qu’une entrée dans une liste que le téléphone
signe, et le dissocier suffit. La liste a toujours quatre places, celles qu’aucun appareil n’occupe contenant des clés
faites pour rien, pour que les contacts ne puissent pas savoir combien d’appareils tu as. Et avec le téléphone comme
compte, les contacts sur n’importe quel Erevos plus ancien te joignent comme avant.

Pour associer un ordinateur :

1. Sur l’ordinateur, dans un espace sans discussions à lui (une nouvelle installation, un espace qu’ouvre un nouveau mot
   de passe, ou les discussions d’un ordinateur associé restaurées depuis sa sauvegarde), ouvre **Réglages** → **Données
   et appareils** → **Appareils associés**. Là, **Associer à mon téléphone** vient en premier. S’il demande un relais,
   celui de LPHL est déjà rempli : appuie sur **Se connecter avec LPHL** pour un jeton propre à l’ordinateur, ou tape un
   autre relais et son jeton. Nomme l’appareil et appuie sur **Associer à mon téléphone** : alors seulement il affiche
   un code QR.
2. Sur le téléphone, scanne le code avec l’appareil photo : Erevos s’ouvre sur **Appareils associés** avec ce code. Ou
   bien copie le code sur l’ordinateur, colle-le sur le téléphone sous **Code de l’ordinateur**, et appuie sur
   **Suivant**.
3. Le téléphone affiche le nom de l’ordinateur et un code de quatre groupes de cinq chiffres. Choisis ce qui part de
   l’historique (**Tout**, **Le dernier mois**, **La dernière semaine** ou **Aucun**), si **Les photos et fichiers
   aussi** et si **Les comptes Matrix, XMPP et Nostr aussi**, puis appuie sur **Associer**.
4. L’ordinateur affiche aussi un code. Si c’est celui du téléphone, appuie sur **Ils correspondent**. Sinon, appuie sur
   **Ils sont différents** : quelqu’un d’autre a peut-être lu son code QR, et rien ne lui est parvenu.

Les discussions arrivent alors sur l’ordinateur, et après elles les messages choisis.

- Les **messages** des contacts arrivent sur les deux, et chacun ne les garde qu’une fois : un message qui arrive de
  nouveau dans les 30 jours (jusqu’à 2000 d’un même contact) n’est pas gardé de nouveau, même après avoir disparu ou
  avoir été supprimé là. Pour cela, chacun garde, pendant 30 jours, quels messages sont arrivés et quel jour, pas ce
  qu’ils disaient, y compris une fois qu’ils ont disparu ou ont été supprimés, et dans une sauvegarde faite
  entre-temps ; le téléphone le garde aussi pour un contact qui a associé un appareil. Ce que tu écris sur l’ordinateur
  va directement de lui à un contact sur cette version, une fois que celui-ci a écrit à l’ordinateur, et par le
  téléphone sinon : le téléphone l’affiche comme venant de toi, et le contact le reçoit du compte. Ce que tu écris sur
  le téléphone s’affiche aussi sur l’ordinateur. Les marques de lecture, les réactions, les épingles, les votes, la
  suppression sur les deux téléphones, les noms, les minuteurs, les apparences et les images des discussions, le fait
  d’apparaître hors ligne et l’acceptation des demandes vont dans les deux sens. Une étoile, ou une suppression sur **Ce
  téléphone**, faite sur le téléphone va aussi sur l’ordinateur ; faite sur l’ordinateur, elle reste là.
- **Téléphone éteint**, les contacts sur cette version joignent toujours l’ordinateur, et l’ordinateur les joint : ce
  qu’ils écrivent, ce qu’ils lisent et ce à quoi ils réagissent arrive, et ce que tu écris part. Si le téléphone reste
  éteint si longtemps que sa file d’attente sur le relais se remplit (1000 messages), ce qu’ils écrivent et lisent
  atteint toujours l’ordinateur, un long message vocal en entier ; ce à quoi ils réagissent, ce qu’ils épinglent, ce
  pour quoi ils votent ou ce qu’ils suppriment, et leurs appels, ne passent pas avant que le téléphone soit de nouveau
  allumé. Pour les contacts sur des versions plus anciennes, les groupes, les appels, l’ajout d’un contact et les
  messages envoyés pour plus tard, **le téléphone doit être allumé** et joindre le relais : ce que l’ordinateur écrit
  entre-temps attend sur le relais, et part une fois le téléphone revenu. Deux appareils associés ou plus se joignent
  aussi directement : téléphone éteint, chacun montre toujours ce que les autres écrivent, lisent et ce à quoi ils
  réagissent, et les changements qu’ils font aux contacts ; celui qui a manqué le premier message d’un autre en reçoit
  un nouveau un jour ou plus après. Un ordinateur resté éteint plus longtemps que le relais ne garde les messages (14
  jours), ou qui a manqué le premier message d’un contact pour lui, reçoit quand même ce que ce contact écrit ensuite :
  son Erevos recommence avec lui un jour ou plus après, puis de moins en moins souvent, jusqu’à ce qu’il réponde. Après
  qu’un contact t’a supprimé et ajouté de nouveau, l’ordinateur recommence aussi avec ses appareils.
- Les **photos et fichiers** qui arrivent restent sur le relais jusqu’à ce que le téléphone et l’ordinateur les aient
  pris tous les deux ; ensuite le téléphone les y supprime. Ceux que l’ordinateur ne prend jamais partent quand il est
  dissocié, ou après 14 jours, comme tout ce qui n’est pas pris.
- **Discussion avec moi-même** est la même sur chaque appareil : une note, une photo, un fichier ou un message vocal
  écrit sur l’un va aux autres, de même qu’un rappel défini, changé ou vu et une note supprimée ; de deux changements
  d’une même note, c’est le plus récent qui reste. Ce qui a été écrit avant l’association part une fois, dans les deux
  sens, dès que les deux ont cette version. Un rappel s’affiche sur chaque appareil à son heure, et vu sur l’un il
  disparaît des autres. La photo ou le fichier d’une note part en copie sur le relais, supprimée de là une fois prise,
  ou, pour deux appareils ou plus, laissée là jusqu’à son expiration (14 jours). Les notes des discussions masquées ne
  partent jamais.
- Les **appels** sonnent sur le téléphone et sur l’ordinateur. Réponds sur l’un ou l’autre : l’autre cesse de sonner, et
  dit qu’on a répondu sur un autre appareil. Refuser un appel sur l’un le refuse sur les deux. L’ordinateur appelle
  aussi par le téléphone ; l’appel lui-même passe alors directement entre l’ordinateur et le contact, chiffré entre eux,
  et le téléphone ne doit rester allumé que pour l’établir.
- Les **groupes** sont aussi sur l’ordinateur, avec leurs messages, photos, fichiers et messages vocaux. Écris-y,
  réponds, réagis, vote, épingle, supprime tes propres messages pour tout le monde, ajoute et retire des membres,
  renomme un groupe ou quitte-le, là comme sur le téléphone : le téléphone le fait pour l’ordinateur, comme si c’était
  lui. Une photo ou un fichier que le téléphone garde va à l’ordinateur en copie sur le relais, supprimée là une fois
  que l’ordinateur l’a prise. Ce que les membres font ensuite à un message (y réagir, voter, l’épingler, le supprimer
  pour tout le monde) s’affiche aussi sur l’ordinateur, comme une étoile ou une suppression sur **Ce téléphone** faite
  sur le téléphone. Un message que le téléphone n’a pas pu envoyer au groupe (un groupe fermé entre-temps, par exemple)
  s’affiche sur l’ordinateur comme **Pas envoyé par le téléphone**. Créer un groupe, les groupes publics et les appels
  de groupe restent sur le téléphone pour l’instant.
- **Les discussions masquées et les seconds mots de passe** ne sont jamais associés. Les discussions masquées écrivent
  aux appareils d’un contact sur cette version comme le font tes autres discussions, si bien que ceux-ci les reçoivent
  même avec le téléphone du contact éteint, et pour le contact elles ressemblent aux discussions d’un téléphone qui n’a
  jamais associé d’appareil. Une discussion déplacée dans les discussions masquées sur le téléphone quitte l’ordinateur.
  Déplacée dans les discussions masquées, ou hors d’elles vers tes discussions, une discussion n’écrit qu’au téléphone
  du contact, comme le fait un Erevos plus ancien, jusqu’à ce qu’elle retourne là où elle a été créée : son Erevos est
  prévenu d’abord, pour que ses appareils cessent d’écrire aux tiens, et il peut en déduire que la discussion a cessé de
  connaître les appareils associés : si elle lui avait donné la liste de tes appareils, qu’elle est partie dans les
  discussions masquées. Un espace qu’ouvre un second mot de passe ne s’associe que de l’intérieur, à des appareils à
  lui.
- **Transférer de nouveau les messages**, sur le téléphone, renvoie une période de l’historique, avec ses réactions,
  épingles, votes et étoiles ; ce que l’ordinateur a déjà n’est pas gardé deux fois.
- **Matrix, XMPP et Nostr** : avec **Les comptes Matrix, XMPP et Nostr aussi** (activé au départ), l’ordinateur se
  connecte aux comptes Matrix et XMPP de cet espace et prend la clé de ses discussions Nostr, chacun comme un nouvel
  appareil à lui : le téléphone garde le sien. Pour un ordinateur déjà associé, appuie sur **Envoyer les comptes** sous
  lui, sur le téléphone. XMPP et Nostr arrivent d’eux-mêmes. Un serveur Matrix laisse rarement le téléphone connecter un
  nouvel appareil : l’écran **Appareils associés** de l’ordinateur le dit alors, et **Se connecter à Matrix** y ouvre
  Matrix avec l’identifiant déjà rempli, pour son mot de passe, une seule fois. Les clés du compte viennent du
  téléphone, donc ni clé de sécurité ni vérification par emoji ne sont nécessaires, et les messages d’avant s’ouvrent
  depuis sa sauvegarde des clés. Un ordinateur qui a déjà un compte à lui sur l’un d’eux le garde, et ce qui n’a pas pu
  arriver (faute de connexion, par exemple) est réessayé à chaque ouverture. Une fois dissocié, l’ordinateur se
  déconnecte des comptes qu’il a reçus. Ceux des discussions masquées ne partent jamais. Chaque appareil se connecte en
  son propre nom, jamais avec une copie des clés du téléphone, qui serviraient alors deux fois et casseraient le
  chiffrement ; ainsi chacun peut être déconnecté seul, depuis les appareils du compte.
- **Dissocier**, sur le téléphone, coupe un appareil sur-le-champ : plus rien ne lui est envoyé, et rien de ce qu’il
  envoie n’est pris. Les contacts sur cette version sont prévenus la prochaine fois que le téléphone joint le relais :
  ils cessent de lui écrire, et ne prennent plus rien de lui. C’est ainsi qu’on coupe un ordinateur perdu. S’il est
  allumé, il est prévenu, et les discussions du compte le quittent. Sur l’ordinateur, **Dissocier cet appareil** fait la
  même chose de là-bas.
- **Jusqu’à quatre** appareils s’associent à un téléphone. Une sauvegarde n’emporte pas les associations : après en
  avoir restauré une sur un autre téléphone, appuie sur **Dissocier cet appareil** sur l’ordinateur et associe-le de
  nouveau, voir [Sauvegardes](#backup).

## Sur un iPhone, depuis le navigateur {#iphone}

Erevos n’a pas d’appli dans l’App Store. Sur un iPhone, il fonctionne comme une app web, ajoutée à l’écran d’accueil
depuis Safari, sans compte Apple. Il discute par un relais, chiffré de bout en bout comme sur le téléphone, et garde ses
contacts, ses messages et ses réglages scellés de la même façon, dans le stockage de Safari pour l’app.

1. Ouvre dans **Safari** l’adresse du serveur Erevos qu’on t’a donnée. Erevos montre comment l’ajouter : appuie sur
   **Partager** (sur iOS 26, sous **•••**), puis sur **Sur l’écran d’accueil**, puis ouvre Erevos depuis l’écran
   d’accueil. Il faut iOS 17 ou plus récent.
2. Dans Erevos, ouvre **Réglages** → **Confidentialité et sécurité** → **Cette app web** et compare l’empreinte de la
   clé de publication avec celle qu’on t’a donnée avec l’adresse, caractère par caractère. Si elle diffère, supprime
   l’app et préviens celui qui t’a donné l’adresse.
3. Configure un verrou par mot de passe (dans Erevos, **Réglages** → **Confidentialité et sécurité** → **Verrou et
   second mot de passe**). Sur le web, c’est ce qui compte le plus : voir plus bas.
4. Configure le relais et ajoute des contacts comme sur le téléphone, voir [Discuter par un relais](#relay).

**Comment il se vérifie lui-même.** Une app web est du code qu’envoie le serveur, donc un serveur piraté, ou qui en
reçoit l’ordre, pourrait envoyer du code modifié. Erevos ne prend pas ce code sur parole :

- La première fois qu’il s’ouvre, il récupère son code avec une liste de chaque fichier et de son empreinte, signée avec
  la clé de publication, que seule la personne qui fait les versions détient ; le serveur ne l’a pas. Il vérifie la
  signature et chaque fichier, les garde sur l’iPhone, et à partir de là n’exécute que ceux-là. Le serveur ne peut pas
  les changer.
- Une mise à jour n’est prise que si elle est signée avec la même clé et plus récente que celle en usage ; elle démarre
  à la prochaine ouverture d’Erevos. Une mise à jour non signée ou plus ancienne est refusée, et Erevos le dit.
- Qui le veut peut vérifier le serveur : \`node pwa/release.mjs verify https://<address>\` vérifie la signature et
  chaque fichier que le serveur distribue, et \`scripts/reproduce-web.sh <version> https://<address>\` reconstruit cette
  version depuis son code source et vérifie que chaque fichier en ressort identique.

**Ce qui reste.** Ce sont de vraies limites ; connais-les :

- **La première fois** que tu l’ouvres, tu fais confiance au serveur : c’est lui qui envoie la partie de vérification.
  L’étape 2 est la façon d’en repérer une mauvaise.
- **La partie de vérification elle-même** (le service worker) est récupérée de nouveau par Safari au moins une fois par
  jour, et Safari peut la remplacer sans demander à Erevos. Erevos vérifie alors la nouvelle par rapport à la version
  signée et te prévient (**Erevos a été falsifié**), mais un serveur qui sait s’y prendre pourrait contourner cette
  vérification. Si tu vois l’avertissement, n’ouvre plus Erevos depuis ce serveur tant que ce n’est pas expliqué. Avec
  un verrou par mot de passe, tes discussions restent scellées.
- **Pas de Bluetooth ni de liaison à proximité**, et pas de SMS : Safari ne les permet pas.
- **Seulement quand il est ouvert :** iOS arrête les apps web en arrière-plan, donc les messages arrivent quand tu
  ouvres Erevos ; ils attendent sur le relais jusque-là.
- **Les appels** sonnent tant qu’Erevos est ouvert, avec une sonnerie à lui : deux courtes toutes les 3 secondes. Safari
  ne la laisse sonner qu’une fois que tu as touché Erevos depuis son ouverture, et pas avec l’iPhone en mode silencieux.
  Erevos fermé, un appel ne sonne pas : seule la notification « Appel » s’affiche, si les notifications sont activées.
  Apple ne permet rien de plus à une app web ; pour sonner comme un téléphone, il faudrait une app de l’App Store.
- Les **notifications** quand Erevos est fermé sont désactivées tant que tu ne les actives pas : dans Erevos,
  **Réglages** → **Notifications** → **Notifications quand l’app est fermée** → **Activer** (iOS 16.4 ou plus récent,
  depuis l’écran d’accueil). Quand des messages arrivent, ou qu’un appel sonne, ton relais envoie un push par Apple, et
  Erevos affiche combien de messages sont arrivés depuis la dernière fois que tu l’as ouvert (**3 nouveaux messages**),
  ou **Appel** quand seul un appel a sonné, dans la langue de l’app, rien de plus. Le nombre est chiffré pour ton
  iPhone : Apple voit quand quelque chose arrive pour ton iPhone, et qu’il utilise Erevos, jamais quoi ni de qui. Avec
  un relais ou l’Erevos d’un expéditeur antérieur à la version 2.0.0, ou un message que d’autres téléphones ont porté
  jusqu’au relais, il n’y a pas de nombre : Erevos affiche **Nouveau message**, ou **Nouveaux messages** une fois que
  d’autres sont arrivés, jusqu’à ce que tu l’ouvres. Elles sont propres à chaque espace, jamais pour les discussions
  masquées, et ton relais doit être configuré pour les envoyer. Elles arrivent aussi pour la file d’attente propre à
  chaque contact : ton relais a alors une seule adresse de push pour toutes les files d’attente de tes contacts, et
  Apple reçoit un push pour chaque contact qui a écrit, à 15 secondes d’intervalle, donc d’une telle série il peut
  deviner combien ont écrit en même temps, jamais qui. L’icône d’Erevos sur l’écran d’accueil affiche alors aussi un
  nombre : les messages non lus de l’espace que tu avais ouvert, dont le nombre reste une fois Erevos fermé, et ceux
  arrivés depuis (ce qui est arrivé sans nombre compte pour un), jamais ceux d’une discussion masquée. **Réglages** →
  **Notifications** → **Nombre sur l’icône** le désactive. Les notifications passent par le service push d’Apple, celui
  de Google (Chrome, ainsi qu’Edge sur Android, Brave et Opera), celui de Mozilla (Firefox) et celui de Microsoft (Edge
  sur Windows) : un navigateur qui en utilise un autre ne peut pas les activer, sauf si la personne qui gère ton relais
  autorise son service push. Les espaces sur des relais différents partagent les notifications du navigateur : seul
  celui ouvert en dernier les reçoit. Une demande de message de quelqu’un de nouveau, par ton lien de contact, peut ne
  s’afficher qu’à l’ouverture d’Erevos. Le nombre sur l’icône s’affiche aussi sur un Mac avec « Ajouter au Dock » de
  Safari, et dans l’app web installée depuis Chrome ou Edge sous Windows, macOS ou ChromeOS. Aucune bannière **Nouveau
  message** ne s’affiche par-dessus Erevos tant qu’il est ouvert à l’écran. L’écran **Notifications quand l’app est
  fermée** dit quand le navigateur ou le téléphone ne les autorise pas et, après que tu les as désactivées, quand ton
  relais n’a pas encore pu être prévenu et peut encore en envoyer : Erevos le lui dit dès qu’il peut l’atteindre.
  Quand le navigateur change d’adresse push, ou que son service push la laisse tomber, Erevos donne tout seul la
  nouvelle à ton relais quand il revient à l’écran.
- **Autorisations :** dans Erevos, **Réglages** → **Général** → **Autorisations** montre ce que le navigateur permet à
  Erevos : s’il fonctionne depuis l’écran d’accueil, les notifications quand l’app est fermée (nécessaires une fois que
  cet espace les a activées), le micro pour les appels, l’appareil photo pour les appels vidéo, et si le navigateur
  garde les données d’Erevos pour de bon. Sans cela, Safari peut effacer les données quand l’iPhone manque de place,
  donc une sauvegarde est le filet de sécurité. Chacune dit pourquoi, avec un bouton qui pose la question propre au
  navigateur ; là où le navigateur ne demande plus, il dit où se trouve le réglage (**Réglages → Notifications →
  Erevos**, ou **Réglages → Apps → Safari → Micro**). Il ne fait que lire ce que dit le navigateur. Un navigateur ne
  laisse pas Erevos lire l’économie de batterie ni le mode Économie d’énergie, donc ils n’y sont pas. Après chaque
  nouvelle version signée, il s’ouvre de lui-même quand il manque quelque chose dont les messages, les appels ou les
  données ont besoin. Dans un autre navigateur (Chrome, Firefox), c’est pareil, avec les réglages de ce navigateur.
- Les **sauvegardes** se font à la main : **Créer une sauvegarde** enregistre le fichier par la feuille de partage
  (Fichiers, iCloud Drive ou une autre app). Un navigateur ne livre un fichier qu’après un appui, donc il n’y a pas de
  sauvegardes automatiques.
- Les **messages vocaux** enregistrés sur un iPhone sont en AAC ; ils se lisent partout.
- **Apple** fait Safari et pourrait le changer, comme pour n’importe quelle app sur un iPhone.

## Sur Sailfish OS {#sailfish}

Sur un téléphone Sailfish OS, Erevos est une appli à part entière : la même app que dans le navigateur, affichée par le
moteur de navigateur propre à Sailfish dans une fenêtre Sailfish, avec son code installé avec l’appli et non récupéré
depuis un serveur. Il discute par un relais, chiffré de bout en bout comme sur le téléphone, et garde ses contacts, ses
messages et ses réglages scellés de la même façon.

1. Autorise les applis venant d’ailleurs que du Jolla Store : **Paramètres → Logiciels non fiables → Autoriser les
   logiciels non fiables**.
2. Copie \`erevos-sailfish-aarch64.rpm\` sur le téléphone (Téléchargements) et appuie dessus dans **Fichiers**, puis sur
   **Installer**. Depuis un terminal (mode développeur), c’est \`pkcon install-local erevos-sailfish-aarch64.rpm\`. Il
   faut Sailfish OS 5 dans sa version 64 bits (aarch64).
3. Configure un verrou par mot de passe (dans Erevos, **Réglages** → **Confidentialité et sécurité** → **Verrou et
   second mot de passe**). Voir plus bas pourquoi c’est important ici.
4. Configure le relais et ajoute des contacts comme sur le téléphone, voir [Discuter par un relais](#relay).

- **Ce que seul Android fait :** Bluetooth, Wi-Fi Aware, Wi-Fi Direct, LoRa et les SMS. Le même Wi-Fi marche ici aussi,
  comme sur un ordinateur : voir [Discuter avec un téléphone à proximité](#nearby). Le pare-feu de Sailfish OS laisse
  déjà entrer son port, le 47905 : seul un pare-feu que vous avez durci vous-même demande une règle pour lui. Le reste
  est pareil : les espaces et le second mot de passe, les discussions masquées, les messages vocaux, les discussions
  importées et les sauvegardes.
- **Où il garde les choses :** dans \`~/.local/share/erevos\` sur le téléphone, scellé comme sur le téléphone. Sailfish
  n’a pas de trousseau pour les applis, donc le magasin de clés y est gardé tel quel, lisible par ton utilisateur, et
  donc par toute appli qui tourne en ton nom : c’est le verrou par mot de passe qui le scelle.
- Les **sauvegardes** vont dans \`Documents/Erevos\` sur le téléphone, à la main ou chaque jour ; copie-les de là sur
  une carte mémoire ou un autre appareil. **Enregistrer** met une photo ou un fichier dans Téléchargements.
- Les **appels** sonnent tant qu’Erevos est à l’écran, avec une sonnerie à lui : deux courtes toutes les 3 secondes,
  et le téléphone vibre là où il le peut, jusqu’à ce que l’appel soit décroché ou se termine. Un appel qui arrive avant
  que tu aies touché Erevos depuis son ouverture peut s’afficher sans son.
- **Pendant qu’il est fermé :** avec un espace ouvert, un petit assistant d’Erevos attend sur le relais tant qu’Erevos
  n’est pas à l’écran ou est fermé, et ne prend rien. Une notification dit seulement combien de messages sont arrivés,
  jamais de qui ni quoi, et un appel sonne avec la sonnerie du téléphone, comme son profil la règle, 45 secondes au
  plus ; un appui sur l’une ou l’autre ouvre Erevos. Les discussions cachées ne disent rien alors. Verrouiller
  l’espace l’arrête, et après un redémarrage du téléphone il n’attend de nouveau qu’une fois qu’Erevos a ouvert
  l’espace. Comme le reste d’Erevos ici, il passe en direct, sans Tor. Chaque attente réveille le téléphone environ
  une fois par minute, comme sur Android.
- **Testé jusqu’ici** sur le moteur de navigateur de Sailfish (Gecko 91) sur un ordinateur, en discutant avec un
  navigateur par un relais. Le même Wi-Fi a été vérifié face à celui de l’ordinateur, sur un ordinateur. Pas encore sur
  un téléphone Sailfish.

## Mises à jour {#updates}

Erevos ne demande les mises à jour à GitHub que quand tu appuies sur le bouton, comme dans LPHL FASOULI : une
vérification régulière dirait à GitHub, chaque jour, que ce téléphone ou cet ordinateur a Erevos. Sur Android, il te
prévient aussi quand une nouvelle version sort, sans demander à GitHub, comme le dit **Prévenu quand une nouvelle
version sort** plus bas. Pour mettre à jour :

1. Ouvre **Réglages** → **Général** → **Mises à jour** (ou **Rechercher des mises à jour** en bas du premier écran de ce
   guide). Il montre la version que tu as, par exemple **Erevos 2.0.0**.
2. Appuie sur **Rechercher des mises à jour**. GitHub voit alors l’adresse internet de cet appareil, rien d’autre ; sur
   Android, le serveur de l’app web aussi, qui garde la signature de la mise à jour par l’ordinateur des versions. Tant
   que tout dans l’espace passe par Tor (**Tout** sous Tor), Erevos ne vérifie pas, puisque cela contournerait Tor.
3. Quand il y a une nouvelle version : sur Android, appuie sur **Installer**. Elle se télécharge, est vérifiée par
   rapport à la version publiée (sa taille et son SHA-256), et l’installateur d’Android s’ouvre : appuie sur
   **Installer** là aussi. Erevos ne la propose qu’une fois que l’ordinateur des versions, qui garde sa clé hors
   ligne, a signé cette compilation et son SHA-256 : quelqu’un qui aurait pris le contrôle du compte GitHub ne
   pourrait pas, à lui seul, faire installer un APK à lui. D’ici là, il dit que la version est sortie mais pas encore
   signée. Quand le serveur de l’app web est injoignable, il le dit, avec la raison, et quand la signature là-bas ne
   correspond pas, il le dit : dans les deux cas, rien ne s’installe. Un téléchargement dont la connexion n’apporte
   plus rien pendant un moment reprend de lui-même depuis le début, trois fois en tout ; ensuite Erevos le dit, et
   rien ne s’installe. La première fois, Android demande d’autoriser l’installation d’applis depuis Erevos. Sur un
   ordinateur et sur Sailfish OS, **Ouvrir la page de téléchargement** ouvre la page des versions : prends le fichier
   qu’Erevos nomme, celui du paquet que tu as, et mets à jour comme dans le tableau ci-dessous.

Une version comme **4.0.0-rc.1** est une version de test avant la 4.0.0 (une version candidate) : elle s’installe et
se met à jour comme les autres, et la 4.0.0 vient après elle.

### Nouveautés {#whats-new}

**Réglages** → **Général** → **Nouveautés** (aussi **Nouveautés** dans **Mises à jour**) dit en bref ce que chaque
version a changé, la plus récente d’abord, sous son seul numéro ; la version que tu as indique **Cette version**. Chaque
version ajoute la sienne. Le CHANGELOG du code source raconte chaque changement en entier.
Chaque version, là-bas comme ici, dit d’abord ce qui change **Pour toi**, ce que tu vois et utilises, puis ce qui a
changé **Sous le capot** : corrections, vitesse, batterie et sécurité à l’intérieur.

### Prévenu quand une nouvelle version sort {#release-notice}

Sur Android, une fois par jour, Erevos demande au serveur de LPHL, qui fait aussi tourner le relais, si une nouvelle
version est sortie. Quand c’est le cas, **Erevos** s’affiche en haut des discussions, épinglé, avec son icône : **Erevos
3.3.0 est sorti. Touche pour voir les nouveautés et mettre à jour.**, marqué jusqu’à ce que tu l’ouvres, et une
notification dit aussi **Erevos 3.3.0 is out**. Appuie sur l’un ou l’autre pour **Mises à jour**, puis sur
**Rechercher des mises à jour**. Il disparaît une fois que tu as cette version.

- **Seulement une fois signée :** elle ne compte qu’une fois que l’ordinateur des versions a signé à la fois la
  compilation et son nom, la même signature qui permet à **Mises à jour** de l’installer. Elle arrive donc une fois que
  cette version peut être installée, et le serveur seul ne peut pas en inventer une.
- **Seulement sur le relais de LPHL :** un espace ne demande que tant qu’il utilise le relais de LPHL et n’envoie pas
  tout par Tor (**Tout** sous Tor) : le serveur ne voit alors rien qu’il ne voie déjà. Un espace sur un autre relais, ou
  sans relais, ne demande rien ; là, **Rechercher des mises à jour** te le dit.
- **Pour la désactiver :** **Réglages** → **Général** → **Mises à jour** → **Me prévenir quand une nouvelle version
  sort**.
- Elle fonctionne à partir de la version qui l’a : celle d’avant ne dit rien. Pas dans la compilation F-Droid, que
  F-Droid met à jour.

**Pourquoi :** pour que personne n’ait à regarder sur GitHub, une par une, chaque nouvelle version, et que GitHub
n’apprenne jamais quels téléphones ont Erevos : le serveur interrogé est celui auquel le téléphone parle déjà, et ce
qu’il dit ne compte qu’avec la signature de l’ordinateur des versions, gardée hors ligne.

La suite de cette section sert à mettre à jour à la main.

**Où sont les nouvelles versions :** sur la page des versions d’Erevos,
\`https://github.com/azzinder/erevos-releases/releases\`. La plus récente est en haut, par exemple **Erevos 2.0.0**,
avec un fichier pour chaque système. Les cinq plus récentes y restent.

**Vérifie le fichier** si tu peux, sur un ordinateur : chaque version a \`SHA256SUMS\`, et dans le dossier des fichiers
téléchargés, \`sha256sum -c --ignore-missing SHA256SUMS\` doit dire **OK** pour chacun.

**Fais d’abord une sauvegarde** (**Réglages** → **Données et appareils** → **Sauvegardes** → **Créer une sauvegarde**),
voir [Sauvegardes](#backup). Une mise à jour garde tout, mais une sauvegarde coûte une minute et couvre toute surprise.

| Sur | Comment mettre à jour |
| --- | --- |
| **Android** | **Réglages** → **Général** → **Mises à jour** → **Rechercher des mises à jour** → **Installer**, ou à la main : ouvre la page des versions sur le téléphone, appuie sur \`erevos-android.apk\`, puis sur **Installer**. Il s’installe par-dessus celui que tu as et garde tout. Autorise une fois l’installation depuis le navigateur, quand Android le demande. |
| **Linux, basé sur Arch** | \`sudo pacman -U erevos-linux-x86_64.pacman\` |
| **Linux, AppImage** | Remplace l’ancien \`erevos-linux-x86_64.AppImage\` par le nouveau et rends-le exécutable. |
| **macOS** | Ouvre \`erevos-macos.dmg\` et fais glisser Erevos dans Applications, **Remplacer**. Ensuite, autorise-le de nouveau sous **Réglages Système → Confidentialité et sécurité → Ouvrir quand même**. |
| **Windows, installé** | Ferme Erevos et lance le nouveau \`erevos-windows-x64-setup.exe\` : il s’installe par-dessus celui que tu as. Windows peut de nouveau avertir : **Informations complémentaires**, puis **Exécuter quand même**. |
| **Windows, portable** | Ferme Erevos et mets le nouveau \`erevos-windows-x64-portable.exe\` à la place de l’ancien. |
| **Sailfish OS** | Appuie sur \`erevos-sailfish-aarch64.rpm\` dans **Fichiers**, puis sur **Installer**, ou \`pkcon install-local erevos-sailfish-aarch64.rpm\`. |
| **iPhone, navigateur** | Rien à faire : l’app web prend d’elle-même une nouvelle version signée quand elle s’ouvre, voir [Sur un iPhone](#iphone). |

- **Les contacts, discussions et réglages restent** sur chaque système : ils vivent dans le dossier propre d’Erevos, pas
  dans l’appli.
- **Android, la première fois depuis la page des versions :** un Erevos compilé sur un ordinateur pour des tests est
  signé avec une autre clé, et Android refuse de s’installer par-dessus (**Application non installée**). Fais une
  sauvegarde, désinstalle Erevos, installe celui de la page des versions et restaure la sauvegarde. Après cela, chaque
  mise à jour s’installe par-dessus.
- **Erevos depuis F-Droid**, une fois qu’il y sera, est mis à jour par F-Droid : ses **Mises à jour** montrent la
  version et le disent, sans **Rechercher des mises à jour**. F-Droid le signe avec une clé à lui, donc Android
  n’installe ni celui-ci par-dessus l’Erevos de la page des versions, ni celui-là par-dessus lui. Pour passer de l’un à
  l’autre : fais une sauvegarde, désinstalle Erevos, installe l’autre et restaure la sauvegarde.
- **Jamais plus ancien :** n’installe pas une version plus ancienne par-dessus une plus récente. Ses données peuvent
  être sous une forme que l’ancienne ne sait pas lire. Restaure plutôt une sauvegarde faite avec cette version plus
  ancienne.
- **Une version à laquelle manque ton système** le dit dans ses notes : cette compilation a échoué, alors prends la
  version d’avant.

## Erevos vers un téléphone proche {#give-app}

Sans internet, un téléphone Android avec Erevos peut le donner à un téléphone à côté, dans **Réglages** → **Général**
→ **Donner Erevos à un téléphone proche** (aussi dans **Mises à jour**). Les deux téléphones doivent être sur le même
Wi-Fi, ou l’autre sur le point d’accès de celui-ci : activez d’abord le point d’accès dans les réglages d’Android.

1. **Sur le téléphone qui donne :** touchez **Démarrer**. Un code QR s’affiche, avec la taille du paquet, et dessous
   les adresses à taper plutôt dans un navigateur.
2. **Sur un téléphone sans Erevos :** scannez le code avec son appareil photo. Son navigateur ouvre une page, servie
   par le téléphone qui donne, avec **Télécharger Erevos** : téléchargez-le et ouvrez le fichier, et Android
   l’installe. La première fois, Android demande d’autoriser l’installation d’apps depuis ce navigateur. La page
   montre le SHA-256 du paquet et celui de son certificat : ils doivent être ceux que montre le téléphone qui donne
   sous **À comparer**.
3. **Sur un téléphone avec un Erevos plus ancien :** ouvrez plutôt **Réglages** → **Général** → **Mises à jour** →
   **Depuis un téléphone proche** et photographiez le code. Erevos télécharge le paquet et n’ouvre l’installateur
   d’Android que si son SHA-256 est celui du code, que c’est Erevos, signé du même certificat que l’Erevos qui s’y
   trouve, et plus récent.

- **Combien de temps :** le téléphone qui donne le sert tant que son écran s’affiche, dix minutes au plus, et s’arrête
  plus tôt avec **Arrêter**. Il ne répond qu’à une adresse aléatoire que personne ne devine, qu’aux téléphones de son
  propre réseau, et rien d’autre que le paquet et sa page : aucune conversation, aucun contact ni réglage ne part avec.
- **Ce qu’il ne peut vérifier pour vous :** le navigateur ne fait que télécharger. Un téléphone avec un Erevos modifié
  montrerait son propre certificat ; dès que vous avez internet, comparez donc le certificat avec celui du site ou de
  la page des versions d’Erevos. Erevos lui-même, dans **Mises à jour**, refuse un paquet signé autrement.
- **Pas depuis un magasin :** un Erevos installé en plusieurs parties, comme le font certains magasins, ne peut pas
  être donné en entier et le dit. L’Erevos de F-Droid est signé par F-Droid : il peut aller vers un téléphone sans
  Erevos, ou par-dessus l’Erevos de F-Droid via le navigateur, mais un Erevos de la page des versions le refuse dans
  **Mises à jour**, comme le ferait Android. L’Erevos de F-Droid ne prend rien dans **Mises à jour** : F-Droid le met à
  jour.
- Android seulement. Quiconque sur le même réseau voit le code peut aussi télécharger Erevos ; il n’y a rien d’autre à
  prendre.

**Pourquoi :** là où internet est coupé, ou surveillé, ou qu’un téléphone n’atteint même pas le site, Erevos peut
encore passer de main en main, et le téléphone qui le reçoit peut vérifier que c’est le vrai.

## Les écrans de test {#tests}

Deux écrans sous **Réglages** → **Pour les tests** servent à tester les connexions, étape par étape.

- **Test radio (Android) :** **Autorisations** demande à Android ce dont la radio a besoin, **Démarrer** et **Arrêter**
  activent et désactivent le Bluetooth et le Wi-Fi Aware, **Envoyer bonjour** envoie un simple message de test au Test
  radio du téléphone à proximité (une discussion ne l’affiche pas), et le **Journal** montre ce qui s’est passé.
- **Test du relais (Wi-Fi) :** **Créer une file d’attente** crée une file d’attente sur un relais et affiche deux
  identifiants. Donne l’**identifiant d’expéditeur** au téléphone qui t’écrit, et garde l’**identifiant de
  destinataire** pour toi. **Envoyer** et **Recevoir** déplacent des messages à la main.

> Avec un seul téléphone, tu peux quand même essayer une discussion par le relais : tes discussions et tes **Discussions
> masquées** ont chacune leur propre file d’attente sur un relais et leurs propres clés. Crée les deux files d’attente
> sur le même relais, appuie sur **Partager mon lien de contact** dans l’une et copie-le, puis ajoute-le dans l’autre,
> et écris dans les deux sens. Le propre lien d’une discussion est refusé comme contact.

## Ce qui est protégé aujourd’hui {#privacy}

Erevos dit clairement ce qu’il protège et ce qu’il ne protège pas, pour l’instant.

| Quoi | Aujourd’hui | À venir |
| --- | --- | --- |
| **Compte, numéro de téléphone, e-mail** | Aucun n’est nécessaire. Les contacts sont des paires de files d’attente à sens unique sur un relais. | |
| **Les contacts et leurs noms, clés, réglages de relais, apparence** | Scellés sur le téléphone avec la clé de chaque espace. | |
| **Messages par un relais** | Chiffrés de bout en bout : PQXDH avec ML-KEM-768 pour commencer, puis le double ratchet. Le relais ne peut pas les lire, et une fois que les deux téléphones ont reçu un message l’un de l’autre, il ne peut pas non plus les distinguer par conversation : chacun est scellé une fois de plus pour le téléphone auquel il va. Il voit lesquels sont des messages que quelqu’un lit, lesquels sont des échanges entre téléphones, et lesquels sont des appels qui sonnent, comme chacun le dit. Pas encore audité. | Un audit externe. |
| **Messages vers un téléphone à proximité** | Chiffrés de bout en bout, comme par le relais. Qui écoute à proximité peut savoir que des téléphones Erevos sont proches l’un de l’autre, et quand et combien ils envoient ; sur le même Wi-Fi, quiconque s’y trouve le peut aussi, et par Wi-Fi Direct, quiconque rejoint le Wi-Fi propre aux téléphones. Tant que le téléphone de ton contact n’est pas connu, les autres téléphones Erevos reliés à proximité reçoivent tes messages courts, scellés. | |
| **Messages portés par d’autres téléphones** | Scellés deux fois : de bout en bout pour ton contact, et pour son relais. Un téléphone qui en porte un voit vers quel relais il va, quand, et sa taille ; pas de qui il vient ni pour qui il est. Son relais voit vers quel relais il va, et ce relais voit le relais du porteur, pas son téléphone. Gardés scellés sur le téléphone, trois jours au plus : ceux des autres dans un fichier du téléphone, dont la taille montre à peu près combien il y en a ; les tiens dans ton espace, scellés avec sa clé. Les discussions masquées ne sont jamais portées. | |
| **Messages par LoRa** | Chiffrés de bout en bout, comme par le relais. Quiconque a une radio, à des kilomètres, peut savoir que la tienne émet, quand et combien, et son signal peut être suivi jusqu’à l’endroit où elle se trouve. Erevos empêche ta radio de dire son nom et où elle est (rôle Client hidden, GPS coupé, pas de position fixe) sauf si tu le permets ; elle répond quand même à une radio qui demande son nom. Chaque Erevos sur le mesh reçoit tes messages LoRa, scellés. | Régler le nom de la radio depuis Erevos. |
| **Messages par SMS, quand rien d’autre ne marche** | Chiffrés de bout en bout, comme par le relais, dans des SMS de données cachés. Désactivé sauf si tu l’actives. L’opérateur voit quel numéro a écrit à quel autre, quand, et combien de SMS ; jamais ce qui a été écrit. Chacun coûte ce que coûte un SMS. | |
| **Qui parle à qui** | Le relais voit les adresses IP, les identifiants de file d’attente, et quand et combien. Avec un second relais, ton relais ne voit jamais ton adresse. Depuis une place prêtée sur le relais d’un contact, chaque relais auquel tu envoies la voit. [Par Tor](#tor), qui porte les messages sauf si tu changes cela, aucun relais ne la voit pour ce que tu écris, et avec **Tout** pour les images et les fichiers aussi ; avec des ponts, pour là où Tor est bloqué, le réseau ne voit qu’un pont. Le broker de Snowflake et les serveurs STUN voient ton adresse. | Tor sur un ordinateur. |
| **La connexion au relais** | TLS, et à l’intérieur, une fois la clé du relais connue, un canal vers cette clé : le relais prouve qu’il la détient à chaque connexion, et le jeton et chaque requête lui parviennent chiffrés, si bien que quelqu’un entre les deux avec un certificat pour le nom du relais ne peut pas se faire passer pour lui. Un relais qui a prouvé sa clé une fois n’est plus jamais joint sans elle. Un relais plus ancien que cette appli fonctionne comme avant, et **Comment tu te connectes maintenant** le dit. La première clé vient du relais la première fois qu’on la lui demande, ou d’un lien de contact : quiconque est entre les deux cette toute première fois pourrait en donner une à lui. [La clé propre du relais](#relay). Pas audité. | La clé de notre relais intégrée à l’appli, et dans les invitations. |
| **Les textes par Nostr** | Chiffrés de bout en bout comme par un relais, puis enveloppés une fois de plus pour une clé que ton contact a donnée à cette seule discussion, signés par une clé faite pour ce seul texte. Les relais Nostr voient quand et quelle taille, et qu’une clé qui ne nomme personne reçoit un texte ; ton téléphone lit toutes ses clés sur une seule connexion, par Tor, donc un relais peut savoir qu’elles sont lues ensemble, jamais d’où. Ton relais ne les voit que comme la sauvegarde, et une sonnette pour les discussions masquées. [Par Nostr](#nostr). | |
| **SMS** | Un SMS ordinaire est lu par l’opérateur téléphonique, comme tout SMS. Vers un numéro lié à un contact Erevos, il passe plutôt par Erevos. Une invitation cachée est un SMS court de plus que l’opérateur téléphonique voit. | |
| **Les contacts du téléphone** | Dans les contacts propres d’Android, non scellés par Erevos, comme avec toute appli de contacts : chaque appli autorisée à les lire les voit, et un compte (Google) peut les synchroniser. Erevos ne les envoie nulle part. Un fichier .vcf enregistré à partir d’eux est hors d’Erevos, non scellé. Les appels et SMS d’un contact sont lus dans l’historique des appels et les SMS propres du téléphone seulement pour afficher son historique, et ne sont gardés nulle part. | |
| **Contacts gardés seulement dans Erevos** | Scellés avec la clé de l’espace, ou avec celle des discussions masquées pour les leurs, dans un seul fichier pour tous les espaces dont la taille montre à peu près combien il y en a en tout, pas à qui ils sont ; leurs photos chacune dans un fichier à elle. Jamais dans les contacts d’Android. Un fichier .vcf enregistré à partir d’eux, ceux des discussions masquées aussi, est hors d’Erevos, non chiffré. Les appels et SMS vers eux passent par le téléphone, et s’affichent dans son historique des appels et ses SMS. | |
| **Appels téléphoniques** | Des appels téléphoniques ordinaires : l’opérateur téléphonique les achemine et peut écouter, comme avec toute appli de téléphone. Android garde l’historique des appels, non scellé par Erevos, comme pour toute appli de téléphone ; Erevos le lit, ainsi que les favoris, pour les afficher, n’en supprime que les appels que tu supprimes, et n’en garde aucune copie. La SIM choisie pour chaque numéro est scellée dans l’espace ; les réponses rapides, et ce qui est bloqué (préfixes, identifiants de groupe et horaires seulement, les mêmes pour tous les espaces), sont gardés sur le téléphone, non scellés. | |
| **Discussions importées** | Scellées dans l’espace où elles ont été amenées, leurs photos et fichiers aussi, chacun en morceaux comme l’est le fichier d’une discussion. La taille du fichier, et le nombre de morceaux, disent à peu près combien a été importé, pas où. | Les photos et fichiers de Viber, et les fichiers de plus de 1 Go. |
| **Historique des messages** | Gardé sur le téléphone, scellé dans son espace, sans limite, dans des pages de même taille mêlées pour tous les espaces. Seule la place que tout cela prend se voit, pas l’espace auquel il appartient. La suppression sur les deux téléphones, et les messages éphémères, reposent sur l’Erevos de l’autre téléphone. | |
| **Messages à proximité** | Ouverts seulement dans l’espace qui a le contact. Un message pour un autre espace attend en mémoire, six heures au plus, jusqu’à ce que cet espace s’ouvre. Un message pour des discussions masquées ne s’ouvre que tant qu’elles sont ouvertes, ou reçoivent fermées, et l’espace n’apprend jamais qu’un de leurs contacts est à proximité. | |
| **Messages vocaux** | Chiffrés de bout en bout par le relais ou à proximité, en morceaux : le relais, ou qui écoute à proximité, peut savoir à peu près la durée de chacun. Chaque son est scellé dans un fichier à lui ; le nombre de fichiers, et leurs tailles, montrent à peu près combien il y en a de gardés, pas dans quel espace. Déscellé dans le cache seulement pendant sa lecture. | Des fichiers sonores tous de la même taille. |
| **Photos et fichiers** | Chiffrés de bout en bout, par le stockage de fichiers du relais, en morceaux d’une même taille : le relais voit combien et quand, donc à peu près quelle taille. Ton relais voit ton adresse, comme pour les messages ; le contact les prend par son propre relais. Les photos perdent leur lieu, leur téléphone et leur heure, sauf si elles sont envoyées comme fichier ; un fichier garde ce qu’il dit à l’intérieur. Scellés sur le téléphone dans leurs morceaux, affichés depuis la mémoire. Les copies enregistrées sont hors d’Erevos. Pas encore dans les sauvegardes. | Des sauvegardes qui les contiennent. |
| **Sur un ordinateur** | Scellé comme sur le téléphone, dans le dossier propre de l’appli. Son magasin de clés est scellé avec le trousseau du système (sous Windows, la clé de ton compte) ; sur un système Linux sans trousseau, Erevos ne garde rien à moins d’être lancé avec \`--plain-secrets\`, et le garde alors tel quel. | |
| **Sauvegardes** | Un fichier scellé avec son propre mot de passe, contenant chaque espace tel qu’il est scellé sur le téléphone. Son nom dit que c’est une sauvegarde Erevos, et sa taille montre à peu près combien est gardé. Les sauvegardes automatiques gardent leur mot de passe sur le téléphone. Envoyée à un serveur seulement si tu en ajoutes un : des octets aléatoires sous un nom aléatoire, d’une taille arrondie ; le serveur voit ton compte et quand, et ton adresse sauf si elle passe par Tor. | |
| **Marques ✓✓ et ✓✓✓** | Le téléphone du contact apprend quand le tien a reçu et lu ses messages, chiffré. Dans un groupe qui n’est pas public, le téléphone de qui a envoyé le message l’apprend aussi. Le relais, ou qui écoute à proximité, voit un petit message de plus. | Un interrupteur pour cesser de dire quand tu lis. |
| **Empreinte digitale ou visage (Android)** | Désactivé sauf si tu l’actives. N’ouvre que l’espace du premier mot de passe : sa clé est scellée dans l’Android Keystore, utilisable seulement juste après une vérification forte de l’empreinte ou du visage, et abandonnée quand ils changent. Quelqu’un qui te retient peut utiliser ton doigt. | |
| **Notifications (Android)** | En arrière-plan : « Erevos – Ready for calls and messages » (pas sur l’écran de verrouillage), « Incoming call » ou « Incoming video call » – « Open Erevos to answer », et « New message » ou combien sont arrivés ; quand Android ou le mot de passe l’arrête, « Closed by Android » ou « Locked » – « Open it to receive calls and messages again » ; un rappel, « Reminder » ou combien ; une nouvelle version, « Erevos X is out ». Jamais qui ni quoi. Sur un téléphone verrouillé, celle des messages dit seulement « Erevos ». Les discussions masquées qui ont le droit de le dire affichent la même notification, comptées avec le reste : qui la voit et ne trouve rien de nouveau peut deviner qu’il y en a d’autres. En tant qu’appli de téléphone, la notification d’un appel téléphonique nomme qui appelle, sur l’écran de verrouillage aussi, comme celle de toute appli de téléphone, mais jamais par un nom que seules les discussions masquées connaissent : un appel de l’un de leurs contacts affiche le numéro. | |
| **Widget et Téléphone (Android)** | Le widget, une fois ajouté, montre combien il y a d’appels manqués, de SMS non lus et de nouveaux messages, jamais qui ni quoi. Le Téléphone s’ouvre sans le mot de passe seulement si tu le permets : alors quiconque tient le téléphone déverrouillé voit les appels et les favoris qu’Android garde, avec les noms des contacts du téléphone seulement. | |
| **Appels** | Chiffrés de bout en bout (DTLS-SRTP, sa clé envoyée dans la discussion chiffrée). Par le relais d’appel, aucun des deux téléphones ne voit l’adresse IP de l’autre ; le serveur qui le fait tourner voit les deux, quand et combien de temps, et combien passe. Sans relais d’appel, sur le même Wi-Fi seulement, chaque téléphone voit l’adresse de l’autre. Les relais voient quand un appel commence à sonner. | La sonnerie dans l’app web fermée. Les appels par Bluetooth (le talkie-walkie y fonctionne). |
| **Discussions de groupe** | Chiffrées de bout en bout avec MLS (RFC 9420) ; les membres retirés ne lisent plus rien ensuite. La copie de chaque membre est scellée à part, donc les relais ne peuvent pas savoir qui est dans un groupe ; chaque relais voit quand même un message atteindre une file d’attente. Les membres voient les clés et les adresses de relais les uns des autres. Les photos, fichiers et messages vocaux passent par le stockage de fichiers du relais de l’expéditeur, comme vers un contact, et y restent 14 jours. Pas audité. | |
| **Appels de groupe** | Voix et vidéo, chiffrées de bout en bout entre chaque paire de téléphones de l’appel (DTLS-SRTP, ses clés envoyées dans le chiffrement du groupe). Par le relais d’appel, aucun téléphone ne voit l’adresse IP d’un autre ; le serveur qui le fait tourner voit celle de chaque téléphone, quand et combien de temps, et combien passe. Chaque membre, dans l’appel ou non, apprend qui y est. Les relais voient quand un appel commence. | La vidéo à plus de quatre personnes, par un serveur ; plus de huit personnes. |
| **Groupes publics** | Comme les discussions de groupe, et quiconque a le lien peut demander à rejoindre et lire à partir du moment où il est admis. Les demandes arrivent au relais du propriétaire scellées pour le téléphone du propriétaire : le relais voit combien et quand, pas de qui. Les membres voient les noms choisis, les clés faites pour ce seul groupe, les adresses de relais et les identifiants d’expéditeur de file d’attente les uns des autres. Pas audité. | |
| **Aperçus des liens** | Désactivés sauf si tu les actives. Alors, quand tu envoies un lien, ton téléphone récupère sa page directement depuis le site, qui voit ton adresse IP et quand, pas à qui le message est destiné. L’aperçu va dans le message chiffré ; le téléphone qui le reçoit ne récupère rien. Aucun tant que l’espace passe par Tor ; dans les discussions masquées, seulement avec l’interrupteur propre à leur emplacement. | Des aperçus par Tor. |

## Transparence {#transparency}

Ce que garde le serveur derrière Erevos (lphl.nekten.eu), et ce qui lui a été demandé. Cette page est livrée dans chaque
version, donc elle est signée avec la version, comme l’appli.

**Demandes des autorités.** À la date de cette version : aucune. Aucune autorité, aucun tribunal ni aucune entreprise
n’a demandé de données sur quiconque utilise Erevos, et personne n’a été prié de garder le silence sur une telle
demande. Si ce paragraphe disparaît un jour, ou ne dit plus « aucune », prends-le comme un signe. **Pourquoi :** une
demande accompagnée d’un ordre de garder le silence ne peut pas être dite, mais une phrase qui cesse d’être écrite peut
se remarquer. Cela ne fonctionne que tant qu’elle est renouvelée : chaque version la redit.

Ce que le relais garde, et pendant combien de temps :

| Quoi | Pendant combien de temps |
| --- | --- |
| **Les messages qui attendent**, chiffrés de bout en bout | Jusqu’à ce qu’ils soient pris, 14 jours au plus. |
| **Photos et fichiers**, chiffrés, en morceaux | Comme les messages : jusqu’à ce qu’ils soient pris, 14 jours au plus. |
| **Messages envoyés pour plus tard**, chiffrés | Jusqu’à ce que leur heure vienne. |
| **Files d’attente**, des identifiants aléatoires sans nom | Jusqu’à ce que leur téléphone ne les ait pas utilisées pendant 180 jours. |
| **Lignes d’accès** : pour chaque téléphone, le SHA-256 de son jeton et un nom : celui qu’a tapé la personne qui l’a invité, ou le nom d’utilisateur LPHL pour ceux qui se sont connectés avec LPHL | Jusqu’à ce que la ligne soit retirée, ou que la ligne qui l’a invité disparaisse. |
| **Adresses de push de l’app web**, pour les notifications quand l’app web est fermée | Jusqu’à leur désactivation dans l’app web. |

Ce qu’il ne garde pas :

- **Aucune liste des connexions.** Le relais n’écrit aucun journal de qui s’est connecté ni quand, et le serveur web
  devant le relais et l’app web ne garde aucun journal d’accès depuis le 24 octobre 2026. Les erreurs sont journalisées,
  et une erreur peut nommer une adresse.
- **Aucun contact, nom ou numéro de téléphone.** Il n’en a aucun à garder.

Ce qu’il voit quand même pendant qu’il fonctionne : les adresses IP qui se connectent, quand les messages arrivent et
partent, et leur taille, comme le dit [Ce qui est protégé aujourd’hui](#privacy). Pendant un appel par le relais
d’appel, les adresses IP des téléphones qui y sont.

**Copies.** Le dossier du relais est sauvegardé chaque jour, avec les messages en attente toujours chiffrés de bout en
bout. Les copies contiennent ce que liste le tableau ci-dessus, aussi longtemps qu’elles sont gardées.

**D’autres qui voient quelque chose :** l’hébergeur (Hetzner), qui fait tourner la machine et son réseau ; le service de
connexion de LPHL (Authentik), qui voit chaque connexion avec LPHL ; et pour l’app web avec les notifications quand elle
est fermée, le service push du navigateur (Apple, Google ou Mozilla), qui voit qu’une notification est arrivée, jamais
quoi.

## Licence {#licence}

**Erevos, by azzinder.** Copyright © 2026 azzinder.

Erevos est un logiciel libre, sous la GNU Affero General Public License, version 3 ou toute version ultérieure
(AGPL-3.0-or-later) : chacun peut l’utiliser, l’étudier, le partager et le modifier. Quiconque partage Erevos, modifié
ou non, ou fait tourner un Erevos modifié pour d’autres à travers un réseau, doit respecter cette licence et partager
le code source de sa version avec ceux qui la reçoivent.

### Conditions supplémentaires

Selon la section 7 de la licence, ces conditions s’appliquent aussi à Erevos :

- **Le nom de l’auteur.** Les copies et les versions modifiées gardent la mention « Erevos, by azzinder » dans la partie
  À propos d’Erevos de l’app, [Ce qu’est Erevos](#about).
- **Une version modifiée le dit.** Elle dit clairement qu’elle est modifiée, et ne se présente pas comme l’Erevos
  d’origine.
- **Le nom et le logo.** La licence ne donne aucun droit sur le nom « Erevos » ni sur son logo : une version modifiée
  qui est donnée à d’autres prend un autre nom.

### Aucune garantie

Erevos est donné dans l’espoir qu’il sera utile, mais **sans aucune garantie** : pas même celle qu’il puisse être vendu
ou qu’il convienne à un usage particulier. La licence en dit plus.

### Qui l’a fait

Erevos est fait par **ingénierie agentique dirigée par l’humain (human-directed agentic engineering)** : azzinder fixe
la conception, les contraintes, ce que chaque changement doit faire et quand il est terminé ; les outils d’IA écrivent,
lancent les vérifications et corrigent.

Erevos est conçu, dirigé et maintenu par azzinder, qui a choisi ses fonctions et leur façon de marcher, son modèle de
sécurité et sa structure, le teste sur de vrais appareils et décide de ce qui entre dans chaque version. Des outils d’IA
ont été largement utilisés pour écrire le code et les textes, toujours sur les instructions et d’après la conception
d’azzinder.

Les parties faites par d’autres gardent leurs propres auteurs et leurs propres licences, voir
[Fait avec l’open source des autres](#about). Les textes complets viennent avec le code source d’Erevos :
\`AUTHORS.md\`, \`CREDITS.md\` et le dossier \`LICENSES\`. La licence elle-même est sur
[gnu.org](https://www.gnu.org/licenses/agpl-3.0.html).

**Pourquoi :** une licence libre ne te protège que si tu peux la lire. Elle dit ce que tu peux faire avec Erevos, et ce
que te doit quiconque le modifie.

Cette partie s’ouvre aussi depuis **Réglages** → **Général** → **Licence**.

## Ce qui arrive {#coming}

Le chiffrement de bout en bout est là, par le relais et par la liaison à proximité, et la plupart de ce qui suit repose
dessus.

- **Plus de façons de rester en contact :** les ponts Tor, pour là où Tor est bloqué, sont là, voir [Par Tor](#tor).
  Ensuite : Tor sur un ordinateur.
  - **Radios LoRa (Meshtastic) :** c’est là, voir [Par une radio LoRa](#lora). Ensuite : régler le nom de la radio
    depuis Erevos.
  - **SMS :** Erevos comme appli SMS est là, avec les photos MMS, les MMS de groupe et deux SIM, voir [SMS](#sms).
  - **Téléphone :** Erevos comme appli de téléphone est là, avec son propre écran d’appel, voir [Téléphone](#phone).
  - **E-mail, codes QR, USB, NFC :** pour quand rien d’autre ne passe.
- **Appels :** les appels vocaux et vidéo sont là, et sur Android ils sonnent en arrière-plan, voir [Discuter par un
  relais](#relay), et il y a aussi un talkie-walkie qui fonctionne même par Bluetooth.
- **Groupes :** les discussions de groupe, avec photos, fichiers et messages vocaux, et les appels vocaux et vidéo de
  groupe sont là, voir [Discussions de groupe](#groups). Ensuite : la vidéo à plus de quatre personnes, par un serveur
  vers lequel l’appel passe de lui-même, toujours chiffrée de bout en bout.
- **Amener tes discussions :** Telegram et WhatsApp entrent déjà, avec leurs photos et fichiers, et Viber avec ses mots,
  voir [Discussions importées](#import). Ensuite : les photos et fichiers de Viber.
- **Plus de systèmes :** les groupes publics et les appels de groupe sur les appareils associés aussi ; le compte, ses
  appels et ses groupes sont déjà sur un ordinateur, voir [Appareils associés](#devices). Linux, macOS et Windows sont
  là, voir [Sur un ordinateur](#desktop), l’iPhone depuis le navigateur, voir [Sur un iPhone](#iphone), et Sailfish OS,
  voir [Sur Sailfish OS](#sailfish) ; et les sauvegardes aussi, voir [Sauvegardes](#backup).

## Questions {#faq}

### J’ai oublié mon mot de passe.

Il n’y a aucun moyen de le récupérer. Erevos ne garde rien qui pourrait ouvrir tes données sans lui. Seulement si le
déverrouillage par [empreinte digitale ou visage](#lock) est activé, il ouvre encore le premier espace : définis-y un
nouveau mot de passe avec **Changer le mot de passe**.

### Un contact qui est à proximité n’affiche jamais « À proximité ».

- Écris-lui : les téléphones apprennent qui est qui grâce au premier message qui arrive à proximité. Seuls les contacts
  sont trouvés, alors ajoutez-vous d’abord l’un l’autre.
- Garde un espace ouvert sur les deux téléphones : Erevos à l’écran, ou en arrière-plan avec **En arrière-plan** sur
  **Recevoir et sonner**.
- Vérifie que le Bluetooth est activé (et, sur Android 12 et plus ancien, la localisation), et qu’Erevos a le droit de
  trouver les appareils à proximité (paramètres d’Android → Applications → Erevos → Autorisations).
- Rapproche les téléphones. Si l’un d’eux n’a pas de Wi-Fi Aware, ils se rencontrent par Bluetooth, qui est plus lent à
  démarrer.
- Ou connecte les deux au même Wi-Fi, ou au point d’accès d’un des téléphones, avec **Trouver Erevos sur le même Wi-Fi**
  activé. Certains Wi-Fi publics tiennent les appareils connectés à l’écart les uns des autres : là, cela ne peut pas
  fonctionner. Sans Wi-Fi en commun, **Créer un Wi-Fi avec les téléphones à proximité** les laisse en créer un (Android
  10 et plus récent) ; laisse-lui jusqu’à une minute ou deux.

### Rien n’arrive par LoRa.

- Les deux radios ont besoin de la même région et du même premier canal (son nom et sa clé) dans l’appli Meshtastic, et
  d’être à portée l’une de l’autre, ou de radios entre elles.
- **Radio LoRa**, sous **Réglages** → **Relais et réseaux**, doit indiquer **Connecté**. Sinon, ferme l’appli
  Meshtastic : une radio ne se relie qu’à une appli à la fois.
- Seuls les textes passent, et seulement quand le relais est injoignable et qu’aucun téléphone n’est proche.
- Dans l’UE, une radio ne peut émettre qu’une quantité limitée chaque heure : après beaucoup de messages, elle attend.

### Un code de contact n’a pas été ajouté.

Un contact sur un autre relais a besoin d’un lien avec la clé de ce relais, ce qu’ont les liens d’un Erevos à jour : la
ligne sous la discussion nomme ce relais. Un code d’un Erevos plus ancien n’a pas de clés et est refusé : demandes-en un
nouveau.

### Le relais peut-il lire mes messages ?

Non. Les messages par un relais sont chiffrés de bout en bout, et seuls les deux téléphones ont les clés. Le relais voit
quand même quelles files d’attente sont utilisées, et quand et combien arrive ([Faire tourner ton propre
relais](#own-relay)). Compare le numéro de sécurité, comme dans [Discuter par un relais](#relay), pour être sûr que
personne n’est entre les deux. Rien n’a encore été audité.

### Pourquoi Erevos ne demande-t-il pas mon numéro de téléphone ?

Parce que rien n’en a besoin. Chaque contact est une paire de files d’attente à sens unique sur un relais, donc aucun
serveur ne détient une liste de qui connaît qui.

### Est-ce que ça marche sur un iPhone ou un ordinateur ?

Sur un ordinateur, oui : Linux, macOS et Windows, voir [Sur un ordinateur](#desktop). Sur un iPhone, oui, depuis le
navigateur, comme app web, voir [Sur un iPhone](#iphone).
`;
