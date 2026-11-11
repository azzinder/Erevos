// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// The German of what an SMS carries besides its words, pins for the owner alone and choosing
// several SMS (lib/sms-parts.ts, app/sms.tsx) (i18n/de/index.ts).
export const smsParts: Record<string, string> = {
  'Pin for me': 'Für mich anheften',
  'Contact card': 'Kontaktkarte',
  '{what} · {size} KB · remove': '{what} · {size} KB · entfernen',
  '{n} message goes from the phone.': '{n} Nachricht wird vom Telefon gelöscht.',
  '{n} messages go from the phone.': '{n} Nachrichten werden vom Telefon gelöscht.',
  '{n} messages deleted.': '{n} Nachrichten gelöscht.',
};
