// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

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
import { hiddenKeep } from './hidden-keep';
import { unreadSigns } from './unread-signs';
import { lastSeen } from './last-seen';
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
import { panic } from './panic';
import { guard } from './guard';
import { giveApp } from './give-app';
import { matrixMore } from './matrix-more';
import { forgetMe } from './forget-me';
import { modulesText } from './modules';
import { collectionText } from './collection';

export const PT: Record<string, string> = { ...app, ...chat, ...screens, ...settings, ...parts, ...phone, ...messages, ...smsTools, ...more, ...groups, ...devices, ...publicGroups, ...contacts, ...linkContact, ...hiddenRing, ...hiddenKeep, ...relayInvites, ...moves, ...settingsMenu, ...myself, ...media, ...importsHere, ...closedSpaces, ...donate, ...edit, ...nostrOnly, ...releaseNotice, ...chatPin, ...chatNotify, ...connect, ...textInvite, ...relayKey, ...whatsNew, ...iconNumber, ...matrix, ...cloudBackup, ...desktop, ...xmpp, ...nostrChats, ...contactTrust, ...smsWay, ...backupPieces, ...panic, ...guard, ...giveApp, ...matrixMore, ...forgetMe, ...modulesText, ...collectionText, ...unreadSigns, ...lastSeen };
