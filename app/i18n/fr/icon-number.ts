// Le français du nombre sur l’icône d’Erevos (lib/icon-number.ts, le choix dans
// app/security.tsx, Réglages → Notifications) (i18n/fr/index.ts).
export const iconNumber: Record<string, string> = {
  'Number on the icon': 'Nombre sur l’icône',
  "How many messages are not read, on Erevos's icon": 'Combien de messages ne sont pas lus, sur l’icône d’Erevos',
  'Show the number': 'Afficher le nombre',
  'No number': 'Pas de nombre',
  "Where the browser can show it (an iPhone's or iPad's home screen, a Mac's Dock, Chrome or Edge installed on a computer), Erevos's icon shows how many messages the space you had open has not read, and those that came since, never a hidden chat's. Only for a space with notifications while closed on. The number stays while Erevos is closed: one that does not match the space you open may hint at another. For every space on this device.":
    'Là où le navigateur peut l’afficher (l’écran d’accueil d’un iPhone ou d’un iPad, le Dock d’un Mac, Chrome ou Edge installé sur un ordinateur), l’icône d’Erevos montre combien de messages l’espace que tu avais ouvert n’a pas lus, et ceux arrivés depuis, jamais ceux d’une discussion masquée. Seulement pour un espace avec les notifications quand l’app est fermée activées. Le nombre reste tant qu’Erevos est fermé : s’il ne correspond pas à l’espace que tu ouvres, il peut en trahir un autre. Pour chaque espace de cet appareil.',
  "Erevos's icon shows no number.": 'L’icône d’Erevos n’affiche aucun nombre.',
  // On Android, from the messages notice (lib/background.ts).
  "When you leave Erevos with messages not read in the open space's chats and groups, a notice without sound says how many, and counts on with those it tells of after, until you read them. Muted chats and hidden ones are not counted as you leave. The phone's launcher shows it on Erevos's icon: as a number, or on some phones, such as Pixels, as a dot. Only with Say a message came, under In the background. For every space on this phone.":
    "Quand tu quittes Erevos avec des messages non lus dans les discussions et groupes de l’espace ouvert, une notification sans son dit combien, et compte aussi ceux qu’elle signale ensuite, jusqu’à ce que tu les lises. Les discussions en sourdine et les masquées ne comptent pas au moment où tu quittes. Le launcher du téléphone l’affiche sur l’icône d’Erevos : comme un nombre ou, sur certains téléphones comme les Pixel, comme un point. Seulement avec Signaler les nouveaux messages, sous En arrière-plan. Pour chaque espace de ce téléphone.",
  "Erevos's icon keeps no number of its own: the launcher shows one only while the notice tells of messages that came since you last had Erevos open.":
    "L’icône d’Erevos ne garde aucun nombre à elle : le launcher n’en affiche un que tant que la notification signale des messages arrivés depuis la dernière fois qu’Erevos était ouvert.",
  // The card that turns notifications on (components/integrity-card.tsx).
  "Where the browser can show it, Erevos's icon then also shows how many messages this space has not read, unless turned off under Number on the icon.":
    'Là où le navigateur peut l’afficher, l’icône d’Erevos montre alors aussi combien de messages cet espace n’a pas lus, sauf si tu l’enlèves dans Nombre sur l’icône.',
};
