// The French of What's new, what each version changed (lib/whats-new.ts, app/whats-new.tsx) (i18n/fr/index.ts).
export const whatsNew: Record<string, string> = {
  "What's new": 'Nouveautés',
  'What each version changed': 'Ce que chaque version a changé',
  'What each version of Erevos changed, the newest first.': 'Ce que chaque version d’Erevos a changé, la plus récente en premier.',
  'Not out yet': 'Pas encore sortie',
  'This version': 'Cette version',
  // Not out yet.
  '**Your relay proves its own key**: every connection to it starts with a check only the relay holding that key can pass, so no one in between can pass for it. Once it has, Erevos never reaches it without the check. Your relay needs an update for it.':
    '**Ton relais prouve sa propre clé** : chaque connexion commence par une vérification que seul le relais qui détient cette clé peut réussir, donc personne entre les deux ne peut se faire passer pour lui. Une fois qu’il l’a prouvée, Erevos ne le joint plus jamais sans cette vérification. Ton relais doit être mis à jour pour cela.',
  '[Transparency](#transparency), a new part of the guide: what the server behind Erevos keeps and for how long, what it does not keep, and who else sees something.':
    '[Transparence](#transparency), une nouvelle partie du guide : ce que le serveur derrière Erevos garde et combien de temps, ce qu’il ne garde pas, et qui d’autre voit quelque chose.',
  "**What's new**: this list, in Settings → General, by version.": '**Nouveautés** : cette liste, dans Réglages → Général, par version.',
  "**Nothing shows behind a chat's PIN**: none of the messages of a chat locked with a PIN is drawn until its PIN is typed, and with glass, a wallpaper or a style's own scene, the PIN screen is a dense frost that lets nothing through.":
    "**Rien ne se voit derrière le code PIN d’une discussion** : aucun message d’une discussion verrouillée par un code PIN n’est affiché avant que son code PIN soit saisi, et avec le verre, un fond d’écran ou un style qui dessine sa propre scène, l’écran du code PIN est un givre dense qui ne laisse rien voir.",
  "**A group video call from the top of the group**: a blue camera beside the green handset, as in a contact's chat.":
    "**Un appel vidéo de groupe en haut du groupe** : une caméra bleue à côté du combiné vert, comme dans la discussion avec un contact.",
  // 3.3.2
  '**The plain call button for more contacts**: the orange keypad at the top of a contact’s chat also takes the number of a contact you connected them to (**Connect to one of my contacts**), the mobile number first.':
    '**Le bouton d’appel mobile pour plus de contacts** : le clavier orange en haut de la discussion d’un contact prend aussi le numéro du contact auquel tu l’as associé (**Associer à un de mes contacts**), le mobile en premier.',
  // 3.3.1
  '**Viber chats can be imported**: from the HTML file of the Android app Backup Text for Viber, words only.':
    '**Les discussions Viber s’importent** : depuis le fichier HTML de l’app Android Backup Text for Viber, le texte seulement.',
  // 3.3.0
  '**Start without a relay, through Nostr**: **Start without a relay** on New chat. Texts, stickers, reactions, edits and the delivered and read marks go through Nostr over Tor. Photos, voice messages, files and calls still need a relay or a phone nearby.':
    '**Commencer sans relais, par Nostr** : **Commencer sans relais** dans Nouvelle discussion. Les textes, stickers, réactions, modifications et les marques « arrivé » et « lu » passent par Nostr via Tor. Les photos, messages vocaux, fichiers et appels ont encore besoin d’un relais ou d’un téléphone à proximité.',
  '**The relay comes by itself**: whoever has a relay that invites sends a contact with no relay an invite once, inside the chat, and the other phone takes it by itself.':
    '**Le relais vient tout seul** : qui a un relais qui invite envoie une fois une invitation à un contact sans relais, dans la discussion, et l’autre téléphone l’accepte tout seul.',
  '**Told when a new version is out** (Android): once a day Erevos asks LPHL’s server, then shows a pinned Erevos row and a notice, only for a version the release computer signed. It turns off in Settings → General → Updates.':
    '**Prévenu quand une nouvelle version sort** (Android) : une fois par jour, Erevos demande au serveur de LPHL, puis affiche une ligne Erevos épinglée et une notification, seulement pour une version signée par l’ordinateur des versions. Cela se désactive dans Réglages → Général → Mises à jour.',
  '**Lock a chat with a PIN**: Details → Lock with a PIN, for chats and groups. Nothing of it shows in search, starred messages or imports. In hidden chats it asks for no PIN.':
    '**Verrouiller une discussion par un code PIN** : Détails → Verrouiller par un code PIN, pour les discussions et les groupes. Rien n’en apparaît dans la recherche, les messages avec étoile ni les importations. Dans les discussions masquées, aucun code PIN n’est demandé.',
  '**A new handset** on the green tiles: Phone, and the call in a chat.': '**Un nouveau combiné** sur les tuiles vertes : Téléphone, et l’appel dans une discussion.',
  '**A new New chat screen**: How you connect now at the top, three large cards for a phone without a relay (I have an invite, Sign in with LPHL, Start without a relay), and the technical part under For advanced users.':
    '**Un nouvel écran Nouvelle discussion** : « Comment tu te connectes maintenant » en haut, trois grandes cartes pour un téléphone sans relais (J’ai une invitation, Se connecter avec LPHL, Commencer sans relais), et la partie technique sous « Pour les utilisateurs avancés ».',
  '**Nostr steadier through Tor**: each Nostr relay has its own way through Tor, and after a failure it tries a new exit. A clearer error on the Nostr screen.':
    '**Nostr plus stable via Tor** : chaque relais Nostr a son propre chemin dans Tor, et après un échec il essaie une nouvelle sortie. Une erreur plus claire sur l’écran Nostr.',
  '**When the connection to the relay drops** while Erevos waits on it, Erevos notices and connects again, where it stayed stuck before.':
    '**Quand la connexion au relais tombe** pendant qu’Erevos l’attend, Erevos s’en rend compte et se reconnecte, là où il restait bloqué avant.',
  '**Invite by SMS** (Android): on a phone contact’s card, for one person, for 2 days. The link opens a page that offers Erevos (the APK for Android, the web app for an iPhone or a computer), then opens the invite. The QR code and Share the invite stay as they were.':
    '**Inviter par SMS** (Android) : sur la fiche d’un contact du téléphone, pour une personne, pendant 2 jours. Le lien ouvre une page qui propose Erevos (l’APK pour Android, l’app web pour un iPhone ou un ordinateur), puis ouvre l’invitation. Le code QR et « Partager l’invitation » restent comme avant.',
  '**Fixes to the SMS invite**: a link copied as /i/#… works too, an older web app opens the invite as well, and on iOS 26 it says Share is under •••.':
    '**Corrections de l’invitation par SMS** : un lien copié sous la forme /i/#… marche aussi, une app web plus ancienne ouvre elle aussi l’invitation, et sous iOS 26 elle indique que Partager est dans •••.',
  '**A phone call button** in Erevos chats and SMS chats.': '**Un bouton d’appel téléphonique** dans les discussions Erevos et les discussions SMS.',
  // 3.2.1
  '**Edit a message** you sent, up to a day after: to contacts, groups and linked devices, with Edited beside the time.':
    '**Modifier un message** envoyé, jusqu’à un jour après : pour les contacts, les groupes et les appareils associés, avec « Modifié » à côté de l’heure.',
  '**Nostr says what it did**: Sent through Nostr, and on the Nostr screen what each relay did last.':
    '**Nostr dit ce qu’il a fait** : « Envoyé par Nostr », et sur l’écran Nostr ce que chaque relais a fait en dernier.',
  '**Coloured call buttons** at the top of a chat: video blue, voice green.': '**Des boutons d’appel en couleur** en haut d’une discussion : vidéo en bleu, voix en vert.',
  // 3.2.0
  'Arrows to the start and the end of a chat; earlier messages come by themselves as you scroll.':
    'Des flèches vers le début et la fin d’une discussion ; les messages plus anciens arrivent tout seuls quand tu fais défiler.',
  'Chats imported from Telegram and WhatsApp look like Erevos messages: bubbles, days, photos, voice messages, search.':
    'Les discussions importées de Telegram et WhatsApp ressemblent aux messages Erevos : bulles, jours, photos, messages vocaux, recherche.',
  'Dogs instead of cats in the stickers.': 'Des chiens au lieu des chats dans les stickers.',
  'Screenshots: a switch in Settings → Privacy and security.': 'Captures d’écran : un interrupteur dans Réglages → Confidentialité et sécurité.',
  'Hidden chats from New chat: hold it for a second.': 'Les discussions masquées depuis Nouvelle discussion : reste appuyé une seconde dessus.',
  'Coloured tiles on the home screen: Phone green, Contacts violet, the lock orange.': 'Des tuiles en couleur sur l’écran d’accueil : Téléphone en vert, Contacts en violet, le cadenas en orange.',
  '**Chat with myself**, always first, and **Remind me**, the orange bell.': '**Discussion avec moi-même**, toujours en premier, et **Me rappeler**, la cloche orange.',
  '**Media, links and files** in a chat’s Details, with a calendar and Go to a day.':
    '**Médias, liens et fichiers** dans les Détails d’une discussion, avec un calendrier et « Aller à un jour ».',
  'Import a chat from inside the chat: Details → Imported chats.': 'Importer une discussion depuis la discussion elle-même : Détails → Discussions importées.',
  'A closed space can say that a message came while another space is open.': 'Un espace fermé peut signaler qu’un message est arrivé pendant qu’un autre espace est ouvert.',
  'The message menu says when a message went or came through Nostr.': 'Le menu d’un message indique s’il est parti ou arrivé par Nostr.',
  '**Support Erevos**: Liberapay, PayPal, Monero, Bitcoin.': '**Soutenir Erevos** : Liberapay, PayPal, Monero, Bitcoin.',
  'Who makes Erevos and why, in About Erevos; the guide says why everywhere.': 'Qui fait Erevos et pourquoi, dans À propos d’Erevos ; le guide dit partout pourquoi.',
  // 3.1.2
  '**Settings in 8 groups**, with a search: General, Appearance, Notifications, Privacy and security, Relay and networks, Phone and SMS, Data and devices, For testing. The home screen’s ⋯ keeps only the places, and Settings last.':
    '**Les réglages en 8 groupes**, avec une recherche : Général, Apparence, Notifications, Confidentialité et sécurité, Relais et réseaux, Téléphone et SMS, Données et appareils, Pour les tests. Le ⋯ de l’écran d’accueil ne garde que les écrans, et Réglages en dernier.',
  // 3.1.1
  'Check for updates says what stopped an update.': 'Rechercher des mises à jour dit ce qui a bloqué une mise à jour.',
  'Invite someone is not made from a token for all; it asks you to sign in to the relay first.':
    '« Inviter quelqu’un » ne passe plus par un jeton commun ; il te demande d’abord de te connecter au relais.',
  'The relay’s token for all becomes a token of the phone’s own, by itself (needs the relay updated).':
    'Le jeton commun du relais devient tout seul un jeton propre au téléphone (le relais doit être à jour).',
  'A relay that refuses through Tor says why.': 'Un relais qui refuse par Tor dit pourquoi.',
  // 3.1.0
  'Less battery in the background: the relay, Tor and the nearby radios.': 'Moins de batterie en arrière-plan : le relais, Tor et les radios de proximité.',
  'Erevos no longer closes when you make a sticker from a photo.': 'Erevos ne se ferme plus quand tu fais un sticker à partir d’une photo.',
  'Hidden chats’ notices are right.': 'Les notifications des discussions masquées sont justes.',
  'Hidden chats by holding New chat.': 'Les discussions masquées en restant appuyé sur Nouvelle discussion.',
  'A search for contacts on the Phone.': 'Une recherche de contacts dans Téléphone.',
  'New chat shows first how to add a contact.': 'Nouvelle discussion montre d’abord comment ajouter un contact.',
  'A call shows over the screen saver, and the screen wakes.': 'Un appel s’affiche par-dessus l’économiseur d’écran, et l’écran se réveille.',
  'Erevos in other apps’ Share.': 'Erevos dans le menu Partager des autres apps.',
  'A sound for every new message, also while Erevos shows.': 'Un son pour chaque nouveau message, même quand Erevos est à l’écran.',
  'The SMS settings say right what holding does.': 'Les réglages SMS disent correctement ce que fait un appui long.',
  // 3.0.0
  'Each icon opens what it names: Erevos, SMS, Phone, Contacts, the widget.': 'Chaque icône ouvre ce qu’elle indique : Erevos, SMS, Téléphone, Contacts, le widget.',
  '**Messages through Tor by default**: Messages, Everything or Nothing.': '**Les messages par Tor par défaut** : Messages, Tout ou Rien.',
  '**Texts through Nostr**: three public relays, through Tor, with your own relay as backup after 5 minutes.':
    '**Les textes par Nostr** : trois relais publics, par Tor, avec ton propre relais en secours après 5 minutes.',
  // 2.0.3
  'One invite for everything: the relay and the contact together.': 'Une seule invitation pour tout : le relais et le contact ensemble.',
  'Spam rules for senders and numbers abroad, with the reason.': 'Des règles anti-spam pour les expéditeurs et les numéros de l’étranger, avec la raison.',
  '480 stickers in 20 sets.': '480 stickers en 20 séries.',
  'Lighter chats on older phones; QR codes at once.': 'Des discussions plus légères sur les anciens téléphones ; les codes QR tout de suite.',
  'Copy code for one-time codes in SMS.': '« Copier le code » pour les codes à usage unique dans les SMS.',
  'Locked, Erevos keeps receiving.': 'Verrouillé, Erevos continue de recevoir.',
  'Faster contacts; the hidden chats’ notice counts only messages.': 'Des contacts plus rapides ; la notification des discussions masquées ne compte que les messages.',
  'The relay tries every address: push, other relays, the LPHL sign-in.': 'Le relais essaie chaque adresse : push, autres relais, la connexion LPHL.',
  // 2.0.2
  'Swiping on the tabs only changes the tab.': 'Glisser sur les onglets ne fait que changer d’onglet.',
  'The icons fill the launcher’s shape.': 'Les icônes remplissent la forme du lanceur.',
  // 2.0.1
  'Coloured icons (Erevos red, Phone green, SMS blue, Contacts violet) and a new SMS icon.':
    'Des icônes en couleur (Erevos en rouge, Téléphone en vert, SMS en bleu, Contacts en violet) et une nouvelle icône SMS.',
  'A colour for each icon, and the order of the widget’s buttons.': 'Une couleur pour chaque icône, et l’ordre des boutons du widget.',
  'Swipe to go back, and between tabs.': 'Glisser pour revenir en arrière, et entre les onglets.',
  // 2.0.0
  'An update of the WebView no longer closes Erevos.': 'Une mise à jour de la WebView ne ferme plus Erevos.',
  'Deleting or blocking a contact gives you a new queue on the relay.': 'Supprimer ou bloquer un contact te donne une nouvelle file d’attente sur le relais.',
  'A new contact can take the name of a contact on the phone.': 'Un nouveau contact peut prendre le nom d’un contact du téléphone.',
  '**Sign in to the relay with LPHL**, and **invites to the relay**.': '**Se connecter au relais avec LPHL**, et **les invitations au relais**.',
  'Permissions in the web app, and more on Android; the web app’s notice says how many came.':
    'Des autorisations dans l’app web, et davantage sur Android ; la notification de l’app web dit combien de messages sont arrivés.',
  'Hidden chats can ring calls while they are closed.': 'Les discussions masquées peuvent faire sonner les appels quand elles sont fermées.',
  'New keys every month in chats, every week in groups.': 'De nouvelles clés chaque mois dans les discussions, chaque semaine dans les groupes.',
  'Linked devices work with the phone off.': 'Les appareils associés fonctionnent téléphone éteint.',
  'A new chat screen; QR codes from a photo; the Phone for small screens.': 'Un nouvel écran de discussion ; les codes QR depuis une photo ; Téléphone pour les petits écrans.',
  'Add as contact inside a group.': '« Ajouter comme contact » dans un groupe.',
  'Stickers in sets, moving, and your own.': 'Des stickers en séries, animés, et les tiens.',
  'SMS inside the Erevos chat.': 'Les SMS dans la discussion Erevos.',
  'Android updates need the release computer’s signature.': 'Les mises à jour Android exigent la signature de l’ordinateur des versions.',
  'An F-Droid build; Serbo-Croatian; new version numbers.': 'Une version F-Droid ; le serbo-croate ; de nouveaux numéros de version.',
  'Much for security: Argon2id, messages encrypted for the relay too, a token for each phone, no link starts a call.':
    'Beaucoup pour la sécurité : Argon2id, des messages chiffrés aussi pour le relais, un jeton pour chaque téléphone, aucun lien ne lance d’appel.',
  // 0.1.16
  'Imports from Telegram and WhatsApp bring photos, videos, voice messages and files.': 'Les importations depuis Telegram et WhatsApp apportent photos, vidéos, messages vocaux et fichiers.',
  'A phone without a relay talks through a place on a contact’s relay.': 'Un téléphone sans relais communique par une place sur le relais d’un contact.',
  // 0.1.14
  'Back to my chats, for hidden chats.': '« Retour à mes discussions », pour les discussions masquées.',
  'Erevos receives and rings even after you swipe it away from the recent apps.': 'Erevos reçoit et sonne même une fois balayé hors des applis récentes.',
  // 0.1.12
  'Hidden chats can say a message came.': 'Les discussions masquées peuvent signaler qu’un message est arrivé.',
  'Fixes: menus, QR codes from a photo, Bluetooth on Android 17, long lists.': 'Corrections : menus, codes QR depuis une photo, Bluetooth sous Android 17, longues listes.',
  // 0.1.11
  'The Phone without the password, if you allow it; a home screen widget; an SMS and Erevos filter.':
    'Téléphone sans le mot de passe, si tu l’autorises ; un widget pour l’écran d’accueil ; un filtre SMS et Erevos.',
  // 0.1.10
  'Links wait for the password; Phone and Contacts icons; the Erevos ID on a contact.': 'Les liens attendent le mot de passe ; les icônes Téléphone et Contacts ; l’ID Erevos sur un contact.',
  // 0.1.8
  '61 new features: 5 new languages, linked devices, public groups, replies, reactions, polls, send later, Erevos as the phone and contacts app, Tor bridges, the fingerprint, Windows and more.':
    '61 nouvelles fonctions : 5 nouvelles langues, appareils associés, groupes publics, réponses, réactions, sondages, envoi différé, Erevos comme app de téléphone et de contacts, ponts Tor, l’empreinte digitale, Windows et plus encore.',
  // 0.1.7 to 0.1.2
  'SMS notices in the background.': 'Les notifications SMS en arrière-plan.',
  'The web app comes out with every release.': 'L’app web sort avec chaque version.',
  'Greek in the whole app.': 'Le grec dans toute l’app.',
  'Web Push in the web app.': 'Web Push dans l’app web.',
  'The first signed Android release: encrypted chats, calls, groups, hidden chats, backups, imports, and phones nearby without the internet.':
    'La première version Android signée : discussions chiffrées, appels, groupes, discussions masquées, sauvegardes, importations, et téléphones à proximité sans internet.',
};
