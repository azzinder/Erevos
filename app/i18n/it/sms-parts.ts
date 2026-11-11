// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// The Italian of what an SMS carries besides its words, pins for the owner alone and choosing
// several SMS (lib/sms-parts.ts, app/sms.tsx) (i18n/it/index.ts).
export const smsParts: Record<string, string> = {
  'Pin for me': 'Fissa solo per me',
  'Contact card': 'Scheda contatto',
  '{what} · {size} KB · remove': '{what} · {size} KB · rimuovi',
  '{n} message goes from the phone.': '{n} messaggio viene eliminato dal telefono.',
  '{n} messages go from the phone.': '{n} messaggi vengono eliminati dal telefono.',
  '{n} messages deleted.': '{n} messaggi eliminati.',
};
