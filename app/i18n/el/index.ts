// Every word of the app in Greek, keyed by its English (lib/i18n.ts). One file for each part of
// the app, so changes to different screens do not meet in one file.
import { app } from './app';
import { chat } from './chat';
import { parts } from './parts';
import { screens } from './screens';
import { settings } from './settings';
import { phone } from './phone';
import { messages } from './messages';
import { smsTools } from './sms-tools';
import { more } from './more';
import { contacts } from './contacts';

export const EL: Record<string, string> = { ...app, ...chat, ...screens, ...settings, ...parts, ...phone, ...messages, ...smsTools, ...more, ...contacts };
