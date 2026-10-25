// Every word of the app in Portuguese, keyed by its English (lib/i18n.ts), one file for each part of
// the app as in i18n/el/. A word not here yet shows in English: npm run i18n-missing pt lists them.
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
import { relayInvites } from './relay-invites';
import { moves } from './moves';
import { settingsMenu } from './settings-menu';
import { myself } from './myself';
import { media } from './media';
import { importsHere } from './imports-here';
import { closedSpaces } from './closed-spaces';
import { donate } from './donate';

export const PT: Record<string, string> = { ...app, ...chat, ...screens, ...settings, ...parts, ...phone, ...messages, ...smsTools, ...more, ...groups, ...devices, ...publicGroups, ...contacts, ...linkContact, ...hiddenRing, ...relayInvites, ...moves, ...settingsMenu, ...myself, ...media, ...importsHere, ...closedSpaces, ...donate };
