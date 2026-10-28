// The French of What's new, what each version changed (lib/whats-new.ts, app/whats-new.tsx) (i18n/fr/index.ts).
export const whatsNew: Record<string, string> = {
  "What's new": 'Nouveautés',
  'What each version changed': 'Ce que chaque version a changé',
  'What each version of Erevos changed, the newest first.': 'Ce que chaque version d’Erevos a changé, la plus récente en premier.',
  'Not out yet': 'Pas encore sortie',
  'This version': 'Cette version',
  'For you': 'Pour toi',
  'Under the hood': 'Sous le capot',
  // Not out yet.
  '**What\'s new in two parts**: each version says first what changes for you, then what changed under the hood: fixes, speed, battery and security inside. See [Updates](#updates).':
    '**Les nouveautés en deux parties** : chaque version dit d’abord ce qui change pour toi, puis ce qui a changé sous le capot : corrections, vitesse, batterie et sécurité à l’intérieur. Voir [Mises à jour](#updates).',
  '**A contact\'s SMS no longer stay counted as new**: opening their chat reads all of them, the earlier ones too, not only those that show.':
    '**Les SMS d’un contact ne restent plus comptés comme nouveaux** : ouvrir son chat les lit tous, les plus anciens aussi, pas seulement ceux qui s’affichent.',
  '**A message no longer waits when Tor cannot reach the relay**: with Tor for messages, it goes straight at once, as the Tor settings say. See [Through Tor](#tor).':
    '**Un message n’attend plus quand Tor n’atteint pas le relais** : avec Tor pour les messages, il part aussitôt en direct, comme le disent les réglages de Tor. Voir [Par Tor](#tor).',
  '**Background notices no longer stop after a network change**: when the connection of a wait at the relay died on the way (Wi-Fi to mobile data, the relay restarting), Erevos took the relay for one from before, which cannot wait, for the whole run: contacts\' messages then came up to ten minutes late, and hidden chats, closed spaces and hidden rings said nothing until Erevos was restarted. See [Chat through a relay](#relay).':
    '**Les avis en arrière-plan ne s’arrêtent plus après un changement de réseau** : quand la connexion d’une attente au relais mourait en route (du Wi-Fi aux données mobiles, redémarrage du relais), Erevos prenait le relais pour un ancien, qui ne sait pas attendre, pour toute la session : les messages des contacts arrivaient jusqu’à dix minutes en retard, et les discussions masquées, les espaces fermés et les sonneries masquées ne disaient rien jusqu’au redémarrage d’Erevos. Voir [Discuter par un relais](#relay).',
  '**A call hung up at once no longer rings**: when the hang-up came in the same look as the call, the phone rang 45 seconds for a call nobody was on; the same for a group call its starter left at once. See [Chat through a relay](#relay).':
    '**Un appel raccroché aussitôt ne sonne plus** : quand le raccrochage arrivait dans le même regard que l’appel, le téléphone sonnait 45 secondes pour un appel où personne n’était ; de même pour un appel de groupe que celui qui l’a lancé a quitté aussitôt. Voir [Discuter par un relais](#relay).',
  '**A hidden call rings once**: a place with Receive while closed and a ring queue rang twice for one call, and a call taken while hidden chats were open rang again as they closed. See [Hidden chats](#hidden).':
    '**Un appel masqué sonne une fois** : un lieu avec Recevoir une fois fermées et une file de sonnerie sonnait deux fois pour un appel, et un appel pris pendant que les discussions masquées étaient ouvertes sonnait de nouveau à leur fermeture. Voir [Discussions masquées](#hidden).',
  '**A member\'s contact link no longer says New message**: the answer to an ask from a group only adds the contact, with no notice. See [Group chats](#groups).':
    '**Le lien de contact d’un membre ne dit plus Nouveau message** : la réponse à une demande depuis un groupe ajoute seulement le contact, sans avis. Voir [Discussions de groupe](#groups).',
  '**The birthday notice and the phone\'s incoming call no longer replace each other**: they had the same notice number. See [Contacts](#contacts).':
    '**L’avis d’anniversaire et l’appel entrant du téléphone ne se remplacent plus** : ils avaient le même numéro d’avis. Voir [Contacts](#contacts).',
  '**A closed space tells of its contacts\' messages too**: since each contact writes to a queue of their own, a space that says a message came while another is open told only of group messages and first messages from new contacts. It now asks about its contacts\' queues too, up to 64. See [Chat through a relay](#relay).':
    '**Un espace fermé signale aussi les messages de ses contacts** : comme chaque contact écrit dans sa propre file d’attente, un espace qui signale qu’un message est arrivé pendant qu’un autre est ouvert ne signalait que les messages de groupes et les premiers messages de nouveaux contacts. Il interroge maintenant aussi les files d’attente de ses contacts, jusqu’à 64. Voir [Discuter par un relais](#relay).',
  '**The user guide is in every language of the app**: it shows in the one you chose, and names the buttons as the app shows them. See [Language](#start).':
    '**Le guide d’utilisation est dans toutes les langues de l’app** : il s’affiche dans celle que tu as choisie et nomme les boutons comme l’app les affiche. Voir [Langue](#start).',
  '**Location finds where you are, indoors too**: the phone looks by satellite and by its network at once, a sheet says it is looking, and when nothing is found it says why, with Try again. See [Chat through a relay](#relay).':
    '**Position trouve où tu es, à l’intérieur aussi** : le téléphone cherche par satellite et par son réseau à la fois, une feuille dit qu’il cherche, et si rien n’est trouvé elle dit pourquoi, avec Réessayer. Voir [Discuter par un relais](#relay).',
  '**The web app\'s icon counts what is not read**: on an iPhone, with notifications on for the space, Erevos\'s icon on the home screen shows how many messages are not read, never a hidden chat\'s, unless turned off under Settings → Notifications → Number on the icon. See [On an iPhone](#iphone).':
    '**L’icône de l’app web compte les non-lus** : sur un iPhone, avec les notifications activées pour l’espace, l’icône d’Erevos sur l’écran d’accueil montre combien de messages ne sont pas lus, jamais ceux d’une discussion masquée, sauf si tu l’enlèves dans Réglages → Notifications → Nombre sur l’icône. Voir [Sur un iPhone](#iphone).',
  "**Notifications for each chat**: on Android, mute a chat or a group for 8 hours, a week or always, and give its messages and its calls a sound of their own, or none. See [Chat through a relay](#relay).":
    "**Des notifications pour chaque discussion** : sur Android, mets une discussion ou un groupe en sourdine pendant 8 heures, une semaine ou toujours, et donne à ses messages et à ses appels un son à eux, ou aucun. Voir [Discuter par un relais](#relay).",
  "**A chat locked with its own PIN stays locked**: when its contact's Erevos started a new conversation, as it does about once a month, the chat lost its PIN, and a public group joined again lost its own. See [Hidden chats](#hidden).":
    "**Une discussion verrouillée par son propre code PIN reste verrouillée** : quand l’Erevos du contact commençait une nouvelle conversation, comme il le fait environ une fois par mois, la discussion perdait son code PIN, et un groupe public rejoint à nouveau perdait le sien. Voir [Discussions masquées](#hidden).",
  "**Erevos's icon keeps the number of messages not read, on Android**: leaving Erevos with messages not read, a notice without sound keeps how many until you read them, and the launcher shows it on the icon, as a number or a dot. Settings → Notifications → Number on the icon turns it off. See [Chat through a relay](#relay).":
    "**L’icône d’Erevos garde le nombre de messages non lus, sur Android** : quand tu quittes Erevos avec des messages non lus, une notification sans son garde combien jusqu’à ce que tu les lises, et le launcher l’affiche sur l’icône, comme nombre ou point. Réglages → Notifications → Nombre sur l’icône le désactive. Voir [Discuter par un relais](#relay).",
  "**The web app's notifications, more dependable**: no New message over Erevos while it is open, and a push held back while the phone was offline no longer counts messages you already read (both with your relay updated), every notice sounds in Chrome, Firefox and Edge, they come back by themselves when the browser changes its push address, and Notifications while closed says when the browser blocks them or your relay was not told yet that they are off. See [On an iPhone](#iphone).":
    '**Les notifications de l’app web, plus fiables** : plus de « Nouveau message » par-dessus Erevos quand il est ouvert, et un push retenu pendant que le téléphone était hors ligne ne compte plus les messages que tu as déjà lus (les deux avec ton relais à jour), chaque avis sonne dans Chrome, Firefox et Edge, elles reviennent d’elles-mêmes quand le navigateur change son adresse push, et « Notifications quand l’app est fermée » dit quand le navigateur les bloque ou que ton relais n’a pas encore été prévenu qu’elles sont désactivées. Voir [Sur un iPhone](#iphone).',
  "**Calls ring in the web app, on the computer and on Sailfish OS**: a call that comes while Erevos is open now rings, where only its screen showed, and vibrates where the phone can. On an iPhone it rings once you have touched Erevos, and not on silent. See [On an iPhone](#iphone).":
    "**Les appels sonnent dans l’app web, sur l’ordinateur et sur Sailfish OS** : un appel qui arrive pendant qu’Erevos est ouvert sonne désormais, là où seul son écran s’affichait, et vibre là où le téléphone le peut. Sur un iPhone, il sonne une fois que tu as touché Erevos, et pas en mode silencieux. Voir [Sur un iPhone](#iphone).",
  '**Erevos on a computer keeps running with its window closed**: in the system tray (on a Mac, in the Dock) it goes on receiving, a call rings and brings the window back, and a notification says how many messages are not read, never who or what. Turn it off under Settings → Notifications → In the background. See [On a computer](#desktop).':
    '**Erevos sur un ordinateur continue de tourner fenêtre fermée** : dans la zone de notification (sur un Mac, dans le Dock), il continue de recevoir, un appel sonne et fait revenir la fenêtre, et une notification dit combien de messages ne sont pas lus, jamais de qui ni quoi. À désactiver dans Réglages → Notifications → En arrière-plan. Voir [Sur un ordinateur](#desktop).',
  "**Erevos on Sailfish OS tells of messages and calls while it is closed**: while it is out of sight or closed, a small helper waits at the relay for the open space, a notification says how many messages came, never who or what, and a call rings with the phone's ringtone. See [On Sailfish OS](#sailfish).":
    "**Erevos sur Sailfish OS signale messages et appels pendant qu’il est fermé** : tant qu’il n’est pas à l’écran ou est fermé, un petit assistant attend sur le relais pour l’espace ouvert, une notification dit combien de messages sont arrivés, jamais de qui ni quoi, et un appel sonne avec la sonnerie du téléphone. Voir [Sur Sailfish OS](#sailfish).",
  "**The relay's pushes to the web app, sturdier**: a push the push service could not take just then is sent again, a call goes before the messages waiting their turn, and whoever runs the relay can allow another push service. Your relay needs an update for it.":
    '**Les push du relais vers l’app web, plus robustes** : un push que le service push n’a pas pu accepter à ce moment-là est renvoyé, un appel passe avant les messages qui attendent leur tour, et la personne qui gère le relais peut autoriser un autre service push. Ton relais doit être mis à jour pour cela.',
  "**Permissions checks every notice Erevos uses**: on Android, the message notice without sound or with a chat's own sound, and the reminders', turned off, now show there, with a button to each. See [Chat through a relay](#relay).":
    '**Autorisations vérifie chaque notification qu’Erevos utilise** : sur Android, la notification des messages sans son ou avec le son propre d’une discussion, et celle des rappels, quand elles sont désactivées, s’affichent maintenant là, avec un bouton pour chacune. Voir [Discuter par un relais](#relay).',
  '**Hidden chats say what their switches need**: Say when a message comes and Ring calls when closed say so when Settings → Notifications → In the background lets them do nothing. See [Hidden chats](#hidden).':
    '**Les discussions masquées disent ce dont leurs interrupteurs ont besoin** : Prévenir quand un message arrive et Faire sonner les appels quand elles sont fermées le disent quand Réglages → Notifications → En arrière-plan ne les laisse rien faire. Voir [Discussions masquées](#hidden).',
  "**Truer words about notices**: Settings and the guide give the notices' own words and say what each one needs. See [Chat through a relay](#relay).":
    '**Des mots plus justes sur les notifications** : les Réglages et le guide donnent les mots mêmes des notifications et disent ce dont chacune a besoin. Voir [Discuter par un relais](#relay).',
  "**Calls ring as they should**: with Do Not Disturb only when their notice may break through, with a phone's clock off too once the relay is updated, and to the end on Android 7 and 8; a second call is told busy, and a ring stops only for its own call. See [Chat through a relay](#relay).":
    '**Les appels sonnent comme il faut** : avec Ne pas déranger seulement quand leur notification a le droit de passer, avec l’horloge d’un téléphone décalée aussi une fois le relais mis à jour, et jusqu’au bout sur Android 7 et 8 ; un second appel reçoit la réponse occupé, et une sonnerie ne s’arrête que pour son propre appel. Voir [Discuter par un relais](#relay).',
  '**Hidden calls**: one turned down no longer leaves Erevos over the lock screen, one that comes while the password screen shows comes over it, and none rings twice. See [Hidden chats](#hidden).':
    '**Appels masqués** : un appel refusé ne laisse plus Erevos par-dessus l’écran de verrouillage, un appel qui arrive pendant que l’écran du mot de passe s’affiche passe par-dessus, et aucun ne sonne deux fois. Voir [Discussions masquées](#hidden).',
  '**Notices come again at once after a change of network**, and receiving starts again as Erevos shows when Android refused it. See [Chat through a relay](#relay).':
    '**Les notifications reviennent aussitôt après un changement de réseau**, et la réception reprend dès qu’Erevos s’affiche quand Android l’avait refusée. Voir [Discuter par un relais](#relay).',
  "**Hidden chats' notices tell each message once**: what came since a place last looked is told as it closes, a call that rang is not told again as a message, and a place whose queue the relay lost keeps its switch on. See [Hidden chats](#hidden).":
    '**Les notifications des discussions masquées signalent chaque message une fois** : ce qui est arrivé depuis le dernier regard d’un emplacement est signalé à sa fermeture, un appel qui a sonné n’est plus signalé de nouveau comme message, et un emplacement dont le relais a perdu la file garde son interrupteur activé. Voir [Discussions masquées](#hidden).',
  '**Hidden chats close while Erevos is away**, after 30 seconds, so a call to them meanwhile rings with their PIN to answer. See [Hidden chats](#hidden).':
    '**Les discussions masquées se ferment quand Erevos n’est plus affiché**, au bout de 30 secondes, si bien qu’un appel pour elles entre-temps sonne avec leur code PIN pour répondre. Voir [Discussions masquées](#hidden).',
  '**A voice message counts once**, on its last part, also when it goes again whole.':
    '**Un message vocal compte une fois**, sur sa dernière partie, même quand il est renvoyé en entier.',
  '**The number on the icon counts only what is still there**: a message deleted for everyone, or read on a linked computer, no longer counts. See [Chat through a relay](#relay).':
    '**Le nombre sur l’icône ne compte que ce qui est encore là** : un message supprimé pour tous, ou lu sur un ordinateur associé, ne compte plus. Voir [Discuter par un relais](#relay).',
  '**Messages sent for later** tell of themselves only while their space is open, without sound if sent so.':
    '**Les messages envoyés pour plus tard** ne se signalent que tant que leur espace est ouvert, sans son s’ils ont été envoyés ainsi.',
  '**SMS**: one to the chat on screen only sounds there, they are marked read only while their screen shows, and Android names their notices SMS. See [SMS](#sms).':
    '**SMS** : un SMS pour la discussion à l’écran ne sonne que là, ils ne sont marqués lus que tant que leur écran s’affiche, et Android nomme leurs notifications SMS. Voir [SMS](#sms).',
  "**Reminders**: one seen in Chat with myself goes from the notice, a hidden place's go with a new PIN, and birthdays come at 9:00. See [Getting started](#start).":
    '**Rappels** : un rappel vu dans Discussion avec moi-même quitte la notification, ceux d’un emplacement masqué partent avec un nouveau code PIN, et les anniversaires arrivent à 9:00. Voir [Premiers pas](#start).',
  '**Nostr reads as soon as Tor is ready.** See [Through Nostr](#nostr).':
    '**Nostr lit dès que Tor est prêt.** Voir [Par Nostr](#nostr).',
  "**Erevos's notices show its mark** in the status bar.":
    '**Les notifications d’Erevos montrent son logo** dans la barre d’état.',
  '**Notices are asked for with receiving off too**, when Say a message came is on.':
    '**Les notifications sont demandées même avec la réception désactivée**, quand Signaler les nouveaux messages est activé.',
  "**Photos open on the whole screen**: tap one to see it edge to edge, zoom in with two fingers or a double tap, and tap again to hide or show what is around it; big photos open as small ones do. Erevos also turns with the phone while the phone's Auto-rotate is on, and a photo shown on its own even when it is off. See [Chat through a relay](#relay).":
    '**Les photos s’ouvrent sur tout l’écran** : appuie sur une photo pour la voir bord à bord, zoome avec deux doigts ou un double appui, et appuie de nouveau pour cacher ou montrer ce qu’il y a autour ; les grandes photos s’ouvrent comme les petites. Erevos tourne aussi avec le téléphone tant que sa Rotation automatique est activée, et une photo montrée seule même quand elle est désactivée. Voir [Discuter par un relais](#relay).',
  "**Matrix accounts in Erevos**: sign a space in to Matrix and chat with people who use Element or another Matrix app, end-to-end encrypted, under Settings → Relay and networks → Matrix. These chats are not anonymous, and say so: the Matrix server sees who talks with whom. Text, photos and files. See [Matrix](#matrix).":
    "**Comptes Matrix dans Erevos** : connecte un espace à Matrix et discute avec des personnes qui utilisent Element ou une autre app Matrix, chiffré de bout en bout, dans Réglages → Relais et réseaux → Matrix. Ces discussions ne sont pas anonymes, et le disent : le serveur Matrix voit qui parle avec qui. Texte, photos et fichiers. Voir [Matrix](#matrix).",
  "**Every network's chats on the home screen**: once you sign in to Matrix, its chats are in the list with the Erevos chats and the SMS, newest first, each marked Matrix, and the Matrix chip shows them alone, as SMS and Erevos do. See [Matrix](#matrix).":
    "**Les discussions de tous les réseaux sur l’écran d’accueil** : une fois que tu t’es connecté à Matrix, ses discussions sont dans la liste avec les discussions Erevos et les SMS, les plus récentes d’abord, chacune marquée Matrix, et la puce Matrix ne montre qu’elles, comme SMS et Erevos. Voir [Matrix](#matrix).",
  '**Test versions before a release**: Erevos reads a version such as 4.0.0-rc.1, a test version that comes before 4.0.0, when it looks for updates, tells of a new version and shows what is new. See [Updates](#updates).':
    '**Des versions de test avant une version** : Erevos lit une version comme 4.0.0-rc.1, une version de test qui vient avant la 4.0.0, quand il cherche des mises à jour, annonce une nouvelle version et montre les nouveautés. Voir [Mises à jour](#updates).',
  "**Check Matrix devices by emoji**: in a chat with one person on Matrix, Check by emoji shows you both seven pictures; if they match, nobody sits in between, and Element sees the check too. Check this device with another of yours makes your own Element trust Erevos. See [Matrix](#matrix).":
    "**Vérifier les appareils Matrix par emoji** : dans une discussion avec une personne sur Matrix, Vérifier par emoji vous montre à tous les deux sept images ; si elles correspondent, personne n’est au milieu, et Element voit aussi la vérification. Vérifier cet appareil avec un autre des vôtres fait que votre propre Element fait confiance à Erevos. Voir [Matrix](#matrix).",
  "**Automatic backups to your own server too**: on Android, each automatic backup can also go to a folder on a server you choose, such as your Nextcloud, over WebDAV. Off until you add one. The server gets random bytes under a random name and cannot open them; it still sees your account, your address and when. See [Backups](#backup).":
    "**Les sauvegardes automatiques aussi vers ton propre serveur** : sur Android, chaque sauvegarde automatique peut aussi aller dans un dossier sur un serveur de ton choix, comme ton Nextcloud, par WebDAV. Désactivé tant que tu n’en ajoutes pas un. Le serveur reçoit des octets aléatoires sous un nom aléatoire et ne peut pas les ouvrir ; il voit quand même ton compte, ton adresse et quand. Voir [Sauvegardes](#backup).",
  "**Matrix Security Key and key backup**: enter the Security Key Element made, under Settings → Relay and networks → Matrix, and earlier messages open, new keys are backed up, and your other devices trust Erevos. An account with none can set one up there. See [Matrix](#matrix).":
    "**Clé de sécurité et sauvegarde des clés Matrix** : saisissez la clé de sécurité créée par Element, sous Réglages → Relais et réseaux → Matrix, et les messages précédents s’ouvrent, les nouvelles clés sont sauvegardées, et vos autres appareils font confiance à Erevos. Un compte sans clé peut en créer une là. Voir [Matrix](#matrix).",
  "**Matrix through Tor**: on Android, a space's Matrix account follows its choice under Settings → Relay and networks → Tor, so the Matrix server no longer sees where you are; the Matrix screen says when it goes through Tor. See [Matrix](#matrix).":
    "**Matrix par Tor** : sur Android, le compte Matrix d’un espace suit son choix sous Réglages → Relais et réseaux → Tor, donc le serveur Matrix ne voit plus où tu es ; l’écran Matrix dit quand il passe par Tor. Voir [Matrix](#matrix).",
  "**XMPP accounts in Erevos**: sign a space in to XMPP, under Settings → Relay and networks → XMPP, and chat with people who use Conversations, Monal, Gajim, Dino or another XMPP app, encrypted with OMEMO. These chats are not anonymous, and say so: the XMPP server sees who talks with whom. Text with delivery and read marks, in the home list under an XMPP chip of its own, and through Tor on Android as you chose. See [XMPP](#xmpp).":
    "**Comptes XMPP dans Erevos** : connecte un espace à XMPP, sous Réglages → Relais et réseaux → XMPP, et discute avec des personnes qui utilisent Conversations, Monal, Gajim, Dino ou une autre app XMPP, chiffré avec OMEMO. Ces discussions ne sont pas anonymes, et le disent : le serveur XMPP voit qui parle avec qui. Du texte avec des marques de remise et de lecture, dans la liste de l’accueil sous une puce XMPP à part, et par Tor sur Android comme tu l’as choisi. Voir [XMPP](#xmpp).",
  "**Voice and video calls with people on XMPP**: the two tiles at the top of an XMPP chat call the person, and their calls ring on the same screen as Erevos's own, with apps that call as Conversations does. The call goes through your call relay or the XMPP server's, so they do not learn your address; the key that proves it passes through the XMPP servers, which could put themselves in between. See [XMPP](#xmpp).":
    "**Appels vocaux et vidéo avec des personnes sur XMPP** : les deux tuiles en haut d’une discussion XMPP appellent la personne, et ses appels sonnent sur le même écran que ceux d’Erevos, avec les apps qui appellent comme Conversations. L’appel passe par ton relais d’appel ou celui du serveur XMPP, donc elle n’apprend pas ton adresse ; la clé qui le prouve passe par les serveurs XMPP, qui pourraient se mettre entre les deux. Voir [XMPP](#xmpp).",
  "**Voice and video calls with people on Matrix**: on Android, the two tiles at the top of a Matrix chat call with Element Call, the call app of Element and Element X, which opens inside Erevos in a window of its own, and their calls ring here as Erevos's own do. Sound and picture are end-to-end encrypted and go through the media server your Matrix server names, never through Tor. See [Matrix](#matrix).":
    "**Appels vocaux et vidéo avec des gens sur Matrix** : sur Android, les deux tuiles en haut d’une discussion Matrix appellent avec Element Call, l’app d’appel d’Element et d’Element X, qui s’ouvre dans Erevos dans une fenêtre à elle, et leurs appels sonnent ici comme ceux d’Erevos. Le son et l’image sont chiffrés de bout en bout et passent par le serveur média que ton serveur Matrix indique, jamais par Tor. Voir [Matrix](#matrix).",
  "**Chats with people on other Nostr apps**: give a space a Nostr key of its own, under Settings → Relay and networks → Nostr chats, and chat one to one with people who use Damus, Amethyst, Primal, 0xchat or another Nostr app, encrypted as NIP-17 asks: the relays see whom a message is for, not who wrote it. These chats are not anonymous, and say so: your key is the same to everyone you write to. Text, in the home list under a Nostr chip of its own, and through Tor on Android as you chose. See [Chats with other Nostr apps](#nostr-chats).":
    "**Discussions avec des personnes sur d’autres applis Nostr** : donne à un espace sa propre clé Nostr, dans Réglages → Relais et réseaux → Discussions Nostr, et discute en tête-à-tête avec des personnes qui utilisent Damus, Amethyst, Primal, 0xchat ou une autre appli Nostr, chiffré comme le demande NIP-17 : les relais voient à qui un message est destiné, pas qui l’a écrit. Ces discussions ne sont pas anonymes, et le disent : ta clé est la même pour tous ceux à qui tu écris. Du texte, dans la liste de l’accueil sous un bouton Nostr à elles, et par Tor sur Android comme tu l’as choisi. Voir [Discussions avec d’autres applis Nostr](#nostr-chats).",
  "**Notices for Matrix, XMPP and Nostr messages**: a message in a chat on Matrix, XMPP or Nostr shows a notice and counts in the number on Erevos's icon, as in Erevos's own chats. On Android, Notifications at the bottom of such a chat mutes it or gives it a sound of its own, and an XMPP call rings with its chat's ringtone. See [Matrix](#matrix), [XMPP](#xmpp) and [Chats with other Nostr apps](#nostr-chats).":
    "**Notifications pour les messages Matrix, XMPP et Nostr** : un message dans une discussion Matrix, XMPP ou Nostr affiche une notification et compte dans le nombre sur l’icône d’Erevos, comme dans les discussions d’Erevos lui-même. Sur Android, Notifications, en bas d’une telle discussion, la met en sourdine ou lui donne un son à elle, et un appel XMPP sonne avec la sonnerie de sa discussion. Voir [Matrix](#matrix), [XMPP](#xmpp) et [Discussions avec d’autres applis Nostr](#nostr-chats).",
  '**A call to a slow phone rings in full**: the caller now waits up to a minute and a quarter for the other phone to say it rings, and then 45 seconds from then, so a call that reached it late no longer rings there only to stop at once; and the phone called reads a call before anything it has to send, and waits for calls again at once after its network changes. See [Chat through a relay](#relay).':
    '**Un appel vers un téléphone lent sonne en entier** : celui qui appelle attend maintenant jusqu\'à une minute et quart que l\'autre téléphone dise qu\'il sonne, puis 45 secondes à partir de là, si bien qu\'un appel arrivé en retard ne sonne plus pour s\'arrêter aussitôt ; et le téléphone appelé lit un appel avant tout ce qu\'il a à envoyer, et attend de nouveau les appels tout de suite après un changement de réseau. Voir [Discuter par un relais](#relay).',
  // 3.4.2
  '**A message sent as a chat opens waits for it**, marked Sending…, and goes as soon as the chat is open, never saying that Erevos cannot encrypt.':
    '**Un message envoyé pendant qu’une discussion s’ouvre l’attend**, marqué Envoi…, et part dès qu’elle est ouverte, sans dire qu’Erevos ne peut pas chiffrer.',
  '**What you read as a chat opens stays read**: the home screen no longer counts it as new.':
    '**Ce que tu lis pendant qu’une discussion s’ouvre reste lu** : l’écran d’accueil ne le compte plus comme nouveau.',
  '**No question from Samsung about its sharing**: on a Samsung phone, Wi-Fi Aware and the Wi-Fi with phones nearby stay off until you turn them on. See [Chat with a nearby phone](#nearby).':
    '**Plus de question de Samsung sur son partage** : sur un téléphone Samsung, Wi-Fi Aware et le Wi-Fi avec les téléphones à proximité restent désactivés tant que tu ne les actives pas. Voir [Discuter avec un téléphone à proximité](#nearby).',
  '**The SMS field keeps its width on a small screen**: Photo and Send beside it are round buttons, as in a chat.':
    '**Le champ du SMS garde sa largeur sur un petit écran** : Photo et Envoyer à côté sont des boutons ronds, comme dans une discussion.',
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
