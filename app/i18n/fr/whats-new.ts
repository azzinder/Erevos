// The French of What's new, what each version changed (lib/whats-new.ts, app/whats-new.tsx) (i18n/fr/index.ts).
export const whatsNew: Record<string, string> = {
  "What's new": 'Nouveautés',
  'What each version changed': 'Ce que chaque version a changé',
  'What each version of Erevos changed, the newest first.': 'Ce que chaque version d’Erevos a changé, la plus récente en premier.',
  'Not out yet': 'Pas encore sortie',
  'This version': 'Cette version',
  // Not out yet.
  // 3.4.1
  '**Send answers at once**: a short buzz as you press it, the field empties and the message shows, marked Sending…, so it never goes twice.':
    '**Envoyer réagit aussitôt** : une courte vibration à l’appui, le champ se vide et le message apparaît, marqué Envoi…, si bien qu’il ne part jamais deux fois.',
  '**The screen no longer stays pushed up** after the keyboard closed behind a sheet, a dialog or another app.':
    '**L’écran ne reste plus remonté** après que le clavier s’est fermé derrière un panneau, une boîte de dialogue ou une autre app.',
  '**Importing a chat with its photos no longer freezes Erevos**: the screen moves while the files come in, says what share of them is in, and **Cancel** stops it. A chat moved into hidden chats takes the chats imported into it along. See [Imported chats](#import).':
    '**Importer une discussion avec ses photos ne fige plus Erevos** : l’écran reste vivant pendant l’arrivée des fichiers, dit quelle part en est arrivée, et **Annuler** l’arrête. Une discussion déplacée dans les discussions cachées emporte les discussions importées dedans. Voir [Discussions importées](#import).',
  // 3.4.0
  '**Your relay proves its own key**: every connection to it starts with a check only the relay holding that key can pass, so no one in between can pass for it. Once it has, Erevos never reaches it without the check. Your relay needs an update for it.':
    '**Ton relais prouve sa propre clé** : chaque connexion commence par une vérification que seul le relais qui détient cette clé peut réussir, donc personne entre les deux ne peut se faire passer pour lui. Une fois qu’il l’a prouvée, Erevos ne le joint plus jamais sans cette vérification. Ton relais doit être mis à jour pour cela.',
  '[Transparency](#transparency), a new part of the guide: what the server behind Erevos keeps and for how long, what it does not keep, and who else sees something.':
    '[Transparence](#transparency), une nouvelle partie du guide : ce que le serveur derrière Erevos garde et combien de temps, ce qu’il ne garde pas, et qui d’autre voit quelque chose.',
  "**What's new**: this list, in Settings → General, by version.": '**Nouveautés** : cette liste, dans Réglages → Général, par version.',
  "**Nothing shows behind a chat's PIN**: none of the messages of a chat locked with a PIN is drawn until its PIN is typed, and with glass, a wallpaper or a style's own scene, the PIN screen is a dense frost that lets nothing through.":
    "**Rien ne se voit derrière le code PIN d’une discussion** : aucun message d’une discussion verrouillée par un code PIN n’est affiché avant que son code PIN soit saisi, et avec le verre, un fond d’écran ou un style qui dessine sa propre scène, l’écran du code PIN est un givre dense qui ne laisse rien voir.",
  "**A group video call from the top of the group**: a blue camera beside the green handset, as in a contact's chat.":
    "**Un appel vidéo de groupe en haut du groupe** : une caméra bleue à côté du combiné vert, comme dans la discussion avec un contact.",
  "**A relay queue for each contact**: each contact writes to a queue only they know, so the relay cannot tell that two contacts write to the same phone, and deleting or blocking someone deletes only theirs. Your relay needs an update for it.":
    "**Une file du relais pour chaque contact** : chaque contact écrit dans une file que lui seul connaît, si bien que le relais ne peut pas savoir que deux contacts écrivent au même téléphone, et supprimer ou bloquer quelqu’un n’efface que la sienne. Votre relais doit être mis à jour pour cela.",
  "**Hidden chats, more like the others**: they close after 30 seconds in the background, not at once, and never during a call or while you pick a photo or a file; while open, a message plays its sound, and link previews have a switch of their own there. See [Hidden chats](#hidden).":
    "**Les discussions masquées, plus comme les autres** : elles se ferment après 30 secondes en arrière-plan, pas tout de suite, et jamais pendant un appel ni pendant que vous choisissez une photo ou un fichier ; ouvertes, un message joue son son, et les aperçus de liens y ont leur propre interrupteur. Voir [Discussions masquées](#hidden).",
  "**Hidden chats that receive while closed**: a switch at the top of each place, on for new places, has them receive as your other chats do: their contacts see at once that a message came, a notice says only \"New message\", and a call rings with no name. See [Hidden chats](#hidden).":
    "**Des discussions masquées qui reçoivent une fois fermées** : un interrupteur en haut de chaque emplacement, activé pour les nouveaux, les fait recevoir comme vos autres discussions : leurs contacts voient aussitôt qu’un message est arrivé, une notification dit seulement « Nouveau message », et un appel sonne sans nom. Voir [Discussions masquées](#hidden).",
  "**Hidden chats wait and import too**: what cannot go now waits, marked Waiting, and goes by itself through their relay; Send later works there as in your other chats; and a chat from Telegram, WhatsApp or Viber can be imported into a hidden chat, kept only there. See [Hidden chats](#hidden).":
    "**Les discussions masquées attendent et importent aussi** : ce qui ne peut pas partir maintenant attend, marqué « En attente », et part tout seul par leur relais ; « Envoyer plus tard » y fonctionne comme dans vos autres discussions ; et une discussion de Telegram, WhatsApp ou Viber peut être importée dans une discussion masquée, gardée là seulement. Voir [Discussions masquées](#hidden).",
  "**Hidden chats listed like your chats**: they open on a list as the home screen's, with what was said last and how many are not read, and each place has a Chat with myself of its own at its top. See [Hidden chats](#hidden).":
    "**Les discussions masquées en liste comme vos discussions** : elles s'ouvrent sur une liste comme celle de l'écran d'accueil, avec ce qui a été dit en dernier et combien ne sont pas lus, et chaque emplacement a en haut sa propre Discussion avec moi-même. Voir [Discussions masquées](#hidden).",
  "**More in hidden chats**: with Receive while closed on, what comes to them through Nostr is read while they are closed too; and there a contact can be added from a photo of their QR code, and a hidden contact given a photo. See [Hidden chats](#hidden).":
    "**Plus dans les discussions masquées** : avec Recevoir une fois fermées, ce qui leur arrive par Nostr est lu aussi pendant qu'elles sont fermées ; et on peut y ajouter un contact depuis une photo de son code QR, et donner une photo à un contact masqué. Voir [Discussions masquées](#hidden).",
  "**Hidden chats with no relay**: as your other chats, they can begin through Nostr only: their contact link and QR code say where they read there, and texts and reactions go there. See [Hidden chats](#hidden).":
    "**Discussions masquées sans relais** : comme vos autres discussions, elles peuvent commencer par Nostr seul : leur lien de contact et leur code QR disent où elles lisent là-bas, et les textes et réactions y vont. Voir [Discussions masquées](#hidden).",
  "**Groups in hidden chats**: under their list, New group makes a group with their contacts; it lists among their chats, goes through their relay only, and is read while they are closed if Receive while closed is on. See [Hidden chats](#hidden).":
    "**Groupes dans les discussions masquées** : sous leur liste, Nouveau groupe crée un groupe avec leurs contacts ; il figure parmi leurs discussions, passe par leur relais seul, et est lu pendant qu'elles sont fermées si Recevoir une fois fermées est activé. Voir [Discussions masquées](#hidden).",
  "**No test version line**: the home screen no longer ends saying this is a test version. The guide still says exactly what is protected, and that nothing has been audited yet. See [What is protected today](#privacy).":
    "**Plus de ligne « version de test »** : l'écran d'accueil ne se termine plus en disant que c'est une version de test. Le guide dit toujours exactement ce qui est protégé, et que rien n'a encore été audité. Voir [Ce qui est protégé aujourd'hui](#privacy).",
  "**The contacts menu in hidden chats**: their Contacts has a menu again, with what is theirs only: a .vcf file imported into them, their contacts saved as a .vcf file, and a contact's QR code read from a photo. An Erevos ID typed there adds them to the hidden chats. See [Contacts](#contacts).":
    "**Le menu des contacts dans les discussions masquées** : leurs Contacts ont de nouveau un menu, avec seulement ce qui est à elles : un fichier .vcf importé chez elles, leurs contacts enregistrés en fichier .vcf, et le code QR d’un contact lu sur une photo. Un identifiant Erevos saisi là ajoute la personne aux discussions masquées. Voir [Contacts](#contacts).",
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
  "**Two new sticker sets of 24 moods**: **Tux**, the Linux penguin as he is drawn, and **Aikido**, an aikidoka in keikogi and a wide hakama, who also bows, sits in seiza and rolls.":
    "**Deux nouvelles séries d'autocollants de 24 humeurs** : **Tux**, le manchot de Linux tel qu'il est dessiné, et **Aïkido**, un aïkidoka en keikogi et large hakama, qui salue aussi, s'assoit en seiza et fait une roulade.",
};
