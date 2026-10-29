// Every word of the app in Serbo-Croatian, keyed by its English (lib/i18n.ts), one file for each part
// of the app as in i18n/el/. A word not here yet shows in English: npm run i18n-missing sh lists them.
// A count's words (plural()'s second form) hold three forms, split by ' | ': as for 21, as for 22,
// and as for 25 (11 to 14 and 0 too): '{n} kontakt | {n} kontakta | {n} kontakata'.
import { app } from './app';
import { chat } from './chat';
import { parts } from './parts';
import { screens } from './screens';
import { settings } from './settings';
import { phone } from './phone';
import { messages } from './messages';
import { smsTools } from './sms-tools';
import { more } from './more';
import { groups } from './groups';
import { devices } from './devices';
import { publicGroups } from './public-groups';
import { contacts } from './contacts';
import { linkContact } from './link-contact';
import { hiddenRing } from './hidden-ring';
import { hiddenKeep } from './hidden-keep';
import { relayInvites } from './relay-invites';
import { moves } from './moves';
import { settingsMenu } from './settings-menu';
import { myself } from './myself';
import { media } from './media';
import { importsHere } from './imports-here';
import { closedSpaces } from './closed-spaces';
import { donate } from './donate';
import { edit } from './edit';
import { nostrOnly } from './nostr-only';
import { releaseNotice } from './release-notice';
import { chatPin } from './chat-pin';
import { chatNotify } from './chat-notify';
import { connect } from './connect';
import { textInvite } from './text-invite';
import { relayKey } from './relay-key';
import { whatsNew } from './whats-new';
import { iconNumber } from './icon-number';
import { cloudBackup } from './cloud-backup';
import { matrix } from './matrix';
import { desktop } from './desktop';
import { xmpp } from './xmpp';
import { nostrChats } from './nostr-chats';
import { contactTrust } from './contact-trust';
import { smsWay } from './sms-way';
import { backupPieces } from './backup-pieces';

export const SH: Record<string, string> = { ...app, ...chat, ...screens, ...settings, ...parts, ...phone, ...messages, ...smsTools, ...more, ...groups, ...devices, ...publicGroups, ...contacts, ...linkContact, ...hiddenRing, ...hiddenKeep, ...relayInvites, ...moves, ...settingsMenu, ...myself, ...media, ...importsHere, ...closedSpaces, ...donate, ...edit, ...nostrOnly, ...releaseNotice, ...chatPin, ...chatNotify, ...connect, ...textInvite, ...relayKey, ...whatsNew, ...iconNumber, ...matrix, ...cloudBackup, ...desktop, ...xmpp, ...nostrChats, ...contactTrust, ...smsWay, ...backupPieces };
