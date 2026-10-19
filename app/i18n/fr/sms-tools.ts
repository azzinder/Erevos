// The French of the SMS screen's own tools: pinning, archive, drafts, blocking and the like (i18n/fr/index.ts).
export const smsTools: Record<string, string> = {
  // The list and its folders (app/index.tsx, app/sms-folder.tsx, components/sms-actions.tsx).
  'Archived · {n}': 'Archivées · {n}',
  'Spam · {n}': 'Spam · {n}',
  'Trash · {n}': 'Corbeille · {n}',
  'Draft': 'Brouillon',
  'Archive': 'Archiver',
  'Unarchive': 'Désarchiver',
  'Archived conversations': 'Conversations archivées',
  'Spam': 'Spam',
  'Trash': 'Corbeille',
  'Pin to the top': 'Épingler en haut',
  'Unpin': 'Désépingler',
  'Mark as spam': 'Marquer comme spam',
  'Not spam': 'Pas du spam',
  'Block {number}': 'Bloquer le {number}',
  'Unblock {number}': 'Débloquer le {number}',
  'Undo': 'Annuler',
  'Not done': 'Non effectué',
  'OK': 'OK',
  'Archived. A new SMS from them brings it back.': 'Archivée. Un nouveau SMS de ce numéro la fait revenir.',
  'Back in the list.': 'De retour dans la liste.',
  'The Trash is full. Empty it first.': 'La corbeille est pleine. Vide-la d’abord.',
  'In the Trash. It goes from the phone in {days} days.': 'Dans la corbeille. Elle sera effacée du téléphone dans {days} jours.',
  'At most {n} conversations stay pinned. Unpin one first.': '{n} conversations au plus restent épinglées. Désépingles-en d’abord une.',
  'Not spam: back in the list.': 'Pas du spam : de retour dans la liste.',
  'Marked as spam: it is in Spam.': 'Marquée comme spam : elle est dans « Spam ».',
  'Block {number}?': 'Bloquer le {number} ?',
  "It goes into Android's own list of blocked numbers: Android rejects its SMS, MMS and calls, in every space and in the phone app too, until you unblock it. The conversation goes to Spam.":
    'Il entre dans la liste des numéros bloqués d’Android lui-même : Android rejette ses SMS, MMS et appels, dans chaque espace et dans l’app Téléphone aussi, jusqu’à ce que tu le débloques. La conversation va dans « Spam ».',
  'Blocked.': 'Bloqué.',
  'Unblocked.': 'Débloqué.',
  'Empty the Trash': 'Vider la corbeille',
  'Delete {n} conversation from the phone now? They cannot be brought back.': 'Supprimer maintenant {n} conversation du téléphone ? Elle ne pourra pas être récupérée.',
  'Delete {n} conversations from the phone now? They cannot be brought back.': 'Supprimer maintenant {n} conversations du téléphone ? Elles ne pourront pas être récupérées.',
  'Delete the SMS with {name} from the phone now? They cannot be brought back.': 'Supprimer maintenant du téléphone les SMS avec {name} ? Ils ne pourront pas être récupérés.',
  'Delete for good': 'Supprimer définitivement',
  'Some could not be deleted. Try again.': 'Certaines n’ont pas pu être supprimées. Réessaie.',
  'Only the SMS app can delete SMS: make Erevos the SMS app under SMS in the menu.': 'Seule l’app SMS peut supprimer des SMS : fais d’Erevos l’app SMS dans « SMS » du menu.',
  'This build of Erevos cannot delete SMS yet.': 'Cette version d’Erevos ne peut pas encore supprimer de SMS.',
  'Deleted on {when}. Goes from the phone on {then}.': 'Supprimée le {when}. Effacée du téléphone le {then}.',
  'Bring back': 'Récupérer',
  'Delete now': 'Supprimer maintenant',
  'The Trash is empty.': 'La corbeille est vide.',
  'No spam.': 'Aucun spam.',
  'Nothing archived.': 'Rien d’archivé.',
  "Conversations you deleted, kept {days} days in case you want them back, then deleted from the phone. Only this space hides them meanwhile: they are still in the phone's SMS.":
    'Les conversations que tu as supprimées, gardées {days} jours au cas où tu voudrais les récupérer, puis supprimées du téléphone. En attendant, seul cet espace les cache : elles sont toujours dans les SMS du téléphone.',
  'SMS from numbers you blocked or marked as spam, and those the spam filter caught. The filter works on this phone alone and sends nothing anywhere. Hold one down to say it is not spam.':
    'Les SMS des numéros que tu as bloqués ou marqués comme spam, et ceux que le filtre anti-spam a interceptés. Le filtre fonctionne sur ce téléphone seulement et n’envoie rien nulle part. Appuie longuement sur l’un d’eux pour indiquer que ce n’est pas du spam.',
  'Conversations you archived. One comes back to the list when a new SMS comes from them. Hold one down for more.':
    'Les conversations que tu as archivées. Une conversation revient dans la liste quand un nouveau SMS en arrive. Appuie longuement sur l’une d’elles pour plus d’options.',

  // A conversation (app/sms.tsx).
  'In Spam': 'Dans « Spam »',
  'Archived': 'Archivée',
  'In the Trash': 'Dans la corbeille',
  'More': 'Plus',
  'The messages before are in the Trash.': 'Les messages précédents sont dans la corbeille.',
  'Tap to send it again.': 'Appuie pour le renvoyer.',
  'Send it again?': 'Le renvoyer ?',
  'Send again': 'Renvoyer',
  'This build of Erevos cannot send an MMS again yet.': 'Cette version d’Erevos ne peut pas encore renvoyer de MMS.',
  'Message deleted.': 'Message supprimé.',
  'Hold the words down to copy them.': 'Appuie longuement sur le texte pour le copier.',
  'Goes in {n} s · tap to take it back': 'Part dans {n} s · appuie pour annuler',
  'It writes with a name, not a number, so it cannot be answered.': 'Il écrit sous un nom, pas un numéro, on ne peut donc pas lui répondre.',
  'Forward': 'Transférer',
  'It opens in the conversation you choose, to read and send there. To a number its picture goes too, as an MMS; into a chat only its words.':
    'Il s’ouvre dans la conversation que tu choisis, pour le relire et l’envoyer là. Vers un numéro, son image part aussi, en MMS ; dans une discussion, seulement son texte.',
  'It opens in the conversation you choose, to read and send there.': 'Il s’ouvre dans la conversation que tu choisis, pour le relire et l’envoyer là.',
  'Into an Erevos chat': 'Dans une discussion Erevos',

  // The SMS settings (app/sms-settings.tsx).
  'With the names come the pictures your contacts have, in the list and in the conversation. They too are read only to show them.':
    'Avec les noms viennent les photos de tes contacts, dans la liste et dans la conversation. Elles aussi ne sont lues que pour être affichées.',
  'Archived, Spam and Trash': 'Archivées, spam et corbeille',
  "In the list, swipe an SMS conversation to the right to archive it, to the left to delete it, or hold it down to pin it at the top and more. This space keeps its own pins, archived conversations, Trash and spam marks, sealed with its password; the SMS stay in the phone's SMS, where another space sees them as they are.":
    'Dans la liste, balaie une conversation SMS vers la droite pour l’archiver, vers la gauche pour la supprimer, ou appuie longuement dessus pour l’épingler en haut, et plus encore. Cet espace garde ses propres épingles, conversations archivées, corbeille et marques de spam, scellées par son mot de passe ; les SMS restent dans les SMS du téléphone, où un autre espace les voit tels quels.',
  'Spam filter': 'Filtre anti-spam',
  'It works on this phone alone, by rules, and sends nothing anywhere. An SMS from a number that is no contact and was never answered goes to Spam when it has a link with words that try to fool, like a parcel held or a prize, or one of your words below. A number you marked as spam always goes there, one you marked not spam never does.':
    'Il fonctionne sur ce téléphone seulement, avec des règles, et n’envoie rien nulle part. Un SMS d’un numéro qui n’est pas un contact et auquel tu n’as jamais répondu va dans « Spam » quand il contient un lien avec des mots qui cherchent à tromper, comme un colis en attente ou un prix à gagner, ou l’un de tes mots ci-dessous. Un numéro que tu as marqué comme spam y va toujours, un numéro que tu as marqué comme n’étant pas du spam jamais.',
  'Turn the spam filter off': 'Désactiver le filtre anti-spam',
  'Turn the spam filter on': 'Activer le filtre anti-spam',
  'Let links from unknown numbers through': 'Laisser passer les liens des numéros inconnus',
  'Send every link from unknown numbers to Spam': 'Envoyer dans « Spam » tout lien d’un numéro inconnu',
  'Your words': 'Tes mots',
  'An SMS with one of them goes to Spam, from any number or sender that is no contact. Tap a word to remove it.':
    'Un SMS qui contient l’un d’eux va dans « Spam », s’il vient d’un numéro ou d’un expéditeur qui n’est pas un contact. Appuie sur un mot pour le retirer.',
  'A word or a few': 'Un mot ou quelques-uns',
  'At most {n} words, each up to {length} letters.': '{n} mots au plus, de {length} lettres au plus chacun.',
  'A notice still says "New message" when spam comes, as it shows before Erevos is opened. Block a number to hear nothing more from it.':
    'Une notification indique quand même « New message » quand un spam arrive, car elle s’affiche avant l’ouverture d’Erevos. Bloque un numéro pour ne plus rien en recevoir.',
  'Blocked numbers': 'Numéros bloqués',
  "These are Android's own blocked numbers: Android rejects their SMS, MMS and calls. Every space, and the phone app, sees the same list. Block one from its conversation, with ⋮, or here.":
    'Ce sont les numéros bloqués d’Android lui-même : Android rejette leurs SMS, MMS et appels. Chaque espace, et l’app Téléphone, voit la même liste. Bloque un numéro depuis sa conversation, avec ⋮, ou ici.',
  'Only the SMS app or the phone app can see and change them: make Erevos the SMS app above.':
    'Seule l’app SMS ou l’app Téléphone peut les voir et les modifier : fais d’Erevos l’app SMS ci-dessus.',
  'This build of Erevos cannot block numbers yet.': 'Cette version d’Erevos ne peut pas encore bloquer de numéros.',
  'No number is blocked.': 'Aucun numéro n’est bloqué.',
  'Type one phone number.': 'Saisis un seul numéro de téléphone.',
  'Unblock {number}?': 'Débloquer le {number} ?',
  'Its SMS, MMS and calls reach the phone again.': 'Ses SMS, MMS et appels arrivent de nouveau sur le téléphone.',
  'Unblock': 'Débloquer',
  'Taking an SMS back': 'Annuler l’envoi d’un SMS',
  'An SMS you send waits this long at the end of the conversation before it goes: tap it then to take it back. When you leave Erevos, it goes at once.':
    'Un SMS que tu envoies attend ce délai à la fin de la conversation avant de partir : appuie dessus pendant ce temps pour annuler l’envoi. Quand tu quittes Erevos, il part tout de suite.',

  // The phone's SMS in backups (app/backup.tsx).
  "The phone's SMS": 'Les SMS du téléphone',
  "Backups can hold the phone's SMS and MMS too, with up to {mb} MB of their pictures, sealed with the backup's password. Restoring the backup puts back into the phone's SMS each one it does not have, and deletes none.":
    'Les sauvegardes peuvent aussi contenir les SMS et MMS du téléphone, avec jusqu’à {mb} Mo de leurs images, scellés par le mot de passe de la sauvegarde. Restaurer la sauvegarde remet dans les SMS du téléphone chacun de ceux qu’il n’a pas, et n’en supprime aucun.',
  'Erevos reads them only while it is the SMS app: make it the SMS app under SMS in the menu.': 'Erevos ne les lit que s’il est l’app SMS : fais-en l’app SMS dans « SMS » du menu.',
  'Put the SMS in backups': 'Inclure les SMS dans les sauvegardes',
  'Leave the SMS out': 'Ne pas inclure les SMS',
  "It holds {sms} SMS and {mms} MMS of the phone's.": 'Elle contient {sms} SMS et {mms} MMS du téléphone.',
  '{n} picture did not fit and stayed out.': '{n} image n’a pas tenu et est restée de côté.',
  '{n} pictures did not fit and stayed out.': '{n} images n’ont pas tenu et sont restées de côté.',
  'SMS in this backup': 'SMS dans cette sauvegarde',
  "This backup also holds the phone's SMS. They go back into the phone's SMS only while Erevos is the SMS app: make it the SMS app under SMS in the menu, then restore again. Or restore the rest now, without them.":
    'Cette sauvegarde contient aussi les SMS du téléphone. Ils ne retournent dans les SMS du téléphone que si Erevos est l’app SMS : fais-en l’app SMS dans « SMS » du menu, puis restaure de nouveau. Ou restaure le reste maintenant, sans eux.',
  'Without the SMS': 'Sans les SMS',
  'Putting the SMS back into the phone…': 'Remise des SMS dans le téléphone…',
  "{sms} SMS and {mms} MMS went back into the phone's SMS. Those it had already stayed as they were.": '{sms} SMS et {mms} MMS sont retournés dans les SMS du téléphone. Ceux qu’il avait déjà sont restés tels quels.',
  'A newer Erevos made this backup: what this one does not know yet stays out. Update Erevos first to restore all of it.':
    'Cette sauvegarde vient d’un Erevos plus récent : ce que celui-ci ne connaît pas encore reste de côté. Mets d’abord Erevos à jour pour tout restaurer.',
  "The SMS could not go back into the phone's SMS: {error}": 'Les SMS n’ont pas pu retourner dans les SMS du téléphone : {error}',
};
